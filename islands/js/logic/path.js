/* Grid collision + A* pathfinding for the world. Pure (no DOM). A grid is { w, h, blocked(x, y) → bool }.
 * Tile (x, y) covers [x, x+1) × [y, y+1) in world units. UMD: SI.path. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.path = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Build a grid from rows of chars; `blockedChars` is a string of chars that block; `extra(x,y)` adds dynamic blockers. */
  function fromRows(rows, blockedChars, extra) {
    var h = rows.length, w = h ? rows[0].length : 0;
    return {
      w: w, h: h,
      blocked: function (x, y) {
        if (x < 0 || y < 0 || x >= w || y >= h) return true;
        if (blockedChars.indexOf(rows[y].charAt(x)) >= 0) return true;
        return !!(extra && extra(x, y));
      }
    };
  }

  /** Is the circle (cx, cy, r) free of blocked tiles? */
  function circleFree(grid, cx, cy, r) {
    var x0 = Math.floor(cx - r), x1 = Math.floor(cx + r), y0 = Math.floor(cy - r), y1 = Math.floor(cy + r);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      if (!grid.blocked(x, y)) continue;
      var nx = Math.max(x, Math.min(cx, x + 1)), ny = Math.max(y, Math.min(cy, y + 1));
      var dx = cx - nx, dy = cy - ny;
      if (dx * dx + dy * dy < r * r) return false;
    }
    return true;
  }

  /** Move a circle by (dx, dy) with axis-separated sliding. Returns { x, y, hitX, hitY }. */
  function move(grid, x, y, dx, dy, r) {
    r = r == null ? 0.3 : r;
    var nx = x + dx, ny = y, hitX = false, hitY = false;
    if (!circleFree(grid, nx, ny, r)) { nx = x; hitX = dx !== 0; }
    ny = y + dy;
    if (!circleFree(grid, nx, ny, r)) { ny = y; hitY = dy !== 0; }
    return { x: nx, y: ny, hitX: hitX, hitY: hitY };
  }

  /* binary heap on f score */
  function Heap() { this.a = []; }
  Heap.prototype.push = function (n) {
    var a = this.a, i = a.length; a.push(n);
    while (i > 0) { var p = (i - 1) >> 1; if (a[p].f <= a[i].f) break; var t = a[p]; a[p] = a[i]; a[i] = t; i = p; }
  };
  Heap.prototype.pop = function () {
    var a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last; var i = 0;
      for (;;) {
        var l = 2 * i + 1, r = l + 1, m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        var t = a[m]; a[m] = a[i]; a[i] = t; i = m;
      }
    }
    return top;
  };

  /** A* over tiles. 8-neighbour moves but diagonals never cut a blocked corner. Returns [{x,y}...] (tile coords,
   *  start and goal included) or null. If the goal tile is blocked, the nearest reachable free tile is NOT used — callers
   *  pass `nearest: true` to path to the closest reachable tile instead. */
  function astar(grid, sx, sy, gx, gy, opts) {
    opts = opts || {};
    sx |= 0; sy |= 0; gx |= 0; gy |= 0;
    if (grid.blocked(sx, sy)) return null;
    if (grid.blocked(gx, gy)) {
      if (!opts.nearest) return null;
      var best = null, bd = 1e9;
      for (var yy = 0; yy < grid.h; yy++) for (var xx = 0; xx < grid.w; xx++) {
        if (grid.blocked(xx, yy)) continue;
        var d = Math.abs(xx - gx) + Math.abs(yy - gy);
        if (d < bd) { bd = d; best = [xx, yy]; }
      }
      if (!best) return null;
      gx = best[0]; gy = best[1];
    }
    var W = grid.w, N = W * grid.h;
    var g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    var heap = new Heap(), si = sy * W + sx, gi = gy * W + gx;
    function hf(x, y) { var dx = Math.abs(x - gx), dy = Math.abs(y - gy); return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy); }
    g[si] = 0; heap.push({ i: si, f: hf(sx, sy) });
    var D = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (heap.a.length) {
      var cur = heap.pop().i;
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === gi) break;
      var cx = cur % W, cy = (cur / W) | 0;
      for (var k = 0; k < 8; k++) {
        var nx = cx + D[k][0], ny = cy + D[k][1];
        if (grid.blocked(nx, ny)) continue;
        var diag = k >= 4;
        if (diag && (grid.blocked(cx + D[k][0], cy) || grid.blocked(cx, cy + D[k][1]))) continue;
        var ni = ny * W + nx;
        if (closed[ni]) continue;
        var ng = g[cur] + (diag ? Math.SQRT2 : 1);
        if (ng < g[ni]) { g[ni] = ng; from[ni] = cur; heap.push({ i: ni, f: ng + hf(nx, ny) }); }
      }
    }
    if (from[gi] < 0 && gi !== si) return null;
    var out = [], c = gi;
    while (c !== -1) { out.push({ x: c % W, y: (c / W) | 0 }); c = from[c]; }
    return out.reverse();
  }

  /** Flood fill from (sx, sy): returns Uint8Array(w*h) of reachable tiles (4-neighbour). */
  function reach(grid, sx, sy) {
    var W = grid.w, seen = new Uint8Array(W * grid.h);
    if (grid.blocked(sx, sy)) return seen;
    var q = [sy * W + sx]; seen[q[0]] = 1;
    while (q.length) {
      var c = q.pop(), x = c % W, y = (c / W) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var nx = x + d[0], ny = y + d[1];
        if (grid.blocked(nx, ny)) return;
        var ni = ny * W + nx;
        if (!seen[ni]) { seen[ni] = 1; q.push(ni); }
      });
    }
    return seen;
  }

  return { fromRows: fromRows, circleFree: circleFree, move: move, astar: astar, reach: reach };
});
