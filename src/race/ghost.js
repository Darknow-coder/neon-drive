// Fantômes du contre-la-montre.
//
// Un fantôme = la trajectoire d'un tour, échantillonnée 40 fois par seconde :
// position (x, y), orientation et distance parcourue. Stocké en binaire
// compact (≈ 8 octets par échantillon, ≈ 10 Ko par tour), encodé en base64.
// Les fantômes sont rangés à part de la sauvegarde (clé localStorage dédiée)
// pour garder le code d'export de progression court.

export const GHOST_HZ = 40;
const STEPS_PER_SAMPLE = 3; // la physique tourne à 120 Hz

// ---------- Enregistrement ----------
export function createRecorder() {
  let samples = [];
  let counter = 0;
  return {
    start() { samples = []; counter = 0; },
    /** À appeler à chaque pas physique pendant le tour. */
    step(car, dist) {
      if (counter++ % STEPS_PER_SAMPLE !== 0) return;
      samples.push([car.x, car.y, car.angle, dist]);
    },
    finish(time, extra = {}) {
      return { time, data: encode(samples), n: samples.length, ...extra };
    },
    get count() { return samples.length; },
  };
}

function encode(samples) {
  const buf = new Int16Array(samples.length * 4);
  samples.forEach(([x, y, a, d], i) => {
    buf[i * 4] = Math.round(x * 2);          // précision 0,5 unité
    buf[i * 4 + 1] = Math.round(y * 2);
    const w = Math.atan2(Math.sin(a), Math.cos(a));
    buf[i * 4 + 2] = Math.round(w * 10000);  // radians × 10 000
    buf[i * 4 + 3] = Math.round(d / 2) - 16384; // distance (pas de 2 unités)
  });
  const bytes = new Uint8Array(buf.buffer);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

/** Décode un fantôme pour la lecture. */
export function decodeGhost(g) {
  const bin = atob(g.data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const buf = new Int16Array(bytes.buffer);
  const n = buf.length / 4;
  const x = new Float32Array(n), y = new Float32Array(n), a = new Float32Array(n), d = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = buf[i * 4] / 2;
    y[i] = buf[i * 4 + 1] / 2;
    a[i] = buf[i * 4 + 2] / 10000;
    d[i] = (buf[i * 4 + 3] + 16384) * 2;
  }
  return { ...g, n, x, y, a, d };
}

/** Position du fantôme à l'instant t (secondes depuis le début du tour). */
export function ghostAt(G, t, out = {}) {
  const f = t * GHOST_HZ;
  if (f < 0 || f >= G.n - 1) return null;
  const i = Math.floor(f), k = f - i;
  out.x = G.x[i] + (G.x[i + 1] - G.x[i]) * k;
  out.y = G.y[i] + (G.y[i + 1] - G.y[i]) * k;
  let da = G.a[i + 1] - G.a[i];
  if (da > Math.PI) da -= Math.PI * 2;
  if (da < -Math.PI) da += Math.PI * 2;
  out.angle = G.a[i] + da * k;
  return out;
}

/** Temps mis par le fantôme pour atteindre la distance d (pour l'écart en direct). */
export function ghostTimeAtDist(G, d) {
  let lo = 0, hi = G.n - 1;
  if (d <= G.d[0]) return 0;
  if (d >= G.d[hi]) return null;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (G.d[mid] < d) lo = mid; else hi = mid;
  }
  const span = G.d[hi] - G.d[lo] || 1;
  return (lo + (d - G.d[lo]) / span) / GHOST_HZ;
}

// ---------- Stockage local ----------
const KEY = 'neondrive.ghosts';
function readAll() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; }
}
export function loadGhost(trackId) {
  const g = readAll()[trackId];
  return g && typeof g.data === 'string' && g.time > 0 ? g : null;
}
export function saveGhost(trackId, ghost) {
  const all = readAll();
  all[trackId] = ghost;
  try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; }
}
