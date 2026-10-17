/* Circuits logic: tile grid parsing, deterministic circuit solver (nodal analysis), goals and scoring.
 * Pure (browser + Node). No DOM.
 *
 * Directions: 0 = N, 1 = E, 2 = S, 3 = W. A tile's terminals are the edges it connects to.
 * Two tiles connect when both have a terminal on their shared edge.
 *
 * Tile types
 *   wires:      I straight (N,S)  C corner (N,E)  T tee (E,S,W)  X cross (all four)
 *   battery:    B  (+ on its first terminal, - on the opposite side)
 *   two-terminal loads / parts (straight = N,S; lowercase letter = corner N,E):
 *               H / h  house with a bulb (goal: light it)
 *               Z / z  sleepy house (goal: keep it dark!)
 *               P / p  lamp (a bulb on a post)
 *               M / m  motor with a fan (goal: make it spin)
 *               S / s  switch (tap to turn on/off)
 *   '#' rock, '.' empty buildable cell.
 * Rotation r (0..3) turns the base terminals clockwise by r quarter turns.
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.circuits = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DX = [0, 1, 0, -1];
  var DY = [-1, 0, 1, 0];
  var STRAIGHT = [0, 2], CORNER = [0, 1];

  var TYPES = {
    I: { kind: 'wire', base: [0, 2], sym: 2 },
    C: { kind: 'wire', base: [0, 1], sym: 4 },
    T: { kind: 'wire', base: [1, 2, 3], sym: 4 },
    X: { kind: 'wire', base: [0, 1, 2, 3], sym: 1 },
    B: { kind: 'battery', base: STRAIGHT, sym: 4 },
    H: { kind: 'bulb', house: true, base: STRAIGHT, sym: 2 },
    h: { kind: 'bulb', house: true, base: CORNER, sym: 4 },
    Z: { kind: 'bulb', house: true, sleepy: true, base: STRAIGHT, sym: 2 },
    z: { kind: 'bulb', house: true, sleepy: true, base: CORNER, sym: 4 },
    P: { kind: 'bulb', lamp: true, base: STRAIGHT, sym: 2 },
    p: { kind: 'bulb', lamp: true, base: CORNER, sym: 4 },
    M: { kind: 'motor', base: STRAIGHT, sym: 2 },
    m: { kind: 'motor', base: CORNER, sym: 4 },
    S: { kind: 'switch', base: STRAIGHT, sym: 2 },
    s: { kind: 'switch', base: CORNER, sym: 4 },
    '#': { kind: 'rock', base: [], sym: 1 }
  };

  // Electrical constants (normalised units).
  var EMF = 1;            // one battery
  var R_BATT = 0.05;      // internal resistance
  var R_LOAD = 1;         // bulb / motor
  var G_WIRE = 1000;      // conductance from a wire tile's centre to each of its edges
  var G_SWITCH = 500;     // a closed switch
  var GMIN = 1e-9;        // tiny leak to ground so floating parts still solve
  var P_ON = 0.04;        // power needed to glow / spin at all
  var P_BRIGHT = 0.5;     // power for "bright" / "fast"
  var SHORT_I = 4;        // battery current that means "short circuit"
  var FLOW_MIN = 0.02;    // current that shows moving electricity

  function rotDir(d, r) { return (d + r) % 4; }
  function opp(d) { return (d + 2) % 4; }
  function key(x, y) { return x + ',' + y; }

  /** Terminals (absolute directions) of a tile type at rotation r. */
  function terminals(t, r) {
    var T = TYPES[t];
    if (!T) return [];
    return T.base.map(function (d) { return rotDir(d, r || 0); });
  }
  function kind(t) { return TYPES[t] ? TYPES[t].kind : null; }

  /** Parse a level map. Tokens are separated by spaces: '..' empty, '##' rock, e.g. 'B0', 'H1', 'I0*' (tap to turn),
   *  'S1' (switch, starts off), 'S1+' (switch, starts on). */
  function parse(level) {
    var rows = level.map.map(function (r) { return r.trim().split(/\s+/); });
    var h = rows.length, w = rows[0].length;
    var cells = [];
    for (var y = 0; y < h; y++) {
      cells.push([]);
      for (var x = 0; x < w; x++) {
        var tok = rows[y][x] || '..';
        var c = null;
        if (tok[0] === '#') c = { t: '#', r: 0, fixed: true };
        else if (tok[0] !== '.') {
          var m = /^([A-Za-z])(\d)?(\*)?(\+)?$/.exec(tok);
          if (!m || !TYPES[m[1]]) throw new Error('Bad tile token "' + tok + '" in ' + level.id);
          c = { t: m[1], r: +(m[2] || 0), fixed: true, spin: !!m[3] };
          if (kind(c.t) === 'switch') c.on = !!m[4];
        }
        cells[y].push(c);
      }
    }
    return { w: w, h: h, cells: cells };
  }

  /** Starting state of a level: { placed:[{t,x,y,r}], rots:{}, sw:{} }. */
  function initialState(level) {
    return { placed: (level.start || []).map(function (p) { return { t: p.t, x: p.x, y: p.y, r: p.r || 0 }; }), rots: {}, sw: {} };
  }
  function cloneState(s) {
    s = s || { placed: [], rots: {}, sw: {} };
    return { placed: (s.placed || []).map(function (p) { return { t: p.t, x: p.x, y: p.y, r: p.r || 0 }; }),
      rots: Object.assign({}, s.rots || {}), sw: Object.assign({}, s.sw || {}) };
  }

  /** Tiles the player may place (tray types) – everything else on the board is fixed. */
  function trayTypes(level) { return Object.keys(level.tray || {}); }

  /** Combine the level map with a state → grid of tiles {t,r,fixed,spin,on,placed}. Invalid placements are ignored. */
  function build(level, state, parsed) {
    var p = parsed || parse(level);
    state = state || initialState(level);
    var grid = [];
    for (var y = 0; y < p.h; y++) {
      grid.push([]);
      for (var x = 0; x < p.w; x++) {
        var c = p.cells[y][x];
        if (!c) { grid[y].push(null); continue; }
        var t = { t: c.t, r: c.r, fixed: true, spin: c.spin, on: c.on };
        var k = key(x, y);
        if (c.spin && state.rots && state.rots[k] !== undefined) t.r = ((state.rots[k] % 4) + 4) % 4;
        if (kind(c.t) === 'switch' && state.sw && state.sw[k] !== undefined) t.on = !!state.sw[k];
        grid[y].push(t);
      }
    }
    var counts = {};
    (state.placed || []).forEach(function (q) {
      if (!q || !TYPES[q.t] || q.t === '#') return;
      if (q.x < 0 || q.y < 0 || q.x >= p.w || q.y >= p.h || grid[q.y][q.x]) return;
      counts[q.t] = (counts[q.t] || 0) + 1;
      var t = { t: q.t, r: ((q.r || 0) % 4 + 4) % 4, placed: true };
      if (kind(q.t) === 'switch') t.on = q.on !== false;
      grid[q.y][q.x] = t;
    });
    return { w: p.w, h: p.h, grid: grid, counts: counts };
  }

  /* ---------- Linear solver ---------- */
  function solveLinear(A, b) {
    var n = b.length, i, j, k;
    for (i = 0; i < n; i++) {
      var piv = i, best = Math.abs(A[i][i]);
      for (k = i + 1; k < n; k++) if (Math.abs(A[k][i]) > best) { best = Math.abs(A[k][i]); piv = k; }
      if (best < 1e-300) continue;
      if (piv !== i) { var tr = A[i]; A[i] = A[piv]; A[piv] = tr; var tb = b[i]; b[i] = b[piv]; b[piv] = tb; }
      var row = A[i], d = row[i];
      for (k = i + 1; k < n; k++) {
        var f = A[k][i] / d;
        if (f === 0) continue;
        var rk = A[k];
        for (j = i; j < n; j++) rk[j] -= f * row[j];
        b[k] -= f * b[i];
      }
    }
    var x = new Array(n);
    for (i = n - 1; i >= 0; i--) {
      var s = b[i];
      for (j = i + 1; j < n; j++) s -= A[i][j] * x[j];
      x[i] = Math.abs(A[i][i]) < 1e-300 ? 0 : s / A[i][i];
    }
    return x;
  }

  function UF() { this.p = {}; }
  UF.prototype.find = function (a) {
    if (this.p[a] === undefined) this.p[a] = a;
    while (this.p[a] !== a) { this.p[a] = this.p[this.p[a]]; a = this.p[a]; }
    return a;
  };
  UF.prototype.union = function (a, b) { var x = this.find(a), y = this.find(b); if (x !== y) this.p[x] = y; return x !== y; };

  /** Level of a load from its power: 0 off, 1 dim / slow, 2 bright / fast. */
  function levelOf(power) { return power >= P_BRIGHT ? 2 : power >= P_ON ? 1 : 0; }

  /**
   * Solve the circuit for a level + state.
   * Returns {
   *   parts: { 'x,y': { t, kind, current, power, level(0..2), on(bool for switches) } }   (batteries, bulbs, motors, switches)
   *   flow:  { 'x,y': [n,e,s,w] }   current ENTERING the tile through each edge (for the moving-dots animation)
   *   short: bool, shortAt: ['x,y' of shorted batteries]
   * }
   */
  function solve(level, state, parsed) {
    var B = build(level, state, parsed);
    var g = B.grid, W = B.w, Hh = B.h;
    var uf = new UF();
    var x, y, d, t;
    function term(x, y, d) { return 't' + x + ',' + y + ',' + d; }
    // join matching edges between neighbours
    for (y = 0; y < Hh; y++) for (x = 0; x < W; x++) {
      t = g[y][x];
      if (!t) continue;
      var ts = terminals(t.t, t.r);
      ts.forEach(function (d) {
        uf.find(term(x, y, d));
        var nx = x + DX[d], ny = y + DY[d];
        if (nx < 0 || ny < 0 || nx >= W || ny >= Hh) return;
        var n = g[ny][nx];
        if (n && terminals(n.t, n.r).indexOf(opp(d)) >= 0) uf.union(term(x, y, d), term(nx, ny, opp(d)));
      });
    }
    // index nodes
    var idx = {}, n = 0;
    function node(name) { var r = uf.find(name); if (idx[r] === undefined) idx[r] = n++; return idx[r]; }
    var elems = [];
    for (y = 0; y < Hh; y++) for (x = 0; x < W; x++) {
      t = g[y][x];
      if (!t) continue;
      var k = kind(t.t);
      var ts2 = terminals(t.t, t.r);
      if (k === 'wire') {
        var c = node('c' + x + ',' + y);
        ts2.forEach(function (d) { elems.push({ type: 'wire', x: x, y: y, d: d, a: node(term(x, y, d)), b: c, g: G_WIRE }); });
      } else if (k === 'battery' || k === 'bulb' || k === 'motor' || k === 'switch') {
        var e = { type: k, x: x, y: y, t: t.t, da: ts2[0], db: ts2[1], a: node(term(x, y, ts2[0])), b: node(term(x, y, ts2[1])), tile: t };
        if (k === 'battery') e.g = 1 / R_BATT;
        else if (k === 'switch') e.g = t.on ? G_SWITCH : 0;
        else e.g = 1 / R_LOAD;
        elems.push(e);
      }
    }
    // nodal analysis
    var A = [], rhs = [];
    for (var i = 0; i < n; i++) { A.push(new Array(n).fill(0)); A[i][i] = GMIN; rhs.push(0); }
    elems.forEach(function (e) {
      if (!e.g) return;
      A[e.a][e.a] += e.g; A[e.b][e.b] += e.g; A[e.a][e.b] -= e.g; A[e.b][e.a] -= e.g;
      if (e.type === 'battery') { var J = EMF / R_BATT; rhs[e.a] += J; rhs[e.b] -= J; }  // + terminal is 'a'
    });
    var V = n ? solveLinear(A, rhs) : [];

    // zero-load loops through batteries (structural part of short detection)
    var uf2 = new UF();
    elems.forEach(function (e) { if (e.type === 'wire' || (e.type === 'switch' && e.g)) uf2.union('n' + e.a, 'n' + e.b); });
    var cycleBatt = {};
    elems.forEach(function (e) {
      if (e.type !== 'battery') return;
      if (!uf2.union('n' + e.a, 'n' + e.b)) cycleBatt[key(e.x, e.y)] = true;
    });

    var parts = {}, flow = {}, shortAt = [];
    function addFlow(x, y, d, i) {
      var k = key(x, y);
      if (!flow[k]) flow[k] = [0, 0, 0, 0];
      flow[k][d] += i;
    }
    elems.forEach(function (e) {
      var dv = V[e.a] - V[e.b];
      if (e.type === 'wire') { addFlow(e.x, e.y, e.d, dv * e.g); return; }
      var cur;
      if (e.type === 'battery') {
        cur = (EMF - dv) / R_BATT;          // flows out of + (a) through the circuit, back into - (b)
        addFlow(e.x, e.y, e.db, cur); addFlow(e.x, e.y, e.da, -cur);
      } else {
        cur = dv * e.g;                      // a -> b through the part
        addFlow(e.x, e.y, e.da, cur); addFlow(e.x, e.y, e.db, -cur);
      }
      var pw = (e.type === 'bulb' || e.type === 'motor') ? cur * cur * R_LOAD : 0;
      var part = { t: e.t, kind: e.type, current: cur, power: pw, level: levelOf(pw), placed: !!e.tile.placed };
      if (e.type === 'switch') part.on = !!e.tile.on;
      if (e.type === 'battery') {
        part.short = !!cycleBatt[key(e.x, e.y)] && Math.abs(cur) > SHORT_I;
        if (part.short) shortAt.push(key(e.x, e.y));
      }
      parts[key(e.x, e.y)] = part;
    });
    // tidy tiny flows
    Object.keys(flow).forEach(function (k) {
      flow[k] = flow[k].map(function (v) { return Math.abs(v) < FLOW_MIN ? 0 : v; });
    });
    return { parts: parts, flow: flow, short: shortAt.length > 0, shortAt: shortAt, grid: B };
  }

  /**
   * Evaluate the level goals.
   * Goals: every house lit (bright if level.need === 'bright'), every fan spinning (fast if level.needFan === 'fast'),
   * every sleepy house dark, every fixed lamp lit, at least level.lamps placed lamps lit, and no short circuit.
   * Returns solve() result + { goals:[{key,type,ok,level}], solved, lit, status }.
   */
  function evaluate(level, state, parsed) {
    var res = solve(level, state, parsed);
    var goals = [];
    var needBright = level.need === 'bright';
    var placedLit = 0, anyLit = false, dimIssue = false, sleepyLit = false;
    Object.keys(res.parts).forEach(function (k) {
      var p = res.parts[k], T = TYPES[p.t];
      if (p.kind === 'bulb' || p.kind === 'motor') { if (p.level > 0) anyLit = true; }
      if (p.kind === 'bulb' && T.sleepy) {
        goals.push({ key: k, type: 'sleepy', ok: p.level === 0, level: p.level });
        if (p.level > 0) sleepyLit = true;
      } else if (p.kind === 'bulb' && T.house) {
        var ok = needBright ? p.level === 2 : p.level > 0;
        if (needBright && p.level === 1) dimIssue = true;
        goals.push({ key: k, type: 'house', ok: ok, level: p.level });
      } else if (p.kind === 'bulb' && T.lamp && !p.placed) {
        goals.push({ key: k, type: 'lamp', ok: p.level > 0, level: p.level });
      } else if (p.kind === 'bulb' && T.lamp && p.placed && p.level > 0) {
        placedLit++;
      } else if (p.kind === 'motor') {
        var okm = level.needFan === 'fast' ? p.level === 2 : p.level > 0;
        if (level.needFan === 'fast' && p.level === 1) dimIssue = true;
        goals.push({ key: k, type: 'fan', ok: okm, level: p.level });
      }
    });
    if (level.lamps) goals.push({ key: 'lamps', type: 'lamps', ok: placedLit >= level.lamps, count: placedLit, need: level.lamps });
    var allOk = goals.every(function (g) { return g.ok; });
    res.goals = goals;
    res.solved = !res.short && allOk && goals.length > 0;
    res.status = res.short ? 'short' : res.solved ? 'solved' : sleepyLit ? 'sleepy' :
      (dimIssue && goals.every(function (g) { return g.ok || g.level === 1; })) ? 'dim' : anyLit ? 'partial' : 'off';
    return res;
  }

  /** Number of tiles the player has on the board. */
  function countPlaced(state) { return (state && state.placed || []).length; }

  /** Stars: solved = 1; +1 if within par + 2 tiles; +1 if within par. */
  function score(level, state, result) {
    result = result || evaluate(level, state);
    if (!result.solved) return 0;
    var n = countPlaced(state);
    return n <= level.par ? 3 : n <= level.par + 2 ? 2 : 1;
  }

  function check(level, state) {
    var r = evaluate(level, state);
    return { ok: r.solved, stars: score(level, state, r), result: r };
  }

  /** Tray counts left for a state. */
  function remaining(level, state) {
    var left = Object.assign({}, level.tray || {});
    // start tiles count as extra stock: picking them up gives them back to the tray
    (level.start || []).forEach(function (p) { left[p.t] = (left[p.t] || 0) + 1; });
    (state.placed || []).forEach(function (p) { if (left[p.t] !== undefined) left[p.t]--; });
    return left;
  }

  /** Best rotation when dropping a tile at x,y: connect to as many neighbours as possible. Ties → lowest rotation. */
  function autoRot(level, state, type, x, y, parsed) {
    var B = build(level, state, parsed);
    var best = 0, bestScore = -Infinity;
    var sym = TYPES[type] ? TYPES[type].sym : 4;
    for (var r = 0; r < sym; r++) {
      var ts = terminals(type, r), sc = 0;
      for (var d = 0; d < 4; d++) {
        var nx = x + DX[d], ny = y + DY[d];
        var inside = nx >= 0 && ny >= 0 && nx < B.w && ny < B.h;
        var n = inside ? B.grid[ny][nx] : null;
        var nHas = !!(n && terminals(n.t, n.r).indexOf(opp(d)) >= 0);
        var mine = ts.indexOf(d) >= 0;
        if (mine && nHas) sc += 3;
        else if (mine && (!inside || (n && !n.placed))) sc -= 1;  // pointing at the edge, a rock or a fixed tile that doesn't connect
        else if (!mine && nHas) sc -= 1;                              // a neighbour reaches for us but we don't connect
      }
      if (sc > bestScore) { bestScore = sc; best = r; }
    }
    return best;
  }

  return {
    DX: DX, DY: DY, TYPES: TYPES, P_ON: P_ON, P_BRIGHT: P_BRIGHT,
    terminals: terminals, kind: kind, opp: opp, key: key,
    parse: parse, build: build, initialState: initialState, cloneState: cloneState, trayTypes: trayTypes,
    solve: solve, evaluate: evaluate, score: score, check: check, countPlaced: countPlaced,
    remaining: remaining, autoRot: autoRot, levelOf: levelOf
  };
});
