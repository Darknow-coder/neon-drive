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
import { createMusic, songForTrack } from './audio/music.js';
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
import { createEventScreen } from './ui/event.js';
import { createSeasonScreen } from './ui/season.js';
import { createCareerScreen } from './ui/career.js';
import { createDailyScreen, dailyGoals, ensureTargets } from './ui/daily.js';
import { createRankingScreen } from './ui/ranking.js';
import { syncProfile, onOnlineChange } from './online/sync.js';
import { cached as onlineCached } from './online/api.js';
import { starsHtml } from './ui/career.js';
import { ico } from './ui/icons.js';
import { dailyChallenge, challengeRules, applyDailyResult, refreshDaily, dailyBadge, challengeSummary, currentStreak } from './progression/daily.js';
import { DAILY_DONE_XP } from './data/daily.js';
import { DAILY_TIME_LEVEL } from './race/dailyRef.js';
import { registerTempTrack } from './data/tracks/index.js';
import { AI_CAR_LEVEL } from './data/economy.js';
import { stageById, DUEL_PACE } from './data/career.js';
import { RIVALS } from './data/rivals.js';
import { applyStageResult, campaignBadge, currentChapter, totalStars, MAX_STARS } from './progression/campaign.js';
import { addSeasonXp, raceXp, seasonLevel, seasonBadge } from './progression/season.js';
import { XP } from './data/season.js';
import { EVENT } from './data/event.js';
import { eventField, applyEventResult } from './progression/event.js';
import { EVENT_TRACKS } from './data/tracks/index.js';
import { carIcon } from './ui/carIcon.js';

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
let lastOnlineSig = '';
function persist() {
  lastCredits = trackTotals(save, lastCredits);
  // Classement en ligne : profil envoyé quand les trophées, le pseudo ou l'emblème changent
  const sig = `${save.trophies}|${save.career.races}|${save.profile.name}|${save.profile.avatar}|${save.profile.color}|${save.profile.title}|${save.selectedCar}`;
  if (sig !== lastOnlineSig) { lastOnlineSig = sig; syncProfile(save); }
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
  // En course : le morceau dépend du circuit (sa météo ou son décor)
  const song = songForTrack(getTrackData(trackId));
  const m = state === 'race' || state === 'reveal' ? 'race' : state === 'pause' ? 'pause' : state === 'results' ? 'results' : 'menu';
  music.setMode(m, song);
}
// La scène de course pilote aussi la musique (dernier tour, jingles)
sfx.music = music;
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
  // Passe de saison : niveau et récompenses à récupérer
  $('nav-pass-lvl').textContent = String(seasonLevel(save.pass.xp).level);
  const pb = seasonBadge(save);
  $('pass-badge').textContent = String(pb);
  $('pass-badge').classList.toggle('hidden', !pb);
  // Classement mondial (dernière place connue)
  const om = onlineCached();
  $('menu-rank').textContent = om?.rank ? `#${Number(om.rank).toLocaleString('fr-FR')}` : 'CLASSEMENT';
  // Défi du jour
  refreshDaily(save);
  const dch = dailyChallenge();
  $('menu-daily-sub').textContent = challengeSummary(dch);
  const streak = currentStreak(save);
  $('menu-daily-stars').innerHTML = `${streak ? `<em>${ico('flame')}${streak}</em>` : ''}${starsHtml(save.daily.stars)}`;
  $('daily-badge').classList.toggle('hidden', !dailyBadge(save));
  // Carrière : chapitre en cours et étoiles
  const curCh = currentChapter(save);
  $('menu-career-sub').innerHTML = `Chapitre ${curCh.n} · ${totalStars(save)}/${MAX_STARS} ★`;
  $('career-badge').classList.toggle('hidden', !campaignBadge(save));
  // Tuile de l'événement : meilleure place
  $('event-sub').textContent = save.event.best ? `Événement · record ${save.event.best === 1 ? '1re' : `${save.event.best}e`} place` : `Événement · ${EVENT.drivers} pilotes`;
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
const seasonScreen = createSeasonScreen({ save, onSave: persist, sfx, onClose: refreshMenu });
const careerScreen = createCareerScreen({ save, onSave: persist, sfx, onClose: refreshMenu, onPlay: (id) => { enterFullscreenOnMobile(); startCareerStage(id); } });
let lastCareer = null; // résultat du dernier défi (pour l'écran Carrière)
const rankingScreen = createRankingScreen({ save, sfx, onClose: refreshMenu });
onOnlineChange(() => { if (state === 'menu') refreshMenu(); });
const dailyScreen = createDailyScreen({ save, onSave: persist, sfx, onClose: refreshMenu, onPlay: () => { enterFullscreenOnMobile(); startDaily(); } });
let lastDaily = null;

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
    const sx = addSeasonXp(save, raceXp('cup', me.position), { race: true });
    info = `<span>Crédits de la course : <b>+${credits.total}</b></span><span>Passe de saison : <b>+${sx.gained} XP${sx.doubled ? ' (×2)' : ''}</b>${sx.after > sx.before ? ` · NIVEAU ${sx.after} !` : ''}</span>` +
      changes.map((c) => `<span class="${c.done ? 'ok' : ''}">${c.mission.text} <b>${c.done ? '✓' : `${c.after}/${c.mission.target}`}</b></span>`).join('');
  }
  const res = applyCupRace(cup, order);
  persist();
  updateMusic();
  cupUi.showStandings(cup, res, info, {
    onNext: () => {
      if (!res.finished) return startCupRace();
      const fin = finishCup(save);
      if (fin?.rank) addSeasonXp(save, XP.cupFinal[fin.rank - 1] ?? 0);
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
  let season = null;
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
    season = addSeasonXp(save, raceXp(session.isElimination ? 'elim' : 'ranked', me.position), { race: true });
    persist();
  }
  showResults(rows, { trackName: session.trackName, reward, training, credits, missions: missionChanges, season });
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

// ---------------------------------------------------------------- DÉFI DU JOUR
function startDaily() {
  if (!save.tutorialDone) { startTutorial(); return; }
  const ch = dailyChallenge();
  registerTempTrack(ch.track);
  ensureTargets(save, ch, persist);
  training = false;
  const league = leagueFor(save.trophies).id;
  trackId = ch.id;
  // Voiture imposée : prêtée, au même niveau que les adversaires (ou niveau fixe en chrono)
  carId = ch.car ?? selectedCar(save);
  const level = ch.car ? (ch.format === 'time' ? DAILY_TIME_LEVEL : AI_CAR_LEVEL[league]) : carLevel(save, carId);
  const colors = save.garage.owned.includes(carId) ? liveryFor(save, carId) : getCar(carId).colors;
  session?.dispose();
  const common = {
    renderer, input, hud, lowEnd, trackId, carId, league, playerColors: colors, sfx, settings: save.settings, playerLevel: level,
    rules: challengeRules(ch), aiCar: ch.rule === 'oneCar' ? ch.car : null,
    onFinish: (rows) => dailyDone(ch, rows),
  };
  if (ch.format === 'elim') session = createElimination(common);
  else if (ch.format === 'time') session = createRaceScene({ ...common, laps: ch.laps, solo: true });
  else session = createRaceScene({ ...common, laps: ch.laps, rival: true, grid: ch.format === 'last' ? 'last' : null });
  session.isDaily = true;
  input.reset();
  hideResults();
  show('pause', false);
  show('start', false);
  setRaceUi(true);
  state = 'race';
  updateMusic();
  loop.start();
}

function dailyDone(ch, rows) {
  state = 'results';
  setRaceUi(false);
  sfx.stopCar();
  const me = rows.find((r) => r.isPlayer) ?? { position: rows.length, finished: false, time: null };
  const res = applyDailyResult(save, ch, { position: me.position, finished: me.finished, time: me.finished ? me.time : null });
  let season;
  if (ch.format !== 'time') {
    recordRace(save, { position: me.position, carId, trackId: ch.base, mode: 'daily' });
    season = addSeasonXp(save, raceXp('daily', me.position, rows.length) + (res.streakReward ? DAILY_DONE_XP : 0), { race: true });
  } else season = addSeasonXp(save, res.stars * 25 + (res.streakReward ? DAILY_DONE_XP : 0));
  persist();
  lastDaily = res;
  const lines = [];
  if (res.credits) lines.push({ label: `${res.gained} nouvelle${res.gained > 1 ? 's' : ''} étoile${res.gained > 1 ? 's' : ''}`, amount: res.credits });
  showResults(rows, {
    trackName: `DÉFI DU JOUR · ${ch.track.name}`,
    credits: lines.length ? { total: lines.reduce((a, l) => a + l.amount, 0), lines } : null,
    season,
    career: {
      stars: res.stars, prev: res.prev, goals: dailyGoals(ch, save.daily.targets), backLabel: 'DÉFI',
      extra: res.streakReward ? `SÉRIE : ${res.streak} JOUR${res.streak > 1 ? 'S' : ''} ! Récompense sur l'écran du défi` : res.newBest ? 'NOUVEAU MEILLEUR RÉSULTAT DU JOUR !' : '',
    },
  });
  if (res.gained) setTimeout(() => sfx.unlock(), 500);
  updateMusic();
}

function backToDaily() {
  const after = lastDaily;
  lastDaily = null;
  backToMenu();
  dailyScreen.open(after);
}

// ---------------------------------------------------------------- CARRIÈRE
/** Lance un défi de la carrière (niveau des IA : celui de la ligue du chapitre). */
function startCareerStage(id) {
  const stage = stageById(id);
  if (!stage) return;
  if (!save.tutorialDone) { startTutorial(); return; }
  const ch = stage.chapter;
  training = false;
  carId = selectedCar(save);
  trackId = stage.track;
  session?.dispose();
  const common = {
    renderer, input, hud, lowEnd, trackId, carId, league: ch.league,
    playerColors: liveryFor(save, carId), sfx, settings: save.settings, playerLevel: carLevel(save, carId),
    onFinish: (rows) => careerDone(stage, rows),
  };
  const rv = Object.values(RIVALS).find((r) => r.id === ch.rival);
  if (stage.type === 'elim') session = createElimination(common);
  else if (stage.type === 'time') session = createRaceScene({ ...common, laps: stage.laps, solo: true });
  else if (stage.type === 'duel') {
    // Duel : le rival en pole, toi juste derrière, en 1 contre 1
    session = createRaceScene({
      ...common, laps: stage.laps,
      field: (pe) => [{ def: getCar(rv.car), name: rv.name, profile: rv.profile, colors: rv.colors, isRival: true,
        paceMul: rv.paceMul, skillScale: DUEL_PACE, mistakeMul: rv.mistakeMul, skill: rv.skill }, pe],
    });
  } else session = createRaceScene({ ...common, laps: stage.laps, rival: true, grid: stage.type === 'last' ? 'last' : null });
  session.careerStage = stage.id;
  input.reset();
  hideResults();
  show('pause', false);
  show('start', false);
  setRaceUi(true);
  state = 'race';
  updateMusic();
  loop.start();
}

/** Fin d'un défi : étoiles, crédits, récompenses de chapitre, XP de saison. */
function careerDone(stage, rows) {
  state = 'results';
  setRaceUi(false);
  sfx.stopCar();
  const me = rows.find((r) => r.isPlayer) ?? { position: rows.length, finished: false, stats: { wallHits: 1 }, time: null };
  const rv = rows.find((r) => r.isRival);
  const result = {
    position: me.position, finished: me.finished,
    rivalBeaten: !!rv && me.position < rv.position,
    wallHits: me.stats.wallHits,
    time: me.finished ? me.time : null,
    margin: me.position === 1 && rows[1] ? rows[1].gap : 0,
  };
  const res = applyStageResult(save, stage.id, result);
  let season = null;
  if (stage.type !== 'time') {
    recordRace(save, { position: me.position, carId, trackId, mode: 'career' });
    season = addSeasonXp(save, raceXp('career', me.position, rows.length), { race: true });
  } else season = addSeasonXp(save, res.stars * 20 + 20);
  persist();
  lastCareer = res;
  const lines = [];
  if (res.credits) lines.push({ label: `${res.gained} nouvelle${res.gained > 1 ? 's' : ''} étoile${res.gained > 1 ? 's' : ''}`, amount: res.credits });
  if (res.allStars) lines.push({ label: 'Toutes les étoiles !', amount: res.allStars.credits });
  showResults(rows, {
    trackName: `${stage.title} · ${session.trackName}`,
    credits: lines.length ? { total: lines.reduce((a, l) => a + l.amount, 0), lines } : null,
    season,
    career: res,
  });
  if (res.stars >= 1 && res.gained) setTimeout(() => sfx.unlock(), 500);
  updateMusic();
}

/** Retour à l'écran Carrière après un défi. */
function backToCareer() {
  const after = lastCareer;
  lastCareer = null;
  backToMenu();
  careerScreen.open(after);
}

// ---------------------------------------------------------------- ÉVÉNEMENT
/** GIGA RUSH : 20 voitures sur NEON HIGHWAY (niveau des IA fixé par la ligue). */
function startEvent() {
  if (!save.tutorialDone) { startTutorial(); return; }
  training = false;
  carId = selectedCar(save);
  trackId = EVENT.trackId;
  const league = leagueFor(save.trophies).id;
  session?.dispose();
  session = createRaceScene({
    renderer, input, hud, lowEnd, trackId, carId, league, laps: EVENT.laps,
    playerColors: liveryFor(save, carId), sfx, settings: save.settings,
    playerLevel: carLevel(save, carId),
    field: (playerEntry) => eventField(league, playerEntry),
    onFinish: (rows) => eventDone(rows),
  });
  session.isEvent = true;
  input.reset();
  hideResults();
  show('pause', false);
  show('start', false);
  setRaceUi(true);
  state = 'race';
  updateMusic();
  loop.start();
}

/** Fin de la GIGA RUSH : crédits, objectifs, record, carrière. */
function eventDone(rows) {
  state = 'results';
  setRaceUi(false);
  sfx.stopCar();
  const me = rows.find((r) => r.isPlayer);
  const res = applyEventResult(save, me.position);
  recordRace(save, { position: me.position, carId, trackId, mode: 'event' });
  const season = addSeasonXp(save, raceXp('event', me.position, rows.length), { race: true });
  persist();
  const place = me.position === 1 ? '1re' : `${me.position}e`;
  const lines = [{ label: `${place} place sur ${rows.length}`, amount: res.credits }];
  for (const g of res.goals) if (g.credits) lines.push({ label: `Objectif « ${g.goal.label} »`, amount: g.credits });
  showResults(rows, {
    trackName: `${EVENT.name} · ${session.trackName}`,
    credits: { total: lines.reduce((a, l) => a + l.amount, 0), lines },
    season,
    event: {
      record: res.newBest && save.event.played > 1 ? `NOUVEAU RECORD : ${place} PLACE !` : '',
      goals: res.goals.map((g) => g.goal.label),
    },
  });
  updateMusic();
  // Récompenses des objectifs (packs, motif exclusif) : ouvertes par-dessus les résultats
  const rewards = [];
  for (const g of res.goals) {
    if (g.packId) rewards.push({ packId: g.packId, gains: g.gains });
    if (g.motif) {
      const visual = carIcon(getCar(carId), { ...liveryFor(save, carId), motif: g.motif }, 260, 166);
      rewards.push({ title: 'MOTIF EXCLUSIF', visual, note: 'Motif <b>GIGA RUSH</b> débloqué : équipe-le au garage !' });
    }
  }
  if (rewards.length) {
    setTimeout(() => sfx.unlock(), 700);
    setTimeout(() => { if (state === 'results') showRewards(save, rewards, { sfx, onClose: refreshMenu }); }, 1800);
  }
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
for (const t of [...TRACKS, ...EVENT_TRACKS]) {
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
$('btn-restart').addEventListener('click', () => (session?.isDaily ? startDaily() : session?.careerStage ? startCareerStage(session.careerStage) : session?.isEvent ? startEvent() : session?.isTutorial ? startTutorial() : session?.isTimeTrial ? startTimeTrial(session.trackId) : session?.isElimination ? startElimination(false) : startRace()));
$('btn-quit').addEventListener('click', () => {
  if (session?.isCup && save.cup) {
    show('pause', false);
    cupRaceDone(computeResults(session.world), true);
  } else if (session?.careerStage) backToCareer();
  else if (session?.isDaily) backToDaily();
  else backToMenu();
});
$('btn-cup').addEventListener('click', openCup);
$('btn-elim').addEventListener('click', () => { enterFullscreenOnMobile(); startElimination(); });
// « Rejouer » : nouvelle course classée (nouveau tirage) ou même circuit en entraînement
$('btn-again').addEventListener('click', () => (session?.isDaily ? startDaily() : session?.careerStage ? startCareerStage(session.careerStage) : session?.isEvent ? startEvent() : session?.isElimination ? startElimination() : training ? startTraining() : startRankedRace()));
$('btn-training').addEventListener('click', () => showTrainingPicker(true));
$('btn-garage').addEventListener('click', () => garage.open());
$('btn-car-show').addEventListener('click', () => garage.open());
const eventScreen = createEventScreen({ save, sfx, onPlay: () => { enterFullscreenOnMobile(); startEvent(); }, onClose: refreshMenu });
$('btn-event').addEventListener('click', () => eventScreen.open());
$('btn-road').addEventListener('click', () => road.open());
$('btn-pass').addEventListener('click', () => seasonScreen.open());
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
$('btn-menu').addEventListener('click', () => (session?.isDaily ? backToDaily() : session?.careerStage ? backToCareer() : backToMenu()));
$('btn-daily').addEventListener('click', () => dailyScreen.open());
$('btn-ranking').addEventListener('click', () => rankingScreen.open());
$('btn-career').addEventListener('click', () => careerScreen.open());

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
    // Connexion au classement en arrière-plan (sans bloquer)
    if (!skipIntro) setTimeout(() => syncProfile(save, { now: true }), 1200);
    if (!skipIntro) setTimeout(() => sfx.unlock(), 60);
    // Premier lancement : choix du pseudo
    if (!save.profile.name && !skipIntro) profile.openIdentity({ welcome: true });
  },
});

// Accès pour les tests automatiques
window.__ND = { audio: () => audio, music: () => music, session: () => session, loop: () => loop, perf, state: () => state, save: () => save };

// Installation comme application + jeu hors ligne (version publiée uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* pas grave : le jeu marche sans */ });
  });
}
