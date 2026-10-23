/* Minigame views 1/2: Shell Sort, Coconut Hop, Memory Match, Math Fishing. Registered into SI.mgcore (see core.js). */
(function (root) {
  'use strict';
  var SI = root.SI, C = SI.mgcore, D = C.draw, MG = SI.minigames, rr = D.rr, txt = D.txt, TAU = Math.PI * 2;

  function wrap(g, s, maxW, size) {
    g.font = '900 ' + size + 'px ' + C.FONT; var words = String(s).split(' '), lines = [], cur = '';
    words.forEach(function (w) { var t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }

  /* ================================================================== Shell Sort */
  C.register('shellSort', function (env) {
    var spec = env.spec, items = spec.items.map(function (it, i) { return { it: it, x: 0.12 + env.rand() * 0.76, y: -40, st: 'wait', rot: env.rand() * 6, k: 0, i: i }; });
    var t = 0, vy, resolved = 0, correct = 0, grab = null, shake = {}, bounce = {}, rects = [];
    function baseY() { return env.H - 118; }
    function layout() {
      var n = spec.baskets.length, w = env.W / n; rects = [];
      for (var i = 0; i < n; i++) rects.push({ x: i * w + 6, y: env.H - 112, w: w - 12, h: 104, cx: i * w + w / 2 });
    }
    function lowest() { var b = null; items.forEach(function (o) { if (o.st === 'fall' && o.y > -10 && (!b || o.y > b.y)) b = o; }); return b; }
    function sendTo(o, bi) {
      var ok = MG.rules.sortIsCorrect(spec, o.it, bi), r = rects[bi];
      o.tx = r.cx; o.ty = r.y + 30; o.st = ok ? 'good' : 'bad'; o.k = 0; o.sx = o.x * env.W; o.sy = o.y; resolved++;
      if (ok) { correct++; env.setScore(correct); env.sfx('correct'); bounce[bi] = 0.4; env.float('+1', r.cx, r.y - 6, '#9dffb0'); env.burst(r.cx, r.y + 10, '#ffd23f', 8); }
      else { env.sfx('wrong'); shake[bi] = 0.4; env.float('Oops!', r.cx, r.y - 6, '#ffb0b0'); }
      if (resolved >= items.length) env.finish(correct);
    }
    function basketAt(x, y) { for (var i = 0; i < rects.length; i++) if (D.hit({ x: rects[i].x, y: rects[i].y - 14, w: rects[i].w, h: rects[i].h + 30 }, x, y)) return i; return -1; }
    function shellShape(g, x, y, r, o) {
      var it = o.it, fill = it.color || '#ffe0bd', stroke = 'rgba(80,40,20,.7)';
      g.save(); g.translate(x, y);
      if (it.shape === 'star') { D.star(g, 0, 0, r * 1.15, '#ff9a5a', stroke); }
      else if (it.shape === 'spiral') { g.fillStyle = '#ffe3b8'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.lineWidth = 2.5; g.strokeStyle = stroke; g.stroke(); g.beginPath(); for (var a = 0; a < 12; a += 0.3) g.lineTo(Math.cos(a) * a * r / 12.5, Math.sin(a) * a * r / 12.5); g.strokeStyle = '#b4693a'; g.lineWidth = 3; g.stroke(); }
      else if (it.shape === 'conch') { g.fillStyle = '#ffc9d6'; g.beginPath(); g.moveTo(-r, r * 0.6); g.quadraticCurveTo(-r * 0.9, -r * 0.9, r * 0.7, -r * 0.7); g.quadraticCurveTo(r * 1.2, 0, r * 0.4, r * 0.7); g.closePath(); g.fill(); g.lineWidth = 2.5; g.strokeStyle = stroke; g.stroke(); g.beginPath(); g.arc(r * 0.35, -r * 0.2, r * 0.35, 0, TAU); g.strokeStyle = '#d6708a'; g.stroke(); }
      else { // scallop (colour or number shells)
        g.fillStyle = fill; g.beginPath(); g.moveTo(0, r * 0.9); for (var k = 0; k <= 5; k++) { var a2 = Math.PI + k * Math.PI / 5; g.quadraticCurveTo(Math.cos(a2 - 0.3) * r * 1.35, Math.sin(a2 - 0.3) * r * 1.35 + r * 0.1, Math.cos(a2) * r * 1.08, Math.sin(a2) * r * 1.08 + r * 0.1); } g.closePath(); g.fill(); g.lineWidth = 2.5; g.strokeStyle = stroke; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; for (var m = 1; m < 5; m++) { var a3 = Math.PI + m * Math.PI / 5; g.beginPath(); g.moveTo(0, r * 0.85); g.lineTo(Math.cos(a3) * r * 0.95, Math.sin(a3) * r * 0.95 + r * 0.1); g.stroke(); }
      }
      g.restore();
    }
    function drawItem(g, o, x, y, sc) {
      var r = 26 * sc; g.save(); g.translate(x, y); g.rotate(Math.sin(env.t * 2 + o.rot) * 0.15);
      if (o.it.v != null) { shellShape(g, 0, 0, r + 6, { it: { color: '#fff1e0' } }); txt(g, o.it.label, 0, 5, 26 * sc, '#2d1b52', { stroke: '#fff', sw: 4 }); }
      else shellShape(g, 0, 0, r, o);
      g.restore();
    }
    return {
      update: function (dt) {
        t += dt; layout(); vy = (baseY() + 40) / spec.fall;
        items.forEach(function (o) {
          if (o.st === 'wait' && t >= o.it.t) o.st = 'fall';
          if (o.st === 'fall') {
            if (grab && grab.o === o) return;
            o.y += vy * dt; if (o.y > baseY() + 22) { o.st = 'miss'; o.k = 0; resolved++; env.sfx('splash'); env.float('Missed', o.x * env.W, baseY(), '#ffd0a0'); if (resolved >= items.length) env.finish(correct); }
          } else if (o.st !== 'wait') o.k += dt;
        });
        Object.keys(shake).forEach(function (k) { shake[k] = Math.max(0, shake[k] - dt); }); Object.keys(bounce).forEach(function (k) { bounce[k] = Math.max(0, bounce[k] - dt); });
      },
      draw: function (g) {
        var W = env.W, H = env.H; layout();
        D.sky(g, W, H, '#8fd8ff', '#e8f8ff'); D.cloud(g, (env.t * 14) % (W + 120) - 60, 70, 1.1); D.cloud(g, (env.t * 9 + 220) % (W + 120) - 60, 140, 0.8);
        g.fillStyle = '#4fc3e8'; g.fillRect(0, H * 0.58, W, H * 0.42); g.fillStyle = 'rgba(255,255,255,.35)'; for (var i = 0; i < 6; i++) { g.beginPath(); g.ellipse((i * 97 + env.t * 20) % (W + 60), H * 0.62 + (i % 3) * 36, 36, 5, 0, 0, TAU); g.fill(); }
        g.fillStyle = '#f6dfa0'; g.fillRect(0, H - 130, W, 130);
        // rule banner
        var hint = spec.rule === 'colour' ? 'Sort by colour' : spec.rule === 'shape' ? 'Sort by shape' : 'Sort the numbers'; txt(g, hint, W / 2, 24, 20, '#fff', { stroke: '#2d1b52' });
        rects.forEach(function (r, bi) {
          var b = spec.baskets[bi], sh = shake[bi] > 0 ? Math.sin(shake[bi] * 60) * 6 : 0, up = bounce[bi] > 0 ? -Math.sin(bounce[bi] / 0.4 * 3.14) * 10 : 0;
          g.save(); g.translate(sh, up);
          g.fillStyle = '#b8793a'; g.beginPath(); g.moveTo(r.x + 8, r.y + 22); g.lineTo(r.x + r.w - 8, r.y + 22); g.lineTo(r.x + r.w - 22, r.y + r.h); g.lineTo(r.x + 22, r.y + r.h); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = '#6b3d14'; g.stroke();
          g.strokeStyle = 'rgba(107,61,20,.5)'; g.lineWidth = 2; for (var s = 1; s < 4; s++) { g.beginPath(); g.moveTo(r.x + 8 + (r.w - 16) * s / 4, r.y + 24); g.lineTo(r.x + 22 + (r.w - 44) * s / 4, r.y + r.h - 2); g.stroke(); }
          rr(g, r.x, r.y + 8, r.w, 20, 10); g.fillStyle = b.color || '#d28b45'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#6b3d14'; g.stroke();
          if (spec.rule === 'shape') shellShape(g, r.cx, r.y + 56, 18, { it: { shape: b.key } });
          else if (spec.rule === 'colour') { g.fillStyle = b.color; g.beginPath(); g.arc(r.cx, r.y + 56, 17, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); }
          rr(g, r.x + 4, r.y + r.h - 34, r.w - 8, 30, 12); g.fillStyle = 'rgba(255,255,255,.93)'; g.fill(); g.strokeStyle = '#6b3d14'; g.lineWidth = 2.5; g.stroke();
          txt(g, b.label, r.cx, r.y + r.h - 19, 17, '#2d1b52', { maxW: r.w - 18 });
          g.restore();
        });
        var low = lowest();
        items.forEach(function (o) {
          if (o.st === 'wait') return; var x, y, sc = 1, a = 1;
          if (o.st === 'fall') { x = (grab && grab.o === o) ? grab.x : o.x * W; y = (grab && grab.o === o) ? grab.y : o.y; if (o === low) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(x, y, 38, 0, TAU); g.fill(); } }
          else if (o.st === 'good') { var k = Math.min(1, o.k / 0.35); x = o.sx + (o.tx - o.sx) * k; y = o.sy + (o.ty - o.sy) * k - Math.sin(k * 3.14) * 30; sc = 1 - 0.5 * k; a = 1 - Math.max(0, k - 0.7) / 0.3; if (o.k > 0.4) return; }
          else if (o.st === 'bad') { x = o.sx + (o.tx - o.sx) * Math.min(1, o.k / 0.2); y = o.sy + (o.ty - o.sy) * Math.min(1, o.k / 0.2) - o.k * 160 + o.k * o.k * 500; a = 1 - o.k / 0.7; if (o.k > 0.7) return; }
          else { x = o.x * W; y = baseY() + 22; a = 1 - o.k / 0.5; sc = 1 + o.k; if (o.k > 0.5) return; }
          g.globalAlpha = Math.max(0, a); drawItem(g, o, x, y, sc); g.globalAlpha = 1;
        });
        if (t < 3) txt(g, 'Tap a basket (or drag the shell)', W / 2, H * 0.3, 18, '#2d1b52', { stroke: '#fff', sw: 4 });
      },
      pointer: function (type, x, y) {
        if (type === 'down') {
          var bi = basketAt(x, y), best = null, bd = 1e9;
          items.forEach(function (o) { if (o.st !== 'fall') return; var d = Math.hypot(o.x * env.W - x, o.y - y); if (d < 44 && d < bd) { bd = d; best = o; } });
          if (best && bi < 0) { grab = { o: best, x: x, y: y, sx: x, sy: y, moved: false }; return; }
          if (bi >= 0) { var l = lowest(); if (l) sendTo(l, bi); else env.sfx('tap'); }
        } else if (type === 'move' && grab) { grab.x = x; grab.y = y; if (Math.hypot(x - grab.sx, y - grab.sy) > 10) grab.moved = true; }
        else if (type === 'up' && grab) {
          var b2 = basketAt(grab.x, grab.y), o2 = grab.o; grab = null;
          if (b2 >= 0 && o2.st === 'fall') { o2.x = Math.max(0.05, Math.min(0.95, x / env.W)); sendTo(o2, b2); } else { o2.x = Math.max(0.08, Math.min(0.92, x / env.W)); o2.y = Math.min(o2.y, y); }
        }
      },
      target: function () { var l = lowest(); if (!l) return null; for (var b = 0; b < rects.length; b++) if (MG.rules.sortIsCorrect(spec, l.it, b)) return { x: rects[b].cx, y: rects[b].y + 50 }; return null; }
    };
  });

  /* ================================================================== Coconut Hop */
  C.register('coconutHop', function (env) {
    var spec = env.spec, pos = 0, jt = -1, buf = 0, hitT = 0, cleared = 0, shown = 0, J = spec.speed * spec.airtime, end = false;
    var obs = spec.obstacles.map(function (o) { return { o: o, hit: false, done: false }; });
    function pxu() { return env.W / 9; }
    function gy() { return env.H * 0.74; }
    function px() { return env.W * 0.24; }
    function hgt() { return jt < 0 ? 0 : (function () { var k = jt / spec.airtime; return 4 * k * (1 - k); })(); }
    function jump() { if (jt < 0) { jt = 0; env.sfx('jump'); } else if (jt > spec.airtime * 0.55) buf = 0.14; }
    function nextOb() { for (var i = 0; i < obs.length; i++) if (!obs[i].done && !obs[i].hit) return obs[i]; return null; }
    return {
      update: function (dt) {
        pos += spec.speed * dt;
        if (jt >= 0) { jt += dt; if (jt >= spec.airtime) { jt = -1; if (buf > 0) { jt = 0; buf = 0; env.sfx('jump'); } } }
        buf = Math.max(0, buf - dt); hitT = Math.max(0, hitT - dt);
        var h = hgt();
        obs.forEach(function (b) {
          var o = b.o;
          if (!b.hit && !b.done && pos + 0.18 > o.x + 0.12 && pos - 0.18 < o.x + o.w - 0.12 && h < 0.25) { b.hit = true; hitT = 0.5; env.sfx('bump'); env.float('Bump!', px(), gy() - 110, '#ffd0a0', 22); }
          if (!b.hit && !b.done && pos - 0.18 > o.x + o.w) { b.done = true; cleared++; env.setScore(cleared); env.sfx('pop'); env.float('+1', px() + 30, gy() - 120, '#9dffb0', 22); }
        });
        if (!end && pos > spec.length - 4) { end = true; env.finish(cleared); }
      },
      draw: function (g) {
        var W = env.W, H = env.H, u = pxu(), Y = gy(), X = px();
        D.sky(g, W, H, '#7fd4ff', '#d8f4ff');
        g.fillStyle = '#ffe58a'; g.beginPath(); g.arc(W * 0.8, H * 0.14, 38, 0, TAU); g.fill();
        for (var c = 0; c < 4; c++) D.cloud(g, ((c * 170 - pos * u * 0.12) % (W + 200) + W + 200) % (W + 200) - 80, 60 + (c % 2) * 50, 1 + (c % 3) * 0.2);
        g.fillStyle = '#3fb4e0'; g.fillRect(0, Y - 70, W, 60); g.fillStyle = 'rgba(255,255,255,.4)';
        for (var w = 0; w < 8; w++) { g.beginPath(); g.ellipse(((w * 90 - pos * u * 0.3) % (W + 100) + W + 100) % (W + 100) - 30, Y - 55 + (w % 3) * 14, 28, 4, 0, 0, TAU); g.fill(); }
        for (var p = 0; p < 4; p++) { var palmx = ((p * 200 - pos * u * 0.5) % (W + 260) + W + 260) % (W + 260) - 60; g.fillStyle = '#8a5a2a'; g.fillRect(palmx - 5, Y - 110, 10, 100); g.fillStyle = '#35b86a'; for (var l = 0; l < 5; l++) { g.beginPath(); g.ellipse(palmx + Math.cos(l * 1.3) * 22, Y - 112 + Math.sin(l * 1.3) * 10, 26, 7, l * 0.6 - 1.2, 0, TAU); g.fill(); } }
        g.fillStyle = '#f6dfa0'; g.fillRect(0, Y - 8, W, H - Y + 8); g.fillStyle = '#e5c375'; g.fillRect(0, Y - 8, W, 8);
        g.fillStyle = 'rgba(160,110,40,.35)'; for (var s = 0; s < 14; s++) { var sx0 = (((s * 61 - pos * u) % (W + 80)) + W + 80) % (W + 80) - 30; g.beginPath(); g.ellipse(sx0, Y + 20 + (s % 4) * 22, 7, 3, 0, 0, TAU); g.fill(); }
        // obstacles
        obs.forEach(function (b) {
          var o = b.o, sx0 = X + (o.x - pos) * u, ww = o.w * u; if (sx0 > W + 60 || sx0 + ww < -60) return;
          var cx = sx0 + ww / 2; g.save(); if (b.hit) g.globalAlpha = 0.55;
          if (o.type === 'coconut') { g.translate(cx, Y - 20); g.rotate(-(pos - o.x) * 1.6); g.fillStyle = '#7a4a1c'; g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#4a2a0c'; g.stroke(); g.fillStyle = '#3a1f08'; [[-6, -6], [6, -6], [0, 5]].forEach(function (e) { g.beginPath(); g.arc(e[0], e[1], 3.4, 0, TAU); g.fill(); }); }
          else if (o.type === 'puddle') { g.fillStyle = '#3d9fe0'; g.beginPath(); g.ellipse(cx, Y + 2, ww / 2 + 6, 15, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#1f6fb0'; g.stroke(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(cx - ww * 0.15, Y - 2, ww * 0.18, 4, 0, 0, TAU); g.fill(); }
          else { // friendly crab
            var wv = Math.sin(env.t * 6) * 0.35; g.translate(cx, Y - 20); g.fillStyle = '#ff7a50'; g.beginPath(); g.ellipse(0, 0, 26, 18, 0, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = '#a8401f'; g.stroke();
            [-1, 1].forEach(function (sd) { g.save(); g.translate(sd * 24, -8); g.rotate(sd * (-0.5 + (sd > 0 ? wv : -wv))); g.fillStyle = '#ff7a50'; g.beginPath(); g.arc(sd * 6, -8, 10, 0, TAU); g.fill(); g.stroke(); g.restore(); g.beginPath(); g.moveTo(sd * 10, 14); g.lineTo(sd * 22, 24); g.stroke(); });
            g.fillStyle = '#fff'; g.beginPath(); g.arc(-8, -12, 6, 0, TAU); g.arc(8, -12, 6, 0, TAU); g.fill(); g.fillStyle = '#2d1b52'; g.beginPath(); g.arc(-8, -11, 3, 0, TAU); g.arc(8, -11, 3, 0, TAU); g.fill();
            g.beginPath(); g.arc(0, 2, 7, 0.2, Math.PI - 0.2); g.lineWidth = 2.5; g.strokeStyle = '#7a2810'; g.stroke();
          }
          g.restore();
        });
        // goal pennant
        var fx = X + (spec.length - 5 - pos) * u; if (fx < W + 40) { g.fillStyle = '#7a4a1c'; g.fillRect(fx, Y - 90, 6, 90); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(fx + 6, Y - 90); g.lineTo(fx + 60, Y - 72); g.lineTo(fx + 6, Y - 54); g.fill(); }
        // runner
        var h = hgt(), py = Y - h * 120, stumble = hitT > 0;
        g.save(); if (stumble) { g.translate(X, py); g.rotate(Math.sin(hitT * 40) * 0.12); g.translate(-X, -py); g.globalAlpha = 0.7 + 0.3 * Math.sin(hitT * 60); }
        env.avatar(g, X, py, 0.82, { walk: jt >= 0 ? 0 : 1, phase: pos * 3.2, dir: 1 }); g.restore();
        var nx = nextOb(); if (nx && env.t < 4) txt(g, 'Tap to jump!', W / 2, H * 0.3, 24, '#fff', { stroke: '#2d1b52' });
        var prog = Math.min(1, pos / (spec.length - 4)); g.fillStyle = 'rgba(255,255,255,.7)'; rr(g, 16, H - 14, W - 32, 7, 4); g.fill(); g.fillStyle = '#ff9a2a'; rr(g, 16, H - 14, Math.max(8, (W - 32) * prog), 7, 4); g.fill();
      },
      pointer: function (type) { if (type === 'down') jump(); },
      target: function () {
        var b = nextOb(); if (!b || jt >= 0) return null; var o = b.o, lo = o.x + o.w + 0.06 - 0.933 * J, hi = o.x - 0.06 - 0.067 * J;
        if (pos >= lo + (hi - lo) * 0.1 && pos <= hi) return { x: env.W / 2, y: env.H / 2 }; return null;
      },
      keepRunning: false
    };
  });

  /* ================================================================== Memory Match */
  C.register('memoryMatch', function (env) {
    var spec = env.spec, cards = spec.deck.map(function (c, i) { return { pair: c.pair, face: c.face, flip: 0, want: 0, matched: false, i: i, pop: 0 }; });
    var first = null, second = null, lockT = 0, flips = 0, matched = 0, rects = [];
    function layout() {
      var top = 44, pad = 10, W = env.W - pad * 2, H = env.H - top - pad, cols = spec.cols, rows = spec.rows;
      var cw = Math.min(W / cols - 8, 120), ch = Math.min(H / rows - 8, cw * 1.25); cw = Math.min(cw, ch * 1.1);
      var gw = cols * (cw + 8) - 8, gh = rows * (ch + 8) - 8, x0 = (env.W - gw) / 2, y0 = top + (H - gh) / 2;
      rects = cards.map(function (c, i) { return { x: x0 + (i % cols) * (cw + 8), y: y0 + Math.floor(i / cols) * (ch + 8), w: cw, h: ch }; });
    }
    function face(g, c, r) {
      var f = c.face, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      if (/^●+$/.test(f)) { var n = f.length, cols = n <= 4 ? 2 : n <= 9 ? 3 : 4, rows = Math.ceil(n / cols), s = Math.min(r.w / (cols + 0.6), r.h / (rows + 0.6)) * 0.82; for (var i = 0; i < n; i++) { g.fillStyle = '#ff7a50'; g.beginPath(); g.arc(cx + ((i % cols) - (cols - 1) / 2) * s, cy + (Math.floor(i / cols) - (rows - 1) / 2) * s, s * 0.36, 0, TAU); g.fill(); } return; }
      if (/^[^\x00-\x7f]+$/.test(f) && f.length <= 4) { D.emoji(g, f, cx, cy + 2, Math.min(r.w, r.h) * 0.6); return; }
      txt(g, f, cx, cy, Math.min(r.h * 0.4, 38), '#2d1b52', { maxW: r.w - 10 });
    }
    return {
      update: function (dt) {
        cards.forEach(function (c) { c.flip += (c.want - c.flip) * Math.min(1, dt * 14); if (Math.abs(c.want - c.flip) < 0.01) c.flip = c.want; c.pop = Math.max(0, c.pop - dt); });
        if (lockT > 0) { lockT -= dt; if (lockT <= 0) { if (first && second) { first.want = 0; second.want = 0; } first = second = null; } }
      },
      draw: function (g) {
        layout(); var W = env.W, H = env.H;
        D.sky(g, W, H, '#c9b6ff', '#f2eaff');
        txt(g, 'Flips: ' + flips, 16, 22, 20, '#2d1b52', { align: 'left' }); txt(g, '⭐⭐⭐ at ' + env.th.t3 + ' or fewer', W - 14, 22, 15, '#6a3ce0', { align: 'right' });
        cards.forEach(function (c, i) {
          var r = rects[i], k = c.flip, sx = Math.abs(Math.cos(k * Math.PI)), showFace = k > 0.5, sc = 1 + Math.sin(c.pop / 0.4 * 3.14) * 0.12;
          g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(Math.max(0.04, sx) * sc, sc); g.translate(-(r.x + r.w / 2), -(r.y + r.h / 2));
          rr(g, r.x, r.y + 3, r.w, r.h, 12); g.fillStyle = 'rgba(30,15,70,.3)'; g.fill();
          rr(g, r.x, r.y, r.w, r.h, 12);
          if (showFace) { g.fillStyle = c.matched ? '#d6ffe0' : '#fff'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = c.matched ? '#3fbf6a' : '#8d6bff'; g.stroke(); g.save(); g.scale(1, 1); face(g, c, r); g.restore(); }
          else { var gr = g.createLinearGradient(r.x, r.y, r.x, r.y + r.h); gr.addColorStop(0, '#9a6bff'); gr.addColorStop(1, '#6a3ce0'); g.fillStyle = gr; g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#fff'; g.stroke(); D.star(g, r.x + r.w / 2, r.y + r.h / 2, Math.min(r.w, r.h) * 0.26, '#ffd23f', '#b36b00'); }
          g.restore();
        });
      },
      pointer: function (type, x, y) {
        if (type !== 'down' || lockT > 0) return;
        for (var i = 0; i < cards.length; i++) if (D.hit(rects[i], x, y)) {
          var c = cards[i]; if (c.matched || c === first || c.want === 1) return; c.want = 1; env.sfx('tap');
          if (!first) { first = c; return; }
          second = c; flips++; env.setScore(flips, String(flips)); env.setMeter(matched / spec.pairs);
          if (MG.rules.memIsMatch(first, second)) {
            first.matched = second.matched = true; first.pop = second.pop = 0.4; matched++; env.setMeter(matched / spec.pairs); env.sfx('correct');
            env.burst(rects[first.i].x + rects[first.i].w / 2, rects[first.i].y + rects[first.i].h / 2, '#ffd23f', 8); env.burst(rects[i].x + rects[i].w / 2, rects[i].y + rects[i].h / 2, '#ffd23f', 8);
            first = second = null; if (matched >= spec.pairs) env.finish(flips);
          } else { lockT = 0.95; env.sfx('wrong'); }
          return;
        }
      },
      target: function () {
        if (lockT > 0) return null;
        var pick = null;
        if (first) { for (var i = 0; i < cards.length; i++) if (cards[i] !== first && !cards[i].matched && cards[i].pair === first.pair) pick = i; }
        else { for (var j = 0; j < cards.length; j++) if (!cards[j].matched) { pick = j; break; } }
        if (pick == null) return null; var r = rects[pick]; return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
      }
    };
  });

  /* ================================================================== Math Fishing */
  C.register('mathFishing', function (env) {
    var spec = env.spec, ri = 0, score = 0, fish = [], rd = null, rt = 0, mistakes = 0, timedOut = false, solved = false, wait = 0, FC = ['#ff9a5a', '#ffd23f', '#6ad0ff', '#b58bff', '#7fe6a0'];
    function setup() {
      rd = spec.rounds[ri]; rt = 0; mistakes = 0; timedOut = false; solved = false; wait = 0;
      fish = rd.options.map(function (o, i) { return { opt: String(o), row: i, x: 0.15 + env.rand() * 0.7, dir: env.rand() < 0.5 ? -1 : 1, sp: 0.05 + env.rand() * 0.05, col: FC[(i + ri) % FC.length], state: 'swim', k: 0, off: false }; });
    }
    setup();
    function rowY(i) { var n = rd.options.length, top = qh() + 60, bot = env.H - 120; return top + (bot - top) * (i + 0.5) / n; }
    function qh() { return Math.min(env.H * 0.24, 150); }
    function fishPos(f) { return { x: f.x * env.W, y: rowY(f.row) + Math.sin(env.t * 2 + f.row) * 5 }; }
    function isRight(f) { return f.opt === String(rd.answer); }
    return {
      update: function (dt) {
        if (solved) { wait -= dt; fish.forEach(function (f) { f.k += dt; }); if (wait <= 0) { ri++; if (ri >= spec.rounds.length) { env.finish(score); solved = false; ri = spec.rounds.length - 1; wait = 1e9; } else setup(); } return; }
        rt += dt; if (!timedOut && rt > spec.time) { timedOut = true; env.float('Take your time!', env.W / 2, qh() + 40, '#fff', 20); }
        fish.forEach(function (f) { if (f.state === 'swim') { f.x += f.dir * f.sp * dt; if (f.x > 0.82) { f.x = 0.82; f.dir = -1; } if (f.x < 0.18) { f.x = 0.18; f.dir = 1; } } else f.k += dt; });
      },
      draw: function (g) {
        var W = env.W, H = env.H; D.sky(g, W, H, '#6ad0ff', '#1d7fd0');
        g.fillStyle = '#bfeaff'; g.fillRect(0, 0, W, qh() + 20); g.fillStyle = 'rgba(255,255,255,.12)'; for (var b = 0; b < 8; b++) { g.beginPath(); g.arc((b * 83 + env.t * 12) % W, H - ((env.t * 26 + b * 71) % (H * 0.7)), 4 + b % 3 * 2, 0, TAU); g.fill(); }
        g.fillStyle = '#5ab8f5'; g.beginPath(); g.moveTo(0, qh() + 20); for (var x = 0; x <= W + 20; x += 20) g.lineTo(x, qh() + 20 + Math.sin(x / 30 + env.t * 2) * 4); g.lineTo(W + 20, H); g.lineTo(0, H); g.fill();
        // question card
        rr(g, 10, 8, W - 20, qh(), 16); g.fillStyle = 'rgba(255,249,238,.97)'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#8d6bff'; g.stroke();
        var size = 22, lines = wrap(g, rd.text, W - 56, size), py = 8 + qh() / 2;
        if (rd.pic) { g.font = '24px "Apple Color Emoji","Noto Color Emoji",sans-serif'; var pl = wrap(g, rd.pic, W - 56, 24); g.textAlign = 'center'; g.textBaseline = 'middle'; pl.slice(0, 2).forEach(function (l, i) { g.fillText(l, W / 2, 30 + i * 28); }); py = 8 + qh() * 0.72; }
        lines.slice(0, 3).forEach(function (l, i) { txt(g, l, W / 2, py + (i - (lines.length - 1) / 2) * 26 - (rd.pic ? 12 : 0), size, '#2d1b52'); });
        g.fillStyle = 'rgba(255,255,255,.7)'; rr(g, 20, qh() - 6, W - 40, 6, 3); g.fill(); g.fillStyle = timedOut ? '#ffb23c' : '#3fcf6a'; rr(g, 20, qh() - 6, Math.max(6, (W - 40) * Math.max(0, 1 - rt / spec.time)), 6, 3); g.fill();
        fish.forEach(function (f) {
          var p = fishPos(f), a = f.state === 'bad' ? Math.max(0, 1 - f.k / 0.6) : 1, bw = Math.min(150, W * 0.36), bh = 58;
          if (f.state === 'catch') { p.y -= f.k * 260 - f.k * f.k * 250; if (p.y < -60) return; }
          g.save(); g.globalAlpha = a; g.translate(p.x + (f.state === 'bad' ? Math.sin(f.k * 50) * 6 : 0), p.y);
          var glow = timedOut && !solved && isRight(f) ? 0.5 + 0.5 * Math.sin(env.t * 8) : 0; if (glow) { g.fillStyle = 'rgba(255,255,160,' + (0.4 * glow) + ')'; g.beginPath(); g.ellipse(0, 0, bw * 0.75, bh, 0, 0, TAU); g.fill(); }
          g.save(); g.scale(f.dir > 0 ? -1 : 1, 1); g.fillStyle = f.col; g.beginPath(); g.moveTo(bw * 0.38, 0); g.lineTo(bw * 0.62, -bh * 0.4); g.lineTo(bw * 0.62, bh * 0.4); g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(30,15,70,.5)'; g.stroke();
          g.beginPath(); g.ellipse(0, 0, bw * 0.5, bh * 0.5, 0, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-bw * 0.33, -bh * 0.1, 7, 0, TAU); g.fill(); g.fillStyle = '#2d1b52'; g.beginPath(); g.arc(-bw * 0.35, -bh * 0.1, 3.5, 0, TAU); g.fill(); g.restore();
          rr(g, -bw * 0.28, -17, bw * 0.62, 34, 14); g.fillStyle = 'rgba(255,255,255,.93)'; g.fill(); txt(g, f.opt, bw * 0.03, 1, 22, '#2d1b52', { maxW: bw * 0.56 });
          g.restore();
        });
        env.avatar(g, W / 2, H - 14, 0.8, { walk: 0, dir: 1 });
        D.emoji(g, '🎣', W / 2 + 46, H - 62, 32);
        txt(g, 'Round ' + Math.min(ri + 1, spec.rounds.length) + ' / ' + spec.rounds.length, W - 14, H - 16, 15, '#fff', { align: 'right', stroke: '#1d5fa0' });
        if (mistakes === 0 && !solved && rt < 4) txt(g, 'First try scores!', 14, H - 16, 15, '#fff', { align: 'left', stroke: '#1d5fa0' });
      },
      pointer: function (type, x, y) {
        if (type !== 'down' || solved) return;
        for (var i = 0; i < fish.length; i++) {
          var f = fish[i]; if (f.state !== 'swim') continue; var p = fishPos(f), bw = Math.min(150, env.W * 0.36);
          if (Math.abs(x - p.x) < bw * 0.62 && Math.abs(y - p.y) < 40) {
            if (isRight(f)) {
              f.state = 'catch'; f.k = 0; solved = true; wait = 1.0; env.sfx('correct'); env.burst(p.x, p.y, '#bfeaff', 12);
              if (mistakes === 0 && !timedOut) { score++; env.setScore(score); env.float('+1', p.x, p.y - 20, '#9dffb0'); } else env.float('Got it!', p.x, p.y - 20, '#fff');
            } else { f.state = 'bad'; f.k = 0; mistakes++; env.sfx('wrong'); env.float('Try again', p.x, p.y - 20, '#ffd0d0', 20); }
            return;
          }
        }
      },
      target: function () { if (solved) return null; for (var i = 0; i < fish.length; i++) if (fish[i].state === 'swim' && isRight(fish[i])) return fishPos(fish[i]); return null; }
    };
  });
})(typeof self !== 'undefined' ? self : this);
