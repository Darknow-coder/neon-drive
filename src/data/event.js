// Événement (provisoirement permanent) : GIGA RUSH, la course à 20 voitures.
// Tout est réglable ici.

export const EVENT = {
  id: 'giga-rush',
  name: 'GIGA RUSH',
  tagline: '20 pilotes · 2 tours · circuit géant',
  desc: 'Une autoroute néon immense et très large, 20 voitures au départ. Tu pars en milieu de peloton : remonte jusqu\'à la tête !',
  trackId: 'neon-highway',
  laps: 2,
  drivers: 20,
  // Place de départ du joueur (tirée au sort dans cet intervalle, 1 = pole)
  startFrom: 10,
  startTo: 14,
  color: '#ffd34d',
};

// Crédits gagnés à chaque course, selon la place (1re → 20e)
export const EVENT_CREDITS = [150, 130, 115, 100, 90, 80, 72, 65, 58, 52, 46, 41, 36, 32, 28, 24, 20, 16, 13, 10];

// Objectifs : chacun récompensé une seule fois (le meilleur résultat débloque aussi les précédents)
export const EVENT_GOALS = [
  { id: 'top10', place: 10, label: 'Finis dans le top 10', reward: { credits: 300 } },
  { id: 'top5', place: 5, label: 'Finis dans le top 5', reward: { pack: 'medium' } },
  { id: 'podium', place: 3, label: 'Monte sur le podium', reward: { pack: 'large', credits: 300 } },
  { id: 'win', place: 1, label: 'Gagne la GIGA RUSH', reward: { motif: 'giga', credits: 500 } },
];

// Pilotes supplémentaires (en plus des 5 habituels et du rival de la ligue)
export const EVENT_DRIVERS = [
  { name: 'AXEL', profile: 'aggressive', car: 'spectre', colors: { body: '#ff5c2b', accent: '#fff3b0', glow: '#ff7a3d' } },
  { name: 'BLITZ', profile: 'speed', car: 'comet', colors: { body: '#fff04d', accent: '#2b6bff', glow: '#fff04d' } },
  { name: 'CORA', profile: 'cornering', car: 'pixie', colors: { body: '#ff7ad9', accent: '#ffffff', glow: '#ff7ad9' } },
  { name: 'DASH', profile: 'balanced', car: 'razor', colors: { body: '#4dffd2', accent: '#8a2bff', glow: '#4dffd2' } },
  { name: 'ECHO', profile: 'cautious', car: 'bastion', colors: { body: '#9aa3c7', accent: '#00f0ff', glow: '#b8c4ff' } },
  { name: 'FLUX', profile: 'speed', car: 'ionix', colors: { body: '#00b3ff', accent: '#ffd34d', glow: '#00b3ff' } },
  { name: 'GLINT', profile: 'cornering', car: 'halo', colors: { body: '#e8e6ff', accent: '#ff2b5a', glow: '#ffffff' } },
  { name: 'HEX', profile: 'aggressive', car: 'goliath', colors: { body: '#7cff3d', accent: '#101010', glow: '#7cff3d' } },
  { name: 'IRIS', profile: 'balanced', car: 'hyperion', colors: { body: '#b07aff', accent: '#3dff9e', glow: '#b07aff' } },
  { name: 'JINX', profile: 'aggressive', car: 'razor', colors: { body: '#ff2b5a', accent: '#00f0ff', glow: '#ff2b5a' } },
  { name: 'LUX', profile: 'cautious', car: 'comet', colors: { body: '#ffe680', accent: '#ff8a3d', glow: '#ffe680' } },
  { name: 'PULSE', profile: 'speed', car: 'halo', colors: { body: '#ff2bd6', accent: '#ffd34d', glow: '#ff2bd6' } },
  { name: 'QUARK', profile: 'cornering', car: 'bastion', colors: { body: '#3d8bff', accent: '#ff2bd6', glow: '#3d8bff' } },
  { name: 'RIOT', profile: 'balanced', car: 'volt', colors: { body: '#ff8a3d', accent: '#2b1050', glow: '#ff8a3d' } },
];
