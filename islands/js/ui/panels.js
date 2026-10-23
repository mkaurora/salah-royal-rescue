/* Quest log, collection book, trophies, settings (sound, music, update, version, Parents). SI.panels. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on;
  var P = SI.progress, Q = SI.quests, QD = SI.questData, COL = SI.collectibles, ISL = SI.islands, ACH = SI.achievements;

  function bar(have, need) { return '<div class="pbar"><i style="width:' + Math.round(100 * Math.min(1, have / Math.max(1, need))) + '%"></i></div>'; }
  function tabs(p, names, cur, fn) {
    var t = el('div', 'tabs'); names.forEach(function (n) { var b = el('button', 'tab' + (n[0] === cur ? ' on' : ''), n[1]); on(b, function () { fn(n[0]); }); t.appendChild(b); }); return t;
  }

  var logPop = null;
  function questLog(tab) {
    tab = tab || 'quests';
    if (logPop && !logPop.closed) logPop.close(true);
    var p = logPop = ui.popup({ title: 'My Adventure', headCls: 'purple', cls: 'panel' });
    p.body.appendChild(tabs(p, [['quests', '📜 Quests'], ['book', '📚 Book'], ['trophies', '🏆 Trophies']], tab, function (t) { questLog(t); }));
    var c = el('div', 'tabbody'); p.body.appendChild(c);
    if (tab === 'quests') quests(c); else if (tab === 'book') book(c); else trophies(c);
  }

  function quests(c) {
    var S = A.S, ob = Q.objective(S);
    QD.chains.forEach(function (ch) {
      var st = S.quests[ch.id], avail = Q.available(S, ch), isl = ISL.byId[ch.island];
      var row = el('div', 'qrow' + (st.done ? ' done' : '') + (avail ? '' : ' locked'));
      var h = '<div class="qrt"><b>' + ui.esc(ch.title) + '</b><span>' + ui.esc(isl.name) + '</span></div>';
      if (!avail) h += '<div class="qob">' + ui.icon('lock') + ' ' + ui.esc(P.islandStatus(S, ch.island).reqs.map(function (r) { return r.text; }).join(' · ') || 'Locked') + '</div>';
      else if (st.done) h += '<div class="qob">✔ Finished!</div>';
      else {
        var cur = Q.objective(S, ch.id);
        h += bar(st.step, ch.steps.length) + '<div class="qob now">' + (cur ? 'Now: ' + ui.esc(cur.text) + (cur.step.type === 'talk' ? '' : ' <b>(' + cur.progress.have + '/' + cur.progress.need + ')</b>') : '') + '</div>';
        var steps = '<ol class="qsteps">'; ch.steps.forEach(function (s, i) { steps += '<li class="' + (i < st.step ? 'ok' : i === st.step ? 'cur' : '') + '">' + ui.esc(s.text) + '</li>'; }); h += steps + '</ol>';
      }
      row.innerHTML = h; c.appendChild(row);
    });
    var hh = el('div', 'sect', 'Helper tasks'); c.appendChild(hh);
    QD.helpers.forEach(function (h) {
      if (S.islands.unlocked.indexOf(h.island) < 0) return;
      var done = S.helper[h.id] === P.isoDay();
      c.appendChild(el('div', 'qrow small', '<div class="qrt"><b>' + ui.esc(h.title) + '</b><span>' + ISL.byId[h.island].name + '</span></div><div class="qob">' + (done ? 'Coins collected today. You can still help for XP!' : 'Talk to the ' + ui.esc(ISL.byId[h.island].npcs[0].name) + ' for +' + h.coins + ' coins') + '</div>'));
    });
  }

  function book(c) {
    var S = A.S, tot = COL.completion(S.collectibles);
    c.appendChild(el('div', 'bookhead', '<b>' + tot.have + '/' + tot.total + '</b> found · ' + tot.pct + '%' + bar(tot.have, tot.total) + '<small>Find all ' + tot.total + ' to win the Golden Explorer Cape!</small>'));
    ISL.list.forEach(function (isl) {
      var unlocked = S.islands.unlocked.indexOf(isl.n) >= 0, comp = COL.completion(S.collectibles, isl.n);
      c.appendChild(el('div', 'sect', ui.esc(isl.name) + ' <small>' + comp.have + '/' + comp.total + '</small>'));
      COL.sets.filter(function (s) { return s.island === isl.n; }).forEach(function (set) {
        var done = !!S.sets[set.id], box = el('div', 'bset' + (done ? ' done' : ''));
        box.innerHTML = '<div class="bsn">' + ui.esc(set.name) + (done ? ' ⭐' : '') + '<small>Reward: ' + set.coins + ' 🪙 + ' + set.gems + ' 💎</small></div>';
        var g = el('div', 'bgrid');
        set.ids.forEach(function (id) {
          var it = COL.byId[id], have = !!S.collectibles[id], cell = el('button', 'bcell' + (have ? ' have' : ''), have ? '<span>' + it.icon + '</span>' : '<span>?</span>');
          on(cell, function () { if (!have) { ui.toast(unlocked ? 'Not found yet. Explore ' + isl.name + '!' : 'Unlock ' + isl.name + ' first'); return; } fact(it); }); g.appendChild(cell);
        });
        box.appendChild(g); c.appendChild(box);
      });
    });
  }
  function fact(it) {
    var p = ui.popup({ title: it.name, headCls: 'teal', cls: 'found' });
    p.body.innerHTML = '<div class="foundic">' + it.icon + '</div><p class="fact">' + ui.esc(it.fact) + '</p><button class="btn big green okbtn">OK</button>'; on(p.body.querySelector('.okbtn'), function () { p.close(); });
  }

  function trophies(c) {
    var S = A.S, n = Object.keys(S.achievements).length;
    c.appendChild(el('div', 'bookhead', '<b>' + n + '/' + ACH.list.length + '</b> trophies' + bar(n, ACH.list.length)));
    var g = el('div', 'tgrid'); c.appendChild(g);
    ACH.list.slice().sort(function (x, y) { return (S.achievements[y.id] ? 1 : 0) - (S.achievements[x.id] ? 1 : 0); }).forEach(function (a) {
      var have = !!S.achievements[a.id], b = el('div', 'trow' + (have ? ' have' : ''), '<span class="ti">' + (have ? a.icon : '🔒') + '</span><div><b>' + ui.esc(a.name) + '</b><small>' + ui.esc(a.desc) + '</small><small class="trw">' + (have ? '✔ Earned' : 'Reward: ' + (a.reward.coins || 0) + ' 🪙' + (a.reward.gems ? ' + ' + a.reward.gems + ' 💎' : '')) + '</small></div>'); g.appendChild(b);
    });
  }

  /* ------------------------------------------------------------------ settings */
  function fmtDay(iso) { var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], p = iso.split('-'); return (+p[2]) + ' ' + M[+p[1] - 1] + ' ' + p[0]; }
  function versionLabel() { var v = root.SI_VERSION || SI.version; var day = Object.keys(v).map(function (k) { return v[k]; }).filter(function (x) { return /^\d{4}-\d\d-\d\d$/.test(x); })[0]; return 'v' + v.version + ' (' + fmtDay(day) + ')'; }

  function toggle(label, ic, get, set) {
    var row = el('div', 'srow'); row.innerHTML = '<span class="sl">' + ic + ' ' + label + '</span>';
    var sw = el('button', 'switch' + (get() ? ' on' : ''), '<i></i><span>' + (get() ? 'On' : 'Off') + '</span>');
    on(sw, function () { var v = !get(); set(v); sw.classList.toggle('on', v); sw.lastChild.textContent = v ? 'On' : 'Off'; A.persist(); }, false);
    row.appendChild(sw); return row;
  }
  function settings() {
    var S = A.S, p = ui.popup({ title: 'Settings', headCls: 'purple', cls: 'panel settings' }), b = p.body;
    b.appendChild(toggle('Sound', '🔊', function () { return S.settings.sound; }, function (v) { S.settings.sound = v; SI.audio.setSound(v); if (v) SI.audio.play('pop'); }));
    b.appendChild(toggle('Music', '🎵', function () { return S.settings.music; }, function (v) { S.settings.music = v; SI.audio.setMusic(v); }));
    var up = el('div', 'srow'); up.innerHTML = '<span class="sl">🔄 Updates</span>';
    var ub = el('button', 'btn small green', 'Update game'); up.appendChild(ub); b.appendChild(up);
    var msg = el('div', 'umsg hidden'); b.appendChild(msg);
    on(ub, function () {
      msg.classList.remove('hidden'); msg.textContent = 'Checking…'; ub.disabled = true;
      var u = A.updater; var pr = u && u.manualUpdate ? u.manualUpdate() : Promise.resolve('unsupported');
      pr.then(function (st) { msg.textContent = SI.UPDATE_MSG[st] || SI.UPDATE_MSG.latest; msg.setAttribute('data-state', st); ub.disabled = false; });
    });
    b.appendChild(el('div', 'vlabel', 'Salah\'s Islands ' + versionLabel()));
    var pr = el('button', 'btn small grey parentsbtn', ui.icon('lock') + ' Parents'); on(pr, function () { p.close(true); SI.parents.open(); }); b.appendChild(pr);
  }

  SI.panels = { questLog: questLog, settings: settings, versionLabel: versionLabel, bar: bar };
})(typeof self !== 'undefined' ? self : this);
