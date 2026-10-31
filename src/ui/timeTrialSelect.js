// Écran de choix du circuit pour le contre-la-montre.
import { TRACKS } from '../data/tracks/index.js';
import { MEDALS, medalTimes } from '../data/timeTrial.js';
import { getCar } from '../data/cars.js';
import { buildTrack } from '../track/buildTrack.js';
import { bestTime, medalsWon, medalCounts } from '../progression/timeTrial.js';
import { selectedCar } from '../progression/garage.js';
import { formatTime } from '../core/math.js';

const $ = (id) => document.getElementById(id);
const minimaps = new Map();

/** Petit plan du circuit (dessiné une fois). */
function minimap(td) {
  if (minimaps.has(td.id)) return minimaps.get(td.id);
  const t = buildTrack(td);
  const W = 380, H = 192;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const b = t.bounds;
  const sc = Math.min((W - 20) / (b.maxX - b.minX), (H - 20) / (b.maxY - b.minY));
  const ox = (W - (b.maxX - b.minX) * sc) / 2 - b.minX * sc;
  const oy = (H - (b.maxY - b.minY) * sc) / 2 - b.minY * sc;
  c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i <= t.count; i++) { const k = i % t.count; const x = t.x[k] * sc + ox, y = t.y[k] * sc + oy; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.strokeStyle = 'rgba(0,240,255,0.25)'; c.lineWidth = 9; c.stroke();
  c.strokeStyle = td.theme?.left ?? '#00f0ff'; c.lineWidth = 3; c.stroke();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(t.x[0] * sc + ox, t.y[0] * sc + oy, 5, 0, Math.PI * 2); c.fill();
  minimaps.set(td.id, cv);
  return cv;
}

export function createTimeTrialSelect({ save, onStart, onClose }) {
  function render() {
    const counts = medalCounts(save);
    $('tt-total').innerHTML = MEDALS.map((m) => `<span><i class="medal on" style="--mc:${m.color};width:16px;height:16px;font-size:0"></i>${counts[m.id]}</span>`).join('');
    $('tt-car').textContent = getCar(selectedCar(save)).name;
    const list = $('tt-list');
    list.innerHTML = '';
    for (const td of TRACKS.filter((t) => !t.custom)) {
      const best = bestTime(save, td.id);
      const won = new Set(medalsWon(save, td.id));
      const times = medalTimes(td.id) ?? [];
      const next = [...times].reverse().find((m) => !won.has(m.id) && (!best || best > m.time));
      const nextNotWon = times.find((m) => !won.has(m.id));
      const el = document.createElement('div');
      el.className = 'tt-track';
      el.append(minimap(td));
      el.insertAdjacentHTML('beforeend', `
        <div class="tn">${td.name}</div>
        <div class="tp">${td.profile}</div>
        <div class="tb">${best ? formatTime(best) : '–:––.–––'} <span>${best ? 'ton record' : 'pas encore de record'}</span></div>
        <div class="tt-medals">${times.map((m) => `<i class="medal ${won.has(m.id) ? 'on' : ''}" style="--mc:${m.color}" title="${m.name} : ${formatTime(m.time)}">${m.id === 'neon' ? 'N' : m.name[0]}</i>`).join('')}</div>
        <div class="tt-next">${nextNotWon ? `Prochaine : ${nextNotWon.name} en ${formatTime(nextNotWon.time)}` : '★ Toutes les médailles !'}</div>
        <button class="menu-btn primary tt-go">ROULER</button>`);
      el.addEventListener('click', () => { close(); onStart(td.id); });
      list.append(el);
      void next;
    }
  }
  function close() { $('tt-select').classList.add('hidden'); }
  $('tt-back').addEventListener('click', () => { close(); onClose?.(); });
  return { open() { render(); $('tt-select').classList.remove('hidden'); } };
}
