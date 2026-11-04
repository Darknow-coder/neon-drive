// Circuit — THUNDER PEAK (ligue Élite)
// Profil : l'épreuve des orages. Un sommet battu par la pluie : piste
// mouillée, éclairs aveuglants et un pilier mobile dans la descente.

import { t } from '../../i18n/index.js';
export default {
  id: 'thunder-peak',
  name: 'THUNDER PEAK',
  profile: t('Ultime · Orage'),
  league: 'elite',
  scale: 1.5,
  width: 220,
  weather: 'storm',
  theme: { style: 'storm', left: '#ffe14d', right: '#8a2bff', kerb: '#ffe14d' },
  points: [[1700, 2730], [2500, 2750], [3500, 2500], [3700, 1900], [3350, 1450], [3700, 1000], [3300, 500], [2500, 450], [2100, 900], [1500, 700], [900, 400], [400, 900], [700, 1500], [400, 2100], [900, 2700]],
  obstacles: [
    { type: 'pillar', at: 0.445, offset: 0, r: 16, move: { amp: 60, period: 3.2, phase: 0 } },
    { type: 'pillar', at: 0.7725, offset: 0, r: 16 },
  ],
  zones: [
    { type: 'boost', at: 0.05, length: 100, offset: 0, width: 80 },
    { type: 'slick', at: 0.62, length: 180 },
  ],
};
