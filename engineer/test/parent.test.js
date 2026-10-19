/* Parent mode (v3): PIN, adult math gate, unlock / set stars / reset world, settings persistence, transfer codes. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/logic/save.js');

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test('PIN: default 1994, change to another 4-digit PIN, persists, bad PINs rejected', () => {
  const st = fakeStorage();
  let s = S.createStore(st);
  assert.strictEqual(S.DEFAULT_PIN, '1994');
  assert.strictEqual(s.data.settings.pin, '1994');
  assert.ok(s.checkPin('1994'));
  assert.ok(!s.checkPin('0000'));
  assert.ok(!s.checkPin(''));
  ['12', '12345', 'abcd', '12a4', ''].forEach((p) => assert.strictEqual(s.setPin(p), false, 'rejects ' + p));
  assert.ok(s.setPin('4321'));
  s = S.createStore(st);
  assert.ok(s.checkPin('4321'));
  assert.ok(!s.checkPin('1994'));
  // a corrupted PIN in storage falls back to the default
  st.setItem('littleEngineerSave', JSON.stringify({ settings: { pin: 'oops' } }));
  assert.ok(S.createStore(st).checkPin('1994'));
});

test('math gate: two 2-digit numbers, deterministic with a seed, checked strictly', () => {
  for (let seed = 1; seed < 200; seed++) {
    const g = S.mathGate(seed);
    assert.ok(g.a >= 12 && g.a <= 19 && g.b >= 11 && g.b <= 19, 'range ' + g.question);
    assert.strictEqual(g.answer, g.a * g.b);
    assert.strictEqual(g.question, 'What is ' + g.a + ' × ' + g.b + '?');
    assert.deepStrictEqual(S.mathGate(seed), g, 'seeded gate is repeatable');
    assert.ok(S.checkGate(g, String(g.answer)));
    assert.ok(S.checkGate(g, ' ' + g.answer + ' '));
    assert.ok(!S.checkGate(g, String(g.answer + 1)));
    assert.ok(!S.checkGate(g, ''));
    assert.ok(!S.checkGate(g, 'abc'));
  }
  // forgot PIN flow: pass the gate, then set a new PIN
  const s = S.createStore(fakeStorage());
  const g = S.mathGate(7);
  assert.ok(S.checkGate(g, g.answer));
  assert.ok(s.setPin('2468'));
  assert.ok(s.checkPin('2468'));
});

test('parent unlock: open any level without stars; earlier levels stay open; worlds independent', () => {
  const st = fakeStorage();
  let s = S.createStore(st);
  assert.ok(!s.isUnlocked('bridges', 5));
  s.unlockTo('bridges', 5);
  for (let i = 0; i <= 5; i++) assert.ok(s.isUnlocked('bridges', i), 'open ' + i);
  assert.ok(!s.isUnlocked('bridges', 6));
  assert.strictEqual(s.getStars('bridges', 4), 0, 'unlocking does not give stars');
  assert.ok(!s.isUnlocked('machines', 1));
  s.unlockTo('bridges', 2);   // never shrinks
  assert.ok(s.isUnlocked('bridges', 5));
  s = S.createStore(st);
  assert.ok(s.isUnlocked('bridges', 5), 'persists');
});

test('parent stars: set exactly (can lower), unlock all, reset one world, reset all keeps PIN', () => {
  const st = fakeStorage();
  const s = S.createStore(st);
  s.setStars('robot', 0, 3);
  s.setStarsExact('robot', 0, 1);
  assert.strictEqual(s.getStars('robot', 0), 1, 'lowered');
  s.setStarsExact('robot', 7, 2);
  assert.strictEqual(s.getStars('robot', 7), 2);
  assert.ok(s.isUnlocked('robot', 7) && s.isUnlocked('robot', 8));
  s.setStarsExact('robot', 3, 9);
  assert.strictEqual(s.getStars('robot', 3), 3, 'clamped');
  s.unlockAll({ bridges: 27, machines: 28 });
  assert.ok(s.isUnlocked('bridges', 26) && s.isUnlocked('machines', 27));
  s.unlockAll({ circuits: 27, construction: 18 }, 'circuits');
  assert.ok(s.isUnlocked('circuits', 26) && !s.isUnlocked('construction', 5));
  s.setInProgress('robot', 2, { program: [] });
  s.setInProgress('bridges', 1, { beams: [] });
  s.setLast({ screen: 'level', world: 'robot', level: 2 });
  s.resetWorld('robot');
  assert.strictEqual(s.totalStars('robot'), 0);
  assert.ok(!s.isUnlocked('robot', 1));
  assert.strictEqual(s.getInProgress('robot', 2), null);
  assert.deepStrictEqual(s.getInProgress('bridges', 1), { beams: [] }, 'other worlds untouched');
  assert.ok(s.isUnlocked('bridges', 26));
  assert.deepStrictEqual(s.getLast(), { screen: 'menu' });
  s.setPin('9999');
  s.setHelper(false);
  s.setWeeklyUnlockedMax(4);
  s.reset();
  const s2 = S.createStore(st);
  assert.ok(!s2.isUnlocked('bridges', 1));
  assert.ok(s2.checkPin('9999'), 'reset keeps the parent PIN');
  assert.strictEqual(s2.getHelper(), false, 'reset keeps the helper setting');
  assert.strictEqual(s2.data.settings.weeklyUnlockedMax, -1, 'reset closes early-opened weeks');
});

test('settings: voice and helper persist across reloads (voice used to be dropped)', () => {
  const st = fakeStorage();
  let s = S.createStore(st);
  assert.strictEqual(s.getHelper(), true, 'helper on by default');
  s.data.settings.voice = false; s.save();
  s.setHelper(false);
  s = S.createStore(st);
  assert.strictEqual(s.data.settings.voice, false);
  assert.strictEqual(s.getHelper(), false);
});

test('weekly progress: best stars, project done when every step has stars, parent exact edits', () => {
  const st = fakeStorage();
  let s = S.createStore(st);
  const ids = ['a', 'b', 'c'];
  s.setStepStars('w0', 'a', 2, ids);
  s.setStepStars('w0', 'a', 1, ids);
  assert.strictEqual(s.getStepStars('w0', 'a'), 2, 'keeps best');
  s.setStepStars('w0', 'b', 3, ids);
  assert.strictEqual(s.projectProgress('w0').done, false);
  s.setStepStars('w0', 'c', 1, ids);
  assert.strictEqual(s.projectProgress('w0').done, true);
  s = S.createStore(st);
  assert.strictEqual(s.projectProgress('w0').done, true, 'persists');
  s.setStepStarsExact('w0', 'c', 0, ids);
  assert.strictEqual(s.getStepStars('w0', 'c'), 0);
  assert.strictEqual(s.projectProgress('w0').done, false);
  s.setCurrentWeekForce(3);
  assert.strictEqual(S.createStore(st).getWeekly().currentWeekForce, 3);
  s.setCurrentWeekForce(null);
  assert.strictEqual(S.createStore(st).getWeekly().currentWeekForce, null);
  s.resetProject('w0');
  assert.deepStrictEqual(s.projectProgress('w0'), { steps: {}, done: false });
});

test('transfer code: export → import on another device restores progress, keeps that device\'s PIN', () => {
  const a = S.createStore(fakeStorage());
  a.setStars('bridges', 0, 3); a.setStars('bridges', 1, 2);
  a.unlockTo('machines', 4);
  a.markTip('robot:forward');
  a.markPracticeDone('p3');
  a.setStepStars('w0', 'house', 3, ['house', 'roof']);
  a.setWeeklyUnlockedMax(2);
  a.setPin('1111');
  const code = a.exportCode();
  assert.match(code, /^LE1-[A-Za-z0-9_-]+\.[0-9a-f]{4}$/);
  const b = S.createStore(fakeStorage());
  b.setPin('2222');
  assert.deepStrictEqual(b.importCode(code), { ok: true });
  assert.strictEqual(b.getStars('bridges', 1), 2);
  assert.ok(b.isUnlocked('machines', 4));
  assert.ok(b.hasSeenTip('robot:forward'));
  assert.ok(b.isPracticeDone('p3'));
  assert.strictEqual(b.getStepStars('w0', 'house'), 3);
  assert.strictEqual(b.data.settings.weeklyUnlockedMax, 2);
  assert.ok(b.checkPin('2222'), 'PIN is not transferred');
  // whitespace / line breaks from copy-paste are fine
  assert.ok(S.createStore(fakeStorage()).importCode(code.slice(0, 20) + '\n ' + code.slice(20)).ok);
});

test('transfer code: bad codes are rejected without touching progress', () => {
  const s = S.createStore(fakeStorage());
  s.setStars('robot', 0, 3);
  const code = s.exportCode();
  ['', 'hello', 'LE1-', 'LE1-abc', code.slice(0, -1) + (code.endsWith('0') ? '1' : '0'), code.replace('LE1-e', 'LE1-f')].forEach((c) => {
    const r = s.importCode(c);
    assert.strictEqual(r.ok, false, 'rejects ' + c.slice(0, 12));
    assert.ok(typeof r.error === 'string' && r.error.length);
  });
  assert.strictEqual(s.getStars('robot', 0), 3);
});

test('gear hold uses touch events (iPhone cancels pointer long-press) with a 40 px tolerance; 5-tap backup exists', () => {
  const fs = require('fs'), path = require('path');
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'app.js'), 'utf8');
  const gear = app.slice(app.indexOf('function gearButton()'), app.indexOf('function topbar('));
  for (const ev of ['touchstart', 'touchmove', 'touchend']) assert.ok(gear.includes("'" + ev + "'"), ev);
  assert.ok(!/'pointercancel'/.test(gear), 'pointercancel must not cancel the hold');
  assert.match(gear, /pointerType !== 'mouse'/);
  assert.match(app, /LE\.HOLD_MOVE_PX = 40;/);
  assert.match(app, /LE\.TAP5_MS = 3000;/);
  assert.match(app, /taps\.length >= 5/);
  assert.match(app, /fiveTaps\(h\('div\.menu-title'/);
  assert.match(app, /fiveTaps\(h\('span\.topbar-stars'/);
});

test('touch guard: one-finger moves are allowed in any real scroller (no fixed whitelist — Royal Rescue bug class)', () => {
  const fs = require('fs'), path = require('path');
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'app.js'), 'utf8');
  const guard = app.slice(app.indexOf("document.addEventListener('touchmove'"), app.indexOf("document.addEventListener('dblclick'"));
  assert.match(guard, /if \(!LE\.inScrollable\(e\.target\)\) e\.preventDefault\(\);/);
  assert.doesNotMatch(guard, /closest\('[^']*'\)\)\) e\.preventDefault/);
  assert.match(app, /LE\.inScrollable = function/);
  assert.match(app, /overflowY === 'auto' \|\| cs\.overflowY === 'scroll'\) && n\.scrollHeight > n\.clientHeight/);
  assert.match(app, /overflowX === 'auto' \|\| cs\.overflowX === 'scroll'\) && n\.scrollWidth > n\.clientWidth/);
});
