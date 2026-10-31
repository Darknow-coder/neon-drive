# NEON//DRIVE 2.0

Jeu de course arcade néon en vue du dessus, jouable dans le navigateur (téléphone et ordinateur).

## Lancer le jeu

Prérequis : [Node.js](https://nodejs.org) (version 20 ou plus).

```bash
npm install      # une seule fois : installe les outils
npm run dev      # lance le jeu sur http://localhost:5173
npm run build    # crée la version publiable dans le dossier dist/
```

`npm run dev` affiche aussi une adresse « Network » : ouvre-la sur ton téléphone
(connecté au même Wi-Fi) pour tester les commandes tactiles.

## Commandes

| Action | Clavier | Tactile |
|---|---|---|
| Tourner | ← → (ou Q/A, D) | ◀ ▶ (pouce gauche) |
| Accélérer | ↑ (ou Z/W) | GAZ |
| Freiner / marche arrière | ↓ (ou S, Espace) | FREIN |
| Drift | Freiner + tourner à vitesse élevée | FREIN + ◀/▶ |
| Boost | Maj ou B | BOOST |
| Replacer la voiture | R | ⟲ |
| Pause | Échap ou P | ❚❚ |
| Réglages de conduite | T | ⚙ |

## Organisation du code

```
src/
  core/       boucle de jeu (pas fixe 120 Hz), commandes, maths
  physics/    physique des voitures, collisions
  data/       voitures, circuits — tout ce qui s'équilibre, sans logique
  track/      construction des circuits (courbes, murs)
  race/       tours, (bientôt) classement
  render/     dessin : circuit, voitures, particules, caméra
  ui/         HUD, panneau de réglage
  scenes/     écrans de jeu
tools/        tests automatiques sans affichage (node tools/xxx.js)
```

## Tests rapides

```bash
node tools/physicsCheck.js   # un pilote auto fait des tours avec chaque voiture
node tools/driftCheck.js     # vérifie que le drift reste contrôlable
node tools/trackCheck.js     # vérifie la géométrie des circuits (chevauchements, virages, piliers)
node tools/aiSolo.js         # un pilote IA seul : temps au tour, chocs (diagnostic)
node tools/carBalance.js     # compare les voitures avec le même pilote IA
node tools/aiRace.js 20      # 20 courses complètes entre IA : classements, dépassements, chocs
node tools/blockCheck.js     # aucune IA ne reste bloquée derrière une voiture arrêtée
node tools/trackFlow.js      # exigence de chaque circuit (vitesse moyenne, freinages, drift)
node tools/progressionCheck.js # trophées, ligues, rivaux, tirage des circuits, sauvegarde
node tools/rivalCheck.js       # force des rivaux dans leur ligue
```

## Intelligence artificielle

- `src/ai/racingLine.js` calcule la trajectoire idéale de chaque circuit et, pour chaque
  voiture, la vitesse cible en tout point (à partir de SA physique).
- `src/ai/aiDriver.js` pilote : il ne produit que des commandes (direction, gaz, frein, boost),
  exactement comme le joueur. Aucune triche possible : même physique pour tous.
- `src/data/aiProfiles.js` : les 5 personnalités, les pilotes et le niveau par ligue
  (fixé avant la course, jamais modifié pendant).

## Progression

- `src/data/progression.js` : trophées par place, seuils des ligues, nombre de tours — à modifier librement.
- `src/progression/progression.js` : règles (trophées, montée de ligue, tirage du circuit sans répétition).
- `src/progression/save.js` : sauvegarde locale versionnée, avec copie de secours et réparation automatique.
- Chaque circuit indique sa ligue d'accès (`league` dans `src/data/tracks/*.js`).

## Son

Tout le son est généré par code (Web Audio API) : aucun fichier audio, 100 % original.
- `src/audio/audio.js` : moteur audio (volumes musique / effets, réverbération).
- `src/audio/sfx.js` : moteur, drift, boost, chocs, compte à rebours, tours, arrivée.
- `src/audio/music.js` : musique synthwave (séquenceur : accords, basse, nappes, arpège, batterie, mélodie).
- Volumes et vibrations réglables (bouton ⚙ du menu), enregistrés dans la sauvegarde.

## Application installable

`public/manifest.webmanifest` + `public/sw.js` : le jeu s'installe sur l'écran d'accueil
(Chrome → menu ⋮ → « Installer l'application » / « Ajouter à l'écran d'accueil »)
et fonctionne hors ligne après une première visite.

## Économie

- `src/data/economy.js` : tous les montants (crédits par course, coûts d'amélioration,
  effet des niveaux, niveau des voitures adverses par ligue, packs, route des trophées).
- `src/progression/economy.js` : règles (crédits, améliorations, packs, déblocage par fragments, route).
- Sauvegarde version 3 (conversion automatique des anciennes sauvegardes).

## Boutique

- `src/data/shop.js` : cadeau quotidien, finitions, motifs, réglages des offres du jour.
- `src/progression/shop.js` : génération des offres (stables dans la journée, nouvelles à minuit),
  achats, cadeau quotidien, équipement des cosmétiques.
- Les cosmétiques (finitions, motifs) n'ont aucun effet sur les performances.
- Sauvegarde version 4 (conversion automatique).

## Missions

- `src/data/missions.js` : modèles de missions du jour et de la semaine, récompenses, bonus.
- `src/progression/missions.js` : génération (stable dans la journée / la semaine), progression, récompenses.
- Sauvegarde version 5 (conversion automatique).

## Contre-la-montre

- `src/race/ghost.js` : enregistrement / lecture des fantômes (≈ 10 Ko par tour, stockés à part).
- `src/race/aiGhost.js` : fantôme NEON (tour de l'IA Élite), référence des médailles.
- `src/data/timeTrial.js` : médailles et récompenses. Après une modification de la physique,
  de l'IA ou d'un circuit, relancer `node tools/timeTrialTargets.js` pour recalculer les temps.
- Sauvegarde version 6 (meilleurs temps et médailles).

## Coupe

- `src/data/cup.js` : barème de points, récompenses finales, multiplicateur par ligue.
- `src/progression/cup.js` : création (3 circuits de la ligue, 5 adversaires dont le rival),
  grille (tirage puis ordre inverse du classement), points, fin de coupe.
- La coupe en cours est sauvegardée (version 7) : on peut la reprendre plus tard.

## Garage et voitures

- `src/data/cars.js` : voitures (notes 1-10, silhouette, couleurs) et leur mode de déblocage
  (`unlock: { type: 'trophies', min: 100 }` aujourd'hui ; boutique, fragments… prévus).
- `src/progression/garage.js` : voitures possédées, déblocages, couleurs personnalisées.
- La sauvegarde (version 2) garde la liste des voitures possédées et leurs couleurs.
- Outils de test (panneau ⚙ de réglage de la conduite) : ajouter `?dev` à l'adresse.

## Créer un circuit : l'éditeur

Ouvrir **`editor.html`** (en ligne : https://darknow-coder.github.io/neon-drive/editor.html,
ou http://localhost:5173/editor.html avec `npm run dev`).

- Glisser les points pour dessiner le tracé ; double-clic sur la piste pour ajouter un point ;
  Suppr pour en retirer un ; Ctrl+Z pour annuler. Le brouillon est enregistré automatiquement.
- Outils Pilier / Boost / Glissant : cliquer sur la piste pour placer l'élément (puis le glisser).
- La vérification est en direct (problèmes surlignés en rouge, mêmes règles que `tools/trackCheck.js`).
- « Tour IA » : trois IA font un tour (temps, chocs). « Essayer » : ouvre le jeu sur ce circuit (entraînement).
- « Exporter » : fichier à placer dans `src/data/tracks/` puis à ajouter dans `src/data/tracks/index.js`.

Options d'un circuit : `theme.style` (`'city'`, `'desert'`, `'orbital'`), `weather: 'rain'`
(adhérence réduite pour tous), `laps` (nombre de tours, sinon 3).

Éléments spéciaux possibles (placés par position sur le tour, de 0 à 1) :
- `obstacles: [{ type: 'pillar', at: 0.3, offset: 0, r: 26 }]`
- pilier mobile : `{ type: 'pillar', at: 0.5, offset: 0, r: 22, move: { amp: 60, period: 3, phase: 0 } }`
  (à ajouter dans le fichier exporté ; l'éditeur affiche sa position centrale)
- `zones: [{ type: 'boost', at: 0.5, length: 110, offset: 0, width: 80 }]`
- `zones: [{ type: 'slick', at: 0.7, length: 260 }]` (zone glissante)

## Publication

**GitHub Pages** (gratuit, sans limite) : le fichier `.github/workflows/deploy.yml`
vérifie les circuits, construit le jeu et le publie à chaque envoi sur `main`.
Adresse : https://darknow-coder.github.io/neon-drive/

(Le fichier `netlify.toml` reste disponible si l'on veut publier aussi sur Netlify.)
