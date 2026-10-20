/* Service worker: precaches the game shell (+ the first voice clips) so it works fully offline.
 * Other voice clips are cached the first time they are played. */
'use strict';
var BUILD = 'd59f4386a0';   // written by tools/build-sw.js (hash of all precached files)
var CACHE = 'engineer-v3-' + BUILD;
var PRECACHE = [
  /* PRECACHE:START */
  './',
  './audio/voice/groups.json',
  './audio/voice/manifest.json',
  './css/bridges.css',
  './css/circuits.css',
  './css/construction.css',
  './css/machines.css',
  './css/parent.css',
  './css/robot.css',
  './css/style.css',
  './css/weekly.css',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/core/ai-demo.js',
  './js/core/app.js',
  './js/core/audio.js',
  './js/core/buddy.js',
  './js/core/helper-talk.js',
  './js/core/ui.js',
  './js/core/updater.js',
  './js/core/voice-key.js',
  './js/data/bridges-content.js',
  './js/data/bridges-levels.js',
  './js/data/circuits-content.js',
  './js/data/circuits-levels.js',
  './js/data/construction-content.js',
  './js/data/construction-levels.js',
  './js/data/machines-content.js',
  './js/data/machines-levels.js',
  './js/data/robot-content.js',
  './js/data/robot-levels.js',
  './js/data/weekly-projects.js',
  './js/logic/bridges.js',
  './js/logic/circuits.js',
  './js/logic/construction.js',
  './js/logic/machines.js',
  './js/logic/robot.js',
  './js/logic/save.js',
  './js/logic/weekly.js',
  './js/views/bridges-view.js',
  './js/views/circuits-view.js',
  './js/views/construction-view.js',
  './js/views/machines-view.js',
  './js/views/parent.js',
  './js/views/practice-view.js',
  './js/views/robot-view.js',
  './js/views/weekly-hub.js',
  './manifest.webmanifest',
  './audio/voice/02524221.mp3',
  './audio/voice/055bfeae.mp3',
  './audio/voice/0641a7b2.mp3',
  './audio/voice/0937347d.mp3',
  './audio/voice/0a787e78.mp3',
  './audio/voice/0b38321b.mp3',
  './audio/voice/0de26908.mp3',
  './audio/voice/0e67b48c.mp3',
  './audio/voice/105d34e1.mp3',
  './audio/voice/115eb018.mp3',
  './audio/voice/11a10b8c.mp3',
  './audio/voice/130f9b70.mp3',
  './audio/voice/135e66d0.mp3',
  './audio/voice/139e0ab6.mp3',
  './audio/voice/14c6b7a3.mp3',
  './audio/voice/14d4b610.mp3',
  './audio/voice/158efe2f.mp3',
  './audio/voice/159c975f.mp3',
  './audio/voice/18d6e84a.mp3',
  './audio/voice/1cf20383.mp3',
  './audio/voice/1dc3dd15.mp3',
  './audio/voice/1f3dccff.mp3',
  './audio/voice/21e32a84.mp3',
  './audio/voice/24246dd4.mp3',
  './audio/voice/25ef9c81.mp3',
  './audio/voice/28706c4f.mp3',
  './audio/voice/2b06d991.mp3',
  './audio/voice/2bc967d6.mp3',
  './audio/voice/2d95d4e1.mp3',
  './audio/voice/2eb89c6e.mp3',
  './audio/voice/2ee924e5.mp3',
  './audio/voice/3a584cd7.mp3',
  './audio/voice/3b7b6883.mp3',
  './audio/voice/3e101376.mp3',
  './audio/voice/3e7d4c1f.mp3',
  './audio/voice/3ee1b545.mp3',
  './audio/voice/43ff499d.mp3',
  './audio/voice/4715a5f1.mp3',
  './audio/voice/49a22c1e.mp3',
  './audio/voice/4a0c5807.mp3',
  './audio/voice/4a4be4f8.mp3',
  './audio/voice/51ed9b2b.mp3',
  './audio/voice/5260ddca.mp3',
  './audio/voice/52f21997.mp3',
  './audio/voice/54b805e1.mp3',
  './audio/voice/55156030.mp3',
  './audio/voice/554cba6a.mp3',
  './audio/voice/584def4f.mp3',
  './audio/voice/58bca755.mp3',
  './audio/voice/5f5e8cdc.mp3',
  './audio/voice/5fd0fafc.mp3',
  './audio/voice/5ff61d2c.mp3',
  './audio/voice/61040b5c.mp3',
  './audio/voice/6135f23b.mp3',
  './audio/voice/62b43b9d.mp3',
  './audio/voice/6305e5f2.mp3',
  './audio/voice/64286d7f.mp3',
  './audio/voice/6674a50d.mp3',
  './audio/voice/6735ed22.mp3',
  './audio/voice/67932138.mp3',
  './audio/voice/68bbe65b.mp3',
  './audio/voice/698af710.mp3',
  './audio/voice/6adb92bb.mp3',
  './audio/voice/6bf401ca.mp3',
  './audio/voice/70e8efaf.mp3',
  './audio/voice/70ea334a.mp3',
  './audio/voice/72505f73.mp3',
  './audio/voice/7314f366.mp3',
  './audio/voice/7550309e.mp3',
  './audio/voice/792e2aed.mp3',
  './audio/voice/79b22305.mp3',
  './audio/voice/7a09ca04.mp3',
  './audio/voice/7cc69d74.mp3',
  './audio/voice/7f0ba9e5.mp3',
  './audio/voice/8054ce7c.mp3',
  './audio/voice/83b43711.mp3',
  './audio/voice/88cf2938.mp3',
  './audio/voice/89469816.mp3',
  './audio/voice/89d4cfec.mp3',
  './audio/voice/8aaadd1b.mp3',
  './audio/voice/8acd2f16.mp3',
  './audio/voice/8c22885b.mp3',
  './audio/voice/8db31306.mp3',
  './audio/voice/8ddc05ee.mp3',
  './audio/voice/8f7b873e.mp3',
  './audio/voice/92e297a1.mp3',
  './audio/voice/9652e04f.mp3',
  './audio/voice/982842d9.mp3',
  './audio/voice/99339583.mp3',
  './audio/voice/9a32258f.mp3',
  './audio/voice/9bff803f.mp3',
  './audio/voice/9e1ac1b8.mp3',
  './audio/voice/9ed878b4.mp3',
  './audio/voice/9ee832d4.mp3',
  './audio/voice/a1b57993.mp3',
  './audio/voice/a20abf3c.mp3',
  './audio/voice/a2189c10.mp3',
  './audio/voice/a30f463e.mp3',
  './audio/voice/a3bb55c0.mp3',
  './audio/voice/a3dadcef.mp3',
  './audio/voice/a56bfc6c.mp3',
  './audio/voice/a77465c9.mp3',
  './audio/voice/a794d058.mp3',
  './audio/voice/a7b33dca.mp3',
  './audio/voice/a8f22d22.mp3',
  './audio/voice/a991c6e0.mp3',
  './audio/voice/ac556a7a.mp3',
  './audio/voice/acae96d1.mp3',
  './audio/voice/acd5b4ae.mp3',
  './audio/voice/adbca763.mp3',
  './audio/voice/ae43bf63.mp3',
  './audio/voice/ae8b6475.mp3',
  './audio/voice/aea9df9e.mp3',
  './audio/voice/af540da6.mp3',
  './audio/voice/b0d931d3.mp3',
  './audio/voice/b1885305.mp3',
  './audio/voice/b315d4ad.mp3',
  './audio/voice/b35fde24.mp3',
  './audio/voice/b537e555.mp3',
  './audio/voice/b556c29a.mp3',
  './audio/voice/b70ec9a4.mp3',
  './audio/voice/bd35a94f.mp3',
  './audio/voice/be705010.mp3',
  './audio/voice/c15dd94b.mp3',
  './audio/voice/c2ebe542.mp3',
  './audio/voice/c914647b.mp3',
  './audio/voice/c931e0d3.mp3',
  './audio/voice/c9af921c.mp3',
  './audio/voice/c9c43a21.mp3',
  './audio/voice/cb4913b5.mp3',
  './audio/voice/ce660834.mp3',
  './audio/voice/cf30aad7.mp3',
  './audio/voice/d076615b.mp3',
  './audio/voice/d2323623.mp3',
  './audio/voice/d37bc910.mp3',
  './audio/voice/d3a16587.mp3',
  './audio/voice/d489a68b.mp3',
  './audio/voice/d545b330.mp3',
  './audio/voice/d6a295e5.mp3',
  './audio/voice/e1e0a1fe.mp3',
  './audio/voice/e37ceff6.mp3',
  './audio/voice/e38a5293.mp3',
  './audio/voice/e3a6af0f.mp3',
  './audio/voice/e4b02620.mp3',
  './audio/voice/e4c9f013.mp3',
  './audio/voice/e4f8c0f5.mp3',
  './audio/voice/e5b2a8c9.mp3',
  './audio/voice/e660a848.mp3',
  './audio/voice/e7e4375a.mp3',
  './audio/voice/e838f9cb.mp3',
  './audio/voice/e8d397bb.mp3',
  './audio/voice/e96bb7e1.mp3',
  './audio/voice/ecbef17d.mp3',
  './audio/voice/f15241ca.mp3',
  './audio/voice/f308102b.mp3',
  './audio/voice/f378957f.mp3',
  './audio/voice/f3e778ed.mp3',
  './audio/voice/f4fd2d28.mp3',
  './audio/voice/f5ae5bf3.mp3',
  './audio/voice/f5b754be.mp3',
  './audio/voice/f70dc8d6.mp3',
  './audio/voice/f91ced66.mp3',
  './audio/voice/f963db76.mp3',
  './audio/voice/fb3e66c9.mp3',
  './audio/voice/fee3e64f.mp3',
  './audio/voice/ffd859b4.mp3'
  /* PRECACHE:END */
];

self.addEventListener('install', function (event) {
  // A new version waits until the player taps "New version! Tap to update" (SKIP_WAITING below), so a level is
  // never cut off. Exceptions: the very first install, and coming from the old v1/v2 game (it has no update banner).
  event.waitUntil(
    caches.keys().then(function (keys) {
      var first = !keys.some(function (k) { return k.indexOf('engineer-') === 0; });
      var legacy = keys.some(function (k) { var m = /^engineer-v(\d+)$/.exec(k); return m && +m[1] < 3; });
      return caches.open(CACHE).then(function (cache) { return cache.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () {
        if (first || legacy) return self.skipWaiting();
      });
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
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
  // The voice clip lists change when new clips ship: network first, cached copy when offline.
  if (/\/audio\/voice\/(manifest|groups)\.json$/.test(url.pathname)) {
    event.respondWith(fetch(req).then(function (res) {
      if (res && res.status === 200) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () { return caches.match(req, { ignoreSearch: true }); }));
    return;
  }
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        // Cache only complete responses: 200 (skip 206 partial/range responses, errors and opaque ones).
        if (res && res.status === 200 && res.type === 'basic') {
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
