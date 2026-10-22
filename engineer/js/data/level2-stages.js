/* Level 2 (v4) stages: 3 tracks × 12 stages (Bronze / Silver / Gold tiers of 4), lessons, facts.
 * Every stage is a normal level object for its view (stage.view): 'bridges' (js/views/bridges-view.js),
 * 'frame' (js/views/l2-frame-view.js), 'code' (js/views/l2-code-view.js), 'lab' (js/views/l2-lab-view.js) or
 * 'circuits' (js/views/circuits-view.js), plus Level 2 fields:
 *   timeLimit: seconds for the relaxed timer (only the 3rd star; never fails; parents can turn timers off)
 *   easy: overrides for the "easier version" offered after many tries (counts for at most 2 stars)
 *   bonus: overrides for the optional "Try the bonus!" super challenge (offered after a quick 3-star win)
 *   topic: Science Lab topic (its lesson plays before the topic's first stage)
 * Stored solutions are verified through the real logic by test/level2.test.js (3 stars). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.level2 = root.LE.level2 || {}; root.LE.level2.data = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function road(a, b, y, steel) { var r = []; for (var x = a; x < b; x++) r.push((steel ? 's:' : '') + x + ',' + y + '-' + (x + 1) + ',' + y); return r; }
  var F = { t: 'F' }, L = { t: 'L' }, R = { t: 'R' }, M = { t: 'M' };
  function rep(n, body) { return { t: 'rep', n: n, body: body }; }
  function iff(c, body, alt) { return { t: 'if', c: c, body: body, alt: alt || [] }; }
  function C(t, x, y, r) { return { t: t, x: x, y: y, r: r || 0 }; }

  /* ===================== Track A — Engineer Challenges ===================== */
  var A = [
    { id: 'a1', view: 'bridges', name: 'Heavy Truck',
      goal: 'A heavy truck! Build a bridge that holds it, and watch your coins.',
      rows: 5, deck: 2, left: 1, right: 4, anchors: [[1, 3], [4, 3]], vehicle: 'truck', materials: ['wood', 'steel'],
      budget3: 7, budget2: 9, tip: 'l2budget',
      hint: 'Wood road. Then two steel props from the low bolts.',
      solution: road(1, 4, 2).concat(['s:1,3-2,2', 's:4,3-3,2']),
      easy: { vehicle: 'bus', budget3: 10, budget2: 13 },
      tutorial: [
        { say: 'Level 2! This truck is very heavy. Fewer coins means more stars!', point: 'coins', ok: true },
        { say: 'Build the road first. Drag from bolt to dot!', drag: ['node:1,2', 'node:2,2'], wait: 'place' },
        { say: 'Keep going to the next dot.', drag: ['node:2,2', 'node:3,2'], wait: 'place' },
        { say: 'One more piece to the other side!', drag: ['node:3,2', 'node:4,2'], wait: 'place' },
        { say: 'Wood props are too weak for this truck. Tap Steel!', point: 'tool:steel', wait: 'tool' },
        { say: 'Prop up the road with steel from the low bolt.', drag: ['node:1,3', 'node:2,2'], wait: 'place' },
        { say: 'And one from the other low bolt.', drag: ['node:4,3', 'node:3,2'], wait: 'place' },
        { say: 'Now the end test. Tap Go!', point: 'go', wait: 'run' }
      ] },
    { id: 'a2', view: 'frame', name: 'Windy House',
      goal: 'Build a house up to all the gold stars. It must survive the wind test!',
      cols: 4, ground: 4, top: 2, bolts: [1, 3], targets: [[1, 3], [3, 3], [2, 2]], test: 'wind', wind: 1, materials: ['wood'],
      budget3: 8, budget2: 10, tip: 'l2wind',
      hint: 'Two walls, a top beam, a roof, and two triangle braces from the bolts.',
      solution: ['1,4-1,3', '3,4-3,3', '1,3-2,3', '2,3-3,3', '1,3-2,2', '2,2-3,3', '1,4-2,3', '3,4-2,3'],
      easy: { wind: 0.6, budget3: 11, budget2: 14 },
      bonus: { wind: 1.6, materials: ['wood', 'steel'], budget3: 9, budget2: 11, goal: 'Bonus! A super storm. Use one steel beam in the right place!',
        hint: 'The same house. Make the brace that works hardest out of steel.',
        solution: ['1,3-1,4', '1,4-2,3', 's:2,3-3,4', '3,3-3,4', '1,3-2,3', '1,3-2,2', '2,2-3,3', '2,3-3,3'] },
      tutorial: [
        { say: 'A house must stand up to strong wind! Build up to every gold star.', point: 'node:2,2', ok: true },
        { say: 'Build a wall. Drag up from the bolt!', drag: ['node:1,4', 'node:1,3'], wait: 'place' },
        { say: 'Now the other wall.', drag: ['node:3,4', 'node:3,3'], wait: 'place' },
        { say: 'Join the walls across the top.', drag: ['node:1,3', 'node:2,3'], wait: 'place' },
        { say: 'And on to the other wall.', drag: ['node:2,3', 'node:3,3'], wait: 'place' },
        { say: 'Now the roof! Up to the star.', drag: ['node:1,3', 'node:2,2'], wait: 'place' },
        { say: 'And down the other side.', drag: ['node:2,2', 'node:3,3'], wait: 'place' },
        { say: 'Squares wobble in the wind. Add a triangle brace!', drag: ['node:1,4', 'node:2,3'], wait: 'place' },
        { say: 'One more brace from the other bolt.', drag: ['node:3,4', 'node:2,3'], wait: 'place' },
        { say: 'Ready for the wind test? Tap Test!', point: 'go', wait: 'run' }
      ] },
    { id: 'a3', view: 'bridges', name: 'Fire Truck',
      goal: 'The fire truck is the heaviest of all! Get it across.',
      rows: 5, deck: 2, left: 1, right: 4, anchors: [[1, 3], [4, 3]], vehicle: 'firetruck', materials: ['wood', 'steel'],
      budget3: 10, budget2: 13,
      hint: 'Steel props are not enough. Add a little triangle under the road near the right side.',
      solution: ['s:1,3-2,2', '2,2-3,3', '3,2-3,3', 's:3,2-4,3', '3,3-4,3', '1,2-2,2', '2,2-3,2', '3,2-4,2'],
      easy: { vehicle: 'truck', budget3: 13, budget2: 16 } },
    { id: 'a4', view: 'frame', name: 'Shaky Tower',
      goal: 'A two floor tower. Will it survive the earthquake?',
      cols: 3, ground: 4, top: 2, bolts: [1, 2], targets: [[1, 2], [2, 2]], test: 'quake', quake: 0.25, materials: ['wood'],
      budget3: 8, budget2: 10, tip: 'l2quake',
      hint: 'Every floor needs a triangle brace. Squares fall down when they shake.',
      solution: ['1,3-1,4', '1,3-2,4', '1,4-2,3', '2,3-2,4', '1,2-1,3', '1,2-2,3', '1,3-2,2', '2,2-2,3'],
      easy: { quake: 0.15, budget3: 11, budget2: 14 },
      bonus: { quake: 0.45, materials: ['wood', 'steel'], budget3: 9, budget2: 11, goal: 'Bonus! A huge earthquake. One steel beam can save it!',
        hint: 'Find the beam at the bottom that squishes the most, and make it steel.',
        solution: ['1,3-1,4', '1,3-2,4', '1,4-2,3', 's:2,3-2,4', '1,2-1,3', '1,2-2,3', '2,2-2,3', '1,2-2,2'] } },

    { id: 'a5', view: 'frame', name: 'Crane Arm',
      goal: 'Build a crane that reaches the star and lifts the box!',
      cols: 5, ground: 5, top: 1, roof: 0, bolts: [1, 2], targets: [[4, 2]], hook: [4, 2], box: 0.3, boxLabel: '1 t', test: 'lift',
      materials: ['wood', 'steel'], budget3: 13, budget2: 16, timeLimit: 180, tip: 'l2crane',
      hint: 'A strong tower with braces, then an arm made of triangles. The bottom of the tower works hardest.',
      solution: ['1,5-1,4', '1,5-2,4', 's:2,5-2,4', '1,4-2,4', '1,4-2,3', '2,4-2,3', '2,4-3,3', '2,3-3,3', '2,3-3,2', '3,3-4,2', '3,2-3,3', '3,2-4,2'],
      easy: { box: 0.18, budget3: 16, budget2: 19 } },
    { id: 'a6', view: 'frame', name: 'Storm House',
      goal: 'A two floor house in a big storm. Brace it and keep the coins low!',
      cols: 4, ground: 5, top: 2, bolts: [1, 3], targets: [[1, 3], [3, 3], [2, 2]], test: 'wind', wind: 1, materials: ['wood', 'steel'],
      budget3: 15, budget2: 18, timeLimit: 180,
      hint: 'Triangles on both floors. Use steel only where the wind pushes hardest, low on the right.',
      solution: ['1,4-1,5', '1,5-2,4', 's:2,4-3,5', 's:3,4-3,5', '1,3-1,4', '1,3-2,4', '1,4-2,4', '2,4-3,4', '2,4-3,3', 's:3,3-3,4', '1,3-2,2', '2,2-3,3'],
      easy: { wind: 0.6, budget3: 18, budget2: 21 } },
    { id: 'a7', view: 'bridges', name: 'Bus Viaduct',
      goal: 'A long bridge over two rocks for the bus. Use the rocks well!',
      rows: 5, deck: 2, left: 1, right: 6, anchors: [[1, 3], [6, 3], [3, 3], [4, 3]], pillars: [{ x: 3, top: 3 }, { x: 4, top: 3 }], vehicle: 'bus',
      materials: ['wood', 'steel'], budget3: 12, budget2: 15, timeLimit: 180,
      hint: 'Stand the road on the rock bolts. The right side needs a triangle above the road.',
      solution: ['s:1,3-2,2', '3,2-3,3', '4,2-4,3', '5,1-6,3', '1,2-2,2', '2,2-3,2', '3,2-4,2', '4,2-5,1', '4,2-5,2', '5,1-5,2', '5,2-6,2'],
      easy: { vehicle: 'car', budget3: 15, budget2: 18 } },
    { id: 'a8', view: 'frame', name: 'Quake School',
      goal: 'A wide school with four bolts. Make it earthquake strong!',
      cols: 5, ground: 4, top: 2, bolts: [1, 2, 3, 4], targets: [[1, 2], [4, 2]], test: 'quake', quake: 0.25, materials: ['wood', 'steel'],
      budget3: 12, budget2: 15, timeLimit: 180,
      hint: 'You do not need every square. Make a chain of triangles that reaches both stars.',
      solution: ['1,3-1,4', '1,3-2,4', '2,3-2,4', '2,3-3,4', '2,4-3,3', '3,3-4,4', '3,4-4,3', '4,3-4,4', '1,2-1,3', '1,2-2,3', '3,3-4,2', '4,2-4,3'],
      easy: { quake: 0.15, budget3: 15, budget2: 18 } },

    { id: 'a9', view: 'bridges', name: 'Fire Rescue',
      goal: 'The fire truck must cross a wide river with one rock. Hurry!',
      rows: 5, deck: 2, left: 1, right: 5, anchors: [[1, 3], [5, 3], [3, 3]], pillars: [{ x: 3, top: 3 }], vehicle: 'firetruck',
      materials: ['wood', 'steel'], budget3: 15, budget2: 18, timeLimit: 240,
      hint: 'Steel props from the bolts. Put small triangles under the road on the right side.',
      solution: ['s:1,3-2,2', 's:2,2-3,3', 's:3,2-3,3', '3,2-4,3', '4,2-4,3', 's:4,2-5,3', '4,3-5,2', '1,2-2,2', '2,2-3,2', '3,2-4,2', '4,2-5,2'],
      easy: { vehicle: 'truck', budget3: 18, budget2: 21 } },
    { id: 'a10', view: 'frame', name: 'Big Crane',
      goal: 'A big crane with three bolts. Reach far out and lift the heavy box!',
      cols: 6, ground: 5, top: 1, roof: 0, bolts: [1, 2, 3], targets: [[5, 2]], hook: [5, 2], box: 0.4, boxLabel: '2 t', test: 'lift',
      materials: ['wood', 'steel'], budget3: 20, budget2: 24, timeLimit: 240,
      hint: 'Lean the tower toward the box and fill it with triangles. Every square needs a brace.',
      solution: ['1,4-1,5', '1,5-2,4', '2,4-2,5', '3,4-3,5', '3,5-4,4', '1,4-2,4', '1,4-2,3', '2,3-3,4', '2,4-3,4', '3,3-4,4', '3,4-4,4', '3,4-4,3', '4,3-4,4', '2,3-3,2', '3,2-4,3', '3,3-4,3', '3,3-4,2', '4,3-5,2', '3,2-4,2', '4,2-5,2'],
      easy: { box: 0.25, budget3: 23, budget2: 27 } },
    { id: 'a11', view: 'frame', name: 'Hurricane Tower',
      goal: 'A three floor tower in a hurricane! Strong and cheap.',
      cols: 4, ground: 5, top: 2, bolts: [1, 3], targets: [[1, 2], [3, 2]], test: 'wind', wind: 0.7, materials: ['wood', 'steel'],
      budget3: 15, budget2: 18, timeLimit: 240,
      hint: 'Triangles all the way up. One steel beam at the bottom right takes the big push.',
      solution: ['1,5-2,4', '2,4-3,5', 's:3,4-3,5', '1,3-2,4', '2,3-3,4', '2,4-3,4', '2,4-3,3', '3,3-3,4', '1,2-1,3', '1,2-2,3', '1,3-2,3', '2,3-3,3', '2,3-3,2', '3,2-3,3'],
      easy: { wind: 0.4, budget3: 18, budget2: 21 } },
    { id: 'a12', view: 'frame', name: 'Super Tower',
      goal: 'The final test! A three floor tower in a giant earthquake.',
      cols: 4, ground: 5, top: 2, bolts: [1, 2, 3], targets: [[1, 2], [3, 2]], test: 'quake', quake: 0.3, materials: ['wood', 'steel'],
      budget3: 17, budget2: 21, timeLimit: 240,
      hint: 'Use all three bolts. Triangles on every floor, and one steel beam low on the right.',
      solution: ['1,4-1,5', '1,5-2,4', '2,5-3,4', 's:3,4-3,5', '1,4-2,4', '1,4-2,3', '2,3-2,4', '2,3-3,4', '3,3-3,4', '1,2-2,3', '2,2-2,3', '2,2-3,3', '2,3-3,3', '3,2-3,3', '1,2-2,2', '2,2-3,2'],
      easy: { quake: 0.18, budget3: 20, budget2: 24 } }
  ];

  /* ===================== Track B — Thinking Puzzles ===================== */
  var B = [
    { id: 'b1', view: 'code', name: 'Plan Ahead',
      goal: 'Plan the whole path first. Robo only moves when you press Run!',
      map: ['#####', '#.g.#', '###g#', '#F..#', '#####'], start: [1, 1, 1], blocks: ['F', 'L', 'R'], par: 8, tip: 'l2plan',
      hint: 'Two Forward, Right, two Forward, Right, two Forward.',
      solution: { main: [F, F, R, F, F, R, F, F] },
      easy: { startProgram: { main: [F, F, R] } },
      tutorial: [
        { say: 'Plan the whole path, then Run. Count the squares to the flag!', point: 'cell:1,3', ok: true },
        { say: 'Tap Forward two times.', point: 'tray:F', wait: 'add', times: 2 },
        { say: 'Robo must turn. Tap Right!', point: 'tray:R', wait: 'add' },
        { say: 'Now plan the rest: Forward, Forward, Right, Forward, Forward.', point: 'tray:F', wait: 'add', times: 5 },
        { say: 'Your plan is ready. Tap Run!', point: 'go', wait: 'run' }
      ] },
    { id: 'b2', view: 'code', name: 'Loop Stairs',
      goal: 'Climb the stairs and grab every gear. Use a loop with the right count!',
      map: ['#######', '#####F#', '####g.#', '###g.##', '##g.###', '#..####', '#######'], start: [1, 5, 1], blocks: ['F', 'L', 'R', 'rep'], par: 5,
      hint: 'One stair is Forward, Left, Forward, Right. How many stairs are there?',
      solution: { main: [rep(4, [F, L, F, R])] },
      easy: { startProgram: { main: [rep(2, [F, L])] } } },
    { id: 'b3', view: 'code', name: 'Key and Door',
      goal: 'The door is locked! Get the key first, then go to the flag.',
      map: ['########', '#K..gDF#', '########'], start: [3, 1, 3], blocks: ['F', 'L', 'R', 'rep'], par: 6, tip: 'l2key',
      hint: 'Walk to the key. Two Rights turn Robo around. Then a loop of Forward.',
      solution: { main: [F, F, R, R, rep(5, [F])] },
      easy: { startProgram: { main: [F, F] } } },
    { id: 'b4', view: 'code', name: 'Bug Fix',
      goal: 'This program has a bug! Run it, then fix just one block.',
      map: ['######', '#..###', '##g.##', '###g.#', '####F#', '######'], start: [1, 1, 1], blocks: ['F', 'L', 'R', 'rep'], par: 5, tip: 'l2bug',
      startProgram: { main: [rep(3, [F, R, F, R])] },
      hint: 'Robo turns Right two times. The second turn should be Left.',
      solution: { main: [rep(3, [F, R, F, L])] } },

    { id: 'b5', view: 'code', name: 'My Move',
      goal: 'Teach Robo a move once, then use it again and again!',
      map: ['#####', '#..g#', '###.#', '#F.g#', '#####'], start: [1, 1, 1], fn: true, blocks: ['F', 'L', 'R', 'M'], par: 6, tip: 'l2fn',
      hint: 'My move is Forward, Forward, Right. Use My move three times.',
      solution: { main: [M, M, M], fn: [F, F, R] },
      easy: { startProgram: { main: [], fn: [F, F, R] } },
      tutorial: [
        { say: 'Meet My move! You build it once, and use it many times.', point: 'slot:f', ok: true },
        { say: 'Put Forward, Forward, Right into My move.', point: 'tray:F', wait: 'add', times: 3 },
        { say: 'Now tap the main program.', point: 'slot:m', wait: 'target' },
        { say: 'Use My move three times!', point: 'tray:M', wait: 'add', times: 3 },
        { say: 'Tap Run!', point: 'go', wait: 'run' }
      ] },
    { id: 'b6', view: 'code', name: 'Belt Ride',
      goal: 'Conveyor belts carry Robo! Plan where the belt will drop him.',
      map: ['#######', '#..>>v#', '#####v#', '#####g#', '#F.g..#', '#######'], start: [1, 1, 1], blocks: ['F', 'L', 'R', 'rep'], par: 7, tip: 'l2belt',
      hint: 'Two Forward puts Robo on the belt. It takes him down to the gear. Then turn and walk home.',
      solution: { main: [F, F, R, F, R, rep(4, [F])] },
      easy: { startProgram: { main: [F, F] } } },
    { id: 'b7', view: 'code', name: 'If or Else',
      goal: 'Use If and Else: if a wall is ahead, turn. Else, go forward!',
      map: ['#######', '#..g..#', '#####.#', '#..F#.#', '#.###g#', '#.g...#', '#######'], start: [1, 1, 1],
      blocks: ['F', 'L', 'R', 'rep', 'if', 'forever'], conds: ['wall'], par: 4, tip: 'l2else',
      hint: 'Repeat forever: If wall, Right. Else, Forward.',
      solution: { main: [rep(0, [iff('wall', [R], [F])])] },
      easy: { startProgram: { main: [rep(0, [iff('wall', [], [])])] } } },
    { id: 'b8', view: 'code', name: 'Move Bug',
      goal: 'My move has a bug! Find the wrong block and fix it.',
      map: ['########', '###F####', '###.g###', '####.###', '###g.###', '#...####', '########'], start: [1, 5, 1], fn: true,
      blocks: ['F', 'L', 'R', 'M', 'rep'], par: 9,
      startProgram: { main: [M, L, M], fn: [F, F, R, F, R, F] },
      hint: 'Watch the first My move. Robo must turn Left to go up the hill.',
      solution: { main: [M, L, M], fn: [F, F, L, F, R, F] } },

    { id: 'b9', view: 'code', name: 'Colour Code',
      goal: 'Red tiles mean turn right. Blue tiles mean turn left. Code it with If!',
      map: ['########', '#.g.r###', '####g###', '####br##', '#####.##', '##Fg.r##', '########'], start: [1, 1, 1],
      blocks: ['F', 'L', 'R', 'rep', 'if', 'forever'], conds: ['red', 'blue'], par: 6, tip: 'l2colour',
      hint: 'Repeat forever: If red, Right. If blue, Left. Then Forward.',
      solution: { main: [rep(0, [iff('red', [R]), iff('blue', [L]), F])] },
      easy: { startProgram: { main: [rep(0, [iff('red', [R]), F])] } } },
    { id: 'b10', view: 'code', name: 'Gear Hunt',
      goal: 'Three gears hide in little rooms. Make a move that grabs one and comes back!',
      map: ['#########', '##g##gg##', '#......F#', '#########'], start: [1, 2, 1], fn: true, blocks: ['F', 'L', 'R', 'M', 'rep'], par: 14,
      hint: 'My move: Left, Forward, then turn around, Forward, and Left again.',
      solution: { main: [F, M, rep(3, [F]), M, F, M, F], fn: [L, F, R, R, F, L] },
      easy: { startProgram: { main: [], fn: [L, F, R, R, F, L] } } },
    { id: 'b11', view: 'code', name: 'Keys and Belts',
      goal: 'Ride the belt to the key, then open the door. Plan it all!',
      map: ['#########', '#.....DF#', '#.###g###', '#>>>K.###', '#########'], start: [1, 1, 2], blocks: ['F', 'L', 'R', 'rep'], par: 10,
      hint: 'Two Forward. The belt takes Robo to the key. Turn Left, go up past the gear, and turn Right to the door.',
      solution: { main: [F, F, L, F, L, F, F, R, F, F] },
      easy: { startProgram: { main: [F, F, L] } } },
    { id: 'b12', view: 'code', name: 'Master Plan',
      goal: 'The master puzzle! Put an If inside My move, and loop it forever.',
      map: ['#########', '#.K.r####', '####g#rF#', '####.#D##', '####bgb##', '#########'], start: [1, 1, 1], fn: true,
      blocks: ['F', 'L', 'R', 'M', 'rep', 'if', 'forever'], conds: ['wall', 'red', 'blue'], par: 7,
      hint: 'My move: If red, Right. Else: If blue, Left. Then Forward. Main: Repeat forever My move.',
      solution: { main: [rep(0, [M])], fn: [iff('red', [R], [iff('blue', [L])]), F] },
      easy: { startProgram: { main: [rep(0, [M])], fn: [iff('red', [R], []), F] } } }
  ];

  /* ===================== Track C — Science Lab ===================== */
  var Cs = [
    { id: 'c1', view: 'lab', mode: 'quiz', topic: 'gears', name: 'Gear Check',
      goal: 'Gear quiz! Tap the right answer.',
      hint: 'Touching gears turn opposite ways. Small gears spin faster.',
      questions: [
        { q: 'The big gear turns this way. Which way does the small gear turn?', pic: 'gears-pair', answers: [{ label: 'The other way', pic: 'arrow-ccw' }, { label: 'The same way', pic: 'arrow-cw' }], right: 0,
          why: 'Touching gears always turn opposite ways.' },
        { q: 'Which gear spins faster?', pic: 'gears-pair', answers: [{ label: 'The big gear', pic: 'gear-big' }, { label: 'The small gear', pic: 'gear-small' }], right: 1,
          why: 'The small gear has fewer teeth, so it spins faster.' }
      ],
      solution: { answers: [0, 1] } },
    { id: 'c2', view: 'lab', mode: 'gears', topic: 'gears', name: 'Fan Spin',
      goal: 'Make the fan turn the same way as the motor, and fast!',
      slots: 4, tray: ['S', 'B'], goalSpec: { dir: 1, speed: 'fast' }, par: 2,
      hint: 'One gear turns the fan the wrong way. Use two, and make the last one small.',
      solution: { slots: ['B', 'S'] },
      tutorial: [
        { say: 'Tap an empty spot to put a gear there. Tap again to change it.', point: 'slot:0', wait: 'set' },
        { say: 'The fan sits on the last gear. Look at the arrow it needs!', point: 'goal', ok: true },
        { say: 'Try it! Tap Go to test your gears.', point: 'go', wait: 'run' }
      ] },
    { id: 'c3', view: 'lab', mode: 'quiz', topic: 'levers', name: 'Lever Check',
      goal: 'Lever quiz! Tap the right answer.',
      hint: 'Put the fulcrum close to the heavy thing.',
      questions: [
        { q: 'Where should the fulcrum go to lift the heavy rock with a small push?', pic: 'lever-q', answers: [{ label: 'Near the rock', pic: 'lever-near' }, { label: 'Near the robot', pic: 'lever-far' }], right: 0,
          why: 'Close to the rock, a small push lifts a big load.' },
        { q: 'Which one is a lever?', pic: 'lever-types', answers: [{ label: 'A ball', pic: 'ball' }, { label: 'A see-saw', pic: 'seesaw' }], right: 1,
          why: 'A see-saw is a bar on a fulcrum. That is a lever!' }
      ],
      solution: { answers: [0, 1] } },
    { id: 'c4', view: 'lab', mode: 'lever', topic: 'levers', name: 'Lift the Rock',
      goal: 'Robo can only push a little. Move the fulcrum so he can lift the rock!',
      spots: [-3, -2, -1, 0, 1, 2, 3], load: -4, weight: 3, effort: 4, push: 1, height: 2, f0: 0,
      hint: 'Slide the fulcrum very close to the rock.',
      solution: { f: -3, weights: [] },
      tutorial: [
        { say: 'This triangle is the fulcrum. Tap a spot to move it!', point: 'spot:0', ok: true },
        { say: 'Move it closer to the heavy rock.', point: 'spot:-2', wait: 'move' },
        { say: 'Now tap Go and let Robo push!', point: 'go', wait: 'run' }
      ] },

    { id: 'c5', view: 'lab', mode: 'quiz', topic: 'ramps', name: 'Ramp Check',
      goal: 'Ramp quiz! Tap the right answer.',
      hint: 'Gentle ramps are easy to push up. Slippery floors let things roll far.',
      questions: [
        { q: 'Which ramp is easier to push the box up?', pic: 'ramp-q', answers: [{ label: 'The steep ramp', pic: 'ramp-steep' }, { label: 'The gentle ramp', pic: 'ramp-gentle' }], right: 1,
          why: 'A gentle ramp is longer, but each push is easier.' },
        { q: 'Where does the ball roll the farthest?', pic: 'roll-q', answers: [{ label: 'On ice', pic: 'floor-ice' }, { label: 'On carpet', pic: 'floor-carpet' }], right: 0,
          why: 'Ice is slippery. Carpet has more friction, so the ball stops sooner.' }
      ],
      solution: { answers: [1, 0] } },
    { id: 'c6', view: 'lab', mode: 'ramp', topic: 'ramps', name: 'Ramp Push',
      goal: 'Push the heavy box into the truck! Pick the ramp length and the floor.',
      weight: 4, height: 2, strength: 2.5, space: 5, lens: [2, 3, 4, 5], surfaces: ['carpet', 'wood', 'ice'], par: 4, par2: 5, len0: 2, surface0: 'carpet',
      hint: 'Long ramps are easier. Slippery floors are easier too. The shortest ramp that works gets 3 stars.',
      solution: { len: 4, surface: 'ice' },
      easy: { strength: 3.5 } },
    { id: 'c7', view: 'lab', mode: 'quiz', topic: 'circuits', name: 'Circuit Check',
      goal: 'Circuit quiz! Tap the right answer.',
      hint: 'Electricity needs a closed loop. Bulbs in a row share the power.',
      questions: [
        { q: 'Will this bulb light up?', pic: 'circuit-open', answers: [{ label: 'Yes', pic: 'bulb-on' }, { label: 'No, the loop is open', pic: 'bulb-off' }], right: 1,
          why: 'There is a gap in the loop, so the electricity cannot flow.' },
        { q: 'Two bulbs in one row. How do they glow?', pic: 'circuit-series', answers: [{ label: 'Dim', pic: 'bulb-dim' }, { label: 'Extra bright', pic: 'bulb-on' }], right: 0,
          why: 'In a row, the bulbs share the power, so they glow dim.' }
      ],
      solution: { answers: [1, 0] } },
    { id: 'c8', view: 'circuits', topic: 'circuits', name: 'Two Bright Homes',
      goal: 'Make BOTH houses bright! Give each house its own path.',
      need: 'bright',
      map: ['C1 I1 T0 I1 C2',
            'B0 ## H0 ## H0',
            'C0 .. .. .. ..'],
      tray: { I: 2, T: 1, C: 1 }, par: 4,
      hint: 'Under the middle house, use the T wire to split the path in two. A corner goes under the last house.',
      solution: { placed: [C('I', 1, 2, 1), C('T', 2, 2, 2), C('I', 3, 2, 1), C('C', 4, 2, 3)], rots: {}, sw: {} },
      winNote: 'Each house has its own path. That is a parallel circuit!' },

    { id: 'c9', view: 'lab', mode: 'gears', topic: 'gears', name: 'Super Speed',
      goal: 'Make the fan turn the other way, and SUPER fast! Try the double gear.',
      slots: 4, tray: ['S', 'B', 'D'], goalSpec: { dir: -1, speed: 'super' }, par: 3,
      hint: 'A double gear is turned by its small gear and turns the next one with its big gear. Use three gears.',
      solution: { slots: ['S', 'D', 'S'] },
      easy: { goalSpec: { dir: -1, speed: 'fast' }, solution: { slots: ['S'] } } },
    { id: 'c10', view: 'lab', mode: 'lever', topic: 'levers', name: 'Shelf Lift',
      goal: 'Lift the rock up onto the shelf! You may add helper weights.',
      spots: [-3, -2, -1, 0, 1, 2, 3], load: -4, weight: 4, effort: 4, push: 1, height: 2, shelf: 0.6, maxWeights: 4, f0: 0, par: 1, par2: 2,
      hint: 'Near the rock is easy but the rock goes up only a little. Try the fulcrum two spots from the rock, plus one helper weight.',
      solution: { f: -2, weights: [3] },
      easy: { shelf: 0.25 } },
    { id: 'c11', view: 'lab', mode: 'roll', topic: 'ramps', name: 'Roll to the Star',
      goal: 'Roll the ball so it stops on the star! Pick the ramp height and the floor.',
      heights: [1, 2, 3, 4], surfaces: ['ice', 'wood', 'carpet', 'sand'], from: 3.5, to: 4.2, floorLen: 8, h0: 1, surface0: 'sand',
      hint: 'Ice rolls too far. Try carpet, and choose how high to start.',
      solution: { h: 3, surface: 'carpet' },
      easy: { from: 2.4, to: 5.2 } },
    { id: 'c12', view: 'circuits', topic: 'circuits', name: 'Safe Switch',
      goal: 'Fan FAST, house BRIGHT, with a switch. A plain wire in the middle makes sparks!',
      need: 'bright', needFan: 'fast',
      map: ['C1 S1 T0 I1 C2',
            'B0 ## .. ## H0',
            'C0 .. T2 I1 C3'],
      tray: { I: 2, M: 1 }, par: 2,
      hint: 'The fan goes in the middle gap. A wire goes in the bottom gap. Then turn on the switch.',
      solution: { placed: [C('M', 2, 1, 0), C('I', 1, 2, 1)], rots: {}, sw: { '1,0': true } },
      winNote: 'No sparks! The fan and the house each have their own safe path.' }
  ];

  var tracks = [
    { id: 'a', name: 'Engineer Challenges', short: 'Challenges', icon: '🏗️', sub: 'Big builds + end tests', stages: A },
    { id: 'b', name: 'Thinking Puzzles', short: 'Puzzles', icon: '🧩', sub: 'Plan it, then run it', stages: B },
    { id: 'c', name: 'Science Lab', short: 'Science Lab', icon: '🔬', sub: 'Learn it, then use it', stages: Cs }
  ];
  tracks.forEach(function (t) { t.stages.forEach(function (s, i) { s.track = t.id; s.index = i; }); });

  /* Tip cards ("New idea!") — Level 2 ideas. */
  var tips = {
    l2budget: { title: 'Budget', text: 'Engineers build strong AND cheap. Fewer coins means more stars!',
      pic: '<svg viewBox="0 0 200 120"><circle cx="70" cy="60" r="34" fill="#ffc83d" stroke="#b07a00" stroke-width="6"/><circle cx="70" cy="60" r="20" fill="none" stroke="#e8a200" stroke-width="5"/><path d="M120 40 l12 -14 12 14 18 3 -13 13 3 18 -16 -8 -16 8 3 -18 -13 -13z" fill="#ffe14d" stroke="#b38f00" stroke-width="4"/></svg>' },
    l2wind: { title: 'Wind test', text: 'Wind pushes a house sideways. Triangle braces stop it from falling over.',
      pic: '<svg viewBox="0 0 200 120"><path d="M10 40 q20 -10 40 0 M5 60 q20 -10 45 0 M10 80 q20 -10 40 0" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/><g stroke="#8a4b16" stroke-width="8" stroke-linecap="round"><path d="M80 105 V60 H150 V105"/><path d="M80 60 L115 25 L150 60"/><path d="M80 105 L115 60 L150 105" stroke="#3ddc6a"/></g></svg>' },
    l2quake: { title: 'Earthquake test', text: 'In an earthquake the ground shakes. Every floor needs a triangle!',
      pic: '<svg viewBox="0 0 200 120"><path d="M20 108 h160" stroke="#7a4f26" stroke-width="8"/><path d="M30 112 l10 -8 10 8 10 -8 10 8" stroke="#ffe14d" stroke-width="4" fill="none"/><g stroke="#8a4b16" stroke-width="8" stroke-linecap="round"><path d="M80 104 V24 M130 104 V24 M80 64 H130 M80 24 H130"/><path d="M80 104 L130 64 M80 64 L130 24" stroke="#3ddc6a"/></g></svg>' },
    l2crane: { title: 'Crane test', text: 'A crane arm sticks far out. Triangles keep it from bending when it lifts.',
      pic: '<svg viewBox="0 0 200 120"><g stroke="#ff9f1c" stroke-width="7" stroke-linecap="round" fill="none"><path d="M50 110 V30 H160 M50 60 L160 30 M90 30 L50 60"/></g><path d="M160 30 V75" stroke="#23264a" stroke-width="3"/><rect x="145" y="75" width="30" height="24" rx="4" fill="#c98a3a" stroke="#6b4420" stroke-width="4"/></svg>' },
    l2plan: { title: 'Plan, then Run', text: 'Real coders plan the whole program first. Then they run it and watch.',
      pic: '<svg viewBox="0 0 200 120"><rect x="20" y="20" width="70" height="80" rx="10" fill="#fff" stroke="#23264a" stroke-width="5"/><path d="M35 45 h40 M35 62 h40 M35 79 h25" stroke="#3d8bff" stroke-width="7" stroke-linecap="round"/><path d="M120 40 L165 60 L120 80 Z" fill="#33b864" stroke="#1d7a3f" stroke-width="5" stroke-linejoin="round"/></svg>' },
    l2key: { title: 'Keys and doors', text: 'Walk over a key to pick it up. A door opens when Robo has a key.',
      pic: '<svg viewBox="0 0 200 120"><circle cx="60" cy="60" r="18" fill="none" stroke="#ffc83d" stroke-width="9"/><path d="M78 60 h45 M110 60 v14 M100 60 v10" stroke="#ffc83d" stroke-width="9" stroke-linecap="round"/><rect x="140" y="25" width="40" height="75" rx="6" fill="#a86b33" stroke="#5b3511" stroke-width="5"/><circle cx="170" cy="64" r="4" fill="#ffe14d"/></svg>' },
    l2bug: { title: 'Debugging', text: 'A bug is a mistake in a program. Run it, watch where Robo goes wrong, and fix that block.',
      pic: '<svg viewBox="0 0 200 120"><ellipse cx="100" cy="66" rx="30" ry="36" fill="#ff5d73" stroke="#8a1c33" stroke-width="5"/><circle cx="100" cy="28" r="16" fill="#23264a"/><path d="M70 50 l-25 -12 M70 70 h-28 M70 88 l-25 12 M130 50 l25 -12 M130 70 h28 M130 88 l25 12" stroke="#23264a" stroke-width="5" stroke-linecap="round"/><path d="M100 34 v66" stroke="#8a1c33" stroke-width="4"/></svg>' },
    l2fn: { title: 'My move', text: 'My move is a function: you build some steps once, and use them again with one block.',
      pic: '<svg viewBox="0 0 200 120"><rect x="15" y="25" width="80" height="70" rx="12" fill="#ffe0f0" stroke="#d63384" stroke-width="5"/><path d="M30 48 h50 M30 64 h50 M30 80 h30" stroke="#d63384" stroke-width="7" stroke-linecap="round"/><g fill="#d63384"><rect x="120" y="22" width="60" height="20" rx="8"/><rect x="120" y="50" width="60" height="20" rx="8"/><rect x="120" y="78" width="60" height="20" rx="8"/></g></svg>' },
    l2belt: { title: 'Conveyor belts', text: 'When Robo stops on a belt, it carries him along. Plan where he lands!',
      pic: '<svg viewBox="0 0 200 120"><rect x="20" y="50" width="160" height="34" rx="17" fill="#5a6378" stroke="#23264a" stroke-width="5"/><path d="M50 67 l14 -10 v20z M95 67 l14 -10 v20z M140 67 l14 -10 v20z" fill="#ffe14d" transform="rotate(180 100 67)"/></svg>' },
    l2else: { title: 'If and Else', text: 'If the answer is yes, Robo does the top part. Else, he does the bottom part.',
      pic: '<svg viewBox="0 0 200 120"><rect x="20" y="15" width="160" height="90" rx="14" fill="#efe6ff" stroke="#8a3ffc" stroke-width="5"/><text x="36" y="45" font-size="22" font-weight="900" fill="#8a3ffc">If</text><rect x="80" y="26" width="80" height="26" rx="8" fill="#3d8bff"/><text x="36" y="88" font-size="22" font-weight="900" fill="#8a3ffc">Else</text><rect x="95" y="68" width="65" height="26" rx="8" fill="#33b864"/></svg>' },
    l2colour: { title: 'Colour tiles', text: 'If red asks: is Robo standing on red? Coloured tiles can tell him where to turn.',
      pic: '<svg viewBox="0 0 200 120"><rect x="30" y="30" width="60" height="60" rx="8" fill="#ff5d73" stroke="#8a1c33" stroke-width="5"/><rect x="110" y="30" width="60" height="60" rx="8" fill="#3d8bff" stroke="#1d4f99" stroke-width="5"/><path d="M48 70 a14 14 0 0 1 24 -14 l2 -8 M152 70 a14 14 0 0 0 -24 -14 l-2 -8" stroke="#fff" stroke-width="6" fill="none" stroke-linecap="round"/></svg>' }
  };

  var facts = {
    a: [
      'Tall buildings sway a little in strong wind. That is on purpose!',
      'Triangles are used in cranes, towers and bridges because they keep their shape.',
      'Some buildings in earthquake places stand on giant rubber pads.',
      'The Eiffel Tower is made of thousands of iron pieces joined in triangles.',
      'Fire trucks are very heavy, so bridges for them must be extra strong.',
      'Engineers test small models in wind tunnels before they build the real thing.',
      'Steel is much stronger than wood, but it is heavier and costs more.',
      'The tallest building in the world is in Dubai. It is over 800 meters tall!',
      'Tower cranes use a heavy counterweight so they do not tip over.',
      'Roof trusses are triangles that hold up the roof of a house.',
      'Japan has many earthquakes, so its buildings are made to shake without falling.',
      'Engineers always build a bit stronger than they need, just to be safe.'
    ],
    b: [
      'A function is a set of steps with a name. Programmers use them again and again.',
      'Robots in big warehouses follow codes and lines on the floor.',
      'One of the first computer bugs was a real moth stuck inside a computer!',
      'Programmers spend lots of time finding and fixing bugs. That is called debugging.',
      'Mars rovers get their plan for the whole day before they start driving.',
      'An If block lets a program choose what to do.',
      'Loops save work: one block can do the same thing many times.',
      'Factory conveyor belts can move things all day long without getting tired.',
      'Self-driving cars check their sensors many times every second.',
      'Good programmers plan first, then they code.',
      'Some robot vacuums turn when they bump into a wall, just like an If wall block!',
      'Computers follow instructions exactly, one step at a time.'
    ],
    c: [
      'Bicycles use gears to help you ride up hills.',
      'A clock uses many tiny gears to move its hands.',
      'A see-saw is a lever. So are scissors and a bottle opener!',
      'Archimedes said: give me a lever long enough and I can move the world!',
      'The ancient Egyptians may have used long ramps to build the pyramids.',
      'Friction is what helps your shoes grip the ground.',
      'Wheelchair ramps are gentle, so they are easy to roll up.',
      'Car gearboxes use gears to go slow and strong, or fast.',
      'A light switch opens and closes the loop in the wires of your house.',
      'Most lights in a home are wired in parallel, so each one is bright.',
      'Never play with plugs or wall sockets. Real electricity is dangerous!',
      'A screw is really a ramp wrapped around a rod!'
    ]
  };

  /* Science Lab lessons: 4 cards each (big picture + 1–2 short sentences, read aloud), one "try it" card. */
  var lessons = {
    gears: { title: 'Gears', icon: '⚙️', cards: [
      { pic: 'gears-pair', text: 'Gears are wheels with teeth. When one gear turns, its teeth push the next gear.' },
      { pic: 'gears-dir', text: 'Two gears that touch always turn opposite ways.' },
      { try: 'gears', text: 'Try it! Tap to add gears to the chain. Watch which way the last gear turns.' },
      { pic: 'gears-speed', text: 'A big gear turning a small gear makes it spin fast. The middle gears only change the direction.' }
    ] },
    levers: { title: 'Levers', icon: '⚖️', cards: [
      { pic: 'seesaw', text: 'A lever is a long bar that rests on a point. The point is called the fulcrum.' },
      { try: 'lever', text: 'Try it! Tap a spot to move the fulcrum. Close to the heavy box, a small push lifts it.' },
      { pic: 'lever-types', text: 'There are three kinds of levers: a see-saw, a wheelbarrow and a fishing rod. Each has the fulcrum, the load and the push in a different order.' },
      { pic: 'lever-trade', text: 'An easy push means the load moves up only a little. Engineers pick the best spot!' }
    ] },
    ramps: { title: 'Ramps', icon: '📐', cards: [
      { pic: 'ramp-gentle', text: 'A ramp is a slope. It lifts heavy things a little at a time.' },
      { try: 'ramp', text: 'Try it! Make the ramp steep or gentle. Steep is short, but much harder to push.' },
      { pic: 'floors', text: 'Rough floors like carpet and sand slow things down. That is friction. Ice is slippery!' },
      { pic: 'roll-q', text: 'A ball that starts higher goes faster, and rolls farther.' }
    ] },
    circuits: { title: 'Circuits', icon: '💡', cards: [
      { pic: 'circuit-closed', text: 'Electricity needs a closed loop, from the battery, through the bulb, and back.' },
      { try: 'circuit', text: 'Try it! Tap the switch to open and close the loop.' },
      { pic: 'circuit-series', text: 'In one row, bulbs share the power and glow dim. On their own paths, each bulb is bright.' },
      { pic: 'circuit-short', text: 'A wire straight from plus to minus is a short circuit. Sparks! Never do that with real batteries.' }
    ] }
  };

  return { tracks: tracks, tips: tips, facts: facts, lessons: lessons };
});
