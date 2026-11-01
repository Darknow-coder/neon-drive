// Vérifie l'événement GIGA RUSH : 20 voitures sur NEON HIGHWAY.
//  - le circuit est valide ;
//  - toutes les voitures finissent (pas de blocage) dans un temps raisonnable ;
//  - un pilote « TÉMOIN » (IA polyvalente, au niveau des voitures de la ligue)
//    parti en milieu de peloton a une vraie chance de remonter.
// Usage : node tools/eventCheck.js [nombreDeCourses]
import { buildTrack } from '../src/track/buildTrack.js';
import { getTrackData } from '../src/data/tracks/index.js';
import { validateTrack } from '../src/track/validate.js';
import { getCar } from '../src/data/cars.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { mulberry32 } from '../src/core/math.js';
import { EVENT } from '../src/data/event.js';
import { eventField } from '../src/progression/event.js';
import { AI_CAR_LEVEL } from '../src/data/economy.js';

const RACES = Number(process.argv[2] ?? 6);
const track = buildTrack(getTrackData(EVENT.trackId));
const v = validateTrack(track);
console.log(`${v.ok ? '✓' : '✗'} ${getTrackData(EVENT.trackId).name}  longueur ${Math.round(v.stats.length)} u (~${v.stats.lapEstimate.toFixed(0)} s/tour)  écart min ${Math.round(v.stats.minGap)} u`);
for (const p of v.problems) console.log('    → ' + p.msg);
let failed = !v.ok;

for (const league of ['bronze', 'or', 'elite']) {
  const places = [];
  let walls = 0, maxTime = 0, dnf = 0, startPlaces = [];
  for (let r = 0; r < RACES; r++) {
    const rng = mulberry32(500 + r);
    const me = { def: getCar('nova'), name: 'TÉMOIN', profile: 'balanced', level: AI_CAR_LEVEL[league] };
    const entries = eventField(league, me, rng);
    startPlaces.push(entries.indexOf(me) + 1);
    const world = createRaceWorld({ track, entries, laps: EVENT.laps, league, seed: 900 + r, countdown: 0.5 });
    while (!world.finished && world.time < 400) world.step(1 / 120);
    if (!world.finished) dnf++;
    maxTime = Math.max(maxTime, world.time);
    walls += world.cars.reduce((a, c) => a + c.wallHits, 0);
    places.push(world.cars.find((c) => c.name === 'TÉMOIN').position);
  }
  const avg = places.reduce((a, b) => a + b, 0) / places.length;
  console.log(`${dnf ? '✗' : '✓'} ${league.padEnd(7)} départ ${startPlaces.join(',')} → arrivée ${places.join(',')} (moy. ${avg.toFixed(1)})  course la plus longue ${maxTime.toFixed(0)} s  chocs murs/course ${(walls / RACES).toFixed(1)}`);
  if (dnf) failed = true;
}
process.exit(failed ? 1 : 0);
