# Mettre NEON//DRIVE sur itch.io : le guide pas à pas

Compte environ 20 minutes. Tout est gratuit. Tu n'as rien à coder.

## Ce qu'il y a dans ce dossier

| Fichier | À quoi il sert |
|---|---|
| `neon-drive-itch.zip` | **Le jeu**, prêt à être joué dans la page itch.io |
| `cover.png` | L'image de couverture (la vignette qu'on voit dans les listes) |
| `screenshot-1` à `screenshot-6` | Les captures d'écran de la page |
| `gameplay.gif` | Une petite animation de course (à mettre avec les captures) |
| `gameplay.mp4` | La même course en vidéo, si un jour tu veux la mettre sur YouTube |
| `page-itch.md` | Tous les textes à copier-coller (titre, description, tags…) |

## Étape 1 : créer le compte

1. Va sur **itch.io** et clique sur **Register** (en haut à droite).
2. Choisis un nom d'utilisateur. **Attention : il apparaîtra dans l'adresse du jeu**
   (par exemple `tonpseudo.itch.io/neon-drive`). Prends un nom de studio sympa
   plutôt que ton vrai nom, par exemple `darknow`.
3. Sur la question « What are you interested in? », coche **I'm interested in distributing content on itch.io**.
4. Valide l'email que tu reçois.

## Étape 2 : créer la page du jeu

1. En haut à droite : clique sur la petite flèche à côté de ton nom, puis **Upload new project**.
2. Remplis les cases avec les textes de `page-itch.md` :
   - **Title**, **Project URL** et **Short description**
   - **Kind of project** : choisis **HTML** (très important : c'est ce qui rend le jeu jouable dans la page)
   - **Release status** : In development
   - **Pricing** : **No payments**

## Étape 3 : envoyer le jeu

1. Dans **Uploads**, clique sur **Upload files** et choisis `neon-drive-itch.zip`.
2. Sous le fichier, coche **This file will be played in the browser**.
3. Dans **Embed options**, règle :
   - **Embed in page**
   - Viewport dimensions : **1280** × **720**
   - Coche **Mobile friendly**, puis Orientation : **Landscape**
   - Coche **Fullscreen button**
   - Laisse décochées les autres cases

## Étape 4 : le texte et les images

1. **Description** : colle le grand bloc « Description » de `page-itch.md`.
2. **Genre** : Racing.
3. **Tags** : colle la liste de tags.
4. **Cover image** : envoie `cover.png`.
5. **Screenshots** : envoie les captures dans l'ordre indiqué, plus `gameplay.gif`.
6. **Community** : choisis **Comments**, pour que les joueurs puissent laisser un message.
7. **Visibility** : laisse **Draft** pour l'instant, puis clique sur **Save & view page**.

## Étape 5 : vérifier, puis publier

1. Sur la page qui s'ouvre, clique sur **Run game** : le jeu doit se lancer dans la page.
2. Essaie aussi depuis ton téléphone (connecté à ton compte itch.io), téléphone tourné à l'horizontale.
3. Si tout va bien : **Edit game**, puis Visibility : **Public**, puis **Save**. Le jeu est en ligne ! 🎉

## Bon à savoir

- **Les progrès des joueurs** : sur itch.io, le jeu garde sa sauvegarde à part de celle du site GitHub.
  C'est normal (ce sont deux adresses différentes). Toi-même, tu repartiras de zéro sur itch.io.
- **Les classements en ligne** et les fantômes d'amis marchent aussi sur itch.io : c'est le même serveur.
- **Savoir d'où viennent les joueurs** : dans Supabase, le bloc 6 de `supabase/stats.sql` affiche maintenant
  `host_itch` (joueurs venus d'itch.io) et `host_github` (joueurs venus du site).
- **Quand je modifie le jeu**, il faudra renvoyer un nouveau zip sur itch.io : je te le préparerai à chaque fois.
  Sur la page du jeu : Edit game, puis dans Uploads, supprime l'ancien zip et envoie le nouveau
  (en recochant « played in the browser »).
- Les statistiques d'itch.io (vues, parties lancées) sont dans **Dashboard → Analytics**.
