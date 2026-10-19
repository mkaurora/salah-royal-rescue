/* English content: "Word Castle". Bank is built deterministically from word lists at load time. UMD. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.content = root.SQ.content || {}; root.SQ.content.english = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- deterministic helpers ---------- */
  function hash(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    var a = hash(seed);
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, seed) {
    var a = arr.slice(), r = rng(seed);
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /* shuffle; for order questions make sure the result differs from the original order */
  function mix(arr, seed) {
    var a = shuffle(arr, seed);
    if (arr.length > 1 && a.join('|') === arr.join('|')) a.push(a.shift());
    return a;
  }
  function pick(pool, n, seed, exclude) {
    var ex = exclude || [];
    return shuffle(pool.filter(function (x) { return ex.indexOf(x) < 0; }), seed).slice(0, n);
  }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function cap(w) { return w.charAt(0).toUpperCase() + w.slice(1); }

  var bank = [];
  function add(q) { bank.push(q); }

  var skills = {
    'en-letters': 'Big letters',
    'en-case': 'Big and small letters',
    'en-begin': 'Beginning sounds',
    'en-end': 'Ending sounds',
    'en-vowel': 'Short vowels',
    'en-cvc': 'Spell short words',
    'en-picword': 'Picture and word',
    'en-sight-pp': 'Sight words 1',
    'en-sight-pr': 'Sight words 2',
    'en-sight-g1': 'Sight words 3',
    'en-rhyme': 'Rhyming words',
    'en-digraph': 'sh, ch, th',
    'en-opposite': 'Opposites',
    'en-plural': 'More than one',
    'en-capital': 'Capital letters',
    'en-punct': 'End marks',
    'en-spell2': 'Tricky spelling',
    'en-order': 'Word order',
    'en-read': 'Read and answer',
    'en-story': 'Short stories'
  };

  /* ---------- uppercase letter recognition ---------- */
  var LETTERS = [
    // [letter, distractors, hint, d]
    ['A', ['S', 'O'], 'A looks like a tent.', 1],
    ['M', ['T', 'O'], 'M has two hills on top.', 1],
    ['S', ['A', 'K'], 'S is curvy like a snake.', 1],
    ['T', ['O', 'B'], 'T has a line on top, like a table.', 1],
    ['O', ['L', 'M'], 'O is a round circle.', 1],
    ['H', ['C', 'S'], 'H looks like a ladder.', 1],
    ['B', ['D', 'R'], 'B has two bumps.', 2],
    ['E', ['F', 'A'], 'E has three lines going across.', 2],
    ['N', ['M', 'S'], 'N has one slant line in the middle.', 2],
    ['G', ['C', 'T'], 'G looks like C with a little shelf.', 2],
    ['P', ['R', 'K'], 'P has one bump at the top.', 2],
    ['W', ['M', 'O'], 'W has two points at the bottom.', 2],
    ['D', ['B', 'P', 'O'], 'D has one big bump.', 3],
    ['V', ['U', 'Y', 'W'], 'V has one point at the bottom.', 3],
    ['Q', ['O', 'G', 'C'], 'Q is like O with a little tail.', 3],
    ['F', ['E', 'P', 'T'], 'F is like E with no bottom line.', 3],
    ['J', ['I', 'L', 'T'], 'J looks like a hook.', 3],
    ['Z', ['N', 'S', 'X'], 'Z zigs and zags.', 3]
  ];
  LETTERS.forEach(function (x, i) {
    var id = 'en-let-' + pad(i + 1);
    add({ id: id, skill: 'en-letters', d: x[3], type: 'choice',
      text: 'Find the letter you hear.', say: ['Find the letter ' + x[0] + '.'],
      options: shuffle([x[0]].concat(x[1]), id), answer: x[0], hint: x[2] });
  });

  /* ---------- upper / lower case ---------- */
  var CASE_CHOICE = [
    ['A', ['e', 'o'], 1], ['E', ['a', 'c'], 1], ['S', ['z', 'c'], 1],
    ['M', ['n', 'w'], 2], ['R', ['n', 'h'], 2], ['T', ['f', 'l'], 2], ['H', ['n', 'k'], 2],
    ['B', ['d', 'p'], 3], ['G', ['q', 'p'], 3], ['D', ['b', 'p', 'q'], 3]
  ];
  CASE_CHOICE.forEach(function (x, i) {
    var id = 'en-case-' + pad(i + 1), low = x[0].toLowerCase();
    add({ id: id, skill: 'en-case', d: x[2], type: 'choice',
      text: 'Find the small letter for ' + x[0] + '.', say: ['Find the small letter for big ' + x[0] + '.'],
      options: shuffle([low].concat(x[1]), id), answer: low,
      hint: 'Say the letter name. Find the small letter with the same name.' });
  });
  var CASE_MATCH = [
    ['SOC', 1], ['KPW', 1], ['XZV', 1],
    ['AEG', 2], ['RHN', 2], ['QBM', 2], ['FTY', 2],
    ['BDP', 3], ['QGP', 3], ['NUH', 3], ['ILJ', 3]
  ];
  CASE_MATCH.forEach(function (x, i) {
    var id = 'en-case-' + pad(i + 11);
    add({ id: id, skill: 'en-case', d: x[1], type: 'match',
      text: 'Match big and small letters.', say: ['Match each big letter to its small letter.'],
      pairs: x[0].split('').map(function (c) { return [c, c.toLowerCase()]; }),
      hint: 'Big and small letters have the same name.' });
  });

  /* ---------- beginning sounds ---------- */
  var CONS = ['b', 'd', 'f', 'g', 'h', 'j', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z'];
  var CONFUSE = { c: ['k', 's'], k: ['c'], s: ['c', 'z'], z: ['s'], j: ['g'], g: ['j'] };
  var BEGIN = [
    ['dog', '🐶', 1], ['sun', '☀️', 1], ['bus', '🚌', 1], ['moon', '🌙', 1], ['pig', '🐷', 1], ['fish', '🐟', 1],
    ['hat', '🎩', 2], ['lion', '🦁', 2], ['rabbit', '🐰', 2], ['tiger', '🐯', 2], ['nose', '👃', 2], ['goat', '🐐', 2],
    ['van', '🚐', 3], ['web', '🕸️', 3], ['zebra', '🦓', 3], ['kite', '🪁', 3], ['juice', '🧃', 3], ['cat', '🐱', 3]
  ];
  BEGIN.forEach(function (x, i) {
    var id = 'en-beg-' + pad(i + 1), w = x[0], L = w.charAt(0);
    var ex = [L].concat(CONFUSE[L] || []);
    var dis = pick(CONS.concat(['c', 'k']), x[2] === 3 ? 3 : 2, id, ex);
    add({ id: id, skill: 'en-begin', d: x[2], type: 'choice', text: cap(w) + ' starts with…', pic: x[1],
      say: ['What letter does ' + w + ' start with?'],
      options: shuffle([L].concat(dis), id + 'o'), answer: L,
      hint: 'Say ' + w + ' slowly. Listen to the first sound.' });
  });
  var BEGIN_PIC = [
    ['b', '🚌', ['☀️', '🐶']], ['m', '🌙', ['🐷', '🎩']], ['s', '☀️', ['🐟', '🐶']],
    ['f', '🐟', ['🦁', '🐷']], ['p', '🐷', ['🚌', '🐐']]
  ];
  BEGIN_PIC.forEach(function (x, i) {
    var id = 'en-beg-' + pad(i + 19);
    add({ id: id, skill: 'en-begin', d: 2, type: 'choice', text: 'Which starts with ' + x[0] + '?',
      say: ['Which picture starts with the letter ' + x[0].toUpperCase() + '?'],
      options: shuffle([x[1]].concat(x[2]), id), answer: x[1],
      hint: 'Say the name of each picture. Listen to the first sound.' });
  });

  /* ---------- CVC word list (shared) ---------- */
  var CVC = [
    ['cat', '🐱'], ['bat', '🦇'], ['rat', '🐀'], ['hat', '🎩'], ['map', '🗺️'], ['van', '🚐'], ['bag', '👜'],
    ['man', '👨'], ['cap', '🧢'], ['dog', '🐶'], ['fox', '🦊'], ['box', '📦'], ['pig', '🐷'], ['pin', '📌'],
    ['six', '6️⃣'], ['bed', '🛏️'], ['hen', '🐔'], ['pen', '🖊️'], ['web', '🕸️'], ['leg', '🦵'], ['net', '🥅'],
    ['ten', '🔟'], ['sun', '☀️'], ['bus', '🚌'], ['bug', '🐛'], ['cup', '🥤'], ['nut', '🥜'], ['tub', '🛁']
  ];

  /* ---------- ending sounds ---------- */
  var ENDS = ['b', 'd', 'g', 'm', 'n', 'p', 's', 't', 'x'];
  var END_LIST = ['cat', 'dog', 'sun', 'bus', 'bed', 'cup', 'web', 'fox', 'hen', 'pig', 'map', 'box',
    'van', 'leg', 'bug', 'tub', 'nut', 'man', 'rat', 'pen'];
  END_LIST.forEach(function (w, i) {
    var item = CVC.filter(function (c) { return c[0] === w; })[0];
    var id = 'en-end-' + pad(i + 1), L = w.charAt(w.length - 1), d = i < 7 ? 1 : i < 14 ? 2 : 3;
    var dis = pick(ENDS, d === 3 ? 3 : 2, id, [L, w.charAt(0)]);
    add({ id: id, skill: 'en-end', d: d, type: 'choice', text: cap(w) + ' ends with…', pic: item[1],
      say: ['What letter does ' + w + ' end with?'],
      options: shuffle([L].concat(dis), id + 'o'), answer: L,
      hint: 'Say ' + w + ' slowly. Listen to the last sound.' });
  });

  /* ---------- short vowels ---------- */
  var VOWELS = ['a', 'e', 'i', 'o', 'u'];
  CVC.forEach(function (x, i) {
    var w = x[0], v = w.charAt(1), id = 'en-vow-' + pad(i + 1), d = i % 3 === 0 ? 1 : i % 3 === 1 ? 2 : 3;
    var dis = pick(VOWELS, d === 1 ? 2 : 3, id, [v]);
    add({ id: id, skill: 'en-vowel', d: d, type: 'choice', text: w.charAt(0) + ' _ ' + w.charAt(2), pic: x[1],
      say: ['Which letter is missing in ' + w + '?'],
      options: shuffle([v].concat(dis), id + 'o'), answer: v,
      hint: 'Say ' + w + ' slowly. Listen to the middle sound.' });
  });

  /* ---------- CVC spelling (build) ---------- */
  var EXTRA = 'abdefghilmnoprstu'.split('');
  CVC.forEach(function (x, i) {
    var w = x[0], id = 'en-cvc-' + pad(i + 1), d = i % 2 === 0 ? 1 : 2;
    var extra = pick(EXTRA, d === 1 ? 1 : 2, id, w.split(''));
    add({ id: id, skill: 'en-cvc', d: d, type: 'build', text: 'Spell the word.', pic: x[1],
      say: ['Spell: ' + w + '.'], options: shuffle(w.split('').concat(extra), id + 'o'), answer: w,
      hint: 'Say ' + w + ' slowly. Tap one sound at a time.' });
  });

  /* ---------- harder spelling: blends and digraphs (build) ---------- */
  var SPELL2 = [
    ['fish', '🐟', 1], ['ship', '🚢', 1], ['frog', '🐸', 1], ['duck', '🦆', 1], ['drum', '🥁', 1], ['star', '⭐', 1],
    ['crab', '🦀', 2], ['flag', '🚩', 2], ['sled', '🛷', 2], ['tent', '⛺', 2], ['milk', '🥛', 2], ['hand', '✋', 2],
    ['swan', '🦢', 2], ['chick', '🐤', 3], ['clock', '🕰️', 3], ['shell', '🐚', 3], ['sheep', '🐑', 3], ['snake', '🐍', 3]
  ];
  SPELL2.forEach(function (x, i) {
    var w = x[0], id = 'en-sp2-' + pad(i + 1);
    var extra = pick(EXTRA, x[2] === 1 ? 1 : 2, id, w.split(''));
    var hint = 'Say ' + w + ' slowly. Listen for each sound.';
    if (/sh|ch|ck/.test(w)) hint = 'Say ' + w + ' slowly. Two letters can make one sound.';
    if (w === 'snake') hint = 'Say snake slowly. A quiet e comes at the end.';
    add({ id: id, skill: 'en-spell2', d: x[2], type: 'build', text: 'Spell the word.', pic: x[1],
      say: ['Spell: ' + w + '.'], options: shuffle(w.split('').concat(extra), id + 'o'), answer: w, hint: hint });
  });

  /* ---------- picture-word matching ---------- */
  var PICWORD_MATCH = [
    [['🐶', 'dog'], ['🐱', 'cat'], ['🐷', 'pig'], 1],
    [['☀️', 'sun'], ['🚌', 'bus'], ['🛏️', 'bed'], 1],
    [['🦊', 'fox'], ['🐛', 'bug'], ['🎩', 'hat'], 1],
    [['📦', 'box'], ['🐔', 'hen'], ['🗺️', 'map'], 1],
    [['🐟', 'fish'], ['🐸', 'frog'], ['🦆', 'duck'], 2],
    [['🌙', 'moon'], ['⭐', 'star'], ['🌳', 'tree'], 2],
    [['🍎', 'apple'], ['🍌', 'banana'], ['🧀', 'cheese'], 2],
    [['🚗', 'car'], ['🚢', 'ship'], ['✈️', 'plane'], 2],
    [['🐍', 'snake'], ['🐌', 'snail'], ['🦈', 'shark'], 3],
    [['🦁', 'lion'], ['🐯', 'tiger'], ['🦓', 'zebra'], 3],
    [['👟', 'shoe'], ['🧦', 'sock'], ['👕', 'shirt'], 3]
  ];
  PICWORD_MATCH.forEach(function (x, i) {
    var id = 'en-pw-' + pad(i + 1);
    add({ id: id, skill: 'en-picword', d: x[3], type: 'match', text: 'Match the pairs.',
      say: ['Match each picture to its word.'], pairs: [x[0], x[1], x[2]],
      hint: 'Say the picture name. Look at the first letter of each word.' });
  });
  var PICWORD_CHOICE = [
    ['🐱', 'cat', ['cot', 'cap']], ['🐶', 'dog', ['dot', 'log']], ['🐷', 'pig', ['big', 'pin']],
    ['☀️', 'sun', ['run', 'sit']], ['🛏️', 'bed', ['bad', 'red']], ['🎩', 'hat', ['hot', 'ham']],
    ['🐟', 'fish', ['dish', 'fist']], ['🚌', 'bus', ['bug', 'but']]
  ];
  PICWORD_CHOICE.forEach(function (x, i) {
    var id = 'en-pw-' + pad(i + 12);
    add({ id: id, skill: 'en-picword', d: i < 3 ? 2 : 3, type: 'choice', text: 'Which word is this?', pic: x[0],
      say: ['Which word matches the picture?'], options: shuffle([x[1]].concat(x[2]), id), answer: x[1],
      hint: 'Say the picture name slowly. Check every letter.' });
  });

  /* ---------- sight words ---------- */
  var PP = ['the', 'and', 'see', 'go', 'look', 'can', 'big', 'red', 'up', 'down', 'my', 'we', 'you', 'is',
    'in', 'it', 'play', 'run', 'jump', 'help', 'here', 'little', 'come', 'said'];
  var PR = ['all', 'are', 'came', 'did', 'eat', 'good', 'have', 'like', 'new', 'now', 'out', 'please',
    'ran', 'saw', 'she', 'that', 'they', 'this', 'under', 'want', 'was', 'went', 'what', 'with'];
  var G1 = ['after', 'again', 'any', 'ask', 'could', 'every', 'fly', 'from', 'give', 'going', 'had', 'her',
    'how', 'just', 'know', 'once', 'open', 'over', 'some', 'stop', 'thank', 'them', 'then', 'when'];
  var EXTRA_SIGHT = ['away', 'blue', 'find', 'funny', 'make', 'not', 'one', 'three', 'where', 'yellow',
    'black', 'brown', 'but', 'get', 'into', 'must', 'our', 'pretty', 'ride', 'soon', 'there', 'well',
    'white', 'will', 'yes', 'has', 'his', 'him', 'were', 'walk', 'take', 'think', 'put', 'old', 'let', 'may'];
  var ALL_SIGHT = PP.concat(PR, G1, EXTRA_SIGHT);
  var HOMO = [['know', 'no', 'now'], ['one', 'won'], ['there', 'their'], ['then', 'than']];
  function soundsAlike(a, b) {
    return HOMO.some(function (g) { return g.indexOf(a) >= 0 && g.indexOf(b) >= 0; });
  }
  function sightSet(list, skill, prefix) {
    list.forEach(function (w, i) {
      var id = prefix + pad(i + 1), d = (i % 3) + 1, n = d === 3 ? 3 : 2;
      var cands = ALL_SIGHT.filter(function (x) { return x !== w && !soundsAlike(x, w); });
      var dis;
      if (d === 1) {
        dis = pick(cands.filter(function (x) { return x.charAt(0) !== w.charAt(0); }), n, id);
      } else {
        var scored = shuffle(cands, id).map(function (x) {
          var s = 0;
          if (x.charAt(0) === w.charAt(0)) s += 2;
          if (Math.abs(x.length - w.length) <= 1) s += 1;
          if (x.charAt(x.length - 1) === w.charAt(w.length - 1)) s += 1;
          return [x, s];
        });
        scored.sort(function (a, b) { return b[1] - a[1]; });
        dis = scored.slice(0, n).map(function (s) { return s[0]; });
      }
      add({ id: id, skill: skill, d: d, type: 'choice', text: 'Find the word you hear.',
        say: ['Find the word: ' + w + '.'], options: shuffle([w].concat(dis), id + 'o'), answer: w,
        hint: 'Listen to the first sound. Then look at each word.' });
    });
  }
  sightSet(PP, 'en-sight-pp', 'en-spp-');
  sightSet(PR, 'en-sight-pr', 'en-spr-');
  sightSet(G1, 'en-sight-g1', 'en-sg1-');

  /* ---------- rhyming ---------- */
  var RHYME = [
    // [pic, word, answer option, distractor options, d]
    ['🐱', 'cat', '🎩 hat', ['🐶 dog', '☀️ sun'], 1],
    ['🐸', 'frog', '🐶 dog', ['🐱 cat', '🐟 fish'], 1],
    ['🐭', 'mouse', '🏠 house', ['🌙 moon', '🐷 pig'], 1],
    ['🐐', 'goat', '⛵ boat', ['🚗 car', '🐝 bee'], 1],
    ['🌙', 'moon', '🥄 spoon', ['🍴 fork', '⭐ star'], 1],
    ['⭐', 'star', '🚗 car', ['🌙 moon', '🐟 fish'], 1],
    ['🐝', 'bee', '🌳 tree', ['🐜 ant', '🌸 flower'], 2],
    ['🐻', 'bear', '🍐 pear', ['🍎 apple', '🐶 dog'], 2],
    ['🦊', 'fox', '📦 box', ['🐶 dog', '🎩 hat'], 2],
    ['🐔', 'hen', '🖊️ pen', ['🥚 egg', '🐷 pig'], 2],
    ['🔔', 'bell', '🐚 shell', ['🥁 drum', '⚽ ball'], 2],
    ['🧦', 'sock', '🪨 rock', ['👟 shoe', '🦵 leg'], 2],
    ['🐍', 'snake', '🎂 cake', ['🐸 frog', '🐟 fish'], 2],
    ['🛏️', 'bed', '🛷 sled', ['🛁 tub', '🪑 chair'], 3],
    ['🐌', 'snail', '🐋 whale', ['🐟 fish', '🐛 bug'], 3],
    ['🪁', 'kite', '💡 light', ['🎈 balloon', '🚗 car'], 3],
    ['🐻', 'bear', '🪑 chair', ['🛏️ bed', '🚪 door'], 3],
    ['🧥', 'coat', '🐐 goat', ['🐄 cow', '🎩 hat'], 3]
  ];
  RHYME.forEach(function (x, i) {
    var id = 'en-rhy-' + pad(i + 1);
    var opts = shuffle([x[2]].concat(x[3]), id);
    if (x[4] === 3) {
      // harder: 4 options
      var more = ['☀️ sun', '🐷 pig', '🚌 bus', '🌳 tree'].filter(function (o) {
        return opts.indexOf(o) < 0 && o !== x[0] + ' ' + x[1];
      });
      opts = shuffle(opts.concat(more.slice(0, 1)), id + 'm');
    }
    add({ id: id, skill: 'en-rhyme', d: x[4], type: 'choice', text: 'What rhymes with ' + x[1] + '?', pic: x[0],
      say: ['Which word rhymes with ' + x[1] + '?'], options: opts, answer: x[2],
      hint: 'Rhyming words sound the same at the end.' });
  });
  var RHYME_TF = [
    ['cat', 'hat', true, 1], ['dog', 'sun', false, 1], ['moon', 'spoon', true, 2],
    ['fish', 'frog', false, 2], ['cake', 'lake', true, 3], ['king', 'kite', false, 3]
  ];
  RHYME_TF.forEach(function (x, i) {
    var id = 'en-rhy-' + pad(i + 19);
    var t = cap(x[0]) + ' and ' + x[1] + ' rhyme.';
    add({ id: id, skill: 'en-rhyme', d: x[3], type: 'tf', text: t, say: [t + ' True or false?'],
      options: ['True', 'False'], answer: x[2] ? 'True' : 'False',
      hint: 'Say both words. Do the ends sound the same?' });
  });

  /* ---------- digraphs sh ch th ---------- */
  var DIG = [
    // [word, pic, digraph, 'start'|'end', d]
    ['ship', '🚢', 'sh', 'start', 1], ['shoe', '👟', 'sh', 'start', 1], ['chair', '🪑', 'ch', 'start', 1],
    ['cheese', '🧀', 'ch', 'start', 1], ['sheep', '🐑', 'sh', 'start', 1], ['chick', '🐤', 'ch', 'start', 1],
    ['shell', '🐚', 'sh', 'start', 2], ['cherry', '🍒', 'ch', 'start', 2], ['thumb', '👍', 'th', 'start', 2],
    ['three', '3️⃣', 'th', 'start', 2], ['shark', '🦈', 'sh', 'start', 2], ['thread', '🧵', 'th', 'start', 2],
    ['shirt', '👕', 'sh', 'start', 2],
    ['fish', '🐟', 'sh', 'end', 3], ['bath', '🛁', 'th', 'end', 3], ['teeth', '🦷', 'th', 'end', 3],
    ['sandwich', '🥪', 'ch', 'end', 3], ['watch', '⌚', 'ch', 'end', 3], ['toothbrush', '🪥', 'sh', 'end', 3],
    ['mouth', '👄', 'th', 'end', 3]
  ];
  DIG.forEach(function (x, i) {
    var id = 'en-dig-' + pad(i + 1), w = x[0], start = x[3] === 'start';
    var opts = shuffle(['sh', 'ch', 'th'], id);
    add({ id: id, skill: 'en-digraph', d: x[4], type: 'choice', pic: x[1],
      text: cap(w) + (start ? ' starts with…' : ' ends with…'),
      say: ['Does ' + w + (start ? ' start' : ' end') + ' with s h, c h, or t h?'],
      options: opts, answer: x[2],
      hint: 'Say ' + w + ' slowly. Listen to the ' + (start ? 'first' : 'last') + ' sound.' });
  });

  /* ---------- opposites ---------- */
  var OPP = [
    // [word, answer, distractors, d, pic]
    ['big', 'small', ['tall', 'red'], 1, ''], ['hot', 'cold', ['wet', 'big'], 1, '🔥'],
    ['up', 'down', ['on', 'in'], 1, '⬆️'], ['happy', 'sad', ['funny', 'big'], 1, '😀'],
    ['day', 'night', ['sun', 'hot'], 1, '☀️'], ['yes', 'no', ['go', 'up'], 1, ''],
    ['stop', 'go', ['wait', 'red'], 1, '🛑'],
    ['fast', 'slow', ['quick', 'tall'], 2, ''], ['wet', 'dry', ['cold', 'wash'], 2, ''],
    ['open', 'closed', ['big', 'door'], 2, ''], ['full', 'empty', ['big', 'heavy'], 2, ''],
    ['in', 'out', ['on', 'at'], 2, ''], ['on', 'off', ['in', 'up'], 2, ''],
    ['tall', 'short', ['big', 'long'], 2, ''], ['boy', 'girl', ['man', 'kid'], 2, ''],
    ['loud', 'quiet', ['noisy', 'big', 'happy'], 3, ''], ['hard', 'soft', ['rock', 'strong', 'hot'], 3, ''],
    ['push', 'pull', ['press', 'run', 'open'], 3, ''], ['clean', 'dirty', ['wash', 'new', 'wet'], 3, ''],
    ['first', 'last', ['one', 'best', 'fast'], 3, ''], ['left', 'right', ['up', 'go', 'out'], 3, ''],
    ['awake', 'asleep', ['happy', 'up', 'tired'], 3, '']
  ];
  OPP.forEach(function (x, i) {
    var id = 'en-opp-' + pad(i + 1);
    var q = { id: id, skill: 'en-opposite', d: x[3], type: 'choice', text: 'Opposite of ' + x[0] + '?',
      say: ['What is the opposite of ' + x[0] + '?'], options: shuffle([x[1]].concat(x[2]), id), answer: x[1],
      hint: 'Opposites are as different as can be, like up and down.' };
    if (x[0] === 'up') q.hint = 'Opposites are as different as can be, like hot and cold.';
    if (x[4]) q.pic = x[4];
    add(q);
  });
  var OPP_TF = [['Hot and cold are opposites.', true, 1], ['Big and tall are opposites.', false, 2],
    ['Fast and slow are opposites.', true, 2], ['Happy and glad are opposites.', false, 3]];
  OPP_TF.forEach(function (x, i) {
    var id = 'en-opp-' + pad(i + 23);
    add({ id: id, skill: 'en-opposite', d: x[2], type: 'tf', text: x[0], say: [x[0] + ' True or false?'],
      options: ['True', 'False'], answer: x[1] ? 'True' : 'False',
      hint: 'Opposites mean very different things.' });
  });

  /* ---------- plurals ---------- */
  var PLUR = [
    // [one, many, pic, wrongs, d]
    ['cat', 'cats', '🐱', ['cat'], 1], ['dog', 'dogs', '🐶', ['dog'], 1], ['pig', 'pigs', '🐷', ['pig'], 1],
    ['hat', 'hats', '🎩', ['hat', 'hates'], 1], ['bug', 'bugs', '🐛', ['bug'], 1], ['car', 'cars', '🚗', ['car', 'cares'], 1],
    ['box', 'boxes', '📦', ['boxs', 'box'], 2], ['fox', 'foxes', '🦊', ['foxs', 'fox'], 2],
    ['bus', 'buses', '🚌', ['buss', 'bus'], 2], ['watch', 'watches', '⌚', ['watchs', 'watch'], 2],
    ['dress', 'dresses', '👗', ['dresss', 'dress'], 2],
    ['mouse', 'mice', '🐭', ['mouses', 'mouse'], 3], ['foot', 'feet', '🦶', ['foots', 'feets'], 3],
    ['tooth', 'teeth', '🦷', ['tooths', 'teeths'], 3], ['man', 'men', '👨', ['mans', 'mens'], 3],
    ['child', 'children', '🧒', ['childs', 'childrens'], 3], ['woman', 'women', '👩', ['womans', 'womens'], 3]
  ];
  PLUR.forEach(function (x, i) {
    var id = 'en-plu-' + pad(i + 1);
    var hint = 'More than one often ends in s.';
    if (x[4] === 2) hint = 'Words that end in x, s, or ch add e s.';
    if (x[4] === 3) hint = 'Some words change inside when there is more than one.';
    add({ id: id, skill: 'en-plural', d: x[4], type: 'choice', text: 'One ' + x[0] + ', two…', pic: x[2] + x[2],
      say: ['One ' + x[0] + ', two what? Pick the right word.'],
      options: shuffle([x[1]].concat(x[3]), id), answer: x[1], hint: hint });
  });
  var PLUR_TF = [['Dogs means more than one dog.', true, 1], ['Cat means more than one cat.', false, 1],
    ['Mice means more than one mouse.', true, 3]];
  PLUR_TF.forEach(function (x, i) {
    var id = 'en-plu-' + pad(i + 18);
    add({ id: id, skill: 'en-plural', d: x[2], type: 'tf', text: x[0], say: [x[0] + ' True or false?'],
      options: ['True', 'False'], answer: x[1] ? 'True' : 'False',
      hint: 'Is it one thing, or more than one?' });
  });

  /* ---------- capital letters ---------- */
  var CAPS = [
    // [right, wrongs, d, hint]
    ['The cat is big.', ['the cat is big.'], 1, 0], ['We can run.', ['we can run.'], 1, 0],
    ['My hat is red.', ['my hat is red.'], 1, 0], ['It is hot.', ['it is hot.'], 1, 0],
    ['She can jump.', ['she can jump.'], 1, 0],
    ['I like cake.', ['i like cake.', 'I like Cake.'], 2, 1], ['Mom and I play.', ['Mom and i play.', 'mom and I play.'], 2, 1],
    ['Can I go out?', ['can I go out?', 'Can i go out?'], 2, 1], ['Dad and I sing.', ['Dad and i sing.', 'dad and I sing.'], 2, 1],
    ['Salah lives in Kuwait.', ['salah lives in Kuwait.', 'Salah lives in kuwait.'], 3, 2],
    ['I play with Sam.', ['I play with sam.', 'i play with Sam.'], 3, 2],
    ['My cat is named Tom.', ['My cat is named tom.', 'my cat is named Tom.'], 3, 2],
    ['We swim on Friday.', ['We swim on friday.', 'we swim on Friday.'], 3, 2],
    ['Sara and Ali are here.', ['Sara and ali are here.', 'sara and Ali are here.'], 3, 2]
  ];
  var CAP_HINTS = ['A sentence starts with a big letter.', 'The word I is always a big letter.',
    'Names of people, places, and days start with a big letter.'];
  CAPS.forEach(function (x, i) {
    var id = 'en-cap-' + pad(i + 1);
    add({ id: id, skill: 'en-capital', d: x[2], type: 'choice', text: 'Which is written right?',
      say: ['Which sentence is written the right way?'], options: shuffle([x[0]].concat(x[1]), id), answer: x[0],
      hint: CAP_HINTS[x[3]] });
  });

  /* ---------- punctuation ---------- */
  var MARKS = ['.', '?', '!'];
  var PUNCT_RULE = [
    ['Which mark ends a question?', '?'], ['Which mark ends a telling sentence?', '.'],
    ['Which mark shows a big feeling?', '!']
  ];
  PUNCT_RULE.forEach(function (x, i) {
    var id = 'en-pun-' + pad(i + 1);
    add({ id: id, skill: 'en-punct', d: 1, type: 'choice', text: x[0], options: shuffle(MARKS, id), answer: x[1],
      hint: 'Asking, telling, or a big feeling? Each one has its own mark.' });
  });
  var PUNCT = [
    ['I have a dog', '.', 1], ['Do you like cake', '?', 1], ['Where is Mom', '?', 2], ['The sky is blue', '.', 2],
    ['Wow, look at that', '!', 2], ['What is your name', '?', 2], ['I am seven', '.', 2],
    ['Ouch, that hurts', '!', 3], ['Can we go to the park', '?', 3], ['Yay, we won', '!', 3],
    ['My bag is green', '.', 3], ['Is it hot today', '?', 3]
  ];
  PUNCT.forEach(function (x, i) {
    var id = 'en-pun-' + pad(i + 4);
    add({ id: id, skill: 'en-punct', d: x[2], type: 'choice', text: x[0] + ' ___',
      say: [x[0], 'Which mark goes at the end?'], options: shuffle(MARKS, id), answer: x[1],
      hint: 'Is it asking, telling, or a big feeling?' });
  });

  /* ---------- word order ---------- */
  var ORDER = [
    ['I can run.', 1], ['I see you.', 1], ['We like cats.', 1], ['Look at me.', 1], ['I am big.', 1],
    ['The cat is big.', 2], ['I like my dog.', 2], ['We can play ball.', 2], ['The sun is hot.', 2],
    ['She has a hat.', 2], ['Can you jump?', 2],
    ['The dog can run fast.', 3], ['I see a red bus.', 3], ['My mom has a cup.', 3],
    ['We go to school today.', 3], ['Can you see the moon?', 3]
  ];
  ORDER.forEach(function (x, i) {
    var id = 'en-ord-' + pad(i + 1), words = x[0].split(' ');
    add({ id: id, skill: 'en-order', d: x[1], type: 'order', text: 'Tap the words in order.',
      say: ['Make the sentence: ' + x[0]], options: mix(words, id), answer: words,
      hint: 'Find the word with the big letter. It goes first.' });
  });

  /* ---------- reading short sentences ---------- */
  var READ = [
    // [passage, question, answer, distractors, d]   (answer 'True'/'False' => tf)
    ['Sam has a red hat.', 'What color is the hat?', 'red', ['blue', 'green'], 1],
    ['The dog is big.', 'What is big?', '🐶 the dog', ['🐱 the cat', '🐷 the pig'], 1],
    ['I see a cat. The cat can run.', 'What can the cat do?', 'run', ['swim', 'fly'], 1],
    ['Ali has two pens.', 'How many pens?', 'two', ['one', 'three'], 1],
    ['The sun is up. It is day.', 'Is it day or night?', 'day', ['night'], 1],
    ['The hen sat on an egg.', 'The hen sat on a box.', 'False', null, 1],
    ['Nora has a big red ball.', 'The ball is red.', 'True', null, 1],
    ['Mom has a cup. The cup is hot.', 'What is hot?', 'the cup', ['the hat', 'the bed'], 1],
    ['Ben has a fish. It is in a tub.', 'Where is the fish?', 'in a tub', ['in a box', 'in a bed'], 2],
    ['The bug is on the rug.', 'Where is the bug?', 'on the rug', ['in the cup', 'on the bed'], 2],
    ['Dad can see a bird. The bird is blue.', 'What color is the bird?', 'blue', ['red', 'yellow'], 2],
    ['The pig is in the mud. It is happy.', 'How does the pig feel?', 'happy', ['sad', 'mad'], 2],
    ['Kim can jump. Kim can not swim.', 'What can Kim not do?', 'swim', ['jump', 'run'], 2],
    ['It is cold. Tom puts on a coat.', 'What does Tom put on?', 'a coat', ['a hat', 'a shoe'], 2],
    ['The fox ran to the den. The fox is fast.', 'Where did the fox run?', 'to the den', ['to the bus', 'to the shop'], 2],
    ['Lina likes to read. She has six books.', 'How many books?', 'six', ['two', 'ten'], 3]
  ];
  var STORY = [
    ['Max lost his ball. He looked under the bed. The ball was there!', 'Where was the ball?', 'under the bed', ['in the tree', 'on the bus'], 1],
    ['The cat saw a bird. The cat ran fast. The bird flew away.', 'What did the bird do?', 'flew away', ['ate', 'slept'], 1],
    ['Lily was sad. Her friend gave her a hug. Now Lily is happy.', 'How does Lily feel at the end?', 'happy', ['sad', 'sleepy'], 1],
    ['The duck went to the pond. It saw a frog. They played all day.', 'Who did the duck see?', 'a frog', ['a fish', 'a dog'], 2],
    ['It was hot. Sara and Mom went to the beach. They swam in the sea.', 'Where did they go?', 'the beach', ['the park', 'school'], 2],
    ['The bus was late. Sam waited and waited. At last, the bus came.', 'What was late?', 'the bus', ['Sam', 'the car'], 2],
    ['Two birds made a nest. Soon there were three eggs. Then baby birds came out!', 'How many eggs were there?', 'three', ['two', 'four'], 2],
    ['Nadia went to the park. She played on the swing. Then she went home.', 'Nadia played on the swing.', 'True', null, 2],
    ['Omar had a seed. He gave it water every day. Soon it was a big plant.', 'What did the seed become?', 'a plant', ['a cat', 'a rock'], 3],
    ['Ben wanted milk. The cup was empty. Dad filled it up.', 'Who filled the cup?', 'Dad', ['Ben', 'Mom'], 3],
    ['It started to rain. Zaid took his umbrella. He stayed dry.', 'What kept Zaid dry?', 'his umbrella', ['his hat', 'his shoes'], 3],
    ['Fatima baked a cake. She put on ten candles. It was for her mom.', 'Who was the cake for?', 'her mom', ['her dad', 'her cat'], 3],
    ['The moon came up. The sky got dark. It was time for bed.', 'What time was it?', 'time for bed', ['time to eat', 'time for school'], 3],
    ['The dog was dirty. Dad gave him a bath. Now the dog is clean.', 'The dog is dirty at the end.', 'False', null, 3]
  ];
  function readSet(list, skill, prefix, hint) {
    list.forEach(function (x, i) {
      var id = prefix + pad(i + 1), tf = x[3] === null;
      add({ id: id, skill: skill, d: x[4], type: tf ? 'tf' : 'choice', passage: x[0],
        text: tf ? x[1] + ' True or false?' : x[1], say: [x[0], tf ? x[1] + ' True or false?' : x[1]],
        options: tf ? ['True', 'False'] : shuffle([x[2]].concat(x[3]), id), answer: x[2], hint: hint });
    });
  }
  readSet(READ, 'en-read', 'en-read-', 'Read the sentence again. The answer is in it.');
  readSet(STORY, 'en-story', 'en-sto-', 'Read the story again, one sentence at a time.');

  /* ---------- levels ---------- */
  var levels = [
    { title: 'Big Letters', icon: '🔤', skills: ['en-letters'], diff: 1 },
    { title: 'Big and Small', icon: '🔡', skills: ['en-case'], diff: 1 },
    { title: 'First Sounds', icon: '👂', skills: ['en-begin'], diff: 1 },
    { title: 'Picture Words', icon: '🖼️', skills: ['en-picword'], diff: 1 },
    { title: 'Sight Words', icon: '👀', skills: ['en-sight-pp'], diff: 1 },
    { title: 'Last Sounds', icon: '🎵', skills: ['en-end'], diff: 1 },
    { title: 'Middle Vowels', icon: '🅰️', skills: ['en-vowel'], diff: 1 },
    { title: 'Spell It', icon: '✏️', skills: ['en-cvc'], diff: 1 },
    { title: 'Rhyme Time', icon: '🎶', skills: ['en-rhyme'], diff: 1 },
    { title: 'Letter Review', icon: '🏰', skills: ['en-letters', 'en-case'], diff: 2 },
    { title: 'Sound Mix', icon: '🎧', skills: ['en-begin', 'en-end'], diff: 2 },
    { title: 'More Sight Words', icon: '📖', skills: ['en-sight-pr'], diff: 1 },
    { title: 'Word Order', icon: '🧩', skills: ['en-order'], diff: 1 },
    { title: 'Read and Answer', icon: '📚', skills: ['en-read'], diff: 1 },
    { title: 'Opposites', icon: '↔️', skills: ['en-opposite'], diff: 1 },
    { title: 'Capital Letters', icon: '👑', skills: ['en-capital'], diff: 1 },
    { title: 'Sh, Ch, Th', icon: '🚢', skills: ['en-digraph'], diff: 2 },
    { title: 'More Than One', icon: '🐾', skills: ['en-plural'], diff: 2 },
    { title: 'End Marks', icon: '❓', skills: ['en-punct'], diff: 2 },
    { title: 'Vowel Spelling', icon: '🔠', skills: ['en-vowel', 'en-cvc'], diff: 2 },
    { title: 'Star Words', icon: '⭐', skills: ['en-sight-g1'], diff: 2 },
    { title: 'Tricky Spelling', icon: '🐸', skills: ['en-spell2'], diff: 2 },
    { title: 'Story Time', icon: '📕', skills: ['en-story'], diff: 2 },
    { title: 'Word Master', icon: '🏆', skills: ['en-order', 'en-capital'], diff: 3 }
  ];

  return { subject: 'english', title: 'Word Castle', skills: skills, levels: levels, bank: bank };
});
