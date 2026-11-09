// Sparks service worker: precaches the whole app for offline use.
// The cache name is derived from version.js, so bumping the version there
// (which changes this worker's imported script) installs a fresh cache.
importScripts('version.js');

var CACHE = 'sparks-v' + self.SPARKS_VERSION + '-' + self.SPARKS_BUILD;
var ASSETS = [
  './',
  'index.html',
  'version.js',
  'manifest.webmanifest',
  'css/app.css',
  'js/i18n.js',
  'js/store.js',
  'js/daily.js',
  'js/art.js',
  'js/speech.js',
  'js/app.js',
  'data/decks/01-world-history.js',
  'data/decks/02-islamic-arab-history.js',
  'data/decks/03-gulf-kuwait.js',
  'data/decks/04-money-investing.js',
  'data/decks/05-business-strategy.js',
  'data/decks/06-psychology-people.js',
  'data/decks/07-tech-ai.js',
  'data/decks/08-parenting-family.js',
  'data/decks/09-health-body.js',
  'data/decks/10-thinkers-books.js',
  'data/decks/11-spain-morocco.js',
  'data/decks/12-science-space.js',
  'data/decks/13-everyday-knowledge.js',
  'fonts/Nunito-var.woff',
  'fonts/NotoSansArabic-var.woff',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', function (event) {
  // No skipWaiting here: a new version waits until the user taps "update".
  event.waitUntil(caches.open(CACHE).then(function (cache) {
    return cache.addAll(ASSETS.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('sparks-') === 0 && k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // reference links open normally
  if (req.mode === 'navigate') {
    // App shell: serve the cached page so the app opens offline.
    event.respondWith(caches.match('index.html', { cacheName: CACHE }).then(function (hit) {
      return hit || fetch(req);
    }).catch(function () { return fetch(req); }));
    return;
  }
  event.respondWith(caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    });
  }));
});
