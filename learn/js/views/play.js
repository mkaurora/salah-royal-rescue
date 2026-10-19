/* Playing a level: question card for every type (choice, tf, count, numpad, build, order, match), gentle wrong
 * feedback, hints (2nd wrong or hintDelay), easier swap (swapDelay), streaks, and the win screen. */
(function () {
  'use strict';
  var SQ = window.SQ;
  var A = function () { return SQ.art; };

  function optHTML(o) {
    var sp = A().splitOption(o);
    var pic = sp.pic ? '<div class="opic">' + A().render(sp.pic) .replace('<span class="emoji-pic">', '<span>') + '</div>' : '';
    return pic + (sp.label ? '<div class="olabel">' + SQ.esc(sp.label) + '</div>' : '');
  }
  function shake(el) { if (!el) return; el.classList.remove('shake', 'wrong'); void el.offsetWidth; el.classList.add(el.classList.contains('opt') ? 'wrong' : 'shake'); }
  function shuffleStable(arr, seed) {
    var r = SQ.rng.rng(seed);
    return r.shuffle(arr);
  }

  SQ.go.play = function (subject, index) {
    var mod = SQ.subjects[subject], W = SQ.WORLD[subject];
    var settings = SQ.state.settings;
    var seed = SQ.SEED ? SQ.SEED + ':' + subject + ':' + index : Date.now() + ':' + Math.random();
    var run = new SQ.engine.LevelRun({ mod: mod, subject: subject, index: index, state: SQ.state, seed: seed });
    var prevUnlocked = SQ.state.unlocked[subject];

    var s = SQ.h('div', 'screen play bg-world w-' + subject);
    s.setAttribute('data-subject', subject);
    var top = SQ.h('div', 'topbar');
    var back = SQ.btn('✕', 'white round small quit-btn', function () { askQuit(); });
    var prog = SQ.h('div', 'progress', '<i></i><b></b>');
    var cd = SQ.h('div', 'countdown', '<svg viewBox="0 0 48 48"><circle class="bgc" cx="24" cy="24" r="20"/><circle class="fgc" cx="24" cy="24" r="20" stroke-dasharray="125.7" stroke-dashoffset="0"/></svg><b></b>');
    var gear = SQ.gear({ onOpen: function () { timer && timer.pause(); }, onClose: function () { timer && timer.resume(); } });
    top.appendChild(back); top.appendChild(prog); top.appendChild(cd); top.appendChild(gear);
    s.appendChild(top);

    var prow = SQ.h('div', 'prompt-row');
    var owl = SQ.mascot(prow, { size: 'sm' });
    var bubble = SQ.h('div', 'bubble prompt', '<span class="ptext"></span>');
    var speakBtn = SQ.h('button', 'speak-btn', '🔊');
    speakBtn.setAttribute('aria-label', 'Say it again');
    bubble.appendChild(speakBtn);
    prow.appendChild(bubble);
    s.appendChild(prow);
    var hintbox = SQ.h('div', 'hintbox', '<span class="bulb">💡</span><span class="htext"></span>');
    s.appendChild(hintbox);
    var qcard = SQ.h('div', 'qcard');
    s.appendChild(qcard);

    var q = null, wrongs = 0, hinted = false, solved = false, qStart = 0, typeHint = null, streak = 0, timer = null, alive = true;
    var dbg = SQ._play = { run: run, get q() { return q; }, get timer() { return timer; }, get hinted() { return hinted; } };

    function sayQuestion() {
      if (!q) return Promise.resolve();
      var p = SQ.speak(q.say || [q.text]);
      owl.talk(p);
      return p;
    }
    SQ.tap(speakBtn, function () { SQ.sound.play('tap'); sayQuestion(); });
    SQ.tap(bubble.querySelector('.ptext'), function () { sayQuestion(); });

    function updateProgress() {
      var pct = Math.round(100 * run.pos / run.count);
      prog.querySelector('i').style.width = pct + '%';
      prog.querySelector('b').textContent = Math.min(run.pos + 1, run.count) + ' / ' + run.count;
    }

    function startTimer() {
      if (timer) timer.stop();
      var cdSecs = settings.countdownOn ? settings.countdownSecs : 0;
      cd.classList.toggle('on', !!cdSecs);
      timer = new SQ.stuck.StuckTimer({
        hintDelay: settings.hintDelay, swapDelay: settings.swapDelay, countdown: cdSecs,
        onHint: function () { showHint('timer'); },
        onSwap: function () { doSwap(); },
        onTick: cdSecs ? function (rem) {
          cd.querySelector('b').textContent = rem;
          cd.querySelector('.fgc').setAttribute('stroke-dashoffset', (125.7 * (1 - rem / cdSecs)).toFixed(1));
        } : null
      });
      timer.start();
    }

    function render(question, how) {
      q = question;
      wrongs = 0; hinted = false; solved = false; typeHint = null;
      qStart = Date.now();
      hintbox.classList.remove('on');
      bubble.querySelector('.ptext').textContent = q.text;
      qcard.innerHTML = '';
      qcard.setAttribute('data-qid', q.id);
      qcard.setAttribute('data-type', q.type);
      qcard.setAttribute('data-skill', q.skill);
      qcard.classList.remove('swap-in', 'swap-out', 'nostage');
      if (how === 'swap') { void qcard.offsetWidth; qcard.classList.add('swap-in'); }
      var R = RENDER[q.type] || RENDER.choice;
      typeHint = R(q) || null;
      updateProgress();
      SQ.voice.prefetch((q.say || [q.text]).concat(q.hintSay || [q.hint]));
      startTimer();
      setTimeout(function () { if (alive && q === question) sayQuestion(); }, how === 'first' ? (SQ.FAST ? 0 : 500) : (SQ.FAST ? 0 : 250));
    }

    function stage(html, cls) {
      var st = SQ.h('div', 'stage ' + (cls || ''));
      if (html) st.innerHTML = html; else st.classList.add('empty');
      qcard.appendChild(st);
      return st;
    }
    function picStage() {
      var html = '';
      if (q.passage) html = '<div class="passage">' + SQ.esc(q.passage) + '</div>';
      else if (q.pic) html = A().render(q.pic, { tap: q.type === 'count' });
      else if (subject === 'math' && q.text.length <= 22 && /\d/.test(q.text)) html = '<div class="eqbig">' + SQ.esc(q.text) + '</div>';
      if (!html) qcard.classList.add('nostage');
      return stage(html);
    }

    /* ---------- feedback ---------- */
    function wrong(el) {
      if (solved) return;
      wrongs++;
      SQ.sound.play('oops');
      owl.set('oops', 900);
      shake(el);
      streak = 0;
      if (wrongs >= 2 && !hinted) showHint('wrong');
      else if (!hinted) SQ.speak(SQ.pick('try', SQ.LINES.tryAgain));
    }
    function showHint(reason) {
      if (hinted || solved || !q) return;
      hinted = true;
      if (timer) timer.markHinted();
      hintbox.querySelector('.htext').textContent = q.hint;
      hintbox.classList.add('on');
      hintbox.setAttribute('data-reason', reason);
      SQ.sound.play('hint');
      owl.set('think', 2500);
      owl.talk(SQ.speak([SQ.LINES.hint].concat(q.hintSay || [q.hint])));
      if (typeHint) try { typeHint(); } catch (e) {}
    }
    function doSwap() {
      if (solved || !alive) return;
      var old = q;
      var nq = run.swapEasier();
      SQ.sound.play('swap');
      SQ.toast(SQ.LINES.swap);
      owl.set('wave', 1200);
      SQ.speak(SQ.LINES.swap);
      qcard.classList.add('swap-out');
      setTimeout(function () {
        if (!alive) return;
        if (nq === old) { qcard.classList.remove('swap-out'); startTimer(); return; }
        render(nq, 'swap');
      }, SQ.FAST ? 30 : 380);
    }
    function correct(el) {
      if (solved) return;
      solved = true;
      if (timer) timer.stop();
      var first = wrongs === 0 && !q._swapped;
      SQ.sound.play('correct');
      SQ.fx.burst(el || qcard, 20, first ? 'gold' : 'dots');
      owl.set('cheer', 1300);
      var line;
      if (first) streak++; else streak = 0;
      if (first && streak > 0 && streak % 3 === 0) {
        line = SQ.pick('streak', SQ.LINES.streak);
        setTimeout(function () { SQ.sound.play('streak'); SQ.toast('🔥 ' + streak + ' in a row!', 'gold'); SQ.fx.burst(prog, 26, 'star'); }, 250);
      } else line = SQ.pick('praise', SQ.LINES.praise);
      var spoken = SQ.speak(line);
      SQ.save.recordAnswer(SQ.state, subject, q.skill, first, Date.now() - qStart);
      SQ.persist();
      var ms = Date.now() - qStart;
      Promise.all([SQ.wait(1100), Promise.race([spoken, SQ.wait(2600)])]).then(function () {
        if (!alive) return;
        var next = run.answer({ firstTry: first, wrongs: wrongs, ms: ms });
        if (!next) finish(); else render(next, 'next');
      });
    }
    function finish() {
      alive = false;
      if (timer) timer.stop();
      var sum = run.summary();
      SQ.save.recordLevel(SQ.state, subject, index, sum, mod.levels.length);
      SQ.persist();
      SQ.go.win(subject, index, sum, SQ.state.unlocked[subject] > prevUnlocked);
    }

    /* ---------- renderers ---------- */
    var RENDER = {};
    /* noStage: the caller (RENDER.count) already built the picture stage — building it again would show every
     * object twice (e.g. 3 apples rendered as 6 while the options are 2/3/4). */
    RENDER.choice = function (noStage) {
      if (noStage !== true) picStage();
      var ans = SQ.h('div', 'answers');
      var opts = q.options.map(function (o) { return { o: o, sp: A().splitOption(o) }; });
      var picOnly = opts.every(function (x) { return x.sp.pic && !x.sp.label; });
      var maxLen = Math.max.apply(null, opts.map(function (x) { return x.sp.label.length; }));
      var hasBar = opts.some(function (x) { return /^art:bar:/.test(x.o); });
      var cols = hasBar ? 1 : picOnly ? (opts.length === 4 ? 2 : opts.length) : opts.every(function (x) { return x.sp.pic; }) ? (opts.length === 4 ? 2 : opts.length) :
        maxLen <= 6 ? (opts.length === 4 ? 2 : opts.length) : maxLen <= 11 && opts.length !== 3 ? 2 : 1;
      if (q.type === 'tf') cols = 2;
      ans.style.setProperty('--cols', cols);
      if (cols === 3) ans.classList.add('cols3');
      if (maxLen > 14) ans.classList.add('long');
      if (qcard.classList.contains('nostage') && opts.every(function (x) { return x.sp.pic; })) ans.classList.add('fill');
      opts.forEach(function (x) {
        var b = SQ.h('button', 'opt' + (!x.sp.pic ? ' textonly' : ''));
        if (q.type === 'tf') {
          var yes = x.o === 'True';
          b.className = 'opt ' + (yes ? 'tf-true' : 'tf-false');
          b.innerHTML = '<div class="opic">' + (yes ? '✔' : '✘') + '</div><div class="olabel">' + (yes ? 'True' : 'False') + '</div>';
        } else b.innerHTML = optHTML(x.o);
        b.setAttribute('data-opt', x.o);
        SQ.tap(b, function () {
          if (solved) return;
          if (x.o === q.answer) { b.classList.add('right'); correct(b); }
          else { wrong(b); b.classList.add('faded'); }
        });
        ans.appendChild(b);
      });
      qcard.appendChild(ans);
      return function () {
        var left = [].slice.call(ans.querySelectorAll('.opt:not(.faded)')).filter(function (b) { return b.getAttribute('data-opt') !== q.answer; });
        if (left.length >= 2) left[0].classList.add('faded');
      };
    };
    RENDER.tf = RENDER.choice;
    RENDER.count = function () {
      var st = picStage();
      var n = 0;
      var objs = st.querySelector('.objs');
      [].forEach.call(st.querySelectorAll('.obj'), function (o) {
        SQ.tap(o, function () {
          if (o.classList.contains('counted') || solved) return;
          n++;
          o.classList.add('counted');
          o.setAttribute('data-n', n);
          SQ.sound.play('count');
          SQ.speak(String(n));
        });
      });
      var h = RENDER.choice(true);
      return function () { if (objs) objs.classList.add('hint-glow'); h(); };
    };
    RENDER.numpad = function () {
      if (q.pic) picStage();
      else stage('<div class="eqbig">' + SQ.esc(q.text) + '</div>');
      var disp = SQ.h('div', 'numdisplay empty', '?');
      qcard.appendChild(disp);
      var val = '';
      function show() { disp.textContent = val || '?'; disp.classList.toggle('empty', !val); }
      var pad = SQ.h('div', 'numpad');
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'].forEach(function (k) {
        var b = SQ.h('button', 'key' + (k === '✓' ? ' ok' : k === '⌫' ? ' del' : ''), k);
        b.setAttribute('data-key', k);
        SQ.tap(b, function () {
          if (solved) return;
          SQ.sound.play('tile');
          if (k === '⌫') val = val.slice(0, -1);
          else if (k === '✓') {
            if (!val) { shake(disp); return; }
            if (+val === +q.answer) { disp.classList.add('right'); correct(disp); return; }
            wrong(disp); val = '';
          } else if (val.length < 3) val = (val === '0' ? '' : val) + k;
          show();
        });
        pad.appendChild(b);
      });
      qcard.appendChild(pad);
      return function () { disp.textContent = String(q.answer).replace(/\d/g, '_ ').trim(); };
    };
    RENDER.build = function () {
      picStage();
      var word = String(q.answer), k = 0;
      var slots = SQ.h('div', 'slots');
      for (var i = 0; i < word.length; i++) slots.appendChild(SQ.h('div', 'slot'));
      qcard.appendChild(slots);
      var tiles = SQ.h('div', 'tiles');
      q.options.forEach(function (ch) {
        var t = SQ.h('button', 'tile', SQ.esc(ch));
        t.setAttribute('data-letter', ch);
        SQ.tap(t, function () {
          if (solved || t.classList.contains('used')) return;
          if (ch === word[k]) {
            SQ.sound.play('tile');
            t.classList.add('used');
            t.classList.remove('glow');
            var sl = slots.children[k];
            sl.textContent = ch; sl.classList.add('filled');
            k++;
            if (k === word.length) correct(slots);
            else if (hinted) glowNext();
          } else wrong(t);
        });
        tiles.appendChild(t);
      });
      qcard.appendChild(tiles);
      function glowNext() {
        var t = [].filter.call(tiles.children, function (x) { return !x.classList.contains('used') && x.getAttribute('data-letter') === word[k]; })[0];
        if (t) t.classList.add('glow');
      }
      return glowNext;
    };
    RENDER.order = function () {
      picStage();
      var done = SQ.h('div', 'order-done');
      qcard.appendChild(done);
      var items = SQ.h('div', 'order-items');
      var k = 0;
      q.options.forEach(function (it) {
        var b = SQ.h('button', 'opt textonly', optHTML(it));
        b.setAttribute('data-opt', it);
        SQ.tap(b, function () {
          if (solved) return;
          if (it === q.answer[k]) {
            SQ.sound.play('tile');
            b.style.visibility = 'hidden';
            done.appendChild(SQ.h('span', 'chip', SQ.esc((k + 1) + '. ' + it)));
            k++;
            if (k === q.answer.length) correct(done);
            else if (hinted) glowNext();
          } else wrong(b);
        });
        items.appendChild(b);
      });
      qcard.appendChild(items);
      function glowNext() {
        [].forEach.call(items.children, function (x) { x.classList.toggle('glow', x.getAttribute('data-opt') === q.answer[k]); });
      }
      return glowNext;
    };
    RENDER.match = function () {
      picStage();
      var box = SQ.h('div', 'match');
      var lefts = q.pairs.map(function (p) { return p[0]; });
      var rights = shuffleStable(q.pairs.map(function (p) { return p[1]; }), q.id);
      if (rights.join('|') === q.pairs.map(function (p) { return p[1]; }).join('|')) rights.push(rights.shift());
      var sel = null, made = 0;
      var L = [], Rt = [];
      function pairOf(side, v) { for (var i = 0; i < q.pairs.length; i++) if (q.pairs[i][side] === v) return i; return -1; }
      for (var i = 0; i < lefts.length; i++) {
        [['l', lefts[i]], ['r', rights[i]]].forEach(function (x) {
          var b = SQ.h('button', 'opt' + (A().splitOption(x[1]).pic ? '' : ' textonly'), optHTML(x[1]));
          b.setAttribute('data-side', x[0]);
          b.setAttribute('data-opt', x[1]);
          (x[0] === 'l' ? L : Rt).push(b);
          SQ.tap(b, function () {
            if (solved || b.classList.contains('paired')) return;
            if (!sel || sel.getAttribute('data-side') === x[0]) {
              if (sel) sel.classList.remove('sel');
              sel = b; b.classList.add('sel'); SQ.sound.play('tap');
              return;
            }
            var a = sel; sel = null; a.classList.remove('sel');
            var li = x[0] === 'l' ? pairOf(0, x[1]) : pairOf(0, a.getAttribute('data-opt'));
            var rv = x[0] === 'r' ? x[1] : a.getAttribute('data-opt');
            if (li >= 0 && q.pairs[li][1] === rv) {
              var cls = 'paired p' + (made % 4);
              cls.split(' ').forEach(function (c) { a.classList.add(c); b.classList.add(c); });
              a.classList.remove('glow'); b.classList.remove('glow');
              made++;
              SQ.sound.play('pop');
              if (made === q.pairs.length) correct(box);
              else if (hinted) glowNext();
            } else wrong(b);
          });
          box.appendChild(b);
        });
      }
      qcard.appendChild(box);
      function glowNext() {
        var l = L.filter(function (b) { return !b.classList.contains('paired'); })[0];
        if (!l) return;
        var want = q.pairs[pairOf(0, l.getAttribute('data-opt'))][1];
        l.classList.add('glow');
        Rt.forEach(function (b) { if (b.getAttribute('data-opt') === want) b.classList.add('glow'); });
      }
      return glowNext;
    };

    /* ---------- quit / pause ---------- */
    function askQuit() {
      if (timer) timer.pause();
      var c = SQ.h('div', 'card quit-card w-' + subject);
      c.innerHTML = '<div class="ribbon">Pause</div><div class="lvl-icon">⏸️</div>';
      var row = SQ.h('div', 'row');
      var ov;
      row.appendChild(SQ.btn('▶ Play', 'green resume-btn', function () { ov.close(); }));
      row.appendChild(SQ.btn('🗺️ Map', 'white map-btn', function () { ov.close(); alive = false; SQ.go.map(subject, index); }));
      c.appendChild(row);
      ov = SQ.overlay(c, { onClose: function () { if (alive && timer) timer.resume(); } });
      SQ.speak(SQ.LINES.paused);
    }

    var offVis = SQ.onVisibility(function (hidden) { if (!timer) return; if (hidden) timer.pause(); else timer.resume(); });
    s._cleanup = function () { alive = false; if (timer) timer.stop(); offVis(); SQ.stopSpeaking(); if (SQ._play === dbg) SQ._play = null; };
    s._enter = function () {
      var first = run.current();
      if (!first) { SQ.go.map(subject); return; }
      render(first, 'first');
    };
    SQ.voice.prefetch(SQ.LINES.praise.concat(SQ.LINES.tryAgain, [SQ.LINES.hint, SQ.LINES.swap]));
    SQ.show(s);
  };

  /* ---------- win screen ---------- */
  SQ.go.win = function (subject, index, sum, unlockedNew) {
    var mod = SQ.subjects[subject];
    var s = SQ.h('div', 'screen win bg-world w-' + subject);
    s.appendChild(SQ.h('div', 'win-rays'));
    var title = SQ.pick('win', SQ.LINES.win);
    s.appendChild(SQ.h('div', 'win-title', SQ.esc(title)));
    var stars = SQ.h('div', 'win-stars');
    for (var i = 0; i < 3; i++) {
      var w = SQ.h('div', 'wstar', '<div class="empty">' + SQ.starSVG(false) + '</div><div class="full">' + SQ.starSVG(true) + '</div>');
      stars.appendChild(w);
    }
    s.appendChild(stars);
    s.appendChild(SQ.h('div', 'win-sub', sum.firstTry + ' of ' + sum.total + ' right on the first try'));
    s.setAttribute('data-stars', sum.stars);
    var owlWrap = SQ.h('div', '');
    var owl = SQ.mascot(owlWrap, { size: 'lg' });
    s.appendChild(owlWrap);
    var row = SQ.h('div', 'row');
    var hasNext = index + 1 < mod.levels.length;
    if (hasNext) row.appendChild(SQ.btn('Next ▶', 'green next-btn', function () { SQ.go.play(subject, index + 1); }));
    row.appendChild(SQ.btn('🗺️', 'white round map-btn', function () { SQ.go.map(subject, hasNext ? index + 1 : index); }));
    row.appendChild(SQ.btn('↻', 'white round again-btn', function () { SQ.go.play(subject, index); }));
    s.appendChild(row);
    s._enter = function () {
      SQ.sound.play('success');
      SQ.fx.confetti();
      owl.set('cheer', 2600);
      [].forEach.call(stars.children, function (st, k) {
        if (k >= sum.stars) return;
        setTimeout(function () { st.classList.add('on'); SQ.sound.play('star'); setTimeout(function () { SQ.fx.burst(st, 16, 'star'); }, SQ.FAST ? 0 : 420); }, SQ.FAST ? 0 : 500 + k * 450);
      });
      var lines = [title, SQ.LINES.stars[Math.max(0, sum.stars - 1)]];
      if (!hasNext) lines.push(SQ.LINES.allDone);
      else if (unlockedNew) lines.push(SQ.LINES.newLevel);
      SQ.wait(700).then(function () { SQ.speak(lines); });
    };
    SQ.show(s);
  };
})();
