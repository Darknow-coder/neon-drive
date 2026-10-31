// Éditeur de circuits NEON//DRIVE.
//
// On édite la description du circuit (mêmes données que src/data/tracks/*.js) :
// des points de contrôle, une largeur, des éléments spéciaux. À chaque
// modification, le circuit est reconstruit avec le même code que le jeu
// (buildTrack) et vérifié avec les mêmes règles (validateTrack).

import { buildTrack, queryTrack } from '../track/buildTrack.js';
import { validateTrack } from '../track/validate.js';
import { TRACKS } from '../data/tracks/index.js';
import { LEAGUES } from '../data/progression.js';
import { createRaceWorld } from '../race/raceWorld.js';
import { getCar } from '../data/cars.js';

const $ = (id) => document.getElementById(id);
const DRAFT_KEY = 'neondrive.editor.draft';
const clone = (o) => JSON.parse(JSON.stringify(o));

// ---------------------------------------------------------------------------
// État
// ---------------------------------------------------------------------------
let data = null;          // description du circuit (unités « dessin », avant échelle)
let track = null;         // circuit construit (unités du monde)
let report = null;        // résultat de la vérification
let selected = null;      // { type: 'point' | 'feature', index }
let tool = 'select';
const history = [];
const view = { cx: 0, cy: 0, zoom: 0.2 };

const canvas = $('ed-canvas');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, dpr = 1;

function template() {
  return {
    id: 'mon-circuit',
    name: 'MON CIRCUIT',
    profile: 'Mixte',
    league: 'bronze',
    scale: 1.4,
    width: 240,
    theme: { left: '#00f0ff', right: '#ff2bd6', kerb: '#ff2bd6' },
    points: [
      [1200, 2200], [2400, 2200], [3100, 1900], [3200, 1200], [2700, 700],
      [1800, 900], [1200, 600], [600, 900], [500, 1600], [700, 2100],
    ],
    obstacles: [],
    zones: [],
  };
}

function normalize(d) {
  const n = clone(d);
  n.obstacles ??= [];
  n.zones ??= [];
  n.theme = { left: '#00f0ff', right: '#ff2bd6', kerb: '#ff2bd6', ...(n.theme ?? {}) };
  n.scale ??= 1;
  n.width ??= 240;
  n.league ??= 'bronze';
  n.profile ??= 'Mixte';
  return n;
}

// ---------------------------------------------------------------------------
// Reconstruction + vérification
// ---------------------------------------------------------------------------
let saveTimer = 0;
function rebuild({ validate = true } = {}) {
  try {
    track = buildTrack(data);
  } catch (e) {
    track = null;
  }
  if (validate && track) report = validateTrack(track);
  renderPanels();
  draw();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* ignoré */ }
  }, 300);
}

function pushHistory() {
  history.push(JSON.stringify(data));
  if (history.length > 80) history.shift();
  $('ed-undo').disabled = false;
}
function undo() {
  const prev = history.pop();
  if (!prev) return;
  data = JSON.parse(prev);
  selected = null;
  $('ed-undo').disabled = history.length === 0;
  rebuild();
}

// ---------------------------------------------------------------------------
// Vue : conversions écran ↔ monde
// ---------------------------------------------------------------------------
const toScreen = (x, y) => [(x - view.cx) * view.zoom + W / 2, (y - view.cy) * view.zoom + H / 2];
const toWorld = (sx, sy) => [(sx - W / 2) / view.zoom + view.cx, (sy - H / 2) / view.zoom + view.cy];
const pointWorld = (p) => [p[0] * data.scale, p[1] * data.scale];

function fit() {
  if (!track) return;
  const b = track.bounds;
  view.cx = (b.minX + b.maxX) / 2;
  view.cy = (b.minY + b.maxY) / 2;
  view.zoom = Math.min(W / (b.maxX - b.minX + 400), H / (b.maxY - b.minY + 400));
}

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  W = r.width;
  H = r.height;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  draw();
}

// ---------------------------------------------------------------------------
// Dessin
// ---------------------------------------------------------------------------
function edgePath(side) {
  const n = track.count;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const k = i % n;
    const off = side * track.hw[k];
    const [sx, sy] = toScreen(track.x[k] + track.nx[k] * off, track.y[k] + track.ny[k] * off);
    if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
}

function featureWorld(f, kind) {
  const n = track.count;
  const i = ((Math.round(f.at * n) % n) + n) % n;
  const off = kind === 'slick' ? 0 : f.offset ?? 0;
  return { i, x: track.x[i] + track.nx[i] * off, y: track.y[i] + track.ny[i] * off };
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#07041a';
  ctx.fillRect(0, 0, W, H);

  // Quadrillage (500 unités)
  const [x0, y0] = toWorld(0, 0);
  const [x1, y1] = toWorld(W, H);
  ctx.strokeStyle = 'rgba(138,43,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  const G = 500;
  for (let gx = Math.floor(x0 / G) * G; gx < x1; gx += G) { const [sx] = toScreen(gx, 0); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); }
  for (let gy = Math.floor(y0 / G) * G; gy < y1; gy += G) { const [, sy] = toScreen(0, gy); ctx.moveTo(0, sy); ctx.lineTo(W, sy); }
  ctx.stroke();

  if (!track) return;
  const th = data.theme;

  // Asphalte
  ctx.beginPath();
  for (const side of [-1, 1]) {
    const n = track.count;
    for (let i = 0; i <= n; i++) {
      const k = i % n;
      const off = side * track.hw[k];
      const [sx, sy] = toScreen(track.x[k] + track.nx[k] * off, track.y[k] + track.ny[k] * off);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.closePath();
  }
  ctx.fillStyle = '#1a1438';
  ctx.fill('evenodd');

  // Zones glissantes
  for (const z of data.zones) {
    if (z.type !== 'slick') continue;
    const s = featureWorld(z, 'slick').i;
    const cnt = Math.round((z.length ?? 260) / track.spacing);
    ctx.strokeStyle = 'rgba(0,240,255,0.35)';
    ctx.lineWidth = track.hw[s] * 2 * view.zoom;
    ctx.beginPath();
    for (let k = 0; k <= cnt; k++) {
      const i = (s + k) % track.count;
      const [sx, sy] = toScreen(track.x[i], track.y[i]);
      if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }

  // Bords
  ctx.lineWidth = 2.5;
  edgePath(-1); ctx.strokeStyle = th.left; ctx.stroke();
  edgePath(1); ctx.strokeStyle = th.right; ctx.stroke();

  // Problèmes surlignés en rouge
  if (report) {
    ctx.fillStyle = 'rgba(255,60,90,0.55)';
    for (const p of report.problems) {
      for (const i of p.indices) {
        const [sx, sy] = toScreen(track.x[i], track.y[i]);
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(4, track.hw[i] * view.zoom), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Ligne de départ + sens de la course
  {
    const i = 0;
    const hw = track.hw[i];
    const [ax, ay] = toScreen(track.x[i] - track.nx[i] * hw, track.y[i] - track.ny[i] * hw);
    const [bx, by] = toScreen(track.x[i] + track.nx[i] * hw, track.y[i] + track.ny[i] * hw);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
    // Flèches de direction le long de la piste
    ctx.fillStyle = 'rgba(255,225,77,0.8)';
    const every = Math.max(20, Math.round(600 / track.spacing));
    for (let k = 0; k < track.count; k += every) {
      const [sx, sy] = toScreen(track.x[k], track.y[k]);
      const a = Math.atan2(track.ty[k], track.tx[k]);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
      ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  // Plaques de boost et piliers
  data.zones.forEach((z, k) => {
    if (z.type !== 'boost') return;
    const { i, x, y } = featureWorld(z, 'boost');
    const [sx, sy] = toScreen(x, y);
    const sel = selected?.type === 'feature' && selected.list === 'zones' && selected.index === k;
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(Math.atan2(track.ty[i], track.tx[i]));
    const l = (z.length ?? 110) * view.zoom, w = (z.width ?? 80) * view.zoom;
    ctx.fillStyle = 'rgba(255,43,214,0.35)';
    ctx.strokeStyle = sel ? '#fff' : '#ff2bd6';
    ctx.lineWidth = sel ? 3 : 2;
    ctx.fillRect(-l / 2, -w / 2, l, w); ctx.strokeRect(-l / 2, -w / 2, l, w);
    ctx.restore();
  });
  data.obstacles.forEach((o, k) => {
    const { x, y } = featureWorld(o, 'pillar');
    const [sx, sy] = toScreen(x, y);
    const sel = selected?.type === 'feature' && selected.list === 'obstacles' && selected.index === k;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.max(7, (o.r ?? 26) * view.zoom), 0, Math.PI * 2);
    ctx.fillStyle = '#2a1a55';
    ctx.fill();
    ctx.strokeStyle = sel ? '#fff' : '#ffe14d';
    ctx.lineWidth = sel ? 3 : 2;
    ctx.stroke();
  });

  // Ligne reliant les points de contrôle + points
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  data.points.forEach((p, k) => { const [sx, sy] = toScreen(...pointWorld(p)); if (k === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy); });
  ctx.closePath();
  ctx.stroke();
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  data.points.forEach((p, k) => {
    const [sx, sy] = toScreen(...pointWorld(p));
    const sel = selected?.type === 'point' && selected.index === k;
    ctx.beginPath();
    ctx.arc(sx, sy, sel ? 11 : 8, 0, Math.PI * 2);
    ctx.fillStyle = k === 0 ? '#ffffff' : sel ? '#ff2bd6' : '#00f0ff';
    ctx.fill();
    if (p[2]) { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.fillStyle = '#07041a';
    ctx.fillText(String(k + 1), sx, sy + 0.5);
  });
}

// ---------------------------------------------------------------------------
// Panneaux
// ---------------------------------------------------------------------------
function renderPanels() {
  // Vérification
  const status = $('ed-status');
  const list = $('ed-problems');
  list.innerHTML = '';
  if (!track) {
    status.className = 'status ko';
    status.textContent = '✗ Circuit impossible à construire (pas assez de points ?)';
  } else if (report) {
    status.className = 'status ' + (report.ok ? 'ok' : 'ko');
    status.textContent = report.ok ? '✓ Circuit valide' : `✗ ${report.problems.length} problème(s) (en rouge sur la carte)`;
    for (const p of report.problems) {
      const li = document.createElement('li');
      li.textContent = p.msg;
      list.append(li);
    }
    const s = report.stats;
    $('ed-stats').innerHTML = `Longueur <b>${Math.round(s.length)}</b> u · tour estimé <b>~${s.lapEstimate.toFixed(0)} s</b><br>Écart min. entre portions <b>${Math.round(s.minGap)}</b> u · rayon intérieur min. <b>${Math.round(s.minInnerRadius)}</b> u`;
  }

  // Propriétés
  $('ed-name').value = data.name;
  $('ed-id').value = data.id;
  $('ed-profile').value = data.profile;
  $('ed-league').value = data.league;
  $('ed-scale').value = data.scale;
  $('ed-scale-out').textContent = `×${data.scale.toFixed(2)}`;
  $('ed-width').value = data.width;
  $('ed-width-out').textContent = data.width;
  $('ed-left').value = data.theme.left;
  $('ed-right').value = data.theme.right;
  $('ed-kerb').value = data.theme.kerb;

  // Point sélectionné
  const pp = $('ed-point-panel');
  if (selected?.type === 'point' && data.points[selected.index]) {
    const p = data.points[selected.index];
    pp.classList.remove('hidden');
    $('ed-point-num').textContent = `n° ${selected.index + 1}`;
    $('ed-point-wide').checked = !!p[2];
    $('ed-point-width').disabled = !p[2];
    $('ed-point-width').value = p[2] ?? data.width;
    $('ed-point-width-out').textContent = p[2] ?? data.width;
    $('ed-point-del').disabled = data.points.length <= 4;
  } else pp.classList.add('hidden');

  // Éléments spéciaux
  const fl = $('ed-features');
  fl.innerHTML = '';
  const items = [
    ...data.obstacles.map((f, index) => ({ f, list: 'obstacles', index, label: '⬢ Pilier', field: 'r', fieldLabel: 'rayon' })),
    ...data.zones.map((f, index) => ({ f, list: 'zones', index, label: f.type === 'boost' ? '» Boost' : '≋ Glissant', field: 'length', fieldLabel: 'long.' })),
  ];
  if (!items.length) {
    fl.innerHTML = '<li><span class="empty">Aucun. Choisis un outil (Pilier, Boost, Glissant) puis clique sur la piste.</span></li>';
  }
  for (const it of items) {
    const li = document.createElement('li');
    if (selected?.type === 'feature' && selected.list === it.list && selected.index === it.index) li.className = 'sel';
    const val = it.f[it.field] ?? (it.field === 'r' ? 26 : it.f.type === 'boost' ? 110 : 260);
    li.innerHTML = `<span>${it.label} <small style="color:var(--muted)">à ${(it.f.at * 100).toFixed(0)} %</small></span>
      <label style="grid-template-columns:auto 1fr;margin:0">${it.fieldLabel} <input type="number" value="${val}" min="10" max="600" step="5"></label>
      <button class="danger" title="Supprimer">✕</button>`;
    li.querySelector('input').addEventListener('change', (e) => {
      pushHistory();
      it.f[it.field] = Math.max(10, Math.min(600, +e.target.value || val));
      rebuild();
    });
    li.querySelector('button').addEventListener('click', () => {
      pushHistory();
      data[it.list].splice(it.index, 1);
      selected = null;
      rebuild();
    });
    li.addEventListener('click', (e) => {
      if (e.target.closest('input,button')) return;
      selected = { type: 'feature', list: it.list, index: it.index };
      renderPanels(); draw();
    });
    fl.append(li);
  }
}

// ---------------------------------------------------------------------------
// Interactions sur la carte
// ---------------------------------------------------------------------------
const pointers = new Map();
let drag = null; // { kind: 'pan' | 'point' | 'feature', ... }
let pinch = null;
let lastTap = { t: 0, x: 0, y: 0 };

function hitPoint(sx, sy) {
  let best = -1, bd = 14 * 14;
  data.points.forEach((p, k) => {
    const [px, py] = toScreen(...pointWorld(p));
    const d = (px - sx) ** 2 + (py - sy) ** 2;
    if (d < bd) { bd = d; best = k; }
  });
  return best;
}

function hitFeature(sx, sy) {
  if (!track) return null;
  let best = null, bd = 16 * 16;
  const test = (list, f, index, kind) => {
    const { x, y } = featureWorld(f, kind);
    const [px, py] = toScreen(x, y);
    const d = (px - sx) ** 2 + (py - sy) ** 2;
    if (d < bd) { bd = d; best = { type: 'feature', list, index }; }
  };
  data.obstacles.forEach((f, i) => test('obstacles', f, i, 'pillar'));
  data.zones.forEach((f, i) => test('zones', f, i, f.type));
  return best;
}

/** Position sur la piste (fraction du tour + décalage latéral) sous le curseur. */
function trackPosAt(sx, sy) {
  if (!track) return null;
  const [wx, wy] = toWorld(sx, sy);
  const q = queryTrack(track, wx, wy, -1, {});
  if (Math.abs(q.lateral) > q.hw) return null;
  return { at: +(q.dist / track.length).toFixed(4), offset: Math.round(q.lateral) };
}

function insertPoint(sx, sy) {
  const [wx, wy] = toWorld(sx, sy);
  const q = [wx / data.scale, wy / data.scale];
  const pts = data.points;
  let best = 0, bestCost = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const cost = Math.hypot(a[0] - q[0], a[1] - q[1]) + Math.hypot(b[0] - q[0], b[1] - q[1]) - Math.hypot(a[0] - b[0], a[1] - b[1]);
    if (cost < bestCost) { bestCost = cost; best = i; }
  }
  pushHistory();
  pts.splice(best + 1, 0, [Math.round(q[0]), Math.round(q[1])]);
  selected = { type: 'point', index: best + 1 };
  rebuild();
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    drag = null;
    return;
  }
  const sx = e.offsetX, sy = e.offsetY;

  // Double-clic / double-toucher : ajouter un point
  const now = performance.now();
  const dbl = now - lastTap.t < 320 && Math.hypot(sx - lastTap.x, sy - lastTap.y) < 12;
  lastTap = { t: now, x: sx, y: sy };

  if (tool !== 'select') {
    const pos = trackPosAt(sx, sy);
    if (!pos) return;
    pushHistory();
    if (tool === 'pillar') { data.obstacles.push({ type: 'pillar', at: pos.at, offset: pos.offset, r: 26 }); selected = { type: 'feature', list: 'obstacles', index: data.obstacles.length - 1 }; }
    if (tool === 'boost') { data.zones.push({ type: 'boost', at: pos.at, length: 110, offset: pos.offset, width: 80 }); selected = { type: 'feature', list: 'zones', index: data.zones.length - 1 }; }
    if (tool === 'slick') { data.zones.push({ type: 'slick', at: pos.at, length: 260 }); selected = { type: 'feature', list: 'zones', index: data.zones.length - 1 }; }
    setTool('select');
    rebuild();
    return;
  }

  const pi = hitPoint(sx, sy);
  if (pi >= 0) {
    pushHistory();
    selected = { type: 'point', index: pi };
    drag = { kind: 'point', index: pi, moved: false };
    renderPanels(); draw();
    return;
  }
  const hf = hitFeature(sx, sy);
  if (hf) {
    pushHistory();
    selected = hf;
    drag = { kind: 'feature', ...hf, moved: false };
    renderPanels(); draw();
    return;
  }
  if (dbl && trackPosAt(sx, sy)) { insertPoint(sx, sy); return; }
  selected = null;
  renderPanels();
  drag = { kind: 'pan', sx, sy, cx: view.cx, cy: view.cy };
  draw();
});

canvas.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    view.zoom = Math.max(0.03, Math.min(2, pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
    draw();
    return;
  }
  if (!drag) return;
  const sx = e.offsetX, sy = e.offsetY;
  if (drag.kind === 'pan') {
    view.cx = drag.cx - (sx - drag.sx) / view.zoom;
    view.cy = drag.cy - (sy - drag.sy) / view.zoom;
    draw();
  } else if (drag.kind === 'point') {
    const [wx, wy] = toWorld(sx, sy);
    const p = data.points[drag.index];
    p[0] = Math.round(wx / data.scale);
    p[1] = Math.round(wy / data.scale);
    drag.moved = true;
    rebuild({ validate: false }); // vérification complète au relâchement
  } else if (drag.kind === 'feature') {
    const pos = trackPosAt(sx, sy);
    if (!pos) return;
    const f = data[drag.list][drag.index];
    f.at = pos.at;
    if (f.type !== 'slick') f.offset = pos.offset;
    drag.moved = true;
    rebuild({ validate: false });
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (drag && (drag.kind === 'point' || drag.kind === 'feature')) {
    if (!drag.moved) history.pop(); // simple sélection : rien à annuler
    rebuild();
  }
  drag = null;
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [wx, wy] = toWorld(e.offsetX, e.offsetY);
  view.zoom = Math.max(0.03, Math.min(2, view.zoom * Math.exp(-e.deltaY * 0.0015)));
  // Zoom centré sur le curseur
  const [nx, ny] = toWorld(e.offsetX, e.offsetY);
  view.cx += wx - nx;
  view.cy += wy - ny;
  draw();
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
  if (e.key === 'Escape') { selected = null; setTool('select'); renderPanels(); draw(); }
});

function deleteSelected() {
  if (!selected) return;
  if (selected.type === 'point') {
    if (data.points.length <= 4) return;
    pushHistory();
    data.points.splice(selected.index, 1);
  } else {
    pushHistory();
    data[selected.list].splice(selected.index, 1);
  }
  selected = null;
  rebuild();
}

function setTool(t) {
  tool = t;
  document.querySelectorAll('#ed-tools button').forEach((b) => b.classList.toggle('on', b.dataset.tool === t));
  canvas.style.cursor = t === 'select' ? 'crosshair' : 'copy';
}
document.querySelectorAll('#ed-tools button').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));

// ---------------------------------------------------------------------------
// Panneau des propriétés
// ---------------------------------------------------------------------------
for (const l of LEAGUES) {
  const o = document.createElement('option');
  o.value = l.id;
  o.textContent = l.name;
  $('ed-league').append(o);
}
const bindText = (id, key, transform = (v) => v) => {
  $(id).addEventListener('change', (e) => { pushHistory(); data[key] = transform(e.target.value); rebuild(); });
};
bindText('ed-name', 'name', (v) => v.toUpperCase().slice(0, 24) || 'SANS NOM');
bindText('ed-id', 'id', (v) => v.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'mon-circuit');
bindText('ed-profile', 'profile');
bindText('ed-league', 'league');
for (const [id, key] of [['ed-scale', 'scale'], ['ed-width', 'width']]) {
  $(id).addEventListener('pointerdown', () => pushHistory());
  $(id).addEventListener('input', (e) => { data[key] = +e.target.value; rebuild({ validate: false }); });
  $(id).addEventListener('change', () => rebuild());
}
for (const [id, key] of [['ed-left', 'left'], ['ed-right', 'right'], ['ed-kerb', 'kerb']]) {
  $(id).addEventListener('change', (e) => { pushHistory(); data.theme[key] = e.target.value; rebuild(); });
}
$('ed-point-wide').addEventListener('change', (e) => {
  const p = data.points[selected.index];
  pushHistory();
  if (e.target.checked) p[2] = data.width; else p.length = 2;
  rebuild();
});
$('ed-point-width').addEventListener('pointerdown', () => pushHistory());
$('ed-point-width').addEventListener('input', (e) => {
  data.points[selected.index][2] = +e.target.value;
  rebuild({ validate: false });
});
$('ed-point-width').addEventListener('change', () => rebuild());
$('ed-point-del').addEventListener('click', deleteSelected);
$('ed-point-start').addEventListener('click', () => {
  // La ligne de départ part de ce point : on fait « tourner » la liste de points,
  // en gardant les éléments spéciaux à leur place sur la carte.
  const k = selected.index;
  if (!k || !track) return;
  pushHistory();
  const positions = [...data.obstacles, ...data.zones].map((f) => featureWorld(f, f.type));
  data.points = [...data.points.slice(k), ...data.points.slice(0, k)];
  track = buildTrack(data);
  [...data.obstacles, ...data.zones].forEach((f, i) => {
    const q = queryTrack(track, positions[i].x, positions[i].y, -1, {});
    f.at = +(q.dist / track.length).toFixed(4);
  });
  selected = { type: 'point', index: 0 };
  rebuild();
});
$('ed-undo').addEventListener('click', undo);
$('ed-zoom-in').addEventListener('click', () => { view.zoom = Math.min(2, view.zoom * 1.3); draw(); });
$('ed-zoom-out').addEventListener('click', () => { view.zoom = Math.max(0.03, view.zoom / 1.3); draw(); });
$('ed-fit').addEventListener('click', () => { fit(); draw(); });
$('ed-new').addEventListener('click', () => {
  if (!confirm('Commencer un nouveau circuit ? (le brouillon actuel sera remplacé)')) return;
  pushHistory();
  load(template());
});

// ---------------------------------------------------------------------------
// Chargement
// ---------------------------------------------------------------------------
function load(d) {
  data = normalize(d);
  selected = null;
  rebuild();
  fit();
  draw();
}

const loadSel = $('ed-load');
function fillLoadList() {
  loadSel.innerHTML = '<option value="">Charger un circuit…</option>';
  for (const t of TRACKS) {
    const o = document.createElement('option');
    o.value = t.id;
    o.textContent = `${t.name} (${t.profile})`;
    loadSel.append(o);
  }
}
fillLoadList();
loadSel.addEventListener('change', () => {
  const t = TRACKS.find((x) => x.id === loadSel.value);
  loadSel.value = '';
  if (!t) return;
  pushHistory();
  load(t);
});

// ---------------------------------------------------------------------------
// Tour d'essai par une IA
// ---------------------------------------------------------------------------
$('ed-ai').addEventListener('click', () => {
  const out = $('ed-ai-result');
  if (!track) return;
  out.innerHTML = 'Calcul en cours…';
  setTimeout(() => {
    const rows = [];
    for (const carId of ['nova', 'razor', 'halo']) {
      const w = createRaceWorld({
        track: buildTrack(data),
        entries: [{ def: getCar(carId), name: 'IA', profile: 'balanced' }],
        laps: 2, seed: 1, countdown: 0.1, league: 'or',
      });
      const c = w.cars[0];
      let hits = 0, respawns = 0, last = -1;
      while (!w.finished && w.time < 180) {
        w.step(1 / 120);
        if (c.hitThisStep > 150 && w.time - last > 0.5) { hits++; last = w.time; }
        if (c.ai.state.stuckTimeTotal > 5.9) respawns++;
      }
      rows.push(`${getCar(carId).name} : ${w.finished ? `<b>${c.laps.bestLap.toFixed(2)} s</b>` : '<b style="color:var(--err)">n\'a pas fini</b>'} · ${hits} choc(s)`);
    }
    out.innerHTML = `Tour d'une IA (meilleur tour) :<br>${rows.join('<br>')}`;
  }, 30);
});

// ---------------------------------------------------------------------------
// Essayer dans le jeu / exporter / importer
// ---------------------------------------------------------------------------
$('ed-play').addEventListener('click', () => {
  if (report && !report.ok && !confirm('Le circuit a des problèmes. Essayer quand même ?')) return;
  localStorage.setItem('neondrive.customTrack', JSON.stringify(data));
  window.open('./index.html?custom', '_blank');
});

function exportText() {
  const p = (pt) => `    [${pt.join(', ')}],`;
  const f = (o) => `    ${JSON.stringify(o).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,/g, ', ')},`;
  return `// Circuit « ${data.name} » — créé avec l'éditeur NEON//DRIVE.
// À enregistrer dans src/data/tracks/ puis à ajouter dans src/data/tracks/index.js.

export default {
  id: '${data.id}',
  name: '${data.name.replace(/'/g, "\\'")}',
  profile: '${data.profile}',
  league: '${data.league}',
  scale: ${data.scale},
  width: ${data.width},
  theme: { left: '${data.theme.left}', right: '${data.theme.right}', kerb: '${data.theme.kerb}' },
  points: [
${data.points.map(p).join('\n')}
  ],
  obstacles: [
${data.obstacles.map(f).join('\n')}
  ],
  zones: [
${data.zones.map(f).join('\n')}
  ],
};
`;
}

const modal = $('ed-modal');
const modalMsg = $('ed-modal-msg');
$('ed-export').addEventListener('click', () => {
  $('ed-modal-title').textContent = 'EXPORTER / IMPORTER';
  $('ed-modal-help').textContent = "Voici le fichier du circuit. Télécharge-le (ou copie-le) et envoie-le à Claude pour l'ajouter au jeu. Tu peux aussi coller ici un fichier de circuit puis « Importer ce texte ».";
  $('ed-modal-text').value = exportText();
  modalMsg.textContent = report && !report.ok ? '⚠ Attention : le circuit a encore des problèmes de vérification.' : '';
  modal.classList.remove('hidden');
});
$('ed-modal-close').addEventListener('click', () => modal.classList.add('hidden'));
$('ed-modal-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('ed-modal-text').value); modalMsg.textContent = 'Copié ✓'; }
  catch { $('ed-modal-text').select(); modalMsg.textContent = 'Sélectionne le texte et copie-le.'; }
});
$('ed-modal-download').addEventListener('click', () => {
  const blob = new Blob([$('ed-modal-text').value], { type: 'text/javascript' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${data.id}.js`;
  a.click();
  URL.revokeObjectURL(a.href);
});
$('ed-modal-import').addEventListener('click', () => {
  // Accepte un fichier de circuit (« export default { … } ») ou du JSON.
  const txt = $('ed-modal-text').value;
  try {
    let obj;
    const m = /export\s+default\s+(\{[\s\S]*\})\s*;?\s*$/.exec(txt.trim());
    if (m) obj = new Function(`return (${m[1]});`)(); // fichier créé par l'éditeur (outil local)
    else obj = JSON.parse(txt);
    if (!Array.isArray(obj.points) || obj.points.length < 4) throw new Error('il faut au moins 4 points');
    pushHistory();
    load(obj);
    modal.classList.add('hidden');
  } catch (e) {
    modalMsg.textContent = `Import impossible : ${e.message}`;
  }
});

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
window.addEventListener('resize', resize);
resize();
let draft = null;
try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* ignoré */ }
load(draft && Array.isArray(draft.points) ? draft : TRACKS[0]);
$('ed-undo').disabled = true;

// Accès pour les tests automatiques
window.__ED = { get data() { return data; }, get report() { return report; }, get track() { return track; }, toScreen, setTool, undo };
