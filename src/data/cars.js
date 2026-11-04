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
//   { type: 'pass', tier: 100 }          niveau du passe de saison (exclusive)
// Prévu pour plus tard (même format, sans changer le reste du code) :
//   { type: 'shop', price: … }           boutique
//   { type: 'fragments', count: … }      fragments
//   { type: 'event', id: … }             événement / saison
// Les adversaires IA peuvent utiliser toutes les voitures, débloquées ou non.

import { t } from '../i18n/index.js';
export const CARS = [
  {
    id: 'nova',
    name: 'NOVA',
    tagline: t('Équilibrée, idéale pour débuter'),
    stats: { speed: 6, accel: 6, handling: 6, drift: 6, toughness: 6 },
    shape: 'sleek',
    design: { cockpit: 'bubble', wheels: 'covered', livery: 'twin', spoiler: 'bar', lights: 'dual', extras: ['intakes'] },
    colors: { body: '#00f0ff', accent: '#ff2bd6', glow: '#00f0ff' },
    unlock: { type: 'start' },
  },
  {
    id: 'volt',
    name: 'VOLT',
    tagline: t('Accélération foudroyante'),
    stats: { speed: 5, accel: 9, handling: 6, drift: 6, toughness: 4 },
    shape: 'sleek',
    design: { lm: 0.9, wm: 1.05, cockpit: 'front', wheels: 'pods', livery: 'bolt', spoiler: 'split', lights: 'bar', extras: ['exhaust'] },
    colors: { body: '#2b6bff', accent: '#00f0ff', glow: '#4d8bff' },
    unlock: { type: 'trophies', min: 30 },
  },
  {
    id: 'halo',
    name: 'HALO',
    tagline: t('Maniabilité exceptionnelle'),
    stats: { speed: 5, accel: 6, handling: 9, drift: 5, toughness: 5 },
    shape: 'round',
    design: { lm: 0.95, wm: 1.02, cockpit: 'big', livery: 'side', spoiler: 'none', lights: 'quad', extras: ['ring', 'fins'] },
    colors: { body: '#8a2bff', accent: '#00f0ff', glow: '#a45bff' },
    unlock: { type: 'trophies', min: 70 },
  },
  {
    id: 'razor',
    name: 'RAZOR',
    tagline: t('Très rapide, exigeante en virage'),
    stats: { speed: 9, accel: 6, handling: 4, drift: 5, toughness: 6 },
    shape: 'wedge',
    design: { lm: 1.08, wm: 0.92, cockpit: 'slit', livery: 'single', spoiler: 'wide', lights: 'bar', extras: ['blades'] },
    colors: { body: '#ff2bd6', accent: '#ffe14d', glow: '#ff2bd6' },
    unlock: { type: 'trophies', min: 100 },
  },
  {
    id: 'titan',
    name: 'TITAN',
    tagline: t('Lourde et robuste au contact'),
    stats: { speed: 7, accel: 4, handling: 6, drift: 4, toughness: 9 },
    shape: 'heavy',
    design: { lm: 1.02, wm: 1.08, cockpit: 'rear', livery: 'side', spoiler: 'none', lights: 'quad', extras: ['armor', 'bullbar', 'exhaust'] },
    colors: { body: '#36f5a6', accent: '#8a2bff', glow: '#36f5a6' },
    unlock: { type: 'trophies', min: 175 },
  },
  {
    id: 'spectre',
    name: 'SPECTRE',
    tagline: t('La reine du drift'),
    stats: { speed: 5, accel: 6, handling: 7, drift: 9, toughness: 3 },
    shape: 'blade',
    design: { lm: 1.08, wm: 0.9, cockpit: 'slit', wheels: 'pods', livery: 'split', spoiler: 'split', lights: 'dual', extras: ['fins'] },
    colors: { body: '#c08bff', accent: '#3dff9e', glow: '#b07aff' },
    unlock: { type: 'trophies', min: 250 },
  },
  {
    id: 'comet',
    name: 'COMET',
    tagline: t('Fusée en ligne droite'),
    stats: { speed: 8, accel: 7, handling: 4, drift: 5, toughness: 6 },
    shape: 'formula',
    design: { lm: 1.1, wm: 0.95, cockpit: 'open', wheels: 'exposed', livery: 'single', spoiler: 'wide', lights: 'dual', extras: ['frontwing', 'exhaust'] },
    colors: { body: '#ffb000', accent: '#ff2bd6', glow: '#ffb000' },
    unlock: { type: 'trophies', min: 400 },
  },
  {
    id: 'bastion',
    name: 'BASTION',
    tagline: t('Blindée et précise'),
    stats: { speed: 6, accel: 5, handling: 7, drift: 3, toughness: 9 },
    shape: 'tank',
    design: { cockpit: 'front', livery: 'chevron', spoiler: 'bar', lights: 'bar', extras: ['armor', 'skirts'] },
    colors: { body: '#dfe3ff', accent: '#ff3b5c', glow: '#ff6b8a' },
    unlock: { type: 'trophies', min: 600 },
  },
  // ---------- Voitures à capacité spéciale (trait) ----------
  {
    id: 'pixie',
    name: 'PIXIE',
    tagline: t('Mini à 3 roues, nerveuse et minuscule'),
    stats: { speed: 3, accel: 9, handling: 10, drift: 6, toughness: 2 },
    trait: 'agile',
    size: { length: 38, width: 20 },
    shape: 'mini',
    design: { lm: 0.8, wm: 0.84, cockpit: 'bubble', wheels: 'trike', livery: 'dots', spoiler: 'none', lights: 'dual', extras: ['antenna'] },
    colors: { body: '#ff7ad9', accent: '#3dff9e', glow: '#ff7ad9' },
    unlock: { type: 'trophies', min: 50 },
  },
  {
    id: 'ionix',
    name: 'IONIX',
    tagline: t('Électrique : son boost se recharge tout seul'),
    stats: { speed: 6, accel: 7, handling: 6, drift: 4, toughness: 5 },
    trait: 'regen',
    shape: 'pod',
    design: { lm: 1.0, wm: 0.98, cockpit: 'big', wheels: 'covered', livery: 'circuit', spoiler: 'none', lights: 'bar', extras: ['lightbar'] },
    colors: { body: '#e8f6ff', accent: '#00f0ff', glow: '#00f0ff' },
    unlock: { type: 'trophies', min: 325 },
  },
  {
    id: 'goliath',
    name: 'GOLIATH',
    tagline: t('Muscle car : écarte tout sur son passage'),
    stats: { speed: 9, accel: 4, handling: 4, drift: 4, toughness: 9 },
    trait: 'ram',
    size: { length: 51, width: 27 },
    shape: 'muscle',
    design: { lm: 1.12, wm: 1.1, cockpit: 'rear', wheels: 'covered', livery: 'single', spoiler: 'wide', lights: 'quad', extras: ['scoop', 'sidepipes'] },
    colors: { body: '#ff6a00', accent: '#141414', glow: '#ff8a3d' },
    unlock: { type: 'trophies', min: 475 },
  },
  {
    id: 'hyperion',
    name: 'HYPERION',
    tagline: t('Prototype en lévitation : ne craint pas les sols glissants'),
    stats: { speed: 8, accel: 5, handling: 6, drift: 5, toughness: 3 },
    trait: 'hover',
    shape: 'proto',
    design: { lm: 1.12, wm: 0.96, cockpit: 'slit', wheels: 'hover', livery: 'chevron', spoiler: 'none', lights: 'bar', extras: ['fins', 'thrusters'] },
    colors: { body: '#1b1340', accent: '#7af7ff', glow: '#b07aff' },
    unlock: { type: 'trophies', min: 750 },
  },
  {
    id: 'aurora',
    name: 'AURORA',
    tagline: t('Exclusive Saison 1 · rapide et vive'),
    stats: { speed: 7, accel: 7, handling: 6, drift: 5, toughness: 5 },
    shape: 'blade',
    design: { lm: 1.05, wm: 0.96, cockpit: 'bubble', wheels: 'covered', livery: 'stars', spoiler: 'wide', lights: 'quad', extras: ['fins', 'intakes'] },
    colors: { body: '#3dff9e', accent: '#8a2bff', glow: '#7af7ff', finish: 'aurora' },
    unlock: { type: 'pass', tier: 100 },
  },
];

// Capacités spéciales (même règle pour le joueur et les IA)
export const TRAITS = {
  agile: { name: t('AGILE'), desc: t('Toute petite : se faufile dans les trous et tourne sur place.') },
  regen: { name: t('RECHARGE'), desc: t('Le boost se recharge tout seul en roulant, et encore plus en freinant.') },
  ram: { name: t('BÉLIER'), desc: t('Très lourde : écarte les autres voitures et perd peu de vitesse contre les murs.') },
  hover: { name: t('LÉVITATION'), desc: t('Flotte au-dessus du sol : glisse beaucoup moins sous la pluie, la neige et sur le verglas.') },
};

export const getCar = (id) => CARS.find((c) => c.id === id) ?? CARS[0];

// Couleurs proposées dans le garage (carrosserie et accent).
export const PAINT_COLORS = [
  '#00f0ff', '#2b6bff', '#8a2bff', '#c08bff', '#ff2bd6', '#ff3b5c',
  '#ffb000', '#ffe14d', '#3dff9e', '#36f5a6', '#dfe3ff', '#3a3f5c',
];

// Libellés des caractéristiques (garage)
export const STAT_LABELS = {
  speed: t('Vitesse max'),
  accel: t('Accélération'),
  handling: t('Maniabilité'),
  drift: t('Drift'),
  toughness: t('Robustesse'),
};
