// Circuit 05 — DUNE RUNNER
// Profil : très rapide, dans un désert néon. Immenses courbes à fond,
// mais des plaques de sable glissant dans deux virages et une épingle
// à gauche en fin de tour. Les voitures rapides y sont reines.

import { t } from '../../i18n/index.js';
export default {
  id: 'dune-runner',
  name: 'DUNE RUNNER',
  profile: t('Très rapide'),
  league: 'or',
  scale: 1.5,
  width: 260,
  theme: { style: 'desert', left: '#ff8a3d', right: '#ff2bd6', kerb: '#ffb000' },
  points: [
    [1000, 2600],
    [2200, 2650],
    [3300, 2500],
    [4200, 2100],
    [4600, 1500],
    [4500, 900],
    [4000, 550],
    [3300, 500],
    [2700, 750],
    [2300, 1200],
    [1800, 1400],
    [1200, 1250],
    [800, 900],
    [400, 1000],
    [250, 1600],
    [450, 2200],
  ],
  obstacles: [],
  zones: [
    { type: 'slick', at: 0.42, length: 240 },
    { type: 'slick', at: 0.8, length: 220 },
    { type: 'boost', at: 0.06, length: 120, offset: -40, width: 90 },
    { type: 'boost', at: 0.2, length: 120, offset: 40, width: 90 },
  ],
};
