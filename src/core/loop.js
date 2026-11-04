// Boucle de jeu à pas fixe.
// La physique avance toujours par petits pas identiques (STEP), quelle que soit
// la vitesse de l'appareil : la conduite est la même sur un vieux téléphone et
// sur un PC puissant, et les simulations de test sont reproductibles.

export const PHYSICS_HZ = 120;
export const STEP = 1 / PHYSICS_HZ;
const MAX_FRAME = 0.1; // au-delà (onglet en arrière-plan…), on ne rattrape pas

export function createLoop({ update, render, maxFps = () => 60 }) {
  let acc = 0;
  let last = 0;
  let running = false;
  let rafId = 0;
  let fps = 60;
  let sinceDraw = 0;

  function frame(now) {
    if (!running) return;
    rafId = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    if (dt > 0) fps += (1 / dt - fps) * 0.05;

    acc += dt;
    while (acc >= STEP) {
      update(STEP);
      acc -= STEP;
    }
    // alpha = position entre les deux derniers pas physiques (pour un rendu fluide)
    // Limite à 30 images/s (économie de batterie) : on dessine une image sur deux,
    // la physique, elle, avance toujours au même rythme.
    if (maxFps() <= 30) {
      sinceDraw += dt;
      if (sinceDraw < 1 / 32) return;
      render(acc / STEP, sinceDraw);
      sinceDraw = 0;
      return;
    }
    render(acc / STEP, dt);
  }

  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    get fps() {
      return fps;
    },
  };
}
