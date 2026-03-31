const CACHE_VERSION = 'v4.3-2026-03-31T11:53'; // Timestamp for cache busting
const CACHE_NAME = 'mashawiri-' + CACHE_VERSION;
const ASSETS = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './animations.css',
  './icon.png',
  './js/main.js',
  './js/config.js',
  './js/state.js',
  './js/db.js',
  './js/render.js',
  './js/templates.js',
  './js/actions.js',
  './js/tree.js',
  './js/helpers.js',
  './js/constants.js',
  './js/accounting.js',
  './js/filters.js',
  './js/forms.js',
  './js/ui_core.js',
  './js/reports.js',
  './js/export_import.js',
  'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Navigation strategy: Network-First, then Offline Fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('./offline.html');
      })
    );
    return;
  }

  // Assets strategy: Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      });
      return cachedResponse || fetchPromise;
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
