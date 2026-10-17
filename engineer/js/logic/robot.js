/* Robot Coder logic: map parsing, program interpreter, scoring. Pure (browser + Node). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.robot = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Directions: 0 = up (north), 1 = right (east), 2 = down (south), 3 = left (west)
  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  var START_CHARS = { '^': 0, '>': 1, 'v': 2, '<': 3 };
  var FOREVER = 0;          // repeat count 0 means "forever" (until the flag)
  var MAX_STEPS = 400;      // safety limit on executed actions

  /** Parse a level map (array of strings).
   *  '.' ground, '#' rock, 'T' tree, '~' water (all but '.' block), 'G' gear,
   *  'F' flag/star goal, '^ > v <' robot start facing that way. */
  function parse(level) {
    var rows = level.map;
    var h = rows.length, w = rows[0].length;
    var walls = {}, gears = [], start = null, flag = null, cells = [];
    for (var y = 0; y < h; y++) {
      cells.push([]);
      for (var x = 0; x < w; x++) {
        var c = rows[y].charAt(x) || '#';
        var kind = 'ground';
        if (c === '#' || c === 'T' || c === '~') { walls[x + ',' + y] = c; kind = c === '#' ? 'rock' : c === 'T' ? 'tree' : 'water'; }
        else if (c === 'G') gears.push({ x: x, y: y });
        else if (c === 'F') flag = { x: x, y: y };
        else if (START_CHARS[c] !== undefined) start = { x: x, y: y, d: START_CHARS[c] };
        cells[y].push(kind);
      }
    }
    if (!start) throw new Error('Level has no robot start');
    return { w: w, h: h, walls: walls, gears: gears, start: start, flag: flag, cells: cells };
  }

  function isWall(p, x, y) {
    if (x < 0 || y < 0 || x >= p.w || y >= p.h) return true;
    return !!p.walls[x + ',' + y];
  }

  /** Number of blocks in a program (loops count as one plus their contents). */
  function countBlocks(prog) {
    var n = 0;
    (prog || []).forEach(function (b) {
      n += 1;
      if (b.body) n += countBlocks(b.body);
    });
    return n;
  }

  /** Validate structure: only allowed block types, nesting rules. */
  function validate(prog, allowed, depth) {
    depth = depth || 0;
    if (!Array.isArray(prog)) return false;
    for (var i = 0; i < prog.length; i++) {
      var b = prog[i];
      if (!b || typeof b.t !== 'string') return false;
      if (allowed && allowed.indexOf(b.t) < 0) return false;
      if (b.t === 'rep' || b.t === 'ifw') {
        if (!Array.isArray(b.body)) return false;
        if (b.t === 'rep') {
          if (depth > 0) return false;                         // no loop inside a loop
          if (typeof b.n !== 'number' || b.n < 0 || b.n > 9) return false;
          if (b.n === FOREVER && allowed && allowed.indexOf('forever') < 0) return false;
        }
        if (b.t === 'ifw' && depth > 1) return false;
        if (!validate(b.body, allowed, depth + 1)) return false;
      } else if (['F', 'L', 'R'].indexOf(b.t) < 0) {
        return false;
      }
    }
    return true;
  }

  /** Run a program. Returns { trace, reached, gears, bump, steps, timeout, finalPos }.
   *  trace entries: { path:[indices], ev:'move'|'turn'|'bump'|'check'|'loop', x, y, d, gear?, flag?, cond? } */
  function run(level, prog, opts) {
    opts = opts || {};
    var p = parse(level);
    var maxSteps = opts.maxSteps || MAX_STEPS;
    var st = { x: p.start.x, y: p.start.y, d: p.start.d };
    var got = {};
    var trace = [];
    var steps = 0, stop = false, reached = false, bump = false, timeout = false;

    function rec(path, ev, extra) {
      var e = { path: path.slice(), ev: ev, x: st.x, y: st.y, d: st.d };
      if (extra) for (var k in extra) e[k] = extra[k];
      trace.push(e);
    }

    function exec(list, prefix) {
      for (var i = 0; i < list.length && !stop; i++) {
        var b = list[i];
        var path = prefix.concat([i]);
        if (++steps > maxSteps) { timeout = true; stop = true; return; }
        if (b.t === 'F') {
          var nx = st.x + DX[st.d], ny = st.y + DY[st.d];
          if (isWall(p, nx, ny)) {
            bump = true; stop = true;
            rec(path, 'bump', { tx: nx, ty: ny });
            return;
          }
          st.x = nx; st.y = ny;
          var extra = {};
          for (var g = 0; g < p.gears.length; g++) {
            var gg = p.gears[g];
            if (gg.x === nx && gg.y === ny && !got[g]) { got[g] = true; extra.gear = g; }
          }
          if (p.flag && p.flag.x === nx && p.flag.y === ny) { extra.flag = true; }
          rec(path, 'move', extra);
          if (extra.flag) { reached = true; stop = true; return; }
        } else if (b.t === 'L' || b.t === 'R') {
          st.d = (st.d + (b.t === 'L' ? 3 : 1)) % 4;
          rec(path, 'turn', { dir: b.t });
        } else if (b.t === 'rep') {
          var n = b.n === FOREVER ? Infinity : b.n;
          for (var k = 0; k < n && !stop; k++) {
            rec(path, 'loop', { iter: k + 1 });
            if (!b.body.length) break;
            exec(b.body, path);
            if (++steps > maxSteps) { timeout = true; stop = true; }
          }
        } else if (b.t === 'ifw') {
          var wx = st.x + DX[st.d], wy = st.y + DY[st.d];
          var cond = isWall(p, wx, wy);
          rec(path, 'check', { cond: cond });
          if (cond) exec(b.body, path);
        }
      }
    }
    exec(prog || [], []);

    var gearCount = Object.keys(got).length;
    return {
      trace: trace,
      reached: reached,
      gears: gearCount,
      totalGears: p.gears.length,
      allGears: gearCount === p.gears.length,
      bump: bump,
      timeout: timeout,
      steps: steps,
      final: { x: st.x, y: st.y, d: st.d }
    };
  }

  /** Stars: 1 for reaching the flag, +1 for all gears, +1 for using par blocks or fewer. */
  function score(level, prog, result) {
    result = result || run(level, prog);
    if (!result.reached) return 0;
    var s = 1;
    if (result.allGears) s++;
    if (countBlocks(prog) <= level.par) s++;
    return s;
  }

  /** Solve check used by tests and the game: returns { ok, stars, result }. */
  function check(level, prog) {
    var result = run(level, prog);
    return { ok: result.reached, stars: score(level, prog, result), result: result };
  }

  /** Deep clone a program (state stored in saves / undo). */
  function cloneProg(prog) { return JSON.parse(JSON.stringify(prog || [])); }

  return {
    DX: DX, DY: DY, FOREVER: FOREVER,
    parse: parse, isWall: isWall, run: run, score: score, check: check,
    countBlocks: countBlocks, validate: validate, cloneProg: cloneProg
  };
});
