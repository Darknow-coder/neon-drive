// Circuit — FROSTLINE (ligue Argent)
// Profil : technique sur la neige. Des épingles entre les sapins, une plaque
// de verglas : la piste glisse partout, il faut freiner plus tôt.

import { t } from '../../i18n/index.js';
export default {
  id: 'frostline',
  name: 'FROSTLINE',
  profile: t('Technique · Neige'),
  league: 'argent',
  laps: 2,
  scale: 1.5,
  width: 250,
  weather: 'snow',
  theme: { style: 'snow', left: '#7af7ff', right: '#c8d8ff', kerb: '#7af7ff' },
  points: [[1450, 2700], [2200, 2700], [3400, 2550], [3850, 2000], [3500, 1550], [2800, 1650], [2350, 1250], [2750, 850], [3450, 850], [3800, 500], [3550, 150], [2200, 180], [1400, 350], [1250, 800], [1450, 1250], [1050, 1750], [550, 1750], [350, 2250], [700, 2700]],
  obstacles: [],
  zones: [
    { type: 'boost', at: 0.06, length: 100, offset: 0, width: 80 },
    { type: 'slick', at: 0.6, length: 220 },
    { type: 'boost', at: 0.72, length: 100, offset: 0, width: 80 },
  ],
};
