// Musique synthwave générée par code (originale).
//
// Un petit séquenceur joue une suite d'accords en boucle (La mineur → Fa → Do → Sol)
// avec plusieurs instruments synthétiques. Deux ambiances :
//   'menu' : nappes, arpège et basse douce (calme)
//   'race' : tout l'orchestre avec batterie, et une mélodie une section sur deux
// Les notes sont programmées un peu à l'avance (« lookahead ») pour un tempo
// parfaitement régulier, même si l'image saccade.

const BPM = 104;
const STEP = 60 / BPM / 4; // durée d'une double-croche

// Accords (notes MIDI) et basses
const CHORDS = [
  { notes: [57, 60, 64], bass: 45 }, // La mineur
  { notes: [53, 57, 60], bass: 41 }, // Fa
  { notes: [60, 64, 67], bass: 48 }, // Do
  { notes: [55, 59, 62], bass: 43 }, // Sol
];
// Mélodie (MIDI, null = silence), 4 mesures × 8 croches
const MELODY = [
  76, null, 74, 76, null, 72, 74, null,
  72, null, 69, 72, null, 74, 76, null,
  79, null, 76, 74, null, 72, 74, 76,
  74, null, 71, 72, null, 74, 71, null,
];
const ARP = [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 2, 1]; // indices dans l'accord (3 = octave)

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function createMusic(audio) {
  let mode = 'off';
  let timer = 0;
  let step = 0;
  let nextTime = 0;
  let bus = null;    // gain de la musique (fondu entre les ambiances)
  let delay = null;  // écho de l'arpège
  let intensity = 0; // 0 = menu, 1 = course

  function setup() {
    const ctx = audio.ctx;
    bus = ctx.createGain();
    bus.gain.value = 0;
    bus.connect(audio.musicBus);
    delay = ctx.createDelay(1);
    delay.delayTime.value = STEP * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.38;
    const dl = ctx.createBiquadFilter();
    dl.type = 'lowpass';
    dl.frequency.value = 2400;
    delay.connect(dl); dl.connect(fb); fb.connect(delay);
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    dl.connect(wet); wet.connect(bus);
  }

  // ---------- Instruments ----------
  function env(gn, t, a, peak, d, sustainEnd) {
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(peak, t + a);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + a + d + (sustainEnd ?? 0));
  }

  function pad(notes, t, dur) {
    const ctx = audio.ctx;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(700, t);
    f.frequency.linearRampToValueAtTime(1500 + intensity * 600, t + dur * 0.6);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.linearRampToValueAtTime(0.045, t + 0.35);
    gn.gain.setValueAtTime(0.045, t + dur - 0.2);
    gn.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    f.connect(gn); gn.connect(bus);
    const rv = ctx.createGain(); rv.gain.value = 0.6; gn.connect(rv); rv.connect(audio.reverb);
    for (const n of notes) {
      for (const det of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(n);
        o.detune.value = det;
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.7);
      }
    }
  }

  function bass(note, t, vol) {
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = mtof(note);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.Q.value = 6;
    f.frequency.setValueAtTime(900 + intensity * 500, t);
    f.frequency.exponentialRampToValueAtTime(180, t + STEP * 1.6);
    const gn = ctx.createGain();
    env(gn, t, 0.005, vol, STEP * 1.7);
    o.connect(f); f.connect(gn); gn.connect(bus);
    o.start(t); o.stop(t + STEP * 2);
  }

  function arp(note, t, vol) {
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = mtof(note);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    const gn = ctx.createGain();
    env(gn, t, 0.003, vol, STEP * 0.8);
    o.connect(f); f.connect(gn); gn.connect(bus); gn.connect(delay);
    o.start(t); o.stop(t + STEP);
  }

  function lead(note, t) {
    const ctx = audio.ctx;
    const gn = ctx.createGain();
    env(gn, t, 0.02, 0.05, STEP * 1.8);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 3200;
    f.connect(gn); gn.connect(bus); gn.connect(delay);
    const rv = ctx.createGain(); rv.gain.value = 0.5; gn.connect(rv); rv.connect(audio.reverb);
    for (const [type, det] of [['sawtooth', -6], ['square', 6]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(note);
      o.detune.value = det;
      // léger vibrato
      const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
      const lg = ctx.createGain(); lg.gain.value = 6;
      lfo.connect(lg); lg.connect(o.detune);
      o.connect(f);
      o.start(t); o.stop(t + STEP * 2.2);
      lfo.start(t); lfo.stop(t + STEP * 2.2);
    }
  }

  function kick(t) {
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const gn = ctx.createGain();
    env(gn, t, 0.002, 0.55, 0.28);
    o.connect(gn); gn.connect(bus);
    o.start(t); o.stop(t + 0.35);
  }

  function noise(t, { vol, dur, freq, type = 'highpass', q = 1, rev = 0 }) {
    const ctx = audio.ctx;
    const s = ctx.createBufferSource();
    s.buffer = audio.noise;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const gn = ctx.createGain();
    env(gn, t, 0.001, vol, dur);
    s.connect(f); f.connect(gn); gn.connect(bus);
    if (rev) { const r = ctx.createGain(); r.gain.value = rev; gn.connect(r); r.connect(audio.reverb); }
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  function snare(t) {
    noise(t, { vol: 0.22, dur: 0.22, freq: 1800, type: 'bandpass', q: 0.7, rev: 0.9 });
    const ctx = audio.ctx;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 190;
    const gn = ctx.createGain(); env(gn, t, 0.002, 0.15, 0.1);
    o.connect(gn); gn.connect(bus); o.start(t); o.stop(t + 0.15);
  }

  // ---------- Séquenceur ----------
  function scheduleStep(s, t) {
    const bar = Math.floor(s / 16);
    const i = s % 16;
    const chord = CHORDS[bar % 4];
    const section = Math.floor(bar / 8) % 2; // alterne A / B toutes les 8 mesures
    const race = mode === 'race';

    if (i === 0) pad(chord.notes, t, STEP * 16);

    // Basse : croches (douces dans le menu)
    if (i % 2 === 0) bass(chord.bass + (i === 14 ? 12 : 0), t, race ? 0.16 : 0.08);

    // Arpège : doubles croches, une octave au-dessus
    const tones = [...chord.notes.map((n) => n + 12), chord.notes[0] + 24];
    arp(tones[ARP[i]], t, race ? 0.035 : 0.03);

    if (race && bar >= 2) {
      if (i % 4 === 0) kick(t);
      if (i === 4 || i === 12) snare(t);
      if (i % 2 === 1 || section === 1) noise(t, { vol: i % 4 === 2 ? 0.05 : 0.03, dur: 0.04, freq: 8000 });
      if (section === 1 && i % 2 === 0) {
        const m = MELODY[(bar % 4) * 8 + i / 2];
        if (m) lead(m, t);
      }
    } else if (!race && i % 4 === 2) {
      noise(t, { vol: 0.012, dur: 0.05, freq: 9000 });
    }
  }

  function tick() {
    const ctx = audio.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // rattrapage après une pause
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      step++;
      nextTime += STEP;
    }
  }

  return {
    /** 'menu' | 'race' | 'off' — fondu enchaîné entre les ambiances. */
    setMode(m) {
      if (!audio.ctx) return;
      if (!bus) setup();
      const t = audio.ctx.currentTime;
      if (m === mode) return;
      mode = m;
      intensity = m === 'race' ? 1 : 0;
      if (m === 'off') {
        bus.gain.setTargetAtTime(0, t, 0.3);
        clearInterval(timer);
        timer = 0;
        return;
      }
      if (m === 'race') step = 0; // la course repart du début (montée progressive)
      bus.gain.cancelScheduledValues(t);
      bus.gain.setTargetAtTime(m === 'race' ? 0.9 : 1.4, t, 0.6);
      if (!timer) {
        nextTime = audio.ctx.currentTime + 0.1;
        timer = setInterval(tick, 25);
      }
    },
    get mode() { return mode; },
  };
}
