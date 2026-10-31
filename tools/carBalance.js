// Compare les voitures entre elles avec le MÊME pilote IA (profil polyvalent, sans erreurs).
// Usage : node tools/carBalance.js
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { CARS } from '../src/data/cars.js';
import { AI_PROFILES } from '../src/data/aiProfiles.js';
import { createRaceWorld } from '../src/race/raceWorld.js';

AI_PROFILES.balanced.mistakeRate = 0.0001;
if (process.env.NODRIFT) AI_PROFILES.balanced.driftUse = 0;
if (process.env.NOBOOST) AI_PROFILES.balanced.boostStraight = 'never';
const rows = CARS.map((c) => ({ car: c, times: [] }));
for (const td of TRACKS) {
  const track = buildTrack(td);
  for (const r of rows) {
    const w = createRaceWorld({ track, entries: [{ def: r.car, name: r.car.name, profile: 'balanced' }], laps: 2, seed: 3, countdown: 0.1 });
    while (!w.finished && w.time < 200) w.step(1 / 120);
    r.times.push(w.cars[0].laps.bestLap);
  }
}
const best = TRACKS.map((_, k) => Math.min(...rows.map((r) => r.times[k])));
console.log('Voiture   ' + TRACKS.map((t) => t.name.padEnd(18)).join('') + 'Moyenne');
for (const r of rows) {
  const pct = r.times.map((t, k) => ((t / best[k] - 1) * 100));
  const avg = pct.reduce((a, b) => a + b, 0) / pct.length;
  console.log(r.car.name.padEnd(10) + r.times.map((t, k) => `${t.toFixed(2)}s (+${pct[k].toFixed(1)}%)`.padEnd(18)).join('') + `+${avg.toFixed(1)}%`);
}
