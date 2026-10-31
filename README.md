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
node tools/progressionCheck.js # trophées, ligues, tirage des circuits, sauvegarde (35 vérifications)
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

## Ajouter un circuit

1. Copier un fichier de `src/data/tracks/` et changer `id`, `name`, `points`.
2. L'ajouter dans `src/data/tracks/index.js`.
3. Lancer `node tools/trackCheck.js` : il signale les portions de piste trop proches,
   les virages trop serrés et les passages trop étroits à côté des piliers.

Éléments spéciaux possibles (placés par position sur le tour, de 0 à 1) :
- `obstacles: [{ type: 'pillar', at: 0.3, offset: 0, r: 26 }]`
- `zones: [{ type: 'boost', at: 0.5, length: 110, offset: 0, width: 80 }]`
- `zones: [{ type: 'slick', at: 0.7, length: 260 }]` (zone glissante)

## Publication

**GitHub Pages** (gratuit, sans limite) : le fichier `.github/workflows/deploy.yml`
vérifie les circuits, construit le jeu et le publie à chaque envoi sur `main`.
Adresse : https://darknow-coder.github.io/neon-drive/

(Le fichier `netlify.toml` reste disponible si l'on veut publier aussi sur Netlify.)
