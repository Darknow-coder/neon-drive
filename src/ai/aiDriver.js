// Pilote IA.
//
// À chaque pas, le pilote observe (sa position, la trajectoire idéale, les
// autres voitures) puis décide sur quels « boutons » appuyer :
//   { steer, throttle, brake, boost }  ← exactement comme le joueur.
// Il n'a AUCUN accès direct à la vitesse ou à la position de sa voiture :
// c'est la même physique que pour le joueur qui fait le reste.
//
// Ce qui différencie les pilotes : leur profil (data/aiProfiles.js) et leur
// voiture. Les erreurs arrivent au hasard, à un rythme fixe, quelle que soit
// la position en course.

import { getRacingLine, computeSpeedProfile } from './racingLine.js';
import { obstacleOffsetAt } from '../track/buildTrack.js';
import { GLOBAL_TUNING } from '../physics/carPhysics.js';
import { clamp, damp, smoothstep, createIntentObject } from './aiUtils.js';

export function createAiDriver(car, track, { profile, pace = 1, mistakesMul = 1, lineMul = 1, driftMul = 1, rng = Math.random }) {
  const line = getRacingLine(track);
  const skill = {
    gripUse: Math.min(0.99, profile.gripUse * pace),
    brakeUse: Math.min(0.95, profile.brakeUse * pace),
    driftUse: profile.driftUse * driftMul,
    steerUse: Math.min(1, 0.6 + 0.4 * pace),
  };
  const prof = computeSpeedProfile(track, line, car.params, skill);
  const n = track.count;
  const intent = createIntentObject();

  // Petite imprécision de trajectoire propre à chaque pilote
  const noiseAmp = Math.min(90, (1 - profile.lineFocus) * 110 * lineMul);
  const noiseFreq = 0.15 + rng() * 0.2;
  const noisePhase = rng() * 100;

  const st = {
    bias: 0,             // décalage latéral actuel par rapport à la trajectoire idéale
    passLat: null,       // position latérale visée pour un dépassement
    passTimer: 0,
    mistake: null,
    mistakeTime: 0,
    nextMistake: nextMistakeDelay(),
    stuckTime: 0,
    recoverTime: 0,
    boostHold: false,
    time: 0,
  };

  function nextMistakeDelay() {
    const rate = Math.max(0.01, profile.mistakeRate * mistakesMul); // par minute
    return (-Math.log(1 - rng()) * 60) / rate;
  }

  function startMistake() {
    const r = rng();
    const type = r < 0.3 ? 'lateBrake' : r < 0.6 ? 'wide' : r < 0.8 ? 'lift' : 'noDrift';
    st.mistake = { type, dir: rng() < 0.5 ? -1 : 1 };
    st.mistakeTime = type === 'lift' ? 0.8 : type === 'wide' ? 1.6 : 1.4;
  }

  /** Différence de distance sur le tracé entre deux voitures (−L/2 … +L/2). */
  function trackGap(other) {
    let d = other.trackDist - car.trackDist;
    if (d > track.length / 2) d -= track.length;
    if (d < -track.length / 2) d += track.length;
    return d;
  }

  function update(dt, world) {
    st.time += dt;
    const g = GLOBAL_TUNING;
    const p = car.params;
    const i = car.trackIndex;
    const speed = car.speed;
    const vmax = p.maxSpeed;

    // ---------------- Erreurs de pilotage (aléatoires, à rythme fixe) ----------------
    if (world.started) {
      if (st.mistake) {
        st.mistakeTime -= dt;
        if (st.mistakeTime <= 0) { st.mistake = null; st.nextMistake = nextMistakeDelay(); }
      } else if ((st.nextMistake -= dt) <= 0) startMistake();
    }
    const mk = st.mistake ? st.mistake.type : null;

    // ---------------- Bloqué contre un mur ? Manœuvre de dégagement ----------------
    const tangentDot = Math.cos(car.angle) * track.tx[i] + Math.sin(car.angle) * track.ty[i];
    if (world.started && st.recoverTime <= 0) {
      const stuck = speed < 45 || tangentDot < -0.2;
      st.stuckTime = stuck ? st.stuckTime + dt : 0;
      if (st.stuckTime > 1.1) { st.recoverTime = 0.9; st.stuckTime = 0; }
      // Toujours bloqué : on replace la voiture (et on remet les compteurs à zéro,
      // sinon elle serait replacée en boucle puisqu'elle repart de l'arrêt)
      if (st.stuckTimeTotal > 6) { car.requestRespawn = true; st.stuckTimeTotal = 0; st.stuckTime = 0; }
    }
    st.stuckTimeTotal = speed < 45 && world.started ? (st.stuckTimeTotal || 0) + dt : 0;
    if (st.recoverTime > 0) {
      st.recoverTime -= dt;
      // Marche arrière en braquant pour se remettre dans l'axe
      const side = car.trackLateral > 0 ? 1 : -1;
      intent.steer = side;
      intent.throttle = 0;
      intent.brake = 1;
      intent.boost = false;
      return intent;
    }

    // ---------------- Trafic : suivre, dépasser, s'écarter ----------------
    let speedCap = Infinity;
    let sidePush = 0;
    const lookTraffic = 120 + speed * 0.45;
    const followDist = 34 + profile.caution * 70 + speed * (0.06 + profile.caution * 0.1);
    let blocker = null;
    let blockerGap = Infinity;
    for (const o of world.cars) {
      if (o === car) continue;
      const gap = trackGap(o);
      const dLat = o.trackLateral - car.trackLateral;
      // Voiture juste à côté : on garde ses distances (les prudents davantage)
      if (Math.abs(gap) < 55 && Math.abs(dLat) < 46) {
        sidePush -= Math.sign(dLat || 1) * (18 + profile.caution * 26);
      }
      if (gap > 0 && gap < lookTraffic && Math.abs(dLat) < 44 && gap < blockerGap) {
        blocker = o;
        blockerGap = gap;
      }
    }
    // Vitesse que le pilote pourrait atteindre (aspiration comprise)
    const wanted = prof.v[(i + Math.round((speed * profile.reaction) / track.spacing)) % n] +
      g.draftSpeedAdd * (car.draft || 0);
    if (blocker) {
      // Est-on retenu ? (on voudrait aller plus vite que la voiture devant)
      const heldUp = wanted - blocker.speed > 12 - profile.aggression * 10;
      // Voiture arrêtée ou presque (accident) : on la contourne, quoi qu'il arrive
      const obstacle = blocker.speed < 120;
      if (st.passLat === null && heldUp && (st.passCooldown <= 0 || obstacle)) {
        const hw = track.hw[i] - 40;
        const roomLeft = blocker.trackLateral + hw;
        const roomRight = hw - blocker.trackLateral;
        const need = 54 - profile.aggression * 8;
        // Les prudents ne tentent que s'il y a vraiment de la place
        const minRoom = need + 10 + profile.caution * 30;
        if (Math.max(roomLeft, roomRight) > minRoom || profile.aggression > 0.8 || obstacle) {
          const side = roomRight > roomLeft ? 1 : -1;
          st.passLat = clamp(blocker.trackLateral + side * need, -hw, hw);
          st.passCar = blocker;
          st.passTimer = 3.5;
        } else {
          st.passCooldown = 0.6; // pas la place : on réessaie un peu plus tard
        }
      }
      // Trop près et encore dans son axe : on adapte sa vitesse
      // (les agressifs collent davantage)
      if (blockerGap < followDist) {
        speedCap = blocker.speed + 15 - profile.caution * 30 * (1 - blockerGap / followDist);
        // En train de déboîter : il faut avancer pour pouvoir tourner
        if (st.passLat !== null) speedCap = Math.max(speedCap, 170);
      }
    }
    st.passCooldown = Math.max(0, (st.passCooldown || 0) - dt);
    // Le dépassement continue tant que la voiture dépassée est encore proche
    if (st.passLat !== null) {
      st.passTimer -= dt;
      const pg = st.passCar ? trackGap(st.passCar) : -999;
      if (st.passTimer <= 0 || pg < -45 || pg > lookTraffic * 1.2) {
        st.passLat = null;
        st.passCar = null;
      } else {
        // Suit le côté de la voiture dépassée si elle se décale
        const hw = track.hw[i] - 40;
        const side = Math.sign(st.passLat - st.passCar.trackLateral) || 1;
        st.passLat = clamp(st.passCar.trackLateral + side * 54, -hw, hw);
      }
    }

    // ---------------- Piliers mobiles : on prévoit où ils seront ----------------
    st.obsTimer = Math.max(0, (st.obsTimer || 0) - dt);
    if (st.obsTimer <= 0) st.obsLat = null;
    for (const ob of track.obstacles) {
      if (!ob.move) continue;
      let gap = (ob.index - i) * track.spacing;
      if (gap < -track.length / 2) gap += track.length;
      if (gap < -30 || gap > 160 + speed * 1.2) continue;
      const tArr = Math.max(0, gap) / Math.max(speed, 120);
      const pred = obstacleOffsetAt(ob, world.time + tArr);
      const myLat = st.obsLat ?? (line.off[ob.index] + st.bias);
      if (Math.abs(pred - myLat) < ob.r + 52) {
        const hw = track.hw[ob.index] - 40;
        // On passe du côté opposé à sa position prévue (s'il y a la place)
        const left = pred - ob.r - 50, right = pred + ob.r + 50;
        const canLeft = left > -hw, canRight = right < hw;
        st.obsLat = canLeft && (!canRight || pred > 0) ? left : right;
        st.obsLat = clamp(st.obsLat, -hw, hw);
        st.obsTimer = 0.5;
      }
    }

    // ---------------- Point visé sur la trajectoire ----------------
    const look = 60 + speed * (0.24 + (1 - profile.lineFocus) * 0.1);
    const j = (i + Math.max(2, Math.round(look / track.spacing))) % n;
    let biasTarget = st.obsLat !== null && st.obsLat !== undefined
      ? st.obsLat - line.off[j]
      : st.passLat !== null ? st.passLat - line.off[j] : 0;
    biasTarget += sidePush;
    biasTarget += Math.sin(st.time * noiseFreq * 6.283 + noisePhase) * noiseAmp;
    if (mk === 'wide') biasTarget += -Math.sign(line.curv[j] || st.mistake.dir) * 95;
    // En drift, le nez pointe vers l'intérieur : on prend la corde moins serrée
    // pour ne pas toucher le mur intérieur avec l'avant.
    const driftNear = car.drifting || prof.drift[j] === 1 || prof.drift[i] === 1;
    if (driftNear) biasTarget += -Math.sign(line.curv[j]) * 32;
    st.bias += (biasTarget - st.bias) * damp(st.obsLat != null ? 4 : 2.2, dt);
    const latOff = clamp(line.off[j] + st.bias, line.lo[j], line.hi[j]);
    const tx = track.x[j] + track.nx[j] * latOff;
    const ty = track.y[j] + track.ny[j] * latOff;

    // ---------------- Direction (poursuite du point visé) ----------------
    // En drift, on raisonne dans l'axe de la VITESSE (la carrosserie est en travers).
    let fx, fy;
    if (car.drifting && speed > 1) { fx = car.vx / speed; fy = car.vy / speed; }
    else { fx = Math.cos(car.angle); fy = Math.sin(car.angle); }
    const dx = tx - car.x;
    const dy = ty - car.y;
    const lx = dx * fx + dy * fy;
    const ly = -dx * fy + dy * fx;
    const kappa = (2 * ly) / (lx * lx + ly * ly || 1);
    const yawWanted = kappa * Math.max(speed, 60);

    let steer;
    let wantBrake = 0;
    const aheadIdx = (k) => (i + k) % n;
    const driftAhead = mk !== 'noDrift' && world.started &&
      prof.drift[aheadIdx(Math.round((speed * 0.08) / track.spacing) + 1)] === 1;

    if (car.drifting) {
      // Choisir l'angle de drift qui donne exactement la courbe voulue
      const gm = car.lastGripMul ?? 1;
      const authD = 1 - g.highSpeedUndersteer * g.driftUndersteer * clamp(speed / g.understeerRefSpeed, 0, 1.3);
      const T = Math.min(p.turnRate * p.driftTurnBoost * authD * (0.5 + 0.5 * gm),
        (p.gripAccel * gm * g.driftGripShare) / Math.max(speed, 1));
      const k = ((yawWanted * car.driftDir) / T - g.driftTurnMin) / (1 - g.driftTurnMin);
      let dirSteer = clamp(2 * k - 1, -1, 1);
      const keep = prof.drift[i] === 1;
      if (keep) dirSteer = Math.max(dirSteer, 0.2); // reste en drift tant que le virage dure
      else dirSteer = Math.min(dirSteer, 0); // virage fini : on se redresse
      steer = dirSteer * car.driftDir;
    } else {
      const ratio = Math.abs(car.vF) / vmax;
      const auth = smoothstep(0, 0.16, ratio) * (1 - g.highSpeedUndersteer * clamp(Math.abs(car.vF) / g.understeerRefSpeed, 0, 1.3));
      steer = clamp(yawWanted / (p.turnRate * Math.max(auth, 0.12)), -1, 1);
      // Déclenchement d'un drift en entrée de virage serré
      if (driftAhead && speed > g.driftEntrySpeed * vmax * 1.05 && Math.abs(line.curv[j]) > 1 / 900) {
        steer = Math.sign(line.curv[j]);
        wantBrake = 1;
      }
    }

    // ---------------- Vitesse ----------------
    const react = Math.round((speed * profile.reaction) / track.spacing);
    let vt = prof.v[aheadIdx(react)];
    if (mk === 'lateBrake') vt *= 1.18;
    vt = Math.min(vt, speedCap);
    if (!world.started) vt = 0;

    let throttle = 0;
    let brake = wantBrake;
    const err = vt - speed;
    if (car.drifting) {
      throttle = err > -30 ? 1 : 0;
    } else if (err > 0) {
      throttle = clamp(err / 30, 0.35, 1);
    } else if (err < -18) {
      brake = Math.max(brake, clamp(-err / 70, 0.2, 1));
      // Freiner fort en braquant déclencherait un drift involontaire
      if (!wantBrake && Math.abs(steer) > 0.35) brake = Math.min(brake, 0.45);
    }
    if (mk === 'lift') { throttle = 0; }

    // ---------------- Boost ----------------
    let boost = false;
    if (world.started && car.boost > 0.25 && !car.drifting) {
      const far = aheadIdx(Math.round((speed * 1.2) / track.spacing));
      const straightAhead = prof.v[far] >= vmax * (profile.boostStraight ? 0.97 : 0.88) &&
        prof.v[aheadIdx(react)] >= vmax * 0.9;
      if (straightAhead && Math.abs(steer) < 0.45 && speedCap === Infinity) st.boostHold = true;
    }
    if (st.boostHold) {
      if (car.boost <= 0.02 || prof.v[aheadIdx(Math.round((speed * 0.8) / track.spacing))] < speed * 0.92) st.boostHold = false;
      boost = st.boostHold;
    }

    intent.steer = steer;
    intent.throttle = throttle;
    intent.brake = brake;
    intent.boost = boost;
    return intent;
  }

  return { update, profile, speedProfile: prof, line, state: st };
}
