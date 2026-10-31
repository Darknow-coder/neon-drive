// Ouverture d'un pack : les fragments obtenus apparaissent carte par carte.
import { PACKS, UNLOCK_FRAGMENTS } from '../data/economy.js';
import { isOwned, liveryFor } from '../progression/garage.js';
import { fragmentsOf, upgradeCost } from '../progression/economy.js';
import { carIcon } from './carIcon.js';

const $ = (id) => document.getElementById(id);

/**
 * @param results [{ packId?, gains: [{car, amount}] , credits?, car? }]
 *                (plusieurs packs/récompenses peuvent s'enchaîner)
 */
export function showRewards(save, results, { sfx, onClose } = {}) {
  const queue = results.slice();
  const next = () => {
    const r = queue.shift();
    if (!r) { $('pack-open').classList.add('hidden'); onClose?.(); return; }
    show(r);
  };
  function show(r) {
    const pack = r.packId ? PACKS[r.packId] : null;
    $('pack-title').textContent = pack ? pack.name : 'RÉCOMPENSE';
    $('pack-title').style.textShadow = pack ? `0 0 12px ${pack.color}` : '';
    const extra = [];
    if (r.credits) extra.push(`+${r.credits} ⚡ crédits`);
    if (r.car) extra.push(`Nouvelle voiture : ${r.car.name} !`);
    $('pack-extra').textContent = extra.join(' · ');
    const box = $('pack-cards');
    box.innerHTML = '';
    const cards = [];
    if (r.car) cards.push({ car: r.car, amount: 0, isCar: true });
    for (const g of r.gains ?? []) cards.push(g);
    cards.forEach((g, k) => {
      const d = document.createElement('div');
      d.className = 'pcard';
      d.style.animationDelay = `${k * 0.25}s`;
      const owned = isOwned(save, g.car.id);
      const have = fragmentsOf(save, g.car.id);
      let goal, need;
      if (g.isCar) { goal = 'Débloquée !'; need = 0; d.classList.add('ready'); }
      else if (!owned) { need = UNLOCK_FRAGMENTS[g.car.id]; goal = `${have} / ${need} pour la débloquer`; }
      else {
        const c = upgradeCost(save, g.car.id);
        need = c ? c.fragments : 0;
        goal = c ? `${have} / ${need} pour le niveau ${c.level}` : 'Niveau maximum';
      }
      if (need && have >= need) d.classList.add('ready');
      d.append(carIcon(g.car, liveryFor(save, g.car.id), 200, 128));
      d.insertAdjacentHTML('beforeend', `
        ${g.isCar ? '<div class="pc-n">★</div>' : `<div class="pc-n">+${g.amount}</div>`}
        <div class="pc-name">${g.car.name}</div>
        <div class="pc-goal">${goal}</div>
        ${need ? `<div class="frag-bar"><div class="frag-fill" style="width:${Math.min(100, (have / need) * 100)}%"></div></div>` : ''}`);
      box.append(d);
      setTimeout(() => sfx?.click(), k * 250 + 150);
    });
    $('pack-open').classList.remove('hidden');
    if (cards.length) setTimeout(() => sfx?.unlock(), cards.length * 250 + 200);
  }
  $('pack-ok').onclick = next;
  next();
}
