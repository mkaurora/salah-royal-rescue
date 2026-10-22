/* v4 "Level 2" browser checks (part of `npm run e2e`; also: node e2e/v4.js, DEVICE="iPhone SE" | "Pixel 7").
 * Level 2 opens from the menu; one stage of each track completes through the real UI; Show me in each track; a Science Lab
 * lesson plays through and its build completes; parent area Level 2 unlock; resume after reload; Track A end-test
 * animation under 4× CPU throttle (≥ 45 fps); no overflow on small phones; no console errors.
 * Screenshots (iPhone 13) → /workspace/little-engineer-shots/level2/. */
'use strict';
const fs = require('fs');
const path = require('path');
const { start } = require('./server.js');
const pw = require('playwright');

const DEVICE = process.env.DEVICE || 'iPhone 13';
const SHOTS = process.env.SHOTS_DIR || '/workspace/little-engineer-shots/level2';
const PREFIX = DEVICE === 'iPhone 13' ? '' : DEVICE.replace(/\s+/g, '-').toLowerCase() + '-';
let failures = 0;
function ok(name) { console.log('  ✔ ' + name); }
function bad(name, err) { failures++; console.log('  ✘ ' + name + ': ' + err); }
async function check(name, fn) { try { await fn(); ok(name); } catch (e) { bad(name, (e && e.message || String(e)).split('\n').slice(0, process.env.E2E_DEBUG ? 14 : 1).join('\n')); } }

async function noOverflow(page, what) {
  const r = await page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight, out = [];
    if (document.scrollingElement.scrollHeight > H + 1 || document.scrollingElement.scrollWidth > W + 1) out.push('page scrolls');
    document.querySelectorAll('.screen:not(.leave) *, .overlay.show *').forEach((el) => {
      if (el.closest('.admin-body, .map-scroll, .scroll-y, #hand, .menu-sky, .l2-body, .buddy-svg')) return;   // the buddy's waving arm may swing a few px out
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') return;
      if (b.right > W + 1 || b.left < -1 || b.bottom > H + 1) out.push((typeof el.className === 'string' ? el.className : el.tagName) + ' ' + Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    });
    return out.slice(0, 5);
  });
  if (r.length) throw new Error((what || '') + ' overflow: ' + r.join(' | '));
}
/** Touch targets in the play area must be ≥ 48 px (tray blocks, chips, Go, nodes). */
async function bigTargets(page, sel) {
  const small = await page.evaluate((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null).map((e) => e.getBoundingClientRect())
    .filter((b) => b.width < 47.5 || b.height < 47.5).map((b) => Math.round(b.width) + 'x' + Math.round(b.height)), sel);
  if (small.length) throw new Error('small targets ' + sel + ': ' + small.slice(0, 4).join(', '));
}

async function newPage(browser, query, save) {
  const context = await browser.newContext({ ...pw.devices[DEVICE], serviceWorkers: 'block' });
  const page = await context.newPage();
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  if (save) await page.addInitScript((s) => { if (!localStorage.getItem('littleEngineerSave')) localStorage.setItem('littleEngineerSave', s); }, JSON.stringify(save));
  return { context, page };
}
/** The "New idea!" tip card opens ~350 ms after a stage starts (first time only): wait for it, then close it. */
async function tipAway(page) {
  await page.waitForSelector('.overlay.tip .btn', { timeout: 900 }).catch(() => {});
  await page.evaluate(() => { const b = document.querySelector('.overlay.tip .btn'); if (b) b.click(); });
  await page.waitForTimeout(300);
}
const waitDemo = (page) => page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 90000 });
async function solveAndGo(page) {
  await page.evaluate(() => LE.activeLevel.solve());
  await page.waitForTimeout(250);
  const live = await page.waitForSelector('.overlay.win', { timeout: 1200 }).then(() => true, () => false);
  if (!live) await page.tap('.play-host .go-btn');
  await page.waitForSelector('.overlay.win', { timeout: 60000 });
}

async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  const browser = await pw.chromium.launch();
  const { server, url } = await start(0);
  const shot = (page, f) => page.screenshot({ path: path.join(SHOTS, PREFIX + f) });
  console.log('\n▶ v4 Level 2 (' + DEVICE + ')');
  const { context, page } = await newPage(browser);
  try {
    await page.goto(url + '?fast=1&menu=1');
    await page.waitForSelector('.menu-screen');
    await page.waitForTimeout(800);

    await check('menu: a big gold "Level 2" card, every other button still on screen', async () => {
      const b = await page.locator('.w-level2').boundingBox();
      if (!b || b.height < 80) throw new Error('Level 2 card ' + JSON.stringify(b));
      if (!(await page.textContent('.w-level2')).includes('LEVEL 2')) throw new Error('ribbon');
      for (const sel of ['.w-bridges', '.w-machines', '.w-circuits', '.w-robot', '.w-construction', '.car-btn', '.weekly-card', '.settings-btn']) {
        const bb = await page.locator(sel).boundingBox();
        if (!bb) throw new Error('missing ' + sel);
      }
      await noOverflow(page, 'menu');
      await shot(page, '01-menu-level2-button.png');
    });

    await check('Level 2 opens from the menu: 3 tracks, Bronze open, Silver/Gold locked with the mastery rule', async () => {
      await page.tap('.w-level2');
      await page.waitForSelector('.l2-screen .l2-node');
      if ((await page.locator('.l2-tab').count()) !== 3) throw new Error('tabs');
      if ((await page.locator('.l2-tier').count()) !== 3) throw new Error('tiers');
      const lock = await page.textContent('.l2-tier.tier-1 .l2-tier-lock');
      if (!/Get 3 stars on 3 builds to open Silver/.test(lock)) throw new Error('mastery text: ' + lock);
      if ((await page.locator('.l2-node:not(.locked)').count()) !== 1) throw new Error('only stage 1 open');
      await page.tap('.l2-node[data-stage="a2"]');      // locked → buddy explains, nothing opens
      await page.waitForTimeout(300);
      if (await page.locator('.level-screen').count()) throw new Error('locked stage opened');
      await bigTargets(page, '.l2-node, .l2-tab, .l2-start');
      await noOverflow(page, 'hub');
      await page.waitForTimeout(400);
      await shot(page, '02-level2-hub.png');
    });

    await check('Track A: Heavy Truck — guided tutorial, Show me demo (no stars), then built through the UI → end test → stars', async () => {
      await page.tap('.l2-start');
      await page.waitForSelector('.level-screen.l2-level .br-canvas');
      await tipAway(page);
      await page.waitForTimeout(300);
      const tut = await page.evaluate(() => (LE.activeLevel.level.tutorial || []).length);
      if (tut < 5) throw new Error('no tutorial');
      await page.evaluate(() => LE.activeLevel.showMe());
      await waitDemo(page);
      const d = await page.evaluate(() => ({ demo: LE.activeLevel.lastDemo, stars: LE.app.store.getLevel2().stars.a1 || 0 }));
      if (!d.demo.solved || d.stars) throw new Error('demo ' + JSON.stringify(d));
      // build it through the real UI code path (same as the hand), then tap the real Go button
      await solveAndGo(page);
      const s = await page.evaluate(() => LE.app.store.getLevel2().stars.a1);
      if (s !== 3) throw new Error('stars ' + s);
      if (!(await page.locator('.overlay.win .fact').count())) throw new Error('no Did you know');
    });

    await check('Track A: Windy House — building screen, wind test fails without braces ("too strong" / wobbly), passes with them', async () => {
      await page.evaluate(() => { LE.closeOverlay(); LE.level2Hub.openStage('a', 1, { fresh: true }); });
      await page.waitForSelector('.fr-wrap .br-canvas');
      await tipAway(page);
      await page.evaluate(() => { LE.activeLevel.tutorialToken = 0; LE.activeLevel.buddy.hide(); });
      await page.waitForTimeout(400);
      // a house without braces
      await page.evaluate(() => { const i = LE.activeLevel.inst; [['1,4', '1,3'], ['3,4', '3,3'], ['1,3', '2,3'], ['2,3', '3,3'], ['1,3', '2,2'], ['2,2', '3,3']].forEach((b) => i.place(b[0].split(',').map(Number), b[1].split(',').map(Number))); });
      await page.waitForTimeout(300);
      await noOverflow(page, 'frame');
      await bigTargets(page, '.br-tool, .play-host .go-btn, .br-hud .btn');
      await shot(page, '03-challenge-build.png');
      await page.tap('.play-host .go-btn');
      await page.waitForFunction(() => !LE.activeLevel.inst.busy, null, { timeout: 30000 });
      await page.waitForTimeout(300);
      const said = await page.textContent('.buddy-bar');
      if (!/wobbly|triangle|wind/i.test(said)) throw new Error('fail message: ' + said);
      if (await page.locator('.overlay.win').count()) throw new Error('won without braces');
      await solveAndGo(page);
      if ((await page.evaluate(() => LE.app.store.getLevel2().stars.a2)) < 1) throw new Error('no stars');
    });

    await check('Track A end test is smooth under 4× CPU throttle (wind test, real speed): ≥ 45 fps', async () => {
      await page.evaluate(() => { LE.closeOverlay(); LE.FAST = false; LE.speed = 1; LE.level2Hub.openStage('a', 1, { fresh: true }); });
      await page.waitForSelector('.fr-wrap .br-canvas');
      await tipAway(page);
      await page.waitForTimeout(300);
      await page.evaluate(() => LE.activeLevel.solve());
      await page.waitForTimeout(800);
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(() => { LE.activeLevel.inst.resetPerf(); LE.activeLevel.inst.go(); });
      await page.waitForTimeout(1500);
      await shot(page, '04-challenge-end-test.png');
      await page.waitForSelector('.overlay.win', { timeout: 30000 });
      const perf = await page.evaluate(() => LE.activeLevel.inst.perf());
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await page.evaluate(() => { LE.FAST = true; LE.speed = 6; });
      console.log('    wind test: ' + perf.frames + ' frames, ' + perf.fps.toFixed(1) + ' fps, draw avg ' + perf.avgMs.toFixed(2) + ' ms, max ' + perf.maxMs.toFixed(1) + ' ms (4× CPU throttle)');
      fs.writeFileSync(path.join(SHOTS, PREFIX + 'perf.json'), JSON.stringify(perf, null, 1));
      if (perf.frames < 30 || perf.fps < 45) throw new Error('too slow: ' + JSON.stringify(perf));
    });

    await check('Track B: Plan Ahead — program built with taps, Run highlights each block, wins; Show me works', async () => {
      await page.evaluate(() => { LE.closeOverlay(); LE.level2Hub.openStage('b', 0, { fresh: true }); });
      await page.waitForSelector('.cd-wrap .cd-board');
      await tipAway(page);
      await page.evaluate(() => LE.activeLevel.buddy.hide());
      await page.waitForTimeout(300);
      await page.evaluate(() => LE.activeLevel.showMe());
      await waitDemo(page);
      if (!(await page.evaluate(() => LE.activeLevel.lastDemo.solved))) throw new Error('demo did not solve');
      // real taps on the tray: F F R F F R F F
      for (const t of ['F', 'F', 'R', 'F', 'F', 'R', 'F', 'F']) { await page.tap('.cd-tray-blk[data-type="' + t + '"]'); await page.waitForTimeout(60); }
      if ((await page.locator('.cd-strip[data-slot="m"] .cd-blk').count()) !== 8) throw new Error('blocks not added');
      await page.waitForTimeout(600);   // let the tap bounce animation settle before measuring
      await bigTargets(page, '.cd-tray-blk, .cd-controls .btn, .cd-blk:not(.cont)');
      await noOverflow(page, 'code');
      await page.tap('.cd-controls .go-btn');
      await page.waitForTimeout(150);
      await shot(page, '05-coding-puzzle.png');
      const hl = await page.evaluate(() => !!document.querySelector('.cd-blk.active'));
      await page.waitForSelector('.overlay.win', { timeout: 30000 });
      if (!hl) throw new Error('no highlighted block while running');
      if ((await page.evaluate(() => LE.app.store.getLevel2().stars.b1)) !== 3) throw new Error('stars');
    });

    await check('Track B: Step button runs one block at a time; a bug stage starts broken and fails', async () => {
      await page.evaluate(() => { LE.closeOverlay(); LE.logic.level2.unlockTo(LE.app.store.getLevel2(), 'b', 3); LE.level2Hub.openStage('b', 3, { fresh: true }); });
      await page.waitForSelector('.cd-wrap');
      await tipAway(page);
      await page.evaluate(() => LE.activeLevel.buddy.hide());
      await page.tap('.cd-step');
      await page.waitForTimeout(200);
      if (!(await page.evaluate(() => LE.activeLevel.inst.busy))) throw new Error('step did not start');
      let steps = 1;
      for (let k = 0; k < 60 && (await page.evaluate(() => LE.activeLevel.inst.stepping)); k++) {
        await page.evaluate(() => { if (LE.activeLevel.inst.stepping) LE.activeLevel.inst.step(); });   // the same function as the Step button
        steps++; await page.waitForTimeout(120);
      }
      if (steps < 4) throw new Error('only ' + steps + ' steps');
      await page.waitForFunction(() => !LE.activeLevel.inst.busy, null, { timeout: 10000 });
      if (await page.locator('.overlay.win').count()) throw new Error('the buggy program won');
    });

    await check('Track C: the gears lesson plays through (try-it card works), then the quick check and the gear build complete', async () => {
      await page.evaluate(() => { LE.closeOverlay(); const l = LE.app.store.getLevel2(); l.lessons = {}; LE.level2Hub.show('c'); });
      await page.waitForSelector('.l2-tab.on.t-c');
      await page.tap('.l2-start');
      await page.waitForSelector('.l2-lesson');
      let n = 0;
      while ((await page.locator('.l2-lesson').count()) && n < 8) {
        if (await page.locator('.tw-add').count()) {
          await page.tap('.tw-add');
          if (!/same way/.test(await page.textContent('.tw-lbl'))) throw new Error('try-it: 2 gears should turn the same way');
          await page.waitForTimeout(150);
          await shot(page, '06-science-lesson.png');
        }
        await page.tap('.l2-next'); await page.waitForTimeout(250); n++;
      }
      if (n !== 4) throw new Error('lesson cards ' + n);
      if (!(await page.evaluate(() => LE.app.store.getLevel2().lessons.gears))) throw new Error('lesson not saved');
      await page.waitForSelector('.lb-quiz .lb-ans');
      await page.evaluate(() => LE.activeLevel.buddy.hide());
      // answer through the real buttons
      const q = await page.evaluate(() => LE.activeLevel.level.questions.map((x) => x.right));
      for (const r of q) { await page.tap('.lb-ans[data-ans="' + r + '"]'); await page.waitForTimeout(350); }
      await page.waitForSelector('.overlay.win', { timeout: 10000 });
      if ((await page.evaluate(() => LE.app.store.getLevel2().stars.c1)) !== 3) throw new Error('quiz stars');
      await page.tap('.overlay.win .next-btn');
      await page.waitForSelector('.lb-gears .lb-canvas');
      await tipAway(page);
      await page.evaluate(() => { LE.activeLevel.buddy.hide(); });
      await page.waitForTimeout(400);
      // tap the first two gear spots: big (2 taps), small (1 tap)
      const box = async (i) => page.evaluate((i) => { const r = LE.activeLevel.inst.target('slot:' + i); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, i);
      let b0 = await box(0); await page.mouse.click(b0.x, b0.y); await page.waitForTimeout(80); b0 = await box(0); await page.mouse.click(b0.x, b0.y);
      await page.waitForTimeout(80);
      const b1 = await box(1); await page.mouse.click(b1.x, b1.y);
      await page.waitForTimeout(200);
      const slots = await page.evaluate(() => LE.activeLevel.inst.getState().slots);
      if (slots[0] !== 'B' || slots[1] !== 'S') throw new Error('slots ' + JSON.stringify(slots));
      await noOverflow(page, 'lab');
      await bigTargets(page, '.lb-bar .go-btn, .lb-chip, .lb-clear');
      await shot(page, '07-science-build.png');
      await page.tap('.lb-bar .go-btn');
      await page.waitForSelector('.overlay.win', { timeout: 20000 });
      if ((await page.evaluate(() => LE.app.store.getLevel2().stars.c2)) !== 3) throw new Error('build stars');
    });

    await check('Track C: Show me works (lever lab)', async () => {
      await page.evaluate(() => { LE.closeOverlay(); LE.logic.level2.unlockTo(LE.app.store.getLevel2(), 'c', 3); LE.app.store.getLevel2().lessons.levers = true; LE.level2Hub.openStage('c', 3, { fresh: true }); });
      await page.waitForSelector('.lb-lever');
      await tipAway(page);
      await page.evaluate(() => LE.activeLevel.showMe());
      await waitDemo(page);
      const d = await page.evaluate(() => ({ demo: LE.activeLevel.lastDemo, s: LE.app.store.getLevel2().stars.c4 || 0 }));
      if (!d.demo.solved || d.s) throw new Error(JSON.stringify(d));
    });

    await check('adaptive help: after 4 failed tries Show me is offered, after 6 an easier version (max 2 stars)', async () => {
      await page.evaluate(() => { LE.closeOverlay(); LE.app.store.getLevel2().fails = {}; LE.showMeForce = false; LE.level2Hub.openStage('a', 2, { fresh: true }); });
      await page.waitForSelector('.br-canvas');
      await tipAway(page);
      await page.evaluate(() => LE.activeLevel.inst.place([1, 2], [2, 2]));
      for (let k = 0; k < 6; k++) {
        await page.evaluate(() => LE.activeLevel.inst.go());
        await page.waitForFunction(() => !LE.activeLevel.inst.busy, null, { timeout: 30000 });
        await page.waitForTimeout(150);
        if (k === 3 && !(await page.locator('.bubble.show .showme-btn').count())) throw new Error('no Show me after 4');
      }
      if (!(await page.locator('.bubble.show .easier-btn').count())) throw new Error('no easier offer after 6');
      if ((await page.evaluate(() => LE.app.store.getLevel2().fails.a3)) !== 6) throw new Error('fails not saved');
      await page.tap('.bubble.show .easier-btn');
      await page.waitForTimeout(500);
      const lv = await page.evaluate(() => ({ v: LE.activeLevel.level.vehicle, last: LE.app.store.getLast() }));
      if (lv.v !== 'truck' || lv.last.variant !== 'easy') throw new Error(JSON.stringify(lv));
      await solveAndGo(page);
      if ((await page.evaluate(() => LE.app.store.getLevel2().stars.a3)) !== 2) throw new Error('easy should give 2 stars');
    });

    await check('resume: a half-built Level 2 stage comes back after a reload', async () => {
      await page.evaluate(() => { LE.closeOverlay(); LE.level2Hub.openStage('a', 1, { fresh: true }); });
      await page.waitForSelector('.fr-wrap');
      await tipAway(page);
      await page.evaluate(() => { const i = LE.activeLevel.inst; i.place([1, 4], [1, 3]); i.place([3, 4], [3, 3]); });
      await page.waitForTimeout(300);
      await page.goto(url + '?fast=1');
      await page.waitForSelector('.fr-wrap');
      await page.waitForTimeout(500);
      const r = await page.evaluate(() => ({ id: LE.activeLevel.level.id, beams: LE.activeLevel.inst.getBeams().length }));
      if (r.id !== 'a2' || r.beams !== 2) throw new Error(JSON.stringify(r));
    });

    await check('parent area: Level 2 tab — timers switch, unlock all, set stars, reset (confirm)', async () => {
      await page.evaluate(() => LE.app.showMenu());
      await page.evaluate(() => LE.parent.openPin());
      for (const d of '1994') await page.tap('.pin-pad button[data-pin="' + d + '"]');
      await page.waitForSelector('.parent-screen');
      await page.tap('.tab-level2');
      await page.waitForSelector('.unlock-l2');
      await page.tap('.toggle-timers');
      if (await page.evaluate(() => LE.app.store.getLevel2().timers)) throw new Error('timers still on');
      await page.tap('.unlock-l2');
      await page.waitForTimeout(200);
      const open = await page.evaluate(() => LE.level2.data.tracks.every((t) => t.stages.every((s, i) => LE.logic.level2.isStageOpen(LE.app.store.getLevel2(), t.id, t.stages, i))));
      if (!open) throw new Error('not all open');
      await page.tap('.l2-row[data-stage="a12"] button[data-stars="3"]');
      if ((await page.evaluate(() => LE.app.store.getLevel2().stars.a12)) !== 3) throw new Error('set stars');
      await page.waitForTimeout(300);
      await page.evaluate(() => { document.querySelector('.admin-body').scrollTop = 0; });
      await page.waitForTimeout(200);
      await shot(page, '08-parent-level2.png');
      await page.tap('.reset-l2');
      await page.tap('.confirm-yes');
      await page.waitForTimeout(200);
      const l = await page.evaluate(() => LE.app.store.getLevel2());
      if (Object.keys(l.stars).length || l.open.a !== -1 || l.timers !== false) throw new Error('reset ' + JSON.stringify(l));
      // other tabs still work
      await page.tap('.tab-progress'); await page.waitForSelector('.unlock-world');
      await page.tap('.tab-settings'); await page.waitForSelector('.save-pin');
    });

    await check('no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
  } finally {
    await context.close();
  }

  // Small phones: every Level 2 screen fits (no page scroll, nothing off screen) on iPhone SE and an Android phone.
  for (const dev of ['iPhone SE', 'Pixel 7']) {
    const ctx2 = await browser.newContext({ ...pw.devices[dev], serviceWorkers: 'block' });
    const p2 = await ctx2.newPage();
    const errs = [];
    p2.on('pageerror', (e) => errs.push(e.message));
    await check(dev + ': menu, hub, a stage of every view type and a lesson fit without overflow', async () => {
      await p2.goto(url + '?fast=1&menu=1');
      await p2.waitForSelector('.menu-screen');
      await p2.waitForTimeout(700);
      await noOverflow(p2, 'menu');
      await p2.evaluate(() => { const l = LE.app.store.getLevel2(); LE.logic.level2.unlockAll(l, LE.level2Hub.counts()); l.lessons = { gears: true, levers: true, ramps: true, circuits: true }; LE.level2Hub.show('a'); });
      await p2.waitForTimeout(1200);
      await noOverflow(p2, 'hub');
      for (const [t, i] of [['a', 0], ['a', 9], ['b', 11], ['b', 7], ['c', 0], ['c', 1], ['c', 3], ['c', 5], ['c', 7], ['c', 9], ['c', 10]]) {
        await p2.evaluate(([t, i]) => LE.level2Hub.openStage(t, i, { fresh: true }), [t, i]);
        await p2.waitForTimeout(600);
        await tipAway(p2);
        await p2.evaluate(() => LE.activeLevel.buddy.hide());
        await p2.waitForTimeout(250);
        await noOverflow(p2, t + (i + 1));
      }
      await p2.evaluate(() => LE.level2Hub.openLesson('levers'));
      await p2.waitForSelector('.l2-lesson');
      await p2.tap('.l2-next');
      await p2.waitForTimeout(300);
      await noOverflow(p2, 'lesson');
      await bigTargets(p2, '.tw-spot, .l2-next, .l2-say');
      if (dev === 'iPhone SE') await p2.screenshot({ path: path.join(SHOTS, 'se-lesson.png') });
      if (errs.length) throw new Error(errs[0]);
    });
    await ctx2.close();
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n${failures} v4 check(s) failed` : '\nAll v4 checks passed');
  process.exitCode = failures ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exit(1); });
