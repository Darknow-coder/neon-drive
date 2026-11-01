// Calcule les temps des médailles du contre-la-montre (à relancer si l'on
// modifie la physique, l'IA ou un circuit) et écrit src/data/timeTrialTargets.js.
// Usage : node tools/timeTrialTargets.js         (seulement les nouveaux circuits)
//         node tools/timeTrialTargets.js --all   (tout recalculer : change les médailles !)
import { writeFileSync } from 'node:fs';
import { TRACKS } from '../src/data/tracks/index.js';
import { computeNeonGhost } from '../src/race/aiGhost.js';
import { NEON_TIMES } from '../src/data/timeTrialTargets.js';

const all = process.argv.includes('--all');
const out = {};
for (const t of TRACKS) {
  if (!all && NEON_TIMES[t.id]) { out[t.id] = NEON_TIMES[t.id]; continue; }
  const g = computeNeonGhost(t);
  out[t.id] = Math.round(g.time * 1000) / 1000;
  console.log(`${t.name.padEnd(17)} NEON ${g.time.toFixed(3)} s  (${g.n} échantillons, ${Math.round(g.data.length / 1024)} Ko)`);
}
writeFileSync(new URL('../src/data/timeTrialTargets.js', import.meta.url),
  `// Généré par tools/timeTrialTargets.js — temps du tour NEON (IA Élite) par circuit.\nexport const NEON_TIMES = ${JSON.stringify(out, null, 2)};\n`);
