/* v3 e2e checks (part of npm run e2e): parent mode, weekly projects with a fake clock, Read-then-Go,
 * Ask Helper (offline / failure fallback). DEVICE="iPhone SE" for the small phone.
 * Screenshots -> /workspace/little-engineer-v3-shots/ (SHOTS_DIR to override). */
'use strict';
const fs = require('fs');
const path = require('path');
const { start } = require('./server.js');
const pw = require('playwright');

const DEVICE = process.env.DEVICE || 'iPhone 13';
const SMALL = DEVICE === 'iPhone SE';
const SHOTS = process.env.SHOTS_DIR || '/workspace/little-engineer-v3-shots';
const ONLY = process.env.E2E_ONLY || '';
fs.mkdirSync(SHOTS, { recursive: true });

let failures = 0;
function ok(name) { console.log('  ✔ ' + name); }
function bad(name, err) { failures++; console.log('  ✘ ' + name + ': ' + err); }
async function check(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, (e && e.message || String(e)).split('\n')[0]); }
}
const WEEK0 = '2026-10-21T10:00:00Z';   // Wednesday of week 0
const WEEK1 = '2026-10-28T10:00:00Z';   // +7 days

/** Fail if anything sticks out of the viewport horizontally (or a fixed screen scrolls). */
async function noOverflow(page, what) {
  const r = await page.evaluate(() => {
    const W = window.innerWidth, H = window.innerHeight, out = [];
    document.querySelectorAll('.screen:not(.leave) *, .overlay.show *').forEach((el) => {
      if (el.closest('.admin-body, .map-scroll, .wk-scroll, .scroll-y, #hand, .menu-sky')) return;
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) return;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') return;
      if (b.right > W + 1 || b.left < -1 || b.bottom > H + 1) out.push((el.className && el.className.baseVal === undefined ? el.className : el.tagName) + ' ' + Math.round(b.left) + ',' + Math.round(b.top) + ' ' + Math.round(b.width) + 'x' + Math.round(b.height));
    });
    return out.slice(0, 5);
  });
  if (r.length) throw new Error((what || '') + ' overflow: ' + r.join(' | '));
}

async function newPage(browser, opts) {
  opts = opts || {};
  const context = await browser.newContext({ ...pw.devices[DEVICE], serviceWorkers: 'block' });
  const page = await context.newPage();
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_INTERNET_DISCONNECTED|net::|Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  if (opts.save) await page.addInitScript((s) => { if (!localStorage.getItem('littleEngineerSave')) localStorage.setItem('littleEngineerSave', s); }, JSON.stringify(opts.save));
  return { context, page };
}

async function main() {
  const browser = await pw.chromium.launch();
  const { server, url } = await start(0);
  const shot = (page, f) => page.screenshot({ path: path.join(SHOTS, (SMALL ? 'se-' : /Galaxy|Pixel/.test(DEVICE) ? 'android-' : '') + f) });
  console.log(`\n▶ v3 checks (chromium, ${DEVICE})`);
  try {
    /* ---------- parent mode ---------- */
    if (!ONLY || ONLY === 'parent') {
      const { context, page } = await newPage(browser);
      await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK0);
      await page.waitForSelector('.menu-screen');
      await page.waitForTimeout(600);

      await check('parent: short tap on the gear opens the kid settings (not the PIN)', async () => {
        await page.tap('.settings-btn');
        await page.waitForSelector('.overlay.settings');
        if (await page.locator('.pin-overlay').count()) throw new Error('PIN pad opened on a short tap');
        await page.evaluate(() => LE.closeOverlay());
        await page.waitForTimeout(300);
      });

      const cdp = await context.newCDPSession(page);
      const gearXY = async () => { const b = await page.locator('.settings-btn').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
      const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });

      await check('parent: Settings has a visible 🔒 Parents button + version label; it opens the PIN, 1994 opens parent mode', async () => {
        await page.waitForTimeout(400);
        await page.tap('.settings-btn');
        await page.waitForSelector('.overlay.settings.show .parents-btn');
        const v = await page.textContent('.overlay.settings.show .app-version');
        if (!/^Version [34]\.\d+ \(\d{1,2} [A-Z][a-z]{2} \d{4}\)$/.test(v)) throw new Error('version label: ' + v);
        const sv = await page.evaluate(() => self.GAME_VERSION.version);
        if (v.indexOf('Version ' + sv + ' ') !== 0) throw new Error('label ' + v + ' vs js/version.js ' + sv);
        await page.waitForTimeout(700);   // overlay pop-in animation
        const box = await page.locator('.overlay.settings.show .parents-btn').boundingBox();
        const vp = page.viewportSize();
        if (!box || box.y < 0 || box.y + box.height > vp.height || box.height < 44) throw new Error('Parents button not fully visible: ' + JSON.stringify(box));
        await noOverflow(page, 'settings');
        await shot(page, 'parents-button.png');
        await page.tap('.overlay.settings.show .parents-btn');
        await page.waitForSelector('.pin-overlay.show .pin-pad');
        if (await page.locator('.overlay.settings.show').count()) throw new Error('settings still open behind the PIN');
        for (const k of '1994') await page.tap(`[data-pin="${k}"]`);
        await page.waitForSelector('.parent-screen .admin-tabs');
        await page.tap('.admin-close');
        await page.waitForSelector('.menu-screen');
        await page.waitForTimeout(400);
      });

      // whatever happened above, start the next checks from a clean menu
      await page.evaluate(() => { LE.closeOverlay && LE.closeOverlay(); if (!document.querySelector('.menu-screen')) LE.app.showMenu(); });
      await page.waitForTimeout(500);
      await check('parent: touch-hold moving > 40 px cancels (no PIN, no settings)', async () => {
        const g = await gearXY();
        await touch('touchStart', [g]);
        await page.waitForTimeout(800);
        if (!(await page.locator('.gear.holding').count())) throw new Error('no hold ring');
        await touch('touchMove', [{ x: g.x - 20, y: g.y + 20 }]);           // ~28 px: still holding
        await page.waitForTimeout(200);
        if (!(await page.locator('.gear.holding').count())) throw new Error('small wobble cancelled the hold');
        await touch('touchMove', [{ x: g.x - 50, y: g.y + 30 }]);           // > 40 px: cancelled
        await page.waitForTimeout(2600);
        await touch('touchEnd', []);
        if (await page.locator('.pin-overlay').count()) throw new Error('PIN opened after moving away');
        if (await page.locator('.gear.holding').count()) throw new Error('ring still filling');
        await page.evaluate(() => LE.closeOverlay && LE.closeOverlay());
        await page.waitForTimeout(300);
      });

      await check('parent: touch-hold the gear 3 s (touchstart/touchend) → ring fills → PIN pad, no kid settings', async () => {
        const g = await gearXY();
        await touch('touchStart', [g]);
        await page.waitForTimeout(1000);
        if (!(await page.locator('.gear.holding').count())) throw new Error('no hold ring');
        if (await page.locator('.pin-overlay').count()) throw new Error('PIN opened too early');
        await page.waitForTimeout(2300);
        await page.waitForSelector('.pin-overlay.show .pin-pad');
        await touch('touchEnd', []);
        await page.waitForTimeout(400);
        if (await page.locator('.overlay.settings').count()) throw new Error('kid settings opened after the hold');
        await noOverflow(page, 'PIN pad');
        await shot(page, 'parent-pin.png');
        await page.evaluate(() => LE.closeOverlay());
        await page.waitForTimeout(400);
      });

      await check('parent: mouse hold still works on a computer', async () => {
        const g = await gearXY();
        await page.mouse.move(g.x, g.y); await page.mouse.down();
        await page.waitForTimeout(3300);
        await page.waitForSelector('.pin-overlay.show .pin-pad');
        await page.mouse.up();
        await page.evaluate(() => LE.closeOverlay());
        await page.waitForTimeout(400);
      });

      await check('parent: backup — 5 taps on the title within 3 s opens the PIN (4 taps, or slow taps, do not)', async () => {
        for (let k = 0; k < 4; k++) { await page.tap('.menu-title'); await page.waitForTimeout(120); }
        await page.waitForTimeout(400);
        if (await page.locator('.pin-overlay').count()) throw new Error('opened after 4 taps');
        await page.waitForTimeout(3000);                     // those 4 expire
        await page.tap('.menu-title');
        await page.waitForTimeout(300);
        if (await page.locator('.pin-overlay').count()) throw new Error('old taps counted');
        for (let k = 0; k < 4; k++) { await page.tap('.menu-title'); await page.waitForTimeout(150); }
        await page.waitForSelector('.pin-overlay.show .pin-pad', { timeout: 3000 });
        if (await page.locator('.overlay.settings').count()) throw new Error('kid settings opened');
      });

      await check('parent: wrong PIN is rejected, 1994 opens the panel', async () => {
        for (const k of '9999') await page.tap(`[data-pin="${k}"]`);
        await page.waitForTimeout(150);
        const msg = await page.textContent('.pin-msg');
        if (!/Wrong PIN/.test(msg)) throw new Error('no wrong-PIN message');
        await page.waitForTimeout(300);
        for (const k of '1994') await page.tap(`[data-pin="${k}"]`);
        await page.waitForSelector('.parent-screen .admin-tabs');
      });

      await check('parent: Progress tab sets stars and unlocks a level', async () => {
        await page.waitForSelector('.lv-row');
        await page.tap('.lv-row[data-level="4"] .unlock-level');
        await page.waitForTimeout(150);
        const open = await page.evaluate(() => LE.app.store.isUnlocked('bridges', 4));
        if (!open) throw new Error('level 5 not unlocked');
        await page.tap('.lv-row[data-level="0"] [data-stars="2"]');
        await page.waitForTimeout(150);
        const st = await page.evaluate(() => LE.app.store.getStars('bridges', 0));
        if (st !== 2) throw new Error('stars ' + st);
        await noOverflow(page, 'panel');
        await shot(page, 'parent-panel.png');
      });

      await check('parent: Settings tab — change PIN, helper toggle, transfer code', async () => {
        await page.tap('.tab-settings');
        await page.fill('.pin-new', '4321');
        await page.fill('.pin-again', '4321');
        await page.tap('.save-pin');
        if (!(await page.evaluate(() => LE.app.store.checkPin('4321')))) throw new Error('PIN not changed');
        await page.tap('.toggle-helper');
        if (await page.evaluate(() => LE.app.store.getHelper())) throw new Error('helper still on');
        await page.tap('.toggle-helper');
        const code = await page.inputValue('.export-code');
        if (!/^LE1-/.test(code)) throw new Error('no transfer code');
        await page.evaluate(() => LE.app.store.setPin('1994'));
        await noOverflow(page, 'settings tab');
        await shot(page, 'parent-settings.png');
      });

      await check('parent: Forgot PIN → math gate → new PIN', async () => {
        await page.tap('.admin-close');
        await page.waitForSelector('.menu-screen');
        await page.evaluate(() => LE.parent.openPin());
        await page.waitForSelector('.forgot-btn');
        await page.tap('.forgot-btn');
        await page.waitForSelector('.gate-q');
        await page.fill('.gate-input', '1');
        await page.tap('.gate-ok');
        if (!/Not quite/.test(await page.textContent('.pin-msg'))) throw new Error('wrong answer accepted');
        const q = await page.textContent('.gate-q');
        const m = /(\d+) × (\d+)/.exec(q);
        await page.fill('.gate-input', String(+m[1] * +m[2]));
        await page.tap('.gate-ok');
        await page.waitForSelector('.parent-screen[data-tab="settings"] .admin-notice');
        await shot(page, 'parent-gate-ok.png');
        await page.tap('.admin-close');
      });

      await check('parent: backup — 5 quick taps on a world map star counter opens the PIN', async () => {
        await page.evaluate(() => { LE.closeOverlay && LE.closeOverlay(); LE.app.showMap('bridges'); });
        await page.waitForSelector('.map-screen .topbar-stars');
        await page.waitForTimeout(500);
        for (let k = 0; k < 5; k++) { await page.tap('.topbar-stars'); await page.waitForTimeout(120); }
        await page.waitForSelector('.pin-overlay.show .pin-pad', { timeout: 3000 });
        await page.evaluate(() => LE.closeOverlay());
      });
      await check('parent: no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      await context.close();
    }

    /* ---------- weekly projects with a fake clock ---------- */
    if (!ONLY || ONLY === 'weekly') {
      const { context, page } = await newPage(browser);
      await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK0);
      await page.waitForSelector('.menu-screen');
      await page.waitForTimeout(700);

      await check("weekly: menu shows This Week's Project (week 1: Dream House, every project open)", async () => {
        await page.waitForSelector('.weekly-card');
        const t = await page.textContent('.weekly-card');
        if (!/This Week's Project/.test(t) || !/Dream House/.test(t)) throw new Error('card text: ' + t);
        if (!/Every project is open!/.test(t)) throw new Error('card: ' + t);
        await noOverflow(page, 'menu');
        await shot(page, 'menu-with-weekly.png');
      });

      // the hub swaps screens with a short transition: wait until the only weekly screen is project k
      const hubIs = (k, what) => page.waitForFunction((k) => {
        const sc = document.querySelectorAll('.weekly-screen');
        return !document.querySelector('.overlay.week-grid') && sc.length === 1 && sc[0].querySelector('.wk-node') &&
          sc[0].querySelector('.topbar-title').textContent.indexOf(LE.weeklyProjects[k].title) >= 0;
      }, k, { timeout: 5000 }).catch(() => { throw new Error(what + ': hub did not show ' + k); });

      await check('weekly: fake clock — all 52 weeks open (52 projects)', async () => {
        const r = await page.evaluate(() => ({ n: LE.weeklyProjects.length,
          open: LE.weeklyProjects.map((p, i) => LE.logic.weekly.isProjectUnlocked(LE.app.store.data, i, LE.now())) }));
        if (r.n !== 52) throw new Error('projects ' + r.n);
        if (r.open.some((o) => !o)) throw new Error('open: ' + r.open.map((o) => (o ? 1 : 0)).join(''));
        await page.tap('.weekly-card');
        await page.waitForSelector('.weekly-screen .wk-node');
        if (!(await page.locator('.wk-chip[data-week="29"]:not(.locked)').count())) throw new Error('week 30 chip locked');
        if (!(await page.locator('.wk-chip[data-week="51"]:not(.locked)').count())) throw new Error('week 52 chip locked');
        if (await page.locator('.wk-chip.locked').count()) throw new Error('a week chip is locked');
        await page.waitForTimeout(500);
        await noOverflow(page, 'hub');
        await shot(page, 'weekly-hub.png');
        await page.evaluate(() => { const c = document.querySelector('.wk-chip[data-week="30"]'); if (c) c.scrollIntoView({ inline: 'center' }); });
        await page.locator('.wk-chip[data-week="30"]').tap();
        await hubIs(30, 'week 31 hub (open now)');
        await page.evaluate(() => LE.app.showWeeklyHub('dream-house'));
        await hubIs(0, 'back to Dream House');
        await page.evaluate(() => { const c = document.querySelector('.wk-chips'); if (c) c.scrollLeft = 0; });
      });

      await check('weekly: 📅 All weeks grid shows 52 of 52 open; a cell opens its week', async () => {
        await page.tap('.wk-all');
        await page.waitForSelector('.overlay.week-grid .wg-cell');
        const g = await page.evaluate(() => ({ cells: document.querySelectorAll('.wg-cell').length,
          open: document.querySelectorAll('.wg-cell:not(.locked)').length, note: document.querySelector('.wg-note').textContent }));
        if (g.cells !== 52 || g.open !== 52 || !/52 of 52/.test(g.note)) throw new Error(JSON.stringify(g));
        await page.waitForTimeout(500);
        await noOverflow(page, 'week grid');
        await shot(page, 'weekly-all-weeks.png');
        await page.tap('.wg-cell[data-week="35"]');
        await hubIs(35, 'week 36 hub');
        await page.evaluate(() => LE.app.showWeeklyHub('dream-house'));
        await hubIs(0, 'back to Dream House');
      });

      await check('weekly: step 2 is locked until step 1 is done; step 1 plays and saves stars', async () => {
        await page.tap('.wk-node[data-step="1"]');
        await page.waitForTimeout(300);
        if (await page.locator('.level-screen').count()) throw new Error('locked step opened');
        await page.tap('.wk-start');
        await page.waitForSelector('.level-screen.weekly-level .play-host');
        await page.waitForTimeout(800);
        await noOverflow(page, 'weekly step');
        await shot(page, 'weekly-step.png');
        await page.evaluate(() => LE.activeLevel.solve());
        await page.waitForSelector('.overlay.win', { timeout: 60000 });
        await page.waitForTimeout(1200);
        const st = await page.evaluate(() => LE.app.store.getStepStars('dream-house', 'plot'));
        if (st !== 3) throw new Error('stars ' + st);
        if (!/Next step/.test(await page.textContent('.next-btn'))) throw new Error('no Next step button');
        await shot(page, 'weekly-win.png');
      });

      await check('weekly: reopening the app resumes the project step', async () => {
        await page.tap('.next-btn');
        await page.waitForSelector('.level-screen.weekly-level');
        await page.goto(url + '?fast=1&nosw=1&now=' + WEEK0);
        await page.waitForSelector('.level-screen.weekly-level .play-host');
        const name = await page.textContent('.lvl-title');
        if (!/Rock Away/.test(name)) throw new Error('resumed: ' + name);
      });

      await check('weekly: +7 days — everything still open; This Week stays on the first unfinished project', async () => {
        await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK1);
        await page.waitForSelector('.weekly-card');
        const t = await page.textContent('.weekly-card');
        if (!/Dream House/.test(t)) throw new Error('card: ' + t);
        const r = await page.evaluate(() => [29, 30, 51].map((i) => LE.logic.weekly.isProjectUnlocked(LE.app.store.data, i, LE.now())));
        if (!r[0] || !r[1] || !r[2]) throw new Error(JSON.stringify(r));
      });

      await check('weekly: parent PIN 1994 → Weekly tab says all 52 open, shows the version; "Make this week" jumps to week 41', async () => {
        await page.evaluate(() => LE.app.showMenu());
        await page.waitForSelector('.settings-btn');
        for (let k = 0; k < 5; k++) await page.tap('.menu-title');
        await page.waitForSelector('.pin-overlay.show .pin-pad', { timeout: 6000 });
        for (const k of '1994') await page.tap(`[data-pin="${k}"]`);
        await page.waitForSelector('.parent-screen');
        await page.tap('.tab-weekly');
        const info = await page.textContent('.parent-screen .admin-body');
        if (!/All 52 weeks are open/.test(info) || /week 53/.test(info)) throw new Error('info text: ' + info.slice(0, 160));
        const hv = await page.textContent('.parent-screen .admin-version');
        if (!/Version [34]\.\d+ \(/.test(hv)) throw new Error('parent version: ' + hv);
        const card = page.locator('.wk-card[data-week="40"]');
        if (await card.locator('.unlock-week').count()) throw new Error('week 41 still offers Unlock now');
        await card.locator('.jump-week').tap();
        await page.waitForTimeout(250);
        const cur = await page.evaluate(() => LE.logic.weekly.currentWeek(LE.app.store.data, LE.now(), LE.weeklyProjects.length, LE.weeklyProjects));
        if (cur !== 40) throw new Error('this week ' + cur);
        await card.evaluate((el) => el.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(300);
        await shot(page, 'parent-weekly-unlock.png');
        await page.tap('.admin-close');
        await page.tap('.weekly-card');
        await hubIs(40, 'week 41 is this week');
        await page.tap('.wk-all');
        await page.waitForSelector('.overlay.week-grid .wg-cell');
        const open = await page.evaluate(() => document.querySelectorAll('.wg-cell:not(.locked)').length);
        if (open !== 52) throw new Error('grid open ' + open);
        await page.waitForTimeout(400);
        await shot(page, 'weekly-all-weeks-parent.png');
        await page.tap('.wg-cell[data-week="40"]');
        await hubIs(40, 'week 41 hub');
        await page.evaluate(() => LE.app.store.setCurrentWeekForce(null));
      });

      await check('weekly: saved progress survives a reload (Dream House stars kept)', async () => {
        await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK1);
        await page.waitForSelector('.weekly-card');
        const st = await page.evaluate(() => LE.app.store.getStepStars('dream-house', 'plot'));
        if (st !== 3) throw new Error('stars ' + st);
      });

      await check('weekly: no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      await context.close();
    }

    /* ---------- Read, then Go ---------- */
    if (!ONLY || ONLY === 'readgo') {
      const { context, page } = await newPage(browser);
      await page.goto(url + '?fast=1&readgo=1&menu=1&nosw=1&now=' + WEEK0);
      await page.waitForSelector('.menu-screen');
      await page.evaluate(() => { LE.app.store.markTip('robot:turnLeft'); LE.app.store.unlockTo('robot', 4); LE.app.openLevel('robot', 4); });

      await check('read-then-go: after the intro the board waits behind a big Go (no auto-hide)', async () => {
        await page.waitForSelector('.go-gate .gate-go');
        await page.waitForTimeout(2500);
        if (!(await page.locator('.go-gate').count())) throw new Error('gate went away by itself');
        const blocked = await page.evaluate(() => { const r = document.querySelector('.play-host').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height * 0.9); return !!e.closest('.go-gate'); });
        if (!blocked) throw new Error('board is tappable behind the gate');
        if (!(await page.locator('.bubble.show .showme-btn').count())) throw new Error('Show me not offered with the intro');
        await noOverflow(page, 'gate');
        await shot(page, 'read-then-go.png');
      });

      await check('read-then-go: 🔊 replays the intro lines', async () => {
        await page.evaluate(() => { window.__said = []; const o = LE.speakForce; LE.speakForce = function (t) { window.__said.push(t); return o.apply(this, arguments); }; });
        await page.tap('.gate-replay');
        const said = await page.evaluate(() => window.__said);
        const goal = await page.evaluate(() => LE.activeLevel.level.goal);
        if (!said.length || JSON.stringify(said[0]).indexOf(goal) < 0) throw new Error('replayed: ' + JSON.stringify(said));
      });

      await check('read-then-go: tapping Go makes the level playable', async () => {
        await page.tap('.gate-go');
        await page.waitForTimeout(300);
        if (await page.locator('.go-gate').count()) throw new Error('gate still there');
        await page.tap('.tray-blk[data-type="F"]', { timeout: 5000 });
        await page.waitForTimeout(300);
        const n = await page.evaluate(() => LE.activeLevel.inst.getProgram().length);
        if (n !== 1) throw new Error('block not added: ' + n);
      });

      await check('read-then-go: no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      await context.close();
    }

    /* ---------- Ask Helper (no real network: offline / failing SDK / denied mic / stubbed SDK) ---------- */
    if (!ONLY || ONLY === 'helper') {
      const openLevel = async (page) => {
        await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK0);
        await page.waitForSelector('.menu-screen');
        await page.evaluate(() => { LE.app.store.data.seenTips = new Proxy({}, { get: () => true }); LE.app.store.unlockTo('machines', 9); LE.app.openLevel('machines', 9); });
        await page.waitForSelector('.level-screen .ask-helper');
        await page.waitForTimeout(400);
      };
      const expectHint = async (page, toastRe) => {
        await page.waitForSelector('.kid-toast', { timeout: 8000 });
        const t = await page.textContent('.kid-toast');
        if (!toastRe.test(t)) throw new Error('toast: ' + t);
        const bubble = await page.textContent('.bubble-text');
        const hint = await page.evaluate(() => LE.activeLevel.level.hint);
        if (bubble.indexOf(hint) < 0) throw new Error('hint not shown: ' + bubble);
        if (await page.locator('.helper-call.show').count()) throw new Error('helper panel still open');
      };
      {
        const { context, page } = await newPage(browser);
        await check('ask helper: 🎤 button on the level screen + in the buddy bubble', async () => {
          await openLevel(page);
          await page.tap('.buddy-char');
          await page.waitForSelector('.bubble.show .askhelper-btn');
          await noOverflow(page, 'level with helper');
          await shot(page, 'ask-helper-btn.png');
        });
        await check('ask helper: offline → friendly toast + the level hint (no crash)', async () => {
          await context.setOffline(true);
          await page.tap('.ask-helper');
          await expectHint(page, /hint/);
          await context.setOffline(false);
          await shot(page, 'ask-helper-offline.png');
        });
        await check('ask helper: SDK fails to load → hint', async () => {
          await page.route('**/js/vendor/elevenlabs-client.js', (r) => r.abort());
          await page.waitForTimeout(1200);
          await page.tap('.ask-helper');
          await expectHint(page, /hint/);
          await page.unroute('**/js/vendor/elevenlabs-client.js');
        });
        await check('ask helper: parent switch hides the button', async () => {
          await page.evaluate(() => { LE.app.store.setHelper(false); LE.app.openLevel('machines', 9); });
          await page.waitForSelector('.level-screen .play-host');
          await page.waitForTimeout(300);
          if (await page.locator('.ask-helper').count()) throw new Error('button still shown');
          await page.evaluate(() => LE.app.store.setHelper(true));
        });
        await check('ask helper: no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
        await context.close();
      }
      // A browser with a fake microphone: real getUserMedia, stubbed SDK.
      const micBrowser = await pw.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
      try {
        const context = await micBrowser.newContext({ ...pw.devices[DEVICE], serviceWorkers: 'block', permissions: ['microphone'] });
        const page = await context.newPage();
        page.errors = [];
        page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
        await page.route('**/js/vendor/elevenlabs-client.js', (r) => r.fulfill({ contentType: 'application/javascript', body: `
          window.__helperCalls = [];
          window.ElevenLabsClient = { Conversation: { startSession: async (o) => {
            window.__helperCalls.push({ agentId: o.agentId, connectionType: o.connectionType, vars: o.dynamicVariables, lib: o.libsampleratePath });
            if (window.__helperMode === 'drop') { setTimeout(() => o.onConnect({}), 50); setTimeout(() => o.onDisconnect({ reason: 'agent' }), 300); return { endSession: async () => {} }; }
            setTimeout(() => o.onConnect({ conversationId: 'stub' }), 50);
            setTimeout(() => o.onModeChange({ mode: 'speaking' }), 400);
            window.__endHelper = () => o.onDisconnect({ reason: 'agent' });
            return { endSession: async () => { window.__ended = (window.__ended || 0) + 1; o.onDisconnect({ reason: 'user' }); } };
          } } };` }));
        await check('ask helper: session with the agent id + level variables, Listening → Talking, End', async () => {
          await openLevel(page);
          await page.tap('.ask-helper');
          await page.waitForSelector('.helper-call.show .helper-face.listening', { timeout: 8000 });
          await page.waitForSelector('.helper-face.speaking', { timeout: 8000 });
          if (!/talking/.test(await page.textContent('.helper-status'))) throw new Error('no talking state');
          await page.waitForTimeout(700);
          await noOverflow(page, 'helper panel');
          await shot(page, 'ask-helper-talking.png');
          const call = await page.evaluate(() => window.__helperCalls[0]);
          if (call.agentId !== 'agent_6201m5ax0meveq1t431c3wmgamsr' || call.connectionType !== 'webrtc') throw new Error(JSON.stringify(call));
          if (call.vars.world !== 'Machines' || call.vars.level_name !== 'Seesaw' || !call.vars.goal || !call.vars.hint || !call.vars.step) throw new Error(JSON.stringify(call.vars));
          if (!/^js\/vendor\//.test(call.lib)) throw new Error('libsamplerate not local: ' + call.lib);
          await page.tap('.helper-end');
          await page.waitForTimeout(400);
          if (await page.locator('.helper-call.show').count()) throw new Error('panel still open');
          if (!(await page.evaluate(() => window.__ended))) throw new Error('session not ended');
        });
        await check('ask helper: Robot Coder sends hint_only=true; weekly step sends the project step', async () => {
          await page.evaluate(() => { LE.app.openLevel('robot', 0, { fresh: true }); });
          await page.waitForSelector('.level-screen .ask-helper');
          await page.evaluate(() => LE.activeLevel.askHelper());
          await page.waitForSelector('.helper-face.speaking', { timeout: 8000 });
          await page.tap('.helper-end');
          await page.evaluate(() => LE.app.openWeeklyStep('dream-house', 0, { fresh: true }));
          await page.waitForSelector('.level-screen.weekly-level .ask-helper');
          await page.evaluate(() => LE.activeLevel.askHelper());
          await page.waitForSelector('.helper-face.speaking', { timeout: 8000 });
          await page.tap('.helper-end');
          const calls = await page.evaluate(() => window.__helperCalls.slice(1).map((c) => c.vars));
          if (calls[0].hint_only !== 'true') throw new Error('robot: ' + JSON.stringify(calls[0]));
          if (calls[1].hint_only || !/Dream House/.test(calls[1].step) || calls[1].world !== 'Construction') throw new Error('weekly: ' + JSON.stringify(calls[1]));
        });
        await check('ask helper: agent hangs up at once (e.g. out of credits) → hint', async () => {
          await page.evaluate(() => { window.__helperMode = 'drop'; LE.app.openLevel('machines', 9, { fresh: true }); });
          await page.waitForSelector('.level-screen .ask-helper');
          await page.waitForTimeout(300);
          await page.tap('.ask-helper');
          await expectHint(page, /resting/);
        });
        await context.close();
        // Microphone refused.
        const denied = await micBrowser.newContext({ ...pw.devices[DEVICE], serviceWorkers: 'block', permissions: [] });
        const p2 = await denied.newPage();
        await p2.addInitScript(() => { navigator.mediaDevices.getUserMedia = () => Promise.reject(Object.assign(new Error('Permission denied'), { name: 'NotAllowedError' })); });
        await check('ask helper: microphone denied → hint', async () => {
          await openLevel(p2);
          await p2.tap('.ask-helper');
          await expectHint(p2, /microphone/);
        });
        await denied.close();
        await check('ask helper (mic browser): no page errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      } finally { await micBrowser.close(); }
    }

    /* ---------- Ask Helper shows it on the board: mocked agent calls the client tools; exact restore, no stars ---------- */
    if (!ONLY || ONLY === 'aidemo') {
      const micBrowser = await pw.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
      try {
        const context = await micBrowser.newContext({ ...pw.devices[DEVICE], serviceWorkers: 'block', permissions: ['microphone'] });
        const page = await context.newPage();
        page.errors = [];
        page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
        page.on('console', (m) => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) page.errors.push(m.text()); if (/restore differs/.test(m.text())) page.errors.push(m.text()); });
        await page.route('**/js/vendor/elevenlabs-client.js', (r) => r.fulfill({ contentType: 'application/javascript', body: `
          window.__calls = []; window.__ctx = [];
          window.ElevenLabsClient = { Conversation: { startSession: async (o) => {
            window.__o = o; window.__calls.push({ vars: o.dynamicVariables, tools: Object.keys(o.clientTools || {}) });
            setTimeout(() => o.onConnect({ conversationId: 'stub' }), 50);
            setTimeout(() => o.onModeChange({ mode: 'speaking' }), 300);
            window.__endHelper = () => o.onDisconnect({ reason: 'agent' });
            return { endSession: async () => { o.onDisconnect({ reason: 'user' }); }, sendContextualUpdate: (t) => window.__ctx.push(t) };
          } } };` }));
        await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK0);
        await page.waitForSelector('.menu-screen');
        await page.evaluate(() => { LE.app.store.data.seenTips = new Proxy({}, { get: () => true }); });
        const CASES = [
          { name: 'Bridges', w: 'bridges', i: 2, prep: 1, end: 'tap' },
          { name: 'Machines', w: 'machines', i: 17, prep: 1, end: 'tap', shots: true },
          { name: 'Circuits', w: 'circuits', i: 3, prep: 2, end: 'agent' },
          { name: 'Robot Coder (a wrong block to fix first)', w: 'robot', i: 7, prep: 1, wrong: true, end: 'hidden' },
          { name: 'Construction', w: 'construction', i: 5, prep: 1, end: 'tap' },
          { name: 'weekly step (Bridge & Car → machines)', weekly: ['bridge-car', 3], prep: 0, end: 'tap' },
          { name: 'weekly step (Light Town → circuits)', weekly: ['light-town', 1], prep: 1, end: 'agent' }
        ];
        for (const c of CASES) {
          await check('helper demo: ' + c.name + ' — tools point/arrow/highlight/step/all, board shielded, exact restore, no stars, "Your turn!"', async () => {
            await page.evaluate((c) => {
              if (c.weekly) LE.app.openWeeklyStep(c.weekly[0], c.weekly[1], { fresh: true });
              else { LE.app.store.unlockTo(c.w, c.i); LE.app.openLevel(c.w, c.i, { fresh: true }); }
            }, c);
            await page.waitForSelector('.level-screen .ask-helper');
            await page.waitForTimeout(500);
            // His own progress first: the first moves of the solution (and maybe a wrong block), saved like a real move.
            await page.evaluate(async (c) => {
              const g = document.querySelector('.gate-go'); if (g) g.click();
              await new Promise((r) => setTimeout(r, 200));
              const inst = LE.activeLevel.inst;
              const mv = LE.aiDemo.groupSteps(inst.showMe());
              for (let k = 0; k < c.prep && k < mv.length - 1; k++) for (const st of mv[k]) { if (st.apply) st.apply(); await new Promise((r) => setTimeout(r, 150)); }
              const t0 = Date.now(); while (inst.busy && Date.now() - t0 < 6000) await new Promise((r) => setTimeout(r, 100));
              LE.activeLevel.buddy.hide();
            }, c);
            if (c.wrong) { await page.tap('.tray-blk[data-type="L"]'); await page.waitForTimeout(400); }
            const snap = () => page.evaluate(() => ({ board: JSON.stringify(LE.aiDemo.boardOf(LE.activeLevel.inst)), saved: JSON.stringify(LE.app.store.data.inProgress),
              stars: JSON.stringify(LE.app.store.data.stars) + JSON.stringify(LE.app.store.data.weekly.completed) }));
            const before = await snap();
            if (before.board === 'null' || before.saved === '{}') throw new Error('no progress to keep: ' + JSON.stringify(before));
            const nCalls = await page.evaluate(() => (window.__calls || []).length);
            await page.tap('.ask-helper');
            await page.waitForSelector('.helper-call.show .helper-face.speaking', { timeout: 8000 });
            const call = await page.evaluate((n) => window.__calls[n], nCalls);
            for (const t of ['point_at', 'draw_arrow', 'highlight', 'demo_next_step', 'demo_all', 'clear_marks']) if (call.tools.indexOf(t) < 0) throw new Error('tool missing: ' + t);
            if (!call.vars.board || call.vars.board === 'unknown' || !/1\. /.test(call.vars.next_steps) || !/ = /.test(call.vars.targets)) throw new Error('vars: ' + JSON.stringify(call.vars));
            if (c.wrong && !/take away/.test(call.vars.next_steps)) throw new Error('wrong block not in the steps: ' + call.vars.next_steps);
            // Salah can't touch the board mid-call (only End works).
            const hb = await page.locator('.play-host').boundingBox();
            await page.touchscreen.tap(hb.x + hb.width / 2, hb.y + hb.height * 0.8);
            await page.touchscreen.tap(hb.x + hb.width * 0.2, hb.y + hb.height * 0.95);
            await page.waitForTimeout(300);
            if ((await snap()).board !== before.board) throw new Error('board changed by a tap during the call');
            // Marks: highlight + arrow + pointing finger on targets of the next move.
            const r1 = await page.evaluate(async () => {
              const t = window.__o.clientTools, mv = LE.activeLevel.ai().demo.context().moves[0];
              if (!mv) return ['NOMOVES', JSON.stringify(LE.aiDemo.boardOf(LE.activeLevel.inst)), JSON.stringify(LE.activeLevel.inst.showMe({ fromCurrent: true }).map((s) => s.from + '>' + s.to)), JSON.stringify(LE.activeLevel.inst.showMe().map((s) => s.from + '>' + s.to))];
              const a = mv.find((s) => s.from && s.to) || mv[mv.length - 1];
              const out = [];
              out.push(await t.highlight({ target: a.to || a.from }));
              if (a.to) out.push(await t.draw_arrow({ from: a.from, to: a.to }));
              out.push(await t.point_at({ target: a.from }));
              out.push(await t.point_at({ target: 'no-such-thing' }));
              return out;
            });
            if (!/^Highlighted /.test(r1[0]) || !/^Pointing at /.test(r1[r1.length - 2]) || !/could not find.*target ids/.test(r1[r1.length - 1])) throw new Error('marks: ' + JSON.stringify(r1));
            const marks = await page.evaluate(() => ({ rings: document.querySelectorAll('.ai-ring').length, arrows: document.querySelectorAll('.ai-arrow').length, hand: document.getElementById('hand').classList.contains('show') }));
            if (!marks.rings || !marks.hand) throw new Error('marks not drawn: ' + JSON.stringify(marks));
            if (c.shots) await shot(page, 'ai-demo-mid.png');
            // One step, then the rest.
            const r2 = await page.evaluate(() => window.__o.clientTools.demo_next_step({}));
            if (!/^Showed: /.test(r2) || !/Next|in place|works/.test(r2)) throw new Error('step: ' + r2);
            if (c.wrong && !/take away/.test(r2)) throw new Error('wrong block not fixed first: ' + r2);
            if ((await snap()).board === before.board) throw new Error('the step did not change the board');
            if (!(await page.evaluate(() => document.querySelectorAll('.ai-ring, .ai-arrow').length === 0))) throw new Error('marks not cleared by the step');
            await page.waitForTimeout(500);
            const ctxSent = await page.evaluate(() => window.__ctx.slice(-1)[0] || '');
            if (!/^BOARD UPDATE/.test(ctxSent)) throw new Error('no contextual update: ' + ctxSent);
            if (c.shots) {
              await page.evaluate(async () => { const t = window.__o.clientTools, mv = LE.activeLevel.ai().demo.context().moves[0]; const a = mv.find((s) => s.from && s.to); if (a) { await t.highlight({ target: a.to }); await t.draw_arrow({ from: a.from, to: a.to }); await t.point_at({ target: a.from }); } });
              await shot(page, 'ai-demo-mid2.png');
            }
            const r3 = await page.evaluate(() => window.__o.clientTools.demo_all({}));
            if (!/works|in place/.test(r3)) throw new Error('demo_all: ' + r3);
            if (!(await page.evaluate(() => LE.activeLevel.ai().solved))) throw new Error('the demo did not solve it: ' + r3);
            if (c.shots) await shot(page, 'ai-demo-solved.png');
            const mid = await snap();
            if (mid.stars !== before.stars) throw new Error('stars given for the helper demo');
            if (mid.saved !== before.saved) throw new Error('demo moves were saved');
            if (await page.locator('.win-stars').count()) throw new Error('win screen shown');
            const r4 = await page.evaluate(() => window.__o.clientTools.clear_marks({}));
            if (!/Cleared/.test(r4)) throw new Error(r4);
            // End the call: tap End / the agent hangs up / the app goes to the background.
            if (c.end === 'tap') await page.tap('.helper-end');
            else if (c.end === 'agent') await page.evaluate(() => window.__endHelper());
            else await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; });
            await page.waitForTimeout(700);
            const after = await snap();
            const rec = await page.evaluate(() => LE.activeLevel.lastAi);
            if (!rec || !rec.restored || !rec.exact) throw new Error('restore record: ' + JSON.stringify(rec && { restored: rec.restored, exact: rec.exact, before: rec.before, after: rec.after }));
            if (after.board !== before.board) throw new Error('board not restored:\n' + before.board + '\n' + after.board);
            if (after.saved !== before.saved) throw new Error('saved progress changed');
            if (after.stars !== before.stars) throw new Error('stars changed');
            const left = await page.evaluate(() => ({ bar: !!document.querySelector('.helper-call'), shield: !!document.querySelector('.ai-shield'), marks: !!document.querySelector('.ai-marks'), hand: document.getElementById('hand').classList.contains('show') }));
            if (left.bar || left.shield || left.marks || left.hand) throw new Error('left over: ' + JSON.stringify(left));
            const bub = await page.textContent('.bubble.show .bubble-text').catch(() => '');
            if (!/Your turn/.test(bub)) throw new Error('no "Your turn!": ' + bub);
            if (c.shots) await shot(page, 'ai-demo-restored.png');
          });
        }
        await check('helper demo: after the restore the board is his again (a tap works)', async () => {
          await page.evaluate(() => { LE.app.openLevel('robot', 7, { fresh: true }); });
          await page.waitForSelector('.level-screen .ask-helper');
          await page.waitForTimeout(400);
          await page.evaluate(() => { const g = document.querySelector('.gate-go'); if (g) g.click(); LE.activeLevel.buddy.hide(); });
          await page.tap('.ask-helper');
          await page.waitForSelector('.helper-call.show .helper-face.speaking', { timeout: 8000 });
          await page.evaluate(() => window.__o.clientTools.demo_next_step({}));
          await page.tap('.helper-end');
          await page.waitForTimeout(600);
          await page.evaluate(() => LE.activeLevel.buddy.hide());
          await page.waitForTimeout(300);
          await page.tap('.tray-blk[data-type="F"]');
          await page.waitForTimeout(300);
          const n = await page.evaluate(() => LE.activeLevel.inst.getProgram().length);
          if (n !== 1) throw new Error('program length ' + n);
        });
        await check('helper demo: no page errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
        await context.close();
      } finally { await micBrowser.close(); }
    }

    /* ---------- Show me: gated (hint first), lights up after 2 tries / 2 minutes / parent; demo never gives stars ---------- */
    if (!ONLY || ONLY === 'showme') {
      const { context, page } = await newPage(browser);
      await page.goto(url + '?fast=1&showmegate=1&menu=1&nosw=1&now=' + WEEK0);
      await page.waitForSelector('.menu-screen');
      const open = async (w, i) => {
        await page.evaluate(([w, i]) => { const s = LE.app.store; s.data.seenTips = new Proxy({}, { get: () => true }); s.unlockTo(w, i); LE.app.openLevel(w, i, { fresh: true }); }, [w, i]);
        await page.waitForSelector('.level-screen .play-host');
        await page.waitForTimeout(500);
      };
      await check('show me: starts locked; tapping it gives the hint first', async () => {
        await open('machines', 9);
        await page.waitForSelector('.bubble.show .showme-btn.locked');
        await page.tap('.bubble.show .showme-btn');
        await page.waitForTimeout(300);
        const t = await page.textContent('.bubble-text');
        const hint = await page.evaluate(() => LE.activeLevel.level.hint);
        if (!/hint first/.test(t) || t.indexOf(hint) < 0) throw new Error('bubble: ' + t);
        if (await page.locator('.demo-shield').count()) throw new Error('demo started while locked');
      });
      await check('show me: lights up after 2 failed tries', async () => {
        for (let k = 0; k < 2; k++) {
          await page.evaluate(() => document.querySelector('.go-btn').click());
          await page.waitForFunction(() => !LE.activeLevel.inst.busy, null, { timeout: 20000 });
          await page.waitForTimeout(400);
        }
        await page.waitForSelector('.bubble.show .showme-btn.lit', { timeout: 5000 });
        if (!(await page.evaluate(() => LE.activeLevel.showMeOpen()))) throw new Error('not open');
      });
      await check('show me: lights up after ~2 minutes (fake clock), buddy offers it', async () => {
        await open('robot', 6);
        if (await page.evaluate(() => LE.activeLevel.showMeOpen())) throw new Error('open too early');
        await page.evaluate(() => { const real = LE.now; window.__realNow = real; LE.now = () => new Date(real().getTime() + 125000); });
        await page.waitForSelector('.bubble.show .showme-btn.lit', { timeout: 6000 });
        if (!/Now I can show you/.test(await page.textContent('.bubble-text'))) throw new Error('no ready line');
        await page.waitForTimeout(500);
        await shot(page, 'show-me-btn.png');
        await page.evaluate(() => { LE.now = window.__realNow; });
      });
      await check('show me: parent "always open" works at once', async () => {
        await page.evaluate(() => LE.app.store.setShowMeAlways(true));
        await open('circuits', 7);
        if (!(await page.evaluate(() => LE.activeLevel.showMeOpen()))) throw new Error('not open');
        await page.evaluate(() => LE.app.store.setShowMeAlways(false));
      });
      await check('show me: the demo solves the level, gives no stars, resets; a real solve then gets 3 stars', async () => {
        await open('circuits', 7);
        await page.evaluate(() => { LE.showMeForce = true; });
        await page.evaluate(() => LE.activeLevel.showMe());
        await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 60000 });
        const d = await page.evaluate(() => LE.activeLevel.lastDemo);
        if (!d || !d.solved) throw new Error('demo: ' + JSON.stringify(d));
        if (await page.evaluate(() => LE.app.store.getStars('circuits', 7))) throw new Error('stars after the demo');
        if (await page.locator('.overlay.win').count()) throw new Error('win card after the demo');
        await page.evaluate(() => LE.activeLevel.solve());
        await page.waitForSelector('.overlay.win', { timeout: 30000 });
        if ((await page.evaluate(() => LE.app.store.getStars('circuits', 7))) !== 3) throw new Error('no stars after solving');
        await page.evaluate(() => { LE.showMeForce = false; LE.closeOverlay(); });
      });
      await check('show me: no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      await context.close();

      // Real speed (not ?fast): the hand places Robot Coder blocks; Pause / Again / Let me try.
      const r = await newPage(browser);
      const pg = r.page;
      await pg.goto(url + '?menu=1&nosw=1&now=' + WEEK0);
      await pg.waitForSelector('.menu-screen');
      await pg.evaluate(() => { LE.voiceOn = false; LE.sound.setMuted(true); const s = LE.app.store; s.data.seenTips = new Proxy({}, { get: () => true }); s.unlockTo('robot', 8); s.setShowMeAlways(true); LE.app.openLevel('robot', 8, { fresh: true }); });
      await pg.waitForSelector('.level-screen .go-gate', { timeout: 8000 });
      await check('show me (robot, real speed): the hand drags blocks into the program', async () => {
        await pg.tap('.bubble.show .showme-btn');
        await pg.waitForSelector('#hand.show.drag', { timeout: 15000 });
        await pg.waitForTimeout(250);
        await shot(pg, 'show-me-hand-mid-demo.png');
        await pg.waitForFunction(() => LE.activeLevel.inst.getProgram().length >= 1, null, { timeout: 15000 });
      });
      await check('show me: Pause stops the demo, Go on continues', async () => {
        await pg.tap('.demo-pause');
        await pg.waitForTimeout(2500);
        const a = await pg.evaluate(() => JSON.stringify(LE.activeLevel.inst.getProgram()));
        await pg.waitForTimeout(2000);
        const b2 = await pg.evaluate(() => JSON.stringify(LE.activeLevel.inst.getProgram()));
        if (a !== b2) throw new Error('kept going while paused');
        await shot(pg, 'show-me-paused.png');
        await pg.tap('.demo-pause');
        await pg.waitForFunction((a) => JSON.stringify(LE.activeLevel.inst.getProgram()) !== a, a, { timeout: 15000 });
      });
      await check('show me: Again replays the step; Let me try stops and resets with no stars', async () => {
        const n1 = await pg.evaluate(() => LE.activeLevel.inst.getProgram().length);
        await pg.tap('.demo-replay');
        await pg.waitForTimeout(4000);
        const n2 = await pg.evaluate(() => LE.activeLevel.inst.getProgram().length);
        if (n2 > n1 + 1) throw new Error('did not rewind: ' + n1 + ' → ' + n2);
        await pg.tap('.demo-try');
        await pg.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 15000 });
        const d = await pg.evaluate(() => LE.activeLevel.lastDemo);
        if (!d.stopped) throw new Error('not stopped');
        const left = await pg.evaluate(() => LE.activeLevel.inst.getProgram().length);
        if (left !== 0) throw new Error('board not reset: ' + left);
        if (await pg.evaluate(() => LE.app.store.getStars('robot', 8))) throw new Error('stars');
        await pg.waitForSelector('.go-gate', { timeout: 5000 });
      });
      await check('show me (real speed): no console errors', async () => { if (pg.errors.length) throw new Error(pg.errors.slice(0, 3).join(' | ')); });
      await r.context.close();
    }

    /* ---------- Car Builder & Race (replaced the Practice Room) ---------- */
    if (!ONLY || ONLY === 'cars') {
      const { context, page } = await newPage(browser);
      // an old save from the Practice Room days: progress + "last screen = practice"
      await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK0);
      await page.waitForSelector('.menu-screen');
      await page.evaluate(() => {
        localStorage.setItem('littleEngineerSave', JSON.stringify({ version: 3, stars: { robot: [3, 2] }, practice: { done: { p1: true, p3: true }, state: { current: 'p2', program: [] } },
          last: { screen: 'practice' } }));
      });

      // screens swap with a short transition: wait until only the new garage is left
      const oneGarage = () => page.waitForFunction(() => document.querySelectorAll('.garage-screen').length === 1 && document.querySelector('.garage-screen .cg-car'));

      await check('cars: an old Practice Room save opens the garage (no errors) and keeps its data', async () => {
        await page.goto(url + '?fast=1&nosw=1&now=' + WEEK0);
        await page.waitForSelector('.garage-screen .cg-car');
        const d = await page.evaluate(() => ({ p: LE.app.store.data.practice.done, r: LE.app.store.data.stars.robot, menuBtn: 0 }));
        if (!d.p.p1 || !d.p.p3 || d.r[0] !== 3) throw new Error(JSON.stringify(d));
        await page.evaluate(() => LE.app.showMenu());
        await page.waitForSelector('.car-btn');
        if (await page.locator('.practice-btn').count()) throw new Error('practice button still in the menu');
        await page.waitForTimeout(700);
        await noOverflow(page, 'menu with Car Builder');
        await shot(page, 'cars-menu.png');
      });

      await check('cars: garage — starter car + a new car (max 6, saved locally)', async () => {
        await page.tap('.car-btn');
        await page.waitForSelector('.garage-screen .cg-car');
        await page.tap('.cg-new');
        await page.waitForSelector('.build-screen .cb-part');
        await page.evaluate(() => LE.cars.showGarage());
        await oneGarage();
        if ((await page.locator('.cg-car').count()) !== 2) throw new Error('cars: ' + JSON.stringify(await page.evaluate(() => LE.app.store.getGarage().map((c) => c.name))));
        await page.evaluate(() => { for (let i = 0; i < 6; i++) LE.app.store.saveCar({ id: 'x' + i, name: 'Extra ' + i, body: 'truck', wheels: 'monster', engine: 'big', spoiler: 'wing', color: 'green', sticker: 'tiger' }); });
        await page.evaluate(() => LE.cars.showGarage());
        await oneGarage();
        if ((await page.locator('.cg-car').count()) !== 6 || (await page.locator('.cg-new').count())) throw new Error('garage limit');
        await page.evaluate(() => { ['x2', 'x3', 'x4', 'x5'].forEach((id) => LE.app.store.removeCar(id)); LE.app.store.setCurrentCar(LE.app.store.getGarage()[0].id); });
        await page.evaluate(() => LE.cars.showGarage());
        await oneGarage();
        await page.waitForTimeout(500);
        await noOverflow(page, 'garage');
        await shot(page, 'cars-garage.png');
      });

      await check('cars: build — drag monster wheels onto the car, tabs, paint + sticker, stats change', async () => {
        await page.tap('.cg-car');
        await page.waitForSelector('.build-screen .cb-tab[data-slot="wheels"]');
        await page.tap('.cb-tab[data-slot="wheels"]');
        const bumps0 = Number(await page.getAttribute('.cb-bar[data-stat="bumps"]', 'data-value'));
        const part = await page.locator('.cb-part[data-id="monster"]').boundingBox(), st = await page.locator('.cb-stage').boundingBox();
        await page.mouse.move(part.x + part.width / 2, part.y + part.height / 2); await page.mouse.down();
        await page.mouse.move(part.x + part.width / 2, part.y + 10, { steps: 4 });
        if (!(await page.locator('.cb-ghost').count())) throw new Error('no drag ghost');
        await page.mouse.move(st.x + st.width / 2, st.y + st.height / 2, { steps: 10 });
        if (!(await page.locator('.cb-stage.hot').count())) throw new Error('drop zone not highlighted');
        await page.mouse.up();
        await page.waitForTimeout(250);
        const car = await page.evaluate(() => LE.activeCars.car());
        if (car.wheels !== 'monster') throw new Error('drag did not fit the wheels: ' + car.wheels);
        if (Number(await page.getAttribute('.cb-bar[data-stat="bumps"]', 'data-value')) <= bumps0) throw new Error('bumps bar');
        // a drag that ends off the car does nothing
        const big = await page.locator('.cb-part[data-id="big"]').boundingBox();
        await page.mouse.move(big.x + 30, big.y + 30); await page.mouse.down(); await page.mouse.move(big.x + 30, big.y - 2, { steps: 4 });
        await page.mouse.move(big.x + 30, big.y + 60, { steps: 4 }); await page.mouse.up();
        if ((await page.evaluate(() => LE.activeCars.car().wheels)) !== 'monster') throw new Error('drop outside changed the car');
        await page.tap('.cb-tab[data-slot="color"]'); await page.tap('.cb-part[data-id="blue"]');
        await page.tap('.cb-tab[data-slot="sticker"]'); await page.tap('.cb-part[data-id="tiger"]');
        await page.tap('.cb-tab[data-slot="spoiler"]'); await page.tap('.cb-part[data-id="wing"]');
        await page.tap('.cb-tab[data-slot="wheels"]');
        const saved = await page.evaluate(() => LE.app.store.getCar(LE.app.store.getCurrentCar()));
        if (saved.color !== 'blue' || saved.sticker !== 'tiger' || saved.spoiler !== 'wing') throw new Error(JSON.stringify(saved));
        await page.waitForTimeout(500);
        await noOverflow(page, 'build');
        await shot(page, 'cars-build.png');
      });

      await check('cars: tracks — first open, others locked (tap does nothing)', async () => {
        await page.tap('.cb-race');
        await page.waitForSelector('.ct-track[data-track="sunny"]');
        if ((await page.locator('.ct-track.locked').count()) !== 6) throw new Error('locked tracks');
        await page.tap('.ct-track[data-track="ice"]');
        await page.waitForTimeout(300);
        if (await page.locator('.race-screen').count()) throw new Error('locked track opened');
        await page.waitForTimeout(300);
        await noOverflow(page, 'tracks');
        await shot(page, 'cars-tracks.png');
      });

      await check('cars: race — countdown, side view, smooth under 4× CPU throttle (older Android), results + tip + stars', async () => {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        await page.tap('.ct-track[data-track="sunny"]');
        await page.waitForSelector('.race-screen .cr-canvas');
        await page.waitForFunction(() => LE.activeCars && LE.activeCars.race && LE.activeCars.race.you.x > LE.activeCars.race.len * 0.45, null, { timeout: 30000 });
        await page.evaluate(() => LE.activeCars.pause());
        const perf = await page.evaluate(() => LE.activeCars.perf());
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
        console.log('    race draw: ' + perf.frames + ' frames, avg ' + perf.avgMs.toFixed(2) + ' ms, max ' + perf.maxMs.toFixed(1) + ' ms (4× CPU throttle)');
        if (perf.frames < 10 || perf.avgMs > 8) throw new Error('draw too slow: ' + JSON.stringify(perf));
        await page.waitForTimeout(300);
        await shot(page, 'cars-race.png');
        await page.evaluate(() => LE.activeCars.resume());
        await page.waitForSelector('.race-results .cr-tip', { timeout: 60000 });
        const r = await page.evaluate(() => {
          const car = LE.app.store.getCar(LE.app.store.getCurrentCar()), tr = LE.carsContent.tracks[0];
          return { want: LE.logic.cars.tip(tr, car).text, got: document.querySelector('.cr-tip').textContent, stars: document.querySelectorAll('.cr-stars .on').length,
            best: LE.app.store.getTrackStars('sunny'), place: LE.logic.cars.result(tr, car).place };
        });
        if (r.got.indexOf(r.want) < 0) throw new Error('tip: ' + r.got);
        if (r.stars !== [0, 3, 2, 1][r.place] || r.best !== r.stars) throw new Error(JSON.stringify(r));
        if (!(await page.locator('.cr-new').count())) throw new Error('no "new track" note');
        await page.waitForTimeout(600);
        await noOverflow(page, 'results');
        await shot(page, 'cars-results.png');
      });

      await check('cars: next track opened; rebuild and race again (hills mid-race shot)', async () => {
        await page.tap('.cr-tracks');
        await page.waitForSelector('.ct-track[data-track="hills"]:not(.locked)');
        await page.tap('.ct-track[data-track="hills"]');
        await page.waitForFunction(() => LE.activeCars && LE.activeCars.race && LE.activeCars.race.you.x > 95, null, { timeout: 30000 });
        await page.evaluate(() => LE.activeCars.pause());
        await page.waitForTimeout(200);
        await shot(page, 'cars-race-hills.png');
        await page.evaluate(() => LE.activeCars.resume());
        await page.waitForSelector('.race-results .cr-build', { timeout: 60000 });
        await page.tap('.cr-build');
        await page.waitForSelector('.build-screen .cb-part');
        await page.tap('.cb-race');
        await page.tap('.ct-track[data-track="hills"]');
        await page.waitForSelector('.race-results .cr-again', { timeout: 60000 });
        await page.tap('.cr-again');
        await page.waitForSelector('.race-screen .cr-canvas');
        await page.tap('.race-screen .back');
        await page.waitForSelector('.tracks-screen');
      });

      await check('cars: Show me drags the best part for the next track onto the car', async () => {
        await page.evaluate(() => { const s = LE.app.store; s.saveCar(Object.assign({}, s.getCar(s.getCurrentCar()), { body: 'truck', wheels: 'monster', engine: 'big', spoiler: 'none' })); LE.cars.showBuild(s.getCurrentCar()); });
        await page.waitForSelector('.build-screen .cb-part');
        const before = await page.evaluate(() => JSON.stringify(LE.activeCars.car()));
        await page.tap('.cb-showme');
        await page.waitForSelector('#hand.show', { timeout: 5000 });
        await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 30000 });
        const after = await page.evaluate(() => JSON.stringify(LE.activeCars.car()));
        if (before === after) throw new Error('no change');
      });

      await check('cars: remove a car (confirm), back to the menu', async () => {
        const n0 = await page.evaluate(() => LE.app.store.getGarage().length);
        await page.tap('.cb-delete');
        await page.waitForSelector('.overlay.confirm .btn.red');
        await page.tap('.overlay.confirm .btn.red');
        await page.waitForSelector('.garage-screen');
        if ((await page.evaluate(() => LE.app.store.getGarage().length)) !== n0 - 1) throw new Error('not removed');
        await page.tap('.garage-screen .back');
        await page.waitForSelector('.menu-screen .car-btn');
      });

      await check('cars: no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      await context.close();
    }

    /* ---------- Finger scrolling: every scrollable panel must scroll by touch (Royal Rescue bug class:
     *            a document touchmove handler preventDefault-ing everything outside a whitelist) ---------- */
    if (!ONLY || ONLY === 'scroll') {
      const { context, page } = await newPage(browser);
      await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK0);
      await page.waitForSelector('.menu-screen');
      await page.waitForTimeout(500);
      const cdp = await context.newCDPSession(page);
      /** Synthetic touchmove inside `sel` must not be defaultPrevented; content must overflow (axis) and the end be reachable. */
      const probe = (sel, axis) => page.evaluate(([sel, axis]) => {
        const box = document.querySelector(sel);
        if (!box) return { err: 'missing ' + sel };
        const inner = box.querySelector('*:not(svg *)') || box;
        const r = inner.getBoundingClientRect();
        const mk = (x, y) => new Touch({ identifier: 7, target: inner, clientX: x, clientY: y });
        const x = r.left + Math.min(20, r.width / 2), y = r.top + Math.min(20, r.height / 2);
        inner.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true, touches: [mk(x, y)], targetTouches: [mk(x, y)], changedTouches: [mk(x, y)] }));
        const mv = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(x, y - 30)], targetTouches: [mk(x, y - 30)], changedTouches: [mk(x, y - 30)] });
        inner.dispatchEvent(mv);
        inner.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: [mk(x, y - 30)] }));
        const over = axis === 'x' ? box.scrollWidth - box.clientWidth : box.scrollHeight - box.clientHeight;
        if (axis === 'x') box.scrollLeft = box.scrollWidth; else box.scrollTop = box.scrollHeight;
        const moved = axis === 'x' ? box.scrollLeft : box.scrollTop;
        const last = box.lastElementChild, br = box.getBoundingClientRect(), lr = last.getBoundingClientRect();
        const reach = axis === 'x' ? lr.right <= br.right + 2 : lr.bottom <= br.bottom + 2;
        if (axis === 'x') box.scrollLeft = 0; else box.scrollTop = 0;
        return { prevented: mv.defaultPrevented, over: Math.round(over), moved: Math.round(moved), reach };
      }, [sel, axis]);
      /** A real finger drag (CDP touch events) actually scrolls the panel. */
      const drag = async (sel, axis) => {
        const b = await page.locator(sel).boundingBox();
        const x = b.x + b.width / 2, y = b.y + b.height * 0.7;
        const hit = await page.evaluate(([sel, x, y]) => { const e = document.elementFromPoint(x, y); return !!(e && e.closest(sel)); }, [sel, x, y]);
        if (!hit) throw new Error('something covers the panel where the finger lands');
        const dx = axis === 'x' ? -160 : 0, dy = axis === 'x' ? 0 : -Math.min(220, b.height * 0.5);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * k / 8, y: y + dy * k / 8 }] }); await page.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(400);
        return page.evaluate(([sel, axis]) => { const e = document.querySelector(sel); const v = axis === 'x' ? e.scrollLeft : e.scrollTop; e.scrollTop = 0; e.scrollLeft = 0; return v; }, [sel, axis]);
      };
      const verify = async (name, sel, axis) => {
        await check('scroll: ' + name + ' scrolls by finger', async () => {
          await page.waitForSelector(sel);
          await page.waitForTimeout(300);
          const r = await probe(sel, axis || 'y');
          if (r.err) throw new Error(r.err);
          if (r.prevented) throw new Error('touchmove was preventDefault-ed (finger scroll blocked)');
          if (r.over <= 0) throw new Error('content does not overflow (nothing to scroll) — test setup');
          if (!r.moved || !r.reach) throw new Error('end of content not reachable ' + JSON.stringify(r));
          const v = await drag(sel, axis || 'y');
          if (!(v > 10)) throw new Error('a real finger drag did not scroll (moved ' + v + ')');
        });
      };
      // a page-level move outside any scroller is still blocked (no rubber band)
      await check('scroll: a finger move on the fixed menu background is still blocked (no rubber-band)', async () => {
        const p = await page.evaluate(() => { const t = document.querySelector('.menu-title');
          const mk = (y) => new Touch({ identifier: 3, target: t, clientX: 100, clientY: y });
          const e = new TouchEvent('touchmove', { bubbles: true, cancelable: true, touches: [mk(80)], targetTouches: [mk(80)], changedTouches: [mk(80)] });
          t.dispatchEvent(e); return e.defaultPrevented; });
        if (!p) throw new Error('not prevented');
      });
      // parent mode tabs
      await page.evaluate(() => LE.parent.openPanel('progress'));
      await verify('parent Progress tab', '.parent-screen .admin-body');
      await page.tap('.tab-weekly');
      await verify('parent Weekly tab', '.parent-screen .admin-body');
      await page.tap('.tab-settings');
      await page.evaluate(() => { const b = document.querySelector('.parent-screen .admin-body'); if (b.scrollHeight <= b.clientHeight) b.style.maxHeight = '220px'; });
      await verify('parent Settings tab', '.parent-screen .admin-body');
      await page.evaluate(() => LE.app.showMenu());
      // weekly hub: step path + week chips
      await page.evaluate(() => LE.app.showWeeklyHub(LE.weeklyProjects[0].id));
      await page.evaluate(() => { const b = document.querySelector('.wk-path'); if (b && b.scrollHeight <= b.clientHeight) b.style.maxHeight = '160px'; });
      await verify('weekly hub step list', '.wk-path');
      await verify('weekly hub week chips (sideways)', '.wk-chips', 'x');
      // world map
      await page.evaluate(() => LE.app.showMap('bridges'));
      await verify('world map', '.map-scroll');
      // Car Builder parts tray (sideways)
      await page.evaluate(() => LE.cars.showGarage());   // makes the starter car on a first visit
      await page.waitForSelector('.cg-car');
      await page.evaluate(() => LE.cars.showBuild(LE.app.store.getGarage()[0].id));
      await page.waitForSelector('.cb-part');
      await page.waitForTimeout(600);
      await page.evaluate(() => { document.querySelectorAll('.bubble.show').forEach((b) => b.classList.remove('show')); const t = document.querySelector('.cb-tray'); t.style.maxWidth = '200px'; });
      await verify('car parts tray (sideways)', '.cb-tray', 'x');
      // kid settings + PIN pad overlays on a very short screen (they scroll inside the card)
      await page.evaluate(() => LE.app.showMenu());
      await page.setViewportSize({ width: 375, height: 420 });
      await page.waitForTimeout(300);
      await page.evaluate(() => LE.app.openSettings());
      await verify('kid Settings panel (short screen) — Parents button reachable', '.overlay.settings.show .overlay-card');
      await page.evaluate(() => LE.parent.openPin());
      await page.waitForTimeout(500);
      await verify('PIN pad (short screen)', '.pin-overlay.show .overlay-card');
      await check('scroll: no console errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      await context.close();
    }

    /* ---------- Update game: real service worker; a route bumps sw.js to fake a new release ---------- */
    if (!ONLY || ONLY === 'update') {
      const context = await browser.newContext({ ...pw.devices[DEVICE] });   // service workers allowed here
      let release = 1;   // a second server whose sw.js changes when we "publish" a new release
      const rel = await start(0, { transform: (f, d) => (f === 'sw.js' ? d.toString() + '\n// release ' + release + '\n' : d) });
      const url = rel.url;
      const page = await context.newPage();
      page.errors = [];
      page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
      await page.goto(url + '?fast=1&menu=1&now=' + WEEK0);
      await page.waitForSelector('.menu-screen');
      await check('update: SW registers (updateViaCache none) and controls the page; first install takes over at once', async () => {
        await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 30000 });
        const v = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).updateViaCache);
        if (v !== 'none') throw new Error('updateViaCache=' + v);
        if (!(await page.evaluate(async () => (await caches.keys()).some((k) => /^engineer-v3-[0-9a-f]{10}$/.test(k))))) throw new Error('no engineer-v3-<build> cache');
      });
      await check('update: Settings → "Update game" says "You have the latest version" when nothing is new', async () => {
        await page.tap('.settings-btn');
        await page.waitForSelector('.overlay.settings .update-btn');
        await page.waitForTimeout(400);
        await shot(page, 'update-button.png');
        await page.tap('.update-btn');
        await page.waitForFunction(() => /latest version/.test((document.querySelector('.kid-toast') || {}).textContent || ''), null, { timeout: 20000 });
        await page.waitForTimeout(300);
        await shot(page, 'update-latest.png');
      });
      await check('update: offline → "You\'re offline, try again later" (nothing reloads)', async () => {
        await page.evaluate(() => { window.__marker = 1; document.querySelectorAll('.kid-toast').forEach((t) => t.remove()); });
        await context.setOffline(true);
        await page.tap('.update-btn');
        await page.waitForFunction(() => /offline, try again later/.test((document.querySelector('.kid-toast') || {}).textContent || ''), null, { timeout: 10000 });
        await page.waitForTimeout(300);
        await shot(page, 'update-offline.png');
        await context.setOffline(false);
        if (!(await page.evaluate(() => window.__marker))) throw new Error('page reloaded');
        await page.evaluate(() => LE.closeOverlay());
      });
      await check('update: new release found mid-level → banner, NO auto reload; level keeps going', async () => {
        await page.evaluate(() => { const s = LE.app.store; s.data.seenTips = new Proxy({}, { get: () => true }); s.unlockTo('machines', 3); LE.app.openLevel('machines', 3, { fresh: true }); window.__marker = 2; });
        await page.waitForSelector('.level-screen .play-host');
        release = 2;
        await page.evaluate(() => LE.updater.check(true));
        await page.waitForSelector('.update-banner', { timeout: 30000 });
        await page.waitForTimeout(3000);
        if (!(await page.evaluate(() => window.__marker === 2 && !!document.querySelector('.level-screen')))) throw new Error('reloaded / left the level');
        if (!(await page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration()).waiting))) throw new Error('new worker not waiting');
        await shot(page, 'update-banner.png');
      });
      await check('update: the banner fits on screen and ✕ hides it', async () => {
        const b = await page.evaluate(() => { const r = document.querySelector('.update-banner').getBoundingClientRect(); return [r.left, r.right, innerWidth]; });
        if (b[0] < 0 || b[1] > b[2]) throw new Error('banner overflow ' + b);
        await page.tap('.update-x');
        if (await page.locator('.update-banner').count()) throw new Error('still shown');
        await page.evaluate(() => LE.showUpdateBanner());
        await page.waitForSelector('.update-banner');
      });
      await check('update: tap the banner → progress saved, new version activates and the game reloads once', async () => {
        await page.evaluate(() => { LE.app.store.setStarsExact ? LE.app.store.setStarsExact('machines', 1, 3) : 0; });
        const before = await page.evaluate(() => localStorage.getItem('littleEngineerSave'));
        await Promise.all([page.waitForEvent('load', { timeout: 30000 }), page.tap('.update-banner span')]);
        await page.waitForSelector('.menu-screen, .level-screen, .map-screen', { timeout: 20000 });
        if (await page.evaluate(() => window.__marker)) throw new Error('did not reload');
        const after = await page.evaluate(() => localStorage.getItem('littleEngineerSave'));
        if (JSON.parse(after).stars && JSON.stringify(JSON.parse(after).stars) !== JSON.stringify(JSON.parse(before).stars)) throw new Error('progress changed');
        const st = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return { waiting: !!r.waiting, ctl: !!navigator.serviceWorker.controller }; });
        if (st.waiting || !st.ctl) throw new Error(JSON.stringify(st));
        if (await page.locator('.update-banner').count()) throw new Error('banner still shown after update');
      });
      await check('update: still works offline after updating', async () => {
        await context.setOffline(true);
        await page.reload();
        await page.waitForSelector('.menu-screen, .level-screen, .map-screen', { timeout: 20000 });
        await context.setOffline(false);
      });
      await check('update: no page errors', async () => { if (page.errors.length) throw new Error(page.errors.slice(0, 3).join(' | ')); });
      await context.close();
      rel.server.close(); if (rel.server.closeAllConnections) rel.server.closeAllConnections();
    }
  } finally {
    await browser.close();
    server.close(); if (server.closeAllConnections) server.closeAllConnections();
  }
  console.log(failures ? `\n${failures} v3 check(s) failed` : '\nAll v3 checks passed');
  process.exitCode = failures ? 1 : 0;
}

module.exports = { noOverflow, WEEK0, WEEK1 };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
