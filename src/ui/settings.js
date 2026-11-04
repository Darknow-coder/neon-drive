// Écran des réglages (5 onglets) : son, commandes, graphismes, affichage, compte.

import { exportSaveCode, importSaveCode } from '../progression/save.js';

const $ = (id) => document.getElementById(id);

export function createSettingsScreen({ save, onChange, onImport, onTutorial, onClose, onIdentity, onReset, accountInfo }) {
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
  }
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
  $('settings-close').addEventListener('click', () => close());

  function open({ inRace = false } = {}) {
    if (inRace && tab === 'account') tab = 'sound';
    reset.dataset.step = '';
    reset.textContent = 'EFFACER TOUTE MA PROGRESSION';
    refresh();
    io.classList.add('hidden');
    // Pendant une course : pas d'import, de tutoriel, de remise à zéro ni de changement de pseudo
    for (const id of ['save-import', 'btn-tutorial-again', 'set-reset', 'set-identity']) $(id).disabled = inRace;
    $('settings').classList.remove('hidden');
  }
  function close() { $('settings').classList.add('hidden'); onClose?.(); }
  return { open, close };
}
