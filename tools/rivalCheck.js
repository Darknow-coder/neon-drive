// Mesure la force des rivaux dans leur ligue (courses entre IA).
// Objectif : plus forts que la moyenne, mais battables (≈ 1 victoire sur 3).
// Usage : node tools/rivalCheck.js [courses]
import { buildTrack } from '../src/track/buildTrack.js';
import { getCar } from '../src/data/cars.js';
import { AI_DRIVERS } from '../src/data/aiProfiles.js';
import { RIVALS } from '../src/data/rivals.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { mulberry32 } from '../src/core/math.js';
import { tracksForLeague } from '../src/progression/progression.js';

const N = Number(process.argv[2] ?? 20);
for (const [league, rv] of Object.entries(RIVALS)) {
  const pool = tracksForLeague(league);
  const pos = [], tem = [];
  let wins = 0;
  for (let r = 0; r < N; r++) {
    const rnd = mulberry32(500 + r);
    const ai = AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile }));
    ai.splice(Math.floor(rnd() * ai.length), 1);
    ai.push({ def: getCar(rv.car), name: rv.name, profile: rv.profile, isRival: true, paceMul: rv.paceMul, mistakeMul: rv.mistakeMul, skill: rv.skill });
    ai.push({ def: getCar('nova'), name: 'TEMOIN', profile: 'balanced' });
    ai.sort(() => rnd() - 0.5);
    const w = createRaceWorld({ track: buildTrack(pool[r % pool.length]), entries: ai, laps: 3, league, seed: r, countdown: 0.3 });
    while (!w.finished && w.time < 300) w.step(1 / 120);
    const c = w.cars.find((x) => x.isRival);
    pos.push(c.position);
    if (c.position === 1) wins++;
    tem.push(w.cars.find((x) => x.name === 'TEMOIN').position);
  }
  const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
  console.log(`${league.padEnd(8)} ${rv.name.padEnd(8)} (${getCar(rv.car).name.padEnd(7)}) position moyenne ${avg(pos)} · victoires ${wins}/${N} | pilote moyen : ${avg(tem)}`);
}
