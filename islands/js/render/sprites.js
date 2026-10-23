/* Pre-rendered world art: ground chunks (tiles painted once per island), prop sprites per biome (trees, rocks, cliffs),
 * NPC characters, minigame pads, signs, collectible glow, boat. Everything is procedural canvas art; nothing is drawn
 * per frame except cheap drawImage calls. SI.sprites. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {};
  var AV = function () { return SI.avatar.util; };
  var TAU = Math.PI * 2, T = 48;

  function H(x, y, s) { var h = (Math.imul(x + 1013, 73856093) ^ Math.imul(y + 7919, 19349663) ^ Math.imul((s || 0) + 31, 83492791)) >>> 0; h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; return (h ^ (h >>> 15)) >>> 0; }
  function hf(x, y, s) { return (H(x, y, s) % 1000) / 1000; }
  function hexA(c) { if (c.charAt(0) === 'r') { var m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]]; } c = c.replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function mixc(a, b, k) { var x = hexA(a), y = hexA(b); return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * k) + ',' + Math.round(x[1] + (y[1] - x[1]) * k) + ',' + Math.round(x[2] + (y[2] - x[2]) * k) + ')'; }
  function toHex(c) { if (c.charAt(0) === '#') return c; var m = c.match(/\d+/g); return '#' + [0, 1, 2].map(function (i) { return ('0' + (+m[i]).toString(16)).slice(-2); }).join(''); }
  function dk(c, k) { return mixc(toHex(c), '#1d1445', k == null ? 0.3 : k); }
  function lt(c, k) { return mixc(toHex(c), '#ffffff', k == null ? 0.35 : k); }
  function ell(g, x, y, rx, ry, rot) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, TAU); }
  function fs(g, fill, stroke, lw) { if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); } }
  function circ(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, TAU); }
  function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function dpr() { return Math.min(2, root.devicePixelRatio || 1); }

  function canvas(w, h, q) { var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * q)); c.height = Math.max(1, Math.round(h * q)); var g = c.getContext('2d'); g.scale(q, q); c._w = w; c._h = h; return { c: c, g: g }; }

  /* ================================================================ ground chunks */
  var LAND = '.sfpPTR#';           // tiles that count as land for foam
  function prio(ch) { return ch === '~' || ch === 'g' ? 0 : ch === 's' ? 1 : ch === 'p' ? 3 : ch === 'P' ? 2 : 2; }

  /** distance (in tiles) from each tile to the nearest land tile, for water shading. */
  function waterDist(isl) {
    if (isl._wd) return isl._wd;
    var w = isl.w, h = isl.h, d = new Int8Array(w * h).fill(-1), q = [], i, x, y;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (LAND.indexOf(isl.rows[y].charAt(x)) >= 0) { d[y * w + x] = 0; q.push(y * w + x); }
    for (i = 0; i < q.length; i++) {
      var c = q[i], cx = c % w, cy = (c / w) | 0;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
        var nx = cx + v[0], ny = cy + v[1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || d[ny * w + nx] >= 0) return;
        d[ny * w + nx] = Math.min(6, d[c] + 1); q.push(ny * w + nx);
      });
    }
    return (isl._wd = d);
  }
  function tileAt(isl, x, y) { return x < 0 || y < 0 || x >= isl.w || y >= isl.h ? '~' : isl.rows[y].charAt(x); }

  function paintTile(g, isl, x, y, gateOpen) {
    var P = isl.palette, ch = tileAt(isl, x, y), px = x * T, py = y * T, w = isl.w, wd = waterDist(isl);
    var biome = isl.biome;
    if (ch === '~' || ch === 'g') {
      var d = wd[y * w + x];
      var deep = mixc(P.water, '#0b3a6b', 0.28), col = d <= 1 ? lt(P.water2, 0.12) : d === 2 ? P.water2 : d === 3 ? P.water : d === 4 ? mixc(P.water, deep, 0.5) : deep;
      g.fillStyle = col; g.fillRect(px, py, T, T);
      // soft swirls
      g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 2; g.lineCap = 'round';
      if (hf(x, y, 5) < 0.5) { var sx = px + 6 + hf(x, y, 6) * 20, sy = py + 8 + hf(x, y, 7) * 28; g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx + 8, sy - 4, sx + 16, sy); g.stroke(); }
      if (ch === 'g') paintBridge(g, isl, x, y, gateOpen);
      return;
    }
    // land
    var field = 0.5 + 0.5 * Math.sin(x * 0.55 + Math.sin(y * 0.4) * 1.7) * Math.cos(y * 0.5 + x * 0.2), base;
    if (ch === 's') base = mixc(P.sand, lt(P.sand, 0.3), field * 0.6);
    else if (ch === 'p') base = mixc(biomePath(biome), lt(biomePath(biome), 0.4), hf(x, y, 1) * 0.5);
    else if (ch === 'P') base = (x + y) % 2 ? '#edcf98' : '#e6c58a';
    else base = mixc(P.ground, P.ground2, field * 0.85 + hf(x, y, 2) * 0.1);
    g.fillStyle = base; g.fillRect(px, py, T, T);
    // small ground detail
    var n = H(x, y, 3), r1 = hf(x, y, 4);
    if (ch === '.' || ch === 'T' || ch === 'R' || ch === '#') groundDetail(g, isl, px, py, x, y, 0);
    else if (ch === 'f') { groundDetail(g, isl, px, py, x, y, 1); flowers(g, isl, px, py, x, y); }
    else if (ch === 's') { g.fillStyle = 'rgba(160,120,60,0.18)'; for (var k = 0; k < 3; k++) { circ(g, px + 6 + hf(x, y, 10 + k) * 36, py + 6 + hf(x, y, 20 + k) * 36, 1.4); g.fill(); } if (r1 < 0.08) { g.fillStyle = 'rgba(255,255,255,0.5)'; circ(g, px + 12 + hf(x, y, 8) * 24, py + 12 + hf(x, y, 9) * 24, 2.2); g.fill(); } }
    else if (ch === 'p') { g.fillStyle = 'rgba(255,255,255,0.28)'; for (var j = 0; j < 3; j++) { ell(g, px + 8 + hf(x, y, 30 + j) * 32, py + 8 + hf(x, y, 40 + j) * 32, 4, 2.6); g.fill(); } g.fillStyle = 'rgba(120,80,30,0.12)'; ell(g, px + 10 + hf(x, y, 50) * 28, py + 10 + hf(x, y, 51) * 28, 3, 2); g.fill(); }
    else if (ch === 'P') paintZoneTile(g, isl, px, py, x, y);
  }
  function biomePath(b) { return { beach: '#d9b676', jungle: '#bf9d64', caves: '#c2b2ea', snow: '#b4cfe4', sky: '#ffdcae', lab: '#d3ab7c' }[b] || '#ecd9a6'; }

  function groundDetail(g, isl, px, py, x, y, dense) {
    var b = isl.biome, r = hf(x, y, 60), P = isl.palette;
    if (b === 'beach' || b === 'jungle' || b === 'sky') {
      var dark = dk(P.ground, 0.25), n = dense ? 3 : (r < 0.55 ? 2 : 1);
      g.strokeStyle = dark; g.lineWidth = 1.8; g.lineCap = 'round';
      for (var i = 0; i < n; i++) { var bx = px + 6 + hf(x, y, 61 + i) * 36, by = py + 12 + hf(x, y, 71 + i) * 30; g.beginPath(); g.moveTo(bx - 3, by); g.lineTo(bx - 1, by - 5); g.moveTo(bx, by); g.lineTo(bx, by - 7); g.moveTo(bx + 3, by); g.lineTo(bx + 1, by - 5); g.stroke(); }
      if (r > 0.93) { g.fillStyle = '#fff'; circ(g, px + 10 + hf(x, y, 81) * 28, py + 10 + hf(x, y, 82) * 28, 2.2); g.fill(); g.fillStyle = '#ffd84a'; circ(g, px + 10 + hf(x, y, 81) * 28, py + 10 + hf(x, y, 82) * 28, 0.9); g.fill(); }
    } else if (b === 'caves') {
      if (r < 0.2) { g.fillStyle = 'rgba(255,255,255,0.4)'; var cx = px + 10 + hf(x, y, 83) * 28, cy = py + 10 + hf(x, y, 84) * 28; g.beginPath(); g.moveTo(cx, cy - 3); g.lineTo(cx + 2, cy); g.lineTo(cx, cy + 3); g.lineTo(cx - 2, cy); g.closePath(); g.fill(); }
      if (r > 0.8) { g.fillStyle = 'rgba(90,60,150,0.18)'; ell(g, px + 24, py + 30, 8, 4); g.fill(); }
    } else if (b === 'snow') {
      g.fillStyle = 'rgba(160,200,235,0.35)'; if (r < 0.5) { ell(g, px + 12 + hf(x, y, 85) * 24, py + 30 + hf(x, y, 86) * 10, 8, 3); g.fill(); }
      if (r > 0.85) { g.fillStyle = '#fff'; circ(g, px + 10 + hf(x, y, 87) * 28, py + 10 + hf(x, y, 88) * 28, 1.8); g.fill(); }
    } else if (b === 'lab') {
      g.strokeStyle = 'rgba(120,70,30,0.18)'; g.lineWidth = 1.6; if (r < 0.3) { var sx = px + 8 + hf(x, y, 89) * 20, sy = py + 8 + hf(x, y, 90) * 20; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 8, sy + 6); g.lineTo(sx + 6, sy + 14); g.stroke(); }
      if (r > 0.9) { g.fillStyle = 'rgba(255,150,60,0.4)'; circ(g, px + 10 + hf(x, y, 91) * 28, py + 10 + hf(x, y, 92) * 28, 2.4); g.fill(); }
    }
  }
  var FLOWER_COLS = { beach: ['#ff7a9a', '#ffd23f', '#fff'], jungle: ['#ff7a9a', '#ffb23c', '#c58bff'], caves: ['#7fe6ff', '#ff9ad0', '#fff'], snow: ['#7fc4ff', '#fff', '#c9b8ff'], sky: ['#ffb3cf', '#fff', '#ffd23f'], lab: ['#ffd23f', '#ff9a3d', '#7fe6c8'] };
  function flowers(g, isl, px, py, x, y) {
    var cols = FLOWER_COLS[isl.biome] || FLOWER_COLS.beach;
    for (var i = 0; i < 3; i++) {
      var fx = px + 8 + hf(x, y, 100 + i) * 32, fy = py + 10 + hf(x, y, 110 + i) * 30, col = cols[H(x, y, 120 + i) % 3];
      g.strokeStyle = '#3f9a2e'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(fx, fy + 5); g.lineTo(fx, fy); g.stroke();
      g.fillStyle = col; for (var p = 0; p < 5; p++) { circ(g, fx + Math.cos(p * 1.2566) * 2.8, fy + Math.sin(p * 1.2566) * 2.8, 2.1); g.fill(); }
      g.fillStyle = '#ffe45c'; circ(g, fx, fy, 1.6); g.fill();
    }
  }
  function paintZoneTile(g, isl, px, py, x, y) {
    var z = isl.zone, lx = x - z.x, ly = y - z.y;
    g.strokeStyle = 'rgba(150,100,40,0.35)'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 0.5, py); g.lineTo(px + 0.5, py + T); g.moveTo(px, py + 0.5); g.lineTo(px + T, py + 0.5); g.stroke();
    g.strokeStyle = 'rgba(150,100,40,0.18)'; g.beginPath(); g.moveTo(px, py + 16); g.lineTo(px + T, py + 16); g.moveTo(px, py + 32); g.lineTo(px + T, py + 32); g.stroke();
    var edge = '#c98d3f';
    if (lx === 0) { g.fillStyle = edge; g.fillRect(px, py, 3, T); } if (ly === 0) { g.fillStyle = edge; g.fillRect(px, py, T, 3); }
    if (lx === z.w - 1) { g.fillStyle = edge; g.fillRect(px + T - 3, py, 3, T); } if (ly === z.h - 1) { g.fillStyle = edge; g.fillRect(px, py + T - 3, T, 3); }
  }
  function paintBridge(g, isl, x, y, open) {
    var px = x * T, py = y * T, g0 = isl.gate, left = x === g0.x;
    // planks run top-bottom (the bridge is vertical)
    for (var i = 0; i < 4; i++) {
      var yy = py + i * 12, miss = !open && (H(x, y + i, 9) % 3 === 0), tilt = !open ? (hf(x, y + i, 8) - 0.5) * 3 : 0;
      if (miss) continue;
      g.save(); g.translate(px + T / 2, yy + 6); g.rotate(tilt * Math.PI / 180);
      rr(g, -T / 2 - 0.5, -5.5, T + 1, 11, 2); fs(g, open ? '#e8b866' : '#c9a572', '#8a5a2a', 1.6); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-T / 2 + 3, -3, T - 6, 2); g.restore();
    }
    // rails
    var rx = left ? px + 2 : px + T - 2;
    g.strokeStyle = open ? '#8a5a2a' : '#a58a66'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(rx, py); g.lineTo(rx, py + T); g.stroke();
    if (open) { g.fillStyle = '#c98d3f'; circ(g, rx, py + 4, 4.2); g.fill(); circ(g, rx, py + T - 4, 4.2); g.fill(); }
  }

  /** Paint one chunk (cx, cy chunk coordinates, size n tiles) into a canvas. */
  function paintChunk(isl, cx, cy, n, q, gateOpen) {
    var c = canvas(n * T, n * T, q), g = c.g, x0 = cx * n, y0 = cy * n, x, y;
    g.translate(-x0 * T, -y0 * T);
    // pass 1: tiles
    for (y = y0 - 1; y < y0 + n + 1; y++) for (x = x0 - 1; x < x0 + n + 1; x++) { if (x < x0 || y < y0 || x >= x0 + n || y >= y0 + n) continue; if (x >= isl.w || y >= isl.h) { g.fillStyle = mixc(isl.palette.water, '#0b3a6b', 0.28); g.fillRect(x * T, y * T, T, T); continue; } paintTile(g, isl, x, y, gateOpen); }
    // pass 2: scalloped bleed of higher priority tiles onto lower neighbours (organic edges), foam on water
    g.save(); g.beginPath(); g.rect(x0 * T, y0 * T, n * T, n * T); g.clip();
    for (y = y0 - 1; y <= y0 + n; y++) for (x = x0 - 1; x <= x0 + n; x++) {
      if (x < 0 || y < 0 || x >= isl.w || y >= isl.h) continue;
      var ch = tileAt(isl, x, y), p = prio(ch);
      if (p === 0 || ch === 'P') continue;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) {
        var nx = x + v[0], ny = y + v[1], nc = tileAt(isl, nx, ny), np = prio(nc);
        if (nc === 'P' || np >= p) { if (!(np === 0)) return; }
        if (np === 0) {   // land next to water: foam band on the water tile
          g.fillStyle = 'rgba(255,255,255,0.55)';
          for (var k = 0; k < 4; k++) {
            var t = (k + 0.5) / 4, ex = (x + (v[0] > 0 ? 1 : v[0] < 0 ? 0 : t)) * T + v[0] * 2, ey = (y + (v[1] > 0 ? 1 : v[1] < 0 ? 0 : t)) * T + v[1] * 2;
            circ(g, ex, ey, 6 + hf(x + k, y, 130) * 2); g.fill();
          }
          return;
        }
        var col = ch === 's' ? mixc(isl.palette.sand, '#ffffff', 0.15) : ch === 'p' ? biomePath(isl.biome) : mixc(isl.palette.ground, isl.palette.ground2, 0.4);
        var edge = ch === 'p' ? dk(biomePath(isl.biome), 0.2) : null;
        for (var pass = edge ? 0 : 1; pass < 2; pass++) for (var kk = 0; kk < 4; kk++) {
          var tt = (kk + 0.5) / 4, ex2 = (x + (v[0] > 0 ? 1 : v[0] < 0 ? 0 : tt)) * T + v[0] * (4 + hf(x + kk, y + ny, 131) * 3), ey2 = (y + (v[1] > 0 ? 1 : v[1] < 0 ? 0 : tt)) * T + v[1] * (4 + hf(x + kk, y + ny, 131) * 3);
          circ(g, ex2, ey2, pass === 0 ? 9.5 : 7.5); g.fillStyle = pass === 0 ? edge : col; g.fill();
        }
      });
    }
    g.restore();
    g.fillStyle = isl.tint; g.fillRect(x0 * T, y0 * T, n * T, n * T);
    return c.c;
  }

  /* ================================================================ props (trees, rocks, cliffs) */
  var propCache = {};
  /** A prop sprite: { c (canvas), w, h, ax, ay } where (ax, ay) is the foot anchor inside the sprite in world px. */
  function prop(biome, kind, variant, q) {
    var key = biome + kind + variant + '@' + q; if (propCache[key]) return propCache[key];
    var W = 84, Hh = 112, c = canvas(W, Hh, q), g = c.g;
    g.translate(W / 2, Hh - 10);
    // soft ground shadow
    ell(g, 0, 2, kind === '#' ? 25 : 20, 7); g.fillStyle = 'rgba(30,20,60,0.2)'; g.fill();
    (PROPS[biome + kind] || PROPS['*' + kind])(g, variant, biome);
    return (propCache[key] = { c: c.c, w: W, h: Hh, ax: W / 2, ay: Hh - 10 });
  }
  function leafBlob(g, x, y, r, col, light, dark2) { circ(g, x, y, r); fs(g, col, dark2 || dk(col, 0.35), 2.4); g.fillStyle = light || lt(col, 0.3); ell(g, x - r * 0.3, y - r * 0.35, r * 0.45, r * 0.3, -0.5); g.fill(); }
  var PROPS = {
    beachT: function (g, v) {   // palm tree
      var lean = (v - 1) * 7;
      g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-4 + lean * 0.4, -34, lean, -62); g.lineTo(lean + 6, -62); g.quadraticCurveTo(6 + lean * 0.4, -34, 5, 0); g.closePath(); fs(g, '#b98250', '#6b4222', 2.4);
      g.strokeStyle = 'rgba(80,45,20,0.4)'; g.lineWidth = 1.6; for (var i = 1; i < 6; i++) { g.beginPath(); g.moveTo(-5 + lean * i / 18, -i * 10); g.lineTo(5 + lean * i / 18, -i * 10 - 2); g.stroke(); }
      var tx = lean + 3, ty = -62;
      for (var f = 0; f < 7; f++) { var a = -Math.PI + f * Math.PI / 6 + (v * 0.1); g.save(); g.translate(tx, ty); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(18, -14, 36, 6); g.quadraticCurveTo(18, -4, 0, 3); g.closePath(); fs(g, f % 2 ? '#3fae4a' : '#58c85a', '#1f6a2c', 2); g.restore(); }
      circ(g, tx - 3, ty + 4, 4.4); fs(g, '#8a5a2a', '#4a2a10', 1.6); circ(g, tx + 4, ty + 5, 4.4); fs(g, '#8a5a2a', '#4a2a10', 1.6);
    },
    jungleT: function (g, v) {
      g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(-6, -22, -4, -44); g.lineTo(4, -44); g.quadraticCurveTo(7, -22, 9, 0); g.closePath(); fs(g, '#9a6a3e', '#5a3a1c', 2.4);
      var gcol = ['#2f9a44', '#37a84a', '#2a8a52'][v % 3];
      leafBlob(g, -17, -52, 20, gcol, null); leafBlob(g, 17, -54, 20, gcol, null); leafBlob(g, 0, -70, 25, lt(gcol, 0.08), null);
      g.strokeStyle = '#4fbf4a'; g.lineWidth = 2.4; g.lineCap = 'round'; [[-22, -40], [20, -42]].forEach(function (p, i) { g.beginPath(); g.moveTo(p[0], p[1]); g.quadraticCurveTo(p[0] + (i ? 4 : -4), p[1] + 12, p[0] + (i ? 1 : -1), p[1] + 22 + v * 3); g.stroke(); });
      if (v === 1) { ['#ff7a9a', '#ffd23f', '#ff7a9a'].forEach(function (c, i) { circ(g, -12 + i * 12, -62 + (i % 2) * 6, 3.2); fs(g, c, '#fff', 1); }); }
    },
    cavesT: function (g, v) {   // crystal cluster
      var cols = [['#b58bff', '#e2ccff'], ['#6fb8ff', '#c7e6ff'], ['#ff9ad0', '#ffd3ea']][v % 3];
      var gr = g.createRadialGradient(0, -22, 4, 0, -22, 40); gr.addColorStop(0, cols[1].replace('#', '#') + 'aa'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = 'rgba(255,255,255,0.14)'; ell(g, 0, -20, 34, 30); g.fill();
      [[-14, 0, 12, 34, -0.18], [14, 1, 11, 30, 0.2], [0, 0, 16, 56 + v * 4, 0], [-4, 2, 9, 24, -0.4], [8, 2, 8, 20, 0.45]].forEach(function (p, i) {
        g.save(); g.translate(p[0], p[1]); g.rotate(p[4]); g.beginPath(); g.moveTo(-p[2] / 2, 0); g.lineTo(-p[2] / 2, -p[3] * 0.7); g.lineTo(0, -p[3]); g.lineTo(p[2] / 2, -p[3] * 0.7); g.lineTo(p[2] / 2, 0); g.closePath(); fs(g, i % 2 ? cols[0] : mixc(cols[0], cols[1], 0.35), dk(cols[0], 0.4), 2.2);
        g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(-p[2] / 2 + 2, -p[3] * 0.1); g.lineTo(-p[2] / 2 + 2, -p[3] * 0.65); g.lineTo(-p[2] / 2 + 5, -p[3] * 0.62); g.lineTo(-p[2] / 2 + 5, -p[3] * 0.1); g.fill(); g.restore();
      });
    },
    snowT: function (g, v) {   // pine
      g.fillStyle = '#7a4a28'; g.fillRect(-4, -12, 8, 14);
      var sz = [1, 0.9, 1.08][v % 3];
      [[-34, 46, 32], [-54, 38, 26], [-72, 30, 20]].forEach(function (L, i) {
        var y = L[0] * sz, w = L[1] * sz, h2 = L[2] * sz; g.beginPath(); g.moveTo(0, y - h2 * 0.9); g.lineTo(w / 2, y + 6); g.quadraticCurveTo(0, y + 12, -w / 2, y + 6); g.closePath(); fs(g, i % 2 ? '#2f8a62' : '#38a070', '#1a5a40', 2.2);
        g.beginPath(); g.moveTo(0, y - h2 * 0.9); g.lineTo(w * 0.28, y - h2 * 0.2); g.quadraticCurveTo(w * 0.1, y - h2 * 0.05, 0, y - h2 * 0.25); g.quadraticCurveTo(-w * 0.1, y - h2 * 0.05, -w * 0.28, y - h2 * 0.2); g.closePath(); fs(g, '#fff', '#c5dcee', 1.4);
      });
    },
    skyT: function (g, v) {   // cotton-candy cloud tree
      g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-3, -22, -3, -40); g.lineTo(5, -40); g.quadraticCurveTo(6, -22, 7, 0); g.closePath(); fs(g, '#e8c8a0', '#a0765a', 2.2);
      var cols = [['#ffc4dc', '#ff9ac4'], ['#cde0ff', '#9cc0ff'], ['#ffe2a8', '#ffc86a']][v % 3];
      [[-16, -52, 18], [16, -52, 18], [0, -66, 22], [-6, -44, 16], [10, -42, 14]].forEach(function (b) { circ(g, b[0], b[1], b[2]); fs(g, cols[0], cols[1], 2.2); });
      g.fillStyle = 'rgba(255,255,255,0.55)'; ell(g, -8, -72, 8, 5, -0.4); g.fill();
    },
    labT: function (g, v) {   // warm round tree with orange leaves + mineral dots
      g.beginPath(); g.moveTo(-5, 0); g.quadraticCurveTo(-3, -20, -3, -34); g.lineTo(5, -34); g.quadraticCurveTo(6, -20, 7, 0); g.closePath(); fs(g, '#8a5a3e', '#4a2a1c', 2.2);
      var c = ['#ff9a3d', '#f4b03c', '#ee7a3a'][v % 3];
      leafBlob(g, -14, -46, 16, c, null); leafBlob(g, 14, -46, 16, c, null); leafBlob(g, 0, -60, 20, lt(c, 0.06), null);
      [[-8, -56], [8, -48], [0, -66]].forEach(function (p) { circ(g, p[0], p[1], 2.4); fs(g, '#ffe36a'); });
    },
    '*R': function (g, v, b) {
      var cols = b === 'snow' ? ['#dcefff', '#8fc2e8'] : b === 'sky' ? ['#ffffff', '#bcd8f5'] : b === 'lab' ? ['#6a5a58', '#2f2624'] : b === 'caves' ? ['#9a8fc4', '#5d5190'] : ['#b3b0a6', '#6f6c62'];
      if (b === 'sky') { [[-12, -10, 12], [8, -12, 14], [-2, -20, 12], [14, -4, 9]].forEach(function (p) { circ(g, p[0], p[1], p[2]); fs(g, '#fff', cols[1], 2.2); }); return; }
      if (b === 'snow') { g.beginPath(); g.moveTo(-20, 0); g.lineTo(-16, -28); g.lineTo(0, -34); g.lineTo(18, -26); g.lineTo(22, 0); g.closePath(); fs(g, 'rgba(190,225,255,0.95)', '#6fa8d6', 2.4); g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(-14, -6); g.lineTo(-12, -24); g.lineTo(-6, -26); g.lineTo(-8, -6); g.fill(); return; }
      g.beginPath(); g.moveTo(-22, 0); g.quadraticCurveTo(-26, -22, -8, -30 - v * 2); g.quadraticCurveTo(14, -34, 22, -12); g.quadraticCurveTo(26, -2, 20, 0); g.closePath(); fs(g, cols[0], cols[1], 2.6);
      g.fillStyle = 'rgba(255,255,255,0.28)'; ell(g, -8, -22, 8, 4, -0.5); g.fill(); g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(4, -28); g.lineTo(8, -14); g.lineTo(2, -4); g.stroke();
      if (b === 'lab') { g.fillStyle = '#ff8a2a'; ell(g, 10, -6, 5, 2.4); g.fill(); }
    },
    '*#': function (g, v, b) {   // cliff column, 1 tile wide, ~1.5 tiles tall
      var topc = b === 'snow' ? '#f4faff' : b === 'caves' ? '#c9b8f0' : b === 'lab' ? '#b08a66' : b === 'sky' ? '#fff' : '#a8a396';
      var side = b === 'snow' ? '#a9cdea' : b === 'caves' ? '#7a68b8' : b === 'lab' ? '#6a4a3a' : b === 'sky' ? '#c4daf2' : '#6f6a5c';
      g.beginPath(); g.moveTo(-24, 2); g.lineTo(-24, -52); g.quadraticCurveTo(0, -64, 24, -52); g.lineTo(24, 2); g.closePath(); fs(g, side, dk(side, 0.35), 2.6);
      g.beginPath(); g.moveTo(-24, -52); g.quadraticCurveTo(0, -64, 24, -52); g.lineTo(24, -36); g.quadraticCurveTo(10, -30, 0, -36); g.quadraticCurveTo(-12, -30, -24, -36); g.closePath(); fs(g, topc, dk(side, 0.35), 2.2);
      g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 2; for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-24, -24 + i * 9); g.lineTo(24, -26 + i * 9 + (v - 1) * 3); g.stroke(); }
      if (b === 'caves') { g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(-8, -20); g.lineTo(-5, -26); g.lineTo(-2, -20); g.lineTo(-5, -14); g.fill(); }
    }
  };

  /* ================================================================ NPC characters (18) */
  var NPC_CACHE = {};
  function body(g, x, y, rx, ry, col, o) {
    o = o || {}; var gr = g.createLinearGradient(0, y - ry, 0, y + ry); gr.addColorStop(0, lt(col, 0.3)); gr.addColorStop(0.4, col); gr.addColorStop(1, dk(col, 0.22));
    ell(g, x, y, rx, ry); fs(g, gr, o.stroke || dk(col, 0.5), 2.6);
  }
  function eye(g, x, y, r, look) { circ(g, x, y, r); fs(g, '#fff', '#2d1b52', 2); circ(g, x + (look || 0), y + 0.6, r * 0.52); fs(g, '#2d1b52'); circ(g, x + (look || 0) - r * 0.2, y - r * 0.15, r * 0.2); fs(g, '#fff'); }
  function smile(g, x, y, w) { g.beginPath(); g.arc(x, y - w * 0.4, w, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = '#2d1b52'; g.lineWidth = 2.4; g.lineCap = 'round'; g.stroke(); }
  function cheeks(g, x, y, gap) { [-1, 1].forEach(function (s) { ell(g, x + s * gap, y, 4.4, 2.8); g.fillStyle = 'rgba(255,110,140,0.4)'; g.fill(); }); }
  function feet(g, x, y, col, gap) { [-1, 1].forEach(function (s) { ell(g, x + s * gap, y, 8, 4.6); fs(g, col, dk(col, 0.4), 2); }); }

  var NPCDRAW = {
    pip: function (g) {   // sea turtle, yellow scarf
      ell(g, 0, -34, 30, 24); fs(g, '#46b86a', '#1f6a3c', 2.6); g.save(); ell(g, 0, -34, 30, 24); g.clip(); g.strokeStyle = '#2f8a50'; g.lineWidth = 2; [[-14, -50, -14, -18], [14, -50, 14, -18], [-30, -34, 30, -34]].forEach(function (l) { g.beginPath(); g.moveTo(l[0], l[1]); g.lineTo(l[2], l[3]); g.stroke(); }); g.restore();
      feet(g, 0, -4, '#7fd68f', 14); body(g, 22, -58, 14, 12, '#7fd68f'); eye(g, 27, -61, 4.4, 1); eye(g, 16, -61, 3.6, 1); smile(g, 22, -50, 5); cheeks(g, 22, -53, 10);
      ell(g, -32, -30, 9, 6, 0.4); fs(g, '#7fd68f', '#1f6a3c', 2); ell(g, 8, -42, 20, 8, 0); g.strokeStyle = '#ffd23f'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(8, -48); g.quadraticCurveTo(18, -46, 26, -50); g.stroke(); rr(g, 14, -48, 7, 16, 3); fs(g, '#ffd23f', '#c98d00', 1.6);
    },
    nori: function (g) {   // crab
      body(g, 0, -26, 30, 20, '#ff7a70'); [-1, 1].forEach(function (s) { g.strokeStyle = '#d94a40'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * 24, -30); g.quadraticCurveTo(s * 40, -42, s * 38, -56); g.stroke(); ell(g, s * 38, -60, 9, 8); fs(g, '#ff7a70', '#a83228', 2.4); g.beginPath(); g.moveTo(s * 38, -60); g.lineTo(s * 40, -68); g.lineTo(s * 33, -64); g.fillStyle = '#ffb4ac'; g.fill(); for (var l = 0; l < 3; l++) { g.beginPath(); g.moveTo(s * 20, -12 + l * 2); g.lineTo(s * 36, -6 + l * 3); g.strokeStyle = '#d94a40'; g.lineWidth = 3.4; g.stroke(); } });
      [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * 9, -42); g.lineTo(s * 9, -52); g.strokeStyle = '#d94a40'; g.lineWidth = 3; g.stroke(); eye(g, s * 9, -55, 6, 0.5); }); smile(g, 0, -24, 8); cheeks(g, 0, -27, 16);
    },
    bumble: function (g) {   // round blue monster, lighthouse keeper cap
      body(g, 0, -34, 32, 31, '#4f9cff'); feet(g, 0, -4, '#3f7ad6', 14); body(g, 0, -26, 20, 16, '#8cc2ff'); eye(g, -9, -42, 8, 1); eye(g, 9, -42, 8, 1); g.beginPath(); g.arc(0, -30, 9, 0.1 * Math.PI, 0.9 * Math.PI); g.fillStyle = '#5a1d3a'; g.fill(); g.strokeStyle = '#2d1b52'; g.lineWidth = 2.4; g.stroke(); cheeks(g, 0, -34, 20);
      ell(g, -22, -30, 7, 11, 0.3); fs(g, '#4f9cff', '#2a5aa8', 2); ell(g, 22, -30, 7, 11, -0.3); fs(g, '#4f9cff', '#2a5aa8', 2);
      g.beginPath(); g.ellipse(0, -62, 18, 12, 0, Math.PI, TAU); g.closePath(); fs(g, '#fff', '#9aa7b8', 2.4); rr(g, -19, -63, 38, 6, 3); fs(g, '#e8434f', '#9a2530', 1.8); ell(g, 18, -61, 10, 3.4); fs(g, '#fff', '#9aa7b8', 1.6);
      [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * 16, -62); g.lineTo(s * 24, -72); g.strokeStyle = '#2a5aa8'; g.lineWidth = 3; g.stroke(); });
    },
    tuki: function (g) {   // toucan
      body(g, 0, -34, 24, 30, '#2d2a4a'); body(g, 3, -28, 14, 18, '#fff'); feet(g, 0, -4, '#ff9a3d', 10);
      eye(g, -2, -46, 7, 1.4); ell(g, 6, -40, 6, 4); circ(g, 4, -46, 0.1);
      g.beginPath(); g.moveTo(8, -52); g.quadraticCurveTo(40, -56, 44, -38); g.quadraticCurveTo(26, -34, 8, -38); g.closePath(); fs(g, '#ffb02e', '#a85f00', 2.4); g.beginPath(); g.moveTo(22, -46); g.quadraticCurveTo(40, -48, 44, -38); g.quadraticCurveTo(34, -38, 22, -39); g.closePath(); fs(g, '#ff6a2a', '#a83a00', 1.6); ell(g, 44, -40, 2.6, 2.6); fs(g, '#2d1b52');
      ell(g, -22, -28, 8, 16, 0.3); fs(g, '#2d2a4a', '#111', 2); circ(g, 12, -48, 4); fs(g, '#7fd6ff', null);
    },
    ziggy: function (g) {   // tree frog
      body(g, 0, -26, 28, 24, '#58d65a'); body(g, 0, -20, 18, 14, '#c8f08a'); feet(g, 0, -4, '#3fae4a', 16);
      [-1, 1].forEach(function (s) { circ(g, s * 14, -48, 10); fs(g, '#58d65a', '#2a7a2e', 2.4); eye(g, s * 14, -49, 7, 0.5); });
      g.beginPath(); g.arc(0, -32, 14, 0.1 * Math.PI, 0.9 * Math.PI); g.fillStyle = '#5a1d3a'; g.fill(); g.strokeStyle = '#2d1b52'; g.lineWidth = 2.4; g.stroke(); ell(g, 0, -24, 7, 3.4); fs(g, '#ff7a9a'); cheeks(g, 0, -32, 22);
      [-1, 1].forEach(function (s) { [-1, 0, 1].forEach(function (t) { circ(g, s * 30 + t * 4, -6 + Math.abs(t) * 1, 3.2); fs(g, '#7fe85a', '#2a7a2e', 1.4); }); });
    },
    fernie: function (g) {   // fuzzy fern monster
      for (var i = 0; i < 9; i++) { var a = -2.8 + i * 0.35; g.save(); g.translate(0, -36); g.rotate(a + Math.PI / 2); ell(g, 0, -34, 9, 20); fs(g, i % 2 ? '#4fc45a' : '#3fa84a', '#1f6a2c', 2); g.restore(); }
      body(g, 0, -30, 26, 26, '#7fe06a'); feet(g, 0, -4, '#3fa84a', 12); eye(g, -9, -34, 7.4, 1); eye(g, 9, -34, 7.4, 1); smile(g, 0, -20, 8); cheeks(g, 0, -25, 18);
      g.strokeStyle = '#3fa84a'; g.lineWidth = 1.6; for (var k = 0; k < 6; k++) { g.beginPath(); g.moveTo(-18 + k * 7, -12); g.lineTo(-18 + k * 7 + 2, -8); g.stroke(); }
    },
    digby: function (g) {   // mole
      body(g, 0, -30, 28, 28, '#8a7a9a'); body(g, 0, -22, 17, 15, '#b8a8c8'); feet(g, 0, -4, '#6a5a7a', 14); [-1, 1].forEach(function (s) { ell(g, s * 28, -22, 10, 7, s * 0.4); fs(g, '#c9a0a0', '#6a5a7a', 2); for (var c = -1; c <= 1; c++) { g.beginPath(); g.moveTo(s * 34 + c * 2, -22 + c * 4); g.lineTo(s * 40, -22 + c * 5); g.strokeStyle = '#fff'; g.lineWidth = 2.4; g.stroke(); } });
      eye(g, -9, -38, 4, 0.5); eye(g, 9, -38, 4, 0.5); ell(g, 0, -29, 8, 6); fs(g, '#ff9ab0', '#a05a6a', 2); smile(g, 0, -20, 6); cheeks(g, 0, -27, 18);
      g.beginPath(); g.ellipse(0, -56, 20, 11, 0, Math.PI, TAU); g.closePath(); fs(g, '#ffc83c', '#a8780a', 2.4); rr(g, -21, -57, 42, 6, 3); fs(g, '#ffc83c', '#a8780a', 2); circ(g, 0, -62, 6); fs(g, '#fffbe0', '#8a8f9c', 2);
    },
    lumi: function (g) {   // firefly
      var gr = g.createRadialGradient(0, -28, 4, 0, -28, 48); gr.addColorStop(0, 'rgba(255,240,120,0.55)'); gr.addColorStop(1, 'rgba(255,240,120,0)'); g.fillStyle = gr; circ(g, 0, -28, 48); g.fill();
      [-1, 1].forEach(function (s) { ell(g, s * 24, -50, 14, 22, s * 0.7); fs(g, 'rgba(220,245,255,0.8)', '#7fb0d6', 2); });
      body(g, 0, -30, 20, 26, '#4a4470'); ell(g, 0, -12, 17, 13); fs(g, '#ffe85a', '#c9a800', 2); ell(g, 0, -8, 10, 7); g.fillStyle = 'rgba(255,255,255,0.7)'; g.fill();
      eye(g, -8, -38, 6.4, 1); eye(g, 8, -38, 6.4, 1); smile(g, 0, -27, 6); cheeks(g, 0, -31, 14);
      [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * 7, -54); g.quadraticCurveTo(s * 10, -66, s * 16, -66); g.strokeStyle = '#4a4470'; g.lineWidth = 3; g.stroke(); circ(g, s * 16, -66, 3.4); fs(g, '#ffe85a'); });
    },
    quartz: function (g) {   // crystal monster
      g.fillStyle = 'rgba(190,150,255,0.2)'; circ(g, 0, -34, 44); g.fill();
      g.beginPath(); g.moveTo(-26, -4); g.lineTo(-30, -40); g.lineTo(-12, -62); g.lineTo(12, -62); g.lineTo(30, -40); g.lineTo(26, -4); g.closePath(); var gr = g.createLinearGradient(-30, -60, 30, 0); gr.addColorStop(0, '#e6d4ff'); gr.addColorStop(0.5, '#b58bff'); gr.addColorStop(1, '#8a5be0'); fs(g, gr, '#5a3a9a', 2.6);
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, -62); g.lineTo(-4, -4); g.moveTo(12, -62); g.lineTo(6, -4); g.moveTo(-30, -40); g.lineTo(30, -40); g.stroke();
      [[-18, -66, 9, 18], [0, -74, 11, 26], [18, -66, 9, 18]].forEach(function (p) { g.beginPath(); g.moveTo(p[0] - p[2] / 2, -58); g.lineTo(p[0], p[1] - p[3] + 14); g.lineTo(p[0] + p[2] / 2, -58); g.closePath(); fs(g, '#d9c0ff', '#5a3a9a', 2); });
      eye(g, -9, -38, 6.6, 1); eye(g, 9, -38, 6.6, 1); smile(g, 0, -24, 8); cheeks(g, 0, -29, 18);
    },
    waddle: function (g) {   // penguin
      body(g, 0, -32, 25, 31, '#2f3a5a'); body(g, 0, -26, 16, 22, '#fff'); [-1, 1].forEach(function (s) { ell(g, s * 12, -4, 11, 5); fs(g, '#ff9a3d', '#b8600a', 2); ell(g, s * 27, -28, 6, 15, s * 0.35); fs(g, '#2f3a5a', '#161c30', 2); });
      eye(g, -8, -44, 6, 1); eye(g, 8, -44, 6, 1); g.beginPath(); g.moveTo(-6, -37); g.lineTo(6, -37); g.lineTo(0, -29); g.closePath(); fs(g, '#ffb02e', '#b8780a', 2); cheeks(g, 0, -38, 17);
      g.strokeStyle = '#e8434f'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath(); g.moveTo(-14, -27); g.quadraticCurveTo(0, -20, 14, -27); g.stroke(); rr(g, 6, -26, 8, 18, 3); fs(g, '#e8434f', '#9a2530', 1.6);
    },
    snowy: function (g) {   // polar bear cub
      [-1, 1].forEach(function (s) { circ(g, s * 17, -56, 8); fs(g, '#fff', '#a9c4de', 2.4); circ(g, s * 17, -56, 4); fs(g, '#ffd3de'); });
      body(g, 0, -28, 28, 26, '#fff', { stroke: '#a9c4de' }); body(g, 0, -52, 22, 19, '#fff', { stroke: '#a9c4de' }); feet(g, 0, -4, '#e8f2fb', 15); [-1, 1].forEach(function (s) { ell(g, s * 26, -26, 8, 12, s * 0.3); fs(g, '#fff', '#a9c4de', 2.2); });
      eye(g, -8, -54, 4.4, 1); eye(g, 8, -54, 4.4, 1); ell(g, 0, -45, 11, 8); fs(g, '#f3f8fd', '#a9c4de', 1.8); ell(g, 0, -48, 4.4, 3.2); fs(g, '#2d1b52'); smile(g, 0, -42, 4.4); cheeks(g, 0, -47, 18);
      g.strokeStyle = '#7fc4ff'; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-16, -32); g.quadraticCurveTo(0, -25, 16, -32); g.stroke();
    },
    mittens: function (g) {   // fluffy white monster
      for (var i = 0; i < 14; i++) { var a = i / 14 * TAU; circ(g, Math.cos(a) * 26, -32 + Math.sin(a) * 26, 12); fs(g, '#fff', '#b4c8de', 2); } circ(g, 0, -32, 26); fs(g, '#fff'); feet(g, 0, -4, '#e8f2fb', 14);
      eye(g, -9, -36, 7, 1); eye(g, 9, -36, 7, 1); smile(g, 0, -24, 7); cheeks(g, 0, -28, 18);
      [-1, 1].forEach(function (s) { ell(g, s * 7, -63, 4, 10, s * 0.2); fs(g, '#fff', '#b4c8de', 2); }); g.beginPath(); g.ellipse(0, -62, 18, 10, 0, Math.PI, TAU); g.closePath(); fs(g, '#7fc4ff', '#3a78b8', 2.4); circ(g, 0, -74, 6); fs(g, '#fff', '#3a78b8', 2);
    },
    puff: function (g) {   // cloud monster
      [[-18, -30, 18], [18, -30, 18], [0, -40, 22], [-8, -22, 18], [12, -20, 16]].forEach(function (b) { circ(g, b[0], b[1], b[2]); fs(g, '#fff', '#a9c8ee', 2.4); });
      circ(g, 0, -30, 20); fs(g, '#fff'); eye(g, -9, -34, 6.4, 1); eye(g, 9, -34, 6.4, 1); smile(g, 0, -22, 7); cheeks(g, 0, -27, 17); feet(g, 0, -4, '#d6e8fb', 12);
      g.fillStyle = 'rgba(160,200,255,0.4)'; ell(g, 0, -10, 20, 6); g.fill();
    },
    zippy: function (g) {   // hummingbird
      var f = 0; [-1, 1].forEach(function (s) { ell(g, s * 24, -44, 8, 24, s * 0.9); fs(g, 'rgba(180,230,200,0.85)', '#3a9a6a', 2); });
      body(g, 0, -30, 20, 24, '#2fbf8a'); body(g, 0, -22, 12, 14, '#ff7a9a'); feet(g, 0, -4, '#d94a70', 8);
      eye(g, -4, -40, 6, 1.4); g.beginPath(); g.moveTo(6, -38); g.lineTo(44, -34); g.lineTo(6, -32); g.closePath(); fs(g, '#2d2a4a', '#111', 1.6); cheeks(g, 0, -33, 11);
      g.beginPath(); g.moveTo(-8, -52); g.quadraticCurveTo(-4, -64, 4, -62); g.strokeStyle = '#ff7a9a'; g.lineWidth = 5; g.lineCap = 'round'; g.stroke();
    },
    cumulus: function (g) {   // big cloud gardener with straw hat & watering can
      [[-24, -26, 22], [24, -26, 22], [0, -40, 26], [-14, -14, 20], [16, -14, 20]].forEach(function (b) { circ(g, b[0], b[1], b[2]); fs(g, '#fff', '#a9c8ee', 2.4); });
      circ(g, 0, -28, 24); fs(g, '#fff'); eye(g, -10, -32, 6.4, 1); eye(g, 10, -32, 6.4, 1); smile(g, 0, -20, 8); cheeks(g, 0, -25, 19);
      ell(g, 0, -56, 32, 8); fs(g, '#f2d27a', '#a8780a', 2.4); g.beginPath(); g.ellipse(0, -57, 16, 12, 0, Math.PI, TAU); g.closePath(); fs(g, '#f2d27a', '#a8780a', 2.4); rr(g, -16, -62, 32, 6, 2); fs(g, '#7fc45a', '#3f7a2a', 1.6);
      rr(g, 28, -20, 14, 12, 3); fs(g, '#4fa8ff', '#2a5aa8', 2); g.beginPath(); g.moveTo(42, -16); g.lineTo(52, -24); g.strokeStyle = '#4fa8ff'; g.lineWidth = 3; g.stroke();
    },
    bubbles: function (g) {   // round orange monster scientist
      body(g, 0, -32, 30, 28, '#ff9a3d'); body(g, 0, -24, 18, 14, '#ffc98a'); feet(g, 0, -4, '#d97a1d', 14);
      g.beginPath(); g.moveTo(-26, -22); g.lineTo(-30, -2); g.lineTo(30, -2); g.lineTo(26, -22); g.closePath(); fs(g, '#fff', '#9aa7b8', 2.2); g.beginPath(); g.moveTo(-8, -22); g.lineTo(0, -10); g.lineTo(8, -22); g.strokeStyle = '#9aa7b8'; g.lineWidth = 2; g.stroke();
      [-1, 1].forEach(function (s) { circ(g, s * 11, -44, 10); fs(g, 'rgba(190,255,230,0.65)', '#3a8a6a', 3); }); line2(g, -2, -44, 2, -44, '#3a8a6a', 3); eye(g, -11, -44, 4.6, 1); eye(g, 11, -44, 4.6, 1);
      g.beginPath(); g.arc(0, -33, 8, 0.1 * Math.PI, 0.9 * Math.PI); g.fillStyle = '#5a1d3a'; g.fill(); g.strokeStyle = '#2d1b52'; g.lineWidth = 2.2; g.stroke(); cheeks(g, 0, -34, 22);
      g.strokeStyle = '#e8c88a'; g.lineWidth = 3; [-1, 0, 1].forEach(function (k) { g.beginPath(); g.moveTo(k * 8, -58); g.lineTo(k * 12, -68); g.stroke(); }); circ(g, 22, -12, 5); fs(g, '#7fe6c8', '#2a8a6a', 1.6);
    },
    geo: function (g) {   // gecko
      g.beginPath(); g.moveTo(-20, -14); g.quadraticCurveTo(-44, -10, -42, -30); g.quadraticCurveTo(-34, -20, -22, -22); g.closePath(); fs(g, '#7fd05a', '#3a8a2a', 2.2);
      body(g, 0, -28, 22, 24, '#9be34c'); body(g, 0, -20, 13, 14, '#e8f8a0'); feet(g, 0, -4, '#6cba2e', 12); [-1, 1].forEach(function (s) { for (var t = -1; t <= 1; t++) circ(g, s * 24 + t * 3, -8 + Math.abs(t), 2.8), fs(g, '#9be34c', '#3a8a2a', 1.4); });
      [-1, 1].forEach(function (s) { circ(g, s * 11, -48, 8); fs(g, '#9be34c', '#3a8a2a', 2.2); eye(g, s * 11, -48, 6, 0.6); }); smile(g, 0, -28, 9); cheeks(g, 0, -33, 16);
      g.fillStyle = 'rgba(255,255,255,0.35)'; [[-8, -38], [6, -34], [-2, -22]].forEach(function (p) { circ(g, p[0], p[1], 2); g.fill(); });
    },
    fizz: function (g) {   // little blue monster
      body(g, 0, -28, 24, 26, '#4fc3e8'); feet(g, 0, -4, '#2f9ac4', 11); body(g, 0, -22, 14, 14, '#9ee0f6'); eye(g, -8, -34, 7, 1); eye(g, 8, -34, 7, 1);
      g.beginPath(); g.arc(0, -24, 7, 0.1 * Math.PI, 0.9 * Math.PI); g.fillStyle = '#5a1d3a'; g.fill(); g.strokeStyle = '#2d1b52'; g.lineWidth = 2.2; g.stroke(); cheeks(g, 0, -28, 17);
      [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * 12, -50); g.lineTo(s * 18, -62); g.strokeStyle = '#2f9ac4'; g.lineWidth = 3; g.stroke(); circ(g, s * 18, -63, 4); fs(g, s < 0 ? '#ffd23f' : '#ff7a9a'); });
      [[26, -40, 4], [32, -50, 3], [22, -54, 2.4]].forEach(function (b) { circ(g, b[0], b[1], b[2]); fs(g, 'rgba(255,255,255,0.7)', '#7fb0d6', 1.4); });
    }
  };
  function line2(g, x0, y0, x1, y1, c, w) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = c; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }

  /** NPC sprite (logical 96×96, foot anchor at bottom centre) */
  function npc(id, q) {
    var key = id + '@' + q; if (NPC_CACHE[key]) return NPC_CACHE[key];
    var c = canvas(96, 96, q), g = c.g; g.translate(48, 88);
    ell(g, 0, 1, 26, 7); g.fillStyle = 'rgba(30,20,60,0.2)'; g.fill();
    (NPCDRAW[id] || NPCDRAW.bumble)(g);
    return (NPC_CACHE[key] = { c: c.c, w: 96, h: 96, ax: 48, ay: 88 });
  }

  /* ================================================================ misc sprites */
  var emojiCache = {};
  function emoji(ch, px, q) {
    var key = ch + px + '@' + q; if (emojiCache[key]) return emojiCache[key];
    var c = canvas(px * 1.4, px * 1.4, q), g = c.g; g.font = Math.round(px) + 'px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, px * 0.7, px * 0.74);
    return (emojiCache[key] = c.c);
  }
  var miscCache = {};
  function once(key, w, h, q, fn) { key += '@' + q; if (miscCache[key]) return miscCache[key]; var c = canvas(w, h, q); fn(c.g); miscCache[key] = { c: c.c, w: w, h: h }; return miscCache[key]; }

  var GAME_COL = { shellSort: '#ffb23c', coconutHop: '#8fd05a', memoryMatch: '#b58bff', mathFishing: '#4fc3e8', wordBuilder: '#ff7ac8', bridgeBuilder: '#e8a050', patternGarden: '#7fe6a0', kiteGlide: '#ff7a70' };
  function spotPad(game, q) {
    return once('pad' + game, 80, 70, q, function (g) {
      var col = GAME_COL[game] || '#ffb23c'; g.translate(40, 42);
      ell(g, 0, 8, 34, 14); g.fillStyle = 'rgba(30,20,60,0.2)'; g.fill();
      ell(g, 0, 4, 32, 14); fs(g, dk(col, 0.25), dk(col, 0.5), 2); ell(g, 0, 0, 32, 14); fs(g, col, dk(col, 0.4), 2.4); ell(g, 0, 0, 22, 9); fs(g, lt(col, 0.4), null); ell(g, -6, -2, 10, 3); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fill();
    });
  }
  function signSprite(label, col, q) {
    return once('sign' + label + col, 70, 70, q, function (g) {
      g.translate(35, 62); ell(g, 0, 2, 16, 5); g.fillStyle = 'rgba(30,20,60,0.2)'; g.fill();
      rr(g, -4, -34, 8, 36, 2); fs(g, '#9a6a3e', '#5a3a1c', 2); rr(g, -26, -58, 52, 28, 8); fs(g, col, dk(col, 0.45), 2.8); g.fillStyle = 'rgba(255,255,255,0.3)'; rr(g, -22, -55, 44, 7, 3); g.fill();
      g.font = '22px "Apple Color Emoji","Noto Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 0, -43);
    });
  }
  function glow(q) {
    return once('glow', 64, 64, q, function (g) { var gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, 'rgba(255,248,190,0.95)'); gr.addColorStop(0.45, 'rgba(255,240,150,0.45)'); gr.addColorStop(1, 'rgba(255,240,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  }
  function boat(q) {
    return once('boat', 86, 70, q, function (g) {
      g.translate(43, 46); ell(g, 0, 14, 36, 8); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fill();
      g.beginPath(); g.moveTo(-34, 0); g.quadraticCurveTo(-30, 18, -16, 20); g.lineTo(18, 20); g.quadraticCurveTo(32, 18, 36, 0); g.closePath(); fs(g, '#e8434f', '#7a1a22', 2.8);
      g.beginPath(); g.moveTo(-34, 0); g.lineTo(36, 0); g.lineTo(34, 5); g.lineTo(-32, 5); g.closePath(); fs(g, '#fff', '#9aa7b8', 2);
      line2(g, 2, 0, 2, -40, '#7a4a1c', 3.4); g.beginPath(); g.moveTo(5, -38); g.quadraticCurveTo(26, -22, 28, -4); g.lineTo(5, -4); g.closePath(); fs(g, '#fff', '#9aa7b8', 2.2); g.beginPath(); g.moveTo(-2, -34); g.lineTo(-2, -4); g.lineTo(-20, -4); g.closePath(); fs(g, '#ffd23f', '#c98d00', 2.2);
      g.beginPath(); g.moveTo(2, -40); g.lineTo(14, -44); g.lineTo(2, -48); g.closePath(); fs(g, '#4fa8ff', '#2a5aa8', 1.6);
    });
  }
  function pier(q) {
    return once('pier', 48, 48, q, function (g) { for (var i = 0; i < 4; i++) { rr(g, 4, i * 12 + 1, 40, 10, 2); fs(g, '#d9a964', '#7a4a1c', 1.8); } g.fillStyle = '#7a4a1c'; circ(g, 5, 4, 3); g.fill(); circ(g, 43, 4, 3); g.fill(); circ(g, 5, 44, 3); g.fill(); circ(g, 43, 44, 3); g.fill(); });
  }
  function vignette(w, h) {
    var c = document.createElement('canvas'); c.width = 64; c.height = 128; var g = c.getContext('2d');
    var gr = g.createRadialGradient(32, 64, 30, 32, 64, 96); gr.addColorStop(0, 'rgba(20,10,50,0)'); gr.addColorStop(1, 'rgba(20,10,50,0.32)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128); return c;
  }

  SI.sprites = { T: T, H: H, hf: hf, paintChunk: paintChunk, prop: prop, npc: npc, emoji: emoji, spotPad: spotPad, signSprite: signSprite, glow: glow, boat: boat, pier: pier, vignette: vignette, waterDist: waterDist,
    tileAt: tileAt, mixc: mixc, dk: dk, lt: lt, GAME_COL: GAME_COL, drawNpcPortrait: function (id, px) { var c = npc(id, Math.min(2, root.devicePixelRatio || 1) * 1.2); return c; } };
})(typeof self !== 'undefined' ? self : this);
