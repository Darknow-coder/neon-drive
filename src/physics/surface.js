// Effet du sol sous la voiture (zones spéciales des circuits).
//   boost : plaque d'accélération → poussée temporaire (gratuite, sans jauge)
//   slick : zone glissante → adhérence fortement réduite

import { zoneAt } from '../track/buildTrack.js';

const NORMAL = Object.freeze({ speedMul: 1, gripMul: 1, pad: false, zone: null });
const SLICK = Object.freeze({ speedMul: 1, gripMul: 0.4, pad: false, zone: 'slick' });
const PAD = Object.freeze({ speedMul: 1, gripMul: 1, pad: true, zone: 'boost' });

export function surfaceFor(car, track) {
  if (!track.zones.length) return NORMAL;
  const z = zoneAt(track, car.trackIndex, car.trackLateral);
  if (!z) return NORMAL;
  return z.type === 'slick' ? SLICK : z.type === 'boost' ? PAD : NORMAL;
}
