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
export const SAVE_VERSION = 4;

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
      liveries: {},          // { idVoiture: { body, accent, finish, motif } }
    },
    settings: {
      music: 0.7, sfx: 0.85, vibration: true,
      controls: { swapped: false, autoGas: false, size: 1 },
    },
    tutorialDone: false,
    rivalsBeaten: {},        // { idRival: nombre de victoires contre lui }
    credits: 0,              // monnaie gagnée en course (crédits NEON)
    cars: { levels: {}, fragments: {} }, // niveaux d'amélioration et fragments par voiture
    road: { claimed: [] },   // paliers de la route des trophées déjà récupérés
    // Boutique : offres du jour, cadeau quotidien
    shop: { day: null, offers: [], giftDay: null, giftStreak: 0, seenDay: null },
    // Cosmétiques possédés (utilisables sur toutes les voitures)
    cosmetics: { finishes: [], motifs: [] },
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
    const c = raw.settings.controls;
    if (c && typeof c === 'object') {
      if (typeof c.swapped === 'boolean') s.settings.controls.swapped = c.swapped;
      if (typeof c.autoGas === 'boolean') s.settings.controls.autoGas = c.autoGas;
      if (typeof c.size === 'number' && c.size >= 0.7 && c.size <= 1.4) s.settings.controls.size = c.size;
    }
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
        if (typeof l.finish === 'string' && /^[a-z]{2,16}$/.test(l.finish)) clean.finish = l.finish;
        if (typeof l.motif === 'string' && /^[a-z]{2,16}$/.test(l.motif)) clean.motif = l.motif;
        if (Object.keys(clean).length) s.garage.liveries[id] = clean;
      }
    }
  }
  s.createdAt = num(raw.createdAt, Date.now());
  s.credits = Math.floor(num(raw.credits));
  if (raw.cars && typeof raw.cars === 'object') {
    for (const key of ['levels', 'fragments']) {
      const src = raw.cars[key];
      if (!src || typeof src !== 'object') continue;
      for (const [id, v] of Object.entries(src)) {
        if (num(v, -1) < 0) continue;
        s.cars[key][id] = key === 'levels' ? Math.max(1, Math.min(5, Math.floor(v))) : Math.floor(v);
      }
    }
  }
  // Boutique
  const sh = raw.shop;
  if (sh && typeof sh === 'object') {
    const isDay = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (isDay(sh.day)) s.shop.day = sh.day;
    if (isDay(sh.giftDay)) s.shop.giftDay = sh.giftDay;
    if (isDay(sh.seenDay)) s.shop.seenDay = sh.seenDay;
    s.shop.giftStreak = Math.floor(num(sh.giftStreak));
    if (Array.isArray(sh.offers)) {
      s.shop.offers = sh.offers.filter((o) => o && typeof o.id === 'string' && ['fragments', 'pack', 'finish', 'motif'].includes(o.kind) && num(o.price, -1) >= 0)
        .map((o) => ({ ...o, bought: !!o.bought }));
    }
  }
  for (const key of ['finishes', 'motifs']) {
    const arr = raw.cosmetics?.[key];
    if (Array.isArray(arr)) s.cosmetics[key] = [...new Set(arr.filter((x) => typeof x === 'string' && /^[a-z]{2,16}$/.test(x)))];
  }
  if (Array.isArray(raw.road?.claimed)) s.road.claimed = [...new Set(raw.road.claimed.filter((v) => num(v, -1) > 0))];
  if (raw.rivalsBeaten && typeof raw.rivalsBeaten === 'object') {
    for (const [k, v] of Object.entries(raw.rivalsBeaten)) if (num(v, 0) > 0) s.rivalsBeaten[k] = Math.floor(v);
  }
  // Joueur existant (sauvegarde sans ce champ, mais avec des courses) : pas de tutoriel imposé
  s.tutorialDone = typeof raw.tutorialDone === 'boolean' ? raw.tutorialDone : s.stats.races > 0;
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
  // Version 2 → 3 : apparition de l'économie (crédits, fragments, niveaux,
  // route des trophées). Les paliers déjà franchis restent à récupérer.
  if (raw.version === 2) {
    raw.credits ??= 0;
    raw.cars ??= { levels: {}, fragments: {} };
    raw.road ??= { claimed: [] };
    raw.version = 3;
  }
  // Version 3 → 4 : boutique et cosmétiques
  if (raw.version === 3) {
    raw.shop ??= { day: null, offers: [], giftDay: null, giftStreak: 0, seenDay: null };
    raw.cosmetics ??= { finishes: [], motifs: [] };
    raw.version = 4;
  }
  // Pour le futur : if (raw.version === 4) { …; raw.version = 5; }
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

// ---------------------------------------------------------------------------
// Export / import par code (pour changer d'appareil ou garder une copie).
// Format : « ND1. » + données (JSON en base64) + « . » + somme de contrôle.
// ---------------------------------------------------------------------------
function checksum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
const toB64 = (str) => btoa(unescape(encodeURIComponent(str)));
const fromB64 = (b64) => decodeURIComponent(escape(atob(b64)));

export function exportSaveCode(data) {
  const body = toB64(JSON.stringify(data));
  return `ND1.${body}.${checksum(body)}`;
}

/** Retourne la sauvegarde contenue dans le code, ou lève une erreur explicite. */
export function importSaveCode(code) {
  const clean = String(code).replace(/\s+/g, '');
  const m = /^ND1\.([A-Za-z0-9+/=]+)\.([a-z0-9]+)$/.exec(clean);
  if (!m) throw new Error("Ce n'est pas un code de sauvegarde NEON//DRIVE.");
  if (checksum(m[1]) !== m[2]) throw new Error('Code incomplet ou modifié (vérifie le copier-coller).');
  let raw;
  try { raw = JSON.parse(fromB64(m[1])); } catch { throw new Error('Code illisible.'); }
  const data = sanitize(migrate(raw));
  if (!data) throw new Error('Données invalides.');
  return data;
}
