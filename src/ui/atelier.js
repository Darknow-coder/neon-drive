// ATELIER : personnalisation poussée d'une voiture.
//  - COULEURS : carrosserie, accent, néon (palette + nuancier libre)
//  - STYLE    : finitions et motifs
//  - DÉCO     : numéro de course et autocollant (emblème)
//  - EFFETS   : traînée de boost et fumée de drift
// Aperçu en direct : la voiture tourne, ou roule avec son boost / son drift
// (les effets sont produits par le même code qu'en course : render/carFx.js).
// Un objet pas encore possédé peut être ESSAYÉ sur la voiture avant l'achat.

import { getCar, PAINT_COLORS } from '../data/cars.js';
import { FINISHES, MOTIFS, TRAILS, SMOKES, NUMBER_STYLES } from '../data/shop.js';
import { AVATARS, ownsAvatar } from '../data/profile.js';
import { liveryFor, setLivery, copyLiveryToAll, resetLivery } from '../progression/garage.js';
import { ownsStyle, buyStyle, equipStyle, STYLE_KINDS } from '../progression/shop.js';
import { makeCarSprite } from '../render/carSprite.js';
import { createParticles } from '../render/particles.js';
import { createCarFx, updateCarFx } from '../render/carFx.js';
import { avatarSvg } from './avatar.js';
import { ico, credits as cr } from './icons.js';

const $ = (id) => document.getElementById(id);
const LISTS = { finish: FINISHES, motif: MOTIFS, trail: TRAILS, smoke: SMOKES };

// ---------- Couleurs : conversions pour le nuancier ----------
function hslHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
function hexHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: d ? d / (1 - Math.abs(2 * l - 1)) : 0, l };
}

export function createAtelier({ save, onSave, sfx, onClose }) {
  let carId = null;
  let tab = 'colors';
  let trial = null;      // { kind, id } : objet essayé (pas encore possédé)
  let picker = null;     // partie dont le nuancier est ouvert : 'body' | 'accent' | 'glow'
  let mode = 'spin';     // aperçu : 'spin' | 'boost' | 'drift' | 'front'
  let msg = '';
  let raf = 0;

  // ------------------------------------------------------------ Aperçu
  const canvas = $('at-canvas');
  const ctx = canvas.getContext('2d');
  const particles = createParticles(260);
  const fx = createCarFx();
  const stub = { addSkid() {}, weather: null };
  let sprite = null;
  let angle = -Math.PI / 2;
  let last = 0;

  const colors = () => {
    const c = liveryFor(save, carId);
    return trial ? { ...c, [trial.kind]: trial.id } : c;
  };
  function refreshSprite() { sprite = makeCarSprite(getCar(carId), 46, 24, colors()); }

  function draw(t) {
    raf = requestAnimationFrame(draw);
    if (t - last < 30) return; // ≈ 30 images/s
    const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 30;
    last = t;
    const W = canvas.width, H = canvas.height;
    const SC = 4.2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    // Socle
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 10, W / 2, H * 0.55, W * 0.48);
    g.addColorStop(0, 'rgba(138,43,255,0.32)'); g.addColorStop(1, 'rgba(138,43,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Sol qui défile quand la voiture « roule »
    const moving = mode === 'boost' || mode === 'drift';
    if (moving) {
      ctx.strokeStyle = 'rgba(0,240,255,0.12)'; ctx.lineWidth = 2;
      const off = (t / 6) % 60;
      for (let y = -60 + off; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(W * 0.15, y); ctx.lineTo(W * 0.85, y); ctx.stroke(); }
    } else {
      ctx.strokeStyle = 'rgba(0,240,255,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(W / 2, H * 0.55, W * 0.36, H * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
    }
    // Orientation : tourne, nez en haut (déco), ou en travers (drift)
    const target = mode === 'drift' ? -Math.PI / 2 + 0.55 : -Math.PI / 2;
    if (mode === 'spin') angle += 0.35 * dt;
    else { let d = target - angle; d = Math.atan2(Math.sin(d), Math.cos(d)); angle += d * Math.min(1, dt * 6); }

    ctx.setTransform(SC, 0, 0, SC, W / 2, H * 0.55);
    // Effets : la vraie fonction de course, sur une voiture immobile dont le décor défile
    const def = getCar(carId);
    const dir = -Math.PI / 2; // direction de déplacement : vers le haut
    const car = {
      x: 0, y: 0, angle, def, livery: colors(), length: 46 * (def.size ?? 1), width: 24 * (def.size ?? 1),
      vx: Math.cos(dir) * -70, vy: Math.sin(dir) * -70, speed: 320, vR: mode === 'drift' ? 260 : 0,
      boosting: mode === 'boost', drifting: mode === 'drift', braking: false, trait: def.trait, spinTimer: 0, rev: 0, wallTouch: false,
    };
    if (moving) updateCarFx(fx, car, dt, particles, stub, 0);
    particles.update(dt);
    particles.draw(ctx, 0);
    ctx.save();
    ctx.rotate(angle);
    ctx.drawImage(sprite.canvas, -sprite.ox, -sprite.oy, sprite.w, sprite.h);
    ctx.restore();
    particles.draw(ctx, 1);
  }

  // ------------------------------------------------------------ Panneaux
  const chip = (label, { on = false, locked = false, data = '', price = null, title = '' } = {}) =>
    `<button class="at-chip${on ? ' on' : ''}${locked ? ' locked' : ''}" ${data} ${title ? `title="${title}"` : ''}>${locked ? ico('lock') : ''}${label}${price !== null ? `<small>${price}</small>` : ''}</button>`;

  function swatchRow(part, label) {
    const cur = liveryFor(save, carId);
    const l = save.garage.liveries[carId] ?? {};
    const value = cur[part];
    const custom = !PAINT_COLORS.some((c) => c.toLowerCase() === value.toLowerCase());
    const auto = part === 'glow' && !l.glow;
    return `<div class="at-sec"><div class="at-lbl">${label}</div><div class="at-sw">
      ${part === 'glow' ? `<button class="at-auto${auto ? ' on' : ''}" data-auto="1">AUTO</button>` : ''}
      ${PAINT_COLORS.map((c) => `<button class="swatch${!auto && c.toLowerCase() === value.toLowerCase() ? ' on' : ''}" style="background:${c};color:${c}" data-part="${part}" data-col="${c}" aria-label="Couleur ${c}"></button>`).join('')}
      <button class="swatch at-wheel${custom && !auto ? ' on' : ''}" data-wheel="${part}" aria-label="Nuancier libre" style="${custom && !auto ? `--cur:${value}` : ''}"></button>
    </div>
    ${picker === part ? pickerHtml(value) : ''}</div>`;
  }
  function pickerHtml(value) {
    const { h, l } = hexHsl(value);
    return `<div class="at-picker">
      <label>TEINTE<input type="range" min="0" max="359" value="${Math.round(h)}" id="at-hue"></label>
      <label>LUMIÈRE<input type="range" min="18" max="88" value="${Math.round(l * 100)}" id="at-light"></label>
      <span class="at-prev" style="background:${value}"></span></div>`;
  }

  function stylePanel(kinds) {
    const cur = colors();
    return kinds.map(([kind, label]) => {
      const items = LISTS[kind].map((it) => {
        const owned = ownsStyle(save, kind, it.id);
        const trying = trial && trial.kind === kind && trial.id === it.id;
        if (!owned && it.exclusive && !trying) {
          return chip(it.name, { locked: true, data: `data-try="${kind}:${it.id}"`, price: 'EXCLUSIF' });
        }
        return chip(it.name, { on: cur[kind] === it.id, locked: !owned, data: owned ? `data-eq="${kind}:${it.id}"` : `data-try="${kind}:${it.id}"`, price: owned ? null : it.price });
      }).join('');
      return `<div class="at-sec"><div class="at-lbl">${label}</div><div class="at-chips">${items}</div></div>`;
    }).join('');
  }

  function decoPanel() {
    const cur = liveryFor(save, carId);
    const n = cur.number;
    const avatars = AVATARS.filter((a) => ownsAvatar(save, a.id));
    return `<div class="at-sec"><div class="at-lbl">NUMÉRO DE COURSE</div>
      <div class="at-num">
        ${chip('AUCUN', { on: !n, data: 'data-num="0"' })}
        <button class="at-step" data-step="-1">−</button><b class="at-numval">${n ? String(n).padStart(2, '0') : '––'}</b><button class="at-step" data-step="1">+</button>
        ${chip('AU HASARD', { data: 'data-num="rnd"' })}
      </div>
      <div class="at-chips">${NUMBER_STYLES.map((st) => chip(st.name, { on: cur.numStyle === st.id && n > 0, data: `data-nstyle="${st.id}"` })).join('')}</div></div>
      <div class="at-sec"><div class="at-lbl">AUTOCOLLANT <span>(tes emblèmes)</span></div>
      <div class="at-decals">${chip('AUCUN', { on: cur.decal === 'none', data: 'data-decal="none"' })}
        ${avatars.map((a) => `<button class="at-decal${cur.decal === a.id ? ' on' : ''}" data-decal="${a.id}" title="${a.name}" style="--ac:${cur.accent}">${avatarSvg(a.id)}</button>`).join('')}</div></div>`;
  }

  function trialBar() {
    if (!trial) return '';
    const it = LISTS[trial.kind].find((x) => x.id === trial.id);
    const k = STYLE_KINDS[trial.kind];
    if (it.exclusive) {
      const how = it.exclusive === 'season' ? 'le PASSE DE SAISON' : it.exclusive === 'career' ? 'le mode CARRIÈRE' : 'un ÉVÉNEMENT';
      return `<div class="at-trial"><div><b>ESSAI : ${it.name}</b><span>${it.desc} Exclusif : à gagner dans ${how}.</span></div><button class="menu-btn small-btn" data-cancel="1">OK</button></div>`;
    }
    const can = save.credits >= it.price;
    return `<div class="at-trial"><div><b>ESSAI : ${k.label} ${it.name}</b><span>${it.desc}</span></div>
      <button class="menu-btn primary at-buy" data-buy="1" ${can ? '' : 'disabled'}>${can ? `ACHETER ${cr(it.price)}` : `IL TE MANQUE ${cr(it.price - save.credits)}`}</button>
      <button class="menu-btn small-btn" data-cancel="1">✕</button></div>`;
  }

  function render() {
    refreshSprite();
    $('at-car').textContent = getCar(carId).name;
    $('at-credits').innerHTML = cr(save.credits);
    document.querySelectorAll('#at-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.attab === tab));
    document.querySelectorAll('#at-modes button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    const panel = $('at-panel');
    const keep = panel.scrollTop;
    if (tab === 'colors') panel.innerHTML = swatchRow('body', 'CARROSSERIE') + swatchRow('accent', 'ACCENT') + swatchRow('glow', 'NÉON <span>(lueur sous la voiture, contours, fumée)</span>');
    if (tab === 'style') panel.innerHTML = stylePanel([['finish', 'FINITION'], ['motif', 'MOTIF']]);
    if (tab === 'deco') panel.innerHTML = decoPanel();
    if (tab === 'fx') panel.innerHTML = stylePanel([['trail', 'TRAÎNÉE DE BOOST'], ['smoke', 'FUMÉE DE DRIFT']]);
    panel.scrollTop = keep;
    $('at-trialbox').innerHTML = trialBar();
    $('at-msg').textContent = msg;
    bind();
  }

  const save1 = () => { onSave(); };
  let pendingSave = 0;
  const saveSoon = () => { clearTimeout(pendingSave); pendingSave = setTimeout(save1, 300); };

  function bind() {
    const panel = $('at-panel');
    panel.querySelectorAll('[data-col]').forEach((b) => b.addEventListener('click', () => {
      setLivery(save, carId, b.dataset.part, b.dataset.col); picker = null; sfx?.click?.(); save1(); render();
    }));
    panel.querySelectorAll('[data-auto]').forEach((b) => b.addEventListener('click', () => {
      const l = save.garage.liveries[carId]; if (l) delete l.glow; picker = null; sfx?.click?.(); save1(); render();
    }));
    panel.querySelectorAll('[data-wheel]').forEach((b) => b.addEventListener('click', () => {
      picker = picker === b.dataset.wheel ? null : b.dataset.wheel; sfx?.click?.(); render();
    }));
    const hue = $('at-hue'), light = $('at-light');
    if (hue && light) {
      const live = () => {
        const col = hslHex(+hue.value, 1, +light.value / 100);
        setLivery(save, carId, picker, col);
        refreshSprite();
        panel.querySelector('.at-prev').style.background = col;
        panel.querySelectorAll(`[data-part="${picker}"]`).forEach((s) => s.classList.remove('on'));
        const w = panel.querySelector(`[data-wheel="${picker}"]`); w.classList.add('on'); w.style.setProperty('--cur', col);
        if (picker === 'glow') panel.querySelector('[data-auto]')?.classList.remove('on');
        saveSoon();
      };
      hue.addEventListener('input', live); light.addEventListener('input', live);
    }
    panel.querySelectorAll('[data-eq]').forEach((b) => b.addEventListener('click', () => {
      const [kind, id] = b.dataset.eq.split(':');
      equipStyle(save, carId, kind, id); trial = null; msg = ''; sfx?.click?.();
      if (kind === 'trail') mode = 'boost'; else if (kind === 'smoke') mode = 'drift';
      save1(); render();
    }));
    panel.querySelectorAll('[data-try]').forEach((b) => b.addEventListener('click', () => {
      const [kind, id] = b.dataset.try.split(':');
      trial = { kind, id }; msg = ''; sfx?.click?.();
      if (kind === 'trail') mode = 'boost'; else if (kind === 'smoke') mode = 'drift';
      render();
    }));
    panel.querySelectorAll('[data-num]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.num === 'rnd' ? 1 + Math.floor(Math.random() * 99) : 0;
      setLivery(save, carId, 'number', v); mode = 'front'; sfx?.click?.(); save1(); render();
    }));
    panel.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const n = liveryFor(save, carId).number;
      setLivery(save, carId, 'number', (n + Number(b.dataset.step) + 100) % 100); mode = 'front'; sfx?.click?.(); saveSoon(); render();
    }));
    panel.querySelectorAll('[data-nstyle]').forEach((b) => b.addEventListener('click', () => {
      setLivery(save, carId, 'numStyle', b.dataset.nstyle);
      if (!liveryFor(save, carId).number) setLivery(save, carId, 'number', 7);
      mode = 'front'; sfx?.click?.(); save1(); render();
    }));
    panel.querySelectorAll('[data-decal]').forEach((b) => b.addEventListener('click', () => {
      setLivery(save, carId, 'decal', b.dataset.decal); mode = 'front'; sfx?.click?.(); save1(); render();
    }));
    const tb = $('at-trialbox');
    tb.querySelector('[data-cancel]')?.addEventListener('click', () => { trial = null; sfx?.click?.(); render(); });
    tb.querySelector('[data-buy]')?.addEventListener('click', () => {
      const r = buyStyle(save, trial.kind, trial.id);
      if (r.ok) {
        equipStyle(save, carId, trial.kind, trial.id);
        msg = `${LISTS[trial.kind].find((x) => x.id === trial.id).name} : acheté et équipé ! (utilisable sur toutes tes voitures)`;
        trial = null; sfx?.unlock?.(); save1();
      } else msg = 'Pas assez de crédits.';
      render();
    });
  }

  // ------------------------------------------------------------ Boutons fixes
  document.querySelectorAll('#at-tabs button').forEach((b) => b.addEventListener('click', () => {
    tab = b.dataset.attab; picker = null; trial = null; msg = '';
    mode = tab === 'fx' ? 'boost' : tab === 'deco' ? 'front' : 'spin';
    sfx?.click?.(); render();
  }));
  document.querySelectorAll('#at-modes button').forEach((b) => b.addEventListener('click', () => { mode = b.dataset.mode; sfx?.click?.(); render(); }));
  $('at-copy').addEventListener('click', () => {
    const b = $('at-copy');
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'CONFIRMER : COPIER SUR TOUTES ?'; return; }
    copyLiveryToAll(save, carId); save1();
    b.dataset.confirm = ''; b.textContent = 'COPIER SUR TOUTES MES VOITURES';
    msg = `Le look de ta ${getCar(carId).name} est copié sur toutes tes voitures.`; sfx?.unlock?.(); render();
  });
  $('at-reset').addEventListener('click', () => {
    const b = $('at-reset');
    if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = 'CONFIRMER ?'; return; }
    resetLivery(save, carId); save1();
    b.dataset.confirm = ''; b.textContent = 'D\'ORIGINE';
    trial = null; picker = null; msg = 'Couleurs et décorations d\'origine remises.'; sfx?.click?.(); render();
  });
  function close() {
    cancelAnimationFrame(raf);
    clearTimeout(pendingSave); save1();
    $('atelier').classList.add('hidden');
    onClose?.();
  }
  $('at-back').addEventListener('click', () => { sfx?.click?.(); close(); });

  return {
    open(id, startTab = 'colors') {
      carId = id; tab = startTab; trial = null; picker = null; msg = '';
      mode = tab === 'fx' ? 'boost' : tab === 'deco' ? 'front' : 'spin';
      for (const b of [$('at-copy'), $('at-reset')]) b.dataset.confirm = '';
      $('at-copy').textContent = 'COPIER SUR TOUTES MES VOITURES';
      $('at-reset').textContent = 'D\'ORIGINE';
      particles.clear();
      render();
      $('atelier').classList.remove('hidden');
      cancelAnimationFrame(raf); last = 0;
      raf = requestAnimationFrame(draw);
    },
  };
}
