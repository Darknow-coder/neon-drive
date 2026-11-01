// Vérifie les capacités spéciales des voitures (même règle pour tout le monde).
// Usage : node tools/traitCheck.js
import { getCar, CARS, TRAITS } from '../src/data/cars.js';
import { createCar, stepCar } from '../src/physics/carPhysics.js';
import { createIntent } from '../src/core/input.js';

let ok = 0, ko = 0;
const check = (c, label) => { if (c) ok++; else { ko++; console.log('  ✗ ' + label); } };
const DT = 1 / 120;
const surf = (gripMul = 1) => ({ speedMul: 1, gripMul, pad: false, zone: null });

check(CARS.filter((c) => c.trait).every((c) => TRAITS[c.trait]), 'chaque capacité a un nom et une description');
check(CARS.every((c) => Object.values(c.stats).reduce((a, b) => a + b, 0) <= 30), 'aucune voiture au-dessus de 30 points de stats');

// AGILE : plus petite et plus légère
const nova = createCar(getCar('nova')), pixie = createCar(getCar('pixie'));
check(pixie.length < nova.length && pixie.width < nova.width && pixie.params.mass < nova.params.mass, 'PIXIE : plus petite et plus légère');

// BÉLIER : plus lourde, encaisse mieux les murs
const gol = createCar(getCar('goliath')), titan = createCar(getCar('titan'));
check(gol.params.mass > titan.params.mass * 1.3 && gol.params.wallRetain > titan.params.wallRetain, 'GOLIATH : la plus lourde, garde sa vitesse contre les murs');

// RECHARGE : le boost monte tout seul en roulant (pas chez les autres), plus vite en freinant
function boostAfter(id, seconds, brakeFrom = Infinity) {
  const c = createCar(getCar(id));
  const it = createIntent();
  for (let t = 0; t < seconds; t += DT) { it.throttle = t < brakeFrom ? 1 : 0; it.brake = t < brakeFrom ? 0 : 1; stepCar(c, it, DT, surf()); }
  return c.boost;
}
const ionRoll = boostAfter('ionix', 10), novaRoll = boostAfter('nova', 10);
check(ionRoll > 0.08 && novaRoll === 0, `IONIX : boost rechargé en roulant (${ionRoll.toFixed(2)}), pas NOVA (${novaRoll})`);
check(boostAfter('ionix', 10, 8) > boostAfter('ionix', 8) + 0.01, 'IONIX : le freinage recharge davantage');

// LÉVITATION : perd beaucoup moins d'adhérence sur sol glissant
const hyp = createCar(getCar('hyperion')), ref = createCar(getCar('nova'));
stepCar(hyp, createIntent(), DT, surf(0.76));
stepCar(ref, createIntent(), DT, surf(0.76));
check(Math.abs(ref.lastGripMul - 0.76) < 1e-9 && hyp.lastGripMul > 0.88, `HYPERION : adhérence ${hyp.lastGripMul.toFixed(2)} sur la neige (NOVA ${ref.lastGripMul})`);
stepCar(hyp, createIntent(), DT, surf(1));
check(hyp.lastGripMul === 1, 'HYPERION : aucun avantage sur sol sec');

console.log(`${ok} vérifications réussies, ${ko} échec(s).`);
process.exit(ko ? 1 : 0);
