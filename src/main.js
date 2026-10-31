// Point d'entrée du jeu.

import { createLoop } from './core/loop.js';
import { createInput, isTouchDevice } from './core/input.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createTuningPanel } from './ui/tuningPanel.js';
import { createTestDrive } from './scenes/testDrive.js';

const touch = isTouchDevice();
// Sur téléphone/tablette : résolution et mémoire allégées (fluidité avant tout).
// Forçable pour les tests avec ?quality=low ou ?quality=high dans l'adresse.
const q = new URLSearchParams(location.search).get('quality');
const lowEnd = q ? q === 'low' : touch;

const canvas = document.getElementById('game');
const renderer = createRenderer(canvas, { lowEnd });
const hud = createHud();
const touchRoot = document.getElementById('touch');

let session = null;
let tuning = null;

const input = createInput({
  touchRoot,
  onAction(code) {
    if (code === 'KeyR') session?.respawn();
    if (code === 'KeyT') tuning?.toggle();
  },
});

session = createTestDrive({ renderer, input, hud, lowEnd, trackId: 'neon-boulevard', carId: 'nova' });

tuning = createTuningPanel(document.getElementById('tuning'), {
  getCar: () => session.car,
  setCarDef: (id) => session.setCarDef(id),
  getFps: () => loop.fps,
  getPerf: () => perf,
});

// Mesure du temps de calcul (affichée dans le panneau ⚙)
const perf = { update: 0, render: 0, worst: 0, frameUpdate: 0 };
const loop = createLoop({
  update: (dt) => {
    const t = performance.now();
    session.update(dt);
    perf.frameUpdate += performance.now() - t;
  },
  render: (alpha) => {
    const t = performance.now();
    session.render(alpha);
    const r = performance.now() - t;
    perf.render += (r - perf.render) * 0.05;
    perf.update += (perf.frameUpdate - perf.update) * 0.05;
    perf.worst = Math.max(perf.worst * 0.995, r + perf.frameUpdate);
    perf.frameUpdate = 0;
  },
});

window.addEventListener('resize', () => session.resize());
document.getElementById('btn-reset').addEventListener('click', () => session.respawn());
document.getElementById('btn-tuning').addEventListener('click', () => tuning.toggle());

// Premier rendu derrière l'écran titre
session.render(1);

document.getElementById('btn-start').addEventListener('click', async () => {
  document.getElementById('start').classList.add('hidden');
  hud.show(true);
  document.getElementById('sys-buttons').classList.remove('hidden');
  if (touch) {
    touchRoot.classList.remove('hidden');
    document.getElementById('rotate-hint').classList.add('enabled');
    try {
      await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape');
    } catch { /* pas grave : certains navigateurs refusent */ }
    setTimeout(() => session.resize(), 300);
  }
  loop.start();
});

// Pause automatique quand l'onglet est caché
document.addEventListener('visibilitychange', () => {
  if (document.hidden) loop.stop();
  else if (document.getElementById('start').classList.contains('hidden')) loop.start();
});

// Accès pour les tests automatiques
window.__ND = { session: () => session, loop: () => loop, perf };
