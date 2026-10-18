/* Voice clips: key/normalize stability, lines.json completeness, manifest/groups consistency. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const VK = require('../js/core/voice-key.js');
const { staticCollect, viewLiterals, levelLines, shellLines, WORLDS } = require('../tools/collect-voice-lines.js');

const ROOT = path.resolve(__dirname, '..');
const VOICE = path.join(ROOT, 'audio/voice');
const readJSON = (f) => JSON.parse(fs.readFileSync(path.join(VOICE, f), 'utf8'));

test('normalize: strips emoji/symbols, collapses whitespace, trims (same cleaning as the old LE.speak)', () => {
  assert.strictEqual(VK.normalize('Watch me! 👀'), 'Watch me!');
  assert.strictEqual(VK.normalize('  Your turn!   Tap Go! ▶ '), 'Your turn! Tap Go!');
  assert.strictEqual(VK.normalize("It's 3 o'clock: go-go; ok?"), "It's 3 o'clock: go-go; ok?");
  assert.strictEqual(VK.normalize('Ada’s robot ⚡ zaps'), 'Ada’s robot zaps');
  assert.strictEqual(VK.normalize('Line\none\t two'), 'Line one two');
  assert.strictEqual(VK.normalize(''), '');
  assert.strictEqual(VK.normalize(null), '');
  // identical to the regex the v1 buddy used before speaking
  const old = (t) => String(t).replace(/[^\w\s.,!?'’\-:;]/g, ' ').replace(/\s+/g, ' ').trim();
  ['Hooray! You did it! 🎉', 'Tap the number…', 'Did you know? Robots… (yes!)', '∞ means forever!'].forEach((t) => assert.strictEqual(VK.normalize(t), old(t)));
});

test('key: 8-hex FNV-1a 32 of the lowercased normalized text, stable', () => {
  assert.strictEqual(VK.key(''), '811c9dc5', 'FNV offset basis for empty input');
  assert.strictEqual(VK.key('a'), 'e40c292c', 'FNV-1a 32 test vector "a"');
  assert.strictEqual(VK.key('foobar'), 'bf9cf968', 'FNV-1a 32 test vector "foobar"');
  assert.strictEqual(VK.key('Hi Salah! What shall we build today?'), 'f4fd2d28');
  assert.strictEqual(VK.key('Watch me! 👀'), VK.key('watch me!'), 'emoji + case do not change the key');
  assert.match(VK.key('Ada’s robot'), /^[0-9a-f]{8}$/);
  assert.strictEqual(VK.tipLine('Gears', 'They turn.'), 'Gears. They turn.');
  assert.strictEqual(VK.tipLine('Push!', 'Go.'), 'Push! Go.');
  assert.strictEqual(VK.clipPath('Hi Salah!'), 'audio/voice/' + VK.key('Hi Salah!') + '.mp3');
});

test('the browser uses the same voice-key module (loaded before audio/buddy) for LE.speak', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const i = html.indexOf('js/core/voice-key.js'), a = html.indexOf('js/core/audio.js'), b = html.indexOf('js/core/buddy.js');
  assert.ok(i > 0 && i < a && i < b, 'voice-key.js loads before audio.js and buddy.js');
  const buddy = fs.readFileSync(path.join(ROOT, 'js/core/buddy.js'), 'utf8');
  assert.match(buddy, /LE\.voiceKey\.normalize/);
  const audio = fs.readFileSync(path.join(ROOT, 'js/core/audio.js'), 'utf8');
  assert.match(audio, /LE\.voiceKey\.key/);
  assert.match(audio, /decodeAudioData\(ab, ok, fail\)/, 'callback form of decodeAudioData for older Safari');
});

const lines = readJSON('lines.json');
const ids = new Set(lines.map((l) => l.id));
const texts = new Set(lines.map((l) => l.text));

test('lines.json: [{id, text}] normalized, sorted, unique, ids match texts', () => {
  assert.ok(Array.isArray(lines) && lines.length > 300, 'lines: ' + lines.length);
  assert.strictEqual(ids.size, lines.length, 'unique ids');
  lines.forEach((l) => {
    assert.strictEqual(l.text, VK.normalize(l.text), 'normalized: ' + l.text);
    assert.strictEqual(l.id, VK.key(l.text), 'id = key(text): ' + l.text);
    assert.ok(l.text.length > 0);
  });
  const sorted = lines.slice().sort((a, b) => a.text.localeCompare(b.text) || a.id.localeCompare(b.id));
  assert.deepStrictEqual(lines.map((l) => l.id), sorted.map((l) => l.id), 'sorted by text');
});

test('every level goal / hint / tutorial step / tip card / fact of all 5 worlds is in lines.json', () => {
  const { LINES } = shellLines();
  WORLDS.forEach((w) => {
    const { levels } = require('../js/data/' + w + '-levels.js');
    const content = require('../js/data/' + w + '-content.js');
    assert.ok(levels.length >= 15, w + ' has levels');
    levels.forEach((lv, i) => {
      levelLines(w, lv, i, content, LINES).forEach((t) => assert.ok(ids.has(VK.key(t)), `${w} ${lv.id}: missing line "${VK.normalize(t)}" — run node tools/collect-voice-lines.js`));
    });
    Object.values(content.tips || {}).forEach((t) => assert.ok(ids.has(VK.key(VK.tipLine(t.title, t.text))), w + ' tip ' + t.title));
    (content.facts || []).forEach((f) => assert.ok(ids.has(VK.key(LINES.didYouKnow + f)), w + ' fact ' + f));
  });
});

test('every Show me / view line (static literals + runtime capture per level) is in lines.json', () => {
  viewLiterals().forEach((v) => assert.ok(ids.has(VK.key(v.text)), `${v.file}: missing "${v.text}"`));
  const groups = readJSON('groups.json');
  WORLDS.forEach((w) => {
    const { levels } = require('../js/data/' + w + '-levels.js');
    levels.forEach((lv, i) => {
      const g = groups[w + ':' + i];
      assert.ok(Array.isArray(g) && g.length >= 3, `${w}:${i} was captured (Show me run) — run node tools/collect-voice-lines.js`);
      // the runtime capture saw the goal and the win praise for this level
      assert.ok(g.includes(VK.key(lv.goal)), `${w}:${i} capture includes the goal`);
    });
  });
  Object.keys(groups).forEach((g) => groups[g].forEach((k) => assert.ok(ids.has(k), g + ' key ' + k + ' in lines.json')));
  assert.ok(groups.common.length >= 20 && groups.practice.length >= 10);
});

test('shell + Practice Room lines are in lines.json (static set ⊆ lines.json)', () => {
  const { all } = staticCollect();
  all.forEach((t) => assert.ok(texts.has(t) || ids.has(VK.key(t)), 'missing: ' + t));
  require('../js/data/robot-levels.js').practice.forEach((c) => assert.ok(ids.has(VK.key(c.goal)), c.id));
});

test('manifest.json is an array of clip keys that exist on disk', () => {
  const m = readJSON('manifest.json');
  assert.ok(Array.isArray(m));
  m.forEach((k) => {
    assert.match(k, /^[0-9a-f]{8}$/);
    assert.ok(fs.existsSync(path.join(VOICE, k + '.mp3')), k + '.mp3 exists');
  });
  const { clipKeys } = require('../tools/build-voice-manifest.js');
  assert.deepStrictEqual(m, clipKeys(), 'run node tools/build-voice-manifest.js');
});
