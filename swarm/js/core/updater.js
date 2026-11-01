/* Game updates (pattern shared with our other games).
 * - Service worker registered with updateViaCache: "none"; checked on load and when the page becomes visible again (throttled).
 * - A new worker that finished installing WAITS. We show a banner ("New version! Tap to update"); only a tap posts SKIP_WAITING
 *   and reloads on controllerchange. Never an automatic reload, so a level is never cut off.
 * - Settings "Check for update" uses manualUpdate(): offline / latest / updating.
 * UMD: tests can call createUpdater() with fakes. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SG = root.SG || {}; root.SG.createUpdater = mod.createUpdater; root.SG.UPDATE_MSG = mod.MESSAGES; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createUpdater(o) {
    o = o || {};
    var nav = o.navigator, doc = o.document;
    var reload = o.reload || function () {};
    var onBanner = o.onBanner || function () {};
    var beforeReload = o.beforeReload || function () {};
    var now = o.now || function () { return Date.now(); };
    var wait = o.wait || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var THROTTLE = o.throttleMs == null ? 60000 : o.throttleMs;
    var INSTALL_WAIT = o.installWaitMs == null ? 15000 : o.installWaitMs;
    var reg = null, lastCheck = -Infinity, wantReload = false, reloaded = false, bannerShown = false;
    var sw = nav && nav.serviceWorker;

    function supported() { return !!(sw && sw.register); }
    function hasController() { return !!(sw && sw.controller); }

    function notify() {
      if (bannerShown || !reg || !reg.waiting || !hasController()) return;
      bannerShown = true;
      onBanner(true);
    }

    function watch(r) {
      reg = r;
      if (r.waiting) notify();
      if (r.addEventListener) r.addEventListener('updatefound', function () {
        var w = r.installing;
        if (!w || !w.addEventListener) return;
        w.addEventListener('statechange', function () { if (w.state === 'installed') notify(); });
      });
    }

    function onControllerChange() {
      // Only reload when the player asked for the update; another tab activating a worker never reloads this one.
      if (!wantReload || reloaded) return;
      reloaded = true;
      reload();
    }

    function register(url) {
      if (!supported()) return Promise.resolve(null);
      if (sw.addEventListener) sw.addEventListener('controllerchange', onControllerChange);
      if (doc && doc.addEventListener) doc.addEventListener('visibilitychange', function () {
        if (doc.visibilityState === 'visible') check();
      });
      return Promise.resolve(sw.register(url || './sw.js', { scope: './', updateViaCache: 'none' }))
        .then(function (r) { if (r) { watch(r); check(true); } return r; })
        .catch(function () { return null; });
    }

    /** Background check, throttled. Returns the update() promise (or null when skipped). */
    function check(force) {
      if (!reg || !reg.update) return null;
      if (nav && nav.onLine === false) return null;
      var t = now();
      if (!force && t - lastCheck < THROTTLE) return null;
      lastCheck = t;
      return Promise.resolve(reg.update()).then(function () { notify(); }).catch(function () {});
    }

    /** Activate the waiting worker (player tapped the banner or the button). */
    function applyUpdate() {
      if (!reg || !reg.waiting) return false;
      wantReload = true;
      try { beforeReload(); } catch (e) { /* progress is already in localStorage */ }
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }

    /** Settings "Update game". Resolves 'offline' | 'latest' | 'updating' | 'unsupported'. */
    function manualUpdate() {
      if (nav && nav.onLine === false) return Promise.resolve('offline');
      if (!supported()) return Promise.resolve('unsupported');
      if (!reg) return Promise.resolve('latest');
      lastCheck = now();
      return Promise.resolve(reg.update()).then(function () {
        if (reg.waiting) return true;
        var w = reg.installing;
        if (!w) return false;
        // A new version is downloading: wait (bounded) for it to finish installing.
        return new Promise(function (resolve) {
          var done = false;
          function fin(v) { if (!done) { done = true; resolve(v); } }
          if (w.addEventListener) w.addEventListener('statechange', function () {
            if (w.state === 'installed') fin(true);
            else if (w.state === 'redundant') fin(false);
          });
          wait(INSTALL_WAIT).then(function () { fin(!!reg.waiting); });
        });
      }).then(function (has) {
        if (has && reg.waiting) { applyUpdate(); return 'updating'; }
        return 'latest';
      }).catch(function () {
        return 'offline';  // update() rejects when the network fails
      });
    }

    /** Ask the waiting worker which version it is (for the banner). Resolves { version, built } or null. */
    function waitingVersion(ms) {
      var w = reg && reg.waiting;
      if (!w || typeof MessageChannel === 'undefined') return Promise.resolve(null);
      return new Promise(function (resolve) {
        var ch = new MessageChannel(), done = false;
        function fin(v) { if (!done) { done = true; try { ch.port1.close(); } catch (e) { /* closed */ } resolve(v); } }
        ch.port1.onmessage = function (e) { fin(e.data && e.data.version ? e.data : null); };
        try { w.postMessage({ type: 'VERSION' }, [ch.port2]); } catch (e) { fin(null); }
        wait(ms == null ? 1500 : ms).then(function () { fin(null); });
      });
    }

    return {
      register: register, check: check, applyUpdate: applyUpdate, manualUpdate: manualUpdate, waitingVersion: waitingVersion,
      _state: function () { return { reg: reg, wantReload: wantReload, reloaded: reloaded, bannerShown: bannerShown }; },
      _watch: watch, _controllerChange: onControllerChange
    };
  }

  var MESSAGES = {
    offline: 'You\'re offline, try again later',
    latest: 'You have the latest version',
    updating: 'Updating… 🚀',
    unsupported: 'You have the latest version',
    banner: 'New version! Tap to update',
    bannerV: 'New version {v}! Tap to update',
    updated: 'Updated to version {v} ✨'
  };

  return { createUpdater: createUpdater, MESSAGES: MESSAGES };
});
