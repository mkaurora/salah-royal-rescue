/* Robot Coder tip cards + "Did you know?" facts. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.content = root.LE.content || {}; root.LE.content.robot = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // Small helpers to build tip pictures (SVG, viewBox 0 0 200 120).
  function block(x, y, color, label, w) {
    w = w || 52;
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<rect x="0" y="4" width="' + w + '" height="40" rx="10" fill="rgba(0,0,0,.25)"/>' +
      '<rect x="0" y="0" width="' + w + '" height="40" rx="10" fill="' + color + '" stroke="rgba(0,0,0,.2)" stroke-width="2"/>' +
      '<text x="' + (w / 2) + '" y="27" font-size="20" font-weight="900" text-anchor="middle" fill="#fff">' + label + '</text></g>';
  }
  function bot(x, y, rot) {
    return '<g transform="translate(' + x + ',' + y + ') rotate(' + (rot || 0) + ')">' +
      '<rect x="-16" y="-16" width="32" height="32" rx="9" fill="#5fd3f3" stroke="#1b6f8f" stroke-width="3"/>' +
      '<circle cx="-6" cy="-3" r="4" fill="#1b2a4a"/><circle cx="6" cy="-3" r="4" fill="#1b2a4a"/>' +
      '<path d="M16 -6 L25 0 L16 6z" fill="#ff7a59"/></g>';
  }
  var flag = '<g><rect x="0" y="-30" width="4" height="34" fill="#6b4b2a"/><path d="M4 -30 h22 l-6 7 l6 7 h-22z" fill="#ff4f6d"/></g>';
  function at(x, y, s) { return '<g transform="translate(' + x + ',' + y + ')">' + s + '</g>'; }
  var gear = '<g><circle r="13" fill="#ffc83d" stroke="#b07a00" stroke-width="3"/><circle r="5" fill="#b07a00"/>' +
    [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return '<rect x="-3" y="-18" width="6" height="7" rx="2" fill="#ffc83d" stroke="#b07a00" stroke-width="2" transform="rotate(' + a + ')"/>'; }).join('') + '</g>';
  var arrow = function (x1, y1, x2, y2) {
    return '<path d="M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2 + '" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 9"/>';
  };

  var tips = {
    forward: {
      title: 'The Forward block',
      text: 'Forward makes Robo walk one square. Put blocks in a row to make a program!',
      pic: '<svg viewBox="0 0 200 120">' + block(14, 70, '#33b864', '⬆') + block(74, 70, '#33b864', '⬆') +
        bot(40, 30, 0) + arrow(60, 30, 120, 30) + at(150, 40, flag) + '</svg>'
    },
    gears: {
      title: 'Grab the gears!',
      text: 'Walk over a gear to grab it. Grab them all for an extra star!',
      pic: '<svg viewBox="0 0 200 120">' + bot(40, 60, 0) + at(100, 60, gear) + at(160, 70, flag) + arrow(62, 60, 84, 60) + '</svg>'
    },
    facing: {
      title: 'Which way is Robo looking?',
      text: 'Forward always goes the way Robo is looking. Look for the orange nose!',
      pic: '<svg viewBox="0 0 200 120">' + bot(60, 40, 90) + arrow(60, 62, 60, 100) + bot(140, 60, 0) + arrow(162, 60, 190, 60) + '</svg>'
    },
    turnRight: {
      title: 'Turn Right',
      text: 'Turn Right spins Robo to face a new way. Robo stays on the same square.',
      pic: '<svg viewBox="0 0 200 120">' + bot(50, 60, 0) + '<path d="M90 60 h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M106 50 l10 10 l-10 10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' + bot(150, 60, 90) + block(124, 4, '#3d8bff', '↻') + '</svg>'
    },
    turnLeft: {
      title: 'Turn Left',
      text: 'Turn Left spins Robo the other way. Hold up your left hand to check!',
      pic: '<svg viewBox="0 0 200 120">' + bot(50, 60, 0) + '<path d="M90 60 h20" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M106 50 l10 10 l-10 10" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' + bot(150, 60, -90) + block(124, 4, '#3d8bff', '↺') + '</svg>'
    },
    repeat: {
      title: 'Repeat',
      text: 'Repeat does the blocks inside it again and again. Tap the number to change it!',
      pic: '<svg viewBox="0 0 200 120"><rect x="20" y="24" width="160" height="72" rx="16" fill="#ff9f1c" stroke="rgba(0,0,0,.2)" stroke-width="3"/>' +
        '<text x="44" y="68" font-size="30" font-weight="900" fill="#fff">🔁</text><circle cx="96" cy="60" r="18" fill="#fff"/><text x="96" y="70" font-size="26" font-weight="900" text-anchor="middle" fill="#ff7a00">6</text>' +
        block(122, 40, '#33b864', '⬆', 46) + '</svg>'
    },
    pattern: {
      title: 'Find the pattern',
      text: 'Look for a part that happens again. Put that part inside a Repeat!',
      pic: '<svg viewBox="0 0 200 120"><path d="M20 100 h40 v-25 h40 v-25 h40 v-25 h40" fill="none" stroke="#fff" stroke-width="8" stroke-linejoin="round" stroke-linecap="round"/>' + bot(40, 86, 0) + at(176, 22, flag) + '</svg>'
    },
    ifWall: {
      title: 'If wall ahead',
      text: 'Robo can look first! The blocks inside "If wall" only happen when a wall is in front.',
      pic: '<svg viewBox="0 0 200 120"><rect x="130" y="20" width="40" height="80" rx="8" fill="#8a6d5a" stroke="#5a4232" stroke-width="3"/>' +
        '<text x="150" y="68" font-size="26" text-anchor="middle">🧱</text>' + bot(80, 60, 0) + '<text x="80" y="22" font-size="28" text-anchor="middle">❓</text></svg>'
    },
    forever: {
      title: 'Repeat forever',
      text: 'Tap the number until you see the infinity sign. Robo keeps going until it finds the flag!',
      pic: '<svg viewBox="0 0 200 120"><rect x="30" y="24" width="140" height="72" rx="16" fill="#ff9f1c" stroke="rgba(0,0,0,.2)" stroke-width="3"/>' +
        '<circle cx="100" cy="60" r="24" fill="#fff"/><text x="100" y="74" font-size="40" font-weight="900" text-anchor="middle" fill="#ff7a00">∞</text></svg>'
    },
    turnAround: {
      title: 'Turn all the way around',
      text: 'Two Turn Rights make Robo face backwards!',
      pic: '<svg viewBox="0 0 200 120">' + bot(40, 60, 0) + bot(100, 60, 90) + bot(160, 60, 180) + '</svg>'
    },
    debug: {
      title: 'Fix the bug!',
      text: 'A bug is a mistake in a program. Press Play, watch Robo, then change the block that is wrong.',
      pic: '<svg viewBox="0 0 200 120">' + block(14, 62, '#33b864', '⬆') + block(74, 62, '#ff9f1c', '4') + block(134, 62, '#3d8bff', '↻') +
        '<circle cx="100" cy="82" r="30" fill="none" stroke="#ffe14d" stroke-width="5"/><path d="M121 103 L132 114" stroke="#ffe14d" stroke-width="7" stroke-linecap="round"/>' +
        '<g transform="translate(100,28)"><ellipse rx="14" ry="11" fill="#e8434f" stroke="#7a1520" stroke-width="3"/><path d="M0 -11 V11" stroke="#7a1520" stroke-width="2.5"/>' +
        '<circle cx="-5" cy="-3" r="2.5" fill="#1b2a4a"/><circle cx="5" cy="4" r="2.5" fill="#1b2a4a"/>' +
        '<path d="M-14 -4 h-8 M-14 4 h-8 M14 -4 h8 M14 4 h8 M-5 -11 l-4 -7 M5 -11 l4 -7" stroke="#1b2a4a" stroke-width="2.5" stroke-linecap="round"/></g></svg>'
    },
    manyWays: {
      title: 'Many ways',
      text: 'There is often more than one way to the flag. Pick the way that grabs every gear!',
      pic: '<svg viewBox="0 0 200 120"><path d="M40 98 H160 V30" fill="none" stroke="#ffe14d" stroke-width="7" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="3 12"/>' +
        '<path d="M40 82 V30 H146" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round" stroke-dasharray="2 10" opacity=".6"/>' +
        bot(40, 98, 0) + at(160, 98, gear) + at(152, 34, flag) + '</svg>'
    },
    beforeLoop: {
      title: 'Get ready, then loop',
      text: 'Blocks before a Repeat happen first. Turn Robo the right way, then start the loop!',
      pic: '<svg viewBox="0 0 200 120">' + block(14, 40, '#3d8bff', '↺') +
        '<path d="M74 60 h12" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M84 52 l8 8 l-8 8" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<rect x="100" y="24" width="88" height="72" rx="16" fill="#ff9f1c" stroke="rgba(0,0,0,.2)" stroke-width="3"/>' +
        '<circle cx="144" cy="60" r="24" fill="#fff"/><text x="144" y="74" font-size="40" font-weight="900" text-anchor="middle" fill="#ff7a00">∞</text></svg>'
    }
  };

  var facts = [
    'Robots follow programs step by step, just like Robo!',
    'The first computer programmer was a woman named Ada Lovelace, almost 200 years ago!',
    'Robots on Mars drive themselves around rocks.',
    'A bug is a mistake in a program. Fixing it is called debugging!',
    'Some robot vacuums use sensors to check for walls, like your "If wall" block.',
    'Loops help programmers write less and do more!',
    'Factory robots can build cars all day without getting tired.',
    'Coders give their programs instructions in an exact order.',
    'Some robots can swim deep in the ocean to explore.',
    'Your phone runs millions of tiny instructions every second!',
    'A robot arm in space helps astronauts move big things.',
    'Video games are made of code — lots and lots of it!',
    'Engineers test robots again and again to make them better.',
    'Some robots are smaller than a grain of rice!',
    'Traffic lights use simple programs to change colors.',
    'Robots can help doctors with very careful work.',
    'Self-driving cars use cameras to see the road.',
    'Every app you use started with someone writing code.',
    'Long ago, a real moth got stuck inside a computer. People called it a bug!',
    'Coders test their programs again and again to find bugs.',
    'Maze robots can find their way by following a wall.',
    'There is often more than one way to write a program that works.',
    'Some robots deliver food and packages right to your door!',
    'Robot dogs can walk on four legs and climb stairs.',
    'Coders try to use as few steps as they can. Short programs are easier to fix!',
    'Some farm robots help pick fruit and water plants.',
    'Lots of robots have a computer inside that works like a tiny brain.',
    'You are a coder now! Every coder started as a beginner, just like you.'
  ];

  return { tips: tips, facts: facts };
});
