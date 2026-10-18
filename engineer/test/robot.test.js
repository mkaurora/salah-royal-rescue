'use strict';
const test = require('node:test');
const assert = require('node:assert');
const R = require('../js/logic/robot.js');
const { levels, practice } = require('../js/data/robot-levels.js');
const content = require('../js/data/robot-content.js');

test('Robot Coder has at least 15 handcrafted levels with unique ids', () => {
  assert.ok(levels.length >= 15, 'levels: ' + levels.length);
  const ids = new Set(levels.map((l) => l.id));
  assert.strictEqual(ids.size, levels.length);
  levels.forEach((l) => {
    assert.ok(l.name && l.goal && l.hint, l.id + ' needs name/goal/hint');
    assert.ok(Array.isArray(l.blocks) && l.blocks.length, l.id + ' blocks');
    assert.ok(Number.isInteger(l.par) && l.par > 0, l.id + ' par');
    const p = R.parse(l);
    assert.ok(p.flag, l.id + ' has a flag');
    // every map row has the same width
    l.map.forEach((row) => assert.strictEqual(row.length, l.map[0].length, l.id + ' row width'));
  });
});

test('Robot Coder starts with ONLY the forward block, adds one idea at a time', () => {
  assert.deepStrictEqual(levels[0].blocks, ['F']);
  for (let i = 1; i < levels.length; i++) {
    const prev = new Set(levels[i - 1].blocks);
    const added = levels[i].blocks.filter((b) => !prev.has(b));
    assert.ok(added.length <= 1, levels[i].id + ' introduces ' + added.join(','));
    assert.ok(levels[i - 1].blocks.every((b) => levels[i].blocks.includes(b)), levels[i].id + ' keeps earlier blocks');
  }
  const firstRep = levels.findIndex((l) => l.blocks.includes('rep'));
  const firstIf = levels.findIndex((l) => l.blocks.includes('ifw'));
  assert.ok(firstRep >= 6, 'repeat comes much later');
  assert.ok(firstIf > firstRep, 'if comes after repeat');
});

test('the first 3 levels are guided tutorials', () => {
  for (let i = 0; i < 3; i++) {
    assert.ok(Array.isArray(levels[i].tutorial) && levels[i].tutorial.length >= 2, levels[i].id);
    levels[i].tutorial.forEach((s) => assert.ok(s.say && (s.wait || s.ok), levels[i].id + ' step needs wait/ok'));
    assert.ok(levels[i].tutorial.some((s) => s.wait === 'run'), levels[i].id + ' ends by pressing Play');
  }
});

levels.forEach((level, i) => {
  test(`level ${i + 1} (${level.name}) stored solution reaches the flag with 3 stars`, () => {
    assert.ok(R.validate(level.solution, level.blocks), 'solution only uses unlocked blocks');
    const r = R.check(level, level.solution);
    assert.ok(r.ok, 'reaches flag');
    assert.ok(r.stars >= 1);
    assert.strictEqual(r.result.bump, false);
    assert.ok(r.result.allGears, 'collects all gears');
    assert.strictEqual(r.stars, 3, 'stored solution is a 3-star solution');
    assert.strictEqual(R.check(level, []).ok, false, 'empty program does not win');
  });
});

test('"fix the bug" levels start with a buggy program that does not win', () => {
  ['r20', 'r24'].forEach((id) => {
    const l = levels.find((x) => x.id === id);
    assert.ok(l && Array.isArray(l.startProgram) && l.startProgram.length, id + ' has a start program');
    assert.ok(R.validate(l.startProgram, l.blocks), id + ' start program uses unlocked blocks');
    assert.strictEqual(R.check(l, l.startProgram).ok, false, id + ' start program has a bug');
  });
});

test('levels fit small phones: maps at most 7 wide / 6 tall, short names', () => {
  levels.forEach((l) => {
    assert.ok(l.map[0].length <= 7 && l.map.length <= 6, l.id + ' map size');
    assert.ok(l.name.length <= 16, l.id + ' name length');
  });
});

test('tip ids referenced by levels exist; at least 15 facts', () => {
  levels.forEach((l) => { if (l.tip) assert.ok(content.tips[l.tip], 'missing tip ' + l.tip); });
  Object.values(content.tips).forEach((t) => { assert.ok(t.title && t.text && t.pic.startsWith('<svg')); });
  assert.ok(content.facts.length >= 15);
  assert.ok(content.facts.length >= levels.length, 'a different fact after every level');
});

test('interpreter: forward, turns, bump, gears, repeat, if-wall, forever', () => {
  const lv = { map: ['>..F'], par: 3 };
  let r = R.run(lv, [{ t: 'F' }, { t: 'F' }]);
  assert.deepStrictEqual(r.final, { x: 2, y: 0, d: 1 });
  assert.strictEqual(r.reached, false);
  r = R.run(lv, [{ t: 'rep', n: 3, body: [{ t: 'F' }] }]);
  assert.strictEqual(r.reached, true);
  r = R.run(lv, [{ t: 'L' }, { t: 'F' }]);
  assert.strictEqual(r.bump, true, 'walking off the map is a bump');
  r = R.run({ map: ['>T.F'] }, [{ t: 'F' }]);
  assert.strictEqual(r.bump, true);
  assert.deepStrictEqual(r.final, { x: 0, y: 0, d: 1 });
  r = R.run({ map: ['>.', '.F'] }, [{ t: 'F' }, { t: 'R' }, { t: 'F' }]);
  assert.strictEqual(r.reached, true);
  // if wall: turn only when blocked
  r = R.run({ map: ['>.', 'F.'] }, [{ t: 'rep', n: 0, body: [{ t: 'ifw', body: [{ t: 'R' }] }, { t: 'F' }] }]);
  assert.strictEqual(r.reached, true);
  // forever loop without progress stops by the safety limit (no hang)
  r = R.run({ map: ['>..F'] }, [{ t: 'rep', n: 0, body: [{ t: 'L' }] }]);
  assert.strictEqual(r.timeout, true);
  assert.strictEqual(r.reached, false);
  // gears
  r = R.run({ map: ['>GG.F'] }, [{ t: 'F' }, { t: 'F' }]);
  assert.strictEqual(r.gears, 2);
});

test('scoring: 1 star for the flag, +1 all gears, +1 par blocks', () => {
  const lv = { map: ['>G.F', 'T...'], par: 2 };
  assert.strictEqual(R.score(lv, [{ t: 'rep', n: 3, body: [{ t: 'F' }] }]), 3);
  assert.strictEqual(R.score(lv, [{ t: 'F' }, { t: 'F' }, { t: 'F' }]), 2);
  const lv2 = { map: ['>..F', 'G...'], par: 2 };
  assert.strictEqual(R.score(lv2, [{ t: 'F' }, { t: 'F' }, { t: 'F' }]), 1);
  assert.strictEqual(R.score(lv2, [{ t: 'F' }]), 0);
});

test('validate rejects disallowed blocks and loops inside loops', () => {
  assert.strictEqual(R.validate([{ t: 'rep', n: 2, body: [] }], ['F']), false);
  assert.strictEqual(R.validate([{ t: 'rep', n: 2, body: [{ t: 'rep', n: 2, body: [] }] }], ['F', 'rep']), false);
  assert.strictEqual(R.validate([{ t: 'rep', n: 0, body: [] }], ['F', 'rep']), false, 'forever needs unlocking');
  assert.strictEqual(R.validate([{ t: 'rep', n: 0, body: [{ t: 'F' }] }], ['F', 'rep', 'forever']), true);
  assert.strictEqual(R.validate([{ t: 'X' }], null), false);
});

test('Practice Room challenges all have verified solutions', () => {
  assert.ok(practice.length >= 8);
  const ids = new Set(practice.map((p) => p.id));
  assert.strictEqual(ids.size, practice.length);
  practice.forEach((p) => {
    const r = R.run(p, p.solution);
    assert.ok(r.reached, p.id + ' solution reaches the star');
    assert.strictEqual(r.bump, false);
    assert.ok(p.goal && p.name);
  });
  // starts very easy: first challenge is 2 forward steps
  assert.deepStrictEqual(practice[0].solution, [{ t: 'F' }, { t: 'F' }]);
});
