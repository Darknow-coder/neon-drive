// Liste de tous les circuits du jeu.
// Pour ajouter un circuit : créer un fichier dans ce dossier et l'ajouter ici.
// Chaque circuit indique la ligue à partir de laquelle il est accessible.
import neonBoulevard from './neonBoulevard.js';
import pulsarSpeedway from './pulsarSpeedway.js';
import vortexCity from './vortexCity.js';

export const TRACKS = [neonBoulevard, pulsarSpeedway, vortexCity];

export const getTrackData = (id) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
