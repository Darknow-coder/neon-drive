// Service worker : permet de jouer hors ligne et d'installer le jeu.
// - Page principale : réseau d'abord (pour avoir la dernière version), cache sinon.
// - Fichiers du jeu (noms uniques à chaque version) : cache d'abord.
// - Polices Google : servies depuis le cache, rafraîchies en arrière-plan.
const CACHE = 'neondrive-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './icon.svg'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (url.origin !== self.location.origin && !isFont) return;
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
