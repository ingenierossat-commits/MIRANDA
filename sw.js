/* MIRANDA TE AYUDA · service worker · v1.0
   Subir CACHE en cada despliegue. */
const CACHE = 'mta-v1';
const SHELL = ['./', 'index.html', 'app.js', 'manifest.json', 'ICONS/icon-192.png', 'ICONS/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;

  // Navegación: red primero, con fallback al index.html cacheado (sin exigir URL exacta)
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then(res => {
          const cp = res.clone();
          caches.open(CACHE).then(c => c.put('index.html', cp));
          return res;
        })
        .catch(() => caches.match('index.html', { ignoreSearch: true }).then(m => m || caches.match('./')))
    );
    return;
  }

  // Resto: caché primero
  e.respondWith(
    caches.match(r, { ignoreSearch: true }).then(m => m || fetch(r).then(res => {
      if (res && res.ok && new URL(r.url).origin === location.origin) {
        const cp = res.clone();
        caches.open(CACHE).then(c => c.put(r, cp));
      }
      return res;
    }))
  );
});
