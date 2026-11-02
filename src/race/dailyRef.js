// Temps de référence du défi CHRONO du jour : une course solo pilotée par une IA
// au talent de rival (sans erreur), avec la voiture et les règles du défi.
import { buildTrack } from '../track/buildTrack.js';
import { getCar } from '../data/cars.js';
import { AI_PROFILES } from '../data/aiProfiles.js';
import { RIVAL_SKILL } from '../data/rivals.js';
import { createRaceWorld } from './raceWorld.js';
import { challengeRules } from '../progression/daily.js';

export const DAILY_TIME_LEVEL = 3; // niveau de la voiture imposée en chrono (le même pour tous)

export function dailyReferenceTime(ch) {
  const track = buildTrack(ch.track);
  const me = { def: getCar(ch.car ?? 'nova'), name: 'REF', level: DAILY_TIME_LEVEL,
    profileData: { ...AI_PROFILES.balanced, ...RIVAL_SKILL, mistakeRate: 0.0001 }, paceMul: 1.05, mistakeMul: 0, lineMul: 0.5, driftMul: 1 };
  const w = createRaceWorld({ track, entries: [me], laps: ch.laps, league: 'elite', seed: 77, countdown: 0.5, rules: challengeRules(ch) });
  while (!w.finished && w.time < 300) w.step(1 / 120);
  return w.cars[0].finished ? w.cars[0].finishTime : null;
}
