// Point d'entrée du jeu : enchaîne les écrans (menu → course → résultats).

import { createLoop } from './core/loop.js';
import { createInput, isTouchDevice } from './core/input.js';
import { createRenderer } from './render/renderer.js';
import { createHud } from './ui/hud.js';
import { createTuningPanel } from './ui/tuningPanel.js';
import { showResults, hideResults } from './ui/resultsScreen.js';
import { createRaceScene } from './scenes/raceScene.js';
import { TRACKS, getTrackData } from './data/tracks/index.js';
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
import { raceCredits, carLevel, claimableCount } from './progression/economy.js';
import { createRoad } from './ui/road.js';
import { createShop } from './ui/shop.js';
import { showRewards } from './ui/packOpen.js';
import { createMissions } from './ui/missions.js';
import { createTimeTrial } from './scenes/timeTrial.js';
import { createTimeTrialSelect } from './ui/timeTrialSelect.js';
import { createCupScreens } from './ui/cup.js';
import { createElimination } from './scenes/elimination.js';
import { ELIM_TROPHIES } from './data/elimination.js';
import { startCup, cupGrid, applyCupRace, finishCup, abandonCup, PLAYER } from './progression/cup.js';
import { computeResults } from './race/results.js';
import { LEAGUES } from './data/progression.js';
import { refreshMissions, applyMissionProgress } from './progression/missions.js';
import { refreshShop } from './progression/shop.js';
import { PACKS } from './data/economy.js';
import { FINISHES, MOTIFS } from './data/shop.js';

/** Nom court d'une offre de la boutique (pour l'écran de résultats). */
function offerLabel(o) {
  if (o.kind === 'fragments') return `${getCar(o.carId).name} ×${o.amount} fragments (${o.price})`;
  if (o.kind === 'pack') return `${PACKS[o.packId].name} (${o.price})`;
  const it = (o.kind === 'finish' ? FINISHES : MOTIFS).find((x) => x.id === o.itemId);
  return `${o.kind === 'finish' ? 'finition' : 'motif'} ${it?.name ?? ''} (${o.price})`;
}
import { rivalFor } from './data/rivals.js';
import { createProfile } from './ui/profile.js';
import { avatarHtml } from './ui/avatar.js';
import { setPlayerLabel } from './ui/playerLabel.js';
import { runBoot } from './ui/boot.js';
import { recordRace, addDriving, trackTotals, playerName, currentTitle, achievementsBadge } from './progression/profile.js';
import { iconImage } from './ui/icons.js';
import { minimap } from './ui/timeTrialSelect.js';

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
// Crédits gagnés et record de trophées : suivis à chaque sauvegarde
let lastCredits = save.credits;
function persist() {
  lastCredits = trackTotals(save, lastCredits);
  setPlayerLabel(save.profile.name);
  if (!store.save(save) && store.available) saveStatus = 'failed';
}
setPlayerLabel(save.profile.name);
// Voitures dont le palier est déjà atteint (ex. ancienne sauvegarde convertie)
if (syncUnlocks(save).length) persist();

// ---------------- Son ----------------
const audio = createAudio(save.settings);
const sfx = createSfx(audio);
const music = createMusic(audio);
/** Ambiance musicale selon l'écran affiché. */
function updateMusic() {
  if (!audio.ctx) return;
  // En course : le morceau dépend de l'environnement du circuit
  const style = getTrackData(trackId).theme?.style ?? 'city';
  music.setMode(state === 'race' || state === 'reveal' ? 'race' : 'menu', style);
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
  // Bouton COUPE : reprise d'une coupe en cours, ou ligue de la prochaine coupe
  $('cup-sub').textContent = save.cup
    ? `Reprendre · course ${save.cup.race + 1}/3`
    : `3 courses · ligue ${LEAGUES.find((l) => l.id === leagueFor(save.trophies).id)?.name ?? ''}`;
  $('btn-cup').classList.toggle('live', !!save.cup);
  // Profil : emblème, pseudo, titre et succès à récupérer
  $('menu-avatar').innerHTML = avatarHtml(save.profile, 'av-s');
  $('menu-name').textContent = playerName(save);
  $('menu-title').textContent = currentTitle(save);
  const nb = achievementsBadge(save);
  $('profile-badge').textContent = String(nb);
  $('profile-badge').classList.toggle('hidden', !nb);
}

const shop = createShop({ save, onSave: persist, sfx, onClose: refreshMenu });
const garage = createGarage({ save, onSave: persist, onClose: refreshMenu, sfx, openShop: (tab) => shop.open(tab) });
// Offres du jour prêtes dès le lancement
if (refreshShop(save)) persist();
const missions = createMissions({ save, onSave: persist, sfx, onClose: refreshMenu });
const road = createRoad({ save, onSave: persist, sfx, onClose: refreshMenu });
const profile = createProfile({ save, onSave: persist, sfx, onClose: refreshMenu });

function startRace() {
  // Le circuit n'est construit qu'au lancement (et l'ancien est libéré) :
  // sur téléphone, garder plusieurs grands circuits en mémoire peut provoquer
  // un écran noir.
  carId = selectedCar(save);
  session?.dispose();
  const league = leagueFor(save.trophies).id; // niveau des IA fixé AVANT la course
  session = createRaceScene({
    renderer, input, hud, lowEnd, trackId, carId, league, laps: getTrackData(trackId).laps ?? RACE_LAPS,
    playerColors: liveryFor(save, carId),
    sfx,
    settings: save.settings,
    rival: !training, // le rival de la ligue est présent en course classée
    playerLevel: carLevel(save, carId),
    onFinish: (rows) => handleRaceFinish(rows),
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

// ---------------------------------------------------------------- COUPE
const cupUi = createCupScreens({ save, sfx });

function openCup() {
  const resumed = !!save.cup;
  if (!resumed) { startCup(save); persist(); }
  show('start', false);
  cupUi.showIntro(save.cup, {
    resumed,
    onStart: () => { enterFullscreenOnMobile(); startCupRace(); },
    onAbandon: () => { abandonCup(save); persist(); backToMenu(); },
  });
}

/** Lance la prochaine course de la coupe (pilotes et grille imposés). */
function startCupRace() {
  const cup = save.cup;
  if (!cup) return backToMenu();
  carId = selectedCar(save);
  trackId = cup.tracks[cup.race];
  training = false;
  session?.dispose();
  session = createRaceScene({
    renderer, input, hud, lowEnd, trackId, carId, league: cup.league,
    laps: getTrackData(trackId).laps ?? RACE_LAPS,
    playerColors: liveryFor(save, carId), sfx, settings: save.settings,
    playerLevel: carLevel(save, carId),
    gridOrder: cupGrid(cup),
    onFinish: (rows) => cupRaceDone(rows),
  });
  session.isCup = true;
  input.reset();
  hideResults();
  show('pause', false);
  show('start', false);
  setRaceUi(true);
  state = 'race';
  updateMusic();
  loop.start();
}

/** Fin d'une course de coupe (ou abandon : le joueur compte comme 6e). */
function cupRaceDone(rows, abandoned = false) {
  state = 'results';
  setRaceUi(false);
  sfx.stopCar();
  const cup = save.cup;
  let order = rows.map((r) => r.name);
  let info = '';
  if (abandoned) {
    order = [...order.filter((n) => n !== PLAYER), PLAYER];
    info = '<span>Course quittée : comptée comme une 6e place.</span>';
  } else {
    const me = rows.find((r) => r.isPlayer);
    const rv = rows.find((r) => r.isRival);
    const rivalBeaten = !!rv && me.position < rv.position;
    const credits = raceCredits({
      position: me.position, driftTime: me.stats.drift, overtakes: me.stats.overtakes,
      clean: me.stats.wallHits === 0 && me.finished, rivalBeaten,
    });
    save.credits += credits.total;
    refreshMissions(save);
    const changes = applyMissionProgress(save, {
      position: me.position, overtakes: me.stats.overtakes, clean: me.stats.wallHits === 0 && me.finished,
      rivalBeaten, pads: me.stats.pads, trackId, carId, credits: credits.total,
    });
    recordRace(save, { position: me.position, carId, trackId, mode: 'cup' });
    info = `<span>Crédits de la course : <b>+${credits.total}</b></span>` +
      changes.map((c) => `<span class="${c.done ? 'ok' : ''}">${c.mission.text} <b>${c.done ? '✓' : `${c.after}/${c.mission.target}`}</b></span>`).join('');
  }
  const res = applyCupRace(cup, order);
  persist();
  updateMusic();
  cupUi.showStandings(cup, res, info, {
    onNext: () => {
      if (!res.finished) return startCupRace();
      const fin = finishCup(save);
      persist();
      loop.stop();
      session?.dispose();
      session = null;
      cupUi.showFinal(fin, {
        onDone: () => {
          backToMenu();
          if (fin.gains.length) showRewards(save, [{ packId: fin.reward.pack, gains: fin.gains }], { sfx, onClose: refreshMenu });
        },
      });
    },
    onMenu: () => backToMenu(),
  });
}

/** Fin d'une course classée (ou d'élimination) : trophées, crédits, missions, résultats. */
function handleRaceFinish(rows, { trophyTable } = {}) {
  state = 'results';
  setRaceUi(false);
  let reward = null;
  let credits = null;
  let missionChanges = [];
  if (!training) {
    const me = rows.find((r) => r.isPlayer);
    const rv = rows.find((r) => r.isRival);
    const rivalBeaten = !!rv && me.position < rv.position;
    reward = applyRaceResult(save, {
      position: me.position, trackId, carId, bestLap: me.bestLap,
      rivalId: session.rival?.id ?? null, rivalBeaten, ...(trophyTable ? { trophyTable } : {}),
    });
    credits = raceCredits({
      position: me.position, driftTime: me.stats.drift, overtakes: me.stats.overtakes,
      clean: me.stats.wallHits === 0 && me.finished, rivalBeaten,
    });
    save.credits += credits.total;
    // Incitation : une offre du jour qu'on peut maintenant s'offrir
    refreshShop(save);
    const affordable = save.shop.offers
      .filter((o) => !o.bought && o.price <= save.credits)
      .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.price - a.price)[0];
    if (affordable) credits.shopHint = offerLabel(affordable);
    // Missions
    refreshMissions(save);
    missionChanges = applyMissionProgress(save, {
      position: me.position, overtakes: me.stats.overtakes, clean: me.stats.wallHits === 0 && me.finished,
      rivalBeaten, pads: me.stats.pads, trackId, carId, credits: credits.total,
    });
    recordRace(save, { position: me.position, carId, trackId, mode: session.isElimination ? 'elim' : 'ranked' });
    persist();
  }
  showResults(rows, { trackName: session.trackName, reward, training, credits, missions: missionChanges });
  sfx.stopCar();
  if (reward?.unlockedCars?.length || reward?.promoted) setTimeout(() => sfx.unlock(), 900);
  updateMusic();

}

function pause() {
  state = 'pause';
  loop.stop();
  input.reset();
  sfx.stopCar();
  // En coupe : pas de « recommencer », et quitter compte comme une 6e place
  const cup = !!session?.isCup;
  show('btn-restart', !cup);
  show('pause-note', cup);
  $('pause-note').textContent = cup ? 'Quitter la course compte comme une 6e place (la coupe continue).' : '';
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
  // Packs gagnés en contre-la-montre : on les ouvre maintenant
  const pending = session?.isTimeTrial ? session.pendingRewards.splice(0) : [];
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
  if (pending.length) showRewards(save, pending, { sfx, onClose: refreshMenu });
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

/** Contre-la-montre sur un circuit. */
function startTimeTrial(id) {
  session?.dispose();
  training = true;
  trackId = id;
  carId = selectedCar(save);
  session = createTimeTrial({
    save, onSave: persist, trackId: id, carId,
    colors: liveryFor(save, carId), level: carLevel(save, carId),
    renderer, input, hud, lowEnd, sfx, settings: save.settings,
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

/** Mode Élimination : circuit tiré au sort dans la ligue, rival présent. */
function startElimination(withReveal = true) {
  if (!save.tutorialDone) { startTutorial(); return; }
  training = false;
  const league = leagueFor(save.trophies).id;
  const go = () => {
    carId = selectedCar(save);
    session?.dispose();
    session = createElimination({
      renderer, input, hud, lowEnd, trackId, carId, league,
      playerColors: liveryFor(save, carId), sfx, settings: save.settings,
      playerLevel: carLevel(save, carId),
      onFinish: (rows) => handleRaceFinish(rows, { trophyTable: ELIM_TROPHIES }),
    });
    input.reset();
    hideResults();
    show('pause', false);
    show('start', false);
    setRaceUi(true);
    state = 'race';
    updateMusic();
    loop.start();
  };
  trackId = pickTrack(save).id;
  if (!withReveal) return go();
  state = 'reveal';
  show('start', false);
  hideResults();
  show('pause', false);
  setRaceUi(false);
  updateMusic();
  revealTrack(tracksForLeague(league), getTrackData(trackId), go, rivalFor(league), 'ÉLIMINATION');
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
  revealTrack(pool, chosen, () => startRace(), rivalFor(leagueFor(save.trophies).id));
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
    // Temps au volant et distance parcourue (profil)
    if (state === 'race' && session?.car && session.world?.started !== false) addDriving(save, dt, session.car.speed);
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
$('btn-restart').addEventListener('click', () => (session?.isTutorial ? startTutorial() : session?.isTimeTrial ? startTimeTrial(session.trackId) : session?.isElimination ? startElimination(false) : startRace()));
$('btn-quit').addEventListener('click', () => {
  if (session?.isCup && save.cup) {
    show('pause', false);
    cupRaceDone(computeResults(session.world), true);
  } else backToMenu();
});
$('btn-cup').addEventListener('click', openCup);
$('btn-elim').addEventListener('click', () => { enterFullscreenOnMobile(); startElimination(); });
// « Rejouer » : nouvelle course classée (nouveau tirage) ou même circuit en entraînement
$('btn-again').addEventListener('click', () => (session?.isElimination ? startElimination() : training ? startTraining() : startRankedRace()));
$('btn-training').addEventListener('click', () => showTrainingPicker(true));
$('btn-garage').addEventListener('click', () => garage.open());
$('btn-car-show').addEventListener('click', () => garage.open());
$('btn-event').classList.add('soon');
$('btn-event').addEventListener('click', () => {
  $('event-sub').textContent = 'Arrive très bientôt !';
  sfx.click();
});
$('btn-road').addEventListener('click', () => road.open());
$('btn-profile').addEventListener('click', () => profile.open(achievementsBadge(save) ? 'ach' : 'stats'));
$('btn-shop').addEventListener('click', () => shop.open());
$('btn-missions').addEventListener('click', () => missions.open());
const ttSelect = createTimeTrialSelect({ save, onStart: (id) => { enterFullscreenOnMobile(); startTimeTrial(id); }, onClose: refreshMenu });
$('btn-timetrial').addEventListener('click', () => ttSelect.open());
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

// ---------------- Écran de chargement, puis accueil ----------------
// (les tests automatiques le passent, sauf avec ?intro dans l'adresse)
const skipIntro = navigator.webdriver && !urlParams.has('intro');
$('about').innerHTML = `NEON//DRIVE <b>v${__APP_VERSION__}</b> · un jeu de Darknow`;
runBoot({
  version: __APP_VERSION__,
  touch,
  skip: skipIntro,
  tasks: [
    ['Allumage des néons…', () => Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 2500))])],
    ['Chargement des icônes…', () => Promise.all(['trophy', 'credit', 'lock'].map((n) => iconImage(n).decode?.().catch(() => {})))],
    ['Préparation des circuits…', async () => {
      // Plans des circuits calculés à l'avance (chrono, profil : affichage immédiat)
      for (const t of TRACKS) { if (!t.custom) minimap(t); await new Promise((r) => setTimeout(r, 0)); }
    }],
    ['Chargement de ta progression…', () => {
      refreshMenu();
      if (saveStatus === 'restored') $('boot-status').textContent = 'Sauvegarde de secours restaurée.';
    }],
  ],
  onEnter: () => {
    if (!skipIntro) setTimeout(() => sfx.unlock(), 60);
    // Premier lancement : choix du pseudo
    if (!save.profile.name && !skipIntro) profile.openIdentity({ welcome: true });
  },
});

// Accès pour les tests automatiques
window.__ND = { session: () => session, loop: () => loop, perf, state: () => state, save: () => save };

// Installation comme application + jeu hors ligne (version publiée uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* pas grave : le jeu marche sans */ });
  });
}
