// Règles du contre-la-montre (sans affichage, testées dans tools/progressionCheck.js).
import { MEDALS, medalTimes } from '../data/timeTrial.js';
import { openPack } from './economy.js';

/** Meilleure médaille obtenue avec un temps donné (ou null). */
export function medalFor(trackId, time) {
  const list = medalTimes(trackId);
  if (!list || !(time > 0)) return null;
  let best = null;
  for (const m of list) if (time <= m.time) best = m;
  return best;
}

export const bestTime = (save, trackId) => save.timeTrial.best[trackId] ?? null;
export const medalsWon = (save, trackId) => save.timeTrial.medals[trackId] ?? [];

/**
 * Enregistre un tour valide. Retourne { record, previous, newMedals: [...], rewards }.
 * Chaque médaille n'est récompensée qu'une fois par circuit.
 */
export function applyTimeTrialLap(save, trackId, time, rng) {
  const previous = bestTime(save, trackId);
  const record = !previous || time < previous;
  if (record) save.timeTrial.best[trackId] = time;
  const won = new Set(medalsWon(save, trackId));
  const list = medalTimes(trackId) ?? [];
  const newMedals = list.filter((m) => time <= m.time && !won.has(m.id));
  const rewards = { credits: 0, packs: [] };
  for (const m of newMedals) {
    won.add(m.id);
    if (m.reward.credits) { save.credits += m.reward.credits; rewards.credits += m.reward.credits; }
    if (m.reward.pack) rewards.packs.push({ packId: m.reward.pack, gains: openPack(save, m.reward.pack, rng) });
  }
  // Ordre canonique des médailles
  save.timeTrial.medals[trackId] = MEDALS.map((m) => m.id).filter((id) => won.has(id));
  return { record, previous, newMedals, rewards };
}

/** Total des médailles obtenues, par type (pour l'écran du mode). */
export function medalCounts(save) {
  const out = Object.fromEntries(MEDALS.map((m) => [m.id, 0]));
  for (const list of Object.values(save.timeTrial.medals)) for (const id of list) if (id in out) out[id]++;
  return out;
}
