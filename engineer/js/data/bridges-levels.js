/* Bridges levels.
 * Grid: x = column (0 at the left), y = row (0 at the top). The road is row `deck`.
 * left / right = cliff edge columns (bolts at (left,deck) and (right,deck) are always there).
 * anchors: extra bolts on the cliff faces / pillars. pillars: [{ x, top }] rock columns in the river.
 * noBelow: a boat sails under — no beams below the road. vehicle: 'car' | 'bus' | 'truck'.
 * materials: beams the player may use. Beams are written 'x1,y1-x2,y2' (wood) or 's:x1,y1-x2,y2' (steel).
 * Stars: cost <= budget3 → 3 stars, cost <= budget2 → 2 stars, any working bridge → 1 star.
 * solution: stored 3-star bridge (verified by test/bridges.test.js). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.levels = root.LE.levels || {}; root.LE.levels.bridges = mod.levels; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  /** Road planks from column a to column b on row y. */
  function road(a, b, y, steel) {
    var r = [];
    for (var x = a; x < b; x++) r.push((steel ? 's:' : '') + x + ',' + y + '-' + (x + 1) + ',' + y);
    return r;
  }

  var levels = [
    {
      id: 'b1', name: 'First Beam',
      goal: 'Help the car cross the gap! Build a road.',
      rows: 4, deck: 2, left: 1, right: 2, anchors: [],
      budget3: 1, budget2: 2,
      tip: 'road',
      hint: 'Drag from one bolt to the other bolt.',
      solution: road(1, 2, 2),
      tutorial: [
        { say: 'See the bolts? Drag a beam from bolt to bolt!', drag: ['node:1,2', 'node:2,2'], wait: 'place' },
        { say: 'A road! Now tap Go!', point: 'go', wait: 'run' }
      ]
    },
    {
      id: 'b2', name: 'Prop It Up',
      goal: 'A wider gap! Build the road and hold it up.',
      rows: 5, deck: 2, left: 1, right: 3, anchors: [[1, 3], [3, 3]],
      budget3: 3, budget2: 4,
      tip: 'support',
      hint: 'Build 2 road pieces. Then add a beam from a low bolt up to the middle.',
      solution: road(1, 3, 2).concat(['1,3-2,2']),
      tutorial: [
        { say: 'Drag a road piece from the bolt to the middle dot.', drag: ['node:1,2', 'node:2,2'], wait: 'place' },
        { say: 'Now finish the road to the other side!', drag: ['node:2,2', 'node:3,2'], wait: 'place' },
        { say: 'The middle is wobbly! Add a support from the low bolt.', drag: ['node:1,3', 'node:2,2'], wait: 'place' },
        { say: 'Strong! Tap Go!', point: 'go', wait: 'run' }
      ]
    },
    {
      id: 'b3', name: 'Triangle Power',
      goal: 'No low bolts here! Make a triangle on top.',
      rows: 4, deck: 2, left: 1, right: 3, anchors: [],
      budget3: 5, budget2: 6,
      tip: 'triangle',
      hint: 'Build the road. Then make a roof: bolt, up, down to the other bolt. Add a beam down the middle.',
      solution: road(1, 3, 2).concat(['1,2-2,1', '2,1-3,2', '2,1-2,2']),
      tutorial: [
        { say: 'First the road. Drag to the middle dot!', drag: ['node:1,2', 'node:2,2'], wait: 'place' },
        { say: 'And to the other side!', drag: ['node:2,2', 'node:3,2'], wait: 'place' },
        { say: 'Now go up! Drag from the bolt to the high dot.', drag: ['node:1,2', 'node:2,1'], wait: 'place' },
        { say: 'Come back down to the other bolt. A triangle!', drag: ['node:2,1', 'node:3,2'], wait: 'place' },
        { say: 'Tie the road to the top. Drag down the middle!', drag: ['node:2,1', 'node:2,2'], wait: 'place' },
        { say: 'Two triangles! Tap Go!', point: 'go', wait: 'run' }
      ]
    },
    {
      id: 'b4', name: 'Squishy Square',
      goal: 'This bridge has a square. Squares squish! Fix it.',
      rows: 5, deck: 2, left: 1, right: 3, anchors: [[1, 3], [3, 3]],
      startBeams: road(1, 3, 2).concat(['1,3-2,3', '2,3-2,2']),
      budget3: 5, budget2: 6,
      tip: 'square',
      hint: 'Add one beam across the square, corner to corner.',
      solution: road(1, 3, 2).concat(['1,3-2,3', '2,3-2,2', '1,2-2,3'])
    },
    {
      id: 'b5', name: 'Coin Saver',
      goal: 'Beams cost coins. Use few coins for 3 stars!',
      rows: 5, deck: 2, left: 1, right: 4, anchors: [[1, 3], [4, 3]],
      budget3: 5, budget2: 7,
      tip: 'budget',
      hint: 'Build the road. Then one support from each low bolt.',
      solution: road(1, 4, 2).concat(['1,3-2,2', '4,3-3,2'])
    },
    {
      id: 'b6', name: 'Over the Top',
      goal: 'Only top bolts! Build triangles over the road.',
      rows: 4, deck: 2, left: 1, right: 4, anchors: [],
      budget3: 7, budget2: 9,
      tip: 'truss',
      hint: 'Make one high point. Connect it to both bolts and to the road dots.',
      solution: road(1, 4, 2).concat(['1,2-2,1', '2,1-4,2', '2,1-2,2', '2,1-3,2'])
    },
    {
      id: 'b7', name: 'Rock Pillar',
      goal: 'A rock in the river! Use it to hold the road.',
      rows: 5, deck: 2, left: 1, right: 5, anchors: [[3, 3]], pillars: [{ x: 3, top: 3 }],
      budget3: 7, budget2: 9,
      tip: 'pillar',
      hint: 'Build the road. Then connect the rock bolt to three road dots.',
      solution: road(1, 5, 2).concat(['2,2-3,3', '3,3-4,2', '3,2-3,3'])
    },
    {
      id: 'b8', name: 'Arch Bridge',
      goal: 'The bolts are deep down. Build an arch!',
      rows: 6, deck: 2, left: 1, right: 5, anchors: [[1, 4], [5, 4]],
      budget3: 9, budget2: 11,
      tip: 'arch',
      hint: 'Long beams from the deep bolts. Make a low point under the middle.',
      solution: road(1, 5, 2).concat(['1,4-2,2', '4,2-5,4', '1,4-3,3', '3,3-5,4', '3,2-3,3'])
    },
    {
      id: 'b9', name: 'Big Truck',
      goal: 'A heavy truck! Make a super strong bridge.',
      rows: 6, deck: 2, left: 1, right: 4, anchors: [[1, 3], [4, 3], [1, 4], [4, 4]], vehicle: 'truck',
      budget3: 7, budget2: 9,
      tip: 'heavy',
      hint: 'Use the lowest bolts too. More supports share the load.',
      solution: road(1, 4, 2).concat(['1,3-2,2', '4,3-3,2', '1,4-2,2', '4,4-3,2'])
    },
    {
      id: 'b10', name: 'Steel Power',
      goal: 'Steel beams are extra strong. Try them!',
      rows: 5, deck: 2, left: 1, right: 4, anchors: [[1, 3], [4, 3]], vehicle: 'truck', materials: ['wood', 'steel'],
      budget3: 7, budget2: 9,
      tip: 'steel',
      hint: 'Tap the steel button. Use steel for the two supports.',
      solution: road(1, 4, 2).concat(['s:1,3-2,2', 's:4,3-3,2'])
    },
    {
      id: 'b11', name: 'Balance Act',
      goal: 'One rock in the middle. Keep the bridge balanced!',
      rows: 6, deck: 2, left: 1, right: 5, anchors: [[3, 4]], pillars: [{ x: 3, top: 4 }],
      budget3: 10, budget2: 12,
      tip: 'balance',
      hint: 'Give the rock two legs, like a V. Then add a post in the middle.',
      solution: road(1, 5, 2).concat(['2,2-3,4', '3,4-4,2', '3,3-3,4', '3,2-3,3', '2,2-3,3', '3,3-4,2'])
    },
    {
      id: 'b12', name: 'Cable Towers',
      goal: 'Tall towers! Hang the road from the towers.',
      rows: 4, deck: 2, left: 1, right: 5, anchors: [], towers: [{ x: 1, top: 0 }, { x: 5, top: 0 }], noBelow: true,
      budget3: 8, budget2: 10,
      tip: 'cable',
      hint: 'Pull the road up! Connect tower bolts to the road dots.',
      solution: road(1, 5, 2).concat(['1,1-2,2', '1,1-3,2', '5,1-3,2', '5,1-4,2'])
    },
    {
      id: 'b13', name: 'Boat Below',
      goal: 'A boat sails under! Build up high, not down low.',
      rows: 5, deck: 3, left: 1, right: 5, anchors: [], noBelow: true,
      budget3: 13, budget2: 16,
      tip: 'boat',
      hint: 'Make a box of triangles above the road. Every square needs a diagonal!',
      solution: road(1, 5, 3).concat(['1,3-2,2', '2,2-3,2', '3,2-4,2', '4,2-5,3', '2,2-2,3', '3,2-3,3', '4,2-4,3', '2,2-3,3', '3,3-4,2'])
    },
    {
      id: 'b14', name: 'Two Rocks',
      goal: 'A very long river! Use both rocks.',
      rows: 5, deck: 2, left: 1, right: 7, anchors: [[3, 3], [5, 3]], pillars: [{ x: 3, top: 3 }, { x: 5, top: 3 }],
      budget3: 12, budget2: 14,
      hint: 'Long road first. Then fan out beams from each rock bolt.',
      solution: road(1, 7, 2).concat(['2,2-3,3', '3,2-3,3', '3,3-4,2', '5,2-5,3', '5,3-6,2'])
    },
    {
      id: 'b15', name: 'Bus Ride',
      goal: 'A big bus full of kids! Make it strong.',
      rows: 6, deck: 2, left: 1, right: 5, anchors: [[1, 3], [5, 3], [1, 4], [5, 4]], vehicle: 'bus',
      budget3: 11, budget2: 13,
      hint: 'Two supports on each side. Hang a V under the middle.',
      solution: road(1, 5, 2).concat(['1,3-2,2', '5,3-4,2', '1,4-2,2', '5,4-4,2', '2,2-3,3', '4,2-3,3', '3,3-3,2'])
    },
    {
      id: 'b16', name: 'Truck and Boat',
      goal: 'A truck on top, a boat below. Use steel!',
      rows: 4, deck: 2, left: 1, right: 4, anchors: [], noBelow: true, vehicle: 'truck', materials: ['wood', 'steel'],
      budget3: 13, budget2: 16,
      hint: 'Build a steel roof over the road. Add posts and diagonals.',
      solution: road(1, 4, 2).concat(['s:1,2-2,1', 's:2,1-3,1', 's:3,1-4,2', '2,1-2,2', '3,1-3,2', '2,1-3,2', '2,2-3,1'])
    },
    {
      id: 'b17', name: 'Grand Bridge',
      goal: 'The biggest bridge of all! A truck is coming.',
      rows: 5, deck: 2, left: 1, right: 7, anchors: [[1, 3], [7, 3], [4, 3]], pillars: [{ x: 4, top: 3 }],
      vehicle: 'truck', materials: ['wood', 'steel'],
      budget3: 18, budget2: 22,
      hint: 'Steel supports from the low bolts and the rock. Steel road at the ends.',
      solution: ['s:1,2-2,2'].concat(road(2, 6, 2), ['s:6,2-7,2', 's:1,3-2,2', 's:7,3-6,2', 's:4,3-3,2', 's:4,3-4,2', 's:4,3-5,2'])
    }
  ];

  return { levels: levels };
});
