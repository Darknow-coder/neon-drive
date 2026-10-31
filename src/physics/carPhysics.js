// Physique de conduite arcade.
//
// Principe : la voiture a une ORIENTATION (où pointe son nez) et une VITESSE
// (où elle va réellement). Les deux ne sont pas forcément alignées.
//
// GRIP (conduite normale)
//   L'adhérence ramène la vitesse dans l'axe de la voiture, avec une force
//   limitée comme de vrais pneus. La rotation a de l'inertie : la voiture ne
//   pivote jamais d'un coup.
//
// DRIFT (frein + direction à vitesse élevée)
//   La voiture se met en travers. Le joueur garde le contrôle :
//   - tourner VERS l'intérieur du virage : la voiture se met plus en travers
//     et serre la trajectoire ;
//   - relâcher ou contre-braquer : elle se redresse, élargit, puis sort du drift.
//   L'angle de glisse reste borné : pas de tête-à-queue incontrôlable.
//   Le drift remplit la jauge de boost.

import { clamp, damp, smoothstep, lerp, wrapAngle } from '../core/math.js';

/** Réglages communs à toutes les voitures (modifiables via le panneau ⚙). */
export const GLOBAL_TUNING = {
  highSpeedUndersteer: 0.3, // perte de braquage à haute vitesse (0 = aucune)
  understeerRefSpeed: 740,  // vitesse de référence, identique pour toutes les voitures
  reverseMax: 230,
  reverseAccel: 420,
  rollDrag: 40,             // résistance au roulement
  airDrag: 0.11,            // résistance proportionnelle à la vitesse
  driftEntrySpeed: 0.33,    // fraction de la vitesse max pour déclencher un drift
  driftAngleMin: 0.14,      // angle de travers (rad) en contre-braquage (~8°)
  driftAngleMax: 0.66,      // angle de travers en braquant à fond (~38°)
  driftTurnMin: 0.35,       // rotation de la trajectoire en contre-braquage (fraction)
  driftAngleResponse: 9,    // vitesse à laquelle la voiture prend son angle
  driftReleaseTime: 0.2,    // durée sans braquer avant la sortie du drift
  driftGripShare: 0.95,     // en drift, force de virage max = cette part de l'adhérence
  driftUndersteer: 0.75,    // part de la perte de braquage à haute vitesse conservée en drift
  slideEntryAngle: 0.42,    // glisse involontaire au-delà de cet angle
  boostSpeedAdd: 220,       // vitesse ajoutée par le boost (identique pour toutes les voitures)
  boostAccel: 650,
  boostDrain: 0.38,         // par seconde (≈ 2,6 s pour vider la jauge)
  boostGainBase: 0.32,      // gain de jauge par seconde de drift appuyé
  padDuration: 0.9,         // durée de la poussée d'une plaque de boost (s)
  draftSpeedAdd: 40,        // aspiration : vitesse max en plus juste derrière une voiture
  draftDragCut: 0.5,        // aspiration : part de la résistance de l'air supprimée
};

/** Convertit les notes du garage (1-10) en paramètres physiques. */
export function statsToParams(stats) {
  const s = stats;
  return {
    maxSpeed: 670 + s.speed * 11,
    accel: 250 + s.accel * 42,
    turnRate: 1.55 + s.handling * 0.19,
    steerResponse: 7 + s.handling * 0.6,
    gripAccel: 1150 + s.handling * 170,
    brake: 760 + s.handling * 35,            // freinage (unités/s²)
    driftTurnBoost: 1.04 + s.drift * 0.02,   // capacité à serrer en drift
    driftDrag: 400 - s.drift * 28,           // perte de vitesse en drift
    boostGain: 0.8 + s.drift * 0.06,
    mass: 0.8 + s.toughness * 0.06,
    wallRetain: 0.55 + s.toughness * 0.03,
    wallDeflect: 0.3 + s.toughness * 0.035,  // vitesse redirigée le long du mur lors d'un choc
  };
}

export function createCar(def, { x = 0, y = 0, angle = 0 } = {}) {
  return {
    def,
    params: statsToParams(def.stats),
    length: 46,
    width: 24,
    x, y, angle,
    vx: 0, vy: 0,
    yawRate: 0,
    prevX: x, prevY: y, prevAngle: angle,
    vF: 0, vR: 0, speed: 0,
    slip: 0,
    drifting: false,
    driftDir: 0,       // +1 drift vers la droite, -1 vers la gauche
    driftBlend: 0,     // 0 → 1 (transition visuelle et d'adhérence)
    driftTime: 0,
    releaseTime: 0,
    boost: 0,
    boosting: false,
    padTimer: 0,       // poussée restante d'une plaque de boost
    braking: false,
    throttle: 0,
    steer: 0,
    impact: 0,         // force du dernier choc (pour étincelles / vibrations)
    impactX: 0, impactY: 0,
    trackIndex: 0,     // repère sur le tracé (géré par collisions.js)
    trackDist: 0,
    trackLateral: 0,
  };
}

export function resetCarMotion(car) {
  car.vx = car.vy = car.yawRate = 0;
  car.padTimer = 0;
  car.vF = car.vR = car.speed = car.slip = 0;
  car.drifting = false;
  car.driftBlend = 0;
  car.boosting = false;
  car.prevX = car.x;
  car.prevY = car.y;
  car.prevAngle = car.angle;
}

export function endDrift(car) {
  car.drifting = false;
}

/**
 * Fait avancer une voiture d'un pas de temps.
 * @param car     état de la voiture
 * @param input   intention { steer, throttle, brake, boost }
 * @param dt      durée du pas (s)
 * @param surface modificateurs du sol { speedMul, gripMul } (zones spéciales)
 */
export function stepCar(car, input, dt, surface = NO_SURFACE) {
  const p = car.params;
  const g = GLOBAL_TUNING;

  car.prevX = car.x;
  car.prevY = car.y;
  car.prevAngle = car.angle;

  const steer = clamp(input.steer, -1, 1);
  const throttle = clamp(input.throttle, 0, 1);
  const brake = clamp(input.brake, 0, 1);
  car.lastGripMul = surface.gripMul;

  const fx = Math.cos(car.angle);
  const fy = Math.sin(car.angle);
  // Vitesse décomposée : vers l'avant (vF) et sur le côté (vR, vers la droite)
  let vF = car.vx * fx + car.vy * fy;
  let vR = -car.vx * fy + car.vy * fx;
  const speedRatio = Math.abs(vF) / p.maxSpeed;
  const slipAngle = vF > 30 ? Math.atan2(Math.abs(vR), vF) : 0;

  // ---------- Boost (jauge du joueur ou plaque au sol) ----------
  if (surface.pad) car.padTimer = g.padDuration;
  else if (car.padTimer > 0) car.padTimer = Math.max(0, car.padTimer - dt);
  const gaugeBoost = !!input.boost && car.boost > 0.01 && vF > -10;
  if (gaugeBoost) car.boost = Math.max(0, car.boost - g.boostDrain * dt);
  car.boosting = gaugeBoost || car.padTimer > 0;
  const draft = car.draft || 0; // 0 … 1 (aspiration derrière une autre voiture)
  const vmax = (p.maxSpeed + (car.boosting ? g.boostSpeedAdd : 0) + g.draftSpeedAdd * draft) * surface.speedMul;

  // ---------- Drift : entrée ----------
  if (!car.drifting) {
    const handbrake = brake > 0.5 && Math.abs(steer) > 0.35 && vF > g.driftEntrySpeed * p.maxSpeed;
    const slide = slipAngle > g.slideEntryAngle && vF > 0.3 * p.maxSpeed;
    if (handbrake || slide) {
      car.drifting = true;
      // Sens du virage : celui de la direction (frein) ou celui de la glisse
      car.driftDir = handbrake ? Math.sign(steer) : -Math.sign(vR);
      car.driftTime = 0;
      car.releaseTime = 0;
    }
  }

  car.braking = false;

  if (car.drifting) {
    // ================= MODE DRIFT =================
    const speed = Math.hypot(car.vx, car.vy);
    const dirSteer = steer * car.driftDir; // +1 = vers l'intérieur, -1 = contre-braquage
    const k = (dirSteer + 1) / 2;          // 0 … 1

    // 1) La trajectoire tourne, plus ou moins selon la direction
    const authority = 1 - g.highSpeedUndersteer * g.driftUndersteer * clamp(speed / g.understeerRefSpeed, 0, 1.3);
    let turnV = p.turnRate * p.driftTurnBoost * lerp(g.driftTurnMin, 1, k) * authority *
      (0.5 + 0.5 * surface.gripMul); // sur sol glissant, le drift s'élargit
    // Les pneus en glisse ne peuvent pas fournir plus que leur adhérence :
    // un drift ne permet pas de tourner plus fort que ce que la voiture tient.
    const latMax = (p.gripAccel * surface.gripMul * g.driftGripShare) / Math.max(speed, 1);
    turnV = car.driftDir * Math.min(turnV, latMax);
    const rot = turnV * dt;
    const c = Math.cos(rot), s = Math.sin(rot);
    const nvx = car.vx * c - car.vy * s;
    const nvy = car.vx * s + car.vy * c;

    // 2) La carrosserie se met en travers d'un angle choisi par le joueur
    const velAngle = Math.atan2(nvy, nvx);
    const slipTarget = car.driftDir * lerp(g.driftAngleMin, g.driftAngleMax, k);
    const err = wrapAngle(velAngle + slipTarget - car.angle);
    const targetYaw = turnV + err * g.driftAngleResponse;
    car.yawRate += (targetYaw - car.yawRate) * damp(p.steerResponse * 1.4, dt);
    car.angle += car.yawRate * dt;

    // 3) Vitesse : le moteur pousse, la glisse freine (selon la note de drift)
    const slipNow = Math.abs(wrapAngle(car.angle - velAngle));
    let a = 0;
    if (throttle > 0 && speed < vmax) a += p.accel * throttle * Math.cos(slipNow) * clamp((vmax - speed) / (vmax * 0.38), 0, 1);
    if (car.boosting) a += g.boostAccel * clamp((vmax - speed) / (vmax * 0.2), 0, 1);
    a -= p.driftDrag * Math.sin(slipNow) + speed * g.airDrag * 0.5;
    if (brake > 0) a -= 160 * brake;
    if (speed > vmax) a -= (speed - vmax) * 2.2;
    const newSpeed = Math.max(0, speed + a * dt);
    const sc = speed > 1e-3 ? newSpeed / speed : 0;
    car.vx = nvx * sc;
    car.vy = nvy * sc;

    // 4) Jauge de boost
    if (!gaugeBoost && speed > 0.3 * p.maxSpeed) {
      const intensity = clamp(slipNow / 0.45, 0, 1);
      car.boost = Math.min(1, car.boost + g.boostGainBase * p.boostGain * intensity * dt);
    }

    // 5) Sortie du drift
    car.driftTime += dt;
    car.releaseTime = dirSteer < 0.15 ? car.releaseTime + dt : 0;
    if ((car.releaseTime > g.driftReleaseTime && car.driftTime > 0.3) || speed < 0.25 * p.maxSpeed) {
      car.drifting = false;
    }
  } else {
    // ================= MODE GRIP =================
    // Rotation avec inertie ; à l'arrêt on ne tourne pas.
    const steerAuthority =
      smoothstep(0, 0.16, speedRatio) *
      (1 - g.highSpeedUndersteer * clamp(Math.abs(vF) / g.understeerRefSpeed, 0, 1.3));
    const dir = vF >= -5 ? 1 : -1; // en marche arrière, la direction s'inverse
    const targetYaw = steer * p.turnRate * steerAuthority * dir;
    car.yawRate += (targetYaw - car.yawRate) * damp(p.steerResponse, dt);
    car.angle += car.yawRate * dt;

    let aF = 0;
    if (throttle > 0 && vF < vmax) {
      // Forte poussée au départ, qui s'atténue à l'approche de la vitesse max.
      aF += p.accel * throttle * clamp((vmax - vF) / (vmax * 0.38), 0, 1);
    }
    if (car.boosting) aF += g.boostAccel * clamp((vmax - vF) / (vmax * 0.2), 0, 1);
    if (brake > 0) {
      if (vF > 15) {
        aF -= p.brake * brake;
        car.braking = true;
      } else if (throttle === 0 && vF > -g.reverseMax) {
        aF -= g.reverseAccel * brake; // marche arrière
      }
    }
    aF -= vF * g.airDrag * (1 - g.draftDragCut * draft) + Math.sign(vF) * g.rollDrag * (throttle > 0 ? 0.3 : 1);
    if (vF > vmax) aF -= (vF - vmax) * 2.2; // après un boost, retour progressif
    const newVF = vF + aF * dt;
    // Évite d'osciller autour de zéro à cause des résistances
    vF = Math.sign(vF) !== Math.sign(newVF) && throttle === 0 && Math.abs(vF) < 20 ? 0 : newVF;

    // Adhérence latérale (force limitée, comme de vrais pneus).
    // Juste après un drift, l'adhérence revient progressivement.
    const gripMax = p.gripAccel * surface.gripMul * (1 - 0.55 * car.driftBlend);
    vR -= Math.sign(vR) * Math.min(Math.abs(vR), gripMax * dt);

    // On recompose avec l'orientation d'AVANT la rotation : la vitesse ne suit
    // pas instantanément le nez de la voiture.
    car.vx = fx * vF - fy * vR;
    car.vy = fy * vF + fx * vR;
  }

  car.driftBlend += ((car.drifting ? 1 : 0) - car.driftBlend) * damp(car.drifting ? 14 : 6, dt);

  car.x += car.vx * dt;
  car.y += car.vy * dt;

  // Valeurs utiles pour l'affichage, les effets et l'IA
  const nfx = Math.cos(car.angle), nfy = Math.sin(car.angle);
  car.vF = car.vx * nfx + car.vy * nfy;
  car.vR = -car.vx * nfy + car.vy * nfx;
  car.speed = Math.hypot(car.vx, car.vy);
  car.slip = car.vF > 30 ? Math.atan2(Math.abs(car.vR), car.vF) : 0;
  car.throttle = throttle;
  car.steer = steer;
  car.impact *= 0.8;
}

export const NO_SURFACE = Object.freeze({ speedMul: 1, gripMul: 1 });
