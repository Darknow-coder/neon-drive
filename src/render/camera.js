// Caméra qui suit une voiture.
// - Elle regarde un peu DEVANT la voiture (selon sa vitesse) pour qu'on voie
//   arriver les virages.
// - Elle dézoome légèrement avec la vitesse et pendant le boost.
// - Ses mouvements sont amortis (pas de secousses) sauf lors des chocs.

import { prefs } from '../core/prefs.js';
import { clamp, damp } from '../core/math.js';

export function createCamera() {
  return {
    x: 0, y: 0,
    zoom: 1,
    baseZoom: 1,
    shake: 0,
    shakeX: 0, shakeY: 0,
    lookX: 0, lookY: 0,
  };
}

/** Zoom de base selon la taille de l'écran (en pixels CSS). */
export function computeBaseZoom(cssW, cssH) {
  const long = Math.max(cssW, cssH);
  const short = Math.min(cssW, cssH);
  return Math.min(long / 1000, short / 500);
}

export function snapCamera(cam, car) {
  cam.x = car.x;
  cam.y = car.y;
  cam.lookX = cam.lookY = 0;
  cam.zoom = cam.baseZoom;
}

export function updateCamera(cam, car, dt) {
  const vmax = car.params.maxSpeed;
  const ratio = clamp(car.speed / vmax, 0, 1.4);

  // Anticipation : on décale la vue dans la direction du mouvement
  const lead = 0.38;
  const tx = clamp(car.vx * lead, -320, 320);
  const ty = clamp(car.vy * lead, -220, 220);
  cam.lookX += (tx - cam.lookX) * damp(2.6, dt);
  cam.lookY += (ty - cam.lookY) * damp(2.6, dt);

  cam.x += (car.x + cam.lookX - cam.x) * damp(9, dt);
  cam.y += (car.y + cam.lookY - cam.y) * damp(9, dt);

  const targetZoom = cam.baseZoom * (1 - 0.17 * Math.min(ratio, 1)) * (car.boosting ? 0.93 : 1) * (cam.zoomMul ?? 1);
  cam.zoom += (targetZoom - cam.zoom) * damp(1.8, dt);

  // Secousse lors des chocs
  if (car.impact > 140) cam.shake = Math.max(cam.shake, Math.min(1, car.impact / 600));
  cam.shake = Math.max(0, cam.shake - dt * 2.8);
  const s = prefs.shake ? cam.shake * cam.shake * 9 : 0;
  cam.shakeX = (Math.random() * 2 - 1) * s;
  cam.shakeY = (Math.random() * 2 - 1) * s;
}
