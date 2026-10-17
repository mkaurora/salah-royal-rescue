/* Circuits levels.
 * Map tokens (space separated, one per cell): '..' empty buildable cell, '##' rock,
 * <Type><rotation>[*][+]  e.g. 'B0' battery (+ points up), 'H1' house (wires left/right), 'I0*' wire you can tap to turn,
 * 'S1' switch (starts off), 'S1+' switch (starts on). See js/logic/circuits.js for all types.
 * Rotation: 0..3 quarter turns clockwise. Straight parts at 0 connect up/down, at 1 left/right.
 * Corner C at 0 connects up+right, 1 right+down, 2 down+left, 3 left+up. Tee T at 0 connects right+down+left.
 * tray: tiles the player can place. start: removable tiles already on the board.
 * solution: { placed:[{t,x,y,r}], rots:{'x,y':r}, sw:{'x,y':true} } — the stored 3-star solution.
 * par: number of placed tiles for 3 stars. need:'bright' → houses must be bright. needFan:'fast' → fans must spin fast.
 * lamps: n → at least n lamps from the tray must be lit. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.levels = root.LE.levels || {}; root.LE.levels.circuits = mod.levels; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function P(t, x, y, r) { return { t: t, x: x, y: y, r: r || 0 }; }

  var levels = [
    {
      id: 'c1', name: 'First Light',
      goal: 'Light up the house! Fill the gap in the wire.',
      tip: 'loop',
      map: ['C1 I1 C2',
            'B0 ## H0',
            'C0 .. C3'],
      tray: { I: 1 }, par: 1,
      solution: { placed: [P('I', 1, 2, 1)], rots: {}, sw: {} },
      hint: 'Drag the wire into the empty square.',
      tutorial: [
        { say: 'This is a battery. It has power inside! ⚡', point: 'cell:0,1', ok: true },
        { say: 'Power must go all the way round. Drag the wire into the gap!', drag: ['tray:I', 'cell:1,2'], wait: 'place' }
      ]
    },
    {
      id: 'c2', name: 'Turn the Wire',
      goal: 'Turn the wire and fill the gap to light the house!',
      tip: 'rotate',
      map: ['C1 I1 I1 C2',
            'B0 ## ## H0',
            'C0 I0* .. C3'],
      tray: { I: 1 }, par: 1,
      solution: { placed: [P('I', 2, 2, 1)], rots: { '1,2': 1 }, sw: {} },
      hint: 'Tap the standing-up wire to turn it flat.',
      tutorial: [
        { say: 'Oh no! This wire points the wrong way. Tap it to turn it!', point: 'cell:1,2', wait: 'rotate' },
        { say: 'Great! Now drag a wire into the gap.', drag: ['tray:I', 'cell:2,2'], wait: 'place' }
      ]
    },
    {
      id: 'c3', name: 'Corners',
      goal: 'Use corner wires to go round the bend!',
      tip: 'corner',
      map: ['.. I1 ..',
            'B0 ## H0',
            'C0 I1 C3'],
      tray: { C: 2 }, par: 2,
      solution: { placed: [P('C', 0, 0, 1), P('C', 2, 0, 2)], rots: {}, sw: {} },
      hint: 'Put one corner in each top corner square.',
      tutorial: [
        { say: 'A corner wire turns the power round a bend. Drag one here!', drag: ['tray:C', 'cell:0,0'], wait: 'place' },
        { say: 'One more corner on the other side!', drag: ['tray:C', 'cell:2,0'], wait: 'place' }
      ]
    },
    {
      id: 'c4', name: 'Long Way Round',
      goal: 'Build a long wire path over the rocks!',
      map: ['.. .. .. ..',
            '.. ## ## ..',
            'B0 ## ## H0',
            'C0 I1 I1 C3'],
      tray: { I: 4, C: 2 }, par: 6,
      solution: { placed: [P('I', 0, 1, 0), P('C', 0, 0, 1), P('I', 1, 0, 1), P('I', 2, 0, 1), P('C', 3, 0, 2), P('I', 3, 1, 0)], rots: {}, sw: {} },
      hint: 'Go up from the battery, across the top, and down to the house.'
    },
    {
      id: 'c5', name: 'Share the Power',
      goal: 'Light BOTH houses with one path!',
      tip: 'series',
      map: ['C1 I1 I1 C2',
            'B0 ## ## H0',
            'I0 ## ## H0',
            'C0 .. .. C3'],
      tray: { I: 2 }, par: 2,
      solution: { placed: [P('I', 1, 3, 1), P('I', 2, 3, 1)], rots: {}, sw: {} },
      winNote: 'Two houses on one path share the power, so they glow dim.',
      hint: 'Fill both gaps at the bottom.'
    },
    {
      id: 'c6', name: 'Bright Lights',
      goal: 'Make BOTH houses bright! Give each one its own path.',
      tip: 'parallel', need: 'bright',
      map: ['C1 I1 T0 I1 C2',
            'B0 ## H0 ## H0',
            'C0 I1 .. I1 ..'],
      tray: { T: 1, C: 1 }, par: 2,
      solution: { placed: [P('T', 2, 2, 2), P('C', 4, 2, 3)], rots: {}, sw: {} },
      winNote: 'Each house has its own path, so both are bright!',
      hint: 'The T wire splits the path in two. Put it under the middle house.'
    },
    {
      id: 'c7', name: 'Flip the Switch',
      goal: 'Fix the wire, then turn on the switch!',
      tip: 'switch',
      map: ['C1 S1 C2',
            'B0 ## H0',
            'C0 .. C3'],
      tray: { I: 1 }, par: 1,
      solution: { placed: [P('I', 1, 2, 1)], rots: {}, sw: { '1,0': true } },
      hint: 'Fill the gap, then tap the switch at the top.',
      tutorial: [
        { say: 'First, drag the wire into the gap.', drag: ['tray:I', 'cell:1,2'], wait: 'place' },
        { say: 'The switch is OFF. Tap it to turn it ON!', point: 'cell:1,0', wait: 'switch' }
      ]
    },
    {
      id: 'c8', name: 'Fan Power',
      goal: 'Make the fan spin!',
      tip: 'motor',
      map: ['C1 I1 I1 C2',
            'B0 ## ## I0',
            '.. ## ## M0',
            '.. .. I1 C3'],
      tray: { I: 2, C: 1 }, par: 3,
      solution: { placed: [P('I', 0, 2, 0), P('C', 0, 3, 0), P('I', 1, 3, 1)], rots: {}, sw: {} },
      hint: 'Go down from the battery, then turn the corner.'
    },
    {
      id: 'c9', name: 'Sleepy House',
      goal: 'Light the house, but let the sleepy house sleep!',
      tip: 'sleepy',
      map: ['C1 I1 T0 I1 C2',
            'B0 ## Z0 ## H0',
            'C0 I1 .. .. ..'],
      tray: { I: 2, C: 1, T: 1 }, par: 3,
      solution: { placed: [P('I', 2, 2, 1), P('I', 3, 2, 1), P('C', 4, 2, 3)], rots: {}, sw: {} },
      hint: 'Make the path go under the sleepy house, not into it.'
    },
    {
      id: 'c10', name: 'Sparks!',
      goal: 'Sparks! Take away the shortcut wire and put a lamp there.',
      tip: 'short', lamps: 1,
      map: ['C1 I1 T0 I1 C2',
            'B0 ## .. ## H0',
            'C0 I1 T2 I1 C3'],
      start: [P('I', 2, 1, 0)],
      tray: { P: 1 }, par: 1,
      solution: { placed: [P('P', 2, 1, 0)], rots: {}, sw: {} },
      hint: 'Drag the middle wire back to the box. Then put the lamp there.',
      tutorial: [
        { say: 'Sparks! This wire is a shortcut. Drag it back to the box!', drag: ['cell:2,1', 'tray'], wait: 'remove' },
        { say: 'Now put the lamp there instead!', drag: ['tray:P', 'cell:2,1'], wait: 'place' }
      ]
    },
    {
      id: 'c11', name: 'Double Power',
      goal: 'Add a battery to make both houses BRIGHT!',
      tip: 'batteries', need: 'bright',
      map: ['C1 I1 I1 C2',
            'B0 ## ## H0',
            '.. ## ## H0',
            'C0 I1 I1 C3'],
      tray: { B: 1 }, par: 1,
      solution: { placed: [P('B', 0, 2, 0)], rots: {}, sw: {} },
      winNote: 'Two batteries in a row push twice as hard!',
      hint: 'Put the battery under the other battery, plus side up.'
    },
    {
      id: 'c12', name: 'Flip It',
      goal: 'One battery is upside down! Flip it and fix the wire.',
      tip: 'polarity', need: 'bright',
      map: ['C1 I1 .. I1 C2',
            'B0 ## ## ## H0',
            'B2* ## ## ## H0',
            'C0 I1 I1 I1 C3'],
      tray: { I: 1 }, par: 1,
      solution: { placed: [P('I', 2, 0, 1)], rots: { '0,2': 0 }, sw: {} },
      hint: 'Tap the bottom battery so its + points up, like the top one.'
    },
    {
      id: 'c13', name: 'Fan and Light',
      goal: 'Make the fan spin FAST and the house BRIGHT!',
      need: 'bright', needFan: 'fast',
      map: ['C1 I1 T0 I1 C2',
            'B0 ## M0 ## H0',
            'C0 .. .. .. C3'],
      tray: { I: 2, T: 1 }, par: 3,
      solution: { placed: [P('I', 1, 2, 1), P('T', 2, 2, 2), P('I', 3, 2, 1)], rots: {}, sw: {} },
      winNote: 'The fan and the house each have their own path!',
      hint: 'Use the T wire under the fan.'
    },
    {
      id: 'c14', name: 'Crossroads',
      goal: 'Light all three houses BRIGHT!',
      tip: 'cross', need: 'bright',
      map: ['C1 I1 T0 I1 C2',
            'B0 ## H0 ## I0',
            'C0 .. .. H1 T1',
            '## ## H0 ## I0',
            '## ## C0 I1 C3'],
      tray: { X: 1, I: 1 }, par: 2,
      solution: { placed: [P('I', 1, 2, 1), P('X', 2, 2, 0)], rots: {}, sw: {} },
      hint: 'The cross wire joins all four sides. Put it in the middle.'
    },
    {
      id: 'c15', name: 'Night Switches',
      goal: 'Light the house. Keep the sleepy house dark!',
      map: ['C1 I1 T0 I1 C2',
            'B0 ## S0 ## S0',
            'I0 ## Z0 ## H0',
            'C0 I1 T2 .. ..'],
      tray: { I: 1, C: 1 }, par: 2,
      solution: { placed: [P('I', 3, 3, 1), P('C', 4, 3, 3)], rots: {}, sw: { '4,1': true } },
      winNote: 'Each house has its own switch. Just like the lights at home!',
      hint: 'Finish the wire on the right. Then turn on only the right switch.'
    },
    {
      id: 'c16', name: 'Wind Farm',
      goal: 'Make BOTH fans spin FAST!',
      needFan: 'fast',
      map: ['C1 I1 .. I1 ..',
            'B0 ## M0 ## M0',
            'C0 I1 .. I1 ..'],
      tray: { T: 2, C: 2, I: 2 }, par: 4,
      solution: { placed: [P('T', 2, 0, 0), P('C', 4, 0, 2), P('T', 2, 2, 2), P('C', 4, 2, 3)], rots: {}, sw: {} },
      hint: 'Give each fan its own path with T wires.'
    },
    {
      id: 'c17', name: 'Night City',
      goal: 'Light both houses BRIGHT. Shh, one house is sleeping!',
      need: 'bright',
      map: ['C1 S1 .. I1 .. C2',
            'B0 ## H0 ## H0 Z0',
            'C0 I1 .. I1 .. C3'],
      tray: { T: 2, C: 2, I: 1 }, par: 4,
      solution: { placed: [P('T', 2, 0, 0), P('C', 4, 0, 2), P('T', 2, 2, 2), P('C', 4, 2, 3)], rots: {}, sw: { '1,0': true } },
      winNote: 'You lit up the whole city!',
      hint: 'Use T wires for the first house and corners for the second. Don\'t forget the switch!'
    }
  ];

  return { levels: levels };
});
