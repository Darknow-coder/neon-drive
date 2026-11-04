// Écran du DÉFI DU JOUR : présentation du défi, 3 étoiles, série de jours.

import { t, fmtNum, LOCALE, ord, many } from '../i18n/index.js';
import { DAILY_FORMATS, DAILY_RULES, TRACK_TWISTS, STREAK_REWARDS, DAILY_STAR_CREDITS } from '../data/daily.js';
import { weatherOf } from '../data/weather.js';
import { getCar, TRAITS } from '../data/cars.js';
import { getTrackData } from '../data/tracks/index.js';
import { PACKS } from '../data/economy.js';
import { dailyChallenge, refreshDaily, currentStreak, timeTargetsFrom, streakReward } from '../progression/daily.js';
import { dailyReferenceTime } from '../race/dailyRef.js';
import { msUntilMidnight, dayKey } from '../progression/shop.js';
import { buildTrack } from '../track/buildTrack.js';
import { ico } from './icons.js';
import { carIcon } from './carIcon.js';
import { starsHtml, fmtSec } from './career.js';
import { showRewards } from './packOpen.js';
import { toScreens } from './season.js';

const $ = (id) => document.getElementById(id);

/** Textes des 3 objectifs. */
export function dailyGoals(ch, targets) {
  if (ch.format === 'time') return (targets ?? [0, 0, 0]).map((x) => (x ? t('Termine en moins de {t}', { t: fmtSec(x) }) : t('Calcul du temps…')));
  return ch.places.map((p) => (p === 1 ? t('Gagne') : t('Finis dans le top {p}', { p })));
}

/** Calcule (une fois par jour) les temps à battre du défi chrono. */
export function ensureTargets(save, ch, onSave) {
  if (ch.format !== 'time' || save.daily.targets) return;
  const ref = dailyReferenceTime(ch);
  if (ref) { save.daily.targets = timeTargetsFrom(ref); onSave?.(); }
}

/** Minicarte du circuit du défi (avec le sens de la course). */
function miniMap(ch) {
  const t = buildTrack(ch.track);
  const W = 360, H = 200;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const b = t.bounds;
  const sc = Math.min((W - 24) / (b.maxX - b.minX), (H - 24) / (b.maxY - b.minY));
  const ox = (W - (b.maxX - b.minX) * sc) / 2 - b.minX * sc, oy = (H - (b.maxY - b.minY) * sc) / 2 - b.minY * sc;
  const P = (i) => [t.x[i] * sc + ox, t.y[i] * sc + oy];
  const col = ch.track.theme?.left ?? '#00f0ff';
  c.lineJoin = 'round';
  c.beginPath(); for (let i = 0; i < t.count; i++) c[i ? 'lineTo' : 'moveTo'](...P(i)); c.closePath();
  c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 10; c.stroke();
  c.strokeStyle = col; c.lineWidth = 3; c.shadowColor = col; c.shadowBlur = 10; c.stroke();
  c.shadowBlur = 0;
  // Flèches du sens de la course
  c.fillStyle = '#ffffff';
  for (let k = 0; k < 6; k++) {
    const i = Math.floor((k / 6) * t.count);
    const [x, y] = P(i); const a = Math.atan2(t.ty[i], t.tx[i]);
    c.save(); c.translate(x, y); c.rotate(a);
    c.beginPath(); c.moveTo(7, 0); c.lineTo(-4, -5); c.lineTo(-4, 5); c.closePath(); c.fill();
    c.restore();
  }
  // Ligne de départ
  const [sx, sy] = P(0);
  c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(sx, sy, 6, 0, Math.PI * 2); c.fill();
  return cv;
}

function rewardText(r) {
  const out = [];
  if (r.credits) out.push(`${ico('credit')}${r.credits}`);
  if (r.pack) out.push(`<span style="color:${PACKS[r.pack].color}">${PACKS[r.pack].name}</span>`);
  return out.join(' + ');
}

export function createDailyScreen({ save, onSave, sfx, onPlay, onClose }) {
  let timer = 0;
  let ch = null;

  function render() {
    refreshDaily(save);
    ch = dailyChallenge();
    const d = save.daily;
    const fmt = DAILY_FORMATS[ch.format];
    const base = getTrackData(ch.base);
    $('daily-credits').innerHTML = `${ico('credit')}<b class="cr-num">${fmtNum(save.credits)}</b>`;
    $('dy-date').textContent = new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    $('dy-title').textContent = ch.track.name;
    const map = $('dy-map'); map.innerHTML = ''; map.append(miniMap(ch));
    // Règles du jour (étiquettes)
    const chips = [`<span class="dyc fmt">${fmt.name}${fmt.laps ? ` · ${t('{n} tours', { n: fmt.laps })}` : ''}</span>`];
    if (ch.reverse) chips.push(`<span class="dyc twist" title="${TRACK_TWISTS.reverse.desc}">⇄ ${TRACK_TWISTS.reverse.name}</span>`);
    const wx = ch.track.weather;
    if (wx && wx !== 'clear') chips.push(`<span class="dyc wx">${ch.weather ? t('SURPRISE : ') : ''}${weatherOf(wx).name}</span>`);
    if (ch.rule !== 'none') chips.push(`<span class="dyc rule">${DAILY_RULES[ch.rule].name}</span>`);
    $('dy-chips').innerHTML = chips.join('');
    // Explications
    const lines = [];
    if (ch.format === 'last') lines.push(t('Tu pars en dernière position.'));
    if (ch.format === 'time') lines.push(t('Seul en piste : bats les 3 temps.'));
    if (ch.format === 'elim') lines.push(t('Le dernier est éliminé à chaque tour.'));
    if (ch.reverse) lines.push(t('{c} dans l\'autre sens.', { c: base.name }));
    if (ch.weather) {
      const wd = weatherOf(ch.weather).desc || t('ambiance inhabituelle');
      lines.push(`${t('{w} sur {c} :', { w: weatherOf(ch.weather).name, c: base.name })} ${wd.charAt(0).toLowerCase() + wd.slice(1)}${/[!.]$/.test(wd) ? '' : '.'}`);
    }
    if (ch.rule !== 'none') lines.push(DAILY_RULES[ch.rule].desc);
    $('dy-desc').innerHTML = lines.map((l) => `<span>${l}</span>`).join('');
    // Voiture
    const carBox = $('dy-car');
    carBox.innerHTML = '';
    if (ch.car) {
      const c = getCar(ch.car);
      carBox.append(carIcon(c, c.colors, 110, 110));
      carBox.insertAdjacentHTML('beforeend', `<div><small>${ch.rule === 'oneCar' ? t('TOUT LE MONDE EN') : t('VOITURE IMPOSÉE (PRÊTÉE)')}</small><b>${c.name}</b>${c.trait ? `<i>${TRAITS[c.trait].name}</i>` : ''}</div>`);
    } else carBox.innerHTML = `<div><small>${t('VOITURE')}</small><b>${t('AU CHOIX')}</b><i>${t('ta voiture du garage')}</i></div>`;
    // Objectifs
    const goals = dailyGoals(ch, d.targets);
    $('dy-goals').innerHTML = `${starsHtml(d.stars, 'big')}<div class="dyg">${goals.map((g, k) => `<span class="${k < d.stars ? 'ok' : ''}">${ico('star')}${g}</span>`).join('')}</div>
      ${d.best !== null ? `<div class="dy-best">${t('Ton meilleur aujourd\'hui :')} <b>${ch.format === 'time' ? fmtSec(d.best) : t('{p} place', { p: ord(d.best, true) })}</b></div>` : ''}
      <div class="dy-starcr">+${DAILY_STAR_CREDITS} ${ico('credit')} ${t('par nouvelle étoile · essais illimités')}</div>`;
    // Série
    const streak = currentStreak(save);
    const doneToday = d.lastDone === dayKey();
    const nextIdx = doneToday ? streak : streak + 1; // jour de série visé par le prochain succès
    $('dy-streak').innerHTML = `<div class="dys-head"><b>${ico('flame')} ${t(many(streak) ? 'SÉRIE : {n} JOURS' : 'SÉRIE : {n} JOUR', { n: streak })}</b><span>${doneToday ? t('✓ Défi réussi aujourd\'hui') : t('Réussis le défi (1 étoile) pour continuer ta série')}</span></div>
      <div class="dys-days">${STREAK_REWARDS.map((r, k) => {
        const dayN = Math.floor((Math.max(1, nextIdx) - 1) / 7) * 7 + k + 1;
        const got = dayN <= streak;
        const next = dayN === nextIdx && !doneToday;
        return `<div class="dys-d ${got ? 'got' : ''} ${next ? 'next' : ''} ${k === 6 ? 'big' : ''}"><small>${t('JOUR {n}', { n: dayN })}</small><span>${rewardText(r)}</span></div>`;
      }).join('')}</div>`;
    tickTimer();
  }

  function tickTimer() {
    const ms = msUntilMidnight();
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000);
    const p = (n) => String(n).padStart(2, '0');
    $('dy-timer').textContent = t('Nouveau défi dans {t}', { t: `${p(h)}:${p(m)}:${p(sec)}` });
    if (ms < 1000 && !$('daily').classList.contains('hidden')) setTimeout(render, 1500);
  }

  $('daily-back').addEventListener('click', () => { clearInterval(timer); $('daily').classList.add('hidden'); onClose?.(); });
  $('dy-go').addEventListener('click', () => { clearInterval(timer); sfx?.click?.(); $('daily').classList.add('hidden'); onPlay(); });

  return {
    /** Ouvre l'écran ; `after` : résultat d'un essai (récompense de série à montrer). */
    open(after = null) {
      ch = dailyChallenge();
      $('daily').classList.remove('hidden');
      $('dy-goals').innerHTML = `<div class="dy-best">${t('Préparation du défi…')}</div>`;
      // (calcul des temps du chrono juste après l'affichage)
      setTimeout(() => {
        ensureTargets(save, ch, onSave);
        render();
        clearInterval(timer);
        timer = setInterval(tickTimer, 1000);
        if (after?.streakReward) {
          const { reward, got } = after.streakReward;
          showRewards(save, [{ title: t('SÉRIE : JOUR {n}', { n: after.streak }), credits: 0, note: t('Défi du jour réussi ! Récompense de série : <b>{r}</b>', { r: rewardText(reward) }) }, ...toScreens(save, [got])], { sfx, onClose: render });
        }
      }, 30);
    },
    challenge: () => ch ?? dailyChallenge(),
  };
}
