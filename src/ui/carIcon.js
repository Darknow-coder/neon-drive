// Petite image d'une voiture vue de dessus, nez vers le haut (menus, cartes).
import { makeCarSprite } from '../render/carSprite.js';

export function carIcon(def, colors = def.colors, w = 112, h = 68, { dim = false } = {}) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d');
  const sp = makeCarSprite(def, 46, 24, colors);
  const sc = Math.min(w / sp.w, h / sp.h) * 1.35;
  c.translate(w / 2, h / 2);
  c.rotate(-Math.PI / 2);
  c.drawImage(sp.canvas, -sp.ox * sc, -sp.oy * sc, sp.w * sc, sp.h * sc);
  if (dim) {
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = 'rgba(7,4,26,0.35)';
    c.fillRect(-w, -h, w * 2, h * 2);
  }
  return cv;
}
