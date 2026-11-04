// Aperçu d'un effet (traînée de boost / fumée de drift) pour la boutique :
// la voiture, nez vers le haut, « roule » sur place et le vrai code des effets
// de course (carFx.js) produit les particules.
import { makeCarSprite } from './carSprite.js';
import { createParticles } from './particles.js';
import { createCarFx, updateCarFx } from './carFx.js';

/**
 * @param mode  'boost' | 'drift'
 * @param live  true : animé (s'arrête tout seul quand le canvas quitte la page)
 */
export function effectPreview(def, colors, mode, w, h, { live = false, scale = null } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  const sp = makeCarSprite(def, 46, 24, colors);
  const particles = createParticles(220);
  const fx = createCarFx();
  const stub = { addSkid() {}, weather: null };
  const SC = scale ?? Math.min(w / 70, h / 80);
  const angle = mode === 'drift' ? -Math.PI / 2 + 0.55 : -Math.PI / 2;
  const car = {
    x: 0, y: 0, angle, def, livery: colors, length: 46, width: 24, vx: 0, vy: 70, speed: 320,
    vR: mode === 'drift' ? 260 : 0, boosting: mode === 'boost', drifting: mode === 'drift', braking: false,
    trait: def.trait, spinTimer: 0, rev: 0, wallTouch: false,
  };
  const step = (dt) => { updateCarFx(fx, car, dt, particles, stub, 0); particles.update(dt); };
  const draw = () => {
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    c.setTransform(SC, 0, 0, SC, w / 2, h * 0.36);
    particles.draw(c, 0);
    c.save(); c.rotate(angle); c.drawImage(sp.canvas, -sp.ox, -sp.oy, sp.w, sp.h); c.restore();
    particles.draw(c, 1);
  };
  for (let k = 0; k < 24; k++) step(1 / 40); // l'effet est déjà « lancé »
  draw();
  if (live) {
    let last = 0;
    const loop = (t) => {
      if (!cv.isConnected && last) return;
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 30;
      last = t;
      step(dt); draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  return cv;
}
