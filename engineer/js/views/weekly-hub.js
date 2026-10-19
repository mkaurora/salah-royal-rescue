/* Weekly Big Project UI (v3): the menu card "This Week's Project" and the project hub
 * (week chips, story, the 4–6 step nodes, Start / Resume). Steps are played by LE.app.openWeeklyStep.
 * Unlock rules: js/logic/weekly.js. Spoken lines: project intro/done (data) + LE.LINES.weekly* (app.js). */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var h = LE.h;

  function W() { return LE.logic.weekly; }
  function projects() { return LE.weeklyProjects || []; }
  function store() { return LE.app.store; }
  function project(pid) { return projects().filter(function (p) { return p.id === pid; })[0] || null; }
  function currentIndex() { return W().currentWeek(store().data, LE.now(), projects().length); }
  function countdownText() {
    var d = W().untilNextWeek(LE.now()).days;
    return 'Next project in ' + d + (d === 1 ? ' day' : ' days');
  }
  var WORLD_ICON = { bridges: '🌉', machines: '⚙️', circuits: '💡', robot: '🤖', construction: '🚧' };

  /** Big card for the menu. */
  function menuCard() {
    var list = projects();
    if (!list.length) return null;
    var i = currentIndex(), p = list[i];
    var open = W().isProjectUnlocked(store().data, i, LE.now());
    var prog = store().projectProgress(p.id);
    var next = W().nextStep(p, prog);
    var status = !open ? '🔒 Opens soon' : prog.done ? '🏆 Finished! Play again' : 'Step ' + (next + 1) + ' of ' + p.steps.length;
    var card = LE.button('weekly-card' + (open ? '' : ' locked') + (prog.done ? ' done' : ''), '', function () { show(p.id); },
      { label: "This Week's Project" });
    card.dataset.project = p.id;
    card.append(
      h('div.wc-icon', p.icon),
      h('div.wc-text',
        h('div.wc-kicker', "This Week's Project"),
        h('div.wc-title', p.title),
        h('div.wc-status', status, h('span.wc-count', ' · ' + countdownText()))),
      h('div.wc-go', open ? '▶' : '🔒'));
    return card;
  }

  /** Project hub screen. opts.celebrate: just finished → confetti + done line. */
  function show(pid, opts) {
    opts = opts || {};
    var list = projects(), st = store();
    var p = project(pid) || list[currentIndex()];
    if (!p) { LE.app.showMenu(); return; }
    var i = list.indexOf(p);
    var open = W().isProjectUnlocked(st.data, i, LE.now());
    st.setLast({ screen: 'weekly', project: p.id });
    var prog = st.projectProgress(p.id);
    var next = W().nextStep(p, prog);

    var el = h('div.weekly-screen');
    var bar = LE.app.topbar(h('span.lvl-title', h('span', p.icon + ' ' + p.title)), function () { LE.app.showMenu(); });
    var buddyBar = h('div.buddy-bar');

    // week chips (older projects can be replayed; future ones are locked)
    var chips = h('div.wk-chips.wk-scroll');
    var cur = currentIndex();
    list.forEach(function (q, k) {
      var qOpen = W().isProjectUnlocked(st.data, k, LE.now()), qDone = st.projectProgress(q.id).done;
      var c = h('button.wk-chip' + (q === p ? '.on' : '') + (qOpen ? '' : '.locked') + (qDone ? '.done' : '') + (k === cur ? '.now' : ''),
        { type: 'button', 'data-week': k, 'aria-label': 'Week ' + (k + 1) }, qOpen ? q.icon : '🔒', h('span', String(k + 1)));
      c.addEventListener('click', function () {
        LE.sound.play('tap');
        if (!qOpen) { LE.shake(c); buddy.say(LE.LINES.weeklyLocked); return; }
        show(q.id);
      });
      chips.appendChild(c);
    });

    var stars = W().projectStars(p, prog), max = p.steps.length * 3;
    var head = h('div.wk-head',
      h('div.wk-blurb', p.blurb),
      h('div.wk-meta',
        h('span.wk-stars', { html: LE.starSVG(true) + stars + '/' + max }),
        h('span.wk-countdown', open ? countdownText() : 'Opens ' + W().weekStart(i).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }))));

    var path = h('div.wk-path.scroll-y');
    p.steps.forEach(function (s, k) {
      var sOpen = open && W().isStepUnlocked(p, prog, k), sStars = W().stepStars(prog, s);
      var node = LE.button('wk-node' + (sOpen ? '' : ' locked') + (sStars ? ' done' : '') + (k === next && sOpen ? ' current' : ''), '', function () {
        if (!sOpen) { LE.shake(node); LE.sound.play('buzz'); buddy.say(open ? LE.LINES.weeklyStepLocked : LE.LINES.weeklyLocked); return; }
        LE.app.openWeeklyStep(p.id, k);
      }, { label: 'Step ' + (k + 1), sound: sOpen ? 'tap' : false });
      node.dataset.step = k;
      node.append(
        h('div.wn-num', sStars ? '✔' : sOpen ? String(k + 1) : '🔒'),
        h('div.wn-text', h('div.wn-title', s.title), h('div.wn-world', WORLD_ICON[s.world] + ' ' + LE.world(s.world).name)),
        sStars ? LE.starsRow(sStars, 3, 'wn-stars') : h('div.wn-arrow', sOpen ? '▶' : ''));
      path.appendChild(node);
    });

    var startLabel = !open ? '🔒 Opens soon' : prog.done ? '🏆 Play again' : next > 0 || st.getInProgress('wk-' + p.id, next) ? 'Resume ▶' : 'Start ▶';
    var startBtn = LE.button('green huge wk-start', startLabel, function () {
      if (!open) { LE.shake(startBtn); buddy.say(LE.LINES.weeklyLocked); return; }
      LE.app.openWeeklyStep(p.id, prog.done ? 0 : next);
    }, { sound: open ? 'whoosh' : 'buzz' });
    if (!open) startBtn.classList.add('off');

    el.append(bar, buddyBar, chips, head, path, startBtn);
    LE.app.showScreen({ el: el, destroy: function () { buddy.destroy(); } });
    var buddy = new LE.Buddy(buddyBar);
    buddy.onTap = function () { buddy.say(open ? (prog.done ? p.done : p.intro) : LE.LINES.weeklyLocked); };
    LE.voice.prefetch([p.intro, p.done, LE.LINES.weeklyLocked, LE.LINES.weeklyStepLocked]);
    var cn = chips.querySelector('.on');
    if (cn) chips.scrollLeft = Math.max(0, cn.offsetLeft - chips.clientWidth / 2 + cn.offsetWidth / 2);
    var cs = path.querySelector('.current');
    if (cs && cs.offsetTop + cs.offsetHeight > path.clientHeight) path.scrollTop = cs.offsetTop + cs.offsetHeight - path.clientHeight + 8;

    setTimeout(function () {
      if (!el.isConnected) return;
      if (opts.celebrate) { LE.fx.confetti(220); LE.sound.play('cheer'); buddy.cheer(); buddy.say(p.done); }
      else if (!open) buddy.say(LE.LINES.weeklyLocked);
      else buddy.say(prog.done ? p.done : p.intro);
    }, 350 / LE.speed);
  }

  LE.weeklyHub = { menuCard: menuCard, show: show, project: project };
})();
