// Compte les tours d'une voiture.
// Un tour n'est validé que si la voiture est passée par chaque secteur du
// circuit dans l'ordre (impossible de « tricher » en faisant demi-tour sur
// la ligne). Ce module sera réutilisé pour le classement des courses.

const SECTORS = 4;

export function createLapTracker(track) {
  return {
    track,
    lap: 0,            // 0 = pas encore franchi la ligne
    sector: 0,         // dernier secteur atteint dans le tour en cours
    lastDist: null,
    lapStart: 0,
    lapTime: 0,
    lastLap: Infinity,
    bestLap: Infinity,
    progress: 0,       // distance totale parcourue (tours inclus) — pour le classement
  };
}

/** À appeler à chaque pas physique. Retourne 'lap' quand un tour est bouclé. */
export function updateLapTracker(lt, dist, time) {
  const L = lt.track.length;
  let event = null;
  if (lt.lastDist !== null) {
    const d = dist - lt.lastDist;
    // Passage de la ligne vers l'avant (on saute de la fin au début du tracé)
    if (d < -L / 2) {
      if (lt.lap === 0) {
        lt.lap = 1;
        lt.lapStart = time;
        lt.sector = 0;
        event = 'start';
      } else if (lt.sector >= SECTORS - 1) {
        lt.lastLap = time - lt.lapStart;
        lt.bestLap = Math.min(lt.bestLap, lt.lastLap);
        lt.lap += 1;
        lt.lapStart = time;
        lt.sector = 0;
        event = 'lap';
      }
    }
    // Passage en marche arrière : on annule le secteur
    if (d > L / 2) lt.sector = 0;
  }
  const sec = Math.floor((dist / L) * SECTORS);
  if (sec === lt.sector + 1) lt.sector = sec;
  lt.lastDist = dist;
  lt.lapTime = lt.lap > 0 ? time - lt.lapStart : 0;
  lt.progress = Math.max(0, lt.lap - 1) * L + (lt.lap > 0 ? dist : dist - L);
  return event;
}
