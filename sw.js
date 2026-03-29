const CACHE_NAME = 'mashawiri-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/animations.css',
  '/icon.png',
  '/js/main.js',
  '/js/config.js',
  '/js/state.js',
  '/js/db.js',
  '/js/render.js',
  '/js/templates.js',
  '/js/actions.js',
  '/js/tree.js',
  '/js/helpers.js',
  '/js/constants.js',
  '/js/accounting.js',
  '/js/filters.js',
  '/js/forms.js',
  '/js/ui_core.js',
  '/js/reports.js',
  '/js/export_import.js',
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
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((networkResponse) => {
         // Optionally cache new requests here
         return networkResponse;
      });
    })
  );
});
