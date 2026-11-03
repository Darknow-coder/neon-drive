// Accès au serveur (Supabase) sans bibliothèque : simples requêtes HTTP.
// - Compte invisible (« anonyme ») créé au premier lancement en ligne.
// - Jeton gardé dans le navigateur (clé à part de la sauvegarde) et renouvelé.
// - Toute erreur réseau est silencieuse : le jeu marche aussi hors ligne.

import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

const KEY = 'neondrive.online';
const TIMEOUT = 8000;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') ?? {}; } catch { return {}; }
}
function store(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* stockage plein : pas grave */ }
}
let state = load();

async function request(path, { method = 'POST', body, auth = true } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const headers = { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' };
    if (auth && state.access) headers.Authorization = `Bearer ${state.access}`;
    const res = await fetch(`${SUPABASE_URL}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctrl.signal });
    const txt = await res.text();
    let data = null;
    try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) { const e = new Error(data?.message || data?.msg || data?.error_description || `HTTP ${res.status}`); e.status = res.status; e.data = data; throw e; }
    return data;
  } finally {
    clearTimeout(t);
  }
}

function keepSession(d) {
  state = { ...state, access: d.access_token, refresh: d.refresh_token, expires: Date.now() + (d.expires_in ?? 3600) * 1000, userId: d.user?.id ?? state.userId };
  store(state);
}

/** Connexion : réutilise la session, la renouvelle, ou crée un compte invisible. */
export async function ensureSession() {
  if (state.access && Date.now() < state.expires - 60000) return state.userId;
  if (state.refresh) {
    try {
      keepSession(await request('/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: state.refresh }, auth: false }));
      return state.userId;
    } catch (e) {
      if (e.status !== 400 && e.status !== 401 && e.status !== 403) throw e; // réseau : on réessaiera
    }
  }
  keepSession(await request('/auth/v1/signup', { body: { data: { game: 'neon-drive' } }, auth: false }));
  return state.userId;
}

/** Appel d'une fonction du serveur (supabase/schema.sql). */
export async function rpc(fn, args = {}, { needAuth = true } = {}) {
  if (needAuth) await ensureSession();
  return request(`/rest/v1/rpc/${fn}`, { body: args, auth: needAuth || !!state.access });
}

export const onlineId = () => state.userId ?? null;
/** Dernières infos connues (affichage hors ligne). */
export const cached = () => state.me ?? null;
export function remember(me) { state = { ...state, me: { ...me, at: Date.now() } }; store(state); }
/** Oublie le compte en ligne de cet appareil (import d'une autre sauvegarde…). */
export function forget() { state = {}; store(state); }
