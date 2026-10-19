/* Bridges view: side-view canvas with cliffs, river and a snapping grid. Drag from a bolt to build beams,
 * press Go and watch the car drive across while beams glow green -> yellow -> red with stress. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
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
  var COIN = '<svg class="br-coin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffc83d" stroke="#b07a00" stroke-width="2.2"/><circle cx="12" cy="12" r="6" fill="none" stroke="#e8a200" stroke-width="1.8"/><path d="M9 8 q3 -2 5 0" stroke="#fff6c9" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';

  var MAT_STYLE = {
    wood: { fill: '#f3a04a', dark: '#8a4b16', light: '#ffd08a', grain: '#c9742a' },
    steel: { fill: '#a9c6e6', dark: '#2c3f5a', light: '#e8f3ff', grain: '#6e8db0' }
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
  function rgb(c, a) { return a === undefined ? 'rgb(' + c.join(',') + ')' : 'rgba(' + c.join(',') + ',' + a + ')'; }
  function darker(c, f) { return c.map(function (v) { return Math.round(v * f); }); }

  function create(host, level, ctx) {
    var mats = level.materials || ['wood'];
    var hasSteel = mats.indexOf('steel') >= 0;
    var vehicle = level.vehicle || 'car';

    function fromList(list) {
      try { return BL.normalize(list || []); } catch (e) { return []; }
    }
    var saved = ctx.savedState;
    var beams = (saved && Array.isArray(saved.beams)) ? fromList(saved.beams) : fromList(level.startBeams);
    // only keep beams that are valid for this level
    beams = beams.filter(function (b) {
      return BL.validPoint(level, b.x1, b.y1) && BL.validPoint(level, b.x2, b.y2) && BL.beamLen(b) <= BL.MAX_LEN + 1e-9 && mats.indexOf(b.m) >= 0;
    });
    var undoStack = [];
    var tool = 'wood';
    var busy = false, destroyed = false, stopFlag = false;
    var selected = null;          // [x,y] node selected by a tap
    var drag = null;              // { from:[x,y], fx, fy, target:[x,y]|null, moved, id }
    var erasing = false;
    var sim = null;               // running simulation state for drawing
    var debris = [];              // falling beam pieces
    var labels = [];              // floating texts on the canvas
    var ripples = [];
    var hintPulse = 0;            // glow start nodes when the kid taps empty space
    var car = null;               // { s, y, ang, fall, vy, rot, alpha, hop, float }
    var shownStars = null;

    /* ----- DOM ----- */
    var root = h('div.br-wrap.br-' + vehicle);
    var stage = h('div.br-stage');
    var canvas = h('canvas.br-canvas');
    var coinsNum = h('span.br-coins-num', '0');
    var coinStars = h('div.br-coins-stars');
    var coins = h('div.br-coins', { html: COIN }, coinsNum, coinStars);
    var undoBtn = LE.button('icon br-undo', ICONS.undo, function () { if (!busy && !isDemo()) undo(); }, { label: 'Undo', sound: false });
    var clearBtn = LE.button('icon br-clear', ICONS.clear, function () { if (!busy && !isDemo()) clearAll(true); }, { label: 'Clear', sound: false });
    var hud = h('div.br-hud', coins, h('div.br-hud-r', undoBtn, clearBtn));
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
    var goBtn = LE.button('go-btn green', ICONS.go + '<span>Go!</span>', function () { if (busy) stop(); else go(); }, { label: 'Go', sound: 'click' });
    var bar = h('div.br-bar', tools, goBtn);
    root.append(stage, bar);
    host.appendChild(root);

    function isDemo() { return !!(ctx.isDemo && ctx.isDemo()); }

    /* ----- Geometry ----- */
    var V = { W: 300, H: 300, cell: 40, g: null, xmid: 0, cx: 150, base: 0, waterTop: 0 };
    function layout() {
      var r = stage.getBoundingClientRect();
      var W = Math.max(200, Math.floor(r.width)), H = Math.max(200, Math.floor(r.height));
      var gap = level.right - level.left;
      var cell = Math.min(W / (gap + 1.9), (H - 50) / (level.rows + 0.6), 82);
      V.W = W; V.H = H; V.cell = cell;
      V.xmid = (level.left + level.right) / 2;
      V.cx = W / 2;
      // bottom row sits 1.25 cells above the canvas bottom, water below
      V.base = H - 1.2 * cell - (level.rows - 1) * cell;     // screen y of row 0
      V.waterTop = Y(level.rows - 1) + 0.55 * cell;
      var g = LE.fitCanvas(canvas, W, H);
      V.g = g.ctx;
    }
    function X(x) { return V.cx + (x - V.xmid) * V.cell; }
    function Y(y) { return V.base + y * V.cell; }
    function toWorld(cx, cy) {
      var r = canvas.getBoundingClientRect();
      return { x: (cx - r.left - V.cx) / V.cell + V.xmid, y: (cy - r.top - V.base) / V.cell };
    }
    function toClient(x, y) {
      var r = canvas.getBoundingClientRect();
      return { x: r.left + X(x), y: r.top + Y(y) };
    }
    var waterY = function () { return (V.waterTop - V.base) / V.cell; };

    /* ----- Model helpers ----- */
    function startSet() { return BL.startNodes(level, beams); }
    function anchorList() { return BL.anchorsOf(level); }
    var validPts = [];
    (function () {
      for (var y = 0; y < level.rows; y++) for (var x = level.left; x <= level.right; x++) if (BL.validPoint(level, x, y)) validPts.push([x, y]);
      anchorList().forEach(function (a) { if (!validPts.some(function (p) { return p[0] === a[0] && p[1] === a[1]; })) validPts.push(a); });
    })();

    function nearestStart(wx, wy, radius) {
      var s = startSet(), best = null, bd = radius;
      Object.keys(s).forEach(function (k) {
        var p = k.split(',').map(Number), d = Math.hypot(p[0] - wx, p[1] - wy);
        if (d < bd) { bd = d; best = p; }
      });
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
    function snapTarget(from, wx, wy) {
      var m = tool === 'erase' ? 'wood' : tool;
      var rx = Math.round(wx), ry = Math.round(wy);
      if (Math.hypot(rx - wx, ry - wy) < 0.45 && BL.checkBeam(level, beams, from[0], from[1], rx, ry, m).ok) return [rx, ry];
      // otherwise the reachable point closest to the finger
      var best = null, bd = 0.8;
      BL.reachable(level, beams, from[0], from[1], m).forEach(function (p) {
        var d = Math.hypot(p[0] - wx, p[1] - wy);
        if (d < bd) { bd = d; best = p; }
      });
      return best;
    }

    /* ----- Actions (shared by touch, tutorial and Show me) ----- */
    function changed() {
      ctx.saveState && ctx.saveState({ beams: beams.map(BL.beamStr) });
      updateHUD();
    }
    function pushUndo() { undoStack.push(beams.map(BL.beamStr)); if (undoStack.length > 60) undoStack.shift(); }

    var REASONS = { long: 'Too far!', solid: 'That is rock!', below: 'Boat zone!', point: 'Not there!', anchors: 'Not there!', start: 'Start at a bolt!', material: 'Not there!' };
    function placeBeam(ax, ay, bx, by, m) {
      m = m || (tool === 'steel' ? 'steel' : 'wood');
      var r = BL.addBeam(level, beams, ax, ay, bx, by, m);
      if (!r.ok) {
        if (r.reason !== 'dup' && r.reason !== 'same') {
          ctx.sfx('buzz');
          addLabel((ax + bx) / 2, (ay + by) / 2, REASONS[r.reason] || 'Oops!', '#ff4f6d');
        }
        return false;
      }
      pushUndo();
      beams = r.beams;
      selected = null;
      ctx.sfx('place');
      r.added.forEach(function (b) {
        var c = toClient((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2);
        ctx.fx.burst(c.x, c.y, { n: 7, color: b.m === 'steel' ? '#dbe9ff' : '#ffd08a', speed: 3, size: 6 });
        addLabel((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2 - 0.15, '-' + BL.MATERIALS[b.m].cost, '#ffc83d', true);
      });
      changed();
      ctx.emit('place', { beam: BL.beamStr(r.added[0]) });
      return true;
    }
    function removeBeam(i, quiet) {
      if (i < 0 || i >= beams.length) return;
      pushUndo();
      var b = beams.splice(i, 1)[0];
      addDebris(b, 0, true);
      if (!quiet) ctx.sfx('remove');
      changed();
      ctx.emit('remove', { beam: BL.beamStr(b) });
    }
    function undo() {
      if (!undoStack.length) { ctx.sfx('buzz'); LE.shake(undoBtn); return; }
      beams = fromList(undoStack.pop());
      selected = null;
      ctx.sfx('whoosh');
      changed();
      ctx.emit('undo');
    }
    function clearAll(user) {
      if (!beams.length) { if (user) { ctx.sfx('buzz'); LE.shake(clearBtn); } return; }
      pushUndo();
      beams.forEach(function (b) { addDebris(b, 0, true); });
      beams = [];
      selected = null;
      ctx.sfx('whoosh');
      changed();
      ctx.emit('clear');
    }
    function setTool(name, user) {
      if (!toolBtns[name]) return;
      tool = name;
      selected = null;
      Object.keys(toolBtns).forEach(function (k) { toolBtns[k].classList.toggle('on', k === name); });
      root.classList.toggle('erasing', name === 'erase');
      if (user) { ctx.sfx('click'); LE.bounce(toolBtns[name], 1.12); }
      ctx.emit('tool', { tool: name });
    }

    /* ----- HUD ----- */
    function updateHUD() {
      var c = BL.cost(beams);
      coinsNum.textContent = String(c);
      var st = BL.starsForCost(level, c);
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
      var cx = (b.x1 + b.x2) / 2, cy = (b.y1 + b.y2) / 2;
      debris.push({
        b: b, cx: cx, cy: cy, len: BL.beamLen(b), ang: Math.atan2(b.y2 - b.y1, b.x2 - b.x1),
        vx: (Math.random() - 0.5) * (small ? 0.6 : 1.4), vy: small ? -1.2 : -0.6, va: (Math.random() - 0.5) * (small ? 4 : 6),
        delay: delay || 0, alpha: 1, splashed: false, road: BL.isRoad(level, b), shrink: !!small, t: 0
      });
    }
    function splashAt(x, big) {
      var c = toClient(x, waterY());
      ripples.push({ x: x, t: 0, big: !!big });
      ctx.fx.burst(c.x, c.y, { n: big ? 22 : 10, color: '#bfeaff', speed: big ? 6 : 3.5, up: 4, g: 0.35, size: big ? 8 : 5 });
    }

    /* ----- Drawing ----- */
    var t0 = performance.now(), last = t0;
    var clouds = [{ x: 0.15, y: 0.12, s: 1 }, { x: 0.62, y: 0.07, s: 0.75 }, { x: 0.9, y: 0.2, s: 0.6 }];
    var boatX = 0.5;

    function drawSky(g, t) {
      var gr = g.createLinearGradient(0, 0, 0, V.H);
      gr.addColorStop(0, '#47aef7'); gr.addColorStop(0.55, '#9fdcff'); gr.addColorStop(1, '#d9f4ff');
      g.fillStyle = gr; g.fillRect(0, 0, V.W, V.H);
      // sun
      var sx = V.W - 46, sy = 40;
      g.save(); g.translate(sx, sy); g.rotate(t * 0.15);
      g.fillStyle = 'rgba(255,240,150,.35)';
      for (var i = 0; i < 10; i++) { g.rotate(Math.PI / 5); g.beginPath(); g.moveTo(0, -30); g.lineTo(6, -44); g.lineTo(-6, -44); g.closePath(); g.fill(); }
      g.restore();
      var sg = g.createRadialGradient(sx - 6, sy - 6, 2, sx, sy, 26);
      sg.addColorStop(0, '#fffbd0'); sg.addColorStop(1, '#ffd84a');
      g.fillStyle = sg; g.beginPath(); g.arc(sx, sy, 24, 0, 7); g.fill();
      // clouds
      clouds.forEach(function (c, i) {
        var x = ((c.x + t * 0.008 * (1 + i * 0.3)) % 1.3 - 0.15) * V.W, y = c.y * V.H + 8, s = c.s * Math.min(1.2, V.W / 380);
        g.fillStyle = 'rgba(255,255,255,.92)';
        g.beginPath();
        g.arc(x, y, 16 * s, 0, 7); g.arc(x + 20 * s, y - 8 * s, 20 * s, 0, 7); g.arc(x + 42 * s, y, 15 * s, 0, 7);
        g.rect(x, y - 2 * s, 42 * s, 16 * s);
        g.fill();
      });
    }
    function drawHills(g, t) {
      var top = Y(level.deck) + V.cell * 0.2, bottom = V.waterTop + 2;
      g.fillStyle = '#a7dd9a';
      g.beginPath(); g.moveTo(0, bottom);
      for (var x = 0; x <= V.W; x += 8) g.lineTo(x, top + 18 + Math.sin(x / 70 + 1) * 14 + Math.sin(x / 31) * 5);
      g.lineTo(V.W, bottom); g.closePath(); g.fill();
      g.fillStyle = '#86cc7c';
      g.beginPath(); g.moveTo(0, bottom);
      for (x = 0; x <= V.W; x += 8) g.lineTo(x, top + 40 + Math.sin(x / 55 + 3) * 12);
      g.lineTo(V.W, bottom); g.closePath(); g.fill();
      // little trees on the far hills
      for (var i = 0; i < 7; i++) {
        var tx = (i * 0.17 + 0.05) * V.W, ty = top + 40 + Math.sin(tx / 55 + 3) * 12;
        g.fillStyle = '#5fae5a'; g.beginPath(); g.arc(tx, ty - 6, 7, 0, 7); g.fill();
      }
    }
    function drawWater(g, t) {
      var top = V.waterTop;
      var gr = g.createLinearGradient(0, top, 0, V.H);
      gr.addColorStop(0, '#45b8f2'); gr.addColorStop(1, '#1c6fb8');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, V.H);
      for (var x = 0; x <= V.W; x += 6) g.lineTo(x, top + Math.sin(x / 26 + t * 2) * 2.5);
      g.lineTo(V.W, V.H); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2.5; g.lineCap = 'round';
      for (var k = 0; k < 3; k++) {
        var yy = top + 12 + k * 14;
        for (var j = 0; j < 5; j++) {
          var wx = ((j * 0.23 + k * 0.11 + t * 0.03 * (k % 2 ? -1 : 1)) % 1 + 1) % 1 * V.W;
          g.beginPath(); g.moveTo(wx, yy); g.quadraticCurveTo(wx + 9, yy - 4, wx + 18, yy); g.stroke();
        }
      }
      // ripples
      ripples.forEach(function (r) {
        var a = Math.max(0, 1 - r.t / 1.4);
        g.strokeStyle = 'rgba(255,255,255,' + a + ')'; g.lineWidth = 3;
        g.beginPath(); g.ellipse(X(r.x), top + 4, (r.big ? 0.4 : 0.25) * V.cell + r.t * V.cell * 0.6, 3 + r.t * 5, 0, 0, 7); g.stroke();
      });
    }
    function drawBoat(g, t) {
      if (!level.noBelow) return;
      var gapL = X(level.left) + V.cell * 0.6, gapR = X(level.right) - V.cell * 0.6;
      boatX = 0.5 + Math.sin(t * 0.35) * 0.42;
      var bx = gapL + (gapR - gapL) * boatX, by = V.waterTop + 4 + Math.sin(t * 2.2) * 2;
      var mastTop = Y(level.deck) + V.cell * 0.3;
      var s = V.cell;
      g.save(); g.translate(bx, by); g.rotate(Math.sin(t * 1.7) * 0.04);
      // hull
      g.fillStyle = '#ff5d6c'; g.strokeStyle = '#8a1c33'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(-s * 0.55, -s * 0.12); g.lineTo(s * 0.55, -s * 0.12); g.lineTo(s * 0.4, s * 0.16); g.lineTo(-s * 0.4, s * 0.16); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff'; g.fillRect(-s * 0.5, -s * 0.06, s, s * 0.05);
      // mast + sail
      var mh = by - mastTop - s * 0.12;
      g.fillStyle = '#7a5230'; g.fillRect(-2, -s * 0.12 - mh, 4, mh);
      g.fillStyle = '#ffffff'; g.strokeStyle = '#9aa6b8'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(4, -s * 0.12 - mh + 4); g.quadraticCurveTo(s * 0.45, -s * 0.12 - mh * 0.45, s * 0.42, -s * 0.18); g.lineTo(4, -s * 0.18); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffd21f'; g.beginPath(); g.moveTo(-2, -s * 0.12 - mh); g.lineTo(-s * 0.22, -s * 0.12 - mh + 5); g.lineTo(-2, -s * 0.12 - mh + 10); g.fill();
      g.restore();
      // "no building" zone hint while building
      if (!busy) {
        g.save();
        g.setLineDash([6, 6]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 2;
        g.fillStyle = 'rgba(255,90,110,.10)';
        var zx = X(level.left) + 6, zw = X(level.right) - X(level.left) - 12, zy = Y(level.deck) + V.cell * 0.3;
        LE.rr(g, zx, zy, zw, V.waterTop - zy - 2, 10); g.fill(); g.stroke();
        g.restore();
      }
    }
    function rockPath(g, x0, y0, x1, y1, seed, side) {
      // vertical-ish rocky face from (x0,y0) to (x0,y1) with tiny bumps
      var n = 6, out = [];
      for (var i = 0; i <= n; i++) {
        var yy = y0 + (y1 - y0) * i / n;
        out.push([x0 + side * (Math.sin(seed + i * 2.1) * 2.5 + (i === 0 ? 0 : 1.5)), yy]);
      }
      return out;
    }
    function drawCliff(g, side) {
      var ex = X(side < 0 ? level.left : level.right), top = Y(level.deck);
      var edge = side < 0 ? 0 : V.W;
      var gr = g.createLinearGradient(0, top, 0, V.H);
      gr.addColorStop(0, '#d9a066'); gr.addColorStop(1, '#9c5f32');
      g.fillStyle = gr; g.strokeStyle = '#6b3d1c'; g.lineWidth = 3;
      var face = rockPath(g, ex, top + V.cell * 0.12, ex, V.H + 4, side < 0 ? 1 : 4, side);
      g.beginPath(); g.moveTo(edge, top + V.cell * 0.12);
      face.forEach(function (p) { g.lineTo(p[0], p[1]); });
      g.lineTo(edge, V.H + 4); g.closePath(); g.fill(); g.stroke();
      // strata + stones
      g.save(); g.clip();
      g.strokeStyle = 'rgba(110,60,25,.28)'; g.lineWidth = 2;
      for (var k = 1; k < 6; k++) {
        var yy = top + k * V.cell * 0.55;
        g.beginPath(); g.moveTo(edge, yy); g.quadraticCurveTo((edge + ex) / 2, yy + 6 * side, ex, yy - 3); g.stroke();
      }
      g.fillStyle = 'rgba(255,230,190,.25)';
      for (k = 0; k < 4; k++) {
        var px = ex - side * (V.cell * (0.35 + (k % 2) * 0.3)), py = top + V.cell * (0.6 + k * 0.7);
        g.beginPath(); g.ellipse(px, py, V.cell * 0.12, V.cell * 0.07, 0, 0, 7); g.fill();
      }
      g.restore();
      // grass cap
      var gx0 = Math.min(edge, ex) - 4, gw = Math.abs(ex - edge) + 8;
      g.fillStyle = '#4fbf4f'; g.strokeStyle = '#2e7a2e'; g.lineWidth = 2.5;
      LE.rr(g, gx0, top - V.cell * 0.02, gw, V.cell * 0.22, V.cell * 0.1); g.fill(); g.stroke();
      g.fillStyle = '#7fe07a';
      for (var b = 0; b < gw; b += 14) { g.beginPath(); g.arc(gx0 + b + 7, top + V.cell * 0.17, 5, 0, Math.PI); g.fill(); }
      // road on the cliff top
      var rh = V.cell * 0.12;
      g.fillStyle = '#3a3f5c';
      g.fillRect(Math.min(edge, ex), top - rh, Math.abs(ex - edge), rh);
      g.fillStyle = '#ffd21f';
      for (var d = Math.min(edge, ex) + 6; d < Math.max(edge, ex) - 8; d += 18) g.fillRect(d, top - rh / 2 - 1, 9, 2);
      // bush / flower decoration behind
      var bx = side < 0 ? ex - V.cell * 0.85 : ex + V.cell * 0.85;
      if (bx > 8 && bx < V.W - 8) {
        g.fillStyle = '#3fa848';
        g.beginPath(); g.arc(bx, top - rh - 6, 10, 0, 7); g.arc(bx + 11, top - rh - 3, 8, 0, 7); g.arc(bx - 10, top - rh - 2, 7, 0, 7); g.fill();
        g.fillStyle = '#ff7aa8'; g.beginPath(); g.arc(bx + 3, top - rh - 10, 2.5, 0, 7); g.fill();
        g.fillStyle = '#fff07a'; g.beginPath(); g.arc(bx - 6, top - rh - 6, 2.2, 0, 7); g.fill();
      }
    }
    function drawPillars(g) {
      (level.pillars || []).forEach(function (p) {
        var x = X(p.x), top = Y(p.top), w = V.cell * 0.42;
        var gr = g.createLinearGradient(x - w, 0, x + w, 0);
        gr.addColorStop(0, '#c4ccd8'); gr.addColorStop(1, '#7d8799');
        g.fillStyle = gr; g.strokeStyle = '#4b5366'; g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x - w * 0.8, top + 2); g.quadraticCurveTo(x, top - V.cell * 0.12, x + w * 0.8, top + 2);
        g.lineTo(x + w * 1.15, V.H + 4); g.lineTo(x - w * 1.15, V.H + 4); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(60,70,90,.25)'; g.lineWidth = 2;
        for (var k = 1; k < 4; k++) { var yy = top + k * V.cell * 0.45; g.beginPath(); g.moveTo(x - w * 0.8, yy); g.lineTo(x + w * 0.5, yy + 4); g.stroke(); }
        g.fillStyle = '#5fbf5a'; g.beginPath(); g.ellipse(x - w * 0.3, top + 2, w * 0.35, 4, -0.2, 0, 7); g.fill();
      });
    }
    function drawTowers(g) {
      (level.towers || []).forEach(function (tw) {
        var x = X(tw.x), top = Y(tw.top) - V.cell * 0.25, bot = Y(level.deck), w = V.cell * 0.2;
        var gr = g.createLinearGradient(x - w, 0, x + w, 0);
        gr.addColorStop(0, '#f2f4f8'); gr.addColorStop(1, '#a9b2c3');
        g.fillStyle = gr; g.strokeStyle = '#555f73'; g.lineWidth = 3;
        LE.rr(g, x - w, top, w * 2, bot - top, w * 0.6); g.fill(); g.stroke();
        g.fillStyle = '#ff7a1a'; LE.rr(g, x - w - 2, top - 4, w * 2 + 4, 9, 4); g.fill();
        g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(x, top - 6, 3.5, 0, 7); g.fill();
      });
    }

    function nodePos(x, y, d, k) {
      var px = X(x), py = Y(y);
      if (d) { var u = d[x + ',' + y]; if (u) { px += u[0] * k * V.cell; py += u[1] * k * V.cell; } }
      return [px, py];
    }
    function beamShape(g, ax, ay, bx, by, w) {
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.lineWidth = w; g.lineCap = 'round'; g.stroke();
    }
    function drawBeam(g, b, a, c, opts) {
      opts = opts || {};
      var st = MAT_STYLE[b.m], road = BL.isRoad(level, b);
      var w = V.cell * (road ? 0.22 : 0.17);
      var fill = st.fill, dark = st.dark, light = st.light;
      if (opts.stress !== undefined && opts.stress !== null) {
        var sc = stressRGB(opts.stress);
        fill = rgb(sc); dark = rgb(darker(sc, 0.45)); light = rgb(sc.map(function (v) { return Math.min(255, v + 70); }));
        if (Math.abs(opts.stress) > 0.75) {
          g.save(); g.shadowColor = 'rgba(255,40,40,.85)'; g.shadowBlur = 14 + Math.sin(performance.now() / 70) * 4;
          g.strokeStyle = 'rgba(255,60,60,.6)'; beamShape(g, a[0], a[1], c[0], c[1], w + 6); g.restore();
        }
      }
      g.save();
      if (opts.alpha !== undefined) g.globalAlpha = opts.alpha;
      if (opts.shadow !== false) { g.strokeStyle = 'rgba(0,0,0,.18)'; beamShape(g, a[0] + 2, a[1] + 4, c[0] + 2, c[1] + 4, w + 3); }
      g.strokeStyle = dark; beamShape(g, a[0], a[1], c[0], c[1], w + 4);
      g.strokeStyle = fill; beamShape(g, a[0], a[1], c[0], c[1], w);
      var len = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1, nx = -(c[1] - a[1]) / len, ny = (c[0] - a[0]) / len;
      g.strokeStyle = light; g.globalAlpha *= 0.8;
      beamShape(g, a[0] + nx * w * 0.22 + (c[0] - a[0]) * 0.08, a[1] + ny * w * 0.22 + (c[1] - a[1]) * 0.08, c[0] + nx * w * 0.22 - (c[0] - a[0]) * 0.08, c[1] + ny * w * 0.22 - (c[1] - a[1]) * 0.08, w * 0.22);
      g.globalAlpha /= 0.8;
      if (b.m === 'steel') {
        g.fillStyle = dark;
        for (var k = 1; k < 4; k++) { var q = k / 4; g.beginPath(); g.arc(a[0] + (c[0] - a[0]) * q, a[1] + (c[1] - a[1]) * q, w * 0.13, 0, 7); g.fill(); }
      } else if (!opts.stress) {
        g.strokeStyle = st.grain; g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(a[0] + (c[0] - a[0]) * 0.3 - nx * w * 0.15, a[1] + (c[1] - a[1]) * 0.3 - ny * w * 0.15);
        g.lineTo(a[0] + (c[0] - a[0]) * 0.55 - nx * w * 0.15, a[1] + (c[1] - a[1]) * 0.55 - ny * w * 0.15);
        g.stroke();
      }
      if (road) {
        // asphalt on top of road planks
        var th = V.cell * 0.11;
        g.strokeStyle = '#2b2f45'; beamShape(g, a[0], a[1] - w * 0.42, c[0], c[1] - w * 0.42, th + 3);
        g.strokeStyle = '#474d6b'; beamShape(g, a[0], a[1] - w * 0.42, c[0], c[1] - w * 0.42, th);
        g.strokeStyle = '#ffd21f'; g.lineWidth = 2; g.setLineDash([V.cell * 0.14, V.cell * 0.14]);
        g.beginPath(); g.moveTo(a[0] + V.cell * 0.12, a[1] - w * 0.42); g.lineTo(c[0] - V.cell * 0.12, c[1] - w * 0.42); g.stroke();
        g.setLineDash([]);
      }
      g.restore();
    }
    function drawBolt(g, x, y, r, t) {
      g.save(); g.translate(x, y);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(1.5, 3, r * 1.15, 0, 7); g.fill();
      g.fillStyle = '#4b5366'; g.beginPath();
      for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3 + Math.PI / 6; g.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); }
      g.closePath(); g.fill();
      var gr = g.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#a9b2c3');
      g.fillStyle = gr; g.beginPath();
      for (i = 0; i < 6; i++) { a = i * Math.PI / 3 + Math.PI / 6; g.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); }
      g.closePath(); g.fill();
      g.fillStyle = '#6b7488'; g.beginPath(); g.arc(0, 0, r * 0.32, 0, 7); g.fill();
      g.restore();
    }
    function drawJoint(g, x, y, r, steel) {
      g.fillStyle = steel ? '#2c3f5a' : '#6b3d12'; g.beginPath(); g.arc(x, y, r + 2, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
      g.fillStyle = steel ? '#8fa6c2' : '#d9a066'; g.beginPath(); g.arc(x, y, r * 0.42, 0, 7); g.fill();
    }

    function roadY(s, d, k) {
      // screen y of the road surface at car position s (and slope)
      var top = Y(level.deck);
      var w = V.cell * 0.22, lift = w * 0.42 + V.cell * 0.06;
      if (s <= level.left || s >= level.right) return { y: top - V.cell * 0.12, a: 0 };
      var x0 = Math.floor(s), t = s - x0;
      var p0 = nodePos(x0, level.deck, d, k), p1 = nodePos(x0 + 1, level.deck, d, k);
      return { y: p0[1] + (p1[1] - p0[1]) * t - lift, a: Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) };
    }

    function drawCar(g, t) {
      if (!car) return;
      var s = V.cell;
      var x = X(car.s), y = car.y, ang = car.ang;
      var bounce = busy && !car.fall ? Math.abs(Math.sin(t * 12)) * s * 0.025 : Math.sin(t * 2) * s * 0.01;
      g.save();
      g.globalAlpha = car.alpha;
      g.translate(x, y - car.hop * s * 0.4);
      g.rotate(ang + car.rot);
      var big = vehicle === 'truck' || vehicle === 'bus';
      var W = s * (vehicle === 'bus' ? 1.2 : vehicle === 'truck' ? 1.15 : 0.9), H = s * (big ? 0.5 : 0.36);
      var wr = s * (big ? 0.13 : 0.11);
      // shadow
      if (!car.fall) { g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(0, 0, W * 0.45, s * 0.04, 0, 0, 7); g.fill(); }
      g.translate(0, -wr - bounce);
      var wheelRot = car.s * 4;
      function wheel(wx) {
        g.save(); g.translate(wx, 0); g.rotate(wheelRot);
        g.fillStyle = '#23263a'; g.beginPath(); g.arc(0, 0, wr, 0, 7); g.fill();
        g.fillStyle = '#c9cfdb'; g.beginPath(); g.arc(0, 0, wr * 0.48, 0, 7); g.fill();
        g.strokeStyle = '#6e778a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-wr * 0.4, 0); g.lineTo(wr * 0.4, 0); g.stroke();
        g.restore();
      }
      var sq = car.squash || 0;
      g.scale(1 + sq * 0.12, 1 - sq * 0.12);
      if (vehicle === 'truck') {
        // cargo box + cab (cab at the front = right)
        g.fillStyle = '#ffc83d'; g.strokeStyle = '#8a5a00'; g.lineWidth = 2.5;
        LE.rr(g, -W / 2, -H - wr * 0.2, W * 0.64, H, 6); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(138,90,0,.45)'; g.lineWidth = 2;
        for (var k = 1; k < 4; k++) { var lx = -W / 2 + W * 0.64 * k / 4; g.beginPath(); g.moveTo(lx, -H - wr * 0.2 + 5); g.lineTo(lx, -wr * 0.2 - 5); g.stroke(); }
        g.fillStyle = '#3d8bff'; g.strokeStyle = '#1d4f99'; g.lineWidth = 2.5;
        LE.rr(g, W * 0.16, -H * 0.8 - wr * 0.2, W * 0.34, H * 0.8, 7); g.fill(); g.stroke();
        g.fillStyle = '#bfe9ff'; LE.rr(g, W * 0.27, -H * 0.72 - wr * 0.2, W * 0.18, H * 0.32, 4); g.fill();
        face(W * 0.36, -H * 0.56 - wr * 0.2, s * 0.6);
        wheel(-W * 0.32); wheel(-W * 0.12); wheel(W * 0.34);
      } else if (vehicle === 'bus') {
        g.fillStyle = '#ffd21f'; g.strokeStyle = '#a37a00'; g.lineWidth = 2.5;
        LE.rr(g, -W / 2, -H - wr * 0.2, W, H, 9); g.fill(); g.stroke();
        g.fillStyle = '#bfe9ff';
        for (k = 0; k < 4; k++) { LE.rr(g, -W / 2 + W * (0.06 + k * 0.19), -H * 0.92 - wr * 0.2, W * 0.15, H * 0.36, 4); g.fill(); }
        // little passengers
        g.fillStyle = '#ffcc99';
        for (k = 0; k < 3; k++) { g.beginPath(); g.arc(-W / 2 + W * (0.135 + k * 0.19), -H * 0.68 - wr * 0.2, s * 0.045, 0, 7); g.fill(); }
        g.fillStyle = '#ff7a1a'; g.fillRect(-W / 2 + 3, -H * 0.38 - wr * 0.2, W - 6, H * 0.08);
        face(W * 0.39, -H * 0.72 - wr * 0.2, s * 0.6);
        wheel(-W * 0.3); wheel(W * 0.3);
      } else {
        g.fillStyle = '#ff4f6d'; g.strokeStyle = '#8a1c33'; g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-W / 2, -wr * 0.2); g.lineTo(-W / 2, -H * 0.55); g.quadraticCurveTo(-W / 2, -H * 0.62, -W * 0.36, -H * 0.62);
        g.lineTo(-W * 0.24, -H * 0.62); g.quadraticCurveTo(-W * 0.14, -H * 1.18, W * 0.08, -H * 1.18);
        g.quadraticCurveTo(W * 0.26, -H * 1.16, W * 0.3, -H * 0.62);
        g.lineTo(W * 0.42, -H * 0.6); g.quadraticCurveTo(W / 2, -H * 0.55, W / 2, -H * 0.3); g.lineTo(W / 2, -wr * 0.2); g.closePath();
        g.fill(); g.stroke();
        g.fillStyle = '#bfe9ff'; g.strokeStyle = '#8a1c33'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-W * 0.18, -H * 0.66); g.quadraticCurveTo(-W * 0.1, -H * 1.06, W * 0.06, -H * 1.06); g.quadraticCurveTo(W * 0.2, -H * 1.05, W * 0.24, -H * 0.66); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-W * 0.4, -H * 0.5, W * 0.7, H * 0.08);
        g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(W * 0.46, -H * 0.42, s * 0.035, 0, 7); g.fill();
        face(W * 0.06, -H * 0.86, s * 0.62);
        wheel(-W * 0.28); wheel(W * 0.28);
      }
      g.restore();
      // lifebuoy when floating
      if (car.float) {
        g.save(); g.translate(x, V.waterTop + 2 + Math.sin(t * 3) * 2);
        g.lineWidth = s * 0.09; g.strokeStyle = '#ff4f6d';
        g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.14, 0, 0, 7); g.stroke();
        g.strokeStyle = '#fff'; g.setLineDash([s * 0.12, s * 0.12]); g.beginPath(); g.ellipse(0, 0, s * 0.5, s * 0.14, 0, 0, 7); g.stroke();
        g.restore();
      }
      function face(fx, fy, sc) {
        var blink = (Math.floor(t * 3) % 11 === 0) ? 0.2 : 1;
        var scared = car.scared;
        g.fillStyle = '#ffffff';
        g.beginPath(); g.ellipse(fx - sc * 0.08, fy, sc * 0.06, sc * 0.075 * blink, 0, 0, 7); g.fill();
        g.beginPath(); g.ellipse(fx + sc * 0.08, fy, sc * 0.06, sc * 0.075 * blink, 0, 0, 7); g.fill();
        g.fillStyle = '#23264a';
        g.beginPath(); g.arc(fx - sc * 0.06, fy + sc * 0.01, sc * 0.032 * blink, 0, 7); g.fill();
        g.beginPath(); g.arc(fx + sc * 0.1, fy + sc * 0.01, sc * 0.032 * blink, 0, 7); g.fill();
        g.strokeStyle = '#23264a'; g.lineWidth = 2;
        g.beginPath();
        if (scared) g.ellipse(fx + sc * 0.01, fy + sc * 0.12, sc * 0.035, sc * 0.045, 0, 0, 7);
        else g.arc(fx + sc * 0.01, fy + sc * 0.07, sc * 0.05, 0.2, Math.PI - 0.2);
        g.stroke();
      }
    }

    function curFrame() {
      if (!sim || !sim.res.frames.length) return null;
      var fr = sim.res.frames, i = (sim.s - sim.res.start) / 0.1;
      var i0 = Math.max(0, Math.min(fr.length - 1, Math.floor(i))), i1 = Math.min(fr.length - 1, i0 + 1), k = Math.max(0, Math.min(1, i - i0));
      var A = fr[i0], B = fr[i1];
      if (sim.freeze) { A = B = sim.freeze; k = 0; }
      return {
        r: A.r.map(function (v, j) { return v + (B.r[j] - v) * k; }),
        d: (function () { var o = {}; Object.keys(A.d).forEach(function (key) { var p = A.d[key], q = B.d[key] || p; o[key] = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]; }); return o; })()
      };
    }

    function draw(t, dt) {
      var g = V.g;
      if (!g) return;
      g.clearRect(0, 0, V.W, V.H);
      drawSky(g, t);
      drawHills(g, t);
      drawWater(g, t);
      drawBoat(g, t);
      drawPillars(g);
      drawCliff(g, -1);
      drawCliff(g, 1);
      drawTowers(g);

      var fr = curFrame();
      var k = sim ? sim.k : 0;
      var d = fr ? fr.d : null;
      // wobble offset for wobbly nodes
      var wob = sim && sim.wobbleAmp ? sim.wobbleAmp : 0;
      function P(x, y) {
        var p = nodePos(x, y, d, k);
        if (wob && sim.wobNodes[x + ',' + y]) { p[0] += Math.sin(t * 28 + x) * wob * V.cell; p[1] += Math.cos(t * 23 + y) * wob * V.cell * 0.6; }
        return p;
      }

      // grid dots
      var showGrid = !busy;
      var reach = null, from = drag ? drag.from : selected;
      if (from && tool !== 'erase' && !busy) {
        reach = {};
        BL.reachable(level, beams, from[0], from[1], tool === 'steel' ? 'steel' : 'wood').forEach(function (p) { reach[p[0] + ',' + p[1]] = true; });
      }
      if (showGrid) {
        validPts.forEach(function (p) {
          var px = X(p[0]), py = Y(p[1]), key = p[0] + ',' + p[1];
          if (reach && reach[key]) {
            var pulse = 1 + Math.sin(t * 6) * 0.15;
            g.fillStyle = 'rgba(255,225,77,.35)'; g.beginPath(); g.arc(px, py, V.cell * 0.2 * pulse, 0, 7); g.fill();
            g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(px, py, V.cell * 0.08, 0, 7); g.fill();
          } else {
            g.fillStyle = 'rgba(255,255,255,.6)'; g.beginPath(); g.arc(px, py, V.cell * 0.055, 0, 7); g.fill();
          }
        });
      }

      // beams (struts first, road on top)
      var hidden = sim ? sim.hidden : null;
      var order = beams.map(function (b, i) { return i; }).sort(function (a, b) { return (BL.isRoad(level, beams[a]) ? 1 : 0) - (BL.isRoad(level, beams[b]) ? 1 : 0); });
      order.forEach(function (i) {
        if (hidden && hidden[i]) return;
        var b = beams[i];
        var a = P(b.x1, b.y1), c = P(b.x2, b.y2);
        var stress = (sim && fr && sim.showStress) ? fr.r[i] : null;
        var alpha;
        if (!busy && tool === 'erase' && drag === null && eraseHover === i) alpha = 0.5;
        drawBeam(g, b, a, c, { stress: stress, alpha: alpha });
      });
      // joints
      var anchors = {};
      anchorList().forEach(function (a) { anchors[a[0] + ',' + a[1]] = true; });
      var joints = {};
      beams.forEach(function (b, i) {
        if (hidden && hidden[i]) return;
        [[b.x1, b.y1], [b.x2, b.y2]].forEach(function (p) { var key = p[0] + ',' + p[1]; if (!anchors[key]) joints[key] = joints[key] || b.m === 'steel'; });
      });
      Object.keys(joints).forEach(function (key) { var p = key.split(',').map(Number), q = P(p[0], p[1]); drawJoint(g, q[0], q[1], V.cell * 0.085, joints[key]); });
      var hp = hintPulse > 0 ? hintPulse : 0;
      anchorList().forEach(function (a) {
        var px = X(a[0]), py = Y(a[1]);
        if (hp) { g.fillStyle = 'rgba(255,225,77,' + (0.5 * hp) + ')'; g.beginPath(); g.arc(px, py, V.cell * (0.25 + (1 - hp) * 0.2), 0, 7); g.fill(); }
        drawBolt(g, px, py, V.cell * 0.12, t);
      });
      if (hp) {
        Object.keys(joints).forEach(function (key) { var p = key.split(',').map(Number); g.strokeStyle = 'rgba(255,225,77,' + hp + ')'; g.lineWidth = 3; g.beginPath(); g.arc(X(p[0]), Y(p[1]), V.cell * 0.2, 0, 7); g.stroke(); });
      }

      // selection ring
      if (selected && !busy) {
        var sp = [X(selected[0]), Y(selected[1])];
        g.strokeStyle = '#ffe14d'; g.lineWidth = 4;
        g.beginPath(); g.arc(sp[0], sp[1], V.cell * (0.24 + Math.sin(t * 6) * 0.03), 0, 7); g.stroke();
      }
      // rubber band
      var rb = rubberBand();
      if (rb) {
        var rbFrom = [X(rb.from[0]), Y(rb.from[1])];
        if (rb.target) {
          var fake = BL.parseBeam({ x1: rb.from[0], y1: rb.from[1], x2: rb.target[0], y2: rb.target[1], m: tool === 'steel' ? 'steel' : 'wood' });
          drawBeam(g, fake, [X(fake.x1), Y(fake.y1)], [X(fake.x2), Y(fake.y2)], { alpha: 0.75, shadow: false });
          g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(X(rb.target[0]), Y(rb.target[1]), V.cell * 0.2, 0, 7); g.stroke();
        } else if (rb.finger) {
          g.save(); g.setLineDash([8, 7]); g.strokeStyle = 'rgba(255,79,109,.9)'; g.lineWidth = 5; g.lineCap = 'round';
          g.beginPath(); g.moveTo(rbFrom[0], rbFrom[1]); g.lineTo(rb.finger[0], rb.finger[1]); g.stroke(); g.restore();
        }
      }

      // debris
      for (var di = debris.length - 1; di >= 0; di--) {
        var db = debris[di];
        if (db.delay > 0) { db.delay -= dt; continue; }
        db.t += dt;
        db.vy += 9 * dt; db.cx += db.vx * dt; db.cy += db.vy * dt; db.ang += db.va * dt;
        if (db.shrink) db.alpha -= dt * 1.6;
        if (db.cy > waterY()) {
          if (!db.splashed) { db.splashed = true; if (!db.shrink) splashAt(db.cx, false); db.vy *= 0.15; db.vx *= 0.3; db.va *= 0.3; }
          db.vy = Math.min(db.vy, 0.6); db.alpha -= dt * 1.2;
        }
        if (db.alpha <= 0 || db.cy > level.rows + 3) { debris.splice(di, 1); continue; }
        var hx = Math.cos(db.ang) * db.len / 2, hy = Math.sin(db.ang) * db.len / 2;
        g.save(); g.globalAlpha = Math.max(0, db.alpha);
        drawBeam(g, db.b, [X(db.cx - hx), Y(db.cy - hy)], [X(db.cx + hx), Y(db.cy + hy)], { stress: db.stress, shadow: false });
        g.restore();
      }

      drawCar(g, t);

      // labels
      for (var li = labels.length - 1; li >= 0; li--) {
        var lb = labels[li];
        lb.t += dt;
        if (lb.t > 1.1) { labels.splice(li, 1); continue; }
        var ly = Y(lb.y) - lb.t * V.cell * 0.7, lx = X(lb.x);
        g.save(); g.globalAlpha = Math.min(1, 2.2 - lb.t * 2);
        g.font = '900 ' + Math.round(Math.max(15, V.cell * 0.32)) + 'px ui-rounded, system-ui, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 4; g.strokeStyle = 'rgba(35,38,74,.75)';
        var txt = lb.text;
        if (lb.coin) {
          g.strokeText(txt, lx - 8, ly); g.fillStyle = lb.color; g.fillText(txt, lx - 8, ly);
          g.fillStyle = '#ffc83d'; g.strokeStyle = '#b07a00'; g.lineWidth = 2;
          g.beginPath(); g.arc(lx + V.cell * 0.18, ly, V.cell * 0.1, 0, 7); g.fill(); g.stroke();
        } else { g.strokeStyle = '#ffffff'; g.lineWidth = 5; g.strokeText(txt, lx, ly); g.fillStyle = lb.color || '#23264a'; g.fillText(txt, lx, ly); }
        g.restore();
      }
      ripples.forEach(function (r) { r.t += dt; });
      ripples = ripples.filter(function (r) { return r.t < 1.4; });
      if (hintPulse > 0) hintPulse = Math.max(0, hintPulse - dt * 0.8);
    }

    // rubber band: the kid's drag, or the hand during tutorials / Show me
    var handDrag = null;
    function rubberBand() {
      if (drag && drag.moved) {
        var r = canvas.getBoundingClientRect();
        return { from: drag.from, target: drag.target, finger: [drag.cx - r.left, drag.cy - r.top] };
      }
      var hand = document.getElementById('hand');
      if (hand && hand.classList.contains('drag') && hand.classList.contains('show') && tool !== 'erase') {
        var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(hand.style.transform || '');
        if (!m) return null;
        var hx = +m[1] + 23, hy = +m[2] + 3;
        var w = toWorld(hx, hy);
        if (!handDrag) {
          var st = nearestStart(w.x, w.y, 0.45);
          handDrag = st ? { from: st } : { from: null };
        }
        if (!handDrag.from) return null;
        var tgt = Math.hypot(w.x - handDrag.from[0], w.y - handDrag.from[1]) > 0.35 ? snapTarget(handDrag.from, w.x, w.y) : null;
        var cr = canvas.getBoundingClientRect();
        return { from: handDrag.from, target: tgt, finger: tgt ? null : [hx - cr.left, hy - cr.top] };
      }
      handDrag = null;
      return null;
    }

    var raf = 0;
    function frame(now) {
      if (destroyed) return;
      var dt = Math.min(0.05, (now - last) / 1000) * LE.speed;
      last = now;
      draw((now - t0) / 1000, dt);
      raf = requestAnimationFrame(frame);
    }

    /* ----- Pointer input ----- */
    var eraseHover = -1;
    function onDown(e) {
      if (busy || isDemo()) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      var w = toWorld(e.clientX, e.clientY);
      if (tool === 'erase') {
        erasing = true;
        var bi = beamAt(w.x, w.y, 0.32);
        if (bi >= 0) removeBeam(bi); else ctx.sfx('tap');
        capture(e);
        return;
      }
      var st = nearestStart(w.x, w.y, 0.5);
      if (!st && selected) {
        // tap somewhere to finish a tap-tap beam
        var p = nearestPoint(w.x, w.y, 0.5);
        if (p) placeBeam(selected[0], selected[1], p[0], p[1]);
        else { selected = null; ctx.sfx('tap'); }
        return;
      }
      if (!st) {
        hintPulse = 1; ctx.sfx('tap');
        return;
      }
      drag = { from: st, target: null, moved: false, cx: e.clientX, cy: e.clientY, sx: e.clientX, sy: e.clientY };
      capture(e);
    }
    function capture(e) {
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
      if (erasing) {
        var bi = beamAt(w.x, w.y, 0.25);
        if (bi >= 0) removeBeam(bi);
        return;
      }
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
          var w = toWorld(e.clientX, e.clientY);
          var p = nearestPoint(w.x, w.y, 0.5);
          if (p && (p[0] !== d.from[0] || p[1] !== d.from[1])) placeBeam(d.from[0], d.from[1], p[0], p[1]);
          else ctx.sfx('whoosh');
        }
        return;
      }
      // tap on a node
      if (selected && (selected[0] !== d.from[0] || selected[1] !== d.from[1])) {
        var c = BL.checkBeam(level, beams, selected[0], selected[1], d.from[0], d.from[1], tool === 'steel' ? 'steel' : 'wood');
        if (c.ok) { placeBeam(selected[0], selected[1], d.from[0], d.from[1]); return; }
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

    /* ----- Running ----- */
    function carStart() {
      var half = vehicle === 'bus' ? 0.62 : vehicle === 'truck' ? 0.6 : 0.47;
      var margin = (X(level.left)) / V.cell;          // visible cliff width in cells
      return Math.max(level.left - 0.6, Math.min(level.left - 0.2, level.left - margin + half + 0.06));
    }
    function resetCar() {
      car = { s: carStart(), y: 0, ang: 0, fall: false, vy: 0, rot: 0, alpha: 1, hop: 0, float: false, scared: false, squash: 0 };
      var ry = roadY(car.s, null, 0); car.y = ry.y;
    }
    function setRunning(on) {
      busy = on;
      root.classList.toggle('running', on);
      goBtn.classList.toggle('green', !on); goBtn.classList.toggle('red', on);
      goBtn.innerHTML = (on ? ICONS.stop : ICONS.go) + '<span>' + (on ? 'Stop' : 'Go!') + '</span>';
    }
    function stop() { if (busy) stopFlag = true; }

    function failMessage(res) {
      var steel = hasSteel ? ' Or try steel!' : '';
      if (res.reason === 'hole') return 'Oops! The road has a hole. Fill the gap with road!';
      if (res.reason === 'wobbly') return 'Too wobbly! Add beams to make triangles.';
      if (res.reason === 'break') {
        return res.brokenKind === 'stretch' ? 'That beam got stretched too much! Try adding a triangle.' + steel
          : 'That beam got squished! Add more support.' + steel;
      }
      return 'Almost! Let\'s try again!';
    }

    async function driveTo(sTarget, res) {
      var speed = vehicle === 'car' ? 1.7 : 1.3;      // cells per second
      var s0 = car.s, dist = Math.max(0, sTarget - s0);
      if (dist <= 0) return;
      var creaked = {};
      await LE.tween(dist / speed * 1000, function (k) {
        if (stopFlag || destroyed) return;
        car.s = s0 + dist * k;
        if (sim) sim.s = Math.min(car.s, res.end);
        var fr = curFrame();
        var ry = roadY(car.s, fr && fr.d, sim ? sim.k : 0);
        car.y = ry.y; car.ang = ry.a;
        if (fr) fr.r.forEach(function (r, i) { if (Math.abs(r) > 0.8 && !creaked[i]) { creaked[i] = true; ctx.sfx('creak'); } });
      }, LE.ease.linear);
    }

    async function carFall() {
      car.fall = true; car.scared = true;
      ctx.sfx('whoosh');
      var y0 = car.y, s0 = car.s, wy = V.waterTop + V.cell * 0.1;
      await LE.tween(650, function (k) {
        car.y = y0 + (wy - y0) * k * k;
        car.s = s0 + 0.35 * k;
        car.rot = k * 0.9;
      }, LE.ease.linear);
      if (destroyed) return;
      ctx.sfx('splash');
      splashAt(car.s, true);
      await LE.tween(350, function (k) { car.alpha = 1 - k * 0.3; car.y = wy + V.cell * 0.3 * k; }, LE.ease.out);
      // pop back up, floating with a ring
      car.float = true; car.rot = 0; car.ang = 0;
      await LE.tween(500, function (k) { car.y = wy + V.cell * 0.3 - V.cell * 0.32 * LE.ease.back(k); car.alpha = 0.7 + 0.3 * k; }, LE.ease.linear);
      ctx.sfx('bounce');
    }

    async function go() {
      if (busy || isDemo()) return;
      selected = null; drag = null;
      if (!beams.length) {
        ctx.sfx('buzz');
        hintPulse = 1;
        ctx.say('Build a bridge first! Drag from a bolt.');
        LE.shake(stage);
        return;
      }
      ctx.emit('run');
      setRunning(true);
      stopFlag = false;
      setTool(tool === 'erase' ? 'wood' : tool);
      var res = BL.simulate(level, beams);
      // exaggerate sag so the bending is visible
      var maxD = 0;
      res.frames.forEach(function (f) { Object.keys(f.d).forEach(function (key) { maxD = Math.max(maxD, Math.abs(f.d[key][1])); }); });
      sim = { res: res, s: res.start, k: maxD > 0 ? Math.min(40, 0.14 / maxD) : 0, hidden: {}, showStress: true, wobbleAmp: 0, wobNodes: {} };
      resetCar();
      ctx.sfx('car');
      await LE.wait(150);

      // 1. loose beams fall off first
      if (res.dropped.length) {
        res.dropped.forEach(function (i, n) { sim.hidden[i] = true; addDebris(beams[i], n * 0.08); });
        ctx.sfx('clank');
        await LE.wait(500);
      }
      var outcome = 'ok';
      if (stopFlag) return finishStop();

      if (res.reason === 'wobbly') {
        await driveTo(level.left - 0.15, res);
        if (stopFlag) return finishStop();
        res.wobbly.forEach(function (i) { var b = beams[i]; sim.wobNodes[b.x1 + ',' + b.y1] = true; sim.wobNodes[b.x2 + ',' + b.y2] = true; });
        BL.anchorsOf(level).forEach(function (a) { delete sim.wobNodes[a[0] + ',' + a[1]]; });
        ctx.sfx('creak');
        car.scared = true;
        await LE.tween(800, function (k) { sim.wobbleAmp = 0.06 * k; }, LE.ease.linear);
        sim.wobbleAmp = 0;
        ctx.sfx('break');
        res.wobbly.forEach(function (i, n) { sim.hidden[i] = true; addDebris(beams[i], n * 0.05); });
        var roadGone = res.wobbly.some(function (i) { return BL.isRoad(level, beams[i]) && beams[i].x1 === level.left; }) || res.hole === level.left;
        if (roadGone) { await driveTo(level.left + 0.2, res); await carFall(); } else await LE.wait(700);
        outcome = 'fail';
      } else if (res.reason === 'hole') {
        await driveTo(res.failAt, res);
        if (stopFlag) return finishStop();
        await carFall();
        outcome = 'fail';
      } else if (res.reason === 'break') {
        await driveTo(res.failAt, res);
        if (stopFlag) return finishStop();
        var bi = res.broken, b = beams[bi];
        sim.freeze = res.frames[res.frames.length - 1];
        ctx.sfx('snap');
        var mid = toClient((b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2);
        ctx.fx.burst(mid.x, mid.y, { n: 18, color: '#ffd08a', speed: 6, size: 7 });
        ctx.fx.burst(mid.x, mid.y, { n: 8, color: '#ff4040', speed: 4, size: 5, shape: 'star' });
        sim.hidden[bi] = true;
        var mx = (b.x1 + b.x2) / 2, my = (b.y1 + b.y2) / 2;
        var h1 = BL.parseBeam({ x1: b.x1, y1: b.y1, x2: mx, y2: my, m: b.m }), h2 = BL.parseBeam({ x1: mx, y1: my, x2: b.x2, y2: b.y2, m: b.m });
        [h1, h2].forEach(function (hb) { addDebris(hb, 0); debris[debris.length - 1].stress = 1; });
        await LE.wait(250);
        var gone = [bi].concat(res.dropped);
        var falling = BL.collapse(level, beams, gone);
        sim.showStress = false;
        falling.forEach(function (i, n) { sim.hidden[i] = true; addDebris(beams[i], 0.05 + n * 0.04); });
        if (falling.length) ctx.sfx('break');
        var x0 = Math.floor(car.s), under = -1;
        beams.forEach(function (q, i) { if (BL.isRoad(level, q) && q.x1 === x0) under = i; });
        var carDown = car.s > level.left && car.s < level.right && (under < 0 || sim.hidden[under]);
        if (carDown) await carFall();
        else { car.scared = true; await LE.tween(600, function (k) { car.squash = Math.sin(k * Math.PI * 4) * 0.5 * (1 - k); }, LE.ease.linear); car.squash = 0; }
        outcome = 'fail';
      } else {
        await driveTo(res.end, res);
        if (stopFlag) return finishStop();
      }
      if (destroyed) return;

      if (outcome === 'ok') {
        ctx.sfx('honk');
        await LE.tween(600, function (k) { car.hop = Math.abs(Math.sin(k * Math.PI * 2)) * (1 - k * 0.4); }, LE.ease.linear);
        car.hop = 0;
        var c = toClient(car.s, level.deck - 0.6);
        ctx.fx.sparkle(c.x, c.y, '#ffe14d');
        sim.showStress = false;
        setRunning(false);
        var stars = BL.score(level, beams, res);
        var note = stars < 3 ? 'Tip: use ' + level.budget3 + ' coins or less for 3 stars!' : null;
        ctx.win({ stars: stars, note: note });
        return;
      }
      ctx.fail({ message: failMessage(res) });
      await LE.wait(1400);
      if (destroyed) return;
      // back to building: bridge returns, car comes back
      sim = null;
      debris = [];
      setRunning(false);
      resetCar();
      car.alpha = 0;
      LE.tween(400, function (k) { if (car) car.alpha = k; });
    }
    function finishStop() {
      sim = null; debris = []; stopFlag = false;
      resetCar();
      setRunning(false);
      ctx.emit('stopped');
    }

    /* ----- Tutorial / Show me targets ----- */
    function rectAt(x, y, size) {
      var c = toClient(x, y), s = size || V.cell * 0.9;
      return { left: c.x - s / 2, top: c.y - s / 2, width: s, height: s };
    }
    function targetRect(key) {
      if (!key) return null;
      if (key === 'go') return goBtn.getBoundingClientRect();
      if (key === 'undo') return undoBtn.getBoundingClientRect();
      if (key === 'clear') return clearBtn.getBoundingClientRect();
      if (key === 'coins') return coins.getBoundingClientRect();
      if (key === 'car') return car ? rectAt(car.s, level.deck - 0.3) : null;
      var m;
      if ((m = /^tool:(\w+)$/.exec(key))) return toolBtns[m[1]] ? toolBtns[m[1]].getBoundingClientRect() : null;
      if ((m = /^node:(-?\d+),(-?\d+)$/.exec(key))) return rectAt(+m[1], +m[2]);
      if ((m = /^beam:(-?\d+),(-?\d+)-(-?\d+),(-?\d+)$/.exec(key))) return rectAt((+m[1] + +m[3]) / 2, (+m[2] + +m[4]) / 2, V.cell * 0.6);
      return null;
    }

    function showMeSteps(opts) {
      var fromCurrent = !!(opts && opts.fromCurrent);
      var steps = [];
      var want = BL.normalize(level.solution);
      var wantKeys = {};
      want.forEach(function (b) { wantKeys[BL.beamStr(b)] = true; });
      var haveKeys = {};
      beams.forEach(function (b) { haveKeys[BL.beamStr(b)] = true; });
      var bad = beams.filter(function (b) { return !wantKeys[BL.beamStr(b)]; });
      var extras = bad.length > 0;
      var sim2 = beams.slice();
      var curTool = tool === 'erase' ? null : tool;
      if (extras && (level.eraseDemo || fromCurrent) && bad.length <= 4) {
        // "Erase and swap" levels: take away only the wrong beams with the Erase tool (same path as a tap).
        steps.push({ from: 'tool:erase', say: 'Tap Erase. Then tap the beam to take it away.', apply: function () { setTool('erase'); } });
        bad.forEach(function (b) {
          var k = BL.beamStr(b);
          steps.push({
            from: 'beam:' + BL.beamKey(b),
            apply: function () {
              var i = -1;
              beams.forEach(function (q, j) { if (i < 0 && BL.beamStr(q) === k) i = j; });
              removeBeam(i);
            }
          });
        });
        sim2 = beams.filter(function (b) { return wantKeys[BL.beamStr(b)]; });
        curTool = 'erase';
      } else if (extras) {
        steps.push({ from: 'clear', say: 'First, let\'s start fresh.', apply: function () { clearAll(false); } });
        sim2 = []; haveKeys = {};
      }
      if (!curTool) {
        steps.push({ from: 'tool:wood', apply: function () { setTool('wood'); } });
        curTool = 'wood';
      }
      var first = true;
      want.forEach(function (b) {
        if (haveKeys[BL.beamStr(b)]) return;
        if (b.m !== curTool) {
          (function (m) { steps.push({ from: 'tool:' + m, say: m === 'steel' ? 'Steel for the strong parts!' : 'Now wood.', apply: function () { setTool(m); } }); })(b.m);
          curTool = b.m;
        }
        var a = [b.x1, b.y1], c = [b.x2, b.y2];
        if (!BL.canStart(level, sim2, a[0], a[1])) { var tmp = a; a = c; c = tmp; }
        sim2 = sim2.concat([b]);
        (function (a, c, m, isFirst) {
          steps.push({
            from: 'node:' + a.join(','), to: 'node:' + c.join(','),
            say: isFirst ? 'Drag from bolt to dot…' : null,
            apply: function () { placeBeam(a[0], a[1], c[0], c[1], m); }
          });
        })(a, c, b.m, first);
        first = false;
      });
      if (curTool !== 'wood' && toolBtns.wood) steps.push({ from: 'tool:wood', apply: function () { setTool('wood'); }, pause: 120 });
      return steps;
    }

    /* ----- Lifecycle ----- */
    function onResize() { layout(); if (car && !busy) resetCar(); }
    window.addEventListener('resize', onResize);
    setTool('wood');
    updateHUD();
    requestAnimationFrame(function () { layout(); resetCar(); last = performance.now(); frame(last); });

    return {
      get busy() { return busy; },
      target: targetRect,
      ghost: function () { return null; },
      showMe: showMeSteps,
      goKey: 'go',
      stop: stop,
      reset: function () {
        stop();
        beams = fromList(level.startBeams);
        undoStack = []; selected = null; sim = null; debris = [];
        setTool('wood');
        changed();
        if (V.g) resetCar();
        ctx.sfx('whoosh');
      },
      getBeams: function () { return beams.map(BL.beamStr); },
      place: function (a, b, m) { return placeBeam(a[0], a[1], b[0], b[1], m); },
      go: go,
      destroy: function () {
        destroyed = true; stopFlag = true;
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', onResize);
        release();
        root.remove();
      },
      root: root
    };
  }

  LE.views.bridges = { create: create };
})();
