/* The garage backdrop for the Workshop home (procedural, cached to an offscreen canvas): planked back wall, window,
 * framed poster, shelf, pegboard with tools, tyre stack, hanging lamp, concrete floor with hazard stripes and a lift pad. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {};
  var SPR = TW.sprites;

  function lin(g, x0, y0, x1, y1, stops) { var gr = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); }); return gr; }
  function seeded(n) { var s = n; return function () { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  function wrench(g, x, y, len, ang, col) {
    g.save(); g.translate(x, y); g.rotate(ang); g.lineCap = 'round';
    g.strokeStyle = '#111'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len); g.stroke();
    g.strokeStyle = col; g.lineWidth = 6; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, len); g.stroke();
    g.fillStyle = col; g.strokeStyle = '#111'; g.lineWidth = 3; g.beginPath(); g.arc(0, -2, 11, 0.5, 5.8); g.lineTo(0, -2); g.closePath(); g.fill(); g.stroke();
    g.restore();
  }

  function build(w, h, vehInfo) {
    var c = SPR.mk(w, h), g = c.getContext('2d'), fy = Math.round(h * 0.47), R = seeded(7), i, x;
    // back wall
    g.fillStyle = lin(g, 0, 0, 0, fy, [[0, '#6d5a49'], [1, '#c9a979']]); g.fillRect(0, 0, w, fy);
    for (x = 0; x < w; x += 34) { g.fillStyle = (x / 34) % 2 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)'; g.fillRect(x, 0, 34, fy); g.fillStyle = 'rgba(40,25,10,.25)'; g.fillRect(x, 0, 2, fy); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, fy - 30, w, 30);
    g.fillStyle = '#4a3a2c'; g.fillRect(0, fy - 8, w, 8);
    // window (right)
    var wx = w * 0.68, wy = h * 0.12, ww = w * 0.28, wh = h * 0.16;
    g.fillStyle = '#2a2018'; g.fillRect(wx - 6, wy - 6, ww + 12, wh + 12);
    g.fillStyle = lin(g, 0, wy, 0, wy + wh, [[0, '#7fd0ff'], [1, '#d6f1ff']]); g.fillRect(wx, wy, ww, wh);
    g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(wx + ww * 0.3, wy + wh * 0.4, ww * 0.14, wh * 0.12, 0, 0, 7); g.ellipse(wx + ww * 0.45, wy + wh * 0.46, ww * 0.12, wh * 0.1, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2018'; g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + wh / 2 - 2, ww, 4);
    // sun rays on the floor later; poster (centre-left)
    var px = w * 0.3, py = h * 0.07, pw = w * 0.34, ph = h * 0.19;
    g.fillStyle = '#3b2a1d'; g.fillRect(px - 7, py - 7, pw + 14, ph + 14);
    g.fillStyle = lin(g, 0, py, 0, py + ph, [[0, '#ffb15a'], [0.6, '#ff7a45'], [1, '#c2410c']]); g.fillRect(px, py, pw, ph);
    g.fillStyle = '#7a2e12'; g.beginPath(); g.moveTo(px, py + ph * 0.75); g.lineTo(px + pw * 0.3, py + ph * 0.5); g.lineTo(px + pw * 0.55, py + ph * 0.7); g.lineTo(px + pw * 0.8, py + ph * 0.45); g.lineTo(px + pw, py + ph * 0.7); g.lineTo(px + pw, py + ph); g.lineTo(px, py + ph); g.fill();
    if (TW.vehicle && vehInfo) {
      var all = {}; vehInfo.tasks.forEach(function (t) { all[t.id] = 1; });
      TW.vehicle.draw(g, TW.vehicles.vehicleInfo(0), { done: all, choices: { paint: 'p0', wheels: 'sport', lights: 'round' } }, px + pw * 0.05, py + ph * 0.18, pw * 0.9, ph * 0.8);
    }
    // shelf with stuff (left-top)
    var sx = w * 0.02, sy = h * 0.31, sw = w * 0.26;
    g.fillStyle = '#4b3524'; g.fillRect(sx, sy, sw, 9); g.fillStyle = '#2a1c11'; g.fillRect(sx + 8, sy + 9, 8, 14); g.fillRect(sx + sw - 16, sy + 9, 8, 14);
    [['#e53935', 0], ['#1e88e5', 1], ['#fdd835', 2]].forEach(function (cn, k) { var cx = sx + 12 + k * 30; g.fillStyle = cn[0]; g.fillRect(cx, sy - 26, 22, 26); g.strokeStyle = '#111'; g.lineWidth = 2.5; g.strokeRect(cx, sy - 26, 22, 26); g.fillStyle = '#fff'; g.fillRect(cx + 4, sy - 18, 14, 6); });
    g.fillStyle = '#9aa5b0'; g.fillRect(sx + sw - 50, sy - 20, 36, 20); g.strokeStyle = '#111'; g.strokeRect(sx + sw - 50, sy - 20, 36, 20);
    // pegboard with tools
    var bx = w * 0.02, by = h * 0.06, bw = w * 0.24, bh = h * 0.18;
    g.fillStyle = '#35566b'; g.fillRect(bx, by, bw, bh); g.strokeStyle = '#1b2b36'; g.lineWidth = 3; g.strokeRect(bx, by, bw, bh);
    g.fillStyle = 'rgba(0,0,0,.25)'; for (i = 0; i < 40; i++) { g.beginPath(); g.arc(bx + 8 + (i % 8) * (bw - 16) / 7, by + 8 + ((i / 8) | 0) * (bh - 16) / 4, 1.6, 0, 7); g.fill(); }
    wrench(g, bx + bw * 0.22, by + 12, bh * 0.55, 0.15, '#cfd6dc'); wrench(g, bx + bw * 0.5, by + 10, bh * 0.6, -0.1, '#ffb300'); wrench(g, bx + bw * 0.78, by + 14, bh * 0.5, 0.2, '#ef5350');
    // lamp
    var lx = w * 0.5;
    g.strokeStyle = '#222'; g.lineWidth = 3; g.beginPath(); g.moveTo(lx, 0); g.lineTo(lx, h * 0.035); g.stroke();
    g.fillStyle = '#2f343c'; g.beginPath(); g.moveTo(lx - 26, h * 0.065); g.lineTo(lx + 26, h * 0.065); g.lineTo(lx + 12, h * 0.035); g.lineTo(lx - 12, h * 0.035); g.closePath(); g.fill();
    g.fillStyle = '#fff3b0'; g.beginPath(); g.ellipse(lx, h * 0.067, 18, 4, 0, 0, 7); g.fill();
    // floor
    g.fillStyle = lin(g, 0, fy, 0, h, [[0, '#8d8479'], [0.5, '#6b645b'], [1, '#4c4640']]); g.fillRect(0, fy, w, h - fy);
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, fy, w, 10);
    for (i = 0; i < 2600; i++) { g.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.09)'; g.fillRect(R() * w, fy + R() * (h - fy), 2, 2); }
    // hazard stripe (diagonal band on the floor, right side)
    g.save(); g.beginPath(); g.moveTo(w * 0.74, h * 0.53); g.lineTo(w, h * 0.47); g.lineTo(w, h * 0.8); g.lineTo(w * 0.88, h * 0.8); g.closePath(); g.clip();
    for (x = -h; x < w + h; x += 26) { g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(x, h * 0.4); g.lineTo(x + 13, h * 0.4); g.lineTo(x + 13 - h * 0.4, h); g.lineTo(x - h * 0.4, h); g.fill(); }
    g.restore();
    g.fillStyle = '#f2c230'; for (x = 0; x < w * 0.3; x += 40) { g.save(); g.beginPath(); g.moveTo(x, h * 0.755); g.lineTo(x + 22, h * 0.755); g.lineTo(x + 8, h * 0.77); g.lineTo(x - 14, h * 0.77); g.closePath(); g.fill(); g.restore(); }
    // lift pad under the vehicle
    g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.ellipse(w * 0.5, h * 0.685, w * 0.4, h * 0.03, 0, 0, 7); g.fill();
    // tyre stack (left, on the floor)
    function tyre(cx, cy, r) { g.fillStyle = '#1b1b22'; g.beginPath(); g.ellipse(cx, cy, r, r * 0.45, 0, 0, 7); g.fill(); g.fillStyle = '#2b2b36'; g.beginPath(); g.ellipse(cx, cy - 4, r, r * 0.45, 0, 0, 7); g.fill(); g.fillStyle = '#5a6068'; g.beginPath(); g.ellipse(cx, cy - 4, r * 0.55, r * 0.22, 0, 0, 7); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke(); }
    tyre(w * 0.1, h * 0.585, 36); tyre(w * 0.1, h * 0.56, 36); tyre(w * 0.105, h * 0.535, 34);
    // oil drum (right)
    g.fillStyle = lin(g, w * 0.9, 0, w * 0.97, 0, [[0, '#ef5350'], [1, '#b71c1c']]); g.fillRect(w * 0.9, h * 0.43, w * 0.075, h * 0.1); g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(w * 0.9, h * 0.43, w * 0.075, h * 0.1);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(w * 0.9, h * 0.46, w * 0.075, 4); g.fillRect(w * 0.9, h * 0.5, w * 0.075, 4);
    // vignette
    var vg = g.createRadialGradient(w / 2, h * 0.5, w * 0.2, w / 2, h * 0.5, h * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,20,.55)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
    // light cone
    var lc = g.createRadialGradient(lx, h * 0.07, 4, lx, h * 0.5, h * 0.45); lc.addColorStop(0, 'rgba(255,240,170,.32)'); lc.addColorStop(1, 'rgba(255,240,170,0)'); g.fillStyle = lc; g.fillRect(0, 0, w, h);
    return c;
  }

  TW.scene = { build: build };
})(typeof self !== 'undefined' ? self : this);
