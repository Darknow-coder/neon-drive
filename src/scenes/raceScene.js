// Scène de course : relie la simulation (race/raceWorld.js) à l'affichage,
// aux commandes du joueur et aux effets visuels.

import { buildTrack } from '../track/buildTrack.js';
import { getTrackData } from '../data/tracks/index.js';
import { getCar } from '../data/cars.js';
import { AI_DRIVERS } from '../data/aiProfiles.js';
import { rivalFor } from '../data/rivals.js';
import { createRaceWorld } from '../race/raceWorld.js';
import { createTrackRenderer } from '../render/trackRenderer.js';
import { createParticles } from '../render/particles.js';
import { createCamera, computeBaseZoom, snapCamera, updateCamera } from '../render/camera.js';
import { createCarFx, updateCarFx } from '../render/carFx.js';
import { P_SPARK } from '../render/particles.js';
import { weatherOf, lastLightning } from '../data/weather.js';
import { formatTime } from '../core/math.js';
import { computeResults, randomGrid } from '../race/results.js';

const PLAYER_COLORS = { body: '#00f0ff', accent: '#ff2bd6', glow: '#00f0ff' };

export function createRaceScene({ renderer, input, hud, lowEnd, trackId, carId, laps = 3, league = 'bronze', playerColors = PLAYER_COLORS, sfx = null, settings = { vibration: true }, solo = false, countdown = 3, rival = false, playerLevel = 1, timeTrial = false, onRespawn = null, gridOrder = null, quietLaps = false, field = null, grid = null, onFinish }) {
  const track = buildTrack(getTrackData(trackId));
  const trackRenderer = createTrackRenderer(track, { lowEnd });
  const particles = createParticles(lowEnd ? 320 : 520);
  const camera = createCamera();

  // Grille tirée au sort : le joueur part dans l'une des 3 dernières places
  // (mode « solo » : sans adversaires, pour le tutoriel)
  const playerEntry = { def: getCar(carId), name: 'TOI', isPlayer: true, colors: playerColors, level: playerLevel };
  let aiEntries = AI_DRIVERS.map((d) => ({ def: getCar(d.car), name: d.name, profile: d.profile, colors: d.colors }));
  // Course classée : le rival de la ligue remplace un pilote habituel (au hasard)
  const rivalData = rival || gridOrder ? rivalFor(league) : null;
  if (rivalData) {
    aiEntries.splice(Math.floor(Math.random() * aiEntries.length), 1);
    aiEntries.push({
      def: getCar(rivalData.car), name: rivalData.name, profile: rivalData.profile, colors: rivalData.colors,
      isRival: true, paceMul: rivalData.paceMul, mistakeMul: rivalData.mistakeMul, skill: rivalData.skill,
    });
  }
  // (grid 'last' : le joueur part en dernière position — défis « remontée »)
  let entries = solo ? [playerEntry] : randomGrid(aiEntries, playerEntry, { backRows: grid === 'last' ? 1 : 3 });
  // Coupe : pilotes et ordre de départ imposés (noms, de la pole à la dernière place)
  if (gridOrder) {
    const rv = rivalFor(league);
    entries = gridOrder.map((name) => {
      if (name === 'TOI') return playerEntry;
      if (rv && name === rv.name) {
        return { def: getCar(rv.car), name: rv.name, profile: rv.profile, colors: rv.colors,
          isRival: true, paceMul: rv.paceMul, mistakeMul: rv.mistakeMul, skill: rv.skill };
      }
      const d = AI_DRIVERS.find((x) => x.name === name);
      return { def: getCar(d.car), name: d.name, profile: d.profile, colors: d.colors };
    });
  }
  // Plateau sur mesure (événement GIGA RUSH : 20 voitures)
  if (field) entries = field(playerEntry);
  let endTimer = -1; // compte à rebours avant l'affichage des résultats
  let resultsShown = false;

  // Départ canon : pas en accélération automatique (le gaz est toujours enfoncé)
  const launchControl = !settings.controls?.autoGas;
  let world = createRaceWorld({ track, entries, laps, league, countdown, launchControl });
  let player = world.player;
  const rivalCar = world.cars.find((c) => c.isRival) ?? null;
  const fx = new Map(world.cars.map((c) => [c, createCarFx()]));
  let message = '';
  let messageTimer = 0;
  let lastVibrate = 0;
  let lastCount = 99;     // dernier chiffre du compte à rebours joué
  let lastPad = 0;
  let lastBoost = 0;
  let msgTone = '';
  let slowmo = 0;          // ralenti de fin de course (secondes réelles restantes)
  let launchShown = false;
  let wasBoosting = false;
  const passSide = new Map(); // dépassements serrés (son « whoosh »)

  const scene = { trackRenderer, cars: world.cars, particles, camera, player, time: 0, wind: world.wind };
  sfx?.setWeather?.(track.weather);
  const weatherInfo = track.weather && track.weather !== 'clear' ? weatherOf(track.weather) : null;
  let lastBolt = -1;

  function resize() {
    renderer.resize();
    camera.baseZoom = computeBaseZoom(renderer.state.cssW, renderer.state.cssH);
  }
  resize();
  snapCamera(camera, player);

  function respawn() {
    if (!world.started || player.finished) return;
    world.respawn(player);
    // Le joueur garde ses doigts posés (ex. pouce sur GAZ) : on ne remet que la direction à zéro
    input.resetSteer();
    onRespawn?.();
  }

  function isFinished() {
    return resultsShown;
  }

  function setCarDef(id) {
    // Changement de voiture (panneau ⚙) : on relance la course avec la nouvelle voiture
    carId = id;
    world = createRaceWorld({ track, entries: entries.map((e) => (e.isPlayer ? { ...e, def: getCar(id) } : e)), laps, league, countdown: 3, launchControl });
    player = world.player;
    fx.clear();
    world.cars.forEach((c) => fx.set(c, createCarFx()));
    scene.cars = world.cars;
    scene.player = player;
    trackRenderer.clearSkids();
    particles.clear();
    snapCamera(camera, player);
  }

  function update(dt) {
    camera.prevX = camera.x;
    camera.prevY = camera.y;
    const intent = input.update(dt);
    const lapBefore = player.laps.lap;
    // Ralenti (victoire ou photo-finish) : le monde avance moins vite
    const realDt = dt;
    if (slowmo > 0) { slowmo -= realDt; dt *= 0.28; }
    camera.zoomMul = slowmo > 0 ? 1.32 : 1;
    world.step(dt, intent);
    scene.time = world.time;
    scene.wind = world.wind;
    // Orage : tonnerre un peu après chaque éclair ; vent : souffle selon la rafale
    if (track.weather === 'storm') {
      const L = lastLightning(world.time);
      if (L.k !== lastBolt && L.since < 0.2) { lastBolt = L.k; sfx?.thunder?.(0.25 + Math.random() * 0.8); if (settings.vibration && navigator.vibrate) navigator.vibrate(30); }
    }
    if (track.windSeed !== null && track.windSeed !== undefined) sfx?.setWind?.(world.wind.k);

    // Effets visuels (uniquement pour les voitures proches de la caméra)
    for (const car of world.cars) {
      const near = Math.abs(car.x - camera.x) < 1100 && Math.abs(car.y - camera.y) < 800;
      if (near) updateCarFx(fx.get(car), car, dt, particles, trackRenderer, car.hitThisStep);
    }
    const hit = player.hitThisStep;
    if (hit > 260 && settings.vibration && world.time - lastVibrate > 0.25 && navigator.vibrate) {
      navigator.vibrate(Math.min(60, hit / 10));
      lastVibrate = world.time;
    }

    // ---------- Sons ----------
    if (sfx) {
      sfx.updateCar(player, true);
      if (hit > 120) sfx.hit(hit, true);
      // Chocs des adversaires proches : plus discrets
      for (const car of world.cars) {
        if (car !== player && car.hitThisStep > 200 && Math.hypot(car.x - player.x, car.y - player.y) < 500) sfx.hit(car.hitThisStep, false);
      }
      const count = world.started ? 0 : Math.ceil(-world.time);
      if (count !== lastCount && count <= 3) sfx.countdown(count);
      lastCount = count;
      if (player.padTimer > lastPad + 0.2 && world.time > 0.3) sfx.boostPad();
      lastPad = player.padTimer;
      if (player.boost >= 0.999 && lastBoost < 0.999) sfx.boostReady();
      lastBoost = player.boost;
      // Dépassement serré : « whoosh » quand une voiture passe tout près
      if (world.started) {
        const hx = Math.cos(player.angle), hy = Math.sin(player.angle);
        for (const car of world.cars) {
          if (car === player) continue;
          const dx = car.x - player.x, dy = car.y - player.y;
          if (dx * dx + dy * dy > 160 * 160) { passSide.delete(car); continue; }
          const side = Math.sign(dx * hx + dy * hy) || 1;
          const prev = passSide.get(car);
          const lat = Math.abs(-dx * hy + dy * hx);
          const rel = Math.abs((player.vx - car.vx) * hx + (player.vy - car.vy) * hy);
          if (prev !== undefined && prev !== side && lat < 70 && rel > 60) sfx.whoosh(Math.min(1, rel / 400));
          passSide.set(car, side);
        }
      }
    }
    particles.update(dt);
    // Coup de boost : la caméra recule d'un coup puis revient
    if (player.boosting && !wasBoosting) {
      camera.zoom *= 0.93;
      if (player.padTimer <= 0) sfx?.boostIgnite?.(); // (les plaques et le départ ont leur propre son)
    }
    wasBoosting = player.boosting;
    updateCamera(camera, player, realDt);

    // Messages
    if (!world.started) {
      message = '';
    } else if (world.time < 1 && !launchShown) {
      message = 'GO !';
      msgTone = 'green';
      messageTimer = 0.1;
    }
    // Verdict du départ canon
    if (!launchShown && player.launch && world.started) {
      launchShown = true;
      const L = { perfect: ['DÉPART PARFAIT !', 'gold'], good: ['BON DÉPART', 'green'], spin: ['PATINAGE !', 'red'] }[player.launch];
      message = L[0]; msgTone = L[1]; messageTimer = 1.6;
      sfx?.launch?.(player.launch);
      if (player.launch === 'perfect' && settings.vibration && navigator.vibrate) navigator.vibrate(40);
    }
    if (!timeTrial && !quietLaps && player.laps.lap > lapBefore && lapBefore >= 1 && !player.finished) {
      const isBest = player.laps.lastLap <= player.laps.bestLap;
      message = player.laps.lap === laps ? 'DERNIER TOUR !' : `${isBest ? 'MEILLEUR TOUR ' : 'Tour '}${formatTime(player.laps.lastLap)}`;
      messageTimer = 2.5;
      sfx?.lap(isBest);
    }
    if (player.finished && !scene.announced) {
      scene.announced = true;
      message = `ARRIVÉE — ${player.position}${player.position === 1 ? 'ER' : 'E'} / ${world.cars.length}`;
      msgTone = '';
      messageTimer = 9999;
      sfx?.finish(player.position);
      // Photo-finish : une autre voiture franchit la ligne à moins de 0,35 s
      const close = !solo && world.cars.some((c) => c !== player && (c.finished
        ? Math.abs(c.finishTime - player.finishTime) < 0.35
        : c.laps.lap === laps && (track.length - c.trackDist) < Math.max(c.speed, 1) * 0.35));
      if (!solo && !timeTrial && (player.position === 1 || close)) {
        slowmo = 1.8;
        if (player.position === 1) {
          message = close ? 'VICTOIRE · PHOTO-FINISH !' : 'VICTOIRE !';
          msgTone = 'victory';
          // Pluie de confettis néon
          const cols = ['#ffd34d', '#ff2bd6', '#00f0ff', '#3dff9e', '#ffffff'];
          for (let i = 0; i < 140; i++) {
            const a = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 520;
            particles.spawn(P_SPARK, player.x, player.y, Math.cos(a) * sp + player.vx * 0.3, Math.sin(a) * sp + player.vy * 0.3,
              0.8 + Math.random() * 0.9, 2 + Math.random() * 2.5, 0, cols[i % cols.length]);
          }
        } else {
          message = `PHOTO-FINISH ! ${player.position}E`;
          msgTone = 'gold';
        }
      }
    } else if (!solo && !player.finished && world.playerPositionLocked() && !scene.lockedMsg) {
      scene.lockedMsg = true;
      message = 'TOUS LES ADVERSAIRES SONT ARRIVÉS';
      messageTimer = 9999;
    }
    // Le rival se plante : on le fait savoir (si rien d'autre n'est affiché)
    if (rivalCar && !rivalCar.finished && rivalCar.hitThisStep > 220 && rivalCar.ai?.state.big?.phase === 'go'
      && messageTimer <= 0 && world.time - (scene.rivalCrashAt ?? -99) > 6) {
      scene.rivalCrashAt = world.time;
      message = `★ ${rivalCar.name} DANS LE DÉCOR !`;
      msgTone = 'gold';
      messageTimer = 1.8;
    }
    if (messageTimer > 0 && (messageTimer -= realDt) <= 0) { message = ''; msgTone = ''; }

    // Fin de course : résultats quand tout le monde est arrivé, ou peu après
    // l'arrivée du joueur, ou si le joueur ne peut plus changer de place.
    if (!resultsShown) {
      if (endTimer < 0) {
        if (player.finished) endTimer = 5;
        else if (!solo && world.playerPositionLocked()) endTimer = 4;
      } else {
        endTimer -= realDt;
        if (endTimer <= 0 || world.finished) {
          resultsShown = true;
          onFinish?.(computeResults(world));
        }
      }
    }
  }

  function windHud() {
    const w = world.wind;
    if (!w || !world.started) return null;
    if (w.k > 0.2) return { angle: Math.atan2(w.ay, w.ax), soon: false };
    if (w.soon !== null) return { angle: w.soon, soon: true };
    return null;
  }

  function render(alpha) {
    renderer.render(scene, alpha);
    hud.update({
      car: player,
      lap: Math.min(player.laps.lap, laps),
      laps: quietLaps ? 0 : laps,
      lapTime: player.laps.lapTime,
      bestLap: player.laps.bestLap,
      lastMsg: message,
      position: player.position,
      total: world.cars.length,
      big: world.started && world.time < 1 && !player.launch,
      lights: !world.started ? Math.max(1, Math.ceil(-world.time)) : world.time < 1 ? 0 : null,
      launchHint: launchControl && !timeTrial && !solo,
      weather: !world.started && weatherInfo ? weatherInfo : null,
      wind: windHud(),
      msgTone,
      rival: rivalCar ? { name: rivalCar.name, position: rivalCar.position } : null,
      timeTrial,
      delta: scene.delta ?? null,
      elim: scene.elim ?? null,
    });
  }

  function reloadGraphics() {
    trackRenderer.rebuild();
    renderer.resetSprites();
    particles.resetSprites();
  }

  function dispose() {
    trackRenderer.dispose();
    sfx?.stopCar();
    sfx?.setWeather?.('clear');
  }

  /** Affiche un message au centre de l'écran (contre-la-montre). */
  function flash(text, duration = 2.5) { message = text; messageTimer = duration; }

  return {
    update, render, resize, respawn, setCarDef, reloadGraphics, dispose, isFinished, flash,
    scene,
    trackName: track.name,
    rival: rivalData,
    get car() { return player; },
    get world() { return world; },
    track,
  };
}
