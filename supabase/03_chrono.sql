-- =====================================================================
-- NEON//DRIVE — étape 3 : CLASSEMENTS DU CHRONO et FANTÔMES EN LIGNE
-- À coller dans Supabase → SQL Editor → New query → Run.
-- (Le script peut être relancé sans danger.)
-- =====================================================================

-- ---------- Circuits du chrono et temps minimum possible (anti-triche) ----------
-- min_time = 88 % du temps de l'IA NEON (aucun pilote ne peut descendre plus bas)
create table if not exists public.tt_tracks (
  track_id text primary key,
  min_time real not null
);
alter table public.tt_tracks enable row level security;
revoke all on public.tt_tracks from anon, authenticated;
insert into public.tt_tracks (track_id, min_time) values
  ('neon-boulevard', 21.267),
  ('pulsar-speedway', 20.057),
  ('vortex-city', 19.169),
  ('sakura-avenue', 16.023),
  ('rainline', 17.285),
  ('frostline', 25.351),
  ('dune-runner', 20.79),
  ('sirocco', 31.042),
  ('orbital-ring', 19.008),
  ('phantom-bay', 23.709),
  ('citadel', 21.685),
  ('thunder-peak', 21.963)
on conflict (track_id) do update set min_time = excluded.min_time;

-- ---------- Meilleur tour de chaque joueur sur chaque circuit ----------
-- (si un essai précédent du script a créé une ancienne version vide, on la recrée)
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'tt_records' and column_name = 'time') then
    drop table public.tt_records;
  end if;
end $$;
create table if not exists public.tt_records (
  player_id  uuid not null references public.players (id) on delete cascade,
  track_id   text not null references public.tt_tracks (track_id),
  lap_time   real not null,
  car        text not null default 'nova',
  ghost      jsonb not null,           -- trajectoire du tour (≈ 10 Ko)
  updated_at timestamptz not null default now(),
  primary key (player_id, track_id)
);
create index if not exists tt_records_rank_idx on public.tt_records (track_id, lap_time asc, updated_at asc);
alter table public.tt_records enable row level security;
revoke all on public.tt_records from anon, authenticated;

-- ---------- Envoyer un record ----------
-- Refusé si : temps impossible, fantôme absent/trop gros/incohérent avec le temps,
-- ou pas meilleur que le record déjà enregistré.
create or replace function public.submit_tt(p_track text, p_time real, p_car text, p_ghost jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  mn real;
  n int;
  old real;
begin
  if me is null then raise exception 'non connecté'; end if;
  if not exists (select 1 from public.players where id = me) then return json_build_object('status', 'no_profile'); end if;
  select min_time into mn from public.tt_tracks where track_id = p_track;
  if mn is null then return json_build_object('status', 'unknown_track'); end if;
  if p_time is null or p_time < mn or p_time > 600 then
    update public.players set flagged = flagged + 1 where id = me;
    return json_build_object('status', 'refused');
  end if;
  if p_ghost is null or octet_length(p_ghost::text) > 80000 or jsonb_typeof(p_ghost -> 'data') <> 'string' then
    return json_build_object('status', 'bad_ghost');
  end if;
  -- Le fantôme est échantillonné 40 fois par seconde : il doit durer à peu près le temps annoncé
  n := coalesce((p_ghost ->> 'n')::int, 0);
  if n < p_time * 40 * 0.85 or n > p_time * 40 * 1.15 + 10 then
    return json_build_object('status', 'bad_ghost');
  end if;
  if p_car !~ '^[a-z]{2,16}$' then p_car := 'nova'; end if;
  select lap_time into old from public.tt_records where player_id = me and track_id = p_track;
  if old is not null and old <= p_time then
    return json_build_object('status', 'not_better', 'best', old);
  end if;
  insert into public.tt_records (player_id, track_id, lap_time, car, ghost, updated_at)
  values (me, p_track, p_time, p_car, p_ghost, now())
  on conflict (player_id, track_id) do update set lap_time = excluded.lap_time, car = excluded.car, ghost = excluded.ghost, updated_at = now();
  return json_build_object('status', 'ok',
    'rank', (select count(*) + 1 from public.tt_records r where r.track_id = p_track and r.lap_time < p_time));
end $$;

-- ---------- Classement d'un circuit ----------
-- p_scope : 'world' (tout le monde) ou 'friends' (mes amis et moi)
create or replace function public.tt_leaderboard(p_track text, p_scope text default 'world', p_limit int default 20)
returns table (rank bigint, player_id uuid, name text, tag int, avatar text, color text, lap_time real, car text, me boolean)
language sql stable security definer set search_path = public as $$
  with pool as (
    select r.* from public.tt_records r
    where r.track_id = p_track and (
      p_scope = 'world' or r.player_id = auth.uid() or exists (
        select 1 from public.friendships f where f.status = 'accepted'
        and ((f.from_id = auth.uid() and f.to_id = r.player_id) or (f.to_id = auth.uid() and f.from_id = r.player_id))))
  ), ranked as (
    select rank() over (order by pool.lap_time asc) as rank, row_number() over (order by pool.lap_time asc, pool.updated_at asc) as rn, pool.* from pool
  )
  select k.rank, k.player_id, p.name, p.tag, p.avatar, p.color, k.lap_time, k.car, k.player_id = auth.uid()
  from ranked k join public.players p on p.id = k.player_id
  where k.rn <= least(greatest(p_limit, 1), 100) or k.player_id = auth.uid()
  order by k.rn;
$$;

-- ---------- Résumé pour l'écran du chrono : ma place sur chaque circuit + meilleur ami ----------
create or replace function public.tt_summary()
returns table (track_id text, my_time real, my_rank bigint, players bigint, world_time real, friend_name text, friend_time real)
language sql stable security definer set search_path = public as $$
  select t.track_id,
    (select r.lap_time from public.tt_records r where r.player_id = auth.uid() and r.track_id = t.track_id),
    (select count(*) + 1 from public.tt_records r where r.track_id = t.track_id
       and r.lap_time < (select m.lap_time from public.tt_records m where m.player_id = auth.uid() and m.track_id = t.track_id)),
    (select count(*) from public.tt_records r where r.track_id = t.track_id),
    (select min(r.lap_time) from public.tt_records r where r.track_id = t.track_id),
    fb.name, fb.lap_time
  from public.tt_tracks t
  left join lateral (
    select p.name, r.lap_time from public.tt_records r join public.players p on p.id = r.player_id
    where r.track_id = t.track_id and r.player_id <> auth.uid() and exists (
      select 1 from public.friendships f where f.status = 'accepted'
      and ((f.from_id = auth.uid() and f.to_id = r.player_id) or (f.to_id = auth.uid() and f.from_id = r.player_id)))
    order by r.lap_time asc limit 1
  ) fb on true;
$$;

-- ---------- Télécharger le fantôme d'un pilote ----------
create or replace function public.tt_ghost(p_player uuid, p_track text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('time', r.lap_time, 'car', r.car, 'ghost', r.ghost, 'name', p.name, 'tag', p.tag)
  from public.tt_records r join public.players p on p.id = r.player_id
  where r.player_id = p_player and r.track_id = p_track;
$$;

grant execute on function public.submit_tt(text, real, text, jsonb) to authenticated;
grant execute on function public.tt_leaderboard(text, text, int) to anon, authenticated;
grant execute on function public.tt_summary() to authenticated;
grant execute on function public.tt_ghost(uuid, text) to anon, authenticated;
