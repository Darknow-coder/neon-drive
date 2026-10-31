// Écran du garage : choisir sa voiture, voir ses caractéristiques, la peindre.

import { CARS, PAINT_COLORS, STAT_LABELS, getCar } from '../data/cars.js';
import { isOwned, liveryFor, setLivery, unlockLabel } from '../progression/garage.js';
import { makeCarSprite } from '../render/carSprite.js';

const $ = (id) => document.getElementById(id);

export function createGarage({ save, onSave, onClose }) {
  let index = Math.max(0, CARS.findIndex((c) => c.id === save.selectedCar));
  let raf = 0;
  let angle = -Math.PI / 2;
  let sprite = null;
  const canvas = $('garage-canvas');
  const ctx = canvas.getContext('2d');

  const car = () => CARS[index];

  function refreshSprite() {
    const c = car();
    sprite = makeCarSprite(c, 46, 24, liveryFor(save, c.id));
  }

  function drawPreview(t) {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    // Socle lumineux
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.45);
    g.addColorStop(0, 'rgba(138,43,255,0.35)');
    g.addColorStop(1, 'rgba(138,43,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,240,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(W / 2, H * 0.55, W * 0.36, H * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Voiture qui tourne lentement
    angle += 0.006;
    const owned = isOwned(save, car().id);
    const scale = 5.4;
    ctx.save();
    ctx.translate(W / 2, H * 0.55);
    ctx.rotate(angle);
    ctx.drawImage(sprite.canvas, -sprite.ox * scale, -sprite.oy * scale, sprite.w * scale, sprite.h * scale);
    if (!owned) {
      // Silhouette pour une voiture verrouillée
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(10,6,30,0.92)';
      ctx.fillRect(-sprite.ox * scale, -sprite.oy * scale, sprite.w * scale, sprite.h * scale);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    if (!owned) {
      ctx.font = '700 64px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', W / 2, H * 0.55);
    }
    raf = requestAnimationFrame(drawPreview);
  }

  function swatches(rootId, part) {
    const root = $(rootId);
    root.innerHTML = '';
    const current = liveryFor(save, car().id)[part];
    for (const col of PAINT_COLORS) {
      const b = document.createElement('button');
      b.className = 'swatch' + (col.toLowerCase() === current.toLowerCase() ? ' on' : '');
      b.style.background = col;
      b.style.color = col;
      b.setAttribute('aria-label', `Couleur ${col}`);
      b.addEventListener('click', () => {
        setLivery(save, car().id, part, col);
        onSave();
        render();
      });
      root.append(b);
    }
  }

  function render() {
    const c = car();
    const owned = isOwned(save, c.id);
    refreshSprite();
    $('garage-name').textContent = c.name;
    $('garage-tagline').textContent = c.tagline;
    $('garage-count').textContent = `${save.garage.owned.length} / ${CARS.length} voitures`;
    const stats = $('garage-stats');
    stats.innerHTML = '';
    for (const [key, label] of Object.entries(STAT_LABELS)) {
      const v = c.stats[key];
      const row = document.createElement('div');
      row.className = 'stat-row';
      const bars = Array.from({ length: 10 }, (_, k) => `<i class="${k < v ? 'on' : ''}${k < v && v >= 8 ? ' hi' : ''}"></i>`).join('');
      row.innerHTML = `<span>${label}</span><div class="stat-bar">${bars}</div><b>${v}</b>`;
      stats.append(row);
    }
    $('garage-paint').classList.toggle('hidden', !owned);
    $('garage-lock').classList.toggle('hidden', owned);
    $('garage-lock').textContent = owned ? '' : `🔒 ${unlockLabel(c)}`;
    const sel = $('garage-select');
    const isSelected = save.selectedCar === c.id;
    sel.disabled = !owned || isSelected;
    sel.textContent = !owned ? 'VERROUILLÉE' : isSelected ? 'VOITURE ACTUELLE ✓' : 'CHOISIR CETTE VOITURE';
    if (owned) { swatches('paint-body', 'body'); swatches('paint-accent', 'accent'); }
  }

  $('garage-prev').addEventListener('click', () => { index = (index - 1 + CARS.length) % CARS.length; render(); });
  $('garage-next').addEventListener('click', () => { index = (index + 1) % CARS.length; render(); });
  $('garage-select').addEventListener('click', () => {
    if (!isOwned(save, car().id)) return;
    save.selectedCar = car().id;
    onSave();
    render();
  });
  $('garage-back').addEventListener('click', () => close());

  function open() {
    index = Math.max(0, CARS.findIndex((c) => c.id === save.selectedCar));
    render();
    $('garage').classList.remove('hidden');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawPreview);
  }

  function close() {
    cancelAnimationFrame(raf);
    $('garage').classList.add('hidden');
    onClose?.();
  }

  return { open, close };
}

export const carName = (id) => getCar(id).name;
