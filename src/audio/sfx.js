// Effets sonores du jeu (générés par code).

const VOICES = {
  default: { types: ['sawtooth', 'sawtooth', 'square'], pitch: 1 },
  ionix: { types: ['sine', 'triangle', 'sine'], pitch: 3.2 },
  goliath: { types: ['sawtooth', 'square', 'square'], pitch: 0.72 },
  pixie: { types: ['square', 'sawtooth', 'triangle'], pitch: 1.45 },
  hyperion: { types: ['triangle', 'sawtooth', 'sine'], pitch: 2.1 },
};

export function createSfx(audio) {
  // ---------- Sons continus de la voiture du joueur ----------
  let car = null; // nœuds créés au premier usage

  function buildCarNodes() {
    const ctx = audio.ctx;
    const out = audio.sfxBus;
    // Moteur : deux dents de scie légèrement désaccordées + une sous-octave
    const engGain = ctx.createGain();
    engGain.gain.value = 0;
    const engFilter = ctx.createBiquadFilter();
    engFilter.type = 'lowpass';
    engFilter.frequency.value = 600;
    engFilter.Q.value = 3;
    const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
    const o2 = ctx.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 9;
    const o3 = ctx.createOscillator(); o3.type = 'square';
    const o3g = ctx.createGain(); o3g.gain.value = 0.35;
    o1.connect(engFilter); o2.connect(engFilter); o3.connect(o3g); o3g.connect(engFilter);
    engFilter.connect(engGain); engGain.connect(out);
    for (const o of [o1, o2, o3]) o.start();

    // Crissement de pneus (bruit filtré)
    const skid = ctx.createBufferSource();
    skid.buffer = audio.noise; skid.loop = true;
    const skidF = ctx.createBiquadFilter(); skidF.type = 'bandpass'; skidF.frequency.value = 1400; skidF.Q.value = 2.5;
    const skidG = ctx.createGain(); skidG.gain.value = 0;
    skid.connect(skidF); skidF.connect(skidG); skidG.connect(out);
    skid.start();

    // Souffle du boost
    const boost = ctx.createBufferSource();
    boost.buffer = audio.noise; boost.loop = true;
    const boostF = ctx.createBiquadFilter(); boostF.type = 'lowpass'; boostF.frequency.value = 900;
    const boostG = ctx.createGain(); boostG.gain.value = 0;
    const boostTone = ctx.createOscillator(); boostTone.type = 'sine'; boostTone.frequency.value = 220;
    const boostToneG = ctx.createGain(); boostToneG.gain.value = 0;
    boost.connect(boostF); boostF.connect(boostG); boostG.connect(out);
    boostTone.connect(boostToneG); boostToneG.connect(out);
    boost.start(); boostTone.start();

    // Frottement contre le mur (bruit grinçant)
    const scrape = ctx.createBufferSource();
    scrape.buffer = audio.noise; scrape.loop = true;
    const scrapeF = ctx.createBiquadFilter(); scrapeF.type = 'bandpass'; scrapeF.frequency.value = 3200; scrapeF.Q.value = 4;
    const scrapeG = ctx.createGain(); scrapeG.gain.value = 0;
    scrape.connect(scrapeF); scrapeF.connect(scrapeG); scrapeG.connect(out);
    scrape.start();

    car = { engGain, engFilter, o1, o2, o3, skidG, skidF, boostG, boostF, boostToneG, boostTone, scrapeG, scrapeF, gear: 0, lastThrottle: 0, scrapeHold: 0 };
  }

  /** Mise à jour à chaque image avec l'état de la voiture du joueur. */
  function updateCar(c, active) {
    if (!audio.ready) return;
    if (!car) buildCarNodes();
    const t = audio.ctx.currentTime;
    const k = 0.04; // lissage
    if (!active || !c) {
      car.engGain.gain.setTargetAtTime(0, t, 0.1);
      car.skidG.gain.setTargetAtTime(0, t, 0.05);
      car.boostG.gain.setTargetAtTime(0, t, 0.05);
      car.boostToneG.gain.setTargetAtTime(0, t, 0.05);
      car.scrapeG.gain.setTargetAtTime(0, t, 0.05);
      return;
    }
    // Régime moteur simulé avec 5 rapports
    // Avant le départ, le régime suit l'accélérateur (on fait chanter le moteur)
    const ratio = Math.max(Math.min(1.35, Math.max(0, c.speed) / c.params.maxSpeed), (c.rev || 0) * 0.58);
    const gears = [0, 0.22, 0.42, 0.62, 0.82, 1.4];
    let g = 0;
    while (g < gears.length - 2 && ratio > gears[g + 1]) g++;
    const inGear = (ratio - gears[g]) / (gears[g + 1] - gears[g]);
    const rpm = 0.35 + 0.65 * Math.min(1.2, inGear);
    const base = 46 + g * 6;
    // Voix du moteur selon la voiture (électrique : sifflement aigu ; muscle : grave)
    const voice = VOICES[c.def?.id] ?? VOICES.default;
    if (car.voiceId !== voice) {
      car.voiceId = voice;
      car.o1.type = voice.types[0]; car.o2.type = voice.types[1]; car.o3.type = voice.types[2];
    }
    const f = (base + rpm * 95 + (c.boosting ? 25 : 0)) * voice.pitch;
    car.o1.frequency.setTargetAtTime(f, t, k);
    car.o2.frequency.setTargetAtTime(f * 1.005, t, k);
    car.o3.frequency.setTargetAtTime(f / 2, t, k);
    car.engFilter.frequency.setTargetAtTime(350 + c.throttle * 1500 + rpm * 500, t, 0.06);
    const thr = Math.max(c.throttle, c.rev || 0);
    car.engGain.gain.setTargetAtTime(0.05 + thr * 0.07 + ratio * 0.03, t, 0.08);
    // Passage de rapport : petite coupure du moteur
    if (g > car.gear && c.speed > 60) {
      car.engGain.gain.setTargetAtTime(0.02, t, 0.015);
      car.engGain.gain.setTargetAtTime(0.05 + thr * 0.07 + ratio * 0.03, t + 0.07, 0.04);
    }
    car.gear = g;
    // Pétarades quand on lâche l'accélérateur à haut régime
    if (car.lastThrottle > 0.7 && thr < 0.2 && ratio > 0.45) {
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const d = 0.04 + i * (0.05 + Math.random() * 0.06);
        noiseHit({ vol: 0.16, dur: 0.06, freq: 260 + Math.random() * 300, q: 1.2, type: 'lowpass', delay: d });
        tone({ freq: 70 + Math.random() * 40, type: 'square', dur: 0.05, vol: 0.06, delay: d });
      }
    }
    car.lastThrottle = thr;
    // Frottement contre le mur (maintenu un court instant pour éviter les à-coups)
    car.scrapeHold = c.wallTouch && c.speed > 120 ? 0.12 : Math.max(0, car.scrapeHold - 1 / 60);
    car.scrapeG.gain.setTargetAtTime(car.scrapeHold > 0 ? Math.min(0.09, c.speed / 9000) : 0, t, 0.03);
    car.scrapeF.frequency.setTargetAtTime(2400 + Math.min(c.speed, 900) * 1.5, t, 0.05);

    const slide = c.drifting ? Math.min(1, 0.4 + c.slip * 1.2) : c.braking && c.speed > 250 ? 0.35 : 0;
    car.skidG.gain.setTargetAtTime(slide * 0.12, t, 0.05);
    car.skidF.frequency.setTargetAtTime(1100 + Math.min(c.speed, 900) * 0.6, t, 0.1);

    car.boostG.gain.setTargetAtTime(c.boosting ? 0.11 : 0, t, c.boosting ? 0.05 : 0.15);
    car.boostF.frequency.setTargetAtTime(c.boosting ? 2400 : 600, t, 0.2);
    car.boostToneG.gain.setTargetAtTime(c.boosting ? 0.035 : 0, t, 0.1);
    car.boostTone.frequency.setTargetAtTime(c.boosting ? 330 + ratio * 220 : 200, t, 0.3);
  }

  // ---------- Sons ponctuels ----------
  function tone({ freq = 440, type = 'square', dur = 0.12, vol = 0.15, slide = 0, delay = 0, reverb = 0 }) {
    if (!audio.ready) return;
    const ctx = audio.ctx;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + dur);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn);
    gn.connect(audio.sfxBus);
    if (reverb) { const r = ctx.createGain(); r.gain.value = reverb; gn.connect(r); r.connect(audio.reverb); }
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noiseHit({ vol = 0.2, dur = 0.15, freq = 900, q = 1, type = 'bandpass', delay = 0 }) {
    if (!audio.ready) return;
    const ctx = audio.ctx;
    const t = ctx.currentTime + delay;
    const s = ctx.createBufferSource();
    s.buffer = audio.noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(vol, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(audio.sfxBus);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
  }

  // Vent (tempête de sable, neige) : souffle filtré dont l'intensité varie
  let wind = null;
  let windBase = 0;
  function ensureWind() {
    if (wind || !audio.ready) return;
    const ctx = audio.ctx;
    const src = ctx.createBufferSource(); src.buffer = audio.noise; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(audio.sfxBus);
    src.start();
    wind = { g, f };
  }
  function setWind(k) {
    if (!audio.ready) return;
    ensureWind();
    const t = audio.ctx.currentTime;
    wind.g.gain.setTargetAtTime(windBase + 0.11 * k, t, 0.15);
    wind.f.frequency.setTargetAtTime(400 + 700 * k, t, 0.2);
  }
  /** Ambiance sonore de la météo du circuit. */
  function setWeather(kind) {
    if (!audio.ready) return;
    setRain(kind === 'rain' || kind === 'storm', kind === 'storm' ? 0.08 : 0.05);
    windBase = kind === 'sand' ? 0.025 : kind === 'snow' ? 0.02 : kind === 'fog' ? 0.012 : 0;
    ensureWind();
    wind.g.gain.setTargetAtTime(windBase, audio.ctx.currentTime, 0.5);
  }

  // Ambiance de pluie (bruit filtré en boucle)
  let rain = null;
  function setRain(on, level = 0.05) {
    if (!audio.ready) return;
    if (!rain) {
      const ctx = audio.ctx;
      const src = ctx.createBufferSource(); src.buffer = audio.noise; src.loop = true;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(hp); hp.connect(lp); lp.connect(g); g.connect(audio.sfxBus);
      src.start();
      rain = g;
    }
    rain.gain.setTargetAtTime(on ? level : 0, audio.ctx.currentTime, 0.5);
  }

  let lastHit = 0;
  return {
    setRain,
    setWeather,
    setWind,
    /** Tonnerre (un peu après l'éclair). */
    thunder(delay = 0.5) {
      noiseHit({ vol: 0.3, dur: 0.25, freq: 1800, q: 0.5, type: 'bandpass', delay });
      noiseHit({ vol: 0.5, dur: 2.6, freq: 140, q: 0.6, type: 'lowpass', delay: delay + 0.05 });
      noiseHit({ vol: 0.3, dur: 1.8, freq: 90, q: 0.8, type: 'lowpass', delay: delay + 0.6 });
    },
    updateCar,
    /** Choc : volume selon la violence (limité à un son toutes les 90 ms). */
    hit(strength, isPlayer = true) {
      if (!audio.ready) return;
      const now = audio.ctx.currentTime;
      if (now - lastHit < 0.09) return;
      lastHit = now;
      const v = Math.min(1, strength / 600) * (isPlayer ? 1 : 0.4);
      noiseHit({ vol: 0.35 * v, dur: 0.18, freq: 700, q: 0.8 });
      tone({ freq: 110, type: 'sine', dur: 0.2, vol: 0.4 * v, slide: 0.4 });
      if (strength > 300) noiseHit({ vol: 0.12 * v, dur: 0.35, freq: 4500, q: 3, delay: 0.02 }); // étincelles
    },
    countdown(n) {
      if (n > 0) tone({ freq: 523, type: 'square', dur: 0.18, vol: 0.12, reverb: 0.3 });
      else { tone({ freq: 1046, type: 'square', dur: 0.5, vol: 0.14, reverb: 0.5 }); tone({ freq: 1568, type: 'sine', dur: 0.5, vol: 0.06 }); }
    },
    lap(best) {
      const notes = best ? [784, 988, 1175, 1568] : [659, 880];
      notes.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.1, delay: i * 0.08, reverb: 0.3 }));
    },
    finish(position) {
      const good = position <= 3;
      const seq = good ? [523, 659, 784, 1046, 1318] : [440, 523, 659];
      seq.forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.3, vol: 0.07, delay: i * 0.11, reverb: 0.5 }));
    },
    /** Résultat du départ canon. */
    launch(kind) {
      if (kind === 'perfect') {
        noiseHit({ vol: 0.25, dur: 0.5, freq: 700, q: 0.6, type: 'lowpass' });
        [880, 1318, 1760].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.08, delay: 0.05 + i * 0.06, reverb: 0.4 }));
      } else if (kind === 'good') {
        tone({ freq: 988, type: 'triangle', dur: 0.15, vol: 0.07 });
      } else if (kind === 'spin') {
        noiseHit({ vol: 0.22, dur: 0.7, freq: 1500, q: 3 }); // crissement des pneus
      }
    },
    /** Une voiture passe tout près. */
    whoosh(v = 1) {
      noiseHit({ vol: 0.18 * v, dur: 0.32, freq: 900, q: 0.7, type: 'bandpass' });
      noiseHit({ vol: 0.08 * v, dur: 0.25, freq: 2600, q: 1.5, delay: 0.04 });
    },
    /** Le boost s'allume. */
    boostIgnite() {
      noiseHit({ vol: 0.2, dur: 0.45, freq: 500, q: 0.8, type: 'lowpass' });
      tone({ freq: 140, type: 'sawtooth', dur: 0.4, vol: 0.06, slide: 2.5 });
    },
    boostPad() { tone({ freq: 300, type: 'sawtooth', dur: 0.35, vol: 0.08, slide: 3 }); },
    boostReady() { tone({ freq: 1318, type: 'sine', dur: 0.12, vol: 0.06 }); tone({ freq: 1760, type: 'sine', dur: 0.15, vol: 0.05, delay: 0.07 }); },
    click() { tone({ freq: 1200, type: 'square', dur: 0.04, vol: 0.05 }); },
    // Élimination : explosion grave + chute
    eliminate() {
      noiseHit({ vol: 0.45, dur: 0.7, freq: 500, q: 0.4 });
      tone({ freq: 160, type: 'sawtooth', dur: 0.8, vol: 0.12, slide: 0.25, reverb: 0.5 });
      tone({ freq: 60, type: 'sine', dur: 0.6, vol: 0.5, slide: 0.5 });
    },
    // Alerte quand le joueur est dernier (plus aigu à mesure que l'élimination approche)
    dangerBeep(n) {
      const f = n <= 1 ? 1320 : n === 2 ? 1100 : 880;
      tone({ freq: f, type: 'square', dur: 0.12, vol: 0.09 });
      tone({ freq: f * 1.5, type: 'square', dur: 0.12, vol: 0.05, delay: 0.13 });
    },
    // Achat : pièces qui tintent
    purchase() {
      [1568, 2093, 2637].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, vol: 0.08, delay: i * 0.06, reverb: 0.3 }));
      noiseHit({ vol: 0.05, dur: 0.12, freq: 6000, q: 2, delay: 0.02 });
    },
    // Ouverture de pack : la charge monte, puis l'explosion
    packCharge() {
      if (!audio.ready) return;
      tone({ freq: 140, type: 'sawtooth', dur: 0.95, vol: 0.07, slide: 6 });
      tone({ freq: 70, type: 'square', dur: 0.95, vol: 0.05, slide: 4 });
      noiseHit({ vol: 0.05, dur: 0.95, freq: 1200, q: 0.5 });
    },
    packBurst() {
      noiseHit({ vol: 0.4, dur: 0.6, freq: 900, q: 0.4 });
      tone({ freq: 90, type: 'sine', dur: 0.6, vol: 0.5, slide: 0.3 });
      [1046, 1318, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.06, delay: 0.05 + i * 0.05, reverb: 0.6 }));
    },
    cardFlip(rarity = 'common') {
      noiseHit({ vol: 0.08, dur: 0.08, freq: 3000, q: 1 });
      const seq = rarity === 'epic' ? [784, 1046, 1318, 1568, 2093] : rarity === 'rare' ? [880, 1175, 1568] : [1046];
      seq.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.07, delay: 0.12 + i * 0.07, reverb: 0.5 }));
    },
    unlock() { [523, 784, 1046, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.08, delay: i * 0.09, reverb: 0.6 })); },
    stopCar() { updateCar(null, false); },
  };
}
