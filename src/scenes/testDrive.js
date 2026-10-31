// Session « test de conduite » (étape 1) : une voiture, un circuit, des tours
// chronométrés. Elle sera remplacée par la vraie course à l'étape 4, mais
// toutes les briques (physique, collisions, rendu, caméra) sont définitives.

import { buildTrack, gridSlots, queryTrack } from '../track/buildTrack.js';
import { getTrackData } from '../data/tracks/index.js';
import { getCar } from '../data/cars.js';
import { createCar, stepCar, resetCarMotion } from '../physics/carPhysics.js';
import { collideCarWithWalls } from '../physics/collisions.js';
import { createTrackRenderer } from '../render/trackRenderer.js';
import { createParticles } from '../render/particles.js';
import { createCamera, computeBaseZoom, snapCamera, updateCamera } from '../render/camera.js';
import { createCarFx, updateCarFx } from '../render/carFx.js';
import { createLapTracker, updateLapTracker } from '../race/lapTracker.js';
import { formatTime } from '../core/math.js';

export function createTestDrive({ renderer, input, hud, lowEnd, trackId, carId }) {
  const track = buildTrack(getTrackData(trackId));
  const trackRenderer = createTrackRenderer(track, { lowEnd });
  const particles = createParticles(lowEnd ? 320 : 520);
  const camera = createCamera();
  const slot = gridSlots(track, 1)[0];
  let car = createCar(getCar(carId), slot);
  let fx = createCarFx();
  let laps = createLapTracker(track);
  let time = 0;
  let message = '';
  let messageTimer = 0;
  let lastVibrate = 0;

  const scene = { trackRenderer, cars: [car], particles, camera, player: car };

  function resize() {
    renderer.resize();
    camera.baseZoom = computeBaseZoom(renderer.state.cssW, renderer.state.cssH);
  }
  resize();
  snapCamera(camera, car);

  function respawn() {
    // Replace la voiture au centre de la piste, dans le sens de la course
    const q = queryTrack(track, car.x, car.y, car.trackIndex, {});
    const i = q.index;
    car.x = track.x[i];
    car.y = track.y[i];
    car.angle = Math.atan2(track.ty[i], track.tx[i]);
    resetCarMotion(car);
    input.reset();
  }

  function setCarDef(id) {
    const old = car;
    car = createCar(getCar(id), { x: old.x, y: old.y, angle: old.angle });
    car.trackIndex = old.trackIndex;
    scene.cars = [car];
    scene.player = car;
    fx = createCarFx();
  }

  function update(dt) {
    time += dt;
    camera.prevX = camera.x;
    camera.prevY = camera.y;
    const intent = input.update(dt);
    stepCar(car, intent, dt);
    const hit = collideCarWithWalls(car, track);
    if (hit > 260 && time - lastVibrate > 0.25 && navigator.vibrate) {
      navigator.vibrate(Math.min(60, hit / 10));
      lastVibrate = time;
    }
    updateCarFx(fx, car, dt, particles, trackRenderer, hit);
    particles.update(dt);
    updateCamera(camera, car, dt);

    const ev = updateLapTracker(laps, car.trackDist, time);
    if (ev === 'lap') {
      const isBest = laps.lastLap <= laps.bestLap;
      message = `${isBest ? 'MEILLEUR TOUR ' : 'Tour '}${formatTime(laps.lastLap)}`;
      messageTimer = 3;
    }
    if (messageTimer > 0 && (messageTimer -= dt) <= 0) message = '';
  }

  function render(alpha) {
    renderer.render(scene, alpha);
    hud.update({ car, lap: laps.lap, lapTime: laps.lapTime, bestLap: laps.bestLap, lastMsg: message });
  }

  return {
    update, render, resize, respawn, setCarDef,
    get car() { return car; },
    track,
    // Accès pour les tests automatiques
    debug: { get car() { return car; }, get laps() { return laps; }, track },
  };
}
