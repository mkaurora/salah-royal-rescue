/* Level 2 — small cartoon pictures (inline SVG) for the Science Lab quizzes and lessons: LE.l2pic(key) → svg string. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  function gear(cx, cy, r, teeth, fill, stroke, cls) {
    var d = '', n = teeth * 2;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a0) * rr).toFixed(1) + ' ' + (cy + Math.sin(a0) * rr).toFixed(1) + 'L' + (cx + Math.cos(a1) * rr).toFixed(1) + ' ' + (cy + Math.sin(a1) * rr).toFixed(1);
    }
    return '<g class="' + (cls || '') + '" style="transform-origin:' + cx + 'px ' + cy + 'px"><path d="' + d + 'Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3" stroke-linejoin="round"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.28) + '" fill="#fff" stroke="' + stroke + '" stroke-width="3"/></g>';
  }
  function arrow(cx, cy, r, cw, color) {
    // a 3/4 circle arrow; cw = clockwise
    var a0 = cw ? -2.4 : -0.7, a1 = cw ? 0.9 : -4.0;
    var x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    var tip = cw ? a1 + Math.PI / 2 : a1 - Math.PI / 2;
    var hx = x1 + Math.cos(tip) * 10, hy = y1 + Math.sin(tip) * 10;
    return '<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r + ' ' + r + ' 0 1 ' + (cw ? 1 : 0) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="' + (color || '#ff4f6d') + '" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M' + (x1 + Math.cos(tip + 2.4) * 9).toFixed(1) + ' ' + (y1 + Math.sin(tip + 2.4) * 9).toFixed(1) + ' L' + hx.toFixed(1) + ' ' + hy.toFixed(1) + ' L' + (x1 + Math.cos(tip - 2.4) * 9).toFixed(1) + ' ' + (y1 + Math.sin(tip - 2.4) * 9).toFixed(1) + '" fill="none" stroke="' + (color || '#ff4f6d') + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  var Y = '#ffc83d', YS = '#a86f00', O = '#ff7a59', OS = '#a3361d';
  var robo = '<g><rect x="-13" y="-14" width="26" height="24" rx="7" fill="#b38bff" stroke="#5b3fbf" stroke-width="3"/><rect x="-8" y="-9" width="16" height="10" rx="4" fill="#2a1f5c"/><circle cx="-3.5" cy="-4" r="2" fill="#7ff3ff"/><circle cx="3.5" cy="-4" r="2" fill="#7ff3ff"/></g>';
  function rock(x, y, s) { return '<path d="M' + (x - s) + ' ' + y + ' l' + s * 0.2 + ' ' + (-s * 0.9) + ' ' + s * 0.8 + ' ' + (-s * 0.4) + ' ' + s * 0.8 + ' ' + s * 0.3 + ' ' + s * 0.2 + ' ' + s + 'z" fill="#9aa3b5" stroke="#4a5263" stroke-width="3"/>'; }
  function fulcrum(x, y) { return '<path d="M' + x + ' ' + (y - 2) + ' l-13 22 h26z" fill="#ff9f1c" stroke="#a35a00" stroke-width="3" stroke-linejoin="round"/>'; }
  function bulb(x, y, on, dim) {
    var glow = on ? '<circle cx="' + x + '" cy="' + (y - 6) + '" r="' + (dim ? 16 : 24) + '" fill="#fff59d" opacity="' + (dim ? 0.45 : 0.75) + '"/>' : '';
    return glow + '<path d="M' + (x - 11) + ' ' + (y - 6) + ' a11 11 0 1 1 22 0 c0 6 -4 8 -5 13 h-12 c-1 -5 -5 -7 -5 -13z" fill="' + (on ? (dim ? '#ffe98a' : '#ffe14d') : '#e3e7ef') + '" stroke="' + (on ? '#b38f00' : '#7c8696') + '" stroke-width="3"/><rect x="' + (x - 6) + '" y="' + (y + 7) + '" width="12" height="7" rx="2" fill="#9aa6b8" stroke="#56627a" stroke-width="2"/>';
  }
  function battery(x, y) { return '<rect x="' + (x - 9) + '" y="' + (y - 16) + '" width="18" height="32" rx="4" fill="#33d17a" stroke="#137a44" stroke-width="3"/><rect x="' + (x - 4) + '" y="' + (y - 21) + '" width="8" height="5" fill="#137a44"/><text x="' + x + '" y="' + (y + 5) + '" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">+</text>'; }
  function ramp(x0, y0, w, hgt, fill) { return '<path d="M' + x0 + ' ' + y0 + ' L' + (x0 + w) + ' ' + y0 + ' L' + (x0 + w) + ' ' + (y0 - hgt) + 'z" fill="' + (fill || '#8bd16a') + '" stroke="#3f7a26" stroke-width="3" stroke-linejoin="round"/>'; }
  function box(x, y, s) { return '<rect x="' + (x - s / 2) + '" y="' + (y - s) + '" width="' + s + '" height="' + s + '" rx="3" fill="#c98a3a" stroke="#6b4420" stroke-width="3"/>'; }
  function svg(body, vb) { return '<svg viewBox="' + (vb || '0 0 200 120') + '">' + body + '</svg>'; }
  var floorSpec = { ice: ['#cfefff', '#7cc4e8'], carpet: ['#d65d8f', '#8a2a54'], wood: ['#e0a560', '#8a5a2b'], sand: ['#f2d58c', '#b39248'] };
  function floor(x, y, w, kind) { var f = floorSpec[kind]; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="14" rx="4" fill="' + f[0] + '" stroke="' + f[1] + '" stroke-width="3"/>'; }

  var PICS = {
    'gears-pair': svg(gear(70, 60, 40, 12, Y, YS, 'spin') + gear(132, 60, 22, 7, O, OS, 'spin-rev2') + arrow(70, 60, 50, true, '#3d8bff')),
    'gears-dir': svg(gear(48, 60, 26, 9, Y, YS, 'spin') + gear(100, 60, 26, 9, O, OS, 'spin-rev') + gear(152, 60, 26, 9, Y, YS, 'spin') + arrow(48, 60, 34, true) + arrow(100, 60, 34, false, '#3d8bff') + arrow(152, 60, 34, true)),
    'gears-speed': svg(gear(70, 60, 40, 12, Y, YS, 'spin') + gear(132, 60, 22, 7, O, OS, 'spin-rev2') + '<text x="132" y="108" font-size="15" font-weight="900" text-anchor="middle" fill="#ff4f6d">FAST!</text><text x="70" y="114" font-size="13" font-weight="900" text-anchor="middle" fill="#23264a">slow</text>'),
    'arrow-cw': svg(arrow(100, 60, 34, true, '#3d8bff')),
    'arrow-ccw': svg(arrow(100, 60, 34, false, '#ff4f6d')),
    'gear-big': svg(gear(100, 60, 46, 14, Y, YS)),
    'gear-small': svg(gear(100, 60, 24, 7, O, OS)),
    seesaw: svg('<rect x="20" y="58" width="160" height="10" rx="4" fill="#a86b33" stroke="#5b3511" stroke-width="3" transform="rotate(-8 100 63)"/>' + fulcrum(100, 70) + '<g transform="translate(40 52)">' + robo + '</g><circle cx="160" cy="40" r="11" fill="#ffcc99" stroke="#8a5a2b" stroke-width="3"/><path d="M20 112 h160" stroke="#5cbf4a" stroke-width="6"/>'),
    'lever-q': svg('<rect x="15" y="62" width="170" height="10" rx="4" fill="#a86b33" stroke="#5b3511" stroke-width="3"/>' + rock(36, 62, 22) + '<g transform="translate(166 48)">' + robo + '</g><text x="100" y="100" font-size="30" font-weight="900" text-anchor="middle" fill="#ff9f1c">?</text>'),
    'lever-near': svg('<rect x="15" y="62" width="170" height="10" rx="4" fill="#a86b33" stroke="#5b3511" stroke-width="3"/>' + rock(36, 62, 22) + fulcrum(62, 74) + '<g transform="translate(166 48)">' + robo + '</g>'),
    'lever-far': svg('<rect x="15" y="62" width="170" height="10" rx="4" fill="#a86b33" stroke="#5b3511" stroke-width="3"/>' + rock(36, 62, 22) + fulcrum(140, 74) + '<g transform="translate(166 48)">' + robo + '</g>'),
    'lever-types': svg('<g transform="translate(0 6)"><rect x="8" y="42" width="56" height="7" rx="3" fill="#a86b33"/>' + '<path d="M36 49 l-8 14 h16z" fill="#ff9f1c" stroke="#a35a00" stroke-width="3" stroke-linejoin="round"/>' + '<text x="36" y="96" font-size="12" font-weight="900" text-anchor="middle" fill="#23264a">see-saw</text></g>' +
      '<g transform="translate(70 6)"><circle cx="10" cy="56" r="8" fill="#555" stroke="#222" stroke-width="2"/><path d="M10 50 L60 34" stroke="#a86b33" stroke-width="6" stroke-linecap="round"/><rect x="22" y="34" width="20" height="12" rx="3" fill="#9aa3b5" stroke="#4a5263" stroke-width="2"/><text x="30" y="96" font-size="12" font-weight="900" text-anchor="middle" fill="#23264a">wheelbarrow</text></g>' +
      '<g transform="translate(140 6)"><path d="M6 66 L56 18" stroke="#a86b33" stroke-width="4" stroke-linecap="round"/><path d="M56 18 v30" stroke="#23264a" stroke-width="2"/><path d="M50 50 q6 6 12 0" stroke="#3d8bff" stroke-width="4" fill="none"/><text x="30" y="96" font-size="12" font-weight="900" text-anchor="middle" fill="#23264a">fishing rod</text></g>'),
    'lever-trade': svg('<rect x="15" y="70" width="170" height="9" rx="4" fill="#a86b33" stroke="#5b3511" stroke-width="3" transform="rotate(10 50 74)"/>' + fulcrum(50, 82) + rock(30, 66, 18) + '<g transform="translate(160 86)">' + robo + '</g><path d="M30 30 v18" stroke="#33b864" stroke-width="5" stroke-linecap="round"/><path d="M24 36 l6 -8 6 8" fill="none" stroke="#33b864" stroke-width="5" stroke-linecap="round"/><text x="34" y="22" font-size="13" font-weight="900" text-anchor="middle" fill="#33b864">a little</text>'),
    ball: svg('<circle cx="100" cy="60" r="36" fill="#3d8bff" stroke="#1d4f99" stroke-width="5"/><path d="M76 46 q24 -20 48 0" stroke="#fff" stroke-width="5" fill="none" opacity=".6"/>'),
    'ramp-gentle': svg(ramp(20, 100, 160, 44) + box(60, 88, 22) + '<g transform="translate(36 80)">' + robo + '</g>'),
    'ramp-steep': svg(ramp(110, 100, 70, 80) + box(128, 72, 22) + '<g transform="translate(104 80)">' + robo + '</g>'),
    'ramp-q': svg(ramp(10, 100, 110, 40) + ramp(130, 100, 50, 60, '#ffc83d') + '<text x="100" y="30" font-size="28" font-weight="900" text-anchor="middle" fill="#ff9f1c">?</text>'),
    'roll-q': svg('<path d="M10 92 L10 32 L70 92z" fill="#8bd16a" stroke="#3f7a26" stroke-width="3" stroke-linejoin="round"/>' + floor(70, 92, 120, 'ice') + '<circle cx="24" cy="26" r="9" fill="#ff4f6d" stroke="#8a1c33" stroke-width="3"/><path d="M90 80 h80" stroke="#3d8bff" stroke-width="4" stroke-dasharray="8 6"/>'),
    'floor-ice': svg(floor(20, 70, 160, 'ice') + '<circle cx="150" cy="60" r="10" fill="#ff4f6d" stroke="#8a1c33" stroke-width="3"/><path d="M40 52 h90" stroke="#3d8bff" stroke-width="4" stroke-dasharray="8 6"/>'),
    'floor-carpet': svg(floor(20, 70, 160, 'carpet') + '<circle cx="62" cy="60" r="10" fill="#ff4f6d" stroke="#8a1c33" stroke-width="3"/><path d="M30 52 h20" stroke="#3d8bff" stroke-width="4" stroke-dasharray="8 6"/>'),
    floors: svg(floor(10, 30, 180, 'ice') + floor(10, 54, 180, 'wood') + floor(10, 78, 180, 'carpet') + floor(10, 102, 180, 'sand') +
      '<text x="18" y="25" font-size="12" font-weight="900" fill="#23264a">slippery</text><text x="140" y="120" font-size="12" font-weight="900" fill="#23264a">rough</text>'),
    'circuit-closed': svg('<path d="M40 30 H160 V96 H40 Z" fill="none" stroke="#3dd6ff" stroke-width="6" stroke-linejoin="round"/>' + battery(40, 63) + bulb(100, 34, true)),
    'circuit-open': svg('<path d="M40 30 H160 V96 H118 M92 96 H40 Z" fill="none" stroke="#3dd6ff" stroke-width="6" stroke-linejoin="round"/>' + battery(40, 63) + bulb(100, 34, false) + '<text x="105" y="102" font-size="16" font-weight="900" text-anchor="middle" fill="#ff4f6d">gap</text>'),
    'circuit-series': svg('<path d="M30 30 H170 V96 H30 Z" fill="none" stroke="#3dd6ff" stroke-width="6" stroke-linejoin="round"/>' + battery(30, 63) + bulb(80, 34, true, true) + bulb(130, 34, true, true)),
    'circuit-short': svg('<path d="M40 30 H160 V96 H40 Z M40 63 H160" fill="none" stroke="#3dd6ff" stroke-width="6" stroke-linejoin="round"/>' + battery(40, 63) + bulb(100, 34, false) + '<path d="M96 56 l8 -10 4 8 8 -10" stroke="#ffe14d" stroke-width="5" fill="none" stroke-linecap="round"/><text x="100" y="86" font-size="15" font-weight="900" text-anchor="middle" fill="#ff4f6d">sparks!</text>'),
    'bulb-on': svg(bulb(100, 60, true)),
    'bulb-off': svg(bulb(100, 60, false)),
    'bulb-dim': svg(bulb(100, 60, true, true))
  };
  LE.l2pic = function (key) { return PICS[key] || ''; };
  LE.l2pics = PICS;
  LE.l2draw = { gear: gear, arrow: arrow, bulb: bulb, battery: battery, robo: robo };
})();
