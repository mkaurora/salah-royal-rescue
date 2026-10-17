/* Circuits tip cards + "Did you know?" facts. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.content = root.LE.content || {}; root.LE.content.circuits = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // ---- small SVG helpers (viewBox 0 0 200 120) ----
  var bg = '<rect x="2" y="2" width="196" height="116" rx="16" fill="#1d2259"/>' +
    '<circle cx="24" cy="18" r="1.6" fill="#fff" opacity=".8"/><circle cx="170" cy="14" r="1.4" fill="#fff" opacity=".7"/><circle cx="120" cy="10" r="1.2" fill="#fff" opacity=".6"/>';
  function wire(d, on) {
    return '<path d="' + d + '" fill="none" stroke="#7a3d12" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="' + (on ? '#ffd23f' : '#e08a3c') + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
      (on ? '<path d="' + d + '" fill="none" stroke="#fff8c0" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="2 10"/>' : '');
  }
  function battery(x, y, rot) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + (rot || 0) + ')">' +
      '<rect x="-6" y="-26" width="12" height="6" rx="2" fill="#c9ced8" stroke="#2a2f4a" stroke-width="2"/>' +
      '<rect x="-14" y="-21" width="28" height="42" rx="6" fill="#ff5d73" stroke="#2a2f4a" stroke-width="3"/>' +
      '<rect x="-14" y="2" width="28" height="19" rx="5" fill="#3a3f5c" stroke="#2a2f4a" stroke-width="3"/>' +
      '<text x="0" y="-4" font-size="16" font-weight="900" text-anchor="middle" fill="#fff">+</text>' +
      '<text x="0" y="17" font-size="16" font-weight="900" text-anchor="middle" fill="#fff">−</text></g>';
  }
  function house(x, y, lit, sleepy) {
    var win = lit === 2 ? '#ffe36b' : lit === 1 ? '#c9a64a' : '#3a3f6a';
    var glow = lit ? '<circle cx="0" cy="4" r="' + (lit === 2 ? 30 : 20) + '" fill="#ffe36b" opacity="' + (lit === 2 ? 0.35 : 0.18) + '"/>' : '';
    return '<g transform="translate(' + x + ',' + y + ')">' + glow +
      '<path d="M-20 -4 L0 -22 L20 -4 Z" fill="' + (sleepy ? '#7f6bd6' : '#ff7a59') + '" stroke="#2a2f4a" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="-16" y="-5" width="32" height="26" rx="3" fill="' + (sleepy ? '#b9b0f0' : '#ffd9a8') + '" stroke="#2a2f4a" stroke-width="3"/>' +
      '<rect x="-11" y="0" width="9" height="9" rx="2" fill="' + win + '" stroke="#2a2f4a" stroke-width="2"/>' +
      '<rect x="2" y="0" width="9" height="9" rx="2" fill="' + win + '" stroke="#2a2f4a" stroke-width="2"/>' +
      (sleepy ? '<text x="16" y="-16" font-size="13" font-weight="900" fill="#fff">z</text><text x="23" y="-24" font-size="10" font-weight="900" fill="#fff">z</text>' : '') +
      '</g>';
  }
  function bulb(x, y, lit) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      (lit ? '<circle cx="0" cy="-4" r="22" fill="#fff27a" opacity=".35"/>' : '') +
      '<circle cx="0" cy="-4" r="11" fill="' + (lit ? '#fff27a' : '#cfd6e6') + '" stroke="#2a2f4a" stroke-width="3"/>' +
      '<rect x="-6" y="6" width="12" height="9" rx="2" fill="#9aa3b5" stroke="#2a2f4a" stroke-width="2.5"/></g>';
  }
  function fan(x, y) {
    var b = '';
    for (var i = 0; i < 3; i++) b += '<ellipse cx="0" cy="-12" rx="6" ry="12" fill="#5fe0ff" stroke="#2a2f4a" stroke-width="2.5" transform="rotate(' + (i * 120 + 20) + ')"/>';
    return '<g transform="translate(' + x + ',' + y + ')"><path d="M-14 -10 a16 16 0 0 1 28 0" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>' + b +
      '<circle r="5" fill="#ffd23f" stroke="#2a2f4a" stroke-width="2.5"/></g>';
  }
  function sw(x, y, on) {
    return '<g transform="translate(' + x + ',' + y + ')"><rect x="-18" y="-6" width="36" height="14" rx="5" fill="#59607e" stroke="#2a2f4a" stroke-width="2.5"/>' +
      '<circle cx="-12" cy="0" r="4" fill="#ffd23f"/><circle cx="12" cy="0" r="4" fill="#ffd23f"/>' +
      '<rect x="-13" y="-3" width="28" height="6" rx="3" fill="' + (on ? '#43e07a' : '#ff5d73') + '" stroke="#2a2f4a" stroke-width="2" transform="rotate(' + (on ? 0 : -35) + ' -12 0)"/></g>';
  }
  function spark(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')"><path d="M0 -16 L4 -4 L16 -6 L6 2 L12 14 L0 6 L-12 14 L-6 2 L-16 -6 L-4 -4 Z" fill="#fff27a" stroke="#ff8a1c" stroke-width="2.5" stroke-linejoin="round"/></g>';
  }
  function svg(s) { return '<svg viewBox="0 0 200 120">' + bg + s + '</svg>'; }
  function arrow(x, y, label) {
    return '<text x="' + x + '" y="' + y + '" font-size="26" font-weight="900" text-anchor="middle" fill="#fff">' + label + '</text>';
  }

  var tips = {
    loop: {
      title: 'Make a loop!',
      text: 'Power goes out of the battery, round the wires, and back again. No gaps allowed!',
      pic: svg(wire('M40 60 V24 H160 V60 M160 60 V96 H40 V60', true) + battery(40, 60) + house(160, 64, 2))
    },
    rotate: {
      title: 'Tap to turn',
      text: 'Tap a wire to turn it. Turn it until it joins up with its friends.',
      pic: svg(wire('M30 60 H70', true) + wire('M100 40 V80', false) + arrow(100, 30, '↻') + wire('M130 60 H170', true) +
        '<text x="100" y="108" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">tap!</text>')
    },
    corner: {
      title: 'Corner wires',
      text: 'A corner wire turns the power round a bend.',
      pic: svg(wire('M50 100 V40 H150', true) + '<circle cx="50" cy="40" r="22" fill="none" stroke="#5fe0ff" stroke-width="3" stroke-dasharray="5 5"/>')
    },
    series: {
      title: 'Sharing the power',
      text: 'When two lights are on ONE path, they share the power. Both glow dim.',
      pic: svg(wire('M30 60 V22 H170 V98 H30 V60', true) + battery(30, 60) + house(170, 44, 1) + house(170, 86, 1))
    },
    parallel: {
      title: 'Each light, its own path',
      text: 'Split the path with a T wire. Each house gets its own path and shines bright!',
      pic: svg(wire('M30 60 V22 H170 V98 H30 V60 M110 22 V98', true) + battery(30, 60) + house(110, 62, 2) + house(170, 62, 2))
    },
    switch: {
      title: 'Switches',
      text: 'A switch opens and closes the path. Tap it: ON lets power through, OFF stops it.',
      pic: svg(wire('M40 60 V24 H82 M118 24 H160 V96 H40 V60', true) + sw(100, 24, true) + battery(40, 60) + house(160, 64, 2) +
        '<text x="100" y="62" font-size="18" font-weight="900" text-anchor="middle" fill="#43e07a">ON</text>')
    },
    motor: {
      title: 'Motors',
      text: 'A motor turns power into spinning! Put one in the loop to make the fan go.',
      pic: svg(wire('M40 60 V24 H160 V96 H40 V60', true) + battery(40, 60) + fan(160, 60))
    },
    sleepy: {
      title: 'Power only goes where wires go',
      text: 'The sleepy house only lights up if a wire loop goes through it. Go around it!',
      pic: svg(wire('M30 60 V24 H170 V60 M170 60 V98 H30 V60', true) + battery(30, 60) + house(170, 64, 2) + house(100, 66, 0, true) +
        '<path d="M100 42 V24" stroke="#7a3d12" stroke-width="7" stroke-linecap="round"/>' +
        '<circle cx="182" cy="16" r="8" fill="#ffe9a8"/><circle cx="186" cy="13" r="7" fill="#1d2259"/>')
    },
    short: {
      title: 'Short circuit!',
      text: 'If power can rush back to the battery with no light in the way, it makes sparks. Always put a light in the path!',
      pic: svg(wire('M50 60 V24 H150 V96 H50 V60', true) + battery(50, 60) + spark(150, 60) + spark(100, 24) +
        '<text x="100" y="66" font-size="30" font-weight="900" text-anchor="middle" fill="#ff5d73">✕</text>')
    },
    batteries: {
      title: 'Two batteries',
      text: 'Two batteries in a row push twice as hard. Lights get brighter!',
      pic: svg(wire('M40 60 V16 H160 V104 H40 V60', true) + battery(40, 40) + battery(40, 84) + house(160, 40, 2) + house(160, 86, 2))
    },
    polarity: {
      title: 'Which way up?',
      text: 'Batteries have a + and a − end. Point them the same way, + to −.',
      pic: svg(battery(60, 40) + battery(60, 86) + '<text x="100" y="68" font-size="30" font-weight="900" fill="#43e07a">✓</text>' +
        battery(150, 40) + battery(150, 86, 180) + '<text x="182" y="68" font-size="30" font-weight="900" fill="#ff5d73">✕</text>')
    },
    cross: {
      title: 'The cross wire',
      text: 'A cross wire joins all four sides. Power can go every way!',
      pic: svg(wire('M100 16 V104 M44 60 H156', true) + '<circle cx="100" cy="60" r="9" fill="#ffd23f" stroke="#7a3d12" stroke-width="3"/>')
    }
  };

  var facts = [
    'Electricity moves through wires super fast — almost as fast as light!',
    'Copper is used in wires because electricity flows through it easily.',
    'Lightning is a giant spark of electricity in the sky!',
    'Your body uses tiny bits of electricity to send messages from your brain.',
    'Electric eels can make their own electricity to zap their food!',
    'The light switch in your room opens and closes a circuit, just like in the game.',
    'Plastic and rubber stop electricity. That is why wires have a plastic coat.',
    'Thomas Edison made a light bulb that could glow for many hours.',
    'Big windmills called wind turbines turn wind into electricity.',
    'Solar panels turn sunlight into electricity.',
    'Your home has many circuits in parallel, so one light can be off while others stay on.',
    'A battery stores energy and gives it out as electricity.',
    'LED lights use much less power than old light bulbs.',
    'Electric cars run on giant batteries instead of gas.',
    'The word "electricity" comes from an old Greek word for amber, a shiny stone.',
    'Static electricity is why a balloon rubbed on your hair can stick to a wall!',
    'Never put anything in a wall socket — real electricity is strong and dangerous!',
    'A fan uses a motor: a magnet and wire that spin when power flows.'
  ];

  return { tips: tips, facts: facts };
});
