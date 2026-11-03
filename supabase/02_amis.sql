-- =====================================================================
-- NEON//DRIVE — étape 2 : AMIS (+ suppression de son profil en ligne)
-- À coller dans Supabase → SQL Editor → New query → Run.
-- (Le script peut être relancé sans danger.)
-- =====================================================================

-- ---------- Amitiés ----------
-- Une ligne par demande : from_id → to_id. « accepted » une fois acceptée.
create table if not exists public.friendships (
  from_id    uuid not null references public.players (id) on delete cascade,
  to_id      uuid not null references public.players (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
create index if not exists friendships_to_idx on public.friendships (to_id);

-- Personne ne lit ni n'écrit la table directement : tout passe par les fonctions ci-dessous
alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

-- ---------- Envoyer une demande avec un code ami ----------
-- Si l'autre m'avait déjà envoyé une demande, on devient amis tout de suite.
create or replace function public.add_friend(p_code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  other public.players;
  n_friends int;
  n_pending int;
begin
  if me is null then raise exception 'non connecté'; end if;
  if not exists (select 1 from public.players where id = me) then return json_build_object('status', 'no_profile'); end if;
  select * into other from public.players where friend_code = upper(trim(p_code));
  if not found then return json_build_object('status', 'unknown'); end if;
  if other.id = me then return json_build_object('status', 'self'); end if;
  if exists (select 1 from public.friendships where status = 'accepted'
             and ((from_id = me and to_id = other.id) or (from_id = other.id and to_id = me))) then
    return json_build_object('status', 'already', 'name', other.name, 'tag', other.tag);
  end if;
  -- Il m'avait demandé : on accepte
  if exists (select 1 from public.friendships where from_id = other.id and to_id = me and status = 'pending') then
    update public.friendships set status = 'accepted' where from_id = other.id and to_id = me;
    return json_build_object('status', 'accepted', 'name', other.name, 'tag', other.tag);
  end if;
  select count(*) into n_friends from public.friendships where status = 'accepted' and (from_id = me or to_id = me);
  if n_friends >= 100 then return json_build_object('status', 'full'); end if;
  select count(*) into n_pending from public.friendships where status = 'pending' and from_id = me;
  if n_pending >= 30 then return json_build_object('status', 'too_many'); end if;
  insert into public.friendships (from_id, to_id) values (me, other.id) on conflict do nothing;
  return json_build_object('status', 'sent', 'name', other.name, 'tag', other.tag);
end $$;

-- ---------- Accepter / refuser une demande reçue ----------
create or replace function public.respond_friend(p_id uuid, p_accept boolean)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'non connecté'; end if;
  if p_accept then
    update public.friendships set status = 'accepted' where from_id = p_id and to_id = me and status = 'pending';
  else
    delete from public.friendships where from_id = p_id and to_id = me and status = 'pending';
  end if;
  return json_build_object('status', case when p_accept then 'accepted' else 'refused' end);
end $$;

-- ---------- Retirer un ami (ou annuler une demande envoyée) ----------
create or replace function public.remove_friend(p_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'non connecté'; end if;
  delete from public.friendships where (from_id = me and to_id = p_id) or (from_id = p_id and to_id = me);
  return json_build_object('status', 'removed');
end $$;

-- ---------- Mes amis et mes demandes ----------
-- relation : 'friend' (ami), 'incoming' (demande reçue), 'outgoing' (demande envoyée)
create or replace function public.my_friends()
returns table (id uuid, name text, tag int, avatar text, color text, title text, car text, trophies int, league text, relation text, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.tag, p.avatar, p.color, p.title, p.car, p.trophies, public.league_of(p.trophies),
         case when f.status = 'accepted' then 'friend' when f.to_id = auth.uid() then 'incoming' else 'outgoing' end,
         p.updated_at
  from public.friendships f
  join public.players p on p.id = case when f.from_id = auth.uid() then f.to_id else f.from_id end
  where f.from_id = auth.uid() or f.to_id = auth.uid()
  order by p.trophies desc;
$$;

-- ---------- Fiche d'un pilote (statistiques publiques) ----------
create or replace function public.player_card(p_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', p.id, 'name', p.name, 'tag', p.tag, 'avatar', p.avatar, 'color', p.color, 'title', p.title, 'car', p.car,
    'trophies', p.trophies, 'best_trophies', p.best_trophies, 'races', p.races, 'wins', p.wins,
    'league', public.league_of(p.trophies), 'since', p.created_at, 'last_seen', p.updated_at,
    'rank', (select count(*) + 1 from public.players q where q.trophies > p.trophies),
    'relation', (select case when f.status = 'accepted' then 'friend' when f.to_id = auth.uid() then 'incoming' else 'outgoing' end
                 from public.friendships f where (f.from_id = auth.uid() and f.to_id = p.id) or (f.from_id = p.id and f.to_id = auth.uid()) limit 1),
    'friend_code', case when p.id = auth.uid() or exists (select 1 from public.friendships f where f.status = 'accepted'
                   and ((f.from_id = auth.uid() and f.to_id = p.id) or (f.from_id = p.id and f.to_id = auth.uid()))) then p.friend_code else null end
  ) from public.players p where p.id = p_id;
$$;

-- ---------- Supprimer mon profil en ligne (vie privée) ----------
-- Efface le profil, les amitiés et le compte invisible. La partie locale reste intacte.
create or replace function public.delete_my_profile()
returns json language plpgsql security definer set search_path = public, auth as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'non connecté'; end if;
  delete from public.players where id = me;
  delete from auth.users where id = me;
  return json_build_object('status', 'deleted');
end $$;

grant execute on function public.add_friend(text) to authenticated;
grant execute on function public.respond_friend(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.player_card(uuid) to anon, authenticated;
grant execute on function public.delete_my_profile() to authenticated;

-- ---------- Nettoyage : pilotes créés pendant les tests ----------
delete from auth.users where id in (select id from public.players where name like 'TEST BOT%');
