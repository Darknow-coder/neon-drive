// Menu principal : ligue, trophées, progression, statistiques.

import { leagueFor, nextLeague, leagueProgress } from '../data/progression.js';
import { rivalFor } from '../data/rivals.js';
import { getCar } from '../data/cars.js';
import { claimableCount } from '../progression/economy.js';
import { credits as cr } from './icons.js';
import { shopBadge } from '../progression/shop.js';

const $ = (id) => document.getElementById(id);

export function renderMenu(save, saveStatus) {
  const league = leagueFor(save.trophies);
  const next = nextLeague(league);
  const badge = $('menu-league-badge');
  badge.textContent = league.name;
  badge.style.setProperty('--lc', league.color);
  $('menu-trophies').textContent = String(save.trophies);
  $('menu-credits').innerHTML = cr(save.credits);
  const n = claimableCount(save);
  $('road-badge').textContent = String(n);
  $('road-badge').classList.toggle('hidden', n === 0);
  const sb = shopBadge(save);
  $('shop-badge').textContent = String(sb);
  $('shop-badge').classList.toggle('hidden', sb === 0);
  $('menu-trophies-word').textContent = save.trophies > 1 ? 'trophées' : 'trophée';
  $('menu-league-fill').style.width = `${Math.round(leagueProgress(save.trophies) * 100)}%`;
  $('menu-league-next').textContent = next
    ? `Prochaine ligue : ${next.name} (${next.min} trophées — encore ${next.min - save.trophies})`
    : 'Ligue maximale atteinte !';
  const rv = rivalFor(league.id);
  const beaten = rv ? save.rivalsBeaten?.[rv.id] ?? 0 : 0;
  $('menu-rival').innerHTML = rv
    ? `★ Rival de la ligue : <b>${rv.name}</b> (${getCar(rv.car).name}) — ${beaten ? `battu ${beaten} fois` : 'jamais battu'}`
    : '';
  const st = save.stats;
  $('menu-stats').textContent = st.races
    ? `${st.races} course${st.races > 1 ? 's' : ''} · ${st.wins} victoire${st.wins > 1 ? 's' : ''} · ${st.podiums} podium${st.podiums > 1 ? 's' : ''}`
    : 'Première course : bonne chance !';

  const warn = $('save-warning');
  const msg = {
    unavailable: 'Sauvegarde indisponible sur ce navigateur (navigation privée ?) : ta progression ne sera pas conservée.',
    restored: 'La sauvegarde était abîmée : la copie de secours a été restaurée.',
    reset: 'La sauvegarde était illisible : nouvelle partie.',
    failed: "La dernière sauvegarde a échoué (mémoire pleine ?). Ta progression reste active tant que le jeu est ouvert.",
  }[saveStatus];
  warn.textContent = msg ?? '';
  warn.classList.toggle('hidden', !msg);
}

/** Animation de tirage au sort du circuit. Appelle `done` à la fin. */
export function revealTrack(pool, chosen, done, rival = null) {
  const el = $('reveal');
  const name = $('reveal-name');
  const prof = $('reveal-profile');
  el.classList.remove('hidden');
  prof.textContent = '';
  name.classList.remove('landed');
  const rvEl = $('reveal-rival');
  rvEl.classList.add('hidden');
  let k = 0;
  const steps = 12;
  const tick = () => {
    if (k < steps && pool.length > 1) {
      name.textContent = pool[k % pool.length].name;
      k++;
      setTimeout(tick, 60 + k * 12);
    } else {
      name.textContent = chosen.name;
      prof.textContent = chosen.profile.toUpperCase();
      void name.offsetWidth; // relance l'animation
      name.classList.add('landed');
      if (rival) {
        rvEl.innerHTML = `<div class="rv-title">★ RIVAL EN COURSE</div><div class="rv-name" style="color:${rival.colors.glow}">${rival.name}</div><div class="rv-quote">${getCar(rival.car).name} — « ${rival.quote} »</div>`;
        setTimeout(() => rvEl.classList.remove('hidden'), 350);
      }
      setTimeout(() => { el.classList.add('hidden'); done(); }, rival ? 2300 : 1100);
    }
  };
  tick();
}
