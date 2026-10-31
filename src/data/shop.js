// Catalogue et réglages de la boutique (tout est réglable ici).
// Règle d'or : tout s'achète avec des crédits gagnés en jouant, et les
// cosmétiques (finitions, motifs) n'ont AUCUN effet sur les performances.

// Nombre moyen de crédits gagnés par course (pour « il te manque ≈ N courses »)
export const AVG_CREDITS_PER_RACE = 70;

// ---------- Cadeau quotidien : cycle de 7 jours ----------
// On avance d'un jour à chaque cadeau récupéré (un par jour). Rater un jour
// ne fait PAS perdre sa progression dans le cycle.
export const DAILY_GIFTS = [
  { credits: 50 },
  { pack: 'small' },
  { credits: 80 },
  { fragments: 10 },        // fragments de la voiture la plus proche d'être débloquée/améliorée
  { credits: 120 },
  { pack: 'small' },
  { pack: 'medium' },
];

// ---------- Finitions de carrosserie (utilisables sur toutes les voitures) ----------
export const FINISHES = [
  { id: 'standard', name: 'STANDARD', price: 0, desc: 'La finition d\'origine.' },
  { id: 'metal', name: 'MÉTALLISÉ', price: 250, desc: 'Reflets profonds et éclatants.' },
  { id: 'matte', name: 'MAT', price: 250, desc: 'Sobre, sans reflets, très racé.' },
  { id: 'chrome', name: 'CHROME', price: 500, desc: 'Miroir réfléchissant teinté par ta couleur.' },
  { id: 'carbon', name: 'CARBONE', price: 600, desc: 'Fibre de carbone tissée, accents colorés.' },
  { id: 'holo', name: 'HOLOGRAPHIQUE', price: 900, desc: 'Un arc-en-ciel qui change selon l\'angle.' },
  { id: 'gold', name: 'OR', price: 1200, desc: 'Or pur. Pour les légendes.' },
];

// ---------- Motifs (décorations) ----------
export const MOTIFS = [
  { id: 'origin', name: 'D\'ORIGINE', price: 0, desc: 'Le motif propre à chaque voiture.' },
  { id: 'none', name: 'UNI', price: 0, desc: 'Aucune décoration.' },
  { id: 'twin', name: 'DOUBLE BANDE', price: 150, desc: 'Deux fines bandes de course.' },
  { id: 'single', name: 'BANDE LARGE', price: 150, desc: 'Une large bande centrale.' },
  { id: 'side', name: 'BANDES LATÉRALES', price: 200, desc: 'Deux bandes le long des flancs.' },
  { id: 'chevron', name: 'CHEVRONS', price: 250, desc: 'Des flèches qui pointent vers l\'avant.' },
  { id: 'split', name: 'BICOLORE', price: 250, desc: 'Deux couleurs en diagonale.' },
  { id: 'bolt', name: 'ÉCLAIR', price: 300, desc: 'Un éclair d\'un bout à l\'autre.' },
  { id: 'checker', name: 'DAMIER', price: 300, desc: 'Le drapeau à damier de la victoire.' },
  { id: 'circuit', name: 'CIRCUIT IMPRIMÉ', price: 350, desc: 'Des pistes électroniques lumineuses.' },
  { id: 'flames', name: 'FLAMMES', price: 400, desc: 'Des flammes néon qui partent du nez.' },
];

// ---------- Offres du jour ----------
export const OFFERS = {
  // Lots de fragments d'une voiture : prix dégressif
  fragmentBundles: [
    { amount: 5, price: 100 },
    { amount: 10, price: 190 },
    { amount: 20, price: 360 },
  ],
  featuredDiscount: 0.3,   // l'offre spéciale est à -30 %
  styleDiscount: 0.2,      // le cosmétique du jour est à -20 %
  packDiscount: 0.2,       // le pack du jour est à -20 %
};
