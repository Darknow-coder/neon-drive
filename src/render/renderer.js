// Assemble l'image de chaque frame : sol, circuit, voitures, effets, filtres.

import { makeCarSprite, makeGlowSprite } from './carSprite.js';
import { lerp, lerpAngle } from '../core/math.js';

export function createRenderer(canvas, { lowEnd = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const state = { cssW: 0, cssH: 0, dpr: 1, vignette: null };
  const sprites = new Map();
  const brakeGlow = makeGlowSprite('#ff2b5a', 64);
  const headCone = makeHeadlightCone();

  function resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    // Résolution limitée : au-delà de 2x, la différence ne se voit pas mais
    // coûte très cher en performances sur téléphone.
    const dpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    state.cssW = cssW;
    state.cssH = cssH;
    state.dpr = dpr;
    state.vignette = makeVignette(canvas.width, canvas.height);
  }

  function spriteFor(car) {
    let s = sprites.get(car.def);
    if (!s) { s = makeCarSprite(car.def, car.length, car.width); sprites.set(car.def, s); }
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
    const view = { x0: camX - halfW, y0: camY - halfH, x1: camX + halfW, y1: camY + halfH, pxPerUnit };

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

    // Effets d'écran
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const player = scene.player;
    if (player && player.boosting) drawSpeedLines(ctx, W, H, player);
    ctx.drawImage(state.vignette, 0, 0);
  }

  return { resize, render, state, ctx };
}

function makeVignette(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  const r = Math.hypot(w, h) / 2;
  const g = c.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,0,30,0.62)');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  return cv;
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
