// Point d'entrée du jeu : enchaîne les écrans (menu → course → résultats).

import { createLoop } from './core/loop.js';
import { createInput, isTouchDevice } from './core/input.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createTuningPanel } from './ui/tuningPanel.js';
import { showResults, hideResults } from './ui/resultsScreen.js';
import { createRaceScene } from './scenes/raceScene.js';
import { TRACKS } from './data/tracks/index.js';

const $ = (id) => document.getElementById(id);
const show = (id, v = true) => $(id).classList.toggle('hidden', !v);

const touch = isTouchDevice();
// Sur téléphone/tablette : résolution et mémoire allégées (fluidité avant tout).
// Forçable pour les tests avec ?quality=low ou ?quality=high dans l'adresse.
const q = new URLSearchParams(location.search).get('quality');
const lowEnd = q ? q === 'low' : touch;

const canvas = $('game');
const renderer = createRenderer(canvas, { lowEnd });
const hud = createHud();
const touchRoot = $('touch');

let session = null;
let tuning = null;
let state = 'menu'; // 'menu' | 'race' | 'pause' | 'results'
let trackId = TRACKS[0].id;
let carId = 'nova';

const input = createInput({
  touchRoot,
  onAction(code) {
    if (code === 'KeyR' && state === 'race') session?.respawn();
    if (code === 'KeyT') tuning?.toggle();
    if (code === 'Escape' || code === 'KeyP') {
      if (state === 'race') pause();
      else if (state === 'pause') resume();
    }
  },
});

// ---------------- Écrans ----------------
function setRaceUi(visible) {
  hud.show(visible);
  show('sys-buttons', visible);
  show('touch', visible && touch);
}

function startRace() {
  // Le circuit n'est construit qu'au lancement (et l'ancien est libéré) :
  // sur téléphone, garder plusieurs grands circuits en mémoire peut provoquer
  // un écran noir.
  if (session) carId = session.car.def.id;
  session?.dispose();
  session = createRaceScene({
    renderer, input, hud, lowEnd, trackId, carId,
    onFinish: (rows) => {
      state = 'results';
      setRaceUi(false);
      showResults(rows, { trackName: session.trackName });
    },
  });
  input.reset();
  hideResults();
  show('pause', false);
  show('start', false);
  setRaceUi(true);
  state = 'race';
  loop.start();
}

function pause() {
  state = 'pause';
  loop.stop();
  input.reset();
  show('pause', true);
}

function resume() {
  show('pause', false);
  state = 'race';
  loop.start();
}

function backToMenu() {
  loop.stop();
  session?.dispose();
  session = null;
  hideResults();
  show('pause', false);
  setRaceUi(false);
  show('start', true);
  state = 'menu';
}

// Choix du circuit sur l'écran de départ (provisoire, avant le vrai menu)
const pick = $('track-pick');
for (const t of TRACKS) {
  const b = document.createElement('button');
  b.innerHTML = `${t.name}<small>${t.profile}</small>`;
  b.addEventListener('click', () => {
    trackId = t.id;
    pick.querySelectorAll('button').forEach((x) => x.classList.toggle('selected', x === b));
  });
  if (t.id === trackId) b.classList.add('selected');
  pick.append(b);
}

tuning = createTuningPanel($('tuning'), {
  getCar: () => session?.car ?? { def: { id: carId, stats: {} }, params: {} },
  setCarDef: (id) => { carId = id; session?.setCarDef(id); },
  getFps: () => loop.fps,
  getPerf: () => perf,
});

// Mesure du temps de calcul (affichée dans le panneau ⚙)
const perf = { update: 0, render: 0, worst: 0, frameUpdate: 0 };
const loop = createLoop({
  update: (dt) => {
    const t = performance.now();
    session?.update(dt);
    perf.frameUpdate += performance.now() - t;
  },
  render: (alpha) => {
    const t = performance.now();
    session?.render(alpha);
    const r = performance.now() - t;
    perf.render += (r - perf.render) * 0.05;
    perf.update += (perf.frameUpdate - perf.update) * 0.05;
    perf.worst = Math.max(perf.worst * 0.995, r + perf.frameUpdate);
    perf.frameUpdate = 0;
  },
});

window.addEventListener('resize', () => {
  session?.resize();
  if (state !== 'race' && session) session.render(1);
});
$('btn-reset').addEventListener('click', () => state === 'race' && session?.respawn());
$('btn-tuning').addEventListener('click', () => tuning.toggle());
$('btn-pause').addEventListener('click', () => state === 'race' && pause());
$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', startRace);
$('btn-quit').addEventListener('click', backToMenu);
$('btn-again').addEventListener('click', startRace);
$('btn-menu').addEventListener('click', backToMenu);

// Si Android efface le dessin du jeu (manque de mémoire graphique),
// on reconstruit les images au lieu de rester sur un écran noir.
canvas.addEventListener('contextlost', (e) => e.preventDefault());
canvas.addEventListener('contextrestored', () => session?.reloadGraphics());

$('btn-start').addEventListener('click', async () => {
  startRace();
  if (touch) {
    $('rotate-hint').classList.add('enabled');
    try {
      await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape');
    } catch { /* pas grave : certains navigateurs refusent */ }
    setTimeout(() => session?.resize(), 300);
  }
});

// Pause automatique quand l'application passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state === 'race') pause();
    else loop.stop();
  } else if (state === 'results') loop.start();
});

// Accès pour les tests automatiques
window.__ND = { session: () => session, loop: () => loop, perf, state: () => state };
