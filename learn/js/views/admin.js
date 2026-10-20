/* Parent area: PIN pad (default 1994), "Forgot PIN?" adult math gate, and the tabbed admin panel
 * (Levels · Questions · Settings · Report · Transfer). Adult styling, works on iPhone SE. */
(function () {
  'use strict';
  var SQ = window.SQ;
  var S = function () { return SQ.save; };

  /* ---------- PIN ---------- */
  SQ.openPin = function () {
    SQ.closeOverlays();
    var c = SQ.h('div', 'card pin-card');
    c.innerHTML = '<h2>Parents</h2><div class="a-note">Enter your 4-digit PIN</div><div class="pin-dots"><i></i><i></i><i></i><i></i></div><div class="pin-msg"></div>';
    var pad = SQ.h('div', 'pin-pad');
    var val = '';
    var dots = c.querySelectorAll('.pin-dots i'), msg = c.querySelector('.pin-msg');
    function draw() { [].forEach.call(dots, function (d, i) { d.classList.toggle('on', i < val.length); }); }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].forEach(function (k) {
      var b = SQ.h('button', '', k);
      b.setAttribute('data-pin', k);
      SQ.tap(b, function () {
        SQ.sound.play('click');
        if (k === 'C') val = '';
        else if (k === '⌫') val = val.slice(0, -1);
        else if (val.length < 4) val += k;
        msg.textContent = '';
        draw();
        if (val.length === 4) {
          if (S().checkPin(SQ.state, val)) { ov.close(); SQ.go.admin(); }
          else {
            msg.textContent = 'Wrong PIN. Try again.';
            c.querySelector('.pin-dots').classList.remove('shake'); void c.offsetWidth; c.querySelector('.pin-dots').classList.add('shake');
            SQ.sound.play('oops');
            val = ''; setTimeout(draw, 250);
          }
        }
      });
      pad.appendChild(b);
    });
    c.appendChild(pad);
    var forgot = SQ.h('button', 'linkbtn forgot-btn', 'Forgot PIN?');
    SQ.tap(forgot, function () { ov.close(); openGate(); });
    c.appendChild(forgot);
    var cancel = SQ.h('button', 'linkbtn cancel-btn', 'Cancel');
    SQ.tap(cancel, function () { ov.close(); });
    c.appendChild(cancel);
    var ov = SQ.overlay(c, { cls: 'pin-overlay' });
    return ov;
  };

  function openGate() {
    var gate = S().mathGate();
    var c = SQ.h('div', 'card pin-card gate-card');
    c.innerHTML = '<h2>Grown-ups only</h2><div class="a-note">Answer to reset the PIN</div><div class="gate-q"></div>' +
      '<input class="gate-input" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Answer"><div class="pin-msg"></div>';
    var qEl = c.querySelector('.gate-q'), input = c.querySelector('.gate-input'), msg = c.querySelector('.pin-msg');
    qEl.textContent = gate.question;
    var row = SQ.h('div', 'row');
    var ov;
    row.appendChild(SQ.btn('OK', 'blue small gate-ok', function () {
      if (S().checkGate(gate, input.value)) { ov.close(); SQ.go.admin('settings', 'Choose a new PIN below.'); }
      else { msg.textContent = 'Not quite. Here is a new one.'; gate = S().mathGate(); qEl.textContent = gate.question; input.value = ''; }
    }));
    row.appendChild(SQ.btn('Cancel', 'white small', function () { ov.close(); }));
    c.appendChild(row);
    ov = SQ.overlay(c, { cls: 'pin-overlay' });
    setTimeout(function () { input.focus(); }, 50);
  }
  SQ.openGate = openGate;

  /* ---------- admin panel ---------- */
  var TABS = [['levels', 'Levels'], ['questions', 'Questions'], ['settings', 'Settings'], ['report', 'Report'], ['transfer', 'Transfer']];
  var ui = { subject: 'math', level: 0 };

  SQ.go.admin = function (tab, notice) {
    tab = tab || 'levels';
    var s = SQ.h('div', 'screen admin');
    var head = SQ.h('div', 'admin-head', '<h1>Parent Area<small class="admin-version">' + SQ.esc(SQ.versionLabel ? SQ.versionLabel() : '') + '</small></h1>');
    var close = SQ.h('button', 'a-btn primary admin-close', 'Done');
    SQ.tap(close, function () { SQ.persist(); SQ.go.menu(); });
    head.appendChild(close);
    s.appendChild(head);
    var tabs = SQ.h('div', 'admin-tabs');
    var body = SQ.h('div', 'admin-body');
    TABS.forEach(function (t) {
      var b = SQ.h('button', 'tab-' + t[0], t[1]);
      SQ.tap(b, function () { open(t[0]); });
      tabs.appendChild(b);
    });
    s.appendChild(tabs);
    s.appendChild(body);
    function open(name, note) {
      [].forEach.call(tabs.children, function (b) { b.classList.toggle('on', b.className.indexOf('tab-' + name) >= 0); });
      body.innerHTML = '';
      body.scrollTop = 0;
      s.setAttribute('data-tab', name);
      if (note) body.appendChild(SQ.h('div', 'a-card a-ok admin-notice', SQ.esc(note)));
      PANELS[name](body, function () { open(name); });
    }
    s._enter = function () { open(tab, notice); };
    SQ.show(s);
  };

  function card(parent, title) {
    var c = SQ.h('div', 'a-card');
    if (title) c.appendChild(SQ.h('h3', '', SQ.esc(title)));
    parent.appendChild(c);
    return c;
  }
  function abtn(label, cls, fn) {
    var b = SQ.h('button', 'a-btn ' + (cls || ''), SQ.esc(label));
    SQ.tap(b, fn);
    return b;
  }
  function confirmBox(text, yes) {
    var wrap = SQ.h('div', 'a-confirm');
    var c = SQ.h('div', 'a-card');
    c.appendChild(SQ.h('h3', '', SQ.esc(text)));
    var row = SQ.h('div', 'a-row');
    row.appendChild(abtn('Yes', 'danger confirm-yes', function () { wrap.remove(); yes(); }));
    row.appendChild(abtn('Cancel', 'confirm-no', function () { wrap.remove(); }));
    c.appendChild(row);
    wrap.appendChild(c);
    document.getElementById('app').appendChild(wrap);
  }
  function subjectSeg(parent, onChange) {
    var seg = SQ.h('div', 'a-seg');
    S().SUBJECTS.forEach(function (sub) {
      var b = SQ.h('button', 'seg-' + sub + (ui.subject === sub ? ' on' : ''), SQ.WORLD[sub].sub);
      SQ.tap(b, function () { ui.subject = sub; ui.level = 0; onChange(); });
      seg.appendChild(b);
    });
    parent.appendChild(seg);
    return seg;
  }
  function save() { SQ.persist(); }

  var PANELS = {};

  /* 1. Levels */
  PANELS.levels = function (body, refresh) {
    var top = card(body);
    subjectSeg(top, refresh);
    var acts = SQ.h('div', 'a-row');
    acts.style.marginTop = '10px';
    acts.appendChild(abtn('Unlock all', 'unlock-all', function () { S().unlockAll(SQ.state, ui.subject, SQ.levelCount(ui.subject)); save(); refresh(); }));
    acts.appendChild(abtn('Reset subject', 'danger', function () {
      confirmBox('Reset all ' + SQ.WORLD[ui.subject].sub + ' progress?', function () {
        SQ.state.levels[ui.subject] = {}; SQ.state.unlocked[ui.subject] = 0; save(); refresh();
      });
    }));
    acts.appendChild(abtn('Reset ALL progress', 'danger reset-all', function () {
      confirmBox('Reset all progress in every subject?', function () { SQ.state = S().resetAll(SQ.state); save(); refresh(); });
    }));
    top.appendChild(acts);
    var list = card(body, SQ.WORLD[ui.subject].name);
    var mod = SQ.subjects[ui.subject];
    mod.levels.forEach(function (lv, i) {
      var info = S().levelInfo(SQ.state, ui.subject, i), open = S().isUnlocked(SQ.state, ui.subject, i);
      var row = SQ.h('div', 'a-level');
      row.setAttribute('data-level', i);
      row.innerHTML = '<div><div class="t">' + (i + 1) + '. ' + lv.icon + ' ' + SQ.esc(lv.title) + '</div><div class="m">' +
        (open ? '🔓 open' : '🔒 locked') + (info.passed ? ' · ✅ passed' : '') + (info.plays ? ' · played ' + info.plays + '×' : '') + '</div></div>';
      var st = SQ.h('div', 'a-stars');
      for (var k = 0; k <= 3; k++) (function (k) {
        var b = SQ.h('button', 'star-' + k + (info.stars === k ? ' on' : ''), k === 0 ? '0' : '⭐'.repeat(1) + k);
        b.setAttribute('aria-label', k + ' stars');
        SQ.tap(b, function () { S().setStars(SQ.state, ui.subject, i, k); save(); refresh(); });
        st.appendChild(b);
      })(k);
      row.appendChild(st);
      var a = SQ.h('div', 'acts');
      a.appendChild(abtn('▶ Play', 'primary play-level', function () { S().unlock(SQ.state, ui.subject, i); save(); SQ.go.play(ui.subject, i); }));
      if (!open) a.appendChild(abtn('Unlock', 'unlock-level', function () { S().unlock(SQ.state, ui.subject, i); save(); refresh(); }));
      a.appendChild(abtn('Approve', 'approve-level', function () { S().approve(SQ.state, ui.subject, i, mod.levels.length); save(); refresh(); }));
      a.appendChild(abtn('Questions', 'edit-level', function () { ui.level = i; SQ.go.admin('questions'); }));
      if (info.passed || info.stars) a.appendChild(abtn('Reset', 'danger reset-level', function () {
        confirmBox('Reset level ' + (i + 1) + '?', function () { S().resetLevel(SQ.state, ui.subject, i); save(); refresh(); });
      }));
      row.appendChild(a);
      list.appendChild(row);
    });
  };

  /* 2. Questions / level editor */
  PANELS.questions = function (body, refresh) {
    var mod = SQ.subjects[ui.subject];
    var top = card(body);
    subjectSeg(top, refresh);
    var sel = SQ.h('label', 'a-field', 'Level');
    var select = SQ.h('select', 'level-select');
    mod.levels.forEach(function (lv, i) {
      var o = SQ.h('option', '', (i + 1) + '. ' + SQ.esc(lv.title));
      o.value = i;
      if (i === ui.level) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', function () { ui.level = +select.value; refresh(); });
    sel.appendChild(select);
    top.appendChild(sel);
    var lv = mod.levels[ui.level];
    top.appendChild(SQ.h('div', 'a-note', 'Skills: ' + lv.skills.map(function (k) { return SQ.esc(mod.skills[k]); }).join(', ') + ' · difficulty ' + lv.diff +
      (mod.generated ? '<br>Math questions are made fresh every game (samples below). You can add your own questions.' : '')));
    top.appendChild(abtn('+ Add a question', 'primary add-q', function () { editor(body, null, refresh); }));

    var list = card(body, 'Questions');
    var cat = SQ.engine.levelCatalog(mod, ui.subject, ui.level, SQ.state);
    cat.forEach(function (q) {
      var row = SQ.h('div', 'a-q' + (q.disabled ? ' off' : ''));
      row.setAttribute('data-qid', q.id);
      var ans = Array.isArray(q.answer) ? q.answer.join(' → ') : q.type === 'match' ? q.pairs.map(function (p) { return p.join('='); }).join(', ') : q.answer;
      row.innerHTML = '<div class="qt">' + (q.pic && !SQ.art.isArt(q.pic) ? SQ.esc(q.pic) + ' ' : '') + SQ.esc(q.text) + '</div>' +
        '<div class="qm">' + (q.custom ? '<span class="a-tag cu">custom</span>' : '') + (q.edited ? '<span class="a-tag edit">edited</span>' : '') +
        '<span class="a-tag">' + q.type + '</span><span class="a-tag">level ' + q.d + '</span> ✔ ' + SQ.esc(String(ans).replace(/art:/g, '')) + '</div>';
      var a = SQ.h('div', 'a-row');
      if (!q.gen) {
        a.appendChild(abtn(q.disabled ? 'Enable' : 'Disable', 'toggle-q', function () { S().setDisabled(SQ.state, q.id, !q.disabled); save(); refresh(); }));
        if (['choice', 'tf', 'count'].indexOf(q.type) >= 0 || q.custom) a.appendChild(abtn('Edit', 'edit-q', function () { editor(body, q, refresh); }));
        else a.appendChild(abtn('Edit text', 'edit-q', function () { editor(body, q, refresh); }));
        if (q.edited && !q.custom) a.appendChild(abtn('Undo edit', 'undo-q', function () { S().clearEdit(SQ.state, q.id); save(); refresh(); }));
        if (q.custom) a.appendChild(abtn('Delete', 'danger del-q', function () { confirmBox('Delete this question?', function () { S().removeCustom(SQ.state, q.id); save(); refresh(); }); }));
      }
      row.appendChild(a);
      list.appendChild(row);
    });
  };

  /** Edit an existing question (q) or add a new custom one (q = null). */
  function editor(body, q, refresh) {
    var mod = SQ.subjects[ui.subject], lv = mod.levels[ui.level];
    var isNew = !q;
    var choiceLike = isNew || ['choice', 'tf', 'count'].indexOf(q.type) >= 0;
    var c = SQ.h('div', 'a-card q-editor');
    c.appendChild(SQ.h('h3', '', isNew ? 'New question' : 'Edit question'));
    function field(label, cls, value, tag) {
      var l = SQ.h('label', 'a-field', SQ.esc(label));
      var i = SQ.h(tag || 'input', cls);
      i.value = value || '';
      l.appendChild(i);
      c.appendChild(l);
      return i;
    }
    var fText = field('Question (spoken)', 'f-text', q ? q.text : '');
    var fPic = isNew ? field('Picture (emoji, optional)', 'f-pic', '') : null;
    var fOpts = [], fAns = null;
    if (choiceLike && (!q || q.type !== 'tf')) {
      var opts = q ? q.options.slice() : ['', '', ''];
      while (opts.length < 4) opts.push('');
      opts.forEach(function (o, i) { fOpts.push(field('Answer ' + (i + 1) + (i === 0 && isNew ? ' (correct)' : ''), 'f-opt f-opt-' + i, o)); });
      if (!isNew) {
        var l = SQ.h('label', 'a-field', 'Correct answer');
        fAns = SQ.h('select', 'f-answer');
        function fill() {
          var cur = fAns.value || q.answer;
          fAns.innerHTML = '';
          fOpts.forEach(function (f) { if (f.value.trim()) { var o = SQ.h('option', '', SQ.esc(f.value.trim())); o.value = f.value.trim(); if (o.value === cur) o.selected = true; fAns.appendChild(o); } });
        }
        fill();
        fOpts.forEach(function (f) { f.addEventListener('input', fill); });
        l.appendChild(fAns);
        c.appendChild(l);
      }
    }
    var skillSel = null;
    if (isNew && lv.skills.length > 1) {
      var ls = SQ.h('label', 'a-field', 'Skill');
      skillSel = SQ.h('select', 'f-skill');
      lv.skills.forEach(function (k) { var o = SQ.h('option', '', SQ.esc(mod.skills[k])); o.value = k; skillSel.appendChild(o); });
      ls.appendChild(skillSel);
      c.appendChild(ls);
    }
    var fHint = field('Hint (spoken)', 'f-hint', q ? q.hint : '');
    var msg = SQ.h('div', 'a-err');
    c.appendChild(msg);
    var row = SQ.h('div', 'a-row');
    row.appendChild(abtn('Save', 'primary save-q', function () {
      var options = fOpts.map(function (f) { return f.value.trim(); }).filter(Boolean);
      var r;
      if (isNew) {
        r = S().addCustom(SQ.state, ui.subject, ui.level, { text: fText.value, options: options, answer: options[0], hint: fHint.value, pic: fPic.value },
          skillSel ? skillSel.value : lv.skills[0]);
        if (r.ok) S().unlock(SQ.state, ui.subject, ui.level);
      } else {
        var patch = { text: fText.value.trim(), hint: fHint.value.trim() || q.hint };
        if (fOpts.length) { patch.options = options; patch.answer = fAns.value; }
        r = S().editQuestion(SQ.state, q, patch);
        if (r.ok && q.custom) {   // custom questions: write straight into the stored question
          (SQ.state.custom[ui.subject + ':' + ui.level] || []).forEach(function (cq) {
            if (cq.id === q.id) { cq.text = patch.text; cq.hint = patch.hint; if (patch.options) { cq.options = patch.options; cq.answer = patch.answer; } }
          });
          delete SQ.state.edits[q.id];
        }
      }
      if (!r.ok) { msg.textContent = 'Please fix: ' + r.problems.join(', '); return; }
      save(); refresh();
    }));
    row.appendChild(abtn('Cancel', '', refresh));
    c.appendChild(row);
    body.innerHTML = '';
    body.appendChild(c);
    body.scrollTop = 0;
  }

  /* 3. Timers & settings */
  function fmtSecs(v) { return v >= 60 ? (v % 60 ? Math.floor(v / 60) + 'm ' + (v % 60) + 's' : v / 60 + ' min') : v + ' s'; }
  PANELS.settings = function (body, refresh) {
    var st = SQ.state.settings;
    var c = card(body, 'Timers');
    function stepper(label, small, key, steps, cls, fmt) {
      var row = SQ.h('div', 'a-set ' + cls, '<div class="l">' + SQ.esc(label) + '<small>' + SQ.esc(small) + '</small></div>');
      var sp = SQ.h('div', 'stepper');
      var minus = SQ.h('button', 'dec', '−'), val = SQ.h('b', 'val', (fmt || fmtSecs)(st[key])), plus = SQ.h('button', 'inc', '+');
      function move(dir) {
        var i = steps.indexOf(st[key]);
        if (i < 0) { i = 0; while (i < steps.length - 1 && steps[i] < st[key]) i++; }
        i = Math.max(0, Math.min(steps.length - 1, i + dir));
        st[key] = steps[i];
        if (key === 'hintDelay' && st.swapDelay <= st.hintDelay) st.swapDelay = Math.min(7200, st.hintDelay + 60);
        save(); refresh();
      }
      SQ.tap(minus, function () { move(-1); }); SQ.tap(plus, function () { move(1); });
      sp.appendChild(minus); sp.appendChild(val); sp.appendChild(plus);
      row.appendChild(sp);
      c.appendChild(row);
    }
    function toggle(parent, label, small, get, set, cls) {
      var row = SQ.h('div', 'a-set ' + cls, '<div class="l">' + SQ.esc(label) + (small ? '<small>' + SQ.esc(small) + '</small>' : '') + '</div>');
      var t = SQ.h('button', 'toggle' + (get() ? ' on' : ''));
      t.setAttribute('aria-pressed', get() ? 'true' : 'false');
      SQ.tap(t, function () { set(!get()); save(); SQ.applySettings(); refresh(); });
      row.appendChild(t);
      parent.appendChild(row);
    }
    stepper('Hint after', 'Ollie shows a hint when stuck', 'hintDelay', [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 600], 'set-hint');
    stepper('Easier question after', 'Swaps in an easier question', 'swapDelay', [30, 60, 90, 120, 180, 240, 300, 420, 600, 900, 1200, 1800], 'set-swap');
    toggle(c, 'Countdown timer', 'Show a timer ring on each question', function () { return st.countdownOn; }, function (v) { st.countdownOn = v; }, 'set-countdown');
    if (st.countdownOn) stepper('Countdown length', 'Hint shows when it runs out', 'countdownSecs', [10, 15, 20, 30, 45, 60, 90, 120, 180], 'set-cdsecs');

    var g = card(body, 'Game');
    c = g;
    stepper('Questions per level', '5 to 8', 'perLevel', [5, 6, 7, 8], 'set-per', function (v) { return v; });
    toggle(g, 'Voice', 'Narrator reads everything aloud', function () { return st.voiceOn; }, function (v) { st.voiceOn = v; }, 'set-voice');
    S().SUBJECTS.forEach(function (sub) {
      toggle(g, SQ.WORLD[sub].name, SQ.WORLD[sub].sub + ' on the menu', function () { return st.subjects[sub] !== false; }, function (v) {
        st.subjects[sub] = v;
        if (!S().SUBJECTS.some(function (k) { return st.subjects[k] !== false; })) st.subjects[sub] = true;
      }, 'set-subj-' + sub);
    });

    var p = card(body, 'Change PIN');
    var l = SQ.h('label', 'a-field', 'New 4-digit PIN');
    var input = SQ.h('input', 'new-pin');
    input.setAttribute('inputmode', 'numeric'); input.setAttribute('maxlength', '4'); input.setAttribute('autocomplete', 'off');
    l.appendChild(input);
    p.appendChild(l);
    var m = SQ.h('div', 'pin-result');
    p.appendChild(abtn('Save PIN', 'primary save-pin', function () {
      if (S().setPin(SQ.state, input.value.trim())) { save(); m.className = 'a-ok pin-result'; m.textContent = 'PIN changed.'; input.value = ''; }
      else { m.className = 'a-err pin-result'; m.textContent = 'Use exactly 4 digits.'; }
    }));
    p.appendChild(m);
  };

  /* 4. Progress report */
  function fmtTime(ms) {
    var m = Math.round(ms / 60000);
    return m < 1 ? (ms > 0 ? '<1 min' : '—') : m < 60 ? m + ' min' : Math.floor(m / 60) + 'h ' + (m % 60) + 'm';
  }
  function fmtDate(t) { if (!t) return '—'; var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }
  PANELS.report = function (body) {
    var t = S().totals(SQ.state);
    var c = card(body, SQ.state.name + "'s progress");
    var ms = 0, n = 0, ok = 0;
    S().SUBJECTS.forEach(function (s) { var x = SQ.state.subjectStats[s]; ms += x.ms; n += x.n; ok += x.ok; });
    c.appendChild(SQ.h('div', 'a-big', '<div><b>' + t.stars + '</b><span>stars</span></div><div><b>' + t.levels + '</b><span>levels passed</span></div>' +
      '<div><b>' + (n ? Math.round(100 * ok / n) + '%' : '—') + '</b><span>first try</span></div><div><b>' + fmtTime(ms) + '</b><span>time</span></div>'));
    S().SUBJECTS.forEach(function (sub) {
      var mod = SQ.subjects[sub], x = SQ.state.subjectStats[sub];
      var sc = card(body, SQ.WORLD[sub].name + ' — ' + S().subjectStars(SQ.state, sub) + '/' + mod.levels.length * 3 + ' ⭐');
      sc.classList.add('report-' + sub);
      sc.appendChild(SQ.h('div', 'a-note', 'Answered ' + x.n + ' · ' + (x.n ? Math.round(100 * x.ok / x.n) + '% first try' : 'no answers yet') + ' · ' + fmtTime(x.ms) + ' · last played ' + fmtDate(x.last)));
      var rows = '';
      Object.keys(mod.skills).forEach(function (k) {
        var e = SQ.state.skills[k];
        if (!e || !e.n) { rows += '<tr><td>' + SQ.esc(mod.skills[k]) + '</td><td class="n">—</td><td class="n">0</td><td class="n">—</td></tr>'; return; }
        var acc = Math.round(100 * e.ok / e.n);
        var recent = e.recent.length ? Math.round(100 * e.recent.reduce(function (a, b) { return a + b; }, 0) / e.recent.length) : acc;
        rows += '<tr><td>' + SQ.esc(mod.skills[k]) + '<div class="a-bar"><i style="width:' + acc + '%;background:' + (acc >= 80 ? '#37b24d' : acc >= 60 ? '#f59f00' : '#e03131') + '"></i></div></td>' +
          '<td class="n">' + acc + '%<br><small>now ' + recent + '%</small></td><td class="n">' + e.n + '</td><td class="n">' + fmtTime(e.ms) + '<br><small>' + fmtDate(e.last) + '</small></td></tr>';
      });
      sc.insertAdjacentHTML('beforeend', '<table class="a-table"><tr><th>Skill</th><th class="n">Accuracy</th><th class="n">Qs</th><th class="n">Time / last</th></tr>' + rows + '</table>');
    });
    var r = card(body, 'Recent sessions');
    var ses = SQ.state.sessions.slice(-12).reverse();
    if (!ses.length) r.appendChild(SQ.h('div', 'a-note', 'No sessions yet.'));
    else r.insertAdjacentHTML('beforeend', '<table class="a-table"><tr><th>When</th><th>Level</th><th class="n">Score</th><th class="n">Stars</th></tr>' +
      ses.map(function (x) {
        var mod = SQ.subjects[x.s], lv = mod && mod.levels[x.l];
        return '<tr><td>' + fmtDate(x.at) + '</td><td>' + (SQ.WORLD[x.s] ? SQ.WORLD[x.s].sub : x.s) + ' ' + (x.l + 1) + (lv ? ' · ' + SQ.esc(lv.title) : '') + '</td><td class="n">' + x.ok + '/' + x.n + '</td><td class="n">' + '⭐'.repeat(x.stars) + '</td></tr>';
      }).join('') + '</table>');
  };

  /* 5. Transfer */
  PANELS.transfer = function (body, refresh) {
    var ex = card(body, 'Export');
    ex.appendChild(SQ.h('div', 'a-note', 'Copy this code to move progress, settings and your questions to another device.'));
    var lt = SQ.h('label', 'a-field', '');
    var out = SQ.h('textarea', 'export-code');
    out.readOnly = true;
    out.value = 'Making code…';
    lt.appendChild(out);
    ex.appendChild(lt);
    var info = SQ.h('div', 'a-note export-info');
    ex.appendChild(info);
    var row = SQ.h('div', 'a-row');
    var copied = SQ.h('span', 'a-ok copy-result');
    row.appendChild(abtn('Copy', 'primary copy-code', function () {
      var done = function () { copied.textContent = 'Copied!'; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(out.value).then(done, function () { out.select(); try { document.execCommand('copy'); done(); } catch (e) {} });
      else { out.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
    }));
    if (navigator.share) row.appendChild(abtn('Share', 'share-code', function () { navigator.share({ title: "Salah's Learning Quest", text: out.value }).catch(function () {}); }));
    row.appendChild(copied);
    ex.appendChild(row);
    S().exportCode(SQ.state).then(function (code) {
      out.value = code;
      info.textContent = S().preview(SQ.state) + ' · ' + code.length + ' characters';
    }, function () { out.value = 'Could not make a code on this device.'; });

    var im = card(body, 'Import');
    im.appendChild(SQ.h('div', 'a-note', 'Paste a code from another device. This replaces the progress on this device.'));
    var li = SQ.h('label', 'a-field', '');
    var inp = SQ.h('textarea', 'import-code');
    inp.setAttribute('placeholder', 'SQ1-…');
    li.appendChild(inp);
    im.appendChild(li);
    var res = SQ.h('div', 'import-result');
    im.appendChild(abtn('Check code', 'primary check-code', function () {
      res.className = 'import-result a-note'; res.textContent = 'Checking…';
      S().importCode(inp.value).then(function (r) {
        res.innerHTML = '';
        res.className = 'import-result';
        res.appendChild(SQ.h('div', 'a-ok import-preview', SQ.esc(r.preview)));
        var b = abtn('Replace progress with this', 'danger apply-import', function () {
          confirmBox('Replace everything on this device with "' + r.preview + '"?', function () {
            SQ.state = r.state; save(); SQ.applySettings();
            res.innerHTML = '<div class="a-ok import-done">Done! Progress restored.</div>';
          });
        });
        res.appendChild(b);
      }, function (e) {
        res.className = 'import-result a-err import-error';
        res.textContent = e && e.message ? e.message : 'That code does not work.';
      });
    }));
    im.appendChild(res);
  };
})();
