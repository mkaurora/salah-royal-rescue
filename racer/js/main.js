/* Road Racer — app core: boot, save, the frame loop (fixed 60 Hz sim steps + render), race flow (gate → intro →
 * countdown → race → results / try again), sim events → sound / particles / HUD, title & map demo drives,
 * adaptive quality, pause on hide, updater wiring and the ?test=1 hook loader. Browser only: RR.app. */
(function (root) {
  'use strict';
  var RR = root.RR, PR = RR.progress, LV = RR.levels, GA = RR.garage, TR = RR.track, SIM = RR.sim, ui = RR.ui;
  var A = RR.audio;

  var app = RR.app = {
    state: PR.load(safeStorage()), mode: 'boot', race: null, demo: null, bot: null,
    stats: { frames: 0, sum: 0, worst: 0, avg: 16.7, q: 0, window: [], fpsWindow: 0 }
  };
  var canvas = document.getElementById('game');
  var road = app.road = RR.road.create(canvas);
  var hud = app.hud = RR.hud.create(document.getElementById('hud'));
  var controls = app.controls = RR.input.create(document.getElementById('controls'));
  ui.init(document.getElementById('screens'));

  function safeStorage() {
    try { var k = '__rr_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; }
    catch (e) { var m = {}; return { getItem: function (k) { return k in m ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, removeItem: function (k) { delete m[k]; } }; }
  }
  var storage = safeStorage();
  app.persist = function () { PR.save(storage, app.state); };

  /* ------------------------------------------------------------------ car look + settings */

  app.carLook = function (st) {
    st = st || app.state;
    var p = GA.find('paint', st.paint) || GA.PAINTS[0];
    return { color: p.color, shiny: !!p.shiny, decal: st.decal, body: st.body };
  };
  app.applySettings = function () {
    A.setSound(app.state.settings.sound);
    A.setMusic(app.state.settings.music);
  };
  app.applySettings();

  /* ------------------------------------------------------------------ sizing */

  var portraitOk = false;
  function resize() {
    var w = window.innerWidth, h = window.innerHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    road.resize(w, h, dpr);
    checkRotate();
  }
  function checkRotate() {
    var portrait = window.innerHeight > window.innerWidth * 1.05;
    var el = document.querySelector('.rotate-scr');
    if (portrait && !portraitOk && !el && app.mode !== 'boot') {
      if (app.race && !app.race.ended) app.pause();
      ui.openModal(RR.screens.rotate(function () { portraitOk = true; }));
    }
    if (!portrait && el) ui.closeModal(el);
  }
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', function () { setTimeout(resize, 120); });

  /* ------------------------------------------------------------------ audio unlock */

  function unlock() { A.unlock(); }
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  /* ------------------------------------------------------------------ demo drive (title + map backgrounds) */

  var DEMO_LEVEL = [2, 7, 14, 20, 24];
  app.setDemo = function (world) {
    world = Math.max(1, Math.min(5, world | 0));
    if (app.demo && app.demo.world === world) return;
    var def = LV.LEVELS[DEMO_LEVEL[world - 1]], track = TR.build(def);
    var sim = SIM.create(track, { countdown: 0, upgrades: { speed: 2, grip: 3 } });
    // start a little way in so the first frame already has scenery and traffic
    var drive = RR.autopilot.create({ coins: true });
    for (var i = 0; i < 60 * 4; i++) sim.step(drive(sim));
    sim.s.car.invulnT = 1e9;
    app.demo = { world: world, def: def, track: track, sim: sim, drive: drive };
    road.setScene({ track: track, theme: RR.themes.forWorld(world), car: app.carLook() });
  };

  function stepDemo(dt) {
    var d = app.demo, sim = d.sim;
    d.acc = (d.acc || 0) + dt;
    var n = 0;
    while (d.acc >= SIM.DT && n < 4) { sim.step(d.drive(sim)); d.acc -= SIM.DT; n++; }
    sim.drainEvents().forEach(function (e) { road.event(e, sim.s); });
    sim.s.car.invulnT = 1e9;
    if (sim.s.status !== 'race' || sim.s.car.z > d.track.length - 120) { var w = d.world; app.demo = null; app.setDemo(w); }
  }

  /* ------------------------------------------------------------------ navigation */

  app.goto = function (name, arg) {
    controls.enable(false);
    hud.show(false);
    A.engine({ on: false });
    if (app.race && name !== 'race') endRaceObjects();
    switch (name) {
      case 'title':
        app.mode = 'title';
        app.setDemo(arg || (app.state.lastLevel ? LV.LEVELS[app.state.lastLevel].world : 1));
        ui.setScreen(RR.screens.title());
        A.music('title');
        break;
      case 'map':
        app.mode = 'map';
        var w = arg || LV.LEVELS[Math.min(app.state.unlocked - 1, LV.COUNT - 1)].world;
        app.setDemo(w);
        ui.setScreen(RR.screens.map(w));
        A.music('map');
        break;
      case 'garage':
        app.mode = 'static';
        ui.setScreen(RR.garageUI.open());
        A.music('map');
        break;
      case 'settings':
        ui.openModal(RR.screens.settings());
        break;
      case 'parents':
        ui.openModal(RR.parentsUI.pin());
        break;
    }
    checkRotate();
  };

  /** Map tap on level i: gate (first entry only) → intro card → race. */
  app.selectLevel = function (i) {
    if (!PR.canPlay(app.state, i)) { A.sfx('locked'); ui.toast('🔒 Finish the level before to open this one!'); return; }
    if (PR.needsGate(app.state, i)) {
      var gate = RR.quiz.makeGate(i, { subjects: PR.enabledSubjects(app.state), recent: app.state.quizStats.recent, seed: app.state.quizStats.asked + app.state.plays });
      if (gate.questions.length) {
        app.mode = 'static';
        A.music('map');
        ui.setScreen(RR.quizUI.open(gate, {
          answer: function (q, firstTry) { var c = PR.recordAnswer(app.state, q.subject, q.id, firstTry); app.persist(); return c; },
          done: function () { PR.passGate(app.state, i); app.persist(); app.intro(i, true); },
          back: function () { app.goto('map', LV.LEVELS[i].world); }
        }));
        return;
      }
      PR.passGate(app.state, i);
    }
    app.intro(i);
  };

  app.intro = function (i, fromQuiz) {
    var def = LV.LEVELS[i];
    if (app.mode !== 'map' && app.mode !== 'title') { app.mode = 'map'; app.setDemo(def.world); ui.setScreen(RR.screens.blank()); }
    ui.openModal(RR.screens.intro(i, function () { app.startRace(i); }, function () { if (fromQuiz) app.goto('map', def.world); else ui.closeModal(); }));
  };

  /* ------------------------------------------------------------------ race */

  app.startRace = function (i, opts) {
    opts = opts || {};
    var def = LV.LEVELS[i];
    ui.wipe(function () {
      ui.clearScreen();
      var track = TR.build(def);
      var sim = SIM.create(track, { upgrades: app.state.upgrades, countdown: opts.countdown === undefined ? SIM.COUNTDOWN : opts.countdown });
      app.race = { i: i, def: def, track: track, sim: sim, acc: 0, paused: false, ended: false, endT: 0, result: null,
        seen: {}, closureWarned: {}, finishRoll: 0 };
      app.demo = null;
      road.setScene({ track: track, theme: RR.themes.forWorld(def.world), car: app.carLook() });
      hud.setup(def, track, '🏎️');
      hud.show(true);
      controls.enable(true);
      controls.setTilt(app.state.settings.tilt);
      app.mode = 'race';
      A.music(def.boss ? 'boss' : RR.themes.BY_WORLD[def.world - 1]);
      if (sim.s.status === 'countdown') { hud.countdown(3); A.sfx('count'); }
      checkRotate();
    });
  };

  function endRaceObjects() { app.race = null; }

  app.pause = function () {
    var r = app.race;
    if (!r || r.paused || r.ended || app.mode !== 'race') return;
    r.paused = true;
    controls.reset();
    A.engine({ on: false });
    ui.openModal(RR.screens.pause());
  };
  app.resume = function () {
    var r = app.race;
    if (!r) return;
    ui.closeAllModals();
    r.paused = false; r.acc = 0;
    controls.reset();
  };
  app.restart = function () { var r = app.race; if (r) { ui.closeAllModals(true); app.startRace(r.i); } };
  app.exitToMap = function () { var w = app.race ? app.race.def.world : 1; ui.wipe(function () { app.goto('map', w); }); };
  controls.onPause = function () { if (app.race && !app.race.paused && !app.race.ended) app.pause(); else if (app.race && app.race.paused) app.resume(); };
  document.querySelector('.pause-btn').addEventListener('click', function () { A.sfx('tap'); app.pause(); });

  function onEvent(e, r) {
    var s = r.sim.s, c = s.car;
    road.event(e, s);
    switch (e.type) {
      case 'count': hud.countdown(e.n); A.sfx('count'); break;
      case 'go': hud.countdown(0); A.sfx('go'); break;
      case 'coin': A.sfx('coin', { n: e.n }); break;
      case 'fuel': A.sfx('fuel'); hud.callout('+ Fuel ⛽', 'good'); break;
      case 'wrench': A.sfx('wrench'); hud.callout('Fixed! 🔧', 'good'); break;
      case 'hit':
        A.sfx(e.kind === 'pothole' ? 'bump' : e.kind === 'cone' ? 'cone' : e.kind === 'barrier' ? 'scrape' : 'crash');
        if (e.kind === 'traffic' && !r.seen.trafficHit) { r.seen.trafficHit = 1; hud.callout('Pass in a free lane!', 'warn'); }
        break;
      case 'scrape': if (c.invulnT > 0) A.sfx('scrape'); break;
      case 'splash': A.sfx('splash'); break;
      case 'skid': A.sfx('skid'); if (!r.seen.skid) { r.seen.skid = 1; hud.callout(r.def.ice ? 'Ice! Slippery! 🧊' : 'Oil! Slippery! 🛢️', 'warn'); } break;
      case 'jump': A.sfx('jump'); if (!r.seen.jump) { r.seen.jump = 1; hud.callout('JUMP! 🚀', 'good', 1200); } break;
      case 'land': A.sfx('land'); break;
      case 'rockWarn': A.sfx('rockWarn'); if (!r.seen.rock) { r.seen.rock = 1; hud.callout('Rock! Move away from the shadow!', 'warn', 2000); } break;
      case 'rockLand': if (Math.abs(e.z - c.z) < 90) A.sfx('rockLand'); break;
      case 'checkpoint': A.sfx('checkpoint'); hud.callout(e.add ? 'Checkpoint! +' + e.add + ' s ⏱️' : 'Checkpoint! 🚩', 'good'); break;
      case 'fuelEmpty': hud.callout('Out of fuel! ⛽', 'warn', 2200); break;
      case 'lifeLost': A.sfx('lifeLost'); hud.callout(c.lives > 0 ? 'Oops! Let\'s fix the car 🔧' : 'Oh no!', 'warn', 1500); break;
      case 'respawn': A.sfx('respawn'); break;
      case 'bossWarn': A.sfx('bossWarn'); break;
      case 'bossHit': A.sfx('bossHit'); if (s.boss.hp > 0) hud.callout('BUMP! ' + s.boss.hp + ' more!', 'good'); break;
      case 'finish': A.sfx('finish'); hud.callout(e.reason === 'boss' ? 'You caught it! 🎉' : 'FINISH! 🏁', 'good', 2000); break;
      case 'fail': A.sfx('fail'); break;
    }
  }

  /** Per-frame race hints that come from the state, not from events. */
  function raceHints(r) {
    var s = r.sim.s, c = s.car, t = r.track;
    for (var k = 0; k < t.closures.length; k++) {
      var cl = t.closures[k];
      if (!r.closureWarned[k] && c.z > cl.z0 - TR.TAPER - 110 && c.z < cl.z0) {
        r.closureWarned[k] = 1;
        hud.callout(cl.side < 0 ? 'Lane closed! Move right ➡️' : '⬅️ Lane closed! Move left', 'warn', 2200);
      }
    }
    if (s.timeLeft !== null && s.timeLeft < 10 && !r.seen.hurry && s.status === 'race') { r.seen.hurry = 1; hud.callout('Hurry! ⏱️', 'warn'); }
    if (s.boss && !r.seen.bossIntro && s.status === 'race' && s.t > 0.8) { r.seen.bossIntro = 1; hud.callout('Bump the ' + r.def.boss.name + '!', 'warn', 2000); }
    if (r.def.fuel && c.fuel < 25 && c.fuel > 0 && !r.seen.lowFuel) { r.seen.lowFuel = 1; hud.callout('Low fuel! Grab a can ⛽', 'warn'); }
  }

  var IDLE = { steer: 0, gas: false, brake: false };
  function raceFrame(dt) {
    var r = app.race, sim = r.sim, s = sim.s;
    var view = r.view || (r.view = { speed: 0, speedLines: 0, flash: 0 });
    if (!r.paused) {
      var input = app.bot ? app.bot(sim) : controls.update(dt);
      if (s.status === 'countdown' && !app.bot) input = IDLE;
      r.acc += Math.min(dt, 0.1);
      var n = 0;
      while (r.acc >= SIM.DT && n < 6) { sim.step(input); r.acc -= SIM.DT; n++; }
      if (n >= 6) r.acc = 0;
      var ev = sim.drainEvents();
      for (var k = 0; k < ev.length; k++) onEvent(ev[k], r);
      raceHints(r);
      if (!r.ended && (s.status === 'finished' || s.status === 'failed')) {
        r.ended = true; r.result = sim.result(); r.endT = 0;
        controls.enable(false);
      }
      if (r.ended) {
        r.endT += dt;
        // victory roll: the car coasts on past the line
        if (s.status === 'finished') { s.car.v = Math.max(0, s.car.v - 7 * dt); s.car.z += s.car.v * dt; }
        if (r.endT > (s.status === 'finished' ? 1.6 : 1.4) && !r.shown) { r.shown = true; showResult(r); }
      }
    }
    var c = s.car, top = sim.stats.top;
    view.speed = Math.min(1, c.v / SIM.BASE_TOP);
    view.speedLines = Math.max(0, (c.v / top - 0.9) * 8) * 0.6 + (c.air ? 0.5 : 0);
    view.flash = Math.max(0, (view.flash || 0) - dt * 3);
    road.render(s, r.paused ? 0 : dt, view);
    hud.update(s);
    var eng = r.eng || (r.eng = {});
    eng.on = !r.paused && s.status !== 'countdown' && !(r.ended && c.v < 1); eng.speed = view.speed; eng.gas = !!c.gas;
    eng.offroad = !!c.offroad; eng.skid = c.skidT > 0; eng.air = !!c.air;
    A.engine(eng);
  }

  function showResult(r) {
    var res = r.result, out = PR.recordResult(app.state, r.i, res);
    app.persist();
    A.engine({ on: false });
    if (res.status === 'finished') { A.music('results'); ui.openModal(RR.screens.results(r, res, out)); }
    else ui.openModal(RR.screens.fail(r, res, out));
  }

  app.nextLevel = function (i) {
    if (i + 1 >= LV.COUNT) { app.exitToMap(); return; }
    var next = i + 1;
    ui.wipe(function () {
      app.race = null;
      app.mode = 'map';
      app.setDemo(LV.LEVELS[next].world);
      ui.setScreen(RR.screens.map(LV.LEVELS[next].world));
      A.music('map');
      hud.show(false); controls.enable(false);
      setTimeout(function () { app.selectLevel(next); }, 380);
    });
  };

  /* ------------------------------------------------------------------ loop */

  var last = 0, qWin = { t: 0, n: 0, sum: 0, bad: 0 };
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = last ? (now - last) / 1000 : 1 / 60;
    last = now;
    if (dt > 0.25) dt = 1 / 60;          // came back from a pause / background tab
    var t0 = performance.now();
    if (app.mode === 'race' && app.race) raceFrame(dt);
    else if ((app.mode === 'title' || app.mode === 'map') && app.demo) {
      stepDemo(dt);
      var dc = app.demo.sim.s.car, dv = app.demo.view || (app.demo.view = { speed: 0, lights: true });
      dv.speed = dc.v / SIM.BASE_TOP;
      road.render(app.demo.sim.s, dt, dv);
    }
    var cost = performance.now() - t0;
    var st = app.stats;
    st.frames++; st.sum += dt * 1000; st.cost = (st.cost || 0) * 0.95 + cost * 0.05;
    // adaptive quality: average frame time over 2 s windows while racing
    if (app.mode === 'race' && dt < 0.1) {      // one-off hitches (loading, fast-forward) never count
      qWin.t += dt; qWin.n++; qWin.sum += dt * 1000;
      if (qWin.t >= 2) {
        var avg = qWin.sum / qWin.n;
        st.avg = avg;
        qWin.bad = avg > 20 ? qWin.bad + 1 : 0;
        if (qWin.bad >= 1 && road.q < 2 && !app.lockQuality) { road.setQuality(road.q + 1); st.q = road.q; qWin.bad = 0; }
        qWin.t = 0; qWin.n = 0; qWin.sum = 0;
      }
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { A.suspend(); if (app.race && !app.race.ended) app.pause(); }
    else { A.resume(); last = 0; }
  });

  /* ------------------------------------------------------------------ updates */

  var banner = null;
  app.updater = RR.createUpdater({
    navigator: navigator, document: document,
    reload: function () { location.reload(); },
    beforeReload: function () { app.persist(); try { sessionStorage.setItem('rr-updated', '1'); } catch (e) { /* private mode */ } },
    onBanner: function () {
      if (banner) return;
      banner = ui.btn('green small update-banner', '✨ ' + RR.UPDATE_MSG.banner, function () {
        if (app.race && !app.race.ended && !app.race.paused) { ui.toast('Finish the race first! 🏁'); return; }
        app.updater.applyUpdate();
      });
      document.getElementById('app').appendChild(banner);
      app.updater.waitingVersion().then(function (v) { if (v && v.version && banner) banner.innerHTML = '✨ ' + RR.UPDATE_MSG.bannerV.replace('{v}', v.version); });
    }
  });
  app.updateGame = function (btn) {
    if (btn) btn.classList.add('busy');
    return app.updater.manualUpdate().then(function (r) {
      if (btn) btn.classList.remove('busy');
      ui.toast(RR.UPDATE_MSG[r] || RR.UPDATE_MSG.latest);
      return r;
    });
  };

  /* ------------------------------------------------------------------ boot */

  resize();
  app.goto('title');
  try {
    if (sessionStorage.getItem('rr-updated')) {
      sessionStorage.removeItem('rr-updated');
      setTimeout(function () { ui.toast(RR.UPDATE_MSG.updated.replace('{v}', root.RR_VERSION.version), 3000); }, 600);
    }
  } catch (e) { /* private mode */ }
  requestAnimationFrame(frame);
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () { app.updater.register('./sw.js'); });
  }
  if (/[?&]test=1\b/.test(location.search)) {
    var s = document.createElement('script');
    s.src = './js/dev/test-hook.js';
    s.onerror = function () { /* hook missing: the game runs normally */ };
    document.body.appendChild(s);
  }
})(window);
