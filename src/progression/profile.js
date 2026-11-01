// Profil du joueur : pseudo, avatar, carrière (statistiques) et succès.
// Aucune dépendance à l'affichage (testable dans tools/progressionCheck.js).

import { ACHIEVEMENTS, ACHIEVEMENT_REWARDS, AVATARS, AVATAR_COLORS, DEFAULT_TITLE, NAME_MIN, NAME_MAX, ownsAvatar } from '../data/profile.js';
import { seasonTitles, addSeasonXp } from './season.js';
import { XP } from '../data/season.js';

/** Nettoie un pseudo ; retourne { name } ou { error }. */
export function cleanName(raw) {
  const name = String(raw ?? '').replace(/\s+/g, ' ').trim().toUpperCase();
  if (name.length < NAME_MIN) return { error: `Au moins ${NAME_MIN} caractères.` };
  if (name.length > NAME_MAX) return { error: `${NAME_MAX} caractères maximum.` };
  if (!/^[A-Z0-9À-ÖØ-Þ _.-]+$/.test(name)) return { error: 'Lettres, chiffres, espace, - _ . seulement.' };
  if (name === 'TOI') return { error: 'Choisis un autre pseudo.' };
  return { name };
}

export const playerName = (save) => save.profile.name ?? 'PILOTE';

/** Change l'identité (seuls les champs valides sont pris en compte). */
export function setIdentity(save, { name, avatar, color, title }) {
  if (name !== undefined) {
    const r = cleanName(name);
    if (r.error) return r;
    save.profile.name = r.name;
  }
  if (avatar && AVATARS.some((a) => a.id === avatar) && ownsAvatar(save, avatar)) save.profile.avatar = avatar;
  if (color && AVATAR_COLORS.includes(color)) save.profile.color = color;
  if (title !== undefined && unlockedTitles(save).includes(title)) save.profile.title = title;
  return { ok: true };
}

/**
 * Enregistre une course terminée dans la carrière (courses classées,
 * élimination et coupe ; pas l'entraînement ni le chrono).
 */
export function recordRace(save, { position, carId, trackId, mode = 'ranked' }) {
  const c = save.career;
  c.races++;
  if (position === 1) c.wins++;
  if (position <= 3) c.podiums++;
  if (mode === 'elim') { c.elimPlayed++; if (position === 1) c.elimWins++; }
  if (carId) c.carRaces[carId] = (c.carRaces[carId] ?? 0) + 1;
  if (trackId) c.trackRaces[trackId] = (c.trackRaces[trackId] ?? 0) + 1;
}

/** Temps et distance de conduite (appelé à chaque pas de la course). */
export function addDriving(save, dt, speed) {
  save.career.playTime += dt;
  if (speed > 0) save.career.distance += speed * dt;
}

/** Suivi des crédits gagnés et du record de trophées (à chaque sauvegarde). */
export function trackTotals(save, lastCredits) {
  if (save.credits > lastCredits) save.career.creditsEarned += save.credits - lastCredits;
  save.career.maxTrophies = Math.max(save.career.maxTrophies, save.trophies);
  return save.credits;
}

/** Clé la plus fréquente d'un compteur (voiture / circuit préféré). */
export function favorite(counts) {
  let best = null, n = 0;
  for (const [k, v] of Object.entries(counts)) if (v > n) { best = k; n = v; }
  return best ? { id: best, count: n } : null;
}

// ---------------------------------------------------------------- Succès
/** État de chaque succès : palier atteint, récupéré, prochain objectif. */
export function achievementStatus(save) {
  return ACHIEVEMENTS.map((a) => {
    const value = Math.max(0, a.value(save) || 0);
    const reached = a.tiers.filter((t) => value >= t).length;
    const claimed = Math.min(reached, save.achievements.claimed[a.id] ?? 0);
    const next = Math.min(claimed, 2); // palier affiché : le prochain à récupérer / atteindre
    return {
      def: a, value, reached, claimed,
      tier: next, target: a.tiers[next],
      claimable: reached > claimed,
      complete: claimed >= a.tiers.length,
      reward: ACHIEVEMENT_REWARDS[next],
    };
  });
}

export const achievementsBadge = (save) => achievementStatus(save).filter((s) => s.claimable).length;

/** Récupère le prochain palier d'un succès. Retourne { credits, title? } ou null. */
export function claimAchievement(save, id) {
  const st = achievementStatus(save).find((s) => s.def.id === id);
  if (!st || !st.claimable) return null;
  const tier = st.claimed;
  save.achievements.claimed[id] = tier + 1;
  const credits = ACHIEVEMENT_REWARDS[tier];
  save.credits += credits;
  if (save.pass) addSeasonXp(save, XP.achievement);
  const title = tier + 1 === st.def.tiers.length ? st.def.title : null;
  return { credits, title, tier: tier + 1, name: st.def.name };
}

/** Titres disponibles : celui de départ + ceux des succès terminés. */
export function unlockedTitles(save) {
  return [DEFAULT_TITLE, ...seasonTitles(save), ...ACHIEVEMENTS.filter((a) => (save.achievements.claimed[a.id] ?? 0) >= a.tiers.length).map((a) => a.title)];
}

export function currentTitle(save) {
  const t = save.profile.title;
  return t && unlockedTitles(save).includes(t) ? t : DEFAULT_TITLE;
}

/** Récupère tous les paliers disponibles. Retourne { credits, titles[], count }. */
export function claimAllAchievements(save) {
  const out = { credits: 0, titles: [], count: 0 };
  for (let guard = 0; guard < 100; guard++) {
    const st = achievementStatus(save).find((s) => s.claimable);
    if (!st) break;
    const got = claimAchievement(save, st.def.id);
    out.credits += got.credits;
    out.count++;
    if (got.title) out.titles.push(got.title);
  }
  return out;
}
