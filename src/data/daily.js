// DÉFI DU JOUR : un défi différent chaque jour, le même pour tout le monde
// (tiré au sort à partir de la date). Tout est réglable ici.

// Formats de course (3 étoiles chacun)
import { t } from '../i18n/index.js';
export const DAILY_FORMATS = {
  race: { name: t('COURSE'), laps: 3, places: [3, 2, 1] },
  last: { name: t('REMONTÉE'), laps: 3, places: [4, 2, 1] },  // départ en dernière position
  elim: { name: t('ÉLIMINATION'), places: [4, 2, 1] },
  time: { name: t('CHRONO'), laps: 2 },                         // seul en piste, 3 temps à battre
};
// Temps du chrono : référence calculée (IA au talent de rival) × facteur
export const DAILY_TIME_FACTORS = [1.15, 1.08, 1.03];

// Twists du circuit
export const TRACK_TWISTS = {
  reverse: { name: t('À L\'ENVERS'), desc: t('Le circuit se court dans l\'autre sens.') },
  weather: { name: t('MÉTÉO SURPRISE'), desc: t('Une météo inhabituelle sur ce circuit.') },
};
export const SURPRISE_WEATHERS = ['rain', 'snow', 'fog', 'storm', 'sand', 'dusk'];

// Règles spéciales (pour TOUTES les voitures)
export const DAILY_RULES = {
  none: { name: '', desc: '' },
  noBoost: { name: t('SANS BOOST'), desc: t('Jauge de boost désactivée pour tout le monde (les plaques au sol marchent toujours).') },
  turbo: { name: t('TURBO INFINI'), desc: t('La jauge de boost se remplit toute seule : boost à volonté !') },
  ice: { name: t('VERGLAS'), desc: t('Toute la piste glisse : freine tôt, sois doux sur la direction.') },
  oneCar: { name: t('MÊME VOITURE'), desc: t('Tout le monde dans la même voiture : seul le pilotage compte.') },
};

// Récompenses
export const DAILY_STAR_CREDITS = 40;   // par nouvelle étoile du jour
export const DAILY_DONE_XP = 100;       // XP de saison en plus au premier défi réussi du jour
// Série de jours (≥ 1 étoile chaque jour). Cycle de 7 jours, le 7e est le gros lot.
export const STREAK_REWARDS = [
  { credits: 150 },
  { credits: 200 },
  { pack: 'small' },
  { credits: 300 },
  { pack: 'medium' },
  { credits: 400 },
  { pack: 'large', credits: 500 },
];
