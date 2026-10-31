// Système de particules léger : un nombre maximum fixe de particules,
// stockées dans des tableaux réutilisés (aucune création d'objet en jeu,
// donc pas de saccades dues au ramasse-miettes sur mobile).

import { makeGlowSprite } from './carSprite.js';

export const P_SMOKE = 0;
export const P_SPARK = 1;
export const P_FLAME = 2;

export function createParticles(max = 500) {
  const x = new Float32Array(max), y = new Float32Array(max);
  const vx = new Float32Array(max), vy = new Float32Array(max);
  const life = new Float32Array(max), maxLife = new Float32Array(max);
  const size = new Float32Array(max), grow = new Float32Array(max);
  const type = new Uint8Array(max);
  const color = new Array(max).fill(null);
  let next = 0;

  const sprites = new Map();
  const spriteFor = (col) => {
    let s = sprites.get(col);
    if (!s) { s = makeGlowSprite(col, 64); sprites.set(col, s); }
    return s;
  };

  function spawn(t, px, py, pvx, pvy, lifeS, sz, gr, col) {
    const i = next;
    next = (next + 1) % max;
    type[i] = t; x[i] = px; y[i] = py; vx[i] = pvx; vy[i] = pvy;
    life[i] = maxLife[i] = lifeS; size[i] = sz; grow[i] = gr; color[i] = col;
  }

  function update(dt) {
    for (let i = 0; i < max; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      x[i] += vx[i] * dt;
      y[i] += vy[i] * dt;
      const drag = type[i] === P_SPARK ? 3 : 2.2;
      vx[i] -= vx[i] * drag * dt;
      vy[i] -= vy[i] * drag * dt;
      size[i] += grow[i] * dt;
    }
  }

  function draw(ctx, layer) {
    // layer 0 : sous les voitures (fumée) ; layer 1 : au-dessus (étincelles, flammes)
    if (layer === 0) {
      for (let i = 0; i < max; i++) {
        if (life[i] <= 0 || type[i] !== P_SMOKE) continue;
        const k = life[i] / maxLife[i];
        ctx.globalAlpha = k * 0.35;
        const s = size[i];
        ctx.drawImage(spriteFor(color[i]), x[i] - s, y[i] - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < max; i++) {
      if (life[i] <= 0 || type[i] !== P_FLAME) continue;
      const k = life[i] / maxLife[i];
      ctx.globalAlpha = k;
      const s = size[i] * (0.5 + k * 0.5);
      ctx.drawImage(spriteFor(color[i]), x[i] - s, y[i] - s, s * 2, s * 2);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < max; i++) {
      if (life[i] <= 0 || type[i] !== P_SPARK) continue;
      const k = life[i] / maxLife[i];
      ctx.globalAlpha = k;
      ctx.strokeStyle = color[i];
      ctx.lineWidth = size[i];
      ctx.beginPath();
      ctx.moveTo(x[i], y[i]);
      ctx.lineTo(x[i] - vx[i] * 0.03, y[i] - vy[i] * 0.03);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function clear() {
    life.fill(0);
  }

  return { spawn, update, draw, clear, resetSprites: () => sprites.clear() };
}
