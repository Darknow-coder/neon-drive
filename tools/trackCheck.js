// Vérifie la géométrie de chaque circuit (à lancer après toute modification).
// Usage : node tools/trackCheck.js
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';

const MARGIN = 130;     // espace minimum entre deux portions de piste (murs + décor)
const CAR_W = 24;
let failed = false;

for (const td of TRACKS) {
  const t = buildTrack(td);
  const problems = [];

  // 1) Chevauchements : deux portions éloignées sur le tracé mais proches à l'écran
  const step = 3;
  let worst = { gap: Infinity };
  for (let i = 0; i < t.count; i += step) {
    for (let j = i + step; j < t.count; j += step) {
      let arc = (j - i) * t.spacing;
      arc = Math.min(arc, t.length - arc);
      const need = t.hw[i] + t.hw[j] + MARGIN;
      if (arc < need * 2) continue; // portions voisines : normal qu'elles soient proches
      const d = Math.hypot(t.x[i] - t.x[j], t.y[i] - t.y[j]);
      const gap = d - (t.hw[i] + t.hw[j]);
      if (gap < worst.gap) worst = { gap, i, j };
    }
  }
  if (worst.gap < MARGIN) {
    problems.push(`portions trop proches (écart ${Math.round(worst.gap)} u) vers ${(worst.i / t.count).toFixed(2)} et ${(worst.j / t.count).toFixed(2)} du tour`);
  }

  // 2) Virages trop serrés (le mur intérieur se replierait sur lui-même)
  let minR = Infinity, at = 0;
  for (let i = 0; i < t.count; i++) {
    const r = 1 / Math.max(Math.abs(t.curv[i]), 1e-6) - t.hw[i];
    if (r < minR) { minR = r; at = i; }
  }
  if (minR < 50) problems.push(`virage trop serré vers ${(at / t.count).toFixed(2)} du tour (rayon intérieur ${Math.round(minR)} u)`);

  // 3) Passages à côté des piliers : au moins 2,5 largeurs de voiture
  for (const ob of t.obstacles) {
    const off = (ob.x - t.x[ob.index]) * t.nx[ob.index] + (ob.y - t.y[ob.index]) * t.ny[ob.index];
    const hw = t.hw[ob.index] - t.wallThickness / 2;
    const left = hw + off - ob.r;
    const right = hw - off - ob.r;
    if (Math.min(left, right) < CAR_W * 2.5) problems.push(`passage trop étroit à côté du pilier à ${(ob.index / t.count).toFixed(2)} (${Math.round(Math.min(left, right))} u)`);
  }

  const lapEstimate = t.length / 560;
  console.log(`${problems.length ? '✗' : '✓'} ${td.name.padEnd(16)} longueur ${Math.round(t.length)} u (~${lapEstimate.toFixed(0)} s/tour)  écart min ${Math.round(worst.gap)} u  rayon int. min ${Math.round(minR)} u  obstacles ${t.obstacles.length}  zones ${t.zones.length}`);
  for (const p of problems) console.log('    → ' + p);
  if (problems.length) failed = true;
}
process.exit(failed ? 1 : 0);
