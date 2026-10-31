// Écran de résultats de fin de course.

import { formatTime } from '../core/math.js';

const el = (id) => document.getElementById(id);

export function showResults(rows, { trackName }) {
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
    // Encore en piste : temps estimé s'il est proche de l'arrivée, sinon « non terminé »
    const far = r.estimated && r.gap > 15;
    const time = far ? 'NON TERMINÉ' : r.position === 1 ? formatTime(r.time) : `+${r.gap.toFixed(2)} s`;
    tr.innerHTML = `
      <td class="pos">${r.position}</td>
      <td class="name"><i style="background:${r.colors.body};box-shadow:0 0 6px ${r.colors.glow}"></i>${r.isPlayer ? 'TOI' : r.name}</td>
      <td class="hide-narrow">${r.car}</td>
      <td class="${r.estimated ? 'est' : ''}">${time}${r.estimated && !far ? ' ~' : ''}</td>
      <td class="hide-narrow ${r.bestLap === bestOfRace ? 'best' : ''}">${formatTime(r.bestLap)}</td>`;
    tbody.append(tr);
  }
  el('results').classList.remove('hidden');
}

export function hideResults() {
  el('results').classList.add('hidden');
}
