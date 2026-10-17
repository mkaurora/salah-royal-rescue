'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/logic/save.js');

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), _m: m };
}

test('uses the littleEngineerSave key and starts empty', () => {
  const st = fakeStorage();
  const s = S.createStore(st);
  assert.strictEqual(s.KEY, 'littleEngineerSave');
  assert.strictEqual(s.getStars('robot', 0), 0);
  assert.strictEqual(s.getSound(), true);
  s.setStars('robot', 0, 2);
  assert.ok(st.getItem('littleEngineerSave'));
});

test('stars persist across reloads and keep the best score', () => {
  const st = fakeStorage();
  let s = S.createStore(st);
  s.setStars('bridges', 0, 2);
  s.setStars('bridges', 0, 1);
  assert.strictEqual(s.getStars('bridges', 0), 2);
  s.setStars('bridges', 0, 3);
  s = S.createStore(st);
  assert.strictEqual(s.getStars('bridges', 0), 3);
  assert.strictEqual(s.totalStars('bridges'), 3);
  s.setStars('bridges', 1, 9);
  assert.strictEqual(s.getStars('bridges', 1), 3, 'clamped to 3');
});

test('unlock logic: first level open, next opens after >= 1 star', () => {
  const s = S.createStore(fakeStorage());
  assert.strictEqual(s.isUnlocked('machines', 0), true);
  assert.strictEqual(s.isUnlocked('machines', 1), false);
  s.setStars('machines', 0, 1);
  assert.strictEqual(s.isUnlocked('machines', 1), true);
  assert.strictEqual(s.isUnlocked('machines', 2), false);
  assert.strictEqual(s.nextLevel('machines', 15), 1);
  assert.strictEqual(s.isUnlocked('circuits', 1), false, 'worlds are independent');
  assert.strictEqual(s.completedCount('machines'), 1);
});

test('in-progress level state is saved and resumed', () => {
  const st = fakeStorage();
  let s = S.createStore(st);
  const prog = { program: [{ t: 'F' }, { t: 'rep', n: 3, body: [{ t: 'L' }] }] };
  s.setInProgress('robot', 4, prog);
  s.setLast({ screen: 'level', world: 'robot', level: 4 });
  s = S.createStore(st);     // "reopen the app"
  assert.deepStrictEqual(s.getInProgress('robot', 4), prog);
  assert.deepStrictEqual(s.getLast(), { screen: 'level', world: 'robot', level: 4 });
  s.clearInProgress('robot', 4);
  assert.strictEqual(s.getInProgress('robot', 4), null);
});

test('settings, tips and practice progress persist', () => {
  const st = fakeStorage();
  let s = S.createStore(st);
  s.setSound(false);
  s.markTip('robot:forward');
  s.markPracticeDone('p1');
  s.setPracticeState({ current: 'p2', program: [] });
  s = S.createStore(st);
  assert.strictEqual(s.getSound(), false);
  assert.strictEqual(s.hasSeenTip('robot:forward'), true);
  assert.strictEqual(s.hasSeenTip('robot:repeat'), false);
  assert.strictEqual(s.isPracticeDone('p1'), true);
  assert.deepStrictEqual(s.getPracticeState(), { current: 'p2', program: [] });
});

test('reset wipes progress but keeps the sound setting', () => {
  const st = fakeStorage();
  const s = S.createStore(st);
  s.setStars('robot', 0, 3);
  s.setInProgress('robot', 1, { program: [] });
  s.markTip('x');
  s.setSound(false);
  s.reset();
  const s2 = S.createStore(st);
  assert.strictEqual(s2.getStars('robot', 0), 0);
  assert.strictEqual(s2.getInProgress('robot', 1), null);
  assert.strictEqual(s2.hasSeenTip('x'), false);
  assert.strictEqual(s2.isUnlocked('robot', 1), false);
  assert.strictEqual(s2.getSound(), false);
});

test('corrupted or missing data falls back to defaults', () => {
  const st = fakeStorage();
  st.setItem('littleEngineerSave', '{not json');
  let s = S.createStore(st);
  assert.strictEqual(s.getStars('robot', 0), 0);
  st.setItem('littleEngineerSave', JSON.stringify({ stars: { robot: [3, 'x', -2] }, settings: 5 }));
  s = S.createStore(st);
  assert.deepStrictEqual(s.data.stars.robot, [3, 0, 0]);
  assert.strictEqual(s.getSound(), true);
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  s = S.createStore(throwing);
  s.setStars('robot', 0, 1);     // must not throw (private mode)
  assert.strictEqual(s.getStars('robot', 0), 1);
});
