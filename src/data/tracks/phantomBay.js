// Circuit — PHANTOM BAY (ligue Diamant)
// Profil : technique dans le brouillard. Une baie portuaire noyée dans la
// brume : on voit moins loin, il faut connaître le tracé par cœur.

import { t } from '../../i18n/index.js';
export default {
  id: 'phantom-bay',
  name: 'PHANTOM BAY',
  profile: t('Technique · Brouillard'),
  league: 'diamant',
  scale: 1.65,
  width: 225,
  weather: 'fog',
  theme: { style: 'fog', left: '#b8c4ff', right: '#7af7ff', kerb: '#b8c4ff' },
  points: [[1400, 2630], [2000, 2650], [2900, 2400], [2800, 1850], [3150, 1450], [3750, 1650], [4050, 1150], [3750, 600], [3050, 450], [2550, 750], [1950, 550], [1350, 750], [1450, 1300], [1000, 1650], [500, 1600], [300, 2200], [800, 2600]],
  obstacles: [
    { type: 'pillar', at: 0.3, offset: 0, r: 16 },
    { type: 'pillar', at: 0.6525, offset: 0, r: 16 },
  ],
  zones: [
    { type: 'boost', at: 0.08, length: 100, offset: 0, width: 80 },
    { type: 'boost', at: 0.5, length: 100, offset: 0, width: 80 },
  ],
};
