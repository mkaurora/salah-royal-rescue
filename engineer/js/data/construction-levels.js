/* Construction levels.
 * Stages (see js/logic/construction.js):
 *   doze  — map legend: '.' ground, '#' barrier, 'T' tree, 'o' dirt, 'O' hole, 'r' rock, 'X' dump truck, '> < ^ v' bulldozer.
 *           road: row index of a road (the truck drives along it at the end).
 *   crane — cols: stacks bottom-to-top ('Y3' = yellow, size 3 = big), hook: start column, goals: [{ col, stack }], truck: column with a truck.
 *   build — house: { floors, windows: [per floor], color }, tray: pieces in the tray (flat / thin are decoys).
 * solution: one action list per stage (3-star, verified by test/construction.test.js). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.levels = root.LE.levels || {}; root.LE.levels.construction = mod.levels; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var levels = [
    {
      id: 'k1', name: 'First Push',
      goal: 'Push the dirt into the hole!',
      hint: 'Tap the right arrow one time.',
      tip: 'dozer',
      stages: [{ type: 'doze', map: ['....',
                                     '>oO.',
                                     '....'] }],
      solution: [['R']],
      tutorial: [
        { say: 'This is your bulldozer!', point: 'dozer', ok: true },
        { say: 'Tap the arrow to push the dirt into the hole!', point: 'btn:R', wait: 'fill' }
      ]
    },
    {
      id: 'k2', name: 'Push Again',
      goal: 'The hole is far. Push the dirt all the way!',
      hint: 'Tap the right arrow two times.',
      stages: [{ type: 'doze', map: ['.....',
                                     '>o.O.',
                                     '.....'] }],
      solution: [['R', 'R']],
      tutorial: [
        { say: 'Tap the arrow to push the dirt.', point: 'btn:R', wait: 'push' },
        { say: 'Great! Push one more time!', point: 'btn:R', wait: 'fill' }
      ]
    },
    {
      id: 'k3', name: 'Push Down',
      goal: 'This hole is down below. Push the dirt down!',
      hint: 'Drive right one step. Then tap down.',
      tip: 'arrows',
      stages: [{ type: 'doze', map: ['>...',
                                     '.o..',
                                     '.O..',
                                     '....'] }],
      solution: [['R', 'D']],
      tutorial: [
        { say: 'Drive one step to the right.', point: 'btn:R', wait: 'move' },
        { say: 'Now tap down to push the dirt!', point: 'btn:D', wait: 'fill' }
      ]
    },
    {
      id: 'k4', name: 'Two Holes',
      goal: 'Two holes! Fill them both.',
      hint: 'Fill the top hole first. Then push the other dirt down.',
      tip: 'undo',
      stages: [{ type: 'doze', map: ['.....',
                                     '>o.O.',
                                     '.....',
                                     '..o..',
                                     '..O..'] }],
      solution: [['R', 'R', 'D', 'D']]
    },
    {
      id: 'k5', name: 'First House',
      goal: 'Build a little house!',
      hint: 'Foundation first. Then walls, then the door. Roof last!',
      tip: 'order',
      stages: [{ type: 'build', house: { floors: 1, windows: [0], color: '#ff9f43' }, tray: ['found', 'walls', 'door', 'roof'] }],
      solution: [['found', 'walls', 'door', 'roof']],
      tutorial: [
        { say: 'Drag the foundation onto the plot!', drag: ['tray:found', 'slot:found'], wait: 'place' },
        { say: 'Now drag the walls on top!', drag: ['tray:walls', 'slot:walls'], wait: 'place' },
        { say: 'Now finish the house. The roof goes on last!', ok: true }
      ]
    },
    {
      id: 'k6', name: 'Windows',
      goal: 'This house needs two windows!',
      hint: 'Windows go in the walls. Put the roof on last.',
      stages: [{ type: 'build', house: { floors: 1, windows: [2], color: '#5ec4ff' }, tray: ['found', 'walls', 'window', 'door', 'roof'] }],
      solution: [['found', 'walls', 'window', 'window', 'door', 'roof']]
    },
    {
      id: 'k7', name: 'Rocky Plot',
      goal: 'Push the rock into the truck. Fill the hole!',
      hint: 'Get behind the rock and push it right, into the truck.',
      tip: 'rock',
      stages: [{ type: 'doze', map: ['>.....',
                                     '.r..X.',
                                     '......',
                                     '..o...',
                                     '..O..T'] }],
      solution: [['D', 'R', 'R', 'R', 'D', 'L', 'D']]
    },
    {
      id: 'k8', name: 'Strong Roof',
      goal: 'Build the house with a strong roof!',
      hint: 'Pick the triangle roof. Triangles are strong!',
      tip: 'triangle',
      stages: [{ type: 'build', house: { floors: 1, windows: [2], color: '#ff7eb6' }, tray: ['found', 'walls', 'window', 'door', 'flat', 'roof'] }],
      solution: [['found', 'walls', 'door', 'window', 'window', 'roof']]
    },
    {
      id: 'k9', name: 'Crane Lift',
      goal: 'Lift the steel beam onto the X!',
      hint: 'Grab the beam, move right three times, then drop it.',
      tip: 'crane',
      stages: [{ type: 'crane', cols: [['S3'], [], [], []], hook: 0, truck: 0, goals: [{ col: 3, stack: ['S3'] }] }],
      solution: [['G', 'R', 'R', 'R', 'G']],
      tutorial: [
        { say: 'Tap the hook button to grab the beam!', point: 'btn:G', wait: 'grab' },
        { say: 'Move it to the X. Tap right three times!', point: 'btn:R', wait: 'hook', times: 3 },
        { say: 'Tap the hook button to drop it!', point: 'btn:G', wait: 'drop' }
      ]
    },
    {
      id: 'k10', name: 'Stack It',
      goal: 'Stack both blocks on the X!',
      hint: 'Put the big yellow block down first. The red one goes on top.',
      stages: [{ type: 'crane', cols: [['Y3'], ['R2'], [], []], hook: 0, goals: [{ col: 3, stack: ['Y3', 'R2'] }] }],
      solution: [['G', 'R', 'R', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G']]
    },
    {
      id: 'k11', name: 'Big at Bottom',
      goal: 'Build the tower on the X. Big block at the bottom!',
      hint: 'Move the red block out of the way first.',
      tip: 'bigbottom',
      stages: [{ type: 'crane', cols: [['Y3', 'R2'], [], []], hook: 0, truck: 0, goals: [{ col: 2, stack: ['Y3', 'R2'] }] }],
      solution: [['G', 'R', 'G', 'L', 'G', 'R', 'R', 'G', 'L', 'G', 'R', 'G']]
    },
    {
      id: 'k12', name: 'Bumpy Road',
      goal: 'Fill the holes in the road so the truck can drive!',
      hint: 'Push each dirt pile down into a hole.',
      tip: 'road',
      stages: [{ type: 'doze', road: 2, map: ['>.....',
                                              '.o..o.',
                                              '.O..O.',
                                              '......'] }],
      solution: [['R', 'D', 'U', 'R', 'R', 'R', 'D']]
    },
    {
      id: 'k13', name: 'Tall House',
      goal: 'Build a tall house with two floors!',
      hint: 'A tall house needs the wide foundation.',
      tip: 'foundation',
      stages: [{ type: 'build', house: { floors: 2, windows: [1, 2], color: '#7ed957' }, tray: ['thin', 'found', 'walls', 'window', 'door', 'roof'] }],
      solution: [['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'roof']]
    },
    {
      id: 'k14', name: 'Clear the Road',
      goal: 'Clear the road! Dirt in the hole, rock in the truck.',
      hint: 'Nothing can stay on the road. Push the rock up into the truck.',
      stages: [{ type: 'doze', road: 2, map: ['T.X...',
                                              '......',
                                              '.or.oO',
                                              '>.....'] }],
      solution: [['R', 'U', 'D', 'R', 'U', 'U', 'D', 'R', 'R']]
    },
    {
      id: 'k15', name: 'Tower Time',
      goal: 'Build a tower of three blocks on the X!',
      hint: 'Biggest at the bottom, smallest on top.',
      stages: [{ type: 'crane', cols: [['Y3'], ['R2'], [], ['B1']], hook: 0, goals: [{ col: 2, stack: ['Y3', 'R2', 'B1'] }] }],
      solution: [['G', 'R', 'R', 'G', 'L', 'G', 'R', 'G', 'R', 'G', 'L', 'G']]
    },
    {
      id: 'k16', name: 'Dig & Build',
      goal: 'First make the ground flat. Then build a house!',
      hint: 'Fill both holes with the bulldozer. Then build from the bottom up.',
      tip: 'stages',
      stages: [
        { type: 'doze', map: ['>o.O',
                                                               '....',
                                                               '.o..',
                                                               '.O..'] },
        { type: 'build', house: { floors: 1, windows: [1], color: '#b78bff' }, tray: ['found', 'walls', 'window', 'door', 'roof'] }
      ],
      solution: [['R', 'R', 'L', 'D', 'D'], ['found', 'walls', 'window', 'door', 'roof']]
    },
    {
      id: 'k17', name: 'Lift & Build',
      goal: 'Lift the bricks to the plot. Then build!',
      hint: 'Move the little box off the X first. Then lift the bricks.',
      stages: [
        { type: 'crane', cols: [['P3'], [], [], ['G1']], hook: 0, truck: 0, goals: [{ col: 3, stack: ['P3'] }] },
        { type: 'build', house: { floors: 1, windows: [2], color: '#ffd166' }, tray: ['found', 'walls', 'window', 'door', 'flat', 'roof'] }
      ],
      solution: [['R', 'R', 'R', 'G', 'L', 'G', 'L', 'L', 'G', 'R', 'R', 'R', 'G'], ['found', 'walls', 'door', 'window', 'window', 'roof']]
    },
    {
      id: 'k18', name: 'Dream House',
      goal: 'Clear the plot, lift the bricks and build a big house!',
      hint: 'Bulldozer first, then the crane, then build from the bottom up.',
      stages: [
        { type: 'doze', map: ['.....',
                                                              '>o.O.',
                                                              '.r...',
                                                              '....X'] },
        { type: 'crane', cols: [['P3'], [], []], hook: 0, truck: 0, goals: [{ col: 2, stack: ['P3'] }] },
        { type: 'build', house: { floors: 2, windows: [2, 2], color: '#ff6b6b' }, tray: ['found', 'walls', 'window', 'door', 'flat', 'roof'] }
      ],
      solution: [['R', 'R', 'L', 'D', 'L', 'D', 'R', 'R', 'R'], ['G', 'R', 'R', 'G'], ['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'window', 'roof']]
    }
  ];

  return { levels: levels };
});
