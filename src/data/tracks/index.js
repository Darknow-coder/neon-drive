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

export const TRACKS = [neonBoulevard, pulsarSpeedway, vortexCity, rainline, duneRunner, orbitalRing];

export const getTrackData = (id) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
