// Passe de saison (gratuit). Saison 1, provisoirement sans date de fin.
// Tout est réglable ici : XP gagnée, coût des niveaux, récompenses.

import { t } from '../i18n/index.js';
export const SEASON = {
  id: 's1',
  number: 1,
  name: t('NÉON ORIGINES'),
  tiers: 100,
  color: '#7af7ff',
  accent: '#ff2bd6',
};

// ---------- Coût des niveaux ----------
// XP nécessaire pour passer du niveau n-1 au niveau n (de plus en plus long).
export const tierCost = (n) => 250 + 10 * n;
// Au-delà du niveau 100 : un coffre bonus toutes les BONUS_XP
export const BONUS_XP = 2500;
export const BONUS_REWARDS = [{ credits: 300 }, { pack: 'small', credits: 100 }, { credits: 300 }, { pack: 'medium' }];

// ---------- XP gagnée ----------
export const XP = {
  // Courses à 6 (classée, élimination, coupe) selon la place
  race: [100, 80, 65, 55, 45, 40],
  // GIGA RUSH (20 voitures) : de 120 (1re) à 40 (20e)
  event: (pos, n) => Math.round(40 + 80 * (1 - (pos - 1) / Math.max(1, n - 1))),
  // Classement final d'une coupe (en plus des courses)
  cupFinal: [200, 150, 100, 60, 40, 30],
  // Chrono : tour valide, médaille (plafond par jour pour les tours)
  ttLap: 15, ttLapDailyCap: 300, ttMedal: 100,
  // Missions et succès
  missionDaily: 80, missionWeekly: 300, missionBonus: 100, achievement: 50,
  // Bonus du jour : XP doublée sur les premières courses
  dailyDoubleRaces: 3,
};

// ---------- Objets exclusifs de la saison ----------
// (finitions et motifs : data/shop.js avec `exclusive: 'season'` ; emblèmes : data/profile.js)
export const SEASON_TITLES = {
  10: 'Recrue de saison',
  30: 'Pilote confirmé',
  50: 'Vétéran néon',
  75: 'Élite de la saison',
  100: 'Légende de la Saison 1',
};

// ---------- Récompenses des 100 niveaux ----------
// Niveaux spéciaux écrits à la main ; les autres sont calculés (crédits,
// fragments, packs) pour que chaque niveau rapporte quelque chose.
const SPECIAL = {
  4: { avatar: 'comet' },
  10: { title: SEASON_TITLES[10], credits: 500 },
  12: { motif: 'stars' },
  15: { pack: 'medium' },
  20: { finish: 'aurora' },
  25: { avatar: 'planet' },
  30: { title: SEASON_TITLES[30], pack: 'large' },
  35: { motif: 'hex' },
  40: { finish: 'obsidian' },
  45: { pack: 'large' },
  50: { motif: 'tiger', title: SEASON_TITLES[50] },
  55: { avatar: 'phoenix' },
  60: { finish: 'galaxy' },
  65: { pack: 'large' },
  70: { motif: 'wings' },
  75: { avatar: 'cup', title: SEASON_TITLES[75] },
  80: { pack: 'large', credits: 1000 },
  85: { fragments: 60 },
  90: { credits: 2000 },
  95: { pack: 'large', credits: 500 },
  100: { car: 'aurora', title: SEASON_TITLES[100] },
};

function defaultReward(n) {
  if (n % 5 === 0) return { pack: n < 30 ? 'small' : n < 60 ? 'medium' : 'large' };
  if (n % 3 === 0) return { fragments: 10 + Math.floor(n / 10) * 3 };
  return { credits: 100 + Math.round(n * 2.5 / 10) * 10 };
}

export const TIER_REWARDS = Array.from({ length: SEASON.tiers }, (_, k) => {
  const n = k + 1;
  return { tier: n, reward: SPECIAL[n] ?? defaultReward(n), special: !!SPECIAL[n] };
});
