/* Swarm Surge: screens, input, game loop, progression. */
(function () {
  'use strict';
  var SG = window.SG, Save = SG.Save, Levels = SG.Levels, Audio = SG.Audio;
  var TEST = /[?&]test=1/.test(location.search);
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('cv'), stage = $('stage');
  var renderer = SG.Renderer(canvas);
  var vibe = function (p) { if (Save.d().vibe && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) { /* unsupported */ } } };

  // ---- sims: the real game and a bot-driven attract-mode demo behind the menus ----
  var game = SG.createSim({
    onEvent: function (t, x, y, a) {
      switch (t) {
        case 'shoot': Audio.play('shoot'); break;
        case 'pop': Audio.play('pop'); break;
        case 'gate': Audio.play(a ? 'gatebad' : 'gate'); break;
        case 'breach': Audio.play('breach'); vibe(70); break;
        case 'champion': Audio.play('champion'); vibe(30); break;
        case 'giant': Audio.play('giant'); vibe(40); break;
        case 'giantspawn': Audio.play('giantspawn'); break;
        case 'basebig': Audio.play('basehit'); break;
        case 'basedown': Audio.play('basedown'); vibe([40, 30, 60]); break;
        case 'wave': case 'rage': Audio.play('wave'); break;
        case 'win': Audio.play('win'); vibe([40, 50, 40, 50, 90]); break;
        case 'lose': Audio.play('lose'); vibe(200); break;
      }
    }
  });
  var demo = SG.createSim({});

  var state = 'title', cur = 1, curLevel = null, endTimer = 0, paused = false, introT = 0;
  var activeSim = demo;

  // ---- screens ----
  var SCREENS = ['title', 'levels', 'upgrades', 'settings', 'pause', 'result', 'confirm'];
  function show(name, on) { $('screen-' + name).classList.toggle('hidden', on === false); }
  function showOnly(name) { SCREENS.forEach(function (s) { if (s !== 'pause' && s !== 'result' && s !== 'confirm') show(s, s === name); }); }
  function setHud(on) { $('hud').classList.toggle('hidden', !on); }
  function toast(msg) { var t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(toast.h); toast.h = setTimeout(function () { t.classList.add('hidden'); }, 1800); }
  function click() { Audio.resume(); Audio.play('click'); }

  function goTitle() {
    state = 'title'; paused = false; show('pause', false); show('result', false); setHud(false);
    showOnly('title'); refreshTitle(); startDemo();
  }
  function startDemo() {
    var lvl = Levels.get(1 + Math.floor(Math.random() * 8));
    demo.start(lvl, { rate: 10, perShot: 6, charge: 1.3 }, { sloppy: 6, champAt: 150 });
    activeSim = demo;
  }
  function refreshTitle() {
    var d = Save.d();
    $('title-coins').textContent = d.coins; $('title-stars').textContent = Save.totalStars();
    var h = Save.highest(); $('play-sub').textContent = 'Level ' + h;
  }

  function buildLevels() {
    var g = $('levelgrid'), html = '', hi = Save.highest();
    for (var n = 1; n <= Levels.COUNT; n++) {
      var st = Save.stars(n), un = Save.unlocked(n), lv = Levels.get(n);
      var cls = 'node' + (lv.boss ? ' boss' : '') + (st ? ' done' : '') + (!un ? ' locked' : '') + (un && !st && n === hi ? ' cur' : '');
      html += '<button class="' + cls + '" data-n="' + n + '">' + (un ? (lv.boss ? '&#9760;' : n) : '&#128274;') +
        (un ? '<span class="st">' + '&#9733;'.repeat(st) + '<u>' + '&#9733;'.repeat(3 - st) + '</u></span>' : '') + '</button>';
    }
    g.innerHTML = html;
  }
  $('levelgrid').addEventListener('click', function (e) {
    var b = e.target.closest('.node'); if (!b || b.classList.contains('locked')) return;
    click(); startLevel(+b.getAttribute('data-n'));
  });

  function buildUpgrades() {
    var d = Save.d(), html = '';
    Object.keys(Save.UP).forEach(function (k) {
      var u = Save.UP[k], l = d.up[k], max = l >= u.max, cost = max ? 0 : u.cost(l), pips = '';
      for (var i = 0; i < u.max; i++) pips += '<i class="' + (i < l ? 'on' : '') + '"></i>';
      html += '<div class="card"><div class="info"><b>' + u.name + '</b><div class="small" style="text-align:left">' + u.desc + ' &middot; ' + u.val(l) + (max ? '' : ' &rarr; ' + u.val(l + 1)) + '</div><div class="pips">' + pips + '</div></div>' +
        '<button class="btn ' + (max ? 'gray' : d.coins >= cost ? 'green' : 'gray') + '" data-up="' + k + '"' + (max ? ' disabled' : '') + '>' + (max ? 'MAX' : '<span class="coin" style="width:14px;height:14px"></span> ' + cost) + '</button></div>';
    });
    $('uplist').innerHTML = html;
    html = '';
    Save.SKINS.forEach(function (s) {
      var own = d.owned.indexOf(s.id) >= 0;
      html += '<button class="skin' + (d.skin === s.id ? ' sel' : '') + '" data-skin="' + s.id + '"><div class="dot" style="background:radial-gradient(circle at 35% 30%,' + s.light + ',' + s.body + ' 55%,' + s.dark + ')"></div>' + s.name +
        '<small>' + (d.skin === s.id ? 'Equipped' : own ? 'Tap to equip' : s.cost + ' coins') + '</small></button>';
    });
    $('skinlist').innerHTML = html;
    document.querySelectorAll('.coins-val').forEach(function (e) { e.textContent = d.coins; });
  }
  $('screen-upgrades').addEventListener('click', function (e) {
    var u = e.target.closest('[data-up]'), s = e.target.closest('[data-skin]');
    Audio.resume();
    if (u) { if (Save.buyUp(u.getAttribute('data-up'))) Audio.play('buy'); else toast('Not enough coins'); buildUpgrades(); }
    if (s) { var r = Save.skinAction(s.getAttribute('data-skin')); if (r === 'ok') { Audio.play('buy'); renderer.setSkin(Save.skin()); } else toast('Not enough coins'); buildUpgrades(); }
  });

  function buildSettings() {
    var d = Save.d();
    $('set-sound').classList.toggle('off', !d.sound); $('set-sound').lastChild.textContent = d.sound ? 'ON' : 'OFF';
    $('set-vibe').classList.toggle('off', !d.vibe); $('set-vibe').lastChild.textContent = d.vibe ? 'ON' : 'OFF';
    var v = window.SW_VERSION || {};
    $('version').textContent = 'Swarm Surge v' + v.version + ' (' + v.date + ')';
  }
  $('set-sound').onclick = function () { var d = Save.d(); d.sound = !d.sound; Save.save(); Audio.set(d.sound); buildSettings(); click(); };
  $('set-vibe').onclick = function () { var d = Save.d(); d.vibe = !d.vibe; Save.save(); buildSettings(); if (d.vibe) vibe(30); click(); };
  $('btn-reset').onclick = function () { click(); show('confirm', true); };
  $('btn-confirm-no').onclick = function () { click(); show('confirm', false); };
  $('btn-confirm-yes').onclick = function () { Save.reset(); Audio.set(true); show('confirm', false); buildSettings(); toast('Progress reset'); };

  document.querySelectorAll('[data-back]').forEach(function (b) { b.onclick = function () { click(); goTitle(); }; });
  $('btn-play').onclick = function () { click(); startLevel(Save.highest()); };
  $('btn-levels').onclick = function () { click(); buildLevels(); showOnly('levels'); state = 'menu'; };
  $('btn-upgrades').onclick = function () { click(); buildUpgrades(); showOnly('upgrades'); state = 'menu'; };
  $('btn-settings').onclick = function () { click(); buildSettings(); showOnly('settings'); state = 'menu'; };

  // ---- update banner ----
  var updater = SG.createUpdater({
    navigator: navigator, document: document, reload: function () { location.reload(); },
    onBanner: function () { $('update-banner').classList.remove('hidden'); },
    beforeReload: function () { Save.save(); }
  });
  $('update-banner').onclick = function () { updater.applyUpdate(); };
  $('btn-update').onclick = function () {
    click(); var st = $('update-status'); st.textContent = 'Checking…';
    updater.manualUpdate().then(function (r) { st.textContent = SG.UPDATE_MSG[r] || ''; });
  };
  if (!TEST && 'serviceWorker' in navigator) updater.register('./sw.js');

  // ---- gameplay ----
  function startLevel(n) {
    n = Math.max(1, Math.min(Levels.COUNT, n | 0)); cur = n; curLevel = Levels.get(n);
    Audio.resume(); renderer.setSkin(Save.skin());
    game.start(curLevel, Save.stats());
    activeSim = game; state = 'play'; paused = false; endTimer = 0;
    Save.d().plays++; Save.save();
    showOnly('none'); show('pause', false); show('result', false); setHud(true);
    $('hud-level').textContent = 'LEVEL ' + n + (curLevel.boss ? ' • BOSS' : '');
    var it = $('intro'); it.classList.remove('hidden', 'boss'); it.style.animation = 'none'; void it.offsetWidth; it.style.animation = '';
    if (curLevel.boss) it.classList.add('boss');
    $('intro-title').textContent = curLevel.boss ? 'BOSS: ' + curLevel.name : 'LEVEL ' + n; $('intro-sub').textContent = curLevel.boss ? 'Level ' + n : curLevel.name;
    var h = $('hint'); h.classList.toggle('hidden', n > 2); h.style.animation = 'none'; void h.offsetWidth; h.style.animation = '';
    var sh = ''; for (var i = 0; i < game.shieldMax; i++) sh += '<i></i>'; $('hud-shield').innerHTML = sh;
    lastShield = -1; lastBase = -1; lastKills = -1;
  }
  function pause() { if (state !== 'play') return; state = 'pause'; show('pause', true); }
  function resume() { if (state !== 'pause') return; state = 'play'; show('pause', false); }
  $('btn-pause').onclick = function () { click(); pause(); };
  $('btn-resume').onclick = function () { click(); resume(); };
  $('btn-restart').onclick = function () { click(); startLevel(cur); };
  $('btn-quit').onclick = function () { click(); goTitle(); };
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  $('btn-champ').onclick = function () { game.launchChampion(); };
  $('btn-retry').onclick = function () { click(); startLevel(cur); };
  $('btn-next').onclick = function () { click(); startLevel(cur + 1); };
  $('btn-menu').onclick = function () { click(); state = 'menu'; setHud(false); show('result', false); buildLevels(); showOnly('levels'); startDemo(); };

  function finish() {
    var win = game.result === 'win', stars = 0, coins, info;
    var prevBest = Save.stars(cur);
    if (win) {
      stars = 1; if (game.shield >= Math.ceil(game.shieldMax * 0.75)) stars++; if (game.winTime <= curLevel.par) stars++;
      coins = 25 + cur * 6 + stars * 15;
      info = 'Time ' + game.winTime.toFixed(0) + 's (par ' + curLevel.par + 's) • Shield ' + game.shield + '/' + game.shieldMax;
    } else {
      var prog = 1 - game.baseHp() / game.baseMax;
      coins = Math.round(5 + cur * 2 + prog * (20 + cur * 3));
      info = 'Base destroyed: ' + Math.round(prog * 100) + '% • Upgrade your cannon and try again!';
    }
    var d = Save.d(); d.coins += coins;
    if (win) { if (stars > prevBest) d.stars[cur] = stars; if (!d.best[cur] || game.winTime < d.best[cur]) d.best[cur] = Math.round(game.winTime * 10) / 10; }
    Save.save();
    $('res-title').textContent = win ? (curLevel.boss ? 'BOSS DOWN!' : 'VICTORY!') : 'OVERRUN!';
    document.querySelector('#screen-result .panel').classList.toggle('lose', !win);
    var si = $('res-stars').children;
    for (var i = 0; i < 3; i++) { si[i].className = i < stars ? 'on' : ''; si[i].style.animationDelay = (0.25 + i * 0.3) + 's'; }
    $('res-stars').style.visibility = win ? 'visible' : 'hidden';
    $('res-coins').textContent = '+' + coins; $('res-info').textContent = info;
    $('btn-next').classList.toggle('hidden', !win || cur >= Levels.COUNT);
    show('result', true); setHud(false); state = 'result';
    if (win) for (i = 0; i < stars; i++) setTimeout(function () { Audio.play('star'); }, 300 + i * 300);
  }

  // ---- input ----
  var ptr = null, lastX = 0, keys = {};
  canvas.addEventListener('pointerdown', function (e) {
    Audio.resume();
    if (state !== 'play') return;
    ptr = e.pointerId; lastX = e.clientX; game.held = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (er) { /* not capturable */ }
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (e.pointerId !== ptr || state !== 'play') return;
    var dx = e.clientX - lastX; lastX = e.clientX;
    game.targetX = Math.max(3, Math.min(97, game.targetX + dx / renderer.pxPerUnitCss() * 1.25));
    e.preventDefault();
  });
  function release(e) { if (e.pointerId === ptr) { ptr = null; game.held = !!keys[' ']; } }
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('keydown', function (e) {
    var k = e.key; keys[k] = true;
    if (k === ' ' ) { if (state === 'play') game.held = true; e.preventDefault(); }
    if (k === 'c' || k === 'C') game.launchChampion();
    if (k === 'p' || k === 'P' || k === 'Escape') { if (state === 'play') pause(); else if (state === 'pause') resume(); }
    if (k.indexOf('Arrow') === 0) e.preventDefault();
    Audio.resume();
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; if (e.key === ' ' && ptr === null) game.held = false; });
  window.addEventListener('blur', function () { keys = {}; });

  // ---- HUD refresh ----
  var lastKills = -1, lastShield = -1, lastBase = -1, lastCh = -1, lastReady = null;
  function updateHud() {
    var bh = Math.ceil(game.baseHp());
    if (bh !== lastBase) { lastBase = bh; $('hud-basetxt').textContent = bh; $('hud-basebar').style.width = (100 * bh / game.baseMax) + '%'; }
    if (game.shield !== lastShield) {
      lastShield = game.shield; var p = $('hud-shield').children;
      for (var i = 0; i < p.length; i++) p[i].className = i < game.shield ? '' : 'off';
    }
    if (game.kills !== lastKills) {
      var kc = $('hud-kills'); kc.textContent = game.kills; lastKills = game.kills;
      if (!kc.classList.contains('pop')) { kc.classList.add('pop'); setTimeout(function () { kc.classList.remove('pop'); }, 140); }
    }
    var ch = Math.round(game.charge);
    if (ch !== lastCh) { lastCh = ch; $('champ-fill').style.width = ch + '%'; }
    var ready = game.charge >= 100 && !game.over;
    if (ready !== lastReady) { lastReady = ready; var b = $('btn-champ'); b.disabled = !ready; b.classList.toggle('ready', ready); }
  }

  // ---- main loop ----
  var lastT = 0, fpsAvg = 60;
  function resize() {
    var r = stage.getBoundingClientRect(); renderer.resize(Math.max(1, r.width), Math.max(1, r.height));
  }
  window.addEventListener('resize', resize); window.addEventListener('orientationchange', resize);

  function frame(ts) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (ts - lastT) / 1000 || 0.016); lastT = ts;
    fpsAvg += (1 / Math.max(dt, 0.001) - fpsAvg) * 0.05;
    var t = ts / 1000;
    if (state === 'play' || state === 'result') {
      if (state === 'play') {
        var kx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0);
        if (kx) game.targetX = Math.max(3, Math.min(97, game.targetX + kx * 140 * dt));
        if (keys.ArrowUp) game.held = true;
      }
      game.update(dt); activeSim = game;
      if (state === 'play') { updateHud(); if (game.over) { state = 'ending'; endTimer = 1.3; } }
    } else if (state === 'ending') {
      game.update(dt); endTimer -= dt; updateHud();
      if (endTimer <= 0) finish();
    } else if (state === 'pause') {
      /* frozen */
    } else {
      if (demo.over) { endTimer += dt; if (endTimer > 1.5) { endTimer = 0; startDemo(); } }
      demo.update(dt); activeSim = demo;
    }
    renderer.draw(activeSim, t);
  }

  // ---- boot ----
  Audio.set(Save.d().sound);
  resize(); goTitle(); buildSettings();
  requestAnimationFrame(frame);
  // first touch anywhere unlocks audio
  window.addEventListener('pointerdown', function () { Audio.resume(); }, { once: true });

  // ---- test hook (?test=1) ----
  if (TEST) {
    SG.test = {
      levelCount: Levels.COUNT,
      startLevel: function (n) { startLevel(n); },
      winNow: function () { game.winNow(); },
      loseNow: function () { game.loseNow(); },
      stress: function (n) { game.stress(n); },
      state: function () {
        return { screen: state, level: cur, baseHp: game.baseHp(), baseMax: game.baseMax, units: game.nPlayer, enemies: game.nEnemy, fired: game.fired, shield: game.shield,
          result: game.result, time: game.time, peak: game.peak, peakUnits: game.peakUnits, wall: game.wallUsed, kills: game.kills, fps: fpsAvg, cannonX: game.cannonX, charge: game.charge };
      },
      champion: function () { game.charge = 100; return game.launchChampion(); }
    };
  }
})();
