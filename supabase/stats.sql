-- =====================================================================
-- NEON//DRIVE — TABLEAU DE BORD (à lire, ne modifie rien)
-- Supabase → SQL Editor → New query → colle UN bloc → Run.
-- Chaque bloc répond à une question. Les jours sont en heure UTC.
-- =====================================================================

-- 1) Vue d'ensemble : joueurs, actifs, courses
select
  (select count(distinct user_id) from public.activity)                                        as joueurs_total,
  (select count(distinct user_id) from public.activity where day = current_date)               as actifs_aujourdhui,
  (select count(distinct user_id) from public.activity where day > current_date - 7)           as actifs_7_jours,
  (select coalesce(sum(n), 0) from public.activity where kind = 'race')                        as courses_total,
  (select count(*) from public.feedback)                                                        as avis_recus,
  (select count(*) from public.error_reports where created_at > now() - interval '7 days')     as bugs_7_jours;

-- 2) Jour par jour : nouveaux joueurs, joueurs actifs, parties, courses
with first_day as (select user_id, min(day) as d0 from public.activity group by user_id)
select a.day as jour,
  count(distinct a.user_id)                                                   as actifs,
  count(distinct a.user_id) filter (where f.d0 = a.day)                       as nouveaux,
  coalesce(sum(a.n) filter (where a.kind = 'session'), 0)                     as parties_lancees,
  coalesce(sum(a.n) filter (where a.kind = 'race'), 0)                        as courses
from public.activity a join first_day f using (user_id)
group by a.day order by a.day desc limit 30;

-- 3) Fidélité : parmi les nouveaux d'un jour, combien reviennent le lendemain (J+1) et la semaine suivante (J+7)
with first_day as (select user_id, min(day) as d0 from public.activity group by user_id)
select f.d0 as jour_arrivee,
  count(*) as nouveaux,
  count(*) filter (where exists (select 1 from public.activity a where a.user_id = f.user_id and a.day = f.d0 + 1)) as revenus_j1,
  count(*) filter (where exists (select 1 from public.activity a where a.user_id = f.user_id and a.day between f.d0 + 6 and f.d0 + 8)) as revenus_j7
from first_day f group by f.d0 order by f.d0 desc limit 30;

-- 4) Le parcours d'un nouveau joueur : où est-ce qu'on perd du monde ?
select
  count(distinct user_id) filter (where kind = 'session')       as ont_lance_le_jeu,
  count(distinct user_id) filter (where kind = 'tutorial_done') as ont_fini_le_tutoriel,
  count(distinct user_id) filter (where kind = 'tour_done')     as ont_fini_la_visite,
  count(distinct user_id) filter (where kind = 'tour_skip')     as ont_passe_la_visite,
  count(distinct user_id) filter (where kind = 'race')          as ont_fait_une_course,
  count(distinct user_id) filter (where kind = 'race' and n >= 5) as cinq_courses_en_un_jour
from public.activity;

-- 5) Modes de jeu les plus joués (7 derniers jours)
select kind as mode, sum(n) as fois, count(distinct user_id) as joueurs
from public.activity
where day > current_date - 7 and kind not in ('session', 'tutorial_done', 'tour_done', 'tour_skip')
group by kind order by fois desc;

-- 6) Appareils, langues et provenance (host_itch = page itch.io, host_github = site) — 7 derniers jours
select kind, count(distinct user_id) as joueurs
from public.activity
where day > current_date - 7 and (kind like 'device_%' or kind like 'lang_%' or kind like 'host_%')
group by kind order by joueurs desc;

-- 7) Les derniers avis (les plus récents en haut)
select created_at::date as jour, kind as type, rating as note, message, lang, device, version, context
from public.feedback order by created_at desc limit 50;

-- 8) Note moyenne donnée au jeu
select round(avg(rating), 2) as note_moyenne, count(rating) as nombre_de_notes from public.feedback;

-- 9) Les bugs les plus fréquents (7 derniers jours)
select message, location, count(*) as fois, count(distinct user_id) as joueurs, max(version) as version
from public.error_reports where created_at > now() - interval '7 days'
group by message, location order by fois desc limit 30;
