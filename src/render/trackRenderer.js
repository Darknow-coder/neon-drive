// Rendu d'un circuit.
//
// Deux couches :
//  1. Une grande image pré-calculée une seule fois (asphalte, vibreurs, décor,
//     ligne de départ, traces de pneus…). Sa résolution est adaptée à l'appareil
//     pour ne pas saturer la mémoire d'un téléphone.
//  2. Des éléments fins redessinés à chaque image (quadrillage du sol,
//     bordures néon) pour rester nets quel que soit le zoom.

import { mulberry32 } from '../core/math.js';
import { rgba } from './carSprite.js';
import { queryTrack } from '../track/buildTrack.js';

const DECOR_MARGIN = 700;

export function createTrackRenderer(track, { lowEnd = false } = {}) {
  const theme = {
    left: '#00f0ff',
    right: '#ff2bd6',
    kerb: '#ff2bd6',
    ground: '#080522',
    asphalt: '#15112f',
    ...track.theme,
  };
  const b = track.bounds;
  const ox = b.minX - DECOR_MARGIN;
  const oy = b.minY - DECOR_MARGIN;
  const ww = b.maxX - b.minX + DECOR_MARGIN * 2;
  const wh = b.maxY - b.minY + DECOR_MARGIN * 2;
  const maxPx = lowEnd ? 4e6 : 7e6;
  const scale = Math.min(1, Math.sqrt(maxPx / (ww * wh)), 4096 / ww, 4096 / wh);

  const cache = document.createElement('canvas');
  cache.width = Math.ceil(ww * scale);
  cache.height = Math.ceil(wh * scale);
  const cctx = cache.getContext('2d');

  function worldTransform() {
    cctx.setTransform(scale, 0, 0, scale, -ox * scale, -oy * scale);
  }

  function edgePoint(i, off) {
    return [track.x[i] + track.nx[i] * off, track.y[i] + track.ny[i] * off];
  }

  function tracePath(ctx, offFn, close = true) {
    ctx.moveTo(...edgePoint(0, offFn(0)));
    for (let i = 1; i < track.count; i++) ctx.lineTo(...edgePoint(i, offFn(i)));
    if (close) ctx.closePath();
  }

  function asphaltPath(ctx) {
    ctx.beginPath();
    tracePath(ctx, (i) => -track.hw[i]);
    tracePath(ctx, (i) => track.hw[i]);
  }

  function buildCache() {
    cctx.setTransform(1, 0, 0, 1, 0, 0);
    cctx.clearRect(0, 0, cache.width, cache.height);
    worldTransform();
    const rand = mulberry32(hashString(track.id));
    drawDecor(rand);
    drawAsphalt(rand);
    drawKerbs();
    drawMarkings();
    drawLamps();
  }

  // ----- Décor : blocs « urbains » vus du dessus, loin de la piste -----
  function drawDecor(rand) {
    const q = {};
    const blocks = Math.round((ww * wh) / 260000);
    for (let k = 0; k < blocks; k++) {
      const w = 120 + rand() * 260;
      const h = 120 + rand() * 260;
      const x = ox + rand() * (ww - w);
      const y = oy + rand() * (wh - h);
      const cx = x + w / 2;
      const cy = y + h / 2;
      queryTrack(track, cx, cy, -1, q);
      const clearance = Math.abs(q.lateral) - q.hw - Math.hypot(w, h) / 2;
      if (clearance < 70) continue;
      const hue = rand();
      const col = hue < 0.4 ? '#8a2bff' : hue < 0.7 ? '#2b6bff' : hue < 0.9 ? '#00f0ff' : '#ff2bd6';
      cctx.fillStyle = '#0c0828';
      cctx.fillRect(x, y, w, h);
      cctx.fillStyle = 'rgba(255,255,255,0.025)';
      cctx.fillRect(x + 10, y + 10, w - 20, h - 20);
      cctx.strokeStyle = rgba(col, 0.28);
      cctx.lineWidth = 3;
      cctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      // Petites lumières (fenêtres / équipements sur le toit)
      const dots = Math.floor((w * h) / 9000);
      for (let d = 0; d < dots; d++) {
        cctx.fillStyle = rgba(rand() < 0.75 ? col : '#ffffff', 0.25 + rand() * 0.4);
        cctx.fillRect(x + 14 + rand() * (w - 34), y + 14 + rand() * (h - 34), 6, 6);
      }
    }
  }

  function drawAsphalt(rand) {
    // Halo lumineux autour de la piste
    cctx.save();
    cctx.lineJoin = 'round';
    for (const [side, col] of [[-1, theme.left], [1, theme.right]]) {
      cctx.beginPath();
      tracePath(cctx, (i) => side * (track.hw[i] + 8));
      cctx.strokeStyle = rgba(col, 0.07);
      cctx.lineWidth = 90;
      cctx.stroke();
      cctx.strokeStyle = rgba(col, 0.08);
      cctx.lineWidth = 40;
      cctx.stroke();
    }
    cctx.restore();

    // Asphalte + texture granuleuse
    asphaltPath(cctx);
    cctx.fillStyle = theme.asphalt;
    cctx.fill('evenodd');
    cctx.save();
    asphaltPath(cctx);
    cctx.clip('evenodd');
    cctx.fillStyle = cctx.createPattern(noiseTile(rand), 'repeat');
    cctx.fillRect(ox, oy, ww, wh);
    // Lumière néon qui « bave » sur la piste depuis les bordures
    cctx.lineJoin = 'round';
    for (const [side, col] of [[-1, theme.left], [1, theme.right]]) {
      cctx.beginPath();
      tracePath(cctx, (i) => side * track.hw[i]);
      cctx.strokeStyle = rgba(col, 0.1);
      cctx.lineWidth = 70;
      cctx.stroke();
      cctx.strokeStyle = rgba(col, 0.1);
      cctx.lineWidth = 26;
      cctx.stroke();
    }
    cctx.restore();
  }

  // ----- Vibreurs à l'intérieur des virages -----
  function drawKerbs() {
    const KW = 16;
    const threshold = 1 / 650;
    for (let i = 0; i < track.count; i += 2) {
      const c = track.curv[i];
      if (Math.abs(c) < threshold) continue;
      const side = Math.sign(c); // intérieur du virage
      const j = (i + 2) % track.count;
      const hw1 = track.hw[i] - 4;
      const hw2 = track.hw[j] - 4;
      const a = edgePoint(i, side * hw1);
      const bb = edgePoint(j, side * hw2);
      const c2 = edgePoint(j, side * (hw2 - KW));
      const d = edgePoint(i, side * (hw1 - KW));
      cctx.beginPath();
      cctx.moveTo(...a); cctx.lineTo(...bb); cctx.lineTo(...c2); cctx.lineTo(...d);
      cctx.closePath();
      cctx.fillStyle = (i >> 1) % 2 ? rgba(theme.kerb, 0.85) : 'rgba(235,230,255,0.75)';
      cctx.fill();
    }
  }

  function drawMarkings() {
    // Pointillés centraux discrets
    cctx.save();
    cctx.strokeStyle = 'rgba(200,190,255,0.10)';
    cctx.lineWidth = 3;
    cctx.setLineDash([28, 36]);
    cctx.beginPath();
    tracePath(cctx, () => 0);
    cctx.stroke();
    cctx.restore();

    // Ligne de départ en damier
    const i = 0;
    const sq = 12;
    const hw = track.hw[i];
    const cols = Math.floor((hw * 2) / sq);
    const ang = Math.atan2(track.ty[i], track.tx[i]);
    cctx.save();
    cctx.translate(track.x[i], track.y[i]);
    cctx.rotate(ang);
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < cols; c++) {
        cctx.fillStyle = (r + c) % 2 ? 'rgba(240,240,255,0.85)' : 'rgba(10,8,30,0.9)';
        cctx.fillRect(-sq + r * sq, -hw + c * ((hw * 2) / cols), sq, (hw * 2) / cols);
      }
    }
    cctx.restore();

    // Emplacements de la grille de départ
    cctx.save();
    cctx.strokeStyle = 'rgba(0,240,255,0.35)';
    cctx.lineWidth = 2;
    for (let k = 0; k < 6; k++) {
      const back = 70 + k * 62;
      const idx = (track.count - Math.round(back / track.spacing)) % track.count;
      const side = k % 2 === 0 ? -1 : 1;
      const off = side * track.hw[idx] * 0.42;
      cctx.save();
      cctx.translate(track.x[idx] + track.nx[idx] * off, track.y[idx] + track.ny[idx] * off);
      cctx.rotate(Math.atan2(track.ty[idx], track.tx[idx]));
      cctx.beginPath();
      cctx.moveTo(30, -18); cctx.lineTo(30, 18);
      cctx.moveTo(30, -18); cctx.lineTo(18, -18);
      cctx.moveTo(30, 18); cctx.lineTo(18, 18);
      cctx.stroke();
      cctx.restore();
    }
    cctx.restore();

    // Chevrons à l'extérieur des virages serrés (lisibilité)
    const tight = 1 / 480;
    for (let k = 0; k < track.count; k += 9) {
      const c = track.curv[k];
      if (Math.abs(c) < tight) continue;
      const side = -Math.sign(c); // extérieur
      const [px, py] = edgePoint(k, side * (track.hw[k] + 26));
      const ang = Math.atan2(track.ty[k], track.tx[k]);
      cctx.save();
      cctx.translate(px, py);
      cctx.rotate(ang);
      cctx.strokeStyle = rgba('#ffe14d', 0.75);
      cctx.lineWidth = 4;
      cctx.lineJoin = 'miter';
      cctx.beginPath();
      cctx.moveTo(-7, -9); cctx.lineTo(5, 0); cctx.lineTo(-7, 9);
      cctx.stroke();
      cctx.restore();
    }
  }

  // ----- Lampadaires néon le long de la piste (repères de vitesse) -----
  function drawLamps() {
    const every = Math.round(170 / track.spacing);
    for (let i = 0; i < track.count; i += every) {
      for (const side of [-1, 1]) {
        const col = side < 0 ? theme.left : theme.right;
        const [px, py] = edgePoint(i, side * (track.hw[i] + 20));
        const g = cctx.createRadialGradient(px, py, 0, px, py, 34);
        g.addColorStop(0, rgba(col, 0.55));
        g.addColorStop(1, rgba(col, 0));
        cctx.fillStyle = g;
        cctx.fillRect(px - 34, py - 34, 68, 68);
        cctx.fillStyle = '#ffffff';
        cctx.beginPath();
        cctx.arc(px, py, 3, 0, Math.PI * 2);
        cctx.fill();
      }
    }
  }

  buildCache();

  // ---------- Traces de pneus ----------
  // Stockées dans un tableau circulaire (les plus anciennes disparaissent) et
  // redessinées à chaque image. On ne modifie JAMAIS la grande image du
  // circuit pendant la course : sur téléphone, chaque modification oblige la
  // puce graphique à la recharger entièrement (cause de freezes).
  const SKID_MAX = lowEnd ? 900 : 1600;
  const skid = new Float32Array(SKID_MAX * 5); // x1, y1, x2, y2, opacité
  let skidHead = 0;
  let skidCount = 0;

  function addSkid(x1, y1, x2, y2, alpha) {
    const o = skidHead * 5;
    skid[o] = x1; skid[o + 1] = y1; skid[o + 2] = x2; skid[o + 3] = y2; skid[o + 4] = alpha;
    skidHead = (skidHead + 1) % SKID_MAX;
    if (skidCount < SKID_MAX) skidCount++;
  }

  function clearSkids() {
    skidHead = 0;
    skidCount = 0;
  }

  const SKID_BUCKETS = 3; // 3 niveaux d'opacité : les traces anciennes s'estompent
  function drawSkids(ctx, view) {
    if (!skidCount) return;
    ctx.lineCap = 'round';
    ctx.lineWidth = 4.5;
    const m = 10;
    for (let bkt = 0; bkt < SKID_BUCKETS; bkt++) {
      ctx.strokeStyle = `rgba(3,1,10,${0.16 + bkt * 0.13})`;
      ctx.beginPath();
      let any = false;
      const from = Math.floor((skidCount * bkt) / SKID_BUCKETS);
      const to = Math.floor((skidCount * (bkt + 1)) / SKID_BUCKETS);
      for (let k = from; k < to; k++) {
        // k = 0 : la plus ancienne
        const idx = (skidHead - skidCount + k + SKID_MAX) % SKID_MAX;
        const o = idx * 5;
        const x1 = skid[o], y1 = skid[o + 1];
        if (x1 < view.x0 - m || x1 > view.x1 + m || y1 < view.y0 - m || y1 > view.y1 + m) continue;
        ctx.moveTo(x1, y1);
        ctx.lineTo(skid[o + 2], skid[o + 3]);
        any = true;
      }
      if (any) ctx.stroke();
    }
  }

  // ---------- Rendu en direct ----------
  const visible = new Uint8Array(track.count);

  function draw(ctx, view) {
    // view = { x0, y0, x1, y1, pxPerUnit }
    const px = 1 / view.pxPerUnit;

    // Quadrillage du sol (très important pour la sensation de vitesse)
    const G = 120;
    ctx.strokeStyle = 'rgba(138,43,255,0.13)';
    ctx.lineWidth = Math.max(px, 1.2);
    ctx.beginPath();
    for (let gx = Math.floor(view.x0 / G) * G; gx <= view.x1; gx += G) {
      ctx.moveTo(gx, view.y0); ctx.lineTo(gx, view.y1);
    }
    for (let gy = Math.floor(view.y0 / G) * G; gy <= view.y1; gy += G) {
      ctx.moveTo(view.x0, gy); ctx.lineTo(view.x1, gy);
    }
    ctx.stroke();

    // Image pré-calculée (seulement la partie visible)
    const sx = Math.max(0, (view.x0 - ox) * scale);
    const sy = Math.max(0, (view.y0 - oy) * scale);
    const sx1 = Math.min(cache.width, (view.x1 - ox) * scale);
    const sy1 = Math.min(cache.height, (view.y1 - oy) * scale);
    if (sx1 > sx && sy1 > sy) {
      ctx.drawImage(cache, sx, sy, sx1 - sx, sy1 - sy,
        ox + sx / scale, oy + sy / scale, (sx1 - sx) / scale, (sy1 - sy) / scale);
    }

    drawSkids(ctx, view);

    // Bordures néon (nettes) — uniquement les portions visibles
    const m = 140;
    for (let i = 0; i < track.count; i++) {
      const x = track.x[i];
      const y = track.y[i];
      visible[i] = x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m ? 1 : 0;
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const col = side < 0 ? theme.left : theme.right;
      ctx.beginPath();
      edgeRuns(ctx, side);
      ctx.strokeStyle = rgba(col, 0.22);
      ctx.lineWidth = 12;
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(1.2, px * 1.2);
      ctx.stroke();
    }
  }

  function edgeRuns(ctx, side) {
    const n = track.count;
    let drawing = false;
    for (let k = 0; k <= n; k++) {
      const i = k % n;
      if (visible[i]) {
        const off = side * (track.hw[i] - 4);
        const x = track.x[i] + track.nx[i] * off;
        const y = track.y[i] + track.ny[i] * off;
        if (!drawing) { ctx.moveTo(x, y); drawing = true; } else ctx.lineTo(x, y);
      } else drawing = false;
    }
  }

  return { draw, addSkid, clearSkids, theme };
}

function noiseTile(rand) {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const v = rand();
    const bright = v > 0.985 ? 60 : v > 0.5 ? 18 : 0;
    img.data[i * 4] = bright + 10;
    img.data[i * 4 + 1] = bright + 6;
    img.data[i * 4 + 2] = bright + 30;
    img.data[i * 4 + 3] = v > 0.5 ? 28 : 0;
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
