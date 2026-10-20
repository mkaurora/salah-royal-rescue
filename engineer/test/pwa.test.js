'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { appFiles, precacheList, precacheClips } = require('../tools/build-sw.js');

const ROOT = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function pngSize(file) {
  const b = fs.readFileSync(path.join(ROOT, file));
  assert.strictEqual(b.toString('ascii', 1, 4), 'PNG', file + ' is a PNG');
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

test('manifest has the required PWA fields', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.strictEqual(m.name, "Salah's Little Engineer");
  assert.strictEqual(m.short_name, 'Little Engineer');
  assert.strictEqual(m.start_url, '/salah-royal-rescue/engineer/');
  assert.strictEqual(m.scope, '/salah-royal-rescue/engineer/');
  assert.strictEqual(m.display, 'standalone');
  assert.strictEqual(m.orientation, 'portrait');
  assert.ok(m.theme_color && m.background_color);
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  m.icons.forEach((i) => {
    assert.ok(!i.src.startsWith('/'), 'relative icon path');
    const [w, h] = i.sizes.split('x').map(Number);
    assert.deepStrictEqual(pngSize(i.src), { w, h }, i.src);
  });
  assert.deepStrictEqual(pngSize('icons/apple-touch-icon.png'), { w: 180, h: 180 });
});

test('index.html: relative assets only, viewport-fit=cover, apple touch icon, all referenced files exist', () => {
  const html = read('index.html');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /rel="apple-touch-icon"[^>]*href="icons\/apple-touch-icon.png"/);
  assert.match(html, /rel="manifest" href="manifest.webmanifest"/);
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(refs.length > 10);
  refs.forEach((r) => {
    assert.ok(!/^(https?:)?\/\//.test(r) && !r.startsWith('/'), 'relative path: ' + r);
    assert.ok(fs.existsSync(path.join(ROOT, r)), 'exists: ' + r);
  });
});

test('service worker: cache engineer-v3, precaches every app file + early voice clips, registered with scope ./', () => {
  const sw = read('sw.js');
  assert.match(sw, /var CACHE = 'engineer-v3-' \+ BUILD;/);
  const { buildStamp } = require('../tools/build-sw.js');
  const stamp = (/var BUILD = '([0-9a-f]{10})';/.exec(sw) || [])[1];
  assert.strictEqual(stamp, buildStamp(precacheList()), 'build stamp is stale: run node tools/build-sw.js');
  assert.match(sw, /new Request\(u, \{ cache: 'reload' \}\)/, 'precache bypasses the HTTP cache');
  const listed = [...sw.matchAll(/^\s+'(\.\/[^']*)'/gm)].map((m) => m[1]);
  assert.deepStrictEqual(listed.slice().sort(), precacheList().sort(), 'run node tools/build-sw.js');
  listed.forEach((f) => assert.ok(f === './' || fs.existsSync(path.join(ROOT, f)), 'precached file exists on disk: ' + f));
  assert.ok(listed.includes('./index.html') && listed.includes('./manifest.webmanifest'));
  assert.ok(listed.includes('./audio/voice/manifest.json'), 'voice manifest is precached');
  assert.ok(!listed.includes('./audio/voice/lines.json'), 'lines.json is a tool file, not needed offline');
  precacheClips().forEach((f) => assert.ok(listed.includes('./' + f)));
  // only engineer-* caches other than the current one are deleted; only complete (200) responses are cached
  assert.match(sw, /k\.indexOf\('engineer-'\) === 0 && k !== CACHE/);
  assert.match(sw, /res\.status === 200/);
  const app = read('js/core/app.js');
  assert.match(app, /LE\.updater\.register\('\.\/sw\.js'\)/);
  const upd = fs.readFileSync(path.join(ROOT, 'js', 'core', 'updater.js'), 'utf8');
  assert.match(upd, /scope: '\.\/', updateViaCache: 'none'/);
});

test('no runtime network calls or external URLs in app code (the vendored helper SDK is the only exception)', () => {
  appFiles().filter((f) => /\.(js|css|html)$/.test(f)).forEach((f) => {
    if (f === 'js/core/visit.js') {   // the one exception: the fire-and-forget "opened" beacon to the family server
      const v = read(f);
      assert.deepStrictEqual(v.match(/https?:\/\/[^'"\s]+/g), ['https://salah-family-chat.mkaurora.workers.dev/api/visit']);
      assert.ok(!/XMLHttpRequest|WebSocket|import\(/.test(v));
      return;
    }
    const src = read(f);
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(src), f + ' contains an external URL');
    assert.ok(!/XMLHttpRequest|WebSocket|import\(/.test(src), f + ' makes network calls');
    // The only fetches: the game's own voice files (relative audio/voice/ paths) in audio.js.
    if (f === 'js/core/audio.js') assert.match(src, /var VOICE_DIR = 'audio\/voice\/';/);
    else assert.ok(!/\bfetch\(/.test(src), f + ' makes network calls');
  });
});

test('iOS audio unlock: synchronous unlock in capture listeners + interrupted handling', () => {
  const a = read('js/core/audio.js');
  ['touchstart', 'touchend', 'pointerdown', 'click'].forEach((ev) => assert.ok(a.includes("'" + ev + "'"), ev));
  assert.match(a, /capture: true/);
  assert.match(a, /createBuffer\(1, 1, 22050\)/);
  assert.match(a, /'interrupted'/);
  assert.match(a, /visibilitychange/);
  assert.match(a, /pageshow/);
});

test('styles: safe-area insets, no text selection, no rubber-banding', () => {
  const css = read('css/style.css');
  assert.match(css, /env\(safe-area-inset-top/);
  assert.match(css, /env\(safe-area-inset-bottom/);
  assert.match(css, /user-select: none/);
  assert.match(css, /-webkit-touch-callout: none/);
  assert.match(css, /overscroll-behavior: none/);
});
