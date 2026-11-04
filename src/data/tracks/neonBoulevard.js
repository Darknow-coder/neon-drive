// Circuit 01 — NEON BOULEVARD
// Profil : fluide. Une longue ligne droite de départ, une grande courbe rapide,
// une chicane, une épingle large en haut à droite puis une section sinueuse.
// Idéal pour apprendre le drift.
//
// Format : chaque point = [x, y] ou [x, y, largeur]. Le tracé est parcouru
// dans l'ordre des points ; le premier point est sur la ligne de départ.

import { t } from '../../i18n/index.js';
export default {
  id: 'neon-boulevard',
  name: 'NEON BOULEVARD',
  profile: t('Fluide'),
  league: 'bronze',
  scale: 1.5,
  width: 250,
  theme: { left: '#00f0ff', right: '#ff2bd6', kerb: '#ff2bd6', ground: '#080522' },
  points: [
    [1400, 2600],
    [2300, 2600],
    [3000, 2560],
    [3500, 2280],
    [3700, 1750],
    [3420, 1350, 230],
    [3650, 900, 230],
    // Épingle du haut : resserrée pour inviter au drift
    [3600, 540],
    [3380, 390],
    [3080, 420],
    [2800, 600],
    [2450, 760],
    [2350, 1250],
    [1850, 1520],
    [1350, 1250],
    [1150, 700],
    [700, 450],
    [350, 800],
    [400, 1500],
    [420, 2150],
    [700, 2540],
  ],
};
