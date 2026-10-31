// Circuit 03 — VORTEX CITY
// Profil : technique. Piste plus étroite, épingles, chicanes, piliers au
// milieu de la piste et une zone glissante (« glitch ») dans un virage.
// Les plaques de boost récompensent la bonne trajectoire.

export default {
  id: 'vortex-city',
  name: 'VORTEX CITY',
  profile: 'Technique',
  league: 'argent',
  scale: 1.55,
  width: 220,
  theme: { left: '#a45bff', right: '#ff2bd6', kerb: '#ffe14d', ground: '#0a0420', asphalt: '#17102e' },
  points: [
    [1200, 2300],
    [2000, 2300],
    [2500, 2200],
    [2650, 1800],
    [2540, 1530],
    [2700, 1240],
    [3100, 1100],
    [3300, 700],
    [3000, 350],
    [2500, 450],
    [2200, 800],
    [1800, 1000],
    [1500, 700],
    [1200, 400],
    [750, 450],
    [550, 850],
    [900, 1200],
    [800, 1600],
    [450, 1850],
    [550, 2250],
    [850, 2350],
  ],
  obstacles: [
    // Deux piliers sur la ligne droite de départ : il faut choisir son côté
    { type: 'pillar', at: 0.045, offset: 0, r: 26 },
    // Pilier à l'entrée de l'épingle du haut
    { type: 'pillar', at: 0.36, offset: -15, r: 24 },
    { type: 'pillar', at: 0.6, offset: 15, r: 24 },
  ],
  zones: [
    { type: 'boost', at: 0.012, length: 100, offset: 55, width: 70 },
    { type: 'boost', at: 0.25, length: 100, offset: 0, width: 70 },
    { type: 'slick', at: 0.71, length: 260 },
  ],
};
