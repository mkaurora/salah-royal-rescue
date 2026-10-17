/* Robot Coder levels + Practice Room challenges.
 * Map legend: '.' ground, 'T' tree, '#' rock, '~' water, 'G' gear, 'F' flag, '^ > v <' robot start.
 * Blocks: F forward, L turn left, R turn right, rep repeat (n 2..9, 0 = forever), ifw "if wall ahead". */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.levels = root.LE.levels || {}; root.LE.levels.robot = mod.levels; root.LE.levels.practice = mod.practice; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var F = { t: 'F' }, L = { t: 'L' }, R = { t: 'R' };
  function rep(n, body) { return { t: 'rep', n: n, body: body }; }
  function ifw(body) { return { t: 'ifw', body: body }; }
  function times(n, b) { var a = []; for (var i = 0; i < n; i++) a.push(b); return a; }

  var levels = [
    {
      id: 'r1', name: 'First Steps',
      goal: 'Help Robo reach the flag!',
      map: ['TTTTT',
            'T>.FT',
            'TTTTT'],
      blocks: ['F'], par: 2,
      tip: 'forward',
      solution: [F, F],
      hint: 'Robo needs 2 Forward blocks. Then press Play!',
      tutorial: [
        { say: 'Drag a Forward block into the program!', drag: ['tray:F', 'strip'], wait: 'add' },
        { say: 'Great! Robo needs one more step. Add another!', drag: ['tray:F', 'strip'], wait: 'add' },
        { say: 'Now tap Play to run it!', point: 'go', wait: 'run' }
      ]
    },
    {
      id: 'r2', name: 'Grab the Gear',
      goal: 'Walk over the gear to grab it. Then reach the flag!',
      map: ['TTTTTTT',
            'T>.G.FT',
            'TTTTTTT'],
      blocks: ['F'], par: 4,
      tip: 'gears',
      solution: times(4, F),
      hint: 'Count the steps to the flag: 1, 2, 3, 4!',
      tutorial: [
        { say: 'Count the squares to the flag. 1, 2, 3, 4!', point: 'cell:5,1', ok: true },
        { say: 'Add 4 Forward blocks. You can just tap them!', point: 'tray:F', wait: 'add', times: 4 },
        { say: 'Tap Play!', point: 'go', wait: 'run' }
      ]
    },
    {
      id: 'r3', name: 'Too Many!',
      goal: 'Robo looks down. Use just enough blocks!',
      map: ['TTTTT',
            'TTvTT',
            'TT.TT',
            'TTGTT',
            'TT.TT',
            'TTFTT'],
      blocks: ['F'], par: 4,
      startProgram: times(6, F),
      tip: 'facing',
      solution: times(4, F),
      hint: 'Robo only needs 4 steps. Tap extra blocks to take them away.',
      tutorial: [
        { say: 'Robo looks DOWN. Forward goes the way Robo looks!', point: 'robot', ok: true },
        { say: 'Too many blocks! Tap a block to take it away.', point: 'strip:last', wait: 'remove' },
        { say: 'One more to take away!', point: 'strip:last', wait: 'remove' },
        { say: 'Perfect! Now tap Play.', point: 'go', wait: 'run' }
      ]
    },
    {
      id: 'r4', name: 'Turn Right',
      goal: 'Robo must turn at the corner!',
      map: ['>..TT',
            'TTGTT',
            'TTFTT'],
      blocks: ['F', 'R'], par: 5,
      tip: 'turnRight',
      solution: [F, F, R, F, F],
      hint: 'Forward, Forward, Turn Right, Forward, Forward!'
    },
    {
      id: 'r5', name: 'Turn Left',
      goal: 'This time the path turns the other way!',
      map: ['TTFTT',
            'TTGTT',
            '>..TT'],
      blocks: ['F', 'L', 'R'], par: 5,
      tip: 'turnLeft',
      solution: [F, F, L, F, F],
      hint: 'Go 2 steps, then Turn Left, then 2 more steps.'
    },
    {
      id: 'r6', name: 'Zig Zag',
      goal: 'Turn, turn, turn! Follow the zig zag.',
      map: ['>.TTT',
            'TG.TT',
            'TTGFT'],
      blocks: ['F', 'L', 'R'], par: 9,
      solution: [F, R, F, L, F, R, F, L, F],
      hint: 'Step, then turn right, step, then turn left. Again!'
    },
    {
      id: 'r7', name: 'Gear Detour',
      goal: 'The trees block the way. Go around and grab both gears!',
      map: ['>TTTF',
            '.TTT.',
            'G.G..'],
      blocks: ['F', 'L', 'R'], par: 11,
      solution: [R, F, F, L, F, F, F, F, L, F, F],
      hint: 'Turn Right first to go down. Then go along the bottom.'
    },
    {
      id: 'r8', name: 'Twisty Path',
      goal: 'A long twisty path. Take it one step at a time!',
      map: ['>.TTT',
            'T.TTT',
            'TG..T',
            'TTTGT',
            'TTT.F'],
      blocks: ['F', 'L', 'R'], par: 12,
      solution: [F, R, F, F, L, F, F, R, F, F, L, F],
      hint: 'Move your finger along the path and say each step out loud.'
    },
    {
      id: 'r9', name: 'Repeat!',
      goal: 'A long road! Use Repeat so you need fewer blocks.',
      map: ['TTTTTTT',
            '>..G..F',
            'TTTTTTT'],
      blocks: ['F', 'L', 'R', 'rep'], par: 2,
      tip: 'repeat',
      solution: [rep(6, [F])],
      hint: 'Put ONE Forward inside a Repeat. Tap the number to make it 6.'
    },
    {
      id: 'r10', name: 'Stairs',
      goal: 'Climb the stairs! The steps repeat.',
      map: ['TTTF',
            'TT.G',
            'TG.T',
            '>.TT'],
      blocks: ['F', 'L', 'R', 'rep'], par: 5,
      tip: 'pattern',
      solution: [rep(3, [F, L, F, R])],
      hint: 'One stair is: Forward, Left, Forward, Right. Repeat it 3 times!'
    },
    {
      id: 'r11', name: 'Around the Pond',
      goal: 'Walk around the pond to the flag.',
      map: ['>..G',
            '.~~.',
            '.~~.',
            'F..G'],
      blocks: ['F', 'L', 'R', 'rep'], par: 5,
      solution: [rep(3, [F, F, F, R])],
      hint: 'Each side is 3 steps and a Turn Right. Repeat it!'
    },
    {
      id: 'r12', name: 'Two Loops',
      goal: 'Use two Repeat blocks!',
      map: ['>..G.',
            'TTTT.',
            'TTTTG',
            'TTTTF'],
      blocks: ['F', 'L', 'R', 'rep'], par: 5,
      solution: [rep(4, [F]), R, rep(3, [F])],
      hint: 'Repeat 4 Forward, Turn Right, then Repeat 3 Forward.'
    },
    {
      id: 'r13', name: 'If Wall?',
      goal: 'Robo can check for walls! Turn only when a wall is ahead.',
      map: ['>...',
            'TTTG',
            'TTT.',
            'TF..'],
      blocks: ['F', 'L', 'R', 'rep', 'ifw'], par: 4,
      tip: 'ifWall',
      solution: [rep(8, [ifw([R]), F])],
      hint: 'Inside a Repeat 8: put "If wall: Turn Right", then Forward.'
    },
    {
      id: 'r14', name: 'Forever Loop',
      goal: 'Repeat forever until Robo finds the flag!',
      map: ['>....',
            'TTTT.',
            '.GFT.',
            '.TTT.',
            'G....'],
      blocks: ['F', 'L', 'R', 'rep', 'ifw', 'forever'], par: 4,
      tip: 'forever',
      solution: [rep(0, [ifw([R]), F])],
      hint: 'Tap the Repeat number until it shows ∞. Inside: If wall Turn Right, then Forward.'
    },
    {
      id: 'r15', name: 'Left at Walls',
      goal: 'This spiral turns LEFT at every wall.',
      map: ['....<',
            '.TTTT',
            '.TFG.',
            '.TTT.',
            '....G'],
      blocks: ['F', 'L', 'R', 'rep', 'ifw', 'forever'], par: 4,
      solution: [rep(0, [ifw([L]), F])],
      hint: 'Like the last one, but If wall: Turn LEFT.'
    },
    {
      id: 'r16', name: 'Dead End',
      goal: 'Grab the gear at the end, then turn all the way around!',
      map: ['TTTTTTT',
            'F..>..G',
            'TTTTTTT'],
      blocks: ['F', 'L', 'R', 'rep', 'ifw', 'forever'], par: 5,
      tip: 'turnAround',
      solution: [rep(0, [ifw([R, R]), F])],
      hint: 'Two Turn Rights make Robo face the other way!'
    },
    {
      id: 'r17', name: 'Stairs Forever',
      goal: 'Big stairs! Repeat the step pattern forever.',
      map: ['TTTTTF',
            'TTTT.G',
            'TTTG.T',
            'TT..TT',
            'TG.TTT',
            '>.TTTT'],
      blocks: ['F', 'L', 'R', 'rep', 'ifw', 'forever'], par: 5,
      solution: [rep(0, [F, L, F, R])],
      hint: 'Forward, Left, Forward, Right — inside a forever Repeat.'
    },
    {
      id: 'r18', name: 'Robot Champion',
      goal: 'The biggest maze! Can you solve it with just 4 blocks?',
      map: ['>..G..',
            'TTTTT.',
            '....T.',
            '.TFGTG',
            '.TTTT.',
            '......'],
      blocks: ['F', 'L', 'R', 'rep', 'ifw', 'forever'], par: 4,
      solution: [rep(0, [ifw([R]), F])],
      hint: 'Use the wall trick: Repeat forever, If wall Turn Right, Forward.'
    }
  ];

  // Practice Room mini-challenges: no stars, no failing — just cheers.
  var practice = [
    { id: 'p1', name: 'Two Steps', goal: 'Reach the star 2 steps ahead!',
      map: ['.....', '.>.F.', '.....'], solution: [F, F] },
    { id: 'p2', name: 'Four Steps', goal: 'The star is 4 steps away.',
      map: ['......', '>...F.', '......'], solution: [F, F, F, F] },
    { id: 'p3', name: 'Corner', goal: 'Turn right at the corner!',
      map: ['>.T', 'T.T', 'TFT'], solution: [F, R, F, F] },
    { id: 'p4', name: 'Other Corner', goal: 'Turn left at the corner!',
      map: ['TFT', 'T.T', '>.T'], solution: [F, L, F, F] },
    { id: 'p5', name: 'Gear Path', goal: 'Grab the gears on the way to the star.',
      map: ['......', '>G.G.F', '......'], solution: [F, F, F, F, F] },
    { id: 'p6', name: 'Turn Around', goal: 'The star is behind Robo!',
      map: ['.....', 'F.>..', '.....'], solution: [R, R, F, F] },
    { id: 'p7', name: 'Loop Road', goal: 'Try a Repeat block for this long road.',
      map: ['TTTTTTTT', '>......F', 'TTTTTTTT'], solution: [rep(7, [F])] },
    { id: 'p8', name: 'Square Walk', goal: 'Walk around the pond.',
      map: ['>..', '.~.', 'F..'], solution: [rep(3, [F, F, R])] },
    { id: 'p9', name: 'Little Stairs', goal: 'Climb the stairs with a Repeat.',
      map: ['TTTF', 'TT..', 'T..T', '>.TT'], solution: [rep(3, [F, L, F, R])] },
    { id: 'p10', name: 'Wall Trick', goal: 'Use "If wall" to follow the path.',
      map: ['>..', 'TT.', 'F..'], solution: [rep(6, [ifw([R]), F])] }
  ];

  return { levels: levels, practice: practice };
});
