// Effet du sol sous la voiture (zones spéciales et météo des circuits).
//   boost : plaque d'accélération → poussée temporaire (gratuite, sans jauge)
//   slick : zone glissante → adhérence fortement réduite
//   pluie : adhérence réduite partout (track.gripMul), pour tout le monde

import { zoneAt } from '../track/buildTrack.js';

function surfacesFor(track) {
  if (!track._surfaces) {
    const g = track.gripMul ?? 1;
    track._surfaces = {
      normal: Object.freeze({ speedMul: 1, gripMul: g, pad: false, zone: null }),
      slick: Object.freeze({ speedMul: 1, gripMul: 0.4 * g, pad: false, zone: 'slick' }),
      pad: Object.freeze({ speedMul: 1, gripMul: g, pad: true, zone: 'boost' }),
    };
  }
  return track._surfaces;
}

export function surfaceFor(car, track) {
  const s = surfacesFor(track);
  if (!track.zones.length) return s.normal;
  const z = zoneAt(track, car.trackIndex, car.trackLateral);
  if (!z) return s.normal;
  return z.type === 'slick' ? s.slick : z.type === 'boost' ? s.pad : s.normal;
}
