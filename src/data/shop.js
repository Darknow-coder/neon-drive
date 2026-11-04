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
  // Exclusives du passe de saison (jamais en boutique)
  { id: 'aurora', name: 'AURORE', price: 0, exclusive: 'season', desc: 'Exclusif Saison 1 : des lumières boréales qui ondulent.' },
  { id: 'obsidian', name: 'OBSIDIENNE', price: 0, exclusive: 'season', desc: 'Exclusif Saison 1 : noir miroir aux reflets de ta couleur.' },
  { id: 'galaxy', name: 'GALAXIE', price: 0, exclusive: 'season', desc: 'Exclusif Saison 1 : une nébuleuse et ses étoiles.' },
  // Exclusive du mode Carrière
  { id: 'prism', name: 'PRISME', price: 0, exclusive: 'career', desc: 'Exclusif Carrière (chapitre 4) : des facettes de cristal.' },
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
  // Exclusifs du passe de saison
  { id: 'stars', name: 'ÉTOILES', price: 0, exclusive: 'season', desc: 'Exclusif Saison 1 : une pluie d\'étoiles.' },
  { id: 'hex', name: 'HEXAGONES', price: 0, exclusive: 'season', desc: 'Exclusif Saison 1 : un nid d\'abeille high-tech.' },
  { id: 'tiger', name: 'TIGRE', price: 0, exclusive: 'season', desc: 'Exclusif Saison 1 : les rayures du fauve.' },
  { id: 'wings', name: 'AILES', price: 0, exclusive: 'season', desc: 'Exclusif Saison 1 : des ailes le long des flancs.' },
  // Exclusif du mode Carrière
  { id: 'claws', name: 'GRIFFES', price: 0, exclusive: 'career', desc: 'Exclusif Carrière (chapitre 5) : la marque de NEMESIS.' },
  // Exclusif : gagné en remportant l'événement GIGA RUSH (jamais en boutique)
  { id: 'giga', name: 'GIGA RUSH', price: 0, exclusive: true, desc: 'Exclusif : réservé aux vainqueurs de la GIGA RUSH.' },
];

// ---------- Traînées de boost (flammes derrière la voiture) ----------
// colors : couleurs tirées au hasard ('glow' = la couleur néon de la voiture)
// rainbow : couleurs qui défilent · sparks : étincelles en plus · size : taille des flammes
export const TRAILS = [
  { id: 'neon', name: 'NÉON', price: 0, desc: 'Les flammes rose et cyan d\'origine.', colors: ['#ff2bd6', '#ff2bd6', '#7af7ff'] },
  { id: 'fire', name: 'FEU', price: 300, desc: 'De vraies flammes orange et jaunes.', colors: ['#ff6a00', '#ffb000', '#ffe14d', '#ff3b2b'] },
  { id: 'ice', name: 'GLACE', price: 300, desc: 'Un souffle glacé bleu et blanc.', colors: ['#bfe9ff', '#ffffff', '#5ab8ff'] },
  { id: 'toxic', name: 'TOXIQUE', price: 350, desc: 'Un nuage vert radioactif.', colors: ['#3dff9e', '#c6ff3d', '#3dff9e'] },
  { id: 'plasma', name: 'PLASMA', price: 400, desc: 'Prend la couleur néon de ta voiture.', colors: ['glow', 'glow', '#ffffff'] },
  { id: 'void', name: 'NÉANT', price: 450, desc: 'Un trou noir violet qui aspire la lumière.', colors: ['#8a2bff', '#4b1490', '#ff2bd6'], size: 1.25 },
  { id: 'electric', name: 'ÉLECTRIQUE', price: 550, desc: 'Des arcs électriques qui crépitent.', colors: ['#7af7ff', '#ffffff', '#2b6bff'], sparks: '#e8fbff', size: 0.8 },
  { id: 'gold', name: 'OR', price: 650, desc: 'Une pluie de paillettes dorées.', colors: ['#ffd34d', '#fff2b0', '#ffb000'], sparks: '#ffe680' },
  { id: 'rainbow', name: 'ARC-EN-CIEL', price: 900, desc: 'Toutes les couleurs, l\'une après l\'autre.', rainbow: true },
];

// ---------- Fumées de drift ----------
export const SMOKES = [
  { id: 'standard', name: 'D\'ORIGINE', price: 0, desc: 'Teintée de la couleur néon de ta voiture.', colors: ['glow', '#b9a8ff'] },
  { id: 'pure', name: 'NÉON PUR', price: 150, desc: 'Uniquement ta couleur néon, très vive.', colors: ['glow'] },
  { id: 'white', name: 'BLANCHE', price: 150, desc: 'La fumée blanche des pneus qui fondent.', colors: ['#f2f0ff', '#dcd8f0'] },
  { id: 'embers', name: 'BRAISES', price: 300, desc: 'Fumée orange et étincelles brûlantes.', colors: ['#ff6a00', '#ffb000'], sparks: '#ffd34d' },
  { id: 'duo', name: 'BICOLORE', price: 300, desc: 'Ta couleur de carrosserie et ton accent.', colors: ['body', 'accent'] },
  { id: 'sparkle', name: 'ÉTINCELLES', price: 450, desc: 'Une gerbe d\'étincelles à chaque drift.', colors: ['glow', '#b9a8ff'], sparks: '#fff6c2' },
  { id: 'rainbow', name: 'ARC-EN-CIEL', price: 700, desc: 'Un drift aux couleurs de l\'arc-en-ciel.', rainbow: true },
];

// ---------- Numéro de course (gratuit) ----------
export const NUMBER_STYLES = [
  { id: 'roundel', name: 'PASTILLE' },   // rond blanc, chiffres foncés (course classique)
  { id: 'neon', name: 'NÉON' },          // chiffres lumineux couleur accent
  { id: 'bold', name: 'GÉANT' },         // grands chiffres blancs cerclés
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
