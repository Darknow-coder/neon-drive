// Vérifie que chaque défi de la carrière est faisable (et pas trop facile) :
// un pilote « TÉMOIN » (IA polyvalente, voiture au niveau de la ligue) joue
// chaque défi plusieurs fois ; on affiche ses étoiles.
//  - Un défi où le témoin n'a JAMAIS la moindre étoile est signalé (✗).
//  - Le duel est joué par un témoin « fort » (talent de rival, sans bonus de rythme) :
//    un bon joueur humain doit pouvoir gagner.
// Usage : node tools/careerCheck.js [essais] [--faible]
import { buildTrack } from '../src/track/buildTrack.js';
import { getTrackData } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_DRIVERS, AI_PROFILES } from '../src/data/aiProfiles.js';
import { RIVALS, RIVAL_SKILL } from '../src/data/rivals.js';
import { AI_CAR_LEVEL } from '../src/data/economy.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { computeResults } from '../src/race/results.js';
import { createEliminator } from '../src/scenes/eliminator.js';
import { CHAPTERS, DUEL_PACE } from '../src/data/career.js';
import { evaluateStage, timeTargets } from '../src/progression/campaign.js';
import { mulberry32 } from '../src/core/math.js';

const TRIES = Number(process.argv[2] ?? 3);
let fails = 0;

function runStage(stage, ch, seed, strong) {
  const track = buildTrack(getTrackData(stage.track));
  const rv = Object.values(RIVALS).find((r) => r.id === ch.rival);
  const level = AI_CAR_LEVEL[ch.league];
  // Témoin « fort » : talent et rythme d'un rival (≈ un bon joueur humain)
  const me = { def: getCar(process.argv.includes('--meme-voiture') ? rv.car : 'nova'), name: 'TÉMOIN', profile: 'balanced', level,
    ...(strong ? { profileData: { ...AI_PROFILES.balanced, ...RIVAL_SKILL }, paceMul: 1.05, mistakeMul: 0.6, lineMul: 0.5, driftMul: 1 } : {}) };
  const rivalEntry = { def: getCar(rv.car), name: rv.name, profile: rv.profile, colors: rv.colors, isRival: true,
    paceMul: rv.paceMul, skillScale: stage.type === 'duel' ? DUEL_PACE : 1, mistakeMul: rv.mistakeMul, skill: rv.skill };
  let entries;
  const rng = mulberry32(seed);
  if (stage.type === 'time') entries = [me];
  else if (stage.type === 'duel') entries = [rivalEntry, me];
  else {
    const ai = AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile }));
    ai.splice(Math.floor(rng() * ai.length), 1, rivalEntry);
    ai.sort(() => rng() - 0.5);
    // Comme le joueur : dans les 3 dernières places (ou tout au fond pour une remontée)
    entries = ai.slice();
    entries.splice(stage.type === 'last' ? 5 : 3 + Math.floor(rng() * 3), 0, me);
  }
  const w = createRaceWorld({ track, entries, laps: stage.type === 'elim' ? 99 : stage.laps, league: ch.league, seed, countdown: 0.5 });
  const el = stage.type === 'elim' ? createEliminator(w) : null;
  const witness = w.cars.find((c) => c.name === 'TÉMOIN');
  while (w.time < 400) {
    w.step(1 / 120);
    if (el) { el.check(); if (w.cars.length <= 1 || !w.cars.includes(witness)) break; }
    else if (w.finished || (witness.finished && w.time - witness.finishTime > 6)) break;
  }
  if (el) {
    const alive = w.order.slice();
    const order = [...alive, ...el.out.slice().reverse()];
    return { position: order.indexOf(witness) + 1 };
  }
  const rows = computeResults(w);
  const meRow = rows.find((r) => r.name === 'TÉMOIN');
  const rvRow = rows.find((r) => r.isRival);
  return {
    position: meRow.position, finished: meRow.finished, wallHits: meRow.stats.wallHits,
    rivalBeaten: !!rvRow && meRow.position < rvRow.position,
    time: meRow.finished ? meRow.time : null,
    margin: meRow.position === 1 && rows[1] ? rows[1].gap : 0,
    behind: meRow.gap,
  };
}

const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
for (const ch of CHAPTERS) {
  console.log(`CHAPITRE ${ch.n} · ${ch.title} (${ch.league})`);
  for (const stage of [...ch.stages, ch.duel]) {
    if (only && !only.includes(stage.id)) continue;
    const strong = process.argv.includes('--faible') ? false : true;
    const stars = [];
    let extra = '';
    for (let k = 0; k < TRIES; k++) {
      const r = runStage(stage, ch, 1000 + k * 37 + ch.n * 11, strong);
      stars.push(evaluateStage(stage, r));
      if (process.argv.includes('--detail')) extra += ` [${r.position}${r.rivalBeaten ? 'R' : ''}${r.wallHits ? 'm' + r.wallHits : ''}${r.behind ? ' +' + r.behind.toFixed(1) + 's' : ''}]`;
      if (stage.type === 'time') extra = `temps ${r.time?.toFixed(2)} s / cibles ${timeTargets(stage).join(' · ')}`;
    }
    const best = Math.max(...stars);
    const ok = best > 0;
    if (!ok) fails++;
    console.log(`  ${ok ? '✓' : '✗'} ${stage.id.padEnd(5)} ${stage.type.padEnd(5)} ${stage.title.padEnd(22)} étoiles ${stars.join(' ')} ${extra}`);
  }
}
process.exit(fails ? 1 : 0);
