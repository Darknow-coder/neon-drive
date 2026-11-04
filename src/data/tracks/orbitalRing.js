// Circuit 06 — ORBITAL RING
// Profil : le plus technique. Un pont métallique étroit autour d'une station
// spatiale : chicanes, épingle, piliers de structure et une fuite de liquide
// de refroidissement qui rend un virage glissant.

export default {
  id: 'orbital-ring',
  name: 'ORBITAL RING',
  profile: 'Très technique',
  league: 'diamant',
  scale: 1.6,
  width: 215,
  theme: { style: 'orbital', left: '#7af7ff', right: '#a45bff', kerb: '#7af7ff' },
  points: [
    [1400, 2400],
    [2400, 2400],
    [3000, 2300],
    [3300, 1950],
    [3150, 1600],
    [3400, 1250],
    [3300, 850],
    [2900, 650],
    [2450, 800],
    [2350, 1200],
    [2000, 1450],
    [1600, 1300],
    [1500, 900],
    [1150, 650],
    [700, 750],
    [550, 1150],
    [800, 1500],
    [700, 1900],
    [900, 2250],
  ],
  obstacles: [
    { type: 'pillar', at: 0.0775, offset: 0, r: 17 },
    { type: 'pillar', at: 0.455, offset: 0, r: 16 },
    { type: 'pillar', at: 0.7425, offset: 0, r: 16 },
  ],
  zones: [
    { type: 'boost', at: 0.12, length: 100, offset: 0, width: 70 },
    { type: 'slick', at: 0.6, length: 200 },
    { type: 'boost', at: 0.9, length: 100, offset: 0, width: 70 },
  ],
};
