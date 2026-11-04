// Rivaux : un pilote « boss » par ligue.
// Il participe à chaque course classée de sa ligue (à la place d'un pilote
// habituel). Son niveau est plus élevé que celui des autres, mais FIXÉ et
// annoncé avant la course : il ne change jamais pendant (aucun rattrapage).
//   paceMul     : multiplie la part des capacités exploitée (virages, freinage)
//   mistakeMul  : multiplie son taux d'erreurs (< 1 = plus régulier)
//   skill       : ajustements de talent propres au rival (voir RIVAL_SKILL)
// Le battre (finir devant lui) rapporte RIVAL_BONUS trophées.

import { t } from '../i18n/index.js';
export const RIVAL_BONUS = 3;

// Talent de pilote commun à tous les rivaux (remplace celui de leur profil) :
// trajectoire quasi parfaite, réflexes rapides, freinage tardif, drift maîtrisé.
// Ils utilisent la MÊME voiture que tout le monde : aucune amélioration cachée.
export const RIVAL_SKILL = { gripUse: 0.97, brakeUse: 0.9, lineFocus: 0.99, reaction: 0.08, driftUse: 1 };

export const RIVALS = {
  bronze:  { id: 'spark',   name: 'SPARK',   car: 'volt',    profile: 'balanced',   paceMul: 1.05, mistakeMul: 0.6,
             colors: { body: '#ffe14d', accent: '#ff3b5c', glow: '#ffe14d' }, quote: t('Le roi du Bronze. Montre-lui qui commande.') },
  argent:  { id: 'vanta',   name: 'VANTA',   car: 'titan',   profile: 'aggressive', paceMul: 1.05, mistakeMul: 0.6,
             colors: { body: '#1a1a2e', accent: '#ff2bd6', glow: '#ff2bd6' }, quote: t('Il ne laisse jamais passer personne sans contact.') },
  or:      { id: 'mirage',  name: 'MIRAGE',  car: 'razor',   profile: 'cornering',  paceMul: 1.05, mistakeMul: 0.7, skill: { lineFocus: 0.95, reaction: 0.11 },
             colors: { body: '#3dff9e', accent: '#8a2bff', glow: '#3dff9e' }, quote: t('Rapide partout, insaisissable dans les virages.') },
  diamant: { id: 'zenith',  name: 'ZENITH',  car: 'comet',   profile: 'speed',      paceMul: 1.05, mistakeMul: 0.4, skill: { gripUse: 0.99, brakeUse: 0.95 },
             colors: { body: '#ffffff', accent: '#00f0ff', glow: '#7af7ff' }, quote: t('Personne ne la rattrape en ligne droite.') },
  elite:   { id: 'nemesis', name: 'NEMESIS', car: 'razor', profile: 'balanced',   paceMul: 1.05, mistakeMul: 0.25, skill: { gripUse: 0.99, brakeUse: 0.97, reaction: 0.07 },
             colors: { body: '#ff3b5c', accent: '#1a1a2e', glow: '#ff3b5c' }, quote: t('La légende. Invaincue depuis des saisons.') },
};

export const rivalFor = (leagueId) => RIVALS[leagueId] ?? null;
