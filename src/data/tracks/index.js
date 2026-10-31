// Liste de tous les circuits du jeu.
// Pour ajouter un circuit : créer un fichier dans ce dossier et l'ajouter ici.
import neonBoulevard from './neonBoulevard.js';

export const TRACKS = [neonBoulevard];

export const getTrackData = (id) => TRACKS.find((t) => t.id === id) ?? TRACKS[0];
