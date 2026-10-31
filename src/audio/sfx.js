// Effets sonores du jeu (générés par code).

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

    car = { engGain, engFilter, o1, o2, o3, skidG, skidF, boostG, boostF, boostToneG, boostTone, gear: 0 };
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
      return;
    }
    // Régime moteur simulé avec 5 rapports
    const ratio = Math.min(1.35, Math.max(0, c.speed) / c.params.maxSpeed);
    const gears = [0, 0.22, 0.42, 0.62, 0.82, 1.4];
    let g = 0;
    while (g < gears.length - 2 && ratio > gears[g + 1]) g++;
    const inGear = (ratio - gears[g]) / (gears[g + 1] - gears[g]);
    const rpm = 0.35 + 0.65 * Math.min(1.2, inGear);
    const base = 46 + g * 6;
    const f = base + rpm * 95 + (c.boosting ? 25 : 0);
    car.o1.frequency.setTargetAtTime(f, t, k);
    car.o2.frequency.setTargetAtTime(f * 1.005, t, k);
    car.o3.frequency.setTargetAtTime(f / 2, t, k);
    car.engFilter.frequency.setTargetAtTime(350 + c.throttle * 1500 + rpm * 500, t, 0.06);
    car.engGain.gain.setTargetAtTime(0.05 + c.throttle * 0.07 + ratio * 0.03, t, 0.08);

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

  let lastHit = 0;
  return {
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
    boostPad() { tone({ freq: 300, type: 'sawtooth', dur: 0.35, vol: 0.08, slide: 3 }); },
    boostReady() { tone({ freq: 1318, type: 'sine', dur: 0.12, vol: 0.06 }); tone({ freq: 1760, type: 'sine', dur: 0.15, vol: 0.05, delay: 0.07 }); },
    click() { tone({ freq: 1200, type: 'square', dur: 0.04, vol: 0.05 }); },
    unlock() { [523, 784, 1046, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.4, vol: 0.08, delay: i * 0.09, reverb: 0.6 })); },
    stopCar() { updateCar(null, false); },
  };
}
