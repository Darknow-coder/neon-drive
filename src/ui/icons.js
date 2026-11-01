// Icônes du jeu, dessinées sur mesure en SVG (aucun émoji : même rendu
// sur tous les appareils, cohérent avec le style néon).

const TROPHY = `
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff3b0"/><stop offset="0.45" stop-color="#ffd34d"/><stop offset="1" stop-color="#ff8a3d"/>
    </linearGradient>
  </defs>
  <path d="M9 4h14v7a7 7 0 0 1-14 0z" fill="url(#tg)" stroke="#fff6cf" stroke-width="1.2"/>
  <path d="M9 6H5v2.5A4.5 4.5 0 0 0 9.6 13M23 6h4v2.5A4.5 4.5 0 0 1 22.4 13" fill="none" stroke="#ffd34d" stroke-width="2" stroke-linecap="round"/>
  <path d="M14 17.5h4v4h-4z" fill="#ff9f43"/>
  <path d="M10 26.5h12l-1.5-5h-9z" fill="url(#tg)" stroke="#fff6cf" stroke-width="1"/>
  <path d="M16 6.5l1.2 2.5 2.7.3-2 1.9.5 2.7-2.4-1.3-2.4 1.3.5-2.7-2-1.9 2.7-.3z" fill="#fff8dc" opacity="0.9"/>
</svg>`;

const CREDIT = `
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b8fbff"/><stop offset="0.5" stop-color="#00f0ff"/><stop offset="1" stop-color="#2b6bff"/>
    </linearGradient>
  </defs>
  <path d="M16 2l12 7v14l-12 7-12-7V9z" fill="url(#cg)" stroke="#e8feff" stroke-width="1.2"/>
  <path d="M16 6.5l8.2 4.8v9.4L16 25.5l-8.2-4.8v-9.4z" fill="#0b1a4a" opacity="0.85"/>
  <path d="M17.6 8.5l-5.3 8.3h3.6l-1.5 6.7 5.6-9h-3.7z" fill="#7af7ff" stroke="#e8feff" stroke-width="0.6" stroke-linejoin="round"/>
</svg>`;

const LOCK = `
<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#ff9f43"/>
    </linearGradient>
  </defs>
  <path d="M10 14v-3.5a6 6 0 0 1 12 0V14" fill="none" stroke="#ffd34d" stroke-width="3" stroke-linecap="round"/>
  <rect x="6.5" y="13.5" width="19" height="15" rx="3.5" fill="url(#lg)" stroke="#fff3c4" stroke-width="1.2"/>
  <circle cx="16" cy="19.5" r="2.4" fill="#3a1d05"/>
  <path d="M15 21h2l.6 4h-3.2z" fill="#3a1d05"/>
</svg>`;

// Icônes au trait (couleur héritée : currentColor) pour le menu
const line = (body) => `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SHOP = line('<path d="M6 11h20l-2 15H8z"/><path d="M11 11V8a5 5 0 0 1 10 0v3"/><path d="M13 17h6"/>');
const MISSIONS = line('<circle cx="16" cy="16" r="11"/><circle cx="16" cy="16" r="6"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/><path d="M24 8l3-3M27 5v4h-4"/>');
const ROAD = line('<path d="M6 27c4-6 3-10 8-13s9-3 12-9"/><path d="M5 5v8"/><path d="M5 5h7l-1.5 2.5L12 10H5"/><circle cx="26" cy="5" r="1.6" fill="currentColor"/>');
const GARAGE = line('<path d="M4 27V12l12-7 12 7v15"/><path d="M9 27v-9h14v9"/><path d="M9 22h14"/>');
const CUP = line('<path d="M10 5h12v6a6 6 0 0 1-12 0z"/><path d="M10 7H6v2a4 4 0 0 0 4 4M22 7h4v2a4 4 0 0 1-4 4"/><path d="M16 17v4M11 27h10l-1-6h-8z"/>');
const ELIM = line('<path d="M5 25h4V15H5zM13 25h4V9h-4zM21 25h4V5h-4z"/><path d="M4 5l7 7M11 5l-7 7" stroke="#ff2b5a"/>');
const CHRONO = line('<circle cx="16" cy="18" r="10"/><path d="M16 18l5-4"/><path d="M13 4h6M16 4v4"/><path d="M25 8l2-2"/>');
const EVENT = line('<path d="M16 4l3.5 7.2 7.9 1.1-5.7 5.6 1.4 7.9L16 22l-7.1 3.8 1.4-7.9-5.7-5.6 7.9-1.1z"/>');
const GEAR = line('<circle cx="16" cy="16" r="4"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/>');
const PLAY = '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M10 6l16 10-16 10z" fill="currentColor"/></svg>';
const TRAIN = line('<path d="M6 26h20"/><path d="M8 26V14l8-6 8 6v12"/><path d="M13 26v-6h6v6"/>');

const DICE = line('<rect x="5" y="5" width="22" height="22" rx="5"/><circle cx="11" cy="11" r="1.6" fill="currentColor"/><circle cx="21" cy="11" r="1.6" fill="currentColor"/><circle cx="16" cy="16" r="1.6" fill="currentColor"/><circle cx="11" cy="21" r="1.6" fill="currentColor"/><circle cx="21" cy="21" r="1.6" fill="currentColor"/>');
const EDIT = line('<path d="M6 26l1.5-6L21 6.5l4.5 4.5L12 24.5z"/><path d="M18 9.5l4.5 4.5"/>');
const MEDAL = line('<path d="M10 4l4 8M22 4l-4 8"/><circle cx="16" cy="20" r="8"/><path d="M16 15.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="currentColor" stroke="none"/>');
const STATS = line('<path d="M5 27h22"/><path d="M8 27V17h4v10M14 27V9h4v18M20 27V13h4v14"/>');

const PASS = line('<path d="M4 9a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v3a3 3 0 0 0 0 6v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3a3 3 0 0 0 0-6z"/><path d="M12 7v16" stroke-dasharray="2 2.5"/><path d="M19.5 11.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" fill="currentColor" stroke="none"/>');

const STAR = '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 3l3.9 8 8.8 1.2-6.4 6.2 1.6 8.8L16 23l-7.9 4.2 1.6-8.8-6.4-6.2 8.8-1.2z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const CAREER = line('<path d="M6 27V5"/><path d="M6 6h16l-3 5 3 5H6"/><path d="M11 27h12"/>');

const SVGS = { star: STAR, career: CAREER, pass: PASS, dice: DICE, edit: EDIT, medal: MEDAL, stats: STATS, trophy: TROPHY, credit: CREDIT, lock: LOCK, shop: SHOP, missions: MISSIONS, road: ROAD, garage: GARAGE, cup: CUP, elim: ELIM, chrono: CHRONO, event: EVENT, gear: GEAR, play: PLAY, train: TRAIN };

/** Icône en ligne (HTML). `cls` : classe supplémentaire (taille…). */
export function ico(name, cls = '') {
  return `<span class="ico ico-${name} ${cls}">${SVGS[name]}</span>`;
}

/** Montant de crédits avec l'icône. */
export const credits = (n) => `${ico('credit')}<b class="cr-num">${n}</b>`;

/** Image (pour dessiner l'icône dans un canvas). */
const images = {};
export function iconImage(name) {
  if (!images[name]) {
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(SVGS[name])}`;
    images[name] = img;
  }
  return images[name];
}
