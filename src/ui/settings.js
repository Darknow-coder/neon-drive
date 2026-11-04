// Écran des réglages (5 onglets) : son, commandes, graphismes, affichage, compte.

import { exportSaveCode, importSaveCode, defaultSave } from '../progression/save.js';
import { DEFAULT_KEYS } from '../core/input.js';

const $ = (id) => document.getElementById(id);

const ACTIONS = [['left', 'Tourner à gauche'], ['right', 'Tourner à droite'], ['gas', 'Accélérer'], ['brake', 'Freiner / drift'], ['boost', 'Boost'], ['respawn', 'Replacer la voiture'], ['pause', 'Pause']];

/** Nom lisible d'une touche (selon la disposition réelle du clavier si le navigateur la connaît). */
let layout = null;
navigator.keyboard?.getLayoutMap?.().then((m) => { layout = m; }).catch(() => {});
export function keyName(code) {
  if (!code) return '—';
  const fixed = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'ESPACE', ShiftLeft: 'MAJ G', ShiftRight: 'MAJ D', ControlLeft: 'CTRL G', ControlRight: 'CTRL D',
    AltLeft: 'ALT', AltRight: 'ALT GR', Enter: 'ENTRÉE', Backspace: 'EFFACER', Tab: 'TAB', Escape: 'ÉCHAP', CapsLock: 'VERR MAJ' };
  if (fixed[code]) return fixed[code];
  const real = layout?.get?.(code);
  if (real) return real.toUpperCase();
  // Navigateur qui ne connaît pas la disposition (Firefox, Safari) : en français, on suppose un clavier AZERTY
  if (/^fr/i.test(navigator.language || '')) {
    const azerty = { KeyA: 'Q', KeyQ: 'A', KeyW: 'Z', KeyZ: 'W', Semicolon: 'M', KeyM: ',' };
    if (azerty[code]) return azerty[code];
  }
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'PAVÉ ').toUpperCase();
}

export function createSettingsScreen({ save, onChange, onImport, onTutorial, onTour, onClose, onIdentity, onReset, accountInfo, input }) {
  const settings = save.settings;
  const pct = (v) => `${Math.round(v * 100)} %`;
  let tab = 'sound';

  // ---------- Curseurs ----------
  const sliders = [
    ['set-master', () => settings.master, (v) => { settings.master = v; }],
    ['set-music', () => settings.music, (v) => { settings.music = v; }],
    ['set-sfx', () => settings.sfx, (v) => { settings.sfx = v; }],
    ['set-engine', () => settings.engine, (v) => { settings.engine = v; }],
    ['set-size', () => settings.controls.size, (v) => { settings.controls.size = v; }],
    ['set-opacity', () => settings.controls.opacity, (v) => { settings.controls.opacity = v; }],
  ];
  // ---------- Cases à cocher ----------
  const checks = [
    ['set-vibration', () => settings.vibration, (v) => { settings.vibration = v; }],
    ['set-swapped', () => settings.controls.swapped, (v) => { settings.controls.swapped = v; }],
    ['set-autogas', () => settings.controls.autoGas, (v) => { settings.controls.autoGas = v; }],
    ['set-shake', () => settings.graphics.shake, (v) => { settings.graphics.shake = v; }],
    ['set-showfps', () => settings.graphics.showFps, (v) => { settings.graphics.showFps = v; }],
    ['set-names', () => settings.display.names, (v) => { settings.display.names = v; }],
    ['set-flash', () => settings.display.reduceFlash, (v) => { settings.display.reduceFlash = v; }],
    ['set-motion', () => settings.display.reduceMotion, (v) => { settings.display.reduceMotion = v; }],
  ];
  // ---------- Choix multiples (boutons segmentés) ----------
  const segs = [
    ['set-steer', () => settings.controls.steer, (v) => { settings.controls.steer = v; }],
    ['set-quality', () => settings.graphics.quality, (v) => { settings.graphics.quality = v; }],
    ['set-fps', () => String(settings.graphics.fps), (v) => { settings.graphics.fps = Number(v); }],
    ['set-effects', () => settings.graphics.effects, (v) => { settings.graphics.effects = v; }],
    ['set-units', () => settings.display.units, (v) => { settings.display.units = v; }],
    ['set-zoom', () => settings.graphics.zoom, (v) => { settings.graphics.zoom = v; }],
  ];
  const QHINT = {
    auto: 'Le jeu baisse un peu la finesse de l\'image si ton appareil n\'arrive pas à suivre.',
    high: 'Image toujours la plus fine possible (peut ramer sur les petits téléphones).',
    eco: 'Image moins fine : plus fluide et moins de batterie sur téléphone.',
  };

  function refresh() {
    for (const [id, get] of sliders) { $(id).value = get(); $(`${id}-out`).textContent = pct(get()); }
    for (const [id, get] of checks) $(id).checked = !!get();
    for (const [id, get] of segs) $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(get())));
    $('set-quality-hint').textContent = QHINT[settings.graphics.quality];
    document.querySelectorAll('.set-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    document.querySelectorAll('.set-pane').forEach((p) => p.classList.toggle('hidden', p.dataset.pane !== tab));
    if (tab === 'account') $('set-account').innerHTML = accountInfo?.() ?? '';
    if (tab === 'controls') { renderKeys(); renderPad(); }
  }

  // ---------- Touches du clavier ----------
  const keysOf = () => settings.keys ?? DEFAULT_KEYS;
  let waiting = null; // [action, emplacement] en attente d'une touche
  function renderKeys() {
    const k = keysOf();
    $('kb-list').innerHTML = ACTIONS.map(([a, label]) => `<div class="kb-row"><span>${label}</span>${[0, 1, 2].map((i) =>
      `<button class="kb-key ${waiting && waiting[0] === a && waiting[1] === i ? 'wait' : ''}" data-a="${a}" data-i="${i}">${waiting && waiting[0] === a && waiting[1] === i ? 'APPUIE…' : keyName(k[a][i])}</button>`).join('')}</div>`).join('')
      + '<div class="set-hint">Échap met toujours en pause. Pendant l\'attente : Échap = annuler, Retour arrière = vider l\'emplacement.</div>';
    $('kb-list').querySelectorAll('.kb-key').forEach((b) => b.addEventListener('click', () => {
      waiting = [b.dataset.a, Number(b.dataset.i)];
      renderKeys();
      input?.captureKey((code) => {
        const [a, i] = waiting; waiting = null;
        if (code !== 'Escape') {
          const next = JSON.parse(JSON.stringify(keysOf()));
          const val = code === 'Backspace' ? null : code;
          // Une touche ne sert qu'à une seule action : on la retire ailleurs
          if (val) for (const list of Object.values(next)) for (let j = 0; j < 3; j++) if (list[j] === val) list[j] = null;
          next[a][i] = val;
          settings.keys = next;
          onChange(true);
        }
        renderKeys();
      });
    }));
  }
  $('kb-reset').addEventListener('click', () => { settings.keys = null; waiting = null; input?.cancelCapture(); onChange(true); renderKeys(); });

  // ---------- Manette ----------
  function renderPad() {
    const name = input?.gamepad;
    $('pad-box').innerHTML = name
      ? `<b class="pad-on">● MANETTE CONNECTÉE</b><small>${String(name).replace(/[<>&]/g, '').slice(0, 60)}</small>
         <div class="pad-map"><span><i>STICK / CROIX</i>tourner</span><span><i>GÂCHETTE D · A</i>accélérer</span><span><i>GÂCHETTE G · B</i>freiner / drift</span><span><i>RB · X</i>boost</span><span><i>Y</i>replacer</span><span><i>START</i>pause</span></div>`
      : '<b class="pad-off">Aucune manette détectée</b><small>Branche une manette (Xbox, PlayStation…) ou connecte-la en Bluetooth, puis appuie sur un de ses boutons.</small>';
  }
  input?.onGamepadChange(() => { if (!$('settings').classList.contains('hidden') && tab === 'controls') renderPad(); });

  // ---------- Rétablir les réglages ----------
  const defBtn = $('set-defaults');
  defBtn.addEventListener('click', () => {
    if (defBtn.dataset.confirm !== '1') { defBtn.dataset.confirm = '1'; defBtn.textContent = 'Confirmer : tout remettre par défaut ?'; return; }
    const d = defaultSave().settings;
    for (const k of Object.keys(settings)) delete settings[k];
    Object.assign(settings, d);
    defBtn.dataset.confirm = ''; defBtn.textContent = 'Réglages rétablis ✓';
    setTimeout(() => { defBtn.textContent = 'Rétablir les réglages par défaut'; }, 2000);
    onChange(true);
    refresh();
  });
  for (const [id, , set] of sliders) {
    const el = $(id);
    el.addEventListener('input', () => { set(+el.value); refresh(); onChange(false); });
    el.addEventListener('change', () => onChange(true)); // enregistré quand on relâche
  }
  for (const [id, , set] of checks) $(id).addEventListener('change', () => { set($(id).checked); refresh(); onChange(true); });
  for (const [id, , set] of segs) {
    $(id).querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { set(b.dataset.v); refresh(); onChange(true); }));
  }
  document.querySelectorAll('.set-tab').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; refresh(); }));

  // ---------- Compte ----------
  $('set-identity').addEventListener('click', () => onIdentity?.());
  const reset = $('set-reset');
  reset.addEventListener('click', () => {
    if (reset.dataset.step === '2') { onReset?.(); return; }
    reset.dataset.step = reset.dataset.step === '1' ? '2' : '1';
    reset.textContent = reset.dataset.step === '1' ? 'TU ES SÛR ? (APPUIE ENCORE)' : 'DERNIÈRE CONFIRMATION : TOUT EFFACER';
    $('set-reset-msg').textContent = 'Attention : tout sera perdu sur cet appareil. Exporte d\'abord ta sauvegarde si tu veux la garder.';
  });

  // ---------- Sauvegarde : export / import ----------
  const io = $('save-io');
  const code = $('save-code');
  const msg = $('save-io-msg');
  const action = $('save-io-action');
  let ioMode = null;
  let pending = null;
  const setMsg = (t, cls = '') => { msg.textContent = t; msg.className = 'small ' + cls; };

  $('save-export').addEventListener('click', () => {
    ioMode = 'export';
    io.classList.remove('hidden');
    $('save-io-help').textContent = 'Copie ce code et garde-le (notes, message…). Il permet de retrouver ta progression sur un autre appareil.';
    code.value = exportSaveCode(save);
    code.readOnly = true;
    action.textContent = 'COPIER';
    setMsg('');
  });
  $('save-import').addEventListener('click', () => {
    ioMode = 'import';
    pending = null;
    io.classList.remove('hidden');
    $('save-io-help').textContent = 'Colle ici un code de sauvegarde. Attention : il remplacera ta progression actuelle.';
    code.value = '';
    code.readOnly = false;
    action.textContent = 'VÉRIFIER';
    setMsg('');
    code.focus();
  });
  action.addEventListener('click', async () => {
    if (ioMode === 'export') {
      try { await navigator.clipboard.writeText(code.value); setMsg('Code copié ✓', 'ok'); }
      catch { code.select(); setMsg('Sélectionne le code et copie-le manuellement.'); }
      return;
    }
    if (pending) { onImport(pending); return; } // 2e appui : confirmation
    try {
      pending = importSaveCode(code.value);
      setMsg(`Code valide : ${pending.trophies} trophées, ${pending.garage.owned.length} voitures, ${pending.stats.races} courses. Appuie sur CONFIRMER pour remplacer ta progression.`, 'ok');
      action.textContent = 'CONFIRMER';
    } catch (e) {
      setMsg(e.message, 'err');
    }
  });
  code.addEventListener('input', () => { if (ioMode === 'import' && pending) { pending = null; action.textContent = 'VÉRIFIER'; setMsg(''); } });
  $('save-io-cancel').addEventListener('click', () => { io.classList.add('hidden'); pending = null; });

  $('btn-tutorial-again').addEventListener('click', () => { close(); onTutorial?.(); });
  $('btn-tour-again').addEventListener('click', () => { close(); onTour?.(); });
  $('settings-close').addEventListener('click', () => close());

  function open({ inRace = false } = {}) {
    if (inRace && tab === 'account') tab = 'sound';
    reset.dataset.step = '';
    reset.textContent = 'EFFACER TOUTE MA PROGRESSION';
    refresh();
    io.classList.add('hidden');
    // Pendant une course : pas d'import, de tutoriel, de remise à zéro ni de changement de pseudo
    for (const id of ['save-import', 'btn-tutorial-again', 'btn-tour-again', 'set-reset', 'set-identity']) $(id).disabled = inRace;
    $('settings').classList.remove('hidden');
  }
  function close() { waiting = null; input?.cancelCapture(); defBtn.dataset.confirm = ''; defBtn.textContent = 'Rétablir les réglages par défaut'; $('settings').classList.add('hidden'); onClose?.(); }
  return { open, close };
}
