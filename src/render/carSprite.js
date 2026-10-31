// Dessin des voitures.
// Chaque voiture est dessinée UNE fois dans une petite image (sprite), avec
// ses effets lumineux, puis cette image est simplement tournée/placée à chaque
// frame. C'est beaucoup plus rapide que de redessiner les lueurs en direct,
// surtout sur téléphone.

const S = 4; // résolution du sprite (pixels par unité du monde)
const PAD = 22; // marge autour de la voiture pour la lueur (unités du monde)

// Silhouettes : [position le long de la voiture (1 = nez, -1 = arrière), demi-largeur relative]
const SHAPES = {
  sleek: [[1.0, 0.12], [0.9, 0.3], [0.62, 0.41], [0.2, 0.44], [-0.35, 0.5], [-0.82, 0.5], [-1.0, 0.4]],
  wedge: [[1.0, 0.06], [0.7, 0.27], [0.25, 0.4], [-0.3, 0.5], [-0.9, 0.5], [-1.0, 0.46]],
  round: [[1.0, 0.22], [0.86, 0.4], [0.5, 0.48], [-0.2, 0.5], [-0.8, 0.47], [-1.0, 0.32]],
  heavy: [[1.0, 0.36], [0.93, 0.47], [0.4, 0.5], [-0.88, 0.5], [-1.0, 0.45]],
  // Lame : très fine et effilée (spécialiste du drift)
  blade: [[1.0, 0.04], [0.75, 0.2], [0.35, 0.34], [-0.1, 0.42], [-0.7, 0.48], [-1.0, 0.36]],
  // Flèche : long nez pointu, arrière large (fusée)
  arrow: [[1.0, 0.02], [0.82, 0.16], [0.5, 0.3], [0.0, 0.38], [-0.6, 0.5], [-0.85, 0.52], [-1.0, 0.44]],
  // Blindée : massive et anguleuse
  tank: [[1.0, 0.42], [0.96, 0.5], [0.6, 0.52], [-0.8, 0.52], [-0.95, 0.5], [-1.0, 0.42]],
};

function bodyPath(ctx, shape, L, W) {
  const prof = SHAPES[shape] ?? SHAPES.sleek;
  const hl = L / 2;
  const pts = [];
  for (const [f, h] of prof) pts.push([f * hl, -h * W]);
  for (let i = prof.length - 1; i >= 0; i--) pts.push([prof[i][0] * hl, prof[i][1] * W]);
  // Courbe lissée passant par les milieux des segments
  ctx.beginPath();
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(pts[n - 1], pts[0]);
  ctx.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const m2 = mid(p, pts[(i + 1) % n]);
    ctx.quadraticCurveTo(p[0], p[1], m2[0], m2[1]);
  }
  ctx.closePath();
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

/** Crée le sprite d'une voiture. Retourne { canvas, scale, ox, oy }. */
export function makeCarSprite(def, length = 46, width = 24, colors = def.colors) {
  const { body, accent, glow } = colors;
  const shape = def.shape;
  const wpx = Math.ceil((length + PAD * 2) * S);
  const hpx = Math.ceil((width + PAD * 2) * S);
  const cv = document.createElement('canvas');
  cv.width = wpx;
  cv.height = hpx;
  const ctx = cv.getContext('2d');
  ctx.translate(wpx / 2, hpx / 2);
  ctx.scale(S, S);

  const hl = length / 2;
  const hw = width / 2;

  // Lueur au sol (néon sous la caisse)
  // (dégradé radial étiré plutôt qu'un filtre de flou : compatible partout)
  ctx.save();
  const gr = hl + 14;
  ctx.scale(1, (hw + 12) / gr);
  const ug = ctx.createRadialGradient(0, 0, 0, 0, 0, gr);
  ug.addColorStop(0, rgba(glow, 0.6));
  ug.addColorStop(0.55, rgba(glow, 0.28));
  ug.addColorStop(1, rgba(glow, 0));
  ctx.fillStyle = ug;
  ctx.beginPath();
  ctx.arc(0, 0, gr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Ombre sombre sous la caisse (donne du volume)
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 2 * S;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  bodyPath(ctx, shape, length + 2, width + 1);
  ctx.fill();
  ctx.restore();

  // Roues
  ctx.fillStyle = '#05030c';
  ctx.strokeStyle = rgba(glow, 0.6);
  ctx.lineWidth = 0.5;
  const wheelX = hl * 0.6;
  const wheelY = hw - 0.5;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const wx = sx * wheelX;
      const wy = sy * wheelY;
      roundRect(ctx, wx - 5, wy - 2.6, 10, 5.2, 1.6);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Carrosserie : dégradé latéral pour un effet de volume
  const grad = ctx.createLinearGradient(0, -hw, 0, hw);
  grad.addColorStop(0, shade(body, -0.55));
  grad.addColorStop(0.28, shade(body, -0.1));
  grad.addColorStop(0.5, shade(body, 0.25));
  grad.addColorStop(0.72, shade(body, -0.1));
  grad.addColorStop(1, shade(body, -0.55));
  bodyPath(ctx, shape, length, width);
  ctx.fillStyle = grad;
  ctx.fill();

  // Contour néon
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 4 * S;
  ctx.strokeStyle = shade(glow, 0.35);
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();

  // Bandes décoratives (couleur d'accent)
  ctx.save();
  bodyPath(ctx, shape, length, width);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(-hl, -2.6, length, 1.3);
  ctx.fillRect(-hl, 1.3, length, 1.3);
  // Capot plus sombre à l'avant pour le relief
  const hood = ctx.createLinearGradient(hl, 0, hl * 0.2, 0);
  hood.addColorStop(0, 'rgba(255,255,255,0.25)');
  hood.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.globalAlpha = 1;
  ctx.fillStyle = hood;
  ctx.fillRect(hl * 0.2, -hw, hl, width);
  ctx.restore();

  // Cockpit (verrière)
  const cx0 = -hl * 0.18;
  const cLen = hl * 0.62;
  const cW = hw * 0.62;
  ctx.beginPath();
  ctx.moveTo(cx0 + cLen, 0);
  ctx.bezierCurveTo(cx0 + cLen * 0.8, -cW, cx0 - cLen * 0.6, -cW, cx0 - cLen * 0.75, -cW * 0.6);
  ctx.lineTo(cx0 - cLen * 0.75, cW * 0.6);
  ctx.bezierCurveTo(cx0 - cLen * 0.6, cW, cx0 + cLen * 0.8, cW, cx0 + cLen, 0);
  ctx.closePath();
  const glass = ctx.createLinearGradient(cx0 + cLen, -cW, cx0 - cLen, cW);
  glass.addColorStop(0, '#2a3b8f');
  glass.addColorStop(0.45, '#0a0a26');
  glass.addColorStop(1, '#05040f');
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 0.6;
  ctx.stroke();
  // Reflet
  ctx.strokeStyle = 'rgba(160,240,255,0.7)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx0 + cLen * 0.7, -cW * 0.45);
  ctx.quadraticCurveTo(cx0 + cLen * 0.2, -cW * 0.85, cx0 - cLen * 0.3, -cW * 0.7);
  ctx.stroke();

  // Aileron arrière
  ctx.fillStyle = shade(accent, -0.2);
  roundRect(ctx, -hl - 1.5, -hw + 0.5, 3.4, width - 1, 1);
  ctx.fill();
  ctx.strokeStyle = shade(accent, 0.4);
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Phares avant
  ctx.save();
  ctx.shadowColor = '#bff8ff';
  ctx.shadowBlur = 3 * S;
  ctx.fillStyle = '#eaffff';
  const nose = noseHalfWidth(shape, hw);
  ctx.fillRect(hl * 0.78, -nose - 0.2, 2.2, 1.6);
  ctx.fillRect(hl * 0.78, nose - 1.4, 2.2, 1.6);
  ctx.restore();

  // Feux arrière
  ctx.save();
  ctx.shadowColor = '#ff2b6a';
  ctx.shadowBlur = 2 * S;
  ctx.fillStyle = '#ff4d7d';
  ctx.fillRect(-hl + 0.6, -hw + 1.5, 1.2, 3.2);
  ctx.fillRect(-hl + 0.6, hw - 4.7, 1.2, 3.2);
  ctx.restore();

  return { canvas: cv, scale: S, ox: wpx / 2 / S, oy: hpx / 2 / S, w: wpx / S, h: hpx / S };
}

function noseHalfWidth(shape, hw) {
  const prof = SHAPES[shape] ?? SHAPES.sleek;
  return Math.max(2, prof[1][1] * hw * 2 - 2.2);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Petite image lumineuse réutilisable (halo des phares, flammes du boost…). */
export function makeGlowSprite(color, size = 64) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(0.35, rgba(color, 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return cv;
}

export { rgba, shade };
