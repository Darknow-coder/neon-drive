// Vérifie la géométrie de chaque circuit (à lancer après toute modification).
// Les règles sont dans src/track/validate.js (les mêmes que dans l'éditeur).
// Usage : node tools/trackCheck.js
import { buildTrack } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { validateTrack } from '../src/track/validate.js';

let failed = false;
for (const td of TRACKS) {
  const t = buildTrack(td);
  const { ok, problems, stats } = validateTrack(t);
  console.log(`${ok ? '✓' : '✗'} ${td.name.padEnd(16)} longueur ${Math.round(stats.length)} u (~${stats.lapEstimate.toFixed(0)} s/tour)  écart min ${Math.round(stats.minGap)} u  rayon int. min ${Math.round(stats.minInnerRadius)} u  obstacles ${stats.obstacles}  zones ${stats.zones}`);
  for (const p of problems) console.log('    → ' + p.msg);
  if (!ok) failed = true;
}
process.exit(failed ? 1 : 0);
