// Contre-la-montre : médailles et récompenses (réglables ici).
// Les temps cibles sont calculés à partir du tour NEON de chaque circuit
// (voir tools/timeTrialTargets.js) : bronze = NEON × 1,17, etc.

import { t } from '../i18n/index.js';
import { NEON_TIMES } from './timeTrialTargets.js';

export const MEDALS = [
  { id: 'bronze', name: 'BRONZE', factor: 1.17, color: '#d4894a', reward: { credits: 30 } },
  { id: 'silver', name: t('ARGENT'), factor: 1.09, color: '#c9d2ea', reward: { credits: 60 } },
  { id: 'gold', name: t('OR'), factor: 1.035, color: '#ffd34d', reward: { credits: 120, pack: 'small' } },
  { id: 'neon', name: 'NEON', factor: 1.0, color: '#ff2bd6', reward: { credits: 200, pack: 'medium' } },
];

/** Temps à battre pour chaque médaille d'un circuit (arrondi au 0,05 s au-dessus). */
export function medalTimes(trackId) {
  const ref = NEON_TIMES[trackId];
  if (!ref) return null;
  return MEDALS.map((m) => ({ ...m, time: Math.ceil((ref * m.factor) * 20) / 20 }));
}
