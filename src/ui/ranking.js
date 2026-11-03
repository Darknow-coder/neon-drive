// Écran CLASSEMENT (en ligne) : monde, ma ligue, autour de moi, amis.
// + fiche d'un pilote (en touchant une ligne) et demandes d'amis.
import { rpc, onlineId, cached } from '../online/api.js';
import { syncProfile } from '../online/sync.js';
import { LEAGUES, leagueFor } from '../data/progression.js';
import { getCar } from '../data/cars.js';
import { avatarHtml } from './avatar.js';
import { carIcon } from './carIcon.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tagOf = (n) => `#${String(n).padStart(4, '0')}`;
const fmt = (n) => Number(n).toLocaleString('fr-FR');
export const friendLink = (code) => `${location.origin}${location.pathname}?ami=${code}`;

function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 120) return 'en ligne à l\'instant';
  if (s < 3600) return `vu il y a ${Math.round(s / 60)} min`;
  if (s < 86400) return `vu il y a ${Math.round(s / 3600)} h`;
  return `vu il y a ${Math.round(s / 86400)} j`;
}

const ADD_MSG = {
  sent: (r) => `Demande envoyée à ${esc(r.name)} ${tagOf(r.tag)} ! Elle doit l'accepter.`,
  accepted: (r) => `${esc(r.name)} ${tagOf(r.tag)} est maintenant ton ami !`,
  already: (r) => `${esc(r.name)} est déjà ton ami.`,
  unknown: () => 'Aucun pilote avec ce code. Vérifie les 6 caractères.',
  self: () => 'C\'est ton propre code !',
  full: () => 'Tu as déjà 100 amis (maximum).',
  too_many: () => 'Trop de demandes en attente : attends qu\'elles soient acceptées.',
  no_profile: () => 'Ton profil n\'est pas encore en ligne : réessaie dans un instant.',
};

export function createRankingScreen({ save, sfx, onClose, onFriendsChange }) {
  let tab = 'world';
  let busy = false;
  let pendingCode = null;
  let again = false;      // un onglet a été touché pendant un chargement : on recharge après
  let lastMsg = null;     // message de l'ajout d'ami (gardé après rechargement)

  function row(p, mine) {
    const lg = LEAGUES.find((l) => l.id === p.league) ?? LEAGUES[0];
    const medal = p.rank <= 3 ? ` top${p.rank}` : '';
    return `<button class="rk-row${mine ? ' me' : ''}${medal}" data-id="${p.id}">
      <span class="rk-pos">${p.rank}</span>
      ${avatarHtml({ avatar: p.avatar, color: p.color }, 'av-s')}
      <span class="rk-name"><b>${esc(p.name)}<i>${tagOf(p.tag)}</i></b><small>${esc(p.title)}</small></span>
      <span class="rk-lg" style="--lc:${lg.color}">${lg.name}</span>
      <span class="rk-tro">${ico('trophy')}<b>${fmt(p.trophies)}</b></span>
    </button>`;
  }

  function renderMe(me) {
    const box = $('rk-me');
    if (!me) { box.innerHTML = '<span class="rk-wait">Connexion au classement…</span>'; return; }
    box.innerHTML = `${avatarHtml(save.profile, 'av-m')}
      <div class="rk-me-txt"><b>${esc(me.name)}<i>${tagOf(me.tag)}</i></b><small>Code ami : <em>${esc(me.friend_code)}</em></small></div>
      <div class="rk-me-rank"><small>CLASSEMENT MONDIAL</small><b>#${fmt(me.rank)}</b></div>
      <div class="rk-me-tro">${ico('trophy')}<b>${fmt(me.trophies)}</b></div>
      ${me.refused ? '<div class="rk-warn">Une partie de tes trophées n\'a pas été comptée (progression jugée impossible).</div>' : ''}`;
  }

  function bindRows(root) {
    root.querySelectorAll('.rk-row[data-id]').forEach((b) => b.addEventListener('click', () => { sfx?.click?.(); openCard(b.dataset.id); }));
  }

  // ------------------------------------------------------------ Onglet AMIS
  async function renderFriends(list, me) {
    const all = await rpc('my_friends');
    const friends = all.filter((f) => f.relation === 'friend');
    const incoming = all.filter((f) => f.relation === 'incoming');
    const outgoing = all.filter((f) => f.relation === 'outgoing');
    onFriendsChange?.(incoming.length);
    // Classement entre amis (moi compris)
    const myId = onlineId();
    const meRow = { id: myId, name: me.name, tag: me.tag, avatar: save.profile.avatar, color: save.profile.color, title: me.title ?? '', trophies: me.trophies, league: leagueFor(me.trophies).id };
    const ranked = [...friends, meRow].sort((a, b) => b.trophies - a.trophies).map((p, k, arr) => ({ ...p, rank: arr.findIndex((q) => q.trophies === p.trophies) + 1 }));
    list.innerHTML = `
      <div class="fr-add">
        <div class="fr-add-row">
          <input id="fr-code" maxlength="6" placeholder="CODE AMI" autocomplete="off" autocapitalize="characters" spellcheck="false" value="${esc(pendingCode ?? '')}" />
          <button class="menu-btn primary" id="fr-add-btn">AJOUTER</button>
          <button class="menu-btn" id="fr-share">PARTAGER MON CODE</button>
        </div>
        <div class="fr-msg ${lastMsg?.cls ?? ''}" id="fr-msg">${lastMsg?.html ?? ''}</div>
      </div>
      ${incoming.length ? `<div class="fr-sec">DEMANDES REÇUES (${incoming.length})</div>${incoming.map((f) => `
        <div class="fr-req">${avatarHtml({ avatar: f.avatar, color: f.color }, 'av-s')}
          <span class="rk-name"><b>${esc(f.name)}<i>${tagOf(f.tag)}</i></b><small>${fmt(f.trophies)} trophées</small></span>
          <button class="menu-btn primary fr-yes" data-id="${f.id}">ACCEPTER</button><button class="menu-btn fr-no" data-id="${f.id}">REFUSER</button></div>`).join('')}` : ''}
      <div class="fr-sec">ENTRE AMIS (${friends.length})</div>
      ${friends.length ? ranked.map((p) => row(p, p.id === myId)).join('') : '<div class="rk-wait">Pas encore d\'amis : partage ton code ou entre celui d\'un ami !</div>'}
      ${outgoing.length ? `<div class="fr-sec">DEMANDES ENVOYÉES</div>${outgoing.map((f) => `<div class="fr-req out">${avatarHtml({ avatar: f.avatar, color: f.color }, 'av-s')}
          <span class="rk-name"><b>${esc(f.name)}<i>${tagOf(f.tag)}</i></b><small>en attente…</small></span>
          <button class="menu-btn fr-cancel" data-id="${f.id}">ANNULER</button></div>`).join('')}` : ''}`;
    bindRows(list);
    const msg = $('fr-msg');
    lastMsg = null;
    const say = (html, cls) => { msg.innerHTML = html; msg.className = `fr-msg ${cls}`; lastMsg = { html, cls }; };
    const add = async () => {
      const code = $('fr-code').value.trim().toUpperCase();
      if (!/^[0-9A-F]{6}$/.test(code)) { msg.textContent = 'Un code ami fait 6 caractères (chiffres et lettres A à F).'; msg.className = 'fr-msg err'; return; }
      msg.textContent = 'Envoi…'; msg.className = 'fr-msg';
      try {
        const r = await rpc('add_friend', { p_code: code });
        pendingCode = null;
        say((ADD_MSG[r.status] ?? (() => 'Erreur.'))(r), ['sent', 'accepted'].includes(r.status) ? 'ok' : 'err');
        if (['sent', 'accepted'].includes(r.status)) { sfx?.unlock?.(); setTimeout(load, 1400); }
      } catch { msg.textContent = 'Pas de connexion : réessaie.'; msg.className = 'fr-msg err'; }
    };
    $('fr-add-btn').onclick = add;
    $('fr-code').onkeydown = (e) => { if (e.key === 'Enter') add(); };
    $('fr-code').oninput = () => { $('fr-code').value = $('fr-code').value.toUpperCase().replace(/[^0-9A-F]/g, ''); };
    $('fr-share').onclick = async () => {
      const url = friendLink(me.friend_code);
      const text = `Ajoute-moi sur NEON//DRIVE ! Mon code ami : ${me.friend_code}`;
      try {
        if (navigator.share) await navigator.share({ title: 'NEON//DRIVE', text, url });
        else { await navigator.clipboard.writeText(`${text}\n${url}`); msg.textContent = 'Lien copié ! Envoie-le à tes amis.'; msg.className = 'fr-msg ok'; }
      } catch { msg.innerHTML = `Ton lien : <b>${esc(url)}</b>`; msg.className = 'fr-msg ok'; }
    };
    const act = (sel, fn) => list.querySelectorAll(sel).forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true;
      try { await fn(b.dataset.id); sfx?.click?.(); } catch { /* réseau */ }
      load();
    }));
    act('.fr-yes', (id) => rpc('respond_friend', { p_id: id, p_accept: true }));
    act('.fr-no', (id) => rpc('respond_friend', { p_id: id, p_accept: false }));
    act('.fr-cancel', (id) => rpc('remove_friend', { p_id: id }));
    if (pendingCode) { pendingCode = null; add(); }
  }

  // ------------------------------------------------------------ Fiche d'un pilote
  async function openCard(id) {
    const box = $('pcard');
    box.classList.remove('hidden');
    box.innerHTML = '<div class="pc-inner"><div class="rk-wait">Chargement…</div></div>';
    try {
      const p = await rpc('player_card', { p_id: id });
      const lg = LEAGUES.find((l) => l.id === p.league) ?? LEAGUES[0];
      const car = getCar(p.car);
      const mine = p.id === onlineId();
      const rate = p.races ? Math.round((p.wins / p.races) * 100) : 0;
      box.innerHTML = `<div class="pc-inner" style="--lc:${lg.color}">
        <button class="pc-close" aria-label="Fermer">✕</button>
        <div class="pc-head">${avatarHtml({ avatar: p.avatar, color: p.color }, 'av-l')}
          <div><b>${esc(p.name)}<i>${tagOf(p.tag)}</i></b><small>${esc(p.title)}</small><span class="pc-seen">${mine ? 'C\'est toi !' : ago(p.last_seen)}</span></div></div>
        <div class="pc-league"><span class="rk-lg" style="--lc:${lg.color}">${lg.name}</span><span class="rk-tro">${ico('trophy')}<b>${fmt(p.trophies)}</b></span><span class="pc-rank">#${fmt(p.rank)} mondial</span></div>
        <div class="pc-body"><div class="pc-car"></div>
          <div class="pc-stats">
            <span><b>${fmt(p.races)}</b>courses</span><span><b>${fmt(p.wins)}</b>victoires</span>
            <span><b>${rate} %</b>de victoires</span><span><b>${fmt(p.best_trophies)}</b>record</span>
          </div></div>
        <div class="pc-actions"></div>
      </div>`;
      box.querySelector('.pc-car').append(carIcon(car, car.colors, 120, 120));
      box.querySelector('.pc-car').insertAdjacentHTML('beforeend', `<small>${car.name}</small>`);
      const actions = box.querySelector('.pc-actions');
      const btn = (label, cls, fn) => {
        const b = document.createElement('button');
        b.className = `menu-btn ${cls}`; b.textContent = label;
        b.onclick = async () => { b.disabled = true; try { await fn(); sfx?.click?.(); } catch { /* réseau */ } openCard(id); if (tab === 'friends') load(); };
        actions.append(b);
      };
      if (!mine) {
        if (p.relation === 'friend') btn('RETIRER DES AMIS', '', () => rpc('remove_friend', { p_id: id }));
        else if (p.relation === 'incoming') btn('ACCEPTER SA DEMANDE', 'primary', () => rpc('respond_friend', { p_id: id, p_accept: true }));
        else if (p.relation === 'outgoing') btn('ANNULER MA DEMANDE', '', () => rpc('remove_friend', { p_id: id }));
        else actions.insertAdjacentHTML('beforeend', '<small class="pc-hint">Pour l\'ajouter en ami, demande-lui son code ami (onglet AMIS).</small>');
      }
      box.querySelector('.pc-close').onclick = () => box.classList.add('hidden');
    } catch {
      box.innerHTML = '<div class="pc-inner"><div class="rk-wait">Pas de connexion.</div><button class="menu-btn pc-x">FERMER</button></div>';
      box.querySelector('.pc-x').onclick = () => box.classList.add('hidden');
    }
  }
  $('pcard').addEventListener('click', (e) => { if (e.target.id === 'pcard') $('pcard').classList.add('hidden'); });

  // ------------------------------------------------------------ Chargement
  async function load() {
    if (busy) { again = true; return; }
    busy = true;
    again = false;
    const list = $('rk-list');
    list.innerHTML = '<div class="rk-wait">Chargement…</div>';
    document.querySelectorAll('.rk-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    try {
      // Le profil est envoyé d'abord : ta place est toujours à jour
      const me = await syncProfile(save, { now: true });
      renderMe(me ?? cached());
      if (!me) throw new Error('offline');
      const total = await rpc('players_count', {}, { needAuth: false }).catch(() => null);
      $('rk-total').textContent = total ? `${fmt(total)} pilote${total > 1 ? 's' : ''} classé${total > 1 ? 's' : ''}` : '';
      if (tab === 'friends') { await renderFriends(list, me); return; }
      const rows = tab === 'around'
        ? await rpc('leaderboard_around', { p_range: 6 })
        : await rpc('leaderboard_top', { p_league: tab === 'league' ? leagueFor(save.trophies).id : null, p_limit: 50 });
      const myId = onlineId();
      list.innerHTML = rows.length ? rows.map((p) => row(p, p.id === myId)).join('') : '<div class="rk-wait">Personne dans cette ligue pour l\'instant… Sois le premier !</div>';
      bindRows(list);
      list.querySelector('.rk-row.me')?.scrollIntoView({ block: 'center' });
    } catch {
      list.innerHTML = `<div class="rk-off">${ico('lock')}<b>HORS LIGNE</b><span>Le classement a besoin d'internet. Tes trophées seront envoyés automatiquement dès que tu seras connecté.</span><button class="menu-btn" id="rk-retry">RÉESSAYER</button></div>`;
      $('rk-retry').onclick = () => load();
    } finally {
      busy = false;
      if (again) load();
    }
  }

  document.querySelectorAll('.rk-tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; sfx?.click?.(); load(); }));
  $('ranking-back').addEventListener('click', () => { $('pcard').classList.add('hidden'); $('ranking').classList.add('hidden'); onClose?.(); });

  return {
    /** Ouvre l'écran ; `code` : code ami reçu par un lien (ajout direct). */
    open(t = 'world', code = null) {
      tab = t;
      pendingCode = code;
      $('ranking').classList.remove('hidden');
      $('rk-league-tab').textContent = `LIGUE ${leagueFor(save.trophies).name}`;
      renderMe(cached());
      load();
    },
  };
}
