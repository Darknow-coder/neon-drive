// Contre-la-montre : tours lancés en solo contre son fantôme.
//  - Chaque tour est enregistré ; un nouveau record remplace le fantôme.
//  - Sans record, on court contre le fantôme NEON (IA Élite).
//  - Utiliser « replacer la voiture » (⟲) invalide le tour en cours.
//  - Les médailles gagnées sont récompensées tout de suite ; les packs
//    s'ouvrent en sortant du mode (pour ne pas interrompre les tours).

import { createRaceScene } from './raceScene.js';
import { getTrackData } from '../data/tracks/index.js';
import { getCar } from '../data/cars.js';
import { medalTimes } from '../data/timeTrial.js';
import { NEON_TIMES } from '../data/timeTrialTargets.js';
import { createRecorder, decodeGhost, ghostAt, ghostTimeAtDist, loadGhost, saveGhost } from '../race/ghost.js';
import { computeNeonGhost } from '../race/aiGhost.js';
import { applyTimeTrialLap, bestTime } from '../progression/timeTrial.js';
import { formatTime } from '../core/math.js';
import { addTimeTrialLapXp, addSeasonXp } from '../progression/season.js';
import { XP } from '../data/season.js';

/** Fantôme NEON : calculé une fois puis gardé en mémoire (recalculé si la référence change). */
function neonGhost(trackId) {
  const key = `neondrive.neonghost.${trackId}`;
  try {
    const c = JSON.parse(localStorage.getItem(key) || 'null');
    if (c && c.ref === NEON_TIMES[trackId] && c.ghost?.data) return c.ghost;
  } catch { /* ignoré */ }
  const g = computeNeonGhost(getTrackData(trackId));
  try { localStorage.setItem(key, JSON.stringify({ ref: NEON_TIMES[trackId], ghost: g })); } catch { /* mémoire pleine : pas grave */ }
  return g;
}

export function createTimeTrial({ save, onSave, trackId, carId, colors, level, ...opts }) {
  let invalid = false;
  const scene = createRaceScene({
    ...opts, trackId, carId, playerColors: colors, playerLevel: level,
    laps: 9999, solo: true, countdown: 3, timeTrial: true,
    onRespawn: () => {
      if (scene.car.laps.lap >= 1 && !invalid) { invalid = true; scene.flash('TOUR INVALIDÉ (voiture replacée)', 2); }
    },
  });

  // Fantôme : record du joueur, sinon NEON
  let ghost = null;
  let ghostLabel = '';
  function setGhost(g, label) {
    ghost = g ? decodeGhost(g) : null;
    ghostLabel = label;
  }
  const mine = loadGhost(trackId);
  if (mine) setGhost(mine, 'RECORD');
  else setGhost(neonGhost(trackId), 'NEON');

  const recorder = createRecorder();
  let lapT0 = 0;
  const pendingRewards = [];
  const gpos = {};
  const medals = medalTimes(trackId) ?? [];

  function nextTargetText() {
    const best = bestTime(save, trackId);
    const next = [...medals].reverse().find((m) => !best || best > m.time);
    return next ? `Objectif ${next.name} : ${formatTime(next.time)}` : 'Toutes les médailles ! Bats ton record';
  }
  let announced = false;

  function onLapDone(time) {
    if (invalid) return;
    const res = applyTimeTrialLap(save, trackId, time);
    // XP de saison : tour valide (plafonné par jour) + médailles
    let xp = addTimeTrialLapXp(save).gained;
    if (res.newMedals.length) xp += addSeasonXp(save, XP.ttMedal * res.newMedals.length).gained;
    onSave();
    const parts = [];
    if (res.record) {
      saveGhost(trackId, recorder.finish(time, { carId, colors }));
      setGhost(loadGhost(trackId), 'RECORD');
      parts.push(`${res.previous ? 'NOUVEAU RECORD' : 'PREMIER RECORD'} ${formatTime(time)}${res.previous ? ` (−${(res.previous - time).toFixed(2)} s)` : ''}`);
    } else {
      parts.push(`Tour ${formatTime(time)} (+${(time - res.previous).toFixed(2)} s)`);
    }
    if (res.newMedals.length) {
      const top = res.newMedals[res.newMedals.length - 1];
      parts.push(`★ MÉDAILLE ${top.name} ! +${res.rewards.credits} crédits`);
      opts.sfx?.unlock();
      for (const p of res.rewards.packs) pendingRewards.push(p);
    }
    if (xp) parts.push(`+${xp} XP`);
    scene.flash(parts.join('  ·  '), res.newMedals.length ? 4 : 3);
  }

  return {
    ...scene,
    update(dt) {
      const car = scene.car;
      const before = car.laps.lap;
      scene.update(dt);
      const w = scene.world;
      if (!announced && w.time > -2.5) { announced = true; }
      if (car.laps.lap > before) {
        if (before >= 1) onLapDone(car.laps.lastLap);
        recorder.start();
        invalid = false;
        lapT0 = w.time;
        if (car.laps.lap === 1) scene.flash(nextTargetText(), 3);
      }
      if (car.laps.lap >= 1) recorder.step(car, car.trackDist);

      // Fantôme et écart en direct
      const sc = scene.scene;
      const t = w.time - lapT0;
      const p = car.laps.lap >= 1 && ghost ? ghostAt(ghost, t, gpos) : null;
      sc.ghost = p ? { x: p.x, y: p.y, angle: p.angle, def: getCar(ghost.carId), colors: ghost.colors } : null;
      sc.delta = null;
      if (ghost && car.laps.lap >= 1 && t > 1) {
        const gt = ghostTimeAtDist(ghost, car.trackDist);
        if (gt !== null) sc.delta = { label: ghostLabel, value: t - gt };
      }
    },
    isFinished: () => false,
    isTimeTrial: true,
    trackId,
    get pendingRewards() { return pendingRewards; },
  };
}
