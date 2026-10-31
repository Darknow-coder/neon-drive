// Règles de progression : trophées, ligues, choix du circuit.
// Aucune dépendance à l'affichage (testable dans tools/progressionCheck.js).

import { TROPHY_REWARDS, leagueFor, leagueRank } from '../data/progression.js';
import { TRACKS } from '../data/tracks/index.js';
import { syncUnlocks } from './garage.js';
import { RIVAL_BONUS } from '../data/rivals.js';

/** Circuits accessibles dans une ligue (ceux des ligues inférieures inclus). */
export function tracksForLeague(leagueId) {
  const r = leagueRank(leagueId);
  // (les circuits de test de l'éditeur ne sortent jamais en course classée)
  return TRACKS.filter((t) => !t.custom && leagueRank(t.league ?? 'bronze') <= r);
}

/**
 * Tire au sort le prochain circuit parmi ceux de la ligue du joueur,
 * en évitant de reprendre le même que la dernière fois (si possible).
 */
export function pickTrack(save, rng = Math.random) {
  const league = leagueFor(save.trophies);
  const pool = tracksForLeague(league.id);
  const choices = pool.length > 1 ? pool.filter((t) => t.id !== save.lastTrackId) : pool;
  return choices[Math.floor(rng() * choices.length)];
}

/**
 * Applique le résultat d'une course à la sauvegarde (la modifie) et
 * retourne un résumé pour l'écran de résultats.
 */
export function applyRaceResult(save, { position, trackId, carId, bestLap, rivalId = null, rivalBeaten = false }) {
  const before = save.trophies;
  const oldLeague = leagueFor(before);
  const base = TROPHY_REWARDS[position - 1] ?? 0;
  // Bonus pour avoir fini devant le rival de la ligue
  const rivalBonus = rivalId && rivalBeaten ? RIVAL_BONUS : 0;
  const gained = base + rivalBonus;
  save.trophies = before + gained;
  let firstRivalWin = false;
  if (rivalId && rivalBeaten) {
    firstRivalWin = !save.rivalsBeaten[rivalId];
    save.rivalsBeaten[rivalId] = (save.rivalsBeaten[rivalId] ?? 0) + 1;
  }
  const newLeague = leagueFor(save.trophies);

  save.stats.races++;
  if (position === 1) save.stats.wins++;
  if (position <= 3) save.stats.podiums++;
  save.lastTrackId = trackId;

  // Record du tour (par circuit et par voiture)
  let newRecord = false;
  let previousRecord = null;
  if (isFinite(bestLap) && bestLap > 0) {
    const rec = (save.bestLaps[trackId] ??= {});
    previousRecord = rec[carId] ?? null;
    if (!previousRecord || bestLap < previousRecord) {
      rec[carId] = bestLap;
      newRecord = true;
    }
  }

  save.history.push({ t: Date.now(), trackId, carId, position, gained });
  if (save.history.length > 10) save.history.splice(0, save.history.length - 10);

  const promoted = leagueRank(newLeague.id) > leagueRank(oldLeague.id);
  const unlockedTracks = promoted
    ? tracksForLeague(newLeague.id).filter((t) => !tracksForLeague(oldLeague.id).includes(t))
    : [];

  const unlockedCars = syncUnlocks(save);

  return { gained, base, rivalBonus, rivalId, rivalBeaten, firstRivalWin, before, after: save.trophies, oldLeague, newLeague, promoted, unlockedTracks, unlockedCars, newRecord, previousRecord };
}
