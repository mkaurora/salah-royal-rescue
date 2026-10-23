/* Quest chains (one per island), repeatable helper tasks and NPC chatter. Data only — the state machine is js/logic/quests.js.
 * Step types: talk {npc} · collect {ids} · minigame {game, level, stars} · learn {npc, subject, need} · build {zone, count} · gate {gate}.
 * UMD: SI.questData. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.questData = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function stepReward(k) { return { coins: 20 + 10 * k, xp: 40 + 15 * k }; }
  function chainReward(k) { return { xp: 200 + 100 * k }; }

  function talk(k, i, npc, text, lines, extra) { return Object.assign({ id: 'q' + k + 's' + i, type: 'talk', npc: npc, text: text, lines: lines, reward: stepReward(k) }, extra || {}); }
  function collect(k, i, ids, text, hint) { return { id: 'q' + k + 's' + i, type: 'collect', ids: ids, text: text, hint: hint, reward: stepReward(k) }; }
  function mini(k, i, game, level, stars, text) { return { id: 'q' + k + 's' + i, type: 'minigame', game: game, level: level, stars: stars, text: text, reward: stepReward(k) }; }
  function learn(k, i, npc, subject, text, lines, win) { return { id: 'q' + k + 's' + i, type: 'learn', npc: npc, subject: subject, need: 5, text: text, lines: lines, win: win, reward: stepReward(k) }; }
  function build(k, i, zone, count, text) { return { id: 'q' + k + 's' + i, type: 'build', zone: zone, count: count, text: text, reward: stepReward(k) }; }
  function gate(k, i, gateId, text, lines) { return { id: 'q' + k + 's' + i, type: 'gate', gate: gateId, need: 3, text: text, lines: lines, reward: stepReward(k) }; }

  var chains = [
    {
      id: 'q1', n: 1, island: 1, title: 'Welcome to the Shore', giver: 'pip',
      steps: [
        talk(1, 1, 'pip', 'Say hello to Pip', [
          'Hi Salah! I\'m Pip. Welcome to Sunny Shore!',
          'This island is your new home. Together we will fix the bridge to the lighthouse.',
          'Here are a bench and a flower pot for your plot. You can place them soon!'
        ], { gift: [{ item: 'b-bench', n: 1 }, { item: 'b-flowerpot', n: 1 }] }),
        collect(1, 2, ['c1-conch', 'c1-starfish', 'c1-seaglass'], 'Find 3 beach treasures', 'Look on the sand for a conch, a starfish and some sea glass.'),
        mini(1, 3, 'shellSort', 1, 1, 'Win a star in Shell Sort (level 1)'),
        learn(1, 4, 'nori', 'math', 'Help Nori count: answer 5 questions', [
          'Click-clack! I lost count of my shells.', 'Can you help me with 5 little questions?'], 'Thank you! Now my shells are all counted.'),
        build(1, 5, 'home', 2, 'Place 2 things on your plot'),
        gate(1, 6, 'g1', 'Fix the Plank Bridge: answer 3 questions', [
          'The planks are loose! Answer 3 questions and they will click back into place.']),
        talk(1, 7, 'bumble', 'Meet Bumble at the lighthouse', [
          'Boing! I\'m Bumble, keeper of the lighthouse.',
          'You fixed the bridge, so I can switch on the big lamp again.',
          'A boat is waiting at the dock. Jungle Falls is next. Safe travels, Salah!'])
      ],
      reward: { coins: 150, gems: 2, wardrobe: ['k-shell', 'h-sailor'], build: ['b-sandcastle'] }
    },
    {
      id: 'q2', n: 2, island: 2, title: 'Wake the Waterfall', giver: 'tuki',
      steps: [
        talk(2, 1, 'tuki', 'Talk to Tuki', [
          'Squawk! Welcome to Jungle Falls, Salah!',
          'The big water wheel has stopped and the waterfall is asleep.',
          'Take a fern and a lantern post for the decorate zone. Then let\'s help the jungle!'
        ], { gift: [{ item: 'b-fern', n: 1 }, { item: 'b-lamppost', n: 1 }] }),
        collect(2, 2, ['c2-orchid', 'c2-hibiscus', 'c2-toucan'], 'Find an orchid, a hibiscus and a toucan feather', 'Flowers grow near the trees. Feathers drift down from the branches.'),
        mini(2, 3, 'coconutHop', 3, 2, 'Win 2 stars in Coconut Hop (level 3)'),
        learn(2, 4, 'ziggy', 'english', 'Help Ziggy with words: answer 5 questions', [
          'Ribbit! I am writing a sign for the waterfall.', 'Can you help me get the words right?'], 'Ribbit-tastic! The sign looks perfect.'),
        build(2, 5, 'i2', 2, 'Place 2 things in the decorate zone'),
        gate(2, 6, 'g2', 'Mend the Vine Bridge: answer 3 science questions', [
          'These vines hold the bridge together. Answer 3 science questions to tie them tight.']),
        talk(2, 7, 'fernie', 'Meet Fernie by the water wheel', [
          'Hello hello! I\'m Fernie. I look after the water wheel.',
          'Thanks to you, the wheel is turning and the waterfall is splashing again!',
          'Crystal Caves are glowing in the next island. Off you go!'])
      ],
      reward: { coins: 200, gems: 2, wardrobe: ['h-leaf', 't-poncho'], build: ['b-jungle-swing'] }
    },
    {
      id: 'q3', n: 3, island: 3, title: 'Light up the Caves', giver: 'digby',
      steps: [
        talk(3, 1, 'digby', 'Talk to Digby', [
          'Well dig me up! A visitor! I\'m Digby.',
          'The cave lamps went dark and I cannot see my gems.',
          'Take this crystal lamp and a stone path tile. Let\'s make it bright again!'
        ], { gift: [{ item: 'b-crystal-lamp', n: 1 }, { item: 'b-stone-path', n: 1 }] }),
        collect(3, 2, ['c3-amethyst', 'c3-quartz', 'c3-ammonite'], 'Find an amethyst, a quartz and an ammonite', 'Shiny things hide near the cave walls.'),
        mini(3, 3, 'bridgeBuilder', 5, 2, 'Win 2 stars in Bridge Builder (level 5)'),
        learn(3, 4, 'lumi', 'science', 'Help Lumi with science: answer 5 questions', [
          'Blink blink! I am a firefly and I like shiny facts.', 'Answer 5 science questions and I will glow brighter!'], 'Wonderful! Look how I glow!'),
        build(3, 5, 'i3', 2, 'Place 2 things in the decorate zone'),
        gate(3, 6, 'g3', 'Light the Crystal Bridge: answer 3 maths questions', [
          'The bridge crystals light up when the numbers are right. Answer 3 questions!']),
        talk(3, 7, 'quartz', 'Meet Quartz at the big crystal', [
          'Greetings, explorer! I am Quartz, the biggest crystal here.',
          'Every lamp is shining again. The whole cave sparkles!',
          'The Snowy Peaks need a helper next. Follow the dock path.'])
      ],
      reward: { coins: 250, gems: 3, wardrobe: ['h-miner', 'e-lens'], build: ['b-crystal-fountain'] }
    },
    {
      id: 'q4', n: 4, island: 4, title: 'Warm up Snowy Peaks', giver: 'waddle',
      steps: [
        talk(4, 1, 'waddle', 'Talk to Waddle', [
          'Waddle waddle! Welcome to Snowy Peaks!',
          'It is so cold that the snow lanterns went out. We need warm things.',
          'Take a snow lantern and two pine trees for the decorate zone.'
        ], { gift: [{ item: 'b-snow-lantern', n: 1 }, { item: 'b-pine', n: 2 }] }),
        collect(4, 2, ['c4-snowflake', 'c4-icicle', 'c4-pinecone'], 'Find a snowflake, an icicle and a pine cone', 'Look near the snowy trees and the icy rocks.'),
        mini(4, 3, 'kiteGlide', 7, 2, 'Win 2 stars in Kite Glide (level 7)'),
        learn(4, 4, 'snowy', 'math', 'Help Snowy with sums: answer 5 questions', [
          'Hee hee! I am building a snow tower, but I keep losing count.', 'Can you answer 5 maths questions for me?'], 'Super! My tower is the tallest ever.'),
        mini(4, 5, 'mathFishing', 7, 2, 'Win 2 stars in Math Fishing (level 7)'),
        build(4, 6, 'i4', 3, 'Place 3 things in the decorate zone'),
        gate(4, 7, 'g4', 'Thaw the Ice Bridge: answer 3 English questions', [
          'The ice bridge melts into words! Answer 3 questions to make it solid.']),
        talk(4, 8, 'mittens', 'Meet Mittens at the top', [
          'Brrr-illiant! I\'m Mittens, the fluffiest monster on the peaks.',
          'You made our home warm and bright. Thank you, Salah!',
          'The Sky Gardens are floating above the clouds. Ready for a flight?'])
      ],
      reward: { coins: 300, gems: 3, wardrobe: ['h-winter', 's-snow', 'g-snow'], build: ['b-ice-dome'] }
    },
    {
      id: 'q5', n: 5, island: 5, title: 'Grow the Sky Garden', giver: 'puff',
      steps: [
        talk(5, 1, 'puff', 'Talk to Puff', [
          'Pouf! I\'m Puff, welcome to the Sky Gardens!',
          'The garden beds are empty and the seeds are lost.',
          'Take two flower beds and a bird bath to start the garden.'
        ], { gift: [{ item: 'b-flowerbed', n: 2 }, { item: 'b-birdbath', n: 1 }] }),
        collect(5, 2, ['c5-sunflower', 'c5-honeycomb', 'c5-pollen'], 'Find a sunflower seed, honeycomb and a pollen pot', 'Seeds and bee things are near the flowers.'),
        mini(5, 3, 'patternGarden', 9, 2, 'Win 2 stars in Pattern Garden (level 9)'),
        learn(5, 4, 'zippy', 'english', 'Help Zippy read the seed packets: answer 5 questions', [
          'Zip zip! I read the seed packets but the words are tricky.', 'Please help me with 5 questions!'], 'Zoom! Now every seed is in the right bed.'),
        mini(5, 5, 'kiteGlide', 9, 2, 'Win 2 stars in Kite Glide (level 9)'),
        build(5, 6, 'i5', 3, 'Place 3 things in the decorate zone'),
        gate(5, 7, 'g5', 'Make the Cloud Bridge firm: answer 3 maths questions', [
          'The cloud bridge is fluffy. Solve 3 problems to make it strong.']),
        talk(5, 8, 'cumulus', 'Meet Cumulus the cloud gardener', [
          'Rumble-umble! I am Cumulus, gardener of the sky.',
          'The garden is blooming, thanks to you. The bees are buzzing too!',
          'Professor Bubbles is waiting in the Volcano Lab. Science time!'])
      ],
      reward: { coins: 350, gems: 4, wardrobe: ['h-cloud', 's-cloud'], build: ['b-windmill'] }
    },
    {
      id: 'q6', n: 6, island: 6, title: 'Bubbling Lab Day', giver: 'bubbles',
      steps: [
        talk(6, 1, 'bubbles', 'Talk to Professor Bubbles', [
          'Bubble bubble! I\'m Professor Bubbles. Welcome to the Volcano Lab!',
          'We are making a big science show, but the lab is a mess.',
          'Take a lab table and two benches for the decorate zone.'
        ], { gift: [{ item: 'b-lab-table', n: 1 }, { item: 'b-bench', n: 2 }] }),
        collect(6, 2, ['c6-obsidian', 'c6-pumice', 'c6-beaker'], 'Find obsidian, pumice and a beaker', 'Rocks lie near the volcano. The beaker is on a lab bench.'),
        mini(6, 3, 'bridgeBuilder', 11, 2, 'Win 2 stars in Bridge Builder (level 11)'),
        learn(6, 4, 'geo', 'science', 'Help Geo with experiments: answer 5 questions', [
          'Tick tick! I\'m Geo the gecko, the lab assistant.', 'Let\'s test what you know with 5 science questions!'], 'Excellent! That is real scientist thinking.'),
        mini(6, 5, 'mathFishing', 11, 2, 'Win 2 stars in Math Fishing (level 11)'),
        build(6, 6, 'i6', 3, 'Place 3 things in the decorate zone'),
        gate(6, 7, 'g6', 'Fix the Plank Bridge: answer 3 mixed questions', [
          'The last bridge! Answer 3 questions from any subject.']),
        talk(6, 8, 'fizz', 'Meet Fizz in the lab', [
          'Fizz-pop! I\'m Fizz, and the show is ready!',
          'You visited every island and solved every puzzle. You are a real Island Explorer!',
          'The islands are all yours now. Decorate, collect, and keep exploring!'])
      ],
      reward: { coins: 400, gems: 5, wardrobe: ['h-lab', 't-labcoat', 'g-lab'], build: ['b-telescope-tower'] }
    }
  ];
  chains.forEach(function (c) { c.reward.xp = chainReward(c.n).xp; });

  var helpers = chains.map(function (c) {
    var guide = { 1: 'Pip', 2: 'Tuki', 3: 'Digby', 4: 'Waddle', 5: 'Puff', 6: 'Prof. Bubbles' }[c.n];
    return { id: 'h' + c.n, island: c.n, npc: c.giver, title: 'Help ' + guide + ' again!', count: 5, coins: 20 + 5 * c.n, xp: 30 };
  });

  var chatter = {
    pip: ['The sea is calm today. Perfect for exploring!', 'Collect shells to fill your book.', 'You can decorate your plot any time.'],
    nori: ['Click-clack! Crabs walk sideways, did you know?', 'My shell collection is the best. Every shell is different.', 'Watch out for the waves.'],
    bumble: ['Boing! The lighthouse lamp helps boats find the shore.', 'The view from here is wonderful.', 'Keep exploring, Salah!'],
    tuki: ['Squawk! Toucans use their big beaks to reach fruit.', 'Listen to the waterfall splash.', 'Have you found all the jungle flowers?'],
    ziggy: ['Ribbit! Tree frogs can stick to leaves.', 'Rain makes me hop with joy.', 'Words are fun to play with.'],
    fernie: ['Ferns are some of the oldest plants on Earth.', 'The water wheel turns all day.', 'Take a deep breath of that fresh air.'],
    digby: ['Moles are great at digging tunnels.', 'Crystals grow very slowly, over many years.', 'Mind your step near the sparkly rocks.'],
    lumi: ['Blink blink! Fireflies make their own light.', 'Shiny things are everywhere in here.', 'Science is full of surprises.'],
    quartz: ['Crystals have flat sides that meet at sharp edges.', 'Light bounces around inside me.', 'Take your time to look closely.'],
    waddle: ['Penguins slide on their tummies. Whee!', 'Stay warm out there, Salah.', 'Snow is just frozen water.'],
    snowy: ['I like to build snow towers.', 'Polar bear cubs like to play.', 'Look at the tracks in the snow.'],
    mittens: ['Fluffy fur keeps me toasty.', 'The mountain air is crisp and fresh.', 'Tell me what you found today.'],
    puff: ['Clouds are made of tiny water drops.', 'The sky is my favourite place.', 'Smell the flowers!'],
    zippy: ['Hummingbirds flap their wings super fast.', 'Zip zip, nectar is my favourite.', 'Reading helps you find the best flowers.'],
    cumulus: ['Plants need sunshine, water and good soil.', 'Bees help the garden grow.', 'Garden work is calm and happy work.'],
    bubbles: ['Scientists ask lots of questions.', 'Always test your idea to see if it is true.', 'Bubble bubble, science is fun!'],
    geo: ['Geckos can climb walls. Tick tick!', 'Warm springs are heated from deep below.', 'Let\'s try an experiment.'],
    fizz: ['Fizz-pop! Mixing things can make bubbles.', 'Safety goggles on, always.', 'Every experiment teaches us something.']
  };

  var byId = {}, stepById = {};
  chains.forEach(function (c) { byId[c.id] = c; c.steps.forEach(function (s) { stepById[s.id] = s; s.chain = c.id; }); });

  return { chains: chains, byId: byId, stepById: stepById, helpers: helpers, chatter: chatter, stepReward: stepReward, chainReward: chainReward };
});
