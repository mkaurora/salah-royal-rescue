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
    }
  ];

  return { projects: projects };
});
