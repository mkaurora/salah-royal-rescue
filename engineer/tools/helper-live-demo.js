/* One REAL Ask Helper call through the game UI (dev check, needs internet, uses agent credits):
 *   node tools/helper-live-demo.js question.wav
 * Machines "Big Machine" with one part placed, fake mic fed a spoken question, real SDK + agent. Logs the
 * transcript, every client tool call the agent makes (and its result), screenshots the board while the helper
 * shows it, ends the call and checks the board is restored exactly. No API key is used (public agent). */
'use strict';
const path = require('path');
const pw = require('playwright');
const { start } = require('../e2e/server.js');

(async () => {
  const wav = process.argv[2];
  const SHOTS = process.env.SHOTS_DIR || '/workspace/little-engineer-v3-shots';
  const WAIT = Number(process.env.WAIT_MS || 50000);
  const args = ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
  if (wav) args.push('--use-file-for-fake-audio-capture=' + path.resolve(wav));
  const browser = await pw.chromium.launch({ args });
  const { server, url } = await start(0);
  const context = await browser.newContext({ ...pw.devices[process.env.DEVICE || 'Galaxy S9+'], serviceWorkers: 'block', permissions: ['microphone'] });
  const page = await context.newPage();
  page.on('console', (m) => { if (/error|warn/i.test(m.type())) console.log('  [console.' + m.type() + ']', m.text().slice(0, 200)); });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await page.goto(url.replace('localhost', '127.0.0.1') + '?menu=1&nosw=1');
  await page.waitForSelector('.menu-screen');
  await page.evaluate(async () => {
    window.__live = [];
    const t0 = Date.now();
    window.__note = (k, v) => window.__live.push(((Date.now() - t0) / 1000).toFixed(1) + 's ' + k + ' ' + (typeof v === 'string' ? v : JSON.stringify(v)));
    const SDK = await LE.helperTalk.loadClient();
    const orig = SDK.Conversation.startSession.bind(SDK.Conversation);
    SDK.Conversation.startSession = (o) => orig(Object.assign({}, o, {
      onConnect: (c) => { window.__note('connect', c); o.onConnect && o.onConnect(c); },
      onMessage: (m) => window.__note('message', m),
      onUnhandledClientToolCall: (c) => window.__note('UNHANDLED tool call', c)
    }));
    LE.app.store.data.seenTips = new Proxy({}, { get: () => true });
    LE.app.store.unlockTo('machines', 17);
    LE.app.openLevel('machines', 17, { fresh: true });
  });
  await page.waitForSelector('.level-screen .ask-helper');
  await page.waitForTimeout(1500);
  await page.evaluate(async () => {
    const g = document.querySelector('.gate-go'); if (g) g.click();
    const inst = LE.activeLevel.inst, mv = LE.aiDemo.groupSteps(inst.showMe());
    for (const st of mv[0]) { st.apply && st.apply(); await new Promise((r) => setTimeout(r, 200)); }
    LE.activeLevel.buddy.hide();
    LE.activeLevel.ctx.emit('x');
  });
  await page.waitForTimeout(600);
  const before = await page.evaluate(() => JSON.stringify(LE.aiDemo.boardOf(LE.activeLevel.inst)));
  console.log('board before:', before);
  // Log each tool call as it happens.
  await page.exposeFunction('__toolSeen', (n) => console.log('  >> tool call #' + n));
  await page.tap('.ask-helper');
  let shotTaken = false, seen = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < WAIT) {
    await page.waitForTimeout(400);
    const n = await page.evaluate(() => (LE.activeLevel.ai() ? LE.activeLevel.ai().demo.log.length : -1));
    if (n < 0) { console.log('  call ended by itself'); break; }
    if (n > seen) {
      seen = n;
      if (!shotTaken) { await page.waitForTimeout(700); await page.screenshot({ path: path.join(SHOTS, 'ai-demo-live.png') }); shotTaken = true; }
    }
  }
  const tools = await page.evaluate(() => (LE.activeLevel.ai() ? LE.activeLevel.ai().demo.log : (LE.activeLevel.lastAi || {}).tools || []));
  if (await page.locator('.helper-end').count()) await page.tap('.helper-end');
  await page.waitForTimeout(1500);
  const rec = await page.evaluate(() => LE.activeLevel.lastAi);
  const after = await page.evaluate(() => JSON.stringify(LE.aiDemo.boardOf(LE.activeLevel.inst)));
  const log = await page.evaluate(() => window.__live);
  log.forEach((l) => console.log('  ' + l.slice(0, 400)));
  console.log('TOOL CALLS (' + tools.length + '):');
  tools.forEach((t) => console.log('  ' + t.tool + ' ' + JSON.stringify(t.params) + ' -> ' + t.result));
  console.log('restore:', JSON.stringify({ restored: rec && rec.restored, exact: rec && rec.exact, same: before === after }));
  await page.screenshot({ path: path.join(SHOTS, 'ai-demo-live-restored.png') });
  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
