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
  const shot = (page, f) => page.screenshot({ path: path.join(SHOTS, (SMALL ? 'se-' : '') + f) });
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
        if (!/^Version 3\.\d/.test(v)) throw new Error('version label: ' + v);
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

      await check("weekly: menu shows This Week's Project (week 1: Dream House, countdown)", async () => {
        await page.waitForSelector('.weekly-card');
        const t = await page.textContent('.weekly-card');
        if (!/This Week's Project/.test(t) || !/Dream House/.test(t)) throw new Error('card text: ' + t);
        if (!/Next project in 5 days/.test(t)) throw new Error('countdown: ' + t);
        await noOverflow(page, 'menu');
        await shot(page, 'menu-with-weekly.png');
      });

      await check('weekly: fake clock — week 1 open, week 2 locked', async () => {
        const r = await page.evaluate(() => [0, 1].map((i) => LE.logic.weekly.isProjectUnlocked(LE.app.store.data, i, LE.now())));
        if (!r[0] || r[1]) throw new Error(JSON.stringify(r));
        await page.tap('.weekly-card');
        await page.waitForSelector('.weekly-screen .wk-node');
        if (!(await page.locator('.wk-chip[data-week="1"].locked').count())) throw new Error('week 2 chip not locked');
        await page.tap('.wk-chip[data-week="1"]');
        await page.waitForTimeout(300);
        if (!(await page.locator('.weekly-screen [data-step]').first().count())) throw new Error('left the hub');
        const title = await page.textContent('.weekly-screen .topbar-title');
        if (!/Dream House/.test(title)) throw new Error('opened a locked week: ' + title);
        await page.waitForTimeout(400);
        await noOverflow(page, 'hub');
        await shot(page, 'weekly-hub.png');
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

      await check('weekly: +7 days on the fake clock opens week 2 (Bridge & Car)', async () => {
        await page.goto(url + '?fast=1&menu=1&nosw=1&now=' + WEEK1);
        await page.waitForSelector('.weekly-card');
        const t = await page.textContent('.weekly-card');
        if (!/Bridge & Car/.test(t)) throw new Error('card: ' + t);
        const r = await page.evaluate(() => [1, 2].map((i) => LE.logic.weekly.isProjectUnlocked(LE.app.store.data, i, LE.now())));
        if (!r[0] || r[1]) throw new Error(JSON.stringify(r));
        await page.tap('.weekly-card');
        await page.waitForSelector('.wk-chip[data-week="0"]:not(.locked)');
      });

      await check('weekly: parent PIN → Weekly tab → unlock week 3 early', async () => {
        await page.evaluate(() => LE.app.showMenu());
        await page.waitForSelector('.settings-btn');
        for (let k = 0; k < 5; k++) await page.tap('.menu-title');
        await page.waitForSelector('.pin-overlay.show .pin-pad', { timeout: 6000 });
        for (const k of '1994') await page.tap(`[data-pin="${k}"]`);
        await page.waitForSelector('.parent-screen');
        await page.tap('.tab-weekly');
        await page.locator('.wk-card[data-week="2"] .unlock-week').tap();
        await page.waitForTimeout(200);
        const open = await page.evaluate(() => LE.logic.weekly.isProjectUnlocked(LE.app.store.data, 2, LE.now()));
        if (!open) throw new Error('week 3 still locked');
        await shot(page, 'parent-weekly.png');
        await page.tap('.admin-close');
        await page.tap('.weekly-card');
        await page.waitForSelector('.wk-chip[data-week="2"]:not(.locked)');
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
        if (await page.locator('.overlay.helper.show').count()) throw new Error('helper panel still open');
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
          await page.waitForSelector('.overlay.helper.show .helper-face.listening', { timeout: 8000 });
          await page.waitForSelector('.helper-face.speaking', { timeout: 8000 });
          if (!/talking/.test(await page.textContent('.helper-status'))) throw new Error('no talking state');
          await page.waitForTimeout(700);
          await noOverflow(page, 'helper panel');
          await shot(page, 'ask-helper-talking.png');
          const call = await page.evaluate(() => window.__helperCalls[0]);
          if (call.agentId !== 'agent_9001m5ahkqp5fk9vnyheash2fpfb' || call.connectionType !== 'webrtc') throw new Error(JSON.stringify(call));
          if (call.vars.world !== 'Machines' || call.vars.level_name !== 'Seesaw' || !call.vars.goal || !call.vars.hint || !call.vars.step) throw new Error(JSON.stringify(call.vars));
          if (!/^js\/vendor\//.test(call.lib)) throw new Error('libsamplerate not local: ' + call.lib);
          await page.tap('.helper-end');
          await page.waitForTimeout(400);
          if (await page.locator('.overlay.helper.show').count()) throw new Error('panel still open');
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
      // practice room chips
      await page.evaluate(() => LE.app.showPractice());
      await page.waitForTimeout(600);
      await page.evaluate(() => { document.querySelectorAll('.bubble.show').forEach((b) => b.classList.remove('show')); const b = document.querySelector('.pr-chips'); if (b && b.scrollWidth <= b.clientWidth) b.style.maxWidth = '140px'; });
      await verify('practice room challenge chips (sideways)', '.pr-chips', 'x');
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
