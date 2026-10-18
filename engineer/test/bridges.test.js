/* Bridges world: level data, content and physics tests (node:test, no deps). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const B = require('../js/logic/bridges.js');
const { levels } = require('../js/data/bridges-levels.js');
const content = require('../js/data/bridges-content.js');

function road(a, b, y) {
  const r = [];
  for (let x = a; x < b; x++) r.push(`${x},${y}-${x + 1},${y}`);
  return r;
}
const L = (o) => Object.assign({ id: 't', rows: 5, deck: 2, left: 1, right: 3, anchors: [], budget3: 99, budget2: 99 }, o);

test('bridges: at least 15 levels with unique ids and required fields', () => {
  assert.ok(levels.length >= 15, 'need >= 15 levels, got ' + levels.length);
  const ids = new Set();
  levels.forEach((lv) => {
    assert.ok(lv.id && !ids.has(lv.id), 'unique id ' + lv.id);
    ids.add(lv.id);
    assert.ok(typeof lv.name === 'string' && lv.name.length > 0 && lv.name.length <= 16, lv.id + ' name <= 16 chars');
    assert.ok(typeof lv.goal === 'string' && lv.goal.length > 0, lv.id + ' goal');
    assert.ok(typeof lv.hint === 'string' && lv.hint.length > 0, lv.id + ' hint');
    ['rows', 'deck', 'left', 'right', 'budget3', 'budget2'].forEach((k) => assert.strictEqual(typeof lv[k], 'number', lv.id + ' ' + k));
    assert.ok(lv.right > lv.left, lv.id + ' gap');
    assert.ok(lv.deck >= 0 && lv.deck < lv.rows, lv.id + ' deck row');
    assert.ok(lv.budget3 <= lv.budget2, lv.id + ' budgets ordered');
    assert.ok(Array.isArray(lv.solution) && lv.solution.length > 0, lv.id + ' solution');
    if (lv.vehicle) assert.ok(B.VEHICLES[lv.vehicle], lv.id + ' vehicle');
    (lv.materials || []).forEach((m) => assert.ok(B.MATERIALS[m], lv.id + ' material ' + m));
  });
});

test('bridges: first levels are fully guided tutorials', () => {
  levels.slice(0, 3).forEach((lv) => {
    assert.ok(Array.isArray(lv.tutorial) && lv.tutorial.length >= 2, lv.id + ' tutorial');
    lv.tutorial.forEach((s) => {
      assert.ok(typeof s.say === 'string' && s.say.length, lv.id + ' tutorial say');
      assert.ok(s.wait || s.ok, lv.id + ' tutorial step waits for something');
      (s.drag || []).concat(s.point ? [s.point] : []).forEach((k) => assert.ok(/^(node:-?\d+,-?\d+|go|tool:\w+|beam:.+|coins|undo|clear|car)$/.test(k), 'target key ' + k));
    });
    assert.ok(lv.tutorial.some((s) => s.wait === 'place'), lv.id + ' waits for building');
    assert.strictEqual(lv.tutorial[lv.tutorial.length - 1].wait, 'run', lv.id + ' ends with Go');
  });
});

test('bridges: tutorial drags follow the real building rules', () => {
  levels.filter((lv) => lv.tutorial).forEach((lv) => {
    let beams = B.parseBeams(lv.startBeams || []);
    lv.tutorial.forEach((s) => {
      if (!s.drag) return;
      const [a, b] = s.drag.map((k) => k.slice(5).split(',').map(Number));
      const r = B.addBeam(lv, beams, a[0], a[1], b[0], b[1], 'wood');
      assert.ok(r.ok, lv.id + ' tutorial drag ' + s.drag.join('>') + ' ' + r.reason);
      beams = r.beams;
    });
    if (lv.tutorial.some((s) => s.drag)) assert.ok(B.check(lv, beams).stars === 3, lv.id + ' tutorial result earns 3 stars');
  });
});

test('bridges: tips exist for every level tip id; >= 15 facts', () => {
  levels.forEach((lv) => {
    if (!lv.tip) return;
    const tip = content.tips[lv.tip];
    assert.ok(tip, 'tip ' + lv.tip + ' exists');
    assert.ok(tip.title && tip.text && /^<svg/.test(tip.pic), 'tip ' + lv.tip + ' has title/text/pic');
  });
  assert.ok(content.facts.length >= 15, 'facts >= 15');
  content.facts.forEach((f) => assert.ok(typeof f === 'string' && f.length > 10));
});

test('bridges: every stored solution crosses with 3 stars through the real logic', () => {
  levels.forEach((lv) => {
    const c = B.check(lv, lv.solution);
    assert.ok(c.ok, lv.id + ' solution fails: ' + c.result.reason);
    assert.ok(c.stars >= 1, lv.id + ' >= 1 star');
    assert.strictEqual(c.stars, 3, lv.id + ' stored solution is a 3-star bridge');
    assert.ok(c.result.peak <= 1, lv.id + ' no beam overloaded');
  });
});

test('bridges: every solution can be built beam by beam with the UI rules (Show me order)', () => {
  levels.forEach((lv) => {
    let beams = [];
    B.normalize(lv.solution).forEach((b) => {
      let r = B.addBeam(lv, beams, b.x1, b.y1, b.x2, b.y2, b.m);
      if (!r.ok) r = B.addBeam(lv, beams, b.x2, b.y2, b.x1, b.y1, b.m);
      assert.ok(r.ok, lv.id + ' cannot place ' + B.beamStr(b) + ': ' + r.reason);
      beams = r.beams;
    });
    assert.ok(B.check(lv, beams).ok, lv.id + ' built bridge works');
  });
});

test('bridges: a flat deck without triangles never works (except the 1-plank level)', () => {
  levels.forEach((lv) => {
    if (lv.right - lv.left < 2) return;
    const r = B.simulate(lv, road(lv.left, lv.right, lv.deck));
    assert.ok(!r.ok, lv.id + ' flat deck should fail');
  });
});

test('bridges: start beams (fix-it levels) fail before fixing; trim levels work but miss 3 stars', () => {
  levels.filter((lv) => lv.startBeams).forEach((lv) => {
    if (lv.trim) {
      const c = B.check(lv, lv.startBeams);
      assert.ok(c.ok && c.stars < 3, lv.id + ' trim start bridge works but costs too much');
    } else {
      assert.ok(!B.simulate(lv, lv.startBeams).ok, lv.id + ' start bridge is broken');
    }
  });
});

test('bridges: erase levels — erasing the wrong start beams, then building, gives the 3-star solution', () => {
  const eraseLevels = levels.filter((lv) => lv.eraseDemo);
  assert.ok(eraseLevels.length >= 1);
  eraseLevels.forEach((lv) => {
    assert.ok(lv.startBeams, lv.id + ' erase level has start beams');
    const want = new Set(B.normalize(lv.solution).map(B.beamStr));
    let beams = B.normalize(lv.startBeams);
    const bad = beams.filter((b) => !want.has(B.beamStr(b)));
    assert.ok(bad.length >= 1 && bad.length <= 4, lv.id + ' 1..4 beams to erase (Show me erases them one by one)');
    beams = beams.filter((b) => want.has(B.beamStr(b)));
    const have = new Set(beams.map(B.beamStr));
    B.normalize(lv.solution).forEach((b) => {
      if (have.has(B.beamStr(b))) return;
      let r = B.addBeam(lv, beams, b.x1, b.y1, b.x2, b.y2, b.m);
      if (!r.ok) r = B.addBeam(lv, beams, b.x2, b.y2, b.x1, b.y1, b.m);
      assert.ok(r.ok, lv.id + ' cannot place ' + B.beamStr(b) + ': ' + r.reason);
      beams = r.beams;
    });
    assert.strictEqual(B.check(lv, beams).stars, 3, lv.id + ' erase + rebuild earns 3 stars');
  });
});

test('bridges: enough "Did you know?" facts for every level', () => {
  assert.ok(content.facts.length >= levels.length, 'facts ' + content.facts.length + ' < levels ' + levels.length);
  assert.strictEqual(new Set(content.facts).size, content.facts.length, 'facts are unique');
});

test('physics: flat unsupported 3-segment deck is wobbly', () => {
  const lv = L({ right: 4 });
  const r = B.simulate(lv, road(1, 4, 2));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'wobbly');
  assert.ok(r.wobbly.length >= 2);
});

test('physics: a triangle truss passes, the same shape without its post wobbles', () => {
  const lv = L({ right: 3, rows: 4 });
  const truss = road(1, 3, 2).concat(['1,2-2,1', '2,1-3,2', '2,1-2,2']);
  const ok = B.simulate(lv, truss);
  assert.ok(ok.ok, 'triangle truss should hold');
  assert.ok(ok.peak > 0 && ok.peak < 1);
  const noPost = B.simulate(lv, truss.slice(0, 4));
  assert.strictEqual(noPost.reason, 'wobbly');
});

test('physics: a square wobbles until a diagonal makes triangles', () => {
  const lv = L({ anchors: [[1, 3], [3, 3]] });
  const square = road(1, 3, 2).concat(['1,3-2,3', '2,3-2,2']);
  assert.strictEqual(B.simulate(lv, square).reason, 'wobbly');
  assert.ok(B.simulate(lv, square.concat(['1,2-2,3'])).ok);
});

test('physics: missing road segment -> hole, dangling beams fall off', () => {
  const lv = L({ right: 4, anchors: [[1, 3], [4, 3]] });
  const r = B.simulate(lv, ['1,2-2,2', '3,2-4,2', '1,3-2,2', '4,3-3,2']);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.reason, 'hole');
  assert.strictEqual(r.hole, 2);
  const d = B.simulate(L({ right: 2 }), ['1,2-2,2', '1,2-1,1']);
  assert.ok(d.ok, 'a loose extra beam just falls off');
  assert.deepStrictEqual(d.dropped, [1]);
});

test('physics: heavy truck breaks a weak bridge; steel or extra supports fix it', () => {
  const lv = L({ right: 4, rows: 6, anchors: [[1, 3], [4, 3], [1, 4], [4, 4]], vehicle: 'truck', materials: ['wood', 'steel'] });
  const weak = road(1, 4, 2).concat(['1,3-2,2', '4,3-3,2']);
  const r = B.simulate(lv, weak);
  assert.strictEqual(r.reason, 'break');
  assert.ok(r.broken >= 0 && ['stretch', 'squish'].includes(r.brokenKind));
  assert.ok(r.failAt > lv.left && r.failAt < lv.right);
  assert.ok(B.simulate(Object.assign({}, lv, { vehicle: 'car' }), weak).ok, 'same bridge holds a car');
  assert.ok(B.simulate(lv, road(1, 4, 2).concat(['s:1,3-2,2', 's:4,3-3,2'])).ok, 'steel supports hold');
  assert.ok(B.simulate(lv, weak.concat(['1,4-2,2', '4,4-3,2'])).ok, 'more supports hold');
  const falling = B.collapse(lv, weak, r.broken);
  assert.ok(Array.isArray(falling) && falling.length > 0, 'something falls after the break');
});

test('physics: deterministic results and symmetric loads', () => {
  const lv = levels[4];
  const a = B.simulate(lv, lv.solution), b = B.simulate(lv, lv.solution);
  assert.deepStrictEqual(a, b);
  const first = a.frames[0], mid = a.frames[Math.floor(a.frames.length / 2)];
  assert.ok(first.r.every((v) => Math.abs(v) < 0.2), 'self weight only before the car arrives');
  assert.ok(Math.max(...mid.r.map(Math.abs)) > Math.max(...first.r.map(Math.abs)), 'car adds stress');
});

test('building rules: snapping, length, rocks, boat zone, start nodes', () => {
  const lv = L({ right: 5, rows: 5, anchors: [[3, 3]], pillars: [{ x: 3, top: 3 }] });
  assert.ok(B.checkBeam(lv, [], 1, 2, 2, 2).ok);
  assert.strictEqual(B.checkBeam(lv, [], 2, 2, 3, 2).reason, 'start', 'must start at a bolt or joint');
  assert.strictEqual(B.checkBeam(lv, [], 1, 2, 4, 2).reason, 'long');
  assert.strictEqual(B.checkBeam(lv, [], 3, 3, 3, 4).reason, 'point', 'inside the rock pillar');
  const two = B.addBeam(lv, [], 1, 2, 3, 2, 'wood');
  assert.ok(two.ok && two.beams.length === 2, 'a 2-long beam is split at the middle dot');
  assert.strictEqual(B.checkBeam(lv, two.beams, 1, 2, 2, 2).reason, 'dup');
  const boat = L({ right: 4, noBelow: true });
  assert.strictEqual(B.checkBeam(boat, [], 1, 2, 2, 3).ok, false, 'no beams below the road on boat levels');
  assert.ok(B.checkBeam(boat, [], 1, 2, 2, 1).ok);
  const towers = L({ right: 5, rows: 4, towers: [{ x: 1, top: 0 }] });
  assert.ok(B.isAnchor(towers, 1, 0) && B.isAnchor(towers, 1, 1));
  assert.strictEqual(B.checkBeam(towers, [], 1, 0, 1, 1).ok, false, 'no beams between two bolts');
  assert.strictEqual(B.checkBeam(L({}), [], 1, 2, 1, 3).ok, false, 'no beams inside the cliff');
  assert.ok(B.reachable(L({}), [], 1, 2).length > 3);
});

test('scoring: stars by coins (steel costs 2)', () => {
  const lv = L({ right: 2, budget3: 1, budget2: 2 });
  assert.strictEqual(B.cost(['1,2-2,2']), 1);
  assert.strictEqual(B.cost(['s:1,2-2,2', '1,2-1,1']), 3);
  assert.strictEqual(B.score(lv, ['1,2-2,2']), 3);
  assert.strictEqual(B.score(lv, ['1,2-2,2', '1,2-1,1']), 2);
  assert.strictEqual(B.score(lv, ['s:1,2-2,2', '1,2-1,1']), 1);
  assert.strictEqual(B.score(lv, []), 0);
  assert.strictEqual(B.simulate(lv, []).reason, 'empty');
  assert.strictEqual(B.starsForCost(lv, 0), 3);
  assert.strictEqual(B.starsForCost(lv, 5), 1);
});

test('linear solver: solves a small system', () => {
  const x = B.solveMulti([[4, 1], [2, 3]], [[1, 2]])[0];
  assert.ok(Math.abs(4 * x[0] + x[1] - 1) < 1e-12 && Math.abs(2 * x[0] + 3 * x[1] - 2) < 1e-12);
});
