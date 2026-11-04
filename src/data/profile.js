// Profil du joueur : avatars, couleurs, titres et succès.
// Tout est réglable ici (aucune logique d'affichage).

import { t, fmtNum, many } from '../i18n/index.js';

// ---------- Avatars (emblèmes au trait, 32×32) ----------
export const AVATARS = [
  { id: 'bolt', name: t('Éclair'), path: '<path d="M18 3L7 18h8l-2 11 12-16h-8z"/>' },
  { id: 'star', name: t('Étoile'), path: '<path d="M16 4l3.5 7.2 7.9 1.1-5.7 5.6 1.4 7.9L16 22l-7.1 3.8 1.4-7.9-5.7-5.6 7.9-1.1z"/>' },
  { id: 'flame', name: t('Flamme'), path: '<path d="M16 29c-5.5 0-9-3.8-9-8.6 0-5 4.2-7.4 5.2-12.4 3 2 4.3 4.6 4.3 7 1.2-1.1 2.2-3 2.2-5.2 4 3 6.3 6.8 6.3 10.6 0 4.8-3.5 8.6-9 8.6z"/><path d="M16 26c-2.2 0-3.6-1.5-3.6-3.4 0-2 1.6-3 2.1-5 1.2.8 1.7 1.8 1.7 2.8.5-.4.9-1.2.9-2.1 1.6 1.2 2.5 2.7 2.5 4.3 0 1.9-1.4 3.4-3.6 3.4z"/>' },
  { id: 'crown', name: t('Couronne'), path: '<path d="M5 23L4 10l7 6 5-9 5 9 7-6-1 13z"/><path d="M5 27h22"/>' },
  { id: 'diamond', name: t('Diamant'), path: '<path d="M9 6h14l5 6-12 15L4 12z"/><path d="M4 12h24M12 6l4 6 4-6M16 27l-4-15M16 27l4-15"/>' },
  { id: 'wheel', name: t('Jante'), path: '<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="3.5"/><path d="M16 4.5v8M16 19.5v8M4.5 16h8M19.5 16h8M8 8l5.5 5.5M18.5 18.5L24 24M8 24l5.5-5.5M18.5 13.5L24 8"/>' },
  { id: 'helmet', name: t('Casque'), path: '<path d="M5 22a11 11 0 0 1 22-2v5H9.5A4.5 4.5 0 0 1 5 22z"/><path d="M27 15H16.5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2H27"/>' },
  { id: 'eye', name: t('Œil'), path: '<path d="M3 16s5-8.5 13-8.5S29 16 29 16s-5 8.5-13 8.5S3 16 3 16z"/><circle cx="16" cy="16" r="4.5"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/>' },
  { id: 'wing', name: t('Aile'), path: '<path d="M4 22c6 0 10-3 13-9 2-4 5-7 11-8-1 5-3 8-6 10 2 0 4-1 5-2-1 4-4 6-8 7 1 .5 3 .5 4 0-3 3-7 4-12 4-3 0-5-.5-7-2z"/>' },
  { id: 'skull', name: t('Crâne'), path: '<path d="M7 15a9 9 0 0 1 18 0v4l-2 2v4h-3v-2h-2v2h-4v-2h-2v2H9v-4l-2-2z"/><circle cx="12.5" cy="15.5" r="2.3"/><circle cx="19.5" cy="15.5" r="2.3"/><path d="M16 19l-1 2h2z"/>' },
  { id: 'wave', name: t('Vague'), path: '<path d="M3 20c3-3 5.5-3 8 0s5 3 8 0 5.5-3 8 0"/><path d="M3 14c3-3 5.5-3 8 0s5 3 8 0 5.5-3 8 0"/><path d="M3 26c3-3 5.5-3 8 0s5 3 8 0 5.5-3 8 0" opacity=".5"/>' },
  { id: 'rocket', name: t('Fusée'), path: '<path d="M16 3c5 3 7 9 6 16H10C9 12 11 6 16 3z"/><circle cx="16" cy="12" r="2.5"/><path d="M10 19l-4 4 1 3 4-2M22 19l4 4-1 3-4-2M13 23l3 6 3-6"/>' },
  // Exclusifs du passe de saison (niveau indiqué)
  { id: 'comet', name: t('Comète'), exclusive: 'season', tier: 4, path: '<circle cx="21" cy="11" r="5"/><path d="M17.5 14.5L5 27M16 12l-9 6M19 16l-5 9"/><path d="M21 8.5v5M18.5 11h5" stroke-width="1.4"/>' },
  { id: 'planet', name: t('Planète'), exclusive: 'season', tier: 25, path: '<circle cx="16" cy="16" r="7.5"/><path d="M4 21c2 3 10 1 17-3.5S30.5 9 28 7c-1.5-1.2-4.5-.6-7.5.8"/><circle cx="25" cy="24" r="1.4" fill="currentColor"/><circle cx="7" cy="8" r="1" fill="currentColor"/>' },
  { id: 'phoenix', name: t('Phénix'), exclusive: 'season', tier: 55, path: '<path d="M16 28c-1-5 0-9 0-12"/><path d="M16 16C12 14 6 14 3 9c5 1 8 0 11 2-2-3-2-6 0-8 1 3 2 5 2 8 0-3 1-5 2-8 2 2 2 5 0 8 3-2 6-1 11-2-3 5-9 5-13 7z"/><path d="M13 27h6"/>' },
  { id: 'cup', name: t('Coupe d\'or'), exclusive: 'season', tier: 75, path: '<path d="M10 5h12v6a6 6 0 0 1-12 0z"/><path d="M10 7H6v2a4 4 0 0 0 4 4M22 7h4v2a4 4 0 0 1-4 4M16 17v4M11 27h10l-1-6h-8z"/><path d="M16 7.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-.9-1.8.9.3-2-1.4-1.4 2-.3z" fill="currentColor" stroke="none"/>' },
  // Exclusifs du mode Carrière
  { id: 'mask', name: t('Masque'), exclusive: 'career', unlock: t('Chapitre 3 de la carrière'), path: '<path d="M4 9c4-2 8-2 12 1 4-3 8-3 12-1 0 8-3 13-7 13-3 0-4-3-5-3s-2 3-5 3c-4 0-7-5-7-13z"/><path d="M8 13c1.5-1.2 3.5-1.2 5 0M19 13c1.5-1.2 3.5-1.2 5 0"/>' },
  { id: 'nemesis', name: t('Némésis'), exclusive: 'career', unlock: t('Chapitre 5 de la carrière'), path: '<path d="M6 5l5 6M26 5l-5 6"/><path d="M16 8c6 0 9 5 9 10 0 6-4 10-9 10s-9-4-9-10c0-5 3-10 9-10z"/><path d="M11 17l4 2M21 17l-4 2M13 24h6"/>' },
];
/** L'emblème est-il disponible pour ce joueur ? */
export const ownsAvatar = (save, id) => {
  const a = AVATARS.find((x) => x.id === id);
  return !!a && (!a.exclusive || save.profile.avatars.includes(id));
};

export const AVATAR_COLORS = ['#00f0ff', '#ff2bd6', '#8a2bff', '#3dff9e', '#ffd34d', '#ff8a3d', '#ff2b5a', '#e8e6ff'];

// ---------- Pseudo ----------
export const NAME_MIN = 3;
export const NAME_MAX = 14;
const NAME_A = ['NEON', 'VOLT', 'TURBO', 'NITRO', 'PIXEL', 'ASTRO', 'HYPER', 'LUNA', 'RAPTOR', 'FLASH', 'CYBER', 'SONIC', 'ORBIT', 'ZEPHYR', 'NOVA', 'BLAZE'];
const NAME_B = ['RIDER', 'FOX', 'STAR', 'WOLF', 'KID', 'RUSH', 'BLADE', 'JET', 'GHOST', 'LYNX', 'HAWK', 'SPARK', 'VIPER', 'BOLT'];
export function randomName(rng = Math.random) {
  const a = NAME_A[Math.floor(rng() * NAME_A.length)];
  const b = NAME_B[Math.floor(rng() * NAME_B.length)];
  return rng() < 0.4 ? `${a}${b}${Math.floor(rng() * 90 + 10)}` : `${a} ${b}`;
}

// ---------- Titres ----------
// Le titre de départ, puis un titre par succès terminé (palier 3).
export const DEFAULT_TITLE = 'Débutant';

// ---------- Succès ----------
// Chaque succès a 3 paliers. `value(save)` mesure la progression.
// Récompense : des crédits à chaque palier, et un titre au dernier.
export const ACHIEVEMENT_REWARDS = [100, 250, 600];

const sum = (o) => Object.values(o ?? {}).reduce((a, b) => a + b, 0);
const km = (u) => Math.floor(u * 0.32 / 3600); // 1 u/s = 0,32 km/h (comme le compteur)

export const ACHIEVEMENTS = [
  { id: 'races', name: t('PILOTE'), tiers: [10, 50, 200], text: (n) => t('Termine {n} courses', { n }), title: 'Increvable', value: (s) => s.career.races },
  { id: 'wins', name: t('VAINQUEUR'), tiers: [5, 25, 100], text: (n) => t('Gagne {n} courses', { n }), title: 'Imbattable', value: (s) => s.career.wins },
  { id: 'podiums', name: t('PODIUM'), tiers: [10, 50, 150], text: (n) => t('Monte {n} fois sur le podium', { n }), title: 'Toujours devant', value: (s) => s.career.podiums },
  { id: 'league', name: t('ASCENSION'), tiers: [100, 500, 800], text: (n) => t('Atteins la ligue {l}', { l: n >= 800 ? t('ÉLITE') : n >= 500 ? t('DIAMANT') : t('ARGENT') }), title: 'Légende', value: (s) => Math.max(s.trophies, s.career.maxTrophies), unit: t('trophées') },
  { id: 'cars', name: t('COLLECTIONNEUR'), tiers: [3, 5, 8], text: (n) => t('Possède {n} voitures', { n }), title: 'Collectionneur', value: (s) => s.garage.owned.length },
  { id: 'upgrades', name: t('MÉCANICIEN'), tiers: [3, 10, 25], text: (n) => t('Fais {n} améliorations de voiture', { n }), title: 'Mécano de génie', value: (s) => Object.values(s.cars.levels).reduce((a, l) => a + Math.max(0, l - 1), 0) },
  { id: 'rivals', name: t('CHASSEUR'), tiers: [1, 3, 5], text: (n) => (many(n) ? t('Bats {n} rivaux différents', { n }) : t('Bats {n} rival', { n })), title: 'Chasseur de rivaux', value: (s) => Object.keys(s.rivalsBeaten).length },
  { id: 'cups', name: t('GRAND PRIX'), tiers: [1, 5, 15], text: (n) => (many(n) ? t('Gagne {n} coupes', { n }) : t('Gagne {n} coupe', { n })), title: 'Roi de la coupe', value: (s) => sum(s.cupStats.won) },
  { id: 'elim', name: t('SURVIVANT'), tiers: [1, 5, 20], text: (n) => (many(n) ? t('Gagne {n} éliminations', { n }) : t('Gagne {n} élimination', { n })), title: 'Dernier debout', value: (s) => s.career.elimWins },
  { id: 'medals', name: t('CHRONOMÈTRE'), tiers: [5, 15, 28], text: (n) => t('Gagne {n} médailles en chrono', { n }), title: 'Horloger', value: (s) => Object.values(s.timeTrial.medals).reduce((a, m) => a + m.length, 0) },
  { id: 'tracks', name: t('GLOBE-TROTTEUR'), tiers: [3, 5, 7], text: (n) => t('Cours sur {n} circuits différents', { n }), title: 'Globe-trotteur', value: (s) => tracksDriven(s).size },
  { id: 'distance', name: t('KILOMÈTRES'), tiers: [50, 250, 1000], text: (n) => t('Parcours {n} km', { n }), title: 'Grand voyageur', value: (s) => km(s.career.distance), unit: 'km' },
  { id: 'credits', name: t('FORTUNE'), tiers: [2000, 10000, 50000], text: (n) => t('Gagne {n} crédits au total', { n: fmtNum(n) }), title: 'Magnat', value: (s) => s.career.creditsEarned },
  { id: 'style', name: t('STYLISTE'), tiers: [2, 6, 12], text: (n) => t('Possède {n} cosmétiques (finitions, motifs, effets)', { n }), title: 'Icône de style', value: (s) => s.cosmetics.finishes.length + s.cosmetics.motifs.length + (s.cosmetics.trails?.length ?? 0) + (s.cosmetics.smokes?.length ?? 0) },
  { id: 'missions', name: t('ASSIDU'), tiers: [5, 25, 100], text: (n) => t('Accomplis {n} missions', { n }), title: 'Assidu', value: (s) => s.career.missionsDone },
];

/** Circuits sur lesquels le joueur a roulé (courses, records, chrono). */
export function tracksDriven(s) {
  return new Set([...Object.keys(s.career.trackRaces), ...Object.keys(s.bestLaps), ...Object.keys(s.timeTrial.best)]);
}

export const kmOf = km;
