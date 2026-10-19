'use strict';
const test = require('node:test');
const assert = require('node:assert');
const S = require('../js/logic/save.js');
const C = require('../js/logic/codec.js');

function mem(init) {
  const m = Object.assign({}, init);
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m };
}

test('defaults load from empty storage; corrupt data falls back safely', () => {
  const st = S.load(mem());
  assert.strictEqual(st.v, S.VERSION);
  assert.strictEqual(st.settings.pin, '1994');
  assert.strictEqual(st.settings.hintDelay, 60);
  assert.strictEqual(st.settings.swapDelay, 300);
  assert.strictEqual(S.load(mem({ 'sq-save': '{not json' })).settings.pin, '1994');
  assert.strictEqual(S.load(mem({ 'sq-save': '"a string"' })).unlocked.math, 0);
  const weird = S.load(mem({ 'sq-save': JSON.stringify({ v: 2, settings: { pin: 'abcd', perLevel: 99, hintDelay: 'x' }, levels: { math: { 0: { stars: 7 }, x: 1 } }, unlocked: { math: -4 }, skills: { a: 5 } }) }));
  assert.strictEqual(weird.settings.pin, '1994');
  assert.strictEqual(weird.settings.perLevel, 8);
  assert.strictEqual(weird.settings.hintDelay, 60);
  assert.strictEqual(weird.levels.math[0].stars, 3);
  assert.strictEqual(weird.unlocked.math, 0);
  assert.deepStrictEqual(weird.skills, {});
});

test('schema migration v1 → v2', () => {
  const v1 = { version: 1, name: 'Salah', stars: { 'math-0': 3, 'math-1': 2, 'english-0': 1, 'bogus': 3 }, unlocked: { math: 2, english: 1 }, pin: '4321', hintDelay: 30, swapDelay: 120, voice: false };
  const st = S.load(mem({ 'sq-save': JSON.stringify(v1) }));
  assert.strictEqual(st.v, 2);
  assert.strictEqual(st.levels.math[0].stars, 3);
  assert.strictEqual(st.levels.math[1].stars, 2);
  assert.ok(st.levels.english[0].passed);
  assert.strictEqual(st.unlocked.math, 2);
  assert.strictEqual(st.settings.pin, '4321');
  assert.strictEqual(st.settings.hintDelay, 30);
  assert.strictEqual(st.settings.voiceOn, false);
});

test('persist + load round-trip', () => {
  const store = mem();
  const st = S.defaults();
  S.recordLevel(st, 'math', 0, { stars: 2, total: 6, firstTry: 5, ms: 1000 }, 29);
  S.persist(store, st);
  const back = S.load(store);
  assert.strictEqual(back.levels.math[0].stars, 2);
  assert.strictEqual(back.unlocked.math, 1);
});

test('recording: best stars kept, next level unlocked, skills tracked (rolling)', () => {
  const st = S.defaults();
  S.recordLevel(st, 'english', 0, { stars: 3, total: 6, firstTry: 6 }, 24);
  S.recordLevel(st, 'english', 0, { stars: 1, total: 6, firstTry: 2 }, 24);
  assert.strictEqual(st.levels.english[0].stars, 3);
  assert.strictEqual(st.levels.english[0].plays, 2);
  assert.strictEqual(st.unlocked.english, 1);
  assert.strictEqual(st.sessions.length, 2);
  for (let i = 0; i < 15; i++) S.recordAnswer(st, 'english', 'en-rhyme', i % 3 !== 0, 2000);
  const e = st.skills['en-rhyme'];
  assert.strictEqual(e.n, 15);
  assert.strictEqual(e.ok, 10);
  assert.strictEqual(e.recent.length, 10);
  assert.strictEqual(st.subjectStats.english.n, 15);
  assert.strictEqual(st.subjectStats.english.ms, 30000);
});

test('admin: unlock, unlock all, approve, set stars, reset level, reset all', () => {
  const st = S.defaults();
  assert.ok(!S.isUnlocked(st, 'math', 5));
  S.unlock(st, 'math', 5);
  assert.ok(S.isUnlocked(st, 'math', 5));
  assert.ok(S.isUnlocked(st, 'math', 3));
  S.unlockAll(st, 'science', 24);
  assert.strictEqual(st.unlocked.science, 23);
  S.unlockAll(st, null, { math: 29, english: 24, science: 24 });
  assert.strictEqual(st.unlocked.english, 23);
  const st2 = S.defaults();
  S.approve(st2, 'english', 0, 24);
  assert.ok(st2.levels.english[0].passed);
  assert.strictEqual(st2.levels.english[0].stars, 1);
  assert.strictEqual(st2.unlocked.english, 1);
  S.setStars(st2, 'english', 0, 3);
  assert.strictEqual(st2.levels.english[0].stars, 3);
  S.setStars(st2, 'english', 4, 9);
  assert.strictEqual(st2.levels.english[4].stars, 3);
  S.resetLevel(st2, 'english', 0);
  assert.strictEqual(S.levelInfo(st2, 'english', 0).stars, 0);
  st2.settings.pin = '9999';
  S.addCustom(st2, 'math', 0, { text: 'Q?', options: ['a', 'b'] }, 'ma-count');
  const fresh = S.resetAll(st2);
  assert.strictEqual(fresh.unlocked.english, 0);
  assert.deepStrictEqual(fresh.levels.english, {});
  assert.strictEqual(fresh.settings.pin, '9999', 'settings survive a progress reset');
  assert.ok(fresh.custom['math:0'], 'custom questions survive a progress reset');
});

test('PIN check, PIN change, adult math gate', () => {
  const st = S.defaults();
  assert.ok(S.checkPin(st, '1994'));
  assert.ok(!S.checkPin(st, '0000'));
  assert.ok(!S.setPin(st, '12a4'));
  assert.ok(!S.setPin(st, '123'));
  assert.ok(S.setPin(st, '2468'));
  assert.ok(S.checkPin(st, '2468') && !S.checkPin(st, '1994'));
  for (let i = 0; i < 50; i++) {
    const g = S.mathGate(i);
    assert.strictEqual(g.answer, g.a * g.b);
    assert.ok(g.a >= 10 && g.a <= 99 && g.b >= 2 && g.b <= 9);
    assert.match(g.question, /What is \d+ × \d+\?/);
    assert.ok(S.checkGate(g, String(g.answer)));
    assert.ok(S.checkGate(g, ' ' + g.answer + ' '));
    assert.ok(!S.checkGate(g, String(g.answer + 1)));
    assert.ok(!S.checkGate(g, ''));
  }
  assert.deepStrictEqual(S.mathGate(5), S.mathGate(5));
});

test('export → import round-trip restores everything (deflate, LZW and plain)', async () => {
  const st = S.defaults();
  S.recordLevel(st, 'math', 0, { stars: 3, total: 6, firstTry: 6, ms: 5000 }, 29);
  S.recordLevel(st, 'science', 2, { stars: 2, total: 6, firstTry: 5 }, 24);
  S.recordAnswer(st, 'math', 'ma-count', true, 1200);
  S.addCustom(st, 'english', 3, { text: 'Which is blue? 💙', options: ['🌊 sea', '🔥 fire'], pic: '🎨' }, 'en-x');
  st.settings.hintDelay = 45; st.settings.pin = '5555';
  const code = await S.exportCode(st);
  assert.match(code, /^SQ1-[DLJ]-[0-9a-f]{8}-[A-Za-z0-9_-]+$/);
  const r = await S.importCode(code);
  assert.strictEqual(r.preview, 'Salah — 2 levels, 5 stars');
  assert.deepStrictEqual(r.state, S.normalize(JSON.parse(JSON.stringify(st))));
  for (const m of ['L', 'J', 'D']) {
    const c = await C.encode({ app: 'sq', v: 2, state: st }, m);
    const back = await S.importCode(c);
    assert.strictEqual(back.state.settings.hintDelay, 45, m);
    assert.strictEqual(back.state.custom['english:3'][0].text, 'Which is blue? 💙');
  }
  // codes survive whitespace / line breaks from messaging apps
  const wrapped = code.replace(/(.{40})/g, '$1\n');
  assert.strictEqual((await S.importCode(wrapped)).preview, r.preview);
});

test('corrupted or foreign codes are rejected', async () => {
  const st = S.defaults();
  S.recordLevel(st, 'math', 0, { stars: 3, total: 6, firstTry: 6 }, 29);
  const code = await S.exportCode(st);
  const flip = code.slice(0, -5) + (code.slice(-5, -4) === 'A' ? 'B' : 'A') + code.slice(-4);
  await assert.rejects(S.importCode(flip));
  await assert.rejects(S.importCode(code.slice(0, code.length - 10)));
  await assert.rejects(S.importCode('hello world'));
  await assert.rejects(S.importCode(''));
  const otherSum = code.replace(/^SQ1-(\w)-[0-9a-f]{8}/, 'SQ1-$1-00000000');
  await assert.rejects(S.importCode(otherSum));
  const foreign = await C.encode({ app: 'other', state: {} }, 'J');
  await assert.rejects(S.importCode(foreign), /not a Learning Quest code/);
});

test('LZW + base64url primitives round-trip arbitrary bytes', () => {
  const bytes = C.utf8Encode('ابحث 🦉 hello hello hello '.repeat(40));
  assert.deepStrictEqual(C.lzwDecompress(C.lzwCompress(bytes)), bytes);
  for (let n = 0; n < 20; n++) {
    const b = new Uint8Array(n).map((_, i) => (i * 37 + n) & 255);
    assert.deepStrictEqual(C.b64urlDecode(C.b64urlEncode(b)), b);
  }
});
