// Économie du jeu : crédits, fragments, packs, améliorations, route des trophées.
// Tous les montants sont réglables ici (équilibrage).

// ---------- Crédits gagnés en course ----------
export const CREDITS = {
  position: [60, 45, 35, 25, 15, 10],  // selon la place (1re → 6e)
  perDriftSecond: 1, maxDrift: 20,     // bonus de drift
  perOvertake: 5, maxOvertakes: 25,    // bonus de dépassements
  clean: 15,                           // course sans choc contre un mur
  rival: 20,                           // rival battu
  trainingFactor: 0,                   // l'entraînement ne rapporte rien
};

// ---------- Améliorations des voitures ----------
export const MAX_LEVEL = 5;
// Coût pour PASSER au niveau indiqué (index = niveau visé)
export const UPGRADE_COST = {
  2: { credits: 150, fragments: 10 },
  3: { credits: 350, fragments: 20 },
  4: { credits: 700, fragments: 40 },
  5: { credits: 1200, fragments: 70 },
};
// Effet de chaque niveau au-delà du 1er (en pourcentage des paramètres physiques)
export const LEVEL_BONUS = { maxSpeed: 0.012, accel: 0.02, grip: 0.015, turn: 0.012, brake: 0.015 };
// Niveau des voitures adverses selon la ligue (fixé avant la course)
export const AI_CAR_LEVEL = { bronze: 1, argent: 2, or: 3, diamant: 4, elite: 5 };

// ---------- Fragments et packs ----------
// Fragments nécessaires pour débloquer une voiture AVANT son palier de trophées
export const UNLOCK_FRAGMENTS = { volt: 20, pixie: 25, halo: 30, razor: 40, titan: 50, spectre: 60, ionix: 70, comet: 80, goliath: 90, bastion: 100, hyperion: 120 };
export const PACKS = {
  small: { name: 'PACK NÉON', fragments: 6, price: 120, color: '#00f0ff' },
  medium: { name: 'PACK PLASMA', fragments: 15, price: 280, color: '#ff2bd6' },
  large: { name: 'PACK HYPERNOVA', fragments: 35, price: 600, color: '#ffd34d' },
};

// ---------- Route des trophées ----------
// Une récompense par palier. Les voitures listées ici sont celles débloquées
// par leur palier (voir unlock dans cars.js) : la route les présente.
export const TROPHY_ROAD = [
  { at: 10, reward: { credits: 100 } },
  { at: 20, reward: { pack: 'small' } },
  { at: 30, reward: { car: 'volt' } },
  { at: 45, reward: { credits: 150 } },
  { at: 50, reward: { car: 'pixie' } },
  { at: 60, reward: { pack: 'small' } },
  { at: 70, reward: { car: 'halo' } },
  { at: 85, reward: { credits: 200 } },
  { at: 100, reward: { car: 'razor', pack: 'medium' } },
  { at: 125, reward: { credits: 250 } },
  { at: 150, reward: { pack: 'medium' } },
  { at: 175, reward: { car: 'titan' } },
  { at: 200, reward: { credits: 300 } },
  { at: 225, reward: { pack: 'medium' } },
  { at: 250, reward: { car: 'spectre', credits: 200 } },
  { at: 300, reward: { credits: 400 } },
  { at: 325, reward: { car: 'ionix' } },
  { at: 350, reward: { pack: 'large' } },
  { at: 400, reward: { car: 'comet' } },
  { at: 450, reward: { credits: 500 } },
  { at: 475, reward: { car: 'goliath' } },
  { at: 500, reward: { pack: 'large' } },
  { at: 600, reward: { car: 'bastion', credits: 400 } },
  { at: 700, reward: { pack: 'large' } },
  { at: 750, reward: { car: 'hyperion' } },
  { at: 800, reward: { credits: 1000, pack: 'large' } },
  { at: 900, reward: { pack: 'large' } },
  { at: 1000, reward: { credits: 1500, pack: 'large' } },
];
