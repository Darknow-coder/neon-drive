// Tests automatiques de la progression et de la sauvegarde.
// Usage : node tools/progressionCheck.js
import { TROPHY_REWARDS, LEAGUES, leagueFor, leagueProgress } from '../src/data/progression.js';
import { createSaveStore, defaultSave, exportSaveCode, importSaveCode, SAVE_VERSION } from '../src/progression/save.js';
import { applyRaceResult, pickTrack, tracksForLeague } from '../src/progression/progression.js';
import { mulberry32 } from '../src/core/math.js';
import { syncUnlocks, isOwned, liveryFor, setLivery, selectedCar, nextCarUnlock } from '../src/progression/garage.js';
import { CARS } from '../src/data/cars.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { raceCredits, upgradeCar, upgradeCost, carLevel, openPack, buyPack, claimMilestone, claimableCount, unlockWithFragments, fragmentsOf } from '../src/progression/economy.js';
import { TROPHY_ROAD, PACKS, UPGRADE_COST } from '../src/data/economy.js';
import { dayKey, generateOffers, refreshShop, buyOffer, buyPackItem, buyStyle, equipStyle, claimGift, giftAvailable, shopBadge, ownsFinish, racesFor, msUntilMidnight } from '../src/progression/shop.js';
import { DAILY_GIFTS } from '../src/data/shop.js';
import { refreshMissions, applyMissionProgress, claimMission, claimDailyBonus, missionsBadge, allDailyDone, weekKey, generateDaily } from '../src/progression/missions.js';
import { DAILY_TEMPLATES } from '../src/data/missions.js';
import { applyTimeTrialLap, medalFor, medalCounts, bestTime } from '../src/progression/timeTrial.js';
import { medalTimes } from '../src/data/timeTrial.js';
import { startCup, cupGrid, applyCupRace, standings, finishCup, cupReward, PLAYER } from '../src/progression/cup.js';
import { CUP_POINTS } from '../src/data/cup.js';
import { cleanName, setIdentity, recordRace, addDriving, trackTotals, achievementStatus, achievementsBadge, claimAchievement, claimAllAchievements, unlockedTitles, currentTitle, favorite } from '../src/progression/profile.js';
import { ACHIEVEMENTS, ACHIEVEMENT_REWARDS, AVATARS, randomName, DEFAULT_TITLE } from '../src/data/profile.js';
import { eventField, applyEventResult, eventGoalsDone } from '../src/progression/event.js';
import { EVENT, EVENT_GOALS, EVENT_CREDITS } from '../src/data/event.js';
import { MOTIFS } from '../src/data/shop.js';
import { seasonLevel, addSeasonXp, raceXp, doubleRacesLeft, addTimeTrialLapXp, tierStatus, claimTier, claimBonus, bonusAvailable, seasonBadge, seasonTitles, TOTAL_XP, xpForLevel } from '../src/progression/season.js';
import { SEASON, TIER_REWARDS, XP as SXP, BONUS_XP, tierCost } from '../src/data/season.js';
import { ownsAvatar } from '../src/data/profile.js';
import { FINISHES } from '../src/data/shop.js';
import { CHAPTERS, ALL_STAGES, DUEL_STARS_NEEDED, STAR_CREDITS, stageById } from '../src/data/career.js';
import { evaluateStage, campaignStatus, applyStageResult, totalStars, timeTargets, campaignBadge, markSeen, campaignTitles, currentChapter, MAX_STARS } from '../src/progression/campaign.js';
import { getTrackData } from '../src/data/tracks/index.js';
import { dailyChallenge, applyDailyResult, refreshDaily, currentStreak, evaluateDaily, previousDay, dailyBadge, streakReward } from '../src/progression/daily.js';
import { STREAK_REWARDS, DAILY_STAR_CREDITS } from '../src/data/daily.js';
import { createRecorder, decodeGhost, ghostAt, ghostTimeAtDist } from '../src/race/ghost.js';

let ok = 0, ko = 0;
const check = (cond, label) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + label); } };

// Stockage simulé (comme localStorage)
function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

// --- Ligues ---
check(leagueFor(0).id === 'bronze' && leagueFor(99).id === 'bronze', 'Bronze 0-99');
check(leagueFor(100).id === 'argent' && leagueFor(249).id === 'argent', 'Argent 100-249');
check(leagueFor(250).id === 'or' && leagueFor(499).id === 'or', 'Or 250-499');
check(leagueFor(500).id === 'diamant' && leagueFor(799).id === 'diamant', 'Diamant 500-799');
check(leagueFor(800).id === 'elite' && leagueFor(99999).id === 'elite', 'Élite 800+');
check(Math.abs(leagueProgress(50) - 0.5) < 1e-9 && leagueProgress(900) === 1, 'progression vers la ligue suivante');

// --- Trophées ---
for (let p = 1; p <= 6; p++) {
  const s = defaultSave();
  const r = applyRaceResult(s, { position: p, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25 });
  check(r.gained === TROPHY_REWARDS[p - 1] && s.trophies === TROPHY_REWARDS[p - 1], `trophées ${p}e place`);
}
{
  const s = defaultSave(); s.trophies = 95;
  const r = applyRaceResult(s, { position: 1, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25 });
  check(r.promoted && r.newLeague.id === 'argent' && r.unlockedTracks.some((t) => t.id === 'vortex-city'), 'montée en Argent + circuit débloqué');
  const r2 = applyRaceResult(s, { position: 6, trackId: 'neon-boulevard', carId: 'nova', bestLap: 26 });
  check(r2.gained === 0 && s.trophies === 105 && !r2.promoted, 'aucune perte de trophées');
  check(!r2.newRecord && s.bestLaps['neon-boulevard'].nova === 25, 'record conservé si plus lent');
  applyRaceResult(s, { position: 2, trackId: 'neon-boulevard', carId: 'nova', bestLap: 24.5 });
  check(s.bestLaps['neon-boulevard'].nova === 24.5, 'nouveau record enregistré');
  check(s.stats.races === 3 && s.stats.wins === 1 && s.stats.podiums === 2, 'statistiques');
}

// --- Circuits par ligue + tirage sans répétition ---
check(tracksForLeague('bronze').every((t) => (t.league ?? 'bronze') === 'bronze'), 'Bronze : seulement les circuits Bronze');
check(tracksForLeague('elite').length >= tracksForLeague('bronze').length, 'les ligues supérieures gardent les anciens circuits');
{
  const rng = mulberry32(42);
  for (const trophies of [0, 150, 900]) {
    const s = defaultSave(); s.trophies = trophies;
    let repeats = 0; const seen = new Set();
    const allowed = new Set(tracksForLeague(leagueFor(trophies).id).map((t) => t.id));
    let outside = 0;
    for (let k = 0; k < 300; k++) {
      const t = pickTrack(s, rng);
      if (t.id === s.lastTrackId) repeats++;
      if (!allowed.has(t.id)) outside++;
      seen.add(t.id);
      s.lastTrackId = t.id;
    }
    check(repeats === 0, `pas deux fois de suite le même circuit (${trophies} trophées)`);
    check(outside === 0, `tirage limité à la ligue (${trophies} trophées)`);
    check(seen.size === allowed.size, `tous les circuits de la ligue sortent (${trophies} trophées)`);
  }
}

// --- Sauvegarde ---
{
  const st = memStorage(); const store = createSaveStore(st);
  check(store.load().status === 'new', 'première partie');
  const s = store.load().data; s.trophies = 42; store.save(s);
  check(store.load().data.trophies === 42, 'sauvegarde relue');
  s.trophies = 50; store.save(s);
  st.setItem('neondrive.save', '{abîmé'); // sauvegarde principale corrompue
  const l = store.load();
  check(l.status === 'restored' && l.data.trophies === 42, 'récupération de la copie de secours');
  st.setItem('neondrive.save.backup', 'null'); st.setItem('neondrive.save', 'pas du json');
  const l2 = store.load();
  check(l2.status === 'reset' && l2.data.trophies === 0, 'repart de zéro si tout est illisible (sans planter)');
  st.setItem('neondrive.save', JSON.stringify({ version: 1, trophies: -5, stats: 'x', bestLaps: { a: { b: 'lent' } }, history: 3 }));
  const l3 = store.load();
  check(l3.data.trophies === 0 && l3.data.stats.races === 0 && !l3.data.bestLaps.a && Array.isArray(l3.data.history), 'valeurs absurdes réparées');
}
{
  const store = createSaveStore(null);
  check(store.load().status === 'unavailable' && store.save(defaultSave()) === false, 'stockage indisponible : le jeu continue');
  const full = { getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); }, removeItem() {} };
  check(createSaveStore(full).save(defaultSave()) === false, 'stockage plein : pas de plantage');
}

// --- Garage ---
{
  const s = defaultSave();
  check(isOwned(s, 'nova') && s.garage.owned.length === 1, 'seule NOVA au départ');
  check(nextCarUnlock(s)?.id === 'volt', 'prochaine voiture : VOLT');
  s.trophies = 25;
  let r = applyRaceResult(s, { position: 1, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25 });
  check(r.unlockedCars.map((c) => c.id).join() === 'volt', 'VOLT débloquée au palier de 30');
  r = applyRaceResult(s, { position: 1, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25 });
  check(r.unlockedCars.length === 0, 'pas de double déblocage');
  s.trophies = 1000; const all = syncUnlocks(s);
  check(all.length === CARS.length - 3 && CARS.every((c) => isOwned(s, c.id) === (c.unlock?.type !== 'pass')), 'toutes les voitures (sauf celle du passe) débloquées à 1000 trophées');
  check(liveryFor(s, 'nova').body === CARS[0].colors.body, 'couleurs d\'origine par défaut');
  setLivery(s, 'nova', 'body', '#ff3b5c');
  check(liveryFor(s, 'nova').body === '#ff3b5c' && liveryFor(s, 'nova').glow === '#ff3b5c', 'couleur personnalisée');
  const s2 = defaultSave(); s2.selectedCar = 'titan';
  check(selectedCar(s2) === 'nova', 'impossible de rouler avec une voiture non débloquée');
}
{
  // Migration d'une sauvegarde de version 1 (avant le garage)
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 1, trophies: 120, stats: { races: 20, wins: 4, podiums: 9 }, selectedCar: 'nova' }));
  const l = createSaveStore(st).load();
  check(l.status === 'ok' && l.data.version === SAVE_VERSION && l.data.trophies === 120 && l.data.garage.owned[0] === 'nova', 'migration v1 → v3 sans perte');
  const fresh = syncUnlocks(l.data);
  check(fresh.map((c) => c.id).join() === 'volt,halo,razor,pixie', 'voitures des paliers déjà atteints rendues après migration');
  st.setItem('neondrive.save', JSON.stringify({ version: 2, trophies: 5, garage: { owned: 'x', liveries: { nova: { body: 'rouge', accent: '#00ff00' } } } }));
  const l2 = createSaveStore(st).load().data;
  check(l2.garage.owned.join() === 'nova' && !l2.garage.liveries.nova.body && l2.garage.liveries.nova.accent === '#00ff00', 'garage abîmé réparé');
}

// --- Export / import de sauvegarde ---
{
  const s = defaultSave(); s.trophies = 321; s.garage.owned.push('volt'); s.settings.controls.autoGas = true; s.tutorialDone = true;
  const code = exportSaveCode(s);
  const back = importSaveCode(code);
  check(back.trophies === 321 && back.garage.owned.includes('volt') && back.settings.controls.autoGas && back.tutorialDone, 'export puis import identiques');
  check(importSaveCode('  ' + code.slice(0, 20) + '\n' + code.slice(20) + ' ').trophies === 321, 'espaces et retours à la ligne tolérés');
  const bad = (c) => { try { importSaveCode(c); return false; } catch { return true; } };
  check(bad('bonjour'), 'code invalide refusé');
  check(bad(code.slice(0, -3) + 'zzz'), 'code modifié refusé (somme de contrôle)');
  check(bad(code.replace('ND1.', 'ND1.A')), 'code tronqué / altéré refusé');
}
{
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 2, trophies: 40, stats: { races: 6 } }));
  check(createSaveStore(st).load().data.tutorialDone === true, 'joueur existant : pas de tutoriel imposé');
  check(defaultSave().tutorialDone === false, 'nouveau joueur : tutoriel proposé');
}

// --- Rivaux ---
{
  const s = defaultSave();
  const r = applyRaceResult(s, { position: 3, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25, rivalId: 'spark', rivalBeaten: true });
  check(r.gained === TROPHY_REWARDS[2] + 3 && r.rivalBonus === 3 && r.firstRivalWin, 'rival battu : +3 trophées bonus');
  const r2 = applyRaceResult(s, { position: 2, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25, rivalId: 'spark', rivalBeaten: true });
  check(!r2.firstRivalWin && s.rivalsBeaten.spark === 2, 'victoires contre le rival comptées');
  const r3 = applyRaceResult(s, { position: 5, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25, rivalId: 'spark', rivalBeaten: false });
  check(r3.gained === TROPHY_REWARDS[4] && r3.rivalBonus === 0, 'rival devant : pas de bonus');
  const r4 = applyRaceResult(s, { position: 1, trackId: 'neon-boulevard', carId: 'nova', bestLap: 25 });
  check(r4.gained === 10, 'entraînement / sans rival : pas de bonus');
}

// --- Économie ---
{
  const c = raceCredits({ position: 2, driftTime: 12.6, overtakes: 3, clean: true, rivalBeaten: true });
  check(c.total === 45 + 12 + 15 + 15 + 20 && c.lines.length === 5, 'crédits de course détaillés');
  check(raceCredits({ position: 1, driftTime: 99, overtakes: 99 }).total === 60 + 20 + 25, 'bonus plafonnés');
  const s = defaultSave();
  check(s.credits === 0 && carLevel(s, 'nova') === 1, 'départ : 0 crédit, niveau 1');
  check(!upgradeCar(s, 'nova').ok, 'amélioration refusée sans crédits');
  s.credits = 10000; s.cars.fragments.nova = 200;
  for (let k = 0; k < 4; k++) upgradeCar(s, 'nova');
  check(carLevel(s, 'nova') === 5 && upgradeCost(s, 'nova') === null, 'amélioration jusqu\'au niveau 5');
  const spent = Object.values(UPGRADE_COST).reduce((a, b) => a + b.credits, 0);
  check(s.credits === 10000 - spent, 'coût des améliorations débité');
  check(!upgradeCar(s, 'titan').ok, 'impossible d\'améliorer une voiture non débloquée');
  // Packs
  const s2 = defaultSave(); const rng = mulberry32(3);
  let totalFrag = 0;
  for (let k = 0; k < 200; k++) { const g = openPack(s2, 'medium', rng); totalFrag += g.reduce((a, x) => a + x.amount, 0); }
  check(totalFrag === 200 * PACKS.medium.fragments, 'un pack donne exactement son nombre de fragments');
  const lockedShare = CARS.filter((c) => c.id !== 'nova').reduce((a, c) => a + fragmentsOf(s2, c.id), 0) / totalFrag;
  check(lockedShare > 0.75, `fragments surtout pour les voitures verrouillées (${Math.round(lockedShare * 100)} %)`);
  check(!buyPack(defaultSave(), 'large').ok, 'achat de pack refusé sans crédits');
  // Déblocage anticipé par fragments
  const s3 = defaultSave(); s3.cars.fragments.comet = 80;
  check(unlockWithFragments(s3, 'comet').ok && s3.garage.owned.includes('comet') && fragmentsOf(s3, 'comet') === 0, 'COMET débloquée avec 80 fragments');
  // Route des trophées
  const s4 = defaultSave(); s4.trophies = 105;
  const n = claimableCount(s4);
  check(n === TROPHY_ROAD.filter((m) => m.at <= 105).length, 'paliers franchis récupérables (rétroactif)');
  const g1 = claimMilestone(s4, 10, rng);
  check(g1.credits === 100 && s4.credits === 100, 'palier 10 : 100 crédits');
  check(claimMilestone(s4, 10, rng) === null, 'pas de double récupération');
  check(claimMilestone(s4, 125, rng) === null, 'palier non atteint refusé');
  const g2 = claimMilestone(s4, 100, rng);
  check(g2.car?.id === 'razor' && g2.packs.length === 1, 'palier 100 : RAZOR + pack');
}
{
  // Migration v2 → v3
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 2, trophies: 150, garage: { owned: ['nova', 'volt'] }, tutorialDone: true }));
  const d = createSaveStore(st).load().data;
  check(d.version === SAVE_VERSION && d.credits === 0 && d.road.claimed.length === 0 && d.garage.owned.includes('volt'), 'migration v2 → v3 sans perte');
  st.setItem('neondrive.save', JSON.stringify({ version: 3, credits: -50, cars: { levels: { nova: 99 }, fragments: { volt: 'x' } }, road: { claimed: [10, 10, 'a'] } }));
  const d2 = createSaveStore(st).load().data;
  check(d2.credits === 0 && d2.cars.levels.nova === 5 && !('volt' in d2.cars.fragments) && d2.road.claimed.join() === '10', 'économie abîmée réparée');
}

// --- Boutique ---
{
  const s = defaultSave(); s.trophies = 160; s.createdAt = 12345; syncUnlocks(s);
  const d1 = '2026-10-31', d2 = '2026-11-01';
  check(refreshShop(s, d1) && s.shop.offers.length === 6, 'offres du jour générées (6)');
  const snap = JSON.stringify(s.shop.offers);
  check(!refreshShop(s, d1) && JSON.stringify(s.shop.offers) === snap, 'offres stables dans la journée');
  check(JSON.stringify(generateOffers(s, d1)) === snap, 'offres reproductibles (même jour, même joueur)');
  const f = s.shop.offers.find((o) => o.featured);
  check(f && f.price < f.oldPrice && f.kind === 'fragments', 'offre spéciale en promotion');
  const ids = s.shop.offers.filter((o) => o.kind === 'fragments').map((o) => o.carId);
  check(new Set(ids).size === ids.length, 'pas deux fois la même voiture dans les offres');
  check(refreshShop(s, d2) && JSON.stringify(s.shop.offers) !== snap, 'nouvelles offres le lendemain');
  // Achats
  s.credits = 0;
  const r0 = buyOffer(s, 'frag0');
  check(!r0.ok && r0.reason === 'credits' && r0.missing === s.shop.offers.find((o) => o.id === 'frag0').price, 'achat refusé : il manque X crédits');
  s.credits = 5000;
  const o = s.shop.offers.find((x) => x.id === 'frag1'); const before = fragmentsOf(s, o.carId);
  check(buyOffer(s, 'frag1').ok && fragmentsOf(s, o.carId) === before + o.amount && s.credits === 5000 - o.price, 'achat de fragments');
  check(buyOffer(s, 'frag1').reason === 'bought', 'une offre ne s\'achète qu\'une fois');
  const rp = buyOffer(s, 'pack');
  check(rp.ok && rp.gains.reduce((a, g) => a + g.amount, 0) === PACKS[rp.packId].fragments, 'pack du jour acheté et ouvert');
  const st = s.shop.offers.find((x) => x.id === 'style');
  if (st) check(buyOffer(s, 'style').ok && (st.kind === 'finish' ? ownsFinish(s, st.itemId) : s.cosmetics.motifs.includes(st.itemId)), 'cosmétique du jour acheté');
  // Onglets PACKS / STYLE
  const c0 = s.credits;
  check(buyPackItem(s, 'small').ok && s.credits === c0 - PACKS.small.price, 'pack acheté au prix normal');
  // (on prend une finition pas encore possédée : l'offre du jour a pu en donner une)
  const fin = ['chrome', 'carbon', 'matte'].find((id) => !ownsFinish(s, id));
  check(buyStyle(s, 'finish', fin).ok && ownsFinish(s, fin), 'finition achetée');
  check(buyStyle(s, 'finish', fin).reason === 'owned', 'pas de double achat de cosmétique');
  check(equipStyle(s, 'nova', 'finish', fin) && liveryFor(s, 'nova').finish === fin, 'finition équipée sur une voiture');
  const notOwned = ['gold', 'holo', 'carbon', 'metal'].find((id) => !ownsFinish(s, id));
  check(!equipStyle(s, 'nova', 'finish', notOwned), 'impossible d\'équiper une finition non possédée');
  check(racesFor(130) === 2 && racesFor(1) === 1, 'estimation du nombre de courses');
  check(msUntilMidnight(new Date(2026, 9, 31, 23, 0, 0)) === 3600000, 'compte à rebours jusqu\'à minuit');
}
{
  // Cadeau quotidien
  const s = defaultSave();
  check(giftAvailable(s, 'D1') && shopBadge(s, '2026-01-01') === 2, 'cadeau disponible + offres nouvelles');
  const g1 = claimGift(s, '2026-01-01');
  check(g1.credits === DAILY_GIFTS[0].credits && s.credits === g1.credits, 'cadeau jour 1');
  check(claimGift(s, '2026-01-01') === null, 'un seul cadeau par jour');
  for (let k = 2; k <= 7; k++) claimGift(s, `2026-01-0${k}`);
  check(s.shop.giftStreak === 7, 'cycle de 7 jours');
  const g8 = claimGift(s, '2026-01-15'); // jours ratés : on reprend là où on en était
  check(g8.index === 0, 'jours ratés : pas de perte, le cycle reprend');
}
{
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 3, trophies: 200, credits: 900, cars: { levels: { nova: 2 } }, road: { claimed: [10] } }));
  const d = createSaveStore(st).load().data;
  check(d.version === SAVE_VERSION && d.credits === 900 && d.cars.levels.nova === 2 && d.shop.offers.length === 0 && d.cosmetics.finishes.length === 0, 'migration v3 → v4 sans perte');
  st.setItem('neondrive.save', JSON.stringify({ version: 4, shop: { day: 'hier', offers: [{ id: 'x', kind: 'triche', price: -5 }], giftStreak: -2 }, cosmetics: { finishes: ['gold', 'gold', 3] }, garage: { liveries: { nova: { finish: '<script>', motif: 'bolt' } } } }));
  const d2 = createSaveStore(st).load().data;
  check(d2.shop.day === null && d2.shop.offers.length === 0 && d2.shop.giftStreak === 0 && d2.cosmetics.finishes.join() === 'gold' && !d2.garage.liveries.nova.finish && d2.garage.liveries.nova.motif === 'bolt', 'boutique abîmée réparée');
}

// --- Missions ---
{
  const s = defaultSave(); s.trophies = 150; s.createdAt = 777; syncUnlocks(s);
  const day1 = new Date(2026, 10, 4, 10); // mercredi
  check(refreshMissions(s, day1) && s.missions.daily.length === 3 && s.missions.weekly, '3 missions du jour + 1 de la semaine');
  check(s.missions.daily.every((m) => !/drift/i.test(m.text)) && DAILY_TEMPLATES.every((t) => !/drift/i.test(t.text)), 'aucune mission de drift');
  check(new Set(s.missions.daily.map((m) => m.type)).size === 3, 'trois missions différentes');
  check(!refreshMissions(s, new Date(2026, 10, 4, 22)), 'missions stables dans la journée');
  check(weekKey(new Date(2026, 10, 4)) === weekKey(new Date(2026, 10, 8)) && weekKey(new Date(2026, 10, 9)) !== weekKey(new Date(2026, 10, 8)), 'la semaine commence le lundi');
  // Course parfaite : fait progresser tous les types
  const race = (o = {}) => ({ position: 1, overtakes: 6, clean: true, rivalBeaten: true, pads: 5, trackId: s.missions.daily.find((m) => m.trackId)?.trackId ?? 'x', carId: s.missions.daily.find((m) => m.carId)?.carId ?? 'nova', credits: 120, ...o });
  let guard = 0;
  while (!allDailyDone(s) && guard++ < 20) applyMissionProgress(s, race());
  check(allDailyDone(s), 'missions du jour terminées');
  check(missionsBadge(s) === 4, 'pastille : 3 missions + bonus');
  const c0 = s.credits;
  const g = claimMission(s, 'd0');
  check(g && s.missions.daily[0].claimed && (s.credits > c0 || g.gains.length), 'récompense de mission récupérée');
  check(claimMission(s, 'd0') === null, 'pas de double récompense');
  claimMission(s, 'd1'); claimMission(s, 'd2');
  check(claimDailyBonus(s) && claimDailyBonus(s) === null, 'bonus des 3 missions (une seule fois)');
  // Mission en cours : pas de récompense
  const s2 = defaultSave(); refreshMissions(s2, day1);
  check(claimMission(s2, 'd0') === null && missionsBadge(s2) === 0, 'mission non terminée : rien à récupérer');
  // Une mauvaise course ne fait progresser que ce qu'elle mérite
  const w0 = s2.missions.weekly.progress;
  applyMissionProgress(s2, { position: 6, overtakes: 0, clean: false, rivalBeaten: false, pads: 0, trackId: 'x', carId: 'x', credits: 10 });
  const wType = s2.missions.weekly.type;
  check(s2.missions.weekly.progress === w0 + (wType === 'races' ? 1 : 0), 'progression juste (6e place)');
  // Nouveau jour : nouvelles missions, la semaine continue
  const wk = s.missions.weekly.progress;
  check(refreshMissions(s, new Date(2026, 10, 5, 9)) && !s.missions.bonusClaimed && s.missions.weekly.progress === wk, 'nouveau jour : nouvelles missions, la mission de la semaine continue');
  // Voiture : jamais proposée avec une seule voiture
  let carMission = false;
  for (let k = 0; k < 60; k++) { const d = defaultSave(); d.createdAt = k; if (generateDaily(d, '2026-01-01').some((m) => m.type === 'car')) carMission = true; }
  check(!carMission, 'pas de mission « voiture » avec une seule voiture');
}

// --- Contre-la-montre ---
{
  const mt = medalTimes('neon-boulevard');
  check(mt.length === 4 && mt[0].time > mt[1].time && mt[1].time > mt[2].time && mt[2].time > mt[3].time, 'temps des médailles décroissants');
  check(TRACKS.every((t) => medalTimes(t.id)), 'tous les circuits ont des médailles');
  check(medalFor('neon-boulevard', mt[0].time + 0.01) === null && medalFor('neon-boulevard', mt[1].time)?.id === 'silver', 'médaille selon le temps');
  const s = defaultSave();
  const r1 = applyTimeTrialLap(s, 'neon-boulevard', mt[1].time - 0.1);
  check(r1.record && r1.newMedals.map((m) => m.id).join() === 'bronze,silver' && s.credits === 90, 'bronze + argent d\'un coup (90 crédits)');
  const r2 = applyTimeTrialLap(s, 'neon-boulevard', mt[1].time + 1);
  check(!r2.record && r2.newMedals.length === 0 && bestTime(s, 'neon-boulevard') === mt[1].time - 0.1, 'tour plus lent : rien ne change');
  const r3 = applyTimeTrialLap(s, 'neon-boulevard', mt[3].time - 0.2);
  check(r3.record && r3.newMedals.map((m) => m.id).join() === 'gold,neon' && r3.rewards.packs.length === 2, 'or + NEON avec leurs packs');
  check(applyTimeTrialLap(s, 'neon-boulevard', mt[3].time - 0.5).newMedals.length === 0, 'chaque médaille récompensée une seule fois');
  check(medalCounts(s).neon === 1 && medalCounts(s).bronze === 1, 'décompte des médailles');
}
{
  // Fantôme : enregistrement → décodage fidèle
  const rec = createRecorder(); rec.start();
  for (let k = 0; k < 360; k++) rec.step({ x: 100 + k * 5, y: 200 - k * 2, angle: (k / 360) * 6 - 3 }, k * 5);
  const G = decodeGhost(rec.finish(3));
  const p = ghostAt(G, 1.5);
  check(G.n === 120 && Math.abs(p.x - (100 + 180 * 5)) < 1 && Math.abs(p.y - (200 - 180 * 2)) < 1, 'fantôme : position fidèle');
  check(Math.abs(ghostTimeAtDist(G, 900) - 1.5) < 0.03 && ghostAt(G, 99) === null, 'fantôme : temps à une distance donnée');
}
{
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 5, trophies: 50, credits: 10 }));
  const d = createSaveStore(st).load().data;
  check(d.version === SAVE_VERSION && d.timeTrial && d.credits === 10, 'migration v5 → v6 sans perte');
}

// --- Coupe ---
{
  const s = defaultSave(); s.trophies = 160; syncUnlocks(s);
  const rng = mulberry32(9);
  const cup = startCup(s, rng);
  check(cup.tracks.length === 3 && new Set(cup.tracks).size === 3, '3 circuits différents');
  check(cup.tracks.every((id) => tracksForLeague('argent').some((t) => t.id === id)), 'circuits de la ligue du joueur');
  check(Object.keys(cup.points).length === 6 && 'VANTA' in cup.points && PLAYER in cup.points, '6 participants dont le rival');
  const g1 = cupGrid(cup, rng);
  check(g1.length === 6 && g1.indexOf(PLAYER) >= 3, 'course 1 : joueur dans les 3 dernières places');
  const names = Object.keys(cup.points);
  // Course 1 : le joueur gagne
  const o1 = [PLAYER, ...names.filter((n) => n !== PLAYER)];
  const r1 = applyCupRace(cup, o1);
  check(r1.gained[PLAYER] === 10 && r1.standings[0].name === PLAYER && !r1.finished, 'points de la course 1');
  const g2 = cupGrid(cup, rng);
  check(g2[g2.length - 1] === PLAYER, 'course 2 : le leader part dernier');
  // Course 2 : le joueur 6e, l'ancien 2e gagne
  const o2 = [...names.filter((n) => n !== PLAYER), PLAYER];
  const r2 = applyCupRace(cup, o2);
  check(cup.points[PLAYER] === 11 && cup.points[o2[0]] === 17, 'cumul des points');
  check(r2.standings.find((x) => x.name === PLAYER).move < 0, 'flèche de recul au classement');
  // Égalité : départagée par la dernière course
  const t = { points: { A: 10, B: 10 }, last: { A: 3, B: 1 } };
  check(standings(t)[0].name === 'B', 'égalité départagée par la dernière course');
  const o3 = [PLAYER, ...names.filter((n) => n !== PLAYER)];
  const r3 = applyCupRace(cup, o3);
  check(r3.finished, 'coupe terminée après 3 courses');
  const t0 = s.trophies, c0 = s.credits;
  const fin = finishCup(s, rng);
  const exp = cupReward('argent', fin.rank);
  check(s.trophies === t0 + exp.trophies && s.credits === c0 + exp.credits && s.cup === null, 'récompenses de fin de coupe');
  check(s.cupStats.played === 1 && (fin.rank === 1 ? s.cupStats.won.argent === 1 : true), 'palmarès mis à jour');
  check(cupReward('elite', 1).credits === 600 && cupReward('bronze', 6).trophies === 0, 'multiplicateur de ligue');
  check(CUP_POINTS.reduce((a, b) => a + b) === 28, 'barème de points');
}
{
  const st = memStorage();
  const s = defaultSave(); s.trophies = 30; startCup(s, mulberry32(1)); applyCupRace(s.cup, Object.keys(s.cup.points));
  st.setItem('neondrive.save', JSON.stringify(s));
  const d = createSaveStore(st).load().data;
  check(d.cup && d.cup.race === 1 && d.cup.tracks.length === 3, 'coupe en cours sauvegardée et reprise');
  st.setItem('neondrive.save', JSON.stringify({ version: 7, cup: { tracks: ['a'], race: 9, points: 'x' } }));
  check(createSaveStore(st).load().data.cup === null, 'coupe abîmée ignorée');
}

// ---------------------------------------------------------------- Profil et succès
{
  check(cleanName('  zorro   speed ').name === 'ZORRO SPEED', 'pseudo nettoyé (espaces, majuscules)');
  check(!!cleanName('ab').error && !!cleanName('X'.repeat(15)).error && !!cleanName('<b>hey</b>').error && !!cleanName('toi').error, 'pseudos refusés');
  check(cleanName('Élodie_93').name === 'ÉLODIE_93', 'accents et chiffres acceptés');
  for (let i = 0; i < 50; i++) if (cleanName(randomName(mulberry32(i))).error) { check(false, `pseudo au hasard valide (${randomName(mulberry32(i))})`); break; }
  const s = defaultSave();
  check(s.profile.name === null && currentTitle(s) === DEFAULT_TITLE, 'profil vierge');
  check(setIdentity(s, { name: 'ab' }).error && s.profile.name === null, 'pseudo invalide non enregistré');
  setIdentity(s, { name: 'Neo', avatar: 'crown', color: '#ff2bd6', title: 'Magnat' });
  check(s.profile.name === 'NEO' && s.profile.avatar === 'crown' && s.profile.color === '#ff2bd6', 'identité enregistrée');
  check(s.profile.title === null, 'titre non débloqué refusé');
  setIdentity(s, { avatar: 'nope', color: '#123456' });
  check(s.profile.avatar === 'crown' && s.profile.color === '#ff2bd6', 'emblème/couleur inconnus ignorés');

  // Carrière
  recordRace(s, { position: 1, carId: 'nova', trackId: 'citadel', mode: 'elim' });
  recordRace(s, { position: 3, carId: 'nova', trackId: 'rainline', mode: 'cup' });
  recordRace(s, { position: 5, carId: 'volt', trackId: 'rainline' });
  const c = s.career;
  check(c.races === 3 && c.wins === 1 && c.podiums === 2 && c.elimWins === 1 && c.elimPlayed === 1, 'carrière : courses, victoires, podiums, élimination');
  check(favorite(c.carRaces).id === 'nova' && favorite(c.trackRaces).id === 'rainline' && favorite({}) === null, 'voiture et circuit préférés');
  addDriving(s, 2, 500); addDriving(s, 1, -10);
  check(c.playTime === 3 && c.distance === 1000, 'temps et distance de conduite');
  let last = s.credits; s.credits += 150; last = trackTotals(s, last); s.credits -= 100; last = trackTotals(s, last); s.credits += 20; s.trophies = 42; trackTotals(s, last);
  check(c.creditsEarned === 170 && c.maxTrophies === 42, 'crédits gagnés (achats non comptés) et record de trophées');
  s.trophies = 10; trackTotals(s, s.credits);
  check(c.maxTrophies === 42, 'record de trophées conservé');

  // Succès
  check(ACHIEVEMENTS.length === 15 && ACHIEVEMENTS.every((a) => a.tiers.length === 3 && a.tiers[0] < a.tiers[1] && a.tiers[1] < a.tiers[2] && a.title), 'succès : 3 paliers croissants et un titre');
  check(new Set(ACHIEVEMENTS.map((a) => a.id)).size === ACHIEVEMENTS.length && AVATARS.length >= 8, 'identifiants uniques');
  const fresh = defaultSave();
  check(achievementsBadge(fresh) === 0 && achievementStatus(fresh).every((x) => x.value >= 0 && !x.claimable), 'aucun succès au départ');
  fresh.career.races = 55;
  let st = achievementStatus(fresh).find((x) => x.def.id === 'races');
  check(st.reached === 2 && st.claimable && st.target === 10, 'deux paliers atteints, le premier à récupérer');
  const cr0 = fresh.credits;
  const g1 = claimAchievement(fresh, 'races');
  check(g1.credits === ACHIEVEMENT_REWARDS[0] && fresh.credits === cr0 + ACHIEVEMENT_REWARDS[0] && !g1.title, 'palier I récupéré');
  claimAchievement(fresh, 'races');
  check(claimAchievement(fresh, 'races') === null, 'palier III pas encore atteint');
  st = achievementStatus(fresh).find((x) => x.def.id === 'races');
  check(st.claimed === 2 && st.target === 200 && !st.claimable && !st.complete, 'prochain objectif : palier III');
  fresh.career.races = 200;
  const g3 = claimAchievement(fresh, 'races');
  check(g3.title === 'Increvable' && unlockedTitles(fresh).includes('Increvable'), 'palier III : titre débloqué');
  check(achievementStatus(fresh).find((x) => x.def.id === 'races').complete, 'succès terminé');
  check(setIdentity(fresh, { title: 'Increvable' }).ok && currentTitle(fresh) === 'Increvable', 'titre choisi');
  fresh.career.wins = 30; fresh.garage.owned = ['nova', 'volt', 'halo'];
  const all = claimAllAchievements(fresh);
  check(all.count === 3 && all.credits === ACHIEVEMENT_REWARDS[0] * 2 + ACHIEVEMENT_REWARDS[1] && achievementsBadge(fresh) === 0, 'tout récupérer');
  check(claimAchievement(fresh, 'inconnu') === null, 'succès inconnu');
  // Circuits : courses + records + chrono
  const t = defaultSave(); t.bestLaps = { a: { nova: 1 } }; t.timeTrial.best = { b: 3 }; t.career.trackRaces = { a: 1, c: 2 };
  check(achievementStatus(t).find((x) => x.def.id === 'tracks').value === 3, 'circuits différents');
}
{
  // Ancienne sauvegarde (v7) : carrière reprise des statistiques existantes
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 7, trophies: 120, credits: 300, stats: { races: 20, wins: 4, podiums: 9 },
    history: [{ trackId: 'citadel', carId: 'volt', position: 1, gained: 10 }, { trackId: 'citadel', carId: 'nova', position: 2, gained: 7 }] }));
  const d = createSaveStore(st).load().data;
  check(d.version === SAVE_VERSION && d.career.races === 20 && d.career.wins === 4 && d.career.podiums === 9, 'migration v7 → v8 : carrière');
  check(d.career.maxTrophies === 120 && d.career.creditsEarned === 300 && d.career.trackRaces.citadel === 2 && d.career.carRaces.volt === 1, 'migration : record, crédits, préférés');
  check(d.profile.name === null && d.profile.avatar === 'bolt', 'migration : profil à créer');
  // Données abîmées
  st.setItem('neondrive.save', JSON.stringify({ version: 8, profile: { name: '<script>', avatar: 5, color: 'red', title: 'x'.repeat(99) }, career: { races: -4, distance: 'loin', carRaces: { nova: -1, volt: 2 } }, achievements: { claimed: { races: 9, wins: -1 } } }));
  const e = createSaveStore(st).load().data;
  check(e.profile.name === null && e.profile.avatar === 'bolt' && e.profile.color === '#00f0ff' && e.profile.title === null, 'profil abîmé réparé');
  check(e.career.races === 0 && e.career.distance === 0 && !('nova' in e.career.carRaces) && e.career.carRaces.volt === 2, 'carrière abîmée réparée');
  check(e.achievements.claimed.races === 3 && !('wins' in e.achievements.claimed), 'succès abîmés réparés');
  // Le pseudo passe aussi par l'export / import
  const s = defaultSave(); setIdentity(s, { name: 'Code Test' }); s.career.races = 7;
  const back = importSaveCode(exportSaveCode(s));
  check(back.profile.name === 'CODE TEST' && back.career.races === 7, 'profil et carrière dans le code de sauvegarde');
}

// ---------------------------------------------------------------- Événement GIGA RUSH
{
  check(EVENT_CREDITS.length === EVENT.drivers && EVENT_CREDITS.every((c, k) => k === 0 || c <= EVENT_CREDITS[k - 1]), 'crédits : une valeur par place, décroissante');
  const me = { name: 'TOI', isPlayer: true };
  for (let i = 0; i < 30; i++) {
    const f = eventField(['bronze', 'or', 'elite'][i % 3], me, mulberry32(i));
    const slot = f.indexOf(me) + 1;
    if (f.length !== EVENT.drivers || slot < EVENT.startFrom || slot > EVENT.startTo || new Set(f.map((e) => e.name)).size !== f.length || f.filter((e) => e.isRival).length !== 1) {
      check(false, `plateau de la GIGA RUSH (essai ${i})`); break;
    }
  }
  check(true, 'plateau : 20 pilotes différents, rival présent, joueur en milieu de peloton');
  const s = defaultSave();
  const c0 = s.credits;
  let r = applyEventResult(s, 12, mulberry32(1));
  check(r.credits === EVENT_CREDITS[11] && r.goals.length === 0 && s.event.best === 12 && s.event.played === 1 && s.credits === c0 + r.credits, '12e : crédits seulement');
  r = applyEventResult(s, 4, mulberry32(2));
  check(r.goals.map((g) => g.goal.id).join() === 'top10,top5' && r.newBest && s.event.best === 4, '4e : top 10 et top 5 débloqués ensemble');
  check(r.goals[1].packId === 'medium' && r.goals[1].gains.length > 0, 'pack du top 5 ouvert');
  r = applyEventResult(s, 7, mulberry32(3));
  check(r.goals.length === 0 && !r.newBest && s.event.best === 4, 'objectifs jamais récompensés deux fois, record gardé');
  r = applyEventResult(s, 1, mulberry32(4));
  check(r.goals.map((g) => g.goal.id).join() === 'podium,win' && s.cosmetics.motifs.includes('giga') && eventGoalsDone(s) === EVENT_GOALS.length, 'victoire : motif exclusif');
  check(MOTIFS.find((m) => m.id === 'giga').exclusive && buyStyle(s, 'motif', 'giga').ok === false, 'motif exclusif impossible à acheter');
  const t = defaultSave(); t.credits = 99999;
  check(buyStyle(t, 'motif', 'giga').reason === 'exclusive' && !t.cosmetics.motifs.includes('giga'), 'motif exclusif refusé même avec des crédits');
  check(!generateOffers(t, '2026-11-01').some((o) => o.itemId === 'giga'), 'motif exclusif jamais en offre du jour');
  // Sauvegarde
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 8, event: { best: 99, claimed: ['top10', 3, 'top10'], played: -2 } }));
  const d = createSaveStore(st).load().data;
  check(d.version === SAVE_VERSION && d.event.best === null && d.event.claimed.join() === 'top10' && d.event.played === 0, 'événement abîmé réparé');
  check(!tracksForLeague('elite').some((t) => t.event), 'circuit d\'événement hors courses classées');
}

// ---------------------------------------------------------------- Passe de saison
{
  check(TIER_REWARDS.length === SEASON.tiers && TIER_REWARDS.every((t, k) => t.tier === k + 1 && Object.keys(t.reward).length), '100 niveaux, chacun avec une récompense');
  check(TOTAL_XP > 60000 && TOTAL_XP < 100000 && tierCost(100) > tierCost(1), `passe long et progressif (${TOTAL_XP} XP au total)`);
  check(seasonLevel(0).level === 0 && seasonLevel(xpForLevel(1)).level === 1 && seasonLevel(xpForLevel(1) - 1).level === 0, 'calcul du niveau');
  check(seasonLevel(TOTAL_XP).max && seasonLevel(TOTAL_XP + BONUS_XP * 2 + 5).bonusEarned === 2, 'niveau 100 puis coffres bonus');
  // Toutes les récompenses exclusives existent vraiment
  const ids = (list) => new Set(list.map((x) => x.id));
  const fin = ids(FINISHES), mot = ids(MOTIFS), av = ids(AVATARS);
  check(TIER_REWARDS.every(({ reward: r }) => (!r.finish || fin.has(r.finish)) && (!r.motif || mot.has(r.motif)) && (!r.avatar || av.has(r.avatar)) && (!r.car || CARS.some((c) => c.id === r.car)) && (!r.pack || PACKS[r.pack])), 'récompenses valides');
  check(TIER_REWARDS[99].reward.car === 'aurora' && CARS.find((c) => c.id === 'aurora').unlock.type === 'pass', 'AURORA au niveau 100');
  check(AVATARS.filter((a) => a.exclusive === 'season').every((a) => TIER_REWARDS[a.tier - 1].reward.avatar === a.id), 'niveaux des emblèmes exclusifs cohérents');
  // XP du jour
  const s = defaultSave();
  const day = '2026-11-02';
  let r = addSeasonXp(s, raceXp('ranked', 1), { race: true, day });
  check(r.gained === SXP.race[0] * 2 && r.doubled, 'première course du jour : XP ×2');
  addSeasonXp(s, 10, { race: true, day }); addSeasonXp(s, 10, { race: true, day });
  check(doubleRacesLeft(s, day) === 0, 'bonus ×2 limité à 3 courses');
  r = addSeasonXp(s, 50, { race: true, day });
  check(r.gained === 50 && !r.doubled, '4e course : XP normale');
  check(doubleRacesLeft(s, '2026-11-03') === 3, 'bonus de retour le lendemain');
  check(raceXp('event', 1, 20) === 120 && raceXp('event', 20, 20) === 40 && raceXp('elim', 6) === SXP.race[5], 'XP selon le mode et la place');
  // Chrono : plafond par jour
  const t = defaultSave();
  let tot = 0; for (let i = 0; i < 40; i++) tot += addTimeTrialLapXp(t, day).gained;
  check(tot === SXP.ttLapDailyCap, 'chrono : XP des tours plafonnée chaque jour');
  // Récompenses
  const c = defaultSave();
  check(claimTier(c, 1) === null && seasonBadge(c) === 0, 'niveau non atteint : rien à récupérer');
  c.pass.xp = xpForLevel(100);
  check(seasonBadge(c) === 100, '100 récompenses à récupérer');
  const cr0 = c.credits;
  for (let n = 1; n <= 100; n++) claimTier(c, n, mulberry32(n));
  check(seasonBadge(c) === 0 && claimTier(c, 5) === null, 'tout récupéré, pas deux fois');
  check(c.garage.owned.includes('aurora') && c.cosmetics.finishes.includes('aurora') && c.cosmetics.motifs.includes('wings') && c.profile.avatars.length === 4, 'voiture, finitions, motifs et emblèmes exclusifs obtenus');
  check(c.credits > cr0 + 10000, 'beaucoup de crédits au fil du passe');
  check(seasonTitles(c).length === 5 && unlockedTitles(c).includes('Légende de la Saison 1'), 'titres de saison');
  check(ownsAvatar(c, 'phoenix') && !ownsAvatar(defaultSave(), 'phoenix') && setIdentity(defaultSave(), { avatar: 'phoenix' }) && true, 'emblème exclusif réservé');
  const d = defaultSave(); setIdentity(d, { avatar: 'phoenix' });
  check(d.profile.avatar === 'bolt', 'emblème exclusif refusé sans le passe');
  c.pass.xp += BONUS_XP * 2;
  check(bonusAvailable(c) === 2 && claimBonus(c) && claimBonus(c) && !claimBonus(c), 'coffres bonus');
  // La voiture du passe n'apparaît ni dans les packs ni en boutique avant d'être gagnée
  const e = defaultSave();
  let auroraFrag = 0; for (let i = 0; i < 30; i++) { openPack(e, 'large', mulberry32(i)); }
  auroraFrag = e.cars.fragments.aurora ?? 0;
  check(auroraFrag === 0, 'pas de fragments AURORA dans les packs');
  check(!generateOffers(e, '2026-11-02').some((o) => o.carId === 'aurora'), 'pas d\'offre AURORA en boutique');
  check(buyStyle(Object.assign(defaultSave(), { credits: 1e6 }), 'finish', 'aurora').ok === false, 'finition exclusive pas à vendre');
  // Missions et succès donnent de l'XP
  const m = defaultSave(); refreshMissions(m);
  m.missions.daily[0].progress = m.missions.daily[0].target;
  const x0 = m.pass.xp; claimMission(m, m.missions.daily[0].id, mulberry32(1));
  check(m.pass.xp - x0 === SXP.missionDaily, 'mission du jour : XP');
  // Sauvegarde
  const st = memStorage();
  st.setItem('neondrive.save', JSON.stringify({ version: 9, trophies: 50 }));
  const l = createSaveStore(st).load().data;
  check(l.version === SAVE_VERSION && l.pass.xp === 0 && l.profile.avatars.length === 0, 'migration v9 → v10');
  st.setItem('neondrive.save', JSON.stringify({ version: 10, pass: { xp: -5, claimed: [3, 3, 999, 'x'], bonusClaimed: 'a', day: 'hier' }, profile: { avatars: ['phoenix', 3] } }));
  const k = createSaveStore(st).load().data;
  check(k.pass.xp === 0 && k.pass.claimed.join() === '3' && k.pass.bonusClaimed === 0 && k.pass.day === null && k.profile.avatars.join() === 'phoenix', 'passe abîmé réparé');
}

// ---------------------------------------------------------------- Carrière
{
  check(CHAPTERS.length === 5 && CHAPTERS.every((c) => c.stages.length === 4 && c.duel.type === 'duel'), '5 chapitres de 4 défis + 1 duel');
  check(new Set(ALL_STAGES.map((s) => s.id)).size === ALL_STAGES.length && MAX_STARS === 75, 'défis uniques, 75 étoiles');
  check(ALL_STAGES.every((s) => getTrackData(s.track).id === s.track && (s.type === 'elim' || s.laps >= 1)), 'circuits et tours valides');
  check(CHAPTERS.every((c) => c.intro.length && c.outro.length && c.reward.credits > 0), 'dialogues et récompenses présents');
  // Étoiles par type
  const st = (id) => stageById(id);
  check([1, 2, 3, 4].map((p) => evaluateStage(st('c1s1'), { position: p })).join() === '3,2,1,0', 'course : étoiles selon la place');
  check(evaluateStage(st('c2s1'), { position: 4, rivalBeaten: true }) === 1 && evaluateStage(st('c2s1'), { position: 2, rivalBeaten: true }) === 2
    && evaluateStage(st('c2s1'), { position: 1, rivalBeaten: true }) === 3 && evaluateStage(st('c2s1'), { position: 2, rivalBeaten: false }) === 0, 'poursuite : rival battu');
  check(evaluateStage(st('c1s3'), { position: 1, wallHits: 0 }) === 3 && evaluateStage(st('c1s3'), { position: 1, wallHits: 2 }) === 0
    && evaluateStage(st('c1s3'), { position: 3, wallHits: 0 }) === 2 && evaluateStage(st('c1s3'), { position: 5, wallHits: 0 }) === 1, 'course propre');
  check([5, 4, 2, 1].map((p) => evaluateStage(st('c1s4'), { position: p })).join() === '0,1,2,3', 'remontée : top 4 / top 2 / victoire');
  const tt = timeTargets(st('c1s2'));
  check(tt[0] > tt[1] && tt[1] > tt[2], 'chrono : 3 temps de plus en plus serrés');
  check(evaluateStage(st('c1s2'), { finished: true, time: tt[2] - 0.1 }) === 3 && evaluateStage(st('c1s2'), { finished: true, time: tt[1] }) === 2
    && evaluateStage(st('c1s2'), { finished: true, time: tt[0] + 1 }) === 0 && evaluateStage(st('c1s2'), { finished: false, time: 1 }) === 0, 'chrono : étoiles selon le temps');
  check(evaluateStage(st('c1d'), { position: 1, margin: 0.3 }) === 1 && evaluateStage(st('c1d'), { position: 1, margin: 3 }) === 3 && evaluateStage(st('c1d'), { position: 2, margin: 0 }) === 0, 'duel : victoire et avance');
  // Déblocages
  const s = defaultSave();
  let cs = campaignStatus(s);
  check(cs[0].unlocked && !cs[1].unlocked && !cs[0].duelUnlocked && campaignBadge(s) === 1, 'chapitre 1 ouvert, duel fermé');
  markSeen(s, 'ch1');
  check(campaignBadge(s) === 0, 'pastille effacée une fois le chapitre ouvert');
  const c0 = s.credits;
  let r = applyStageResult(s, 'c1s1', { position: 2 });
  check(r.stars === 2 && r.gained === 2 && s.credits === c0 + 2 * STAR_CREDITS && s.campaign.best.c1s1 === 2, 'étoiles et crédits du défi');
  r = applyStageResult(s, 'c1s1', { position: 3 });
  check(r.gained === 0 && s.campaign.stars.c1s1 === 2 && s.campaign.best.c1s1 === 2, 'un moins bon résultat ne retire rien');
  r = applyStageResult(s, 'c1s1', { position: 1 });
  check(r.gained === 1 && s.campaign.stars.c1s1 === 3, 'amélioration : seulement la nouvelle étoile payée');
  applyStageResult(s, 'c1s4', { position: 1 });
  check(campaignStatus(s)[0].duelUnlocked && totalStars(s) === 6, `duel débloqué à ${DUEL_STARS_NEEDED} étoiles`);
  r = applyStageResult(s, 'c1d', { position: 2, margin: 0 });
  check(!r.chapterDone && !s.campaign.done.includes('ch1'), 'duel perdu : chapitre pas terminé');
  r = applyStageResult(s, 'c1d', { position: 1, margin: 1.5 }, mulberry32(1));
  check(r.chapterDone && s.campaign.done.includes('ch1') && r.stars === 2, 'duel gagné : chapitre terminé');
  check(campaignTitles(s).includes('Tombeur de SPARK') && unlookFor(s), 'titre du chapitre');
  function unlookFor(x) { return unlockedTitles(x).includes('Tombeur de SPARK'); }
  check(!campaignStatus(s)[1].unlocked && campaignStatus(s)[1].lockReason.includes('ARGENT'), 'chapitre 2 : il faut la ligue Argent');
  s.trophies = 120;
  check(campaignStatus(s)[1].unlocked && currentChapter(s).id === 'ch2', 'chapitre 2 ouvert avec la ligue Argent');
  r = applyStageResult(s, 'c1d', { position: 1, margin: 3 });
  check(!r.chapterDone && r.stars === 3, 'chapitre pas récompensé deux fois');
  // Exclusifs des chapitres 3 à 5
  const all = defaultSave(); all.trophies = 900;
  for (const ch of CHAPTERS) for (const sg of [...ch.stages, ch.duel]) applyStageResult(all, sg.id, sg.type === 'time' ? { finished: true, time: 1 } : { position: 1, rivalBeaten: true, wallHits: 0, margin: 5 }, mulberry32(3));
  check(all.campaign.done.length === 5 && totalStars(all) === 75 && all.campaign.allStars, 'carrière complète, 75 étoiles');
  check(all.profile.avatars.includes('mask') && all.profile.avatars.includes('nemesis') && all.cosmetics.finishes.includes('prism') && all.cosmetics.motifs.includes('claws'), 'exclusifs de la carrière obtenus');
  check(campaignTitles(all).length === 6 && unlockedTitles(all).includes('Légende de la carrière'), 'titres de la carrière');
  check(buyStyle(Object.assign(defaultSave(), { credits: 1e6 }), 'finish', 'prism').ok === false, 'finition de carrière pas à vendre');
  // Sauvegarde
  const sto = memStorage();
  sto.setItem('neondrive.save', JSON.stringify({ version: 10, trophies: 5 }));
  check(createSaveStore(sto).load().data.campaign.done.length === 0, 'migration v10 → v11');
  sto.setItem('neondrive.save', JSON.stringify({ version: 11, campaign: { stars: { c1s1: 9, c1s2: 2, hack: 3 }, best: { c1s1: -1, c1s2: 30.5 }, done: ['ch1', 'x'], seen: ['ch1', 'ch1'] } }));
  const d = createSaveStore(sto).load().data.campaign;
  check(!('c1s1' in d.stars) && d.stars.c1s2 === 2 && !('hack' in d.stars) && d.best.c1s2 === 30.5 && !('c1s1' in d.best) && d.done.join() === 'ch1' && d.seen.length === 1, 'carrière abîmée réparée');
}

// ---------------------------------------------------------------- Défi du jour
{
  const a = dailyChallenge('2026-11-05'), b = dailyChallenge('2026-11-05'), c = dailyChallenge('2026-11-06');
  check(JSON.stringify(a) === JSON.stringify(b), 'même défi pour une même date (le même pour tout le monde)');
  check(JSON.stringify(a) !== JSON.stringify(c), 'défi différent le lendemain');
  check(previousDay('2026-03-01') === '2026-02-28' && previousDay('2026-01-01') === '2025-12-31', 'jour précédent');
  let ok2 = true;
  for (let k = 1; k <= 60; k++) {
    const ch = dailyChallenge(`2027-01-${String((k % 28) + 1).padStart(2, '0')}`);
    if (ch.format === 'time' && !ch.car) ok2 = false;
    if (ch.rule === 'oneCar' && (!ch.car || ch.format === 'time')) ok2 = false;
    if (ch.car === 'aurora') ok2 = false;
  }
  check(ok2, 'règles cohérentes (chrono : voiture imposée ; jamais la voiture du passe)');
  // Étoiles et série
  const race = { ...dailyChallenge('2026-11-05'), format: 'race', places: [3, 2, 1] };
  check([1, 2, 3, 4].map((p) => evaluateDaily(race, { position: p })).join() === '3,2,1,0', 'étoiles selon la place');
  const tt = { ...race, format: 'time' };
  check(evaluateDaily(tt, { finished: true, time: 40 }, [50, 45, 41]) === 3 && evaluateDaily(tt, { finished: true, time: 46 }, [50, 45, 41]) === 1 && evaluateDaily(tt, { finished: false, time: 1 }, [50, 45, 41]) === 0, 'étoiles du chrono');
  const s = defaultSave();
  check(dailyBadge(s, '2026-11-05') === 1, 'pastille : défi à faire');
  const c0 = s.credits;
  let r = applyDailyResult(s, { ...race, day: '2026-11-05' }, { position: 5 }, mulberry32(1));
  check(r.stars === 0 && s.daily.streak === 0 && !r.streakReward && s.credits === c0, 'défi raté : rien');
  r = applyDailyResult(s, { ...race, day: '2026-11-05' }, { position: 2 }, mulberry32(1));
  check(r.stars === 2 && r.gained === 2 && s.daily.streak === 1 && r.streakReward && dailyBadge(s, '2026-11-05') === 0, 'défi réussi : série 1 + récompense');
  const c1 = s.credits;
  r = applyDailyResult(s, { ...race, day: '2026-11-05' }, { position: 1 }, mulberry32(1));
  check(r.gained === 1 && !r.streakReward && s.credits === c1 + DAILY_STAR_CREDITS && s.daily.best === 1, 'amélioration : une étoile en plus, pas de 2e récompense de série');
  r = applyDailyResult(s, { ...race, day: '2026-11-06' }, { position: 3 }, mulberry32(2));
  check(s.daily.day === '2026-11-06' && r.stars === 1 && r.gained === 1 && s.daily.streak === 2, 'lendemain : défi neuf, série 2');
  check(currentStreak(s, '2026-11-07') === 2 && currentStreak(s, '2026-11-08') === 0, 'série perdue si un jour est manqué');
  r = applyDailyResult(s, { ...race, day: '2026-11-08' }, { position: 1 }, mulberry32(3));
  check(s.daily.streak === 1, 'série qui repart à 1');
  check(streakReward(7) === STREAK_REWARDS[6] && streakReward(8) === STREAK_REWARDS[0], 'cycle de 7 jours');
  // Sauvegarde
  const sto = memStorage();
  sto.setItem('neondrive.save', JSON.stringify({ version: 11 }));
  check(createSaveStore(sto).load().data.daily.streak === 0, 'migration v11 → v12');
  sto.setItem('neondrive.save', JSON.stringify({ version: 12, daily: { day: 'x', stars: 7, best: -2, targets: [1, 2], streak: 5, lastDone: '2026-11-01' } }));
  const d = createSaveStore(sto).load().data.daily;
  check(d.day === null && d.stars === 0 && d.best === null && d.targets === null && d.streak === 5 && d.lastDone === '2026-11-01', 'défi abîmé réparé');
}

console.log(`${ok} vérifications réussies, ${ko} échec(s). Ligues : ${LEAGUES.map((l) => `${l.name} ≥ ${l.min}`).join(', ')}`);
process.exit(ko ? 1 : 0);
