// Écrans de la Coupe : présentation, classement entre les courses, podium final.

import { t, ord } from '../i18n/index.js';
import { playerLabel } from './playerLabel.js';
import { getTrackData } from '../data/tracks/index.js';
import { getCar } from '../data/cars.js';
import { AI_DRIVERS } from '../data/aiProfiles.js';
import { RIVALS } from '../data/rivals.js';
import { LEAGUES } from '../data/progression.js';
import { PACKS } from '../data/economy.js';
import { CUP_POINTS, CUP_RACES } from '../data/cup.js';
import { standings, cupReward, PLAYER } from '../progression/cup.js';
import { liveryFor, selectedCar } from '../progression/garage.js';
import { minimap } from './timeTrialSelect.js';
import { carIcon } from './carIcon.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);
const leagueName = (id) => LEAGUES.find((l) => l.id === id)?.name ?? id;

/** Couleurs et voiture d'un participant (pour les pastilles et le podium). */
function who(save, cup, name) {
  if (name === PLAYER) { const id = selectedCar(save); return { car: getCar(id), colors: liveryFor(save, id) }; }
  const rv = RIVALS[cup.league];
  if (rv && rv.name === name) return { car: getCar(rv.car), colors: rv.colors, rival: true };
  const d = AI_DRIVERS.find((x) => x.name === name);
  return { car: getCar(d?.car ?? 'nova'), colors: d?.colors ?? getCar('nova').colors };
}

// ---------------------------------------------------------------- Confettis
function confetti(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  const cols = ['#ffd34d', '#ff2bd6', '#00f0ff', '#3dff9e', '#ffffff', '#8a2bff'];
  const parts = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width, y: -Math.random() * canvas.height * 0.8,
    vx: (Math.random() - 0.5) * 60 * dpr, vy: (60 + Math.random() * 120) * dpr,
    r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 8, w: (5 + Math.random() * 6) * dpr, c: cols[(Math.random() * cols.length) | 0],
  }));
  let last = performance.now(), raf = 0, t = 0;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx * dt + Math.sin(t * 3 + p.r) * dpr; p.y += p.vy * dt; p.r += p.vr * dt;
      if (p.y > canvas.height + 20 && t < 4) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); ctx.restore();
    }
    if (t < 8) raf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, canvas.width, canvas.height);
  };
  raf = requestAnimationFrame(frame);
  return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, canvas.width, canvas.height); };
}

export function createCupScreens({ save, sfx }) {
  let stopFx = null;
  const card = $('cup-card');
  const open = () => $('cup').classList.remove('hidden');
  function close() { stopFx?.(); stopFx = null; $('cup').classList.add('hidden'); }

  function tracksHtml(cup) {
    const wrap = document.createElement('div');
    wrap.className = 'cup-tracks';
    cup.tracks.forEach((id, k) => {
      const td = getTrackData(id);
      const el = document.createElement('div');
      el.className = `cup-track ${k < cup.race ? 'done' : k === cup.race ? 'next' : ''}`;
      el.append(minimap(td));
      const h = cup.history[k];
      el.insertAdjacentHTML('beforeend', `<div class="ct-i">${k + 1}</div><div class="ct-n">${td.name}</div>
        <div class="ct-w">${h ? t('Vainqueur : {w}', { w: h.order[0] === PLAYER ? playerLabel() : h.order[0] }) : td.profile}</div>`);
      wrap.append(el);
    });
    return wrap;
  }

  function tableHtml(cup, rows) {
    return `<table class="cup-table">${rows.map((r, k) => {
      const w = who(save, cup, r.name);
      const mv = r.move === undefined ? '' : r.move > 0 ? `<td class="mv up">▲${r.move}</td>` : r.move < 0 ? `<td class="mv down">▼${-r.move}</td>` : '<td class="mv eq">=</td>';
      return `<tr class="${r.name === PLAYER ? 'me' : w.rival ? 'rival' : ''}" style="animation-delay:${k * 0.08}s">
        <td class="rk">${r.rank}</td>
        <td class="nm"><i style="background:${w.colors.body};box-shadow:0 0 6px ${w.colors.glow}"></i>${r.name === PLAYER ? playerLabel() : w.rival ? `★ ${r.name}` : r.name}</td>
        ${r.gained !== undefined ? `<td class="gain">${r.gained ? `+${r.gained}` : ''}</td>` : ''}
        <td class="tot">${r.points} pts</td>${mv}</tr>`;
    }).join('')}</table>`;
  }

  // ---------------------------------------------------------------- Présentation
  function showIntro(cup, { onStart, onAbandon, resumed = false }) {
    stopFx?.();
    card.innerHTML = '';
    card.insertAdjacentHTML('beforeend', `<div class="cup-title">${t('COUPE {l}', { l: leagueName(cup.league) })}</div>
      <div class="cup-subtitle">${resumed ? t('Reprise — <b>course {a} / {b}</b>', { a: cup.race + 1, b: CUP_RACES }) : t('{n} courses · mêmes adversaires · classement aux points', { n: CUP_RACES })}</div>`);
    card.append(tracksHtml(cup));
    const rv = RIVALS[cup.league];
    const opp = Object.keys(cup.points).filter((n) => n !== PLAYER);
    const rew = [1, 2, 3, 4].map((rank) => {
      const r = cupReward(cup.league, rank);
      return `<span class="rk">${ord(rank, true)}</span><span>+${r.trophies} ${ico('trophy')} · ${ico('credit')}${r.credits}${r.pack ? ` · ${PACKS[r.pack].name}` : ''}</span>`;
    }).join('');
    card.insertAdjacentHTML('beforeend', `<div class="cup-cols">
      <div class="cup-box"><h4>${resumed ? t('CLASSEMENT') : t('ADVERSAIRES')}</h4>
        ${resumed ? tableHtml(cup, standings(cup)) : `<div class="cup-rivals">${opp.map((n) => { const w = who(save, cup, n); return `<span style="color:${w.rival ? '#ffd34d' : w.colors.glow}">${w.rival ? '★ ' : ''}${n}</span>`; }).join('')}</div>
        <h4 style="margin-top:8px">${t('POINTS PAR COURSE')}</h4><div class="cup-pts">${CUP_POINTS.map((p, k) => `<span>${ord(k + 1, true)} <b>${p}</b></span>`).join('')}</div>`}
      </div>
      <div class="cup-box"><h4>${t('RÉCOMPENSES FINALES')}</h4><div class="cup-rew">${rew}</div>
        <h4 style="margin-top:8px">${t('RÈGLES')}</h4><div class="cup-subtitle" style="text-align:left;font-size:12px">${t('Course 1 : grille tirée au sort. Ensuite, le leader part dernier.')}${rv ? ` ${t('Ton rival <b>{r}</b> est de la partie.', { r: rv.name })}` : ''} ${t('Quitter une course compte comme une 6e place.')}</div>
      </div></div>`);
    const act = document.createElement('div');
    act.className = 'cup-actions';
    act.innerHTML = `<button class="menu-btn" id="cup-abandon">${resumed ? t('ABANDONNER LA COUPE') : t('RETOUR')}</button>
      <button class="menu-btn primary" id="cup-go">${resumed ? t('COURSE {n}', { n: cup.race + 1 }) : t('COMMENCER')} ›</button>`;
    card.append(act);
    $('cup-go').onclick = () => { close(); onStart(); };
    $('cup-abandon').onclick = () => {
      if (resumed && !confirm(t('Abandonner la coupe ? Les points seront perdus (sans récompense finale).'))) return;
      close(); onAbandon(resumed);
    };
    open();
  }

  // ---------------------------------------------------------------- Après une course
  function showStandings(cup, res, info, { onNext, onMenu }) {
    stopFx?.();
    card.innerHTML = '';
    const last = cup.history[cup.history.length - 1];
    const myPlace = last.order.indexOf(PLAYER) + 1;
    card.insertAdjacentHTML('beforeend', `<div class="cup-title">${t('COURSE {a} / {b}', { a: cup.race, b: CUP_RACES })}</div>
      <div class="cup-subtitle">${getTrackData(last.trackId).name} — ${t('tu termines <b>{p}</b> (+{n} pts)', { p: ord(myPlace, true), n: res.gained[PLAYER] })}</div>`);
    card.append(tracksHtml(cup));
    card.insertAdjacentHTML('beforeend', `<div class="cup-box"><h4>${t('CLASSEMENT GÉNÉRAL')}</h4>${tableHtml(cup, res.standings)}</div>`);
    if (info) card.insertAdjacentHTML('beforeend', `<div class="cup-info">${info}</div>`);
    const act = document.createElement('div');
    act.className = 'cup-actions';
    act.innerHTML = res.finished
      ? `<button class="menu-btn primary" id="cup-next">${t('RÉSULTAT FINAL')} ›</button>`
      : `<button class="menu-btn" id="cup-menu">${t('PAUSE (MENU)')}</button><button class="menu-btn primary" id="cup-next">${t('COURSE {n}', { n: cup.race + 1 })} : ${getTrackData(cup.tracks[cup.race]).name} ›</button>`;
    card.append(act);
    $('cup-next').onclick = () => { close(); onNext(); };
    if ($('cup-menu')) $('cup-menu').onclick = () => { close(); onMenu(); };
    open();
  }

  // ---------------------------------------------------------------- Podium final
  function showFinal(fin, { onDone }) {
    card.innerHTML = '';
    const cupLike = { league: fin.league };
    const won = fin.rank === 1;
    card.insertAdjacentHTML('beforeend', `<div class="cup-title">${t('COUPE {l}', { l: leagueName(fin.league) })} — ${t('RÉSULTAT')}</div>`);
    if (won) card.insertAdjacentHTML('beforeend', `<div class="cup-trophy">${ico('trophy')}</div>`);
    const pod = document.createElement('div');
    pod.className = 'podium';
    for (const rank of [2, 1, 3]) {
      const r = fin.table[rank - 1];
      if (!r) continue;
      const w = who(save, cupLike, r.name);
      const el = document.createElement('div');
      el.className = `pod p${rank} ${r.name === PLAYER ? 'me' : ''}`;
      el.append(carIcon(w.car, w.colors, 220, 140));
      el.insertAdjacentHTML('beforeend', `<div class="pn">${r.name === PLAYER ? playerLabel() : r.name}</div><div class="pp">${r.points} pts</div><div class="step">${rank}</div>`);
      pod.append(el);
    }
    card.append(pod);
    const msg = won ? t('TU REMPORTES LA COUPE !') : fin.rank <= 3 ? t('PODIUM : {p} PLACE !', { p: ord(fin.rank, true).toUpperCase() }) : t('{p} PLACE AU CLASSEMENT', { p: ord(fin.rank, true).toUpperCase() });
    card.insertAdjacentHTML('beforeend', `<div class="cup-result" style="color:${won ? '#ffd34d' : fin.rank <= 3 ? '#fff' : 'var(--muted)'}">${msg}</div>`);
    const g = fin.reward;
    card.insertAdjacentHTML('beforeend', `<div class="cup-gains">
      ${g.trophies ? `<span class="tr">+${g.trophies} ${ico('trophy')}</span>` : ''}
      <span class="cr">${ico('credit')} +${g.credits}</span>
      ${g.pack ? `<span class="pk" style="color:${PACKS[g.pack].color}">${PACKS[g.pack].name}</span>` : ''}</div>`);
    if (fin.unlockedCars?.length) card.insertAdjacentHTML('beforeend', `<div class="promo">${t('NOUVELLE VOITURE DÉBLOQUÉE : {c}', { c: fin.unlockedCars.map((c) => c.name).join(', ') })}</div>`);
    const act = document.createElement('div');
    act.className = 'cup-actions';
    act.innerHTML = `<button class="menu-btn primary" id="cup-done">${g.pack ? t('OUVRIR LE PACK ›') : t('TERMINER')}</button>`;
    card.append(act);
    card.insertAdjacentHTML('beforeend', `<div class="cup-box cup-final-table"><h4>${t('CLASSEMENT FINAL')}</h4>${tableHtml(cupLike, fin.table)}</div>`);
    $('cup-done').onclick = () => { close(); onDone(); };
    open();
    if (fin.rank <= 3) { stopFx = confetti($('cup-fx')); setTimeout(() => sfx?.finish(1), 900); }
  }

  return { showIntro, showStandings, showFinal, close };
}
