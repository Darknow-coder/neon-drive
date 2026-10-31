// Assemble l'image de chaque frame : sol, circuit, voitures, effets, filtres.

import { makeCarSprite, makeGlowSprite } from './carSprite.js';
import { lerp, lerpAngle } from '../core/math.js';

export function createRenderer(canvas, { lowEnd = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const state = { cssW: 0, cssH: 0, dpr: 1 };
  const sprites = new Map();
  let brakeGlow = makeGlowSprite('#ff2b5a', 64);
  let headCone = makeHeadlightCone();

  function resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    // Résolution limitée : au-delà de 2x, la différence ne se voit pas mais
    // coûte très cher en performances sur téléphone.
    const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    state.cssW = cssW;
    state.cssH = cssH;
    state.dpr = dpr;
    // Sur mobile, l'événement « resize » arrive très souvent (barre d'adresse
    // qui apparaît/disparaît) : on ne réalloue le canvas que si nécessaire.
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /** Recrée les petites images en cache (après une perte du contexte graphique). */
  function resetSprites() {
    sprites.clear();
    brakeGlow = makeGlowSprite('#ff2b5a', 64);
    headCone = makeHeadlightCone();
  }

  // Un sprite par combinaison voiture + livrée
  function spriteFor(car) {
    const colors = car.livery ?? car.def.colors;
    const key = car.def.id + colors.body + colors.accent + colors.glow;
    let s = sprites.get(key);
    if (!s) { s = makeCarSprite(car.def, car.length, car.width, colors); sprites.set(key, s); }
    return s;
  }

  /**
   * @param scene { trackRenderer, cars, particles, camera }
   * @param alpha interpolation entre deux pas physiques
   */
  function render(scene, alpha) {
    const { camera: cam, trackRenderer, cars, particles } = scene;
    const W = canvas.width;
    const H = canvas.height;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = trackRenderer.theme.ground;
    ctx.fillRect(0, 0, W, H);

    const camX = lerp(cam.prevX ?? cam.x, cam.x, alpha) + cam.shakeX;
    const camY = lerp(cam.prevY ?? cam.y, cam.y, alpha) + cam.shakeY;
    const pxPerUnit = cam.zoom * state.dpr;
    ctx.setTransform(pxPerUnit, 0, 0, pxPerUnit, W / 2 - camX * pxPerUnit, H / 2 - camY * pxPerUnit);

    const halfW = W / 2 / pxPerUnit;
    const halfH = H / 2 / pxPerUnit;
    const view = { x0: camX - halfW, y0: camY - halfH, x1: camX + halfW, y1: camY + halfH, pxPerUnit, time: scene.time || 0 };

    trackRenderer.draw(ctx, view);
    particles.draw(ctx, 0);

    // Phares (lumière additive)
    ctx.globalCompositeOperation = 'lighter';
    for (const car of cars) {
      const x = lerp(car.prevX, car.x, alpha);
      const y = lerp(car.prevY, car.y, alpha);
      const a = lerpAngle(car.prevAngle, car.angle, alpha);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.globalAlpha = 0.4;
      ctx.drawImage(headCone, car.length * 0.4, -headCone.height / 2);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // Voitures
    for (const car of cars) {
      const s = spriteFor(car);
      const x = lerp(car.prevX, car.x, alpha);
      const y = lerp(car.prevY, car.y, alpha);
      const a = lerpAngle(car.prevAngle, car.angle, alpha);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.drawImage(s.canvas, -s.ox, -s.oy, s.w, s.h);
      if (car.braking || car.brakeLight) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.85;
        const hl = car.length / 2;
        ctx.drawImage(brakeGlow, -hl - 12, -car.width / 2 - 8, 20, 20);
        ctx.drawImage(brakeGlow, -hl - 12, car.width / 2 - 12, 20, 20);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    particles.draw(ctx, 1);

    // Noms des pilotes au-dessus des voitures adverses
    const fs = (11 * state.dpr) / pxPerUnit;
    ctx.font = `700 ${fs}px Rajdhani, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const car of cars) {
      if (car.isPlayer && cars.length > 1) {
        // Marqueur au-dessus du joueur : un chevron cyan qui pulse doucement
        const x = lerp(car.prevX, car.x, alpha);
        const y = lerp(car.prevY, car.y, alpha) - 34;
        const k = fs / 11;
        const bob = Math.sin((scene.time || 0) * 5) * 2 * k;
        ctx.fillStyle = '#00f0ff';
        ctx.beginPath();
        ctx.moveTo(x - 7 * k, y - 8 * k + bob);
        ctx.lineTo(x + 7 * k, y - 8 * k + bob);
        ctx.lineTo(x, y + bob);
        ctx.closePath();
        ctx.fill();
        continue;
      }
      if (!car.name || car.isPlayer) continue;
      const x = lerp(car.prevX, car.x, alpha);
      const y = lerp(car.prevY, car.y, alpha) - 30;
      if (x < view.x0 - 60 || x > view.x1 + 60 || y < view.y0 - 60 || y > view.y1 + 60) continue;
      const colors = car.livery ?? car.def.colors;
      ctx.fillStyle = 'rgba(7,4,26,0.6)';
      const w = ctx.measureText(car.name).width + fs * 0.8;
      ctx.fillRect(x - w / 2, y - fs * 1.15, w, fs * 1.25);
      ctx.fillStyle = colors.glow;
      ctx.fillText(car.name, x, y);
    }

    // Effets d'écran
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const player = scene.player;
    if (trackRenderer.weather === 'rain') drawRain(ctx, W, H, cam, state.dpr);
    if (player && player.boosting) drawSpeedLines(ctx, W, H, player);
    // (le vignettage des bords est fait en CSS : .vignette dans main.css)
  }

  return { resize, render, resetSprites, state, ctx };
}

function makeHeadlightCone() {
  const L = 170;
  const cv = document.createElement('canvas');
  cv.width = L;
  cv.height = 150;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, L, 0);
  g.addColorStop(0, 'rgba(170,240,255,0.35)');
  g.addColorStop(1, 'rgba(170,240,255,0)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, 75 - 9);
  c.lineTo(L, 0);
  c.lineTo(L, 150);
  c.lineTo(0, 75 + 9);
  c.closePath();
  c.fill();
  return cv;
}

function drawSpeedLines(ctx, W, H, car) {
  const ang = Math.atan2(car.vy, car.vx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(200,160,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  const R = Math.hypot(W, H) / 2;
  for (let i = 0; i < 18; i++) {
    const a = Math.random() * Math.PI * 2;
    // Plus de lignes sur les côtés, par rapport à la direction de la course
    if (Math.abs(Math.cos(a - ang)) > 0.92) continue;
    const r0 = R * (0.55 + Math.random() * 0.25);
    const r1 = r0 + R * (0.15 + Math.random() * 0.2);
    ctx.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0);
    ctx.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1);
  }
  ctx.stroke();
  ctx.restore();
}

// ---------- Pluie (effet d'écran) ----------
const drops = [];
const ripples = [];
let lastCamX = null, lastCamY = null;
function drawRain(ctx, W, H, cam, dpr) {
  if (!drops.length) {
    for (let i = 0; i < 140; i++) drops.push({ x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 16, s: 0.6 + Math.random() * 0.8 });
  }
  // Les gouttes glissent légèrement à l'opposé du mouvement de la caméra
  const dx = lastCamX === null ? 0 : (cam.x - lastCamX) * cam.zoom * dpr * 0.6;
  const dy = lastCamY === null ? 0 : (cam.y - lastCamY) * cam.zoom * dpr * 0.6;
  lastCamX = cam.x; lastCamY = cam.y;
  ctx.fillStyle = 'rgba(20,30,70,0.18)'; // ambiance assombrie
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(170,190,255,0.35)';
  ctx.lineWidth = 1.2 * dpr;
  ctx.beginPath();
  for (const d of drops) {
    d.x += (2.2 * d.s) * dpr - dx;
    d.y += (6 * d.s) * dpr - dy;
    if (d.y > H || d.x > W || d.x < 0 || d.y < 0) { d.x = Math.random() * W; d.y = Math.random() * H * 0.2; }
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.l * 0.35 * dpr, d.y - d.l * dpr);
  }
  ctx.stroke();
  // Ronds dans l'eau
  if (ripples.length < 22 && Math.random() < 0.6) ripples.push({ x: Math.random() * W, y: Math.random() * H, r: 1, a: 0.5 });
  ctx.lineWidth = 1 * dpr;
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += 0.7 * dpr; r.a -= 0.018; r.x -= dx; r.y -= dy;
    if (r.a <= 0) { ripples.splice(i, 1); continue; }
    ctx.strokeStyle = `rgba(170,200,255,${r.a})`;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 1.6, r.r, 0, 0, Math.PI * 2); ctx.stroke();
  }
}
