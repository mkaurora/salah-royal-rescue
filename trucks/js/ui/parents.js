/* Parents area: numpad PIN (1994, wrong PIN shakes gently), then the options from the brief. TW.parents. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {}, UI = TW.ui, A = TW.app, el = UI.el, on = UI.on, icon = UI.icon, P = TW.progress;

  function open() {
    var pop = UI.popup({ title: 'Parents', headCls: 'blue', cls: 'parents' }), pin = '';
    var b = pop.body;
    b.innerHTML = '<div class="pin-msg">Grown-ups: enter the PIN</div>';
    var dots = el('div', 'pin-dots'); for (var i = 0; i < P.PIN_LENGTH; i++) dots.appendChild(el('i'));
    b.appendChild(dots);
    var pad = el('div', 'numpad'); b.appendChild(pad);
    function paint() { Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k < pin.length); }); }
    function press(k) {
      if (k === 'del') pin = pin.slice(0, -1);
      else if (pin.length < P.PIN_LENGTH) pin += k;
      paint();
      if (pin.length === P.PIN_LENGTH) {
        if (P.checkPin(pin)) { var ok = pin; pop.close(true); options(ok); }
        else { pop.el.classList.remove('shake'); void pop.el.offsetWidth; pop.el.classList.add('shake'); TW.audio.play('nope'); pin = ''; setTimeout(paint, 250); }
      }
    }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].forEach(function (k) {
      var bt = el('button', 'key' + (k === '' ? ' blank' : ''), k === 'del' ? '⌫' : k);
      if (k !== '') on(bt, function () { press(k); });
      pad.appendChild(bt);
    });
  }

  function options(pin) {
    var pop = UI.popup({ title: 'Parents', headCls: 'blue', cls: 'parents opts' }), b = pop.body;
    function apply(action, arg, msg) {
      var r = P.parentAction(A.S, pin, action, arg);
      if (!r.ok) { UI.toast(r.reason === 'arg' ? 'Please type a number' : 'Not done'); return false; }
      A.S = r.state; A.persist(); TW.home.refresh(); if (TW.home.curTab() !== 'workshop') TW.home.reloadTab();
      UI.toast(msg || 'Done'); return true;
    }
    function numRow(label, ph, action, msg) {
      var row = el('div', 'prow2'); row.innerHTML = '<label>' + label + '</label>';
      var inp = el('input'); inp.type = 'number'; inp.inputMode = 'numeric'; inp.placeholder = ph; inp.min = '1';
      var bt = el('button', 'btn-green small', 'Set'); bt.textContent = action === 'setLevel' ? 'Set' : 'Give';
      on(bt, function () { if (apply(action, inp.value, msg)) inp.value = ''; });
      row.append(inp, bt); b.appendChild(row); return inp;
    }
    var lv = numRow('Go to level', String(A.S.level), 'setLevel', 'Level changed');
    numRow('Give wrenches (max 1000)', '10', 'wrenches', 'Wrenches given');
    numRow('Give coins (max 10000)', '100', 'coins', 'Coins given');
    numRow('Give boosters (each)', '2', 'boosters', 'Boosters given');
    function tog(label, key) {
      var row = el('div', 'prow2'); row.innerHTML = '<label>' + label + '</label>';
      var sw = el('button', 'switch' + (A.S.settings[key] ? ' on' : ''), '<i></i><span>' + (A.S.settings[key] ? 'On' : 'Off') + '</span>');
      on(sw, function () { var v = !A.S.settings[key]; apply(key, v, label + (v ? ' on' : ' off')); if (key === 'sound') TW.audio.setSound(v); else TW.audio.setMusic(v); sw.classList.toggle('on', v); sw.lastChild.textContent = v ? 'On' : 'Off'; });
      row.appendChild(sw); b.appendChild(row);
    }
    tog('Sound', 'sound'); tog('Music', 'music');
    var row = el('div', 'prow2'); row.innerHTML = '<label>Finish the current vehicle</label>';
    var cb = el('button', 'btn-blue small', 'Complete'); on(cb, function () { apply('completeVehicle', null, 'Vehicle completed'); }); row.appendChild(cb); b.appendChild(row);
    var rr = el('div', 'prow2'); rr.innerHTML = '<label>Start again at Level 214</label>';
    var rb = el('button', 'btn-red small', 'Reset');
    on(rb, function () {
      if (rb.dataset.sure) { apply('reset', 'confirm', 'Progress reset'); pop.close(true); return; }
      rb.dataset.sure = '1'; rb.textContent = 'Really?'; setTimeout(function () { delete rb.dataset.sure; rb.textContent = 'Reset'; }, 3000);
    });
    rr.appendChild(rb); b.appendChild(rr);
  }

  TW.parents = { open: open };
})(typeof self !== 'undefined' ? self : this);
