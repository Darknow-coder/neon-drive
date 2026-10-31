// Écran des réglages (volumes, vibrations), enregistrés dans la sauvegarde.

const $ = (id) => document.getElementById(id);

export function createSettingsScreen({ settings, onChange, onClose }) {
  const music = $('set-music');
  const sfx = $('set-sfx');
  const vib = $('set-vibration');
  const pct = (v) => `${Math.round(v * 100)} %`;

  function refresh() {
    music.value = settings.music;
    sfx.value = settings.sfx;
    vib.checked = settings.vibration;
    $('set-music-out').textContent = pct(settings.music);
    $('set-sfx-out').textContent = pct(settings.sfx);
  }
  music.addEventListener('input', () => { settings.music = +music.value; refresh(); onChange(false); });
  sfx.addEventListener('input', () => { settings.sfx = +sfx.value; refresh(); onChange(false); });
  // Enregistrement quand on relâche le curseur (pas à chaque mouvement)
  music.addEventListener('change', () => onChange(true));
  sfx.addEventListener('change', () => onChange(true));
  vib.addEventListener('change', () => { settings.vibration = vib.checked; onChange(true); });
  $('settings-close').addEventListener('click', () => close());

  function open() { refresh(); $('settings').classList.remove('hidden'); }
  function close() { $('settings').classList.add('hidden'); onClose?.(); }
  return { open, close };
}
