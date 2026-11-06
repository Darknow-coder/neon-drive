// Page de présentation : vidéo de fond, bandeau « autre langue ».
import '@fontsource/orbitron/latin-700.css';
import '@fontsource/orbitron/latin-900.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/rajdhani/latin-ext-500.css';
import '@fontsource/rajdhani/latin-ext-700.css';
import './site.css';

// Vidéo de fond : seulement si l'appareil ne demande pas d'économiser (données, animations)
const video = document.querySelector('.hero video');
const saveData = navigator.connection?.saveData;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (video && !saveData && !calm) {
  video.src = video.dataset.src;
  video.play?.().catch(() => { /* lecture automatique refusée : l'image reste affichée */ });
}

// Bandeau discret pour proposer l'autre langue (jamais de redirection automatique)
const banner = document.querySelector('.lang-banner');
const page = document.documentElement.lang;
const want = (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
let dismissed = false;
try { dismissed = localStorage.getItem('neondrive.siteLangBanner') === '1'; } catch { /* rien */ }
if (banner && want !== page && !dismissed) {
  banner.hidden = false;
  banner.querySelector('button').addEventListener('click', () => {
    banner.hidden = true;
    try { localStorage.setItem('neondrive.siteLangBanner', '1'); } catch { /* rien */ }
  });
}
