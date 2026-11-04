// Chrono en ligne : envoi des records (avec leur fantôme), classements par
// circuit et téléchargement du fantôme d'un autre pilote.
// Tout est silencieux en cas d'erreur : le chrono marche aussi hors ligne.
import { rpc, onlineId } from './api.js';
import { canSync, syncProfile } from './sync.js';
import { loadGhost } from '../race/ghost.js';
import { getCar } from '../data/cars.js';

// Records déjà envoyés (circuit → temps) : on n'envoie que les nouveaux
const SENT = 'neondrive.ttsent';
const readSent = () => { try { return JSON.parse(localStorage.getItem(SENT) || '{}') || {}; } catch { return {}; } };
function markSent(trackId, time) {
  const s = readSent(); s[trackId] = time;
  try { localStorage.setItem(SENT, JSON.stringify(s)); } catch { /* pas grave */ }
}
/** Après import d'une sauvegarde ou suppression du profil : tout sera renvoyé. */
export function resetSent() { try { localStorage.removeItem(SENT); } catch { /* pas grave */ } }

/** Envoie un record. Retourne { status, rank? } ou null (hors ligne). */
export async function uploadRecord(save, trackId) {
  if (!canSync(save)) return null;
  const g = loadGhost(trackId);
  if (!g) return null;
  if (readSent()[trackId] === g.time) return { status: 'sent' };
  try {
    let r = await rpc('submit_tt', { p_track: trackId, p_time: g.time, p_car: g.carId ?? 'nova', p_ghost: g });
    if (r?.status === 'no_profile') { await syncProfile(save, { now: true }); r = await rpc('submit_tt', { p_track: trackId, p_time: g.time, p_car: g.carId ?? 'nova', p_ghost: g }); }
    // Réponse définitive (accepté, refusé, déjà meilleur…) : on ne renverra plus ce temps
    if (r && r.status !== 'no_profile') markSent(trackId, g.time);
    summaryCache = null;
    return r;
  } catch {
    return null; // réseau : on réessaiera au prochain lancement
  }
}

let catching = false;
/** Rattrapage : envoie les records faits hors ligne (ou avant le chrono en ligne). */
export async function uploadPending(save) {
  if (catching || !canSync(save)) return;
  catching = true;
  try {
    const sent = readSent();
    const tracks = Object.keys(save.timeTrial.best);
    for (const id of tracks) {
      const g = loadGhost(id);
      if (g && sent[id] !== g.time) {
        const r = await uploadRecord(save, id);
        if (!r) break; // hors ligne : on arrête là
      }
    }
  } finally { catching = false; }
}

// ---------------------------------------------------------------- Lecture
let summaryCache = null;
/** Ma place sur chaque circuit + meilleur ami : { trackId: {...} } (null hors ligne). */
export async function chronoSummary(save, { fresh = false } = {}) {
  if (!canSync(save)) return null;
  if (!fresh && summaryCache && Date.now() - summaryCache.at < 60000) return summaryCache.map;
  try {
    const rows = await rpc('tt_summary');
    const map = {};
    for (const r of rows) map[r.track_id] = r;
    summaryCache = { at: Date.now(), map };
    return map;
  } catch { return summaryCache?.map ?? null; }
}

/** Classement d'un circuit : scope 'world' ou 'friends'. */
export async function chronoBoard(trackId, scope) {
  return rpc('tt_leaderboard', { p_track: trackId, p_scope: scope, p_limit: 50 });
}

// Couleurs d'un fantôme venu du serveur : on ne garde que des valeurs sûres
const COLOR = /^#[0-9a-f]{3,8}$/i;
const WORD = /^[a-z]{1,16}$/;
function safeColors(c, carId) {
  const base = getCar(carId).colors;
  const ok = c && typeof c === 'object';
  return {
    body: ok && COLOR.test(c.body) ? c.body : base.body,
    accent: ok && COLOR.test(c.accent) ? c.accent : base.accent,
    glow: ok && COLOR.test(c.glow) ? c.glow : base.glow,
    finish: ok && WORD.test(c.finish) ? c.finish : (base.finish ?? 'standard'),
    motif: ok && WORD.test(c.motif) ? c.motif : 'origin',
  };
}

const ghostCache = new Map();
/** Fantôme d'un pilote sur un circuit : { ghost, name, tag, time } ou null. */
export async function fetchGhost(playerId, trackId) {
  const key = `${playerId}/${trackId}`;
  if (ghostCache.has(key)) return ghostCache.get(key);
  const r = await rpc('tt_ghost', { p_player: playerId, p_track: trackId }, { needAuth: false });
  const g = r?.ghost;
  if (!g || typeof g.data !== 'string' || !(r.time > 0)) return null;
  // Le binaire doit contenir des échantillons complets (4 × 2 octets)
  const bytes = Math.floor(g.data.length * 3 / 4) - (g.data.endsWith('==') ? 2 : g.data.endsWith('=') ? 1 : 0);
  if (bytes % 8 !== 0 || !/^[A-Za-z0-9+/]+=*$/.test(g.data)) return null;
  const carId = getCar(g.carId ?? r.car).id;
  const out = { ghost: { time: r.time, data: g.data, n: bytes / 8, carId, colors: safeColors(g.colors, carId) }, name: r.name, tag: r.tag, time: r.time, playerId };
  ghostCache.set(key, out);
  return out;
}

export const myId = onlineId;
