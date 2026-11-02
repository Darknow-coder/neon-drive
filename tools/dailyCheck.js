// Vérifie le DÉFI DU JOUR sur 40 jours à venir :
//  - chaque circuit (même à l'envers) est valide et sans blocage ;
//  - le défi est jouable : toutes les voitures finissent, temps de référence calculable ;
//  - variété : formats, règles, twists.
// Usage : node tools/dailyCheck.js [jours]
import { buildTrack } from '../src/track/buildTrack.js';
import { validateTrack } from '../src/track/validate.js';
import { TRACKS, trackVariant } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_DRIVERS } from '../src/data/aiProfiles.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { dailyChallenge, challengeRules, timeTargetsFrom } from '../src/progression/daily.js';
import { dailyReferenceTime } from '../src/race/dailyRef.js';
import { dayKey } from '../src/progression/shop.js';

const DAYS = Number(process.argv[2] ?? 40);
let fails = 0;
// 1) Tous les circuits à l'envers sont valides
for (const t of TRACKS) {
  const v = validateTrack(buildTrack(trackVariant(t, { reverse: true, id: t.id + '-r' })));
  if (!v.ok) { fails++; console.log(`✗ ${t.name} à l'envers : ${v.problems.map((p) => p.msg).join(' | ')}`); }
}
console.log(`✓ circuits à l'envers vérifiés (${TRACKS.length})`);
// 2) Les prochains jours
const count = { format: {}, rule: {}, twist: {} };
const start = new Date();
for (let k = 0; k < DAYS; k++) {
  const day = dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + k, 12));
  const ch = dailyChallenge(day);
  count.format[ch.format] = (count.format[ch.format] ?? 0) + 1;
  count.rule[ch.rule] = (count.rule[ch.rule] ?? 0) + 1;
  const tw = ch.reverse && ch.weather ? 'envers+météo' : ch.reverse ? 'envers' : ch.weather ? 'météo' : 'aucun';
  count.twist[tw] = (count.twist[tw] ?? 0) + 1;
  const track = buildTrack(ch.track);
  let info = '';
  if (ch.format === 'time') {
    const ref = dailyReferenceTime(ch);
    if (!ref) { fails++; info = '✗ référence impossible'; } else info = `cibles ${timeTargetsFrom(ref).join(' / ')} s`;
  } else {
    const entries = AI_DRIVERS.map((d) => ({ def: getCar(ch.rule === 'oneCar' ? ch.car : d.car), name: d.name, profile: d.profile }));
    entries.push({ def: getCar(ch.car ?? 'nova'), name: 'X', profile: 'balanced' });
    const w = createRaceWorld({ track, entries, laps: ch.format === 'elim' ? 3 : ch.laps, league: 'or', seed: k, countdown: 0.5, rules: challengeRules(ch) });
    while (!w.finished && w.time < 300) w.step(1 / 120);
    const stuck = w.cars.filter((c) => !c.finished).map((c) => c.name);
    if (stuck.length) { fails++; info = `✗ non finies : ${stuck.join(',')}`; } else info = `toutes arrivées en ${Math.round(w.time)} s`;
  }
  console.log(`${info.startsWith('✗') ? '✗' : '✓'} ${day} ${ch.format.padEnd(5)} ${ch.track.name.padEnd(18)} ${(ch.weather ?? '').padEnd(6)} ${ch.rule.padEnd(7)} ${(ch.car ?? '—').padEnd(8)} ${info}`);
}
console.log('Répartition :', JSON.stringify(count));
process.exit(fails ? 1 : 0);
