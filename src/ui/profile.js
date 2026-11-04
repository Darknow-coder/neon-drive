// Profil du joueur : identité (pseudo, emblème, titre), statistiques et succès.
// Contient aussi l'écran « Bienvenue, pilote » du premier lancement.

import { t, fmtNum, LOCALE, ord } from '../i18n/index.js';
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
const fmt = (n) => fmtNum(Math.floor(n));

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
    const since = new Date(save.createdAt).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
    $('pf-id').innerHTML = `
      <button class="pf-avatar-btn" id="pf-edit-av" aria-label="${t('Modifier mon emblème')}">${avatarHtml(save.profile, 'av-l')}<span class="pf-edit">${ico('edit')}</span></button>
      <div class="pf-name">${playerName(save)}</div>
      <div class="pf-title">${t(currentTitle(save))}</div>
      <button class="menu-btn small-btn pf-modify" id="pf-edit">${ico('edit')} ${t('MODIFIER')}</button>
      <div class="pf-league" style="--lc:${league.color}">
        <span class="pf-lbadge">${league.name}</span>
        <span class="pf-tro">${ico('trophy')}<b>${fmt(save.trophies)}</b></span>
      </div>
      <div class="pf-meta">${t('Record : <b>{n}</b> trophées (ligue {l})', { n: fmt(save.career.maxTrophies), l: best.name })}</div>
      <div class="pf-meta">${t('Pilote depuis le {d}', { d: since })}</div>`;
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
        ${tile(t('COURSES'), fmt(c.races))}
        ${tile(t('VICTOIRES'), fmt(c.wins), '', 'gold')}
        ${tile(t('PODIUMS'), fmt(c.podiums))}
        ${tile(t('TAUX DE VICTOIRE'), `${rate} %`)}
      </div>
      <div class="pf-grid">
        ${tile(t('Coupes gagnées'), fmt(cups), t('{n} jouée(s)', { n: fmt(save.cupStats.played) }))}
        ${tile(t('Éliminations gagnées'), fmt(c.elimWins), t('{n} jouée(s)', { n: fmt(c.elimPlayed) }))}
        ${tile(t('Médailles chrono'), fmt(medals))}
        ${tile(t('Rivaux battus'), `${Object.keys(save.rivalsBeaten).length} / ${LEAGUES.length}`)}
        ${tile(t('Distance'), `${fmt(kmOf(c.distance))} km`)}
        ${tile(t('Temps au volant'), duration(c.playTime))}
        ${tile(t('Crédits gagnés'), fmt(c.creditsEarned))}
        ${tile(t('Missions'), fmt(c.missionsDone))}
      </div>
      <div class="pf-favs" id="pf-favs"></div>
      <div class="pf-sec">${t('DERNIÈRES COURSES CLASSÉES')}</div>
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
    if (fc) { const car = getCar(fc.id); card(t('VOITURE PRÉFÉRÉE'), car.name, t('{n} course(s)', { n: fc.count }), carIcon(car, liveryFor(save, car.id), 96, 58)); }
    if (ft) {
      const td = getTrackData(ft.id);
      const img = new Image();
      img.src = minimap(td).toDataURL();
      card(t('CIRCUIT PRÉFÉRÉ'), td.name, t('{n} course(s)', { n: ft.count }), img);
    }
    if (!fc && !ft) favs.innerHTML = `<div class="pf-empty">${t('Tes voiture et circuit préférés apparaîtront ici après tes premières courses.')}</div>`;

    // Dernières courses
    const hist = $('pf-history');
    const rows = save.history.slice().reverse();
    hist.innerHTML = rows.length
      ? rows.map((h) => `<div class="pf-h p${Math.min(h.position, 4)}"><i>${ord(h.position, true)}</i><span>${getTrackData(h.trackId).name}</span><small>${getCar(h.carId).name}</small><b>${h.gained ? `+${h.gained}` : '0'} ${ico('trophy')}</b></div>`).join('')
      : `<div class="pf-empty">${t('Aucune course classée pour l\'instant.')}</div>`;
  }

  // ------------------------------------------------------------ Succès
  function renderAchievements() {
    const list = achievementStatus(save);
    const done = list.reduce((a, s) => a + s.claimed, 0);
    const total = list.length * 3;
    const el = $('pf-ach');
    el.innerHTML = `<div class="ach-head"><span>${t('{a} / {b} paliers', { a: done, b: total })}</span><div class="ach-total"><i style="width:${(done / total) * 100}%"></i></div></div>`;
    // Plusieurs récompenses en attente : tout récupérer d'un coup
    if (list.filter((s) => s.claimable).length >= 2) {
      const all = document.createElement('button');
      all.className = 'menu-btn primary';
      all.textContent = t('TOUT RÉCUPÉRER');
      all.addEventListener('click', () => {
        const got = claimAllAchievements(save);
        if (!got.count) return;
        onSave();
        sfx?.purchase?.();
        render();
        showRewards(save, [{
          credits: got.credits,
          title: t('{n} PALIERS DE SUCCÈS', { n: got.count }),
          note: got.titles.length ? `${got.titles.length > 1 ? t('Nouveaux titres :') : t('Nouveau titre :')} <b>${got.titles.map((x) => `« ${t(x)} »`).join(', ')}</b>` : '',
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
          <div class="ach-text">${s.complete ? t('Terminé ! Titre gagné : « {x} »', { x: t(s.def.title) }) : s.def.text(s.target)}</div>
          ${s.complete ? '' : `<div class="ach-bar"><i style="width:${pct}%"></i></div><div class="ach-num">${fmt(Math.min(s.value, s.target))} / ${fmt(s.target)}${unit}</div>`}
        </div>
        <div class="ach-side"></div>`;
      const side = d.querySelector('.ach-side');
      if (s.complete) side.innerHTML = '<span class="ach-done">✓</span>';
      else {
        side.innerHTML = `<div class="ach-rew">${ico('credit')}${ACHIEVEMENT_REWARDS[s.tier]}</div>${s.tier === 2 ? `<div class="ach-tt">${t('+ titre')}</div>` : ''}`;
        if (s.claimable) {
          const b = document.createElement('button');
          b.className = 'menu-btn primary';
          b.textContent = t('RÉCUPÉRER');
          b.addEventListener('click', () => {
            const got = claimAchievement(save, s.def.id);
            if (!got) return;
            onSave();
            sfx?.purchase?.();
            render();
            showRewards(save, [{
              credits: got.credits,
              title: t('SUCCÈS {n} {k}', { n: got.name, k: ['I', 'II', 'III'][got.tier - 1] }),
              note: got.title ? t('Nouveau titre débloqué : <b>« {x} »</b>', { x: t(got.title) }) : '',
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
    $('id-preview').innerHTML = `${avatarHtml(draft, 'av-l')}<div class="id-pname">${(cleanName(draft.name).name ?? draft.name.toUpperCase()) || '…'}</div><div class="id-ptitle">${t(draft.title ?? currentTitle(save))}</div>`;
    $('id-avatars').innerHTML = AVATARS.map((a) => {
      const owned = ownsAvatar(save, a.id);
      return `<button class="id-av ${a.id === draft.avatar ? 'on' : ''} ${owned ? '' : 'locked'} ${a.exclusive ? 'excl' : ''}" data-av="${a.id}" ${owned ? '' : 'disabled'} title="${owned ? a.name : a.unlock ? `${a.name} : ${a.unlock}` : t('{a} : niveau {n} du passe de saison', { a: a.name, n: a.tier })}" style="--ac:${draft.color}">${avatarSvg(a.id)}${owned ? '' : `<small>${a.tier ? t('NIV {n}', { n: a.tier }) : t('CARRIÈRE')}</small>`}</button>`;
    }).join('');
    $('id-colors').innerHTML = AVATAR_COLORS.map((c) => `<button class="id-col ${c === draft.color ? 'on' : ''}" data-col="${c}" style="--c:${c}" aria-label="${t('Couleur')} ${c}"></button>`).join('');
    const titles = unlockedTitles(save);
    $('id-titles').innerHTML = titles.map((x) => `<button class="id-tt ${x === (draft.title ?? currentTitle(save)) ? 'on' : ''}" data-tt="${x}">${t(x)}</button>`).join('')
      + (titles.length === 1 ? `<span class="id-tt-note">${t('Termine des succès pour gagner d\'autres titres.')}</span>` : '');
    $('id-avatars').querySelectorAll('button:not([disabled])').forEach((b) => b.addEventListener('click', () => { draft.avatar = b.dataset.av; sfx?.click?.(); renderIdentity(); }));
    $('id-colors').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { draft.color = b.dataset.col; sfx?.click?.(); renderIdentity(); }));
    $('id-titles').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { draft.title = b.dataset.tt; sfx?.click?.(); renderIdentity(); }));
  }

  /** Ouvre l'éditeur. `welcome` : premier lancement (pas d'annulation). */
  function openIdentity({ welcome = false, onDone } = {}) {
    idDone = onDone ?? null;
    draft = { name: save.profile.name ?? randomName(), avatar: save.profile.avatar, color: save.profile.color, title: currentTitle(save) };
    $('id-title').textContent = welcome ? t('BIENVENUE, PILOTE !') : t('MON IDENTITÉ');
    $('id-sub').textContent = welcome ? t('Choisis ton pseudo et ton emblème. Tu pourras les changer à tout moment dans ton profil.') : t('Pseudo, emblème, couleur et titre.');
    $('id-cancel').classList.toggle('hidden', welcome);
    $('id-titles-wrap').classList.toggle('hidden', welcome);
    $('id-ok').textContent = welcome ? t("C'EST PARTI !") : t('ENREGISTRER');
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
    open(tb = 'stats') { tab = tb; render(); $('profile').classList.remove('hidden'); },
    openIdentity,
  };
}
