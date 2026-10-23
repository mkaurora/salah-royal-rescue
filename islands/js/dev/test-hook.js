/* window.SI_TEST — only loaded with ?test=1. Lets Playwright jump around, set saves, teleport, start minigames, force wins, answer. */
(function (root) {
  'use strict';
  var SI = root.SI, A = SI.app, ui = SI.ui, P = SI.progress, Q = SI.quests;
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  root.SI_TEST = {
    goto: function (screen, args) { ui.closeAll(); ui.go(screen, args || {}); },
    screen: function () { return ui.current(); },
    getSave: function () { return clone(A.S); },
    setSave: function (o) { A.S = P.sanitize(Object.assign(clone(A.S), o)); A.persist(); if (SI.home) SI.home.refresh(); if (SI.world && ui.current() === 'world') SI.world.refresh(); },
    reset: function () { A.S = P.newSave(); A.persist(); },
    teleport: function (x, y) { SI.world.teleport(x, y); },
    teleportTo: function (id) { var isl = SI.world.island(), o = SI.islands.objects(isl).filter(function (q) { return q.id === id; })[0]; if (o) SI.world.teleport(o.x + 0.5, o.y + 1.2 > isl.h ? o.y + 0.5 : o.y + 0.5); return !!o; },
    startMinigame: function (game, level) { ui.closeAll(); SI.play.start(game, level || 1); },
    openMinigame: function (game) { SI.play.open(game, 1); },
    forceWin: function (game, level, stars) {
      var MG = SI.minigames, sc = stars === 3 || stars == null ? MG.perfectScore(game, level) : MG.passScore(game, level);
      return SI.play.finish(game, level, sc);
    },
    /** answer the open question correctly (or wrongly) through the real DOM controls */
    answerNow: function (right) { try { return SI_TEST.answerNow0(right); } catch (e) { return 'err'; } },
    answerNow0: function (right) {
      var cur = SI.game.current; if (!cur) return 'none'; var q = cur.q, ans = String(q.answer), $ = function (s) { return Array.prototype.slice.call(document.querySelectorAll('.qcard ' + s)); };
      if (cur.mode === 'choice') { var o = $('.qopt').filter(function (b) { return (b.textContent === ans) === !!right; })[0]; if (!o) return 'nooption'; o.click(); return 'choice'; }
      if (cur.mode === 'pad') { var digits = right ? ans : '99999'; digits.split('').forEach(function (d) { $('.key').filter(function (b) { return b.textContent === d; })[0].click(); }); $('.key.go')[0].click(); return 'pad'; }
      var word = right ? ans : 'zzzz'; word.split('').forEach(function (ch) { var t = $('.tile').filter(function (b) { return b.textContent === ch && !b.classList.contains('used'); })[0]; if (t) t.click(); }); return 'tiles';
    },
    question: function () {
      var c = document.querySelector('.qcard .qtext'); if (!c) return null;
      return { text: c.textContent, opts: Array.prototype.map.call(document.querySelectorAll('.qcard .qopt'), function (b) { return b.textContent; }), mode: document.querySelector('.qcard .qarea').className };
    },
    state: function () {
      return { screen: ui.current(), popups: ui.popupOpen(), coins: A.S.coins, xp: A.S.xp, level: A.S.level, island: A.S.islands.current, unlocked: A.S.islands.unlocked.slice(),
        objective: (function () { var o = Q.objective(A.S); return o ? { text: o.text, index: o.index, type: o.step.type, progress: o.progress } : null; })(),
        player: SI.world && ui.current() === 'world' ? SI.world.player() : null, near: SI.world && SI.world.near() ? SI.world.near().id : null, audio: SI.audio.state() };
    },
    mgTarget: function () { return SI.mgcore.target(); },
    mgStatus: function () { return SI.mgcore.status(); },
    mgWin: function (stars) { var r = SI.mgcore.current(); if (!r) return false; var MG = SI.minigames; SI.mgcore.debugFinish(stars === 3 || stars == null ? MG.perfectScore(r.id, r.L) : MG.passScore(r.id, r.L)); return true; },
    buildState: function () { return SI.buildUI.state(); },
    advance: function () { SI.game.advance(); },
    fps: function (reset) { return SI.world.fps(reset); },
    world: function () { return SI.world; }
  };
  root.SI_TEST.ready = true;
})(typeof self !== 'undefined' ? self : this);
