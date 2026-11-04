// Circuit 04 — RAINLINE
// Profil : urbain, sous la pluie. Virages à angle droit entre les immeubles,
// une longue ligne droite de départ. La pluie réduit l'adhérence de toutes
// les voitures : il faut freiner plus tôt et doser les drifts.

import { t } from '../../i18n/index.js';
export default {
  id: 'rainline',
  name: 'RAINLINE',
  profile: t('Urbain · Pluie'),
  league: 'argent',
  scale: 1.68,
  width: 240,
  weather: 'rain',
  laps: 4, // circuit court : un tour de plus
  theme: { style: 'city', left: '#4d8bff', right: '#00f0ff', kerb: '#ffe14d' },
  points: [
    [1300, 2300],
    [2500, 2300],
    [3100, 2250],
    [3350, 1950],
    [3350, 1500],
    [3150, 1250],
    [2700, 1200],
    [2450, 1000],
    [2450, 650],
    [2200, 400],
    [1600, 400],
    [1250, 650],
    [1300, 1050],
    [1000, 1350],
    [600, 1400],
    [400, 1750],
    [550, 2150],
    [900, 2300],
  ],
  obstacles: [],
  zones: [
    { type: 'boost', at: 0.08, length: 110, offset: 0, width: 90 },
    { type: 'boost', at: 0.62, length: 100, offset: 0, width: 80 },
  ],
};
