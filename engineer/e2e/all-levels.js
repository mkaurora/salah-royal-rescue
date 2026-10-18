/* Plays EVERY level of the given worlds through the real UI ("Show me" → Go → win) on iPhone emulation.
 * Usage: node e2e/all-levels.js [world ...]   (default: all worlds)
 * Env: DEVICE="iPhone SE" to try the small screen. Screenshots go to <shots>/levels/<world>-NN.png. */
'use strict';
const fs = require('fs');
const path = require('path');
const { start } = require('./server.js');
const pw = require('playwright');

const SHOTS = path.join(process.env.SHOTS_DIR || '/workspace/little-engineer-shots', 'levels');
const DEVICE = process.env.DEVICE || 'iPhone 13';
const worlds = process.argv.slice(2).length ? process.argv.slice(2) : ['bridges', 'machines', 'circuits', 'robot', 'construction'];

(async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await pw.chromium.launch();
  const context = await browser.newContext({ ...pw.devices[DEVICE] });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const { server, url } = await start(0);
  const tag = DEVICE === 'iPhone 13' ? '' : '-' + DEVICE.replace(/\W+/g, '').toLowerCase();
  let failures = 0;
  try {
    await page.goto(url + '?fast=1');
    await page.waitForSelector('.menu-screen');
    for (const w of worlds) {
      const n = await page.evaluate((id) => LE.levels[id].length, w);
      for (let i = 0; i < n; i++) {
        const name = `${w}-${String(i + 1).padStart(2, '0')}${tag}`;
        try {
          await page.evaluate(([id, idx]) => {
            const s = LE.app.store;
            for (let k = 0; k < idx; k++) if (!s.getStars(id, k)) s.setStars(id, k, 1);
            s.clearInProgress(id, idx);
            LE.app.openLevel(id, idx);
          }, [w, i]);
          await page.waitForSelector('.level-screen .play-host');
          await page.waitForTimeout(500);
          for (let t = 0; t < 3; t++) {
            const tip = page.locator('.overlay.tip .btn');
            if (await tip.count()) { await tip.first().click(); await page.waitForTimeout(300); } else break;
          }
          const scroll = await page.evaluate(() => {
            const se = document.scrollingElement;
            return se.scrollHeight > window.innerHeight + 1 || document.querySelector('.play-host').scrollHeight > document.querySelector('.play-host').clientHeight + 1;
          });
          if (scroll) console.log(`  ! ${name}: content overflows the screen`);
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(SHOTS, name + '-start.png') });
          if (!(await page.locator('.showme-btn:visible').count())) {
            const okBtn = page.locator('.bubble.show .btn:visible');
            if (await okBtn.count()) { await okBtn.first().tap(); await page.waitForTimeout(200); }
            await page.tap('.buddy-char');
            await page.waitForSelector('.showme-btn', { state: 'visible' });
          }
          await page.tap('.showme-btn');
          await page.waitForTimeout(300);
          await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 60000 });
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(SHOTS, name + '.png') });
          const noGo = await page.evaluate(() => !!(LE.activeLevel.inst && LE.activeLevel.inst.noGo));
          const wonLive = await page.waitForSelector('.overlay.win', { timeout: 1500 }).then(() => true, () => false);
          if (!noGo && !wonLive) await page.tap('.go-btn', { timeout: 5000 });
          await page.waitForSelector('.overlay.win', { timeout: 60000 });
          const stars = await page.evaluate(([id, idx]) => LE.app.store.getStars(id, idx), [w, i]);
          if (stars !== 3) throw new Error('stars ' + stars);
          console.log(`  ✔ ${name} (3 stars)`);
        } catch (e) {
          failures++;
          console.log(`  ✘ ${name}: ${(e.message || e).split('\n')[0]}`);
          await page.screenshot({ path: path.join(SHOTS, name + '-FAIL.png') }).catch(() => {});
        }
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) { failures++; console.log('console errors:\n  ' + errors.join('\n  ')); }
  console.log(failures ? `✘ ${failures} problem(s)` : '✔ all levels won with 3 stars through the UI');
  process.exit(failures ? 1 : 0);
})();
