/* Car Builder & Race: stats make sense, every track is winnable (but not by every build), the race never punishes,
 * tips are true, and the garage saves safely (old Practice Room data still loads). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const CC = require('../js/data/cars-content.js');
const L = require('../js/logic/cars.js');
const S = require('../js/logic/save.js');

const ALL = [];
CC.parts.body.forEach((b) => CC.parts.wheels.forEach((w) => CC.parts.engine.forEach((e) => CC.parts.spoiler.forEach((s) =>
  ALL.push({ body: b.id, wheels: w.id, engine: e.id, spoiler: s.id, color: 'red', sticker: 'star' })))));
const car = (o) => Object.assign({}, CC.starter, o);
const T = (id) => CC.tracks.find((t) => t.id === id);

test('content: parts, 7 tracks with friends, all spoken text present', () => {
  CC.SLOTS.forEach((sl) => {
    const ids = CC.parts[sl].map((p) => p.id);
    assert.strictEqual(new Set(ids).size, ids.length, sl);
    assert.ok(CC.parts[sl].every((p) => p.name), sl + ' names');
    assert.ok(ids.includes(CC.starter[sl]), 'starter ' + sl);
  });
  assert.deepStrictEqual(CC.parts.wheels.map((w) => w.id), ['small', 'big', 'monster']);
  assert.ok(CC.tracks.length >= 6);
  const kinds = new Set();
  CC.tracks.forEach((t) => {
    assert.ok(t.intro && t.name && t.icon, t.id);
    assert.ok(t.friends.length >= 1 && t.friends.length <= 2, t.id + ' 1–2 friendly cars');
    t.friends.forEach((f) => assert.ok(CC.friends[f.id] && f.pace <= 1, f.id));
    t.segs.forEach((s) => kinds.add(s.k));
  });
  ['flat', 'up', 'down', 'bumpy', 'ice'].forEach((k) => assert.ok(kinds.has(k), 'some track has ' + k));
  assert.strictEqual(CC.MAX_CARS, S.MAX_CARS);
});

test('stats make sense: engine fast but heavy, big wheels for bumps, spoiler for hills + ice, light cars climb', () => {
  const st = (o) => L.stats(car(o));
  assert.ok(st({ engine: 'big' }).top > st({ engine: 'medium' }).top && st({ engine: 'medium' }).top > st({ engine: 'small' }).top);
  assert.ok(st({ engine: 'big' }).weight > st({ engine: 'small' }).weight);
  assert.ok(L.speedOn(st({ wheels: 'big' }), 'bumpy') > L.speedOn(st({ wheels: 'small' }), 'bumpy'));
  assert.ok(L.speedOn(st({ wheels: 'small' }), 'flat') > L.speedOn(st({ wheels: 'monster' }), 'flat'));
  assert.ok(L.speedOn(st({ spoiler: 'wing' }), 'up') > L.speedOn(st({ spoiler: 'none' }), 'up'));
  assert.ok(L.speedOn(st({ spoiler: 'wing' }), 'ice') > L.speedOn(st({ spoiler: 'none' }), 'ice'));
  assert.ok(L.speedOn(st({ body: 'buggy' }), 'up') > L.speedOn(st({ body: 'truck' }), 'up'));
  assert.ok(L.speedOn(st({ engine: 'small' }), 'ice') / st({ engine: 'small' }).top > L.speedOn(st({ engine: 'big' }), 'ice') / st({ engine: 'big' }).top, 'too much power slips on ice');
  const b = L.bars(car({ wheels: 'monster' }));
  assert.strictEqual(b.bumps, 5);
  Object.values(L.bars(CC.starter)).forEach((v) => assert.ok(v >= 1 && v <= 5));
  assert.deepStrictEqual(L.normalize({ body: 'rocket-ship', wheels: 'big' }).body, CC.starter.body, 'unknown parts → starter');
});

test('every track: winnable, not by every build; every build finishes with ≥ 1 star; building matters', () => {
  CC.tracks.forEach((tr) => {
    const rs = ALL.map((c) => L.result(tr, c));
    const wins = rs.filter((r) => r.place === 1).length;
    assert.ok(wins >= 5, tr.id + ' winning builds: ' + wins);
    assert.ok(wins < ALL.length, tr.id + ' not every build wins');
    rs.forEach((r) => { assert.ok(r.stars >= 1 && r.time < 60, tr.id); assert.ok(r.order.length === tr.friends.length + 1); });
    const times = rs.map((r) => r.time);
    assert.ok(Math.max(...times) > Math.min(...times) * 1.25, tr.id + ' parts change the race a lot');
    assert.ok(Math.min(...times) > 8 && Math.max(...times) < 50, tr.id + ' short race');
  });
  assert.strictEqual(L.result(CC.tracks[0], CC.starter).place, 1, 'the first race with the starter car is a win');
});

test('different tracks want different cars', () => {
  const best = (id) => ALL.map((c) => ({ c, t: L.result(T(id), c).time })).sort((a, b) => a.t - b.t)[0].c;
  assert.notStrictEqual(best('desert').wheels, 'small', 'desert: big wheels');
  assert.strictEqual(best('ice').spoiler, 'wing', 'ice: spoiler');
  assert.notStrictEqual(best('ice').engine, 'big', 'ice: not the biggest engine');
  assert.strictEqual(best('mountain').spoiler, 'wing', 'mountain: spoiler');
  assert.notStrictEqual(best('mountain').body, 'truck', 'mountain: light body');
  assert.strictEqual(best('sunny').engine, 'big', 'flat road: big engine');
});

test('race is deterministic, stars by place (never 0), tracks open as he races', () => {
  const a = L.result(T('jungle'), car({ wheels: 'monster' })), b = L.result(T('jungle'), car({ wheels: 'monster' }));
  assert.deepStrictEqual(a, b);
  assert.deepStrictEqual([1, 2, 3].map(L.starsFor), [3, 2, 1]);
  assert.ok(L.isTrackOpen({}, 0) && !L.isTrackOpen({}, 1));
  assert.ok(L.isTrackOpen({ sunny: 1 }, 1), 'any finish opens the next track');
  assert.ok(!L.isTrackOpen({ sunny: 1 }, 2));
});

test('tips are true and gentle', () => {
  Object.keys(CC.TIPS).forEach((k) => assert.ok(CC.TIPS[k].length < 90, k));
  const tip = (id, o) => L.tip(T(id), car(o));
  assert.strictEqual(tip('desert', { wheels: 'small' }).key, 'wheels+:bumpy');
  assert.strictEqual(tip('desert', { wheels: 'monster' }).key, 'good:bumpy');
  assert.match(tip('ice', { engine: 'big' }).key, /spoiler\+:ice|engine-:ice/);
  assert.strictEqual(tip('ice', { spoiler: 'wing' }).key, 'good:ice');
  assert.match(tip('mountain', {}).key, /wheels-:up|engine|body:up|spoiler\+:up/);
  // every tip shown for any build/track is a known, voiced line
  CC.tracks.forEach((tr) => ALL.filter((_, i) => i % 5 === 0).forEach((c) => { const t = L.tip(tr, c); assert.ok(CC.TIPS[t.key] === t.text, t.key); }));
});

test('Show me suggestion really helps (or there is nothing left to fix)', () => {
  CC.tracks.forEach((tr) => {
    [CC.starter, car({ wheels: 'small', engine: 'small' }), car({ body: 'truck', wheels: 'monster', engine: 'big' })].forEach((c) => {
      const s = L.suggest(tr, c), base = L.result(tr, c);
      if (!s) return;
      const r = L.result(tr, Object.assign({}, c, { [s.slot]: s.id }));
      assert.ok(r.place < base.place || r.time < base.time, tr.id + ' ' + s.slot + '=' + s.id);
    });
  });
});

test('garage: up to 6 cars, junk is dropped, best stars kept, codes carry the garage', () => {
  const st = S.createStore();
  for (let i = 0; i < 7; i++) st.saveCar(Object.assign({ id: 'c' + i, name: 'Car ' + i }, CC.starter));
  assert.strictEqual(st.getGarage().length, 6, 'max 6');
  assert.strictEqual(st.saveCar(Object.assign({ id: 'c0', name: 'Car 0' }, CC.starter, { wheels: 'monster' })), true, 'updating works when full');
  assert.strictEqual(st.getCar('c0').wheels, 'monster');
  st.setCurrentCar('c1'); st.removeCar('c1');
  assert.strictEqual(st.getCurrentCar(), null);
  assert.ok(st.setTrackStars('sunny', 2)); assert.ok(!st.setTrackStars('sunny', 1)); assert.strictEqual(st.getTrackStars('sunny'), 2);
  const code = S.exportCode(st.data), back = S.importCode(code);
  assert.ok(back.ok); assert.strictEqual(back.data.cars.garage.length, 5); assert.strictEqual(back.data.cars.best.sunny, 2);
  const junk = S.sanitize({ cars: { garage: [null, 5, { id: 'x', name: 'X', body: { evil: 1 }, wheels: 'big' }, { id: 'x' }], current: 'nope', best: { sunny: 99 } } });
  assert.deepStrictEqual(junk.cars.garage, [{ id: 'x', name: 'X', wheels: 'big' }]);
  assert.strictEqual(junk.cars.current, null);
  assert.strictEqual(junk.cars.best.sunny, 3);
});

test('old saves (with Practice Room progress, no cars) load without errors and keep their data', () => {
  const old = { stars: { robot: [3, 2] }, practice: { done: { p1: true, p3: true }, state: { current: 'p2', program: [] } }, last: { screen: 'practice' } };
  const d = S.sanitize(JSON.parse(JSON.stringify(old)));
  assert.deepStrictEqual(d.cars, { garage: [], current: null, best: {} });
  assert.deepStrictEqual(d.practice.done, { p1: true, p3: true });
  assert.deepStrictEqual(d.stars.robot, [3, 2]);
  assert.deepStrictEqual(d.last, { screen: 'practice' });
});
