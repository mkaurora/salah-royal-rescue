/* Parent area (v3): PIN pad (default 1994), "Forgot PIN?" adult math gate, and a small tabbed panel
 * (Progress · Weekly · Settings) in a plain grown-up style. Opened by holding the menu gear for 3 seconds.
 * Nothing here is read aloud. Pure progress rules live in js/logic/save.js (+ js/logic/weekly.js). */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var h = LE.h;
  var WORLDS = ['bridges', 'machines', 'circuits', 'robot', 'construction'];
  var ui = { world: 'bridges' };

  function store() { return LE.app.store; }
  function abtn(label, cls, fn) {
    var b = h('button.a-btn' + (cls || '').split(' ').filter(Boolean).map(function (c) { return '.' + c; }).join(''), { type: 'button' }, label);
    b.addEventListener('click', function (e) { LE.sound.play('click'); fn(e); });
    return b;
  }
  function card(parent, title, note) {
    var c = h('div.a-card', title ? h('h3', title) : null, note ? h('div.a-note', note) : null);
    parent.appendChild(c);
    return c;
  }
  function confirmBox(text, yesLabel, yes) {
    var wrap = h('div.a-confirm');
    var c = h('div.a-card', h('h3', text),
      h('div.a-row',
        abtn(yesLabel || 'Yes', 'danger confirm-yes', function () { wrap.remove(); yes(); }),
        abtn('Cancel', 'confirm-no', function () { wrap.remove(); })));
    wrap.appendChild(c);
    document.body.appendChild(wrap);
  }
  function toast(text) {
    var t = h('div.a-toast', text);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, LE.FAST ? 400 : 1800);
  }

  /* ---------- PIN pad ---------- */
  function openPin() {
    var val = '';
    var dots = h('div.pin-dots', h('i'), h('i'), h('i'), h('i'));
    var msg = h('div.pin-msg');
    var pad = h('div.pin-pad');
    function draw() { Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i < val.length); }); }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].forEach(function (k) {
      var b = h('button', { type: 'button', 'data-pin': k }, k);
      b.addEventListener('click', function () {
        LE.sound.play('click');
        if (k === 'C') val = '';
        else if (k === '⌫') val = val.slice(0, -1);
        else if (val.length < 4) val += k;
        msg.textContent = '';
        draw();
        if (val.length === 4) {
          if (store().checkPin(val)) { LE.closeOverlay(); openPanel(); }
          else {
            msg.textContent = 'Wrong PIN. Try again.';
            dots.classList.remove('shake'); void dots.offsetWidth; dots.classList.add('shake');
            LE.sound.play('oops');
            val = ''; setTimeout(draw, 250);
          }
        }
      });
      pad.appendChild(b);
    });
    LE.openOverlay([
      h('h2', 'Parents'),
      h('div.a-note', 'Enter your 4-digit PIN'),
      dots, msg, pad,
      h('div.a-row.center',
        abtn('Forgot PIN?', 'link forgot-btn', function () { openGate(); }),
        abtn('Cancel', 'link cancel-btn', function () { LE.closeOverlay(); }))
    ], 'pin-overlay');
  }

  /* ---------- "Forgot PIN?" adult gate ---------- */
  function openGate() {
    var gate = LE.save.mathGate();
    var q = h('div.gate-q', gate.question);
    var input = h('input.gate-input', { inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', 'aria-label': 'Answer' });
    var msg = h('div.pin-msg');
    function submit() {
      if (LE.save.checkGate(gate, input.value)) { LE.closeOverlay(); openPanel('settings', 'Choose a new PIN below.'); }
      else { msg.textContent = 'Not quite. Here is a new one.'; gate = LE.save.mathGate(); q.textContent = gate.question; input.value = ''; }
    }
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    LE.openOverlay([
      h('h2', 'Grown-ups only'),
      h('div.a-note', 'Answer to reset the PIN'),
      q, input, msg,
      h('div.a-row.center', abtn('OK', 'primary gate-ok', submit), abtn('Cancel', 'gate-cancel', function () { LE.closeOverlay(); }))
    ], 'pin-overlay');
    setTimeout(function () { input.focus(); }, 60);
  }

  /* ---------- panel ---------- */
  var TABS = [['progress', 'Progress'], ['weekly', 'Weekly'], ['level2', 'Level 2'], ['settings', 'Settings']];

  function openPanel(tab, notice) {
    tab = tab || 'progress';
    var el = h('div.parent-screen');
    var head = h('div.admin-head', h('h1', 'Parent Area', h('small.admin-version', ' ' + (LE.versionLabel ? LE.versionLabel() : ''))), abtn('Done', 'primary admin-close', function () { LE.app.showMenu(); }));
    var tabs = h('div.admin-tabs');
    var body = h('div.admin-body.scroll-y');
    TABS.forEach(function (t) {
      var b = h('button.tab-' + t[0], { type: 'button' }, t[1]);
      b.addEventListener('click', function () { LE.sound.play('click'); open(t[0]); });
      tabs.appendChild(b);
    });
    el.append(head, tabs, body);
    function open(name, note) {
      Array.prototype.forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.classList.contains('tab-' + name)); });
      var top = body.scrollTop, same = el.dataset.tab === name;
      body.innerHTML = '';
      el.dataset.tab = name;
      if (note) body.appendChild(h('div.a-card.a-ok.admin-notice', note));
      PANELS[name](body, function () { open(name); });
      body.scrollTop = same ? top : 0;
    }
    LE.app.showScreen({ el: el });
    LE.app.store.setLast({ screen: 'menu' });
    open(tab, notice);
  }

  var PANELS = {};

  /* 1. Progress: per-world level list (open / stars 0–3), unlock all, reset world / all. */
  PANELS.progress = function (body, refresh) {
    var st = store();
    var seg = h('div.a-seg.world-seg');
    WORLDS.forEach(function (w) {
      var b = h('button.seg-' + w + (ui.world === w ? '.on' : ''), { type: 'button' }, LE.world(w).name);
      b.addEventListener('click', function () { ui.world = w; refresh(); });
      seg.appendChild(b);
    });
    body.appendChild(seg);
    var w = LE.world(ui.world), n = w.levels.length;
    var counts = {};
    WORLDS.forEach(function (id) { counts[id] = LE.world(id).levels.length; });

    var top = card(body, w.name + ' — ' + st.totalStars(ui.world) + ' / ' + n * 3 + ' stars');
    top.appendChild(h('div.a-row',
      abtn('Unlock all ' + w.name, 'unlock-world', function () { st.unlockAll(counts, ui.world); toast('All ' + w.name + ' levels are open.'); refresh(); }),
      abtn('Reset ' + w.name, 'danger reset-world', function () {
        confirmBox('Erase all ' + w.name + ' stars?', 'Erase', function () { st.resetWorld(ui.world); toast(w.name + ' was reset.'); refresh(); });
      })));

    var list = card(body, 'Levels', 'Open = he can play it. Tap a number to set the stars.');
    w.levels.forEach(function (lv, i) {
      var open = st.isUnlocked(ui.world, i), stars = st.getStars(ui.world, i);
      var row = h('div.lv-row' + (open ? '' : '.locked'), { 'data-level': i },
        h('div.lv-name', h('b', String(i + 1)), ' ', lv.name),
        open ? h('span.lv-open', 'open') : abtn('Open', 'small unlock-level', function () { st.unlockTo(ui.world, i); refresh(); }));
      var starSeg = h('div.a-seg.star-seg');
      [0, 1, 2, 3].forEach(function (k) {
        var b = h('button' + (k === stars ? '.on' : ''), { type: 'button', 'data-stars': k, 'aria-label': k + ' stars' }, k ? k + '★' : '0');
        b.addEventListener('click', function () { st.setStarsExact(ui.world, i, k); refresh(); });
        starSeg.appendChild(b);
      });
      row.appendChild(starSeg);
      list.appendChild(row);
    });

    var all = card(body, 'All worlds');
    all.appendChild(h('div.a-row',
      abtn('Unlock everything', 'unlock-all', function () { st.unlockAll(counts); toast('Every level is open.'); refresh(); }),
      abtn('Reset all progress', 'danger reset-all', function () {
        confirmBox('Erase ALL stars, weekly projects and saved levels?', 'Erase all', function () { st.reset(); toast('All progress was reset.'); refresh(); });
      })));
  };

  /* 2. Weekly: open projects early, jump to a week, mark steps done. */
  PANELS.weekly = function (body, refresh) {
    var st = store(), W = LE.logic.weekly, projects = LE.weeklyProjects || [];
    var now = LE.now();
    var cal = W.calendarWeek(now), cur = W.currentWeek(st.data, now, projects.length, projects), max = W.unlockedMax(st.data, now);
    var force = st.getWeekly().currentWeekForce;
    var info = card(body, 'Weekly Big Project',
      (W.OPEN_NOW >= projects.length ? 'All ' + projects.length + ' weeks are open. ' :
        'Weeks 1–' + W.OPEN_NOW + ' are open. After that a new project opens every Monday (week ' + (W.OPEN_NOW + 1) + ' on ' +
        W.opensOn(W.OPEN_NOW).toISOString().slice(0, 10) + '). ') + 'Open now: weeks 1–' + (Math.min(max, projects.length - 1) + 1) + ' of ' + projects.length +
      '. Showing as "this week": week ' + (cur + 1) + (force !== null ? ' (set by you)' : '') + '.');
    info.appendChild(h('div.a-row',
      abtn('Follow the calendar', 'follow-calendar', function () { st.setCurrentWeekForce(null); st.setWeeklyUnlockedMax(-1); toast('Weeks follow the calendar again.'); refresh(); }),
      abtn('Open all weeks', 'open-all-weeks', function () { st.setWeeklyUnlockedMax(projects.length - 1); toast('All weekly projects are open.'); refresh(); })));
    projects.forEach(function (p, i) {
      var open = W.isProjectUnlocked(st.data, i, now), prog = st.projectProgress(p.id);
      var c = card(body, 'Week ' + (i + 1) + ' · ' + p.icon + ' ' + p.title,
        'Opens ' + W.opensOn(i).toISOString().slice(0, 10) + ' · ' + (prog.done ? 'finished ✔' : open ? 'open' : 'locked') + (i === cur ? ' · this week' : ''));
      c.dataset.week = i;
      c.classList.add('wk-card');
      c.appendChild(h('div.a-row',
        open ? null : abtn('Unlock now', 'small unlock-week', function () { st.setWeeklyUnlockedMax(Math.max(i, st.data.settings.weeklyUnlockedMax)); toast('Week ' + (i + 1) + ' is open.'); refresh(); }),
        i === cur ? null : abtn('Make this week', 'small jump-week', function () { st.setCurrentWeekForce(i); toast('Week ' + (i + 1) + ' is now "this week".'); refresh(); }),
        abtn('Reset', 'small danger reset-project', function () { confirmBox('Reset ' + p.title + '?', 'Reset', function () { st.resetProject(p.id); refresh(); }); })));
      var steps = h('div.wk-steps');
      var ids = p.steps.map(function (s) { return s.id; });
      p.steps.forEach(function (s, k) {
        var done = (prog.steps[s.id] || 0) > 0;
        var b = h('button.wk-step' + (done ? '.on' : ''), { type: 'button', 'data-step': s.id }, (done ? '✔ ' : '') + (k + 1) + '. ' + s.title);
        b.addEventListener('click', function () { LE.sound.play('click'); st.setStepStarsExact(p.id, s.id, done ? 0 : 3, ids); refresh(); });
        steps.appendChild(b);
      });
      c.appendChild(steps);
    });
  };

  /* 3. Level 2 (v4): progress per track, unlock any stage / tier / everything, set stars, timers on/off, reset. */
  PANELS.level2 = function (body, refresh) {
    var st = store(), L2 = LE.logic.level2, D = LE.level2 && LE.level2.data;
    if (!D) { card(body, 'Level 2', 'Not available.'); return; }
    var l2 = st.getLevel2();
    ui.l2track = ui.l2track || 'a';
    var counts = {};
    D.tracks.forEach(function (t) { counts[t.id] = t.stages.length; });
    var sum = card(body, 'Level 2 progress', 'Stages open in order. The next tier (Bronze → Silver → Gold) opens when ' + L2.MASTERY_NEED +
      ' of the ' + L2.TIER_SIZE + ' stages of the tier before have 3 stars. Hints after ' + L2.HINT_AT + ' tries, Show Me after ' + L2.SHOWME_AT +
      ', an easier version (max 2 stars) after ' + L2.EASIER_AT + '.');
    D.tracks.forEach(function (t) {
      var s = L2.summary(l2, t.id, t.stages);
      sum.appendChild(h('div.lv-row.l2-sum', { 'data-track': t.id }, h('div.lv-name', h('b', t.icon), ' ', t.name),
        h('span.lv-open', s.stars + ' / ' + s.max + ' ★ · ' + s.done + '/' + s.count + ' done · ' + s.tierName + ' open')));
    });
    var tm = card(body, 'Timers', 'Some Silver and Gold stages have a relaxed timer. It only decides the 3rd star and never fails a stage.');
    tm.appendChild(h('div.a-row', abtn(l2.timers ? 'Timers: ON' : 'Timers: OFF', (l2.timers ? 'primary' : '') + ' toggle-timers', function () {
      l2.timers = !l2.timers; st.save(); refresh();
    })));
    var all = card(body, 'All of Level 2');
    all.appendChild(h('div.a-row',
      abtn('Unlock all Level 2', 'unlock-l2', function () { L2.unlockAll(l2, counts); st.save(); toast('All Level 2 stages are open.'); refresh(); }),
      abtn('Reset Level 2', 'danger reset-l2', function () {
        confirmBox('Erase all Level 2 stars and lessons?', 'Erase', function () {
          L2.reset(l2);
          Object.keys(st.data.inProgress).forEach(function (k) { if (k.indexOf('l2-') === 0) delete st.data.inProgress[k]; });
          if (st.data.last && /^l2/.test(st.data.last.screen || '')) st.data.last = { screen: 'menu' };
          st.save(); toast('Level 2 was reset.'); refresh();
        });
      })));
    var seg = h('div.a-seg.l2-seg');
    D.tracks.forEach(function (t) {
      var b = h('button.seg-' + t.id + (ui.l2track === t.id ? '.on' : ''), { type: 'button' }, t.icon + ' ' + t.short);
      b.addEventListener('click', function () { ui.l2track = t.id; refresh(); });
      seg.appendChild(b);
    });
    body.appendChild(seg);
    var T = D.tracks.filter(function (t) { return t.id === ui.l2track; })[0];
    var tiers = card(body, 'Tiers');
    tiers.appendChild(h('div.a-row', [0, 1, 2].slice(0, L2.tierCount(T.stages)).map(function (k) {
      var open = L2.isTierOpen(l2, T.id, T.stages, k);
      return abtn((open ? '✔ ' : 'Open ') + L2.tierName(k), 'small unlock-tier' + (open ? ' primary' : ''), function () { L2.unlockTo(l2, T.id, k * L2.TIER_SIZE); st.save(); refresh(); });
    })));
    var list = card(body, T.name, 'Open = he can play it. Tap a number to set the stars.');
    T.stages.forEach(function (s, i) {
      var open = L2.isStageOpen(l2, T.id, T.stages, i), stars = L2.getStars(l2, s.id);
      var row = h('div.lv-row.l2-row' + (open ? '' : '.locked'), { 'data-stage': s.id },
        h('div.lv-name', h('b', String(i + 1)), ' ', s.name, ' ', h('small', L2.tierName(L2.tierOf(i)))),
        open ? h('span.lv-open', 'open') : abtn('Open', 'small unlock-stage', function () { L2.unlockTo(l2, T.id, i); st.save(); refresh(); }));
      var starSeg = h('div.a-seg.star-seg');
      [0, 1, 2, 3].forEach(function (k) {
        var b = h('button' + (k === stars ? '.on' : ''), { type: 'button', 'data-stars': k, 'aria-label': k + ' stars' }, k ? k + '★' : '0');
        b.addEventListener('click', function () { L2.setStarsExact(l2, T.id, T.stages, i, k); st.save(); refresh(); });
        starSeg.appendChild(b);
      });
      row.appendChild(starSeg);
      list.appendChild(row);
    });
  };

  /* 4. Settings: PIN, Ask Helper, transfer code. */
  PANELS.settings = function (body, refresh) {
    var st = store();
    var pinCard = card(body, 'Change PIN', 'Four digits. Default is 1994.');
    var p1 = h('input.a-input.pin-new', { inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4, autocomplete: 'off', placeholder: 'New PIN', 'aria-label': 'New PIN' });
    var p2 = h('input.a-input.pin-again', { inputmode: 'numeric', pattern: '[0-9]*', maxlength: 4, autocomplete: 'off', placeholder: 'Again', 'aria-label': 'Repeat new PIN' });
    var pmsg = h('div.a-note.pin-result');
    pinCard.append(h('div.a-row', p1, p2, abtn('Save PIN', 'primary save-pin', function () {
      if (p1.value !== p2.value) { pmsg.textContent = 'The two PINs are different.'; return; }
      if (!st.setPin(p1.value)) { pmsg.textContent = 'Use exactly 4 digits.'; return; }
      p1.value = p2.value = '';
      pmsg.textContent = 'PIN saved.';
      toast('PIN saved.');
    })), pmsg);

    var helper = card(body, 'Ask Helper', 'Lets him talk to the helper (needs internet and the microphone; max 3 minutes; hints only, never full answers).');
    var on = st.getHelper();
    helper.appendChild(h('div.a-row', abtn(on ? 'Ask Helper: ON' : 'Ask Helper: OFF', (on ? 'primary' : '') + ' toggle-helper', function () {
      st.setHelper(!st.getHelper()); refresh();
    })));

    var sm = card(body, 'Show Me demos', 'Normally the 👉 Show Me demo opens after 2 tries or about 2 minutes on a level, after a hint. Turn this on to let him watch a demo at once. Demos never give stars.');
    var smOn = st.getShowMeAlways();
    sm.appendChild(h('div.a-row', abtn(smOn ? 'Show Me: always open' : 'Show Me: after 2 tries / 2 min', (smOn ? 'primary' : '') + ' toggle-showme', function () {
      st.setShowMeAlways(!st.getShowMeAlways()); refresh();
    })));

    var tr = card(body, 'Transfer progress', 'Copy this code to move his stars to another phone or browser. The PIN is not included.');
    var code = st.exportCode();
    var out = h('textarea.a-code.export-code', { readonly: true, rows: 3 });
    out.value = code;
    var cmsg = h('div.a-note');
    tr.append(out, h('div.a-row', abtn('Copy code', 'copy-code', function () {
      out.select();
      var done = function () { cmsg.textContent = 'Copied.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, function () { document.execCommand && document.execCommand('copy'); done(); });
      else { try { document.execCommand('copy'); } catch (e) {} done(); }
    })), cmsg);
    var inp = h('textarea.a-code.import-code', { rows: 3, placeholder: 'Paste a code here', 'aria-label': 'Transfer code' });
    var imsg = h('div.a-note.import-result');
    tr.append(h('h3.a-sub', 'Load a code'), inp, h('div.a-row', abtn('Load progress', 'danger import-btn', function () {
      var v = inp.value.trim();
      if (!v) { imsg.textContent = 'Paste a code first.'; return; }
      confirmBox('Replace all progress on this phone?', 'Replace', function () {
        var r = st.importCode(v);
        if (r.ok) { toast('Progress loaded.'); refresh(); } else imsg.textContent = r.error;
      });
    })), imsg);
    body.appendChild(h('div.a-foot', 'Little Engineer ' + (LE.APP_VERSION ? 'v' + LE.APP_VERSION : '')));
  };

  LE.parent = { openPin: openPin, openGate: openGate, openPanel: openPanel, panels: PANELS };
})();
