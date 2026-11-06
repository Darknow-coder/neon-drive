// Vérifie que chaque texte du jeu a sa traduction anglaise (src/i18n/en.js).
//  - textes du code : premier argument de chaque appel t('…') (y compris a ? 'x' : 'y')
//  - textes de la page : jouer/index.html (textes visibles, title, aria-label, placeholder)
// Usage : node tools/i18nCheck.js          → liste les manquants (échec s'il y en a)
//         node tools/i18nCheck.js --dump    → écrit tous les textes dans i18n-keys.json
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { EN } from '../src/i18n/en.js';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP = ['editor', 'tuningPanel.js', 'i18n'];

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (SKIP.includes(f)) continue;
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith('.js')) out.push(p);
  }
  return out;
}

// Lit une chaîne JS à partir de s[i] (guillemet ouvrant) ; retourne [valeur, fin]
function readString(s, i) {
  const q = s[i];
  let v = '', k = i + 1;
  while (k < s.length && s[k] !== q) {
    if (s[k] === '\\') { const n = s[k + 1]; v += n === 'n' ? '\n' : n; k += 2; continue; }
    v += s[k++];
  }
  return [v, k + 1];
}

/** Textes passés à t() dans un fichier. */
function keysOf(src) {
  const keys = [];
  const re = /(?<![\w.$])t\(/g;
  let m;
  while ((m = re.exec(src))) {
    // Premier argument : jusqu'à la virgule (ou parenthèse) de premier niveau
    let i = m.index + 2, depth = 0;
    const lits = [];
    while (i < src.length) {
      const c = src[i];
      if (c === "'" || c === '"') { const [v, e] = readString(src, i); lits.push(v); i = e; continue; }
      if (c === '`') { // gabarit : ignoré (ne devrait pas être une clé)
        i = src.indexOf('`', i + 1) + 1; continue;
      }
      if (c === '(' || c === '[' || c === '{') depth++;
      if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
      if (c === ',' && depth === 0) break;
      i++;
    }
    keys.push(...lits.filter((x) => /[A-Za-zÀ-ÿ]/.test(x)));
  }
  return keys;
}

const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", rsaquo: '›', lsaquo: '‹', hellip: '…' };
const decode = (s) => s.replace(/&(#?\w+);/g, (m, e) => ENT[e] ?? (e.startsWith('#') ? String.fromCharCode(+e.slice(1)) : m));
const norm = (s) => decode(s).replace(/\s+/g, ' ').trim();

function htmlKeys(file) {
  let h = readFileSync(join(ROOT, file), 'utf8');
  h = h.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  const keys = [];
  for (const m of h.matchAll(/>([^<>]+)</g)) { const k = norm(m[1]); if (k && /[A-Za-zÀ-ÿ]/.test(k)) keys.push(k); }
  for (const m of h.matchAll(/\s(?:title|aria-label|placeholder|alt)="([^"]*)"/g)) { const k = norm(m[1]); if (k && /[A-Za-zÀ-ÿ]/.test(k)) keys.push(k); }
  for (const m of h.matchAll(/<meta name="description" content="([^"]*)"/g)) keys.push(norm(m[1]));
  return keys;
}

const all = new Map(); // clé → fichier
for (const f of walk(join(ROOT, 'src'))) for (const k of keysOf(readFileSync(f, 'utf8'))) if (!all.has(k)) all.set(k, f.replace(ROOT, ''));
for (const k of htmlKeys('jouer/index.html')) if (!all.has(k)) all.set(k, 'jouer/index.html');

if (process.argv.includes('--dump')) {
  writeFileSync(join(ROOT, 'i18n-keys.json'), JSON.stringify([...all.entries()].map(([k, f]) => ({ k, f, en: EN[k] ?? null })), null, 1));
  console.log(`${all.size} textes écrits dans i18n-keys.json`);
}
const missing = [...all.keys()].filter((k) => EN[k] === undefined);
const unused = Object.keys(EN).filter((k) => !all.has(k));
// Les {valeurs} doivent être les mêmes dans les deux langues
const badParams = [...all.keys()].filter((k) => EN[k] !== undefined && JSON.stringify((k.match(/\{\w+\}/g) ?? []).sort()) !== JSON.stringify((EN[k].match(/\{\w+\}/g) ?? []).sort()));
console.log(`Textes : ${all.size} · traduits : ${all.size - missing.length} · manquants : ${missing.length} · inutilisés : ${unused.length} · {valeurs} différentes : ${badParams.length}`);
for (const k of missing.slice(0, 40)) console.log('  ✗ manquant :', JSON.stringify(k), '←', all.get(k));
for (const k of badParams) console.log('  ✗ {valeurs} :', JSON.stringify(k), '→', JSON.stringify(EN[k]));
if (missing.length || badParams.length) process.exit(1);
