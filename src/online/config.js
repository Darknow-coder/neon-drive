// Projet Supabase (base de données en ligne). Ces deux valeurs sont PUBLIQUES :
// elles sont faites pour être dans le jeu (la sécurité est assurée par les
// règles de la base : voir supabase/schema.sql).
export const SUPABASE_URL = 'https://lbjjpxgjyisaaduviapy.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_T_OQwyXLuE9LASqK1bxV_w_btzzOBUG';

// Adresse publique du jeu (pour les liens partagés, même quand le jeu tourne dans la page itch.io)
export const PUBLIC_URL = 'https://darknow-coder.github.io/neon-drive/';
/** Où tourne le jeu : 'itch' (intégré à la page itch.io), 'github' (site), 'local' ou 'autre'. */
export function gameHost() {
  if (typeof location === 'undefined') return 'local';
  const h = location.hostname;
  if (/itch\.zone$|itch\.io$/.test(h)) return 'itch';
  if (h.endsWith('github.io')) return 'github';
  if (h === 'localhost' || h === '127.0.0.1' || /^192\.168\./.test(h)) return 'local';
  return 'autre';
}
export const isEmbedded = () => { try { return window.top !== window.self; } catch { return true; } };
