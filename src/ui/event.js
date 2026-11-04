// Écran de l'événement GIGA RUSH : présentation, objectifs et récompenses.

import { t, fmtNum, ord } from '../i18n/index.js';
import { EVENT, EVENT_GOALS } from '../data/event.js';
import { PACKS } from '../data/economy.js';
import { getTrackData } from '../data/tracks/index.js';
import { getCar } from '../data/cars.js';
import { selectedCar, liveryFor } from '../progression/garage.js';
import { eventGoalsDone } from '../progression/event.js';
import { ico } from './icons.js';
import { carIcon } from './carIcon.js';
import { minimap } from './timeTrialSelect.js';

const $ = (id) => document.getElementById(id);
const placeName = (p) => ord(p, true);
const GOAL_LABEL = { top10: 'TOP 10', top5: 'TOP 5', podium: 'PODIUM', win: t('VICTOIRE') };

/** Visuel d'une récompense (crédits, pack, motif exclusif sur ta voiture). */
function rewardVisual(save, r) {
  const box = document.createElement('div');
  box.className = 'evg-rew';
  if (r.motif) {
    const id = selectedCar(save);
    box.append(carIcon(getCar(id), { ...liveryFor(save, id), motif: r.motif }, 120, 120));
    box.insertAdjacentHTML('beforeend', `<span class="evg-excl">${t('MOTIF EXCLUSIF')}</span>`);
  } else if (r.pack) {
    const p = PACKS[r.pack];
    box.insertAdjacentHTML('beforeend', `<span class="evg-pack" style="--pc:${p.color}">${p.name}</span>`);
  }
  if (r.credits) box.insertAdjacentHTML('beforeend', `<span class="evg-cr">${ico('credit')}${r.credits}</span>`);
  return box;
}

export function createEventScreen({ save, sfx, onPlay, onClose }) {
  function render() {
    $('event-credits').innerHTML = `${ico('credit')}<b class="cr-num">${fmtNum(save.credits)}</b>`;
    const td = getTrackData(EVENT.trackId);
    const map = $('ev-map');
    if (!map.firstChild) {
      const img = new Image();
      img.src = minimap(td).toDataURL();
      map.append(img);
      map.insertAdjacentHTML('beforeend', `<span>${td.name}</span>`);
    }
    $('ev-name').textContent = EVENT.name;
    $('ev-tag').textContent = EVENT.tagline;
    $('ev-desc').textContent = EVENT.desc;
    const ev = save.event;
    $('ev-stats').innerHTML = `<span>${t('Meilleure place')} <b>${ev.best ? placeName(ev.best) : '—'}</b></span><span>${t('Courses')} <b>${ev.played}</b></span><span>${t('Crédits à chaque course')} <b>${ico('credit')}${t('10 à 150')}</b></span>`;
    $('ev-goals-count').textContent = `${eventGoalsDone(save)} / ${EVENT_GOALS.length}`;

    const goals = $('ev-goals');
    goals.innerHTML = '';
    for (const g of EVENT_GOALS) {
      const done = ev.claimed.includes(g.id);
      const d = document.createElement('div');
      d.className = `evg ${done ? 'done' : ''} g-${g.id}`;
      d.innerHTML = `<div class="evg-place">${GOAL_LABEL[g.id]}</div><div class="evg-label">${g.label}</div>`;
      d.append(rewardVisual(save, g.reward));
      d.insertAdjacentHTML('beforeend', `<div class="evg-state">${done ? `✓ ${t('OBTENU')}` : t('À GAGNER')}</div>`);
      goals.append(d);
    }
  }

  $('event-back').addEventListener('click', () => { $('event').classList.add('hidden'); onClose?.(); });
  $('ev-go').addEventListener('click', () => { sfx?.click?.(); $('event').classList.add('hidden'); onPlay(); });

  return { open() { render(); $('event').classList.remove('hidden'); } };
}
