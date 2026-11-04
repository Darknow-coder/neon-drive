// Écran de chargement : logo, vraie barre de progression (polices, icônes,
// voitures…), astuces, puis « touche l'écran pour jouer ». Ce premier geste
// permet aussi de lancer la musique (les navigateurs l'exigent).

import { t } from '../i18n/index.js';

const $ = (id) => document.getElementById(id);
const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export const TIPS = [
  t('Freine en tournant fort pour lancer un drift : il remplit ta jauge de boost.'),
  t('Finis devant le rival de ta ligue pour gagner des trophées en plus.'),
  t('Les plaques au sol donnent une poussée gratuite : vise-les !'),
  t('Reste dans l\'aspiration d\'une voiture : tu iras plus vite qu\'elle.'),
  t('En chrono, bats ton fantôme pour décrocher les médailles.'),
  t('Les succès de ton profil rapportent des crédits et des titres.'),
  t('Une course sans toucher les murs rapporte un bonus de crédits.'),
  t('Bloqué contre un mur ? Le bouton ⟲ te replace sur la piste.'),
  t('Améliore ta voiture au garage avec des crédits et des fragments.'),
  t('Chaque jour, la boutique change et un cadeau gratuit t\'attend.'),
  t('En élimination, le dernier est éliminé à chaque tour : ne traîne pas !'),
  t('Les IA ne trichent jamais : leur niveau est fixé avant le départ.'),
];

/**
 * @param tasks   [[texte, async fonction], …] exécutées dans l'ordre
 * @param skip    passe l'écran (tests automatiques)
 * @param onEnter appelé quand le joueur entre dans le jeu
 */
export async function runBoot({ tasks, version, touch, skip = false, onEnter }) {
  const el = $('boot');
  if (!el) { onEnter?.(); return; }
  $('boot-ver').textContent = `v${version}`;
  if (skip) {
    for (const [, fn] of tasks) { try { await fn(); } catch { /* sans gravité */ } }
    el.remove();
    onEnter?.();
    return;
  }

  // Astuces qui défilent
  let tipIndex = Math.floor(Math.random() * TIPS.length);
  const tip = $('boot-tip');
  const showTip = () => {
    tip.classList.remove('in');
    void tip.offsetWidth;
    tip.innerHTML = `<b>${t('ASTUCE')}</b> ${TIPS[tipIndex++ % TIPS.length]}`;
    tip.classList.add('in');
  };
  showTip();
  const tipTimer = setInterval(showTip, 4200);

  // Chargement réel, étape par étape
  const t0 = performance.now();
  const fill = $('boot-fill');
  const status = $('boot-status');
  for (let k = 0; k < tasks.length; k++) {
    const [label, fn] = tasks[k];
    status.textContent = label;
    await frame();
    try { await fn(); } catch { /* une étape ratée n'empêche pas de jouer */ }
    fill.style.width = `${((k + 1) / tasks.length) * 100}%`;
  }
  // Durée minimale : le temps de voir le logo s'allumer
  const left = 1500 - (performance.now() - t0);
  if (left > 0) await wait(left);

  status.textContent = t('Prêt !');
  el.classList.add('ready');
  const go = $('boot-go');
  go.textContent = touch ? t('TOUCHE L\'ÉCRAN POUR JOUER') : t('CLIQUE OU APPUIE SUR UNE TOUCHE');
  go.classList.remove('hidden');

  // On attend le CLIC (doigt relevé) et non le simple contact : sinon, sur
  // téléphone, le clic qui suit le contact « traverse » l'écran de chargement
  // et ouvre ce qui se trouve dessous (garage, coupe…).
  await new Promise((resolve) => {
    const done = (e) => {
      if (e.type === 'keydown' && ['Tab', 'Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      e.preventDefault?.();
      e.stopPropagation?.();
      el.removeEventListener('click', done);
      window.removeEventListener('keydown', done);
      resolve();
    };
    el.addEventListener('click', done);
    window.addEventListener('keydown', done);
  });
  clearInterval(tipTimer);
  // Pendant le fondu, l'écran de chargement continue d'avaler les appuis
  const swallow = (e) => { e.preventDefault(); e.stopPropagation(); };
  for (const t of ['click', 'pointerdown', 'pointerup', 'touchstart', 'touchend']) el.addEventListener(t, swallow, { capture: true, passive: false });
  el.classList.add('out');
  setTimeout(() => el.remove(), 650);
  onEnter?.();
}
