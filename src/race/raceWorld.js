// Simulation d'une course, sans aucun dessin.
// Utilisée par le jeu ET par les outils de test (node tools/aiRace.js) :
// les deux font donc exactement la même course.

import { buildTrack, gridSlots, queryTrack } from '../track/buildTrack.js';
import { createCar, stepCar, resetCarMotion } from '../physics/carPhysics.js';
import { collideCarWithWalls, collideCarWithObstacles } from '../physics/collisions.js';
import { collideCars } from '../physics/carCollisions.js';
import { surfaceFor } from '../physics/surface.js';
import { createLapTracker, updateLapTracker } from './lapTracker.js';
import { createAiDriver } from '../ai/aiDriver.js';
import { AI_PROFILES, LEAGUE_SKILL } from '../data/aiProfiles.js';
import { createIntent } from '../core/input.js';
import { mulberry32 } from '../core/math.js';

/**
 * @param opts.track     circuit déjà construit (ou opts.trackData)
 * @param opts.entries   [{ def, name, colors?, isPlayer?, profile? }]
 *                       L'ordre du tableau = ordre sur la grille.
 * @param opts.laps      nombre de tours
 * @param opts.league    ligue (niveau des IA, fixé pour toute la course)
 * @param opts.seed      graine du hasard (courses reproductibles pour les tests)
 */
export function createRaceWorld(opts) {
  const track = opts.track ?? buildTrack(opts.trackData);
  const laps = opts.laps ?? 3;
  const rng = mulberry32(opts.seed ?? (Math.random() * 1e9) | 0);
  const skill = LEAGUE_SKILL[opts.league ?? 'bronze'];
  const slots = gridSlots(track, opts.entries.length);
  const idle = createIntent();

  const cars = opts.entries.map((e, k) => {
    const car = createCar(e.def, slots[k]);
    car.trackIndex = slots[k].index;
    car.name = e.name;
    car.isPlayer = !!e.isPlayer;
    car.livery = e.colors ?? e.def.colors;
    car.laps = createLapTracker(track);
    car.finished = false;
    car.finishTime = Infinity;
    car.position = k + 1;
    car.wallHits = 0;
    car.carHits = 0;
    if (!e.isPlayer) {
      car.ai = createAiDriver(car, track, {
        profile: AI_PROFILES[e.profile ?? 'balanced'],
        pace: skill.pace,
        mistakesMul: skill.mistakes,
        rng: mulberry32((rng() * 1e9) | 0),
      });
    }
    return car;
  });

  const world = {
    track,
    cars,
    laps,
    time: 0,          // temps depuis le départ (négatif pendant le compte à rebours)
    started: false,
    finished: false,
    countdown: opts.countdown ?? 3,
    order: cars.slice(),
    player: cars.find((c) => c.isPlayer) ?? null,
  };
  world.time = -world.countdown;

  // Positions initiales sur le tracé
  for (const car of cars) collideCarWithWalls(car, track);

  function respawn(car) {
    const q = queryTrack(track, car.x, car.y, car.trackIndex, {});
    const i = q.index;
    car.x = track.x[i];
    car.y = track.y[i];
    car.angle = Math.atan2(track.ty[i], track.tx[i]);
    resetCarMotion(car);
    car.requestRespawn = false;
  }

  // Aspiration : derrière une voiture (dans son axe, à moins de ~230 u), on
  // subit moins de résistance de l'air. Même règle pour tout le monde.
  function updateDraft(dt) {
    const L = track.length;
    for (const car of cars) {
      let best = 0;
      for (const o of cars) {
        if (o === car) continue;
        let gap = o.trackDist - car.trackDist;
        if (gap < -L / 2) gap += L;
        if (gap > L / 2) gap -= L;
        if (gap < 25 || gap > 230) continue;
        if (Math.abs(o.trackLateral - car.trackLateral) > 32) continue;
        if (o.speed < 300) continue;
        best = Math.max(best, 1 - (gap - 25) / 205);
      }
      car.draft = (car.draft || 0) + (best - (car.draft || 0)) * Math.min(1, dt * 4);
    }
  }

  /** Avance la course d'un pas. `playerIntent` = commandes du joueur. */
  function step(dt, playerIntent) {
    world.time += dt;
    if (!world.started && world.time >= 0) world.started = true;
    updateDraft(dt);

    for (const car of cars) {
      car.contactThisStep = 0;
      let input;
      if (!world.started) input = idle;
      else if (car.finished && car.isPlayer) input = car.ai ? car.ai.update(dt, world) : coastIntent(car);
      else if (car.isPlayer) input = playerIntent ?? idle;
      else input = car.ai.update(dt, world);
      stepCar(car, input, dt, surfaceFor(car, track));
    }
    collideCars(cars);
    for (const car of cars) {
      const w = collideCarWithWalls(car, track);
      const o = collideCarWithObstacles(car, track);
      car.hitThisStep = Math.max(w, o, car.contactThisStep);
      if (w > 150 || o > 150) car.wallHits++;
      if (car.contactThisStep > 150) car.carHits++;
      if (car.requestRespawn) respawn(car);

      const ev = updateLapTracker(car.laps, car.trackDist, Math.max(0, world.time));
      if (ev === 'start' && world.started) car.laps.lapStart = Math.max(0, world.time);
      if (!car.finished && car.laps.lap > laps) {
        car.finished = true;
        car.finishTime = world.time;
      }
    }
    rank();
    if (!world.finished && cars.every((c) => c.finished)) world.finished = true;
  }

  // Classement : les voitures arrivées d'abord (par temps), puis par distance parcourue
  function rank() {
    world.order.sort((a, b) => {
      if (a.finished || b.finished) {
        if (a.finished && b.finished) return a.finishTime - b.finishTime;
        return a.finished ? -1 : 1;
      }
      return b.laps.progress - a.laps.progress;
    });
    world.order.forEach((c, k) => (c.position = k + 1));
  }

  // Après l'arrivée, la voiture du joueur ralentit doucement
  const coast = createIntent();
  function coastIntent(car) {
    coast.steer = 0;
    coast.throttle = car.speed > 250 ? 0 : 0.4;
    coast.brake = 0;
    return coast;
  }

  world.step = step;
  world.respawn = respawn;
  return world;
}
