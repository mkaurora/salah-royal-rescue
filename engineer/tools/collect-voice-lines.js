/* Collects EVERY line the buddy can speak → audio/voice/lines.json ([{ id, text }], normalized, sorted, unique)
 * and audio/voice/groups.json ({ common: [ids], '<world>:<index>': [ids], practice: [ids] }) used for prefetching
 * and service-worker precaching.
 *
 * 1. Static extraction: level data + content modules (goals, hints, tutorial steps, tips, facts, practice
 *    challenges), the shell's VOICE-LINES block in js/core/app.js, and spoken string literals in js/views/*.js.
 * 2. Runtime capture (Playwright, iPhone 13, ?fast=1): hooks LE.speak and drives the menu, settings, every world
 *    map, every level (tip card, guided tutorial, Show me → Go → win screen + fact, failing attempts) and the
 *    Practice Room challenges, recording every text passed.
 *
 * Usage: node tools/collect-voice-lines.js [--static | --merge]
 *   --static skips the browser run; --merge = static lines added to the existing lines.json / groups.json
 *   (quick update while developing; run the full collection before generating clips). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const VK = require('../js/core/voice-key.js');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'audio', 'voice');
const WORLDS = ['bridges', 'machines', 'circuits', 'robot', 'construction'];

/* ---------- static ---------- */
function shellLines() {
  const src = fs.readFileSync(path.join(ROOT, 'js/core/app.js'), 'utf8');
  const m = /\/\* VOICE-LINES:START \*\/\s*var LINES = ([\s\S]*?);\s*\/\* VOICE-LINES:END \*\//.exec(src);
  if (!m) throw new Error('VOICE-LINES block not found in app.js');
  const LINES = vm.runInNewContext('(' + m[1] + ')');
  const out = [];
  (function walk(v) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k]));
  })(LINES);
  return { LINES, lines: out.filter((t) => t !== LINES.didYouKnow) };
}

function worldData(w) {
  const levels = require(path.join(ROOT, 'js/data', w + '-levels.js')).levels || [];
  const content = require(path.join(ROOT, 'js/data', w + '-content.js'));
  return { levels, content };
}

/** Per-level static lines (goal, hint, tutorial says, tip card, the win fact). */
function levelLines(w, level, index, content, LINES) {
  const out = [level.goal, level.hint];
  (level.tutorial || []).forEach((s) => { if (s.say) out.push(s.say); });
  const tip = level.tip && content.tips && content.tips[level.tip];
  if (tip) out.push(VK.tipLine(tip.title, tip.text));
  const facts = content.facts || [];
  if (facts.length) out.push(LINES.didYouKnow + facts[index % facts.length]);
  return out.filter(Boolean);
}

/** String literals the views speak: say: '…', ctx.say('…'), message: '…', intro: '…' (incl. ternaries). */
function viewLiterals() {
  const out = [];
  const dir = path.join(ROOT, 'js/views');
  fs.readdirSync(dir).filter((f) => f.endsWith('.js')).forEach((f) => {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    src.split('\n').forEach((line) => {
      if (!/\b(say|message|intro)\b/.test(line)) return;
      const re = /(['"])((?:\\.|(?!\1).)*)\1/g;
      let m;
      while ((m = re.exec(line))) {
        const before = line.slice(Math.max(0, m.index - 14), m.index);
        if (/(label|cls|okLabel|class|data-\w+)\s*:\s*$/.test(before) || /===?\s*$/.test(before)) continue;
        const text = m[2].replace(/\\(['"\\])/g, '$1');
        // spoken sentences: start with a capital letter (or digit), contain a space or end like a sentence
        if (text !== text.trim()) continue;   // fragment of a composed line (enumerated in dynamicLines)
        if (!/^[A-Z0-9]/.test(text) || !/[a-z]/.test(text)) continue;
        if (!/\s/.test(text) && !/[.!?]$/.test(text)) continue;
        if (/\.(js|css|png|mp3|json)$/.test(text)) continue;
        out.push({ file: f, text });
      }
    });
  });
  return out;
}

/** Dynamic-but-finite lines composed in views: every variant enumerated here. */
function dynamicLines() {
  const out = [];
  const robotView = fs.readFileSync(path.join(ROOT, 'js/views/robot-view.js'), 'utf8');
  if (/'Repeat ' \+ b\.n \+ ' times!'/.test(robotView)) for (let n = 2; n <= 9; n++) out.push('Repeat ' + n + ' times!');
  return out;
}

/** Weekly projects (v3): hub lines per project + per step (story, goal, hint, tutorial, tip, win fact). */
function weeklyStatic(LINES) {
  const W = require(path.join(ROOT, 'js/logic/weekly.js'));
  const { projects } = require(path.join(ROOT, 'js/data/weekly-projects.js'));
  const levelsByWorld = {}, contentByWorld = {};
  WORLDS.forEach((w) => { const d = worldData(w); levelsByWorld[w] = d.levels; contentByWorld[w] = d.content; });
  const out = [];
  projects.forEach((p) => {
    out.push({ group: 'weekly:' + p.id, lines: [p.intro, p.done, LINES.weeklyLocked, LINES.weeklyStepLocked] });
    p.steps.forEach((s, k) => {
      const lv = W.resolveStep(p, k, levelsByWorld);
      const lines = weeklyStepLines(p, s, k, lv, contentByWorld[s.world], LINES);
      out.push({ group: 'weekly:' + p.id + ':' + k, lines });
    });
  });
  return out;
}
/** Same lines (and fact index) as openWeeklyStep in js/core/app.js. */
function weeklyStepLines(p, s, k, lv, content, LINES) {
  const out = [s.say, lv.goal, lv.hint];
  (lv.tutorial || []).forEach((t) => { if (t.say) out.push(t.say); });
  const tip = lv.tip && content.tips && content.tips[lv.tip];
  if (tip) out.push(VK.tipLine(tip.title, tip.text));
  const facts = content.facts || [];
  if (facts.length) out.push(LINES.didYouKnow + facts[(p.weekIndex * 7 + k * 3) % facts.length]);
  return out.filter(Boolean);
}

/** Car Builder & Race: every spoken line lives in js/data/cars-content.js. */
function carsLines() {
  const CC = require(path.join(ROOT, 'js/data/cars-content.js'));
  const out = [];
  (function walk(v) {
    if (typeof v === 'string') out.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.keys(v).forEach((k) => walk(v[k]));
  })([CC.LINES, CC.TIPS]);
  CC.tracks.forEach((t) => out.push(t.intro));
  return out;
}

/** Level 2 (v4): per stage (goal, hint, tutorial, tip card, the win fact — same fact index as level2-hub.js), easy/bonus
 *  goals + hints, quiz questions + "why" lines, lesson cards. Groups: 'l2:<stageId>', 'l2:lesson:<topic>', 'l2:hub'. */
function level2Static(LINES) {
  const D = require(path.join(ROOT, 'js/data/level2-stages.js'));
  const out = [];
  D.tracks.forEach((t) => {
    t.stages.forEach((st, i) => {
      const lines = [];
      [st, st.easy, st.bonus].filter(Boolean).forEach((v) => {
        lines.push(v.goal, v.hint);
        (v.tutorial || []).forEach((x) => { if (x.say) lines.push(x.say); });
        (v.questions || []).forEach((q) => lines.push(q.q, q.why));
      });
      const tip = st.tip && D.tips[st.tip];
      if (tip) lines.push(VK.tipLine(tip.title, tip.text));
      const facts = D.facts[t.id] || [];
      if (facts.length) lines.push(LINES.didYouKnow + facts[i % facts.length]);
      out.push({ group: 'l2:' + st.id, lines: lines.filter(Boolean) });
    });
    (D.facts[t.id] || []).forEach((f) => out.push({ group: null, lines: [LINES.didYouKnow + f] }));
  });
  Object.keys(D.tips).forEach((k) => out.push({ group: null, lines: [VK.tipLine(D.tips[k].title, D.tips[k].text)] }));
  Object.keys(D.lessons).forEach((k) => out.push({ group: 'l2:lesson:' + k, lines: D.lessons[k].cards.map((c) => c.text) }));
  out.push({ group: 'l2:hub', lines: Object.values(LINES.l2) });
  return out;
}

function staticCollect() {
  const { LINES, lines: shell } = shellLines();
  const groups = { common: new Set(), practice: new Set() };
  const all = new Set();
  const add = (g, t) => { const n = VK.normalize(t); if (!n) return; all.add(n); if (g) g.add(n); };
  shell.forEach((t) => add(groups.common, t));
  WORLDS.forEach((w) => {
    const { levels, content } = worldData(w);
    levels.forEach((lv, i) => {
      const g = groups[w + ':' + i] = new Set();
      levelLines(w, lv, i, content, LINES).forEach((t) => add(g, t));
    });
    Object.values(content.tips || {}).forEach((t) => add(null, VK.tipLine(t.title, t.text)));
    (content.facts || []).forEach((f) => add(null, LINES.didYouKnow + f));
  });
  const robot = require(path.join(ROOT, 'js/data/robot-levels.js'));
  (robot.practice || []).forEach((c) => add(groups.practice, c.goal));   // old Practice Room (data kept; room replaced by the Car Builder)
  groups.cars = new Set();
  carsLines().forEach((t) => add(groups.cars, t));
  weeklyStatic(LINES).forEach(({ group, lines }) => {
    const g = groups[group] = groups[group] || new Set();
    lines.forEach((t) => add(g, t));
  });
  level2Static(LINES).forEach(({ group, lines }) => {
    const g = group ? (groups[group] = groups[group] || new Set()) : null;
    lines.forEach((t) => add(g, t));
  });
  viewLiterals().forEach((v) => add(null, v.text));
  dynamicLines().forEach((t) => add(null, t));
  return { all, groups, LINES };
}

/* ---------- runtime capture ---------- */
async function runtimeCollect() {
  const { start } = require('../e2e/server.js');
  const pw = require('playwright');
  const browser = await pw.chromium.launch();
  const { server, url } = await start(0);
  const captured = {};          // group -> Set of raw texts
  const errors = [];
  const note = (g, list) => { captured[g] = captured[g] || new Set(); list.forEach((t) => captured[g].add(t)); };

  async function newPage() {
    const context = await browser.newContext({ ...pw.devices['iPhone 13'] });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      window.__spoken = [];
      const hook = () => {
        if (!window.LE || !LE.speak || LE.speak.__hooked) return;
        const orig = LE.speak;
        LE.speak = function (t) { (Array.isArray(t) ? t : [t]).forEach((x) => window.__spoken.push(String(x))); return orig.apply(this, arguments); };
        LE.speak.__hooked = true;
      };
      document.addEventListener('DOMContentLoaded', hook);
      window.addEventListener('load', hook);
    });
    await page.goto(url + '?fast=1&menu=1&nosw=1');
    await page.waitForSelector('.menu-screen');
    await page.evaluate(() => { if (!LE.speak.__hooked) { const o = LE.speak; LE.speak = function (t) { (Array.isArray(t) ? t : [t]).forEach((x) => window.__spoken.push(String(x))); return o.apply(this, arguments); }; LE.speak.__hooked = true; } });
    return page;
  }
  const take = (page) => page.evaluate(() => window.__spoken.splice(0));

  // DOM clicks (the buddy bubble may overlap buttons; we only need the code paths to run).
  async function clickIf(page, sel) {
    return page.evaluate((s) => { const el = [...document.querySelectorAll(s)].find((e) => e.offsetParent !== null) || document.querySelector(s); if (!el) return false; el.click(); return true; }, sel);
  }

  // Menu, settings
  {
    const page = await newPage();
    for (let i = 0; i < 25; i++) await clickIf(page, '.menu-buddy');
    await clickIf(page, '.settings-btn');
    await clickIf(page, '.overlay.settings .btn.purple');   // read aloud off
    await clickIf(page, '.overlay.settings .btn.purple');   // on → "Hi Salah!"
    await page.evaluate(() => LE.closeOverlay());
    for (const w of WORLDS) { await page.evaluate((id) => LE.app.showMap(id), w); await page.waitForTimeout(100); }
    note('common', await take(page));
    // Car Builder & Race: garage, build tabs, Show me, a race and its results.
    await page.evaluate(() => LE.app.showCars());
    await page.waitForSelector('.cg-car');
    await clickIf(page, '.cg-car');
    await page.waitForSelector('.cb-tab');
    for (const sl of ['body', 'wheels', 'engine', 'spoiler', 'color', 'sticker']) await clickIf(page, `.cb-tab[data-slot="${sl}"]`);
    await page.evaluate(() => LE.activeCars.showMe());
    await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 30000 });
    await page.evaluate(() => LE.cars.showRace(LE.app.store.getCurrentCar(), 'sunny'));
    await page.waitForSelector('.race-results', { timeout: 60000 });
    note('cars', await take(page));
    await page.context().close();
  }

  // Every level of every world, one page per world in parallel.
  await Promise.all(WORLDS.map(async (w) => {
    const page = await newPage();
    const n = await page.evaluate((id) => (LE.levels[id] || []).length, w);
    for (let i = 0; i < n; i++) {
      const g = w + ':' + i;
      try {
        // fresh level (tutorial runs, tip card shows)
        await page.evaluate(([id, idx]) => {
          const s = LE.app.store;
          s.data.seenTips = {};
          for (let k = 0; k <= idx + 1; k++) { s.data.stars[id] = s.data.stars[id] || []; s.data.stars[id][k] = 0; }
          for (let k = 0; k < idx; k++) s.setStars(id, k, 1);
          s.clearInProgress(id, idx);
          LE.app.openLevel(id, idx);
        }, [w, i]);
        await page.waitForSelector('.level-screen .play-host');
        await page.waitForTimeout(300);
        await clickIf(page, '.overlay.tip .btn');
        await page.waitForTimeout(200);
        // walk the guided tutorial: OK buttons + the events each step waits for
        const tut = await page.evaluate(() => (LE.activeLevel && LE.world(LE.activeLevel.world).levels[LE.activeLevel.index].tutorial) || null);
        if (tut) {
          await clickIf(page, '.bubble.show .btn');      // "Let's go!"
          for (const s of tut) {
            await page.waitForTimeout(150);
            if (s.wait) await page.evaluate(([ev, times]) => { for (let k = 0; k < times; k++) LE.activeLevel.ctx.emit(ev); }, [s.wait, s.times || 1]);
            else await clickIf(page, '.bubble.show .btn');
          }
          await page.waitForTimeout(200);
          await page.evaluate(() => LE.activeLevel.inst.reset && LE.activeLevel.inst.reset());
        }
        // tap the buddy (goal + Show me / Let me try), then fail attempts with an empty board
        await clickIf(page, '.buddy-char');
        const noGo = await page.evaluate(() => !!LE.activeLevel.inst.noGo);
        if (!noGo) {
          for (let k = 0; k < 3; k++) {
            if (await page.locator('.overlay.win').count()) break;
            await clickIf(page, '.go-btn');
            await page.waitForFunction(() => !LE.activeLevel.inst.busy, null, { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(250);
          }
        }
        // resume path ("Welcome back!") — reopen with saved state
        await page.evaluate(() => LE.activeLevel.ctx.saveState && 0);
        // Show me → Go → win → fact
        if (!(await page.locator('.overlay.win').count())) {
          await page.evaluate(([id, idx]) => { LE.app.store.clearInProgress(id, idx); LE.app.openLevel(id, idx, { fresh: true }); }, [w, i]);
          await page.waitForSelector('.level-screen .play-host');
          await page.waitForTimeout(250);
          await clickIf(page, '.overlay.tip .btn');
          await page.evaluate(() => LE.activeLevel.showMe());
          await page.waitForTimeout(200);
          await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 120000 });
          await page.waitForTimeout(200);
          await page.evaluate(() => LE.activeLevel.solve());    // the demo gives no stars: now solve it for the win lines
          await page.waitForTimeout(200);
          const wonLive = await page.waitForSelector('.overlay.win', { timeout: 1200 }).then(() => true, () => false);
          if (!noGo && !wonLive) await clickIf(page, '.go-btn');
          await page.waitForSelector('.overlay.win', { timeout: 60000 });
          await page.waitForTimeout(700);
        }
      } catch (e) {
        errors.push(`${g}: ${String(e.message || e).split('\n')[0]}`);
      }
      note(g, await take(page));
    }
    await page.context().close();
  }));
  // Every weekly project hub + step (fresh, fail attempts, Show me → Go → win).
  {
    const page = await newPage();
    const list = await page.evaluate(() => LE.weeklyProjects.map((p) => ({ id: p.id, n: p.steps.length })));
    for (const p of list) {
      await page.evaluate((pid) => { LE.app.store.setWeeklyUnlockedMax(99); LE.app.showWeeklyHub(pid); }, p.id);
      await page.waitForTimeout(300);
      await clickIf(page, '.weekly-screen .buddy-char');
      note('weekly:' + p.id, await take(page));
      for (let k = 0; k < p.n; k++) {
        const g = 'weekly:' + p.id + ':' + k;
        try {
          await page.evaluate(([pid, k]) => {
            const s = LE.app.store; s.data.seenTips = {};
            const pr = LE.weeklyProjects.find((x) => x.id === pid), ids = pr.steps.map((x) => x.id);
            s.resetProject(pid);
            for (let j = 0; j < k; j++) s.setStepStars(pid, ids[j], 1, ids);
            s.clearInProgress('wk-' + pid, k);
            LE.app.openWeeklyStep(pid, k);
          }, [p.id, k]);
          await page.waitForSelector('.level-screen .play-host');
          await page.waitForTimeout(300);
          await clickIf(page, '.overlay.tip .btn');
          await page.waitForTimeout(200);
          await clickIf(page, '.buddy-char');
          const noGo = await page.evaluate(() => !!LE.activeLevel.inst.noGo);
          if (!noGo) {
            for (let j = 0; j < 3; j++) {
              await clickIf(page, '.go-btn');
              await page.waitForFunction(() => !LE.activeLevel.inst.busy, null, { timeout: 20000 }).catch(() => {});
              await page.waitForTimeout(250);
            }
          }
          await page.evaluate(([pid, k]) => LE.app.openWeeklyStep(pid, k, { fresh: true }), [p.id, k]);
          await page.waitForSelector('.level-screen .play-host');
          await page.waitForTimeout(250);
          await page.evaluate(() => LE.activeLevel.showMe());
          await page.waitForTimeout(200);
          await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 120000 });
          await page.waitForTimeout(200);
          await page.evaluate(() => LE.activeLevel.solve());
          await page.waitForTimeout(200);
          const wonLive = await page.waitForSelector('.overlay.win', { timeout: 1200 }).then(() => true, () => false);
          if (!noGo && !wonLive) await clickIf(page, '.go-btn');
          await page.waitForSelector('.overlay.win', { timeout: 60000 });
          await page.waitForTimeout(700);
        } catch (e) {
          errors.push(`${g}: ${String(e.message || e).split('\n')[0]}`);
        }
        note(g, await take(page));
      }
    }
    await page.context().close();
  }

  // Level 2 (v4): every stage — fresh (tip, tutorial), failing attempts, Show me → win (+ the easy / bonus variants).
  {
    const page = await newPage();
    await page.evaluate(() => { const l = LE.app.store.getLevel2(); LE.logic.level2.unlockAll(l, LE.level2Hub.counts()); LE.app.store.save(); });
    const list = await page.evaluate(() => LE.level2.data.tracks.flatMap((t) => t.stages.map((s, i) => ({ t: t.id, i, id: s.id, easy: !!s.easy, bonus: !!s.bonus, topic: s.topic || null }))));
    for (const s of list) {
      const g = 'l2:' + s.id;
      try {
        if (s.topic) {
          // the lesson plays before the topic's first stage
          await page.evaluate((topic) => { LE.app.store.getLevel2().lessons[topic] = false; }, s.topic);
        }
        await page.evaluate(([t, i]) => { const st = LE.app.store; st.data.seenTips = {}; const l = st.getLevel2(); delete l.stars[LE.level2.data.tracks.find((x) => x.id === t).stages[i].id]; LE.level2Hub.openStage(t, i, { fresh: true }); }, [s.t, s.i]);
        for (let k = 0; k < 6; k++) {
          await page.waitForTimeout(200);
          if (!(await page.locator('.l2-lesson').count())) break;
          // walk the lesson, poke the try-it card
          await page.evaluate(() => { const w = LE.activeLesson && LE.activeLesson.widget(); if (w) { if (w.add) w.add(); if (w.setF) w.setF(-2); if (w.steep) w.steep(true); if (w.toggle) w.toggle(); } });
          await clickIf(page, '.l2-next');
        }
        if (s.topic) note('l2:lesson:' + s.topic, await take(page));
        await page.waitForSelector('.level-screen .play-host');
        await page.waitForTimeout(300);
        await clickIf(page, '.overlay.tip .btn');
        const tut = await page.evaluate(() => LE.activeLevel.level.tutorial || null);
        if (tut) {
          await clickIf(page, '.bubble.show .btn');
          for (const x of tut) {
            await page.waitForTimeout(150);
            if (x.wait) await page.evaluate(([ev, times]) => { for (let k = 0; k < times; k++) LE.activeLevel.ctx.emit(ev); }, [x.wait, x.times || 1]);
            else await clickIf(page, '.bubble.show .btn');
          }
          await page.waitForTimeout(200);
        }
        await clickIf(page, '.buddy-char');
        const noGo = await page.evaluate(() => !!LE.activeLevel.inst.noGo);
        if (!noGo) {
          for (let k = 0; k < 7; k++) {   // empty / start board: fail attempts → hint, Show me, easier offers
            await page.evaluate(() => LE.activeLevel.inst.reset && LE.activeLevel.inst.reset());
            await page.evaluate(() => { const g = LE.activeLevel.inst; if (g.go) g.go(); });
            await page.waitForFunction(() => !LE.activeLevel.inst.busy, null, { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(200);
          }
        } else {
          await page.evaluate(() => { const q = LE.activeLevel.level.questions || []; q.forEach((x) => { const b = document.querySelector('[data-ans="' + (1 - x.right) + '"]'); if (b) b.click(); }); });
        }
        await page.evaluate(([t, i]) => LE.level2Hub.openStage(t, i, { fresh: true, noLesson: true }), [s.t, s.i]);
        await page.waitForSelector('.level-screen .play-host');
        await page.waitForTimeout(250);
        await page.evaluate(() => LE.activeLevel.showMe());
        await page.waitForTimeout(200);
        await page.waitForFunction(() => !document.querySelector('.demo-shield'), null, { timeout: 120000 });
        await page.evaluate(() => LE.activeLevel.solve());
        await page.waitForTimeout(200);
        const wonLive = await page.waitForSelector('.overlay.win', { timeout: 1200 }).then(() => true, () => false);
        if (!noGo && !wonLive) await page.evaluate(() => { const g = LE.activeLevel.inst; if (g.go) g.go(); });
        await page.waitForSelector('.overlay.win', { timeout: 60000 });
        await page.waitForTimeout(700);
        for (const v of ['easy', 'bonus']) {
          if (!s[v]) continue;
          await page.evaluate(([t, i, v]) => LE.level2Hub.openStage(t, i, { fresh: true, variant: v, noLesson: true }), [s.t, s.i, v]);
          await page.waitForSelector('.level-screen .play-host');
          await page.waitForTimeout(300);
          await clickIf(page, '.buddy-char');
          await page.evaluate(() => LE.activeLevel.solve());
          await page.waitForTimeout(200);
          const w2 = await page.waitForSelector('.overlay.win', { timeout: 1200 }).then(() => true, () => false);
          if (!w2) await page.evaluate(() => { const g = LE.activeLevel.inst; if (g.go) g.go(); });
          await page.waitForSelector('.overlay.win', { timeout: 60000 }).catch(() => {});
          await page.waitForTimeout(500);
        }
      } catch (e) {
        errors.push(`${g}: ${String(e.message || e).split('\n')[0]}`);
      }
      note(g, await take(page));
    }
    await page.evaluate(() => LE.level2Hub.show('a'));
    await page.waitForTimeout(300);
    await clickIf(page, '.l2-node.locked');
    note('l2:hub', await take(page));
    await page.context().close();
  }

  await browser.close();
  server.close();
  return { captured, errors };
}

async function main() {
  const merge = process.argv.includes('--merge');
  const staticOnly = merge || process.argv.includes('--static');
  const { all, groups } = staticCollect();
  let errors = [];
  if (merge) {
    const old = JSON.parse(fs.readFileSync(path.join(OUT, 'lines.json'), 'utf8'));
    const oldGroups = JSON.parse(fs.readFileSync(path.join(OUT, 'groups.json'), 'utf8'));
    const byKey = new Map(old.map((l) => [l.id, l.text]));
    old.forEach((l) => all.add(l.text));
    Object.keys(oldGroups).forEach((g) => {
      groups[g] = groups[g] || new Set();
      oldGroups[g].forEach((k) => { if (byKey.has(k)) groups[g].add(byKey.get(k)); });
    });
  }
  if (!staticOnly) {
    const r = await runtimeCollect();
    errors = r.errors;
    Object.keys(r.captured).forEach((g) => {
      groups[g] = groups[g] || new Set();
      r.captured[g].forEach((t) => { const n = VK.normalize(t); if (n) { all.add(n); groups[g].add(n); } });
    });
  }
  // unique by clip key (texts that differ only in case share a clip)
  const byId = new Map();
  [...all].sort((a, b) => a.localeCompare(b)).forEach((t) => { const id = VK.key(t); if (!byId.has(id)) byId.set(id, t); });
  const lines = [...byId.entries()].map(([id, text]) => ({ id, text })).sort((a, b) => a.text.localeCompare(b.text) || a.id.localeCompare(b.id));
  const groupsOut = {};
  Object.keys(groups).sort().forEach((g) => { groupsOut[g] = [...new Set([...groups[g]].map((t) => VK.key(t)))].sort(); });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'lines.json'), JSON.stringify(lines, null, 1) + '\n');
  fs.writeFileSync(path.join(OUT, 'groups.json'), JSON.stringify(groupsOut) + '\n');
  const chars = lines.reduce((a, l) => a + l.text.length, 0);
  console.log(`lines.json: ${lines.length} lines, ${chars} characters${merge ? ' (static merged into the last full run)' : staticOnly ? ' (static only)' : ''}`);
  console.log(`groups.json: ${Object.keys(groupsOut).length} groups`);
  if (errors.length) { console.log('capture problems:\n  ' + errors.join('\n  ')); process.exitCode = 1; }
}

module.exports = { staticCollect, viewLiterals, shellLines, levelLines, dynamicLines, weeklyStatic, weeklyStepLines, level2Static, WORLDS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
