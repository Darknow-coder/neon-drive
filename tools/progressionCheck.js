// Tests automatiques de la progression et de la sauvegarde.
// Usage : node tools/progressionCheck.js
import { TROPHY_REWARDS, LEAGUES, leagueFor, leagueProgress } from '../src/data/progression.js';
import { createSaveStore, defaultSave, exportSaveCode, importSaveCode } from '../src/progression/save.js';
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
  check(all.length === CARS.length - 2 && CARS.every((c) => isOwned(s, c.id)), 'toutes les voitures débloquées à 1000 trophées');
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
  check(l.status === 'ok' && l.data.version === 7 && l.data.trophies === 120 && l.data.garage.owned[0] === 'nova', 'migration v1 → v3 sans perte');
  const fresh = syncUnlocks(l.data);
  check(fresh.map((c) => c.id).join() === 'volt,halo,razor', 'voitures des paliers déjà atteints rendues après migration');
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
  check(d.version === 7 && d.credits === 0 && d.road.claimed.length === 0 && d.garage.owned.includes('volt'), 'migration v2 → v3 sans perte');
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
  check(d.version === 7 && d.credits === 900 && d.cars.levels.nova === 2 && d.shop.offers.length === 0 && d.cosmetics.finishes.length === 0, 'migration v3 → v4 sans perte');
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
  check(d.version === 7 && d.timeTrial && d.credits === 10, 'migration v5 → v6 sans perte');
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

console.log(`${ok} vérifications réussies, ${ko} échec(s). Ligues : ${LEAGUES.map((l) => `${l.name} ≥ ${l.min}`).join(', ')}`);
process.exit(ko ? 1 : 0);
