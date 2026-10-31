// Coupe : 3 courses, mêmes adversaires, classement aux points (réglable ici).

export const CUP_RACES = 3;
export const CUP_POINTS = [10, 7, 5, 3, 2, 1];

// Récompenses de fin de coupe selon la place finale (avant multiplicateur de ligue).
// Pas de trophées course par course : seulement ceux-ci à la fin.
export const CUP_REWARDS = [
  { trophies: 20, credits: 300, pack: 'medium' },
  { trophies: 14, credits: 200, pack: 'small' },
  { trophies: 10, credits: 130, pack: 'small' },
  { trophies: 6, credits: 80 },
  { trophies: 3, credits: 50 },
  { trophies: 0, credits: 30 },
];

// Les coupes des ligues supérieures rapportent plus de crédits
export const CUP_LEAGUE_MUL = { bronze: 1, argent: 1.2, or: 1.4, diamant: 1.6, elite: 2 };
