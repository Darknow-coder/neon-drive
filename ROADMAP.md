# NEON//DRIVE — Feuille de route

## ✅ Version 1 (terminée)
Menu, courses à 6, conduite inertie + drift, 3 circuits, 5 IA (sans triche), classement,
trophées, 5 ligues, garage (déblocages par paliers, peinture), sauvegarde sécurisée,
son et musique générés par code, application installable et hors ligne.

## ✅ Phase 1 — Consolider et s'outiller
- [x] Options de commandes : gaucher, accélération automatique, taille des boutons
- [x] Export / import de sauvegarde par code
- [x] Tutoriel au premier lancement
- [x] Éditeur de circuits dans le navigateur (vérification en direct, essai, export)
- [x] Réglages selon les retours (son, difficulté, conduite)

## Phase 2 — Contenu (en continu)  ⏳ en cours
- [x] 5 nouveaux circuits (un par ligue), chacun avec sa météo : SAKURA AVENUE (crépuscule), FROSTLINE (neige),
      SIROCCO (tempête de sable + rafales), PHANTOM BAY (brouillard), THUNDER PEAK (orage)
- [x] Environnements visuels : ville, désert néon, station orbitale
- [x] Météo : pluie (adhérence réduite pour tous, effets visuels et sonores)
- [x] 3 nouveaux circuits : RAINLINE (Argent), DUNE RUNNER (Or), ORBITAL RING (Diamant)
- [x] 3 nouvelles voitures : SPECTRE (250), COMET (400), BASTION (600)
- [x] Designs de voitures distincts, aperçu des voitures verrouillées
- [x] Rivaux « boss » par ligue (SPARK, VANTA, MIRAGE, ZENITH, NEMESIS) : +3 trophées si battu
- [x] 2 musiques supplémentaires (désert « Mirage », orbitale « Orbite »)
- [x] Piliers mobiles + circuit Élite CITADEL
- [ ] Circuits créés avec l'éditeur, nouvelles voitures
- 10 à 12 circuits (2 par ligue), thèmes visuels, raccourcis, obstacles mobiles, pluie
- 12 à 15 voitures avec raretés
- Un rival « boss » par ligue
- 3 à 4 morceaux de musique

## ✅ Phase 3 — Économie et progression
- [x] Crédits gagnés en course (place, drift, dépassements, course propre, rival)
- [x] Route des trophées (récompenses par palier, rétroactive)
- [x] Fragments et packs (déblocage anticipé des voitures)
- [x] Améliorations des voitures (niveaux 1 à 5 ; voitures adverses au niveau de la ligue)
- [x] Boutique : cadeau quotidien (cycle 7 jours), 6 offres du jour, packs, finitions et motifs (cosmétiques)
- [x] Missions : 3 du jour (+ bonus), 1 de la semaine — aucune mission de drift

## ✅ Phase 4 — Modes de jeu
- [x] Contre-la-montre avec fantôme (record + fantôme NEON), 4 médailles par circuit
- [x] Coupe : 3 courses, mêmes adversaires, points, grille inversée, podium et récompenses
- [x] Élimination : le dernier sort à chaque tour du leader, alerte DANGER, compte à rebours
- [x] Nouveau menu principal (vitrine de la voiture, tuiles de modes, barre de navigation)
- [x] Essentiels : écran de chargement (astuces, version), profil du joueur (pseudo, emblème, titre, statistiques), 15 succès à 3 paliers
- [x] Événement GIGA RUSH (provisoirement permanent) : 20 voitures sur NEON HIGHWAY, circuit géant et large, 4 objectifs dont un motif exclusif
- [ ] Plus tard (quand le jeu aura des joueurs) : événements qui tournent chaque semaine

## ✅ Défi du jour
- [x] Un défi par jour, le même pour tout le monde (tiré au sort à partir de la date) : circuit (parfois à l'envers),
      météo surprise, format (course, remontée, élimination, chrono), voiture imposée, règle spéciale
      (sans boost, turbo infini, verglas, même voiture pour tous)
- [x] 3 étoiles, essais illimités, série de jours avec récompenses sur 7 jours
- [x] tools/dailyCheck.js : vérifie les prochains défis (circuits à l'envers valides, courses jouables, temps calculables)

## ✅ Musique et ambiance
- [x] 9 morceaux originaux générés par code (menu, ville, désert, orbite, crépuscule, neige, brouillard, orage, GIGA RUSH)
- [x] Dernier tour : la musique monte (couches, tempo +5 %) ; élimination : au duel final
- [x] Jingles d'arrivée (victoire, podium, arrivée) dans la tonalité du morceau ; musique douce en pause et aux résultats
- [x] tools/musicCheck.js : vérifie gammes et accords (aucune note qui frotte sur un temps fort)

## ✅ Voitures à capacité spéciale
- [x] PIXIE (mini 3 roues, AGILE), IONIX (électrique, RECHARGE), GOLIATH (muscle car, BÉLIER), HYPERION (prototype, LÉVITATION)
- [x] Capacités identiques pour le joueur et les IA ; sons de moteur propres ; équilibrage vérifié (tools/carBalance.js, tools/traitCheck.js)

## ✅ Mode Carrière
- [x] 5 chapitres (un par rival et par ligue), 4 défis à étoiles + 1 duel par chapitre (75 étoiles)
- [x] 7 types de défis : course, remontée, poursuite, course propre, élimination, chrono, duel
- [x] Histoire : dialogues de présentation et de fin pour chaque rival ; NEMESIS en boss final
- [x] Récompenses : crédits par étoile, packs, titres, emblèmes Masque/Némésis, finition PRISME, motif GRIFFES
- [x] Outils : tools/careerCheck.js (faisabilité des défis) et tools/careerTargets.js (temps des défis chrono)

## ✅ IA plus vivantes
- [x] Grosses erreurs des IA (virage raté dans le mur, corde coupée, pilier percuté) : fréquence fixée par la ligue
      et le profil (jamais selon la position du joueur), annonce quand le rival se plante
- [x] Correctif : une IA coincée ne se fait plus replacer en boucle

## ✅ Sensations de jeu
- [x] Feux de départ et départ canon (même règle pour les IA), patinage si on accélère trop tôt
- [x] Ralenti + confettis sur une victoire ou un photo-finish, coup de caméra au boost, lignes de vitesse
- [x] Sons : moteur qui chante sur la grille, passages de rapport, pétarades, frottement contre le mur, « whoosh » des dépassements

## ✅ Phase 5 — Passe de saison (Saison 1, sans date de fin pour l'instant)
- [x] 100 niveaux gratuits (~75 000 XP), XP dans tous les modes, missions et succès, XP ×2 sur les 3 premières courses du jour
- [x] Exclusifs : voiture AURORA (niveau 100), 3 finitions, 4 motifs, 4 emblèmes, 5 titres ; coffres bonus après le niveau 100
- [ ] Plus tard : saisons qui changent (thème, date de fin, récompenses de fin de saison)

## Phase 5 (suite) — Saisons
- Saisons de ~4 semaines, récompenses de fin de saison, passe de saison gratuit, thème par saison

## Phase 6 — En ligne  ⏳ en cours
- [x] Serveur Supabase (gratuit) : comptes invisibles, profils publics, anti-triche côté serveur, filtre de pseudos
- [x] Classement des trophées : monde, ma ligue, autour de moi ; place mondiale dans le menu
- [x] Amis : code ami et lien à partager, demandes (accepter / refuser), classement entre amis, fiche pilote
- [x] Vie privée : « Supprimer mon profil en ligne » dans les Réglages
- [ ] Clubs
- Classements mondiaux (base de données gratuite, vérification des temps par rejeu du fantôme)
- Fantômes d'autres joueurs, défis entre amis par code
- (Plus tard, éventuellement) multijoueur en temps réel

## Principes
1. Jamais de triche des IA (niveau fixé avant la course).
2. Pas de « payer pour gagner ».
3. Le plaisir de conduite d'abord ; tout est vérifié par les outils automatiques.
4. Gratuit et léger (GitHub Pages, son et graphismes générés par code).
