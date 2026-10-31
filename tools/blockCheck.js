// Vérifie qu'aucune IA ne reste bloquée derrière une voiture arrêtée
// (joueur immobile à chaque place de la grille, sur chaque circuit).
// Usage : node tools/blockCheck.js
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_DRIVERS } from '../src/data/aiProfiles.js';
import { createRaceWorld } from '../src/race/raceWorld.js';

let fails = 0;
for (const td of TRACKS) {
  const track = buildTrack(td);
  const res = [];
  for (let slot = 0; slot < 6; slot++) {
    const entries = AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile }));
    entries.splice(slot, 0, { def: getCar('nova'), name: 'TOI', isPlayer: true });
    const w = createRaceWorld({ track, entries, laps: 3, seed: slot, countdown: 0.2 });
    while (!w.playerPositionLocked() && w.time < 200) w.step(1 / 120); // le joueur ne bouge pas
    const stuck = w.cars.filter((c) => !c.isPlayer && !c.finished).map((c) => c.name);
    if (stuck.length) fails++;
    res.push(stuck.length ? `place ${slot + 1}: BLOQUÉS ${stuck.join(',')}` : `place ${slot + 1}: ok (${Math.round(w.time)} s)`);
  }
  console.log(td.name.padEnd(16), res.join(' | '));
}
process.exit(fails ? 1 : 0);
