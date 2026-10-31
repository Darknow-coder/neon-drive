// Vérifie le comportement du drift en terrain dégagé (sans murs).
// Usage : node tools/driftCheck.js
import { CARS } from '../src/data/cars.js';
import { createCar, stepCar } from '../src/physics/carPhysics.js';
const DT = 1 / 120;
for (const def of CARS) {
  const car = createCar(def);
  const run = (sec, input) => { for (let t = 0; t < sec; t += DT) stepCar(car, input, DT); };
  run(3, { steer: 0, throttle: 1, brake: 0 });
  const v0 = car.speed;
  run(0.25, { steer: 1, throttle: 1, brake: 1 });   // déclenchement
  const entered = car.drifting;
  let maxSlip = 0, t = 0;
  for (; t < 1.5; t += DT) { stepCar(car, { steer: 1, throttle: 1, brake: 0 }, DT); maxSlip = Math.max(maxSlip, car.slip); }
  const vDrift = car.speed, boost = car.boost, still = car.drifting;
  let exitT = 0;
  for (; exitT < 3 && car.drifting; exitT += DT) stepCar(car, { steer: 0, throttle: 1, brake: 0 }, DT);
  let settle = 0; for (; settle < 2 && car.slip > 0.05; settle += DT) stepCar(car, { steer: 0, throttle: 1, brake: 0 }, DT);
  // Freinage simple en ligne droite (ne doit PAS déclencher de drift)
  const c2 = createCar(def);
  for (let k = 0; k < 360; k++) stepCar(c2, { steer: 0, throttle: 1, brake: 0 }, DT);
  let brakeDist = 0;
  while (c2.speed > 50) { stepCar(c2, { steer: 0, throttle: 0, brake: 1 }, DT); brakeDist += c2.speed * DT; if (c2.drifting) break; }
  // Virage plein braquage SANS frein à vitesse moyenne
  const c3 = createCar(def);
  for (let k = 0; k < 120; k++) stepCar(c3, { steer: 0, throttle: 1, brake: 0 }, DT);
  for (let k = 0; k < 240; k++) stepCar(c3, { steer: 1, throttle: 1, brake: 0 }, DT);
  console.log(`${def.name.padEnd(6)} v=${Math.round(v0)} drift:${entered} angleMax:${(maxSlip * 57.3).toFixed(0)}° v_en_drift=${Math.round(vDrift)} (${Math.round(vDrift / v0 * 100)}%) boost+${Math.round(boost * 100)}% encore:${still} sortie:${exitT.toFixed(2)}s réaligné:${settle.toFixed(2)}s | freinage ${Math.round(brakeDist)}u drift:${c2.drifting} | virage normal glisse:${(c3.slip*57.3).toFixed(0)}° drift:${c3.drifting}`);
}
