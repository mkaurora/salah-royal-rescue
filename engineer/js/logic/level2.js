/* Level 2 (v4): progression rules. Pure (browser + Node), works on the save's `level2` object.
 *
 * Three tracks (a = Engineer Challenges, b = Thinking Puzzles, c = Science Lab), each a list of stages split into
 * tiers of TIER_SIZE (Bronze, Silver, Gold).
 *   - Stage 0 of a track is open. Inside a tier the next stage opens when the one before has a star.
 *   - The first stage of the next tier opens by MASTERY: at least MASTERY_NEED stages of the tier before with 3 stars
 *     ("Get 3 stars on 3 bridges to open Silver!") — and the stage before it has a star.
 *   - A parent can open any stage (open[track] = highest index opened).
 * Adaptive help (failed tries on a stage): HINT_AT → hint, SHOWME_AT → offer Show Me, EASIER_AT → offer an easier
 * version (counts for at most EASY_MAX_STARS stars). A relaxed timer (stage.timeLimit seconds) only decides the 3rd star
 * and never fails; parents can switch timers off.
 * Save: data.level2 = { v, stars: { stageId: 0..3 }, open: { a, b, c }, lessons: { topic: true }, fails: { stageId: n },
 *   timers: bool, easy: { stageId: true } }. migrate() turns anything (old save without it, junk) into a valid object. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.level2 = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var VERSION = 1;
  var TRACK_IDS = ['a', 'b', 'c'];
  var TIERS = ['Bronze', 'Silver', 'Gold'];
  var TIER_SIZE = 4;
  var MASTERY_NEED = 3;           // 3-star stages needed in a tier to open the next tier
  var HINT_AT = 2, SHOWME_AT = 4, EASIER_AT = 6;
  var EASY_MAX_STARS = 2;
  var BONUS_FAST_MS = 90000;      // 3 stars within 90 s → "Try the bonus!" (stages that have one)

  function clampStars(n) { n = Math.floor(Number(n) || 0); return n < 0 ? 0 : n > 3 ? 3 : n; }
  function isInt(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }
  function okId(k) { return typeof k === 'string' && /^[a-z0-9_-]{1,24}$/i.test(k); }

  function defaults() {
    return { v: VERSION, stars: {}, open: { a: -1, b: -1, c: -1 }, lessons: {}, fails: {}, timers: true, easy: {} };
  }

  /** Any stored value → a valid level2 object (old saves have none; future fields are dropped safely). */
  function migrate(raw) {
    var out = defaults();
    if (!raw || typeof raw !== 'object') return out;
    if (raw.stars && typeof raw.stars === 'object') Object.keys(raw.stars).forEach(function (k) { if (okId(k)) { var s = clampStars(raw.stars[k]); if (s) out.stars[k] = s; } });
    if (raw.open && typeof raw.open === 'object') TRACK_IDS.forEach(function (t) { if (isInt(raw.open[t]) && raw.open[t] >= -1) out.open[t] = Math.min(raw.open[t], 99); });
    if (raw.lessons && typeof raw.lessons === 'object') Object.keys(raw.lessons).forEach(function (k) { if (okId(k) && raw.lessons[k]) out.lessons[k] = true; });
    if (raw.fails && typeof raw.fails === 'object') Object.keys(raw.fails).forEach(function (k) { if (okId(k) && isInt(raw.fails[k]) && raw.fails[k] > 0) out.fails[k] = Math.min(raw.fails[k], 999); });
    if (raw.easy && typeof raw.easy === 'object') Object.keys(raw.easy).forEach(function (k) { if (okId(k) && raw.easy[k]) out.easy[k] = true; });
    out.timers = raw.timers !== false;
    return out;
  }

  function tierOf(i) { return Math.floor(i / TIER_SIZE); }
  function tierName(t) { return TIERS[t] || TIERS[TIERS.length - 1]; }
  function tierCount(stages) { return Math.ceil(stages.length / TIER_SIZE); }
  function tierStages(stages, t) { return stages.slice(t * TIER_SIZE, (t + 1) * TIER_SIZE); }
  function getStars(l2, id) { return (l2.stars && l2.stars[id]) || 0; }

  /** { three: stages with 3 stars, need, size, done: three >= need } for tier t. */
  function mastery(l2, stages, t) {
    var list = tierStages(stages, t);
    var three = list.filter(function (s) { return getStars(l2, s.id) >= 3; }).length;
    var need = Math.min(MASTERY_NEED, list.length);
    return { three: three, need: need, size: list.length, done: three >= need };
  }
  /** Is tier t of this track open? Tier 0 always; later tiers by mastery of the tier before (or a parent). */
  function isTierOpen(l2, track, stages, t) {
    if (t <= 0) return true;
    if ((l2.open[track] === undefined ? -1 : l2.open[track]) >= t * TIER_SIZE) return true;
    return isTierOpen(l2, track, stages, t - 1) && mastery(l2, stages, t - 1).done;
  }
  function isStageOpen(l2, track, stages, i) {
    if (i < 0 || i >= stages.length) return false;
    if ((l2.open[track] === undefined ? -1 : l2.open[track]) >= i) return true;
    if (i === 0) return true;
    if (!isTierOpen(l2, track, stages, tierOf(i))) return false;
    return getStars(l2, stages[i - 1].id) > 0;
  }
  /** Why is stage i locked? 'open' | 'previous' (finish the one before) | 'mastery' (3 stars on more stages of the tier before). */
  function lockReason(l2, track, stages, i) {
    if (isStageOpen(l2, track, stages, i)) return 'open';
    if (!isTierOpen(l2, track, stages, tierOf(i))) return 'mastery';
    return 'previous';
  }
  /** Where to continue: the first open stage without stars (else the last open one). */
  function nextStage(l2, track, stages) {
    var last = 0;
    for (var i = 0; i < stages.length; i++) {
      if (!isStageOpen(l2, track, stages, i)) break;
      last = i;
      if (!getStars(l2, stages[i].id)) return i;
    }
    return last;
  }

  /** Adaptive help after `fails` failed tries: 'none' | 'hint' | 'showme' | 'easier'. */
  function helpFor(fails, hasEasy) {
    if (fails >= EASIER_AT && hasEasy) return 'easier';
    if (fails >= SHOWME_AT) return 'showme';
    if (fails >= HINT_AT) return 'hint';
    return 'none';
  }

  /** Final stars of a win: the relaxed timer only takes the 3rd star; the easier version gives at most 2. */
  function finalStars(stars, opts) {
    opts = opts || {};
    var s = clampStars(stars);
    if (opts.timersOn !== false && opts.limitSec && opts.usedSec > opts.limitSec && s > 2) s = 2;
    if (opts.easy && s > EASY_MAX_STARS) s = EASY_MAX_STARS;
    return Math.max(1, s);
  }
  /** Offer "Try the bonus!" after a quick 3-star win on a stage that has a bonus variant. */
  function offerBonus(stage, stars, usedMs) { return !!(stage && stage.bonus) && stars >= 3 && usedMs <= BONUS_FAST_MS; }

  /** Record a result (keeps the best). */
  function record(l2, id, stars) {
    var s = clampStars(stars);
    if (s > getStars(l2, id)) l2.stars[id] = s;
    delete l2.fails[id];
    return getStars(l2, id);
  }
  function addFail(l2, id) { l2.fails[id] = (l2.fails[id] || 0) + 1; return l2.fails[id]; }

  /* ---------- parent helpers ---------- */
  function unlockTo(l2, track, i) { if (TRACK_IDS.indexOf(track) >= 0 && i > (l2.open[track] === undefined ? -1 : l2.open[track])) l2.open[track] = Math.floor(i); }
  function unlockAll(l2, counts) { TRACK_IDS.forEach(function (t) { if (counts[t]) unlockTo(l2, t, counts[t] - 1); }); }
  function setStarsExact(l2, track, stages, i, stars) {
    var st = stages[i];
    if (!st) return;
    var s = clampStars(stars);
    if (s) l2.stars[st.id] = s; else delete l2.stars[st.id];
    unlockTo(l2, track, i);
  }
  /** Erase all Level 2 progress (keeps the parent's timer choice). */
  function reset(l2) {
    var timers = l2.timers;
    var d = defaults();
    Object.keys(l2).forEach(function (k) { delete l2[k]; });
    Object.keys(d).forEach(function (k) { l2[k] = d[k]; });
    l2.timers = timers;
    return l2;
  }

  /** Small summary per track for the hub / parent area. */
  function summary(l2, track, stages) {
    var stars = 0, done = 0, three = 0;
    stages.forEach(function (s) { var n = getStars(l2, s.id); stars += n; if (n) done++; if (n >= 3) three++; });
    var tiers = tierCount(stages), openTier = 0;
    for (var t = 0; t < tiers; t++) if (isTierOpen(l2, track, stages, t)) openTier = t;
    return { stars: stars, max: stages.length * 3, done: done, three: three, count: stages.length, tier: openTier, tierName: tierName(openTier) };
  }

  return {
    VERSION: VERSION, TRACK_IDS: TRACK_IDS, TIERS: TIERS, TIER_SIZE: TIER_SIZE, MASTERY_NEED: MASTERY_NEED,
    HINT_AT: HINT_AT, SHOWME_AT: SHOWME_AT, EASIER_AT: EASIER_AT, EASY_MAX_STARS: EASY_MAX_STARS, BONUS_FAST_MS: BONUS_FAST_MS,
    defaults: defaults, migrate: migrate, tierOf: tierOf, tierName: tierName, tierCount: tierCount, tierStages: tierStages,
    getStars: getStars, mastery: mastery, isTierOpen: isTierOpen, isStageOpen: isStageOpen, lockReason: lockReason, nextStage: nextStage,
    helpFor: helpFor, finalStars: finalStars, offerBonus: offerBonus, record: record, addFail: addFail,
    unlockTo: unlockTo, unlockAll: unlockAll, setStarsExact: setStarsExact, reset: reset, summary: summary
  };
});
