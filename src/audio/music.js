// Musique synthwave générée par code (originale) — 3 morceaux.
//
// Un petit séquenceur joue une suite d'accords en boucle (La mineur → Fa → Do → Sol)
// avec plusieurs instruments synthétiques. Deux ambiances :
//   'menu' : nappes, arpège et basse douce (calme)
//   'race' : tout l'orchestre avec batterie, et une mélodie une section sur deux
// Les notes sont programmées un peu à l'avance (« lookahead ») pour un tempo
// parfaitement régulier, même si l'image saccade.

// ---------------------------------------------------------------------------
// MORCEAUX (tous originaux). Un morceau = tempo, accords, motifs et timbres.
//   bass  : 16 pas, décalage en demi-tons depuis la basse de l'accord (null = silence)
//   arp   : indices dans l'accord (3 = octave), `arpEvery` : 1 = doubles croches, 2 = croches
//   drums : pas de grosse caisse / caisse claire / percussions (toms)
// ---------------------------------------------------------------------------
const SONGS = {
  // « Néon » : ville (et menu). Synthwave classique en La mineur.
  city: {
    bpm: 104,
    chords: [
      { notes: [57, 60, 64], bass: 45 }, // La mineur
      { notes: [53, 57, 60], bass: 41 }, // Fa
      { notes: [60, 64, 67], bass: 48 }, // Do
      { notes: [55, 59, 62], bass: 43 }, // Sol
    ],
    melody: [
      76, null, 74, 76, null, 72, 74, null,
      72, null, 69, 72, null, 74, 76, null,
      79, null, 76, 74, null, 72, 74, 76,
      74, null, 71, 72, null, 74, 71, null,
    ],
    bass: [0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 0, null, 12, null],
    arp: [0, 1, 2, 3, 2, 1, 0, 1, 0, 1, 2, 3, 2, 1, 2, 1],
    arpEvery: 1, arpWave: 'square', leadWaves: ['sawtooth', 'square'],
    kick: [0, 4, 8, 12], snare: [4, 12], toms: [],
  },
  // « Mirage » : désert. Plus lent et lourd, couleur orientale (Ré phrygien), percussions.
  desert: {
    bpm: 92,
    chords: [
      { notes: [50, 53, 57], bass: 38 }, // Ré mineur
      { notes: [51, 55, 58], bass: 39 }, // Mi bémol
      { notes: [50, 53, 57], bass: 38 }, // Ré mineur
      { notes: [48, 52, 55], bass: 36 }, // Do
    ],
    melody: [
      74, null, 75, 78, null, 79, 78, 75,
      74, null, null, 72, 74, 75, null, null,
      81, null, 79, 78, null, 79, 82, 81,
      79, 78, 75, null, 74, null, null, null,
    ],
    bass: [0, null, null, 0, null, null, 0, null, 0, null, null, 0, null, 7, 12, null],
    arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 2, 1, 0, 1],
    arpEvery: 2, arpWave: 'triangle', leadWaves: ['sawtooth', 'triangle'],
    kick: [0, 6, 8, 14], snare: [4, 12], toms: [3, 7, 10, 11, 15],
  },
  // « Orbite » : station orbitale. Plus rapide, Mi mineur, arpège cristallin.
  orbital: {
    bpm: 118,
    chords: [
      { notes: [52, 55, 59], bass: 40 }, // Mi mineur
      { notes: [48, 52, 55], bass: 36 }, // Do
      { notes: [55, 59, 62], bass: 43 }, // Sol
      { notes: [50, 54, 57], bass: 38 }, // Ré
    ],
    melody: [
      83, null, null, 79, null, 81, null, 78,
      76, null, null, null, 79, null, 78, null,
      83, null, 86, null, 83, 81, null, 79,
      78, null, 76, null, null, null, null, null,
    ],
    bass: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, null, 12, 7],
    arp: [0, 2, 1, 3, 2, 3, 1, 2, 0, 2, 1, 3, 2, 3, 1, 2],
    arpEvery: 1, arpWave: 'sine', leadWaves: ['triangle', 'sine'],
    kick: [0, 4, 8, 12], snare: [4, 12], toms: [],
  },
};
export const SONG_IDS = Object.keys(SONGS);

let song = SONGS.city;
let STEP = 60 / song.bpm / 4; // durée d'une double-croche (selon le morceau)

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
    o.type = song.arpWave;
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
    for (const [type, det] of [[song.leadWaves[0], -6], [song.leadWaves[1], 6]]) {
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

  function tom(t, freq) {
    const ctx = audio.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.55, t + 0.25);
    const gn = ctx.createGain();
    env(gn, t, 0.003, 0.25, 0.3);
    o.connect(gn); gn.connect(bus);
    const r = ctx.createGain(); r.gain.value = 0.4; gn.connect(r); r.connect(audio.reverb);
    o.start(t); o.stop(t + 0.4);
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
    const chord = song.chords[bar % song.chords.length];
    const section = Math.floor(bar / 8) % 2; // alterne A / B toutes les 8 mesures
    const race = mode === 'race';

    if (i === 0) pad(chord.notes, t, STEP * 16);

    // Basse (douce dans le menu)
    const b = song.bass[i];
    if (b !== null) bass(chord.bass + b, t, race ? 0.16 : 0.08);

    // Arpège, une octave au-dessus
    if (i % song.arpEvery === 0) {
      const tones = [...chord.notes.map((n) => n + 12), chord.notes[0] + 24];
      arp(tones[song.arp[i]], t, race ? 0.035 : 0.03);
    }

    if (race && bar >= 2) {
      if (song.kick.includes(i)) kick(t);
      if (song.snare.includes(i)) snare(t);
      if (song.toms.includes(i)) tom(t, i % 2 ? 160 : 110);
      if (i % 2 === 1 || section === 1) noise(t, { vol: i % 4 === 2 ? 0.05 : 0.03, dur: 0.04, freq: 8000 });
      if (section === 1 && i % 2 === 0) {
        const m = song.melody[(bar % 4) * 8 + i / 2];
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
    /**
     * 'menu' | 'race' | 'off' — fondu enchaîné entre les ambiances.
     * `songId` : morceau joué en course ('city', 'desert', 'orbital').
     */
    setMode(m, songId = 'city') {
      if (!audio.ctx) return;
      if (!bus) setup();
      const t = audio.ctx.currentTime;
      const wanted = SONGS[m === 'menu' ? 'city' : songId] ?? SONGS.city;
      if (m === mode && wanted === song) return;
      if (wanted !== song) {
        song = wanted;
        STEP = 60 / song.bpm / 4;
        delay.delayTime.setValueAtTime(STEP * 3, t);
        step = 0;
      }
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
