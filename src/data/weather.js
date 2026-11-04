// Météos des circuits. Chaque circuit choisit la sienne (champ `weather`).
// La même règle s'applique à toutes les voitures (joueur et IA).

import { t } from '../i18n/index.js';
export const WEATHER = {
  clear: { name: t('DÉGAGÉ'), grip: 1, desc: '' },
  rain: { name: t('PLUIE'), grip: 0.82, desc: t('Piste mouillée : ça glisse un peu') },
  dusk: { name: t('CRÉPUSCULE'), grip: 1, desc: t('Pluie de pétales au coucher du soleil') },
  snow: { name: t('NEIGE'), grip: 0.76, desc: t('Piste enneigée : freine plus tôt !') },
  sand: { name: t('TEMPÊTE DE SABLE'), grip: 0.93, desc: t('Rafales de vent : tiens bien ta trajectoire') },
  fog: { name: t('BROUILLARD'), grip: 0.96, desc: t('Visibilité réduite : retiens le tracé') },
  storm: { name: t('ORAGE'), grip: 0.8, desc: t('Pluie battante et éclairs') },
};

export const weatherOf = (id) => WEATHER[id] ?? WEATHER.clear;

// ---------- Vent (tempête de sable) ----------
// Rafales régulières, annoncées à l'écran juste avant. Elles dépendent
// seulement du temps de course : identiques pour tout le monde.
export const WIND = { first: 5, period: 8.5, duration: 2.4, accel: 240, warn: 1.4 };

function hash01(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Direction (angle monde) de la rafale numéro k sur un circuit. */
export function gustAngle(seed, k) {
  return hash01(seed * 31 + k) * Math.PI * 2;
}

/**
 * Vent à l'instant t : { ax, ay, k } (accélération et intensité 0…1),
 * plus `soon` : direction de la prochaine rafale si elle arrive bientôt.
 */
export function windAt(seed, t, out = { ax: 0, ay: 0, k: 0, soon: null }) {
  out.ax = 0; out.ay = 0; out.k = 0; out.soon = null;
  if (t < WIND.first - WIND.warn) return out;
  const u = t - WIND.first;
  const k = Math.floor(u / WIND.period);
  const inGust = u - k * WIND.period;
  if (u >= 0 && inGust < WIND.duration) {
    const env = Math.sin(Math.PI * (inGust / WIND.duration));
    const a = gustAngle(seed, k);
    out.k = env;
    out.ax = Math.cos(a) * WIND.accel * env;
    out.ay = Math.sin(a) * WIND.accel * env;
  }
  // Annonce de la rafale suivante
  const next = u < 0 ? 0 : k + 1;
  const tNext = WIND.first + next * WIND.period;
  if (tNext - t > 0 && tNext - t <= WIND.warn) out.soon = gustAngle(seed, next);
  return out;
}

// ---------- Éclairs (orage) ----------
// Un éclair toutes les ~9 s (± 3 s). Retourne le temps écoulé depuis le dernier
// éclair (Infinity s'il n'y en a pas encore) et son numéro.
export function lastLightning(t) {
  if (t < 3) return { since: Infinity, k: -1 };
  const at = (k) => 3 + k * 9 + (hash01(k * 7 + 3) - 0.5) * 6;
  let k = Math.max(0, Math.floor((t - 3) / 9) - 1);
  while (at(k + 1) <= t) k++;
  return at(k) <= t ? { since: t - at(k), k } : { since: Infinity, k: -1 };
}
