/* Level 2 — Engineer Challenges: the building site (houses, towers, crane arms) with an animated END TEST.
 * Same building as Bridges (drag from a bolt to a dot; wood / steel / erase; undo; coins), on flat ground with
 * concrete bolts. Go runs the test from js/logic/structures.js: wind gusts, an earthquake or the crane lifting a box.
 * Beams glow green → yellow → red with stress; a beam that breaks snaps and the loose part falls. Never punishing:
 * the building comes back after a failed test. The static scene is drawn once into an offscreen canvas (fast). */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var S = LE.logic.structures;
  var BL = LE.logic.bridges;

  var ICONS = {
    wood: '<svg viewBox="0 0 48 48"><g transform="rotate(-30 24 24)"><rect x="4" y="18" width="40" height="12" rx="6" fill="#8a4b16"/><rect x="5" y="19.5" width="38" height="8" rx="4" fill="#f3a04a"/><path d="M10 22 h12 M26 25 h10" stroke="#c9742a" stroke-width="2" stroke-linecap="round"/><circle cx="10" cy="24" r="3.2" fill="#fff" stroke="#6b3d12" stroke-width="1.5"/><circle cx="38" cy="24" r="3.2" fill="#fff" stroke="#6b3d12" stroke-width="1.5"/></g></svg>',
    steel: '<svg viewBox="0 0 48 48"><g transform="rotate(-30 24 24)"><rect x="4" y="17" width="40" height="14" rx="5" fill="#2c3f5a"/><rect x="5" y="18.5" width="38" height="9" rx="3.5" fill="#a9c6e6"/><rect x="7" y="19.5" width="34" height="2.5" rx="1.2" fill="#e3f0ff"/><circle cx="17" cy="24" r="1.8" fill="#2c3f5a"/><circle cx="24" cy="24" r="1.8" fill="#2c3f5a"/><circle cx="31" cy="24" r="1.8" fill="#2c3f5a"/><circle cx="10" cy="24" r="3.2" fill="#fff" stroke="#2c3f5a" stroke-width="1.5"/><circle cx="38" cy="24" r="3.2" fill="#fff" stroke="#2c3f5a" stroke-width="1.5"/></g></svg>',
    erase: '<svg viewBox="0 0 48 48"><g transform="rotate(-35 24 24)"><rect x="8" y="15" width="32" height="18" rx="5" fill="#ff8fb1" stroke="#a3204a" stroke-width="2.5"/><rect x="8" y="15" width="12" height="18" rx="5" fill="#fff" stroke="#a3204a" stroke-width="2.5"/></g><path d="M10 40 h28" stroke="rgba(0,0,0,.25)" stroke-width="3" stroke-linecap="round"/></svg>',
    undo: '<svg viewBox="0 0 24 24"><path d="M9 6 L4 11 L9 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 11 H14 a5 5 0 0 1 0 10 H11" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
    clear: '<svg viewBox="0 0 24 24"><path d="M5 7 h14 M10 4 h4 M7 7 l1 13 h8 l1 -13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    go: '<svg viewBox="0 0 24 24"><path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
    stop: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/></svg>'
  };
  var COIN = '<svg class="br-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffc83d" stroke="#b07a00" stroke-width="2.2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#e8a200" stroke-width="1.8"/></svg>';
  var TEST_ICON = { wind: '🌬️', quake: '🌋', lift: '🏗️' };
  var TEST_LABEL = { wind: 'Wind test', quake: 'Quake test', lift: 'Lift test' };

  var MAT_STYLE = {
    wood: { fill: '#f3a04a', dark: '#8a4b16', light: '#ffd08a' },
    steel: { fill: '#a9c6e6', dark: '#2c3f5a', light: '#e8f3ff' }
  };
  var STRESS = [[0, [61, 220, 106]], [0.5, [255, 214, 31]], [0.8, [255, 140, 26]], [1, [255, 48, 48]]];
  function stressRGB(r) {
    r = Math.min(1, Math.abs(r));
    for (var i = 1; i < STRESS.length; i++) {
      if (r <= STRESS[i][0]) {
        var a = STRESS[i - 1], b = STRESS[i], k = (r - a[0]) / (b[0] - a[0]);
        return [0, 1, 2].map(function (j) { return Math.round(a[1][j] + (b[1][j] - a[1][j]) * k); });
      }
    }
    return STRESS[STRESS.length - 1][1];
  }
  function rgb(c) { return 'rgb(' + c.join(',') + ')'; }
  function darker(c, f) { return c.map(function (v) { return Math.round(v * f); }); }

  function create(host, level, ctx) {
    var mats = level.materials || ['wood'];
    var hasSteel = mats.indexOf('steel') >= 0;
    var test = level.test || 'wind';

    function fromList(list) { try { return S.parseAll(list || []); } catch (e) { return []; } }
    function validBeam(b) {
      return S.validPoint(level, b.x1, b.y1) && S.validPoint(level, b.x2, b.y2) && Math.abs(b.x2 - b.x1) <= 1 && Math.abs(b.y2 - b.y1) <= 1 && mats.indexOf(b.m) >= 0;
    }
    var saved = ctx.savedState;
    var beams = ((saved && Array.isArray(saved.beams)) ? fromList(saved.beams) : fromList(level.startBeams)).filter(validBeam);
    var undoStack = [];
    var tool = 'wood';
    var busy = false, destroyed = false, stopFlag = false;
    var selected = null, drag = null, erasing = false;
    var sim = null;               // { res, f, k, hidden:{}, showStress, wobbleAmp, wobNodes, shake, box }
    var debris = [], labels = [], dust = [], gusts = [];
    var hintPulse = 0, shownStars = null;

    /* ----- DOM ----- */
    var root = h('div.br-wrap.fr-wrap.fr-' + test);
    var stage = h('div.br-stage.fr-stage');
    var canvas = h('canvas.br-canvas');
    var coinsNum = h('span.br-coins-num', '0');
    var coinStars = h('div.br-coins-stars');
    var coins = h('div.br-coins', { html: COIN }, coinsNum, coinStars);
    var testTag = h('div.fr-test', TEST_ICON[test] + ' ' + TEST_LABEL[test]);
    var undoBtn = LE.button('icon br-undo', ICONS.undo, function () { if (!busy && !isDemo()) undo(); }, { label: 'Undo', sound: false });
    var clearBtn = LE.button('icon br-clear', ICONS.clear, function () { if (!busy && !isDemo()) clearAll(true); }, { label: 'Clear', sound: false });
    var hud = h('div.br-hud', h('div.fr-hud-l', coins, testTag), h('div.br-hud-r', undoBtn, clearBtn));
    stage.append(canvas, hud);
    var toolBtns = {};
    function toolBtn(name, label) {
      var b = h('button.br-tool.pressable.br-tool-' + name, { type: 'button', 'aria-label': label, 'data-tool': name },
        h('div.br-tool-ico', { html: ICONS[name] }), h('div.br-tool-lbl', label));
      b.addEventListener('click', function () { if (!busy && !isDemo()) setTool(name, true); });
      toolBtns[name] = b;
      return b;
    }
    var tools = h('div.br-tools', toolBtn('wood', hasSteel ? 'Wood' : 'Build'), hasSteel ? toolBtn('steel', 'Steel') : null, toolBtn('erase', 'Erase'));
    var goBtn = LE.button('go-btn green', ICONS.go + '<span>Test!</span>', function () { if (busy) stop(); else go(); }, { label: 'Go', sound: 'click' });
    var bar = h('div.br-bar', tools, goBtn);
    root.append(stage, bar);
    host.appendChild(root);
    function isDemo() { return !!(ctx.isDemo && ctx.isDemo()); }

    /* ----- Geometry ----- */
    var V = { W: 300, H: 300, cell: 40, g: null, ox: 0, oy: 0, bg: null, dpr: 1 };
    var top = level.top || 0;
    function layout() {
      // clientWidth/Height: not scaled by the screen's entrance animation (getBoundingClientRect is)
      var W = Math.max(200, Math.floor(stage.clientWidth)), H = Math.max(180, Math.floor(stage.clientHeight));
      var rows = level.ground - top;
      var cell = Math.min((W - 16) / (level.cols + 0.6), (H - 64) / (rows + 0.9), 78);
      V.W = W; V.H = H; V.cell = cell;
      V.ox = (W - level.cols * cell) / 2;
      V.oy = H - 0.75 * cell - level.ground * cell;     // screen y of row 0 (the ground line sits 0.75 cell above the bottom)
      // at most 2× pixels: the end-test animation must stay smooth on older phones (4× CPU throttle in e2e)
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      V.g = canvas.getContext('2d'); V.dpr = dpr;
      paintBackground();
    }
    function X(x) { return V.ox + x * V.cell; }
    function Y(y) { return V.oy + y * V.cell; }
    function toWorld(cx, cy) { var r = canvas.getBoundingClientRect(); return { x: (cx - r.left - V.ox) / V.cell, y: (cy - r.top - V.oy) / V.cell }; }
    function toClient(x, y) { var r = canvas.getBoundingClientRect(); return { x: r.left + X(x), y: r.top + Y(y) }; }

    /* ----- Model helpers ----- */
    var anchorList = S.anchorsOf(level);
    var anchorKeys = {};
    anchorList.forEach(function (a) { anchorKeys[a[0] + ',' + a[1]] = true; });
    var validPts = [];
    for (var yy = top; yy < level.ground; yy++) for (var xx = 0; xx <= level.cols; xx++) if (S.validPoint(level, xx, yy)) validPts.push([xx, yy]);
    anchorList.forEach(function (a) { validPts.push(a); });
    function nearestStart(wx, wy, radius) {
      var s = S.startNodes(level, beams), best = null, bd = radius;
      Object.keys(s).forEach(function (k) { var p = k.split(',').map(Number), d = Math.hypot(p[0] - wx, p[1] - wy); if (d < bd) { bd = d; best = p; } });
      return best;
    }
    function nearestPoint(wx, wy, radius) {
      var best = null, bd = radius;
      validPts.forEach(function (p) { var d = Math.hypot(p[0] - wx, p[1] - wy); if (d < bd) { bd = d; best = p; } });
      return best;
    }
    function beamAt(wx, wy, tol) {
      var best = -1, bd = tol;
      beams.forEach(function (b, i) {
        var dx = b.x2 - b.x1, dy = b.y2 - b.y1, L2 = dx * dx + dy * dy;
        var t = Math.max(0, Math.min(1, ((wx - b.x1) * dx + (wy - b.y1) * dy) / L2));
        var d = Math.hypot(b.x1 + dx * t - wx, b.y1 + dy * t - wy);
        if (d < bd) { bd = d; best = i; }
      });
      return best;
    }
    function curMat() { return tool === 'steel' ? 'steel' : 'wood'; }
    function snapTarget(from, wx, wy) {
      var rx = Math.round(wx), ry = Math.round(wy);
      if (Math.hypot(rx - wx, ry - wy) < 0.45 && S.checkBeam(level, beams, from[0], from[1], rx, ry, curMat()).ok) return [rx, ry];
      var best = null, bd = 0.85;
      S.reachable(level, beams, from[0], from[1], curMat()).forEach(function (p) { var d = Math.hypot(p[0] - wx, p[1] - wy); if (d < bd) { bd = d; best = p; } });
      return best;
    }

    /* ----- Actions (touch, tutorial and Show me share these) ----- */
    function changed() { ctx.saveState && ctx.saveState({ beams: beams.map(S.beamStr) }); updateHUD(); }
    function pushUndo() { undoStack.push(beams.map(S.beamStr)); if (undoStack.length > 60) undoStack.shift(); }
    var REASONS = { long: 'Too far!', point: 'Not there!', anchors: 'Not there!', start: 'Start at a bolt!', material: 'Not there!' };
    function placeBeam(ax, ay, bx, by, m) {
      m = m || curMat();
      var r = S.addBeam(level, beams, ax, ay, bx, by, m);
      if (!r.ok) {
        if (r.reason !== 'dup' && r.reason !== 'same') { ctx.sfx('buzz'); addLabel((ax + bx) / 2, (ay + by) / 2, REASONS[r.reason] || 'Oops!', '#ff4f6d'); }
        return false;
      }
      pushUndo();
      beams = r.beams;
      selected = null;
      ctx.sfx('place');
      var b = r.added, c = toClient((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2);
      ctx.fx.burst(c.x, c.y, { n: 7, color: b.m === 'steel' ? '#dbe9ff' : '#ffd08a', speed: 3, size: 6 });
      addLabel((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2 - 0.15, '-' + BL.MATERIALS[b.m].cost, '#ffc83d', true);
      (level.targets || []).forEach(function (tg) {
        if ((tg[0] === b.x1 && tg[1] === b.y1) || (tg[0] === b.x2 && tg[1] === b.y2)) { var q = toClient(tg[0], tg[1]); ctx.fx.sparkle(q.x, q.y, '#ffe14d'); ctx.sfx('ding'); }
      });
      changed();
      ctx.emit('place', { beam: S.beamStr(b) });
      return true;
    }
    function removeBeam(i, quiet) {
      if (i < 0 || i >= beams.length) return;
      pushUndo();
      var b = beams.splice(i, 1)[0];
      addDebris(b, 0, true);
      if (!quiet) ctx.sfx('remove');
      changed();
      ctx.emit('remove', { beam: S.beamStr(b) });
    }
    function undo() {
      if (!undoStack.length) { ctx.sfx('buzz'); LE.shake(undoBtn); return; }
      beams = fromList(undoStack.pop());
      selected = null; ctx.sfx('whoosh'); changed(); ctx.emit('undo');
    }
    function clearAll(user) {
      if (!beams.length) { if (user) { ctx.sfx('buzz'); LE.shake(clearBtn); } return; }
      pushUndo();
      beams.forEach(function (b) { addDebris(b, 0, true); });
      beams = []; selected = null; ctx.sfx('whoosh'); changed(); ctx.emit('clear');
    }
    function setTool(name, user) {
      if (!toolBtns[name]) return;
      tool = name; selected = null;
      Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.toggle('on', k === name); });
      root.classList.toggle('erasing', name === 'erase');
      if (user) { ctx.sfx('click'); LE.bounce(toolBtns[name], 1.12); }
      ctx.emit('tool', { tool: name });
    }
    function updateHUD() {
      var c = S.cost(beams);
      coinsNum.textContent = String(c);
      var st = S.starsForCost(level, c);
      if (shownStars !== st) {
        var html = '';
        for (var i = 0; i < 3; i++) html += LE.starSVG(i < st);
        coinStars.innerHTML = html;
        if (shownStars !== null && st < shownStars) { LE.shake(coins); ctx.sfx('pop'); }
        shownStars = st;
      }
      coins.classList.toggle('over', c > level.budget3);
      undoBtn.disabled = !undoStack.length;
      clearBtn.disabled = !beams.length;
    }

    /* ----- Effects ----- */
    function addLabel(x, y, text, color, coin) { labels.push({ x: x, y: y, text: text, color: color, coin: !!coin, t: 0 }); }
    function addDebris(b, delay, small) {
      debris.push({ b: b, cx: (b.x1 + b.x2) / 2, cy: (b.y1 + b.y2) / 2, len: Math.hypot(b.x2 - b.x1, b.y2 - b.y1), ang: Math.atan2(b.y2 - b.y1, b.x2 - b.x1),
        vx: (Math.random() - 0.5) * (small ? 0.6 : 1.6), vy: small ? -1.2 : -0.8, va: (Math.random() - 0.5) * (small ? 4 : 6),
        delay: delay || 0, alpha: 1, landed: false, shrink: !!small, stress: null });
    }

    /* ----- Static background (drawn once per layout) ----- */
    function paintBackground() {
      var c = document.createElement('canvas');
      c.width = Math.round(V.W * V.dpr); c.height = Math.round(V.H * V.dpr);
      var g = c.getContext('2d');
      g.scale(V.dpr, V.dpr);
      // blueprint sky
      var gr = g.createLinearGradient(0, 0, 0, V.H);
      gr.addColorStop(0, '#1f5fae'); gr.addColorStop(1, '#3d8fe0');
      g.fillStyle = gr; g.fillRect(0, 0, V.W, V.H);
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
      var step = V.cell / 2;
      for (var x = V.ox % step; x < V.W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, V.H); g.stroke(); }
      for (var y = V.oy % step; y < V.H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(V.W, y); g.stroke(); }
      // ground
      var gy = Y(level.ground);
      g.fillStyle = '#5cbf4a'; g.fillRect(0, gy, V.W, V.cell * 0.18);
      var dg = g.createLinearGradient(0, gy, 0, V.H);
      dg.addColorStop(0, '#a8743f'); dg.addColorStop(1, '#7a4f26');
      g.fillStyle = dg; g.fillRect(0, gy + V.cell * 0.16, V.W, V.H - gy);
      g.fillStyle = 'rgba(0,0,0,.12)';
      for (var i = 0; i < 18; i++) { g.beginPath(); g.arc((i * 97) % V.W, gy + V.cell * (0.35 + ((i * 37) % 30) / 100), V.cell * 0.04, 0, 7); g.fill(); }
      // concrete foundation under each bolt
      anchorList.forEach(function (a) {
        if (a[1] !== level.ground) return;
        var px = X(a[0]);
        g.fillStyle = '#c9cdd6'; g.strokeStyle = '#5a5f6e'; g.lineWidth = 2;
        LE.rr(g, px - V.cell * 0.28, gy - 2, V.cell * 0.56, V.cell * 0.36, 5); g.fill(); g.stroke();
      });
      // lift test: the crane winch house on the ground
      if (test === 'lift' && level.hook) {
        var hx = X(level.hook[0]);
        g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([5, 6]); g.lineWidth = 2;
        g.beginPath(); g.moveTo(hx, Y(level.hook[1]) + V.cell * 0.2); g.lineTo(hx, gy - V.cell * 0.4); g.stroke(); g.setLineDash([]);
      }
      V.bg = c;
    }

    /* ----- Drawing ----- */
    function nodePos(x, y, d, k) {
      var px = X(x), py = Y(y);
      if (d && k) { var q = d[x + ',' + y]; if (q) { px += q[0] * k * V.cell; py += q[1] * k * V.cell; } }
      return [px, py];
    }
    function beamPath(g, a, c, w) {
      var dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
      g.beginPath(); g.moveTo(a[0] + nx, a[1] + ny); g.lineTo(c[0] + nx, c[1] + ny); g.lineTo(c[0] - nx, c[1] - ny); g.lineTo(a[0] - nx, a[1] - ny); g.closePath();
    }
    function drawBeam(g, b, a, c, opts) {
      opts = opts || {};
      var st = MAT_STYLE[b.m] || MAT_STYLE.wood;
      var w = V.cell * (b.m === 'steel' ? 0.2 : 0.17);
      var fill = st.fill, dark = st.dark, light = st.light;
      if (opts.stress !== null && opts.stress !== undefined) {
        var sc = stressRGB(opts.stress);
        fill = rgb(sc); dark = rgb(darker(sc, 0.45)); light = rgb(sc.map(function (v) { return Math.min(255, v + 70); }));
      }
      if (opts.alpha !== undefined) { g.save(); g.globalAlpha = opts.alpha; }
      g.fillStyle = dark; beamPath(g, a, c, w + 4); g.fill();
      g.fillStyle = fill; beamPath(g, a, c, w); g.fill();
      g.strokeStyle = light; g.lineWidth = Math.max(1.5, w * 0.18); g.lineCap = 'round';
      var dx = c[0] - a[0], dy = c[1] - a[1], L = Math.hypot(dx, dy) || 1, ox = -dy / L * w * 0.22, oy = dx / L * w * 0.22;
      g.beginPath(); g.moveTo(a[0] - ox + dx * 0.1, a[1] - oy + dy * 0.1); g.lineTo(c[0] - ox - dx * 0.1, c[1] - oy - dy * 0.1); g.stroke();
      if (opts.alpha !== undefined) g.restore();
    }
    function drawBolt(g, x, y, r) {
      g.fillStyle = '#fff'; g.strokeStyle = '#4a4f5e'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#4a4f5e'; g.beginPath(); g.arc(x, y, r * 0.35, 0, 7); g.fill();
    }
    function drawStar(g, x, y, r, rot, fill) {
      g.save(); g.translate(x, y); g.rotate(rot || 0);
      g.fillStyle = fill || '#ffe14d'; g.strokeStyle = '#b38f00'; g.lineWidth = 2.5;
      g.beginPath();
      for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke(); g.restore();
    }
    function drawBox(g, x, y, s, ang) {
      g.save(); g.translate(x, y); g.rotate(ang || 0);
      g.fillStyle = '#c98a3a'; g.strokeStyle = '#6b4420'; g.lineWidth = 2.5;
      LE.rr(g, -s / 2, 0, s, s * 0.8, 5); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(107,68,32,.6)'; g.beginPath(); g.moveTo(-s / 2 + 4, s * 0.4); g.lineTo(s / 2 - 4, s * 0.4); g.stroke();
      g.fillStyle = '#fff'; g.font = '900 ' + Math.round(s * 0.3) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(level.boxLabel || '1 t'), 0, s * 0.62);
      g.restore();
    }

    function curState() {
      if (!sim || !sim.res.G) return null;
      return S.stateAt(sim.res, sim.f);
    }

    function draw(t, dt) {
      var g = V.g;
      if (!g) return;
      var shakeX = sim && sim.shake ? sim.shake * V.cell * 0.18 : 0;
      g.setTransform(1, 0, 0, 1, 0, 0);
      if (V.bg) g.drawImage(V.bg, 0, 0); else g.clearRect(0, 0, V.W * V.dpr, V.H * V.dpr);   // the background covers everything
      g.setTransform(V.dpr, 0, 0, V.dpr, shakeX * V.dpr, 0);

      var st = curState();
      var k = sim ? sim.k : 0, d = st ? st.d : null;
      var wob = sim && sim.wobbleAmp ? sim.wobbleAmp : 0;
      function P(x, y) {
        var p = nodePos(x, y, d, k);
        if (wob && sim.wobNodes[x + ',' + y]) { p[0] += Math.sin(t * 28 + x) * wob * V.cell; p[1] += Math.cos(t * 23 + y) * wob * V.cell * 0.6; }
        return p;
      }
      // grid dots (+ reachable glow while building)
      if (!busy) {
        var reach = null, from = drag ? drag.from : selected;
        if (from && tool !== 'erase') { reach = {}; S.reachable(level, beams, from[0], from[1], curMat()).forEach(function (p) { reach[p[0] + ',' + p[1]] = true; }); }
        validPts.forEach(function (p) {
          var key = p[0] + ',' + p[1];
          if (anchorKeys[key]) return;
          var px = X(p[0]), py = Y(p[1]);
          if (reach && reach[key]) {
            g.fillStyle = 'rgba(255,225,77,.35)'; g.beginPath(); g.arc(px, py, V.cell * 0.2 * (1 + Math.sin(t * 6) * 0.15), 0, 7); g.fill();
            g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(px, py, V.cell * 0.08, 0, 7); g.fill();
          } else { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(px, py, V.cell * 0.05, 0, 7); g.fill(); }
        });
      }
      // target stars (behind the beams)
      var joints = {};
      beams.forEach(function (b, i) { if (sim && sim.hidden[i]) return; joints[b.x1 + ',' + b.y1] = joints[b.x1 + ',' + b.y1] || b.m === 'steel'; joints[b.x2 + ',' + b.y2] = joints[b.x2 + ',' + b.y2] || b.m === 'steel'; });
      (level.targets || []).forEach(function (tg) {
        var got = joints[tg[0] + ',' + tg[1]] !== undefined;
        var p = P(tg[0], tg[1]);
        var flash = sim && sim.missing && sim.missing[tg[0] + ',' + tg[1]] ? (Math.sin(t * 14) > 0 ? 1.25 : 0.9) : 1;
        if (!got) { g.fillStyle = 'rgba(255,225,77,.25)'; g.beginPath(); g.arc(p[0], p[1], V.cell * 0.34 * flash, 0, 7); g.fill(); }
        drawStar(g, p[0], p[1] - (got ? V.cell * 0.32 : 0), V.cell * (got ? 0.17 : 0.22) * flash, Math.sin(t * 2) * 0.15, got ? '#ffe14d' : '#fff3a8');
      });
      // beams
      beams.forEach(function (b, i) {
        if (sim && sim.hidden[i]) return;
        var alpha;
        if (!busy && tool === 'erase' && eraseHover === i) alpha = 0.5;
        drawBeam(g, b, P(b.x1, b.y1), P(b.x2, b.y2), { stress: (sim && st && sim.showStress) ? st.r[i] : null, alpha: alpha });
      });
      Object.keys(joints).forEach(function (key) {
        if (anchorKeys[key]) return;
        var p = key.split(',').map(Number), q = P(p[0], p[1]);
        g.fillStyle = joints[key] ? '#e8f3ff' : '#fff1d6'; g.strokeStyle = joints[key] ? '#2c3f5a' : '#6b3d12'; g.lineWidth = 2;
        g.beginPath(); g.arc(q[0], q[1], V.cell * 0.085, 0, 7); g.fill(); g.stroke();
      });
      var hp = hintPulse > 0 ? hintPulse : 0;
      anchorList.forEach(function (a) {
        var px = X(a[0]), py = Y(a[1]);
        if (hp) { g.fillStyle = 'rgba(255,225,77,' + (0.5 * hp) + ')'; g.beginPath(); g.arc(px, py, V.cell * (0.25 + (1 - hp) * 0.2), 0, 7); g.fill(); }
        drawBolt(g, px, py, V.cell * 0.12);
      });
      // the crane's box on its rope
      if (test === 'lift' && level.hook) {
        var hk = P(level.hook[0], level.hook[1]);
        var lift = sim ? sim.box : 0;
        var gy = Y(level.ground) - V.cell * 0.62;
        var by = gy + (hk[1] + V.cell * 0.55 - gy) * lift;
        if (sim && sim.boxFall) by = gy;
        g.strokeStyle = '#23264a'; g.lineWidth = 2.5;
        if (!(sim && sim.boxFall)) { g.beginPath(); g.moveTo(hk[0], hk[1]); g.lineTo(hk[0], by); g.stroke(); }
        drawBox(g, hk[0], by, V.cell * 0.7, sim && sim.boxFall ? 0.2 : Math.sin(t * 3) * 0.04 * lift);
      }
      // selection ring + rubber band
      if (selected && !busy) { g.strokeStyle = '#ffe14d'; g.lineWidth = 4; g.beginPath(); g.arc(X(selected[0]), Y(selected[1]), V.cell * (0.24 + Math.sin(t * 6) * 0.03), 0, 7); g.stroke(); }
      var rb = rubberBand();
      if (rb) {
        if (rb.target) {
          var fake = S.parseAll([{ x1: rb.from[0], y1: rb.from[1], x2: rb.target[0], y2: rb.target[1], m: curMat() }])[0];
          drawBeam(g, fake, [X(fake.x1), Y(fake.y1)], [X(fake.x2), Y(fake.y2)], { alpha: 0.75 });
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(X(rb.target[0]), Y(rb.target[1]), V.cell * 0.2, 0, 7); g.stroke();
        } else if (rb.finger) {
          g.save(); g.setLineDash([8, 7]); g.strokeStyle = 'rgba(255,79,109,.9)'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(X(rb.from[0]), Y(rb.from[1])); g.lineTo(rb.finger[0], rb.finger[1]); g.stroke(); g.restore();
        }
      }
      // debris falls to the ground
      var groundY = level.ground - 0.05;
      for (var di = debris.length - 1; di >= 0; di--) {
        var db = debris[di];
        if (db.delay > 0) { db.delay -= dt; continue; }
        db.vy += 9 * dt; db.cx += db.vx * dt; db.cy += db.vy * dt; db.ang += db.va * dt;
        if (db.shrink) db.alpha -= dt * 1.6;
        if (db.cy > groundY) {
          db.cy = groundY;
          if (!db.landed) { db.landed = true; var cl = toClient(db.cx, groundY); ctx.fx.burst(cl.x, cl.y, { n: 6, color: '#d9b48a', speed: 2.5, size: 5 }); }
          db.vy = 0; db.vx *= 0.8; db.va *= 0.6; db.alpha -= dt * 0.9;
        }
        if (db.alpha <= 0) { debris.splice(di, 1); continue; }
        var hx = Math.cos(db.ang) * db.len / 2, hy = Math.sin(db.ang) * db.len / 2;
        drawBeam(g, db.b, [X(db.cx - hx), Y(db.cy - hy)], [X(db.cx + hx), Y(db.cy + hy)], { stress: db.stress, alpha: Math.max(0, db.alpha) });
      }
      // wind streaks
      if (gusts.length) {
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 3; g.lineCap = 'round';
        gusts.forEach(function (w) {
          w.x += w.v * dt; if (w.x > V.W + 60) w.x = -60 - Math.random() * 80;
          g.beginPath(); g.moveTo(w.x, w.y); g.quadraticCurveTo(w.x + w.len / 2, w.y - 6, w.x + w.len, w.y); g.stroke();
        });
      }
      // labels
      for (var li = labels.length - 1; li >= 0; li--) {
        var lb = labels[li];
        lb.t += dt;
        if (lb.t > 1.1) { labels.splice(li, 1); continue; }
        var ly = Y(lb.y) - lb.t * V.cell * 0.7, lx = X(lb.x);
        g.save(); g.globalAlpha = Math.min(1, 2.2 - lb.t * 2);
        g.font = '900 ' + Math.round(Math.max(15, V.cell * 0.32)) + 'px ui-rounded, system-ui, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 5; g.strokeStyle = lb.coin ? 'rgba(35,38,74,.75)' : '#fff';
        g.strokeText(lb.text, lx, ly); g.fillStyle = lb.color; g.fillText(lb.text, lx, ly);
        g.restore();
      }
      if (hintPulse > 0) hintPulse = Math.max(0, hintPulse - dt * 0.8);
    }

    var handDrag = null;
    function rubberBand() {
      if (drag && drag.moved) { var r = canvas.getBoundingClientRect(); return { from: drag.from, target: drag.target, finger: [drag.cx - r.left, drag.cy - r.top] }; }
      var hand = document.getElementById('hand');
      if (hand && hand.classList.contains('drag') && hand.classList.contains('show') && tool !== 'erase') {
        var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(hand.style.transform || '');
        if (!m) return null;
        var hx = +m[1] + 23, hy = +m[2] + 3, w = toWorld(hx, hy);
        if (!handDrag) { var st = nearestStart(w.x, w.y, 0.45); handDrag = st ? { from: st } : { from: null }; }
        if (!handDrag.from) return null;
        var tgt = Math.hypot(w.x - handDrag.from[0], w.y - handDrag.from[1]) > 0.35 ? snapTarget(handDrag.from, w.x, w.y) : null;
        var cr = canvas.getBoundingClientRect();
        return { from: handDrag.from, target: tgt, finger: tgt ? null : [hx - cr.left, hy - cr.top] };
      }
      handDrag = null;
      return null;
    }

    var raf = 0, t0 = performance.now(), last = t0;
    var perf = { frames: 0, drawMs: 0, maxMs: 0, gaps: [] };   // measured while the end test animates (e2e perf check)
    function frame(now) {
      if (destroyed) return;
      var gap = now - last;
      var dt = Math.min(0.05, gap / 1000) * LE.speed;
      last = now;
      var d0 = performance.now();
      draw((now - t0) / 1000, dt);
      if (busy) {
        var ms = performance.now() - d0;
        perf.frames++; perf.drawMs += ms; perf.maxMs = Math.max(perf.maxMs, ms);
        if (perf.gaps.length < 2000) perf.gaps.push(gap);
      }
      raf = requestAnimationFrame(frame);
    }

    /* ----- Pointer input ----- */
    var eraseHover = -1;
    function onDown(e) {
      if (busy || isDemo()) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      var w = toWorld(e.clientX, e.clientY);
      if (tool === 'erase') { erasing = true; var bi = beamAt(w.x, w.y, 0.32); if (bi >= 0) removeBeam(bi); else ctx.sfx('tap'); capture(); return; }
      var st = nearestStart(w.x, w.y, 0.5);
      if (!st && selected) { var p = nearestPoint(w.x, w.y, 0.5); if (p) placeBeam(selected[0], selected[1], p[0], p[1]); else { selected = null; ctx.sfx('tap'); } return; }
      if (!st) { hintPulse = 1; ctx.sfx('tap'); return; }
      drag = { from: st, target: null, moved: false, cx: e.clientX, cy: e.clientY, sx: e.clientX, sy: e.clientY };
      capture();
    }
    function capture() {
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }
    function release() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    }
    function onMove(e) {
      e.preventDefault();
      var w = toWorld(e.clientX, e.clientY);
      if (erasing) { var bi = beamAt(w.x, w.y, 0.25); if (bi >= 0) removeBeam(bi); return; }
      if (!drag) return;
      drag.cx = e.clientX; drag.cy = e.clientY;
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > V.cell * 0.3) { drag.moved = true; ctx.sfx('pop'); selected = null; }
      if (drag.moved) {
        var tg = snapTarget(drag.from, w.x, w.y);
        if (tg && (!drag.target || tg[0] !== drag.target[0] || tg[1] !== drag.target[1])) ctx.sfx('tap');
        drag.target = tg;
      }
    }
    function onUp(e) {
      release();
      if (erasing) { erasing = false; return; }
      var d = drag; drag = null;
      if (!d) return;
      if (d.moved) {
        if (d.target) placeBeam(d.from[0], d.from[1], d.target[0], d.target[1]);
        else {
          var w = toWorld(e.clientX, e.clientY), p = nearestPoint(w.x, w.y, 0.5);
          if (p && (p[0] !== d.from[0] || p[1] !== d.from[1])) placeBeam(d.from[0], d.from[1], p[0], p[1]); else ctx.sfx('whoosh');
        }
        return;
      }
      if (selected && (selected[0] !== d.from[0] || selected[1] !== d.from[1])) {
        if (S.checkBeam(level, beams, selected[0], selected[1], d.from[0], d.from[1], curMat()).ok) { placeBeam(selected[0], selected[1], d.from[0], d.from[1]); return; }
      }
      if (selected && selected[0] === d.from[0] && selected[1] === d.from[1]) { selected = null; ctx.sfx('tap'); return; }
      selected = d.from; ctx.sfx('click');
      ctx.emit('select', { node: d.from.join(',') });
    }
    function onCancel() { release(); drag = null; erasing = false; }
    function onHover(e) {
      if (tool !== 'erase' || busy) { eraseHover = -1; return; }
      var w = toWorld(e.clientX, e.clientY);
      eraseHover = beamAt(w.x, w.y, 0.32);
    }
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onHover);

    /* ----- The end test ----- */
    function setRunning(on) {
      busy = on;
      root.classList.toggle('running', on);
      goBtn.classList.toggle('green', !on); goBtn.classList.toggle('red', on);
      goBtn.innerHTML = (on ? ICONS.stop : ICONS.go) + '<span>' + (on ? 'Stop' : 'Test!') + '</span>';
    }
    function stop() { if (busy) stopFlag = true; }
    function failMessage(res) {
      if (res.reason === 'empty') return 'Build something first! Drag from a bolt.';
      if (res.reason === 'reach') return 'Build all the way up to the gold star!';
      if (res.reason === 'wobbly') return 'Too wobbly! Add a triangle brace.';
      if (test === 'wind') return hasSteel ? 'The wind was too strong! Add a brace, or try steel.' : 'The wind was too strong! Add a triangle brace?';
      if (test === 'quake') return hasSteel ? 'The shaking broke a beam! Brace it, or use steel at the bottom.' : 'The shaking broke a beam! Add more triangle braces.';
      return hasSteel ? 'The box was too heavy! Make the arm stronger with triangles or steel.' : 'The box was too heavy! Make the arm stronger with triangles.';
    }
    /** Animate the test strength from f0 to f1 (quake: shaking amplitude ramps; f follows a sine). */
    async function ramp(ms, fn) {
      await LE.tween(ms, function (k) { if (stopFlag || destroyed) return; fn(k); }, LE.ease.linear);
    }
    function exaggeration(res) {
      var maxD = 0;
      [res.G.d, res.L.d].forEach(function (dd) { Object.keys(dd).forEach(function (key) { maxD = Math.max(maxD, Math.abs(dd[key][0]), Math.abs(dd[key][1])); }); });
      return maxD > 0 ? Math.min(30, 0.12 / maxD) : 0;
    }
    function startGusts() {
      gusts = [];
      for (var i = 0; i < 9; i++) gusts.push({ x: -Math.random() * V.W, y: V.H * (0.12 + 0.07 * i), v: V.W * (0.9 + Math.random() * 0.6), len: V.cell * (0.8 + Math.random()) });
    }

    async function go() {
      if (busy || isDemo()) return;
      selected = null; drag = null;
      if (!beams.length) { ctx.sfx('buzz'); hintPulse = 1; ctx.say('Build something first! Drag from a bolt.'); LE.shake(stage); return; }
      ctx.emit('run');
      setRunning(true);
      stopFlag = false;
      if (tool === 'erase') setTool('wood');
      var res = S.simulate(level, beams);
      sim = { res: res, f: 0, k: exaggeration(res), hidden: {}, showStress: true, wobbleAmp: 0, wobNodes: {}, shake: 0, box: 0, missing: null };
      await LE.wait(120);
      if (res.dropped.length) {
        res.dropped.forEach(function (i, n) { sim.hidden[i] = true; addDebris(beams[i], n * 0.08); });
        ctx.sfx('clank');
        await LE.wait(500);
      }
      if (stopFlag) return finishStop();
      var outcome = 'ok';
      if (res.reason === 'reach') {
        sim.missing = {};
        res.missing.forEach(function (m) { sim.missing[m[0] + ',' + m[1]] = true; });
        ctx.sfx('buzz');
        await LE.wait(1300);
        outcome = 'fail';
      } else if (res.reason === 'wobbly') {
        res.wobbly.forEach(function (i) { var b = beams[i]; sim.wobNodes[b.x1 + ',' + b.y1] = true; sim.wobNodes[b.x2 + ',' + b.y2] = true; });
        Object.keys(anchorKeys).forEach(function (key) { delete sim.wobNodes[key]; });
        if (test === 'wind') { startGusts(); ctx.sfx('whoosh'); }
        if (test === 'quake') ctx.sfx('rumble');
        ctx.sfx('creak');
        await LE.tween(900, function (k) { sim.wobbleAmp = 0.07 * k; if (test === 'quake') sim.shake = Math.sin(k * 40) * 0.6; }, LE.ease.linear);
        sim.wobbleAmp = 0; sim.shake = 0;
        ctx.sfx('break');
        res.wobbly.forEach(function (i, n) { sim.hidden[i] = true; addDebris(beams[i], n * 0.05); });
        gusts = [];
        await LE.wait(900);
        outcome = 'fail';
      } else {
        var breakAt = res.reason === 'break' ? res.failF : null;
        if (test === 'wind') {
          startGusts();
          ctx.sfx('whoosh');
          var end = breakAt === null ? 1 : breakAt;
          await ramp(2400 * Math.max(0.25, end), function (k) { sim.f = end * k; });
          if (breakAt === null) { await LE.wait(500); ctx.sfx('whoosh'); await ramp(700, function (k) { sim.f = 1 - 0.15 * Math.sin(k * Math.PI); }); }
        } else if (test === 'quake') {
          ctx.sfx('rumble');
          var cycles = 5, dur = 3200, broke = false;
          var target = breakAt === null ? null : breakAt * res.failSign;
          await ramp(dur, function (k) {
            if (broke) return;
            var amp = Math.min(1, k * 1.25);
            var f = amp * Math.sin(k * cycles * Math.PI * 2);
            if (target !== null && ((target > 0 && f >= target) || (target < 0 && f <= target) || (target === 0))) { f = target; broke = true; }
            sim.f = f; sim.shake = f;
            if (Math.random() < 0.08) ctx.sfx('thud');
          });
          sim.shake = 0;
          if (target !== null) sim.f = target;
          else { await ramp(400, function (k) { sim.f = sim.f * (1 - k); }); sim.f = 0; }
        } else {
          ctx.sfx('whirr');
          var endL = breakAt === null ? 1 : breakAt;
          await ramp(2200 * Math.max(0.3, endL), function (k) { sim.f = endL * k; sim.box = endL * k; });
          if (breakAt === null) { sim.f = 1; sim.box = 1; await LE.wait(600); }
        }
        gusts = [];
        if (stopFlag) return finishStop();
        if (breakAt !== null) {
          var bi = res.broken, b = beams[bi];
          ctx.sfx('snap');
          var mid = toClient((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2);
          ctx.fx.burst(mid.x, mid.y, { n: 18, color: '#ffd08a', speed: 6, size: 7 });
          ctx.fx.burst(mid.x, mid.y, { n: 8, color: '#ff4040', speed: 4, size: 5, shape: 'star' });
          sim.hidden[bi] = true;
          var mx = (b.x1 + b.x2) / 2, my = (b.y1 + b.y2) / 2;
          [{ x1: b.x1, y1: b.y1, x2: mx, y2: my, m: b.m }, { x1: mx, y1: my, x2: b.x2, y2: b.y2, m: b.m }].forEach(function (hb) { addDebris(hb, 0); debris[debris.length - 1].stress = 1; });
          await LE.wait(250);
          var falling = S.collapse(level, beams, [bi].concat(res.dropped));
          sim.showStress = false;
          falling.forEach(function (i, n) { sim.hidden[i] = true; addDebris(beams[i], 0.05 + n * 0.04); });
          if (falling.length) ctx.sfx('break');
          if (test === 'lift') { sim.boxFall = true; ctx.sfx('thud'); }
          await LE.wait(1100);
          outcome = 'fail';
        }
      }
      if (destroyed) return;
      if (stopFlag) return finishStop();
      if (outcome === 'ok') {
        ctx.sfx('cheer');
        (level.targets || []).forEach(function (tg) { var q = toClient(tg[0], tg[1]); ctx.fx.sparkle(q.x, q.y, '#ffe14d'); });
        await LE.wait(500);
        sim.showStress = false;
        setRunning(false);
        var stars = S.score(level, beams, res);
        ctx.win({ stars: stars, note: stars < 3 ? 'Tip: use ' + level.budget3 + ' coins or less for 3 stars!' : null });
        return;
      }
      ctx.fail({ message: failMessage(res) });
      await LE.wait(600);
      if (destroyed) return;
      sim = null; debris = []; gusts = [];
      setRunning(false);
    }
    function finishStop() {
      sim = null; debris = []; gusts = []; stopFlag = false;
      setRunning(false);
      ctx.emit('stopped');
    }

    /* ----- Tutorial / Show me ----- */
    function rectAt(x, y, size) { var c = toClient(x, y), s = size || V.cell * 0.9; return { left: c.x - s / 2, top: c.y - s / 2, width: s, height: s }; }
    function targetRect(key) {
      if (!key) return null;
      if (key === 'go') return goBtn.getBoundingClientRect();
      if (key === 'undo') return undoBtn.getBoundingClientRect();
      if (key === 'clear') return clearBtn.getBoundingClientRect();
      if (key === 'coins') return coins.getBoundingClientRect();
      if (key === 'test') return testTag.getBoundingClientRect();
      var m;
      if ((m = /^tool:(\w+)$/.exec(key))) return toolBtns[m[1]] ? toolBtns[m[1]].getBoundingClientRect() : null;
      if ((m = /^node:(-?\d+),(-?\d+)$/.exec(key))) return rectAt(+m[1], +m[2]);
      if ((m = /^beam:(-?\d+),(-?\d+)-(-?\d+),(-?\d+)$/.exec(key))) return rectAt((+m[1] + +m[3]) / 2, (+m[2] + +m[4]) / 2, V.cell * 0.6);
      return null;
    }
    function showMeSteps() {
      var steps = [];
      var want = S.parseAll(level.solution);
      var wantKeys = {}, haveKeys = {};
      want.forEach(function (b) { wantKeys[S.beamStr(b)] = true; });
      beams.forEach(function (b) { haveKeys[S.beamStr(b)] = true; });
      var sim2 = beams.slice();
      if (beams.some(function (b) { return !wantKeys[S.beamStr(b)]; })) {
        steps.push({ from: 'clear', say: 'First, let\'s start fresh.', apply: function () { clearAll(false); } });
        sim2 = []; haveKeys = {};
      }
      var curTool = tool === 'erase' ? null : tool;
      if (!curTool) { steps.push({ from: 'tool:wood', apply: function () { setTool('wood'); } }); curTool = 'wood'; }
      var first = true;
      want.forEach(function (b) {
        if (haveKeys[S.beamStr(b)]) return;
        if (b.m !== curTool) {
          (function (m) { steps.push({ from: 'tool:' + m, say: m === 'steel' ? 'Steel for the strong parts!' : 'Now wood.', apply: function () { setTool(m); } }); })(b.m);
          curTool = b.m;
        }
        var a = [b.x1, b.y1], c = [b.x2, b.y2];
        if (!S.startNodes(level, sim2)[a.join(',')]) { var tmp = a; a = c; c = tmp; }
        sim2 = sim2.concat([b]);
        (function (a, c, m, isFirst) {
          steps.push({ from: 'node:' + a.join(','), to: 'node:' + c.join(','), say: isFirst ? 'Drag from bolt to dot…' : null,
            apply: function () { placeBeam(a[0], a[1], c[0], c[1], m); } });
        })(a, c, b.m, first);
        first = false;
      });
      if (curTool !== 'wood' && toolBtns.wood) steps.push({ from: 'tool:wood', apply: function () { setTool('wood'); }, pause: 120 });
      return steps;
    }

    /* ----- Lifecycle ----- */
    function onResize() { layout(); }
    window.addEventListener('resize', onResize);
    setTool('wood');
    updateHUD();
    requestAnimationFrame(function () { layout(); last = performance.now(); frame(last); });

    return {
      get busy() { return busy; },
      target: targetRect,
      ghost: function () { return null; },
      showMe: showMeSteps,
      goKey: 'go',
      goLabel: 'Test',
      stop: stop,
      reset: function () {
        stop();
        beams = fromList(level.startBeams);
        undoStack = []; selected = null; sim = null; debris = []; gusts = [];
        setTool('wood');
        changed();
        ctx.sfx('whoosh');
      },
      getBeams: function () { return beams.map(S.beamStr); },
      perf: function () {
        var g = perf.gaps.slice(1), avgGap = g.length ? g.reduce(function (x, y) { return x + y; }, 0) / g.length : 0;
        return { frames: perf.frames, avgMs: perf.frames ? perf.drawMs / perf.frames : 0, maxMs: perf.maxMs, fps: avgGap ? 1000 / avgGap : 0 };
      },
      resetPerf: function () { perf = { frames: 0, drawMs: 0, maxMs: 0, gaps: [] }; },
      place: function (a, b, m) { return placeBeam(a[0], a[1], b[0], b[1], m); },
      go: go,
      destroy: function () { destroyed = true; stopFlag = true; cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); release(); root.remove(); },
      root: root
    };
  }

  LE.views.frame = { create: create };
})();
