// Catalogue et réglages de la boutique (tout est réglable ici).
// Règle d'or : tout s'achète avec des crédits gagnés en jouant, et les
// cosmétiques (finitions, motifs) n'ont AUCUN effet sur les performances.

// Nombre moyen de crédits gagnés par course (pour « il te manque ≈ N courses »)
import { t } from '../i18n/index.js';
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
  { id: 'standard', name: t('STANDARD'), price: 0, desc: t('La finition d\'origine.') },
  { id: 'metal', name: t('MÉTALLISÉ'), price: 600, desc: t('Reflets profonds et éclatants.') },
  { id: 'matte', name: t('MAT'), price: 600, desc: t('Sobre, sans reflets, très racé.') },
  { id: 'chrome', name: t('CHROME'), price: 1200, desc: t('Miroir réfléchissant teinté par ta couleur.') },
  { id: 'carbon', name: t('CARBONE'), price: 1500, desc: t('Fibre de carbone tissée, accents colorés.') },
  { id: 'holo', name: t('HOLOGRAPHIQUE'), price: 2200, desc: t('Un arc-en-ciel qui change selon l\'angle.') },
  { id: 'gold', name: t('OR'), price: 3000, desc: t('Or pur. Pour les légendes.') },
  // Exclusives du passe de saison (jamais en boutique)
  { id: 'aurora', name: t('AURORE'), price: 0, exclusive: 'season', desc: t('Exclusif Saison 1 : des lumières boréales qui ondulent.') },
  { id: 'obsidian', name: t('OBSIDIENNE'), price: 0, exclusive: 'season', desc: t('Exclusif Saison 1 : noir miroir aux reflets de ta couleur.') },
  { id: 'galaxy', name: t('GALAXIE'), price: 0, exclusive: 'season', desc: t('Exclusif Saison 1 : une nébuleuse et ses étoiles.') },
  // Exclusive du mode Carrière
  { id: 'prism', name: t('PRISME'), price: 0, exclusive: 'career', desc: t('Exclusif Carrière (chapitre 4) : des facettes de cristal.') },
];

// ---------- Motifs (décorations) ----------
export const MOTIFS = [
  { id: 'origin', name: t('D\'ORIGINE'), price: 0, desc: t('Le motif propre à chaque voiture.') },
  { id: 'none', name: t('UNI'), price: 0, desc: t('Aucune décoration.') },
  { id: 'twin', name: t('DOUBLE BANDE'), price: 400, desc: t('Deux fines bandes de course.') },
  { id: 'single', name: t('BANDE LARGE'), price: 400, desc: t('Une large bande centrale.') },
  { id: 'side', name: t('BANDES LATÉRALES'), price: 500, desc: t('Deux bandes le long des flancs.') },
  { id: 'chevron', name: t('CHEVRONS'), price: 600, desc: t('Des flèches qui pointent vers l\'avant.') },
  { id: 'split', name: t('BICOLORE'), price: 600, desc: t('Deux couleurs en diagonale.') },
  { id: 'bolt', name: t('ÉCLAIR'), price: 750, desc: t('Un éclair d\'un bout à l\'autre.') },
  { id: 'checker', name: t('DAMIER'), price: 750, desc: t('Le drapeau à damier de la victoire.') },
  { id: 'circuit', name: t('CIRCUIT IMPRIMÉ'), price: 900, desc: t('Des pistes électroniques lumineuses.') },
  { id: 'flames', name: t('FLAMMES'), price: 1000, desc: t('Des flammes néon qui partent du nez.') },
  // Exclusifs du passe de saison
  { id: 'stars', name: t('ÉTOILES'), price: 0, exclusive: 'season', desc: t('Exclusif Saison 1 : une pluie d\'étoiles.') },
  { id: 'hex', name: t('HEXAGONES'), price: 0, exclusive: 'season', desc: t('Exclusif Saison 1 : un nid d\'abeille high-tech.') },
  { id: 'tiger', name: t('TIGRE'), price: 0, exclusive: 'season', desc: t('Exclusif Saison 1 : les rayures du fauve.') },
  { id: 'wings', name: t('AILES'), price: 0, exclusive: 'season', desc: t('Exclusif Saison 1 : des ailes le long des flancs.') },
  // Exclusif du mode Carrière
  { id: 'claws', name: t('GRIFFES'), price: 0, exclusive: 'career', desc: t('Exclusif Carrière (chapitre 5) : la marque de NEMESIS.') },
  // Exclusif : gagné en remportant l'événement GIGA RUSH (jamais en boutique)
  { id: 'giga', name: t('GIGA RUSH'), price: 0, exclusive: true, desc: t('Exclusif : réservé aux vainqueurs de la GIGA RUSH.') },
];

// ---------- Traînées de boost (flammes derrière la voiture) ----------
// colors : couleurs tirées au hasard ('glow' = la couleur néon de la voiture)
// rainbow : couleurs qui défilent · sparks : étincelles en plus · size : taille des flammes
export const TRAILS = [
  { id: 'neon', name: t('NÉON'), price: 0, desc: t('Les flammes rose et cyan d\'origine.'), colors: ['#ff2bd6', '#ff2bd6', '#7af7ff'] },
  { id: 'fire', name: t('FEU'), price: 750, desc: t('De vraies flammes orange et jaunes.'), colors: ['#ff6a00', '#ffb000', '#ffe14d', '#ff3b2b'] },
  { id: 'ice', name: t('GLACE'), price: 750, desc: t('Un souffle glacé bleu et blanc.'), colors: ['#bfe9ff', '#ffffff', '#5ab8ff'] },
  { id: 'toxic', name: t('TOXIQUE'), price: 900, desc: t('Un nuage vert radioactif.'), colors: ['#3dff9e', '#c6ff3d', '#3dff9e'] },
  { id: 'plasma', name: t('PLASMA'), price: 1000, desc: t('Prend la couleur néon de ta voiture.'), colors: ['glow', 'glow', '#ffffff'] },
  { id: 'void', name: t('NÉANT'), price: 1100, desc: t('Un trou noir violet qui aspire la lumière.'), colors: ['#8a2bff', '#4b1490', '#ff2bd6'], size: 1.25 },
  { id: 'electric', name: t('ÉLECTRIQUE'), price: 1400, desc: t('Des arcs électriques qui crépitent.'), colors: ['#7af7ff', '#ffffff', '#2b6bff'], sparks: '#e8fbff', size: 0.8 },
  { id: 'gold', name: t('OR'), price: 1600, desc: t('Une pluie de paillettes dorées.'), colors: ['#ffd34d', '#fff2b0', '#ffb000'], sparks: '#ffe680' },
  { id: 'rainbow', name: t('ARC-EN-CIEL'), price: 2200, desc: t('Toutes les couleurs, l\'une après l\'autre.'), rainbow: true },
];

// ---------- Fumées de drift ----------
export const SMOKES = [
  { id: 'standard', name: t('D\'ORIGINE'), price: 0, desc: t('Teintée de la couleur néon de ta voiture.'), colors: ['glow', '#b9a8ff'] },
  { id: 'pure', name: t('NÉON PUR'), price: 400, desc: t('Uniquement ta couleur néon, très vive.'), colors: ['glow'] },
  { id: 'white', name: t('BLANCHE'), price: 400, desc: t('La fumée blanche des pneus qui fondent.'), colors: ['#f2f0ff', '#dcd8f0'] },
  { id: 'embers', name: t('BRAISES'), price: 750, desc: t('Fumée orange et étincelles brûlantes.'), colors: ['#ff6a00', '#ffb000'], sparks: '#ffd34d' },
  { id: 'duo', name: t('BICOLORE'), price: 750, desc: t('Ta couleur de carrosserie et ton accent.'), colors: ['body', 'accent'] },
  { id: 'sparkle', name: t('ÉTINCELLES'), price: 1100, desc: t('Une gerbe d\'étincelles à chaque drift.'), colors: ['glow', '#b9a8ff'], sparks: '#fff6c2' },
  { id: 'rainbow', name: t('ARC-EN-CIEL'), price: 1800, desc: t('Un drift aux couleurs de l\'arc-en-ciel.'), rainbow: true },
];

// ---------- Numéro de course (gratuit) ----------
export const NUMBER_STYLES = [
  { id: 'roundel', name: t('PASTILLE') },   // rond blanc, chiffres foncés (course classique)
  { id: 'neon', name: t('NÉON') },          // chiffres lumineux couleur accent
  { id: 'bold', name: t('GÉANT') },         // grands chiffres blancs cerclés
];

// ---------- Offres du jour ----------
export const OFFERS = {
  // Lots de fragments d'une voiture : prix dégressif
  fragmentBundles: [
    { amount: 5, price: 160 },
    { amount: 10, price: 300 },
    { amount: 20, price: 560 },
  ],
  featuredDiscount: 0.3,   // l'offre spéciale est à -30 %
  styleDiscount: 0.2,      // le cosmétique du jour est à -20 %
  packDiscount: 0.2,       // le pack du jour est à -20 %
};
