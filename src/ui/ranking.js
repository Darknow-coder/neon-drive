// Écran CLASSEMENT (en ligne) : monde, ma ligue, autour de moi.
import { rpc, onlineId, cached } from '../online/api.js';
import { syncProfile } from '../online/sync.js';
import { LEAGUES, leagueFor } from '../data/progression.js';
import { avatarHtml } from './avatar.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tagOf = (n) => `#${String(n).padStart(4, '0')}`;

export function createRankingScreen({ save, sfx, onClose }) {
  let tab = 'world';
  let busy = false;

  function row(p, mine) {
    const lg = LEAGUES.find((l) => l.id === p.league) ?? LEAGUES[0];
    const medal = p.rank <= 3 ? ` top${p.rank}` : '';
    return `<div class="rk-row${mine ? ' me' : ''}${medal}">
      <span class="rk-pos">${p.rank}</span>
      ${avatarHtml({ avatar: p.avatar, color: p.color }, 'av-s')}
      <span class="rk-name"><b>${esc(p.name)}<i>${tagOf(p.tag)}</i></b><small>${esc(p.title)}</small></span>
      <span class="rk-lg" style="--lc:${lg.color}">${lg.name}</span>
      <span class="rk-tro">${ico('trophy')}<b>${p.trophies.toLocaleString('fr-FR')}</b></span>
    </div>`;
  }

  function renderMe(me) {
    const box = $('rk-me');
    if (!me) { box.innerHTML = '<span class="rk-wait">Connexion au classement…</span>'; return; }
    box.innerHTML = `${avatarHtml(save.profile, 'av-m')}
      <div class="rk-me-txt"><b>${esc(me.name)}<i>${tagOf(me.tag)}</i></b><small>Code ami : <em>${me.friend_code}</em></small></div>
      <div class="rk-me-rank"><small>CLASSEMENT MONDIAL</small><b>#${Number(me.rank).toLocaleString('fr-FR')}</b></div>
      <div class="rk-me-tro">${ico('trophy')}<b>${me.trophies.toLocaleString('fr-FR')}</b></div>
      ${me.refused ? '<div class="rk-warn">Une partie de tes trophées n\'a pas été comptée (progression jugée impossible).</div>' : ''}`;
  }

  async function load() {
    if (busy) return;
    busy = true;
    const list = $('rk-list');
    list.innerHTML = '<div class="rk-wait">Chargement…</div>';
    document.querySelectorAll('.rk-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    try {
      // Le profil est envoyé d'abord : ta place est toujours à jour
      const me = await syncProfile(save, { now: true });
      renderMe(me ?? cached());
      if (!me) throw new Error('offline');
      let rows;
      if (tab === 'around') rows = await rpc('leaderboard_around', { p_range: 6 });
      else rows = await rpc('leaderboard_top', { p_league: tab === 'league' ? leagueFor(save.trophies).id : null, p_limit: 50 });
      const total = await rpc('players_count', {}, { needAuth: false }).catch(() => null);
      $('rk-total').textContent = total ? `${Number(total).toLocaleString('fr-FR')} pilote${total > 1 ? 's' : ''} classé${total > 1 ? 's' : ''}` : '';
      const myId = onlineId();
      list.innerHTML = rows.length ? rows.map((p) => row(p, p.id === myId)).join('') : '<div class="rk-wait">Personne dans cette ligue pour l\'instant… Sois le premier !</div>';
      list.querySelector('.rk-row.me')?.scrollIntoView({ block: 'center' });
    } catch {
      list.innerHTML = `<div class="rk-off">${ico('lock')}<b>HORS LIGNE</b><span>Le classement a besoin d'internet. Tes trophées seront envoyés automatiquement dès que tu seras connecté.</span><button class="menu-btn" id="rk-retry">RÉESSAYER</button></div>`;
      $('rk-retry').onclick = () => load();
    } finally {
      busy = false;
    }
  }

  document.querySelectorAll('.rk-tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; sfx?.click?.(); load(); }));
  $('ranking-back').addEventListener('click', () => { $('ranking').classList.add('hidden'); onClose?.(); });

  return {
    open(t = 'world') {
      tab = t;
      $('ranking').classList.remove('hidden');
      $('rk-league-tab').textContent = `LIGUE ${leagueFor(save.trophies).name}`;
      renderMe(cached());
      load();
    },
  };
}
