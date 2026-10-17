/* Save / load / unlock logic. Pure: works in the browser and in Node tests.
 * Storage is injected (localStorage in the browser, a fake in tests). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.save = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEY = 'littleEngineerSave';
  var VERSION = 1;
  var WORLDS = ['bridges', 'machines', 'circuits', 'robot'];

  function defaults() {
    var stars = {};
    WORLDS.forEach(function (w) { stars[w] = []; });
    return {
      version: VERSION,
      stars: stars,            // stars[world][levelIndex] = 0..3
      inProgress: {},          // 'world:index' -> view state (what he placed / his program)
      last: null,              // { screen: 'level'|'map'|'practice'|'menu', world, level }
      settings: { sound: true },
      seenTips: {},            // tipId -> true
      practice: { done: {}, state: null }
    };
  }

  function clampStars(n) {
    n = Math.floor(Number(n) || 0);
    return n < 0 ? 0 : n > 3 ? 3 : n;
  }

  function sanitize(d) {
    var base = defaults();
    if (!d || typeof d !== 'object') return base;
    var out = base;
    if (d.stars && typeof d.stars === 'object') {
      WORLDS.forEach(function (w) {
        var arr = d.stars[w];
        if (Array.isArray(arr)) out.stars[w] = arr.map(clampStars);
      });
    }
    if (d.inProgress && typeof d.inProgress === 'object') out.inProgress = d.inProgress;
    if (d.last && typeof d.last === 'object') out.last = d.last;
    if (d.settings && typeof d.settings === 'object') {
      out.settings.sound = d.settings.sound !== false;
    }
    if (d.seenTips && typeof d.seenTips === 'object') out.seenTips = d.seenTips;
    if (d.practice && typeof d.practice === 'object') {
      out.practice.done = (d.practice.done && typeof d.practice.done === 'object') ? d.practice.done : {};
      out.practice.state = d.practice.state || null;
    }
    return out;
  }

  function memoryStorage() {
    var m = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
      setItem: function (k, v) { m[k] = String(v); },
      removeItem: function (k) { delete m[k]; }
    };
  }

  /** Create a store bound to a Storage-like object. */
  function createStore(storage, key) {
    storage = storage || memoryStorage();
    key = key || KEY;
    var data = load();

    function load() {
      try {
        var raw = storage.getItem(key);
        if (!raw) return defaults();
        return sanitize(JSON.parse(raw));
      } catch (e) {
        return defaults();
      }
    }
    function persist() {
      try { storage.setItem(key, JSON.stringify(data)); } catch (e) { /* storage full / private mode */ }
    }
    function pkey(world, index) { return world + ':' + index; }

    var api = {
      KEY: key,
      get data() { return data; },
      reload: function () { data = load(); return data; },
      save: persist,

      getStars: function (world, index) {
        var arr = data.stars[world] || [];
        return arr[index] || 0;
      },
      /** Record a result; keeps the best score. Returns the stored best. */
      setStars: function (world, index, stars) {
        if (!data.stars[world]) data.stars[world] = [];
        var arr = data.stars[world];
        while (arr.length <= index) arr.push(0);
        var s = clampStars(stars);
        if (s > arr[index]) arr[index] = s;
        persist();
        return arr[index];
      },
      totalStars: function (world) {
        return (data.stars[world] || []).reduce(function (a, b) { return a + (b || 0); }, 0);
      },
      completedCount: function (world) {
        return (data.stars[world] || []).filter(function (s) { return s > 0; }).length;
      },
      /** Level 0 is always open; others open once the previous level has >= 1 star. */
      isUnlocked: function (world, index) {
        if (index <= 0) return true;
        return api.getStars(world, index - 1) > 0;
      },
      /** Highest unlocked level index (for "continue"). */
      nextLevel: function (world, count) {
        for (var i = 0; i < count; i++) {
          if (api.getStars(world, i) === 0) return i;
        }
        return Math.max(0, count - 1);
      },

      getInProgress: function (world, index) {
        var v = data.inProgress[pkey(world, index)];
        return v === undefined ? null : v;
      },
      setInProgress: function (world, index, state) {
        data.inProgress[pkey(world, index)] = state;
        persist();
      },
      clearInProgress: function (world, index) {
        delete data.inProgress[pkey(world, index)];
        persist();
      },

      setLast: function (last) { data.last = last || null; persist(); },
      getLast: function () { return data.last; },

      getSound: function () { return data.settings.sound !== false; },
      setSound: function (on) { data.settings.sound = !!on; persist(); },

      hasSeenTip: function (id) { return !!data.seenTips[id]; },
      markTip: function (id) { data.seenTips[id] = true; persist(); },

      isPracticeDone: function (id) { return !!data.practice.done[id]; },
      markPracticeDone: function (id) { data.practice.done[id] = true; persist(); },
      getPracticeState: function () { return data.practice.state; },
      setPracticeState: function (s) { data.practice.state = s; persist(); },

      /** Wipe progress (keeps the sound setting so a reset doesn't blast audio). */
      reset: function () {
        var sound = data.settings.sound;
        data = defaults();
        data.settings.sound = sound;
        persist();
      }
    };
    return api;
  }

  return {
    KEY: KEY,
    WORLDS: WORLDS,
    defaults: defaults,
    sanitize: sanitize,
    createStore: createStore,
    memoryStorage: memoryStorage
  };
});
