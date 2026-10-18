'use strict';
const test = require('node:test');
const assert = require('node:assert');
const C = require('../js/logic/construction.js');
const { levels } = require('../js/data/construction-levels.js');
const content = require('../js/data/construction-content.js');
const S = require('../js/logic/save.js');

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}
const one = (stage) => ({ stages: [stage] });
const run = (level, acts) => acts.reduce((s, a) => C.act(level, s, a).state, C.init(level));

test('Construction has 15-20 handcrafted levels with unique ids, short names, goal + hint', () => {
  assert.ok(levels.length >= 15 && levels.length <= 20, 'levels: ' + levels.length);
  assert.strictEqual(new Set(levels.map((l) => l.id)).size, levels.length);
  levels.forEach((l) => {
    assert.ok(l.name && l.name.length <= 16, l.id + ' name <= 16 chars');
    assert.ok(l.goal && l.hint, l.id + ' goal/hint');
    assert.ok(Array.isArray(l.stages) && l.stages.length >= 1, l.id + ' stages');
    assert.strictEqual(l.solution.length, l.stages.length, l.id + ' one action list per stage');
    l.stages.forEach((s) => {
      assert.ok(['doze', 'crane', 'build'].includes(s.type));
      if (s.type === 'doze') s.map.forEach((row) => assert.strictEqual(row.length, s.map[0].length, l.id + ' row width'));
    });
  });
});

test('ramps from one push to a full house; one bulldozer push in level 1', () => {
  assert.deepStrictEqual(levels[0].solution, [['R']]);
  assert.strictEqual(C.par(levels[0]), 1);
  const last = levels[levels.length - 1];
  assert.deepStrictEqual(last.stages.map((s) => s.type), ['doze', 'crane', 'build']);
  assert.ok(last.solution[2][0] === 'found' && last.solution[2][last.solution[2].length - 1] === 'roof');
});

test('the first 3 levels are guided tutorials (say + wait/ok on every step)', () => {
  for (let i = 0; i < 3; i++) {
    const t = levels[i].tutorial;
    assert.ok(Array.isArray(t) && t.length >= 2, levels[i].id);
    const last = t[t.length - 1];
    assert.strictEqual(last.wait, 'fill', levels[i].id + ' ends with the action that wins (live)');
  }
  levels.forEach((l) => (l.tutorial || []).forEach((s) => assert.ok(s.say && (s.wait || s.ok), l.id + ' step needs say + wait/ok')));
});

test('tips exist with title/text/svg; at least 15 facts', () => {
  levels.forEach((l) => { if (l.tip) assert.ok(content.tips[l.tip], 'missing tip ' + l.tip); });
  Object.values(content.tips).forEach((t) => {
    assert.ok(t.title && t.text && t.pic.startsWith('<svg') && t.pic.endsWith('</svg>'));
  });
  assert.ok(content.facts.length >= 15);
  content.facts.forEach((f) => assert.ok(f.length < 90, 'short fact: ' + f));
});

levels.forEach((level, i) => {
  test(`level ${i + 1} (${level.name}) stored solution wins with 3 stars; doing nothing does not`, () => {
    const r = C.play(level, level.solution);
    assert.strictEqual(r.fails, 0, 'every stored action is a real move');
    assert.ok(r.won, 'wins');
    assert.strictEqual(r.stars, 3);
    assert.strictEqual(r.moves, C.par(level));
    assert.strictEqual(C.play(level, []).won, false, 'empty attempt does not win');
    // stopping one action short never wins
    const flat = [].concat(...level.solution);
    assert.strictEqual(C.play(level, flat.slice(0, -1)).won, false);
  });
});

test('bulldozer: pushing dirt into a hole fills it', () => {
  const lv = one({ type: 'doze', map: ['>oO.'] });
  const r = C.act(lv, C.init(lv), 'R');
  assert.ok(r.ok);
  assert.ok(r.events.some((e) => e.t === 'fill'));
  assert.ok(r.state.st.holes[0].full);
  assert.ok(r.state.st.items[0].gone);
  assert.ok(r.state.won);
  assert.deepStrictEqual([r.state.st.d.x, r.state.st.d.y], [1, 0]);
});

test('bulldozer: cannot push two things, into walls, off the edge, or drive into a hole', () => {
  let lv = one({ type: 'doze', map: ['>oo.O'] });
  let r = C.act(lv, C.init(lv), 'R');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'two');
  lv = one({ type: 'doze', map: ['>o#O'] });
  r = C.act(lv, C.init(lv), 'R');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'wall');
  lv = one({ type: 'doze', map: ['.>o', '..O'] });
  r = C.act(lv, C.init(lv), 'R');
  assert.strictEqual(r.ok, false, 'dirt cannot leave the map');
  r = C.act(lv, C.init(lv), 'U');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.state.st.d.f, 'U', 'still turns to face');
  assert.strictEqual(r.state.moves, 0, 'bumps are free');
  lv = one({ type: 'doze', map: ['>O.o'] });
  r = C.act(lv, C.init(lv), 'R');
  assert.strictEqual(r.reason, 'hole');
});

test('bulldozer: rocks go in the dump truck, not in holes; dirt does not go in the truck', () => {
  let lv = one({ type: 'doze', map: ['>rX', '..O', '.o.'] });
  let r = C.act(lv, C.init(lv), 'R');
  assert.ok(r.ok); assert.ok(r.events.some((e) => e.t === 'dump'));
  assert.ok(r.state.st.items[0].gone);
  lv = one({ type: 'doze', map: ['>rO'] });
  r = C.act(lv, C.init(lv), 'R');
  assert.strictEqual(r.reason, 'rockHole');
  lv = one({ type: 'doze', map: ['>oX', '..O'] });
  r = C.act(lv, C.init(lv), 'R');
  assert.strictEqual(r.reason, 'dirtTruck');
});

test('bulldozer: road levels need the road clear of dirt', () => {
  const lv = one({ type: 'doze', road: 1, map: ['>oO.', '..o.', '....'] });
  let s = run(lv, ['R']);
  assert.strictEqual(s.st.holes[0].full, true);
  assert.strictEqual(s.won, false, 'a dirt pile still sits on the road');
  s = run(lv, ['R', 'R', 'D']);
  assert.strictEqual(s.won, true, 'pile pushed off the road');
});

test('bulldozer: deadlock detection (dirt in a corner, not enough free dirt)', () => {
  const lv = one({ type: 'doze', map: ['..o', '>..', 'O..'] });
  assert.strictEqual(C.deadlock(lv, C.init(lv)), true, 'only dirt is in a corner');
  const lv2 = one({ type: 'doze', map: ['...', '>o.', '...', 'O..'] });
  let s = C.init(lv2);
  assert.strictEqual(C.deadlock(lv2, s), false);
  s = run(lv2, ['R']);      // pushes the dirt into the right wall (not a corner yet)
  assert.strictEqual(C.deadlock(lv2, s), false);
  const lv3 = one({ type: 'doze', map: ['....', '.>o.', '..X.', 'O.o.'] });
  s = run(lv3, ['R']);       // dirt pushed into the right edge, still movable vertically
  assert.strictEqual(C.deadlock(lv3, s), false);
  const lv4 = one({ type: 'doze', map: ['.r', '>.', '.X'] });
  assert.strictEqual(C.deadlock(lv4, C.init(lv4)), true, 'rock stuck in a corner');
  // every level starts solvable
  levels.forEach((l) => assert.strictEqual(C.deadlock(l, C.init(l)), false, l.id));
});

test('crane: move, grab the top block, drop it; big blocks cannot go on small ones; 4 high max', () => {
  const lv = one({ type: 'crane', cols: [['Y3', 'B1'], ['R2'], []], hook: 0, goals: [{ col: 2, stack: ['Y3'] }] });
  let s = C.init(lv);
  let r = C.act(lv, s, 'L');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'edge');
  r = C.act(lv, s, 'G');
  assert.ok(r.ok); assert.strictEqual(r.state.st.held, 'B1', 'grabs the TOP block');
  s = r.state;
  r = C.act(lv, s, 'G');
  assert.ok(r.ok, 'can put it straight back'); assert.deepStrictEqual(r.state.st.cols[0], ['Y3', 'B1']);
  // big on small is rejected and nothing changes
  s = run(lv, ['G', 'R', 'R', 'G', 'L', 'L', 'G']);   // B1 to col 2, holding Y3
  assert.strictEqual(s.st.held, 'Y3');
  r = C.act(lv, s, 'R');
  r = C.act(lv, r.state, 'G');                         // Y3 onto R2 (smaller)
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'big');
  assert.strictEqual(r.state.st.held, 'Y3');
  // empty grab
  const lv2 = one({ type: 'crane', cols: [[], ['G1']], hook: 0, goals: [{ col: 0, stack: ['G1'] }] });
  assert.strictEqual(C.act(lv2, C.init(lv2), 'G').reason, 'empty');
  // tower height limit
  const lv3 = one({ type: 'crane', cols: [['G1'], ['Y3', 'Y3', 'R2', 'B1']], hook: 0, goals: [{ col: 0, stack: [] }] });
  s = run(lv3, ['G', 'R']);
  r = C.act(lv3, s, 'G');
  assert.strictEqual(r.reason, 'tall');
});

test('crane: goal needs the exact stack and an empty hook', () => {
  const lv = one({ type: 'crane', cols: [['Y3'], ['R2'], []], hook: 0, goals: [{ col: 2, stack: ['Y3', 'R2'] }] });
  let s = run(lv, ['G', 'R', 'R', 'G']);
  assert.strictEqual(s.won, false);
  s = run(lv, ['G', 'R', 'R', 'G', 'L', 'G', 'R', 'G']);
  assert.strictEqual(s.won, true);
});

test('house: build order rules (roof before walls is rejected, piece stays in the tray)', () => {
  const lv = one({ type: 'build', house: { floors: 1, windows: [1] }, tray: ['found', 'walls', 'window', 'door', 'roof', 'flat'] });
  let s = C.init(lv);
  let r = C.act(lv, s, 'roof');
  assert.strictEqual(r.ok, false); assert.strictEqual(r.reason, 'roofWalls');
  assert.strictEqual(r.state.moves, 0, 'a bounced piece is free');
  assert.strictEqual(C.act(lv, s, 'walls').reason, 'needFound');
  assert.strictEqual(C.act(lv, s, 'window').reason, 'needWalls');
  assert.strictEqual(C.act(lv, s, 'door').reason, 'needWalls');
  s = run(lv, ['found', 'walls']);
  assert.strictEqual(C.act(lv, s, 'roof').reason, 'roofParts', 'door and windows before the roof');
  assert.strictEqual(C.act(lv, s, 'flat').reason, 'flat', 'flat roof decoy is never accepted');
  assert.strictEqual(C.remaining(lv.stages[0], s.st, 'window'), 1);
  s = run(lv, ['found', 'walls', 'window', 'door', 'roof']);
  assert.strictEqual(s.won, true);
  assert.strictEqual(C.remaining(lv.stages[0], s.st, 'roof'), 0);
});

test('house: tall houses need the wide foundation; second floor walls after the first', () => {
  const st = { type: 'build', house: { floors: 2, windows: [0, 1] }, tray: ['thin', 'found', 'walls', 'window', 'door', 'roof'] };
  const lv = one(st);
  assert.strictEqual(C.act(lv, C.init(lv), 'thin').reason, 'thin');
  const s = run(lv, ['found', 'walls']);
  assert.deepStrictEqual(s.st.placed, ['found', 'walls1']);
  const s2 = run(lv, ['found', 'walls', 'walls']);
  assert.deepStrictEqual(s2.st.placed, ['found', 'walls1', 'walls2']);
  assert.strictEqual(C.slots(st.house).length, 6);
});

test('multi-stage levels move on to the next stage when one is finished', () => {
  const lv = levels.find((l) => l.stages.length === 3);
  let s = C.init(lv);
  lv.solution[0].forEach((a) => { s = C.act(lv, s, a).state; });
  assert.strictEqual(s.stage, 1);
  assert.strictEqual(s.st.type, 'crane');
  assert.strictEqual(s.won, false);
});

test('stars: 3 at par, 2 with a little slack, else 1 (never 0)', () => {
  const lv = { solution: [['R', 'R', 'R', 'R']] };
  assert.strictEqual(C.par(lv), 4);
  assert.strictEqual(C.stars(lv, 4), 3);
  assert.strictEqual(C.stars(lv, 3), 3);
  assert.strictEqual(C.stars(lv, 5), 2);
  assert.strictEqual(C.stars(lv, 7), 2);
  assert.strictEqual(C.stars(lv, 8), 1);
  assert.strictEqual(C.stars(lv, 99), 1);
  // a detour costs stars, undo (re-playing from an earlier state) does not
  const k4 = levels[3];
  const r = C.play(k4, ['U', 'D', 'R', 'R', 'D', 'D']);
  assert.ok(r.won); assert.strictEqual(r.moves, 6); assert.strictEqual(r.stars, 2);
});

test('act() never mutates the state it is given', () => {
  levels.forEach((l) => {
    const s = C.init(l);
    const before = JSON.stringify(s);
    C.act(l, s, [].concat(...l.solution)[0]);
    assert.strictEqual(JSON.stringify(s), before);
  });
});

test('save / resume round trip for construction (state + undo history) through the store', () => {
  const st = fakeStorage();
  let store = S.createStore(st);
  assert.ok(S.WORLDS.includes('construction'));
  const lv = levels[levels.length - 1];
  const idx = levels.length - 1;
  // play half way: finish the bulldozer stage and grab with the crane
  const hist = [];
  let s = C.init(lv);
  lv.solution[0].concat(['G', 'R']).forEach((a) => { hist.push(s); s = C.act(lv, s, a).state; });
  store.setInProgress('construction', idx, JSON.parse(JSON.stringify({ v: 1, state: s, hist })));
  store.setLast({ screen: 'level', world: 'construction', level: idx });

  store = S.createStore(st);     // reopen the app
  const saved = store.getInProgress('construction', idx);
  const back = C.restore(lv, saved.state);
  assert.deepStrictEqual(back, s);
  assert.strictEqual(back.stage, 1);
  assert.strictEqual(back.st.held, 'P3');
  const histBack = saved.hist.map((x) => C.restore(lv, x));
  assert.ok(histBack.every(Boolean));
  // continue from the restored state and win with 3 stars
  let cur = back;
  ['R', 'G'].concat(lv.solution[2]).forEach((a) => { cur = C.act(lv, cur, a).state; });
  assert.strictEqual(cur.won, true);
  assert.strictEqual(C.stars(lv, cur.moves), 3);
  // undo = pop the history
  assert.deepStrictEqual(histBack[histBack.length - 1].st.hook, 0);

  // garbage / foreign / finished states are rejected
  assert.strictEqual(C.restore(lv, null), null);
  assert.strictEqual(C.restore(lv, { stage: 9, moves: 0, st: {} }), null);
  assert.strictEqual(C.restore(levels[0], s), null, 'state from another level');
  assert.strictEqual(C.restore(lv, Object.assign({}, s, { won: true })), null);

  // stars + unlock + clearing the in-progress level
  store.setStars('construction', idx, 3);
  store.clearInProgress('construction', idx);
  store = S.createStore(st);
  assert.strictEqual(store.getStars('construction', idx), 3);
  assert.strictEqual(store.getInProgress('construction', idx), null);
  assert.strictEqual(store.isUnlocked('construction', 1), false);
  store.setStars('construction', 0, 2);
  assert.strictEqual(store.isUnlocked('construction', 1), true);
  assert.strictEqual(store.totalStars('construction'), 5);
});
