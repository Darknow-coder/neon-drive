// Règles de l'économie (sans affichage, testées dans tools/progressionCheck.js).

import { CREDITS, UPGRADE_COST, MAX_LEVEL, UNLOCK_FRAGMENTS, PACKS, TROPHY_ROAD } from '../data/economy.js';
import { CARS, getCar } from '../data/cars.js';
import { isOwned } from './garage.js';

// ---------- Crédits de course ----------
/** Détail des crédits gagnés pour une course classée. */
export function raceCredits({ position, driftTime = 0, overtakes = 0, clean = false, rivalBeaten = false }) {
  const lines = [];
  const add = (label, amount) => { if (amount > 0) lines.push({ label, amount }); };
  add(`${position}${position === 1 ? 're' : 'e'} place`, CREDITS.position[position - 1] ?? 0);
  add(`Drift (${Math.floor(driftTime)} s)`, Math.min(CREDITS.maxDrift, Math.floor(driftTime * CREDITS.perDriftSecond)));
  add(`Dépassements (${overtakes})`, Math.min(CREDITS.maxOvertakes, overtakes * CREDITS.perOvertake));
  if (clean) add('Course propre', CREDITS.clean);
  if (rivalBeaten) add('Rival battu', CREDITS.rival);
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

// ---------- Niveaux et améliorations ----------
export const carLevel = (save, carId) => save.cars?.levels?.[carId] ?? 1;
export const fragmentsOf = (save, carId) => save.cars?.fragments?.[carId] ?? 0;

export function upgradeCost(save, carId) {
  const lvl = carLevel(save, carId);
  return lvl >= MAX_LEVEL ? null : { level: lvl + 1, ...UPGRADE_COST[lvl + 1] };
}

/** Améliore une voiture si possible. Retourne le nouveau niveau ou une raison d'échec. */
export function upgradeCar(save, carId) {
  if (!isOwned(save, carId)) return { ok: false, reason: 'Voiture non débloquée' };
  const cost = upgradeCost(save, carId);
  if (!cost) return { ok: false, reason: 'Niveau maximum atteint' };
  if (save.credits < cost.credits) return { ok: false, reason: 'Crédits insuffisants' };
  if (fragmentsOf(save, carId) < cost.fragments) return { ok: false, reason: 'Fragments insuffisants' };
  save.credits -= cost.credits;
  save.cars.fragments[carId] -= cost.fragments;
  save.cars.levels[carId] = cost.level;
  return { ok: true, level: cost.level };
}

// ---------- Fragments : déblocage anticipé ----------
export const unlockFragments = (carId) => UNLOCK_FRAGMENTS[carId] ?? null;

export function unlockWithFragments(save, carId) {
  const need = unlockFragments(carId);
  if (isOwned(save, carId) || !need) return { ok: false, reason: 'Impossible' };
  if (fragmentsOf(save, carId) < need) return { ok: false, reason: 'Fragments insuffisants' };
  save.cars.fragments[carId] -= need;
  save.garage.owned.push(carId);
  return { ok: true };
}

// ---------- Packs ----------
/**
 * Ouvre un pack : répartit ses fragments entre plusieurs voitures.
 * Les voitures encore verrouillées sont favorisées (pour les débloquer plus tôt).
 */
export function openPack(save, packId, rng = Math.random) {
  const pack = PACKS[packId];
  if (!pack) return null;
  const weights = CARS.map((c) => ({
    id: c.id,
    // (voiture du passe de saison pas encore gagnée : pas de fragments inutiles)
    w: isOwned(save, c.id) ? (carLevel(save, c.id) >= MAX_LEVEL ? 0.2 : 1) : c.unlock?.type === 'pass' ? 0 : 2.2,
  }));
  const total = weights.reduce((s, x) => s + x.w, 0);
  const pick = () => {
    let r = rng() * total;
    for (const x of weights) { r -= x.w; if (r <= 0) return x.id; }
    return weights[weights.length - 1].id;
  };
  // Le pack est réparti en 2 à 4 lots
  const lots = Math.min(4, 2 + Math.floor(pack.fragments / 12));
  const gains = {};
  let left = pack.fragments;
  for (let k = 0; k < lots; k++) {
    const n = k === lots - 1 ? left : Math.max(1, Math.round((pack.fragments / lots) * (0.6 + rng() * 0.8)));
    const amount = Math.min(left, n);
    if (amount <= 0) break;
    const id = pick();
    gains[id] = (gains[id] ?? 0) + amount;
    left -= amount;
  }
  for (const [id, n] of Object.entries(gains)) save.cars.fragments[id] = fragmentsOf(save, id) + n;
  return Object.entries(gains).map(([carId, amount]) => ({ carId, amount, car: getCar(carId) }));
}

export function buyPack(save, packId, rng) {
  const pack = PACKS[packId];
  if (!pack || save.credits < pack.price) return { ok: false, reason: 'Crédits insuffisants' };
  save.credits -= pack.price;
  return { ok: true, gains: openPack(save, packId, rng) };
}

// ---------- Route des trophées ----------
export function roadStatus(save) {
  return TROPHY_ROAD.map((m) => ({
    ...m,
    reached: save.trophies >= m.at,
    claimed: save.road.claimed.includes(m.at),
  }));
}
export const claimableCount = (save) => roadStatus(save).filter((m) => m.reached && !m.claimed).length;

/** Récupère la récompense d'un palier. Retourne ce qui a été obtenu. */
export function claimMilestone(save, at, rng) {
  const m = TROPHY_ROAD.find((x) => x.at === at);
  if (!m || save.trophies < at || save.road.claimed.includes(at)) return null;
  save.road.claimed.push(at);
  const got = { at, credits: 0, packs: [], car: null };
  if (m.reward.credits) { save.credits += m.reward.credits; got.credits = m.reward.credits; }
  if (m.reward.car) {
    got.car = getCar(m.reward.car);
    if (!isOwned(save, m.reward.car)) save.garage.owned.push(m.reward.car);
  }
  if (m.reward.pack) got.packs.push({ id: m.reward.pack, gains: openPack(save, m.reward.pack, rng) });
  return got;
}
