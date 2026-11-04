// Menu principal : ligue, trophées, progression, statistiques.

import { t, many } from '../i18n/index.js';
import { leagueFor, nextLeague, leagueProgress } from '../data/progression.js';
import { rivalFor } from '../data/rivals.js';
import { getCar } from '../data/cars.js';
import { claimableCount } from '../progression/economy.js';
import { credits as cr, ico } from './icons.js';
import { makeCarSprite } from '../render/carSprite.js';
import { liveryFor, selectedCar } from '../progression/garage.js';
import { carLevel } from '../progression/economy.js';
import { medalCounts } from '../progression/timeTrial.js';
import { TROPHY_REWARDS } from '../data/progression.js';
import { TRACKS } from '../data/tracks/index.js';

// Icônes du menu (déclarées en HTML avec data-ico)
// - élément avec une classe (cadre stylé) : on remplit son intérieur
// - élément sans classe : il est remplacé par l'icône
document.querySelectorAll('[data-ico]').forEach((el) => {
  if (el.className) { el.innerHTML = ico(el.dataset.ico); el.removeAttribute('data-ico'); }
  else el.outerHTML = ico(el.dataset.ico);
});

// ---------- Vitrine : la voiture du joueur tourne lentement ----------
let showcase = { raf: 0, key: '', sprite: null, angle: -Math.PI / 2 };
function drawShowcase() {
  const cv = document.getElementById('menu-car-canvas');
  const menuVisible = !document.getElementById('start').classList.contains('hidden');
  if (!cv || !menuVisible || !showcase.sprite) { showcase.raf = 0; return; }
  // Écran ouvert par-dessus le menu : on ne redessine pas la vitrine (économie de batterie)
  showcase.raf = requestAnimationFrame(drawShowcase);
  if (document.querySelector('.overlay:not(.hidden)')) return;
  // 30 images/s suffisent pour une voiture qui tourne lentement
  const now = performance.now();
  if (now - (showcase.last ?? 0) < 32) return;
  const step = Math.min(3, (now - (showcase.last ?? now)) / 16.7);
  showcase.last = now;
  const c = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  c.clearRect(0, 0, W, H);
  // socle
  const g = c.createRadialGradient(W / 2, H * 0.56, 10, W / 2, H * 0.56, W * 0.42);
  g.addColorStop(0, 'rgba(0,240,255,0.25)'); g.addColorStop(1, 'rgba(0,240,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(0,240,255,0.4)'; c.lineWidth = 2;
  c.beginPath(); c.ellipse(W / 2, H * 0.56, W * 0.34, H * 0.3, 0, 0, Math.PI * 2); c.stroke();
  showcase.angle += 0.007 * step;
  const sp = showcase.sprite, sc = 4.2;
  c.save(); c.translate(W / 2, H * 0.54); c.rotate(showcase.angle);
  c.drawImage(sp.canvas, -sp.ox * sc, -sp.oy * sc, sp.w * sc, sp.h * sc);
  c.restore();
}
export function startShowcase(save) {
  const id = selectedCar(save);
  const colors = liveryFor(save, id);
  const key = id + JSON.stringify(colors);
  if (key !== showcase.key) { showcase.key = key; showcase.sprite = makeCarSprite(getCar(id), 46, 24, colors); }
  if (!showcase.raf) showcase.raf = requestAnimationFrame(drawShowcase);
}
import { shopBadge } from '../progression/shop.js';
import { missionsBadge, refreshMissions } from '../progression/missions.js';

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
  refreshMissions(save);
  const mb = missionsBadge(save);
  $('missions-badge').textContent = String(mb);
  $('missions-badge').classList.toggle('hidden', mb === 0);
  const sb = shopBadge(save);
  $('shop-badge').textContent = String(sb);
  $('shop-badge').classList.toggle('hidden', sb === 0);
  $('menu-trophies-word').textContent = many(save.trophies) ? t('trophées') : t('trophée');
  // Voiture
  const carId = selectedCar(save);
  $('menu-car-name').textContent = getCar(carId).name;
  $('menu-car').textContent = t('niveau {n}', { n: carLevel(save, carId) });
  startShowcase(save);
  // Bouton COURSE : gain possible
  $('menu-race-gain').innerHTML = `${t('jusqu\'à +{n}', { n: TROPHY_REWARDS[0] })} ${ico('trophy')}`;
  // Tuile CHRONO : médailles obtenues
  const mc = medalCounts(save);
  const got = Object.values(mc).reduce((a, b) => a + b, 0);
  $('tt-sub').textContent = t('{a} / {b} médailles', { a: got, b: TRACKS.filter((x) => !x.custom).length * 4 });
  $('menu-league-fill').style.width = `${Math.round(leagueProgress(save.trophies) * 100)}%`;
  $('menu-league-next').textContent = next
    ? t('{a} / {b} · ligue {l} dans {n}', { a: save.trophies, b: next.min, l: next.name, n: next.min - save.trophies })
    : t('Ligue maximale atteinte !');
  const rv = rivalFor(league.id);
  const beaten = rv ? save.rivalsBeaten?.[rv.id] ?? 0 : 0;
  $('menu-rival').innerHTML = rv
    ? `★ ${t('Rival :')} <b>${rv.name}</b> · ${beaten ? t('battu {n}×', { n: beaten }) : t('jamais battu')}`
    : '';
  const st = save.stats;
  $('menu-stats').textContent = st.races
    ? t('{a} course(s) · {b} victoire(s) · {c} podium(s)', { a: st.races, b: st.wins, c: st.podiums })
    : t('Première course : bonne chance !');

  const warn = $('save-warning');
  const msg = {
    unavailable: t('Sauvegarde indisponible sur ce navigateur (navigation privée ?) : ta progression ne sera pas conservée.'),
    restored: t('La sauvegarde était abîmée : la copie de secours a été restaurée.'),
    reset: t('La sauvegarde était illisible : nouvelle partie.'),
    failed: t('La dernière sauvegarde a échoué (mémoire pleine ?). Ta progression reste active tant que le jeu est ouvert.'),
  }[saveStatus];
  warn.textContent = msg ?? '';
  warn.classList.toggle('hidden', !msg);
}

/** Animation de tirage au sort du circuit. Appelle `done` à la fin. */
export function revealTrack(pool, chosen, done, rival = null, mode = null) {
  const el = $('reveal');
  const name = $('reveal-name');
  const prof = $('reveal-profile');
  el.classList.remove('hidden');
  prof.textContent = '';
  name.classList.remove('landed');
  const rvEl = $('reveal-rival');
  document.querySelector('.reveal-label').textContent = mode ? `${mode} — ${t('CIRCUIT TIRÉ AU SORT')}` : t('CIRCUIT TIRÉ AU SORT');
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
        rvEl.innerHTML = `<div class="rv-title">★ ${t('RIVAL EN COURSE')}</div><div class="rv-name" style="color:${rival.colors.glow}">${rival.name}</div><div class="rv-quote">${getCar(rival.car).name} — « ${rival.quote} »</div>`;
        setTimeout(() => rvEl.classList.remove('hidden'), 350);
      }
      setTimeout(() => { el.classList.add('hidden'); done(); }, rival ? 2300 : 1100);
    }
  };
  tick();
}
