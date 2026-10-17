'use strict';
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/logic/machines.js');
const { levels } = require('../js/data/machines-levels.js');
const content = require('../js/data/machines-content.js');

test('machines: at least 15 levels with unique ids and required fields', () => {
  assert.ok(levels.length >= 15, 'has ' + levels.length + ' levels');
  const ids = new Set();
  for (const lv of levels) {
    assert.ok(!ids.has(lv.id), 'duplicate id ' + lv.id);
    ids.add(lv.id);
    for (const f of ['id', 'name', 'goal', 'map', 'tray', 'solution', 'hint']) assert.ok(lv[f], lv.id + ' missing ' + f);
    assert.ok(lv.name.length <= 16, lv.id + ' name too long');
    const w = lv.map[0].length;
    lv.map.forEach(r => assert.strictEqual(r.length, w, lv.id + ' ragged map'));
    assert.ok(M.parse(lv).goal, lv.id + ' has a goal');
  }
});

test('machines: first levels are guided tutorials', () => {
  for (let i = 0; i < 3; i++) {
    const t = levels[i].tutorial;
    assert.ok(Array.isArray(t) && t.length >= 2, levels[i].id + ' has tutorial');
    assert.ok(t.some(s => s.wait === 'run'), levels[i].id + ' tutorial ends by running');
    t.forEach(s => assert.ok(s.say && (s.wait || s.ok), 'step has text and wait/ok'));
  }
});

test('machines: tips exist and there are >= 15 facts', () => {
  for (const lv of levels) if (lv.tip) assert.ok(content.tips[lv.tip], 'tip ' + lv.tip + ' exists');
  for (const k in content.tips) {
    const t = content.tips[k];
    assert.ok(t.title && t.text && /^<svg/.test(t.pic), 'tip ' + k + ' complete');
  }
  assert.ok(content.facts.length >= 15);
  const seen = new Set(levels.filter(l => l.tip).map(l => l.tip));
  assert.strictEqual(seen.size, levels.filter(l => l.tip).length, 'one tip per new idea');
});

test('machines: every stored solution solves its level with 3 stars', () => {
  for (const lv of levels) {
    assert.deepStrictEqual(M.normalize(lv, lv.solution), lv.solution.map(p => M.ROTATABLE[p.part] ? { slot: p.slot, part: p.part, dir: p.dir || 1 } : { slot: p.slot, part: p.part }), lv.id + ' solution is valid');
    const r = M.check(lv, lv.solution);
    assert.ok(r.ok, lv.id + ' solution solves (reason ' + r.result.reason + ')');
    assert.ok(r.stars >= 1);
    assert.strictEqual(r.stars, 3, lv.id + ' solution gets 3 stars');
  }
});

test('machines: no level is solved with zero placements (or its start placements)', () => {
  for (const lv of levels) {
    assert.strictEqual(M.check(lv, []).ok, false, lv.id + ' must not be solvable empty');
    if (lv.start) assert.strictEqual(M.check(lv, lv.start).ok, false, lv.id + ' must not be solved at start');
  }
});

test('machines: simulation is deterministic', () => {
  for (const lv of levels) {
    const a = M.simulate(lv, lv.solution), b = M.simulate(lv, lv.solution);
    assert.deepStrictEqual(a.frames, b.frames);
    assert.deepStrictEqual(a.events, b.events);
  }
});

test('machines: stars drop with extra parts', () => {
  const lv = levels.find(l => l.id === 'm16');
  const extra = lv.solution.concat([{ slot: '0,2', part: 'ramp', dir: 1 }]);
  const r = M.check(lv, extra);
  assert.ok(r.ok);
  assert.strictEqual(r.stars, 2);
});

test('machines: invalid placements are ignored', () => {
  const lv = levels[0];
  assert.deepStrictEqual(M.normalize(lv, [{ slot: 'nope', part: 'ramp' }, { slot: '1,3', part: 'gearS' }, null]), []);
  // tray count limits
  assert.strictEqual(M.normalize(levels[2], [{ slot: '1,2', part: 'ramp' }, { slot: '4,5', part: 'ramp' }, { slot: '1,2', part: 'ramp' }]).length, 2);
});

test('gears: meshed gears alternate direction', () => {
  const r = M.solveGears([{ x: 0, y: 0, teeth: 16 }, { x: 1, y: 0, teeth: 16 }, { x: 2, y: 0, teeth: 16 }, { x: 3, y: 0, teeth: 16 }]);
  assert.strictEqual(r.jam, false);
  assert.deepStrictEqual(r.dir, [1, -1, 1, -1]);
  assert.deepStrictEqual(r.speed, [1, 1, 1, 1]);
  // a gear that does not touch is not driven
  const r2 = M.solveGears([{ x: 0, y: 0, teeth: 16 }, { x: 3, y: 0, teeth: 8 }]);
  assert.strictEqual(r2.connected[1], false);
  assert.strictEqual(r2.dir[1], 0);
});

test('gears: big gear driving small gear makes it faster', () => {
  const r = M.solveGears([{ x: 0, y: 0, teeth: 16 }, { x: 1, y: 0, teeth: 8 }]);
  assert.ok(r.speed[1] > r.speed[0]);
  assert.strictEqual(r.speed[1], 2);
  const r2 = M.solveGears([{ x: 0, y: 0, teeth: 8 }, { x: 1, y: 0, teeth: 16 }]);
  assert.ok(r2.speed[1] < r2.speed[0]);
  // idler gears in between do not change the final speed
  const r3 = M.solveGears([{ x: 0, y: 0, teeth: 16 }, { x: 1, y: 0, teeth: 8 }, { x: 2, y: 0, teeth: 16 }, { x: 3, y: 0, teeth: 8 }]);
  assert.strictEqual(r3.speed[3], 2);
});

test('gears: an odd loop jams, an even loop does not', () => {
  const Q = Math.sqrt(3) / 2;
  const tri = M.solveGears([{ x: 0, y: 0, teeth: 16 }, { x: 1, y: 0, teeth: 8 }, { x: 0.5, y: Q, teeth: 8 }]);
  assert.strictEqual(tri.jam, true);
  assert.ok(tri.speed.every(s => s === 0), 'jammed gears do not turn');
  const square = M.solveGears([{ x: 0, y: 0, teeth: 16 }, { x: 1, y: 0, teeth: 16 }, { x: 1, y: 1, teeth: 16 }, { x: 0, y: 1, teeth: 16 }]);
  assert.strictEqual(square.jam, false);
});

test('gears: belt direction depends on number of gears; small gear flings over the gap', () => {
  const which = levels.find(l => l.id === 'm7');
  assert.strictEqual(M.gearState(which, [{ slot: 'p', part: 'gearS' }]).belt.dir, 1);
  assert.strictEqual(M.gearState(which, [{ slot: 'q1', part: 'gearS' }, { slot: 'q2', part: 'gearS' }]).belt.dir, -1);
  assert.strictEqual(M.gearState(which, [{ slot: 'p', part: 'gearS' }, { slot: 'q1', part: 'gearS' }]).jam, true);
  const speed = levels.find(l => l.id === 'm9');
  const slow = M.simulate(speed, [{ slot: 'axle', part: 'gearB' }]);
  assert.strictEqual(slow.belt.speed, 1);
  assert.strictEqual(slow.success, false);
  assert.strictEqual(slow.reason, 'lost');
  const fast = M.simulate(speed, [{ slot: 'axle', part: 'gearS' }]);
  assert.strictEqual(fast.belt.speed, 2);
  assert.ok(fast.events.some(e => e.type === 'fling'));
  assert.strictEqual(fast.success, true);
});

test('machines: failure reasons help the hints', () => {
  const byId = id => levels.find(l => l.id === id);
  assert.strictEqual(M.simulate(byId('m4'), []).reason, 'boxstuck');
  assert.strictEqual(M.simulate(byId('m5'), [{ slot: '1,2', part: 'ramp', dir: 1 }]).reason, 'box');
  assert.strictEqual(M.simulate(byId('m6'), []).reason, 'belt');
  assert.strictEqual(M.simulate(byId('m8'), byId('m8').start).reason, 'jam');
  assert.strictEqual(M.simulate(byId('m11'), []).reason, 'log');
  assert.strictEqual(M.simulate(byId('m12'), []).reason, 'pulley');
  // wrong-way wedge does not split the log
  assert.strictEqual(M.simulate(byId('m11'), [{ slot: '3,4', part: 'wedge', dir: -1 }]).success, false);
});
