/* Main menu: logo, Ollie greeting Salah, one big card per subject world, the gear. */
(function () {
  'use strict';
  var SQ = window.SQ;
  var greeted = false;

  SQ.go.menu = function () {
    var s = SQ.h('div', 'screen menu bg-sky');
    [['🔢', '6%', '4%'], ['📚', '64%', '4%'], ['🧪', '8%', '46%'], ['⭐', '88%', '44%'], ['✏️', '4%', '92%'], ['🪐', '86%', '93%']].forEach(function (f) {
      var d = SQ.h('div', 'menu-float', f[0]);
      d.style.left = f[1]; d.style.top = f[2];
      s.appendChild(d);
    });
    var top = SQ.h('div', 'menu-top');
    top.appendChild(SQ.gear());
    s.appendChild(top);
    s.appendChild(SQ.h('div', 'logo', '<div class="l1">SALAH\'S</div><div class="l2">Learning Quest</div>'));

    var hello = SQ.h('div', 'menu-hello');
    var owl = SQ.mascot(hello, {});
    var t = SQ.save.totals(SQ.state);
    var line = t.levels ? SQ.LINES.greet[2] : SQ.LINES.greet[0];
    var bubble = SQ.h('div', 'bubble menu-bubble', SQ.esc(line));
    hello.appendChild(bubble);
    s.appendChild(hello);

    var worlds = SQ.h('div', 'worlds');
    SQ.enabledSubjects().forEach(function (sub) {
      var W = SQ.WORLD[sub], mod = SQ.subjects[sub];
      var stars = SQ.save.subjectStars(SQ.state, sub), max = mod.levels.length * 3;
      var card = SQ.h('button', 'world-card w-' + sub);
      card.setAttribute('data-subject', sub);
      card.innerHTML = '<div class="world-icon">' + W.icon + '</div>' +
        '<div style="flex:1;min-width:0"><div class="world-name">' + W.name + '</div><div class="world-sub">' + W.sub + ' · ' + mod.levels.length + ' levels</div>' +
        '<div class="world-meter"><i style="width:' + Math.round(100 * stars / max) + '%"></i></div></div>' +
        '<div class="world-stars">⭐ ' + stars + '</div><div class="world-deco">' + W.deco[0] + '</div>';
      SQ.tap(card, function () {
        SQ.sound.play('whoosh');
        SQ.speak(SQ.LINES.worlds[sub]);
        SQ.go.map(sub);
      });
      worlds.appendChild(card);
    });
    s.appendChild(worlds);

    s._enter = function () {
      setTimeout(function () { owl.set('wave', 1800); SQ.sound.play('hoot'); }, SQ.FAST ? 0 : 450);
      var say = function () { owl.talk(SQ.speak(line)); };
      if (!greeted) { greeted = true; setTimeout(say, SQ.FAST ? 0 : 600); }
      bubble.addEventListener('click', say);
      owl.el.addEventListener('click', function () { owl.set('cheer', 1200); SQ.sound.play('hoot'); say(); });
    };
    SQ.voice.prefetch(SQ.LINES.greet.concat(SQ.LINES.praise, SQ.LINES.tryAgain));
    SQ.show(s);
  };
})();
