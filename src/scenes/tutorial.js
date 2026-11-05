// Tutoriel interactif : une leçon de pilotage en solo sur NEON BOULEVARD.
// Chaque étape affiche une consigne, met en évidence le bon bouton, et passe
// à la suivante quand le joueur a réussi l'action.

import { t } from '../i18n/index.js';
const $ = (id) => document.getElementById(id);

export function createTutorial({ scene, input, touch, autoGas, onDone }) {
  const keys = touch
    ? { gas: t('GAZ'), brake: t('FREIN'), steer: '◀ ▶', boost: 'BOOST', reset: '⟲' }
    : { gas: '↑', brake: '↓', steer: '← →', boost: t('Maj'), reset: 'R' };

  const steps = [
    {
      text: autoGas
        ? t("L'accélération est automatique : laisse la voiture prendre de la vitesse.")
        : t('Maintiens {k} pour accélérer.', { k: keys.gas }),
      hint: autoGas ? [] : ['gas'],
      done: (c) => c.speed > c.params.maxSpeed * 0.55,
    },
    {
      text: t('Utilise {k} pour tourner et suis la piste.', { k: keys.steer }),
      hint: ['left', 'right'],
      done: (c, st) => st.dist > 1400 && st.steered,
    },
    {
      text: t('Appuie sur {k} pour ralentir avant un virage.', { k: keys.brake }),
      hint: ['brake'],
      done: (c, st) => st.brakeTime > 0.35,
    },
    {
      text: t('DRIFT : juste avant un virage, appuie sur {k} + la direction. Garde la direction pour serrer, lâche-la pour élargir.', { k: keys.brake }),
      cue: true, // repère « virage en approche »
      hint: ['brake', 'left', 'right'],
      help: t("Il faut rouler vite : accélère d'abord en ligne droite, puis frein + direction au début du virage."),
      done: (c, st) => st.driftTime > 0.7, // cumulé : plusieurs essais possibles
    },
    {
      text: t('Chaque drift remplit la jauge de BOOST (en haut à droite). Remplis-la à moitié.'),
      hint: ['brake', 'left', 'right'],
      done: (c) => c.boost >= 0.5,
    },
    {
      text: t('Jauge prête : appuie sur {k} pour une accélération fulgurante !', { k: keys.boost }),
      hint: ['boost'],
      done: (c, st) => st.boostTime > 0.6,
    },
    {
      text: t('Bravo ! Tu es prêt pour ta première course. Gagne des trophées pour monter de ligue et débloquer des voitures.'),
      hint: [],
      done: (c, st) => st.t > 3.5,
      last: true,
    },
  ];

  let index = 0;
  let st = null;
  let finished = false;
  const panel = $('tutorial');
  const textEl = $('tuto-text');
  const stepEl = $('tuto-step');
  const helpEl = $('tuto-help');

  function highlight(actions) {
    document.querySelectorAll('[data-action]').forEach((b) => b.classList.toggle('hint', actions.includes(b.dataset.action)));
  }

  function enter(i) {
    index = i;
    const s = steps[i];
    st = { t: 0, dist: 0, steered: false, brakeTime: 0, driftTime: 0, boostTime: 0, stuck: 0, lastDist: null };
    textEl.textContent = s.text;
    stepEl.textContent = s.last ? t('TERMINÉ') : t('LEÇON {a} / {b}', { a: i + 1, b: steps.length - 1 });
    helpEl.textContent = '';
    panel.classList.toggle('done', !!s.last);
    textEl.classList.remove('pop');
    void textEl.offsetWidth;
    textEl.classList.add('pop');
    highlight(touch ? s.hint : []);
  }

  function finish() {
    if (finished) return;
    finished = true;
    highlight([]);
    panel.classList.add('hidden');
    onDone();
  }

  panel.classList.remove('hidden');
  enter(0);
  $('tuto-skip').onclick = () => finish();

  return {
    render: (a) => scene.render(a),
    resize: () => scene.resize(),
    respawn: () => scene.respawn(),
    setCarDef: (id) => scene.setCarDef(id),
    reloadGraphics: () => scene.reloadGraphics(),
    isFinished: () => false,
    get car() { return scene.car; },
    get world() { return scene.world; },
    get track() { return scene.track; },
    get trackName() { return scene.trackName; },
    update(dt) {
      scene.update(dt);
      if (finished) return;
      const c = scene.car;
      const p = input.pressed;
      const w = scene.world;
      if (!w.started) return;
      st.t += dt;
      // Distance parcourue (le long du tracé)
      if (st.lastDist !== null) {
        let d = c.trackDist - st.lastDist;
        if (d < -w.track.length / 2) d += w.track.length;
        if (d > 0 && d < 100) st.dist += d;
      }
      st.lastDist = c.trackDist;
      if (p.left || p.right) st.steered = true;
      if (c.braking) st.brakeTime += dt;
      if (c.drifting) st.driftTime += dt;
      if (c.boosting && p.boost) st.boostTime += dt;
      st.stuck = c.speed < 40 ? st.stuck + dt : 0;

      const s = steps[index];
      // Leçon de drift : on signale le bon moment (un virage serré arrive)
      let cue = '';
      if (s.cue && !c.drifting && c.speed > 0.4 * c.params.maxSpeed) {
        const tr = w.track, n = tr.count;
        const from = Math.round((c.speed * 0.25) / tr.spacing), to = Math.round((c.speed * 0.55) / tr.spacing);
        let turn = 0;
        for (let k = from; k < to; k++) turn += tr.curv[(c.trackIndex + k) % n] * tr.spacing;
        if (Math.abs(turn) > 0.45) cue = t('VIRAGE ! {k} + {d} MAINTENANT', { k: keys.brake, d: turn > 0 ? (touch ? '▶' : '→') : (touch ? '◀' : '←') });
      }
      if (st.stuck > 2.5) helpEl.textContent = t('Coincé ? Appuie sur {k} pour replacer la voiture.', { k: keys.reset });
      else if (cue) helpEl.textContent = cue;
      else if (s.help && st.t > 9) helpEl.textContent = s.help;
      else helpEl.textContent = '';
      helpEl.classList.toggle('cue', !!cue);

      if (s.done(c, st)) {
        if (s.last) finish();
        else enter(index + 1);
      }
    },
    dispose() {
      highlight([]);
      panel.classList.add('hidden');
      scene.dispose();
    },
    isTutorial: true,
    /** (tests) aller directement à une leçon */
    goStep: (i) => enter(i),
  };
}
