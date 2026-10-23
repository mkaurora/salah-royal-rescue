/* Math: seeded question generators (19 skills, tiers 1-6). generate(skill, tier, r) → question; the same seed always
 * gives the same question, so ids are reproducible: 'm-<skill>-<tier>-<seed>'. Tier = island number (difficulty). UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('rng', '../../logic/rng.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.curriculumMath = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  var SKILLS = {
    'm-count': 'Counting', 'm-addsub': 'Add and take away', 'm-compare': 'Bigger and smaller', 'm-missing': 'Missing numbers',
    'm-skip': 'Skip counting', 'm-place': 'Place value', 'm-evenodd': 'Even and odd', 'm-double': 'Doubles and halves',
    'm-time': 'Telling time', 'm-mult': 'Times tables', 'm-div': 'Sharing and dividing', 'm-frac': 'Fractions',
    'm-measure': 'Measuring', 'm-round': 'Rounding', 'm-word': 'Word problems', 'm-area': 'Perimeter and area',
    'm-pattern': 'Number patterns', 'm-shape': 'Shapes', 'm-order': 'Order of operations'
  };
  // min / max tier each skill appears in (it then keeps appearing, getting harder inside its own generator)
  var RANGE = {
    'm-count': [1, 2], 'm-addsub': [1, 6], 'm-compare': [1, 4], 'm-missing': [1, 5], 'm-skip': [1, 4], 'm-place': [2, 5],
    'm-evenodd': [1, 3], 'm-double': [2, 4], 'm-time': [2, 6], 'm-mult': [3, 6], 'm-div': [4, 6], 'm-frac': [4, 6],
    'm-measure': [4, 6], 'm-round': [5, 6], 'm-word': [1, 6], 'm-area': [5, 6], 'm-pattern': [4, 6], 'm-shape': [1, 4], 'm-order': [6, 6]
  };
  var NAMES = ['Pip', 'Nori', 'Tuki', 'Ziggy', 'Digby', 'Waddle', 'Puff', 'Geo'];
  var THINGS = [['shell', 'shells'], ['gem', 'gems'], ['seed', 'seeds'], ['fish', 'fish'], ['berry', 'berries'], ['leaf', 'leaves'], ['stone', 'stones'], ['star', 'stars']];

  function int(r, a, b) { return RNG.int(r, a, b); }
  function pick(r, a) { return RNG.pick(r, a); }
  function S(n) { return String(n); }

  /** numeric options: the answer + 3 distinct plausible wrong numbers (never negative), shuffled */
  function numOpts(r, ans, deltas) {
    var d = deltas || (ans <= 20 ? [1, -1, 2, -2, 3, -3] : ans <= 100 ? [1, -1, 2, -2, 10, -10, 5, -5] : [1, -1, 10, -10, 100, -100, 2, -2]);
    var cands = RNG.shuffle(r, d.map(function (x) { return ans + x; })).filter(function (x) { return x >= 0 && x !== ans; });
    var set = [];
    cands.forEach(function (x) { if (set.indexOf(x) < 0 && set.length < 3) set.push(x); });
    for (var k = 1; set.length < 3; k++) { var x = ans + 10 * k + 1; if (set.indexOf(x) < 0) set.push(x); }
    return RNG.shuffle(r, [ans].concat(set).map(S));
  }
  function strOpts(r, ans, wrong) { return RNG.shuffle(r, [ans].concat(wrong)); }

  var G = {};

  G['m-count'] = function (t, r) {
    var n = t === 1 ? int(r, 3, 10) : int(r, 8, 20), e = pick(r, ['🍎', '⭐', '🐟', '🐚', '🌴', '🦀', '🍌', '🦆']);
    var pic = ''; for (var i = 0; i < n; i++) pic += e;
    return { text: 'How many are there?', pic: pic, answer: n, hint: 'Touch each one and count. Do not skip any!', deltas: [1, -1, 2, -2, 3] };
  };

  G['m-addsub'] = function (t, r) {
    var a, b, plus = r() < 0.55, hint;
    if (t === 1) {
      if (r() < 0.6) { a = int(r, 1, 9); b = int(r, 1, 10 - a + (r() < 0.4 ? 8 : 0)); if (!plus) { var sw = a + b; a = sw; } } else { a = int(r, 6, 18); b = int(r, 1, Math.min(a, 9)); plus = false; }
      hint = 'Count on with your fingers, or draw dots.';
    } else if (t === 2) {
      if (plus) { a = int(r, 11, 60); b = int(r, 5, 39); if (r() < 0.5) b = b - (b % 10) + (r() < 0.5 ? 0 : (9 - a % 10) % 10); } else { a = int(r, 30, 99); b = int(r, 5, a - 5); }
      hint = 'Do the tens and the ones separately.';
    } else if (t === 3) {
      if (plus) { a = int(r, 100, 650); b = int(r, 50, 340); } else { a = int(r, 300, 999); b = int(r, 40, a - 60); }
      hint = 'Add or take away the hundreds, then the tens, then the ones.';
    } else if (t === 4) {
      if (plus) { a = int(r, 250, 799); b = int(r, 199, 999 - a + 199); } else { a = int(r, 500, 999); b = int(r, 123, a - 11); }
      hint = 'Line up the digits. Watch out for carrying and borrowing.';
    } else if (t === 5) {
      if (plus) { a = int(r, 1200, 6500); b = int(r, 999, 3400); } else { a = int(r, 3000, 9999); b = int(r, 1111, a - 100); }
      hint = 'Work from the ones column to the thousands. Carry or borrow when you need to.';
    } else {
      if (plus) { a = int(r, 2500, 8800); b = int(r, 1500, 9999 - a + 1500); } else { a = int(r, 4000, 9999); b = int(r, 1234, a - 321); }
      hint = 'Estimate first, then work out each column carefully.';
    }
    var ans = plus ? a + b : a - b;
    var d = t <= 1 ? [1, -1, 2, -2, 3] : t === 2 ? [1, -1, 10, -10, 2, -2] : [1, -1, 10, -10, 100, -100];
    return { text: a + (plus ? ' + ' : ' − ') + b + ' = ?', answer: ans, hint: hint, deltas: d };
  };

  G['m-compare'] = function (t, r) {
    var hi = t === 1 ? 20 : t === 2 ? 99 : t === 3 ? 999 : 9999, lo = t === 1 ? 1 : t === 2 ? 10 : t === 3 ? 100 : 1000;
    var set = []; while (set.length < 3) { var x = int(r, lo, hi); if (set.indexOf(x) < 0 && set.every(function (y) { return Math.abs(y - x) > (t > 2 ? 9 : 0); })) set.push(x); }
    var big = r() < 0.5, ans = big ? Math.max.apply(null, set) : Math.min.apply(null, set);
    return { text: big ? 'Which number is the biggest?' : 'Which number is the smallest?', answer: ans, options: set.map(S), hint: big ? 'Compare the digits from the left. The bigger place value wins.' : 'Look at the leftmost digit first. Smaller digits mean a smaller number.' };
  };

  G['m-missing'] = function (t, r) {
    var a, b, c, text;
    if (t === 1) { a = int(r, 1, 9); b = int(r, 1, 10 - (a > 5 ? a - 5 : 0)); c = a + b; text = r() < 0.5 ? a + ' + ? = ' + c : '? + ' + b + ' = ' + c; return { text: text, answer: text.charAt(0) === '?' ? a : b, hint: 'Count up from the small number to the total.' }; }
    if (t === 2) { a = int(r, 10, 60); b = int(r, 5, 35); c = a + b; return { text: a + ' + ? = ' + c, answer: b, hint: 'Take away: ' + c + ' − ' + a + ' will give the answer.' }; }
    if (t === 3) { a = int(r, 120, 700); b = int(r, 25, 280); c = a + b; return { text: '? + ' + b + ' = ' + c, answer: a, hint: 'Use the opposite: subtract ' + b + ' from ' + c + '.' }; }
    if (t === 4) { a = int(r, 2, 9); b = int(r, 2, 9); return { text: a + ' × ? = ' + (a * b), answer: b, hint: 'Think of the times table: how many ' + a + 's make ' + (a * b) + '?' }; }
    a = int(r, 3, 12); b = int(r, 3, 12); return { text: '? × ' + b + ' = ' + (a * b), answer: a, hint: 'Divide ' + (a * b) + ' by ' + b + ' to find the missing number.' };
  };

  G['m-skip'] = function (t, r) {
    var steps = t === 1 ? [2, 5, 10] : t === 2 ? [2, 3, 4, 5, 10] : t === 3 ? [3, 4, 6, 25, 50] : [6, 7, 8, 9, 11, 12];
    var s = pick(r, steps), start = t >= 3 && r() < 0.5 ? s * int(r, 1, 4) : (t === 1 ? 0 : s * int(r, 0, 2));
    var seq = []; for (var i = 0; i < 4; i++) seq.push(start + s * i);
    var ans = start + s * 4;
    return { text: 'What comes next?  ' + seq.join(', ') + ', ?', answer: ans, hint: 'Look at the jump between two numbers. It is the same each time.', deltas: [s, -s, 1, -1, 2 * s, 10] };
  };

  G['m-place'] = function (t, r) {
    var n, q;
    if (t === 2) {
      n = int(r, 11, 99);
      if (r() < 0.5) return { text: 'How many tens are in ' + n + '?', answer: Math.floor(n / 10), hint: 'The first digit of a two-digit number shows the tens.' };
      var tens = Math.floor(n / 10), ones = n % 10;
      return { text: tens + ' tens and ' + ones + ' ones make…', answer: n, hint: 'Write the tens digit first, then the ones digit.', deltas: [10, -10, 1, -1, ones - tens, 9] };
    }
    if (t === 3) {
      n = int(r, 101, 999); var d = [Math.floor(n / 100), Math.floor(n / 10) % 10, n % 10], k = int(r, 0, 2), place = ['hundreds', 'tens', 'ones'][k];
      if (r() < 0.5) return { text: 'Which digit is in the ' + place.replace(/s$/, '') + 's place of ' + n + '?', answer: d[k], hint: 'The digits go: hundreds, tens, ones, from left to right.' };
      var val = d[k] * [100, 10, 1][k];
      return { text: 'What is the value of the ' + d[k] + ' in ' + n + '?', answer: val, hint: 'Which place is it in? Multiply the digit by that place.', deltas: [val * 10, Math.max(1, val / 10), 1, 100] };
    }
    if (t === 4) {
      n = int(r, 1001, 9999); var dd = [Math.floor(n / 1000), Math.floor(n / 100) % 10, Math.floor(n / 10) % 10, n % 10], kk = int(r, 0, 3);
      var v2 = dd[kk] * [1000, 100, 10, 1][kk];
      return { text: 'What is the value of the ' + dd[kk] + ' in ' + n + '?', answer: v2, hint: 'Thousands, hundreds, tens, ones. Find the place first.', deltas: [v2 * 10, Math.max(1, v2 / 10), 1, 100, 1000] };
    }
    n = int(r, 1001, 9998); var p = pick(r, [10, 100, 1000]);
    return r() < 0.5 ? { text: 'What is ' + p + ' more than ' + n + '?', answer: n + p, hint: 'Only one digit changes. Which place is ' + p + ' in?', deltas: [10, -10, 100, -100, 1000, p * 10] }
      : { text: 'What is ' + p + ' less than ' + n + '?', answer: n - p, hint: 'Only one digit changes. Which place is ' + p + ' in?', deltas: [10, -10, 100, -100, 1000, p * 10] };
  };

  G['m-evenodd'] = function (t, r) {
    var n = t === 1 ? int(r, 1, 20) : t === 2 ? int(r, 10, 99) : int(r, 100, 999), ans = n % 2 ? 'Odd' : 'Even';
    if (t === 3 && r() < 0.5) {
      var a = int(r, 11, 99), b = int(r, 11, 99), sum = a + b;
      return { text: 'Is ' + a + ' + ' + b + ' even or odd?', answer: sum % 2 ? 'Odd' : 'Even', options: ['Even', 'Odd'], hint: 'Look at the last digit of the answer. Even numbers end in 0, 2, 4, 6 or 8.' };
    }
    return { text: 'Is ' + n + ' even or odd?', answer: ans, options: ['Even', 'Odd'], hint: 'Even numbers end in 0, 2, 4, 6 or 8. Odd numbers end in 1, 3, 5, 7 or 9.' };
  };

  G['m-double'] = function (t, r) {
    var mx = t === 2 ? 20 : t === 3 ? 60 : 250, n = int(r, 3, mx);
    if (r() < 0.5) return { text: 'Double ' + n + ' = ?', answer: n * 2, hint: 'Doubling means adding the number to itself.' };
    return { text: 'Half of ' + (n * 2) + ' = ?', answer: n, hint: 'Share ' + (n * 2) + ' into two equal groups.' };
  };

  var TIMEWORD = { 0: "o'clock", 15: 'quarter past', 30: 'half past', 45: 'quarter to' };
  function clock(h, m) { return h + ':' + (m < 10 ? '0' + m : m); }
  G['m-time'] = function (t, r) {
    var h = int(r, 1, 12);
    if (t === 2) {
      var half = r() < 0.5, ans = clock(h, half ? 30 : 0);
      var wrong = [clock(h, half ? 0 : 30), clock(h % 12 + 1, half ? 30 : 0), clock(h, 15)].filter(function (x) { return x !== ans; });
      return { text: (half ? 'Half past ' : '') + h + (half ? '' : " o'clock") + ' is written as…', answer: ans, options: strOpts(r, ans, wrong.slice(0, 3)), hint: half ? 'Half past means 30 minutes past the hour.' : "O'clock means exactly on the hour, with 00 minutes." };
    }
    if (t === 3) {
      var m = pick(r, [15, 45]), ans3 = clock(h, m), nxt = h % 12 + 1;
      var text3 = m === 15 ? 'Quarter past ' + h : 'Quarter to ' + nxt;
      var w3 = [clock(h, m === 15 ? 45 : 15), clock(h, 30), clock(nxt, 15)].filter(function (x) { return x !== ans3; });
      return { text: text3 + ' is written as…', answer: ans3, options: strOpts(r, ans3, w3.slice(0, 3)), hint: 'A quarter is 15 minutes. "To" means before the next hour.' };
    }
    if (t === 4) {
      var add = pick(r, [10, 20, 25, 35, 40]), mm = int(r, 0, 1) * 5, tot = h * 60 + mm + add, hh = Math.floor(tot / 60) % 12 || 12, ans4 = clock(hh, tot % 60);
      return { text: 'What time is ' + add + ' minutes after ' + clock(h, mm) + '?', answer: ans4, options: strOpts(r, ans4, [clock(hh, (tot + 10) % 60), clock(hh, (tot + 50) % 60), clock(h % 12 + 1, tot % 60)].filter(function (x) { return x !== ans4; }).slice(0, 3)), hint: 'Count on the minutes. If you pass 60, move to the next hour.' };
    }
    var s = int(r, 1, 8) * 5 + 60 * int(r, 0, t === 5 ? 1 : 2), st = h * 60 + int(r, 0, 5) * 5, en = st + s + (t === 6 ? 15 : 0);
    var dur = en - st;
    return { text: 'A show starts at ' + clock(h, st % 60) + ' and ends at ' + clock(Math.floor(en / 60) % 12 || 12, en % 60) + '. How many minutes long is it?', answer: dur, hint: 'Count the whole hours first (60 minutes each), then the extra minutes.', deltas: [5, -5, 10, -10, 15, 60] };
  };

  G['m-mult'] = function (t, r) {
    var a, b;
    if (t === 3) {
      a = int(r, 2, 6); b = pick(r, [2, 5, 10]);
      var th = pick(r, THINGS);
      return { text: a + ' groups of ' + b + ' ' + th[1] + '. How many in all?', answer: a * b, hint: 'Add ' + b + ' again and again, ' + a + ' times.', deltas: [b, -b, 1, -1, 10] };
    }
    if (t === 4) { a = int(r, 2, 5); b = int(r, 2, 10); }
    else if (t === 5) { a = int(r, 6, 10); b = int(r, 3, 12); }
    else { a = int(r, 12, 49); b = int(r, 3, 9); return { text: a + ' × ' + b + ' = ?', answer: a * b, hint: 'Split ' + a + ' into tens and ones, multiply each, then add.', deltas: [10, -10, b, -b, 20, 1] }; }
    if (r() < 0.5) { var tmp = a; a = b; b = tmp; }
    return { text: a + ' × ' + b + ' = ?', answer: a * b, hint: 'Skip count by ' + Math.min(a, b) + ' (or think of a times table you know).', deltas: [Math.min(a, b), -Math.min(a, b), 1, -1, 10, -10] };
  };

  G['m-div'] = function (t, r) {
    var b, q;
    if (t === 4) { b = int(r, 2, 5); q = int(r, 2, 10); var th = pick(r, THINGS); return r() < 0.5 ? { text: (b * q) + ' ÷ ' + b + ' = ?', answer: q, hint: 'How many ' + b + 's fit into ' + (b * q) + '? Use your times table.', deltas: [1, -1, 2, -2, b] } : { text: 'Share ' + (b * q) + ' ' + th[1] + ' equally between ' + b + ' friends. How many each?', answer: q, hint: 'Dividing is sharing equally.', deltas: [1, -1, 2, -2, b] }; }
    if (t === 5) { b = int(r, 3, 10); q = int(r, 3, 12); return { text: (b * q) + ' ÷ ' + b + ' = ?', answer: q, hint: 'Think: ' + b + ' times what makes ' + (b * q) + '?', deltas: [1, -1, 2, -2, b] }; }
    b = int(r, 3, 9); q = int(r, 12, 30);
    return { text: (b * q) + ' ÷ ' + b + ' = ?', answer: q, hint: 'Split ' + (b * q) + ' into easy parts you can divide, then add the answers.', deltas: [1, -1, 10, -10, 2] };
  };

  G['m-frac'] = function (t, r) {
    if (t === 4) {
      var q = r() < 0.5, n = q ? int(r, 2, 12) * 4 : int(r, 2, 25) * 2;
      return { text: 'What is ' + (q ? 'a quarter' : 'half') + ' of ' + n + '?', answer: n / (q ? 4 : 2), hint: q ? 'A quarter is half of a half. Halve twice.' : 'Share ' + n + ' into 2 equal groups.', deltas: [1, -1, 2, -2, 4] };
    }
    if (t === 5) {
      var pairs = [['1/2', '1/4', '1/2'], ['1/3', '1/2', '1/2'], ['1/4', '1/8', '1/4'], ['1/3', '1/6', '1/3'], ['2/4', '1/4', '2/4'], ['1/5', '1/10', '1/5'], ['3/4', '1/4', '3/4'], ['1/2', '1/3', '1/2']];
      var p = pick(r, pairs);
      return { text: 'Which fraction is bigger: ' + p[0] + ' or ' + p[1] + '?', answer: p[2], options: [p[0], p[1]], hint: 'The bigger the bottom number, the smaller each piece is (when the top is 1).' };
    }
    var den = pick(r, [3, 4, 5, 10]), num = int(r, 1, den - 1), unit = int(r, 2, 9), whole = den * unit;
    return { text: 'What is ' + num + '/' + den + ' of ' + whole + '?', answer: num * unit, hint: 'Divide ' + whole + ' by ' + den + ' first, then multiply by ' + num + '.', deltas: [unit, -unit, 1, -1, 2 * unit] };
  };

  G['m-measure'] = function (t, r) {
    if (t === 4) {
      var m = int(r, 2, 9);
      return r() < 0.5 ? { text: 'A rope is ' + m + ' metres long. How many centimetres is that?', answer: m * 100, hint: '1 metre = 100 centimetres.', deltas: [m * 10, 100, -100, 1000] }
        : { text: m + '00 cm is how many metres?', answer: m, hint: '100 cm make 1 metre.', deltas: [1, -1, 10, 2] };
    }
    if (t === 5) {
      var k = int(r, 2, 8);
      return r() < 0.5 ? { text: k + ' kg is how many grams?', answer: k * 1000, hint: '1 kilogram = 1000 grams.', deltas: [100, -1000, 1000, 10000] }
        : { text: k + ' litres is how many millilitres?', answer: k * 1000, hint: '1 litre = 1000 millilitres.', deltas: [100, -1000, 1000, 10000] };
    }
    var a = int(r, 3, 15), b = int(r, 2, 10);
    return { text: 'A tile is ' + a + ' cm long and ' + b + ' cm wide. How far is it around the edge of the tile?', answer: 2 * (a + b), hint: 'Add all four sides: two lengths and two widths.', deltas: [a, b, -2, 2, 10] };
  };

  G['m-round'] = function (t, r) {
    if (t === 5) { var n = int(r, 11, 998); if (n % 10 === 5) n++; return { text: 'Round ' + n + ' to the nearest 10.', answer: Math.round(n / 10) * 10, hint: 'Look at the ones digit. 5 or more: go up. Less than 5: go down.', deltas: [10, -10, 100, 1] }; }
    var m = int(r, 101, 9998); if (m % 100 === 50) m += 3;
    return { text: 'Round ' + m + ' to the nearest 100.', answer: Math.round(m / 100) * 100, hint: 'Look at the tens digit to decide: 5 or more means go up.', deltas: [100, -100, 10, 1000] };
  };

  G['m-word'] = function (t, r) {
    var nm = pick(r, NAMES), th = pick(r, THINGS), a, b, c;
    if (t === 1) {
      a = int(r, 3, 12); b = int(r, 2, 8);
      return r() < 0.5 ? { text: nm + ' has ' + a + ' ' + th[1] + ' and finds ' + b + ' more. How many now?', answer: a + b, hint: 'Finding more means adding.' }
        : { text: nm + ' has ' + (a + b) + ' ' + th[1] + ' and gives away ' + b + '. How many are left?', answer: a, hint: 'Giving away means taking away.' };
    }
    if (t === 2) {
      a = int(r, 25, 70); b = int(r, 12, 28);
      return r() < 0.5 ? { text: nm + ' collects ' + a + ' ' + th[1] + ' in the morning and ' + b + ' in the afternoon. How many in all?', answer: a + b, hint: 'In all means add.' }
        : { text: nm + ' has ' + (a + b) + ' ' + th[1] + '. ' + b + ' roll into the sea. How many are left?', answer: a, hint: 'Left over means take away.' };
    }
    if (t === 3) {
      a = int(r, 3, 6); b = pick(r, [2, 5, 10]);
      if (r() < 0.5) return { text: nm + ' puts ' + b + ' ' + th[1] + ' in each of ' + a + ' baskets. How many ' + th[1] + ' in total?', answer: a * b, hint: 'Equal groups: multiply the groups by the number in each.' };
      a = int(r, 120, 480); b = int(r, 60, 300);
      return { text: nm + ' has ' + a + ' ' + th[1] + '. A friend gives ' + b + ' more. How many now?', answer: a + b, hint: 'Add the hundreds, tens and ones.' };
    }
    if (t === 4) {
      a = int(r, 3, 6); b = int(r, 4, 9);
      if (r() < 0.5) return { text: 'There are ' + a + ' boxes with ' + b + ' ' + th[1] + ' in each. How many ' + th[1] + ' altogether?', answer: a * b, hint: a + ' groups of ' + b + ' means ' + a + ' × ' + b + '.' };
      return { text: nm + ' shares ' + (a * b) + ' ' + th[1] + ' equally between ' + a + ' baskets. How many in each basket?', answer: b, hint: 'Sharing equally means dividing.' };
    }
    if (t === 5) {
      a = int(r, 3, 6); b = int(r, 6, 9); c = int(r, 3, 15);
      return { text: nm + ' has ' + a + ' bags with ' + b + ' ' + th[1] + ' in each. Then ' + nm + ' gives away ' + c + '. How many are left?', answer: a * b - c, hint: 'Two steps: multiply first, then take away.', deltas: [c, -c, 1, -1, 10] };
    }
    a = int(r, 3, 6); b = int(r, 8, 15); c = int(r, 2, 5); var d = int(r, 6, 12);
    return { text: nm + ' buys ' + a + ' packs of ' + b + ' ' + th[1] + ' and ' + c + ' packs of ' + d + ' ' + th[1] + '. How many ' + th[1] + ' in total?', answer: a * b + c * d, hint: 'Work out each part with multiplication, then add them together.', deltas: [a, -a, c, d, 10, -10] };
  };

  G['m-area'] = function (t, r) {
    var a = int(r, 3, t === 5 ? 12 : 9), b = int(r, 2, t === 5 ? 9 : 8);
    if (t === 5) return { text: 'A garden is ' + a + ' m long and ' + b + ' m wide. How far is it around the garden?', answer: 2 * (a + b), hint: 'The distance around is the perimeter: add all four sides.', deltas: [a, b, 2, -2, a * b] };
    return r() < 0.7 ? { text: 'A rug is ' + a + ' m long and ' + b + ' m wide. What is its area in square metres?', answer: a * b, hint: 'Area of a rectangle = length × width.', deltas: [a, b, 2 * (a + b), 1, -1] }
      : { text: 'A square patch has sides of ' + a + ' m. What is its area in square metres?', answer: a * a, hint: 'Area of a square = side × side.', deltas: [a, 2 * a, 4 * a, 1, -1] };
  };

  G['m-pattern'] = function (t, r) {
    var start = int(r, 2, 20), s = int(r, 2, 9);
    if (t === 4) {
      var add = r() < 0.5, seq = [0, 1, 2, 3].map(function (i) { return add ? start + s * i : start + 40 - s * i; });
      var rule = add ? 'Add ' + s : 'Take away ' + s, wrong = ['Add ' + (s + 1), 'Take away ' + (s + 1), add ? 'Take away ' + s : 'Add ' + s, 'Add ' + (s + 2)].filter(function (x) { return x !== rule; });
      return { text: 'What is the rule?  ' + seq.join(', ') + ', …', answer: rule, options: strOpts(r, rule, wrong.slice(0, 3)), hint: 'Subtract the first number from the second. Is it the same each time?' };
    }
    if (t === 5) {
      var m = pick(r, [2, 3]), st = int(r, 1, 4), seq5 = [0, 1, 2, 3].map(function (i) { return st * Math.pow(m, i); });
      return { text: 'What comes next?  ' + seq5.join(', ') + ', ?', answer: st * Math.pow(m, 4), hint: 'Each number is the one before it times ' + m + '.', deltas: [m, -m, 10, st, 1, -1] };
    }
    var a = int(r, 2, 6), b = int(r, 1, 3), x = int(r, 2, 9), seq6 = [x]; for (var i = 1; i < 5; i++) seq6.push(seq6[i - 1] + (i % 2 ? a : -b));
    return { text: 'What comes next?  ' + seq6.join(', ') + ', ?', answer: seq6[4] + (5 % 2 ? a : -b), hint: 'The pattern uses two steps in turn: add ' + a + ', then take away ' + b + '. Keep switching.', deltas: [1, -1, a, b, 2] };
  };

  var SHAPES = [['triangle', 3, 3], ['square', 4, 4], ['rectangle', 4, 4], ['pentagon', 5, 5], ['hexagon', 6, 6]];
  G['m-shape'] = function (t, r) {
    var sh = t === 1 ? pick(r, SHAPES.slice(0, 3)) : pick(r, SHAPES);
    var v = r();
    if (t >= 3 && v < 0.35) { var s = pick(r, [['cube', 'faces', 6], ['cube', 'corners', 8], ['cube', 'edges', 12]]); return { text: 'How many ' + s[1] + ' does a ' + s[0] + ' have?', answer: s[2], hint: 'Picture a toy building block and count the ' + s[1] + '.' }; }
    return v < 0.65 ? { text: 'How many sides does a ' + sh[0] + ' have?', answer: sh[1], hint: 'Draw the shape and touch each side as you count.' }
      : { text: 'How many corners does a ' + sh[0] + ' have?', answer: sh[2], hint: 'A corner is where two sides meet. Count them one by one.' };
  };

  G['m-order'] = function (t, r) {
    var a = int(r, 2, 9), b = int(r, 2, 6), c = int(r, 2, 6);
    if (r() < 0.5) return { text: a + ' + ' + b + ' × ' + c + ' = ?', answer: a + b * c, hint: 'Multiplication comes before addition.', deltas: [b, c, (a + b) * c - (a + b * c), 1, -1] };
    return { text: '(' + a + ' + ' + b + ') × ' + c + ' = ?', answer: (a + b) * c, hint: 'Brackets first, then multiply.', deltas: [a, c, b, 1, -1, 10] };
  };

  function skillsFor(tier) { return Object.keys(RANGE).filter(function (s) { return RANGE[s][0] <= tier && tier <= RANGE[s][1]; }); }

  /** skill, tier (1-6), r = rng → question {id?, text, options[], answer, hint, skill, tier, subject:'math', pic?} */
  function generate(skill, tier, r, seed) {
    var rg = RANGE[skill];
    var t = Math.max(rg[0], Math.min(rg[1], tier));
    var q = G[skill](t, r);
    var options = q.options || numOpts(r, q.answer, q.deltas);
    var out = { subject: 'math', skill: skill, tier: tier, type: 'choice', text: q.text, answer: S(q.answer), options: options.map(S), hint: q.hint };
    if (q.pic) out.pic = q.pic;
    if (seed != null) { out.seed = seed; out.id = skill + '-' + tier + '-' + seed; }
    return out;
  }
  /** Regenerate by id (deterministic). */
  function fromId(id) {
    return null;
  }
  /** a question for the tier, using a seed number */
  function make(tier, seed, skill) {
    var r = RNG.make(seed * 7919 + tier * 104729);
    var list = skillsFor(tier);
    var sk = skill || list[Math.floor(r() * list.length)];
    // regenerate with a dedicated stream so fromId(id) gives the same question
    return generate(sk, tier, RNG.make('q' + sk + ':' + tier + ':' + seed), seed);
  }
  function fromIdStable(id) {
    var p = /^(m-[a-z]+)-(\d)-(\d+)$/.exec(id);
    return p && G[p[1]] ? make(+p[2], +p[3], p[1]) : null;
  }

  return { SKILLS: SKILLS, RANGE: RANGE, skillsFor: skillsFor, generate: generate, make: make, fromId: fromIdStable, _fromIdRaw: fromId };
});
