// Diagnostic : un seul pilote IA sur la piste (sans trafic).
// Usage : node tools/aiSolo.js [profil] [voiture] [driftUse]
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_PROFILES } from '../src/data/aiProfiles.js';
import { createRaceWorld } from '../src/race/raceWorld.js';

const prof = process.argv[2] ?? 'balanced';
const carId = process.argv[3] ?? 'nova';
if (process.argv[4] !== undefined) AI_PROFILES[prof].driftUse = Number(process.argv[4]);
AI_PROFILES[prof].mistakeRate = 0.0001; // sans erreurs volontaires
for (const td of TRACKS) {
  const track = buildTrack(td);
  const w = createRaceWorld({ track, entries: [{ def: getCar(carId), name: 'X', profile: prof }], laps: 2, seed: 1, countdown: 0.2 });
  const c = w.cars[0];
  const hits = [];
  let driftT = 0, lastHit = -1;
  while (!w.finished && w.time < 200) {
    w.step(1 / 120);
    if (c.drifting) driftT += 1 / 120;
    if (c.hitThisStep > 150 && w.time - lastHit > 0.5) { hits.push(`${(c.trackDist / track.length).toFixed(2)}${c.drifting ? 'D' : ''}(${Math.round(c.hitThisStep)})`); lastHit = w.time; }
  }
  console.log(`${td.name.padEnd(16)} ${prof}/${carId} meilleur tour ${c.laps.bestLap.toFixed(2)}s  drift ${driftT.toFixed(1)}s  chocs: ${hits.length} ${hits.slice(0, 12).join(' ')}`);
}
