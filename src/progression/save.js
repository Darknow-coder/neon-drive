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
export const SAVE_VERSION = 1;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    trophies: 0,
    stats: { races: 0, wins: 0, podiums: 0 },
    selectedCar: 'nova',
    lastTrackId: null,
    bestLaps: {},            // { idCircuit: { idVoiture: temps } }
    history: [],             // 10 dernières courses
    // Prévu pour plus tard (non utilisé pour l'instant) :
    // garage (voitures possédées, personnalisation), fragments, améliorations, saisons…
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
  s.createdAt = num(raw.createdAt, Date.now());
  return s;
}

/** Conversion des anciennes versions (aucune pour l'instant). */
function migrate(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  // Exemple pour le futur :
  // if (raw.version === 1) { raw.garage = {...}; raw.version = 2; }
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
