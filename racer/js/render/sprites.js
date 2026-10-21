/* Procedural sprite atlas: roadside props per world and the race items (potholes, oil, puddles, cones, rocks,
 * ramps, coins, fuel, wrenches, barriers, signs, arches). Everything is painted once into offscreen canvases and
 * cached; the road renderer only drawImage()s them. Props get a per-world light pass (sun side lighter, shadow side
 * tinted) so every world has its own lighting; lit parts (neon, windows, lamps) are painted after it.
 * Browser only: RR.sprites. */
(function (root) {
  'use strict';
  var P = root.RR.paint;

  var LIGHT = {
    day: { dir: 1, hi: 'rgba(255,255,230,0.18)', lo: 'rgba(20,40,90,0.22)' },
    sunset: { dir: -1, hi: 'rgba(255,170,80,0.38)', lo: 'rgba(70,20,90,0.40)' },
    frost: { dir: 1, hi: 'rgba(255,255,255,0.2)', lo: 'rgba(60,90,150,0.28)' },
    lush: { dir: -1, hi: 'rgba(255,250,190,0.22)', lo: 'rgba(0,40,30,0.32)' },
    night: { dir: 1, hi: 'rgba(120,80,255,0.10)', lo: 'rgba(5,3,20,0.72)', dark: 'rgba(8,6,30,0.55)' }
  };

  /** Bake a prop and apply the world light. emit(ctx, W, H, u) paints self-lit parts after the light pass. */
  function prop(theme, wm, hm, ppm, draw, emit) {
    var L = LIGHT[theme.light] || LIGHT.day;
    var spr = P.bake(wm, hm, ppm, function (ctx, W, H, u) {
      draw(ctx, W, H, u);
      ctx.globalCompositeOperation = 'source-atop';
      if (L.dark) { ctx.fillStyle = L.dark; ctx.fillRect(0, 0, W, H); }
      ctx.fillStyle = P.lin(ctx, L.dir > 0 ? W : 0, 0, L.dir > 0 ? 0 : W, 0, [[0, L.hi], [0.45, 'rgba(0,0,0,0)'], [1, L.lo]]);
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = P.lin(ctx, 0, H, 0, H * 0.6, [[0, 'rgba(0,0,0,0.18)'], [1, 'rgba(0,0,0,0)']]);
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      if (emit) emit(ctx, W, H, u);
    });
    return spr;
  }

  function txt(ctx, s, x, y, size, color, weight) {
    ctx.font = (weight || 900) + ' ' + size + 'px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }

  function trunk(ctx, x0, y0, x1, y1, w0, w1, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0 - w0 / 2, y0); ctx.quadraticCurveTo((x0 + x1) / 2 - w1, (y0 + y1) / 2, x1 - w1 / 2, y1);
    ctx.lineTo(x1 + w1 / 2, y1); ctx.quadraticCurveTo((x0 + x1) / 2 + w1, (y0 + y1) / 2, x0 + w0 / 2, y0);
    ctx.closePath(); ctx.fill();
  }

  function foliage(ctx, cx, cy, r, rnd, dark, mid, light) {
    P.blob(ctx, cx, cy + r * 0.12, r, 9, rnd, dark);
    P.blob(ctx, cx - r * 0.05, cy, r * 0.88, 9, rnd, mid);
    P.blob(ctx, cx - r * 0.2, cy - r * 0.22, r * 0.5, 6, rnd, light);
  }

  function windowsGrid(ctx, x, y, w, h, cols, rows, color, rnd, litP, lit) {
    var cw = w / cols, ch = h / rows;
    for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
      var on = rnd() < (litP || 0);
      ctx.fillStyle = on ? lit : color;
      ctx.fillRect(x + i * cw + cw * 0.18, y + j * ch + ch * 0.2, cw * 0.64, ch * 0.6);
    }
  }

  function palmFronds(ctx, x, y, u, rnd, c1, c2) {
    for (var i = 0; i < 9; i++) {
      var a = -Math.PI / 2 + (i - 4) * 0.42 + (rnd() - 0.5) * 0.2, len = (2.2 + rnd() * 0.8) * u;
      var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len * 0.75 + len * 0.35;
      ctx.strokeStyle = i % 2 ? c1 : c2; ctx.lineWidth = 0.18 * u;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6 - 0.3 * u, ex, ey); ctx.stroke();
      ctx.fillStyle = i % 2 ? c1 : c2;
      for (var k = 1; k < 8; k++) {
        var t = k / 8, px = x + (ex - x) * t, py = y + (ey - y) * t - Math.sin(t * Math.PI) * 0.5 * u;
        ctx.beginPath(); ctx.ellipse(px, py + 0.12 * u, 0.1 * u, 0.42 * u * (1 - t * 0.5), a + 1.4, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  /* ------------------------------------------------------------------ props */

  var MAKERS = {
    /* city */
    tree: function (th, v) {
      var rnd = P.rand(100 + v), g = [['#2f8a3b', '#43a84a', '#7fd36a'], ['#2b7d36', '#3c9b45', '#9be07a'], ['#3a8f2f', '#5cb03d', '#b5e46a']][v % 3];
      return prop(th, 5, 7, 36, function (ctx, W, H, u) {
        trunk(ctx, W / 2, H, W / 2, H - 3.2 * u, 0.5 * u, 0.35 * u, '#7a4a2a');
        foliage(ctx, W / 2, H - 4.3 * u, 2.3 * u, rnd, g[0], g[1], g[2]);
      });
    },
    poplar: function (th, v) {
      var rnd = P.rand(200 + v);
      return prop(th, 2.4, 8, 36, function (ctx, W, H, u) {
        trunk(ctx, W / 2, H, W / 2, H - 2 * u, 0.3 * u, 0.2 * u, '#6b4226');
        ctx.fillStyle = '#2f7d39'; P.ellipse(ctx, W / 2, H - 4.8 * u, 1.1 * u, 3.1 * u); ctx.fill();
        ctx.fillStyle = '#46a24a'; P.ellipse(ctx, W / 2 - 0.15 * u, H - 5 * u, 0.85 * u, 2.8 * u); ctx.fill();
        ctx.fillStyle = 'rgba(170,240,140,0.5)'; P.ellipse(ctx, W / 2 - 0.35 * u, H - 5.8 * u, 0.3 * u, 1.4 * u); ctx.fill();
        P.blob(ctx, W / 2, H - 4.6 * u, 1 * u, 5, rnd, 'rgba(40,110,50,0.4)');
      });
    },
    lamp: function (th) {
      return prop(th, 3, 7.5, 40, function (ctx, W, H, u) {
        var x = 0.4 * u;
        ctx.fillStyle = '#3d4552'; ctx.fillRect(x - 0.1 * u, H - 7 * u, 0.2 * u, 7 * u);
        ctx.fillRect(x - 0.18 * u, H - 0.6 * u, 0.36 * u, 0.6 * u);
        ctx.strokeStyle = '#3d4552'; ctx.lineWidth = 0.16 * u;
        ctx.beginPath(); ctx.moveTo(x, H - 6.9 * u); ctx.quadraticCurveTo(x + 0.4 * u, H - 7.4 * u, x + 2.2 * u, H - 7.1 * u); ctx.stroke();
        ctx.fillStyle = '#2a3039'; P.rrect(ctx, x + 1.7 * u, H - 7.25 * u, 1 * u, 0.3 * u, 0.12 * u); ctx.fill();
        ctx.fillStyle = '#fff6c8'; ctx.fillRect(x + 1.85 * u, H - 6.97 * u, 0.7 * u, 0.08 * u);
      });
    },
    house: function (th, v) {
      var walls = ['#f6d6a8', '#bfe3f2', '#f7b9b0', '#d7ecb9'], roofs = ['#c8553d', '#4a6fa5', '#7a4b8c', '#3f7f5a'];
      var wall = walls[v % 4], roof = roofs[(v + 1) % 4];
      return prop(th, 8, 7, 30, function (ctx, W, H, u) {
        ctx.fillStyle = wall; ctx.fillRect(0.6 * u, H - 4.2 * u, 6.8 * u, 4.2 * u);
        ctx.fillStyle = P.shade(wall, -0.15); ctx.fillRect(0.6 * u, H - 0.5 * u, 6.8 * u, 0.5 * u);
        ctx.fillStyle = roof;
        ctx.beginPath(); ctx.moveTo(0.1 * u, H - 4 * u); ctx.lineTo(4 * u, H - 6.9 * u); ctx.lineTo(7.9 * u, H - 4 * u); ctx.closePath(); ctx.fill();
        ctx.fillStyle = P.shade(roof, 0.25); ctx.fillRect(0.1 * u, H - 4.15 * u, 7.8 * u, 0.25 * u);
        ctx.fillStyle = '#7a4a2a'; ctx.fillRect(5.8 * u, H - 6.6 * u, 0.6 * u, 1.4 * u);
        // windows + door
        [[1.2, 2.6], [3.2, 2.6]].forEach(function (p) {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(p[0] * u, H - p[1] * u - 0.1 * u, 1.3 * u, 1.3 * u);
          ctx.fillStyle = '#5aa6e0'; ctx.fillRect(p[0] * u + 0.1 * u, H - p[1] * u, 1.1 * u, 1.1 * u);
          ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(p[0] * u + 0.15 * u, H - p[1] * u + 0.05 * u, 0.3 * u, 1 * u);
          ctx.fillStyle = '#e8413b'; ctx.fillRect(p[0] * u, H - p[1] * u + 1.2 * u, 1.3 * u, 0.25 * u);
        });
        ctx.fillStyle = '#8a4b2a'; P.rrect(ctx, 5.4 * u, H - 2.6 * u, 1.2 * u, 2.6 * u, 0.5 * u); ctx.fill();
        P.circle(ctx, 6.3 * u, H - 1.3 * u, 0.08 * u, '#ffd84a');
      });
    },
    shop: function (th, v) {
      var names = ['TOYS', 'CAKES', 'PIZZA', 'BOOKS'], cols = ['#ff6b6b', '#4ecdc4', '#ffb347', '#a78bfa'];
      var c = cols[v % 4], name = names[v % 4];
      return prop(th, 8, 6, 30, function (ctx, W, H, u) {
        ctx.fillStyle = '#f4efe6'; ctx.fillRect(0.4 * u, H - 5.6 * u, 7.2 * u, 5.6 * u);
        ctx.fillStyle = c; ctx.fillRect(0.4 * u, H - 5.9 * u, 7.2 * u, 1.2 * u);
        txt(ctx, name, W / 2, H - 5.3 * u, 0.85 * u, '#ffffff');
        // striped awning
        for (var i = 0; i < 9; i++) {
          ctx.fillStyle = i % 2 ? '#ffffff' : c;
          ctx.beginPath(); ctx.moveTo((0.2 + i * 0.84) * u, H - 4.5 * u); ctx.lineTo((1.04 + i * 0.84) * u, H - 4.5 * u);
          ctx.lineTo((1.04 + i * 0.84) * u, H - 3.6 * u); ctx.arc((0.62 + i * 0.84) * u, H - 3.6 * u, 0.42 * u, 0, Math.PI); ctx.fill();
        }
        ctx.fillStyle = '#7fc4f0'; ctx.fillRect(0.9 * u, H - 3 * u, 4 * u, 2.4 * u);
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(1.1 * u, H - 2.9 * u, 0.6 * u, 2.2 * u);
        ctx.fillStyle = '#5b3a22'; ctx.fillRect(5.4 * u, H - 3 * u, 1.5 * u, 3 * u);
        ctx.fillStyle = '#9a9a9a'; ctx.fillRect(0.4 * u, H - 0.3 * u, 7.2 * u, 0.3 * u);
      });
    },
    tower: function (th, v) {
      var rnd = P.rand(300 + v), base = ['#8fb3d9', '#a7c4dd', '#9aa9c9'][v % 3];
      return prop(th, 10, 26, 18, function (ctx, W, H, u) {
        var h = (20 + v * 2) * u;
        ctx.fillStyle = P.lin(ctx, 0, 0, W, 0, [[0, P.shade(base, 0.2)], [1, P.shade(base, -0.15)]]);
        ctx.fillRect(0.5 * u, H - h, 9 * u, h);
        ctx.fillStyle = P.shade(base, -0.3); ctx.fillRect(0.3 * u, H - h - 0.6 * u, 9.4 * u, 0.6 * u);
        windowsGrid(ctx, 0.9 * u, H - h + 0.6 * u, 8.2 * u, h - 1.6 * u, 6, Math.floor(h / u / 1.6), '#dceeff', rnd, 0.25, '#ffffff');
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0.5 * u, H - h, 2 * u, h);
      });
    },
    bush: function (th, v) {
      var rnd = P.rand(400 + v), flower = ['#ff6b9a', '#ffd84a', '#ffffff'][v % 3];
      return prop(th, 2.6, 1.6, 48, function (ctx, W, H, u) {
        P.blob(ctx, W / 2, H - 0.7 * u, 1.1 * u, 8, rnd, '#2f8a3b');
        P.blob(ctx, W / 2 - 0.1 * u, H - 0.8 * u, 0.9 * u, 8, rnd, '#4fae4a');
        P.blob(ctx, W / 2 - 0.3 * u, H - 1.0 * u, 0.45 * u, 5, rnd, '#86d46a');
        for (var i = 0; i < 6; i++) P.circle(ctx, W / 2 + (rnd() - 0.5) * 1.8 * u, H - (0.4 + rnd() * 0.8) * u, 0.08 * u, flower);
      });
    },
    billboard: function (th) {
      return prop(th, 8, 6.5, 30, function (ctx, W, H, u) {
        ctx.fillStyle = '#5b6270'; ctx.fillRect(1.8 * u, H - 3 * u, 0.3 * u, 3 * u); ctx.fillRect(5.9 * u, H - 3 * u, 0.3 * u, 3 * u);
        P.rrect(ctx, 0.3 * u, H - 6.4 * u, 7.4 * u, 3.6 * u, 0.3 * u);
        ctx.fillStyle = P.lin(ctx, 0, H - 6.4 * u, 0, H - 2.8 * u, [[0, '#ffe066'], [1, '#ff9f43']]); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.18 * u; ctx.stroke();
        txt(ctx, 'GO SALAH!', W / 2 + 0.6 * u, H - 4.6 * u, 1.05 * u, '#e8322f');
        P.circle(ctx, 1.4 * u, H - 4.6 * u, 0.7 * u, '#ffffff');
        txt(ctx, '🏁', 1.4 * u, H - 4.55 * u, 0.9 * u, '#000');
      });
    },

    /* desert */
    cactus: function (th, v) {
      return prop(th, 3, 5, 40, function (ctx, W, H, u) {
        var g = P.lin(ctx, W / 2 - 0.5 * u, 0, W / 2 + 0.5 * u, 0, [[0, '#6fbf5a'], [0.5, '#3f9a45'], [1, '#2a6e33']]);
        ctx.fillStyle = g;
        P.rrect(ctx, W / 2 - 0.42 * u, H - 4.6 * u, 0.84 * u, 4.6 * u, 0.42 * u); ctx.fill();
        var arms = v % 2 ? [[-1, 2.1, 1.0], [1, 2.8, 0.8]] : [[1, 1.8, 1.2], [-1, 3.0, 0.7]];
        arms.forEach(function (a) {
          var s = a[0], y = a[1], hgt = a[2];
          P.rrect(ctx, W / 2 + (s > 0 ? 0.2 : -1.3) * u, H - y * u - 0.3 * u, 1.1 * u, 0.6 * u, 0.3 * u); ctx.fill();
          P.rrect(ctx, W / 2 + (s > 0 ? 0.85 : -1.3) * u, H - (y + hgt) * u - 0.3 * u, 0.6 * u, (hgt + 0.6) * u, 0.3 * u); ctx.fill();
        });
        ctx.strokeStyle = 'rgba(20,60,25,0.45)'; ctx.lineWidth = 0.05 * u;
        [-0.18, 0, 0.18].forEach(function (x) { ctx.beginPath(); ctx.moveTo(W / 2 + x * u, H - 4.3 * u); ctx.lineTo(W / 2 + x * u, H - 0.1 * u); ctx.stroke(); });
        if (v % 3 === 0) P.circle(ctx, W / 2, H - 4.6 * u, 0.2 * u, '#ff5fa8');
      });
    },
    cactus2: function (th, v) {
      return prop(th, 1.6, 1.6, 56, function (ctx, W, H, u) {
        ctx.fillStyle = P.rad(ctx, W / 2 - 0.2 * u, H - 0.9 * u, 0, 0.8 * u, [[0, '#7fcf62'], [1, '#2c7a36']]);
        P.ellipse(ctx, W / 2, H - 0.65 * u, 0.7 * u, 0.62 * u); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,220,0.6)'; ctx.lineWidth = 0.03 * u;
        for (var i = 0; i < 7; i++) { var a = Math.PI + i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(W / 2, H - 1.2 * u); ctx.quadraticCurveTo(W / 2 + Math.cos(a) * 0.8 * u, H - 0.8 * u, W / 2 + Math.cos(a) * 0.65 * u, H - 0.1 * u); ctx.stroke(); }
        [['#ff5fa8', -0.2], ['#ffd84a', 0.2]].forEach(function (f) { P.circle(ctx, W / 2 + f[1] * u, H - 1.25 * u, 0.13 * u, f[0]); });
      });
    },
    redrock: function (th, v) {
      return prop(th, 3.4, 2.4, 44, function (ctx, W, H, u) {
        P.rpoly(ctx, [[0.1 * u, H], [0.4 * u, H - 1.5 * u], [1.2 * u, H - 2.3 * u], [2.4 * u, H - 2.1 * u], [3.2 * u, H - 1.2 * u], [3.3 * u, H]], 0.3 * u);
        ctx.fillStyle = P.lin(ctx, 0, H - 2.3 * u, 0, H, [[0, '#e0805a'], [1, '#9a4430']]); ctx.fill();
        ctx.strokeStyle = 'rgba(90,30,20,0.4)'; ctx.lineWidth = 0.06 * u;
        [0.7, 1.3].forEach(function (y) { ctx.beginPath(); ctx.moveTo(0.4 * u, H - y * u); ctx.lineTo(3.1 * u, H - y * u + 0.1 * u); ctx.stroke(); });
      });
    },
    deadtree: function (th, v) {
      return prop(th, 3.5, 4.5, 40, function (ctx, W, H, u) {
        ctx.strokeStyle = '#6b4a3a'; ctx.lineCap = 'round';
        function br(x, y, a, len, w, d) {
          var ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
          ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
          if (d > 0) { br(ex, ey, a - 0.5, len * 0.65, w * 0.65, d - 1); br(ex, ey, a + 0.45, len * 0.6, w * 0.6, d - 1); }
        }
        br(W / 2, H, -Math.PI / 2, 1.8 * u, 0.3 * u, 3);
      });
    },
    bigrock: function (th, v) {
      return prop(th, 16, 10, 14, function (ctx, W, H, u) {
        P.rpoly(ctx, [[0, H], [1.5 * u, H - 8.5 * u], [3 * u, H - 9.2 * u], [11 * u, H - 9.4 * u], [12.5 * u, H - 8 * u], [16 * u, H]], 0.4 * u);
        ctx.fillStyle = P.lin(ctx, 0, H - 9.4 * u, 0, H, [[0, '#d26a54'], [0.5, '#a8484a'], [1, '#6b2c40']]); ctx.fill();
        ctx.strokeStyle = 'rgba(70,20,40,0.35)'; ctx.lineWidth = 0.15 * u;
        [3, 5.5, 7.5].forEach(function (y) { ctx.beginPath(); ctx.moveTo(1 * u, H - y * u); ctx.lineTo(14.5 * u, H - y * u + 0.3 * u); ctx.stroke(); });
      });
    },
    sign: function (th, v) {
      var icon = th.key === 'snow' ? '❄️' : th.key === 'desert' ? '🐪' : '⚠️';
      return prop(th, 1.6, 2.6, 56, function (ctx, W, H, u) {
        ctx.fillStyle = '#8a8f99'; ctx.fillRect(W / 2 - 0.05 * u, H - 1.8 * u, 0.1 * u, 1.8 * u);
        ctx.save(); ctx.translate(W / 2, H - 1.9 * u); ctx.rotate(Math.PI / 4);
        P.rrect(ctx, -0.5 * u, -0.5 * u, 1 * u, 1 * u, 0.1 * u); ctx.fillStyle = '#ffd400'; ctx.fill();
        ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 0.06 * u; ctx.stroke(); ctx.restore();
        txt(ctx, icon, W / 2, H - 1.87 * u, 0.55 * u, '#000');
      });
    },
    scrub: function (th, v) {
      var rnd = P.rand(500 + v);
      return prop(th, 1.8, 1, 52, function (ctx, W, H, u) {
        ctx.strokeStyle = '#a07a3a'; ctx.lineWidth = 0.04 * u;
        for (var i = 0; i < 18; i++) { var a = -Math.PI * (0.1 + rnd() * 0.8); ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.lineTo(W / 2 + Math.cos(a) * 0.9 * u, H + Math.sin(a) * 0.9 * u); ctx.stroke(); }
        P.blob(ctx, W / 2, H - 0.35 * u, 0.6 * u, 6, rnd, 'rgba(140,130,60,0.85)');
      });
    },

    /* snow */
    pine: function (th, v) {
      var tall = v % 2 ? 7 : 8.5;
      return prop(th, 4, 9, 34, function (ctx, W, H, u) {
        ctx.fillStyle = '#5a3a26'; ctx.fillRect(W / 2 - 0.2 * u, H - 1.2 * u, 0.4 * u, 1.2 * u);
        for (var i = 0; i < 4; i++) {
          var y0 = H - (0.9 + i * (tall - 1.4) / 4.6) * u, w = (1.9 - i * 0.38) * u, top = y0 - (2.4 - i * 0.2) * u;
          ctx.fillStyle = ['#1f5a3e', '#246647', '#2a7350', '#2f7d58'][i];
          ctx.beginPath(); ctx.moveTo(W / 2 - w, y0); ctx.lineTo(W / 2, top); ctx.lineTo(W / 2 + w, y0); ctx.closePath(); ctx.fill();
          // snow on the tier
          ctx.fillStyle = '#f4f9ff';
          ctx.beginPath(); ctx.moveTo(W / 2 - w * 0.55, y0 - (y0 - top) * 0.45); ctx.lineTo(W / 2, top); ctx.lineTo(W / 2 + w * 0.55, y0 - (y0 - top) * 0.45);
          for (var k = 4; k >= 0; k--) ctx.quadraticCurveTo(W / 2 - w * 0.55 + w * 1.1 * (k + 0.5) / 5, y0 - (y0 - top) * 0.32, W / 2 - w * 0.55 + w * 1.1 * k / 5, y0 - (y0 - top) * 0.45);
          ctx.fill();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(W / 2 - w, y0 - 0.12 * u, w * 2, 0.14 * u);
        }
      });
    },
    pine2: function (th, v) { return MAKERS.pine(th, v + 1); },
    snowman: function (th, v) {
      return prop(th, 1.6, 2.2, 60, function (ctx, W, H, u) {
        [[0.62, 0.55], [0.45, 1.35], [0.32, 1.9]].forEach(function (b) {
          ctx.fillStyle = P.rad(ctx, W / 2 - b[0] * 0.3 * u, H - b[1] * u - b[0] * 0.3 * u, 0, b[0] * u, [[0, '#ffffff'], [1, '#c9d8ec']]);
          P.circle(ctx, W / 2, H - b[1] * u, b[0] * u); ctx.fill();
        });
        P.circle(ctx, W / 2 - 0.1 * u, H - 1.95 * u, 0.04 * u, '#222'); P.circle(ctx, W / 2 + 0.1 * u, H - 1.95 * u, 0.04 * u, '#222');
        ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(W / 2, H - 1.88 * u); ctx.lineTo(W / 2 + 0.3 * u, H - 1.84 * u); ctx.lineTo(W / 2, H - 1.8 * u); ctx.fill();
        ctx.fillStyle = '#e8322f'; ctx.fillRect(W / 2 - 0.36 * u, H - 1.68 * u, 0.72 * u, 0.12 * u); ctx.fillRect(W / 2 + 0.15 * u, H - 1.68 * u, 0.14 * u, 0.4 * u);
        ctx.fillStyle = '#222'; ctx.fillRect(W / 2 - 0.25 * u, H - 2.45 * u, 0.5 * u, 0.3 * u); ctx.fillRect(W / 2 - 0.35 * u, H - 2.18 * u, 0.7 * u, 0.06 * u);
        [1.2, 1.45].forEach(function (y) { P.circle(ctx, W / 2, H - y * u, 0.05 * u, '#222'); });
      });
    },
    cabin: function (th, v) {
      return prop(th, 8, 6.5, 30, function (ctx, W, H, u) {
        ctx.fillStyle = '#8a5530'; ctx.fillRect(0.8 * u, H - 3.6 * u, 6.4 * u, 3.6 * u);
        ctx.strokeStyle = '#6a3e22'; ctx.lineWidth = 0.08 * u;
        for (var y = 0.4; y < 3.6; y += 0.45) { ctx.beginPath(); ctx.moveTo(0.8 * u, H - y * u); ctx.lineTo(7.2 * u, H - y * u); ctx.stroke(); }
        ctx.fillStyle = '#5a6a80';
        ctx.beginPath(); ctx.moveTo(0.2 * u, H - 3.4 * u); ctx.lineTo(4 * u, H - 6 * u); ctx.lineTo(7.8 * u, H - 3.4 * u); ctx.fill();
        ctx.fillStyle = '#f6faff';
        ctx.beginPath(); ctx.moveTo(0.1 * u, H - 3.3 * u); ctx.lineTo(4 * u, H - 6.2 * u); ctx.lineTo(7.9 * u, H - 3.3 * u); ctx.lineTo(7.4 * u, H - 3.1 * u);
        ctx.quadraticCurveTo(4 * u, H - 5.2 * u, 0.6 * u, H - 3.1 * u); ctx.fill();
        ctx.fillStyle = '#6b4a3a'; ctx.fillRect(5.6 * u, H - 6 * u, 0.6 * u, 1.4 * u);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(5.5 * u, H - 6.2 * u, 0.8 * u, 0.25 * u);
        ctx.fillStyle = '#4a2c18'; ctx.fillRect(3.4 * u, H - 2.2 * u, 1.2 * u, 2.2 * u);
      }, function (ctx, W, H, u) {
        [[1.4, 2.4], [5.4, 2.4]].forEach(function (p) {
          ctx.fillStyle = '#ffcf6a'; ctx.fillRect(p[0] * u, H - p[1] * u, 1.2 * u, 1 * u);
          ctx.fillStyle = '#6a3e22'; ctx.fillRect(p[0] * u + 0.55 * u, H - p[1] * u, 0.1 * u, 1 * u);
        });
      });
    },
    snowrock: function (th, v) {
      return prop(th, 2.6, 1.8, 48, function (ctx, W, H, u) {
        P.rpoly(ctx, [[0.1 * u, H], [0.4 * u, H - 1.1 * u], [1.3 * u, H - 1.6 * u], [2.2 * u, H - 1.2 * u], [2.5 * u, H]], 0.3 * u);
        ctx.fillStyle = P.lin(ctx, 0, H - 1.6 * u, 0, H, [[0, '#8a96a8'], [1, '#55606f']]); ctx.fill();
        ctx.fillStyle = '#f6faff';
        ctx.beginPath(); ctx.moveTo(0.35 * u, H - 1.05 * u); ctx.quadraticCurveTo(1.3 * u, H - 1.9 * u, 2.25 * u, H - 1.15 * u);
        ctx.quadraticCurveTo(1.3 * u, H - 1.25 * u, 0.35 * u, H - 1.05 * u); ctx.fill();
        ctx.fillStyle = '#eef4fc'; P.ellipse(ctx, W / 2, H - 0.05 * u, 1.25 * u, 0.18 * u); ctx.fill();
      });
    },
    pole: function (th) {
      return prop(th, 0.4, 2.4, 60, function (ctx, W, H, u) {
        for (var i = 0; i < 6; i++) { ctx.fillStyle = i % 2 ? '#ffffff' : '#ff6a1a'; ctx.fillRect(W / 2 - 0.06 * u, H - (i + 1) * 0.4 * u, 0.12 * u, 0.4 * u); }
      });
    },

    /* jungle */
    palm: function (th, v) {
      var rnd = P.rand(600 + v);
      return prop(th, 6, 9, 32, function (ctx, W, H, u) {
        var lean = (v % 2 ? 1 : -1) * 0.9 * u, tx = W / 2 + lean, ty = H - 7.2 * u;
        ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 0.4 * u;
        ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.quadraticCurveTo(W / 2 - lean * 0.2, H - 4 * u, tx, ty); ctx.stroke();
        ctx.strokeStyle = 'rgba(60,40,20,0.4)'; ctx.lineWidth = 0.06 * u;
        for (var i = 1; i < 14; i++) { var t = i / 14, x = W / 2 + (tx - W / 2) * t * t, y = H - (H - ty) * t; ctx.beginPath(); ctx.moveTo(x - 0.2 * u, y); ctx.lineTo(x + 0.2 * u, y - 0.08 * u); ctx.stroke(); }
        palmFronds(ctx, tx, ty, u, rnd, '#2f8f3a', '#46a84a');
        P.circle(ctx, tx - 0.2 * u, ty + 0.25 * u, 0.22 * u, '#6b4a2a'); P.circle(ctx, tx + 0.2 * u, ty + 0.3 * u, 0.22 * u, '#7a5530');
      });
    },
    jtree: function (th, v) {
      var rnd = P.rand(700 + v);
      return prop(th, 9, 11, 26, function (ctx, W, H, u) {
        ctx.fillStyle = '#6b5236';
        ctx.beginPath(); ctx.moveTo(W / 2 - 1.6 * u, H); ctx.quadraticCurveTo(W / 2 - 0.4 * u, H - 1 * u, W / 2 - 0.4 * u, H - 6 * u);
        ctx.lineTo(W / 2 + 0.4 * u, H - 6 * u); ctx.quadraticCurveTo(W / 2 + 0.4 * u, H - 1 * u, W / 2 + 1.6 * u, H); ctx.fill();
        foliage(ctx, W / 2 - 1.8 * u, H - 7.4 * u, 2.4 * u, rnd, '#1d5e2c', '#2f7d3a', '#5fae4a');
        foliage(ctx, W / 2 + 1.8 * u, H - 7.6 * u, 2.4 * u, rnd, '#1d5e2c', '#2f7d3a', '#5fae4a');
        foliage(ctx, W / 2, H - 8.6 * u, 2.6 * u, rnd, '#1f6630', '#348a40', '#74c255');
      });
    },
    fern: function (th, v) {
      return prop(th, 2.8, 1.8, 50, function (ctx, W, H, u) {
        for (var i = 0; i < 9; i++) {
          var a = -Math.PI + (i + 0.5) * Math.PI / 9;
          ctx.save(); ctx.translate(W / 2, H); ctx.rotate(a + Math.PI / 2);
          ctx.fillStyle = i % 2 ? '#3a9a3e' : '#2a7d32';
          ctx.beginPath(); ctx.ellipse(0, -0.8 * u, 0.22 * u, 0.85 * u, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(200,255,170,0.5)'; ctx.lineWidth = 0.03 * u;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -1.5 * u); ctx.stroke();
          ctx.restore();
        }
      });
    },
    banana: function (th, v) {
      return prop(th, 3.6, 4, 40, function (ctx, W, H, u) {
        ctx.fillStyle = '#6f8f3a'; ctx.fillRect(W / 2 - 0.15 * u, H - 2.2 * u, 0.3 * u, 2.2 * u);
        [[-2.4, '#3fa548'], [-1.5, '#2f8f3a'], [-0.6, '#49b04e'], [0.5, '#2f8f3a'], [1.4, '#3fa548'], [2.2, '#2a7d32']].forEach(function (l) {
          ctx.save(); ctx.translate(W / 2, H - 2.2 * u); ctx.rotate(l[0] * 0.5);
          ctx.fillStyle = l[1]; ctx.beginPath(); ctx.ellipse(0, -1 * u, 0.42 * u, 1.15 * u, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(220,255,180,0.55)'; ctx.lineWidth = 0.04 * u; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -2.1 * u); ctx.stroke();
          ctx.restore();
        });
        ctx.fillStyle = '#ffd84a';
        [[-0.25, 2.0], [0, 1.9], [0.25, 2.0]].forEach(function (b) { ctx.beginPath(); ctx.ellipse(W / 2 + b[0] * u, H - b[1] * u, 0.08 * u, 0.25 * u, b[0], 0, 7); ctx.fill(); });
      });
    },
    flowers: function (th, v) {
      var rnd = P.rand(800 + v), cols = ['#ff4f8b', '#ffb02e', '#ff6bd5', '#ffe14d'];
      return prop(th, 2, 1, 56, function (ctx, W, H, u) {
        P.blob(ctx, W / 2, H - 0.3 * u, 0.85 * u, 7, rnd, '#2a7d32');
        for (var i = 0; i < 6; i++) {
          var x = W / 2 + (rnd() - 0.5) * 1.5 * u, y = H - (0.35 + rnd() * 0.5) * u, c = cols[(i + v) % 4];
          for (var k = 0; k < 5; k++) { var a = k * 1.256; P.circle(ctx, x + Math.cos(a) * 0.1 * u, y + Math.sin(a) * 0.1 * u, 0.09 * u, c); }
          P.circle(ctx, x, y, 0.05 * u, '#fff3a0');
        }
      });
    },
    totem: function (th, v) {
      return prop(th, 2, 3, 48, function (ctx, W, H, u) {
        P.rrect(ctx, W / 2 - 0.8 * u, H - 2.8 * u, 1.6 * u, 2.8 * u, 0.4 * u);
        ctx.fillStyle = P.lin(ctx, 0, H - 2.8 * u, 0, H, [[0, '#9aa38a'], [1, '#5f6a55']]); ctx.fill();
        ctx.fillStyle = '#4a5440'; ctx.fillRect(W / 2 - 0.55 * u, H - 2.1 * u, 0.4 * u, 0.22 * u); ctx.fillRect(W / 2 + 0.15 * u, H - 2.1 * u, 0.4 * u, 0.22 * u);
        ctx.fillRect(W / 2 - 0.12 * u, H - 1.8 * u, 0.24 * u, 0.6 * u); ctx.fillRect(W / 2 - 0.45 * u, H - 1.0 * u, 0.9 * u, 0.2 * u);
        P.blob(ctx, W / 2 - 0.4 * u, H - 2.7 * u, 0.6 * u, 5, P.rand(4), '#3f8f3a');
        P.blob(ctx, W / 2 + 0.6 * u, H - 0.3 * u, 0.4 * u, 4, P.rand(5), '#3f8f3a');
      });
    },
    vinetree: function (th, v) {
      var rnd = P.rand(900 + v);
      return prop(th, 7, 13, 24, function (ctx, W, H, u) {
        trunk(ctx, W / 2, H, W / 2, H - 9 * u, 0.9 * u, 0.5 * u, '#5a4632');
        foliage(ctx, W / 2, H - 10.3 * u, 3.2 * u, rnd, '#1a5228', '#256b33', '#4f9a45');
        ctx.strokeStyle = '#2f7a35'; ctx.lineWidth = 0.08 * u;
        for (var i = 0; i < 7; i++) { var x = W / 2 + (rnd() - 0.5) * 5 * u; ctx.beginPath(); ctx.moveTo(x, H - 9 * u); ctx.quadraticCurveTo(x + 0.3 * u, H - 6 * u, x - 0.1 * u, H - (3 + rnd() * 3) * u); ctx.stroke(); }
      });
    },

    /* night */
    neon: function (th, v) {
      var signs = [['DINER', '#ff4fc3'], ['ARCADE', '#3ff0ff'], ['★ STAR ★', '#ffe14d'], ['PIZZA', '#7dff6a'], ['CARS', '#ff8a3d']];
      var s = signs[v % signs.length];
      var spr = prop(th, 6, 7, 32, function (ctx, W, H, u) {
        ctx.fillStyle = '#2a2d3a'; ctx.fillRect(W / 2 - 0.15 * u, H - 3.6 * u, 0.3 * u, 3.6 * u);
        P.rrect(ctx, 0.3 * u, H - 6.8 * u, 5.4 * u, 3.3 * u, 0.4 * u); ctx.fillStyle = '#141626'; ctx.fill();
      }, function (ctx, W, H, u) {
        ctx.strokeStyle = P.rgba(s[1], 0.35); ctx.lineWidth = 0.45 * u;
        P.rrect(ctx, 0.5 * u, H - 6.6 * u, 5 * u, 2.9 * u, 0.3 * u); ctx.stroke();
        ctx.strokeStyle = s[1]; ctx.lineWidth = 0.12 * u; ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.04 * u; ctx.stroke();
        ctx.font = '900 ' + (s[0].length > 6 ? 0.85 : 1.05) * u + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 0.3 * u; ctx.strokeStyle = P.rgba(s[1], 0.35); ctx.strokeText(s[0], W / 2, H - 5.15 * u);
        ctx.fillStyle = s[1]; ctx.fillText(s[0], W / 2, H - 5.15 * u);
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '900 ' + (s[0].length > 6 ? 0.8 : 1) * u + 'px system-ui, sans-serif';
        ctx.globalAlpha = 0.5; ctx.fillText(s[0], W / 2, H - 5.15 * u); ctx.globalAlpha = 1;
      });
      spr.refl = s[1];
      return spr;
    },
    litbuilding: function (th, v) {
      var rnd = P.rand(1000 + v), lit = ['#ffcf5a', '#5af0ff', '#ff7ad9'][v % 3], spr2 = {};
      var spr = prop(th, 11, 24, 16, function (ctx, W, H, u) {
        var h = (14 + (v % 4) * 2.5) * u;
        ctx.fillStyle = '#1b1838'; ctx.fillRect(0.5 * u, H - h, 10 * u, h);
        ctx.fillStyle = '#2a2550'; ctx.fillRect(0.5 * u, H - h, 10 * u, 0.4 * u);
        spr2.top = h / u;
      }, function (ctx, W, H, u) {
        var h = spr2.top * u;
        windowsGrid(ctx, 1 * u, H - h + 1 * u, 9 * u, h - 2 * u, 6, Math.floor(spr2.top / 1.5), 'rgba(40,40,80,0.6)', rnd, 0.42, lit);
        ctx.fillStyle = lit; ctx.fillRect(0.5 * u, H - h - 0.1 * u, 10 * u, 0.15 * u);
      });
      spr.refl = lit;
      return spr;
    },
    nlamp: function (th) {
      var spr = prop(th, 3, 7.5, 40, function (ctx, W, H, u) {
        var x = 0.4 * u;
        ctx.fillStyle = '#2a2f3c'; ctx.fillRect(x - 0.1 * u, H - 7 * u, 0.2 * u, 7 * u);
        ctx.strokeStyle = '#2a2f3c'; ctx.lineWidth = 0.16 * u;
        ctx.beginPath(); ctx.moveTo(x, H - 6.9 * u); ctx.quadraticCurveTo(x + 0.4 * u, H - 7.4 * u, x + 2.2 * u, H - 7.1 * u); ctx.stroke();
        ctx.fillStyle = '#1a1e28'; P.rrect(ctx, x + 1.7 * u, H - 7.25 * u, 1 * u, 0.3 * u, 0.12 * u); ctx.fill();
      }, function (ctx, W, H, u) {
        var x = 0.4 * u;
        ctx.fillStyle = P.rad(ctx, x + 2.2 * u, H - 6.9 * u, 0, 0.9 * u, [[0, 'rgba(255,230,160,0.9)'], [1, 'rgba(255,200,120,0)']]);
        ctx.fillRect(x + 1.3 * u, H - 7.8 * u, 1.8 * u, 1.8 * u);
        ctx.fillStyle = '#fff4cc'; ctx.fillRect(x + 1.85 * u, H - 6.97 * u, 0.7 * u, 0.1 * u);
      });
      spr.refl = '#ffd98a'; spr.reflX = 2.2 / 3;
      return spr;
    },
    npalm: function (th, v) {
      var rnd = P.rand(1100 + v), rim = v % 2 ? '#ff4fc3' : '#3ff0ff';
      return prop(th, 6, 9, 32, function (ctx, W, H, u) {
        var lean = (v % 2 ? 1 : -1) * 0.8 * u, tx = W / 2 + lean, ty = H - 7.2 * u;
        ctx.strokeStyle = '#0c0a1c'; ctx.lineWidth = 0.4 * u;
        ctx.beginPath(); ctx.moveTo(W / 2, H); ctx.quadraticCurveTo(W / 2 - lean * 0.2, H - 4 * u, tx, ty); ctx.stroke();
        palmFronds(ctx, tx, ty, u, rnd, '#0e0c22', '#141030');
      }, function (ctx, W, H, u) {
        var lean = (v % 2 ? 1 : -1) * 0.8 * u, tx = W / 2 + lean, ty = H - 7.2 * u;
        ctx.strokeStyle = P.rgba(rim, 0.7); ctx.lineWidth = 0.07 * u;
        ctx.beginPath(); ctx.moveTo(W / 2 + 0.2 * u, H); ctx.quadraticCurveTo(W / 2 - lean * 0.2 + 0.2 * u, H - 4 * u, tx + 0.2 * u, ty); ctx.stroke();
      });
    }
  };

  /* ------------------------------------------------------------------ items */

  var ITEM_PPM = 64;

  function flat(wm, lm, draw) {
    // flat road decals are baked top-down: width = x metres, height = z metres (far edge at the top)
    return P.bake(wm, lm, ITEM_PPM, draw, 0.5, 0.5);
  }

  var ITEMS = {
    pothole: function () {
      return flat(2.2, 2.2, function (ctx, W, H, u) {
        var rnd = P.rand(77), pts = [];
        for (var i = 0; i < 12; i++) { var a = i / 12 * Math.PI * 2, r = (0.8 + rnd() * 0.22) * u; pts.push([W / 2 + Math.cos(a) * r, H / 2 + Math.sin(a) * r]); }
        P.rpoly(ctx, pts, 0.15 * u); ctx.fillStyle = '#3d3a3a'; ctx.fill();
        ctx.save(); ctx.translate(0, 0.1 * u);
        P.rpoly(ctx, pts.map(function (p) { return [W / 2 + (p[0] - W / 2) * 0.82, H / 2 + (p[1] - H / 2) * 0.82]; }), 0.12 * u);
        ctx.fillStyle = P.rad(ctx, W / 2, H / 2 + 0.2 * u, 0, 0.8 * u, [[0, '#0d0b0b'], [1, '#262222']]); ctx.fill(); ctx.restore();
        ctx.strokeStyle = 'rgba(30,25,25,0.8)'; ctx.lineWidth = 0.05 * u;
        for (var k = 0; k < 6; k++) { var a2 = rnd() * 7, r2 = 0.85 * u; ctx.beginPath(); ctx.moveTo(W / 2 + Math.cos(a2) * r2, H / 2 + Math.sin(a2) * r2); ctx.lineTo(W / 2 + Math.cos(a2 + 0.2) * (r2 + 0.25 * u), H / 2 + Math.sin(a2 + 0.2) * (r2 + 0.25 * u)); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(160,150,140,0.5)'; ctx.lineWidth = 0.06 * u;
        ctx.beginPath(); ctx.arc(W / 2, H / 2, 0.82 * u, Math.PI * 1.05, Math.PI * 1.9); ctx.stroke();
      });
    },
    oil: function () {
      return flat(3, 5.4, function (ctx, W, H, u) {
        var rnd = P.rand(31);
        ctx.fillStyle = '#0b0a10';
        P.ellipse(ctx, W / 2, H / 2, 1.25 * u, 2.4 * u); ctx.fill();
        for (var i = 0; i < 6; i++) P.circle(ctx, W / 2 + (rnd() - 0.5) * 2.2 * u, H / 2 + (rnd() - 0.5) * 4.4 * u, (0.25 + rnd() * 0.3) * u, '#0b0a10');
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = P.lin(ctx, 0, 0, W, H, [[0.2, 'rgba(255,60,200,0)'], [0.35, 'rgba(255,60,200,0.35)'], [0.45, 'rgba(60,200,255,0.35)'], [0.55, 'rgba(120,255,120,0.3)'], [0.7, 'rgba(255,220,60,0)']]);
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'source-over';
        P.ellipse(ctx, W / 2 - 0.4 * u, H / 2 - 1.2 * u, 0.35 * u, 0.7 * u, 'rgba(255,255,255,0.22)');
      });
    },
    ice: function () {
      return flat(3, 5.4, function (ctx, W, H, u) {
        ctx.fillStyle = P.lin(ctx, 0, 0, W, H, [[0, '#d8f4ff'], [0.5, '#8fd4f5'], [1, '#bfe9ff']]);
        P.rpoly(ctx, [[W * 0.15, H * 0.1], [W * 0.7, H * 0.02], [W * 0.95, H * 0.4], [W * 0.85, H * 0.92], [W * 0.3, H * 0.98], [W * 0.05, H * 0.6]], 0.4 * u);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 0.07 * u;
        [[0.3, 0.2, 0.6, 0.45], [0.5, 0.55, 0.8, 0.7], [0.2, 0.7, 0.45, 0.85]].forEach(function (l) { ctx.beginPath(); ctx.moveTo(W * l[0], H * l[1]); ctx.lineTo(W * l[2], H * l[3]); ctx.stroke(); });
        ctx.strokeStyle = 'rgba(80,160,220,0.6)'; ctx.lineWidth = 0.05 * u;
        P.rpoly(ctx, [[W * 0.15, H * 0.1], [W * 0.7, H * 0.02], [W * 0.95, H * 0.4], [W * 0.85, H * 0.92], [W * 0.3, H * 0.98], [W * 0.05, H * 0.6]], 0.4 * u); ctx.stroke();
      });
    },
    puddle: function () {
      return flat(3.2, 6.4, function (ctx, W, H, u) {
        P.ellipse(ctx, W / 2, H / 2, 1.45 * u, 2.95 * u, 'rgba(40,70,110,0.55)');
        ctx.fillStyle = P.lin(ctx, 0, 0, 0, H, [[0, 'rgba(170,220,255,0.85)'], [0.5, 'rgba(80,150,220,0.8)'], [1, 'rgba(60,120,200,0.8)']]);
        P.ellipse(ctx, W / 2, H / 2, 1.3 * u, 2.75 * u); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.08 * u;
        ctx.beginPath(); ctx.ellipse(W / 2 - 0.3 * u, H / 2 - 0.6 * u, 0.5 * u, 1.2 * u, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(W / 2 + 0.2 * u, H / 2 + 0.8 * u, 0.6 * u, 1 * u, 0, -0.4, 0.4); ctx.stroke();
      });
    },
    mud: function () {
      return flat(3.2, 6.4, function (ctx, W, H, u) {
        var rnd = P.rand(41);
        P.ellipse(ctx, W / 2, H / 2, 1.45 * u, 2.95 * u, '#4a2e18');
        ctx.fillStyle = P.lin(ctx, 0, 0, 0, H, [[0, '#8a5a34'], [1, '#5e3a1e']]);
        P.ellipse(ctx, W / 2, H / 2, 1.25 * u, 2.7 * u); ctx.fill();
        for (var i = 0; i < 9; i++) P.ellipse(ctx, W / 2 + (rnd() - 0.5) * 2 * u, H / 2 + (rnd() - 0.5) * 4.6 * u, 0.2 * u, 0.3 * u, 'rgba(255,220,170,0.25)');
      });
    },
    shadow: function () {
      return flat(2.4, 2.4, function (ctx, W, H, u) {
        ctx.fillStyle = P.rad(ctx, W / 2, H / 2, 0, W / 2, [[0, 'rgba(0,0,0,0.7)'], [0.7, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]);
        ctx.fillRect(0, 0, W, H);
      });
    },
    cone: function () {
      return P.bake(0.8, 1.0, ITEM_PPM, function (ctx, W, H, u) {
        ctx.fillStyle = '#e85a12'; P.rrect(ctx, 0.02 * u, H - 0.1 * u, 0.76 * u, 0.1 * u, 0.03 * u); ctx.fill();
        ctx.beginPath(); ctx.moveTo(0.14 * u, H - 0.1 * u); ctx.lineTo(0.34 * u, H - 0.95 * u); ctx.lineTo(0.46 * u, H - 0.95 * u); ctx.lineTo(0.66 * u, H - 0.1 * u); ctx.closePath();
        ctx.fillStyle = P.lin(ctx, 0.14 * u, 0, 0.66 * u, 0, [[0, '#ffb067'], [0.4, '#ff7a1a'], [1, '#c94a08']]); ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, H - 0.42 * u, W, 0.13 * u); ctx.fillRect(0, H - 0.7 * u, W, 0.1 * u);
        ctx.restore();
      });
    },
    rock: function (kind) {
      var c = kind === 'snow' ? ['#a8b3c4', '#5d6878'] : kind === 'jungle' ? ['#8a8f7a', '#4c5240'] : kind === 'desert' ? ['#d0805e', '#7a3e2c'] : ['#a09a94', '#5e5852'];
      return P.bake(2.1, 1.8, ITEM_PPM, function (ctx, W, H, u) {
        P.rpoly(ctx, [[0.05 * u, H - 0.05 * u], [0.2 * u, H - 1.0 * u], [0.8 * u, H - 1.7 * u], [1.6 * u, H - 1.5 * u], [2.05 * u, H - 0.7 * u], [1.95 * u, H - 0.02 * u]], 0.25 * u);
        ctx.fillStyle = P.rad(ctx, 0.7 * u, H - 1.3 * u, 0.1 * u, 1.8 * u, [[0, P.shade(c[0], 0.3)], [0.5, c[0]], [1, c[1]]]); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.05 * u;
        ctx.beginPath(); ctx.moveTo(0.8 * u, H - 1.6 * u); ctx.lineTo(1.1 * u, H - 0.9 * u); ctx.lineTo(1.7 * u, H - 0.7 * u); ctx.stroke();
        if (kind === 'snow') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0.3 * u, H - 1.0 * u); ctx.quadraticCurveTo(0.9 * u, H - 1.95 * u, 1.75 * u, H - 1.3 * u); ctx.quadraticCurveTo(1.0 * u, H - 1.35 * u, 0.3 * u, H - 1.0 * u); ctx.fill(); }
        if (kind === 'jungle') P.blob(ctx, 0.9 * u, H - 1.5 * u, 0.5 * u, 5, P.rand(3), 'rgba(70,140,50,0.85)');
      });
    },
    ramp: function () {
      return P.bake(3, 1.3, ITEM_PPM, function (ctx, W, H, u) {
        ctx.fillStyle = '#2b2b30';
        ctx.beginPath(); ctx.moveTo(0.05 * u, H); ctx.lineTo(0.3 * u, H - 1.2 * u); ctx.lineTo(2.7 * u, H - 1.2 * u); ctx.lineTo(2.95 * u, H); ctx.fill();
        ctx.save();
        ctx.beginPath(); ctx.moveTo(0.15 * u, H - 0.05 * u); ctx.lineTo(0.38 * u, H - 1.12 * u); ctx.lineTo(2.62 * u, H - 1.12 * u); ctx.lineTo(2.85 * u, H - 0.05 * u); ctx.clip();
        ctx.fillStyle = '#ffd400'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#1b1b1b';
        for (var x = -1; x < 3.5; x += 0.6) { ctx.beginPath(); ctx.moveTo(x * u, H); ctx.lineTo((x + 0.3) * u, H); ctx.lineTo((x + 0.9) * u, H - 1.2 * u); ctx.lineTo((x + 0.6) * u, H - 1.2 * u); ctx.fill(); }
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(1.5 * u, H - 1.05 * u); ctx.lineTo(1.85 * u, H - 0.65 * u); ctx.lineTo(1.65 * u, H - 0.65 * u); ctx.lineTo(1.65 * u, H - 0.25 * u);
        ctx.lineTo(1.35 * u, H - 0.25 * u); ctx.lineTo(1.35 * u, H - 0.65 * u); ctx.lineTo(1.15 * u, H - 0.65 * u); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 0.04 * u; ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(0.3 * u, H - 1.2 * u, 2.4 * u, 0.06 * u);
      });
    },
    coin: function (frame) {
      // spinning: 8 frames, the coin squashes horizontally
      var sq = Math.abs(Math.cos(frame / 8 * Math.PI));
      return P.bake(1.2, 1.2, ITEM_PPM, function (ctx, W, H, u) {
        var rx = Math.max(0.07, 0.5 * sq) * u, ry = 0.5 * u, cx = W / 2, cy = H / 2;
        P.ellipse(ctx, cx + 0.04 * u * (frame < 4 ? 1 : -1), cy, rx + 0.06 * u * (1 - sq), ry, '#a86b00');
        ctx.fillStyle = P.lin(ctx, cx - rx, cy - ry, cx + rx, cy + ry, [[0, '#fff6a0'], [0.4, '#ffd23a'], [1, '#e09a00']]);
        P.ellipse(ctx, cx, cy, rx, ry); ctx.fill();
        ctx.strokeStyle = '#c47f00'; ctx.lineWidth = 0.05 * u; P.ellipse(ctx, cx, cy, rx * 0.78, ry * 0.78); ctx.stroke();
        if (sq > 0.3) {
          ctx.save(); ctx.translate(cx, cy); ctx.scale(sq, 1);
          ctx.fillStyle = '#fff3b0'; P.star(ctx, 0, 0.02 * u, 0.24 * u, 0.1 * u); ctx.fill();
          ctx.strokeStyle = '#c47f00'; ctx.lineWidth = 0.03 * u; ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; P.ellipse(ctx, cx - rx * 0.4, cy - ry * 0.45, rx * 0.22, ry * 0.18); ctx.fill();
      }, 0.5, 0.5);
    },
    fuel: function () {
      return P.bake(1.3, 1.4, ITEM_PPM, function (ctx, W, H, u) {
        ctx.fillStyle = P.lin(ctx, 0.15 * u, 0, 1.15 * u, 0, [[0, '#ff7a6a'], [0.45, '#e8322f'], [1, '#9a1414']]);
        P.rrect(ctx, 0.15 * u, 0.3 * u, 1.0 * u, 1.05 * u, 0.12 * u); ctx.fill();
        ctx.strokeStyle = '#7a0e0e'; ctx.lineWidth = 0.05 * u; ctx.stroke();
        ctx.fillStyle = '#2b2b30'; ctx.fillRect(0.85 * u, 0.12 * u, 0.2 * u, 0.22 * u);
        ctx.strokeStyle = '#c21e1e'; ctx.lineWidth = 0.1 * u; ctx.beginPath(); ctx.moveTo(0.3 * u, 0.32 * u); ctx.lineTo(0.3 * u, 0.15 * u); ctx.lineTo(0.7 * u, 0.15 * u); ctx.lineTo(0.7 * u, 0.32 * u); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.06 * u;
        ctx.beginPath(); ctx.moveTo(0.3 * u, 0.5 * u); ctx.lineTo(1.0 * u, 1.2 * u); ctx.moveTo(1.0 * u, 0.5 * u); ctx.lineTo(0.3 * u, 1.2 * u); ctx.stroke();
        P.circle(ctx, 0.65 * u, 0.85 * u, 0.25 * u, '#ffe14d');
        txt(ctx, '⛽', 0.65 * u, 0.86 * u, 0.3 * u, '#000');
      });
    },
    wrench: function () {
      return P.bake(1.4, 1.4, ITEM_PPM, function (ctx, W, H, u) {
        ctx.fillStyle = P.rad(ctx, W / 2, H / 2, 0, 0.7 * u, [[0, 'rgba(120,220,255,0.9)'], [0.7, 'rgba(60,150,255,0.5)'], [1, 'rgba(60,150,255,0)']]);
        ctx.fillRect(0, 0, W, H);
        P.circle(ctx, W / 2, H / 2, 0.5 * u, '#2f7be0');
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.05 * u; ctx.stroke();
        ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.8);
        ctx.fillStyle = '#e6ebf2'; ctx.fillRect(-0.07 * u, -0.25 * u, 0.14 * u, 0.55 * u);
        ctx.beginPath(); ctx.arc(0, -0.3 * u, 0.17 * u, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2f7be0'; ctx.fillRect(-0.06 * u, -0.5 * u, 0.12 * u, 0.2 * u);
        ctx.fillStyle = '#e6ebf2'; ctx.beginPath(); ctx.arc(0, 0.33 * u, 0.12 * u, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }, 0.5, 0.5);
    },
    barrier: function () {
      return P.bake(1.4, 1.3, ITEM_PPM, function (ctx, W, H, u) {
        ctx.fillStyle = '#d6d9de'; ctx.fillRect(0.15 * u, H - 0.8 * u, 0.1 * u, 0.8 * u); ctx.fillRect(1.15 * u, H - 0.8 * u, 0.1 * u, 0.8 * u);
        ctx.save(); P.rrect(ctx, 0.02 * u, H - 0.95 * u, 1.36 * u, 0.42 * u, 0.06 * u); ctx.clip();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#e8322f';
        for (var x = -0.6; x < 1.6; x += 0.36) { ctx.beginPath(); ctx.moveTo(x * u, H - 0.5 * u); ctx.lineTo((x + 0.18) * u, H - 0.5 * u); ctx.lineTo((x + 0.6) * u, H - 1 * u); ctx.lineTo((x + 0.42) * u, H - 1 * u); ctx.fill(); }
        ctx.restore();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.03 * u; P.rrect(ctx, 0.02 * u, H - 0.95 * u, 1.36 * u, 0.42 * u, 0.06 * u); ctx.stroke();
        ctx.fillStyle = '#2b2b30'; ctx.fillRect(0.6 * u, H - 1.12 * u, 0.2 * u, 0.18 * u);
        P.circle(ctx, 0.7 * u, H - 1.18 * u, 0.1 * u, '#ffb02e');
      });
    },
    arrow: function (dir) {
      return P.bake(1.8, 2.4, ITEM_PPM, function (ctx, W, H, u) {
        ctx.fillStyle = '#8a8f99'; ctx.fillRect(0.4 * u, H - 1.3 * u, 0.1 * u, 1.3 * u); ctx.fillRect(1.3 * u, H - 1.3 * u, 0.1 * u, 1.3 * u);
        P.rrect(ctx, 0.05 * u, H - 2.35 * u, 1.7 * u, 1.1 * u, 0.12 * u); ctx.fillStyle = '#1f4fbf'; ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.07 * u; ctx.stroke();
        ctx.save(); ctx.translate(W / 2, H - 1.8 * u); ctx.scale(dir, 1);
        ctx.fillStyle = '#ffd400';
        for (var k = -1; k <= 1; k++) {
          ctx.beginPath(); ctx.moveTo((k * 0.42 - 0.12) * u, -0.38 * u); ctx.lineTo((k * 0.42 + 0.2) * u, 0); ctx.lineTo((k * 0.42 - 0.12) * u, 0.38 * u);
          ctx.lineTo((k * 0.42 - 0.3) * u, 0.38 * u); ctx.lineTo((k * 0.42 + 0.02) * u, 0); ctx.lineTo((k * 0.42 - 0.3) * u, -0.38 * u); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      });
    }
  };

  /** Arch across the road (checkpoint / finish). width in metres. */
  function arch(kind, width, theme) {
    var h = 6.2, ppm = Math.min(40, 900 / width);
    return P.bake(width, h, ppm, function (ctx, W, H, u) {
      var post = 0.45 * u;
      ctx.fillStyle = P.lin(ctx, 0, 0, post, 0, [[0, '#d9dde4'], [1, '#8a919c']]);
      ctx.fillRect(0, H - 5.6 * u, post, 5.6 * u); ctx.fillRect(W - post, H - 5.6 * u, post, 5.6 * u);
      var by = H - 6.1 * u, bh = 1.3 * u;
      if (kind === 'finish') {
        var sq = 0.32 * u;
        for (var x = 0; x * sq < W; x++) for (var y = 0; y < 4; y++) {
          ctx.fillStyle = (x + y) % 2 ? '#111' : '#fff'; ctx.fillRect(x * sq, by + y * sq, sq + 1, sq + 1);
        }
        P.rrect(ctx, W / 2 - 2.4 * u, by + 0.15 * u, 4.8 * u, 1 * u, 0.2 * u); ctx.fillStyle = '#e8322f'; ctx.fill();
        txt(ctx, 'FINISH', W / 2, by + 0.68 * u, 0.8 * u, '#ffffff');
      } else {
        P.rrect(ctx, 0, by, W, bh, 0.25 * u);
        ctx.fillStyle = P.lin(ctx, 0, by, 0, by + bh, [[0, '#4fd1ff'], [1, '#1f7be0']]); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.1 * u; ctx.stroke();
        txt(ctx, kind === 'start' ? '🏁  START  🏁' : '🚩 CHECKPOINT 🚩', W / 2, by + bh / 2 + 0.04 * u, 0.75 * u, '#ffffff');
      }
      // flags on top of the posts
      [post / 2, W - post / 2].forEach(function (x) {
        ctx.fillStyle = '#666'; ctx.fillRect(x - 0.04 * u, H - 6.2 * u - 1 * u, 0.08 * u, 1 * u);
        ctx.fillStyle = kind === 'finish' ? '#ffd400' : '#ff4f6d';
        ctx.beginPath(); ctx.moveTo(x, H - 7.2 * u + 0.05 * u); ctx.lineTo(x + 0.7 * u, H - 6.95 * u); ctx.lineTo(x, H - 6.7 * u); ctx.fill();
      });
    }, 0.5, 1);
  }

  /* ------------------------------------------------------------------ atlas per world */

  /** Build (or reuse) the sprite set for a theme. → { props: {kind: [variants]}, items: {...}, coin: [8], glow: {...} } */
  var atlases = {};
  function atlas(theme) {
    if (atlases[theme.key]) return atlases[theme.key];
    var a = { props: {}, items: {}, coin: [], glows: {} };
    theme.props.forEach(function (p) {
      if (a.props[p.kind]) return;
      var n = { house: 4, shop: 4, tower: 3, tree: 3, neon: 5, litbuilding: 4, bush: 3, cactus: 3, palm: 2, npalm: 2, pine: 2, pine2: 2, jtree: 2, flowers: 2 }[p.kind] || 1;
      var list = [];
      for (var v = 0; v < n; v++) list.push(MAKERS[p.kind](theme, v));
      a.props[p.kind] = list;
    });
    a.items.pothole = ITEMS.pothole();
    a.items.oil = theme.key === 'snow' ? ITEMS.ice() : ITEMS.oil();
    a.items.puddle = theme.key === 'jungle' ? ITEMS.mud() : ITEMS.puddle();
    a.items.shadow = ITEMS.shadow();
    a.items.cone = ITEMS.cone();
    a.items.rock = ITEMS.rock(theme.key);
    a.items.ramp = ITEMS.ramp();
    a.items.fuel = ITEMS.fuel();
    a.items.wrench = ITEMS.wrench();
    a.items.barrier = ITEMS.barrier();
    a.items.arrowL = ITEMS.arrow(-1);
    a.items.arrowR = ITEMS.arrow(1);
    for (var f = 0; f < 8; f++) a.coin.push(ITEMS.coin(f));
    a.glows.red = P.glow(64, '#ff2a3a');
    a.glows.amber = P.glow(64, '#ffb02e', 1);
    a.glows.white = P.glow(64, '#fff4d6');
    a.glows.gold = P.glow(64, '#ffd84a');
    a.glows.blue = P.glow(64, '#4fb8ff');
    atlases[theme.key] = a;
    return a;
  }

  /** Horizontally mirrored copy of a sprite (cached on the sprite). */
  function flipped(spr) {
    if (spr.flip) return spr.flip;
    var c = P.canvas(spr.img.width, spr.img.height), ctx = c.getContext('2d');
    ctx.translate(c.width, 0); ctx.scale(-1, 1); ctx.drawImage(spr.img, 0, 0);
    spr.flip = { img: c, w: spr.w, h: spr.h, ax: 1 - spr.ax, ay: spr.ay, refl: spr.refl, reflX: spr.reflX !== undefined ? 1 - spr.reflX : undefined };
    return spr.flip;
  }

  root.RR = root.RR || {};
  root.RR.sprites = { atlas: atlas, arch: arch, flipped: flipped, MAKERS: MAKERS, ITEMS: ITEMS };
})(window);
