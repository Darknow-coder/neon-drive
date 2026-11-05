// Mini-carte des courses : le tracé (dessiné une fois) et un point par voiture.
// Joueur : gros point blanc cerclé de sa couleur · rival : anneau doré ·
// fantôme du chrono : point creux. Mise à jour ~15 fois par seconde (léger).

const BG_PAD = 10;

export function createMinimap(canvas, track, { theme } = {}) {
  const ctx = canvas.getContext('2d');
  let bg = null, W = 0, H = 0, sc = 1, ox = 0, oy = 0, dpr = 1, last = 0;
  const edge = theme?.left ?? '#00f0ff';

  /** (Re)prépare l'image du tracé à la taille affichée. */
  function build() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.round(r.width * dpr); H = Math.round(r.height * dpr);
    canvas.width = W; canvas.height = H;
    const b = track.bounds;
    const pad = BG_PAD * dpr;
    sc = Math.min((W - pad * 2) / (b.maxX - b.minX), (H - pad * 2) / (b.maxY - b.minY));
    ox = (W - (b.maxX - b.minX) * sc) / 2 - b.minX * sc;
    oy = (H - (b.maxY - b.minY) * sc) / 2 - b.minY * sc;
    bg = document.createElement('canvas');
    bg.width = W; bg.height = H;
    const c = bg.getContext('2d');
    const path = () => {
      c.beginPath();
      for (let i = 0; i <= track.count; i += 2) { const k = i % track.count; const x = track.x[k] * sc + ox, y = track.y[k] * sc + oy; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.closePath();
    };
    c.lineJoin = 'round'; c.lineCap = 'round';
    const roadW = Math.max(4 * dpr, track.hw[0] * 2 * sc);
    path(); c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = roadW + 3 * dpr; c.stroke();
    path(); c.strokeStyle = 'rgba(40,30,90,0.95)'; c.lineWidth = roadW; c.stroke();
    path(); c.strokeStyle = edge; c.globalAlpha = 0.75; c.lineWidth = Math.max(1.2 * dpr, roadW * 0.18); c.stroke();
    c.globalAlpha = 1;
    // Ligne de départ
    const n = [-track.ty[0], track.tx[0]];
    const sx = track.x[0] * sc + ox, sy = track.y[0] * sc + oy, h = roadW * 0.8;
    c.strokeStyle = '#ffffff'; c.lineWidth = 2 * dpr;
    c.beginPath(); c.moveTo(sx - n[0] * h, sy - n[1] * h); c.lineTo(sx + n[0] * h, sy + n[1] * h); c.stroke();
    return true;
  }

  const P = (x, y) => [x * sc + ox, y * sc + oy];
  function dot(x, y, r, fill, ring = null, ringW = 1.5) {
    const [px, py] = P(x, y);
    ctx.beginPath(); ctx.arc(px, py, r * dpr, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (ring) { ctx.strokeStyle = ring; ctx.lineWidth = ringW * dpr; ctx.stroke(); }
  }

  return {
    /** Dessine la carte (les appels trop rapprochés sont ignorés). */
    draw(cars, player, ghost = null, now = performance.now()) {
      if (now - last < 66) return;
      last = now;
      if (!bg || canvas.width !== Math.round(canvas.getBoundingClientRect().width * dpr)) { if (!build()) return; }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(bg, 0, 0);
      if (ghost) dot(ghost.x, ghost.y, 3.2, null, 'rgba(255,255,255,0.75)', 1.4);
      for (const c of cars) {
        if (c === player || c.eliminated) continue;
        const col = c.livery?.body ?? c.def.colors.body;
        dot(c.x, c.y, c.isRival ? 3.4 : 2.7, col, c.isRival ? '#ffd34d' : 'rgba(0,0,0,0.6)', c.isRival ? 1.8 : 1);
      }
      if (player) dot(player.x, player.y, 4.4, '#ffffff', player.livery?.glow ?? '#00f0ff', 2.4);
    },
    /** Après un changement de taille d'écran. */
    invalidate() { bg = null; },
  };
}
