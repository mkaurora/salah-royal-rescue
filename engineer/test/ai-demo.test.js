'use strict';
const test = require('node:test');
const assert = require('node:assert');
const A = require('../js/core/ai-demo.js');
const HT = require('../js/core/helper-talk.js');

test('groupSteps: one move per piece; tool picks, turns, flips and number picks stay with their piece', () => {
  // Bridges: tool lead + drags + trailing tool reset
  let mv = A.groupSteps([{ from: 'tool:steel' }, { from: 'node:0,0', to: 'node:1,0' }, { from: 'node:1,0', to: 'node:2,0' }, { from: 'tool:wood' }]);
  assert.deepStrictEqual(mv.map((m) => m.length), [2, 2]);
  // Machines: place + flip
  mv = A.groupSteps([{ from: 'tray:ramp', to: 'slot:1,2' }, { from: 'tray:ramp', to: 'slot:4,5' }, { from: 'slot:4,5' }]);
  assert.deepStrictEqual(mv.map((m) => m.length), [1, 2]);
  // Circuits: place + two turns; removal is its own move
  mv = A.groupSteps([{ from: 'cell:2,2', to: 'tray' }, { from: 'tray:C', to: 'cell:0,0' }, { from: 'cell:0,0' }, { from: 'cell:0,0' }, { from: 'tray:I', to: 'cell:1,0' }]);
  assert.deepStrictEqual(mv.map((m) => m.length), [1, 3, 1]);
  // Robot: count + pick belong together
  mv = A.groupSteps([{ from: 'tray:rep', to: 'strip' }, { from: 'count:0' }, { from: 'pick:3' }, { from: 'tray:F', to: 'slot:0' }]);
  assert.deepStrictEqual(mv.map((m) => m.length), [1, 2, 1]);
  // Construction: button taps, one each
  mv = A.groupSteps([{ from: 'restart' }, { from: 'btn:R' }, { from: 'btn:R' }, { from: 'tray:found', to: 'slot:found' }]);
  assert.deepStrictEqual(mv.map((m) => m.length), [1, 1, 1, 1]);
  assert.deepStrictEqual(A.groupSteps([]), []);
});

test('labels: friendly names for every world target kind', () => {
  assert.strictEqual(A.label('tray:gearB', 'machines'), 'the Big gear in the tray');
  assert.strictEqual(A.label('tray:C', 'circuits'), 'the Corner in the tray');
  assert.strictEqual(A.label('tray:rep', 'robot'), 'the Repeat in the tray');
  assert.strictEqual(A.label('tray:roof', 'construction'), 'the Roof in the tray');
  assert.strictEqual(A.label('slot:roof', 'construction'), 'the Roof spot');
  assert.strictEqual(A.label('go', 'robot'), 'the Play button');
  assert.strictEqual(A.label('go', 'bridges'), 'the Go button');
  assert.strictEqual(A.label('tool:steel', 'bridges'), 'the Steel tool');
  assert.strictEqual(A.label('node:2,0', 'bridges'), 'the bolt at 2,0');
  assert.strictEqual(A.label('block:1', 'robot'), 'block 2 in the program');
  assert.strictEqual(A.label('btn:U', 'construction'), 'the Up button');
  assert.strictEqual(A.label('cell:1,2', 'circuits'), 'square 1,2');
});

test('describeBoard: each world in words', () => {
  assert.match(A.describeBoard('bridges', { beams: ['0,0-1,0', 's:1,0-2,0'] }), /2 beams: 0,0-1,0 \(wood\); 1,0-2,0 \(steel\)/);
  assert.match(A.describeBoard('machines', { placements: [{ slot: '1,2', part: 'ramp', dir: -1 }] }), /Ramp on spot 1,2 \(flipped\)/);
  assert.match(A.describeBoard('circuits', { state: { placed: [{ t: 'C', x: 0, y: 0, r: 1 }] } }), /Corner at 0,0 turned 1/);
  assert.strictEqual(A.describeBoard('robot', { program: [{ t: 'F' }, { t: 'rep', n: 3, body: [{ t: 'F' }, { t: 'R' }] }] }), 'program: Forward, Repeat 3 times [Forward, Turn right]');
  assert.strictEqual(A.describeBoard('robot', { program: [] }), 'the program is empty');
  assert.match(A.describeBoard('construction', { state: { stage: 1 } }), /stage 2/);
  assert.strictEqual(A.describeBoard('machines', null), 'nothing yet');
});

test('contextText / targetList: numbered steps, target ids with names, Go unless the world has none', () => {
  const moves = A.groupSteps([{ from: 'tray:ramp', to: 'slot:1,2' }, { from: 'tray:wedge', to: 'slot:3,2' }]);
  const t = A.targetList(moves, 'machines', {});
  assert.deepStrictEqual(t, ['tray:ramp', 'slot:1,2', 'tray:wedge', 'slot:3,2', 'go']);
  assert.ok(!A.targetList(moves, 'circuits', { noGo: true }).includes('go'));
  const c = A.contextText({ world: 'machines', board: { placements: [] }, moves, targets: t });
  assert.match(c.steps, /^1\. drag the Ramp in the tray to spot 1,2 2\. drag the Wedge/);
  assert.match(c.targets, /go = the Go button/);
  assert.strictEqual(c.count, 2);
  assert.match(A.contextText({ world: 'robot', moves: [] }).steps, /press the Play button/);
  assert.match(A.contextText({ world: 'circuits', moves: [], noGo: true }).steps, /every piece is in place/);
  assert.match(A.updateText({ world: 'machines', moves, targets: t }), /^BOARD UPDATE\. Board now: nothing yet\. Steps still needed \(2\)/);
  const rm = A.describeMove([{ from: 'block:2', to: 'tray:L' }], 'robot');
  assert.strictEqual(rm, 'take away block 3 in the program');
});

test('helper vars carry the board, next steps and target ids', () => {
  const v = HT.buildVars({ world: 'machines', level: { name: 'X', goal: 'g', hint: 'h' }, board: 'b', steps: '1. s', targets: 'go = Go' });
  assert.strictEqual(v.board, 'b'); assert.strictEqual(v.next_steps, '1. s'); assert.strictEqual(v.targets, 'go = Go');
  const d = HT.buildVars({ world: 'machines', level: {} });
  assert.strictEqual(d.board, 'unknown'); assert.strictEqual(d.targets, 'none');
});

/* ---------- the client tools against a fake view / hand / DOM ---------- */
function fakeDom() {
  const el = (tag) => ({ tag, children: [], style: {}, attrs: {}, className: '', parentNode: null,
    appendChild(c) { c.parentNode = this; this.children.push(c); return c; },
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; },
    setAttribute(k, v) { this.attrs[k] = v; }, set innerHTML(v) { this._html = v; } });
  const body = el('body');
  return { body, createElement: el, createElementNS: (ns, t) => el(t), count: (cls) => { let n = 0; (function walk(e) { e.children.forEach((c) => { if ((c.className || c.attrs.class) === cls) n++; walk(c); }); })(body); return n; } };
}
function fakeWorld() {
  // A tiny machines-like view: solution = 3 parts; showMe({fromCurrent}) = the parts still missing.
  const sol = [['ramp', '1,2'], ['wedge', '3,2'], ['pulley', 'hook']];
  const st = { placed: [] }, applied = [];
  let goPressed = 0, onRes = null;
  const inst = {
    noGo: false,
    target: (k) => (/^(tray|slot):|^go$/.test(k) ? { left: 10, top: 20, width: 40, height: 40 } : null),
    showMe: (o) => { assert.ok(o && o.fromCurrent); return sol.filter((p) => !st.placed.includes(p[0])).map((p) => ({ from: 'tray:' + p[0], to: 'slot:' + p[1], apply: () => { st.placed.push(p[0]); applied.push(p[0]); } })); },
    go: () => { goPressed++; setTimeout(() => onRes && onRes(st.placed.length === 3 ? 'win' : 'fail'), 5); },
    getPlacements: () => st.placed.map((n) => ({ part: n, slot: sol.find((p) => p[0] === n)[1] }))
  };
  const handLog = [];
  const hand = { moveTo: async () => { handLog.push('move'); return true; }, tap: async () => handLog.push('tap'), drag: async () => { handLog.push('drag'); return true; }, hide: () => handLog.push('hide') };
  const doc = fakeDom();
  let solved = false;
  const demo = A.create({ getInst: () => inst, world: 'machines', hand, document: doc, wait: (ms) => (ms >= 1000 ? new Promise((r) => setTimeout(r, 200)) : Promise.resolve()),
    onResult: (fn) => { onRes = (r) => { if (r === 'win') solved = true; fn(r); }; }, solved: () => solved });
  return { demo, inst, st, applied, handLog, doc, gp: () => goPressed };
}

test('tools: highlight / arrow / point draw marks; unknown targets get the id list; clear_marks removes them', async () => {
  const f = fakeWorld();
  assert.match(await f.demo.tools.highlight({ target: 'slot:1,2' }), /^Highlighted spot 1,2/);
  assert.match(await f.demo.tools.draw_arrow({ from: 'tray:ramp', to: 'slot:1,2' }), /^Drew an arrow from the Ramp in the tray to spot 1,2/);
  assert.match(await f.demo.tools.point_at({ target: 'the ramp' }), /^Pointing at the Ramp in the tray/);   // fuzzy name
  assert.match(await f.demo.tools.point_at({ target: 'Go' }), /Pointing at the Go button/);
  assert.match(await f.demo.tools.point_at({ target: 'banana' }), /could not find "banana".*tray:ramp/);
  assert.strictEqual(f.doc.count('ai-ring'), 3);
  assert.strictEqual(f.doc.count('ai-arrow'), 1);
  assert.ok(f.handLog.includes('tap'));
  assert.match(await f.demo.tools.clear_marks({}), /Cleared/);
  assert.strictEqual(f.doc.count('ai-ring') + f.doc.count('ai-arrow'), 0);
  assert.deepStrictEqual(f.applied, [], 'marks never change the board');
});

test('tools: demo_next_step does ONE move from his board and says what is next; demo_all finishes + presses Go', async () => {
  const f = fakeWorld();
  f.st.placed.push('ramp');                         // his own progress
  const r1 = await f.demo.tools.demo_next_step({});
  assert.strictEqual(r1, 'Showed: drag the Wedge in the tray to spot 3,2. Next step: drag the Pulley in the tray to spot hook. 1 step left.');
  assert.deepStrictEqual(f.applied, ['wedge']);
  assert.ok(f.handLog.includes('drag'));
  const ctx = f.demo.vars();
  assert.match(ctx.board, /Ramp on spot 1,2; Wedge on spot 3,2/);
  assert.match(ctx.steps, /^1\. drag the Pulley/);
  const r2 = await f.demo.tools.demo_all({});
  assert.match(r2, /^Showed all 1 steps and pressed the Go button\. It works!/);
  assert.strictEqual(f.gp(), 1);
  assert.match(await f.demo.tools.demo_next_step({}), /already solved/);
  assert.strictEqual(f.demo.log.length, 3);
});

test('tools: calls run one at a time in order; nothing runs after stop()', async () => {
  const f = fakeWorld();
  const p = [f.demo.tools.demo_next_step({}), f.demo.tools.demo_next_step({}), f.demo.tools.highlight({ target: 'go' })];
  const r = await Promise.all(p);
  assert.match(r[0], /Wedge/); assert.match(r[1], /Pulley/); assert.match(r[2], /Highlighted the Go button/);
  assert.deepStrictEqual(f.applied, ['ramp', 'wedge']);
  f.demo.stop();
  assert.strictEqual(await f.demo.tools.demo_next_step({}), 'The call has ended.');
  assert.deepStrictEqual(f.applied, ['ramp', 'wedge']);
});
