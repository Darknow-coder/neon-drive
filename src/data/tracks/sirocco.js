// Circuit — SIROCCO (ligue Or)
// Profil : très rapide, dans le désert. De longues lignes droites balayées
// par des rafales de sable : elles sont annoncées, et poussent tout le monde.

export default {
  id: 'sirocco',
  name: 'SIROCCO',
  profile: 'Rapide · Tempête de sable',
  league: 'or',
  laps: 2,
  scale: 1.6,
  width: 250,
  weather: 'sand',
  theme: { style: 'desert', left: '#ffb000', right: '#ff5c2b', kerb: '#ffb000' },
  points: [[1500, 2630], [2600, 2650], [3800, 2500], [4100, 1800], [3600, 1300], [2600, 1450], [1900, 1100], [2300, 500], [3300, 450], [3800, 250], [3600, -150], [2200, -250], [700, -100], [300, 700], [650, 1400], [300, 2000], [500, 2600]],
  obstacles: [],
  zones: [
    { type: 'boost', at: 0.04, length: 110, offset: -60, width: 70 },
    { type: 'boost', at: 0.4, length: 110, offset: 0, width: 80 },
    { type: 'boost', at: 0.75, length: 110, offset: 60, width: 70 },
  ],
};
