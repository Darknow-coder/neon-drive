// Règles de l'événement GIGA RUSH (sans affichage, testable).

import { EVENT, EVENT_CREDITS, EVENT_GOALS, EVENT_DRIVERS } from '../data/event.js';
import { AI_DRIVERS } from '../data/aiProfiles.js';
import { rivalFor } from '../data/rivals.js';
import { getCar } from '../data/cars.js';
import { openPack } from './economy.js';

/**
 * Plateau de la course : 19 adversaires (pilotes habituels, pilotes de
 * l'événement et rival de la ligue), grille mélangée, joueur en milieu de
 * peloton. `playerEntry` est placé dans la liste retournée.
 */
export function eventField(league, playerEntry, rng = Math.random) {
  const rv = rivalFor(league);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pool = shuffle([
    ...AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile, colors: d.colors })),
    ...EVENT_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile, colors: d.colors })),
  ]);
  // Le rival de la ligue est toujours au départ
  const field = pool.slice(0, EVENT.drivers - 1 - (rv ? 1 : 0));
  if (rv) {
    field.push({ def: getCar(rv.car), name: rv.name, profile: rv.profile, colors: rv.colors,
      isRival: true, paceMul: rv.paceMul, mistakeMul: rv.mistakeMul, skill: rv.skill });
  }
  shuffle(field);
  const slot = EVENT.startFrom - 1 + Math.floor(rng() * (EVENT.startTo - EVENT.startFrom + 1));
  field.splice(slot, 0, playerEntry);
  return field;
}

export const goalReached = (goal, position) => position <= goal.place;

/**
 * Applique le résultat d'une GIGA RUSH : crédits de la place, meilleur
 * résultat et objectifs nouvellement atteints (récompenses accordées tout de suite).
 * Retourne { credits, best, newBest, goals: [{ goal, gains, packId, credits }] }.
 */
export function applyEventResult(save, position, rng = Math.random) {
  const ev = save.event;
  ev.played++;
  const credits = EVENT_CREDITS[position - 1] ?? 0;
  save.credits += credits;
  const newBest = !ev.best || position < ev.best;
  if (newBest) ev.best = position;
  const goals = [];
  for (const g of EVENT_GOALS) {
    if (!goalReached(g, position) || ev.claimed.includes(g.id)) continue;
    ev.claimed.push(g.id);
    const got = { goal: g, credits: g.reward.credits ?? 0, gains: [], packId: null, motif: null };
    if (got.credits) save.credits += got.credits;
    if (g.reward.pack) { got.packId = g.reward.pack; got.gains = openPack(save, g.reward.pack, rng); }
    if (g.reward.motif && !save.cosmetics.motifs.includes(g.reward.motif)) {
      save.cosmetics.motifs.push(g.reward.motif);
      got.motif = g.reward.motif;
    }
    goals.push(got);
  }
  return { credits, best: ev.best, newBest, goals };
}

export const eventGoalsDone = (save) => EVENT_GOALS.filter((g) => save.event.claimed.includes(g.id)).length;
