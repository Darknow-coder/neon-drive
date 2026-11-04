// Règles du mode CARRIÈRE (sans affichage, testable).
// Sauvegarde : save.campaign = { stars: {idDéfi: 0-3}, best: {idDéfi: valeur}, done: [idChapitre], seen: [idChapitre], allStars: bool }

import { t } from '../i18n/index.js';
import { CHAPTERS, ALL_STAGES, DUEL_STARS_NEEDED, STAR_CREDITS, ALL_STARS_REWARD, TIME_START_ALLOWANCE, TIME_FACTORS, DUEL_MARGINS, stageById } from '../data/career.js';
import { NEON_TIMES } from '../data/timeTrialTargets.js';
import { CAREER_TIMES } from '../data/careerTargets.js';
import { leagueFor, leagueRank, LEAGUES } from '../data/progression.js';
import { grantSeasonReward } from './season.js';

export const MAX_STARS = ALL_STAGES.length * 3;

/** Temps à battre pour 1★, 2★, 3★ (secondes, du plus large au plus serré). */
export function timeTargets(stage) {
  // Référence : course complète d'une IA au talent de rival (tools/careerTargets.js)
  const ref = CAREER_TIMES[stage.id] ?? (NEON_TIMES[stage.track] ?? 30) * (stage.laps ?? 1) + TIME_START_ALLOWANCE;
  return TIME_FACTORS.map((f) => Math.round(ref * f * 10) / 10);
}

/**
 * Étoiles obtenues sur un défi.
 * @param r { position, finished, rivalBeaten, wallHits, time, margin }
 */
export function evaluateStage(stage, r) {
  if (!r || r.abandoned) return 0;
  const byPlace = (places) => places.filter((p) => r.position <= p).length;
  switch (stage.type) {
    case 'race': case 'last': case 'elim':
      return byPlace(stage.places);
    case 'beat':
      if (!r.rivalBeaten) return 0;
      return r.position === 1 ? 3 : r.position <= 3 ? 2 : 1;
    case 'clean': {
      if ((r.wallHits ?? 0) > 0 || r.finished === false) return 0;
      return r.position === 1 ? 3 : r.position <= 3 ? 2 : 1;
    }
    case 'time': {
      if (!r.finished || !(r.time > 0)) return 0;
      return timeTargets(stage).filter((t) => r.time <= t).length;
    }
    case 'duel':
      if (r.position !== 1) return 0;
      return DUEL_MARGINS.filter((m) => (r.margin ?? 0) >= m).length;
    default: return 0;
  }
}

const starsOf = (save, id) => save.campaign.stars[id] ?? 0;
export const totalStars = (save) => ALL_STAGES.reduce((a, s) => a + starsOf(save, s.id), 0);
export const chapterStars = (save, ch) => ch.stages.reduce((a, s) => a + starsOf(save, s.id), 0);

/** État de chaque chapitre (déblocage, étoiles, duel). */
export function campaignStatus(save) {
  const rank = leagueRank(leagueFor(save.trophies).id);
  return CHAPTERS.map((ch, k) => {
    const prevDone = k === 0 || save.campaign.done.includes(CHAPTERS[k - 1].id);
    const leagueOk = rank >= leagueRank(ch.league);
    const league = LEAGUES.find((l) => l.id === ch.league);
    const stars = chapterStars(save, ch);
    return {
      ch,
      unlocked: prevDone && leagueOk,
      lockReason: !prevDone ? t('Gagne le duel du chapitre {k}', { k }) : !leagueOk ? t('Atteins la ligue {l} ({n} trophées)', { l: league.name, n: league.min }) : '',
      stars,
      duelUnlocked: stars >= DUEL_STARS_NEEDED,
      duelStars: starsOf(save, ch.duel.id),
      done: save.campaign.done.includes(ch.id),
      seen: save.campaign.seen.includes(ch.id),
    };
  });
}

/** Chapitre à afficher en premier : le plus avancé débloqué et non terminé. */
export function currentChapter(save) {
  const st = campaignStatus(save);
  return (st.filter((s) => s.unlocked && !s.done).pop() ?? st.filter((s) => s.unlocked).pop() ?? st[0]).ch;
}

/** Nouveaux défis à jouer (pastille du menu) : chapitre débloqué jamais ouvert. */
export const campaignBadge = (save) => campaignStatus(save).filter((s) => s.unlocked && !s.seen).length;

export function markSeen(save, chId) {
  if (!save.campaign.seen.includes(chId)) save.campaign.seen.push(chId);
}

/** Meilleur résultat : temps (chrono), avance (duel) ou place. */
function better(stage, a, b) {
  if (b === undefined || b === null) return true;
  if (stage.type === 'time') return a < b;
  if (stage.type === 'duel') return a > b;
  return a < b;
}

/**
 * Enregistre le résultat d'un défi : étoiles, crédits des nouvelles étoiles,
 * fin de chapitre (récompenses), bonus des 75 étoiles.
 */
export function applyStageResult(save, stageId, r, rng = Math.random) {
  const stage = stageById(stageId);
  if (!stage) return null;
  const ch = stage.chapter;
  const stars = evaluateStage(stage, r);
  const prev = starsOf(save, stageId);
  const gained = Math.max(0, stars - prev);
  if (stars > prev) save.campaign.stars[stageId] = stars;
  const credits = gained * STAR_CREDITS * ch.n;
  save.credits += credits;
  const value = stage.type === 'time' ? r.time : stage.type === 'duel' ? (r.position === 1 ? r.margin : null) : r.position;
  let newBest = false;
  if (value !== null && value !== undefined && isFinite(value) && better(stage, value, save.campaign.best[stageId])) {
    newBest = save.campaign.best[stageId] !== undefined;
    save.campaign.best[stageId] = Math.round(value * 1000) / 1000;
  }
  // Duel gagné pour la première fois : chapitre terminé
  let chapterDone = null;
  if (stage.type === 'duel' && stars > 0 && !save.campaign.done.includes(ch.id)) {
    save.campaign.done.push(ch.id);
    chapterDone = { chapter: ch, got: grantSeasonReward(save, ch.reward, rng) };
  }
  // Toutes les étoiles
  let allStars = null;
  if (!save.campaign.allStars && totalStars(save) >= MAX_STARS) {
    save.campaign.allStars = true;
    save.credits += ALL_STARS_REWARD.credits;
    allStars = ALL_STARS_REWARD;
  }
  return { stage, stars, prev, gained, credits, newBest, best: save.campaign.best[stageId], chapterDone, allStars };
}

/** Titres gagnés en carrière (affichables dans le profil). */
export function campaignTitles(save) {
  const out = CHAPTERS.filter((c) => save.campaign.done.includes(c.id) && c.reward.title).map((c) => c.reward.title);
  if (save.campaign.allStars) out.push(ALL_STARS_REWARD.title);
  return out;
}
