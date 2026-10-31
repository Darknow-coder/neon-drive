// Écran des missions : 3 missions du jour (+ bonus) et 1 mission de la semaine.
import { PACKS } from '../data/economy.js';
import { DAILY_BONUS } from '../data/missions.js';
import { refreshMissions, claimMission, claimDailyBonus, allDailyDone, msUntilWeekEnd } from '../progression/missions.js';
import { msUntilMidnight } from '../progression/shop.js';
import { ico } from './icons.js';
import { showRewards } from './packOpen.js';

const $ = (id) => document.getElementById(id);

function rewardHtml(r) {
  const parts = [];
  if (r.credits) parts.push(`${ico('credit')}${r.credits}`);
  if (r.fragments) parts.push(`<span class="rpack" style="color:#ffd34d">${r.fragments} FRAGMENTS</span>`);
  if (r.pack) parts.push(`<span class="rpack" style="color:${PACKS[r.pack].color}">${PACKS[r.pack].name}</span>`);
  return parts.join(' + ');
}

function fmtDuration(ms, days = false) {
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000);
  const p = (n) => String(n).padStart(2, '0');
  return days && d > 0 ? `${d} j ${h} h` : `${p(Math.floor(ms / 3600000))}:${p(m)}:${p(Math.floor((ms % 60000) / 1000))}`;
}

export function createMissions({ save, onSave, sfx, onClose }) {
  let timer = 0;

  function toRewards(got) {
    if (got.packId) return [{ packId: got.packId, gains: got.gains, credits: got.credits }];
    if (got.gains.length) return [{ title: 'FRAGMENTS', gains: got.gains }];
    return [{ credits: got.credits }];
  }

  function missionEl(m, weekly = false) {
    const done = m.progress >= m.target;
    const el = document.createElement('div');
    el.className = `mis ${weekly ? 'weekly' : ''} ${done ? 'done' : ''} ${m.claimed ? 'claimed' : ''}`;
    const pct = Math.round((m.progress / m.target) * 100);
    el.innerHTML = `
      <div class="mt">${m.text}</div>
      <div class="mbar"><i style="width:${pct}%"></i></div>
      <div class="mnum">${m.progress} / ${m.target}</div>
      <div class="mside"><div class="mrew">${rewardHtml(m.reward)}</div></div>`;
    const side = el.querySelector('.mside');
    if (m.claimed) side.insertAdjacentHTML('beforeend', '<div class="state">✓ RÉCUPÉRÉ</div>');
    else if (done) {
      const b = document.createElement('button');
      b.className = 'menu-btn primary';
      b.textContent = 'RÉCUPÉRER';
      b.addEventListener('click', () => {
        const got = claimMission(save, m.id);
        if (!got) return;
        onSave();
        sfx?.purchase?.();
        render();
        showRewards(save, toRewards(got), { sfx, onClose: render });
      });
      side.append(b);
    }
    return el;
  }

  function render() {
    $('missions-credits').innerHTML = `${ico('credit')}<b class="cr-num">${save.credits.toLocaleString('fr-FR')}</b>`;
    const daily = $('mis-daily');
    daily.innerHTML = '';
    for (const m of save.missions.daily) daily.append(missionEl(m));
    const weekly = $('mis-weekly');
    weekly.innerHTML = '';
    if (save.missions.weekly) weekly.append(missionEl(save.missions.weekly, true));

    // Bonus des 3 missions
    const nDone = save.missions.daily.filter((m) => m.progress >= m.target).length;
    const bonus = $('mis-bonus');
    const ready = allDailyDone(save) && !save.missions.bonusClaimed;
    bonus.className = `mis-bonus ${ready ? 'ready' : ''}`;
    bonus.innerHTML = `<div class="dots">${save.missions.daily.map((m) => `<i class="${m.progress >= m.target ? 'on' : ''}"></i>`).join('')}</div>
      <span>${save.missions.bonusClaimed ? '✓ Bonus récupéré' : `Termine les 3 : ${rewardHtml(DAILY_BONUS)}`}</span>`;
    if (ready) {
      const b = document.createElement('button');
      b.className = 'menu-btn primary';
      b.textContent = 'BONUS !';
      b.addEventListener('click', () => {
        const got = claimDailyBonus(save);
        if (!got) return;
        onSave();
        sfx?.purchase?.();
        render();
        showRewards(save, toRewards(got), { sfx, onClose: render });
      });
      bonus.append(b);
    }
    bonus.title = `${nDone} / 3 missions terminées`;
  }

  function tick() {
    $('mis-day-timer').innerHTML = `nouvelles dans <b>${fmtDuration(msUntilMidnight())}</b>`;
    $('mis-week-timer').innerHTML = `fin dans <b>${fmtDuration(msUntilWeekEnd(), true)}</b>`;
    if (refreshMissions(save)) { onSave(); render(); }
  }

  $('missions-back').addEventListener('click', () => {
    clearInterval(timer);
    $('missions').classList.add('hidden');
    onClose?.();
  });

  return {
    open() {
      if (refreshMissions(save)) onSave();
      $('missions').classList.remove('hidden');
      render();
      tick();
      clearInterval(timer);
      timer = setInterval(tick, 1000);
    },
  };
}
