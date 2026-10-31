// Vérification automatique de la physique (sans affichage).
// Un pilote automatique simple fait le tour du circuit avec chaque voiture.
// Usage : node tools/physicsCheck.js
import { buildTrack, gridSlots } from '../src/track/buildTrack.js';
import { TRACKS } from '../src/data/tracks/index.js';
import { CARS } from '../src/data/cars.js';
import { createCar, stepCar } from '../src/physics/carPhysics.js';
import { collideCarWithWalls } from '../src/physics/collisions.js';
import { createLapTracker, updateLapTracker } from '../src/race/lapTracker.js';
import { wrapAngle, clamp } from '../src/core/math.js';

const DT = 1 / 120;

function autopilot(car, track) {
  const i = car.trackIndex;
  const look = Math.round((60 + car.speed * 0.35) / track.spacing);
  const j = (i + look) % track.count;
  const ang = Math.atan2(track.y[j] - car.y, track.x[j] - car.x);
  const err = wrapAngle(ang - car.angle);
  // Courbure maximale à venir → vitesse cible
  let maxC = 0;
  for (let k = 0; k < Math.round(500 / track.spacing); k++) {
    maxC = Math.max(maxC, Math.abs(track.curv[(i + k) % track.count]));
  }
  const vTarget = Math.sqrt(car.params.gripAccel * 0.85 / Math.max(maxC, 1e-4));
  return {
    steer: clamp(err * 2.5 - car.yawRate * 0.15, -1, 1),
    throttle: car.speed < vTarget ? 1 : 0,
    brake: car.speed > vTarget + 60 ? 1 : 0,
    boost: car.boost > 0.5,
  };
}

for (const td of TRACKS) {
  const track = buildTrack(td);
  console.log(`\n${td.name} — longueur ${Math.round(track.length)} u, ${track.count} échantillons`);
  // Rayon de virage minimal (doit rester > demi-largeur)
  let maxC = 0;
  for (let i = 0; i < track.count; i++) maxC = Math.max(maxC, Math.abs(track.curv[i]));
  console.log(`  rayon de virage min : ${Math.round(1 / maxC)} u (demi-largeur ~${Math.round(track.hw[0])})`);
  for (const def of CARS) {
    const slot = gridSlots(track, 1)[0];
    const car = createCar(def, slot);
    const lt = createLapTracker(track);
    let t = 0, hits = 0, vmax = 0, driftT = 0;
    while (t < 240 && lt.lap < 4) {
      stepCar(car, autopilot(car, track), DT);
      const h = collideCarWithWalls(car, track);
      if (h > 100) hits++;
      vmax = Math.max(vmax, car.speed);
      if (car.drifting) driftT += DT;
      updateLapTracker(lt, car.trackDist, t);
      t += DT;
    }
    console.log(`  ${def.name.padEnd(6)} tours:${lt.lap - 1}  meilleur:${lt.bestLap.toFixed(2)}s  vmax:${Math.round(vmax)}  chocs:${hits}  drift:${driftT.toFixed(1)}s`);
  }
}
