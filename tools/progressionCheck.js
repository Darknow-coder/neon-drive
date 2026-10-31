// Tests automatiques de la progression et de la sauvegarde.
// Usage : node tools/progressionCheck.js
import { TROPHY_REWARDS, LEAGUES, leagueFor, leagueProgress } from '../src/data/progression.js';
import { createSaveStore, defaultSave, exportSaveCode, importSaveCode } from '../src/progression/save.js';
import { applyRaceResult, pickTrack, tracksForLeague } from '../src/progression/progression.js';
import { mulberry32 } from '../src/core/math.js';
import { syncUnlocks, isOwned, liveryFor, setLivery, selectedCar, nextCarUnlock } from '../src/progression/garage.js';
import { CARS } from '../src/data/cars.js';
import { raceCredits, upgradeCar, upgradeCost, carLevel, openPack, buyPack, claimMilestone, claimableCount, unlockWithFragments, fragmentsOf } from '../src/progression/economy.js';
import { TROPHY_ROAD, PACKS, UPGRADE_COST } from '../src/data/economy.js';

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
  check(l.status === 'ok' && l.data.version === 3 && l.data.trophies === 120 && l.data.garage.owned[0] === 'nova', 'migration v1 → v3 sans perte');
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
  check(d.version === 3 && d.credits === 0 && d.road.claimed.length === 0 && d.garage.owned.includes('volt'), 'migration v2 → v3 sans perte');
  st.setItem('neondrive.save', JSON.stringify({ version: 3, credits: -50, cars: { levels: { nova: 99 }, fragments: { volt: 'x' } }, road: { claimed: [10, 10, 'a'] } }));
  const d2 = createSaveStore(st).load().data;
  check(d2.credits === 0 && d2.cars.levels.nova === 5 && !('volt' in d2.cars.fragments) && d2.road.claimed.join() === '10', 'économie abîmée réparée');
}

console.log(`${ok} vérifications réussies, ${ko} échec(s). Ligues : ${LEAGUES.map((l) => `${l.name} ≥ ${l.min}`).join(', ')}`);
process.exit(ko ? 1 : 0);
