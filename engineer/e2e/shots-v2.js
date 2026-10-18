/* v2 screenshots (iPhone 13) → /workspace/little-engineer-shots/v2/ :
 * menu, construction map / levels / tutorial / win, and one new level from each older world. */
'use strict';
const fs = require('fs');
const path = require('path');
const { start } = require('./server.js');
const pw = require('playwright');

const OUT = path.join(process.env.SHOTS_DIR || '/workspace/little-engineer-shots', 'v2');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await pw.chromium.launch();
  const { server, url } = await start(0);
  const errors = [];
  async function newPage(fast) {
    const page = await (await browser.newContext({ ...pw.devices['iPhone 13'] })).newPage();
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(url + '?menu=1&nosw=1' + (fast ? '&fast=1' : ''));
    await page.waitForSelector('.menu-screen');
    return page;
  }
  const shot = (page, name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log('  📸 ' + name));
  async function open(page, w, i) {
    await page.evaluate(([id, idx]) => {
      const s = LE.app.store;
      for (let k = 0; k < idx; k++) if (!s.getStars(id, k)) s.setStars(id, k, 3);
      const lv = LE.world(id).levels[idx];
      if (lv.tip) s.markTip(id + ':' + lv.tip);
      s.clearInProgress(id, idx);
      LE.app.openLevel(id, idx, { fresh: true });
    }, [w, i]);
    await page.waitForSelector('.level-screen .play-host');
    await page.waitForTimeout(900);
  }
  async function letMeTry(page) {
    const b = page.locator('.letmetry-btn:visible');
    if (await b.count()) await b.first().click();
    await page.waitForTimeout(500);
  }
  /** Run Show me (fast page) and stop just before the win / Go. */
  async function demo(page) {
    await page.evaluate(() => LE.activeLevel.showMe());
    await page.waitForTimeout(200);
    await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 60000 });
    await page.waitForTimeout(500);
  }
  async function hideWin(page) {
    await page.waitForSelector('.overlay.win', { timeout: 8000 }).catch(() => {});
    await page.addStyleTag({ content: '.overlay.win { display: none !important; } #hide-win {}' });
    await page.waitForTimeout(600);
  }
  async function showWin(page) {
    await page.evaluate(() => [...document.querySelectorAll('style')].filter((x) => x.textContent.includes('#hide-win')).forEach((x) => x.remove()));
  }

  try {
    let page = await newPage(false);
    await page.waitForTimeout(1300);
    await shot(page, 'menu.png');
    await page.evaluate(() => { const s = LE.app.store; [0, 1, 2, 3, 4, 5].forEach((i) => s.setStars('construction', i, 3)); s.setStars('construction', 6, 2); });
    await page.evaluate(() => LE.app.showMap('construction'));
    await page.waitForTimeout(900);
    await shot(page, 'construction-map.png');
    await page.context().close();

    // Construction level 1 (with the goal bubble) and level 3 tutorial (hand pointing)
    page = await newPage(false);
    await page.evaluate(() => { LE.app.store.reset(); LE.app.openLevel('construction', 0); });
    await page.waitForTimeout(500);
    const tip = page.locator('.overlay.tip .btn');
    if (await tip.count()) { await shot(page, 'construction-01-tip.png'); await tip.first().click(); }
    await page.waitForTimeout(1200);
    await shot(page, 'construction-01.png');
    await page.evaluate(() => { const s = LE.app.store; s.setStars('construction', 0, 3); s.setStars('construction', 1, 3); LE.app.openLevel('construction', 2); });
    await page.waitForTimeout(600);
    if (await tip.count()) { await tip.first().click(); }
    await page.waitForTimeout(800);
    await page.locator('.bubble.show .btn').first().click();
    await page.waitForTimeout(2600);
    await shot(page, 'construction-03-tutorial.png');
    await page.context().close();

    page = await newPage(true);
    const cn = await page.evaluate(() => LE.world('construction').levels.map((l) => l.stages.map((s) => s.type).join('+')));
    const find = (pred, from) => cn.findIndex((t, i) => i >= (from || 0) && pred(t));
    const dozer = find((t) => t === 'doze', 9);
    const crane = find((t) => t === 'crane', 12) >= 0 ? find((t) => t === 'crane', 12) : find((t) => t === 'crane');
    const house = find((t) => t === 'build', 10) >= 0 ? find((t) => t === 'build', 10) : find((t) => t === 'build');
    const last = cn.length - 1;
    console.log('construction picks', { dozer, crane, house, last, types: cn });
    for (const [i, name] of [[dozer, 'construction-bulldozer.png'], [crane, 'construction-crane.png'], [house, 'construction-house.png']]) {
      await open(page, 'construction', i);
      await letMeTry(page);
      await shot(page, name.replace('.png', '-start.png'));
      await demo(page);
      await hideWin(page);
      await shot(page, name);
      await showWin(page);
      await page.evaluate(() => LE.closeOverlay());
    }
    await open(page, 'construction', last);
    await letMeTry(page);
    await shot(page, 'construction-final.png');
    await demo(page);
    await page.waitForSelector('.overlay.win', { timeout: 30000 });
    await page.waitForTimeout(1200);
    await shot(page, 'construction-final-win.png');
    await hideWin(page);
    await shot(page, 'construction-final-built.png');
    await page.evaluate(() => LE.closeOverlay());

    // one new level from each older world (built by Show me, just before Go)
    for (const [w, i] of [['bridges', 26], ['machines', 27], ['circuits', 26], ['robot', 27]]) {
      await open(page, w, i);
      await letMeTry(page);
      await shot(page, `${w}-new-start.png`);
      await demo(page);
      await hideWin(page);
      await shot(page, `${w}-new.png`);
      await showWin(page);
      await page.evaluate(() => LE.closeOverlay());
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (errors.length) { console.log('console errors:\n  ' + errors.join('\n  ')); process.exit(1); }
  console.log('✔ screenshots in ' + OUT);
})();
