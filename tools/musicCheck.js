// Vérifie les morceaux (src/audio/music.js) comme le ferait un musicien :
//  - structure : 32 notes de mélodie, 16 pas de basse et d'arpège, 4 accords ;
//  - chaque note de mélodie appartient à la gamme du morceau (notes de ses accords) ;
//  - aucune note sur un temps fort ne frotte d'un demi-ton contre l'accord joué.
// Usage : node tools/musicCheck.js
globalThis.window ??= {};
const { SONGS, songForTrack } = await import('../src/audio/music.js');
const { TRACKS, EVENT_TRACKS } = await import('../src/data/tracks/index.js');

const NAMES = ['Do', 'Do#', 'Ré', 'Mib', 'Mi', 'Fa', 'Fa#', 'Sol', 'Lab', 'La', 'Sib', 'Si'];
const pc = (n) => ((n % 12) + 12) % 12;
let fails = 0;
for (const [id, s] of Object.entries(SONGS)) {
  const problems = [];
  if (s.melody.length !== 32) problems.push(`mélodie : ${s.melody.length} notes au lieu de 32`);
  if (s.bass.length !== 16 || s.arp.length !== 16) problems.push('basse / arpège : 16 pas attendus');
  if (s.chords.length !== 4) problems.push('4 accords attendus');
  if (s.arp.some((k) => k < 0 || k > 3)) problems.push('arpège : indices 0 à 3');
  const scale = new Set(s.chords.flatMap((c) => c.notes.map(pc)));
  s.melody.forEach((n, k) => {
    if (n === null) return;
    const chord = s.chords[Math.floor(k / 8)];
    const tones = chord.notes.map(pc);
    if (!scale.has(pc(n)) && !tones.includes(pc(n))) problems.push(`note ${NAMES[pc(n)]} (pas ${k}) hors de la gamme`);
    // temps forts : 1er et 3e temps de la mesure (pas 0 et 4 de 8)
    if (k % 8 === 0 || k % 8 === 4) {
      const clash = tones.some((t) => { const d = Math.abs(pc(n) - t); return d === 1 || d === 11; });
      if (clash) problems.push(`note ${NAMES[pc(n)]} sur un temps fort frotte contre l'accord (pas ${k})`);
    }
  });
  const bassOk = s.chords.every((c) => pc(c.bass) === pc(c.notes[0]) || c.notes.map(pc).includes(pc(c.bass)));
  if (!bassOk) problems.push('une basse ne fait pas partie de son accord');
  const filled = s.melody.filter((n) => n !== null).length;
  console.log(`${problems.length ? '✗' : '✓'} ${id.padEnd(8)} ${String(s.bpm).padStart(3)} bpm  ${filled} notes de mélodie  gamme : ${[...scale].sort((a, b) => a - b).map((p) => NAMES[p]).join(' ')}`);
  for (const p of problems) console.log('    → ' + p);
  if (problems.length) fails++;
}
// Chaque circuit a un morceau existant
const used = {};
for (const td of [...TRACKS, ...EVENT_TRACKS]) {
  const sid = songForTrack(td);
  if (!SONGS[sid]) { console.log(`✗ ${td.name} : morceau ${sid} inexistant`); fails++; }
  (used[sid] ??= []).push(td.name);
}
for (const [sid, list] of Object.entries(used)) console.log(`  ${sid.padEnd(8)} ← ${list.join(', ')}`);
process.exit(fails ? 1 : 0);
