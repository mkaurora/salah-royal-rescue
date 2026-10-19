/* Ask Helper (v3): agent id in one place, no keys in the client, dynamic variables, failure reasons,
 * vendored SDK (local, lazy, not precached). */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const HT = require('../js/core/helper-talk.js');
const { appFiles, precacheList } = require('../tools/build-sw.js');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const AGENT = 'agent_9001m5ahkqp5fk9vnyheash2fpfb';

test('the agent id is defined once (LE.HELPER_AGENT_ID in js/core/helper-talk.js)', () => {
  assert.strictEqual(HT.HELPER_AGENT_ID, AGENT);
  const hits = appFiles().filter((f) => /\.(js|html)$/.test(f) && read(f).includes(AGENT));
  assert.deepStrictEqual(hits, ['js/core/helper-talk.js']);
  assert.strictEqual((read('js/core/helper-talk.js').match(new RegExp(AGENT, 'g')) || []).length, 1);
  assert.match(read('js/core/helper-talk.js'), /root\.LE\.HELPER_AGENT_ID = mod\.HELPER_AGENT_ID/);
});

test('no API keys or Anthropic credentials anywhere in the client', () => {
  appFiles().concat(['sw.js']).filter((f) => /\.(js|html|json|css)$/.test(f)).forEach((f) => {
    const src = read(f);
    assert.ok(!/ANTHROPIC_API_KEY|ANTHROPIC_AUTH_TOKEN|sk-ant-/.test(src), f + ' mentions Anthropic credentials');
    assert.ok(!/xi-api-key|xi_api_key|\bsk_[0-9a-f]{20,}/i.test(src), f + ' contains an ElevenLabs key');
    assert.ok(!/api\.anthropic\.com/.test(src), f + ' calls the Anthropic API');
  });
  const ht = read('js/core/helper-talk.js');
  assert.ok(!/apiKey|api_key|signedUrl|conversationToken|Authorization/.test(ht), 'public agent: only the agent id is sent');
});

test('dynamic variables: world, level_name, goal, hint, step (+ hint_only for Robot Coder)', () => {
  const lv = { name: 'Seesaw', goal: 'Launch the box up to the star!', hint: 'Put the seesaw under the box.' };
  assert.deepStrictEqual(HT.buildVars({ world: 'machines', level: lv }),
    { world: 'Machines', level_name: 'Seesaw', goal: lv.goal, hint: lv.hint, step: 'none' });
  const robot = HT.buildVars({ world: 'robot', level: { name: 'Turn Left', goal: 'g', hint: 'h' } });
  assert.strictEqual(robot.hint_only, 'true');
  assert.strictEqual(robot.world, 'Robot Coder');
  const wk = HT.buildVars({ world: 'construction', level: { name: 'Flat Plot', goal: 'g', hint: 'h' }, weekly: { title: 'Dream House', stepTitle: 'Flat Plot', index: 0, count: 5 } });
  assert.strictEqual(wk.step, 'Weekly project "Dream House", step 1 of 5: Flat Plot');
  assert.ok(!('hint_only' in wk));
  Object.values(HT.buildVars({})).forEach((v) => assert.strictEqual(typeof v, 'string'));
});

test('failure reasons → offline / mic / busy / blocked / error; early hang-up is a failure', () => {
  assert.strictEqual(HT.failReason(new Error('x'), false), 'offline');
  assert.strictEqual(HT.failReason(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' }), true), 'mic');
  assert.strictEqual(HT.failReason(Object.assign(new Error('Requested device not found'), { name: 'NotFoundError' }), true), 'mic');
  assert.strictEqual(HT.failReason(new Error('Failed to fetch'), true), 'offline');
  assert.strictEqual(HT.failReason(new Error('Could not load the helper (offline?)'), true), 'offline');
  assert.strictEqual(HT.failReason(new Error("[quota_exceeded] You've run out of credits."), true), 'busy');
  assert.strictEqual(HT.failReason(new Error('origin not allowed'), true), 'blocked');
  assert.strictEqual(HT.failReason(new Error('boom'), true), 'error');
  const t = 1000000;
  assert.strictEqual(HT.earlyDrop({ reason: 'agent' }, t - 800, false, t), true);
  assert.strictEqual(HT.earlyDrop({ reason: 'agent' }, t - 60000, false, t), false);
  assert.strictEqual(HT.earlyDrop({ reason: 'agent' }, t - 800, true, t), false);
  assert.strictEqual(HT.earlyDrop({ reason: 'user' }, t - 800, false, t), false);
  assert.strictEqual(HT.MAX_SECONDS, 180);
});

test('SDK is vendored locally, loaded lazily, never from a CDN, and not precached', () => {
  assert.strictEqual(HT.SDK_PATH, 'js/vendor/elevenlabs-client.js');
  const sdk = read('js/vendor/elevenlabs-client.js');
  assert.match(sdk, /^var ElevenLabsClient = \(function\(exports\)/);
  assert.match(sdk, /exports\.Conversation = Conversation;/);
  assert.ok(fs.existsSync(path.join(ROOT, 'js/vendor/libsamplerate.worklet.js')));
  assert.ok(fs.existsSync(path.join(ROOT, 'js/vendor/LICENSE-elevenlabs-client.txt')));
  const ht = read('js/core/helper-talk.js');
  assert.match(ht, /libsampleratePath: LIBSAMPLERATE_PATH/, 'libsamplerate comes from js/vendor, not jsdelivr');
  assert.match(ht, /connectionType: 'webrtc'/);
  const html = read('index.html');
  assert.ok(html.includes('js/core/helper-talk.js'));
  assert.ok(!html.includes('js/vendor/'), 'SDK is not loaded at startup');
  assert.ok(!precacheList().some((f) => f.includes('js/vendor/')), 'SDK is not precached');
});

test('the helper is a parent setting and never runs Show me', () => {
  const app = read('js/core/app.js');
  const fn = app.slice(app.indexOf('function askHelper('), app.indexOf('LE.askHelper = askHelper;'));
  assert.ok(fn.length > 200);
  assert.ok(!/showMe|solve\(/.test(fn), 'askHelper does not call Show me');
  assert.match(app, /store\.getHelper\(\)/);
});
