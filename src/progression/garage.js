// Règles du garage : voitures possédées, déblocages, couleurs.
// Aucune dépendance à l'affichage (testé dans tools/progressionCheck.js).

import { CARS, getCar } from '../data/cars.js';

/** La condition de déblocage est-elle remplie ? */
export function meetsUnlock(car, save) {
  const u = car.unlock ?? { type: 'start' };
  if (u.type === 'start') return true;
  if (u.type === 'trophies') return save.trophies >= u.min;
  return false; // boutique, fragments… : seulement via `owned`
}

export const isOwned = (save, carId) => save.garage.owned.includes(carId);

/**
 * Ajoute à la collection les voitures dont la condition vient d'être remplie.
 * Retourne la liste des voitures nouvellement débloquées.
 */
export function syncUnlocks(save) {
  const fresh = [];
  for (const car of CARS) {
    if (!isOwned(save, car.id) && meetsUnlock(car, save)) {
      save.garage.owned.push(car.id);
      fresh.push(car);
    }
  }
  return fresh;
}

/** Texte expliquant comment obtenir une voiture verrouillée. */
export function unlockLabel(car) {
  const u = car.unlock ?? { type: 'start' };
  if (u.type === 'trophies') return `Débloquée à ${u.min} trophées`;
  if (u.type === 'shop') return 'Disponible dans la boutique';
  if (u.type === 'pass') return `Récompense du niveau ${u.tier} du PASSE DE SAISON`;
  return 'Bientôt disponible';
}

/** Prochaine voiture à débloquer par les trophées (ou null). */
export function nextCarUnlock(save) {
  return CARS
    .filter((c) => c.unlock?.type === 'trophies' && !isOwned(save, c.id))
    .sort((a, b) => a.unlock.min - b.unlock.min)[0] ?? null;
}

/** Voiture qu'on ne peut obtenir que par le passe de saison (pas de fragments avant). */
export const passOnly = (car) => car.unlock?.type === 'pass';

/** Couleurs choisies par le joueur pour une voiture (sinon couleurs d'origine). */
export function liveryFor(save, carId) {
  const base = getCar(carId).colors;
  const l = save.garage.liveries[carId];
  if (!l) return { ...base, finish: base.finish ?? 'standard', motif: 'origin' };
  return {
    body: l.body ?? base.body, accent: l.accent ?? base.accent, glow: l.body ?? base.glow,
    finish: l.finish ?? base.finish ?? 'standard', motif: l.motif ?? 'origin',
  };
}

export function setLivery(save, carId, part, color) {
  const l = (save.garage.liveries[carId] ??= {});
  l[part] = color;
}

/** Voiture sélectionnée, en s'assurant qu'elle est bien possédée. */
export function selectedCar(save) {
  return isOwned(save, save.selectedCar) ? save.selectedCar : save.garage.owned[0] ?? 'nova';
}
