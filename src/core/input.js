// Transforme le clavier et l'écran tactile en « intentions » de pilotage :
//   steer    : -1 (gauche) … +1 (droite)
//   throttle : 0 … 1
//   brake    : 0 … 1
//   boost    : true/false
// Les pilotes IA produiront exactement le même objet : ils passent par
// la même physique que le joueur et ne peuvent donc pas tricher.

export function createIntent() {
  return { steer: 0, throttle: 0, brake: 0, boost: false };
}

const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'gas', KeyW: 'gas', KeyZ: 'gas',
  ArrowDown: 'brake', KeyS: 'brake', Space: 'brake',
  ShiftLeft: 'boost', ShiftRight: 'boost', KeyB: 'boost',
};

export function createInput({ touchRoot, onAction } = {}) {
  const keys = new Set();
  const touchState = { left: false, right: false, gas: false, brake: false, boost: false };
  const pointers = new Map(); // pointerId -> action
  let steerSmooth = 0;
  const intent = createIntent();

  // ----- Clavier -----
  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (a) {
      keys.add(a);
      e.preventDefault();
    } else if (!e.repeat && onAction) {
      onAction(e.code);
    }
  });
  window.addEventListener('keyup', (e) => {
    const a = KEYMAP[e.code];
    if (a) keys.delete(a);
  });
  window.addEventListener('blur', () => {
    keys.clear();
    pointers.clear();
    refreshTouch();
  });

  // ----- Tactile (multi-doigts) -----
  // Chaque doigt est suivi séparément. On peut glisser d'un bouton à l'autre
  // (ex. de ◀ vers ▶) sans relever le doigt.
  const buttons = touchRoot ? [...touchRoot.querySelectorAll('[data-action]')] : [];

  function actionAt(x, y) {
    const el = document.elementFromPoint(x, y);
    const btn = el && el.closest ? el.closest('[data-action]') : null;
    return btn && touchRoot.contains(btn) ? btn.dataset.action : null;
  }
  function refreshTouch() {
    for (const k in touchState) touchState[k] = false;
    for (const a of pointers.values()) if (a) touchState[a] = true;
    for (const b of buttons) b.classList.toggle('active', !!touchState[b.dataset.action]);
  }
  if (touchRoot) {
    const opts = { passive: false };
    touchRoot.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try { e.target.releasePointerCapture?.(e.pointerId); } catch { /* rien */ }
      pointers.set(e.pointerId, actionAt(e.clientX, e.clientY));
      refreshTouch();
      if (navigator.vibrate && pointers.get(e.pointerId)) navigator.vibrate(8);
    }, opts);
    window.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      const a = actionAt(e.clientX, e.clientY);
      if (a !== pointers.get(e.pointerId)) {
        pointers.set(e.pointerId, a);
        refreshTouch();
      }
    }, opts);
    const end = (e) => {
      if (pointers.delete(e.pointerId)) refreshTouch();
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    touchRoot.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  return {
    intent,
    /** À appeler à chaque pas physique. */
    update(dt) {
      const left = keys.has('left') || touchState.left;
      const right = keys.has('right') || touchState.right;
      const target = (right ? 1 : 0) - (left ? 1 : 0);
      // Léger lissage : un bouton est tout-ou-rien, la direction ne doit pas l'être.
      const rate = target === 0 ? 14 : Math.sign(target) !== Math.sign(steerSmooth) ? 16 : 9;
      steerSmooth += (target - steerSmooth) * (1 - Math.exp(-rate * dt));
      if (Math.abs(steerSmooth) < 0.001 && target === 0) steerSmooth = 0;

      intent.steer = steerSmooth;
      intent.throttle = keys.has('gas') || touchState.gas ? 1 : 0;
      intent.brake = keys.has('brake') || touchState.brake ? 1 : 0;
      intent.boost = keys.has('boost') || touchState.boost;
      return intent;
    },
    reset() {
      keys.clear();
      pointers.clear();
      refreshTouch();
      steerSmooth = 0;
    },
  };
}

export const isTouchDevice = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
