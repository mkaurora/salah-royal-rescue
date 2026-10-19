/* Game updates. Registers the service worker with updateViaCache:'none', checks for a new version on load and every
 * time the app comes back to the screen, and tells the page (onUpdate) when a new version is installed and waiting.
 * Nothing reloads by itself: apply() is only called from a tap, and the reload happens on controllerchange.
 * check() is the "Update game" button: resolves 'offline' | 'latest' | 'updating'.
 * All browser objects are injected so this runs in node tests with fakes. UMD. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.GameUpdate = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function createUpdater(o) {
    var nav = o.navigator, sw = nav && nav.serviceWorker, reg = null, waiting = null, wantReload = false, reloading = false;
    var timeout = o.timeout || 30000, setT = o.setTimeout || setTimeout;
    function reload() { if (reloading) return; reloading = true; o.reload(); }
    function found(w) { if (!w || waiting === w) return; waiting = w; if (o.onUpdate) o.onUpdate(); }
    function watchWorker(w) {
      if (!w) return;
      if (w.state === 'installed') { if (sw.controller) found(w); return; }
      w.addEventListener('statechange', function () { if (w.state === 'installed' && sw.controller) found(w); });
    }
    function watch(r) {
      if (r.waiting && sw.controller) found(r.waiting);
      if (r.installing) watchWorker(r.installing);
      r.addEventListener('updatefound', function () { watchWorker(r.installing); });
    }
    function register(url) {
      if (!sw) return Promise.resolve(null);
      sw.addEventListener('controllerchange', function () { if (wantReload) reload(); });
      return sw.register(url, { updateViaCache: 'none' }).then(function (r) { reg = r; watch(r); return r; })
        .catch(function () { return null; });
    }
    /** quiet background check (load + visibilitychange) */
    function poll() {
      if (!reg || nav.onLine === false) return Promise.resolve(false);
      return Promise.resolve().then(function () { return reg.update(); }).then(function () { return true; }, function () { return false; });
    }
    function waitInstalled(w) {
      return new Promise(function (res) {
        if (w.state === 'installed' || w.state === 'activated') return res(true);
        if (w.state === 'redundant') return res(false);
        var done = false;
        w.addEventListener('statechange', function () {
          if (done) return;
          if (w.state === 'installed' || w.state === 'activated') { done = true; res(true); }
          else if (w.state === 'redundant') { done = true; res(false); }
        });
        setT(function () { if (!done) { done = true; res(false); } }, timeout);
      });
    }
    /** activate the waiting version and reload into it (only call this from a tap) */
    function apply() {
      wantReload = true;
      var w = waiting || (reg && reg.waiting);
      if (w && sw.controller) {
        w.postMessage({ type: 'SKIP_WAITING' });
        setT(reload, 5000); // safety net if controllerchange never fires
      } else reload();
    }
    /** the "Update game" button */
    function check() {
      if (nav.onLine === false) return Promise.resolve('offline');
      if (!reg) {
        // no service worker (old browser / test mode): a fresh reload is the update
        if (!o.ping) return Promise.resolve('latest');
        return o.ping().then(function () { return 'latest'; }, function () { return 'offline'; });
      }
      return Promise.resolve().then(function () { return reg.update(); }).then(function () {
        var w = reg.installing || reg.waiting;
        if (!w) return 'latest';
        return waitInstalled(w).then(function (ok) {
          if (!ok) return 'latest';
          waiting = reg.waiting || w;
          apply();
          return 'updating';
        });
      }, function () { return 'offline'; });
    }
    return { register: register, poll: poll, check: check, apply: apply,
      hasUpdate: function () { return !!waiting; }, registration: function () { return reg; } };
  }
  var TEXT = {
    latest: 'You have the latest version',
    offline: "You're offline, try again later",
    updating: 'Updating…',
    banner: 'New version! Tap to update'
  };
  return { createUpdater: createUpdater, TEXT: TEXT };
});
