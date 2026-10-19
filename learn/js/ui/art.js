/* Picture renderer: 'art:<kind>:<args>' specs → inline SVG/HTML (clocks, US coins, shapes, base-ten blocks,
 * ten frames, counting objects…). Plain emoji strings render as big emoji. Pure string output, UMD. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.art = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var uid = 0;
  function id(p) { return p + (++uid); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function svg(vb, body, cls) { return '<svg class="art ' + (cls || '') + '" viewBox="' + vb + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + body + '</svg>'; }

  /* ---------- objects ---------- */
  function objs(e, n, opts) {
    n = +n;
    var cls = n > 8 ? 'objs many' : n > 4 ? 'objs mid' : 'objs few';
    var c = opts && opts.cols ? opts.cols : n <= 5 ? n : n <= 10 ? Math.ceil(n / 2) : 4;
    var h = '<div class="' + cls + (opts && opts.tap ? ' tappable' : '') + '" style="--c:' + Math.max(1, c) + '">';
    for (var i = 0; i < n; i++) h += '<span class="obj" data-i="' + i + '" style="--d:' + (i * 40) + 'ms">' + esc(e) + '</span>';
    return h + '</div>';
  }
  function add(e, a, b) {
    return '<div class="eq">' + objs(e, a, { cols: a > 3 ? Math.ceil(a / 2) : a }) + '<span class="eq-sign">+</span>' + objs(e, b, { cols: b > 3 ? Math.ceil(b / 2) : b }) + '</div>';
  }
  function sub(e, a, b) {
    a = +a; b = +b;
    var h = '<div class="objs ' + (a > 6 ? 'mid' : 'few') + ' sub" style="--c:' + (a <= 5 ? a : Math.ceil(a / 2)) + '">';
    for (var i = 0; i < a; i++) h += '<span class="obj' + (i >= a - b ? ' gone' : '') + '">' + esc(e) + '</span>';
    return h + '</div>';
  }
  function pairs(e, n) {
    n = +n;
    var h = '<div class="pairs">';
    for (var i = 0; i < n; i += 2) {
      h += '<span class="pair' + (i + 1 >= n ? ' single' : '') + '"><span class="obj">' + esc(e) + '</span>' + (i + 1 < n ? '<span class="obj">' + esc(e) + '</span>' : '') + '</span>';
    }
    return h + '</div>';
  }
  function frame(n) {
    n = +n;
    var b = '<rect x="2" y="2" width="256" height="106" rx="12" fill="#fff" stroke="#3b4a6b" stroke-width="4"/>';
    for (var c = 1; c < 5; c++) b += '<line x1="' + (2 + c * 51.2) + '" y1="2" x2="' + (2 + c * 51.2) + '" y2="108" stroke="#3b4a6b" stroke-width="3"/>';
    b += '<line x1="2" y1="55" x2="258" y2="55" stroke="#3b4a6b" stroke-width="3"/>';
    for (var i = 0; i < n; i++) {
      var cx = 27.6 + (i % 5) * 51.2, cy = 28.5 + Math.floor(i / 5) * 53;
      b += '<circle class="dot" cx="' + cx + '" cy="' + cy + '" r="18" fill="#ff5a6e"/><circle cx="' + (cx - 6) + '" cy="' + (cy - 6) + '" r="5" fill="#fff" opacity=".55"/>';
    }
    return svg('0 0 260 110', b, 'frame');
  }

  /* ---------- base-ten blocks ---------- */
  function tens(t, o) {
    t = +t; o = +o;
    var w = t * 26 + (o ? 40 : 0) + 8, b = '';
    for (var i = 0; i < t; i++) {
      var x = 4 + i * 26;
      b += '<rect x="' + x + '" y="4" width="20" height="200" rx="3" fill="#4f9dff" stroke="#1d5fc4" stroke-width="2"/>';
      for (var k = 1; k < 10; k++) b += '<line x1="' + x + '" y1="' + (4 + k * 20) + '" x2="' + (x + 20) + '" y2="' + (4 + k * 20) + '" stroke="#1d5fc4" stroke-width="1.5"/>';
      b += '<rect x="' + (x + 3) + '" y="7" width="4" height="194" rx="2" fill="#fff" opacity=".35"/>';
    }
    for (var j = 0; j < o; j++) {
      var ox = 4 + t * 26 + 8 + (j % 2) * 16, oy = 204 - 18 - Math.floor(j / 2) * 22;
      b += '<rect x="' + ox + '" y="' + oy + '" width="14" height="18" rx="2" fill="#ffb02e" stroke="#c77a00" stroke-width="2"/>';
    }
    return svg('0 0 ' + Math.max(w, 40) + ' 208', b, 'tens');
  }

  /* ---------- 2D shapes ---------- */
  var SHAPE_COL = { circle: '#ff6b81', square: '#4f9dff', triangle: '#2ecc71', rectangle: '#ffa630', star: '#ffd23f',
    oval: '#b46bff', heart: '#ff4f6d', hexagon: '#1fc8c8', pentagon: '#ff7f50' };
  function poly(n, r, rot) {
    var pts = [];
    for (var i = 0; i < n; i++) { var a = (rot || -90) * Math.PI / 180 + i * 2 * Math.PI / n; pts.push((60 + r * Math.cos(a)).toFixed(1) + ',' + (60 + r * Math.sin(a)).toFixed(1)); }
    return pts.join(' ');
  }
  function shape(name) {
    var c = SHAPE_COL[name] || '#888', st = ' fill="' + c + '" stroke="rgba(0,0,0,.25)" stroke-width="4" stroke-linejoin="round"', b;
    switch (name) {
      case 'circle': b = '<circle cx="60" cy="60" r="46"' + st + '/>'; break;
      case 'square': b = '<rect x="16" y="16" width="88" height="88" rx="4"' + st + '/>'; break;
      case 'rectangle': b = '<rect x="6" y="32" width="108" height="56" rx="4"' + st + '/>'; break;
      case 'triangle': b = '<polygon points="60,10 112,104 8,104"' + st + '/>'; break;
      case 'oval': b = '<ellipse cx="60" cy="60" rx="34" ry="50"' + st + '/>'; break;
      case 'hexagon': b = '<polygon points="' + poly(6, 50, 0) + '"' + st + '/>'; break;
      case 'pentagon': b = '<polygon points="' + poly(5, 52) + '"' + st + '/>'; break;
      case 'star': {
        var pts = [];
        for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 22 : 52; pts.push((60 + r * Math.cos(a)).toFixed(1) + ',' + (62 + r * Math.sin(a)).toFixed(1)); }
        b = '<polygon points="' + pts.join(' ') + '"' + st + '/>'; break;
      }
      case 'heart': b = '<path d="M60 104 C20 76 8 54 14 36 C20 18 46 14 60 34 C74 14 100 18 106 36 C112 54 100 76 60 104 Z"' + st + '/>'; break;
      default: b = '';
    }
    return svg('0 0 120 120', b + '<ellipse cx="44" cy="38" rx="12" ry="7" fill="#fff" opacity=".3" transform="rotate(-30 44 38)"/>', 'shape');
  }

  /* ---------- 3D solids ---------- */
  function solid(name) {
    var g = id('g'), b = '';
    if (name === 'cube') {
      b = '<polygon points="20,40 60,22 100,40 60,58" fill="#7fc4ff" stroke="#1d5fc4" stroke-width="3" stroke-linejoin="round"/>' +
        '<polygon points="20,40 60,58 60,106 20,88" fill="#4f9dff" stroke="#1d5fc4" stroke-width="3" stroke-linejoin="round"/>' +
        '<polygon points="60,58 100,40 100,88 60,106" fill="#2f7be0" stroke="#1d5fc4" stroke-width="3" stroke-linejoin="round"/>';
    } else if (name === 'sphere') {
      b = '<defs><radialGradient id="' + g + '" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffd6e0"/><stop offset=".45" stop-color="#ff6b81"/><stop offset="1" stop-color="#b8233d"/></radialGradient></defs>' +
        '<ellipse cx="60" cy="108" rx="34" ry="6" fill="rgba(0,0,0,.15)"/><circle cx="60" cy="60" r="44" fill="url(#' + g + ')"/>';
    } else if (name === 'cone') {
      b = '<defs><linearGradient id="' + g + '" x1="0" x2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset=".5" stop-color="#ffa630"/><stop offset="1" stop-color="#d9770f"/></linearGradient></defs>' +
        '<path d="M60 10 L100 92 A40 12 0 0 1 20 92 Z" fill="url(#' + g + ')" stroke="#a85a00" stroke-width="3" stroke-linejoin="round"/>' +
        '<ellipse cx="60" cy="92" rx="40" ry="12" fill="none" stroke="#a85a00" stroke-width="2" stroke-dasharray="4 4" opacity=".6"/>';
    } else if (name === 'cylinder') {
      b = '<defs><linearGradient id="' + g + '" x1="0" x2="1"><stop offset="0" stop-color="#8ef0c0"/><stop offset=".5" stop-color="#2ecc71"/><stop offset="1" stop-color="#14894a"/></linearGradient></defs>' +
        '<path d="M24 28 L24 92 A36 12 0 0 0 96 92 L96 28" fill="url(#' + g + ')" stroke="#0f6b39" stroke-width="3"/>' +
        '<ellipse cx="60" cy="28" rx="36" ry="12" fill="#a6f5cf" stroke="#0f6b39" stroke-width="3"/>';
    } else if (name === 'pyramid') {
      b = '<polygon points="60,10 18,88 60,106" fill="#ffd23f" stroke="#b38b00" stroke-width="3" stroke-linejoin="round"/>' +
        '<polygon points="60,10 60,106 102,88" fill="#e6b400" stroke="#b38b00" stroke-width="3" stroke-linejoin="round"/>';
    }
    return svg('0 0 120 120', b, 'solid');
  }

  /* ---------- clock ---------- */
  function clock(h, m) {
    h = +h; m = +m;
    var b = '<circle cx="100" cy="100" r="94" fill="#ff8a3d"/><circle cx="100" cy="100" r="84" fill="#fffdf6" stroke="#e0d6c2" stroke-width="2"/>';
    for (var i = 0; i < 60; i++) {
      var a = i * 6 * Math.PI / 180, big = i % 5 === 0, r1 = big ? 70 : 75;
      b += '<line x1="' + (100 + r1 * Math.sin(a)).toFixed(1) + '" y1="' + (100 - r1 * Math.cos(a)).toFixed(1) + '" x2="' + (100 + 80 * Math.sin(a)).toFixed(1) + '" y2="' + (100 - 80 * Math.cos(a)).toFixed(1) + '" stroke="#5b5b73" stroke-width="' + (big ? 3 : 1.2) + '" stroke-linecap="round"/>';
    }
    for (var n = 1; n <= 12; n++) {
      var an = n * 30 * Math.PI / 180;
      b += '<text x="' + (100 + 56 * Math.sin(an)).toFixed(1) + '" y="' + (100 - 56 * Math.cos(an) + 8).toFixed(1) + '" text-anchor="middle" font-size="22" font-weight="800" fill="#33335a" font-family="system-ui,-apple-system,sans-serif">' + n + '</text>';
    }
    var ha = ((h % 12) + m / 60) * 30, ma = m * 6;
    b += '<line x1="100" y1="100" x2="' + (100 + 40 * Math.sin(ha * Math.PI / 180)).toFixed(1) + '" y2="' + (100 - 40 * Math.cos(ha * Math.PI / 180)).toFixed(1) + '" stroke="#2b6ce0" stroke-width="10" stroke-linecap="round" class="hand-h"/>';
    b += '<line x1="100" y1="100" x2="' + (100 + 66 * Math.sin(ma * Math.PI / 180)).toFixed(1) + '" y2="' + (100 - 66 * Math.cos(ma * Math.PI / 180)).toFixed(1) + '" stroke="#e8344e" stroke-width="6" stroke-linecap="round" class="hand-m"/>';
    b += '<circle cx="100" cy="100" r="8" fill="#33335a"/><circle cx="100" cy="100" r="3" fill="#fff"/>';
    return svg('0 0 200 200', b, 'clock');
  }

  /* ---------- US coins (drawn to relative size) ---------- */
  var COIN = {
    penny: { r: 38, c1: '#f2a86b', c2: '#b8662c', c3: '#7d3e14', reeded: false, word: 'ONE CENT', head: '#a55a26' },
    nickel: { r: 42, c1: '#f4f6f8', c2: '#b4bcc5', c3: '#6e7884', reeded: false, word: 'FIVE CENTS', head: '#8e98a4' },
    dime: { r: 35, c1: '#fbfcfd', c2: '#c3cad2', c3: '#76808c', reeded: true, word: 'ONE DIME', head: '#98a2ae' },
    quarter: { r: 48, c1: '#f7f9fa', c2: '#bcc4cc', c3: '#717b87', reeded: true, word: 'QUARTER', head: '#919ba7' }
  };
  function coinBody(name, cx, cy) {
    var k = COIN[name], g = id('c'), r = k.r, b = '';
    b += '<defs><radialGradient id="' + g + '" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="' + k.c1 + '"/><stop offset=".7" stop-color="' + k.c2 + '"/><stop offset="1" stop-color="' + k.c3 + '"/></radialGradient></defs>';
    b += '<circle cx="' + cx + '" cy="' + (cy + 3) + '" r="' + r + '" fill="rgba(0,0,0,.18)"/>';
    b += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="url(#' + g + ')" stroke="' + k.c3 + '" stroke-width="2"' + (k.reeded ? ' stroke-dasharray="2 2"' : '') + '/>';
    b += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r - 6) + '" fill="none" stroke="' + k.c3 + '" stroke-width="1.2" opacity=".6"/>';
    // simple profile portrait (head facing right)
    var s = r / 40;
    b += '<path transform="translate(' + (cx - 14 * s) + ' ' + (cy - 20 * s) + ') scale(' + s + ')" d="M14 2 C26 0 34 8 33 18 L37 24 L33 26 C33 32 30 34 25 34 L24 40 L6 40 C8 32 4 28 4 18 C4 8 8 3 14 2 Z" fill="' + k.head + '" opacity=".75"/>';
    b += '<text x="' + cx + '" y="' + (cy + r - 9 * s) + '" text-anchor="middle" font-size="' + (7 * s).toFixed(1) + '" font-weight="800" fill="' + k.c3 + '" font-family="system-ui,sans-serif" letter-spacing=".5">' + k.word + '</text>';
    return b;
  }
  function coin(name) { var r = COIN[name] ? COIN[name].r : 40; return svg('0 0 104 108', coinBody(name, 52, 52 + (48 - r) * 0), 'coin coin-' + name); }
  function coins(list) {
    var names = String(list).split(',').filter(function (n) { return COIN[n]; }), x = 4, b = '';
    names.forEach(function (n) { var r = COIN[n].r; b += coinBody(n, x + r, 52); x += 2 * r + 8; });
    return svg('0 0 ' + Math.max(x, 60) + ' 108', b, 'coins');
  }

  /* ---------- length ---------- */
  var BAR = { red: '#ff4f6d', blue: '#3d8bff', green: '#2ecc71', orange: '#ff9a2e', purple: '#a463ff' };
  var UNIT = 26;
  function pencil(color, len, y) {
    var c = BAR[color] || color, w = len * UNIT, b = '';
    b += '<rect x="4" y="' + y + '" width="10" height="24" rx="3" fill="#ff9fb4"/>';
    b += '<rect x="12" y="' + y + '" width="6" height="24" fill="#c9ced6"/>';
    b += '<rect x="18" y="' + y + '" width="' + (w - 36) + '" height="24" fill="' + c + '"/>';
    b += '<rect x="18" y="' + (y + 4) + '" width="' + (w - 36) + '" height="5" fill="#fff" opacity=".3"/>';
    b += '<polygon points="' + (w - 18) + ',' + y + ' ' + (w + 4) + ',' + (y + 12) + ' ' + (w - 18) + ',' + (y + 24) + '" fill="#f6d7a7"/>';
    b += '<polygon points="' + (w - 3) + ',' + (y + 8.5) + ' ' + (w + 4) + ',' + (y + 12) + ' ' + (w - 3) + ',' + (y + 15.5) + '" fill="#333"/>';
    return b;
  }
  function bar(color, len) { return svg('0 0 ' + (9 * UNIT + 10) + ' 32', pencil(color, +len, 4), 'bar'); }
  function ruler(n) {
    n = +n;
    var b = pencil('orange', n, 4);
    for (var i = 0; i < n; i++) b += '<rect x="' + (4 + i * UNIT) + '" y="40" width="' + (UNIT - 2) + '" height="' + (UNIT - 2) + '" rx="4" fill="' + (i % 2 ? '#4f9dff' : '#2ecc71') + '" stroke="rgba(0,0,0,.2)" stroke-width="2"/>';
    return svg('0 0 ' + (10 * UNIT + 10) + ' 70', b, 'ruler');
  }

  /** spec → HTML. opts: { tap: true } makes counting objects tappable. */
  function render(spec, opts) {
    if (spec === undefined || spec === null || spec === '') return '';
    spec = String(spec);
    if (spec.indexOf('art:') !== 0) return '<span class="emoji-pic">' + esc(spec) + '</span>';
    var p = spec.slice(4).split(':');
    switch (p[0]) {
      case 'objs': return objs(p[1], p[2], opts);
      case 'add': return add(p[1], p[2], p[3]);
      case 'sub': return sub(p[1], p[2], p[3]);
      case 'pairs': return pairs(p[1], p[2]);
      case 'frame': return frame(p[1]);
      case 'tens': return tens(p[1], p[2]);
      case 'shape': return shape(p[1]);
      case 'solid': return solid(p[1]);
      case 'clock': return clock(p[1], p[2]);
      case 'coin': return coin(p[1]);
      case 'coins': return coins(p[1]);
      case 'bar': return bar(p[1], p[2]);
      case 'ruler': return ruler(p[1]);
      default: return '';
    }
  }
  function isArt(s) { return String(s).indexOf('art:') === 0; }

  /** Split an option string into { pic, label }: '🐶 dog' → pic 🐶 + label dog; 'art:…' → pic only. */
  var EMOJI_RE = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️|⃣|[\u{1F3FB}-\u{1F3FF}])+)\s+(.+)$/u;
  var ONLY_EMOJI = /^(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️|⃣|[\u{1F3FB}-\u{1F3FF}]|\s)+$/u;
  function splitOption(s) {
    s = String(s);
    if (isArt(s)) return { pic: s, label: '' };
    var m = EMOJI_RE.exec(s);
    if (m) return { pic: m[1], label: m[2] };
    if (ONLY_EMOJI.test(s)) return { pic: s, label: '' };
    return { pic: '', label: s };
  }

  return { render: render, isArt: isArt, splitOption: splitOption, esc: esc, COIN: COIN };
});
