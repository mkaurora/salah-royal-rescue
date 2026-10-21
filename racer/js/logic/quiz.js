/* Quiz gates: adapter over Salah's real Learning Quest curriculum (js/curriculum/*.js are verbatim copies —
 * provenance in dev/CURRICULUM-SOURCE.txt). Picks questions by subject + difficulty (growing with the world),
 * avoids repeats, skips anything that needs audio, and normalizes questions for our big-button quiz UI.
 * No timers, no voice: hints are the question's own text hint.
 *
 * Normalized question: { id, subject, skill, d, type, text, passage, pic, options, answer, pairs, rights, hint }
 *   type: choice | tf | count | numpad | order | build | match
 *   pic / option strings may be emoji, 'emoji label' or 'art:…' specs (draw with SQ.art.render / splitOption).
 * UMD: module.exports in Node, RR.quiz in the browser (reads window.SQ.content.{math,english,science}). */
(function (root, factory) {
  var RR = root.RR || {};
  var req = typeof require === 'function' ? require : null;
  var content = root.SQ && root.SQ.content;
  var mods = content && content.math ? content : {
    math: req('../curriculum/math.js'), english: req('../curriculum/english.js'), science: req('../curriculum/science.js')
  };
  var mod = factory(RR.rng || req('./rng.js'), RR.levels || req('../data/levels.js'), mods);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.quiz = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG, LV, MODS) {
  'use strict';

  var SUBJECTS = ['math', 'english', 'science'];
  var TYPES = ['choice', 'tf', 'count', 'numpad', 'order', 'build', 'match'];
  var WORLD_D = [1, 1, 2, 2, 3];       // minimum question difficulty per world
  var WINDOW = 3;                      // curriculum levels around the current position to draw skills from
  var AUDIO_RE = /\b(letter|word|sound|number)s? you hear\b/i;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /** Needs hearing (e.g. "Find the word you hear.") → never shown: we have no voice. */
  function needsAudio(q) { return !q || !q.text || AUDIO_RE.test(q.text); }

  function supported(q) { return !!q && TYPES.indexOf(q.type) >= 0 && !needsAudio(q); }

  function stableShuffle(arr, seed) {
    var r = RNG.rng('rights:' + seed), b = r.shuffle(arr);
    if (b.length > 1 && b.join('|') === arr.join('|')) b.push(b.shift());
    return b;
  }

  /** Curriculum question → our format (voice fields dropped). */
  function normalize(q, subject) {
    var n = {
      id: subject + ':' + q.id, subject: subject, skill: q.skill, d: q.d || 1, type: q.type,
      text: String(q.text), passage: q.passage || null, pic: q.pic || null,
      options: null, answer: null, pairs: null, rights: null,
      hint: q.hint ? String(q.hint) : 'Look again, slowly.'
    };
    if (q.type === 'match') {
      n.pairs = q.pairs.map(function (p) { return [String(p[0]), String(p[1])]; });
      n.rights = stableShuffle(n.pairs.map(function (p) { return p[1]; }), q.id);
    } else if (q.type === 'order') {
      n.options = q.options.map(String); n.answer = q.answer.map(String);
    } else if (q.type === 'numpad') {
      n.answer = String(q.answer);
    } else {
      n.options = (q.type === 'tf' && !q.options) ? ['True', 'False'] : q.options.map(String);
      n.answer = String(q.answer);
    }
    return n;
  }

  /** Problems with a normalized question ([] = fine). */
  function validate(n) {
    var p = [];
    if (!n || typeof n.text !== 'string' || !n.text) p.push('text');
    if (TYPES.indexOf(n && n.type) < 0) { p.push('type'); return p; }
    if (AUDIO_RE.test(n.text)) p.push('audio');
    if (!n.hint) p.push('hint');
    function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }).length === a.length; }
    switch (n.type) {
      case 'choice': case 'count': case 'tf':
        if (!Array.isArray(n.options) || n.options.length < 2 || !uniq(n.options)) p.push('options');
        else if (n.options.indexOf(n.answer) < 0) p.push('answer-not-in-options');
        if (n.type === 'tf' && (n.options || []).join() !== 'True,False') p.push('tf-options');
        break;
      case 'numpad':
        if (!/^\d{1,3}$/.test(String(n.answer))) p.push('numpad-answer');
        break;
      case 'order':
        if (!Array.isArray(n.options) || !Array.isArray(n.answer) || n.options.length < 2) p.push('order');
        else if (n.options.slice().sort().join('|') !== n.answer.slice().sort().join('|')) p.push('order-mismatch');
        break;
      case 'build':
        if (typeof n.answer !== 'string' || !n.answer || !Array.isArray(n.options)) { p.push('build'); break; }
        var pool = n.options.slice();
        n.answer.split('').forEach(function (ch) { var i = pool.indexOf(ch); if (i < 0) p.push('build-missing-' + ch); else pool.splice(i, 1); });
        break;
      case 'match':
        if (!Array.isArray(n.pairs) || n.pairs.length < 2) { p.push('pairs'); break; }
        var L = n.pairs.map(function (x) { return x[0]; }), R = n.pairs.map(function (x) { return x[1]; });
        if (!uniq(L) || !uniq(R)) p.push('pairs-dup');
        if (!n.rights || n.rights.slice().sort().join('|') !== R.slice().sort().join('|')) p.push('rights');
        break;
    }
    return p;
  }

  /* ------------------------------------------------------------------ answer checking (for the UI) */

  /** Whole answer: choice/tf/count → option string; numpad → digits; order → array; build → string or letters;
   * match → array of [left, right]. */
  function check(n, resp) {
    switch (n.type) {
      case 'numpad': return /^\d+$/.test(String(resp)) && +resp === +n.answer;
      case 'order': return Array.isArray(resp) && resp.join('\u0001') === n.answer.join('\u0001');
      case 'build': return (Array.isArray(resp) ? resp.join('') : String(resp)) === n.answer;
      case 'match':
        if (!Array.isArray(resp) || resp.length !== n.pairs.length) return false;
        return n.pairs.every(function (p) { return resp.some(function (r) { return r && r[0] === p[0] && r[1] === p[1]; }); });
      default: return resp === n.answer;
    }
  }
  /** Step checks: the k-th tile of an order/build answer, or one match pair. */
  function checkStep(n, k, value) {
    if (n.type === 'order') return n.answer[k] === value;
    if (n.type === 'build') return n.answer.charAt(k) === value;
    return false;
  }
  function checkPair(n, left, right) { return n.pairs.some(function (p) { return p[0] === left && p[1] === right; }); }

  /* ------------------------------------------------------------------ what to ask */

  var _usable = {};
  /** Does this skill have at least one question we can show? (en-letters / sight words are audio-only.) */
  function usableSkill(subject, skill) {
    var key = subject + ':' + skill;
    if (key in _usable) return _usable[key];
    var m = MODS[subject], ok = false;
    if (m.generated) {
      var r = RNG.rng('probe:' + key);
      for (var d = 1; d <= 3 && !ok; d++) for (var t = 0; t < 5 && !ok; t++) ok = supported(m.generate(skill, d, r));
    } else ok = (m.bank || []).some(function (q) { return q.skill === skill && supported(q); });
    _usable[key] = ok;
    return ok;
  }

  /** Skills + difficulty for a gate before level i (1–29) in a subject: Salah moves through the curriculum as he
   * moves through the worlds. → [{ skill, d }] */
  function plan(subject, i) {
    var m = MODS[subject], n = m.levels.length;
    var world = LV.LEVELS[clamp(i, 0, LV.COUNT - 1)].world;
    var k = Math.round(clamp((i - 1) / (LV.COUNT - 2), 0, 1) * (n - 1));
    var out = [];
    for (var w = WINDOW; out.length === 0 && w <= n; w++) {
      // widen backwards first, then forwards (e.g. English starts with audio-only letter levels)
      for (var j = Math.max(0, k - w + 1); j <= Math.min(n - 1, k + w - WINDOW); j++) {
        var lv = m.levels[j];
        lv.skills.forEach(function (s) {
          if (!usableSkill(subject, s)) return;
          var d = clamp(Math.max(lv.diff, WORLD_D[world - 1]), 1, 3);
          if (!out.some(function (o) { return o.skill === s && o.d === d; })) out.push({ skill: s, d: d });
        });
      }
    }
    return out;
  }

  function sig(q) { return q.text + '|' + (q.pic || '') + '|' + (q.passage || '') + '|' + JSON.stringify(q.options || q.pairs || ''); }

  /** One question of skill near difficulty d, not in `avoid` (ids or signatures). Normalized, or null. */
  function draw(subject, skill, d, r, avoid) {
    var m = MODS[subject];
    avoid = avoid || {};
    function fresh(n) { return !avoid[n.id] && !avoid['s:' + sig(n)]; }
    if (m.generated) {
      var last = null;
      for (var t = 0; t < 40; t++) {
        var q = m.generate(skill, d, r);
        if (!supported(q)) continue;
        var n = normalize(q, subject);
        if (validate(n).length) continue;
        last = n;
        if (fresh(n)) return n;
      }
      return last;
    }
    var order = [d, d - 1, d + 1, d - 2, d + 2].filter(function (x) { return x >= 1 && x <= 3; });
    for (var i = 0; i < order.length; i++) {
      var pool = (m.bank || []).filter(function (q) { return q.skill === skill && q.d === order[i] && supported(q); })
        .map(function (q) { return normalize(q, subject); })
        .filter(function (n2) { return fresh(n2) && !validate(n2).length; });
      if (pool.length) return r.pick(pool);
    }
    return null;
  }

  /**
   * Questions for the gate before level i.
   * opts: { subjects: ['math', …] (enabled), recent: [ids] (save.quizStats.recent), seed, size }
   * → { level: i, kind: 'big'|'normal', questions: [normalized…] }
   */
  function makeGate(i, opts) {
    opts = opts || {};
    var subs = (opts.subjects || SUBJECTS).filter(function (s) { return SUBJECTS.indexOf(s) >= 0; });
    if (!subs.length) subs = SUBJECTS.slice();
    var big = LV.isBoss(i) || LV.isWorldStart(i);
    var size = opts.size || (big ? 5 : (LV.LEVELS[i].world <= 2 ? 2 : 3));
    var r = RNG.rng('gate:' + i + ':' + (opts.seed || 0));
    var avoid = {}, recentAvoid = {};
    (opts.recent || []).forEach(function (id) { recentAvoid[id] = true; });
    var qs = [], usedSkills = {};
    for (var j = 0; j < size * 3 && qs.length < size; j++) {
      var subject = subs[(i + qs.length + Math.floor(j / size)) % subs.length];
      var p = plan(subject, i);
      if (!p.length) continue;
      // prefer a skill not used yet in this gate
      var fresh = p.filter(function (x) { return !usedSkills[subject + x.skill]; });
      var pick = r.pick(fresh.length ? fresh : p);
      var all = {};
      for (var k in avoid) all[k] = true;
      for (var k2 in recentAvoid) all[k2] = true;
      var q = draw(subject, pick.skill, pick.d, r, all) || draw(subject, pick.skill, pick.d, r, avoid);
      if (!q || avoid[q.id] || avoid['s:' + sig(q)]) continue;
      avoid[q.id] = true; avoid['s:' + sig(q)] = true;
      usedSkills[subject + pick.skill] = true;
      qs.push(q);
    }
    return { level: i, kind: big ? 'big' : 'normal', questions: qs };
  }

  return {
    SUBJECTS: SUBJECTS, TYPES: TYPES, WORLD_D: WORLD_D, AUDIO_RE: AUDIO_RE, modules: MODS,
    needsAudio: needsAudio, supported: supported, normalize: normalize, validate: validate,
    check: check, checkStep: checkStep, checkPair: checkPair,
    usableSkill: usableSkill, plan: plan, draw: draw, makeGate: makeGate
  };
});
