/* Science bank (tiers 1-6): animals, plants, materials, forces, weather, earth and space, scientific thinking. UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('rng', '../../logic/rng.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.curriculumScience = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  var SKILLS = {
    'sc-animals': 'Animals', 'sc-plants': 'Plants', 'sc-body': 'Senses and body', 'sc-materials': 'Materials', 'sc-forces': 'Forces and motion',
    'sc-weather': 'Weather and water', 'sc-earth': 'Earth and rocks', 'sc-space': 'Space', 'sc-light': 'Light and sound', 'sc-energy': 'Energy and heat',
    'sc-adapt': 'Adaptations', 'sc-method': 'Thinking like a scientist'
  };
  var bank = [], n = 0;
  // [skill, tier, text, answer, wrong1, wrong2, hint]
  var RAW = [
    // ---- tier 1
    ['sc-animals', 1, 'Where does a fish live?', 'In water', 'In a tree', 'In a cave of sand', 'Fish breathe underwater.'],
    ['sc-animals', 1, 'Which animal has a hard shell on its back?', 'Turtle', 'Duck', 'Rabbit', 'This animal can pull its head inside.'],
    ['sc-animals', 1, 'A baby frog is called a…', 'Tadpole', 'Puppy', 'Chick', 'It has a tail and lives in water.'],
    ['sc-animals', 1, 'What do turtles lay?', 'Eggs', 'Seeds', 'Leaves', 'Baby turtles hatch from them.'],
    ['sc-animals', 1, 'Which of these is a bird?', 'Seagull', 'Crab', 'Starfish', 'Birds have feathers and wings.'],
    ['sc-animals', 1, 'How many legs does a bird have?', 'Two', 'Four', 'Six', 'Count the legs on a gull.'],
    ['sc-animals', 1, 'Which animal lives on the beach and walks sideways?', 'Crab', 'Horse', 'Bird', 'It has claws.'],
    ['sc-animals', 1, 'A baby cat is called a…', 'Kitten', 'Puppy', 'Calf', 'It says meow.'],
    ['sc-body', 1, 'What do we use our eyes for?', 'Seeing', 'Hearing', 'Smelling', 'You need them to look at pictures.'],
    ['sc-body', 1, 'What do we use our ears for?', 'Hearing', 'Seeing', 'Tasting', 'They help you listen to music.'],
    ['sc-body', 1, 'Which part of your body do you smell with?', 'Nose', 'Elbow', 'Knee', 'It sits in the middle of your face.'],
    ['sc-body', 1, 'Which sense do you use to feel something is soft?', 'Touch', 'Sight', 'Hearing', 'Your skin does this.'],
    ['sc-plants', 1, 'What do plants need to grow?', 'Water and sunlight', 'Sweets and toys', 'Sand only', 'Think of what a flower in a pot needs.'],
    ['sc-plants', 1, 'Which of these is alive?', 'A tree', 'A rock', 'A toy boat', 'It grows and makes seeds.'],
    ['sc-plants', 1, 'What grows from a seed?', 'A plant', 'A stone', 'A cloud', 'Plant it in soil and water it.'],
    ['sc-materials', 1, 'Which one floats on water?', 'A beach ball', 'A rock', 'A coin', 'It is light and full of air.'],
    ['sc-materials', 1, 'Which one sinks in water?', 'A stone', 'A leaf', 'A feather', 'It is heavy for its size.'],
    ['sc-weather', 1, 'What is sea water like?', 'Salty', 'Sweet', 'Sour', 'Do not drink it!'],
    ['sc-weather', 1, 'What do we call frozen water?', 'Ice', 'Steam', 'Sand', 'It is cold and hard.'],
    ['sc-earth', 1, 'Sand is made of tiny bits of…', 'Rock and shell', 'Sugar', 'Flour', 'Waves break these into tiny pieces over a long time.'],
    ['sc-space', 1, 'What gives us light and warmth in the day?', 'The Sun', 'The Moon', 'A cloud', 'It is a star that shines in the daytime.'],
    ['sc-space', 1, 'When is it dark outside?', 'At night', 'At noon', 'In the morning', 'You see the Moon and stars then.'],
    ['sc-forces', 1, 'To open a door, you…', 'Push or pull it', 'Shout at it', 'Look at it', 'A force moves things.'],
    ['sc-weather', 1, 'Which season is the coldest?', 'Winter', 'Summer', 'Spring', 'This is when people wear scarves and gloves.'],
    // ---- tier 2
    ['sc-plants', 2, 'Which part of a plant takes in water from the soil?', 'Roots', 'Flower', 'Leaf', 'It grows under the ground.'],
    ['sc-plants', 2, 'Which part of a plant uses sunlight to make food?', 'Leaves', 'Roots', 'Seeds', 'It is flat and green.'],
    ['sc-plants', 2, 'What does the stem of a plant do?', 'Holds it up and carries water', 'Makes seeds', 'Smells nice', 'Think of the tall part in the middle.'],
    ['sc-animals', 2, 'A caterpillar changes into a…', 'Butterfly', 'Beetle', 'Bird', 'It builds a cocoon first.'],
    ['sc-animals', 2, 'How many legs does an insect have?', 'Six', 'Four', 'Eight', 'Count the legs on an ant.'],
    ['sc-animals', 2, 'How many legs does a spider have?', 'Eight', 'Six', 'Ten', 'It has more than an insect.'],
    ['sc-animals', 2, 'Which animal only eats plants?', 'Cow', 'Dolphin', 'Eagle', 'It eats grass in a field.'],
    ['sc-animals', 2, 'What do bees make?', 'Honey', 'Milk', 'Silk', 'It is sweet and golden.'],
    ['sc-animals', 2, 'A whale is a…', 'Mammal', 'Fish', 'Reptile', 'It breathes air and feeds milk to its babies.'],
    ['sc-animals', 2, 'Where do monkeys in the jungle live?', 'In trees', 'In caves of ice', 'Under the sand', 'They climb and swing.'],
    ['sc-weather', 2, 'Where does rain come from?', 'Clouds', 'The Moon', 'The ground', 'They float high in the sky.'],
    ['sc-weather', 2, 'Water can be a solid, a liquid or a…', 'Gas', 'Metal', 'Plant', 'Think of steam from a kettle.'],
    ['sc-weather', 2, 'Which season do leaves fall from trees?', 'Autumn', 'Spring', 'Summer', 'The leaves change colour first.'],
    ['sc-forces', 2, 'What pulls things down to the ground?', 'Gravity', 'Wind', 'Magnets', 'It is why a ball comes back down.'],
    ['sc-forces', 2, 'A magnet can pick up…', 'An iron nail', 'A wooden spoon', 'A paper cup', 'Magnets stick to some metals.'],
    ['sc-materials', 2, 'Which material is see-through?', 'Glass', 'Wood', 'Metal', 'You can look through a window.'],
    ['sc-materials', 2, 'Which material is best for a raincoat?', 'Plastic', 'Paper', 'Cotton wool', 'It must keep water out.'],
    ['sc-body', 2, 'Which food helps keep your teeth and bones strong?', 'Milk', 'Candy', 'Chips', 'It comes from cows and contains calcium.'],
    ['sc-body', 2, 'Which is a healthy habit?', 'Washing your hands', 'Staying up all night', 'Skipping meals', 'It keeps germs away.'],
    ['sc-light', 2, 'A shadow is made when…', 'Light is blocked', 'Light is made', 'It is raining', 'Stand in front of a lamp and see.'],
    ['sc-animals', 2, 'What is the home of a bird called?', 'A nest', 'A den', 'A web', 'Birds build it from twigs.'],
    // ---- tier 3
    ['sc-earth', 3, 'What is a fossil?', 'The remains or print of a plant or animal from long ago', 'A new kind of stone', 'A shiny gem', 'It is found in rock.'],
    ['sc-earth', 3, 'What are gems like amethyst and quartz?', 'Crystals', 'Plants', 'Animals', 'They have flat shiny sides.'],
    ['sc-earth', 3, 'Which is the hardest natural material?', 'Diamond', 'Chalk', 'Wood', 'It is used to cut things.'],
    ['sc-earth', 3, 'Stalactites hang from the…', 'Ceiling of a cave', 'Floor of a cave', 'Top of a mountain', 'Think of "c" for ceiling.'],
    ['sc-light', 3, 'Light travels in…', 'Straight lines', 'Circles', 'Zigzags', 'That is why shadows have clear edges.'],
    ['sc-light', 3, 'What does a mirror do to light?', 'Bounces it back', 'Soaks it up', 'Turns it into sound', 'You can see yourself.'],
    ['sc-light', 3, 'An echo is…', 'A sound that bounces back', 'A kind of light', 'A loud wind', 'You hear it in a big cave.'],
    ['sc-light', 3, 'Sound is made when something…', 'Vibrates', 'Stays still', 'Freezes', 'Touch a guitar string to feel it.'],
    ['sc-materials', 3, 'Which material is a good conductor of heat?', 'Metal', 'Wool', 'Foam', 'A metal spoon gets hot in soup.'],
    ['sc-materials', 3, 'Which material is magnetic?', 'Iron', 'Plastic', 'Glass', 'Magnets stick to it.'],
    ['sc-materials', 3, 'A material that lets water pass through is…', 'Absorbent', 'Waterproof', 'Shiny', 'A sponge does this.'],
    ['sc-animals', 3, 'Which of these is a reptile?', 'Gecko', 'Frog', 'Goldfish', 'It has dry scaly skin.'],
    ['sc-animals', 3, 'What do herbivores eat?', 'Plants', 'Meat only', 'Rocks', '"Herb" is a clue.'],
    ['sc-animals', 3, 'Fireflies make light. This is called…', 'Glowing', 'Burning', 'Melting', 'They do it with their own body.'],
    ['sc-plants', 3, 'What is the job of a flower?', 'To make seeds', 'To hold the plant up', 'To drink water', 'Bees visit it.'],
    ['sc-plants', 3, 'What do seeds need to start growing?', 'Water and warmth', 'Darkness and salt', 'Metal', 'Think of spring.'],
    ['sc-weather', 3, 'Which tool measures how hot or cold it is?', 'Thermometer', 'Ruler', 'Clock', 'It has numbers and a line that moves.'],
    ['sc-forces', 3, 'Which would be hardest to push?', 'A big heavy box', 'A small ball', 'A feather', 'Heavier things need a bigger force.'],
    ['sc-forces', 3, 'Rubbing your hands together makes them warm because of…', 'Friction', 'Gravity', 'Magnetism', 'Two surfaces rub.'],
    ['sc-body', 3, 'Which part of your body helps you think?', 'Brain', 'Stomach', 'Elbow', 'It is inside your head.'],
    // ---- tier 4
    ['sc-weather', 4, 'At what temperature does water freeze?', '0 °C', '50 °C', '100 °C', 'It becomes ice.'],
    ['sc-weather', 4, 'When ice melts it becomes…', 'Liquid water', 'Steam', 'A rock', 'It gets warmer and changes state.'],
    ['sc-weather', 4, 'What happens when water boils?', 'It turns into steam', 'It turns into ice', 'It disappears forever', 'Hot water makes a gas.'],
    ['sc-weather', 4, 'Which instrument shows the wind direction?', 'Wind vane', 'Rain gauge', 'Thermometer', 'It points where the wind blows from.'],
    ['sc-adapt', 4, 'Why do polar bears have thick fur?', 'To keep warm', 'To look pretty', 'To swim faster', 'It is very cold where they live.'],
    ['sc-adapt', 4, 'Why do penguins huddle together?', 'To stay warm', 'To play a game', 'To find food', 'Being close together keeps heat in.'],
    ['sc-adapt', 4, 'An arctic hare has white fur in winter so that it can…', 'Hide in the snow', 'Run faster', 'Climb trees', 'White matches the snow.'],
    ['sc-adapt', 4, 'Hibernation means…', 'Sleeping through the cold winter', 'Flying south', 'Digging for food', 'Bears do this.'],
    ['sc-adapt', 4, 'Migration means…', 'Travelling to a warmer or better place', 'Sleeping all day', 'Changing colour', 'Many birds do this each year.'],
    ['sc-matter', 4, 'Which of these is a gas?', 'Air', 'Milk', 'Wood', 'You cannot see it but it fills a balloon.'],
    ['sc-earth', 4, 'Lava that cools and hardens makes…', 'Igneous rock', 'Sand', 'Ice', 'This rock begins as melted rock.'],
    ['sc-earth', 4, 'Rocks are slowly broken into smaller pieces by…', 'Weathering', 'Singing', 'Magnets', 'Wind, rain and ice do this.'],
    ['sc-earth', 4, 'What is soil made of?', 'Tiny bits of rock and old leaves', 'Sugar', 'Plastic', 'It feeds the plants.'],
    ['sc-animals', 4, 'A food chain always starts with…', 'The Sun', 'A fox', 'A rock', 'It gives energy to plants.'],
    ['sc-animals', 4, 'Which animals have a backbone?', 'Fish and birds', 'Snails and worms', 'Jellyfish', 'Vertebrates have bones inside.'],
    ['sc-plants', 4, 'Moss is a plant that…', 'Has no roots', 'Has big flowers', 'Grows only in deserts', 'It soaks up water through its leaves.'],
    ['sc-forces', 4, 'A force that slows things down when they rub is…', 'Friction', 'Gravity', 'Light', 'Sliding on carpet stops you quicker than on ice.'],
    ['sc-energy', 4, 'Which gives out heat and light?', 'The Sun', 'A pebble', 'Ice', 'It is a very hot star.'],
    ['sc-light', 4, 'Which animal uses echoes to find its way?', 'Bat', 'Cow', 'Rabbit', 'It flies at night.'],
    ['sc-body', 4, 'What do your lungs do?', 'Breathe in air', 'Break up food', 'Move your legs', 'They are in your chest.'],
    // ---- tier 5
    ['sc-plants', 5, 'What do plants make using sunlight, water and air?', 'Their own food', 'Rocks', 'Heat for the soil', 'This is called photosynthesis.'],
    ['sc-plants', 5, 'How do bees help plants?', 'They carry pollen from flower to flower', 'They water the roots', 'They cut the leaves', 'Pollen sticks to their legs.'],
    ['sc-plants', 5, 'Dandelion seeds are spread by…', 'The wind', 'The sea', 'Magnets', 'They have fluffy parachutes.'],
    ['sc-plants', 5, 'Coconuts can be spread by…', 'Floating on the sea', 'Flying', 'Burying themselves', 'They are light and waterproof.'],
    ['sc-weather', 5, 'What is it called when water turns to vapour and rises?', 'Evaporation', 'Condensation', 'Freezing', 'The Sun warms the sea.'],
    ['sc-weather', 5, 'Clouds form when water vapour…', 'Cools and turns into tiny drops', 'Heats up', 'Turns to sand', 'Cold air high up does this.'],
    ['sc-weather', 5, 'Rain, snow and hail are all types of…', 'Precipitation', 'Evaporation', 'Pollution', 'They fall from clouds.'],
    ['sc-forces', 5, 'A parachute falls slowly because of…', 'Air resistance', 'Magnetism', 'Friction with the ground', 'Air pushes up against it.'],
    ['sc-forces', 5, 'Which makes an object move faster?', 'A bigger push', 'A smaller push', 'No push', 'More force means more speed change.'],
    ['sc-forces', 5, 'Why can a boat made of metal float?', 'Its shape holds a lot of air', 'Metal is lighter than water', 'Wood floats', 'Think about the space inside the boat.'],
    ['sc-animals', 5, 'Which is a producer in a food chain?', 'Grass', 'Rabbit', 'Owl', 'It makes its own food from sunlight.'],
    ['sc-animals', 5, 'Why can birds fly?', 'Light bodies and strong wings', 'Heavy bones', 'Big feet', 'Their bones are hollow.'],
    ['sc-animals', 5, 'A hummingbird feeds on…', 'Nectar', 'Fish', 'Grass', 'It hovers at flowers.'],
    ['sc-animals', 5, 'Insects, spiders and crabs are all…', 'Invertebrates', 'Mammals', 'Reptiles', 'They have no backbone.'],
    ['sc-energy', 5, 'Which is a renewable energy source?', 'Wind', 'Coal', 'Oil', 'It will not run out.'],
    ['sc-energy', 5, 'Dark clothes feel warmer in the sun because they…', 'Absorb more heat', 'Reflect all light', 'Make their own heat', 'Light colours reflect more light.'],
    ['sc-space', 5, 'What causes day and night on Earth?', 'Earth spinning', 'The Moon moving', 'Clouds', 'It turns once every 24 hours.'],
    ['sc-space', 5, 'The Moon goes around…', 'The Earth', 'The Sun only', 'Mars', 'We see it from our planet.'],
    ['sc-earth', 5, 'What layer of the Earth do we live on?', 'The crust', 'The core', 'The mantle', 'It is the thin, outer layer.'],
    ['sc-light', 5, 'We see a band of different colours when white light passes through…', 'A prism', 'A rock', 'A towel', 'It bends the light.'],
    // ---- tier 6
    ['sc-earth', 6, 'Melted rock inside a volcano is called…', 'Magma', 'Granite', 'Sand', 'When it comes out it is called lava.'],
    ['sc-earth', 6, 'What are the three main layers of the Earth?', 'Crust, mantle, core', 'Air, water, soil', 'Rock, sand, clay', 'Start at the surface and go down.'],
    ['sc-earth', 6, 'Pumice is a rock that can float because it…', 'Is full of tiny holes', 'Is very smooth', 'Is made of wood', 'It forms from frothy lava.'],
    ['sc-energy', 6, 'Heat always flows from…', 'Hot things to cold things', 'Cold things to hot things', 'Dark things to light things', 'A hot drink cools down.'],
    ['sc-energy', 6, 'Which is a good insulator?', 'Wool', 'Copper', 'Iron', 'It keeps heat in.'],
    ['sc-energy', 6, 'What is the main source of energy for Earth?', 'The Sun', 'The Moon', 'The wind', 'It heats the planet and powers plants.'],
    ['sc-energy', 6, 'In a simple electric circuit, the bulb lights only if…', 'The circle is complete', 'The wire is long', 'The battery is cold', 'Electricity needs a full loop.'],
    ['sc-materials', 6, 'When baking soda and vinegar mix, you see bubbles of…', 'Gas', 'Metal', 'Sand', 'It fizzes and can fill a balloon.'],
    ['sc-materials', 6, 'When salt dissolves in water it…', 'Mixes in and seems to disappear', 'Turns to ice', 'Sinks as a rock', 'You can get it back by evaporating the water.'],
    ['sc-materials', 6, 'Which change can be undone?', 'Melting ice', 'Baking a cake', 'Burning wood', 'Freeze it again to see.'],
    ['sc-space', 6, 'How many planets are in our solar system?', 'Eight', 'Nine', 'Five', 'Mercury is the first.'],
    ['sc-space', 6, 'The seasons happen because Earth is…', 'Tilted as it goes around the Sun', 'Closer to the Moon', 'Flat', 'Different parts get more direct sunlight.'],
    ['sc-method', 6, 'In a fair test you should change…', 'Only one thing', 'Everything', 'Nothing', 'Then you know what caused the result.'],
    ['sc-method', 6, 'Why do scientists wear safety goggles in a lab?', 'To protect their eyes', 'To see in the dark', 'To look cool', 'Splashes can be dangerous.'],
    ['sc-method', 6, 'What should you do after an experiment?', 'Record and check the results', 'Forget the numbers', 'Change the question', 'Scientists keep careful notes.'],
    ['sc-method', 6, 'Which unit do we use to measure temperature?', 'Degrees Celsius', 'Kilograms', 'Metres', 'Boiling water is 100 of these.'],
    ['sc-adapt', 6, 'Camels store fat in their humps. Why?', 'For energy when food is scarce', 'To keep cool in water', 'To fly', 'Deserts have little food.'],
    ['sc-adapt', 6, 'Why are cacti good at living in deserts?', 'They store water in their stems', 'They need lots of rain', 'They grow in snow', 'Deserts are very dry.'],
    ['sc-forces', 6, 'Two magnets push apart when you bring together their…', 'Same poles', 'Different poles', 'Middles', 'Like poles repel.'],
    ['sc-light', 6, 'Why do we see lightning before we hear thunder?', 'Light travels faster than sound', 'Sound is faster', 'Thunder is quieter', 'Count the seconds between them.'],
    ['sc-weather', 6, 'Which would melt ice fastest?', 'Warm water', 'Cold water', 'A shady cupboard', 'Heat melts ice.']
  ];
  RAW.forEach(function (r) {
    n++;
    var id = 'sc-' + (n < 100 ? (n < 10 ? '00' : '0') : '') + n;
    var opts = RNG.shuffle(RNG.make(id), [r[3], r[4], r[5]]);
    bank.push({ id: id, subject: 'science', skill: r[0] === 'sc-matter' ? 'sc-materials' : r[0], tier: r[1], type: 'choice', text: r[2], options: opts, answer: r[3], hint: r[6] });
  });
  var byTier = {};
  bank.forEach(function (q) { (byTier[q.tier] = byTier[q.tier] || []).push(q); });
  return { SKILLS: SKILLS, bank: bank, byTier: byTier };
});
