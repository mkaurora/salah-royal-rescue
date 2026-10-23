/* Collectibles: 72 things hidden around the islands (12 per island = 3 sets of 4), each with a fun fact.
 * `side` = which lobe it is hidden in (front: before the gate, back: behind it). Set rewards are fixed and shown in the book.
 * UMD: SI.collectibles. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.collectibles = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // island → [ [setName, [ [slug, name, icon, fact] x4 ] ] x3 ]
  var RAW = {
    1: [
      ['Shell Collection', [
        ['conch', 'Conch Shell', '🐚', 'Hold a conch to your ear and you hear a whoosh. That is just the sound of the room bouncing around inside the shell.'],
        ['scallop', 'Scallop Shell', '🐚', 'A scallop can clap its two shells together to swim away.'],
        ['spiral', 'Spiral Shell', '🐚', 'A sea snail makes its spiral shell bigger as it grows.'],
        ['sanddollar', 'Sand Dollar', '⚪', 'A sand dollar is really a flat sea urchin.']]],
      ['Beach Finds', [
        ['seaglass', 'Sea Glass', '🔷', 'Sea glass is old broken glass that waves and sand have smoothed for many years.'],
        ['starfish', 'Starfish', '⭐', 'A starfish has no brain. It walks on hundreds of tiny tube feet.'],
        ['driftwood', 'Driftwood', '🪵', 'Driftwood floated across the sea before it washed up on the shore.'],
        ['coconut', 'Coconut', '🥥', 'A coconut can float across the ocean and grow into a new palm tree far away.']]],
      ['Shore Feathers', [
        ['gull', 'Gull Feather', '🪶', 'Seagulls can drink both fresh water and salty sea water.'],
        ['tern', 'Tern Feather', '🪶', 'An Arctic tern flies from the top of the world to the bottom and back every year.'],
        ['heron', 'Heron Feather', '🪶', 'A heron stands very still on its long legs and waits for a fish.'],
        ['pelican', 'Pelican Feather', '🪶', 'A pelican\'s beak pouch can hold more than its stomach can.']]]
    ],
    2: [
      ['Jungle Flowers', [
        ['orchid', 'Orchid', '🌸', 'Some orchids grow high on tree branches and drink the rain from the air.'],
        ['hibiscus', 'Hibiscus', '🌺', 'A hibiscus flower often opens in the morning and closes at night.'],
        ['paradise', 'Bird-of-Paradise', '🌼', 'The bird-of-paradise flower looks like a colourful bird\'s head.'],
        ['frangipani', 'Frangipani', '🌼', 'Frangipani flowers smell sweeter in the evening.']]],
      ['Jungle Feathers', [
        ['toucan', 'Toucan Feather', '🪶', 'A toucan\'s big beak is light because it is full of tiny air pockets.'],
        ['macaw', 'Macaw Feather', '🪶', 'Macaws can live for fifty years or more.'],
        ['parrot', 'Parrot Feather', '🪶', 'Parrots can copy sounds they hear.'],
        ['kingfisher', 'Kingfisher Feather', '🪶', 'A kingfisher dives headfirst into the water to catch a fish.']]],
      ['Jungle Fruits', [
        ['mango', 'Mango', '🥭', 'Mango trees can grow taller than a house.'],
        ['papaya', 'Papaya', '🍈', 'A papaya has lots of small black seeds in the middle.'],
        ['banana', 'Banana', '🍌', 'Bananas grow in bunches, and each bunch is called a hand.'],
        ['pineapple', 'Pineapple', '🍍', 'A pineapple takes almost two years to grow.']]]
    ],
    3: [
      ['Bright Gems', [
        ['amethyst', 'Amethyst', '💎', 'Amethyst is a purple kind of quartz.'],
        ['quartz', 'Quartz', '💎', 'Quartz is one of the most common crystals on Earth.'],
        ['topaz', 'Topaz', '💎', 'Topaz can be yellow, blue or clear like water.'],
        ['emerald', 'Emerald', '💎', 'An emerald is a green gem that takes millions of years to form.']]],
      ['Cave Fossils', [
        ['ammonite', 'Ammonite', '🐚', 'Ammonites were sea animals with spiral shells that lived when the dinosaurs did.'],
        ['trilobite', 'Trilobite', '🪨', 'Trilobites were sea animals with many legs that lived over 250 million years ago.'],
        ['fernfossil', 'Fern Fossil', '🌿', 'A fern fossil is a leaf print left in stone millions of years ago.'],
        ['fishfossil', 'Fish Fossil', '🐟', 'Fossil fish show us what the oceans were like long ago.']]],
      ['Shiny Minerals', [
        ['salt', 'Salt Crystal', '🧂', 'Salt crystals are tiny cubes if you look very closely.'],
        ['copper', 'Copper', '🟠', 'Copper is a shiny orange metal that is used to make wires.'],
        ['mica', 'Mica', '✨', 'Mica splits into thin shiny sheets, like pages of a book.'],
        ['pyrite', 'Pyrite', '🟡', 'Pyrite is called fool\'s gold because it looks like gold but is not.']]]
    ],
    4: [
      ['Ice Wonders', [
        ['snowflake', 'Snowflake', '❄️', 'Every snowflake has six sides or six arms.'],
        ['icicle', 'Icicle', '🧊', 'An icicle grows longer as dripping water freezes bit by bit.'],
        ['icecrystal', 'Ice Crystal', '🧊', 'Ice crystals form when water vapour freezes in very cold air.'],
        ['frostfern', 'Frost Fern', '❄️', 'Frost can grow in fern-shaped patterns on a cold window.']]],
      ['Mountain Plants', [
        ['pinecone', 'Pine Cone', '🌲', 'A pine cone keeps its seeds safe and opens up when the air is dry.'],
        ['moss', 'Mountain Moss', '🌿', 'Moss has no roots. It soaks up water through its tiny leaves.'],
        ['lichen', 'Lichen', '🍃', 'Lichen is a team of a fungus and tiny algae living together.'],
        ['edelweiss', 'Edelweiss', '🌼', 'Edelweiss has fuzzy white petals that keep it warm on the mountain.']]],
      ['Cold Critters', [
        ['penguin', 'Penguin Feather', '🐧', 'Penguin feathers are packed tight to keep out the icy water.'],
        ['owl', 'Snowy Owl Feather', '🦉', 'A snowy owl\'s feathers are so soft that it flies almost silently.'],
        ['hare', 'Hare Fur', '🐇', 'An arctic hare grows white fur in winter so it can hide in the snow.'],
        ['muskox', 'Musk Ox Wool', '🧶', 'Musk ox wool is about eight times warmer than sheep wool.']]]
    ],
    5: [
      ['Garden Seeds', [
        ['sunflower', 'Sunflower Seed', '🌻', 'A sunflower head is made of hundreds of tiny flowers.'],
        ['dandelion', 'Dandelion Seed', '🌼', 'Dandelion seeds fly on the wind with tiny fluffy parachutes.'],
        ['maple', 'Maple Seed', '🍁', 'Maple seeds spin like little helicopters when they fall.'],
        ['pea', 'Garden Pea', '🟢', 'Peas grow in pods, and every pea is a seed.']]],
      ['Garden Helpers', [
        ['honeycomb', 'Honeycomb', '🍯', 'Bees build honeycomb cells in the shape of hexagons.'],
        ['pollen', 'Pollen Pot', '🐝', 'Bees carry pollen from flower to flower, which helps plants make seeds.'],
        ['silk', 'Silk Thread', '🧵', 'A silkworm spins one very long thread to make its cocoon.'],
        ['compost', 'Compost Leaf', '🍃', 'Worms and tiny creatures turn old leaves into food for new plants.']]],
      ['Sky Treasures', [
        ['raindrop', 'Raindrop Jar', '💧', 'Raindrops fall when the tiny drops in a cloud join up and get too heavy.'],
        ['windchime', 'Wind Chime', '🎐', 'A wind chime rings when moving air makes the pieces swing and touch.'],
        ['amber', 'Amber Sun Drop', '🟡', 'Amber is tree sap that turned into stone millions of years ago.'],
        ['cloudpuff', 'Cloud Puff', '☁️', 'A cloud is made of billions of tiny water drops floating in the sky.']]]
    ],
    6: [
      ['Volcano Rocks', [
        ['obsidian', 'Obsidian', '⚫', 'Obsidian is shiny natural glass that forms when lava cools very fast.'],
        ['pumice', 'Pumice', '🪨', 'Pumice is so full of bubbles that it can float on water.'],
        ['basalt', 'Basalt', '🪨', 'Basalt is a dark rock made from cooled lava. Much of the ocean floor is basalt.'],
        ['granite', 'Granite', '🪨', 'Granite has sparkly speckles of different minerals that you can see.']]],
      ['Lab Gear', [
        ['beaker', 'Beaker', '🧪', 'A beaker helps scientists measure and mix liquids.'],
        ['magnifier', 'Magnifier', '🔍', 'A magnifying glass bends light to make small things look bigger.'],
        ['thermometer', 'Thermometer', '🌡️', 'A thermometer tells us how hot or cold something is.'],
        ['slide', 'Microscope Slide', '🔬', 'A microscope shows tiny living things that our eyes cannot see.']]],
      ['Hot Spring Wonders', [
        ['sulfur', 'Sulfur Crystal', '🟨', 'Sulfur makes a bright yellow crust near hot springs.'],
        ['crust', 'Mineral Crust', '🟤', 'Hot spring water leaves colourful mineral crusts as it dries.'],
        ['geyser', 'Geyser Pebble', '⚪', 'A geyser shoots hot water high into the air when pressure builds up underground.'],
        ['warmmoss', 'Warm Moss', '🌿', 'Tiny plants can grow right beside warm water.']]]
    ]
  };

  var items = [], sets = [], byId = {}, setById = {};
  Object.keys(RAW).forEach(function (k) {
    var n = +k;
    RAW[k].forEach(function (set, si) {
      var setId = 's' + n + 'abc'.charAt(si);
      var ids = [];
      set[1].forEach(function (it, ii) {
        var idx = si * 4 + ii;
        var c = { id: 'c' + n + '-' + it[0], island: n, set: setId, name: it[1], icon: it[2], fact: it[3], side: idx < 6 ? 'front' : 'back' };
        items.push(c); byId[c.id] = c; ids.push(c.id);
      });
      var s = { id: setId, island: n, name: set[0], ids: ids, coins: 40 + 15 * n, gems: 1 };
      sets.push(s); setById[setId] = s;
    });
  });

  function ofIsland(n) { return items.filter(function (c) { return c.island === n; }); }
  /** { have, total, pct } for an owned map { id: true } */
  function completion(owned, island) {
    var list = island ? ofIsland(island) : items, have = 0;
    list.forEach(function (c) { if (owned && owned[c.id]) have++; });
    return { have: have, total: list.length, pct: Math.round(100 * have / list.length) };
  }
  /** Sets that are fully collected. */
  function completedSets(owned) {
    return sets.filter(function (s) { return s.ids.every(function (id) { return owned && owned[id]; }); });
  }

  return {
    items: items, sets: sets, byId: byId, setById: setById, ofIsland: ofIsland, completion: completion, completedSets: completedSets,
    ALL_REWARD: { item: 'k-golden', coins: 300, gems: 5 },
    PICKUP: function (island) { return { coins: 3 + island, xp: 8 + 2 * island }; }
  };
});
