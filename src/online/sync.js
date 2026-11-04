// Envoie le profil (pseudo, emblème, trophées…) au serveur après chaque
// changement important, sans jamais bloquer le jeu.
import { rpc, remember, cached, forget } from './api.js';
import { currentTitle, playerName } from '../progression/profile.js';
import { selectedCar } from '../progression/garage.js';

let pending = null;
let lastError = null;
let listeners = [];

/** Supprime le profil en ligne (et le compte invisible) de cet appareil. */
export async function deleteOnlineProfile() {
  await rpc('delete_my_profile');
  forget();
  paused = true;
}

export const onlineStatus = () => ({ me: cached(), error: lastError });
export function onOnlineChange(fn) { listeners.push(fn); }

/** Envoi (regroupé : plusieurs demandes rapprochées = un seul envoi). */
// Tests automatiques : jamais de connexion au vrai serveur (sauf ?online dans l'adresse)
const offlineTests = typeof navigator !== 'undefined' && navigator.webdriver && !/[?&]online/.test(location.search);

let paused = false; // après suppression du profil : plus d'envoi jusqu'au prochain lancement
/** Peut-on parler au serveur ? (pseudo choisi, pas en test automatique, profil non supprimé) */
export const canSync = (save) => !!save.profile.name && !offlineTests && !paused;
export function syncProfile(save, { now = false } = {}) {
  if (!canSync(save)) return Promise.resolve(null); // pas encore de pseudo / tests
  clearTimeout(pending?.timer);
  return new Promise((resolve) => {
    const go = async () => {
      try {
        const me = await rpc('submit_profile', {
          p_name: playerName(save), p_avatar: save.profile.avatar, p_color: save.profile.color,
          p_title: currentTitle(save), p_car: selectedCar(save),
          p_trophies: save.trophies, p_races: save.career.races, p_wins: save.career.wins,
        });
        lastError = null;
        // Demandes d'amis reçues (pastille du menu)
        try { me.incoming = (await rpc('my_friends')).filter((f) => f.relation === 'incoming').length; } catch { me.incoming = cached()?.incoming ?? 0; }
        remember(me);
        resolve(me);
      } catch (e) {
        lastError = e.message || 'hors ligne';
        resolve(null);
      }
      listeners.forEach((f) => f());
    };
    pending = { timer: setTimeout(go, now ? 0 : 1500) };
  });
}
