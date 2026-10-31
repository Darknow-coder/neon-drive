// Catalogue des voitures.
// Chaque voiture est décrite par 5 notes de 1 à 10 (affichées dans le garage).
// Ces notes sont converties en paramètres physiques par `statsToParams`
// (voir physics/carPhysics.js). Règle d'équilibrage : le total des notes
// reste proche de 30 pour qu'aucune voiture ne domine partout.

export const CARS = [
  {
    id: 'nova',
    name: 'NOVA',
    tagline: 'Équilibrée, idéale pour débuter',
    stats: { speed: 6, accel: 6, handling: 6, drift: 6, toughness: 6 },
    shape: 'sleek',
    colors: { body: '#00f0ff', accent: '#ff2bd6', glow: '#00f0ff' },
  },
  {
    id: 'razor',
    name: 'RAZOR',
    tagline: 'Très rapide, exigeante en virage',
    stats: { speed: 9, accel: 6, handling: 4, drift: 5, toughness: 6 },
    shape: 'wedge',
    colors: { body: '#ff2bd6', accent: '#ffe14d', glow: '#ff2bd6' },
  },
  {
    id: 'halo',
    name: 'HALO',
    tagline: 'Maniabilité exceptionnelle',
    stats: { speed: 5, accel: 6, handling: 9, drift: 5, toughness: 5 },
    shape: 'round',
    colors: { body: '#8a2bff', accent: '#00f0ff', glow: '#a45bff' },
  },
  {
    id: 'volt',
    name: 'VOLT',
    tagline: 'Accélération foudroyante',
    stats: { speed: 5, accel: 9, handling: 6, drift: 6, toughness: 4 },
    shape: 'sleek',
    colors: { body: '#2b6bff', accent: '#00f0ff', glow: '#4d8bff' },
  },
  {
    id: 'titan',
    name: 'TITAN',
    tagline: 'Lourde et robuste au contact',
    stats: { speed: 7, accel: 4, handling: 6, drift: 4, toughness: 9 },
    shape: 'heavy',
    colors: { body: '#36f5a6', accent: '#8a2bff', glow: '#36f5a6' },
  },
];

export const getCar = (id) => CARS.find((c) => c.id === id) ?? CARS[0];
