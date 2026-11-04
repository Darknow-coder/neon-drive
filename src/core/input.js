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

// Touches par défaut (3 emplacements par action). Ce sont des touches
// PHYSIQUES : « KeyA » est la touche A d'un clavier QWERTY, c'est-à-dire Q
// sur un clavier AZERTY (d'où ZQSD qui marche tout seul).
export const DEFAULT_KEYS = {
  left: ['ArrowLeft', 'KeyA', null],
  right: ['ArrowRight', 'KeyD', null],
  gas: ['ArrowUp', 'KeyW', null],
  brake: ['ArrowDown', 'KeyS', 'Space'],
  boost: ['ShiftLeft', 'KeyB', 'ShiftRight'],
  respawn: ['KeyR', null, null],
  pause: ['KeyP', null, null], // (Échap met toujours en pause)
};
const DRIVE = ['left', 'right', 'gas', 'brake', 'boost'];
let KEYMAP = {};
function buildKeymap(bindings) {
  KEYMAP = {};
  for (const [action, list] of Object.entries(bindings)) for (const code of list) if (code) KEYMAP[code] = action;
}
buildKeymap(DEFAULT_KEYS);

// ---------- Manette (Xbox / PlayStation / générique, disposition « standard ») ----------
//   stick gauche ou croix : direction · gâchette droite ou A/✕ : accélérer
//   gâchette gauche ou B/○ : freiner (+ tourner = drift) · RB / X/□ : boost
//   Y/△ ou Select : replacer la voiture · Start / Options : pause
const PAD = { gas: [7, 0], brake: [6, 1], boost: [5, 2, 4], respawn: [3, 8], pause: [9], left: [14], right: [15] };
const DEADZONE = 0.16;

export function createInput({ touchRoot, onAction } = {}) {
  const keys = new Set();
  const touchState = { left: false, right: false, gas: false, brake: false, boost: false };
  const pointers = new Map(); // pointerId -> action
  let steerSmooth = 0;
  const intent = createIntent();
  // Options : accélération automatique (on ne gère que la direction et le frein)
  const options = { autoGas: false, steer: 'normal' };

  // ----- Clavier -----
  let capture = null; // attente d'une touche à associer (réglages)
  window.addEventListener('keydown', (e) => {
    if (capture) { e.preventDefault(); e.stopPropagation(); const cb = capture; capture = null; cb(e.code); return; }
    // Saisie dans un champ de texte (pseudo, code de sauvegarde) : on laisse écrire
    if (e.target?.closest?.('input, textarea')) return;
    const a = KEYMAP[e.code];
    if (a && DRIVE.includes(a)) {
      keys.add(a);
      e.preventDefault();
    } else if (!e.repeat && onAction) {
      // replacer / pause (touches réglables) ou touche spéciale (Échap, T…)
      onAction(a === 'respawn' ? 'respawn' : a === 'pause' || e.code === 'Escape' ? 'pause' : e.code);
    }
  }, true);
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
  // À chaque contact, on recalcule TOUT l'état à partir de la liste complète
  // des doigts posés (e.touches) : aucun bouton ne peut rester « coincé ».
  // On peut glisser d'un bouton à l'autre (ex. de ◀ vers ▶) sans relever le doigt.
  // Les positions des boutons sont mémorisées (pas de recalcul de la page
  // pendant que le doigt bouge) et chaque bouton a une petite marge autour.
  const buttons = touchRoot ? [...touchRoot.querySelectorAll('[data-action]')] : [];
  const SLOP = 14; // marge (px) autour de chaque bouton
  let rects = null;
  function measure() {
    rects = buttons.map((b) => {
      const r = b.getBoundingClientRect();
      return { action: b.dataset.action, l: r.left, t: r.top, r: r.right, b: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, visible: r.width > 0 };
    });
  }
  function actionAt(x, y) {
    if (!rects) measure();
    let best = null, bestD = Infinity;
    for (const r of rects) {
      if (!r.visible) continue;
      if (x >= r.l - SLOP && x <= r.r + SLOP && y >= r.t - SLOP && y <= r.b + SLOP) {
        // dans plusieurs marges à la fois : le bouton le plus proche gagne
        const inside = x >= r.l && x <= r.r && y >= r.t && y <= r.b;
        const d = inside ? -1 : Math.hypot(x - r.cx, y - r.cy);
        if (d < bestD) { bestD = d; best = r.action; }
      }
    }
    return best;
  }
  function refreshTouch() {
    for (const k in touchState) touchState[k] = false;
    for (const a of pointers.values()) if (a) touchState[a] = true;
    for (const b of buttons) {
      const on = !!touchState[b.dataset.action];
      if (b.classList.contains('active') !== on) b.classList.toggle('active', on);
    }
  }
  if (touchRoot) {
    window.addEventListener('resize', () => { rects = null; });
    window.addEventListener('orientationchange', () => { rects = null; });
    const fromTouches = (e) => {
      const before = new Set(pointers.values());
      pointers.clear();
      for (const t of e.touches) {
        if (t.target?.closest?.('.overlay:not(.hidden), .sys-buttons, #pack-open')) continue;
        pointers.set(t.identifier, actionAt(t.clientX, t.clientY));
      }
      refreshTouch();
      // petite vibration quand un nouveau bouton est enfoncé
      if (e.type === 'touchstart' && navigator.vibrate && [...pointers.values()].some((a) => a && !before.has(a))) navigator.vibrate(8);
    };
    const opts = { passive: false };
    // Écoute sur tout l'écran (un pouce un peu à côté d'un bouton compte quand même),
    // seulement quand les commandes tactiles sont affichées.
    const active = () => !touchRoot.classList.contains('hidden');
    // (un doigt posé sur un menu, la pause ou un bouton système n'est pas une commande)
    const onUi = (e) => !!e.target?.closest?.('.overlay:not(.hidden), .sys-buttons, .tutorial button, #pack-open');
    window.addEventListener('touchstart', (e) => {
      if (!active() || onUi(e)) return;
      if (!rects) measure();
      fromTouches(e);
      // On bloque le geste du navigateur (zoom, défilement) seulement sur les commandes
      const t = e.changedTouches[0];
      if (t && actionAt(t.clientX, t.clientY)) e.preventDefault();
    }, opts);
    window.addEventListener('touchmove', (e) => { if (!active()) return; fromTouches(e); if (pointers.size) e.preventDefault(); }, opts);
    window.addEventListener('touchend', (e) => { if (active() || pointers.size) fromTouches(e); }, opts);
    window.addEventListener('touchcancel', (e) => { if (active() || pointers.size) fromTouches(e); });
    // Souris / stylet (PC avec écran tactile, tests) : mêmes règles
    touchRoot.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      e.preventDefault();
      pointers.set(`p${e.pointerId}`, actionAt(e.clientX, e.clientY));
      refreshTouch();
    }, opts);
    window.addEventListener('pointermove', (e) => {
      const k = `p${e.pointerId}`;
      if (e.pointerType === 'touch' || !pointers.has(k)) return;
      const a = actionAt(e.clientX, e.clientY);
      if (a !== pointers.get(k)) { pointers.set(k, a); refreshTouch(); }
    });
    const end = (e) => { if (e.pointerType !== 'touch' && pointers.delete(`p${e.pointerId}`)) refreshTouch(); };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    touchRoot.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // ---------- Manette ----------
  const pad = { connected: false, name: '', steer: 0, gas: 0, brake: 0, boost: false, prev: {} };
  function readPad() {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = [...list].find((g) => g && g.connected);
    pad.connected = !!gp;
    if (!gp) { pad.steer = pad.gas = pad.brake = 0; pad.boost = false; return null; }
    pad.name = gp.id;
    const btn = (i) => { const b = gp.buttons[i]; return b ? (typeof b === 'object' ? b.value || (b.pressed ? 1 : 0) : b) : 0; };
    const any = (list2) => Math.max(0, ...list2.map(btn));
    // Stick gauche : zone morte + courbe douce (précis au centre)
    let x = gp.axes[0] ?? 0;
    x = Math.abs(x) < DEADZONE ? 0 : Math.sign(x) * ((Math.abs(x) - DEADZONE) / (1 - DEADZONE));
    x = Math.sign(x) * Math.pow(Math.abs(x), 1.35);
    const dpad = any(PAD.right) - any(PAD.left);
    pad.steer = Math.abs(dpad) > 0 ? dpad : x;
    pad.gas = any(PAD.gas);
    pad.brake = any(PAD.brake);
    pad.boost = any(PAD.boost) > 0.5;
    // Boutons « une fois » (replacer, pause) : sur l'appui seulement
    for (const act of ['respawn', 'pause']) {
      const down = any(PAD[act]) > 0.5;
      if (down && !pad.prev[act]) onAction?.(act);
      pad.prev[act] = down;
    }
    return gp;
  }
  // Pendant la pause (la course est arrêtée), on surveille quand même Start
  setInterval(() => { if (pad.connected && pausedPoll) readPad(); }, 80);
  let pausedPoll = false;
  window.addEventListener('gamepadconnected', () => { pad.connected = true; onPadChange?.(); });
  window.addEventListener('gamepaddisconnected', () => { readPad(); onPadChange?.(); });
  let onPadChange = null;

  return {
    intent,
    /** Manette branchée ? (nom) */
    get gamepad() { readPad(); return pad.connected ? pad.name : null; },
    onGamepadChange(fn) { onPadChange = fn; },
    /** Surveille la manette même quand la course est en pause. */
    setPausedPoll(v) { pausedPoll = v; },
    /** Vibration de la manette (choc). */
    rumble(strength = 0.5, ms = 80) {
      const gp = [...(navigator.getGamepads?.() ?? [])].find((g) => g && g.connected);
      try { gp?.vibrationActuator?.playEffect?.('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, strength), weakMagnitude: Math.min(1, strength * 0.6) }); } catch { /* pas de vibration */ }
    },
    /** Touches personnalisées (réglages). */
    setKeys(bindings) { buildKeymap({ ...DEFAULT_KEYS, ...bindings }); keys.clear(); },
    /** Attend la prochaine touche (réglages : « appuie sur une touche… »). */
    captureKey(cb) { capture = cb; },
    cancelCapture() { capture = null; },
    /** À appeler à chaque pas physique. */
    update(dt) {
      if (pad.connected) readPad();
      const left = keys.has('left') || touchState.left;
      const right = keys.has('right') || touchState.right;
      let target = (right ? 1 : 0) - (left ? 1 : 0);
      // Stick de la manette : direction progressive (prioritaire s'il est poussé)
      if (target === 0 && Math.abs(pad.steer) > 0.01) target = pad.steer;
      // Léger lissage : un bouton est tout-ou-rien, la direction ne doit pas l'être.
      // Sensibilité de la direction (réglage) : douce / normale / vive
      const sens = options.steer === 'soft' ? 0.6 : options.steer === 'sharp' ? 1.7 : 1;
      const rate = (target === 0 ? 14 : Math.sign(target) !== Math.sign(steerSmooth) ? 16 : 9) * sens;
      steerSmooth += (target - steerSmooth) * (1 - Math.exp(-rate * dt));
      if (Math.abs(steerSmooth) < 0.001 && target === 0) steerSmooth = 0;

      intent.steer = steerSmooth;
      intent.brake = Math.max(keys.has('brake') || touchState.brake ? 1 : 0, pad.brake);
      intent.throttle = options.autoGas
        ? (intent.brake > 0.5 ? 0 : 1)
        : Math.max(keys.has('gas') || touchState.gas ? 1 : 0, pad.gas);
      intent.boost = keys.has('boost') || touchState.boost || pad.boost;
      return intent;
    },
    setOptions(o) { Object.assign(options, o); },
    /** État brut des commandes (utilisé par le tutoriel). */
    get pressed() {
      return {
        left: keys.has('left') || touchState.left || pad.steer < -0.3,
        right: keys.has('right') || touchState.right || pad.steer > 0.3,
        gas: keys.has('gas') || touchState.gas || pad.gas > 0.3,
        brake: keys.has('brake') || touchState.brake || pad.brake > 0.3,
        boost: keys.has('boost') || touchState.boost || pad.boost,
      };
    },
    /** Remet seulement la direction à zéro (les doigts / touches maintenus restent actifs). */
    resetSteer() { steerSmooth = 0; },
    reset() {
      keys.clear();
      pointers.clear();
      refreshTouch();
      steerSmooth = 0;
      rects = null; // (les boutons ont pu changer de taille ou de place)
    },
    /** À appeler quand la disposition des boutons change (réglages). */
    remeasure() { rects = null; },
  };
}

export const isTouchDevice = () =>
  'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
