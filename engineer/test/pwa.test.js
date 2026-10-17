'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { appFiles } = require('../tools/build-sw.js');

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

test('service worker: cache engineer-v1, precaches every app file, registered with scope ./', () => {
  const sw = read('sw.js');
  assert.match(sw, /var CACHE = 'engineer-v1';/);
  const listed = [...sw.matchAll(/^\s+'(\.\/[^']*)'/gm)].map((m) => m[1]);
  const expected = ['./'].concat(appFiles().map((f) => './' + f));
  assert.deepStrictEqual(listed.sort(), expected.sort(), 'run node tools/build-sw.js');
  assert.ok(listed.includes('./index.html') && listed.includes('./manifest.webmanifest'));
  const app = read('js/core/app.js');
  assert.match(app, /serviceWorker\.register\('\.\/sw\.js', \{ scope: '\.\/' \}\)/);
});

test('no runtime network calls or external URLs in app code', () => {
  appFiles().filter((f) => /\.(js|css|html)$/.test(f)).forEach((f) => {
    const src = read(f);
    assert.ok(!/https?:\/\/(?!www\.w3\.org)/.test(src), f + ' contains an external URL');
    assert.ok(!/\bfetch\(|XMLHttpRequest|WebSocket|import\(/.test(src), f + ' makes network calls');
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
