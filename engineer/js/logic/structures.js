/* Level 2 (v4) — Engineer Challenges: building frames on the ground (houses, towers, crane arms) and their END TEST.
 * Pure (browser + Node). Reuses the bridges truss solver (js/logic/bridges.js: stiffness method, wobble check, prune).
 *
 * Coordinates: integer grid points, x right, y DOWN; the ground is row `level.ground`. Bolts (anchors) sit on the ground
 * row at x = level.bolts[i] (plus optional level.anchors [[x,y]]). A beam is 1 square long (wall / floor) or a diagonal
 * (brace): { x1, y1, x2, y2, m: 'wood'|'steel' } or the bridges string form 'x1,y1-x2,y2' / 's:x1,y1-x2,y2'.
 *
 * Level fields
 *   cols, ground, top (highest row allowed, default 0), bolts: [x], anchors?: [[x,y]], targets: [[x,y]] (stars he must
 *   build up to: roof top, tower top, crane hook), test: 'wind' | 'quake' | 'lift', materials, budget3, budget2,
 *   roof: load hung on every target (default 0.5), wind / quake: test strength, hook: [x,y] + box: weight (lift test).
 *
 * The test: dead load G (self weight + target loads) plus a test load L scaled by f:
 *   wind  f: 0 → 1 (gusts push each storey's windward joint)  quake f: shakes −1 … +1 (inertia: each joint's own weight)
 *   lift  f: 0 → 1 (the box leaves the ground and hangs on the hook)
 * A beam breaks when |N_G + f·N_L| > its capacity (wood 2, steel 4, same as Bridges). Linear, so the exact f where the
 * first beam breaks is computed (failF / failSign) and the view animates up to it. */
(function (root, factory) {
  var mod = factory(typeof module === 'object' && module.exports ? require('./bridges.js') : null);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.structures = mod; }
})(typeof self !== 'undefined' ? self : this, function (BLnode) {
  'use strict';
  function BL() { return BLnode || (self.LE && self.LE.logic && self.LE.logic.bridges); }

  var DEFAULT_ROOF = 0.5;

  function key(x, y) { return x + ',' + y; }
  function parse(b) { return BL().parseBeam(b); }
  function parseAll(list) { return (list || []).map(parse); }
  function beamKey(b) { return BL().beamKey(b); }
  function beamStr(b) { return BL().beamStr(b); }
  function cost(beams) { return BL().cost(beams); }

  /** The bridges solver's view of this site: every bolt is an anchor. */
  function solverLevel(level) {
    var bolts = (level.bolts || []).slice().sort(function (a, b) { return a - b; });
    var anchors = bolts.map(function (x) { return [x, level.ground]; }).concat(level.anchors || []);
    return { anchors: anchors, left: bolts[0], right: bolts[bolts.length - 1], deck: level.ground, rows: level.ground + 1 };
  }
  function anchorSet(level) {
    var s = {};
    (level.bolts || []).forEach(function (x) { s[key(x, level.ground)] = true; });
    (level.anchors || []).forEach(function (a) { s[key(a[0], a[1])] = true; });
    return s;
  }
  function anchorsOf(level) { return Object.keys(anchorSet(level)).map(function (k) { return k.split(',').map(Number); }); }
  function isAnchor(level, x, y) { return !!anchorSet(level)[key(x, y)]; }
  function blockedSet(level) {
    var s = {};
    (level.blocked || []).forEach(function (p) { s[key(p[0], p[1])] = true; });
    return s;
  }

  /** May a joint sit at (x,y)? Bolts, or any point above the ground inside the site (not a blocked spot). */
  function validPoint(level, x, y) {
    if (x !== Math.round(x) || y !== Math.round(y)) return false;
    if (isAnchor(level, x, y)) return true;
    if (x < 0 || x > level.cols || y < (level.top || 0) || y >= level.ground) return false;
    return !blockedSet(level)[key(x, y)];
  }
  function startNodes(level, beams) {
    var s = anchorSet(level);
    parseAll(beams).forEach(function (b) { s[key(b.x1, b.y1)] = true; s[key(b.x2, b.y2)] = true; });
    return s;
  }

  /** Check a new beam. Short beams only: 1 square (wall / floor) or a diagonal (brace). */
  function checkBeam(level, beams, ax, ay, bx, by, m) {
    beams = parseAll(beams);
    m = m || 'wood';
    var dx = Math.abs(bx - ax), dy = Math.abs(by - ay);
    if (!dx && !dy) return { ok: false, reason: 'same' };
    if (dx > 1 || dy > 1) return { ok: false, reason: 'long' };
    if (!validPoint(level, ax, ay) || !validPoint(level, bx, by)) return { ok: false, reason: 'point' };
    var st = startNodes(level, beams);
    if (!st[key(ax, ay)] && !st[key(bx, by)]) return { ok: false, reason: 'start' };
    if (isAnchor(level, ax, ay) && isAnchor(level, bx, by)) return { ok: false, reason: 'anchors' };
    if (level.materials && level.materials.indexOf(m) < 0) return { ok: false, reason: 'material' };
    var b = parse({ x1: ax, y1: ay, x2: bx, y2: by, m: m });
    var k = beamKey(b);
    if (beams.some(function (q) { return beamKey(q) === k; })) return { ok: false, reason: 'dup' };
    return { ok: true, beam: b };
  }
  function addBeam(level, beams, ax, ay, bx, by, m) {
    var r = checkBeam(level, beams, ax, ay, bx, by, m);
    if (!r.ok) return { ok: false, reason: r.reason, beams: parseAll(beams) };
    return { ok: true, beams: parseAll(beams).concat([r.beam]), added: r.beam };
  }
  /** Points a beam from (ax,ay) may go to. */
  function reachable(level, beams, ax, ay, m) {
    var out = [];
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && checkBeam(level, beams, ax, ay, ax + dx, ay + dy, m || 'wood').ok) out.push([ax + dx, ay + dy]);
    }
    return out;
  }

  function round(v, d) { var p = Math.pow(10, d || 4); return Math.round(v * p) / p; }

  /** Run the end test. Deterministic. Returns {
   *    ok, reason: null|'empty'|'reach'|'wobbly'|'break', cost, beams, dropped:[idx], wobbly:[idx], missing:[[x,y]],
   *    broken: idx|-1, brokenKind, failF (0..1, test strength where it broke), failSign (+1 / −1: quake direction),
   *    G: { r:[ratio], d:{'x,y':[dx,dy]} }, L: { r, d } (per unit f), peak, test } */
  function simulate(level, beamsIn) {
    var all = parseAll(beamsIn);
    var A = BL().analysis, MAT = BL().MATERIALS;
    var nb = all.length;
    var test = level.test || 'wind';
    var res = { ok: false, reason: null, cost: cost(all), beams: all, dropped: [], wobbly: [], missing: [], broken: -1, brokenKind: null,
      failF: null, failSign: 1, G: { r: new Array(nb).fill(0), d: {} }, L: { r: new Array(nb).fill(0), d: {} }, peak: 0, test: test };
    if (!nb) { res.reason = 'empty'; return res; }
    var SL = solverLevel(level);
    var seen = {}, idx = [];
    all.forEach(function (b, i) { var k = beamKey(b); if (!seen[k]) { seen[k] = true; idx.push(i); } });
    var pr = A.prune(SL, all, idx);
    res.dropped = pr.dropped;
    var wc = A.wobbleCheck(SL, all, pr.alive);
    var md = wc.md;
    // Every star (target) must be a joint of the standing structure.
    (level.targets || []).forEach(function (t) {
      if (md.nodeOf[key(t[0], t[1])] === undefined) res.missing.push(t);
    });
    if (wc.wobbly.length) {
      var ws = {};
      wc.wobbly.forEach(function (ni) { ws[ni] = true; });
      res.wobbly = md.els.filter(function (e) { return ws[e.a] || ws[e.b]; }).map(function (e) { return e.bi; });
    }
    if (res.missing.length) { res.reason = 'reach'; return res; }
    if (res.wobbly.length) { res.reason = 'wobbly'; res.failF = 0; return res; }

    var n = md.ndof;
    var G = new Array(n).fill(0), L = new Array(n).fill(0), mass = new Array(md.nodes.length).fill(0);
    md.els.forEach(function (e) {
      var w = e.mat.weight * e.L / 2;
      [e.a, e.b].forEach(function (ni) { mass[ni] += w; });
    });
    var roof = level.roof === undefined ? DEFAULT_ROOF : level.roof;
    (level.targets || []).forEach(function (t) { var ni = md.nodeOf[key(t[0], t[1])]; if (ni !== undefined) mass[ni] += roof; });
    var windward = {};   // row -> the left-most free joint (the wall the wind hits)
    md.nodes.forEach(function (nd, ni) {
      if (nd.dof < 0) return;
      G[nd.dof + 1] += mass[ni];
      if (test === 'quake') L[nd.dof] += (level.quake || 1) * mass[ni] * 2;     // inertia: heavy joints shake harder
      if (test === 'wind' && (windward[nd.y] === undefined || nd.x < md.nodes[windward[nd.y]].x)) windward[nd.y] = ni;
    });
    if (test === 'wind') {
      // gusts push each storey from the left; higher storeys catch more wind (more joints do not mean more wind)
      Object.keys(windward).forEach(function (y) {
        var nd = md.nodes[windward[y]];
        L[nd.dof] += (level.wind || 1) * (0.5 + 0.25 * (level.ground - nd.y));
      });
    }
    if (test === 'lift') {
      var hk = level.hook || (level.targets || [])[0];
      var hn = hk && md.nodeOf[key(hk[0], hk[1])];
      if (hn !== undefined && md.nodes[hn].dof >= 0) L[md.nodes[hn].dof + 1] += level.box || 1;
    }
    var U = n ? BL().solveMulti(wc.K, [G, L]) : [[], []];
    var NG = A.axialForces(md, U[0]), NL = A.axialForces(md, U[1]);
    md.els.forEach(function (e, ei) {
      res.G.r[e.bi] = round(NG[ei] / e.mat.cap, 4);
      res.L.r[e.bi] = round(NL[ei] / e.mat.cap, 4);
    });
    md.nodes.forEach(function (nd) {
      if (nd.dof < 0) return;
      res.G.d[key(nd.x, nd.y)] = [round(U[0][nd.dof], 6), round(U[0][nd.dof + 1], 6)];
      res.L.d[key(nd.x, nd.y)] = [round(U[1][nd.dof], 6), round(U[1][nd.dof + 1], 6)];
    });
    // Where does the first beam break? |a + f b| <= 1 for f in [0,1] (quake: also f in [-1,0]).
    var signs = test === 'quake' ? [1, -1] : [1];
    var best = { f: Infinity, i: -1, s: 1 };
    md.els.forEach(function (e) {
      var a = res.G.r[e.bi], b = res.L.r[e.bi];
      if (Math.abs(a) > 1 + 1e-9) { if (0 < best.f) best = { f: 0, i: e.bi, s: 1 }; return; }
      signs.forEach(function (s) {
        var bb = b * s;
        if (Math.abs(bb) < 1e-12) return;
        var f = bb > 0 ? (1 - a) / bb : (-1 - a) / bb;   // where a + f·bb reaches +1 or −1
        if (f >= 0 && f <= 1 + 1e-9 && f < best.f - 1e-12) best = { f: f, i: e.bi, s: s };
      });
    });
    var peak = 0;
    md.els.forEach(function (e) {
      var a = res.G.r[e.bi], b = res.L.r[e.bi];
      peak = Math.max(peak, Math.abs(a + b), test === 'quake' ? Math.abs(a - b) : 0);
    });
    res.peak = round(peak, 4);
    if (best.i >= 0) {
      res.reason = 'break'; res.broken = best.i; res.failF = round(best.f, 4); res.failSign = best.s;
      var r = res.G.r[best.i] + best.f * best.s * res.L.r[best.i];
      res.brokenKind = r > 0 ? 'stretch' : 'squish';
      return res;
    }
    res.ok = true;
    return res;
  }

  /** Stresses and joint moves at test strength f (quake: f in −1…1). */
  function stateAt(res, f) {
    var r = res.G.r.map(function (a, i) { return a + f * res.L.r[i]; });
    var d = {};
    Object.keys(res.G.d).forEach(function (k) {
      var g = res.G.d[k], l = res.L.d[k] || [0, 0];
      d[k] = [g[0] + f * l[0], g[1] + f * l[1]];
    });
    return { r: r, d: d };
  }

  /** After beam(s) break, which other beams fall? (same rule as Bridges). */
  function collapse(level, beamsIn, goneIdx) { return BL().collapse(solverLevel(level), beamsIn, goneIdx); }

  function score(level, beams, result) {
    result = result || simulate(level, beams);
    if (!result.ok) return 0;
    return result.cost <= level.budget3 ? 3 : result.cost <= level.budget2 ? 2 : 1;
  }
  function starsForCost(level, c) { return c <= level.budget3 ? 3 : c <= level.budget2 ? 2 : 1; }
  function check(level, beams) {
    var result = simulate(level, beams);
    return { ok: result.ok, stars: score(level, beams, result), result: result };
  }

  return {
    solverLevel: solverLevel, anchorsOf: anchorsOf, isAnchor: isAnchor, validPoint: validPoint, startNodes: startNodes,
    checkBeam: checkBeam, addBeam: addBeam, reachable: reachable, parseAll: parseAll, beamKey: beamKey, beamStr: beamStr, cost: cost,
    simulate: simulate, stateAt: stateAt, collapse: collapse, score: score, starsForCost: starsForCost, check: check
  };
});
