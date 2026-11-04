// Règles de la boutique (sans affichage, testées dans tools/progressionCheck.js).
//
// Les offres du jour sont générées à partir de la date et du joueur (graine) :
// elles restent identiques si on recharge la page, et changent à minuit.

import { t } from '../i18n/index.js';
import { CARS, getCar } from '../data/cars.js';
import { PACKS, UNLOCK_FRAGMENTS, MAX_LEVEL } from '../data/economy.js';
import { DAILY_GIFTS, FINISHES, MOTIFS, TRAILS, SMOKES, OFFERS, AVG_CREDITS_PER_RACE } from '../data/shop.js';
import { isOwned } from './garage.js';
import { carLevel, fragmentsOf, upgradeCost, openPack } from './economy.js';
import { mulberry32 } from '../core/math.js';

// ---------- Dates ----------
/** Clé du jour (heure locale), ex. « 2026-10-31 ». */
export function dayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
/** Millisecondes avant minuit (prochaines offres). */
export function msUntilMidnight(date = new Date()) {
  const m = new Date(date);
  m.setHours(24, 0, 0, 0);
  return m - date;
}
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Combien de courses (en moyenne) pour gagner `missing` crédits. */
export const racesFor = (missing) => Math.max(1, Math.ceil(missing / AVG_CREDITS_PER_RACE));

// ---------- Cosmétiques ----------
// Les 4 familles de cosmétiques : liste, case de la sauvegarde, objets gratuits
export const STYLE_KINDS = {
  finish: { list: FINISHES, key: 'finishes', free: ['standard'], label: t('FINITION') },
  motif: { list: MOTIFS, key: 'motifs', free: ['origin', 'none'], label: t('MOTIF') },
  trail: { list: TRAILS, key: 'trails', free: ['neon'], label: t('TRAÎNÉE DE BOOST') },
  smoke: { list: SMOKES, key: 'smokes', free: ['standard'], label: t('FUMÉE DE DRIFT') },
};
export function ownsStyle(save, kind, id) {
  const k = STYLE_KINDS[kind];
  return !!k && (k.free.includes(id) || (save.cosmetics[k.key] ?? []).includes(id));
}
export const ownsFinish = (save, id) => ownsStyle(save, 'finish', id);
export const ownsMotif = (save, id) => ownsStyle(save, 'motif', id);
/** Nombre de cosmétiques achetés ou gagnés (succès STYLISTE). */
export const cosmeticsCount = (save) => Object.values(STYLE_KINDS).reduce((n, k) => n + (save.cosmetics[k.key]?.length ?? 0), 0);

/** Intérêt d'une voiture pour des fragments : verrouillée et proche du but d'abord. */
function fragmentNeed(save, car) {
  if (!isOwned(save, car.id)) {
    if (!UNLOCK_FRAGMENTS[car.id]) return { score: 0, need: 0 }; // (voiture du passe de saison)
    const need = UNLOCK_FRAGMENTS[car.id] ?? 0;
    return { score: 2 + fragmentsOf(save, car.id) / Math.max(1, need), need };
  }
  if (carLevel(save, car.id) >= MAX_LEVEL) return { score: 0, need: 0 };
  const c = upgradeCost(save, car.id);
  return { score: 1 + fragmentsOf(save, car.id) / Math.max(1, c.fragments), need: c.fragments };
}

/** Voiture la plus proche d'un objectif (pour le cadeau « fragments »). */
export function bestFragmentTarget(save) {
  return CARS.map((c) => ({ car: c, ...fragmentNeed(save, c) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.car ?? CARS[0];
}

// ---------- Génération des offres du jour ----------
export function generateOffers(save, day) {
  const rng = mulberry32(hash(`${day}|${save.createdAt}`));
  const pickWeighted = (items) => {
    const tot = items.reduce((s, x) => s + x.w, 0);
    let r = rng() * tot;
    for (const x of items) { r -= x.w; if (r <= 0) return x; }
    return items[items.length - 1];
  };
  const offers = [];
  const round5 = (n) => Math.round(n / 5) * 5;

  // Voitures intéressantes pour des fragments
  const candidates = CARS.map((c) => ({ car: c, ...fragmentNeed(save, c) })).filter((x) => x.score > 0);
  const used = new Set();
  const takeCar = () => {
    const pool = candidates.filter((x) => !used.has(x.car.id)).map((x) => ({ ...x, w: x.score }));
    if (!pool.length) return null;
    const x = pickWeighted(pool);
    used.add(x.car.id);
    return x.car;
  };

  // 1) Offre spéciale (-30 %) : fragments de la voiture la plus proche du but
  const best = [...candidates].sort((a, b) => b.score - a.score)[0];
  if (best) {
    used.add(best.car.id);
    const b = OFFERS.fragmentBundles[2];
    offers.push({ id: 'featured', kind: 'fragments', carId: best.car.id, amount: b.amount, price: round5(b.price * (1 - OFFERS.featuredDiscount)), oldPrice: b.price, featured: true });
  }
  // 2-4) Trois lots de fragments
  OFFERS.fragmentBundles.forEach((b, k) => {
    const car = takeCar();
    if (car) offers.push({ id: `frag${k}`, kind: 'fragments', carId: car.id, amount: b.amount, price: b.price });
  });
  // 5) Un cosmétique non possédé (-20 %)
  const styles = [
    ...Object.entries(STYLE_KINDS).flatMap(([kind, k]) => k.list.filter((x) => x.price && !x.exclusive && !ownsStyle(save, kind, x.id)).map((x) => ({ kind, item: x, w: 1 }))),
  ];
  if (styles.length) {
    const s = pickWeighted(styles);
    offers.push({ id: 'style', kind: s.kind, itemId: s.item.id, price: round5(s.item.price * (1 - OFFERS.styleDiscount)), oldPrice: s.item.price });
  }
  // 6) Un pack en promotion (-20 %)
  const packId = rng() < 0.6 ? 'medium' : 'large';
  offers.push({ id: 'pack', kind: 'pack', packId, price: round5(PACKS[packId].price * (1 - OFFERS.packDiscount)), oldPrice: PACKS[packId].price });

  return offers.map((o) => ({ ...o, bought: false }));
}

/** Met les offres à jour si le jour a changé. Retourne true si elles sont nouvelles. */
export function refreshShop(save, day = dayKey()) {
  if (save.shop.day === day && save.shop.offers.length) return false;
  save.shop.day = day;
  save.shop.offers = generateOffers(save, day);
  return true;
}

// ---------- Achats ----------
function pay(save, price) {
  if (save.credits < price) return { ok: false, reason: 'credits', missing: price - save.credits };
  save.credits -= price;
  return { ok: true };
}

/** Achète une offre du jour. Retourne le détail de ce qui a été obtenu. */
export function buyOffer(save, offerId, rng) {
  const o = save.shop.offers.find((x) => x.id === offerId);
  if (!o) return { ok: false, reason: 'missing' };
  if (o.bought) return { ok: false, reason: 'bought' };
  if (STYLE_KINDS[o.kind] && ownsStyle(save, o.kind, o.itemId)) return { ok: false, reason: 'owned' };
  const p = pay(save, o.price);
  if (!p.ok) return p;
  o.bought = true;
  if (o.kind === 'fragments') {
    save.cars.fragments[o.carId] = fragmentsOf(save, o.carId) + o.amount;
    return { ok: true, kind: 'fragments', gains: [{ carId: o.carId, amount: o.amount, car: getCar(o.carId) }] };
  }
  if (o.kind === 'pack') return { ok: true, kind: 'pack', packId: o.packId, gains: openPack(save, o.packId, rng) };
  if (STYLE_KINDS[o.kind]) { save.cosmetics[STYLE_KINDS[o.kind].key].push(o.itemId); return { ok: true, kind: o.kind, itemId: o.itemId }; }
  return { ok: false, reason: 'unknown' };
}

/** Achète un pack au prix normal (onglet PACKS). */
export function buyPackItem(save, packId, rng) {
  const pack = PACKS[packId];
  if (!pack) return { ok: false, reason: 'missing' };
  const p = pay(save, pack.price);
  if (!p.ok) return p;
  return { ok: true, kind: 'pack', packId, gains: openPack(save, packId, rng) };
}

/** Achète une finition ou un motif au prix normal (onglet STYLE). */
export function buyStyle(save, kind, id) {
  const k = STYLE_KINDS[kind];
  const item = k?.list.find((x) => x.id === id);
  if (!item) return { ok: false, reason: 'missing' };
  if (item.exclusive) return { ok: false, reason: 'exclusive' };
  if (ownsStyle(save, kind, id)) return { ok: false, reason: 'owned' };
  const p = pay(save, item.price);
  if (!p.ok) return p;
  save.cosmetics[k.key].push(id);
  return { ok: true, kind, itemId: id };
}

/** Applique une finition / un motif possédé à une voiture. */
export function equipStyle(save, carId, kind, id) {
  if (!ownsStyle(save, kind, id)) return false;
  const l = (save.garage.liveries[carId] ??= {});
  l[kind] = id;
  return true;
}

// ---------- Cadeau quotidien ----------
export const giftAvailable = (save, day = dayKey()) => save.shop.giftDay !== day;
export const giftIndex = (save) => save.shop.giftStreak % DAILY_GIFTS.length;

export function claimGift(save, day = dayKey(), rng) {
  if (!giftAvailable(save, day)) return null;
  const idx = giftIndex(save);
  const g = DAILY_GIFTS[idx];
  save.shop.giftDay = day;
  save.shop.giftStreak++;
  const got = { index: idx, credits: 0, packId: null, gains: [] };
  if (g.credits) { save.credits += g.credits; got.credits = g.credits; }
  if (g.pack) { got.packId = g.pack; got.gains = openPack(save, g.pack, rng); }
  if (g.fragments) {
    const car = bestFragmentTarget(save);
    save.cars.fragments[car.id] = fragmentsOf(save, car.id) + g.fragments;
    got.gains = [{ carId: car.id, amount: g.fragments, car }];
  }
  return got;
}

/** Nombre de choses à voir dans la boutique (pastille du menu). */
export function shopBadge(save, day = dayKey()) {
  let n = giftAvailable(save, day) ? 1 : 0;
  if (save.shop.seenDay !== day) n++;
  return n;
}
