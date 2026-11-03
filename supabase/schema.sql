-- =====================================================================
-- NEON//DRIVE — base de données en ligne (Supabase)
-- Étape 1 : profils publics et classement des trophées.
-- À coller UNE fois dans Supabase → SQL Editor → New query → Run.
-- (Le script peut être relancé sans danger : il remplace les fonctions.)
-- =====================================================================

-- ---------- Table des joueurs (profil public) ----------
create table if not exists public.players (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text not null,
  tag           int  not null,                 -- numéro qui rend le pseudo unique (#0001 – #9999)
  avatar        text not null default 'bolt',
  color         text not null default '#00f0ff',
  title         text not null default 'Débutant',
  car           text not null default 'nova',
  trophies      int  not null default 0,
  best_trophies int  not null default 0,
  races         int  not null default 0,
  wins          int  not null default 0,
  friend_code   text not null unique,          -- pour l'étape 2 (amis)
  flagged       int  not null default 0,       -- envois refusés par l'anti-triche
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (name, tag)
);
create index if not exists players_trophies_idx on public.players (trophies desc, updated_at asc);

-- Lecture publique, écriture UNIQUEMENT par la fonction submit_profile (contrôles anti-triche)
alter table public.players enable row level security;
drop policy if exists "lecture publique" on public.players;
create policy "lecture publique" on public.players for select using (true);
revoke insert, update, delete on public.players from anon, authenticated;

-- ---------- Ligue (mêmes seuils que le jeu) ----------
create or replace function public.league_of(t int) returns text language sql immutable as $$
  select case when t >= 800 then 'elite' when t >= 500 then 'diamant' when t >= 250 then 'or'
              when t >= 100 then 'argent' else 'bronze' end;
$$;

-- ---------- Pseudo : format et filtre anti-insultes ----------
create or replace function public.name_ok(n text) returns boolean language plpgsql immutable as $$
declare
  low  text := translate(lower(n), 'àâäéèêëîïôöùûüç013457@$', 'aaaeeeeiioouuuc0ieastas');
  flat text;
  -- mots interdits n'importe où dans le pseudo
  bad  text[] := array['connard','connasse','salope','putain','encule','merde','couille','niquer','batard','salaud',
                       'nazi','hitler','fuck','shit','bitch','cunt','nigger','nigga','whore','slut','porn'];
  -- mots courts : interdits seulement en mot entier (pour ne pas bloquer VIOLET, SPEEDY…)
  short text[] := array['pute','bite','nique','fdp','ntm','pd','dick','sex','sexe','viol','tg'];
  w text;
begin
  if n is null or char_length(n) < 3 or char_length(n) > 14 then return false; end if;
  if n !~ '^[A-Z0-9À-ÖØ-Þ _.-]+$' then return false; end if;
  flat := regexp_replace(low, '[ _.-]', '', 'g');
  foreach w in array bad loop
    if position(w in flat) > 0 then return false; end if;
  end loop;
  foreach w in array regexp_split_to_array(low, '[ _.-]+') loop
    if w = any(short) then return false; end if;
  end loop;
  return true;
end $$;

-- ---------- Envoi du profil (appelé par le jeu) ----------
-- Contrôles : pseudo valide, pas plus de 13 trophées par course jouée depuis
-- le dernier envoi (+ petite marge), pas plus d'une course toutes les 15 s.
create or replace function public.submit_profile(
  p_name text, p_avatar text, p_color text, p_title text, p_car text,
  p_trophies int, p_races int, p_wins int
) returns json language plpgsql security definer set search_path = public as $$
declare
  me   uuid := auth.uid();
  cur  public.players;
  new_tag int;
  allowed int;
  max_races int;
  ok_trophies int;
  ok_races int;
  refused boolean := false;
  nm text := upper(trim(p_name));
begin
  if me is null then raise exception 'non connecté'; end if;
  if not public.name_ok(nm) then nm := 'PILOTE'; end if;
  if p_avatar !~ '^[a-z]{2,16}$' then p_avatar := 'bolt'; end if;
  if p_color !~ '^#[0-9a-fA-F]{6}$' then p_color := '#00f0ff'; end if;
  if p_car !~ '^[a-z]{2,16}$' then p_car := 'nova'; end if;
  p_title := left(coalesce(p_title, 'Débutant'), 40);
  p_trophies := greatest(0, coalesce(p_trophies, 0));
  p_races := greatest(0, coalesce(p_races, 0));
  p_wins := greatest(0, least(coalesce(p_wins, 0), p_races));

  select * into cur from public.players where id = me;

  if not found then
    -- Premier envoi : la progression déjà faite hors ligne est acceptée si elle est plausible
    ok_races := least(p_races, 20000);
    ok_trophies := least(p_trophies, ok_races * 13 + 20);
    refused := ok_trophies < p_trophies;
    loop
      new_tag := 1 + floor(random() * 9999)::int;
      exit when not exists (select 1 from public.players where name = nm and tag = new_tag);
    end loop;
    insert into public.players (id, name, tag, avatar, color, title, car, trophies, best_trophies, races, wins, friend_code, flagged)
    values (me, nm, new_tag, p_avatar, p_color, p_title, p_car, ok_trophies, ok_trophies, ok_races, p_wins,
            upper(substr(md5(me::text || random()::text), 1, 6)), case when refused then 1 else 0 end)
    returning * into cur;
  else
    -- Courses possibles depuis le dernier envoi (1 toutes les 15 s, + 3 de marge)
    max_races := cur.races + 3 + floor(extract(epoch from (now() - cur.updated_at)) / 15)::int;
    ok_races := greatest(cur.races, least(p_races, max_races));
    allowed := cur.trophies + (ok_races - cur.races) * 13 + 20;
    ok_trophies := least(p_trophies, allowed);
    refused := ok_trophies < p_trophies or ok_races < p_races;
    -- Changement de pseudo : nouveau numéro si le couple (pseudo, numéro) est déjà pris
    new_tag := cur.tag;
    if nm <> cur.name then
      while exists (select 1 from public.players where name = nm and tag = new_tag and id <> me) loop
        new_tag := 1 + floor(random() * 9999)::int;
      end loop;
    end if;
    update public.players set
      name = nm, tag = new_tag, avatar = p_avatar, color = p_color, title = p_title, car = p_car,
      trophies = ok_trophies, best_trophies = greatest(best_trophies, ok_trophies),
      races = ok_races, wins = least(p_wins, ok_races),
      flagged = flagged + case when refused then 1 else 0 end,
      updated_at = now()
    where id = me
    returning * into cur;
  end if;

  return json_build_object(
    'name', cur.name, 'tag', cur.tag, 'trophies', cur.trophies, 'friend_code', cur.friend_code,
    'refused', refused,
    'rank', (select count(*) + 1 from public.players p where p.trophies > cur.trophies)
  );
end $$;

-- ---------- Classement ----------
-- Top N (toutes ligues, ou une ligue précise)
create or replace function public.leaderboard_top(p_league text default null, p_limit int default 50)
returns table (rank bigint, id uuid, name text, tag int, avatar text, color text, title text, car text, trophies int, league text)
language sql stable security definer set search_path = public as $$
  select rank() over (order by p.trophies desc) as rank, p.id, p.name, p.tag, p.avatar, p.color, p.title, p.car, p.trophies, public.league_of(p.trophies)
  from public.players p
  where p_league is null or public.league_of(p.trophies) = p_league
  order by p.trophies desc, p.updated_at asc
  limit least(greatest(p_limit, 1), 100);
$$;

-- Ma place et les joueurs juste au-dessus / en dessous de moi
create or replace function public.leaderboard_around(p_range int default 5)
returns table (rank bigint, id uuid, name text, tag int, avatar text, color text, title text, car text, trophies int, league text)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select rank() over (order by p.trophies desc) as rank, row_number() over (order by p.trophies desc, p.updated_at asc) as rn,
           p.id, p.name, p.tag, p.avatar, p.color, p.title, p.car, p.trophies
    from public.players p
  ), mine as (select rn from ranked where ranked.id = auth.uid())
  select r.rank, r.id, r.name, r.tag, r.avatar, r.color, r.title, r.car, r.trophies, public.league_of(r.trophies)
  from ranked r, mine
  where r.rn between mine.rn - least(p_range, 10) and mine.rn + least(p_range, 10)
  order by r.rn;
$$;

-- Nombre total de joueurs
create or replace function public.players_count() returns bigint language sql stable security definer set search_path = public as $$
  select count(*) from public.players;
$$;

grant execute on function public.submit_profile(text, text, text, text, text, int, int, int) to authenticated;
grant execute on function public.leaderboard_top(text, int) to anon, authenticated;
grant execute on function public.leaderboard_around(int) to authenticated;
grant execute on function public.players_count() to anon, authenticated;
