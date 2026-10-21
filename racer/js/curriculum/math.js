/* Number Jungle — math levels + parametric question generators (seeded, so every play varies but tests are
 * reproducible). UMD.
 *
 * Voice: math prompts are spoken as a SEQUENCE of short clip fragments (q.say = ['What is', '3', 'plus', '4']).
 * Every fragment comes from the finite registry below (numbers 0–120 + fixed phrases), so all of them can be
 * pre-generated; voiceLines() lists them. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.content = root.SQ.content || {}; root.SQ.content.math = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- spoken fragment registry ---------- */
  var REG = {};
  function L(s) { REG[s] = true; return s; }
  for (var n0 = 0; n0 <= 120; n0++) L(String(n0));
  function N(n) { return String(n); }

  var OBJ = [
    { e: '🍎', n: 'apples' }, { e: '⭐', n: 'stars' }, { e: '🐟', n: 'fish' }, { e: '🦆', n: 'ducks' },
    { e: '🚗', n: 'cars' }, { e: '🍪', n: 'cookies' }, { e: '🐝', n: 'bees' }, { e: '🌸', n: 'flowers' },
    { e: '🐸', n: 'frogs' }, { e: '⚽', n: 'balls' }, { e: '🍌', n: 'bananas' }, { e: '🎈', n: 'balloons' }
  ];
  OBJ.forEach(function (o) { L('How many ' + o.n + '?'); L(o.n); });

  var NUMWORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
    'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

  var S = {
    whatIs: L('What is'), plus: L('plus'), takeAway: L('take away'), minus: L('minus'),
    tapCount: L('Tap each one as you count.'),
    howManyDots: L('How many dots?'), countDots: L('Count the dots. Tap each one.'),
    findNumber: L('Find the number'), numberWord: L('Say the number word out loud.'),
    whichMore: L('Which has more?'), whichLess: L('Which has less?'),
    hintMore: L('Count each group. Which number is bigger?'), hintLess: L('Count each group. Which number is smaller?'),
    whichBigger: L('Which number is bigger?'), whichSmaller: L('Which number is smaller?'),
    hintBigger: L('Count up from zero. The bigger number comes later.'),
    hintSmaller: L('Count up from zero. The smaller number comes first.'),
    countAll: L('Count all of them together.'), startAt: L('Start at'), countUp: L('Count up'), more: L('more.'),
    countUpTo: L('Count up to'),
    crossOut: L('Cross them out. Count what is left.'), countLeft: L('Count what is left.'),
    makeTen: L('Ten and some more. Count on from ten.'), countBackFrom: L('Count back from'),
    whatNext: L('What comes next?'), whatMissing: L('What number is missing?'),
    countByOne: L('Count up by one.'), plusWhatMakes: L('plus what makes'),
    by10: L('Count by tens. What comes next?'), by5: L('Count by fives. What comes next?'), by2: L('Count by twos. What comes next?'),
    hint10: L('Count by tens. Ten, twenty, thirty.'), hint5: L('Count by fives. Five, ten, fifteen.'), hint2: L('Count by twos. Two, four, six.'),
    howManyTens: L('How many tens?'), howManyOnes: L('How many ones?'), whatNumber: L('What number is this?'),
    tensAnd: L('tens and'), ones: L('ones.'), whatNumberIsIt: L('What number is that?'),
    hintTens: L('Each long bar is ten. Each small cube is one.'),
    is: L('Is'), evenOrOdd: L('even or odd?'), hintPairs: L('Make pairs. Is one left over?'),
    hintEven: L('Even numbers end in 0, 2, 4, 6 or 8.'),
    whichEven: L('Which number is even?'), whichOdd: L('Which number is odd?'),
    pickSign: L('Pick the sign for'), and: L('and'), hintSign: L('The open mouth eats the bigger number.'),
    howManySides: L('How many sides does it have?'), hintSides: L('Count each straight side, one by one.'),
    whatShape: L('What shape is this?'),
    whatTime: L('What time is it?'), hintHour: L('The short hand shows the hour.'),
    hintHalf: L('When the long hand points to 6, it is half past.'),
    whichClock: L('Which clock shows'), oclock: L("o'clock."), thirty: L('thirty.'),
    howMuchCoin: L('How much is this coin worth?'), howManyCents: L('How many cents?'),
    hintCoins: L('Start with the biggest coin. Then count on.'),
    whichLonger: L('Which is longer?'), whichShorter: L('Which is shorter?'),
    whichLongest: L('Which is the longest?'), whichShortest: L('Which is the shortest?'),
    hintEnds: L('Look at where each one ends.'), howManyCubes: L('How many cubes long is the pencil?'),
    hintCubes: L('Count the cubes under it.'),
    salahHas: L('Salah has'), heGets: L('He gets'), howManyNow: L('How many now?'),
    givesAway: L('He gives away'), howManyLeft: L('How many are left?'),
    hintAddStory: L('He gets more, so add them together.'), hintSubStory: L('He gives some away, so take away.'),
    hintTensOnes: L('Add the tens. Then add the ones.'), hintSubTensOnes: L('Take away the tens. Then take away the ones.'),
    orderUp: L('Tap from smallest to biggest.'), hintOrder: L('Find the smallest number first.')
  };

  var SHAPES2D = {
    circle: { name: 'circle', sides: 0, hint: 'A circle is round, like a ball.' },
    square: { name: 'square', sides: 4, hint: 'A square has 4 sides that are all the same.' },
    triangle: { name: 'triangle', sides: 3, hint: 'A triangle has 3 sides.' },
    rectangle: { name: 'rectangle', sides: 4, hint: 'A rectangle is long, like a door.' },
    star: { name: 'star', sides: 10, hint: 'A star has 5 points.' },
    oval: { name: 'oval', sides: 0, hint: 'An oval looks like an egg.' },
    heart: { name: 'heart', sides: 0, hint: 'A heart is the shape of love.' },
    hexagon: { name: 'hexagon', sides: 6, hint: 'A hexagon has 6 sides.' },
    pentagon: { name: 'pentagon', sides: 5, hint: 'A pentagon has 5 sides.' }
  };
  Object.keys(SHAPES2D).forEach(function (k) {
    var s = SHAPES2D[k];
    s.ask = L('Which one is ' + (/^[aeiou]/.test(k) ? 'an ' : 'a ') + k + '?');
    L(s.hint);
  });
  var SOLIDS = {
    cube: { label: 'Cube', real: ['🎲', '🧊', '🎁'], hint: 'A cube is like a box. All its faces are squares.' },
    sphere: { label: 'Sphere', real: ['⚽', '🏀', '🌍'], hint: 'A sphere is round like a ball.' },
    cone: { label: 'Cone', real: ['🍦', '🎉'], hint: 'A cone has a point and a round bottom.' },
    cylinder: { label: 'Cylinder', real: ['🥫', '🔋'], hint: 'A cylinder is like a can.' },
    pyramid: { label: 'Pyramid', real: [], hint: 'A pyramid has a point on top and triangle sides.' }
  };
  Object.keys(SOLIDS).forEach(function (k) {
    SOLIDS[k].ask = L('Which one is a ' + k + '?');
    L(SOLIDS[k].hint);
  });
  var SOLID_FACTS = [
    { text: 'Which shape has 6 square faces?', answer: 'cube' },
    { text: 'Which shape can roll and has no flat faces?', answer: 'sphere' },
    { text: 'Which shape looks like a can?', answer: 'cylinder' },
    { text: 'Which shape looks like an ice cream cone?', answer: 'cone' },
    { text: 'Which shape has triangle sides and a point?', answer: 'pyramid' }
  ];
  SOLID_FACTS.forEach(function (f) { L(f.text); });

  var COINS = {
    penny: { cents: 1, ask: L('Which coin is a penny?'), hint: L('A penny is the brown coin.') },
    nickel: { cents: 5, ask: L('Which coin is a nickel?'), hint: L('A nickel is big and silver, but smooth.') },
    dime: { cents: 10, ask: L('Which coin is a dime?'), hint: L('A dime is the smallest coin.') },
    quarter: { cents: 25, ask: L('Which coin is a quarter?'), hint: L('A quarter is the biggest coin.') }
  };
  var COIN_NAMES = ['penny', 'nickel', 'dime', 'quarter'];
  L('A penny is 1 cent. A nickel is 5. A dime is 10. A quarter is 25.');
  var BAR_COLORS = ['red', 'blue', 'green', 'orange', 'purple'];

  var skills = {
    'ma-count': 'Counting objects',
    'ma-numrec': 'Number recognition',
    'ma-compare': 'More or less',
    'ma-add10': 'Add within 10',
    'ma-sub10': 'Subtract within 10',
    'ma-shapes2d': '2D shapes',
    'ma-missing': 'Missing number',
    'ma-ordernum': 'Ordering numbers',
    'ma-skip': 'Skip counting',
    'ma-evenodd': 'Even and odd',
    'ma-add20': 'Add within 20',
    'ma-sub20': 'Subtract within 20',
    'ma-place': 'Tens and ones',
    'ma-time': 'Telling time',
    'ma-coins': 'Coins and money',
    'ma-measure': 'Measuring length',
    'ma-shapes3d': '3D shapes',
    'ma-word': 'Word problems',
    'ma-compare100': 'Compare to 100',
    'ma-add100': 'Add within 100',
    'ma-sub100': 'Subtract within 100'
  };

  var levels = [
    { title: 'Count to 5', icon: '🍎', skills: ['ma-count'], diff: 1 },
    { title: 'Count to 10', icon: '🐝', skills: ['ma-count'], diff: 2 },
    { title: 'Number Match', icon: '🔢', skills: ['ma-numrec'], diff: 1 },
    { title: 'More or Less', icon: '⚖️', skills: ['ma-compare'], diff: 1 },
    { title: 'Shape Hunt', icon: '🔺', skills: ['ma-shapes2d'], diff: 1 },
    { title: 'Adding Fun', icon: '➕', skills: ['ma-add10'], diff: 1 },
    { title: 'Take Away', icon: '➖', skills: ['ma-sub10'], diff: 1 },
    { title: 'Number Words', icon: '🔤', skills: ['ma-numrec', 'ma-compare'], diff: 2 },
    { title: 'Add to 10', icon: '🌴', skills: ['ma-add10'], diff: 2 },
    { title: 'What Comes Next', icon: '👣', skills: ['ma-missing'], diff: 1 },
    { title: 'Subtract to 10', icon: '🐒', skills: ['ma-sub10'], diff: 2 },
    { title: 'Line Them Up', icon: '📶', skills: ['ma-ordernum'], diff: 1 },
    { title: 'Skip Counting', icon: '🦘', skills: ['ma-skip'], diff: 1 },
    { title: 'Even and Odd', icon: '🧦', skills: ['ma-evenodd'], diff: 1 },
    { title: 'Add to 20', icon: '🦜', skills: ['ma-add20'], diff: 1 },
    { title: 'Subtract to 20', icon: '🐊', skills: ['ma-sub20'], diff: 2 },
    { title: 'Tens and Ones', icon: '🧱', skills: ['ma-place'], diff: 1 },
    { title: "O'Clock", icon: '🕒', skills: ['ma-time'], diff: 1 },
    { title: 'Coin Collector', icon: '🪙', skills: ['ma-coins'], diff: 1 },
    { title: 'Long and Short', icon: '📏', skills: ['ma-measure'], diff: 1 },
    { title: '3D Shapes', icon: '🎲', skills: ['ma-shapes3d'], diff: 1 },
    { title: 'Story Problems', icon: '📖', skills: ['ma-word'], diff: 2 },
    { title: 'Half Past', icon: '🕧', skills: ['ma-time'], diff: 2 },
    { title: 'Big Numbers', icon: '💯', skills: ['ma-compare100', 'ma-place'], diff: 2 },
    { title: 'Count by 2s and 5s', icon: '🐾', skills: ['ma-skip', 'ma-evenodd'], diff: 2 },
    { title: 'Add to 100', icon: '🚀', skills: ['ma-add100'], diff: 2 },
    { title: 'Subtract to 100', icon: '🌋', skills: ['ma-sub100'], diff: 2 },
    { title: 'Money Math', icon: '💰', skills: ['ma-coins'], diff: 3 },
    { title: 'Jungle Champion', icon: '🏆', skills: ['ma-missing', 'ma-word'], diff: 3 }
  ];

  /* ---------- helpers ---------- */
  function hashStr(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function mk(skill, d, type, text, say, hint, hintSay, extra) {
    var q = { skill: skill, d: d, type: type, text: text, say: say.map(String), hint: hint, hintSay: (hintSay || [hint]).map(String), gen: true };
    for (var k in extra) q[k] = extra[k];
    q.id = 'gen-' + skill + '-' + hashStr(text + '|' + (q.pic || '') + '|' + JSON.stringify(q.answer) + '|' + JSON.stringify(q.options || ''));
    return q;
  }
  /** k distinct numbers (as strings, shuffled) including ans, close to it, within [lo, hi]. */
  function numOpts(r, ans, k, lo, hi, step) {
    step = step || 1;
    var set = [ans], cand = [];
    for (var dlt = 1; dlt <= 4; dlt++) { cand.push(ans + dlt * step, ans - dlt * step); }
    cand = r.shuffle(cand.slice(0, 4)).concat(cand.slice(4));
    for (var i = 0; i < cand.length && set.length < k; i++) {
      var c = cand[i];
      if (c >= lo && c <= hi && set.indexOf(c) < 0) set.push(c);
    }
    for (var x = lo; set.length < k && x <= hi; x++) if (set.indexOf(x) < 0) set.push(x);
    return r.shuffle(set).map(String);
  }
  function distinct(r, k, lo, hi) {
    var out = [];
    while (out.length < k) { var v = r.int(lo, hi); if (out.indexOf(v) < 0) out.push(v); }
    return out;
  }
  function article(w) { return /^[aeiou]/.test(w) ? 'an ' : 'a '; }

  /* ---------- generators: gen[skill](d, r) → question ---------- */
  var gen = {
    'ma-count': function (d, r) {
      var n = d === 1 ? r.int(1, 5) : d === 2 ? r.int(4, 10) : r.int(7, 12);
      var o = r.pick(OBJ), t = 'How many ' + o.n + '?';
      return mk('ma-count', d, 'count', t, [t], S.tapCount, null,
        { pic: 'art:objs:' + o.e + ':' + n, options: numOpts(r, n, 3, 1, 12), answer: String(n) });
    },
    'ma-numrec': function (d, r) {
      if (d < 3) {
        var n = d === 1 ? r.int(1, 5) : r.int(3, 10);
        return mk('ma-numrec', d, 'choice', 'How many dots?', [S.howManyDots], S.countDots, null,
          { pic: 'art:frame:' + n, options: numOpts(r, n, d === 1 ? 3 : 4, 1, 10), answer: String(n) });
      }
      var m = r.int(1, 20);
      return mk('ma-numrec', d, 'choice', 'Find: ' + NUMWORDS[m], [S.findNumber, N(m)], S.numberWord, null,
        { options: numOpts(r, m, 4, 0, 20), answer: String(m) });
    },
    'ma-compare': function (d, r) {
      var more = r.chance(0.6);
      if (d === 1) {
        var ab = distinct(r, 2, 1, 6), o = r.pick(OBJ);
        var opts = ab.map(function (v) { return 'art:objs:' + o.e + ':' + v; });
        var ans = 'art:objs:' + o.e + ':' + (more ? Math.max.apply(null, ab) : Math.min.apply(null, ab));
        return mk('ma-compare', d, 'choice', more ? 'Which has more?' : 'Which has less?', [more ? S.whichMore : S.whichLess],
          more ? S.hintMore : S.hintLess, null, { options: opts, answer: ans });
      }
      var ns = distinct(r, d === 2 ? 2 : 3, 1, d === 2 ? 10 : 20);
      var a = more ? Math.max.apply(null, ns) : Math.min.apply(null, ns);
      return mk('ma-compare', d, 'choice', more ? 'Which number is bigger?' : 'Which number is smaller?',
        [more ? S.whichBigger : S.whichSmaller], more ? S.hintBigger : S.hintSmaller, null,
        { options: ns.map(String), answer: String(a) });
    },
    'ma-add10': function (d, r) {
      var max = d === 1 ? 5 : 10, a = r.int(1, max - 1), b = r.int(1, max - a), s = a + b, o = r.pick(OBJ);
      var extra = { answer: String(s) };
      if (d < 3) { extra.pic = 'art:add:' + o.e + ':' + a + ':' + b; extra.options = numOpts(r, s, 3, 0, 10); }
      return mk('ma-add10', d, d < 3 ? 'choice' : 'numpad', a + ' + ' + b + ' = ?', [S.whatIs, N(a), S.plus, N(b)],
        d < 3 ? S.countAll : 'Start at ' + a + '. Count up ' + b + ' more.', d < 3 ? null : [S.startAt, N(a), S.countUp, N(b), S.more], extra);
    },
    'ma-sub10': function (d, r) {
      var a = d === 1 ? r.int(2, 5) : r.int(4, 10), b = r.int(1, a - 1), s = a - b, o = r.pick(OBJ);
      var extra = { answer: String(s) };
      if (d < 3) { extra.pic = 'art:sub:' + o.e + ':' + a + ':' + b; extra.options = numOpts(r, s, 3, 0, 10); }
      return mk('ma-sub10', d, d < 3 ? 'choice' : 'numpad', a + ' − ' + b + ' = ?', [S.whatIs, N(a), S.takeAway, N(b)],
        d < 3 ? S.crossOut : 'Count back from ' + a + '.', d < 3 ? null : [S.countBackFrom, N(a)], extra);
    },
    'ma-add20': function (d, r) {
      var a, b;
      if (d === 1) { a = 10; b = r.int(1, 9); } else { a = r.int(3, 12); b = r.int(Math.max(2, 11 - a), Math.min(9, 20 - a)); }
      if (r.chance(0.3) && d > 1) { var t = a; a = b; b = t; }
      var s = a + b, extra = { answer: String(s) };
      if (d === 1) extra.pic = 'art:tens:1:' + b;
      if (d < 3) extra.options = numOpts(r, s, 3, 0, 20);
      return mk('ma-add20', d, d < 3 ? 'choice' : 'numpad', a + ' + ' + b + ' = ?', [S.whatIs, N(a), S.plus, N(b)],
        d === 1 ? S.makeTen : 'Start at ' + a + '. Count up ' + b + ' more.', d === 1 ? null : [S.startAt, N(a), S.countUp, N(b), S.more], extra);
    },
    'ma-sub20': function (d, r) {
      var a, b;
      if (d === 1) { b = r.int(1, 9); a = 10 + b; if (r.chance(0.5)) { b = r.int(1, a - 10); } }
      else { a = r.int(11, 20); b = r.int(2, 9); }
      var s = a - b, extra = { answer: String(s) };
      if (d < 3) extra.options = numOpts(r, s, 3, 0, 20);
      return mk('ma-sub20', d, d < 3 ? 'choice' : 'numpad', a + ' − ' + b + ' = ?', [S.whatIs, N(a), S.takeAway, N(b)],
        'Count back from ' + a + '.', [S.countBackFrom, N(a)], extra);
    },
    'ma-missing': function (d, r) {
      if (d === 1) {
        var s = r.int(1, 15);
        return mk('ma-missing', d, 'choice', s + ', ' + (s + 1) + ', ' + (s + 2) + ', ?', [S.whatNext], S.countByOne, null,
          { options: numOpts(r, s + 3, 3, 0, 20), answer: String(s + 3) });
      }
      if (d === 2) {
        var st = r.int(1, 30), pos = r.int(1, 3), seq = [st, st + 1, st + 2, st + 3];
        var ans = seq[pos], shown = seq.map(function (v, i) { return i === pos ? '?' : String(v); }).join(', ');
        return mk('ma-missing', d, 'choice', shown, [S.whatMissing], S.countByOne, null,
          { options: numOpts(r, ans, 3, 0, 40), answer: String(ans) });
      }
      var c = r.int(4, 10), a = r.int(1, c - 1), b = c - a;
      return mk('ma-missing', d, 'numpad', a + ' + ? = ' + c, [N(a), S.plusWhatMakes, N(c)],
        'Start at ' + a + '. Count up to ' + c + '.', [S.startAt, N(a), S.countUpTo, N(c)], { answer: String(b) });
    },
    'ma-skip': function (d, r) {
      var step = d === 1 ? 10 : d === 2 ? 5 : 2;
      var start = step * r.int(1, d === 1 ? 6 : d === 2 ? 10 : 12);
      var ans = start + step * 3;
      return mk('ma-skip', d, 'choice', start + ', ' + (start + step) + ', ' + (start + 2 * step) + ', ?',
        [d === 1 ? S.by10 : d === 2 ? S.by5 : S.by2], d === 1 ? S.hint10 : d === 2 ? S.hint5 : S.hint2, null,
        { options: numOpts(r, ans, 3, 0, 120, d === 1 ? 10 : step === 5 ? 5 : 1), answer: String(ans) });
    },
    'ma-place': function (d, r) {
      var t = r.int(d === 3 ? 2 : 1, d === 1 ? 5 : 9), o = r.int(0, 9);
      if (d === 1) {
        var askTens = r.chance(0.5);
        return mk('ma-place', d, 'choice', askTens ? 'How many tens?' : 'How many ones?', [askTens ? S.howManyTens : S.howManyOnes],
          S.hintTens, null, { pic: 'art:tens:' + t + ':' + o, options: numOpts(r, askTens ? t : o, 3, 0, 9), answer: String(askTens ? t : o) });
      }
      var v = t * 10 + o;
      if (d === 2) {
        var opts = [v];
        if (o !== t && o > 0) opts.push(o * 10 + t);
        numOpts(r, v, 4, 10, 99, 10).forEach(function (x) { x = +x; if (opts.length < 3 && opts.indexOf(x) < 0) opts.push(x); });
        numOpts(r, v, 4, 10, 99).forEach(function (x) { x = +x; if (opts.length < 3 && opts.indexOf(x) < 0) opts.push(x); });
        return mk('ma-place', d, 'choice', 'What number is this?', [S.whatNumber], S.hintTens, null,
          { pic: 'art:tens:' + t + ':' + o, options: r.shuffle(opts).map(String), answer: String(v) });
      }
      return mk('ma-place', d, 'numpad', t + ' tens and ' + o + ' ones', [N(t), S.tensAnd, N(o), S.ones, S.whatNumberIsIt],
        S.hintTens, null, { pic: 'art:tens:' + t + ':' + o, answer: String(v) });
    },
    'ma-evenodd': function (d, r) {
      if (d < 3) {
        var n = d === 1 ? r.int(2, 10) : r.int(1, 20), extra = { options: ['Even', 'Odd'], answer: n % 2 ? 'Odd' : 'Even' };
        if (d === 1) extra.pic = 'art:pairs:' + r.pick(OBJ).e + ':' + n;
        return mk('ma-evenodd', d, 'choice', 'Is ' + n + ' even or odd?', [S.is, N(n), S.evenOrOdd],
          d === 1 ? S.hintPairs : S.hintEven, null, extra);
      }
      var even = r.chance(0.5), nums = [];
      var target = r.int(5, 49) * 2 + (even ? 0 : 1);
      nums.push(target);
      while (nums.length < 3) { var x = r.int(5, 49) * 2 + (even ? 1 : 0); if (nums.indexOf(x) < 0) nums.push(x); }
      return mk('ma-evenodd', d, 'choice', even ? 'Which number is even?' : 'Which number is odd?', [even ? S.whichEven : S.whichOdd],
        S.hintEven, null, { options: r.shuffle(nums).map(String), answer: String(target) });
    },
    'ma-compare100': function (d, r) {
      if (d < 3) {
        var more = r.chance(0.6), ns = distinct(r, d === 1 ? 2 : 3, 10, 99);
        var a = more ? Math.max.apply(null, ns) : Math.min.apply(null, ns);
        return mk('ma-compare100', d, 'choice', more ? 'Which number is bigger?' : 'Which number is smaller?',
          [more ? S.whichBigger : S.whichSmaller], 'Look at the tens first.', null, { options: ns.map(String), answer: String(a) });
      }
      var x = r.int(10, 99), y = r.chance(0.15) ? x : r.int(10, 99);
      var sign = x > y ? '>' : x < y ? '<' : '=';
      return mk('ma-compare100', d, 'choice', x + ' ? ' + y, [S.pickSign, N(x), S.and, N(y)], S.hintSign, null,
        { options: ['>', '<', '='], answer: sign });
    },
    'ma-shapes2d': function (d, r) {
      if (d < 3) {
        var names = d === 1 ? ['circle', 'square', 'triangle', 'rectangle'] : Object.keys(SHAPES2D);
        var pick = r.shuffle(names).slice(0, 3), ans = pick[0];
        return mk('ma-shapes2d', d, 'choice', 'Which one is ' + article(ans) + ans + '?', [SHAPES2D[ans].ask], SHAPES2D[ans].hint, null,
          { options: r.shuffle(pick).map(function (k) { return 'art:shape:' + k; }), answer: 'art:shape:' + ans });
      }
      var sh = r.pick(['triangle', 'square', 'rectangle', 'pentagon', 'hexagon']), sides = SHAPES2D[sh].sides;
      return mk('ma-shapes2d', d, 'choice', 'How many sides?', [S.howManySides], S.hintSides, null,
        { pic: 'art:shape:' + sh, options: numOpts(r, sides, 3, 3, 8), answer: String(sides) });
    },
    'ma-shapes3d': function (d, r) {
      var names = Object.keys(SOLIDS);
      if (d === 1) {
        var pick = r.shuffle(names).slice(0, 3), ans = pick[0];
        return mk('ma-shapes3d', d, 'choice', 'Which one is a ' + ans + '?', [SOLIDS[ans].ask], SOLIDS[ans].hint, null,
          { options: r.shuffle(pick).map(function (k) { return 'art:solid:' + k; }), answer: 'art:solid:' + ans });
      }
      if (d === 2) {
        var withReal = names.filter(function (k) { return SOLIDS[k].real.length; });
        var a2 = r.pick(withReal), others = r.shuffle(names.filter(function (k) { return k !== a2; })).slice(0, 2);
        return mk('ma-shapes3d', d, 'choice', 'What shape is this?', [S.whatShape], SOLIDS[a2].hint, null,
          { pic: r.pick(SOLIDS[a2].real), options: r.shuffle([a2].concat(others)).map(function (k) { return SOLIDS[k].label; }), answer: SOLIDS[a2].label });
      }
      var f = r.pick(SOLID_FACTS), oth = r.shuffle(names.filter(function (k) { return k !== f.answer; })).slice(0, 2);
      return mk('ma-shapes3d', d, 'choice', f.text, [f.text], SOLIDS[f.answer].hint, null,
        { options: r.shuffle([f.answer].concat(oth)).map(function (k) { return 'art:solid:' + k; }), answer: 'art:solid:' + f.answer });
    },
    'ma-time': function (d, r) {
      var hs = distinct(r, 3, 1, 12);
      if (d === 1) {
        return mk('ma-time', d, 'choice', 'What time is it?', [S.whatTime], S.hintHour, null,
          { pic: 'art:clock:' + hs[0] + ':0', options: r.shuffle(hs).map(function (h) { return h + ':00'; }), answer: hs[0] + ':00' });
      }
      if (d === 2) {
        var h = hs[0], half = r.chance(0.7), next = h % 12 + 1;
        var opts = half ? [h + ':30', h + ':00', next + ':30'] : [h + ':00', h + ':30', hs[1] + ':00'];
        return mk('ma-time', d, 'choice', 'What time is it?', [S.whatTime], half ? S.hintHalf : S.hintHour, null,
          { pic: 'art:clock:' + h + ':' + (half ? 30 : 0), options: r.shuffle(opts), answer: opts[0] });
      }
      var m = r.chance(0.5) ? 30 : 0, specs = hs.map(function (x, i) { return 'art:clock:' + x + ':' + (i === 1 ? 30 - m : m); });
      return mk('ma-time', d, 'choice', 'Which clock shows ' + hs[0] + ':' + (m ? '30' : '00') + '?', [S.whichClock, N(hs[0]), m ? S.thirty : S.oclock],
        S.hintHour, null, { options: r.shuffle(specs), answer: specs[0] });
    },
    'ma-coins': function (d, r) {
      if (d === 1) {
        var pick = r.shuffle(COIN_NAMES).slice(0, 3), ans = pick[0];
        return mk('ma-coins', d, 'choice', 'Which coin is a ' + ans + '?', [COINS[ans].ask], COINS[ans].hint, null,
          { options: r.shuffle(pick).map(function (k) { return 'art:coin:' + k; }), answer: 'art:coin:' + ans });
      }
      if (d === 2) {
        var c = r.pick(COIN_NAMES), vals = r.shuffle(COIN_NAMES.filter(function (k) { return k !== c; })).slice(0, 2).concat([c]);
        return mk('ma-coins', d, 'choice', 'How much is it worth?', [S.howMuchCoin], 'A penny is 1 cent. A nickel is 5. A dime is 10. A quarter is 25.', null,
          { pic: 'art:coin:' + c, options: r.shuffle(vals).map(function (k) { return COINS[k].cents + '¢'; }), answer: COINS[c].cents + '¢' });
      }
      var k = r.int(2, 4), coins = [];
      for (var i = 0; i < k; i++) coins.push(r.pick(i === 0 ? ['quarter', 'dime', 'dime'] : ['dime', 'nickel', 'penny', 'penny']));
      coins.sort(function (x, y) { return COINS[y].cents - COINS[x].cents; });
      var tot = coins.reduce(function (s, x) { return s + COINS[x].cents; }, 0);
      return mk('ma-coins', d, 'choice', 'How many cents?', [S.howManyCents], S.hintCoins, null,
        { pic: 'art:coins:' + coins.join(','), options: numOpts(r, tot, 3, 1, 70, 5).map(function (v) { return v + '¢'; }), answer: tot + '¢' });
    },
    'ma-measure': function (d, r) {
      if (d < 3) {
        var k = d === 1 ? 2 : 3, lens = distinct(r, k, 2, 9), cols = r.shuffle(BAR_COLORS).slice(0, k), longer = r.chance(0.6);
        var target = longer ? Math.max.apply(null, lens) : Math.min.apply(null, lens);
        var opts = lens.map(function (l, i) { return 'art:bar:' + cols[i] + ':' + l; });
        var t = d === 1 ? (longer ? 'Which is longer?' : 'Which is shorter?') : (longer ? 'Which is the longest?' : 'Which is the shortest?');
        return mk('ma-measure', d, 'choice', t, [L(t)], S.hintEnds, null, { options: opts, answer: opts[lens.indexOf(target)] });
      }
      var n = r.int(2, 9);
      return mk('ma-measure', d, 'choice', 'How many cubes long?', [S.howManyCubes], S.hintCubes, null,
        { pic: 'art:ruler:' + n, options: numOpts(r, n, 3, 1, 10), answer: String(n) });
    },
    'ma-word': function (d, r) {
      var o = r.pick(OBJ), add = r.chance(0.5), max = d === 1 ? 5 : d === 2 ? 10 : 20, a, b, ans;
      if (add) { a = r.int(1, max - 1); b = r.int(1, Math.min(9, max - a)); ans = a + b; }
      else { a = r.int(2, max); b = r.int(1, Math.min(9, a - 1)); ans = a - b; }
      var text = add ? 'Salah has ' + a + ' ' + o.n + '. He gets ' + b + ' more. How many now?'
        : 'Salah has ' + a + ' ' + o.n + '. He gives away ' + b + '. How many are left?';
      var say = add ? [S.salahHas, N(a), o.n, S.heGets, N(b), S.more, S.howManyNow] : [S.salahHas, N(a), o.n, S.givesAway, N(b), S.howManyLeft];
      var extra = { answer: String(ans) };
      if (d === 1) extra.pic = 'art:' + (add ? 'add' : 'sub') + ':' + o.e + ':' + a + ':' + b;
      else extra.pic = o.e;
      if (d < 3) extra.options = numOpts(r, ans, 3, 0, 20);
      return mk('ma-word', d, d < 3 ? 'choice' : 'numpad', text, say, add ? S.hintAddStory : S.hintSubStory, null, extra);
    },
    'ma-add100': function (d, r) {
      var a, b;
      if (d === 1) { a = 10 * r.int(1, 5); b = 10 * r.int(1, 4); }
      else if (d === 2) { a = 10 * r.int(2, 8) + r.int(0, 5); b = r.int(1, 9 - (a % 10)); }
      else { var ta = r.int(1, 6), tb = r.int(1, 8 - ta), oa = r.int(0, 8), ob = r.int(0, 9 - oa); a = ta * 10 + oa; b = tb * 10 + ob; }
      var s = a + b, extra = { answer: String(s) };
      if (d === 1) extra.options = numOpts(r, s, 3, 10, 100, 10);
      return mk('ma-add100', d, d === 1 ? 'choice' : 'numpad', a + ' + ' + b + ' = ?', [S.whatIs, N(a), S.plus, N(b)], S.hintTensOnes, null, extra);
    },
    'ma-sub100': function (d, r) {
      var a, b;
      if (d === 1) { a = 10 * r.int(3, 9); b = 10 * r.int(1, a / 10 - 1); }
      else if (d === 2) { a = 10 * r.int(2, 9) + r.int(2, 9); b = r.int(1, a % 10); }
      else { var ta = r.int(3, 9), tb = r.int(1, ta - 1), oa = r.int(1, 9), ob = r.int(0, oa); a = ta * 10 + oa; b = tb * 10 + ob; }
      var s = a - b, extra = { answer: String(s) };
      if (d === 1) extra.options = numOpts(r, s, 3, 0, 90, 10);
      return mk('ma-sub100', d, d === 1 ? 'choice' : 'numpad', a + ' − ' + b + ' = ?', [S.whatIs, N(a), S.takeAway, N(b)], S.hintSubTensOnes, null, extra);
    },
    'ma-ordernum': function (d, r) {
      var k = d === 1 ? 3 : 4, ns = distinct(r, k, d === 3 ? 10 : 1, d === 1 ? 10 : d === 2 ? 20 : 99);
      var sorted = ns.slice().sort(function (x, y) { return x - y; }).map(String);
      var shown = r.shuffle(sorted);
      if (shown.join() === sorted.join()) { var t = shown[0]; shown[0] = shown[1]; shown[1] = t; }
      return mk('ma-ordernum', d, 'order', 'Tap from smallest to biggest.', [S.orderUp], S.hintOrder, null, { options: shown, answer: sorted });
    }
  };
  // register the generated per-shape/measure phrases
  ['Which is longer?', 'Which is shorter?', 'Which is the longest?', 'Which is the shortest?'].forEach(L);
  L('Look at the tens first.');
  for (var h0 = 1; h0 <= 12; h0++) { /* clock fragments are numbers + "thirty." / "o'clock." */ }

  function generate(skill, d, r) {
    var g = gen[skill];
    if (!g) throw new Error('no generator for ' + skill);
    return g(Math.max(1, Math.min(3, d | 0 || 1)), r);
  }

  function voiceLines() { return Object.keys(REG); }

  return {
    subject: 'math', title: 'Number Jungle', skills: skills, levels: levels, bank: [], generated: true,
    generate: generate, voiceLines: voiceLines, OBJ: OBJ, COINS: COINS, SHAPES2D: SHAPES2D, SOLIDS: SOLIDS
  };
});
