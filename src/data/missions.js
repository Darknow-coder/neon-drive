// Missions quotidiennes et hebdomadaires (réglables ici).
// Aucune mission ne demande de drifter.
//
// Chaque modèle : type, objectif (selon la difficulté), texte, récompense.
//   {n} est remplacé par l'objectif, {track} / {car} par un circuit / une voiture.
// Seules les courses classées comptent (pas l'entraînement).

import { t } from '../i18n/index.js';
export const DAILY_COUNT = 3;

export const DAILY_TEMPLATES = [
  { type: 'races', targets: [2, 3, 4], text: t('Termine {n} courses'), reward: { credits: 40 } },
  { type: 'top3', targets: [1, 2, 3], text: t('Finis {n} fois sur le podium'), reward: { credits: 60 } },
  { type: 'win', targets: [1], text: t('Gagne une course'), reward: { credits: 80 } },
  { type: 'overtakes', targets: [5, 8, 12], text: t('Dépasse {n} voitures'), reward: { credits: 50 } },
  { type: 'rival', targets: [1], text: t('Finis devant ton rival'), reward: { credits: 70 } },
  { type: 'clean', targets: [1, 2], text: t('Termine {n} course(s) sans toucher un mur'), reward: { credits: 60 } },
  { type: 'pads', targets: [4, 6, 10], text: t('Roule sur {n} plaques de boost'), reward: { credits: 40 } },
  { type: 'track', targets: [1], text: t('Finis dans le top 3 sur {track}'), reward: { fragments: 8 } },
  { type: 'car', targets: [1], text: t('Finis une course dans le top 4 avec {car}'), reward: { fragments: 8 } },
  { type: 'credits', targets: [150, 220], text: t('Gagne {n} crédits en course'), reward: { pack: 'small' } },
];

// Bonus quand les 3 missions du jour sont terminées
export const DAILY_BONUS = { pack: 'small', credits: 30 };

export const WEEKLY_TEMPLATES = [
  { type: 'top3', targets: [12], text: t('Finis {n} fois sur le podium cette semaine'), reward: { pack: 'large', credits: 200 } },
  { type: 'win', targets: [6], text: t('Gagne {n} courses cette semaine'), reward: { pack: 'large', credits: 200 } },
  { type: 'overtakes', targets: [60], text: t('Dépasse {n} voitures cette semaine'), reward: { pack: 'large', credits: 200 } },
  { type: 'races', targets: [20], text: t('Termine {n} courses cette semaine'), reward: { pack: 'large', credits: 200 } },
  { type: 'rival', targets: [5], text: t('Finis {n} fois devant ton rival cette semaine'), reward: { pack: 'large', credits: 200 } },
];
