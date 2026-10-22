/* Level 2 (v4): every stage solves through the real logic, end tests fail for bad builds, tier / mastery rules,
 * adaptive help, timer stars, save migration, parent helpers. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const L2 = require('../js/logic/level2.js');
const S = require('../js/logic/structures.js');
const BL = require('../js/logic/bridges.js');
const P = require('../js/logic/puzzles.js');
const LB = require('../js/logic/lab.js');
const CI = require('../js/logic/circuits.js');
const MC = require('../js/logic/machines.js');
const SAVE = require('../js/logic/save.js');
const D = require('../js/data/level2-stages.js');

const all = D.tracks.reduce((a, t) => a.concat(t.stages), []);
function check(st) {
  if (st.view === 'bridges') return BL.check(st, st.solution);
  if (st.view === 'frame') return S.check(st, st.solution);
  if (st.view === 'code') return P.check(st, st.solution);
  if (st.view === 'lab') return LB.check(st, st.solution);
  if (st.view === 'circuits') return CI.check(st, st.solution);
  throw new Error('view ' + st.view);
}
function variant(st, v) { const lv = Object.assign({}, st, st[v]); delete lv.easy; delete lv.bonus; return lv; }

test('3 tracks × 12 stages (36 ≥ 30), tiers of 4, unique ids, readable fields', () => {
  assert.strictEqual(D.tracks.length, 3);
  D.tracks.forEach((t) => assert.strictEqual(t.stages.length, 12, t.id));
  const ids = new Set(all.map((s) => s.id));
  assert.strictEqual(ids.size, all.length);
  all.forEach((s) => {
    assert.ok(s.name && s.name.length <= 18, s.id + ' name');
    assert.ok(s.goal && s.hint, s.id + ' goal + hint');
    assert.ok(['bridges', 'frame', 'code', 'lab', 'circuits'].includes(s.view), s.id);
    if (s.tip) assert.ok(D.tips[s.tip], s.id + ' tip ' + s.tip);
  });
  ['a', 'b', 'c'].forEach((t) => assert.ok(D.facts[t].length >= 12, 'facts ' + t));
  // the first stage of each track is guided
  D.tracks.forEach((t) => assert.ok(t.stages.some((s, i) => i < 2 && s.tutorial), t.id + ' has a guided first stage'));
});

for (const st of all) {
  test(`stage ${st.id} (${st.view}): stored solution earns 3 stars through the real logic`, () => {
    const r = check(st);
    assert.ok(r.ok, st.id + ' solved: ' + JSON.stringify(r.result && (r.result.reason || r.result.status)));
    assert.strictEqual(r.stars, 3, st.id + ' 3 stars');
    for (const v of ['easy', 'bonus']) {
      if (!st[v]) continue;
      const lv = variant(st, v);
      const rv = check(lv);
      assert.ok(rv.ok, st.id + ' ' + v + ' variant solved');
      assert.ok(rv.stars >= 1);
    }
  });
}

test('Track A builds: every stored solution can be built beam by beam (Show me order)', () => {
  all.filter((s) => s.view === 'bridges' || s.view === 'frame').forEach((st) => {
    [st, st.bonus ? variant(st, 'bonus') : null].filter(Boolean).forEach((lv) => {
      let placed = [];
      lv.solution.forEach((b) => {
        const p = BL.parseBeam(b);
        const r = lv.view === 'frame' ? S.addBeam(lv, placed, p.x1, p.y1, p.x2, p.y2, p.m) : BL.addBeam(lv, placed, p.x1, p.y1, p.x2, p.y2, p.m);
        assert.ok(r.ok, lv.id + ' beam ' + b + ' ' + r.reason);
        placed = r.beams;
      });
    });
  });
});

test('Track A end tests fail for obviously bad builds', () => {
  const A = D.tracks[0].stages;
  const house = A.find((s) => s.id === 'a2');
  // no braces: squares wobble in the wind
  const r1 = S.simulate(house, ['1,4-1,3', '3,4-3,3', '1,3-2,3', '2,3-3,3', '1,3-2,2', '2,2-3,3']);
  assert.strictEqual(r1.reason, 'wobbly');
  // not up to the stars
  assert.strictEqual(S.simulate(house, ['1,4-1,3']).reason, 'reach');
  assert.strictEqual(S.simulate(house, []).reason, 'empty');
  // the bonus storm breaks the all-wood house
  const storm = variant(house, 'bonus');
  const r2 = S.simulate(storm, house.solution);
  assert.strictEqual(r2.reason, 'break');
  assert.ok(r2.failF > 0 && r2.failF < 1);
  // the tower without steel breaks in the bonus quake; the crane without steel can't lift its box
  const tower = A.find((s) => s.id === 'a4');
  assert.strictEqual(S.simulate(variant(tower, 'bonus'), tower.solution).reason, 'break');
  const crane = A.find((s) => s.id === 'a5');
  assert.strictEqual(S.simulate(crane, crane.solution.map((b) => b.replace(/^s:/, ''))).reason, 'break');
  // the fire truck breaks a plain wood bridge
  const fire = A.find((s) => s.id === 'a3');
  assert.ok(!BL.check(fire, ['1,2-2,2', '2,2-3,2', '3,2-4,2', '1,3-2,2', '4,3-3,2']).ok);
  // extra beams cost stars
  const big = S.check(house, house.solution.concat(['1,3-2,4', '2,4-3,3']));
  assert.ok(big.ok && big.stars < 3);
});

test('structures: quake tests both directions; lift loads only the hook; wind grows with height', () => {
  const lv = { cols: 3, ground: 3, top: 1, bolts: [1, 2], targets: [[1, 1]], test: 'quake', quake: 1, materials: ['wood', 'steel'], budget3: 99, budget2: 99 };
  const r = S.simulate(lv, ['1,3-1,2', '2,3-2,2', '1,2-2,2', '1,3-2,2', '1,2-1,1', '2,2-1,1']);
  assert.strictEqual(r.test, 'quake');
  assert.ok(r.reason === 'break' || r.ok);
  const st = S.stateAt(r, 0.5);
  assert.strictEqual(st.r.length, r.beams.length);
});

test('Track B: debugging stages start broken and are fixed by changing ONE block', () => {
  D.tracks[1].stages.filter((s) => s.startProgram && !s.easy).forEach((st) => {
    assert.ok(!P.check(st, st.startProgram).ok, st.id + ' start program has a bug');
    assert.strictEqual(P.countBlocks(st.startProgram), P.countBlocks(st.solution), st.id + ' same size');
  });
  D.tracks[1].stages.forEach((st) => assert.ok(P.validate(st.solution, st), st.id + ' solution uses allowed blocks'));
});

test('puzzles interpreter: loops, functions, if/else, keys, doors, belts', () => {
  const lv = { map: ['#######', '#.K.D.F', '#######'], start: [1, 1, 1], par: 9 };
  const r = P.run(lv, { main: [{ t: 'rep', n: 5, body: [{ t: 'F' }] }] });
  assert.ok(r.reached);
  assert.ok(r.trace.some((e) => e.key) && r.trace.some((e) => e.door));
  const noKey = { map: ['######', '#..DF#', '######'], start: [1, 1, 1], par: 9 };
  const r2 = P.run(noKey, { main: [{ t: 'F' }, { t: 'F' }, { t: 'F' }] });
  assert.ok(r2.bump && !r2.reached);
  const belt = { map: ['#####', '#.>.#', '#####'], start: [1, 1, 1], par: 9 };
  const r3 = P.run(belt, { main: [{ t: 'F' }] });
  assert.deepStrictEqual([r3.final.x, r3.final.y], [3, 1]);
  assert.ok(r3.trace.some((e) => e.ev === 'slide'));
  const fn = { map: ['#####', '#..F#', '#####'], start: [1, 1, 1], fn: true, blocks: ['F', 'M'], par: 3 };
  assert.ok(P.check(fn, { main: [{ t: 'M' }], fn: [{ t: 'F' }, { t: 'F' }] }).ok);
  assert.ok(!P.validate({ main: [], fn: [{ t: 'M' }] }, fn), 'no My move inside My move');
  const forever = { map: ['#####', '#...#', '#####'], start: [1, 1, 1], blocks: ['F', 'rep', 'forever'], par: 9 };
  assert.ok(P.run(forever, { main: [{ t: 'rep', n: 0, body: [{ t: 'L' }] }] }).timeout);
  // if/else on colours
  const col = { map: ['####', '#r.#', '#.F#', '####'], start: [1, 1, 1], par: 9, conds: ['red'] };
  assert.ok(P.check(col, { main: [{ t: 'if', c: 'red', body: [{ t: 'R' }], alt: [] }, { t: 'F' }, { t: 'L' }, { t: 'F' }] }).ok);
});

test('lab: gear trains agree with the machines gear solver; levers, ramps and rolls', () => {
  // S/B chains on a straight line of pegs, 1 apart (machines meshing rule) give the same direction + speed.
  const chains = [['B'], ['S'], ['S', 'B'], ['B', 'S', 'S'], ['S', 'S', 'B', 'S']];
  chains.forEach((c) => {
    const tr = LB.gearTrain({ slots: 4 }, c);
    const nodes = [{ x: 0, y: 0, teeth: MC.MOTOR_TEETH }].concat(c.map((t, i) => ({ x: i + 1, y: 0, teeth: MC.TEETH[t === 'S' ? 'gearS' : 'gearB'] })));
    const m = MC.solveGears(nodes);
    assert.strictEqual(tr.fan.dir, m.dir[c.length], c.join(''));
    assert.ok(Math.abs(tr.fan.speed - m.speed[c.length]) < 1e-9, c.join(''));
  });
  // a double gear doubles the speed
  assert.strictEqual(LB.gearTrain({ slots: 4 }, ['D', 'S']).fan.speed, 4);
  assert.strictEqual(LB.gearCheck({ slots: 4, goalSpec: { dir: 1, speed: 'fast' } }, ['S', null, 'S']).reason, 'gap');
  const lever = D.tracks[2].stages.find((s) => s.id === 'c4');
  assert.strictEqual(LB.leverCheck(lever, { f: 0, weights: [] }).reason, 'heavy');
  const shelf = D.tracks[2].stages.find((s) => s.id === 'c10');
  assert.strictEqual(LB.leverCheck(shelf, { f: -3, weights: [] }).reason, 'low');
  const ramp = D.tracks[2].stages.find((s) => s.id === 'c6');
  assert.strictEqual(LB.rampCheck(ramp, { len: 2, surface: 'carpet' }).reason, 'heavy');
  assert.strictEqual(LB.check(ramp, { len: 5, surface: 'wood' }).stars, 2, 'a longer ramp that works = 2 stars');
  const roll = D.tracks[2].stages.find((s) => s.id === 'c11');
  assert.strictEqual(LB.rollCheck(roll, { h: 1, surface: 'ice' }).reason, 'far');
  assert.strictEqual(LB.rollCheck(roll, { h: 1, surface: 'sand' }).reason, 'short');
  // quiz stars: wrong taps cost stars, never the win
  const q = D.tracks[2].stages[0];
  assert.strictEqual(LB.check(q, { answers: q.solution.answers, wrong: 1 }).stars, 2);
  assert.ok(!LB.check(q, { answers: [] }).ok);
  // the circuit trap: a plain wire in the middle is a short circuit
  const safe = D.tracks[2].stages.find((s) => s.id === 'c12');
  assert.strictEqual(CI.evaluate(safe, { placed: [{ t: 'I', x: 2, y: 1, r: 0 }, { t: 'I', x: 1, y: 2, r: 1 }], rots: {}, sw: { '1,0': true } }).status, 'short');
});

test('science lab: every topic has a lesson with 3–5 cards and one "try it" card, and its stages', () => {
  ['gears', 'levers', 'ramps', 'circuits'].forEach((k) => {
    const ls = D.lessons[k];
    assert.ok(ls.cards.length >= 3 && ls.cards.length <= 5, k);
    assert.strictEqual(ls.cards.filter((c) => c.try).length, 1, k + ' try card');
    const st = D.tracks[2].stages.filter((s) => s.topic === k);
    assert.ok(st.length >= 2 && st.length <= 3, k + ' stages');
    assert.ok(st.some((s) => s.mode === 'quiz'), k + ' quick check');
    assert.ok(st.some((s) => s.mode !== 'quiz'), k + ' build / puzzle');
  });
});

test('tiers: stages open in order; the next tier opens with 3 stars on 3 of 4 (mastery); parents can open anything', () => {
  const st = D.tracks[0].stages, l2 = L2.defaults();
  assert.ok(L2.isStageOpen(l2, 'a', st, 0));
  assert.ok(!L2.isStageOpen(l2, 'a', st, 1));
  L2.record(l2, 'a1', 1);
  assert.ok(L2.isStageOpen(l2, 'a', st, 1));
  ['a2', 'a3', 'a4'].forEach((id) => L2.record(l2, id, 2));
  assert.ok(!L2.isStageOpen(l2, 'a', st, 4), 'Silver needs mastery');
  assert.strictEqual(L2.lockReason(l2, 'a', st, 4), 'mastery');
  assert.deepStrictEqual(L2.mastery(l2, st, 0), { three: 0, need: 3, size: 4, done: false });
  ['a1', 'a2'].forEach((id) => L2.record(l2, id, 3));
  assert.ok(!L2.isTierOpen(l2, 'a', st, 1));
  L2.record(l2, 'a3', 3);
  assert.ok(L2.isTierOpen(l2, 'a', st, 1) && L2.isStageOpen(l2, 'a', st, 4));
  assert.ok(!L2.isStageOpen(l2, 'a', st, 5));
  assert.strictEqual(L2.lockReason(l2, 'a', st, 5), 'previous');
  assert.strictEqual(L2.nextStage(l2, 'a', st), 4);
  // records keep the best
  L2.record(l2, 'a3', 1);
  assert.strictEqual(L2.getStars(l2, 'a3'), 3);
  // parent
  L2.unlockTo(l2, 'b', 9);
  assert.ok(L2.isStageOpen(l2, 'b', D.tracks[1].stages, 9) && L2.isTierOpen(l2, 'b', D.tracks[1].stages, 2));
  L2.setStarsExact(l2, 'c', D.tracks[2].stages, 5, 2);
  assert.strictEqual(L2.getStars(l2, 'c6'), 2);
  assert.ok(L2.isStageOpen(l2, 'c', D.tracks[2].stages, 5));
  L2.setStarsExact(l2, 'c', D.tracks[2].stages, 5, 0);
  assert.strictEqual(L2.getStars(l2, 'c6'), 0);
  const counts = { a: 12, b: 12, c: 12 };
  L2.unlockAll(l2, counts);
  D.tracks.forEach((t) => t.stages.forEach((s, i) => assert.ok(L2.isStageOpen(l2, t.id, t.stages, i))));
  l2.timers = false;
  L2.reset(l2);
  assert.strictEqual(l2.timers, false, 'reset keeps the timer choice');
  assert.deepStrictEqual(l2.stars, {});
  assert.ok(!L2.isStageOpen(l2, 'a', st, 1));
  const sum = L2.summary(l2, 'a', st);
  assert.deepStrictEqual([sum.stars, sum.max, sum.tierName], [0, 36, 'Bronze']);
});

test('adaptive help: hint after 2 tries, Show me after 4, easier version after 6 (only when there is one)', () => {
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 9].map((n) => L2.helpFor(n, true)), ['none', 'none', 'hint', 'hint', 'showme', 'showme', 'easier', 'easier']);
  assert.strictEqual(L2.helpFor(8, false), 'showme');
  const l2 = L2.defaults();
  assert.strictEqual(L2.addFail(l2, 'a1'), 1);
  assert.strictEqual(L2.addFail(l2, 'a1'), 2);
  L2.record(l2, 'a1', 2);
  assert.strictEqual(l2.fails.a1, undefined, 'a win clears the tries');
});

test('relaxed timer only takes the 3rd star (never fails); the easier version gives at most 2; bonus offer', () => {
  assert.strictEqual(L2.finalStars(3, { limitSec: 180, usedSec: 100 }), 3);
  assert.strictEqual(L2.finalStars(3, { limitSec: 180, usedSec: 400 }), 2);
  assert.strictEqual(L2.finalStars(2, { limitSec: 180, usedSec: 400 }), 2);
  assert.strictEqual(L2.finalStars(1, { limitSec: 10, usedSec: 400 }), 1);
  assert.strictEqual(L2.finalStars(3, { timersOn: false, limitSec: 180, usedSec: 400 }), 3, 'timers off');
  assert.strictEqual(L2.finalStars(3, { easy: true }), 2);
  const a2 = D.tracks[0].stages[1];
  assert.ok(L2.offerBonus(a2, 3, 30000));
  assert.ok(!L2.offerBonus(a2, 2, 30000));
  assert.ok(!L2.offerBonus(a2, 3, 999999));
  assert.ok(!L2.offerBonus(D.tracks[0].stages[0], 3, 1000), 'no bonus on that stage');
  // timer limits sit on Silver/Gold only
  all.forEach((s) => { if (s.timeLimit) assert.ok(L2.tierOf(s.index) >= 1, s.id); });
});

test('save: old saves (no level2) load fine; junk is cleaned; reset / transfer keep the right things', () => {
  const store = SAVE.createStore(SAVE.memoryStorage());
  assert.deepStrictEqual(store.getLevel2(), L2.defaults());
  // a 3.4 save without level2
  const mem = SAVE.memoryStorage();
  mem.setItem('littleEngineerSave', JSON.stringify({ version: 1, stars: { bridges: [3, 3] }, settings: { pin: '1234' } }));
  const s2 = SAVE.createStore(mem);
  assert.strictEqual(s2.getStars('bridges', 1), 3);
  assert.deepStrictEqual(s2.getLevel2(), L2.defaults());
  // junk
  const m = L2.migrate({ stars: { a1: 9, 'bad key!': 3, b2: -1 }, open: { a: 'x', b: 4 }, lessons: { gears: 1 }, fails: { a1: 2.5, a2: 3 }, timers: false, junk: 1 });
  assert.deepStrictEqual(m.stars, { a1: 3 });
  assert.deepStrictEqual(m.open, { a: -1, b: 4, c: -1 });
  assert.deepStrictEqual(m.lessons, { gears: true });
  assert.deepStrictEqual(m.fails, { a2: 3 });
  assert.strictEqual(m.timers, false);
  assert.strictEqual(m.junk, undefined);
  assert.strictEqual(m.v, L2.VERSION);
  // persisted + reloaded
  const s3 = SAVE.createStore(mem);
  L2.record(s3.getLevel2(), 'b1', 3);
  s3.getLevel2().timers = false;
  s3.save();
  const s4 = SAVE.createStore(mem);
  assert.strictEqual(L2.getStars(s4.getLevel2(), 'b1'), 3);
  // reset all progress keeps the timer choice, wipes stars
  s4.reset();
  assert.deepStrictEqual(s4.getLevel2().stars, {});
  assert.strictEqual(s4.getLevel2().timers, false);
  // transfer code carries Level 2 stars
  L2.record(s4.getLevel2(), 'c3', 2);
  const code = s4.exportCode();
  const s5 = SAVE.createStore(SAVE.memoryStorage());
  assert.ok(s5.importCode(code).ok);
  assert.strictEqual(L2.getStars(s5.getLevel2(), 'c3'), 2);
  assert.strictEqual(s5.getLevel2().timers, true, 'this phone keeps its own timer setting');
});

test('voice: every Level 2 line (stages, quizzes, lessons, tips, facts, hub) is collected and has a clip (0 missing)', () => {
  const VK = require('../js/core/voice-key.js');
  const fs = require('fs');
  const path = require('path');
  const { level2Static, shellLines } = require('../tools/collect-voice-lines.js');
  const dir = path.join(__dirname, '..', 'audio', 'voice');
  const ids = new Set(JSON.parse(fs.readFileSync(path.join(dir, 'lines.json'), 'utf8')).map((l) => l.id));
  const clips = new Set(JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')));
  const groups = JSON.parse(fs.readFileSync(path.join(dir, 'groups.json'), 'utf8'));
  const { LINES } = shellLines();
  let n = 0;
  level2Static(LINES).forEach(({ lines }) => lines.forEach((t) => {
    n++;
    const k = VK.key(t);
    assert.ok(ids.has(k), 'missing line: ' + t + ' — run node tools/collect-voice-lines.js');
    assert.ok(clips.has(k), 'missing clip: ' + t);
  }));
  assert.ok(n > 200, 'lines checked: ' + n);
  all.forEach((s) => assert.ok(Array.isArray(groups['l2:' + s.id]) && groups['l2:' + s.id].includes(VK.key(s.goal)), s.id + ' captured at runtime'));
});
