// Règle de l'élimination, sans affichage (utilisée par le jeu et par tools/eliminationCheck.js).

/** À la fin de chaque tour du leader, la dernière voiture est éliminée. */
export function createEliminator(world) {
  const out = [];          // voitures éliminées, dans l'ordre
  return {
    out,
    get done() { return out.length; },
    /** Retourne la voiture éliminée à ce pas (ou null). */
    check() {
      if (!world.started || world.cars.length <= 1) return null;
      const leader = world.order[0];
      if (leader.laps.lap - 1 >= out.length + 1) {
        const last = world.order[world.order.length - 1];
        last.eliminatedLap = out.length + 1;
        world.eliminate(last);
        out.push(last);
        return last;
      }
      return null;
    },
    /** Temps estimé (s) avant la prochaine élimination. */
    timeLeft() {
      const leader = world.order[0];
      if (!world.started || !leader || leader.laps.lap < 1 || world.cars.length <= 1) return Infinity;
      return Math.max(0, world.track.length - leader.trackDist) / Math.max(leader.speed, 120);
    },
  };
}

