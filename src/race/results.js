// Classement final d'une course (sans affichage).
// Les voitures encore en piste quand les résultats sont affichés reçoivent un
// temps ESTIMÉ (distance restante / vitesse moyenne) et restent classées
// derrière celles qui ont franchi la ligne.

export function computeResults(world) {
  const L = world.track.length;
  const total = world.laps * L;
  const rows = world.order.map((car) => {
    let time = car.finishTime;
    let estimated = false;
    if (!car.finished) {
      const done = Math.max(0, car.laps.progress);
      const avgSpeed = done > 0 && world.time > 0 ? done / world.time : 500;
      time = world.time + Math.max(0, total - done) / Math.max(avgSpeed, 200);
      estimated = true;
    }
    return {
      name: car.name,
      car: car.def.name,
      colors: car.livery ?? car.def.colors,
      isPlayer: car.isPlayer,
      isRival: !!car.isRival,
      finished: car.finished,
      estimated,
      time,
      bestLap: car.laps.bestLap,
    };
  });
  // Arrivés d'abord (par temps réel), puis les autres (par temps estimé)
  rows.sort((a, b) => (a.finished !== b.finished ? (a.finished ? -1 : 1) : a.time - b.time));
  const winner = rows[0].time;
  rows.forEach((r, k) => {
    r.position = k + 1;
    r.gap = r.time - winner;
  });
  return rows;
}

/** Ordre de grille aléatoire : le joueur part dans l'une des `backRows` dernières places. */
export function randomGrid(aiEntries, playerEntry, { backRows = 3, rng = Math.random } = {}) {
  const ai = aiEntries.slice();
  for (let i = ai.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ai[i], ai[j]] = [ai[j], ai[i]];
  }
  const n = ai.length + 1;
  const slot = n - 1 - Math.floor(rng() * Math.min(backRows, n));
  ai.splice(slot, 0, playerEntry);
  return ai;
}
