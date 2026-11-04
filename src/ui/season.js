// Écran du passe de saison : 100 niveaux à faire défiler, récompenses à récupérer.

import { t, fmtNum, many } from '../i18n/index.js';
import { SEASON, XP, BONUS_XP } from '../data/season.js';
import { PACKS } from '../data/economy.js';
import { FINISHES, MOTIFS } from '../data/shop.js';
import { AVATARS } from '../data/profile.js';
import { getCar } from '../data/cars.js';
import { selectedCar, liveryFor } from '../progression/garage.js';
import { seasonLevel, tierStatus, claimTier, claimBonus, bonusAvailable, doubleRacesLeft, seasonBadge } from '../progression/season.js';
import { ico } from './icons.js';
import { avatarSvg } from './avatar.js';
import { carIcon } from './carIcon.js';
import { showRewards } from './packOpen.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => fmtNum(Math.floor(n));

/** Aperçu d'une finition / d'un motif sur la voiture du joueur. */
function stylePreview(save, kind, id, w = 96, h = 96) {
  const car = selectedCar(save);
  return carIcon(getCar(car), { ...liveryFor(save, car), [kind]: id }, w, h);
}

/** Visuel principal d'une récompense (DOM). */
function rewardVisual(save, r) {
  const box = document.createElement('div');
  box.className = 'pt-vis';
  if (r.car) {
    box.append(carIcon(getCar(r.car), getCar(r.car).colors, 120, 120));
    box.insertAdjacentHTML('beforeend', `<span class="pt-name">${getCar(r.car).name}</span>`);
  } else if (r.finish) {
    box.append(stylePreview(save, 'finish', r.finish));
    box.insertAdjacentHTML('beforeend', `<span class="pt-name">${t('FINITION')} ${FINISHES.find((f) => f.id === r.finish).name}</span>`);
  } else if (r.motif) {
    box.append(stylePreview(save, 'motif', r.motif));
    box.insertAdjacentHTML('beforeend', `<span class="pt-name">${t('MOTIF')} ${MOTIFS.find((m) => m.id === r.motif).name}</span>`);
  } else if (r.avatar) {
    box.insertAdjacentHTML('beforeend', `<span class="avatar av-m" style="--ac:${save.profile.color}">${avatarSvg(r.avatar)}</span><span class="pt-name">${t('EMBLÈME')} ${AVATARS.find((a) => a.id === r.avatar).name.toUpperCase()}</span>`);
  } else if (r.pack) {
    const p = PACKS[r.pack];
    box.insertAdjacentHTML('beforeend', `<span class="pt-pack" style="--pc:${p.color}">${p.name}</span>`);
  } else if (r.fragments) {
    box.insertAdjacentHTML('beforeend', `<span class="pt-frag">${r.fragments}<small>${t('FRAGMENTS')}</small></span>`);
  } else if (r.credits) {
    box.insertAdjacentHTML('beforeend', `<span class="pt-cr">${ico('credit')}${fmt(r.credits)}</span>`);
  }
  // Extras (titre, crédits en plus d'un autre objet)
  if (r.title) box.insertAdjacentHTML('beforeend', `<span class="pt-title">${t('TITRE')} « ${t(r.title)} »</span>`);
  if (r.credits && (r.pack || r.title || r.car || r.finish || r.motif)) box.insertAdjacentHTML('beforeend', `<span class="pt-cr small">+${ico('credit')}${fmt(r.credits)}</span>`);
  return box;
}

/** Récompenses obtenues → écrans d'ouverture. Beaucoup d'un coup : regroupées. */
export function toScreens(save, got) {
  if (got.length > 3) {
    const out = [];
    let credits = 0;
    const frags = new Map();
    for (const g of got) {
      credits += g.credits;
      for (const x of g.gains) frags.set(x.carId, { ...x, amount: (frags.get(x.carId)?.amount ?? 0) + x.amount });
    }
    if (credits) out.push({ credits, title: t('{n} NIVEAUX RÉCUPÉRÉS', { n: got.length }) });
    if (frags.size) out.push({ title: t('FRAGMENTS'), gains: [...frags.values()] });
    // Les objets exclusifs gardent chacun leur écran
    const special = got.filter((g) => g.car || g.finish || g.motif || g.avatar || g.title)
      .map((g) => ({ ...g, credits: 0, packId: null, gains: [] }));
    return [...out, ...toScreens(save, special.length > 3 ? [] : special), ...(special.length > 3 ? special.flatMap((g) => toScreens(save, [g])) : [])];
  }
  const out = [];
  for (const g of got) {
    if (g.packId) out.push({ packId: g.packId, gains: g.gains, credits: g.credits });
    else if (g.car) out.push({ car: g.car, credits: g.credits });
    else if (g.gains.length) out.push({ title: t('FRAGMENTS'), gains: g.gains });
    const excl = g.finish ? [t('FINITION EXCLUSIVE'), stylePreview(save, 'finish', g.finish, 260, 166), FINISHES.find((f) => f.id === g.finish).name]
      : g.motif ? [t('MOTIF EXCLUSIF'), stylePreview(save, 'motif', g.motif, 260, 166), MOTIFS.find((m) => m.id === g.motif).name]
      : null;
    if (excl) out.push({ title: excl[0], visual: excl[1], note: t('<b>{x}</b> : à équiper au garage !', { x: excl[2] }) });
    if (g.avatar) {
      const v = document.createElement('div');
      v.innerHTML = `<span class="avatar av-l" style="--ac:${save.profile.color}">${avatarSvg(g.avatar)}</span>`;
      out.push({ title: t('EMBLÈME EXCLUSIF'), visual: v.firstChild, note: t('À choisir dans ton <b>profil</b> !') });
    }
    if (g.title && !g.car) out.push({ title: t('NOUVEAU TITRE'), credits: g.credits && !g.packId ? g.credits : 0, note: t('<b>« {x} »</b> : à afficher dans ton profil !', { x: t(g.title) }) });
    else if (g.title && g.car) out.push({ title: t('NOUVEAU TITRE'), credits: 0, note: `<b>« ${t(g.title)} »</b>` });
    else if (!g.packId && !g.car && !g.gains.length && !excl && !g.avatar && g.credits) out.push({ credits: g.credits });
  }
  return out;
}

export function createSeasonScreen({ save, onSave, sfx, onClose }) {
  const strip = $('pass-strip');

  function renderHead() {
    const s = seasonLevel(save.pass.xp);
    $('pass-credits').innerHTML = `${ico('credit')}<b class="cr-num">${fmt(save.credits)}</b>`;
    $('pass-level').textContent = String(s.level);
    $('pass-fill').style.width = `${(s.into / s.need) * 100}%`;
    $('pass-xp').textContent = s.max ? t('Coffre bonus : {a} / {b} XP', { a: fmt(s.into), b: fmt(BONUS_XP) }) : t('{a} / {b} XP vers le niveau {n}', { a: fmt(s.into), b: fmt(s.need), n: s.level + 1 });
    const d = doubleRacesLeft(save);
    $('pass-daily').innerHTML = d ? t(many(d) ? '<b>XP ×2</b> sur tes {n} prochaines courses aujourd\'hui' : '<b>XP ×2</b> sur ta prochaine course aujourd\'hui', { n: d }) : t('Bonus XP ×2 du jour utilisé · revient demain');
    const n = seasonBadge(save);
    $('pass-claim-all').disabled = !n;
    $('pass-hint').textContent = n ? t(many(n) ? '{n} récompenses à récupérer !' : '{n} récompense à récupérer !', { n }) : t('Joue pour gagner de l\'XP et monter de niveau.');
  }

  function render() {
    renderHead();
    strip.innerHTML = '';
    let focus = null;
    const level = seasonLevel(save.pass.xp).level;
    for (const tr of tierStatus(save)) {
      const node = document.createElement('div');
      node.className = `pt ${tr.special ? 'special' : ''} ${tr.tier === SEASON.tiers ? 'final' : ''} ${tr.claimed ? 'claimed' : tr.reached ? 'ready' : 'locked'}`;
      node.insertAdjacentHTML('beforeend', `<div class="pt-tier">${tr.tier}</div>`);
      node.append(rewardVisual(save, tr.reward));
      if (tr.claimed) node.insertAdjacentHTML('beforeend', '<div class="pt-state">✓</div>');
      else if (tr.reached) {
        const b = document.createElement('button');
        b.className = 'menu-btn primary';
        b.textContent = t('RÉCUPÉRER');
        b.addEventListener('click', () => claim([tr.tier]));
        node.append(b);
      } else node.insertAdjacentHTML('beforeend', `<div class="pt-state">${ico('lock')}</div>`);
      if (!focus && !tr.claimed && (tr.reached || tr.tier === level + 1)) focus = node;
      strip.append(node);
    }
    // Coffre bonus (après le niveau 100)
    const chest = document.createElement('div');
    const nb = bonusAvailable(save);
    chest.className = `pt bonus ${nb ? 'ready' : 'locked'}`;
    chest.innerHTML = `<div class="pt-tier">100+</div><div class="pt-vis"><span class="pt-pack" style="--pc:#ffd34d">${t('COFFRE BONUS')}</span><small class="pt-note">${t('Tous les {n} XP après le niveau 100', { n: fmt(BONUS_XP) })}</small></div>`;
    if (nb) {
      const b = document.createElement('button');
      b.className = 'menu-btn primary';
      b.textContent = `OUVRIR (${nb})`;
      b.addEventListener('click', () => claim([], true));
      chest.append(b);
    }
    strip.append(chest);
    focus ??= chest;
    focus.classList.add('focus');
    requestAnimationFrame(() => { strip.scrollLeft = focus.offsetLeft - strip.clientWidth / 2 + focus.offsetWidth / 2; });
  }

  function claim(tiers, bonus = false) {
    const got = [];
    for (const tier of tiers) { const g = claimTier(save, tier); if (g) got.push(g); }
    if (bonus) { let g; while ((g = claimBonus(save))) got.push(g); }
    if (!got.length) return;
    onSave();
    sfx?.purchase?.();
    render();
    showRewards(save, toScreens(save, got), { sfx, onClose: render });
  }

  $('pass-claim-all').addEventListener('click', () => {
    claim(tierStatus(save).filter((x) => x.reached && !x.claimed).map((x) => x.tier), true);
  });
  $('pass-back').addEventListener('click', () => { $('pass').classList.add('hidden'); onClose?.(); });
  $('pass-howto').addEventListener('click', () => $('pass-help').classList.toggle('hidden'));
  $('pass-help').innerHTML = `
    <b>${t('Comment gagner de l\'XP ?')}</b>
    <span>${t('Course classée, élimination, coupe : de {a} à {b} XP selon ta place', { a: XP.race[XP.race.length - 1], b: XP.race[0] })}</span>
    <span>${t('GIGA RUSH : de 40 à 120 XP · fin de coupe : jusqu\'à {n} XP en plus', { n: XP.cupFinal[0] })}</span>
    <span>${t('Tes {n} premières courses de chaque jour : <b>XP ×2</b>', { n: XP.dailyDoubleRaces })}</span>
    <span>${t('Missions : {a} XP (jour), {b} XP (semaine), {c} XP (bonus des 3)', { a: XP.missionDaily, b: XP.missionWeekly, c: XP.missionBonus })}</span>
    <span>${t('Chrono : {a} XP par tour valide (jusqu\'à {b} par jour), {c} XP par médaille · Succès : {d} XP par palier', { a: XP.ttLap, b: XP.ttLapDailyCap, c: XP.ttMedal, d: XP.achievement })}</span>`;

  return { open() { $('pass-help').classList.add('hidden'); render(); $('pass').classList.remove('hidden'); } };
}
