/* Generates Weekly Big Projects 13–52 into js/data/weekly-projects.js (between the GEN markers). Dev only:
 *   node tools/weekly-gen.js
 * Stories, titles and themes are hand-written below; difficulty rises with the week. Steps are either an existing
 * world level with a new story (base: its own goal + hint are kept, so their voice clips already exist) or a fresh
 * puzzle made by tools/weekly-gen-lib.js (construction solved by BFS = optimal; robot paths verified). */
'use strict';
const fs = require('fs');
const path = require('path');
const G = require('./weekly-gen-lib.js');
const ROOT = path.resolve(__dirname, '..');
const LEVELS = {};
['bridges', 'machines', 'circuits', 'robot', 'construction'].forEach((w) => { LEVELS[w] = require('../js/data/' + w + '-levels.js').levels; });
const WORLD_OF = { b: 'bridges', m: 'machines', c: 'circuits', r: 'robot', k: 'construction' };

const HINT = {
  crane: 'Biggest block at the bottom! Move the blocks that are in the way first.',
  doze: 'Get behind the dirt, then push it into the hole!',
  dozeRock: 'Rocks go in the truck, dirt goes in the holes. Get behind it, then push!',
  robot: 'Count the squares, then turn at each corner!',
  robotRep: 'Count the squares before each turn. Grab every gear on the way!',
  build: 'Crane first. Then build: foundation, walls, door, windows, and the roof last!'
};

// step helpers: B = existing level with a new story; C/D/R/H = new crane / doze / robot / crane+house puzzle
const B = (base, title, say) => ({ base, title, say });
const C = (title, say, goal) => ({ gen: 'crane', title, say, goal });
const D = (title, say, goal) => ({ gen: 'doze', title, say, goal });
const R = (title, say, goal) => ({ gen: 'robot', title, say, goal });
const H = (title, say, goal) => ({ gen: 'house', title, say, goal });

const P = [
  ['pirate-treasure', '🏴‍☠️', 'Pirate Treasure', 'Sail, dig and grab the pirate treasure!', 'Ahoy! This week we hunt for pirate treasure.', 'You found the treasure! Captain Salah!', [
    B('r2', 'Gold Coin', 'Robo the pirate sees a gold coin on the beach!'),
    B('b1', 'Plank Bridge', 'The treasure cart must cross a little stream.'),
    D('Dig for Gold', 'The treasure map says: fill the hole first!', 'Push the sand into the hole!'),
    B('m2', 'Treasure Ramp', 'Roll the gold ball into the treasure chest!'),
    R('Treasure Map', 'Follow the treasure map to the X!', 'Follow the path, grab the gold and reach the flag!')]],
  ['space-station', '🛸', 'Space Station', 'Power up the space station and dock the pod!', 'Three, two, one, blast off! This week we build a space station.', 'The space station is ready! You are a space engineer!', [
    B('c2', 'Power Panel', 'The space station is dark. Fix the power wire!'),
    R('Dock the Pod', 'The little pod must dock at the station.', 'Grab the fuel and dock at the flag!'),
    B('k3', 'Moon Crater', 'Moon dust is in the way. Push it into the crater!'),
    B('m3', 'Fuel Ramps', 'Fuel balls roll down to the rocket tank.'),
    B('r3', 'Moon Walk', 'Robo walks on the moon. Not too many steps!')]],
  ['zoo-builders', '🦁', 'Zoo Builders', 'Feed the animals and build them homes!', 'Welcome to the zoo! This week we help the animals.', 'The animals are happy and fed! Great zoo keeping!', [
    R('Feed the Lions', 'The lions are hungry! Robo brings the food.', 'Grab the food and reach the flag!'),
    B('b4', 'Giraffe Bridge', 'The giraffes need a bridge to their tree.'),
    B('k5', 'Panda House', 'The panda needs a little house.'),
    B('c4', 'Zoo Path Lights', 'The zoo path is long and dark. Light it up!'),
    B('m5', 'Monkey Push', 'The monkey rolls a ball to push the box!')]],
  ['candy-factory', '🍭', 'Candy Factory', 'Belts, gears and stacks of sweets!', 'Yum! This week we run a candy factory.', 'So much candy! The factory is a sweet success!', [
    B('m6', 'Candy Belt', 'The candy belt is still. Start it up!'),
    B('c5', 'Sweet Shops', 'Two candy shops share one wire.'),
    C('Stack Candy', 'Big candy boxes go at the bottom!', 'Stack the candy boxes on the X!'),
    B('m8', 'Sticky Gears', 'Oh no, candy got stuck in the gears!'),
    B('r5', 'Lollipop Run', 'Robo delivers lollipops round the bend.')]],
  ['snow-day', '⛄', 'Snow Day', 'Plow the snow, cross the ice and keep warm!', 'It snowed! This week we have a snow day.', 'What a fun snow day! Everyone is warm and cozy!', [
    R('Snow Plow', 'Snow everywhere! Robo plows the path.', 'Plow the path to the flag!'),
    B('b6', 'Icy Bridge', 'The icy river needs a bridge.'),
    D('Snowy Path', 'Snow holes in the path!', 'Push the snow into the holes!'),
    B('c9', 'Cozy Cabin', 'Light one cabin. The other family is sleeping.'),
    B('m10', 'Snowball Fling', 'Fling the box up the snowy hill!')]],
  ['fire-station', '🚒', 'Fire Station', 'Help the fire crew save the day!', 'Nee-naw! This week we help the fire station.', 'The fire crew says thank you! You are a hero!', [
    R('Save the Kitten', 'A kitten is stuck! Robo goes to help.', 'Grab the ladder and reach the kitten at the flag!'),
    B('b9', 'Fire Truck', 'The fire truck is very heavy.'),
    B('c7', 'Fire Alarm', 'The fire alarm needs a switch.'),
    B('k7', 'Clear the Door', 'A rock blocks the fire station door!'),
    B('m12', 'Water Lift', 'Lift the water box up high!')]],
  ['dino-park', '🦕', 'Dinosaur Park', 'Build a park for the friendly dinosaurs!', 'Roar! This week we build a dinosaur park.', 'The dinosaurs love their park! Roar-some job!', [
    B('b7', 'Dino Rock', 'A big rock is in the dino river. Use it!'),
    B('r6', 'Dino Trail', 'Follow the twisty dino footprints!'),
    B('m11', 'Fossil Log', 'A big log hides a fossil. Split it!'),
    B('c10', 'Fence Sparks', 'The dino fence wire is sparking!'),
    B('k6', 'Ranger Hut', 'The park ranger needs a hut.')]],
  ['train-station', '🚂', 'Train Station', 'Tracks, bridges and lights for the train!', 'All aboard! This week we build a train station.', 'Choo choo! The train is on time. Great work!', [
    R('Train Tracks', 'Robo drives the little train.', 'Follow the tracks, grab the ticket and reach the flag!'),
    B('b8', 'Valley Arch', 'The train must cross a deep valley.'),
    B('c11', 'Station Lamps', 'The station lamps need more power.'),
    B('m13', 'Luggage Belt', 'Bags ride the belt. Catch them with a ramp!'),
    B('k8', 'Ticket Office', 'Build the ticket office.')]],
  ['toy-shop', '🧸', 'Toy Shop', 'Stack, roll and power the toys!', 'Ding ding! This week we open a toy shop.', 'The toy shop is full of happy kids! Super!', [
    C('Toy Tower', 'Toy blocks arrive! Stack them up.', 'Stack the toy blocks on the X!'),
    B('m14', 'Toy Car Smash', 'The toy car rolls through the log!'),
    B('c12', 'Robot Toy', 'The toy robot does not work. Check the batteries!'),
    B('r7', 'Toy Hunt', 'Toys are hiding behind the shelves!'),
    B('b5', 'Toy Train Bridge', 'Build the toy train bridge with few coins!')]],
  ['castle', '🏰', 'Castle Builders', 'Lift stones and build a real castle!', 'Long ago, people built castles. This week, so do we!', 'The castle is finished! King Salah of the castle!', [
    B('k9', 'Lift Stones', 'The castle needs a big stone beam.'),
    B('b11', 'Moat Bridge', 'Cross the castle moat!'),
    B('r9', 'Castle Road', 'A long road to the castle gate.'),
    B('c13', 'Tower Lamp', 'The castle tower needs a fan and a lamp.'),
    B('k10', 'Castle Wall', 'Stack the castle wall blocks!')]],
  ['underwater-lab', '🐠', 'Underwater Lab', 'Build a science lab under the sea!', 'Blub blub! This week we build a lab under the sea.', 'The lab is ready! The fish say hello!', [
    B('c14', 'Lab Lights', 'Three lab rooms need bright lights.'),
    B('r11', 'Coral Pond', 'Robo walks round the coral pond.'),
    B('m15', 'Bubble Launch', 'Send the box up with a bubble boost!'),
    B('b13', 'Sub Bridge', 'A submarine passes under the bridge.'),
    D('Sandy Seabed', 'The seabed is bumpy.', 'Push the sand into the holes!')]],
  ['airport', '✈️', 'Airport', 'Runways, lights and bags for the planes!', 'Zoom! This week we build an airport.', 'The planes take off! Have a great flight!', [
    B('k12', 'Runway Holes', 'The runway has holes!'),
    B('b14', 'Long Runway', 'A very long bridge to the runway.'),
    B('c15', 'Night Runway', 'Night time at the airport. The pilots are sleeping!'),
    B('r10', 'Plane Stairs', 'Robo climbs the plane stairs.'),
    B('m16', 'Bag Lift', 'Lift the suitcase box up!')]],
  ['jungle', '🌴', 'Jungle Expedition', 'Explore the jungle with bridges and Robo!', 'This week we explore the deep green jungle!', 'What an adventure! You explored the whole jungle!', [
    B('r12', 'Jungle Loops', 'The jungle path loops round and round.'),
    B('b10', 'Vine Bridge', 'The jungle river is wide.'),
    R('Jungle Trail', 'Robo looks for jungle fruit.', 'Follow the trail, grab the fruit and reach the flag!'),
    B('c16', 'Jungle Fans', 'It is so hot in the jungle!'),
    B('k11', 'Lookout Tower', 'Build a tall lookout tower!')]],
  ['pizza-delivery', '🍕', 'Pizza Delivery', 'Bake pizza and deliver it hot!', 'Mmm, pizza! This week we run a pizza shop.', 'Every pizza is delivered hot! Delicious work!', [
    R('Pizza Route', 'Hot pizza! Robo delivers it fast.', 'Grab the pizza and reach the flag!'),
    B('k13', 'Pizza Shop', 'Build a tall pizza shop!'),
    B('m18', 'Pizza Oven', 'The pizza oven is a big machine!'),
    B('c18', 'Oven Wires', 'The oven wires are twisted!'),
    B('b15', 'Pizza Bus', 'A bus full of hungry kids is coming!')]],
  ['amusement-park', '🎡', 'Amusement Park', 'Coasters, lights and bumper cars!', 'Wheee! This week we build an amusement park.', 'The park is open! Everyone is having fun!', [
    B('m19', 'Coaster Ramps', 'Build a roller coaster with ramps!'),
    B('c19', 'Park Lamps', 'Light every lamp on the park path!'),
    B('r13', 'Bumper Cars', 'Robo drives a bumper car!'),
    B('b12', 'Sky Ride', 'The sky ride hangs from tall towers.'),
    B('m20', 'Domino Bump', 'Start a chain reaction at the fun fair!')]],
  ['mars-rover', '🛰️', 'Mars Rover', 'Drive a rover on the red planet!', 'This week Robo is a Mars rover on the red planet!', 'The rover finished its mission! Mars says thanks!', [
    B('r14', 'Rover Loop', 'The rover drives until it finds the flag.'),
    B('k14', 'Red Road', 'Clear the red Mars road!'),
    B('c20', 'Rover Power', 'The rover has two power switches.'),
    D('Mars Base Plot', 'Make the ground flat for the Mars base.', 'Push the red dust into the holes!'),
    B('m21', 'Rock Belt', 'The belt carries Mars rocks to the base.')]],
  ['bakery', '🧁', 'Cupcake Bakery', 'Belts, mixers and stacks of cake!', 'Smells yummy! This week we run a bakery.', 'The bakery is full of cupcakes! Sweet job!', [
    B('m22', 'Slow Belt', 'Careful! The cupcakes must go slowly.'),
    C('Cake Layers', 'Stack the cake layers!', 'Stack the cake layers on the X. Biggest at the bottom!'),
    B('c21', 'Mixer Fan', 'The mixer fan must spin!'),
    B('r15', 'Cookie Spiral', 'Robo follows the cookie spiral!'),
    B('b17', 'Flour Truck', 'The flour truck crosses the grand bridge!')]],
  ['new-school', '🏫', 'New School', 'Build a school with a bell tower!', 'This week we build a brand new school!', 'The school is ready for the first day! Great job!', [
    B('k15', 'Bell Tower', 'Stack the bell tower blocks!'),
    B('k16', 'School Yard', 'Make the yard flat, then build the school!'),
    B('c22', 'Nap Time', 'One class is napping!'),
    B('r16', 'Long Hallway', 'Robo grabs the chalk at the end of the hall!'),
    B('m23', 'Road Logs', 'Logs block the road to school!')]],
  ['hospital', '🏥', 'Hospital Heroes', 'Build a hospital and help the doctors!', 'This week we help the doctors and nurses.', 'The hospital is ready to help everyone! Hero!', [
    B('r17', 'Big Stairs', 'Robo takes medicine up the big stairs!'),
    B('b18', 'Ambulance Bus', 'The ambulance bus must cross!'),
    B('c23', 'Ward Lights', 'Three hospital rooms need bright light!'),
    B('m24', 'Supply Fly', 'Send the supplies up, then roll them in!'),
    H('Clinic Build', 'Lift the bricks, then build the clinic!', 'Lift the bricks onto the X, then build the clinic!')]],
  ['recycling', '♻️', 'Recycling Plant', 'Sort, crush and reuse everything!', 'Reduce, reuse, recycle! This week we build a recycling plant.', 'The planet says thank you! Super recycler!', [
    B('b19', 'Fix the Road', 'The road to the plant has a hole!'),
    B('c24', 'Lamp Mixup', 'Someone put the lamp in the wrong spot!'),
    B('m25', 'Sorting Gears', 'The sorting machine needs gears!'),
    C('Crush Cubes', 'Stack the squashed cubes.', 'Stack the cubes on the X. Biggest at the bottom!'),
    B('r18', 'Sorting Maze', 'Robo sorts bottles in the biggest maze!')]],
  ['volcano-island', '🌋', 'Volcano Island', 'Bridges and machines near the volcano!', 'Rumble rumble! This week we visit Volcano Island.', 'The island is safe! You beat the volcano!', [
    B('b20', 'Lava Bridge', 'The bridge goes over hot lava!'),
    B('r19', 'Rocky Road', 'Rocks fell from the volcano!'),
    B('c25', 'Cool Fans', 'The lab is hot! The fans must spin fast.'),
    D('Lava Rocks', 'Volcano rocks and holes everywhere!', 'Rocks in the truck, dirt in the holes!'),
    B('m26', 'Bump Lift', 'Bump the ball to lift the rescue box!')]],
  ['arctic-base', '🐧', 'Arctic Base', 'Ice, snow and penguins!', 'Brrr! This week we build a base near the North Pole.', 'The arctic base is snug and warm! Cool job!', [
    R('Ski Slope', 'Robo skis down the slope!', 'Ski down to the flag and grab every gear!'),
    B('b21', 'Ice Tower', 'Only one ice tower holds this bridge.'),
    B('c26', 'Igloo Town', 'The igloo town needs power!'),
    B('m27', 'Penguin Lift', 'Lift the penguin food box!'),
    B('k18', 'Polar Base', 'Clear the snow, lift the bricks, build the base!')]],
  ['music-festival', '🎸', 'Music Festival', 'Lights, sound and a big stage!', 'La la la! This week we build a music festival.', 'The band is playing! What a party!', [
    B('c27', 'Stage Lights', 'The big stage needs power!'),
    B('b22', 'Stage Bridge', 'The bridge to the stage is lopsided!'),
    B('r20', 'Fix the Dance', 'Robo\'s dance program has a bug!'),
    B('m28', 'Sound Machine', 'Build the biggest sound machine!'),
    H('Music Hall', 'Lift the bricks, then build the music hall!', 'Lift the bricks onto the X, then build the music hall!')]],
  ['robot-olympics', '🥇', 'Robot Olympics', 'Robo races in five coding events!', 'Welcome to the Robot Olympics! Five events for Robo.', 'Gold medal! Robo is the champion, and so are you!', [
    B('r21', 'Downhill Race', 'Event one: race down the stairs!'),
    B('r22', 'Gear Sprint', 'Event two: grab every gear!'),
    B('r23', 'Wall Run', 'Event three: run round the trees!'),
    B('r24', 'Bug Relay', 'Event four: Robo turns the wrong way!'),
    B('r25', 'Lake Marathon', 'The last event: run all the way round the lake!')]],
  ['treehouse', '🌳', 'Treehouse Village', 'Rope bridges and treehouses!', 'This week we build a village up in the trees!', 'The treehouse village is finished! So high up!', [
    B('b23', 'Rope Bridge', 'Hang the bridge between the trees!'),
    C('Lift Planks', 'Lift the planks up to the treehouse!', 'Stack the planks on the X. Biggest at the bottom!'),
    B('c6', 'Lantern Twins', 'Two treehouses need lanterns.'),
    B('m9', 'Zip Line', 'The ball rides the zip line belt!'),
    B('r26', 'Branch Walk', 'Robo grabs the acorn at the top!')]],
  ['flood-defense', '☔', 'Flood Defense', 'Stop the water and keep the town dry!', 'Big rain is coming! This week we keep the town dry.', 'The town stayed dry! You saved it!', [
    B('b24', 'Save Coins', 'The flood bridge costs too many coins!'),
    D('Sandbags', 'Stop the water with sandbags!', 'Push the sandbags into the holes!'),
    B('c17', 'Storm Night', 'It is a stormy night in town.'),
    B('m16', 'Pump Lift', 'Lift the water pump box!'),
    B('r27', 'Rain Spiral', 'Robo grabs every raindrop gear!')]],
  ['moon-base', '🌙', 'Moon Base', 'Build a base on the moon!', 'This week we fly to the moon and build a base!', 'The moon base is ready! One small step for Salah!', [
    B('b25', 'Crater Arch', 'The moon bus must cross a deep crater!'),
    C('Moon Cargo', 'Stack the moon cargo!', 'Stack the moon cargo on the X. Biggest at the bottom!'),
    B('c16', 'Air Fans', 'The moon base air fans must spin!'),
    B('m18', 'Moon Machine', 'Build the moon machine!'),
    B('r28', 'Crater Maze', 'The final crater maze!')]],
  ['farm-market', '🍎', 'Farm Market', 'Pick apples and build a market!', 'This week we pick fruit and open a farm market.', 'The market is busy and the fruit is fresh! Yum!', [
    R('Apple Picking', 'Robo picks apples in the orchard.', 'Grab the apples and reach the flag!'),
    B('b26', 'Market Bridge', 'The market bus must cross the river!'),
    B('c13', 'Juice Bar', 'The juice bar needs a fan and a bright lamp!'),
    H('Market Stall', 'Lift the bricks, then build the market!', 'Lift the bricks onto the X, then build the market!'),
    B('m13', 'Fruit Belt', 'Fruit rides the belt to the basket!')]],
  ['lighthouse-bay', '🏝️', 'Lighthouse Bay', 'A lighthouse keeps the ships safe!', 'This week we build a lighthouse by the sea.', 'The lighthouse shines! The ships are safe!', [
    C('Lighthouse', 'Stack the lighthouse tower!', 'Stack the tower on the X. Biggest at the bottom!'),
    B('c10', 'Beacon Sparks', 'The lighthouse wire is sparking!'),
    B('b16', 'Ship Bridge', 'A ship sails under the bridge!'),
    R('Beach Walk', 'Robo walks along the beach.', 'Walk the beach, grab the shells and reach the flag!'),
    B('m20', 'Wave Machine', 'Start the wave machine!')]],
  ['desert-oasis', '🐪', 'Desert Oasis', 'Sand, sun and a cool oasis!', 'This week we cross the desert to a cool oasis.', 'You reached the oasis! Time for a cool drink!', [
    D('Sand Dunes', 'The desert road is full of sand!', 'Push the sand into the holes!'),
    B('b21', 'Oasis Bridge', 'One tower holds the oasis bridge.'),
    B('c24', 'Palm Lamps', 'The palm tree lamp is in the wrong spot!'),
    B('r25', 'Oasis Loop', 'Robo walks round the oasis lake!'),
    B('m26', 'Water Pump', 'Pump water up from the well!')]],
  ['mountain-tunnel', '⛰️', 'Mountain Tunnel', 'Dig a tunnel through the mountain!', 'This week we dig a tunnel through a big mountain.', 'The tunnel is open! Trains can go through!', [
    B('k14', 'Tunnel Road', 'Clear the road to the tunnel!'),
    B('b17', 'Mountain Truck', 'A truck carries rocks over the mountain bridge!'),
    R('Dark Tunnel', 'Robo drives through the dark tunnel.', 'Drive through the tunnel and grab every gear!'),
    B('c26', 'Tunnel Lights', 'The tunnel needs lights and a fan!'),
    B('m25', 'Drill Gears', 'The big drill needs a gear train!')]],
  ['stadium', '🏟️', 'Big Stadium', 'Build a stadium for the big game!', 'This week we build a stadium for the big football match!', 'Goal! The stadium is full and cheering for you!', [
    H('Stadium Build', 'Lift the bricks, then build the stadium!', 'Lift the bricks onto the X, then build the stadium!'),
    B('c23', 'Flood Lights', 'The stadium needs bright flood lights!'),
    B('b27', 'Fan Parade', 'The fans parade to the stadium!'),
    B('m24', 'Ball Launch', 'Launch the ball, then roll it to the goal!'),
    B('r22', 'Team Bus', 'The team bus picks up every player!')]],
  ['museum', '🏛️', 'Museum Night', 'Lights, displays and a dinosaur skeleton!', 'This week we build a museum full of treasures.', 'The museum is open! Everyone loves it!', [
    C('Statue Stack', 'Stack the statue blocks!', 'Stack the statue on the X. Biggest at the bottom!'),
    B('c22', 'Quiet Rooms', 'Some museum rooms must stay dark.'),
    B('r23', 'Museum Tour', 'Robo walks round the displays!'),
    B('m28', 'Big Display', 'The biggest machine in the museum!'),
    B('b25', 'Museum Arch', 'The museum bus crosses the big arch!')]],
  ['ski-resort', '🎿', 'Ski Resort', 'Lifts, slopes and snowy lodges!', 'This week we build a ski resort in the mountains.', 'Whoosh! The ski resort is open! Great job!', [
    R('Slalom', 'Robo skis the slalom course!', 'Ski the slalom, grab every gear and reach the flag!'),
    B('m27', 'Ski Lift', 'The ski lift carries the box up!'),
    B('b23', 'Cable Car', 'The cable car hangs from steel cables!'),
    D('Snow Groomer', 'The ski slope is bumpy!', 'Rocks in the truck, snow in the holes!'),
    B('c25', 'Lodge Fans', 'The ski lodge fans must spin fast!')]],
  ['science-fair', '🔬', 'Science Fair', 'Show your best inventions!', 'This week is the science fair! Show your best inventions.', 'First prize! Your inventions won the science fair!', [
    B('c27', 'Light Show', 'Your first invention: a light show!'),
    B('m23', 'Log Splitter', 'Your second invention splits logs!'),
    B('r24', 'Debug Robot', 'Your robot has a bug! Fix it for the judges.'),
    B('b26', 'Model Bridge', 'Build a model bridge for the judges!'),
    C('Tower Test', 'The judges want a tall tower!', 'Stack the tower on the X. Biggest at the bottom!')]],
  ['water-park', '💦', 'Water Park', 'Slides, pumps and splash pools!', 'Splash! This week we build a water park.', 'Everyone is splashing! The water park is a hit!', [
    B('m15', 'Splash Launch', 'Drop the ball to launch the splash box!'),
    R('Lazy River', 'Robo floats along the lazy river.', 'Float along the river and grab every gear!'),
    B('b16', 'Slide Bridge', 'The slide bridge needs steel!'),
    B('c25', 'Wave Fans', 'Two wave fans must spin fast!'),
    D('Splash Pools', 'Fill the splash pools!', 'Rocks in the truck, sand in the holes!')]],
  ['mega-mall', '🛍️', 'Mega Mall', 'Escalators, lights and shops!', 'This week we build a giant shopping mall.', 'The mall is open! Happy shopping!', [
    H('Mall Build', 'Lift the bricks, then build the mall!', 'Lift the bricks onto the X, then build the mall!'),
    B('c14', 'Shop Lights', 'Three shops need bright lights!'),
    B('m17', 'Escalator', 'The escalator belt goes left and fast!'),
    B('r27', 'Shop Spiral', 'Robo visits every shop in the spiral!'),
    B('b22', 'Car Park Ramp', 'Build the ramp to the car park!')]],
  ['smart-city', '🌆', 'Smart City', 'Robots, power and clever machines!', 'This week we build a smart city of the future.', 'The smart city works by itself! You are a genius!', [
    B('c26', 'City Power', 'The smart city needs power everywhere!'),
    R('Robot Taxi', 'Robo is a robot taxi.', 'Drive the taxi, pick up everyone and reach the flag!'),
    B('m25', 'City Gears', 'The city clock needs a gear train!'),
    B('b27', 'City Parade', 'The city parade crosses the big bridge!'),
    D('Smart Plot', 'Clear the plot for a new tower!', 'Rocks in the truck, dirt in the holes!')]],
  ['rocket-launch', '🚀', 'Rocket Launch', 'Build and launch a real rocket!', 'This week we build a rocket and launch it to space!', 'Blast off! The rocket is in space! Amazing!', [
    C('Rocket Parts', 'Stack the rocket parts!', 'Stack the rocket on the X. Biggest at the bottom!'),
    B('c27', 'Launch Lights', 'The launch pad needs power!'),
    B('m28', 'Rocket Engine', 'Build the rocket engine machine!'),
    R('Launch Pad', 'Robo checks the launch pad.', 'Check the pad, grab every gear and reach the flag!'),
    B('r28', 'Countdown Maze', 'The final countdown maze!')]],
  ['engineer-expo', '🏆', 'Grand Engineer Expo', 'The grand finale: a bit of everything!', 'The grand finale! This week you show everything you learned.', 'You finished all 52 projects! You are a GRAND engineer!', [
    B('b27', 'Grand Bridge', 'First, the grandest bridge!'),
    B('m28', 'Grand Machine', 'Next, the grandest machine!'),
    B('c27', 'Grand City', 'Light up the grand city!'),
    B('r28', 'Grand Maze', 'Robo solves the grand maze!'),
    H('Grand Hall', 'Last of all: build the grand hall!', 'Lift the bricks onto the X, then build the grand hall!')]]
];

function tierOf(i) { return (i - 12) / 39; }   // 0 (week 13) … 1 (week 52)
function genLevel(kind, i, k) {
  const t = tierOf(i), seed = 9000 + i * 17 + k;
  const pickT = (a) => a[Math.min(a.length - 1, Math.floor(t * a.length))];
  if (kind === 'crane') {
    const o = pickT([{ cols: 3, sizes: [3, 2], min: 6, max: 10 }, { cols: 3, sizes: [3, 2, 1], min: 10, max: 14 },
      { cols: 4, sizes: [3, 2, 1], min: 12, max: 18 }, { cols: 4, sizes: [3, 2, 1], min: 16, max: 24 }]);
    const { stage, sol } = G.crane(seed, o);
    return { hint: HINT.crane, stages: [stage], solution: [sol] };
  }
  if (kind === 'doze') {
    const o = pickT([{ w: 5, h: 3, dirt: 1, min: 4, max: 7 }, { w: 5, h: 4, dirt: 2, min: 6, max: 11 },
      { w: 6, h: 4, dirt: 1, rocks: 1, min: 8, max: 13 }, { w: 6, h: 5, dirt: 2, rocks: 1, trees: 1, min: 11, max: 18 }]);
    const { stage, sol } = G.doze(seed, o);
    return { hint: o.rocks ? HINT.dozeRock : HINT.doze, stages: [stage], solution: [sol] };
  }
  if (kind === 'robot') {
    const o = pickT([{ w: 5, h: 4, len: 6, turns: 2, gears: 1 }, { w: 6, h: 4, len: 8, turns: 3, gears: 1 },
      { w: 6, h: 5, len: 10, turns: 3, gears: 2, blocks: ['F', 'L', 'R', 'rep'] }, { w: 7, h: 5, len: 12, turns: 4, gears: 2, blocks: ['F', 'L', 'R', 'rep'], water: 0.25 },
      { w: 7, h: 6, len: 14, turns: 5, gears: 2, blocks: ['F', 'L', 'R', 'rep'], water: 0.25 }]);
    const lv = G.robot(seed, o);
    return Object.assign({ hint: o.blocks ? HINT.robotRep : HINT.robot }, lv);
  }
  if (kind === 'house') {
    const cr = G.crane(seed, pickT([{ cols: 3, sizes: [3], min: 4, max: 6 }, { cols: 3, sizes: [3, 2], min: 6, max: 10 }]));
    const colors = ['#7ed957', '#ffb35c', '#ff7eb6', '#74c0fc', '#b197fc', '#ffd43b'];
    const house = t < 0.5 ? { floors: 1, windows: [2], color: colors[i % colors.length] } : { floors: 2, windows: [1, 2], color: colors[i % colors.length] };
    const bd = G.build(house, t < 0.5 ? ['flat'] : ['thin', 'flat']);
    return { hint: HINT.build, stages: [cr.stage, bd.stage], solution: [cr.sol, bd.sol] };
  }
  throw new Error(kind);
}

/* ---------- serialize ---------- */
const q = (s) => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
function lit(v) {
  if (Array.isArray(v)) return '[' + v.map(lit).join(', ') + ']';
  if (v && typeof v === 'object') return '{ ' + Object.keys(v).map((k) => (/^[a-z_]\w*$/i.test(k) ? k : q(k)) + ': ' + lit(v[k])).join(', ') + ' }';
  return typeof v === 'string' ? q(v) : String(v);
}
const out = [];
const problems = [];
P.forEach((p, n) => {
  const i = 12 + n;
  const [id, icon, title, blurb, intro, done, steps] = p;
  out.push('', '    /* ---------- Week ' + (i + 1) + ' ---------- */', '    {',
    '      id: ' + q(id) + ', weekIndex: ' + i + ', icon: ' + q(icon) + ', title: ' + q(title) + ',',
    '      blurb: ' + q(blurb) + ',', '      intro: ' + q(intro) + ',', '      done: ' + q(done) + ',', '      steps: [');
  const sids = new Set();
  steps.forEach((s, k) => {
    if (s.title.length > 16) problems.push(id + ': title too long ' + s.title);
    let sid = s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    while (sids.has(sid)) sid += '2';
    sids.add(sid);
    const last = k === steps.length - 1 ? '' : ',';
    if (s.base) {
      const w = WORLD_OF[s.base[0]], lv = LEVELS[w].find((l) => l.id === s.base);
      if (!lv) problems.push('no level ' + s.base);
      out.push('        { id: ' + q(sid) + ', world: ' + q(w) + ', base: ' + q(s.base) + ', title: ' + q(s.title) + ',',
        '          say: ' + q(s.say) + ',', '          goal: ' + q(lv.goal) + ' }' + last);
    } else {
      const w = s.gen === 'robot' ? 'robot' : 'construction';
      const lv = genLevel(s.gen, i, k);
      out.push('        { id: ' + q(sid) + ', world: ' + q(w) + ', title: ' + q(s.title) + ',',
        '          say: ' + q(s.say) + ',', '          goal: ' + q(s.goal) + ',',
        '          level: ' + lit(lv) + ' }' + last);
    }
  });
  out.push('      ]', '    }' + (n === P.length - 1 ? '' : ','));
});
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
const file = path.join(ROOT, 'js/data/weekly-projects.js');
let src = fs.readFileSync(file, 'utf8');
const START = '    /* GEN:START weeks 13-52 (tools/weekly-gen.js) */', END = '    /* GEN:END */';
const block = START + out.join('\n') + '\n' + END;
if (src.includes(START)) src = src.replace(new RegExp(START.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&') + '[\\s\\S]*?' + END.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')), block);
else {
  const anchor = '\n  ];\n\n  return { projects: projects };';
  if (!src.includes(anchor)) throw new Error('anchor not found');
  src = src.replace(/(\n    \}\n)(  \];\n\n  return \{ projects: projects \};)/, '$1    },\n' + block + '\n$2').replace('    }\n    },\n' + START, '    },\n' + START);
}
fs.writeFileSync(file, src);
console.log('weekly projects:', require(file).projects.length);
