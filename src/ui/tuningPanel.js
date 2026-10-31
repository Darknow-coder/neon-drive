// Panneau de réglage de la conduite (outil de développement).
// Permet de modifier la physique EN DIRECT pendant qu'on roule, puis de
// copier les valeurs pour les intégrer définitivement au jeu.

import { GLOBAL_TUNING, statsToParams } from '../physics/carPhysics.js';
import { CARS } from '../data/cars.js';

const CAR_SLIDERS = [
  ['maxSpeed', 'Vitesse max', 400, 1100, 5],
  ['accel', 'Accélération', 150, 900, 5],
  ['turnRate', 'Vitesse de rotation', 1, 5, 0.05],
  ['steerResponse', 'Réactivité direction', 2, 25, 0.5],
  ['gripAccel', 'Adhérence', 600, 4000, 20],
  ['driftTurnBoost', 'Virage serré en drift', 0.8, 2, 0.01],
  ['driftDrag', 'Perte de vitesse en drift', 0, 800, 5],
  ['brake', 'Freinage', 300, 2000, 10],
  ['mass', 'Masse', 0.5, 2, 0.01],
];
const GLOBAL_SLIDERS = [
  ['highSpeedUndersteer', 'Sous-virage à haute vitesse', 0, 0.8, 0.01],
  ['driftEntrySpeed', 'Vitesse min. pour drifter', 0.1, 0.8, 0.01],
  ['driftAngleMin', 'Angle drift mini (rad)', 0, 0.6, 0.01],
  ['driftAngleMax', 'Angle drift maxi (rad)', 0.2, 1.2, 0.01],
  ['driftTurnMin', 'Virage en contre-braquage', 0, 1, 0.01],
  ['driftAngleResponse', 'Réactivité angle drift', 2, 20, 0.5],
  ['slideEntryAngle', 'Angle de glisse auto', 0.15, 0.9, 0.01],
  ['boostSpeedAdd', 'Vitesse ajoutée par le boost', 0, 500, 5],
  ['boostGainBase', 'Remplissage boost', 0.05, 1.5, 0.01],
  ['draftSpeedAdd', 'Aspiration (vitesse en plus)', 0, 150, 1],
];

const GLOBAL_DEFAULTS = { ...GLOBAL_TUNING };

export function createTuningPanel(root, { getCar, setCarDef, getFps, getPerf }) {
  let open = false;

  function row(obj, [key, label, min, max, step]) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    const lab = document.createElement('label');
    lab.textContent = label;
    const out = document.createElement('output');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = min; input.max = max; input.step = step;
    input.value = obj()[key];
    const fmt = (v) => (step >= 1 ? String(Math.round(v)) : Number(v).toFixed(2));
    out.textContent = fmt(input.value);
    input.addEventListener('input', () => {
      obj()[key] = parseFloat(input.value);
      out.textContent = fmt(input.value);
    });
    wrap.append(lab, out, input);
    wrap.refresh = () => { input.value = obj()[key]; out.textContent = fmt(input.value); };
    return wrap;
  }

  function build() {
    root.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = 'RÉGLAGES DE CONDUITE';
    const fps = document.createElement('div');
    fps.className = 'fps';
    root.append(h, fps);

    const sel = document.createElement('select');
    for (const c of CARS) {
      const o = document.createElement('option');
      o.value = c.id;
      o.textContent = `${c.name} — ${c.tagline}`;
      sel.append(o);
    }
    sel.value = getCar().def.id;
    sel.addEventListener('change', () => { setCarDef(sel.value); build(); });
    root.append(sel);

    const rows = [];
    const h2 = document.createElement('h3');
    h2.textContent = 'VOITURE';
    h2.style.marginTop = '10px';
    root.append(h2);
    for (const s of CAR_SLIDERS) { const r = row(() => getCar().params, s); rows.push(r); root.append(r); }
    const h3 = document.createElement('h3');
    h3.textContent = 'COMMUN À TOUTES LES VOITURES';
    root.append(h3);
    for (const s of GLOBAL_SLIDERS) { const r = row(() => GLOBAL_TUNING, s); rows.push(r); root.append(r); }

    const actions = document.createElement('div');
    actions.className = 'actions';
    const reset = document.createElement('button');
    reset.textContent = 'Valeurs d\'origine';
    reset.addEventListener('click', () => {
      Object.assign(GLOBAL_TUNING, GLOBAL_DEFAULTS);
      Object.assign(getCar().params, statsToParams(getCar().def.stats));
      rows.forEach((r) => r.refresh());
    });
    const copy = document.createElement('button');
    copy.textContent = 'Copier les valeurs';
    copy.addEventListener('click', async () => {
      const txt = JSON.stringify({ car: getCar().def.id, params: getCar().params, global: GLOBAL_TUNING }, null, 2);
      try { await navigator.clipboard.writeText(txt); copy.textContent = 'Copié ✓'; }
      catch { console.log(txt); copy.textContent = 'Voir la console'; }
      setTimeout(() => (copy.textContent = 'Copier les valeurs'), 1500);
    });
    actions.append(reset, copy);
    root.append(actions);

    // Les curseurs ne doivent pas déclencher les commandes du jeu
    root.addEventListener('keydown', (e) => e.stopPropagation());
    root.updateFps = () => {
      const p = getPerf?.();
      fps.textContent = `${Math.round(getFps())} images/s` +
        (p ? ` · physique ${p.update.toFixed(1)} ms · dessin ${p.render.toFixed(1)} ms · pire ${Math.round(p.worst)} ms` : '');
    };
  }

  build();
  setInterval(() => open && root.updateFps?.(), 500);

  return {
    toggle() {
      open = !open;
      root.classList.toggle('hidden', !open);
      if (open) build();
    },
    get open() { return open; },
  };
}
