/* ?test=1 only: window.RR_TEST for Playwright e2e + screenshots. Small on purpose; the game never needs it.
 * goto(screen, arg) · startLevel(i, {countdown}) · setSave(obj) / getSave() · fastForward(seconds) · botDrive(on)
 * finishLevel(maxSeconds) · quizAnswer(correct) · state() · fps() · setQuality(q) */
(function (root) {
  'use strict';
  var RR = root.RR, app = RR.app, SIM = RR.sim;
  function race() { return app.race; }
  var api = {
    goto: function (name, arg) { RR.ui.closeAllModals(true); app.goto(name, arg); return true; },
    startLevel: function (i, o) { RR.ui.closeAllModals(true); app.startRace(i, o); return true; },
    selectLevel: function (i) { app.selectLevel(i); return true; },
    setSave: function (obj) { app.state = RR.progress.sanitize(obj); app.persist(); app.applySettings(); return app.state; },
    getSave: function () { return JSON.parse(JSON.stringify(app.state)); },
    botDrive: function (on) { app.bot = on ? RR.autopilot.create() : null; return !!on; },
    /** Step the current race sim quickly (bot or no input). */
    fastForward: function (sec) {
      var r = race(); if (!r) return null;
      var drive = app.bot || function () { return { steer: 0, gas: true, brake: false }; };
      var n = Math.round(sec / SIM.DT);
      for (var k = 0; k < n && (r.sim.s.status === 'race' || r.sim.s.status === 'countdown'); k++) r.sim.step(drive(r.sim));
      return api.state();
    },
    finishLevel: function (maxSec) {
      var r = race(); if (!r) return null;
      if (!app.bot) api.botDrive(true);
      api.fastForward(maxSec || 400);
      return api.state();
    },
    quizAnswer: function (correct) { var b = RR.ui.base(); return !!(b && b._answerForTest && b._answerForTest(correct !== false)); },
    state: function () {
      var r = race(), s = r && r.sim.s;
      return { mode: app.mode, level: r ? r.i : null, status: s ? s.status : null, reason: s ? s.reason : null,
        z: s ? s.car.z : null, x: s ? s.car.x : null, v: s ? s.car.v : null, coins: s ? s.coins : null, health: s ? s.car.health : null,
        lives: s ? s.car.lives : null, paused: r ? r.paused : null, ended: r ? r.ended : null, result: r ? r.result : null,
        saveCoins: app.state.coins, unlocked: app.state.unlocked, modal: !!RR.ui.topModal(), quality: app.road.q };
    },
    fps: function () { return { avgFrameMs: app.stats.avg, renderMs: app.stats.cost, frames: app.stats.frames, quality: app.road.q }; },
    setQuality: function (q) { app.road.setQuality(q); app.lockQuality = true; return q; },
    events: []
  };
  root.RR_TEST = api;
})(window);
