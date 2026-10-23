/* window.TW_TEST — only loaded with ?test=1. Lets Playwright jump around, set boards and read state. */
(function (root) {
  'use strict';
  var TW = root.TW, A = TW.app, P = TW.progress, B = TW.board;
  function gm() { return TW.play.state().game; }
  root.TW_TEST = {
    goto: function (tab) { TW.ui.closeAll(); var st = TW.play.state(); if (st.active) TW.play.goHome(); TW.home.go(tab); },
    getSave: function () { return JSON.parse(JSON.stringify(A.S)); },
    setSave: function (o) { A.S = P.sanitize(Object.assign(JSON.parse(JSON.stringify(A.S)), o)); A.persist(); TW.home.refresh(); TW.home.reloadTab(); },
    startLevel: function (n, o) { TW.ui.closeAll(); TW.play.skipTips(); TW.play.start(n, o || {}); },
    openPre: function (n) { TW.play.openPre(n); },
    /** rows in board.js notation; replaces the live board */
    setBoard: function (rows, o) {
      var g = gm(), b = B.parse(rows, o || {}); b.rng = g.board.rng; g.board = b;
      g.goals.forEach(function (x) { x.have = 0; }); TW.play.reload(b);
    },
    state: function () { var g = gm(), s = TW.play.state(); return g ? { status: g.status, movesLeft: g.movesLeft, score: g.score, goals: g.goals, busy: s.busy, over: s.over, level: g.level.n, rows: B.toRows(g.board), w: g.board.w, h: g.board.h, sync: s.view.syncMismatch || 0, syncInfo: s.view.lastSync } : null; },
    swap: function (a, b) { TW.play.swap(a, b); },
    forceWin: function () { TW.play.forceWin(); },
    forceLose: function () { TW.play.forceLose(); },
    cell: function (i) { var v = TW.play.state().view, c = v.cellCenter(i), r = document.querySelector('.gcanvas').getBoundingClientRect(); return { x: r.left + c.x, y: r.top + c.y, size: v.cell() }; },
    fps: function (on) { return TW.play.state().view.fps(on); },
    moves: function () { return B.listMoves(gm().board); },
    hint: function () { return B.findHint(gm().board); },
    sprites: function () { return TW.play.state().view.spriteCount(); }
  };
  root.TW_TEST.ready = true;
})(typeof self !== 'undefined' ? self : this);
