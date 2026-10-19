/* End-to-end checks (npm run e2e): Chromium with iPhone 13 AND iPhone SE (3rd gen, 375×667) emulation.
 * Serves the folder at /salah-royal-rescue/learn/ (like GitHub Pages) and drives the real UI.
 * Screenshots (iPhone 13 unless noted) go to $SHOTS_DIR or /workspace/salah-learn-shots/. */
'use strict';
const fs = require('fs');
const path = require('path');
const pw = require('playwright');
const { start } = require('./server.js');

const SHOTS = process.env.SHOTS_DIR || '/workspace/salah-learn-shots';
fs.mkdirSync(SHOTS, { recursive: true });
const DEVICES = [{ name: 'iPhone 13', tag: '' }, { name: 'iPhone SE (3rd gen)', tag: '-se' }];

let failures = 0;
function ok(n) { console.log('  ✔ ' + n); }
function bad(n, e) { failures++; console.log('  ✘ ' + n + ': ' + String(e && e.message || e).split('\n')[0]); }
async function check(n, fn) { try { await fn(); ok(n); } catch (e) { bad(n, e); } }
function assert(c, m) { if (!c) throw new Error(m || 'assertion failed'); }
const sel = (attr, v) => `[${attr}=${JSON.stringify(String(v))}]`;

async function newPage(browser, device, opts) {
  const ctx = await browser.newContext({ ...pw.devices[device], serviceWorkers: (opts && opts.sw) ? 'allow' : 'block' });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource.*404|net::ERR_INTERNET_DISCONNECTED/.test(m.text())) page.errors.push(m.text()); });
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  return { ctx, page };
}
const Q = (page) => page.evaluate(() => { const q = SQ._play && SQ._play.q; return q && JSON.parse(JSON.stringify(q)); });

/** Answer the current question correctly by tapping the real buttons. */
async function answer(page) {
  const q = await Q(page);
  const card = page.locator('.qcard');
  if (q.type === 'numpad') {
    for (const d of String(q.answer)) await card.locator(sel('data-key', d)).click();
    await card.locator(sel('data-key', '✓')).click();
  } else if (q.type === 'build') {
    for (const ch of q.answer) await card.locator('.tile:not(.used)' + sel('data-letter', ch)).first().click();
  } else if (q.type === 'order') {
    for (const it of q.answer) await card.locator('.order-items .opt' + sel('data-opt', it)).click();
  } else if (q.type === 'match') {
    for (const [l, r] of q.pairs) {
      await card.locator('.opt[data-side=l]' + sel('data-opt', l)).click();
      await card.locator('.opt[data-side=r]' + sel('data-opt', r)).click();
    }
  } else {
    if (q.type === 'count') {
      const objs = card.locator('.obj');
      const n = await objs.count();
      // regression: the picture used to be rendered twice (6 apples shown for "3")
      assert(n === +q.answer, `count question shows ${n} objects but the answer is ${q.answer} (${q.pic})`);
      assert(await card.locator('.stage').count() === 1, 'count question has exactly one picture stage');
      for (let i = 0; i < n; i++) await objs.nth(i).click();
    }
    await card.locator('.answers .opt' + sel('data-opt', q.answer)).click();
  }
  return q;
}
/** Tap a wrong answer (choice-like questions only). Returns the option tapped. */
async function answerWrong(page) {
  const q = await Q(page);
  const faded = await page.$$eval('.qcard .answers .opt.faded', (bs) => bs.map((b) => b.getAttribute('data-opt')));
  const w = q.options.find((o) => o !== q.answer && !faded.includes(o));
  await page.locator('.qcard .answers .opt' + sel('data-opt', w)).click();
  return w;
}
async function waitNextQuestion(page, prevId) {
  await page.waitForFunction((id) => document.querySelector('.screen.win') ||
    (document.querySelector('.qcard') && document.querySelector('.qcard').getAttribute('data-qid') !== id), prevId, { timeout: 15000 });
}
async function playToWin(page, maxQ) {
  for (let i = 0; i < (maxQ || 10); i++) {
    if (await page.locator('.screen.win').count()) return;
    await page.waitForSelector('.qcard[data-qid]');
    const q = await answer(page);
    await waitNextQuestion(page, q.id);
  }
  await page.waitForSelector('.screen.win', { timeout: 5000 });
}
/** The on-screen picture shows what the question data says: one stage; objs/add/sub object counts; frame dots. */
async function picMatches(page, what) {
  const r = await page.evaluate(() => {
    const q = SQ._play.q, c = document.querySelector('.qcard');
    return { pic: q.pic || '', type: q.type, answer: q.answer, stages: c.querySelectorAll(':scope > .stage').length,
      objs: c.querySelectorAll('.stage .obj').length, gone: c.querySelectorAll('.stage .obj.gone').length,
      dots: c.querySelectorAll('.stage .dot').length };
  });
  const tag = what + ' ' + JSON.stringify(r);
  assert(r.stages <= 1, 'picture rendered more than once: ' + tag);
  let m;
  if ((m = /^art:objs:[^:]+:(\d+)$/.exec(r.pic))) assert(r.objs === +m[1], 'objects on screen ≠ picture: ' + tag);
  if (r.type === 'count') assert(r.objs === +r.answer, 'count objects ≠ answer: ' + tag);
  if ((m = /^art:add:[^:]+:(\d+):(\d+)$/.exec(r.pic))) assert(r.objs === +m[1] + +m[2], 'add objects: ' + tag);
  if ((m = /^art:sub:[^:]+:(\d+):(\d+)$/.exec(r.pic))) assert(r.objs === +m[1] && r.gone === +m[2], 'sub objects: ' + tag);
  if ((m = /^art:frame:(\d+)$/.exec(r.pic))) assert(r.dots === +m[1], 'frame dots: ' + tag);
}
async function longPressGear(page) {
  const g = page.locator('.screen:not(.leaving) .gear-btn').first();
  const box = await g.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(800);
  assert(await page.locator('.gear.holding').count(), 'ring should show while holding');
  await page.waitForTimeout(2500);
  await page.mouse.up();
  await page.waitForSelector('.pin-overlay', { timeout: 3000 });
}
async function typePin(page, pin) { for (const d of pin) await page.locator('.pin-pad ' + sel('data-pin', d)).click(); }
async function openAdmin(page) { await longPressGear(page); await typePin(page, '1994'); await page.waitForSelector('.screen.admin'); }
async function noOverflow(page, what) {
  await page.waitForTimeout(120);
  const m = await page.evaluate(() => {
    const sc = document.querySelector('.screen:not(.leaving)');
    const q = document.querySelector('.qcard');
    return { docW: document.documentElement.scrollWidth, w: innerWidth, scr: sc.scrollHeight - sc.clientHeight, card: q ? q.scrollHeight - q.clientHeight : 0,
      out: [...document.querySelectorAll('.screen:not(.leaving) .qcard *, .screen:not(.leaving) .topbar *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1 || r.bottom > innerHeight + 1); }).length };
  });
  assert(m.docW <= m.w, what + ': horizontal overflow ' + JSON.stringify(m));
  assert(m.scr <= 2 && m.card <= 2 && m.out === 0, what + ': needs scrolling ' + JSON.stringify(m));
}

async function runDevice(browser, base, dev) {
  const shot13 = (page, f) => (dev.tag ? null : page.screenshot({ path: path.join(SHOTS, f) }));
  console.log('\n▶ ' + dev.name);
  const { ctx, page } = await newPage(browser, dev.name);
  const url = base + '?fast=1&nosw=1&seed=e2e';

  await check('menu loads: logo, Ollie, 3 worlds, gear', async () => {
    await page.goto(url);
    await page.waitForSelector('.menu .world-card');
    assert(/Learning Quest/.test(await page.textContent('.logo')), 'logo');
    assert(await page.locator('.menu .owl').count() === 1, 'mascot');
    assert(await page.locator('.world-card').count() === 3, 'worlds');
    assert(await page.locator('.menu .gear-btn').count() === 1, 'gear');
    assert(/Salah/.test(await page.textContent('.menu-bubble')), 'greets Salah');
    const m = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, iw: innerWidth, h: document.querySelector('.menu').scrollHeight, ih: innerHeight }));
    assert(m.w <= m.iw && m.h <= m.ih + 1, 'menu fits ' + JSON.stringify(m));
    await page.waitForTimeout(300);
    await shot13(page, 'menu.png');
    if (dev.tag) await page.screenshot({ path: path.join(SHOTS, 'menu-se.png') });
  });

  await check('math map: winding path, level 1 open, level 2 locked', async () => {
    await page.click('.world-card[data-subject=math]');
    await page.waitForSelector('.map .node[data-level="0"]');
    assert(await page.locator('.node[data-level="0"].current').count() === 1, 'current');
    assert(await page.locator('.node[data-level="1"].locked').count() === 1, 'locked');
    await page.click('.node[data-level="1"]');
    assert(await page.locator('.level-card').count() === 0, 'locked level must not open');
    await page.waitForTimeout(200);
    await shot13(page, 'math-map.png');
  });

  await check('play math level 1 to the win screen through the real UI', async () => {
    await page.click('.node[data-level="0"]');
    await page.click('.level-card .play-btn');
    await page.waitForSelector('.qcard[data-qid]');
    await noOverflow(page, 'math level 1');
    const q = await Q(page);
    assert(q.skill === 'ma-count' && q.type === 'count', 'first question counts objects');
    await picMatches(page, 'math level 1 first question');
    // count two objects then screenshot
    await page.locator('.qcard .obj').first().click();
    await page.locator('.qcard .obj').nth(1).click();
    assert(await page.locator('.qcard .obj.counted').count() === 2, 'tap-to-count');
    await shot13(page, 'math-question.png');
    if (dev.tag) await page.screenshot({ path: path.join(SHOTS, 'math-question-se.png') });
    await playToWin(page);
    const stars = +(await page.getAttribute('.screen.win', 'data-stars'));
    assert(stars === 3, 'all first try → 3 stars, got ' + stars);
    const st = await page.evaluate(() => ({ s: SQ.state.levels.math[0], u: SQ.state.unlocked.math }));
    assert(st.s.passed && st.s.stars === 3 && st.u === 1, 'saved + next unlocked ' + JSON.stringify(st));
    await page.click('.win .map-btn');
    await page.waitForSelector('.node[data-level="1"]:not(.locked)');
    assert(await page.locator('.node[data-level="0"].done').count() === 1, 'level 1 shows done');
  });

  await check('wrong answer → gentle feedback, 2nd wrong → hint; question still completable', async () => {
    await page.goto(base + '?fast=1&nosw=1&seed=wrong&start=math:2');
    await page.waitForSelector('.qcard[data-qid]');
    const w = await answerWrong(page);
    const btn = page.locator('.answers .opt' + sel('data-opt', w));
    assert(await btn.evaluate((b) => b.classList.contains('faded')), 'wrong option fades');
    assert(await page.locator('.owl.is-oops').count() === 1, 'mascot reacts');
    assert(/try/i.test(await page.evaluate(() => SQ.lastSpoken.join(' '))), 'says try again');
    assert(!(await page.locator('.hintbox.on').count()), 'no hint after first wrong');
    await answerWrong(page);
    await page.waitForSelector('.hintbox.on[data-reason=wrong]');
    const q = await answer(page);
    await waitNextQuestion(page, q.id);
    const r = await page.evaluate(() => SQ._play.run.results[0]);
    assert(r.firstTry === false && r.wrongs === 2, 'counted as not first try');
  });

  await check('English and Science questions render', async () => {
    for (const sub of ['english', 'science']) {
      await page.goto(base + '?fast=1&nosw=1&seed=look');
      await page.click('.world-card[data-subject=' + sub + ']');
      await page.click('.node[data-level="0"]');
      await page.click('.level-card .play-btn');
      await page.waitForSelector('.qcard[data-qid]');
      const q = await Q(page);
      assert(q.skill.startsWith(sub === 'english' ? 'en-' : 'sc-'), 'skill');
      assert((await page.textContent('.prompt .ptext')).trim() === q.text, 'prompt shown');
      await noOverflow(page, sub);
      await page.waitForTimeout(150);
      await shot13(page, sub + '-question.png');
    }
  });

  await check('every level\'s first question fits without scrolling', async () => {
    const n = await page.evaluate(() => ({ math: SQ.subjects.math.levels.length, english: SQ.subjects.english.levels.length, science: SQ.subjects.science.levels.length }));
    for (const s of Object.keys(n)) for (let i = 0; i < n[s]; i++) {
      await page.goto(base + `?fast=1&nosw=1&seed=fit${i}&start=${s}:${i}`);
      await page.waitForSelector('.qcard[data-qid]');
      await noOverflow(page, s + ' level ' + (i + 1));
      await picMatches(page, s + ' level ' + (i + 1));
    }
  });

  await check('count questions: number of objects on screen equals the answer (both count levels, 6 seeds, all questions)', async () => {
    for (const lvl of [0, 1]) for (let k = 0; k < 6; k++) {
      await page.goto(base + `?fast=1&nosw=1&seed=cnt${lvl}_${k}&start=math:${lvl}`);
      for (let i = 0; i < 10 && !(await page.locator('.screen.win').count()); i++) {
        await page.waitForSelector('.qcard[data-qid]');
        await picMatches(page, `math ${lvl + 1} seed ${k} q${i + 1}`);
        const q = await answer(page);   // also asserts .obj count === answer for count questions
        await waitNextQuestion(page, q.id);
      }
    }
  });

  await check('no console errors', async () => { assert(!page.errors.length, page.errors.slice(0, 3).join(' | ')); });
  await ctx.close();
}

async function stuckFlow(browser, base, dev) {
  const { ctx, page } = await newPage(browser, dev.name);
  await check('stuck: hint at 1 min, easier same-skill swap at 5 min (fake clock)', async () => {
    await page.clock.install();
    await page.goto(base + '?fast=1&nosw=1&seed=stuck&start=english:9');
    await page.waitForSelector('.qcard[data-qid]');
    const q1 = await Q(page);
    await page.clock.fastForward('00:59');
    assert(!(await page.locator('.hintbox.on').count()), 'no hint before 60 s');
    await page.clock.fastForward('00:02');
    await page.waitForSelector('.hintbox.on[data-reason=timer]');
    assert((await page.textContent('.hintbox .htext')).trim() === q1.hint, 'hint text');
    assert(await page.locator('.owl.is-think').count() === 1, 'Ollie thinks');
    if (!dev.tag) await page.screenshot({ path: path.join(SHOTS, 'hint.png') });
    await page.clock.fastForward('03:58');
    assert((await Q(page)).id === q1.id, 'no swap before 300 s');
    await page.clock.fastForward('00:03');
    await page.clock.runFor(1000);
    await page.waitForFunction((id) => document.querySelector('.qcard').getAttribute('data-qid') !== id, q1.id);
    const q2 = await Q(page);
    assert(q2.skill === q1.skill, 'same skill');
    assert(q2.d <= q1.d, 'easier or equal difficulty: ' + q1.d + ' → ' + q2.d);
    assert(q2._swapped, 'marked swapped');
    assert(/different one/.test(await page.evaluate(() => SQ.spokenLog.join(' '))), 'encouraging line');
    // the new question gets a fresh hint timer
    assert(!(await page.locator('.hintbox.on').count()), 'hint cleared');
    await page.clock.fastForward('01:01');
    await page.waitForSelector('.hintbox.on');
  });
  await check('stuck timers pause while the app is hidden', async () => {
    await page.goto(base + '?fast=1&nosw=1&seed=hide&start=science:3');
    await page.waitForSelector('.qcard[data-qid]');
    await page.clock.fastForward('00:30');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward('10:00');
    assert(!(await page.locator('.hintbox.on').count()), 'no hint while hidden');
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward('00:29');
    assert(!(await page.locator('.hintbox.on').count()), 'not yet');
    await page.clock.fastForward('00:02');
    await page.waitForSelector('.hintbox.on');
  });
  await check('no console errors (clock run)', async () => { assert(!page.errors.length, page.errors.slice(0, 3).join(' | ')); });
  await ctx.close();
}

async function adminFlow(browser, base, dev) {
  const shot13 = (page, f) => (dev.tag ? null : page.screenshot({ path: path.join(SHOTS, f) }));
  const { ctx, page } = await newPage(browser, dev.name);
  const url = base + '?fast=1&nosw=1&seed=adm';
  await page.goto(url);
  await page.waitForSelector('.menu');

  await check('gear tap opens kid settings (volumes only)', async () => {
    await page.click('.menu .gear-btn');
    await page.waitForSelector('.kid-settings');
    assert(await page.locator('.kid-settings input[type=range]').count() === 2, 'two sliders');
    await page.click('.kid-settings .btn');
    assert(!(await page.locator('.kid-settings').count()), 'closed');
  });

  await check('long-press gear 3 s → PIN pad; wrong PIN rejected', async () => {
    await longPressGear(page);
    await shot13(page, 'admin-pin.png');
    await typePin(page, '0000');
    await page.waitForTimeout(100);
    assert(/Wrong PIN/.test(await page.textContent('.pin-msg')), 'message');
    assert(!(await page.locator('.screen.admin').count()), 'not admitted');
    await page.click('.pin-overlay .cancel-btn');
  });

  await check('short hold does not open the PIN pad', async () => {
    const g = await page.locator('.menu .gear-btn').boundingBox();
    await page.mouse.move(g.x + 20, g.y + 20); await page.mouse.down(); await page.waitForTimeout(1200); await page.mouse.up();
    await page.waitForTimeout(2200);
    assert(!(await page.locator('.pin-overlay').count()), 'no PIN pad');
    if (await page.locator('.kid-settings').count()) await page.click('.kid-settings .btn');
  });

  await check('PIN 1994 → admin panel', async () => {
    await longPressGear(page);
    await typePin(page, '1994');
    await page.waitForSelector('.screen.admin[data-tab=levels]');
    assert(await page.locator('.admin-tabs button').count() === 5, '5 tabs');
    await noOverflow(page, 'admin');
    await shot13(page, 'admin-panel.png');
  });

  await check('unlock a level via admin and play it', async () => {
    await page.click('.a-level[data-level="4"] .unlock-level');
    assert(await page.evaluate(() => SQ.state.unlocked.math) === 4, 'unlocked');
    await page.click('.admin-close');
    await page.click('.world-card[data-subject=math]');
    await page.waitForSelector('.node[data-level="4"]:not(.locked)');
    await page.click('.node[data-level="4"]');
    await page.click('.level-card .play-btn');
    await page.waitForSelector('.qcard[data-qid]');
    assert((await Q(page)).skill === 'ma-shapes2d', 'playing level 5');
    await playToWin(page);
  });

  await check('approve a level as passed + set stars', async () => {
    await page.goto(url);
    await openAdmin(page);
    await page.click('.seg-english');
    await page.click('.a-level[data-level="0"] .approve-level');
    let st = await page.evaluate(() => ({ l: SQ.state.levels.english[0], u: SQ.state.unlocked.english }));
    assert(st.l.passed && st.l.stars === 1 && st.u === 1, 'approved ' + JSON.stringify(st));
    await page.click('.a-level[data-level="0"] .star-3');
    st = await page.evaluate(() => SQ.state.levels.english[0].stars);
    assert(st === 3, 'stars set');
    await page.click('.admin-close');
    await page.click('.world-card[data-subject=english]');
    await page.waitForSelector('.node[data-level="0"].done');
    assert(await page.locator('.node[data-level="1"]:not(.locked)').count() === 1, 'next open');
  });

  await check('edit a question and see it in play', async () => {
    await page.goto(base + '?fast=1&nosw=1&seed=edit&start=english:2');
    await page.waitForSelector('.qcard[data-qid]');
    const q = await Q(page);
    await page.goto(url);
    await openAdmin(page);
    await page.click('.tab-questions');
    await page.click('.seg-english');
    await page.selectOption('.level-select', '2');
    await page.click(`.a-q${sel('data-qid', q.id)} .edit-q`);
    await page.fill('.q-editor .f-text', 'Salah, which letter starts it?');
    await shot13(page, 'level-editor.png');
    await page.click('.q-editor .save-q');
    await page.waitForSelector(`.a-q${sel('data-qid', q.id)}`);
    assert(/Salah, which letter/.test(await page.textContent(`.a-q${sel('data-qid', q.id)} .qt`)), 'list shows edit');
    await page.goto(base + '?fast=1&nosw=1&seed=edit&start=english:2');
    await page.waitForSelector('.qcard[data-qid]');
    assert((await page.textContent('.prompt .ptext')).trim() === 'Salah, which letter starts it?', 'edited text in play');
  });

  await check('add a custom question and disable a question', async () => {
    await page.goto(url);
    await openAdmin(page);
    await page.click('.tab-questions');
    await page.click('.seg-science');
    await page.selectOption('.level-select', '0');
    await page.click('.add-q');
    await page.fill('.q-editor .f-text', 'Where does a penguin live?');
    await page.fill('.q-editor .f-pic', '🐧');
    await page.fill('.q-editor .f-opt-0', '🧊 Ice');
    await page.fill('.q-editor .f-opt-1', '🏜️ Desert');
    await page.fill('.q-editor .f-opt-2', '🌳 Forest');
    await page.click('.q-editor .save-q');
    await page.waitForSelector('.a-q .a-tag.cu');
    const first = await page.getAttribute('.a-q:not(:has(.cu))', 'data-qid');
    await page.click(`.a-q${sel('data-qid', first)} .toggle-q`);
    assert(await page.evaluate((id) => !!SQ.state.disabled[id], first), 'disabled');
    await page.goto(base + '?fast=1&nosw=1&seed=cu&start=science:0');
    let seen = false;
    for (let i = 0; i < 8 && !(await page.locator('.screen.win').count()); i++) {
      await page.waitForSelector('.qcard[data-qid]');
      const q = await Q(page);
      if (q.text === 'Where does a penguin live?') seen = true;
      assert(q.id !== first, 'disabled question shown');
      await answer(page);
      await waitNextQuestion(page, q.id);
    }
    assert(seen, 'custom question appeared in play');
  });

  await check('change hint delay (Settings) → used by the stuck timer', async () => {
    await page.goto(url);
    await openAdmin(page);
    await page.click('.tab-settings');
    await page.click('.set-hint .dec');
    await page.click('.set-hint .dec');
    assert(/30 s/.test(await page.textContent('.set-hint .val')), 'shows 30 s');
    assert(await page.evaluate(() => SQ.state.settings.hintDelay) === 30, 'saved');
    await page.click('.set-swap .dec');
    const sw = await page.evaluate(() => SQ.state.settings.swapDelay);
    await page.click('.admin-close');
    await page.goto(base + '?fast=1&nosw=1&start=math:0');
    await page.waitForSelector('.qcard[data-qid]');
    const t = await page.evaluate(() => ({ h: SQ._play.timer.hintDelay, s: SQ._play.timer.swapDelay }));
    assert(t.h === 30000 && t.s === sw * 1000, 'timer uses settings ' + JSON.stringify(t));
  });

  await check('progress report shows skills, accuracy and sessions', async () => {
    await page.goto(url);
    await openAdmin(page);
    await page.click('.tab-report');
    await page.waitForSelector('.report-math .a-table');
    assert(/Counting objects/.test(await page.textContent('.report-math')), 'skill row');
    assert(/%/.test(await page.textContent('.report-math')), 'accuracy');
    await shot13(page, 'progress-report.png');
  });

  let code = '';
  await check('export code → clear storage → import → progress restored', async () => {
    const before = await page.evaluate(() => ({ t: SQ.save.totals(SQ.state), hint: SQ.state.settings.hintDelay, cu: Object.keys(SQ.state.custom).length }));
    await page.click('.tab-transfer');
    await page.waitForFunction(() => /^SQ1-/.test(document.querySelector('.export-code').value));
    code = await page.inputValue('.export-code');
    assert(/Salah — \d+ levels?, \d+ stars?/.test(await page.textContent('.export-info')), 'preview line');
    await shot13(page, 'transfer.png');
    await page.evaluate(() => localStorage.clear());
    await page.goto(url);
    await page.waitForSelector('.menu');
    assert((await page.evaluate(() => SQ.save.totals(SQ.state).stars)) === 0, 'cleared');
    await openAdmin(page);
    await page.click('.tab-transfer');
    await page.fill('.import-code', 'SQ1-D-12345678-garbage');
    await page.click('.check-code');
    await page.waitForSelector('.import-error');
    await page.fill('.import-code', code);
    await page.click('.check-code');
    await page.waitForSelector('.import-preview');
    const pv = await page.textContent('.import-preview');
    assert(pv.includes(before.t.levels + ' level') && pv.includes(before.t.stars + ' star'), 'preview ' + pv);
    await page.click('.apply-import');
    await page.click('.confirm-yes');
    await page.waitForSelector('.import-done');
    await page.goto(url);
    await page.waitForSelector('.menu');
    const after = await page.evaluate(() => ({ t: SQ.save.totals(SQ.state), hint: SQ.state.settings.hintDelay, cu: Object.keys(SQ.state.custom).length }));
    assert(JSON.stringify(after) === JSON.stringify(before), 'restored ' + JSON.stringify(after) + ' vs ' + JSON.stringify(before));
  });

  await check('forgot PIN → adult math gate → admin → new PIN works', async () => {
    await longPressGear(page);
    await page.click('.forgot-btn');
    await page.waitForSelector('.gate-card');
    await page.fill('.gate-input', '1');
    await page.click('.gate-ok');
    assert(/new one/.test(await page.textContent('.gate-card .pin-msg')), 'wrong gate answer rejected');
    const qtext = await page.textContent('.gate-q');
    const m = /(\d+) × (\d+)/.exec(qtext);
    await page.fill('.gate-input', String(m[1] * m[2]));
    await page.click('.gate-ok');
    await page.waitForSelector('.screen.admin[data-tab=settings] .admin-notice');
    await page.fill('.new-pin', '4321');
    await page.click('.save-pin');
    assert(/changed/.test(await page.textContent('.pin-result')), 'pin changed');
    await page.click('.admin-close');
    await longPressGear(page);
    await typePin(page, '1994');
    await page.waitForTimeout(100);
    assert(!(await page.locator('.screen.admin').count()), 'old PIN rejected');
    await typePin(page, '4321');
    await page.waitForSelector('.screen.admin');
  });

  await check('reset all progress (with confirm)', async () => {
    await page.click('.tab-levels');
    await page.click('.reset-all');
    await page.click('.confirm-no');
    assert((await page.evaluate(() => SQ.save.totals(SQ.state).stars)) > 0, 'cancel keeps progress');
    await page.click('.reset-all');
    await page.click('.confirm-yes');
    assert((await page.evaluate(() => SQ.save.totals(SQ.state).stars)) === 0, 'reset');
    assert((await page.evaluate(() => SQ.state.settings.pin)) === '4321', 'settings kept');
  });

  await check('no console errors (admin run)', async () => { assert(!page.errors.length, page.errors.slice(0, 3).join(' | ')); });
  await ctx.close();
}

async function offlineFlow(browser, base, dev) {
  const { ctx, page } = await newPage(browser, dev.name, { sw: true });
  await check('service worker precaches; offline reload works', async () => {
    await page.goto(base + '?fast=1');
    await page.waitForSelector('.menu');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    const keys = await page.evaluate(() => caches.keys());
    assert(keys.includes('learn-v2') && keys.every((k) => k.startsWith('learn-')), 'cache ' + keys);
    await ctx.setOffline(true);
    await page.reload();
    await page.waitForSelector('.menu .world-card');
    await page.click('.world-card[data-subject=science]');
    await page.click('.node[data-level="0"]');
    await page.click('.level-card .play-btn');
    await page.waitForSelector('.qcard[data-qid]');
    await ctx.setOffline(false);
  });
  await check('no console errors (offline run)', async () => { assert(!page.errors.length, page.errors.slice(0, 3).join(' | ')); });
  await ctx.close();
}

async function winShot(browser, base) {
  // Full-speed animations for the win screenshot (iPhone 13).
  const { ctx, page } = await newPage(browser, 'iPhone 13');
  await check('win screen with stars + confetti (screenshot)', async () => {
    await page.goto(base + '?nosw=1&seed=win&start=math:1');
    await page.evaluate(() => { SQ.voiceOn = false; });
    await playToWin(page, 10);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: path.join(SHOTS, 'win.png') });
    assert(await page.locator('.wstar.on').count() === 3, 'three stars flew in');
  });
  await check('pre-generated voice clips load and play (WebAudio)', async () => {
    const r = await page.evaluate(async () => {
      await SQ.voice.ready();
      const line = SQ.LINES.greet[0];
      return { has: SQ.voice.has(line), dur: await SQ.voice.play(line).catch((e) => -1), missing: SQ.voice.has('A line with no clip at all') };
    });
    assert(r.has && r.dur > 0.5 && !r.missing, JSON.stringify(r));
  });
  await ctx.close();
}

(async () => {
  const { server, url } = await start(0);
  const browser = await pw.chromium.launch();
  try {
    for (const dev of DEVICES) {
      await runDevice(browser, url, dev);
      await stuckFlow(browser, url, dev);
      await adminFlow(browser, url, dev);
      await offlineFlow(browser, url, dev);
    }
    await winShot(browser, url);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll e2e checks passed');
  process.exit(failures ? 1 : 0);
})();
