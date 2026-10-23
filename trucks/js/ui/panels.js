/* Workshop panels: repair tasks + choice picker + vehicle complete, Vehicles album, Trophies, Paint Shop, Settings,
 * chest opening, daily gift, boosters info. TW.panels. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {}, UI = TW.ui, A = TW.app, el = UI.el, $ = UI.$, on = UI.on, icon = UI.icon;
  var P = TW.progress, V = TW.vehicles;
  var N = {};

  var BNAME = { rocket: 'Rocket', dynamite: 'Dynamite', rainbow: 'Rainbow Gem', hammer: 'Hammer', shuffle: 'Shuffle' };
  var BHELP = { rocket: 'Starts on the board', dynamite: 'Starts on the board', rainbow: 'Starts on the board', hammer: 'Breaks one tile', shuffle: 'Mixes the tiles' };
  N.BNAME = BNAME;

  function doneMap(info, n) { var m = {}; info.tasks.slice(0, n).forEach(function (t) { m[t.id] = true; }); return m; }
  /** Small canvas with a vehicle. opts: n = tasks done (default all), choices, silhouette */
  function vehCanvas(idx, w, h, o) {
    o = o || {};
    var info = V.vehicleInfo(idx), dpr = Math.min(2, root.devicePixelRatio || 1), c = el('canvas', 'vcv');
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.width = w + 'px'; c.style.height = h + 'px';
    var g = c.getContext('2d'); g.scale(dpr, dpr);
    var n = o.n == null ? info.tasks.length : o.n, ch = o.choices || A.S.ws.choices[idx] || {};
    TW.vehicle.draw(g, info, { done: o.done || doneMap(info, n), choices: ch, t: 0 }, 0, 0, w, h);
    if (o.silhouette) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,24,44,.92)'; g.fillRect(0, 0, w, h); }
    return c;
  }
  N.vehCanvas = vehCanvas;

  function costHtml(n) { return '<span class="cost">' + icon('wrench', 'cico') + '<b>' + n + '</b></span>'; }

  /* ------------------------------------------------------------ tasks */
  N.openTasks = function () {
    var S = A.S, cur = P.currentVehicle(S), list = P.nextTasks(S, 4);
    var pop = UI.popup({ title: 'Repair Tasks', headCls: 'blue', cls: 'tasks' });
    var b = pop.body;
    var top = el('div', 'tk-top');
    top.appendChild(vehCanvas(S.ws.cur, 150, 82, { n: cur.done }));
    top.appendChild(el('div', 'tk-info', '<div class="tk-name">' + cur.info.name + '</div><div class="tk-prog"><i style="width:' + Math.max(5, cur.percent) + '%"></i></div><div class="tk-cnt">' + cur.done + ' of ' + cur.total + ' fixed</div><div class="tk-have">' + icon('wrench', 'cico') + ' You have <b>' + S.wrenches + '</b></div>'));
    b.appendChild(top);
    var ul = el('div', 'tk-list'); b.appendChild(ul);
    list.forEach(function (it, i) {
      var t = it.task, row = el('div', 'tk-row' + (i === 0 ? ' first' : ' locked'));
      row.innerHTML = '<span class="tk-num">' + (it.index + 1) + '</span><span class="tk-t"><b>' + t.name + '</b>' + (t.choice ? '<small>You choose the ' + (t.choice === 'paint' ? 'colour' : t.choice === 'wheels' ? 'wheel style' : 'light style') + '!</small>' : '') + '</span>' + costHtml(t.cost);
      var btn = el('button', 'btn-green small' + (i === 0 && !it.affordable ? ' dis' : ''), i === 0 ? 'Fix' : icon('lock', 'lk'));
      if (i === 0) on(btn, function () {
        if (!it.affordable) { UI.toast('Win levels to earn more wrenches! 🔧'.replace(' 🔧', '')); TW.audio.play('nope'); return; }
        if (t.choice) { pop.close(true); N.openPicker(t); } else { pop.close(true); N.doFix(t, null); }
      });
      row.appendChild(btn); ul.appendChild(row);
    });
    if (!list.length) ul.innerHTML = '<div class="tk-empty">All done!</div>';
    var go = el('button', 'btn-green wide', 'Play Level ' + S.level); on(go, function () { pop.close(true); TW.play.openPre(S.level); });
    if (list[0] && !list[0].affordable) { var hint = el('div', 'tk-hint', 'Win levels to earn wrenches ' ); hint.insertAdjacentHTML('beforeend', icon('wrench', 'cico')); b.appendChild(hint); b.appendChild(go); }
  };

  N.openPicker = function (task) {
    var S = A.S, idx = S.ws.cur, info = V.vehicleInfo(idx), n = S.ws.done + 1, sel = task.options[0].id;
    var title = task.choice === 'paint' ? 'Pick a colour!' : task.choice === 'wheels' ? 'Pick your wheels!' : 'Pick your lights!';
    var pop = UI.popup({ title: title, headCls: 'blue', cls: 'picker' });
    var row = el('div', 'pk-row'); pop.body.appendChild(row);
    var cards = [];
    task.options.forEach(function (o) {
      var ch = JSON.parse(JSON.stringify(S.ws.choices[idx] || {})); ch[task.choice] = o.id;
      var card = el('button', 'pk-card'); card.appendChild(vehCanvas(idx, 98, 58, { n: n, choices: ch }));
      var lbl = o.main ? '<span class="sw" style="background:linear-gradient(' + o.main + ',' + o.dark + ')"></span>' : '';
      card.appendChild(el('div', 'pk-lbl', lbl + o.name)); card.dataset.id = o.id;
      on(card, function () { sel = o.id; cards.forEach(function (c) { c.classList.toggle('on', c.dataset.id === sel); }); });
      cards.push(card); row.appendChild(card);
    });
    cards[0].classList.add('on');
    var big = el('div', 'pk-big'); pop.body.appendChild(big);
    var fixBtn = el('button', 'btn-green wide', 'Fix ' + costHtml(task.cost)); pop.body.appendChild(fixBtn);
    on(fixBtn, function () { pop.close(true); N.doFix(task, sel); });
  };

  N.doFix = function (task, opt) {
    var S = A.S, info = V.vehicleInfo(S.ws.cur), res = P.fixTask(S, opt);
    if (!res.ok) { UI.toast('Not enough wrenches yet!'); return; }
    A.persist(); TW.home.refresh();
    if (res.completed) TW.home.freeze(res.complete.vehicle);
    TW.home.playFix(task, info, function () {
      TW.home.refresh();
      if (res.completed) N.celebrate(res.complete);
      else if (S.ws.done < info.tasks.length) { var nx = P.nextTasks(S, 1)[0]; if (nx && nx.affordable && TW.home.curTab() === 'workshop') UI.toast('Next: ' + nx.task.name); }
    });
  };

  N.celebrate = function (c) {
    var S = A.S, info = V.vehicleInfo(c.vehicle);
    TW.home.confetti(90); TW.audio.play('win');
    var pop = UI.popup({ title: 'Vehicle complete!', headCls: 'green', cls: 'celebrate', close: false, dismiss: false });
    pop.body.innerHTML = '<div class="cl-name">' + info.name + '</div><div class="cl-sub">Looks amazing!</div><div class="cl-rew">' + icon('coin', 'cico') + ' <b>+' + c.bonusCoins + '</b></div>';
    var btn = el('button', 'btn-green wide', 'Drive it out!'); pop.body.appendChild(btn);
    UI.fly('coin', 6, innerWidth / 2, innerHeight * 0.4, $('#n-coins').parentNode);
    on(btn, function () {
      pop.close(true); TW.home.driveOut(c.vehicle, S.ws.choices[c.vehicle] || {}, function () { TW.home.unfreeze(); TW.home.refresh(); }, function () {
        TW.home.refresh(); UI.toast('New vehicle: ' + V.vehicleInfo(S.ws.cur).name); TW.audio.play('horn');
      });
    });
    A.persist();
  };

  /* ------------------------------------------------------------ vehicles album */
  N.vehicles = function (c) {
    var S = A.S;
    c.innerHTML = '<div class="ptitle-big">Vehicles</div><div class="psub">' + S.ws.album.length + ' finished</div>';
    var grid = el('div', 'grid2'); c.appendChild(grid);
    var cur = P.currentVehicle(S), card = el('div', 'vcard cur');
    card.appendChild(vehCanvas(S.ws.cur, 150, 82, { n: cur.done }));
    card.appendChild(el('div', 'vname', cur.info.name)); card.appendChild(el('div', 'vtag', 'Fixing now · ' + cur.percent + '%'));
    on(card, function () { TW.home.go('workshop'); }); grid.appendChild(card);
    S.ws.album.slice().sort(function (a, b) { return b - a; }).forEach(function (k) {
      var info = V.vehicleInfo(k), cd = el('div', 'vcard');
      cd.appendChild(vehCanvas(k, 150, 82)); cd.appendChild(el('div', 'vname', info.name)); cd.appendChild(el('div', 'vtag done', icon('check', 'ck') + ' Done'));
      on(cd, function () { N.showVehicle(k); }); grid.appendChild(cd);
    });
    for (var u = 1; u <= 2; u++) {
      var uc = el('div', 'vcard lockd'); uc.appendChild(vehCanvas(S.ws.cur + u, 150, 82, { silhouette: true, n: 99 })); uc.appendChild(el('div', 'vname', '???')); uc.appendChild(el('div', 'vtag', 'Coming up'));
      grid.appendChild(uc);
    }
  };
  N.showVehicle = function (k) {
    var info = V.vehicleInfo(k), pop = UI.popup({ title: info.name, headCls: 'blue', cls: 'showveh' });
    pop.body.appendChild(vehCanvas(k, 300, 164)); TW.audio.play('horn');
    var b = el('button', 'btn-green wide', 'Paint Shop'); on(b, function () { pop.close(true); N.paintPick = k; TW.home.go('paint'); TW.home.reloadTab(); }); pop.body.appendChild(b);
  };

  /* ------------------------------------------------------------ trophies */
  var TROPHIES = [
    ['lv', 10, 'Level 10'], ['lv', 25, 'Level 25'], ['lv', 50, 'Level 50'], ['lv', 100, 'Level 100'], ['lv', 214, 'Level 214'], ['lv', 250, 'Level 250'], ['lv', 300, 'Level 300'], ['lv', 400, 'Level 400'], ['lv', 500, 'Level 500'], ['lv', 750, 'Level 750'], ['lv', 1000, 'Level 1000'],
    ['st', 100, '100 stars'], ['st', 250, '250 stars'], ['st', 500, '500 stars'], ['st', 1000, '1000 stars'], ['st', 2000, '2000 stars'],
    ['vh', 1, '1 vehicle'], ['vh', 5, '5 vehicles'], ['vh', 10, '10 vehicles'], ['vh', 20, '20 vehicles'],
    ['w', 10, '10 wins'], ['w', 50, '50 wins'], ['w', 200, '200 wins']
  ];
  N.trophies = function (c) {
    var S = A.S;
    c.innerHTML = '<div class="ptitle-big">Trophies</div>';
    var st = el('div', 'stats');
    [['Level', S.level, 'flag'], ['Stars', S.stats.stars, 'star'], ['Vehicles', S.stats.vehicles, 'car'], ['Wins', S.stats.wins, 'trophy']].forEach(function (s) {
      st.appendChild(el('div', 'stat', '<span class="sico">' + (UI.ICON[s[2]] || UI.ICON.bolt) + '</span><b>' + s[1] + '</b><small>' + s[0] + '</small>'));
    });
    c.appendChild(st);
    var grid = el('div', 'tgrid'); c.appendChild(grid);
    var val = { lv: S.level, st: S.stats.stars, vh: S.stats.vehicles, w: S.stats.wins }, got = 0;
    TROPHIES.forEach(function (t) {
      var ok = val[t[0]] >= t[1]; if (ok) got++;
      grid.appendChild(el('div', 'trophy' + (ok ? ' got' : ''), '<span class="tr-ic">' + UI.ICON.trophy + '</span><small>' + t[2] + '</small>'));
    });
    c.querySelector('.ptitle-big').insertAdjacentHTML('afterend', '<div class="psub">' + got + ' of ' + TROPHIES.length + ' won</div>');
  };

  /* ------------------------------------------------------------ paint shop */
  N.paintPick = -1;
  N.paint = function (c) {
    var S = A.S;
    c.innerHTML = '<div class="ptitle-big">Paint Shop</div>';
    if (!S.ws.album.length) { c.appendChild(el('div', 'psub', 'Finish a vehicle to paint it here!')); return; }
    if (N.paintPick < 0 || S.ws.album.indexOf(N.paintPick) < 0) N.paintPick = S.ws.album[S.ws.album.length - 1];
    var k = N.paintPick, info = V.vehicleInfo(k);
    var strip = el('div', 'strip'); c.appendChild(strip);
    S.ws.album.forEach(function (a) { var t = el('button', 'sthumb' + (a === k ? ' on' : '')); t.appendChild(vehCanvas(a, 66, 38)); on(t, function () { N.paintPick = a; N.paint(c); }); strip.appendChild(t); });
    var prev = el('div', 'ppreview'); prev.appendChild(vehCanvas(k, 300, 164)); prev.appendChild(el('div', 'pname', info.name)); c.appendChild(prev);
    var ch = S.ws.choices[k] || {};
    [['paint', 'Paint'], ['wheels', 'Wheels'], ['lights', 'Lights']].forEach(function (grp) {
      var task = info.tasks.filter(function (t) { return t.choice === grp[0]; })[0]; if (!task) return;
      var row = el('div', 'prow'); row.appendChild(el('div', 'plabel', grp[1]));
      var opts = el('div', 'popts');
      task.options.forEach(function (o) {
        var b = el('button', 'popt' + (ch[grp[0]] === o.id ? ' on' : ''));
        b.innerHTML = (o.main ? '<span class="sw big" style="background:linear-gradient(' + o.main + ',' + o.dark + ')"></span>' : '') + '<span class="on2">' + o.name + '</span>' + (ch[grp[0]] === o.id ? '<span class="tick">' + icon('check') + '</span>' : '<span class="price">' + icon('coin', 'cico') + P.ECON.repaintCost + '</span>');
        on(b, function () {
          var r = P.recustomise(S, k, grp[0], o.id);
          if (!r.ok) { UI.toast(r.reason === 'coins' ? 'Not enough coins yet!' : 'Oops'); TW.audio.play('nope'); return; }
          if (r.cost) { TW.audio.play('fix'); A.persist(); TW.home.refresh(); }
          N.paint(c);
        });
        opts.appendChild(b);
      });
      row.appendChild(opts); c.appendChild(row);
    });
    c.appendChild(el('div', 'psub small', 'Changing a look costs ' + P.ECON.repaintCost + ' coins.'));
  };

  /* ------------------------------------------------------------ settings */
  function fmtDate(iso) {
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], p = iso.split('-');
    return (+p[2]) + ' ' + M[+p[1] - 1] + ' ' + p[0];
  }
  N.versionLabel = function () { var v = root.TW_VERSION; return 'v' + v.version + ' (' + fmtDate(v.date) + ')'; };
  N.settings = function (c) {
    var S = A.S;
    c.innerHTML = '<div class="ptitle-big">Settings</div>';
    var list = el('div', 'slist'); c.appendChild(list);
    function toggle(key, ic, label, fn) {
      var r = el('div', 'srow'); r.innerHTML = '<span class="sri">' + UI.ICON[ic] + '</span><span class="srl">' + label + '</span>';
      var sw = el('button', 'switch' + (S.settings[key] ? ' on' : ''), '<i></i><span>' + (S.settings[key] ? 'On' : 'Off') + '</span>');
      on(sw, function () { S.settings[key] = !S.settings[key]; sw.classList.toggle('on', S.settings[key]); sw.lastChild.textContent = S.settings[key] ? 'On' : 'Off'; fn(S.settings[key]); A.persist(); });
      r.appendChild(sw); list.appendChild(r);
    }
    toggle('sound', 'sound', 'Sound', function (v) { TW.audio.setSound(v); if (v) TW.audio.play('pop'); });
    toggle('music', 'music', 'Music', function (v) { TW.audio.setMusic(v); });
    var up = el('div', 'srow'); up.innerHTML = '<span class="sri">' + UI.ICON.refresh + '</span><span class="srl">Game update<small id="upmsg"></small></span>';
    var ub = el('button', 'btn-green small', 'Update game'); up.appendChild(ub); list.appendChild(up);
    on(ub, function () {
      var msg = $('#upmsg'); msg.textContent = 'Checking…'; ub.classList.add('dis');
      if (!A.updater) { msg.textContent = TW.UPDATE_MSG.latest; ub.classList.remove('dis'); return; }
      A.updater.manualUpdate().then(function (r) { msg.textContent = TW.UPDATE_MSG[r] || TW.UPDATE_MSG.latest; ub.classList.remove('dis'); });
    });
    var pr = el('div', 'srow'); pr.innerHTML = '<span class="sri">' + UI.ICON.lock + '</span><span class="srl">Grown-ups only</span>';
    var pb = el('button', 'btn-blue small', icon('lock', 'lk') + ' Parents'); on(pb, function () { TW.parents.open(); }); pr.appendChild(pb); list.appendChild(pr);
    c.appendChild(el('div', 'vlabel', 'Salah\'s Truck Workshop<br><span id="ver">' + N.versionLabel() + '</span>'));
  };

  /* ------------------------------------------------------------ chest / daily / boosters */
  function rewardRow(items) {
    var r = el('div', 'rewards');
    items.forEach(function (it) {
      var d = el('div', 'rw'); d.appendChild(it.icon); d.appendChild(el('b', null, '+' + it.n)); if (it.label) d.appendChild(el('small', null, it.label)); r.appendChild(d);
    });
    return r;
  }
  function svgIcon(name) { var d = el('span', 'rwi', UI.ICON[name]); return d; }

  N.chestTap = function () {
    var S = A.S;
    if (!P.chestFull(S)) {
      var need = P.chestNeed(S.chest.no), pop = UI.popup({ title: 'Chest NO.' + S.chest.no, headCls: 'gold', cls: 'chestinfo' });
      pop.body.innerHTML = '<div class="bigchest">' + UI.ICON.chest + '</div><div class="cinfo">Earn stars in levels to fill the chest!</div><div class="tk-prog wide"><i style="width:' + Math.max(5, P.chestPercent(S)) + '%"></i></div><div class="cnt">' + S.chest.stars + ' / ' + need + ' ' + icon('star', 'cico') + '</div>';
      return;
    }
    var r = P.openChest(S); A.persist();
    var pop2 = UI.popup({ title: 'Chest NO.' + r.no + '!', headCls: 'gold', cls: 'chestopen', close: false, dismiss: false });
    var ch = el('div', 'bigchest shake', UI.ICON.chest); pop2.body.appendChild(ch);
    TW.audio.play('ratchet');
    setTimeout(function () {
      ch.classList.remove('shake'); ch.classList.add('opened'); TW.audio.play('win'); TW.home.confetti(40);
      var items = [{ icon: svgIcon('coin'), n: r.coins }, { icon: svgIcon('wrench'), n: r.wrenches }];
      Object.keys(r.boosters).forEach(function (k) { items.push({ icon: UI.boosterIcon(k, 44), n: r.boosters[k], label: BNAME[k] }); });
      pop2.body.appendChild(rewardRow(items));
      var ok = el('button', 'btn-green wide', 'Collect!'); pop2.body.appendChild(ok);
      on(ok, function () {
        var rc = ok.getBoundingClientRect(); pop2.close(true);
        UI.fly('coin', 8, rc.left + rc.width / 2, rc.top, $('#n-coins').parentNode); UI.fly('wrench', 4, rc.left + rc.width / 2, rc.top, $('#n-wr').parentNode);
        TW.home.refresh();
      });
    }, 900);
  };

  N.openDaily = function () {
    var S = A.S, r = P.openDaily(S, UI.today());
    if (!r) { var p0 = UI.popup({ title: 'Daily Gift', headCls: 'gold', cls: 'daily' }); p0.body.innerHTML = '<div class="bigchest">' + UI.ICON.gift + '</div><div class="cinfo">Come back tomorrow for a new gift!</div>'; return; }
    A.persist(); TW.home.refresh(); TW.audio.play('win');
    var pop = UI.popup({ title: 'Daily Gift!', headCls: 'gold', cls: 'daily', close: false, dismiss: false });
    var g = el('div', 'bigchest bounce', UI.ICON.gift); pop.body.appendChild(g);
    pop.body.appendChild(rewardRow([{ icon: UI.boosterIcon(r.booster, 56), n: r.n, label: BNAME[r.booster] }]));
    var ok = el('button', 'btn-green wide', 'Yay!'); pop.body.appendChild(ok); on(ok, function () { pop.close(true); TW.home.refresh(); });
    TW.home.confetti(30);
  };

  N.boostersInfo = function () {
    var S = A.S, pop = UI.popup({ title: 'My Boosters', headCls: 'blue', cls: 'binfo' });
    P.BOOSTERS.forEach(function (k) {
      var r = el('div', 'brow'); r.appendChild(UI.boosterIcon(k, 46)); r.appendChild(el('span', 'bn', '<b>' + BNAME[k] + '</b><small>' + BHELP[k] + '</small>')); r.appendChild(el('span', 'bc', 'x' + S.boosters[k])); pop.body.appendChild(r);
    });
    pop.body.appendChild(el('div', 'psub small', 'Win levels, open chests and the daily gift to get more!'));
  };

  TW.panels = N;
})(typeof self !== 'undefined' ? self : this);
