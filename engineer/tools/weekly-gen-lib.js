/* Puzzle makers for tools/weekly-gen.js (dev only). Seeded, so the output is reproducible.
 * Construction solutions are found by BFS through js/logic/construction.js (optimal → fair par).
 * Robot mazes are self-avoiding paths through trees/water; the solution follows the path (par = its blocks). */
'use strict';
const C = require('../js/logic/construction.js');
const R = require('../js/logic/robot.js');

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

/** BFS over one stage; returns the shortest action list or null. */
function bfsStage(stage, acts, cap) {
  const one = { stages: [stage] };
  const s0 = C.init(one);
  const key = (s) => JSON.stringify(s.st);
  const seen = new Map([[key(s0), null]]);
  let q = [{ s: s0, path: [] }];
  while (q.length) {
    const nq = [];
    for (const { s, path } of q) {
      for (const a of acts) {
        const r = C.act(one, s, a);
        if (!r.ok) continue;
        const p = path.concat(a);
        if (r.state.won) return p;
        const k = key(r.state);
        if (seen.has(k)) continue;
        seen.set(k, 1);
        if (seen.size > (cap || 400000)) return null;
        nq.push({ s: r.state, path: p });
      }
    }
    q = nq;
  }
  return null;
}

const COLORS = ['Y', 'R', 'B', 'G', 'P', 'S'];
/** Crane: blocks of sizes, scattered over cols; goal = one column, biggest at the bottom. */
function crane(seed, o) {
  const r = rng(seed);
  for (let tries = 0; tries < 4000; tries++) {
    const ncol = o.cols, sizes = o.sizes.slice();
    const colors = COLORS.slice().sort(() => r() - 0.5);
    const blocks = sizes.map((s, i) => colors[i] + s);
    const goalStack = blocks.slice().sort((a, b) => C.size(b) - C.size(a));
    const goalCol = o.goalCol === 'last' ? ncol - 1 : int(r, 1, ncol - 1);
    const cols = Array.from({ length: ncol }, () => []);
    // drop blocks in random order onto random legal columns (not finishing the goal)
    const order = blocks.slice().sort(() => r() - 0.5);
    let ok = true;
    for (const b of order) {
      const legal = cols.map((c, i) => i).filter((i) => cols[i].length < 3 && (!cols[i].length || C.size(cols[i][cols[i].length - 1]) >= C.size(b)));
      if (!legal.length) { ok = false; break; }
      cols[pick(r, legal)].push(b);
    }
    if (!ok) continue;
    if (JSON.stringify(cols[goalCol]) === JSON.stringify(goalStack)) continue;
    const stage = { type: 'crane', cols, hook: 0, goals: [{ col: goalCol, stack: goalStack }] };
    const sol = bfsStage(stage, ['L', 'R', 'G']);
    if (!sol || sol.length < o.min || sol.length > o.max) continue;
    return { stage, sol };
  }
  throw new Error('crane: no puzzle for ' + JSON.stringify(o));
}

/** Doze: a little plot with dirt piles + holes (+ rocks + a truck). */
function doze(seed, o) {
  const r = rng(seed);
  for (let tries = 0; tries < 20000; tries++) {
    const W = o.w, H = o.h;
    const g = Array.from({ length: H }, () => Array(W).fill('.'));
    const free = () => { for (let k = 0; k < 50; k++) { const x = int(r, 0, W - 1), y = int(r, 0, H - 1); if (g[y][x] === '.') return [x, y]; } return null; };
    const put = (ch) => { const p = free(); if (!p) return false; g[p[1]][p[0]] = ch; return true; };
    if (!put(pick(r, ['>', 'v', '<', '^']))) continue;
    let fine = true;
    for (let i = 0; i < o.dirt; i++) fine = fine && put('o') && put('O');
    for (let i = 0; i < (o.rocks || 0); i++) fine = fine && put('r');
    if (o.rocks) fine = fine && put('X');
    for (let i = 0; i < (o.trees || 0); i++) fine = fine && put('T');
    if (!fine) continue;
    const stage = { type: 'doze', map: g.map((row) => row.join('')) };
    let sol;
    try { sol = bfsStage(stage, ['U', 'D', 'L', 'R'], 200000); } catch (e) { continue; }
    if (!sol || sol.length < o.min || sol.length > o.max) continue;
    return { stage, sol };
  }
  throw new Error('doze: no puzzle for ' + JSON.stringify(o));
}

/** Build stage: the house blueprint; its solution is the slot order. */
function build(house, decoys) {
  const pieces = Array.from(new Set(C.slots(house).map((s) => s.piece)));
  const tray = pieces.concat(decoys || []).sort((a, b) => ['thin', 'found', 'walls', 'window', 'door', 'flat', 'roof'].indexOf(a) - ['thin', 'found', 'walls', 'window', 'door', 'flat', 'roof'].indexOf(b));
  return { stage: { type: 'build', house, tray }, sol: C.slots(house).map((s) => s.piece) };
}

/** Robot maze: a self-avoiding path of `len` moves with `turns` turns in a w×h box. */
const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
function robot(seed, o) {
  const r = rng(seed);
  for (let tries = 0; tries < 20000; tries++) {
    const W = o.w, H = o.h;
    let x = int(r, 0, W - 1), y = int(r, 0, H - 1), d = int(r, 0, 3);
    const startD = d;
    const cells = [[x, y]], key = (a, b) => a + ',' + b, used = new Set([key(x, y)]);
    const prog = [];
    let turns = 0, bad = false, seg = 0;
    while (cells.length - 1 < o.len) {
      // maybe turn (not twice in a row, not at the start of a segment of length < 1)
      if (seg >= 1 && turns < o.turns && r() < 0.45) { const t = r() < 0.5 ? 'L' : 'R'; d = (d + (t === 'R' ? 1 : 3)) % 4; prog.push(t); turns++; seg = 0; }
      const nx = x + DIRS[d][0], ny = y + DIRS[d][1];
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || used.has(key(nx, ny))) { bad = true; break; }
      // keep the path one cell wide: the new cell must not touch older path cells
      const touch = DIRS.some(([dx, dy]) => { const k = key(nx + dx, ny + dy); return k !== key(x, y) && used.has(k); });
      if (touch) { bad = true; break; }
      x = nx; y = ny; cells.push([x, y]); used.add(key(x, y)); prog.push('F'); seg++;
    }
    if (bad || turns !== o.turns || prog[prog.length - 1] !== 'F') continue;
    const g = Array.from({ length: H }, () => Array(W).fill(o.wall || 'T'));
    cells.forEach(([cx, cy]) => { g[cy][cx] = '.'; });
    g[cells[0][1]][cells[0][0]] = ['^', '>', 'v', '<'][startD];
    const end = cells[cells.length - 1];
    g[end[1]][end[0]] = 'F';
    const mid = cells.slice(2, -1);
    for (let i = 0; i < (o.gears || 0) && mid.length; i++) { const c = mid.splice(int(r, 0, mid.length - 1), 1)[0]; g[c[1]][c[0]] = 'G'; }
    // some water instead of trees for variety
    if (o.water) for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (g[yy][xx] === 'T' && r() < o.water) g[yy][xx] = '~';
    const map = g.map((row) => row.join(''));
    const solution = prog.map((t) => ({ t }));
    const lv = { map, blocks: o.blocks || ['F', 'L', 'R'], par: solution.length, solution };
    const c = R.check(lv, solution);
    if (!c.ok || c.stars !== 3 || c.result.bump || !c.result.allGears) continue;
    return lv;
  }
  throw new Error('robot: no maze for ' + JSON.stringify(o));
}

module.exports = { rng, crane, doze, build, robot, bfsStage };
