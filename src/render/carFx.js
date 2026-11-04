// Effets visuels produits par une voiture : traces de pneus, fumée de drift,
// flammes du boost, étincelles lors des chocs. Appelé à chaque pas physique.

import { P_SMOKE, P_SPARK, P_FLAME } from './particles.js';
import { TRAILS, SMOKES } from '../data/shop.js';

// Arc-en-ciel : 24 teintes fixes (les particules gardent une image par couleur)
const RAINBOW = Array.from({ length: 24 }, (_, i) => {
  const h = i / 24, f = (n) => { const k = (n + h * 12) % 12; return Math.round(255 * (0.5 + 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
});
const TRAIL_BY_ID = Object.fromEntries(TRAILS.map((t) => [t.id, t]));
const SMOKE_BY_ID = Object.fromEntries(SMOKES.map((t) => [t.id, t]));

/** Couleur d'une particule d'effet (gère « glow », « body », « accent » et l'arc-en-ciel). */
export function effectColor(effect, colors, phase) {
  if (effect.rainbow) return RAINBOW[Math.floor(phase * 24) % 24];
  const c = effect.colors[Math.floor(Math.random() * effect.colors.length)];
  return c === 'glow' ? colors.glow : c === 'body' ? colors.body : c === 'accent' ? colors.accent : c;
}
export const trailOf = (colors) => TRAIL_BY_ID[colors?.trail] ?? TRAILS[0];
export const smokeOf = (colors) => SMOKE_BY_ID[colors?.smoke] ?? SMOKES[0];

export function createCarFx() {
  return { skidTimer: 0, lastWheels: null, smokeAcc: 0, flameAcc: 0 };
}

function rearWheels(car) {
  const fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const bx = car.x - fx * car.length * 0.3;
  const by = car.y - fy * car.length * 0.3;
  const w = car.width * 0.42;
  return [bx - fy * w, by + fx * w, bx + fy * w, by - fx * w];
}

export function updateCarFx(fx, car, dt, particles, trackRenderer, impactThisStep) {
  const colors = car.livery ?? car.def.colors;
  const glow = colors.glow;
  fx.phase = ((fx.phase || 0) + dt * 0.6) % 1; // défilement de l'arc-en-ciel
  const sliding = car.drifting || Math.abs(car.vR) > 140 || (car.braking && car.speed > 260);
  const wheels = rearWheels(car);

  // Traces de pneus (aucune pour une voiture en lévitation)
  fx.skidTimer += dt;
  if (sliding && car.speed > 80 && car.trait !== 'hover') {
    if (fx.lastWheels && fx.skidTimer > 1 / 30) {
      const a = Math.min(1, 0.35 + Math.abs(car.vR) / 400);
      const lw = fx.lastWheels;
      trackRenderer.addSkid(lw[0], lw[1], wheels[0], wheels[1], a);
      trackRenderer.addSkid(lw[2], lw[3], wheels[2], wheels[3], a);
      fx.lastWheels = wheels;
      fx.skidTimer = 0;
    } else if (!fx.lastWheels) {
      fx.lastWheels = wheels;
      fx.skidTimer = 0;
    }
  } else {
    fx.lastWheels = null;
  }

  // Fumée de drift (teintée de la couleur de la voiture)
  if (car.drifting && car.speed > 150) {
    fx.smokeAcc += dt * (30 + Math.abs(car.vR) * 0.08);
    while (fx.smokeAcc >= 1) {
      fx.smokeAcc -= 1;
      const k = Math.random() < 0.5 ? 0 : 2;
      const sm = smokeOf(colors);
      const col = effectColor(sm, colors, fx.phase + Math.random() * 0.08);
      if (sm.sparks && Math.random() < 0.35) {
        particles.spawn(P_SPARK, wheels[k], wheels[k + 1],
          car.vx * 0.2 + (Math.random() - 0.5) * 160, car.vy * 0.2 + (Math.random() - 0.5) * 160,
          0.2 + Math.random() * 0.25, 1.2 + Math.random(), 0, sm.sparks);
      }
      particles.spawn(P_SMOKE,
        wheels[k] + (Math.random() - 0.5) * 6, wheels[k + 1] + (Math.random() - 0.5) * 6,
        car.vx * 0.15 + (Math.random() - 0.5) * 50, car.vy * 0.15 + (Math.random() - 0.5) * 50,
        0.6 + Math.random() * 0.5, 9, 26, col);
    }
  }

  // Pluie : gerbes d'eau derrière les voitures rapides
  // (pluie / orage : eau ; neige : poudreuse ; sable : poussière)
  const wx = trackRenderer.weather;
  const spray = wx === 'rain' || wx === 'storm' ? '#a9b8ff' : wx === 'snow' ? '#eef4ff' : wx === 'sand' ? '#e0a070' : null;
  if (spray && car.speed > (wx === 'snow' ? 140 : 220)) {
    fx.sprayAcc = (fx.sprayAcc || 0) + dt * (car.speed / (wx === 'sand' ? 40 : 22));
    while (fx.sprayAcc >= 1) {
      fx.sprayAcc -= 1;
      const k = Math.random() < 0.5 ? 0 : 2;
      particles.spawn(P_SMOKE, wheels[k], wheels[k + 1],
        car.vx * 0.25 + (Math.random() - 0.5) * 80, car.vy * 0.25 + (Math.random() - 0.5) * 80,
        0.35 + Math.random() * 0.25, wx === 'snow' ? 7 : 6, 30, spray);
    }
  }

  // Flammes du boost
  if (car.boosting) {
    const fxv = Math.cos(car.angle), fyv = Math.sin(car.angle);
    fx.flameAcc += dt * 90;
    while (fx.flameAcc >= 1) {
      fx.flameAcc -= 1;
      const bx = car.x - fxv * car.length * 0.55;
      const by = car.y - fyv * car.length * 0.55;
      const sp = 180 + Math.random() * 160;
      const tr = trailOf(colors);
      const col = effectColor(tr, colors, fx.phase);
      const size = tr.size ?? 1;
      particles.spawn(P_FLAME,
        bx + (Math.random() - 0.5) * 8, by + (Math.random() - 0.5) * 8,
        car.vx - fxv * sp, car.vy - fyv * sp,
        0.18 + Math.random() * 0.12, (9 + Math.random() * 5) * size, -10, col);
      if (tr.sparks && Math.random() < 0.3) {
        const a = car.angle + Math.PI + (Math.random() - 0.5) * 1.4;
        const ss = 120 + Math.random() * 200;
        particles.spawn(P_SPARK, bx, by, car.vx * 0.6 + Math.cos(a) * ss, car.vy * 0.6 + Math.sin(a) * ss,
          0.15 + Math.random() * 0.2, 1.2 + Math.random() * 1.2, 0, tr.sparks);
      }
    }
  }

  // Patinage au départ (ou moteur qui hurle sur la grille) : fumée des roues arrière
  if (car.spinTimer > 0 || (car.rev || 0) > 0.6) {
    fx.spinAcc = (fx.spinAcc || 0) + dt * (car.spinTimer > 0 ? 70 : 18);
    while (fx.spinAcc >= 1) {
      fx.spinAcc -= 1;
      const k = Math.random() < 0.5 ? 0 : 2;
      particles.spawn(P_SMOKE, wheels[k] + (Math.random() - 0.5) * 6, wheels[k + 1] + (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.5 + Math.random() * 0.5, 8, 30, '#d8d0ff');
    }
  }

  // Frottement contre le mur : gerbe d'étincelles continue
  if (car.wallTouch && car.speed > 150 && impactThisStep <= 90) {
    fx.scrapeAcc = (fx.scrapeAcc || 0) + dt * Math.min(60, car.speed / 12);
    while (fx.scrapeAcc >= 1) {
      fx.scrapeAcc -= 1;
      particles.spawn(P_SPARK, car.impactX, car.impactY,
        -car.vx * (0.1 + Math.random() * 0.25) + (Math.random() - 0.5) * 120, -car.vy * (0.1 + Math.random() * 0.25) + (Math.random() - 0.5) * 120,
        0.15 + Math.random() * 0.2, 1.2 + Math.random(), 0, Math.random() < 0.6 ? '#fff6c2' : '#ffb000');
    }
  }

  // Étincelles lors d'un choc
  if (impactThisStep > 90) {
    const n = Math.min(26, 4 + Math.floor(impactThisStep / 25));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 150 + Math.random() * impactThisStep * 1.2;
      particles.spawn(P_SPARK, car.impactX, car.impactY,
        Math.cos(a) * sp + car.vx * 0.4, Math.sin(a) * sp + car.vy * 0.4,
        0.25 + Math.random() * 0.3, 1.5 + Math.random() * 1.5, 0,
        Math.random() < 0.5 ? '#fff6c2' : '#7af7ff');
    }
  }
}
