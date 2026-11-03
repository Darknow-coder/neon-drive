// Envoie le profil (pseudo, emblème, trophées…) au serveur après chaque
// changement important, sans jamais bloquer le jeu.
import { rpc, remember, cached } from './api.js';
import { currentTitle, playerName } from '../progression/profile.js';
import { selectedCar } from '../progression/garage.js';

let pending = null;
let lastError = null;
let listeners = [];

export const onlineStatus = () => ({ me: cached(), error: lastError });
export function onOnlineChange(fn) { listeners.push(fn); }

/** Envoi (regroupé : plusieurs demandes rapprochées = un seul envoi). */
// Tests automatiques : jamais de connexion au vrai serveur (sauf ?online dans l'adresse)
const offlineTests = typeof navigator !== 'undefined' && navigator.webdriver && !/[?&]online/.test(location.search);

export function syncProfile(save, { now = false } = {}) {
  if (!save.profile.name || offlineTests) return Promise.resolve(null); // pas encore de pseudo / tests
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
