/* Level generator: level(n) for n = 1..infinity — pure, deterministic (same n → identical level on every device).
 * Returns { n, seed, w, h, colors, moves, goals[{type,color?,n}], layout[rows], stars[t2,t3], tag, tip, d }.
 * layout chars: . normal · # hole · 1 2 3 crate layers · S stone · o oil · c chained tile · b oil + chain · i item (toolbox).
 * Design + difficulty table: dev/DESIGN.md. UMD: module.exports in Node, TW.levels in the browser. */
(function (root, factory) {
  var R = (typeof module === 'object' && module.exports) ? require('./rng.js') : root.TW.rng;
  var mod = factory(R);
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.TW = root.TW || {}; root.TW.levels = mod; }
})(typeof self !== 'undefined' ? self : this, function (R) {
  'use strict';

  /* Tuning knobs (calibrated with test/bot.js — see dev/DESIGN.md). */
  var COST = { color: 0.3, crate: 0.7, oil: 1.0, item: 10, itemBase: 24, chain: 1.7, base: 6 };   // bot-measured moves per unit of goal (dev/calib.js)
  var SLACK_EASY = 1.7, SLACK_HARD = 1.32;                                      // extra moves factor, d = 0 .. 1
  var STAR_K = [400, 650];                                                      // score per move for 2 / 3 stars

  var INTRO = { 2: 'rocket', 5: 'crate', 8: 'bomb', 12: 'gem', 15: 'crate2', 18: 'oil', 25: 'item', 30: 'chain', 40: 'stone', 60: 'crate3' };
  var TIPS = {
    1: 'Swap two tiles to make a line of 3!',
    2: 'Match 4 in a line to make a Rocket. Swap it to zoom!',
    5: 'Match next to a crate to break it.',
    8: 'An L or T shape makes Dynamite. Boom!',
    12: 'Match 5 in a line to make a Rainbow Gem!',
    15: 'Strong crates need more than one hit.',
    18: 'Match tiles on the oil to clean it up.',
    25: 'Bring the toolbox down to the floor!',
    30: 'Match a chained tile to set it free.',
    40: 'Stone breaks only with a blast!',
    60: 'Some crates have three layers. Keep going!'
  };

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }

  /** 0..1 difficulty: gentle rise to ~400, then gentle waves. */
  function baseDifficulty(n) {
    if (n <= 400) return 0.05 + 0.80 * Math.pow((n - 1) / 399, 0.8);
    return 0.82 + 0.07 * Math.sin(n / 23) + 0.03 * Math.sin(n / 7);
  }
  function tagFor(n) {
    if (n >= 20 && n % 10 === 0) return 'hard';
    if (n >= 12 && n % 10 === 5) return 'breather';
    return 'normal';
  }

  /* ------------------------------------------------------------------ shapes */
  function holesFor(shape, w, h) {
    var out = [], r, c;
    function add(rr, cc) { if (rr >= 0 && cc >= 0 && rr < h && cc < w) out.push(rr * w + cc); }
    switch (shape) {
      case 'corners': add(0, 0); add(0, w - 1); add(h - 1, 0); add(h - 1, w - 1); break;
      case 'corners2':
        add(0, 0); add(0, 1); add(1, 0); add(0, w - 1); add(0, w - 2); add(1, w - 1);
        add(h - 1, 0); add(h - 1, 1); add(h - 2, 0); add(h - 1, w - 1); add(h - 1, w - 2); add(h - 2, w - 1); break;
      case 'center': { var mr = (h >> 1) - 1, mc = (w >> 1) - 1; add(mr, mc); add(mr, mc + 1); add(mr + 1, mc); add(mr + 1, mc + 1); break; }
      case 'sides': { var m = (h >> 1) - 1; add(m, 0); add(m + 1, 0); add(m, w - 1); add(m + 1, w - 1); break; }
      case 'topgap': add(0, (w >> 1) - 1); add(0, w >> 1); add(h - 1, (w >> 1) - 1); add(h - 1, w >> 1); break;
      case 'diamond': for (r = 0; r < h; r++) for (c = 0; c < w; c++) if (Math.min(r, h - 1 - r) + Math.min(c, w - 1 - c) < 2) add(r, c); break;
      case 'plus': for (r = 0; r < h; r++) for (c = 0; c < w; c++) if (Math.min(r, h - 1 - r) < 2 && Math.min(c, w - 1 - c) < 2) add(r, c); break;
    }
    return out;
  }
  var SHAPES = ['corners', 'corners2', 'center', 'sides', 'topgap', 'diamond', 'plus'];

  function connected(hole, w, h) {
    var n = w * h, seen = new Uint8Array(n), start = -1, total = 0, i;
    for (i = 0; i < n; i++) if (!hole[i]) { total++; if (start < 0) start = i; }
    if (start < 0) return false;
    var stack = [start], cnt = 0; seen[start] = 1;
    while (stack.length) {
      i = stack.pop(); cnt++;
      var r = (i / w) | 0, c = i % w, nb = [];
      if (r > 0) nb.push(i - w); if (r < h - 1) nb.push(i + w); if (c > 0) nb.push(i - 1); if (c < w - 1) nb.push(i + 1);
      nb.forEach(function (j) { if (!hole[j] && !seen[j]) { seen[j] = 1; stack.push(j); } });
    }
    return cnt === total;
  }

  /** An item in column c leaves on that column's lowest cell; that cell needs room for at least two different
   *  horizontal 3-lines through it (a corner with a hole beside it is nearly impossible to match). */
  function exitRoom(hole, w, h, c) {
    var r = h - 1;
    while (r >= 0 && hole[r * w + c]) r--;
    if (r < 0) return false;
    var L = 0, R2 = 0, x = c - 1;
    while (x >= 0 && !hole[r * w + x]) { L++; x--; }
    x = c + 1; while (x < w && !hole[r * w + x]) { R2++; x++; }
    var windows = 0;
    for (var a = 0; a <= 2; a++) if (a <= L && 2 - a <= R2) windows++;
    return windows >= 2;
  }

  /* ------------------------------------------------------------------ generation */
  function pickGoalTypes(n, d, rng, colors) {
    var unlocked = ['color'];
    if (n >= 5) unlocked.push('crate');
    if (n >= 18) unlocked.push('oil');
    if (n >= 25) unlocked.push('item');
    if (n >= 30) unlocked.push('chain');
    var count = 1;
    if (n >= 4) count = rng.chance(n < 15 ? 0.35 : n < 60 ? 0.6 : 0.88) ? 2 : 1;
    if (n >= 20 && count === 2 && rng.chance(n < 100 ? 0.15 + 0.4 * d : 0.35 + 0.5 * d)) count = 3;
    var types = [], intro = INTRO[n];
    var forced = intro === 'crate' || intro === 'crate2' || intro === 'crate3' ? 'crate' : intro === 'oil' || intro === 'item' || intro === 'chain' ? intro : null;
    if (forced) types.push(forced);
    if (n < 5) types = ['color'];
    var guard = 0;
    while (types.length < count && guard++ < 40) {
      var t = rng.pick(unlocked);
      if (t === 'color' && types.filter(function (x) { return x === 'color'; }).length >= 2) continue;
      if (t !== 'color' && types.indexOf(t) >= 0) continue;
      types.push(t);
    }
    if (!types.length || (types.indexOf('color') < 0 && n < 20)) types.push('color');
    return types;
  }

  function generate(n, attempt) {
    var rng = R.rng(R.hashSeed('tw-level-' + n + ':' + attempt));
    var tag = tagFor(n);
    var d = clamp(baseDifficulty(n) + (tag === 'hard' ? 0.1 : tag === 'breather' ? -0.2 : 0), 0.02, 1);
    if (INTRO[n]) d = Math.min(d, 0.12 + 0.5 * baseDifficulty(n));          // a new thing is introduced gently
    var colors = 5;
    if (n >= 30 && rng.chance(Math.min(0.6, (n - 30) / 250))) colors = 6;
    if (tag === 'hard' && n >= 100) colors = 6;
    if (tag === 'breather') colors = 5;

    // board shape
    var w = 8, h = 8, holes = [];
    if (n >= 12) {
      var roll = rng.next();
      if (n < 30) { if (roll < 0.25) w = 7; }
      else if (roll < 0.15) w = 7;
      else if (roll < 0.30) h = 9;
      else if (roll < 0.75) {
        if (rng.chance(0.3)) h = 9;
        holes = holesFor(rng.pick(SHAPES), w, h);
      }
    }
    var cells = w * h, holeMask = new Uint8Array(cells);
    holes.forEach(function (i) { holeMask[i] = 1; });
    if (!connected(holeMask, w, h)) { holes = []; holeMask.fill(0); }
    var playable = cells - holes.length;

    var grid = new Array(cells).fill('.');
    holes.forEach(function (i) { grid[i] = '#'; });
    function free(i) { return grid[i] === '.'; }
    function rowOf(i) { return (i / w) | 0; }
    function randomCells(minRow, maxRow, filter) {
      var cs = [];
      for (var i = 0; i < cells; i++) if (free(i) && rowOf(i) >= minRow && rowOf(i) <= maxRow && (!filter || filter(i))) cs.push(i);
      return rng.shuffle(cs);
    }

    var types = pickGoalTypes(n, d, rng, colors);
    if (types.indexOf('item') >= 0) colors = 5;                         // toolbox levels are hard enough with 5 colours
    types.sort(function (a, b) { return (a === 'item' ? 0 : 1) - (b === 'item' ? 0 : 1); });   // items first: crates must keep clear of their columns
    var goals = [], cost = 0;
    var nColorGoals = types.filter(function (t) { return t === 'color'; }).length;
    var multi = types.length > 1 ? 0.85 : 1;
    var palette = rng.shuffle([0, 1, 2, 3, 4].slice(0, colors - 1));    // goal colours skip the last colour, so "easier" can drop it
    var itemCols = [];

    types.forEach(function (t) {
      if (t === 'color') {
        var need = Math.round(lerp(8, 32, d) * multi * (nColorGoals > 1 ? 0.7 : 1));
        if (n < 3) need = 8 + n * 2;
        goals.push({ type: 'color', color: palette.pop(), n: need });
        cost += need * COST.color * (colors === 6 ? 1.1 : 1) * (nColorGoals > 1 ? 1.15 : 1);
      } else if (t === 'item') {
        var k = clamp(1 + (d > 0.4 ? 1 : 0) + (d > 0.75 ? 1 : 0), 1, 3);
        if (n < 40) k = Math.min(k, 2);
        var okCols = [];
        for (var cx = 0; cx < w; cx++) if (exitRoom(holeMask, w, h, cx)) okCols.push(cx);
        var cols = [];
        rng.shuffle(okCols).forEach(function (cc) { if (cols.length < k && cols.every(function (o2) { return Math.abs(o2 - cc) >= 2; })) cols.push(cc); });
        cols.sort();
        var placed = 0;
        cols.forEach(function (c) {
          var r = n < 60 ? 4 : d > 0.6 ? 2 : 3;
          while (r > 0 && holeMask[r * w + c]) r--;
          var i = r * w + c;
          if (holeMask[i]) return;
          if (free(i) && !holeMask[i]) { grid[i] = 'i'; itemCols.push(c); placed++; }
        });
        goals.push({ type: 'item', n: placed });
        cost += placed ? COST.itemBase + (placed - 1) * COST.item : 0;
      } else if (t === 'crate') {
        var cnt = Math.round(lerp(3, 12, d) * multi);
        var minR = n < 5 ? 3 : 2;
        var cs = randomCells(minR, h - 2, function (i) { return grid[i] === '.' && itemCols.indexOf(i % w) < 0; });
        var p2 = n >= 15 ? lerp(0.2, 0.5, d) : 0, p3 = n >= 60 ? lerp(0.1, 0.3, d) : 0;
        var layers = 0, placedC = 0;
        for (var x = 0; x < cs.length && placedC < cnt; x++) {
          var i2 = cs[x];
          if (placedC > 0 && rng.chance(0.4)) {            // clump: prefer a free neighbour of the previous crate
            var nb = [i2 - 1, i2 + 1, i2 - w, i2 + w].filter(function (j) { return j >= 0 && j < cells && cs.indexOf(j) >= 0 && grid[j] === '.'; });
            if (nb.length) i2 = rng.pick(nb);
          }
          var L = 1, q = rng.next();
          if (q < p3) L = 3; else if (q < p3 + p2) L = 2;
          if (INTRO[n] === 'crate') L = 1;
          grid[i2] = String(L); layers += L; placedC++;
        }
        goals.push({ type: 'crate', n: placedC });
        cost += layers * COST.crate;
      } else if (t === 'oil' || t === 'chain') {
        var cnt2 = Math.round((t === 'oil' ? lerp(4, 16, d) : lerp(3, 10, d)) * multi);
        var pool = randomCells(0, h - 1, function (i) { return grid[i] === '.'; });
        var got = 0;
        for (var y = 0; y < pool.length && got < cnt2; y++) { grid[pool[y]] = t === 'oil' ? 'o' : 'c'; got++; }
        goals.push({ type: t, n: got });
        cost += got * COST[t];
      }
    });

    // oil on top of chains (a few) in later levels, for variety — counted as both
    if (n >= 100 && grid.indexOf('o') >= 0 && grid.indexOf('c') >= 0 && rng.chance(0.5)) {
      for (var z = 0; z < cells; z++) if (grid[z] === 'c' && rng.chance(0.3)) { grid[z] = 'b'; }
    }
    // stones (blast-only terrain)
    var stoneCnt = 0;
    if (n >= 40) {
      stoneCnt = Math.round(lerp(2, 7, d) * (tag === 'breather' ? 0.5 : 1));
      var sc = randomCells(2, h - 2, function (i) { return itemCols.indexOf(i % w) < 0 && !holeMask[i]; });
      for (var s = 0; s < sc.length && s < stoneCnt; s++) grid[sc[s]] = 'S';
    }

    var slack = lerp(SLACK_EASY, SLACK_HARD, d) * (tag === 'hard' ? 0.93 : tag === 'breather' ? 1.2 : 1);
    var moves = Math.round((cost + COST.base) * slack * (colors === 6 ? 1.6 : 1) + stoneCnt * 0.4);
    var minMoves = n < 5 ? 16 : n < 15 ? 14 : 12;
    var raw = moves;
    moves = clamp(moves, minMoves, 55);

    var layout = [];
    for (var r = 0; r < h; r++) layout.push(grid.slice(r * w, r * w + w).join(''));
    var colorGoals = goals.filter(function (g) { return g.type === 'color'; });
    if (colorGoals.length && goals.length === 1 && n < 40) goals[0].n = Math.min(goals[0].n, 40);

    return {
      n: n, seed: R.hashSeed('tw-board-' + n), w: w, h: h, colors: colors, moves: moves, goals: goals, layout: layout,
      stars: [Math.round(moves * STAR_K[0]), Math.round(moves * STAR_K[1])], tag: tag, tip: TIPS[n] || null, raw: raw, d: Math.round(d * 1000) / 1000
    };
  }

  /* ------------------------------------------------------------------ validation */
  /** Returns a list of problems (empty = the level is valid and every goal is achievable). */
  function validate(L) {
    var errs = [], w = L.w, h = L.h;
    if (!(w >= 6 && w <= 9 && h >= 6 && h <= 10)) errs.push('size');
    if (L.layout.length !== h || L.layout.some(function (r) { return r.length !== w; })) { errs.push('layout dims'); return errs; }
    if (!(L.colors >= 4 && L.colors <= 6)) errs.push('colors');
    if (!(L.moves >= 8 && L.moves <= 60)) errs.push('moves ' + L.moves);
    if (!(L.goals.length >= 1 && L.goals.length <= 3)) errs.push('goal count');
    if (!(L.stars.length === 2 && L.stars[0] > 0 && L.stars[1] > L.stars[0])) errs.push('stars');
    var cnt = { crate: 0, layers: 0, oil: 0, item: 0, chain: 0, stone: 0, hole: 0 }, hole = new Uint8Array(w * h);
    L.layout.join('').split('').forEach(function (ch, i) {
      if (ch === '#') { cnt.hole++; hole[i] = 1; }
      else if (ch >= '1' && ch <= '3') { cnt.crate++; cnt.layers += +ch; }
      else if (ch === 'S') cnt.stone++;
      else if (ch === 'o') cnt.oil++;
      else if (ch === 'c') cnt.chain++;
      else if (ch === 'b') { cnt.oil++; cnt.chain++; }
      else if (ch === 'i') cnt.item++;
      else if (ch !== '.') errs.push('bad char ' + ch);
    });
    if (!connected(hole, w, h)) errs.push('disconnected');
    if (w * h - cnt.hole - cnt.crate - cnt.stone < 36) errs.push('too small');
    var seenTypes = {};
    L.goals.forEach(function (g) {
      if (!(g.n >= 1)) errs.push('goal n');
      if (g.type === 'color') {
        if (!(g.color >= 0 && g.color < L.colors - 1)) errs.push('goal colour');
        if (g.n > 45) errs.push('colour goal too big');
      } else {
        if (seenTypes[g.type]) errs.push('duplicate goal ' + g.type);
        seenTypes[g.type] = 1;
        if (g.type === 'crate' && g.n > cnt.crate) errs.push('not enough crates');
        if (g.type === 'oil' && g.n > cnt.oil) errs.push('not enough oil');
        if (g.type === 'chain' && g.n > cnt.chain) errs.push('not enough chains');
        if (g.type === 'item' && g.n > cnt.item) errs.push('not enough items');
        if (['crate', 'oil', 'chain', 'item'].indexOf(g.type) < 0) errs.push('goal type ' + g.type);
      }
    });
    // items: no stone below an item in its column; item must start in the top two rows
    for (var i = 0; i < w * h; i++) {
      if (L.layout[(i / w) | 0][i % w] !== 'i') continue;
      if ((i / w | 0) > 4) errs.push('item too low');
      if (!exitRoom(hole, w, h, i % w)) errs.push('item exit cramped');
      for (var j = i; j < w * h; j += w) if (L.layout[(j / w) | 0][j % w] === 'S') errs.push('stone under item');
    }
    return errs;
  }

  var cache = {};
  function level(n) {
    n = Math.max(1, Math.floor(Number(n)) || 1);
    if (cache[n]) return cache[n];
    var L = null;
    for (var a = 0; a < 40 && !L; a++) { var c = generate(n, a); if (!validate(c).length && (c.raw <= 50 || a >= 30)) L = c; }
    if (!L) throw new Error('could not generate a valid level ' + n);
    var keys = Object.keys(cache);
    if (keys.length > 400) delete cache[keys[0]];
    cache[n] = L;
    return L;
  }

  /** "Easier try" version of a level (offered after 3 fails): +40% moves, goals trimmed by 25%, one colour fewer. */
  function easier(L) {
    var E = JSON.parse(JSON.stringify(L));
    E.moves = Math.min(75, Math.round(L.moves * 1.4) + 4);
    E.goals.forEach(function (g) { g.n = Math.max(1, Math.round(g.n * (g.type === 'color' ? 0.75 : 0.85))); });
    if (E.colors > 4) E.colors--;
    E.stars = [Math.round(E.moves * STAR_K[0] * 0.8), Math.round(E.moves * STAR_K[1] * 0.8)];
    E.easier = true;
    return E;
  }

  return {
    level: level, generate: generate, validate: validate, easier: easier, difficulty: baseDifficulty, tagFor: tagFor,
    TIPS: TIPS, INTRO: INTRO, COST: COST, STAR_K: STAR_K
  };
});
