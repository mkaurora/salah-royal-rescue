/* Robot Coder view: board canvas, program strip with drag & drop blocks, step-by-step runner.
 * Also used by the Practice Room (mode: 'practice'). */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var RL = LE.logic.robot;
  var MAX_BLOCKS = 24;

  var ICONS = {
    F: '<svg viewBox="0 0 40 40"><path d="M20 6 L33 20 H25 V34 H15 V20 H7 Z" fill="#fff" stroke="rgba(0,0,0,.18)" stroke-width="2" stroke-linejoin="round"/></svg>',
    L: '<svg viewBox="0 0 40 40"><path d="M30 33 V22 a9 9 0 0 0 -9 -9 H13" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M15 5 L5 13 L15 21 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
    R: '<svg viewBox="0 0 40 40"><path d="M10 33 V22 a9 9 0 0 1 9 -9 H27" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M25 5 L35 13 L25 21 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>',
    rep: '<svg viewBox="0 0 40 40"><path d="M9 20 a11 11 0 0 1 19 -7.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M31 6 V15 H22 Z" fill="#fff"/><path d="M31 20 a11 11 0 0 1 -19 7.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M9 34 V25 H18 Z" fill="#fff"/></svg>',
    ifw: '<svg viewBox="0 0 40 40"><g fill="#ffd2c2" stroke="#7a2e1a" stroke-width="2"><rect x="4" y="8" width="15" height="9" rx="2"/><rect x="21" y="8" width="15" height="9" rx="2"/><rect x="4" y="19" width="7" height="9" rx="2"/><rect x="13" y="19" width="15" height="9" rx="2"/><rect x="30" y="19" width="6" height="9" rx="2"/><rect x="4" y="30" width="15" height="7" rx="2"/><rect x="21" y="30" width="15" height="7" rx="2"/></g><circle cx="31" cy="9" r="8" fill="#fff"/><text x="31" y="13.5" font-size="12" font-weight="900" text-anchor="middle" fill="#8a3ffc">?</text></svg>'
  };
  var LABELS = { F: 'Forward', L: 'Left', R: 'Right', rep: 'Repeat', ifw: 'If wall' };
  LE.robotIcons = ICONS;

  function newBlock(t) {
    if (t === 'rep') return { t: 'rep', n: 2, body: [] };
    if (t === 'ifw') return { t: 'ifw', body: [] };
    return { t: t };
  }
  function countLabel(n) { return n === 0 ? '∞' : String(n); }

  /** Shared UI used by Robot Coder levels and the Practice Room. */
  function createRobotUI(host, level, ctx, mode) {
    mode = mode || {};
    var practice = !!mode.practice;
    var allowed = level.blocks || ['F', 'L', 'R', 'rep', 'ifw', 'forever'];
    var trayTypes = allowed.filter(function (t) { return t !== 'forever'; });
    var allowForever = allowed.indexOf('forever') >= 0;

    var saved = ctx.savedState;
    var program = (saved && Array.isArray(saved.program) && RL.validate(saved.program, allowed)) ? RL.cloneProg(saved.program)
      : RL.cloneProg(level.startProgram || []);
    var target = '';                  // path of container that taps add into ('' = main)
    var busy = false, stopFlag = false, destroyed = false;
    var parsed = RL.parse(level);

    /* ----- DOM ----- */
    var root = h('div.rb-wrap');
    var boardWrap = h('div.rb-board-wrap');
    var canvas = h('canvas.rb-board');
    boardWrap.appendChild(canvas);
    var progLabel = h('div.rb-prog-label', h('span', 'My program'), h('span.rb-count'));
    var strip = h('div.rb-strip.scroll-y', { 'data-slot': '' });
    var program_ = h('div.rb-program', progLabel, strip);
    var tray = h('div.rb-tray');
    var goBtn = LE.button('go-btn green', '<svg viewBox="0 0 24 24"><path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg><span>Play</span>', function () { if (busy) stop(); else go(); }, { label: 'Play', sound: 'click' });
    var clearBtn = LE.button('icon-big red clear-btn', '<svg viewBox="0 0 24 24"><path d="M5 7 h14 M10 4 h4 M7 7 l1 13 h8 l1 -13" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', function () {
      if (busy) return;
      if (!program.length) return;
      program = []; target = ''; render(); changed(); ctx.sfx('whoosh'); ctx.emit('clear');
    }, { label: 'Clear program', sound: false });
    var controls = h('div.rb-controls', clearBtn, goBtn);
    var trayRow = h('div.rb-tray-row', tray, controls);
    root.append(boardWrap, program_, trayRow);
    host.appendChild(root);

    // Tray
    var trayEls = {};
    trayTypes.forEach(function (t) {
      var el = h('div.blk.tray-blk.blk-' + t + '.pressable', { 'data-type': t, role: 'button', 'aria-label': LABELS[t] },
        h('div.blk-ico', { html: ICONS[t] }), h('div.blk-lbl', LABELS[t]));
      trayEls[t] = el;
      tray.appendChild(el);
      el.addEventListener('pointerdown', function (e) { startDrag(e, { type: t }); });
    });

    /* ----- Board rendering ----- */
    var B = { cell: 40, ox: 0, oy: 0, w: 0, h: 0, g: null };
    var robot = { x: parsed.start.x, y: parsed.start.y, a: parsed.start.d * Math.PI / 2, hop: 0, squash: 0, shake: 0 };
    var collected = {};
    var trail = [];
    var pops = [];          // floating effects on board
    var t0 = performance.now();

    function layoutBoard() {
      var r = boardWrap.getBoundingClientRect();
      var W = Math.max(100, r.width), H = Math.max(100, r.height);
      var cell = Math.floor(Math.min((W - 12) / parsed.w, (H - 12) / parsed.h, 76));
      B.cell = cell;
      B.w = cell * parsed.w; B.h = cell * parsed.h;
      var g = LE.fitCanvas(canvas, B.w + 12, B.h + 12);
      B.g = g.ctx; B.ox = 6; B.oy = 6;
    }

    function cellRect(x, y) {
      var r = canvas.getBoundingClientRect();
      return { left: r.left + B.ox + x * B.cell, top: r.top + B.oy + y * B.cell, width: B.cell, height: B.cell };
    }

    function drawTree(g, cx, cy, s, seed) {
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.beginPath(); g.ellipse(cx, cy + s * 0.32, s * 0.32, s * 0.1, 0, 0, 7); g.fill();
      g.fillStyle = '#8a5a2b'; LE.rr(g, cx - s * 0.06, cy + s * 0.05, s * 0.12, s * 0.28, 3); g.fill();
      var gr = g.createRadialGradient(cx - s * 0.1, cy - s * 0.2, s * 0.05, cx, cy - s * 0.05, s * 0.4);
      gr.addColorStop(0, '#7fe07a'); gr.addColorStop(1, '#2f9a45');
      g.fillStyle = gr; g.strokeStyle = '#1f6e31'; g.lineWidth = 2;
      [[-0.15, -0.02, 0.2], [0.15, -0.02, 0.2], [0, -0.2, 0.24]].forEach(function (c) {
        g.beginPath(); g.arc(cx + s * c[0], cy + s * c[1], s * c[2], 0, Math.PI * 2); g.fill();
      });
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath(); g.arc(cx - s * 0.08, cy - s * 0.28, s * 0.06, 0, 7); g.fill();
      if (seed % 3 === 0) { g.fillStyle = '#ff5d73'; g.beginPath(); g.arc(cx + s * 0.12, cy - s * 0.08, s * 0.045, 0, 7); g.fill(); }
    }
    function drawRock(g, cx, cy, s) {
      g.fillStyle = 'rgba(0,0,0,.2)';
      g.beginPath(); g.ellipse(cx, cy + s * 0.28, s * 0.36, s * 0.1, 0, 0, 7); g.fill();
      var gr = g.createLinearGradient(0, cy - s * 0.3, 0, cy + s * 0.3);
      gr.addColorStop(0, '#c9cfd8'); gr.addColorStop(1, '#7c8696');
      g.fillStyle = gr; g.strokeStyle = '#555f70'; g.lineWidth = 2;
      g.beginPath();
      g.moveTo(cx - s * 0.36, cy + s * 0.26); g.lineTo(cx - s * 0.3, cy - s * 0.08); g.lineTo(cx - s * 0.08, cy - s * 0.3);
      g.lineTo(cx + s * 0.2, cy - s * 0.24); g.lineTo(cx + s * 0.36, cy + s * 0.02); g.lineTo(cx + s * 0.32, cy + s * 0.26); g.closePath();
      g.fill(); g.stroke();
    }
    function drawGear(g, cx, cy, r, rot, fill, stroke) {
      g.save(); g.translate(cx, cy); g.rotate(rot);
      g.fillStyle = fill || '#ffc83d'; g.strokeStyle = stroke || '#a86f00'; g.lineWidth = Math.max(1.5, r * 0.12);
      g.beginPath();
      var n = 8;
      for (var i = 0; i < n * 2; i++) {
        var a0 = i / (n * 2) * Math.PI * 2, a1 = (i + 1) / (n * 2) * Math.PI * 2;
        var rr = i % 2 ? r * 0.75 : r;
        g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
      }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(0, 0, r * 0.32, 0, 7); g.fill(); g.stroke();
      g.restore();
    }
    function drawFlag(g, cx, cy, s, t) {
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.beginPath(); g.ellipse(cx, cy + s * 0.32, s * 0.2, s * 0.07, 0, 0, 7); g.fill();
      g.fillStyle = '#6b4b2a'; LE.rr(g, cx - s * 0.03, cy - s * 0.36, s * 0.06, s * 0.7, 2); g.fill();
      var color = practice ? '#ffe14d' : '#ff4f6d';
      if (practice) {
        // Star goal for the Practice Room
        g.save(); g.translate(cx, cy - s * 0.02); g.rotate(Math.sin(t * 2) * 0.12);
        g.fillStyle = color; g.strokeStyle = '#b38f00'; g.lineWidth = 2.5;
        g.beginPath();
        for (var i = 0; i < 10; i++) { var rr = i % 2 ? s * 0.13 : s * 0.32, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        g.closePath(); g.fill(); g.stroke(); g.restore();
        return;
      }
      g.fillStyle = color; g.strokeStyle = '#a3203a'; g.lineWidth = 2;
      g.beginPath();
      var x0 = cx + s * 0.03, y0 = cy - s * 0.36;
      g.moveTo(x0, y0);
      for (var k = 0; k <= 6; k++) { var xx = x0 + k * s * 0.06; g.lineTo(xx, y0 + Math.sin(t * 5 + k * 0.9) * s * 0.03); }
      for (k = 6; k >= 0; k--) { xx = x0 + k * s * 0.06; g.lineTo(xx, y0 + s * 0.24 + Math.sin(t * 5 + k * 0.9) * s * 0.03); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(cx, cy - s * 0.38, s * 0.05, 0, 7); g.fill();
    }
    function drawRobot(g, cx, cy, s, a, t) {
      var dx = Math.sin(a), dy = -Math.cos(a);
      var bob = Math.sin(t * 4) * s * 0.02;
      var hop = robot.hop * s * 0.25;
      var sq = robot.squash;
      cy += bob - hop;
      cx += Math.sin(robot.shake * 40) * robot.shake * s * 0.3;
      g.fillStyle = 'rgba(0,0,0,.22)';
      g.beginPath(); g.ellipse(cx, cy + hop + s * 0.33, s * 0.3 * (1 - robot.hop * 0.3), s * 0.08, 0, 0, 7); g.fill();
      g.save(); g.translate(cx, cy); g.scale(1 + sq * 0.15, 1 - sq * 0.15);
      // nose / direction pointer
      g.save(); g.rotate(a);
      g.fillStyle = '#ff7a59'; g.strokeStyle = '#a83a1d'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-s * 0.12, -s * 0.33); g.lineTo(0, -s * 0.47); g.lineTo(s * 0.12, -s * 0.33); g.closePath(); g.fill(); g.stroke();
      g.restore();
      // antenna
      g.strokeStyle = '#5b3fbf'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(0, -s * 0.28); g.lineTo(0, -s * 0.4); g.stroke();
      g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(0, -s * 0.41, s * 0.05, 0, 7); g.fill();
      // body
      var gr = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
      gr.addColorStop(0, '#cdb4ff'); gr.addColorStop(1, '#8a63f0');
      g.fillStyle = gr; g.strokeStyle = '#4b2fa8'; g.lineWidth = 2.5;
      LE.rr(g, -s * 0.3, -s * 0.28, s * 0.6, s * 0.56, s * 0.16); g.fill(); g.stroke();
      // face
      g.fillStyle = '#2a1f5c'; LE.rr(g, -s * 0.22, -s * 0.18, s * 0.44, s * 0.28, s * 0.1); g.fill();
      var ex = dx * s * 0.05, ey = dy * s * 0.04;
      g.fillStyle = '#7ff3ff';
      var blink = (Math.floor(t * 10) % 37 === 0) ? 0.2 : 1;
      g.beginPath(); g.ellipse(-s * 0.09 + ex, -s * 0.05 + ey, s * 0.05, s * 0.06 * blink, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(s * 0.09 + ex, -s * 0.05 + ey, s * 0.05, s * 0.06 * blink, 0, 0, 7); g.fill();
      g.strokeStyle = '#7ff3ff'; g.lineWidth = 2;
      g.beginPath(); g.arc(ex, s * 0.02 + ey, s * 0.06, 0.2, Math.PI - 0.2); g.stroke();
      // wheels
      g.fillStyle = '#3b3f5c';
      LE.rr(g, -s * 0.34, s * 0.16, s * 0.14, s * 0.14, 4); g.fill();
      LE.rr(g, s * 0.2, s * 0.16, s * 0.14, s * 0.14, 4); g.fill();
      g.restore();
    }

    function drawBoard() {
      var g = B.g;
      if (!g) return;
      var t = (performance.now() - t0) / 1000;
      var s = B.cell;
      g.clearRect(0, 0, B.w + 12, B.h + 12);
      // board base
      g.fillStyle = '#2e7a3b';
      LE.rr(g, 2, 4, B.w + 8, B.h + 8, 16); g.fill();
      g.fillStyle = '#3d9a4c';
      LE.rr(g, 2, 0, B.w + 8, B.h + 8, 16); g.fill();
      g.save();
      LE.rr(g, B.ox, B.oy, B.w, B.h, 12); g.clip();
      for (var y = 0; y < parsed.h; y++) for (var x = 0; x < parsed.w; x++) {
        var px = B.ox + x * s, py = B.oy + y * s, kind = parsed.cells[y][x];
        if (kind === 'water') {
          g.fillStyle = '#3fb4ef'; g.fillRect(px, py, s, s);
          g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
          for (var k = 0; k < 2; k++) {
            g.beginPath();
            var wy = py + s * (0.35 + k * 0.32);
            for (var j = 0; j <= 8; j++) { var wx = px + s * 0.12 + j * s * 0.095; g.lineTo(wx, wy + Math.sin(t * 3 + j + k * 2 + x) * s * 0.03); }
            g.stroke();
          }
          continue;
        }
        g.fillStyle = (x + y) % 2 ? '#8fdc6e' : '#9fe57c';
        g.fillRect(px, py, s, s);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(px, py, s, 3);
        if ((x * 7 + y * 13) % 5 === 0 && kind === 'ground') {
          g.fillStyle = 'rgba(46,122,59,.35)';
          g.beginPath(); g.arc(px + s * 0.25, py + s * 0.75, s * 0.03, 0, 7); g.arc(px + s * 0.32, py + s * 0.7, s * 0.025, 0, 7); g.fill();
        }
      }
      g.restore();
      // grid lines
      g.strokeStyle = 'rgba(30,90,40,.18)'; g.lineWidth = 1;
      for (x = 1; x < parsed.w; x++) { g.beginPath(); g.moveTo(B.ox + x * s, B.oy); g.lineTo(B.ox + x * s, B.oy + B.h); g.stroke(); }
      for (y = 1; y < parsed.h; y++) { g.beginPath(); g.moveTo(B.ox, B.oy + y * s); g.lineTo(B.ox + B.w, B.oy + y * s); g.stroke(); }
      // trail
      g.fillStyle = 'rgba(255,255,255,.7)';
      trail.forEach(function (p) { g.beginPath(); g.arc(B.ox + (p.x + 0.5) * s, B.oy + (p.y + 0.5) * s, s * 0.07, 0, 7); g.fill(); });
      // objects
      for (y = 0; y < parsed.h; y++) for (x = 0; x < parsed.w; x++) {
        kind = parsed.cells[y][x];
        var cx = B.ox + (x + 0.5) * s, cy = B.oy + (y + 0.5) * s;
        if (kind === 'tree') drawTree(g, cx, cy, s, x * 3 + y);
        else if (kind === 'rock') drawRock(g, cx, cy, s);
      }
      parsed.gears.forEach(function (gg, i) {
        if (collected[i]) return;
        var cx = B.ox + (gg.x + 0.5) * s, cy = B.oy + (gg.y + 0.5) * s + Math.sin(t * 3 + i) * s * 0.04;
        g.fillStyle = 'rgba(255,230,120,.35)'; g.beginPath(); g.arc(cx, cy, s * 0.36, 0, 7); g.fill();
        drawGear(g, cx, cy, s * 0.26, t * 1.5 + i);
      });
      if (parsed.flag) drawFlag(g, B.ox + (parsed.flag.x + 0.5) * s, B.oy + (parsed.flag.y + 0.5) * s, s, t);
      drawRobot(g, B.ox + (robot.x + 0.5) * s, B.oy + (robot.y + 0.5) * s, s, robot.a, t);
      // pops
      for (var i = pops.length - 1; i >= 0; i--) {
        var p = pops[i];
        var k2 = (performance.now() - p.t0) / (700 / LE.speed);
        if (k2 >= 1) { pops.splice(i, 1); continue; }
        g.save(); g.globalAlpha = 1 - k2;
        g.font = '900 ' + Math.round(s * 0.45) + 'px system-ui, sans-serif'; g.textAlign = 'center';
        g.fillText(p.text, B.ox + (p.x + 0.5) * s, B.oy + (p.y + 0.2) * s - k2 * s * 0.6);
        g.restore();
      }
    }
    var raf = 0;
    function frame() { if (destroyed) return; drawBoard(); raf = requestAnimationFrame(frame); }

    canvas.addEventListener('pointerdown', function (e) {
      if (!mode.onCellTap || busy) return;
      var r = canvas.getBoundingClientRect();
      var x = Math.floor((e.clientX - r.left - B.ox) / B.cell), y = Math.floor((e.clientY - r.top - B.oy) / B.cell);
      if (x >= 0 && y >= 0 && x < parsed.w && y < parsed.h) mode.onCellTap(x, y);
    });

    /* ----- Program strip ----- */
    var pathEls = {};
    function get(path) {
      // returns { list, index } for a path like '2' or '2.1'; container body for slot paths
      var parts = path === '' ? [] : String(path).split('.').map(Number);
      var list = program, node = null;
      for (var i = 0; i < parts.length; i++) { node = list[parts[i]]; if (i < parts.length - 1) list = node.body; }
      return node;
    }
    function slotList(slotPath) { return slotPath === '' ? program : (get(slotPath) || {}).body; }
    function depthOf(slotPath) { return slotPath === '' ? 0 : String(slotPath).split('.').length; }

    function canInsert(type, slotPath) {
      if (slotPath === '') return true;
      var c = get(slotPath);
      if (!c) return false;
      if (type === 'rep') return false;                     // no loops inside containers
      if (type === 'ifw') return c.t === 'rep';             // if-wall allowed inside a repeat
      return true;
    }

    function render() {
      pathEls = {};
      strip.innerHTML = '';
      renderList(program, '', strip);
      strip.appendChild(h('div.strip-end', { 'data-end': '' }, h('span', '+')));
      var n = RL.countBlocks(program);
      var nb = n + (n === 1 ? ' block' : ' blocks');
      progLabel.querySelector('.rb-count').textContent = practice ? nb : (nb + ' · ⭐ ' + level.par + ' or less');
      strip.classList.toggle('target', target === '');
      strip.classList.toggle('empty', !program.length);
    }
    function renderList(list, prefix, parentEl) {
      list.forEach(function (b, i) {
        var path = prefix === '' ? String(i) : prefix + '.' + i;
        var el;
        if (b.t === 'rep' || b.t === 'ifw') {
          var head = h('div.blk-head',
            h('div.blk-ico', { html: ICONS[b.t] }),
            b.t === 'rep' ? h('div.rep-count.pressable' + (b.n === 0 ? '.inf' : ''), { 'data-count': path, role: 'button', 'aria-label': 'Repeat count' }, countLabel(b.n)) : h('div.blk-lbl', 'If wall'));
          var slot = h('div.slot', { 'data-slot': path });
          renderList(b.body, path, slot);
          slot.appendChild(h('div.strip-end.small', { 'data-end': path }, h('span', '+')));
          var del = h('div.blk-del.pressable', { 'data-del': path, role: 'button', 'aria-label': 'Remove' }, '✕');
          el = h('div.blk.container.blk-' + b.t + (target === path ? '.target' : ''), { 'data-path': path }, head, slot, del);
        } else {
          el = h('div.blk.prog-blk.blk-' + b.t, { 'data-path': path }, h('div.blk-ico', { html: ICONS[b.t] }));
        }
        pathEls[path] = el;
        parentEl.appendChild(el);
      });
    }

    function changed() {
      ctx.saveState && ctx.saveState({ program: RL.cloneProg(program) });
    }

    function insertBlock(type, slotPath, index) {
      if (RL.countBlocks(program) >= MAX_BLOCKS) { ctx.sfx('buzz'); ctx.say('Your program is full! Try a Repeat block.'); return false; }
      if (!canInsert(type, slotPath)) slotPath = '';
      var list = slotList(slotPath);
      if (index === undefined || index < 0 || index > list.length) index = list.length;
      var b = newBlock(type);
      list.splice(index, 0, b);
      var newPath = (slotPath === '' ? '' : slotPath + '.') + index;
      if (b.body) target = newPath;     // new containers become the place where taps add blocks
      render(); changed();
      ctx.sfx('place');
      var el = pathEls[newPath];
      LE.bounce(el, 1.18);
      ctx.emit('add', { type: type, path: newPath });
      return true;
    }
    function removeAt(path) {
      var parts = String(path).split('.').map(Number);
      var last = parts.pop();
      var list = parts.length ? get(parts.join('.')).body : program;
      var removed = list.splice(last, 1)[0];
      if (target && (target === path || target.indexOf(path + '.') === 0)) target = parts.join('.');
      else if (target) target = '';
      render(); changed();
      ctx.sfx('remove');
      ctx.emit('remove', { path: path });
      return removed;
    }
    function moveBlock(fromPath, slotPath, index) {
      var parts = String(fromPath).split('.').map(Number);
      var last = parts.pop();
      var fromSlot = parts.join('.');
      var node = get(fromPath);
      if (!canInsert(node.t, slotPath)) return false;
      if (slotPath === fromPath || String(slotPath).indexOf(fromPath + '.') === 0) return false;
      var fromList = slotList(fromSlot);
      fromList.splice(last, 1);
      // index is already relative to the list without the dragged block; fix up slot path shifts
      var sp = slotPath;
      if (sp !== '') {
        var fp = fromSlot === '' ? [] : fromSlot.split('.').map(Number);
        var spp = sp.split('.').map(Number);
        var isPrefix = spp.length > fp.length && fp.every(function (v, i) { return spp[i] === v; });
        if (isPrefix && spp[fp.length] > last) { spp[fp.length]--; sp = spp.join('.'); }
      }
      var list = slotList(sp);
      if (!list) { fromList.splice(last, 0, node); return false; }
      if (index > list.length) index = list.length;
      list.splice(index, 0, node);
      target = '';
      render(); changed(); ctx.sfx('place'); ctx.emit('move');
      return true;
    }

    /* ----- Count picker ----- */
    var picker = null;
    function closePicker() { if (picker) { picker.remove(); picker = null; } }
    function openPicker(path) {
      closePicker();
      var b = get(path);
      var opts = [2, 3, 4, 5, 6, 7, 8, 9];
      if (allowForever) opts.push(0);
      picker = h('div.count-picker');
      opts.forEach(function (n) {
        var btn = h('button.pick.pressable' + (b.n === n ? '.on' : ''), { type: 'button', 'data-pick': String(n) }, countLabel(n));
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          setCount(path, n);
        });
        picker.appendChild(btn);
      });
      root.appendChild(picker);
      var r = (pathEls[path] && pathEls[path].querySelector('.rep-count')).getBoundingClientRect();
      var rr = root.getBoundingClientRect();
      var pw = Math.min(rr.width - 16, 5 * 54 + 16);
      picker.style.width = pw + 'px';
      var left = Math.max(8, Math.min(rr.width - pw - 8, r.left - rr.left - pw / 2 + r.width / 2));
      picker.style.left = left + 'px';
      var top = r.bottom - rr.top + 8;
      picker.style.top = top + 'px';
      ctx.sfx('open');
      ctx.emit('picker');
    }
    function setCount(path, n) {
      var b = get(path);
      if (!b) return;
      b.n = n;
      closePicker();
      render(); changed();
      ctx.sfx('pop');
      LE.bounce(pathEls[path] && pathEls[path].querySelector('.rep-count'), 1.4);
      ctx.emit('count', { path: path, n: n });
    }

    /* ----- Pointer: taps and drags ----- */
    var drag = null;
    strip.addEventListener('pointerdown', function (e) {
      if (busy) return;
      var cnt = e.target.closest('[data-count]');
      var del = e.target.closest('[data-del]');
      if (cnt || del) return;    // handled on click
      var blk = e.target.closest('.blk[data-path]');
      if (blk) {
        var head = e.target.closest('.blk-head');
        if (blk.classList.contains('container') && !head) return;   // pointer inside the slot area
        startDrag(e, { path: blk.dataset.path, el: blk });
      }
    });
    strip.addEventListener('click', function (e) {
      if (busy) return;
      var cnt = e.target.closest('[data-count]');
      if (cnt) { openPicker(cnt.dataset.count); return; }
      var del = e.target.closest('[data-del]');
      if (del) { var path = del.dataset.del; poof(pathEls[path]); removeAt(path); return; }
      var slotEl = e.target.closest('[data-slot]');
      if (slotEl && !e.target.closest('.blk.prog-blk') && !e.target.closest('.blk-head')) {
        target = slotEl.dataset.slot; render(); ctx.sfx('click');
      }
    });
    root.addEventListener('pointerdown', function (e) { if (picker && !e.target.closest('.count-picker') && !e.target.closest('[data-count]')) closePicker(); }, true);

    function poof(el) {
      if (!el) return;
      ctx.fx.burstAt(el, { n: 10, color: '#ffffff', speed: 4, size: 7 });
    }

    function startDrag(e, src) {
      if (busy || (ctx.isDemo && ctx.isDemo())) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      var sx = e.clientX, sy = e.clientY;
      drag = { src: src, sx: sx, sy: sy, moved: false, ghost: null, drop: null, id: e.pointerId };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }
    function ghostFor(src) {
      var type = src.type || get(src.path).t;
      var g = h('div.drag-ghost', h('div.blk.blk-' + type, h('div.blk-ico', { html: ICONS[type] }), src.type ? h('div.blk-lbl', LABELS[type]) : null));
      document.body.appendChild(g);
      return g;
    }
    function onMove(e) {
      if (!drag) return;
      e.preventDefault();
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 9) {
        drag.moved = true;
        drag.ghost = ghostFor(drag.src);
        if (drag.src.el) drag.src.el.classList.add('dragging');
        ctx.sfx('pop');
      }
      if (drag.moved) {
        drag.ghost.style.transform = 'translate(' + (e.clientX - 30) + 'px,' + (e.clientY - 46) + 'px)';
        updateDrop(e.clientX, e.clientY - 20);
      }
    }
    function clearCaret() { var c = root.querySelector('.drop-caret'); if (c) c.remove(); root.querySelectorAll('.drop-hot').forEach(function (x) { x.classList.remove('drop-hot'); }); }
    function updateDrop(x, y) {
      clearCaret();
      var type = drag.src.type || get(drag.src.path).t;
      var pr = program_.getBoundingClientRect();
      var inside = x > pr.left - 30 && x < pr.right + 30 && y > pr.top - 50 && y < pr.bottom + 30;
      if (!inside) { drag.drop = null; return; }
      if (drag.ghost) drag.ghost.style.visibility = 'hidden';
      var under = document.elementFromPoint(Math.max(pr.left + 4, Math.min(pr.right - 4, x)), Math.max(pr.top + 4, Math.min(pr.bottom - 4, y)));
      if (drag.ghost) drag.ghost.style.visibility = '';
      var slotEl = under && under.closest && under.closest('[data-slot]');
      if (!slotEl || !root.contains(slotEl)) slotEl = strip;
      var slotPath = slotEl.dataset.slot;
      if (!canInsert(type, slotPath)) { slotEl = strip; slotPath = ''; }
      // don't drop a container into itself
      if (drag.src.path && (slotPath === drag.src.path || slotPath.indexOf(drag.src.path + '.') === 0)) { slotEl = strip; slotPath = ''; }
      var kids = Array.prototype.filter.call(slotEl.children, function (c) { return c.classList.contains('blk') && !c.classList.contains('dragging'); });
      var index = kids.length, before = null;
      for (var i = 0; i < kids.length; i++) {
        var r = kids[i].getBoundingClientRect();
        if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) { index = i; before = kids[i]; break; }
      }
      var modelIndex = index;   // kids exclude the dragged block, matching the list after removal
      drag.drop = { slot: slotPath, index: modelIndex };
      var caret = h('div.drop-caret');
      if (before) slotEl.insertBefore(caret, before); else slotEl.insertBefore(caret, slotEl.querySelector(':scope > .strip-end'));
      slotEl.classList.add('drop-hot');
    }
    function endDrag() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      if (drag && drag.ghost) drag.ghost.remove();
      if (drag && drag.src.el) drag.src.el.classList.remove('dragging');
      clearCaret();
      var d = drag; drag = null;
      return d;
    }
    function onCancel() { endDrag(); }
    function onUp() {
      var d = endDrag();
      if (!d) return;
      if (!d.moved) {
        // tap
        if (d.src.type) {
          var tEl = trayEls[d.src.type];
          LE.bounce(tEl, 1.1);
          insertBlock(d.src.type, target, undefined);
        } else if (d.src.path !== undefined) {
          var node = get(d.src.path);
          if (node && node.body) { target = d.src.path; render(); ctx.sfx('click'); }
          else { poof(pathEls[d.src.path]); removeAt(d.src.path); }
        }
        return;
      }
      if (d.src.type) {
        if (d.drop) insertBlock(d.src.type, d.drop.slot, d.drop.index);
        else ctx.sfx('whoosh');
      } else {
        if (d.drop) {
          if (!moveBlock(d.src.path, d.drop.slot, d.drop.index)) render();
        } else {
          poof(pathEls[d.src.path]);
          removeAt(d.src.path);
        }
      }
    }

    /* ----- Running ----- */
    function resetRobot() {
      robot.x = parsed.start.x; robot.y = parsed.start.y; robot.a = parsed.start.d * Math.PI / 2;
      robot.hop = 0; robot.squash = 0; robot.shake = 0;
      collected = {}; trail = [];
    }
    function setRunning(on) {
      busy = on;
      root.classList.toggle('running', on);
      goBtn.classList.toggle('green', !on); goBtn.classList.toggle('red', on);
      goBtn.querySelector('span').textContent = on ? 'Stop' : 'Play';
      goBtn.querySelector('svg').innerHTML = on ? '<rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/>' : '<path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>';
    }
    function highlight(path) {
      root.querySelectorAll('.blk.active').forEach(function (e) { e.classList.remove('active'); });
      if (path === null) return;
      var parts = path.split('.');
      // highlight containers on the path too
      for (var i = 1; i <= parts.length; i++) {
        var el = pathEls[parts.slice(0, i).join('.')];
        if (el) el.classList.add('active');
      }
      var cur = pathEls[path];
      if (cur && cur.scrollIntoView && strip.scrollHeight > strip.clientHeight + 4) {
        var sr = strip.getBoundingClientRect(), cr = cur.getBoundingClientRect();
        if (cr.top < sr.top || cr.bottom > sr.bottom) strip.scrollTop += cr.top - sr.top - 8;
      }
    }
    function stop() { stopFlag = true; }

    async function go() {
      if (busy) return;
      closePicker();
      if (!program.length) {
        ctx.sfx('buzz');
        ctx.say('Add some blocks to the program first!');
        LE.shake(strip);
        return;
      }
      ctx.emit('run');
      setRunning(true);
      stopFlag = false;
      resetRobot();
      target = ''; render();
      var res = RL.run(level, program);
      var stepMs = 420;
      await LE.wait(200);
      for (var i = 0; i < res.trace.length; i++) {
        if (stopFlag || destroyed) break;
        var e = res.trace[i];
        highlight(e.path.join('.'));
        if (e.ev === 'move') {
          ctx.sfx('step');
          var fx0 = robot.x, fy0 = robot.y;
          trail.push({ x: fx0, y: fy0 });
          await LE.tween(stepMs, function (k) {
            robot.x = fx0 + (e.x - fx0) * k; robot.y = fy0 + (e.y - fy0) * k;
            robot.hop = Math.sin(k * Math.PI) * 0.5;
          });
          robot.hop = 0;
          if (e.gear !== undefined) {
            collected[e.gear] = true; ctx.sfx('gear');
            pops.push({ x: e.x, y: e.y, text: '⚙️', t0: performance.now() });
            var cr = cellRect(e.x, e.y); ctx.fx.sparkle(cr.left + cr.width / 2, cr.top + cr.height / 2, '#ffc83d');
          }
        } else if (e.ev === 'turn') {
          ctx.sfx('turn');
          var a0 = robot.a, a1 = a0 + (e.dir === 'L' ? -1 : 1) * Math.PI / 2;
          await LE.tween(stepMs * 0.75, function (k) { robot.a = a0 + (a1 - a0) * k; });
        } else if (e.ev === 'bump') {
          ctx.sfx('bump');
          var bx = robot.x, by = robot.y, tx = e.tx, ty = e.ty;
          await LE.tween(160, function (k) { robot.x = bx + (tx - bx) * 0.25 * k; robot.y = by + (ty - by) * 0.25 * k; });
          pops.push({ x: bx, y: by, text: '💥', t0: performance.now() });
          await LE.tween(220, function (k) { robot.x = bx + (tx - bx) * 0.25 * (1 - k); robot.y = by + (ty - by) * 0.25 * (1 - k); robot.squash = Math.sin(k * Math.PI); });
          robot.squash = 0;
          await LE.tween(400, function (k) { robot.shake = (1 - k) * 0.15; });
          robot.shake = 0;
        } else if (e.ev === 'check') {
          var el = pathEls[e.path.join('.')];
          if (el) {
            el.classList.remove('yes', 'no'); void el.offsetWidth; el.classList.add(e.cond ? 'yes' : 'no');
          }
          ctx.sfx(e.cond ? 'ding' : 'click');
          await LE.wait(stepMs * 0.6);
        } else if (e.ev === 'loop') {
          var le = pathEls[e.path.join('.')];
          if (le) { var c = le.querySelector('.rep-count'); if (c) { c.dataset.iter = e.iter; c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick'); } }
          await LE.wait(stepMs * 0.3);
        }
      }
      highlight(null);
      root.querySelectorAll('.rep-count[data-iter]').forEach(function (c) { delete c.dataset.iter; });
      if (destroyed) return;
      if (stopFlag) { resetRobot(); setRunning(false); ctx.emit('stopped'); return; }
      if (res.reached) {
        await LE.tween(500, function (k) { robot.hop = Math.sin(k * Math.PI * 2) * 0.9 * (1 - k * 0.3); });
        robot.hop = 0;
        setRunning(false);
        var stars = RL.score(level, program, res);
        if (mode.onReach) mode.onReach(res, stars);
        else {
          var note = !res.allGears ? 'Tip: grab every gear for another star!' : (RL.countBlocks(program) > level.par ? 'Tip: try using ' + level.par + ' blocks or fewer for 3 stars!' : null);
          ctx.win({ stars: stars, note: note });
        }
      } else {
        var msg = res.bump ? 'Bonk! Robo bumped into something. Let\'s try again!'
          : res.timeout ? 'Robo walked and walked! Let\'s try a different plan.'
          : 'Robo stopped before the flag. Almost there!';
        if (mode.onMiss) mode.onMiss(res, msg); else ctx.fail({ message: msg });
        await LE.wait(900);
        if (destroyed) return;
        await LE.tween(300, function (k) { robot.hop = Math.sin(k * Math.PI) * 0.6; });
        resetRobot();
        setRunning(false);
      }
    }

    /* ----- Show me / targets ----- */
    function targetRect(key) {
      if (!key) return null;
      if (key === 'go') return goBtn.getBoundingClientRect();
      if (key === 'clear') return clearBtn.getBoundingClientRect();
      if (key === 'strip') { var e = strip.querySelector(':scope > .strip-end'); return (e || strip).getBoundingClientRect(); }
      if (key === 'strip:last') {
        var kids = strip.querySelectorAll(':scope > .blk');
        return kids.length ? kids[kids.length - 1].getBoundingClientRect() : strip.getBoundingClientRect();
      }
      if (key === 'robot') return cellRect(Math.round(robot.x), Math.round(robot.y));
      var m;
      if ((m = /^tray:(\w+)$/.exec(key))) return trayEls[m[1]] ? trayEls[m[1]].getBoundingClientRect() : null;
      if ((m = /^cell:(\d+),(\d+)$/.exec(key))) return cellRect(+m[1], +m[2]);
      if ((m = /^slot:([\d.]+)$/.exec(key))) {
        var se = root.querySelector('[data-end="' + m[1] + '"]');
        return se ? se.getBoundingClientRect() : null;
      }
      if ((m = /^count:([\d.]+)$/.exec(key))) { var ce = root.querySelector('[data-count="' + m[1] + '"]'); return ce ? ce.getBoundingClientRect() : null; }
      if ((m = /^pick:(\d+)$/.exec(key))) { var pe = root.querySelector('[data-pick="' + m[1] + '"]'); return pe ? pe.getBoundingClientRect() : null; }
      if ((m = /^block:([\d.]+)$/.exec(key))) return pathEls[m[1]] ? pathEls[m[1]].getBoundingClientRect() : null;
      return null;
    }
    function ghostHTML(key) {
      var m = /^tray:(\w+)$/.exec(key || '');
      if (!m) return null;
      return '<div class="blk blk-' + m[1] + '"><div class="blk-ico">' + ICONS[m[1]] + '</div></div>';
    }
    /** Blocks in pre-order: [{ t, n, path }]. */
    function preorder(list, slotPath, out) {
      out = out || [];
      list.forEach(function (b, i) {
        var path = (slotPath === '' ? '' : slotPath + '.') + i;
        out.push({ t: b.t, n: b.n, path: path });
        if (b.body) preorder(b.body, path, out);
      });
      return out;
    }
    /** opts.fromCurrent (Ask Helper demo): keep the blocks that already match the start of the solution, take out
     *  the wrong ones (last first, so paths stay valid), then add the rest. */
    function showMeSteps(solution, opts) {
      var steps = [];
      var keep = 0;
      if (opts && opts.fromCurrent && program.length) {
        var want = preorder(solution, ''), have = preorder(program, '');
        while (keep < have.length && keep < want.length && have[keep].t === want[keep].t && have[keep].path === want[keep].path &&
               (have[keep].t !== 'rep' || have[keep].n === want[keep].n)) keep++;
        if (keep === 0) steps.push({ from: 'clear', apply: function () { program = []; target = ''; render(); changed(); ctx.sfx('whoosh'); }, say: 'First, let\'s start fresh.' });
        else {
          have.slice(keep).reverse().forEach(function (b, k) {
            steps.push({ from: 'block:' + b.path, to: 'tray:' + b.t,
              apply: function () { removeAt(b.path); target = ''; render(); } });
          });
        }
      } else if (program.length) steps.push({ from: 'clear', apply: function () { program = []; target = ''; render(); changed(); ctx.sfx('whoosh'); }, say: 'First, let\'s start fresh.' });
      var seen = 0;
      function addList(list, slotPath) {
        list.forEach(function (b, i) {
          var path = (slotPath === '' ? '' : slotPath + '.') + i;
          if (seen++ < keep) { if (b.body) addList(b.body, path); return; }
          (function (b, path, slotPath) {
            steps.push({
              from: 'tray:' + b.t, to: slotPath === '' ? 'strip' : 'slot:' + slotPath,
              say: b.t === 'rep' ? 'A Repeat block!' : b.t === 'ifw' ? 'If there\'s a wall…' : null,
              apply: function () { insertBlock(b.t, slotPath, i); target = ''; render(); }
            });
            if (b.t === 'rep' && b.n !== 2) {
              steps.push({ from: 'count:' + path, say: 'Tap the number…', apply: function () { openPicker(path); }, pause: 300 });
              steps.push({ from: 'pick:' + b.n, say: b.n === 0 ? 'Infinity ∞ means forever!' : 'Repeat ' + b.n + ' times!', apply: function () { setCount(path, b.n); } });
            }
            if (b.body) addList(b.body, path);
          })(b, path, slotPath);
        });
      }
      addList(solution, '');
      return steps;
    }

    /* ----- Lifecycle ----- */
    function onResize() { layoutBoard(); }
    window.addEventListener('resize', onResize);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layoutBoard(); }) : null;
    if (ro) ro.observe(boardWrap);
    render();
    requestAnimationFrame(function () { layoutBoard(); frame(); });

    var api = {
      get busy() { return busy; },
      target: targetRect,
      ghost: ghostHTML,
      goLabel: 'Play',
      showMe: function (opts) { return showMeSteps(level.solution, opts); },
      showMeFor: showMeSteps,
      stop: stop,
      reset: function () {
        stop(); program = RL.cloneProg(level.startProgram || []); target = ''; render(); changed(); resetRobot(); ctx.sfx('whoosh');
      },
      getProgram: function () { return RL.cloneProg(program); },
      setProgram: function (p) { program = RL.cloneProg(p); target = ''; render(); changed(); },
      go: go,
      /** Swap the board (Practice Room). Keeps the program. */
      setLevel: function (lv) {
        stop(); level = lv; parsed = RL.parse(level); resetRobot(); layoutBoard();
      },
      destroy: function () { destroyed = true; if (ro) ro.disconnect(); stop(); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); endDrag(); closePicker(); root.remove(); },
      root: root
    };
    return api;
  }

  LE.createRobotUI = createRobotUI;
  LE.views.robot = {
    create: function (host, level, ctx) { return createRobotUI(host, level, ctx, {}); }
  };
})();
