/* Minigame framework: a full-screen canvas overlay (#mg) with HUD (pause, level, score + star meter), ready/go countdown,
 * pause menu, pointer input, floating text + particles, drawing helpers. Each game registers a factory:
 *   SI.mgcore.register(id, function (env) { return { update(dt), draw(g), pointer(type, x, y), target() }; })
 * env = { id, L, spec, th, W, H, t, setScore(v), finish(score), sfx(n), float(text, x, y, col), burst(x, y, col, n), rand() }.
 * target() returns the canvas position {x, y} a good player would tap next (used by the test hook to play with real input). */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on, MG = SI.minigames;
  SI.minigameViews = SI.minigameViews || {};
  var FONT = 'ui-rounded, "SF Pro Rounded", Nunito, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var FACTORY = {}, run = null;

  /* ------------------------------------------------------------------ drawing helpers */
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /** centred bold text; opts: {fill, stroke, sw, maxW, align, base} */
  function txt(g, s, x, y, size, fill, o) {
    o = o || {}; g.save(); g.font = '900 ' + size + 'px ' + FONT; g.textAlign = o.align || 'center'; g.textBaseline = o.base || 'middle';
    if (o.maxW) { var w = g.measureText(s).width; if (w > o.maxW) { size = Math.max(8, size * o.maxW / w); g.font = '900 ' + size + 'px ' + FONT; } }
    if (o.stroke) { g.lineWidth = o.sw || size * 0.18; g.lineJoin = 'round'; g.strokeStyle = o.stroke; g.strokeText(s, x, y); }
    g.fillStyle = fill || '#2d1b52'; g.fillText(s, x, y); g.restore();
  }
  function emoji(g, s, x, y, size) { g.save(); g.font = size + 'px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore(); }
  /** chunky button: returns nothing, caller keeps the rect for hit-testing */
  function button(g, x, y, w, h, label, o) {
    o = o || {}; var col = o.col || '#7a3cf0', press = o.press ? 3 : 0, dis = o.disabled;
    g.save(); if (dis) g.globalAlpha = 0.5;
    rr(g, x, y + 4, w, h, h * 0.3); g.fillStyle = 'rgba(30,15,70,.35)'; g.fill();
    rr(g, x, y + press, w, h, h * 0.3); var gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, o.top || lighten(col)); gr.addColorStop(1, col); g.fillStyle = gr; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = 'rgba(30,15,70,.55)'; g.stroke();
    if (label) txt(g, label, x + w / 2, y + h / 2 + press, o.size || h * 0.42, o.ink || '#fff', { maxW: w - 12, stroke: o.ink ? null : 'rgba(30,15,70,.45)' });
    g.restore();
  }
  function lighten(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255;
    r = Math.min(255, r + 70); gg = Math.min(255, gg + 70); b = Math.min(255, b + 70); return 'rgb(' + r + ',' + gg + ',' + b + ')';
  }
  function star(g, x, y, r, fill, stroke) {
    g.beginPath(); for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.closePath();
    g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = 2; g.strokeStyle = stroke; g.lineJoin = 'round'; g.stroke(); }
  }
  function cloud(g, x, y, s) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x, y, 14 * s, 0, 7); g.arc(x + 16 * s, y - 7 * s, 18 * s, 0, 7); g.arc(x + 36 * s, y, 14 * s, 0, 7); g.rect(x, y, 36 * s, 14 * s); g.fill(); }
  function hit(r, x, y) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  function sky(g, W, H, top, bot) { var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H); }

  /* ------------------------------------------------------------------ run */
  function register(id, factory) {
    FACTORY[id] = factory;
    SI.minigameViews[id] = { start: function (L, done) { start(id, L, done); } };
  }

  function close() {
    if (!run) return;
    cancelAnimationFrame(run.raf); document.removeEventListener('visibilitychange', run.vis);
    var host = document.getElementById('mg'); host.classList.add('hidden'); host.innerHTML = '';
    if (SI.world && SI.world.hold) SI.world.hold(false);
    run = null;
  }

  function start(id, L, done) {
    close();
    var host = document.getElementById('mg'), G = MG.byId[id], th = MG.thresholds(id, L);
    var seed = 1 + Math.floor(Math.random() * 90), spec = MG.generate(id, L, seed);
    host.innerHTML = '';
    var hud = el('div', 'mghud');
    var pb = el('button', 'mgpause', ui.icon('menu')); pb.setAttribute('aria-label', 'Pause');
    var ttl = el('div', 'mgtitle', '<b>' + G.icon + ' ' + ui.esc(G.name) + '</b><small>Level ' + L + '</small>');
    var sc = el('div', 'mgscore', '<span class="sv">0</span>'); hud.append(pb, ttl, sc);
    var bar = el('div', 'mgbar'); var fill = el('i', 'fill'); bar.appendChild(fill);
    var marks = [];
    if (!th.lowerBetter) [th.t1, th.t2, th.t3].forEach(function (t, k) { var m = el('span', 'mk', ui.icon('starOff')); m.style.left = Math.min(93, 100 * t / th.total) + '%'; bar.appendChild(m); marks.push(m); });
    var play = el('div', 'mgplay'); var cv = document.createElement('canvas'); play.appendChild(cv);
    host.append(hud, bar, play); host.classList.remove('hidden');
    if (SI.world && SI.world.hold) SI.world.hold(true);

    var dpr = Math.min(2, root.devicePixelRatio || 1), g = cv.getContext('2d');
    var r = { id: id, L: L, spec: spec, th: th, cv: cv, host: host, done: done, raf: 0, last: 0, paused: false, over: false, count: 1.8, W: 0, H: 0, t: 0, score: 0, fx: [], parts: [], game: null, pausePop: null };
    run = r;
    function size() {
      var b = play.getBoundingClientRect(); r.W = Math.max(200, Math.round(b.width)); r.H = Math.max(200, Math.round(b.height));
      cv.width = Math.round(r.W * dpr); cv.height = Math.round(r.H * dpr); cv.style.width = r.W + 'px'; cv.style.height = r.H + 'px'; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      env.W = r.W; env.H = r.H;
    }
    var rng = SI.rng.make('mgfx:' + id + L + seed);
    var env = {
      id: id, L: L, spec: spec, th: th, W: 0, H: 0, t: 0, seed: seed, rand: rng,
      setScore: function (v, text) {
        r.score = v; var s = host.querySelector('.sv'); s.textContent = text != null ? text : String(v);
        if (!th.lowerBetter) { fill.style.width = Math.min(100, 100 * v / th.total) + '%'; marks.forEach(function (m, k) { var on2 = v >= [th.t1, th.t2, th.t3][k]; if (on2 && !m.classList.contains('on')) { m.classList.add('on'); m.innerHTML = ui.icon('star'); SI.audio.play('star'); } }); }
        sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');
      },
      setMeter: function (frac) { if (th.lowerBetter) fill.style.width = Math.max(0, Math.min(100, frac * 100)) + '%'; },
      finish: function (score) { if (r.over) return; r.over = true; setTimeout(function () { if (run === r) done(score); }, 700); },
      sfx: function (n) { SI.audio.play(n); },
      float: function (text, x, y, col, size) { r.fx.push({ text: text, x: x, y: y, col: col || '#fff', size: size || 26, t: 0, life: 0.9 }); },
      burst: function (x, y, col, n) {
        for (var i = 0; i < (n || 10); i++) { var a = rng() * 6.283, v = 60 + rng() * 140; r.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, life: 0.5 + rng() * 0.4, col: col || '#ffd23f', r: 3 + rng() * 4 }); }
      },
      avatar: function (g2, x, y, s, o) { o = o || {}; o.x = x; o.y = y; o.s = s; o.t = env.t; SI.avatar.draw(g2, A.S.avatar, o); }
    };
    size();
    r.game = FACTORY[id](env);
    env.setScore(th.lowerBetter ? 0 : 0, th.lowerBetter ? '0' : '0');
    if (th.lowerBetter) fill.style.width = '0%';

    function pos(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    function ptr(type) {
      return function (e) {
        if (r.paused || r.over || r.count > 0 || !r.game.pointer) return; e.preventDefault();
        var p = pos(e); if (type === 'down') try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ }
        r.game.pointer(type, p.x, p.y);
      };
    }
    cv.addEventListener('pointerdown', ptr('down')); cv.addEventListener('pointermove', ptr('move')); cv.addEventListener('pointerup', ptr('up')); cv.addEventListener('pointercancel', ptr('up'));
    on(pb, function () { pause(); });
    r.vis = function () { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', r.vis);
    r.resize = function () { if (run === r) size(); };

    r.last = performance.now(); r.raf = requestAnimationFrame(frame);
    function frame(now) {
      if (run !== r) return;
      r.raf = requestAnimationFrame(frame);
      var dt = Math.min(0.05, (now - r.last) / 1000); r.last = now;
      if (!r.paused) {
        env.t = r.t += dt;
        if (r.count > 0) r.count -= dt; else if (!r.over || r.game.keepRunning) r.game.update(dt);
        r.fx.forEach(function (f) { f.t += dt; }); r.fx = r.fx.filter(function (f) { return f.t < f.life; });
        r.parts.forEach(function (p) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; }); r.parts = r.parts.filter(function (p) { return p.t < p.life; });
      }
      g.save(); r.game.draw(g); g.restore();
      r.parts.forEach(function (p) { g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, 7); g.fill(); }); g.globalAlpha = 1;
      r.fx.forEach(function (f) { var k = f.t / f.life; g.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3; txt(g, f.text, f.x, f.y - 40 * k, f.size * (1 + 0.2 * Math.sin(k * 3.14)), f.col, { stroke: '#2d1b52' }); }); g.globalAlpha = 1;
      if (r.count > 0) {
        var lab = r.count > 0.3 ? String(Math.max(1, Math.min(3, Math.ceil((r.count - 0.3) / 0.5)))) : 'Go!';
        g.fillStyle = 'rgba(30,15,70,.25)'; g.fillRect(0, 0, r.W, r.H); var k2 = (r.count % 0.5) / 0.5;
        txt(g, lab, r.W / 2, r.H / 2, 90 + 30 * k2, '#ffd23f', { stroke: '#2d1b52' });
      }
    }
    function pause() {
      if (r.paused || r.over || run !== r) return; r.paused = true;
      var p = r.pausePop = ui.popup({ title: 'Paused', headCls: 'purple', cls: 'menu', dismiss: false, close: false });
      var rows = [['▶️', 'Keep playing', function () { p.close(true); resume(); }], ['🔁', 'Start again', function () { p.close(true); start(id, L, done); }], ['🚪', 'Leave game', function () { p.close(true); leave(); }]];
      rows.forEach(function (rw) { var b = el('button', 'btn menurow', '<span>' + rw[0] + '</span>' + rw[1]); on(b, rw[2]); p.body.appendChild(b); });
      p.body.appendChild(el('p', 'sm center', ui.esc(MG.describe(id, L))));
    }
    function resume() { r.paused = false; r.last = performance.now(); r.pausePop = null; }
    function leave() { close(); if (SI.play) SI.play.open(id); }
    r.pause = pause;
  }

  root.addEventListener('resize', function () { if (run) setTimeout(run.resize, 120); });

  SI.mgcore = {
    register: register, close: close, FONT: FONT,
    draw: { rr: rr, txt: txt, emoji: emoji, button: button, star: star, cloud: cloud, hit: hit, sky: sky, lighten: lighten },
    current: function () { return run; },
    pause: function () { if (run) run.pause(); },
    /** test hook: next canvas position a good player would tap, in page coordinates */
    target: function () {
      if (!run || run.over || run.paused || run.count > 0 || !run.game.target) return null;
      var t = run.game.target(); if (!t) return null; var b = run.cv.getBoundingClientRect(); return { x: b.left + t.x, y: b.top + t.y };
    },
    /** test hook only: end the running game with a score */
    debugFinish: function (score) { if (run && !run.over) { run.over = true; run.done(score); } },
    status: function () { return run ? { id: run.id, L: run.L, score: run.score, over: run.over, paused: run.paused, count: run.count } : null; }
  };
})(typeof self !== 'undefined' ? self : this);
