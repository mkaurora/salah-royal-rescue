/* Save game + progression rules: versioned localStorage save that is sanitized on every load (corrupt data never
 * crashes the game), sequential unlocks, quiz gates, rewards, garage purchases, settings and the parents' panel
 * (PIN 1994). Pure: storage is passed in ({getItem, setItem}) so Node tests use a fake.
 * UMD: module.exports in Node, RR.progress in the browser. */
(function (root, factory) {
  var RR = root.RR || {};
  var req = typeof require === 'function' ? require : null;
  var mod = factory(RR.levels || req('../data/levels.js'), RR.garage || req('../data/garage.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.progress = mod; }
})(typeof self !== 'undefined' ? self : this, function (LV, GA) {
  'use strict';

  var KEY = 'roadracer-save-v1';
  var LEGACY_KEYS = ['roadracer-save'];       // unversioned dev builds (v0)
  var VERSION = 1;
  var N = LV.COUNT;
  var PIN = '1994';
  var SUBJECTS = ['math', 'english', 'science'];
  var MAX_COINS = 999999;
  var RECENT_MAX = 150;                       // quiz question ids remembered to avoid repeats
  var REWARD = { firstFinish: 20, perNewStar: 10 };
  var QUIZ_COINS = { firstTry: 5, retry: 2 };

  function defaults() {
    var st = [], best = [];
    for (var i = 0; i < N; i++) { st.push(0); best.push(null); }
    return {
      v: VERSION, unlocked: 1, stars: st, best: best, coins: 0, earned: 0, plays: 0, lastLevel: 0,
      upgrades: { speed: 0, grip: 0, brakes: 0, armor: 0 },
      paint: 'red', decal: 'none', body: 'racer',
      owned: { paint: ['red'], decal: ['none'], body: ['racer'] },
      settings: { sound: true, music: true, tilt: false },
      quiz: { enabled: true, subjects: { math: true, english: true, science: true } },
      quizStats: { asked: 0, firstTry: 0, coins: 0, bySubject: { math: { asked: 0, firstTry: 0 },
        english: { asked: 0, firstTry: 0 }, science: { asked: 0, firstTry: 0 } }, recent: [] },
      gates: {}
    };
  }

  /* ------------------------------------------------------------------ sanitize */

  function isObj(o) { return !!o && typeof o === 'object' && !Array.isArray(o); }
  function int(v, lo, hi, dflt) {
    if (typeof v === 'string' && v.trim() !== '') v = +v;
    if (typeof v !== 'number' || v !== v || !isFinite(v)) return dflt;
    v = Math.floor(v);
    return v < lo ? lo : v > hi ? hi : v;
  }
  function bool(v, dflt) { return typeof v === 'boolean' ? v : dflt; }

  /** Any value → a valid current-version save. Never throws. */
  function sanitize(raw) {
    var d = defaults();
    if (!isObj(raw)) return d;
    try {
      if (raw.v === undefined || raw.v === 0) raw = migrate0(raw);
      d.unlocked = int(raw.unlocked, 1, N, 1);
      if (Array.isArray(raw.stars)) for (var i = 0; i < N; i++) d.stars[i] = int(raw.stars[i], 0, 3, 0);
      if (Array.isArray(raw.best)) for (var j = 0; j < N; j++) {
        var b = raw.best[j];
        d.best[j] = typeof b === 'number' && b > 0 && isFinite(b) ? Math.round(b * 100) / 100 : null;
      }
      // a level with stars was finished, so the next one is open
      for (var k = 0; k < N; k++) if (d.stars[k] > 0) d.unlocked = Math.max(d.unlocked, Math.min(N, k + 2));
      d.coins = int(raw.coins, 0, MAX_COINS, 0);
      d.earned = int(raw.earned, 0, 1e9, d.coins);
      d.plays = int(raw.plays, 0, 1e9, 0);
      d.lastLevel = int(raw.lastLevel, 0, N - 1, 0);
      if (isObj(raw.upgrades)) GA.upgradeIds().forEach(function (u) { d.upgrades[u] = int(raw.upgrades[u], 0, GA.TIERS, 0); });
      if (isObj(raw.owned)) Object.keys(GA.KINDS).forEach(function (kind) {
        var list = Array.isArray(raw.owned[kind]) ? raw.owned[kind] : [];
        list.forEach(function (id) { if (GA.find(kind, id) && d.owned[kind].indexOf(id) < 0) d.owned[kind].push(id); });
      });
      Object.keys(GA.KINDS).forEach(function (kind) {
        if (typeof raw[kind] === 'string' && d.owned[kind].indexOf(raw[kind]) >= 0) d[kind] = raw[kind];
      });
      if (isObj(raw.settings)) {
        d.settings.sound = bool(raw.settings.sound, true);
        d.settings.music = bool(raw.settings.music, true);
        d.settings.tilt = bool(raw.settings.tilt, false);
      }
      if (isObj(raw.quiz)) {
        d.quiz.enabled = bool(raw.quiz.enabled, true);
        if (isObj(raw.quiz.subjects)) SUBJECTS.forEach(function (s) { d.quiz.subjects[s] = bool(raw.quiz.subjects[s], true); });
        if (!SUBJECTS.some(function (s) { return d.quiz.subjects[s]; })) SUBJECTS.forEach(function (s) { d.quiz.subjects[s] = true; });
      }
      var qs = raw.quizStats;
      if (isObj(qs)) {
        d.quizStats.asked = int(qs.asked, 0, 1e9, 0);
        d.quizStats.firstTry = int(qs.firstTry, 0, d.quizStats.asked, 0);
        d.quizStats.coins = int(qs.coins, 0, 1e9, 0);
        if (isObj(qs.bySubject)) SUBJECTS.forEach(function (s) {
          var x = qs.bySubject[s];
          if (!isObj(x)) return;
          d.quizStats.bySubject[s].asked = int(x.asked, 0, 1e9, 0);
          d.quizStats.bySubject[s].firstTry = int(x.firstTry, 0, d.quizStats.bySubject[s].asked, 0);
        });
        if (Array.isArray(qs.recent)) d.quizStats.recent = qs.recent.filter(function (id) { return typeof id === 'string' && id.length < 200; }).slice(-RECENT_MAX);
      }
      if (isObj(raw.gates)) Object.keys(raw.gates).forEach(function (k) {
        var i = int(k, 0, N - 1, -1);
        if (i > 0 && String(i) === k && raw.gates[k] === true) d.gates[k] = true;
      });
    } catch (e) {
      return defaults();
    }
    return d;
  }

  /** v0 (unversioned dev build): { unlockedLevel, starsById: {id: n}, coins, upgrades } → v1-shaped raw object. */
  function migrate0(raw) {
    var out = {};
    for (var k in raw) out[k] = raw[k];
    if (raw.unlockedLevel !== undefined && raw.unlocked === undefined) out.unlocked = raw.unlockedLevel;
    if (isObj(raw.starsById)) {
      out.stars = LV.LEVELS.map(function (l) { return raw.starsById[l.id] || 0; });
    }
    out.v = VERSION;
    return out;
  }

  /* ------------------------------------------------------------------ storage */

  function load(storage) {
    var txt = null;
    try { txt = storage && storage.getItem(KEY); } catch (e) { txt = null; }
    if (txt === null || txt === undefined) {
      for (var i = 0; i < LEGACY_KEYS.length && (txt === null || txt === undefined); i++) {
        try { txt = storage && storage.getItem(LEGACY_KEYS[i]); } catch (e2) { txt = null; }
      }
    }
    if (txt === null || txt === undefined) return defaults();
    var raw = null;
    try { raw = JSON.parse(txt); } catch (e3) { raw = null; }
    return sanitize(raw);
  }

  /** Write the save; false when storage is full / blocked (the game keeps running). */
  function save(storage, state) {
    try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ levels, gates, rewards */

  function canPlay(state, i) { return i >= 0 && i < N && i < state.unlocked; }

  /** Gate before level i: 'big' (5 questions) before a boss level or the first level of a new world, else 'normal'. */
  function gateKind(i) { return LV.isBoss(i) || LV.isWorldStart(i) ? 'big' : 'normal'; }
  function gateSize(i) { return gateKind(i) === 'big' ? 5 : (LV.LEVELS[i].world <= 2 ? 2 : 3); }
  /** A gate guards the FIRST entry to a level (never level 1). Once passed it is never asked again. */
  function needsGate(state, i) {
    return !!state.quiz.enabled && i > 0 && i < N && canPlay(state, i) && !state.gates[String(i)];
  }
  function passGate(state, i) { if (i > 0 && i < N) state.gates[String(i)] = true; }

  function addCoins(state, n) {
    n = Math.max(0, Math.floor(n) || 0);
    state.coins = Math.min(MAX_COINS, state.coins + n);
    state.earned += n;
    return n;
  }

  /** Record a race. Returns { coins, newStars, unlocked (index or -1), bestTime, firstFinish }. */
  function recordResult(state, i, r) {
    var out = { coins: 0, newStars: 0, unlocked: -1, bestTime: false, firstFinish: false };
    if (i < 0 || i >= N || !r) return out;
    state.plays++;
    state.lastLevel = i;
    var collected = Math.max(0, r.coins | 0);
    if (r.status !== 'finished') {
      // a failed try still keeps half the coins picked up (rounded down): trying is never wasted
      out.coins = addCoins(state, Math.floor(collected / 2));
      return out;
    }
    var stars = r.stars ? r.stars.count : 1, prev = state.stars[i];
    out.firstFinish = prev === 0;
    out.newStars = Math.max(0, stars - prev);
    state.stars[i] = Math.max(prev, stars);
    if (state.best[i] === null || r.time < state.best[i]) { out.bestTime = state.best[i] !== null; state.best[i] = Math.round(r.time * 100) / 100; }
    var bonus = (out.firstFinish ? REWARD.firstFinish : 0) + out.newStars * REWARD.perNewStar;
    out.coins = addCoins(state, collected + bonus);
    if (i + 1 < N && state.unlocked < i + 2) { state.unlocked = i + 2; out.unlocked = i + 1; }
    return out;
  }

  function totalStars(state) { return state.stars.reduce(function (a, b) { return a + b; }, 0); }
  function worldStars(state, w) { var s = 0; for (var i = (w - 1) * 6; i < w * 6; i++) s += state.stars[i]; return s; }

  /* ------------------------------------------------------------------ garage */

  function upgradePrice(state, id) { return GA.price(state.upgrades[id]); }
  /** Buy the next tier. { ok, reason: 'unknown' | 'max' | 'coins', price, level } */
  function buyUpgrade(state, id) {
    if (!(id in state.upgrades)) return { ok: false, reason: 'unknown' };
    var p = GA.price(state.upgrades[id]);
    if (p === null) return { ok: false, reason: 'max' };
    if (state.coins < p) return { ok: false, reason: 'coins', price: p };
    state.coins -= p;
    state.upgrades[id]++;
    return { ok: true, price: p, level: state.upgrades[id] };
  }
  /** Buy (if needed) and equip a paint / decal / body. */
  function buyItem(state, kind, id) {
    var it = GA.find(kind, id);
    if (!it) return { ok: false, reason: 'unknown' };
    if (state.owned[kind].indexOf(id) < 0) {
      if (state.coins < it.price) return { ok: false, reason: 'coins', price: it.price };
      state.coins -= it.price;
      state.owned[kind].push(id);
    }
    state[kind] = id;
    return { ok: true, price: it.price };
  }
  function owns(state, kind, id) { return state.owned[kind] && state.owned[kind].indexOf(id) >= 0; }

  /* ------------------------------------------------------------------ settings + quiz settings */

  function setSetting(state, key, val) {
    if (!(key in state.settings) || typeof val !== 'boolean') return false;
    state.settings[key] = val;
    return true;
  }
  function setQuizEnabled(state, on) { state.quiz.enabled = !!on; return true; }
  /** Subjects on/off — at least one stays on. */
  function setSubject(state, subj, on) {
    if (SUBJECTS.indexOf(subj) < 0) return false;
    if (!on && SUBJECTS.filter(function (s) { return state.quiz.subjects[s] && s !== subj; }).length === 0) return false;
    state.quiz.subjects[subj] = !!on;
    return true;
  }
  function enabledSubjects(state) { return SUBJECTS.filter(function (s) { return state.quiz.subjects[s]; }); }

  /** Record one answered question; returns coins awarded (more for first try). */
  function recordAnswer(state, subject, qid, firstTry) {
    var qs = state.quizStats;
    qs.asked++;
    if (firstTry) qs.firstTry++;
    var b = qs.bySubject[subject];
    if (b) { b.asked++; if (firstTry) b.firstTry++; }
    if (qid) { qs.recent.push(String(qid)); if (qs.recent.length > RECENT_MAX) qs.recent.splice(0, qs.recent.length - RECENT_MAX); }
    var c = firstTry ? QUIZ_COINS.firstTry : QUIZ_COINS.retry;
    qs.coins += c;
    return addCoins(state, c);
  }

  /* ------------------------------------------------------------------ parents (PIN 1994) */

  function checkPin(pin) { return String(pin) === PIN; }

  /** Progress reset: levels, stars, coins, garage, gates and quiz stats go; sound/music/tilt and the parents'
   * quiz choices stay. */
  function resetProgress(state) {
    var d = defaults();
    d.settings = JSON.parse(JSON.stringify(state.settings));
    d.quiz = JSON.parse(JSON.stringify(state.quiz));
    return d;
  }

  /** parentAction(state, pin, action, arg) → { ok, state?, reason } ; actions: unlockAll, reset (arg must be
   * 'confirm'), quiz (arg bool), subject ([name, bool]), addCoins (arg 1..1000). Wrong PIN → { ok:false, reason:'pin' }.
   * 'reset' returns the NEW state object in .state (the caller replaces its state). */
  function parentAction(state, pin, action, arg) {
    if (!checkPin(pin)) return { ok: false, reason: 'pin' };
    switch (action) {
      case 'unlockAll': state.unlocked = N; return { ok: true, state: state };
      case 'reset':
        if (arg !== 'confirm') return { ok: false, reason: 'confirm' };
        return { ok: true, state: resetProgress(state) };
      case 'quiz': setQuizEnabled(state, arg); return { ok: true, state: state };
      case 'subject':
        return Array.isArray(arg) && setSubject(state, arg[0], arg[1]) ? { ok: true, state: state } : { ok: false, reason: 'subject' };
      case 'addCoins':
        var n = Math.floor(+arg);
        if (!(n >= 1 && n <= 1000)) return { ok: false, reason: 'amount' };
        addCoins(state, n);
        return { ok: true, state: state };
      default: return { ok: false, reason: 'unknown' };
    }
  }

  return {
    KEY: KEY, LEGACY_KEYS: LEGACY_KEYS, VERSION: VERSION, PIN_LENGTH: PIN.length, SUBJECTS: SUBJECTS, REWARD: REWARD,
    QUIZ_COINS: QUIZ_COINS, MAX_COINS: MAX_COINS, RECENT_MAX: RECENT_MAX,
    defaults: defaults, sanitize: sanitize, migrate0: migrate0, load: load, save: save,
    canPlay: canPlay, gateKind: gateKind, gateSize: gateSize, needsGate: needsGate, passGate: passGate,
    recordResult: recordResult, addCoins: addCoins, totalStars: totalStars, worldStars: worldStars,
    upgradePrice: upgradePrice, buyUpgrade: buyUpgrade, buyItem: buyItem, owns: owns,
    setSetting: setSetting, setQuizEnabled: setQuizEnabled, setSubject: setSubject, enabledSubjects: enabledSubjects,
    recordAnswer: recordAnswer, checkPin: checkPin, resetProgress: resetProgress, parentAction: parentAction
  };
});
