// Simulation d'une course, sans aucun dessin.
// Utilisée par le jeu ET par les outils de test (node tools/aiRace.js) :
// les deux font donc exactement la même course.

import { buildTrack, gridSlots, queryTrack, updateMovingObstacles } from '../track/buildTrack.js';
import { createCar, stepCar, resetCarMotion } from '../physics/carPhysics.js';
import { collideCarWithWalls, collideCarWithObstacles } from '../physics/collisions.js';
import { collideCars } from '../physics/carCollisions.js';
import { surfaceFor } from '../physics/surface.js';
import { createLapTracker, updateLapTracker } from './lapTracker.js';
import { createAiDriver } from '../ai/aiDriver.js';
import { AI_PROFILES, LEAGUE_SKILL } from '../data/aiProfiles.js';
import { RIVAL_SKILL } from '../data/rivals.js';
import { AI_CAR_LEVEL } from '../data/economy.js';
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

  // Niveau des voitures adverses : fixé par la ligue (comme leur pilotage)
  const aiLevel = AI_CAR_LEVEL[opts.league ?? 'bronze'] ?? 1;
  const cars = opts.entries.map((e, k) => {
    const car = createCar(e.def, { ...slots[k], level: e.level ?? (e.isPlayer ? 1 : aiLevel) });
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
    car.raceStats = { drift: 0, overtakes: 0, lastPos: k + 1 };
    car.isRival = !!e.isRival;
    if (!e.isPlayer) {
      const baseProfile = AI_PROFILES[e.profile ?? 'balanced'];
      car.ai = createAiDriver(car, track, {
        // Un rival garde la personnalité de son profil, avec un talent supérieur
        profile: e.isRival ? { ...baseProfile, ...RIVAL_SKILL, ...(e.skill ?? {}) } : baseProfile,
        // Un rival a un niveau propre, plus élevé (fixé avant la course)
        pace: skill.pace * (e.paceMul ?? 1),
        mistakesMul: skill.mistakes * (e.mistakeMul ?? 1),
        lineMul: e.isRival ? 0.5 : skill.line,
        driftMul: e.isRival ? 1 : skill.drift,
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

  let statTimer = 0;

  /** Avance la course d'un pas. `playerIntent` = commandes du joueur. */
  function step(dt, playerIntent) {
    world.time += dt;
    if (!world.started && world.time >= 0) world.started = true;
    updateMovingObstacles(track, Math.max(0, world.time));
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

      // Statistiques de course (pour les crédits) : temps de drift
      if (world.started && !car.finished && car.drifting) car.raceStats.drift += dt;

      const ev = updateLapTracker(car.laps, car.trackDist, Math.max(0, world.time));
      if (ev === 'start' && world.started) car.laps.lapStart = Math.max(0, world.time);
      if (!car.finished && car.laps.lap > laps) {
        car.finished = true;
        car.finishTime = world.time;
        // Après l'arrivée, la voiture du joueur est conduite automatiquement
        // (tour d'honneur) pendant que les autres terminent.
        if (car.isPlayer && !car.ai) {
          car.ai = createAiDriver(car, track, { profile: AI_PROFILES.cautious, rng: mulberry32(7) });
        }
      }
    }
    rank();
    // Dépassements : mesurés toutes les 0,5 s (après le premier virage)
    statTimer += dt;
    if (world.time > 4 && statTimer >= 0.5) {
      statTimer = 0;
      for (const c of cars) {
        if (!c.finished && c.position < c.raceStats.lastPos) c.raceStats.overtakes += c.raceStats.lastPos - c.position;
        c.raceStats.lastPos = c.position;
      }
    }
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
  /** Le joueur ne peut plus changer de place (tout le monde est arrivé sauf lui). */
  world.playerPositionLocked = () =>
    !!world.player && cars.every((c) => c.finished || c === world.player);
  world.respawn = respawn;
  return world;
}
