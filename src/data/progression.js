// Réglages de la progression : à modifier librement pour l'équilibrage.

// Trophées gagnés selon la place d'arrivée (index 0 = 1re place).
// Aucun trophée n'est perdu dans cette version.
import { t } from '../i18n/index.js';
export const TROPHY_REWARDS = [10, 7, 5, 3, 1, 0];

// Ligues : seuil minimal de trophées (dans l'ordre croissant).
export const LEAGUES = [
  { id: 'bronze', name: 'BRONZE', min: 0, color: '#d4894a' },
  { id: 'argent', name: t('ARGENT'), min: 100, color: '#c9d2ea' },
  { id: 'or', name: t('OR'), min: 250, color: '#ffd34d' },
  { id: 'diamant', name: t('DIAMANT'), min: 500, color: '#7af7ff' },
  { id: 'elite', name: t('ÉLITE'), min: 800, color: '#ff2bd6' },
];

// Nombre de tours par course
export const RACE_LAPS = 3;

/** Ligue correspondant à un nombre de trophées. */
export function leagueFor(trophies) {
  let league = LEAGUES[0];
  for (const l of LEAGUES) if (trophies >= l.min) league = l;
  return league;
}

/** Rang d'une ligue (0 = Bronze). */
export const leagueRank = (id) => Math.max(0, LEAGUES.findIndex((l) => l.id === id));

/** Ligue suivante (ou null si déjà au sommet). */
export function nextLeague(league) {
  const i = leagueRank(league.id);
  return LEAGUES[i + 1] ?? null;
}

/** Avancement (0 … 1) vers la ligue suivante. */
export function leagueProgress(trophies) {
  const cur = leagueFor(trophies);
  const next = nextLeague(cur);
  if (!next) return 1;
  return (trophies - cur.min) / (next.min - cur.min);
}
