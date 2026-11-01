// Construit un circuit jouable à partir de sa description (src/data/tracks/*).
//
// Un circuit est décrit par quelques points de contrôle. On les relie par une
// courbe lisse (Catmull-Rom centripète), puis on la découpe en petits
// échantillons réguliers (tous les SPACING unités). Pour chaque échantillon on
// connaît : position, direction, normale, demi-largeur, courbure et distance
// depuis la ligne de départ. Tout le reste (murs, IA, tours, rendu) s'appuie
// sur ces échantillons.

export const SPACING = 8;

function catmullRom(p0, p1, p2, p3, t, alpha = 0.5) {
  // Catmull-Rom centripète : évite les boucles et les dépassements de courbe.
  const d = (a, b) => Math.pow(Math.hypot(b[0] - a[0], b[1] - a[1]), alpha) || 1e-4;
  const t0 = 0;
  const t1 = t0 + d(p0, p1);
  const t2 = t1 + d(p1, p2);
  const t3 = t2 + d(p2, p3);
  const tt = t1 + (t2 - t1) * t;
  const out = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const A1 = ((t1 - tt) * p0[k] + (tt - t0) * p1[k]) / (t1 - t0);
    const A2 = ((t2 - tt) * p1[k] + (tt - t1) * p2[k]) / (t2 - t1);
    const A3 = ((t3 - tt) * p2[k] + (tt - t2) * p3[k]) / (t3 - t2);
    const B1 = ((t2 - tt) * A1 + (tt - t0) * A2) / (t2 - t0);
    const B2 = ((t3 - tt) * A2 + (tt - t1) * A3) / (t3 - t1);
    out[k] = ((t2 - tt) * B1 + (tt - t1) * B2) / (t2 - t1);
  }
  return out;
}

export function buildTrack(data) {
  const scale = data.scale ?? 1;
  const baseW = data.width ?? 240;
  const ctrl = data.points.map(([x, y, w]) => [x * scale, y * scale, w ?? baseW]);
  const n = ctrl.length;

  // 1) Courbe dense
  const dense = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n];
    const p1 = ctrl[i];
    const p2 = ctrl[(i + 1) % n];
    const p3 = ctrl[(i + 2) % n];
    const steps = Math.max(8, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 4));
    for (let s = 0; s < steps; s++) dense.push(catmullRom(p0, p1, p2, p3, s / steps));
  }

  // 2) Ré-échantillonnage à espacement constant
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const length = cum[cum.length - 1];
  const count = Math.round(length / SPACING);
  const spacing = length / count;

  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const hw = new Float32Array(count);
  let j = 0;
  for (let i = 0; i < count; i++) {
    const target = i * spacing;
    while (cum[j + 1] < target) j++;
    const a = dense[j];
    const b = dense[(j + 1) % dense.length];
    const t = (target - cum[j]) / (cum[j + 1] - cum[j] || 1);
    x[i] = a[0] + (b[0] - a[0]) * t;
    y[i] = a[1] + (b[1] - a[1]) * t;
    hw[i] = (a[2] + (b[2] - a[2]) * t) / 2;
  }

  // 3) Directions, normales, courbure
  const tx = new Float32Array(count);
  const ty = new Float32Array(count);
  const nx = new Float32Array(count);
  const ny = new Float32Array(count);
  const curv = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const ip = (i - 1 + count) % count;
    const inx = (i + 1) % count;
    let dx = x[inx] - x[ip];
    let dy = y[inx] - y[ip];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    tx[i] = dx; ty[i] = dy;
    nx[i] = -dy; ny[i] = dx; // normale vers la DROITE du sens de course
  }
  for (let i = 0; i < count; i++) {
    const ip = (i - 2 + count) % count;
    const inx = (i + 2) % count;
    const a1 = Math.atan2(ty[ip], tx[ip]);
    const a2 = Math.atan2(ty[inx], tx[inx]);
    let da = a2 - a1;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    curv[i] = da / (4 * spacing); // >0 : virage à droite
  }
  // Courbure lissée (plus stable pour les vibreurs et l'IA)
  const curvSmooth = new Float32Array(count);
  const R = 6;
  for (let i = 0; i < count; i++) {
    let s = 0;
    for (let k = -R; k <= R; k++) s += curv[(i + k + count) % count];
    curvSmooth[i] = s / (2 * R + 1);
  }

  // 4) Bornes du circuit
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const m = hw[i] + 40;
    minX = Math.min(minX, x[i] - m); maxX = Math.max(maxX, x[i] + m);
    minY = Math.min(minY, y[i] - m); maxY = Math.max(maxY, y[i] + m);
  }

  const track = {
    data,
    id: data.id,
    name: data.name,
    count,
    spacing,
    length,
    x, y, hw, tx, ty, nx, ny,
    curv: curvSmooth,
    bounds: { minX, minY, maxX, maxY },
    wallThickness: 10,
    theme: data.theme ?? {},
    // Météo : la pluie réduit l'adhérence de TOUTES les voitures (IA comprises)
    weather: data.weather ?? 'clear',
    gridCols: data.gridCols ?? 1,
    gripMul: data.weather === 'rain' ? 0.82 : 1,
    obstacles: [],
    zones: [],
  };
  buildFeatures(track, data);
  return track;
}

// ---------------------------------------------------------------------------
// Éléments spéciaux d'un circuit.
// Ils sont placés par rapport au tracé (et non en coordonnées x/y) :
//   at     : position sur le tour, de 0 (ligne de départ) à 1
//   offset : décalage latéral depuis le centre (négatif = à gauche)
// Ainsi, si on modifie la forme du circuit, ils restent bien placés.
//
//   obstacles : { type: 'pillar', at, offset, r, move? }
//               move = { amp, period, phase } : le pilier coulisse latéralement
//               (offset ± amp, période en secondes) — mouvement régulier et prévisible
//   zones     : { type: 'boost' | 'slick', at, length, offset, width }
// ---------------------------------------------------------------------------
function buildFeatures(track, data) {
  const idxAt = (at) => ((Math.round(at * track.count) % track.count) + track.count) % track.count;
  for (const o of data.obstacles ?? []) {
    const i = idxAt(o.at);
    const off = o.offset ?? 0;
    track.obstacles.push({
      type: o.type ?? 'pillar',
      index: i,
      x: track.x[i] + track.nx[i] * off,
      y: track.y[i] + track.ny[i] * off,
      r: o.r ?? 28,
      baseOffset: off,
      offset: off,
      move: o.move ? { amp: o.move.amp ?? 60, period: o.move.period ?? 3, phase: o.move.phase ?? 0 } : null,
    });
  }
  for (const z of data.zones ?? []) {
    const i0 = idxAt(z.at);
    const n = Math.max(2, Math.round((z.length ?? 120) / track.spacing));
    const width = z.width ?? (z.type === 'slick' ? track.hw[i0] * 2 : 80);
    track.zones.push({
      type: z.type,
      start: i0,
      count: n,
      offset: z.offset ?? 0,
      width,
    });
  }
}

/** Indique si une position (index sur le tracé + décalage latéral) est dans une zone. */
export function zoneAt(track, index, lateral) {
  for (const z of track.zones) {
    const d = (index - z.start + track.count) % track.count;
    if (d < z.count && Math.abs(lateral - z.offset) < z.width / 2) return z;
  }
  return null;
}

/**
 * Trouve le point du tracé le plus proche d'une position.
 * `hint` = dernier index connu (recherche locale rapide).
 * Le résultat est écrit dans `out` pour éviter de créer des objets à chaque image.
 */
export function queryTrack(track, px, py, hint, out = {}) {
  const { count, x, y } = track;
  let best = -1;
  let bestD = Infinity;
  const W = 40;
  if (hint >= 0) {
    for (let k = -W; k <= W; k++) {
      const i = (hint + k + count) % count;
      const dx = px - x[i];
      const dy = py - y[i];
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
  }
  const limit = track.hw[best >= 0 ? best : 0] * 1.6;
  if (best < 0 || bestD > limit * limit) {
    for (let i = 0; i < count; i++) {
      const dx = px - x[i];
      const dy = py - y[i];
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
  }
  // Projection sur le segment le plus pertinent (précédent ou suivant)
  const i0 = best;
  const dxp = px - x[i0];
  const dyp = py - y[i0];
  const along = dxp * track.tx[i0] + dyp * track.ty[i0];
  const a = along >= 0 ? i0 : (i0 - 1 + count) % count;
  const b = (a + 1) % count;
  const sx = x[b] - x[a];
  const sy = y[b] - y[a];
  const sl2 = sx * sx + sy * sy || 1;
  let t = ((px - x[a]) * sx + (py - y[a]) * sy) / sl2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;

  const cx = x[a] + sx * t;
  const cy = y[a] + sy * t;
  let nnx = track.nx[a] + (track.nx[b] - track.nx[a]) * t;
  let nny = track.ny[a] + (track.ny[b] - track.ny[a]) * t;
  const nl = Math.hypot(nnx, nny) || 1;
  nnx /= nl; nny /= nl;

  out.index = i0;
  out.seg = a;
  out.t = t;
  out.cx = cx;
  out.cy = cy;
  out.nx = nnx;
  out.ny = nny;
  out.lateral = (px - cx) * nnx + (py - cy) * nny; // >0 : à droite du centre
  out.hw = track.hw[a] + (track.hw[b] - track.hw[a]) * t;
  out.dist = (a + t) * track.spacing; // distance depuis la ligne de départ
  return out;
}

/** Positions de la grille de départ (2 colonnes, en quinconce, derrière la ligne). */
export function gridSlots(track, n) {
  const slots = [];
  const cols = track.gridCols ?? 1;
  for (let k = 0; k < n; k++) {
    let back, idx, off;
    if (cols > 1) {
      // Grille large (giga course) : plusieurs voitures par rangée, légèrement décalées
      const row = Math.floor(k / cols), col = k % cols;
      back = 70 + row * 78 + col * 16;
      idx = (track.count - Math.round(back / track.spacing)) % track.count;
      off = ((col + 0.5) / cols - 0.5) * 2 * track.hw[idx] * 0.78;
    } else {
      back = 70 + k * 62;
      idx = (track.count - Math.round(back / track.spacing)) % track.count;
      off = (k % 2 === 0 ? -1 : 1) * track.hw[idx] * 0.42;
    }
    slots.push({
      x: track.x[idx] + track.nx[idx] * off,
      y: track.y[idx] + track.ny[idx] * off,
      angle: Math.atan2(track.ty[idx], track.tx[idx]),
      index: idx,
    });
  }
  return slots;
}

/** Décalage latéral d'un pilier mobile à l'instant `time`. */
export function obstacleOffsetAt(ob, time) {
  if (!ob.move) return ob.baseOffset;
  return ob.baseOffset + ob.move.amp * Math.sin((2 * Math.PI * time) / ob.move.period + ob.move.phase);
}

/** Met à jour la position des piliers mobiles (appelé à chaque pas de la course). */
export function updateMovingObstacles(track, time) {
  for (const ob of track.obstacles) {
    if (!ob.move) continue;
    const off = obstacleOffsetAt(ob, time);
    ob.offset = off;
    ob.x = track.x[ob.index] + track.nx[ob.index] * off;
    ob.y = track.y[ob.index] + track.ny[ob.index] * off;
  }
}
