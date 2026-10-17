# World module contract (internal dev notes)

Each world (bridges, machines, circuits, robot) is made of 5 files. The Robot Coder world is the
reference implementation — read it first:

| File | Purpose | Loaded by |
|---|---|---|
| `js/logic/<world>.js` | Pure game logic (solver/simulation/scoring). UMD: `module.exports` in Node, `LE.logic.<world>` in browser. **No DOM.** | browser + Node tests |
| `js/data/<world>-levels.js` | Level array. UMD: `module.exports = { levels }` in Node, `LE.levels.<world> = levels` in browser. | browser + Node tests |
| `js/data/<world>-content.js` | `{ tips, facts }`. UMD: `LE.content.<world>`. | browser + Node tests |
| `js/views/<world>-view.js` | Browser UI: `LE.views.<world> = { create(host, level, ctx) }` | browser |
| `css/<world>.css` | World styles. Prefix classes (`br-`, `mc-`, `ci-`). | browser |
| `test/<world>.test.js` | `node:test` tests (run by `npm test` = `node --test test/`). | Node |

UMD template (copy exactly, change names):

```js
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.bridges = mod; }
})(typeof self !== 'undefined' ? self : this, function () { 'use strict'; /* ... */ return { ... }; });
```

## Level object (common fields)

```js
{
  id: 'b1', name: 'First Beam',            // short names (map labels), <= 16 chars
  goal: 'Help the car cross the gap!',     // buddy's goal sentence (7-year-old reading level, short)
  tip: 'beam',                             // optional: id in content.tips — tip card shown first time
  hint: 'Connect the two bolts with one beam.', // shown after 2 failed tries
  tutorial: [ ... ],                       // first 2-3 levels of each world: fully guided (see below)
  solution: ...,                           // stored 3-star solution (world-specific format)
  // plus world-specific fields (grid, parts, par/budget for stars...)
}
```

### Tutorial steps

```js
{ say: 'Drag a beam from bolt to bolt!', drag: ['node:0,3', 'node:1,3'], wait: 'place' }
{ say: 'Tap Go!', point: 'go', wait: 'run' }
{ say: 'See the triangle?', point: 'cell:2,1', ok: true }   // no wait: buddy shows an OK button
```
- `drag: [fromKey, toKey]` → animated hand drags in a loop until the event; `point: key` → hand taps in a loop.
- `wait: eventName` (+ optional `times: n`) → step completes when the view calls `ctx.emit(eventName)` n times.
- Keys are resolved by `instance.target(key)` (must return a DOMRect-like `{left, top, width, height}` in client coords).

## View instance API

`LE.views.<world>.create(host, level, ctx)` builds UI inside `host` (a flex column filling the area below the
buddy bar; ≈ 375×600 on iPhone 13, ≈ 360×470 on iPhone SE — **must fit without scrolling**, all touch targets ≥ 48px)
and returns:

```js
{
  target(key) -> DOMRect|null,   // for the pointing hand: 'go', 'tray:<part>', 'cell:x,y', 'node:x,y' ... (your choice)
  ghost(key) -> html|null,       // optional: html shown under the hand while dragging from key
  showMe() -> steps,             // "Show me": [{ from: key, to?: key, say?: text, apply(), pause?: ms }]
                                 //   from+to => hand drags; from only => hand taps. apply() must perform the
                                 //   action through the SAME code path as the real UI (so state/save/events stay right).
                                 //   Steps should clear the board first if needed, then build the stored solution.
                                 //   Do NOT press Go in showMe — afterwards the app tells the kid to tap Go (target 'go').
  goKey: 'go',                   // optional, key of the Go/Play button (default 'go')
  noGo: false,                   // set true if the world has no Go button (wins live)
  get busy(),                    // true while a simulation animation is running
  stop(),                        // stop a running animation (optional)
  reset(),                       // clear to the level's initial state
  destroy()                      // remove listeners, cancel rAF
}
```

## ctx (provided by the app)

```js
ctx.sfx(name)          // 'tap','click','place','pop','remove','whoosh','step','turn','bump','gear','buzz','oops','success',
                       // 'star','cheer','car','honk','creak','snap','break','splash','spark','zap','motor','roll','bounce',
                       // 'clank','ding','rotate','open','close'
ctx.say(text, opts)    // buddy speech bubble
ctx.emit(event, data)  // tutorial/analytics events — MUST emit 'run' when Go is pressed; also e.g. 'place','remove','rotate'
ctx.savedState         // previously saved in-progress state (or null) → restore it on create
ctx.saveState(state)   // call on every change (JSON-serializable) — resume after app restart
ctx.win({ stars, note })   // call after the success animation; stars 1..3; optional note (how to get more stars)
ctx.fail({ message })      // call after a failed attempt animation; message = short encouraging sentence
ctx.fx.burst(x,y,opts) / ctx.fx.sparkle(x,y,color) / ctx.fx.burstAt(el,opts) / ctx.fx.confetti()
ctx.isDemo()           // true while "Show me" runs (ignore user input then)
ctx.fast               // true in e2e tests (?fast=1) — LE.tween / LE.wait already speed up automatically
```

Global helpers (js/core/ui.js): `LE.h(sel, attrs, ...kids)`, `LE.button(cls, html, onTap, opts)` (`.btn` + `green|orange|red|purple|yellow|white|small|big|huge|icon`),
`LE.tween(ms, fn(t), ease) → Promise`, `LE.wait(ms)`, `LE.ease.{linear,inOut,out,in,back}`, `LE.fitCanvas(canvas, w, h) → {ctx,w,h,dpr}`,
`LE.rr(ctx,x,y,w,h,r)` rounded-rect path, `LE.bounce(el)`, `LE.shake(el)`, `LE.speed`, `LE.FAST`, `LE.gearPath(...)` (SVG gear).

## Content

```js
tips: { beam: { title: 'Beams', text: '1–2 short sentences.', pic: '<svg viewBox="0 0 200 120">…</svg>' } }
facts: [ '…', … ]   // >= 15 "Did you know?" facts, one short sentence each, true and kid-friendly
```
Tip pictures sit on a blue rounded panel. Use bright cartoon colours with dark outlines.
