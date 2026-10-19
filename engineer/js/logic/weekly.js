/* Weekly Big Project logic (v3). Pure: browser + Node tests. The clock is always passed in (`now`: Date or ms),
 * so tests can fake it; the browser uses LE.now().
 *
 * Week n (0-based) opens when floor((now - ANCHOR) / 7 days) >= n. ANCHOR = Monday 2026-10-19 00:00 UTC (week 0).
 * A parent can open weeks early (save.settings.weeklyUnlockedMax) or show week n as "this week"
 * (save.weekly.currentWeekForce, which also opens it).
 * Inside a project, step 0 is open; step k opens once step k-1 has at least 1 star. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.weekly = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ANCHOR = Date.UTC(2026, 9, 19);       // Monday 19 Oct 2026, 00:00 UTC
  var DAY = 24 * 60 * 60 * 1000;
  var WEEK = 7 * DAY;

  function ms(now) { return typeof now === 'number' ? now : (now && now.getTime) ? now.getTime() : Date.now(); }

  /** Calendar week index for a moment (negative before the anchor). */
  function calendarWeek(now) { return Math.floor((ms(now) - ANCHOR) / WEEK); }
  function weekStart(i) { return new Date(ANCHOR + i * WEEK); }

  /** Highest open week: calendar, or a parent's early unlock / "jump to week". */
  function unlockedMax(data, now) {
    var s = (data && data.settings) || {}, w = (data && data.weekly) || {};
    var m = calendarWeek(now);
    if (typeof s.weeklyUnlockedMax === 'number' && s.weeklyUnlockedMax > m) m = s.weeklyUnlockedMax;
    if (typeof w.currentWeekForce === 'number' && w.currentWeekForce > m) m = w.currentWeekForce;
    return m;
  }
  function isProjectUnlocked(data, weekIndex, now) { return weekIndex >= 0 && weekIndex <= unlockedMax(data, now); }

  /** The project shown on the menu as "This Week's Project" (clamped to the projects that exist). */
  function currentWeek(data, now, count) {
    var w = (data && data.weekly) || {};
    var i = typeof w.currentWeekForce === 'number' ? w.currentWeekForce : calendarWeek(now);
    if (count) i = Math.min(i, count - 1);
    return Math.max(0, i);
  }

  /** Whole days until the next Monday 00:00 UTC (1..7), and the exact milliseconds. */
  function untilNextWeek(now) {
    var t = ms(now), next = ANCHOR + (calendarWeek(t) + 1) * WEEK;
    return { ms: next - t, days: Math.max(1, Math.ceil((next - t) / DAY)), at: new Date(next) };
  }

  function stepStars(progress, step) { return (progress && progress.steps && progress.steps[step.id]) || 0; }
  function isStepUnlocked(project, progress, k) {
    if (k <= 0) return true;
    return stepStars(progress, project.steps[k - 1]) > 0;
  }
  /** Index of the step to play next (first without stars), or -1 when every step is done. */
  function nextStep(project, progress) {
    for (var k = 0; k < project.steps.length; k++) if (!stepStars(progress, project.steps[k])) return k;
    return -1;
  }
  function projectStars(project, progress) {
    return project.steps.reduce(function (a, s) { return a + stepStars(progress, s); }, 0);
  }

  function clone(o) { return o === undefined ? o : JSON.parse(JSON.stringify(o)); }

  /** Build the playable level object for a step.
   *  step.level = a full inline level for that world, or step.base = id of a world level to rebuild with a new story
   *  (plus optional step.patch fields). levelsByWorld = { bridges: [...], ... }.
   *  The result is a normal level (same format as js/data/<world>-levels.js) with a weekly id, the step title as
   *  name and the step goal. */
  function resolveStep(project, k, levelsByWorld) {
    var step = project.steps[k];
    var lv;
    if (step.level) lv = clone(step.level);
    else {
      var list = (levelsByWorld && levelsByWorld[step.world]) || [];
      var base = list.filter(function (l) { return l.id === step.base; })[0];
      if (!base) throw new Error('Weekly step ' + project.id + '/' + step.id + ': no ' + step.world + ' level ' + step.base);
      lv = clone(base);
      // A rebuilt level keeps its own guided tutorial only if asked (the story is new).
      if (!step.keepTutorial) delete lv.tutorial;
      if (step.patch) Object.keys(step.patch).forEach(function (key) { lv[key] = clone(step.patch[key]); });
    }
    lv.id = 'wk-' + project.id + '-' + step.id;
    lv.name = step.title;
    lv.goal = step.goal;
    if (step.hint) lv.hint = step.hint;
    lv.weekly = { project: project.id, step: step.id, index: k };
    return lv;
  }

  return {
    ANCHOR: ANCHOR, DAY: DAY, WEEK: WEEK,
    calendarWeek: calendarWeek, weekStart: weekStart, unlockedMax: unlockedMax, isProjectUnlocked: isProjectUnlocked,
    currentWeek: currentWeek, untilNextWeek: untilNextWeek,
    stepStars: stepStars, isStepUnlocked: isStepUnlocked, nextStep: nextStep, projectStars: projectStars,
    resolveStep: resolveStep
  };
});
