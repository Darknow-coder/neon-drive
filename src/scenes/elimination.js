// Mode Élimination : à la fin de chaque tour du leader, le dernier est éliminé.
// Même règle pour tout le monde. Le dernier survivant gagne.

import { createRaceScene } from './raceScene.js';
import { P_SPARK, P_FLAME } from '../render/particles.js';
import { DANGER_SECONDS, COUNTDOWN_SECONDS } from '../data/elimination.js';
import { createEliminator } from './eliminator.js';

export function createElimination({ onFinish, sfx, ...opts }) {
  const scene = createRaceScene({ ...opts, sfx, laps: 99, rival: true, quietLaps: true });
  const world = scene.world;
  const elim = createEliminator(world);
  const total = world.cars.length;
  let endTimer = -1;
  let ended = false;
  let lastBeep = -1;

  function boom(car) {
    const ps = scene.scene.particles;
    const col = (car.livery ?? car.def.colors).glow;
    for (let k = 0; k < 70; k++) {
      const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 520;
      ps.spawn(P_SPARK, car.x, car.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.4 + Math.random() * 0.6, 1.5 + Math.random() * 2.5, 0, Math.random() < 0.4 ? '#ffffff' : col);
    }
    for (let k = 0; k < 24; k++) {
      const a = Math.random() * Math.PI * 2, sp = 40 + Math.random() * 160;
      ps.spawn(P_FLAME, car.x, car.y, Math.cos(a) * sp, Math.sin(a) * sp, 0.35 + Math.random() * 0.4, 14 + Math.random() * 12, 20, Math.random() < 0.5 ? '#ff2b5a' : '#ffb000');
    }
  }

  /** Classement final : survivant(s) puis éliminés (le dernier éliminé avant). */
  function finalRows() {
    const alive = world.order.slice();
    const order = [...alive, ...elim.out.slice().reverse()];
    return order.map((car, k) => ({
      name: car.name,
      car: car.def.name,
      colors: car.livery ?? car.def.colors,
      isPlayer: car.isPlayer,
      isRival: !!car.isRival,
      finished: true,
      estimated: false,
      time: 0, gap: 0,
      bestLap: car.laps.bestLap,
      position: k + 1,
      label: k === 0 ? 'VAINQUEUR' : `Éliminé au tour ${car.eliminatedLap}`,
      stats: { drift: car.raceStats?.drift ?? 0, overtakes: car.raceStats?.overtakes ?? 0, pads: car.raceStats?.pads ?? 0, wallHits: car.wallHits ?? 0 },
    }));
  }

  /** Le joueur est éliminé : on termine la course des autres en accéléré (sans affichage). */
  function fastForward() {
    for (let k = 0; k < 120 * 600 && world.cars.length > 1; k++) {
      world.step(1 / 120);
      elim.check();
    }
  }

  return {
    ...scene,
    update(dt) {
      scene.update(dt);
      if (ended) return;
      const out = elim.check();
      if (out) {
        boom(out);
        sfx?.eliminate?.();
        if (navigator.vibrate && out.isPlayer && opts.settings?.vibration) navigator.vibrate([80, 60, 160]);
        const left = world.cars.length;
        if (out.isPlayer) {
          scene.flash(`ÉLIMINÉ ! ${left + 1}E PLACE`, 9999);
          sfx?.music?.jingle?.(left + 1 <= 3 ? 'podium' : 'finish');
          endTimer = 2.5;
        } else if (left === 1) {
          const win = world.cars[0];
          scene.flash(win.isPlayer ? 'VICTOIRE ! DERNIER SURVIVANT' : `${win.name} GAGNE`, 9999);
          if (win.isPlayer) sfx?.music?.jingle?.('victory');
          endTimer = 3;
        } else {
          // Duel final (2 voitures) : la musique monte d'un cran
          if (left === 2 && !world.player.eliminated) sfx?.music?.setFinal?.(true);
          scene.flash(`${out.isRival ? '★ ' : ''}${out.name} ÉLIMINÉ — ${left} RESTANTS`, 2.5);
        }
      }
      // Danger : le dernier est signalé avant chaque élimination
      const tl = elim.timeLeft();
      for (const c of world.cars) c.danger = false;
      const last = world.order[world.order.length - 1];
      if (tl < DANGER_SECONDS && last) last.danger = true;
      const player = world.player;
      const playerDanger = !player.eliminated && player.danger;
      if (playerDanger && tl < COUNTDOWN_SECONDS + 1) {
        const n = Math.ceil(tl);
        if (n !== lastBeep) { lastBeep = n; sfx?.dangerBeep?.(n); }
      } else lastBeep = -1;
      scene.scene.elim = player.eliminated ? null : {
        round: Math.min(elim.done + 1, total - 1), rounds: total - 1, left: world.cars.length,
        countdown: tl < COUNTDOWN_SECONDS && world.cars.length > 1 ? Math.ceil(tl) : null,
        danger: playerDanger,
      };

      if (endTimer > 0 && (endTimer -= dt) <= 0) {
        ended = true;
        if (player.eliminated) fastForward();
        onFinish?.(finalRows());
      }
    },
    isFinished: () => ended,
    isElimination: true,
  };
}
