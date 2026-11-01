// Collisions voiture ↔ murs du circuit.
// La voiture est approchée par deux cercles (avant / arrière) : assez précis
// pour qu'un choc de l'avant fasse pivoter la voiture de manière crédible,
// et très rapide à calculer.
// (Les collisions voiture ↔ voiture arriveront à l'étape 3, avec les IA.)

import { queryTrack } from '../track/buildTrack.js';

const q = {};
const RESTITUTION = 0.25; // rebond sur les murs (0 = colle, 1 = super-balle)

// Objets réutilisés : aucune création d'objet à chaque pas physique
// (évite les micro-saccades du ramasse-miettes sur mobile).
const circles = [{ x: 0, y: 0, ox: 0, oy: 0, r: 0 }, { x: 0, y: 0, ox: 0, oy: 0, r: 0 }];

export function carCircles(car) {
  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  const off = car.length * 0.27;
  const r = car.width * 0.5 + 1;
  for (let k = 0; k < 2; k++) {
    const s = k === 0 ? 1 : -1;
    const c = circles[k];
    c.ox = fx * off * s;
    c.oy = fy * off * s;
    c.x = car.x + c.ox;
    c.y = car.y + c.oy;
    c.r = r;
  }
  return circles;
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

    const speedBefore = Math.hypot(car.vx, car.vy);

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

    // Arcade : une partie de la vitesse « écrasée » contre le mur est redirigée
    // le long du mur, dans le sens de la course. Un choc reste pénalisant,
    // mais on repart beaucoup plus vite (même règle pour toutes les voitures).
    const vtAfter = car.vx * tx + car.vy * ty;
    const raceDir = Math.sign(track.tx[q.seg] * tx + track.ty[q.seg] * ty) || 1;
    const dirT = Math.abs(vtAfter) > 40 ? Math.sign(vtAfter) : raceDir;
    const add = vn * car.params.wallDeflect * dirT;
    car.vx += tx * add;
    car.vy += ty * add;
    const sp = Math.hypot(car.vx, car.vy);
    const cap = speedBefore * 0.92;
    if (sp > cap && sp > 0) { car.vx *= cap / sp; car.vy *= cap / sp; }
    // La carrosserie s'aligne un peu sur le mur (évite de rester bloqué de travers)
    if (sp > 60 && impactRatio > 0.35) {
      const va = Math.atan2(car.vy, car.vx);
      let da = va - car.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      if (Math.abs(da) < Math.PI / 2) car.yawRate += da * 1.6 * impactRatio;
    }

    // Couple : un choc sur l'avant fait pivoter la voiture
    const torque = (c.ox * wy - c.oy * wx) * j;
    car.yawRate -= torque * 0.0006 / car.params.mass;

    if (vn > strongest) {
      strongest = vn;
      car.impactX = c.x + wx * c.r;
      car.impactY = c.y + wy * c.r;
    }
  }
  // Contact avec le mur (frottement : étincelles et son)
  car.wallTouch = strongest > 0 ? 1 : 0;
  if (strongest > 0) {
    car.impact = Math.max(car.impact, strongest);
    if (strongest > 120) car.drifting = false;
  }
  return strongest;
}

/** Collisions avec les obstacles du circuit (piliers). */
export function collideCarWithObstacles(car, track) {
  let strongest = 0;
  const near = 60; // on ne teste que les obstacles proches sur le tracé
  for (const ob of track.obstacles) {
    let d = Math.abs(ob.index - car.trackIndex);
    d = Math.min(d, track.count - d);
    if (d > near) continue;
    for (const c of carCircles(car)) {
      const dx = c.x - ob.x;
      const dy = c.y - ob.y;
      const dist = Math.hypot(dx, dy);
      const min = ob.r + c.r;
      if (dist >= min || dist < 1e-6) continue;
      // Normale dirigée de la voiture vers le pilier
      const wx = -dx / dist;
      const wy = -dy / dist;
      const over = min - dist;
      car.x -= wx * over;
      car.y -= wy * over;
      const pvx = car.vx - car.yawRate * c.oy;
      const pvy = car.vy + car.yawRate * c.ox;
      const vn = pvx * wx + pvy * wy;
      if (vn <= 0) continue;
      const j = (1 + RESTITUTION) * vn;
      car.vx -= wx * j;
      car.vy -= wy * j;
      const torque = (c.ox * wy - c.oy * wx) * j;
      car.yawRate -= torque * 0.0006 / car.params.mass;
      // Un pilier ralentit un peu plus qu'un mur (choc frontal fréquent)
      const keep = car.params.wallRetain;
      car.vx *= 0.5 + keep * 0.5;
      car.vy *= 0.5 + keep * 0.5;
      if (vn > strongest) {
        strongest = vn;
        car.impactX = c.x + wx * c.r;
        car.impactY = c.y + wy * c.r;
      }
    }
  }
  // Contact avec le mur (frottement : étincelles et son)
  car.wallTouch = strongest > 0 ? 1 : 0;
  if (strongest > 0) {
    car.impact = Math.max(car.impact, strongest);
    if (strongest > 120) car.drifting = false;
  }
  return strongest;
}
