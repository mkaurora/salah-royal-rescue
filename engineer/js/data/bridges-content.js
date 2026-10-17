/* Bridges tip cards + "Did you know?" facts. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.content = root.LE.content || {}; root.LE.content.bridges = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Tip pictures: SVG, viewBox 0 0 200 120, drawn on a blue panel.
  var water = '<rect x="0" y="96" width="200" height="24" fill="#2f9be8"/><path d="M0 100 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#bfeaff" stroke-width="3"/>';
  function cliffs(l, r, top) {
    top = top || 60;
    return '<path d="M0 ' + top + ' H' + l + ' V120 H0Z" fill="#c98a4b" stroke="#6b4420" stroke-width="3"/>' +
      '<rect x="0" y="' + (top - 6) + '" width="' + (l + 2) + '" height="9" rx="4" fill="#5cc75a" stroke="#2e7a2e" stroke-width="2"/>' +
      '<path d="M' + r + ' ' + top + ' H200 V120 H' + r + 'Z" fill="#c98a4b" stroke="#6b4420" stroke-width="3"/>' +
      '<rect x="' + (r - 2) + '" y="' + (top - 6) + '" width="' + (202 - r) + '" height="9" rx="4" fill="#5cc75a" stroke="#2e7a2e" stroke-width="2"/>';
  }
  function beam(x1, y1, x2, y2, color, w) {
    color = color || '#ff9a2e';
    w = w || 8;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#6b3d12" stroke-width="' + (w + 4) + '" stroke-linecap="round"/>' +
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + color + '" stroke-width="' + w + '" stroke-linecap="round"/>';
  }
  function road(x1, x2, y) {
    return '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#2b2f45" stroke-width="12" stroke-linecap="round"/>' +
      '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="#4a5070" stroke-width="7" stroke-linecap="round"/>' +
      '<line x1="' + (x1 + 6) + '" y1="' + y + '" x2="' + (x2 - 6) + '" y2="' + y + '" stroke="#ffd21f" stroke-width="2" stroke-dasharray="6 6"/>';
  }
  function bolt(x, y, r) {
    r = r || 6;
    return '<circle cx="' + x + '" cy="' + y + '" r="' + (r + 2) + '" fill="#555c70"/><circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#d6dbe6" stroke="#555c70" stroke-width="2"/>';
  }
  function joint(x, y) { return '<circle cx="' + x + '" cy="' + y + '" r="5" fill="#fff" stroke="#6b3d12" stroke-width="2.5"/>'; }
  function car(x, y, s, color) {
    s = s || 1; color = color || '#ff4f6d';
    return '<g transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
      '<rect x="-22" y="-16" width="44" height="14" rx="6" fill="' + color + '" stroke="#7a1830" stroke-width="2.5"/>' +
      '<path d="M-12 -16 q2 -11 12 -11 q10 0 13 11z" fill="#bfe9ff" stroke="#7a1830" stroke-width="2.5"/>' +
      '<circle cx="-3" cy="-19" r="2" fill="#23264a"/><circle cx="5" cy="-19" r="2" fill="#23264a"/>' +
      '<circle cx="-12" cy="-2" r="6" fill="#2b2f45"/><circle cx="12" cy="-2" r="6" fill="#2b2f45"/>' +
      '<circle cx="-12" cy="-2" r="2.5" fill="#c9cfdb"/><circle cx="12" cy="-2" r="2.5" fill="#c9cfdb"/></g>';
  }
  function truck(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="-30" y="-26" width="38" height="22" rx="4" fill="#ffc83d" stroke="#8a5a00" stroke-width="2.5"/>' +
      '<rect x="8" y="-20" width="20" height="16" rx="4" fill="#3d8bff" stroke="#1d4f99" stroke-width="2.5"/>' +
      '<rect x="14" y="-17" width="10" height="7" rx="2" fill="#bfe9ff"/>' +
      '<circle cx="-18" cy="-3" r="6" fill="#2b2f45"/><circle cx="16" cy="-3" r="6" fill="#2b2f45"/></g>';
  }
  function svg(body) { return '<svg viewBox="0 0 200 120">' + body + '</svg>'; }
  function txt(x, y, s, color, size) {
    return '<text x="' + x + '" y="' + y + '" font-size="' + (size || 16) + '" font-weight="900" text-anchor="middle" fill="' + (color || '#fff') + '" stroke="rgba(0,0,0,.35)" stroke-width="3" paint-order="stroke">' + s + '</text>';
  }
  function coin(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')"><circle r="12" fill="#ffc83d" stroke="#b07a00" stroke-width="3"/><circle r="7" fill="none" stroke="#e0a000" stroke-width="2"/><text y="5" font-size="12" font-weight="900" text-anchor="middle" fill="#8a5a00">1</text></g>';
  }
  function star(x, y, on) {
    return '<path transform="translate(' + x + ',' + y + ') scale(1.1)" d="M0 -11 l3.3 6.8 7.4 1 -5.4 5.2 1.3 7.4 -6.6 -3.5 -6.6 3.5 1.3 -7.4 -5.4 -5.2 7.4 -1z" fill="' + (on ? '#ffd21f' : 'rgba(255,255,255,.35)') + '" stroke="' + (on ? '#c98a00' : 'rgba(0,0,0,.2)') + '" stroke-width="2"/>';
  }

  var tips = {
    road: {
      title: 'Build a road!',
      text: 'Drag from a bolt to make a beam. Flat beams on the road line become road for the car.',
      pic: svg(water + cliffs(60, 140) + road(60, 140, 60) + bolt(60, 60) + bolt(140, 60) + car(100, 54, 0.9) +
        '<path d="M66 40 Q100 18 134 40" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="3 8" stroke-linecap="round"/><path d="M128 32 l8 9 -11 3z" fill="#fff"/>')
    },
    support: {
      title: 'Supports',
      text: 'A beam from a low bolt holds the road up, like a helping hand.',
      pic: svg(water + cliffs(50, 150) + beam(50, 92, 100, 56) + beam(150, 92, 100, 56) + road(50, 150, 56) +
        bolt(50, 56) + bolt(150, 56) + bolt(50, 92) + bolt(150, 92) + joint(100, 56) + txt(100, 90, '⬆', '#fff', 22))
    },
    triangle: {
      title: 'Triangles are strong!',
      text: 'A triangle can not squish. Engineers use triangles to make bridges strong.',
      pic: svg('<g transform="translate(100 62)">' +
        beam(-46, 34, 0, -40, '#ff9a2e', 10) + beam(0, -40, 46, 34, '#ff9a2e', 10) + beam(-46, 34, 46, 34, '#ff9a2e', 10) +
        joint(-46, 34) + joint(0, -40) + joint(46, 34) + '</g>' + txt(36, 40, '💪', '#fff', 30) + txt(166, 40, '💪', '#fff', 30))
    },
    square: {
      title: 'Squares squish',
      text: 'Push a square and it squishes flat. Add a beam corner to corner to make triangles!',
      pic: svg('<g transform="translate(14 22)">' + beam(0, 70, 56, 70) + beam(0, 70, 22, 14) + beam(56, 70, 78, 14) + beam(22, 14, 78, 14) +
        joint(0, 70) + joint(56, 70) + joint(22, 14) + joint(78, 14) + '</g>' + txt(100, 60, '➜', '#fff', 26) +
        '<g transform="translate(120 22)">' + beam(0, 70, 60, 70) + beam(0, 70, 0, 14) + beam(60, 70, 60, 14) + beam(0, 14, 60, 14) +
        beam(0, 70, 60, 14, '#33d17a') + joint(0, 70) + joint(60, 70) + joint(0, 14) + joint(60, 14) + '</g>')
    },
    budget: {
      title: 'Coins',
      text: 'Every beam costs a coin. Use fewer coins to get 3 stars!',
      pic: svg(coin(40, 40) + coin(70, 40) + coin(100, 40) + txt(132, 47, '=', '#fff', 26) + star(158, 40, true) + star(182, 40, true) +
        '<rect x="20" y="70" width="160" height="34" rx="17" fill="rgba(0,0,0,.2)"/>' + star(56, 87, true) + star(80, 87, true) + star(104, 87, true) +
        txt(146, 94, 'few!', '#ffe14d', 18))
    },
    truss: {
      title: 'Trusses',
      text: 'Many triangles together make a truss. It can sit on top of the road!',
      pic: svg(water + cliffs(30, 170, 76) + '<g>' +
        beam(30, 76, 65, 36) + beam(65, 36, 135, 36) + beam(135, 36, 170, 76) + beam(65, 36, 65, 76) + beam(135, 36, 135, 76) +
        beam(65, 36, 100, 76) + beam(100, 76, 135, 36) + beam(100, 36, 100, 76) + '</g>' + road(30, 170, 76) +
        joint(65, 36) + joint(100, 36) + joint(135, 36) + joint(65, 76) + joint(100, 76) + joint(135, 76) + bolt(30, 76) + bolt(170, 76))
    },
    pillar: {
      title: 'Pillars',
      text: 'A pillar is a strong rock or post in the river. It holds up the middle of the bridge.',
      pic: svg(water + cliffs(24, 176, 50) + '<path d="M88 120 L92 82 H108 L112 120Z" fill="#9aa3b5" stroke="#555c70" stroke-width="3"/>' +
        beam(100, 82, 62, 50) + beam(100, 82, 138, 50) + beam(100, 82, 100, 50) + road(24, 176, 50) + bolt(100, 82) + bolt(24, 50) + bolt(176, 50))
    },
    arch: {
      title: 'Arches',
      text: 'An arch pushes down into the ground on both sides. People built arches 2000 years ago!',
      pic: svg(water + cliffs(30, 170, 40) + '<path d="M30 96 Q100 20 170 96" fill="none" stroke="#6b3d12" stroke-width="14" stroke-linecap="round"/>' +
        '<path d="M30 96 Q100 20 170 96" fill="none" stroke="#ff9a2e" stroke-width="9" stroke-linecap="round"/>' +
        beam(65, 59, 65, 40, '#ff9a2e', 6) + beam(135, 59, 135, 40, '#ff9a2e', 6) + road(30, 170, 40) +
        txt(22, 84, '⬇', '#fff', 20) + txt(178, 84, '⬇', '#fff', 20))
    },
    heavy: {
      title: 'Heavy loads',
      text: 'Green is easy. Red is working too hard! Add more beams to share the load.',
      pic: svg(water + cliffs(40, 160) + beam(40, 92, 100, 60, '#33d17a') + beam(160, 92, 100, 60, '#ff4040') + road(40, 160, 60) +
        bolt(40, 60) + bolt(160, 60) + bolt(40, 92) + bolt(160, 92) + truck(100, 54) +
        '<rect x="62" y="104" width="76" height="12" rx="6" fill="url(#hg)"/><defs><linearGradient id="hg"><stop offset="0" stop-color="#33d17a"/><stop offset=".5" stop-color="#ffd21f"/><stop offset="1" stop-color="#ff4040"/></linearGradient></defs>')
    },
    steel: {
      title: 'Steel beams',
      text: 'Steel is twice as strong as wood. But it costs 2 coins!',
      pic: svg(beam(20, 40, 90, 40, '#ff9a2e', 14) + txt(55, 74, '💪', '#fff', 22) + coin(55, 98) +
        '<line x1="110" y1="40" x2="180" y2="40" stroke="#2c3f5a" stroke-width="18" stroke-linecap="round"/><line x1="110" y1="40" x2="180" y2="40" stroke="#8fb3d9" stroke-width="13" stroke-linecap="round"/>' +
        '<circle cx="124" cy="40" r="3" fill="#2c3f5a"/><circle cx="145" cy="40" r="3" fill="#2c3f5a"/><circle cx="166" cy="40" r="3" fill="#2c3f5a"/>' +
        txt(145, 74, '💪💪', '#fff', 22) + coin(133, 98) + coin(158, 98))
    },
    balance: {
      title: 'Balance',
      text: 'One leg wobbles and tips. Two legs, like a V, keep the bridge balanced!',
      pic: svg(water + '<path d="M40 120 L44 96 H56 L60 120Z" fill="#9aa3b5" stroke="#555c70" stroke-width="3"/>' + beam(50, 96, 50, 50) + beam(20, 50, 80, 56, '#ff9a2e') +
        txt(50, 30, '😵', '#fff', 22) +
        '<path d="M140 120 L144 96 H156 L160 120Z" fill="#9aa3b5" stroke="#555c70" stroke-width="3"/>' + beam(150, 96, 120, 52) + beam(150, 96, 180, 52) + beam(112, 52, 188, 52) +
        txt(150, 30, '😄', '#fff', 22))
    },
    cable: {
      title: 'Cables pull',
      text: 'Tall towers hold the road up with beams that pull, like a swing on a tree.',
      pic: svg(water + cliffs(40, 160, 72) + '<rect x="34" y="14" width="12" height="60" rx="4" fill="#d6dbe6" stroke="#555c70" stroke-width="3"/>' +
        '<rect x="154" y="14" width="12" height="60" rx="4" fill="#d6dbe6" stroke="#555c70" stroke-width="3"/>' +
        beam(40, 26, 80, 72, '#ff9a2e', 5) + beam(40, 26, 100, 72, '#ff9a2e', 5) + beam(160, 26, 120, 72, '#ff9a2e', 5) + beam(160, 26, 100, 72, '#ff9a2e', 5) +
        road(40, 160, 72) + bolt(40, 26, 5) + bolt(160, 26, 5) + txt(100, 50, '⬆', '#fff', 22))
    },
    boat: {
      title: 'Room for boats',
      text: 'Boats sail under some bridges. Build up high so the boat fits!',
      pic: svg(water + cliffs(30, 170, 66) + beam(30, 66, 65, 30) + beam(65, 30, 135, 30) + beam(135, 30, 170, 66) + beam(65, 30, 100, 66) + beam(100, 66, 135, 30) +
        road(30, 170, 66) + '<g transform="translate(100 96)"><path d="M-26 0 H26 L18 12 H-18Z" fill="#ff4f6d" stroke="#7a1830" stroke-width="2.5"/>' +
        '<rect x="-2" y="-24" width="4" height="24" fill="#6b4b2a"/><path d="M2 -22 L20 -4 H2Z" fill="#fff" stroke="#999" stroke-width="1.5"/></g>')
    }
  };

  var facts = [
    'The Golden Gate Bridge in San Francisco is painted a color called International Orange.',
    'The longest bridge in the world is in China. It is about 100 miles long!',
    'People in ancient Rome built stone arch bridges. Some are still used today, 2000 years later!',
    'Tower Bridge in London can lift up its road so tall ships can sail through.',
    'Steel bridges get a tiny bit longer on hot days and shorter on cold days.',
    'The very first bridges were probably fallen trees lying across a stream.',
    'In Peru, people weave a rope bridge out of grass. They make a new one every year!',
    'In India, some bridges are made of living tree roots that grow stronger every year.',
    'The Eiffel Tower is made of iron triangles, just like a truss bridge.',
    'Some bridges are built just for animals, so they can cross busy roads safely.',
    'The Sydney Harbour Bridge is called "The Coat Hanger" because of its arch shape.',
    'When the Brooklyn Bridge opened, 21 elephants walked across to show it was strong!',
    'Army ants can hold on to each other to make a bridge with their own bodies.',
    'Engineers test small bridge models in wind tunnels before they build the real one.',
    'Bridges that hang from big cables are called suspension bridges.',
    'The Millau Viaduct in France is taller than the Eiffel Tower!',
    'Bridge builders use triangles because a triangle can not change its shape.'
  ];

  return { tips: tips, facts: facts };
});
