// Calcule les temps de référence des défis CHRONO de la carrière (course
// complète avec départ arrêté, pilotée par une IA au talent de rival) et
// écrit src/data/careerTargets.js. À relancer si l'on change un défi chrono.
// Usage : node tools/careerTargets.js
import { writeFileSync } from 'node:fs';
import { buildTrack } from '../src/track/buildTrack.js';
import { getTrackData } from '../src/data/tracks/index.js';
import { getCar } from '../src/data/cars.js';
import { AI_PROFILES } from '../src/data/aiProfiles.js';
import { RIVAL_SKILL } from '../src/data/rivals.js';
import { AI_CAR_LEVEL } from '../src/data/economy.js';
import { createRaceWorld } from '../src/race/raceWorld.js';
import { ALL_STAGES } from '../src/data/career.js';

const out = {};
for (const st of ALL_STAGES.filter((s) => s.type === 'time')) {
  const times = [];
  for (let k = 0; k < 3; k++) {
    const me = { def: getCar('nova'), name: 'REF', level: AI_CAR_LEVEL[st.chapter.league],
      profileData: { ...AI_PROFILES.balanced, ...RIVAL_SKILL, mistakeRate: 0.0001 }, paceMul: 1.05, mistakeMul: 0, lineMul: 0.5, driftMul: 1 };
    const w = createRaceWorld({ track: buildTrack(getTrackData(st.track)), entries: [me], laps: st.laps, league: 'elite', seed: 50 + k, countdown: 0.5 });
    while (!w.finished && w.time < 400) w.step(1 / 120);
    times.push(w.cars[0].finishTime);
  }
  out[st.id] = Math.round(Math.min(...times) * 100) / 100;
  console.log(st.id, st.title.padEnd(20), out[st.id], 's');
}
writeFileSync(new URL('../src/data/careerTargets.js', import.meta.url),
  `// Généré par tools/careerTargets.js — temps de référence des défis chrono (talent de rival).\nexport const CAREER_TIMES = ${JSON.stringify(out, null, 2)};\n`);
