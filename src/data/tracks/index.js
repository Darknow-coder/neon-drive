// Liste de tous les circuits du jeu.
// Pour ajouter un circuit : créer un fichier dans ce dossier (ou l'exporter
// depuis l'éditeur editor.html) et l'ajouter ici.
// Chaque circuit indique la ligue à partir de laquelle il est accessible.
import neonBoulevard from './neonBoulevard.js';
import pulsarSpeedway from './pulsarSpeedway.js';
import vortexCity from './vortexCity.js';
import rainline from './rainline.js';
import duneRunner from './duneRunner.js';
import orbitalRing from './orbitalRing.js';
import citadel from './citadel.js';
import neonHighway from './neonHighway.js';
import sakuraAvenue from './sakuraAvenue.js';
import frostline from './frostline.js';
import sirocco from './sirocco.js';
import phantomBay from './phantomBay.js';
import thunderPeak from './thunderPeak.js';

export const TRACKS = [
  neonBoulevard, pulsarSpeedway, vortexCity, sakuraAvenue,  // Bronze
  rainline, frostline,                                      // Argent
  duneRunner, sirocco,                                      // Or
  orbitalRing, phantomBay,                                  // Diamant
  citadel, thunderPeak,                                     // Élite
];

// Circuits d'événement : hors courses classées et hors chrono
export const EVENT_TRACKS = [neonHighway];

// Circuits temporaires (défi du jour : circuit à l'envers, météo surprise…)
const TEMP = new Map();
export function registerTempTrack(data) { TEMP.set(data.id, data); return data; }

export const getTrackData = (id) => TRACKS.find((t) => t.id === id) ?? EVENT_TRACKS.find((t) => t.id === id) ?? TEMP.get(id) ?? TRACKS[0];

/**
 * Variante d'un circuit : à l'envers et/ou avec une autre météo.
 * (Les piliers et zones sont replacés au même endroit du tracé.)
 */
export function trackVariant(base, { reverse = false, weather = null, id, name } = {}) {
  const d = { ...base, id: id ?? `${base.id}-v`, name: name ?? base.name, variantOf: base.id };
  if (reverse) {
    d.points = [base.points[0], ...base.points.slice(1).reverse()];
    const flip = (a) => (1 - a + 1) % 1;
    d.obstacles = (base.obstacles ?? []).map((o) => ({ ...o, at: flip(o.at), offset: -(o.offset ?? 0) }));
    d.zones = (base.zones ?? []).map((z) => ({ ...z, at: flip(z.at), offset: -(z.offset ?? 0) }));
  }
  if (weather) d.weather = weather === 'clear' ? undefined : weather;
  return d;
}
