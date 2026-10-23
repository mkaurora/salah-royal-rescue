/* Workshop home: garage scene canvas (animated vehicle), top bar, repair progress bar, side icons, big Level button,
 * chest button, bottom nav (Vehicles | Trophies | Workshop | Paint Shop | Settings) and the tab panels' host.
 * Also the repair animation (tool shakes, part appears) and the vehicle-complete drive-out. TW.home. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {}, UI = TW.ui, A = TW.app, el = UI.el, $ = UI.$, on = UI.on, icon = UI.icon;
  var P = TW.progress, V = TW.vehicles, FX = TW.fx;

  var H = { tab: 'workshop', visible: false };
  var root_, cv, g, dpr = 1, W = 0, Hh = 0, bg = null, bgKey = '', raf = 0, last = 0, T = 0;
  var lastDraw = 0, acc = 0, fixA = null, drive = null, override = null, bounce = 0, spin = 0, confetti = [];
  var ui = {};

  var AVATAR = '<svg viewBox="0 0 48 48"><circle cx="24" cy="26" r="15" fill="#ffcf9e" stroke="#6b3d1a" stroke-width="2.5"/><path d="M8 24a16 16 0 0 1 32 0z" fill="#ffc21f" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/><rect x="5" y="22" width="38" height="6" rx="3" fill="#ffb000" stroke="#7a4a00" stroke-width="3"/><rect x="20" y="6" width="8" height="12" rx="2" fill="#ffd95a" stroke="#7a4a00" stroke-width="2"/><circle cx="18" cy="32" r="2.2" fill="#3b2410"/><circle cx="30" cy="32" r="2.2" fill="#3b2410"/><path d="M18 38q6 5 12 0" fill="none" stroke="#3b2410" stroke-width="2.5" stroke-linecap="round"/></svg>';

  function build() {
    root_ = $('#home'); root_.innerHTML = '';
    cv = el('canvas', 'scene'); root_.appendChild(cv); g = cv.getContext('2d');
    // top bar
    var top = el('div', 'topbar');
    var av = el('button', 'avatar', AVATAR); on(av, function () { go('settings'); });
    function pill(cls, ic, id) { var p = el('div', 'pill ' + cls); p.innerHTML = icon(ic, 'pico') + '<span class="pnum" id="' + id + '">0</span>'; return p; }
    ui.coinPill = pill('coin', 'coin', 'n-coins'); ui.starPill = pill('star', 'star', 'n-stars'); ui.wrPill = pill('wr', 'wrench', 'n-wr');
    var menu = el('button', 'menubtn', icon('menu')); menu.setAttribute('aria-label', 'Menu'); on(menu, function () { go('settings'); });
    top.append(av, ui.coinPill, ui.starPill, ui.wrPill, menu);
    root_.appendChild(top);
    // progress bar (vehicle repair)
    var pb = el('div', 'progbar');
    pb.innerHTML = '<div class="pb-ic"></div><div class="pb-track"><div class="pb-fill"></div><div class="pb-txt"></div></div><div class="pb-end"></div><div class="pb-name"></div>';
    ui.pb = pb; root_.appendChild(pb);
    pb.querySelector('.pb-end').innerHTML = icon('wrench');
    pb.querySelector('.pb-ic').appendChild(TW.sprites.icon('tile1', 40));
    on(pb, function () { TW.panels.openTasks(); });
    // side icons
    ui.left = el('div', 'side left'); ui.right = el('div', 'side right');
    root_.append(ui.left, ui.right);
    // bottom row
    var row = el('div', 'bottomrow');
    ui.lvl = el('button', 'btn-level'); on(ui.lvl, function () { TW.play.openPre(A.S.level); });
    ui.chest = el('button', 'btn-chest'); on(ui.chest, function () { TW.panels.chestTap(); });
    row.append(ui.lvl, ui.chest); root_.appendChild(row);
    // tab panel host
    ui.panel = el('div', 'tabpanel hidden'); root_.appendChild(ui.panel);
    // nav
    var nav = el('nav', 'nav');
    [['vehicles', 'Vehicles', 'car'], ['trophies', 'Trophies', 'trophy'], ['workshop', 'Workshop', 'wrench'], ['paint', 'Paint Shop', 'paint'], ['settings', 'Settings', 'gear']].forEach(function (t) {
      var b = el('button', 'tab t-' + t[0], '<span class="tico">' + UI.ICON[t[2]] + '</span><span class="tlbl">' + t[1] + '</span>');
      b.dataset.tab = t[0]; on(b, function () { go(t[0]); }); nav.appendChild(b);
    });
    root_.appendChild(nav); ui.nav = nav;
    cv.addEventListener('pointerdown', function (e) {
      if (H.tab !== 'workshop' || fixA || drive) return;
      var r = cv.getBoundingClientRect(), y = (e.clientY - r.top) / r.height;
      if (y > 0.2 && y < 0.7) { bounce = 1; var cur = vState(); if (cur.st.done.horn) TW.audio.play('horn'); else TW.audio.play('pop'); setTimeout(function () { if (H.tab === 'workshop' && !fixA) TW.panels.openTasks(); }, 260); }
    });
    root.addEventListener('resize', onResize);
  }

  function onResize() { if (!root_) return; layoutScene(); }
  function layoutScene() {
    var r = root_.getBoundingClientRect(); if (!r.width) return;
    dpr = Math.min(2, root.devicePixelRatio || 1);
    W = r.width; Hh = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
    bg = null;
  }

  function go(tab) {
    if (tab === H.tab) { if (tab !== 'workshop') { /* stay */ } return; }
    H.tab = tab; TW.audio.play('whoosh');
    Array.prototype.forEach.call(ui.nav.children, function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    var show = tab !== 'workshop';
    ui.panel.classList.toggle('hidden', !show);
    root_.classList.toggle('in-panel', show);
    if (show) {
      ui.panel.innerHTML = ''; ui.panel.className = 'tabpanel p-' + tab;
      TW.panels[tab](ui.panel);
      ui.panel.classList.remove('pop'); void ui.panel.offsetWidth; ui.panel.classList.add('pop');
    }
    TW.audio.setMood('home');
  }

  /* ---- state -> what to draw ---- */
  function doneMap(info, n) { var m = {}; info.tasks.slice(0, n).forEach(function (t) { m[t.id] = true; }); return m; }
  function vState() {
    var S = A.S, v = override;
    if (!v) { var info = V.vehicleInfo(S.ws.cur); v = { info: info, st: { done: doneMap(info, S.ws.done), choices: S.ws.choices[S.ws.cur] || {}, t: T, spin: spin } }; }
    if (fixA && !fixA.revealed) { var d = {}; for (var k in v.st.done) if (k !== fixA.task.id) d[k] = true; return { info: v.info, st: { done: d, choices: v.st.choices, t: T, spin: spin } }; }
    return v;
  }

  function vehBox() { var bw = W * 0.78, bh = bw / 1.83; return { x: (W - bw) / 2, w: bw, h: bh, y: Hh * 0.675 - bh * 0.826 }; }

  function frame(tm) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (tm - last) / 1000); last = tm; T += dt;
    if (!H.visible || H.tab !== 'workshop' || !W) { if (H.visible && H.tab !== 'workshop') FX.update(dt, tm); return; }
    FX.update(dt, tm);
    acc += dt;
    if (tm - lastDraw < 28 && !fixA && !drive) return;   // ~30fps is plenty for the idle garage
    lastDraw = tm; render(Math.min(0.1, acc)); acc = 0;
  }

  function render(dt) {
    if (!bg) { var info0 = V.vehicleInfo(0); bg = TW.scene.build(Math.round(W * dpr), Math.round(Hh * dpr), info0); }
    g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bg, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var vs = vState(), vb = vehBox(), bx = vb.x, bw = vb.w, bh = vb.h, by = vb.y;
    var offx = 0, sc = 1, rot = 0, yoff = 0;
    if (bounce > 0) { bounce = Math.max(0, bounce - dt * 3.2); sc = 1 + Math.sin(bounce * Math.PI) * 0.045; yoff = -Math.sin(bounce * Math.PI) * 6; }
    if (drive) {
      drive.t += dt;
      if (drive.phase === 'out') { var u = Math.min(1, drive.t / 1.3); offx = u * u * (W + 200); spin += dt * 14 * (0.3 + u * 2); yoff = -Math.sin(u * 40) * 1.2; if (Math.random() < 0.6) FX.smoke(bx + 20 + offx, by + bh * 0.78, '#ffffff'); if (u >= 1) { drive.phase = 'in'; drive.t = 0; override = null; drive.swapped = true; if (drive.onSwap) drive.onSwap(); } }
      else { var u2 = Math.min(1, drive.t / 1.1); offx = -(1 - u2) * (1 - u2) * (W + 200); spin += dt * 14 * (1 - u2 + 0.1); if (u2 >= 1) { var cb = drive.done; drive = null; if (cb) cb(); } }
    } else spin += 0;
    // lift pad shadow
    g.save();
    g.translate(offx + (bx + bw / 2) * (1 - sc), (by + bh) * (1 - sc) + yoff); g.scale(sc, sc);
    vs.st.t = T; vs.st.spin = spin;
    TW.vehicle.draw(g, vs.info, vs.st, bx, by, bw, bh);
    g.restore();
    // fix animation overlay
    if (fixA) {
      fixA.t += dt;
      var a = fixA.anchor, bb = TW.vehicle.box(bw, bh), ax = bx + bb.ox + a[0] * bb.sc, ay = by + bb.oy + a[1] * bb.sc;
      if (!fixA.revealed) {
        var u3 = fixA.t / 0.8;
        g.save(); g.translate(ax + 20, ay - 24 + Math.sin(fixA.t * 28) * 3); g.rotate(-0.6 + Math.sin(fixA.t * 30) * 0.35);
        var tool = TW.sprites.icon('hammer', 56); g.drawImage(tool, -28, -28, 56, 56); g.restore();
        if (Math.random() < 0.5) FX.emit(FX.K.DOT, ax + (Math.random() - 0.5) * 30, ay + (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 120, -60 - Math.random() * 80, 0.4, 4, '#ffd54f', 300, 0);
        if (!fixA.rs) { fixA.rs = 1; }
        if (fixA.t >= 0.8) {
          fixA.revealed = true; bounce = 1;
          FX.sparkle(ax, ay, 16, '#ffe066', 70); FX.shape(FX.S.RING, ax, ay, 0, 0, 450, '#ffe066', 70); FX.shape(FX.S.FLASH, ax - 90, ay - 70, 180, 140, 260, '#fffbe0');
          TW.audio.play('fix');
        }
      } else if (fixA.t > 1.5) { var cb2 = fixA.done; fixA = null; if (cb2) cb2(); }
    }
    FX.draw(g, sp()); FX.drawTexts(g);
    if (confetti.length) drawConfetti(dt);
  }
  var spCache = null;
  function sp() { if (!spCache) spCache = TW.sprites.build(48); return spCache; }

  function drawConfetti(dt) {
    var cols = ['#ff5252', '#ffd54f', '#66bb6a', '#42a5f5', '#ab47bc', '#ff9800'];
    for (var i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i]; c.t += dt; c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 260 * dt; c.r += c.vr * dt;
      if (c.y > Hh + 20) { confetti.splice(i, 1); continue; }
      g.save(); g.translate(c.x, c.y); g.rotate(c.r); g.fillStyle = cols[c.k]; g.fillRect(-4, -2.5, 8, 5); g.restore();
    }
  }
  H.confetti = function (n) { for (var i = 0; i < n; i++) confetti.push({ x: W * Math.random(), y: -10 - Math.random() * 200, vx: (Math.random() - 0.5) * 80, vy: 60 + Math.random() * 120, r: 0, vr: (Math.random() - 0.5) * 12, k: (Math.random() * 6) | 0, t: 0 }); };

  /** Repair animation. Calls done() when finished. The state change itself must already be made by the caller. */
  H.playFix = function (task, info, done) {
    fixA = { t: 0, task: task, anchor: TW.vehicle.anchor(info, task.id), done: done, revealed: false };
    TW.audio.play('ratchet'); setTimeout(function () { TW.audio.play('ratchet'); }, 330);
  };
  /** Vehicle complete: keep drawing the finished vehicle, drive out, swap to the new one, drive in. */
  H.driveOut = function (finishedIdx, finishedChoices, onSwap, done) {
    var info = V.vehicleInfo(finishedIdx), all = doneMap(info, info.tasks.length);
    override = { info: info, st: { done: all, choices: finishedChoices, t: T, spin: 0 } };
    drive = { phase: 'out', t: 0, onSwap: onSwap, done: done }; TW.audio.play('drive');
  };
  H.freeze = function (idx) { var info = V.vehicleInfo(idx); override = { info: info, st: { done: doneMap(info, info.tasks.length), choices: A.S.ws.choices[idx] || {}, t: T } }; };
  H.unfreeze = function () { override = null; };
  H.anchorScreen = function (taskId) {
    var info = V.vehicleInfo(A.S.ws.cur), vb = vehBox(), bx = vb.x, bw = vb.w, bh = vb.h, by = vb.y, a = TW.vehicle.anchor(info, taskId), bb = TW.vehicle.box(bw, bh);
    var r = cv.getBoundingClientRect(); return { x: r.left + bx + bb.ox + a[0] * bb.sc, y: r.top + by + bb.oy + a[1] * bb.sc };
  };

  function sideBtn(cls, ic, label, labelCls, fn, badge) {
    var b = el('button', 'sbtn s-' + cls);
    b.innerHTML = '<span class="sdisc">' + (typeof ic === 'string' && ic.charAt(0) === '<' ? ic : icon(ic)) + '</span><span class="slbl ' + (labelCls || '') + '">' + label + '</span>' + (badge ? '<span class="sbadge">' + badge + '</span>' : '');
    on(b, fn); return b;
  }

  /** Re-read the save and update every number / label. */
  H.refresh = function () {
    var S = A.S; if (!root_) return;
    $('#n-coins').textContent = S.coins; $('#n-stars').textContent = S.stats.stars; $('#n-wr').textContent = S.wrenches;
    var cur = P.currentVehicle(S);
    ui.pb.querySelector('.pb-fill').style.width = Math.max(4, cur.percent) + '%';
    ui.pb.querySelector('.pb-txt').textContent = cur.info.name + '  ' + cur.done + '/' + cur.total;
    ui.lvl.innerHTML = '<span class="lvl-txt">Level ' + S.level + '</span><span class="sparkle"></span>';
    var pct = P.chestPercent(S), full = P.chestFull(S);
    ui.chest.className = 'btn-chest' + (full ? ' full' : '');
    ui.chest.innerHTML = '<span class="ch-no">NO.' + S.chest.no + '</span><span class="ch-bar"><i style="width:' + Math.max(pct, 6) + '%"></i><b>' + pct + '%</b></span><span class="ch-ic">' + UI.ICON.chest + '</span>' + (full ? '<span class="sbadge">1</span>' : '');
    var today = UI.today(), canGift = P.canDaily(S, today), nt = P.nextTasks(S, 1)[0], afford = nt && nt.affordable;
    ui.left.innerHTML = ''; ui.right.innerHTML = '';
    ui.left.appendChild(sideBtn('gift', 'gift', canGift ? 'Open' : 'Tomorrow', canGift ? 'go' : 'off', function () { TW.panels.openDaily(); }, canGift ? '!' : ''));
    ui.left.appendChild(sideBtn('veh', 'car', S.ws.album.length + ' cars', 'blue', function () { go('vehicles'); }));
    ui.left.appendChild(sideBtn('paint', 'paint', 'Paint', 'blue', function () { go('paint'); }));
    ui.right.appendChild(sideBtn('tasks', 'clipboard', afford ? 'Fix!' : 'Tasks', afford ? 'go' : 'gold', function () { TW.panels.openTasks(); }, afford ? '1' : ''));
    ui.right.appendChild(sideBtn('trophy', 'trophy', 'Trophies', 'blue', function () { go('trophies'); }));
    var bsum = S.boosters.rocket + S.boosters.dynamite + S.boosters.rainbow + S.boosters.hammer + S.boosters.shuffle;
    ui.right.appendChild(sideBtn('boost', '', 'x' + bsum, 'gold', function () { TW.panels.boostersInfo(); }));
    var bd = ui.right.lastChild.querySelector('.sdisc'); bd.innerHTML = ''; bd.appendChild(UI.boosterIcon('rainbow', 40));
    Array.prototype.forEach.call(ui.nav.children, function (b) { b.classList.toggle('on', b.dataset.tab === H.tab); });
    if (H.tab !== 'workshop' && ui.panel && !ui.panel.classList.contains('hidden')) { /* panel refreshes itself */ }
  };

  H.show = function () {
    $('#game').classList.add('hidden'); root_.classList.remove('hidden'); H.visible = true;
    layoutScene(); H.refresh(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    TW.audio.setMood('home');
  };
  H.hide = function () { H.visible = false; root_.classList.add('hidden'); };
  H.go = go;
  H.curTab = function () { return H.tab; };
  H.reloadTab = function () { if (H.tab !== 'workshop') { var t = H.tab; H.tab = '__'; go(t); } };
  H.init = function () { build(); layoutScene(); };
  H.loopStop = function () { cancelAnimationFrame(raf); raf = 0; };
  TW.home = H;
})(typeof self !== 'undefined' ? self : this);
