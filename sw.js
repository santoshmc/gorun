/* GoRun — service worker
 * Network-first with a cache fallback: visitors always get the current build,
 * and the app still works with no connection at all.
 * Only active over http(s); the app also runs straight from file:// without it.
 */
var CACHE = 'gorun-v5';

var SHELL = [
  './',
  './index.html',
  './style.css',
  './app.core.js',
  './app.domain.js',
  './app.store.js',
  './app.ui.core.js',
  './app.ui.progress.js',
  './app.ui.social.js',
  './script.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(function (cache) {
        return cache.addAll(SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // Cache-first would pin visitors to whatever build they saw first, so go to
  // the network and keep the cache purely as the offline fallback.
  event.respondWith(
    fetch(request)
      .then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(request).then(function (cached) {
          if (cached) return cached;
          if (request.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
  );
});
