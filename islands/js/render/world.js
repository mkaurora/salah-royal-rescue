/* World explorer: one canvas, ground pre-rendered per island into chunks, depth-sorted props / NPCs / items, ambient life,
 * smooth camera, collisions, virtual joystick + tap-to-move (A*), Action button, objective arrow. SI.world. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, SP = SI.sprites;
  var ISL = SI.islands, PATH = SI.path, BUILD = SI.build, Q = SI.quests, P = SI.progress, BI = SI.buildItems;
  var T = 48, CHN = 8, SPEED = 4.6, TAU = Math.PI * 2;

  var cv, g, host, W = 390, Hh = 844, dpr = 1, Z = 1, QS = 1;       // canvas, ctx, css size, dpr, zoom (css px per world px), sprite scale
  var isl = null, grid = null, mask = null, statics = [], floorObjs = [], dyn = [], inter = [], chunks = {}, chunkN = 0, frame = 0, wavesList = [];
  var player = { x: 0, y: 0, dir: 1, walk: 0, phase: 0, look: 0 }, cam = { x: 0, y: 0 }, t = 0, running = false, held = false, raf = 0, last = 0;
  var joy = { id: -1, dx: 0, dy: 0, mag: 0 }, keys = {}, route = null, routeI = 0, pending = null, marker = { x: 0, y: 0, t: -9 }, stuck = 0;
  var nearObj = null, hud = {}, parts = [], puffs = [], birds = [], vig = null, stepSide = 0, lastStepPh = 0, shake = 0;
  var stats = { upd: 0, drw: 0, wn: 0, n: 0, sum: 0, worst: 0, frames: 0, ring: new Float32Array(120), ri: 0 };
  var gateWas = false, vigW = 0, arrowT = 0, labelNear = null, npcMark = {};

  /* ------------------------------------------------------------------ setup */
  function build() {
    host = document.getElementById('scr-world'); host.innerHTML = '';
    cv = el('canvas', 'wcanvas'); host.appendChild(cv); g = cv.getContext('2d');
    var top = el('div', 'hud-top'); host.appendChild(top);
    hud.menu = el('button', 'hbtn menu', ui.icon('menu')); hud.menu.setAttribute('aria-label', 'Menu'); ui.on(hud.menu, function () { SI.game.pauseMenu(); });
    hud.track = el('button', 'tracker'); ui.on(hud.track, function () { SI.panels.questLog(); });
    hud.stats = el('div', 'hstats');
    top.append(hud.menu, hud.track, hud.stats);
    hud.xp = el('div', 'xpthin', '<i></i>'); host.appendChild(hud.xp);
    // joystick
    hud.joy = el('div', 'joy', '<div class="jbase"></div><div class="jknob"></div>'); host.appendChild(hud.joy);
    hud.knob = hud.joy.querySelector('.jknob');
    hud.act = el('button', 'actbtn hidden', '<span class="ai"></span><span class="al"></span>'); host.appendChild(hud.act);
    hud.act.addEventListener('click', function (e) { e.stopPropagation(); act(nearObj); });
    hud.toastArrow = el('div', 'arrowlabel hidden'); host.appendChild(hud.toastArrow);
    bindInput();
    root.addEventListener('resize', resize); root.addEventListener('orientationchange', function () { setTimeout(resize, 200); });
  }

  function resize() {
    if (!cv || !host || host.classList.contains('hidden')) return;
    var r = host.getBoundingClientRect(); W = Math.max(200, r.width); Hh = Math.max(300, r.height);
    dpr = Math.min(1.5, root.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
    var z = Math.max(0.8, Math.min(1.35, Math.min(W / 390, Hh / 760))); if (z !== Z) { Z = z; chunks = {}; chunkN = 0; }
    QS = dpr * Z;
    vig = null;
  }

  /* ------------------------------------------------------------------ input */
  function bindInput() {
    var base = hud.joy, jr = 46;
    function jpos(e) {
      var r = base.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy, d = Math.sqrt(dx * dx + dy * dy) || 1, m = Math.min(1, d / jr);
      joy.dx = dx / d; joy.dy = dy / d; joy.mag = d < 8 ? 0 : m;
      hud.knob.style.transform = 'translate(' + (joy.dx * Math.min(d, jr)) + 'px,' + (joy.dy * Math.min(d, jr)) + 'px)';
    }
    base.addEventListener('pointerdown', function (e) { e.preventDefault(); joy.id = e.pointerId; try { base.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } jpos(e); cancelRoute(); base.classList.add('on'); SI.audio.unlock(); });
    base.addEventListener('pointermove', function (e) { if (e.pointerId === joy.id) jpos(e); });
    function end(e) { if (e.pointerId !== joy.id) return; joy.id = -1; joy.mag = 0; hud.knob.style.transform = ''; base.classList.remove('on'); }
    base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end); base.addEventListener('lostpointercapture', end);
    // tap to move
    var down = null;
    cv.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
    cv.addEventListener('pointerup', function (e) {
      if (!down || down.id !== e.pointerId) return; var d = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t; down = null;
      if (d < 14 && dt < 600) tapAt(e.clientX, e.clientY);
    });
    cv.addEventListener('pointercancel', function () { down = null; });
    root.addEventListener('keydown', function (e) {
      if (ui.current() !== 'world') return;
      var k = e.key.toLowerCase(); keys[k] = true;
      if (k === ' ' || k === 'e' || k === 'enter') { if (nearObj && !ui.popupOpen()) act(nearObj); e.preventDefault(); }
      if (k.indexOf('arrow') === 0) e.preventDefault();
    });
    root.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  }

  function worldFromClient(cx, cy) {
    var r = cv.getBoundingClientRect(); return { x: (cx - r.left - W / 2) / Z + cam.x, y: (cy - r.top - Hh / 2) / Z + cam.y };
  }
  function tapAt(cx, cy) {
    if (ui.popupOpen() || !isl) return;
    var w = worldFromClient(cx, cy), tx = w.x / T, ty = w.y / T;
    // tapped an interactable? (the sprite stands above its tile, so look a little higher too)
    var best = null, bd = 1.1 * 1.1;
    for (var i = 0; i < inter.length; i++) {
      var o = inter[i]; if (!o.on()) continue;
      var dx = o.x + 0.5 - tx, dy = o.y + 0.5 - ty, dy2 = o.y - 0.2 - ty, d = Math.min(dx * dx + dy * dy, dx * dx + dy2 * dy2);
      if (d < bd) { bd = d; best = o; }
    }
    marker.x = tx; marker.y = ty; marker.t = t;
    if (best) { if (dist(player.x, player.y, best.x + 0.5, best.y + 0.5) <= SI.islands.INTERACT * 0.9) { act(best); return; } goTo(best.x, best.y, best); return; }
    goTo(Math.floor(tx), Math.floor(ty), null);
  }
  function dist(a, b, c, d) { return Math.hypot(a - c, b - d); }

  function goTo(gx, gy, obj) {
    var px = Math.floor(player.x), py = Math.floor(player.y);
    var reach = PATH.reach(grid, px, py), w = grid.w, tx = gx, ty = gy;
    if (gx < 0 || gy < 0 || gx >= w || gy >= grid.h || !reach[gy * w + gx]) {   // closest reachable tile to the tap
      var bd = 1e9, bx = -1, by = -1;
      for (var y = 0; y < grid.h; y++) for (var x = 0; x < w; x++) if (reach[y * w + x]) { var d = (x - gx) * (x - gx) + (y - gy) * (y - gy); if (d < bd) { bd = d; bx = x; by = y; } }
      if (bx < 0 || bd > 36) { bump(); return; }
      tx = bx; ty = by;
    }
    var p = PATH.astar(grid, px, py, tx, ty);
    if (!p) { bump(); return; }
    route = p; routeI = 1; pending = obj; stuck = 0;
    if (!obj) { marker.x = tx + 0.5; marker.y = ty + 0.5; marker.t = t; }
  }
  function cancelRoute() { route = null; pending = null; }
  function bump() { SI.audio.play('nope'); shake = 0.25; }

  /* ------------------------------------------------------------------ enter / leave */
  function enter(args) {
    if (!host) build();
    host.classList.remove('hidden');
    var S = A.S, n = (args && args.island) || S.islands.current;
    isl = ISL.byId[n]; S.islands.current = n;
    resize();
    gateWas = P.gateOpen(S, isl.gate.key);
    chunks = {}; chunkN = 0; isl._wd = null; frame = 0;
    var pos = args && args.spawn ? null : (S.world && S.world.island === n ? S.world : null), ar = ISL.arrival(isl);
    player.x = pos ? pos.x : ar.x; player.y = pos ? pos.y : ar.y; player.dir = 1; player.walk = 0; route = null; pending = null; joy.mag = 0;
    rebuildGrid(); rebuildEntities(); initAmbient();
    cam.x = player.x * T; cam.y = player.y * T; clampCam();
    // pre-render the chunks around the player so the first frame is complete
    var pc = Math.floor(player.x / CHUNK_T()), pr = Math.floor(player.y / CHUNK_T());
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) ensureChunk(pc + dx, pr + dy);
    refreshHud(); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
    if (args && args.arrive) SI.audio.play('splash');
    setTimeout(function () { if (SI.game && ui.current() === 'world') SI.game.onEnterIsland(isl); }, 350);
  }
  function leave() { savePos(); running = false; cancelAnimationFrame(raf); if (host) host.classList.add('hidden'); }
  function savePos() { if (isl && A.S) { A.S.world = { island: isl.n, x: +player.x.toFixed(2), y: +player.y.toFixed(2) }; A.persist(); } }
  function CHUNK_T() { return CHN; }

  function rebuildGrid() {
    var S = A.S, w = isl.w; mask = new Uint8Array(w * isl.h);
    var solid = BUILD.solidTiles(S, isl.zone.id);
    Object.keys(solid).forEach(function (k) { var p = k.split(','); mask[(+p[1]) * w + (+p[0])] = 1; });
    var open = P.gateOpen(S, isl.gate.key);
    grid = ISL.grid(isl, open, function (x, y) { return mask[y * w + x] === 1; });
    if (!PATH.circleFree(grid, player.x, player.y, 0.3)) {   // never leave the avatar stuck inside something
      var r = PATH.reach(grid, Math.floor(isl.spawn.x), Math.floor(isl.spawn.y)), bd = 1e9, bx = isl.spawn.x, by = isl.spawn.y;
      for (var y = 0; y < isl.h; y++) for (var x = 0; x < w; x++) if (r[y * w + x] && !mask[y * w + x]) { var d = (x + 0.5 - player.x) * (x + 0.5 - player.x) + (y + 0.5 - player.y) * (y + 0.5 - player.y); if (d < bd) { bd = d; bx = x; by = y; } }
      player.x = bx + 0.5; player.y = by + 0.5;
    }
  }

  /* entities: statics (props + placed items + signs, sorted by foot y), floor things, dynamics, interactables */
  function rebuildEntities() {
    var S = A.S, qs = QS, biome = isl.biome, x, y;
    statics = []; floorObjs = []; dyn = []; inter = [];
    for (y = 0; y < isl.h; y++) for (x = 0; x < isl.w; x++) {
      var ch = isl.rows[y].charAt(x);
      if (ch === 'T' || ch === 'R' || ch === '#') {
        var v = SP.H(x, y, 17) % 3;
        statics.push({ k: 'prop', x: x * T + T / 2, y: y * T + T - 4, ch: ch, sp: null, v: v, ph: SP.hf(x, y, 18) * TAU });
      }
    }
    // zone sign + gate sign + dock
    var zs = isl.zone.sign; statics.push({ k: 'sign', x: zs.x * T + T / 2, y: zs.y * T + T - 2, label: isl.zone.kind === 'home' ? '🏠' : '🔨', col: '#ffb23c' });
    var dk = isl.dock, dir = dockDir(); statics.push({ k: 'dock', x: dk.x * T + T / 2, y: dk.y * T + T / 2, dir: dir, ty: dk.y * T + T });
    // placed build items
    var z = isl.zone;
    BUILD.layoutOf(S, z.id).forEach(function (p) {
      var it = BI.byId[p.item], f = BUILD.footprint(p.item, p.rot), wx = (z.x + p.x) * T, wy = (z.y + p.y) * T;
      var o = { k: 'item', it: it, x: wx + f.w * T / 2, y: wy + f.h * T - 3, w: f.w, h: f.h, wx: wx, wy: wy, ph: p.uid };
      if (it.layer === 'floor') floorObjs.push(o); else statics.push(o);
    });
    statics.sort(function (a, b) { return a.y - b.y || a.x - b.x; });
    // dynamics
    isl.npcs.forEach(function (n) { var o = { k: 'npc', ref: n, x: n.x * T + T / 2, y: n.y * T + T - 4, ph: SP.hf(n.x, n.y, 3) * TAU }; dyn.push(o); inter.push({ kind: 'npc', id: n.id, x: n.x, y: n.y, ref: n, on: always }); });
    isl.spots.forEach(function (s) { floorObjs.push({ k: 'pad', ref: s, x: s.x * T + T / 2, y: s.y * T + T / 2, ph: SP.hf(s.x, s.y, 4) * TAU }); inter.push({ kind: 'spot', id: s.id, x: s.x, y: s.y, ref: s, on: always }); });
    isl.collectibles.forEach(function (c) { var o = { k: 'col', ref: c, x: c.x * T + T / 2, y: c.y * T + T - 6, ph: SP.hf(c.x, c.y, 5) * TAU }; dyn.push(o); inter.push({ kind: 'collectible', id: c.id, x: c.x, y: c.y, ref: c, on: function () { return !A.S.collectibles[c.id]; } }); });
    inter.push({ kind: 'zone', id: isl.zone.id, x: zs.x, y: zs.y, ref: isl.zone, on: always });
    inter.push({ kind: 'dock', id: 'dock' + isl.n, x: dk.x, y: dk.y, ref: dk, on: always });
    var ga = isl.gate.approach; inter.push({ kind: 'gate', id: isl.gate.id, x: ga.x, y: ga.y, ref: isl.gate, on: function () { return !P.gateOpen(A.S, isl.gate.key); } });
    dyn.push(playerEnt);
    // water sparkle list
    wavesList = []; var wd = SP.waterDist(isl);
    for (y = 0; y < isl.h; y++) for (x = 0; x < isl.w; x++) { var c2 = isl.rows[y].charAt(x); if ((c2 === '~') && wd[y * isl.w + x] >= 1 && wd[y * isl.w + x] <= 4 && SP.H(x, y, 21) % 5 < 2) wavesList.push({ x: x * T + 10 + SP.hf(x, y, 22) * 28, y: y * T + 10 + SP.hf(x, y, 23) * 28, ph: SP.hf(x, y, 24) * TAU }); }
    wavesList.sort(function (a, b) { return a.y - b.y; });
  }
  function always() { return true; }
  var playerEnt = { k: 'player', x: 0, y: 0 };
  function dockDir() {
    var d = isl.dock, dirs = [[0, 1], [1, 0], [-1, 0], [0, -1]];
    for (var i = 0; i < 4; i++) if (SP.tileAt(isl, d.x + dirs[i][0], d.y + dirs[i][1]) === '~') return dirs[i];
    return [0, 1];
  }

  /** things changed in the world (gate opened, items placed, collectibles) */
  function refresh() {
    if (!isl) return;
    var open = P.gateOpen(A.S, isl.gate.key);
    rebuildGrid(); rebuildEntities();
    if (open !== gateWas) { gateWas = open; chunks = {}; chunkN = 0; }
    refreshHud();
  }

  /* ------------------------------------------------------------------ chunks */
  function ensureChunk(cx, cy) {
    var cols = Math.ceil(isl.w / CHN), rows = Math.ceil(isl.h / CHN);
    if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) return null;
    var k = cy * cols + cx, c = chunks[k];
    if (c) { c.used = frame; return c; }
    c = chunks[k] = { cv: SP.paintChunk(isl, cx, cy, CHN, QS, gateWas), used: frame }; chunkN++;
    if (chunkN > 26) {   // evict the least recently used
      var ks = Object.keys(chunks).sort(function (a, b) { return chunks[a].used - chunks[b].used; });
      for (var i = 0; i < 8 && chunkN > 18; i++) if (chunks[ks[i]].used < frame - 2) { delete chunks[ks[i]]; chunkN--; }
    }
    return c;
  }

  /* ------------------------------------------------------------------ ambient */
  function initAmbient() {
    parts = []; puffs = []; birds = [];
    var b = isl.biome, n = b === 'snow' ? 46 : b === 'caves' ? 22 : b === 'lab' ? 16 : b === 'sky' ? 8 : 7, i;
    for (i = 0; i < n; i++) parts.push({ x: Math.random(), y: Math.random(), s: 0.5 + Math.random(), ph: Math.random() * TAU, vx: 0, vy: 0, wx: 0, wy: 0 });
    for (i = 0; i < 12; i++) puffs.push({ x: 0, y: 0, life: 0 });
    if (b === 'beach' || b === 'sky') for (i = 0; i < 3; i++) birds.push({ x: Math.random() * isl.w * T, y: Math.random() * isl.h * T, vx: 40 + Math.random() * 30, ph: Math.random() * TAU, s: 0.8 + Math.random() * 0.5 });
    for (i = 0; i < parts.length; i++) { var p = parts[i]; p.wx = (player.x + (Math.random() - 0.5) * 12) * T; p.wy = (player.y + (Math.random() - 0.5) * 16) * T; }
  }

  /* ------------------------------------------------------------------ update */
  function clampCam() {
    var hw = W / 2 / Z, hh = Hh / 2 / Z, mw = isl.w * T, mh = isl.h * T;
    cam.x = mw <= hw * 2 ? mw / 2 : Math.max(hw, Math.min(mw - hw, cam.x)); cam.y = mh <= hh * 2 ? mh / 2 : Math.max(hh, Math.min(mh - hh, cam.y));
  }

  function update(dt) {
    t += dt; frame++;
    var blocked = ui.popupOpen() || ui.current() !== 'world';
    var ix = 0, iy = 0, mag = 0;
    if (!blocked) {
      if (joy.mag > 0) { ix = joy.dx; iy = joy.dy; mag = joy.mag; }
      else {
        if (keys.arrowleft || keys.a) ix -= 1; if (keys.arrowright || keys.d) ix += 1; if (keys.arrowup || keys.w) iy -= 1; if (keys.arrowdown || keys.s) iy += 1;
        if (ix || iy) { var l = Math.hypot(ix, iy); ix /= l; iy /= l; mag = 1; cancelRoute(); }
      }
      if (mag > 0) cancelRoute();
      if (!mag && route) {   // follow the tap route
        var wp = route[routeI];
        if (!wp) { var po = pending; cancelRoute(); if (po) act(po); }
        else {
          var tx = wp.x + 0.5, ty = wp.y + 0.5, dx = tx - player.x, dy = ty - player.y, d = Math.hypot(dx, dy);
          var isLast = routeI === route.length - 1;
          if (d < (isLast ? 0.1 : 0.22)) { routeI++; if (routeI >= route.length) { var po2 = pending; cancelRoute(); if (po2) act(po2); } }
          else { ix = dx / d; iy = dy / d; mag = 1; }
          if (pending && dist(player.x, player.y, pending.x + 0.5, pending.y + 0.5) < 0.9) { var po3 = pending; cancelRoute(); act(po3); mag = 0; ix = iy = 0; }
        }
      }
    }
    var moved = 0;
    if (mag > 0) {
      var sp = SPEED * Math.min(1, 0.35 + mag * 0.9) * dt, r = PATH.move(grid, player.x, player.y, ix * sp, iy * sp, 0.3);
      moved = Math.hypot(r.x - player.x, r.y - player.y); player.x = r.x; player.y = r.y;
      if (Math.abs(ix) > 0.15) player.dir = ix > 0 ? 1 : -1;
      player.look = ix > 0.2 ? 1 : ix < -0.2 ? -1 : 0;
      if (route) { stuck = moved < sp * 0.2 ? stuck + dt : 0; if (stuck > 0.5) { cancelRoute(); bump(); } }
    }
    var tw = moved > 0 ? Math.min(1, moved / (SPEED * dt) * 1.2) : 0;
    player.walk += (tw - player.walk) * Math.min(1, dt * 12);
    if (player.walk > 0.05) { player.phase += dt * 11 * (0.6 + player.walk * 0.4); } else player.phase = player.phase % TAU * Math.max(0, 1 - dt * 8);
    var st = Math.floor(player.phase / Math.PI);
    if (player.walk > 0.2 && st !== lastStepPh) { lastStepPh = st; footstep(); }
    // camera
    var k = Math.min(1, dt * 7); cam.x += (player.x * T - cam.x) * k; cam.y += (player.y * T - 14 - cam.y) * k; clampCam();
    if (shake > 0) shake -= dt;
    // nearest interactable
    var best = null, bd = SI.islands.INTERACT * SI.islands.INTERACT;
    for (var i = 0; i < inter.length; i++) { var o = inter[i]; if (!o.on()) continue; var ddx = o.x + 0.5 - player.x, ddy = o.y + 0.5 - player.y, dd = ddx * ddx + ddy * ddy; if (dd <= bd) { bd = dd; best = o; } }
    if (best !== nearObj) { nearObj = best; updateAct(); }
    playerEnt.x = player.x * T; playerEnt.y = player.y * T + 6;
    updateAmbient(dt);
    if (frame % 3 === 0) prefetch();
    if (!(frame % 30)) updateArrowLabel();
  }

  /** build one missing chunk around the camera per call, so walking never has to paint a whole chunk at once */
  function prefetch() {
    var cs = CHN * T, cx0 = Math.floor(cam.x / cs), cy0 = Math.floor(cam.y / cs), cols = Math.ceil(isl.w / CHN), rows = Math.ceil(isl.h / CHN);
    for (var r = 1; r <= 2; r++) for (var dy = -r; dy <= r; dy++) for (var dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      var x = cx0 + dx, y = cy0 + dy; if (x < 0 || y < 0 || x >= cols || y >= rows || chunks[y * cols + x]) continue;
      ensureChunk(x, y); return;
    }
  }

  function footstep() {
    var ch = SP.tileAt(isl, Math.floor(player.x), Math.floor(player.y));
    SI.audio.play(ch === 's' ? 'stepSand' : 'step');
    for (var i = 0; i < puffs.length; i++) if (puffs[i].life <= 0) { var p = puffs[i]; p.x = player.x * T - player.dir * 6 + (Math.random() - 0.5) * 6; p.y = player.y * T + 8; p.life = 0.45; break; }
  }

  function updateAmbient(dt) {
    var b = isl.biome, i, p, vw = W / Z, vh = Hh / Z, x0 = cam.x - vw / 2, y0 = cam.y - vh / 2;
    for (i = 0; i < puffs.length; i++) if (puffs[i].life > 0) puffs[i].life -= dt;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      if (b === 'snow') { p.y += dt * (0.05 + p.s * 0.06); p.x += Math.sin(t * 0.8 + p.ph) * dt * 0.02; if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); } }
      else if (b === 'caves') { p.y -= dt * 0.02 * p.s; p.x += Math.sin(t * 0.6 + p.ph) * dt * 0.015; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); } }
      else if (b === 'lab') { p.y -= dt * (0.05 + p.s * 0.05); p.x += Math.sin(t + p.ph) * dt * 0.02; if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); } }
      else {   // butterflies wander in world space around the camera
        p.vx += (Math.cos(t * 0.9 + p.ph * 3) * 26 - p.vx) * dt * 2; p.vy += (Math.sin(t * 1.3 + p.ph * 2) * 22 - p.vy) * dt * 2; p.wx += p.vx * dt; p.wy += p.vy * dt;
        if (p.wx < x0 - 80 || p.wx > x0 + vw + 80 || p.wy < y0 - 80 || p.wy > y0 + vh + 80) { p.wx = x0 + Math.random() * vw; p.wy = y0 + Math.random() * vh; }
      }
    }
    for (i = 0; i < birds.length; i++) { p = birds[i]; p.x += p.vx * dt; if (p.x > isl.w * T + 60) { p.x = -60; p.y = Math.random() * isl.h * T; } }
  }

  /* ------------------------------------------------------------------ draw */
  function sx(wx) { return Math.round(((wx - cam.x) * Z + W / 2) * dpr) / dpr; }
  function sy(wy) { return Math.round(((wy - cam.y) * Z + Hh / 2) * dpr) / dpr; }

  function draw() {
    var P2 = isl.palette;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = SP.mixc(P2.water, '#0b3a6b', 0.28); g.fillRect(0, 0, W, Hh);
    var sh = shake > 0 ? Math.sin(shake * 60) * 3 : 0; if (sh) g.translate(sh, 0);
    // chunks
    var cs = CHN * T, vw = W / Z, vh = Hh / Z, x0 = cam.x - vw / 2, y0 = cam.y - vh / 2;
    var c0 = Math.floor(x0 / cs), c1 = Math.floor((x0 + vw) / cs), r0 = Math.floor(y0 / cs), r1 = Math.floor((y0 + vh) / cs), cx, cy;
    for (cy = r0; cy <= r1; cy++) for (cx = c0; cx <= c1; cx++) { var ch = ensureChunk(cx, cy); if (ch) { var px = sx(cx * cs), py = sy(cy * cs), px2 = sx((cx + 1) * cs), py2 = sy((cy + 1) * cs); g.drawImage(ch.cv, px, py, px2 - px, py2 - py); } }
    drawWaves(x0, y0, vw, vh);
    // floor pass
    var i, o;
    for (i = 0; i < floorObjs.length; i++) { o = floorObjs[i]; if (o.k === 'pad') drawPad(o); else drawItem(o); }
    drawDust();
    // sorted pass: statics (sorted) merged with dynamics (insertion-sorted)
    for (i = 1; i < dyn.length; i++) { var d = dyn[i], j = i - 1; while (j >= 0 && dyn[j].y > d.y) { dyn[j + 1] = dyn[j]; j--; } dyn[j + 1] = d; }
    var lo = 0, hi = statics.length, minY = y0 - 40, maxY = y0 + vh + 130;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (statics[mid].y < minY) lo = mid + 1; else hi = mid; }
    var si = lo, di = 0;
    for (;;) {
      var s = si < statics.length && statics[si].y <= maxY ? statics[si] : null, dd = di < dyn.length ? dyn[di] : null;
      if (!s && !dd) break;
      if (dd && (!s || dd.y <= s.y)) { di++; if (dd.x > x0 - 100 && dd.x < x0 + vw + 100 && dd.y > y0 - 40 && dd.y < y0 + vh + 130) drawDyn(dd); }
      else { si++; if (s.x > x0 - 100 && s.x < x0 + vw + 100) drawStatic(s); }
    }
    drawBirds(x0, y0, vw, vh);
    drawFlutter();
    // tint + vignette
    drawScreenParts();
    drawMarker(); drawArrow();
  }

  function drawWaves(x0, y0, vw, vh) {
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2; g.lineCap = 'round';
    var lo = 0, hi = wavesList.length; while (lo < hi) { var m = (lo + hi) >> 1; if (wavesList[m].y < y0 - 10) lo = m + 1; else hi = m; }
    for (var i = lo; i < wavesList.length; i++) {
      var w = wavesList[i]; if (w.y > y0 + vh + 10) break; if (w.x < x0 - 20 || w.x > x0 + vw + 20) continue;
      var a = 0.5 + 0.5 * Math.sin(t * 1.6 + w.ph); if (a < 0.25) continue; g.globalAlpha = a * 0.55;
      var X = sx(w.x), Y = sy(w.y) + Math.sin(t + w.ph) * 2; g.beginPath(); g.moveTo(X - 7 * Z, Y); g.quadraticCurveTo(X - 3 * Z, Y - 4 * Z, X, Y); g.quadraticCurveTo(X + 3 * Z, Y + 4 * Z, X + 7 * Z, Y); g.stroke();
    }
    g.globalAlpha = 1;
  }

  function spriteDraw(sp, wx, wy, scaleY, skew) {
    var X = sx(wx), Y = sy(wy), w = sp.w * Z, h = sp.h * Z;
    if (skew || scaleY !== 1) { g.save(); g.translate(X, Y); g.transform(1, 0, skew || 0, scaleY || 1, 0, 0); g.drawImage(sp.c, -sp.ax * Z, -sp.ay * Z, w, h); g.restore(); }
    else g.drawImage(sp.c, X - sp.ax * Z, Y - sp.ay * Z, w, h);
  }

  function drawStatic(s) {
    if (s.k === 'prop') {
      if (!s.sp) s.sp = SP.prop(isl.biome, s.ch, s.v, QS);
      var sway = s.ch === 'T' && isl.biome !== 'caves' ? Math.sin(t * 1.4 + s.ph) * 0.035 : 0;
      spriteDraw(s.sp, s.x, s.y, 1, sway);
    } else if (s.k === 'sign') {
      if (!s.sp) s.sp = SP.signSprite(s.label, s.col, QS); var sp = s.sp; g.drawImage(sp.c, sx(s.x) - 35 * Z, sy(s.y) - 62 * Z, sp.w * Z, sp.h * Z);
    } else if (s.k === 'dock') drawDock(s);
    else if (s.k === 'item') drawItem(s);
  }

  function drawDock(s) {
    var pier = SP.pier(QS), dx = s.dir[0], dy = s.dir[1], bo = SP.boat(QS), bob = Math.sin(t * 1.6) * 2.5;
    for (var i = 1; i <= 2; i++) {
      var px = s.x + dx * T * i, py = s.y + dy * T * i;
      g.save(); g.translate(sx(px), sy(py)); if (dx) g.rotate(Math.PI / 2); g.drawImage(pier.c, -T / 2 * Z, -T / 2 * Z, T * Z, T * Z); g.restore();
    }
    var bx = s.x + dx * T * 2.7 + (dx ? 0 : 36), by = s.y + dy * T * 2.7 + (dy ? 0 : 10);
    g.drawImage(bo.c, sx(bx) - 43 * Z, sy(by) - 46 * Z + bob, bo.w * Z, bo.h * Z);
  }

  var ITEM_BASE = { houses: 1.0, furniture: 0.82, plants: 0.95, paths: 0.8, fun: 0.9, lights: 0.9 };
  function drawItem(o) {
    var it = o.it, sizePx = Math.max(o.w, o.h) * T * (ITEM_BASE[it.cat] || 0.85) * (it.layer === 'floor' ? 0.9 : 1);
    if (it.layer === 'floor') { g.globalAlpha = 0.85; g.fillStyle = it.cat === 'paths' ? 'rgba(255,255,255,0.35)' : 'rgba(255,150,100,0.35)'; var X0 = sx(o.wx), Y0 = sy(o.wy); roundRect(X0 + 2, Y0 + 2, o.w * T * Z - 4, o.h * T * Z - 4, 8 * Z); g.fill(); g.globalAlpha = 1; }
    var em = SP.emoji(it.icon, Math.round(Math.min(120, sizePx)), QS), cxw = o.wx + o.w * T / 2, cyw = o.wy + o.h * T / 2;
    if (it.layer !== 'floor') { var X = sx(cxw), Y = sy(o.wy + o.h * T - 6); g.fillStyle = 'rgba(30,20,60,0.22)'; g.beginPath(); g.ellipse(X, Y, o.w * T * 0.4 * Z, 7 * Z, 0, 0, TAU); g.fill(); cyw = o.wy + o.h * T - sizePx * 0.5; }
    g.drawImage(em, sx(cxw) - em._w * Z / 2, sy(cyw) - em._h * Z / 2, em._w * Z, em._h * Z);
  }
  function roundRect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function drawPad(o) {
    var sp = SP.spotPad(o.ref.game, QS), X = sx(o.x), Y = sy(o.y + 8), pulse = 1 + Math.sin(t * 2.4 + o.ph) * 0.04;
    g.drawImage(sp.c, X - 40 * Z * pulse, Y - 42 * Z * pulse, sp.w * Z * pulse, sp.h * Z * pulse);
  }

  var gameEmoji = null;
  function drawDyn(o) {
    if (o.k === 'player') return drawPlayer();
    if (o.k === 'npc') {
      var sp = SP.npc(o.ref.id, QS), sq = Math.sin(t * 2 + o.ph) * 0.025, X = sx(o.x), Y = sy(o.y);
      g.save(); g.translate(X, Y); g.scale(1 - sq, 1 + sq); g.drawImage(sp.c, -sp.ax * Z, -sp.ay * Z, sp.w * Z, sp.h * Z); g.restore();
      var dd = dist(player.x, player.y, o.ref.x + 0.5, o.ref.y + 0.5), mk = npcMarkFor(o.ref.id);
      if (mk) drawMarkBubble(X, Y - 86 * Z + Math.sin(t * 3 + o.ph) * 3, mk);
      if (dd < 3.4) drawNameTag(X, Y - (mk ? 100 : 90) * Z, o.ref.name);
    } else if (o.k === 'col') {
      var c = o.ref, S = A.S; if (S.collectibles[c.id]) return;
      var cd = SI.collectibles.byId[c.id], bob = Math.sin(t * 2.6 + o.ph) * 3.5, X2 = sx(o.x), Y2 = sy(o.y);
      var gl = SP.glow(QS), ga = 0.65 + 0.35 * Math.sin(t * 3 + o.ph); g.globalAlpha = ga; g.drawImage(gl.c, X2 - 32 * Z, Y2 - 40 * Z + bob, 64 * Z, 64 * Z); g.globalAlpha = 1;
      g.fillStyle = 'rgba(30,20,60,0.2)'; g.beginPath(); g.ellipse(X2, Y2 + 2, 11 * Z, 4 * Z, 0, 0, TAU); g.fill();
      var em = SP.emoji(cd.icon, 26, QS); g.drawImage(em, X2 - em._w * Z / 2, Y2 - 20 * Z + bob - em._h * Z / 2, em._w * Z, em._h * Z);
      var tw = Math.sin(t * 4 + o.ph * 2); if (tw > 0.2) { drawSpark(X2 + 13 * Z, Y2 - 30 * Z + bob, 4 * tw * Z); }
    }
  }
  function npcMarkFor(id) {
    var ob = Q.objective(A.S); if (!ob) return null; var st = ob.step;
    if ((st.type === 'talk' || st.type === 'learn') && st.npc === id) return '!';
    var h = SI.questData.helpers.filter(function (x) { return x.npc === id && A.S.islands.unlocked.indexOf(x.island) >= 0; })[0];
    return h ? '★' : null;
  }
  function drawMarkBubble(X, Y, ch) {
    g.fillStyle = ch === '!' ? '#ffd23f' : '#8d6bff'; g.strokeStyle = ch === '!' ? '#a86b00' : '#3f2a96'; g.lineWidth = 2.4; g.beginPath(); g.arc(X, Y, 11 * Z, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = ch === '!' ? '#5a3300' : '#fff'; g.font = 'bold ' + Math.round(15 * Z) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, X, Y + 1);
  }
  function drawNameTag(X, Y, name) {
    g.font = 'bold ' + Math.round(12 * Z) + 'px system-ui,sans-serif'; var w = g.measureText(name).width + 14 * Z;
    g.fillStyle = 'rgba(45,27,82,0.78)'; roundRect(X - w / 2, Y - 10 * Z, w, 20 * Z, 10 * Z); g.fill(); g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, X, Y + 0.5);
  }
  function drawSpark(x, y, r) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r); g.fill(); }

  function drawPlayer() {
    var X = sx(player.x * T), Y = sy(player.y * T + 8);
    SI.avatar.draw(g, A.S.avatar, { x: X, y: Y, s: 0.64 * Z, t: t, dir: player.dir, walk: player.walk, phase: player.phase, look: player.look });
  }
  function drawDust() {
    for (var i = 0; i < puffs.length; i++) { var p = puffs[i]; if (p.life <= 0) continue; var k = p.life / 0.45; g.globalAlpha = k * 0.5; g.fillStyle = '#fff'; g.beginPath(); g.arc(sx(p.x), sy(p.y) - (1 - k) * 8, (3 + (1 - k) * 5) * Z, 0, TAU); g.fill(); }
    g.globalAlpha = 1;
  }
  function drawBirds(x0, y0, vw, vh) {
    if (!birds.length) return; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (var i = 0; i < birds.length; i++) {
      var b = birds[i]; if (b.x < x0 - 30 || b.x > x0 + vw + 30 || b.y < y0 - 30 || b.y > y0 + vh + 30) continue;
      var X = sx(b.x), Y = sy(b.y) + Math.sin(t * 2 + b.ph) * 4, f = Math.sin(t * 7 + b.ph) * 5 * b.s;
      g.fillStyle = 'rgba(30,20,60,0.12)'; g.beginPath(); g.ellipse(X, Y + 60 * Z, 8 * Z, 3 * Z, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(X - 11 * b.s * Z, Y + f); g.quadraticCurveTo(X - 5 * Z, Y - 5 * Z, X, Y); g.quadraticCurveTo(X + 5 * Z, Y - 5 * Z, X + 11 * b.s * Z, Y + f); g.stroke();
    }
  }
  function drawFlutter() {
    var b = isl.biome; if (b === 'snow' || b === 'caves' || b === 'lab') return;
    var cols = ['#ff7ac8', '#ffd23f', '#7fd6ff', '#c58bff'];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], X = sx(p.wx), Y = sy(p.wy), f = Math.abs(Math.sin(t * 14 + p.ph)) * 5 * Z + 1;
      g.fillStyle = cols[i % 4]; g.strokeStyle = 'rgba(45,27,82,0.5)'; g.lineWidth = 1;
      g.beginPath(); g.ellipse(X - 3 * Z, Y, f, 4 * Z, -0.4, 0, TAU); g.fill(); g.beginPath(); g.ellipse(X + 3 * Z, Y, f, 4 * Z, 0.4, 0, TAU); g.fill();
      g.fillStyle = '#2d1b52'; g.fillRect(X - 0.8, Y - 3 * Z, 1.6, 6 * Z);
    }
  }
  function drawScreenParts() {
    var b = isl.biome; if (b !== 'snow' && b !== 'caves' && b !== 'lab') return;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i], X = p.x * W, Y = p.y * Hh;
      if (b === 'snow') { g.globalAlpha = 0.85; g.fillStyle = '#fff'; g.beginPath(); g.arc(X, Y, 1.6 + p.s * 1.6, 0, TAU); g.fill(); }
      else if (b === 'caves') { g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 2 + p.ph); g.fillStyle = '#e8d6ff'; g.beginPath(); g.arc(X, Y, 2 + p.s * 1.4, 0, TAU); g.fill(); }
      else { g.globalAlpha = 0.5; g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.beginPath(); g.arc(X, Y, 3 + p.s * 4, 0, TAU); g.stroke(); }
    }
    g.globalAlpha = 1;
  }
  function drawMarker() {
    var a = t - marker.t; if (a > 0.7 || a < 0) return; var X = sx(marker.x * T), Y = sy(marker.y * T), k = a / 0.7;
    g.globalAlpha = 1 - k; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.ellipse(X, Y, (8 + k * 14) * Z, (4 + k * 7) * Z, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
  }

  /* objective pointer: bouncing arrow at the target when on screen, arrow at the screen edge otherwise */
  var tgt = null;
  function updateArrowLabel() { tgt = Q.target(A.S, isl.n); }
  function drawArrow() {
    if (!tgt) return;
    var X = sx(tgt.x * T + T / 2), Y = sy(tgt.y * T + T / 2 - 4), m = 46, bounce = Math.sin(t * 5) * 5;
    var onScreen = X > m && X < W - m && Y > 90 && Y < Hh - 120;
    var d = dist(player.x, player.y, tgt.x + 0.5, tgt.y + 0.5);
    if (onScreen) {
      if (d < 1.8) return;
      var ay = Y - 78 * Z + bounce; g.save(); g.translate(X, ay); g.fillStyle = '#ffd23f'; g.strokeStyle = '#a86b00'; g.lineWidth = 3; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(0, 16); g.lineTo(-13, -2); g.lineTo(-5, -2); g.lineTo(-5, -14); g.lineTo(5, -14); g.lineTo(5, -2); g.lineTo(13, -2); g.closePath(); g.fill(); g.stroke(); g.restore();
    } else {
      var cx = W / 2, cy = Hh / 2, dx = X - cx, dy = Y - cy, ang = Math.atan2(dy, dx), ex = W / 2 - 40, ey = Hh / 2 - 110, k = Math.min(Math.abs(ex / (Math.cos(ang) || 1e-6)), Math.abs(ey / (Math.sin(ang) || 1e-6)));
      var px = cx + Math.cos(ang) * k, py = cy + Math.sin(ang) * k + 10;
      g.save(); g.translate(px, py); g.fillStyle = 'rgba(45,27,82,0.7)'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.rotate(ang); g.translate(bounce * 0.4, 0); g.fillStyle = '#ffd23f'; g.strokeStyle = '#a86b00'; g.lineWidth = 2.4; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(12, 0); g.lineTo(-3, -11); g.lineTo(-3, -4); g.lineTo(-10, -4); g.lineTo(-10, 4); g.lineTo(-3, 4); g.lineTo(-3, 11); g.closePath(); g.fill(); g.stroke(); g.restore();
    }
  }

  /* ------------------------------------------------------------------ HUD */
  var ACT = { npc: ['💬', 'Talk'], spot: ['🎮', 'Play'], collectible: ['✨', 'Collect'], zone: ['🔨', 'Build'], dock: ['⛵', 'Sail'], gate: ['🌉', 'Fix bridge'] };
  function updateAct() {
    if (!nearObj) { hud.act.classList.add('hidden'); return; }
    var a = ACT[nearObj.kind], label = a[1];
    if (nearObj.kind === 'zone') label = isl.zone.kind === 'home' ? 'Build' : 'Decorate';
    if (nearObj.kind === 'npc') label = 'Talk';
    hud.act.querySelector('.ai').textContent = a[0]; hud.act.querySelector('.al').textContent = label;
    hud.act.classList.remove('hidden'); hud.act.classList.remove('pop'); void hud.act.offsetWidth; hud.act.classList.add('pop');
    SI.audio.play('pop');
  }
  function refreshHud() {
    if (!hud.stats || !isl) return;
    var S = A.S, ob = Q.objective(S), lv = P.levelFromXp(S.xp);
    hud.stats.innerHTML = '<div class="chip coin" data-t="coins">' + ui.icon('coin') + '<b>' + S.coins + '</b></div><div class="lvbadge">Lv ' + S.level + '</div>';
    hud.xp.firstChild.style.width = (lv.need ? Math.round(100 * lv.into / lv.need) : 100) + '%';
    if (ob) {
      var pr = ob.progress, cnt = ob.step.type === 'talk' ? '' : ' <b>' + pr.have + '/' + pr.need + '</b>';
      hud.track.innerHTML = '<span class="tk-ic">' + ui.icon('scroll') + '</span><span class="tk-tx"><small>' + ui.esc(ob.chain.title) + ' · ' + (ob.index + 1) + '/' + ob.total + '</small>' + ui.esc(ob.text) + cnt + '</span>';
      hud.track.classList.remove('hidden');
    } else hud.track.innerHTML = '<span class="tk-ic">' + ui.icon('trophy') + '</span><span class="tk-tx"><small>All quests done</small>Keep exploring!</span>';
    updateArrowLabel();
  }

  function act(o) { if (!o) return; if (SI.game) SI.game.interact(o, isl); }

  function loop(now) {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (document.hidden || held) return;
    var t0 = performance.now();
    update(dt); var t1 = performance.now(); draw(); var t2 = performance.now(); stats.upd += t1 - t0; stats.drw += t2 - t1; stats.wn++;
    var ft = now - (stats.prev || now); stats.prev = now;
    if (ft > 0 && ft < 500) { stats.ring[stats.ri++ % 120] = ft; stats.frames++; }
  }

  function fps(reset) {
    var n = Math.min(stats.frames, 120), s = 0, w = 0; for (var i = 0; i < n; i++) { s += stats.ring[i]; if (stats.ring[i] > w) w = stats.ring[i]; }
    var r = { updMs: stats.wn ? +(stats.upd / stats.wn).toFixed(2) : 0, drawMs: stats.wn ? +(stats.drw / stats.wn).toFixed(2) : 0, avgMs: n ? +(s / n).toFixed(2) : 0, worstMs: +w.toFixed(1), fps: n ? +(1000 / (s / n)).toFixed(1) : 0, frames: stats.frames };
    if (reset) { stats.frames = 0; stats.ri = 0; stats.upd = stats.drw = stats.wn = 0; }
    return r;
  }

  SI.ui.register('world', { enter: enter, leave: leave });
  SI.world = {
    refresh: refresh, refreshHud: refreshHud, savePos: savePos, fps: fps,
    teleport: function (x, y) { player.x = x; player.y = y; cam.x = x * T; cam.y = y * T; clampCam(); cancelRoute(); },
    player: function () { return { x: player.x, y: player.y }; },
    island: function () { return isl; },
    near: function () { return nearObj; },
    walkTo: function (x, y) { goTo(Math.floor(x), Math.floor(y), null); },
    joyInfo: function () { return { mag: joy.mag, dx: joy.dx, dy: joy.dy }; },
    hasRoute: function () { return !!route; },
    screenOf: function (tx, ty) { var r = cv.getBoundingClientRect(); return { x: r.left + sx(tx * T), y: r.top + sy(ty * T) }; },
    act: function () { act(nearObj); },
    chunkCount: function () { return chunkN; },
    hold: function (on) { held = !!on; if (!on) last = performance.now(); },
    isRunning: function () { return running; }
  };
})(typeof self !== 'undefined' ? self : this);
