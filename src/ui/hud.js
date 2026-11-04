// Affichage tête haute : tour, chronos, vitesse, jauge de boost.
// On ne modifie le texte HTML que s'il a changé (économise du temps de calcul).

import { formatTime } from '../core/math.js';

export const SPEED_TO_KMH = 0.32;

export function createHud() {
  const el = {
    root: document.getElementById('hud'),
    lap: document.getElementById('hud-lap'),
    laps: document.getElementById('hud-laps'),
    pos: document.getElementById('hud-pos'),
    total: document.getElementById('hud-total'),
    msg: document.getElementById('hud-msg'),
    rival: document.getElementById('hud-rival'),
    delta: document.getElementById('hud-delta'),
    elimLine: document.getElementById('hud-elim'),
    danger: document.getElementById('hud-danger'),
    count: document.getElementById('hud-count'),
    lights: document.getElementById('hud-lights'),
    weather: document.getElementById('hud-weather'),
    wind: document.getElementById('hud-wind'),
    windArrow: document.getElementById('hud-wind-arrow'),
    lightsHint: document.getElementById('hud-lights-hint'),
    time: document.getElementById('hud-time'),
    best: document.getElementById('hud-best'),
    speed: document.getElementById('hud-speed'),
    boost: document.getElementById('hud-boost'),
    boostBtn: document.querySelector('.tbtn-boost'),
  };
  const cache = {};
  const set = (key, node, value, prop = 'textContent') => {
    if (cache[key] !== value) {
      cache[key] = value;
      if (prop === 'width') node.style.width = value;
      else if (prop === 'scaleX') node.style.transform = `scaleX(${value})`;
      else node[prop] = value;
    }
  };

  return {
    show(v) { el.root.classList.toggle('hidden', !v); },
    update({ car, lap, laps, lapTime, bestLap, lastMsg, position, total, big, rival = null, timeTrial = false, delta = null, elim = null, lights = null, launchHint = true, msgTone = '', weather = null, wind = null }) {
      // Bandeau météo (pendant le compte à rebours)
      const wTxt = weather ? `<b>${weather.name}</b>${weather.desc ? ` · ${weather.desc}` : ''}` : '';
      if (cache.wTxt !== wTxt) { cache.wTxt = wTxt; el.weather.innerHTML = wTxt; el.weather.classList.toggle('hidden', !wTxt); }
      // Rafale de vent : annoncée, puis direction pendant la rafale
      const windOn = !!wind;
      if (cache.windOn !== windOn) { cache.windOn = windOn; el.wind.classList.toggle('hidden', !windOn); }
      if (wind) {
        const deg = Math.round((wind.angle * 180) / Math.PI);
        if (cache.windDeg !== deg) { cache.windDeg = deg; el.windArrow.style.transform = `rotate(${deg}deg)`; }
        if (cache.windSoon !== wind.soon) { cache.windSoon = wind.soon; el.wind.classList.toggle('soon', wind.soon); }
      }
      // Feux de départ : 3 rouges (3, 2, 1) puis tout vert (0)
      const lKey = lights === null ? 'off' : `${lights}${launchHint ? 'h' : ''}`;
      if (cache.lKey !== lKey) {
        cache.lKey = lKey;
        el.lights.classList.toggle('hidden', lights === null);
        el.lights.classList.toggle('go', lights === 0);
        el.lights.querySelectorAll('i').forEach((lamp, k) => lamp.classList.toggle('on', lights !== null && lights > 0 && k < 4 - lights));
        el.lightsHint.classList.toggle('hidden', !launchHint || lights === 0);
      }
      if (cache.tone !== msgTone) { cache.tone = msgTone; el.msg.dataset.tone = msgTone; }
      set('lap', el.lap, lap > 0 ? String(lap) : '–');
      set('laps', el.laps, timeTrial || !laps ? '' : `/${laps}`);
      // Mode Élimination
      const eTxt = elim ? `ÉLIMINATION ${elim.round}/${elim.rounds} · ${elim.left} EN PISTE` : '';
      if (cache.eTxt !== eTxt) { cache.eTxt = eTxt; el.elimLine.textContent = eTxt; el.elimLine.classList.toggle('hidden', !eTxt); }
      const dg = !!elim?.danger;
      if (cache.dg !== dg) { cache.dg = dg; el.danger.classList.toggle('hidden', !dg); }
      const cTxt = elim?.countdown ? String(elim.countdown) : '';
      if (cache.cTxt !== cTxt) {
        cache.cTxt = cTxt;
        el.count.textContent = cTxt ? `ÉLIMINATION DANS ${cTxt}` : '';
        el.count.classList.toggle('hidden', !cTxt);
        el.count.classList.toggle('me', dg);
      }
      if (cache.tt !== timeTrial) { cache.tt = timeTrial; el.root.classList.toggle('tt', timeTrial); }
      // Écart avec le fantôme (contre-la-montre)
      const dTxt = delta === null ? '' : `${delta.label} ${delta.value < 0 ? '−' : '+'}${Math.abs(delta.value).toFixed(2)} s`;
      if (cache.dTxt !== dTxt) {
        cache.dTxt = dTxt;
        el.delta.textContent = dTxt;
        el.delta.classList.toggle('hidden', !dTxt);
        el.delta.classList.toggle('ahead', !!delta && delta.value < 0);
      }
      set('pos', el.pos, String(position));
      set('total', el.total, `/${total}`);
      set('msg', el.msg, lastMsg || '');
      const rivalTxt = rival ? `★ ${rival.name} : ${rival.position}e${rival.position > position ? ' — derrière toi' : ''}` : '';
      if (cache.rivalTxt !== rivalTxt) {
        cache.rivalTxt = rivalTxt;
        el.rival.textContent = rivalTxt;
        el.rival.classList.toggle('hidden', !rival);
        el.rival.classList.toggle('ahead', !!rival && rival.position > position);
      }
      if (cache.big !== !!big) { cache.big = !!big; el.msg.classList.toggle('big', !!big); }
      // Chiffres qui changent sans arrêt (chrono, vitesse, jauge) : ~15 fois par seconde
      // suffisent à l'œil, et chaque mise à jour du texte coûte un recalcul de la page.
      const now = performance.now();
      if (now - (cache.numAt ?? 0) > 66) {
        cache.numAt = now;
        set('time', el.time, lap > 0 ? formatTime(lapTime) : '0:00.000');
        set('speed', el.speed, String(Math.round(Math.max(0, car.vF) * SPEED_TO_KMH)));
        set('boost', el.boost, String(Math.round(car.boost * 50) / 50), 'scaleX'); // (transform : sans recalcul de la page)
      }
      set('best', el.best, formatTime(bestLap));
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
