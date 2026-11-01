// Mode CARRIÈRE : 5 chapitres, un par rival (et par ligue).
// Chaque chapitre : 4 défis (1 à 3 étoiles) puis un duel contre le rival.
// Tout est réglable ici : défis, objectifs, dialogues, récompenses.
//
// Types de défis :
//   race   course classique (6 voitures, rival présent)  ★ selon la place
//   last   départ en DERNIÈRE position                    ★ selon la place
//   beat   finir devant le rival                          ★ rival battu / podium / victoire
//   clean  course propre (aucun choc contre un mur)       ★ sans mur / + podium / + victoire
//   elim   élimination                                    ★ selon la place
//   time   seul en piste contre le chrono                 ★ selon le temps
//   duel   1 contre 1 face au rival (fin de chapitre)     ★ victoire / +1 s d'avance / +2,5 s

export const DUEL_STARS_NEEDED = 6; // étoiles (sur 12) pour débloquer le duel du chapitre
export const STAR_CREDITS = 25;     // crédits par nouvelle étoile (× numéro du chapitre)
export const ALL_STARS_REWARD = { credits: 2000, title: 'Perfectionniste' };

// Temps du chrono : référence = tour NEON × tours + départ arrêté
export const TIME_START_ALLOWANCE = 1.4;
export const TIME_FACTORS = [1.15, 1.08, 1.03]; // 1★, 2★, 3★ (multiplicateur de la référence)
export const DUEL_MARGINS = [0, 1, 2.5];          // secondes d'avance pour 1★, 2★, 3★
export const DUEL_PACE = 0.98;                    // rythme du rival en duel (× son rythme en course classée)

export const CHAPTERS = [
  {
    id: 'ch1', n: 1, league: 'bronze', rival: 'spark', title: 'L\'ÉTINCELLE',
    intro: [
      ['RADIO', 'Bienvenue sur le circuit NEON, pilote. Tout le monde commence en Bronze… et en Bronze, il y a SPARK.'],
      ['SPARK', 'Encore un petit nouveau ? Laisse-moi deviner : tu veux ma place.'],
      ['SPARK', 'Fais tes preuves sur mes circuits. Si tu tiens la route, je t\'attends pour un duel. Un seul.'],
    ],
    outro: [
      ['SPARK', 'Pas mal… Pas mal du tout. Ma VOLT n\'avait jamais vu un pare-chocs d\'aussi près.'],
      ['SPARK', 'Fais gaffe en Argent : VANTA ne double pas, VANTA percute.'],
      ['RADIO', 'Chapitre 2 débloqué : LE MUR.'],
    ],
    stages: [
      { id: 'c1s1', type: 'race', title: 'PREMIER CONTACT', track: 'neon-boulevard', laps: 3, places: [3, 2, 1] },
      { id: 'c1s2', type: 'time', title: 'CHRONO D\'ESSAI', track: 'pulsar-speedway', laps: 2 },
      { id: 'c1s3', type: 'clean', title: 'PILOTAGE PROPRE', track: 'sakura-avenue', laps: 2 },
      { id: 'c1s4', type: 'last', title: 'LA REMONTÉE', track: 'vortex-city', laps: 3, places: [4, 2, 1] },
    ],
    duel: { id: 'c1d', type: 'duel', title: 'DUEL : SPARK', track: 'neon-boulevard', laps: 3 },
    reward: { credits: 500, pack: 'medium', title: 'Tombeur de SPARK' },
  },
  {
    id: 'ch2', n: 2, league: 'argent', rival: 'vanta', title: 'LE MUR',
    intro: [
      ['VANTA', 'Tu as battu SPARK ? C\'est un gamin.'],
      ['VANTA', 'Ici, sous la pluie et dans la neige, les belles trajectoires ne servent à rien. Il faut du cran.'],
      ['VANTA', 'Gagne le droit de m\'affronter. Et prie pour ne pas croiser ma TITAN dans un virage.'],
    ],
    outro: [
      ['VANTA', '… Tu ne recules pas. Je respecte ça.'],
      ['VANTA', 'MIRAGE t\'attend dans le désert. Personne ne le voit jamais arriver.'],
      ['RADIO', 'Chapitre 3 débloqué : L\'ILLUSION.'],
    ],
    stages: [
      { id: 'c2s1', type: 'beat', title: 'SOUS LA PLUIE', track: 'rainline', laps: 3 },
      { id: 'c2s2', type: 'time', title: 'PATINOIRE', track: 'frostline', laps: 1 },
      { id: 'c2s3', type: 'elim', title: 'LE DERNIER SORT', track: 'pulsar-speedway', places: [3, 2, 1] },
      { id: 'c2s4', type: 'clean', title: 'NEIGE FRAÎCHE', track: 'frostline', laps: 2 },
    ],
    duel: { id: 'c2d', type: 'duel', title: 'DUEL : VANTA', track: 'rainline', laps: 3 },
    reward: { credits: 800, pack: 'large', title: 'Briseur de mur' },
  },
  {
    id: 'ch3', n: 3, league: 'or', rival: 'mirage', title: 'L\'ILLUSION',
    intro: [
      ['MIRAGE', 'Tu me vois ? Vraiment ?'],
      ['MIRAGE', 'Dans le désert, le sable efface les traces et le vent te pousse. Seul le chrono ne ment jamais.'],
      ['MIRAGE', 'Remonte le peloton, tiens ta trajectoire… et peut-être que tu me rattraperas.'],
    ],
    outro: [
      ['MIRAGE', 'Impossible… Tu as vu à travers l\'illusion.'],
      ['MIRAGE', 'Au Diamant, ZENITH ne commet aucune erreur. Absolument aucune.'],
      ['RADIO', 'Chapitre 4 débloqué : LA PERFECTION.'],
    ],
    stages: [
      { id: 'c3s1', type: 'race', title: 'TEMPÊTE', track: 'sirocco', laps: 2, places: [3, 2, 1] },
      { id: 'c3s2', type: 'last', title: 'DERNIER DÉPART', track: 'dune-runner', laps: 3, places: [4, 2, 1] },
      { id: 'c3s3', type: 'time', title: 'CHRONO DES DUNES', track: 'dune-runner', laps: 2 },
      { id: 'c3s4', type: 'beat', title: 'LA POURSUITE', track: 'sakura-avenue', laps: 3 },
    ],
    duel: { id: 'c3d', type: 'duel', title: 'DUEL : MIRAGE', track: 'sirocco', laps: 2 },
    reward: { credits: 1200, pack: 'large', avatar: 'mask', title: 'Chasseur de mirages' },
  },
  {
    id: 'ch4', n: 4, league: 'diamant', rival: 'zenith', title: 'LA PERFECTION',
    intro: [
      ['ZENITH', 'Chaque virage a une trajectoire parfaite. Je les connais toutes.'],
      ['ZENITH', 'Le brouillard ne me gêne pas : je pilote les yeux fermés.'],
      ['ZENITH', 'Prouve-moi que tu es plus qu\'une simple statistique.'],
    ],
    outro: [
      ['ZENITH', 'Une erreur de calcul. La mienne.'],
      ['ZENITH', 'Il ne reste qu\'elle. NEMESIS. Personne ne l\'a battue depuis des saisons.'],
      ['RADIO', 'Chapitre final débloqué : LA LÉGENDE.'],
    ],
    stages: [
      { id: 'c4s1', type: 'clean', title: 'TRAJECTOIRE PARFAITE', track: 'orbital-ring', laps: 2 },
      { id: 'c4s2', type: 'beat', title: 'DANS LA BRUME', track: 'phantom-bay', laps: 3 },
      { id: 'c4s3', type: 'time', title: 'À L\'AVEUGLE', track: 'phantom-bay', laps: 1 },
      { id: 'c4s4', type: 'elim', title: 'SURVIE', track: 'vortex-city', places: [3, 2, 1] },
    ],
    duel: { id: 'c4d', type: 'duel', title: 'DUEL : ZENITH', track: 'orbital-ring', laps: 3 },
    reward: { credits: 1600, pack: 'large', finish: 'prism', title: 'Au zénith' },
  },
  {
    id: 'ch5', n: 5, league: 'elite', rival: 'nemesis', title: 'LA LÉGENDE',
    intro: [
      ['RADIO', 'Orage sur THUNDER PEAK. Elle est là.'],
      ['NEMESIS', 'J\'ai vu tes courses. Tu as du talent.'],
      ['NEMESIS', 'Mais ici, le talent ne suffit pas. Il faut être parfait sous la foudre.'],
      ['NEMESIS', 'Viens. Montre-moi la nouvelle légende.'],
    ],
    outro: [
      ['NEMESIS', '… Alors c\'est toi.'],
      ['NEMESIS', 'Garde ce titre précieusement. Je reviendrai le chercher.'],
      ['RADIO', 'CARRIÈRE TERMINÉE ! Tu es la nouvelle légende du circuit NEON !'],
    ],
    stages: [
      { id: 'c5s1', type: 'race', title: 'LA FOUDRE', track: 'thunder-peak', laps: 3, places: [3, 2, 1] },
      { id: 'c5s2', type: 'last', title: 'CONTRE TOUS', track: 'citadel', laps: 3, places: [4, 2, 1] },
      { id: 'c5s3', type: 'time', title: 'ÉCLAIR', track: 'thunder-peak', laps: 2 },
      { id: 'c5s4', type: 'elim', title: 'LE DERNIER DEBOUT', track: 'citadel', places: [4, 2, 1] },
    ],
    duel: { id: 'c5d', type: 'duel', title: 'DUEL FINAL : NEMESIS', track: 'thunder-peak', laps: 3 },
    reward: { credits: 3000, pack: 'large', motif: 'claws', avatar: 'nemesis', title: 'Légende de la carrière' },
  },
];

/** Tous les défis (duels compris), avec leur chapitre. */
export const ALL_STAGES = CHAPTERS.flatMap((c) => [...c.stages, c.duel].map((s) => ({ ...s, chapter: c })));
export const stageById = (id) => ALL_STAGES.find((s) => s.id === id) ?? null;

/** Texte de l'objectif de chaque étoile (affiché avant et après la course). */
export function starTexts(stage, rivalName, timeTargets) {
  const fmtPlace = (p) => (p === 1 ? 'Gagne' : `Finis dans le top ${p}`);
  switch (stage.type) {
    case 'race': case 'last': case 'elim':
      return stage.places.map(fmtPlace);
    case 'beat':
      return [`Finis devant ${rivalName}`, `Devant ${rivalName} et sur le podium`, 'Gagne la course'];
    case 'clean':
      return ['Finis sans toucher un mur', 'Podium sans toucher un mur', 'Gagne sans toucher un mur'];
    case 'time':
      return timeTargets.map((t) => `Termine en moins de ${t}`);
    case 'duel':
      return [`Bats ${rivalName}`, `Avec 1 s d'avance`, `Avec 2,5 s d'avance`];
    default: return [];
  }
}

export const STAGE_TYPE_LABEL = {
  race: 'COURSE', last: 'REMONTÉE', beat: 'POURSUITE', clean: 'COURSE PROPRE', elim: 'ÉLIMINATION', time: 'CHRONO', duel: 'DUEL',
};
