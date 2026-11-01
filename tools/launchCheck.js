// Vérifie le départ canon : verdict selon le moment où l'on accélère,
// avantage réel d'un départ parfait, pénalité du patinage, IA équitables.
// Usage : node tools/launchCheck.js
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { createIntent } from '../src/core/input.js';

let ok = 0, ko = 0;
const check = (c, label) => { if (c) ok++; else { ko++; console.log('  ✗ ' + label); } };
const track = buildTrack(TRACKS[1]);
const DT = 1 / 120;

/** Le joueur appuie sur l'accélérateur à `pressAt` (temps de course, négatif = avant le vert). */
function run(pressAt, { launchControl = true, seconds = 3 } = {}) {
  const w = createRaceWorld({ track, entries: [{ def: getCar('nova'), name: 'TOI', isPlayer: true }], laps: 3, countdown: 3, seed: 1, launchControl });
  const it = createIntent();
  while (w.time < seconds) {
    it.throttle = pressAt !== null && w.time >= pressAt ? 1 : 0;
    w.step(DT, it);
  }
  return { launch: w.player.launch, dist: w.player.trackDist };
}

const cases = [[-2.5, 'spin'], [-1.5, 'spin'], [-0.8, 'good'], [-0.3, 'perfect'], [-0.05, 'perfect'], [0.1, 'good'], [0.6, null], [null, null]];
const res = {};
for (const [t, want] of cases) {
  const r = run(t);
  res[t] = r;
  check(r.launch === want, `appui à ${t} s → ${want} (obtenu ${r.launch})`);
}
check(run(-0.2, { launchControl: false }).launch === null, 'accélération automatique : pas de départ canon');
// Avantage mesuré après 3 s de course (tous à fond dès que possible)
const perfect = res[-0.3].dist, good = res[-0.8].dist, spin = res[-2.5].dist, late = run(0, { seconds: 3 });
check(perfect > good && good > spin, `distance après 3 s : parfait ${Math.round(perfect)} > bon ${Math.round(good)} > patinage ${Math.round(spin)}`);
check(perfect - late.dist < 250 && late.dist - spin < 250, 'écarts raisonnables (pas de départ décisif à lui seul)');
console.log(`   écart parfait / normal : +${Math.round(perfect - late.dist)} u, patinage : −${Math.round(late.dist - spin)} u`);

// IA : verdicts tirés au sort, répartition plausible
const counts = { perfect: 0, good: 0, spin: 0, none: 0 };
for (let s = 0; s < 40; s++) {
  const entries = [{ def: getCar('nova'), name: 'TOI', isPlayer: true }, ...Array.from({ length: 5 }, (_, k) => ({ def: getCar('volt'), name: 'IA' + k, profile: 'balanced' }))];
  const w = createRaceWorld({ track, entries, laps: 3, countdown: 0.2, seed: s });
  while (w.time < 0.1) w.step(DT, createIntent());
  for (const c of w.cars) if (!c.isPlayer) counts[c.launch ?? 'none']++;
}
const total = 200;
check(counts.perfect / total > 0.12 && counts.perfect / total < 0.35 && counts.spin / total < 0.15, `IA : ${JSON.stringify(counts)}`);
console.log(`${ok} vérifications réussies, ${ko} échec(s). IA sur 200 départs : ${JSON.stringify(counts)}`);
process.exit(ko ? 1 : 0);
