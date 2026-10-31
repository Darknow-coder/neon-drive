// Emblème du joueur (avatar) : pastille ronde colorée + dessin au trait.
import { AVATARS } from '../data/profile.js';

export function avatarSvg(id) {
  const a = AVATARS.find((x) => x.id === id) ?? AVATARS[0];
  return `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${a.path}</svg>`;
}

/** Avatar complet (HTML). `cls` : taille (av-s, av-m, av-l). */
export function avatarHtml(profile, cls = '') {
  return `<span class="avatar ${cls}" style="--ac:${profile.color}">${avatarSvg(profile.avatar)}</span>`;
}
