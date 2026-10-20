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
const ORIGINAL_IDS = ['dream-house', 'bridge-car', 'delivery-robot', 'light-town', 'gear-factory', 'rescue-bridge', 'crane-tower', 'windmill-farm', 'race-track', 'harbor', 'night-city', 'workshop'];

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

test('fake clock: all 52 weeks open from the anchor (OPEN_NOW = 52, all weeks opened 20 Oct 2026)', () => {
  const d = S.defaults();
  assert.strictEqual(W.OPEN_NOW, 52);
  assert.strictEqual(projects.length, 52);
  for (let i = 0; i < 52; i++) assert.ok(W.isProjectUnlocked(d, i, WEEK0), 'week ' + (i + 1) + ' open');
  assert.ok(!W.isProjectUnlocked(d, 52, WEEK0), 'no week 53');
  for (let i = 0; i < 52; i++) assert.strictEqual(W.opensOn(i).toISOString(), '2026-10-19T00:00:00.000Z');
  assert.ok(W.allOpen(d, WEEK0, projects.length));
  assert.ok(W.allOpen(d, at('2026-10-19T00:00:00Z'), projects.length), 'open from the anchor on');
  // before the anchor nothing is open
  assert.ok(!W.isProjectUnlocked(d, 0, at('2026-10-01T00:00:00Z')));
});

test('"This week\'s project" = first open project not finished yet (in order); falls back to the newest open one', () => {
  const st = S.createStore();
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length, projects), 0);
  const finish = (n) => { const p = projects[n], ids = p.steps.map((s) => s.id); ids.forEach((id) => st.setStepStars(p.id, id, 3, ids)); };
  finish(0); finish(1);
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length, projects), 2);
  for (let n = 2; n < 30; n++) finish(n);
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length, projects), 30, 'next unfinished week (all are open)');
  for (let n = 30; n < 52; n++) finish(n);
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length, projects), 51, 'all done → newest open');
  assert.strictEqual(W.currentWeek(st.data, plus(WEEK0, 7), projects.length, projects), 51, 'still clamped to week 52');
  assert.strictEqual(W.currentWeek(st.data, at('2027-06-01T00:00:00Z'), projects.length), projects.length - 1);
});

test('progress saved before the update is kept (same project + step ids)', () => {
  const mem = {}, storage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  const old = S.createStore(storage);
  const p0 = projects[0], p3 = projects[3];
  p0.steps.forEach((s) => old.setStepStars(p0.id, s.id, 3, p0.steps.map((x) => x.id)));
  old.setStepStars(p3.id, p3.steps[0].id, 2, p3.steps.map((x) => x.id));
  const again = S.createStore(storage);   // reload from storage (sanitize)
  assert.strictEqual(again.projectProgress(p0.id).done, true);
  p0.steps.forEach((s) => assert.strictEqual(again.projectProgress(p0.id).steps[s.id], 3));
  assert.strictEqual(again.projectProgress(p3.id).steps[p3.steps[0].id], 2);
  // the first 12 projects keep their original ids so saves on the phones still match
  assert.deepStrictEqual(projects.slice(0, 12).map((p) => p.id), ORIGINAL_IDS);
});

test('countdown: days until next Monday 00:00 UTC', () => {
  assert.strictEqual(W.untilNextWeek(at('2026-10-19T00:00:00Z')).days, 7);
  assert.strictEqual(W.untilNextWeek(WEEK0).days, 5);           // Wed 10:00 → Mon = 4 d 14 h → 5
  assert.strictEqual(W.untilNextWeek(at('2026-10-25T23:00:00Z')).days, 1);
  assert.strictEqual(W.untilNextWeek(WEEK0).at.toISOString(), '2026-10-26T00:00:00.000Z');
});

test('parent: early unlock stays harmless with all weeks open, and "jump to week" still works (PIN-protected parent panel)', () => {
  const st = S.createStore();
  assert.ok(W.allOpen(st.data, WEEK0, projects.length), 'everything open without a parent unlock');
  st.setWeeklyUnlockedMax(44);
  for (let i = 0; i < 52; i++) assert.ok(W.isProjectUnlocked(st.data, i, WEEK0), 'week ' + (i + 1));
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length, projects), 0, 'unlocking does not change this week');
  st.setWeeklyUnlockedMax(projects.length - 1);
  assert.ok(W.allOpen(st.data, WEEK0, projects.length), 'open all weeks');
  st.setWeeklyUnlockedMax(-1);
  st.setCurrentWeekForce(40);
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length, projects), 40);
  assert.ok(W.isProjectUnlocked(st.data, 40, WEEK0), 'jumping opens that week');
  st.setCurrentWeekForce(null);
  assert.ok(W.isProjectUnlocked(st.data, 40, WEEK0), 'all weeks stay open');
  assert.strictEqual(W.currentWeek(st.data, WEEK0, projects.length, projects), 0);
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

test('exactly 52 projects, one per week, 4–6 steps each, unique ids, short titles, story lines', () => {
  assert.strictEqual(projects.length, 52, 'projects: ' + projects.length);
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
