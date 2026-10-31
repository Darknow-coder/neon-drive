// Tests automatiques de la progression et de la sauvegarde.
// Usage : node tools/progressionCheck.js
import { TROPHY_REWARDS, LEAGUES, leagueFor, leagueProgress } from '../src/data/progression.js';
import { createSaveStore, defaultSave } from '../src/progression/save.js';
import { applyRaceResult, pickTrack, tracksForLeague } from '../src/progression/progression.js';
import { mulberry32 } from '../src/core/math.js';
import { syncUnlocks, isOwned, liveryFor, setLivery, selectedCar, nextCarUnlock } from '../src/progression/garage.js';
import { CARS } from '../src/data/cars.js';

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
  check(l.status === 'ok' && l.data.version === 2 && l.data.trophies === 120 && l.data.garage.owned[0] === 'nova', 'migration v1 → v2 sans perte');
  const fresh = syncUnlocks(l.data);
  check(fresh.map((c) => c.id).join() === 'volt,halo,razor', 'voitures des paliers déjà atteints rendues après migration');
  st.setItem('neondrive.save', JSON.stringify({ version: 2, trophies: 5, garage: { owned: 'x', liveries: { nova: { body: 'rouge', accent: '#00ff00' } } } }));
  const l2 = createSaveStore(st).load().data;
  check(l2.garage.owned.join() === 'nova' && !l2.garage.liveries.nova.body && l2.garage.liveries.nova.accent === '#00ff00', 'garage abîmé réparé');
}

console.log(`${ok} vérifications réussies, ${ko} échec(s). Ligues : ${LEAGUES.map((l) => `${l.name} ≥ ${l.min}`).join(', ')}`);
process.exit(ko ? 1 : 0);
