// Écran de la route des trophées : une récompense par palier.
import { PACKS } from '../data/economy.js';
import { getCar } from '../data/cars.js';
import { roadStatus, claimMilestone, claimableCount } from '../progression/economy.js';
import { liveryFor } from '../progression/garage.js';
import { carIcon } from './carIcon.js';
import { showRewards } from './packOpen.js';

const $ = (id) => document.getElementById(id);

export function createRoad({ save, onSave, sfx, onClose }) {
  const strip = $('road-strip');

  function rewardHtml(rw) {
    const parts = [];
    if (rw.credits) parts.push(`<div style="color:#7af7ff">⚡ ${rw.credits}</div>`);
    if (rw.pack) { const p = PACKS[rw.pack]; parts.push(`<span class="rn-pack" style="color:${p.color}">${p.name}</span>`); }
    if (rw.car) parts.push(`<div>${getCar(rw.car).name}</div>`);
    return parts.join('');
  }

  function render() {
    $('road-trophies').textContent = save.trophies;
    $('road-credits').textContent = `⚡ ${save.credits}`;
    strip.innerHTML = '';
    const list = roadStatus(save);
    let focus = null;
    for (const m of list) {
      const node = document.createElement('div');
      node.className = 'road-node ' + (m.claimed ? 'claimed reached' : m.reached ? 'available reached' : 'locked');
      const rew = document.createElement('div');
      rew.className = 'rn-rew';
      if (m.reward.car) rew.append(carIcon(getCar(m.reward.car), liveryFor(save, m.reward.car), 112, 68, { dim: !m.reached }));
      rew.insertAdjacentHTML('beforeend', rewardHtml(m.reward));
      node.insertAdjacentHTML('afterbegin', `<div class="rn-at">🏆 ${m.at}</div>`);
      node.append(rew);
      if (m.claimed) node.insertAdjacentHTML('beforeend', '<div class="rn-state">✓ Récupéré</div>');
      else if (m.reached) {
        const b = document.createElement('button');
        b.className = 'menu-btn primary';
        b.textContent = 'RÉCUPÉRER';
        b.addEventListener('click', () => claim([m.at]));
        node.append(b);
      } else node.insertAdjacentHTML('beforeend', `<div class="rn-state">encore ${m.at - save.trophies}</div>`);
      if (!focus && (!m.claimed)) focus = node;
      strip.append(node);
    }
    // Marque l'endroit où se trouve le joueur sur la route
    focus?.classList.add('current-marker');
    focus?.scrollIntoView({ block: 'nearest', inline: 'center' });
    const n = claimableCount(save);
    $('road-claim-all').disabled = n === 0;
    $('road-hint').textContent = n ? `${n} récompense${n > 1 ? 's' : ''} à récupérer !` : 'Gagne des trophées en course pour avancer sur la route.';
  }

  function claim(list) {
    const results = [];
    for (const at of list) {
      const got = claimMilestone(save, at);
      if (!got) continue;
      if (got.packs.length) got.packs.forEach((p, k) => results.push({ packId: p.id, gains: p.gains, credits: k === 0 ? got.credits : 0, car: k === 0 ? got.car : null }));
      else results.push({ credits: got.credits, car: got.car, gains: [] });
    }
    onSave();
    render();
    if (results.length) showRewards(save, results, { sfx, onClose: render });
  }

  $('road-claim-all').addEventListener('click', () => claim(roadStatus(save).filter((m) => m.reached && !m.claimed).map((m) => m.at)));
  $('road-back').addEventListener('click', () => { $('road').classList.add('hidden'); onClose?.(); });

  return {
    open() { render(); $('road').classList.remove('hidden'); },
  };
}
