/* Parents area: numpad PIN (1994, wrong PIN shakes gently), then the options from the brief. SI.parents. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on, P = SI.progress, CUR = SI.curriculum, ISL = SI.islands;

  function open() {
    var pop = ui.popup({ title: 'Parents', headCls: 'blue', cls: 'parents' }), pin = '', b = pop.body;
    b.innerHTML = '<div class="pin-msg">Grown-ups: enter the PIN</div>';
    var dots = el('div', 'pin-dots'); for (var i = 0; i < P.PIN_LENGTH; i++) dots.appendChild(el('i')); b.appendChild(dots);
    var pad = el('div', 'numpad'); b.appendChild(pad);
    function paint() { Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k < pin.length); }); }
    function press(k) {
      if (k === 'del') pin = pin.slice(0, -1); else if (pin.length < P.PIN_LENGTH) pin += k;
      paint();
      if (pin.length === P.PIN_LENGTH) {
        if (P.checkPin(pin)) { var ok = pin; pop.close(true); options(ok); }
        else { pop.el.classList.remove('shake'); void pop.el.offsetWidth; pop.el.classList.add('shake'); SI.audio.play('nope'); pin = ''; setTimeout(paint, 250); }
      }
    }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].forEach(function (k) {
      var bt = el('button', 'key' + (k === '' ? ' blank' : ''), k === 'del' ? '⌫' : k); if (k !== '') on(bt, function () { press(k); }); pad.appendChild(bt);
    });
  }

  function options(pin) {
    var S = A.S, pop = ui.popup({ title: 'Parents', headCls: 'blue', cls: 'parents opts' }), b = pop.body;
    function apply(action, arg, msg) {
      var r = P.parentsAction(A.S, pin, action, arg);
      if (!r.ok) { ui.toast(r.reason === 'arg' ? 'Please type a number' : r.reason === 'last' ? 'At least one subject stays on' : 'Not done'); return false; }
      A.persist(); if (SI.home) SI.home.refresh(); ui.toast(msg || 'Done'); return true;
    }
    function sect(t) { b.appendChild(el('div', 'sect', t)); }
    function numRow(label, ph, action, msg) {
      var row = el('div', 'prow2'); row.innerHTML = '<label>' + label + '</label>';
      var inp = el('input'); inp.type = 'number'; inp.inputMode = 'numeric'; inp.placeholder = ph; inp.min = '1';
      var bt = el('button', 'btn green small', 'Give'); on(bt, function () { if (apply(action, inp.value, msg)) inp.value = ''; }); row.append(inp, bt); b.appendChild(row);
    }
    sect('Islands');
    var ir = el('div', 'prow2 wrap'); ISL.list.forEach(function (i) { var bt = el('button', 'btn small purple', '' + i.n); on(bt, function () { apply('unlockIsland', i.n, 'Islands up to ' + i.n + ' unlocked'); }); ir.appendChild(bt); });
    var all = el('button', 'btn small orange', 'Unlock all'); on(all, function () { apply('unlockAll', null, 'All islands unlocked'); }); ir.appendChild(all); b.appendChild(ir);
    sect('Rewards'); numRow('Give coins', '100', 'giveCoins', 'Coins given'); numRow('Give XP', '100', 'giveXp', 'XP given');
    sect('Learning');
    var dr = el('div', 'seg'); ['easier', 'normal', 'harder'].forEach(function (d) {
      var bt = el('button', 'segb' + (A.S.settings.difficulty === d ? ' on' : ''), d[0].toUpperCase() + d.slice(1)); on(bt, function () { if (apply('setDifficulty', d, 'Difficulty: ' + d)) { Array.prototype.forEach.call(dr.children, function (c) { c.classList.remove('on'); }); bt.classList.add('on'); } }); dr.appendChild(bt);
    }); b.appendChild(dr);
    CUR.SUBJECTS.forEach(function (s) {
      var row = el('div', 'prow2'); row.innerHTML = '<label>' + CUR.SUBJECT_NAMES[s] + '</label>';
      var sw = el('button', 'switch' + (A.S.settings.subjects[s] ? ' on' : ''), '<i></i><span>' + (A.S.settings.subjects[s] ? 'On' : 'Off') + '</span>');
      on(sw, function () { var v = !A.S.settings.subjects[s]; if (apply('setSubject', { subject: s, on: v })) { sw.classList.toggle('on', v); sw.lastChild.textContent = v ? 'On' : 'Off'; } }); row.appendChild(sw); b.appendChild(row);
    });
    var rep = el('button', 'btn blue small wide', '📊 Learning report'); on(rep, function () { report(pin); }); b.appendChild(rep);
    sect('Sound');
    [['Sound', 'setSound', 'sound'], ['Music', 'setMusic', 'music']].forEach(function (x) {
      var row = el('div', 'prow2'); row.innerHTML = '<label>' + x[0] + '</label>';
      var sw = el('button', 'switch' + (A.S.settings[x[2]] ? ' on' : ''), '<i></i><span>' + (A.S.settings[x[2]] ? 'On' : 'Off') + '</span>');
      on(sw, function () { var v = !A.S.settings[x[2]]; apply(x[1], v); if (x[2] === 'sound') SI.audio.setSound(v); else SI.audio.setMusic(v); sw.classList.toggle('on', v); sw.lastChild.textContent = v ? 'On' : 'Off'; }); row.appendChild(sw); b.appendChild(row);
    });
    sect('Start again');
    var rb = el('button', 'btn red small wide', 'Reset all progress');
    on(rb, function () {
      if (rb.dataset.sure) { apply('reset', 'confirm', 'Progress reset'); pop.close(true); SI.audio.setSound(true); SI.audio.setMusic(true); ui.go('intro'); return; }
      rb.dataset.sure = '1'; rb.textContent = 'Really? Tap again'; setTimeout(function () { delete rb.dataset.sure; rb.textContent = 'Reset all progress'; }, 3000);
    }); b.appendChild(rb);
  }

  function report(pin) {
    var r = P.parentsAction(A.S, pin, 'report'), pop = ui.popup({ title: 'Learning report', headCls: 'blue', cls: 'parents opts' });
    if (!r.ok) return;
    CUR.SUBJECTS.forEach(function (s) {
      var o = r.report[s], h = '<div class="rsub"><b>' + CUR.SUBJECT_NAMES[s] + '</b> <span>' + (o.seen ? o.accuracy + '% first-try · ' + o.seen + ' answered' : 'nothing yet') + '</span></div>';
      o.skills.slice(0, 6).forEach(function (k) { h += '<div class="rsk"><span>' + ui.esc(k.name) + '</span><span>' + k.accuracy + '% (' + k.seen + ')</span></div>'; });
      pop.body.appendChild(el('div', 'rblock', h));
    });
  }
  SI.parents = { open: open };
})(typeof self !== 'undefined' ? self : this);
