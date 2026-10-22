/* Level 2 (v4) — Thinking Puzzles: plan the whole program, then run it. Pure (browser + Node).
 * A step up from Robot Coder (js/logic/robot.js keeps its own levels untouched): counted loops (also nested),
 * a function ("My move", defined once and used many times), if / else (wall ahead? standing on red / blue?),
 * keys and doors, conveyor belts, debugging stages and "fewest blocks" stars.
 *
 * Map legend (one char per cell): '.' floor   '#' crate   'T' tree   '~' water (all three block)
 *   'g' gear (grab them all)   'F' flag (goal)   'K' key   'D' door (opens if Robo has a key; the key is used up)
 *   'r' red tile   'b' blue tile   '^' '>' 'v' '<' conveyor belt: after Robo stops on it, it carries him 1 square that way
 * Robo starts at level.start = [x, y, dir] (dir 0 up, 1 right, 2 down, 3 left).
 * Program: { main: [blocks], fn: [blocks] } (fn = the "My move" body; levels with fn: true).
 * Blocks: { t:'F' } forward, { t:'L' } / { t:'R' } turn, { t:'rep', n: 2..9 (0 = forever), body: [] },
 *   { t:'if', c: 'wall'|'red'|'blue', body: [], alt: [] } (alt = else), { t:'M' } run "My move".
 * Paths (for highlighting): 'm.0', 'm.2.b.1' (inside a body), 'm.3.a.0' (inside else), 'f.1' (inside My move). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.puzzles = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  var BELT = { '^': 0, '>': 1, 'v': 2, '<': 3 };
  var SOLID = { '#': 'crate', 'T': 'tree', '~': 'water' };
  var FOREVER = 0;
  var MAX_STEPS = 400;
  var MAX_DEPTH = 2;            // containers inside containers: at most 2 deep
  var CONDS = ['wall', 'red', 'blue'];

  function parse(level) {
    var rows = level.map, h = rows.length, w = rows[0].length;
    var cells = [], gears = [], keys = [], doors = [], flag = null;
    for (var y = 0; y < h; y++) {
      cells.push([]);
      for (var x = 0; x < w; x++) {
        var c = rows[y].charAt(x) || '#';
        cells[y].push(c);
        if (c === 'g') gears.push({ x: x, y: y });
        else if (c === 'K') keys.push({ x: x, y: y });
        else if (c === 'D') doors.push({ x: x, y: y });
        else if (c === 'F') flag = { x: x, y: y };
      }
    }
    var s = level.start || [0, 0, 1];
    return { w: w, h: h, cells: cells, gears: gears, keys: keys, doors: doors, flag: flag, start: { x: s[0], y: s[1], d: s[2] } };
  }
  function cellAt(p, x, y) { return (x < 0 || y < 0 || x >= p.w || y >= p.h) ? '#' : p.cells[y][x]; }

  /** Normalise a stored program ({main, fn} or a plain array = main). */
  function prog(p) {
    if (Array.isArray(p)) return { main: p, fn: [] };
    p = p || {};
    return { main: Array.isArray(p.main) ? p.main : [], fn: Array.isArray(p.fn) ? p.fn : [] };
  }
  function clone(p) { return JSON.parse(JSON.stringify(prog(p))); }

  function countList(list) {
    var n = 0;
    (list || []).forEach(function (b) { n += 1 + countList(b.body) + countList(b.alt); });
    return n;
  }
  /** Blocks used: main + My move. */
  function countBlocks(p) { p = prog(p); return countList(p.main) + countList(p.fn); }

  /** Check structure against the level's allowed blocks. */
  function validate(p, level) {
    p = prog(p);
    var allowed = level.blocks || ['F', 'L', 'R'];
    var conds = level.conds || CONDS;
    function list(l, depth, inFn) {
      if (!Array.isArray(l)) return false;
      for (var i = 0; i < l.length; i++) {
        var b = l[i];
        if (!b || typeof b.t !== 'string' || allowed.indexOf(b.t) < 0) return false;
        if (b.t === 'M' && inFn) return false;                       // no My move inside My move
        if (b.t === 'rep' || b.t === 'if') {
          if (depth >= MAX_DEPTH) return false;
          if (b.t === 'rep' && (typeof b.n !== 'number' || b.n < 0 || b.n > 9 || (b.n === FOREVER && allowed.indexOf('forever') < 0))) return false;
          if (b.t === 'if' && (conds.indexOf(b.c) < 0 || !Array.isArray(b.alt) || !list(b.alt, depth + 1, inFn))) return false;
          if (!list(b.body, depth + 1, inFn)) return false;
        } else if (['F', 'L', 'R', 'M'].indexOf(b.t) < 0) return false;
      }
      return true;
    }
    return list(p.main, 0, false) && list(p.fn, 0, true) && (level.fn || !p.fn.length);
  }

  /** Run. Returns { trace, reached, gears, totalGears, allGears, bump, timeout, steps, final, keys }.
   *  trace: { path, ev:'move'|'slide'|'turn'|'bump'|'check'|'loop'|'call', x, y, d, gear?, key?, door?, flag?, cond?, iter?, dir? } */
  function run(level, program, opts) {
    opts = opts || {};
    var p = parse(level), P = prog(program);
    var st = { x: p.start.x, y: p.start.y, d: p.start.d };
    var gotGear = {}, gotKey = {}, opened = {}, keys = 0;
    var trace = [], steps = 0, stop = false, reached = false, bump = false, timeout = false;
    var maxSteps = opts.maxSteps || MAX_STEPS;
    function rec(path, ev, extra) {
      var e = { path: path, ev: ev, x: st.x, y: st.y, d: st.d };
      if (extra) for (var k in extra) e[k] = extra[k];
      trace.push(e);
    }
    function blocked(x, y) {
      var c = cellAt(p, x, y);
      if (SOLID[c]) return true;
      if (c === 'D' && !opened[x + ',' + y] && keys <= 0) return true;
      return false;
    }
    /** Arrive on (x,y): grab gears / keys, open doors, reach the flag. */
    function arrive(path, ev, extra) {
      extra = extra || {};
      var c = cellAt(p, st.x, st.y), k = st.x + ',' + st.y;
      if (c === 'g' && !gotGear[k]) { gotGear[k] = true; extra.gear = true; }
      if (c === 'K' && !gotKey[k]) { gotKey[k] = true; keys++; extra.key = true; }
      if (c === 'D' && !opened[k]) { opened[k] = true; keys--; extra.door = true; }
      if (p.flag && p.flag.x === st.x && p.flag.y === st.y) extra.flag = true;
      rec(path, ev, extra);
      if (extra.flag) { reached = true; stop = true; }
    }
    function forward(path) {
      var nx = st.x + DX[st.d], ny = st.y + DY[st.d];
      if (blocked(nx, ny)) { bump = true; stop = true; rec(path, 'bump', { tx: nx, ty: ny }); return; }
      st.x = nx; st.y = ny;
      arrive(path, 'move');
      // conveyor belts carry Robo on (a few squares at most)
      for (var n = 0; n < 8 && !stop; n++) {
        var c = cellAt(p, st.x, st.y);
        if (BELT[c] === undefined) break;
        var dir = BELT[c], bx = st.x + DX[dir], by = st.y + DY[dir];
        if (blocked(bx, by)) break;
        st.x = bx; st.y = by;
        arrive(path, 'slide', { dir: dir });
      }
    }
    function cond(c) {
      if (c === 'wall') return blocked(st.x + DX[st.d], st.y + DY[st.d]);
      var here = cellAt(p, st.x, st.y);
      if (c === 'red') return here === 'r';
      if (c === 'blue') return here === 'b';
      return false;
    }
    function exec(list, prefix) {
      for (var i = 0; i < list.length && !stop; i++) {
        var b = list[i], path = prefix + '.' + i;
        if (++steps > maxSteps) { timeout = true; stop = true; return; }
        if (b.t === 'F') forward(path);
        else if (b.t === 'L' || b.t === 'R') { st.d = (st.d + (b.t === 'L' ? 3 : 1)) % 4; rec(path, 'turn', { dir: b.t }); }
        else if (b.t === 'rep') {
          var n = b.n === FOREVER ? Infinity : b.n;
          for (var k = 0; k < n && !stop; k++) {
            rec(path, 'loop', { iter: k + 1 });
            if (!b.body.length) break;
            exec(b.body, path + '.b');
            if (++steps > maxSteps) { timeout = true; stop = true; }
          }
        } else if (b.t === 'if') {
          var yes = cond(b.c);
          rec(path, 'check', { cond: yes, c: b.c });
          exec(yes ? b.body : (b.alt || []), path + (yes ? '.b' : '.a'));
        } else if (b.t === 'M') {
          rec(path, 'call');
          exec(P.fn, 'f');
        }
      }
    }
    exec(P.main, 'm');
    var g = Object.keys(gotGear).length;
    return { trace: trace, reached: reached, gears: g, totalGears: p.gears.length, allGears: g === p.gears.length, bump: bump, timeout: timeout,
      steps: steps, final: { x: st.x, y: st.y, d: st.d }, keys: keys };
  }

  /** Stars: 1 for the flag, +1 for every gear (free when there are none), +1 for par blocks or fewer. */
  function score(level, program, result) {
    result = result || run(level, program);
    if (!result.reached) return 0;
    var s = 1;
    if (result.allGears) s++;
    if (countBlocks(program) <= level.par) s++;
    return s;
  }
  function check(level, program) {
    var result = run(level, program);
    return { ok: result.reached, stars: score(level, program, result), result: result };
  }

  /* ---------- editing helpers (the view and tests use the same rules) ---------- */
  /** Slot ids: 'm' main, 'f' My move, '<path>.b' a body, '<path>.a' an else. Returns the list (array) or null. */
  function slotList(p, slot) {
    p = prog(p);
    var parts = String(slot).split('.');
    var list = parts[0] === 'f' ? p.fn : p.main;
    for (var i = 1; i < parts.length; i += 2) {
      var b = list[+parts[i]];
      if (!b) return null;
      list = parts[i + 1] === 'a' ? b.alt : b.body;
      if (!Array.isArray(list)) return null;
    }
    return list;
  }
  function slotDepth(slot) { return (String(slot).split('.').length - 1) / 2; }
  function canInsert(level, type, slot) {
    var allowed = level.blocks || ['F', 'L', 'R'];
    if (allowed.indexOf(type) < 0) return false;
    if (type === 'M' && String(slot).charAt(0) === 'f') return false;
    if ((type === 'rep' || type === 'if') && slotDepth(slot) >= MAX_DEPTH) return false;
    if (String(slot).charAt(0) === 'f' && !level.fn) return false;
    return true;
  }
  function newBlock(type, level) {
    if (type === 'rep') return { t: 'rep', n: 2, body: [] };
    if (type === 'if') return { t: 'if', c: (level.conds || CONDS)[0], body: [], alt: [] };
    return { t: type };
  }
  /** Get the block at a path like 'm.2' / 'm.1.b.0' / 'f.3'. */
  function blockAt(p, path) {
    var parts = String(path).split('.');
    var idx = +parts.pop();
    return (slotList(p, parts.join('.')) || [])[idx] || null;
  }

  return {
    DX: DX, DY: DY, BELT: BELT, FOREVER: FOREVER, MAX_STEPS: MAX_STEPS, MAX_DEPTH: MAX_DEPTH, CONDS: CONDS,
    parse: parse, cellAt: cellAt, prog: prog, clone: clone, countBlocks: countBlocks, validate: validate,
    run: run, score: score, check: check, slotList: slotList, slotDepth: slotDepth, canInsert: canInsert, newBlock: newBlock, blockAt: blockAt
  };
});
