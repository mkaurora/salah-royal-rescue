/* Practice Room: free robot-coding sandbox + optional mini-challenges. No stars, no failing. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var RL = LE.logic.robot;
  var ALL_BLOCKS = ['F', 'L', 'R', 'rep', 'ifw', 'forever'];
  var FREE_W = 6, FREE_H = 6;

  function defaultFreeMap() {
    var rows = [];
    for (var y = 0; y < FREE_H; y++) {
      var r = '';
      for (var x = 0; x < FREE_W; x++) r += '.';
      rows.push(r);
    }
    rows[2] = '.>....';
    rows[2] = rows[2].slice(0, 4) + 'F' + rows[2].slice(5);
    rows[0] = '....G.';
    rows[4] = '.#....';
    return rows;
  }

  LE.views.practice = {
    create: function (host, ctx) {
      var store = ctx.store;
      var challenges = LE.levels.practice;
      var st = store.getPracticeState() || {};
      var current = st.current || 'free';
      var freeMap = Array.isArray(st.freeMap) && st.freeMap.length === FREE_H ? st.freeMap.slice() : defaultFreeMap();
      var stamp = 'G';

      var wrap = h('div.practice-wrap');
      var chips = h('div.pr-chips');
      var stamps = h('div.pr-stamps');
      var uiHost = h('div.pr-ui');
      wrap.append(chips, stamps, uiHost);
      host.appendChild(wrap);

      function levelFor(id) {
        if (id === 'free') return { id: 'free', name: 'Free play', map: freeMap, blocks: ALL_BLOCKS, par: 99, solution: [] };
        var c = challenges.filter(function (x) { return x.id === id; })[0] || challenges[0];
        return { id: c.id, name: c.name, goal: c.goal, map: c.map, blocks: ALL_BLOCKS, par: 99, solution: c.solution };
      }

      function persist(program) {
        store.setPracticeState({ current: current, freeMap: freeMap, program: program || (ui ? ui.getProgram() : []) });
      }

      var uiCtx = Object.assign({}, ctx, {
        savedState: st.program ? { program: st.program } : null,
        saveState: function (s) { persist(s.program); },
        win: function () {}, fail: function () {}
      });

      var ui = null;
      function buildUI() {
        if (ui) ui.destroy();
        ui = LE.createRobotUI(uiHost, levelFor(current), uiCtx, {
          practice: true,
          onReach: function () {
            ctx.sfx('cheer');
            ctx.fx.confetti(90);
            ctx.buddy.cheer();
            if (current !== 'free') {
              store.markPracticeDone(current);
              renderChips();
              var idx = challenges.map(function (c) { return c.id; }).indexOf(current);
              var next = challenges[idx + 1];
              ctx.say('Yay! You did it! ⭐', {
                buttons: next ? [{ label: 'Next challenge ▶', cls: 'green next-challenge', onTap: function () { select(next.id); } },
                                 { label: '🎨 Free play', cls: 'blue', onTap: function () { select('free'); } }]
                              : [{ label: '🎨 Free play', cls: 'blue', onTap: function () { select('free'); } }]
              });
            } else {
              ctx.say('Woohoo! Robo found the star! Move things around and play again!');
            }
          },
          onMiss: function (res) {
            ctx.sfx('pop');
            ctx.say(res.bump ? 'Bonk! That was funny! Change a block and run again.' : 'Fun! Robo went somewhere new. Try again as much as you like!');
          },
          onCellTap: function (x, y) {
            if (current !== 'free') return;
            var row = freeMap[y], c = row.charAt(x);
            if ('^>v<'.indexOf(c) >= 0) {
              var order = '^>v<';
              var nc = order.charAt((order.indexOf(c) + 1) % 4);
              freeMap[y] = row.slice(0, x) + nc + row.slice(x + 1);
              ctx.sfx('turn');
            } else {
              var put = stamp === 'erase' ? '.' : stamp;
              if (put === c) put = '.';
              if (put === 'F') {
                // only one star
                freeMap = freeMap.map(function (r) { return r.replace(/F/g, '.'); });
                row = freeMap[y];
              }
              freeMap[y] = row.slice(0, x) + put + row.slice(x + 1);
              ctx.sfx(put === '.' ? 'remove' : 'place');
            }
            ui.setLevel(levelFor('free'));
            persist();
          }
        });
        stamps.style.display = current === 'free' ? '' : 'none';
        persist();
      }

      function renderChips() {
        chips.innerHTML = '';
        var free = h('button.chip.pressable' + (current === 'free' ? '.on' : ''), { type: 'button', 'data-chip': 'free' }, '🎨 Free');
        free.addEventListener('click', function () { LE.sound.play('tap'); select('free'); });
        chips.appendChild(free);
        challenges.forEach(function (c, i) {
          var done = store.isPracticeDone(c.id);
          var b = h('button.chip.pressable' + (current === c.id ? '.on' : '') + (done ? '.done' : ''), { type: 'button', 'data-chip': c.id, 'aria-label': c.name },
            String(i + 1), done ? h('span.chip-check', '✓') : null);
          b.addEventListener('click', function () { LE.sound.play('tap'); select(c.id); });
          chips.appendChild(b);
        });
        var on = chips.querySelector('.on');
        if (on && on.scrollIntoView) setTimeout(function () { try { on.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) {} }, 30);
      }

      function renderStamps() {
        stamps.innerHTML = '';
        stamps.appendChild(h('span.pr-stamp-lbl', 'Tap the board:'));
        [['G', '⚙️', 'Gear'], ['F', '⭐', 'Star'], ['#', '🪨', 'Rock'], ['erase', '🧽', 'Erase']].forEach(function (s) {
          var b = h('button.stamp.pressable' + (stamp === s[0] ? '.on' : ''), { type: 'button', 'aria-label': s[2], 'data-stamp': s[0] }, h('span', s[1]), h('small', s[2]));
          b.addEventListener('click', function () { stamp = s[0]; LE.sound.play('click'); renderStamps(); });
          stamps.appendChild(b);
        });
      }

      function select(id) {
        current = id;
        uiCtx.savedState = null;
        renderChips();
        buildUI();
        if (id === 'free') ctx.say('Free play! Tap the board to add gears, stars and rocks. Then code Robo!');
        else {
          var c = challenges.filter(function (x) { return x.id === id; })[0];
          ctx.say(c.goal, { buttons: [{ label: '👉 Show me', cls: 'orange showme-btn', onTap: function () { ctx.showMe(); } }] });
        }
      }

      renderChips();
      renderStamps();
      buildUI();

      return {
        get busy() { return ui && ui.busy; },
        target: function (k) {
          var m = /^chip:(\w+)$/.exec(k || '');
          if (m) { var c = chips.querySelector('[data-chip="' + m[1] + '"]'); return c && c.getBoundingClientRect(); }
          return ui.target(k);
        },
        ghost: function (k) { return ui.ghost(k); },
        canShowMe: function () { return current !== 'free'; },
        showMe: function () { return ui.showMeFor(levelFor(current).solution); },
        goal: function () { return current === 'free' ? 'Free play! Tap the board to add things. Then code Robo with blocks!' : levelFor(current).goal; },
        select: select,
        stop: function () { ui.stop(); },
        get current() { return current; },
        destroy: function () { if (ui) ui.destroy(); wrap.remove(); }
      };
    }
  };
})();
