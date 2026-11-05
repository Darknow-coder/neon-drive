// Aide au drift (joueur seulement, désactivable dans les réglages).
// Pendant un drift, elle ajuste discrètement la direction pour que la courbe
// suive le virage : le joueur choisit QUAND drifter et dans quel sens, l'aide
// évite juste de finir dans le mur (avec un léger coup de frein si le virage est
// trop serré pour la vitesse). Elle ne fait rien si le joueur contre-braque
// (il veut sortir du drift).
import { GLOBAL_TUNING as g } from '../physics/carPhysics.js';
import { clamp } from '../core/math.js';

const out = { steer: 0, throttle: 0, brake: 0, boost: false, holdDrift: false };

/**
 * @param strength 0 … 1 : part de la direction confiée à l'aide (0,65 par défaut)
 * @returns l'intention corrigée (objet réutilisé : ne pas le garder)
 */
export function assistDrift(car, track, input, strength = 0.65) {
  if (!car.drifting || car.speed < 80) return input;
  const playerDir = input.steer * car.driftDir; // +1 vers l'intérieur, -1 contre-braquage
  if (playerDir < -0.3) return input; // le joueur veut sortir du drift : on le laisse faire

  // Rotation de trajectoire nécessaire : celle du virage juste devant,
  // corrigée pour revenir vers le milieu de la piste et dans l'axe du tracé
  const speed = car.speed;
  const n = track.count;
  const i0 = car.trackIndex;
  const span = Math.max(3, Math.round((60 + speed * 0.25) / track.spacing));
  const lead = Math.round((speed * 0.08) / track.spacing);
  let curv = 0;
  for (let k = 0; k < span; k++) curv += track.curv[(i0 + lead + k) % n];
  curv /= span;
  const ia = (i0 + lead) % n;
  let head = Math.atan2(track.ty[ia], track.tx[ia]) - Math.atan2(car.vy, car.vx);
  head = Math.atan2(Math.sin(head), Math.cos(head));
  const hw = track.hw[i0] || 100;
  const lat = car.trackLateral ?? 0; // > 0 : à droite du centre
  const wanted = speed * curv + head * 3 - (lat / hw) * 1.4 * clamp(speed / 600, 0.4, 1.2);

  // Même calcul que la physique : quelle direction donne cette rotation ?
  const p = car.params;
  const gm = car.lastGripMul ?? 1;
  const auth = 1 - g.highSpeedUndersteer * g.driftUndersteer * clamp(speed / g.understeerRefSpeed, 0, 1.3);
  const T = Math.min(p.turnRate * p.driftTurnBoost * auth * (0.5 + 0.5 * gm), (p.gripAccel * gm * g.driftGripShare) / Math.max(speed, 1));
  const k = ((wanted * car.driftDir) / T - g.driftTurnMin) / (1 - g.driftTurnMin);
  const assistDir = clamp(2 * k - 1, -1, 1);

  out.steer = (playerDir + (assistDir - playerDir) * strength) * car.driftDir;
  out.throttle = input.throttle;
  // Virage trop serré pour cette vitesse, même drift serré au maximum : petit coup de frein
  out.brake = k > 1.05 ? Math.max(input.brake, clamp((k - 1) * 1.6, 0, 0.8)) : input.brake;
  out.boost = input.boost;
  // Tant que le joueur tient la direction, l'aide ne fait jamais sortir du drift
  out.holdDrift = playerDir > 0.5;
  return out;
}
