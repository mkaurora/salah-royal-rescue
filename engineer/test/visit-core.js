// Shared checks for the "opened" beacon (runs the real beacon code in a vm with a fake browser).
'use strict';
const vm = require('vm');
function run(src, o) {
  o = o || {};
  const sent = [], store = Object.assign({}, o.store || {}), timers = [], listeners = {};
  const doc = { readyState: 'complete', visibilityState: 'visible', addEventListener: (t, f) => { (listeners['doc:' + t] = listeners['doc:' + t] || []).push(f); } };
  const nav = { userAgent: o.ua || 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', maxTouchPoints: 5, onLine: o.offline ? false : true,
    sendBeacon: o.noBeacon ? undefined : (u, b) => { sent.push({ via: 'beacon', u, b: JSON.parse(b) }); return true; } };
  let now = 1e12;
  const g = {
    location: { hostname: o.host || 'mkaurora.github.io' }, document: doc, navigator: nav,
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    crypto: { getRandomValues: (a) => { for (let i = 0; i < a.length; i++) a[i] = (i * 37 + 11) & 255; return a; } },
    setTimeout: (f) => { timers.push(f); }, Date: { now: () => now },
    addEventListener: (t, f) => { (listeners['win:' + t] = listeners['win:' + t] || []).push(f); },
    fetch: (u, opt) => { sent.push({ via: 'fetch', u, b: JSON.parse(opt.body), opt }); return Promise.resolve(); },
    GAME_VERSION: { version: o.version || '9.9' }, Uint8Array, JSON, String, Math
  };
  g.self = g;
  vm.runInNewContext(src, g);
  const flush = () => { while (timers.length) timers.shift()(); };
  flush();
  return { sent, store, flush, listeners, advance: (ms) => { now += ms; }, g };
}
module.exports = function check(assert, src, game) {
  let r = run(src);
  assert.strictEqual(r.sent.length, 1, 'one beacon on open');
  assert.strictEqual(r.sent[0].u, 'https://salah-family-chat.mkaurora.workers.dev/api/visit');
  assert.deepStrictEqual(Object.keys(r.sent[0].b).sort(), ['d', 'g', 't', 'v'], 'only game, version, device id, type');
  assert.strictEqual(r.sent[0].b.g, game);
  assert.strictEqual(r.sent[0].b.v, '9.9');
  assert.strictEqual(r.sent[0].b.t, 'iPhone');
  assert.match(r.sent[0].b.d, /^[0-9a-f]{32}$/);
  assert.strictEqual(r.store['visit.id'], r.sent[0].b.d, 'random id kept in localStorage');
  r.listeners['doc:visibilitychange'][0](); r.flush();
  assert.strictEqual(r.sent.length, 1, 'resume within a minute: throttled');
  r.advance(61000); r.listeners['doc:visibilitychange'][0](); r.flush();
  assert.strictEqual(r.sent.length, 2, 'resume later: one more beacon');
  assert.strictEqual(run(src, { store: { 'visit.id': r.store['visit.id'] } }).sent[0].b.d, r.store['visit.id'], 'same id next time');
  assert.strictEqual(run(src, { offline: true }).sent.length, 0, 'offline: nothing sent, no error');
  assert.strictEqual(run(src, { host: '127.0.0.1' }).sent.length, 0, 'local copies never call the real server');
  assert.strictEqual(run(src, { host: '127.0.0.1', store: { 'visit.devApi': 'http://127.0.0.1:47310/api/visit' } }).sent[0].u, 'http://127.0.0.1:47310/api/visit');
  const f = run(src, { noBeacon: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile' });
  assert.strictEqual(f.sent[0].via, 'fetch'); assert.strictEqual(f.sent[0].opt.mode, 'no-cors'); assert.strictEqual(f.sent[0].b.t, 'Android phone');
  assert.doesNotThrow(() => run(src, { store: null, host: 'mkaurora.github.io' }));
};
