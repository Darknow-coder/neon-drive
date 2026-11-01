// Écran du mode CARRIÈRE : chapitres, défis à étoiles, duel du rival,
// et scènes de dialogue (présentation et fin de chapitre).

import { CHAPTERS, DUEL_STARS_NEEDED, STAGE_TYPE_LABEL, starTexts, STAR_CREDITS, stageById } from '../data/career.js';
import { RIVALS } from '../data/rivals.js';
import { LEAGUES } from '../data/progression.js';
import { PACKS } from '../data/economy.js';
import { FINISHES, MOTIFS } from '../data/shop.js';
import { AVATARS } from '../data/profile.js';
import { getCar } from '../data/cars.js';
import { getTrackData } from '../data/tracks/index.js';
import { weatherOf } from '../data/weather.js';
import { campaignStatus, currentChapter, timeTargets, totalStars, markSeen, MAX_STARS } from '../progression/campaign.js';
import { selectedCar, liveryFor } from '../progression/garage.js';
import { formatTime } from '../core/math.js';
import { ico } from './icons.js';
import { avatarSvg } from './avatar.js';
import { carIcon } from './carIcon.js';
import { showRewards } from './packOpen.js';
import { toScreens } from './season.js';

const $ = (id) => document.getElementById(id);
const rivalOf = (ch) => Object.values(RIVALS).find((r) => r.id === ch.rival);
const leagueOf = (ch) => LEAGUES.find((l) => l.id === ch.league);

/** Temps lisible : « 52,6 s » ou « 1 min 04,2 s ». */
export function fmtSec(t) {
  const m = Math.floor(t / 60), sec = (t - m * 60).toFixed(1).replace('.', ',');
  return m ? `${m} min ${sec.padStart(4, '0')} s` : `${sec} s`;
}

/** Étoiles (HTML) : `n` pleines sur 3. */
export function starsHtml(n, cls = '') {
  return `<span class="stars ${cls}">${[0, 1, 2].map((k) => `<i class="${k < n ? 'on' : ''}">${ico('star')}</i>`).join('')}</span>`;
}

/** Textes des 3 objectifs d'un défi. */
export function stageGoals(raw) {
  const stage = raw.chapter ? raw : stageById(raw.id);
  const rv = rivalOf(stage.chapter);
  const times = stage.type === 'time' ? timeTargets(stage).map(fmtSec) : [];
  return starTexts(stage, rv.name, times);
}

function bestText(stage, best) {
  if (best === undefined) return '';
  if (stage.type === 'time') return `Meilleur temps : ${fmtSec(best)}`;
  if (stage.type === 'duel') return `Meilleure avance : ${best.toFixed(2)} s`;
  return `Meilleure place : ${best === 1 ? '1re' : `${best}e`}`;
}

/** Portrait d'un personnage du dialogue (rival = sa voiture, RADIO = casque). */
function portrait(who, ch) {
  const box = document.createElement('div');
  box.className = 'dlg-face';
  if (who === 'RADIO') {
    box.classList.add('radio');
    box.innerHTML = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 18v-3a9 9 0 0 1 18 0v3"/><rect x="4" y="17" width="5" height="8" rx="2"/><rect x="23" y="17" width="5" height="8" rx="2"/><path d="M25 25c0 2-2 3-5 3h-3"/></svg>';
  } else {
    const rv = rivalOf(ch);
    box.style.setProperty('--rc', rv.colors.glow);
    box.append(carIcon(getCar(rv.car), rv.colors, 120, 120));
  }
  return box;
}

export function createCareerScreen({ save, onSave, sfx, onPlay, onClose }) {
  let current = null;

  // ------------------------------------------------------------ Dialogue
  function dialogue(ch, lines, { title, onDone } = {}) {
    const box = $('dialog');
    let k = -1, typing = null, shown = 0;
    $('dlg-chapter').textContent = title ?? `CHAPITRE ${ch.n} · ${ch.title}`;
    function finish() {
      clearInterval(typing);
      box.classList.add('hidden');
      box.onclick = null;
      onDone?.();
    }
    function next() {
      clearInterval(typing);
      k++;
      if (k >= lines.length) return finish();
      const [who, text] = lines[k];
      const face = $('dlg-portrait');
      face.innerHTML = '';
      face.append(portrait(who, ch));
      $('dlg-name').textContent = who === 'RADIO' ? 'RADIO · TON INGÉNIEUR' : who;
      $('dlg-name').style.color = who === 'RADIO' ? '#7af7ff' : rivalOf(ch).colors.glow;
      const t = $('dlg-text');
      shown = 0;
      t.textContent = '';
      typing = setInterval(() => {
        shown = Math.min(text.length, shown + 2);
        t.textContent = text.slice(0, shown);
        if (shown >= text.length) clearInterval(typing);
      }, 28);
      sfx?.click?.();
    }
    box.onclick = (e) => {
      if (e.target.closest?.('#dlg-skip')) return finish();
      const text = lines[k]?.[1] ?? '';
      if (shown < text.length) { clearInterval(typing); shown = text.length; $('dlg-text').textContent = text; return; }
      next();
    };
    box.classList.remove('hidden');
    next();
  }

  // ------------------------------------------------------------ Affichage
  function rewardChips(ch) {
    const r = ch.reward;
    const out = [];
    if (r.credits) out.push(`<span class="crw">${ico('credit')}${r.credits}</span>`);
    if (r.pack) out.push(`<span class="crw pack" style="--pc:${PACKS[r.pack].color}">${PACKS[r.pack].name}</span>`);
    if (r.title) out.push(`<span class="crw title">TITRE « ${r.title} »</span>`);
    if (r.avatar) out.push(`<span class="crw excl"><span class="avatar av-s" style="--ac:${save.profile.color}">${avatarSvg(r.avatar)}</span>EMBLÈME ${AVATARS.find((a) => a.id === r.avatar).name.toUpperCase()}</span>`);
    if (r.finish) out.push(`<span class="crw excl">FINITION ${FINISHES.find((f) => f.id === r.finish).name}</span>`);
    if (r.motif) out.push(`<span class="crw excl">MOTIF ${MOTIFS.find((m) => m.id === r.motif).name}</span>`);
    return out.join('');
  }

  function render() {
    const status = campaignStatus(save);
    $('career-stars').innerHTML = `${ico('star')}<b>${totalStars(save)}</b>/${MAX_STARS}`;
    // Onglets des chapitres
    const tabs = $('cr-chapters');
    tabs.innerHTML = '';
    for (const st of status) {
      const lg = leagueOf(st.ch);
      const b = document.createElement('button');
      b.className = `cr-tab ${st.ch === current ? 'on' : ''} ${st.unlocked ? '' : 'locked'} ${st.done ? 'done' : ''}`;
      b.style.setProperty('--lc', lg.color);
      b.innerHTML = `<span class="crt-n">${st.unlocked ? st.ch.n : ico('lock')}</span><span class="crt-t"><b>${rivalOf(st.ch).name}</b><small>${st.done ? '✓ TERMINÉ' : st.unlocked ? `${st.stars + st.duelStars} / 15 ${ico('star')}` : lg.name}</small></span>${st.unlocked && !st.seen ? '<span class="badge">!</span>' : ''}`;
      b.addEventListener('click', () => select(st.ch));
      tabs.append(b);
    }
    const st = status.find((s) => s.ch === current);
    const ch = current, rv = rivalOf(ch), lg = leagueOf(ch);

    // Carte du rival
    const card = $('cr-rival');
    card.innerHTML = '';
    card.style.setProperty('--rc', rv.colors.glow);
    card.style.setProperty('--lc', lg.color);
    card.insertAdjacentHTML('beforeend', `<div class="crr-kicker">CHAPITRE ${ch.n} · <span>${lg.name}</span></div><div class="crr-title">${ch.title}</div>`);
    const show = document.createElement('div');
    show.className = 'crr-car';
    show.append(carIcon(getCar(rv.car), rv.colors, 200, 200));
    card.append(show);
    card.insertAdjacentHTML('beforeend', `<div class="crr-name">${rv.name}</div><div class="crr-quote">« ${ch.intro[ch.intro.length - 1][1]} »</div>
      <div class="crr-rew-t">RÉCOMPENSE DU CHAPITRE</div><div class="crr-rew">${rewardChips(ch)}</div>`);
    if (st.unlocked) {
      const replay = document.createElement('button');
      replay.className = 'menu-btn small-btn crr-story';
      replay.textContent = 'REVOIR L\'HISTOIRE';
      replay.addEventListener('click', () => dialogue(ch, ch.intro));
      card.append(replay);
    }

    // Défis
    const list = $('cr-stages');
    list.innerHTML = '';
    if (!st.unlocked) {
      list.innerHTML = `<div class="cr-locked">${ico('lock')}<b>CHAPITRE VERROUILLÉ</b><span>${st.lockReason}</span></div>`;
      return;
    }
    [...ch.stages, ch.duel].forEach((stage, k) => {
      const isDuel = stage.type === 'duel';
      const stars = save.campaign.stars[stage.id] ?? 0;
      const locked = isDuel && !st.duelUnlocked;
      const td = getTrackData(stage.track);
      const wx = td.weather && td.weather !== 'clear' ? ` · ${weatherOf(td.weather).name}` : '';
      const laps = stage.type === 'elim' ? 'élimination' : `${stage.laps} tour${stage.laps > 1 ? 's' : ''}`;
      const goals = stageGoals(stage);
      const row = document.createElement('div');
      row.className = `cr-stage ${isDuel ? 'duel' : ''} ${locked ? 'locked' : ''} ${stars === 3 ? 'perfect' : ''}`;
      row.innerHTML = `
        <div class="crs-n">${isDuel ? ico('career') : k + 1}</div>
        <div class="crs-main">
          <div class="crs-top"><span class="crs-type t-${stage.type}">${STAGE_TYPE_LABEL[stage.type]}</span><b>${stage.title}</b></div>
          <div class="crs-track">${td.name}${wx} · ${laps}</div>
          <div class="crs-goals">${goals.map((g, i) => `<span class="${i < stars ? 'ok' : ''}">${ico('star')}${g}</span>`).join('')}</div>
          ${bestText(stage, save.campaign.best[stage.id]) ? `<div class="crs-best">${bestText(stage, save.campaign.best[stage.id])}</div>` : ''}
        </div>
        <div class="crs-side">${starsHtml(stars)}</div>`;
      const side = row.querySelector('.crs-side');
      if (locked) {
        side.insertAdjacentHTML('beforeend', `<div class="crs-lock">${ico('lock')} encore ${DUEL_STARS_NEEDED - st.stars} ${ico('star')}</div>`);
      } else {
        const b = document.createElement('button');
        b.className = `menu-btn ${stars ? '' : 'primary'}`;
        b.innerHTML = `${ico('play')} ${stars ? 'REJOUER' : 'JOUER'}`;
        b.addEventListener('click', () => { sfx?.click?.(); $('career').classList.add('hidden'); onPlay(stage.id); });
        side.append(b);
      }
      list.append(row);
    });
    list.insertAdjacentHTML('beforeend', `<div class="cr-note">Chaque nouvelle étoile rapporte ${STAR_CREDITS * ch.n} crédits · ${DUEL_STARS_NEEDED} étoiles débloquent le duel</div>`);
  }

  /** Sélectionne un chapitre (et joue sa présentation la première fois). */
  function select(ch) {
    current = ch;
    render();
    const st = campaignStatus(save).find((s) => s.ch === ch);
    if (st.unlocked && !st.seen) {
      markSeen(save, ch.id);
      onSave();
      dialogue(ch, ch.intro, { onDone: render });
    }
  }

  $('career-back').addEventListener('click', () => { $('career').classList.add('hidden'); onClose?.(); });

  return {
    /**
     * Ouvre l'écran. `after` : résultat d'un défi (fin de chapitre → dialogue
     * de fin, récompenses, puis chapitre suivant).
     */
    open(after = null) {
      $('career').classList.remove('hidden');
      if (after?.chapterDone) {
        const ch = after.chapterDone.chapter;
        current = ch;
        render();
        dialogue(ch, ch.outro, {
          title: `CHAPITRE ${ch.n} TERMINÉ !`,
          onDone: () => {
            showRewards(save, [{ title: `CHAPITRE ${ch.n} TERMINÉ`, credits: 0, note: `Tu as battu <b>${rivalOf(ch).name}</b> !` }, ...toScreens(save, [after.chapterDone.got])], {
              sfx,
              onClose: () => { const next = CHAPTERS[ch.n]; if (next) select(next); else render(); },
            });
          },
        });
        return;
      }
      select(after?.stage?.chapter ?? current ?? currentChapter(save));
    },
  };
}
