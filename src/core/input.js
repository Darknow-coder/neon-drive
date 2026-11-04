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
  // Options : accélération automatique (on ne gère que la direction et le frein)
  const options = { autoGas: false };

  // ----- Clavier -----
  window.addEventListener('keydown', (e) => {
    // Saisie dans un champ de texte (pseudo, code de sauvegarde) : on laisse écrire
    if (e.target?.closest?.('input, textarea')) return;
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
      intent.brake = keys.has('brake') || touchState.brake ? 1 : 0;
      intent.throttle = options.autoGas
        ? (intent.brake ? 0 : 1)
        : keys.has('gas') || touchState.gas ? 1 : 0;
      intent.boost = keys.has('boost') || touchState.boost;
      return intent;
    },
    setOptions(o) { Object.assign(options, o); },
    /** État brut des commandes (utilisé par le tutoriel). */
    get pressed() {
      return {
        left: keys.has('left') || touchState.left,
        right: keys.has('right') || touchState.right,
        gas: keys.has('gas') || touchState.gas,
        brake: keys.has('brake') || touchState.brake,
        boost: keys.has('boost') || touchState.boost,
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
