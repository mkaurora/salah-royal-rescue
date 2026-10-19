/* Weekly Big Project (v3): unlock math with a fake clock, parent overrides, project data, and every step
 * solved with 3 stars through the real world logic (bridge solver, machine sim, circuit solver, robot
 * interpreter, construction rules). Construction steps are also checked to be optimal (BFS) so par is fair. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const W = require('../js/logic/weekly.js');
const S = require('../js/logic/save.js');
const { projects } = require('../js/data/weekly-projects.js');

const WORLDS = ['bridges', 'machines', 'circuits', 'robot', 'construction'];
const levels = {}, logic = {}, content = {};
WORLDS.forEach((w) => {
  levels[w] = require('../js/data/' + w + '-levels.js').levels;
  logic[w] = require('../js/logic/' + w + '.js');
  content[w] = require('../js/data/' + w + '-content.js');
});
const at = (iso) => new Date(iso);
const WEEK0 = at('2026-10-21T10:00:00Z');
const plus = (d, days) => new Date(d.getTime() + days * W.DAY);

test('anchor is Monday 2026-10-19 00:00 UTC (week 0)', () => {
  const a = new Date(W.ANCHOR);
  assert.strictEqual(a.toISOString(), '2026-10-19T00:00:00.000Z');
  assert.strictEqual(a.getUTCDay(), 1, 'Monday');
  assert.strictEqual(W.calendarWeek(at('2026-10-19T00:00:00Z')), 0);
  assert.strictEqual(W.calendarWeek(at('2026-10-25T23:59:59Z')), 0);
  assert.strictEqual(W.calendarWeek(at('2026-10-26T00:00:00Z')), 1);
  assert.strictEqual(W.calendarWeek(at('2026-10-18T23:59:59Z')), -1);
  assert.strictEqual(W.calendarWeek(W.ANCHOR + 11 * W.WEEK), 11);
});

test('fake clock: week 0 open, week 1 locked; +7 days opens week 1', () => {
  const d = S.defaults();
  assert.ok(W.isProjectUnlocked(d, 0, WEEK0));
  assert.ok(!W.isProjectUnlocked(d, 1, WEEK0));
  assert.strictEqual(W.currentWeek(d, WEEK0, projects.length), 0);
  const next = plus(WEEK0, 7);
  assert.ok(W.isProjectUnlocked(d, 1, next));
  assert.ok(!W.isProjectUnlocked(d, 2, next));
  assert.strictEqual(W.currentWeek(d, next, projects.length), 1);
  // before the anchor nothing is open; long after, the last project stays "this week"
  assert.ok(!W.isProjectUnlocked(d, 0, at('2026-10-01T00:00:00Z')));
  assert.strictEqual(W.currentWeek(d, at('2027-06-01T00:00:00Z'), projects.length), projects.length - 1);
});

test('countdown: days until next Monday 00:00 UTC', () => {
  assert.strictEqual(W.untilNextWeek(at('2026-10-19T00:00:00Z')).days, 7);
  assert.strictEqual(W.untilNextWeek(WEEK0).days, 5);           // Wed 10:00 → Mon = 4 d 14 h → 5
  assert.strictEqual(W.untilNextWeek(at('2026-10-25T23:00:00Z')).days, 1);
  assert.strictEqual(W.untilNextWeek(WEEK0).at.toISOString(), '2026-10-26T00:00:00.000Z');
});

test('parent: force-unlock a future week and "jump to week"', () => {
  const st = S.createStore();
  assert.ok(!W.isProjectUnlocked(st.data, 3, WEEK0));
  st.setWeeklyUnlockedMax(3);
  for (let i = 0; i <= 3; i++) assert.ok(W.isProjectUnlocked(st.data, i, WEEK0), 'week ' + i);
  assert.ok(!W.isProjectUnlocked(st.data, 4, WEEK0));
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length), 0, 'unlocking does not change this week');
  st.setCurrentWeekForce(6);
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length), 6);
  assert.ok(W.isProjectUnlocked(st.data, 6, WEEK0), 'jumping opens that week');
  st.setCurrentWeekForce(null);
  st.setWeeklyUnlockedMax(-1);
  assert.ok(!W.isProjectUnlocked(st.data, 1, WEEK0));
});

test('steps open in order; project done when every step has stars', () => {
  const p = projects[0], st = S.createStore(), ids = p.steps.map((s) => s.id);
  assert.ok(W.isStepUnlocked(p, st.projectProgress(p.id), 0));
  assert.ok(!W.isStepUnlocked(p, st.projectProgress(p.id), 1));
  assert.strictEqual(W.nextStep(p, st.projectProgress(p.id)), 0);
  st.setStepStars(p.id, ids[0], 1, ids);
  assert.ok(W.isStepUnlocked(p, st.projectProgress(p.id), 1));
  assert.ok(!W.isStepUnlocked(p, st.projectProgress(p.id), 2));
  assert.strictEqual(W.nextStep(p, st.projectProgress(p.id)), 1);
  ids.forEach((id) => st.setStepStars(p.id, id, 3, ids));
  assert.strictEqual(st.projectProgress(p.id).done, true);
  assert.strictEqual(W.nextStep(p, st.projectProgress(p.id)), -1);
  assert.strictEqual(W.projectStars(p, st.projectProgress(p.id)), ids.length * 3);
});

test('at least 12 projects, one per week, 4–6 steps each, unique ids, short titles, story lines', () => {
  assert.ok(projects.length >= 12, 'projects: ' + projects.length);
  const pids = new Set();
  projects.forEach((p, i) => {
    assert.strictEqual(p.weekIndex, i, p.id + ' weekIndex');
    assert.ok(p.id && !pids.has(p.id), 'unique project id ' + p.id);
    pids.add(p.id);
    ['title', 'blurb', 'icon', 'intro', 'done'].forEach((k) => assert.ok(typeof p[k] === 'string' && p[k].length, p.id + ' ' + k));
    assert.ok(p.steps.length >= 4 && p.steps.length <= 6, p.id + ' steps ' + p.steps.length);
    const sids = new Set();
    p.steps.forEach((s) => {
      assert.ok(s.id && !sids.has(s.id), p.id + ' unique step id ' + s.id);
      sids.add(s.id);
      assert.ok(WORLDS.includes(s.world), s.id + ' world');
      assert.ok(s.title && s.title.length <= 16, p.id + '/' + s.id + ' title <= 16 chars');
      assert.ok(s.goal && s.say, p.id + '/' + s.id + ' goal + story');
      assert.ok(!!s.base !== !!s.level, p.id + '/' + s.id + ' either base or inline level');
      if (s.base) assert.ok(levels[s.world].some((l) => l.id === s.base), s.id + ' base ' + s.base + ' exists');
    });
  });
  // themes differ: no two projects share a title, and at least 4 worlds are used overall with inline levels
  assert.strictEqual(new Set(projects.map((p) => p.title)).size, projects.length);
  const inlineWorlds = new Set();
  projects.forEach((p) => p.steps.forEach((s) => { if (s.level) inlineWorlds.add(s.world); }));
  assert.ok(inlineWorlds.has('robot') && inlineWorlds.has('construction'));
});

/** BFS: fewest moves to finish a construction level (all stages). */
function constructionOptimum(lv) {
  const C = logic.construction;
  let total = 0;
  lv.stages.forEach((stage) => {
    const one = { stages: [stage] };
    const acts = stage.type === 'doze' ? ['U', 'D', 'L', 'R'] : stage.type === 'crane' ? ['L', 'R', 'G'] : null;
    if (!acts) { total += C.slots(stage.house).length; return; }
    const s0 = C.init(one), seen = new Set([JSON.stringify(s0.st)]);
    let q = [s0], depth = 0, found = false;
    while (q.length && !found) {
      depth++;
      const nq = [];
      for (const s of q) {
        for (const a of acts) {
          const r = C.act(one, s, a);
          if (!r.ok) continue;
          if (r.state.won) { found = true; break; }
          const k = JSON.stringify(r.state.st);
          if (!seen.has(k)) { seen.add(k); nq.push(r.state); }
        }
        if (found) break;
      }
      q = nq;
    }
    assert.ok(found, 'stage solvable');
    total += depth;
  });
  return total;
}

projects.forEach((p) => {
  p.steps.forEach((s, k) => {
    test(`weekly ${p.weekIndex + 1} ${p.id} / ${s.id}: stored solution earns 3 stars through the ${s.world} logic`, () => {
      const lv = W.resolveStep(p, k, levels);
      assert.strictEqual(lv.name, s.title);
      assert.strictEqual(lv.goal, s.goal);
      assert.ok(lv.hint, 'has a hint');
      assert.ok(lv.solution, 'has a solution');
      assert.deepStrictEqual(lv.weekly, { project: p.id, step: s.id, index: k });
      if (lv.tip) assert.ok(content[s.world].tips[lv.tip], 'tip exists: ' + lv.tip);
      const L = logic[s.world];
      if (s.world === 'construction') {
        lv.stages.forEach((st) => { if (st.type === 'doze') st.map.forEach((row) => assert.strictEqual(row.length, st.map[0].length, 'row width')); });
        assert.strictEqual(lv.solution.length, lv.stages.length, 'one action list per stage');
        const r = L.play(lv, lv.solution);
        assert.ok(r.won, 'wins');
        assert.strictEqual(r.fails, 0, 'no bounced moves');
        assert.strictEqual(r.stars, 3);
        assert.ok(!L.play(lv, []).won, 'doing nothing does not win');
        assert.strictEqual(constructionOptimum(lv), L.par(lv), 'stored solution is optimal, so par is fair');
      } else if (s.world === 'robot') {
        assert.ok(L.validate(lv.solution, lv.blocks), 'only unlocked blocks');
        assert.ok(lv.map[0].length <= 7 && lv.map.length <= 6, 'fits small phones');
        const r = L.check(lv, lv.solution);
        assert.ok(r.ok && !r.result.bump && r.result.allGears, 'reaches the flag with all gears');
        assert.strictEqual(r.stars, 3);
        assert.ok(!L.check(lv, []).ok, 'empty program does not win');
      } else {
        const r = L.check(lv, lv.solution);
        assert.ok(r.ok, 'solves');
        assert.strictEqual(r.stars, 3);
      }
    });
  });
});

test('resolveStep does not change the world levels it borrows from', () => {
  const before = JSON.stringify(levels);
  projects.forEach((p) => p.steps.forEach((s, k) => { const lv = W.resolveStep(p, k, levels); lv.solution = null; lv.goal = 'x'; }));
  assert.strictEqual(JSON.stringify(levels), before);
});
