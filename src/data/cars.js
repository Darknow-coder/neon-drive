// Catalogue des voitures.
// Chaque voiture est décrite par 5 notes de 1 à 10 (affichées dans le garage).
// Ces notes sont converties en paramètres physiques par `statsToParams`
// (voir physics/carPhysics.js). Règle d'équilibrage : le total des notes
// reste proche de 30 pour qu'aucune voiture ne domine partout.
//
// APPARENCE : `shape` (silhouette) + `design` (cockpit, roues, décoration,
// aileron, phares, détails) — voir render/carSprite.js.
//
// DÉBLOCAGE (`unlock`) — comment le joueur obtient la voiture :
//   { type: 'start' }                    possédée dès le début
//   { type: 'trophies', min: 100 }       palier de trophées
// Prévu pour plus tard (même format, sans changer le reste du code) :
//   { type: 'shop', price: … }           boutique
//   { type: 'fragments', count: … }      fragments
//   { type: 'event', id: … }             événement / saison
// Les adversaires IA peuvent utiliser toutes les voitures, débloquées ou non.

export const CARS = [
  {
    id: 'nova',
    name: 'NOVA',
    tagline: 'Équilibrée, idéale pour débuter',
    stats: { speed: 6, accel: 6, handling: 6, drift: 6, toughness: 6 },
    shape: 'sleek',
    design: { cockpit: 'bubble', wheels: 'covered', livery: 'twin', spoiler: 'bar', lights: 'dual', extras: ['intakes'] },
    colors: { body: '#00f0ff', accent: '#ff2bd6', glow: '#00f0ff' },
    unlock: { type: 'start' },
  },
  {
    id: 'volt',
    name: 'VOLT',
    tagline: 'Accélération foudroyante',
    stats: { speed: 5, accel: 9, handling: 6, drift: 6, toughness: 4 },
    shape: 'sleek',
    design: { lm: 0.9, wm: 1.05, cockpit: 'front', wheels: 'pods', livery: 'bolt', spoiler: 'split', lights: 'bar', extras: ['exhaust'] },
    colors: { body: '#2b6bff', accent: '#00f0ff', glow: '#4d8bff' },
    unlock: { type: 'trophies', min: 30 },
  },
  {
    id: 'halo',
    name: 'HALO',
    tagline: 'Maniabilité exceptionnelle',
    stats: { speed: 5, accel: 6, handling: 9, drift: 5, toughness: 5 },
    shape: 'round',
    design: { lm: 0.95, wm: 1.02, cockpit: 'big', livery: 'side', spoiler: 'none', lights: 'quad', extras: ['ring', 'fins'] },
    colors: { body: '#8a2bff', accent: '#00f0ff', glow: '#a45bff' },
    unlock: { type: 'trophies', min: 70 },
  },
  {
    id: 'razor',
    name: 'RAZOR',
    tagline: 'Très rapide, exigeante en virage',
    stats: { speed: 9, accel: 6, handling: 4, drift: 5, toughness: 6 },
    shape: 'wedge',
    design: { lm: 1.08, wm: 0.92, cockpit: 'slit', livery: 'single', spoiler: 'wide', lights: 'bar', extras: ['blades'] },
    colors: { body: '#ff2bd6', accent: '#ffe14d', glow: '#ff2bd6' },
    unlock: { type: 'trophies', min: 100 },
  },
  {
    id: 'titan',
    name: 'TITAN',
    tagline: 'Lourde et robuste au contact',
    stats: { speed: 7, accel: 4, handling: 6, drift: 4, toughness: 9 },
    shape: 'heavy',
    design: { lm: 1.02, wm: 1.08, cockpit: 'rear', livery: 'side', spoiler: 'none', lights: 'quad', extras: ['armor', 'bullbar', 'exhaust'] },
    colors: { body: '#36f5a6', accent: '#8a2bff', glow: '#36f5a6' },
    unlock: { type: 'trophies', min: 175 },
  },
  {
    id: 'spectre',
    name: 'SPECTRE',
    tagline: 'La reine du drift',
    stats: { speed: 5, accel: 6, handling: 7, drift: 9, toughness: 3 },
    shape: 'blade',
    design: { lm: 1.08, wm: 0.9, cockpit: 'slit', wheels: 'pods', livery: 'split', spoiler: 'split', lights: 'dual', extras: ['fins'] },
    colors: { body: '#c08bff', accent: '#3dff9e', glow: '#b07aff' },
    unlock: { type: 'trophies', min: 250 },
  },
  {
    id: 'comet',
    name: 'COMET',
    tagline: 'Fusée en ligne droite',
    stats: { speed: 8, accel: 7, handling: 4, drift: 5, toughness: 6 },
    shape: 'formula',
    design: { lm: 1.1, wm: 0.95, cockpit: 'open', wheels: 'exposed', livery: 'single', spoiler: 'wide', lights: 'dual', extras: ['frontwing', 'exhaust'] },
    colors: { body: '#ffb000', accent: '#ff2bd6', glow: '#ffb000' },
    unlock: { type: 'trophies', min: 400 },
  },
  {
    id: 'bastion',
    name: 'BASTION',
    tagline: 'Blindée et précise',
    stats: { speed: 6, accel: 5, handling: 7, drift: 3, toughness: 9 },
    shape: 'tank',
    design: { cockpit: 'front', livery: 'chevron', spoiler: 'bar', lights: 'bar', extras: ['armor', 'skirts'] },
    colors: { body: '#dfe3ff', accent: '#ff3b5c', glow: '#ff6b8a' },
    unlock: { type: 'trophies', min: 600 },
  },
];

export const getCar = (id) => CARS.find((c) => c.id === id) ?? CARS[0];

// Couleurs proposées dans le garage (carrosserie et accent).
export const PAINT_COLORS = [
  '#00f0ff', '#2b6bff', '#8a2bff', '#c08bff', '#ff2bd6', '#ff3b5c',
  '#ffb000', '#ffe14d', '#3dff9e', '#36f5a6', '#dfe3ff', '#3a3f5c',
];

// Libellés des caractéristiques (garage)
export const STAT_LABELS = {
  speed: 'Vitesse max',
  accel: 'Accélération',
  handling: 'Maniabilité',
  drift: 'Drift',
  toughness: 'Robustesse',
};
