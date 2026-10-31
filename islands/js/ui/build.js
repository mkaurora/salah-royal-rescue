/* Build / decorate mode (SI.buildUI.open(island)): the zone grid on a canvas + an item drawer by category (costs, locks,
 * buy with coins/gems). Tap or drag to place, drag to move, rotate, store. Footprint preview is green when valid, red when not.
 * Everything saved through SI.build (pure logic) and drawn in the world afterwards; solid items block the avatar. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on;
  var P = SI.progress, BUILD = SI.build, BI = SI.buildItems, Q = SI.quests, SP = SI.sprites;
  var GROUND = { beach: ['#f3dd9b', '#ecd18a', '#8fd05a'], jungle: ['#86d16c', '#79c761', '#4fa04a'], caves: ['#c9b6ff', '#bda6fb', '#8d6bff'], snow: ['#f2f9ff', '#e2f0fb', '#9ac7e8'], sky: ['#c8efa8', '#bce99a', '#6fd0a0'], lab: ['#efd2a6', '#e8c797', '#c98a50'] };
  var REASON = { overlap: 'Something is in the way', bounds: 'Keep it inside the plot', 'home-only': 'Only for your home plot', 'none-left': 'You have no more of these', 'no-room': 'No room to turn here' };

  var st = null;   // the open session

  function open(isl) {
    if (st) close();
    var z = isl.zone, host = document.getElementById('bm'), S = A.S, dpr = Math.min(2, root.devicePixelRatio || 1);
    var ground = GROUND[isl.biome] || GROUND.beach;
    st = { isl: isl, z: z, cat: BI.CATS[0], preview: null, sel: null, drag: null, info: null, cell: 30, ox: 0, oy: 0, t0: performance.now(), raf: 0, dpr: dpr, ground: ground };
    host.innerHTML = ''; host.classList.remove('hidden');
    if (SI.world && SI.world.hold) SI.world.hold(true);
    var top = el('div', 'bmtop');
    var done = el('button', 'btn small green bmdone', ui.icon('check') + ' Done'); on(done, close);
    var title = el('div', 'bmtitle', '<b>' + ui.esc(z.label) + '</b><small class="bmcount"></small>');
    var chips = el('div', 'chips bmchips'); top.append(done, title, chips);
    var wrap = el('div', 'bmplay'), cv = document.createElement('canvas'); wrap.appendChild(cv);
    var msg = el('div', 'bmmsg'), bar = el('div', 'bmbar'), drawer = el('div', 'bmdrawer');
    var tabs = el('div', 'bmtabs'), list = el('div', 'bmlist'); drawer.append(tabs, list);
    host.append(top, wrap, msg, bar, drawer);
    st.el = { host: host, cv: cv, wrap: wrap, msg: msg, bar: bar, tabs: tabs, list: list, chips: chips, count: title.querySelector('.bmcount') };
    st.g = cv.getContext('2d');
    paintTabs(); paintList(); paintBar(); paintChips(); size();

    cv.addEventListener('pointerdown', pdown); cv.addEventListener('pointermove', pmove); cv.addEventListener('pointerup', pup); cv.addEventListener('pointercancel', pup);
    st.onResize = function () { setTimeout(function () { if (st) { size(); } }, 120); }; root.addEventListener('resize', st.onResize);
    st.vis = function () { if (document.hidden && st) A.persist(); }; document.addEventListener('visibilitychange', st.vis);
    loop();
    if (!S.seen.tutorials || !S.seen.tutorials.build) {
      S.seen.tutorials = S.seen.tutorials || {}; S.seen.tutorials.build = true; A.persist();
      setTimeout(function () { if (st) ui.toast('Pick an item below, then tap or drag it onto the plot', 3200); }, 300);
    }
  }

  function close() {
    if (!st) return;
    var s = st; st = null; cancelAnimationFrame(s.raf); root.removeEventListener('resize', s.onResize); document.removeEventListener('visibilitychange', s.vis);
    s.el.host.classList.add('hidden'); s.el.host.innerHTML = '';
    A.persist();
    if (SI.world) { SI.world.hold(false); SI.world.refresh(); }
    SI.game.questEvents(SI.game.track(function () { return Q.advance(A.S); }));
  }

  function size() {
    var b = st.el.wrap.getBoundingClientRect(), W = Math.max(200, Math.round(b.width)), H = Math.max(150, Math.round(b.height)), z = st.z;
    st.W = W; st.H = H; var cv = st.el.cv; cv.width = Math.round(W * st.dpr); cv.height = Math.round(H * st.dpr); cv.style.width = W + 'px'; cv.style.height = H + 'px';
    st.g.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
    st.cell = Math.max(14, Math.floor(Math.min((W - 16) / z.w, (H - 16) / z.h, 56)));
    st.ox = Math.round((W - st.cell * z.w) / 2); st.oy = Math.round((H - st.cell * z.h) / 2);
  }

  /* ------------------------------------------------------------------ UI parts */
  function paintChips() {
    var S = A.S; st.el.chips.innerHTML = ui.chip('coin', S.coins) + ui.chip('gem', S.gems);
    var n = BUILD.layoutOf(S, st.z.id).length; st.el.count.textContent = n + (n === 1 ? ' item placed' : ' items placed');
  }
  function paintTabs() {
    var t = st.el.tabs; t.innerHTML = '';
    var ICONS = { houses: '🏠', furniture: '🪑', plants: '🌴', paths: '🧱', fun: '🎡', lights: '💡' };
    BI.CATS.forEach(function (c) {
      var b = el('button', 'bmtab' + (c === st.cat ? ' on' : ''), '<span>' + ICONS[c] + '</span><small>' + ui.esc(BI.CAT_NAMES[c]) + '</small>');
      on(b, function () { st.cat = c; paintTabs(); paintList(); }); t.appendChild(b);
    });
  }
  function visible(it) { return !(it.home && st.z.kind !== 'home'); }
  function paintList() {
    var S = A.S, list = st.el.list, keep = list.scrollLeft; list.innerHTML = '';
    BI.byCat[st.cat].filter(visible).forEach(function (it) {
      var have = BUILD.available(S, it.id), locked = !P.reqMet(S, it.req), cls = 'bmcard' + (locked ? ' locked' : '') + (have ? ' have' : '') + (st.preview && st.preview.item === it.id ? ' pick' : '');
      var price = it.gems ? ui.icon('gem') + it.gems : it.cost ? ui.icon('coin') + it.cost : 'Free';
      var b = el('button', cls, '<span class="bi">' + it.icon + '</span><b>' + ui.esc(it.name) + '</b><small class="bsz">' + it.w + '×' + it.h + '</small>' +
        (locked ? '<span class="bbadge lk">' + ui.icon('lock') + '</span>' : have ? '<span class="bbadge ok">×' + have + '</span>' : '<span class="bprice">' + price + '</span>'));
      b.setAttribute('data-id', it.id);
      on(b, function () { if (st.cardDragged) { st.cardDragged = false; return; } tapCard(it); });
      cardDrag(b, it); list.appendChild(b);
    });
    list.scrollLeft = keep;
  }
  function paintBar() {
    var bar = st.el.bar; bar.innerHTML = ''; var g = st.preview, S = A.S;
    function btn(cls, html, fn) { var b = el('button', 'btn ' + cls, html); on(b, fn); bar.appendChild(b); return b; }
    if (g) {
      var it = BI.byId[g.item];
      bar.appendChild(el('div', 'bmname', it.icon + ' <b>' + ui.esc(it.name) + '</b>'));
      btn('small blue bmrot', '↻ Turn', function () { previewRotate(); });
      btn('small grey bmcancel', '✖', function () { st.preview = null; msg(''); paintBar(); paintList(); });
      var ok = btn('small green bmplace', '✔ ' + (g.uid ? 'Put here' : 'Place'), previewCommit);
      st.okBtn = ok; validate();
    } else if (st.sel) {
      var p = selected(); if (!p) { st.sel = null; return paintBar(); } var it2 = BI.byId[p.item];
      bar.appendChild(el('div', 'bmname', it2.icon + ' <b>' + ui.esc(it2.name) + '</b>'));
      btn('small blue bmrot', '↻ Turn', function () { var r = BUILD.rotate(S, st.z.id, st.sel); if (r.ok) { A.persist(); SI.audio.play('place'); } else { SI.audio.play('nope'); msg(REASON[r.reason] || 'Cannot turn here'); } });
      btn('small purple bmmove', '✋ Move', function () { startPreviewFrom(selected()); });
      btn('small orange bmstore', '🎒 Store', function () { var r = BUILD.store(S, st.z.id, st.sel); if (r.ok) { st.sel = null; A.persist(); SI.audio.play('pop'); msg('Put back in your bag'); paintBar(); paintList(); paintChips(); } });
    } else {
      bar.appendChild(el('div', 'bmhint', 'Pick an item below, or tap something on the plot.'));
    }
  }
  function msg(t, bad) { st.el.msg.textContent = t || ''; st.el.msg.classList.toggle('bad', !!bad); }
  function selected() { var L = BUILD.layoutOf(A.S, st.z.id); for (var i = 0; i < L.length; i++) if (L[i].uid === st.sel) return L[i]; return null; }

  /* tapping a drawer card: locked → reason, not owned → buy sheet, owned → start placing */
  function tapCard(it) {
    var S = A.S, have = BUILD.available(S, it.id);
    if (!P.reqMet(S, it.req)) { SI.audio.play('nope'); ui.toast('🔒 ' + P.reqText(it.req), 2400); return; }
    if (have) { startPreviewNew(it.id); return; }
    buySheet(it);
  }
  function buySheet(it, thenPlace) {
    var S = A.S, p = ui.popup({ title: it.name, headCls: 'green', cls: 'offer buy' });
    var can = S.coins >= it.cost && S.gems >= it.gems;
    p.body.innerHTML = '<div class="bigemoji">' + it.icon + '</div><p class="sm">' + it.w + '×' + it.h + ' tiles · ' + (it.solid ? 'blocks the path' : 'you can walk over it') + '</p>' +
      '<div class="rewards"><span class="rw">' + (it.gems ? ui.icon('gem') + it.gems : ui.icon('coin') + it.cost) + '</span></div>' +
      (can ? '' : '<p class="sm">You need ' + (it.gems && S.gems < it.gems ? (it.gems - S.gems) + ' more gems.' : (it.cost - S.coins) + ' more coins. Play minigames to earn more!') + '</p>') +
      '<div class="btnrow"><button class="btn big green buy"' + (can ? '' : ' disabled') + '>Buy</button><button class="btn big grey no">Not now</button></div>';
    on(p.body.querySelector('.no'), function () { p.close(); });
    on(p.body.querySelector('.buy'), function () {
      var r = SI.game.track(function () { return P.buyBuildItem(S, it.id); });
      if (!r.ok) { ui.toast(r.text || 'Cannot buy that yet'); return; }
      SI.audio.play('buy'); A.persist(); p.close(true); paintChips(); paintList(); ui.toast('Bought ' + it.name + '!', 1400); startPreviewNew(it.id);
    });
  }

  /* ------------------------------------------------------------------ preview (item being placed / moved) */
  function startPreviewNew(id) {
    var z = st.z, S = A.S, fit = BUILD.firstFit(S, z.id, id, 0), f = BUILD.footprint(id, 0);
    var cx = Math.max(0, Math.min(z.w - f.w, Math.floor((z.w - f.w) / 2))), cy = Math.max(0, Math.min(z.h - f.h, Math.floor((z.h - f.h) / 2)));
    // start in the middle if free, else the first free spot
    var L = BUILD.layoutOf(S, z.id), mid = BUILD.canPlace(L, id, cx, cy, 0, z);
    var pos = mid.ok ? { x: cx, y: cy } : (fit || { x: cx, y: cy });
    st.sel = null; st.preview = { item: id, rot: 0, x: pos.x, y: pos.y, uid: 0 }; paintBar(); paintList();
    if (!fit) msg('There is no free space for this. Store something first.', true);
  }
  function startPreviewFrom(p) {
    st.preview = { item: p.item, rot: p.rot, x: p.x, y: p.y, uid: p.uid, ox: p.x, oy: p.y, orot: p.rot }; st.sel = null; paintBar(); paintList();
  }
  function previewFp() { return BUILD.footprint(st.preview.item, st.preview.rot); }
  function previewClamp() { var f = previewFp(), z = st.z; st.preview.x = Math.max(0, Math.min(z.w - f.w, st.preview.x)); st.preview.y = Math.max(0, Math.min(z.h - f.h, st.preview.y)); }
  function previewRotate() { st.preview.rot = (st.preview.rot + 1) % 4; previewClamp(); SI.audio.play('tap'); validate(); }
  function previewCheck() { var g = st.preview; return BUILD.canPlace(BUILD.layoutOf(A.S, st.z.id), g.item, g.x, g.y, g.rot, st.z, g.uid || undefined); }
  function validate() {
    if (!st.preview) return; var c = previewCheck(); st.previewOk = c.ok;
    if (st.okBtn) st.okBtn.disabled = !c.ok; msg(c.ok ? '' : (REASON[c.reason] || 'Cannot go here'), !c.ok);
  }
  function previewCommit() {
    var g = st.preview, S = A.S; if (!g) return; var c = previewCheck(); if (!c.ok) { SI.audio.play('nope'); return; }
    var r;
    if (g.uid) {
      var L = BUILD.layoutOf(S, st.z.id), i = 0; for (; i < L.length; i++) if (L[i].uid === g.uid) break;
      var pl = L[i]; var oldRot = pl.rot; pl.rot = g.rot; r = BUILD.move(S, st.z.id, g.uid, g.x, g.y); if (!r.ok) pl.rot = oldRot;
      if (r.ok) st.sel = g.uid;
    } else { r = SI.game.track(function () { return BUILD.place(S, st.z.id, g.item, g.x, g.y, g.rot); }); if (r.ok) st.sel = null; }
    if (!r.ok) { SI.audio.play('nope'); msg(REASON[r.reason] || 'Cannot place here', true); return; }
    SI.audio.play('place'); st.pop = { x: g.x, y: g.y, f: previewFp(), t: 0 };
    var wasNew = !g.uid, id = g.item; st.preview = null; A.persist();
    if (wasNew && BUILD.available(S, id) > 0) { /* keep placing the same item if more copies are in the bag */ st.sel = null; }
    paintBar(); paintList(); paintChips(); msg('');
    SI.game.questEvents(SI.game.track(function () { return Q.advance(S); }));
  }

  /* ------------------------------------------------------------------ pointer on the grid */
  function cellAt(x, y) { return { x: Math.floor((x - st.ox) / st.cell), y: Math.floor((y - st.oy) / st.cell) }; }
  function itemAtCell(c) {
    var L = BUILD.layoutOf(A.S, st.z.id), best = null;
    L.forEach(function (p) {
      var f = BUILD.footprint(p.item, p.rot); if (c.x >= p.x && c.x < p.x + f.w && c.y >= p.y && c.y < p.y + f.h) { if (!best || BI.byId[p.item].layer === 'obj') best = p; }
    }); return best;
  }
  function pos(e) { var b = st.el.cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  function pdown(e) {
    e.preventDefault(); var p = pos(e), c = cellAt(p.x, p.y); try { st.el.cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
    st.drag = { id: e.pointerId, sx: p.x, sy: p.y, moved: false, touch: e.pointerType !== 'mouse', mode: null };
    if (st.preview) {
      var f = previewFp(), g = st.preview; st.drag.mode = 'preview';
      st.drag.dx = c.x - g.x; st.drag.dy = c.y - g.y;
      if (!(c.x >= g.x && c.x < g.x + f.w && c.y >= g.y && c.y < g.y + f.h)) { st.drag.dx = Math.floor(f.w / 2); st.drag.dy = Math.floor(f.h / 2); }
    } else {
      var it = itemAtCell(c); if (it) { st.drag.mode = 'item'; st.drag.item = it; st.drag.dx = c.x - it.x; st.drag.dy = c.y - it.y; }
    }
  }
  function pmove(e) {
    var d = st && st.drag; if (!d || d.id !== e.pointerId) return; var p = pos(e);
    if (!d.moved && Math.hypot(p.x - d.sx, p.y - d.sy) > 8) { d.moved = true; if (d.mode === 'item') { var it = d.item; startPreviewFrom(it); } }
    if (d.moved && st.preview && d.mode) {
      var c = cellAt(p.x, p.y), lift = d.touch ? Math.min(2, Math.ceil(previewFp().h / 2) + 1) : 0;
      st.preview.x = c.x - d.dx; st.preview.y = c.y - d.dy - lift; previewClamp(); validate();
    }
  }
  function pup(e) {
    var d = st && st.drag; if (!d || d.id !== e.pointerId) return; st.drag = null; var p = pos(e), c = cellAt(p.x, p.y);
    if (d.moved) return;
    if (st.preview) { var f = previewFp(); st.preview.x = c.x - Math.floor(f.w / 2); st.preview.y = c.y - Math.floor(f.h / 2); previewClamp(); validate(); SI.audio.play('tap'); return; }
    var it = itemAtCell(c); st.sel = it ? it.uid : null; SI.audio.play('tap'); paintBar();
  }

  /* drag an item out of the drawer onto the plot (vertical drag; horizontal drags scroll the drawer) */
  function cardDrag(b, it) {
    var sx, sy, id, active = false;
    b.addEventListener('pointerdown', function (e) { sx = e.clientX; sy = e.clientY; id = e.pointerId; active = false; });
    b.addEventListener('pointermove', function (e) {
      if (e.pointerId !== id || !st) return; var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!active && dy < -16 && Math.abs(dy) > Math.abs(dx) * 1.2) {
        active = true; st.cardDragged = true; try { b.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        var S = A.S; if (!P.reqMet(S, it.req)) { active = false; return; }
        if (!BUILD.available(S, it.id)) { active = false; st.cardDragged = false; tapCard(it); return; }
        startPreviewNew(it.id);
      }
      if (active && st.preview) {
        var r = st.el.cv.getBoundingClientRect(), f = previewFp(), c = cellAt(e.clientX - r.left, e.clientY - r.top);
        if (e.clientY < r.bottom + 40) { st.preview.x = c.x - Math.floor(f.w / 2); st.preview.y = c.y - Math.floor(f.h / 2) - Math.min(2, Math.ceil(f.h / 2) + 1); previewClamp(); validate(); }
      }
    });
    function end(e) { if (e.pointerId !== id) return; if (active) setTimeout(function () { if (st) st.cardDragged = false; }, 0); active = false; }
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
  }

  /* ------------------------------------------------------------------ drawing */
  function loop() { if (!st) return; st.raf = requestAnimationFrame(loop); draw(); }
  function draw() {
    var g = st.g, W = st.W, H = st.H, c = st.cell, z = st.z, ox = st.ox, oy = st.oy, t = (performance.now() - st.t0) / 1000, S = A.S;
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#6cd0ff'); gr.addColorStop(1, '#3fb0e8'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.18)'; for (var w = 0; w < 5; w++) { g.beginPath(); g.ellipse((w * 83 + t * 14) % (W + 40), 18 + (w * 47) % (H - 30), 30, 4, 0, 0, 7); g.fill(); }
    // plot
    g.fillStyle = st.ground[2]; rr(g, ox - 8, oy - 8, c * z.w + 16, c * z.h + 16, 14); g.fill();
    for (var y = 0; y < z.h; y++) for (var x = 0; x < z.w; x++) { g.fillStyle = (x + y) % 2 ? st.ground[0] : st.ground[1]; g.fillRect(ox + x * c, oy + y * c, c, c); }
    var L = BUILD.layoutOf(S, z.id), sorted = L.slice().sort(function (a, b) { var A1 = BI.byId[a.item].layer === 'floor' ? 0 : 1, B1 = BI.byId[b.item].layer === 'floor' ? 0 : 1; return A1 - B1 || (a.y + BUILD.footprint(a.item, a.rot).h) - (b.y + BUILD.footprint(b.item, b.rot).h); });
    sorted.forEach(function (p) {
      if (st.preview && st.preview.uid === p.uid) return; drawItem(g, p.item, p.x, p.y, p.rot, 1, p.uid === st.sel);
    });
    if (st.pop) { st.pop.t += 0.03; var k = st.pop.t; if (k > 1) st.pop = null; else { g.strokeStyle = 'rgba(255,255,255,' + (1 - k) + ')'; g.lineWidth = 4; rr(g, ox + st.pop.x * c - k * 8, oy + st.pop.y * c - k * 8, st.pop.f.w * c + k * 16, st.pop.f.h * c + k * 16, 10); g.stroke(); } }
    if (st.preview) {
      var gh = st.preview, f = previewFp(), ok = st.previewOk !== false;
      for (var yy = 0; yy < f.h; yy++) for (var xx = 0; xx < f.w; xx++) { g.fillStyle = ok ? 'rgba(60,220,110,.5)' : 'rgba(255,70,70,.5)'; g.fillRect(ox + (gh.x + xx) * c + 1, oy + (gh.y + yy) * c + 1, c - 2, c - 2); }
      g.globalAlpha = 0.9; drawItem(g, gh.item, gh.x, gh.y, gh.rot, 1, false, -Math.abs(Math.sin(t * 5)) * 3); g.globalAlpha = 1;
      g.lineWidth = 3; g.strokeStyle = ok ? '#2fb855' : '#e0433f'; rr(g, ox + gh.x * c, oy + gh.y * c, f.w * c, f.h * c, 6); g.stroke();
    }
    if (!L.length && !st.preview) { g.fillStyle = 'rgba(45,27,82,.5)'; g.font = '900 ' + Math.round(c * 0.5) + 'px ' + SI.mgcore.FONT; g.textAlign = 'center'; g.fillText('Your plot is empty. Let’s decorate!', W / 2, oy + c * z.h / 2); }
  }
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  var ITEM_BASE = { houses: 1.0, furniture: 0.82, plants: 0.95, paths: 0.8, fun: 0.9, lights: 0.9 };
  function drawItem(g, id, gx, gy, rot, alpha, sel, lift) {
    var it = BI.byId[id], f = BUILD.footprint(id, rot), c = st.cell, X = st.ox + gx * c, Y = st.oy + gy * c, w = f.w * c, h = f.h * c;
    var px = Math.round(Math.max(8, Math.min(120, Math.max(f.w, f.h) * c * (ITEM_BASE[it.cat] || 0.85) * (it.layer === 'floor' ? 0.9 : 1))));
    if (it.layer === 'floor') { g.fillStyle = it.cat === 'paths' ? 'rgba(255,255,255,.55)' : 'rgba(255,150,100,.5)'; rr(g, X + 2, Y + 2, w - 4, h - 4, 8); g.fill(); }
    else { g.fillStyle = 'rgba(30,20,60,.22)'; g.beginPath(); g.ellipse(X + w / 2, Y + h - 5, w * 0.4, Math.max(3, c * 0.14), 0, 0, 7); g.fill(); }
    var em = SP.emoji(it.icon, px, st.dpr), ew = em._w, eh = em._h, cy = it.layer === 'floor' ? Y + h / 2 : Y + h - px * 0.5 - 4;
    g.drawImage(em, X + w / 2 - ew / 2, cy - eh / 2 + (lift || 0), ew, eh);
    if (sel) { g.lineWidth = 3; g.setLineDash([7, 5]); g.lineDashOffset = -(performance.now() / 60) % 12; g.strokeStyle = '#fff'; rr(g, X + 1, Y + 1, w - 2, h - 2, 8); g.stroke(); g.setLineDash([]); g.strokeStyle = '#7a3cf0'; g.lineWidth = 1.5; rr(g, X + 1, Y + 1, w - 2, h - 2, 8); g.stroke(); }
  }

  SI.buildUI = { open: open, close: close, isOpen: function () { return !!st; }, state: function () { return st && { preview: st.preview && JSON.parse(JSON.stringify(st.preview)), sel: st.sel, cell: st.cell, ox: st.ox, oy: st.oy, zone: st.z.id, cat: st.cat, ok: st.previewOk }; } };
})(typeof self !== 'undefined' ? self : this);
