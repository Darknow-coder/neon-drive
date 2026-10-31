// Pilotes IA : personnalités et niveau selon la ligue.
//
// RÈGLE D'ÉQUITÉ (non négociable) :
//   Tous ces réglages sont fixés AVANT la course et ne changent JAMAIS
//   pendant. Aucun bonus de vitesse si une IA est en retard, aucun
//   ralentissement si elle est devant. Une IA n'a pas accès à la physique :
//   elle appuie sur les mêmes « boutons » que le joueur.
//
// Signification des réglages de personnalité :
//   gripUse      part de l'adhérence exploitée en virage (1 = à la limite)
//   brakeUse     part de la puissance de freinage exploitée pour planifier
//   driftUse     aptitude à drifter dans les virages serrés (0 = jamais)
//   lineFocus    précision de la trajectoire (1 = parfaite)
//   aggression   envie de dépasser / accepte le contact (0 … 1)
//   caution      distance de sécurité / évite les contacts (0 … 1)
//   mistakeRate  erreurs de pilotage par minute (en moyenne)
//   boostStraight utilise le boost uniquement en ligne droite (sinon dès que possible)
//   reaction     temps de réaction (s) pour anticiper les freinages

export const AI_PROFILES = {
  aggressive: {
    label: 'Agressif',
    gripUse: 0.93, brakeUse: 0.78, driftUse: 0.95, lineFocus: 0.85,
    aggression: 0.95, caution: 0.15, mistakeRate: 1.6, boostStraight: false, reaction: 0.12,
  },
  cautious: {
    label: 'Prudent',
    gripUse: 0.88, brakeUse: 0.7, driftUse: 0.6, lineFocus: 0.95,
    aggression: 0.25, caution: 0.95, mistakeRate: 0.6, boostStraight: true, reaction: 0.18,
  },
  cornering: {
    label: 'Spécialiste des virages',
    gripUse: 0.96, brakeUse: 0.8, driftUse: 1.0, lineFocus: 0.97,
    aggression: 0.5, caution: 0.5, mistakeRate: 0.9, boostStraight: false, reaction: 0.1,
  },
  speed: {
    label: 'Spécialiste de la vitesse',
    gripUse: 0.88, brakeUse: 0.76, driftUse: 0.7, lineFocus: 0.9,
    aggression: 0.6, caution: 0.4, mistakeRate: 1.0, boostStraight: true, reaction: 0.13,
  },
  balanced: {
    label: 'Polyvalent',
    gripUse: 0.92, brakeUse: 0.76, driftUse: 0.85, lineFocus: 0.92,
    aggression: 0.55, caution: 0.55, mistakeRate: 1.0, boostStraight: false, reaction: 0.13,
  },
};

// Pilotes de l'écurie adverse. Chaque pilote a sa voiture de prédilection,
// choisie pour coller à son style, et sa propre livrée.
export const AI_DRIVERS = [
  { id: 'kaida', name: 'KAIDA', profile: 'aggressive', car: 'titan',
    colors: { body: '#ff3b5c', accent: '#ffe14d', glow: '#ff3b5c' } },
  { id: 'orin', name: 'ORIN', profile: 'cautious', car: 'volt',
    colors: { body: '#dfe3ff', accent: '#2b6bff', glow: '#8fb0ff' } },
  { id: 'sela', name: 'SELA', profile: 'cornering', car: 'halo',
    colors: { body: '#c08bff', accent: '#ff2bd6', glow: '#b07aff' } },
  { id: 'vex', name: 'VEX', profile: 'speed', car: 'razor',
    colors: { body: '#ffb000', accent: '#ff2bd6', glow: '#ffb000' } },
  { id: 'juno', name: 'JUNO', profile: 'balanced', car: 'nova',
    colors: { body: '#3dff9e', accent: '#00f0ff', glow: '#3dff9e' } },
];

// Niveau général des adversaires selon la ligue du joueur.
// Multiplie la part des capacités exploitée et le taux d'erreurs.
// (Fixé au moment de lancer la course.)
export const LEAGUE_SKILL = {
  bronze:  { pace: 0.93, mistakes: 1.5 },
  argent:  { pace: 0.96, mistakes: 1.2 },
  or:      { pace: 0.98, mistakes: 1.0 },
  diamant: { pace: 1.0, mistakes: 0.8 },
  elite:   { pace: 1.02, mistakes: 0.6 },
};
