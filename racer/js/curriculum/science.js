/* Science ("Discovery Lab") question bank. UMD: module.exports in Node, SQ.content.science in the browser.
 * The bank is built deterministically at load time (no Math.random); ids are stable as long as the
 * order of entries inside each skill section is kept (append new questions at the end of a section). */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.content = root.SQ.content || {}; root.SQ.content.science = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var skills = {
    'sc-habitats': 'Animal homes',
    'sc-food': 'What animals eat',
    'sc-babies': 'Animal babies',
    'sc-groups': 'Animal groups',
    'sc-lifecycle': 'Animal life cycles',
    'sc-plantparts': 'Parts of a plant',
    'sc-plantneeds': 'What plants need',
    'sc-plantcycle': 'Plant life cycle',
    'sc-weather': 'Weather',
    'sc-seasons': 'Seasons',
    'sc-senses': 'Five senses',
    'sc-body': 'Body parts',
    'sc-health': 'Healthy habits',
    'sc-pushpull': 'Push and pull',
    'sc-float': 'Float or sink',
    'sc-magnets': 'Magnets',
    'sc-hotcold': 'Hot and cold',
    'sc-light': 'Light and shadow',
    'sc-matter': 'Solid, liquid, gas',
    'sc-daynight': 'Day and night',
    'sc-space': 'Earth and sky'
  };

  var levels = [
    { title: 'Animal Homes', icon: '🏠', skills: ['sc-habitats'], diff: 1 },
    { title: 'Five Senses', icon: '👀', skills: ['sc-senses'], diff: 1 },
    { title: 'My Body', icon: '🦵', skills: ['sc-body'], diff: 1 },
    { title: 'Animal Food', icon: '🥕', skills: ['sc-food'], diff: 1 },
    { title: 'Weather Watch', icon: '🌦️', skills: ['sc-weather'], diff: 1 },
    { title: 'Baby Animals', icon: '🐣', skills: ['sc-babies'], diff: 1 },
    { title: 'Plant Parts', icon: '🌷', skills: ['sc-plantparts'], diff: 1 },
    { title: 'Healthy Me', icon: '🍎', skills: ['sc-health'], diff: 1 },
    { title: 'Day and Night', icon: '🌙', skills: ['sc-daynight'], diff: 1 },
    { title: 'Plant Needs', icon: '💧', skills: ['sc-plantneeds'], diff: 1 },
    { title: 'Push and Pull', icon: '🛒', skills: ['sc-pushpull'], diff: 1 },
    { title: 'Four Seasons', icon: '🍂', skills: ['sc-seasons'], diff: 2 },
    { title: 'Float or Sink', icon: '⛵', skills: ['sc-float'], diff: 2 },
    { title: 'Hot and Cold', icon: '🌡️', skills: ['sc-hotcold'], diff: 2 },
    { title: 'Seed to Plant', icon: '🌱', skills: ['sc-plantcycle'], diff: 2 },
    { title: 'Animal Groups', icon: '🦜', skills: ['sc-groups'], diff: 2 },
    { title: 'Magnet Magic', icon: '🧲', skills: ['sc-magnets'], diff: 2 },
    { title: 'Light and Shadow', icon: '🔦', skills: ['sc-light'], diff: 2 },
    { title: 'Solid, Liquid, Gas', icon: '🧊', skills: ['sc-matter'], diff: 2 },
    { title: 'Life Cycles', icon: '🦋', skills: ['sc-lifecycle'], diff: 2 },
    { title: 'Earth and Sky', icon: '🌍', skills: ['sc-space'], diff: 2 },
    { title: 'Animal Review', icon: '🐾', skills: ['sc-groups', 'sc-lifecycle'], diff: 3 },
    { title: 'Plant Review', icon: '🌻', skills: ['sc-plantneeds', 'sc-plantcycle'], diff: 3 },
    { title: 'Science Review', icon: '🔬', skills: ['sc-matter', 'sc-magnets'], diff: 3 }
  ];

  var bank = [];

  function hash(s) { // FNV-1a, 32-bit
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h ^= h >>> 15;
    return h >>> 0;
  }

  function mk(skill, pre) {
    var n = 0;
    function nextId() { n++; return 'sc-' + pre + '-' + (n < 10 ? '0' : '') + n; }
    function base(id, d, type, text, pic, hint, say) {
      var q = { id: id, skill: skill, d: d, type: type, text: text };
      if (say) q.say = [say];
      if (pic) q.pic = pic;
      q.hint = hint;
      return q;
    }
    return {
      // choice: answer is placed at a deterministic position derived from the id
      c: function (d, text, pic, answer, others, hint, say) {
        var id = nextId();
        var q = base(id, d, 'choice', text, pic, hint, say);
        var opts = others.slice();
        opts.splice(hash(id) % (others.length + 1), 0, answer);
        q.options = opts;
        q.answer = answer;
        bank.push(q);
      },
      // true / false statement
      t: function (d, text, pic, isTrue, hint, say) {
        var q = base(nextId(), d, 'tf', text, pic, hint, say);
        q.options = ['True', 'False'];
        q.answer = isTrue ? 'True' : 'False';
        bank.push(q);
      },
      // order: items given in the correct order; display order is a deterministic non-identity shuffle
      o: function (d, text, pic, items, hint, say) {
        var id = nextId();
        var q = base(id, d, 'order', text, pic, hint, say);
        var h = hash(id), opts;
        if ((h >>> 3) % 3 === 0) opts = items.slice().reverse();
        else {
          var k = 1 + ((h >>> 5) % (items.length - 1));
          opts = items.slice(k).concat(items.slice(0, k));
        }
        q.options = opts;
        q.answer = items.slice();
        bank.push(q);
      },
      // match: 3 pairs
      m: function (d, text, pairs, hint, say) {
        var q = base(nextId(), d, 'match', text, null, hint, say);
        q.pairs = pairs;
        bank.push(q);
      }
    };
  }

  var S;

  // ---------------------------------------------------------------- Animal homes
  S = mk('sc-habitats', 'hab');
  S.c(1, 'Where does a fish live?', '🐟', '🌊 Water', ['🌳 Tree', '🏜️ Desert'], 'Fish need water to swim.');
  S.c(1, 'Where does a bird make a nest?', '🐦', '🌳 Tree', ['🌊 Ocean', '🧊 Ice'], 'Look up high, on the branches.');
  S.c(1, 'Where does a camel live?', '🐫', '🏜️ Desert', ['🌊 Ocean', '🧊 Ice'], 'A camel can go a long time without water.');
  S.c(1, 'Where does a polar bear live?', '🐻‍❄️', '🧊 Cold ice', ['🏜️ Hot desert', '🌴 Jungle'], 'Its thick white fur keeps it warm.');
  S.c(1, 'Where does a bee live?', '🐝', '🍯 Hive', ['🌊 Ocean', '🧊 Ice'], 'Bees make honey at home.');
  S.c(2, 'Where does a monkey live?', '🐒', '🌴 Jungle', ['🧊 Ice', '🌊 Ocean'], 'Monkeys climb lots of trees.');
  S.c(2, 'Who lives in the ocean?', '🌊', '🐋 Whale', ['🐫 Camel', '🐿️ Squirrel', '🦁 Lion'], 'This animal is very big and swims.');
  S.c(2, 'Who lives in the desert?', '🏜️', '🐫 Camel', ['🐧 Penguin', '🐬 Dolphin'], 'This animal has a hump.');
  S.c(2, 'Who lives in a pond?', null, '🐸 Frog', ['🐫 Camel', '🐻‍❄️ Polar bear'], 'It hops and swims.');
  S.c(2, 'Where does a rabbit live?', '🐇', '🕳️ Burrow', ['🌊 Ocean', '🍯 Hive'], 'Rabbits dig a hole in the ground.');
  S.t(1, 'A fish lives in water.', '🐟', true, 'Think of where fish swim.');
  S.t(1, 'A camel lives on ice.', '🐫', false, 'Camels live where it is hot and sandy.');
  S.t(2, 'A penguin lives where it is cold.', '🐧', true, 'Penguins slide on snow and ice.');
  S.t(3, 'A whale lives on land.', '🐋', false, 'Whales are big swimmers.');
  S.m(2, 'Match the animal to its home.', [['🐝', 'hive'], ['🐟', 'water'], ['🐦', 'nest']], 'Bees make honey. Birds lay eggs up high.');
  S.m(3, 'Match the animal to its home.', [['🐫', 'desert'], ['🐻‍❄️', 'ice'], ['🐒', 'jungle']], 'Think hot sand, cold snow, and tall trees.');
  S.c(3, 'Why does a duck have webbed feet?', '🦆', '🏊 To swim', ['✈️ To fly', '🧗 To climb'], 'Ducks paddle in ponds.');
  S.c(3, 'What is a habitat?', null, '🏠 Animal home', ['🍎 Animal food', '🎵 Animal song'], 'A pond is a habitat for frogs.');

  // ---------------------------------------------------------------- What animals eat
  S = mk('sc-food', 'food');
  S.c(1, 'What does a cow eat?', '🐄', '🌾 Grass', ['🐟 Fish', '🍖 Meat'], 'Cows munch in green fields.');
  S.c(1, 'What does a rabbit eat?', '🐇', '🥕 Carrot', ['🍖 Meat', '🐟 Fish'], 'Rabbits eat plants.');
  S.c(1, 'What does a bee drink?', '🐝', '🌸 Nectar', ['🥛 Milk', '🍕 Pizza'], 'Bees visit flowers.');
  S.c(1, 'What does a monkey eat?', '🐒', '🍌 Banana', ['🐟 Fish', '🦴 Bone'], 'It is a yellow fruit.');
  S.c(1, 'What does a panda eat?', '🐼', '🎋 Bamboo', ['🐟 Fish', '🍔 Burger'], 'Pandas chew tall green stalks.');
  S.c(2, 'What does a lion eat?', '🦁', '🍖 Meat', ['🌾 Grass', '🍌 Banana'], 'Lions hunt other animals.');
  S.c(2, 'What does a squirrel eat?', '🐿️', '🌰 Nuts', ['🐟 Fish', '🍖 Meat'], 'It hides them for winter.');
  S.c(2, 'What does a bird eat?', '🐦', '🪱 Worm', ['🍔 Burger', '🦴 Bone'], 'Birds pull them out of the dirt.');
  S.c(2, 'What does a penguin eat?', '🐧', '🐟 Fish', ['🥕 Carrot', '🌾 Grass'], 'Penguins dive in the sea for food.');
  S.c(2, 'What does a horse eat?', '🐴', '🌾 Hay', ['🐟 Fish', '🍖 Meat'], 'Horses eat plants.');
  S.c(3, 'Which animal eats only plants?', null, '🐄 Cow', ['🦁 Lion', '🦈 Shark'], 'It gives us milk.');
  S.c(3, 'Which animal eats meat?', null, '🐯 Tiger', ['🐼 Panda', '🐄 Cow', '🐇 Rabbit'], 'It has sharp teeth and stripes.');
  S.c(3, 'Which animal eats fish?', null, '🦭 Seal', ['🐄 Cow', '🐴 Horse'], 'It swims in cold seas.');
  S.t(1, 'A cow eats grass.', '🐄', true, 'Cows munch in green fields.');
  S.t(1, 'A rabbit eats meat.', '🐇', false, 'Rabbits munch on plants.');
  S.t(2, 'A lion eats meat.', '🦁', true, 'Lions hunt other animals.');
  S.t(2, 'A panda eats fish.', '🐼', false, 'Pandas love a green plant.');
  S.m(2, 'Match the animal to its food.', [['🐄', 'grass'], ['🐒', 'banana'], ['🐿️', 'nuts']], 'Monkeys like fruit. Squirrels hide food for winter.');
  S.m(3, 'Match the animal to its food.', [['🐧', 'fish'], ['🐝', 'nectar'], ['🐼', 'bamboo']], 'Bees visit flowers. Penguins dive in the sea.');

  // ---------------------------------------------------------------- Animal babies
  S = mk('sc-babies', 'baby');
  S.c(1, 'What is a baby dog?', '🐕', 'Puppy', ['Kitten', 'Chick'], 'It says a tiny woof.');
  S.c(1, 'What is a baby cat?', '🐈', 'Kitten', ['Puppy', 'Cub'], 'It says a tiny meow.');
  S.c(1, 'What is a baby hen?', '🐔', 'Chick', ['Calf', 'Kitten'], 'It is small, yellow and fluffy.');
  S.c(1, 'What is a baby cow?', '🐄', 'Calf', ['Puppy', 'Chick'], 'Its name rhymes with half.');
  S.c(2, 'What is a baby bear?', '🐻', 'Cub', ['Kitten', 'Duckling'], 'Its name is short, like cup.');
  S.c(2, 'What is a baby duck?', '🦆', 'Duckling', ['Puppy', 'Calf'], 'Its name starts like duck.');
  S.c(2, 'What is a baby frog?', '🐸', 'Tadpole', ['Kitten', 'Chick'], 'It swims and has a tail.');
  S.c(2, 'What is a baby sheep?', '🐑', 'Lamb', ['Cub', 'Chick'], 'It has soft white wool.');
  S.c(2, 'What is a baby horse?', '🐴', 'Foal', ['Kitten', 'Duckling'], 'Its name rhymes with goal.');
  S.c(3, 'What is a baby kangaroo?', '🦘', 'Joey', ['Cub', 'Lamb', 'Calf'], 'It rides in mom\'s pouch.');
  S.c(3, 'What is a baby lion?', '🦁', 'Cub', ['Lamb', 'Foal'], 'Baby bears have the same name.');
  S.c(3, 'What is a baby butterfly?', '🦋', 'Caterpillar', ['Tadpole', 'Chick'], 'It crawls and eats leaves.');
  S.t(1, 'A baby cat is a kitten.', '🐈', true, 'Think of a tiny meow.');
  S.t(2, 'A baby cow is a puppy.', '🐄', false, 'Puppies are dog babies.');
  S.t(2, 'A baby sheep is a lamb.', '🐑', true, 'It has soft white wool.');
  S.t(3, 'A puppy hatches from an egg.', '🐶', false, 'Puppies drink milk from mom.');
  S.m(1, 'Match the animal to its baby.', [['🐶', 'puppy'], ['🐱', 'kitten'], ['🐔', 'chick']], 'A tiny woof, a tiny meow, a tiny peep.');
  S.m(2, 'Match the animal to its baby.', [['🐄', 'calf'], ['🐑', 'lamb'], ['🐻', 'cub']], 'A lamb has soft wool.');
  S.m(3, 'Match the animal to its baby.', [['🦆', 'duckling'], ['🐴', 'foal'], ['🦘', 'joey']], 'A joey rides in a pouch.');

  // ---------------------------------------------------------------- Animal groups
  S = mk('sc-groups', 'grp');
  S.c(1, 'Which one is a bird?', null, '🦅 Eagle', ['🐟 Fish', '🐶 Dog'], 'Birds have feathers and wings.');
  S.c(1, 'Which one is a fish?', null, '🦈 Shark', ['🐸 Frog', '🦆 Duck'], 'Fish have fins and gills.');
  S.c(1, 'Which one is an insect?', null, '🐜 Ant', ['🐶 Dog', '🐟 Fish'], 'Insects have six legs.');
  S.c(1, 'Which one has feathers?', null, '🦜 Parrot', ['🐱 Cat', '🐍 Snake'], 'It can fly.');
  S.c(2, 'Which one is a mammal?', null, '🐶 Dog', ['🐍 Snake', '🐦 Bird', '🐟 Fish'], 'Mammals have hair or fur.');
  S.c(2, 'Which one is a reptile?', null, '🐍 Snake', ['🐶 Dog', '🐝 Bee'], 'Reptiles have dry scales.');
  S.c(2, 'What is a bee?', '🐝', 'Insect', ['Bird', 'Fish'], 'Count its six legs.');
  S.c(2, 'What is a turtle?', '🐢', 'Reptile', ['Bird', 'Insect'], 'It has scales and a hard shell.');
  S.c(2, 'What is an owl?', '🦉', 'Bird', ['Fish', 'Insect'], 'It has feathers and wings.');
  S.c(2, 'How many legs does an insect have?', '🐞', '6', ['4', '8'], 'More than four, less than eight.');
  S.c(2, 'Which animal lays eggs?', null, '🐔 Hen', ['🐶 Dog', '🐄 Cow'], 'You eat its eggs for breakfast.');
  S.c(3, 'Which one is a mammal?', null, '🐋 Whale', ['🦈 Shark', '🐢 Turtle'], 'It breathes air and feeds babies milk.');
  S.t(1, 'A dog has fur.', '🐕', true, 'Pet a dog. How does it feel?');
  S.t(2, 'A snake has feathers.', '🐍', false, 'Snakes have scales.');
  S.t(3, 'A whale is a fish.', '🐋', false, 'Whales breathe air and feed milk to babies.');
  S.t(3, 'A bat is a bird.', '🦇', false, 'Bats have fur, not feathers.');
  S.t(3, 'A spider is an insect.', '🕷️', false, 'Insects have six legs.');
  S.m(2, 'Match the animal to its group.', [['🐦', 'bird'], ['🐟', 'fish'], ['🐜', 'insect']], 'Feathers, fins, and six legs.');
  S.m(3, 'Match the animal to its group.', [['🐍', 'reptile'], ['🐶', 'mammal'], ['🐝', 'insect']], 'Scales, fur, and six legs.');

  // ---------------------------------------------------------------- Animal life cycles
  S = mk('sc-lifecycle', 'life');
  S.o(1, 'Put the chicken in order.', '🐔', ['🥚 Egg', '🐣 Hatching', '🐔 Hen'], 'Every chick starts in an egg.');
  S.o(1, 'Put the butterfly in order.', '🦋', ['🥚 Egg', '🐛 Caterpillar', '🦋 Butterfly'], 'A caterpillar hatches from the egg.');
  S.o(1, 'Put the frog in order.', '🐸', ['🥚 Eggs', 'Tadpole', '🐸 Frog'], 'A tadpole hatches from the egg.');
  S.o(2, 'Put the butterfly in order.', '🦋', ['🥚 Egg', '🐛 Caterpillar', 'Chrysalis', '🦋 Butterfly'], 'The caterpillar makes a case before it changes.');
  S.o(2, 'Put the chicken in order.', '🐔', ['🥚 Egg', '🐣 Hatching', '🐥 Chick', '🐔 Hen'], 'A chick grows up to be a hen.');
  S.o(3, 'Put the frog in order.', '🐸', ['🥚 Eggs', 'Tadpole', 'Froglet', '🐸 Frog'], 'A froglet has legs and a little tail.');
  S.o(2, 'Put the people in order.', null, ['👶 Baby', '🧒 Child', '🧑 Adult', '🧓 Older adult'], 'Start with the smallest one.');
  S.c(1, 'What comes out of a chicken egg?', '🥚', '🐣 Chick', ['🐛 Caterpillar', '🐟 Fish'], 'It grows up to be a hen.');
  S.c(2, 'What does a caterpillar become?', '🐛', '🦋 Butterfly', ['🐝 Bee', '🐦 Bird'], 'It gets big pretty wings.');
  S.c(2, 'What does a tadpole become?', null, '🐸 Frog', ['🐟 Fish', '🐢 Turtle'], 'It grows legs and hops.');
  S.c(2, 'What comes after the caterpillar?', '🐛', 'Chrysalis', ['🥚 Egg', '🐣 Chick'], 'It is a hard case, like a sleeping bag.');
  S.c(3, 'What does a tadpole lose as it grows?', null, 'Its tail', ['Its eyes', 'Its mouth'], 'Frogs hop without one.');
  S.t(1, 'A chick hatches from an egg.', '🐣', true, 'Think of how a hen has babies.');
  S.t(2, 'A tadpole lives in water.', null, true, 'Tadpoles swim with a tail.');
  S.t(2, 'A butterfly lays eggs.', '🦋', true, 'Every caterpillar comes from a tiny egg.');
  S.t(3, 'A caterpillar turns into a bee.', '🐛', false, 'It grows big pretty wings.');
  S.m(2, 'Match baby to grown-up.', [['🐛', '🦋'], ['🐣', '🐔'], ['👶', '🧑']], 'A caterpillar gets wings. A chick gets big.');

  // ---------------------------------------------------------------- Parts of a plant
  S = mk('sc-plantparts', 'ppart');
  S.c(1, 'Which part is under the ground?', '🌱', 'Roots', ['Leaves', 'Flower'], 'They drink water from the soil.');
  S.c(1, 'Which part do bees visit?', '🐝', '🌸 Flower', ['🍃 Leaf', 'Stem'], 'It is pretty and colorful.');
  S.c(1, 'What color are most leaves?', '🍃', '🟩 Green', ['🟦 Blue', '🟪 Purple'], 'Think of grass.');
  S.c(2, 'What holds the plant up?', '🌷', 'Stem', ['Flower', 'Seed'], 'It is like a straw from roots to leaves.');
  S.c(2, 'Which part grows into a new plant?', null, '🌰 Seed', ['🍃 Leaf', '🌸 Flower'], 'Farmers put it in the dirt.');
  S.c(2, 'We eat this carrot part. What is it?', '🥕', 'Root', ['Leaf', 'Flower'], 'It grows under the dirt.');
  S.c(2, 'Which part makes food from sunlight?', null, '🍃 Leaves', ['Roots', '🌰 Seeds'], 'They are flat, green, and face the sun.');
  S.c(2, 'Where are seeds found?', null, '🍎 In fruit', ['In roots', 'In leaves'], 'Cut open an apple to see.');
  S.c(3, 'What carries water up the plant?', null, 'Stem', ['Petals', 'Seeds'], 'It goes from the roots to the leaves.');
  S.c(3, 'What are the colorful parts of a flower?', '🌸', 'Petals', ['Roots', 'Stem'], 'Bees see these bright colors.');
  S.c(3, 'Lettuce is which part of a plant?', '🥬', 'Leaves', ['Roots', 'Seeds'], 'They are flat and green.');
  S.t(1, 'Roots grow under the ground.', '🌱', true, 'Dig in the dirt to find them.');
  S.t(1, 'Most leaves are green.', '🍃', true, 'Look at a tree in summer.');
  S.t(2, 'A flower grows under the ground.', '🌸', false, 'Flowers bloom in the sun.');
  S.t(2, 'Roots hold the plant in the soil.', '🌱', true, 'Pull a weed. What holds on?');
  S.m(1, 'Match the plant parts.', [['🌸', 'flower'], ['🍃', 'leaf'], ['🌰', 'seed']], 'A seed is small. A leaf is green.');
  S.m(3, 'Match the food to the plant part.', [['🥕', 'root'], ['🥬', 'leaf'], ['🍎', 'fruit']], 'A carrot grows under the dirt.');

  // ---------------------------------------------------------------- What plants need
  S = mk('sc-plantneeds', 'pneed');
  S.c(1, 'What do plants need to grow?', '🌱', '💧 Water', ['🍬 Candy', '🧸 Toys'], 'You give it with a watering can.');
  S.c(1, 'What gives plants light?', '🌻', '☀️ Sun', ['🌧️ Rain', '❄️ Snow'], 'It shines bright in the day.');
  S.c(1, 'Where do plants grow?', null, '🪴 In soil', ['🧊 In ice', '🔥 In fire'], 'Dig in the garden.');
  S.c(2, 'A plant gets no water. What happens?', null, '🥀 It wilts', ['🌻 It grows big', '🌸 It blooms'], 'Plants get thirsty too.');
  S.c(2, 'What do roots take from the soil?', null, '💧 Water', ['☀️ Light', '🍬 Candy'], 'Roots drink.');
  S.c(2, 'Plants need this too. What is it?', '🌱', '💨 Air', ['🍕 Pizza', '📺 TV'], 'You breathe it too.');
  S.c(2, 'Where should you put a plant?', '🪴', '🪟 Sunny window', ['🚪 Dark closet', '📦 Closed box'], 'Plants love bright light.');
  S.c(2, 'What do seeds need to sprout?', '🌰', '💧 Water', ['🧊 Ice', '🎈 Balloons'], 'Seeds get thirsty in the soil.');
  S.c(3, 'Which one does a plant NOT need?', null, '🍬 Candy', ['💧 Water', '☀️ Sunlight', '💨 Air'], 'Plants do not eat sweets.');
  S.c(3, 'What do plants make with sunlight?', '🍃', '🍽️ Their food', ['🎵 Music', '🧊 Ice'], 'Leaves are like little kitchens.');
  S.t(1, 'Plants need water.', '🌱', true, 'Think of a watering can.');
  S.t(1, 'Plants need candy to grow.', '🌱', false, 'Plants do not eat sweets.');
  S.t(2, 'Plants need sunlight.', '🌻', true, 'Sunflowers turn to face it.');
  S.t(2, 'A plant grows well in a dark box.', '📦', false, 'Plants love bright light.');
  S.t(2, 'Plants need air.', '🌱', true, 'Leaves take in air.');
  S.t(3, 'Plants make their own food.', '🍃', true, 'Leaves use sunlight to cook.');
  S.m(1, 'Match what plants need.', [['☀️', 'light'], ['💧', 'water'], ['💨', 'air']], 'The sun gives light. Rain gives water.');

  // ---------------------------------------------------------------- Plant life cycle
  S = mk('sc-plantcycle', 'pcyc');
  S.o(1, 'Put the sunflower in order.', '🌻', ['🌰 Seed', '🌱 Sprout', '🌻 Flower'], 'Start with what you plant in the dirt.');
  S.o(1, 'Put the tree in order.', '🌳', ['🌰 Seed', '🌱 Sprout', '🌳 Tree'], 'Start small, end big.');
  S.o(2, 'Put the plant in order.', null, ['🌰 Seed', '🌱 Sprout', '🌿 Plant', '🌻 Flower'], 'The flower comes last.');
  S.o(2, 'Put the apple tree in order.', '🍎', ['🌰 Seed', '🌱 Sprout', '🌳 Tree', '🍎 Apple'], 'The tree grows before the fruit.');
  S.o(3, 'Put the apple tree in order.', '🍎', ['🌱 Sprout', '🌳 Tree', '🌸 Blossom', '🍎 Apple'], 'Fruit grows where flowers were.');
  S.o(3, 'Put the pumpkin in order.', '🎃', ['🌰 Seed', '🌱 Sprout', '🌼 Flower', '🎃 Pumpkin'], 'Fruit grows where flowers were.');
  S.c(1, 'What does a seed grow into?', '🌰', '🌱 Plant', ['🐣 Chick', '🪨 Rock'], 'Plant it, water it, and watch.');
  S.c(1, 'What comes first?', null, '🌰 Seed', ['🌻 Flower', '🌳 Tree'], 'Farmers plant this in the dirt.');
  S.c(2, 'What is a baby plant?', null, '🌱 Sprout', ['🌳 Tree', '🍂 Leaf'], 'It just popped out of the soil.');
  S.c(3, 'What grows first from a seed?', '🌰', 'Roots', ['Flower', 'Fruit'], 'They grow down into the soil.');
  S.c(2, 'Where do new seeds come from?', null, '🍎 Fruit', ['🪨 Rocks', '💧 Rain'], 'Cut open an apple or a melon.');
  S.c(3, 'What grows from an acorn?', null, '🌳 Oak tree', ['🌻 Sunflower', '🥕 Carrot'], 'Squirrels bury acorns, and some grow very tall.');
  S.t(1, 'A seed can grow into a plant.', '🌰', true, 'Plant it, water it, and watch.');
  S.t(2, 'A tree grows from a seed.', '🌳', true, 'Every big tree was once very small.');
  S.t(2, 'A plant starts as a flower.', '🌸', false, 'Think of what you plant in the ground.');
  S.t(3, 'A sprout is a grown-up plant.', '🌱', false, 'A sprout is very small and new.');

  // ---------------------------------------------------------------- Weather
  S = mk('sc-weather', 'wea');
  S.c(1, 'What do you need in the rain?', '🌧️', '☂️ Umbrella', ['🕶️ Sunglasses', '🧤 Gloves'], 'It keeps your head dry.');
  S.c(1, 'What is the weather?', '☀️', 'Sunny', ['Rainy', 'Snowy'], 'Look at the bright light in the sky.');
  S.c(1, 'What is the weather?', '🌧️', 'Rainy', ['Sunny', 'Snowy'], 'Drops of water are falling.');
  S.c(1, 'What is the weather?', '❄️', 'Snowy', ['Sunny', 'Windy'], 'It is cold and white.');
  S.c(1, 'What do you wear when it snows?', '❄️', '🧥 Coat', ['🩳 Shorts', '👡 Sandals'], 'Stay warm!');
  S.c(2, 'What is the weather?', '💨', 'Windy', ['Snowy', 'Rainy'], 'The air is blowing hard.');
  S.c(2, 'What makes a rainbow?', '🌈', '🌦️ Sun and rain', ['❄️ Snow and ice', '🌙 The moon'], 'You need light and water drops.');
  S.c(2, 'What comes before rain?', null, '☁️ Dark clouds', ['🌈 Rainbow', '⭐ Stars'], 'They can be dark gray.');
  S.c(2, 'Which one needs wind?', '💨', '🪁 Kite', ['🚲 Bike', '📚 Book'], 'It flies up high on a string.');
  S.c(2, 'Where does rain come from?', '🌧️', '☁️ Clouds', ['🌳 Trees', '⛰️ Mountains'], 'Look up at the gray sky.');
  S.c(3, 'What tool tells how hot it is?', null, '🌡️ Thermometer', ['☂️ Umbrella', '🧭 Compass'], 'Its red line goes up when it is hot.');
  S.c(3, 'What is a big storm with lightning?', null, '⛈️ Thunderstorm', ['🌈 Rainbow', '🌤️ Sunny day'], 'You hear a loud boom.');
  S.t(1, 'Snow is cold.', '❄️', true, 'Snowmen do not melt in the cold.');
  S.t(1, 'Rain makes things wet.', '🌧️', true, 'Rain is falling water.');
  S.t(2, 'You wear a coat on a hot day.', '☀️', false, 'Hot days are for shorts.');
  S.t(3, 'Weather can change every day.', '🌦️', true, 'Is every day the same outside?');
  S.m(1, 'Match the weather.', [['☀️', 'sunny'], ['🌧️', 'rainy'], ['❄️', 'snowy']], 'Look at each picture.');
  S.m(2, 'Match what you need.', [['☂️', 'rain'], ['🕶️', 'sun'], ['🧤', 'snow']], 'Gloves keep your hands warm.');

  // ---------------------------------------------------------------- Seasons
  S = mk('sc-seasons', 'sea');
  S.c(1, 'In which season does snow fall?', '❄️', '❄️ Winter', ['☀️ Summer', '🌸 Spring'], 'It is the coldest season.');
  S.c(1, 'Which season is the hottest?', null, '☀️ Summer', ['❄️ Winter', '🍂 Fall'], 'Time for the pool and the beach.');
  S.c(1, 'When do leaves fall off trees?', '🍂', '🍂 Fall', ['🌸 Spring', '☀️ Summer'], 'The season name tells you.');
  S.c(1, 'When do flowers start to bloom?', '🌷', '🌸 Spring', ['❄️ Winter', '🍂 Fall'], 'It comes right after winter.');
  S.c(2, 'How many seasons are there?', null, '4', ['2', '6'], 'Count them on your fingers.');
  S.c(2, 'What comes after winter?', null, '🌸 Spring', ['☀️ Summer', '🍂 Fall'], 'Snow melts and flowers come back.');
  S.c(2, 'What comes after summer?', null, '🍂 Fall', ['❄️ Winter', '🌸 Spring'], 'Leaves change color next.');
  S.c(2, 'What do you wear in winter?', '❄️', '🧣 Scarf', ['🩳 Shorts', '🩴 Flip-flops'], 'Keep your neck warm.');
  S.c(2, 'What do you do in summer?', '☀️', '🏊 Swim', ['⛄ Build snowman', '🛷 Sled'], 'It is hot outside.');
  S.c(3, 'What comes after fall?', '🍂', '❄️ Winter', ['🌸 Spring', '☀️ Summer'], 'It gets very cold next.');
  S.c(3, 'Fall has another name. What is it?', '🍂', 'Autumn', ['Spring', 'Winter'], 'It starts with A.');
  S.c(3, 'Who sleeps all winter?', '❄️', '🐻 Bear', ['🐶 Dog', '🐄 Cow'], 'It sleeps in a cave.');
  S.o(2, 'Start with spring. Put in order.', null, ['🌸 Spring', '☀️ Summer', '🍂 Fall', '❄️ Winter'], 'After spring comes the hottest season.');
  S.t(1, 'Winter is cold.', '❄️', true, 'Think of snow.');
  S.t(1, 'Snow falls in summer.', '☀️', false, 'Summer is the hottest season.');
  S.t(2, 'Leaves change color in fall.', '🍂', true, 'Think red, orange and yellow trees.');
  S.t(3, 'Spring comes after summer.', '🌸', false, 'Spring comes right after winter.');
  S.m(2, 'Match the season.', [['❄️', 'winter'], ['🌸', 'spring'], ['🍂', 'fall']], 'Snow, flowers, and falling leaves.');

  // ---------------------------------------------------------------- Five senses
  S = mk('sc-senses', 'sen');
  S.c(1, 'What do you see with?', null, '👀 Eyes', ['👂 Ears', '👃 Nose'], 'Close them and it gets dark.');
  S.c(1, 'What do you hear with?', null, '👂 Ears', ['👀 Eyes', '✋ Hands'], 'They are on the sides of your head.');
  S.c(1, 'What do you smell with?', null, '👃 Nose', ['👅 Tongue', '👂 Ears'], 'Sniff, sniff!');
  S.c(1, 'What do you taste with?', null, '👅 Tongue', ['👃 Nose', '👀 Eyes'], 'It is inside your mouth.');
  S.c(1, 'What do you feel with?', null, '✋ Hands', ['👂 Ears', '👀 Eyes'], 'You have five fingers on each.');
  S.c(2, 'A flower smells nice. Which sense?', '🌸', '👃 Smell', ['👂 Hear', '👅 Taste'], 'Sniff, sniff!');
  S.c(2, 'A drum goes boom! Which sense?', '🥁', '👂 Hear', ['👃 Smell', '👅 Taste'], 'Bang, bang! It is loud.');
  S.c(2, 'A lemon is sour. Which sense?', '🍋', '👅 Taste', ['👀 See', '👂 Hear'], 'You put it in your mouth.');
  S.c(2, 'A rainbow is pretty. Which sense?', '🌈', '👀 See', ['👃 Smell', '👅 Taste'], 'Look up in the sky.');
  S.c(2, 'Ice feels cold. Which sense?', '🧊', '✋ Touch', ['👂 Hear', '👃 Smell'], 'Hold it in your hand.');
  S.c(2, 'Which sense helps you read a book?', '📖', '👀 See', ['👃 Smell', '👅 Taste'], 'Look at the words.');
  S.c(3, 'How many senses do you have?', null, '5', ['3', '7'], 'Count them on one hand.');
  S.c(3, 'Which sense hears a fire alarm?', null, '👂 Hear', ['👅 Taste', '✋ Touch'], 'Beep, beep, beep!');
  S.t(1, 'You hear with your ears.', '👂', true, 'Cover them. Is it quiet?');
  S.t(2, 'You smell with your eyes.', '👀', false, 'Sniff, sniff! What do you use?');
  S.t(3, 'Your skin helps you feel.', '✋', true, 'Touch something soft.');
  S.m(1, 'Match the body part to the sense.', [['👀', 'see'], ['👂', 'hear'], ['👃', 'smell']], 'Look, listen, and sniff.');
  S.m(2, 'Match the body part to the sense.', [['👅', 'taste'], ['✋', 'touch'], ['👀', 'see']], 'You eat with your mouth.');

  // ---------------------------------------------------------------- Body parts
  S = mk('sc-body', 'body');
  S.c(1, 'What do you walk with?', null, '🦵 Legs', ['👂 Ears', '👃 Nose'], 'You have two, and they are long.');
  S.c(1, 'What do you chew with?', null, '🦷 Teeth', ['👂 Ears', '✋ Hands'], 'Brush them two times a day.');
  S.c(1, 'What do you wave with?', null, '✋ Hand', ['🦶 Foot', '👃 Nose'], 'Say hello and bye-bye.');
  S.c(1, 'What do you kick a ball with?', '⚽', '🦶 Foot', ['✋ Hand', '👂 Ear'], 'You wear a shoe on it.');
  S.c(1, 'How many fingers on two hands?', '🙌', '10', ['5', '8'], 'Count them all!');
  S.c(2, 'What pumps blood?', null, '❤️ Heart', ['🦴 Bones', '🦷 Teeth'], 'You can feel it beat in your chest.');
  S.c(2, 'What helps you breathe?', null, '🫁 Lungs', ['🦷 Teeth', '🦶 Feet'], 'They fill with air in your chest.');
  S.c(2, 'What helps you think?', null, '🧠 Brain', ['❤️ Heart', '🦵 Legs'], 'It is inside your head.');
  S.c(2, 'What holds your body up?', null, '🦴 Bones', ['👅 Tongue', '👂 Ears'], 'You have more than 200 of them.');
  S.c(3, 'What helps you move?', null, '💪 Muscles', ['💇 Hair', '💅 Nails'], 'Flex your arm to feel them.');
  S.c(3, 'Where is your heart?', '❤️', '👕 In your chest', ['🦶 In your foot', '👃 In your nose'], 'Put your hand there and feel the beat.');
  S.c(3, 'Your skull keeps what safe?', '💀', '🧠 Brain', ['❤️ Heart', '🫁 Lungs'], 'Your skull is in your head.');
  S.t(1, 'You have two hands.', '🙌', true, 'Count them!');
  S.t(1, 'You have three feet.', '🦶', false, 'Count your shoes.');
  S.t(2, 'Your heart beats faster when you run.', '🏃', true, 'Run, then feel your chest.');
  S.t(3, 'Bones are soft like jelly.', '🦴', false, 'Bones hold you up.');
  S.m(1, 'Match the body parts.', [['👀', 'eyes'], ['👂', 'ears'], ['🦶', 'feet']], 'Look at each picture.');
  S.m(2, 'Match the body part to its job.', [['🧠', 'think'], ['🫁', 'breathe'], ['🦷', 'chew']], 'Teeth help you eat.');

  // ---------------------------------------------------------------- Healthy habits
  S = mk('sc-health', 'hlth');
  S.c(1, 'What should you do before eating?', null, '🧼 Wash hands', ['🎮 Play games', '🛏️ Sleep'], 'Use soap and water.');
  S.c(1, 'Which food is healthy?', null, '🍎 Apple', ['🍭 Candy', '🍩 Donut'], 'It is a crunchy fruit.');
  S.c(1, 'What keeps teeth clean?', '🦷', '🪥 Toothbrush', ['🍬 Candy', '🧸 Teddy'], 'Use it with toothpaste.');
  S.c(1, 'What is a healthy drink?', null, '💧 Water', ['🥤 Soda', '🧋 Bubble tea'], 'It has no sugar.');
  S.c(2, 'Where should you sneeze?', '🤧', '💪 Into elbow', ['💨 Into the air', '🧑 On a friend'], 'Cover it up to stop germs.');
  S.c(2, 'Which is good exercise?', null, '🏃 Running', ['📺 Watching TV', '🛋️ Sitting'], 'It makes your heart beat fast.');
  S.c(2, 'Which food is healthy?', null, '🥦 Broccoli', ['🍟 Fries', '🍬 Candy'], 'It looks like a little green tree.');
  S.c(2, 'Kids need lots of what?', null, '😴 Sleep', ['🍬 Candy', '📱 Screen time'], 'You do it in bed at night.');
  S.c(2, 'How many times a day do you brush?', '🪥', '2', ['0', '10'], 'Think: morning and night.');
  S.c(3, 'How long should you brush your teeth?', '🪥', '2 minutes', ['2 seconds', '2 hours'], 'Sing a song while you brush.');
  S.c(3, 'Why do we wash our hands?', '🧼', '🦠 Remove germs', ['🎨 Add color', '🧊 Get cold'], 'Tiny bugs can make you sick.');
  S.c(3, 'What keeps your head safe on a bike?', '🚲', 'Helmet', ['Scarf', 'Mittens'], 'It is hard and keeps you safe if you fall.');
  S.t(1, 'Wash your hands with soap.', '🧼', true, 'Soap washes germs away.');
  S.t(1, 'Fruits and veggies are good for you.', '🍎', true, 'They help you grow strong.');
  S.t(2, 'You should brush your teeth every day.', '🪥', true, 'Clean teeth are happy teeth.');
  S.t(2, 'Soda is better for you than water.', '🥤', false, 'Soda has lots of sugar.');
  S.t(3, 'Germs are too small to see.', '🦠', true, 'You need a special tool to see them.');
  S.m(2, 'Match the healthy habit.', [['🧼', 'wash'], ['🪥', 'brush'], ['🛏️', 'sleep']], 'Soap, toothbrush, and bed.');

  // ---------------------------------------------------------------- Push and pull
  S = mk('sc-pushpull', 'push');
  S.c(1, 'Kick a ball. Push or pull?', '⚽', 'Push', ['Pull'], 'Your foot moves it away from you.');
  S.c(1, 'Tug a rope. Push or pull?', '🪢', 'Pull', ['Push'], 'You bring it toward you.');
  S.c(1, 'Press a button. Push or pull?', '🔘', 'Push', ['Pull'], 'Your finger presses away from you.');
  S.c(2, 'Open a drawer. Push or pull?', null, 'Pull', ['Push'], 'The drawer comes toward you.');
  S.c(2, 'Pick an apple. Push or pull?', '🍎', 'Pull', ['Push'], 'The apple comes toward you.');
  S.c(2, 'Move a cart forward. Push or pull?', '🛒', 'Push', ['Pull'], 'You walk behind it.');
  S.c(2, 'Roll a bowling ball. Push or pull?', '🎳', 'Push', ['Pull'], 'It rolls away from you.');
  S.c(2, 'Take a weed out. Push or pull?', '🌱', 'Pull', ['Push'], 'You lift it up toward you.');
  S.c(2, 'What makes a ball move?', '⚽', '✋ A push', ['😴 Sleeping', '👀 Looking'], 'Something has to touch it.');
  S.c(3, 'A harder push makes a ball go...', '⚽', 'Faster', ['Slower', 'Backwards'], 'Kick it soft, then kick it hard.');
  S.c(3, 'What makes things fall down?', '🍎', '🌍 Gravity', ['🧲 Magnets', '🎵 Music'], 'It pulls everything toward the ground.');
  S.c(3, 'A push or a pull is a...', null, 'Force', ['Color', 'Sound'], 'The science word starts with F.');
  S.t(1, 'A push moves things away from you.', '✋', true, 'Push a toy car. Where does it go?');
  S.t(2, 'A pull moves things away from you.', null, false, 'Pull a wagon. Where does it go?');
  S.t(3, 'A hard kick makes a ball go far.', '⚽', true, 'More force, more speed.');

  // ---------------------------------------------------------------- Float or sink
  var FS = '⬆️ Floats', SK = '⬇️ Sinks';
  S = mk('sc-float', 'flt');
  function fs(d, name, pic, floats, hint) {
    S.c(d, 'Does ' + name + ' float or sink?', pic, floats ? FS : SK, [floats ? SK : FS], hint);
  }
  fs(1, 'a rock', '🪨', false, 'Rocks are heavy for their size.');
  fs(1, 'a boat', '⛵', true, 'Boats carry people on the water.');
  fs(1, 'a leaf', '🍃', true, 'Leaves are very light.');
  fs(1, 'a key', '🔑', false, 'Keys are small and made of heavy metal.');
  fs(1, 'an anchor', '⚓', false, 'An anchor holds a boat in place.');
  fs(2, 'a duck', '🦆', true, 'Ducks paddle on top of ponds.');
  fs(2, 'a coin', '🪙', false, 'Coins are made of metal.');
  fs(2, 'wood', '🪵', true, 'Old boats were made of it.');
  fs(2, 'a basketball', '🏀', true, 'It is full of air.');
  fs(2, 'a metal bolt', '🔩', false, 'It is small but heavy metal.');
  fs(2, 'a feather', '🪶', true, 'Feathers are very light.');
  fs(3, 'ice', '🧊', true, 'Look at ice cubes in your drink.');
  fs(3, 'an apple', '🍎', true, 'Apples have air inside them.');
  S.c(2, 'Which one sinks?', null, '🔑 Key', ['🍃 Leaf', '🪶 Feather'], 'It is made of metal.');
  S.c(2, 'Which one floats?', null, '🪵 Wood', ['🪨 Rock', '🪙 Coin'], 'Rafts are made of it.');
  S.t(1, 'A boat floats.', '⛵', true, 'Boats carry people on the water.');
  S.t(2, 'A rock floats.', '🪨', false, 'Drop a rock in a pond. Splash!');
  S.t(3, 'Ice floats in water.', '🧊', true, 'Look at ice cubes in your drink.');

  // ---------------------------------------------------------------- Magnets
  S = mk('sc-magnets', 'mag');
  function mg(d, name, pic, yes, hint) {
    S.c(d, 'Will a magnet pick up ' + name + '?', pic, yes ? 'Yes' : 'No', [yes ? 'No' : 'Yes'], hint);
  }
  mg(1, 'a paper clip', '📎', true, 'Paper clips are made of metal.');
  mg(1, 'a teddy bear', '🧸', false, 'It is soft, not metal.');
  mg(1, 'an apple', '🍎', false, 'Magnets pull some metal things.');
  mg(1, 'a crayon', '🖍️', false, 'Crayons are made of wax.');
  mg(2, 'a safety pin', '🧷', true, 'It is made of metal.');
  mg(2, 'a metal bolt', '🔩', true, 'It is made of iron.');
  mg(2, 'wood', '🪵', false, 'Wood comes from trees.');
  mg(2, 'a sewing needle', '🪡', true, 'It is a thin piece of metal.');
  mg(2, 'paper', '📄', false, 'Paper is not metal.');
  S.c(1, 'What does a magnet pull?', '🧲', '📎 Paper clip', ['🧸 Teddy bear', '🍌 Banana'], 'Magnets pull some metal things.');
  S.c(2, 'Magnets pull things made of...', '🧲', '🔩 Iron', ['🪵 Wood', '📄 Paper'], 'Like nails and paper clips.');
  S.c(3, 'What are the ends of a magnet called?', '🧲', 'Poles', ['Tails', 'Wheels'], 'Like the North and South ones on Earth.');
  S.c(3, 'Put north to north. What happens?', '🧲', 'Push apart', ['Pull together', 'Melt'], 'Same ends do not like each other.');
  S.c(3, 'Put north to south. What happens?', '🧲', 'Stick together', ['Push apart', 'Change color'], 'Different ends like each other.');
  S.t(1, 'A magnet picks up a paper clip.', '📎', true, 'Paper clips are made of metal.');
  S.t(2, 'A magnet picks up wood.', '🪵', false, 'Wood is not metal.');
  S.t(3, 'A magnet can pull through paper.', '🧲', true, 'Fridge magnets hold paper up.');

  // ---------------------------------------------------------------- Hot and cold
  S = mk('sc-hotcold', 'hot');
  function hc(d, name, pic, hot, hint) {
    S.c(d, 'Is ' + name + ' hot or cold?', pic, hot ? 'Hot' : 'Cold', [hot ? 'Cold' : 'Hot'], hint);
  }
  hc(1, 'fire', '🔥', true, 'Stay away from it!');
  hc(1, 'snow', '❄️', false, 'You wear gloves to play in it.');
  hc(1, 'ice', '🧊', false, 'It comes from the freezer.');
  hc(2, 'the sun', '☀️', true, 'It warms the whole Earth.');
  hc(2, 'ice cream', '🍦', false, 'It melts on a sunny day.');
  hc(2, 'a volcano', '🌋', true, 'Melted rock comes out of it.');
  S.c(1, 'Which one is hot?', null, '🔥 Fire', ['🧊 Ice', '⛄ Snowman'], 'Stay away from it!');
  S.c(1, 'Which one is cold?', null, '🍦 Ice cream', ['☕ Hot tea', '🔥 Fire'], 'It comes from the freezer.');
  S.c(2, 'What happens to ice in the sun?', '🧊', '💧 It melts', ['🧱 It gets hard', '🌱 It grows'], 'The sun is warm.');
  S.c(2, 'What makes water freeze?', '💧', '❄️ Cold', ['🔥 Heat', '☀️ Sun'], 'Think of the freezer.');
  S.c(2, 'What measures hot and cold?', null, '🌡️ Thermometer', ['📏 Ruler', '⏰ Clock'], 'Its red line goes up when it is hot.');
  S.c(2, 'What keeps you warm?', '❄️', '🧥 Jacket', ['🍦 Ice cream', '🧊 Ice'], 'You wear it outside in winter.');
  S.c(3, 'What warms the Earth?', '🌍', '☀️ The sun', ['🌙 The moon', '☁️ Clouds'], 'It shines in the day.');
  S.c(3, 'Which melts fastest in the sun?', '☀️', '🍦 Ice cream', ['🪨 Rock', '🧱 Brick'], 'Eat it quick before it drips!');
  S.c(3, 'Rub your hands together. They get...', '🙌', 'Warm', ['Cold', 'Wet'], 'Try it now! Rub, rub, rub.');
  S.t(1, 'Fire is hot.', '🔥', true, 'Stay away from it!');
  S.t(1, 'Ice is hot.', '🧊', false, 'It comes from the freezer.');
  S.t(2, 'Butter melts when it gets warm.', '🧈', true, 'Leave it in the sun and see.');
  S.t(3, 'Hot soup cools down over time.', '🍲', true, 'Wait a while, then taste.');

  // ---------------------------------------------------------------- Light and shadow
  S = mk('sc-light', 'lgt');
  S.c(1, 'What gives us light in the day?', null, '☀️ Sun', ['🌙 Moon', '⭐ Stars'], 'It is big, bright, and hot.');
  S.c(1, 'Which one makes light?', null, '💡 Light bulb', ['🪨 Rock', '📕 Book'], 'Turn it on with a switch.');
  S.c(1, 'What can light a dark room?', null, '🔦 Flashlight', ['🧸 Teddy', '🥄 Spoon'], 'Click it on and point it.');
  S.c(2, 'When do you make a shadow?', null, '☀️ In the sun', ['🌑 In the dark'], 'You need light to make a shadow.');
  S.c(2, 'What color is your shadow?', null, 'Dark', ['Rainbow', 'Bright yellow'], 'It is where light cannot reach.');
  S.c(2, 'Which one lets light through?', null, '🪟 Window', ['🧱 Brick wall', '📚 Books'], 'You can see outside through it.');
  S.c(2, 'Which one makes light?', null, '🕯️ Candle', ['🪨 Rock', '🍎 Apple'], 'It has a little flame.');
  S.c(2, 'Which one blocks light?', null, '📕 Book', ['🪟 Window', '👓 Glasses'], 'You cannot see through it.');
  S.c(3, 'What bounces light back?', null, '🪞 Mirror', ['🧱 Brick', '🧸 Teddy'], 'You see your face in it.');
  S.c(3, 'Your shadow is longest when the sun is...', null, '🌅 Low', ['☀️ High'], 'Look in the early morning or evening.');
  S.t(1, 'The sun gives us light.', '☀️', true, 'It is bright in the day.');
  S.t(1, 'A rock gives off light.', '🪨', false, 'Can you read by a rock?');
  S.t(2, 'Shadows happen when light is blocked.', '🔦', true, 'Put your hand in front of a flashlight.');
  S.t(3, 'You can see in total darkness.', '🌑', false, 'Eyes need light to see.');
  S.m(2, 'Match the light maker.', [['☀️', 'sun'], ['🔦', 'flashlight'], ['🕯️', 'candle']], 'One is in the sky, one has a flame.');

  // ---------------------------------------------------------------- Solid, liquid, gas
  var SLG = ['Solid', 'Liquid', 'Gas'];
  S = mk('sc-matter', 'mat');
  function sl(d, name, pic, ans, hint) {
    S.c(d, 'Is ' + name + ' a solid, liquid, or gas?', pic, ans, SLG.filter(function (x) { return x !== ans; }), hint);
  }
  sl(1, 'a rock', '🪨', 'Solid', 'It is hard and keeps its shape.');
  sl(1, 'milk', '🥛', 'Liquid', 'You can pour it.');
  sl(1, 'water', '💧', 'Liquid', 'You can pour it.');
  sl(1, 'a teddy', '🧸', 'Solid', 'You can hold it and it keeps its shape.');
  sl(1, 'a book', '📚', 'Solid', 'It keeps its shape.');
  sl(2, 'ice', '🧊', 'Solid', 'It is hard until it melts.');
  sl(2, 'juice', '🧃', 'Liquid', 'You drink it through a straw.');
  sl(2, 'air', '💨', 'Gas', 'You cannot see it, but you can feel wind.');
  sl(2, 'a spoon', '🥄', 'Solid', 'It keeps its shape.');
  sl(2, 'balloon air', '🎈', 'Gas', 'You blow it in with your breath.');
  sl(3, 'steam', '♨️', 'Gas', 'It floats up from hot water.');
  sl(3, 'honey', '🍯', 'Liquid', 'It pours slowly.');
  S.c(2, 'What happens when ice melts?', '🧊', '💧 Water', ['🪨 Rock', '🧱 Brick'], 'Leave an ice cube out and see.');
  S.c(2, 'Water freezes into...', '💧', '🧊 Ice', ['🔥 Fire', '🌱 Grass'], 'Think of the freezer.');
  S.c(3, 'Very hot water turns into...', '💧', '♨️ Steam', ['🧊 Ice', '🧱 Brick'], 'Look above a hot pot.');
  S.c(3, 'Which one takes the shape of its cup?', null, '🥛 Milk', ['🪨 Rock', '🧱 Brick'], 'It can pour.');
  S.c(3, 'Which one keeps its own shape?', null, '🧱 Brick', ['💧 Water', '🥛 Milk'], 'It is hard.');
  S.t(1, 'Water is a liquid.', '💧', true, 'You can pour it.');
  S.t(2, 'A rock is a gas.', '🪨', false, 'Rocks are hard.');
  S.t(3, 'Air is a gas.', '💨', true, 'You cannot see it, but you can feel wind.');

  // ---------------------------------------------------------------- Day and night
  S = mk('sc-daynight', 'day');
  S.c(1, 'When is the sun out?', null, '☀️ Day', ['🌙 Night'], 'It is bright outside.');
  S.c(1, 'When do you see stars?', '⭐', '🌙 Night', ['☀️ Day'], 'Look up when it is dark.');
  S.c(1, 'When do you go to bed?', '🛏️', '🌙 Night', ['☀️ Day'], 'It is dark outside.');
  S.c(1, 'When do you eat breakfast?', '🥣', '🌅 Morning', ['🌙 Night', '🌆 Evening'], 'It is the first meal of the day.');
  S.c(1, 'When is it time for lunch?', '🥪', '☀️ Day', ['🌙 Night'], 'You eat it at school.');
  S.c(2, 'What do we see at night?', null, '🌙 Moon', ['🌈 Rainbow', '☀️ Sun'], 'It can look round or like a banana.');
  S.c(2, 'Owls are awake at...', '🦉', '🌙 Night', ['☀️ Noon'], 'Owls hoot in the dark.');
  S.c(3, 'Where does the sun come up?', '🌅', 'East', ['West', 'North'], 'The word starts with E, like early.');
  S.c(3, 'Why is it dark at night?', '🌍', '🌍 Earth turns', ['💡 Sun switches off', '☁️ Clouds cover'], 'Our planet spins like a top.');
  S.c(3, 'How long is one day and night?', null, '24 hours', ['1 hour', '100 hours'], 'Two times twelve.');
  S.c(3, 'The sun goes down. What is it called?', null, '🌇 Sunset', ['🌅 Sunrise', '🌈 Rainbow'], 'It happens in the evening.');
  S.t(1, 'We see the sun at night.', '🌙', false, 'Night is dark.');
  S.t(1, 'It is dark at night.', '🌙', true, 'You need a lamp to read.');
  S.t(2, 'Some animals sleep in the day.', '🦉', true, 'Think of owls and bats.');
  S.t(2, 'The sun goes away forever at night.', '☀️', false, 'What do you see every morning?');
  S.t(3, 'The Earth spins around.', '🌍', true, 'That is why we have day and night.');
  S.m(2, 'Match the time of day.', [['☀️', 'day'], ['🌙', 'night'], ['🌅', 'morning']], 'The sun comes up in the morning.');

  // ---------------------------------------------------------------- Earth and sky
  S = mk('sc-space', 'sky');
  S.c(1, 'What is the big, hot sky light?', null, '☀️ Sun', ['🌙 Moon', '🌍 Earth'], 'It warms us in the day.');
  S.c(1, 'Where do we live?', null, '🌍 Earth', ['🌙 Moon', '☀️ Sun'], 'Our home planet is blue and green.');
  S.c(1, 'What twinkles at night?', null, '⭐ Stars', ['🌈 Rainbow', '☀️ Sun'], 'There are so many to count.');
  S.c(1, 'What do we ride to space?', null, '🚀 Rocket', ['🚲 Bike', '⛵ Boat'], 'It blasts off: three, two, one!');
  S.c(2, 'What shines at night and changes shape?', null, '🌙 Moon', ['☀️ Sun', '☁️ Cloud'], 'It can look round or like a banana.');
  S.c(2, 'Who goes to space?', '🚀', '👩‍🚀 Astronaut', ['👩‍🍳 Chef', '👨‍🌾 Farmer'], 'They ride a rocket.');
  S.c(3, 'The sun is a...', '☀️', '⭐ Star', ['🌍 Planet', '🌙 Moon'], 'It is like the twinkly lights, just very close.');
  S.c(3, 'What goes around the Earth?', '🌍', '🌙 Moon', ['☀️ Sun', '⭐ Stars'], 'We see it at night.');
  S.c(3, 'The Earth goes around the...', '🌍', '☀️ Sun', ['🌙 Moon', '🪐 Saturn'], 'It takes one whole year.');
  S.c(3, 'What covers most of Earth?', '🌍', '🌊 Water', ['🏜️ Sand', '🧊 Ice'], 'Look at a globe: lots of blue.');
  S.c(3, 'Which planet has big rings?', null, '🪐 Saturn', ['🌍 Earth', '🔴 Mars'], 'Its rings are made of ice and rock.');
  S.t(1, 'We live on Earth.', '🌍', true, 'Our home planet is blue and green.');
  S.t(1, 'We can see stars at night.', '⭐', true, 'Look up when it is dark.');
  S.t(1, 'The sun is very hot.', '☀️', true, 'It warms the whole Earth.');
  S.t(2, 'The Earth is flat.', '🌍', false, 'Look at a globe.');
  S.t(3, 'The moon makes its own light.', '🌙', false, 'Think: what lights up the moon?');
  S.m(1, 'Match the sky things.', [['☀️', 'sun'], ['🌙', 'moon'], ['⭐', 'star']], 'Look at each picture.');

  return { subject: 'science', title: 'Discovery Lab', skills: skills, levels: levels, bank: bank };
});
