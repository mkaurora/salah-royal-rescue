/* World map: a winding path of level nodes (bottom → top), stars under each node, padlocks, Ollie on the
 * current level, and a level card popup with Play. */
(function () {
  'use strict';
  var SQ = window.SQ;
  var GAP = 124;

  SQ.go.map = function (subject, focusIndex) {
    var mod = SQ.subjects[subject], W = SQ.WORLD[subject], n = mod.levels.length;
    var s = SQ.h('div', 'screen map bg-world w-' + subject);
    s.setAttribute('data-subject', subject);
    var scroll = SQ.h('div', 'map-scroll');
    var canvas = SQ.h('div', 'map-canvas');
    scroll.appendChild(canvas);
    s.appendChild(scroll);

    var head = SQ.h('div', 'map-head');
    head.appendChild(SQ.btn('←', 'white round small back-btn', function () { SQ.go.menu(); }));
    head.appendChild(SQ.h('div', 'map-title', W.name + '<small>' + W.sub + '</small>'));
    head.appendChild(SQ.h('div', 'star-pill', '⭐ ' + SQ.save.subjectStars(SQ.state, subject) + '<span style="opacity:.7">/' + n * 3 + '</span>'));
    head.appendChild(SQ.gear({ onClose: function () { } }));
    s.appendChild(head);

    var unlocked = SQ.state.unlocked[subject] || 0;
    var cur = Math.min(unlocked, n - 1);
    for (var c = 0; c <= unlocked && c < n; c++) { if (!SQ.save.levelInfo(SQ.state, subject, c).passed) { cur = c; break; } }

    function layout() {
      var w = Math.min(scroll.clientWidth || window.innerWidth, 520);
      var H = n * GAP + 330;
      canvas.style.height = H + 'px';
      canvas.innerHTML = '';
      var pts = [];
      for (var i = 0; i < n; i++) {
        var x = (scroll.clientWidth || w) / 2 + Math.sin(i * 0.95) * w * 0.27;
        var y = H - 130 - i * GAP;
        pts.push([x, y]);
      }
      // path
      var d = 'M' + pts[0][0] + ' ' + (pts[0][1] + 80);
      d += ' L' + pts[0][0] + ' ' + pts[0][1];
      for (var k = 1; k < n; k++) {
        var p0 = pts[k - 1], p1 = pts[k], my = (p0[1] + p1[1]) / 2;
        d += ' C' + p0[0] + ' ' + my + ' ' + p1[0] + ' ' + my + ' ' + p1[0] + ' ' + p1[1];
      }
      var svg = '<svg class="map-path" height="' + H + '" viewBox="0 0 ' + (scroll.clientWidth || w) + ' ' + H + '">' +
        '<path d="' + d + '" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="34" stroke-linecap="round" transform="translate(0 6)"/>' +
        '<path d="' + d + '" fill="none" stroke="var(--w3)" stroke-width="30" stroke-linecap="round"/>' +
        '<path d="' + d + '" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 18" opacity=".9"/></svg>';
      canvas.insertAdjacentHTML('beforeend', svg);
      // decorations
      for (var j = 0; j < n; j += 1) {
        var side = Math.sin(j * 0.95) > 0 ? -1 : 1;
        var dx = (scroll.clientWidth || w) / 2 + side * w * (0.3 + (j % 3) * 0.05) - 20;
        var deco = SQ.h('div', 'map-deco', W.deco[(j * 3 + 1) % W.deco.length]);
        deco.style.left = Math.max(4, Math.min((scroll.clientWidth || w) - 50, dx)) + 'px';
        deco.style.top = (pts[j][1] - 50 + (j % 2) * 30) + 'px';
        deco.style.fontSize = (30 + (j % 3) * 8) + 'px';
        canvas.appendChild(deco);
      }
      // nodes
      for (var i2 = 0; i2 < n; i2++) {
        (function (i) {
          var info = SQ.save.levelInfo(SQ.state, subject, i);
          var open = i <= unlocked;
          var node = SQ.h('button', 'node' + (info.passed ? ' done' : '') + (!open ? ' locked' : '') + (i === cur && open ? ' current' : ''));
          node.setAttribute('data-level', i);
          node.style.left = pts[i][0] + 'px';
          node.style.top = pts[i][1] + 'px';
          node.innerHTML = (open ? String(i + 1) : '🔒') + (open ? '<div class="node-stars">' + SQ.starsText(info.stars) + '</div>' : '');
          SQ.tap(node, function () {
            if (!open) {
              SQ.sound.play('oops');
              node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake');
              SQ.speak(SQ.LINES.locked);
              return;
            }
            SQ.sound.play('pop');
            levelCard(subject, i);
          });
          canvas.appendChild(node);
          if (i === cur && open) {
            var o = SQ.h('div', 'node-owl');
            o.style.left = pts[i][0] + 'px';
            o.style.top = pts[i][1] + 'px';
            SQ.mascot(o, {});
            canvas.appendChild(o);
          }
        })(i2);
      }
      var target = pts[focusIndex !== undefined ? focusIndex : cur];
      scroll.scrollTop = Math.max(0, target[1] - scroll.clientHeight * 0.55);
    }

    s._enter = function () {
      layout();
      if (!SQ.FAST) setTimeout(function () { SQ.speak(SQ.LINES.mapPick); }, 900);
    };
    var onResize = function () { layout(); };
    window.addEventListener('resize', onResize);
    s._cleanup = function () { window.removeEventListener('resize', onResize); };
    SQ.show(s);
  };

  function levelCard(subject, i) {
    var mod = SQ.subjects[subject], lv = mod.levels[i], info = SQ.save.levelInfo(SQ.state, subject, i);
    var c = SQ.h('div', 'card level-card w-' + subject);
    var names = lv.skills.map(function (k) { return mod.skills[k]; }).join(' · ');
    c.innerHTML = '<div class="ribbon">Level ' + (i + 1) + '</div>' +
      '<div class="lvl-icon">' + lv.icon + '</div><h2>' + SQ.esc(lv.title) + '</h2>' +
      '<div class="lvl-skill">' + SQ.esc(names) + '</div>' +
      '<div class="stars-row">' + SQ.starsText(info.stars) + '</div>';
    var x = SQ.btn('✕', 'white round small card-x', function () { ov.close(); });
    c.appendChild(x);
    var row = SQ.h('div', 'row');
    row.appendChild(SQ.btn('▶ Play', 'green play-btn', function () { ov.close(); SQ.speak(SQ.LINES.play); SQ.go.play(subject, i); }));
    c.appendChild(row);
    var ov = SQ.overlay(c, { dismiss: true });
    SQ.speak(lv.title);
  }
  SQ.levelCard = levelCard;
})();
