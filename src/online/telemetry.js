// Statistiques anonymes d'utilisation et rapports de bug.
//  - On compte des actions (partie lancée, course, mode joué…) par jour, sur
//    l'appareil, puis on envoie les totaux de temps en temps (supabase/04).
//  - Aucune donnée personnelle : pas de pseudo, pas de position, pas de texte.
//  - Le joueur peut tout désactiver (Réglages → Compte).
//  - Hors ligne : les compteurs attendent le prochain envoi (7 jours au plus).
import { rpc } from './api.js';
import { onlineAllowed } from './sync.js';
import { LANG } from '../i18n/index.js';

const KEY = 'neondrive.stats';
const MAX_DAYS = 7;
let save = null;
let timer = 0;
let sending = false;
let again = false; // un envoi demandé pendant un autre envoi : on le refait juste après

const dayKey = (d = new Date()) => d.toISOString().slice(0, 10); // jour UTC (comme le serveur)
function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
function store(q) { try { localStorage.setItem(KEY, JSON.stringify(q)); } catch { /* stockage plein */ } }
const enabled = () => !!save && save.settings.stats !== false && onlineAllowed();

/** Type d'appareil, sans aucun identifiant : « mobile 844×390 » ou « pc 1280×720 ». */
export function deviceInfo() {
  const touch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const w = Math.round(Math.max(screen.width, screen.height)), h = Math.round(Math.min(screen.width, screen.height));
  return `${touch ? 'mobile' : 'pc'} ${w}×${h}`;
}

/** Compte une action (ex. 'race'). */
export function track(kind, n = 1) {
  if (!enabled() || !/^[a-z_]{2,24}$/.test(kind)) return;
  const q = load();
  const d = dayKey();
  q[d] ??= {};
  q[d][kind] = (q[d][kind] ?? 0) + n;
  // On oublie les jours trop anciens (le serveur les refuserait)
  const keep = Object.keys(q).sort().slice(-MAX_DAYS);
  for (const k of Object.keys(q)) if (!keep.includes(k)) delete q[k];
  store(q);
  clearTimeout(timer);
  timer = setTimeout(flush, 20000); // envoi groupé, sans gêner le jeu
}

/** Envoie les compteurs en attente. */
export async function flush() {
  clearTimeout(timer);
  // Statistiques désactivées : ce qui attendait d'être envoyé est effacé
  if (save && save.settings.stats === false) { try { localStorage.removeItem(KEY); } catch { /* rien */ } return; }
  if (!enabled()) return;
  if (sending) { again = true; return; }
  const q = load();
  const events = [];
  for (const [day, kinds] of Object.entries(q)) for (const [kind, n] of Object.entries(kinds)) if (n > 0) events.push({ day, kind, n });
  if (!events.length) return;
  sending = true;
  try {
    for (let i = 0; i < events.length; i += 60) await rpc('track', { p_events: events.slice(i, i + 60) });
    // Envoyé : on retire exactement ce qui est parti (des actions ont pu s'ajouter entre-temps)
    const now = load();
    for (const e of events) {
      if (!now[e.day]) continue;
      now[e.day][e.kind] = Math.max(0, (now[e.day][e.kind] ?? 0) - e.n);
      if (!now[e.day][e.kind]) delete now[e.day][e.kind];
      if (!Object.keys(now[e.day]).length) delete now[e.day];
    }
    store(now);
  } catch { /* hors ligne : on réessaiera */ } finally {
    sending = false;
    if (again) { again = false; setTimeout(flush, 500); }
  }
}

// ---------------------------------------------------------------- Bugs
const reported = new Set();
let reportsLeft = 5; // par partie
function reportError(message, location) {
  if (!enabled() || reportsLeft <= 0) return;
  const msg = String(message || 'Erreur').slice(0, 300);
  const key = `${msg}|${location}`;
  if (reported.has(key)) return;
  reported.add(key);
  reportsLeft--;
  rpc('report_error', { p_message: msg, p_location: String(location || '').slice(0, 80), p_device: deviceInfo(), p_version: __APP_VERSION__ }).catch(() => {});
}

/** Démarre : partie lancée, appareil, langue, et surveillance des erreurs. */
export function startTelemetry(s) {
  save = s;
  track('session');
  track(deviceInfo().startsWith('mobile') ? 'device_mobile' : 'device_pc');
  track(`lang_${LANG}`);
  setTimeout(flush, 8000);
  addEventListener('error', (e) => {
    const file = (e.filename || '').split('/').pop().split('?')[0];
    reportError(e.message, file ? `${file}:${e.lineno}` : '');
  });
  addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    // Les coupures réseau ne sont pas des bugs du jeu
    if (r?.name === 'AbortError' || /fetch|network|HTTP \d/i.test(r?.message ?? '')) return;
    reportError(`Promesse : ${r?.message ?? r}`, (r?.stack ?? '').split('\n')[1]?.trim().split('/').pop() ?? '');
  });
  // Le jeu passe en arrière-plan (téléphone verrouillé, onglet changé) : on envoie
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
}
