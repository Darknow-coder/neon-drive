// Musique synthwave générée par code (originale) — 9 morceaux.
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
      { notes: [50, 54, 57], bass: 38 }, // Ré majeur (couleur « hijaz » avec le Mi bémol)
      { notes: [51, 55, 58], bass: 39 }, // Mi bémol
      { notes: [50, 54, 57], bass: 38 }, // Ré majeur
      { notes: [48, 52, 55], bass: 36 }, // Do
    ],
    melody: [
      74, null, 75, 78, null, 79, 78, 75,
      75, null, null, 74, 70, null, 72, null,
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
  // « Horizon » : menu. Calme et lumineux, Fa majeur, mélodie douce.
  menu: {
    bpm: 90, menuLead: true,
    chords: [
      { notes: [53, 57, 60], bass: 41 }, // Fa
      { notes: [52, 55, 60], bass: 40 }, // Do/Mi
      { notes: [50, 53, 57], bass: 38 }, // Ré mineur
      { notes: [50, 53, 58], bass: 34 }, // Si bémol
    ],
    melody: [
      72, null, 69, null, 72, 74, 72, null,
      67, null, null, 64, 67, null, 69, null,
      69, null, 65, null, 69, 72, 74, null,
      74, 72, 70, null, 65, null, null, null,
    ],
    bass: [0, null, null, null, 0, null, null, 12, 0, null, null, null, 0, null, 7, null],
    arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 2, 1, 2, 3],
    arpEvery: 2, arpWave: 'sine', leadWaves: ['triangle', 'sine'],
    kick: [0, 8], snare: [12], toms: [],
  },
  // « Sakura » : crépuscule. Pentatonique de La, sonorité de cordes pincées.
  dusk: {
    bpm: 96,
    chords: [
      { notes: [57, 60, 64], bass: 45 }, // La mineur
      { notes: [55, 59, 64], bass: 43 }, // Mi mineur / Sol
      { notes: [53, 57, 60], bass: 41 }, // Fa
      { notes: [55, 59, 62], bass: 43 }, // Sol
    ],
    melody: [
      81, null, 79, 76, null, 74, 76, null,
      76, null, 74, 76, 79, null, 76, null,
      74, null, 72, 69, null, 72, 74, null,
      74, null, null, 76, 79, null, 74, null,
    ],
    bass: [0, null, null, 0, null, null, 7, null, 0, null, null, 0, null, 12, 7, null],
    arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2],
    arpEvery: 1, arpWave: 'triangle', leadWaves: ['triangle', 'sine'],
    kick: [0, 7, 8], snare: [12], toms: [15],
  },
  // « Givre » : neige. Ré mineur, arpège de clochettes, rythme sautillant.
  snow: {
    bpm: 110,
    chords: [
      { notes: [62, 65, 69], bass: 38 }, // Ré mineur
      { notes: [58, 62, 65], bass: 34 }, // Si bémol
      { notes: [57, 60, 65], bass: 41 }, // Fa
      { notes: [55, 60, 64], bass: 36 }, // Do
    ],
    melody: [
      81, null, 77, null, 74, null, 77, 79,
      77, null, 74, null, 70, null, 74, null,
      72, null, 77, null, 81, null, 79, 77,
      76, null, 72, null, null, null, null, null,
    ],
    bass: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, 7, 12, null],
    arp: [0, 1, 2, 3, 1, 2, 3, 2, 0, 1, 2, 3, 1, 2, 3, 2],
    arpEvery: 1, arpWave: 'sine', leadWaves: ['sine', 'triangle'],
    kick: [0, 8, 10], snare: [4, 12], toms: [],
  },
  // « Fantôme » : brouillard. Do mineur harmonique, lent et mystérieux.
  fog: {
    bpm: 88,
    chords: [
      { notes: [60, 63, 67], bass: 36 }, // Do mineur
      { notes: [56, 60, 63], bass: 44 }, // La bémol
      { notes: [53, 56, 60], bass: 41 }, // Fa mineur
      { notes: [55, 59, 62], bass: 43 }, // Sol (majeur)
    ],
    melody: [
      79, null, null, 75, null, null, 74, 75,
      72, null, null, null, 68, null, 67, null,
      72, null, 75, null, 77, null, 75, 72,
      71, null, null, 74, null, null, null, null,
    ],
    bass: [0, null, null, null, null, null, 0, null, 0, null, null, null, 7, null, null, null],
    arp: [0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3, 0, 2, 1, 3],
    arpEvery: 2, arpWave: 'triangle', leadWaves: ['triangle', 'sawtooth'],
    kick: [0, 10], snare: [8], toms: [6, 14],
  },
  // « Foudre » : orage. Mi mineur, rapide et agressif.
  storm: {
    bpm: 128,
    chords: [
      { notes: [52, 55, 59], bass: 40 }, // Mi mineur
      { notes: [48, 52, 55], bass: 36 }, // Do
      { notes: [50, 54, 57], bass: 38 }, // Ré
      { notes: [47, 51, 54], bass: 35 }, // Si (majeur)
    ],
    melody: [
      76, null, 79, null, 83, null, 81, 79,
      76, null, 72, null, 76, null, 79, null,
      78, null, 81, null, 78, null, 74, null,
      75, null, 78, null, 83, null, null, null,
    ],
    bass: [0, 0, null, 0, 0, null, 0, 12, 0, 0, null, 0, 0, null, 12, 7],
    arp: [0, 1, 2, 1, 0, 1, 2, 3, 0, 1, 2, 1, 0, 2, 3, 2],
    arpEvery: 1, arpWave: 'square', leadWaves: ['sawtooth', 'square'],
    kick: [0, 3, 8, 11], snare: [4, 12], toms: [14, 15],
  },
  // « Giga Rush » : l'événement. Sol majeur, euphorique.
  giga: {
    bpm: 132,
    chords: [
      { notes: [55, 59, 62], bass: 43 }, // Sol
      { notes: [54, 57, 62], bass: 42 }, // Ré / Fa dièse
      { notes: [52, 55, 59], bass: 40 }, // Mi mineur
      { notes: [48, 52, 55], bass: 36 }, // Do
    ],
    melody: [
      79, null, 83, null, 86, null, 83, null,
      81, null, null, 78, 81, null, 83, null,
      79, null, 76, null, 79, null, 83, 86,
      84, null, 83, null, 81, null, null, null,
    ],
    bass: [0, null, 12, null, 0, null, 12, null, 0, null, 12, null, 0, 12, 7, 12],
    arp: [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 2, 1],
    arpEvery: 1, arpWave: 'square', leadWaves: ['sawtooth', 'square'],
    kick: [0, 4, 8, 12], snare: [4, 12], toms: [],
  },
};
export const SONG_IDS = Object.keys(SONGS);
export { SONGS };

/** Morceau d'un circuit : choisi par sa météo, sinon par son décor. */
export function songForTrack(td) {
  if (td?.music && SONGS[td.music]) return td.music;
  const byWeather = { dusk: 'dusk', snow: 'snow', fog: 'fog', storm: 'storm', sand: 'desert' };
  if (byWeather[td?.weather]) return byWeather[td.weather];
  const style = td?.theme?.style;
  return SONGS[style] ? style : 'city';
}

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
  let final = false;  // dernier tour : couches en plus, tempo un peu plus rapide
  let tone = null;    // filtre général (assourdi en pause)

  function setup() {
    const ctx = audio.ctx;
    bus = ctx.createGain();
    bus.gain.value = 0;
    tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 20000;
    bus.connect(tone);
    tone.connect(audio.musicBus);
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
      for (const det of (audio.lowEnd ? [0] : [-8, 8])) {
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
    const voices = audio.lowEnd ? [[song.leadWaves[0], 0]] : [[song.leadWaves[0], -6], [song.leadWaves[1], 6]];
    for (const [type, det] of voices) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(note);
      o.detune.value = det;
      o.connect(f);
      o.start(t); o.stop(t + STEP * 2.2);
      // léger vibrato (pas sur téléphone : un oscillateur de plus par note)
      if (!audio.lowEnd) {
        const lfo = ctx.createOscillator(); lfo.frequency.value = 5.5;
        const lg = ctx.createGain(); lg.gain.value = 6;
        lfo.connect(lg); lg.connect(o.detune);
        lfo.start(t); lfo.stop(t + STEP * 2.2);
      }
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
    const soft = mode === 'results' || mode === 'pause';

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
      if (song.kick.includes(i) || (final && (i === 2 || i === 10))) kick(t);
      if (song.snare.includes(i)) snare(t);
      if (song.toms.includes(i)) tom(t, i % 2 ? 160 : 110);
      // Charleston : doubles croches au dernier tour
      if (final || i % 2 === 1 || section === 1) noise(t, { vol: i % 4 === 2 ? 0.05 : 0.03, dur: 0.04, freq: 8000 });
      // Mélodie : une section sur deux… et tout le temps au dernier tour
      if ((section === 1 || final) && i % 2 === 0) {
        const m = song.melody[(bar % 4) * 8 + i / 2];
        if (m) lead(m, t);
      }
      // Dernier tour : contre-chant une octave plus bas
      if (final && i % 4 === 0) {
        const m = song.melody[(bar % 4) * 8 + i / 2];
        if (m) arp(m - 12, t, 0.03);
      }
    } else if (!race) {
      if (i % 4 === 2) noise(t, { vol: 0.012, dur: 0.05, freq: 9000 });
      // Menu : la mélodie douce revient une section sur deux
      if (!soft && song.menuLead && section === 1 && i % 2 === 0) {
        const m = song.melody[(bar % 4) * 8 + i / 2];
        if (m) lead(m, t);
      }
    }
  }

  function tick() {
    const ctx = audio.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (nextTime < ctx.currentTime) nextTime = ctx.currentTime + 0.05; // rattrapage après une pause
    // Notes programmées 0,4 s à l'avance (0,15 s sur PC) : même si l'écran
    // saccade un instant, la musique ne manque jamais de notes.
    while (nextTime < ctx.currentTime + (audio.lowEnd ? 0.4 : 0.15)) {
      scheduleStep(step, nextTime);
      step++;
      nextTime += STEP;
    }
  }

  const busLevel = () => (mode === 'race' ? (final ? 1.05 : 0.9) : mode === 'pause' ? 0.6 : mode === 'results' ? 0.8 : 1.4);

  // ---------- Jingles ----------
  // Joués par-dessus la musique (baissée un instant), dans la tonalité du morceau.
  function duck(seconds) {
    const t = audio.ctx.currentTime;
    bus.gain.cancelScheduledValues(t);
    bus.gain.setTargetAtTime(busLevel() * 0.2, t, 0.05);
    bus.gain.setTargetAtTime(busLevel(), t + seconds, 0.8);
  }
  function brass(note, t, dur, vol = 0.06) {
    const ctx = audio.ctx;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    gn.gain.setValueAtTime(vol, t + dur * 0.7);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(900, t);
    f.frequency.exponentialRampToValueAtTime(4000, t + 0.08);
    f.connect(gn); gn.connect(audio.musicBus);
    const rv = ctx.createGain(); rv.gain.value = 0.7; gn.connect(rv); rv.connect(audio.reverb);
    for (const det of [-9, 0, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth'; o.frequency.value = mtof(note); o.detune.value = det;
      o.connect(f); o.start(t); o.stop(t + dur + 0.05);
    }
  }
  function crash(t, vol = 0.18) {
    const ctx = audio.ctx;
    const s = ctx.createBufferSource(); s.buffer = audio.noise;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    s.connect(f); f.connect(gn); gn.connect(audio.musicBus);
    const rv = ctx.createGain(); rv.gain.value = 0.6; gn.connect(rv); rv.connect(audio.reverb);
    s.start(t); s.stop(t + 1.7);
  }
  function riser(t, dur) {
    const ctx = audio.ctx;
    const s = ctx.createBufferSource(); s.buffer = audio.noise; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + dur);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.16, t + dur); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    s.connect(f); f.connect(gn); gn.connect(audio.musicBus);
    s.start(t); s.stop(t + dur + 0.1);
  }

  /** Jingle : 'victory' | 'podium' | 'finish' | 'final' (dernier tour). */
  function jingle(kind) {
    if (!audio.ctx || !bus || audio.ctx.state !== 'running') return;
    const t = audio.ctx.currentTime + 0.05;
    const root = song.chords[0].bass + 24; // tonique du morceau, dans le médium
    const minor = song.chords[0].notes[1] - song.chords[0].notes[0] === 3;
    const third = minor ? 3 : 4;
    if (kind === 'final') {
      // Dernier tour : montée de bruit + arpège qui grimpe, puis cymbale
      riser(t, 1.1);
      [0, third, 7, 12, 12 + third, 19].forEach((iv, k) => arp(root + 12 + iv, t + 0.5 + k * 0.09, 0.05));
      crash(t + 1.1, 0.14);
      return;
    }
    if (kind === 'victory') {
      // Fanfare : arpège majeur montant, puis grand accord tenu (toujours en majeur : c'est une victoire !)
      duck(3.4);
      const seq = [0, 4, 7, 12, 16];
      seq.forEach((iv, k) => brass(root + iv, t + k * 0.13, 0.22, 0.05));
      for (const iv of [0, 4, 7, 12]) brass(root + iv, t + 0.72, 1.9, 0.045);
      brass(root + 19, t + 0.72, 1.9, 0.04);
      crash(t + 0.72);
      return;
    }
    if (kind === 'podium') {
      duck(2.6);
      [0, 7, 12].forEach((iv, k) => brass(root + iv, t + k * 0.15, 0.25, 0.05));
      for (const iv of [0, third, 7]) brass(root + 12 + iv, t + 0.5, 1.4, 0.04);
      crash(t + 0.5, 0.1);
      return;
    }
    // Arrivée sans podium : petite cadence descendante, sans tristesse
    duck(2.2);
    [12, 7, third, 0].forEach((iv, k) => brass(root + iv, t + k * 0.14, 0.24, 0.04));
    for (const iv of [0, 7, 12]) brass(root + iv - 12, t + 0.6, 1.1, 0.035);
  }

  return {
    jingle,
    /** Dernier tour : la musique monte d'un cran (couches, tempo +5 %). */
    setFinal(v) {
      if (!bus || final === v) return;
      final = v;
      STEP = 60 / (song.bpm * (final ? 1.05 : 1)) / 4;
      if (final) jingle('final');
      bus.gain.setTargetAtTime(busLevel(), audio.ctx.currentTime, 0.4);
    },
    /**
     * 'menu' | 'race' | 'results' | 'pause' | 'off' — fondu enchaîné entre les ambiances.
     * `songId` : morceau joué en course (voir songForTrack).
     */
    setMode(m, songId = 'city') {
      if (!audio.ctx) return;
      if (!bus) setup();
      const t = audio.ctx.currentTime;
      // Résultats et pause : on garde le morceau de la course, en version douce
      const keep = m === 'results' || m === 'pause';
      const wanted = keep ? song : SONGS[m === 'menu' ? 'menu' : songId] ?? SONGS.city;
      if (m === mode && wanted === song) return;
      if (m !== 'race' && m !== 'pause') final = false;
      if (wanted !== song) {
        song = wanted;
        final = false;
        STEP = 60 / song.bpm / 4;
        delay.delayTime.setValueAtTime(STEP * 3, t);
        step = 0;
      }
      const wasPause = mode === 'pause';
      mode = m;
      intensity = m === 'race' ? 1 : 0;
      tone.frequency.setTargetAtTime(m === 'pause' ? 700 : 20000, t, 0.2);
      if (m === 'off') {
        bus.gain.setTargetAtTime(0, t, 0.3);
        clearInterval(timer);
        timer = 0;
        return;
      }
      if (m === 'race' && !wasPause) { step = 0; final = false; STEP = 60 / song.bpm / 4; } // la course repart du début
      bus.gain.cancelScheduledValues(t);
      bus.gain.setTargetAtTime(busLevel(), t, 0.6);
      if (!timer) {
        nextTime = audio.ctx.currentTime + 0.1;
        timer = setInterval(tick, 25);
      }
    },
    get mode() { return mode; },
  };
}
