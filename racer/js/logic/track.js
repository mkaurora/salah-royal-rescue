/* Track builder: level definition (js/data/levels.js) → deterministic track (road shape + placed items).
 * Pure, seeded (RR.rng), no DOM. Shared by the sim (physics), the renderer (pseudo-3D) and the bot/tests.
 *
 * Coordinates (metres): z = distance along the road from the start line, x = lateral offset from the road centre
 * (right = +), y = height above the road surface (jumps / falling rocks). The road is sampled every SEG metres:
 *   curve[i]  -1..1   bend strength (renderer bends the road, sim pushes the car outward in proportion to v²)
 *   hy[i]     metres  road height (hills; renderer projects it, sim adds a small slope drag)
 *   lo[i]/hi[i]       drivable open area (lane closures move these inward; outside them are barriers)
 * UMD: module.exports in Node, RR.track in the browser. */
(function (root, factory) {
  var R = (root.RR && root.RR.rng) || (typeof require === 'function' ? require('./rng.js') : null);
  var mod = factory(R);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.track = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  var SEG = 2;            // metres per road sample
  var LANE_W = 3.2;       // metres per lane
  var START_CLEAR = 130;  // no obstacles right after the start line
  var END_CLEAR = 70;     // ...nor just before the finish
  var CP_CLEAR = 32;      // checkpoints (respawn points) keep this much clear road on each side
  var TAPER = 36;         // lane closure: barriers slide in over this many metres

  /** Item sizes: w = width (x), len = length (z). Collision uses these boxes. */
  var SIZE = {
    pothole: { w: 1.7, len: 1.7 }, cone: { w: 0.7, len: 0.7 }, oil: { w: 2.6, len: 5 },
    puddle: { w: 2.8, len: 6 }, rock: { w: 1.9, len: 1.9 }, ramp: { w: 2.8, len: 4 },
    coin: { w: 1.1, len: 1.1 }, fuel: { w: 1.4, len: 1.4 }, wrench: { w: 1.4, len: 1.4 }
  };
  var OBSTACLES = ['pothole', 'cone', 'oil', 'puddle', 'rock'];
  var PICKUPS = ['coin', 'fuel', 'wrench'];

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* ------------------------------------------------------------------ road shape */

  /** Road sections [{len, curve, hill}] from the level's curvy/hilly knobs (or def.road when given). */
  function makeSections(def, r) {
    if (def.road) return def.road.map(function (s) { return { len: s[0], curve: s[1] || 0, hill: s[2] || 0 }; });
    var out = [{ len: 140, curve: 0, hill: 0 }], z = 140, last = 0;
    var curvy = def.curvy || 0, hilly = def.hilly || 0;
    while (z < def.length - 160) {
      var len = Math.min(r.int(9, 22) * 10, def.length - 160 - z);
      if (len < 60) { out[out.length - 1].len += len; z += len; break; }
      var c = 0;
      if (curvy > 0 && r.chance(0.35 + curvy * 0.5)) {
        var sign = last > 0 ? -1 : last < 0 ? 1 : (r.chance(0.5) ? 1 : -1);
        if (r.chance(0.3)) sign = -sign;
        c = sign * clamp(r.range(0.35, 1) * curvy, 0.12, 1);
      }
      var h = hilly > 0 && r.chance(0.3 + hilly * 0.5) ? r.range(-1, 1) * hilly * 30 : 0;
      out.push({ len: len, curve: c, hill: h });
      if (c) last = c;
      z += len;
    }
    out.push({ len: Math.max(160, def.length - z), curve: 0, hill: 0 });
    return out;
  }

  function buildRoad(def, sections) {
    var n = Math.ceil(def.length / SEG) + 1;
    var curve = new Float32Array(n), hy = new Float32Array(n);
    var i = 0, base = 0;
    sections.forEach(function (s) {
      var k = Math.max(1, Math.round(s.len / SEG));
      for (var j = 0; j < k && i < n; j++, i++) {
        var t = (j + 0.5) / k;
        // ease into and out of the bend so the road never kinks
        var e = t < 0.25 ? smooth(t / 0.25) : t > 0.75 ? smooth((1 - t) / 0.25) : 1;
        curve[i] = s.curve * e;
        hy[i] = base + s.hill * (1 - Math.cos(Math.PI * t)) / 2;
      }
      base += s.hill;
    });
    for (; i < n; i++) hy[i] = base;
    return { curve: curve, hy: hy, n: n };
  }

  /* ------------------------------------------------------------------ lanes, closures */

  function laneX(lanes, i) { return (i - (lanes - 1) / 2) * LANE_W; }

  /** Closure zones [{z0, z1, side, closed}] spread through the middle of the level. */
  function makeClosures(def, r) {
    var n = def.closures || 0, out = [];
    if (!n || def.lanes < 2) return out;
    var span = def.length - START_CLEAR - END_CLEAR - 300;
    for (var k = 0; k < n; k++) {
      var mid = START_CLEAR + 150 + span * (k + 0.5) / n;
      var len = r.int(14, 22) * 10;
      var closed = def.lanes >= 4 && r.chance(0.5) ? 2 : 1;
      out.push({ z0: Math.round(mid - len / 2), z1: Math.round(mid + len / 2), side: k % 2 ? 1 : -1, closed: closed });
    }
    return out;
  }

  function buildBounds(def, n, closures) {
    var half = def.lanes * LANE_W / 2;
    var lo = new Float32Array(n), hi = new Float32Array(n);
    for (var i = 0; i < n; i++) { lo[i] = -half; hi[i] = half; }
    closures.forEach(function (c) {
      var shut = c.closed * LANE_W;
      for (var i = 0; i < n; i++) {
        var z = i * SEG, f = 0;
        if (z >= c.z0 - TAPER && z < c.z0) f = smooth((z - (c.z0 - TAPER)) / TAPER);
        else if (z >= c.z0 && z <= c.z1) f = 1;
        else if (z > c.z1 && z <= c.z1 + 24) f = smooth(1 - (z - c.z1) / 24);
        if (!f) continue;
        if (c.side < 0) lo[i] = Math.max(lo[i], -half + shut * f);
        else hi[i] = Math.min(hi[i], half - shut * f);
      }
    });
    return { lo: lo, hi: hi, half: half };
  }

  /* ------------------------------------------------------------------ helpers on a built track */

  function seg(t, z) { return clamp(Math.floor(z / SEG), 0, t.n - 1); }
  function curveAt(t, z) { return t.curve[seg(t, z)]; }
  function heightAt(t, z) {
    var f = z / SEG, i = clamp(Math.floor(f), 0, t.n - 2), u = clamp(f - i, 0, 1);
    return t.hy[i] * (1 - u) + t.hy[i + 1] * u;
  }
  function slopeAt(t, z) { return (heightAt(t, z + 2) - heightAt(t, z - 2)) / 4; }
  function loAt(t, z) { return t.lo[seg(t, z)]; }
  function hiAt(t, z) { return t.hi[seg(t, z)]; }
  /** Tightest open area over [z0, z1]. */
  function openRange(t, z0, z1) {
    var lo = -Infinity, hi = Infinity;
    for (var i = seg(t, z0), e = seg(t, z1); i <= e; i++) { if (t.lo[i] > lo) lo = t.lo[i]; if (t.hi[i] < hi) hi = t.hi[i]; }
    return { lo: lo, hi: hi };
  }
  /** Lanes (indices) whose whole width is open over [z0, z1]. */
  function openLanes(t, z0, z1) {
    var r = openRange(t, z0, z1), out = [];
    for (var i = 0; i < t.lanes; i++) {
      var x = laneX(t.lanes, i);
      if (x - LANE_W / 2 >= r.lo - 0.01 && x + LANE_W / 2 <= r.hi + 0.01) out.push(i);
    }
    return out;
  }
  /** Lane centre nearest to x that is open at z. */
  function nearestOpenLaneX(t, z, x) {
    var ls = openLanes(t, z - 4, z + 4), best = 0, bd = Infinity;
    if (!ls.length) return (loAt(t, z) + hiAt(t, z)) / 2;
    ls.forEach(function (i) { var lx = laneX(t.lanes, i), d = Math.abs(lx - x); if (d < bd) { bd = d; best = lx; } });
    return best;
  }

  /* ------------------------------------------------------------------ item placement */

  function item(type, z, x, extra) {
    var s = SIZE[type], o = { type: type, z: z, x: x, w: s.w, len: s.len };
    if (extra) for (var k in extra) o[k] = extra[k];
    return o;
  }

  /* Patterns: each blocks at most (open lanes − 1) lanes, so a free lane always remains. Returns the items and
   * how far along the road the pattern reaches. */
  var PATTERNS = {
    pothole: function (ctx, z, lanes) {
      return [item('pothole', z, ctx.lx(ctx.r.pick(lanes)) + ctx.r.range(-0.5, 0.5))];
    },
    pothole2: function (ctx, z, lanes) {
      if (lanes.length < 3) return PATTERNS.pothole(ctx, z, lanes);
      var pick = ctx.r.shuffle(lanes).slice(0, 2);
      return pick.map(function (l, k) { return item('pothole', z + k * 7, ctx.lx(l) + ctx.r.range(-0.4, 0.4)); });
    },
    cone: function (ctx, z, lanes) {
      var l = ctx.r.pick(lanes), x = ctx.lx(l);
      return [0, 5, 10].map(function (dz) { return item('cone', z + dz, x); });
    },
    slalom: function (ctx, z, lanes) {
      if (lanes.length < 2) return PATTERNS.cone(ctx, z, lanes);
      var a = ctx.r.int(0, lanes.length - 2), out = [];
      for (var k = 0; k < 3; k++) {
        var l = lanes[a + (k % 2)];
        out.push(item('cone', z + k * 26, ctx.lx(l)), item('cone', z + k * 26 + 4, ctx.lx(l)));
      }
      return out;
    },
    oil: function (ctx, z, lanes) { return [item('oil', z, ctx.lx(ctx.r.pick(lanes)) + ctx.r.range(-0.3, 0.3))]; },
    puddle: function (ctx, z, lanes) {
      var l = ctx.r.pick(lanes);
      return [item('puddle', z, ctx.lx(l) + ctx.r.range(-0.3, 0.3))];
    },
    rock: function (ctx, z, lanes) {
      // half the rocks aim at the lane the car is in when the warning starts (decided in the sim)
      return [item('rock', z, ctx.lx(ctx.r.pick(lanes)), { target: ctx.r.chance(0.5) })];
    },
    ramp: function (ctx, z, lanes) {
      var l = ctx.r.pick(lanes), x = ctx.lx(l), out = [item('ramp', z, x)];
      // coins in the air along a typical jump, and something to jump over
      for (var k = 1; k <= 6; k++) {
        var dz = k * 3.6, tt = dz / 24, y = 7 * tt - 9 * tt * tt;
        if (y > 0.8) out.push(item('coin', z + 2 + dz, x, { y: Math.round(y * 10) / 10 }));
      }
      out.push(item(ctx.r.chance(0.5) ? 'puddle' : 'pothole', z + 14, x));
      return out;
    }
  };
  var PATTERN_LEN = { pothole: 2, pothole2: 9, cone: 11, slalom: 58, oil: 5, puddle: 6, rock: 2, ramp: 18 };

  function weightedPick(r, mix) {
    var keys = Object.keys(mix).filter(function (k) { return mix[k] > 0; }), tot = 0;
    keys.forEach(function (k) { tot += mix[k]; });
    var v = r.next() * tot;
    for (var i = 0; i < keys.length; i++) { v -= mix[keys[i]]; if (v < 0) return keys[i]; }
    return keys[keys.length - 1];
  }

  function overlaps(a, b, pad) {
    pad = pad || 0;
    return Math.abs(a.z - b.z) < (a.len + b.len) / 2 + pad && Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad;
  }

  /* ------------------------------------------------------------------ build */

  function build(def) {
    var r = RNG.rng('track:' + (def.seed || def.id));
    var sections = makeSections(def, r);
    var road = buildRoad(def, sections);
    var closures = makeClosures(def, r);
    var b = buildBounds(def, road.n, closures);
    var t = {
      id: def.id, def: def, length: def.length, lanes: def.lanes, laneW: LANE_W, seg: SEG, n: road.n,
      curve: road.curve, hy: road.hy, lo: b.lo, hi: b.hi, half: b.half,
      sections: sections, closures: closures, items: [], traffic: [], checkpoints: [], fuelStops: []
    };
    var ctx = { r: r, lx: function (i) { return laneX(def.lanes, i); } };

    // reserved stretches where no obstacle pattern may start
    var reserved = [[-1e9, START_CLEAR], [def.length - END_CLEAR, 1e9]];
    var ncp = def.checkpoints || 0;
    for (var c = 1; c <= ncp; c++) {
      var cz = Math.round(def.length * c / (ncp + 1) / 10) * 10;
      t.checkpoints.push(cz);
      reserved.push([cz - CP_CLEAR, cz + CP_CLEAR]);
    }
    if (def.fuel) {
      for (var fz = def.fuel.first; fz < def.length - 150; fz += def.fuel.every) {
        t.fuelStops.push(fz);
        reserved.push([fz - 24, fz + 24]);
      }
    }
    var wz = [];
    for (var w = 1; w <= (def.wrenches || 0); w++) {
      var z0 = Math.round(def.length * (w - 0.35) / (def.wrenches + 0.3));
      wz.push(z0);
      reserved.push([z0 - 14, z0 + 14]);
    }
    function isReserved(z0, z1) {
      for (var i = 0; i < reserved.length; i++) if (z1 > reserved[i][0] && z0 < reserved[i][1]) return true;
      return false;
    }

    // fuel stops: cans in two neighbouring open lanes
    t.fuelStops.forEach(function (fz) {
      var ls = openLanes(t, fz - 4, fz + 4);
      var a = ls.length > 1 ? ls[r.int(0, ls.length - 2)] : ls[0];
      t.items.push(item('fuel', fz, ctx.lx(a)));
      if (ls.length > 1) t.items.push(item('fuel', fz, ctx.lx(a + 1)));
    });
    wz.forEach(function (z0) {
      var ls = openLanes(t, z0 - 4, z0 + 4);
      t.items.push(item('wrench', z0, ctx.lx(r.pick(ls))));
    });

    // obstacle patterns
    var mix = def.mix || {};
    var gap = def.gap || [80, 110];
    var z = START_CLEAR + r.int(0, gap[0] / 2), patterns = [];
    while (z < def.length - END_CLEAR) {
      var kind = weightedPick(r, mix), plen = PATTERN_LEN[kind] || 6;
      if (!kind) break;
      if (!isReserved(z - 4, z + plen + 4)) {
        var lanes = openLanes(t, z - 12, z + plen + 12);
        // in a single open lane there is nothing to dodge into: keep it clear
        if (lanes.length >= 2) {
          var blockable = lanes.length - 1, its = PATTERNS[kind](ctx, z, lanes);
          var blockedLanes = {};
          its.forEach(function (o) { if (OBSTACLES.indexOf(o.type) >= 0) blockedLanes[Math.round(o.x / LANE_W + (def.lanes - 1) / 2)] = 1; });
          if (Object.keys(blockedLanes).length <= blockable) {
            its.forEach(function (o) { t.items.push(o); });
            patterns.push({ kind: kind, z: z, len: plen });
          }
        }
      }
      z += plen + r.int(gap[0], gap[1]);
    }

    // coin rows between patterns (never on top of anything)
    var coinEvery = def.coinGap || 70;
    var solid = t.items.slice();
    for (var cz2 = START_CLEAR - 60; cz2 < def.length - 40; cz2 += r.int(coinEvery * 0.7, coinEvery * 1.3)) {
      var ls2 = openLanes(t, cz2 - 4, cz2 + 32);
      if (!ls2.length) continue;
      var lane = r.pick(ls2), k = r.int(5, 8);
      var weave = ls2.length > 1 && r.chance(def.coinWeave || 0.25);
      var lane2 = weave ? ls2[(ls2.indexOf(lane) + 1) % ls2.length] : lane;
      for (var j = 0; j < k; j++) {
        var f = weave ? smooth((j - 1) / Math.max(1, k - 3)) : 0;
        var cx = ctx.lx(lane) * (1 - f) + ctx.lx(lane2) * f, cc = item('coin', cz2 + j * 4, cx);
        var clash = solid.some(function (o) { return overlaps(cc, o, 1.2); });
        if (!clash && cc.z < def.length - 8) t.items.push(cc);
      }
    }

    // traffic spawn points: a car appears this far ahead of the player and drives on in its lane
    if (def.traffic && def.traffic.count) {
      var tc = def.traffic.count, span = def.length - 400;
      for (var q = 0; q < tc; q++) {
        var sz = Math.round(260 + span * (q + r.range(0.15, 0.85)) / tc);
        var tl = openLanes(t, sz - 10, sz + 60);
        if (!tl.length) continue;
        t.traffic.push({ z: sz, lane: r.pick(tl), speed: r.range(def.traffic.speed[0], def.traffic.speed[1]),
          change: def.traffic.change || 0, color: r.int(0, 7), kind: r.chance(0.2) ? 'truck' : 'car' });
      }
    }

    t.items.sort(function (a, b) { return a.z - b.z; });
    t.items.forEach(function (o, i) { o.id = i; });
    t.coinTotal = t.items.filter(function (o) { return o.type === 'coin'; }).length;
    t.patterns = patterns;
    return t;
  }

  return {
    SEG: SEG, LANE_W: LANE_W, SIZE: SIZE, OBSTACLES: OBSTACLES, PICKUPS: PICKUPS, START_CLEAR: START_CLEAR,
    END_CLEAR: END_CLEAR, CP_CLEAR: CP_CLEAR, TAPER: TAPER,
    build: build, laneX: laneX, curveAt: curveAt, heightAt: heightAt, slopeAt: slopeAt, loAt: loAt, hiAt: hiAt,
    openRange: openRange, openLanes: openLanes, nearestOpenLaneX: nearestOpenLaneX, overlaps: overlaps, seg: seg
  };
});
