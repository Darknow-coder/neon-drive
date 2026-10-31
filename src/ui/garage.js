// Écran du garage : choisir sa voiture, voir ses caractéristiques, la peindre.

import { CARS, PAINT_COLORS, STAT_LABELS, getCar } from '../data/cars.js';
import { isOwned, liveryFor, setLivery, unlockLabel } from '../progression/garage.js';
import { makeCarSprite } from '../render/carSprite.js';
import { carLevel, fragmentsOf, upgradeCost, upgradeCar, unlockFragments, unlockWithFragments } from '../progression/economy.js';
import { MAX_LEVEL } from '../data/economy.js';

const $ = (id) => document.getElementById(id);

export function createGarage({ save, onSave, onClose, sfx }) {
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
    const scale = 4.9;
    ctx.save();
    ctx.translate(W / 2, H * 0.55);
    ctx.rotate(angle);
    ctx.drawImage(sprite.canvas, -sprite.ox * scale, -sprite.oy * scale, sprite.w * scale, sprite.h * scale);
    if (!owned) {
      // Voiture verrouillée : visible en couleurs, mais légèrement assombrie
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(7,4,26,0.38)';
      ctx.fillRect(-sprite.ox * scale, -sprite.oy * scale, sprite.w * scale, sprite.h * scale);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
    if (!owned) {
      // Badge cadenas dans le coin
      ctx.fillStyle = 'rgba(14,8,40,0.9)';
      ctx.strokeStyle = '#ffd34d';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(W - 46, 46, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.font = '700 30px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🔒', W - 46, 48);
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

  // Miniatures de toutes les voitures (dessinées une fois, mises à jour au besoin)
  const thumbs = $('garage-thumbs');
  function renderThumbs() {
    thumbs.innerHTML = '';
    CARS.forEach((c, k) => {
      const owned = isOwned(save, c.id);
      const b = document.createElement('button');
      b.className = 'thumb' + (k === index ? ' view' : '') + (save.selectedCar === c.id ? ' current' : '') + (owned ? '' : ' locked');
      const cv = document.createElement('canvas');
      cv.width = 136; cv.height = 104;
      const tc = cv.getContext('2d');
      const sp = makeCarSprite(c, 46, 24, liveryFor(save, c.id));
      const sc = 1.45;
      tc.translate(68, 52);
      tc.rotate(-Math.PI / 2);
      tc.drawImage(sp.canvas, -sp.ox * sc, -sp.oy * sc, sp.w * sc, sp.h * sc);
      if (!owned) {
        tc.globalCompositeOperation = 'source-atop';
        tc.fillStyle = 'rgba(7,4,26,0.32)';
        tc.fillRect(-200, -200, 400, 400);
      }
      b.append(cv);
      b.append(document.createTextNode(c.name));
      if (!owned) { const lk = document.createElement('span'); lk.className = 'lk'; lk.textContent = '🔒'; b.append(lk); }
      else { const lv = document.createElement('span'); lv.className = 'lvl'; lv.textContent = `N${carLevel(save, c.id)}`; b.append(lv); }
      b.addEventListener('click', () => { index = k; render(); });
      thumbs.append(b);
    });
    thumbs.children[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function render() {
    renderThumbs();
    const c = car();
    const owned = isOwned(save, c.id);
    refreshSprite();
    $('garage-name').textContent = c.name;
    $('garage-tagline').textContent = c.tagline;
    $('garage-count').textContent = `${save.garage.owned.length} / ${CARS.length} voitures`;
    $('garage-credits').textContent = `⚡ ${save.credits}`;
    // Niveau, fragments et amélioration / déblocage anticipé
    const lvl = carLevel(save, c.id);
    const have = fragmentsOf(save, c.id);
    const upBtn = $('garage-upgrade');
    upBtn.classList.remove('can');
    if (owned) {
      $('garage-level').innerHTML = `NIVEAU <b>${lvl}</b> / ${MAX_LEVEL}${lvl > 1 ? ` · performances +${((lvl - 1) * 1.1).toFixed(1)} %` : ''}`;
      const cost = upgradeCost(save, c.id);
      if (cost) {
        $('frag-text').textContent = `Fragments ${c.name}`;
        $('frag-num').textContent = `${have} / ${cost.fragments}`;
        $('frag-fill').style.width = `${Math.min(100, (have / cost.fragments) * 100)}%`;
        const can = have >= cost.fragments && save.credits >= cost.credits;
        upBtn.textContent = `AMÉLIORER → NIV. ${cost.level} (⚡ ${cost.credits} + ${cost.fragments} fragments)`;
        upBtn.disabled = !can;
        upBtn.classList.toggle('can', can);
        $('garage-frags').classList.remove('hidden');
      } else {
        upBtn.textContent = 'NIVEAU MAXIMUM ✓';
        upBtn.disabled = true;
        $('garage-frags').classList.add('hidden');
      }
      upBtn.onclick = () => {
        const r = upgradeCar(save, c.id);
        if (r.ok) { onSave(); sfx?.unlock(); render(); }
      };
    } else {
      $('garage-level').textContent = '';
      const need = unlockFragments(c.id);
      $('frag-text').textContent = 'Fragments pour la débloquer tout de suite';
      $('frag-num').textContent = `${have} / ${need}`;
      $('frag-fill').style.width = `${Math.min(100, (have / need) * 100)}%`;
      $('garage-frags').classList.remove('hidden');
      const can = have >= need;
      upBtn.textContent = can ? 'DÉBLOQUER AVEC LES FRAGMENTS' : 'Fragments dans les packs (route, boutique)';
      upBtn.disabled = !can;
      upBtn.classList.toggle('can', can);
      upBtn.onclick = () => {
        if (unlockWithFragments(save, c.id).ok) { onSave(); sfx?.unlock(); render(); }
      };
    }
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
    $('garage-lock').textContent = owned ? '' : `🔒 ${unlockLabel(c)} — aperçu`;
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
