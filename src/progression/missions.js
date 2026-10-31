// Règles des missions (sans affichage, testées dans tools/progressionCheck.js).

import { DAILY_TEMPLATES, WEEKLY_TEMPLATES, DAILY_COUNT, DAILY_BONUS } from '../data/missions.js';
import { getCar } from '../data/cars.js';
import { getTrackData } from '../data/tracks/index.js';
import { leagueFor } from '../data/progression.js';
import { tracksForLeague } from './progression.js';
import { openPack, fragmentsOf } from './economy.js';
import { bestFragmentTarget, dayKey } from './shop.js';
import { mulberry32 } from '../core/math.js';

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Clé de la semaine : date du lundi (heure locale). */
export function weekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
}
export function msUntilWeekEnd(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7);
  return d - date;
}

function makeMission(tpl, target, extra, id) {
  let text = tpl.text.replace('{n}', target);
  if (extra.trackId) text = text.replace('{track}', getTrackData(extra.trackId).name);
  if (extra.carId) text = text.replace('{car}', getCar(extra.carId).name);
  return { id, type: tpl.type, target, progress: 0, text, reward: { ...tpl.reward }, claimed: false, ...extra };
}

export function generateDaily(save, day) {
  const rng = mulberry32(hash(`m|${day}|${save.createdAt}`));
  const league = leagueFor(save.trophies).id;
  const pool = DAILY_TEMPLATES.filter((t) => t.type !== 'car' || save.garage.owned.length > 1);
  const chosen = [];
  while (chosen.length < DAILY_COUNT && pool.length) {
    chosen.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  }
  return chosen.map((tpl, k) => {
    const target = tpl.targets[Math.floor(rng() * tpl.targets.length)];
    const extra = {};
    if (tpl.type === 'track') {
      const tracks = tracksForLeague(league);
      extra.trackId = tracks[Math.floor(rng() * tracks.length)].id;
    }
    if (tpl.type === 'car') {
      const others = save.garage.owned.filter((id) => id !== save.selectedCar);
      extra.carId = others[Math.floor(rng() * others.length)] ?? save.garage.owned[0];
    }
    const m = makeMission(tpl, target, extra, `d${k}`);
    // Récompense légèrement plus forte pour les objectifs plus durs
    const tier = tpl.targets.indexOf(target);
    if (m.reward.credits) m.reward.credits = Math.round(m.reward.credits * (1 + tier * 0.4));
    return m;
  });
}

export function generateWeekly(save, week) {
  const rng = mulberry32(hash(`w|${week}|${save.createdAt}`));
  const tpl = WEEKLY_TEMPLATES[Math.floor(rng() * WEEKLY_TEMPLATES.length)];
  return makeMission(tpl, tpl.targets[0], {}, 'w0');
}

/** Renouvelle les missions si le jour / la semaine ont changé. */
export function refreshMissions(save, date = new Date()) {
  const day = dayKey(date), week = weekKey(date);
  let changed = false;
  if (save.missions.day !== day) {
    save.missions.day = day;
    save.missions.daily = generateDaily(save, day);
    save.missions.bonusClaimed = false;
    changed = true;
  }
  if (save.missions.week !== week || !save.missions.weekly) {
    save.missions.week = week;
    save.missions.weekly = generateWeekly(save, week);
    changed = true;
  }
  return changed;
}

/** Combien une course fait progresser une mission. */
function gain(m, r) {
  switch (m.type) {
    case 'races': return 1;
    case 'top3': return r.position <= 3 ? 1 : 0;
    case 'win': return r.position === 1 ? 1 : 0;
    case 'overtakes': return r.overtakes;
    case 'rival': return r.rivalBeaten ? 1 : 0;
    case 'clean': return r.clean ? 1 : 0;
    case 'pads': return r.pads;
    case 'track': return r.trackId === m.trackId && r.position <= 3 ? 1 : 0;
    case 'car': return r.carId === m.carId && r.position <= 4 ? 1 : 0;
    case 'credits': return r.credits;
    default: return 0;
  }
}

/**
 * Applique le résultat d'une course classée aux missions.
 * Retourne les missions qui ont progressé : [{ mission, before, after, done }].
 */
export function applyMissionProgress(save, r) {
  const changes = [];
  for (const m of [...save.missions.daily, save.missions.weekly].filter(Boolean)) {
    if (m.progress >= m.target) continue;
    const g = gain(m, r);
    if (g <= 0) continue;
    const before = m.progress;
    m.progress = Math.min(m.target, m.progress + g);
    changes.push({ mission: m, before, after: m.progress, done: m.progress >= m.target });
  }
  return changes;
}

const isDone = (m) => m && m.progress >= m.target;

export const allDailyDone = (save) => save.missions.daily.length > 0 && save.missions.daily.every(isDone);

/** Nombre de récompenses à récupérer (pastille du menu). */
export function missionsBadge(save) {
  let n = [...save.missions.daily, save.missions.weekly].filter((m) => isDone(m) && !m.claimed).length;
  if (allDailyDone(save) && !save.missions.bonusClaimed) n++;
  return n;
}

function grant(save, reward, rng) {
  const got = { credits: 0, packId: null, gains: [] };
  if (reward.credits) { save.credits += reward.credits; got.credits = reward.credits; }
  if (reward.fragments) {
    const car = bestFragmentTarget(save);
    save.cars.fragments[car.id] = fragmentsOf(save, car.id) + reward.fragments;
    got.gains = [{ carId: car.id, amount: reward.fragments, car }];
  }
  if (reward.pack) { got.packId = reward.pack; got.gains = openPack(save, reward.pack, rng); }
  return got;
}

/** Récupère la récompense d'une mission terminée. */
export function claimMission(save, id, rng) {
  const m = [...save.missions.daily, save.missions.weekly].find((x) => x && x.id === id);
  if (!m || !isDone(m) || m.claimed) return null;
  m.claimed = true;
  if (save.career) save.career.missionsDone++;
  return grant(save, m.reward, rng);
}

/** Bonus quand les 3 missions du jour sont terminées. */
export function claimDailyBonus(save, rng) {
  if (!allDailyDone(save) || save.missions.bonusClaimed) return null;
  save.missions.bonusClaimed = true;
  return grant(save, DAILY_BONUS, rng);
}
