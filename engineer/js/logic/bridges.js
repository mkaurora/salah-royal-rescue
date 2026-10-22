/* Bridges logic: grid building rules, 2D pin-jointed truss solver (direct stiffness method),
 * moving-vehicle simulation and star scoring. Pure (browser + Node), deterministic.
 *
 * Coordinates: integer grid points (x right, y DOWN; row 0 is the top). The road (deck) is the
 * row `level.deck`. Left cliff edge is column `level.left`, right cliff edge column `level.right`.
 * A beam is { x1, y1, x2, y2, m } where m is 'wood' or 'steel'. Horizontal unit beams on the deck
 * row between the cliffs are ROAD planks (the car drives on them). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.bridges = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MAX_LEN = 2.3;          // longest beam (grid units): allows 1, √2, 2 (split), √5
  var MATERIALS = {
    wood:  { cap: 2.0, cost: 1, ea: 1000, weight: 0.08 },
    steel: { cap: 4.0, cost: 2, ea: 1600, weight: 0.12 }
  };
  var VEHICLES = {
    car:   { load: 1.0 },
    bus:   { load: 1.6 },
    truck: { load: 2.4 },
    firetruck: { load: 3.2 }   // Level 2 (v4): the heaviest vehicle
  };
  var STEP = 0.1;             // car position sampling step (grid units)
  var EPS = 1e-3;             // stiffness regularisation on free DOFs (mechanisms -> huge motion)
  var WOBBLE = 1.0;           // probe displacement above this = wobbly node

  function key(x, y) { return x + ',' + y; }

  /* ---------- Beams ---------- */
  /** Accepts '1,2-2,2', 's:1,2-2,2', [x1,y1,x2,y2,m] or {x1,y1,x2,y2,m}. Returns a normalised beam
   *  (endpoints ordered so that (x1,y1) < (x2,y2)). */
  function parseBeam(b) {
    var o;
    if (typeof b === 'string') {
      var m = 'wood', s = b;
      if (s.indexOf('s:') === 0) { m = 'steel'; s = s.slice(2); }
      else if (s.indexOf('w:') === 0) s = s.slice(2);
      var p = s.split('-').map(function (q) { return q.split(',').map(Number); });
      o = { x1: p[0][0], y1: p[0][1], x2: p[1][0], y2: p[1][1], m: m };
    } else if (Array.isArray(b)) {
      o = { x1: b[0], y1: b[1], x2: b[2], y2: b[3], m: b[4] === 'steel' || b[4] === 's' ? 'steel' : 'wood' };
    } else {
      o = { x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2, m: b.m === 'steel' ? 'steel' : 'wood' };
    }
    if (o.x2 < o.x1 || (o.x2 === o.x1 && o.y2 < o.y1)) {
      var tx = o.x1, ty = o.y1; o.x1 = o.x2; o.y1 = o.y2; o.x2 = tx; o.y2 = ty;
    }
    return o;
  }
  function beamKey(b) { return key(b.x1, b.y1) + '-' + key(b.x2, b.y2); }
  function beamStr(b) { return (b.m === 'steel' ? 's:' : '') + beamKey(b); }
  function beamLen(b) { return Math.hypot(b.x2 - b.x1, b.y2 - b.y1); }
  function parseBeams(list) { return (list || []).map(parseBeam); }
  function isRoad(level, b) {
    return b.y1 === level.deck && b.y2 === level.deck && b.x2 - b.x1 === 1 && b.x1 >= level.left && b.x2 <= level.right;
  }
  function cost(beams) {
    return normalize(beams).reduce(function (s, b) { return s + MATERIALS[b.m].cost; }, 0);
  }

  /* ---------- Terrain & building rules ---------- */
  function anchorSet(level) {
    var s = {};
    (level.anchors || []).forEach(function (a) { s[key(a[0], a[1])] = true; });
    s[key(level.left, level.deck)] = true;
    s[key(level.right, level.deck)] = true;
    (level.towers || []).forEach(function (t) {   // tall concrete towers on a cliff edge: bolts all the way up
      for (var y = t.top; y < level.deck; y++) s[key(t.x, y)] = true;
    });
    return s;
  }
  function anchorsOf(level) {
    var s = anchorSet(level);
    return Object.keys(s).map(function (k) { return k.split(',').map(Number); });
  }
  function isAnchor(level, x, y) { return !!anchorSet(level)[key(x, y)]; }

  /** True if the (continuous) point is inside rock / below the cliff tops / in a pillar. */
  function isSolid(level, x, y) {
    var e = 1e-9;
    if (y > level.deck + e && (x <= level.left + e || x >= level.right - e)) return true;
    var pil = level.pillars || [];
    for (var i = 0; i < pil.length; i++) {
      if (Math.abs(x - pil[i].x) < 0.4 && y > pil[i].top + e) return true;
    }
    return false;
  }

  /** May a joint sit at grid point (x,y)? */
  function validPoint(level, x, y) {
    if (x !== Math.round(x) || y !== Math.round(y)) return false;
    if (isAnchor(level, x, y)) return true;
    if (x < level.left || x > level.right || y < 0 || y >= level.rows) return false;
    if (isSolid(level, x, y)) return false;
    if (y === level.deck && (x === level.left || x === level.right)) return true;
    if (level.noBelow && y > level.deck) return false;
    return true;
  }

  /** Nodes a new beam may start from: anchors + endpoints of existing beams. */
  function startNodes(level, beams) {
    var s = anchorSet(level);
    parseBeams(beams).forEach(function (b) { s[key(b.x1, b.y1)] = true; s[key(b.x2, b.y2)] = true; });
    return s;
  }
  function canStart(level, beams, x, y) { return !!startNodes(level, beams)[key(x, y)]; }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a; }

  /** Split a beam into unit pieces that pass through intermediate grid points. */
  function splitBeam(b) {
    var dx = b.x2 - b.x1, dy = b.y2 - b.y1, g = gcd(dx, dy);
    if (g <= 1) return [b];
    var out = [];
    for (var i = 0; i < g; i++) {
      out.push(parseBeam({ x1: b.x1 + dx / g * i, y1: b.y1 + dy / g * i, x2: b.x1 + dx / g * (i + 1), y2: b.y1 + dy / g * (i + 1), m: b.m }));
    }
    return out;
  }

  /** Parse + split into unit pieces (a 2-long straight beam becomes 2 beams with a joint). */
  function normalize(list) {
    var out = [];
    parseBeams(list).forEach(function (b) { splitBeam(b).forEach(function (p) { out.push(p); }); });
    return out;
  }

  /** Check a proposed beam from (ax,ay) to (bx,by). Returns { ok, reason, pieces } (pieces = new beams). */
  function checkBeam(level, beams, ax, ay, bx, by, m) {
    beams = parseBeams(beams);
    m = m || 'wood';
    if (ax === bx && ay === by) return { ok: false, reason: 'same' };
    if (!canStart(level, beams, ax, ay) && !canStart(level, beams, bx, by)) return { ok: false, reason: 'start' };
    if (!validPoint(level, ax, ay) || !validPoint(level, bx, by)) return { ok: false, reason: 'point' };
    var b = parseBeam({ x1: ax, y1: ay, x2: bx, y2: by, m: m });
    if (beamLen(b) > (level.maxLen || MAX_LEN) + 1e-9) return { ok: false, reason: 'long' };
    var pieces = splitBeam(b);
    var have = {};
    beams.forEach(function (q) { have[beamKey(q)] = true; });
    var fresh = [];
    for (var i = 0; i < pieces.length; i++) {
      var p = pieces[i];
      var mx = (p.x1 + p.x2) / 2, my = (p.y1 + p.y2) / 2;
      if (isSolid(level, mx, my)) return { ok: false, reason: 'solid' };
      if (!validPoint(level, p.x1, p.y1) || !validPoint(level, p.x2, p.y2)) return { ok: false, reason: 'point' };
      if (level.noBelow && my > level.deck && mx > level.left && mx < level.right) return { ok: false, reason: 'below' };
      if (isAnchor(level, p.x1, p.y1) && isAnchor(level, p.x2, p.y2) && !isRoad(level, p)) return { ok: false, reason: 'anchors' };
      if (!have[beamKey(p)]) fresh.push(p);
    }
    if (!fresh.length) return { ok: false, reason: 'dup' };
    if (level.materials && level.materials.indexOf(m) < 0) return { ok: false, reason: 'material' };
    return { ok: true, pieces: fresh };
  }

  /** Pure add: returns { ok, beams (new array), added } */
  function addBeam(level, beams, ax, ay, bx, by, m) {
    var r = checkBeam(level, beams, ax, ay, bx, by, m);
    if (!r.ok) return { ok: false, reason: r.reason, beams: parseBeams(beams), added: [] };
    return { ok: true, beams: parseBeams(beams).concat(r.pieces), added: r.pieces };
  }

  /** All grid points a beam from (ax,ay) may reach. */
  function reachable(level, beams, ax, ay, m) {
    var out = [];
    var R = Math.floor(level.maxLen || MAX_LEN);
    for (var dy = -R; dy <= R; dy++) for (var dx = -R; dx <= R; dx++) {
      if (!dx && !dy) continue;
      var c = checkBeam(level, beams, ax, ay, ax + dx, ay + dy, m || 'wood');
      if (c.ok) out.push([ax + dx, ay + dy]);
    }
    return out;
  }

  /* ---------- Linear algebra ---------- */
  /** Solve A X = B for several right-hand sides (columns). A: n×n (array of rows), B: array of rhs vectors.
   *  Gaussian elimination with partial pivoting. Returns array of solution vectors. */
  function solveMulti(A, rhs) {
    var n = A.length, k = rhs.length, i, j, c, r;
    var M = A.map(function (row) { return row.slice(); });
    var R = rhs.map(function (v) { return v.slice(); });
    for (c = 0; c < n; c++) {
      var piv = c, best = Math.abs(M[c][c]);
      for (r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > best) { best = Math.abs(M[r][c]); piv = r; }
      if (best < 1e-14) continue;
      if (piv !== c) {
        var t = M[c]; M[c] = M[piv]; M[piv] = t;
        for (j = 0; j < k; j++) { var tv = R[j][c]; R[j][c] = R[j][piv]; R[j][piv] = tv; }
      }
      var d = M[c][c];
      for (r = c + 1; r < n; r++) {
        var f = M[r][c] / d;
        if (!f) continue;
        var Mr = M[r], Mc = M[c];
        for (i = c; i < n; i++) Mr[i] -= f * Mc[i];
        for (j = 0; j < k; j++) R[j][r] -= f * R[j][c];
      }
    }
    var X = [];
    for (j = 0; j < k; j++) {
      var x = new Array(n);
      for (r = n - 1; r >= 0; r--) {
        var s = R[j][r];
        for (i = r + 1; i < n; i++) s -= M[r][i] * x[i];
        x[r] = Math.abs(M[r][r]) < 1e-14 ? 0 : s / M[r][r];
      }
      X.push(x);
    }
    return X;
  }

  function lcg(seed) {
    var s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------- Structure analysis ---------- */
  /** Build a model from a list of beams (indices into `all`). */
  function model(level, all, idx) {
    var anchors = anchorSet(level);
    var nodes = [], nodeOf = {};
    function node(x, y) {
      var k = key(x, y);
      if (nodeOf[k] === undefined) { nodeOf[k] = nodes.length; nodes.push({ x: x, y: y, fixed: !!anchors[k], dof: -1, deg: 0 }); }
      return nodeOf[k];
    }
    var els = idx.map(function (bi) {
      var b = all[bi];
      var a = node(b.x1, b.y1), c = node(b.x2, b.y2);
      nodes[a].deg++; nodes[c].deg++;
      var L = beamLen(b);
      return { bi: bi, a: a, b: c, L: L, cx: (b.x2 - b.x1) / L, cy: (b.y2 - b.y1) / L, mat: MATERIALS[b.m] };
    });
    var ndof = 0;
    nodes.forEach(function (n) { if (!n.fixed) { n.dof = ndof; ndof += 2; } });
    return { nodes: nodes, nodeOf: nodeOf, els: els, ndof: ndof };
  }

  function stiffness(md) {
    var n = md.ndof, K = [], i;
    for (i = 0; i < n; i++) { K.push(new Array(n).fill(0)); K[i][i] = EPS; }
    md.els.forEach(function (e) {
      var k = e.mat.ea / e.L;
      var c = e.cx, s = e.cy;
      var kk = [[c * c, c * s], [c * s, s * s]];
      var da = md.nodes[e.a].dof, db = md.nodes[e.b].dof;
      for (var p = 0; p < 2; p++) for (var q = 0; q < 2; q++) {
        var v = k * kk[p][q];
        if (da >= 0) K[da + p][da + q] += v;
        if (db >= 0) K[db + p][db + q] += v;
        if (da >= 0 && db >= 0) { K[da + p][db + q] -= v; K[db + p][da + q] -= v; }
      }
    });
    return K;
  }

  function axialForces(md, u) {
    // positive = tension (stretched), negative = compression (squished)
    return md.els.map(function (e) {
      var na = md.nodes[e.a], nb = md.nodes[e.b];
      var uax = na.dof >= 0 ? u[na.dof] : 0, uay = na.dof >= 0 ? u[na.dof + 1] : 0;
      var ubx = nb.dof >= 0 ? u[nb.dof] : 0, uby = nb.dof >= 0 ? u[nb.dof + 1] : 0;
      return e.mat.ea / e.L * ((ubx - uax) * e.cx + (uby - uay) * e.cy);
    });
  }

  /** Remove beams hanging by one end (free node with a single beam), repeatedly. */
  function prune(level, all, idx) {
    var anchors = anchorSet(level);
    var alive = idx.slice(), dropped = [];
    for (;;) {
      var deg = {};
      alive.forEach(function (bi) { var b = all[bi]; [key(b.x1, b.y1), key(b.x2, b.y2)].forEach(function (k) { deg[k] = (deg[k] || 0) + 1; }); });
      var keep = [], gone = false;
      alive.forEach(function (bi) {
        var b = all[bi], k1 = key(b.x1, b.y1), k2 = key(b.x2, b.y2);
        if ((!anchors[k1] && deg[k1] === 1) || (!anchors[k2] && deg[k2] === 1)) { dropped.push(bi); gone = true; }
        else keep.push(bi);
      });
      alive = keep;
      if (!gone) break;
    }
    return { alive: alive, dropped: dropped };
  }

  /** Find wobbly (mechanism) nodes with a deterministic probe load. Returns { md, K, wobblyNodes:[node idx] }. */
  function wobbleCheck(level, all, idx) {
    var md = model(level, all, idx);
    if (!md.ndof) return { md: md, K: [], wobbly: [] };
    var K = stiffness(md);
    var rnd = lcg(12345 + md.ndof);
    var probe = [];
    for (var i = 0; i < md.ndof; i++) probe.push(rnd() * 2 - 1);
    var u = solveMulti(K, [probe])[0];
    var wob = [];
    md.nodes.forEach(function (n, ni) {
      if (n.dof < 0) return;
      if (Math.hypot(u[n.dof], u[n.dof + 1]) > WOBBLE) wob.push(ni);
    });
    return { md: md, K: K, wobbly: wob };
  }

  function round(v, d) { var p = Math.pow(10, d || 4); return Math.round(v * p) / p; }

  /** Run the whole test drive. Deterministic.
   *  Returns {
   *    ok, reason: null|'empty'|'hole'|'wobbly'|'break', cost,
   *    beams (normalised), road:[bool], dropped:[beam idx], wobbly:[beam idx], hole: x|null,
   *    broken: beam idx|-1, brokenKind: 'stretch'|'squish'|null, failAt: s|null,
   *    start, end (car path), frames:[{ s, r:[signed ratio per beam (0 for inactive)], d:{ 'x,y': [dx,dy] } }],
   *    maxRatio:[per beam], peak, nodes:[[x,y]] } */
  function simulate(level, beamsIn) {
    var all = normalize(beamsIn);
    var nb = all.length;
    var veh = VEHICLES[level.vehicle || 'car'];
    var res = {
      ok: false, reason: null, cost: cost(all), beams: all,
      road: all.map(function (b) { return isRoad(level, b); }),
      dropped: [], wobbly: [], hole: null, broken: -1, brokenKind: null, failAt: null,
      start: level.left - 0.6, end: level.right + 0.6,
      frames: [], maxRatio: new Array(nb).fill(0), peak: 0, nodes: []
    };
    if (!nb) { res.reason = 'empty'; return res; }

    // de-duplicate (keep first)
    var seen = {}, idx = [];
    all.forEach(function (b, i) { var k = beamKey(b); if (!seen[k]) { seen[k] = true; idx.push(i); } });

    var pr = prune(level, all, idx);
    res.dropped = pr.dropped;
    var alive = pr.alive;

    // road continuity (with surviving beams)
    var roadAt = {};
    alive.forEach(function (bi) { if (res.road[bi]) roadAt[all[bi].x1] = true; });
    for (var x = level.left; x < level.right; x++) if (!roadAt[x]) { res.hole = x; break; }

    var wc = wobbleCheck(level, all, alive);
    var md = wc.md;
    res.nodes = md.nodes.map(function (n) { return [n.x, n.y]; });
    if (wc.wobbly.length) {
      var wset = {};
      wc.wobbly.forEach(function (ni) { wset[ni] = true; });
      res.wobbly = md.els.filter(function (e) { return wset[e.a] || wset[e.b]; }).map(function (e) { return e.bi; });
    }

    // Load cases: self weight + unit load at every free deck node.
    var n = md.ndof;
    var selfF = new Array(n).fill(0);
    md.els.forEach(function (e) {
      var w = e.mat.weight * e.L / 2;
      [e.a, e.b].forEach(function (ni) { var nd = md.nodes[ni]; if (nd.dof >= 0) selfF[nd.dof + 1] += w; });
    });
    var deckNodes = {};   // x -> case index
    var cases = [selfF];
    md.nodes.forEach(function (nd) {
      if (nd.y === level.deck && nd.dof >= 0 && nd.x > level.left && nd.x < level.right) {
        var f = new Array(n).fill(0); f[nd.dof + 1] = 1;
        deckNodes[nd.x] = cases.length; cases.push(f);
      }
    });
    var U = n ? solveMulti(wc.K, cases) : cases.map(function () { return []; });
    var N = U.map(function (u) { return axialForces(md, u); });

    function stateAt(s) {
      // weights for each case at car position s
      var wts = new Array(cases.length).fill(0);
      wts[0] = 1;
      if (s > level.left && s < level.right) {
        var x0 = Math.floor(s + 1e-9), t = s - x0;
        if (t < 1e-9) { if (deckNodes[x0] !== undefined) wts[deckNodes[x0]] += veh.load; }
        else {
          if (deckNodes[x0] !== undefined) wts[deckNodes[x0]] += veh.load * (1 - t);
          if (deckNodes[x0 + 1] !== undefined) wts[deckNodes[x0 + 1]] += veh.load * t;
        }
      }
      var r = new Array(nb).fill(0);
      md.els.forEach(function (e, ei) {
        var f = 0;
        for (var c = 0; c < cases.length; c++) if (wts[c]) f += wts[c] * N[c][ei];
        r[e.bi] = round(f / e.mat.cap, 4);
      });
      var d = {};
      md.nodes.forEach(function (nd) {
        if (nd.dof < 0) return;
        var dx = 0, dy = 0;
        for (var c = 0; c < cases.length; c++) if (wts[c]) { dx += wts[c] * U[c][nd.dof]; dy += wts[c] * U[c][nd.dof + 1]; }
        d[key(nd.x, nd.y)] = [round(dx, 6), round(dy, 6)];
      });
      return { s: round(s, 3), r: r, d: d };
    }

    if (res.wobbly.length) {
      res.reason = 'wobbly';
      res.failAt = level.left;
      res.frames.push(wobbleFrame());
      return res;
    }
    function wobbleFrame() { return { s: res.start, r: new Array(nb).fill(0), d: {} }; }

    // Drive: sample the car position from start to end.
    var steps = Math.round((res.end - res.start) / STEP);
    for (var i = 0; i <= steps; i++) {
      var s = round(res.start + i * STEP, 3);
      var holeS = res.hole !== null ? res.hole + 0.35 : Infinity;
      if (s >= holeS) {
        res.reason = 'hole'; res.failAt = holeS;
        res.frames.push(stateAt(Math.min(s, res.hole)));
        return finish();
      }
      var st = stateAt(s);
      res.frames.push(st);
      var worst = -1, wr = 1;
      for (var b = 0; b < nb; b++) {
        var a = Math.abs(st.r[b]);
        if (a > res.maxRatio[b]) res.maxRatio[b] = a;
        if (a > wr + 1e-9) { wr = a; worst = b; }
      }
      if (worst >= 0) {
        res.reason = 'break'; res.broken = worst; res.failAt = s;
        res.brokenKind = st.r[worst] > 0 ? 'stretch' : 'squish';
        return finish();
      }
    }
    res.ok = true;
    return finish();

    function finish() {
      res.peak = res.maxRatio.reduce(function (m, v) { return Math.max(m, v); }, 0);
      return res;
    }
  }

  /** After beam `brokenIdx` snaps (or with some beams already gone), which other beams fall down?
   *  Returns indices (into the normalised beam list) of beams that hang loose or wobble. */
  function collapse(level, beamsIn, goneIdx) {
    var all = normalize(beamsIn);
    var gone = {};
    (Array.isArray(goneIdx) ? goneIdx : [goneIdx]).forEach(function (i) { gone[i] = true; });
    var idx = [];
    all.forEach(function (b, i) { if (!gone[i]) idx.push(i); });
    var falling = {};
    for (var round = 0; round < 6; round++) {
      var live = idx.filter(function (i) { return !falling[i]; });
      var pr = prune(level, all, live);
      pr.dropped.forEach(function (i) { falling[i] = true; });
      var wc = wobbleCheck(level, all, pr.alive);
      if (!wc.wobbly.length && !pr.dropped.length) break;
      var ws = {};
      wc.wobbly.forEach(function (ni) { ws[ni] = true; });
      wc.md.els.forEach(function (e) { if (ws[e.a] || ws[e.b]) falling[e.bi] = true; });
    }
    return Object.keys(falling).map(Number).sort(function (a, b) { return a - b; });
  }

  /** Stars: 0 if the car did not cross; else 3 if cost <= budget3, 2 if <= budget2, else 1. */
  function score(level, beams, result) {
    result = result || simulate(level, beams);
    if (!result.ok) return 0;
    var c = result.cost;
    if (c <= level.budget3) return 3;
    if (c <= level.budget2) return 2;
    return 1;
  }
  /** Stars this cost would earn if the bridge holds (for the live coin meter). */
  function starsForCost(level, c) { return c <= level.budget3 ? 3 : c <= level.budget2 ? 2 : 1; }

  function check(level, beams) {
    var result = simulate(level, beams);
    return { ok: result.ok, stars: score(level, beams, result), result: result };
  }

  return {
    MAX_LEN: MAX_LEN, MATERIALS: MATERIALS, VEHICLES: VEHICLES,
    parseBeam: parseBeam, parseBeams: parseBeams, beamKey: beamKey, beamStr: beamStr, beamLen: beamLen,
    isRoad: isRoad, cost: cost, anchorsOf: anchorsOf, isAnchor: isAnchor, isSolid: isSolid,
    validPoint: validPoint, canStart: canStart, startNodes: startNodes, splitBeam: splitBeam, normalize: normalize,
    checkBeam: checkBeam, addBeam: addBeam, reachable: reachable,
    solveMulti: solveMulti, simulate: simulate, collapse: collapse, score: score, starsForCost: starsForCost, check: check,
    // v4: the truss analysis pieces, reused by js/logic/structures.js (Level 2 wind / quake / crane tests)
    analysis: { anchorSet: anchorSet, model: model, stiffness: stiffness, axialForces: axialForces, prune: prune, wobbleCheck: wobbleCheck }
  };
});
