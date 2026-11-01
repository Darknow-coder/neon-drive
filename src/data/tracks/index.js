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

export const getTrackData = (id) => TRACKS.find((t) => t.id === id) ?? EVENT_TRACKS.find((t) => t.id === id) ?? TRACKS[0];
