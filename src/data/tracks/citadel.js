// Circuit 07 — CITADEL (ligue Élite)
// Profil : l'épreuve ultime. Une citadelle urbaine sous la pluie : longue
// ligne droite, puis une section technique en lacets. Trois piliers mobiles
// coulissent d'un bord à l'autre : leur mouvement est régulier, à toi de
// trouver le bon moment pour passer.

export default {
  id: 'citadel',
  name: 'CITADEL',
  profile: 'Ultime · Pluie',
  league: 'elite',
  scale: 1.5,
  width: 235,
  weather: 'rain',
  theme: { style: 'city', left: '#ff3b5c', right: '#a45bff', kerb: '#ff3b5c' },
  points: [
    [1200, 2500],
    [2500, 2500],
    [3400, 2400],
    [3900, 1900],
    [3900, 1300],
    [3600, 900],
    [3000, 800],
    [2600, 1100],
    [2600, 1600],
    [2200, 1850],
    [1700, 1700],
    [1500, 1250],
    [1800, 850],
    [1600, 450],
    [1000, 400],
    [600, 700],
    [500, 1300],
    [650, 1900],
    [850, 2350],
  ],
  obstacles: [
    { type: 'pillar', at: 0.09, offset: 0, r: 17, move: { amp: 62, period: 3.2, phase: 0 } },
    { type: 'pillar', at: 0.485, offset: 0, r: 16, move: { amp: 55, period: 2.6, phase: 1.5 } },
    { type: 'pillar', at: 0.86, offset: 0, r: 16, move: { amp: 60, period: 3.0, phase: 3.0 } },
  ],
  zones: [
    { type: 'boost', at: 0.16, length: 110, offset: 0, width: 80 },
    { type: 'boost', at: 0.93, length: 100, offset: 0, width: 80 },
  ],
};
