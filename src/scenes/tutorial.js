// Tutoriel interactif : une leçon de pilotage en solo sur NEON BOULEVARD.
// Chaque étape affiche une consigne, met en évidence le bon bouton, et passe
// à la suivante quand le joueur a réussi l'action.

const $ = (id) => document.getElementById(id);

export function createTutorial({ scene, input, touch, autoGas, onDone }) {
  const keys = touch
    ? { gas: 'GAZ', brake: 'FREIN', steer: '◀ ▶', boost: 'BOOST', reset: '⟲' }
    : { gas: '↑', brake: '↓', steer: '← →', boost: 'Maj', reset: 'R' };

  const steps = [
    {
      text: autoGas
        ? "L'accélération est automatique : laisse la voiture prendre de la vitesse."
        : `Maintiens ${keys.gas} pour accélérer.`,
      hint: autoGas ? [] : ['gas'],
      done: (c) => c.speed > c.params.maxSpeed * 0.55,
    },
    {
      text: `Utilise ${keys.steer} pour tourner et suis la piste.`,
      hint: ['left', 'right'],
      done: (c, st) => st.dist > 1400 && st.steered,
    },
    {
      text: `Appuie sur ${keys.brake} pour ralentir avant un virage.`,
      hint: ['brake'],
      done: (c, st) => st.brakeTime > 0.35,
    },
    {
      text: `DRIFT : lancé à grande vitesse, maintiens ${keys.brake} puis tourne. Garde la direction pour rester en glisse !`,
      hint: ['brake', 'left', 'right'],
      help: "Il faut rouler vite : accélère d'abord en ligne droite, puis frein + direction.",
      done: (c, st) => st.driftTime > 0.7, // cumulé : plusieurs essais possibles
    },
    {
      text: 'Chaque drift remplit la jauge de BOOST (en haut à droite). Remplis-la à moitié.',
      hint: ['brake', 'left', 'right'],
      done: (c) => c.boost >= 0.5,
    },
    {
      text: `Jauge prête : appuie sur ${keys.boost} pour une accélération fulgurante !`,
      hint: ['boost'],
      done: (c, st) => st.boostTime > 0.6,
    },
    {
      text: 'Bravo ! Tu es prêt pour ta première course. Gagne des trophées pour monter de ligue et débloquer des voitures.',
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
    stepEl.textContent = s.last ? 'TERMINÉ' : `LEÇON ${i + 1} / ${steps.length - 1}`;
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
      if (st.stuck > 2.5) helpEl.textContent = `Coincé ? Appuie sur ${keys.reset} pour replacer la voiture.`;
      else if (s.help && st.t > 9) helpEl.textContent = s.help;
      else helpEl.textContent = '';

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
  };
}
