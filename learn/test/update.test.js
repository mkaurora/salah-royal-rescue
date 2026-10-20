'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createUpdater, TEXT } = require('../js/core/update.js');
const SW = require('../tools/build-sw.js');
const ROOT = path.resolve(__dirname, '..');

function ev() { const l = {}; return { on: (k, f) => (l[k] = l[k] || []).push(f), fire: (k, e) => (l[k] || []).forEach((f) => f(e || {})) }; }
function worker(state) { const e = ev(); const w = { state, msgs: [], addEventListener: e.on, postMessage: (m) => w.msgs.push(m), go(s) { w.state = s; e.fire('statechange'); } }; return w; }
function fakeEnv(opts) {
  opts = opts || {};
  const swe = ev(), rege = ev();
  const reg = { waiting: null, installing: null, updates: 0, addEventListener: rege.on,
    update() { reg.updates++; if (env.nav.onLine === false || opts.fail) return Promise.reject(new Error('offline')); if (opts.next) { const w = opts.next(); opts.next = null; reg.installing = w; rege.fire('updatefound'); } return Promise.resolve(); } };
  const env = { reg, reloads: 0, banners: 0, regOpts: null,
    nav: { onLine: true, serviceWorker: { controller: opts.noController ? null : {}, addEventListener: swe.on,
      register(url, o) { env.regOpts = o; return Promise.resolve(reg); } } },
    fireControllerChange: () => swe.fire('controllerchange') };
  env.up = createUpdater({ navigator: env.nav, reload: () => env.reloads++, onUpdate: () => env.banners++, timeout: 50, setTimeout: (f, ms) => setTimeout(f, Math.min(ms, 60)) });
  return env;
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test('registers with updateViaCache none', async () => {
  const e = fakeEnv(); await e.up.register('sw.js');
  assert.deepStrictEqual(e.regOpts, { updateViaCache: 'none' });
});
test('button: nothing new → latest; offline → offline; never reloads', async () => {
  const e = fakeEnv(); await e.up.register('sw.js');
  assert.strictEqual(await e.up.check(), 'latest');
  e.nav.onLine = false; assert.strictEqual(await e.up.check(), 'offline');
  const f = fakeEnv({ fail: true }); await f.up.register('sw.js'); assert.strictEqual(await f.up.check(), 'offline', 'network error = offline');
  assert.strictEqual(e.reloads + f.reloads, 0);
  assert.strictEqual(TEXT.latest, 'You have the latest version');
  assert.strictEqual(TEXT.offline, "You're offline, try again later");
});
test('button: new version → waits for install, asks it to take over, reloads on controllerchange', async () => {
  const w = worker('installing');
  const e = fakeEnv({ next: () => w }); await e.up.register('sw.js');
  const p = e.up.check(); await tick(); w.go('installed'); e.reg.waiting = w;
  assert.strictEqual(await p, 'updating');
  assert.deepStrictEqual(w.msgs, [{ type: 'SKIP_WAITING' }]);
  assert.strictEqual(e.reloads, 0, 'no reload before the new worker takes over');
  e.fireControllerChange(); e.fireControllerChange();
  assert.strictEqual(e.reloads, 1);
});
test('background poll finds a new version → banner only, no reload until apply()', async () => {
  const w = worker('installing');
  const e = fakeEnv({ next: () => w }); await e.up.register('sw.js');
  assert.ok(await e.up.poll()); w.go('installed');
  assert.strictEqual(e.banners, 1); assert.ok(e.up.hasUpdate());
  e.fireControllerChange(); assert.strictEqual(e.reloads, 0, 'a controllerchange without a tap never reloads');
  e.up.apply(); assert.deepStrictEqual(w.msgs, [{ type: 'SKIP_WAITING' }]); e.fireControllerChange(); assert.strictEqual(e.reloads, 1);
});
test('first install (no controller yet) shows no banner', async () => {
  const w = worker('installing');
  const e = fakeEnv({ next: () => w, noController: true }); await e.up.register('sw.js');
  await e.up.poll(); w.go('installed'); assert.strictEqual(e.banners, 0);
});
test('a version already waiting at load shows the banner', async () => {
  const e = fakeEnv(); e.reg.waiting = worker('installed'); await e.up.register('sw.js'); assert.strictEqual(e.banners, 1);
});
test('poll offline is quiet', async () => {
  const e = fakeEnv(); await e.up.register('sw.js'); e.nav.onLine = false; assert.strictEqual(await e.up.poll(), false); assert.strictEqual(e.reg.updates, 0);
});
test('failed install → latest, no reload', async () => {
  const w = worker('installing'); const e = fakeEnv({ next: () => w }); await e.up.register('sw.js');
  const p = e.up.check(); await tick(); w.go('redundant'); assert.strictEqual(await p, 'latest'); assert.strictEqual(e.reloads, 0);
});

/* ---------- the service worker itself, in a fake worker scope ---------- */
function loadSW(existingCaches, online) {
  const store = new Map(existingCaches.map((k) => [k, new Map()]));
  const h = {}, calls = { skip: 0, fetched: [] };
  const caches = {
    open: async (k) => { if (!store.has(k)) store.set(k, new Map()); const m = store.get(k);
      return { addAll: async (reqs) => reqs.forEach((r) => { calls.fetched.push(r); m.set(new URL(r.url, 'https://x/l/').href, 'cached:' + r.url); }), put: async (r, v) => m.set(r.url || r, v) }; },
    keys: async () => [...store.keys()], delete: async (k) => store.delete(k),
    match: async (r) => { const u = new URL(typeof r === 'string' ? r : r.url, 'https://x/l/').href.split('?')[0]; for (const m of store.values()) if (m.has(u)) return m.get(u); return undefined; }
  };
  class Req { constructor(u, o) { this.url = new URL(u, 'https://x/l/').href; this.cache = o && o.cache; } }
  const self = { location: new URL('https://x/l/sw.js'), addEventListener: (k, f) => (h[k] = f), skipWaiting: () => { calls.skip++; return Promise.resolve(); }, clients: { claim: async () => {} } };
  const ctx = { self, caches, Request: Req, URL, Promise, setTimeout, clearTimeout, Response: { error: () => 'ERR' },
    fetch: async (u, o) => { calls.fetched.push({ url: u, cache: o && o.cache }); if (!online()) throw new Error('offline'); return { ok: true, status: 200, type: 'basic', clone() { return 'net:' + u; }, body: 'net:' + u }; } };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), ctx);
  return { h, calls, store, run: async (k, e) => { let p; e.waitUntil = (x) => (p = x); e.respondWith = (x) => (p = x); h[k](e); return p; } };
}
test('sw: precache bypasses the HTTP cache; waits for a tap unless upgrading from a pre-banner build', async () => {
  const a = loadSW(['learn-v3'], () => true); await a.run('install', {}); // upgrading from v3 (has the banner) waits for a tap
  assert.strictEqual(a.calls.skip, 0, 'normal update waits');
  assert.ok(a.calls.fetched.every((r) => r.cache === 'reload'));
  const b = loadSW(['learn-v2'], () => true); await b.run('install', {}); assert.strictEqual(b.calls.skip, 1, 'legacy v2 is replaced at once');
  a.h.message({ data: { type: 'SKIP_WAITING' } }); assert.strictEqual(a.calls.skip, 1);
  await a.run('activate', {}); assert.deepStrictEqual([...a.store.keys()], ['learn-v4']);
});
test('sw: app files network-first (no-cache) online, cached offline; navigation falls back to index.html', async () => {
  let on = true; const s = loadSW([], () => on); await s.run('install', {});
  const res = await s.run('fetch', { request: { method: 'GET', url: 'https://x/l/js/core/app.js', mode: 'cors' } });
  assert.strictEqual(res.body, 'net:https://x/l/js/core/app.js');
  assert.ok(s.calls.fetched.some((f) => f.cache === 'no-cache'));
  on = false;
  assert.strictEqual(await s.run('fetch', { request: { method: 'GET', url: 'https://x/l/js/core/app.js', mode: 'cors' } }), 'net:https://x/l/js/core/app.js');
  assert.strictEqual(await s.run('fetch', { request: { method: 'GET', url: 'https://x/l/?fast=1', mode: 'navigate' } }), 'cached:https://x/l/');
  assert.strictEqual(await s.run('fetch', { request: { method: 'GET', url: 'https://x/l/nope', mode: 'navigate' } }), 'cached:https://x/l/index.html');
});
test('sw: BUILD stamp is current (run node tools/build-sw.js) and cache is learn-v4', () => {
  assert.strictEqual(SW.currentBuild(), SW.buildHash());
  assert.match(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), /var CACHE = 'learn-v4'/);
});
