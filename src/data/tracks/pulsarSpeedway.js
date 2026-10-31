// Circuit 02 — PULSAR SPEEDWAY
// Profil : rapide. Deux très longues lignes droites, de grandes courbes
// à haute vitesse et une épingle à gauche qui récompense le drift.
// Une plaque de boost sur la ligne opposée.

export default {
  id: 'pulsar-speedway',
  name: 'PULSAR SPEEDWAY',
  profile: 'Rapide',
  league: 'bronze',
  scale: 1.6,
  width: 270,
  theme: { left: '#2b6bff', right: '#00f0ff', kerb: '#2b6bff', ground: '#050620', asphalt: '#121433' },
  points: [
    [1000, 2400],
    [2600, 2400],
    [3600, 2380],
    [4150, 2330],
    // Épingle en bout de ligne droite : gros freinage (ou drift), idéal pour dépasser
    [4390, 2170],
    [4410, 1960],
    [4230, 1830],
    [3950, 1720],
    [3620, 1430],
    [3300, 1100],
    [2600, 900],
    [1900, 1000],
    [1300, 800],
    [700, 550],
    [350, 850],
    [400, 1500],
    [550, 2050],
  ],
  zones: [
    { type: 'boost', at: 0.555, length: 110, offset: 0, width: 90 },
  ],
};
