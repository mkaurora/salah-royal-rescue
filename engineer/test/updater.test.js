'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { createUpdater, MESSAGES } = require('../js/core/updater.js');

function emitter(o) {
  const ls = {};
  o.addEventListener = (n, f) => { (ls[n] = ls[n] || []).push(f); };
  o.fire = (n) => (ls[n] || []).forEach((f) => f());
  return o;
}
function fakeWorld(opts = {}) {
  const posted = [];
  const waitingWorker = (name) => ({ name, postMessage: (m) => posted.push(m) });
  const reg = emitter({ waiting: opts.waiting ? waitingWorker('w') : null, installing: null, updates: 0,
    update() { this.updates++; if (opts.onUpdate) opts.onUpdate(this, waitingWorker); return opts.updateFails ? Promise.reject(new Error('net')) : Promise.resolve(); } });
  const sw = emitter({ controller: opts.noController ? null : {}, registered: null,
    register(url, o) { this.registered = { url, o }; return Promise.resolve(reg); } });
  const nav = { onLine: opts.offline ? false : true, serviceWorker: sw };
  const doc = emitter({ visibilityState: 'visible' });
  let t = 0, reloads = 0, banners = 0, saved = 0;
  const up = createUpdater({ navigator: nav, document: doc, now: () => t, reload: () => reloads++, onBanner: () => banners++,
    beforeReload: () => saved++, wait: () => new Promise((r) => setTimeout(r, 5)), installWaitMs: 5 });
  return { up, reg, sw, nav, doc, posted, tick: (ms) => { t += ms; }, get reloads() { return reloads; }, get banners() { return banners; }, get saved() { return saved; } };
}

test('register uses updateViaCache none, scope ./, and checks for an update at once', async () => {
  const w = fakeWorld();
  await w.up.register('./sw.js');
  assert.deepStrictEqual(w.sw.registered, { url: './sw.js', o: { scope: './', updateViaCache: 'none' } });
  assert.strictEqual(w.reg.updates, 1);
});

test('visibilitychange to visible calls update(), throttled to once a minute', async () => {
  const w = fakeWorld();
  await w.up.register();
  w.doc.fire('visibilitychange');               // within 60 s of the first check: skipped
  assert.strictEqual(w.reg.updates, 1);
  w.tick(61000); w.doc.fire('visibilitychange');
  assert.strictEqual(w.reg.updates, 2);
  w.doc.visibilityState = 'hidden'; w.tick(61000); w.doc.fire('visibilitychange');
  assert.strictEqual(w.reg.updates, 2, 'hidden does not check');
});

test('a waiting worker shows the banner once, and never reloads by itself', async () => {
  const w = fakeWorld({ waiting: true });
  await w.up.register();
  await new Promise((r) => setTimeout(r, 5));
  assert.strictEqual(w.banners, 1);
  w.sw.fire('controllerchange');                // e.g. another tab activated it
  assert.strictEqual(w.reloads, 0, 'no automatic reload (never mid-level)');
  assert.deepStrictEqual(w.posted, []);
});

test('no banner on the very first install (no controller yet)', async () => {
  const w = fakeWorld({ waiting: true, noController: true });
  await w.up.register();
  assert.strictEqual(w.banners, 0);
});

test('tapping the banner saves progress, posts SKIP_WAITING and reloads once on controllerchange', async () => {
  const w = fakeWorld({ waiting: true });
  await w.up.register();
  assert.strictEqual(w.up.applyUpdate(), true);
  assert.strictEqual(w.saved, 1);
  assert.deepStrictEqual(w.posted, [{ type: 'SKIP_WAITING' }]);
  w.sw.fire('controllerchange'); w.sw.fire('controllerchange');
  assert.strictEqual(w.reloads, 1);
});

test('Update game button: offline / latest / new version', async () => {
  const off = fakeWorld({ offline: true });
  await off.up.register();
  assert.strictEqual(await off.up.manualUpdate(), 'offline');
  assert.strictEqual(off.reloads, 0);

  const same = fakeWorld();
  await same.up.register();
  assert.strictEqual(await same.up.manualUpdate(), 'latest');
  assert.deepStrictEqual(same.posted, []);

  const fresh = fakeWorld({ onUpdate: (reg, mk) => { if (reg.updates >= 2) reg.waiting = mk('new'); } });
  await fresh.up.register();
  assert.strictEqual(await fresh.up.manualUpdate(), 'updating');
  assert.deepStrictEqual(fresh.posted, [{ type: 'SKIP_WAITING' }]);
  fresh.sw.fire('controllerchange');
  assert.strictEqual(fresh.reloads, 1);

  const failing = fakeWorld({ updateFails: true });
  await failing.up.register();
  assert.strictEqual(await failing.up.manualUpdate(), 'offline', 'a failed network check is reported as offline');
});

test('Update game waits for a worker that is still installing', async () => {
  const w = fakeWorld({ onUpdate: (reg, mk) => {
    if (reg.updates < 2) return;
    const inst = emitter({ state: 'installing' });
    reg.installing = inst;
    setTimeout(() => { inst.state = 'installed'; reg.waiting = mk('new'); reg.installing = null; inst.fire('statechange'); }, 1);
  } });
  await w.up.register();
  assert.strictEqual(await w.up.manualUpdate(), 'updating');
});

test('messages match what Mohammed asked for', () => {
  assert.strictEqual(MESSAGES.offline, "You're offline, try again later");
  assert.strictEqual(MESSAGES.latest, 'You have the latest version');
  assert.strictEqual(MESSAGES.banner, 'New version! Tap to update');
});

test('sw.js: waits for SKIP_WAITING (message handler), only first / legacy installs skip at once, cache engineer-v3', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.match(src, /var CACHE = 'engineer-v3-' \+ BUILD;/);
  assert.match(src, /addEventListener\('message'[\s\S]*SKIP_WAITING[\s\S]*skipWaiting\(\)/);
  assert.doesNotMatch(src, /cache\.addAll\(PRECACHE\);\s*\}\)\.then\(function \(\) \{ return self\.skipWaiting\(\); \}\)/);
  assert.match(src, /k\.indexOf\('engineer-'\) === 0 && k !== CACHE/);
  assert.match(src, /if \(first \|\| legacy\) return self\.skipWaiting\(\)/);
  const app = fs.readFileSync(path.join(__dirname, '..', 'js', 'core', 'app.js'), 'utf8');
  assert.match(app, /LE\.updater\.register\('\.\/sw\.js'\)/);
  assert.match(app, /update-btn/);
});
