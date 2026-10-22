/* Level 2 — Science Lab view. One view, five small labs (level.mode):
 *   quiz   tap the right picture (the lesson's quick check)          gears  a gear train: direction + speed (+ double gears)
 *   lever  move the fulcrum (+ helper weights) to lift the rock       ramp   pick the ramp length + floor to push a box up
 *   roll   pick the start height + floor so the ball stops on the star
 * The models are exact and tiny: js/logic/lab.js. The canvas only draws; taps go through the same functions that
 * Show me uses. Static scenes are cheap; the canvas redraws every frame only while something moves. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var LB = LE.logic.lab;

  var SURF = { ice: { fill: '#cfefff', line: '#7cc4e8', icon: '🧊' }, wood: { fill: '#e0a560', line: '#8a5a2b', icon: '🪵' },
    carpet: { fill: '#d65d8f', line: '#8a2a54', icon: '🧶' }, sand: { fill: '#f2d58c', line: '#b39248', icon: '🏖️' } };
  var GEAR_NAME = { S: 'Small', B: 'Big', D: 'Double' };

  function create(host, level, ctx) {
    var mode = level.mode;
    var busy = false, destroyed = false, stopFlag = false;
    var saved = ctx.savedState && ctx.savedState.state;
    function initial() {
      if (mode === 'gears') return { slots: new Array(level.slots || 4).fill(null) };
      if (mode === 'lever') return { f: level.f0 === undefined ? 0 : level.f0, weights: [] };
      if (mode === 'ramp') return { len: level.len0 || level.lens[0], surface: level.surface0 || level.surfaces[0] };
      if (mode === 'roll') return { h: level.h0 || level.heights[0], surface: level.surface0 || level.surfaces[0] };
      return { answers: [], wrong: 0, qi: 0 };
    }
    var state = saved ? JSON.parse(JSON.stringify(saved)) : (level.startState ? JSON.parse(JSON.stringify(level.startState)) : initial());
    var redraw = function () {};
    function changed() { ctx.saveState && ctx.saveState({ state: JSON.parse(JSON.stringify(state)) }); redraw(); }
    function isDemo() { return !!(ctx.isDemo && ctx.isDemo()); }

    var root = h('div.lb-wrap.lb-' + mode);
    host.appendChild(root);
    var api;
    if (mode === 'quiz') api = quiz();
    else api = scene();
    return api;

    /* ======================= quiz ======================= */
    function quiz() {
      var qs = level.questions || [];
      var card = h('div.lb-quiz');
      var prog = h('div.lb-qprog');
      root.append(prog, card);
      var ansEls = [];
      function showQ() {
        card.innerHTML = '';
        ansEls = [];
        prog.innerHTML = '';
        qs.forEach(function (q, i) { prog.appendChild(h('i' + (i < state.qi ? '.done' : i === state.qi ? '.on' : ''))); });
        var q = qs[state.qi];
        if (!q) return;
        var grid = h('div.lb-answers');
        q.answers.forEach(function (a, i) {
          var b = h('button.lb-ans.pressable', { type: 'button', 'data-ans': i, 'aria-label': a.label }, h('div.lb-ans-pic', { html: LE.l2pic(a.pic) }), h('div.lb-ans-lbl', a.label));
          b.addEventListener('click', function () { if (!isDemo()) answer(i); });
          ansEls.push(b);
          grid.appendChild(b);
        });
        card.append(h('div.lb-qpic', { html: LE.l2pic(q.pic) }), h('div.lb-qtext', q.q), grid);
      }
      var asked = -1;
      function ask() { if (asked !== state.qi && qs[state.qi]) { asked = state.qi; ctx.say(qs[state.qi].q); } }
      var locked = false;
      function answer(i, now) {
        var q = qs[state.qi];
        if (!q || locked) return;
        ctx.emit('answer', { q: state.qi, a: i });
        if (i === q.right) {
          locked = true;
          ctx.sfx('ding');
          ansEls[i].classList.add('right');
          ctx.fx.burstAt(ansEls[i], { n: 14, color: '#ffe14d', speed: 5, size: 7, shape: 'star' });
          state.answers[state.qi] = i;
          state.qi++;
          changed();
          var advance = function () {
            locked = false;
            if (destroyed) return;
            if (state.qi >= qs.length) {
              var stars = LB.quizStars(state.wrong);
              ctx.win({ stars: stars, note: stars < 3 ? 'Tip: think first, then tap. Right the first time gives 3 stars!' : null });
            } else { showQ(); ask(); }
          };
          if (now) advance(); else setTimeout(advance, LE.FAST ? 150 : 700);
        } else {
          ctx.sfx('oops');
          LE.shake(ansEls[i]);
          ansEls[i].classList.add('wrong');
          state.wrong++;
          changed();
          ctx.say(q.why);
        }
      }
      function draw() {}
      showQ();
      // read the question once the goal line has been spoken
      setTimeout(function () {
        if (destroyed) return;
        var after = ctx.buddy && ctx.buddy.afterSpeech ? ctx.buddy.afterSpeech(400) : Promise.resolve();
        after.then(function () { if (!destroyed) ask(); });
      }, LE.FAST ? 50 : 900);
      return {
        get busy() { return false; },
        noGo: true,
        target: function (key) {
          var m;
          if ((m = /^ans:(\d+)$/.exec(key || ''))) return ansEls[+m[1]] ? ansEls[+m[1]].getBoundingClientRect() : null;
          return card.getBoundingClientRect();
        },
        showMe: function () {
          return qs.map(function (q, k) {
            return { from: 'ans:' + q.right, say: k === 0 ? 'Look at the picture, then tap the right answer.' : null,
              apply: function () { if (state.qi === k) answer(q.right, true); }, pause: LE.FAST ? 300 : 900 };
          });
        },
        reset: function () { state = initial(); asked = -1; locked = false; changed(); showQ(); },
        getState: function () { return JSON.parse(JSON.stringify(state)); },
        destroy: function () { destroyed = true; root.remove(); },
        root: root
      };
    }

    /* ======================= canvas labs ======================= */
    function scene() {
      var stage = h('div.lb-stage');
      var canvas = h('canvas.lb-canvas');
      var goalChip = h('div.lb-goal');
      stage.append(canvas, goalChip);
      var controls = h('div.lb-controls');
      var goBtn = LE.button('go-btn green', '<svg viewBox="0 0 24 24"><path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg><span>Go!</span>', function () { go(); }, { label: 'Go', sound: 'click' });
      root.append(stage, h('div.lb-bar', controls, goBtn));
      var V = { W: 300, H: 200, g: null, u: 30 };
      var anim = { t: 0, on: false };
      var chips = {};
      function chip(group, val, html, onTap, label) {
        var attrs = { type: 'button', 'aria-label': label || String(val) };
        attrs['data-' + group] = String(val);
        var b = h('button.lb-chip.pressable', attrs, h('span', { html: html }));
        b.addEventListener('click', function () { if (busy || isDemo()) return; onTap(); });
        chips[group + ':' + val] = b;
        return b;
      }
      function markChips() {
        Object.keys(chips).forEach(function (k) {
          var p = k.split(':'), g = p[0], v = p[1];
          var on = (g === 'len' && String(state.len) === v) || (g === 'surf' && state.surface === v) || (g === 'h' && String(state.h) === v) || (g === 'tool' && tool === v);
          chips[k].classList.toggle('on', on);
        });
      }
      var tool = 'fulcrum';
      redraw = function () { draw(); };

      /* ----- controls per mode ----- */
      if (mode === 'gears') {
        goalChip.innerHTML = 'Fan: ' + (level.goalSpec.dir > 0 ? '↻' : '↺') + ' ' + { slow: 'slow', same: 'same speed', fast: 'fast', super: 'SUPER fast' }[level.goalSpec.speed];
        controls.append(h('div.lb-legend', (level.tray || ['S', 'B']).map(function (t) { return h('span.lb-leg', { html: legendGear(t) + '<b>' + GEAR_NAME[t] + '</b>' }); })),
          LE.button('white lb-clear', '↺ Clear', function () { if (!busy && !isDemo()) { clearGears(); } }, { label: 'Clear gears' }));
      } else if (mode === 'lever') {
        goalChip.innerHTML = level.shelf ? '🪨 ➜ shelf' : '🪨 ⬆ lift it';
        if (level.maxWeights) controls.append(chip('tool', 'fulcrum', '▲ Fulcrum', function () { setTool('fulcrum'); }), chip('tool', 'weight', '🏋️ Weight', function () { setTool('weight'); }));
        else controls.append(h('div.lb-note', 'Tap the plank to move the ▲'));
        controls.append(LE.button('white lb-clear', '↺', function () { if (!busy && !isDemo()) { state = initial(); changed(); markChips(); ctx.sfx('whoosh'); } }, { label: 'Start again' }));
      } else if (mode === 'ramp') {
        goalChip.innerHTML = '📦 ➜ 🚚';
        controls.append(h('div.lb-group', h('span.lb-glbl', 'Ramp'), level.lens.map(function (n) { return chip('len', n, String(n), function () { setLen(n); }, 'Ramp ' + n); })),
          h('div.lb-group', level.surfaces.map(function (s) { return chip('surf', s, SURF[s].icon, function () { setSurface(s); }, s); })));
      } else if (mode === 'roll') {
        goalChip.innerHTML = '⚽ ➜ ⭐';
        controls.append(h('div.lb-group', h('span.lb-glbl', 'High'), level.heights.map(function (n) { return chip('h', n, String(n), function () { setHeight(n); }, 'Height ' + n); })),
          h('div.lb-group', level.surfaces.map(function (s) { return chip('surf', s, SURF[s].icon, function () { setSurface(s); }, s); })));
      }
      markChips();
      function legendGear(t) {
        var big = '<circle cx="12" cy="12" r="10" fill="#ffc83d" stroke="#a86f00" stroke-width="2.5"/>', small = '<circle cx="12" cy="12" r="6" fill="#ff7a59" stroke="#a3361d" stroke-width="2.5"/>';
        return '<svg viewBox="0 0 24 24">' + (t === 'S' ? small : t === 'B' ? big : big + small) + '</svg>';
      }

      /* ----- actions ----- */
      var ORDER = ['S', 'B', 'D'];
      function cycleSlot(i) {
        var types = (level.tray || ['S', 'B']).filter(function (t) { return ORDER.indexOf(t) >= 0; });
        var cur = state.slots[i];
        var k = cur ? types.indexOf(cur) : -1;
        state.slots[i] = k + 1 < types.length ? types[k + 1] : null;
        ctx.sfx(state.slots[i] ? 'place' : 'remove');
        changed();
        ctx.emit('set', { slot: i, type: state.slots[i] });
      }
      function clearGears() { state.slots = state.slots.map(function () { return null; }); ctx.sfx('whoosh'); changed(); ctx.emit('clear'); }
      function setTool(t) { tool = t; ctx.sfx('click'); markChips(); ctx.emit('tool', { tool: t }); draw(); }
      function tapSpot(x) {
        if (tool === 'weight' && level.maxWeights) {
          if (x === state.f || x === level.load || x === level.effort || x < -4 || x > 4) { ctx.sfx('buzz'); return; }
          var i = state.weights.indexOf(x);
          if (i >= 0) { state.weights.splice(i, 1); ctx.sfx('remove'); }
          else if (state.weights.length >= level.maxWeights) { ctx.sfx('buzz'); return; }
          else { state.weights.push(x); ctx.sfx('thud'); }
          changed(); ctx.emit('weight', { spot: x });
          return;
        }
        if ((level.spots || []).indexOf(x) < 0) { ctx.sfx('buzz'); return; }
        state.f = x;
        state.weights = state.weights.filter(function (w) { return w !== x; });
        ctx.sfx('click'); changed(); ctx.emit('move', { spot: x });
      }
      function setLen(n) { state.len = n; ctx.sfx('click'); changed(); markChips(); ctx.emit('len', { len: n }); }
      function setSurface(s) { state.surface = s; ctx.sfx('click'); changed(); markChips(); ctx.emit('surface', { surface: s }); }
      function setHeight(n) { state.h = n; ctx.sfx('click'); changed(); markChips(); ctx.emit('height', { h: n }); }

      /* ----- geometry ----- */
      function layout() {
        V.W = Math.max(200, Math.floor(stage.clientWidth)); V.H = Math.max(140, Math.floor(stage.clientHeight));
        var g = LE.fitCanvas(canvas, V.W, V.H);
        V.g = g.ctx;
        if (mode === 'lever') V.u = Math.min(V.W / 10.2, V.H / 4.6);
        else if (mode === 'ramp') V.u = Math.min(V.W / 9.2, V.H / 4.4);
        else if (mode === 'roll') V.u = Math.min(V.W / ((level.floorLen || 8) + 3.4), V.H / 5.4);
        else V.u = Math.min(V.W / 6.4, V.H / 2.6);
        draw();
      }
      // gears: axle x positions depend on what is mounted (gears touch: distance = driver radius + driven radius)
      var RS = 0.3, RB = 0.52;
      function rIn(t) { return t === 'B' ? RB : RS; }
      function rOut(t) { return t === 'S' ? RS : RB; }
      function gearLayout() {
        var u = V.u, x = u * 0.85, y = V.H * 0.56, out = [{ x: x, y: y, r: RB * u, motor: true }];
        var prevOut = RB;
        for (var i = 0; i < state.slots.length; i++) {
          var t = state.slots[i];
          var step = (prevOut + (t ? rIn(t) : 0.42)) * u + (t ? 0 : u * 0.06);
          x += step;
          out.push({ x: x, y: y, t: t, i: i });
          prevOut = t ? rOut(t) : 0.42;
        }
        return out;
      }
      function slotRect(i) {
        var c = canvas.getBoundingClientRect(), L = gearLayout()[i + 1], r = Math.max(V.u * 0.5, 26);
        return { left: c.left + L.x - r, top: c.top + L.y - r, width: r * 2, height: r * 2 };
      }
      function spotX(s) { return V.W / 2 + s * V.u; }
      function spotRect(s) {
        var c = canvas.getBoundingClientRect(), y = V.H - V.u * 0.9;
        return { left: c.left + spotX(s) - V.u * 0.45, top: c.top + y - V.u * 0.5, width: V.u * 0.9, height: V.u };
      }

      /* ----- drawing ----- */
      var gearAng = [], spinT = 0, last = performance.now(), raf = 0;
      var leverT = 0, leverOk = null, rampK = 0, rampOk = null, rollPos = null, splash = 0;
      function loop(now) {
        if (destroyed) return;
        var dt = Math.min(0.05, (now - last) / 1000) * LE.speed; last = now;
        spinT += dt;
        draw(dt);
        raf = anim.on ? requestAnimationFrame(loop) : 0;
      }
      function startAnim() { if (!anim.on) { anim.on = true; last = performance.now(); raf = requestAnimationFrame(loop); } }
      function stopAnim() { anim.on = false; }
      function draw(dt) {
        var g = V.g;
        if (!g) return;
        g.clearRect(0, 0, V.W, V.H);
        var bg = g.createLinearGradient(0, 0, 0, V.H);
        bg.addColorStop(0, '#1f5fae'); bg.addColorStop(1, '#3d8fe0');
        g.fillStyle = bg; g.fillRect(0, 0, V.W, V.H);
        g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 1;
        for (var x = 0; x < V.W; x += 20) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, V.H); g.stroke(); }
        for (var y = 0; y < V.H; y += 20) { g.beginPath(); g.moveTo(0, y); g.lineTo(V.W, y); g.stroke(); }
        if (mode === 'gears') drawGears(g, dt || 0);
        else if (mode === 'lever') drawLever(g);
        else if (mode === 'ramp') drawRamp(g);
        else if (mode === 'roll') drawRoll(g);
      }
      function gearShape(g, cx, cy, r, ang, fill, stroke, teeth) {
        g.save(); g.translate(cx, cy); g.rotate(ang);
        g.fillStyle = fill; g.strokeStyle = stroke; g.lineWidth = 3;
        g.beginPath();
        var n = teeth * 2;
        for (var i = 0; i < n; i++) { var a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, rr = i % 2 ? r * 0.8 : r; g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr); }
        g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * 0.25, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = stroke; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -r * 0.25); g.lineTo(0, -r * 0.62); g.stroke();
        g.restore();
      }
      function drawGears(g, dt) {
        var L = gearLayout(), u = V.u;
        var tr = LB.gearTrain(level, state.slots);
        // motor box
        var m = L[0];
        g.fillStyle = '#5a6378'; g.strokeStyle = '#23264a'; g.lineWidth = 3;
        LE.rr(g, m.x - u * 0.35, m.y + u * 0.55, u * 0.7, u * 0.5, 6); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = '900 ' + Math.round(u * 0.2) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('⚡ motor', m.x, m.y + u * 0.8);
        var speeds = [1].concat(tr.gears.map(function (q) { return q.speed * q.dir; }));
        if (!gearAng.length) gearAng = L.map(function () { return 0; });
        var running = anim.on && busy;
        L.forEach(function (p, i) {
          if (running && i < speeds.length) gearAng[i] = (gearAng[i] || 0) + speeds[i] * dt * 2.2 * (i === 0 ? 1 : 1);
          if (p.motor) { gearShape(g, p.x, p.y, RB * u, gearAng[0], '#ffc83d', '#a86f00', 12); return; }
          if (!p.t) {
            g.save(); g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3;
            g.beginPath(); g.arc(p.x, p.y, 0.36 * u, 0, 7); g.stroke(); g.restore();
            g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 ' + Math.round(u * 0.3) + 'px system-ui'; g.fillText('+', p.x, p.y);
            return;
          }
          var conn = i - 1 < tr.connected;
          g.save(); if (!conn) g.globalAlpha = 0.5;
          if (p.t === 'B' || p.t === 'D') gearShape(g, p.x, p.y, RB * u, gearAng[i] || 0, '#ffc83d', '#a86f00', 12);
          if (p.t === 'S' || p.t === 'D') gearShape(g, p.x, p.y, RS * u, (gearAng[i] || 0) * (p.t === 'D' ? 1 : 1), '#ff7a59', '#a3361d', 7);
          g.restore();
        });
        // the fan on the last connected gear
        if (tr.connected) {
          var f = L[tr.connected], ang = gearAng[tr.connected] || 0;
          var top = f.y - u * 1.0;
          g.strokeStyle = '#23264a'; g.lineWidth = 4; g.beginPath(); g.moveTo(f.x, f.y); g.lineTo(f.x, top); g.stroke();
          g.save(); g.translate(f.x, top); g.rotate(ang * 1.0);
          for (var k = 0; k < 3; k++) { g.rotate(Math.PI * 2 / 3); g.fillStyle = '#7ff3ff'; g.strokeStyle = '#1d6f8a'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(0, -u * 0.26, u * 0.1, u * 0.26, 0, 0, 7); g.fill(); g.stroke(); }
          g.fillStyle = '#23264a'; g.beginPath(); g.arc(0, 0, u * 0.07, 0, 7); g.fill();
          g.restore();
          if (!busy) {
            // arrow showing which way it will turn
            g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; g.beginPath();
            var cw = tr.fan.dir > 0;
            g.arc(f.x, top, u * 0.42, cw ? -2.6 : -0.5, cw ? -0.5 : -2.6, !cw); g.stroke();
          }
        }
      }
      function drawLever(g) {
        var u = V.u, groundY = V.H - u * 0.35, pivotY = groundY - 2 * u * 0.62;
        var hu = (groundY - pivotY) / 2;   // screen px per height unit (height = 2 units)
        g.fillStyle = '#5cbf4a'; g.fillRect(0, groundY, V.W, V.H - groundY);
        var f = state.f, dL = Math.abs(level.load - f), dE = Math.abs(level.effort - f);
        // the push side goes down until its end touches the ground (clockwise = the right side down)
        var maxAng = Math.asin(Math.min(1, (groundY - pivotY) / (dE * u))) * (level.effort > f ? 1 : -1);
        var ang = leverOk === null ? 0 : leverOk === true ? maxAng * leverT : maxAng * 0.08 * Math.sin(leverT * Math.PI * 6) * (1 - leverT);
        if (leverOk === 'low') ang = maxAng * (leverT < 0.5 ? leverT * 2 : 2 - leverT * 2);
        // shelf
        if (level.shelf) {
          var sy = pivotY - level.shelf * hu * 2 - u * 0.06;
          g.fillStyle = '#a86b33'; g.strokeStyle = '#5b3511'; g.lineWidth = 3;
          g.fillRect(0, sy, spotX(level.load) - u * 0.55, u * 0.18); g.strokeRect(0, sy, spotX(level.load) - u * 0.55, u * 0.18);
          g.fillRect(u * 0.3, sy, u * 0.18, groundY - sy);
        }
        // fulcrum
        var fx = spotX(f);
        g.fillStyle = '#ff9f1c'; g.strokeStyle = '#a35a00'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(fx, pivotY + 4); g.lineTo(fx - u * 0.42, groundY); g.lineTo(fx + u * 0.42, groundY); g.closePath(); g.fill(); g.stroke();
        // plank
        g.save(); g.translate(fx, pivotY); g.rotate(ang);
        var x0 = spotX(-4.45) - fx, x1 = spotX(4.45) - fx;
        g.fillStyle = '#e0a560'; g.strokeStyle = '#8a5a2b'; g.lineWidth = 3;
        LE.rr(g, x0, -u * 0.16, x1 - x0, u * 0.16, 4); g.fill(); g.stroke();
        for (var s = -4; s <= 4; s++) { g.fillStyle = 'rgba(138,90,43,.5)'; g.beginPath(); g.arc(spotX(s) - fx, -u * 0.08, 2.5, 0, 7); g.fill(); }
        // rock (load)
        var lx = spotX(level.load) - fx;
        g.fillStyle = '#9aa3b5'; g.strokeStyle = '#4a5263'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(lx - u * 0.42, -u * 0.16); g.lineTo(lx - u * 0.3, -u * 0.7); g.lineTo(lx + u * 0.1, -u * 0.86); g.lineTo(lx + u * 0.42, -u * 0.5); g.lineTo(lx + u * 0.38, -u * 0.16); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = '900 ' + Math.round(u * 0.28) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(level.weight + ' kg', lx, -u * 0.45);
        // helper weights
        state.weights.forEach(function (w) {
          var wx = spotX(w) - fx;
          g.fillStyle = '#3a3f55'; g.strokeStyle = '#111'; g.lineWidth = 2;
          LE.rr(g, wx - u * 0.2, -u * 0.5, u * 0.4, u * 0.34, 5); g.fill(); g.stroke();
          g.strokeStyle = '#3a3f55'; g.lineWidth = 3; g.beginPath(); g.arc(wx, -u * 0.5, u * 0.1, Math.PI, 0); g.stroke();
          g.fillStyle = '#fff'; g.font = '900 ' + Math.round(u * 0.18) + 'px system-ui'; g.fillText('1', wx, -u * 0.33);
        });
        // robot pushing down at the effort spot
        var ex = spotX(level.effort) - fx;
        g.save(); g.translate(ex, -u * 0.62);
        g.fillStyle = '#b38bff'; g.strokeStyle = '#5b3fbf'; g.lineWidth = 3;
        LE.rr(g, -u * 0.3, -u * 0.3, u * 0.6, u * 0.6, u * 0.16); g.fill(); g.stroke();
        g.fillStyle = '#2a1f5c'; LE.rr(g, -u * 0.2, -u * 0.18, u * 0.4, u * 0.24, 6); g.fill();
        g.fillStyle = '#7ff3ff'; g.beginPath(); g.arc(-u * 0.08, -u * 0.06, u * 0.05, 0, 7); g.arc(u * 0.08, -u * 0.06, u * 0.05, 0, 7); g.fill();
        g.restore();
        g.restore();
        if (!busy) {
          // spot hints: where the fulcrum may go
          (tool === 'weight' ? [-4, -3, -2, -1, 0, 1, 2, 3, 4].filter(function (s) { return s !== f && s !== level.load && s !== level.effort; }) : level.spots).forEach(function (s) {
            g.fillStyle = s === f && tool !== 'weight' ? 'rgba(255,225,77,.9)' : 'rgba(255,255,255,.35)';
            g.beginPath(); g.arc(spotX(s), groundY + u * 0.16, u * 0.08, 0, 7); g.fill();
          });
        }
      }
      function drawRamp(g) {
        var u = V.u, groundY = V.H - u * 0.5, bedY = groundY - level.height * u * 0.9;
        g.fillStyle = '#5cbf4a'; g.fillRect(0, groundY, V.W, V.H - groundY);
        var truckX = V.W - u * 2.2;
        // wall that limits the space
        var wallX = truckX - level.space * u - u * 0.1;
        g.fillStyle = '#c9cdd6'; g.strokeStyle = '#5a5f6e'; g.lineWidth = 2;
        g.fillRect(wallX - u * 0.35, groundY - u * 1.6, u * 0.3, u * 1.6); g.strokeRect(wallX - u * 0.35, groundY - u * 1.6, u * 0.3, u * 1.6);
        // truck
        g.fillStyle = '#3d8bff'; g.strokeStyle = '#1d4f99'; g.lineWidth = 3;
        LE.rr(g, truckX, bedY, u * 1.9, groundY - bedY - u * 0.25, 6); g.fill(); g.stroke();
        g.fillStyle = '#23263a'; g.beginPath(); g.arc(truckX + u * 0.4, groundY - u * 0.15, u * 0.22, 0, 7); g.arc(truckX + u * 1.5, groundY - u * 0.15, u * 0.22, 0, 7); g.fill();
        // ramp
        var L = state.len, rx0 = truckX - L * u, sf = SURF[state.surface] || SURF.wood;
        g.fillStyle = sf.fill; g.strokeStyle = sf.line; g.lineWidth = 3;
        g.beginPath(); g.moveTo(rx0, groundY); g.lineTo(truckX, bedY); g.lineTo(truckX, groundY); g.closePath(); g.fill(); g.stroke();
        // box + robot along the ramp
        var k = rampK, bx = rx0 + (truckX - rx0) * k + (k >= 1 ? u * 0.5 : 0), by = groundY + (bedY - groundY) * Math.min(1, k);
        var angR = Math.atan2(bedY - groundY, truckX - rx0);
        g.save(); g.translate(bx, by); if (k < 1) g.rotate(angR);
        g.fillStyle = '#c98a3a'; g.strokeStyle = '#6b4420'; g.lineWidth = 3;
        LE.rr(g, -u * 0.05, -u * 0.6, u * 0.6, u * 0.6, 4); g.fill(); g.stroke();
        g.fillStyle = '#fff'; g.font = '900 ' + Math.round(u * 0.22) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(level.weight + ' kg', u * 0.25, -u * 0.3);
        if (k < 1) { g.translate(-u * 0.45, -u * 0.35); g.fillStyle = '#b38bff'; g.strokeStyle = '#5b3fbf'; LE.rr(g, -u * 0.25, -u * 0.25, u * 0.5, u * 0.5, 8); g.fill(); g.stroke(); }
        g.restore();
        // push meter
        var r = LB.rampCheck(level, state), need = r.push || 0, max = Math.max(level.strength * 1.6, need);
        var mx = u * 0.3, my = u * 0.3, mw = Math.min(V.W * 0.45, u * 4), mh = u * 0.3;
        g.fillStyle = 'rgba(255,255,255,.9)'; LE.rr(g, mx - 4, my - 4, mw + 8, mh + 8, 8); g.fill();
        g.fillStyle = need <= level.strength ? '#33b864' : '#ff4f6d'; LE.rr(g, mx, my, mw * Math.min(1, need / max), mh, 5); g.fill();
        var sx = mx + mw * level.strength / max;
        g.strokeStyle = '#23264a'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx, my - 6); g.lineTo(sx, my + mh + 6); g.stroke();
        g.fillStyle = '#23264a'; g.font = '900 ' + Math.round(u * 0.24) + 'px system-ui'; g.textAlign = 'left'; g.textBaseline = 'top';
        g.fillText('💪 push', mx, my + mh + 8);
      }
      function drawRoll(g) {
        var u = V.u, groundY = V.H - u * 0.6, x0 = u * 2.4, len = level.floorLen || 8, sf = SURF[state.surface] || SURF.wood;
        // pond after the floor
        g.fillStyle = '#3fb4ef'; g.fillRect(x0 + len * u, groundY - u * 0.05, V.W, V.H);
        g.fillStyle = '#7a4f26'; g.fillRect(0, groundY + u * 0.2, x0 + len * u, V.H);
        g.fillStyle = sf.fill; g.strokeStyle = sf.line; g.lineWidth = 3;
        LE.rr(g, x0, groundY - u * 0.05, len * u, u * 0.3, 4); g.fill(); g.stroke();
        // target zone + star
        var tz0 = x0 + level.from * u, tz1 = x0 + level.to * u;
        g.fillStyle = 'rgba(255,225,77,.55)'; g.fillRect(tz0, groundY - u * 0.12, tz1 - tz0, u * 0.12);
        drawStar(g, (tz0 + tz1) / 2, groundY - u * 0.55, u * 0.22);
        // ramp (height h, foot at x0)
        var hpx = state.h * u * 0.75;
        g.fillStyle = '#8bd16a'; g.strokeStyle = '#3f7a26';
        g.beginPath(); g.moveTo(x0, groundY); g.lineTo(x0 - u * 2, groundY - hpx); g.lineTo(x0 - u * 2, groundY); g.closePath(); g.fill(); g.stroke();
        // ball
        var bx, by;
        if (rollPos === null) { bx = x0 - u * 2 + u * 0.25; by = groundY - hpx - u * 0.2; }
        else if (rollPos < 0) { var k = rollPos + 1; bx = x0 - u * 2 + u * 2 * k; by = groundY - hpx * (1 - k) - u * 0.25; }
        else { bx = x0 + rollPos * u; by = groundY - u * 0.25 + (rollPos > len ? (rollPos - len) * u * 0.8 : 0); }
        g.fillStyle = '#ff4f6d'; g.strokeStyle = '#8a1c33'; g.lineWidth = 3;
        g.beginPath(); g.arc(bx, by, u * 0.22, 0, 7); g.fill(); g.stroke();
        if (splash > 0) { g.strokeStyle = 'rgba(255,255,255,' + splash + ')'; g.lineWidth = 3; g.beginPath(); g.arc(x0 + (len + 0.6) * u, groundY, u * (1.2 - splash) * 0.6, Math.PI, 0); g.stroke(); }
      }
      function drawStar(g, x, y, r) {
        g.fillStyle = '#ffe14d'; g.strokeStyle = '#b38f00'; g.lineWidth = 2.5; g.beginPath();
        for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke();
      }

      /* ----- taps on the canvas ----- */
      canvas.addEventListener('pointerdown', function (e) {
        if (busy || isDemo()) return;
        var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        if (mode === 'gears') {
          var L = gearLayout(), best = -1, bd = V.u * 0.7;
          L.forEach(function (p, i) { if (i && Math.abs(p.x - x) < bd) { bd = Math.abs(p.x - x); best = i - 1; } });
          if (best >= 0) cycleSlot(best); else ctx.sfx('tap');
        } else if (mode === 'lever') {
          tapSpot(Math.max(-4, Math.min(4, Math.round((x - V.W / 2) / V.u))));
        }
      });

      /* ----- Go ----- */
      function failMsg(res) {
        var why = res.result.reason;
        if (mode === 'gears') {
          if (why === 'empty') return 'Put some gears in first! Tap an empty spot.'; // message
          if (why === 'gap') return 'There is a gap! Gears must touch to turn.'; // message
          if (why === 'dir') return 'The fan turns the wrong way! Add or take away one gear.'; // message
          if (why === 'slow') return 'Too slow! A small gear turned by a big gear spins faster.'; // message
          return 'Too fast! A bigger last gear spins slower.'; // message
        }
        if (mode === 'lever') {
          if (why === 'fulcrum') return 'Put the fulcrum under the plank, not under the rock or Robo!'; // message
          if (why === 'heavy') return level.maxWeights ? 'Too heavy! Move the fulcrum closer to the rock, or add a helper weight.' : 'Too heavy! Move the fulcrum closer to the rock.'; // message
          return 'The rock did not go high enough! Move the fulcrum a little away from the rock.'; // message
        }
        if (mode === 'ramp') {
          if (why === 'space') return 'That ramp is too long! It hits the wall.'; // message
          return 'Too hard to push! Make the ramp longer, or pick a more slippery floor.'; // message
        }
        if (why === 'short') return 'The ball stopped too soon! Start higher, or pick a smoother floor.'; // message
        return 'Too far! Start lower, or pick a rougher floor.'; // message
      }
      async function go() {
        if (busy || isDemo()) return;
        ctx.emit('run');
        var res = LB.check(level, state);
        busy = true; root.classList.add('running');
        goBtn.classList.add('busy');
        startAnim();
        if (mode === 'gears') {
          ctx.sfx('whirr');
          await LE.wait(res.result.train.connected ? 2200 : 900);
        } else if (mode === 'lever') {
          leverOk = res.ok ? true : res.result.reason === 'low' ? 'low' : false;
          ctx.sfx(res.ok ? 'creak' : 'thud');
          await LE.tween(1300, function (k) { leverT = k; }, LE.ease.inOut);
          if (res.ok) { ctx.sfx('success'); await LE.wait(400); }
        } else if (mode === 'ramp') {
          ctx.sfx('roll');
          if (res.ok) await LE.tween(1600, function (k) { rampK = k; }, LE.ease.inOut);
          else { await LE.tween(900, function (k) { rampK = 0.45 * k; }, LE.ease.out); ctx.sfx('oops'); await LE.tween(600, function (k) { rampK = 0.45 * (1 - k); }, LE.ease.in); }
          if (res.ok) { rampK = 1.01; ctx.sfx('thud'); await LE.wait(300); }
        } else if (mode === 'roll') {
          ctx.sfx('roll');
          await LE.tween(500 + state.h * 120, function (k) { rollPos = -1 + k; }, LE.ease.in);
          var d = res.result.d, len = level.floorLen || 8, end = Math.min(d, len + 1.2);
          await LE.tween(Math.min(2600, 500 + end * 260), function (k) { rollPos = end * (1 - (1 - k) * (1 - k)); }, LE.ease.linear);
          if (d > len) { ctx.sfx('splash'); await LE.tween(600, function (k) { splash = 1 - k; }); splash = 0; }
          else ctx.sfx(res.ok ? 'ding' : 'thud');
          await LE.wait(300);
        }
        if (destroyed) return;
        if (res.ok) {
          stopAnim();
          busy = false; root.classList.remove('running'); goBtn.classList.remove('busy');
          var note = res.stars < 3 ? (mode === 'gears' ? 'Tip: try it with fewer gears for 3 stars!' : mode === 'ramp' ? 'Tip: a shorter ramp that still works gets 3 stars!' : mode === 'lever' ? 'Tip: use fewer helper weights for 3 stars!' : null) : null;
          ctx.win({ stars: res.stars, note: note });
          if (mode === 'lever' || mode === 'ramp' || mode === 'roll') { /* scene stays as the result */ }
          return;
        }
        ctx.fail({ message: failMsg(res) });
        await LE.wait(700);
        if (destroyed) return;
        leverOk = null; leverT = 0; rampK = 0; rollPos = null;
        stopAnim();
        busy = false; root.classList.remove('running'); goBtn.classList.remove('busy');
        draw();
      }

      /* ----- Show me ----- */
      function showMe() {
        var sol = level.solution, steps = [];
        if (mode === 'gears') {
          var cur = state.slots.slice();
          if (cur.some(function (s, i) { return s && s !== sol.slots[i]; })) { steps.push({ from: 'clear', say: 'First, let\'s start fresh.', apply: clearGears }); cur = cur.map(function () { return null; }); }
          var types = (level.tray || ['S', 'B']).filter(function (t) { return ORDER.indexOf(t) >= 0; });
          sol.slots.forEach(function (want, i) {
            if (!want) return;
            var k = cur[i] ? types.indexOf(cur[i]) : -1, target = types.indexOf(want), n = 0;
            while (k !== target && n < 5) { k = k + 1 < types.length ? k + 1 : -1; n++;
              (function (i, first, t) { steps.push({ from: 'slot:' + i, say: first ? (t === 'S' ? 'A small gear here.' : t === 'B' ? 'A big gear here.' : 'A double gear here.') : null, apply: function () { cycleSlot(i); } }); })(i, k === target, want);
            }
          });
        } else if (mode === 'lever') {
          if (state.f !== sol.f || state.weights.length) steps.push({ from: 'spot:' + sol.f, say: 'Move the fulcrum here.', apply: function () { if (level.maxWeights) setTool('fulcrum'); state.weights = []; tapSpot(sol.f); } });
          if ((sol.weights || []).length) {
            steps.push({ from: 'tool:weight', say: 'Now a helper weight.', apply: function () { setTool('weight'); } });
            sol.weights.forEach(function (w) { steps.push({ from: 'spot:' + w, apply: function () { tapSpot(w); } }); });
          }
        } else if (mode === 'ramp') {
          steps.push({ from: 'len:' + sol.len, say: 'Pick this ramp.', apply: function () { setLen(sol.len); } });
          steps.push({ from: 'surf:' + sol.surface, say: 'And this floor.', apply: function () { setSurface(sol.surface); } });
        } else if (mode === 'roll') {
          steps.push({ from: 'h:' + sol.h, say: 'Start this high.', apply: function () { setHeight(sol.h); } });
          steps.push({ from: 'surf:' + sol.surface, say: 'And this floor.', apply: function () { setSurface(sol.surface); } });
        }
        return steps;
      }
      function targetRect(key) {
        if (!key) return null;
        if (key === 'go') return goBtn.getBoundingClientRect();
        if (key === 'goal') return goalChip.getBoundingClientRect();
        if (key === 'clear') { var c = root.querySelector('.lb-clear'); return c ? c.getBoundingClientRect() : null; }
        var m;
        if ((m = /^slot:(\d+)$/.exec(key))) return slotRect(+m[1]);
        if ((m = /^spot:(-?\d+)$/.exec(key))) return spotRect(+m[1]);
        if ((m = /^(len|surf|h|tool):(\w+)$/.exec(key))) return chips[m[1] + ':' + m[2]] ? chips[m[1] + ':' + m[2]].getBoundingClientRect() : null;
        return null;
      }
      function onResize() { layout(); }
      window.addEventListener('resize', onResize);
      requestAnimationFrame(layout);
      return {
        get busy() { return busy; },
        target: targetRect,
        showMe: showMe,
        go: go,
        stop: function () { stopFlag = true; },
        reset: function () {
          state = level.startState ? JSON.parse(JSON.stringify(level.startState)) : initial();
          tool = 'fulcrum'; leverOk = null; leverT = 0; rampK = 0; rollPos = null; gearAng = [];
          markChips(); changed(); ctx.sfx('whoosh');
        },
        getState: function () { return JSON.parse(JSON.stringify(state)); },
        destroy: function () { destroyed = true; stopAnim(); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); root.remove(); },
        root: root
      };
    }
  }

  LE.views.lab = { create: create };
})();
