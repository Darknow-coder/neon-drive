// Écran des réglages : volumes, vibrations, commandes tactiles, sauvegarde.

import { exportSaveCode, importSaveCode } from '../progression/save.js';

const $ = (id) => document.getElementById(id);

export function createSettingsScreen({ save, onChange, onImport, onTutorial, onClose }) {
  const settings = save.settings;
  const music = $('set-music');
  const sfx = $('set-sfx');
  const vib = $('set-vibration');
  const swapped = $('set-swapped');
  const autoGas = $('set-autogas');
  const size = $('set-size');
  const pct = (v) => `${Math.round(v * 100)} %`;

  function refresh() {
    music.value = settings.music;
    sfx.value = settings.sfx;
    vib.checked = settings.vibration;
    swapped.checked = settings.controls.swapped;
    autoGas.checked = settings.controls.autoGas;
    size.value = settings.controls.size;
    $('set-music-out').textContent = pct(settings.music);
    $('set-sfx-out').textContent = pct(settings.sfx);
    $('set-size-out').textContent = pct(settings.controls.size);
  }
  music.addEventListener('input', () => { settings.music = +music.value; refresh(); onChange(false); });
  sfx.addEventListener('input', () => { settings.sfx = +sfx.value; refresh(); onChange(false); });
  size.addEventListener('input', () => { settings.controls.size = +size.value; refresh(); onChange(false); });
  // Enregistrement quand on relâche le curseur (pas à chaque mouvement)
  for (const el of [music, sfx, size]) el.addEventListener('change', () => onChange(true));
  vib.addEventListener('change', () => { settings.vibration = vib.checked; onChange(true); });
  swapped.addEventListener('change', () => { settings.controls.swapped = swapped.checked; onChange(true); });
  autoGas.addEventListener('change', () => { settings.controls.autoGas = autoGas.checked; onChange(true); });

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
    refresh();
    io.classList.add('hidden');
    // Pendant une course : pas d'import ni de tutoriel
    for (const id of ['save-import', 'btn-tutorial-again']) $(id).disabled = inRace;
    $('settings').classList.remove('hidden');
  }
  function close() { $('settings').classList.add('hidden'); onClose?.(); }
  return { open, close };
}
