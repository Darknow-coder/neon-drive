// Réglages d'affichage lus pendant la course (rendu, caméra, HUD).
// main.js les recopie depuis la sauvegarde à chaque changement.
export const prefs = {
  shake: true,         // secousses de caméra
  reduceFlash: false,  // éclairs et flashs adoucis (accessibilité)
  names: true,         // noms des pilotes au-dessus des voitures
  effects: 'full',     // 'full' | 'low' (moins de particules et d'effets)
  units: 'kmh',        // 'kmh' | 'mph'
  showFps: false,      // compteur d'images par seconde
};
export function applyPrefs(settings) {
  const g = settings.graphics ?? {}, d = settings.display ?? {};
  prefs.shake = g.shake !== false;
  prefs.effects = g.effects ?? 'full';
  prefs.showFps = !!g.showFps;
  prefs.names = d.names !== false;
  prefs.reduceFlash = !!d.reduceFlash;
  prefs.units = d.units ?? 'kmh';
}
