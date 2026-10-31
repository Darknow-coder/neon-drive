// Scène de course : relie la simulation (race/raceWorld.js) à l'affichage,
// aux commandes du joueur et aux effets visuels.

import { buildTrack } from '../track/buildTrack.js';
import { getTrackData } from '../data/tracks/index.js';
import { getCar } from '../data/cars.js';
import { AI_DRIVERS } from '../data/aiProfiles.js';
import { createRaceWorld } from '../race/raceWorld.js';
import { createTrackRenderer } from '../render/trackRenderer.js';
import { createParticles } from '../render/particles.js';
import { createCamera, computeBaseZoom, snapCamera, updateCamera } from '../render/camera.js';
import { createCarFx, updateCarFx } from '../render/carFx.js';
import { formatTime } from '../core/math.js';
import { computeResults, randomGrid } from '../race/results.js';

const PLAYER_COLORS = { body: '#00f0ff', accent: '#ff2bd6', glow: '#00f0ff' };

export function createRaceScene({ renderer, input, hud, lowEnd, trackId, carId, laps = 3, league = 'bronze', playerColors = PLAYER_COLORS, sfx = null, settings = { vibration: true }, solo = false, countdown = 3, onFinish }) {
  const track = buildTrack(getTrackData(trackId));
  const trackRenderer = createTrackRenderer(track, { lowEnd });
  const particles = createParticles(lowEnd ? 320 : 520);
  const camera = createCamera();

  // Grille tirée au sort : le joueur part dans l'une des 3 dernières places
  // (mode « solo » : sans adversaires, pour le tutoriel)
  const playerEntry = { def: getCar(carId), name: 'TOI', isPlayer: true, colors: playerColors };
  const entries = solo ? [playerEntry] : randomGrid(
    AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile, colors: d.colors })),
    playerEntry,
    { backRows: 3 },
  );
  let endTimer = -1; // compte à rebours avant l'affichage des résultats
  let resultsShown = false;

  let world = createRaceWorld({ track, entries, laps, league, countdown });
  let player = world.player;
  const fx = new Map(world.cars.map((c) => [c, createCarFx()]));
  let message = '';
  let messageTimer = 0;
  let lastVibrate = 0;
  let lastCount = 99;     // dernier chiffre du compte à rebours joué
  let lastPad = 0;
  let lastBoost = 0;

  const scene = { trackRenderer, cars: world.cars, particles, camera, player, time: 0 };

  function resize() {
    renderer.resize();
    camera.baseZoom = computeBaseZoom(renderer.state.cssW, renderer.state.cssH);
  }
  resize();
  snapCamera(camera, player);

  function respawn() {
    if (!world.started || player.finished) return;
    world.respawn(player);
    input.reset();
  }

  function isFinished() {
    return resultsShown;
  }

  function setCarDef(id) {
    // Changement de voiture (panneau ⚙) : on relance la course avec la nouvelle voiture
    carId = id;
    world = createRaceWorld({ track, entries: entries.map((e) => (e.isPlayer ? { ...e, def: getCar(id) } : e)), laps, league, countdown: 3 });
    player = world.player;
    fx.clear();
    world.cars.forEach((c) => fx.set(c, createCarFx()));
    scene.cars = world.cars;
    scene.player = player;
    trackRenderer.clearSkids();
    particles.clear();
    snapCamera(camera, player);
  }

  function update(dt) {
    camera.prevX = camera.x;
    camera.prevY = camera.y;
    const intent = input.update(dt);
    const lapBefore = player.laps.lap;
    world.step(dt, intent);
    scene.time = world.time;

    // Effets visuels (uniquement pour les voitures proches de la caméra)
    for (const car of world.cars) {
      const near = Math.abs(car.x - camera.x) < 1100 && Math.abs(car.y - camera.y) < 800;
      if (near) updateCarFx(fx.get(car), car, dt, particles, trackRenderer, car.hitThisStep);
    }
    const hit = player.hitThisStep;
    if (hit > 260 && settings.vibration && world.time - lastVibrate > 0.25 && navigator.vibrate) {
      navigator.vibrate(Math.min(60, hit / 10));
      lastVibrate = world.time;
    }

    // ---------- Sons ----------
    if (sfx) {
      sfx.updateCar(player, world.started || world.time > -0.5);
      if (hit > 120) sfx.hit(hit, true);
      // Chocs des adversaires proches : plus discrets
      for (const car of world.cars) {
        if (car !== player && car.hitThisStep > 200 && Math.hypot(car.x - player.x, car.y - player.y) < 500) sfx.hit(car.hitThisStep, false);
      }
      const count = world.started ? 0 : Math.ceil(-world.time);
      if (count !== lastCount && count <= 3) sfx.countdown(count);
      lastCount = count;
      if (player.padTimer > lastPad + 0.2) sfx.boostPad();
      lastPad = player.padTimer;
      if (player.boost >= 0.999 && lastBoost < 0.999) sfx.boostReady();
      lastBoost = player.boost;
    }
    particles.update(dt);
    updateCamera(camera, player, dt);

    // Messages
    if (!world.started) {
      message = String(Math.ceil(-world.time));
      messageTimer = 0.1;
    } else if (world.time < 1) {
      message = 'GO !';
      messageTimer = 0.1;
    }
    if (player.laps.lap > lapBefore && lapBefore >= 1 && !player.finished) {
      const isBest = player.laps.lastLap <= player.laps.bestLap;
      message = player.laps.lap === laps ? 'DERNIER TOUR !' : `${isBest ? 'MEILLEUR TOUR ' : 'Tour '}${formatTime(player.laps.lastLap)}`;
      messageTimer = 2.5;
      sfx?.lap(isBest);
    }
    if (player.finished && !scene.announced) {
      scene.announced = true;
      message = `ARRIVÉE — ${player.position}${player.position === 1 ? 'ER' : 'E'} / ${world.cars.length}`;
      messageTimer = 9999;
      sfx?.finish(player.position);
    } else if (!solo && !player.finished && world.playerPositionLocked() && !scene.lockedMsg) {
      scene.lockedMsg = true;
      message = 'TOUS LES ADVERSAIRES SONT ARRIVÉS';
      messageTimer = 9999;
    }
    if (messageTimer > 0 && (messageTimer -= dt) <= 0) message = '';

    // Fin de course : résultats quand tout le monde est arrivé, ou peu après
    // l'arrivée du joueur, ou si le joueur ne peut plus changer de place.
    if (!resultsShown) {
      if (endTimer < 0) {
        if (player.finished) endTimer = 5;
        else if (!solo && world.playerPositionLocked()) endTimer = 4;
      } else {
        endTimer -= dt;
        if (endTimer <= 0 || world.finished) {
          resultsShown = true;
          onFinish?.(computeResults(world));
        }
      }
    }
  }

  function render(alpha) {
    renderer.render(scene, alpha);
    hud.update({
      car: player,
      lap: Math.min(player.laps.lap, laps),
      laps,
      lapTime: player.laps.lapTime,
      bestLap: player.laps.bestLap,
      lastMsg: message,
      position: player.position,
      total: world.cars.length,
      big: !world.started || world.time < 1,
    });
  }

  function reloadGraphics() {
    trackRenderer.rebuild();
    renderer.resetSprites();
    particles.resetSprites();
  }

  function dispose() {
    trackRenderer.dispose();
    sfx?.stopCar();
  }

  return {
    update, render, resize, respawn, setCarDef, reloadGraphics, dispose, isFinished,
    trackName: track.name,
    get car() { return player; },
    get world() { return world; },
    track,
  };
}
