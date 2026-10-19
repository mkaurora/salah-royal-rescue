/* Plays EVERY level of the given worlds (and every weekly project step) through the real UI on iPhone emulation:
 *   1. "Show me" (tapped in the bubble): the guided demo must solve the level (Go worlds: the demo presses Go),
 *      award NO stars, and put the level back to its start;
 *   2. then the stored solution is built through the same code paths (LE.activeLevel.solve()) + Go → 3 stars.
 * Usage: node e2e/all-levels.js [world ... | weekly]   (default: all worlds + weekly)
 * Env: DEVICE="iPhone SE" to try the small screen. Screenshots go to <shots>/levels/<world>-NN.png. */
'use strict';
const fs = require('fs');
const path = require('path');
const { start } = require('./server.js');
const pw = require('playwright');

const SHOTS = path.join(process.env.SHOTS_DIR || '/workspace/little-engineer-shots', 'levels');
const DEVICE = process.env.DEVICE || 'iPhone 13';
const worlds = process.argv.slice(2).length ? process.argv.slice(2) : ['bridges', 'machines', 'circuits', 'robot', 'construction', 'weekly'];

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
    await page.goto(url + '?fast=1&now=2026-10-21T10:00:00Z');
    await page.waitForSelector('.menu-screen');
    await page.evaluate(() => LE.app.store.setWeeklyUnlockedMax(99));
    // jobs: [world, index] for map levels, ['weekly', projectId, stepIndex] for weekly steps
    const jobs = [];
    for (const w of worlds) {
      if (w === 'weekly') (await page.evaluate(() => LE.weeklyProjects.map((p) => [p.id, p.steps.length]))).forEach(([pid, n]) => { for (let k = 0; k < n; k++) jobs.push(['weekly', pid, k]); });
      else { const n = await page.evaluate((id) => LE.levels[id].length, w); for (let i = 0; i < n; i++) jobs.push([w, i]); }
    }
    for (const job of jobs) {
      const w = job[0], i = job[1];
      {
        const name = w === 'weekly' ? `weekly-${job[1]}-${job[2] + 1}${tag}` : `${w}-${String(i + 1).padStart(2, '0')}${tag}`;
        const starsOf = () => page.evaluate((job) => job[0] === 'weekly'
          ? LE.app.store.getStepStars(job[1], LE.weeklyProjects.find((p) => p.id === job[1]).steps[job[2]].id)
          : LE.app.store.getStars(job[0], job[1]), job);
        try {
          await page.evaluate((job) => {
            const s = LE.app.store;
            if (job[0] === 'weekly') {
              const p = LE.weeklyProjects.find((x) => x.id === job[1]), ids = p.steps.map((x) => x.id);
              for (let k = 0; k < job[2]; k++) if (!s.getStepStars(job[1], ids[k])) s.setStepStars(job[1], ids[k], 1, ids);
              s.clearInProgress('wk-' + job[1], job[2]);
              LE.app.openWeeklyStep(job[1], job[2]);
              return;
            }
            const id = job[0], idx = job[1];
            for (let k = 0; k < idx; k++) if (!s.getStars(id, k)) s.setStars(id, k, 1);
            s.clearInProgress(id, idx);
            LE.app.openLevel(id, idx);
          }, job);
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
          const before = await starsOf();
          await page.tap('.showme-btn');
          await page.waitForTimeout(300);
          await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 120000 });
          const demo = await page.evaluate(() => LE.activeLevel.lastDemo);
          if (!demo || !demo.solved) throw new Error('the demo did not solve the level: ' + JSON.stringify(demo));
          if (await page.locator('.overlay.win').count()) throw new Error('the demo opened the win card');
          if ((await starsOf()) !== before) throw new Error('the demo gave stars');
          await page.waitForTimeout(200);
          // then Salah does it himself (stored solution through the same UI code paths) → 3 stars
          await page.evaluate(() => LE.activeLevel.solve());
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(SHOTS, name + '.png') });
          const noGo = await page.evaluate(() => !!(LE.activeLevel.inst && LE.activeLevel.inst.noGo));
          const wonLive = await page.waitForSelector('.overlay.win', { timeout: 1500 }).then(() => true, () => false);
          if (!noGo && !wonLive) await page.tap('.go-btn', { timeout: 5000 });
          await page.waitForSelector('.overlay.win', { timeout: 60000 });
          const stars = await starsOf();
          if (stars !== 3) throw new Error('stars ' + stars);
          console.log(`  ✔ ${name} (demo solved, no stars; then 3 stars)`);
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
  console.log(failures ? `✘ ${failures} problem(s)` : `✔ all ${worlds.join(', ')} levels: demo solves (no stars), then 3 stars through the UI`);
  process.exit(failures ? 1 : 0);
})();
