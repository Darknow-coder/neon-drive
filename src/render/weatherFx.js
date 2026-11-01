// Effets de météo dessinés par-dessus la course (en pixels d'écran) :
// pluie, orage, neige, sable, brouillard, crépuscule.

import { lastLightning } from '../data/weather.js';

export function createWeatherFx(kind) {
  const parts = [];
  const ripples = [];
  let lastX = null, lastY = null;
  let W0 = 0, H0 = 0;

  function camDelta(cam, dpr, k = 0.6) {
    const dx = lastX === null ? 0 : (cam.x - lastX) * cam.zoom * dpr * k;
    const dy = lastY === null ? 0 : (cam.y - lastY) * cam.zoom * dpr * k;
    lastX = cam.x; lastY = cam.y;
    return [dx, dy];
  }
  function seed(n, W, H, make) {
    if (parts.length && W === W0 && H === H0) return;
    parts.length = 0; W0 = W; H0 = H;
    for (let i = 0; i < n; i++) parts.push(make());
  }
  const wrap = (p, W, H) => {
    if (p.x < -40) p.x += W + 80; else if (p.x > W + 40) p.x -= W + 80;
    if (p.y < -40) p.y += H + 80; else if (p.y > H + 40) p.y -= H + 80;
  };

  function rain(ctx, W, H, cam, dpr, dark = 0.18) {
    seed(140, W, H, () => ({ x: Math.random() * W, y: Math.random() * H, l: 8 + Math.random() * 16, s: 0.6 + Math.random() * 0.8 }));
    const [dx, dy] = camDelta(cam, dpr);
    ctx.fillStyle = `rgba(20,30,70,${dark})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(170,190,255,0.35)';
    ctx.lineWidth = 1.2 * dpr;
    ctx.beginPath();
    for (const d of parts) {
      d.x += 2.2 * d.s * dpr - dx;
      d.y += 6 * d.s * dpr - dy;
      if (d.y > H || d.x > W || d.x < 0 || d.y < 0) { d.x = Math.random() * W; d.y = Math.random() * H * 0.2; }
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.l * 0.35 * dpr, d.y - d.l * dpr);
    }
    ctx.stroke();
    if (ripples.length < 22 && Math.random() < 0.6) ripples.push({ x: Math.random() * W, y: Math.random() * H, r: 1, a: 0.5 });
    ctx.lineWidth = dpr;
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 0.7 * dpr; r.a -= 0.018; r.x -= dx; r.y -= dy;
      if (r.a <= 0) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(170,200,255,${r.a})`;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r * 1.6, r.r, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }

  // Éclair : flash blanc qui scintille + zébrure
  let bolt = null, boltK = -2;
  function lightning(ctx, W, H, t, dpr) {
    const { since, k } = lastLightning(t);
    if (since > 0.6) return;
    if (k !== boltK) {
      boltK = k;
      let x = W * (0.15 + Math.random() * 0.7), y = -10;
      bolt = [[x, y]];
      while (y < H * (0.55 + Math.random() * 0.3)) { x += (Math.random() - 0.5) * 90 * dpr; y += (30 + Math.random() * 40) * dpr; bolt.push([x, y]); }
    }
    const flick = since < 0.08 ? 1 : since < 0.14 ? 0.3 : since < 0.22 ? 0.85 : Math.max(0, 1 - (since - 0.22) / 0.38) * 0.5;
    ctx.fillStyle = `rgba(220,225,255,${0.55 * flick})`;
    ctx.fillRect(0, 0, W, H);
    if (since < 0.3 && bolt) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255,255,230,${flick})`;
      ctx.shadowColor = '#c8b8ff'; ctx.shadowBlur = 18 * dpr;
      ctx.lineWidth = 3 * dpr;
      ctx.beginPath(); bolt.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      ctx.restore();
    }
  }

  function snow(ctx, W, H, cam, dpr) {
    seed(110, W, H, () => ({ x: Math.random() * W, y: Math.random() * H, r: 1 + Math.random() * 2.6, s: 0.4 + Math.random(), ph: Math.random() * 6 }));
    const [dx, dy] = camDelta(cam, dpr, 0.9);
    ctx.fillStyle = 'rgba(170,200,255,0.07)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(240,248,255,0.8)';
    const t = performance.now() / 1000;
    ctx.beginPath();
    for (const p of parts) {
      p.x += (Math.sin(t * 1.3 + p.ph) * 0.6 + 0.4) * p.s * dpr - dx * p.s;
      p.y += 1.3 * p.s * dpr - dy * p.s;
      wrap(p, W, H);
      ctx.moveTo(p.x + p.r * dpr, p.y);
      ctx.arc(p.x, p.y, p.r * dpr, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  function sand(ctx, W, H, cam, dpr, wind) {
    seed(90, W, H, () => ({ x: Math.random() * W, y: Math.random() * H, l: 10 + Math.random() * 30, s: 0.5 + Math.random() }));
    const [dx, dy] = camDelta(cam, dpr, 0.8);
    const k = wind?.k ?? 0;
    ctx.fillStyle = `rgba(255,140,60,${0.08 + 0.14 * k})`;
    ctx.fillRect(0, 0, W, H);
    const ang = wind && (wind.ax || wind.ay) ? Math.atan2(wind.ay, wind.ax) : 0.3;
    const cx = Math.cos(ang), cy = Math.sin(ang);
    const sp = (2 + 14 * k) * dpr;
    ctx.strokeStyle = `rgba(255,200,140,${0.18 + 0.4 * k})`;
    ctx.lineWidth = 1.4 * dpr;
    ctx.beginPath();
    for (const p of parts) {
      p.x += cx * sp * p.s - dx; p.y += cy * sp * p.s - dy;
      wrap(p, W, H);
      const l = p.l * (0.4 + 1.6 * k) * dpr;
      ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - cx * l, p.y - cy * l);
    }
    ctx.stroke();
  }

  // Brouillard : clair autour de la voiture, épais au loin, avec des bancs qui dérivent
  let banks = null;
  function fog(ctx, W, H, cam, dpr) {
    const [dx, dy] = camDelta(cam, dpr, 1);
    const D = Math.hypot(W, H);
    if (!banks || W !== W0) { W0 = W; banks = Array.from({ length: 7 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (0.18 + Math.random() * 0.2) * D, vx: (Math.random() - 0.5) * 0.4 })); }
    for (const b of banks) {
      b.x += b.vx * dpr - dx; b.y -= dy;
      if (b.x < -b.r) b.x += W + 2 * b.r; else if (b.x > W + b.r) b.x -= W + 2 * b.r;
      if (b.y < -b.r) b.y += H + 2 * b.r; else if (b.y > H + b.r) b.y -= H + 2 * b.r;
      const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      g.addColorStop(0, 'rgba(170,180,205,0.22)'); g.addColorStop(1, 'rgba(170,180,205,0)');
      ctx.fillStyle = g; ctx.fillRect(b.x - b.r, b.y - b.r, b.r * 2, b.r * 2);
    }
    const g = ctx.createRadialGradient(W / 2, H / 2, D * 0.16, W / 2, H / 2, D * 0.52);
    g.addColorStop(0, 'rgba(140,150,180,0)');
    g.addColorStop(0.55, 'rgba(140,150,180,0.45)');
    g.addColorStop(1, 'rgba(150,160,190,0.86)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  function dusk(ctx, W, H, cam, dpr) {
    seed(46, W, H, () => ({ x: Math.random() * W, y: Math.random() * H, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.08, s: 0.6 + Math.random() * 0.9 }));
    const [dx, dy] = camDelta(cam, dpr, 0.85);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,110,80,0.16)'); g.addColorStop(0.6, 'rgba(255,90,150,0.05)'); g.addColorStop(1, 'rgba(120,40,160,0.10)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    for (const p of parts) {
      p.x += (1.1 * p.s) * dpr - dx * p.s; p.y += (0.9 * p.s) * dpr - dy * p.s; p.a += p.va;
      wrap(p, W, H);
      ctx.save();
      ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.abs(Math.sin(p.a * 1.7)) * 0.7 + 0.3);
      ctx.fillStyle = 'rgba(255,170,215,0.85)';
      ctx.beginPath(); ctx.ellipse(0, 0, 4.2 * dpr * p.s, 2.6 * dpr * p.s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  return {
    draw(ctx, W, H, cam, dpr, scene) {
      if (kind === 'rain') rain(ctx, W, H, cam, dpr);
      else if (kind === 'storm') { rain(ctx, W, H, cam, dpr, 0.3); lightning(ctx, W, H, scene.time || 0, dpr); }
      else if (kind === 'snow') snow(ctx, W, H, cam, dpr);
      else if (kind === 'sand') sand(ctx, W, H, cam, dpr, scene.wind);
      else if (kind === 'fog') fog(ctx, W, H, cam, dpr);
      else if (kind === 'dusk') dusk(ctx, W, H, cam, dpr);
    },
  };
}
