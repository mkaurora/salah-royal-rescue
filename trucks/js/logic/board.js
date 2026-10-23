/* Match-3 board engine — pure, deterministic, no DOM. Every step returns an EVENT LIST the renderer animates; the board
 * itself is already in its final state when the call returns (renderer: play events, then redraw from the board).
 *
 * Cell data lives in parallel typed arrays (index i = row * w + col, row 0 = top):
 *   hole[i]  1 = not part of the board (shape)          blk[i] 0 none / 1 crate / 2 stone     bl[i] block layers left
 *   has[i]   1 = a tile sits here                       col[i] tile colour 0..5 (-1 = rainbow / item, never matches)
 *   spc[i]   0 plain, 1 rocket-H, 2 rocket-V, 3 dynamite, 4 rainbow gem, 5 item (toolbox)
 *   chn[i]   1 = the tile is chained (cannot be swapped; a match or blast frees it, it stays)
 *   oil[i]   1 = oil puddle under the cell (belongs to the CELL; cleared when a tile on it is cleared)
 *   tid[i]   tile id (stable while it falls, so the renderer can tween it)
 * See dev/DESIGN.md for the rules, combo table and event list. UMD: module.exports in Node, TW.board in the browser. */
(function (root, factory) {
  var R = (typeof module === 'object' && module.exports) ? require('./rng.js') : root.TW.rng;
  var mod = factory(R);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.TW = root.TW || {}; root.TW.board = mod; }
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  var PLAIN = 0, ROCKET_H = 1, ROCKET_V = 2, BOMB = 3, GEM = 4, ITEM = 5;
  var CRATE = 1, STONE = 2;
  var MAX_COLORS = 6;

  /* ------------------------------------------------------------------ construction */
  function make(w, h, colors, seed) {
    var n = w * h;
    return {
      w: w, h: h, n: n, colors: colors || 5, seed: seed == null ? 1 : seed,
      hole: new Uint8Array(n), blk: new Uint8Array(n), bl: new Uint8Array(n),
      has: new Uint8Array(n), col: new Int8Array(n).fill(-1), spc: new Uint8Array(n), chn: new Uint8Array(n),
      oil: new Uint8Array(n), tid: new Int32Array(n), nextId: 1,
      rng: R.rng(seed == null ? 1 : seed)
    };
  }

  function clone(b) {
    var c = make(b.w, b.h, b.colors, b.seed);
    ['hole', 'blk', 'bl', 'has', 'col', 'spc', 'chn', 'oil', 'tid'].forEach(function (k) { c[k].set(b[k]); });
    c.nextId = b.nextId; c.rng.setState(b.rng.state());
    return c;
  }

  function putTile(b, i, color, spc) {
    b.has[i] = 1; b.col[i] = color; b.spc[i] = spc || PLAIN; b.chn[i] = 0; b.tid[i] = b.nextId++;
  }

  /* Test / debug notation. rows = array of strings, tokens separated by spaces:
   *   a..f plain tile (colour 0..5), optional H V B = rocket-H / rocket-V / dynamite, e.g. "cB"
   *   G rainbow gem · I item (toolbox) · # hole · _ empty cell · x1 x2 x3 crate with layers · s / s2 stone
   *   suffix ! = chained tile, ~ = oil puddle under the cell (e.g. "a~", "bH!~") */
  function parse(rows, o) {
    o = o || {};
    var grid = rows.map(function (r) { return r.trim().split(/\s+/); });
    var h = grid.length, w = grid[0].length;
    var b = make(w, h, o.colors || 6, o.seed == null ? 1 : o.seed);
    grid.forEach(function (row, r) {
      row.forEach(function (t, c) {
        var i = r * w + c, ch = t.charAt(0), rest = t.slice(1);
        if (ch === '#') { b.hole[i] = 1; return; }
        if (ch === '_') { return; }
        if (ch === 'x') { b.blk[i] = CRATE; b.bl[i] = +rest.charAt(0) || 1; return; }
        if (ch === 's') { b.blk[i] = STONE; b.bl[i] = +rest.charAt(0) || 1; return; }
        if (ch === 'G') putTile(b, i, -1, GEM);
        else if (ch === 'I') putTile(b, i, -1, ITEM);
        else {
          var k = ch.charCodeAt(0) - 97;
          if (k < 0 || k >= MAX_COLORS) throw new Error('bad token ' + t);
          var s = PLAIN;
          if (rest.charAt(0) === 'H') s = ROCKET_H; else if (rest.charAt(0) === 'V') s = ROCKET_V; else if (rest.charAt(0) === 'B') s = BOMB;
          putTile(b, i, k, s);
        }
        if (t.indexOf('!') > 0) b.chn[i] = 1;
        if (t.indexOf('~') > 0) b.oil[i] = 1;
      });
    });
    return b;
  }

  function toRows(b) {
    var rows = [];
    for (var r = 0; r < b.h; r++) {
      var row = [];
      for (var c = 0; c < b.w; c++) {
        var i = r * b.w + c, t;
        if (b.hole[i]) t = '#';
        else if (b.blk[i]) t = (b.blk[i] === CRATE ? 'x' : 's') + b.bl[i];
        else if (!b.has[i]) t = '_';
        else if (b.spc[i] === GEM) t = 'G';
        else if (b.spc[i] === ITEM) t = 'I';
        else t = String.fromCharCode(97 + b.col[i]) + ['', 'H', 'V', 'B'][b.spc[i]];
        if (b.has[i] && b.chn[i]) t += '!';
        if (b.oil[i]) t += '~';
        row.push(t);
      }
      rows.push(row.join(' '));
    }
    return rows;
  }

  /** Plain snapshot of one tile (used in events and by the renderer). */
  function tile(b, i) { return b.has[i] ? { id: b.tid[i], c: b.col[i], s: b.spc[i], ch: b.chn[i], i: i } : null; }

  /* ------------------------------------------------------------------ matching */
  function matchable(b, i) { return b.has[i] === 1 && b.col[i] >= 0; }

  /** Length of the same-colour line through cell i (max of horizontal and vertical). Used for fast move checks. */
  function lineAt(b, i) {
    var k = b.col[i];
    if (!b.has[i] || k < 0) return 0;
    var w = b.w, h = b.h, r = (i / w) | 0, c = i - r * w, n, x, best = 1;
    n = 1; x = c - 1; while (x >= 0 && b.has[r * w + x] && b.col[r * w + x] === k) { n++; x--; }
    x = c + 1; while (x < w && b.has[r * w + x] && b.col[r * w + x] === k) { n++; x++; }
    if (n > best) best = n;
    n = 1; x = r - 1; while (x >= 0 && b.has[x * w + c] && b.col[x * w + c] === k) { n++; x--; }
    x = r + 1; while (x < h && b.has[x * w + c] && b.col[x * w + c] === k) { n++; x++; }
    if (n > best) best = n;
    return best;
  }

  /** All matches on the board, merged into groups: runs of >= 3 same-colour tiles; runs that share a tile merge
   *  (that is how L / T / + shapes are found). Group = { color, cells[], runs[{dir:0 row|1 col, cells[]}] }. */
  function findMatches(b) {
    var w = b.w, h = b.h, runs = [], r, c, k, i, j;
    for (r = 0; r < h; r++) {
      c = 0;
      while (c < w) {
        i = r * w + c;
        if (!matchable(b, i)) { c++; continue; }
        k = c + 1;
        while (k < w && matchable(b, r * w + k) && b.col[r * w + k] === b.col[i]) k++;
        if (k - c >= 3) { var cells = []; for (j = c; j < k; j++) cells.push(r * w + j); runs.push({ dir: 0, color: b.col[i], cells: cells }); }
        c = k;
      }
    }
    for (c = 0; c < w; c++) {
      r = 0;
      while (r < h) {
        i = r * w + c;
        if (!matchable(b, i)) { r++; continue; }
        k = r + 1;
        while (k < h && matchable(b, k * w + c) && b.col[k * w + c] === b.col[i]) k++;
        if (k - r >= 3) { var cs = []; for (j = r; j < k; j++) cs.push(j * w + c); runs.push({ dir: 1, color: b.col[i], cells: cs }); }
        r = k;
      }
    }
    if (!runs.length) return runs;
    var parent = runs.map(function (_, x) { return x; });
    function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
    var owner = {};
    runs.forEach(function (run, x) {
      run.cells.forEach(function (cell) {
        if (owner[cell] !== undefined) parent[find(x)] = find(owner[cell]); else owner[cell] = x;
      });
    });
    var groups = {}, out = [];
    runs.forEach(function (run, x) {
      var g = find(x);
      if (!groups[g]) { groups[g] = { color: run.color, cells: [], runs: [] }; out.push(groups[g]); }
      groups[g].runs.push(run);
      run.cells.forEach(function (cell) { if (groups[g].cells.indexOf(cell) < 0) groups[g].cells.push(cell); });
    });
    return out;
  }

  /** What a group creates: 'G' rainbow (5+ in a line), 'B' dynamite (L / T / + shape), 'H' / 'V' rocket (4 in a line,
   *  fires along the line), or 0. */
  function groupKind(g) {
    var longest = null, dirs = 0;
    g.runs.forEach(function (run) { dirs |= (run.dir + 1); if (!longest || run.cells.length > longest.cells.length) longest = run; });
    if (longest.cells.length >= 5) return { s: GEM, run: longest };
    if (dirs === 3) return { s: BOMB, run: longest };
    if (longest.cells.length === 4) return { s: longest.dir === 0 ? ROCKET_H : ROCKET_V, run: longest };
    return { s: 0, run: longest };
  }

  /* ------------------------------------------------------------------ moves */
  function swapRaw(b, i, j) {
    var t = b.col[i]; b.col[i] = b.col[j]; b.col[j] = t;
    t = b.spc[i]; b.spc[i] = b.spc[j]; b.spc[j] = t;
    t = b.tid[i]; b.tid[i] = b.tid[j]; b.tid[j] = t;
    t = b.chn[i]; b.chn[i] = b.chn[j]; b.chn[j] = t;
    t = b.has[i]; b.has[i] = b.has[j]; b.has[j] = t;
  }
  function isSpecial(s) { return s >= ROCKET_H && s <= GEM; }

  /** Would swapping adjacent cells i and j be a legal move? (does not change the board) */
  function moveValid(b, i, j) {
    if (i === j || !b.has[i] || !b.has[j] || b.chn[i] || b.chn[j]) return false;
    var w = b.w, d = i > j ? i - j : j - i;
    if (d !== 1 && d !== w) return false;
    if (d === 1 && ((i / w) | 0) !== ((j / w) | 0)) return false;
    var si = b.spc[i], sj = b.spc[j];
    if (si === ITEM || sj === ITEM) {
      if (si === sj || isSpecial(si) || isSpecial(sj)) return false;     // an item may only move to help a plain tile match
      swapRaw(b, i, j);
      var ok = lineAt(b, si === ITEM ? i : j) >= 3;                    // the plain tile now sits where the item was
      swapRaw(b, i, j);
      return ok;
    }
    if (isSpecial(si) || isSpecial(sj)) return true;
    swapRaw(b, i, j);
    var m = lineAt(b, i) >= 3 || lineAt(b, j) >= 3;
    swapRaw(b, i, j);
    return m;
  }

  /** Every legal swap as { a, b } (a < b: right or down neighbour). */
  function listMoves(b, firstOnly) {
    var out = [], w = b.w, h = b.h;
    for (var i = 0; i < b.n; i++) {
      if (!b.has[i]) continue;
      var c = i % w;
      if (c < w - 1 && moveValid(b, i, i + 1)) { out.push({ a: i, b: i + 1 }); if (firstOnly) return out; }
      if (i + w < b.n && moveValid(b, i, i + w)) { out.push({ a: i, b: i + w }); if (firstOnly) return out; }
    }
    return out;
  }
  function hasMove(b) { return listMoves(b, true).length > 0; }

  /** A good move to wiggle as a hint (prefers moves that make long lines / involve specials). */
  function findHint(b) {
    var moves = listMoves(b), best = null, bs = -1;
    for (var x = 0; x < moves.length; x++) {
      var m = moves[x], s;
      if (isSpecial(b.spc[m.a]) || isSpecial(b.spc[m.b])) s = 10;
      else { swapRaw(b, m.a, m.b); s = Math.max(lineAt(b, m.a), lineAt(b, m.b)); swapRaw(b, m.a, m.b); }
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  }

  /* ------------------------------------------------------------------ simulation context */
  function newCtx(record) {
    return {
      ev: record === false ? null : [], cascade: 0, mult: 1, score: 0, wave: 0,
      st: { col: [0, 0, 0, 0, 0, 0], crate: 0, stone: 0, oil: 0, item: 0, chain: 0, tiles: 0, specials: 0, hits: 0, made: 0 }
    };
  }

  function commonColor(b) {
    var cnt = [0, 0, 0, 0, 0, 0], best = 0;
    for (var i = 0; i < b.n; i++) if (b.has[i] && b.col[i] >= 0) cnt[b.col[i]]++;
    for (var k = 1; k < b.colors; k++) if (cnt[k] > cnt[best]) best = k;
    return best;
  }

  /* ------------------------------------------------------------------ clearing */
  function clearTile(b, ctx, i, wave) {
    var s = b.spc[i];
    if (ctx.ev) ctx.ev.push({ t: 'clear', i: i, id: b.tid[i], c: b.col[i], s: s, w: wave, n: ctx.cascade });
    if (b.col[i] >= 0) ctx.st.col[b.col[i]]++;
    ctx.st.tiles++;
    ctx.score += Math.round(20 * ctx.mult);
    if (b.oil[i]) { b.oil[i] = 0; ctx.st.oil++; ctx.score += 30; if (ctx.ev) ctx.ev.push({ t: 'oil', i: i, w: wave }); }
    b.has[i] = 0; b.chn[i] = 0; b.spc[i] = PLAIN; b.col[i] = -1;
  }

  function damageBlock(b, ctx, i, wave) {
    if (!b.blk[i]) return;
    b.bl[i]--; ctx.st.hits++;
    var kind = b.blk[i];
    if (b.bl[i] <= 0) {
      b.blk[i] = 0; b.bl[i] = 0;
      if (kind === CRATE) ctx.st.crate++; else ctx.st.stone++;
      ctx.score += 60;
    } else ctx.score += 15;
    if (ctx.ev) ctx.ev.push({ t: kind === CRATE ? 'crate' : 'stone', i: i, l: b.bl[i], w: wave });
  }

  /** A blast / match touches cell i. Chained tiles are only freed; items are immune; specials queue their own effect. */
  function hit(b, ctx, i, wave, queue) {
    if (b.hole[i]) return;
    if (b.blk[i]) { damageBlock(b, ctx, i, wave); return; }
    if (!b.has[i] || b.spc[i] === ITEM) return;
    if (b.chn[i]) {
      b.chn[i] = 0; ctx.st.chain++; ctx.score += 40;
      if (ctx.ev) ctx.ev.push({ t: 'chain', i: i, id: b.tid[i], w: wave });
      return;
    }
    var s = b.spc[i];
    if (isSpecial(s)) queue.push({ kind: s === ROCKET_H ? 'H' : s === ROCKET_V ? 'V' : s === BOMB ? 'B' : 'G', i: i, col: b.col[i], target: -1 });
    clearTile(b, ctx, i, wave);
  }

  function targets(b, act) {
    var w = b.w, h = b.h, r = (act.i / w) | 0, c = act.i % w, mark = new Uint8Array(b.n), out = [], x, y;
    function add(rr, cc) { if (rr < 0 || cc < 0 || rr >= h || cc >= w) return; var j = rr * w + cc; if (!mark[j]) { mark[j] = 1; out.push(j); } }
    function row(rr) { for (x = 0; x < w; x++) add(rr, x); }
    function colm(cc) { for (y = 0; y < h; y++) add(y, cc); }
    function box(rad) { for (y = r - rad; y <= r + rad; y++) for (x = c - rad; x <= c + rad; x++) add(y, x); }
    switch (act.kind) {
      case 'H': row(r); break;
      case 'V': colm(c); break;
      case 'cross': row(r); colm(c); break;
      case 'B': box(2); break;
      case 'big': box(3); break;
      case 'rb': for (y = r - 1; y <= r + 1; y++) row(y); for (x = c - 1; x <= c + 1; x++) colm(x); break;
      case 'G': for (var i = 0; i < b.n; i++) if (b.has[i] && b.col[i] === act.target) out.push(i); break;
      case 'all': for (var j = 0; j < b.n; j++) if (!b.hole[j]) out.push(j); break;
    }
    return out;
  }

  /** Run a list of activations wave by wave (a special hit by a blast fires in the next wave). */
  function runActs(b, ctx, acts, wave) {
    var guard = 0;
    while (acts.length && guard++ < 60) {
      var next = [];
      for (var x = 0; x < acts.length; x++) {
        var a = acts[x];
        if (a.consume) { if (!b.has[a.i]) continue; clearTile(b, ctx, a.i, wave); }
        if (a.kind === 'G' && a.target < 0) a.target = commonColor(b);
        var cells = targets(b, a);
        ctx.st.specials++; ctx.score += 80;
        if (ctx.ev) ctx.ev.push({ t: 'blast', kind: a.kind, i: a.i, c: a.col, cells: cells, w: wave });
        for (var y = 0; y < cells.length; y++) hit(b, ctx, cells[y], wave, next);
      }
      acts = next; wave++;
    }
  }

  /* ------------------------------------------------------------------ gravity + refill */
  function collectItems(b, ctx) {
    var got = 0, w = b.w;
    for (var i = 0; i < b.n; i++) {
      if (!b.has[i] || b.spc[i] !== ITEM) continue;
      var r = (i / w) | 0;
      if (r === b.h - 1 || b.hole[i + w]) {
        if (ctx.ev) ctx.ev.push({ t: 'item', i: i, id: b.tid[i] });
        b.has[i] = 0; b.spc[i] = PLAIN; b.col[i] = -1; b.chn[i] = 0;
        ctx.st.item++; ctx.score += 200; got++;
      }
    }
    return got;
  }

  /** Tiles fall straight down; a cell under a crate / stone is fed diagonally; cells under a hole or the top edge (or
   *  with no diagonal feeder at all) spawn new tiles. Emits one 'fall' event per pass; collects items that reached the
   *  bottom and falls again. */
  function fall(b, ctx) {
    var w = b.w, h = b.h, guard = 0, got;
    do {
      var start = null, spawns = null, cnt = null;
      if (ctx.ev) { start = {}; spawns = []; cnt = new Int8Array(w); for (var q = 0; q < b.n; q++) if (b.has[q]) start[b.tid[q]] = q; }
      var changed;
      do {
        changed = false;
        for (var r = h - 1; r >= 0; r--) {
          for (var c = 0; c < w; c++) {
            var i = r * w + c;
            if (b.hole[i] || b.blk[i] || b.has[i]) continue;
            var src = -1;
            if (r === 0) src = -2;
            else {
              var u = i - w;
              if (b.hole[u]) src = -2;
              else if (!b.blk[u]) { if (b.has[u]) src = u; }
              else {
                var L = c > 0 ? u - 1 : -1, Rr = c < w - 1 ? u + 1 : -1;
                var lc = L >= 0 && !b.hole[L] && !b.blk[L], rc = Rr >= 0 && !b.hole[Rr] && !b.blk[Rr];
                if (lc && b.has[L]) src = L; else if (rc && b.has[Rr]) src = Rr; else if (!lc && !rc) src = -2;
              }
            }
            if (src >= 0) {
              b.has[i] = 1; b.col[i] = b.col[src]; b.spc[i] = b.spc[src]; b.chn[i] = b.chn[src]; b.tid[i] = b.tid[src];
              b.has[src] = 0; b.chn[src] = 0; b.spc[src] = PLAIN; b.col[src] = -1;
              changed = true;
            } else if (src === -2) {
              b.has[i] = 1; b.col[i] = (b.rng.next() * b.colors) | 0; b.spc[i] = PLAIN; b.chn[i] = 0; b.tid[i] = b.nextId++;
              if (spawns) { spawns.push({ id: b.tid[i], c: b.col[i], to: i, fr: r - 1 - cnt[c] }); cnt[c]++; }
              changed = true;
            }
          }
        }
      } while (changed && ++guard < 200);
      if (ctx.ev) {
        var moves = [], where = {};
        for (var p = 0; p < b.n; p++) if (b.has[p]) { where[b.tid[p]] = p; if (start[b.tid[p]] !== undefined && start[b.tid[p]] !== p) moves.push({ id: b.tid[p], from: start[b.tid[p]], to: p }); }
        spawns.forEach(function (sp) { if (where[sp.id] !== undefined) sp.to = where[sp.id]; });   // final cell (a spawned tile may keep falling in the same pass)
        if (moves.length || spawns.length) ctx.ev.push({ t: 'fall', moves: moves, spawns: spawns });
      }
      got = collectItems(b, ctx);
    } while (got && guard < 400);
  }

  /* ------------------------------------------------------------------ match step */
  function pickCreation(b, g, pref) {
    var k = groupKind(g);
    if (!k.s) return null;
    var cands = g.cells.filter(function (i) { return b.spc[i] === PLAIN && !b.chn[i]; });
    if (!cands.length) return null;
    var cell = -1, x;
    if (pref) for (x = 0; x < pref.length; x++) if (cands.indexOf(pref[x]) >= 0) { cell = pref[x]; break; }
    if (cell < 0 && k.s === BOMB) {
      var h0 = g.runs.filter(function (r) { return r.dir === 0; }), v0 = g.runs.filter(function (r) { return r.dir === 1; });
      outer: for (var a = 0; a < h0.length; a++) for (var c = 0; c < v0.length; c++) for (var y = 0; y < h0[a].cells.length; y++) {
        if (v0[c].cells.indexOf(h0[a].cells[y]) >= 0 && cands.indexOf(h0[a].cells[y]) >= 0) { cell = h0[a].cells[y]; break outer; }
      }
    }
    if (cell < 0) { var mid = k.run.cells[k.run.cells.length >> 1]; cell = cands.indexOf(mid) >= 0 ? mid : cands[0]; }
    return { i: cell, s: k.s, c: g.color };
  }

  function stepMatches(b, ctx, groups, pref) {
    ctx.cascade++;
    ctx.mult = Math.min(4, 1 + 0.5 * (ctx.cascade - 1));
    if (ctx.ev) ctx.ev.push({ t: 'cascade', n: ctx.cascade });
    var acts = [], creations = [], adj = new Uint8Array(b.n), w = b.w, h = b.h;
    groups.forEach(function (g) {
      var cr = pickCreation(b, g, pref);
      if (cr) creations.push(cr);
      g.cells.forEach(function (i) {
        if (cr && i === cr.i) return;
        hit(b, ctx, i, 0, acts);
      });
      g.cells.forEach(function (i) {
        var r = (i / w) | 0, c = i % w;
        if (r > 0) adj[i - w] = 1; if (r < h - 1) adj[i + w] = 1; if (c > 0) adj[i - 1] = 1; if (c < w - 1) adj[i + 1] = 1;
      });
    });
    for (var i = 0; i < b.n; i++) if (adj[i] && b.blk[i] === CRATE) damageBlock(b, ctx, i, 0);
    runActs(b, ctx, acts, 1);
    creations.forEach(function (cr) {
      if (b.has[cr.i] && b.chn[cr.i]) b.chn[cr.i] = 0;
      b.has[cr.i] = 1; b.col[cr.i] = cr.s === GEM ? -1 : cr.c; b.spc[cr.i] = cr.s; b.tid[cr.i] = b.nextId++; b.chn[cr.i] = 0;
      ctx.score += 60; ctx.st.made += cr.s === GEM ? 8 : cr.s === BOMB ? 5 : 3;
      if (ctx.ev) ctx.ev.push({ t: 'create', i: cr.i, s: cr.s, c: b.col[cr.i], id: b.tid[cr.i] });
    });
  }

  /** Resolve everything after a move: optional initial special activations, then match / fall / refill until calm,
   *  then guarantee a valid move (reshuffle if needed). */
  function settle(b, ctx, acts, pref) {
    var guard = 0;
    if (acts && acts.length) { ctx.cascade++; ctx.mult = 1 + 0.5 * (ctx.cascade - 1); runActs(b, ctx, acts, 0); fall(b, ctx); }
    for (;;) {
      var groups = findMatches(b);
      if (!groups.length || guard++ > 80) break;
      stepMatches(b, ctx, groups, pref); pref = null;
      fall(b, ctx);
    }
    if (!hasMove(b)) reshuffle(b, ctx);
  }

  /* ------------------------------------------------------------------ reshuffle */
  /** Permute movable plain tiles until there is no instant match and at least one move. Always succeeds (last resort:
   *  turn one tile into a rocket, which can always be swapped). Emits { t:'reshuffle', moves, recolor }. */
  function reshuffle(b, ctx, force) {
    var cells = [], i;
    for (i = 0; i < b.n; i++) if (b.has[i] && b.spc[i] === PLAIN && !b.chn[i]) cells.push(i);
    var ev = { t: 'reshuffle', moves: [], recolor: [] };
    var orig = cells.map(function (j) { return { id: b.tid[j], c: b.col[j] }; });
    function apply(perm) {
      cells.forEach(function (j, x) { b.col[j] = orig[perm[x]].c; b.tid[j] = orig[perm[x]].id; });
    }
    var ok = false, perm, t;
    for (t = 0; t < 120 && !ok; t++) {
      perm = b.rng.shuffle(cells.map(function (_, x) { return x; }));
      apply(perm);
      ok = findMatches(b).length === 0 && hasMove(b);
    }
    if (ok) cells.forEach(function (j, x) { if (perm[x] !== x) ev.moves.push({ id: b.tid[j], from: cells[perm[x]], to: j }); });
    else {
      for (t = 0; t < 60 && !ok; t++) {          // recolour with fresh random tiles that cannot match
        cells.forEach(function (j) { b.col[j] = -1; });
        cells.forEach(function (j) {
          var bad = {}, w = b.w, r = (j / w) | 0, c = j % w, k;
          if (c >= 2 && b.col[j - 1] >= 0 && b.col[j - 1] === b.col[j - 2] && b.has[j - 1] && b.has[j - 2]) bad[b.col[j - 1]] = 1;
          if (r >= 2 && b.col[j - w] >= 0 && b.col[j - w] === b.col[j - 2 * w] && b.has[j - w] && b.has[j - 2 * w]) bad[b.col[j - w]] = 1;
          do { k = (b.rng.next() * b.colors) | 0; } while (bad[k] && Object.keys(bad).length < b.colors);
          b.col[j] = k;
        });
        ok = findMatches(b).length === 0 && hasMove(b);
      }
      cells.forEach(function (j, x) { b.tid[j] = orig[x].id; ev.recolor.push({ i: j, c: b.col[j], id: b.tid[j] }); });
      if (!ok && cells.length) {                 // last resort: a rocket always makes a legal swap
        var j0 = cells[0];
        b.spc[j0] = ROCKET_H; ev.recolor.push({ i: j0, c: b.col[j0], s: ROCKET_H, id: b.tid[j0] });
      }
    }
    if (ctx && ctx.ev) ctx.ev.push(ev);
    return ev;
  }

  /* ------------------------------------------------------------------ player actions */
  function activationFor(b, i, target) {
    var s = b.spc[i];
    return { kind: s === ROCKET_H ? 'H' : s === ROCKET_V ? 'V' : s === BOMB ? 'B' : 'G', i: i, col: b.col[i], target: target == null ? -1 : target, consume: true };
  }

  /** Swap two adjacent tiles. Returns { valid, ctx } (ctx.ev = events, ctx.st = what was collected, ctx.score).
   *  An invalid swap leaves the board untouched and emits { t:'swap', ok:false } (animate there and back). */
  function trySwap(b, a, c, ctx) {
    ctx = ctx || newCtx();
    if (!moveValid(b, a, c)) { if (ctx.ev) ctx.ev.push({ t: 'swap', a: a, b: c, ok: false }); return { valid: false, ctx: ctx }; }
    swapRaw(b, a, c);
    if (ctx.ev) ctx.ev.push({ t: 'swap', a: a, b: c, ok: true });
    // The tile dragged from a now sits at c (X), the one from c sits at a (Y).
    var X = b.spc[c], Y = b.spc[a], acts = [];
    if (isSpecial(X) && isSpecial(Y)) acts = comboActs(b, ctx, a, c);
    else if (X === GEM || Y === GEM) {
      var gi = X === GEM ? c : a, oi = X === GEM ? a : c;
      acts = [activationFor(b, gi, b.col[oi])];
    } else if (isSpecial(X)) acts = [activationFor(b, c)];
    else if (isSpecial(Y)) acts = [activationFor(b, a)];
    settle(b, ctx, acts, [a, c]);
    return { valid: true, ctx: ctx };
  }

  /** Two specials swapped (see DESIGN combo table). Centre of the effect = the cell the dragged tile landed on (c). */
  function comboActs(b, ctx, a, c) {
    var x = b.spc[a], y = b.spc[c], rocket = function (s) { return s === ROCKET_H || s === ROCKET_V; };
    if (x === GEM && y === GEM) { clearTile(b, ctx, a, 0); return [{ kind: 'all', i: c, col: -1, target: -1, consume: true }]; }
    if (x === GEM || y === GEM) {
      var other = x === GEM ? c : a, gem = x === GEM ? a : c;
      var os = b.spc[other], color = b.col[other], acts = [], n = 0;
      var make = rocket(os) ? null : BOMB;
      for (var i = 0; i < b.n; i++) {
        if (!b.has[i] || b.spc[i] !== PLAIN || b.col[i] !== color || i === other) continue;
        b.spc[i] = make || (n++ % 2 ? ROCKET_V : ROCKET_H);
        if (ctx.ev) ctx.ev.push({ t: 'convert', i: i, s: b.spc[i], id: b.tid[i] });
        acts.push(activationFor(b, i));
      }
      acts.unshift(activationFor(b, other));
      // the gem itself is spent
      clearTile(b, ctx, gem, 0);
      return acts;
    }
    var kind = rocket(x) && rocket(y) ? 'cross' : (rocket(x) || rocket(y)) ? 'rb' : 'big';
    clearTile(b, ctx, a, 0);
    return [{ kind: kind, i: c, col: b.col[c], target: -1, consume: true }];
  }

  /** Double-tap a special in place. Returns { valid, ctx }. */
  function tapSpecial(b, i, ctx) {
    ctx = ctx || newCtx();
    if (!b.has[i] || b.chn[i] || !isSpecial(b.spc[i])) return { valid: false, ctx: ctx };
    settle(b, ctx, [activationFor(b, i)], null);
    return { valid: true, ctx: ctx };
  }

  /** Hammer booster: breaks the tile / one block layer at i. */
  function hammer(b, i, ctx) {
    ctx = ctx || newCtx();
    if (b.hole[i]) return { valid: false, ctx: ctx };
    var acts = [];
    if (b.blk[i]) hit(b, ctx, i, 0, acts);
    else if (b.has[i] && b.spc[i] !== ITEM) { b.chn[i] = 0; hit(b, ctx, i, 0, acts); }
    else return { valid: false, ctx: ctx };
    settle(b, ctx, acts, null);
    return { valid: true, ctx: ctx };
  }

  /** Turn a random plain tile into a special (pre-level boosters, bonus time). Returns the cell or -1. */
  function placeSpecial(b, s, ctx, avoid) {
    var cells = [];
    for (var i = 0; i < b.n; i++) if (b.has[i] && b.spc[i] === PLAIN && !b.chn[i] && !(avoid && avoid[i])) cells.push(i);
    if (!cells.length) return -1;
    var i0 = cells[(b.rng.next() * cells.length) | 0];
    b.spc[i0] = s; if (s === GEM) b.col[i0] = -1;
    b.tid[i0] = b.nextId++;
    if (ctx && ctx.ev) ctx.ev.push({ t: 'create', i: i0, s: s, c: b.col[i0], id: b.tid[i0] });
    return i0;
  }

  /* ------------------------------------------------------------------ initial fill */
  /** Fill every empty tile-capable cell (except those already holding something) with random colours so that there is
   *  no match, then make sure a move exists. */
  function fill(b) {
    var w = b.w;
    for (var attempt = 0; attempt < 40; attempt++) {
      for (var i = 0; i < b.n; i++) {
        if (b.hole[i] || b.blk[i] || (b.has[i] && b.spc[i] === ITEM)) continue;
        var keepChain = b.chn[i];
        b.has[i] = 0;
        var r = (i / w) | 0, c = i % w, bad = {}, k, tries = 0;
        if (c >= 2 && b.has[i - 1] && b.has[i - 2] && b.col[i - 1] === b.col[i - 2]) bad[b.col[i - 1]] = 1;
        if (r >= 2 && b.has[i - w] && b.has[i - 2 * w] && b.col[i - w] === b.col[i - 2 * w]) bad[b.col[i - w]] = 1;
        do { k = (b.rng.next() * b.colors) | 0; } while (bad[k] && ++tries < 50);
        putTile(b, i, k, PLAIN); b.chn[i] = keepChain;
      }
      if (findMatches(b).length === 0 && hasMove(b)) return b;
    }
    reshuffle(b, null);
    return b;
  }

  return {
    PLAIN: PLAIN, ROCKET_H: ROCKET_H, ROCKET_V: ROCKET_V, BOMB: BOMB, GEM: GEM, ITEM: ITEM, CRATE: CRATE, STONE: STONE,
    make: make, clone: clone, parse: parse, toRows: toRows, tile: tile, putTile: putTile, fill: fill,
    findMatches: findMatches, groupKind: groupKind, lineAt: lineAt, moveValid: moveValid, listMoves: listMoves,
    hasMove: hasMove, findHint: findHint, newCtx: newCtx, fall: fall, settle: settle, reshuffle: reshuffle,
    trySwap: trySwap, tapSpecial: tapSpecial, hammer: hammer, placeSpecial: placeSpecial, commonColor: commonColor,
    isSpecial: isSpecial, swapRaw: swapRaw
  };
});
