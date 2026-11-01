// Règles du passe de saison (sans affichage, testable).

import { SEASON, tierCost, BONUS_XP, BONUS_REWARDS, XP, TIER_REWARDS } from '../data/season.js';
import { openPack, fragmentsOf } from './economy.js';
import { bestFragmentTarget } from './shop.js';
import { dayKey } from './shop.js';
import { getCar } from '../data/cars.js';

// XP cumulée nécessaire pour atteindre chaque niveau (index = niveau)
const CUM = [0];
for (let n = 1; n <= SEASON.tiers; n++) CUM.push(CUM[n - 1] + tierCost(n));
export const TOTAL_XP = CUM[SEASON.tiers];

/** Niveau atteint et progression vers le suivant. */
export function seasonLevel(xp) {
  let level = 0;
  while (level < SEASON.tiers && xp >= CUM[level + 1]) level++;
  if (level >= SEASON.tiers) {
    const over = xp - TOTAL_XP;
    return { level, max: true, into: over % BONUS_XP, need: BONUS_XP, bonusEarned: Math.floor(over / BONUS_XP) };
  }
  return { level, max: false, into: xp - CUM[level], need: tierCost(level + 1), bonusEarned: 0 };
}

export const xpForLevel = (n) => CUM[Math.min(n, SEASON.tiers)];

/** Remet à zéro le compteur du jour (bonus x2) si on a changé de jour. */
function refreshDay(save, day) {
  if (save.pass.day !== day) { save.pass.day = day; save.pass.dayRaces = 0; save.pass.ttXp = 0; }
}

/**
 * Ajoute de l'XP. `race: true` : compte pour le bonus x2 du jour.
 * Retourne { gained, doubled, before, after } (niveaux avant / après).
 */
export function addSeasonXp(save, amount, { race = false, day = dayKey() } = {}) {
  refreshDay(save, day);
  let gained = Math.max(0, Math.round(amount));
  let doubled = false;
  if (race && gained > 0) {
    if (save.pass.dayRaces < XP.dailyDoubleRaces) { gained *= 2; doubled = true; }
    save.pass.dayRaces++;
  }
  const before = seasonLevel(save.pass.xp).level;
  save.pass.xp += gained;
  const after = seasonLevel(save.pass.xp).level;
  return { gained, doubled, before, after, xp: save.pass.xp };
}

/** XP d'une course selon le mode et la place. */
export function raceXp(mode, position, drivers = 6) {
  if (mode === 'event') return XP.event(position, drivers);
  return XP.race[Math.min(position, XP.race.length) - 1] ?? XP.race[XP.race.length - 1];
}

/** Courses à XP doublée restantes aujourd'hui. */
export function doubleRacesLeft(save, day = dayKey()) {
  return save.pass.day === day ? Math.max(0, XP.dailyDoubleRaces - save.pass.dayRaces) : XP.dailyDoubleRaces;
}

/** XP d'un tour de chrono (plafonnée chaque jour). */
export function addTimeTrialLapXp(save, day = dayKey()) {
  refreshDay(save, day);
  const room = Math.max(0, XP.ttLapDailyCap - save.pass.ttXp);
  const amount = Math.min(XP.ttLap, room);
  save.pass.ttXp += amount;
  return addSeasonXp(save, amount, { day });
}

// ---------------------------------------------------------------- Récompenses
export function tierStatus(save) {
  const lvl = seasonLevel(save.pass.xp).level;
  return TIER_REWARDS.map((t) => ({ ...t, reached: lvl >= t.tier, claimed: save.pass.claimed.includes(t.tier) }));
}

export const bonusAvailable = (save) => Math.max(0, seasonLevel(save.pass.xp).bonusEarned - save.pass.bonusClaimed);

export function seasonBadge(save) {
  return tierStatus(save).filter((t) => t.reached && !t.claimed).length + bonusAvailable(save);
}

/** Accorde une récompense ; retourne le détail (pour l'affichage). */
export function grantSeasonReward(save, r, rng = Math.random) {
  const got = { credits: 0, packId: null, gains: [], finish: null, motif: null, avatar: null, title: null, car: null };
  if (r.credits) { save.credits += r.credits; got.credits = r.credits; }
  if (r.fragments) {
    const car = bestFragmentTarget(save);
    save.cars.fragments[car.id] = fragmentsOf(save, car.id) + r.fragments;
    got.gains = [{ carId: car.id, amount: r.fragments, car }];
  }
  if (r.pack) { got.packId = r.pack; got.gains = openPack(save, r.pack, rng); }
  if (r.finish && !save.cosmetics.finishes.includes(r.finish)) { save.cosmetics.finishes.push(r.finish); got.finish = r.finish; }
  if (r.motif && !save.cosmetics.motifs.includes(r.motif)) { save.cosmetics.motifs.push(r.motif); got.motif = r.motif; }
  if (r.avatar && !save.profile.avatars.includes(r.avatar)) { save.profile.avatars.push(r.avatar); got.avatar = r.avatar; }
  if (r.title) got.title = r.title; // (les titres se déduisent des niveaux récupérés)
  if (r.car && !save.garage.owned.includes(r.car)) { save.garage.owned.push(r.car); got.car = getCar(r.car); }
  return got;
}

/** Récupère un niveau atteint. */
export function claimTier(save, tier, rng) {
  const t = tierStatus(save).find((x) => x.tier === tier);
  if (!t || !t.reached || t.claimed) return null;
  save.pass.claimed.push(tier);
  return { tier, ...grantSeasonReward(save, t.reward, rng) };
}

/** Récupère un coffre bonus (après le niveau 100). */
export function claimBonus(save, rng) {
  if (!bonusAvailable(save)) return null;
  const r = BONUS_REWARDS[save.pass.bonusClaimed % BONUS_REWARDS.length];
  save.pass.bonusClaimed++;
  return { bonus: true, ...grantSeasonReward(save, r, rng) };
}

/** Titres gagnés dans le passe (niveaux récupérés). */
export function seasonTitles(save) {
  return TIER_REWARDS.filter((t) => t.reward.title && save.pass.claimed.includes(t.tier)).map((t) => t.reward.title);
}
