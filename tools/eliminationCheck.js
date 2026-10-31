// Vérifie le mode Élimination sur chaque circuit (courses entre IA, sans affichage) :
// 5 éliminations, une par tour du leader, toujours la dernière voiture, un seul survivant.
// Usage : node tools/eliminationCheck.js
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_DRIVERS } from '../src/data/aiProfiles.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { createEliminator } from '../src/scenes/eliminator.js';

let fails = 0;
for (const td of TRACKS) {
  const entries = [...AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile })), { def: getCar('nova'), name: 'X', profile: 'balanced' }];
  const w = createRaceWorld({ track: buildTrack(td), entries, laps: 99, seed: 3, countdown: 0.2, league: 'or' });
  const el = createEliminator(w);
  const problems = [];
  while (w.cars.length > 1 && w.time < 400) {
    const lastBefore = w.order[w.order.length - 1];
    const leaderLap = w.order[0].laps.lap;
    w.step(1 / 120);
    const out = el.check();
    if (out && out !== lastBefore && out !== w.order[w.order.length - 1]) {
      // la dernière voiture peut changer au même pas : on vérifie seulement qu'elle n'était pas devant
      if (out.laps.progress > Math.max(...w.cars.map((c) => c.laps.progress))) problems.push(`${out.name} éliminé alors qu'il menait`);
    }
    if (out && leaderLap - 1 < el.done - 1) problems.push('élimination trop tôt');
  }
  if (w.cars.length !== 1) problems.push(`${w.cars.length} survivants`);
  if (el.out.length !== 5) problems.push(`${el.out.length} éliminations`);
  if (el.out.some((c) => w.cars.includes(c))) problems.push('une voiture éliminée est encore en piste');
  console.log(`${problems.length ? '✗' : '✓'} ${td.name.padEnd(16)} ${el.out.map((c) => c.name).join(' → ')} → vainqueur ${w.cars[0]?.name} (${Math.round(w.time)} s)`);
  for (const p of problems) console.log('    → ' + p);
  if (problems.length) fails++;
}
process.exit(fails ? 1 : 0);
