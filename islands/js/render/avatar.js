/* Avatar renderer: the cute monster drawn in layers on a canvas (back item -> feet -> body -> top -> face -> head extra ->
 * glasses -> hat -> held item). Everything is procedural: no images. Coordinates: origin = feet centre on the ground,
 * y grows downwards (the monster is ~100 units tall). SI.avatar.draw(g, avatar, opts) and SI.avatar.thumb(...). */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {};
  var WD = SI.wardrobe;
  var TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- colour helpers */
  function hex(c) { if (c.charAt(0) === 'r') { var m = c.match(/\d+/g); return [+m[0], +m[1], +m[2]]; } c = c.replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.substr(0, 2), 16), parseInt(c.substr(2, 2), 16), parseInt(c.substr(4, 2), 16)]; }
  function rgb(a) { return 'rgb(' + Math.round(a[0]) + ',' + Math.round(a[1]) + ',' + Math.round(a[2]) + ')'; }
  function mix(c, t, k) { var a = hex(c), b = hex(t); return rgb([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]); }
  function dark(c, k) { return mix(c, '#2a1a4a', k == null ? 0.3 : k); }
  function light(c, k) { return mix(c, '#ffffff', k == null ? 0.4 : k); }
  var INK = '#2d1b52';

  /* ---------------------------------------------------------------- tiny path helpers */
  function ell(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU); }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fs(g, fill, stroke, lw) { if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2.5; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); } }
  function poly(g, pts) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); }
  function line(g, x0, y0, x1, y1, col, lw) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.stroke(); }
  function star(g, cx, cy, ro, ri, rot) {
    g.beginPath();
    for (var i = 0; i < 10; i++) { var r = i % 2 ? ri : ro, a = (rot || -Math.PI / 2) + i * Math.PI / 5; g[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    g.closePath();
  }

  /* ---------------------------------------------------------------- body shapes */
  var SHAPES = {
    blob: { W: 74, H: 84, n: 2.5, wf: function () { return 1; } },
    bean: { W: 58, H: 104, n: 2.3, wf: function () { return 1; } },
    round: { W: 90, H: 82, n: 2, wf: function () { return 1; } },
    drop: { W: 70, H: 86, n: 2, wf: function (v) { return 0.3 + 0.7 * Math.pow(v, 0.65); } },
    pear: { W: 78, H: 90, n: 2.2, wf: function (v) { return 0.62 + 0.38 * Math.pow(v, 1.1); } },
    square: { W: 82, H: 76, n: 4.2, wf: function () { return 1; } }
  };
  var FOOT = 9;   // body bottom sits this far above the ground
  function sgnpow(v, p) { return (v < 0 ? -1 : 1) * Math.pow(Math.abs(v), p); }
  var bodyCache = {};
  function bodyPts(shape) {
    if (bodyCache[shape]) return bodyCache[shape];
    var S = SHAPES[shape] || SHAPES.blob, N = 72, pts = [], cy = -FOOT - S.H / 2;
    for (var i = 0; i < N; i++) {
      var th = i / N * TAU, c = Math.cos(th), s = Math.sin(th), px = sgnpow(c, 2 / S.n), py = sgnpow(s, 2 / S.n), v = (py + 1) / 2;
      pts.push(px * S.W / 2 * S.wf(v), cy + py * S.H / 2);
    }
    return (bodyCache[shape] = pts);
  }
  function bodyPath(g, shape) {
    var p = bodyPts(shape); g.beginPath(); g.moveTo(p[0], p[1]);
    for (var i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]);
    g.closePath();
  }
  function anchors(shape) {
    var S = SHAPES[shape] || SHAPES.blob, top = -FOOT - S.H;
    function hwAt(v) { return S.W / 2 * S.wf(v) * 0.97; }
    return { S: S, top: top, eyeY: top + S.H * 0.36, mouthY: top + S.H * 0.58, tY0: top + S.H * 0.66, tY1: -FOOT + 1,
      hw: hwAt(0.7), hwTop: Math.max(15, hwAt(0.1)), hwEye: hwAt(0.36), hwMid: hwAt(0.55), footX: Math.max(10, Math.min(24, S.W * 0.2)), armY: top + S.H * 0.7, armX: hwAt(0.7) };
  }

  /* ---------------------------------------------------------------- face */
  function eyes(g, A, kind, blink, look) {
    var dx = Math.max(9, Math.min(17, A.hwEye * 0.5)), y = A.eyeY, lx = look * 1.5;
    function pair(fn) { fn(-dx); fn(dx); }
    function closed(x) { g.beginPath(); g.arc(x, y + 1, 6.5, Math.PI * 1.1, Math.PI * 1.9); g.strokeStyle = INK; g.lineWidth = 3.2; g.lineCap = 'round'; g.stroke(); }
    if (kind === 'happy') { pair(function (x) { g.beginPath(); g.arc(x, y + 3, 7, Math.PI * 1.12, Math.PI * 1.88); g.strokeStyle = INK; g.lineWidth = 4; g.lineCap = 'round'; g.stroke(); }); return; }
    if (kind === 'one') {
      if (blink) { closed(0); return; }
      ell(g, 0, y, 15, 15.5); fs(g, '#fff', INK, 2.5); ell(g, lx * 1.4, y + 1, 7.5, 7.5); fs(g, INK); ell(g, lx * 1.4 - 2.6, y - 2.5, 2.6, 2.6); fs(g, '#fff'); return;
    }
    if (blink) { pair(closed); return; }
    if (kind === 'round') pair(function (x) { ell(g, x, y, 8, 9); fs(g, '#fff', INK, 2.2); ell(g, x + lx, y + 1, 4.2, 4.6); fs(g, INK); ell(g, x + lx - 1.4, y - 1.2, 1.5, 1.5); fs(g, '#fff'); });
    else if (kind === 'big') pair(function (x) { ell(g, x, y, 10.5, 11.5); fs(g, '#fff', INK, 2.4); ell(g, x + lx * 1.2, y + 1, 5.6, 6.2); fs(g, INK); ell(g, x + lx * 1.2 - 2, y - 2, 2.1, 2.1); fs(g, '#fff'); });
    else if (kind === 'sleepy') pair(function (x) { ell(g, x, y + 1, 8.5, 8.5); fs(g, '#fff', INK, 2.2); ell(g, x + lx, y + 3, 4.2, 4.2); fs(g, INK); g.beginPath(); g.rect(x - 11, y - 11, 22, 11); fs(g, mix('#9be34c', '#ffffff', 0)); });
    else if (kind === 'star') pair(function (x) { ell(g, x, y, 10, 10.5); fs(g, '#fff', INK, 2.4); star(g, x + lx, y + 1, 6.4, 2.9); fs(g, '#ffb300', '#b36b00', 1.2); });
    else if (kind === 'sparkle') pair(function (x) { ell(g, x, y, 9, 11); fs(g, INK); ell(g, x - 2.6, y - 3.5, 3.4, 3.4); fs(g, '#fff'); ell(g, x + 3, y + 3.5, 1.8, 1.8); fs(g, '#fff'); });
  }
  function sleepyLids(g, A, color, blink) {
    var dx = Math.max(9, Math.min(17, A.hwEye * 0.5)), y = A.eyeY;
    [-dx, dx].forEach(function (x) { g.beginPath(); g.moveTo(x - 9, y - 0.5); g.lineTo(x + 9, y - 0.5); g.lineTo(x + 9, y - 12); g.lineTo(x - 9, y - 12); g.closePath(); fs(g, color); line(g, x - 9, y, x + 9, y, INK, 2.6); });
  }
  function mouth(g, A, kind) {
    var y = A.mouthY, pink = '#ff7a9a';
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (kind === 'smile') { g.beginPath(); g.arc(0, y - 4, 10, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = INK; g.lineWidth = 3.4; g.stroke(); }
    else if (kind === 'grin') { g.beginPath(); g.moveTo(-13, y - 3); g.quadraticCurveTo(0, y + 16, 13, y - 3); g.closePath(); fs(g, '#5a1d3a', INK, 2.6); g.save(); g.clip(); g.fillStyle = '#fff'; g.fillRect(-13, y - 4, 26, 5); ell(g, 0, y + 11, 8, 5); fs(g, pink); g.restore(); }
    else if (kind === 'open') { ell(g, 0, y + 2, 8.5, 9.5); fs(g, '#5a1d3a', INK, 2.6); g.save(); g.clip(); ell(g, 0, y + 10, 7, 5); fs(g, pink); g.restore(); }
    else if (kind === 'tongue') { g.beginPath(); g.arc(0, y - 4, 10, 0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = INK; g.lineWidth = 3.4; g.stroke(); rr(g, -4.6, y + 4, 9.2, 10, 4.6); fs(g, pink, INK, 2); line(g, 0, y + 7, 0, y + 11, '#d94a73', 1.6); }
    else if (kind === 'cat') { g.beginPath(); g.moveTo(-12, y - 1); g.quadraticCurveTo(-6, y + 8, 0, y - 1); g.quadraticCurveTo(6, y + 8, 12, y - 1); g.strokeStyle = INK; g.lineWidth = 3.2; g.stroke(); }
    else if (kind === 'small') { ell(g, 0, y + 2, 4.6, 5.4); fs(g, '#5a1d3a', INK, 2.4); }
    else if (kind === 'teeth') { g.beginPath(); g.arc(0, y - 4, 9, 0.2 * Math.PI, 0.8 * Math.PI); g.strokeStyle = INK; g.lineWidth = 3.2; g.stroke(); rr(g, -5.6, y + 3.4, 5.2, 8, 2); fs(g, '#fff', INK, 1.8); rr(g, 0.4, y + 3.4, 5.2, 8, 2); fs(g, '#fff', INK, 1.8); }
  }

  /* ---------------------------------------------------------------- head extras */
  function headExtra(g, A, kind, col, t) {
    var y = A.top + 5, x = A.hwTop * 0.62, sway = Math.sin(t * 2) * 0.05, cream = '#fff3d6', shade = '#d9b982';
    if (kind === 'horns-small' || kind === 'horns-big') {
      var big = kind === 'horns-big', hgt = big ? 30 : 17, wd = big ? 11 : 8;
      [-1, 1].forEach(function (s) { g.beginPath(); g.moveTo(s * (x - wd), y + 5); g.quadraticCurveTo(s * (x + 2), y - hgt * 0.5, s * (x + (big ? 8 : 4)), y - hgt); g.quadraticCurveTo(s * (x + wd + 3), y - hgt * 0.3, s * (x + wd), y + 5); g.closePath(); fs(g, cream, shade, 2.4); });
    } else if (kind === 'antlers') {
      [-1, 1].forEach(function (s) { g.strokeStyle = shade; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(s * x, y + 6); g.quadraticCurveTo(s * (x + 4), y - 14, s * (x + 12), y - 28); g.stroke();
        g.beginPath(); g.moveTo(s * (x + 4), y - 8); g.lineTo(s * (x + 17), y - 14); g.moveTo(s * (x + 9), y - 20); g.lineTo(s * (x + 2), y - 30); g.stroke();
        g.strokeStyle = cream; g.lineWidth = 4.6; g.beginPath(); g.moveTo(s * x, y + 6); g.quadraticCurveTo(s * (x + 4), y - 14, s * (x + 12), y - 28); g.stroke();
        g.beginPath(); g.moveTo(s * (x + 4), y - 8); g.lineTo(s * (x + 17), y - 14); g.moveTo(s * (x + 9), y - 20); g.lineTo(s * (x + 2), y - 30); g.stroke(); });
    } else if (kind === 'bunny') {
      [-1, 1].forEach(function (s) { g.save(); g.translate(s * (x - 1), y + 6); g.rotate(s * (0.18 + sway)); ell(g, 0, -20, 8.5, 24); fs(g, col, dark(col, 0.3), 2.6); ell(g, 0, -19, 4.4, 17); fs(g, '#ffb3cf'); g.restore(); });
    } else if (kind === 'round-ears') {
      [-1, 1].forEach(function (s) { ell(g, s * (x + 6), y + 4, 11, 11); fs(g, col, dark(col, 0.3), 2.6); ell(g, s * (x + 6), y + 5, 6, 6); fs(g, light(col, 0.5)); });
    } else if (kind === 'antenna') {
      g.save(); g.translate(0, y + 4); g.rotate(sway * 1.5); line(g, 0, 0, 0, -22, dark(col, 0.35), 3.5); ell(g, 0, -27, 7, 7); fs(g, '#ffd23f', '#b36b00', 2.4); ell(g, -2, -29, 2, 2); fs(g, '#fff'); g.restore();
    } else if (kind === 'antennae') {
      [-1, 1].forEach(function (s) { g.save(); g.translate(s * x * 0.8, y + 5); g.rotate(s * (0.28 + sway)); line(g, 0, 0, 0, -22, dark(col, 0.35), 3.5); ell(g, 0, -26, 6, 6); fs(g, s < 0 ? '#ffd23f' : '#ff7a9a', INK, 2); ell(g, -1.6, -28, 1.8, 1.8); fs(g, '#fff'); g.restore(); });
    } else if (kind === 'sprout') {
      g.save(); g.translate(0, y + 5); g.rotate(sway); line(g, 0, 0, 0, -13, '#3f9a2e', 3.5);
      [-1, 1].forEach(function (s) { g.save(); g.translate(0, -12); g.rotate(s * 0.9); ell(g, 0, -8, 5.5, 10); fs(g, '#6fd24a', '#2f7a22', 2); g.restore(); }); g.restore();
    }
  }

  /* ---------------------------------------------------------------- clothes: hats */
  function hat(g, A, shape, c1, c2, t) {
    var hw = A.hwTop, by = A.top + A.S.H * 0.14, d1 = dark(c1, 0.28), d2 = dark(c2, 0.28);
    g.save(); g.translate(0, by);
    switch (shape) {
      case 'cap': g.beginPath(); g.ellipse(0, 0, hw * 1.05, hw * 0.95, 0, Math.PI, TAU); g.closePath(); fs(g, c1, d1, 2.6);
        rr(g, 2, -5, hw * 1.25, 7, 3.5); fs(g, c2, dark(c2, 0.35), 2.4); ell(g, 0, -hw * 0.92, 3.4, 3.4); fs(g, c2, d2, 1.6); g.beginPath(); g.moveTo(-hw * 0.4, -hw * 0.9); g.quadraticCurveTo(-hw * 0.5, -hw * 0.3, -hw * 0.3, -2); g.strokeStyle = light(c1, 0.5); g.lineWidth = 3; g.stroke(); break;
      case 'beanie': g.beginPath(); g.ellipse(0, 2, hw * 1.05, hw * 1.0, 0, Math.PI, TAU); g.closePath(); fs(g, c1, d1, 2.6);
        for (var i = -2; i <= 2; i++) line(g, i * hw * 0.35, -hw * 0.9 * Math.cos(i * 0.5), i * hw * 0.38, -2, light(c1, 0.35), 2);
        rr(g, -hw * 1.1, -4, hw * 2.2, 11, 5); fs(g, c2, dark(c2, 0.3), 2.4); ell(g, 0, -hw * 1.08, 7, 7); fs(g, c2, dark(c2, 0.3), 2.2); break;
      case 'sunhat': ell(g, 0, 1, hw * 1.85, hw * 0.45); fs(g, c1, d2, 2.6); g.beginPath(); g.ellipse(0, -1, hw * 0.85, hw * 0.75, 0, Math.PI, TAU); g.closePath(); fs(g, c1, d2, 2.6);
        rr(g, -hw * 0.86, -9, hw * 1.72, 9, 3); fs(g, '#e8434f', dark('#e8434f', 0.3), 2); for (var k = -2; k < 3; k++) line(g, k * hw * 0.5 - 4, 3, k * hw * 0.5 + 4, 2, d2, 1.4); break;
      case 'explorer': ell(g, 0, 1, hw * 1.6, hw * 0.5); fs(g, c1, d1, 2.6); g.beginPath(); g.moveTo(-hw * 0.95, 0); g.quadraticCurveTo(-hw * 0.9, -hw * 1.1, -hw * 0.2, -hw * 0.95); g.quadraticCurveTo(0, -hw * 0.7, hw * 0.2, -hw * 0.95); g.quadraticCurveTo(hw * 0.9, -hw * 1.1, hw * 0.95, 0); g.closePath(); fs(g, c1, d1, 2.6);
        rr(g, -hw * 0.96, -8, hw * 1.92, 8, 3); fs(g, c2, dark(c2, 0.3), 2); break;
      case 'chef': rr(g, -hw * 0.85, -9, hw * 1.7, 14, 3); fs(g, c1, '#9aa7b8', 2.4);
        [[-0.55, -22, 0.6], [0.55, -22, 0.6], [0, -29, 0.75], [-0.2, -17, 0.7], [0.3, -18, 0.6]].forEach(function (b) { ell(g, b[0] * hw * 1.2, b[1] + 3, hw * b[2], hw * b[2]); fs(g, c1, '#9aa7b8', 2.4); });
        rr(g, -hw * 0.82, -8, hw * 1.64, 11, 3); fs(g, c1, '#9aa7b8', 2.2); break;
      case 'tophat': ell(g, 0, 1, hw * 1.35, hw * 0.34); fs(g, c1, dark(c1, 0.4), 2.6); rr(g, -hw * 0.82, -hw * 1.55, hw * 1.64, hw * 1.55, 5); fs(g, c1, dark(c1, 0.4), 2.6); rr(g, -hw * 0.83, -11, hw * 1.66, 9, 1); fs(g, c2, dark(c2, 0.3), 1.8); break;
      case 'cone': poly(g, [-hw * 0.9, 2, hw * 0.9, 2, 0, -hw * 2.1]); fs(g, c1, dark(c1, 0.3), 2.6);
        g.save(); g.clip(); [[-0.3, -0.5], [0.3, -0.9], [-0.05, -1.4], [0.35, -0.2], [-0.5, -0.1]].forEach(function (p) { ell(g, p[0] * hw * 1.4, p[1] * hw * 1, 3.2, 3.2); fs(g, c2); }); g.restore();
        ell(g, 0, -hw * 2.1, 6, 6); fs(g, c2, dark(c2, 0.3), 2); break;
      case 'helmet': g.beginPath(); g.ellipse(0, 3, hw * 1.12, hw * 1.08, 0, Math.PI, TAU); g.closePath(); fs(g, c1, dark(c1, 0.3), 2.6);
        g.save(); g.clip(); [-0.5, 0, 0.5].forEach(function (p) { rr(g, p * hw - 4, -hw * 1.2, 8, hw * 0.8, 4); fs(g, c2, dark(c2, 0.2), 1.4); }); g.restore(); rr(g, -hw * 1.12, 0, hw * 2.24, 6, 3); fs(g, c2, dark(c2, 0.3), 2); break;
      case 'crown': poly(g, [-hw * 0.95, 4, -hw * 1.0, -hw * 1.1, -hw * 0.5, -hw * 0.45, 0, -hw * 1.35, hw * 0.5, -hw * 0.45, hw * 1.0, -hw * 1.1, hw * 0.95, 4]); fs(g, c1, c2, 3);
        [[-0.99, -1.14], [0, -1.4], [0.99, -1.14]].forEach(function (p) { ell(g, p[0] * hw, p[1] * hw, 3.6, 3.6); fs(g, '#ff4f5e', dark('#ff4f5e', 0.3), 1.4); }); ell(g, 0, -hw * 0.3, 3.4, 3.4); fs(g, '#4aa8ff'); break;
      case 'sailor': ell(g, 0, 0, hw * 1.12, hw * 0.4); fs(g, c1, '#9aa7b8', 2.4); rr(g, -hw * 1.0, -hw * 0.65, hw * 2.0, hw * 0.68, 6); fs(g, c1, '#9aa7b8', 2.4); ell(g, 0, -hw * 0.65, hw * 1.0, hw * 0.25); fs(g, light(c1, 0.3), '#9aa7b8', 2);
        rr(g, -hw * 1.02, -hw * 0.28, hw * 2.04, 6.5, 2); fs(g, c2, dark(c2, 0.3), 1.6); break;
      case 'leaf': [[-0.9, -0.55], [0, 0], [0.9, 0.55]].forEach(function (p, i) { g.save(); g.translate(p[0] * hw * 0.7 + (i - 1) * 2, -hw * 0.28); g.rotate(p[0] * 0.9); ell(g, 0, -hw * 0.85, hw * 0.42, hw * 1.05); fs(g, i === 1 ? c1 : light(c1, 0.15), c2, 2.6); line(g, 0, -4, 0, -hw * 1.6, c2, 1.6); g.restore(); }); ell(g, 0, 0, hw * 0.9, hw * 0.3); fs(g, c2, dark(c2, 0.2), 2); break;
      case 'miner': g.beginPath(); g.ellipse(0, 3, hw * 1.1, hw * 1.0, 0, Math.PI, TAU); g.closePath(); fs(g, c1, dark(c1, 0.35), 2.6); rr(g, -hw * 1.18, 0, hw * 2.36, 7, 3); fs(g, c1, dark(c1, 0.35), 2.4);
        rr(g, -hw * 0.12, -hw * 1.0, hw * 0.24, hw * 0.4, 2); fs(g, c1, dark(c1, 0.35), 2); ell(g, 0, -hw * 0.45, 8, 8); fs(g, c2, dark(c2, 0.3), 2.2); ell(g, 0, -hw * 0.45, 4.6, 4.6); fs(g, '#fffbe0'); break;
      case 'winter': g.beginPath(); g.ellipse(0, 3, hw * 1.08, hw * 1.0, 0, Math.PI, TAU); g.closePath(); fs(g, c1, '#9ab4cc', 2.6);
        for (var j = -3; j <= 3; j++) { ell(g, j * hw * 0.3, 3, hw * 0.2, 7); fs(g, c1, '#9ab4cc', 1.6); } ell(g, 0, -hw * 1.05, 8.5, 8.5); fs(g, '#fff', '#9ab4cc', 2.2); rr(g, -hw * 1.1, -2, hw * 0.3, 9, 4); fs(g, c2, dark(c2, 0.2), 1.6); rr(g, hw * 0.8, -2, hw * 0.3, 9, 4); fs(g, c2, dark(c2, 0.2), 1.6); break;
      case 'cloud': [[-0.7, 0, 0.45], [0.7, 0, 0.45], [-0.35, -0.55, 0.55], [0.35, -0.55, 0.55], [0, -0.95, 0.5]].forEach(function (b) { ell(g, b[0] * hw, b[1] * hw + 2, hw * b[2], hw * b[2]); fs(g, c1, c2, 2.4); });
        ell(g, 0, -hw * 0.3, hw * 0.55, hw * 0.5); fs(g, c1); break;
      case 'lab': g.beginPath(); g.ellipse(0, 2, hw * 1.05, hw * 0.9, 0, Math.PI, TAU); g.closePath(); fs(g, c1, '#9aa7b8', 2.6); rr(g, -hw * 1.05, -6, hw * 2.1, 8, 3); fs(g, c2, dark(c2, 0.3), 2);
        ell(g, hw * 0.3, -hw * 0.5, 4, 4); fs(g, '#bfe6ff', '#6bb4ff', 1.4); ell(g, hw * 0.5, -hw * 0.8, 2.6, 2.6); fs(g, '#bfe6ff', '#6bb4ff', 1.2); break;
      case 'space': ell(g, 0, hw * 0.55, hw * 1.55, hw * 1.6); fs(g, 'rgba(120,190,255,0.28)', c1, 5); g.beginPath(); g.arc(0, hw * 0.55, hw * 1.25, Math.PI * 1.15, Math.PI * 1.45); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 4; g.lineCap = 'round'; g.stroke();
        rr(g, -hw * 1.3, hw * 1.7, hw * 2.6, 8, 4); fs(g, c1, dark(c1, 0.3), 2); ell(g, hw * 1.2, hw * 1.7, 4, 4); fs(g, c2); break;
    }
    g.restore();
  }

  /* ---------------------------------------------------------------- glasses */
  function glasses(g, A, shape, c1, c2) {
    var dx = Math.max(9, Math.min(17, A.hwEye * 0.5)), y = A.eyeY, lens = 'rgba(190,230,255,0.35)';
    g.save(); g.translate(0, y);
    function bridge(w) { line(g, -dx + w, 0, dx - w, 0, c1, 3); }
    switch (shape) {
      case 'round': [-dx, dx].forEach(function (x) { ell(g, x, 0, 13, 13); fs(g, lens, c1, 3.4); }); bridge(13); break;
      case 'sun': [-dx, dx].forEach(function (x) { rr(g, x - 13, -10, 26, 21, 8); fs(g, c1, '#000', 2); line(g, x - 7, -5, x - 2, -7, 'rgba(255,255,255,0.6)', 2.4); }); bridge(13); break;
      case 'square': [-dx, dx].forEach(function (x) { rr(g, x - 13, -12, 26, 24, 5); fs(g, lens, c1, 4); }); bridge(13); break;
      case 'star': [-dx, dx].forEach(function (x) { star(g, x, 0, 15, 8.5); fs(g, 'rgba(255,230,140,0.55)', c2, 3); }); bridge(11); break;
      case 'explorer': line(g, -A.hwEye * 1.05, 0, A.hwEye * 1.05, 0, '#7a5430', 5); [-dx, dx].forEach(function (x) { ell(g, x, 0, 14, 14); fs(g, 'rgba(150,224,255,0.5)', c1, 4.2); ell(g, x, 0, 9, 9); fs(g, null, dark(c1, 0.3), 1.4); }); break;
      case 'monocle': ell(g, dx, 0, 14, 14); fs(g, lens, c1, 3.2); g.beginPath(); g.moveTo(dx + 11, 10); g.quadraticCurveTo(dx + 18, 28, dx + 8, 38); g.strokeStyle = c1; g.lineWidth = 1.8; g.stroke(); break;
      case 'lab': rr(g, -dx - 16, -12, dx * 2 + 32, 24, 11); fs(g, 'rgba(160,255,210,0.38)', c1, 5); line(g, 0, -11, 0, 11, c1, 3); break;
      case 'snow': rr(g, -dx - 16, -13, dx * 2 + 32, 26, 12); fs(g, 'rgba(120,190,255,0.55)', c1, 5); g.beginPath(); g.arc(0, 0, 4, 0, 0); line(g, -dx - 8, -6, -dx + 2, -9, 'rgba(255,255,255,0.8)', 2.6); line(g, dx - 4, -7, dx + 6, -9, 'rgba(255,255,255,0.8)', 2.6); break;
      case 'moon': [-dx, dx].forEach(function (x) { ell(g, x, 0, 13, 13); fs(g, 'rgba(210,190,255,0.35)', c1, 3.6); g.beginPath(); g.arc(x - 1, 0, 6, 0.6, TAU - 0.6); g.arc(x + 2, -1, 5, TAU - 0.9, 0.9, true); g.closePath(); fs(g, c2); }); bridge(13); break;
    }
    g.restore();
  }

  /* ---------------------------------------------------------------- tops (behind-part + front-part) */
  var SLEEVED = { tee: 1, hoodie: 1, stripe: 1, raincoat: 1, vest: 0, chef: 1, overalls: 0, poncho: 0, parka: 1, labcoat: 1, dino: 1, astro: 1, bee: 1, penguin: 1, cloudsuit: 1 };
  function topBehind(g, A, shape, c1, c2, t) {
    var hw = A.hw, y0 = A.tY0, y1 = A.tY1;
    if (shape === 'dino') { // back spikes + tail
      [-0.45, -0.1, 0.25].forEach(function (p, i) { poly(g, [hw * 0.78 + 2, A.top + A.S.H * (0.3 + i * 0.14), hw * 1.05 + 8, A.top + A.S.H * (0.36 + i * 0.14), hw * 0.8, A.top + A.S.H * (0.42 + i * 0.14)]); fs(g, c2, dark(c2, 0.3), 2); });
      g.beginPath(); g.moveTo(hw * 0.6, y1 - 8); g.quadraticCurveTo(hw * 1.6, y1 - 6, hw * 1.7, y1 - 24); g.quadraticCurveTo(hw * 1.2, y1 - 14, hw * 0.7, y1 - 22); g.closePath(); fs(g, c1, dark(c1, 0.3), 2.4);
    } else if (shape === 'bee') {
      var f = Math.sin(t * 30) * 0.12;
      [-1, 1].forEach(function (s) { g.save(); g.translate(s * hw * 0.5, A.top + A.S.H * 0.45); g.rotate(s * (0.5 + f)); ell(g, s * 10, -16, 11, 20); fs(g, 'rgba(220,245,255,0.85)', '#7fb0d6', 2); g.restore(); });
    } else if (shape === 'cloudsuit') {
      [[-1.05, 0.35], [1.05, 0.35], [-1.0, 0.6], [1.0, 0.6]].forEach(function (b) { ell(g, b[0] * hw, A.top + A.S.H * b[1] + 8, 11, 11); fs(g, c1, c2, 2); });
    }
  }
  function top(g, A, shape, c1, c2, t) {
    var hw = A.hw, y0 = A.tY0, y1 = A.tY1, mid = (y0 + y1) / 2;
    g.save(); bodyPath(g, A.shape); g.clip();
    var d1 = dark(c1, 0.28);
    g.beginPath(); g.rect(-60, y0, 120, y1 - y0 + 6);
    // garment edge: slightly wavy neckline
    g.beginPath(); g.moveTo(-60, y0 + 2); g.quadraticCurveTo(0, y0 + (shape === 'overalls' ? 2 : 9), 60, y0 + 2); g.lineTo(60, y1 + 8); g.lineTo(-60, y1 + 8); g.closePath();
    var col = c1;
    if (shape === 'overalls') col = '#fff7e8';
    fs(g, col);
    switch (shape) {
      case 'tee': g.beginPath(); g.moveTo(-60, y0 + 2); g.quadraticCurveTo(0, y0 + 9, 60, y0 + 2); g.strokeStyle = c2; g.lineWidth = 4; g.stroke(); line(g, -60, y1 - 2, 60, y1 - 2, c2, 3); break;
      case 'hoodie': fs(g, null); rr(g, -hw * 0.55, mid - 1, hw * 1.1, (y1 - mid) * 0.8, 6); fs(g, c2, dark(c2, 0.2), 1.8); line(g, -5, y0 + 6, -6, y0 + 20, '#fff', 2.4); line(g, 5, y0 + 6, 6, y0 + 20, '#fff', 2.4); g.beginPath(); g.moveTo(-60, y0 + 2); g.quadraticCurveTo(0, y0 + 11, 60, y0 + 2); g.strokeStyle = dark(c1, 0.3); g.lineWidth = 5; g.stroke(); break;
      case 'stripe': for (var s = y0 + 6; s < y1; s += 11) line(g, -60, s, 60, s, c2, 5); break;
      case 'raincoat': line(g, 0, y0 + 4, 0, y1 + 4, dark(c1, 0.3), 2.6); [0.2, 0.5, 0.8].forEach(function (p) { ell(g, 6, y0 + (y1 - y0) * p + 2, 2.4, 2.4); fs(g, c2, dark(c2, 0.4), 1.2); }); g.beginPath(); g.moveTo(-60, y0 + 2); g.quadraticCurveTo(0, y0 + 11, 60, y0 + 2); g.strokeStyle = c2; g.lineWidth = 5; g.stroke(); break;
      case 'vest': [-1, 1].forEach(function (sx) { rr(g, sx * hw * 0.42 - 8, mid + 2, 16, 12, 3); fs(g, c2, dark(c2, 0.3), 1.6); }); line(g, 0, y0 + 3, 0, y1 + 4, dark(c1, 0.3), 2.4); line(g, -60, y1 - 7, 60, y1 - 7, '#7a5430', 4); break;
      case 'chef': [-1, 1].forEach(function (sx) { [0.2, 0.55, 0.9].forEach(function (p) { ell(g, sx * 6, y0 + (y1 - y0) * p, 2.4, 2.4); fs(g, c2, '#8a96a6', 1); }); }); line(g, 0, y0 + 3, 0, y1 + 4, '#b8c3d0', 2); break;
      case 'overalls': g.beginPath(); g.rect(-60, mid - 3, 120, y1 - mid + 8); fs(g, c1, dark(c1, 0.3), 2); rr(g, -12, mid + 4, 24, 14, 3); fs(g, dark(c1, 0.12), dark(c1, 0.35), 1.6); line(g, -hw * 0.5, mid - 3, -hw * 0.5 + 2, y0 - 6, c1, 6); line(g, hw * 0.5, mid - 3, hw * 0.5 - 2, y0 - 6, c1, 6); [-1, 1].forEach(function (sx) { ell(g, sx * hw * 0.5, mid - 2, 3.4, 3.4); fs(g, c2, dark(c2, 0.3), 1.2); }); break;
      case 'poncho': break;
      case 'parka': line(g, 0, y0 + 4, 0, y1 + 4, dark(c1, 0.3), 2.6); g.beginPath(); g.moveTo(-60, y0 + 2); g.quadraticCurveTo(0, y0 + 12, 60, y0 + 2); g.strokeStyle = c2; g.lineWidth = 8; g.stroke(); line(g, -60, y1 - 3, 60, y1 - 3, c2, 4); break;
      case 'labcoat': g.beginPath(); g.moveTo(-60, y0 + 2); g.lineTo(-9, y0 + 2); g.lineTo(0, y0 + 20); g.lineTo(9, y0 + 2); g.lineTo(60, y0 + 2); g.lineTo(60, y0 + 40); g.lineTo(-60, y0 + 40); g.closePath(); fs(g, null);
        poly(g, [-11, y0 + 1, 0, y0 + 20, -7, y0 + 24]); fs(g, c2, dark(c2, 0.2), 1.4); poly(g, [11, y0 + 1, 0, y0 + 20, 7, y0 + 24]); fs(g, c2, dark(c2, 0.2), 1.4); line(g, 0, y0 + 20, 0, y1 + 4, '#9aa7b8', 2); rr(g, hw * 0.3, mid + 2, 13, 11, 2); fs(g, '#fff', '#9aa7b8', 1.6); line(g, hw * 0.42, mid - 2, hw * 0.42, mid + 5, '#e8434f', 2); break;
      case 'dino': [0.3, 0.55, 0.8].forEach(function (p) { g.beginPath(); g.moveTo(-hw * 0.5, y0 + (y1 - y0) * p); g.quadraticCurveTo(0, y0 + (y1 - y0) * p + 5, hw * 0.5, y0 + (y1 - y0) * p); g.strokeStyle = c2; g.lineWidth = 3.4; g.stroke(); });
        [-1, 1].forEach(function (sx) { ell(g, sx * hw * 0.62, y0 + 8, 5, 5); fs(g, c2, dark(c2, 0.3), 1.4); }); break;
      case 'astro': line(g, -60, y0 + 6, 60, y0 + 6, c2, 6); rr(g, -hw * 0.45, mid - 1, hw * 0.9, 15, 4); fs(g, '#dfe8f3', '#9aa7b8', 1.8); [[-6, 1], [0, 1], [6, 1]].forEach(function (p, i) { ell(g, p[0], mid + 7, 2.2, 2.2); fs(g, ['#e8434f', '#ffd23f', '#3fcf8e'][i]); }); line(g, -60, y1 - 4, 60, y1 - 4, c2, 4); break;
      case 'bee': [0.3, 0.55, 0.8].forEach(function (p) { line(g, -60, y0 + (y1 - y0) * p, 60, y0 + (y1 - y0) * p, c2, 6); }); break;
      case 'penguin': ell(g, 0, mid + 6, hw * 0.62, (y1 - y0) * 0.62); fs(g, c2); break;
      case 'cloudsuit': for (var q = -3; q <= 3; q++) { ell(g, q * hw * 0.3, y0 + 3, hw * 0.2, 7); fs(g, c1, c2, 1.6); } for (var r = -3; r <= 3; r++) { ell(g, r * hw * 0.3, y1 + 1, hw * 0.2, 6); fs(g, c1, c2, 1.6); } break;
    }
    g.restore();
    if (shape === 'poncho') {   // not clipped: it hangs over the arms
      g.beginPath(); g.moveTo(-hw * 0.5, A.top + A.S.H * 0.55); g.lineTo(hw * 0.5, A.top + A.S.H * 0.55); g.lineTo(hw * 1.35, y1 - 1); g.lineTo(-hw * 1.35, y1 - 1); g.closePath(); fs(g, c1, dark(c1, 0.3), 2.6);
      g.save(); g.clip(); for (var z = -4; z <= 4; z++) poly(g, [z * hw * 0.34 - 6, y1 + 2, z * hw * 0.34 + 6, y1 + 2, z * hw * 0.34, y1 - 9]); fs(g, c2); g.restore(); ell(g, 0, A.top + A.S.H * 0.55, hw * 0.52, 6); fs(g, dark(c1, 0.25), dark(c1, 0.4), 2);
    }
    if (shape === 'penguin') { // beak-less: little feet are shoes; add belly highlight only
    }
    if (shape === 'astro') { ell(g, 0, y0 + 3, hw * 0.62, 6); fs(g, '#dfe8f3', '#9aa7b8', 2); }
    if (shape === 'hoodie') { ell(g, 0, y0 + 1, hw * 0.55, 6); fs(g, dark(c1, 0.15), dark(c1, 0.4), 2); }
    if (shape === 'dino') { /* collar */ }
  }

  /* ---------------------------------------------------------------- back items (behind the body) */
  function back(g, A, shape, c1, c2, t) {
    var hw = A.hw, tp = A.top, sy = tp + A.S.H * 0.5;
    switch (shape) {
      case 'backpack': rr(g, -hw * 1.12, sy - 14, hw * 2.24, 44, 12); fs(g, c1, dark(c1, 0.35), 2.8); rr(g, -hw * 0.7, sy + 10, hw * 1.4, 16, 6); fs(g, c2, dark(c2, 0.2), 1.8); rr(g, -8, sy - 22, 16, 12, 6); fs(g, null, dark(c1, 0.35), 3); break;
      case 'cape-red': case 'cape-blue': case 'leafcape': case 'golden': case 'scarfcape':
        g.beginPath(); g.moveTo(-hw * 0.6, sy - 22); g.quadraticCurveTo(0, sy - 30, hw * 0.6, sy - 22); g.quadraticCurveTo(hw * 1.5, sy + 20, hw * 1.45, -2); g.quadraticCurveTo(0, 6 + Math.sin(t * 3) * 1.5, -hw * 1.45, -2); g.quadraticCurveTo(-hw * 1.5, sy + 20, -hw * 0.6, sy - 22); g.closePath();
        fs(g, c1, dark(c1, 0.35), 2.8);
        if (shape === 'cape-blue') { g.save(); g.clip(); [[-0.9, -4], [0.9, -10], [-0.5, -22], [0.55, -28], [0, -12]].forEach(function (p) { star(g, p[0] * hw, p[1] + 2, 4.4, 1.9); fs(g, c2); }); g.restore(); }
        if (shape === 'golden') { g.save(); g.clip(); line(g, -hw * 1.4, -4, hw * 1.4, -4, c2, 5); star(g, 0, sy + 10, 9, 4, -Math.PI / 2); fs(g, c2, dark(c2, 0.3), 1.6); g.restore(); }
        if (shape === 'leafcape') { g.save(); g.clip(); [-1, -0.5, 0, 0.5, 1].forEach(function (p) { g.save(); g.translate(p * hw * 1.1, -2); g.rotate(p * 0.25); ell(g, 0, -4, 6, 11); fs(g, c2, dark(c2, 0.2), 1.4); g.restore(); }); g.restore(); }
        break;
      case 'wings': var f = Math.sin(t * 4) * 0.1; [-1, 1].forEach(function (s) { g.save(); g.translate(s * hw * 0.6, sy - 10); g.rotate(s * (0.35 + f)); ell(g, s * 22, -12, 24, 31); fs(g, c1, dark(c1, 0.25), 2.6); ell(g, s * 20, 20, 15, 19); fs(g, light(c1, 0.15), dark(c1, 0.25), 2.4); ell(g, s * 24, -14, 8, 8); fs(g, c2); ell(g, s * 21, 20, 5, 5); fs(g, c2); g.restore(); }); break;
      case 'shell': g.beginPath(); g.ellipse(0, sy + 8, hw * 1.2, A.S.H * 0.42, 0, 0, TAU); fs(g, c1, dark(c1, 0.35), 3); g.save(); g.clip(); line(g, -hw * 1.2, sy + 8, hw * 1.2, sy + 8, c2, 2.4); line(g, -hw * 0.6, sy - 30, -hw * 0.6, sy + 50, c2, 2.4); line(g, hw * 0.6, sy - 30, hw * 0.6, sy + 50, c2, 2.4); g.restore(); break;
      case 'jetpack': [-1, 1].forEach(function (s) { rr(g, s * hw * 0.95 - 8, sy - 10, 16, 40, 8); fs(g, c1, '#8a96a6', 2.6); poly(g, [s * hw * 0.95 - 6, sy + 30, s * hw * 0.95 + 6, sy + 30, s * hw * 0.95, sy + 38 + Math.sin(t * 25 + s) * 3]); fs(g, c2, '#e8780a', 1.6); poly(g, [s * hw * 0.95 - 3, sy + 31, s * hw * 0.95 + 3, sy + 31, s * hw * 0.95, sy + 56 + Math.sin(t * 30 + s) * 5]); fs(g, '#ffd23f'); rr(g, s * hw * 0.95 - 8, sy - 4, 16, 6, 2); fs(g, c2); }); break;
      case 'kite': g.save(); g.translate(0, sy + 4); g.rotate(0.05 + Math.sin(t * 2) * 0.03); poly(g, [0, -42, hw * 1.35, 0, 0, 46, -hw * 1.35, 0]); fs(g, c1, dark(c1, 0.3), 2.8); line(g, 0, -42, 0, 46, c2, 3); line(g, -hw * 1.35, 0, hw * 1.35, 0, c2, 3); for (var k = 0; k < 3; k++) { ell(g, Math.sin(t * 3 + k) * 4, 54 + k * 10, 5, 3.2); fs(g, k % 2 ? c2 : c1, dark(c1, 0.3), 1.4); } g.restore(); break;
    }
  }
  function backFront(g, A, shape, c1, c2) {   // bits of back items drawn over the body (clasps, scarf)
    var tp = A.top, y = A.top + A.S.H * 0.62;
    if (shape === 'cape-red' || shape === 'cape-blue' || shape === 'golden' || shape === 'leafcape') { ell(g, -A.hw * 0.62, y - 3, 4.6, 4.6); fs(g, '#ffd23f', '#b36b00', 1.8); ell(g, A.hw * 0.62, y - 3, 4.6, 4.6); fs(g, '#ffd23f', '#b36b00', 1.8); }
    if (shape === 'scarfcape') { g.beginPath(); g.moveTo(-A.hw * 0.78, y - 7); g.quadraticCurveTo(0, y + 8, A.hw * 0.78, y - 7); g.lineTo(A.hw * 0.78, y + 3); g.quadraticCurveTo(0, y + 18, -A.hw * 0.78, y + 3); g.closePath(); fs(g, c1, dark(c1, 0.3), 2.4); for (var i = -3; i <= 3; i++) line(g, i * 8, y + 3 + (1 - Math.abs(i) / 4) * 5, i * 8 + 1, y + 9 + (1 - Math.abs(i) / 4) * 5, c2, 3); rr(g, A.hw * 0.3, y + 6, 11, 24, 4); fs(g, c1, dark(c1, 0.3), 2.2); line(g, A.hw * 0.3, y + 16, A.hw * 0.3 + 11, y + 16, c2, 3); line(g, A.hw * 0.3, y + 23, A.hw * 0.3 + 11, y + 23, c2, 3); }
    if (shape === 'backpack') { line(g, -A.hw * 0.7, A.top + A.S.H * 0.55, -A.hw * 0.75, A.top + A.S.H * 0.85, c2, 5); line(g, A.hw * 0.7, A.top + A.S.H * 0.55, A.hw * 0.75, A.top + A.S.H * 0.85, c2, 5); }
  }

  /* ---------------------------------------------------------------- shoes (drawn over the feet) */
  function shoe(g, x, lift, side, shape, c1, c2, t) {
    var y = -4 - lift, s = side;
    g.save(); g.translate(x, y);
    switch (shape) {
      case 'sneaker': rr(g, -11, -6, 23, 12, 6); fs(g, c1, '#8a96a6', 2.2); rr(g, -12, 2, 25, 5, 2.5); fs(g, c2, dark(c2, 0.3), 1.4); line(g, -4, -4, 3, -4, c2, 2); break;
      case 'boots': rr(g, -9, -14, 19, 20, 5); fs(g, c1, dark(c1, 0.35), 2.4); rr(g, -10, -15, 21, 5, 2); fs(g, c2, dark(c2, 0.3), 1.6); rr(g, -12, 3, 25, 4, 2); fs(g, dark(c1, 0.4)); break;
      case 'hiking': rr(g, -10, -12, 21, 18, 6); fs(g, c1, c2, 2.4); rr(g, -12, 2, 25, 6, 3); fs(g, c2); line(g, -5, -7, 5, -7, '#e8d8a8', 2); line(g, -5, -3, 5, -3, '#e8d8a8', 2); break;
      case 'sandals': rr(g, -11, 2, 23, 5, 2.5); fs(g, c1, dark(c1, 0.3), 1.8); line(g, -6, 2, 0, -5, c2, 3); line(g, 7, 2, 0, -5, c2, 3); break;
      case 'snow': rr(g, -10, -14, 21, 20, 6); fs(g, c1, dark(c1, 0.3), 2.4); for (var i = -2; i <= 2; i++) { ell(g, i * 4.2, -14, 3.4, 4); fs(g, c2); } rr(g, -12, 3, 25, 5, 2.5); fs(g, dark(c1, 0.35)); break;
      case 'flippers': g.beginPath(); g.moveTo(-8, -3); g.quadraticCurveTo(s * 14 + 4, -14, s * 26, 4); g.quadraticCurveTo(s * 10, 12, -8, 6); g.closePath(); fs(g, c1, c2, 2.4); line(g, s * 4, -2, s * 18, 3, c2, 1.6); line(g, s * 2, 3, s * 14, 6, c2, 1.6); break;
      case 'rocket': rr(g, -10, -12, 21, 18, 6); fs(g, c1, '#8a96a6', 2.4); rr(g, -11, -2, 23, 5, 2); fs(g, c2); poly(g, [-5, 7, 5, 7, 0, 14 + Math.sin(t * 28 + x) * 3]); fs(g, '#ffd23f', '#e8780a', 1.2); break;
      case 'cloud': [[-8, 0, 7], [0, -3, 8], [8, 0, 7], [0, 3, 7]].forEach(function (b) { ell(g, b[0], b[1], b[2], b[2] * 0.85); fs(g, c1, c2, 1.8); }); break;
      case 'gold': rr(g, -11, -6, 23, 12, 6); fs(g, c1, c2, 2.4); rr(g, -12, 2, 25, 5, 2.5); fs(g, c2); star(g, 3, -4 - Math.sin(t * 5 + x) * 1, 3.2, 1.4); fs(g, '#fff'); break;
    }
    g.restore();
  }

  /* ---------------------------------------------------------------- held items (at the right hand) */
  function held(g, A, shape, c1, c2, t, hx, hy) {
    g.save(); g.translate(hx, hy); var sw = Math.sin(t * 2.4);
    switch (shape) {
      case 'bucket': g.beginPath(); g.arc(0, -8, 9, Math.PI, TAU); g.strokeStyle = '#8a96a6'; g.lineWidth = 2; g.stroke(); poly(g, [-10, -8, 10, -8, 8, 9, -8, 9]); fs(g, c1, dark(c1, 0.35), 2.2); line(g, -9, -2, 9, -2, c2, 3); ell(g, 0, -8, 10, 2.6); fs(g, dark(c1, 0.2), dark(c1, 0.35), 1.4); break;
      case 'net': line(g, 0, 8, 3, -30, '#8a5a34', 3.5); g.save(); g.translate(3, -40); g.rotate(sw * 0.06); ell(g, 0, 0, 13, 15); fs(g, 'rgba(255,255,255,0.35)', c1, 3); line(g, -12, 0, 12, 0, c2, 1); line(g, 0, -14, 0, 14, c2, 1); g.restore(); break;
      case 'balloon': g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sw * 6, -20, 0 + sw * 4, -42); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.stroke(); g.save(); g.translate(sw * 4, -56 + sw * 2); ell(g, 0, 0, 14, 17); fs(g, c1, dark(c1, 0.3), 2.4); ell(g, -5, -6, 3.2, 5); fs(g, 'rgba(255,255,255,0.7)'); poly(g, [-3, 16, 3, 16, 0, 20]); fs(g, dark(c1, 0.2)); g.restore(); break;
      case 'umbrella': line(g, 0, 8, 0, -34, '#8a5a34', 3.2); g.beginPath(); g.arc(0, -34, 28, Math.PI, TAU); g.quadraticCurveTo(21, -28, 14, -33); g.quadraticCurveTo(7, -28, 0, -33); g.quadraticCurveTo(-7, -28, -14, -33); g.quadraticCurveTo(-21, -28, -28, -34); g.closePath(); fs(g, c1, dark(c1, 0.35), 2.6); g.save(); g.clip(); [-14, 0, 14].forEach(function (x) { poly(g, [x - 7, -34, x + 7, -34, x, -62]); fs(g, c2); }); g.restore(); break;
      case 'lantern': line(g, 0, 0, 0, -10, '#8a5a34', 2.4); g.beginPath(); g.arc(0, -10, 6, Math.PI, TAU); g.strokeStyle = '#8a5a34'; g.lineWidth = 2; g.stroke(); ell(g, 0, 4, 20 + sw, 20 + sw); fs(g, 'rgba(255,214,90,0.18)'); rr(g, -8, -2, 16, 20, 5); fs(g, c1, '#8a4a10', 2.2); rr(g, -4.6, 2, 9.2, 12, 4); fs(g, '#fff4a8'); rr(g, -9, -4, 18, 4, 2); fs(g, '#8a4a10'); rr(g, -9, 17, 18, 4, 2); fs(g, '#8a4a10'); break;
      case 'book': g.rotate(-0.15); poly(g, [-14, -9, 0, -6, 14, -9, 14, 11, 0, 14, -14, 11]); fs(g, c1, dark(c1, 0.35), 2.4); line(g, 0, -6, 0, 14, dark(c1, 0.35), 2); line(g, -10, -3, -3, -1, c2, 2); line(g, -10, 3, -3, 5, c2, 2); line(g, 3, -1, 10, -3, c2, 2); line(g, 3, 5, 10, 3, c2, 2); break;
      case 'telescope': g.save(); g.rotate(-0.9); rr(g, -4, -34, 10, 38, 3); fs(g, c1, dark(c1, 0.4), 2.2); rr(g, -6, -48, 14, 16, 3); fs(g, c1, dark(c1, 0.4), 2.2); rr(g, -4, -22, 10, 4, 1); fs(g, c2); rr(g, -7, -50, 16, 5, 2); fs(g, c2, dark(c2, 0.3), 1.6); ell(g, 1, -50, 6, 2); fs(g, '#bfe6ff'); g.restore(); break;
      case 'brush': g.save(); g.rotate(-0.5); rr(g, -2.5, -34, 5, 40, 2.5); fs(g, c1, dark(c1, 0.4), 1.8); poly(g, [-4, -34, 4, -34, 0, -50]); fs(g, c2, dark(c2, 0.4), 1.6); g.restore(); break;
      case 'lens': g.save(); g.rotate(0.3); line(g, 0, 6, -4, -14, '#8a5a34', 4.5); ell(g, -6, -26, 13, 13); fs(g, 'rgba(190,230,255,0.45)', c1, 4); g.beginPath(); g.arc(-6, -26, 8, Math.PI * 1.1, Math.PI * 1.5); g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 2.4; g.stroke(); g.restore(); break;
      case 'kite': g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(sw * 10, -30, 6 + sw * 6, -60); g.strokeStyle = '#fff'; g.lineWidth = 1.4; g.stroke(); g.save(); g.translate(6 + sw * 6, -70); g.rotate(0.25 + sw * 0.1); poly(g, [0, -15, 11, 0, 0, 17, -11, 0]); fs(g, c1, dark(c1, 0.3), 2); line(g, 0, -15, 0, 17, c2, 1.8); line(g, -11, 0, 11, 0, c2, 1.8); ell(g, 0, 22, 3, 2.4); fs(g, c2); g.restore(); break;
      case 'pennant': line(g, 0, 8, 0, -50, '#8a5a34', 3.2); g.beginPath(); g.moveTo(1, -48); g.quadraticCurveTo(14 + sw * 3, -46, 28 + sw * 4, -38); g.quadraticCurveTo(14, -34, 1, -28); g.closePath(); fs(g, c1, dark(c1, 0.3), 2); star(g, 9, -38, 4, 1.8); fs(g, '#fff'); break;
      case 'lolly': rr(g, -2, -4, 4.5, 16, 2); fs(g, '#e8c88a', '#a07a3a', 1.6); rr(g, -8, -34, 16, 31, 8); fs(g, c1, dark(c1, 0.35), 2.2); rr(g, -8, -20, 16, 8, 0); fs(g, c2); g.save(); rr(g, -8, -34, 16, 31, 8); g.clip(); rr(g, -8, -20, 16, 8, 0); fs(g, c2); g.restore(); break;
      case 'crab': g.save(); g.translate(0, -7 + sw); ell(g, 0, 0, 13, 9); fs(g, c1, c2, 2.2); [-1, 1].forEach(function (s) { ell(g, s * 5, -9, 3.6, 3.6); fs(g, '#fff', INK, 1.2); ell(g, s * 5, -9, 1.6, 1.6); fs(g, INK); line(g, s * 12, -2, s * 18, -9 + sw * 2, c1, 3.4); ell(g, s * 19, -11 + sw * 2, 4, 3.4); fs(g, c1, c2, 1.6); for (var l = 0; l < 2; l++) line(g, s * 9, 5 + l * 1.6, s * 16, 8 + l * 3, c2, 2); }); g.beginPath(); g.arc(0, 1, 3.6, 0.2, Math.PI - 0.2); g.strokeStyle = INK; g.lineWidth = 1.6; g.stroke(); g.restore(); break;
    }
    g.restore();
  }

  /* ---------------------------------------------------------------- the whole avatar */
  function colorOf(av) { var p = WD.partInfo('color', av.color); return p ? p.hex : '#9be34c'; }
  function itemOf(av, slot) { var id = av.equip && av.equip[slot]; return id && WD.byId[id] ? WD.byId[id] : null; }

  /** o: { x, y, s, t, dir, walk (0..1), phase, blink (bool, optional), look, only (slot name to hide others: for thumbs), hide:{slot:true} } */
  function draw(g, av, o) {
    o = o || {};
    var t = o.t || 0, s = o.s || 1, dir = o.dir || 1, walk = o.walk || 0, ph = o.phase || 0;
    var shape = SHAPES[av.body] ? av.body : 'blob', A = anchors(shape); A.shape = shape;
    var col = colorOf(av), shade = dark(col, 0.32), hi = light(col, 0.45);
    var blink = o.blink != null ? o.blink : (t % 3.4) > 3.26;
    var hide = o.hide || {};
    // motion
    var bounce, sq;
    if (walk > 0.05) { bounce = Math.abs(Math.sin(ph)) * 5 * walk; sq = Math.cos(ph * 2) * 0.035 * walk; }
    else { bounce = (Math.sin(t * 2.3) * 0.5 + 0.5) * 2.2; sq = Math.sin(t * 2.3 + 1.2) * 0.018; }
    var tilt = Math.sin(ph) * 0.045 * walk;
    // ground shadow
    g.save(); g.translate(o.x || 0, o.y || 0); g.scale(s * dir, s);
    if (!o.noShadow) { ell(g, 0, 1, A.S.W * 0.48 * (1 - bounce * 0.02), 7); g.fillStyle = 'rgba(30,20,60,0.22)'; g.fill(); }
    var lift = [0, 0]; if (walk > 0.05) { lift[0] = Math.max(0, Math.sin(ph)) * 7 * walk; lift[1] = Math.max(0, -Math.sin(ph)) * 7 * walk; }
    // behind layer: back item, costume extras
    var bk = itemOf(av, 'back'), tp = itemOf(av, 'top'), sh = itemOf(av, 'shoes'), ht = itemOf(av, 'hat'), gl = itemOf(av, 'glasses'), hd = itemOf(av, 'held');
    g.save(); g.translate(0, -bounce); g.translate(0, 0);
    g.rotate(tilt); g.scale(1 - sq, 1 + sq);
    if (bk && !hide.back) back(g, A, bk.shape, bk.colors[0], bk.colors[1], t);
    if (tp && !hide.top) topBehind(g, A, tp.shape, tp.colors[0], tp.colors[1], t);
    // feet (under body)
    var fx = A.footX;
    [-1, 1].forEach(function (sd, i) {
      var fl = lift[i] - 0; g.save(); g.translate(0, bounce); // feet stay on the ground
      ell(g, sd * fx, -4 - fl, 11, 6.2); fs(g, shade, dark(col, 0.5), 2); g.restore();
    });
    // arms (behind body slightly)
    var armSwing = walk > 0.05 ? Math.sin(ph) * 7 * walk : Math.sin(t * 2.3 + 0.5) * 1.5;
    var sleeve = tp && SLEEVED[tp.shape] ? tp.colors[0] : null;
    if (tp && tp.shape === 'overalls') sleeve = '#fff7e8';
    if (tp && tp.shape === 'bee') sleeve = tp.colors[0];
    var handR = { x: A.armX + 8, y: A.armY - 2 };
    [-1, 1].forEach(function (sd, i) {
      var ay = A.armY + (i === 0 ? armSwing : -armSwing) * 0.5, ax = sd * (A.armX + 1);
      g.save(); g.translate(ax, A.armY - 8); g.rotate(sd * 0.35 + (i === 0 ? -armSwing : armSwing) * 0.03);
      if (hd && sd === 1 && !hide.held) g.rotate(-0.55);
      ell(g, sd * 3, 9, 7.5, 13); fs(g, sleeve || col, dark(sleeve || col, 0.4), 2.6);
      if (!sleeve) { ell(g, sd * 3 - 1, 5, 2.6, 5); fs(g, hi); } else { ell(g, sd * 3, 20, 6, 4.4); fs(g, col, dark(col, 0.4), 2); }
      g.restore();
    });
    // body
    bodyPath(g, shape);
    var gr = g.createLinearGradient(0, A.top, 0, -FOOT); gr.addColorStop(0, hi); gr.addColorStop(0.35, col); gr.addColorStop(1, mix(col, shade, 0.55));
    fs(g, gr, dark(col, 0.55), 3.2);
    // belly + gloss
    g.save(); bodyPath(g, shape); g.clip();
    ell(g, 0, -FOOT - A.S.H * 0.2, A.hw * 0.62, A.S.H * 0.22); g.fillStyle = 'rgba(255,255,255,0.2)'; g.fill();
    g.beginPath(); g.ellipse(-A.hwEye * 0.62, A.top + A.S.H * 0.17, A.hwEye * 0.34, A.S.H * 0.1, -0.5, 0, TAU); g.fillStyle = 'rgba(255,255,255,0.45)'; g.fill();
    g.restore();
    // top
    if (tp && !hide.top) top(g, A, tp.shape, tp.colors[0], tp.colors[1], t);
    if (bk && !hide.back) backFront(g, A, bk.shape, bk.colors[0], bk.colors[1]);
    // shoes
    if (sh && !hide.shoes) [-1, 1].forEach(function (sd, i) { g.save(); g.translate(0, bounce); shoe(g, sd * fx, lift[i], sd, sh.shape, sh.colors[0], sh.colors[1], t); g.restore(); });
    // face
    var eyeKind = av.eyes;
    eyes(g, A, eyeKind, blink, o.look || 0);
    if (eyeKind === 'sleepy' && !blink) sleepyLids(g, A, col, blink);
    mouth(g, A, av.mouth);
    // cheeks
    [-1, 1].forEach(function (sd) { ell(g, sd * (A.hwEye * 0.95), A.mouthY - 5, 5, 3.2); g.fillStyle = 'rgba(255,110,140,0.35)'; g.fill(); });
    headExtra(g, A, av.head, col, t);
    if (gl && !hide.glasses) glasses(g, A, gl.shape, gl.colors[0], gl.colors[1]);
    if (ht && !hide.hat) hat(g, A, ht.shape, ht.colors[0], ht.colors[1], t);
    // held item (right hand)
    if (hd && !hide.held) held(g, A, hd.shape, hd.colors[0], hd.colors[1], t, A.armX + 11, A.armY - 2 - 8 + 17 * 0.2 - 9);
    g.restore();
    g.restore();
  }

  /* ---------------------------------------------------------------- canvases */
  var CROPS = {   // which part of the avatar to show for an item thumbnail: [cx, cy, halfWidth] in avatar units (feet = 0)
    hat: [0, -102, 38], glasses: [0, -64, 34], top: [0, -34, 42], back: [0, -48, 66], shoes: [0, -8, 36], held: [26, -38, 44]
  };
  var thumbCache = {};
  /** small canvas of an item shown on the avatar (cropped to the relevant body part) */
  function thumb(av, slot, itemId, px) {
    var dpr = Math.min(2, root.devicePixelRatio || 1), key = [av.body, av.color, slot, itemId, px, dpr].join('|');
    if (thumbCache[key]) return thumbCache[key];
    var c = document.createElement('canvas'); c.width = c.height = Math.round(px * dpr);
    var g = c.getContext('2d'), cr = CROPS[slot], sc = c.width / (cr[2] * 2);
    var a2 = { body: av.body, color: av.color, eyes: av.eyes, mouth: av.mouth, head: av.head, equip: { hat: null, glasses: null, top: null, back: null, shoes: null, held: null } };
    if (itemId) a2.equip[slot] = itemId;
    if (slot === 'back') { a2.equip.top = null; }
    var A = anchors(av.body);
    g.save(); g.translate(c.width / 2 - cr[0] * sc, c.height / 2 - cr[1] * sc);
    draw(g, a2, { x: 0, y: 0, s: sc, t: 0, blink: false, noShadow: true });
    g.restore();
    return (thumbCache[key] = c);
  }
  /** round avatar face (head + hat) for the top-bar chip */
  function face(av, px) {
    var dpr = Math.min(2, root.devicePixelRatio || 1), c = document.createElement('canvas'); c.width = c.height = Math.round(px * dpr);
    var g = c.getContext('2d'), sc = c.width / 118;
    var a2 = JSON.parse(JSON.stringify(av)); a2.equip.top = null; a2.equip.shoes = null; a2.equip.held = null; a2.equip.back = null;
    g.save(); g.translate(c.width / 2, c.height * 0.93); draw(g, a2, { s: sc * 1.0, t: 0, blink: false, noShadow: true }); g.restore();
    return c;
  }

  SI.avatar = { draw: draw, thumb: thumb, face: face, SHAPES: SHAPES, anchors: anchors, colorOf: colorOf, util: { ell: ell, rr: rr, fs: fs, poly: poly, line: line, star: star, dark: dark, light: light, mix: mix } };
})(typeof self !== 'undefined' ? self : this);
