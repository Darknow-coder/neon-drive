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
```

## Publication (Netlify)

Le fichier `netlify.toml` est prêt : relier le dépôt GitHub à Netlify suffit
(commande `npm run build`, dossier `dist`).
