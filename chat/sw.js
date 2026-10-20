/* Family Chat service worker: precaches the app so it opens instantly (and offline), shows message alerts.
 * Chat data never goes through here: it's fetched from the backend with the device token (not cached). */
'use strict';
var BUILD = 'f958402bae';   // written by tools/build-sw.js (hash of all precached files)
var VERSION = '1.0';           // written by tools/build-sw.js from js/version.js (shown in Settings)
var BUILT = '20 Oct 2026';
var CONTENT = '39b564e71c';           // hash of the app without js/version.js: tells the build whether the version needs a bump
var CACHE = 'familychat-' + BUILD;
var PRECACHE = [
  /* PRECACHE:START */
  './',
  './css/app.css',
  './icons/apple-touch-icon.png',
  './icons/badge-96.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './index.html',
  './js/api.js',
  './js/app.js',
  './js/config.js',
  './js/fmt.js',
  './js/recorder.js',
  './js/stickers.js',
  './js/updater.js',
  './js/version.js',
  './manifest.webmanifest'
  /* PRECACHE:END */
];

self.addEventListener('install', function (event) {
  // A new version waits until "New version! Tap to update" is tapped (SKIP_WAITING), except on the very first install.
  event.waitUntil(caches.keys().then(function (keys) {
    var first = !keys.some(function (k) { return k.indexOf('familychat-') === 0; });
    return caches.open(CACHE).then(function (cache) {
      return cache.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: 'reload' }); }));
    }).then(function () { if (first) return self.skipWaiting(); });
  }));
});

self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data && event.data.type === 'VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: VERSION, built: BUILT, build: BUILD, cache: CACHE });
  }
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf('familychat-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // the chat backend: always live, never cached
  event.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    }).catch(function () {
      if (req.mode === 'navigate') return caches.match('./index.html');
      return Response.error();
    });
  }));
});

// Web push says only WHO wrote ("New message from Baba" / "New voice note from Baba 🎤"), never what.
// The payload is end-to-end encrypted by the server for this phone (RFC 8291); the browser decrypts it.
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  var title = typeof data.title === 'string' ? data.title.slice(0, 60) : 'Family Chat';
  var body = typeof data.body === 'string' ? data.body.slice(0, 120) : 'You have a new message!';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    list.forEach(function (c) { c.postMessage({ type: 'PUSH' }); });
    if (self.navigator && self.navigator.setAppBadge) { try { self.navigator.setAppBadge(); } catch (e) { /* unsupported */ } }
    return self.registration.showNotification(title, {
      body: body, tag: 'family-chat', renotify: true,
      icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', data: { url: './' }
    });
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if ('focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow('./');
  }));
});
