// Écran de résultats de fin de course.

import { formatTime } from '../core/math.js';
import { leagueProgress } from '../data/progression.js';
import { ico } from './icons.js';

const el = (id) => document.getElementById(id);

export function showResults(rows, { trackName, reward = null, training = false, credits = null }) {
  const me = rows.find((r) => r.isPlayer);
  const p = me ? me.position : rows.length;
  el('res-place').innerHTML = `${p}<sup>${p === 1 ? 'er' : 'e'}</sup>`;
  el('res-title').textContent =
    p === 1 ? 'VICTOIRE !' : p <= 3 ? 'PODIUM !' : p <= 5 ? 'BIEN JOUÉ' : 'COURSE TERMINÉE';
  el('res-track').textContent = trackName;

  const bestOfRace = Math.min(...rows.map((r) => r.bestLap));
  const tbody = el('res-rows');
  tbody.innerHTML = '';
  for (const r of rows) {
    const tr = document.createElement('tr');
    if (r.isPlayer) tr.className = 'me';
    else if (r.isRival) tr.className = 'rival';
    // Encore en piste : temps estimé s'il est proche de l'arrivée, sinon « non terminé »
    const far = r.estimated && r.gap > 15;
    const time = far ? 'NON TERMINÉ' : r.position === 1 ? formatTime(r.time) : `+${r.gap.toFixed(2)} s`;
    tr.innerHTML = `
      <td class="pos">${r.position}</td>
      <td class="name"><i style="background:${r.colors.body};box-shadow:0 0 6px ${r.colors.glow}"></i>${r.isPlayer ? 'TOI' : r.isRival ? `★ ${r.name}` : r.name}</td>
      <td class="hide-narrow">${r.car}</td>
      <td class="${r.estimated ? 'est' : ''}">${time}${r.estimated && !far ? ' ~' : ''}</td>
      <td class="hide-narrow ${r.bestLap === bestOfRace ? 'best' : ''}">${formatTime(r.bestLap)}</td>`;
    tbody.append(tr);
  }
  // Crédits gagnés (détail)
  const cb = el('res-credits');
  cb.classList.toggle('hidden', !credits);
  if (credits) {
    cb.innerHTML = `<span class="ct">${ico('credit', 'big')}+${credits.total}</span>` +
      credits.lines.map((l) => `<span class="cl">${l.label} <b>+${l.amount}</b></span>`).join('');
  }

  // Trophées et ligue
  const box = el('res-reward');
  box.classList.toggle('hidden', !reward);
  el('res-promo').classList.add('hidden');
  el('res-cars').classList.add('hidden');
  el('res-rival').classList.add('hidden');
  el('res-record').classList.add('hidden');
  if (training) {
    el('res-record').textContent = 'ENTRAÎNEMENT — PAS DE TROPHÉES';
    el('res-record').classList.remove('hidden');
  }
  if (reward) {
    el('res-gain').textContent = `+${reward.gained}`;
    const rivalRow = rows.find((r) => r.isRival);
    if (rivalRow) {
      const rb = el('res-rival');
      rb.classList.remove('hidden');
      rb.classList.toggle('won', reward.rivalBeaten);
      rb.textContent = reward.rivalBeaten
        ? `★ RIVAL ${rivalRow.name} BATTU ! +${reward.rivalBonus} TROPHÉES BONUS${reward.firstRivalWin ? ' — PREMIÈRE FOIS !' : ''}`
        : `★ ${rivalRow.name} a fini devant toi — bats-le pour +3 trophées bonus`;
    }
    const tag = el('res-league');
    tag.textContent = reward.newLeague.name;
    tag.style.color = reward.newLeague.color;
    el('res-total').textContent = `${reward.after} trophée${reward.after > 1 ? 's' : ''}`;
    // La barre part de l'ancienne valeur puis se remplit
    const fill = el('res-fill');
    fill.style.transition = 'none';
    fill.style.width = `${Math.round(leagueProgress(reward.promoted ? reward.newLeague.min : reward.before) * 100)}%`;
    void fill.offsetWidth;
    fill.style.transition = '';
    setTimeout(() => { fill.style.width = `${Math.round(leagueProgress(reward.after) * 100)}%`; }, 350);
    if (reward.promoted) {
      const unlocked = reward.unlockedTracks.map((t) => t.name).join(', ');
      el('res-promo').textContent = `NOUVELLE LIGUE : ${reward.newLeague.name} !${unlocked ? ` — circuit débloqué : ${unlocked}` : ''}`;
      el('res-promo').classList.remove('hidden');
    }
    if (reward.unlockedCars?.length) {
      el('res-cars').textContent = `NOUVELLE VOITURE DÉBLOQUÉE : ${reward.unlockedCars.map((c) => c.name).join(', ')} — à essayer dans le garage !`;
      el('res-cars').classList.remove('hidden');
    }
    if (reward.newRecord) {
      el('res-record').textContent = reward.previousRecord
        ? `NOUVEAU RECORD DU TOUR : ${formatTime(me.bestLap)} (avant : ${formatTime(reward.previousRecord)})`
        : `PREMIER RECORD DU TOUR : ${formatTime(me.bestLap)}`;
      el('res-record').classList.remove('hidden');
    }
  }
  el('results').classList.remove('hidden');
}

export function hideResults() {
  el('results').classList.add('hidden');
}
