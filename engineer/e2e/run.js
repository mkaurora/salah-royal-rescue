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
  { id: 'robot', shot: 'robot.png' }
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

    await check('menu: title, buddy, 4 worlds, Practice Room, settings', async () => {
      const t = await page.textContent('.menu-title');
      if (!/Little Engineer/.test(t)) throw new Error('title missing');
      for (const w of WORLDS) if (!(await page.locator('.w-' + w.id).count())) throw new Error('missing world ' + w.id);
      if (!(await page.locator('.practice-btn').count())) throw new Error('no practice button');
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
        await page.evaluate(() => LE.app.showMenu());
        await page.waitForTimeout(350);
        await page.tap('.w-' + w.id);
        await page.waitForSelector('.map-screen .level-node');
        const n = await page.locator('.level-node').count();
        if (n < 15) throw new Error('only ' + n + ' levels');
        if (w.id === 'robot' && !(await page.locator('.practice-strip').count())) throw new Error('no Practice Room button on Robot map');
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
          // Ask the buddy: "Show me" demonstrates the solution through the real UI code path.
          await page.tap('.buddy-char');
          await page.waitForSelector('.showme-btn', { state: 'visible' });
          await page.tap('.showme-btn');
          await page.waitForTimeout(300);
          await waitDemoDone(page);
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

    await check('resume: reopening the app returns to the same level', async () => {
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

    await check('Practice Room: loads from menu, buddy, free play + challenges, cheer (no fail)', async () => {
      await page.evaluate(() => LE.app.showMenu());
      await page.waitForTimeout(350);
      await page.tap('.practice-btn');
      await page.waitForSelector('.practice-wrap .rb-board');
      await page.waitForSelector('.buddy-char', { state: 'visible' });
      const chips = await page.locator('.chip').count();
      if (chips < 9) throw new Error('challenge chips: ' + chips);
      await page.waitForTimeout(500);
      // free play: add a block and run — never fails
      await page.tap('.tray-blk[data-type="F"]');
      await page.tap('.go-btn');
      await page.waitForTimeout(1500);
      await shot('practice.png');
      if (await page.locator('.overlay.win').count()) throw new Error('practice must not show level win');
      await page.tap('[data-chip="p1"]');
      await page.waitForTimeout(400);
      await page.tap('.tray-blk[data-type="F"]');
      await page.tap('.tray-blk[data-type="F"]');
      await page.tap('.go-btn');
      await page.waitForSelector('.next-challenge', { timeout: 20000 });
      const done = await page.evaluate(() => JSON.parse(localStorage.getItem('littleEngineerSave')).practice.done.p1);
      if (!done) throw new Error('challenge not recorded');
      await shot('practice-cheer.png');
    });

    await check('Practice Room is reachable from the Robot Coder map', async () => {
      await page.evaluate(() => LE.app.showMap('robot'));
      await page.waitForSelector('.practice-strip');
      await page.tap('.practice-strip');
      await page.waitForSelector('.practice-wrap');
    });

    await check('Show me works in the Practice Room', async () => {
      await page.tap('[data-chip="p3"]');
      await page.waitForTimeout(300);
      await page.evaluate(() => LE.activeLevel.showMe());
      await waitDemoDone(page);
      const n = await page.locator('.rb-strip .blk').count();
      if (n !== 4) throw new Error('blocks after show me: ' + n);
      await page.tap('.go-btn');
      await page.waitForSelector('.next-challenge', { timeout: 20000 });
    });

    if (name === 'chromium') {
      await check('service worker caches engineer-v1 and the game works offline', async () => {
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.waitForFunction(async () => (await caches.keys()).includes('engineer-v1'), null, { timeout: 15000 });
        await page.waitForFunction(async () => {
          const c = await caches.open('engineer-v1');
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

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await runBrowser(pw.chromium, 'chromium', 'iPhone 13');
  if (!process.env.SKIP_WEBKIT) {
    let canWebkit = true;
    try { const b = await pw.webkit.launch(); await b.close(); } catch (e) { canWebkit = false; console.log('\n(WebKit not runnable on this host — skipped: ' + String(e.message).split('\n')[0] + ')'); }
    if (canWebkit) await runBrowser(pw.webkit, 'webkit', 'iPhone 13');
  }
  console.log(`\n${failures ? '✘' : '✔'} e2e finished: ${results.length - failures}/${results.length} checks passed. Screenshots in ${SHOTS}`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
