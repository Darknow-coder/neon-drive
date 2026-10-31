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

const SVGS = { trophy: TROPHY, credit: CREDIT, lock: LOCK };

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
