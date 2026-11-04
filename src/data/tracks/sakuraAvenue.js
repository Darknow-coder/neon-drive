// Circuit — SAKURA AVENUE (ligue Bronze)
// Profil : coulé et accueillant. Une avenue bordée de cerisiers en fleurs,
// au coucher du soleil : une pluie de pétales roses, sans difficulté en plus.

import { t } from '../../i18n/index.js';
export default {
  id: 'sakura-avenue',
  name: 'SAKURA AVENUE',
  profile: t('Fluide · Crépuscule'),
  league: 'bronze',
  scale: 1.4,
  width: 260,
  weather: 'dusk',
  theme: { style: 'dusk', left: '#ff7ad9', right: '#ffb36b', kerb: '#ff7ad9' },
  points: [[1200, 2450], [1800, 2500], [3000, 2400], [3700, 1900], [3700, 1100], [3100, 600], [2300, 800], [1800, 1300], [1200, 1000], [600, 1200], [300, 1800], [600, 2400]],
  obstacles: [],
  zones: [
    { type: 'boost', at: 0.08, length: 100, offset: 0, width: 80 },
    { type: 'boost', at: 0.55, length: 100, offset: 0, width: 80 },
  ],
};
