/* Level 2 (v4): the gold menu card, the Level 2 hub (three tracks, Bronze → Silver → Gold path), the stage launcher
 * (every stage is played by the normal level controller LE.app.playLevel: Read-then-Go, Show me, hints, stars, resume)
 * and the Science Lab lesson player (3–5 illustrated cards, read aloud, one "try it" card).
 * Rules: js/logic/level2.js. Data: js/data/level2-stages.js. Save: store.getLevel2(). */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var h = LE.h;

  // Level 2 views are not worlds: give them names for the level controller (and the helper's "world").
  LE.extraWorlds = LE.extraWorlds || {};
  LE.extraWorlds.frame = { id: 'frame', name: 'Engineer Challenges', sub: 'Level 2' };
  LE.extraWorlds.code = { id: 'code', name: 'Thinking Puzzles', sub: 'Level 2' };
  LE.extraWorlds.lab = { id: 'lab', name: 'Science Lab', sub: 'Level 2' };

  var MEDAL = ['🥉', '🥈', '🥇'];
  var ui = { track: 'a' };
  function D() { return LE.level2.data; }
  function L2() { return LE.logic.level2; }
  function store() { return LE.app.store; }
  function l2() { return store().getLevel2(); }
  function save() { store().save(); }
  function LINES() { return LE.LINES.l2; }
  function track(id) { return D().tracks.filter(function (t) { return t.id === id; })[0] || D().tracks[0]; }
  function counts() { var c = {}; D().tracks.forEach(function (t) { c[t.id] = t.stages.length; }); return c; }
  function totalStars() { return D().tracks.reduce(function (s, t) { return s + L2().summary(l2(), t.id, t.stages).stars; }, 0); }
  function maxStars() { return D().tracks.reduce(function (s, t) { return s + t.stages.length * 3; }, 0); }

  /* ---------- menu card ---------- */
  function menuCard() {
    var card = LE.button('world-card w-level2', '', function () { show(null); }, { label: 'Level 2' });
    card.dataset.world = 'level2';
    card.append(
      h('div.l2-ribbon', 'LEVEL 2 ⭐'),
      h('div.world-icon', { html: icon() }),
      h('div.world-name', 'Level 2'),
      h('div.world-stars', { html: LE.starSVG(true) + '<span>' + totalStars() + ' / ' + maxStars() + '</span>' }));
    return card;
  }
  function icon() {
    return '<svg viewBox="0 0 120 90"><rect x="8" y="8" width="104" height="74" rx="10" fill="#1f5fae" stroke="#0d3a73" stroke-width="3"/>' +
      '<g stroke="rgba(255,255,255,.22)" stroke-width="1.5"><path d="M8 28h104M8 48h104M8 68h104M28 8v74M48 8v74M68 8v74M88 8v74"/></g>' +
      '<g stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none"><path d="M24 70 V40 H58 V70 M24 40 L41 22 L58 40 M24 70 L58 40"/></g>' +
      LE.gearPath(86, 56, 16, 9, '#ffc83d', '#a86f00', 'spin') +
      '<path d="M84 14 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1z" fill="#ffe14d" stroke="#b38f00" stroke-width="2.5"/></svg>';
  }

  /* ---------- hub ---------- */
  function show(trackId, opts) {
    opts = opts || {};
    if (trackId) ui.track = trackId;
    var T = track(ui.track), st = store(), L = l2();
    st.setLast({ screen: 'l2', track: T.id });
    var el = h('div.l2-screen');
    var stars = fiveTap(h('span.topbar-stars', { html: LE.starSVG(true) + totalStars() + '/' + maxStars() }));
    var bar = LE.app.topbar(h('span.lvl-title', h('span', 'Level 2 ⭐'), stars), function () { LE.app.showMenu(); });
    var buddyBar = h('div.buddy-bar');
    var tabs = h('div.l2-tabs');
    D().tracks.forEach(function (t) {
      var s = L2().summary(L, t.id, t.stages);
      var b = LE.button('l2-tab t-' + t.id + (t.id === T.id ? ' on' : ''), '', function () { if (t.id !== T.id) show(t.id); }, { label: t.name });
      b.dataset.track = t.id;
      b.append(h('div.l2-tab-ico', t.icon), h('div.l2-tab-name', t.short), h('div.l2-tab-stars', { html: LE.starSVG(true) + s.stars + '/' + s.max }));
      tabs.appendChild(b);
    });
    var body = h('div.l2-body.scroll-y');
    var sum = L2().summary(L, T.id, T.stages);
    body.appendChild(h('div.l2-track-head', h('div.l2-track-title', T.icon + ' ' + T.name), h('div.l2-track-sub', T.sub + ' · ' + sum.done + '/' + sum.count + ' done')));
    var next = L2().nextStage(L, T.id, T.stages);
    for (var t = 0; t < L2().tierCount(T.stages); t++) body.appendChild(tierRow(T, t, next, buddy));
    if (T.id === 'c') {
      var lessons = h('div.l2-lessons', h('div.l2-lessons-title', '📖 Lessons'));
      Object.keys(D().lessons).forEach(function (k) {
        var ls = D().lessons[k];
        lessons.appendChild(LE.button('white l2-lesson-btn' + (L.lessons[k] ? ' seen' : ''), ls.icon + ' ' + ls.title, function () { openLesson(k, function () { show('c'); }); }, { label: ls.title + ' lesson' }));
      });
      body.appendChild(lessons);
    }
    var startBtn = LE.button('green big l2-start', (sum.done ? '▶ Continue' : '▶ Start') + ' · ' + T.stages[next].name, function () { openStage(T.id, next); }, { sound: 'whoosh' });
    el.append(bar, buddyBar, tabs, body, h('div.l2-foot', startBtn));
    LE.app.showScreen({ el: el, destroy: function () { buddy.destroy(); } });
    var buddy = new LE.Buddy(buddyBar);
    buddy.onTap = function () { buddy.say(LINES().hello); };
    var cur = body.querySelector('.l2-node.current');
    if (cur) setTimeout(function () { var r = cur.getBoundingClientRect(), br = body.getBoundingClientRect(); if (r.bottom > br.bottom) body.scrollTop += r.bottom - br.bottom + 16; }, 50);
    LE.voice.prefetch([LINES().hello, LINES().locked, LINES().mastery]);
    setTimeout(function () {
      if (opts.tierOpen) { LE.fx.confetti(); buddy.say(LINES().tierOpen); }
      else buddy.say(LINES().hello, { time: 3500 });
    }, 300);
    // nodes need the buddy for locked messages
    el.querySelectorAll('.l2-node').forEach(function (n) { n._buddy = buddy; });
  }
  function fiveTap(elm) { return LE.fiveTaps ? LE.fiveTaps(elm) : elm; }

  function tierRow(T, t, next, buddy) {
    var L = l2(), stages = L2().tierStages(T.stages, t);
    var open = L2().isTierOpen(L, T.id, T.stages, t);
    var row = h('div.l2-tier.tier-' + t + (open ? '' : '.locked'));
    var m = t > 0 ? L2().mastery(L, T.stages, t - 1) : null;
    var label = h('div.l2-tier-head', h('span.l2-medal', MEDAL[t] || '🏅'), h('span.l2-tier-name', L2().tierName(t)),
      !open && m ? h('span.l2-tier-lock', '🔒 Get 3 stars on ' + m.need + ' ' + noun(T.id, m.need) + ' to open ' + L2().tierName(t) + '! (' + m.three + '/' + m.need + ')') : null);
    var nodes = h('div.l2-nodes');
    stages.forEach(function (s, k) {
      var i = t * L2().TIER_SIZE + k;
      var isOpen = L2().isStageOpen(L, T.id, T.stages, i), stars = L2().getStars(L, s.id), bonus = L2().getStars(L, s.id + 'x');
      var node = LE.button('l2-node' + (isOpen ? '' : ' locked') + (stars ? ' done' : '') + (i === next && isOpen ? ' current' : ''), '', function () {
        if (!isOpen) {
          LE.shake(node); LE.sound.play('buzz');
          var why = L2().lockReason(L, T.id, T.stages, i);
          if (node._buddy) node._buddy.say(why === 'mastery' ? LINES().mastery : LINES().locked);
          return;
        }
        openStage(T.id, i);
      }, { label: 'Stage ' + (i + 1), sound: isOpen ? 'tap' : false });
      node.dataset.stage = s.id;
      [h('div.l2-node-num', isOpen ? String(i + 1) : '🔒'), h('div.l2-node-name', s.name), isOpen ? LE.starsRow(stars, 3, 'l2-node-stars') : null,
        bonus ? h('div.l2-node-bonus', '⭐ bonus') : null, s.timeLimit && isOpen ? h('div.l2-node-timer', '⏱') : null].forEach(function (c) { if (c) node.appendChild(c); });
      nodes.appendChild(node);
    });
    row.append(label, nodes);
    return row;
  }
  function noun(trackId, n) {
    var w = trackId === 'a' ? 'build' : trackId === 'b' ? 'puzzle' : 'lab';
    return w + (n === 1 ? '' : 's');
  }

  /* ---------- stages ---------- */
  function stageLevel(stage, variant) {
    var lv = JSON.parse(JSON.stringify(stage));
    if (variant === 'easy' && stage.easy) { Object.assign(lv, JSON.parse(JSON.stringify(stage.easy))); delete lv.tutorial; delete lv.timeLimit; lv.name = stage.name + ' (easy)'; }
    if (variant === 'bonus' && stage.bonus) { Object.assign(lv, JSON.parse(JSON.stringify(stage.bonus))); delete lv.tutorial; lv.name = stage.name + ' ⭐'; lv.id = stage.id + 'x'; }
    delete lv.easy; delete lv.bonus;
    return lv;
  }
  LE.level2StageLevel = stageLevel;

  /** Open stage i of a track. opts: { fresh, variant: null | 'easy' | 'bonus', noLesson } */
  function openStage(trackId, i, opts) {
    opts = opts || {};
    var T = track(trackId), stage = T.stages[i], L = l2();
    if (!stage) { show(trackId); return; }
    if (!L2().isStageOpen(L, T.id, T.stages, i)) { show(trackId); return; }
    // Science Lab: the topic's lesson plays before its first stage (once; the hub can replay it).
    if (stage.topic && !opts.noLesson && !L.lessons[stage.topic] && firstOfTopic(T, i)) {
      openLesson(stage.topic, function () { openStage(trackId, i, Object.assign({}, opts, { noLesson: true })); });
      return;
    }
    var variant = opts.variant || null;
    var level = stageLevel(stage, variant);
    var recId = variant === 'bonus' ? stage.id + 'x' : stage.id;
    var key = 'l2-' + recId + (variant === 'easy' ? 'e' : '');
    var tier = L2().tierOf(i);
    var timer = { limit: level.timeLimit && L.timers ? level.timeLimit : 0, start: 0, used: 0, hiddenAt: 0, chip: null, int: 0, said: false };
    var t0 = Date.now();
    var spec = {
      worldId: stage.view, index: i, level: level, num: MEDAL[tier] + (i + 1), cls: 'l2-level',
      best: L2().getStars(L, recId), factIndex: i, group: 'l2:' + stage.id,
      content: { tips: D().tips, facts: D().facts[T.id] },
      saved: opts.fresh ? null : store().getInProgress(key, 0),
      saveState: function (st) { store().setInProgress(key, 0, st); },
      setLast: function () { store().setLast({ screen: 'l2-stage', track: T.id, stage: i, variant: variant }); },
      back: function () { show(T.id); },
      replay: function () { openStage(T.id, i, { fresh: true, variant: variant }); },
      attempts0: variant ? 0 : (L.fails[stage.id] || 0),
      showMeAt: L2().SHOWME_AT,
      help: function (attempts) { return L2().helpFor(attempts, !!stage.easy && !variant); },
      onFail: function () { if (!variant) { L2().addFail(L, stage.id); save(); } },
      easier: function () { LE.app.toast('🪜 ' + LINES().easyOn); openStage(T.id, i, { fresh: true, variant: 'easy' }); },
      decorate: function (d) { decorate(d, timer, level, variant); },
      adjustWin: function (r) {
        var used = timerUsed(timer);
        var s = L2().finalStars(r.stars, { timersOn: L.timers, limitSec: timer.limit, usedSec: used, easy: variant === 'easy' });
        var note = r.note;
        if (variant === 'easy') note = 'Easier version: up to 2 stars. Try the real one for 3!';
        else if (s < r.stars && timer.limit) note = 'Beat the timer for the 3rd star!';
        stopTimer(timer);
        return { stars: s, note: note };
      },
      record: function (stars) {
        var before = L2().isTierOpen(L, T.id, T.stages, tier + 1);
        L2().record(L, recId, stars);
        store().clearInProgress(key, 0);
        var opened = !before && tier + 1 < L2().tierCount(T.stages) && L2().isTierOpen(L, T.id, T.stages, tier + 1);
        save();
        var nextOpen = i + 1 < T.stages.length && L2().isStageOpen(L, T.id, T.stages, i + 1);
        var last = i + 1 >= T.stages.length;
        store().setLast(nextOpen ? { screen: 'l2-stage', track: T.id, stage: i + 1 } : { screen: 'l2', track: T.id });
        var res = {
          hasNext: nextOpen,
          title: last && !variant ? 'Track complete!' : opened ? L2().tierName(tier + 1) + ' is open!' : null,
          nextLabel: nextOpen ? 'Next ▶' : '🗺️ Level 2',
          next: function () { if (nextOpen) openStage(T.id, i + 1); else show(T.id, { tierOpen: opened }); },
          map: nextOpen ? { label: '🗺️ Level 2', go: function () { show(T.id, { tierOpen: opened }); } } : null
        };
        if (!variant && L2().offerBonus(stage, stars, Date.now() - t0)) {
          res.bonus = { label: '⭐ Try the bonus!', say: LINES().bonus, go: function () { openStage(T.id, i, { fresh: true, variant: 'bonus' }); } };
        }
        return res;
      }
    };
    LE.app.playLevel(spec);
    if (variant === 'easy') LE.speak(LINES().easyOn);
  }
  function firstOfTopic(T, i) { return !T.stages.slice(0, i).some(function (s) { return s.topic === T.stages[i].topic; }); }

  /* Relaxed timer: a chip in the top bar; only the 3rd star depends on it; it never fails a stage. */
  function decorate(d, timer, level, variant) {
    // Test / Run starts: put away a left-over speech bubble so it never covers the board while it runs (not during Show me / helper).
    d.on('run', function () { var a = LE.activeLevel; if (a && !(a.demo && a.demo()) && !(a.ai && a.ai())) d.buddy.hide(); });
    if (!timer.limit || variant === 'easy') return;
    var chip = timer.chip = h('div.l2-timer', '⏱ ' + fmt(timer.limit));
    var mid = d.bar.querySelector('.topbar-title');
    if (mid) mid.appendChild(chip);
    function start() { if (!timer.start) { timer.start = Date.now(); tick(); } }
    function tick() {
      clearInterval(timer.int);
      timer.int = setInterval(function () {
        if (!document.body.contains(chip)) { stopTimer(timer); return; }
        if (d.ctx.isDemo && d.ctx.isDemo()) return;
        var left = Math.max(0, timer.limit - timerUsed(timer));
        chip.textContent = '⏱ ' + fmt(Math.ceil(left));
        chip.classList.toggle('low', left <= 30 && left > 0);
        chip.classList.toggle('out', left <= 0);
        if (left <= 0 && !timer.said) { timer.said = true; d.buddy.say(LINES().timeUp, { time: 3000 }); }
      }, 500);
    }
    function onVis() { if (!timer.start) return; if (document.hidden) timer.hiddenAt = Date.now(); else if (timer.hiddenAt) { timer.start += Date.now() - timer.hiddenAt; timer.hiddenAt = 0; } }
    document.addEventListener('visibilitychange', onVis);
    timer.offVis = function () { document.removeEventListener('visibilitychange', onVis); };
    // starts when he taps Go on the "Ready?" card (or right away when there is no card)
    d.on('ready', start);
    ['place', 'add', 'set', 'move', 'run', 'len', 'surface', 'height'].forEach(function (ev) { d.on(ev, start); });
    if (!LE.READ_GO) start();
  }
  function timerUsed(timer) { if (!timer.start) return 0; return ((timer.hiddenAt || Date.now()) - timer.start) / 1000; }
  function stopTimer(timer) { clearInterval(timer.int); if (timer.offVis) timer.offVis(); }
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2); }

  /* ---------- lessons ---------- */
  function openLesson(topic, done) {
    var ls = D().lessons[topic];
    if (!ls) { if (done) done(); return; }
    var k = 0, widget = null;
    var cardEl = h('div.l2-lesson');
    function render() {
      if (widget && widget.destroy) widget.destroy();
      widget = null;
      var c = ls.cards[k];
      cardEl.innerHTML = '';
      var dots = h('div.l2-dots');
      ls.cards.forEach(function (x, i) { dots.appendChild(h('i' + (i === k ? '.on' : i < k ? '.done' : ''))); });
      var pic = h('div.l2-lesson-pic');
      if (c.try) { widget = tryWidget(c.try, pic); pic.classList.add('try'); } else pic.innerHTML = LE.l2pic(c.pic);
      var lastCard = k === ls.cards.length - 1;
      cardEl.append(
        h('div.l2-lesson-top', h('span.l2-lesson-badge', c.try ? '👆 Try it!' : '📖 ' + ls.title), dots),
        pic,
        h('p.l2-lesson-text', c.text),
        h('div.row.l2-lesson-btns',
          LE.button('white l2-say', '🔊', function () { LE.speakForce ? LE.speakForce(c.text) : LE.speak(c.text); }, { label: 'Say it again' }),
          k > 0 ? LE.button('blue l2-back', '◀', function () { k--; render(); }, { label: 'Back' }) : null,
          LE.button('green big l2-next', lastCard ? (done ? 'Let\'s go! ▶' : 'Done 👍') : 'Next ▶', function () {
            if (!lastCard) { k++; render(); return; }
            finish();
          }, { sound: 'whoosh', label: lastCard ? 'Finish lesson' : 'Next card' })));
      LE.speak(c.text);
    }
    function finish() {
      if (widget && widget.destroy) widget.destroy();
      l2().lessons[topic] = true; save();
      LE.closeOverlay();
      LE.stopSpeaking();
      if (done) setTimeout(done, 260);
    }
    LE.sound.play('open');
    LE.openOverlay([h('div.l2-lesson-title', ls.icon + ' ' + ls.title + ' lesson'), cardEl], 'l2-lesson-ov');
    LE.voice.prefetch(ls.cards.map(function (c) { return c.text; }));
    render();
    LE.activeLesson = { topic: topic, next: function () { var b = cardEl.querySelector('.l2-next'); if (b) b.click(); }, card: function () { return k; }, count: ls.cards.length, widget: function () { return widget; } };
  }

  /** The "try it" card: a tiny interactive picture. */
  function tryWidget(kind, host) {
    var D2 = LE.l2draw;
    if (kind === 'gears') {
      var n = 1;
      var svgBox = h('div.tw-svg'), lbl = h('div.tw-lbl');
      function draw() {
        var s = '<svg viewBox="0 0 220 110">';
        var x = 30;
        s += D2.gear(x, 55, 24, 9, '#ffc83d', '#a86f00', 'spin');
        for (var i = 0; i < n; i++) { x += 44; s += D2.gear(x, 55, 18, 7, i % 2 ? '#ffc83d' : '#ff7a59', i % 2 ? '#a86f00' : '#a3361d', i % 2 ? 'spin' : 'spin-rev'); }
        s += D2.arrow(x, 55, 28, n % 2 === 0, '#fff') + '</svg>';
        svgBox.innerHTML = s;
        lbl.textContent = (n % 2 === 0 ? '↻ same way as the motor' : '↺ the other way') + ' · ' + n + (n === 1 ? ' gear' : ' gears');
      }
      var add = LE.button('green tw-add', '+ Gear', function () { if (n < 4) { n++; draw(); LE.sound.play('place'); } }, { label: 'Add a gear' });
      var rem = LE.button('red tw-rem', '− Gear', function () { if (n > 1) { n--; draw(); LE.sound.play('remove'); } }, { label: 'Take a gear away' });
      host.append(svgBox, lbl, h('div.row.tw-row', rem, add));
      draw();
      return { n: function () { return n; }, add: function () { add.click(); } };
    }
    if (kind === 'lever') {
      var f = 0, box = h('div.tw-svg'), lb = h('div.tw-lbl');
      function drawL() {
        var dl = f + 3, de = 3 - f, ok = 1 * de > 3 * dl;
        var ang = ok ? 9 : -9;
        var px = 110 + f * 26;
        var s = '<svg viewBox="0 0 220 110"><rect x="0" y="96" width="220" height="14" fill="#5cbf4a"/>' +
          '<path d="M' + px + ' 74 l-14 22 h28z" fill="#ff9f1c" stroke="#a35a00" stroke-width="3"/>' +
          '<g transform="rotate(' + ang + ' ' + px + ' 72)"><rect x="22" y="66" width="176" height="9" rx="4" fill="#e0a560" stroke="#8a5a2b" stroke-width="3"/>' +
          '<rect x="26" y="42" width="26" height="24" rx="4" fill="#9aa3b5" stroke="#4a5263" stroke-width="3"/><text x="39" y="59" font-size="11" font-weight="900" text-anchor="middle" fill="#fff">3 kg</text>' +
          '<g transform="translate(182 52)">' + D2.robo + '</g></g></svg>';
        box.innerHTML = s;
        lb.textContent = ok ? 'Easy! Robo lifts the box.' : 'Too heavy for Robo!';
        lb.classList.toggle('ok', ok);
      }
      var row = h('div.row.tw-spots');
      [-2, -1, 0, 1, 2].forEach(function (x) {
        row.appendChild(LE.button('white tw-spot', x === 0 ? '▲' : '·', function () { f = x; row.querySelectorAll('.tw-spot').forEach(function (b, i) { b.innerHTML = [-2, -1, 0, 1, 2][i] === f ? '▲' : '·'; }); drawL(); LE.sound.play('click'); }, { label: 'Fulcrum spot ' + (x + 3) }));
      });
      host.append(box, lb, row);
      drawL();
      return { setF: function (x) { var b = row.children[x + 2]; if (b) b.click(); }, ok: function () { return lb.classList.contains('ok'); } };
    }
    if (kind === 'ramp') {
      var steep = false, rb = h('div.tw-svg'), rl = h('div.tw-lbl');
      function drawR() {
        var w = steep ? 70 : 170, need = steep ? 0.9 : 0.35;
        rb.innerHTML = '<svg viewBox="0 0 220 110"><rect x="0" y="96" width="220" height="14" fill="#5cbf4a"/>' +
          '<path d="M' + (200 - w) + ' 96 L200 46 L200 96z" fill="#8bd16a" stroke="#3f7a26" stroke-width="3"/>' +
          '<rect x="190" y="46" width="28" height="50" fill="#3d8bff" stroke="#1d4f99" stroke-width="3"/>' +
          '<rect x="10" y="10" width="90" height="16" rx="6" fill="#fff"/><rect x="12" y="12" width="' + (86 * need) + '" height="12" rx="5" fill="' + (steep ? '#ff4f6d' : '#33b864') + '"/>' +
          '<text x="105" y="23" font-size="12" font-weight="900" fill="#fff">push</text></svg>';
        rl.textContent = steep ? 'Steep: short, but a HARD push!' : 'Gentle: long, but an easy push.';
      }
      var bS = LE.button('white tw-steep', '📐 Steep', function () { steep = true; drawR(); LE.sound.play('click'); }, { label: 'Steep ramp' });
      var bG = LE.button('white tw-gentle', '📏 Gentle', function () { steep = false; drawR(); LE.sound.play('click'); }, { label: 'Gentle ramp' });
      host.append(rb, rl, h('div.row.tw-row', bS, bG));
      drawR();
      return { steep: function (v) { (v ? bS : bG).click(); } };
    }
    if (kind === 'circuit') {
      var on = false, cb = h('div.tw-svg'), cl = h('div.tw-lbl');
      function drawC() {
        cb.innerHTML = '<svg viewBox="0 0 220 110"><path d="M50 22 H170 V92 H' + (on ? '50' : '120') + (on ? '' : ' M92 92 H50') + ' Z" fill="none" stroke="#3dd6ff" stroke-width="6" stroke-linejoin="round"/>' +
          D2.battery(50, 57) + D2.bulb(110, 30, on) +
          '<g transform="translate(106 92)"><circle cx="-14" cy="0" r="5" fill="#fff" stroke="#23264a" stroke-width="2"/><circle cx="14" cy="0" r="5" fill="#fff" stroke="#23264a" stroke-width="2"/>' +
          '<path d="M-14 0 L' + (on ? '14 0' : '8 -16') + '" stroke="#23264a" stroke-width="5" stroke-linecap="round"/></g></svg>';
        cl.textContent = on ? 'Closed loop: the bulb is ON!' : 'Open loop: the bulb is off.';
        cl.classList.toggle('ok', on);
      }
      var sw = LE.button('yellow tw-switch', '🔘 Switch', function () { on = !on; drawC(); LE.sound.play(on ? 'zap' : 'click'); }, { label: 'Switch' });
      host.append(cb, cl, h('div.row.tw-row', sw));
      drawC();
      return { toggle: function () { sw.click(); }, on: function () { return on; } };
    }
    return null;
  }

  /* ---------- resume after a reload ---------- */
  function resume(last) {
    var T = track(last.track);
    if (last.screen === 'l2-stage' && T.stages[last.stage] && L2().isStageOpen(l2(), T.id, T.stages, last.stage)) openStage(T.id, last.stage, { variant: last.variant || null, noLesson: true });
    else show(T.id);
  }

  LE.level2Hub = { menuCard: menuCard, show: show, openStage: openStage, openLesson: openLesson, resume: resume, counts: counts, track: track, ui: ui };
})();
