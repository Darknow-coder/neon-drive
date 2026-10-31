// Collisions voiture ↔ murs du circuit.
// La voiture est approchée par deux cercles (avant / arrière) : assez précis
// pour qu'un choc de l'avant fasse pivoter la voiture de manière crédible,
// et très rapide à calculer.
// (Les collisions voiture ↔ voiture arriveront à l'étape 3, avec les IA.)

import { queryTrack } from '../track/buildTrack.js';

const q = {};
const RESTITUTION = 0.25; // rebond sur les murs (0 = colle, 1 = super-balle)

export function carCircles(car) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const off = car.length * 0.27;
  const r = car.width * 0.5 + 1;
  return [
    { x: car.x + fx * off, y: car.y + fy * off, ox: fx * off, oy: fy * off, r },
    { x: car.x - fx * off, y: car.y - fy * off, ox: -fx * off, oy: -fy * off, r },
  ];
}

/** Garde la voiture dans le circuit. Retourne la force du choc (0 si aucun). */
export function collideCarWithWalls(car, track) {
  // Repère sur le tracé (utilisé aussi pour les tours et, plus tard, l'IA)
  queryTrack(track, car.x, car.y, car.trackIndex, q);
  car.trackIndex = q.index;
  car.trackLateral = q.lateral;
  car.trackDist = q.dist;

  let strongest = 0;
  for (const c of carCircles(car)) {
    queryTrack(track, c.x, c.y, car.trackIndex, q);
    const limit = q.hw - track.wallThickness * 0.5 - c.r;
    const over = Math.abs(q.lateral) - limit;
    if (over <= 0) continue;

    // Normale du mur, dirigée vers l'extérieur
    const s = Math.sign(q.lateral);
    const wx = q.nx * s;
    const wy = q.ny * s;
    car.x -= wx * over;
    car.y -= wy * over;

    // Vitesse du point de contact (translation + rotation)
    const pvx = car.vx - car.yawRate * c.oy;
    const pvy = car.vy + car.yawRate * c.ox;
    const vn = pvx * wx + pvy * wy;
    if (vn <= 0) continue;

    // Rebond sur la composante perpendiculaire au mur
    const j = (1 + RESTITUTION) * vn;
    car.vx -= wx * j;
    car.vy -= wy * j;

    // Frottement le long du mur : dépend de l'angle d'impact et de la robustesse
    const tx = -wy;
    const ty = wx;
    const vt = car.vx * tx + car.vy * ty;
    const impactRatio = Math.min(1, vn / (car.speed + 1));
    const keep = 1 - (1 - car.params.wallRetain) * impactRatio - 0.02;
    car.vx += tx * vt * (keep - 1);
    car.vy += ty * vt * (keep - 1);

    // Couple : un choc sur l'avant fait pivoter la voiture
    const torque = (c.ox * wy - c.oy * wx) * j;
    car.yawRate -= torque * 0.0006 / car.params.mass;

    if (vn > strongest) {
      strongest = vn;
      car.impactX = c.x + wx * c.r;
      car.impactY = c.y + wy * c.r;
    }
  }
  if (strongest > 0) {
    car.impact = Math.max(car.impact, strongest);
    if (strongest > 120) car.drifting = false;
  }
  return strongest;
}
