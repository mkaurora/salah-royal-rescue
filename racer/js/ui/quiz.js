/* Quiz gate screen: Salah's curriculum questions (RR.quiz) with big-button UIs for every type the adapter
 * produces — choice, tf, count (tap to count), numpad, order, build (spell), match. No timers, no voice: a wrong
 * answer gives a gentle shake and the question's own text hint, then he simply tries again; a right answer gives
 * coins (more on the first try) and happy feedback. Browser only: RR.quizUI.open(gate, handlers). */
(function (root) {
  'use strict';
  var RR = root.RR, ui = RR.ui, h = ui.h, Q = RR.quiz, ART = root.SQ.art;

  function pic(spec, opts) { return h('div.qpic', { html: ART.render(spec, opts) }); }
  function optFace(s) {
    var o = ART.splitOption(s);
    return (o.pic ? '<span class="opic">' + ART.render(o.pic) + '</span>' : '') + (o.label ? '<span>' + ART.esc(o.label) + '</span>' : '');
  }

  /** gate: { level, kind, questions }; on: { answer(q, firstTry) → coins, done(), back() } */
  function open(gate, on) {
    var qs = gate.questions, idx = 0, wrongs = 0, busy = false;
    var dots = h('div.qdots');
    qs.forEach(function () { dots.appendChild(h('i')); });
    var main = h('div.quiz-main');
    var title = gate.kind === 'big' ? 'Big quiz! Answer to open the road 🚧' : 'Quiz time! Answer to open the road 🚧';
    var scr = h('div.screen.quiz-scr',
      h('div.quiz-head',
        ui.btn('white round', '✕', function () { on.back && on.back(); }, { sound: 'back', label: 'Back' }),
        h('div.title', title), dots),
      main);

    function setDots() {
      for (var i = 0; i < dots.children.length; i++) dots.children[i].className = i < idx ? 'done' : i === idx ? 'on' : '';
    }

    function show() {
      setDots();
      wrongs = 0; busy = false;
      var q = qs[idx];
      main.innerHTML = '';
      main.style.animation = 'none'; void main.offsetWidth; main.style.animation = 'scrIn .35s both';
      var card = h('div.qcard', h('div.qtext', q.text));
      if (q.passage) card.appendChild(h('div.qpassage', q.passage));
      var hintBox = h('div.hint', { hidden: true }, h('span', '💡'), h('span', q.hint));
      var ans = h('div.answers');
      main.appendChild(card); main.appendChild(ans);
      var api = { q: q, card: card, ans: ans, wrong: wrong, right: right, hintBox: hintBox };
      (TYPES[q.type] || TYPES.choice)(api);
      card.appendChild(hintBox);
      scr._current = api;
    }

    function wrong(el) {
      if (busy) return;
      wrongs++;
      RR.audio.sfx('quizWrong');
      if (el) ui.shake(el);
      var hb = scr._current.hintBox;
      if (hb.hidden) { hb.hidden = false; }
      else { hb.style.animation = 'none'; void hb.offsetWidth; hb.style.animation = ''; }
    }

    function right() {
      if (busy || idx >= qs.length) return;
      busy = true;
      var q = qs[idx];
      RR.audio.sfx('quizRight');
      var coins = on.answer ? on.answer(q, wrongs === 0) : 0;
      var cheer = ['Great job!', 'Super!', 'You got it!', 'Awesome!', 'Yes! Well done!'][(idx + q.text.length) % 5];
      var happy = h('div.happy', cheer, h('small', '+' + coins + ' coins'));
      scr.appendChild(happy);
      main.style.pointerEvents = 'none';
      setTimeout(function () {
        if (happy.parentNode) happy.parentNode.removeChild(happy);
        main.style.pointerEvents = '';
        idx++;
        if (idx >= qs.length) {
          setDots();
          scr._current = null;
          main.innerHTML = '';
          main.appendChild(h('div.qcard', h('div', { style: { 'font-size': '64px' } }, '🏁'),
            h('div.qtext', 'All done! The road is open!'),
            ui.btn('green big', 'Let\'s drive! ▶', function () { on.done && on.done(); })));
          RR.audio.sfx('finish');
        } else show();
      }, 1150);
    }

    show();
    scr._answerForTest = function (correct) { return testAnswer(scr._current, correct); };
    return scr;
  }

  /* ------------------------------------------------------------------ per type */

  var TYPES = {
    choice: function (a) {
      var q = a.q;
      if (q.pic) a.card.appendChild(pic(q.pic, { tap: q.type === 'count' }));
      if (q.type === 'count') tapCount(a.card);
      var n = q.options.length;
      a.ans.className = 'answers' + (n === 4 ? ' cols2' : n === 2 && q.type === 'tf' ? ' cols2' : n >= 3 && allShort(q.options) ? ' cols' + Math.min(3, n) : '');
      q.options.forEach(function (o) {
        var b = h('button.opt', { html: optFace(o), type: 'button' });
        if (q.type === 'tf') b.classList.add(o === 'True' ? 'tf-true' : 'tf-false');
        if (q.type === 'tf') b.innerHTML = o === 'True' ? '<span class="opic">👍</span><span>True</span>' : '<span class="opic">👎</span><span>False</span>';
        b.addEventListener('click', function () {
          if (Q.check(q, o)) { b.classList.add('right'); a.right(); } else { b.classList.add('wrong'); a.wrong(b); setTimeout(function () { b.classList.remove('wrong'); }, 600); }
        });
        b._value = o;
        a.ans.appendChild(b);
      });
    },
    numpad: function (a) {
      var q = a.q, val = '';
      if (q.pic) a.card.appendChild(pic(q.pic));
      var show = h('div.numshow', '?');
      var pad = h('div.numpad');
      a.ans.appendChild(h('div.row', show));
      a.ans.appendChild(pad);
      function upd() { show.textContent = val || '?'; }
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'].forEach(function (k) {
        pad.appendChild(h('button.opt', { type: 'button', onclick: function () {
          RR.audio.sfx('tap');
          if (k === '⌫') val = val.slice(0, -1); else if (val.length < 3) val += k;
          upd();
        } }, k));
      });
      var ok = h('button.opt.ok', { type: 'button', onclick: function () {
        if (!val) return a.wrong(show);
        if (Q.check(q, val)) { show.style.background = '#a6ffb8'; a.right(); } else { a.wrong(show); val = ''; upd(); }
      } }, 'OK ✓');
      pad.appendChild(ok);
      a.submit = function (v) { val = v; ok.click(); };
    },
    order: function (a) { seqTiles(a, a.q.options, a.q.answer, function (k, v) { return Q.checkStep(a.q, k, v); }); },
    build: function (a) {
      if (a.q.pic) a.card.appendChild(pic(a.q.pic));
      seqTiles(a, a.q.options, a.q.answer.split(''), function (k, v) { return Q.checkStep(a.q, k, v); });
    },
    match: function (a) {
      var q = a.q, sel = null, done = 0;
      var L = h('div.col'), R = h('div.col');
      a.ans.appendChild(h('div.match', L, R));
      q.pairs.forEach(function (p) {
        var b = h('button.opt', { html: optFace(p[0]), type: 'button' });
        b._value = p[0]; b._side = 'L';
        b.addEventListener('click', function () {
          if (sel) sel.classList.remove('sel');
          sel = b; b.classList.add('sel'); RR.audio.sfx('tap');
        });
        L.appendChild(b);
      });
      q.rights.forEach(function (r) {
        var b = h('button.opt', { html: optFace(r), type: 'button' });
        b._value = r; b._side = 'R';
        b.addEventListener('click', function () {
          if (!sel) { ui.shake(L); return; }
          if (Q.checkPair(q, sel._value, r)) {
            sel.classList.remove('sel'); sel.classList.add('matched'); b.classList.add('matched'); sel = null; done++;
            RR.audio.sfx('coin', { n: done });
            if (done === q.pairs.length) a.right();
          } else { a.wrong(b); sel.classList.remove('sel'); sel = null; }
        });
        R.appendChild(b);
      });
    }
  };
  TYPES.tf = TYPES.choice;
  TYPES.count = TYPES.choice;

  function allShort(opts) { return opts.every(function (o) { return String(o).length <= 6; }); }

  function tapCount(card) {
    var objs = card.querySelector('.objs.tappable');
    if (!objs) return;
    var n = 0;
    objs.addEventListener('click', function (e) {
      var o = e.target.closest('.obj');
      if (!o || o.classList.contains('counted')) return;
      n++; o.classList.add('counted'); o.setAttribute('data-n', n);
      RR.audio.sfx('coin', { n: n });
    });
  }

  /** Tap tiles in the right order (order / build): each right tap fills the next slot. */
  function seqTiles(a, options, answer, ok) {
    var k = 0;
    var slots = h('div.slots');
    answer.forEach(function () { slots.appendChild(h('i', '')); });
    a.card.appendChild(slots);
    a.ans.className = 'answers' + (options.length >= 4 ? ' cols2' : '');
    if (options.length > 4 && allShort(options)) a.ans.className = 'answers cols3';
    options.forEach(function (o) {
      var b = h('button.opt', { html: optFace(o), type: 'button' });
      b._value = o;
      b.addEventListener('click', function () {
        if (ok(k, o)) {
          var s = slots.children[k];
          s.innerHTML = optFace(o); s.classList.add('fill');
          k++;
          RR.audio.sfx('coin', { n: k });
          // a letter used once can not be used again (extra letters stay)
          b.classList.add('used');
          if (k >= answer.length) a.right();
        } else { a.wrong(b); }
      });
      a.ans.appendChild(b);
    });
  }

  /** Test hook: answer the current question right (true) or wrong (false). */
  function testAnswer(a, correct) {
    if (!a) return false;
    var q = a.q, btns = Array.prototype.slice.call(a.ans.querySelectorAll('button.opt'));
    function byVal(v, side) { return btns.filter(function (b) { return b._value === v && (!side || b._side === side) && !b.classList.contains('used') && !b.classList.contains('matched'); })[0]; }
    if (!correct) {
      if (q.type === 'numpad') { a.submit(String((+q.answer + 1) % 1000)); return true; }
      if (q.type === 'match') { btns[0].click(); var wr = btns.filter(function (b) { return b._side === 'R' && !Q.checkPair(q, btns[0]._value, b._value); })[0]; if (wr) wr.click(); return true; }
      var good = q.type === 'order' ? q.answer[0] : q.type === 'build' ? q.answer.charAt(0) : q.answer;
      var w = btns.filter(function (b) { return b._value !== undefined && b._value !== good; })[0];
      if (w) w.click();
      return true;
    }
    switch (q.type) {
      case 'numpad': a.submit(q.answer); break;
      case 'order': q.answer.forEach(function (v) { var b = byVal(v); if (b) b.click(); }); break;
      case 'build': q.answer.split('').forEach(function (v) { var b = byVal(v); if (b) b.click(); }); break;
      case 'match': q.pairs.forEach(function (p) { var l = byVal(p[0], 'L'); if (l) l.click(); var r = byVal(p[1], 'R'); if (r) r.click(); }); break;
      default: var b = byVal(q.answer); if (b) b.click();
    }
    return true;
  }

  RR.quizUI = { open: open };
})(window);
