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
    drawSlickZones(rand);
    drawMarkings();
    drawLamps();
    drawPillarBases();
  }

  // ----- Zones glissantes : effet « glitch » cyan/violet -----
  function drawSlickZones(rand) {
    for (const z of track.zones) {
      if (z.type !== 'slick') continue;
      const a = z.offset - z.width / 2;
      const bOff = z.offset + z.width / 2;
      cctx.save();
      cctx.beginPath();
      for (let k = 0; k <= z.count; k++) {
        const i = (z.start + k) % track.count;
        const off = Math.max(a, -track.hw[i]);
        cctx.lineTo(...edgePoint(i, off));
      }
      for (let k = z.count; k >= 0; k--) {
        const i = (z.start + k) % track.count;
        const off = Math.min(bOff, track.hw[i]);
        cctx.lineTo(...edgePoint(i, off));
      }
      cctx.closePath();
      cctx.fillStyle = 'rgba(0,240,255,0.10)';
      cctx.fill();
      cctx.clip();
      // Bandes horizontales décalées façon signal numérique brouillé
      for (let k = 0; k < z.count; k += 2) {
        const i = (z.start + k) % track.count;
        if (rand() < 0.45) continue;
        const off1 = a + rand() * (bOff - a);
        const len = 20 + rand() * 70;
        const [px, py] = edgePoint(i, off1);
        cctx.fillStyle = rand() < 0.5 ? 'rgba(0,240,255,0.28)' : 'rgba(164,91,255,0.32)';
        cctx.save();
        cctx.translate(px, py);
        cctx.rotate(Math.atan2(track.ny[i], track.nx[i]));
        cctx.fillRect(0, -3, len, 5);
        cctx.restore();
      }
      cctx.restore();
      // Bordures pointillées de la zone
      cctx.save();
      cctx.setLineDash([10, 10]);
      cctx.strokeStyle = 'rgba(0,240,255,0.55)';
      cctx.lineWidth = 3;
      for (const k of [0, z.count]) {
        const i = (z.start + k) % track.count;
        cctx.beginPath();
        cctx.moveTo(...edgePoint(i, Math.max(a, -track.hw[i])));
        cctx.lineTo(...edgePoint(i, Math.min(bOff, track.hw[i])));
        cctx.stroke();
      }
      cctx.restore();
    }
  }

  // ----- Ombres au pied des piliers (le pilier lui-même est dessiné en direct) -----
  function drawPillarBases() {
    for (const ob of track.obstacles) {
      const g = cctx.createRadialGradient(ob.x + 6, ob.y + 8, ob.r * 0.6, ob.x + 6, ob.y + 8, ob.r * 1.9);
      g.addColorStop(0, 'rgba(0,0,0,0.6)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      cctx.fillStyle = g;
      cctx.beginPath();
      cctx.arc(ob.x + 6, ob.y + 8, ob.r * 1.9, 0, Math.PI * 2);
      cctx.fill();
    }
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

  // ---------- Plaques de boost (géométrie pré-calculée) ----------
  const pads = track.zones.filter((z) => z.type === 'boost').map((z) => {
    const mid = (z.start + Math.floor(z.count / 2)) % track.count;
    return {
      x: track.x[mid] + track.nx[mid] * z.offset,
      y: track.y[mid] + track.ny[mid] * z.offset,
      angle: Math.atan2(track.ty[mid], track.tx[mid]),
      len: z.count * track.spacing,
      width: z.width,
    };
  });
  const pillarSprite = makePillarSprite();

  function drawFeatures(ctx, view) {
    const t = view.time || 0;
    const inView = (x, y, m) => x > view.x0 - m && x < view.x1 + m && y > view.y0 - m && y < view.y1 + m;
    for (const p of pads) {
      if (!inView(p.x, p.y, p.len)) continue;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      const hl = p.len / 2, hw = p.width / 2;
      ctx.fillStyle = 'rgba(255,43,214,0.16)';
      ctx.fillRect(-hl, -hw, p.len, p.width);
      ctx.strokeStyle = 'rgba(255,43,214,0.8)';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-hl, -hw, p.len, p.width);
      // Chevrons qui défilent dans le sens de la course
      ctx.beginPath();
      ctx.rect(-hl, -hw, p.len, p.width);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const gap = 28;
      const shift = (t * 140) % gap;
      for (let x = -hl - gap + shift; x < hl + gap; x += gap) {
        const k = 1 - Math.abs(x) / (hl + gap);
        ctx.strokeStyle = `rgba(255,120,235,${0.25 + 0.6 * k})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x - 10, -hw * 0.65);
        ctx.lineTo(x + 4, 0);
        ctx.lineTo(x - 10, hw * 0.65);
        ctx.stroke();
      }
      ctx.restore();
    }
    for (const ob of track.obstacles) {
      if (!inView(ob.x, ob.y, ob.r * 3)) continue;
      const s = (ob.r * 2 + 40) / 2;
      ctx.drawImage(pillarSprite, ob.x - s * (ob.r / 26), ob.y - s * (ob.r / 26), s * 2 * (ob.r / 26), s * 2 * (ob.r / 26));
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
    drawFeatures(ctx, view);

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

/** Pilier vu du dessus : colonne sombre cerclée de néon (rayon de référence 26). */
function makePillarSprite() {
  const r = 26;
  const S = 3;
  const size = (r * 2 + 40) * S;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const c = cv.getContext('2d');
  c.translate(size / 2, size / 2);
  c.scale(S, S);
  const glow = c.createRadialGradient(0, 0, r * 0.8, 0, 0, r + 20);
  glow.addColorStop(0, 'rgba(255,225,77,0.45)');
  glow.addColorStop(1, 'rgba(255,225,77,0)');
  c.fillStyle = glow;
  c.beginPath(); c.arc(0, 0, r + 20, 0, Math.PI * 2); c.fill();
  // Hexagone (sommet de la colonne)
  const hex = (rr) => {
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    c.closePath();
  };
  hex(r);
  const body = c.createLinearGradient(-r, -r, r, r);
  body.addColorStop(0, '#3a2a66');
  body.addColorStop(1, '#0d0820');
  c.fillStyle = body;
  c.fill();
  c.shadowColor = '#ffe14d';
  c.shadowBlur = 6 * S;
  c.strokeStyle = '#ffe14d';
  c.lineWidth = 2.5;
  c.stroke();
  c.shadowBlur = 0;
  hex(r * 0.55);
  c.strokeStyle = 'rgba(255,43,214,0.8)';
  c.lineWidth = 1.5;
  c.stroke();
  c.fillStyle = '#fff6c2';
  c.beginPath(); c.arc(0, 0, 3, 0, Math.PI * 2); c.fill();
  return cv;
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
