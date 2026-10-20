/* Weekly Big Projects (v3): one multi-step building project per calendar week, 12 made ahead.
 * Week n opens on Monday 19 Oct 2026 + n weeks (see js/logic/weekly.js).
 *
 * Project: { id, weekIndex, title, blurb, icon, intro (buddy says it on the project hub), done (said when finished),
 *            steps: [...] }
 * Step:    { id, world, title (<= 16 chars), goal, say (the story line before the step), hint?,
 *            base: '<world level id>' (rebuild that level with this story) | level: { ...inline level } }
 * Inline levels use the normal level format of their world (js/data/<world>-levels.js) and keep a stored
 * 3-star solution. Every step is checked through the real world logic by test/weekly.test.js.
 * Finishing step N opens step N+1; finishing every step completes the project. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.weeklyProjects = mod.projects; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var F = { t: 'F' }, L = { t: 'L' }, R = { t: 'R' };
  function rep(n, body) { return { t: 'rep', n: n, body: body }; }
  function times(n, b) { var a = []; for (var i = 0; i < n; i++) a.push(b); return a; }
  var FLR = ['F', 'L', 'R'], FLRREP = ['F', 'L', 'R', 'rep'];

  var projects = [
    /* ---------- Week 1 ---------- */
    {
      id: 'dream-house', weekIndex: 0, icon: '🏡', title: 'Dream House',
      blurb: 'Clear the plot, lift the bricks and build a house!',
      intro: 'This week we build a dream house! First we get the plot ready.',
      done: 'The dream house is finished! You are a real builder!',
      steps: [
        { id: 'plot', world: 'construction', title: 'Flat Plot',
          say: 'The plot is bumpy. Let\'s make it flat!',
          goal: 'Push the dirt into both holes!',
          level: { hint: 'Push the bottom dirt to the right first. Then go up and push the top dirt.',
            stages: [{ type: 'doze', map: ['..O..',
                                           '..o..',
                                           '.....',
                                           '>.o.O'] }],
            solution: [['R', 'R', 'R', 'U', 'L', 'U']] } },
        { id: 'rock', world: 'construction', title: 'Rock Away',
          say: 'A big rock is in the way!',
          goal: 'Push the rock into the truck. Then fill the hole!',
          level: { hint: 'Push the rock right, into the truck. Then push the dirt down.',
            stages: [{ type: 'doze', map: ['......',
                                           '>r..X.',
                                           '......',
                                           '..o...',
                                           '..O...'] }],
            solution: [['R', 'R', 'R', 'D', 'L', 'D']] } },
        { id: 'bricks', world: 'construction', title: 'Lift Bricks',
          say: 'The bricks are here. Let\'s lift them with the crane!',
          goal: 'Put the bricks on the X. The little box goes on top!',
          level: { hint: 'Lift the big bricks first. Then put the little box on top.',
            stages: [{ type: 'crane', cols: [['P3'], ['G1'], [], []], hook: 0, goals: [{ col: 2, stack: ['P3', 'G1'] }] }],
            solution: [['G', 'R', 'R', 'G', 'L', 'G', 'R', 'G']] } },
        { id: 'walls', world: 'construction', title: 'Walls & Windows',
          say: 'Now we build! Remember the order.',
          goal: 'Build the house with two windows!',
          level: { hint: 'Foundation, walls, door, windows. The roof goes on last!',
            stages: [{ type: 'build', house: { floors: 1, windows: [2], color: '#ffb35c' }, tray: ['found', 'walls', 'window', 'door', 'flat', 'roof'] }],
            solution: [['found', 'walls', 'door', 'window', 'window', 'roof']] } },
        { id: 'dream', world: 'construction', title: 'Dream House',
          say: 'The last step! A big house with two floors.',
          goal: 'Lift the bricks, then build a tall dream house!',
          level: { hint: 'Crane first. A tall house needs the wide foundation.',
            stages: [
              { type: 'crane', cols: [['P3'], [], []], hook: 0, truck: 0, goals: [{ col: 2, stack: ['P3'] }] },
              { type: 'build', house: { floors: 2, windows: [1, 2], color: '#ff7eb6' }, tray: ['thin', 'found', 'walls', 'window', 'door', 'roof'] }
            ],
            solution: [['G', 'R', 'R', 'G'], ['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'roof']] } }
      ]
    },

    /* ---------- Week 2 ---------- */
    {
      id: 'bridge-car', weekIndex: 1, icon: '🚗', title: 'Bridge & Car',
      blurb: 'Build bridges for the car, then a ramp and wheels!',
      intro: 'This week the little car needs a road! Let\'s build bridges for it.',
      done: 'The car made it all the way! Beep beep! Great job!',
      steps: [
        { id: 'short', world: 'bridges', base: 'b2', title: 'Short Bridge',
          say: 'The car needs to cross the river!',
          goal: 'Build the road and hold it up!' },
        { id: 'roof', world: 'bridges', base: 'b3', title: 'Roof Bridge',
          say: 'No low bolts here. We need a roof!',
          goal: 'Make a triangle on top of the road!' },
        { id: 'coins', world: 'bridges', base: 'b5', title: 'Coin Bridge',
          say: 'We are low on coins!',
          goal: 'Build a bridge with few coins!' },
        { id: 'ramp', world: 'machines', base: 'm1', title: 'Car Ramp',
          say: 'The car rolled to the workshop. Now let\'s test a ramp!',
          goal: 'Help the ball roll into the basket!' },
        { id: 'wheels', world: 'machines', base: 'm4', title: 'Car Wheels',
          say: 'The box car has no wheels!',
          goal: 'Put wheels on the box so it rolls to the star!' }
      ]
    },

    /* ---------- Week 3 ---------- */
    {
      id: 'delivery-robot', weekIndex: 2, icon: '📦', title: 'Delivery Robot',
      blurb: 'Program Robo to deliver packages around town!',
      intro: 'Robo is a delivery robot this week! Grab each package and bring it to the flag.',
      done: 'Every package is delivered! Robo says thank you!',
      steps: [
        { id: 'pickup', world: 'robot', title: 'Pick Up',
          say: 'The package is on the road.',
          goal: 'Grab the package and drive to the flag!',
          level: { hint: 'Count the steps to the flag. Four Forward blocks!',
            map: ['TTTTTT',
                  'T>.G.F',
                  'TTTTTT'],
            blocks: ['F'], par: 4, solution: times(4, F) } },
        { id: 'corner', world: 'robot', title: 'Corner Shop',
          say: 'The shop is round the corner.',
          goal: 'Grab the package, then turn to the flag!',
          level: { hint: 'Three Forward, Turn Right, then two Forward.',
            map: ['TTTTT',
                  '>.G.T',
                  'TTT.T',
                  'TTTFT'],
            blocks: FLR, par: 6, solution: [F, F, F, R, F, F] } },
        { id: 'left', world: 'robot', title: 'Left Street',
          say: 'This house is up the hill.',
          goal: 'Drive, turn left, and climb to the flag!',
          level: { hint: 'Two Forward, Turn Left, then three Forward.',
            map: ['TTFTT',
                  'TT.TT',
                  'TTGTT',
                  '>..TT'],
            blocks: FLR, par: 6, solution: [F, F, L, F, F, F] } },
        { id: 'two', world: 'robot', title: 'Two Parcels',
          say: 'The last stop has two packages!',
          goal: 'Grab both packages on the way to the flag!',
          level: { hint: 'Go down with Turn Right. At the bottom, Turn Right again.',
            map: ['>G.T',
                  'TT.T',
                  'FG.T'],
            blocks: FLR, par: 8, solution: [F, F, R, F, F, R, F, F] } }
      ]
    },

    /* ---------- Week 4 ---------- */
    {
      id: 'light-town', weekIndex: 3, icon: '💡', title: 'Light-Up Town',
      blurb: 'Wire up a house, the street, the park and more!',
      intro: 'The town is dark! This week we bring the power, one place at a time.',
      done: 'The whole town is glowing! You lit it up!',
      steps: [
        { id: 'house', world: 'circuits', base: 'c1', title: 'Little House',
          say: 'First, the little house at the edge of town.',
          goal: 'Fill the gap in the wire to light the house!' },
        { id: 'shop', world: 'circuits', base: 'c3', title: 'Corner Shop',
          say: 'The shop wire goes round a bend.',
          goal: 'Use corner wires to light the shop!' },
        { id: 'street', world: 'circuits', base: 'c19', title: 'Street Lamps',
          say: 'Now the street lamps, so people can see at night.',
          goal: 'Put a lamp in each gap to light the street!' },
        { id: 'park', world: 'circuits', base: 'c8', title: 'Park Fan',
          say: 'It is hot in the park. Let\'s add a fan!',
          goal: 'Make the fan in the park spin!' },
        { id: 'tower', world: 'circuits', base: 'c23', title: 'Tower Street',
          say: 'The last street has three houses by the tower.',
          goal: 'Make all three houses BRIGHT!' }
      ]
    },

    /* ---------- Week 5 ---------- */
    {
      id: 'gear-factory', weekIndex: 4, icon: '⚙️', title: 'Gear Factory',
      blurb: 'Gears and belts make the factory run!',
      intro: 'Welcome to the gear factory! Gears and belts make everything move.',
      done: 'The factory is running! Gears are spinning everywhere!',
      steps: [
        { id: 'start', world: 'machines', base: 'm6', title: 'Start the Belt',
          say: 'The factory belt is still. Let\'s start it!',
          goal: 'Connect the motor to the belt with a gear!' },
        { id: 'left', world: 'machines', base: 'm7', title: 'Belt Goes Left',
          say: 'This belt must go the other way.',
          goal: 'Make the belt go LEFT!' },
        { id: 'fast', world: 'machines', base: 'm9', title: 'Fast Belt',
          say: 'The ball has to jump a gap!',
          goal: 'Make the belt go fast so the ball can jump!' },
        { id: 'boxes', world: 'machines', base: 'm21', title: 'Box Belt',
          say: 'Now the belt carries boxes.',
          goal: 'Turn the belt on to carry the box!' },
        { id: 'train', world: 'machines', base: 'm25', title: 'Gear Train',
          say: 'The big machine needs a whole gear train!',
          goal: 'Fill the gear train. The belt must go fast!' }
      ]
    },

    /* ---------- Week 6 ---------- */
    {
      id: 'rescue-bridge', weekIndex: 5, icon: '🚑', title: 'Rescue Bridge',
      blurb: 'Build strong bridges so the rescue team can cross!',
      intro: 'Help! The rescue team must cross the river. This week we build strong bridges.',
      done: 'The rescue team made it! You saved the day!',
      steps: [
        { id: 'rock', world: 'bridges', base: 'b7', title: 'Rock Bridge',
          say: 'There is a rock in the river. Use it!',
          goal: 'Use the rock to hold the road up!' },
        { id: 'truck', world: 'bridges', base: 'b9', title: 'Rescue Truck',
          say: 'The rescue truck is very heavy.',
          goal: 'Make a super strong bridge for the truck!' },
        { id: 'steel', world: 'bridges', base: 'b10', title: 'Steel Rescue',
          say: 'Steel is extra strong. Let\'s use it!',
          goal: 'Use steel beams to hold the truck!' },
        { id: 'drive', world: 'robot', title: 'Drive Across',
          say: 'Robo drives the rescue kit over the bridge.',
          goal: 'Grab the kit, cross the bridge and reach the flag!',
          level: { hint: 'Three Forward, Turn Left, Forward, Turn Right, Forward.',
            map: ['~~~.F',
                  '>.G.~',
                  '~~~~~'],
            blocks: FLR, par: 7, solution: [F, F, F, L, F, R, F] } },
        { id: 'long', world: 'robot', title: 'Long Bridge',
          say: 'The last bridge is very long!',
          goal: 'Drive all the way across the long bridge!',
          level: { hint: 'Count the squares. Six Forward blocks!',
            map: ['~~~~~~~',
                  '>..G..F',
                  '~~~~~~~'],
            blocks: ['F'], par: 6, solution: times(6, F) } }
      ]
    },

    /* ---------- Week 7 ---------- */
    {
      id: 'crane-tower', weekIndex: 6, icon: '🏗️', title: 'Crane Tower',
      blurb: 'Lift and stack blocks into a tall tower!',
      intro: 'This week you drive the big crane! We will stack blocks into a tower.',
      done: 'What a tall tower! You are a crane champion!',
      steps: [
        { id: 'lift', world: 'construction', title: 'First Lift',
          say: 'Let\'s learn the crane.',
          goal: 'Lift the yellow block onto the X!',
          level: { hint: 'Grab, move right two times, then drop.',
            stages: [{ type: 'crane', cols: [['Y3'], [], []], hook: 0, goals: [{ col: 2, stack: ['Y3'] }] }],
            solution: [['G', 'R', 'R', 'G']] } },
        { id: 'two', world: 'construction', title: 'Two Blocks',
          say: 'Now two blocks!',
          goal: 'Stack both blocks on the X!',
          level: { hint: 'Yellow first. The red one goes on top.',
            stages: [{ type: 'crane', cols: [['Y3'], ['R2'], []], hook: 0, goals: [{ col: 2, stack: ['Y3', 'R2'] }] }],
            solution: [['G', 'R', 'R', 'G', 'L', 'G', 'R', 'G']] } },
        { id: 'bottom', world: 'construction', title: 'Big at Bottom',
          say: 'Big blocks must go at the bottom.',
          goal: 'Put the big block down first, then the little one!',
          level: { hint: 'Move the little blue block out of the way. Then lift the big one.',
            stages: [{ type: 'crane', cols: [['B1'], ['Y3'], []], hook: 0, goals: [{ col: 2, stack: ['Y3', 'B1'] }] }],
            solution: [['R', 'G', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'three', world: 'construction', title: 'Three High',
          say: 'Let\'s make the tower taller!',
          goal: 'Build a tower of three on the X. Biggest at the bottom!',
          level: { hint: 'Yellow, then red, then blue on top.',
            stages: [{ type: 'crane', cols: [['B1'], ['Y3'], [], ['R2']], hook: 0, goals: [{ col: 2, stack: ['Y3', 'R2', 'B1'] }] }],
            solution: [['R', 'G', 'R', 'G', 'R', 'G', 'L', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'champ', world: 'construction', title: 'Tower Champ',
          say: 'The final tower. Think before you lift!',
          goal: 'Build the tower on the far X. Big, middle, small!',
          level: { hint: 'Carry the yellow block first. Then red, then blue.',
            stages: [{ type: 'crane', cols: [['R2'], ['Y3'], ['B1'], []], hook: 0, goals: [{ col: 3, stack: ['Y3', 'R2', 'B1'] }] }],
            solution: [['R', 'G', 'R', 'R', 'G', 'L', 'L', 'L', 'G', 'R', 'R', 'R', 'G', 'L', 'G', 'R', 'G']] } }
      ]
    },

    /* ---------- Week 8 ---------- */
    {
      id: 'windmill-farm', weekIndex: 7, icon: '🌾', title: 'Windmill Farm',
      blurb: 'Power the farm fans, then build farm machines!',
      intro: 'Welcome to the farm! This week we power the fans and build farm machines.',
      done: 'The farm is buzzing with machines! Great farming!',
      steps: [
        { id: 'fan', world: 'circuits', base: 'c8', title: 'First Fan',
          say: 'The barn is too hot. It needs a fan!',
          goal: 'Make the fan spin!' },
        { id: 'corners', world: 'circuits', base: 'c21', title: 'Barn Fan',
          say: 'This wire has to go round the barn.',
          goal: 'Make the fan spin! Go round the corners.' },
        { id: 'two', world: 'circuits', base: 'c16', title: 'Two Fans',
          say: 'The farm has two fans now.',
          goal: 'Make BOTH fans spin FAST!' },
        { id: 'lift', world: 'machines', base: 'm12', title: 'Grain Lift',
          say: 'The grain box is too heavy to carry.',
          goal: 'Lift the box up to the star with a pulley!' },
        { id: 'launch', world: 'machines', base: 'm10', title: 'Hay Launch',
          say: 'The hay goes up to the loft!',
          goal: 'Launch the box up to the star with the seesaw!' }
      ]
    },

    /* ---------- Week 9 ---------- */
    {
      id: 'race-track', weekIndex: 8, icon: '🏁', title: 'Robot Race Track',
      blurb: 'Use Repeat blocks to race Robo round the track!',
      intro: 'Race day! This week Robo races. Repeat blocks make long programs short.',
      done: 'Robo won the race! You are a coding champion!',
      steps: [
        { id: 'straight', world: 'robot', title: 'Long Straight',
          say: 'The first part of the track is long and straight.',
          goal: 'Race to the flag with a Repeat block!',
          level: { tip: 'repeat', hint: 'Put Forward inside a Repeat. Make it repeat 6 times.',
            map: ['TTTTTTT',
                  '>.....F',
                  'TTTTTTT'],
            blocks: FLRREP, par: 2, solution: [rep(6, [F])] } },
        { id: 'lap', world: 'robot', title: 'Square Lap',
          say: 'Now a lap round the pond!',
          goal: 'Drive round the pond and grab the gears!',
          level: { hint: 'One side is: Forward, Forward, Forward, Turn Right. Repeat it 3 times!',
            map: ['>..G',
                  '.~~.',
                  '.~~.',
                  'F..G'],
            blocks: FLRREP, par: 5, solution: [rep(3, [F, F, F, R])] } },
        { id: 'stairs', world: 'robot', title: 'Stairs Up',
          say: 'The track climbs up some stairs.',
          goal: 'Climb the stairs to the flag!',
          level: { hint: 'One stair is: Forward, Turn Left, Forward, Turn Right. Repeat it!',
            map: ['TTTTF',
                  'TTT..',
                  'TTG.T',
                  'T..TT',
                  '>.TTT'],
            blocks: FLRREP, par: 5, solution: [rep(4, [F, L, F, R])] } },
        { id: 'uturn', world: 'robot', title: 'U-Turn',
          say: 'Here comes a big U-turn!',
          goal: 'Race along, turn round, and race back to the flag!',
          level: { hint: 'Repeat Forward 5 times. Turn Right, two Forward, Turn Right. Then repeat Forward 5 times again.',
            map: ['>....G',
                  'TTTTT.',
                  'F.....'],
            blocks: FLRREP, par: 8, solution: [rep(5, [F]), R, F, F, R, rep(5, [F])] } },
        { id: 'final', world: 'robot', title: 'Final Lap',
          say: 'The final lap! Grab every gear.',
          goal: 'Go round three sides of the track to the flag!',
          level: { hint: 'Repeat 3 times: four Forward and Turn Right. Then two more Forward.',
            map: ['>...G',
                  '.TTT.',
                  'FTTT.',
                  '.TTT.',
                  'G...G'],
            blocks: FLRREP, par: 8, solution: [rep(3, [F, F, F, F, R]), F, F] } }
      ]
    },

    /* ---------- Week 10 ---------- */
    {
      id: 'harbor', weekIndex: 9, icon: '⚓', title: 'Harbor Crane & Bridge',
      blurb: 'Load the ship with the crane and build harbor bridges!',
      intro: 'Ships are coming to the harbor! This week we load cargo and build bridges.',
      done: 'The ship sails away, full of cargo! Ahoy, engineer!',
      steps: [
        { id: 'dock', world: 'construction', title: 'Clear the Dock',
          say: 'The dock is messy.',
          goal: 'Push the rock into the truck and fill the hole!',
          level: { hint: 'Go around the rock to push the dirt first. Then push the rock right.',
            stages: [{ type: 'doze', map: ['>.r.X',
                                           '.....',
                                           '.o...',
                                           '.O...'] }],
            solution: [['D', 'R', 'D', 'U', 'U', 'R', 'R']] } },
        { id: 'load', world: 'construction', title: 'Load the Ship',
          say: 'The crane loads the ship.',
          goal: 'Put the steel beam on the X, then the red box on top!',
          level: { hint: 'Steel beam first, it is the biggest. Then the red box.',
            stages: [{ type: 'crane', cols: [['S3'], ['R2'], [], []], hook: 0, truck: 0, goals: [{ col: 3, stack: ['S3', 'R2'] }] }],
            solution: [['G', 'R', 'R', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'boat', world: 'bridges', base: 'b13', title: 'Harbor Bridge',
          say: 'Boats sail under this bridge.',
          goal: 'Build up high, so the boat can pass below!' },
        { id: 'towers', world: 'bridges', base: 'b12', title: 'Tower Bridge',
          say: 'This bridge has tall towers.',
          goal: 'Hang the road from the towers!' },
        { id: 'cargo', world: 'construction', title: 'Stack Cargo',
          say: 'One more ship to load!',
          goal: 'Stack the cargo on the X. Biggest at the bottom!',
          level: { hint: 'Yellow first, then red, then the little green box.',
            stages: [{ type: 'crane', cols: [['G1'], ['Y3'], ['R2'], []], hook: 0, truck: 0, goals: [{ col: 3, stack: ['Y3', 'R2', 'G1'] }] }],
            solution: [['R', 'G', 'R', 'R', 'G', 'L', 'G', 'R', 'G', 'L', 'L', 'L', 'G', 'R', 'R', 'R', 'G']] } }
      ]
    },

    /* ---------- Week 11 ---------- */
    {
      id: 'night-city', weekIndex: 10, icon: '🌃', title: 'Night City Lights',
      blurb: 'Series and parallel paths light up the city at night!',
      intro: 'Night is falling on the city. This week we light it up the clever way.',
      done: 'The city sparkles at night! Beautiful work!',
      steps: [
        { id: 'share', world: 'circuits', base: 'c5', title: 'Shared Path',
          say: 'Two houses on one wire.',
          goal: 'Light BOTH houses with one path!' },
        { id: 'bright', world: 'circuits', base: 'c6', title: 'Bright Twins',
          say: 'One path made them dim. Let\'s make them bright!',
          goal: 'Make BOTH houses bright! Give each one its own path.' },
        { id: 'switch', world: 'circuits', base: 'c7', title: 'Light Switch',
          say: 'Houses need light switches.',
          goal: 'Fix the wire, then turn on the switch!' },
        { id: 'bedtime', world: 'circuits', base: 'c15', title: 'Bedtime',
          say: 'Shh! Someone is going to bed.',
          goal: 'Light the house. Keep the sleepy house dark!' },
        { id: 'city', world: 'circuits', base: 'c17', title: 'Night City',
          say: 'The whole city at night!',
          goal: 'Light both houses BRIGHT. Shh, one house is sleeping!' }
      ]
    },

    /* ---------- Week 12 ---------- */
    {
      id: 'workshop', weekIndex: 11, icon: '🛠️', title: 'Super Workshop',
      blurb: 'The finale! Dig, lift, build, wire and park Robo inside!',
      intro: 'The big finale! This week we build a super workshop for Robo.',
      done: 'The super workshop is done and Robo is home! You are a super engineer!',
      steps: [
        { id: 'plot', world: 'construction', title: 'Workshop Plot',
          say: 'First, a flat plot for the workshop.',
          goal: 'Push the dirt into both holes!',
          level: { hint: 'Push the first dirt down. Then go round and push the other one down.',
            stages: [{ type: 'doze', map: ['>....',
                                           '.o.o.',
                                           '.O.O.'] }],
            solution: [['R', 'D', 'U', 'R', 'R', 'D']] } },
        { id: 'beams', world: 'construction', title: 'Lift Beams',
          say: 'The steel beams arrive.',
          goal: 'Lift the steel beam onto the X!',
          level: { hint: 'Grab, move right two times, then drop.',
            stages: [{ type: 'crane', cols: [['S3'], [], []], hook: 0, truck: 0, goals: [{ col: 2, stack: ['S3'] }] }],
            solution: [['G', 'R', 'R', 'G']] } },
        { id: 'shed', world: 'construction', title: 'Build the Shed',
          say: 'Now build the workshop!',
          goal: 'Build the workshop with one window!',
          level: { hint: 'Foundation, walls, door and window. Then the roof.',
            stages: [{ type: 'build', house: { floors: 1, windows: [1], color: '#7ed957' }, tray: ['found', 'walls', 'window', 'door', 'flat', 'roof'] }],
            solution: [['found', 'walls', 'door', 'window', 'roof']] } },
        { id: 'lights', world: 'circuits', base: 'c20', title: 'Workshop Lights',
          say: 'The workshop needs lights.',
          goal: 'Two switches! Turn BOTH on to light the workshop.' },
        { id: 'park', world: 'robot', title: 'Park Inside',
          say: 'Robo can move in!',
          goal: 'Drive Robo into the workshop to the flag!',
          level: { hint: 'Two Forward, Turn Left, two Forward.',
            map: ['.###.',
                  '.#F#.',
                  '.#.#.',
                  '>G...'],
            blocks: FLRREP, par: 5, solution: [F, F, L, F, F] } }
      ]
    },
    /* GEN:START weeks 13-52 (tools/weekly-gen.js) */
    /* ---------- Week 13 ---------- */
    {
      id: 'pirate-treasure', weekIndex: 12, icon: '🏴‍☠️', title: 'Pirate Treasure',
      blurb: 'Sail, dig and grab the pirate treasure!',
      intro: 'Ahoy! This week we hunt for pirate treasure.',
      done: 'You found the treasure! Captain Salah!',
      steps: [
        { id: 'gold-coin', world: 'robot', base: 'r2', title: 'Gold Coin',
          say: 'Robo the pirate sees a gold coin on the beach!',
          goal: 'Walk over the gear to grab it. Then reach the flag!' },
        { id: 'plank-bridge', world: 'bridges', base: 'b1', title: 'Plank Bridge',
          say: 'The treasure cart must cross a little stream.',
          goal: 'Help the car cross the gap! Build a road.' },
        { id: 'dig-for-gold', world: 'construction', title: 'Dig for Gold',
          say: 'The treasure map says: fill the hole first!',
          goal: 'Push the sand into the hole!',
          level: { hint: 'Get behind the dirt, then push it into the hole!', stages: [{ type: 'doze', map: ['.....', '.v.o.', '....O'] }], solution: [['R', 'R', 'U', 'R', 'D']] } },
        { id: 'treasure-ramp', world: 'machines', base: 'm2', title: 'Treasure Ramp',
          say: 'Roll the gold ball into the treasure chest!',
          goal: 'The basket is on the other side. Flip the ramp!' },
        { id: 'treasure-map', world: 'robot', title: 'Treasure Map',
          say: 'Follow the treasure map to the X!',
          goal: 'Follow the path, grab the gold and reach the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['TTTTT', 'TT..<', 'TT.TT', 'TT.GF'], blocks: ['F', 'L', 'R'], par: 8, solution: [{ t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }] } }
      ]
    },

    /* ---------- Week 14 ---------- */
    {
      id: 'space-station', weekIndex: 13, icon: '🛸', title: 'Space Station',
      blurb: 'Power up the space station and dock the pod!',
      intro: 'Three, two, one, blast off! This week we build a space station.',
      done: 'The space station is ready! You are a space engineer!',
      steps: [
        { id: 'power-panel', world: 'circuits', base: 'c2', title: 'Power Panel',
          say: 'The space station is dark. Fix the power wire!',
          goal: 'Turn the wire and fill the gap to light the house!' },
        { id: 'dock-the-pod', world: 'robot', title: 'Dock the Pod',
          say: 'The little pod must dock at the station.',
          goal: 'Grab the fuel and dock at the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['T>.GT', 'TTT.T', 'TTT.T', 'TTF.T'], blocks: ['F', 'L', 'R'], par: 8, solution: [{ t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }] } },
        { id: 'moon-crater', world: 'construction', base: 'k3', title: 'Moon Crater',
          say: 'Moon dust is in the way. Push it into the crater!',
          goal: 'This hole is down below. Push the dirt down!' },
        { id: 'fuel-ramps', world: 'machines', base: 'm3', title: 'Fuel Ramps',
          say: 'Fuel balls roll down to the rocket tank.',
          goal: 'Use two ramps to reach the basket!' },
        { id: 'moon-walk', world: 'robot', base: 'r3', title: 'Moon Walk',
          say: 'Robo walks on the moon. Not too many steps!',
          goal: 'Robo looks down. Use just enough blocks!' }
      ]
    },

    /* ---------- Week 15 ---------- */
    {
      id: 'zoo-builders', weekIndex: 14, icon: '🦁', title: 'Zoo Builders',
      blurb: 'Feed the animals and build them homes!',
      intro: 'Welcome to the zoo! This week we help the animals.',
      done: 'The animals are happy and fed! Great zoo keeping!',
      steps: [
        { id: 'feed-the-lions', world: 'robot', title: 'Feed the Lions',
          say: 'The lions are hungry! Robo brings the food.',
          goal: 'Grab the food and reach the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['T..G.', 'T^TT.', 'TTTTF', 'TTTTT'], blocks: ['F', 'L', 'R'], par: 8, solution: [{ t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'giraffe-bridge', world: 'bridges', base: 'b4', title: 'Giraffe Bridge',
          say: 'The giraffes need a bridge to their tree.',
          goal: 'This bridge has a square. Squares squish! Fix it.' },
        { id: 'panda-house', world: 'construction', base: 'k5', title: 'Panda House',
          say: 'The panda needs a little house.',
          goal: 'Build a little house!' },
        { id: 'zoo-path-lights', world: 'circuits', base: 'c4', title: 'Zoo Path Lights',
          say: 'The zoo path is long and dark. Light it up!',
          goal: 'Build a long wire path over the rocks!' },
        { id: 'monkey-push', world: 'machines', base: 'm5', title: 'Monkey Push',
          say: 'The monkey rolls a ball to push the box!',
          goal: 'Roll the ball to push the box into the goal!' }
      ]
    },

    /* ---------- Week 16 ---------- */
    {
      id: 'candy-factory', weekIndex: 15, icon: '🍭', title: 'Candy Factory',
      blurb: 'Belts, gears and stacks of sweets!',
      intro: 'Yum! This week we run a candy factory.',
      done: 'So much candy! The factory is a sweet success!',
      steps: [
        { id: 'candy-belt', world: 'machines', base: 'm6', title: 'Candy Belt',
          say: 'The candy belt is still. Start it up!',
          goal: 'Turn on the belt! Connect the motor with a gear.' },
        { id: 'sweet-shops', world: 'circuits', base: 'c5', title: 'Sweet Shops',
          say: 'Two candy shops share one wire.',
          goal: 'Light BOTH houses with one path!' },
        { id: 'stack-candy', world: 'construction', title: 'Stack Candy',
          say: 'Big candy boxes go at the bottom!',
          goal: 'Stack the candy boxes on the X!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [['Y2'], ['B3'], []], hook: 0, goals: [{ col: 2, stack: ['B3', 'Y2'] }] }], solution: [['R', 'G', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'sticky-gears', world: 'machines', base: 'm8', title: 'Sticky Gears',
          say: 'Oh no, candy got stuck in the gears!',
          goal: 'Oh no, the gears are jammed! Fix them.' },
        { id: 'lollipop-run', world: 'robot', base: 'r5', title: 'Lollipop Run',
          say: 'Robo delivers lollipops round the bend.',
          goal: 'This time the path turns the other way!' }
      ]
    },

    /* ---------- Week 17 ---------- */
    {
      id: 'snow-day', weekIndex: 16, icon: '⛄', title: 'Snow Day',
      blurb: 'Plow the snow, cross the ice and keep warm!',
      intro: 'It snowed! This week we have a snow day.',
      done: 'What a fun snow day! Everyone is warm and cozy!',
      steps: [
        { id: 'snow-plow', world: 'robot', title: 'Snow Plow',
          say: 'Snow everywhere! Robo plows the path.',
          goal: 'Plow the path to the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['T..GT', 'T.T.T', 'T^TFT', 'TTTTT'], blocks: ['F', 'L', 'R'], par: 8, solution: [{ t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'icy-bridge', world: 'bridges', base: 'b6', title: 'Icy Bridge',
          say: 'The icy river needs a bridge.',
          goal: 'Only top bolts! Build triangles over the road.' },
        { id: 'snowy-path', world: 'construction', title: 'Snowy Path',
          say: 'Snow holes in the path!',
          goal: 'Push the snow into the holes!',
          level: { hint: 'Get behind the dirt, then push it into the hole!', stages: [{ type: 'doze', map: ['..O..', '<.o..', '.....'] }], solution: [['D', 'R', 'R', 'U']] } },
        { id: 'cozy-cabin', world: 'circuits', base: 'c9', title: 'Cozy Cabin',
          say: 'Light one cabin. The other family is sleeping.',
          goal: 'Light the house, but let the sleepy house sleep!' },
        { id: 'snowball-fling', world: 'machines', base: 'm10', title: 'Snowball Fling',
          say: 'Fling the box up the snowy hill!',
          goal: 'Launch the box up to the star!' }
      ]
    },

    /* ---------- Week 18 ---------- */
    {
      id: 'fire-station', weekIndex: 17, icon: '🚒', title: 'Fire Station',
      blurb: 'Help the fire crew save the day!',
      intro: 'Nee-naw! This week we help the fire station.',
      done: 'The fire crew says thank you! You are a hero!',
      steps: [
        { id: 'save-the-kitten', world: 'robot', title: 'Save the Kitten',
          say: 'A kitten is stuck! Robo goes to help.',
          goal: 'Grab the ladder and reach the kitten at the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['F..TT', 'TTGTT', 'TT.TT', 'T>.TT'], blocks: ['F', 'L', 'R'], par: 8, solution: [{ t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'fire-truck', world: 'bridges', base: 'b9', title: 'Fire Truck',
          say: 'The fire truck is very heavy.',
          goal: 'A heavy truck! Make a super strong bridge.' },
        { id: 'fire-alarm', world: 'circuits', base: 'c7', title: 'Fire Alarm',
          say: 'The fire alarm needs a switch.',
          goal: 'Fix the wire, then turn on the switch!' },
        { id: 'clear-the-door', world: 'construction', base: 'k7', title: 'Clear the Door',
          say: 'A rock blocks the fire station door!',
          goal: 'Push the rock into the truck. Fill the hole!' },
        { id: 'water-lift', world: 'machines', base: 'm12', title: 'Water Lift',
          say: 'Lift the water box up high!',
          goal: 'Lift the box up to the star!' }
      ]
    },

    /* ---------- Week 19 ---------- */
    {
      id: 'dino-park', weekIndex: 18, icon: '🦕', title: 'Dinosaur Park',
      blurb: 'Build a park for the friendly dinosaurs!',
      intro: 'Roar! This week we build a dinosaur park.',
      done: 'The dinosaurs love their park! Roar-some job!',
      steps: [
        { id: 'dino-rock', world: 'bridges', base: 'b7', title: 'Dino Rock',
          say: 'A big rock is in the dino river. Use it!',
          goal: 'A rock in the river! Use it to hold the road.' },
        { id: 'dino-trail', world: 'robot', base: 'r6', title: 'Dino Trail',
          say: 'Follow the twisty dino footprints!',
          goal: 'Turn, turn, turn! Follow the zig zag.' },
        { id: 'fossil-log', world: 'machines', base: 'm11', title: 'Fossil Log',
          say: 'A big log hides a fossil. Split it!',
          goal: 'A log blocks the way. Split it!' },
        { id: 'fence-sparks', world: 'circuits', base: 'c10', title: 'Fence Sparks',
          say: 'The dino fence wire is sparking!',
          goal: 'Sparks! Take away the shortcut wire and put a lamp there.' },
        { id: 'ranger-hut', world: 'construction', base: 'k6', title: 'Ranger Hut',
          say: 'The park ranger needs a hut.',
          goal: 'This house needs two windows!' }
      ]
    },

    /* ---------- Week 20 ---------- */
    {
      id: 'train-station', weekIndex: 19, icon: '🚂', title: 'Train Station',
      blurb: 'Tracks, bridges and lights for the train!',
      intro: 'All aboard! This week we build a train station.',
      done: 'Choo choo! The train is on time. Great work!',
      steps: [
        { id: 'train-tracks', world: 'robot', title: 'Train Tracks',
          say: 'Robo drives the little train.',
          goal: 'Follow the tracks, grab the ticket and reach the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['TTTTT', '>.TTT', 'T.TTT', 'T..GF'], blocks: ['F', 'L', 'R'], par: 8, solution: [{ t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'valley-arch', world: 'bridges', base: 'b8', title: 'Valley Arch',
          say: 'The train must cross a deep valley.',
          goal: 'The bolts are deep down. Build an arch!' },
        { id: 'station-lamps', world: 'circuits', base: 'c11', title: 'Station Lamps',
          say: 'The station lamps need more power.',
          goal: 'Add a battery to make both houses BRIGHT!' },
        { id: 'luggage-belt', world: 'machines', base: 'm13', title: 'Luggage Belt',
          say: 'Bags ride the belt. Catch them with a ramp!',
          goal: 'Start the belt, then catch the ball with a ramp!' },
        { id: 'ticket-office', world: 'construction', base: 'k8', title: 'Ticket Office',
          say: 'Build the ticket office.',
          goal: 'Build the house with a strong roof!' }
      ]
    },

    /* ---------- Week 21 ---------- */
    {
      id: 'toy-shop', weekIndex: 20, icon: '🧸', title: 'Toy Shop',
      blurb: 'Stack, roll and power the toys!',
      intro: 'Ding ding! This week we open a toy shop.',
      done: 'The toy shop is full of happy kids! Super!',
      steps: [
        { id: 'toy-tower', world: 'construction', title: 'Toy Tower',
          say: 'Toy blocks arrive! Stack them up.',
          goal: 'Stack the toy blocks on the X!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [['P2'], [], ['R3']], hook: 0, goals: [{ col: 1, stack: ['R3', 'P2'] }] }], solution: [['R', 'R', 'G', 'L', 'G', 'L', 'G', 'R', 'G']] } },
        { id: 'toy-car-smash', world: 'machines', base: 'm14', title: 'Toy Car Smash',
          say: 'The toy car rolls through the log!',
          goal: 'Roll the box through the log to the star!' },
        { id: 'robot-toy', world: 'circuits', base: 'c12', title: 'Robot Toy',
          say: 'The toy robot does not work. Check the batteries!',
          goal: 'One battery is upside down! Flip it and fix the wire.' },
        { id: 'toy-hunt', world: 'robot', base: 'r7', title: 'Toy Hunt',
          say: 'Toys are hiding behind the shelves!',
          goal: 'The trees block the way. Go around and grab both gears!' },
        { id: 'toy-train-bridge', world: 'bridges', base: 'b5', title: 'Toy Train Bridge',
          say: 'Build the toy train bridge with few coins!',
          goal: 'Beams cost coins. Use few coins for 3 stars!' }
      ]
    },

    /* ---------- Week 22 ---------- */
    {
      id: 'castle', weekIndex: 21, icon: '🏰', title: 'Castle Builders',
      blurb: 'Lift stones and build a real castle!',
      intro: 'Long ago, people built castles. This week, so do we!',
      done: 'The castle is finished! King Salah of the castle!',
      steps: [
        { id: 'lift-stones', world: 'construction', base: 'k9', title: 'Lift Stones',
          say: 'The castle needs a big stone beam.',
          goal: 'Lift the steel beam onto the X!' },
        { id: 'moat-bridge', world: 'bridges', base: 'b11', title: 'Moat Bridge',
          say: 'Cross the castle moat!',
          goal: 'One rock in the middle. Keep the bridge balanced!' },
        { id: 'castle-road', world: 'robot', base: 'r9', title: 'Castle Road',
          say: 'A long road to the castle gate.',
          goal: 'A long road! Use Repeat so you need fewer blocks.' },
        { id: 'tower-lamp', world: 'circuits', base: 'c13', title: 'Tower Lamp',
          say: 'The castle tower needs a fan and a lamp.',
          goal: 'Make the fan spin FAST and the house BRIGHT!' },
        { id: 'castle-wall', world: 'construction', base: 'k10', title: 'Castle Wall',
          say: 'Stack the castle wall blocks!',
          goal: 'Stack both blocks on the X!' }
      ]
    },

    /* ---------- Week 23 ---------- */
    {
      id: 'underwater-lab', weekIndex: 22, icon: '🐠', title: 'Underwater Lab',
      blurb: 'Build a science lab under the sea!',
      intro: 'Blub blub! This week we build a lab under the sea.',
      done: 'The lab is ready! The fish say hello!',
      steps: [
        { id: 'lab-lights', world: 'circuits', base: 'c14', title: 'Lab Lights',
          say: 'Three lab rooms need bright lights.',
          goal: 'Light all three houses BRIGHT!' },
        { id: 'coral-pond', world: 'robot', base: 'r11', title: 'Coral Pond',
          say: 'Robo walks round the coral pond.',
          goal: 'Walk around the pond to the flag.' },
        { id: 'bubble-launch', world: 'machines', base: 'm15', title: 'Bubble Launch',
          say: 'Send the box up with a bubble boost!',
          goal: 'Drop the ball on the seesaw to launch the box!' },
        { id: 'sub-bridge', world: 'bridges', base: 'b13', title: 'Sub Bridge',
          say: 'A submarine passes under the bridge.',
          goal: 'A boat sails under! Build up high, not down low.' },
        { id: 'sandy-seabed', world: 'construction', title: 'Sandy Seabed',
          say: 'The seabed is bumpy.',
          goal: 'Push the sand into the holes!',
          level: { hint: 'Get behind the dirt, then push it into the hole!', stages: [{ type: 'doze', map: ['.....', '..ov.', 'O....', '...oO'] }], solution: [['U', 'L', 'D', 'R', 'D', 'L', 'L', 'D', 'R', 'R']] } }
      ]
    },

    /* ---------- Week 24 ---------- */
    {
      id: 'airport', weekIndex: 23, icon: '✈️', title: 'Airport',
      blurb: 'Runways, lights and bags for the planes!',
      intro: 'Zoom! This week we build an airport.',
      done: 'The planes take off! Have a great flight!',
      steps: [
        { id: 'runway-holes', world: 'construction', base: 'k12', title: 'Runway Holes',
          say: 'The runway has holes!',
          goal: 'Fill the holes in the road so the truck can drive!' },
        { id: 'long-runway', world: 'bridges', base: 'b14', title: 'Long Runway',
          say: 'A very long bridge to the runway.',
          goal: 'A very long river! Use both rocks.' },
        { id: 'night-runway', world: 'circuits', base: 'c15', title: 'Night Runway',
          say: 'Night time at the airport. The pilots are sleeping!',
          goal: 'Light the house. Keep the sleepy house dark!' },
        { id: 'plane-stairs', world: 'robot', base: 'r10', title: 'Plane Stairs',
          say: 'Robo climbs the plane stairs.',
          goal: 'Climb the stairs! The steps repeat.' },
        { id: 'bag-lift', world: 'machines', base: 'm16', title: 'Bag Lift',
          say: 'Lift the suitcase box up!',
          goal: 'Send the ball into the bucket to lift the box!' }
      ]
    },

    /* ---------- Week 25 ---------- */
    {
      id: 'jungle', weekIndex: 24, icon: '🌴', title: 'Jungle Expedition',
      blurb: 'Explore the jungle with bridges and Robo!',
      intro: 'This week we explore the deep green jungle!',
      done: 'What an adventure! You explored the whole jungle!',
      steps: [
        { id: 'jungle-loops', world: 'robot', base: 'r12', title: 'Jungle Loops',
          say: 'The jungle path loops round and round.',
          goal: 'Use two Repeat blocks!' },
        { id: 'vine-bridge', world: 'bridges', base: 'b10', title: 'Vine Bridge',
          say: 'The jungle river is wide.',
          goal: 'Steel beams are extra strong. Try them!' },
        { id: 'jungle-trail', world: 'robot', title: 'Jungle Trail',
          say: 'Robo looks for jungle fruit.',
          goal: 'Follow the trail, grab the fruit and reach the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['TT....', 'TT.TT^', 'TTG.FT', 'TTTTTT'], blocks: ['F', 'L', 'R'], par: 11, solution: [{ t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'jungle-fans', world: 'circuits', base: 'c16', title: 'Jungle Fans',
          say: 'It is so hot in the jungle!',
          goal: 'Make BOTH fans spin FAST!' },
        { id: 'lookout-tower', world: 'construction', base: 'k11', title: 'Lookout Tower',
          say: 'Build a tall lookout tower!',
          goal: 'Build the tower on the X. Big block at the bottom!' }
      ]
    },

    /* ---------- Week 26 ---------- */
    {
      id: 'pizza-delivery', weekIndex: 25, icon: '🍕', title: 'Pizza Delivery',
      blurb: 'Bake pizza and deliver it hot!',
      intro: 'Mmm, pizza! This week we run a pizza shop.',
      done: 'Every pizza is delivered hot! Delicious work!',
      steps: [
        { id: 'pizza-route', world: 'robot', title: 'Pizza Route',
          say: 'Hot pizza! Robo delivers it fast.',
          goal: 'Grab the pizza and reach the flag!',
          level: { hint: 'Count the squares, then turn at each corner!', map: ['TT..<T', 'TTGTTT', 'TT.TFT', 'TT...T'], blocks: ['F', 'L', 'R'], par: 11, solution: [{ t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }] } },
        { id: 'pizza-shop', world: 'construction', base: 'k13', title: 'Pizza Shop',
          say: 'Build a tall pizza shop!',
          goal: 'Build a tall house with two floors!' },
        { id: 'pizza-oven', world: 'machines', base: 'm18', title: 'Pizza Oven',
          say: 'The pizza oven is a big machine!',
          goal: 'Build a big machine! Ramp, wedge, pulley!' },
        { id: 'oven-wires', world: 'circuits', base: 'c18', title: 'Oven Wires',
          say: 'The oven wires are twisted!',
          goal: 'Turn the wires so the power can go round!' },
        { id: 'pizza-bus', world: 'bridges', base: 'b15', title: 'Pizza Bus',
          say: 'A bus full of hungry kids is coming!',
          goal: 'A big bus full of kids! Make it strong.' }
      ]
    },

    /* ---------- Week 27 ---------- */
    {
      id: 'amusement-park', weekIndex: 26, icon: '🎡', title: 'Amusement Park',
      blurb: 'Coasters, lights and bumper cars!',
      intro: 'Wheee! This week we build an amusement park.',
      done: 'The park is open! Everyone is having fun!',
      steps: [
        { id: 'coaster-ramps', world: 'machines', base: 'm19', title: 'Coaster Ramps',
          say: 'Build a roller coaster with ramps!',
          goal: 'Three ramps! Make a path down to the basket.' },
        { id: 'park-lamps', world: 'circuits', base: 'c19', title: 'Park Lamps',
          say: 'Light every lamp on the park path!',
          goal: 'Put a lamp in each gap to light the street!' },
        { id: 'bumper-cars', world: 'robot', base: 'r13', title: 'Bumper Cars',
          say: 'Robo drives a bumper car!',
          goal: 'Robo can check for walls! Turn only when a wall is ahead.' },
        { id: 'sky-ride', world: 'bridges', base: 'b12', title: 'Sky Ride',
          say: 'The sky ride hangs from tall towers.',
          goal: 'Tall towers! Hang the road from the towers.' },
        { id: 'domino-bump', world: 'machines', base: 'm20', title: 'Domino Bump',
          say: 'Start a chain reaction at the fun fair!',
          goal: 'Start a chain reaction! Bump the balls to the basket.' }
      ]
    },

    /* ---------- Week 28 ---------- */
    {
      id: 'mars-rover', weekIndex: 27, icon: '🛰️', title: 'Mars Rover',
      blurb: 'Drive a rover on the red planet!',
      intro: 'This week Robo is a Mars rover on the red planet!',
      done: 'The rover finished its mission! Mars says thanks!',
      steps: [
        { id: 'rover-loop', world: 'robot', base: 'r14', title: 'Rover Loop',
          say: 'The rover drives until it finds the flag.',
          goal: 'Repeat forever until Robo finds the flag!' },
        { id: 'red-road', world: 'construction', base: 'k14', title: 'Red Road',
          say: 'Clear the red Mars road!',
          goal: 'Clear the road! Dirt in the hole, rock in the truck.' },
        { id: 'rover-power', world: 'circuits', base: 'c20', title: 'Rover Power',
          say: 'The rover has two power switches.',
          goal: 'Two switches! Turn BOTH on to light the house.' },
        { id: 'mars-base-plot', world: 'construction', title: 'Mars Base Plot',
          say: 'Make the ground flat for the Mars base.',
          goal: 'Push the red dust into the holes!',
          level: { hint: 'Get behind the dirt, then push it into the hole!', stages: [{ type: 'doze', map: ['....O', '....o', '.....', 'Oo<..'] }], solution: [['L', 'U', 'R', 'R', 'R', 'U']] } },
        { id: 'rock-belt', world: 'machines', base: 'm21', title: 'Rock Belt',
          say: 'The belt carries Mars rocks to the base.',
          goal: 'A belt can carry a box! Turn the belt on.' }
      ]
    },

    /* ---------- Week 29 ---------- */
    {
      id: 'bakery', weekIndex: 28, icon: '🧁', title: 'Cupcake Bakery',
      blurb: 'Belts, mixers and stacks of cake!',
      intro: 'Smells yummy! This week we run a bakery.',
      done: 'The bakery is full of cupcakes! Sweet job!',
      steps: [
        { id: 'slow-belt', world: 'machines', base: 'm22', title: 'Slow Belt',
          say: 'Careful! The cupcakes must go slowly.',
          goal: 'Too fast and the ball flies past! Make the belt slow.' },
        { id: 'cake-layers', world: 'construction', title: 'Cake Layers',
          say: 'Stack the cake layers!',
          goal: 'Stack the cake layers on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [['Y2', 'R1'], ['S3'], []], hook: 0, goals: [{ col: 1, stack: ['S3', 'Y2', 'R1'] }] }], solution: [['G', 'R', 'R', 'G', 'L', 'L', 'G', 'R', 'G', 'R', 'G', 'L', 'G']] } },
        { id: 'mixer-fan', world: 'circuits', base: 'c21', title: 'Mixer Fan',
          say: 'The mixer fan must spin!',
          goal: 'Make the fan spin! Go round the corners.' },
        { id: 'cookie-spiral', world: 'robot', base: 'r15', title: 'Cookie Spiral',
          say: 'Robo follows the cookie spiral!',
          goal: 'This spiral turns LEFT at every wall.' },
        { id: 'flour-truck', world: 'bridges', base: 'b17', title: 'Flour Truck',
          say: 'The flour truck crosses the grand bridge!',
          goal: 'The biggest bridge of all! A truck is coming.' }
      ]
    },

    /* ---------- Week 30 ---------- */
    {
      id: 'new-school', weekIndex: 29, icon: '🏫', title: 'New School',
      blurb: 'Build a school with a bell tower!',
      intro: 'This week we build a brand new school!',
      done: 'The school is ready for the first day! Great job!',
      steps: [
        { id: 'bell-tower', world: 'construction', base: 'k15', title: 'Bell Tower',
          say: 'Stack the bell tower blocks!',
          goal: 'Build a tower of three blocks on the X!' },
        { id: 'school-yard', world: 'construction', base: 'k16', title: 'School Yard',
          say: 'Make the yard flat, then build the school!',
          goal: 'First make the ground flat. Then build a house!' },
        { id: 'nap-time', world: 'circuits', base: 'c22', title: 'Nap Time',
          say: 'One class is napping!',
          goal: 'Turn OFF the sleepy house. Light the other house!' },
        { id: 'long-hallway', world: 'robot', base: 'r16', title: 'Long Hallway',
          say: 'Robo grabs the chalk at the end of the hall!',
          goal: 'Grab the gear at the end, then turn all the way around!' },
        { id: 'road-logs', world: 'machines', base: 'm23', title: 'Road Logs',
          say: 'Logs block the road to school!',
          goal: 'Two logs are in the way. Split them both!' }
      ]
    },

    /* ---------- Week 31 ---------- */
    {
      id: 'hospital', weekIndex: 30, icon: '🏥', title: 'Hospital Heroes',
      blurb: 'Build a hospital and help the doctors!',
      intro: 'This week we help the doctors and nurses.',
      done: 'The hospital is ready to help everyone! Hero!',
      steps: [
        { id: 'big-stairs', world: 'robot', base: 'r17', title: 'Big Stairs',
          say: 'Robo takes medicine up the big stairs!',
          goal: 'Big stairs! Repeat the step pattern forever.' },
        { id: 'ambulance-bus', world: 'bridges', base: 'b18', title: 'Ambulance Bus',
          say: 'The ambulance bus must cross!',
          goal: 'The bus is back! Use the low bolts and the rock.' },
        { id: 'ward-lights', world: 'circuits', base: 'c23', title: 'Ward Lights',
          say: 'Three hospital rooms need bright light!',
          goal: 'Make all three houses BRIGHT!' },
        { id: 'supply-fly', world: 'machines', base: 'm24', title: 'Supply Fly',
          say: 'Send the supplies up, then roll them in!',
          goal: 'Launch the box, then help it roll to the star!' },
        { id: 'clinic-build', world: 'construction', title: 'Clinic Build',
          say: 'Lift the bricks, then build the clinic!',
          goal: 'Lift the bricks onto the X, then build the clinic!',
          level: { hint: 'Crane first. Then build: foundation, walls, door, windows, and the roof last!', stages: [{ type: 'crane', cols: [[], [], ['B3']], hook: 0, goals: [{ col: 1, stack: ['B3'] }] }, { type: 'build', house: { floors: 1, windows: [2], color: '#7ed957' }, tray: ['found', 'walls', 'window', 'door', 'flat', 'roof'] }], solution: [['R', 'R', 'G', 'L', 'G'], ['found', 'walls', 'door', 'window', 'window', 'roof']] } }
      ]
    },

    /* ---------- Week 32 ---------- */
    {
      id: 'recycling', weekIndex: 31, icon: '♻️', title: 'Recycling Plant',
      blurb: 'Sort, crush and reuse everything!',
      intro: 'Reduce, reuse, recycle! This week we build a recycling plant.',
      done: 'The planet says thank you! Super recycler!',
      steps: [
        { id: 'fix-the-road', world: 'bridges', base: 'b19', title: 'Fix the Road',
          say: 'The road to the plant has a hole!',
          goal: 'Oh no, a hole in the road! Can you fix it?' },
        { id: 'lamp-mixup', world: 'circuits', base: 'c24', title: 'Lamp Mixup',
          say: 'Someone put the lamp in the wrong spot!',
          goal: 'The lamp is in the wrong spot! Move it into the gap.' },
        { id: 'sorting-gears', world: 'machines', base: 'm25', title: 'Sorting Gears',
          say: 'The sorting machine needs gears!',
          goal: 'Fill the gear train. The belt must go fast!' },
        { id: 'crush-cubes', world: 'construction', title: 'Crush Cubes',
          say: 'Stack the squashed cubes.',
          goal: 'Stack the cubes on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [[], ['S2', 'R1'], ['Y3']], hook: 0, goals: [{ col: 2, stack: ['Y3', 'S2', 'R1'] }] }], solution: [['R', 'G', 'L', 'G', 'R', 'G', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'sorting-maze', world: 'robot', base: 'r18', title: 'Sorting Maze',
          say: 'Robo sorts bottles in the biggest maze!',
          goal: 'The biggest maze! Can you solve it with just 4 blocks?' }
      ]
    },

    /* ---------- Week 33 ---------- */
    {
      id: 'volcano-island', weekIndex: 32, icon: '🌋', title: 'Volcano Island',
      blurb: 'Bridges and machines near the volcano!',
      intro: 'Rumble rumble! This week we visit Volcano Island.',
      done: 'The island is safe! You beat the volcano!',
      steps: [
        { id: 'lava-bridge', world: 'bridges', base: 'b20', title: 'Lava Bridge',
          say: 'The bridge goes over hot lava!',
          goal: 'One wood beam is too weak for the truck. Swap it for steel!' },
        { id: 'rocky-road', world: 'robot', base: 'r19', title: 'Rocky Road',
          say: 'Rocks fell from the volcano!',
          goal: 'Rocks block the way too! Go along, then up.' },
        { id: 'cool-fans', world: 'circuits', base: 'c25', title: 'Cool Fans',
          say: 'The lab is hot! The fans must spin fast.',
          goal: 'Two fans in a row! Add a battery to make them spin FAST.' },
        { id: 'lava-rocks', world: 'construction', title: 'Lava Rocks',
          say: 'Volcano rocks and holes everywhere!',
          goal: 'Rocks in the truck, dirt in the holes!',
          level: { hint: 'Rocks go in the truck, dirt goes in the holes. Get behind it, then push!', stages: [{ type: 'doze', map: ['..O...', '......', '.ovr..', 'X.....'] }], solution: [['U', 'R', 'D', 'R', 'D', 'L', 'L', 'L', 'U', 'U', 'L', 'U', 'R']] } },
        { id: 'bump-lift', world: 'machines', base: 'm26', title: 'Bump Lift',
          say: 'Bump the ball to lift the rescue box!',
          goal: 'Bump the ball into the bucket to lift the box!' }
      ]
    },

    /* ---------- Week 34 ---------- */
    {
      id: 'arctic-base', weekIndex: 33, icon: '🐧', title: 'Arctic Base',
      blurb: 'Ice, snow and penguins!',
      intro: 'Brrr! This week we build a base near the North Pole.',
      done: 'The arctic base is snug and warm! Cool job!',
      steps: [
        { id: 'ski-slope', world: 'robot', title: 'Ski Slope',
          say: 'Robo skis down the slope!',
          goal: 'Ski down to the flag and grab every gear!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['TTTTTT', 'TvT.GF', 'T.TGTT', 'T.T.TT', 'T...TT'], blocks: ['F', 'L', 'R', 'rep'], par: 13, solution: [{ t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'ice-tower', world: 'bridges', base: 'b21', title: 'Ice Tower',
          say: 'Only one ice tower holds this bridge.',
          goal: 'Only one tower! Use the tower and the low bolt.' },
        { id: 'igloo-town', world: 'circuits', base: 'c26', title: 'Igloo Town',
          say: 'The igloo town needs power!',
          goal: 'Make the fan FAST and both houses BRIGHT!' },
        { id: 'penguin-lift', world: 'machines', base: 'm27', title: 'Penguin Lift',
          say: 'Lift the penguin food box!',
          goal: 'The belt can drop the ball in the bucket. Lift the box!' },
        { id: 'polar-base', world: 'construction', base: 'k18', title: 'Polar Base',
          say: 'Clear the snow, lift the bricks, build the base!',
          goal: 'Clear the plot, lift the bricks and build a big house!' }
      ]
    },

    /* ---------- Week 35 ---------- */
    {
      id: 'music-festival', weekIndex: 34, icon: '🎸', title: 'Music Festival',
      blurb: 'Lights, sound and a big stage!',
      intro: 'La la la! This week we build a music festival.',
      done: 'The band is playing! What a party!',
      steps: [
        { id: 'stage-lights', world: 'circuits', base: 'c27', title: 'Stage Lights',
          say: 'The big stage needs power!',
          goal: 'Big city! Fan FAST, house BRIGHT. Shh, one house sleeps!' },
        { id: 'stage-bridge', world: 'bridges', base: 'b22', title: 'Stage Bridge',
          say: 'The bridge to the stage is lopsided!',
          goal: 'A low bolt on one side only. Make the other side strong!' },
        { id: 'fix-the-dance', world: 'robot', base: 'r20', title: 'Fix the Dance',
          say: 'Robo\'s dance program has a bug!',
          goal: 'Oh no, this program has a bug! Tap Play, then fix it.' },
        { id: 'sound-machine', world: 'machines', base: 'm28', title: 'Sound Machine',
          say: 'Build the biggest sound machine!',
          goal: 'The biggest machine! Gear, wedge and pulley!' },
        { id: 'music-hall', world: 'construction', title: 'Music Hall',
          say: 'Lift the bricks, then build the music hall!',
          goal: 'Lift the bricks onto the X, then build the music hall!',
          level: { hint: 'Crane first. Then build: foundation, walls, door, windows, and the roof last!', stages: [{ type: 'crane', cols: [['B3'], [], ['R2']], hook: 0, goals: [{ col: 1, stack: ['B3', 'R2'] }] }, { type: 'build', house: { floors: 2, windows: [1, 2], color: '#b197fc' }, tray: ['thin', 'found', 'walls', 'window', 'door', 'flat', 'roof'] }], solution: [['G', 'R', 'G', 'R', 'G', 'L', 'G'], ['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'roof']] } }
      ]
    },

    /* ---------- Week 36 ---------- */
    {
      id: 'robot-olympics', weekIndex: 35, icon: '🥇', title: 'Robot Olympics',
      blurb: 'Robo races in five coding events!',
      intro: 'Welcome to the Robot Olympics! Five events for Robo.',
      done: 'Gold medal! Robo is the champion, and so are you!',
      steps: [
        { id: 'downhill-race', world: 'robot', base: 'r21', title: 'Downhill Race',
          say: 'Event one: race down the stairs!',
          goal: 'Walk down the stairs. Find the pattern!' },
        { id: 'gear-sprint', world: 'robot', base: 'r22', title: 'Gear Sprint',
          say: 'Event two: grab every gear!',
          goal: 'There are many ways to the flag. Pick the way with the gears!' },
        { id: 'wall-run', world: 'robot', base: 'r23', title: 'Wall Run',
          say: 'Event three: run round the trees!',
          goal: 'Use the wall trick to walk around the trees!' },
        { id: 'bug-relay', world: 'robot', base: 'r24', title: 'Bug Relay',
          say: 'Event four: Robo turns the wrong way!',
          goal: 'Another bug! Robo turns the wrong way. Can you fix it?' },
        { id: 'lake-marathon', world: 'robot', base: 'r25', title: 'Lake Marathon',
          say: 'The last event: run all the way round the lake!',
          goal: 'Walk all the way around the lake!' }
      ]
    },

    /* ---------- Week 37 ---------- */
    {
      id: 'treehouse', weekIndex: 36, icon: '🌳', title: 'Treehouse Village',
      blurb: 'Rope bridges and treehouses!',
      intro: 'This week we build a village up in the trees!',
      done: 'The treehouse village is finished! So high up!',
      steps: [
        { id: 'rope-bridge', world: 'bridges', base: 'b23', title: 'Rope Bridge',
          say: 'Hang the bridge between the trees!',
          goal: 'A truck and tall towers. Hang the road with steel!' },
        { id: 'lift-planks', world: 'construction', title: 'Lift Planks',
          say: 'Lift the planks up to the treehouse!',
          goal: 'Stack the planks on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [[], [], ['R2'], ['B3', 'G1']], hook: 0, goals: [{ col: 3, stack: ['B3', 'R2', 'G1'] }] }], solution: [['R', 'R', 'R', 'G', 'L', 'L', 'G', 'R', 'G', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'lantern-twins', world: 'circuits', base: 'c6', title: 'Lantern Twins',
          say: 'Two treehouses need lanterns.',
          goal: 'Make BOTH houses bright! Give each one its own path.' },
        { id: 'zip-line', world: 'machines', base: 'm9', title: 'Zip Line',
          say: 'The ball rides the zip line belt!',
          goal: 'The ball must jump the gap! Make the belt go fast.' },
        { id: 'branch-walk', world: 'robot', base: 'r26', title: 'Branch Walk',
          say: 'Robo grabs the acorn at the top!',
          goal: 'Grab the gear at the top, then turn around to the flag!' }
      ]
    },

    /* ---------- Week 38 ---------- */
    {
      id: 'flood-defense', weekIndex: 37, icon: '☔', title: 'Flood Defense',
      blurb: 'Stop the water and keep the town dry!',
      intro: 'Big rain is coming! This week we keep the town dry.',
      done: 'The town stayed dry! You saved it!',
      steps: [
        { id: 'save-coins', world: 'bridges', base: 'b24', title: 'Save Coins',
          say: 'The flood bridge costs too many coins!',
          goal: 'This bridge costs too many coins. Erase the extra beams!' },
        { id: 'sandbags', world: 'construction', title: 'Sandbags',
          say: 'Stop the water with sandbags!',
          goal: 'Push the sandbags into the holes!',
          level: { hint: 'Rocks go in the truck, dirt goes in the holes. Get behind it, then push!', stages: [{ type: 'doze', map: ['...O..', '...o.X', '..rv..', '......'] }], solution: [['U', 'D', 'D', 'L', 'U', 'L', 'U', 'R', 'R', 'R']] } },
        { id: 'storm-night', world: 'circuits', base: 'c17', title: 'Storm Night',
          say: 'It is a stormy night in town.',
          goal: 'Light both houses BRIGHT. Shh, one house is sleeping!' },
        { id: 'pump-lift', world: 'machines', base: 'm16', title: 'Pump Lift',
          say: 'Lift the water pump box!',
          goal: 'Send the ball into the bucket to lift the box!' },
        { id: 'rain-spiral', world: 'robot', base: 'r27', title: 'Rain Spiral',
          say: 'Robo grabs every raindrop gear!',
          goal: 'A big spiral full of gears. Grab them all!' }
      ]
    },

    /* ---------- Week 39 ---------- */
    {
      id: 'moon-base', weekIndex: 38, icon: '🌙', title: 'Moon Base',
      blurb: 'Build a base on the moon!',
      intro: 'This week we fly to the moon and build a base!',
      done: 'The moon base is ready! One small step for Salah!',
      steps: [
        { id: 'crater-arch', world: 'bridges', base: 'b25', title: 'Crater Arch',
          say: 'The moon bus must cross a deep crater!',
          goal: 'Deep bolts again, and a big bus. Build a strong arch!' },
        { id: 'moon-cargo', world: 'construction', title: 'Moon Cargo',
          say: 'Stack the moon cargo!',
          goal: 'Stack the moon cargo on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [['B1'], [], ['R2'], ['Y3']], hook: 0, goals: [{ col: 3, stack: ['Y3', 'R2', 'B1'] }] }], solution: [['R', 'R', 'G', 'R', 'G', 'L', 'L', 'L', 'G', 'R', 'R', 'R', 'G']] } },
        { id: 'air-fans', world: 'circuits', base: 'c16', title: 'Air Fans',
          say: 'The moon base air fans must spin!',
          goal: 'Make BOTH fans spin FAST!' },
        { id: 'moon-machine', world: 'machines', base: 'm18', title: 'Moon Machine',
          say: 'Build the moon machine!',
          goal: 'Build a big machine! Ramp, wedge, pulley!' },
        { id: 'crater-maze', world: 'robot', base: 'r28', title: 'Crater Maze',
          say: 'The final crater maze!',
          goal: 'The final maze! Turn Robo first, then use the wall trick.' }
      ]
    },

    /* ---------- Week 40 ---------- */
    {
      id: 'farm-market', weekIndex: 39, icon: '🍎', title: 'Farm Market',
      blurb: 'Pick apples and build a market!',
      intro: 'This week we pick fruit and open a farm market.',
      done: 'The market is busy and the fruit is fresh! Yum!',
      steps: [
        { id: 'apple-picking', world: 'robot', title: 'Apple Picking',
          say: 'Robo picks apples in the orchard.',
          goal: 'Grab the apples and reach the flag!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['~~~TFT~', 'TvTT.~T', 'G.TT.TT', 'GTTT.T~', '.....TT'], blocks: ['F', 'L', 'R', 'rep'], par: 16, solution: [{ t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'market-bridge', world: 'bridges', base: 'b26', title: 'Market Bridge',
          say: 'The market bus must cross the river!',
          goal: 'Towers and a rock! Use them all to hold the bus.' },
        { id: 'juice-bar', world: 'circuits', base: 'c13', title: 'Juice Bar',
          say: 'The juice bar needs a fan and a bright lamp!',
          goal: 'Make the fan spin FAST and the house BRIGHT!' },
        { id: 'market-stall', world: 'construction', title: 'Market Stall',
          say: 'Lift the bricks, then build the market!',
          goal: 'Lift the bricks onto the X, then build the market!',
          level: { hint: 'Crane first. Then build: foundation, walls, door, windows, and the roof last!', stages: [{ type: 'crane', cols: [['R2'], ['B3'], []], hook: 0, goals: [{ col: 2, stack: ['B3', 'R2'] }] }, { type: 'build', house: { floors: 2, windows: [1, 2], color: '#74c0fc' }, tray: ['thin', 'found', 'walls', 'window', 'door', 'flat', 'roof'] }], solution: [['R', 'G', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G'], ['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'roof']] } },
        { id: 'fruit-belt', world: 'machines', base: 'm13', title: 'Fruit Belt',
          say: 'Fruit rides the belt to the basket!',
          goal: 'Start the belt, then catch the ball with a ramp!' }
      ]
    },

    /* ---------- Week 41 ---------- */
    {
      id: 'lighthouse-bay', weekIndex: 40, icon: '🏝️', title: 'Lighthouse Bay',
      blurb: 'A lighthouse keeps the ships safe!',
      intro: 'This week we build a lighthouse by the sea.',
      done: 'The lighthouse shines! The ships are safe!',
      steps: [
        { id: 'lighthouse', world: 'construction', title: 'Lighthouse',
          say: 'Stack the lighthouse tower!',
          goal: 'Stack the tower on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [['R1'], ['B2'], [], ['G3']], hook: 0, goals: [{ col: 2, stack: ['G3', 'B2', 'R1'] }] }], solution: [['R', 'R', 'R', 'G', 'L', 'G', 'L', 'G', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'beacon-sparks', world: 'circuits', base: 'c10', title: 'Beacon Sparks',
          say: 'The lighthouse wire is sparking!',
          goal: 'Sparks! Take away the shortcut wire and put a lamp there.' },
        { id: 'ship-bridge', world: 'bridges', base: 'b16', title: 'Ship Bridge',
          say: 'A ship sails under the bridge!',
          goal: 'A truck on top, a boat below. Use steel!' },
        { id: 'beach-walk', world: 'robot', title: 'Beach Walk',
          say: 'Robo walks along the beach.',
          goal: 'Walk the beach, grab the shells and reach the flag!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['TTTv~FT', 'TTT.~.T', 'TT..TG~', 'TT.TT.T', 'T~...GT'], blocks: ['F', 'L', 'R', 'rep'], par: 16, solution: [{ t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'wave-machine', world: 'machines', base: 'm20', title: 'Wave Machine',
          say: 'Start the wave machine!',
          goal: 'Start a chain reaction! Bump the balls to the basket.' }
      ]
    },

    /* ---------- Week 42 ---------- */
    {
      id: 'desert-oasis', weekIndex: 41, icon: '🐪', title: 'Desert Oasis',
      blurb: 'Sand, sun and a cool oasis!',
      intro: 'This week we cross the desert to a cool oasis.',
      done: 'You reached the oasis! Time for a cool drink!',
      steps: [
        { id: 'sand-dunes', world: 'construction', title: 'Sand Dunes',
          say: 'The desert road is full of sand!',
          goal: 'Push the sand into the holes!',
          level: { hint: 'Rocks go in the truck, dirt goes in the holes. Get behind it, then push!', stages: [{ type: 'doze', map: ['X.r...', '......', 'v...oO', '......'] }], solution: [['R', 'R', 'R', 'R', 'U', 'U', 'L', 'L', 'L']] } },
        { id: 'oasis-bridge', world: 'bridges', base: 'b21', title: 'Oasis Bridge',
          say: 'One tower holds the oasis bridge.',
          goal: 'Only one tower! Use the tower and the low bolt.' },
        { id: 'palm-lamps', world: 'circuits', base: 'c24', title: 'Palm Lamps',
          say: 'The palm tree lamp is in the wrong spot!',
          goal: 'The lamp is in the wrong spot! Move it into the gap.' },
        { id: 'oasis-loop', world: 'robot', base: 'r25', title: 'Oasis Loop',
          say: 'Robo walks round the oasis lake!',
          goal: 'Walk all the way around the lake!' },
        { id: 'water-pump', world: 'machines', base: 'm26', title: 'Water Pump',
          say: 'Pump water up from the well!',
          goal: 'Bump the ball into the bucket to lift the box!' }
      ]
    },

    /* ---------- Week 43 ---------- */
    {
      id: 'mountain-tunnel', weekIndex: 42, icon: '⛰️', title: 'Mountain Tunnel',
      blurb: 'Dig a tunnel through the mountain!',
      intro: 'This week we dig a tunnel through a big mountain.',
      done: 'The tunnel is open! Trains can go through!',
      steps: [
        { id: 'tunnel-road', world: 'construction', base: 'k14', title: 'Tunnel Road',
          say: 'Clear the road to the tunnel!',
          goal: 'Clear the road! Dirt in the hole, rock in the truck.' },
        { id: 'mountain-truck', world: 'bridges', base: 'b17', title: 'Mountain Truck',
          say: 'A truck carries rocks over the mountain bridge!',
          goal: 'The biggest bridge of all! A truck is coming.' },
        { id: 'dark-tunnel', world: 'robot', title: 'Dark Tunnel',
          say: 'Robo drives through the dark tunnel.',
          goal: 'Drive through the tunnel and grab every gear!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['TT~~TTT', 'F~TT~TT', '.TG...~', '.T.~~.T', '.G.TT^T'], blocks: ['F', 'L', 'R', 'rep'], par: 16, solution: [{ t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'tunnel-lights', world: 'circuits', base: 'c26', title: 'Tunnel Lights',
          say: 'The tunnel needs lights and a fan!',
          goal: 'Make the fan FAST and both houses BRIGHT!' },
        { id: 'drill-gears', world: 'machines', base: 'm25', title: 'Drill Gears',
          say: 'The big drill needs a gear train!',
          goal: 'Fill the gear train. The belt must go fast!' }
      ]
    },

    /* ---------- Week 44 ---------- */
    {
      id: 'stadium', weekIndex: 43, icon: '🏟️', title: 'Big Stadium',
      blurb: 'Build a stadium for the big game!',
      intro: 'This week we build a stadium for the big football match!',
      done: 'Goal! The stadium is full and cheering for you!',
      steps: [
        { id: 'stadium-build', world: 'construction', title: 'Stadium Build',
          say: 'Lift the bricks, then build the stadium!',
          goal: 'Lift the bricks onto the X, then build the stadium!',
          level: { hint: 'Crane first. Then build: foundation, walls, door, windows, and the roof last!', stages: [{ type: 'crane', cols: [['R2'], [], ['Y3']], hook: 0, goals: [{ col: 1, stack: ['Y3', 'R2'] }] }, { type: 'build', house: { floors: 2, windows: [1, 2], color: '#ffb35c' }, tray: ['thin', 'found', 'walls', 'window', 'door', 'flat', 'roof'] }], solution: [['R', 'R', 'G', 'L', 'G', 'L', 'G', 'R', 'G'], ['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'roof']] } },
        { id: 'flood-lights', world: 'circuits', base: 'c23', title: 'Flood Lights',
          say: 'The stadium needs bright flood lights!',
          goal: 'Make all three houses BRIGHT!' },
        { id: 'fan-parade', world: 'bridges', base: 'b27', title: 'Fan Parade',
          say: 'The fans parade to the stadium!',
          goal: 'The last bridge! A bus parade is coming!' },
        { id: 'ball-launch', world: 'machines', base: 'm24', title: 'Ball Launch',
          say: 'Launch the ball, then roll it to the goal!',
          goal: 'Launch the box, then help it roll to the star!' },
        { id: 'team-bus', world: 'robot', base: 'r22', title: 'Team Bus',
          say: 'The team bus picks up every player!',
          goal: 'There are many ways to the flag. Pick the way with the gears!' }
      ]
    },

    /* ---------- Week 45 ---------- */
    {
      id: 'museum', weekIndex: 44, icon: '🏛️', title: 'Museum Night',
      blurb: 'Lights, displays and a dinosaur skeleton!',
      intro: 'This week we build a museum full of treasures.',
      done: 'The museum is open! Everyone loves it!',
      steps: [
        { id: 'statue-stack', world: 'construction', title: 'Statue Stack',
          say: 'Stack the statue blocks!',
          goal: 'Stack the statue on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [['P1'], ['Y3'], ['R2'], []], hook: 0, goals: [{ col: 2, stack: ['Y3', 'R2', 'P1'] }] }], solution: [['R', 'R', 'G', 'R', 'G', 'L', 'L', 'G', 'R', 'G', 'R', 'G', 'L', 'G', 'L', 'L', 'G', 'R', 'R', 'G']] } },
        { id: 'quiet-rooms', world: 'circuits', base: 'c22', title: 'Quiet Rooms',
          say: 'Some museum rooms must stay dark.',
          goal: 'Turn OFF the sleepy house. Light the other house!' },
        { id: 'museum-tour', world: 'robot', base: 'r23', title: 'Museum Tour',
          say: 'Robo walks round the displays!',
          goal: 'Use the wall trick to walk around the trees!' },
        { id: 'big-display', world: 'machines', base: 'm28', title: 'Big Display',
          say: 'The biggest machine in the museum!',
          goal: 'The biggest machine! Gear, wedge and pulley!' },
        { id: 'museum-arch', world: 'bridges', base: 'b25', title: 'Museum Arch',
          say: 'The museum bus crosses the big arch!',
          goal: 'Deep bolts again, and a big bus. Build a strong arch!' }
      ]
    },

    /* ---------- Week 46 ---------- */
    {
      id: 'ski-resort', weekIndex: 45, icon: '🎿', title: 'Ski Resort',
      blurb: 'Lifts, slopes and snowy lodges!',
      intro: 'This week we build a ski resort in the mountains.',
      done: 'Whoosh! The ski resort is open! Great job!',
      steps: [
        { id: 'slalom', world: 'robot', title: 'Slalom',
          say: 'Robo skis the slalom course!',
          goal: 'Ski the slalom, grab every gear and reach the flag!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['F..G.TT', 'TTTT...', '~~TTT~.', 'T~....G', '~T^~TTT', '~TTTT~T'], blocks: ['F', 'L', 'R', 'rep'], par: 19, solution: [{ t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'ski-lift', world: 'machines', base: 'm27', title: 'Ski Lift',
          say: 'The ski lift carries the box up!',
          goal: 'The belt can drop the ball in the bucket. Lift the box!' },
        { id: 'cable-car', world: 'bridges', base: 'b23', title: 'Cable Car',
          say: 'The cable car hangs from steel cables!',
          goal: 'A truck and tall towers. Hang the road with steel!' },
        { id: 'snow-groomer', world: 'construction', title: 'Snow Groomer',
          say: 'The ski slope is bumpy!',
          goal: 'Rocks in the truck, snow in the holes!',
          level: { hint: 'Rocks go in the truck, dirt goes in the holes. Get behind it, then push!', stages: [{ type: 'doze', map: ['..T.oO', '..r.>.', '......', '.Oo...', 'X.....'] }], solution: [['D', 'D', 'L', 'L', 'U', 'R', 'U', 'U', 'R', 'D', 'L', 'L', 'L', 'U', 'L', 'D', 'D', 'D']] } },
        { id: 'lodge-fans', world: 'circuits', base: 'c25', title: 'Lodge Fans',
          say: 'The ski lodge fans must spin fast!',
          goal: 'Two fans in a row! Add a battery to make them spin FAST.' }
      ]
    },

    /* ---------- Week 47 ---------- */
    {
      id: 'science-fair', weekIndex: 46, icon: '🔬', title: 'Science Fair',
      blurb: 'Show your best inventions!',
      intro: 'This week is the science fair! Show your best inventions.',
      done: 'First prize! Your inventions won the science fair!',
      steps: [
        { id: 'light-show', world: 'circuits', base: 'c27', title: 'Light Show',
          say: 'Your first invention: a light show!',
          goal: 'Big city! Fan FAST, house BRIGHT. Shh, one house sleeps!' },
        { id: 'log-splitter', world: 'machines', base: 'm23', title: 'Log Splitter',
          say: 'Your second invention splits logs!',
          goal: 'Two logs are in the way. Split them both!' },
        { id: 'debug-robot', world: 'robot', base: 'r24', title: 'Debug Robot',
          say: 'Your robot has a bug! Fix it for the judges.',
          goal: 'Another bug! Robo turns the wrong way. Can you fix it?' },
        { id: 'model-bridge', world: 'bridges', base: 'b26', title: 'Model Bridge',
          say: 'Build a model bridge for the judges!',
          goal: 'Towers and a rock! Use them all to hold the bus.' },
        { id: 'tower-test', world: 'construction', title: 'Tower Test',
          say: 'The judges want a tall tower!',
          goal: 'Stack the tower on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [[], [], ['Y3'], ['S2', 'R1']], hook: 0, goals: [{ col: 2, stack: ['Y3', 'S2', 'R1'] }] }], solution: [['R', 'R', 'R', 'G', 'L', 'L', 'G', 'R', 'R', 'G', 'L', 'G', 'L', 'G', 'R', 'G']] } }
      ]
    },

    /* ---------- Week 48 ---------- */
    {
      id: 'water-park', weekIndex: 47, icon: '💦', title: 'Water Park',
      blurb: 'Slides, pumps and splash pools!',
      intro: 'Splash! This week we build a water park.',
      done: 'Everyone is splashing! The water park is a hit!',
      steps: [
        { id: 'splash-launch', world: 'machines', base: 'm15', title: 'Splash Launch',
          say: 'Drop the ball to launch the splash box!',
          goal: 'Drop the ball on the seesaw to launch the box!' },
        { id: 'lazy-river', world: 'robot', title: 'Lazy River',
          say: 'Robo floats along the lazy river.',
          goal: 'Float along the river and grab every gear!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['~~TT~TT', '...~TTT', '.~^T~~T', '.~TT.F~', 'GTTT.TT', '.G...~T'], blocks: ['F', 'L', 'R', 'rep'], par: 19, solution: [{ t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }] } },
        { id: 'slide-bridge', world: 'bridges', base: 'b16', title: 'Slide Bridge',
          say: 'The slide bridge needs steel!',
          goal: 'A truck on top, a boat below. Use steel!' },
        { id: 'wave-fans', world: 'circuits', base: 'c25', title: 'Wave Fans',
          say: 'Two wave fans must spin fast!',
          goal: 'Two fans in a row! Add a battery to make them spin FAST.' },
        { id: 'splash-pools', world: 'construction', title: 'Splash Pools',
          say: 'Fill the splash pools!',
          goal: 'Rocks in the truck, sand in the holes!',
          level: { hint: 'Rocks go in the truck, dirt goes in the holes. Get behind it, then push!', stages: [{ type: 'doze', map: ['.....O', '.Ooo..', '.r....', '..<...', '.X.T..'] }], solution: [['U', 'R', 'U', 'L', 'U', 'R', 'R', 'D', 'L', 'L', 'L', 'D', 'D']] } }
      ]
    },

    /* ---------- Week 49 ---------- */
    {
      id: 'mega-mall', weekIndex: 48, icon: '🛍️', title: 'Mega Mall',
      blurb: 'Escalators, lights and shops!',
      intro: 'This week we build a giant shopping mall.',
      done: 'The mall is open! Happy shopping!',
      steps: [
        { id: 'mall-build', world: 'construction', title: 'Mall Build',
          say: 'Lift the bricks, then build the mall!',
          goal: 'Lift the bricks onto the X, then build the mall!',
          level: { hint: 'Crane first. Then build: foundation, walls, door, windows, and the roof last!', stages: [{ type: 'crane', cols: [['Y3'], [], ['B2']], hook: 0, goals: [{ col: 1, stack: ['Y3', 'B2'] }] }, { type: 'build', house: { floors: 2, windows: [1, 2], color: '#7ed957' }, tray: ['thin', 'found', 'walls', 'window', 'door', 'flat', 'roof'] }], solution: [['G', 'R', 'G', 'R', 'G', 'L', 'G'], ['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'roof']] } },
        { id: 'shop-lights', world: 'circuits', base: 'c14', title: 'Shop Lights',
          say: 'Three shops need bright lights!',
          goal: 'Light all three houses BRIGHT!' },
        { id: 'escalator', world: 'machines', base: 'm17', title: 'Escalator',
          say: 'The escalator belt goes left and fast!',
          goal: 'Make the belt go left AND fast!' },
        { id: 'shop-spiral', world: 'robot', base: 'r27', title: 'Shop Spiral',
          say: 'Robo visits every shop in the spiral!',
          goal: 'A big spiral full of gears. Grab them all!' },
        { id: 'car-park-ramp', world: 'bridges', base: 'b22', title: 'Car Park Ramp',
          say: 'Build the ramp to the car park!',
          goal: 'A low bolt on one side only. Make the other side strong!' }
      ]
    },

    /* ---------- Week 50 ---------- */
    {
      id: 'smart-city', weekIndex: 49, icon: '🌆', title: 'Smart City',
      blurb: 'Robots, power and clever machines!',
      intro: 'This week we build a smart city of the future.',
      done: 'The smart city works by itself! You are a genius!',
      steps: [
        { id: 'city-power', world: 'circuits', base: 'c26', title: 'City Power',
          say: 'The smart city needs power everywhere!',
          goal: 'Make the fan FAST and both houses BRIGHT!' },
        { id: 'robot-taxi', world: 'robot', title: 'Robot Taxi',
          say: 'Robo is a robot taxi.',
          goal: 'Drive the taxi, pick up everyone and reach the flag!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['~TT~T~~', 'TTT~T~T', '...T~~T', '^T..G.T', '~TTTTGT', 'F.....~'], blocks: ['F', 'L', 'R', 'rep'], par: 19, solution: [{ t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'city-gears', world: 'machines', base: 'm25', title: 'City Gears',
          say: 'The city clock needs a gear train!',
          goal: 'Fill the gear train. The belt must go fast!' },
        { id: 'city-parade', world: 'bridges', base: 'b27', title: 'City Parade',
          say: 'The city parade crosses the big bridge!',
          goal: 'The last bridge! A bus parade is coming!' },
        { id: 'smart-plot', world: 'construction', title: 'Smart Plot',
          say: 'Clear the plot for a new tower!',
          goal: 'Rocks in the truck, dirt in the holes!',
          level: { hint: 'Rocks go in the truck, dirt goes in the holes. Get behind it, then push!', stages: [{ type: 'doze', map: ['.T....', '..r...', '.o.v.O', '.o.X..', '.O....'] }], solution: [['U', 'U', 'L', 'D', 'D', 'U', 'L', 'L', 'D', 'R', 'D', 'R', 'L', 'U', 'R', 'R', 'R']] } }
      ]
    },

    /* ---------- Week 51 ---------- */
    {
      id: 'rocket-launch', weekIndex: 50, icon: '🚀', title: 'Rocket Launch',
      blurb: 'Build and launch a real rocket!',
      intro: 'This week we build a rocket and launch it to space!',
      done: 'Blast off! The rocket is in space! Amazing!',
      steps: [
        { id: 'rocket-parts', world: 'construction', title: 'Rocket Parts',
          say: 'Stack the rocket parts!',
          goal: 'Stack the rocket on the X. Biggest at the bottom!',
          level: { hint: 'Biggest block at the bottom! Move the blocks that are in the way first.', stages: [{ type: 'crane', cols: [[], ['G2'], ['P1'], ['R3']], hook: 0, goals: [{ col: 1, stack: ['R3', 'G2', 'P1'] }] }], solution: [['R', 'G', 'L', 'G', 'R', 'R', 'R', 'G', 'L', 'L', 'G', 'L', 'G', 'R', 'G', 'R', 'G', 'L', 'G']] } },
        { id: 'launch-lights', world: 'circuits', base: 'c27', title: 'Launch Lights',
          say: 'The launch pad needs power!',
          goal: 'Big city! Fan FAST, house BRIGHT. Shh, one house sleeps!' },
        { id: 'rocket-engine', world: 'machines', base: 'm28', title: 'Rocket Engine',
          say: 'Build the rocket engine machine!',
          goal: 'The biggest machine! Gear, wedge and pulley!' },
        { id: 'launch-pad', world: 'robot', title: 'Launch Pad',
          say: 'Robo checks the launch pad.',
          goal: 'Check the pad, grab every gear and reach the flag!',
          level: { hint: 'Count the squares before each turn. Grab every gear on the way!', map: ['G..~~TT', '.T...~T', '.T~TGT~', '.TTT.T~', '.<TT.TT', 'TTTTFTT'], blocks: ['F', 'L', 'R', 'rep'], par: 19, solution: [{ t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'L' }, { t: 'F' }, { t: 'F' }, { t: 'R' }, { t: 'F' }, { t: 'F' }, { t: 'F' }, { t: 'F' }] } },
        { id: 'countdown-maze', world: 'robot', base: 'r28', title: 'Countdown Maze',
          say: 'The final countdown maze!',
          goal: 'The final maze! Turn Robo first, then use the wall trick.' }
      ]
    },

    /* ---------- Week 52 ---------- */
    {
      id: 'engineer-expo', weekIndex: 51, icon: '🏆', title: 'Grand Engineer Expo',
      blurb: 'The grand finale: a bit of everything!',
      intro: 'The grand finale! This week you show everything you learned.',
      done: 'You finished all 52 projects! You are a GRAND engineer!',
      steps: [
        { id: 'grand-bridge', world: 'bridges', base: 'b27', title: 'Grand Bridge',
          say: 'First, the grandest bridge!',
          goal: 'The last bridge! A bus parade is coming!' },
        { id: 'grand-machine', world: 'machines', base: 'm28', title: 'Grand Machine',
          say: 'Next, the grandest machine!',
          goal: 'The biggest machine! Gear, wedge and pulley!' },
        { id: 'grand-city', world: 'circuits', base: 'c27', title: 'Grand City',
          say: 'Light up the grand city!',
          goal: 'Big city! Fan FAST, house BRIGHT. Shh, one house sleeps!' },
        { id: 'grand-maze', world: 'robot', base: 'r28', title: 'Grand Maze',
          say: 'Robo solves the grand maze!',
          goal: 'The final maze! Turn Robo first, then use the wall trick.' },
        { id: 'grand-hall', world: 'construction', title: 'Grand Hall',
          say: 'Last of all: build the grand hall!',
          goal: 'Lift the bricks onto the X, then build the grand hall!',
          level: { hint: 'Crane first. Then build: foundation, walls, door, windows, and the roof last!', stages: [{ type: 'crane', cols: [['Y2'], [], ['R3']], hook: 0, goals: [{ col: 1, stack: ['R3', 'Y2'] }] }, { type: 'build', house: { floors: 2, windows: [1, 2], color: '#74c0fc' }, tray: ['thin', 'found', 'walls', 'window', 'door', 'flat', 'roof'] }], solution: [['R', 'R', 'G', 'L', 'G', 'L', 'G', 'R', 'G'], ['found', 'walls', 'walls', 'door', 'window', 'window', 'window', 'roof']] } }
      ]
    }
    /* GEN:END */
  ];

  return { projects: projects };
});
