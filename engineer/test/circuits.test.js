'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/logic/circuits.js');
const { levels } = require('../js/data/circuits-levels.js');
const content = require('../js/data/circuits-content.js');

function lv(map, extra) { return Object.assign({ id: 'test', map }, extra || {}); }
function ev(map, placed, extra, st) {
  const level = lv(map, extra);
  return C.evaluate(level, Object.assign({ placed: placed || [], rots: {}, sw: {} }, st || {}));
}
const LOOP = ['C1 I1 C2',
              'B0 ## H0',
              'C0 .. C3'];

/* ---------- Level data ---------- */
test('Circuits has at least 15 handcrafted levels with unique ids and required fields', () => {
  assert.ok(levels.length >= 15, 'levels: ' + levels.length);
  assert.strictEqual(new Set(levels.map((l) => l.id)).size, levels.length);
  levels.forEach((l) => {
    assert.ok(l.name && l.name.length <= 16, l.id + ' name');
    assert.ok(l.goal && l.hint, l.id + ' needs goal + hint');
    assert.ok(Number.isInteger(l.par) && l.par > 0, l.id + ' par');
    assert.ok(l.tray && Object.keys(l.tray).length, l.id + ' tray');
    const p = C.parse(l);
    assert.ok(p.w >= 3 && p.w <= 6 && p.h >= 3 && p.h <= 6, l.id + ' grid fits the phone: ' + p.w + 'x' + p.h);
    l.map.forEach((row) => assert.strictEqual(row.trim().split(/\s+/).length, p.w, l.id + ' row width'));
    let batteries = 0;
    p.cells.forEach((r) => r.forEach((c) => { if (c && C.kind(c.t) === 'battery') batteries++; }));
    assert.ok(batteries >= 1, l.id + ' has a battery');
  });
});

test('the first 3 levels are fully guided tutorials', () => {
  for (let i = 0; i < 3; i++) {
    const t = levels[i].tutorial;
    assert.ok(Array.isArray(t) && t.length >= 2, levels[i].id);
    t.forEach((s) => assert.ok(s.say && (s.wait || s.ok), levels[i].id + ' step needs wait/ok'));
    assert.ok(t.some((s) => s.wait), levels[i].id + ' waits for the player');
  }
});

test('tutorial targets refer to real cells / tray tiles', () => {
  levels.forEach((l) => (l.tutorial || []).forEach((s) => {
    [s.point].concat(s.drag || []).filter(Boolean).forEach((k) => {
      let m;
      if ((m = /^tray:(\w)$/.exec(k))) assert.ok(C.remaining(l, C.initialState(l))[m[1]] !== undefined, l.id + ' ' + k);
      else if ((m = /^cell:(\d+),(\d+)$/.exec(k))) { const p = C.parse(l); assert.ok(+m[1] < p.w && +m[2] < p.h, l.id + ' ' + k); }
      else assert.strictEqual(k, 'tray', l.id + ' unknown key ' + k);
    });
  }));
});

test('every tip id exists in content; >= 15 facts', () => {
  levels.forEach((l) => { if (l.tip) assert.ok(content.tips[l.tip], l.id + ' tip ' + l.tip); });
  Object.values(content.tips).forEach((t) => assert.ok(t.title && t.text && /^<svg/.test(t.pic)));
  assert.ok(content.facts.length >= 15);
  content.facts.forEach((f) => assert.ok(typeof f === 'string' && f.length < 120));
});

/* ---------- Every level is solvable through the real solver ---------- */
test('every stored solution solves its level with 3 stars', () => {
  levels.forEach((l) => {
    const r = C.check(l, l.solution);
    assert.ok(r.ok, l.id + ' solution does not solve: ' + r.result.status);
    assert.ok(r.stars >= 1, l.id);
    assert.strictEqual(r.stars, 3, l.id + ' stored solution is 3 stars');
    // solution only uses tray tiles, in stock, on empty cells
    const left = C.remaining(l, l.solution);
    Object.keys(left).forEach((t) => assert.ok(left[t] >= 0, l.id + ' uses too many ' + t));
    const p = C.parse(l);
    l.solution.placed.forEach((q) => assert.strictEqual(p.cells[q.y][q.x], null, l.id + ' places on a fixed cell'));
    Object.keys(l.solution.rots || {}).forEach((k) => { const [x, y] = k.split(',').map(Number); assert.ok(p.cells[y][x].spin, l.id + ' rot on non-spin ' + k); });
    Object.keys(l.solution.sw || {}).forEach((k) => { const [x, y] = k.split(',').map(Number); assert.strictEqual(C.kind(p.cells[y][x].t), 'switch', l.id + ' sw ' + k); });
  });
});

test('no level is solved at the start or with zero placements', () => {
  levels.forEach((l) => {
    assert.ok(!C.evaluate(l, C.initialState(l)).solved, l.id + ' solved at start');
    assert.ok(!C.evaluate(l, { placed: [], rots: {}, sw: {} }).solved, l.id + ' solved with no tiles');
    assert.ok(!C.evaluate(l, { placed: [], rots: l.solution.rots, sw: l.solution.sw }).solved, l.id + ' solved without placing tiles');
  });
});

test('more tiles than par gives fewer stars', () => {
  const l = lv(['C1 I1 C2 ..', 'B0 ## H0 ..', 'C0 .. C3 ..'], { tray: { I: 4 }, par: 1 });
  const sol = [{ t: 'I', x: 1, y: 2, r: 1 }];
  const extra = (n) => sol.concat([0, 1, 2].slice(0, n).map((y) => ({ t: 'I', x: 3, y, r: 0 })));
  assert.strictEqual(C.score(l, { placed: sol }), 3);
  assert.strictEqual(C.score(l, { placed: extra(2) }), 2);
  assert.strictEqual(C.score(l, { placed: extra(3) }), 1);
  assert.strictEqual(C.score(l, { placed: [] }), 0);
});

test('show-me auto rotation: dropping each solution tile in order gives a rotation the player can tap to', () => {
  levels.forEach((l) => {
    let st = C.initialState(l);
    l.solution.placed.forEach((q) => {
      const r = C.autoRot(l, st, q.t, q.x, q.y);
      assert.ok(r >= 0 && r < 4, l.id);
      st = { placed: st.placed.filter((p) => !(p.x === q.x && p.y === q.y)).concat([{ t: q.t, x: q.x, y: q.y, r: q.r }]), rots: {}, sw: {} };
    });
  });
});

/* ---------- Solver sanity ---------- */
test('open loop: bulb is off', () => {
  const r = ev(LOOP);
  assert.strictEqual(r.parts['2,1'].level, 0);
  assert.ok(!r.solved && !r.short);
});

test('1 battery + 1 bulb: bright', () => {
  const r = ev(LOOP, [{ t: 'I', x: 1, y: 2, r: 1 }]);
  assert.strictEqual(r.parts['2,1'].level, 2);
  assert.ok(r.solved);
  // the wire tiles in the loop carry current (for the animation)
  assert.ok(r.flow['1,2'].some((v) => v !== 0));
});

test('a wire turned the wrong way does not connect', () => {
  const r = ev(LOOP, [{ t: 'I', x: 1, y: 2, r: 0 }]);
  assert.strictEqual(r.parts['2,1'].level, 0);
});

test('2 bulbs in series: dim', () => {
  const r = ev(['C1 I1 C2', 'B0 ## H0', 'I0 ## H0', 'C0 I1 C3']);
  assert.strictEqual(r.parts['2,1'].level, 1);
  assert.strictEqual(r.parts['2,2'].level, 1);
  assert.ok(r.solved);
  assert.ok(!ev(['C1 I1 C2', 'B0 ## H0', 'I0 ## H0', 'C0 I1 C3'], [], { need: 'bright' }).solved, 'dim is not bright');
});

test('2 bulbs in parallel: bright', () => {
  const r = ev(['C1 I1 T0 I1 C2', 'B0 ## H0 ## H0', 'C0 I1 T2 I1 C3'], [], { need: 'bright' });
  assert.strictEqual(r.parts['2,1'].level, 2);
  assert.strictEqual(r.parts['4,1'].level, 2);
  assert.ok(r.solved);
});

test('open switch = off, closed switch = on', () => {
  const map = ['C1 S1 C2', 'B0 ## H0', 'C0 I1 C3'];
  assert.strictEqual(ev(map).parts['2,1'].level, 0);
  assert.strictEqual(ev(map, [], {}, { sw: { '1,0': true } }).parts['2,1'].level, 2);
  assert.strictEqual(ev(['C1 S1+ C2', 'B0 ## H0', 'C0 I1 C3']).parts['2,1'].level, 2);
});

test('short circuit is detected and never solves', () => {
  const r = ev(['C1 I1 C2', 'B0 ## I0', 'C0 I1 C3']);
  assert.ok(r.short);
  assert.deepStrictEqual(r.shortAt, ['0,1']);
  // a wire across a lit bulb shorts it out
  const r2 = ev(['C1 T0 C2', 'B0 I0 H0', 'C0 T2 C3']);
  assert.ok(r2.short && !r2.solved);
  assert.strictEqual(r2.parts['2,1'].level, 0);
  assert.strictEqual(r2.status, 'short');
});

test('two batteries in series are brighter; reversed they cancel', () => {
  const map = (b2) => ['C1 I1 C2', 'B0 ## H0', b2 + ' ## H0', 'C0 I1 C3'];
  const r = ev(map('B0'), [], { need: 'bright' });
  assert.ok(r.solved);
  const rev = ev(map('B2'));
  assert.strictEqual(rev.parts['2,1'].level, 0);
  assert.ok(!rev.short);
});

test('parallel batteries are not a short', () => {
  const r = ev(['C1 T0 C2', 'B0 B0 H0', 'C0 T2 C3']);
  assert.ok(!r.short);
  assert.strictEqual(r.parts['2,1'].level, 2);
});

test('motor spins; fan + bulb in series are slow/dim', () => {
  const r = ev(['C1 I1 C2', 'B0 ## M0', 'C0 I1 C3']);
  assert.strictEqual(r.parts['2,1'].level, 2);
  const r2 = ev(['C1 I1 C2', 'B0 ## M0', 'I0 ## H0', 'C0 I1 C3'], [], { needFan: 'fast' });
  assert.strictEqual(r2.parts['2,1'].level, 1);
  assert.ok(!r2.solved);
  assert.strictEqual(r2.status, 'dim');
});

test('sleepy house must stay dark', () => {
  const map = ['C1 I1 T0 I1 C2', 'B0 ## Z0 ## H0', 'C0 I1 T2 I1 C3'];
  const r = ev(map);
  assert.ok(!r.solved);
  assert.strictEqual(r.status, 'sleepy');
});

test('placements on fixed cells or out of the grid are ignored', () => {
  const r = ev(LOOP, [{ t: 'I', x: 1, y: 1, r: 1 }, { t: 'I', x: 9, y: 9, r: 0 }]);
  assert.strictEqual(r.parts['2,1'].level, 0);
});

test('remaining() counts tray stock and start tiles', () => {
  const l = levels.find((x) => x.start);
  const left = C.remaining(l, C.initialState(l));
  Object.keys(l.tray).forEach((t) => assert.strictEqual(left[t], l.tray[t]));
  l.start.forEach((s) => assert.strictEqual(left[s.t], (l.tray[s.t] || 0)));
  assert.strictEqual(C.remaining(l, { placed: [] })[l.start[0].t], (l.tray[l.start[0].t] || 0) + 1);
});

test('solver is deterministic', () => {
  levels.forEach((l) => {
    const a = JSON.stringify(C.evaluate(l, l.solution).parts);
    const b = JSON.stringify(C.evaluate(l, l.solution).parts);
    assert.strictEqual(a, b);
  });
});
