// Règles du DÉFI DU JOUR (sans affichage, testable).
// save.daily = { day, stars, best, targets, streak, lastDone, total, rewardDay }

import { DAILY_FORMATS, DAILY_TIME_FACTORS, DAILY_RULES, SURPRISE_WEATHERS, DAILY_STAR_CREDITS, STREAK_REWARDS } from '../data/daily.js';
import { TRACKS, trackVariant } from '../data/tracks/index.js';
import { CARS, getCar } from '../data/cars.js';
import { mulberry32 } from '../core/math.js';
import { dayKey } from './shop.js';
import { grantSeasonReward } from './season.js';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Jour d'avant (format AAAA-MM-JJ). */
export function previousDay(day) {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12));
}

/**
 * Le défi d'un jour : même résultat pour tout le monde (seule la date compte).
 * Retourne { day, id, format, base, track (données du circuit), reverse, weather, rule, car, laps, title }.
 */
export function dailyChallenge(day = dayKey()) {
  const rng = mulberry32(hash(`NEON-DAILY-${day}`));
  const pick = (list) => list[Math.floor(rng() * list.length)];
  const base = pick(TRACKS.filter((t) => !t.custom));
  // Format : course 40 %, remontée 20 %, élimination 15 %, chrono 25 %
  const r = rng();
  const format = r < 0.4 ? 'race' : r < 0.6 ? 'last' : r < 0.75 ? 'elim' : 'time';
  // Twist du circuit : à l'envers (35 %), météo surprise (35 %), les deux (10 %), aucun (20 %)
  const t = rng();
  const reverse = t < 0.35 || (t >= 0.7 && t < 0.8);
  let weather = null;
  if (t >= 0.35 && t < 0.8) {
    const options = SURPRISE_WEATHERS.filter((w) => w !== base.weather);
    weather = pick(options);
  }
  // Règle spéciale (pas de « même voiture » en chrono : on est seul)
  const rules = format === 'time' ? ['none', 'none', 'noBoost', 'turbo', 'ice'] : ['none', 'noBoost', 'turbo', 'ice', 'oneCar', 'oneCar'];
  const rule = pick(rules);
  // Voiture imposée : toujours pour « même voiture », sinon une fois sur deux
  const pool = CARS.filter((c) => c.unlock?.type !== 'pass');
  // (en chrono, la voiture est toujours imposée : les temps à battre sont les mêmes pour tous)
  const imposed = rng() < 0.5;
  const carPick = pick(pool).id;
  const car = rule === 'oneCar' || format === 'time' || imposed ? carPick : null;
  const id = `daily-${day}`;
  const name = `${base.name}${reverse ? ' ⇄' : ''}`;
  const track = trackVariant(base, { reverse, weather, id, name });
  if (rule === 'ice') track.gripMul = 0.72;
  const fmt = DAILY_FORMATS[format];
  return { day, id, format, base: base.id, track, reverse, weather, rule, car, laps: fmt.laps ?? null, places: fmt.places ?? null };
}

/** Règles de course à passer à la simulation. */
export function challengeRules(ch) {
  return { noBoost: ch.rule === 'noBoost', turbo: ch.rule === 'turbo' };
}

/** Temps à battre (chrono) à partir d'un temps de référence. */
export function timeTargetsFrom(ref) {
  return DAILY_TIME_FACTORS.map((f) => Math.round(ref * f * 10) / 10);
}

/** Étoiles obtenues. r = { position, finished, time } */
export function evaluateDaily(ch, r, targets) {
  if (!r) return 0;
  if (ch.format === 'time') {
    if (!r.finished || !(r.time > 0) || !targets) return 0;
    return targets.filter((x) => r.time <= x).length;
  }
  return ch.places.filter((p) => r.position <= p).length;
}

/** Remet le défi à zéro si on a changé de jour (la série est gardée). */
export function refreshDaily(save, day = dayKey()) {
  const d = save.daily;
  if (d.day === day) return false;
  d.day = day;
  d.stars = 0;
  d.best = null;
  d.targets = null;
  return true;
}

/** Série en cours (0 si un jour a été manqué). */
export function currentStreak(save, day = dayKey()) {
  const d = save.daily;
  if (!d.lastDone) return 0;
  if (d.lastDone === day || d.lastDone === previousDay(day)) return d.streak;
  return 0;
}

/** Récompense de série du jour (1er défi réussi), selon la longueur de la série. */
export const streakReward = (streak) => STREAK_REWARDS[(Math.max(1, streak) - 1) % STREAK_REWARDS.length];

/**
 * Enregistre un essai. Retourne { stars, prev, gained, credits, streak, streakReward?, newBest }.
 */
export function applyDailyResult(save, ch, r, rng = Math.random, day = ch.day) {
  refreshDaily(save, day);
  const d = save.daily;
  const stars = evaluateDaily(ch, r, d.targets);
  const prev = d.stars;
  const gained = Math.max(0, stars - prev);
  d.stars = Math.max(prev, stars);
  const credits = gained * DAILY_STAR_CREDITS;
  save.credits += credits;
  // Meilleur résultat (temps en chrono, place sinon)
  const value = ch.format === 'time' ? (r.finished ? r.time : null) : r.position;
  let newBest = false;
  if (value !== null && value !== undefined && (d.best === null || value < d.best)) { newBest = d.best !== null; d.best = Math.round(value * 1000) / 1000; }
  // Premier défi réussi du jour : la série avance et on gagne la récompense de série
  let reward = null;
  if (stars > 0 && d.lastDone !== day) {
    d.streak = d.lastDone === previousDay(day) ? d.streak + 1 : 1;
    d.lastDone = day;
    d.total++;
    const rw = streakReward(d.streak);
    reward = { reward: rw, got: grantSeasonReward(save, rw, rng) };
  }
  return { stars, prev, gained, credits, streak: d.streak, streakReward: reward, newBest, best: d.best };
}

/** Pastille du menu : défi du jour pas encore réussi. */
export const dailyBadge = (save, day = dayKey()) => (save.daily.day === day && save.daily.stars > 0 ? 0 : 1);

/** Description courte (menu). */
export function challengeSummary(ch) {
  const parts = [ch.track.name];
  if (ch.rule !== 'none') parts.push(DAILY_RULES[ch.rule].name);
  else if (ch.weather) parts.push('MÉTÉO SURPRISE');
  if (ch.car) parts.push(getCar(ch.car).name);
  return parts.join(' · ');
}
