// Traductions du jeu (français / anglais).
// Le texte FRANÇAIS sert de clé : t('Prochaine : {m}', { m }) renvoie la
// version anglaise si le jeu est en anglais (dictionnaire en.js), sinon le
// français. Les valeurs entre accolades sont remplacées.
// La langue : ?lang=en dans l'adresse > choix enregistré > langue de l'appareil.
// Changer de langue recharge la page (tout le jeu est réaffiché proprement).
import { EN } from './en.js';

const KEY = 'neondrive.lang';
const ok = (l) => l === 'fr' || l === 'en';
function detect() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'fr'; // outils de test (Node)
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (ok(q)) { localStorage.setItem(KEY, q); return q; }
    const s = localStorage.getItem(KEY);
    if (ok(s)) return s;
  } catch { /* stockage indisponible */ }
  return (navigator.language || 'fr').toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const LANG = detect();
export const LOCALE = LANG === 'fr' ? 'fr-FR' : 'en-US';
const missing = new Set();

export function t(fr, params) {
  let s = fr;
  if (LANG === 'en') {
    const e = EN[fr];
    if (e === undefined) missing.add(fr); else s = e;
  }
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
  return s;
}
/** Nombre au format de la langue (1 234 / 1,234). */
export const fmtNum = (n) => Number(n).toLocaleString(LOCALE);
/** Textes manquants dans le dictionnaire (vérification). */
export const missingKeys = () => [...missing];

export function setLang(l) {
  if (!ok(l) || l === LANG) return;
  try { localStorage.setItem(KEY, l); } catch { /* pas grave */ }
  const u = new URL(location.href); u.searchParams.delete('lang');
  location.replace(u.toString());
}

// ---------- Page HTML : textes et attributs écrits en dur ----------
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
export function translateDom(root = document.body) {
  document.documentElement.lang = LANG;
  if (LANG === 'fr') return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (tw.nextNode()) nodes.push(tw.currentNode);
  for (const n of nodes) {
    const p = n.parentNode?.nodeName;
    if (p === 'SCRIPT' || p === 'STYLE') continue;
    const k = norm(n.nodeValue);
    if (!k || !/[A-Za-zÀ-ÿ]/.test(k)) continue;
    const e = EN[k];
    if (e === undefined) { missing.add(k); continue; }
    const lead = n.nodeValue.match(/^\s*/)[0], trail = n.nodeValue.match(/\s*$/)[0];
    n.nodeValue = lead + e + trail;
  }
  root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(',')).forEach((el) => {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const e = EN[norm(v)];
      if (e !== undefined) el.setAttribute(a, e); else if (/[A-Za-zÀ-ÿ]/.test(v)) missing.add(norm(v));
    }
  });
  const title = EN[norm(document.title)];
  if (title) document.title = title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && EN[norm(meta.content)]) meta.content = EN[norm(meta.content)];
}

/** Rang : 1er / 2e (fr, fem → 1re) — 1st / 2nd / 3rd / 4th (en). */
export function ord(n, fem = false) {
  n = Number(n);
  if (LANG === 'fr') return n === 1 ? (fem ? '1re' : '1er') : `${n}e`;
  const m100 = n % 100, m10 = n % 10;
  const suf = m100 >= 11 && m100 <= 13 ? 'th' : m10 === 1 ? 'st' : m10 === 2 ? 'nd' : m10 === 3 ? 'rd' : 'th';
  return `${n}${suf}`;
}

/** Pluriel ? (français : 2 et plus · anglais : tout sauf 1, donc « 0 days »). */
export const many = (n) => (LANG === 'fr' ? n > 1 : n !== 1);
