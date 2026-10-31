// Point d'entrée du jeu : enchaîne les écrans (menu → course → résultats).

import { createLoop } from './core/loop.js';
import { createInput, isTouchDevice } from './core/input.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createTuningPanel } from './ui/tuningPanel.js';
import { showResults, hideResults } from './ui/resultsScreen.js';
import { createRaceScene } from './scenes/raceScene.js';
import { TRACKS } from './data/tracks/index.js';
import { getCar } from './data/cars.js';
import { leagueFor, RACE_LAPS } from './data/progression.js';
import { createSaveStore } from './progression/save.js';
import { applyRaceResult, pickTrack, tracksForLeague } from './progression/progression.js';
import { renderMenu, revealTrack } from './ui/menu.js';
import { createGarage, carName } from './ui/garage.js';
import { syncUnlocks, selectedCar, liveryFor } from './progression/garage.js';
import { createAudio } from './audio/audio.js';
import { createSfx } from './audio/sfx.js';
import { createMusic } from './audio/music.js';
import { createSettingsScreen } from './ui/settings.js';
import { createTutorial } from './scenes/tutorial.js';

const $ = (id) => document.getElementById(id);
const show = (id, v = true) => $(id).classList.toggle('hidden', !v);

const touch = isTouchDevice();
// Sur téléphone/tablette : résolution et mémoire allégées (fluidité avant tout).
// Forçable pour les tests avec ?quality=low ou ?quality=high dans l'adresse.
const q = new URLSearchParams(location.search).get('quality');
const lowEnd = q ? q === 'low' : touch;
// Outils de développement (panneau ⚙) : uniquement avec ?dev dans l'adresse
const devMode = new URLSearchParams(location.search).has('dev');

const canvas = $('game');
const renderer = createRenderer(canvas, { lowEnd });
const hud = createHud();
const touchRoot = $('touch');

// ---------------- Sauvegarde ----------------
const store = createSaveStore();
const loaded = store.load();
const save = loaded.data;
let saveStatus = loaded.status;
function persist() {
  if (!store.save(save) && store.available) saveStatus = 'failed';
}
// Voitures dont le palier est déjà atteint (ex. ancienne sauvegarde convertie)
if (syncUnlocks(save).length) persist();

// ---------------- Son ----------------
const audio = createAudio(save.settings);
const sfx = createSfx(audio);
const music = createMusic(audio);
/** Ambiance musicale selon l'écran affiché. */
function updateMusic() {
  if (!audio.ctx) return;
  music.setMode(state === 'race' || state === 'reveal' ? 'race' : 'menu');
}
// Sur mobile, le son ne peut démarrer qu'après un geste du joueur
const unlockAudio = () => {
  audio.unlock();
  updateMusic();
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio);
window.addEventListener('keydown', unlockAudio);
// Petit « clic » sur les boutons des menus
document.addEventListener('click', (e) => {
  if (e.target.closest?.('.menu-btn, .start-btn, .garage-nav, .swatch, .track-pick button')) sfx.click();
});

let session = null;
let tuning = null;
let state = 'menu'; // 'menu' | 'reveal' | 'race' | 'pause' | 'results'
let trackId = TRACKS[0].id;
let trainingTrackId = TRACKS[0].id;
let training = false;
let carId = getCar(selectedCar(save)).id;

const input = createInput({
  touchRoot,
  onAction(code) {
    if (code === 'KeyR' && state === 'race') session?.respawn();
    if (code === 'KeyT' && devMode) tuning?.toggle();
    if (code === 'Escape' || code === 'KeyP') {
      if (state === 'race') pause();
      else if (state === 'pause') resume();
    }
  },
});

// ---------------- Écrans ----------------
function setRaceUi(visible, tutorial = false) {
  hud.show(visible);
  $('hud').classList.toggle('tuto', tutorial);
  show('sys-buttons', visible);
  show('touch', visible && touch);
}
show('btn-tuning', devMode);

/** Applique les options de commandes (disposition, accélération auto, taille). */
function applyControls() {
  const c = save.settings.controls;
  touchRoot.classList.toggle('swapped', c.swapped);
  touchRoot.classList.toggle('autogas', c.autoGas);
  touchRoot.style.setProperty('--bs', String(c.size));
  input.setOptions({ autoGas: c.autoGas });
}
applyControls();

function refreshMenu() {
  renderMenu(save, saveStatus);
  $('menu-car').innerHTML = `Voiture : <b>${carName(selectedCar(save))}</b>`;
}

const garage = createGarage({ save, onSave: persist, onClose: refreshMenu });

function startRace() {
  // Le circuit n'est construit qu'au lancement (et l'ancien est libéré) :
  // sur téléphone, garder plusieurs grands circuits en mémoire peut provoquer
  // un écran noir.
  carId = selectedCar(save);
  session?.dispose();
  const league = leagueFor(save.trophies).id; // niveau des IA fixé AVANT la course
  session = createRaceScene({
    renderer, input, hud, lowEnd, trackId, carId, league, laps: RACE_LAPS,
    playerColors: liveryFor(save, carId),
    sfx,
    settings: save.settings,
    onFinish: (rows) => {
      state = 'results';
      setRaceUi(false);
      let reward = null;
      if (!training) {
        const me = rows.find((r) => r.isPlayer);
        reward = applyRaceResult(save, { position: me.position, trackId, carId, bestLap: me.bestLap });
        persist();
      }
      showResults(rows, { trackName: session.trackName, reward, training });
      sfx.stopCar();
      if (reward?.unlockedCars?.length || reward?.promoted) setTimeout(() => sfx.unlock(), 900);
      updateMusic();
    },
  });
  input.reset();
  hideResults();
  show('pause', false);
  show('start', false);
  setRaceUi(true);
  state = 'race';
  updateMusic();
  loop.start();
}

function pause() {
  state = 'pause';
  loop.stop();
  input.reset();
  sfx.stopCar();
  show('pause', true);
  updateMusic();
}

function resume() {
  show('pause', false);
  state = 'race';
  updateMusic();
  loop.start();
}

function backToMenu() {
  loop.stop();
  session?.dispose();
  session = null;
  hideResults();
  show('pause', false);
  setRaceUi(false);
  showTrainingPicker(false);
  refreshMenu();
  show('start', true);
  state = 'menu';
  updateMusic();
}

/** Tutoriel : leçon de pilotage en solo. */
function startTutorial() {
  session?.dispose();
  training = true;
  trackId = 'neon-boulevard';
  carId = selectedCar(save);
  const scene = createRaceScene({
    renderer, input, hud, lowEnd, trackId, carId, laps: 99, solo: true, countdown: 1.5,
    playerColors: liveryFor(save, carId), sfx, settings: save.settings,
  });
  session = createTutorial({
    scene, input, touch, autoGas: save.settings.controls.autoGas,
    onDone: () => {
      save.tutorialDone = true;
      persist();
      setTimeout(backToMenu, 300);
    },
  });
  input.reset();
  hideResults();
  show('pause', false);
  show('start', false);
  setRaceUi(true, true);
  state = 'race';
  updateMusic();
  loop.start();
}

/** Course classée : circuit tiré au sort parmi ceux de la ligue du joueur. */
function startRankedRace() {
  // Première fois : la leçon de pilotage d'abord
  if (!save.tutorialDone) { startTutorial(); return; }
  training = false;
  const pool = tracksForLeague(leagueFor(save.trophies).id);
  const chosen = pickTrack(save);
  trackId = chosen.id;
  state = 'reveal';
  show('start', false);
  hideResults();
  show('pause', false);
  setRaceUi(false);
  updateMusic();
  revealTrack(pool, chosen, () => startRace());
}

function startTraining() {
  training = true;
  trackId = trainingTrackId;
  startRace();
}

function showTrainingPicker(v) {
  show('menu-main', !v);
  show('menu-training', v);
}

refreshMenu();
// Lien vers l'éditeur de circuits (mode développeur)
if (devMode) {
  const a = document.createElement('a');
  a.href = './editor.html';
  a.textContent = "ÉDITEUR DE CIRCUITS";
  a.className = 'menu-btn';
  a.style.textDecoration = 'none';
  $('menu-main').append(a);
}

// Circuit de test envoyé par l'éditeur (bouton « Essayer ») : disponible en entraînement
const urlParams = new URLSearchParams(location.search);
if (urlParams.has('custom')) {
  try {
    const d = JSON.parse(localStorage.getItem('neondrive.customTrack') || 'null');
    if (d && Array.isArray(d.points) && d.points.length >= 4) {
      TRACKS.push({ ...d, id: 'custom-test', name: `${d.name || 'TEST'} (TEST)`, profile: 'Éditeur', custom: true });
      trainingTrackId = 'custom-test';
    }
  } catch { /* brouillon illisible : ignoré */ }
}

// Choix du circuit pour l'entraînement
const pick = $('track-pick');
for (const t of TRACKS) {
  const b = document.createElement('button');
  b.innerHTML = `${t.name}<small>${t.profile}</small>`;
  b.addEventListener('click', () => {
    trainingTrackId = t.id;
    pick.querySelectorAll('button').forEach((x) => x.classList.toggle('selected', x === b));
  });
  if (t.id === trainingTrackId) b.classList.add('selected');
  pick.append(b);
}

// Arrivée depuis l'éditeur : on ouvre directement l'entraînement sur le circuit de test
if (trainingTrackId === 'custom-test') showTrainingPicker(true);

tuning = createTuningPanel($('tuning'), {
  getCar: () => session?.car ?? { def: { id: carId, stats: {} }, params: {} },
  setCarDef: (id) => { carId = id; session?.setCarDef(id); }, // outil de test : ne modifie pas la sauvegarde
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
// « Recommencer » relance le même circuit (sans trophées pour la course abandonnée)
$('btn-restart').addEventListener('click', () => (session?.isTutorial ? startTutorial() : startRace()));
$('btn-quit').addEventListener('click', backToMenu);
// « Rejouer » : nouvelle course classée (nouveau tirage) ou même circuit en entraînement
$('btn-again').addEventListener('click', () => (training ? startTraining() : startRankedRace()));
$('btn-training').addEventListener('click', () => showTrainingPicker(true));
$('btn-garage').addEventListener('click', () => garage.open());
const settingsScreen = createSettingsScreen({
  save,
  onChange: (commit) => { audio.applyVolumes(); applyControls(); if (commit) persist(); },
  onImport: (data) => {
    // Remplace toute la progression par celle du code, puis recharge le jeu
    for (const k of Object.keys(save)) delete save[k];
    Object.assign(save, data);
    persist();
    location.reload();
  },
  onTutorial: () => startTutorial(),
});
$('btn-settings').addEventListener('click', () => settingsScreen.open());
$('btn-pause-settings').addEventListener('click', () => settingsScreen.open({ inRace: true }));
$('btn-train-back').addEventListener('click', () => showTrainingPicker(false));
$('btn-menu').addEventListener('click', backToMenu);

// Si Android efface le dessin du jeu (manque de mémoire graphique),
// on reconstruit les images au lieu de rester sur un écran noir.
canvas.addEventListener('contextlost', (e) => e.preventDefault());
canvas.addEventListener('contextrestored', () => session?.reloadGraphics());

async function enterFullscreenOnMobile() {
  if (touch) {
    $('rotate-hint').classList.add('enabled');
    try {
      await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      await screen.orientation?.lock?.('landscape');
    } catch { /* pas grave : certains navigateurs refusent */ }
    setTimeout(() => session?.resize(), 300);
  }
}
$('btn-start').addEventListener('click', () => { enterFullscreenOnMobile(); startRankedRace(); });
$('btn-train-go').addEventListener('click', () => { enterFullscreenOnMobile(); startTraining(); });

// Pause automatique quand l'application passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (state === 'race') pause();
    else loop.stop();
    audio.suspend();
  } else {
    audio.resume();
    if (state === 'results') loop.start();
  }
});

// Accès pour les tests automatiques
window.__ND = { session: () => session, loop: () => loop, perf, state: () => state, save: () => save };

// Installation comme application + jeu hors ligne (version publiée uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* pas grave : le jeu marche sans */ });
  });
}
