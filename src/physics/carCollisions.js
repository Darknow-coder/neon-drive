// Collisions entre voitures.
// Chaque voiture = 2 cercles (comme pour les murs). Les chocs échangent de la
// vitesse selon la masse : une voiture robuste (TITAN) pousse davantage
// qu'une voiture légère, et perd moins de vitesse.

import { carCircles } from './collisions.js';

const RESTITUTION = 0.35;
const tmpA = [{}, {}];

function copyCircles(car, out) {
  const cs = carCircles(car);
  for (let k = 0; k < 2; k++) Object.assign(out[k], cs[k]);
  return out;
}

/** Résout toutes les collisions entre voitures. Retourne le nombre de contacts. */
export function collideCars(cars) {
  let contacts = 0;
  for (let a = 0; a < cars.length; a++) {
    const A = cars[a];
    for (let b = a + 1; b < cars.length; b++) {
      const B = cars[b];
      const dx0 = B.x - A.x;
      const dy0 = B.y - A.y;
      if (dx0 * dx0 + dy0 * dy0 > 60 * 60) continue; // trop loin : rien à faire
      const ca = copyCircles(A, tmpA);
      const cb = carCircles(B);
      for (const p of ca) {
        for (const q of cb) {
          const dx = q.x - p.x;
          const dy = q.y - p.y;
          const d = Math.hypot(dx, dy);
          const min = p.r + q.r;
          if (d >= min || d < 1e-6) continue;
          contacts++;
          const nx = dx / d;
          const ny = dy / d;
          const ma = A.params.mass;
          const mb = B.params.mass;
          const inv = 1 / ma + 1 / mb;
          // Séparation (répartie selon la masse)
          const over = min - d;
          A.x -= nx * over * (1 / ma) / inv;
          A.y -= ny * over * (1 / ma) / inv;
          B.x += nx * over * (1 / mb) / inv;
          B.y += ny * over * (1 / mb) / inv;
          // Vitesse relative au point de contact
          const avx = A.vx - A.yawRate * p.oy;
          const avy = A.vy + A.yawRate * p.ox;
          const bvx = B.vx - B.yawRate * q.oy;
          const bvy = B.vy + B.yawRate * q.ox;
          const vn = (avx - bvx) * nx + (avy - bvy) * ny;
          if (vn <= 0) continue; // déjà en train de s'éloigner
          const j = ((1 + RESTITUTION) * vn) / inv;
          A.vx -= (nx * j) / ma; A.vy -= (ny * j) / ma;
          B.vx += (nx * j) / mb; B.vy += (ny * j) / mb;
          // Frottement latéral (les carrosseries « accrochent » un peu)
          const tx = -ny, ty = nx;
          const vt = (avx - bvx) * tx + (avy - bvy) * ty;
          const jt = Math.max(-j * 0.25, Math.min(j * 0.25, (vt * 0.2) / inv));
          A.vx -= (tx * jt) / ma; A.vy -= (ty * jt) / ma;
          B.vx += (tx * jt) / mb; B.vy += (ty * jt) / mb;
          // Rotation : un choc sur l'arrière fait pivoter
          A.yawRate -= ((p.ox * ny - p.oy * nx) * j * 0.0005) / ma;
          B.yawRate += ((q.ox * ny - q.oy * nx) * j * 0.0005) / mb;
          const strength = vn;
          for (const C of [A, B]) {
            if (strength > C.impact) {
              C.impact = strength;
              C.impactX = p.x + nx * p.r;
              C.impactY = p.y + ny * p.r;
            }
            C.contactThisStep = Math.max(C.contactThisStep || 0, strength);
            if (strength > 220) C.drifting = false;
          }
        }
      }
    }
  }
  return contacts;
}
