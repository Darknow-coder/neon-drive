# Faire connaître le site à Google (Google Search Console)

Compte 10 minutes. C'est gratuit. Il te faut juste un compte Google (une adresse Gmail).

Pourquoi ? Sans ça, Google peut mettre des semaines à découvrir le site tout seul.
Avec, tu lui dis : « mon site existe, viens le voir ». Et tu pourras voir combien de gens
le trouvent sur Google, et avec quels mots.

## Étape 1 : ajouter le site

1. Va sur **search.google.com/search-console** et connecte-toi avec ton compte Google.
2. Clique sur **Ajouter une propriété** (en haut à gauche, dans le menu déroulant).
3. Choisis la case de **droite** : **Préfixe de l'URL**.
   ⚠️ Pas la case « Domaine » de gauche : elle ne marche pas pour un site GitHub.
4. Colle exactement cette adresse :
   ```
   https://darknow-coder.github.io/neon-drive/
   ```
5. Clique sur **Continuer**.

## Étape 2 : prouver que le site est à toi

1. Google propose plusieurs méthodes. Ouvre **Balise HTML**.
2. Il affiche une ligne qui ressemble à ça :
   ```
   <meta name="google-site-verification" content="une-longue-suite-de-lettres" />
   ```
3. Clique sur **Copier**, et **envoie-moi cette ligne** dans la conversation.
   (Elle n'est pas secrète : elle sert juste à prouver que tu contrôles le site.)
4. **Ne ferme pas la page de Google.** J'ajoute la ligne au site. Quand je te dis « c'est en ligne »,
   reviens sur la page et clique sur **Valider**.

## Étape 3 : donner le plan du site

Une fois validé :

1. Dans le menu de gauche, clique sur **Sitemaps**.
2. Dans « Ajouter un sitemap », écris : `sitemap.xml`
3. Clique sur **Envoyer**.

## Étape 4 : demander à Google de passer tout de suite

1. Tout en haut, dans la barre « Inspecter n'importe quelle URL », colle :
   `https://darknow-coder.github.io/neon-drive/`
2. Attends le résultat, puis clique sur **Demander une indexation**.
3. Recommence avec la version anglaise : `https://darknow-coder.github.io/neon-drive/en/`

C'est fini ! Les premiers résultats apparaissent en général après quelques jours.
Dans **Performances**, tu verras combien de fois le site s'affiche dans Google, et combien de clics il reçoit.

## Pour monter plus haut dans Google

Google fait davantage confiance à un site quand d'autres sites parlent de lui. Ce qui aide :
- mettre le lien du site dans la description de ta page itch.io ;
- le mettre dans la bio de tes réseaux, et sur ta chaîne YouTube si tu en ouvres une ;
- chaque fois que quelqu'un parle du jeu (forum, Discord, article), qu'il donne ce lien.
