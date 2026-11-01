// Ouverture de pack « comme en vrai » :
//  1. le pack scellé flotte, il faut le toucher ;
//  2. il tremble de plus en plus fort (le son monte) ;
//  3. il explose dans un flash, se déchire, des étincelles jaillissent ;
//  4. les cartes sont distribuées face cachée : on les retourne une à une.
//     Rareté selon le nombre de fragments (commune / rare / épique).
// Les récompenses sans pack (crédits, voiture) ont leur propre révélation.

import { PACKS, UNLOCK_FRAGMENTS } from '../data/economy.js';
import { isOwned, liveryFor } from '../progression/garage.js';
import { fragmentsOf, upgradeCost } from '../progression/economy.js';
import { carIcon } from './carIcon.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);

const RARITY = {
  common: { label: 'COMMUNE', color: '#00f0ff' },
  rare: { label: 'RARE', color: '#b07aff' },
  epic: { label: 'ÉPIQUE', color: '#ffd34d' },
};

// ---------------------------------------------------------------------------
// Particules (étincelles de l'explosion et des cartes)
// ---------------------------------------------------------------------------
function createFx(canvas) {
  const ctx = canvas.getContext('2d');
  const parts = [];
  let raf = 0;
  let dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
  }
  function burst(x, y, color, n = 120, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (120 + Math.random() * 520) * power;
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80 * power,
        life: 0.6 + Math.random() * 0.9, max: 0, size: 1.5 + Math.random() * 3,
        color: Math.random() < 0.3 ? '#ffffff' : color,
      });
      parts[parts.length - 1].max = parts[parts.length - 1].life;
    }
  }
  function sparks(x, y, color, n = 3) { burst(x, y, color, n, 0.25); }
  let last = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.vy += 420 * dt; // gravité
      p.vx *= 1 - 1.2 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.life / p.max;
      ctx.globalAlpha = k;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * dpr;
      ctx.beginPath();
      ctx.moveTo(p.x * dpr, p.y * dpr);
      ctx.lineTo((p.x - p.vx * 0.03) * dpr, (p.y - p.vy * 0.03) * dpr);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  return {
    start() { resize(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); parts.length = 0; ctx.clearRect(0, 0, canvas.width, canvas.height); },
    burst, sparks, resize,
  };
}

// ---------------------------------------------------------------------------
// Scène
// ---------------------------------------------------------------------------
/**
 * Affiche une suite de récompenses.
 * @param results [{ packId?, gains?: [{car, amount}], credits?, car? }]
 */
export function showRewards(save, results, { sfx, onClose } = {}) {
  const stage = $('pack-open');
  const fx = createFx($('pack-fx'));
  const queue = results.slice();
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  function close() {
    timers.forEach(clearTimeout);
    fx.stop();
    stage.classList.add('hidden');
    onClose?.();
  }

  function next() {
    timers.forEach(clearTimeout);
    timers.length = 0;
    const r = queue.shift();
    if (!r) { close(); return; }
    if (r.packId) showPack(r);
    else if (r.gains?.length) showDirect(r);
    else showSimple(r);
  }

  function reset(color) {
    stage.style.setProperty('--pc', color);
    $('pack-cards').innerHTML = '';
    $('pack-hint').textContent = '';
    $('pack-extra').innerHTML = '';
    $('pack-flipall').classList.add('hidden');
    $('pack-ok').classList.add('hidden');
    const wrap = $('pack-wrap');
    wrap.className = 'pack-wrap gone';
    stage.querySelector('.reward-big')?.remove();
    stage.classList.remove('hidden');
    fx.start();
  }

  // ---------- Pack ----------
  function showPack(r) {
    const pack = PACKS[r.packId];
    reset(pack.color);
    $('pack-title').textContent = pack.name;
    const extra = [];
    if (r.credits) extra.push(`${ico('credit')} +${r.credits}`);
    if (r.car) extra.push(`Nouvelle voiture : ${r.car.name} !`);
    $('pack-extra').innerHTML = extra.join(' &nbsp;·&nbsp; ');
    const wrap = $('pack-wrap');
    wrap.className = 'pack-wrap';
    wrap.querySelectorAll('.pack-face').forEach((f) => f.setAttribute('data-label', `NEON//DRIVE\n${pack.name.replace('PACK ', '')}\n×${pack.fragments}`));
    $('pack-hint').textContent = 'TOUCHE LE PACK POUR L\'OUVRIR';
    let opened = false;
    wrap.onclick = () => {
      if (opened) return;
      opened = true;
      $('pack-hint').textContent = '';
      wrap.classList.add('charging');
      sfx?.packCharge?.();
      // Étincelles pendant la charge
      const rect = wrap.getBoundingClientRect();
      const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
      for (let k = 0; k < 8; k++) later(() => fx.sparks(cx + (Math.random() - 0.5) * rect.width, cy + (Math.random() - 0.5) * rect.height, pack.color, 2 + k), k * 100);
      later(() => {
        // Explosion
        wrap.classList.remove('charging');
        wrap.classList.add('opened');
        $('pack-flash').classList.remove('go');
        void $('pack-flash').offsetWidth;
        $('pack-flash').classList.add('go');
        fx.burst(cx, cy, pack.color, 220, 1.2);
        sfx?.packBurst?.();
        later(() => { wrap.classList.add('gone'); dealCards(r, pack); }, 550);
      }, 900);
    };
  }

  function rarityOf(g) {
    if (g.ready || g.amount >= 10) return 'epic';
    if (g.amount >= 5) return 'rare';
    return 'common';
  }

  function dealCards(r, pack) {
    const box = $('pack-cards');
    const cards = [];
    if (r.car) cards.push({ car: r.car, amount: 0, isCar: true });
    for (const g of r.gains ?? []) cards.push({ ...g });
    let remaining = cards.length;
    cards.forEach((g, k) => {
      const owned = isOwned(save, g.car.id);
      const have = fragmentsOf(save, g.car.id);
      let goal = '', need = 0;
      if (g.isCar) goal = 'Voiture débloquée !';
      else if (!owned) { need = UNLOCK_FRAGMENTS[g.car.id]; goal = `${have} / ${need} pour la débloquer`; }
      else {
        const c = upgradeCost(save, g.car.id);
        need = c ? c.fragments : 0;
        goal = c ? `${have} / ${need} pour le niveau ${c.level}` : 'Niveau maximum';
      }
      g.ready = !g.isCar && need > 0 && have >= need;
      const rar = g.isCar ? 'epic' : rarityOf(g);
      const R = RARITY[rar];

      const el = document.createElement('div');
      el.className = `fcard dealing ${rar}`;
      el.style.setProperty('--rc', R.color);
      el.innerHTML = `<div class="card-rays"></div><div class="inner"><div class="face back"></div><div class="face front"></div></div>`;
      const front = el.querySelector('.front');
      front.insertAdjacentHTML('beforeend', `<div class="rar">${g.isCar ? 'NOUVELLE VOITURE' : R.label}</div>`);
      front.append(carIcon(g.car, liveryFor(save, g.car.id), 208, 132));
      front.insertAdjacentHTML('beforeend', `
        <div class="n">${g.isCar ? '★' : `+${g.amount}`}</div>
        <div class="nm">${g.car.name}</div>
        ${g.ready ? '<div class="ready-tag">PRÊTE À DÉBLOQUER !</div>' : `<div class="goal">${goal}</div>`}
        ${need ? `<div class="frag-bar"><div class="frag-fill" style="width:${Math.min(100, (have / need) * 100)}%"></div></div>` : ''}`);
      box.append(el);
      // Distribution : les cartes arrivent une par une
      later(() => { el.classList.remove('dealing'); sfx?.click(); }, 120 + k * 180);

      el.onclick = () => {
        if (el.classList.contains('flipped')) return;
        el.classList.add('flipped');
        sfx?.cardFlip?.(rar);
        const rc = el.getBoundingClientRect();
        later(() => fx.burst(rc.left + rc.width / 2, rc.top + rc.height / 2, R.color, rar === 'epic' ? 90 : rar === 'rare' ? 45 : 20, rar === 'epic' ? 0.8 : 0.5), 250);
        remaining--;
        if (remaining === 0) {
          $('pack-flipall').classList.add('hidden');
          $('pack-hint').textContent = '';
          later(() => $('pack-ok').classList.remove('hidden'), 500);
        }
      };
    });
    later(() => {
      $('pack-hint').textContent = 'TOUCHE LES CARTES POUR LES RETOURNER';
      $('pack-flipall').classList.remove('hidden');
    }, 200 + cards.length * 180);
  }

  // ---------- Fragments sans pack (achat direct, cadeau) : cartes distribuées ----------
  function showDirect(r) {
    reset('#ffd34d');
    $('pack-title').textContent = r.title ?? 'FRAGMENTS';
    dealCards(r, null);
  }

  // ---------- Récompense simple ----------
  function showSimple(r) {
    reset(r.car || r.visual ? '#ffd34d' : '#00f0ff');
    $('pack-title').textContent = r.car ? 'NOUVELLE VOITURE' : (r.title ?? 'RÉCOMPENSE');
    const big = document.createElement('div');
    big.className = 'reward-big';
    if (r.visual) {
      // Visuel sur mesure (ex. motif exclusif sur la voiture du joueur)
      big.classList.add('reward-visual');
      big.append(r.visual);
      if (r.note) big.insertAdjacentHTML('beforeend', `<div class="reward-note">${r.note}</div>`);
    } else if (r.car) {
      const card = document.createElement('div');
      card.className = 'fcard flipped epic';
      card.style.setProperty('--rc', '#ffd34d');
      card.innerHTML = `<div class="card-rays"></div><div class="inner"><div class="face back"></div><div class="face front"></div></div>`;
      const front = card.querySelector('.front');
      front.insertAdjacentHTML('beforeend', '<div class="rar">DÉBLOQUÉE</div>');
      front.append(carIcon(r.car, liveryFor(save, r.car.id), 208, 132));
      front.insertAdjacentHTML('beforeend', `<div class="n">★</div><div class="nm">${r.car.name}</div><div class="goal">${r.car.tagline}</div>`);
      big.append(card);
      if (r.credits) big.insertAdjacentHTML('beforeend', `<div class="pack-extra">${ico('credit')} +${r.credits}</div>`);
    } else {
      big.innerHTML = `${ico('credit')}<div class="amt">+0</div>`;
      // Le montant défile jusqu'à sa valeur
      const amt = big.querySelector('.amt');
      const t0 = performance.now();
      const tick = () => {
        const k = Math.min(1, (performance.now() - t0) / 700);
        amt.textContent = `+${Math.round(r.credits * (1 - Math.pow(1 - k, 3)))}`;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      if (r.note) big.insertAdjacentHTML('beforeend', `<div class="reward-note">${r.note}</div>`);
    }
    $('pack-wrap').after(big);
    later(() => {
      const rc = big.getBoundingClientRect();
      fx.burst(rc.left + rc.width / 2, rc.top + rc.height / 2, r.car || r.visual ? '#ffd34d' : '#00f0ff', 120, 0.9);
      sfx?.cardFlip?.('epic');
    }, 150);
    later(() => $('pack-ok').classList.remove('hidden'), 700);
  }

  $('pack-ok').onclick = next;
  $('pack-flipall').onclick = () => {
    [...document.querySelectorAll('#pack-cards .fcard:not(.flipped)')].forEach((el, k) => later(() => el.click(), k * 220));
  };
  next();
}
