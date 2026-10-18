/* Construction world logic: bulldozer (sokoban-lite), crane (lift & stack) and house building (order rules).
 * Pure: no DOM. Shared by the browser view and Node tests.
 *
 * A level has one or more stages, played in order:
 *   { type: 'doze',  map: [...], road: rowIndex? }
 *       map legend: '.' ground, '#' barrier, 'T' tree, 'o' dirt pile, 'O' hole, 'r' rock, 'X' dump truck,
 *                   '>' '<' '^' 'v' bulldozer start (facing).
 *       Goal: fill every hole with dirt, load every rock into the dump truck, (road levels) keep the road clear.
 *       Actions: 'U' 'D' 'L' 'R'.
 *   { type: 'crane', cols: [['Y3','R2'], [], ...], hook: 0, goals: [{ col: 2, stack: ['Y3','R2'] }], truck: 0? }
 *       Blocks are '<kind><size>' (size 1 small .. 3 big). Big blocks can't sit on smaller ones; max 4 high.
 *       Actions: 'L' 'R' (move the hook), 'G' (lower the hook: grab the top block, or drop the one it holds).
 *   { type: 'build', house: { floors: 1|2, windows: [n1, n2?], color }, tray: ['found','walls','window','door','roof','flat','thin'] }
 *       Pieces must go in order: foundation -> walls -> door/windows -> roof. 'flat' and 'thin' are decoys.
 *       Actions: piece names.
 * State (JSON): { stage, moves, won, st }   — st is the stage state (see initStage).
 * Solution format: one action list per stage, e.g. [['R','R'], ['found','walls','door','roof']]. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.construction = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
  var FACE_CH = { '^': 'U', 'v': 'D', '<': 'L', '>': 'R' };
  var MAX_STACK = 4;
  var PIECES = ['found', 'walls', 'window', 'door', 'roof', 'flat', 'thin'];
  var DECOYS = { flat: 1, thin: 1 };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /* ---------------- Bulldozer ---------------- */
  function parseMap(stage) {
    var map = stage.map, H = map.length, W = map[0].length;
    var out = { w: W, h: H, walls: {}, trucks: {}, holes: [], items: [], dozer: null, road: stage.road === undefined ? null : stage.road };
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var c = map[y][x], k = x + ',' + y;
      if (c === '#' || c === 'T') out.walls[k] = c;
      else if (c === 'X') out.trucks[k] = true;
      else if (c === 'O') out.holes.push({ x: x, y: y, full: false });
      else if (c === 'o' || c === 'r') out.items.push({ id: out.items.length, k: c, x: x, y: y, gone: false });
      else if (FACE_CH[c]) out.dozer = { x: x, y: y, f: FACE_CH[c] };
    }
    return out;
  }
  var mapCache = typeof WeakMap === 'function' ? new WeakMap() : null;
  function grid(stage) {
    if (!mapCache) return parseMap(stage);
    var g = mapCache.get(stage);
    if (!g) { g = parseMap(stage); mapCache.set(stage, g); }
    return g;
  }
  function itemAt(st, x, y) {
    for (var i = 0; i < st.items.length; i++) { var it = st.items[i]; if (!it.gone && it.x === x && it.y === y) return it; }
    return null;
  }
  function holeAt(st, x, y) {
    for (var i = 0; i < st.holes.length; i++) { var hh = st.holes[i]; if (!hh.full && hh.x === x && hh.y === y) return hh; }
    return null;
  }
  /** Static cell kind: 'edge' | '#' | 'T' | 'truck' | 'ground'. */
  function cellKind(g, x, y) {
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return 'edge';
    var k = x + ',' + y;
    if (g.walls[k]) return g.walls[k];
    if (g.trucks[k]) return 'truck';
    return 'ground';
  }

  function dozeAct(stage, st, a, ev) {
    var d = DIRS[a];
    if (!d) return { ok: false, reason: 'bad' };
    var g = grid(stage);
    var dz = st.d, from = { x: dz.x, y: dz.y };
    var prevFace = dz.f;
    dz.f = a;
    if (prevFace !== a) ev.push({ t: 'turn', from: prevFace, to: a });
    var nx = dz.x + d[0], ny = dz.y + d[1];
    var ck = cellKind(g, nx, ny);
    if (ck !== 'ground') return { ok: false, reason: ck === 'truck' ? 'truck' : 'wall', bump: { x: nx, y: ny } };
    if (holeAt(st, nx, ny)) return { ok: false, reason: 'hole', bump: { x: nx, y: ny } };
    var it = itemAt(st, nx, ny);
    if (it) {
      var bx = nx + d[0], by = ny + d[1];
      var bk = cellKind(g, bx, by);
      if (bk === 'edge' || bk === '#' || bk === 'T') return { ok: false, reason: 'wall', bump: { x: nx, y: ny } };
      if (itemAt(st, bx, by)) return { ok: false, reason: 'two', bump: { x: nx, y: ny } };
      var hole = holeAt(st, bx, by);
      if (bk === 'truck') {
        if (it.k !== 'r') return { ok: false, reason: 'dirtTruck', bump: { x: nx, y: ny } };
        it.x = bx; it.y = by; it.gone = true;
        ev.push({ t: 'push', id: it.id, k: it.k, from: { x: nx, y: ny }, to: { x: bx, y: by } });
        ev.push({ t: 'dump', id: it.id, x: bx, y: by });
      } else if (hole) {
        if (it.k === 'r') return { ok: false, reason: 'rockHole', bump: { x: nx, y: ny } };
        it.x = bx; it.y = by; it.gone = true; hole.full = true;
        ev.push({ t: 'push', id: it.id, k: it.k, from: { x: nx, y: ny }, to: { x: bx, y: by } });
        ev.push({ t: 'fill', id: it.id, hole: st.holes.indexOf(hole), x: bx, y: by });
      } else {
        it.x = bx; it.y = by;
        ev.push({ t: 'push', id: it.id, k: it.k, from: { x: nx, y: ny }, to: { x: bx, y: by } });
      }
    }
    dz.x = nx; dz.y = ny;
    ev.unshift({ t: 'move', from: from, to: { x: nx, y: ny }, dir: a, reverse: opposite(prevFace) === a });
    return { ok: true };
  }
  function opposite(a) { return { U: 'D', D: 'U', L: 'R', R: 'L' }[a]; }

  function dozeDone(stage, st) {
    if (st.holes.some(function (hh) { return !hh.full; })) return false;
    if (st.items.some(function (it) { return it.k === 'r' && !it.gone; })) return false;
    if (stage.road !== undefined && st.items.some(function (it) { return !it.gone && it.y === stage.road; })) return false;
    return true;
  }

  /** True when the bulldozer stage can no longer be finished (something is stuck in a corner). */
  function dozeDeadlock(stage, st) {
    var g = grid(stage);
    function blockedFor(it, x, y) {
      var k = cellKind(g, x, y);
      if (k === 'edge' || k === '#' || k === 'T') return true;
      if (k === 'truck') return it.k !== 'r';
      return false;
    }
    function stuck(it) {
      var h1 = blockedFor(it, it.x - 1, it.y) || blockedFor(it, it.x + 1, it.y);
      var v1 = blockedFor(it, it.x, it.y - 1) || blockedFor(it, it.x, it.y + 1);
      return h1 && v1;
    }
    var free = 0, open = st.holes.filter(function (hh) { return !hh.full; }).length;
    for (var i = 0; i < st.items.length; i++) {
      var it = st.items[i];
      if (it.gone) continue;
      var s = stuck(it);
      if (it.k === 'r' && s) return true;
      if (it.k === 'o') {
        if (!s) free++;
        else if (stage.road !== undefined && it.y === stage.road) return true;
      }
    }
    return free < open;
  }

  /* ---------------- Crane ---------------- */
  function size(b) { return parseInt(String(b).slice(1), 10) || 1; }
  function craneAct(stage, st, a, ev) {
    var n = st.cols.length;
    if (a === 'L' || a === 'R') {
      var to = st.hook + (a === 'L' ? -1 : 1);
      if (to < 0 || to >= n) return { ok: false, reason: 'edge' };
      ev.push({ t: 'hook', from: st.hook, to: to });
      st.hook = to;
      return { ok: true };
    }
    if (a !== 'G') return { ok: false, reason: 'bad' };
    var col = st.cols[st.hook];
    if (!st.held) {
      if (!col.length) return { ok: false, reason: 'empty', col: st.hook };
      st.held = col.pop();
      ev.push({ t: 'grab', col: st.hook, block: st.held, level: col.length });
      return { ok: true };
    }
    if (col.length >= MAX_STACK) return { ok: false, reason: 'tall', col: st.hook };
    if (col.length && size(col[col.length - 1]) < size(st.held)) return { ok: false, reason: 'big', col: st.hook };
    col.push(st.held);
    ev.push({ t: 'drop', col: st.hook, block: st.held, level: col.length - 1 });
    st.held = null;
    return { ok: true };
  }
  function craneDone(stage, st) {
    if (st.held) return false;
    return (stage.goals || []).every(function (gl) {
      var c = st.cols[gl.col] || [];
      return c.length === gl.stack.length && gl.stack.every(function (b, i) { return c[i] === b; });
    });
  }

  /* ---------------- House building ---------------- */
  /** Ordered list of slots for a house blueprint. */
  function slots(house) {
    var floors = house.floors || 1, wins = house.windows || [0];
    var out = [{ id: 'found', piece: 'found', need: [] }];
    for (var f = 1; f <= floors; f++) out.push({ id: 'walls' + f, piece: 'walls', floor: f, need: [f === 1 ? 'found' : 'walls' + (f - 1)] });
    if (house.door !== false) out.push({ id: 'door', piece: 'door', floor: 1, need: ['walls1'] });
    for (f = 1; f <= floors; f++) {
      for (var i = 0; i < (wins[f - 1] || 0); i++) out.push({ id: 'win' + f + '_' + i, piece: 'window', floor: f, index: i, of: wins[f - 1], need: ['walls' + f] });
    }
    var all = out.map(function (s) { return s.id; });
    out.push({ id: 'roof', piece: 'roof', need: all });
    return out;
  }
  function remaining(stage, st, piece) {
    if (DECOYS[piece]) return (stage.tray || []).indexOf(piece) >= 0 ? 1 : 0;
    return slots(stage.house).filter(function (s) { return s.piece === piece && st.placed.indexOf(s.id) < 0; }).length;
  }
  function buildAct(stage, st, a, ev) {
    if (PIECES.indexOf(a) < 0 || (stage.tray || []).indexOf(a) < 0) return { ok: false, reason: 'bad' };
    if (a === 'flat') return { ok: false, reason: 'flat', piece: a };
    if (a === 'thin') return { ok: false, reason: 'thin', piece: a };
    var list = slots(stage.house);
    var slot = null;
    for (var i = 0; i < list.length; i++) if (list[i].piece === a && st.placed.indexOf(list[i].id) < 0) { slot = list[i]; break; }
    if (!slot) return { ok: false, reason: 'none', piece: a };
    var missing = slot.need.filter(function (id) { return st.placed.indexOf(id) < 0; });
    if (missing.length) {
      var reason = a === 'walls' ? 'needFound'
        : a === 'roof' ? (missing.some(function (id) { return /^(found|walls)/.test(id); }) ? 'roofWalls' : 'roofParts')
        : 'needWalls';
      return { ok: false, reason: reason, piece: a, slot: slot.id };
    }
    st.placed.push(slot.id);
    ev.push({ t: 'place', piece: a, slot: slot.id });
    return { ok: true };
  }
  function buildDone(stage, st) {
    return slots(stage.house).every(function (s) { return st.placed.indexOf(s.id) >= 0; });
  }

  /* ---------------- Generic ---------------- */
  function initStage(stage) {
    if (stage.type === 'doze') {
      var g = grid(stage);
      return { type: 'doze', d: clone(g.dozer), items: clone(g.items), holes: clone(g.holes) };
    }
    if (stage.type === 'crane') return { type: 'crane', hook: stage.hook || 0, held: null, cols: clone(stage.cols) };
    return { type: 'build', placed: [] };
  }
  function init(level) { return { stage: 0, moves: 0, won: false, st: initStage(level.stages[0]) }; }

  function stageDone(stage, st) {
    if (stage.type === 'doze') return dozeDone(stage, st);
    if (stage.type === 'crane') return craneDone(stage, st);
    return buildDone(stage, st);
  }

  /** Apply one action. Returns { state, ok, reason, events, bump }. Never mutates the input state.
   *  ok=false actions don't count as moves (a bump or a bounced piece is free). */
  function act(level, state, a) {
    var s = clone(state);
    var ev = [];
    if (s.won) return { state: s, ok: false, reason: 'won', events: ev };
    var stage = level.stages[s.stage];
    var r = stage.type === 'doze' ? dozeAct(stage, s.st, a, ev)
      : stage.type === 'crane' ? craneAct(stage, s.st, a, ev)
      : buildAct(stage, s.st, a, ev);
    if (r.ok) {
      s.moves++;
      if (stageDone(stage, s.st)) {
        ev.push({ t: 'stageDone', stage: s.stage, type: stage.type });
        if (s.stage + 1 < level.stages.length) {
          s.stage++;
          s.st = initStage(level.stages[s.stage]);
          ev.push({ t: 'stage', stage: s.stage, type: level.stages[s.stage].type });
        } else {
          s.won = true;
          ev.push({ t: 'won' });
        }
      }
    } else if (stage.type !== 'doze') {
      s = clone(state);       // only the bulldozer keeps a failed action's new facing
    }
    return { state: s, ok: !!r.ok, reason: r.reason || null, events: ev, bump: r.bump || null, info: r };
  }

  function deadlock(level, state) {
    if (state.won) return false;
    var stage = level.stages[state.stage];
    if (stage.type === 'doze') return dozeDeadlock(stage, state.st);
    return false;
  }

  function par(level) {
    if (level.par) return level.par;
    return (level.solution || []).reduce(function (n, a) { return n + a.length; }, 0);
  }
  /** 3 stars at par or better, 2 stars with a little slack, else 1 (never 0 for a win). */
  function stars(level, moves) {
    var p = par(level);
    if (moves <= p) return 3;
    if (moves <= p + Math.max(3, Math.ceil(p * 0.5))) return 2;
    return 1;
  }

  /** Play a list of actions (flat list, or one list per stage). */
  function play(level, actions) {
    var flat = [];
    (actions || []).forEach(function (a) { if (Array.isArray(a)) flat = flat.concat(a); else flat.push(a); });
    var s = init(level), fails = 0;
    flat.forEach(function (a) { var r = act(level, s, a); if (!r.ok) fails++; s = r.state; });
    return { state: s, won: s.won, moves: s.moves, stars: s.won ? stars(level, s.moves) : 0, fails: fails };
  }

  /** Check a saved state belongs to this level; returns a clean copy or null. */
  function restore(level, saved) {
    try {
      if (!saved || typeof saved !== 'object' || saved.won) return null;
      var s = clone(saved);
      if (!(s.stage >= 0 && s.stage < level.stages.length) || typeof s.moves !== 'number' || !s.st) return null;
      var stage = level.stages[s.stage];
      if (s.st.type !== stage.type) return null;
      if (stage.type === 'doze') {
        var g = grid(stage);
        if (!s.st.d || s.st.items.length !== g.items.length || s.st.holes.length !== g.holes.length) return null;
        if (cellKind(g, s.st.d.x, s.st.d.y) !== 'ground') return null;
      } else if (stage.type === 'crane') {
        if (!Array.isArray(s.st.cols) || s.st.cols.length !== stage.cols.length) return null;
        if (!(s.st.hook >= 0 && s.st.hook < stage.cols.length)) return null;
      } else {
        if (!Array.isArray(s.st.placed)) return null;
        var ids = slots(stage.house).map(function (x) { return x.id; });
        if (!s.st.placed.every(function (id) { return ids.indexOf(id) >= 0; })) return null;
      }
      s.won = false;
      return s;
    } catch (e) { return null; }
  }

  function isInitial(level, state) { return JSON.stringify(state) === JSON.stringify(init(level)); }

  return {
    DIRS: DIRS, MAX_STACK: MAX_STACK, PIECES: PIECES, DECOYS: DECOYS,
    grid: grid, cellKind: cellKind, itemAt: itemAt, holeAt: holeAt, size: size,
    slots: slots, remaining: remaining,
    init: init, initStage: initStage, act: act, stageDone: stageDone, deadlock: deadlock,
    par: par, stars: stars, play: play, restore: restore, isInitial: isInitial, clone: clone
  };
});
