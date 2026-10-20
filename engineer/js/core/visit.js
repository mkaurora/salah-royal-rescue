/* "Opened" beacon (privacy-safe): on open / resume it tells the family server only the game name, the game version,
 * a random device id (made here, kept in localStorage, shared by the family games on this site) and a coarse device type.
 * No names, no progress, no content. Fire-and-forget: never blocks the game, silent offline, max once a minute. */
(function () {
  var GAME = 'little-engineer';
  var API = 'https://salah-family-chat.mkaurora.workers.dev/api/visit';
  var last = 0;
  function devId() {
    try {
      var v = localStorage.getItem('visit.id');
      if (!v || !/^[A-Za-z0-9_-]{16,40}$/.test(v)) {
        var a = new Uint8Array(16); (self.crypto || self.msCrypto).getRandomValues(a);
        v = ''; for (var i = 0; i < a.length; i++) v += ('0' + a[i].toString(16)).slice(-2);
        localStorage.setItem('visit.id', v);
      }
      return v;
    } catch (e) { return null; }
  }
  function devType() {
    var u = navigator.userAgent || '', touch = (navigator.maxTouchPoints || 0) > 1;
    if (/iPad/.test(u) || (/Macintosh/.test(u) && touch)) return 'iPad';
    if (/iPhone|iPod/.test(u)) return 'iPhone';
    if (/Android/.test(u)) return /Mobile/.test(u) ? 'Android phone' : 'Android tablet';
    if (/Mac/.test(u)) return 'Mac';
    if (/Win/.test(u)) return 'Windows';
    if (/Linux/.test(u)) return 'Linux';
    return 'Other';
  }
  function send() {
    try {
      var url = API;
      if (location.hostname !== 'mkaurora.github.io') {   // local testing: only with an explicit test server
        url = localStorage.getItem('visit.devApi');
        if (!url) return;
      }
      if (navigator.onLine === false) return;
      var now = Date.now();
      if (now - last < 60000) return;
      last = now;
      var d = devId(); if (!d) return;
      var gv = self.GAME_VERSION || self.APP_VERSION || {};
      var body = JSON.stringify({ g: GAME, v: String(gv.version || ''), d: d, t: devType() });
      if (navigator.sendBeacon && navigator.sendBeacon(url, body)) return;
      if (self.fetch) fetch(url, { method: 'POST', body: body, mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(function () {});
    } catch (e) { /* never break the game */ }
  }
  function later() { setTimeout(send, 1500); }
  if (document.readyState === 'complete') later(); else addEventListener('load', later);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') later(); });
  addEventListener('pageshow', function (e) { if (e.persisted) later(); });
})();
