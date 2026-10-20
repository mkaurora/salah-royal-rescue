/* Version tracking: js/version.js is the single source of truth; tools/build-sw.js stamps it into sw.js and
 * warns / bumps / fails when the game changed without a version bump. */
'use strict';
const TOOLS = require('path').join(__dirname, '..', 'tools');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const VS = require(path.join(TOOLS, 'version-stamp.js'));

function sandbox(version) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vs-'));
  fs.writeFileSync(path.join(dir, 'version.js'), "self.GAME_VERSION = { version: '" + version + "', built: '' };\n");
  fs.writeFileSync(path.join(dir, 'game.js'), 'one');
  return dir;
}
const SW0 = "var VERSION = '';\nvar BUILT = '';\nvar CONTENT = '';\n";
const quiet = () => {};
const NOW = new Date(2026, 9, 20, 12);

test('version stamp: first build writes VERSION / BUILT / CONTENT and the date label', () => {
  const dir = sandbox('3.3');
  const r = VS.stamp({ root: dir, versionFile: 'version.js', contentFiles: ['game.js'], sw: SW0, now: NOW, log: quiet });
  assert.strictEqual(r.version, '3.3');
  assert.strictEqual(r.built, '20 Oct 2026');
  assert.strictEqual(r.label, 'Version 3.3 (20 Oct 2026)');
  assert.strictEqual(VS.swGet(r.sw, 'VERSION'), '3.3');
  assert.strictEqual(VS.swGet(r.sw, 'BUILT'), '20 Oct 2026');
  assert.strictEqual(VS.readVersion(path.join(dir, 'version.js')).built, '20 Oct 2026');
  assert.ok(!r.warned);
});

test('version stamp: game changed but version not bumped → warns (default), bumps (--bump), fails (--strict)', () => {
  const dir = sandbox('3.3');
  const first = VS.stamp({ root: dir, versionFile: 'version.js', contentFiles: ['game.js'], sw: SW0, now: NOW, log: quiet });
  // no change → no warning
  assert.ok(!VS.stamp({ root: dir, versionFile: 'version.js', contentFiles: ['game.js'], sw: first.sw, now: NOW, log: quiet }).warned);
  fs.writeFileSync(path.join(dir, 'game.js'), 'two');
  const logs = [];
  const w = VS.stamp({ root: dir, versionFile: 'version.js', contentFiles: ['game.js'], sw: first.sw, now: NOW, log: (m) => logs.push(m) });
  assert.ok(w.warned && /VERSION NOT BUMPED/.test(logs.join('')));
  fs.writeFileSync(path.join(dir, 'game.js'), 'three');
  assert.throws(() => VS.stamp({ root: dir, versionFile: 'version.js', contentFiles: ['game.js'], sw: w.sw, flags: { strict: true }, log: quiet }), /VERSION NOT BUMPED/);
  const b = VS.stamp({ root: dir, versionFile: 'version.js', contentFiles: ['game.js'], sw: w.sw, flags: { bump: true }, now: NOW, log: quiet });
  assert.strictEqual(b.version, '3.4');
  assert.strictEqual(VS.readVersion(path.join(dir, 'version.js')).version, '3.4', 'bump written to the version file');
  // a hand bump is accepted without a warning
  fs.writeFileSync(path.join(dir, 'game.js'), 'four');
  VS.writeVersion(path.join(dir, 'version.js'), { version: '4.0', built: '' });
  const h = VS.stamp({ root: dir, versionFile: 'version.js', contentFiles: ['game.js'], sw: b.sw, now: NOW, log: quiet });
  assert.ok(!h.warned); assert.strictEqual(h.version, '4.0');
  assert.strictEqual(VS.bumpMinor('3.9'), '3.10');
});

const ROOT = path.join(__dirname, '..');
const SWB = require('../tools/build-sw.js');
const vm = require('vm');

test('Little Engineer: js/version.js is the one version; sw.js carries the same version, date and a current CONTENT hash', () => {
  const ver = VS.readVersion(path.join(ROOT, 'js/version.js'));
  assert.match(ver.version, /^3\.\d+$/);
  assert.ok(ver.built, 'built date stamped (node tools/build-sw.js)');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.strictEqual(VS.swGet(sw, 'VERSION'), ver.version, 'run node tools/build-sw.js');
  assert.strictEqual(VS.swGet(sw, 'BUILT'), ver.built);
  assert.strictEqual(VS.swGet(sw, 'CONTENT'), SWB.contentStamp(), 'game changed since the last build: run node tools/build-sw.js');
  assert.ok(SWB.precacheList().includes('./js/version.js'), 'version file is precached');
  // the browser global
  const ctx = { self: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'js/version.js'), 'utf8'), ctx);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx.self.GAME_VERSION)), ver);
  // nobody hard-codes a version anywhere else
  const app = fs.readFileSync(path.join(ROOT, 'js/core/app.js'), 'utf8');
  assert.ok(!/APP_VERSION = '\d/.test(app), 'no hard-coded version in app.js');
  assert.match(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8'), /<script src="js\/version\.js"><\/script>[\s\S]*js\/core\/app\.js/);
  assert.match(sw, /type === 'VERSION'[\s\S]*version: VERSION, built: BUILT/);
});

test('updater: waitingVersion asks the waiting worker over a MessageChannel', async () => {
  const { createUpdater, MESSAGES } = require('../js/core/updater.js');
  const waiting = { state: 'installed', postMessage(msg, ports) { assert.strictEqual(msg.type, 'VERSION'); ports[0].postMessage({ version: '3.4', built: '1 Nov 2026' }); }, addEventListener() {} };
  const reg = { waiting, update: () => Promise.resolve(), addEventListener() {} };
  const nav = { onLine: true, serviceWorker: { controller: {}, register: () => Promise.resolve(reg), addEventListener() {} } };
  const u = createUpdater({ navigator: nav, document: { addEventListener() {} } });
  await u.register('./sw.js');
  const v = await u.waitingVersion(500);
  assert.strictEqual(v.version, '3.4');
  assert.strictEqual(MESSAGES.bannerV.replace('{v}', v.version), 'New version 3.4! Tap to update');
  const none = createUpdater({ navigator: nav, document: { addEventListener() {} } });
  assert.strictEqual(await none.waitingVersion(10), null, 'no registration → null');
});
