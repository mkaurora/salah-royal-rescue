/* Pre-rendered sprites (offscreen canvases, built once per cell size): the 6 vehicle-part tiles, specials (rocket H/V,
 * dynamite, rainbow gem), the toolbox item, crates (3 layers), stone, chain overlay, oil puddle, glow + star + spark.
 * Everything is drawn here with canvas paths — no external images. Exposed as TW.sprites. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {};

  var COL = [
    ['#ff7a7a', '#d32f2f', '#7f1414'],   // 0 red bolt (hexagon)
    ['#7bc4ff', '#1e88e5', '#0b3b82'],   // 1 blue gear
    ['#ffe27a', '#fbc02d', '#8a5a00'],   // 2 yellow tyre
    ['#8fe08f', '#2e9e3a', '#0f4a1a'],   // 3 green spark plug (diamond)
    ['#ffbb66', '#f57c00', '#7a3200'],   // 4 orange oil can
    ['#d88cff', '#8e24aa', '#42105c']    // 5 purple piston
  ];

  function mk(w, h) {
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h || w));
    return c;
  }
  function grad(g, y0, y1, a, b, c) {
    var gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, a); gr.addColorStop(c ? 0.55 : 1, b); if (c) gr.addColorStop(1, c);
    return gr;
  }
  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  /** Fill the current path with a glossy gradient + dark outline. */
  function glossy(g, k, lo, hi) {
    var c = COL[k];
    g.fillStyle = grad(g, lo, hi, c[0], c[1], c[1]);
    g.fill();
    g.lineWidth = 4.5; g.strokeStyle = c[2]; g.lineJoin = 'round'; g.stroke();
  }
  function shine(g, x, y, rx, ry, a) {
    g.save(); g.globalAlpha = a == null ? 0.55 : a; g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(x, y, rx, ry, -0.3, 0, 7); g.fill(); g.restore();
  }
  function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 7); }

  /* ---- the 6 tiles, drawn in a 100x100 box ---- */
  var TILE = [
    function bolt(g, k) {            // hex bolt
      g.beginPath();
      for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; g.lineTo(50 + 41 * Math.cos(a), 52 + 41 * Math.sin(a)); }
      g.closePath(); glossy(g, k, 10, 94);
      circle(g, 50, 52, 17); g.fillStyle = COL[k][2]; g.fill();
      circle(g, 50, 52, 12); g.fillStyle = '#ffbcbc'; g.fill();
      circle(g, 50, 55, 12); g.globalCompositeOperation = 'source-atop'; g.globalCompositeOperation = 'source-over';
      shine(g, 36, 28, 15, 7);
    },
    function gear(g, k) {
      var i, a;
      g.beginPath();
      for (i = 0; i < 8; i++) {
        a = i * Math.PI / 4;
        var a1 = a - 0.2, a2 = a + 0.2, r0 = 33, r1 = 45;
        g.lineTo(50 + r0 * Math.cos(a - 0.3), 52 + r0 * Math.sin(a - 0.3));
        g.lineTo(50 + r1 * Math.cos(a1), 52 + r1 * Math.sin(a1));
        g.lineTo(50 + r1 * Math.cos(a2), 52 + r1 * Math.sin(a2));
        g.lineTo(50 + r0 * Math.cos(a + 0.3), 52 + r0 * Math.sin(a + 0.3));
      }
      g.closePath(); glossy(g, k, 8, 96);
      circle(g, 50, 52, 24); g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; g.stroke();
      circle(g, 50, 52, 12); g.fillStyle = COL[k][2]; g.fill();
      circle(g, 50, 52, 7); g.fillStyle = '#b9dcff'; g.fill();
      shine(g, 36, 30, 13, 6);
    },
    function tyre(g, k) {
      circle(g, 50, 52, 42); glossy(g, k, 10, 94);
      g.fillStyle = COL[k][2];
      for (var i = 0; i < 12; i++) {
        g.save(); g.translate(50, 52); g.rotate(i * Math.PI / 6); rr(g, -4.5, -42, 9, 11, 2); g.fill(); g.restore();
      }
      circle(g, 50, 52, 25); g.fillStyle = '#5c3b00'; g.fill();
      circle(g, 50, 52, 21); g.fillStyle = grad(g, 30, 74, '#fff2b0', '#ffc933'); g.fill();
      g.fillStyle = '#7a4d00';
      for (i = 0; i < 5; i++) { circle(g, 50 + 13 * Math.cos(i * 1.2566 - 1.57), 52 + 13 * Math.sin(i * 1.2566 - 1.57), 3.2); g.fill(); }
      circle(g, 50, 52, 4.5); g.fill();
      shine(g, 34, 28, 14, 6);
    },
    function plug(g, k) {             // spark plug diamond
      g.beginPath(); g.moveTo(50, 5); g.lineTo(93, 52); g.lineTo(50, 96); g.lineTo(7, 52); g.closePath();
      g.lineJoin = 'round'; glossy(g, k, 5, 96);
      g.save(); g.fillStyle = '#fff'; g.strokeStyle = COL[k][2]; g.lineWidth = 3;
      g.beginPath(); g.moveTo(56, 22); g.lineTo(37, 55); g.lineTo(49, 55); g.lineTo(42, 82); g.lineTo(65, 45); g.lineTo(52, 45); g.closePath();
      g.fill(); g.stroke(); g.restore();
      shine(g, 36, 30, 11, 5, 0.5);
    },
    function can(g, k) {
      g.strokeStyle = COL[k][2]; g.lineWidth = 9; g.lineCap = 'round';
      g.beginPath(); g.moveTo(66, 40); g.lineTo(90, 18); g.stroke();                  // spout
      g.strokeStyle = COL[k][1]; g.lineWidth = 4.5; g.beginPath(); g.moveTo(66, 40); g.lineTo(90, 18); g.stroke();
      g.strokeStyle = COL[k][2]; g.lineWidth = 8; g.beginPath(); g.arc(24, 54, 14, 1.6, 4.7); g.stroke();   // handle
      g.strokeStyle = COL[k][1]; g.lineWidth = 3.5; g.beginPath(); g.arc(24, 54, 14, 1.6, 4.7); g.stroke();
      rr(g, 20, 34, 56, 56, 12); glossy(g, k, 34, 90);
      rr(g, 30, 22, 36, 18, 6); glossy(g, k, 22, 40);
      g.fillStyle = '#fff'; g.beginPath(); g.moveTo(48, 50); g.quadraticCurveTo(62, 68, 48, 78); g.quadraticCurveTo(34, 68, 48, 50); g.fill();
      shine(g, 32, 46, 8, 5);
    },
    function piston(g, k) {
      rr(g, 20, 8, 60, 86, 22); glossy(g, k, 8, 94);
      g.strokeStyle = COL[k][2]; g.lineWidth = 3.5; g.lineCap = 'round';
      [26, 37, 48].forEach(function (y) { g.beginPath(); g.moveTo(24, y); g.lineTo(76, y); g.stroke(); });
      circle(g, 50, 70, 11); g.fillStyle = COL[k][2]; g.fill();
      circle(g, 50, 70, 7); g.fillStyle = '#e8d6f2'; g.fill();
      shine(g, 33, 24, 7, 11, 0.5);
    }
  ];

  /* ---- specials (badge + glyph) ---- */
  function badge(g, k) {
    circle(g, 50, 52, 43); g.fillStyle = '#fff'; g.fill();
    circle(g, 50, 52, 39); g.fillStyle = grad(g, 13, 91, COL[k][0], COL[k][1]); g.fill();
    g.lineWidth = 4; g.strokeStyle = COL[k][2]; g.stroke();
    circle(g, 50, 52, 43); g.lineWidth = 2.5; g.strokeStyle = COL[k][2]; g.stroke();
  }
  function arrow(g, dir) {   // double arrow, white with dark outline
    g.save(); g.translate(50, 52); if (dir === 'V') g.rotate(Math.PI / 2);
    g.beginPath(); g.moveTo(-33, 0); g.lineTo(-17, -15); g.lineTo(-17, -6); g.lineTo(17, -6); g.lineTo(17, -15); g.lineTo(33, 0);
    g.lineTo(17, 15); g.lineTo(17, 6); g.lineTo(-17, 6); g.lineTo(-17, 15); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#33291a'; g.lineJoin = 'round'; g.stroke(); g.restore();
  }
  function rocketGlyph(g, dir) {
    g.save(); g.translate(50, 52); g.rotate(dir === 'V' ? -Math.PI / 2 : 0);
    // flame
    g.fillStyle = '#ffb300'; g.beginPath(); g.moveTo(-22, 0); g.lineTo(-36, -7); g.lineTo(-30, 0); g.lineTo(-36, 7); g.closePath(); g.fill();
    // fins
    g.fillStyle = '#e53935'; g.strokeStyle = '#33291a'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(-16, -9); g.lineTo(-26, -19); g.lineTo(-6, -9); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-16, 9); g.lineTo(-26, 19); g.lineTo(-6, 9); g.closePath(); g.fill(); g.stroke();
    // body
    g.beginPath(); g.moveTo(-22, -9); g.lineTo(10, -10); g.quadraticCurveTo(34, -6, 36, 0); g.quadraticCurveTo(34, 6, 10, 10); g.lineTo(-22, 9); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.stroke();
    g.fillStyle = '#e53935'; g.beginPath(); g.moveTo(18, -9); g.quadraticCurveTo(34, -6, 36, 0); g.quadraticCurveTo(34, 6, 18, 9); g.closePath(); g.fill();
    circle(g, 2, 0, 5); g.fillStyle = '#4fc3f7'; g.fill(); g.stroke();
    g.restore();
  }
  function dynamiteGlyph(g) {
    g.save(); g.translate(50, 56); g.lineJoin = 'round';
    [-14, 0, 14].forEach(function (x, i) {
      rr(g, x - 7, -24 + (i === 1 ? -3 : 0), 14, 46, 6); g.fillStyle = i === 1 ? '#ff5a4d' : '#e53935'; g.fill();
      g.lineWidth = 3; g.strokeStyle = '#4a0f0f'; g.stroke();
    });
    rr(g, -24, -4, 48, 12, 4); g.fillStyle = '#ffd54f'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#4a0f0f'; g.stroke();
    g.strokeStyle = '#4a0f0f'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, -27); g.quadraticCurveTo(8, -36, 16, -32); g.stroke();
    g.fillStyle = '#ffeb3b'; circle(g, 17, -33, 5); g.fill(); g.fillStyle = '#ff7043'; circle(g, 17, -33, 2.5); g.fill();
    g.restore();
  }
  function gem(g) {
    var cx = 50, cy = 52, i, a, pts = [];
    for (i = 0; i < 6; i++) { a = -Math.PI / 2 + i * Math.PI / 3; pts.push([cx + 42 * Math.cos(a), cy + 42 * Math.sin(a)]); }
    var cols = ['#ff5252', '#ffd54f', '#66bb6a', '#42a5f5', '#ab47bc', '#ff9800'];
    for (i = 0; i < 6; i++) {
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(pts[i][0], pts[i][1]); g.lineTo(pts[(i + 1) % 6][0], pts[(i + 1) % 6][1]); g.closePath();
      g.fillStyle = cols[i]; g.fill();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(pts[i][0], pts[i][1]); g.lineTo(pts[(i + 1) % 6][0], pts[(i + 1) % 6][1]); g.closePath();
      g.fillStyle = 'rgba(255,255,255,' + (i % 2 ? 0.0 : 0.28) + ')'; g.fill();
    }
    g.beginPath(); pts.forEach(function (p) { g.lineTo(p[0], p[1]); }); g.closePath();
    g.lineWidth = 5; g.strokeStyle = '#2d2350'; g.lineJoin = 'round'; g.stroke();
    g.lineWidth = 2; g.strokeStyle = 'rgba(45,35,80,.7)';
    for (i = 0; i < 6; i++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(pts[i][0], pts[i][1]); g.stroke(); }
    circle(g, cx, cy, 11); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 2.5; g.stroke();
    shine(g, 36, 30, 9, 4, 0.8);
  }
  function toolbox(g) {
    g.lineJoin = 'round';
    g.strokeStyle = '#3a2a10'; g.lineWidth = 9; g.beginPath(); g.moveTo(34, 38); g.lineTo(34, 28); g.lineTo(66, 28); g.lineTo(66, 38); g.stroke();
    g.strokeStyle = '#c7ccd2'; g.lineWidth = 4; g.stroke();
    rr(g, 10, 36, 80, 52, 9); g.fillStyle = grad(g, 36, 88, '#ff6a5a', '#c62828'); g.fill(); g.lineWidth = 4.5; g.strokeStyle = '#4a0f0f'; g.stroke();
    g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(12, 56, 76, 5);
    rr(g, 42, 52, 16, 16, 4); g.fillStyle = '#ffd54f'; g.fill(); g.lineWidth = 3; g.stroke();
    shine(g, 26, 44, 12, 4, 0.5);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(50, 98); g.lineTo(44, 91); g.lineTo(56, 91); g.closePath(); g.fill();
  }

  function crate(g, layers) {
    var base = layers === 1 ? ['#e0a65a', '#b97a2c'] : layers === 2 ? ['#c98a43', '#8d5a22'] : ['#9a6a38', '#5f3b17'];
    rr(g, 5, 5, 90, 90, 10); g.fillStyle = grad(g, 5, 95, base[0], base[1]); g.fill();
    g.lineWidth = 4.5; g.strokeStyle = '#3d2410'; g.lineJoin = 'round'; g.stroke();
    g.strokeStyle = 'rgba(61,36,16,.65)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(8, 36); g.lineTo(92, 36); g.moveTo(8, 66); g.lineTo(92, 66); g.stroke();
    g.beginPath(); g.moveTo(14, 12); g.lineTo(86, 88); g.moveTo(86, 12); g.lineTo(14, 88); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(10, 8, 80, 4);
    if (layers >= 2) {         // metal corners
      g.fillStyle = '#9aa4ad'; g.strokeStyle = '#2b3036'; g.lineWidth = 2.5;
      [[5, 5], [67, 5], [5, 67], [67, 67]].forEach(function (p) { rr(g, p[0], p[1], 28, 28, 6); g.fill(); g.stroke(); circle(g, p[0] + 14, p[1] + 14, 3); g.fillStyle = '#4a5560'; g.fill(); g.fillStyle = '#9aa4ad'; });
    }
    if (layers >= 3) {         // steel bands
      g.fillStyle = '#7c8791'; g.fillRect(5, 42, 90, 16); g.strokeStyle = '#2b3036'; g.lineWidth = 2.5; g.strokeRect(5, 42, 90, 16);
      g.fillStyle = '#c9d1d8'; g.fillRect(8, 44, 84, 3);
    }
  }
  function stone(g) {
    g.lineJoin = 'round';
    g.beginPath(); g.moveTo(8, 70); g.lineTo(14, 36); g.lineTo(34, 14); g.lineTo(64, 10); g.lineTo(88, 28); g.lineTo(94, 62); g.lineTo(78, 90); g.lineTo(30, 92); g.closePath();
    g.fillStyle = grad(g, 10, 92, '#b9c0c8', '#6a7480'); g.fill(); g.lineWidth = 5; g.strokeStyle = '#2e343b'; g.stroke();
    g.strokeStyle = 'rgba(46,52,59,.6)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(34, 14); g.lineTo(44, 44); g.lineTo(30, 70); g.moveTo(44, 44); g.lineTo(76, 52); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(22, 40); g.lineTo(38, 20); g.lineTo(60, 17); g.lineTo(40, 34); g.closePath(); g.fill();
  }
  function chain(g) {      // overlay: padlock + chain links across the tile
    g.save(); g.lineCap = 'round';
    function link(x, y, a) {
      g.save(); g.translate(x, y); g.rotate(a); g.strokeStyle = '#1d2227'; g.lineWidth = 8; rr(g, -10, -5, 20, 10, 5); g.stroke();
      g.strokeStyle = '#c9d1d8'; g.lineWidth = 4; rr(g, -10, -5, 20, 10, 5); g.stroke(); g.restore();
    }
    [[22, 24, 0.8], [38, 40, 0.8], [62, 64, 0.8], [78, 80, 0.8], [78, 24, -0.8], [62, 40, -0.8], [38, 64, -0.8], [22, 80, -0.8]].forEach(function (l) { link(l[0], l[1], l[2]); });
    g.strokeStyle = '#1d2227'; g.lineWidth = 4.5; g.beginPath(); g.arc(50, 44, 11, Math.PI, 0); g.stroke();
    g.strokeStyle = '#dfe5ea'; g.lineWidth = 2.5; g.beginPath(); g.arc(50, 44, 11, Math.PI, 0); g.stroke();
    rr(g, 36, 44, 28, 22, 5); g.fillStyle = grad(g, 44, 66, '#ffd54f', '#e09b00'); g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#1d2227'; g.stroke();
    circle(g, 50, 53, 3.5); g.fillStyle = '#1d2227'; g.fill(); g.fillRect(48.5, 53, 3, 7);
    g.restore();
  }
  function oil(g) {
    g.beginPath();
    g.moveTo(8, 50); g.bezierCurveTo(0, 20, 34, 4, 54, 8); g.bezierCurveTo(88, 0, 102, 32, 94, 56);
    g.bezierCurveTo(102, 86, 68, 100, 46, 94); g.bezierCurveTo(16, 102, 0, 74, 8, 50); g.closePath();
    g.fillStyle = grad(g, 4, 98, '#8a4fe0', '#3a1a8a'); g.fill();
    g.lineWidth = 3.5; g.strokeStyle = '#1f0c52'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(30, 26, 15, 6, -0.5, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,255,230,.45)'; g.beginPath(); g.ellipse(72, 80, 11, 4.5, -0.4, 0, 7); g.fill();
  }

  function glow(S, rgb) {
    var c = mk(S), g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    gr.addColorStop(0, 'rgba(' + rgb + ',0.95)'); gr.addColorStop(0.4, 'rgba(' + rgb + ',0.35)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, S, S); return c;
  }
  function star(S, fill) {
    var c = mk(S), g = c.getContext('2d'); g.translate(S / 2, S / 2); g.scale(S / 100, S / 100);
    g.beginPath();
    for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, r = i % 2 ? 9 : 46; g.lineTo(r * Math.cos(a), r * Math.sin(a)); }
    g.closePath(); g.fillStyle = fill || '#fff'; g.fill(); return c;
  }

  function draw100(S, fn, a, b) {
    var c = mk(S), g = c.getContext('2d'); g.scale(S / 100, S / 100); fn(g, a, b); return c;
  }

  /** Build the whole set for a cell of `S` device pixels. */
  function build(S) {
    var sp = { S: S, tile: [], rocketH: [], rocketV: [], bomb: [], crate: [], stone: null, chain: null, oil: null, gem: null, item: null };
    var k;
    for (k = 0; k < 6; k++) {
      sp.tile.push(draw100(S, TILE[k], k));
      sp.rocketH.push(draw100(S, function (g, kk) { badge(g, kk); rocketGlyph(g, 'H'); }, k));
      sp.rocketV.push(draw100(S, function (g, kk) { badge(g, kk); rocketGlyph(g, 'V'); }, k));
      sp.bomb.push(draw100(S, function (g, kk) { badge(g, kk); dynamiteGlyph(g); }, k));
    }
    sp.gem = draw100(S, gem); sp.item = draw100(S, toolbox);
    sp.crate = [null, draw100(S, crate, 1), draw100(S, crate, 2), draw100(S, crate, 3)];
    sp.stone = draw100(S, stone); sp.chain = draw100(S, chain); sp.oil = draw100(S, oil);
    sp.glowW = glow(S * 2, '255,255,255'); sp.glowY = glow(S * 2, '255,214,90'); sp.glowO = glow(S * 2, '255,140,40');
    sp.star = star(S); sp.starY = star(S, '#ffe066');
    return sp;
  }

  /** A small canvas for DOM icons (booster slots etc.): kind = rocket | dynamite | rainbow | hammer | shuffle | tile0..5 | item */
  function icon(kind, px) {
    var c = mk(px), g = c.getContext('2d'); g.scale(px / 100, px / 100);
    if (kind === 'rocket') { badge(g, 1); rocketGlyph(g, 'H'); }
    else if (kind === 'dynamite') { badge(g, 0); dynamiteGlyph(g); }
    else if (kind === 'rainbow') gem(g);
    else if (kind === 'item') toolbox(g);
    else if (kind === 'hammer') {
      g.save(); g.translate(50, 50); g.rotate(-0.6); g.lineJoin = 'round';
      rr(g, -7, -8, 14, 52, 5); g.fillStyle = '#b8793a'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#3d2410'; g.stroke();
      rr(g, -30, -36, 60, 30, 8); g.fillStyle = grad(g, -36, -6, '#e3e8ee', '#8a96a3'); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(-24, -32, 40, 5); g.restore();
    } else if (kind === 'shuffle') {
      g.lineCap = 'round'; g.lineJoin = 'round';
      [['#fff', 12], ['#2e86de', 6]].forEach(function (s) {
        g.strokeStyle = s[0] === '#fff' ? '#1b3a66' : s[0]; g.lineWidth = s[1] + (s[0] === '#fff' ? 4 : 0);
        g.beginPath(); g.moveTo(16, 32); g.lineTo(40, 32); g.bezierCurveTo(56, 32, 52, 68, 68, 68); g.lineTo(78, 68); g.stroke();
        g.beginPath(); g.moveTo(16, 68); g.lineTo(40, 68); g.bezierCurveTo(56, 68, 52, 32, 68, 32); g.lineTo(78, 32); g.stroke();
      });
      g.fillStyle = '#2e86de'; g.strokeStyle = '#1b3a66'; g.lineWidth = 3;
      [[78, 68], [78, 32]].forEach(function (p) { g.beginPath(); g.moveTo(p[0] - 4, p[1] - 12); g.lineTo(p[0] + 12, p[1]); g.lineTo(p[0] - 4, p[1] + 12); g.closePath(); g.fill(); g.stroke(); });
    } else if (kind.indexOf('tile') === 0) TILE[+kind.slice(4)](g, +kind.slice(4));
    else if (kind === 'crate') crate(g, 1);
    else if (kind === 'oil') oil(g);
    else if (kind === 'chain') chain(g);
    return c;
  }

  TW.sprites = { COL: COL, build: build, icon: icon, mk: mk, rr: rr, star: star, glow: glow };
})(typeof self !== 'undefined' ? self : this);
