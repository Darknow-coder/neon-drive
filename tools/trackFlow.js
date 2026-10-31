// Mesure à quel point un circuit est exigeant (avec un pilote IA de bon niveau).
// Usage : node tools/trackFlow.js
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_PROFILES } from '../src/data/aiProfiles.js';
import { createRaceWorld } from '../src/race/raceWorld.js';

AI_PROFILES.balanced.mistakeRate = 0.0001;
console.log('Circuit           Tour    Vitesse moy.  Temps à fond  Temps au frein  Zones de freinage  Drift');
for (const td of TRACKS) {
  const track = buildTrack(td);
  const w = createRaceWorld({ track, entries: [{ def: getCar('nova'), name: 'X', profile: 'balanced' }], laps: 2, seed: 1, countdown: 0.1, league: 'diamant' });
  const c = w.cars[0];
  let n = 0, vs = 0, full = 0, brake = 0, zones = 0, wasBraking = false, drift = 0;
  while (!w.finished && w.time < 200) {
    w.step(1 / 120);
    if (c.laps.lap !== 2) continue;
    n++;
    vs += c.speed / c.params.maxSpeed;
    if (c.speed > c.params.maxSpeed * 0.97) full++;
    const br = c.braking;
    if (br) brake++;
    if (br && !wasBraking) zones++;
    wasBraking = br;
    if (c.drifting) drift++;
  }
  const pct = (x) => `${Math.round((x / n) * 100)} %`;
  console.log(`${td.name.padEnd(17)} ${c.laps.bestLap.toFixed(1)}s  ${pct(vs).padStart(10)}  ${pct(full).padStart(12)}  ${pct(brake).padStart(14)}  ${String(zones).padStart(17)}  ${pct(drift).padStart(5)}`);
}
