// Assemble l'image de chaque frame : sol, circuit, voitures, effets, filtres.

import { t } from '../i18n/index.js';
import { prefs } from '../core/prefs.js';
import { createWeatherFx } from './weatherFx.js';
import { makeCarSprite, makeGlowSprite } from './carSprite.js';
import { lerp, lerpAngle } from '../core/math.js';

export function createRenderer(canvas, { lowEnd = false } = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const state = { cssW: 0, cssH: 0, dpr: 1 };
  const sprites = new Map();
  let brakeGlow = makeGlowSprite('#ff2b5a', 64);
  let headCone = makeHeadlightCone();

  // Résolution adaptative : `quality` (0,5 … 1) réduit la résolution si
  // l'appareil n'arrive pas à suivre (réglé par main.js selon la fluidité).
  let quality = 1;
  function resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    // Résolution limitée : au-delà de 2x, la différence ne se voit pas mais
    // coûte très cher en performances sur téléphone.
    const maxDpr = Math.min(window.devicePixelRatio || 1, lowEnd ? 1.5 : 2);
    const dpr = Math.max(0.75, maxDpr * quality);
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
    const key = car.def.id + colors.body + colors.accent + colors.glow + (colors.finish ?? '') + (colors.motif ?? '') + (colors.number ?? '') + (colors.numStyle ?? '') + (colors.decal ?? '');
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

    // Voitures : filtre de réduction de meilleure qualité (sprites fins réduits ×2 à ×3)
    ctx.imageSmoothingQuality = 'high';
    // Fantôme (contre-la-montre) : voiture translucide
    const gh = scene.ghost;
    if (gh) {
      const s = spriteFor({ def: gh.def, livery: gh.colors });
      ctx.save();
      ctx.translate(gh.x, gh.y);
      ctx.rotate(gh.angle);
      ctx.globalAlpha = 0.38;
      ctx.drawImage(s.canvas, -s.ox, -s.oy, s.w, s.h);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

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

    ctx.imageSmoothingQuality = 'low';
    particles.draw(ctx, 1);

    // Noms des pilotes au-dessus des voitures adverses
    const fs = (11 * state.dpr) / pxPerUnit;
    ctx.font = `700 ${fs}px Rajdhani, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    for (const car of cars) {
      // Mode Élimination : la voiture menacée est signalée en rouge
      if (car.danger) {
        const x = lerp(car.prevX, car.x, alpha);
        const y = lerp(car.prevY, car.y, alpha);
        const pulse = 0.55 + 0.45 * Math.sin((scene.time || 0) * 12);
        ctx.strokeStyle = `rgba(255,43,90,${pulse})`;
        ctx.lineWidth = fs * 0.25;
        ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.stroke();
        const label = car.isPlayer ? t('DANGER !') : `${t('DANGER')} · ${car.name}`;
        const w = ctx.measureText(label).width + fs * 0.8;
        ctx.fillStyle = `rgba(255,43,90,${0.75 + 0.25 * pulse})`;
        ctx.fillRect(x - w / 2, y - 30 - fs * 1.15, w, fs * 1.25);
        ctx.fillStyle = '#fff';
        ctx.fillText(label, x, y - 30);
        continue;
      }
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
      if (!car.name || car.isPlayer || !prefs.names) continue;
      const x = lerp(car.prevX, car.x, alpha);
      const y = lerp(car.prevY, car.y, alpha) - 30;
      if (x < view.x0 - 60 || x > view.x1 + 60 || y < view.y0 - 60 || y > view.y1 + 60) continue;
      const colors = car.livery ?? car.def.colors;
      const label = car.isRival ? `★ ${car.name}` : car.name;
      ctx.fillStyle = 'rgba(7,4,26,0.6)';
      const w = ctx.measureText(label).width + fs * 0.8;
      ctx.fillRect(x - w / 2, y - fs * 1.15, w, fs * 1.25);
      if (car.isRival) {
        ctx.strokeStyle = '#ffd34d';
        ctx.lineWidth = fs * 0.1;
        ctx.strokeRect(x - w / 2, y - fs * 1.15, w, fs * 1.25);
      }
      ctx.fillStyle = car.isRival ? '#ffd34d' : colors.glow;
      ctx.fillText(label, x, y);
    }

    // Effets d'écran
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const player = scene.player;
    // Météo (pluie, neige, sable, brouillard…)
    if (trackRenderer.weather && trackRenderer.weather !== 'clear') {
      if (!weatherFx || weatherKind !== trackRenderer.weather) { weatherKind = trackRenderer.weather; weatherFx = createWeatherFx(weatherKind); }
      weatherFx.draw(ctx, W, H, cam, state.dpr, scene);
    }
    // Lignes de vitesse : en boost, et plus discrètes à très haute vitesse
    if (player) {
      const fast = player.speed / player.params.maxSpeed;
      if (prefs.effects === 'low') { /* lignes de vitesse désactivées */ }
      else if (player.boosting) drawSpeedLines(ctx, W, H, player, 1);
      else if (fast > 0.86) drawSpeedLines(ctx, W, H, player, Math.min(1, (fast - 0.86) / 0.14) * 0.5);
    }
    // (le vignettage des bords est fait en CSS : .vignette dans main.css)
  }

  /** Règle la résolution (1 = pleine). Retourne la résolution effective. */
  function setQuality(q) {
    quality = Math.max(0.5, Math.min(1, q));
    resize();
    return state.dpr;
  }

  return { resize, render, resetSprites, state, ctx, setQuality, get quality() { return quality; } };
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

function drawSpeedLines(ctx, W, H, car, k = 1) {
  if (k <= 0.02) return;
  const ang = Math.atan2(car.vy, car.vx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = `rgba(200,160,255,${(0.22 * Math.max(0.5, k)).toFixed(3)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  const R = Math.hypot(W, H) / 2;
  const n = Math.round(18 * k);
  for (let i = 0; i < n; i++) {
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

let weatherFx = null, weatherKind = null;

