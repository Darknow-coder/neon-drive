// Moteur audio : tout le son du jeu est GÉNÉRÉ par code (Web Audio API).
// Aucun fichier audio → 100 % original, rien à télécharger, aucune licence.
//
// Chaîne : [musique] ─┐
//          [effets]  ─┴─► compresseur ─► haut-parleurs
// Si le navigateur ne gère pas le son, tout devient silencieux sans erreur.

export function createAudio(settings, { lowEnd = false } = {}) {
  let ctx = null;
  let master, musicBus, sfxBus, comp, noiseBuf, reverb;

  function init() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      // Téléphone : tampon audio plus grand (« playback ») → plus de grésillements
      // quand le processeur est occupé (un peu plus de latence, inaudible pour la musique)
      ctx = new AC({ latencyHint: lowEnd ? 'playback' : 'interactive' });
    } catch {
      return null;
    }
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.9;
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(comp);
    comp.connect(ctx.destination);
    applyVolumes();

    // Bruit blanc réutilisable (drift, chocs, batterie…)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    // Réverbération générée (réponse impulsionnelle synthétique)
    reverb = ctx.createConvolver();
    // (réverbération plus courte sur téléphone : c'est l'effet le plus gourmand)
    const len = Math.floor(ctx.sampleRate * (lowEnd ? 1.1 : 2.2));
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    reverb.buffer = ir;
    const revGain = ctx.createGain();
    revGain.gain.value = 0.35;
    reverb.connect(revGain);
    revGain.connect(master);
    return ctx;
  }

  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    // Courbe quadratique : plus naturelle pour l'oreille qu'un réglage linéaire
    musicBus.gain.setTargetAtTime(settings.music ** 2 * 1.7, t, 0.05);
    sfxBus.gain.setTargetAtTime(settings.sfx ** 2, t, 0.05);
  }

  /** À appeler lors d'un geste du joueur (obligatoire sur mobile). */
  function unlock() {
    init();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  return {
    unlock,
    applyVolumes,
    suspend() { if (ctx && ctx.state === 'running') ctx.suspend().catch(() => {}); },
    resume() { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); },
    get ctx() { return ctx; },
    get ready() { return !!ctx && ctx.state === 'running'; },
    get musicBus() { return musicBus; },
    get sfxBus() { return sfxBus; },
    get reverb() { return reverb; },
    get noise() { return noiseBuf; },
    settings,
    lowEnd,
  };
}
