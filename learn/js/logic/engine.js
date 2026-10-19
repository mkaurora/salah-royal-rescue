/* Level engine: question pools (bank / generators + parent edits, disabled and custom questions),
 * adaptive difficulty, the stuck "swap for an easier one", and star scoring. Pure logic, UMD. */
(function (root, factory) {
  var mod = factory(root.SQ && root.SQ.rng || (typeof require === 'function' ? require('../core/rng.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.engine = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  var MIN_Q = 5, MAX_Q = 8;
  var STREAK_DOWN = 2;   // questions in a row not solved first try → easier
  var STREAK_UP = 3;     // questions in a row solved first try → harder

  /** 3 = ≥90 % first-try correct, 2 = ≥70 %, 1 = finished. */
  function stars(firstTry, total) {
    if (!total) return 1;
    var r = firstTry / total;
    return r >= 0.9 ? 3 : r >= 0.7 ? 2 : 1;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function clone(q) { return JSON.parse(JSON.stringify(q)); }
  function levelKey(subject, index) { return subject + ':' + index; }

  /** A question with the parent's edits applied (and marked .edited). */
  function applyEdit(q, state) {
    var e = state && state.edits && state.edits[q.id];
    if (!e) return q;
    var c = clone(q);
    ['text', 'options', 'answer', 'hint', 'pic'].forEach(function (k) { if (e[k] !== undefined) c[k] = clone(e[k]); });
    if (e.text !== undefined) c.say = [c.text];
    if (e.hint !== undefined) c.hintSay = [c.hint];
    c.edited = true;
    return c;
  }
  function isDisabled(state, id) { return !!(state && state.disabled && state.disabled[id]); }

  /** Bank questions of a skill at difficulty d (or any d when d is null), edits applied, disabled removed. */
  function bankPool(mod, skill, d, state) {
    return (mod.bank || []).filter(function (q) {
      return q.skill === skill && (d === null || d === undefined || q.d === d) && !isDisabled(state, q.id);
    }).map(function (q) { return applyEdit(q, state); });
  }

  /** Enabled custom questions the parent added to a level. */
  function customFor(state, subject, index, includeDisabled) {
    var list = (state && state.custom && state.custom[levelKey(subject, index)]) || [];
    return list.filter(function (q) { return includeDisabled || !isDisabled(state, q.id); }).map(function (q) { return applyEdit(q, state); });
  }

  /** Everything a level can show, for the admin editor: bank questions of its skills (or generated samples) + custom. */
  function levelCatalog(mod, subject, index, state) {
    var lv = mod.levels[index], out = [];
    if (mod.generated) {
      var r = RNG.rng('sample:' + subject + ':' + index);
      lv.skills.forEach(function (s) { for (var i = 0; i < 4; i++) out.push(mod.generate(s, lv.diff, r)); });
    } else {
      lv.skills.forEach(function (s) {
        (mod.bank || []).forEach(function (q) { if (q.skill === s) out.push(applyEdit(q, state)); });
      });
    }
    customFor(state, subject, index, true).forEach(function (q) { out.push(q); });
    return out.map(function (q) { var c = {}; for (var k in q) c[k] = q[k]; c.disabled = isDisabled(state, q.id); return c; });
  }

  /** Initial per-skill difficulty offset from the saved rolling accuracy. */
  function initialOffset(state, skill) {
    var st = state && state.skills && state.skills[skill];
    var rec = st && st.recent || [];
    if (rec.length >= 5) {
      var acc = rec.reduce(function (a, b) { return a + b; }, 0) / rec.length;
      if (acc < 0.5) return -1;
      if (rec.length >= 6 && acc >= 0.9) return 1;
    }
    return 0;
  }

  /**
   * One play of a level.
   * opts: { mod, subject, index, state, seed, count }
   */
  function LevelRun(opts) {
    this.mod = opts.mod;
    this.subject = opts.subject || opts.mod.subject;
    this.index = opts.index;
    this.level = this.mod.levels[this.index];
    this.state = opts.state || {};
    var per = opts.count || (this.state.settings && this.state.settings.perLevel) || 6;
    this.count = clamp(per | 0, MIN_Q, MAX_Q);
    this.rng = RNG.rng(opts.seed === undefined ? 'run' : opts.seed);
    this.used = {};
    this.results = [];
    this.adapt = {};
    var self = this;
    this.level.skills.forEach(function (s) { self.adapt[s] = { offset: initialOffset(self.state, s), wrongRun: 0, rightRun: 0 }; });
    // plan: custom questions spread through the level, the rest drawn per skill
    var customs = customFor(this.state, this.subject, this.index).slice(0, this.count);
    this.plan = [];
    for (var i = 0; i < this.count; i++) this.plan.push({ skill: this.level.skills[i % this.level.skills.length] });
    customs.forEach(function (q, k) {
      var pos = customs.length === 1 ? 0 : Math.round(k * (self.count - 1) / Math.max(1, customs.length - 1));
      while (self.plan[pos].custom) pos = (pos + 1) % self.count;
      self.plan[pos] = { custom: q, skill: q.skill };
    });
    this.pos = 0;
    this.cur = null;
    this.next();
  }

  LevelRun.prototype.difficultyFor = function (skill) {
    var a = this.adapt[skill] || { offset: 0 };
    return clamp(this.level.diff + a.offset, 1, 3);
  };

  /** Draw a question of `skill` near difficulty d that hasn't been used in this run. */
  LevelRun.prototype.draw = function (skill, d, avoid) {
    var self = this;
    avoid = avoid || {};
    function fresh(q) { return !self.used[q.id] && !self.used[sig(q)] && !avoid[q.id]; }
    if (this.mod.generated && this.mod.skills[skill]) {
      var q = null, t;
      for (t = 0; t < 25; t++) { q = this.mod.generate(skill, d, this.rng); if (fresh(q) && !isDisabled(this.state, q.id)) return q; }
      // small pools (e.g. 4 coins): allow the same prompt again, but never the identical question
      for (t = 0; t < 40; t++) { q = this.mod.generate(skill, d, this.rng); if (!self.used[q.id] && !avoid[q.id]) return q; }
      return q;
    }
    var order = [d, d - 1, d + 1, d - 2, d + 2].filter(function (x) { return x >= 1 && x <= 3; });
    for (var i = 0; i < order.length; i++) {
      var pool = bankPool(this.mod, skill, order[i], this.state).filter(fresh);
      if (pool.length) return this.rng.pick(pool);
    }
    var any = bankPool(this.mod, skill, null, this.state).filter(function (q) { return !avoid[q.id]; });
    if (any.length) return this.rng.pick(any);
    return null;
  };

  /** Bank questions: same prompt AND same answers = a repeat. Generated: the same prompt is a repeat (8 + 3 vs 8 + 3). */
  function sig(q) {
    return 't:' + q.text + '|' + q.pic + '|' + (q.say || []).join(' ') + '|' + (q.passage || '') +
      (q.gen ? '' : '|' + JSON.stringify(q.pairs || q.options || ''));
  }

  LevelRun.prototype.markUsed = function (q) {
    this.used[q.id] = true;
    this.used[sig(q)] = true;
  };

  /** Advance to the next question; returns it (null when the level is finished). */
  LevelRun.prototype.next = function () {
    if (this.pos >= this.count) { this.cur = null; return null; }
    var slot = this.plan[this.pos];
    var q = slot.custom || this.draw(slot.skill, this.difficultyFor(slot.skill));
    if (!q) { // nothing left in this skill (everything disabled?) → any other level skill
      for (var i = 0; i < this.level.skills.length && !q; i++) q = this.draw(this.level.skills[i], this.level.diff);
    }
    if (!q) { this.count = this.pos; this.cur = null; return null; }
    this.markUsed(q);
    this.cur = q;
    return q;
  };

  LevelRun.prototype.current = function () { return this.cur; };
  LevelRun.prototype.number = function () { return this.pos + 1; };
  LevelRun.prototype.done = function () { return this.pos >= this.count; };

  /** Record the result of the current question and move on. r: { firstTry, wrongs, ms, swapped } */
  LevelRun.prototype.answer = function (r) {
    var q = this.cur;
    if (!q) return null;
    var first = !!r.firstTry && !q._swapped;
    this.results.push({ id: q.id, skill: q.skill, d: q.d, firstTry: first, wrongs: r.wrongs || 0, ms: r.ms || 0, swapped: !!q._swapped });
    var a = this.adapt[q.skill];
    if (a) {
      if (first) {
        a.wrongRun = 0; a.rightRun++;
        if (a.rightRun >= STREAK_UP) { a.offset = Math.min(1, a.offset + 1); a.rightRun = 0; }
      } else {
        a.rightRun = 0; a.wrongRun++;
        if (a.wrongRun >= STREAK_DOWN) { a.offset = Math.max(-2, a.offset - 1); a.wrongRun = 0; }
      }
    }
    this.pos++;
    return this.next();
  };

  /** Stuck: swap the current question for an easier one of the SAME skill. Returns the new question. */
  LevelRun.prototype.swapEasier = function () {
    var q = this.cur;
    if (!q) return null;
    var skill = this.mod.skills[q.skill] ? q.skill : this.level.skills[0];
    var d = Math.max(1, (q.d || 1) - 1);
    var avoid = {}; avoid[q.id] = true;
    var n = this.draw(skill, d, avoid);
    if (!n || n.id === q.id) return q;
    n = clone(n);
    n._swapped = true;
    this.markUsed(n);
    this.cur = n;
    var a = this.adapt[skill];
    if (a) { a.offset = Math.max(-2, a.offset - 1); a.rightRun = 0; a.wrongRun = 0; }
    return n;
  };

  LevelRun.prototype.summary = function () {
    var first = this.results.filter(function (r) { return r.firstTry; }).length;
    var ms = this.results.reduce(function (s, r) { return s + r.ms; }, 0);
    return { total: this.results.length, firstTry: first, stars: stars(first, this.results.length), ms: ms, results: this.results.slice() };
  };

  return {
    stars: stars, LevelRun: LevelRun, bankPool: bankPool, customFor: customFor, levelCatalog: levelCatalog,
    applyEdit: applyEdit, levelKey: levelKey, initialOffset: initialOffset, MIN_Q: MIN_Q, MAX_Q: MAX_Q,
    STREAK_DOWN: STREAK_DOWN, STREAK_UP: STREAK_UP
  };
});
