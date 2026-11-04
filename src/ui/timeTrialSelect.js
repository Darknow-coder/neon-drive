// Écran de choix du circuit pour le contre-la-montre.
import { t, ord, many } from '../i18n/index.js';
import { TRACKS } from '../data/tracks/index.js';
import { MEDALS, medalTimes } from '../data/timeTrial.js';
import { getCar } from '../data/cars.js';
import { buildTrack } from '../track/buildTrack.js';
import { bestTime, medalsWon, medalCounts } from '../progression/timeTrial.js';
import { selectedCar } from '../progression/garage.js';
import { formatTime } from '../core/math.js';
import { chronoSummary, chronoBoard, fetchGhost, uploadPending } from '../online/chrono.js';
import { canSync } from '../online/sync.js';
import { avatarHtml } from './avatar.js';
import { ico } from './icons.js';

const $ = (id) => document.getElementById(id);
const minimaps = new Map();
const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tagOf = (n) => `#${String(n).padStart(4, '0')}`;
const nth = (n) => ord(n);

/** Petit plan du circuit (dessiné une fois). */
export function minimap(td) {
  if (minimaps.has(td.id)) return minimaps.get(td.id);
  const t = buildTrack(td);
  const W = 380, H = 192;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  const b = t.bounds;
  const sc = Math.min((W - 20) / (b.maxX - b.minX), (H - 20) / (b.maxY - b.minY));
  const ox = (W - (b.maxX - b.minX) * sc) / 2 - b.minX * sc;
  const oy = (H - (b.maxY - b.minY) * sc) / 2 - b.minY * sc;
  c.lineJoin = 'round';
  c.beginPath();
  for (let i = 0; i <= t.count; i++) { const k = i % t.count; const x = t.x[k] * sc + ox, y = t.y[k] * sc + oy; i ? c.lineTo(x, y) : c.moveTo(x, y); }
  c.strokeStyle = 'rgba(0,240,255,0.25)'; c.lineWidth = 9; c.stroke();
  c.strokeStyle = td.theme?.left ?? '#00f0ff'; c.lineWidth = 3; c.stroke();
  c.fillStyle = '#fff';
  c.beginPath(); c.arc(t.x[0] * sc + ox, t.y[0] * sc + oy, 5, 0, Math.PI * 2); c.fill();
  minimaps.set(td.id, cv);
  return cv;
}

export function createTimeTrialSelect({ save, onStart, onClose, sfx }) {
  // ------------------------------------------------------------ Liste des circuits
  function render() {
    const counts = medalCounts(save);
    $('tt-total').innerHTML = MEDALS.map((m) => `<span><i class="medal on" style="--mc:${m.color};width:16px;height:16px;font-size:0"></i>${counts[m.id]}</span>`).join('');
    $('tt-car').textContent = getCar(selectedCar(save)).name;
    const list = $('tt-list');
    list.innerHTML = '';
    const online = canSync(save);
    for (const td of TRACKS.filter((t) => !t.custom)) {
      const best = bestTime(save, td.id);
      const won = new Set(medalsWon(save, td.id));
      const times = medalTimes(td.id) ?? [];
      const nextNotWon = times.find((m) => !won.has(m.id));
      const el = document.createElement('div');
      el.className = 'tt-track';
      el.append(minimap(td));
      el.insertAdjacentHTML('beforeend', `
        <div class="tn">${td.name}</div>
        <div class="tp">${td.profile}</div>
        <div class="tb">${best ? formatTime(best) : '–:––.–––'} <span>${best ? t('ton record') : t('pas encore de record')}</span></div>
        <div class="tt-medals">${times.map((m) => `<i class="medal ${won.has(m.id) ? 'on' : ''}" style="--mc:${m.color}" title="${m.name} : ${formatTime(m.time)}">${m.id === 'neon' ? 'N' : m.name[0]}</i>`).join('')}</div>
        <div class="tt-next">${nextNotWon ? t('Prochaine : {m} en {t}', { m: nextNotWon.name, t: formatTime(nextNotWon.time) }) : t('★ Toutes les médailles !')}</div>
        ${online ? `<div class="tt-online" data-online="${td.id}"><span class="tt-wait">${t('Classement…')}</span></div>` : ''}
        <div class="tt-btns">
          ${online ? `<button class="menu-btn tt-rank" title="${t('Classement et fantômes')}" aria-label="${t('Classement et fantômes')}">${ico('trophy')}</button>` : ''}
          <button class="menu-btn primary tt-go">${t('ROULER')}</button>
        </div>`);
      el.addEventListener('click', () => { close(); onStart(td.id, null); });
      el.querySelector('.tt-rank')?.addEventListener('click', (e) => { e.stopPropagation(); sfx?.click?.(); openBoard(td); });
      list.append(el);
    }
    if (online) fillOnline();
  }

  /** Ligne « en ligne » de chaque carte : ma place mondiale et le meilleur ami. */
  async function fillOnline() {
    await uploadPending(save); // records faits hors ligne
    const map = await chronoSummary(save, { fresh: true });
    document.querySelectorAll('[data-online]').forEach((box) => {
      const r = map?.[box.dataset.online];
      if (!map) { box.innerHTML = `<span class="tt-wait">${t('Hors ligne')}</span>`; return; }
      if (!r || !r.players) { box.innerHTML = `<span class="tt-wait">${t('Aucun temps en ligne : sois le premier !')}</span>`; return; }
      const mine = r.my_time ? `<span class="tt-wr">${t('MONDE')} <b>${nth(Number(r.my_rank))}</b>/${r.players}</span>`
        : `<span class="tt-wr">${t(many(r.players) ? '{n} pilotes · record <b>{t}</b>' : '{n} pilote · record <b>{t}</b>', { n: r.players, t: formatTime(r.world_time) })}</span>`;
      const fr = r.friend_name
        ? `<span class="tt-fr${r.my_time && r.friend_time < r.my_time ? ' ahead' : ''}">${t('AMI')} ${esc(r.friend_name)} <b>${formatTime(r.friend_time)}</b></span>` : '';
      box.innerHTML = mine + fr;
    });
  }

  function close() { $('tt-select').classList.add('hidden'); }
  $('tt-back').addEventListener('click', () => { close(); onClose?.(); });

  // ------------------------------------------------------------ Classement d'un circuit
  let board = null; // { td, scope, pick, rows }
  function openBoard(td) {
    const mine = bestTime(save, td.id);
    board = { td, scope: 'world', pick: mine ? { kind: 'mine' } : { kind: 'neon' }, rows: [] };
    $('tb-title').textContent = td.name;
    $('tb-total').textContent = '';
    document.querySelectorAll('[data-tbtab]').forEach((b) => b.classList.toggle('on', b.dataset.tbtab === 'world'));
    $('tt-board').classList.remove('hidden');
    renderPick();
    loadBoard();
  }

  function pickLabel(p) {
    if (p.kind === 'mine') return t('MON RECORD');
    if (p.kind === 'neon') return 'NEON';
    return `${esc(p.name)} ${tagOf(p.tag)}`;
  }

  function renderPick() {
    const mine = bestTime(save, board.td.id);
    const p = board.pick;
    $('tb-ghosts').innerHTML = `<span class="tb-lbl">${t('FANTÔME :')}</span>
      <button class="tb-chip${p.kind === 'mine' ? ' on' : ''}" data-pick="mine" ${mine ? '' : 'disabled'}>${t('MON RECORD')} <b>${mine ? formatTime(mine) : '—'}</b></button>
      <button class="tb-chip${p.kind === 'neon' ? ' on' : ''}" data-pick="neon">NEON <b>${t('IA ÉLITE')}</b></button>
      ${p.kind === 'player' ? `<span class="tb-chip on">${pickLabel(p)} <b>${formatTime(p.time)}</b></span>` : `<span class="tb-hint">${t('ou touche un pilote du classement')}</span>`}`;
    $('tb-ghosts').querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      sfx?.click?.(); board.pick = { kind: b.dataset.pick }; renderPick(); renderRows();
    }));
    $('tb-go').textContent = t('ROULER CONTRE {x}', { x: p.kind === 'player' ? p.name : pickLabel(p) });
    $('tb-go').disabled = false;
  }

  function renderRows() {
    const box = $('tb-list');
    const rows = board.rows;
    if (!rows.length) {
      box.innerHTML = `<div class="rk-off"><b>${board.scope === 'friends' ? t('AUCUN AMI') : t('PERSONNE')}</b>${board.scope === 'friends'
        ? t('Aucun de tes amis n\'a encore de temps ici. Ajoute des amis depuis le CLASSEMENT du menu.')
        : t('Aucun temps en ligne sur ce circuit : fais un tour et deviens le premier !')}</div>`;
      return;
    }
    const p = board.pick;
    box.innerHTML = rows.map((r) => {
      const on = (r.me && p.kind === 'mine') || (p.kind === 'player' && p.id === r.player_id);
      const medal = r.rank <= 3 ? ` top${r.rank}` : '';
      return `<button class="rk-row tb-row${r.me ? ' me' : ''}${medal}${on ? ' picked' : ''}" data-pid="${r.player_id}">
        <span class="rk-pos">${r.rank}</span>
        ${avatarHtml({ avatar: r.avatar, color: r.color }, 'av-s')}
        <span class="rk-name"><b>${esc(r.name)}<i>${tagOf(r.tag)}</i></b><small>${esc(getCar(r.car).name)}</small></span>
        <span class="tb-time">${formatTime(r.lap_time)}</span>
        <span class="tb-ghost">${on ? t('CHOISI') : r.me ? t('MOI') : t('DÉFIER')}</span>
      </button>`;
    }).join('');
    box.querySelectorAll('[data-pid]').forEach((b) => b.addEventListener('click', () => {
      const r = rows.find((x) => x.player_id === b.dataset.pid);
      sfx?.click?.();
      board.pick = r.me ? (bestTime(save, board.td.id) ? { kind: 'mine' } : { kind: 'player', id: r.player_id, name: r.name, tag: r.tag, time: r.lap_time })
        : { kind: 'player', id: r.player_id, name: r.name, tag: r.tag, time: r.lap_time };
      renderPick(); renderRows();
    }));
  }

  let loadId = 0;
  async function loadBoard() {
    const id = ++loadId;
    const { td, scope } = board;
    $('tb-list').innerHTML = `<div class="rk-wait">${t('Chargement…')}</div>`;
    try {
      const rows = await chronoBoard(td.id, scope);
      if (id !== loadId) return;
      board.rows = rows ?? [];
      const me = board.rows.find((r) => r.me);
      $('tb-total').textContent = me ? t('Ta place : {p}', { p: nth(Number(me.rank)) }) : '';
      renderRows();
    } catch {
      if (id !== loadId) return;
      board.rows = [];
      $('tb-list').innerHTML = `<div class="rk-off"><b>${t('HORS LIGNE')}</b>${t('Le classement n\'est pas disponible. Tu peux quand même rouler contre ton record ou NEON.')}</div>`;
    }
  }

  document.querySelectorAll('[data-tbtab]').forEach((b) => b.addEventListener('click', () => {
    if (!board || board.scope === b.dataset.tbtab) return;
    sfx?.click?.();
    board.scope = b.dataset.tbtab;
    document.querySelectorAll('[data-tbtab]').forEach((x) => x.classList.toggle('on', x === b));
    loadBoard();
  }));
  $('tb-back').addEventListener('click', () => { $('tt-board').classList.add('hidden'); board = null; });
  $('tb-go').addEventListener('click', async () => {
    if (!board) return;
    const { td, pick } = board;
    let rival = null;
    if (pick.kind === 'neon') rival = { ghost: 'neon' };
    if (pick.kind === 'player') {
      const go = $('tb-go');
      go.disabled = true; go.textContent = t('TÉLÉCHARGEMENT DU FANTÔME…');
      try {
        const g = await fetchGhost(pick.id, td.id);
        if (!g) throw new Error('vide');
        rival = { ghost: g.ghost, label: g.name, time: g.time };
      } catch {
        go.disabled = false; go.textContent = t('FANTÔME INDISPONIBLE : RÉESSAYER');
        return;
      }
      if (board?.td !== td) return; // fermé entre-temps
    }
    $('tt-board').classList.add('hidden');
    board = null;
    close();
    onStart(td.id, rival);
  });

  return { open() { render(); $('tt-select').classList.remove('hidden'); } };
}
