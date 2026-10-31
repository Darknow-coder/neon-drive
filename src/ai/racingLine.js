// Trajectoire de course et profil de vitesse.
//
// 1) TRAJECTOIRE : on part du centre de la piste et on « tend » la ligne
//    comme un élastique : chaque point est attiré vers le milieu de ses
//    voisins, sans jamais sortir de la piste ni toucher un pilier. Le
//    résultat est une trajectoire qui coupe les virages (corde) et ouvre en
//    entrée/sortie, comme un vrai pilote.
//
// 2) VITESSE : pour une voiture donnée, on calcule en chaque point la vitesse
//    maximale permise par SES capacités (adhérence, braquage), puis on remonte
//    le circuit à l'envers pour savoir où freiner. Chaque voiture a donc son
//    propre profil : rien n'est inventé, tout découle de la physique.

import { GLOBAL_TUNING } from '../physics/carPhysics.js';

const LINE_MARGIN = 36; // distance minimale entre le centre de la voiture et le mur
const cache = new WeakMap();

export function getRacingLine(track) {
  let line = cache.get(track);
  if (!line) {
    line = computeRacingLine(track);
    cache.set(track, line);
  }
  return line;
}

function computeRacingLine(track) {
  const n = track.count;
  const lo = new Float32Array(n);
  const hi = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    lo[i] = -track.hw[i] + LINE_MARGIN;
    hi[i] = track.hw[i] - LINE_MARGIN;
  }

  // Relaxation multi-échelles (rapide et stable)
  const off = new Float32Array(n);
  const px = new Float32Array(n);
  const py = new Float32Array(n);
  const update = () => {
    for (let i = 0; i < n; i++) {
      px[i] = track.x[i] + track.nx[i] * off[i];
      py[i] = track.y[i] + track.ny[i] * off[i];
    }
  };
  const relax = (scales) => {
    for (const step of scales) {
      const iters = step >= 8 ? 120 : 220;
      for (let it = 0; it < iters; it++) {
        update();
        for (let i = 0; i < n; i++) {
          const a = (i - step + n) % n;
          const b = (i + step) % n;
          const mx = (px[a] + px[b]) / 2;
          const my = (py[a] + py[b]) / 2;
          const target = (mx - track.x[i]) * track.nx[i] + (my - track.y[i]) * track.ny[i];
          let o = off[i] + (target - off[i]) * 0.55;
          if (o < lo[i]) o = lo[i];
          else if (o > hi[i]) o = hi[i];
          off[i] = o;
        }
      }
    }
  };

  // 1) Trajectoire sans les piliers
  relax([16, 8, 4, 2, 1]);

  // 2) Piliers : on les contourne du côté où l'on passe déjà naturellement
  //    (s'il y a la place), avec une approche progressive.
  const SLOPE = 0.3; // écart latéral toléré par unité de distance (~17°)
  for (const ob of track.obstacles) {
    const obOff = (ob.x - track.x[ob.index]) * track.nx[ob.index] + (ob.y - track.y[ob.index]) * track.ny[ob.index];
    const clear = ob.r + 44;
    const hwHere = track.hw[ob.index] - LINE_MARGIN;
    const roomLeft = obOff - clear + hwHere;   // place à gauche du pilier
    const roomRight = hwHere - (obOff + clear); // place à droite
    let passLeft = off[ob.index] < obOff;
    if (passLeft && roomLeft < 0) passLeft = false;
    if (!passLeft && roomRight < 0) passLeft = true;
    const span = Math.ceil((clear * 2 + 2 * hwHere) / SLOPE / track.spacing);
    const flat = Math.ceil((ob.r + 30) / track.spacing);
    for (let k = -span; k <= span; k++) {
      const i = (ob.index + k + n) % n;
      const dist = Math.max(0, Math.abs(k) - flat) * track.spacing;
      if (passLeft) hi[i] = Math.min(hi[i], obOff - clear + dist * SLOPE);
      else lo[i] = Math.max(lo[i], obOff + clear - dist * SLOPE);
      if (lo[i] > hi[i]) { const m = (lo[i] + hi[i]) / 2; lo[i] = hi[i] = m; }
    }
  }
  for (let i = 0; i < n; i++) off[i] = Math.min(hi[i], Math.max(lo[i], off[i]));
  if (track.obstacles.length) relax([4, 2, 1]);
  update();

  // Courbure de la trajectoire (cercle passant par 3 points espacés)
  const curv = new Float32Array(n);
  const ds = new Float32Array(n);
  const K = 5;
  for (let i = 0; i < n; i++) {
    const a = (i - K + n) % n;
    const b = (i + K) % n;
    const ax = px[a], ay = py[a], bx = px[i], by = py[i], cx = px[b], cy = py[b];
    const cross = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const d1 = Math.hypot(bx - ax, by - ay);
    const d2 = Math.hypot(cx - bx, cy - by);
    const d3 = Math.hypot(cx - ax, cy - ay);
    curv[i] = (2 * cross) / (d1 * d2 * d3 || 1); // >0 : virage à droite
    const j = (i + 1) % n;
    ds[i] = Math.hypot(px[j] - px[i], py[j] - py[i]);
  }
  // Lissage léger
  const curvS = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -5; k <= 5; k++) s += curv[(i + k + n) % n];
    curvS[i] = s / 11;
  }

  return { off, x: px, y: py, curv: curvS, ds, lo, hi };
}

/**
 * Vitesse cible en chaque point, pour une voiture et un pilote donnés.
 * @param params    paramètres physiques de la voiture (statsToParams)
 * @param skill     { gripUse, brakeUse, driftUse } : part des capacités que le
 *                  pilote ose exploiter (fixé AVANT la course, jamais modifié).
 * Retourne { v, drift } : vitesse cible et indicateur « virage à drifter ».
 */
export function computeSpeedProfile(track, line, params, skill) {
  const n = track.count;
  const g = GLOBAL_TUNING;
  const v = new Float32Array(n);
  const drift = new Uint8Array(n);
  const vmax = params.maxSpeed;
  const u = g.highSpeedUndersteer;
  const vref = g.understeerRefSpeed;

  // Glisse : adhérence réduite dans les zones glissantes
  const gripMulAt = new Float32Array(n).fill(1);
  for (const z of track.zones) {
    if (z.type !== 'slick') continue;
    for (let k = -8; k < z.count + 8; k++) gripMulAt[(z.start + k + n) % n] = 0.4;
  }

  for (let i = 0; i < n; i++) {
    const c = Math.max(Math.abs(line.curv[i]), 1e-5);
    const gm = gripMulAt[i];
    // Limite d'adhérence : v² × courbure ≤ adhérence
    const vGrip = Math.sqrt((params.gripAccel * gm * skill.gripUse) / c);
    // Limite de braquage : la rotation max diminue avec la vitesse
    // Part du braquage que le pilote ose utiliser à haute vitesse
    const T = params.turnRate * 0.92 * (skill.steerUse ?? 1);
    const vSteer = T / (c + (T * u) / vref);
    let lim = Math.min(vGrip, vSteer);
    // En drift, la voiture peut tourner plus serré (si le pilote sait drifter)
    if (skill.driftUse > 0) {
      const Td = params.turnRate * params.driftTurnBoost * 0.88 * (0.5 + 0.5 * gm);
      const vDriftSteer = Td / (c + (Td * u * g.driftUndersteer) / vref);
      const vDriftGrip = Math.sqrt((params.gripAccel * gm * g.driftGripShare * skill.gripUse) / c);
      const vDrift = Math.min(vDriftSteer, vDriftGrip) * skill.driftUse;
      // Le drift ne sert que dans les virages serrés : en drift, la voiture
      // tourne forcément assez fort, ce qui la mettrait au mur dans une courbe large.
      // On accepte un drift à peine plus lent que la conduite normale : il remplit le boost.
      if (vDrift < vmax * 0.85 && vDrift > lim * 0.97 && vDrift > g.driftEntrySpeed * vmax * 1.15) {
        lim = Math.max(lim, vDrift);
        drift[i] = 1;
      }
    }
    v[i] = Math.min(lim, vmax);
  }

  // On ne garde que les virages à drifter assez longs et d'un seul sens
  // (jamais de drift dans une chicane).
  const MIN_RUN = 10;
  for (let i = 0; i < n; i++) {
    if (!drift[i] || drift[(i - 1 + n) % n]) continue; // début d'une séquence
    let len = 0;
    const sign = Math.sign(line.curv[i]);
    let mixed = false;
    while (drift[(i + len) % n] && len < n) {
      if (Math.sign(line.curv[(i + len) % n]) !== sign) mixed = true;
      len++;
    }
    if (len < MIN_RUN || mixed) {
      for (let k = 0; k < len; k++) {
        const j = (i + k) % n;
        drift[j] = 0;
        // Sans drift, la vitesse redescend à la limite « grip »
        const c = Math.max(Math.abs(line.curv[j]), 1e-5);
        const gm = gripMulAt[j];
        const T = params.turnRate * 0.92 * (skill.steerUse ?? 1);
        v[j] = Math.min(vmax, Math.sqrt((params.gripAccel * gm * skill.gripUse) / c), T / (c + (T * u) / vref));
      }
    }
  }

  // Passe arrière : freiner assez tôt avant chaque virage (2 tours pour boucler)
  const decel = params.brake * skill.brakeUse;
  for (let pass = 0; pass < 2; pass++) {
    for (let k = n - 1; k >= 0; k--) {
      const i = k;
      const j = (i + 1) % n;
      const allowed = Math.sqrt(v[j] * v[j] + 2 * decel * line.ds[i]);
      if (v[i] > allowed) v[i] = allowed;
    }
  }
  return { v, drift };
}
