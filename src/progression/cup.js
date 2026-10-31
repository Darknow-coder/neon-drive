// Règles de la Coupe (sans affichage, testées dans tools/progressionCheck.js).
//
// État sauvegardé (save.cup) tant que la coupe est en cours :
//   { league, tracks: [3 id], race: index de la prochaine course,
//     drivers: [ids des 4 pilotes habituels], rival: id du rival,
//     points: { nom: total }, last: { nom: place à la dernière course },
//     history: [ { trackId, order: [noms] } ] }

import { CUP_RACES, CUP_POINTS, CUP_REWARDS, CUP_LEAGUE_MUL } from '../data/cup.js';
import { AI_DRIVERS } from '../data/aiProfiles.js';
import { RIVALS } from '../data/rivals.js';
import { leagueFor } from '../data/progression.js';
import { tracksForLeague } from './progression.js';
import { openPack } from './economy.js';
import { syncUnlocks } from './garage.js';

export const PLAYER = 'TOI';

/** Démarre une nouvelle coupe dans la ligue du joueur. */
export function startCup(save, rng = Math.random) {
  const league = leagueFor(save.trophies).id;
  const pool = tracksForLeague(league).map((t) => t.id);
  // 3 circuits différents si possible (sinon jamais deux fois de suite le même)
  const tracks = [];
  const bag = [...pool];
  while (tracks.length < CUP_RACES) {
    if (!bag.length) bag.push(...pool.filter((id) => id !== tracks[tracks.length - 1]));
    tracks.push(bag.splice(Math.floor(rng() * bag.length), 1)[0]);
  }
  const drivers = AI_DRIVERS.map((d) => d.id);
  drivers.splice(Math.floor(rng() * drivers.length), 1); // le rival prend la place d'un pilote
  const rival = RIVALS[league]?.id ?? null;
  const names = [PLAYER, ...drivers.map((id) => AI_DRIVERS.find((d) => d.id === id).name), ...(rival ? [RIVALS[league].name] : [])];
  save.cup = {
    league, tracks, race: 0, drivers, rival,
    points: Object.fromEntries(names.map((n) => [n, 0])),
    last: {}, history: [],
  };
  return save.cup;
}

/** Classement général : points, puis meilleure place à la dernière course. */
export function standings(cup) {
  return Object.entries(cup.points)
    .map(([name, points]) => ({ name, points, last: cup.last[name] ?? 99 }))
    .sort((a, b) => b.points - a.points || a.last - b.last)
    .map((r, k) => ({ ...r, rank: k + 1 }));
}

/**
 * Ordre de la grille de la prochaine course (noms, de la pole à la dernière place).
 * Course 1 : tirage (le joueur dans les 3 dernières places).
 * Courses suivantes : ordre inverse du classement (le leader part dernier).
 */
export function cupGrid(cup, rng = Math.random) {
  const names = Object.keys(cup.points);
  if (cup.race === 0) {
    const ai = names.filter((n) => n !== PLAYER).sort(() => rng() - 0.5);
    const slot = names.length - 1 - Math.floor(rng() * 3);
    ai.splice(slot, 0, PLAYER);
    return ai;
  }
  return standings(cup).map((r) => r.name).reverse();
}

/**
 * Enregistre le résultat d'une course (`order` = noms dans l'ordre d'arrivée).
 * Retourne les points gagnés et l'évolution du classement.
 */
export function applyCupRace(cup, order) {
  const before = Object.fromEntries(standings(cup).map((r) => [r.name, r.rank]));
  const gained = {};
  order.forEach((name, k) => {
    if (!(name in cup.points)) return;
    gained[name] = CUP_POINTS[k] ?? 0;
    cup.points[name] += gained[name];
    cup.last[name] = k + 1;
  });
  cup.history.push({ trackId: cup.tracks[cup.race], order: [...order] });
  cup.race++;
  const after = standings(cup).map((r) => ({ ...r, gained: gained[r.name] ?? 0, move: (before[r.name] ?? r.rank) - r.rank }));
  return { gained, standings: after, finished: cup.race >= CUP_RACES };
}

/** Récompenses de fin de coupe pour une place donnée (multiplicateur de ligue inclus). */
export function cupReward(league, rank) {
  const r = CUP_REWARDS[rank - 1] ?? CUP_REWARDS[CUP_REWARDS.length - 1];
  const mul = CUP_LEAGUE_MUL[league] ?? 1;
  return { trophies: r.trophies, credits: Math.round((r.credits * mul) / 5) * 5, pack: r.pack ?? null };
}

/** Termine la coupe : distribue les récompenses, met à jour le palmarès, efface la coupe. */
export function finishCup(save, rng) {
  const cup = save.cup;
  if (!cup || cup.race < CUP_RACES) return null;
  const table = standings(cup);
  const me = table.find((r) => r.name === PLAYER);
  const reward = cupReward(cup.league, me.rank);
  const trophiesBefore = save.trophies;
  save.trophies += reward.trophies;
  save.credits += reward.credits;
  const gains = reward.pack ? openPack(save, reward.pack, rng) : [];
  const unlockedCars = syncUnlocks(save);
  save.cupStats.played++;
  if (me.rank === 1) save.cupStats.won[cup.league] = (save.cupStats.won[cup.league] ?? 0) + 1;
  if (me.rank <= 3) save.cupStats.podiums++;
  save.cup = null;
  return { rank: me.rank, table, reward, gains, league: cup.league, trophiesBefore, unlockedCars };
}

export const abandonCup = (save) => { save.cup = null; };
