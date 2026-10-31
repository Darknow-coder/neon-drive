// Simule des courses complètes entre IA, sans affichage, pour l'équilibrage.
// Usage : node tools/aiRace.js [nombreDeCourses] [ligue]
// Un pilote « TÉMOIN » (profil polyvalent sur NOVA) remplace le joueur.

import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_DRIVERS } from '../src/data/aiProfiles.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { mulberry32 } from '../src/core/math.js';

const RACES = Number(process.argv[2] ?? 12);
const LEAGUE = process.argv[3] ?? 'bronze';
const DT = 1 / 120;
const roster = [
  ...AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile, colors: d.colors })),
  { def: getCar('nova'), name: 'TÉMOIN', profile: 'balanced' },
];

for (const td of TRACKS) {
  const track = buildTrack(td);
  const stats = new Map(roster.map((r) => [r.name, { pos: [], wins: 0, wall: 0, car: 0, best: Infinity, dnf: 0 }]));
  let spreads = 0, leadChanges = 0, simTime = 0, overtakes = 0, poleWins = 0;
  const t0 = performance.now();
  for (let r = 0; r < RACES; r++) {
    // Grille mélangée à chaque course (graine différente)
    const rnd = mulberry32(1000 + r);
    const entries = roster.slice().sort(() => rnd() - 0.5);
    const world = createRaceWorld({ track, entries, laps: 3, league: LEAGUE, seed: 77 + r, countdown: 0.5 });
    let leader = null;
    const pole = world.cars[0];
    let lastPos = new Map();
    let tick = 0;
    while (!world.finished && world.time < 400) {
      world.step(DT);
      if (world.started && world.order[0] !== leader) { if (leader) leadChanges++; leader = world.order[0]; }
      // Dépassements (mesurés toutes les 0,5 s, après le premier virage)
      if (world.time > 6 && ++tick % 60 === 0) {
        for (const c of world.cars) {
          if (!c.finished && lastPos.has(c) && c.position < lastPos.get(c)) overtakes += lastPos.get(c) - c.position;
          lastPos.set(c, c.position);
        }
      }
    }
    if (pole.position === 1) poleWins++;
    simTime += world.time;
    const times = world.cars.filter((c) => c.finished).map((c) => c.finishTime);
    spreads += Math.max(...times) - Math.min(...times);
    for (const c of world.cars) {
      const s = stats.get(c.name);
      s.pos.push(c.position);
      if (c.position === 1) s.wins++;
      s.wall += c.wallHits;
      s.car += c.carHits;
      s.best = Math.min(s.best, c.laps.bestLap);
      if (!c.finished) s.dnf++;
    }
  }
  const ms = performance.now() - t0;
  console.log(`\n=== ${td.name} (${RACES} courses, ligue ${LEAGUE}) — simulé en ${(ms / 1000).toFixed(1)} s ===`);
  console.log('Pilote    Voiture  Profil                  Pos.moy  Victoires  MeilleurTour  ChocsMur/course  ContactsVoiture/course  Abandons');
  for (const r of roster) {
    const s = stats.get(r.name);
    const avg = s.pos.reduce((a, b) => a + b, 0) / s.pos.length;
    console.log(`${r.name.padEnd(9)} ${r.def.name.padEnd(8)} ${r.profile.padEnd(23)} ${avg.toFixed(2).padStart(7)}  ${String(s.wins).padStart(9)}  ${s.best.toFixed(2).padStart(12)}  ${(s.wall / RACES).toFixed(1).padStart(15)}  ${(s.car / RACES).toFixed(1).padStart(22)}  ${String(s.dnf).padStart(8)}`);
  }
  console.log(`Écart moyen 1er-dernier : ${(spreads / RACES).toFixed(1)} s · dépassements/course : ${(overtakes / RACES).toFixed(1)} · changements de leader/course : ${(leadChanges / RACES).toFixed(1)} · victoires depuis la pole : ${Math.round((poleWins / RACES) * 100)} % · durée moy. : ${(simTime / RACES).toFixed(0)} s`);
}
