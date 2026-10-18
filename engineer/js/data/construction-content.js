/* Construction tip cards + "Did you know?" facts. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.content = root.LE.content || {}; root.LE.content.construction = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Tip pictures: SVG, viewBox 0 0 200 120, bright cartoon colours with dark outlines.
  var OUT = '#5a3a14';
  function at(x, y, s, sc) { return '<g transform="translate(' + x + ',' + y + ')' + (sc ? ' scale(' + sc + ')' : '') + '">' + s + '</g>'; }
  var ground = '<rect x="0" y="86" width="200" height="34" fill="#c98a4b"/><rect x="0" y="86" width="200" height="6" fill="#e3ad6b"/>';
  // Side-view bulldozer, facing right, origin at the bottom-left of the tracks.
  var dozer = '<g>' +
    '<rect x="2" y="-16" width="58" height="16" rx="8" fill="#3a3a48" stroke="#1d1d26" stroke-width="3"/>' +
    '<circle cx="11" cy="-8" r="5" fill="#8a8f9e"/><circle cx="31" cy="-8" r="5" fill="#8a8f9e"/><circle cx="51" cy="-8" r="5" fill="#8a8f9e"/>' +
    '<rect x="6" y="-36" width="50" height="22" rx="6" fill="#ffc21a" stroke="#a36b00" stroke-width="3"/>' +
    '<rect x="14" y="-58" width="28" height="24" rx="5" fill="#ffc21a" stroke="#a36b00" stroke-width="3"/>' +
    '<rect x="19" y="-53" width="18" height="12" rx="3" fill="#bfe9ff" stroke="#a36b00" stroke-width="2"/>' +
    '<rect x="44" y="-50" width="5" height="14" rx="2" fill="#555"/>' +
    '<path d="M56 -30 L66 -30 L70 -2 L60 -2 Z" fill="#9aa3b5" stroke="#4d5566" stroke-width="3" stroke-linejoin="round"/>' +
    '<path d="M54 -26 L62 -22" stroke="#4d5566" stroke-width="4"/></g>';
  var dirt = '<path d="M-22 0 Q-16 -22 0 -24 Q16 -22 22 0 Z" fill="#9a6230" stroke="' + OUT + '" stroke-width="3"/><circle cx="-6" cy="-14" r="3" fill="#c48a4f"/><circle cx="7" cy="-9" r="2.5" fill="#c48a4f"/>';
  var hole = '<ellipse cx="0" cy="0" rx="26" ry="9" fill="#4a2a10" stroke="' + OUT + '" stroke-width="3"/><ellipse cx="0" cy="2" rx="18" ry="5" fill="#2e1806"/>';
  var rock = '<path d="M-18 0 L-15 -14 L-4 -22 L10 -19 L18 -6 L16 0 Z" fill="#a8b0bd" stroke="#4d5566" stroke-width="3" stroke-linejoin="round"/><path d="M-6 -16 L2 -12" stroke="#fff" stroke-width="2" opacity=".6"/>';
  var truck = '<g><path d="M0 -30 L44 -30 L48 -6 L0 -6 Z" fill="#ff8a1c" stroke="#a34a00" stroke-width="3" stroke-linejoin="round"/>' +
    '<rect x="48" y="-26" width="22" height="20" rx="4" fill="#3d8bff" stroke="#1d4f99" stroke-width="3"/><rect x="54" y="-22" width="11" height="8" rx="2" fill="#bfe9ff"/>' +
    '<circle cx="12" cy="-4" r="7" fill="#333a4d" stroke="#151926" stroke-width="2"/><circle cx="58" cy="-4" r="7" fill="#333a4d" stroke="#151926" stroke-width="2"/></g>';
  function arrow(x1, y1, x2, y2) { return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/>'; }
  function block(x, y, w, h, c, d) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="4" fill="' + c + '" stroke="' + d + '" stroke-width="3"/>'; }
  function check(x, y) { return at(x, y, '<circle r="11" fill="#33d17a" stroke="#137a44" stroke-width="3"/><path d="M-5 0 L-1 4 L6 -4" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'); }
  function cross(x, y) { return at(x, y, '<circle r="11" fill="#f2475a" stroke="#8a1c33" stroke-width="3"/><path d="M-5 -5 L5 5 M5 -5 L-5 5" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>'); }
  function house(x, y, s, color, roof) {
    // origin: bottom centre of the foundation
    var r = '<rect x="-38" y="-8" width="76" height="8" rx="2" fill="#a9b0bd" stroke="#4d5566" stroke-width="3"/>' +
      '<rect x="-32" y="-44" width="64" height="36" fill="' + color + '" stroke="' + OUT + '" stroke-width="3"/>' +
      '<rect x="-7" y="-28" width="14" height="20" rx="2" fill="#e8484f" stroke="' + OUT + '" stroke-width="2.5"/>' +
      '<rect x="-26" y="-36" width="13" height="12" fill="#9fe0ff" stroke="#fff" stroke-width="2.5"/><rect x="13" y="-36" width="13" height="12" fill="#9fe0ff" stroke="#fff" stroke-width="2.5"/>';
    if (roof !== false) r += '<path d="M-40 -44 L0 -72 L40 -44 Z" fill="#e8484f" stroke="' + OUT + '" stroke-width="3" stroke-linejoin="round"/>';
    return at(x, y, r, s);
  }
  var crane = '<g stroke="#a36b00" stroke-width="3" fill="none"><path d="M30 86 V14 M42 86 V14"/><path d="M30 86 L42 70 L30 54 L42 38 L30 22"/></g>' +
    '<rect x="22" y="8" width="160" height="10" rx="3" fill="#ffc21a" stroke="#a36b00" stroke-width="3"/>' +
    '<rect x="44" y="18" width="18" height="16" rx="3" fill="#3d8bff" stroke="#1d4f99" stroke-width="3"/>' +
    '<rect x="122" y="14" width="18" height="9" rx="2" fill="#555b6e"/><line x1="131" y1="23" x2="131" y2="50" stroke="#333" stroke-width="2.5"/>' +
    '<path d="M131 50 v8 a5 5 0 1 1 -6 4" fill="none" stroke="#3a3a48" stroke-width="3.5" stroke-linecap="round"/>' +
    block(108, 64, 46, 12, '#9aa3b5', '#4d5566');

  var tips = {
    dozer: {
      title: 'The Bulldozer',
      text: 'A bulldozer pushes dirt with its big blade. Push dirt into holes to make the ground flat!',
      pic: '<svg viewBox="0 0 200 120">' + ground + at(132, 90, hole) + at(18, 90, dozer) + at(100, 88, dirt) + arrow(120, 64, 132, 76) + '</svg>'
    },
    arrows: {
      title: 'Drive Anywhere',
      text: 'The arrows drive the bulldozer up, down, left and right. It pushes whatever is in front!',
      pic: '<svg viewBox="0 0 200 120"><rect x="0" y="0" width="200" height="120" fill="#d9a866"/>' +
        [[70, 6, 'M0 10 L10 -2 L20 10'], [70, 66, 'M0 -2 L10 10 L20 -2'], [30, 36, 'M10 0 L-2 10 L10 20'], [110, 36, 'M2 0 L14 10 L2 20']].map(function (b) {
          return '<g transform="translate(' + b[0] + ',' + b[1] + ')"><rect x="-6" y="-6" width="52" height="48" rx="12" fill="#ffc21a" stroke="#a36b00" stroke-width="3"/><path transform="translate(10 10)" d="' + b[2] + '" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g>';
        }).join('') +
        at(170, 60, '<rect x="-16" y="-20" width="32" height="40" rx="8" fill="#ffc21a" stroke="#a36b00" stroke-width="3"/><rect x="-22" y="-20" width="8" height="40" rx="3" fill="#3a3a48"/><rect x="14" y="-20" width="8" height="40" rx="3" fill="#3a3a48"/><rect x="-20" y="-30" width="40" height="8" rx="3" fill="#9aa3b5" stroke="#4d5566" stroke-width="2.5"/><rect x="-9" y="-6" width="18" height="12" rx="3" fill="#bfe9ff"/>') +
        '</svg>'
    },
    undo: {
      title: 'Oops? Undo!',
      text: 'Tap Undo to go back one step. You can try again as many times as you like!',
      pic: '<svg viewBox="0 0 200 120">' + ground + at(110, 88, dirt) + at(40, 90, dozer, 0.9) +
        at(150, 40, '<rect x="-28" y="-26" width="56" height="52" rx="14" fill="#fff" stroke="#aab6cc" stroke-width="3"/><path d="M-10 -10 L-18 -2 L-10 6 M-17 -2 H6 a9 9 0 0 1 0 18 H-4" fill="none" stroke="#2f86f0" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>') + '</svg>'
    },
    order: {
      title: 'Build in Order',
      text: 'First the foundation, then the walls, then the door and windows. The roof goes on last!',
      pic: '<svg viewBox="0 0 200 120">' + ground +
        at(26, 88, '<rect x="-20" y="-7" width="40" height="7" rx="2" fill="#a9b0bd" stroke="#4d5566" stroke-width="2.5"/>') +
        at(76, 88, '<rect x="-20" y="-7" width="40" height="7" rx="2" fill="#a9b0bd" stroke="#4d5566" stroke-width="2.5"/><rect x="-16" y="-33" width="32" height="26" fill="#ff9f43" stroke="' + OUT + '" stroke-width="2.5"/>') +
        at(126, 88, '<rect x="-20" y="-7" width="40" height="7" rx="2" fill="#a9b0bd" stroke="#4d5566" stroke-width="2.5"/><rect x="-16" y="-33" width="32" height="26" fill="#ff9f43" stroke="' + OUT + '" stroke-width="2.5"/><rect x="-5" y="-22" width="10" height="15" fill="#e8484f" stroke="' + OUT + '" stroke-width="2"/>') +
        at(176, 88, '<rect x="-20" y="-7" width="40" height="7" rx="2" fill="#a9b0bd" stroke="#4d5566" stroke-width="2.5"/><rect x="-16" y="-33" width="32" height="26" fill="#ff9f43" stroke="' + OUT + '" stroke-width="2.5"/><rect x="-5" y="-22" width="10" height="15" fill="#e8484f" stroke="' + OUT + '" stroke-width="2"/><path d="M-21 -33 L0 -52 L21 -33 Z" fill="#e8484f" stroke="' + OUT + '" stroke-width="2.5" stroke-linejoin="round"/>') +
        '<g fill="#fff" font-size="16" font-weight="900" text-anchor="middle"><text x="26" y="112">1</text><text x="76" y="112">2</text><text x="126" y="112">3</text><text x="176" y="112">4</text></g>' +
        '</svg>'
    },
    rock: {
      title: 'Rocks Go in the Truck',
      text: 'Rocks are too bumpy to fill holes. Push them into the dump truck!',
      pic: '<svg viewBox="0 0 200 120">' + ground + at(10, 90, dozer, 0.8) + at(90, 88, rock) + arrow(110, 70, 124, 70) + at(126, 90, truck) + '</svg>'
    },
    triangle: {
      title: 'Strong Triangles',
      text: 'Triangles are super strong shapes. That is why many roofs are triangles!',
      pic: '<svg viewBox="0 0 200 120">' + ground + house(64, 92, 1, '#ff7eb6') +
        at(150, 70, '<path d="M-34 20 L0 -24 L34 20 Z" fill="none" stroke="#ffd21f" stroke-width="7" stroke-linejoin="round"/><circle cx="0" cy="-24" r="5" fill="#fff"/><circle cx="-34" cy="20" r="5" fill="#fff"/><circle cx="34" cy="20" r="5" fill="#fff"/>') + check(178, 30) + '</svg>'
    },
    crane: {
      title: 'The Crane',
      text: 'A crane lifts heavy things up high. Move the hook, grab, and drop!',
      pic: '<svg viewBox="0 0 200 120">' + ground + crane + '</svg>'
    },
    bigbottom: {
      title: 'Big at the Bottom',
      text: 'Put big blocks at the bottom and small ones on top. Then the tower stands tall!',
      pic: '<svg viewBox="0 0 200 120">' + ground +
        block(28, 64, 64, 22, '#ffc21a', '#a36b00') + block(38, 42, 44, 22, '#ff5d73', '#8a1c33') + block(48, 20, 24, 22, '#3d8bff', '#1d4f99') + check(60, 10) +
        '<g transform="rotate(12 150 86)">' + block(138, 64, 24, 22, '#3d8bff', '#1d4f99') + block(128, 42, 44, 22, '#ff5d73', '#8a1c33') + block(118, 20, 64, 22, '#ffc21a', '#a36b00') + '</g>' + cross(168, 10) + '</svg>'
    },
    road: {
      title: 'A Flat Road',
      text: 'Trucks need a flat road. Fill every hole so the truck can drive!',
      pic: '<svg viewBox="0 0 200 120"><rect x="0" y="0" width="200" height="120" fill="#d9a866"/><rect x="0" y="62" width="200" height="40" fill="#5b6070"/>' +
        '<path d="M8 82 H192" stroke="#ffe14d" stroke-width="4" stroke-dasharray="14 12"/>' + at(130, 82, hole, 0.8) + at(70, 82, '<ellipse rx="20" ry="7" fill="#6f7585"/>') +
        at(24, 82, truck, 0.75) + arrow(84, 52, 120, 52) + '</svg>'
    },
    foundation: {
      title: 'A Wide Foundation',
      text: 'A tall house needs a wide, strong foundation. It holds the whole house up!',
      pic: '<svg viewBox="0 0 200 120">' + ground +
        at(64, 88, '<rect x="-40" y="-10" width="80" height="10" rx="2" fill="#a9b0bd" stroke="#4d5566" stroke-width="3"/><rect x="-30" y="-44" width="60" height="34" fill="#7ed957" stroke="' + OUT + '" stroke-width="3"/><rect x="-30" y="-78" width="60" height="34" fill="#7ed957" stroke="' + OUT + '" stroke-width="3"/><path d="M-36 -78 L0 -100 L36 -78 Z" fill="#e8484f" stroke="' + OUT + '" stroke-width="3" stroke-linejoin="round"/>') + check(118, 24) +
        at(160, 88, '<g transform="rotate(-10)"><rect x="-10" y="-10" width="20" height="10" rx="2" fill="#a9b0bd" stroke="#4d5566" stroke-width="3"/><rect x="-22" y="-44" width="44" height="34" fill="#7ed957" stroke="' + OUT + '" stroke-width="3"/></g>') + cross(186, 30) + '</svg>'
    },
    stages: {
      title: 'Step by Step',
      text: 'Real builders work in steps. First make the ground flat, then build!',
      pic: '<svg viewBox="0 0 200 120">' + ground + at(8, 90, dozer, 0.75) + arrow(66, 60, 96, 60) + house(150, 92, 0.95, '#b78bff') + '</svg>'
    }
  };

  var facts = [
    'Bulldozers roll on tracks, so they don\'t sink in soft mud.',
    'The big flat shovel on a bulldozer is called a blade.',
    'Some bulldozers are heavier than 20 elephants!',
    'Big trucks beep when they back up, so people know to stay away.',
    'Most houses stand on a foundation made of concrete.',
    'Concrete keeps getting harder for weeks after it is poured.',
    'Dump trucks can tip their back up to pour out dirt and rocks.',
    'Triangles are used in roofs and bridges because they are so strong.',
    'Tower cranes can lift loads as heavy as several cars.',
    'Some tower cranes can make themselves taller, one piece at a time!',
    'Crane drivers sit in a tiny cabin high up in the sky.',
    'Potholes start when water gets into little cracks in the road.',
    'The tallest building in the world is taller than 2,700 feet!',
    'Roads are built in layers, like a giant cake!',
    'Steel beams hold up tall buildings like a skeleton.',
    'Builders wear hard hats to keep their heads safe.',
    'Bricks are made of clay baked in a very hot oven.',
    'Architects draw plans called blueprints before building starts.'
  ];

  return { tips: tips, facts: facts };
});
