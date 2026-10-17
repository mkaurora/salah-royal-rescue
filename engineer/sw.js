/* Service worker: precaches the whole game so it works fully offline. */
'use strict';
var CACHE = 'engineer-v1';
var PRECACHE = [
  /* PRECACHE:START */
  './',
  './css/bridges.css',
  './css/circuits.css',
  './css/machines.css',
  './css/robot.css',
  './css/style.css',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/core/app.js',
  './js/core/audio.js',
  './js/core/buddy.js',
  './js/core/ui.js',
  './js/data/bridges-content.js',
  './js/data/bridges-levels.js',
  './js/data/circuits-content.js',
  './js/data/circuits-levels.js',
  './js/data/machines-content.js',
  './js/data/machines-levels.js',
  './js/data/robot-content.js',
  './js/data/robot-levels.js',
  './js/logic/bridges.js',
  './js/logic/circuits.js',
  './js/logic/machines.js',
  './js/logic/robot.js',
  './js/logic/save.js',
  './js/views/bridges-view.js',
  './js/views/circuits-view.js',
  './js/views/machines-view.js',
  './js/views/practice-view.js',
  './js/views/robot-view.js',
  './manifest.webmanifest'
  /* PRECACHE:END */
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(PRECACHE); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('engineer-') === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === 'basic') {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
