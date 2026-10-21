/* Parents' area: big numpad PIN (1994, wrong PIN = gentle shake), then unlock all levels, questions on/off,
 * subjects (at least one stays on), add coins, reset progress (with confirm) and quiz stats. All changes go
 * through RR.progress.parentAction. Browser only: RR.parentsUI.pin(). */
(function (root) {
  'use strict';
  var RR = root.RR, ui = RR.ui, h = ui.h, PR = RR.progress, A = RR.audio;
  function app() { return RR.app; }

  function pin() {
    var code = '';
    var dotsEl = h('div.pin-dots', h('i'), h('i'), h('i'), h('i'));
    var pad = h('div.pinpad');
    var card = h('div.card', h('h2', '🔒 Parents'), h('p', 'Enter the PIN'), dotsEl, pad);
    var scr = h('div.screen.modal', card);
    function dots() { for (var i = 0; i < 4; i++) dotsEl.children[i].className = i < code.length ? 'on' : ''; }
    function key(k) {
      if (k === '⌫') code = code.slice(0, -1);
      else if (code.length < 4) code += k;
      dots();
      if (code.length === 4) {
        if (PR.checkPin(code)) { var p = code; setTimeout(function () { ui.closeModal(scr); ui.openModal(panel(p)); }, 150); }
        else { A.sfx('pinWrong'); ui.shake(card); setTimeout(function () { code = ''; dots(); }, 350); }
      }
    }
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '⌫'].forEach(function (k) {
      pad.appendChild(ui.btn('white', k, function () { key(k); }, { label: k === '⌫' ? 'Delete' : k }));
    });
    pad.appendChild(ui.btn('red', '✕', function () { ui.closeModal(scr); }, { sound: 'back', label: 'Close' }));
    return scr;
  }

  function panel(code) {
    var st = app().state;
    function act(a, arg) { var r = PR.parentAction(app().state, code, a, arg); if (r.ok) { app().state = r.state; app().persist(); } return r; }
    var qBtn = ui.btn('white small', '', function () { act('quiz', !app().state.quiz.enabled); upd(); });
    var subs = {};
    PR.SUBJECTS.forEach(function (s) {
      subs[s] = h('button.check', { type: 'button', onclick: function () {
        var r = act('subject', [s, !app().state.quiz.subjects[s]]);
        if (!r.ok) ui.toast('Keep at least one subject on');
        A.sfx('tap'); upd();
      } }, h('i'), { math: '🔢 Math', english: '🔤 English', science: '🔬 Science' }[s]);
    });
    var stats = h('div.stat-line');
    function upd() {
      st = app().state;
      qBtn.innerHTML = st.quiz.enabled ? '📚 Questions: ON' : '📚 Questions: OFF';
      qBtn.classList.toggle('off', !st.quiz.enabled);
      PR.SUBJECTS.forEach(function (s) { subs[s].classList.toggle('on', !!st.quiz.subjects[s]); });
      var qs = st.quizStats;
      stats.textContent = 'Questions answered: ' + qs.asked + ' · right first try: ' + (qs.asked ? Math.round(qs.firstTry / qs.asked * 100) : 0) +
        '% · coins from questions: ' + qs.coins + '\nLevels open: ' + st.unlocked + '/30 · stars: ' + PR.totalStars(st) + '/90';
    }
    upd();
    var scr = h('div.screen.modal', h('div.card.parents',
      h('h2', '🔒 Parents'),
      h('div.grid2',
      h('div.sec', h('b', 'Questions between levels'), qBtn, h('div', { style: { 'margin-top': '6px' } }, subs.math, subs.english, subs.science)),
      h('div.sec', h('b', 'Progress'),
        h('div.row',
          ui.btn('blue small', '🔓 Unlock all levels', function () { act('unlockAll'); ui.toast('All 30 levels are open'); upd(); }),
          ui.btn('green small', '+100 coins', function () { act('addCoins', 100); ui.toast('+100 coins'); upd(); }),
          ui.btn('green small', '+500 coins', function () { act('addCoins', 500); ui.toast('+500 coins'); upd(); }),
          ui.btn('red small', '🗑️ Reset progress', function () { confirmReset(); })))),
      h('div.foot', stats, ui.btn('green', 'Done ✓', function () { ui.closeModal(scr); refreshMap(); }))));
    function confirmReset() {
      var c = h('div.screen.modal', h('div.card',
        h('h2', 'Start over?'), h('p', 'All stars, coins and garage items will be erased.'),
        h('div.row', ui.btn('white', 'No, keep it', function () { ui.closeModal(c); }, { sound: 'back' }),
          ui.btn('red', 'Yes, reset', function () {
            act('reset', 'confirm');
            ui.closeAllModals();
            ui.toast('Progress reset');
            app().goto('title');
          }))));
      ui.openModal(c);
    }
    return scr;
  }

  /** After the panel closes: redraw the map nodes / title counters behind it (rebuilding the title would close modals). */
  function refreshMap() {
    var b = ui.base();
    if (b && b._render) b._render();
    else if (RR.app.mode === 'title' && !ui.topModal()) RR.app.goto('title');
  }

  RR.parentsUI = { pin: pin };
})(window);
