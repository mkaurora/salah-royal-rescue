/* Minigames: level generators, pure rules, thresholds, stars and rewards for the 8 games (levels 1-12, band = ceil(L/2)).
 * Views live in js/minigames/* (phase 3). Everything here is deterministic per (game, level, seed). UMD: SI.minigames. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('rng', './rng.js'), dep('curriculum', '../data/curriculum/index.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.minigames = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG, CUR) {
  'use strict';

  var LEVELS = 12;
  var GAMES = [
    { id: 'shellSort', name: 'Shell Sort', icon: '🐚', unit: 'sorted', tip: 'Shells fall from the sky. Tap the right basket before they land!', rule: 'Read the baskets, then sort each falling shell.' },
    { id: 'coconutHop', name: 'Coconut Hop', icon: '🥥', unit: 'cleared', tip: 'Tap to jump over rolling coconuts, puddles and waving crabs.', rule: 'Jump at the right moment. Bumps never hurt, they just count as missed.' },
    { id: 'memoryMatch', name: 'Memory Match', icon: '🧩', unit: 'flips', tip: 'Flip two cards at a time and find the pairs.', rule: 'Fewer flips means more stars.' },
    { id: 'mathFishing', name: 'Math Fishing', icon: '🎣', unit: 'caught', tip: 'Read the question and tap the fish with the right answer.', rule: 'Catch it on the first try to score.' },
    { id: 'wordBuilder', name: 'Word Builder', icon: '🔤', unit: 'words', tip: 'Tap the letter bubbles in order to spell the word in the picture.', rule: 'Using a hint means the word does not score.' },
    { id: 'bridgeBuilder', name: 'Bridge Builder', icon: '🌉', unit: 'points', tip: 'Choose planks that add up exactly to the gap.', rule: 'Fewest planks on the first try earns the most points.' },
    { id: 'patternGarden', name: 'Pattern Garden', icon: '🌼', unit: 'correct', tip: 'Find the missing piece of the pattern.', rule: 'Get it on the first try to score.' },
    { id: 'kiteGlide', name: 'Kite Glide', icon: '🪁', unit: 'rings', tip: 'Tap to flap your kite up and glide through the rings.', rule: 'Fly through as many rings as you can.' }
  ];
  var IDS = GAMES.map(function (g) { return g.id; });
  var byId = {}; GAMES.forEach(function (g) { byId[g.id] = g; });

  function band(L) { return Math.ceil(L / 2); }
  function clampL(L) { return Math.max(1, Math.min(LEVELS, L | 0)); }
  function at(arr, L) { return arr[clampL(L) - 1]; }
  function rngFor(game, L, seed) { return RNG.make(game + ':' + L + ':' + (seed == null ? 1 : seed)); }
  function int(r, a, b) { return RNG.int(r, a, b); }

  /** strictly increasing thresholds out of fractions of total */
  function fracThresholds(total, fr) {
    var t1 = Math.min(total - 2, Math.ceil(total * fr[0])), t2 = Math.max(t1 + 1, Math.min(total - 1, Math.ceil(total * fr[1]))), t3 = Math.max(t2 + 1, Math.min(total, Math.ceil(total * fr[2])));
    return { t1: t1, t2: t2, t3: t3 };
  }

  /* ================================================================== shellSort */
  var SORT_TABLE = [ // baskets, items, fall seconds, rule
    [2, 12, 4.5, 'colour'], [2, 14, 4.2, 'colour'], [3, 16, 4.0, 'shape'], [3, 18, 3.8, 'shape'], [2, 18, 3.6, 'parity'], [3, 20, 3.4, 'endsin'],
    [3, 22, 3.2, 'range1'], [3, 24, 3.0, 'range2'], [3, 24, 2.8, 'mult235'], [4, 26, 2.6, 'mult235n'], [4, 28, 2.4, 'mult479n'], [4, 30, 2.2, 'mult6789']];
  var RULE_RANK = { colour: 1, shape: 1.5, parity: 3, endsin: 3.5, range1: 4.5, range2: 5, mult235: 6, mult235n: 7, mult479n: 8, mult6789: 9 };
  var COLOURS = [['pink', 'Pink', '#ff8ccf'], ['blue', 'Blue', '#4f8cff'], ['yellow', 'Yellow', '#ffcf3c'], ['green', 'Green', '#52d6a2']];
  var SHAPES = [['conch', 'Conch'], ['star', 'Star'], ['spiral', 'Spiral'], ['scallop', 'Scallop']];

  function sortClassify(spec, v) { // → basket index for number value v (number rules)
    switch (spec.rule) {
      case 'parity': return v % 2 === 0 ? 0 : 1;
      case 'endsin': return v % 10 === 0 ? 0 : v % 10 === 5 ? 1 : 2;
      case 'range1': return v < 20 ? 0 : v < 50 ? 1 : 2;
      case 'range2': return v < 100 ? 0 : v < 500 ? 1 : 2;
      default: {
        var f = spec.factors, hit = -1, count = 0;
        f.forEach(function (x, i) { if (v % x === 0) { hit = i; count++; } });
        if (count === 1) return hit;
        if (count === 0 && spec.hasNone) return f.length;
        return -1; // ambiguous: never generated
      }
    }
  }
  function genShellSort(L, seed) {
    var r = rngFor('shellSort', L, seed), row = at(SORT_TABLE, L), n = row[0], total = row[1], rule = row[3];
    var spec = { game: 'shellSort', level: L, rule: rule, fall: row[2], gap: Math.max(0.85, +(row[2] * 0.3).toFixed(2)), baskets: [], items: [], total: total };
    var i, pool;
    if (rule === 'colour') {
      var cs = RNG.sample(r, COLOURS, 2); spec.baskets = cs.map(function (c) { return { label: c[1], color: c[2], key: c[0] }; });
      for (i = 0; i < total; i++) { var b = i % 2 === 0 ? int(r, 0, 1) : (i * 7 + int(r, 0, 1)) % 2; spec.items.push({ b: b, key: cs[b][0], color: cs[b][2], label: '' }); }
    } else if (rule === 'shape') {
      var ss = RNG.sample(r, SHAPES, 3); spec.baskets = ss.map(function (s) { return { label: s[1], key: s[0] }; });
      for (i = 0; i < total; i++) { var bb = int(r, 0, 2); spec.items.push({ b: bb, key: ss[bb][0], shape: ss[bb][0], label: '' }); }
    } else {
      var labels, gen;
      if (rule === 'parity') { labels = ['Even', 'Odd']; gen = function () { return int(r, 1, 40); }; }
      else if (rule === 'endsin') { labels = ['Ends in 0', 'Ends in 5', 'Other']; gen = function () { return int(r, 1, 60); }; }
      else if (rule === 'range1') { labels = ['Under 20', '20 to 49', '50 and up']; gen = function () { return int(r, 1, 99); }; }
      else if (rule === 'range2') { labels = ['Under 100', '100 to 499', '500 and up']; gen = function () { return int(r, 10, 999); }; }
      else {
        spec.hasNone = /n$/.test(rule);
        spec.factors = rule.indexOf('235') >= 0 ? [2, 3, 5] : rule.indexOf('479') >= 0 ? [4, 7, 9] : [6, 7, 8, 9];
        labels = spec.factors.map(function (f) { return 'Times ' + f; }); if (spec.hasNone) labels.push('None of these');
        gen = function () { return int(r, 2, rule === 'mult6789' ? 99 : rule === 'mult479n' ? 99 : 60); };
      }
      spec.baskets = labels.map(function (l, k) { return { label: l, key: String(k) }; });
      // balanced: aim for every basket to appear, never ambiguous
      var guard = 0;
      while (spec.items.length < total && guard++ < 5000) {
        var want = spec.items.length % spec.baskets.length, v = gen(), c = sortClassify(spec, v);
        if (c < 0 || c >= spec.baskets.length) continue;
        if (c !== want && r() < 0.6) continue;
        spec.items.push({ b: c, v: v, label: String(v) });
      }
      if (spec.items.length < total) throw new Error('shellSort L' + L + ': could not generate items');
    }
    if (n !== spec.baskets.length) throw new Error('shellSort basket count');
    spec.items.forEach(function (it, k) { it.t = +(k * spec.gap).toFixed(2); });
    return spec;
  }
  /** Is dropping this item in basket index b right? (rule recomputed from the item itself) */
  function sortIsCorrect(spec, item, b) {
    if (item.v != null) return sortClassify(spec, item.v) === b;
    return spec.baskets[b] && spec.baskets[b].key === item.key;
  }
  function sortDiff(spec) { return RULE_RANK[spec.rule] * 10 + spec.total + 10 / spec.fall + spec.baskets.length; }

  /* ================================================================== coconutHop */
  var AIR = 0.7, LAND = 0.6, WIDTH = { coconut: 0.8, puddle: 1.6, crab: 1.0 };
  function hopSpeed(L) { return +(4 + (L - 1) * 0.36).toFixed(2); }
  function hopCount(L) { return at([10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 31, 34], L); }
  function hopTypes(L) { return L <= 3 ? ['coconut'] : L <= 7 ? ['coconut', 'puddle'] : ['coconut', 'puddle', 'crab']; }
  /** minimum free distance between two obstacles so the player can land and jump again */
  function hopMinGap(speed) { return +(speed * AIR * LAND + 0.6).toFixed(2); }
  function genCoconutHop(L, seed) {
    var r = rngFor('coconutHop', L, seed), speed = hopSpeed(L), types = hopTypes(L), n = hopCount(L), minGap = hopMinGap(speed);
    var x = 8, obs = [], extra = Math.max(0.4, 2.6 - L * 0.17);
    for (var i = 0; i < n; i++) {
      var type = RNG.pick(r, types), w = WIDTH[type];
      obs.push({ x: +x.toFixed(2), type: type, w: w });
      x += w + minGap + r() * extra;
    }
    return { game: 'coconutHop', level: L, speed: speed, airtime: AIR, minGap: minGap, obstacles: obs, length: +(x + 6).toFixed(2), total: n };
  }
  /** Can a jump started at distance `px` clear obstacle o? (jump covers speed*airtime, must start before o and land after it) */
  function hopClears(spec, px, o) {
    var jump = spec.speed * spec.airtime, start = px, land = px + jump;
    return start <= o.x - 0.15 && land >= o.x + o.w + 0.15;
  }
  /** Latest/earliest jump start for obstacle o: any px in [o.x + o.w + .15 - jump, o.x - .15] */
  function hopWindow(spec, o) { var j = spec.speed * spec.airtime; return [o.x + o.w + 0.15 - j, o.x - 0.15]; }
  function hopDiff(spec) { return spec.total * spec.speed + spec.obstacles.reduce(function (a, o) { return a + o.w; }, 0); }

  /* ================================================================== memoryMatch */
  var MEM_TABLE = [[3, 2, 3], [4, 2, 4], [5, 2, 5], [6, 3, 4], [6, 3, 4], [8, 4, 4], [8, 4, 4], [10, 4, 5], [10, 4, 5], [12, 4, 6], [14, 4, 7], [15, 5, 6]];
  var ICONS = ['🐚', '⭐', '🐟', '🌴', '🦀', '🐢', '🍍', '🌸', '🐬', '🪁', '🍉', '🦜', '🌻', '🚲', '🐝', '🍎', '🧭', '🔔'];
  var NUMWORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen'];
  var OPPS = [['hot', 'cold'], ['up', 'down'], ['big', 'small'], ['day', 'night'], ['fast', 'slow'], ['wet', 'dry'], ['open', 'shut'], ['full', 'empty']];
  function memKind(L) { return L <= 4 ? 'icon' : L <= 6 ? 'numword' : L <= 8 ? 'dots' : L <= 10 ? 'equation' : 'mixed'; }
  function dotStr(n) { var s = ''; for (var i = 0; i < n; i++) s += '●'; return s; }
  function genMemoryMatch(L, seed) {
    var r = rngFor('memoryMatch', L, seed), row = at(MEM_TABLE, L), pairs = row[0], kind = memKind(L), list = [];
    var nums = RNG.sample(r, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], pairs);
    var i;
    if (kind === 'icon') { RNG.sample(r, ICONS, pairs).forEach(function (ic) { list.push([ic, ic]); }); }
    else if (kind === 'numword') nums.forEach(function (n) { list.push([String(n), NUMWORDS[n - 1]]); });
    else if (kind === 'dots') nums.forEach(function (n) { list.push([dotStr(n), String(n)]); });
    else if (kind === 'equation') {
      var used = {};
      while (list.length < pairs) {
        var a = int(r, 2, 9), b = int(r, 2, 9), mul = L >= 10 && r() < 0.5, ans = mul ? a * b : a + b, key = String(ans);
        if (used[key]) continue; used[key] = 1; list.push([a + (mul ? ' × ' : ' + ') + b, String(ans)]);
      }
    } else {
      var oi = RNG.sample(r, OPPS, Math.min(5, pairs - 4));
      oi.forEach(function (p) { list.push(r() < 0.5 ? [p[0], p[1]] : [p[1], p[0]]); });
      var used2 = {};
      while (list.length < pairs) {
        var a2 = int(r, 3, 9), b2 = int(r, 3, 9), ans2 = a2 * b2;
        if (used2[ans2]) continue; used2[ans2] = 1; list.push([a2 + ' × ' + b2, String(ans2)]);
      }
    }
    var deck = [];
    list.forEach(function (p, k) { deck.push({ pair: k, face: p[0] }); deck.push({ pair: k, face: p[1] }); });
    deck = RNG.shuffle(r, deck);
    return { game: 'memoryMatch', level: L, kind: kind, pairs: pairs, cols: row[1], rows: row[2], deck: deck, total: pairs };
  }
  function memIsMatch(a, b) { return !!a && !!b && a !== b && a.pair === b.pair; }
  function memDiff(spec) { return spec.pairs * 10 + ({ icon: 0, numword: 6, dots: 8, equation: 12, mixed: 16 }[spec.kind]); }

  /* ================================================================== mathFishing */
  var FISH_ROUNDS = [8, 9, 10, 10, 11, 11, 12, 12, 13, 14, 15, 16];
  var FISH_TIME = [12, 11, 11, 10, 10, 9, 9, 8.5, 8, 7.5, 7, 6.5];
  function genMathFishing(L, seed) {
    var n = at(FISH_ROUNDS, L), tier = band(L), base = (seed == null ? 1 : seed) * 1000 + L * 50, rounds = [];
    var skills = CUR.math.skillsFor(tier), r = rngFor('mathFishing', L, seed);
    for (var i = 0; i < n; i++) {
      // even levels favour the newest skills of the tier
      var pool = L % 2 === 0 ? skills.filter(function (s) { return CUR.math.RANGE[s][0] >= tier - 1; }) : skills;
      if (!pool.length) pool = skills;
      var q = CUR.math.make(tier, base + i, RNG.pick(r, pool));
      rounds.push({ text: q.text, pic: q.pic || null, options: q.options.slice(0, 4), answer: q.answer, hint: q.hint, id: q.id });
    }
    return { game: 'mathFishing', level: L, tier: tier, time: at(FISH_TIME, L), rounds: rounds, total: n };
  }
  function fishDiff(spec) { return spec.total * 4 + 100 / spec.time + spec.tier * 10; }

  /* ================================================================== wordBuilder */
  var WORDS = [
    ['cat', '🐱'], ['sun', '☀️'], ['hat', '🎩'], ['dog', '🐶'], ['bee', '🐝'], ['cup', '🥤'], ['hen', '🐔'], ['bus', '🚌'], ['net', '🥅'], ['map', '🗺️'], ['bed', '🛏️'], ['key', '🔑'], ['egg', '🥚'], ['owl', '🦉'],
    ['fish', '🐟'], ['frog', '🐸'], ['tree', '🌳'], ['boat', '⛵'], ['moon', '🌙'], ['star', '⭐'], ['bird', '🐦'], ['cake', '🍰'], ['rain', '🌧️'], ['shoe', '👟'], ['duck', '🦆'], ['lamp', '💡'], ['kite', '🪁'], ['book', '📖'], ['ship', '🚢'],
    ['apple', '🍎'], ['beach', '🏖️'], ['cloud', '☁️'], ['plant', '🌱'], ['shell', '🐚'], ['snail', '🐌'], ['water', '💧'], ['house', '🏠'], ['tiger', '🐯'], ['whale', '🐋'], ['bread', '🍞'], ['clock', '🕐'], ['mouse', '🐭'], ['robot', '🤖'],
    ['island', '🏝️'], ['jungle', '🌴'], ['garden', '🌷'], ['rocket', '🚀'], ['turtle', '🐢'], ['monkey', '🐒'], ['flower', '🌸'], ['window', '🪟'], ['bridge', '🌉'], ['castle', '🏰'], ['planet', '🪐'], ['parrot', '🦜'], ['basket', '🧺'],
    ['dolphin', '🐬'], ['penguin', '🐧'], ['balloon', '🎈'], ['volcano', '🌋'], ['giraffe', '🦒'], ['compass', '🧭'], ['lantern', '🏮'], ['hamster', '🐹'], ['diamond', '💎'], ['kitchen', '🍳'], ['sailing', '⛵'], ['thunder', '⛈️'],
    ['elephant', '🐘'], ['mountain', '⛰️'], ['football', '⚽'], ['notebook', '📓'], ['backpack', '🎒'], ['dinosaur', '🦖'], ['umbrella', '☂️'], ['crocodile', '🐊'], ['painting', '🎨'], ['airplane', '✈️'], ['squirrel', '🐿️'], ['sunshine', '🌞'],
    ['butterfly', '🦋'], ['telescope', '🔭'], ['adventure', '🧭'], 
    ['chocolate', '🍫'], ['waterfall', '🏞️'], ['spaceship', '🚀'], ['lighthouse', '🗼'], ['fireflies', '✨'], ['snowflake', '❄️'], ['sunflower', '🌻'], ['hurricane', '🌀']
  ].filter(function (w) { return typeof w[0] === 'string' && /^[a-z]+$/.test(w[0]); });
  var WORD_LEN = [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 9], WORD_N = [5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10], WORD_X = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
  var ALPHA = 'abcdefghijklmnopqrstuvwxyz'.split('');
  function wordsOfLen(n) { return WORDS.filter(function (w) { return w[0].length === n; }); }
  function genWordBuilder(L, seed) {
    var r = rngFor('wordBuilder', L, seed), len = at(WORD_LEN, L), n = at(WORD_N, L), extra = at(WORD_X, L);
    var pool = wordsOfLen(len);
    if (pool.length < n) pool = pool.concat(wordsOfLen(len - 1)); // never needed with the bank below, kept as a guard
    var picks = RNG.sample(r, pool, n), words = picks.map(function (w) {
      var word = w[0], used = {}; word.split('').forEach(function (c) { used[c] = 1; });
      var dist = RNG.sample(r, ALPHA.filter(function (c) { return !used[c]; }), extra);
      return { word: word, pic: w[1], letters: RNG.shuffle(r, word.split('').concat(dist)) };
    });
    return { game: 'wordBuilder', level: L, length: len, extra: extra, words: words, total: n };
  }
  function wordNext(w, progress, letter) { return w.word.charAt(progress) === letter; }
  function wordDiff(spec) { return spec.length * 10 + spec.total * 2 + spec.extra * 3; }

  /* ================================================================== bridgeBuilder */
  var BR_ROUNDS = [5, 5, 6, 6, 6, 7, 7, 7, 8, 8, 8, 8];
  var BR_GAP = [6, 8, 10, 12, 14, 18, 22, 26, 30, 34, 38, 40];
  var BR_SETS = [[1, 2, 3], [1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 5], [2, 3, 5, 6], [2, 3, 5, 7], [3, 4, 5, 7], [3, 4, 7, 9], [3, 5, 7, 9], [4, 6, 9, 12], [5, 7, 9, 12, 15], [6, 8, 11, 14, 17]];
  var BR_MAX = [6, 6, 6, 5, 5, 5, 5, 4, 4, 4, 4, 4];
  /** minimum number of planks (unlimited copies) summing exactly to G with at most maxPlanks, or null */
  function bridgeSolve(G, planks, maxPlanks) {
    var best = new Array(G + 1).fill(Infinity); best[0] = 0;
    for (var g = 1; g <= G; g++) planks.forEach(function (p) { if (g >= p && best[g - p] + 1 < best[g]) best[g] = best[g - p] + 1; });
    return best[G] <= maxPlanks ? best[G] : null;
  }
  function genBridgeBuilder(L, seed) {
    var r = rngFor('bridgeBuilder', L, seed), planks = at(BR_SETS, L), maxP = at(BR_MAX, L), gmax = at(BR_GAP, L), n = at(BR_ROUNDS, L), rounds = [], guard = 0, seen = {};
    while (rounds.length < n && guard++ < 5000) {
      var k = int(r, 2, maxP), sum = 0;
      for (var i = 0; i < k; i++) sum += RNG.pick(r, planks);
      if (sum > gmax || sum < Math.max(planks[0] + planks[1], Math.round(gmax * 0.4)) || seen[sum]) continue;
      var min = bridgeSolve(sum, planks, maxP);
      if (min === null || min < 2) continue;
      seen[sum] = true; rounds.push({ gap: sum, min: min });
    }
    if (rounds.length < n) { // relax uniqueness
      while (rounds.length < n) { var s2 = int(r, planks[0] + planks[1], gmax), m2 = bridgeSolve(s2, planks, maxP); if (m2 !== null && m2 >= 2) rounds.push({ gap: s2, min: m2 }); }
    }
    return { game: 'bridgeBuilder', level: L, planks: planks, maxPlanks: maxP, rounds: rounds, total: 2 * n };
  }
  /** Score one round: picks = plank lengths chosen, attemptsBefore = failed attempts so far. → points 0/1/2, or -1 if invalid */
  function bridgeScoreRound(spec, round, picks, attemptsBefore) {
    var sum = picks.reduce(function (a, b) { return a + b; }, 0);
    if (sum !== round.gap || picks.length > spec.maxPlanks || picks.some(function (p) { return spec.planks.indexOf(p) < 0; })) return -1;
    var isMin = picks.length === round.min;
    if (attemptsBefore === 0) return isMin ? 2 : 1;
    return isMin ? 1 : 0;
  }
  function bridgeDiff(spec) { return spec.rounds.length * 5 + Math.max.apply(null, spec.rounds.map(function (x) { return x.gap; })) * 2 + (7 - spec.maxPlanks) * 6 + spec.planks.length; }

  /* ================================================================== patternGarden */
  var FLOWERS = ['🌸', '🌻', '🌷', '🌼', '🍀', '🌿', '🍄', '🐝', '🦋', '🐞'];
  var COLOURSQ = ['🔴', '🟡', '🟢', '🔵', '🟣', '🟠'];
  var PAT_ROUNDS = [8, 8, 9, 9, 10, 10, 10, 11, 11, 12, 12, 12];
  var PAT_KINDS = { 1: ['AB', 'ABB'], 2: ['AAB', 'ABC', 'AABB', 'skip'], 3: ['skip', 'grow', 'shrink', 'ABCD'], 4: ['double', 'grow', 'pairs', 'skip'], 5: ['square', 'triangle', 'altpm', 'doubleplus'], 6: ['fib', 'triple', 'incr', 'interleave'] };
  var OPT_COUNT = [3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4];
  function patRound(kind, r, L) {
    var cells, i, a, d, st;
    var syms = RNG.sample(r, r() < 0.5 ? FLOWERS : COLOURSQ, 4);
    function rep(motif, n) { var o = []; for (var k = 0; k < n; k++) o.push(motif[k % motif.length]); return o; }
    switch (kind) {
      case 'AB': cells = rep([syms[0], syms[1]], 7); break;
      case 'ABB': cells = rep([syms[0], syms[1], syms[1]], 8); break;
      case 'AAB': cells = rep([syms[0], syms[0], syms[1]], 8); break;
      case 'ABC': cells = rep([syms[0], syms[1], syms[2]], 8); break;
      case 'AABB': cells = rep([syms[0], syms[0], syms[1], syms[1]], 9); break;
      case 'ABCD': cells = rep(syms, 9); break;
      case 'pairs': { var big = ['🔴', '🟡', '🟢', '🔵']; var sm = RNG.sample(r, [['🔴', '🟡'], ['🟢', '🔵'], ['🟡', '🟢']], 1)[0]; cells = rep([sm[0] + '1', sm[1] + '2', sm[0] + '2', sm[1] + '1'], 9); break; }
      case 'skip': st = pick1(r, L <= 4 ? [2, 5, 10] : [3, 4, 6]); a = st * int(r, 0, 3); cells = []; for (i = 0; i < 7; i++) cells.push(String(a + st * i)); break;
      case 'grow': d = int(r, 3, 9); a = int(r, 1, 20); cells = []; for (i = 0; i < 7; i++) cells.push(String(a + d * i)); break;
      case 'shrink': d = int(r, 2, 8); a = d * 8 + int(r, 5, 20); cells = []; for (i = 0; i < 7; i++) cells.push(String(a - d * i)); break;
      case 'double': a = int(r, 1, 5); cells = []; for (i = 0; i < 6; i++) cells.push(String(a * Math.pow(2, i))); break;
      case 'square': a = int(r, 0, 2); cells = []; for (i = 1; i <= 7; i++) cells.push(String((i + a) * (i + a))); break;
      case 'triangle': cells = []; for (i = 1; i <= 7; i++) cells.push(String(i * (i + 1) / 2)); break;
      case 'altpm': { var p = int(r, 3, 7), m = int(r, 1, 2), x = int(r, 2, 12); cells = [String(x)]; for (i = 1; i < 8; i++) { x += i % 2 ? p : -m; cells.push(String(x)); } break; }
      case 'doubleplus': a = int(r, 1, 3); cells = [String(a)]; for (i = 1; i < 6; i++) { a = a * 2 + 1; cells.push(String(a)); } break;
      case 'fib': a = int(r, 1, 3); d = int(r, 1, 3); cells = [String(a), String(d)]; for (i = 2; i < 8; i++) cells.push(String(+cells[i - 1] + +cells[i - 2])); break;
      case 'triple': a = int(r, 1, 3); cells = []; for (i = 0; i < 6; i++) cells.push(String(a * Math.pow(3, i))); break;
      case 'incr': { a = int(r, 1, 10); d = 1 + int(r, 0, 1); cells = [String(a)]; var s2 = d; for (i = 1; i < 8; i++) { a += s2; s2++; cells.push(String(a)); } break; }
      case 'interleave': { var u = int(r, 1, 5), v = int(r, 20, 30), su = int(r, 2, 4), sv = int(r, 2, 4); cells = []; for (i = 0; i < 8; i++) cells.push(String(i % 2 === 0 ? u + su * (i / 2) : v - sv * ((i - 1) / 2))); break; }
      default: throw new Error('pattern kind ' + kind);
    }
    return cells;
  }
  function pick1(r, a) { return a[Math.floor(r() * a.length)]; }
  function genPatternGarden(L, seed) {
    var r = rngFor('patternGarden', L, seed), n = at(PAT_ROUNDS, L), bnd = band(L), kinds = PAT_KINDS[bnd], rounds = [], optN = at(OPT_COUNT, L);
    for (var i = 0; i < n; i++) {
      var kind = kinds[i % kinds.length], cells = patRound(kind, r, L), maxShow = kind === 'ABCD' ? 8 : cells.length;
      var lastOnly = bnd <= 2 || r() < 0.4;
      var miss = lastOnly ? Math.min(cells.length, maxShow) - 1 : int(r, Math.floor(cells.length / 2), cells.length - 2);
      var shown = cells.slice(0, miss + 1), answer = cells[miss];
      var numeric = /^-?\d+$/.test(answer), opts = [answer];
      if (numeric) {
        var an = +answer, deltas = RNG.shuffle(r, [1, -1, 2, -2, 3, 5, 10, -10, an > 20 ? 4 : 6]);
        deltas.forEach(function (dd) { var o = String(an + dd); if (opts.length < optN && +o >= 0 && opts.indexOf(o) < 0) opts.push(o); });
      } else {
        var alts = answer.length > 2 && /[12]$/.test(answer) ? ['🔴1', '🟡2', '🟢1', '🔵2', '🔴2', '🟡1'] : (/[🔴🟡🟢🔵🟣🟠]/u.test(answer) ? COLOURSQ : FLOWERS);
        RNG.shuffle(r, alts).forEach(function (o) { if (opts.length < optN && opts.indexOf(o) < 0) opts.push(o); });
      }
      rounds.push({ kind: kind, cells: shown.slice(0, miss).concat(['?']), shown: shown.slice(0, miss), after: cells.slice(miss + 1, miss + 3), answer: answer, options: RNG.shuffle(r, opts) });
    }
    return { game: 'patternGarden', level: L, rounds: rounds, total: n };
  }
  function patDiff(spec) { return spec.total * 3 + band(spec.level) * 20 + (spec.level % 2 === 0 ? 6 : 0); }

  /* ================================================================== kiteGlide */
  var KITE_RINGS = [8, 10, 10, 12, 12, 14, 16, 16, 18, 20, 22, 24];
  var KITE_R = [0.16, 0.15, 0.145, 0.14, 0.13, 0.125, 0.12, 0.11, 0.105, 0.1, 0.095, 0.09];
  var KITE_SPEED = [3, 3.2, 3.4, 3.6, 3.8, 4.0, 4.3, 4.6, 4.9, 5.1, 5.3, 5.5];
  function kiteDt(L) { return +(1.4 - 0.05 * L).toFixed(3); }
  function kiteReach(dt) { return 0.5 * dt - 0.02; }
  function kiteDyMax(L) { return 0.2 + 0.012 * L; }
  function kiteReachable(prevY, nextY, dt) { return Math.abs(nextY - prevY) <= kiteReach(dt) + 1e-9; }
  function genKiteGlide(L, seed) {
    var r = rngFor('kiteGlide', L, seed), n = at(KITE_RINGS, L), dt = kiteDt(L), speed = at(KITE_SPEED, L), dy = kiteDyMax(L), y = 0.5, rings = [];
    for (var i = 0; i < n; i++) {
      var ny = y + (r() * 2 - 1) * dy;
      ny = Math.max(0.15, Math.min(0.85, ny));
      rings.push({ x: +((i + 1) * speed * dt).toFixed(3), y: +ny.toFixed(3), t: +((i + 1) * dt).toFixed(3) }); y = ny;
    }
    return { game: 'kiteGlide', level: L, speed: speed, dt: dt, radius: at(KITE_R, L), rings: rings, total: n, startY: 0.5 };
  }
  function kiteDiff(spec) { return spec.total + spec.speed * 10 + (0.2 / spec.radius) * 10; }

  /* ================================================================== generic API */
  var GEN = { shellSort: genShellSort, coconutHop: genCoconutHop, memoryMatch: genMemoryMatch, mathFishing: genMathFishing, wordBuilder: genWordBuilder,
    bridgeBuilder: genBridgeBuilder, patternGarden: genPatternGarden, kiteGlide: genKiteGlide };
  var DIFF = { shellSort: sortDiff, coconutHop: hopDiff, memoryMatch: memDiff, mathFishing: fishDiff, wordBuilder: wordDiff, bridgeBuilder: bridgeDiff, patternGarden: patDiff, kiteGlide: kiteDiff };

  function generate(game, L, seed) { L = clampL(L); return GEN[game](L, seed); }
  function difficulty(game, L) { return +DIFF[game](generate(game, L, 1)).toFixed(3); }

  var cache = {};
  function thresholds(game, L) {
    L = clampL(L);
    var key = game + L; if (cache[key]) return cache[key];
    var spec = generate(game, L, 1), t, lower = false, total = spec.total;
    if (game === 'memoryMatch') {
      lower = true; t = { t3: Math.ceil(1.9 * spec.pairs), t2: Math.ceil(2.6 * spec.pairs), t1: 9999 };
    } else if (game === 'shellSort' || game === 'coconutHop') t = fracThresholds(total, [0.6, 0.8, 0.95]);
    else if (game === 'bridgeBuilder') t = fracThresholds(total, [0.55, 0.75, 0.9]);
    else t = fracThresholds(total, [0.6, 0.8, 0.95]);
    var res = { t1: t.t1, t2: t.t2, t3: t.t3, unit: byId[game].unit, lowerBetter: lower, total: total, max: lower ? spec.pairs : total };
    cache[key] = res; return res;
  }
  /** score → stars 0-3 (0 = not yet; for memoryMatch a finished game is always ≥1) */
  function starsFor(game, L, score) {
    var t = thresholds(game, L);
    if (t.lowerBetter) return score <= t.t3 ? 3 : score <= t.t2 ? 2 : score <= t.t1 ? 1 : 0;
    return score >= t.t3 ? 3 : score >= t.t2 ? 2 : score >= t.t1 ? 1 : 0;
  }
  function perfectScore(game, L) { var t = thresholds(game, L); return t.lowerBetter ? t.max : t.total; }
  /** a weak-but-passing score (1 star) */
  function passScore(game, L) { var t = thresholds(game, L); return t.lowerBetter ? t.t2 + 1 : t.t1; }
  function describe(game, L) {
    var t = thresholds(game, L);
    return t.lowerBetter ? '⭐ finish · ⭐⭐ ' + t.t2 + ' flips or fewer · ⭐⭐⭐ ' + t.t3 + ' flips or fewer'
      : '⭐ ' + t.t1 + ' · ⭐⭐ ' + t.t2 + ' · ⭐⭐⭐ ' + t.t3 + ' ' + t.unit;
  }
  /** coins/xp for a finished play. best = previous best stars on this level. */
  function reward(L, stars, best) {
    if (!stars) return { coins: 0, xp: 0 };
    var improved = stars > (best || 0), B = 6 + 3 * L;
    return { coins: Math.round(B * stars / 3 * (improved ? 1 : 0.35)), xp: Math.round((8 + 2 * L) * stars / 3 * (improved ? 1 : 0.4)) + 2 };
  }

  return {
    LEVELS: LEVELS, GAMES: GAMES, IDS: IDS, byId: byId, band: band, generate: generate, difficulty: difficulty, thresholds: thresholds, starsFor: starsFor,
    perfectScore: perfectScore, passScore: passScore, describe: describe, reward: reward, fracThresholds: fracThresholds,
    rules: {
      sortIsCorrect: sortIsCorrect, hopClears: hopClears, hopWindow: hopWindow, hopMinGap: hopMinGap, memIsMatch: memIsMatch, wordNext: wordNext,
      bridgeSolve: bridgeSolve, bridgeScoreRound: bridgeScoreRound, kiteReachable: kiteReachable, kiteReach: kiteReach, WIDTH: WIDTH
    },
    WORDS: WORDS
  };
});
