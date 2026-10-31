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
  // Monoplace : coque étroite (les roues sont à l'extérieur)
  formula: [[1.0, 0.07], [0.7, 0.13], [0.35, 0.2], [-0.1, 0.3], [-0.65, 0.32], [-1.0, 0.26]],
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

// ---------------------------------------------------------------------------
// DESIGN : chaque voiture combine des éléments visuels (voir `design` dans
// src/data/cars.js). Les proportions (lm / wm) ne changent QUE l'affichage :
// la taille utilisée pour les collisions reste identique pour toutes.
// ---------------------------------------------------------------------------
const DEFAULT_DESIGN = {
  lm: 1, wm: 1,
  cockpit: 'bubble',   // bubble | big | front | rear | slit | open
  wheels: 'covered',   // covered | pods | exposed
  livery: 'twin',      // twin | single | side | bolt | chevron | split | none
  spoiler: 'bar',      // bar | wide | split | none
  lights: 'dual',      // dual | bar | quad
  extras: [],          // intakes | fins | blades | armor | bullbar | exhaust | ring | frontwing | skirts
};

/** Crée le sprite d'une voiture. Retourne { canvas, scale, ox, oy, w, h }. */
export function makeCarSprite(def, length = 46, width = 24, colors = def.colors) {
  const { body, accent } = colors;
  const finish = colors.finish ?? 'standard';
  const glow = finish === 'gold' ? '#ffd34d' : colors.glow;
  const shape = def.shape;
  const d = { ...DEFAULT_DESIGN, ...(def.design ?? {}) };
  // Motif choisi par le joueur (boutique) : remplace la décoration d'origine
  if (colors.motif && colors.motif !== 'origin') d.livery = colors.motif;
  const L = length * d.lm;
  const Wd = width * d.wm;
  const wpx = Math.ceil((L + PAD * 2) * S);
  const hpx = Math.ceil((Wd + PAD * 2) * S);
  const cv = document.createElement('canvas');
  cv.width = wpx;
  cv.height = hpx;
  const ctx = cv.getContext('2d');
  ctx.translate(wpx / 2, hpx / 2);
  ctx.scale(S, S);

  const hl = L / 2;
  const hw = Wd / 2;
  const ex = new Set(d.extras);

  // ---- Lueur au sol (néon sous la caisse) ----
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

  // ---- Ombre sous la caisse ----
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 2 * S;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  bodyPath(ctx, shape, L + 2, Wd + 1);
  ctx.fill();
  ctx.restore();

  // ---- Roues cachées / pontons (dessinés SOUS la carrosserie) ----
  const tyre = (x, y, w, h) => {
    ctx.fillStyle = '#05030c';
    roundRect(ctx, x - w / 2, y - h / 2, w, h, 1.6);
    ctx.fill();
    ctx.strokeStyle = rgba(glow, 0.6);
    ctx.lineWidth = 0.5;
    ctx.stroke();
  };
  if (d.wheels === 'covered') {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) tyre(sx * hl * 0.6, sy * (hw - 0.5), 10, 5.2);
  } else if (d.wheels === 'pods') {
    for (const sy of [-1, 1]) {
      ctx.fillStyle = shade(body, -0.45);
      roundRect(ctx, -hl * 0.85, sy > 0 ? hw - 3 : -hw - 3, hl * 1.1, 6, 3);
      ctx.fill();
      ctx.strokeStyle = rgba(accent, 0.7);
      ctx.lineWidth = 0.6;
      ctx.stroke();
      for (const sx of [-1, 1]) tyre(sx * hl * 0.6, sy * (hw + 0.3), 9, 4.6);
    }
  } else if (d.wheels === 'exposed') {
    // Suspensions (bras) puis roues bien visibles, façon monoplace
    ctx.strokeStyle = shade(body, -0.3);
    ctx.lineWidth = 1;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const wx = sx * hl * 0.66, wy = sy * (hw + 3.2);
        ctx.beginPath(); ctx.moveTo(wx - 2, sy * hw * 0.3); ctx.lineTo(wx, wy); ctx.moveTo(wx + 2, sy * hw * 0.3); ctx.lineTo(wx, wy); ctx.stroke();
      }
    }
  }

  // ---- Lames latérales (sous la carrosserie, dépassent sur les côtés) ----
  if (ex.has('blades')) {
    for (const sy of [-1, 1]) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(hl * 0.45, sy * hw * 0.7);
      ctx.lineTo(-hl * 0.85, sy * (hw + 2.4));
      ctx.lineTo(-hl * 0.95, sy * (hw + 0.8));
      ctx.lineTo(hl * 0.2, sy * hw * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- Carrosserie (selon la finition choisie) ----
  bodyPath(ctx, shape, L, Wd);
  ctx.fillStyle = bodyFill(ctx, finish, body, hl, hw);
  ctx.fill();
  if (finish === 'carbon' || finish === 'holo' || finish === 'chrome' || finish === 'metal') {
    ctx.save();
    bodyPath(ctx, shape, L, Wd);
    ctx.clip();
    drawFinishOverlay(ctx, finish, body, hl, hw, L, Wd);
    ctx.restore();
  }
  bodyPath(ctx, shape, L, Wd);
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 4 * S;
  ctx.strokeStyle = finish === 'carbon' ? body : shade(glow, 0.35);
  ctx.lineWidth = finish === 'carbon' ? 1.3 : 0.9;
  ctx.stroke();
  ctx.restore();

  // ---- Décoration (dans la carrosserie) ----
  ctx.save();
  bodyPath(ctx, shape, L, Wd);
  ctx.clip();
  ctx.fillStyle = accent;
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.9;
  switch (d.livery) {
    case 'twin':
      ctx.fillRect(-hl, -2.6, L, 1.3);
      ctx.fillRect(-hl, 1.3, L, 1.3);
      break;
    case 'single':
      ctx.fillRect(-hl, -hw * 0.22, L, hw * 0.44);
      ctx.fillStyle = shade(body, 0.5);
      ctx.fillRect(-hl, -0.3, L, 0.6);
      break;
    case 'side':
      ctx.fillRect(-hl, -hw * 0.82, L, hw * 0.2);
      ctx.fillRect(-hl, hw * 0.62, L, hw * 0.2);
      break;
    case 'bolt': {
      ctx.lineWidth = 1.6;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(hl, -1);
      ctx.lineTo(hl * 0.35, 3);
      ctx.lineTo(hl * 0.05, -3);
      ctx.lineTo(-hl * 0.4, 3);
      ctx.lineTo(-hl * 0.7, -2.5);
      ctx.lineTo(-hl, 1);
      ctx.stroke();
      break;
    }
    case 'chevron':
      ctx.lineWidth = 1.3;
      for (let x = -hl * 0.8; x < hl * 0.9; x += hl * 0.32) {
        ctx.beginPath(); ctx.moveTo(x - 3, -hw); ctx.lineTo(x + 2, 0); ctx.lineTo(x - 3, hw); ctx.stroke();
      }
      break;
    case 'split':
      ctx.globalAlpha = 0.75;
      ctx.beginPath();
      ctx.moveTo(hl, 0); ctx.lineTo(-hl, -hw * 0.2); ctx.lineTo(-hl, hw * 1.2); ctx.lineTo(hl, hw * 1.2);
      ctx.closePath();
      ctx.fill();
      break;
    case 'checker': {
      // Bande à damier le long de l'axe
      const sq = 2.4;
      for (let x = -hl, i = 0; x < hl; x += sq, i++) {
        for (let r = -2; r < 2; r++) if ((i + r) % 2 === 0) ctx.fillRect(x, r * sq, sq, sq);
      }
      break;
    }
    case 'circuit': {
      // Pistes électroniques à angles droits, avec pastilles
      ctx.lineWidth = 0.55;
      ctx.globalAlpha = 0.95;
      const paths = [
        [[hl, -hw * 0.3], [hl * 0.4, -hw * 0.3], [hl * 0.2, -hw * 0.65], [-hl * 0.5, -hw * 0.65], [-hl * 0.7, -hw * 0.35], [-hl, -hw * 0.35]],
        [[hl, hw * 0.3], [hl * 0.4, hw * 0.3], [hl * 0.2, hw * 0.65], [-hl * 0.5, hw * 0.65], [-hl * 0.7, hw * 0.35], [-hl, hw * 0.35]],
        [[hl * 0.6, 0], [-hl * 0.9, 0]],
      ];
      for (const pts of paths) {
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        for (const [x, y] of pts.slice(1, -1)) { ctx.beginPath(); ctx.arc(x, y, 0.75, 0, Math.PI * 2); ctx.fill(); }
      }
      break;
    }
    case 'flames': {
      // Flammes qui partent du nez vers l'arrière, des deux côtés
      const fg = ctx.createLinearGradient(hl, 0, -hl * 0.4, 0);
      fg.addColorStop(0, '#fff3b0');
      fg.addColorStop(0.35, accent);
      fg.addColorStop(1, shade(accent, -0.3));
      ctx.fillStyle = fg;
      for (const sy of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(hl * 0.95, sy * hw * 0.15);
        ctx.quadraticCurveTo(hl * 0.3, sy * hw * 0.2, hl * 0.05, sy * hw * 0.55);
        ctx.quadraticCurveTo(hl * 0.0, sy * hw * 0.25, -hl * 0.25, sy * hw * 0.75);
        ctx.quadraticCurveTo(-hl * 0.15, sy * hw * 0.35, -hl * 0.6, sy * hw * 0.95);
        ctx.quadraticCurveTo(-hl * 0.3, sy * hw * 0.6, -hl * 0.05, sy * hw * 0.95);
        ctx.quadraticCurveTo(hl * 0.2, sy * hw * 0.75, hl * 0.35, sy * hw * 1.0);
        ctx.quadraticCurveTo(hl * 0.6, sy * hw * 0.55, hl * 0.95, sy * hw * 0.15);
        ctx.fill();
      }
      break;
    }
    default:
      break;
  }
  ctx.globalAlpha = 1;
  // Plaques de blindage (lignes de panneaux + rivets)
  if (ex.has('armor')) {
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (const x of [hl * 0.55, hl * 0.05, -hl * 0.5]) { ctx.moveTo(x, -hw); ctx.lineTo(x, hw); }
    ctx.moveTo(-hl, -hw * 0.45); ctx.lineTo(hl, -hw * 0.45);
    ctx.moveTo(-hl, hw * 0.45); ctx.lineTo(hl, hw * 0.45);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (const x of [hl * 0.7, hl * 0.3, -hl * 0.2, -hl * 0.7]) for (const y of [-hw * 0.7, hw * 0.7]) { ctx.beginPath(); ctx.arc(x, y, 0.45, 0, Math.PI * 2); ctx.fill(); }
  }
  // Jupes latérales
  if (ex.has('skirts')) {
    ctx.fillStyle = shade(body, -0.6);
    ctx.fillRect(-hl, -hw, L, hw * 0.16);
    ctx.fillRect(-hl, hw * 0.84, L, hw * 0.16);
  }
  // Reflet sur le capot (aucun reflet sur une finition mate)
  const hood = ctx.createLinearGradient(hl, 0, hl * 0.2, 0);
  if (finish === 'matte') hood.addColorStop(0, 'rgba(255,255,255,0)'); else
  hood.addColorStop(0, 'rgba(255,255,255,0.25)');
  hood.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hood;
  ctx.fillRect(hl * 0.2, -hw, hl, Wd);
  ctx.restore();

  // ---- Prises d'air ----
  if (ex.has('intakes')) {
    for (const sy of [-1, 1]) {
      ctx.fillStyle = '#05030c';
      ctx.beginPath();
      ctx.ellipse(-hl * 0.25, sy * hw * 0.62, hl * 0.18, hw * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
  }

  // ---- Cockpit ----
  drawCockpit(ctx, d.cockpit, hl, hw, accent, glow, ex.has('ring'));

  // ---- Aileron avant (monoplace) ----
  if (ex.has('frontwing')) {
    ctx.fillStyle = shade(accent, -0.15);
    roundRect(ctx, hl - 2.6, -hw - 3.5, 2.6, Wd + 7, 0.8);
    ctx.fill();
    ctx.strokeStyle = shade(accent, 0.4);
    ctx.lineWidth = 0.4;
    ctx.stroke();
  }
  // ---- Pare-buffle ----
  if (ex.has('bullbar')) {
    ctx.strokeStyle = '#cfd6ff';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(hl - 1, -hw * 0.75);
    ctx.lineTo(hl + 1.6, -hw * 0.45);
    ctx.lineTo(hl + 1.6, hw * 0.45);
    ctx.lineTo(hl - 1, hw * 0.75);
    ctx.stroke();
  }

  // ---- Roues apparentes (par-dessus) ----
  if (d.wheels === 'exposed') {
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) tyre(sx * hl * 0.66, sy * (hw + 3.2), sx > 0 ? 8.5 : 10, sx > 0 ? 4.6 : 5.6);
  }

  // ---- Ailerons arrière (dérives) ----
  if (ex.has('fins')) {
    ctx.fillStyle = accent;
    for (const sy of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-hl * 0.55, sy * hw * 0.55);
      ctx.lineTo(-hl - 3, sy * (hw + 1.5));
      ctx.lineTo(-hl * 0.85, sy * hw * 0.45);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- Aileron arrière ----
  ctx.fillStyle = shade(accent, -0.2);
  ctx.strokeStyle = shade(accent, 0.4);
  ctx.lineWidth = 0.5;
  if (d.spoiler === 'bar') {
    roundRect(ctx, -hl - 1.5, -hw + 0.5, 3.4, Wd - 1, 1);
    ctx.fill(); ctx.stroke();
  } else if (d.spoiler === 'wide') {
    roundRect(ctx, -hl - 3, -hw - 2.5, 4, Wd + 5, 1);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = shade(accent, 0.3);
    ctx.fillRect(-hl - 3.4, -hw - 2.5, 4.8, 1.2);
    ctx.fillRect(-hl - 3.4, hw + 1.3, 4.8, 1.2);
  } else if (d.spoiler === 'split') {
    for (const sy of [-1, 1]) {
      roundRect(ctx, -hl - 2, sy > 0 ? hw * 0.15 : -hw * 0.95, 3.4, hw * 0.8, 1);
      ctx.fill(); ctx.stroke();
    }
  }

  // ---- Phares avant ----
  ctx.save();
  ctx.shadowColor = '#bff8ff';
  ctx.shadowBlur = 3 * S;
  ctx.fillStyle = '#eaffff';
  const nose = noseHalfWidth(shape, hw);
  if (d.lights === 'bar') {
    ctx.fillRect(hl * 0.8, -nose, 1.4, nose * 2);
  } else if (d.lights === 'quad') {
    for (const y of [-nose, -nose + 2.4, nose - 3.6, nose - 1.2]) ctx.fillRect(hl * 0.8, y, 2, 1.2);
  } else {
    ctx.fillRect(hl * 0.78, -nose - 0.2, 2.2, 1.6);
    ctx.fillRect(hl * 0.78, nose - 1.4, 2.2, 1.6);
  }
  ctx.restore();

  // ---- Feux arrière / échappements ----
  ctx.save();
  ctx.shadowColor = '#ff2b6a';
  ctx.shadowBlur = 2 * S;
  ctx.fillStyle = '#ff4d7d';
  ctx.fillRect(-hl + 0.6, -hw + 1.5, 1.2, 3.2);
  ctx.fillRect(-hl + 0.6, hw - 4.7, 1.2, 3.2);
  if (ex.has('exhaust')) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 3 * S;
    ctx.fillStyle = shade(glow, 0.5);
    for (const sy of [-1, 1]) { ctx.beginPath(); ctx.arc(-hl - 0.5, sy * hw * 0.3, 1.3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.restore();

  return { canvas: cv, scale: S, ox: wpx / 2 / S, oy: hpx / 2 / S, w: wpx / S, h: hpx / S };
}

// ---------------------------------------------------------------------------
// FINITIONS (cosmétiques de la boutique — aucun effet sur les performances)
// ---------------------------------------------------------------------------
function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const c = (sh) => Math.round(((a >> sh) & 255) * (1 - t) + ((b >> sh) & 255) * t);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

function bodyFill(ctx, finish, body, hl, hw) {
  const g = ctx.createLinearGradient(0, -hw, 0, hw);
  const stops = {
    standard: [[0, shade(body, -0.55)], [0.28, shade(body, -0.1)], [0.5, shade(body, 0.25)], [0.72, shade(body, -0.1)], [1, shade(body, -0.55)]],
    metal: [[0, shade(body, -0.65)], [0.2, shade(body, 0.05)], [0.38, shade(body, 0.55)], [0.5, shade(body, 0.1)], [0.66, shade(body, 0.45)], [0.85, shade(body, -0.2)], [1, shade(body, -0.65)]],
    matte: [[0, shade(body, -0.7)], [0.25, shade(body, -0.42)], [0.75, shade(body, -0.42)], [1, shade(body, -0.7)]],
    chrome: [[0, '#1d1f2c'], [0.18, mix(body, '#ffffff', 0.75)], [0.32, mix(body, '#3a3d55', 0.6)], [0.48, '#ffffff'], [0.62, mix(body, '#5a5f78', 0.5)], [0.8, mix(body, '#ffffff', 0.6)], [1, '#1d1f2c']],
    carbon: [[0, '#07070c'], [0.5, '#1b1b26'], [1, '#07070c']],
    holo: [[0, '#2b6bff'], [1, '#2b6bff']],
    gold: [[0, '#5a3300'], [0.2, '#c88a10'], [0.4, '#fff1a8'], [0.52, '#ffd34d'], [0.7, '#fff6c8'], [0.85, '#b47a08'], [1, '#5a3300']],
  }[finish] ?? null;
  for (const [o, c] of stops ?? []) g.addColorStop(o, c);
  return stops ? g : body;
}

function drawFinishOverlay(ctx, finish, body, hl, hw, L, Wd) {
  if (finish === 'carbon') {
    // Tissage de fibre de carbone
    const c = 1.6;
    for (let x = -hl; x < hl; x += c) {
      for (let y = -hw; y < hw; y += c) {
        const odd = (Math.round((x + hl) / c) + Math.round((y + hw) / c)) % 2;
        ctx.fillStyle = odd ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.25)';
        ctx.fillRect(x, y, c, c);
      }
    }
    const g = ctx.createLinearGradient(-hl, -hw, hl, hw);
    g.addColorStop(0.4, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.12)');
    g.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-hl, -hw, L, Wd);
  } else if (finish === 'holo') {
    // Arc-en-ciel holographique (en diagonale) + reflet
    const g = ctx.createLinearGradient(-hl, -hw, hl, hw);
    ['#ff2bd6', '#ffb000', '#3dff9e', '#00f0ff', '#8a2bff', '#ff2bd6'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
    ctx.fillStyle = g;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-hl, -hw, L, Wd);
    ctx.globalAlpha = 1;
    const v = ctx.createLinearGradient(0, -hw, 0, hw);
    v.addColorStop(0, 'rgba(0,0,0,0.45)');
    v.addColorStop(0.45, 'rgba(255,255,255,0.35)');
    v.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = v;
    ctx.fillRect(-hl, -hw, L, Wd);
  } else if (finish === 'chrome' || finish === 'metal') {
    // Reflet diagonal brillant
    const g = ctx.createLinearGradient(-hl, -hw, hl * 0.4, hw);
    g.addColorStop(0.45, 'rgba(255,255,255,0)');
    g.addColorStop(0.52, `rgba(255,255,255,${finish === 'chrome' ? 0.6 : 0.3})`);
    g.addColorStop(0.6, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-hl, -hw, L, Wd);
    if (finish === 'metal') {
      // Paillettes métalliques
      for (let k = 0; k < 40; k++) {
        ctx.fillStyle = `rgba(255,255,255,${0.15 + ((k * 37) % 10) / 30})`;
        ctx.fillRect(-hl + ((k * 53) % 100) / 100 * L, -hw + ((k * 71) % 100) / 100 * Wd, 0.35, 0.35);
      }
    }
  }
}

function drawCockpit(ctx, type, hl, hw, accent, glow, ring) {
  // Paramètres : centre, longueur, largeur
  const P = {
    bubble: [-hl * 0.18, hl * 0.62, hw * 0.62],
    big: [-hl * 0.08, hl * 0.78, hw * 0.78],
    front: [hl * 0.2, hl * 0.48, hw * 0.55],
    rear: [-hl * 0.42, hl * 0.5, hw * 0.68],
    slit: [-hl * 0.05, hl * 0.85, hw * 0.34],
  };
  if (type === 'open') {
    // Monoplace : habitacle ouvert, casque du pilote
    ctx.fillStyle = '#05040f';
    ctx.beginPath();
    ctx.ellipse(-hl * 0.12, 0, hl * 0.3, hw * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(-hl * 0.15, 0, hw * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0a26';
    ctx.fillRect(-hl * 0.15 + 0.4, -hw * 0.2, hw * 0.25, hw * 0.4);
    return;
  }
  const [cx0, cLen, cW] = P[type] ?? P.bubble;
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
  if (ring) {
    // Anneau lumineux autour de la verrière (signature de HALO)
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
  // Reflet
  ctx.strokeStyle = 'rgba(160,240,255,0.7)';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx0 + cLen * 0.7, -cW * 0.45);
  ctx.quadraticCurveTo(cx0 + cLen * 0.2, -cW * 0.85, cx0 - cLen * 0.3, -cW * 0.7);
  ctx.stroke();
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
