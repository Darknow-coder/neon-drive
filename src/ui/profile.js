// Profil du joueur : identité (pseudo, emblème, titre), statistiques et succès.
// Contient aussi l'écran « Bienvenue, pilote » du premier lancement.

import { AVATARS, AVATAR_COLORS, ACHIEVEMENT_REWARDS, randomName, kmOf, NAME_MAX, ownsAvatar } from '../data/profile.js';
import {
  setIdentity, cleanName, playerName, currentTitle, unlockedTitles, favorite,
  achievementStatus, achievementsBadge, claimAchievement, claimAllAchievements,
} from '../progression/profile.js';
import { leagueFor, LEAGUES } from '../data/progression.js';
import { getCar } from '../data/cars.js';
import { getTrackData } from '../data/tracks/index.js';
import { liveryFor } from '../progression/garage.js';
import { ico } from './icons.js';
import { avatarHtml, avatarSvg } from './avatar.js';
import { carIcon } from './carIcon.js';
import { minimap } from './timeTrialSelect.js';
import { showRewards } from './packOpen.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => Math.floor(n).toLocaleString('fr-FR');

function duration(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m} min`;
}

export function createProfile({ save, onSave, sfx, onClose }) {
  let tab = 'stats';

  // ------------------------------------------------------------ Identité
  function renderId() {
    const league = leagueFor(save.trophies);
    const best = leagueFor(save.career.maxTrophies);
    const since = new Date(save.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    $('pf-id').innerHTML = `
      <button class="pf-avatar-btn" id="pf-edit-av" aria-label="Modifier mon emblème">${avatarHtml(save.profile, 'av-l')}<span class="pf-edit">${ico('edit')}</span></button>
      <div class="pf-name">${playerName(save)}</div>
      <div class="pf-title">${currentTitle(save)}</div>
      <button class="menu-btn small-btn pf-modify" id="pf-edit">${ico('edit')} MODIFIER</button>
      <div class="pf-league" style="--lc:${league.color}">
        <span class="pf-lbadge">${league.name}</span>
        <span class="pf-tro">${ico('trophy')}<b>${fmt(save.trophies)}</b></span>
      </div>
      <div class="pf-meta">Record : <b>${fmt(save.career.maxTrophies)}</b> trophées (ligue ${best.name})</div>
      <div class="pf-meta">Pilote depuis le ${since}</div>`;
    $('pf-edit').addEventListener('click', () => openIdentity());
    $('pf-edit-av').addEventListener('click', () => openIdentity());
  }

  // ------------------------------------------------------------ Statistiques
  function renderStats() {
    const c = save.career;
    const rate = c.races ? Math.round((c.wins / c.races) * 100) : 0;
    const medals = Object.values(save.timeTrial.medals).reduce((a, m) => a + m.length, 0);
    const cups = Object.values(save.cupStats.won).reduce((a, b) => a + b, 0);
    const tile = (label, value, sub = '', cls = '') => `<div class="pf-stat ${cls}"><b>${value}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const el = $('pf-stats');
    el.innerHTML = `
      <div class="pf-big">
        ${tile('COURSES', fmt(c.races))}
        ${tile('VICTOIRES', fmt(c.wins), '', 'gold')}
        ${tile('PODIUMS', fmt(c.podiums))}
        ${tile('TAUX DE VICTOIRE', `${rate} %`)}
      </div>
      <div class="pf-grid">
        ${tile('Coupes gagnées', fmt(cups), `${fmt(save.cupStats.played)} jouée${save.cupStats.played > 1 ? 's' : ''}`)}
        ${tile('Éliminations gagnées', fmt(c.elimWins), `${fmt(c.elimPlayed)} jouée${c.elimPlayed > 1 ? 's' : ''}`)}
        ${tile('Médailles chrono', fmt(medals))}
        ${tile('Rivaux battus', `${Object.keys(save.rivalsBeaten).length} / ${LEAGUES.length}`)}
        ${tile('Distance', `${fmt(kmOf(c.distance))} km`)}
        ${tile('Temps au volant', duration(c.playTime))}
        ${tile('Crédits gagnés', fmt(c.creditsEarned))}
        ${tile('Missions', fmt(c.missionsDone))}
      </div>
      <div class="pf-favs" id="pf-favs"></div>
      <div class="pf-sec">DERNIÈRES COURSES CLASSÉES</div>
      <div class="pf-history" id="pf-history"></div>`;

    // Voiture et circuit préférés
    const favs = $('pf-favs');
    const fc = favorite(c.carRaces);
    const ft = favorite(c.trackRaces);
    const card = (label, name, sub, media) => {
      const d = document.createElement('div');
      d.className = 'pf-fav';
      d.innerHTML = `<div class="pf-fav-media"></div><div><span>${label}</span><b>${name}</b><small>${sub}</small></div>`;
      d.querySelector('.pf-fav-media').append(media);
      favs.append(d);
    };
    if (fc) { const car = getCar(fc.id); card('VOITURE PRÉFÉRÉE', car.name, `${fc.count} course${fc.count > 1 ? 's' : ''}`, carIcon(car, liveryFor(save, car.id), 96, 58)); }
    if (ft) {
      const td = getTrackData(ft.id);
      const img = new Image();
      img.src = minimap(td).toDataURL();
      card('CIRCUIT PRÉFÉRÉ', td.name, `${ft.count} course${ft.count > 1 ? 's' : ''}`, img);
    }
    if (!fc && !ft) favs.innerHTML = '<div class="pf-empty">Tes voiture et circuit préférés apparaîtront ici après tes premières courses.</div>';

    // Dernières courses
    const hist = $('pf-history');
    const rows = save.history.slice().reverse();
    hist.innerHTML = rows.length
      ? rows.map((h) => `<div class="pf-h p${Math.min(h.position, 4)}"><i>${h.position}${h.position === 1 ? 're' : 'e'}</i><span>${getTrackData(h.trackId).name}</span><small>${getCar(h.carId).name}</small><b>${h.gained ? `+${h.gained}` : '0'} ${ico('trophy')}</b></div>`).join('')
      : '<div class="pf-empty">Aucune course classée pour l\'instant.</div>';
  }

  // ------------------------------------------------------------ Succès
  function renderAchievements() {
    const list = achievementStatus(save);
    const done = list.reduce((a, s) => a + s.claimed, 0);
    const total = list.length * 3;
    const el = $('pf-ach');
    el.innerHTML = `<div class="ach-head"><span>${done} / ${total} paliers</span><div class="ach-total"><i style="width:${(done / total) * 100}%"></i></div></div>`;
    // Plusieurs récompenses en attente : tout récupérer d'un coup
    if (list.filter((s) => s.claimable).length >= 2) {
      const all = document.createElement('button');
      all.className = 'menu-btn primary';
      all.textContent = 'TOUT RÉCUPÉRER';
      all.addEventListener('click', () => {
        const got = claimAllAchievements(save);
        if (!got.count) return;
        onSave();
        sfx?.purchase?.();
        render();
        showRewards(save, [{
          credits: got.credits,
          title: `${got.count} PALIERS DE SUCCÈS`,
          note: got.titles.length ? `Nouveau${got.titles.length > 1 ? 'x' : ''} titre${got.titles.length > 1 ? 's' : ''} : <b>${got.titles.map((t) => `« ${t} »`).join(', ')}</b>` : '',
        }], { sfx, onClose: render });
      });
      el.querySelector('.ach-head').append(all);
    }
    // Ordre : à récupérer d'abord, puis en cours, puis terminés
    const rank = (s) => (s.claimable ? 0 : s.complete ? 2 : 1);
    for (const s of list.slice().sort((a, b) => rank(a) - rank(b))) {
      const d = document.createElement('div');
      d.className = `ach ${s.claimable ? 'ready' : ''} ${s.complete ? 'complete' : ''}`;
      const pct = s.complete ? 100 : Math.min(100, (s.value / s.target) * 100);
      const pips = [0, 1, 2].map((k) => `<i class="t${k} ${k < s.claimed ? 'on' : k < s.reached ? 'got' : ''}"></i>`).join('');
      const unit = s.def.unit ? ` ${s.def.unit}` : '';
      d.innerHTML = `
        <div class="ach-pips">${pips}</div>
        <div class="ach-body">
          <div class="ach-name">${s.def.name}${s.complete ? '' : ` <small>${['I', 'II', 'III'][s.tier]}</small>`}</div>
          <div class="ach-text">${s.complete ? `Terminé ! Titre gagné : « ${s.def.title} »` : s.def.text(s.target)}</div>
          ${s.complete ? '' : `<div class="ach-bar"><i style="width:${pct}%"></i></div><div class="ach-num">${fmt(Math.min(s.value, s.target))} / ${fmt(s.target)}${unit}</div>`}
        </div>
        <div class="ach-side"></div>`;
      const side = d.querySelector('.ach-side');
      if (s.complete) side.innerHTML = '<span class="ach-done">✓</span>';
      else {
        side.innerHTML = `<div class="ach-rew">${ico('credit')}${ACHIEVEMENT_REWARDS[s.tier]}</div>${s.tier === 2 ? `<div class="ach-tt">+ titre</div>` : ''}`;
        if (s.claimable) {
          const b = document.createElement('button');
          b.className = 'menu-btn primary';
          b.textContent = 'RÉCUPÉRER';
          b.addEventListener('click', () => {
            const got = claimAchievement(save, s.def.id);
            if (!got) return;
            onSave();
            sfx?.purchase?.();
            render();
            showRewards(save, [{
              credits: got.credits,
              title: `SUCCÈS ${got.name} ${['I', 'II', 'III'][got.tier - 1]}`,
              note: got.title ? `Nouveau titre débloqué : <b>« ${got.title} »</b>` : '',
            }], { sfx, onClose: render });
          });
          side.append(b);
        }
      }
      el.append(d);
    }
  }

  function render() {
    $('profile-credits').innerHTML = `${ico('credit')}<b class="cr-num">${fmt(save.credits)}</b>`;
    renderId();
    if (tab === 'stats') renderStats();
    else renderAchievements();
    document.querySelectorAll('.pf-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $('pf-stats').classList.toggle('hidden', tab !== 'stats');
    $('pf-ach').classList.toggle('hidden', tab !== 'ach');
    const n = achievementsBadge(save);
    $('pf-ach-badge').textContent = String(n);
    $('pf-ach-badge').classList.toggle('hidden', !n);
  }

  document.querySelectorAll('.pf-tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; sfx?.click?.(); render(); }));
  $('profile-back').addEventListener('click', () => { $('profile').classList.add('hidden'); onClose?.(); });

  // ------------------------------------------------------------ Éditeur d'identité
  let draft = null;
  let idDone = null;
  function renderIdentity() {
    $('id-preview').innerHTML = `${avatarHtml(draft, 'av-l')}<div class="id-pname">${(cleanName(draft.name).name ?? draft.name.toUpperCase()) || '…'}</div><div class="id-ptitle">${draft.title ?? currentTitle(save)}</div>`;
    $('id-avatars').innerHTML = AVATARS.map((a) => {
      const owned = ownsAvatar(save, a.id);
      return `<button class="id-av ${a.id === draft.avatar ? 'on' : ''} ${owned ? '' : 'locked'} ${a.exclusive ? 'excl' : ''}" data-av="${a.id}" ${owned ? '' : 'disabled'} title="${owned ? a.name : `${a.name} : niveau ${a.tier} du passe de saison`}" style="--ac:${draft.color}">${avatarSvg(a.id)}${owned ? '' : `<small>NIV ${a.tier}</small>`}</button>`;
    }).join('');
    $('id-colors').innerHTML = AVATAR_COLORS.map((c) => `<button class="id-col ${c === draft.color ? 'on' : ''}" data-col="${c}" style="--c:${c}" aria-label="Couleur ${c}"></button>`).join('');
    const titles = unlockedTitles(save);
    $('id-titles').innerHTML = titles.map((t) => `<button class="id-tt ${t === (draft.title ?? currentTitle(save)) ? 'on' : ''}" data-tt="${t}">${t}</button>`).join('')
      + (titles.length === 1 ? '<span class="id-tt-note">Termine des succès pour gagner d\'autres titres.</span>' : '');
    $('id-avatars').querySelectorAll('button:not([disabled])').forEach((b) => b.addEventListener('click', () => { draft.avatar = b.dataset.av; sfx?.click?.(); renderIdentity(); }));
    $('id-colors').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { draft.color = b.dataset.col; sfx?.click?.(); renderIdentity(); }));
    $('id-titles').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { draft.title = b.dataset.tt; sfx?.click?.(); renderIdentity(); }));
  }

  /** Ouvre l'éditeur. `welcome` : premier lancement (pas d'annulation). */
  function openIdentity({ welcome = false, onDone } = {}) {
    idDone = onDone ?? null;
    draft = { name: save.profile.name ?? randomName(), avatar: save.profile.avatar, color: save.profile.color, title: currentTitle(save) };
    $('id-title').textContent = welcome ? 'BIENVENUE, PILOTE !' : 'MON IDENTITÉ';
    $('id-sub').textContent = welcome ? 'Choisis ton pseudo et ton emblème. Tu pourras les changer à tout moment dans ton profil.' : 'Pseudo, emblème, couleur et titre.';
    $('id-cancel').classList.toggle('hidden', welcome);
    $('id-titles-wrap').classList.toggle('hidden', welcome);
    $('id-ok').textContent = welcome ? "C'EST PARTI !" : 'ENREGISTRER';
    $('id-input').value = draft.name;
    $('id-input').maxLength = NAME_MAX;
    $('id-error').textContent = '';
    renderIdentity();
    $('identity').classList.remove('hidden');
  }

  $('id-input').addEventListener('input', () => { draft.name = $('id-input').value; $('id-error').textContent = ''; renderIdentity(); });
  $('id-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); $('id-ok').click(); } });
  $('id-dice').addEventListener('click', () => { draft.name = randomName(); $('id-input').value = draft.name; $('id-error').textContent = ''; sfx?.click?.(); renderIdentity(); });
  $('id-cancel').addEventListener('click', () => { $('identity').classList.add('hidden'); });
  $('id-ok').addEventListener('click', () => {
    const r = setIdentity(save, { name: draft.name, avatar: draft.avatar, color: draft.color, title: draft.title });
    if (r.error) { $('id-error').textContent = r.error; sfx?.error?.(); return; }
    onSave();
    sfx?.unlock?.();
    $('id-input').blur();
    $('identity').classList.add('hidden');
    if (!$('profile').classList.contains('hidden')) render();
    const cb = idDone; idDone = null;
    cb?.();
    onClose?.();
  });

  return {
    open(t = 'stats') { tab = t; render(); $('profile').classList.remove('hidden'); },
    openIdentity,
  };
}
