/* Circuits view: night-city tile board (canvas), tile tray with drag & drop, live circuit evaluation. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var CL = LE.logic.circuits;
  var DX = CL.DX, DY = CL.DY;
  var TRAY_ORDER = ['I', 'C', 'T', 'X', 'P', 'B', 'M', 'S'];
  var LABELS = { I: 'Wire', C: 'Corner', T: 'Split', X: 'Cross', P: 'Lamp', B: 'Battery', M: 'Fan', S: 'Switch' };

  /* ================= Drawing ================= */
  function edgePt(cx, cy, s, d) { return { x: cx + DX[d] * s / 2, y: cy + DY[d] * s / 2 }; }

  function copper(g, segs, s, cx, cy) {
    // segs: list of [x1,y1,x2,y2]
    function path() {
      g.beginPath();
      segs.forEach(function (q) { g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); });
    }
    g.lineCap = 'butt'; g.lineJoin = 'round';
    function joints(r, col) {
      g.fillStyle = col;
      segs.forEach(function (q) { g.beginPath(); g.arc(q[2], q[3], r, 0, 7); g.fill(); });
    }
    path(); g.strokeStyle = '#4a2208'; g.lineWidth = s * 0.24; g.stroke(); joints(s * 0.12, '#4a2208');
    path(); g.strokeStyle = '#d9853b'; g.lineWidth = s * 0.15; g.stroke(); joints(s * 0.075, '#d9853b');
    path(); g.strokeStyle = 'rgba(255,214,160,.6)'; g.lineWidth = s * 0.035; g.stroke();
  }
  function glowSegs(g, segs, s, a, short) {
    if (a <= 0.01) return;
    function path() { g.beginPath(); segs.forEach(function (q) { g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); }); }
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.lineCap = 'round';
    var col = short ? '255,90,60' : '255,220,70';
    path(); g.strokeStyle = 'rgba(' + col + ',' + (0.18 * a) + ')'; g.lineWidth = s * 0.34; g.stroke();
    path(); g.strokeStyle = 'rgba(' + col + ',' + (0.75 * a) + ')'; g.lineWidth = s * 0.1; g.stroke();
    g.restore();
  }
  function dots(g, cx, cy, s, flow, t, d, from, short) {
    // dots along segment from edge d to the point `from` (default centre)
    var f = flow ? flow[d] : 0;
    if (!f) return;
    var e = edgePt(cx, cy, s, d);
    var c = from || { x: cx, y: cy };
    var L = Math.hypot(e.x - c.x, e.y - c.y);
    if (L < 1) return;
    var gap = s / 4;
    var sp = s * Math.min(2.2, 0.7 + Math.sqrt(Math.abs(f)) * 0.9);
    var off = ((t * sp) % gap + gap) % gap;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (var u = off; u < L; u += gap) {
      var k = f > 0 ? u / L : 1 - u / L;    // f > 0: entering at the edge, moving to centre
      var x = e.x + (c.x - e.x) * k, y = e.y + (c.y - e.y) * k;
      g.fillStyle = short ? 'rgba(255,90,60,.4)' : 'rgba(255,230,90,.35)'; g.beginPath(); g.arc(x, y, s * 0.075, 0, 7); g.fill();
      g.fillStyle = short ? '#ffd0b0' : '#fffbe0'; g.beginPath(); g.arc(x, y, s * 0.04, 0, 7); g.fill();
    }
    g.restore();
  }

  function plate(g, x, y, s, style) {
    var p = s * 0.05;
    var col = style === 'placed' ? ['#4654c8', '#2f3a9a', '#1c2370'] : style === 'spin' ? ['#3d3f9e', '#2b2c7e', '#181a55'] : ['#323b8e', '#262d75', '#151a4c'];
    g.fillStyle = col[2]; LE.rr(g, x + p, y + p + s * 0.04, s - 2 * p, s - 2 * p, s * 0.16); g.fill();
    var gr = g.createLinearGradient(0, y + p, 0, y + s - p);
    gr.addColorStop(0, col[0]); gr.addColorStop(1, col[1]);
    g.fillStyle = gr; LE.rr(g, x + p, y + p, s - 2 * p, s - 2 * p, s * 0.16); g.fill();
    if (style === 'placed') {
      g.strokeStyle = 'rgba(95,224,255,.55)'; g.lineWidth = Math.max(1.5, s * 0.03);
      LE.rr(g, x + p + 1, y + p + 1, s - 2 * p - 2, s - 2 * p - 2, s * 0.15); g.stroke();
    } else {
      g.fillStyle = 'rgba(255,255,255,.08)'; LE.rr(g, x + p + s * 0.04, y + p + s * 0.03, s - 2 * p - s * 0.08, s * 0.12, s * 0.06); g.fill();
    }
    // bolts in the corners of fixed plates
    if (style !== 'placed') {
      g.fillStyle = 'rgba(0,0,0,.25)';
      [[0.16, 0.16], [0.84, 0.16], [0.16, 0.84], [0.84, 0.84]].forEach(function (q) { g.beginPath(); g.arc(x + s * q[0], y + s * q[1], s * 0.025, 0, 7); g.fill(); });
    }
  }
  function spinBadge(g, x, y, s) {
    var bx = x + s * 0.8, by = y + s * 0.2, r = s * 0.11;
    g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(bx, by, r, 0, 7); g.fill();
    g.strokeStyle = '#6a4c00'; g.lineWidth = Math.max(1.5, s * 0.025);
    g.beginPath(); g.arc(bx, by, r * 0.55, -0.3, 4.2); g.stroke();
    g.fillStyle = '#6a4c00'; g.beginPath();
    g.moveTo(bx + r * 0.55 + r * 0.3, by - r * 0.2); g.lineTo(bx + r * 0.55 - r * 0.3, by - r * 0.2); g.lineTo(bx + r * 0.55, by + r * 0.3); g.fill();
  }

  function drawRock(g, cx, cy, s) {
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx, cy + s * 0.26, s * 0.34, s * 0.09, 0, 0, 7); g.fill();
    var gr = g.createLinearGradient(0, cy - s * 0.3, 0, cy + s * 0.3);
    gr.addColorStop(0, '#8f90c4'); gr.addColorStop(1, '#4b4c80');
    g.fillStyle = gr; g.strokeStyle = '#2c2d5a'; g.lineWidth = Math.max(1.5, s * 0.035);
    g.beginPath();
    g.moveTo(cx - s * 0.34, cy + s * 0.24); g.lineTo(cx - s * 0.28, cy - s * 0.06); g.lineTo(cx - s * 0.06, cy - s * 0.28);
    g.lineTo(cx + s * 0.2, cy - s * 0.22); g.lineTo(cx + s * 0.34, cy + s * 0.04); g.lineTo(cx + s * 0.3, cy + s * 0.24); g.closePath();
    g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(cx - s * 0.1, cy - s * 0.14, s * 0.08, s * 0.04, -0.5, 0, 7); g.fill();
  }

  function drawBattery(g, cx, cy, s, dirPlus, shake) {
    g.save(); g.translate(cx + shake * (Math.random() - 0.5) * s * 0.08, cy);
    g.rotate(dirPlus * Math.PI / 2);   // + end points to "up" in local coords
    var L = s * 0.6, W = s * 0.36;
    g.fillStyle = 'rgba(0,0,0,.3)'; LE.rr(g, -W / 2, -L / 2 + s * 0.04, W, L, s * 0.08); g.fill();
    g.fillStyle = '#c9ced8'; g.strokeStyle = '#1f2340'; g.lineWidth = Math.max(1.5, s * 0.03);
    LE.rr(g, -W * 0.22, -L / 2 - s * 0.07, W * 0.44, s * 0.1, s * 0.03); g.fill(); g.stroke();
    var gr = g.createLinearGradient(-W / 2, 0, W / 2, 0);
    gr.addColorStop(0, '#ff8a9a'); gr.addColorStop(0.5, '#ff5d73'); gr.addColorStop(1, '#c9304a');
    g.fillStyle = gr; LE.rr(g, -W / 2, -L / 2, W, L, s * 0.08); g.fill(); g.stroke();
    var gr2 = g.createLinearGradient(-W / 2, 0, W / 2, 0);
    gr2.addColorStop(0, '#5a6086'); gr2.addColorStop(1, '#2a2f4a');
    g.fillStyle = gr2; LE.rr(g, -W / 2, 0, W, L / 2, s * 0.08); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; LE.rr(g, -W / 2 + s * 0.04, -L / 2 + s * 0.04, s * 0.05, L - s * 0.08, s * 0.025); g.fill();
    g.restore();
    // signs (kept upright)
    var a = dirPlus * Math.PI / 2;
    var px = cx + Math.sin(a) * s * 0.15, py = cy - Math.cos(a) * s * 0.15;
    var mx = cx - Math.sin(a) * s * 0.15, my = cy + Math.cos(a) * s * 0.15;
    g.fillStyle = '#fff'; g.font = '900 ' + Math.round(s * 0.22) + 'px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('+', px, py + s * 0.01); g.fillText('−', mx, my);
  }

  function drawHouse(g, cx, cy, s, glow, sleepy, t) {
    var w = s * 0.5, hh = s * 0.32, by = cy + s * 0.22;   // base y
    g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(cx, by + s * 0.02, w * 0.62, s * 0.05, 0, 0, 7); g.fill();
    var ol = Math.max(1.5, s * 0.03);
    // chimney
    g.fillStyle = sleepy ? '#5b4bb0' : '#b5452f'; g.strokeStyle = '#1f2340'; g.lineWidth = ol;
    g.fillRect(cx + w * 0.22, by - hh - s * 0.2, s * 0.08, s * 0.14); g.strokeRect(cx + w * 0.22, by - hh - s * 0.2, s * 0.08, s * 0.14);
    // walls
    var wg = g.createLinearGradient(0, by - hh, 0, by);
    if (sleepy) { wg.addColorStop(0, '#c8c0ff'); wg.addColorStop(1, '#9a8fe0'); } else { wg.addColorStop(0, '#ffe2b8'); wg.addColorStop(1, '#f2b97c'); }
    g.fillStyle = wg; LE.rr(g, cx - w / 2, by - hh, w, hh, s * 0.03); g.fill(); g.stroke();
    // roof
    g.fillStyle = sleepy ? '#7f6bd6' : '#ff6b4a';
    g.beginPath(); g.moveTo(cx - w / 2 - s * 0.06, by - hh + s * 0.01); g.lineTo(cx, by - hh - s * 0.24); g.lineTo(cx + w / 2 + s * 0.06, by - hh + s * 0.01); g.closePath();
    g.lineJoin = 'round'; g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(cx - w / 2, by - hh - s * 0.01); g.lineTo(cx, by - hh - s * 0.2); g.lineTo(cx - w * 0.1, by - hh - s * 0.03); g.fill();
    // windows
    var lit = glow;
    var wc = lit > 0.02 ? 'rgb(' + Math.round(70 + 185 * lit) + ',' + Math.round(70 + 160 * lit) + ',' + Math.round(110 - 20 * lit) + ')' : '#2e3366';
    var ws = s * 0.11;
    [[-0.36, 0.62], [0.12, 0.62]].forEach(function (q) {
      var wx = cx + q[0] * w * 1.0, wy = by - hh * q[1] - ws / 2 + s * 0.02;
      g.fillStyle = wc; LE.rr(g, wx, wy, ws * 1.1, ws, s * 0.02); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(31,35,64,.6)'; g.lineWidth = Math.max(1, s * 0.015);
      g.beginPath(); g.moveTo(wx + ws * 0.55, wy); g.lineTo(wx + ws * 0.55, wy + ws); g.stroke();
      g.strokeStyle = '#1f2340'; g.lineWidth = ol;
    });
    // door
    g.fillStyle = sleepy ? '#5b4bb0' : '#8a4b2a'; LE.rr(g, cx - s * 0.05, by - s * 0.15, s * 0.1, s * 0.15, s * 0.03); g.fill(); g.stroke();
    if (sleepy) {
      if (lit < 0.05) {
        g.fillStyle = '#fff'; g.font = '900 ' + Math.round(s * 0.14) + 'px system-ui, sans-serif'; g.textAlign = 'center';
        var bob = Math.sin(t * 2) * s * 0.03;
        g.globalAlpha = 0.85; g.fillText('z', cx + w * 0.5, by - hh - s * 0.12 + bob);
        g.font = '900 ' + Math.round(s * 0.1) + 'px system-ui, sans-serif'; g.fillText('z', cx + w * 0.68, by - hh - s * 0.24 - bob); g.globalAlpha = 1;
      } else {
        g.fillStyle = '#ff5d73'; g.beginPath(); g.arc(cx + w * 0.55, by - hh - s * 0.16, s * 0.09, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = '900 ' + Math.round(s * 0.14) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('!', cx + w * 0.55, by - hh - s * 0.155);
      }
    }
  }

  function drawLamp(g, cx, cy, s, glow) {
    var r = s * 0.16;
    var by = cy - s * 0.02;
    g.fillStyle = '#8a93ad'; g.strokeStyle = '#1f2340'; g.lineWidth = Math.max(1.5, s * 0.03);
    LE.rr(g, cx - r * 0.55, by + r * 0.75, r * 1.1, r * 0.75, s * 0.02); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(31,35,64,.5)'; g.lineWidth = Math.max(1, s * 0.015);
    for (var i = 1; i < 3; i++) { g.beginPath(); g.moveTo(cx - r * 0.55, by + r * 0.75 + i * r * 0.25); g.lineTo(cx + r * 0.55, by + r * 0.75 + i * r * 0.25); g.stroke(); }
    var gr = g.createRadialGradient(cx - r * 0.3, by - r * 0.3, r * 0.1, cx, by, r);
    if (glow > 0.02) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, 'rgb(255,' + Math.round(200 + 40 * glow) + ',' + Math.round(60 + 40 * (1 - glow)) + ')'); }
    else { gr.addColorStop(0, '#f4f7ff'); gr.addColorStop(1, '#aab4d0'); }
    g.fillStyle = gr; g.strokeStyle = '#1f2340'; g.lineWidth = Math.max(1.5, s * 0.03);
    g.beginPath(); g.arc(cx, by, r, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = glow > 0.02 ? '#ff9a1c' : '#6b7290'; g.lineWidth = Math.max(1.2, s * 0.022);
    g.beginPath(); g.moveTo(cx - r * 0.3, by + r * 0.75); g.lineTo(cx - r * 0.25, by + r * 0.1); g.arc(cx, by + r * 0.1, r * 0.25, Math.PI, 0); g.lineTo(cx + r * 0.3, by + r * 0.75); g.stroke();
  }

  function drawFan(g, cx, cy, s, ang, speed) {
    var R = s * 0.3;
    g.fillStyle = '#3a4070'; g.strokeStyle = '#1f2340'; g.lineWidth = Math.max(1.5, s * 0.03);
    g.beginPath(); g.arc(cx, cy, R * 0.98, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(160,180,255,.35)'; g.lineWidth = Math.max(1, s * 0.015);
    g.beginPath(); g.arc(cx, cy, R * 0.8, 0, 7); g.stroke();
    if (speed > 0.6) { g.fillStyle = 'rgba(95,224,255,' + Math.min(0.35, speed * 0.15) + ')'; g.beginPath(); g.arc(cx, cy, R * 0.85, 0, 7); g.fill(); }
    g.save(); g.translate(cx, cy); g.rotate(ang);
    for (var i = 0; i < 3; i++) {
      g.rotate(Math.PI * 2 / 3);
      g.fillStyle = '#5fe0ff'; g.strokeStyle = '#1f6f8f'; g.lineWidth = Math.max(1.2, s * 0.022);
      g.beginPath(); g.ellipse(0, -R * 0.45, R * 0.2, R * 0.42, 0.25, 0, 7); g.fill(); g.stroke();
    }
    g.restore();
    g.fillStyle = '#ffd23f'; g.strokeStyle = '#1f2340'; g.lineWidth = Math.max(1.5, s * 0.025);
    g.beginPath(); g.arc(cx, cy, R * 0.2, 0, 7); g.fill(); g.stroke();
  }

  function drawSwitch(g, cx, cy, s, da, db, on, k) {
    var a = edgePt(cx, cy, s, da), b = edgePt(cx, cy, s, db);
    var pa = { x: cx + (a.x - cx) * 0.48, y: cy + (a.y - cy) * 0.48 };
    var pb = { x: cx + (b.x - cx) * 0.48, y: cy + (b.y - cy) * 0.48 };
    // base
    g.fillStyle = '#4b5280'; g.strokeStyle = '#1f2340'; g.lineWidth = Math.max(1.5, s * 0.03);
    LE.rr(g, cx - s * 0.32, cy - s * 0.32, s * 0.64, s * 0.64, s * 0.12); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.12)'; LE.rr(g, cx - s * 0.28, cy - s * 0.29, s * 0.56, s * 0.1, s * 0.05); g.fill();
    [pa, pb].forEach(function (p) { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(p.x, p.y, s * 0.06, 0, 7); g.fill(); g.stroke(); });
    // lever: from pa toward pb; open = rotated up/away
    var ang = Math.atan2(pb.y - pa.y, pb.x - pa.x);
    var lift = (1 - k) * -0.75;     // k: 0 = open, 1 = closed (animated)
    var len = Math.hypot(pb.x - pa.x, pb.y - pa.y);
    g.save(); g.translate(pa.x, pa.y); g.rotate(ang + lift);
    g.fillStyle = k > 0.5 ? '#43e07a' : '#ff5d73'; g.strokeStyle = '#1f2340';
    LE.rr(g, -s * 0.04, -s * 0.045, len + s * 0.06, s * 0.09, s * 0.04); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(len, 0, s * 0.055, 0, 7); g.fill(); g.stroke();
    g.restore();
    // LED
    var lx = cx + (DY[da] !== 0 ? s * 0.2 : 0), ly = cy + (DY[da] !== 0 ? 0 : s * 0.2);
    g.fillStyle = on ? '#43e07a' : '#ff5d73';
    g.beginPath(); g.arc(lx, ly, s * 0.045, 0, 7); g.fill();
    if (on) { g.fillStyle = 'rgba(67,224,122,.3)'; g.beginPath(); g.arc(lx, ly, s * 0.09, 0, 7); g.fill(); }
  }

  /** Draw a single tile at cell centre. info: { flow, glow, ang, fanSpeed, swK, short, t, ra }
   *  phase: 'plate' | 'wire' | 'glow' | 'body' (undefined = all, used for icons). Drawing the board in phases
   *  keeps glows from one tile from being covered by its neighbour's plate. */
  function drawTile(g, tile, cx, cy, s, info, phase) {
    info = info || {};
    var all = !phase;
    var t = info.t || 0;
    var k = CL.kind(tile.t);
    if (k === 'rock') { if (all || phase === 'body') drawRock(g, cx, cy, s); return; }
    var ts = CL.terminals(tile.t, tile.r);
    var x0 = cx - s / 2, y0 = cy - s / 2;
    if ((all || phase === 'plate') && !info.noPlate) plate(g, x0, y0, s, tile.placed ? 'placed' : tile.spin ? 'spin' : 'fixed');
    if (phase === 'plate') return;
    var ra = info.ra || 0;
    var segs = [], ends = [];
    var powered = info.flow && info.flow.some(function (v) { return v !== 0; });
    var bodyR = k === 'wire' ? 0 : s * (k === 'battery' || k === 'switch' ? 0.3 : 0.26);
    ts.forEach(function (d) {
      var e = edgePt(cx, cy, s, d);
      var inner = { x: cx + DX[d] * bodyR * 0.6, y: cy + DY[d] * bodyR * 0.6 };
      segs.push([e.x, e.y, inner.x, inner.y]); ends.push(inner);
    });
    g.save();
    if (ra) { g.translate(cx, cy); g.rotate(ra); g.translate(-cx, -cy); }
    if (all || phase === 'wire') copper(g, segs, s);
    if (phase === 'glowc' && powered && info.glowOut) {
      {
        segs.forEach(function (q) {
          if (ra) {
            var p1 = { x: q[0], y: q[1] }, p2 = { x: q[2], y: q[3] };
            var c = Math.cos(ra), sn = Math.sin(ra);
            var r1 = { x: cx + (p1.x - cx) * c - (p1.y - cy) * sn, y: cy + (p1.x - cx) * sn + (p1.y - cy) * c };
            var r2 = { x: cx + (p2.x - cx) * c - (p2.y - cy) * sn, y: cy + (p2.x - cx) * sn + (p2.y - cy) * c };
            info.glowOut.push([r1.x, r1.y, r2.x, r2.y]);
          } else info.glowOut.push(q);
        });
      }
    }
    if ((all || phase === 'glow') && powered) {
      if (!info.glowOut) glowSegs(g, segs, s, 1, info.short);
      ts.forEach(function (d, i) { dots(g, cx, cy, s, info.flow, t, d, ends[i], info.short); });
    }
    if ((all || phase === 'body') && k === 'wire' && ts.length > 2) {
      g.fillStyle = powered ? (info.short ? '#ff8a5a' : '#ffe14d') : '#f0a85a'; g.strokeStyle = '#4a2208'; g.lineWidth = Math.max(1.5, s * 0.03);
      g.beginPath(); g.arc(cx, cy, s * 0.1, 0, 7); g.fill(); g.stroke();
    }
    if ((all || phase === 'body') && k === 'battery') drawBattery(g, cx, cy, s, ts[0], info.short ? 1 : 0);
    if ((all || phase === 'body') && k === 'switch') drawSwitch(g, cx, cy, s, ts[0], ts[1], !!tile.on, info.swK === undefined ? (tile.on ? 1 : 0) : info.swK);
    g.restore();
    if (all || phase === 'body') {
      if (k === 'bulb' && CL.TYPES[tile.t].house) drawHouse(g, cx, cy, s, info.glow || 0, !!CL.TYPES[tile.t].sleepy, t);
      else if (k === 'bulb') drawLamp(g, cx, cy, s, info.glow || 0);
      else if (k === 'motor') drawFan(g, cx, cy, s, info.ang || 0, info.fanSpeed || 0);
      if (tile.spin && !tile.placed) spinBadge(g, x0, y0, s);
    }
  }

  function halo(g, cx, cy, s, glow, color) {
    if (glow <= 0.02) return;
    g.save(); g.globalCompositeOperation = 'lighter';
    var R = s * (0.5 + 0.55 * glow);
    var gr = g.createRadialGradient(cx, cy, 0, cx, cy, R);
    gr.addColorStop(0, 'rgba(' + color + ',' + (0.55 * glow) + ')');
    gr.addColorStop(0.5, 'rgba(' + color + ',' + (0.2 * glow) + ')');
    gr.addColorStop(1, 'rgba(' + color + ',0)');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.restore();
  }

  /** Render a tile icon to a canvas (tray + ghosts). */
  function tileIcon(type, size, r, noPlate) {
    var c = document.createElement('canvas');
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = c.height = Math.round(size * dpr);
    c.style.width = c.style.height = size + 'px';
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawTile(g, { t: type, r: r || 0, placed: true, on: true }, size / 2, size / 2, size, { t: 0, noPlate: !!noPlate });
    return c;
  }

  /* ================= View ================= */
  function create(host, level, ctx) {
    var parsed = CL.parse(level);
    var W = parsed.w, H = parsed.h;
    var trayTypes = Object.keys(CL.remaining(level, CL.initialState(level))).sort(function (a, b) { return TRAY_ORDER.indexOf(a) - TRAY_ORDER.indexOf(b); });
    var state = sanitize(ctx.savedState) || CL.initialState(level);
    var res = null, destroyed = false, won = false, busy = false, winT = 0, raf = 0;
    var selected = null;            // tray type picked by tap
    var anim = {};                  // per cell animation values
    var lastStatus = null, prevLevels = {};
    var t0 = performance.now(), lastT = t0;
    var sparkT = 0;

    function sanitize(s) {
      if (!s || !Array.isArray(s.placed)) return null;
      var st = CL.cloneState(s);
      var left = CL.remaining(level, { placed: [] });
      var used = {};
      st.placed = st.placed.filter(function (p) {
        if (!CL.TYPES[p.t] || left[p.t] === undefined) return false;
        if (p.x < 0 || p.y < 0 || p.x >= parsed.w || p.y >= parsed.h || parsed.cells[p.y][p.x]) return false;
        var k = p.x + ',' + p.y;
        if (used[k]) return false;
        used[k] = 1;
        if (left[p.t] <= 0) return false;
        left[p.t]--;
        return true;
      });
      return st;
    }

    /* ----- DOM ----- */
    var root = h('div.ci-wrap');
    var goalsEl = h('div.ci-goals');
    var boardWrap = h('div.ci-board-wrap');
    var canvas = h('canvas.ci-board');
    boardWrap.appendChild(canvas);
    var tray = h('div.ci-tray');
    root.append(goalsEl, boardWrap, tray);
    host.appendChild(root);

    var trayEls = {};
    trayTypes.forEach(function (tp) {
      var el = h('div.ci-tray-item.pressable', { 'data-type': tp, role: 'button', 'aria-label': LABELS[tp] || tp });
      el.appendChild(tileIcon(tp, 50, tp === 'I' ? 1 : 0, true));
      el.appendChild(h('div.ci-count'));
      trayEls[tp] = el;
      tray.appendChild(el);
      el.addEventListener('pointerdown', function (e) { startDrag(e, { type: tp }); });
    });

    var B = { cell: 60, ox: 6, oy: 6, w: 0, h: 0, g: null, cw: 0, ch: 0 };
    function layoutBoard() {
      var r = boardWrap.getBoundingClientRect();
      var cw = Math.max(120, r.width), chh = Math.max(120, r.height);
      var cell = Math.floor(Math.min((cw - 16) / W, (chh - 16) / H, 96));
      B.cell = cell; B.w = cell * W; B.h = cell * H;
      var f = LE.fitCanvas(canvas, B.w + 16, B.h + 18);
      B.g = f.ctx; B.ox = 8; B.oy = 8; B.cw = B.w + 16; B.ch = B.h + 18;
    }
    function cellRect(x, y) {
      var r = canvas.getBoundingClientRect();
      return { left: r.left + B.ox + x * B.cell, top: r.top + B.oy + y * B.cell, width: B.cell, height: B.cell };
    }
    function cellAt(cx, cy) {
      var r = canvas.getBoundingClientRect();
      var x = Math.floor((cx - r.left - B.ox) / B.cell), y = Math.floor((cy - r.top - B.oy) / B.cell);
      if (x < 0 || y < 0 || x >= W || y >= H) return null;
      return { x: x, y: y };
    }

    /* ----- State helpers ----- */
    function key(x, y) { return x + ',' + y; }
    function fixedAt(x, y) { return parsed.cells[y][x]; }
    function placedIndex(x, y) {
      for (var i = 0; i < state.placed.length; i++) if (state.placed[i].x === x && state.placed[i].y === y) return i;
      return -1;
    }
    function left() { return CL.remaining(level, state); }
    function changed(quiet) {
      ctx.saveState(CL.cloneState(state));
      refresh(quiet);
    }

    function placeTile(type, x, y, r) {
      if (won) return false;
      if (fixedAt(x, y)) return false;
      var i = placedIndex(x, y);
      var swapped = null;
      if (i >= 0) swapped = state.placed.splice(i, 1)[0];
      if ((left()[type] || 0) <= 0) {
        if (swapped) state.placed.splice(i, 0, swapped);
        ctx.sfx('buzz'); LE.shake(trayEls[type]); return false;
      }
      if (r === undefined) r = CL.autoRot(level, state, type, x, y, parsed);
      state.placed.push({ t: type, x: x, y: y, r: r });
      anim[key(x, y)] = Object.assign(anim[key(x, y)] || {}, { pop: 1, ra: 0 });
      ctx.sfx('place');
      var cr = cellRect(x, y);
      ctx.fx.burst(cr.left + cr.width / 2, cr.top + cr.height / 2, { n: 8, color: '#5fe0ff', speed: 3, size: 5, g: 0 });
      if (selected && left()[selected] <= 0) selected = null;
      changed();
      ctx.emit('place', { type: type, x: x, y: y });
      return true;
    }
    function removeAt(x, y) {
      var i = placedIndex(x, y);
      if (i < 0 || won) return false;
      state.placed.splice(i, 1);
      var cr = cellRect(x, y);
      ctx.fx.burst(cr.left + cr.width / 2, cr.top + cr.height / 2, { n: 10, color: '#ffffff', speed: 4, size: 6 });
      ctx.sfx('remove');
      changed();
      ctx.emit('remove', { x: x, y: y });
      return true;
    }
    function moveTile(fx, fy, x, y) {
      var i = placedIndex(fx, fy);
      if (i < 0 || fixedAt(x, y) || placedIndex(x, y) >= 0) return false;
      var p = state.placed[i];
      p.x = x; p.y = y;
      anim[key(x, y)] = { pop: 1, ra: 0 };
      ctx.sfx('place');
      changed();
      ctx.emit('move', { x: x, y: y });
      return true;
    }
    function rotateAt(x, y) {
      if (won) return false;
      var k = key(x, y);
      var i = placedIndex(x, y), f = fixedAt(x, y);
      var step = 1;
      if (i >= 0) state.placed[i].r = (state.placed[i].r + 1) % 4;
      else if (f && f.spin) {
        step = CL.kind(f.t) === 'battery' ? 2 : 1;
        var cur = state.rots[k] !== undefined ? state.rots[k] : f.r;
        state.rots[k] = (cur + step) % 4;
      } else return false;
      anim[k] = Object.assign(anim[k] || {}, { ra: -step * Math.PI / 2 });
      ctx.sfx('rotate');
      changed();
      ctx.emit('rotate', { x: x, y: y });
      return true;
    }
    function toggleAt(x, y) {
      if (won) return false;
      var f = fixedAt(x, y);
      if (!f || CL.kind(f.t) !== 'switch') return false;
      var k = key(x, y);
      var cur = state.sw[k] !== undefined ? state.sw[k] : !!f.on;
      state.sw[k] = !cur;
      ctx.sfx('click');
      changed();
      ctx.emit('switch', { x: x, y: y, on: !cur });
      return true;
    }
    function resetBoard(quiet) {
      clearTimeout(winT);
      state = CL.initialState(level);
      selected = null;
      lastStatus = null;
      changed(true);
      if (!quiet) ctx.sfx('whoosh');
    }

    /* ----- Live evaluation ----- */
    function goalIcon(type) {
      var s = { house: '<path d="M4 13 L14 4 L24 13 V24 H4 Z" fill="#ffd9a8" stroke="#1f2340" stroke-width="2.5" stroke-linejoin="round"/><path d="M2 14 L14 3 L26 14" fill="none" stroke="#ff6b4a" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><rect x="11" y="15" width="6" height="6" fill="#ffe36b" stroke="#1f2340" stroke-width="1.5"/>',
        sleepy: '<path d="M4 13 L14 4 L24 13 V24 H4 Z" fill="#b9b0f0" stroke="#1f2340" stroke-width="2.5" stroke-linejoin="round"/><circle cx="20" cy="7" r="5" fill="#ffe9a8"/><circle cx="22.5" cy="5.5" r="4" fill="#3b2f7a"/>',
        fan: '<circle cx="14" cy="14" r="11" fill="#3a4070" stroke="#1f2340" stroke-width="2"/><g fill="#5fe0ff" stroke="#1f6f8f" stroke-width="1.2"><ellipse cx="14" cy="8" rx="3" ry="6"/><ellipse cx="14" cy="8" rx="3" ry="6" transform="rotate(120 14 14)"/><ellipse cx="14" cy="8" rx="3" ry="6" transform="rotate(240 14 14)"/></g><circle cx="14" cy="14" r="2.5" fill="#ffd23f"/>',
        lamp: '<circle cx="14" cy="11" r="8" fill="#fff27a" stroke="#1f2340" stroke-width="2.5"/><rect x="10" y="18" width="8" height="6" rx="1.5" fill="#9aa3b5" stroke="#1f2340" stroke-width="2"/>' };
      s.lamps = s.lamp;
      return '<svg viewBox="0 0 28 28">' + (s[type] || '') + '</svg>';
    }
    function renderGoals() {
      var groups = {};
      res.goals.forEach(function (gl) {
        var gtype = gl.type === 'lamps' ? 'lamp' : gl.type;
        var gr = groups[gtype] = groups[gtype] || { ok: 0, n: 0 };
        gr.n += gl.type === 'lamps' ? gl.need : 1;
        gr.ok += gl.type === 'lamps' ? Math.min(gl.count, gl.need) : gl.ok ? 1 : 0;
      });
      var html = '';
      ['house', 'lamp', 'fan', 'sleepy'].forEach(function (tp) {
        var gr = groups[tp];
        if (!gr) return;
        var done = gr.ok >= gr.n;
        var label = tp === 'sleepy' ? (done ? 'Zzz' : '!') : gr.ok + '/' + gr.n;
        html += '<div class="ci-goal' + (done ? ' done' : '') + (tp === 'sleepy' ? ' sleepy' : '') + '" data-goal="' + tp + '">' + goalIcon(tp) + '<span>' + label + '</span>' + (done ? '<b>✓</b>' : '') + '</div>';
      });
      if (level.need === 'bright' || level.needFan === 'fast') html += '<div class="ci-goal bright"><svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="6" fill="#ffe14d"/><g stroke="#ffe14d" stroke-width="2.5" stroke-linecap="round"><path d="M14 2v4M14 22v4M2 14h4M22 14h4M5.5 5.5l2.8 2.8M19.7 19.7l2.8 2.8M5.5 22.5l2.8-2.8M19.7 8.3l2.8-2.8"/></g></svg><span>' + (level.needFan === 'fast' && level.need !== 'bright' ? 'Fast!' : 'Bright!') + '</span></div>';
      if (goalsEl.innerHTML !== html) goalsEl.innerHTML = html;
    }
    function renderTray() {
      var l = left();
      trayTypes.forEach(function (tp) {
        var el = trayEls[tp], n = Math.max(0, l[tp] || 0);
        el.querySelector('.ci-count').textContent = n;
        el.classList.toggle('empty', n <= 0);
        el.classList.toggle('sel', selected === tp);
      });
    }

    function refresh(quiet) {
      res = CL.evaluate(level, state, parsed);
      renderGoals();
      renderTray();
      // feedback for newly lit parts
      var newLevels = {};
      Object.keys(res.parts).forEach(function (k) {
        var p = res.parts[k];
        if (p.kind !== 'bulb' && p.kind !== 'motor') return;
        newLevels[k] = p.level;
        var was = prevLevels[k] || 0;
        if (!quiet && p.level > was) {
          var xy = k.split(',').map(Number), cr = cellRect(xy[0], xy[1]);
          if (p.kind === 'motor') ctx.sfx('motor');
          else { ctx.sfx('zap'); ctx.fx.sparkle(cr.left + cr.width / 2, cr.top + cr.height / 2, '#ffe14d'); }
        }
      });
      prevLevels = newLevels;
      var st = res.status;
      if (st !== lastStatus) {
        var prev = lastStatus;
        lastStatus = st;
        if (!quiet && prev !== null) {
          if (st === 'short') {
            ctx.sfx('spark'); burstShort();
            var hasLamp = (left().P || 0) > 0 || trayTypes.indexOf('P') >= 0;
            ctx.fail({ message: hasLamp ? 'Whoa, sparks! The power took a shortcut. Put a lamp in the path.' : 'Whoa, sparks! The power took a shortcut. Put a light in the path.' });
          } else if (st === 'sleepy') {
            ctx.fail({ message: 'Shh! The sleepy house woke up! Keep it dark.' });
          } else if (st === 'dim') {
            var fanSlow = res.goals.some(function (g) { return g.type === 'fan' && g.level === 1; });
            ctx.fail({ message: fanSlow ? 'The fan is slow! Give it its own path.' : 'The lights are dim! Can you make them bright?' });
          }
        }
      }
      clearTimeout(winT);
      if (res.solved && !won && !quiet) {
        winT = setTimeout(celebrate, 450 / LE.speed);
      }
    }
    function burstShort() {
      res.shortAt.forEach(function (k) {
        var xy = k.split(',').map(Number), cr = cellRect(xy[0], xy[1]);
        ctx.fx.burst(cr.left + cr.width / 2, cr.top + cr.height / 2, { n: 16, color: '#ffe14d', shape: 'star', size: 8, speed: 6 });
      });
    }
    async function celebrate() {
      if (won || destroyed || !res.solved) return;
      won = true; busy = true; selected = null; renderTray();
      root.classList.add('won');
      ctx.sfx('ding');
      res.goals.forEach(function (gl) {
        if (gl.key === 'lamps' || gl.type === 'sleepy') return;
        var xy = gl.key.split(',').map(Number), cr = cellRect(xy[0], xy[1]);
        ctx.fx.burst(cr.left + cr.width / 2, cr.top + cr.height / 2, { n: 14, color: '#ffe14d', shape: 'star', size: 9, speed: 5, g: 0.05 });
      });
      flash = 1;
      await LE.wait(900);
      if (destroyed) return;
      busy = false;
      var stars = CL.score(level, state, res);
      var n = CL.countPlaced(state);
      var note = stars < 3 ? 'Tip: use only ' + level.par + ' tile' + (level.par > 1 ? 's' : '') + ' for 3 stars!' : (level.winNote || null);
      ctx.win({ stars: stars, note: note, tiles: n });
    }
    var flash = 0;

    /* ----- Board rendering ----- */
    function drawBoard() {
      var g = B.g;
      if (!g) return;
      var now = performance.now();
      var t = (now - t0) / 1000, dt = Math.min(0.05, (now - lastT) / 1000) * LE.speed;
      lastT = now;
      var s = B.cell;
      g.clearRect(0, 0, B.cw, B.ch);
      // board base with depth
      g.fillStyle = '#0d1036'; LE.rr(g, 2, 8, B.w + 12, B.h + 9, 18); g.fill();
      var bg = g.createLinearGradient(0, 0, 0, B.h + 16);
      bg.addColorStop(0, '#2a3080'); bg.addColorStop(1, '#1b1f5e');
      g.fillStyle = bg; LE.rr(g, 2, 2, B.w + 12, B.h + 12, 18); g.fill();
      g.strokeStyle = 'rgba(120,140,255,.35)'; g.lineWidth = 2; LE.rr(g, 3, 3, B.w + 10, B.h + 10, 17); g.stroke();
      var grid = res.grid.grid;
      var short = res.short;
      var hover = drag && drag.moved && drag.hover;
      // empty cells
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var px = B.ox + x * s, py = B.oy + y * s;
        g.fillStyle = 'rgba(8,10,40,.45)'; LE.rr(g, px + s * 0.05, py + s * 0.05, s * 0.9, s * 0.9, s * 0.16); g.fill();
        if (!grid[y][x] || (drag && drag.src.x === x && drag.src.y === y && drag.moved)) {
          var sel = selected && !fixedAt(x, y) && placedIndex(x, y) < 0;
          g.strokeStyle = sel ? 'rgba(95,224,255,' + (0.5 + 0.4 * Math.sin(t * 6)) + ')' : 'rgba(130,150,255,.28)';
          g.lineWidth = sel ? 3 : 2; g.setLineDash(sel ? [] : [s * 0.08, s * 0.07]);
          LE.rr(g, px + s * 0.1, py + s * 0.1, s * 0.8, s * 0.8, s * 0.14); g.stroke();
          g.setLineDash([]);
          g.fillStyle = 'rgba(130,150,255,.35)'; g.beginPath(); g.arc(px + s / 2, py + s / 2, s * 0.04, 0, 7); g.fill();
        }
      }
      // tiles (update animation values, then draw in phases)
      var halos = [], items = [];
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        var tile = grid[y][x];
        if (!tile) continue;
        if (drag && drag.moved && drag.src.x === x && drag.src.y === y) continue;
        var k = key(x, y);
        var a = anim[k] = anim[k] || { pop: 0, ra: 0, glow: 0, ang: 0, spd: 0, swK: tile.on ? 1 : 0 };
        var part = res.parts[k];
        var target = part ? (part.level === 2 ? 1 : part.level === 1 ? 0.45 : 0) : 0;
        a.glow = (a.glow || 0) + (target - (a.glow || 0)) * Math.min(1, dt * 6);
        a.spd = (a.spd || 0) + (target - (a.spd || 0)) * Math.min(1, dt * 2.5);
        a.ang = (a.ang || 0) + a.spd * dt * 14 * (part && part.current < 0 ? -1 : 1);
        a.swK = (a.swK === undefined ? 0 : a.swK) + ((tile.on ? 1 : 0) - (a.swK || 0)) * Math.min(1, dt * 12);
        a.ra = (a.ra || 0) * Math.max(0, 1 - dt * 14);
        if (Math.abs(a.ra) < 0.01) a.ra = 0;
        a.pop = Math.max(0, (a.pop || 0) - dt * 3.5);
        var cx = B.ox + (x + 0.5) * s, cy = B.oy + (y + 0.5) * s;
        var sc = 1 + Math.sin(a.pop * Math.PI) * 0.15;
        if (flash > 0 && part && (part.kind === 'bulb' || part.kind === 'motor') && part.level > 0) sc *= 1 + Math.sin(flash * Math.PI * 3) * 0.06 * flash;
        items.push({ tile: tile, cx: cx, cy: cy, sc: sc, info: { flow: res.flow[k], glow: a.glow, ang: a.ang, fanSpeed: a.spd, swK: a.swK, short: short, t: t, ra: a.ra } });
        if (part && part.kind === 'bulb' && a.glow > 0.02) halos.push([cx, cy, a.glow, CL.TYPES[tile.t].sleepy ? '200,170,255' : '255,214,90']);
        if (part && part.kind === 'motor' && a.spd > 0.05) halos.push([cx, cy, a.spd * 0.5, '95,224,255']);
      }
      var glowAll = [];
      items.forEach(function (it) { it.info.glowOut = glowAll; });
      ['plate', 'wire', 'glowc', 'glow', 'body'].forEach(function (phase) {
        if (phase === 'glow') glowSegs(g, glowAll, s, 1, short);
        if (phase === 'body') halos.forEach(function (q) { halo(g, q[0], q[1], s, q[2], q[3]); });
        items.forEach(function (it) {
          g.save();
          if (it.sc !== 1) { g.translate(it.cx, it.cy); g.scale(it.sc, it.sc); g.translate(-it.cx, -it.cy); }
          drawTile(g, it.tile, it.cx, it.cy, s, it.info, phase);
          g.restore();
        });
      });
      if (flash > 0) flash = Math.max(0, flash - dt * 1.2);
      // sparks on short circuit
      if (short) {
        res.shortAt.forEach(function (k) {
          var xy = k.split(',').map(Number);
          var cx = B.ox + (xy[0] + 0.5) * s, cy = B.oy + (xy[1] + 0.5) * s;
          g.save(); g.globalCompositeOperation = 'lighter';
          var pulse = 0.5 + 0.5 * Math.sin(t * 18);
          var gr = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.8);
          gr.addColorStop(0, 'rgba(255,120,60,' + (0.45 * pulse) + ')'); gr.addColorStop(1, 'rgba(255,60,40,0)');
          g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, s * 0.8, 0, 7); g.fill();
          g.strokeStyle = '#fff6a0'; g.lineWidth = Math.max(1.5, s * 0.03); g.lineCap = 'round';
          for (var i = 0; i < 4; i++) {
            var ang = Math.floor(t * 12) * 1.7 + i * 1.57;
            g.beginPath(); var r0 = s * 0.25;
            g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
            for (var j = 1; j <= 3; j++) {
              var rr = r0 + j * s * 0.09, aa = ang + (j % 2 ? 0.35 : -0.35);
              g.lineTo(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr);
            }
            g.stroke();
          }
          g.restore();
        });
        sparkT -= dt;
        if (sparkT <= 0) { sparkT = 1.3; if (!ctx.fast) { burstShort(); } }
      }
      // drop hover highlight
      if (hover) {
        var okDrop = !fixedAt(hover.x, hover.y);
        g.strokeStyle = okDrop ? '#7dff9a' : '#ff5d73'; g.lineWidth = 4;
        LE.rr(g, B.ox + hover.x * s + 3, B.oy + hover.y * s + 3, s - 6, s - 6, s * 0.16); g.stroke();
      }
    }
    function frame() { if (destroyed) return; drawBoard(); raf = requestAnimationFrame(frame); }

    /* ----- Pointer: taps & drags ----- */
    var drag = null, ghostEl = null;
    function demo() { return ctx.isDemo && ctx.isDemo(); }
    canvas.addEventListener('pointerdown', function (e) {
      if (demo() || won) return;
      var c = cellAt(e.clientX, e.clientY);
      if (!c) return;
      startDrag(e, { x: c.x, y: c.y, placed: placedIndex(c.x, c.y) >= 0 });
    });
    function startDrag(e, src) {
      if (demo() || won) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      drag = { src: src, sx: e.clientX, sy: e.clientY, moved: false, hover: null };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }
    function makeGhost(type, r) {
      var el = h('div.ci-ghost');
      el.appendChild(tileIcon(type, Math.max(52, Math.min(80, B.cell)), r));
      document.body.appendChild(el);
      return el;
    }
    function onMove(e) {
      if (!drag) return;
      e.preventDefault();
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 10) {
        if (drag.src.type) { drag.moved = true; ghostEl = makeGhost(drag.src.type, drag.src.type === 'I' ? 1 : 0); ctx.sfx('pop'); }
        else if (drag.src.placed) {
          var p = state.placed[placedIndex(drag.src.x, drag.src.y)];
          drag.moved = true; ghostEl = makeGhost(p.t, p.r); ctx.sfx('pop');
        } else { drag.dead = true; }
      }
      if (drag.moved && ghostEl) {
        var gs = ghostEl.firstChild.getBoundingClientRect().width;
        var gx = e.clientX, gy = e.clientY - 34;
        ghostEl.style.transform = 'translate(' + (gx - gs / 2) + 'px,' + (gy - gs / 2) + 'px)';
        drag.hover = cellAt(gx, gy);
        var tr = tray.getBoundingClientRect();
        tray.classList.toggle('drop-hot', !!drag.src.placed && e.clientY > tr.top - 10);
      }
    }
    function endDrag() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      if (ghostEl) { ghostEl.remove(); ghostEl = null; }
      tray.classList.remove('drop-hot');
      var d = drag; drag = null;
      return d;
    }
    function onCancel() { endDrag(); }
    function onUp() {
      var d = endDrag();
      if (!d || d.dead || won) return;
      var src = d.src;
      if (!d.moved) {   // tap
        if (src.type) {
          if ((left()[src.type] || 0) <= 0) { ctx.sfx('buzz'); LE.shake(trayEls[src.type]); return; }
          selected = selected === src.type ? null : src.type;
          LE.bounce(trayEls[src.type], 1.1); ctx.sfx('click'); renderTray();
          return;
        }
        var f = fixedAt(src.x, src.y);
        if (src.placed) { rotateAt(src.x, src.y); return; }
        if (f && CL.kind(f.t) === 'switch') { toggleAt(src.x, src.y); return; }
        if (f && f.spin) { rotateAt(src.x, src.y); return; }
        if (!f && selected) { placeTile(selected, src.x, src.y); return; }
        if (f) {
          var cr = cellRect(src.x, src.y);
          ctx.fx.burst(cr.left + cr.width / 2, cr.top + cr.height / 2, { n: 5, color: '#9fb0ff', speed: 2, size: 4, g: 0 });
          ctx.sfx('tap');
        }
        return;
      }
      var hv = d.hover;
      if (src.type) {
        if (hv && !fixedAt(hv.x, hv.y)) placeTile(src.type, hv.x, hv.y);
        else ctx.sfx('whoosh');
      } else if (src.placed) {
        if (hv && hv.x === src.x && hv.y === src.y) { /* dropped back */ ctx.sfx('place'); }
        else if (hv && !fixedAt(hv.x, hv.y) && placedIndex(hv.x, hv.y) < 0) moveTile(src.x, src.y, hv.x, hv.y);
        else removeAt(src.x, src.y);
      }
    }

    /* ----- Targets / Show me ----- */
    function targetRect(k) {
      if (!k) return null;
      if (k === 'tray') return tray.getBoundingClientRect();
      if (k === 'board') return canvas.getBoundingClientRect();
      var m;
      if ((m = /^tray:(\w)$/.exec(k))) return trayEls[m[1]] ? trayEls[m[1]].getBoundingClientRect() : null;
      if ((m = /^cell:(\d+),(\d+)$/.exec(k))) return cellRect(+m[1], +m[2]);
      return null;
    }
    function ghostHTML(k) {
      var m, c = null;
      if ((m = /^tray:(\w)$/.exec(k || ''))) c = tileIcon(m[1], 56, m[1] === 'I' ? 1 : 0);
      else if ((m = /^cell:(\d+),(\d+)$/.exec(k || ''))) {
        var i = placedIndex(+m[1], +m[2]);
        if (i < 0) return null;
        c = tileIcon(state.placed[i].t, 56, state.placed[i].r);
      }
      if (!c) return null;
      return '<img class="ci-hand-ghost" src="' + c.toDataURL() + '" width="56" height="56" alt="">';
    }
    function showMeSteps() {
      var steps = [];
      var sol = level.solution;
      var init = CL.initialState(level);
      if (JSON.stringify(CL.cloneState(state)) !== JSON.stringify(init) || won) {
        steps.push({ from: 'board', say: 'Let\'s start fresh.', apply: function () { resetBoard(); }, pause: 400 });
      }
      // simulate placement to know auto-rotations
      var sim = CL.cloneState(init);
      init.placed.forEach(function (p) {
        var keep = sol.placed.some(function (q) { return q.x === p.x && q.y === p.y && q.t === p.t; });
        if (keep) return;
        steps.push({ from: 'cell:' + p.x + ',' + p.y, to: 'tray', say: 'Take this one away.', apply: function () { removeAt(p.x, p.y); } });
        sim.placed = sim.placed.filter(function (q) { return !(q.x === p.x && q.y === p.y); });
      });
      sol.placed.forEach(function (p) {
        var sym = CL.TYPES[p.t].sym;
        var existing = sim.placed.filter(function (q) { return q.x === p.x && q.y === p.y && q.t === p.t; })[0];
        var r0;
        if (existing) r0 = existing.r;
        else {
          r0 = CL.autoRot(level, sim, p.t, p.x, p.y, parsed);
          steps.push({ from: 'tray:' + p.t, to: 'cell:' + p.x + ',' + p.y, apply: function () { placeTile(p.t, p.x, p.y); } });
          sim.placed.push({ t: p.t, x: p.x, y: p.y, r: r0 });
        }
        var taps = 0;
        while (((r0 + taps) % 4) % sym !== p.r % sym && taps < 4) taps++;
        for (var i = 0; i < taps; i++) steps.push({ from: 'cell:' + p.x + ',' + p.y, say: i === 0 ? 'Tap to turn it!' : null, apply: function () { rotateAt(p.x, p.y); } });
        var simTile = sim.placed.filter(function (q) { return q.x === p.x && q.y === p.y; })[0];
        if (simTile) simTile.r = (r0 + taps) % 4;
      });
      Object.keys(sol.rots || {}).forEach(function (k) {
        var xy = k.split(',').map(Number), f = fixedAt(xy[0], xy[1]);
        if (!f) return;
        var step = CL.kind(f.t) === 'battery' ? 2 : 1, sym = CL.TYPES[f.t].sym;
        var r = f.r, n = 0;
        while ((r % 4) % sym !== sol.rots[k] % sym && n < 4) { r = (r + step) % 4; n++; }
        for (var i = 0; i < n; i++) steps.push({ from: 'cell:' + k, say: i === 0 ? 'Tap to turn it!' : null, apply: function () { rotateAt(xy[0], xy[1]); } });
      });
      Object.keys(sol.sw || {}).forEach(function (k) {
        var xy = k.split(',').map(Number), f = fixedAt(xy[0], xy[1]);
        if (!f || !!f.on === !!sol.sw[k]) return;
        steps.push({ from: 'cell:' + k, say: 'Tap the switch!', apply: function () { toggleAt(xy[0], xy[1]); }, pause: 400 });
      });
      return steps;
    }

    /* ----- Lifecycle ----- */
    function onResize() { layoutBoard(); }
    window.addEventListener('resize', onResize);
    res = CL.evaluate(level, state, parsed);
    lastStatus = null;
    refresh(true);
    lastStatus = res.status;
    requestAnimationFrame(function () {
      if (destroyed) return;
      layoutBoard(); frame();
      if (res.solved && !won) winT = setTimeout(celebrate, 600 / LE.speed);
    });

    return {
      get busy() { return busy; },
      noGo: true,
      target: targetRect,
      ghost: ghostHTML,
      showMe: showMeSteps,
      stop: function () {},
      reset: function () { won = false; root.classList.remove('won'); resetBoard(); },
      getState: function () { return CL.cloneState(state); },
      evaluate: function () { return res; },
      place: placeTile, rotate: rotateAt, toggle: toggleAt, remove: removeAt,
      destroy: function () {
        destroyed = true; clearTimeout(winT); cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize); endDrag(); root.remove();
      },
      root: root
    };
  }

  LE.views.circuits = { create: create, drawTile: drawTile };
})();
