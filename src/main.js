// Point d'entrée du jeu : enchaîne les écrans (menu → course → résultats).

import { createLoop } from './core/loop.js';
import { translateDom, LANG, LOCALE, setLang, t, ord, fmtNum, missingKeys, many } from './i18n/index.js';
import { applyPrefs } from './core/prefs.js';
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
import { createMenuTour } from './ui/menuTour.js';
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
import { refreshMissions, applyMissionProgress, missionText } from './progression/missions.js';
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
import { createLegalScreen } from './ui/legal.js';
import { rpc as onlineRpc, onlineId } from './online/api.js';
import { syncProfile, onOnlineChange, deleteOnlineProfile } from './online/sync.js';
import { uploadRecord, uploadPending, resetSent } from './online/chrono.js';
import { startTelemetry, track, flush as flushStats } from './online/telemetry.js';
import { createFeedback, sendPendingFeedback } from './ui/feedback.js';
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

// Textes écrits en dur dans la page : traduits avant tout affichage
translateDom();
const $ = (id) => document.getElementById(id);
const show = (id, v = true) => $(id).classList.toggle('hidden', !v);

const touch = isTouchDevice();
document.body.classList.toggle('is-touch', touch);
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
// Statistiques anonymes (désactivables dans les réglages)
startTelemetry(save);
/** Une course terminée : total + mode joué. */
function trackRace(mode) { track('race'); track(`mode_${mode}`); }
// Voitures dont le palier est déjà atteint (ex. ancienne sauvegarde convertie)
if (syncUnlocks(save).length) persist();

// ---------------- Son ----------------
const audio = createAudio(save.settings, { lowEnd });
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
  // (actions : touches réglables du clavier ou boutons de la manette)
  onAction(code) {
    if (code === 'respawn' && state === 'race') session?.respawn();
    if (code === 'KeyT' && devMode) tuning?.toggle();
    if (code === 'pause') {
      if (state === 'race') pause();
      else if (state === 'pause' && $('settings').classList.contains('hidden')) resume();
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
  touchRoot.style.setProperty('--bo', String(c.opacity ?? 0.85));
  input.setOptions({ autoGas: c.autoGas, steer: c.steer ?? 'normal' });
  if (save.settings.keys) input.setKeys(save.settings.keys);
  input.remeasure?.();
}
applyControls();

function refreshMenu() {
  renderMenu(save, saveStatus);
  // Bouton COUPE : reprise d'une coupe en cours, ou ligue de la prochaine coupe
  $('cup-sub').textContent = save.cup
    ? t('Reprendre · course {n}/3', { n: save.cup.race + 1 })
    : t('3 courses · ligue {l}', { l: LEAGUES.find((l) => l.id === leagueFor(save.trophies).id)?.name ?? '' });
  $('btn-cup').classList.toggle('live', !!save.cup);
  // Passe de saison : niveau et récompenses à récupérer
  $('nav-pass-lvl').textContent = String(seasonLevel(save.pass.xp).level);
  const pb = seasonBadge(save);
  $('pass-badge').textContent = String(pb);
  $('pass-badge').classList.toggle('hidden', !pb);
  // Classement mondial (dernière place connue)
  const om = onlineCached();
  $('menu-rank').textContent = om?.rank ? `#${fmtNum(om.rank)}` : 'TOP';
  setFriendBadges(om?.incoming ?? 0);
  // Défi du jour
  refreshDaily(save);
  const dch = dailyChallenge();
  $('menu-daily-sub').textContent = challengeSummary(dch);
  const streak = currentStreak(save);
  $('menu-daily-stars').innerHTML = `${streak ? `<em>${ico('flame')}${streak}</em>` : ''}${starsHtml(save.daily.stars)}`;
  $('daily-badge').classList.toggle('hidden', !dailyBadge(save));
  // Carrière : chapitre en cours et étoiles
  const curCh = currentChapter(save);
  $('menu-career-sub').innerHTML = `${t('Chapitre {n}', { n: curCh.n })} · ${totalStars(save)}/${MAX_STARS} ★`;
  $('career-badge').classList.toggle('hidden', !campaignBadge(save));
  // Tuile de l'événement : meilleure place
  $('event-sub').textContent = save.event.best ? t('Événement · record {p} place', { p: ord(save.event.best, true) }) : t('Événement · {n} pilotes', { n: EVENT.drivers });
  // Profil : emblème, pseudo, titre et succès à récupérer
  $('menu-avatar').innerHTML = avatarHtml(save.profile, 'av-s');
  $('menu-name').textContent = playerName(save);
  $('menu-title').textContent = t(currentTitle(save));
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
function setFriendBadges(n) {
  for (const id of ['rank-badge', 'rk-friends-badge']) { $(id).textContent = String(n); $(id).classList.toggle('hidden', !n); }
}
const rankingScreen = createRankingScreen({ save, sfx, onClose: refreshMenu, onFriendsChange: setFriendBadges });
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
    info = `<span>${t('Course quittée : comptée comme une 6e place.')}</span>`;
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
    trackRace('cup');
    const sx = addSeasonXp(save, raceXp('cup', me.position), { race: true });
    info = `<span>${t('Crédits de la course :')} <b>+${credits.total}</b></span><span>${t('Passe de saison :')} <b>+${sx.gained} XP${sx.doubled ? ' (×2)' : ''}</b>${sx.after > sx.before ? ` · ${t('NIVEAU {n} !', { n: sx.after })}` : ''}</span>` +
      changes.map((c) => `<span class="${c.done ? 'ok' : ''}">${missionText(c.mission)} <b>${c.done ? '✓' : `${c.after}/${c.mission.target}`}</b></span>`).join('');
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
    trackRace(session.isElimination ? 'elim' : 'ranked');
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
  input.setPausedPoll(true);
  loop.stop();
  input.reset();
  sfx.stopCar();
  // En coupe : pas de « recommencer », et quitter compte comme une 6e place
  const cup = !!session?.isCup;
  show('btn-restart', !cup);
  show('pause-note', cup);
  $('pause-note').textContent = cup ? t('Quitter la course compte comme une 6e place (la coupe continue).') : '';
  show('pause', true);
  updateMusic();
}

function resume() {
  input.setPausedPoll(false);
  show('pause', false);
  state = 'race';
  updateMusic();
  loop.start();
}

function backToMenu() {
  input.setPausedPoll(false);
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
  else maybeAskFeedback();
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
    trackRace('daily');
    season = addSeasonXp(save, raceXp('daily', me.position, rows.length) + (res.streakReward ? DAILY_DONE_XP : 0), { race: true });
  } else season = addSeasonXp(save, res.stars * 25 + (res.streakReward ? DAILY_DONE_XP : 0));
  persist();
  lastDaily = res;
  const lines = [];
  if (res.credits) lines.push({ label: many(res.gained) ? t('{n} nouvelles étoiles', { n: res.gained }) : t('{n} nouvelle étoile', { n: res.gained }), amount: res.credits });
  showResults(rows, {
    trackName: `${t('DÉFI DU JOUR')} · ${ch.track.name}`,
    credits: lines.length ? { total: lines.reduce((a, l) => a + l.amount, 0), lines } : null,
    season,
    career: {
      stars: res.stars, prev: res.prev, goals: dailyGoals(ch, save.daily.targets), backLabel: t('DÉFI'),
      extra: res.streakReward ? (many(res.streak) ? t('SÉRIE : {n} JOURS ! Récompense sur l\'écran du défi', { n: res.streak }) : t('SÉRIE : {n} JOUR ! Récompense sur l\'écran du défi', { n: res.streak })) : res.newBest ? t('NOUVEAU MEILLEUR RÉSULTAT DU JOUR !') : '',
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
    trackRace('career');
    season = addSeasonXp(save, raceXp('career', me.position, rows.length), { race: true });
  } else season = addSeasonXp(save, res.stars * 20 + 20);
  persist();
  lastCareer = res;
  const lines = [];
  if (res.credits) lines.push({ label: many(res.gained) ? t('{n} nouvelles étoiles', { n: res.gained }) : t('{n} nouvelle étoile', { n: res.gained }), amount: res.credits });
  if (res.allStars) lines.push({ label: t('Toutes les étoiles !'), amount: res.allStars.credits });
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
  trackRace('event');
  const season = addSeasonXp(save, raceXp('event', me.position, rows.length), { race: true });
  persist();
  const lines = [{ label: t('{p} place sur {n}', { p: ord(me.position, true), n: rows.length }), amount: res.credits }];
  for (const g of res.goals) if (g.credits) lines.push({ label: t('Objectif « {g} »', { g: g.goal.label }), amount: g.credits });
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
      rewards.push({ title: t('MOTIF EXCLUSIF'), visual, note: t('Motif <b>GIGA RUSH</b> débloqué : équipe-le au garage !') });
    }
  }
  if (rewards.length) {
    setTimeout(() => sfx.unlock(), 700);
    setTimeout(() => { if (state === 'results') showRewards(save, rewards, { sfx, onClose: refreshMenu }); }, 1800);
  }
}

// ---------------------------------------------------------------- VISITE DU MENU
const menuTour = createMenuTour({
  sfx,
  onDone: ({ skipped } = {}) => { save.tourDone = true; persist(); track(skipped ? 'tour_skip' : 'tour_done'); },
  onRace: () => $('btn-start').click(),
});
/** Lance la visite quand le menu est vraiment libre (aucune fenêtre ouverte). */
function maybeStartTour(force = false, tries = 0) {
  if ((!force && save.tourDone) || menuTour.active) return;
  const busy = state !== 'menu' || document.querySelector('.overlay:not(.hidden)') || !$('menu-training').classList.contains('hidden') || $('boot');
  if (busy) { if (tries < 40) setTimeout(() => maybeStartTour(force, tries + 1), 500); return; }
  setTimeout(() => menuTour.start(), 350);
}

/** Tutoriel : leçon de pilotage en solo. */
function startTutorial() {
  track('tutorial_start');
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
      track('tutorial_done');
      persist();
      setTimeout(() => { backToMenu(); maybeStartTour(); }, 300);
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
function startTimeTrial(id, rival = null) {
  track('mode_tt');
  session?.dispose();
  training = true;
  trackId = id;
  carId = selectedCar(save);
  session = createTimeTrial({
    save, onSave: persist, trackId: id, carId,
    colors: liveryFor(save, carId), level: carLevel(save, carId),
    renderer, input, hud, lowEnd, sfx, settings: save.settings,
    rival, onRecord: () => uploadRecord(save, id),
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
  revealTrack(tracksForLeague(league), getTrackData(trackId), go, rivalFor(league), t('ÉLIMINATION'));
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
  track('mode_training');
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
  a.textContent = t('ÉDITEUR DE CIRCUITS');
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
// ---------------- Fluidité automatique ----------------
// Si l'appareil n'arrive pas à afficher ~50 images/s en course, la résolution
// baisse par paliers (le jeu reste net, mais un peu moins fin). Le réglage est
// retenu pour les prochaines courses. Forçable avec ?quality=high.
const QKEY = 'neondrive.quality';
// Au lancement on repart d'au moins 85 % : un ralentissement passé ne doit pas rendre le jeu flou pour toujours
const Q_MIN = 0.75;
let quality = (() => { try { return Math.max(0.85, Number(localStorage.getItem(QKEY)) || 1); } catch { return 1; } })();
/** Qualité choisie dans les réglages : auto (s'adapte), haute (pleine résolution), économie. */
function applyGraphics() {
  applyPrefs(save.settings); // (avant le redimensionnement : le zoom en dépend)
  const mode = q === 'high' ? 'high' : save.settings.graphics.quality;
  if (mode === 'high') renderer.setQuality(1);
  else if (mode === 'eco') renderer.setQuality(0.6);
  else renderer.setQuality(quality);
  session?.resize();
  applyPrefs(save.settings);
  document.body.classList.toggle('reduce-motion', !!save.settings.display.reduceMotion);
}
applyGraphics();
const fpsWatch = { slow: 0, fast: 0, cooldown: 0 };
function watchFps(dtReal) {
  if (state !== 'race' || q === 'high' || save.settings.graphics.quality !== 'auto' || save.settings.graphics.fps === 30 || dtReal <= 0 || dtReal > 0.25) return;
  const fpsNow = 1 / dtReal;
  fpsWatch.cooldown = Math.max(0, fpsWatch.cooldown - dtReal);
  if (fpsNow < 47) { fpsWatch.slow += dtReal; fpsWatch.fast = 0; } else if (fpsNow > 57) { fpsWatch.fast += dtReal; fpsWatch.slow = Math.max(0, fpsWatch.slow - dtReal * 0.5); }
  if (fpsWatch.cooldown > 0) return;
  if (fpsWatch.slow > 1.2 && quality > Q_MIN) {
    // En dessous de 75 %, l'image devient trop floue (surtout les voitures) : on s'arrête là
    quality = Math.max(Q_MIN, Math.round((quality - 0.1) * 100) / 100);
    renderer.setQuality(quality); session?.resize();
    try { localStorage.setItem(QKEY, String(quality)); } catch { /* rien */ }
    fpsWatch.slow = 0; fpsWatch.cooldown = 2;
  } else if (fpsWatch.fast > 12 && quality < 1) {
    // Très fluide depuis longtemps : on essaie un peu plus fin
    quality = Math.min(1, Math.round((quality + 0.1) * 100) / 100);
    renderer.setQuality(quality); session?.resize();
    try { localStorage.setItem(QKEY, String(quality)); } catch { /* rien */ }
    fpsWatch.fast = 0; fpsWatch.cooldown = 6;
  }
}

const loop = createLoop({
  maxFps: () => save.settings.graphics.fps,
  update: (dt) => {
    const t = performance.now();
    session?.update(dt);
    // Temps au volant et distance parcourue (profil)
    if (state === 'race' && session?.car && session.world?.started !== false) addDriving(save, dt, session.car.speed);
    perf.frameUpdate += performance.now() - t;
  },
  render: (alpha, dtReal) => {
    watchFps(dtReal);
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
const ttSelect = createTimeTrialSelect({ save, onStart: (id, rival) => { enterFullscreenOnMobile(); startTimeTrial(id, rival); }, onClose: refreshMenu, sfx });
$('btn-timetrial').addEventListener('click', () => ttSelect.open());
const settingsScreen = createSettingsScreen({
  save,
  input,
  onChange: (commit) => { audio.applyVolumes(); applyControls(); applyGraphics(); if (commit) persist(); },
  onIdentity: () => profile.openIdentity({ onDone: () => settingsScreen.open() }),
  onReset: () => {
    // Remise à zéro complète (la sauvegarde de secours est aussi effacée)
    store.wipe();
    try { for (const k of Object.keys(localStorage)) if (k.startsWith('neondrive.') && k !== 'neondrive.online') localStorage.removeItem(k); } catch { /* rien */ }
    location.reload();
  },
  accountInfo: () => {
    const om = onlineCached();
    const since = new Date(save.createdAt).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' });
    return `${avatarHtml(save.profile, 'av-m')}<div><b>${playerName(save)}${om?.tag ? ` <i>#${String(om.tag).padStart(4, '0')}</i>` : ''}</b>
      <small>${t(currentTitle(save))} · ${t('pilote depuis le {d}', { d: since })}</small>
      <small>${om?.friend_code ? `${t('Code ami :')} <em>${om.friend_code}</em> · ` : ''}${saveStatus === 'unavailable' ? `<span class="err">${t('Sauvegarde impossible sur ce navigateur (navigation privée ?)')}</span>` : t('Sauvegarde automatique ✓')}</small></div>`;
  },
  onImport: (data) => {
    // Remplace toute la progression par celle du code, puis recharge le jeu
    for (const k of Object.keys(save)) delete save[k];
    Object.assign(save, data);
    persist();
    location.reload();
  },
  onTutorial: () => startTutorial(),
  onTour: () => maybeStartTour(true),
});
$('btn-settings').addEventListener('click', () => settingsScreen.open());
// ---------------- Avis des joueurs ----------------
const feedback = createFeedback({ sfx });
$('btn-feedback').addEventListener('click', () => { sfx.click?.(); feedback.open('menu'); });
$('btn-feedback-set').addEventListener('click', () => { $('settings').classList.add('hidden'); feedback.open('reglages'); });
/** Après 5 courses, une seule fois : petite invitation (non bloquante) à donner son avis. */
function maybeAskFeedback() {
  if (save.feedbackAsked || save.career.races < 5 || !save.tourDone) return;
  setTimeout(() => {
    if (state !== 'menu' || document.querySelector('.overlay:not(.hidden)') || menuTour.active) return;
    save.feedbackAsked = true;
    persist();
    $('fb-prompt').classList.remove('hidden');
    track('feedback_prompt');
  }, 900);
}
$('fb-prompt-yes').addEventListener('click', () => { $('fb-prompt').classList.add('hidden'); feedback.open('invitation'); });
$('fb-prompt-no').addEventListener('click', () => { $('fb-prompt').classList.add('hidden'); });
// ---------------- Confidentialité ----------------
const legalScreen = createLegalScreen();
$('btn-legal').addEventListener('click', () => legalScreen.open('privacy'));
document.querySelectorAll('[data-legal]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); legalScreen.open(a.dataset.legal); }));
// Droit d'accès : télécharger tout ce que le serveur sait de moi
$('btn-online-data').addEventListener('click', async () => {
  const msg = $('online-data-msg');
  if (!onlineId()) { msg.textContent = t('Aucun profil en ligne sur cet appareil : rien n\'est stocké sur le serveur.'); return; }
  msg.textContent = t('Récupération…');
  try {
    const [profileData, friends, chrono, extra] = await Promise.all([onlineRpc('player_card', { p_id: onlineId() }), onlineRpc('my_friends'), onlineRpc('tt_summary').catch(() => []), onlineRpc('my_extra_data').catch(() => null)]);
    const records = chrono.filter((r) => r.my_time);
    const data = { exporté_le: new Date().toISOString(), identifiant_anonyme: onlineId(), profil: profileData,
      amis_et_demandes: friends.map((f) => ({ pseudo: `${f.name} #${String(f.tag).padStart(4, '0')}`, relation: f.relation })),
      records_du_chrono: records.map((r) => ({ circuit: r.track_id, temps: r.my_time, place: r.my_rank, note: t('avec la trajectoire du tour (fantôme), visible par les autres joueurs') })),
      avis_statistiques_et_bugs: extra };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'neon-drive-mes-donnees.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    msg.innerHTML = t('Fichier téléchargé. Le serveur connaît : ton pseudo <b>{name}</b>, ton emblème, ton titre, ta voiture, {tro} trophées, {races} courses, {wins} victoires, {fr} ami(s) ou demande(s) et {rec} record(s) du chrono (avec leur fantôme), {fb} avis, tes statistiques anonymes d\'utilisation et {bug} rapport(s) d\'erreur. Rien d\'autre.', { name: `${profileData.name} #${String(profileData.tag).padStart(4, '0')}`, tro: profileData.trophies, races: profileData.races, wins: profileData.wins, fr: friends.length, rec: records.length, fb: extra?.avis?.length ?? 0, bug: extra?.rapports_de_bug ?? 0 });
  } catch { msg.textContent = t('Pas de connexion : réessaie plus tard.'); }
});
$('btn-pause-settings').addEventListener('click', () => settingsScreen.open({ inRace: true }));
$('btn-train-back').addEventListener('click', () => showTrainingPicker(false));
$('btn-menu').addEventListener('click', () => (session?.isDaily ? backToDaily() : session?.careerStage ? backToCareer() : backToMenu()));
$('btn-daily').addEventListener('click', () => dailyScreen.open());
$('btn-ranking').addEventListener('click', () => rankingScreen.open(onlineCached()?.incoming ? 'friends' : 'world'));
// Supprimer son profil en ligne (Réglages)
$('btn-online-delete').addEventListener('click', async () => {
  const b = $('btn-online-delete');
  if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = t('CONFIRMER LA SUPPRESSION ?'); return; }
  b.disabled = true;
  try { await deleteOnlineProfile(); resetSent(); $('online-delete-msg').textContent = t('Profil en ligne supprimé. Il sera recréé (sans amis) au prochain lancement du jeu.'); }
  catch { $('online-delete-msg').textContent = t('Pas de connexion : réessaie plus tard.'); b.disabled = false; }
  b.dataset.confirm = ''; b.textContent = t('SUPPRIMER MON PROFIL EN LIGNE');
});
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
    [t('Allumage des néons…'), () => Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 2500))])],
    [t('Chargement des icônes…'), () => Promise.all(['trophy', 'credit', 'lock'].map((n) => iconImage(n).decode?.().catch(() => {})))],
    [t('Préparation des circuits…'), async () => {
      // Plans des circuits calculés à l'avance (chrono, profil : affichage immédiat)
      for (const t of TRACKS) { if (!t.custom) minimap(t); await new Promise((r) => setTimeout(r, 0)); }
    }],
    [t('Chargement de ta progression…'), () => {
      refreshMenu();
      if (saveStatus === 'restored') $('boot-status').textContent = t('Sauvegarde de secours restaurée.');
    }],
  ],
  onEnter: () => {
    // Lien d'ami (…?ami=CODE) : on ouvre l'onglet AMIS avec le code rempli
    const friendCode = (urlParams.get('ami') || '').toUpperCase();
    const hasLink = /^[0-9A-F]{6}$/.test(friendCode);
    if (hasLink) history.replaceState(null, '', location.pathname);
    if (hasLink && save.profile.name) setTimeout(() => rankingScreen.open('friends', friendCode), 2200);
    // Connexion au classement en arrière-plan (sans bloquer)
    if (!skipIntro) setTimeout(() => syncProfile(save, { now: true }).then((me) => me && uploadPending(save)), 1200);
    setTimeout(() => sendPendingFeedback(), 6000);
    if (!skipIntro) setTimeout(() => sfx.unlock(), 60);
    // Visite du menu interrompue (jeu fermé pendant la visite) : on la reprend
    if (save.tutorialDone && !save.tourDone && !skipIntro) maybeStartTour();
    // Premier lancement : choix du pseudo
    if (!save.profile.name && !skipIntro) {
      profile.openIdentity({ welcome: true, onDone: hasLink ? () => setTimeout(() => rankingScreen.open('friends', friendCode), 1500) : null });
    }
  },
});

// Accès pour les tests automatiques
window.__ND = { missing: () => missingKeys(), flushStats: () => flushStats(), track: (k) => track(k), audio: () => audio, music: () => music, session: () => session, loop: () => loop, perf, state: () => state, save: () => save };

// Installation comme application + jeu hors ligne (version publiée uniquement)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* pas grave : le jeu marche sans */ });
  });
}
