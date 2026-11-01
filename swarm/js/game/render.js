/* Pseudo-3D renderer. Lane is a trapezoid narrowing to the horizon; everything scales by depth.
 * Sprites are pre-rendered to offscreen canvases; units are depth-bucketed (counting sort, no allocation). */
(function () {
  'use strict';
  var SG = window.SG = window.SG || {};
  var TAU = Math.PI * 2, D = 140;

  function mk(w, h, fn) { var c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
  function eyes(g, cx, cy, gap, r, angry) {
    for (var s = -1; s <= 1; s += 2) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx + s * gap, cy, r, r * 1.2, 0, 0, TAU); g.fill();
      g.fillStyle = '#16121f'; g.beginPath(); g.arc(cx + s * gap + s * -0.1 * r, cy + r * 0.2, r * 0.58, 0, TAU); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + s * gap - r * 0.2, cy - r * 0.2, r * 0.22, 0, TAU); g.fill();
      if (angry) { g.strokeStyle = '#16121f'; g.lineWidth = r * 0.7; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx + s * (gap + r * 1.3), cy - r * 1.9); g.lineTo(cx + s * (gap - r * 1.2), cy - r * 0.9); g.stroke(); }
    }
  }
  function blob(g, w, h, cx, cy, r, c0, c1, c2) {
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx, h - 5, r * 0.85, r * 0.3, 0, 0, TAU); g.fill();
    var gr = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
    gr.addColorStop(0, c0); gr.addColorStop(0.55, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = Math.max(1.5, r * 0.08); g.stroke();
  }

  function buildSprites(skin) {
    var sp = {};
    sp.player = mk(64, 64, function (g, w, h) {
      g.fillStyle = skin.dark; g.beginPath(); g.ellipse(22, 55, 7, 4.5, 0, 0, TAU); g.ellipse(42, 55, 7, 4.5, 0, 0, TAU); g.fill();
      blob(g, w, h, 32, 33, 22, skin.light, skin.body, skin.dark); eyes(g, 32, 31, 8, 5.2, false);
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(23, 19, 7, 3.5, -0.5, 0, TAU); g.fill();
    });
    sp.enemy = mk(64, 64, function (g, w, h) {
      g.fillStyle = '#2a1b3a'; g.beginPath(); g.moveTo(16, 17); g.lineTo(21, 4); g.lineTo(27, 15); g.moveTo(48, 17); g.lineTo(43, 4); g.lineTo(37, 15); g.fill();
      blob(g, w, h, 32, 35, 22, '#7a5a9a', '#3b2a52', '#150d20');
      eyes(g, 32, 33, 8, 5.2, true);
      g.fillStyle = '#ff3b4d'; g.beginPath(); g.arc(24, 34, 2.4, 0, TAU); g.arc(40, 34, 2.4, 0, TAU); g.fill();
    });
    sp.runner = mk(64, 64, function (g, w, h) {
      g.strokeStyle = 'rgba(255,150,60,0.5)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(22, 4); g.lineTo(22, 16); g.moveTo(32, 2); g.lineTo(32, 14); g.moveTo(42, 4); g.lineTo(42, 16); g.stroke();
      blob(g, w, h, 32, 36, 19, '#ffb067', '#e8501f', '#7a1a0a'); eyes(g, 32, 34, 7, 4.6, true);
    });
    sp.tank = mk(64, 64, function (g, w, h) {
      blob(g, w, h, 32, 35, 24, '#9aa0c8', '#505880', '#222844');
      g.fillStyle = '#323a5e'; g.fillRect(12, 19, 40, 8); g.strokeStyle = '#111'; g.lineWidth = 2; g.strokeRect(12, 19, 40, 8);
      eyes(g, 32, 38, 8, 4.8, true);
      g.fillStyle = '#c8cee8'; g.beginPath(); g.arc(20, 23, 2, 0, TAU); g.arc(44, 23, 2, 0, TAU); g.fill();
    });
    sp.champ = mk(96, 96, function (g, w, h) {
      var gl = g.createRadialGradient(48, 52, 10, 48, 52, 48); gl.addColorStop(0, 'rgba(255,230,120,0.55)'); gl.addColorStop(1, 'rgba(255,230,120,0)');
      g.fillStyle = gl; g.fillRect(0, 0, 96, 96);
      blob(g, w, h, 48, 52, 32, '#fff3a0', '#ffc928', '#b8780a');
      g.fillStyle = '#ff5a3d'; g.strokeStyle = '#7a2a10'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(24, 30); g.lineTo(28, 10); g.lineTo(38, 22); g.lineTo(48, 6); g.lineTo(58, 22); g.lineTo(68, 10); g.lineTo(72, 30); g.closePath(); g.fill(); g.stroke();
      eyes(g, 48, 48, 11, 7, false);
      g.fillStyle = skin.body; g.beginPath(); g.arc(48, 70, 5, 0, TAU); g.fill();
    });
    sp.giant = mk(170, 170, function (g, w, h) {
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(85, 160, 62, 12, 0, 0, TAU); g.fill();
      var gr = g.createRadialGradient(70, 70, 10, 85, 95, 80); gr.addColorStop(0, '#ff8a6a'); gr.addColorStop(0.5, '#c7283d'); gr.addColorStop(1, '#4a0c26');
      g.fillStyle = gr; g.strokeStyle = '#2a0614'; g.lineWidth = 4;
      g.beginPath(); g.ellipse(18, 100, 17, 38, -0.2, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(152, 100, 17, 38, 0.2, 0, TAU); g.fill(); g.stroke();
      g.beginPath(); g.ellipse(85, 98, 56, 58, 0, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = '#f5e9c8'; g.beginPath(); g.moveTo(40, 52); g.lineTo(30, 10); g.lineTo(58, 40); g.moveTo(130, 52); g.lineTo(140, 10); g.lineTo(112, 40); g.fill(); g.stroke();
      g.fillStyle = '#1b0a14'; g.beginPath(); g.ellipse(85, 120, 28, 17, 0, 0, TAU); g.fill();
      g.fillStyle = '#fff'; for (var k = 0; k < 6; k++) { g.beginPath(); g.moveTo(62 + k * 9, 108); g.lineTo(66 + k * 9, 119); g.lineTo(70 + k * 9, 108); g.fill(); }
      g.fillStyle = '#ffe14d'; g.beginPath(); g.ellipse(63, 80, 14, 11, -0.3, 0, TAU); g.ellipse(107, 80, 14, 11, 0.3, 0, TAU); g.fill();
      g.fillStyle = '#16121f'; g.beginPath(); g.arc(65, 83, 5.5, 0, TAU); g.arc(105, 83, 5.5, 0, TAU); g.fill();
      g.strokeStyle = '#16121f'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(44, 60); g.lineTo(76, 74); g.moveTo(126, 60); g.lineTo(94, 74); g.stroke();
    });
    return sp;
  }

  function Renderer(canvas) {
    var ctx = canvas.getContext('2d');
    var W = 300, H = 600, dpr = 1, pxU = 3, A = 0, B = 0, topScale = D / (D + 170);
    var sprites = null, skinId = '', bg = null;
    var order = new Int32Array(1600), cnt = new Int32Array(66), bucket = new Uint8Array(1600);
    var pX = 0, pY = 0, pS = 1, unitK = 1.3;
    var R = { W: 0, H: 0, pxU: 3 };
    var PCOL = ['#35d07f', '#4a3a5c', '#ffffff', '#ff8a2a', '#ffe14d', '#ffc928', '#7dffb0'];

    function P(x, y, z) { var sc = D / (D + y); pS = sc; pX = W / 2 + (x - 50) * pxU * sc; pY = A + B * sc - z * pxU * sc; }
    R.project = function (x, y, z) { P(x, y, z); return { x: pX / dpr, y: pY / dpr, s: pS }; };

    function buildBg() {
      bg = mk(W, H, function (g) {
        var sky = g.createLinearGradient(0, 0, 0, H * 0.7); sky.addColorStop(0, '#5cc8ff'); sky.addColorStop(0.55, '#a9e6ff'); sky.addColorStop(1, '#eaf9ff');
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
        g.fillStyle = 'rgba(255,255,255,0.9)';
        for (var i = 0; i < 7; i++) { var cx = rnd() * W, cy = H * (0.05 + rnd() * 0.22), r = W * (0.05 + rnd() * 0.06); for (var k = 0; k < 4; k++) { g.beginPath(); g.arc(cx + k * r * 0.8, cy + (k % 2) * r * 0.2, r * (1 - k * 0.12), 0, TAU); g.fill(); } }
        // hills + pines
        var hy = H * 0.34;
        g.fillStyle = '#9ed8c0'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, hy);
        for (var x = 0; x <= W; x += 20) g.lineTo(x, hy - 18 - Math.sin(x * 0.02) * 14 - rnd() * 6); g.lineTo(W, H); g.fill();
        g.fillStyle = '#6fc79a'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, hy + 24);
        for (x = 0; x <= W; x += 20) g.lineTo(x, hy + 20 - Math.sin(x * 0.03 + 2) * 12); g.lineTo(W, H); g.fill();
        for (i = 0; i < 46; i++) {
          var tx = rnd() * W, ty = hy + 6 + rnd() * H * 0.5, ts = 10 + (ty - hy) * 0.08 + rnd() * 6;
          g.fillStyle = i % 3 ? '#2f9e67' : '#3fb27a';
          for (k = 0; k < 3; k++) { g.beginPath(); g.moveTo(tx, ty - ts * (1.4 - k * 0.1) + k * ts * 0.45); g.lineTo(tx - ts * (0.5 + k * 0.18), ty - ts * 0.4 + k * ts * 0.45); g.lineTo(tx + ts * (0.5 + k * 0.18), ty - ts * 0.4 + k * ts * 0.45); g.fill(); }
          g.fillStyle = '#6b4a2f'; g.fillRect(tx - 1.5, ty + ts * 0.5, 3, ts * 0.3);
        }
        var fog = g.createLinearGradient(0, hy - 30, 0, hy + 60); fog.addColorStop(0, 'rgba(234,249,255,0)'); fog.addColorStop(1, 'rgba(234,249,255,0.6)');
        g.fillStyle = fog; g.fillRect(0, hy - 30, W, 100);
      });
    }

    R.resize = function (cssW, cssH) {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(200, Math.round(cssW * dpr)); H = Math.max(300, Math.round(cssH * dpr));
      canvas.width = W; canvas.height = H;
      pxU = W * 0.76 / 100; unitK = cssW < 520 ? 1.3 : 1.05;
      var yTop = H * 0.22, yBot = H * 0.84;
      B = (yBot - yTop) / (1 - topScale); A = yBot - B;
      R.W = cssW; R.H = cssH; R.pxU = pxU / dpr; R.dpr = dpr;
      buildBg();
    };
    R.pxPerUnitCss = function () { return pxU / dpr; };
    R.setSkin = function (skin) { if (skin.id !== skinId) { skinId = skin.id; sprites = buildSprites(skin); PCOL[0] = skin.body; } };

    function quad(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3) {
      P(x0, y0, z0); ctx.moveTo(pX, pY); P(x1, y1, z1); ctx.lineTo(pX, pY); P(x2, y2, z2); ctx.lineTo(pX, pY); P(x3, y3, z3); ctx.lineTo(pX, pY); ctx.closePath();
    }

    function drawLane(sim) {
      var g = ctx, t = sim.time;
      // lane surface
      g.beginPath(); quad(0, -45, 0, 100, -45, 0, 100, 175, 0, 0, 175, 0);
      P(0, 175, 0); var yt = pY; P(0, -45, 0); var yb = pY;
      var lg = g.createLinearGradient(0, yt, 0, yb); lg.addColorStop(0, '#9fb3c6'); lg.addColorStop(0.5, '#b4c3d1'); lg.addColorStop(1, '#cbd6e0');
      g.fillStyle = lg; g.fill();
      // lane checker bands scrolling
      g.fillStyle = 'rgba(255,255,255,0.10)';
      var off = (t * 14) % 40;
      for (var y = -45 - 40 + off; y < 175; y += 40) {
        var y1 = Math.max(-45, y), y2 = Math.min(175, y + 20); if (y2 <= y1) continue;
        g.beginPath(); quad(0, y1, 0, 100, y1, 0, 100, y2, 0, 0, y2, 0); g.fill();
      }
      // dashed guide lines
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (var li = 1; li < 3; li++) {
        var lx = li * 100 / 3;
        for (y = -45 - 14 + (t * 30) % 14; y < 170; y += 14) {
          g.beginPath(); quad(lx - 0.5, y, 0, lx + 0.5, y, 0, lx + 0.5, y + 6, 0, lx - 0.5, y + 6, 0); g.fill();
        }
      }
      // breach line
      g.beginPath(); quad(0, 1.2, 0, 100, 1.2, 0, 100, 4.8, 0, 0, 4.8, 0);
      g.fillStyle = sim.red > 0.01 ? 'rgba(255,60,60,0.8)' : 'rgba(255,90,90,0.35)'; g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (var bx = 0; bx < 100; bx += 10) { g.beginPath(); quad(bx, 1.2, 0, bx + 5, 1.2, 0, bx + 5, 4.8, 0, bx, 4.8, 0); g.fill(); }
      // side walls (+1 tiles), far to near
      var fs = Math.round(5.2 * pxU), lastFont = '';
      for (y = 168; y >= -42; y -= 6) {
        for (var side = 0; side < 2; side++) {
          var xo = side ? 100 : 0, xs = side ? 9 : -9;
          var xa = xo, xb = xo + xs;
          g.beginPath(); quad(xa, y, 5, xb, y, 5, xb, y + 6, 5, xa, y + 6, 5);
          g.fillStyle = side ? '#ffd84a' : '#4be07a'; g.fill();
          g.beginPath(); quad(xa, y, 0, xa, y, 5, xa, y + 6, 5, xa, y + 6, 0);
          g.fillStyle = side ? '#d19a14' : '#1fa850'; g.fill();
          g.beginPath(); quad(xa, y, 0, xb, y, 0, xb, y, 5, xa, y, 5);
          g.fillStyle = side ? '#f0b724' : '#2cc864'; g.fill();
          g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.stroke();
          if (y < 120 && y > -30) {
            P(xo + xs * 0.5, y + 3, 5.2); var tsz = Math.round(4 * pxU * pS);
            if (tsz >= 7) { g.font = '900 ' + tsz + 'px system-ui,sans-serif'; g.fillStyle = side ? '#7a5200' : '#0a5a2a'; g.textAlign = 'center'; g.textBaseline = 'middle'; if (!side) g.fillText('+1', pX, pY); }
          }
        }
      }
      // fog near horizon
      var fg = g.createLinearGradient(0, yt - 20, 0, yt + (yb - yt) * 0.3); fg.addColorStop(0, 'rgba(234,249,255,0.8)'); fg.addColorStop(1, 'rgba(234,249,255,0)');
      g.fillStyle = fg; g.fillRect(0, yt - 20, W, (yb - yt) * 0.3 + 20);
    }

    function drawBases(sim) {
      var g = ctx, L = sim.LL;
      for (var k = 0; k < sim.bases.length; k++) {
        var b = sim.bases[k], dead = b.hp <= 0, h = dead ? 3 : 15;
        // body
        g.beginPath(); quad(b.x0, L, 0, b.x1, L, 0, b.x1, L, h, b.x0, L, h);
        var f = b.flash;
        P(b.x0, L, h); var yt = pY; P(b.x0, L, 0); var yb = pY;
        var gr = g.createLinearGradient(0, yt, 0, yb);
        if (dead) { gr.addColorStop(0, '#6a6070'); gr.addColorStop(1, '#3a3442'); } else { gr.addColorStop(0, f > 0.2 ? '#ff9a9a' : '#5a3a6a'); gr.addColorStop(1, f > 0.2 ? '#ff5a6a' : '#2a1838'); }
        g.fillStyle = gr; g.fill(); g.strokeStyle = '#150a1c'; g.lineWidth = Math.max(1, pxU * 0.3 * pS); g.stroke();
        if (!dead) {
          g.beginPath(); quad(b.x0, L, h, b.x1, L, h, b.x1, L + 6, h, b.x0, L + 6, h); g.fillStyle = '#7a5a8a'; g.fill(); g.stroke();
          // battlements
          var n = Math.max(2, Math.round((b.x1 - b.x0) / 9)), bw = (b.x1 - b.x0) / n;
          for (var i = 0; i < n; i += 1) {
            if (i % 2) continue; g.beginPath(); quad(b.x0 + i * bw, L, h, b.x0 + (i + 1) * bw, L, h, b.x0 + (i + 1) * bw, L, h + 4, b.x0 + i * bw, L, h + 4); g.fillStyle = '#4a2f5c'; g.fill(); g.stroke();
          }
          // hazard stripe
          var sw = 3;
          for (i = 0; i * sw < b.x1 - b.x0; i++) {
            var xa = b.x0 + i * sw, xb = Math.min(b.x1, xa + sw);
            g.beginPath(); quad(xa, L, 0, xb, L, 0, xb, L, 2.4, xa, L, 2.4); g.fillStyle = i % 2 ? '#ffd23d' : '#1a1020'; g.fill();
          }
          // evil eye
          P((b.x0 + b.x1) / 2, L, h * 0.62); var er = Math.min(pxU * pS * 4, (b.x1 - b.x0) * pxU * pS * 0.18);
          g.fillStyle = '#ffe14d'; g.beginPath(); g.ellipse(pX, pY, er * 1.5, er, 0, 0, TAU); g.fill();
          g.fillStyle = '#c4122a'; g.beginPath(); g.arc(pX, pY, er * 0.62, 0, TAU); g.fill();
          g.fillStyle = '#000'; g.beginPath(); g.ellipse(pX, pY, er * 0.2, er * 0.55, 0, 0, TAU); g.fill();
        } else {
          g.fillStyle = 'rgba(80,70,90,0.5)'; P((b.x0 + b.x1) / 2, L, 4); g.beginPath(); g.arc(pX, pY - 6 * pS, 7 * pS * pxU * 0.5, 0, TAU); g.fill();
        }
        // HP label
        P((b.x0 + b.x1) / 2, L + 0.5, dead ? 0 : -1.2); var fsz = Math.round(Math.min(5.4 * pxU * pS, (b.x1 - b.x0) * pxU * pS * 0.4));
        var txt = String(Math.ceil(b.hp)); g.font = '900 ' + fsz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        var tw = g.measureText(txt).width + fsz * 0.9;
        g.fillStyle = 'rgba(10,6,16,0.9)'; g.beginPath(); rr(g, pX - tw / 2, pY - fsz * 0.7, tw, fsz * 1.4, fsz * 0.3); g.fill();
        g.fillStyle = dead ? '#9a9' : f > 0.2 ? '#ffd23d' : '#fff'; g.fillText(dead ? '0' : txt, pX, pY + 1);
      }
    }
    function rr(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

    function drawGateFloor(sim) {
      var g = ctx;
      for (var k = 0; k < sim.gates.length; k++) {
        var q = sim.gates[k], neg = q.t === '-';
        g.beginPath(); quad(q.x0, q.y - 1.4, 0, q.x1, q.y - 1.4, 0, q.x1, q.y + 1.4, 0, q.x0, q.y + 1.4, 0);
        g.fillStyle = neg ? 'rgba(255,60,80,' + (0.45 + q.flash * 0.4) + ')' : q.t === 'x' ? 'rgba(60,150,255,' + (0.45 + q.flash * 0.4) + ')' : 'rgba(40,220,120,' + (0.45 + q.flash * 0.4) + ')'; g.fill();
        // glow wall (translucent curtain)
        g.beginPath(); quad(q.x0, q.y, 0, q.x1, q.y, 0, q.x1, q.y, 8, q.x0, q.y, 8);
        g.fillStyle = neg ? 'rgba(255,60,80,0.14)' : 'rgba(80,180,255,0.14)'; g.fill();
      }
    }
    function drawGateSigns(sim) {
      var g = ctx;
      for (var k = 0; k < sim.gates.length; k++) {
        var q = sim.gates[k], neg = q.t === '-', col = neg ? ['#ff5068', '#b0102a'] : q.t === 'x' ? ['#4aa8ff', '#1c5ccc'] : ['#3fe083', '#12904a'];
        var pulse = 1 + q.flash * 0.18;
        // posts
        g.fillStyle = '#2a2438';
        P(q.x0, q.y, 0); var xa = pX, ya = pY; P(q.x0, q.y, 15); var pw = Math.max(2, 1.4 * pxU * pS);
        g.fillRect(xa - pw / 2, pY, pw, ya - pY);
        P(q.x1, q.y, 0); xa = pX; ya = pY; P(q.x1, q.y, 15); g.fillRect(xa - pw / 2, pY, pw, ya - pY);
        // sign
        P(q.x0, q.y, 15.5); var sx0 = pX, sy0 = pY; P(q.x1, q.y, 7.2); var sx1 = pX, sy1 = pY;
        var w = sx1 - sx0, h = sy1 - sy0, cx = (sx0 + sx1) / 2, cy = (sy0 + sy1) / 2;
        w *= pulse; h *= pulse;
        var sg = g.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); sg.addColorStop(0, col[0]); sg.addColorStop(1, col[1]);
        g.globalAlpha = 0.93; g.fillStyle = sg; g.beginPath(); rr(g, cx - w / 2, cy - h / 2, w, h, h * 0.25); g.fill();
        g.strokeStyle = 'rgba(255,255,255,' + (0.6 + q.flash * 0.4) + ')'; g.lineWidth = Math.max(1.5, h * 0.06); g.stroke(); g.globalAlpha = 1;
        var fsz = Math.round(Math.min(h * 0.8, w * 0.55));
        g.font = '900 ' + fsz + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = Math.max(2, fsz * 0.12); g.strokeStyle = 'rgba(0,0,0,0.55)'; g.strokeText(q.label, cx, cy + 1);
        g.fillStyle = '#fff'; g.fillText(q.label, cx, cy + 1);
      }
    }

    function drawUnits(sim, t) {
      var g = ctx, hi = sim.hi(), alive = sim.alive, uy = sim.uy, ux = sim.ux, kind = sim.ukind, i, n = 0, LL = sim.LL;
      for (i = 0; i < 66; i++) cnt[i] = 0;
      for (i = 0; i < hi; i++) {
        if (!alive[i]) continue;
        var bk = 64 - Math.max(0, Math.min(63, (uy[i] / LL * 64) | 0)); bucket[i] = bk; cnt[bk + 1]++; n++;
      }
      for (i = 1; i < 66; i++) cnt[i] += cnt[i - 1];
      for (i = 0; i < hi; i++) if (alive[i]) order[cnt[bucket[i]]++] = i;
      for (var o = 0; o < n; o++) {
        i = order[o];
        var k = kind[i], s, r = sim.ur[i], hop = Math.abs(Math.sin(t * (k === 3 ? 16 : 9) + sim.uph[i])) * (k === 2 ? 0.5 : 1.3);
        P(ux[i], uy[i], hop);
        if (pY < -50 || pY > H + 50) continue;
        var team = alive[i];
        if (k === 2) {
          s = sprites.giant; var gw = r * 2 * 1.6 * pxU * pS;
          g.drawImage(s, pX - gw / 2, pY - gw * 0.9, gw, gw);
          if (sim.uhit[i] > 0) { g.globalAlpha = 0.45; g.fillStyle = '#fff'; g.beginPath(); g.arc(pX, pY - gw * 0.5, gw * 0.33, 0, TAU); g.fill(); g.globalAlpha = 1; }
          // hp bar
          var bw = gw * 0.85, bh = Math.max(4, gw * 0.09), by = pY - gw * 1.0;
          g.fillStyle = '#2a0a12'; g.fillRect(pX - bw / 2 - 1.5, by - 1.5, bw + 3, bh + 3);
          g.fillStyle = '#ff2d4a'; g.fillRect(pX - bw / 2, by, bw * Math.max(0, sim.uhp[i] / sim.umax[i]), bh);
          g.font = '900 ' + Math.round(bh * 1.7) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(String(sim.uhp[i]), pX, by - 2); g.fillStyle = '#fff'; g.fillText(String(sim.uhp[i]), pX, by - 2);
          continue;
        }
        if (k === 1) { s = sprites.champ; var cw = r * 2 * 2 * pxU * pS; g.drawImage(s, pX - cw / 2, pY - cw * 0.92, cw, cw);
          g.font = '900 ' + Math.round(cw * 0.22) + 'px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(String(sim.uhp[i]), pX, pY - cw * 1.0); g.fillStyle = '#ffe14d'; g.fillText(String(sim.uhp[i]), pX, pY - cw * 1.0); continue; }
        s = team === 1 ? sprites.player : k === 3 ? sprites.runner : k === 4 ? sprites.tank : sprites.enemy;
        var w = r * 2 * 1.85 * pxU * pS * unitK;
        g.drawImage(s, pX - w / 2, pY - w * 0.93, w, w);
        if (k === 4 && sim.uhit[i] > 0) { g.globalAlpha = 0.5; g.fillStyle = '#fff'; g.fillRect(pX - w * 0.25, pY - w * 0.7, w * 0.5, w * 0.5); g.globalAlpha = 1; }
      }
    }

    function drawCannon(sim, t) {
      var g = ctx, u = pxU, cx, by;
      P(sim.cannonX, 0, 0); cx = pX; by = pY;
      var rec = sim.recoil * 0.9 * u;
      g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(cx, by + u * 0.6, u * 6.5, u * 2.2, 0, 0, TAU); g.fill();
      if (sim.charge >= 100) {
        var a = 0.5 + 0.4 * Math.sin(t * 10); g.strokeStyle = 'rgba(255,225,80,' + a + ')'; g.lineWidth = u * 0.9; g.beginPath(); g.ellipse(cx, by, u * 8.5, u * 3.4, 0, 0, TAU); g.stroke();
      }
      var skin = SG.Save.skin();
      g.fillStyle = '#23202e'; g.beginPath(); g.arc(cx - u * 4.4, by - u * 1.2, u * 2.1, 0, TAU); g.arc(cx + u * 4.4, by - u * 1.2, u * 2.1, 0, TAU); g.fill();
      g.fillStyle = '#6a6680'; g.beginPath(); g.arc(cx - u * 4.4, by - u * 1.2, u * 0.9, 0, TAU); g.arc(cx + u * 4.4, by - u * 1.2, u * 0.9, 0, TAU); g.fill();
      // barrel
      var bl = u * 9 - rec;
      var bg2 = g.createLinearGradient(cx - u * 2, 0, cx + u * 2, 0); bg2.addColorStop(0, '#4a4660'); bg2.addColorStop(0.45, '#9a96b8'); bg2.addColorStop(1, '#34304a');
      g.fillStyle = bg2; g.beginPath(); g.moveTo(cx - u * 2.1, by - u * 4); g.lineTo(cx - u * 1.6, by - u * 4 - bl); g.lineTo(cx + u * 1.6, by - u * 4 - bl); g.lineTo(cx + u * 2.1, by - u * 4); g.closePath(); g.fill();
      g.strokeStyle = '#15121f'; g.lineWidth = Math.max(1.5, u * 0.35); g.stroke();
      g.fillStyle = skin.accent; g.fillRect(cx - u * 1.9, by - u * 4 - bl * 0.55, u * 3.8, u * 0.9);
      g.fillStyle = '#15121f'; g.beginPath(); g.ellipse(cx, by - u * 4 - bl, u * 1.6, u * 0.55, 0, 0, TAU); g.fill();
      if (sim.recoil > 0.5) { g.fillStyle = 'rgba(255,240,150,' + (sim.recoil * 0.8) + ')'; g.beginPath(); g.arc(cx, by - u * 4 - bl - u * 0.5, u * 2.2 * sim.recoil, 0, TAU); g.fill(); }
      // body
      var bg3 = g.createLinearGradient(0, by - u * 6, 0, by); bg3.addColorStop(0, skin.light); bg3.addColorStop(0.35, skin.body); bg3.addColorStop(1, skin.dark);
      g.fillStyle = bg3; g.beginPath(); rr(g, cx - u * 4.8, by - u * 6.2, u * 9.6, u * 5.6, u * 2); g.fill(); g.strokeStyle = '#15121f'; g.lineWidth = Math.max(1.5, u * 0.35); g.stroke();
      g.fillStyle = skin.accent; g.beginPath(); g.arc(cx, by - u * 3.5, u * 1.3, 0, TAU); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.ellipse(cx - u * 2.6, by - u * 5.2, u * 1.6, u * 0.7, -0.3, 0, TAU); g.fill();
    }

    function drawFx(sim) {
      var g = ctx, i, last = -1;
      for (i = 0; i < sim.MAXP; i++) {
        if (sim.plife[i] <= 0) continue;
        P(sim.px[i], sim.py[i], sim.pz[i]);
        var c = sim.pcol[i]; if (c !== last) { g.fillStyle = PCOL[c]; last = c; }
        var s = Math.max(1.5, sim.psz[i] * pxU * pS * 1.1 * Math.min(1, sim.plife[i] * 3));
        g.fillRect(pX - s / 2, pY - s / 2, s, s);
      }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (i = 0; i < sim.MAXT; i++) {
        var l = sim.tlife[i]; if (l <= 0) continue;
        P(sim.tx[i], sim.ty[i], 4);
        var sz = Math.round(pxU * 5 * sim.tsz[i] * Math.min(1, pS + 0.4) * (1 + Math.max(0, l - 0.8) * 1.5));
        g.font = '900 ' + sz + 'px system-ui,sans-serif'; g.globalAlpha = Math.min(1, l * 1.6);
        g.lineWidth = Math.max(3, sz * 0.18); g.strokeStyle = 'rgba(0,0,0,0.7)'; g.strokeText(sim.tstr[i], pX, pY);
        g.fillStyle = sim.tcol[i] === 1 ? '#ff6a7a' : sim.tcol[i] === 4 ? '#ffe14d' : '#9dffc4'; g.fillText(sim.tstr[i], pX, pY);
        g.globalAlpha = 1;
      }
    }

    R.draw = function (sim, t) {
      if (!sprites) R.setSkin(SG.Save.skin());
      var g = ctx, sh = sim.shake * sim.shake * 14 * dpr;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.drawImage(bg, 0, 0);
      if (sh > 0.1) g.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
      g.save();
      if (sim.level) {
        drawLane(sim); drawBases(sim); drawGateFloor(sim); drawUnits(sim, t); drawGateSigns(sim); drawCannon(sim, t); drawFx(sim);
      }
      g.restore();
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (sim.red > 0.02) { var rg = g.createRadialGradient(W / 2, H * 0.6, H * 0.2, W / 2, H * 0.6, H * 0.75); rg.addColorStop(0, 'rgba(255,40,50,0)'); rg.addColorStop(1, 'rgba(255,40,50,' + (sim.red * 0.6) + ')'); g.fillStyle = rg; g.fillRect(0, 0, W, H); }
      if (sim.flash > 0.02) { g.fillStyle = 'rgba(255,255,255,' + (sim.flash * 0.35) + ')'; g.fillRect(0, 0, W, H); }
    };
    return R;
  }

  SG.Renderer = Renderer;
})();
