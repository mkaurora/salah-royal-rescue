/* Machines tip cards + "Did you know?" facts. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.content = root.LE.content || {}; root.LE.content.machines = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // SVG picture helpers (viewBox 0 0 200 120). Bright cartoon colours, dark outlines.
  var OUT = '#4a2a12';
  function floor(y) { return '<rect x="0" y="' + y + '" width="200" height="' + (120 - y) + '" fill="#c98a4b" stroke="' + OUT + '" stroke-width="3"/><rect x="0" y="' + y + '" width="200" height="5" fill="#e8b273"/>'; }
  function ball(x, y, r) { r = r || 12; return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#ff4f4f" stroke="#8a1414" stroke-width="3"/><circle cx="' + (x - r * 0.35) + '" cy="' + (y - r * 0.35) + '" r="' + (r * 0.3) + '" fill="#fff" opacity=".7"/>'; }
  function box(x, y, s) { s = s || 30; return '<rect x="' + x + '" y="' + y + '" width="' + s + '" height="' + s + '" rx="4" fill="#e3a557" stroke="' + OUT + '" stroke-width="3"/><path d="M' + (x + 4) + ' ' + (y + 4) + ' L' + (x + s - 4) + ' ' + (y + s - 4) + ' M' + (x + s - 4) + ' ' + (y + 4) + ' L' + (x + 4) + ' ' + (y + s - 4) + '" stroke="#a8692c" stroke-width="3"/>'; }
  function wheel(x, y, r) { r = r || 7; return '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#333a4d" stroke="#151926" stroke-width="2.5"/><circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.4) + '" fill="#ffc83d"/>'; }
  function ramp(x, y, w, h, dir) {
    var d = dir > 0 ? 'M' + x + ' ' + y + ' L' + x + ' ' + (y + h) + ' L' + (x + w) + ' ' + (y + h) + 'Z'
                    : 'M' + (x + w) + ' ' + y + ' L' + (x + w) + ' ' + (y + h) + ' L' + x + ' ' + (y + h) + 'Z';
    return '<path d="' + d + '" fill="#ff8a2a" stroke="' + OUT + '" stroke-width="3" stroke-linejoin="round"/>';
  }
  function gear(cx, cy, r, teeth, fill) {
    var d = '', n = teeth * 2;
    for (var i = 0; i < n; i++) {
      var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, rr = i % 2 ? r * 0.78 : r;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a0) * rr).toFixed(1) + ' ' + (cy + Math.sin(a0) * rr).toFixed(1) + 'L' + (cx + Math.cos(a1) * rr).toFixed(1) + ' ' + (cy + Math.sin(a1) * rr).toFixed(1);
    }
    return '<path d="' + d + 'Z" fill="' + (fill || '#ffc83d') + '" stroke="#8a5a00" stroke-width="3" stroke-linejoin="round"/><circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.28) + '" fill="#fff3c4" stroke="#8a5a00" stroke-width="2.5"/>';
  }
  function arc(cx, cy, r, cw) {
    // curved arrow showing turning direction
    var a0 = -2.4, a1 = -0.7;
    if (!cw) { var t = a0; a0 = a1; a1 = t; }
    var x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r, x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
    var ang = a1 + (cw ? Math.PI / 2 : -Math.PI / 2);
    var hx = x1 + Math.cos(ang) * 8, hy = y1 + Math.sin(ang) * 8;
    return '<path d="M' + x0.toFixed(1) + ' ' + y0.toFixed(1) + ' A' + r + ' ' + r + ' 0 0 ' + (cw ? 1 : 0) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + '" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M' + (x1 + Math.cos(ang + 2.2) * 7).toFixed(1) + ' ' + (y1 + Math.sin(ang + 2.2) * 7).toFixed(1) + ' L' + hx.toFixed(1) + ' ' + hy.toFixed(1) + ' L' + (x1 + Math.cos(ang - 2.2) * 7).toFixed(1) + ' ' + (y1 + Math.sin(ang - 2.2) * 7).toFixed(1) + '" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
  }
  function arrow(x1, y1, x2, y2) { return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/>'; }
  function basket(x, y) { return '<path d="M' + (x - 18) + ' ' + (y - 18) + ' L' + (x + 18) + ' ' + (y - 18) + ' L' + (x + 13) + ' ' + y + ' L' + (x - 13) + ' ' + y + 'Z" fill="#ffd35c" stroke="' + OUT + '" stroke-width="3" stroke-linejoin="round"/><path d="M' + (x - 12) + ' ' + (y - 11) + ' h24 M' + (x - 10) + ' ' + (y - 5) + ' h20" stroke="#c98a00" stroke-width="2.5"/>'; }
  function star(x, y, r) {
    var p = '';
    for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; p += (i ? 'L' : 'M') + (x + Math.cos(a) * rr).toFixed(1) + ' ' + (y + Math.sin(a) * rr).toFixed(1); }
    return '<path d="' + p + 'Z" fill="#ffe14d" stroke="#b38f00" stroke-width="2.5" stroke-linejoin="round"/>';
  }
  function svg(s) { return '<svg viewBox="0 0 200 120">' + s + '</svg>'; }

  var tips = {
    ramp: {
      title: 'Ramps',
      text: 'A ramp is a slope. Things roll down it, all by themselves!',
      pic: svg(floor(96) + ramp(30, 46, 70, 50, 1) + ball(46, 34) + arrow(70, 50, 120, 84) + basket(160, 96))
    },
    flip: {
      title: 'Flip the ramp',
      text: 'Tap a ramp to flip it. Then things roll the other way!',
      pic: svg(floor(96) + ramp(20, 56, 56, 40, 1) + '<text x="100" y="80" font-size="34" text-anchor="middle" fill="#fff" font-weight="900">⇄</text>' + ramp(124, 56, 56, 40, -1))
    },
    wheels: {
      title: 'Wheels and axles',
      text: 'A box is hard to push. Put wheels on it and it rolls easily!',
      pic: svg(floor(96) + box(28, 56, 36) + '<text x="100" y="84" font-size="30" text-anchor="middle" fill="#fff" font-weight="900">➜</text>' + box(132, 50, 36) + wheel(140, 90, 8) + wheel(160, 90, 8))
    },
    push: {
      title: 'Push!',
      text: 'A rolling ball can push a cart. The cart keeps rolling!',
      pic: svg(floor(96) + ball(40, 84) + arrow(58, 84, 80, 84) + box(92, 52, 32) + wheel(100, 89, 7) + wheel(117, 89, 7) + arrow(132, 72, 170, 72))
    },
    gears: {
      title: 'Gears',
      text: 'Gears have teeth. When two gears touch, one turns the other!',
      pic: svg(gear(66, 60, 36, 10, '#ffc83d') + gear(130, 60, 30, 8, '#ff8a5c') + arc(66, 60, 20, true) + arc(130, 60, 16, false))
    },
    direction: {
      title: 'Which way?',
      text: 'Touching gears turn opposite ways. Each new gear flips the turn!',
      pic: svg(gear(40, 60, 26, 8, '#ffc83d') + gear(96, 60, 26, 8, '#ff8a5c') + gear(152, 60, 26, 8, '#ffc83d') + arc(40, 60, 13, true) + arc(96, 60, 13, false) + arc(152, 60, 13, true))
    },
    jam: {
      title: 'Gear jam!',
      text: 'Three gears in a circle all push against each other. They get stuck!',
      pic: svg(gear(70, 44, 26, 8, '#ffc83d') + gear(130, 44, 26, 8, '#ff8a5c') + gear(100, 92, 26, 8, '#8fd16a') + '<text x="100" y="62" font-size="30" text-anchor="middle" font-weight="900" fill="#ff3b3b" stroke="#fff" stroke-width="2">!</text>')
    },
    speed: {
      title: 'Small gears spin fast',
      text: 'A big gear turning a small gear makes the small one spin faster!',
      pic: svg(gear(66, 62, 44, 14, '#ffc83d') + gear(140, 62, 24, 7, '#ff8a5c') + arc(66, 62, 24, true) + '<text x="140" y="24" font-size="26" text-anchor="middle">💨</text>')
    },
    lever: {
      title: 'Levers',
      text: 'A lever is a plank on a pivot. Push one end down and the other end goes UP!',
      pic: svg(floor(100) + '<path d="M100 72 L118 100 L82 100Z" fill="#ff5a3c" stroke="' + OUT + '" stroke-width="3" stroke-linejoin="round"/>' +
        '<rect x="30" y="64" width="140" height="10" rx="4" fill="#e3a557" stroke="' + OUT + '" stroke-width="3" transform="rotate(14 100 70)"/>' + ball(44, 30) + arrow(44, 46, 44, 58) + box(144, 22, 26) + arrow(157, 18, 157, 4))
    },
    wedge: {
      title: 'Wedges',
      text: 'A wedge has a sharp point. Push it into a log and the log splits!',
      pic: svg(floor(96) + '<path d="M60 96 L100 70 L100 96Z" fill="#b9c4d6" stroke="#3b4458" stroke-width="3" stroke-linejoin="round"/>' +
        '<rect x="104" y="46" width="54" height="50" rx="10" fill="#9b5d2e" stroke="' + OUT + '" stroke-width="3"/><circle cx="131" cy="71" r="14" fill="#e3b07a" stroke="' + OUT + '" stroke-width="2.5"/><circle cx="131" cy="71" r="6" fill="none" stroke="#9b5d2e" stroke-width="2"/>' + ball(36, 84) + '<text x="131" y="34" font-size="24" text-anchor="middle">💥</text>')
    },
    pulley: {
      title: 'Pulleys',
      text: 'A pulley is a wheel with a rope. Pull one side down and the other side goes up!',
      pic: svg('<rect x="60" y="2" width="80" height="8" rx="3" fill="#8a5a2b"/><circle cx="100" cy="30" r="24" fill="#c9ced8" stroke="#3b4458" stroke-width="3"/><circle cx="100" cy="30" r="6" fill="#ffc83d" stroke="#3b4458" stroke-width="2"/>' +
        '<path d="M76 30 V96 M124 30 V58" stroke="#d9b37a" stroke-width="4"/><path d="M62 96 h28 l-4 18 h-20z" fill="#3d8bff" stroke="#1d4f99" stroke-width="3"/>' + ball(76, 92, 9) +
        '<rect x="106" y="58" width="36" height="6" fill="#e3a557" stroke="' + OUT + '" stroke-width="2.5"/>' + box(110, 32, 26) + arrow(160, 70, 160, 40) + arrow(40, 50, 40, 90))
    }
  };

  var facts = [
    'A ramp makes it easier to move heavy things up high. The Egyptians may have used ramps to build the pyramids!',
    'A seesaw on the playground is a lever!',
    'Scissors are two levers stuck together.',
    'An axe and a knife are wedges. Their sharp edges push things apart.',
    'Your front teeth are wedges too! They help you bite food.',
    'A bike has gears. Small gears help you go fast, big ones help you climb hills.',
    'Clocks use lots of tiny gears to move their hands.',
    'Flagpoles use a pulley to raise the flag to the top.',
    'Cranes use pulleys to lift things as heavy as a whale!',
    'The wheel was invented about 5,000 years ago.',
    'A doorknob is a wheel and axle!',
    'A slide at the park is a ramp. Wheee!',
    'Conveyor belts carry bags at the airport.',
    'A screw is really a ramp wrapped around a pole.',
    'Elevators go up and down with pulleys and strong ropes.',
    'Engineers call ramps, levers, wedges, pulleys, wheels and screws "simple machines".',
    'A wheelbarrow uses a wheel AND a lever!',
    'Gears that touch always turn in opposite directions.'
  ];

  return { tips: tips, facts: facts };
});
