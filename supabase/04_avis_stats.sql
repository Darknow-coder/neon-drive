-- =====================================================================
-- NEON//DRIVE — étape 4 : AVIS DES JOUEURS, STATISTIQUES ANONYMES, BUGS
-- À coller dans Supabase → SQL Editor → New query → Run.
-- (Le script peut être relancé sans danger.)
--
-- Tout est rattaché au compte invisible (auth.users) : si le joueur supprime
-- son profil en ligne, ses avis, statistiques et rapports de bug partent avec.
-- Personne ne peut lire ces tables depuis le jeu : seulement toi, dans le
-- tableau de bord Supabase (Table Editor) ou avec supabase/stats.sql.
-- =====================================================================

-- ---------- Avis des joueurs ----------
create table if not exists public.feedback (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('bug', 'idea', 'like', 'dislike')),
  rating     smallint check (rating between 1 and 5),
  message    text not null check (char_length(message) between 1 and 1000),
  lang       text,
  device     text,       -- « mobile » ou « pc » + taille d'écran (aucun identifiant d'appareil)
  version    text,
  context    text,       -- écran ou situation (ex. « menu », « après 5 courses »)
  created_at timestamptz not null default now()
);
create index if not exists feedback_date_idx on public.feedback (created_at desc);
alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;

create or replace function public.submit_feedback(p_kind text, p_rating int, p_message text, p_lang text, p_device text, p_version text, p_context text)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'non connecté'; end if;
  if p_kind not in ('bug', 'idea', 'like', 'dislike') then return json_build_object('status', 'bad_kind'); end if;
  if p_message is null or char_length(trim(p_message)) < 1 then return json_build_object('status', 'empty'); end if;
  -- Anti-abus : 10 avis par jour et par joueur
  if (select count(*) from public.feedback where user_id = me and created_at > now() - interval '1 day') >= 10 then
    return json_build_object('status', 'too_many');
  end if;
  insert into public.feedback (user_id, kind, rating, message, lang, device, version, context)
  values (me, p_kind, case when p_rating between 1 and 5 then p_rating else null end,
          left(trim(p_message), 1000), left(p_lang, 5), left(p_device, 40), left(p_version, 20), left(p_context, 40));
  return json_build_object('status', 'ok');
end $$;

-- ---------- Statistiques anonymes d'utilisation ----------
-- Une ligne par joueur, par jour et par type d'action : (joueur, jour, « race », 4)
create table if not exists public.activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  day     date not null,
  kind    text not null,
  n       int not null default 0,
  primary key (user_id, day, kind)
);
create index if not exists activity_day_idx on public.activity (day, kind);
alter table public.activity enable row level security;
revoke all on public.activity from anon, authenticated;

-- p_events : [{"day":"2026-11-05","kind":"race","n":3}, …] (envoi groupé)
create or replace function public.track(p_events jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e jsonb;
  d date;
  k text;
  c int;
  done int := 0;
begin
  if me is null then raise exception 'non connecté'; end if;
  if jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 60 then return json_build_object('status', 'bad'); end if;
  for e in select * from jsonb_array_elements(p_events) loop
    begin
      d := (e ->> 'day')::date;
      k := e ->> 'kind';
      c := least(greatest(coalesce((e ->> 'n')::int, 0), 0), 200);
    exception when others then continue;
    end;
    -- Seulement des jours récents (jeu resté hors ligne quelques jours au plus)
    if d is null or d < current_date - 7 or d > current_date + 1 then continue; end if;
    if k is null or k !~ '^[a-z_]{2,24}$' or c = 0 then continue; end if;
    insert into public.activity (user_id, day, kind, n) values (me, d, k, c)
    on conflict (user_id, day, kind) do update set n = least(public.activity.n + excluded.n, 2000);
    done := done + 1;
  end loop;
  return json_build_object('status', 'ok', 'saved', done);
end $$;

-- ---------- Rapports de bug automatiques (erreurs du jeu) ----------
create table if not exists public.error_reports (
  id         bigserial primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  message    text not null check (char_length(message) <= 300),
  location   text,
  device     text,
  version    text,
  created_at timestamptz not null default now()
);
create index if not exists error_reports_date_idx on public.error_reports (created_at desc);
alter table public.error_reports enable row level security;
revoke all on public.error_reports from anon, authenticated;

create or replace function public.report_error(p_message text, p_location text, p_device text, p_version text)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'non connecté'; end if;
  if (select count(*) from public.error_reports where user_id = me and created_at > now() - interval '1 day') >= 20 then
    return json_build_object('status', 'too_many');
  end if;
  insert into public.error_reports (user_id, message, location, device, version)
  values (me, left(coalesce(p_message, '?'), 300), left(p_location, 80), left(p_device, 40), left(p_version, 20));
  return json_build_object('status', 'ok');
end $$;

-- ---------- Droit d'accès : ce que le serveur sait de moi (avis, statistiques, bugs) ----------
create or replace function public.my_extra_data()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'avis', coalesce((select json_agg(json_build_object('date', created_at, 'type', kind, 'note', rating, 'message', message) order by created_at)
                      from public.feedback where user_id = auth.uid()), '[]'::json),
    'statistiques', coalesce((select json_agg(json_build_object('jour', day, 'action', kind, 'nombre', n) order by day, kind)
                      from public.activity where user_id = auth.uid()), '[]'::json),
    'rapports_de_bug', (select count(*) from public.error_reports where user_id = auth.uid())
  );
$$;

-- ---------- Ménage automatique (à relancer de temps en temps, ou à la main) ----------
-- Statistiques et bugs de plus de 2 ans : supprimés
create or replace function public.cleanup_old_stats()
returns void language sql security definer set search_path = public as $$
  delete from public.activity where day < current_date - 730;
  delete from public.error_reports where created_at < now() - interval '730 days';
$$;
revoke all on function public.cleanup_old_stats() from public, anon, authenticated;

grant execute on function public.my_extra_data() to authenticated;
grant execute on function public.submit_feedback(text, int, text, text, text, text, text) to authenticated;
grant execute on function public.track(jsonb) to authenticated;
grant execute on function public.report_error(text, text, text, text) to authenticated;
