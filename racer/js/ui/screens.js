/* Screens: animated title (live demo drive behind a glossy logo), world map (5 worlds × 6 levels over a live drive
 * of that world), level intro card, pause menu, level complete (stars pop, coins fly), gentle "Try again!",
 * settings (sound, music, tilt, Update game, version), portrait "Turn your phone sideways". Browser only: RR.screens. */
(function (root) {
  'use strict';
  var RR = root.RR, ui = RR.ui, h = ui.h, LV = RR.levels, PR = RR.progress, A = RR.audio;
  function app() { return RR.app; }

  function coinPill(n) { return h('div.pill.coins-pill', ui.coin(), h('b', String(n))); }
  function starPill(n, of) { return h('div.pill', '⭐', h('b', of ? n + '/' + of : String(n))); }

  /* ------------------------------------------------------------------ title */

  function title() {
    var st = app().state;
    var scr = h('div.screen.title-scr',
      h('div.top', h('div.stats', starPill(PR.totalStars(st), 90), coinPill(st.coins)),
        ui.btn('white small', '🔒 Parents', function () { app().goto('parents'); }, { label: 'Parents' })),
      h('div.logo',
        h('span.l1', { 'data-t': 'ROAD' }, 'ROAD'),
        h('span.l2', { 'data-t': 'RACER' }, 'RACER'),
        h('div', h('span.tag', '🏁 5 WORLDS · 30 RACES 🏁'))),
      h('div.bottom',
        h('div.row', ui.btn('purple', '🔧 Garage', function () { ui.wipe(function () { app().goto('garage'); }); }),
          ui.btn('white', '⚙️', function () { app().goto('settings'); }, { label: 'Settings' })),
        ui.btn('green big play', '▶ PLAY', function () { ui.wipe(function () { app().goto('map'); }); }, { label: 'Play' })));
    // the demo car cycles through the worlds behind the logo
    var w = app().demo ? app().demo.world : 1, timer = setInterval(function () {
      if (!scr.isConnected) { clearInterval(timer); return; }
      if (app().mode !== 'title' || ui.topModal()) return;
      w = w % 5 + 1;
      var cv = document.getElementById('game');
      cv.style.transition = 'opacity .35s'; cv.style.opacity = '0';
      setTimeout(function () { if (app().mode === 'title') app().setDemo(w); cv.style.opacity = '1'; }, 380);
    }, 11000);
    return scr;
  }

  /* ------------------------------------------------------------------ world map */

  var NODES = [[11, 72], [27, 34], [43, 68], [58, 30], [73, 64], [88, 36]];

  function map(world) {
    var st = app().state, w = world;
    var nameEl = h('div.world-name'), starsEl = h('div.pill'), panel = h('div.map-panel'), dots = h('div.dots');
    for (var d = 0; d < 5; d++) dots.appendChild(h('i'));
    var left = ui.btn('white round map-arrow', '◀', function () { go(-1); }, { label: 'Previous world' });
    var right = ui.btn('white round map-arrow', '▶', function () { go(1); }, { label: 'Next world' });
    var scr = h('div.screen.map-scr',
      h('div.topbar',
        ui.btn('white round', '⌂', function () { ui.wipe(function () { app().goto('title'); }); }, { sound: 'back', label: 'Home' }),
        h('div.title', nameEl), starsEl, coinPill(st.coins),
        ui.btn('purple small', '🔧', function () { ui.wipe(function () { app().goto('garage'); }); }, { label: 'Garage' })),
      h('div.map-body', left, panel, right), dots);

    function go(dir) {
      var nw = w + dir;
      if (nw < 1 || nw > 5) return;
      w = nw;
      A.sfx('whoosh');
      app().setDemo(w);
      render();
    }
    function render() {
      var W = LV.WORLDS[w - 1];
      nameEl.textContent = W.icon + ' ' + W.name;
      starsEl.innerHTML = '⭐ <b>' + PR.worldStars(st, w) + '/18</b>';
      left.disabled = w <= 1; right.disabled = w >= 5;
      for (var d = 0; d < 5; d++) dots.children[d].className = d === w - 1 ? 'on' : '';
      panel.innerHTML = '';
      var pts = NODES.map(function (p) { return p[0] + ',' + p[1]; }).join(' L ');
      panel.innerHTML = '<svg class="path" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M ' + pts +
        '" fill="none" stroke="rgba(20,28,80,.45)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>' +
        '<path d="M ' + pts + '" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="2 14" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
      for (var k = 0; k < 6; k++) {
        var i = (w - 1) * 6 + k, def = LV.LEVELS[i], open = PR.canPlay(st, i), stars = st.stars[i];
        var cls = 'node' + (def.boss ? ' boss' : '') + (!open ? ' locked' : stars ? ' done' : ' next');
        var node = h('button.' + cls.split(' ').join('.'), { type: 'button', 'aria-label': 'Level ' + (k + 1) + ' ' + def.name,
          style: { left: NODES[k][0] + '%', top: NODES[k][1] + '%', 'animation-delay': (k * 60) + 'ms' }, 'data-level': i },
          open ? (def.boss ? def.icon : String(k + 1)) : '🔒');
        if (open) {
          var sv = h('span.stars');
          for (var s = 0; s < 3; s++) sv.appendChild(h('span' + (s < stars ? '' : '.no'), '⭐'));
          node.appendChild(sv);
          if (!def.boss && !stars) node.appendChild(h('span.ic', def.icon));
        }
        (function (i, open) {
          node.addEventListener('click', function () {
            if (!open) { A.sfx('locked'); ui.shake(node); ui.toast('🔒 Finish the level before to open this one!'); return; }
            A.sfx('tap');
            app().selectLevel(i);
          });
        })(i, open);
        panel.appendChild(node);
      }
      if (!PR.canPlay(st, (w - 1) * 6)) panel.appendChild(h('div.lockmsg', h('div', h('div', { style: { 'font-size': '48px' } }, '🔒'), 'Finish ' + LV.WORLDS[w - 2].name + ' to open!')));
    }
    // swipe between worlds
    var sx = null;
    panel.addEventListener('pointerdown', function (e) { sx = e.clientX; });
    panel.addEventListener('pointerup', function (e) { if (sx !== null && Math.abs(e.clientX - sx) > 60) go(e.clientX < sx ? 1 : -1); sx = null; });
    render();
    scr._render = render;
    return scr;
  }

  function blank() { return h('div.screen'); }

  /* ------------------------------------------------------------------ intro card */

  function intro(i, onGo, onBack) {
    var def = LV.LEVELS[i], st = app().state, got = st.stars[i];
    var goals = h('div.goals');
    LV.starText(def).forEach(function (t, k) {
      goals.appendChild(h('div' + (k < got ? '.got' : ''), h('span.s', '⭐'), h('span', t)));
    });
    var card = h('div.card.intro',
      h('div.il',
        h('div.big-icon', def.icon),
        h('div.wl', LV.WORLDS[def.world - 1].icon + ' World ' + def.world + ' · Level ' + def.level),
        h('h2', def.name),
        def.intro.map(function (line) { return h('p', line); })),
      h('div.ir',
        h('div.wl', 'Win the stars:'),
        goals,
        h('div.row',
          ui.btn('white', '◀', function () { onBack(); }, { sound: 'back', label: 'Back' }),
          ui.btn('green big', 'GO! 🏁', function () { onGo(); }, { label: 'Go' }))));
    return h('div.screen.modal', card);
  }

  /* ------------------------------------------------------------------ pause */

  function pause() {
    var st = app().state;
    var snd = ui.btn('white', '', function () { st.settings.sound = !st.settings.sound; app().persist(); app().applySettings(); upd(); });
    var mus = ui.btn('white', '', function () { st.settings.music = !st.settings.music; app().persist(); app().applySettings(); upd(); });
    function upd() {
      snd.innerHTML = st.settings.sound ? '🔊 Sound' : '🔇 Sound'; snd.classList.toggle('off', !st.settings.sound);
      mus.innerHTML = '🎵 Music'; mus.classList.toggle('off', !st.settings.music);
    }
    upd();
    return h('div.screen.modal', h('div.card.pause',
      h('h1', '⏸ Paused'),
      h('div.row', ui.btn('green big', '▶ Keep going', function () { app().resume(); })),
      h('div.pause-grid',
        ui.btn('blue', '↻ Restart', function () { app().restart(); }),
        ui.btn('purple', '🗺️ Map', function () { app().exitToMap(); }), snd, mus)));
  }

  /* ------------------------------------------------------------------ results */

  function fmtTime(t) { var m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + (s < 10 ? '0' : '') + s; }

  function results(r, res, out) {
    var def = r.def, st = app().state;
    var labels = LV.starText(def);
    var starsEl = h('div.res-stars', labels.map(function (t, k) { return h('div.st', h('span', '⭐'), h('small', (res.stars.got[k] ? '✓ ' : '') + t)); }));
    var total = h('b', String(st.coins - out.coins));
    var coinsTop = h('div.pill.gold.coin-badge', ui.coin(), total);
    var head = def.boss ? 'You caught it!' : ['You did it!', 'Great driving!', 'Super race!'][r.i % 3];
    var isLast = r.i + 1 >= LV.COUNT;
    var card = h('div.card.results',
      coinsTop,
      h('h1', head + ' 🎉'),
      starsEl,
      h('div.res-line',
        h('div.pill', '⏱️ ' + fmtTime(res.time)),
        h('div.pill.gold', ui.coin(), res.coins + ' / ' + res.coinTotal),
        h('div.pill', '💥 ' + res.hits + (res.hits === 1 ? ' crash' : ' crashes')),
        out.coins ? h('div.pill.gold', '+' + out.coins, ui.coin()) : null),
      out.unlocked >= 0 && LV.isWorldStart(out.unlocked) ? h('p', '🎊 New world open: ' + LV.WORLDS[LV.LEVELS[out.unlocked].world - 1].name + '!') : null,
      isLast ? h('p', '🏆 You beat ALL the races! You are a champion!') : null,
      h('div.row',
        ui.btn('purple', '🗺️ Map', function () { app().exitToMap(); }),
        ui.btn('blue', '↻ Retry', function () { ui.closeAllModals(true); app().startRace(r.i); }),
        isLast ? null : ui.btn('green big', 'Next ▶', function () { ui.closeAllModals(true); app().nextLevel(r.i); }, { label: 'Next' })));
    var scr = h('div.screen.modal', card);
    // stars pop one by one, then coins fly to the counter
    res.stars.got.forEach(function (g, k) {
      if (!g) return;
      setTimeout(function () { starsEl.children[k].firstChild.classList.add('on'); A.sfx('star', { i: k }); }, 450 + k * 380);
    });
    var delay = 450 + 3 * 380;
    setTimeout(function () { flyCoins(scr, card, coinsTop, total, st.coins - out.coins, st.coins); }, delay);
    if (res.stars.count === 3) setTimeout(function () { app().road.fx.burst('confetti', window.innerWidth / 2, window.innerHeight * 0.25, 40, 80); }, delay);
    return scr;
  }

  function flyCoins(scr, card, target, label, from, to) {
    if (to <= from) return;
    var n = Math.min(12, to - from), tr = target.getBoundingClientRect(), cr = card.getBoundingClientRect();
    for (var k = 0; k < n; k++) (function (k) {
      setTimeout(function () {
        var c = h('span.coin-icon.fly-coin');
        var x0 = cr.left + cr.width / 2 + (Math.random() - 0.5) * 120, y0 = cr.top + cr.height * 0.55;
        c.style.left = x0 + 'px'; c.style.top = y0 + 'px';
        document.getElementById('app').appendChild(c);
        requestAnimationFrame(function () { requestAnimationFrame(function () {
          c.style.transform = 'translate(' + (tr.left + 10 - x0) + 'px,' + (tr.top + 6 - y0) + 'px) scale(.8)';
        }); });
        setTimeout(function () {
          if (c.parentNode) c.parentNode.removeChild(c);
          label.textContent = String(Math.round(from + (to - from) * (k + 1) / n));
          A.sfx('coin', { n: k });
        }, 780);
      }, k * 70);
    })(k);
  }

  var FAIL = {
    lives: ['Your car needs a rest! 🔧', 'Steer around the bumps. You can do it!'],
    fuel: ['Out of fuel! ⛽', 'Drive into the red fuel cans to fill up.'],
    time: ['Time ran out! ⏱️', 'Each flag gives you more time. Go go go!'],
    escaped: ['It got away! 💨', 'Catch it and bump it before the finish line.'],
    timeout: ['Try again!', 'Press GAS to drive.']
  };
  function fail(r, res, out) {
    var f = FAIL[res.reason] || FAIL.lives;
    return h('div.screen.modal', h('div.card',
      h('div.big-icon', { style: { 'font-size': '64px' } }, '💪'),
      h('h1', 'Try again!'),
      h('p', f[0]), h('p', f[1]),
      out.coins ? h('div.res-line', h('div.pill.gold', 'You keep ', ui.coin(), ' ' + out.coins)) : null,
      h('div.row', { style: { 'margin-top': '8px' } },
        ui.btn('purple', '🗺️ Map', function () { app().exitToMap(); }),
        ui.btn('green big', '↻ Try again', function () { ui.closeAllModals(true); app().startRace(r.i); }, { label: 'Try again' }))));
  }

  /* ------------------------------------------------------------------ settings */

  function settings() {
    var st = app().state;
    var snd = ui.btn('white', '', function () { st.settings.sound = !st.settings.sound; app().persist(); app().applySettings(); upd(); });
    var mus = ui.btn('white', '', function () { st.settings.music = !st.settings.music; app().persist(); app().applySettings(); upd(); });
    var tilt = ui.btn('white', '', function () {
      var want = !st.settings.tilt;
      if (!want) { st.settings.tilt = false; app().controls.setTilt(false); app().persist(); upd(); return; }
      app().controls.setTilt(true).then(function (ok) {
        st.settings.tilt = ok; app().persist(); upd();
        if (!ok) ui.toast('Tilt is not available on this device');
        else app().controls.setTilt(false);   // turned on for real when a race starts
      });
    });
    function upd() {
      snd.innerHTML = (st.settings.sound ? '🔊' : '🔇') + ' Sound: ' + (st.settings.sound ? 'ON' : 'OFF'); snd.classList.toggle('off', !st.settings.sound);
      mus.innerHTML = '🎵 Music: ' + (st.settings.music ? 'ON' : 'OFF'); mus.classList.toggle('off', !st.settings.music);
      tilt.innerHTML = '📱 Tilt steer: ' + (st.settings.tilt ? 'ON' : 'OFF'); tilt.classList.toggle('off', !st.settings.tilt);
    }
    upd();
    var upBtn = ui.btn('blue update-btn', '🔄 Update game', function (e, b) { app().updateGame(b); }, { label: 'Update game' });
    var scr = h('div.screen.modal', h('div.card.settings',
      h('h1', '⚙️ Settings'),
      h('div.toggle-list', snd, mus, tilt, upBtn),
      h('div.row',
        ui.btn('white small parents-btn', '🔒 Parents', function () { ui.closeModal(scr); app().goto('parents'); }, { label: 'Parents' }),
        ui.btn('green', 'Done ✓', function () { ui.closeModal(scr); })),
      h('div.version', ui.versionLabel())));
    return scr;
  }

  /* ------------------------------------------------------------------ portrait */

  function rotate(onPlay) {
    var scr = h('div.screen.solid.rotate-scr',
      h('div.phone', '📱'),
      h('h1', 'Turn your phone sideways ↻'),
      ui.btn('white', 'Play anyway', function () { onPlay(); ui.closeModal(scr); }));
    return scr;
  }

  RR.screens = { title: title, map: map, blank: blank, intro: intro, pause: pause, results: results, fail: fail,
    settings: settings, rotate: rotate };
})(window);
