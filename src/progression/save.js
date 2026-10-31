// Sauvegarde locale de la progression.
//
// Sécurités :
//  - les données sont VERSIONNÉES (champ `version`) : une future version du jeu
//    saura convertir une ancienne sauvegarde au lieu de l'effacer ;
//  - avant chaque écriture, la sauvegarde précédente est copiée dans une
//    sauvegarde de secours ;
//  - au chargement, les données sont vérifiées champ par champ ; si elles sont
//    abîmées, on essaie la copie de secours, puis on repart de zéro ;
//  - si le stockage est indisponible (navigation privée, mémoire pleine…),
//    le jeu continue normalement et prévient le joueur.

const KEY = 'neondrive.save';
const BACKUP_KEY = 'neondrive.save.backup';
export const SAVE_VERSION = 2;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    trophies: 0,
    stats: { races: 0, wins: 0, podiums: 0 },
    selectedCar: 'nova',
    lastTrackId: null,
    bestLaps: {},            // { idCircuit: { idVoiture: temps } }
    history: [],             // 10 dernières courses
    garage: {
      owned: ['nova'],       // voitures possédées (paliers, et plus tard boutique…)
      liveries: {},          // { idVoiture: { body, accent } }
    },
    settings: { music: 0.7, sfx: 0.85, vibration: true },
    // Prévu pour plus tard : fragments, améliorations, saisons, monnaie…
    createdAt: Date.now(),
  };
}

// --- Vérification / réparation des données ---
const num = (v, d = 0) => (typeof v === 'number' && isFinite(v) && v >= 0 ? v : d);

function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const s = defaultSave();
  s.version = SAVE_VERSION;
  s.trophies = Math.floor(num(raw.trophies));
  s.stats.races = Math.floor(num(raw.stats?.races));
  s.stats.wins = Math.floor(num(raw.stats?.wins));
  s.stats.podiums = Math.floor(num(raw.stats?.podiums));
  if (typeof raw.selectedCar === 'string') s.selectedCar = raw.selectedCar;
  if (typeof raw.lastTrackId === 'string') s.lastTrackId = raw.lastTrackId;
  if (raw.bestLaps && typeof raw.bestLaps === 'object') {
    for (const [t, cars] of Object.entries(raw.bestLaps)) {
      if (!cars || typeof cars !== 'object') continue;
      for (const [c, time] of Object.entries(cars)) {
        if (num(time, -1) > 0) (s.bestLaps[t] ??= {})[c] = time;
      }
    }
  }
  if (Array.isArray(raw.history)) s.history = raw.history.filter((h) => h && typeof h === 'object').slice(-10);
  if (raw.settings && typeof raw.settings === 'object') {
    const vol = (v, d) => (typeof v === 'number' && v >= 0 && v <= 1 ? v : d);
    s.settings.music = vol(raw.settings.music, s.settings.music);
    s.settings.sfx = vol(raw.settings.sfx, s.settings.sfx);
    if (typeof raw.settings.vibration === 'boolean') s.settings.vibration = raw.settings.vibration;
  }
  const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  if (raw.garage && typeof raw.garage === 'object') {
    if (Array.isArray(raw.garage.owned)) {
      const owned = raw.garage.owned.filter((id) => typeof id === 'string');
      s.garage.owned = [...new Set(['nova', ...owned])];
    }
    if (raw.garage.liveries && typeof raw.garage.liveries === 'object') {
      for (const [id, l] of Object.entries(raw.garage.liveries)) {
        if (!l || typeof l !== 'object') continue;
        const clean = {};
        if (isColor(l.body)) clean.body = l.body;
        if (isColor(l.accent)) clean.accent = l.accent;
        if (Object.keys(clean).length) s.garage.liveries[id] = clean;
      }
    }
  }
  s.createdAt = num(raw.createdAt, Date.now());
  return s;
}

/** Conversion des anciennes versions (aucune pour l'instant). */
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  // Version 1 → 2 : apparition du garage. Les voitures dont le palier de
  // trophées est déjà atteint seront ajoutées par syncUnlocks au chargement.
  if (raw.version === 1 && !raw.garage) {
    raw.garage = { owned: ['nova'], liveries: {} };
    raw.version = 2;
  }
  // Pour le futur : if (raw.version === 2) { …; raw.version = 3; }
  return raw;
}

/**
 * @param storage objet compatible localStorage (injectable pour les tests)
 */
export function createSaveStore(storage = safeLocalStorage()) {
  let available = !!storage;
  let lastError = null;

  function read(key) {
    try {
      const txt = storage.getItem(key);
      if (!txt) return null;
      return sanitize(migrate(JSON.parse(txt)));
    } catch (e) {
      lastError = e;
      return null;
    }
  }

  function load() {
    if (!available) return { data: defaultSave(), status: 'unavailable' };
    const main = read(KEY);
    if (main) return { data: main, status: 'ok' };
    let hadMain = false;
    try { hadMain = !!storage.getItem(KEY); } catch { /* ignoré */ }
    const backup = read(BACKUP_KEY);
    if (backup) return { data: backup, status: 'restored' };
    return { data: defaultSave(), status: hadMain ? 'reset' : 'new' };
  }

  function save(data) {
    if (!available) return false;
    try {
      const prev = storage.getItem(KEY);
      if (prev) storage.setItem(BACKUP_KEY, prev);
      storage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      lastError = e;
      return false;
    }
  }

  function wipe() {
    try { storage.removeItem(KEY); storage.removeItem(BACKUP_KEY); } catch { /* ignoré */ }
  }

  return { load, save, wipe, get available() { return available; }, get lastError() { return lastError; } };
}

function safeLocalStorage() {
  try {
    const s = globalThis.localStorage;
    const k = '__nd_test__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}
