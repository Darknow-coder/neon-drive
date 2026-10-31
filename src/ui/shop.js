// Écran de la boutique : À LA UNE (cadeau + offres du jour), PACKS, STYLE.
// Chaque achat passe par une fiche de confirmation (aperçu, prix, solde après).

import { getCar } from '../data/cars.js';
import { PACKS, UNLOCK_FRAGMENTS } from '../data/economy.js';
import { DAILY_GIFTS, FINISHES, MOTIFS } from '../data/shop.js';
import {
  dayKey, msUntilMidnight, refreshShop, buyOffer, buyPackItem, buyStyle, equipStyle,
  claimGift, giftAvailable, giftIndex, ownsFinish, ownsMotif, racesFor, bestFragmentTarget,
} from '../progression/shop.js';
import { fragmentsOf, upgradeCost } from '../progression/economy.js';
import { isOwned, liveryFor, selectedCar } from '../progression/garage.js';
import { makeCarSprite } from '../render/carSprite.js';
import { carIcon } from './carIcon.js';
import { ico } from './icons.js';
import { showRewards } from './packOpen.js';

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString('fr-FR');

export function createShop({ save, onSave, sfx, onClose }) {
  let tab = 'featured';
  let styleTab = 'finish';
  let timer = 0;
  let previewRaf = 0;
  const body = $('shop-body');

  // ---------------------------------------------------------------- Solde
  let shownCredits = save.credits;
  function updateWallet(animate = false) {
    const chip = $('shop-credits');
    const target = save.credits;
    if (!animate || target === shownCredits) {
      shownCredits = target;
      chip.innerHTML = `${ico('credit')}<b class="cr-num">${fmt(target)}</b>`;
      return;
    }
    const delta = target - shownCredits;
    const d = $('shop-delta');
    d.textContent = `${delta > 0 ? '+' : ''}${fmt(delta)}`;
    d.style.color = delta > 0 ? '#3dff9e' : '#ff6b8a';
    d.classList.remove('go'); void d.offsetWidth; d.classList.add('go');
    chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump');
    const from = shownCredits, t0 = performance.now();
    shownCredits = target;
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 600);
      chip.innerHTML = `${ico('credit')}<b class="cr-num">${fmt(Math.round(from + delta * (1 - Math.pow(1 - k, 3))))}</b>`;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- Aides
  const myCar = () => getCar(selectedCar(save));
  function styledColors(kind, id) {
    const base = liveryFor(save, myCar().id);
    return kind === 'finish' ? { ...base, finish: id } : { ...base, motif: id };
  }
  function priceHtml(price, oldPrice) {
    return `${ico('credit')}${fmt(price)}${oldPrice ? ` <s>${fmt(oldPrice)}</s>` : ''}`;
  }
  /** Objectif des fragments d'une voiture (déblocage ou niveau suivant). */
  function fragGoal(carId) {
    if (!isOwned(save, carId)) return { need: UNLOCK_FRAGMENTS[carId] ?? 0, label: 'pour la débloquer' };
    const c = upgradeCost(save, carId);
    return c ? { need: c.fragments, label: `pour le niveau ${c.level}` } : { need: 0, label: 'niveau max' };
  }
  function card({ cls = '', color = '#00f0ff', ribbon = '', ribbonCls = '', visual, title, sub, extra = '', price, onClick }) {
    const el = document.createElement('div');
    el.className = `sitem ${cls}`;
    el.style.setProperty('--ic', color);
    const vis = document.createElement('div');
    vis.className = 'vis';
    if (visual instanceof HTMLElement) vis.append(visual); else vis.innerHTML = visual ?? '';
    if (ribbon) vis.insertAdjacentHTML('beforeend', `<div class="ribbon ${ribbonCls}">${ribbon}</div>`);
    el.append(vis);
    el.insertAdjacentHTML('beforeend', `<div class="txt"><div class="ttl">${title}</div><div class="sub">${sub}</div>${extra}</div>${price}`);
    if (onClick) el.addEventListener('click', onClick);
    return el;
  }
  const priceBtn = (price, oldPrice) => `<div class="price ${save.credits < price ? 'cant' : ''}">${priceHtml(price, oldPrice)}</div>`;

  // ---------------------------------------------------------------- À LA UNE
  function giftCard() {
    const day = dayKey();
    const ready = giftAvailable(save, day);
    const idx = giftIndex(save);
    const g = DAILY_GIFTS[ready ? idx : (idx - 1 + DAILY_GIFTS.length) % DAILY_GIFTS.length];
    const what = g.credits ? `${ico('credit')} <b>${g.credits}</b> crédits`
      : g.pack ? `<b>${PACKS[g.pack].name}</b>`
      : `<b>${g.fragments}</b> fragments ${bestFragmentTarget(save).name}`;
    const days = DAILY_GIFTS.map((_, k) => {
      const done = k < idx || (!ready && k === (idx - 1 + DAILY_GIFTS.length) % DAILY_GIFTS.length && idx > 0);
      const today = ready && k === idx;
      return `<span class="${today ? 'today' : done ? 'done' : ''}">${done && !today ? '✓' : `J${k + 1}`}</span>`;
    }).join('');
    const el = card({
      cls: `gift ${ready ? 'ready' : ''}`,
      color: '#ff2bd6',
      visual: '<div class="gift-box"><i></i></div>',
      ribbon: ready ? 'GRATUIT' : '',
      ribbonCls: 'pink',
      title: 'CADEAU DU JOUR',
      sub: ready ? `Aujourd'hui : ${what}` : `Récupéré ! Reviens demain`,
      extra: `<div class="gift-days">${days}</div>`,
      price: ready ? '<div class="price equip">RÉCUPÉRER</div>' : `<div class="price done">✓ DEMAIN : NOUVEAU CADEAU</div>`,
      onClick: ready ? () => {
        const got = claimGift(save, day);
        if (!got) return;
        onSave();
        sfx?.purchase?.();
        updateWallet(true);
        render();
        const res = got.packId ? [{ packId: got.packId, gains: got.gains }]
          : got.gains.length ? [{ title: 'CADEAU DU JOUR', gains: got.gains }]
          : [{ credits: got.credits }];
        showRewards(save, res, { sfx, onClose: render });
      } : null,
    });
    return el;
  }

  function offerCard(o) {
    const bought = o.bought;
    const ribbon = o.featured ? `OFFRE SPÉCIALE −${Math.round((1 - o.price / o.oldPrice) * 100)} %` : o.oldPrice ? `−${Math.round((1 - o.price / o.oldPrice) * 100)} %` : '';
    const base = { cls: `${o.featured ? 'featured wide' : ''} ${bought ? 'bought' : ''}`, ribbon: bought ? 'ACHETÉ' : ribbon, ribbonCls: bought ? 'green' : '' };
    const price = bought ? '<div class="price done">✓ ACHETÉ</div>' : priceBtn(o.price, o.oldPrice);
    const click = bought ? null : () => confirmOffer(o);
    if (o.kind === 'fragments') {
      const car = getCar(o.carId);
      const have = fragmentsOf(save, o.carId);
      const goal = fragGoal(o.carId);
      const after = Math.min(100, ((have + o.amount) / Math.max(1, goal.need)) * 100);
      const now = Math.min(100, (have / Math.max(1, goal.need)) * 100);
      return card({
        ...base,
        color: car.colors.glow,
        visual: carIcon(car, isOwned(save, car.id) ? liveryFor(save, car.id) : car.colors, o.featured ? 380 : 300, o.featured ? 240 : 192),
        title: `${car.name}`,
        sub: `<b>×${o.amount}</b> fragments`,
        extra: goal.need ? `<div class="prog"><div class="pl">${have} → <b>${have + o.amount}</b> / ${goal.need}</div><div class="pg">${goal.label}</div>
          <div class="frag-bar" style="position:relative"><div class="frag-fill" style="position:absolute;inset:0 auto 0 0;width:${after}%;opacity:.35"></div><div class="frag-fill" style="position:absolute;inset:0 auto 0 0;width:${now}%"></div></div></div>` : '',
        price,
        onClick: click,
      });
    }
    if (o.kind === 'pack') {
      const p = PACKS[o.packId];
      return card({ ...base, color: p.color, visual: `<div class="mini-pack" style="--ic:${p.color}" data-n="×${p.fragments}"></div>`, title: p.name, sub: `<b>${p.fragments}</b> fragments`, price, onClick: click });
    }
    const list = o.kind === 'finish' ? FINISHES : MOTIFS;
    const item = list.find((x) => x.id === o.itemId);
    return card({
      ...base, color: '#b07aff',
      visual: carIcon(myCar(), styledColors(o.kind, o.itemId), 300, 192),
      title: item.name, sub: o.kind === 'finish' ? 'Finition de carrosserie' : 'Motif de décoration',
      price, onClick: click,
    });
  }

  function renderFeatured() {
    const sec = document.createElement('div');
    sec.className = 'shop-row';
    sec.append(giftCard());
    for (const o of save.shop.offers) sec.append(offerCard(o));
    body.append(sec);
  }

  // ---------------------------------------------------------------- PACKS
  function renderPacks() {
    const row = document.createElement('div');
    row.className = 'shop-row';
    for (const [id, p] of Object.entries(PACKS)) {
      row.append(card({
        cls: 'wide', color: p.color,
        visual: `<div class="mini-pack lg" style="--ic:${p.color}" data-n="×${p.fragments}"></div>`,
        title: p.name,
        sub: `<b>${p.fragments}</b> fragments répartis sur 2 à 4 voitures`,
        price: priceBtn(p.price),
        onClick: () => confirmPack(id),
      }));
    }
    body.append(row);
    body.insertAdjacentHTML('beforeend', `<div class="pack-note">Les fragments vont <b>en priorité aux voitures que tu n'as pas encore</b> : assez de fragments les débloquent avant leur palier de trophées. Pour tes voitures, ils servent aux améliorations.</div>`);
  }

  // ---------------------------------------------------------------- STYLE
  function renderStyle() {
    const car = myCar();
    const current = liveryFor(save, car.id);
    const sw = document.createElement('div');
    sw.className = 'style-switch';
    sw.innerHTML = `<button data-s="finish" class="${styleTab === 'finish' ? 'on' : ''}">FINITIONS</button><button data-s="motif" class="${styleTab === 'motif' ? 'on' : ''}">MOTIFS</button>
      <span>Aperçu sur ta <b>${car.name}</b> · s'utilise sur toutes tes voitures · aucun effet sur les performances</span>`;
    sw.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { styleTab = b.dataset.s; sfx?.click(); render(); }));
    body.append(sw);
    for (const [kind, list] of [['finish', FINISHES], ['motif', MOTIFS]]) {
      if (kind !== styleTab) continue;
      const sec = document.createElement('div');
      sec.className = 'shop-section';
      const row = document.createElement('div');
      row.className = 'shop-row';
      for (const item of list) {
        const owned = kind === 'finish' ? ownsFinish(save, item.id) : ownsMotif(save, item.id);
        const equipped = current[kind] === item.id;
        row.append(card({
          color: '#b07aff',
          visual: carIcon(car, styledColors(kind, item.id), 300, 192),
          ribbon: equipped ? 'ÉQUIPÉ' : '', ribbonCls: 'green',
          title: item.name, sub: item.desc,
          price: equipped ? '<div class="price done">✓ ÉQUIPÉ</div>'
            : owned ? `<div class="price equip">ÉQUIPER</div>`
            : priceBtn(item.price),
          onClick: equipped ? null : owned
            ? () => { equipStyle(save, car.id, kind, item.id); onSave(); sfx?.click(); render(); }
            : () => confirmStyle(kind, item),
        }));
      }
      sec.append(row);
      body.append(sec);
    }
  }

  // ---------------------------------------------------------------- Fiche de confirmation
  function stopPreview() { cancelAnimationFrame(previewRaf); }
  function previewCar(def, colors) {
    const cv = document.createElement('canvas');
    cv.width = 480; cv.height = 400;
    const c = cv.getContext('2d');
    const sp = makeCarSprite(def, 46, 24, colors);
    let a = -Math.PI / 2;
    const draw = () => {
      a += 0.008;
      c.clearRect(0, 0, 480, 400);
      c.save(); c.translate(240, 200); c.rotate(a);
      const sc = 4.6;
      c.drawImage(sp.canvas, -sp.ox * sc, -sp.oy * sc, sp.w * sc, sp.h * sc);
      c.restore();
      previewRaf = requestAnimationFrame(draw);
    };
    stopPreview();
    draw();
    return cv;
  }

  function openConfirm({ kind, title, desc, price, oldPrice, visual, color, buy }) {
    const v = $('confirm-visual');
    v.innerHTML = '';
    v.style.setProperty('--ic', color);
    if (visual instanceof HTMLElement) v.append(visual); else v.innerHTML = visual;
    $('confirm-kind').textContent = kind;
    $('confirm-title').textContent = title;
    $('confirm-desc').innerHTML = desc;
    const missing = price - save.credits;
    $('confirm-balance').innerHTML = missing > 0
      ? `<span class="miss">Il te manque ${ico('credit')}${fmt(missing)} — environ ${racesFor(missing)} course${racesFor(missing) > 1 ? 's' : ''}</span>`
      : `Ton solde : ${ico('credit')}${fmt(save.credits)} → <span class="after">${ico('credit')}${fmt(save.credits - price)}</span>`;
    const btn = $('confirm-buy');
    btn.disabled = missing > 0;
    btn.innerHTML = missing > 0 ? 'PAS ASSEZ DE CRÉDITS' : `ACHETER &nbsp;${priceHtml(price, oldPrice)}`;
    $('confirm-stamp').classList.add('hidden');
    btn.onclick = () => {
      const res = buy();
      if (!res?.ok) return;
      onSave();
      sfx?.purchase?.();
      updateWallet(true);
      $('confirm-stamp').textContent = res.equipped ? 'ACHETÉ & ÉQUIPÉ !' : 'ACHETÉ !';
      $('confirm-stamp').classList.remove('hidden');
      btn.disabled = true;
      setTimeout(() => {
        closeConfirm();
        render();
        if (res.kind === 'pack') showRewards(save, [{ packId: res.packId, gains: res.gains }], { sfx, onClose: render });
        else if (res.kind === 'fragments') showRewards(save, [{ title: 'FRAGMENTS', gains: res.gains }], { sfx, onClose: render });
      }, 900);
    };
    $('shop-confirm').classList.remove('hidden');
  }
  function closeConfirm() { stopPreview(); $('shop-confirm').classList.add('hidden'); }
  $('confirm-cancel').addEventListener('click', closeConfirm);

  function confirmOffer(o) {
    if (o.kind === 'fragments') {
      const car = getCar(o.carId);
      const goal = fragGoal(o.carId);
      const have = fragmentsOf(save, o.carId);
      openConfirm({
        kind: o.featured ? 'OFFRE SPÉCIALE DU JOUR' : 'FRAGMENTS', title: `${car.name} ×${o.amount}`, color: car.colors.glow,
        desc: goal.need ? `Tu auras <b>${have + o.amount} / ${goal.need}</b> fragments ${goal.label}.${have + o.amount >= goal.need ? ' <b style="color:#3dff9e">Objectif atteint !</b>' : ''}` : 'Fragments de cette voiture.',
        price: o.price, oldPrice: o.oldPrice,
        visual: previewCar(car, isOwned(save, car.id) ? liveryFor(save, car.id) : car.colors),
        buy: () => buyOffer(save, o.id),
      });
    } else if (o.kind === 'pack') {
      const p = PACKS[o.packId];
      openConfirm({
        kind: 'PACK EN PROMOTION', title: p.name, color: p.color,
        desc: `<b>${p.fragments} fragments</b> à découvrir, surtout pour les voitures que tu n'as pas encore.`,
        price: o.price, oldPrice: o.oldPrice,
        visual: `<div class="mini-pack xl" style="--ic:${p.color}" data-n="×${p.fragments}"></div>`,
        buy: () => buyOffer(save, o.id),
      });
    } else {
      const item = (o.kind === 'finish' ? FINISHES : MOTIFS).find((x) => x.id === o.itemId);
      confirmStyle(o.kind, item, o);
    }
  }

  function confirmPack(id) {
    const p = PACKS[id];
    openConfirm({
      kind: 'PACK', title: p.name, color: p.color,
      desc: `<b>${p.fragments} fragments</b> répartis sur 2 à 4 voitures, surtout celles que tu n'as pas encore.`,
      price: p.price,
      visual: `<div class="mini-pack xl" style="--ic:${p.color}" data-n="×${p.fragments}"></div>`,
      buy: () => buyPackItem(save, id),
    });
  }

  function confirmStyle(kind, item, offer = null) {
    const car = myCar();
    openConfirm({
      kind: kind === 'finish' ? 'FINITION · POUR TOUTES TES VOITURES' : 'MOTIF · POUR TOUTES TES VOITURES',
      title: item.name, color: '#b07aff',
      desc: `${item.desc}<br>Aperçu sur ta <b>${car.name}</b>. Purement esthétique : aucun effet sur les performances.`,
      price: offer ? offer.price : item.price, oldPrice: offer?.oldPrice,
      visual: previewCar(car, styledColors(kind, item.id)),
      buy: () => {
        const r = offer ? buyOffer(save, offer.id) : buyStyle(save, kind, item.id);
        if (r.ok) { equipStyle(save, car.id, kind, item.id); r.equipped = true; }
        return r;
      },
    });
  }

  // ---------------------------------------------------------------- Rendu / onglets
  function render() {
    body.innerHTML = '';
    body.scrollLeft = 0;
    updateWallet();
    document.querySelectorAll('.shop-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (tab === 'featured') renderFeatured();
    else if (tab === 'packs') renderPacks();
    else renderStyle();
  }
  document.querySelectorAll('.shop-tabs button').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; sfx?.click(); render(); }));

  function tick() {
    const ms = msUntilMidnight();
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
    const p = (n) => String(n).padStart(2, '0');
    $('shop-timer').innerHTML = `Nouvelles offres dans <b>${p(h)}:${p(m)}:${p(s)}</b>`;
    // Minuit passé pendant que la boutique est ouverte : nouvelles offres
    if (refreshShop(save)) { save.shop.seenDay = dayKey(); onSave(); render(); }
  }

  $('shop-back').addEventListener('click', () => close());
  function close() {
    clearInterval(timer);
    closeConfirm();
    $('shop').classList.add('hidden');
    onClose?.();
  }

  return {
    open(startTab = 'featured') {
      refreshShop(save);
      save.shop.seenDay = dayKey();
      onSave();
      tab = startTab;
      $('shop').classList.remove('hidden');
      render();
      tick();
      clearInterval(timer);
      timer = setInterval(tick, 1000);
    },
  };
}
