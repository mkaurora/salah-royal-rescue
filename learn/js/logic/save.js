/* Saved state (localStorage, versioned with migration, robust to corrupt data), progress recording,
 * parent/admin operations, PIN + adult math gate, custom questions, transfer codes. Pure logic, UMD. */
(function (root, factory) {
  var deps = typeof require === 'function' && typeof module === 'object'
    ? { codec: require('./codec.js'), validate: require('./validate.js'), rng: require('../core/rng.js') }
    : { codec: root.SQ.codec, validate: root.SQ.validate, rng: root.SQ.rng };
  var mod = factory(deps);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.save = mod; }
})(typeof self !== 'undefined' ? self : this, function (deps) {
  'use strict';
  var KEY = 'sq-save';
  var VERSION = 2;
  var SUBJECTS = ['math', 'english', 'science'];
  var MAX_SESSIONS = 40;
  var RECENT = 10;

  function defaultSettings() {
    return {
      sfxVol: 0.8, voiceVol: 1, voiceOn: true,
      hintDelay: 60, swapDelay: 300,
      countdownOn: false, countdownSecs: 45,
      perLevel: 6,
      subjects: { math: true, english: true, science: true },
      pin: '1234'
    };
  }

  function defaults() {
    return {
      v: VERSION, name: 'Salah', created: 0,
      settings: defaultSettings(),
      levels: { math: {}, english: {}, science: {} },     // subject → { index: { stars, passed, plays, last, ms } }
      unlocked: { math: 0, english: 0, science: 0 },      // highest unlocked level index
      skills: {},                                          // skill → { n, ok, recent: [1|0], ms, last }
      subjectStats: { math: { n: 0, ok: 0, ms: 0, last: 0 }, english: { n: 0, ok: 0, ms: 0, last: 0 }, science: { n: 0, ok: 0, ms: 0, last: 0 } },  // subject → { n, ok, ms, last }
      sessions: [],                                        // [{ s, l, stars, n, ok, ms, at }]
      custom: {},                                          // 'subject:index' → [question]
      edits: {},                                           // question id → { text, options, answer, hint }
      disabled: {}                                         // question id → true
    };
  }

  function isObj(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  function num(v, d, lo, hi) { v = +v; if (!isFinite(v)) return d; return Math.max(lo, Math.min(hi, v)); }

  /** v1 (first prototype) → v2. v1: { version: 1, stars: { 'math-0': 3 }, unlocked: { math: 2 }, pin, hintDelay, swapDelay, voice } */
  function migrateV1(o) {
    var s = defaults();
    if (typeof o.name === 'string') s.name = o.name;
    if (isObj(o.stars)) Object.keys(o.stars).forEach(function (k) {
      var m = /^(math|english|science)-(\d+)$/.exec(k);
      if (m) s.levels[m[1]][m[2]] = { stars: num(o.stars[k], 0, 0, 3), passed: true, plays: 1, last: 0, ms: 0 };
    });
    if (isObj(o.unlocked)) SUBJECTS.forEach(function (sub) { s.unlocked[sub] = num(o.unlocked[sub], 0, 0, 999) | 0; });
    if (/^\d{4}$/.test(o.pin)) s.settings.pin = o.pin;
    if (o.hintDelay) s.settings.hintDelay = o.hintDelay;
    if (o.swapDelay) s.settings.swapDelay = o.swapDelay;
    if (o.voice === false) s.settings.voiceOn = false;
    return s;
  }

  /** Bring any parsed object to a valid current-version state (fills gaps, drops junk). */
  function normalize(o) {
    if (!isObj(o)) return defaults();
    if (o.version === 1 && !o.v) o = migrateV1(o);
    var s = defaults();
    if (typeof o.name === 'string' && o.name.trim()) s.name = o.name.trim().slice(0, 20);
    s.created = +o.created || 0;
    var st = isObj(o.settings) ? o.settings : {};
    var d = s.settings;
    d.sfxVol = num(st.sfxVol, d.sfxVol, 0, 1);
    d.voiceVol = num(st.voiceVol, d.voiceVol, 0, 1);
    d.voiceOn = st.voiceOn !== false;
    d.hintDelay = num(st.hintDelay, d.hintDelay, 5, 3600);
    d.swapDelay = num(st.swapDelay, d.swapDelay, 10, 7200);
    d.countdownOn = !!st.countdownOn;
    d.countdownSecs = num(st.countdownSecs, d.countdownSecs, 5, 600);
    d.perLevel = num(st.perLevel, d.perLevel, 5, 8) | 0;
    if (isObj(st.subjects)) SUBJECTS.forEach(function (k) { d.subjects[k] = st.subjects[k] !== false; });
    if (/^\d{4}$/.test(st.pin)) d.pin = st.pin;
    SUBJECTS.forEach(function (sub) {
      var lv = isObj(o.levels) && isObj(o.levels[sub]) ? o.levels[sub] : {};
      Object.keys(lv).forEach(function (i) {
        if (!/^\d+$/.test(i) || !isObj(lv[i])) return;
        var e = lv[i];
        s.levels[sub][i] = { stars: num(e.stars, 0, 0, 3) | 0, passed: !!e.passed, plays: num(e.plays, 0, 0, 1e6) | 0, last: +e.last || 0, ms: +e.ms || 0 };
      });
      s.unlocked[sub] = isObj(o.unlocked) ? num(o.unlocked[sub], 0, 0, 999) | 0 : 0;
      var ss = isObj(o.subjectStats) && isObj(o.subjectStats[sub]) ? o.subjectStats[sub] : {};
      s.subjectStats[sub] = { n: +ss.n || 0, ok: +ss.ok || 0, ms: +ss.ms || 0, last: +ss.last || 0 };
    });
    if (isObj(o.skills)) Object.keys(o.skills).forEach(function (k) {
      var e = o.skills[k];
      if (!isObj(e)) return;
      s.skills[k] = { n: +e.n || 0, ok: +e.ok || 0, ms: +e.ms || 0, last: +e.last || 0,
        recent: Array.isArray(e.recent) ? e.recent.slice(-RECENT).map(function (x) { return x ? 1 : 0; }) : [] };
    });
    if (Array.isArray(o.sessions)) s.sessions = o.sessions.filter(isObj).slice(-MAX_SESSIONS).map(function (x) {
      return { s: String(x.s || ''), l: x.l | 0, stars: x.stars | 0, n: x.n | 0, ok: x.ok | 0, ms: +x.ms || 0, at: +x.at || 0 };
    });
    if (isObj(o.custom)) Object.keys(o.custom).forEach(function (k) {
      if (!/^(math|english|science):\d+$/.test(k) || !Array.isArray(o.custom[k])) return;
      var good = o.custom[k].filter(function (q) { return deps.validate.question(q).length === 0; });
      if (good.length) s.custom[k] = good;
    });
    if (isObj(o.edits)) Object.keys(o.edits).forEach(function (k) { if (isObj(o.edits[k])) s.edits[k] = o.edits[k]; });
    if (isObj(o.disabled)) Object.keys(o.disabled).forEach(function (k) { if (o.disabled[k]) s.disabled[k] = true; });
    return s;
  }

  function load(storage) {
    var raw = null;
    try { raw = storage && storage.getItem(KEY); } catch (e) { raw = null; }
    if (!raw) { var d = defaults(); d.created = Date.now(); return d; }
    try { return normalize(JSON.parse(raw)); } catch (e) { return defaults(); }
  }
  function persist(storage, state) {
    try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  /* ---------- progress ---------- */
  function levelInfo(state, subject, index) {
    return state.levels[subject][index] || { stars: 0, passed: false, plays: 0, last: 0, ms: 0 };
  }
  function isUnlocked(state, subject, index) { return index <= (state.unlocked[subject] || 0); }

  function recordAnswer(state, subject, skill, firstTry, ms, now) {
    var e = state.skills[skill] = state.skills[skill] || { n: 0, ok: 0, ms: 0, last: 0, recent: [] };
    e.n++; if (firstTry) e.ok++;
    e.ms += ms || 0; e.last = now || Date.now();
    e.recent.push(firstTry ? 1 : 0);
    if (e.recent.length > RECENT) e.recent = e.recent.slice(-RECENT);
    var ss = state.subjectStats[subject];
    if (ss) { ss.n++; if (firstTry) ss.ok++; ss.ms += ms || 0; ss.last = e.last; }
  }

  /** A finished level: keep best stars, mark passed, unlock the next one, log the session. */
  function recordLevel(state, subject, index, summary, levelCount, now) {
    now = now || Date.now();
    var cur = levelInfo(state, subject, index);
    state.levels[subject][index] = {
      stars: Math.max(cur.stars, summary.stars | 0), passed: true, plays: cur.plays + 1, last: now, ms: cur.ms + (summary.ms || 0)
    };
    var nextIdx = Math.min(index + 1, (levelCount || 999) - 1);
    if (state.unlocked[subject] < nextIdx) state.unlocked[subject] = nextIdx;
    state.sessions.push({ s: subject, l: index, stars: summary.stars | 0, n: summary.total | 0, ok: summary.firstTry | 0, ms: summary.ms || 0, at: now });
    if (state.sessions.length > MAX_SESSIONS) state.sessions = state.sessions.slice(-MAX_SESSIONS);
  }

  function totals(state) {
    var levels = 0, stars = 0;
    SUBJECTS.forEach(function (sub) {
      Object.keys(state.levels[sub]).forEach(function (i) {
        var e = state.levels[sub][i];
        if (e.passed) levels++;
        stars += e.stars;
      });
    });
    return { levels: levels, stars: stars };
  }
  function subjectStars(state, subject) {
    var t = 0;
    Object.keys(state.levels[subject] || {}).forEach(function (i) { t += state.levels[subject][i].stars; });
    return t;
  }

  /* ---------- admin ---------- */
  function unlock(state, subject, index) { if (state.unlocked[subject] < index) state.unlocked[subject] = index; }
  function unlockAll(state, subject, count) {
    (subject ? [subject] : SUBJECTS).forEach(function (s) {
      var c = typeof count === 'object' ? count[s] : count;
      state.unlocked[s] = Math.max(state.unlocked[s], (c || 1) - 1);
    });
  }
  /** Parent approves a level as passed: at least 1 star, next level unlocked. */
  function approve(state, subject, index, levelCount) {
    var cur = levelInfo(state, subject, index);
    state.levels[subject][index] = { stars: Math.max(1, cur.stars), passed: true, plays: cur.plays, last: cur.last, ms: cur.ms };
    unlock(state, subject, Math.min(index + 1, (levelCount || 999) - 1));
  }
  function setStars(state, subject, index, n) {
    var cur = levelInfo(state, subject, index);
    n = num(n, 0, 0, 3) | 0;
    state.levels[subject][index] = { stars: n, passed: n > 0 ? true : cur.passed, plays: cur.plays, last: cur.last, ms: cur.ms };
  }
  function resetLevel(state, subject, index) { delete state.levels[subject][index]; }
  function resetAll(state) {
    var keep = state.settings, custom = state.custom, edits = state.edits, disabled = state.disabled, name = state.name;
    var s = defaults();
    s.settings = keep; s.custom = custom; s.edits = edits; s.disabled = disabled; s.name = name; s.created = Date.now();
    return s;
  }

  /* ---------- PIN + adult gate ---------- */
  function checkPin(state, pin) { return String(pin) === state.settings.pin; }
  function setPin(state, pin) {
    if (!/^\d{4}$/.test(String(pin))) return false;
    state.settings.pin = String(pin);
    return true;
  }
  /** "What is 14 × 7?" — a 2-digit × 1-digit product an adult can do but a 7-year-old can't. */
  function mathGate(seed) {
    var r = deps.rng.rng(seed === undefined ? Date.now() : seed);
    var a = r.int(12, 19), b = r.int(6, 9);
    return { a: a, b: b, question: 'What is ' + a + ' × ' + b + '?', answer: a * b };
  }
  function checkGate(gate, input) { return String(input).trim() !== '' && +input === gate.answer; }

  /* ---------- questions ---------- */
  var uid = 0;
  /** Add a custom multiple-choice question to a level. Returns { ok, question, problems }. */
  function addCustom(state, subject, index, q, skill) {
    var options = (q.options || []).map(function (x) { return String(x).trim(); }).filter(Boolean);
    var question = {
      id: q.id || 'cu-' + Date.now().toString(36) + '-' + (uid++).toString(36),
      skill: skill || q.skill, d: 1, type: 'choice', custom: true,
      text: String(q.text || '').trim(), options: options,
      answer: String(q.answer === undefined ? options[0] : q.answer).trim(),
      hint: String(q.hint || '').trim() || 'Look again. You can do it!'
    };
    if (q.pic) question.pic = String(q.pic).trim();
    var problems = deps.validate.question(question);
    if (problems.length) return { ok: false, problems: problems };
    var k = subject + ':' + index;
    (state.custom[k] = state.custom[k] || []).push(question);
    return { ok: true, question: question };
  }
  function removeCustom(state, id) {
    Object.keys(state.custom).forEach(function (k) {
      state.custom[k] = state.custom[k].filter(function (q) { return q.id !== id; });
      if (!state.custom[k].length) delete state.custom[k];
    });
    delete state.edits[id]; delete state.disabled[id];
  }
  /** Edit text/options/answer/hint of any question (validated against the merged result). */
  function editQuestion(state, original, patch) {
    var merged = JSON.parse(JSON.stringify(original));
    var e = {};
    ['text', 'options', 'answer', 'hint'].forEach(function (k) {
      if (patch[k] !== undefined) { merged[k] = patch[k]; e[k] = patch[k]; }
    });
    var problems = deps.validate.question(merged);
    if (problems.length) return { ok: false, problems: problems };
    state.edits[original.id] = Object.assign({}, state.edits[original.id] || {}, e);
    return { ok: true };
  }
  function clearEdit(state, id) { delete state.edits[id]; }
  function setDisabled(state, id, off) { if (off) state.disabled[id] = true; else delete state.disabled[id]; }

  /* ---------- transfer ---------- */
  function exportCode(state) { return deps.codec.encode({ app: 'sq', v: VERSION, state: state }); }
  function preview(state) {
    var t = totals(state);
    return state.name + ' — ' + t.levels + ' level' + (t.levels === 1 ? '' : 's') + ', ' + t.stars + ' star' + (t.stars === 1 ? '' : 's');
  }
  /** code → { state, preview } (state normalized; nothing applied yet). Rejects on bad codes. */
  function importCode(code) {
    return deps.codec.decode(code).then(function (obj) {
      if (!isObj(obj) || obj.app !== 'sq' || !isObj(obj.state)) throw new Error('This is not a Learning Quest code.');
      var s = normalize(obj.state);
      return { state: s, preview: preview(s) };
    });
  }

  return {
    KEY: KEY, VERSION: VERSION, SUBJECTS: SUBJECTS, defaults: defaults, defaultSettings: defaultSettings,
    normalize: normalize, migrateV1: migrateV1, load: load, persist: persist,
    levelInfo: levelInfo, isUnlocked: isUnlocked, recordAnswer: recordAnswer, recordLevel: recordLevel,
    totals: totals, subjectStars: subjectStars,
    unlock: unlock, unlockAll: unlockAll, approve: approve, setStars: setStars, resetLevel: resetLevel, resetAll: resetAll,
    checkPin: checkPin, setPin: setPin, mathGate: mathGate, checkGate: checkGate,
    addCustom: addCustom, removeCustom: removeCustom, editQuestion: editQuestion, clearEdit: clearEdit, setDisabled: setDisabled,
    exportCode: exportCode, importCode: importCode, preview: preview
  };
});
