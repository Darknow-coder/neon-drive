// Écran « Confidentialité, conditions et mentions légales » (dans le jeu)
import { LEGAL, LEGAL_UPDATED } from '../data/legal.js';

const $ = (id) => document.getElementById(id);

export function createLegalScreen() {
  let tab = 'privacy';
  function render() {
    document.querySelectorAll('.lg-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    $('lg-body').innerHTML = `<h2>${LEGAL[tab].title}</h2>${LEGAL[tab].html()}<p class="lg-date">Mise à jour : ${LEGAL_UPDATED}</p>`;
    $('lg-body').scrollTop = 0;
  }
  document.querySelectorAll('.lg-tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
  $('legal-back').addEventListener('click', () => $('legal').classList.add('hidden'));
  return { open(t = 'privacy') { tab = t; render(); $('legal').classList.remove('hidden'); } };
}
