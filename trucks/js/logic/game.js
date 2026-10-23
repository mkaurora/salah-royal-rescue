/* One level in play: board + goals + moves + score + stars + bonus time + the free "+5 moves" + easier try.
 * Pure (no DOM, no storage). Every action returns { valid, events } for the renderer.
 * state.status: 'playing' | 'won' (goals done; call finish() for bonus time + stars) | 'lost' (out of moves).
 * UMD: module.exports in Node, TW.game in the browser. */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var mod = factory(node ? require('./rng.js') : root.TW.rng, node ? require('./board.js') : root.TW.board);
  if (node) module.exports = mod;
  else { root.TW = root.TW || {}; root.TW.game = mod; }
})(typeof self !== 'undefined' ? self : this, function (R, B) {
  'use strict';

  var EXTRA_MOVES = 5, BONUS_PER_MOVE = 250;

  /** Level spec → a ready board (no matches, at least one move). The start layout depends only on the level; the
   *  refills afterwards depend on (level, attempt) so a retry plays a little differently. */
  function buildBoard(L, attempt) {
    var b = B.make(L.w, L.h, L.colors, L.seed);
    for (var i = 0; i < b.n; i++) {
      var ch = L.layout[(i / L.w) | 0].charAt(i % L.w);
      if (ch === '#') b.hole[i] = 1;
      else if (ch >= '1' && ch <= '3') { b.blk[i] = B.CRATE; b.bl[i] = +ch; }
      else if (ch === 'S') { b.blk[i] = B.STONE; b.bl[i] = 1; }
      else if (ch === 'i') B.putTile(b, i, -1, B.ITEM);
      else {
        if (ch === 'o' || ch === 'b') b.oil[i] = 1;
        if (ch === 'c' || ch === 'b') b.chn[i] = 1;
      }
    }
    B.fill(b);
    b.rng = R.rng(R.hashSeed(L.seed + ':' + (attempt || 0)));
    return b;
  }

  function create(L, o) {
    o = o || {};
    var st = {
      level: L, board: buildBoard(L, o.attempt || 0), movesLeft: L.moves, movesUsed: 0, score: 0, status: 'playing',
      extraUsed: false, attempt: o.attempt || 0, bonusMoves: 0, stars: 0,
      goals: L.goals.map(function (g) { return { type: g.type, color: g.color, need: g.n, have: 0 }; })
    };
    if (o.pre) o.pre.forEach(function (k) { placePre(st, k); });
    return st;
  }

  function placePre(st, kind) {
    var s = kind === 'rocket' ? (st.board.rng.next() < 0.5 ? B.ROCKET_H : B.ROCKET_V) : kind === 'dynamite' ? B.BOMB : kind === 'rainbow' ? B.GEM : 0;
    if (!s) return -1;
    return B.placeSpecial(st.board, s, null);
  }

  function goalsDone(st) { return st.goals.every(function (g) { return g.have >= g.need; }); }

  function absorb(st, ctx) {
    var s = ctx.st;
    st.score += ctx.score;
    st.goals.forEach(function (g) {
      var add = g.type === 'color' ? s.col[g.color] : g.type === 'crate' ? s.crate : g.type === 'oil' ? s.oil : g.type === 'item' ? s.item : g.type === 'chain' ? s.chain : 0;
      g.have = Math.min(g.need, g.have + add);
    });
  }

  function afterAction(st, ctx, costsMove) {
    absorb(st, ctx);
    if (costsMove) { st.movesLeft--; st.movesUsed++; }
    if (goalsDone(st)) st.status = 'won';
    else if (st.movesLeft <= 0) st.status = 'lost';
  }

  function swap(st, a, b) {
    if (st.status !== 'playing') return { valid: false, events: [] };
    var r = B.trySwap(st.board, a, b, B.newCtx(st.record !== false));
    if (r.valid) afterAction(st, r.ctx, true);
    return { valid: r.valid, events: r.ctx.ev || [], ctx: r.ctx };
  }

  /** Double-tap a special on the board. */
  function tap(st, i) {
    if (st.status !== 'playing') return { valid: false, events: [] };
    var r = B.tapSpecial(st.board, i, B.newCtx(st.record !== false));
    if (r.valid) afterAction(st, r.ctx, true);
    return { valid: r.valid, events: r.ctx.ev || [], ctx: r.ctx };
  }

  /** In-game boosters (cost no move): 'hammer' (cell i) and 'shuffle'. The caller spends the booster from the save. */
  function useBooster(st, kind, i) {
    if (st.status !== 'playing') return { valid: false, events: [] };
    var ctx = B.newCtx(st.record !== false), r;
    if (kind === 'hammer') { r = B.hammer(st.board, i, ctx); if (!r.valid) return { valid: false, events: [] }; }
    else if (kind === 'shuffle') B.reshuffle(st.board, ctx, true);
    else return { valid: false, events: [] };
    afterAction(st, ctx, false);
    return { valid: true, events: ctx.ev || [], ctx: ctx };
  }

  /** The free "+5 moves" after running out (once per attempt). */
  function extraMoves(st) {
    if (st.status !== 'lost' || st.extraUsed) return false;
    st.extraUsed = true; st.movesLeft += EXTRA_MOVES; st.status = 'playing';
    return true;
  }
  function canExtra(st) { return st.status === 'lost' && !st.extraUsed; }

  function starsFor(L, score) { return score >= L.stars[1] ? 3 : score >= L.stars[0] ? 2 : 1; }

  /** Bonus time after the goals are done: every move left becomes a rocket on the board, then they all fire. Returns the
   *  events; afterwards state.stars is set. */
  function finish(st) {
    if (st.status !== 'won') return { valid: false, events: [] };
    var b = st.board, ctx = B.newCtx(st.record !== false), made = [], k;
    var left = st.movesLeft;
    if (ctx.ev) ctx.ev.push({ t: 'bonusStart', n: left });
    for (k = 0; k < left; k++) {
      var i = B.placeSpecial(b, b.rng.next() < 0.5 ? B.ROCKET_H : B.ROCKET_V, ctx);
      if (i >= 0) made.push(i);
    }
    ctx.score += left * BONUS_PER_MOVE;
    made.forEach(function (i) {
      if (b.has[i] && (b.spc[i] === B.ROCKET_H || b.spc[i] === B.ROCKET_V) && !b.chn[i]) B.tapSpecial(b, i, ctx);
    });
    st.score += ctx.score; st.bonusMoves = left; st.movesLeft = 0;
    st.stars = starsFor(st.level, st.score);
    st.status = 'done';
    return { valid: true, events: ctx.ev || [], ctx: ctx };
  }

  return {
    EXTRA_MOVES: EXTRA_MOVES, BONUS_PER_MOVE: BONUS_PER_MOVE, buildBoard: buildBoard, create: create, swap: swap, tap: tap,
    useBooster: useBooster, extraMoves: extraMoves, canExtra: canExtra, finish: finish, goalsDone: goalsDone, starsFor: starsFor,
    placePre: placePre
  };
});
