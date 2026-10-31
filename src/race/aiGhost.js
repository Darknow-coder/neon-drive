// Fantôme « NEON » : un tour lancé réalisé par l'IA de niveau Élite (NOVA
// niveau 1, sans erreurs volontaires). Sert d'adversaire tant que le joueur
// n'a pas de record, et de référence pour les médailles.
// Calcul entièrement déterministe : même résultat à chaque fois.

import { buildTrack } from '../track/buildTrack.js';
import { getCar } from '../data/cars.js';
import { AI_PROFILES } from '../data/aiProfiles.js';
import { createRaceWorld } from './raceWorld.js';
import { createRecorder } from './ghost.js';

export const NEON_GHOST_CAR = 'nova';
export const NEON_GHOST_COLORS = { body: '#ffffff', accent: '#ff2bd6', glow: '#ffffff' };

export function computeNeonGhost(trackData) {
  const track = buildTrack(trackData);
  const profile = { ...AI_PROFILES.balanced, mistakeRate: 0.0001 };
  const w = createRaceWorld({
    track, laps: 2, seed: 7, countdown: 0.1, league: 'elite',
    entries: [{ def: getCar(NEON_GHOST_CAR), name: 'NEON', profileData: profile, level: 1 }],
  });
  const c = w.cars[0];
  const rec = createRecorder();
  let recording = false;
  let lapStart = 0;
  while (!w.finished && w.time < 300) {
    const before = c.laps.lap;
    w.step(1 / 120);
    if (c.laps.lap === 2 && before === 1) { rec.start(); recording = true; lapStart = w.time; }
    if (recording && c.laps.lap === 2) rec.step(c, c.trackDist);
  }
  return rec.finish(c.laps.lastLap, { carId: NEON_GHOST_CAR, colors: NEON_GHOST_COLORS, neon: true, at: w.time - lapStart });
}
