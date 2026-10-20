/* Car Builder & Race (replaces the Practice Room): garage → build (drag parts onto the car) → pick a track →
 * side-view race against friendly cars → results with a gentle engineering tip. Never punishing: finishing always
 * earns a star and he can rebuild and race again. All spoken text lives in js/data/cars-content.js (voiced). */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var h = LE.h;
  var CC = LE.carsContent;
  var CL = function () { return LE.logic.cars; };
  var NAMES = ['Zoom', 'Rocket', 'Thunder', 'Comet', 'Turbo', 'Sparky'];
  var SLOT_TABS = [
    { slot: 'body', label: 'Body', icon: '🚙' }, { slot: 'wheels', label: 'Wheels', icon: '🛞' },
    { slot: 'engine', label: 'Engine', icon: '🔥' }, { slot: 'spoiler', label: 'Spoiler', icon: '🪽' },
    { slot: 'color', label: 'Paint', icon: '🎨' }, { slot: 'sticker', label: 'Sticker', icon: '⭐' }
  ];
  var store = function () { return LE.app.store; };
  var DPR = function () { return Math.min(window.devicePixelRatio || 1, 2); };

  /* ---------- drawing (one routine for garage cards, the build preview and the race) ---------- */
  var sprites = {};
  /** Emoji pre-rendered once (fillText of emoji every frame is slow on older Android phones). */
  function sprite(emoji, px) {
    var key = emoji + '@' + px;
    if (sprites[key]) return sprites[key];
    var c = document.createElement('canvas');
    c.width = c.height = Math.ceil(px * 1.3);
    var x = c.getContext('2d');
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = px + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    x.fillText(emoji, c.width / 2, c.height / 2 + px * 0.05);
    sprites[key] = c;
    return c;
  }
  /** Name tag above a friendly car (pre-rendered once). */
  function tag(text) {
    var key = 'tag:' + text;
    if (sprites[key]) return sprites[key];
    var c = document.createElement('canvas'), x = c.getContext('2d');
    x.font = '900 26px Nunito, system-ui, sans-serif';
    var w = Math.ceil(x.measureText(text).width) + 28;
    c.width = w; c.height = 40;
    x.font = '900 26px Nunito, system-ui, sans-serif';
    x.fillStyle = 'rgba(255,255,255,.92)'; rr(x, 2, 2, w - 4, 36, 18); x.fill();
    x.fillStyle = '#23264a'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, 21);
    sprites[key] = c;
    return c;
  }
  function rr(g, x, y, w, ht, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + ht, r); g.arcTo(x + w, y + ht, x, y + ht, r);
    g.arcTo(x, y + ht, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /** Draw a car in its own units (about 120 wide); (0,0) = ground under the middle. o: { spin, bounce, flame } */
  function drawCar(g, car, o) {
    o = o || {};
    car = CL().normalize(car);
    var col = CL().part('color', car.color), wh = CL().part('wheels', car.wheels);
    var R = 13 * wh.r, lift = R * 2 + (o.bounce || 0);
    var fill = col.hex, ink = col.dark;
    g.lineJoin = 'round'; g.lineWidth = 3; g.strokeStyle = ink;
    // engine (behind the body, sticks out on top at the back)
    var en = car.engine, ex = -38, ey = -lift - 30;
    var ew = en === 'big' ? 34 : en === 'medium' ? 26 : 18, eh = en === 'big' ? 22 : en === 'medium' ? 16 : 11;
    g.fillStyle = '#9aa6bd'; rr(g, ex - ew / 2, ey - eh, ew, eh + 10, 4); g.fill(); g.stroke();
    if (en !== 'small') { g.fillStyle = '#6b778f'; for (var p = 0; p < (en === 'big' ? 2 : 1); p++) { rr(g, ex - ew / 2 - 10, ey - eh + 3 + p * 8, 12, 6, 3); g.fill(); g.stroke(); } }
    if (o.flame && en !== 'small') { g.fillStyle = '#ffb21f'; g.beginPath(); g.moveTo(ex - ew / 2 - 10, ey - eh + 4); g.lineTo(ex - ew / 2 - 22 - Math.random() * 8, ey - eh + 7); g.lineTo(ex - ew / 2 - 10, ey - eh + 10); g.fill(); }
    // body
    g.fillStyle = fill;
    var b = car.body;
    g.beginPath();
    if (b === 'buggy') {
      rr(g, -50, -lift - 18, 100, 18, 8); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-14, -lift - 18); g.lineTo(-6, -lift - 46); g.lineTo(18, -lift - 46); g.lineTo(26, -lift - 18);
      g.lineWidth = 5; g.stroke(); g.lineWidth = 3;
      g.fillStyle = '#ffd9a8'; g.beginPath(); g.arc(6, -lift - 34, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    } else if (b === 'racer') {
      g.moveTo(-58, -lift - 6); g.lineTo(-58, -lift - 24); g.lineTo(-10, -lift - 28); g.lineTo(10, -lift - 40); g.lineTo(28, -lift - 40);
      g.lineTo(62, -lift - 16); g.lineTo(62, -lift - 6); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#bfefff'; g.beginPath(); g.moveTo(12, -lift - 37); g.lineTo(26, -lift - 37); g.lineTo(42, -lift - 26); g.lineTo(12, -lift - 26); g.closePath(); g.fill(); g.stroke();
    } else if (b === 'truck') {
      rr(g, -58, -lift - 30, 66, 30, 6); g.fill(); g.stroke();
      rr(g, 4, -lift - 56, 56, 56, 10); g.fill(); g.stroke();
      g.fillStyle = '#bfefff'; rr(g, 20, -lift - 48, 32, 20, 5); g.fill(); g.stroke();
    } else {   // beetle / Bubble
      g.moveTo(-54, -lift - 4); g.bezierCurveTo(-56, -lift - 40, -24, -lift - 58, 6, -lift - 58);
      g.bezierCurveTo(40, -lift - 58, 58, -lift - 34, 58, -lift - 4); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#bfefff'; g.beginPath(); g.moveTo(8, -lift - 50); g.bezierCurveTo(30, -lift - 50, 44, -lift - 36, 46, -lift - 26);
      g.lineTo(8, -lift - 26); g.closePath(); g.fill(); g.stroke();
    }
    // spoiler
    if (car.spoiler === 'wing') {
      g.fillStyle = ink; g.fillRect(-56, -lift - 44, 4, 18); g.fillRect(-46, -lift - 44, 4, 18);
      g.fillStyle = fill; rr(g, -66, -lift - 52, 34, 9, 4); g.fill(); g.stroke();
    }
    // sticker
    var st = CL().part('sticker', car.sticker);
    if (st && st.icon) { var sp = sprite(st.icon, 22); g.drawImage(sp, -6 - sp.width / 2, -lift - (b === 'buggy' ? 9 : 18) - sp.height / 2); }
    // wheels
    [-34, 36].forEach(function (wx) {
      g.save(); g.translate(wx, -R); g.rotate(o.spin || 0);
      g.fillStyle = '#2b2f3f'; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
      if (car.wheels === 'monster') { g.strokeStyle = '#151824'; g.lineWidth = 4; for (var k = 0; k < 10; k++) { var a = k * Math.PI / 5; g.beginPath(); g.moveTo(Math.cos(a) * (R - 3), Math.sin(a) * (R - 3)); g.lineTo(Math.cos(a) * (R + 2), Math.sin(a) * (R + 2)); g.stroke(); } }
      g.fillStyle = '#d7dde9'; g.beginPath(); g.arc(0, 0, R * 0.45, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#8b94a8'; g.lineWidth = 3; g.beginPath(); g.moveTo(-R * 0.45, 0); g.lineTo(R * 0.45, 0); g.stroke();
      g.restore();
    });
    g.strokeStyle = ink; g.lineWidth = 3;
  }
  /** A canvas showing one car, scaled to fit. */
  function carCanvas(car, w, ht) {
    var c = h('canvas.car-canvas');
    paintCar(c, car, w, ht);
    return c;
  }
  function paintCar(c, car, w, ht) {
    var d = DPR();
    c.width = Math.round(w * d); c.height = Math.round(ht * d);
    c.style.width = w + 'px'; c.style.height = ht + 'px';
    var g = c.getContext('2d');
    g.setTransform(d, 0, 0, d, 0, 0);
    g.clearRect(0, 0, w, ht);
    var s = Math.min(w / 150, ht / 105);
    g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(w / 2, ht - 6 * s, 62 * s, 6 * s, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(w / 2 + 4 * s, ht - 6 * s); g.scale(s, s); drawCar(g, car); g.restore();
  }

  /* ---------- shared bits ---------- */
  function screen(cls, title, onBack, extra) {
    var el = h('div.cars-screen.' + cls);
    var bar = LE.app.topbar(h('span.lvl-title', h('span', title)), onBack, extra);
    var buddyBar = h('div.buddy-bar');
    el.append(bar, buddyBar);
    var buddy = new LE.Buddy(buddyBar);
    return { el: el, buddy: buddy };
  }
  function newCar() {
    var used = store().getGarage().map(function (c) { return c.name; });
    var name = NAMES.filter(function (n) { return used.indexOf(n) < 0; })[0] || 'My car';
    var car = Object.assign({ id: 'car' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), name: name }, CC.starter);
    var colors = CC.parts.color.map(function (c) { return c.id; });
    car.color = colors[store().getGarage().length % colors.length];
    return car;
  }
  /** First open track that is not won yet (else the last one). */
  function nextTrackIndex() {
    var best = store().getTrackBest();
    for (var i = 0; i < CC.tracks.length; i++) if (CL().isTrackOpen(best, i) && (best[CC.tracks[i].id] || 0) < 3) return i;
    return CC.tracks.length - 1;
  }

  /* ---------- Garage ---------- */
  function showGarage() {
    LE.app.store.setLast({ screen: 'cars' });
    LE.voice.prefetchGroup('cars');
    var s = screen('garage-screen', '🏎️ Car Builder', function () { LE.app.showMenu(); });
    var garage = store().getGarage();
    if (!garage.length) { var first = newCar(); store().saveCar(first); store().setCurrentCar(first.id); garage = store().getGarage(); }
    var best = store().getTrackBest();
    var won = CC.tracks.filter(function (t) { return best[t.id] === 3; }).length;
    var stars = CC.tracks.reduce(function (a, t) { return a + (best[t.id] || 0); }, 0);
    var grid = h('div.cg-grid.scroll-y');
    garage.forEach(function (car) {
      var card = LE.button('white cg-car' + (car.id === store().getCurrentCar() ? '.on' : ''), '', function () { showBuild(car.id); }, { label: car.name });
      card.dataset.car = car.id;
      card.append(carCanvas(car, 132, 84), h('div.cg-name', car.name));
      grid.appendChild(card);
    });
    if (garage.length < CC.MAX_CARS) {
      grid.appendChild(LE.button('green cg-new', '<span class="cg-plus">＋</span><span>New car</span>', function () {
        var c = newCar();
        if (!store().saveCar(c)) { s.buddy.say(CC.LINES.garageFull); return; }
        store().setCurrentCar(c.id);
        showBuild(c.id, { fresh: true });
      }, { label: 'New car' }));
    }
    var summary = h('div.cg-summary', h('span', '🏆 ' + won + ' / ' + CC.tracks.length + ' tracks won'), h('span', '⭐ ' + stars));
    s.el.append(summary, grid,
      LE.button('orange big cg-race', '🏁 Race!', function () { showTracks(store().getCurrentCar() || garage[0].id); }));
    LE.app.showScreen({ el: s.el, destroy: function () { s.buddy.destroy(); } });
    setTimeout(function () { s.buddy.say(CC.LINES.garageIntro); }, 350 / LE.speed);
    s.buddy.onTap = function () { s.buddy.say(CC.LINES.garageIntro); };
  }

  /* ---------- Build ---------- */
  function showBuild(carId, opts) {
    opts = opts || {};
    var car = store().getCar(carId);
    if (!car) { showGarage(); return; }
    car = Object.assign({}, car, CL().normalize(car));
    store().setCurrentCar(car.id);
    LE.app.store.setLast({ screen: 'cars' });
    var alive = true, demo = false;
    var showBtn = LE.button('icon cb-showme', '<span>💡</span>', function () { showMe(); }, { label: 'Show me' });
    var s = screen('build-screen', '🔧 ' + car.name, function () { showGarage(); }, showBtn);
    var stage = h('div.cb-stage');
    var canvas = h('canvas.car-canvas.cb-car');
    stage.appendChild(canvas);
    var barsEl = h('div.cb-bars');
    var tabs = h('div.cb-tabs');
    var tray = h('div.cb-tray');
    var slot = 'body';
    var bottom = h('div.cb-bottom',
      LE.button('white small cb-delete', '🗑️', function () { remove(); }, { label: 'Remove car' }),
      LE.button('orange big cb-race', '🏁 Race!', function () { showTracks(car.id); }));
    s.el.append(stage, barsEl, tabs, tray, bottom);

    function paint() {
      // clientWidth/Height ignore the screen's enter transform (scale 1.04), unlike getBoundingClientRect
      paintCar(canvas, car, Math.max(160, Math.min(stage.clientWidth - 8, 330)), Math.max(96, Math.min(stage.clientHeight - 6, 200)));
      var b = CL().bars(car);
      barsEl.innerHTML = '';
      [['speed', '⚡', 'Speed'], ['hills', '⛰️', 'Hills'], ['bumps', '🪨', 'Bumps'], ['ice', '❄️', 'Ice'], ['weight', '🏋️', 'Weight']].forEach(function (x) {
        var row = h('div.cb-bar', { 'data-stat': x[0] }, h('span.cb-bar-ico', x[1]), h('span.cb-bar-name', x[2]));
        var dots = h('span.cb-dots');
        for (var i = 1; i <= 5; i++) dots.appendChild(h('i' + (i <= b[x[0]] ? '.on' : '')));
        row.appendChild(dots);
        row.dataset.value = b[x[0]];
        barsEl.appendChild(row);
      });
    }
    function apply(sl, id, quiet) {
      if (car[sl] === id) { paint(); return; }
      car[sl] = id;
      store().saveCar(car);
      if (!quiet) LE.sound.play(sl === 'engine' ? 'car' : sl === 'wheels' ? 'place' : 'pop');
      stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump');
      paint(); fillTray();
    }
    function fillTabs() {
      tabs.innerHTML = '';
      SLOT_TABS.forEach(function (t) {
        var b = h('button.cb-tab' + (t.slot === slot ? '.on' : ''), { type: 'button', 'data-slot': t.slot }, h('span.cb-tab-ico', t.icon), h('span', t.label));
        b.addEventListener('click', function () {
          LE.sound.play('tap'); slot = t.slot; fillTabs(); fillTray();
          s.buddy.say(CC.LINES.slot[t.slot]);
        });
        tabs.appendChild(b);
      });
    }
    function partFace(sl, p) {
      if (sl === 'color') return h('span.cb-swatch', { style: 'background:' + p.hex });
      if (sl === 'sticker') return h('span.cb-part-ico', p.icon || '🚫');
      if (sl === 'body' || sl === 'wheels') {
        var c = Object.assign({}, car); c[sl] = p.id;
        return carCanvas(c, 70, 48);
      }
      return h('span.cb-part-ico', p.icon);
    }
    function fillTray() {
      tray.innerHTML = '';
      CC.parts[slot].forEach(function (p) {
        var el = h('div.cb-part.pressable' + (car[slot] === p.id ? '.on' : ''), { 'data-slot': slot, 'data-id': p.id, role: 'button', 'aria-label': p.name },
          partFace(slot, p), h('span.cb-part-name', p.name));
        dragPart(el, slot, p.id);
        tray.appendChild(el);
      });
    }
    /* Drag a part up onto the car (a tap works too). */
    function dragPart(el, sl, id) {
      var start = null, ghost = null;
      el.addEventListener('pointerdown', function (e) {
        if (demo) return;
        start = { x: e.clientX, y: e.clientY, id: e.pointerId };
        try { el.setPointerCapture(e.pointerId); } catch (er) {}
      });
      el.addEventListener('pointermove', function (e) {
        if (!start || e.pointerId !== start.id) return;
        var dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!ghost && Math.hypot(dx, dy) > 10) {
          ghost = h('div.cb-ghost'); ghost.appendChild(el.firstChild.cloneNode(true));
          if (el.firstChild.tagName === 'CANVAS') { var gc = ghost.firstChild; gc.getContext('2d').drawImage(el.firstChild, 0, 0); }
          document.body.appendChild(ghost);
          LE.sound.play('whoosh');
        }
        if (ghost) {
          e.preventDefault();
          ghost.style.transform = 'translate(' + (e.clientX - 40) + 'px,' + (e.clientY - 40) + 'px)';
          var r = stage.getBoundingClientRect();
          stage.classList.toggle('hot', e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom + 20);
        }
      });
      function end(e, cancel) {
        if (!start) return;
        var wasDrag = !!ghost;
        if (ghost) { ghost.remove(); ghost = null; }
        stage.classList.remove('hot');
        var r = stage.getBoundingClientRect();
        var over = e && e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom + 20;
        start = null;
        if (cancel) return;
        if (!wasDrag || over) apply(sl, id);
      }
      el.addEventListener('pointerup', function (e) { end(e); });
      el.addEventListener('pointercancel', function (e) { end(e, true); });
    }
    function remove() {
      LE.app.confirmDialog('Remove ' + car.name + ' from the garage?', '🗑️ Remove', function () {
        store().removeCar(car.id);
        showGarage();
      });
    }
    /* Show me: the hand drags the most useful part for the next track onto the car. */
    async function showMe() {
      if (demo || !alive) return;
      var tr = CC.tracks[nextTrackIndex()];
      var sug = CL().suggest(tr, car);
      if (!sug) { s.buddy.say(CC.LINES.showMeGood); return; }
      demo = true;
      var shield = h('div.demo-shield'); s.el.appendChild(shield);
      try {
        slot = sug.slot; fillTabs(); fillTray();
        s.buddy.say(CC.LINES.showMeLine);
        await LE.wait(500);
        var from = function () { return tray.querySelector('.cb-part[data-id="' + sug.id + '"]'); };
        var f = from(); if (f && f.scrollIntoView) f.scrollIntoView({ inline: 'center', block: 'nearest' });
        await LE.hand.drag(from, function () { return canvas; }, from() ? from().firstChild.outerHTML : null);
        if (!alive) return;
        apply(sug.slot, sug.id);
        LE.hand.hide();
      } finally { demo = false; shield.remove(); }
    }

    LE.app.showScreen({ el: s.el, destroy: function () { alive = false; s.buddy.destroy(); } });
    fillTabs(); fillTray();
    requestAnimationFrame(paint);
    var onResize = function () { if (alive) paint(); };
    window.addEventListener('resize', onResize);
    var off = s.buddy.destroy.bind(s.buddy);
    s.buddy.destroy = function () { window.removeEventListener('resize', onResize); off(); };
    s.buddy.onTap = function () {
      if (demo) return;
      s.buddy.say(CC.LINES.buildIntro, { buttons: [
        { label: '👉 Show me', cls: 'orange showme-btn', onTap: function () { s.buddy.hide(); showMe(); } },
        { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { s.buddy.hide(); } }] });
    };
    setTimeout(function () { if (alive) s.buddy.say(opts.fresh ? CC.LINES.garageNew : CC.LINES.buildIntro); }, 350 / LE.speed);
    LE.activeCars = { screen: 'build', car: function () { return car; }, apply: apply, showMe: showMe };
  }

  /* ---------- Tracks ---------- */
  function showTracks(carId) {
    var car = store().getCar(carId);
    if (!car) { showGarage(); return; }
    var s = screen('tracks-screen', '🗺️ Race tracks', function () { showBuild(car.id); });
    var best = store().getTrackBest();
    var list = h('div.ct-list.scroll-y');
    CC.tracks.forEach(function (tr, i) {
      var open = CL().isTrackOpen(best, i), got = best[tr.id] || 0;
      var b = LE.button('white ct-track' + (open ? '' : '.locked'), '', function () {
        if (!open) { LE.sound.play('buzz'); LE.shake(b); s.buddy.say(CC.LINES.trackLocked); return; }
        showRace(car.id, tr.id);
      }, { label: tr.name });
      b.dataset.track = tr.id;
      b.style.background = open ? 'linear-gradient(180deg,' + tr.sky[0] + ',' + tr.ground + ')' : '';
      b.append(h('span.ct-icon', open ? tr.icon : '🔒'), h('span.ct-name', tr.name),
        h('span.ct-stars', open ? '★★★'.slice(0, got) + '☆☆☆'.slice(0, 3 - got) : ''));
      list.appendChild(b);
    });
    s.el.append(h('div.ct-car', carCanvas(car, 110, 70), h('span', car.name)), list);
    LE.app.showScreen({ el: s.el, destroy: function () { s.buddy.destroy(); } });
    setTimeout(function () { s.buddy.say(CC.LINES.pickTrack); }, 300 / LE.speed);
  }

  /* ---------- Race ---------- */
  function showRace(carId, trackId) {
    var car = store().getCar(carId), tr = CC.tracks.filter(function (t) { return t.id === trackId; })[0];
    if (!car || !tr) { showGarage(); return; }
    var alive = true, raf = 0, paused = false, started = false;
    var el = h('div.cars-screen.race-screen');
    var bar = LE.app.topbar(h('span.lvl-title', h('span', tr.icon + ' ' + tr.name)), function () { showTracks(car.id); });
    var hud = h('div.cr-hud');
    var line = h('div.cr-line');
    hud.appendChild(line);
    var host = h('div.cr-host');
    var cv = h('canvas.cr-canvas');
    var count = h('div.cr-count');
    host.append(cv, count);
    el.append(bar, hud, host);
    var race = CL().createRace(tr, car);
    // a friend never looks like his car: same colour → another one
    var spare = ['purple', 'orange', 'green', 'yellow', 'blue', 'red'];
    race.racers.slice(1).forEach(function (r) {
      if (r.car.color === race.you.car.color) r.car = Object.assign({}, r.car, { color: spare.filter(function (c) { return c !== race.you.car.color && race.racers.every(function (o) { return o.car.color !== c; }); })[0] });
    });
    var markers = race.racers.map(function (r) {
      var m = h('div.cr-mark' + (r.id === 'you' ? '.you' : ''), r.id === 'you' ? '🏎️' : r.id === 'bolt' ? '🤖' : '🐰');
      line.appendChild(m);
      return m;
    });
    line.appendChild(h('div.cr-flag', '🏁'));
    var wasOpen = CC.tracks.map(function (t, i) { return CL().isTrackOpen(store().getTrackBest(), i); });
    LE.app.showScreen({ el: el, destroy: function () { alive = false; cancelAnimationFrame(raf); LE.activeCars = null; } });

    var W = 0, H = 0, d = 1, g = cv.getContext('2d');
    function size() {
      var rw = host.clientWidth, rh = host.clientHeight;   // not getBoundingClientRect: ignores the enter transform
      d = Math.min(DPR(), (rw * rh > 300000 ? 1.5 : 2));   // cap pixels for older phones
      W = Math.max(200, rw); H = Math.max(160, rh);
      cv.width = Math.round(W * d); cv.height = Math.round(H * d);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      sky = null;
    }
    var sky = null;
    var decor = { sunny: ['🌳', '🌼', '🏡'], hills: ['🌲', '🐄', '🌳'], desert: ['🌵', '🪨', '🐪'], ice: ['⛄', '🐧', '🌲'],
      mountain: ['🌲', '🐐', '🪨'], jungle: ['🌴', '🦜', '🐒'], grand: ['🚩', '🎪', '🌳'] }[tr.id] || ['🌳'];
    var ppm = 1, camX = 0, camH = 0;
    function bumpAt(x) {
      var sg = CL().segAt(tr, x);
      return sg.k === 'bumpy' ? 0.35 * Math.max(0, Math.sin(x * 1.4)) + 0.2 * Math.max(0, Math.sin(x * 0.53 + 1)) : 0;
    }
    function gy(x) { return CL().heightAt(tr, x) + bumpAt(x); }
    function draw() {
      g.setTransform(d, 0, 0, d, 0, 0);
      if (!sky) { sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, tr.sky[0]); sky.addColorStop(1, tr.sky[1]); }
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      ppm = W / 30;
      var vpm = Math.max(ppm, Math.min(H / 40, ppm * 1.8));   // a bit of vertical exaggeration on tall phones so hills read
      var you = race.you;
      camX += ((you.x - 8) - camX) * 0.2;
      camH += (CL().heightAt(tr, you.x) - camH) * 0.1;
      var baseY = H * 0.66;
      var sx = function (x) { return (x - camX) * ppm + W * 0.18; };
      var syf = function (hh) { return baseY - (hh - camH) * vpm; };
      // sun + slow clouds
      var sun = sprite('🌞', 54); g.drawImage(sun, W - sun.width - 14, 14);
      var cl = sprite('☁️', 46);
      for (var c = 0; c < 4; c++) {
        var cx = ((c * 170 - camX * ppm * 0.08) % (W + 160) + W + 160) % (W + 160) - 80;
        g.drawImage(cl, cx, 40 + (c % 2) * 70 + c * 18);
      }
      // far hills (parallax)
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.moveTo(0, H);
      for (var px = 0; px <= W + 20; px += 20) g.lineTo(px, baseY - H * 0.16 - 30 * Math.sin((px + camX * ppm * 0.2) / 90));
      g.lineTo(W, H); g.closePath(); g.fill();
      // decor (behind the road)
      var step = 14;
      for (var dx = Math.floor((camX - 10) / step) * step; dx < camX + W / ppm; dx += step) {
        if (dx < 0) continue;
        var e = decor[Math.abs(Math.round(dx / step)) % decor.length], sp = sprite(e, 40);
        g.drawImage(sp, sx(dx) - sp.width / 2, syf(CL().heightAt(tr, dx)) - 34 - sp.height * 0.8);
      }
      // road: dirt + top colour (ice is shiny)
      var x0 = camX - W * 0.18 / ppm - 2, x1 = x0 + W / ppm + 4;
      g.beginPath(); g.moveTo(sx(x0), H);
      for (var x = x0; x <= x1; x += 0.5) g.lineTo(sx(x), syf(gy(x)));
      g.lineTo(sx(x1), H); g.closePath();
      g.fillStyle = tr.dirt; g.fill();
      g.lineWidth = 10;
      var segStart = 0;
      tr.segs.forEach(function (sg) {
        var a = Math.max(segStart, x0), b = Math.min(segStart + sg.len, x1);
        if (b > a) {
          g.strokeStyle = sg.k === 'ice' ? '#d9f3ff' : sg.k === 'bumpy' ? '#e0a95a' : tr.ground;
          g.beginPath(); g.moveTo(sx(a), syf(gy(a)) + 4);
          for (var xx = a; xx <= b; xx += 0.5) g.lineTo(sx(xx), syf(gy(xx)) + 4);
          g.stroke();
        }
        segStart += sg.len;
      });
      // finish line
      var fx = sx(race.len);
      if (fx > -40 && fx < W + 40) {
        var fy = syf(CL().heightAt(tr, race.len));
        for (var i = 0; i < 8; i++) for (var j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#222' : '#fff'; g.fillRect(fx + j * 8, fy - 64 + i * 8, 8, 8); }
        g.fillStyle = '#555'; g.fillRect(fx - 3, fy - 70, 3, 70);
      }
      // cars: friends behind (further away), player in front
      var scale = Math.min(W * 0.3, H * 0.32) / 120;   // cartoon cars: bigger than the world scale
      for (var k = race.racers.length - 1; k >= 0; k--) {
        var r = race.racers[k];
        var lane = k === 0 ? 8 : -scale * (k === 1 ? 34 : 62), sc = scale * (k === 0 ? 1 : k === 1 ? 0.86 : 0.74);
        var hx = CL().heightAt(tr, r.x), slope = Math.atan2(CL().heightAt(tr, r.x + 1) - CL().heightAt(tr, r.x - 1), 2);
        var wb = CL().part('wheels', r.car.wheels).bump;
        var bounce = bumpAt(r.x) * vpm * (1.2 - wb) * 0.9 / sc;
        g.save();
        g.translate(sx(r.x), syf(hx) + lane);
        g.rotate(-slope);
        g.scale(sc, sc);
        drawCar(g, r.car, { spin: r.x / (0.35 * CL().part('wheels', r.car.wheels).r), bounce: -bounce, flame: r.v > 15 && started });
        g.restore();
        if (k > 0) { var tg = tag(r.name); var tw = tg.width * 0.5 * Math.min(1, scale * 1.6); g.drawImage(tg, sx(r.x) - tw / 2, syf(hx) + lane - 125 * sc - tw * 0.16, tw, tw * tg.height / tg.width); }
      }
      // markers
      race.racers.forEach(function (r, k2) { markers[k2].style.left = Math.min(100, r.x / race.len * 100) + '%'; });
    }
    var acc = 0, lastT = 0, perf = { frames: 0, drawMs: 0, maxMs: 0 };
    function frame(t) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!lastT) lastT = t;
      var dt = Math.min(0.1, (t - lastT) / 1000); lastT = t;
      if (started && !paused && !race.finished) {
        acc += dt * LE.speed;
        while (acc >= CL().DT && !race.finished) { race.step(); acc -= CL().DT; }
        if (race.finished) finish();
      } else if (race.finished && !paused) {
        race.racers.forEach(function (r) { r.v = Math.max(0, r.v - 30 * dt); r.x += r.v * dt; });
      }
      var t0 = performance.now();
      draw();
      var ms = performance.now() - t0;
      perf.frames++; perf.drawMs += ms; if (ms > perf.maxMs) perf.maxMs = ms;
    }
    async function countdown() {
      await LE.speak(tr.intro);
      if (!alive) return;
      LE.speak(CC.LINES.go);
      for (var n = 3; n >= 1 && alive; n--) {
        count.textContent = n; count.className = 'cr-count show';
        LE.sound.play('tap');
        await LE.wait(750);
      }
      if (!alive) return;
      count.textContent = 'GO!'; LE.sound.play('honk');
      started = true;
      await LE.wait(600);
      count.className = 'cr-count';
    }
    function finish() {
      var place = race.order.indexOf('you') + 1, stars = CL().starsFor(place);
      var improved = store().setTrackStars(tr.id, stars);
      var nowOpen = CC.tracks.map(function (t, i) { return CL().isTrackOpen(store().getTrackBest(), i); });
      var opened = nowOpen.some(function (o, i) { return o && !wasOpen[i]; });
      var tip = CL().tip(tr, car);
      setTimeout(function () { if (alive) results(place, stars, tip, opened, improved); }, 900 / LE.speed);
    }
    function results(place, stars, tip, opened) {
      LE.sound.play(place === 1 ? 'cheer' : 'success');
      if (place === 1) LE.fx.confetti(160);
      var starsRow = h('div.cr-stars');
      for (var i = 0; i < 3; i++) starsRow.appendChild(h('span' + (i < stars ? '.on' : ''), '★'));
      var lines = [CC.LINES.place[place - 1], tip.text].concat(opened ? [CC.LINES.newTrack] : []);
      LE.openOverlay([
        h('div.cr-medal', ['🥇', '🥈', '🥉'][place - 1]),
        h('h2.cr-place', CC.LINES.place[place - 1]),
        starsRow,
        h('div.cr-tip', { 'data-tip': tip.key }, h('span.cr-tip-ico', '💡'), h('span', tip.text)),
        opened ? h('div.cr-new', '🎉 ' + CC.LINES.newTrack) : null,
        h('div.cr-buttons',
          LE.button('white cr-build', '🔧 Change car', function () { showBuild(car.id); }),
          LE.button('green cr-again', '🔁 Race again', function () { showRace(car.id, tr.id); }),
          LE.button('orange cr-tracks', '🗺️ Tracks', function () { showTracks(car.id); }))
      ], 'race-results');
      LE.speak(lines);
    }
    size(); draw();
    window.addEventListener('resize', size);
    var off = function () { window.removeEventListener('resize', size); };
    var prevDestroy = LE.currentScreen().destroy;
    LE.currentScreen().destroy = function () { off(); prevDestroy(); };
    raf = requestAnimationFrame(frame);
    LE.activeCars = { screen: 'race', race: race, pause: function () { paused = true; }, resume: function () { paused = false; lastT = 0; },
      perf: function () { return { frames: perf.frames, avgMs: perf.frames ? perf.drawMs / perf.frames : 0, maxMs: perf.maxMs }; } };
    setTimeout(function () { if (alive) countdown(); }, 400 / LE.speed);
  }

  LE.cars = { showGarage: showGarage, showBuild: showBuild, showTracks: showTracks, showRace: showRace, drawCar: drawCar };
})();
