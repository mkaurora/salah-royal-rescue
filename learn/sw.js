/* Service worker (scope: this folder). The app code (HTML, JS, CSS, JSON) is network-first, fetched past the HTTP
 * cache, so an online launch always gets the newest version; the cached copy is used offline or on a very slow
 * network. Voice clips are cache-first (precached common ones, the rest cached the first time they play).
 * A new version waits until the page asks it to take over (postMessage SKIP_WAITING after the kid/parent taps
 * "Update"), so nothing ever reloads in the middle of a level. Only touches caches named learn-*.
 * BUILD changes whenever any app file changes (node tools/build-sw.js), so every deploy is a new SW version. */
'use strict';
var BUILD = '8d5a096f';
var CACHE = 'learn-v3';
var LEGACY = ['learn-v1', 'learn-v2']; // builds without the update banner: take over at once, they cannot ask
var PRECACHE = [
  /* PRECACHE:START */
  './',
  './audio/voice/groups.json',
  './audio/voice/manifest.json',
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
  './js/core/lines.js',
  './js/core/rng.js',
  './js/core/speech.js',
  './js/core/update.js',
  './js/core/voice-key.js',
  './js/data/english.js',
  './js/data/math.js',
  './js/data/science.js',
  './js/logic/codec.js',
  './js/logic/engine.js',
  './js/logic/save.js',
  './js/logic/stuck.js',
  './js/logic/validate.js',
  './js/ui/art.js',
  './js/ui/fx.js',
  './js/ui/mascot.js',
  './js/views/admin.js',
  './js/views/map.js',
  './js/views/menu.js',
  './js/views/play.js',
  './manifest.webmanifest',
  './audio/voice/028f3814.mp3',
  './audio/voice/03c8b60c.mp3',
  './audio/voice/058926da.mp3',
  './audio/voice/05a13365.mp3',
  './audio/voice/0688206c.mp3',
  './audio/voice/0706b1fc.mp3',
  './audio/voice/089299c7.mp3',
  './audio/voice/0fe470de.mp3',
  './audio/voice/120a9bbe.mp3',
  './audio/voice/1231c404.mp3',
  './audio/voice/12a4ded8.mp3',
  './audio/voice/13eb1dac.mp3',
  './audio/voice/14eb1f3f.mp3',
  './audio/voice/16f393f2.mp3',
  './audio/voice/177f9aba.mp3',
  './audio/voice/179dafce.mp3',
  './audio/voice/17a22cfc.mp3',
  './audio/voice/17eb23f8.mp3',
  './audio/voice/18993c37.mp3',
  './audio/voice/18eb258b.mp3',
  './audio/voice/195acd07.mp3',
  './audio/voice/1990e701.mp3',
  './audio/voice/19eb271e.mp3',
  './audio/voice/1aeb28b1.mp3',
  './audio/voice/1beb2a44.mp3',
  './audio/voice/1c9a3408.mp3',
  './audio/voice/1ceb2bd7.mp3',
  './audio/voice/1deb2d6a.mp3',
  './audio/voice/1eeb2efd.mp3',
  './audio/voice/1f52359c.mp3',
  './audio/voice/1fb7728f.mp3',
  './audio/voice/2057b4ca.mp3',
  './audio/voice/2075c9de.mp3',
  './audio/voice/217a9b00.mp3',
  './audio/voice/22871625.mp3',
  './audio/voice/228b9353.mp3',
  './audio/voice/23f95b67.mp3',
  './audio/voice/254d05b9.mp3',
  './audio/voice/25b2e639.mp3',
  './audio/voice/268b35a2.mp3',
  './audio/voice/27214fae.mp3',
  './audio/voice/2a56c50e.mp3',
  './audio/voice/2c1cb9e5.mp3',
  './audio/voice/2c4a3c3c.mp3',
  './audio/voice/2ef08c9a.mp3',
  './audio/voice/300ca0d0.mp3',
  './audio/voice/3038702c.mp3',
  './audio/voice/307b0503.mp3',
  './audio/voice/310ca263.mp3',
  './audio/voice/320ca3f6.mp3',
  './audio/voice/325a3189.mp3',
  './audio/voice/330ca589.mp3',
  './audio/voice/333b87fe.mp3',
  './audio/voice/340ca71c.mp3',
  './audio/voice/3463f201.mp3',
  './audio/voice/350ca8af.mp3',
  './audio/voice/360caa42.mp3',
  './audio/voice/370cabd5.mp3',
  './audio/voice/37283e36.mp3',
  './audio/voice/373c4f68.mp3',
  './audio/voice/3a5ce3a9.mp3',
  './audio/voice/3c0cb3b4.mp3',
  './audio/voice/3d0cb547.mp3',
  './audio/voice/3d38ea81.mp3',
  './audio/voice/3e3d8e3a.mp3',
  './audio/voice/404262a3.mp3',
  './audio/voice/4066f1b4.mp3',
  './audio/voice/41dae095.mp3',
  './audio/voice/44a60afc.mp3',
  './audio/voice/45f2c8ae.mp3',
  './audio/voice/47326247.mp3',
  './audio/voice/479a12a4.mp3',
  './audio/voice/4ba34a44.mp3',
  './audio/voice/4bc9b86c.mp3',
  './audio/voice/4e39486c.mp3',
  './audio/voice/514c5958.mp3',
  './audio/voice/5195269b.mp3',
  './audio/voice/51b641cb.mp3',
  './audio/voice/520f2bfb.mp3',
  './audio/voice/58e8334b.mp3',
  './audio/voice/5ff5196d.mp3',
  './audio/voice/61d241e9.mp3',
  './audio/voice/62634a09.mp3',
  './audio/voice/65c34fde.mp3',
  './audio/voice/678a6d98.mp3',
  './audio/voice/67930eda.mp3',
  './audio/voice/6adeff79.mp3',
  './audio/voice/6b2e8e3c.mp3',
  './audio/voice/6ba57404.mp3',
  './audio/voice/6fc2d441.mp3',
  './audio/voice/7156100e.mp3',
  './audio/voice/728b19d4.mp3',
  './audio/voice/77972ee4.mp3',
  './audio/voice/7986f0c5.mp3',
  './audio/voice/79a505d9.mp3',
  './audio/voice/7e0de249.mp3',
  './audio/voice/824dc6dc.mp3',
  './audio/voice/831de938.mp3',
  './audio/voice/8929971c.mp3',
  './audio/voice/8c559f32.mp3',
  './audio/voice/8dcc1a33.mp3',
  './audio/voice/8df2997f.mp3',
  './audio/voice/905d14af.mp3',
  './audio/voice/90db6246.mp3',
  './audio/voice/91059767.mp3',
  './audio/voice/926e48ac.mp3',
  './audio/voice/92a13795.mp3',
  './audio/voice/93e0b2fa.mp3',
  './audio/voice/95a2f38e.mp3',
  './audio/voice/9766cc54.mp3',
  './audio/voice/97895e96.mp3',
  './audio/voice/9806a052.mp3',
  './audio/voice/996490e3.mp3',
  './audio/voice/99739b6d.mp3',
  './audio/voice/997d3be6.mp3',
  './audio/voice/99962daf.mp3',
  './audio/voice/9bc1526d.mp3',
  './audio/voice/9c429cc5.mp3',
  './audio/voice/9e3c6cd5.mp3',
  './audio/voice/9f5368cf.mp3',
  './audio/voice/9fc34500.mp3',
  './audio/voice/a06178a6.mp3',
  './audio/voice/a1cacdd6.mp3',
  './audio/voice/a1dc426a.mp3',
  './audio/voice/a26e47bf.mp3',
  './audio/voice/a2aacd7c.mp3',
  './audio/voice/a49f8e39.mp3',
  './audio/voice/a755a516.mp3',
  './audio/voice/a99ae749.mp3',
  './audio/voice/ab0dcf23.mp3',
  './audio/voice/ac5208b8.mp3',
  './audio/voice/acc89ed2.mp3',
  './audio/voice/afb0f248.mp3',
  './audio/voice/b1c4a511.mp3',
  './audio/voice/b49e4ef5.mp3',
  './audio/voice/b4b5fe25.mp3',
  './audio/voice/b56ff2a0.mp3',
  './audio/voice/b8795b1d.mp3',
  './audio/voice/bb490827.mp3',
  './audio/voice/bbf22a71.mp3',
  './audio/voice/bc6ab213.mp3',
  './audio/voice/bcc391d3.mp3',
  './audio/voice/bf0368ad.mp3',
  './audio/voice/bf8256ff.mp3',
  './audio/voice/c0843d48.mp3',
  './audio/voice/c10d3d0c.mp3',
  './audio/voice/c25f6f95.mp3',
  './audio/voice/c263ecc3.mp3',
  './audio/voice/c302b431.mp3',
  './audio/voice/c3d79414.mp3',
  './audio/voice/c462e950.mp3',
  './audio/voice/c8816f7f.mp3',
  './audio/voice/c9ebb7f2.mp3',
  './audio/voice/ca331046.mp3',
  './audio/voice/cce9fd39.mp3',
  './audio/voice/cd3bf8ca.mp3',
  './audio/voice/cf02ea4a.mp3',
  './audio/voice/cfb5b36a.mp3',
  './audio/voice/d2bb6729.mp3',
  './audio/voice/d2bdf38f.mp3',
  './audio/voice/d35c3a80.mp3',
  './audio/voice/d5f0e33f.mp3',
  './audio/voice/d6ad521d.mp3',
  './audio/voice/dc0851fb.mp3',
  './audio/voice/de6ec161.mp3',
  './audio/voice/df4b9592.mp3',
  './audio/voice/e044c02b.mp3',
  './audio/voice/e0dec118.mp3',
  './audio/voice/e2aa5317.mp3',
  './audio/voice/e2eca8f0.mp3',
  './audio/voice/e44fb559.mp3',
  './audio/voice/e70bd1f2.mp3',
  './audio/voice/e78989ae.mp3',
  './audio/voice/ebff4844.mp3',
  './audio/voice/ed57c98d.mp3',
  './audio/voice/ee6dd309.mp3',
  './audio/voice/eecfa7f8.mp3',
  './audio/voice/ef93ea19.mp3',
  './audio/voice/f186289f.mp3',
  './audio/voice/f1a1652f.mp3',
  './audio/voice/f2729c28.mp3',
  './audio/voice/f3dac54c.mp3',
  './audio/voice/f4aa4310.mp3',
  './audio/voice/f5540ac2.mp3',
  './audio/voice/f6c4bf5c.mp3',
  './audio/voice/f6f3e4bf.mp3',
  './audio/voice/f75858ea.mp3',
  './audio/voice/f75cd618.mp3',
  './audio/voice/f78e72e4.mp3',
  './audio/voice/f969a531.mp3',
  './audio/voice/f98c3773.mp3',
  './audio/voice/f99b41fd.mp3',
  './audio/voice/f9b5b206.mp3',
  './audio/voice/fd9c59bb.mp3',
  './audio/voice/fdf532f8.mp3',
  './audio/voice/fe6029d9.mp3',
  './audio/voice/ff2a7dac.mp3'
  /* PRECACHE:END */
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    }).then(function () { return caches.keys(); }).then(function (keys) {
      if (keys.some(function (k) { return LEGACY.indexOf(k) >= 0; })) return self.skipWaiting();
    })
  );
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'VERSION' && event.ports && event.ports[0]) event.ports[0].postMessage({ cache: CACHE, build: BUILD });
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('learn-') === 0 && k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function put(req, res) {
  if (res && res.status === 200 && res.type === 'basic') {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}
function fromCache(req) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit || req.mode !== 'navigate') return hit;
    return caches.match('./index.html').then(function (h) { return h || caches.match('./'); });
  });
}
// Network first (past the HTTP cache); cached copy when offline, or after 6 s on a very slow network.
function networkFirst(req) {
  return new Promise(function (resolve) {
    var settled = false;
    function done(r) { if (!settled && r) { settled = true; resolve(r); } }
    var slow = setTimeout(function () { fromCache(req).then(done); }, 6000);
    fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then(function (res) {
      clearTimeout(slow);
      if (res && res.ok) { put(req, res); done(res); }
      else fromCache(req).then(function (hit) { done(hit || res); });
    }).catch(function () {
      clearTimeout(slow);
      fromCache(req).then(function (hit) { if (hit) done(hit); else if (!settled) { settled = true; resolve(Response.error()); } });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/\.mp3$/.test(url.pathname)) {
    event.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) { return put(req, res); }).catch(function () { return Response.error(); });
    }));
    return;
  }
  event.respondWith(networkFirst(req));
});
