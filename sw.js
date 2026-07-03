/* skoffroad — service worker
   Lightweight offline app-shell. Strategy:
     · HTML (navigations)  → network-first, fall back to cache, then offline shell
     · static assets       → cache-first, revalidate in the background
   Bumping CACHE invalidates the old shell on the next visit. No external hosts
   are cached (fonts / GitHub API always go straight to the network). */

const CACHE = 'skoffroad-v2';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'script.js',
  'assets/penguin-mascot.svg',
  'assets/favicon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only handle same-origin requests; let the network own everything else
  // (Google Fonts, the GitHub releases API, the play. subdomain, …).
  if (url.origin !== self.location.origin) return;

  // Network-first for navigations / HTML so content stays fresh.
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('index.html')))
    );
    return;
  }

  // Cache-first for static assets, with a quiet background refresh.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
