/* Game controller: interactions from the world (talk / collect / play / build / sail / bridge), NPC dialogue boxes, curriculum
 * question popups (multiple choice, number pad, letter tiles), reward + celebration diffing, quest events. SI.game. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on;
  var P = SI.progress, Q = SI.quests, LEARN = SI.learn, CUR = SI.curriculum, COL = SI.collectibles, ISL = SI.islands, WD = SI.wardrobe, BUILD = SI.build, BI = SI.buildItems;

  function S() { return A.S; }
  function save() { A.persist(); }
  function hudRefresh() { if (SI.world) SI.world.refreshHud(); if (SI.home && ui.current() === 'home') SI.home.refresh(); }
  function coinTarget() { return document.querySelector('.screen:not(.hidden) .chip.coin'); }
  function fly(kind, n, from) {
    var tg = coinTarget(); if (!tg) return; var r = from ? from.getBoundingClientRect() : null;
    ui.fly(kind, n, r ? r.left + r.width / 2 : innerWidth / 2, r ? r.top + r.height / 2 : innerHeight / 2, tg);
  }

  /* ------------------------------------------------------------------ rewards diff */
  function snap() {
    var s = S(), met = {}; WD.items.concat(BI.items).forEach(function (it) { if (it.req && P.reqMet(s, it.req)) met[it.id] = true; });
    return { met: met, level: s.level, ach: Object.keys(s.achievements).length, achIds: Object.keys(s.achievements), isl: s.islands.unlocked.length, owned: Object.keys(s.owned), coins: s.coins, gems: s.gems };
  }
  /** run fn (a state-changing action) and celebrate whatever it unlocked: levels, trophies, islands, new items */
  function track(fn) {
    var b = snap(), res = fn(), a = snap();
    celebrateDiff(b, a); save(); hudRefresh();
    return res;
  }
  function celebrateDiff(b, a) {
    var s = S();
    if (a.achIds.length > b.achIds.length) a.achIds.filter(function (id) { return b.achIds.indexOf(id) < 0; }).forEach(function (id) {
      var ac = SI.achievements.byId[id], r = ac.reward;
      ui.celebrate({ title: 'Trophy!', headCls: 'purple', sound: 'quest', html: '<div class="bigemoji">' + ac.icon + '</div><h3>' + ui.esc(ac.name) + '</h3><p>' + ui.esc(ac.desc) + '</p>' + rewardLine(r) });
    });
    var news = WD.items.concat(BI.items).filter(function (it) { return it.req && a.met[it.id] && !b.met[it.id] && !s.owned[it.id] && !(BI.byId[it.id] && s.build.owned[it.id]); });
    var newsHtml = news.length ? '<div class="unl"><small>Now in the shop:</small><div class="unlrow">' + news.slice(0, 8).map(function (it) { return '<span title="' + ui.esc(it.name) + '">' + it.icon + '</span>'; }).join('') + '</div><p class="sm">' + ui.esc(news.slice(0, 4).map(function (it) { return it.name; }).join(', ')) + (news.length > 4 ? ' and more' : '') + '</p></div>' : '';
    if (a.level > b.level) {
      var c = 0, gm = 0; for (var L = b.level + 1; L <= a.level; L++) { var r2 = P.levelReward(L); c += r2.coins; gm += r2.gems; }
      ui.celebrate({ title: 'Level up!', html: '<div class="lvbig">' + a.level + '</div><p>You are now level ' + a.level + '!</p>' + rewardLine({ coins: c, gems: gm }) + newsHtml, sound: 'levelup' });
    } else if (news.length) ui.celebrate({ title: 'Unlocked!', headCls: 'blue', sound: 'quest', html: '<div class="bigemoji">🛍️</div><p>New things to buy!</p>' + newsHtml });
    if (a.isl > b.isl) {
      var n = s.islands.unlocked[s.islands.unlocked.length - 1], isl = ISL.byId[n];
      ui.celebrate({ title: 'New island!', headCls: 'teal', sound: 'quest', html: '<div class="bigemoji">🏝️</div><h3>' + ui.esc(isl.name) + '</h3><p>A boat is waiting at the dock. Open the Island Map to sail there!</p>' });
    }
    var fresh = a.owned.filter(function (id) { return b.owned.indexOf(id) < 0 && WD.byId[id]; });
    if (fresh.length) {
      var html = '<div class="thumbs">' + fresh.slice(0, 6).map(function (id) { return '<div class="th" data-id="' + id + '"></div>'; }).join('') + '</div><p>' + fresh.map(function (id) { return ui.esc(WD.byId[id].name); }).join(', ') + '</p><p class="sm">Find it in your wardrobe.</p>';
      ui.celebrate({ title: 'New outfit!', headCls: 'pink', sound: 'quest', html: html, onShow: function (p) { Array.prototype.forEach.call(p.body.querySelectorAll('.th'), function (d) { var it = WD.byId[d.getAttribute('data-id')]; d.appendChild(SI.avatar.thumb(S().avatar, it.slot, it.id, 72)); }); } });
    }
  }
  function rewardLine(r) {
    var h = '<div class="rewards">';
    if (r.coins) h += '<span class="rw">' + ui.icon('coin') + '+' + r.coins + '</span>';
    if (r.gems) h += '<span class="rw">' + ui.icon('gem') + '+' + r.gems + '</span>';
    if (r.xp) h += '<span class="rw xp">XP +' + r.xp + '</span>';
    return h + '</div>';
  }

  /** quest events → toasts / chain celebration */
  function questEvents(events) {
    if (!events || !events.length) return;
    events.forEach(function (e) {
      if (e.type === 'step') {
        var step = SI.questData.stepById[e.step];
        setTimeout(function () { ui.toast('✔ ' + (step ? step.text : 'Step done') + '  +' + (e.reward.coins || 0) + ' 🪙', 2400); }, 300);
        SI.audio.play('quest');
        var b = document.querySelector('.tracker'); if (b) { b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash'); }
        fly('coin', 5, null);
      } else if (e.type === 'chain') {
        var ch = SI.questData.byId[e.chain], r = ch.reward, names = [];
        (r.wardrobe || []).forEach(function (id) { names.push(WD.byId[id].name); }); (r.build || []).forEach(function (id) { names.push(BI.byId[id].name); });
        ui.celebrate({ title: 'Quest complete!', html: '<div class="bigemoji">🎉</div><h3>' + ui.esc(ch.title) + '</h3>' + rewardLine(r) + (names.length ? '<p class="sm">New: ' + ui.esc(names.join(', ')) + '</p>' : ''), sound: 'levelup' });
      }
    });
    if (SI.world && ui.current() === 'world') SI.world.refresh();
    hudRefresh();
  }
  function advance() { var ev = track(function () { return Q.advance(S()); }); questEvents(ev); }

  /* ------------------------------------------------------------------ dialogue */
  var DLG = null;
  function say(npcId, lines, done, opts) {
    opts = opts || {};
    var npc = null; ISL.list.forEach(function (i) { i.npcs.forEach(function (n) { if (n.id === npcId) npc = n; }); });
    var p = ui.popup({ cls: 'dlg', dismiss: false, close: false }); p.dim.classList.add('dlgdim');
    var b = p.body, i = 0, typing = 0, full = '';
    var port = el('div', 'dportrait'); var spr = SI.sprites.npc(npcId, 2); var cvp = document.createElement('canvas'); cvp.width = 96 * 2; cvp.height = 96 * 2; cvp.getContext('2d').drawImage(spr.c, 0, 0, 192, 192); port.appendChild(cvp);
    var box = el('div', 'dbox'); box.innerHTML = '<div class="dname">' + ui.esc(npc ? npc.name : '') + '</div><div class="dtext"></div><div class="dnext">▼</div>';
    b.append(port, box); var tx = box.querySelector('.dtext');
    function show() {
      full = lines[i]; var k = 0; clearInterval(typing); tx.textContent = '';
      typing = setInterval(function () { k += 2; tx.textContent = full.slice(0, k); if (k % 6 === 0) SI.audio.play('talk'); if (k >= full.length) { clearInterval(typing); typing = 0; tx.textContent = full; } }, 28);
      box.querySelector('.dnext').textContent = i === lines.length - 1 ? (opts.last || 'OK ✓') : '▼';
    }
    function nextLine() {
      if (typing) { clearInterval(typing); typing = 0; tx.textContent = full; return; }
      SI.audio.play('tap'); i++;
      if (i >= lines.length) { p.close(true); if (done) done(); } else show();
    }
    b.addEventListener('click', nextLine); show();
    return p;
  }

  /* ------------------------------------------------------------------ questions */
  function pickMode(q, S0) {
    if (q.mode) return q.mode;
    var tier = q.tier || 1, r = Math.random();
    if (q.subject === 'math' && /^\d+$/.test(String(q.answer)) && String(q.answer).length <= 4 && tier >= 2 && r < 0.5) return 'pad';
    if (q.skill === 'en-spell' && /^[a-z]{3,8}$/.test(String(q.answer)) && r < 0.5) return 'tiles';
    return 'choice';
  }
  var SUBJ_ICON = { math: '🔢', english: '📖', science: '🔬' };

  /** Ask one question in a popup body. cb(result) once solved. Never a hard fail: wrong = shake + hint, same question stays. */
  function askOne(host, q, cb, head) {
    var mode = pickMode(q), tries = 0, solved = false; host.innerHTML = ''; SI.game.current = { q: q, mode: mode };
    var wrap = el('div', 'qwrap');
    wrap.innerHTML = (head || '') + '<div class="qsub">' + (SUBJ_ICON[q.subject] || '') + ' ' + ui.esc(CUR.SUBJECT_NAMES[q.subject] || '') + '</div>' + (q.pic ? '<div class="qpic">' + q.pic + '</div>' : '');
    var qt = el('div', 'qtext'); qt.textContent = mode === 'tiles' ? 'Spell the word. Look carefully first!' : q.text; wrap.appendChild(qt);
    var hint = el('div', 'qhint hidden'); var area = el('div', 'qarea'); wrap.append(area, hint); host.appendChild(wrap);
    function wrong(shakeEl) {
      tries++; var r = P.answerQuestion(S(), q, '__wrong__', tries - 1);
      SI.audio.play('wrong'); hint.textContent = '💡 ' + (q.hint || 'Try again, you can do it!'); hint.classList.remove('hidden');
      (shakeEl || wrap).classList.remove('shake'); void (shakeEl || wrap).offsetWidth; (shakeEl || wrap).classList.add('shake'); save();
    }
    function right(from) {
      if (solved) return; solved = true;
      var res = track(function () { return P.answerQuestion(S(), q, q.answer, tries); });
      res.tries = tries; SI.audio.play('correct'); wrap.classList.add('good');
      var burst = el('div', 'qgood', (res.firstTry ? 'Great!' : 'You got it!') + ' <small>+' + res.coins + ' 🪙 +' + res.xp + ' XP</small>'); wrap.appendChild(burst);
      fly('coin', 2, from);
      setTimeout(function () { cb(res); }, 900);
    }
    if (mode === 'choice') {
      area.className = 'qarea opts n' + q.options.length;
      var opts = q.options.slice(); if (q.subject !== 'math' || true) opts = shuffleStable(opts, q.id);
      opts.forEach(function (o) {
        var b = el('button', 'qopt', ui.esc(o)); area.appendChild(b);
        on(b, function () { if (solved || b.classList.contains('off')) return; if (String(o) === String(q.answer)) { b.classList.add('ok'); right(b); } else { b.classList.add('off'); wrong(b); } }, true);
      });
    } else if (mode === 'pad') {
      area.className = 'qarea pad'; var val = ''; var disp = el('div', 'qdisp', '&nbsp;'); area.appendChild(disp); var pad = el('div', 'numpad'); area.appendChild(pad);
      function paint() { disp.textContent = val || '?'; disp.classList.toggle('empty', !val); }
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'go'].forEach(function (k) {
        var b = el('button', 'key' + (k === 'go' ? ' go' : ''), k === 'del' ? '⌫' : k === 'go' ? '✔' : k); pad.appendChild(b);
        on(b, function () {
          if (solved) return;
          if (k === 'del') val = val.slice(0, -1); else if (k === 'go') { if (!val) return; if (val === String(q.answer)) { disp.classList.add('okk'); right(b); } else { wrong(disp); val = ''; } } else if (val.length < 5) val += k;
          paint();
        });
      }); paint();
    } else {   // letter tiles
      area.className = 'qarea tiles'; var word = String(q.answer), got = '';
      var show = el('div', 'qword', ui.esc(word)); area.appendChild(show);
      var slots = el('div', 'slots'); area.appendChild(slots); var bank = el('div', 'bank'); area.appendChild(bank);
      var peek = el('button', 'peek', '👁 Peek'); area.appendChild(peek); on(peek, function () { show.classList.add('on'); setTimeout(function () { show.classList.remove('on'); }, 1500); });
      setTimeout(function () { show.classList.remove('on'); }, 2200); show.classList.add('on');
      var letters = shuffleStable(word.split('').concat(['e', 'a', 's', 'r', 't'].slice(0, word.length > 4 ? 2 : 1)), q.id + 'x');
      function drawSlots() { slots.innerHTML = ''; for (var i = 0; i < word.length; i++) slots.appendChild(el('i', i < got.length ? 'f' : '', i < got.length ? got.charAt(i) : '')); }
      var tiles = [];
      letters.forEach(function (ch, idx) {
        var b = el('button', 'tile', ch); bank.appendChild(b); tiles.push(b);
        on(b, function () {
          if (solved || b.classList.contains('used')) return;
          if (ch === word.charAt(got.length)) { got += ch; b.classList.add('used'); drawSlots(); if (got === word) right(b); }
          else { wrong(slots); got = ''; tiles.forEach(function (t) { t.classList.remove('used'); }); drawSlots(); }
        }, true);
      }); drawSlots();
    }
  }
  function shuffleStable(arr, seed) { var r = SI.rng.make('opt:' + seed); return SI.rng.shuffle(r, arr); }

  /** A session of `count` correct answers. opts: {island, subject, title, count, startN, portrait, onCorrect(res,q)→events, onDone(totalCorrect), noCelebrate} */
  function session(opts) {
    var n = 0, count = opts.count, popped = false;
    var p = ui.popup({ title: opts.title || 'Question time', headCls: 'blue', cls: 'qcard', dismiss: false, onClose: function () { if (!popped) { popped = true; if (opts.onDone) opts.onDone(n, true); } } });
    function next() {
      if (p.closed) return;
      var q = LEARN.pick(S(), { island: opts.island, subject: opts.subject || 'mix' });
      var head = '<div class="qprog">' + dots(n + (opts.startN || 0), count + (opts.startN || 0)) + '</div>';
      askOne(p.body, q, function (res) {
        n++; if (opts.onCorrect) opts.onCorrect(res, q);
        if (n >= count) { popped = true; p.close(true); if (opts.onDone) opts.onDone(n, false); } else next();
      }, head);
    }
    function dots(i, total) { var h = ''; for (var k = 0; k < total; k++) h += '<i class="' + (k < i ? 'on' : k === i ? 'cur' : '') + '"></i>'; return h; }
    next(); return p;
  }

  /* ------------------------------------------------------------------ interactions */
  function interact(o, isl) {
    if (ui.popupOpen()) return;
    switch (o.kind) {
      case 'npc': return talk(o.id, isl);
      case 'spot': return SI.play.open(o.ref.game, isl.n);
      case 'collectible': return pickup(o.id);
      case 'zone': return SI.buildUI.open(isl);
      case 'dock': SI.audio.play('boat'); return ui.go('map', { from: 'world' });
      case 'gate': return gate(isl);
    }
  }

  function talk(npcId, isl) {
    var d = Q.dialogue(S(), npcId, P.isoDay());
    if (d.kind === 'step') {
      var st = d.step;
      if (st.type === 'talk') return say(npcId, st.lines, function () { questEvents(track(function () { return Q.onTalk(S(), npcId); })); });
      if (st.type === 'learn') return say(npcId, st.lines, function () { learnStep(npcId, d.chain, st, isl); }, { last: "Let's go!" });
    }
    if (d.kind === 'helper') {
      var h = d.helper, line = d.lines[Math.floor(Math.random() * d.lines.length)];
      var done = S().helper[h.id] === P.isoDay();
      return say(npcId, [line], function () { helperOffer(npcId, h, done, isl); }, { last: '▶' });
    }
    return say(npcId, [d.lines[Math.floor(Math.random() * d.lines.length)]], null);
  }
  function learnStep(npcId, chain, step, isl) {
    var st = Q.state(S(), chain.id), left = step.need - st.n;
    session({ island: isl.n, subject: step.subject, title: 'Help ' + (ISL.list[chain.island - 1].npcs.filter(function (n) { return n.id === npcId; })[0] || {}).name, count: left, startN: st.n,
      onCorrect: function () { questEvents(track(function () { return Q.onLearnCorrect(S(), npcId); })); },
      onDone: function (n, left2) { if (!left2 && step.win) setTimeout(function () { say(npcId, [step.win], null); }, 250); } });
  }
  function helperOffer(npcId, h, doneToday, isl) {
    var p = ui.popup({ title: h.title, headCls: 'purple', cls: 'offer', dismiss: true });
    p.body.innerHTML = '<div class="bigemoji">🌟</div><p>Answer ' + h.count + ' questions to help out.</p>' + rewardLine({ coins: doneToday ? 0 : h.coins, xp: h.xp }) +
      '<p class="sm">' + (doneToday ? 'Coins come once a day. You still earn XP!' : 'First help today gives coins. No hurry, no timers!') + '</p><div class="btnrow"><button class="btn big green go">Let\'s help!</button><button class="btn big grey no">Not now</button></div>';
    on(p.body.querySelector('.no'), function () { p.close(); });
    on(p.body.querySelector('.go'), function () {
      p.close(true);
      var n = 0;
      session({ island: isl.n, subject: 'mix', title: h.title, count: h.count, onDone: function (c, left) {
        if (left) return;
        var res = track(function () { return P.helperTask(S(), h.island, P.isoDay()); });
        questEvents(Q.advance(S())); save();
        ui.celebrate({ title: 'Thank you!', headCls: 'green', sound: 'quest', html: '<div class="bigemoji">🌟</div><p>You helped out!</p>' + rewardLine({ coins: res.coins, xp: res.xp }) });
      } });
    });
  }

  function gate(isl) {
    var g = isl.gate;
    if (P.gateOpen(S(), g.key)) { ui.toast('The bridge is open!'); return; }
    var p = ui.popup({ title: g.name, headCls: 'orange', cls: 'offer' });
    p.body.innerHTML = '<div class="bigemoji">🌉</div><p>The bridge is broken! Answer ' + g.need + ' ' + (g.subject === 'mix' ? '' : CUR.SUBJECT_NAMES[g.subject].toLowerCase() + ' ') + 'questions to fix it.</p><div class="btnrow"><button class="btn big green go">Fix it!</button></div>';
    on(p.body.querySelector('.go'), function () {
      p.close(true);
      session({ island: isl.n, subject: g.subject, title: g.name, count: g.need, onDone: function (n, left) {
        if (left) return;
        var ev = track(function () { P.openGate(S(), g.key); return Q.advance(S()); });
        SI.audio.play('quest'); ui.toast('🌉 The bridge is fixed!', 2400); questEvents(ev); if (SI.world) SI.world.refresh();
      } });
    });
  }

  function pickup(id) {
    var res = track(function () { return P.collect(S(), id); });
    if (!res.ok) return;
    SI.audio.play('pickup');
    var set = COL.setById[res.item.set], have = set.ids.filter(function (x) { return S().collectibles[x]; }).length;
    var p = ui.popup({ title: 'You found it!', headCls: 'teal', cls: 'found' });
    p.body.innerHTML = '<div class="foundic">' + res.item.icon + '</div><h3>' + ui.esc(res.item.name) + '</h3><p class="fact">' + ui.esc(res.item.fact) + '</p>' +
      rewardLine({ coins: res.coins, xp: res.xp }) + '<div class="setline">' + ui.esc(set.name) + ': <b>' + have + '/' + set.ids.length + '</b>' + (res.setDone ? ' ⭐ Complete! +' + set.coins + ' coins' : '') + '</div><button class="btn big green okbtn">Nice!</button>';
    on(p.body.querySelector('.okbtn'), function () { p.close(); });
    fly('coin', 3, null);
    if (res.setDone) ui.celebrate({ title: 'Set complete!', headCls: 'pink', sound: 'quest', html: '<div class="bigemoji">🏅</div><h3>' + ui.esc(set.name) + '</h3>' + rewardLine({ coins: set.coins, gems: set.gems }) });
    if (SI.world) SI.world.refresh();
    questEvents(Q.advance(S())); save();
  }

  function pauseMenu() {
    var p = ui.popup({ title: 'Menu', headCls: 'purple', cls: 'menu' });
    var rows = [['▶️', 'Keep exploring', function () { p.close(); }], ['🗺️', 'Island map', function () { p.close(true); ui.go('map', { from: 'world' }); }], ['📜', 'Quests & book', function () { p.close(true); SI.panels.questLog(); }],
      ['⚙️', 'Settings', function () { p.close(true); SI.panels.settings(); }], ['🏠', 'Home', function () { p.close(true); ui.go('home'); }]];
    rows.forEach(function (r) { var b = el('button', 'btn menurow', '<span>' + r[0] + '</span>' + r[1]); on(b, r[2]); p.body.appendChild(b); });
  }

  function onEnterIsland(isl) {
    ui.toast(isl.name, 1600);
    var ev = Q.advance(S()); if (ev.length) { questEvents(ev); save(); }
  }

  SI.game = { interact: interact, talk: talk, say: say, session: session, askOne: askOne, track: track, questEvents: questEvents, advance: advance, pauseMenu: pauseMenu, pickup: pickup, gate: gate, onEnterIsland: onEnterIsland, rewardLine: rewardLine, fly: fly, celebrateDiff: celebrateDiff, snap: snap };
})(typeof self !== 'undefined' ? self : this);
