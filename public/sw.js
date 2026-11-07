// Service worker : permet de jouer hors ligne et d'installer le jeu.
// - Pages (présentation, jeu…) : réseau d'abord (pour avoir la dernière version), cache sinon.
// - Fichiers du jeu (noms uniques à chaque version) : cache d'abord.
// - Polices Google : servies depuis le cache, rafraîchies en arrière-plan.
const CACHE = 'neondrive-v3';
const GAME = './';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([GAME, './manifest.webmanifest', './icon.svg'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/** Clé de cache d'une page : son adresse sans les paramètres (?ami=…, ?lang=…). */
const pageKey = (url) => { const u = new URL(url); u.search = ''; u.hash = ''; if (u.pathname.endsWith('/index.html')) u.pathname = u.pathname.slice(0, -10); return u.href; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    const key = pageKey(req.url);
    e.respondWith(
      fetch(req)
        .then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); } return res; })
        // Hors ligne : la page demandée si on l'a, sinon le jeu
        .catch(() => caches.match(key).then((hit) => hit || caches.match(new URL(GAME, self.registration.scope).href))),
    );
    return;
  }

  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (url.origin !== self.location.origin && !isFont) return;
  // Grosses vidéos de la page de présentation : jamais mises en cache
  if (/\.(mp4|webm)$/.test(url.pathname)) return;
  e.respondWith(
    caches.match(req).then((hit) => {
      const update = () => fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      });
      if (!hit) return update();
      if (isFont) update().catch(() => {}); // polices : mise à jour discrète en arrière-plan
      return hit;
    }),
  );
});
