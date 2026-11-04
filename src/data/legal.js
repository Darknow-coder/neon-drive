// Textes légaux : politique de confidentialité, conditions d'utilisation, mentions légales.
// Affichés dans le jeu (Réglages → Compte) et sur la page legal.html.
// ⚠ À relire si le jeu change (nouvelles données collectées, publicité, achats…).

// Contact pour toute question ou demande sur les données (null = page GitHub du jeu)
export const LEGAL_CONTACT = 'neon.drive.support@gmail.com';
import { LANG } from '../i18n/index.js';

export const LEGAL_UPDATED = LANG === 'en' ? 'November 4, 2026' : '4 novembre 2026';
const REPO = 'https://github.com/Darknow-coder/neon-drive';

const contact = () => (LEGAL_CONTACT
  ? `par e-mail : <a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a>`
  : `en ouvrant un message (« issue ») sur la <a href="${REPO}/issues" target="_blank" rel="noopener">page GitHub du jeu</a> (attention : ces messages sont publics, n'y écris aucune information personnelle)`);

const LEGAL_FR = {
  privacy: {
    title: 'POLITIQUE DE CONFIDENTIALITÉ',
    html: () => `
<p class="lg-lead">En bref : NEON//DRIVE ne demande <b>ni ton nom, ni ton e-mail, ni ton numéro</b>. Il n'y a <b>aucune publicité</b>, <b>aucun pistage</b> et <b>aucune revente</b> de données. Seul ce qui est nécessaire au classement et aux amis est envoyé en ligne, et tu peux tout effacer en un bouton.</p>

<h3>1. Qui est responsable ?</h3>
<p>Le jeu NEON//DRIVE est développé par un particulier (« l'éditeur », pseudonyme <b>Darknow</b>). Pour toute question ou demande, contacte-le ${contact()}.</p>

<h3>2. Données gardées sur ton appareil</h3>
<p>Ta progression (trophées, voitures, crédits, réglages, statistiques…) est enregistrée <b>uniquement dans ton navigateur</b> (stockage local). Elle ne quitte pas ton appareil, sauf si tu l'exportes toi-même avec un code de sauvegarde. Le jeu n'utilise <b>aucun cookie publicitaire ni de mesure d'audience</b> : le stockage local sert seulement à faire fonctionner le jeu.</p>

<h3>3. Données envoyées en ligne (classements et amis)</h3>
<p>Quand tu es connecté à internet, le jeu crée automatiquement un <b>compte anonyme</b> (un identifiant aléatoire, sans e-mail ni mot de passe) et envoie au serveur :</p>
<ul>
<li>ton <b>pseudo</b> et son numéro (ex. #4821), ton emblème, sa couleur, ton titre et ta voiture ;</li>
<li>tes <b>trophées</b> (actuels et record), ton nombre de courses et de victoires ;</li>
<li>ton <b>code ami</b> et la liste de tes amis et demandes d'amis ;</li>
<li>tes <b>records du contre-la-montre</b> : ton meilleur temps sur chaque circuit, la voiture et ses couleurs, et la <b>trajectoire de ce tour</b> (le « fantôme » : positions de la voiture sur la piste) ;</li>
<li>la date de création du profil et de la dernière mise à jour.</li>
</ul>
<p><b>Ce qui est public</b> : pseudo, numéro, emblème, titre, voiture, trophées, courses, victoires et la date de ta dernière partie sont visibles par les autres joueurs dans le classement. Tes records du chrono et leurs fantômes sont aussi visibles : les autres joueurs peuvent courir contre ton fantôme. Ton code ami n'est visible que par tes amis. <b>Ne mets pas ton vrai nom dans ton pseudo.</b></p>
<p>Comme pour tout site internet, l'<b>adresse IP</b> de ton appareil est vue techniquement par les serveurs lors des connexions (elle peut apparaître dans les journaux de sécurité de l'hébergeur), mais elle n'est pas utilisée par le jeu.</p>

<h3>4. Pourquoi ?</h3>
<p>Ces données servent uniquement à faire fonctionner les classements (trophées et chrono), les fantômes, les amis et l'anti-triche (vérifier qu'une progression est possible). La base légale est l'<b>exécution du service</b> que tu demandes en utilisant ces fonctions, et l'<b>intérêt légitime</b> à garder un classement honnête.</p>

<h3>5. Qui y a accès ?</h3>
<ul>
<li><b>Supabase</b> (base de données et comptes anonymes), qui stocke les données en ligne pour le compte de l'éditeur, sur des serveurs situés à <b>Francfort (Allemagne)</b>, dans l'Union européenne ;</li>
<li><b>GitHub Pages</b> (hébergement du site), qui reçoit les adresses IP des visiteurs pour afficher les pages ;</li>
<li>les autres joueurs, pour les informations publiques listées ci-dessus.</li>
</ul>
<p>Les données des classements et des amis restent donc <b>dans l'Union européenne</b>. Ces deux entreprises étant américaines, elles s'engagent à protéger les données selon les règles européennes (clauses contractuelles types). Les polices et images du jeu sont hébergées avec le jeu : aucune donnée n'est envoyée à Google ou à un réseau publicitaire.</p>

<h3>6. Combien de temps ?</h3>
<p>Ton profil en ligne est conservé tant que tu joues. Tu peux le supprimer à tout moment. Les profils inactifs depuis plus de <b>2 ans</b> peuvent être supprimés. Les données sur ton appareil restent jusqu'à ce que tu les effaces (Réglages → Compte, ou en vidant les données du navigateur).</p>

<h3>7. Tes droits</h3>
<p>Tu peux à tout moment, directement dans le jeu (<b>Réglages → Compte</b>) :</p>
<ul>
<li><b>voir et télécharger</b> tes données en ligne (« MES DONNÉES EN LIGNE ») ;</li>
<li><b>corriger</b> ton pseudo et ton emblème ;</li>
<li><b>supprimer</b> ton profil en ligne, tes amitiés et tes records du chrono (« SUPPRIMER MON PROFIL EN LIGNE ») ;</li>
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

// ---------------------------------------------------------------- English
const contactEn = () => (LEGAL_CONTACT
  ? `by email: <a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a>`
  : `by opening an “issue” on the <a href="${REPO}/issues" target="_blank" rel="noopener">game's GitHub page</a> (careful: these messages are public, do not write any personal information there)`);

const LEGAL_EN = {
  privacy: {
    title: 'PRIVACY POLICY',
    html: () => `
<p class="lg-lead">In short: NEON//DRIVE asks for <b>neither your name, nor your email, nor your phone number</b>. There are <b>no ads</b>, <b>no tracking</b> and <b>no selling</b> of data. Only what is needed for the leaderboards and friends is sent online, and you can erase everything with one button.</p>

<h3>1. Who is responsible?</h3>
<p>NEON//DRIVE is developed by a private individual (“the publisher”, pseudonym <b>Darknow</b>). For any question or request, contact them ${contactEn()}.</p>

<h3>2. Data kept on your device</h3>
<p>Your progress (trophies, cars, credits, settings, statistics…) is stored <b>only in your browser</b> (local storage). It never leaves your device, unless you export it yourself with a save code. The game uses <b>no advertising or analytics cookies</b>: local storage is only used to make the game work.</p>

<h3>3. Data sent online (leaderboards and friends)</h3>
<p>When you are connected to the internet, the game automatically creates an <b>anonymous account</b> (a random identifier, with no email or password) and sends the server:</p>
<ul>
<li>your <b>nickname</b> and its number (e.g. #4821), your emblem, its color, your title and your car;</li>
<li>your <b>trophies</b> (current and best), your number of races and wins;</li>
<li>your <b>friend code</b> and your list of friends and friend requests;</li>
<li>your <b>time trial records</b>: your best time on each track, the car and its colors, and the <b>trajectory of that lap</b> (the “ghost”: the car's positions on the track);</li>
<li>the date the profile was created and last updated.</li>
</ul>
<p><b>What is public</b>: nickname, number, emblem, title, car, trophies, races, wins and the date of your last game are visible to other players on the leaderboard. Your time trial records and their ghosts are also visible: other players can race against your ghost. Your friend code is only visible to your friends. <b>Do not put your real name in your nickname.</b></p>
<p>As with any website, your device's <b>IP address</b> is technically seen by the servers during connections (it may appear in the host's security logs), but the game does not use it.</p>

<h3>4. Why?</h3>
<p>This data is only used to run the leaderboards (trophies and time trial), the ghosts, the friends feature and anti-cheat (checking that progress is possible). The legal basis is the <b>performance of the service</b> you request by using these features, and the <b>legitimate interest</b> in keeping the leaderboard fair.</p>

<h3>5. Who has access?</h3>
<ul>
<li><b>Supabase</b> (database and anonymous accounts), which stores the online data on behalf of the publisher, on servers located in <b>Frankfurt (Germany)</b>, in the European Union;</li>
<li><b>GitHub Pages</b> (website hosting), which receives visitors' IP addresses to display the pages;</li>
<li>other players, for the public information listed above.</li>
</ul>
<p>The leaderboard and friends data therefore stays <b>in the European Union</b>. As both companies are American, they commit to protecting data according to European rules (standard contractual clauses). The game's fonts and images are hosted with the game: no data is sent to Google or to any advertising network.</p>

<h3>6. How long?</h3>
<p>Your online profile is kept as long as you play. You can delete it at any time. Profiles inactive for more than <b>2 years</b> may be deleted. The data on your device stays until you erase it (Settings → Account, or by clearing your browser data).</p>

<h3>7. Your rights</h3>
<p>At any time, directly in the game (<b>Settings → Account</b>), you can:</p>
<ul>
<li><b>view and download</b> your online data (“MY ONLINE DATA”);</li>
<li><b>correct</b> your nickname and emblem;</li>
<li><b>delete</b> your online profile, your friendships and your time trial records (“DELETE MY ONLINE PROFILE”);</li>
<li><b>erase</b> your progress on the device.</li>
</ul>
<p>You can also contact the publisher (see point 1), and if you believe your rights are not respected, file a complaint with the French data protection authority, the <b>CNIL</b> (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>), or your own country's authority.</p>

<h3>8. Young players</h3>
<p>The game asks for no information that could identify you. If you are <b>under 15</b>, talk to your parents before using the leaderboard and friends. Parents can delete the online profile at any time from the Settings.</p>

<h3>9. Changes</h3>
<p>This policy may change (for example if new online features appear). The update date is shown at the bottom. This English version is provided for convenience; in case of disagreement, the French version prevails. Last updated: <b>${LEGAL_UPDATED}</b>.</p>`,
  },

  terms: {
    title: 'TERMS OF USE',
    html: () => `
<p class="lg-lead">In short: the game is <b>free</b>, with no real-money purchases. Play fair: no offensive nicknames, no cheating.</p>

<h3>1. The game</h3>
<p>NEON//DRIVE is a free racing game playable in a browser. By using it, you accept these terms. If you do not accept them, do not use the game.</p>

<h3>2. Free, no real money</h3>
<p>The game is entirely free. Credits, packs, fragments, cars and items can only be obtained by playing: they <b>have no real-money value</b>, cannot be bought, sold or traded, and may be changed in updates (balancing).</p>

<h3>3. Your nickname and behavior</h3>
<p>Your nickname is visible to other players. It is forbidden to use a nickname that is offensive, hateful, sexual, impersonates someone else or contains personal information (real name, address, phone…). A filter blocks forbidden words; the publisher may also rename or delete a profile that does not follow these rules.</p>

<h3>4. No cheating</h3>
<p>It is forbidden to modify the game, the save or the exchanges with the server to obtain trophies or advantages, to use automated programs, or to attack the server. Impossible progress is automatically rejected, and cheating profiles may be removed from the leaderboard or deleted.</p>

<h3>5. Availability</h3>
<p>The game is provided “as is”, without warranty. The publisher does their best but cannot promise it will always work without bugs or that the online features will always be available. Remember to <b>export your save</b> from time to time (Settings → Account): lost progress (cleared browser, new device…) cannot be recovered by the publisher. The game may evolve, be modified or be discontinued.</p>

<h3>6. Ownership</h3>
<p>The game, its tracks, cars, music, images and texts are original creations of the publisher. You may play freely and share screenshots and videos; you may not copy them or resell them as your own.</p>

<h3>7. Responsibility</h3>
<p>Play sensibly: take breaks. If you are sensitive to flashing lights, turn on “Reduce flashes” (Settings → Display). The publisher cannot be held responsible for misuse of the game.</p>

<h3>8. Changes and governing law</h3>
<p>These terms may be changed; the update date is shown at the bottom. They are governed by French law. This English version is provided for convenience; in case of disagreement, the French version prevails. Last updated: <b>${LEGAL_UPDATED}</b>.</p>`,
  },

  legal: {
    title: 'LEGAL NOTICE',
    html: () => `
<h3>Publisher</h3>
<p>NEON//DRIVE is a personal, non-commercial project, published by a private individual under the pseudonym <b>Darknow</b>. As French law (LCEN, article 6 III-2) allows for non-professional publishers, their identity is known to the host and is not published. Contact: ${contactEn()}.</p>

<h3>Website hosting</h3>
<p><b>GitHub Pages</b> — GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, United States — <a href="https://github.com" target="_blank" rel="noopener">github.com</a>.</p>

<h3>Database (leaderboards and friends)</h3>
<p><b>Supabase</b> — Supabase, Inc., San Francisco, United States — servers located in Frankfurt (Germany) — <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a>.</p>

<h3>Credits</h3>
<p>Game, tracks, cars, music and sound effects: original creations (the music and sounds are generated by the game itself). Fonts: <b>Orbitron</b> and <b>Rajdhani</b>, under the free SIL Open Font License, embedded in the game.</p>
<p>Source code: <a href="${REPO}" target="_blank" rel="noopener">${REPO.replace('https://', '')}</a>.</p>`,
  },
};

export const LEGAL = LANG === 'en' ? LEGAL_EN : LEGAL_FR;
