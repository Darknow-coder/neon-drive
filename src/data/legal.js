// Textes légaux : politique de confidentialité, conditions d'utilisation, mentions légales.
// Affichés dans le jeu (Réglages → Compte) et sur la page legal.html.
// ⚠ À relire si le jeu change (nouvelles données collectées, publicité, achats…).

// Contact pour toute question ou demande sur les données (null = page GitHub du jeu)
export const LEGAL_CONTACT = 'neon.drive.support@gmail.com';
export const LEGAL_UPDATED = '4 novembre 2026';
const REPO = 'https://github.com/Darknow-coder/neon-drive';

const contact = () => (LEGAL_CONTACT
  ? `par e-mail : <a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a>`
  : `en ouvrant un message (« issue ») sur la <a href="${REPO}/issues" target="_blank" rel="noopener">page GitHub du jeu</a> (attention : ces messages sont publics, n'y écris aucune information personnelle)`);

export const LEGAL = {
  privacy: {
    title: 'POLITIQUE DE CONFIDENTIALITÉ',
    html: () => `
<p class="lg-lead">En bref : NEON//DRIVE ne demande <b>ni ton nom, ni ton e-mail, ni ton numéro</b>. Il n'y a <b>aucune publicité</b>, <b>aucun pistage</b> et <b>aucune revente</b> de données. Seul ce qui est nécessaire au classement et aux amis est envoyé en ligne, et tu peux tout effacer en un bouton.</p>

<h3>1. Qui est responsable ?</h3>
<p>Le jeu NEON//DRIVE est développé par un particulier (« l'éditeur », pseudonyme <b>Darknow</b>). Pour toute question ou demande, contacte-le ${contact()}.</p>

<h3>2. Données gardées sur ton appareil</h3>
<p>Ta progression (trophées, voitures, crédits, réglages, statistiques…) est enregistrée <b>uniquement dans ton navigateur</b> (stockage local). Elle ne quitte pas ton appareil, sauf si tu l'exportes toi-même avec un code de sauvegarde. Le jeu n'utilise <b>aucun cookie publicitaire ni de mesure d'audience</b> : le stockage local sert seulement à faire fonctionner le jeu.</p>

<h3>3. Données envoyées en ligne (classement et amis)</h3>
<p>Quand tu es connecté à internet, le jeu crée automatiquement un <b>compte anonyme</b> (un identifiant aléatoire, sans e-mail ni mot de passe) et envoie au serveur :</p>
<ul>
<li>ton <b>pseudo</b> et son numéro (ex. #4821), ton emblème, sa couleur, ton titre et ta voiture ;</li>
<li>tes <b>trophées</b> (actuels et record), ton nombre de courses et de victoires ;</li>
<li>ton <b>code ami</b> et la liste de tes amis et demandes d'amis ;</li>
<li>la date de création du profil et de la dernière mise à jour.</li>
</ul>
<p><b>Ce qui est public</b> : pseudo, numéro, emblème, titre, voiture, trophées, courses, victoires et la date de ta dernière partie sont visibles par les autres joueurs dans le classement. Ton code ami n'est visible que par tes amis. <b>Ne mets pas ton vrai nom dans ton pseudo.</b></p>
<p>Comme pour tout site internet, l'<b>adresse IP</b> de ton appareil est vue techniquement par les serveurs lors des connexions (elle peut apparaître dans les journaux de sécurité de l'hébergeur), mais elle n'est pas utilisée par le jeu.</p>

<h3>4. Pourquoi ?</h3>
<p>Ces données servent uniquement à faire fonctionner le classement, les amis et l'anti-triche (vérifier qu'une progression est possible). La base légale est l'<b>exécution du service</b> que tu demandes en utilisant ces fonctions, et l'<b>intérêt légitime</b> à garder un classement honnête.</p>

<h3>5. Qui y a accès ?</h3>
<ul>
<li><b>Supabase</b> (base de données et comptes anonymes), qui stocke les données en ligne pour le compte de l'éditeur, sur des serveurs situés à <b>Francfort (Allemagne)</b>, dans l'Union européenne ;</li>
<li><b>GitHub Pages</b> (hébergement du site), qui reçoit les adresses IP des visiteurs pour afficher les pages ;</li>
<li>les autres joueurs, pour les informations publiques listées ci-dessus.</li>
</ul>
<p>Les données du classement et des amis restent donc <b>dans l'Union européenne</b>. Ces deux entreprises étant américaines, elles s'engagent à protéger les données selon les règles européennes (clauses contractuelles types). Les polices et images du jeu sont hébergées avec le jeu : aucune donnée n'est envoyée à Google ou à un réseau publicitaire.</p>

<h3>6. Combien de temps ?</h3>
<p>Ton profil en ligne est conservé tant que tu joues. Tu peux le supprimer à tout moment. Les profils inactifs depuis plus de <b>2 ans</b> peuvent être supprimés. Les données sur ton appareil restent jusqu'à ce que tu les effaces (Réglages → Compte, ou en vidant les données du navigateur).</p>

<h3>7. Tes droits</h3>
<p>Tu peux à tout moment, directement dans le jeu (<b>Réglages → Compte</b>) :</p>
<ul>
<li><b>voir et télécharger</b> tes données en ligne (« MES DONNÉES EN LIGNE ») ;</li>
<li><b>corriger</b> ton pseudo et ton emblème ;</li>
<li><b>supprimer</b> ton profil en ligne et tes amitiés (« SUPPRIMER MON PROFIL EN LIGNE ») ;</li>
<li><b>effacer</b> ta progression sur l'appareil.</li>
</ul>
<p>Tu peux aussi contacter l'éditeur (voir point 1), et si tu estimes que tes droits ne sont pas respectés, saisir la <b>CNIL</b> (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).</p>

<h3>8. Les jeunes joueurs</h3>
<p>Le jeu ne demande aucune information permettant de savoir qui tu es. Si tu as <b>moins de 15 ans</b>, parles-en à tes parents avant d'utiliser le classement et les amis. Les parents peuvent supprimer le profil en ligne à tout moment depuis les Réglages.</p>

<h3>9. Changements</h3>
<p>Cette politique peut évoluer (par exemple si de nouvelles fonctions en ligne apparaissent). La date de mise à jour est indiquée en bas. Dernière mise à jour : <b>${LEGAL_UPDATED}</b>.</p>`,
  },

  terms: {
    title: 'CONDITIONS D\'UTILISATION',
    html: () => `
<p class="lg-lead">En bref : le jeu est <b>gratuit</b>, sans achat avec de l'argent réel. Sois fair-play : pas de pseudo insultant, pas de triche.</p>

<h3>1. Le jeu</h3>
<p>NEON//DRIVE est un jeu de course gratuit, jouable dans un navigateur. En l'utilisant, tu acceptes ces conditions. Si tu ne les acceptes pas, n'utilise pas le jeu.</p>

<h3>2. Gratuit, sans argent réel</h3>
<p>Le jeu est entièrement gratuit. Les crédits, packs, fragments, voitures et objets s'obtiennent seulement en jouant : ils <b>n'ont aucune valeur en argent réel</b>, ne peuvent pas être achetés, vendus ou échangés, et peuvent être modifiés lors des mises à jour (équilibrage).</p>

<h3>3. Ton pseudo et ton comportement</h3>
<p>Ton pseudo est visible par les autres joueurs. Il est interdit d'utiliser un pseudo insultant, haineux, sexuel, qui se fait passer pour quelqu'un d'autre ou qui contient des informations personnelles (vrai nom, adresse, téléphone…). Un filtre bloque les mots interdits ; l'éditeur peut aussi renommer ou supprimer un profil qui ne respecte pas ces règles.</p>

<h3>4. Pas de triche</h3>
<p>Il est interdit de modifier le jeu, la sauvegarde ou les échanges avec le serveur pour obtenir des trophées ou des avantages, d'utiliser des programmes automatiques, ou d'attaquer le serveur. Les progressions impossibles sont refusées automatiquement, et les profils tricheurs peuvent être retirés du classement ou supprimés.</p>

<h3>5. Disponibilité</h3>
<p>Le jeu est fourni « tel quel », sans garantie. L'éditeur fait de son mieux mais ne peut pas promettre qu'il fonctionnera toujours sans bug ou que les fonctions en ligne seront toujours disponibles. Pense à <b>exporter ta sauvegarde</b> de temps en temps (Réglages → Compte) : une progression perdue (navigateur vidé, appareil changé…) ne peut pas être récupérée par l'éditeur. Le jeu peut évoluer, être modifié ou arrêté.</p>

<h3>6. Propriété</h3>
<p>Le jeu, ses circuits, voitures, musiques, images et textes sont des créations originales de l'éditeur. Tu peux y jouer librement et partager des captures d'écran et vidéos ; tu ne peux pas les copier ou les revendre comme s'ils étaient à toi.</p>

<h3>7. Responsabilité</h3>
<p>Joue raisonnablement : fais des pauses. Si tu es sensible aux lumières clignotantes, active « Réduire les flashs » (Réglages → Affichage). L'éditeur ne peut pas être tenu responsable d'une mauvaise utilisation du jeu.</p>

<h3>8. Changements et droit applicable</h3>
<p>Ces conditions peuvent être modifiées ; la date de mise à jour est indiquée en bas. Elles sont soumises au droit français. Dernière mise à jour : <b>${LEGAL_UPDATED}</b>.</p>`,
  },

  legal: {
    title: 'MENTIONS LÉGALES',
    html: () => `
<h3>Éditeur</h3>
<p>NEON//DRIVE est un projet personnel non commercial, édité par un particulier sous le pseudonyme <b>Darknow</b>. Comme le permet la loi pour la confiance dans l'économie numérique (article 6 III-2) aux éditeurs non professionnels, son identité est connue de l'hébergeur et n'est pas publiée. Contact : ${contact()}.</p>

<h3>Hébergement du site</h3>
<p><b>GitHub Pages</b> — GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis — <a href="https://github.com" target="_blank" rel="noopener">github.com</a>.</p>

<h3>Base de données (classement et amis)</h3>
<p><b>Supabase</b> — Supabase, Inc., San Francisco, États-Unis — serveurs situés à Francfort (Allemagne) — <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</p>

<h3>Crédits</h3>
<p>Jeu, circuits, voitures, musiques et effets sonores : créations originales (la musique et les sons sont générés par le jeu lui-même). Polices : <b>Orbitron</b> et <b>Rajdhani</b>, sous licence libre SIL Open Font License, intégrées au jeu.</p>
<p>Code source : <a href="${REPO}" target="_blank" rel="noopener">${REPO.replace('https://', '')}</a>.</p>`,
  },
};
