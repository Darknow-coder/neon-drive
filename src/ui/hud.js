// Affichage tête haute : tour, chronos, vitesse, jauge de boost.
// On ne modifie le texte HTML que s'il a changé (économise du temps de calcul).

import { formatTime } from '../core/math.js';

export const SPEED_TO_KMH = 0.32;

export function createHud() {
  const el = {
    root: document.getElementById('hud'),
    lap: document.getElementById('hud-lap'),
    time: document.getElementById('hud-time'),
    best: document.getElementById('hud-best'),
    last: document.getElementById('hud-last'),
    speed: document.getElementById('hud-speed'),
    boost: document.getElementById('hud-boost'),
    boostBtn: document.querySelector('.tbtn-boost'),
  };
  const cache = {};
  const set = (key, node, value, prop = 'textContent') => {
    if (cache[key] !== value) {
      cache[key] = value;
      if (prop === 'width') node.style.width = value;
      else node[prop] = value;
    }
  };

  return {
    show(v) { el.root.classList.toggle('hidden', !v); },
    update({ car, lap, lapTime, bestLap, lastMsg }) {
      set('lap', el.lap, lap > 0 ? String(lap) : '–');
      set('time', el.time, lap > 0 ? formatTime(lapTime) : '0:00.000');
      set('best', el.best, formatTime(bestLap));
      set('last', el.last, lastMsg || '');
      set('speed', el.speed, String(Math.round(Math.max(0, car.vF) * SPEED_TO_KMH)));
      set('boost', el.boost, `${Math.round(car.boost * 100)}%`, 'width');
      const ready = car.boost > 0.15;
      if (cache.ready !== ready) {
        cache.ready = ready;
        el.boost.classList.toggle('full', car.boost > 0.99);
        el.boostBtn?.classList.toggle('ready', ready);
      }
      if ((car.boost > 0.99) !== cache.full) {
        cache.full = car.boost > 0.99;
        el.boost.classList.toggle('full', cache.full);
      }
    },
  };
}
