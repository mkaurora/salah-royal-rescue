/* Save / load / unlock logic. Pure: works in the browser and in Node tests.
 * Storage is injected (localStorage in the browser, a fake in tests).
 * v3: parent mode (PIN + adult math gate, unlock / set stars / reset world), weekly project progress,
 * transfer codes (export / import progress as a short text code). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.save = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEY = 'littleEngineerSave';
  var VERSION = 1;
  var WORLDS = ['bridges', 'machines', 'circuits', 'robot', 'construction'];
  var DEFAULT_PIN = '1994';
  var CODE_PREFIX = 'LE1-';

  function defaults() {
    var stars = {};
    WORLDS.forEach(function (w) { stars[w] = []; });
    return {
      version: VERSION,
      stars: stars,            // stars[world][levelIndex] = 0..3
      inProgress: {},          // 'world:index' -> view state (what he placed / his program)
      last: null,              // { screen: 'level'|'map'|'practice'|'menu', world, level }
      settings: defaultSettings(),
      seenTips: {},            // tipId -> true
      practice: { done: {}, state: null },
      unlocked: {},            // world -> highest level index opened by a parent (v3)
      weekly: defaultWeekly()  // weekly big projects (v3)
    };
  }
  function defaultSettings() {
    return {
      sound: true,
      voice: true,
      pin: DEFAULT_PIN,        // parent PIN (4 digits)
      helper: true,            // "Ask Helper" (talk to the helper) allowed
      weeklyUnlockedMax: -1,   // parent: weekly projects 0..n are open early
      showMeAlways: false      // parent: Show me is open at once (normally after 2 tries or ~2 minutes)
    };
  }
  function defaultWeekly() {
    return {
      currentWeekForce: null,  // parent "jump to week n" (null = follow the calendar)
      completed: {}            // projectId -> { steps: { stepId: stars }, done: bool }
    };
  }

  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

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
      var st = d.settings;
      out.settings.sound = st.sound !== false;
      out.settings.voice = st.voice !== false;
      if (/^\d{4}$/.test(String(st.pin))) out.settings.pin = String(st.pin);
      out.settings.helper = st.helper !== false;
      out.settings.showMeAlways = st.showMeAlways === true;
      if (isInt(st.weeklyUnlockedMax) && st.weeklyUnlockedMax >= -1) out.settings.weeklyUnlockedMax = st.weeklyUnlockedMax;
    }
    if (d.unlocked && typeof d.unlocked === 'object') {
      WORLDS.forEach(function (w) { if (isInt(d.unlocked[w]) && d.unlocked[w] > 0) out.unlocked[w] = d.unlocked[w]; });
    }
    if (d.weekly && typeof d.weekly === 'object') {
      var wk = d.weekly;
      if (isInt(wk.currentWeekForce) && wk.currentWeekForce >= 0) out.weekly.currentWeekForce = wk.currentWeekForce;
      if (wk.completed && typeof wk.completed === 'object') {
        Object.keys(wk.completed).forEach(function (pid) {
          var p = wk.completed[pid];
          if (!p || typeof p !== 'object') return;
          var steps = {};
          if (p.steps && typeof p.steps === 'object') Object.keys(p.steps).forEach(function (sid) { steps[sid] = clampStars(p.steps[sid]); });
          out.weekly.completed[pid] = { steps: steps, done: !!p.done };
        });
      }
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
      /** Level 0 is always open; others open once the previous level has >= 1 star (or a parent opened them). */
      isUnlocked: function (world, index) {
        if (index <= 0) return true;
        if ((data.unlocked[world] || 0) >= index) return true;
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

      /** Wipe progress (keeps the settings — sound, voice, parent PIN — so a reset doesn't blast audio or lock out the parent). */
      reset: function () {
        var settings = data.settings;
        data = defaults();
        data.settings = settings;
        data.settings.weeklyUnlockedMax = -1;
        persist();
      },

      /* ---------- parent mode (v3) ---------- */
      checkPin: function (pin) { return checkPin(data, pin); },
      setPin: function (pin) { var ok = setPin(data, pin); if (ok) persist(); return ok; },
      getHelper: function () { return data.settings.helper !== false; },
      getShowMeAlways: function () { return data.settings.showMeAlways === true; },
      setShowMeAlways: function (on) { data.settings.showMeAlways = !!on; persist(); },
      setHelper: function (on) { data.settings.helper = !!on; persist(); },
      /** Open levels 0..index of a world (stars are kept). */
      unlockTo: function (world, index) { unlockTo(data, world, index); persist(); },
      /** Set the stars of one level exactly (0..3, may lower them); opens the level too. */
      setStarsExact: function (world, index, stars) { setStarsExact(data, world, index, stars); persist(); },
      /** Open every level of one world (or of every world when world is null). counts = { world: levelCount }. */
      unlockAll: function (counts, world) {
        Object.keys(counts).forEach(function (w) { if (!world || w === world) unlockTo(data, w, counts[w] - 1); });
        persist();
      },
      /** Wipe one world: stars, parent unlocks and its in-progress levels. */
      resetWorld: function (world) { resetWorld(data, world); persist(); },

      /* ---------- weekly projects (v3) ---------- */
      getWeekly: function () { return data.weekly; },
      projectProgress: function (pid) { return data.weekly.completed[pid] || { steps: {}, done: false }; },
      getStepStars: function (pid, sid) { var p = data.weekly.completed[pid]; return (p && p.steps[sid]) || 0; },
      /** Record a weekly step result (keeps the best). stepIds = all step ids of the project (marks it done when all have stars). */
      setStepStars: function (pid, sid, stars, stepIds) { var r = setStepStars(data, pid, sid, stars, stepIds, false); persist(); return r; },
      /** Parent: set a step's stars exactly (0 = not done). */
      setStepStarsExact: function (pid, sid, stars, stepIds) { var r = setStepStars(data, pid, sid, stars, stepIds, true); persist(); return r; },
      resetProject: function (pid) { delete data.weekly.completed[pid]; persist(); },
      /** Parent: open weekly projects 0..n early. */
      setWeeklyUnlockedMax: function (n) { data.settings.weeklyUnlockedMax = Math.max(-1, Math.floor(n)); persist(); },
      /** Parent: show week n as "this week" (null = follow the calendar again). */
      setCurrentWeekForce: function (n) { data.weekly.currentWeekForce = (n === null || n === undefined) ? null : Math.max(0, Math.floor(n)); persist(); },

      /* ---------- transfer ---------- */
      exportCode: function () { return exportCode(data); },
      /** Replace all progress with a transfer code. Returns { ok, error }. */
      importCode: function (code) {
        var r = importCode(code);
        if (!r.ok) return r;
        var keep = data.settings, wm = r.data.settings.weeklyUnlockedMax;
        data = r.data;
        data.settings = keep;              // this device keeps its own sound / voice / PIN
        data.settings.weeklyUnlockedMax = wm;
        persist();
        return { ok: true };
      }
    };
    return api;
  }

  /* ---------- PIN + adult gate ---------- */
  function checkPin(d, pin) { return String(pin) === String((d.settings && d.settings.pin) || DEFAULT_PIN); }
  function setPin(d, pin) {
    if (!/^\d{4}$/.test(String(pin))) return false;
    d.settings.pin = String(pin);
    return true;
  }
  /** Tiny seeded PRNG (mulberry32) so gates are testable. */
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /** "What is 17 × 13?" — two 2-digit numbers: easy for an adult with a phone, not for a 7-year-old. */
  function mathGate(seed) {
    var r = rng(seed === undefined ? Date.now() : seed);
    var a = 12 + Math.floor(r() * 8), b = 11 + Math.floor(r() * 9);   // 12..19 × 11..19
    return { a: a, b: b, question: 'What is ' + a + ' × ' + b + '?', answer: a * b };
  }
  function checkGate(gate, input) { return String(input).trim() !== '' && Number(String(input).trim()) === gate.answer; }

  /* ---------- parent progress helpers ---------- */
  function unlockTo(d, world, index) {
    if (WORLDS.indexOf(world) < 0) return;
    index = Math.max(0, Math.floor(index));
    if (index > (d.unlocked[world] || 0)) d.unlocked[world] = index;
  }
  function setStarsExact(d, world, index, stars) {
    if (WORLDS.indexOf(world) < 0) return;
    var arr = d.stars[world] = d.stars[world] || [];
    while (arr.length <= index) arr.push(0);
    arr[index] = clampStars(stars);
    unlockTo(d, world, index);
  }
  function resetWorld(d, world) {
    d.stars[world] = [];
    delete d.unlocked[world];
    Object.keys(d.inProgress).forEach(function (k) { if (k.indexOf(world + ':') === 0) delete d.inProgress[k]; });
    if (d.last && d.last.world === world) d.last = { screen: 'menu' };
  }
  function setStepStars(d, pid, sid, stars, stepIds, exact) {
    var p = d.weekly.completed[pid] = d.weekly.completed[pid] || { steps: {}, done: false };
    var s = clampStars(stars);
    if (exact) { if (s) p.steps[sid] = s; else delete p.steps[sid]; }
    else if (s > (p.steps[sid] || 0)) p.steps[sid] = s;
    if (stepIds && stepIds.length) p.done = stepIds.every(function (id) { return (p.steps[id] || 0) > 0; });
    return p;
  }

  /* ---------- transfer codes: 'LE1-' + base64url(JSON) + '.' + checksum ---------- */
  function fnv(str) {
    var h = 0x811c9dc5;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function b64encode(str) {
    var bin = unescape(encodeURIComponent(str));
    var b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bin, 'binary').toString('base64');
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64decode(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
    return decodeURIComponent(escape(bin));
  }
  /** Progress only (no in-progress boards, no "last screen"); the PIN is not exported. */
  function exportCode(d) {
    var o = { v: VERSION, s: d.stars, u: d.unlocked, t: d.seenTips, p: d.practice.done, w: d.weekly.completed,
      wm: d.settings.weeklyUnlockedMax };
    var json = JSON.stringify(o);
    return CODE_PREFIX + b64encode(json) + '.' + fnv(json).slice(0, 4);
  }
  /** code -> { ok, data } (a full sanitized save; current settings are NOT included) or { ok: false, error }. */
  function importCode(code) {
    try {
      code = String(code || '').replace(/\s+/g, '');
      if (code.indexOf(CODE_PREFIX) !== 0) return { ok: false, error: 'This is not a Little Engineer code.' };
      var body = code.slice(CODE_PREFIX.length), dot = body.lastIndexOf('.');
      if (dot < 0) return { ok: false, error: 'The code is incomplete.' };
      var json = b64decode(body.slice(0, dot));
      if (fnv(json).slice(0, 4) !== body.slice(dot + 1)) return { ok: false, error: 'The code has a typo.' };
      var o = JSON.parse(json);
      var d = sanitize({ stars: o.s, unlocked: o.u, seenTips: o.t, practice: { done: o.p }, weekly: { completed: o.w },
        settings: { weeklyUnlockedMax: o.wm } });
      return { ok: true, data: d };
    } catch (e) {
      return { ok: false, error: 'The code could not be read.' };
    }
  }

  return {
    KEY: KEY,
    WORLDS: WORLDS,
    DEFAULT_PIN: DEFAULT_PIN,
    defaults: defaults,
    defaultSettings: defaultSettings,
    checkPin: checkPin, setPin: setPin, mathGate: mathGate, checkGate: checkGate,
    exportCode: exportCode, importCode: importCode,
    sanitize: sanitize,
    createStore: createStore,
    memoryStorage: memoryStorage
  };
});
