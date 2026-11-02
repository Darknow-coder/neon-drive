// Écran de résultats de fin de course.

import { playerLabel } from './playerLabel.js';
import { formatTime } from '../core/math.js';
import { leagueProgress } from '../data/progression.js';
import { ico } from './icons.js';
import { seasonLevel } from '../progression/season.js';
import { stageGoals } from './career.js';

const el = (id) => document.getElementById(id);

export function showResults(rows, { trackName, reward = null, training = false, credits = null, missions = [], event = null, season = null, career = null }) {
  const me = rows.find((r) => r.isPlayer);
  const p = me ? me.position : rows.length;
  el('res-place').innerHTML = `${p}<sup>${p === 1 ? 'er' : 'e'}</sup>`;
  el('res-title').textContent =
    p === 1 ? 'VICTOIRE !' : p <= 3 ? 'PODIUM !' : p <= 5 ? 'BIEN JOUÉ' : 'COURSE TERMINÉE';
  el('res-track').textContent = trackName;

  const bestOfRace = Math.min(...rows.map((r) => r.bestLap));
  const tbody = el('res-rows');
  tbody.innerHTML = '';
  // Grand plateau (20 voitures) : le haut du classement et les voisins du joueur
  const big = rows.length > 10;
  const shown = big ? rows.filter((r) => r.position <= 6 || Math.abs(r.position - p) <= 1 || r.position === rows.length) : rows;
  let prev = 0;
  for (const r of shown) {
    if (big && r.position > prev + 1) {
      const gap = document.createElement('tr');
      gap.className = 'res-gap';
      gap.innerHTML = '<td></td><td colspan="4">· · ·</td>';
      tbody.append(gap);
    }
    prev = r.position;
    const tr = document.createElement('tr');
    if (r.isPlayer) tr.className = 'me';
    else if (r.isRival) tr.className = 'rival';
    // Encore en piste : temps estimé s'il est proche de l'arrivée, sinon « non terminé »
    const far = r.estimated && r.gap > 15 && !r.label;
    const time = far ? 'NON TERMINÉ' : r.position === 1 ? formatTime(r.time) : `+${r.gap.toFixed(2)} s`;
    tr.innerHTML = `
      <td class="pos">${r.position}</td>
      <td class="name"><i style="background:${r.colors.body};box-shadow:0 0 6px ${r.colors.glow}"></i>${r.isPlayer ? playerLabel() : r.isRival ? `★ ${r.name}` : r.name}</td>
      <td class="hide-narrow">${r.car}</td>
      <td class="${r.estimated ? 'est' : ''}">${r.label ?? `${time}${r.estimated && !far ? ' ~' : ''}`}</td>
      <td class="hide-narrow ${r.bestLap === bestOfRace ? 'best' : ''}">${formatTime(r.bestLap)}</td>`;
    tbody.append(tr);
  }
  // Crédits gagnés (détail)
  const cb = el('res-credits');
  cb.classList.toggle('hidden', !credits);
  if (credits) {
    cb.innerHTML = `<span class="ct">${ico('credit', 'big')}+${credits.total}</span>` +
      credits.lines.map((l) => `<span class="cl">${l.label} <b>+${l.amount}</b></span>`).join('') +
      (credits.shopHint ? `<span class="shop-hint">De quoi t'offrir en boutique : <b>${credits.shopHint}</b></span>` : '');
  }

  // Carrière : étoiles du défi
  const cb2 = el('res-career');
  cb2.classList.toggle('hidden', !career);
  el('btn-menu').textContent = career ? (career.backLabel ?? 'CARRIÈRE') : 'MENU';
  if (career) {
    const goals = career.goals ?? stageGoals(career.stage);
    cb2.innerHTML = `<div class="rc-stars">${[0, 1, 2].map((k) => `<i class="${k < career.stars ? 'on' : ''} ${k >= career.prev && k < career.stars ? 'new' : ''}" style="animation-delay:${0.25 + k * 0.25}s">${ico('star')}</i>`).join('')}</div>
      <div class="rc-goals">${goals.map((g, k) => `<span class="${k < career.stars ? 'ok' : ''}">${k < career.stars ? '✓' : '✗'} ${g}</span>`).join('')}</div>
      ${career.extra ? `<div class="rc-done">${career.extra}</div>` : ''}
      ${career.chapterDone ? `<div class="rc-done">CHAPITRE ${career.chapterDone.chapter.n} TERMINÉ ! Récompenses sur l'écran Carrière</div>` : ''}
      ${career.stars === 0 ? '<div class="rc-fail">Objectif manqué : réessaie !</div>' : ''}`;
  }

  // Passe de saison : XP gagnée
  const sp = el('res-pass');
  sp.classList.toggle('hidden', !season);
  if (season) {
    const lv = seasonLevel(season.xp);
    sp.innerHTML = `<span class="rp-t">${ico('pass')} PASSE DE SAISON</span><b>+${season.gained} XP</b>${season.doubled ? '<i>×2</i>' : ''}
      <span class="rp-lvl">NIV. ${lv.level}</span><span class="rp-bar"><em style="width:${(lv.into / lv.need) * 100}%"></em></span>
      ${season.after > season.before ? `<span class="rp-up">NIVEAU ${season.after} ATTEINT ! Récompense dans le PASSE</span>` : ''}`;
  }

  // Missions qui ont progressé
  const mb = el('res-missions');
  mb.classList.toggle('hidden', !missions.length);
  if (missions.length) {
    const done = missions.filter((c) => c.done).length;
    mb.innerHTML = `<div class="rt">${done ? `MISSION${done > 1 ? 'S' : ''} ACCOMPLIE${done > 1 ? 'S' : ''} ! RÉCUPÈRE TA RÉCOMPENSE DANS MISSIONS` : 'MISSIONS'}</div>` +
      missions.map((c) => `<span class="${c.done ? 'ok' : ''}">${c.mission.text} <b>${c.done ? '✓' : `${c.after}/${c.mission.target}`}</b></span>`).join('');
  }

  // Trophées et ligue
  const box = el('res-reward');
  box.classList.toggle('hidden', !reward);
  el('res-promo').classList.add('hidden');
  el('res-cars').classList.add('hidden');
  el('res-rival').classList.add('hidden');
  el('res-record').classList.add('hidden');
  if (training) {
    el('res-record').textContent = 'ENTRAÎNEMENT — PAS DE TROPHÉES';
    el('res-record').classList.remove('hidden');
  }
  if (event) {
    if (event.goals.length) {
      el('res-promo').textContent = `OBJECTIF${event.goals.length > 1 ? 'S' : ''} ATTEINT${event.goals.length > 1 ? 'S' : ''} : ${event.goals.join(' · ')} !`;
      el('res-promo').classList.remove('hidden');
    }
    if (event.record) {
      el('res-record').textContent = event.record;
      el('res-record').classList.remove('hidden');
    }
  }
  if (reward) {
    el('res-gain').textContent = `+${reward.gained}`;
    const rivalRow = rows.find((r) => r.isRival);
    if (rivalRow) {
      const rb = el('res-rival');
      rb.classList.remove('hidden');
      rb.classList.toggle('won', reward.rivalBeaten);
      rb.textContent = reward.rivalBeaten
        ? `★ RIVAL ${rivalRow.name} BATTU ! +${reward.rivalBonus} TROPHÉES BONUS${reward.firstRivalWin ? ' — PREMIÈRE FOIS !' : ''}`
        : `★ ${rivalRow.name} a fini devant toi — bats-le pour +3 trophées bonus`;
    }
    const tag = el('res-league');
    tag.textContent = reward.newLeague.name;
    tag.style.color = reward.newLeague.color;
    el('res-total').textContent = `${reward.after} trophée${reward.after > 1 ? 's' : ''}`;
    // La barre part de l'ancienne valeur puis se remplit
    const fill = el('res-fill');
    fill.style.transition = 'none';
    fill.style.width = `${Math.round(leagueProgress(reward.promoted ? reward.newLeague.min : reward.before) * 100)}%`;
    void fill.offsetWidth;
    fill.style.transition = '';
    setTimeout(() => { fill.style.width = `${Math.round(leagueProgress(reward.after) * 100)}%`; }, 350);
    if (reward.promoted) {
      const unlocked = reward.unlockedTracks.map((t) => t.name).join(', ');
      el('res-promo').textContent = `NOUVELLE LIGUE : ${reward.newLeague.name} !${unlocked ? ` — circuit débloqué : ${unlocked}` : ''}`;
      el('res-promo').classList.remove('hidden');
    }
    if (reward.unlockedCars?.length) {
      el('res-cars').textContent = `NOUVELLE VOITURE DÉBLOQUÉE : ${reward.unlockedCars.map((c) => c.name).join(', ')} — à essayer dans le garage !`;
      el('res-cars').classList.remove('hidden');
    }
    if (reward.newRecord) {
      el('res-record').textContent = reward.previousRecord
        ? `NOUVEAU RECORD DU TOUR : ${formatTime(me.bestLap)} (avant : ${formatTime(reward.previousRecord)})`
        : `PREMIER RECORD DU TOUR : ${formatTime(me.bestLap)}`;
      el('res-record').classList.remove('hidden');
    }
  }
  el('results').classList.remove('hidden');
}

export function hideResults() {
  el('results').classList.add('hidden');
}
