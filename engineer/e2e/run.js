/* Headless iPhone-emulation check (npm run e2e).
 * Serves the folder at /salah-royal-rescue/engineer/, then verifies: menu, every world map + level 1
 * (buddy appears, level can be completed through the real UI), Practice Room, resume after reload,
 * service worker + offline, and no console errors. Screenshots go to /workspace/little-engineer-shots/. */
'use strict';
const fs = require('fs');
const path = require('path');
const { start } = require('./server.js');
const pw = require('playwright');

const SHOTS = process.env.SHOTS_DIR || '/workspace/little-engineer-shots';
const WORLDS = [
  { id: 'bridges', shot: 'bridges.png' },
  { id: 'machines', shot: 'machines.png' },
  { id: 'circuits', shot: 'circuits.png' },
  { id: 'robot', shot: 'robot.png' },
  { id: 'construction', shot: 'construction.png' }
];

let failures = 0;
const results = [];
function ok(name) { results.push('  ✔ ' + name); console.log('  ✔ ' + name); }
function bad(name, err) { failures++; results.push('  ✘ ' + name + ': ' + err); console.log('  ✘ ' + name + ': ' + err); }
async function check(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, (e && e.message || String(e)).split('\n')[0]); }
}

async function dismissTip(page) {
  // Tip card ("New idea!") may appear on first visit to a level.
  for (let i = 0; i < 3; i++) {
    const tip = page.locator('.overlay.tip .btn');
    if (await tip.count()) { await tip.first().click(); await page.waitForTimeout(400); } else break;
  }
}

async function waitDemoDone(page) {
  await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 60000 });
}

async function runBrowser(browserType, name, device) {
  console.log(`\n▶ ${name} (${device})`);
  const browser = await browserType.launch();
  const context = await browser.newContext({ ...pw.devices[device], serviceWorkers: 'allow' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const { server, url } = await start(0);
  const shot = (f) => (name === 'chromium' ? page.screenshot({ path: path.join(SHOTS, f) }) : page.screenshot({ path: path.join(SHOTS, name + '-' + f) }));

  try {
    await page.goto(url + '?fast=1');
    await page.waitForSelector('.menu-screen');
    await page.waitForTimeout(900);

    await check('menu: title, buddy, 5 worlds, Car Builder & Race, settings', async () => {
      const t = await page.textContent('.menu-title');
      if (!/Little Engineer/.test(t)) throw new Error('title missing');
      for (const w of WORLDS) if (!(await page.locator('.w-' + w.id).count())) throw new Error('missing world ' + w.id);
      if (!(await page.locator('.car-btn').count())) throw new Error('no Car Builder button');
      if (await page.locator('.practice-btn').count()) throw new Error('Practice Room still in the menu');
      if (!(await page.locator('.menu-buddy .buddy-svg').count())) throw new Error('no buddy');
      if (!(await page.locator('.settings-btn').count())) throw new Error('no settings');
      await shot('menu.png');
    });

    await check('first tap unlocks WebAudio', async () => {
      await page.tap('.menu-bubble');
      const st = await page.evaluate(() => LE.sound.state);
      if (st !== 'running') throw new Error('AudioContext state ' + st);
    });

    await check('settings: sound toggle + reset confirm dialog', async () => {
      await page.tap('.settings-btn');
      await page.waitForSelector('.overlay.settings');
      await page.tap('.overlay.settings .btn.green');           // sound off
      const off = await page.evaluate(() => JSON.parse(localStorage.getItem('littleEngineerSave')).settings.sound);
      if (off !== false) throw new Error('sound not saved');
      await page.tap('.overlay.settings .btn.green');           // sound back on
      await page.tap('.overlay.settings .btn.red');             // reset → confirm dialog
      await page.waitForSelector('.overlay.confirm');
      await page.tap('.overlay.confirm .btn.blue');             // "No"
      await page.waitForTimeout(300);
    });

    for (const w of WORLDS) {
      await check(`${w.id}: map loads with >= 15 levels`, async () => {
        await page.evaluate(() => LE.closeOverlay());
        await page.evaluate(() => LE.app.showMenu());
        await page.waitForTimeout(350);
        await page.tap('.w-' + w.id);
        await page.waitForSelector('.map-screen .level-node');
        const n = await page.locator('.level-node').count();
        if (n < 15) throw new Error('only ' + n + ' levels');
        if (w.id === 'robot' && (await page.locator('.practice-strip, .practice-mini').count())) throw new Error('Practice Room button still on the Robot map');
        await page.waitForTimeout(300);
        await shot(w.id + '-map.png');
      });

      await check(`${w.id}: level 1 opens, buddy appears`, async () => {
        await page.tap('.level-node[data-level="0"]');
        await page.waitForSelector('.level-screen .play-host');
        await page.waitForTimeout(700);
        await dismissTip(page);
        await page.waitForSelector('.buddy-char .buddy-svg', { state: 'visible' });
        await page.waitForSelector('.bubble.show', { timeout: 5000 });
      });

      await check(`${w.id}: level 1 completed through the UI`, async () => {
        if (w.id === 'robot') {
          // Real taps: the guided tutorial asks for two Forward blocks, then Play.
          const okBtn = page.locator('.bubble.show .btn');
          if (await okBtn.count()) await okBtn.first().tap();
          await page.waitForTimeout(300);
          await page.tap('.tray-blk[data-type="F"]');
          await page.waitForTimeout(300);
          await page.tap('.tray-blk[data-type="F"]');
          await page.waitForTimeout(400);
          await shot(w.shot);
          await page.tap('.go-btn');
        } else {
          // Ask the buddy: "Show me" demonstrates the solution (no stars, then the level goes back to the start),
          // then the stored solution is built through the same UI code paths and Go is pressed.
          await page.tap('.buddy-char');
          await page.waitForSelector('.showme-btn', { state: 'visible' });
          await page.tap('.showme-btn');
          await page.waitForTimeout(300);
          await waitDemoDone(page);
          const demo = await page.evaluate(() => LE.activeLevel.lastDemo);
          if (!demo || !demo.solved) throw new Error('demo did not solve: ' + JSON.stringify(demo));
          const demoStars = await page.evaluate((id) => (JSON.parse(localStorage.getItem('littleEngineerSave')).stars[id] || [])[0] || 0, w.id);
          if (demoStars) throw new Error('the demo gave stars');
          await page.evaluate(() => LE.activeLevel.solve());
          await page.waitForTimeout(400);
          const noGo = await page.evaluate(() => !!(LE.activeLevel.inst && LE.activeLevel.inst.noGo));
          if (noGo) {
            // Worlds without Go win live: show the finished (lit) board, not the half-faded win card.
            await page.waitForSelector('.overlay.win', { timeout: 60000 });
            await page.addStyleTag({ content: '.overlay.win { visibility: hidden !important; } #shot-hide {}' });
            await page.waitForTimeout(1200);
            await shot(w.shot);
            await page.evaluate(() => { [...document.querySelectorAll('style')].filter((s) => s.textContent.includes('#shot-hide')).forEach((s) => s.remove()); });
          } else await shot(w.shot);
          if (!noGo && !(await page.locator('.overlay.win').count())) await page.tap('.go-btn');
        }
        await page.waitForSelector('.overlay.win', { timeout: 60000 });
        await page.waitForTimeout(2200);
        await shot(w.id + '-win.png');
        const stars = await page.evaluate((id) => JSON.parse(localStorage.getItem('littleEngineerSave')).stars[id][0], w.id);
        if (!(stars >= 1)) throw new Error('stars not saved: ' + stars);
      });

      await check(`${w.id}: Next goes straight to level 2`, async () => {
        await page.tap('.next-btn');
        await page.waitForTimeout(900);
        await dismissTip(page);
        const num = await page.textContent('.lvl-num');
        if (num.trim() !== '2') throw new Error('level shown: ' + num);
        await page.waitForSelector('.buddy-char', { state: 'visible' });
      });
    }

    await check('resume: reopening the app returns to the same level (construction)', async () => {
      await page.reload();
      await page.waitForSelector('.level-screen.theme-construction');
      await page.waitForTimeout(500);
      const num = await page.textContent('.lvl-num');
      if (num.trim() !== '2') throw new Error('resumed at ' + num);
    });

    await check('resume: construction in-progress moves are restored', async () => {
      await dismissTip(page);
      await page.evaluate(() => LE.closeOverlay());
      const before = await page.evaluate(() => JSON.stringify(LE.app.store.getInProgress('construction', 1)));
      const r = await page.evaluate(() => { const t = LE.activeLevel.inst.target('btn:R'); return { x: t.left + t.width / 2, y: t.top + t.height / 2 }; });
      await page.mouse.click(r.x, r.y);                      // drive the bulldozer one step
      await page.waitForTimeout(800);
      const saved = await page.evaluate(() => LE.app.store.getInProgress('construction', 1));
      if (!saved || JSON.stringify(saved) === before) throw new Error('no in-progress state saved');
      await page.reload();
      await page.waitForSelector('.level-screen.theme-construction');
      await page.waitForTimeout(600);
      const after = await page.evaluate(() => LE.app.store.getInProgress('construction', 1));
      if (JSON.stringify(after) !== JSON.stringify(saved)) throw new Error('state changed after reload');
      if (!(await page.textContent('.bubble-text')).includes('Welcome back')) throw new Error('no welcome back');
    });

    await check('resume: reopening the app returns to the same level (robot)', async () => {
      await page.evaluate(() => { LE.app.store.setStars('robot', 0, 1); LE.app.openLevel('robot', 1); });
      await page.waitForTimeout(500);
      await page.reload();
      await page.waitForSelector('.level-screen.theme-robot');
      await page.waitForTimeout(500);
      const num = await page.textContent('.lvl-num');
      if (num.trim() !== '2') throw new Error('resumed at ' + num);
    });

    await check('resume keeps the in-progress program', async () => {
      await dismissTip(page);
      const okBtn = page.locator('.bubble.show .btn');
      if (await okBtn.count()) await okBtn.first().tap();
      await page.tap('.tray-blk[data-type="F"]');
      await page.tap('.tray-blk[data-type="F"]');
      await page.waitForTimeout(200);
      await page.reload();
      await page.waitForSelector('.level-screen.theme-robot .rb-strip');
      await page.waitForTimeout(400);
      const n = await page.locator('.rb-strip > .blk').count();
      if (n !== 2) throw new Error('program blocks after reload: ' + n);
    });

    await check('Car Builder & Race: opens from the menu slot, garage has a starter car, buddy intro', async () => {
      await page.evaluate(() => LE.app.showMenu());
      await page.waitForTimeout(350);
      await page.tap('.car-btn');
      await page.waitForSelector('.garage-screen .cg-car');
      await page.waitForSelector('.buddy-char', { state: 'visible' });
      if ((await page.locator('.cg-car').count()) !== 1) throw new Error('starter car missing');
      await shot('cars-garage.png');
    });

    await check('Car Builder: a part changes the car + stats; the race ends with stars and a tip', async () => {
      await page.tap('.cg-car');
      await page.waitForSelector('.cb-tab[data-slot="engine"]');
      await page.tap('.cb-tab[data-slot="engine"]');
      const before = await page.getAttribute('.cb-bar[data-stat="speed"]', 'data-value');
      await page.tap('.cb-part[data-id="big"]');
      await page.waitForTimeout(200);
      const after = await page.getAttribute('.cb-bar[data-stat="speed"]', 'data-value');
      if (!(Number(after) > Number(before))) throw new Error('speed ' + before + ' → ' + after);
      await page.tap('.cb-race');
      await page.waitForSelector('.ct-track[data-track="sunny"]');
      await page.tap('.ct-track[data-track="sunny"]');
      await page.waitForSelector('.race-results .cr-tip', { timeout: 60000 });
      const stars = await page.locator('.cr-stars .on').count();
      if (stars < 1) throw new Error('no stars');
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('littleEngineerSave')).cars);
      if (!saved.best.sunny || saved.garage[0].engine !== 'big') throw new Error(JSON.stringify(saved));
      await shot('cars-results.png');
    });

    await check('Show me in the Car Builder drags a helpful part onto the car', async () => {
      await page.tap('.cr-build');
      await page.waitForSelector('.build-screen .cb-part');
      await page.evaluate(() => { const s = LE.app.store; s.saveCar(Object.assign({}, s.getCar(s.getCurrentCar()), { wheels: 'monster', engine: 'small' })); });
      await page.evaluate(() => LE.cars.showBuild(LE.app.store.getCurrentCar()));
      await page.waitForSelector('.build-screen .cb-part');
      const before = await page.evaluate(() => JSON.stringify(LE.activeCars.car()));
      await page.tap('.cb-showme');
      await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 30000 });
      const after = await page.evaluate(() => JSON.stringify(LE.activeCars.car()));
      if (before === after) throw new Error('show me changed nothing');
    });

    if (name === 'chromium') {
      await check('service worker caches engineer-v3 and the game works offline', async () => {
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.waitForFunction(async () => (await caches.keys()).some((k) => k.indexOf('engineer-v3-') === 0), null, { timeout: 15000 });
        await page.waitForFunction(async () => {
          const c = await caches.open((await caches.keys()).find((k) => k.indexOf('engineer-v3-') === 0));
          return (await c.keys()).length > 20;
        }, null, { timeout: 15000 });
        await context.setOffline(true);
        await page.goto(url + '?menu=1');
        await page.waitForSelector('.menu-screen', { timeout: 10000 });
        await context.setOffline(false);
      });
    }

    await check('no console errors', async () => {
      if (errors.length) throw new Error(errors.length + ' error(s): ' + errors.slice(0, 5).join(' | '));
    });
  } finally {
    await browser.close();
    server.close();
  }
}

/* Voice clips: with a clip present LE.speak plays it through WebAudio (not speechSynthesis);
 * without one it falls back to speechSynthesis. Uses route interception + a short tone mp3 made with ffmpeg. */
async function voiceCheck() {
  console.log('\n▶ voice clips (chromium, iPhone 13)');
  const os = require('os');
  const { execFileSync } = require('child_process');
  const VK = require('../js/core/voice-key.js');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'le-voice-'));
  const mp3 = path.join(tmp, 'tone.mp3');
  try {
    execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.9', '-ac', '1', '-ar', '22050', '-b:a', '32k', mp3]);
  } catch (e) { bad('voice: ffmpeg available to make a test clip', String(e.message).split('\n')[0]); return; }
  const browser = await pw.chromium.launch();
  const context = await browser.newContext({ ...pw.devices['iPhone 13'] });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const { server, url } = await start(0);
  const withClip = 'Hi Salah! What shall we build today?';
  const goal = (require('../js/data/bridges-levels.js').levels[0]).goal;
  const keys = [VK.key(withClip), VK.key(goal)];
  await page.route('**/audio/voice/manifest.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(keys) }));
  for (const k of keys) await page.route('**/audio/voice/' + k + '.mp3', (r) => r.fulfill({ contentType: 'audio/mpeg', body: fs.readFileSync(mp3) }));
  await page.addInitScript(() => {
    window.__synth = []; window.__clips = 0;
    if (window.speechSynthesis) { const o = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { window.__synth.push(u.text); return o(u); }; }
    const AB = window.AudioBufferSourceNode;
    if (AB) { const st = AB.prototype.start; AB.prototype.start = function () { if (this.buffer && this.buffer.duration > 0.1) window.__clips++; return st.apply(this, arguments); }; }
  });
  try {
    await page.goto(url + '?menu=1&nosw=1');
    await page.waitForSelector('.menu-screen');
    await page.waitForTimeout(500);
    await check('voice: browser and Node compute the same clip keys', async () => {
      const b = await page.evaluate((t) => t.map((x) => LE.voiceKey.key(x)), [withClip, goal, 'Watch me! 👀', 'Ada’s robot']);
      const n = [withClip, goal, 'Watch me! 👀', 'Ada’s robot'].map(VK.key);
      if (JSON.stringify(b) !== JSON.stringify(n)) throw new Error(b + ' vs ' + n);
    });
    await check('voice: a line with a clip plays through WebAudio (not speechSynthesis) and the promise waits for it', async () => {
      await page.tap('.menu-bubble');                 // first tap unlocks audio (iOS rule)
      const r = await page.evaluate(async (t) => {
        await LE.voice.ready();
        const t0 = performance.now();
        const p = LE.speak(t);
        await new Promise((res) => setTimeout(res, 150));
        const playing = LE.voice.playing;
        await p;
        return { ms: performance.now() - t0, playing, clips: window.__clips, synth: window.__synth.length, state: LE.sound.state };
      }, withClip);
      if (r.state !== 'running') throw new Error('audio state ' + r.state);
      if (!r.playing || r.clips < 1) throw new Error('clip not played via WebAudio ' + JSON.stringify(r));
      if (r.synth !== 0) throw new Error('speechSynthesis was used');
      if (r.ms < 700) throw new Error('speak() resolved before the clip ended: ' + Math.round(r.ms) + 'ms');
    });
    await check('voice: a line without a clip falls back to speechSynthesis', async () => {
      const r = await page.evaluate(async () => { const c = window.__clips; await LE.speak('This line has no clip yet.'); return { synth: window.__synth.slice(), clips: window.__clips - c }; });
      if (!r.synth.includes('This line has no clip yet.')) throw new Error('synth not used: ' + JSON.stringify(r));
      if (r.clips !== 0) throw new Error('WebAudio clip played for a missing line');
    });
    await check('voice: muted → no clip, speak() resolves at once', async () => {
      const r = await page.evaluate(async (t) => { LE.sound.setMuted(true); const c = window.__clips, t0 = performance.now(); await LE.speak(t); const out = { ms: performance.now() - t0, clips: window.__clips - c }; LE.sound.setMuted(false); return out; }, withClip);
      if (r.clips !== 0 || r.ms > 100) throw new Error(JSON.stringify(r));
    });
    await check('voice: level goal clip prefetched + the 🔊 button replays the clip', async () => {
      await page.evaluate(() => { LE.app.store.data.seenTips['bridges:road'] = true; LE.app.store.setStars('bridges', 0, 1); LE.app.openLevel('bridges', 0, { fresh: true }); });
      await page.waitForSelector('.bubble.show', { timeout: 8000 });
      await page.waitForFunction(() => LE.voice._stats().decoded >= 2, null, { timeout: 8000 });
      await page.waitForTimeout(1500);
      const before = await page.evaluate(() => window.__clips);
      await page.tap('.bubble-speak');
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({ clips: window.__clips, playing: LE.voice.playing }));
      if (r.clips <= before || !r.playing) throw new Error('replay did not play the clip ' + JSON.stringify(r));
    });
    await check('voice: Show me waits for each narrated line to finish (no talking over)', async () => {
      const all = JSON.parse(fs.readFileSync(path.join(__dirname, '../audio/voice/lines.json'), 'utf8')).map((l) => l.id).concat(keys);
      await page.unroute('**/audio/voice/manifest.json');
      await page.route('**/audio/voice/manifest.json', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(all) }));
      await page.route(/\/audio\/voice\/[0-9a-f]{8}\.mp3$/, (r) => r.fulfill({ contentType: 'audio/mpeg', body: fs.readFileSync(mp3) }));
      await page.goto(url + '?nosw=1&menu=1');
      await page.waitForSelector('.menu-screen');
      await page.tap('.menu-bubble');
      await page.evaluate(() => {
        window.__overlap = []; window.__lines = [];
        const orig = LE.speak;
        // The intro ("Watch me!") may cut the goal line short — the kid tapped Show me. After that, no overlaps.
        LE.speak = function (t) { if (LE.voice.playing && window.__lines.length) window.__overlap.push(String(t)); window.__lines.push(String(t)); return orig.apply(this, arguments); };
        const s = LE.app.store; s.setStars('bridges', 0, 1); s.setStars('bridges', 1, 1); s.data.seenTips['bridges:triangle'] = true;
        LE.app.openLevel('bridges', 2, { fresh: true });
      });
      await page.waitForSelector('.bubble.show', { timeout: 8000 });
      await page.evaluate(() => { window.__overlap = []; window.__lines = []; LE.showMeForce = true; LE.activeLevel.showMe(); });
      await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 120000 });
      await page.waitForFunction(() => /your turn/i.test(document.querySelector('.bubble-text').textContent), null, { timeout: 15000 });
      const r = await page.evaluate(() => ({ overlap: window.__overlap, lines: window.__lines }));
      if (r.lines.length < 3) throw new Error('too few lines: ' + r.lines.join(' / '));
      if (r.overlap.length) throw new Error('started while a clip was playing: ' + r.overlap.join(' / '));
    });
    await check('voice: no console errors', async () => { if (errors.length) throw new Error(errors.slice(0, 3).join(' | ')); });
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const only = process.env.E2E_ONLY;              // 'voice' → just the voice checks
  if (!only) await runBrowser(pw.chromium, 'chromium', 'iPhone 13');
  await voiceCheck();
  if (!only && !process.env.SKIP_WEBKIT) {
    let canWebkit = true;
    try { const b = await pw.webkit.launch(); await b.close(); } catch (e) { canWebkit = false; console.log('\n(WebKit not runnable on this host — skipped: ' + String(e.message).split('\n')[0] + ')'); }
    if (canWebkit) await runBrowser(pw.webkit, 'webkit', 'iPhone 13');
  }
  console.log(`\n${failures ? '✘' : '✔'} e2e finished: ${results.length - failures}/${results.length} checks passed. Screenshots in ${SHOTS}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
