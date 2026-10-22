/* Level 2 — Thinking Puzzles view: plan the WHOLE program, then Run it (or Step through it one block at a time).
 * Board canvas (Robo, gears, keys, doors, belts, colour tiles) + the program: "My program" and, on function stages,
 * "My move" (a function he builds once and calls with the ⭐ block). Tap a block in the tray to add it where the
 * yellow outline is; tap a container's slot to fill it; tap a placed block to take it out; tap a Repeat number or an
 * If question to change it. While running, the program is locked and the current block is highlighted.
 * Logic: js/logic/puzzles.js. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var P = LE.logic.puzzles;
  var MAX_BLOCKS = 30;

  var RI = LE.robotIcons || {};
  var ICONS = {
    F: RI.F, L: RI.L, R: RI.R, rep: RI.rep,
    if: '<svg viewBox="0 0 40 40"><path d="M14 13 a6 6 0 1 1 9 5 c-2 1.5 -3 2.5 -3 5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="20" cy="31" r="3.2" fill="#fff"/></svg>',
    M: '<svg viewBox="0 0 40 40"><path d="M20 5 l4.4 9.6 10.4 1.2 -7.8 7.1 2.2 10.3 -9.2 -5.3 -9.2 5.3 2.2 -10.3 -7.8 -7.1 10.4 -1.2z" fill="#fff" stroke="rgba(0,0,0,.15)" stroke-width="2" stroke-linejoin="round"/></svg>'
  };
  var LABELS = { F: 'Forward', L: 'Left', R: 'Right', rep: 'Repeat', if: 'If', M: 'My move' };
  var COND = {
    wall: { label: 'wall?', html: '🧱' },
    red: { label: 'red?', html: '<i class="cd-sw red"></i>' },
    blue: { label: 'blue?', html: '<i class="cd-sw blue"></i>' }
  };
  function countLabel(n) { return n === 0 ? '∞' : String(n); }

  function create(host, level, ctx) {
    var allowed = level.blocks || ['F', 'L', 'R'];
    var conds = level.conds || P.CONDS;
    var allowForever = allowed.indexOf('forever') >= 0;
    var trayTypes = allowed.filter(function (t) { return t !== 'forever'; });
    var parsed = P.parse(level);

    function startProg() { return P.clone(level.startProgram || { main: [], fn: [] }); }
    var saved = ctx.savedState;
    var program = (saved && saved.program && P.validate(saved.program, level)) ? P.clone(saved.program) : startProg();
    var target = (level.fn && !program.fn.length && !program.main.length) ? 'f' : 'm';
    var busy = false, stopFlag = false, destroyed = false;
    var stepping = null;             // { res, i } while stepping through a run

    /* ----- DOM ----- */
    var root = h('div.cd-wrap');
    var boardWrap = h('div.cd-board-wrap');
    var canvas = h('canvas.cd-board');
    boardWrap.appendChild(canvas);
    var countEl = h('span.cd-count');
    var clearSlot = h('span.cd-clear-slot');
    var mainStrip = h('div.cd-strip', { 'data-slot': 'm' });
    var fnStrip = level.fn ? h('div.cd-strip.cd-fn', { 'data-slot': 'f' }) : null;
    var prog = h('div.cd-prog.scroll-y',
      h('div.cd-row', h('div.cd-lbl', h('span', 'My program'), countEl, clearSlot), mainStrip),
      level.fn ? h('div.cd-row.cd-fnrow', h('div.cd-lbl.cd-fnlbl', { html: '<span class="cd-star">' + ICONS.M + '</span><span>My move =</span>' }), fnStrip) : null);
    var tray = h('div.cd-tray' + (trayTypes.length > 4 ? '.many' : ''));
    var goBtn = LE.button('go-btn green', '<svg viewBox="0 0 24 24"><path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg><span>Run</span>', function () { if (busy && !stepping) stop(); else run(); }, { label: 'Run', sound: 'click' });
    var stepBtn = LE.button('icon-big blue cd-step', '<span>Step</span>', function () { step(); }, { label: 'Step', sound: false });
    var clearBtn = LE.button('icon-big red clear-btn', '<svg viewBox="0 0 24 24"><path d="M5 7 h14 M10 4 h4 M7 7 l1 13 h8 l1 -13" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', function () {
      if (busy) return;
      if (!program.main.length && !program.fn.length) return;
      program = { main: [], fn: [] }; target = level.fn ? 'f' : 'm'; render(); changed(); ctx.sfx('whoosh'); ctx.emit('clear');
    }, { label: 'Clear program', sound: false });
    clearSlot.appendChild(clearBtn);
    var controls = h('div.cd-controls', stepBtn, goBtn);
    root.append(boardWrap, prog, h('div.cd-tray-row', tray, controls));
    host.appendChild(root);

    var trayEls = {};
    trayTypes.forEach(function (t) {
      var el = h('button.blk.cd-tray-blk.cd-' + t + '.pressable', { type: 'button', 'data-type': t, 'aria-label': LABELS[t] },
        h('div.blk-ico', { html: ICONS[t] }), h('div.blk-lbl', LABELS[t]));
      el.addEventListener('click', function () {
        if (busy || isDemo()) return;
        LE.bounce(el, 1.1);
        insertBlock(t, target);
      });
      trayEls[t] = el;
      tray.appendChild(el);
    });
    function isDemo() { return !!(ctx.isDemo && ctx.isDemo()); }

    /* ----- Program editing (taps, tutorial and Show me share these) ----- */
    function changed() { ctx.saveState && ctx.saveState({ program: P.clone(program) }); }
    function insertBlock(type, slot, index) {
      if (P.countBlocks(program) >= MAX_BLOCKS) { ctx.sfx('buzz'); ctx.say('Your program is full! Try a loop or My move.'); return false; }
      if (!P.canInsert(level, type, slot)) slot = P.canInsert(level, type, 'm') ? 'm' : null;
      if (!slot) { ctx.sfx('buzz'); return false; }
      var list = P.slotList(program, slot);
      if (!list) return false;
      if (index === undefined || index < 0 || index > list.length) index = list.length;
      var b = P.newBlock(type, level);
      list.splice(index, 0, b);
      var path = slot + '.' + index;
      if (b.body) target = path + '.b';
      else target = slot;
      stepping = null;
      render(); changed();
      ctx.sfx('place');
      LE.bounce(pathEls[path], 1.15);
      ctx.emit('add', { type: type, path: path });
      return true;
    }
    function removeAt(path) {
      var parts = String(path).split('.');
      var idx = +parts.pop();
      var slot = parts.join('.');
      var list = P.slotList(program, slot);
      if (!list || !list[idx]) return;
      poof(pathEls[path]);
      list.splice(idx, 1);
      if (target.indexOf(path) === 0) target = slot;
      else if (target.indexOf(slot + '.') === 0 && target !== slot) target = slot;
      stepping = null;
      render(); changed();
      ctx.sfx('remove');
      ctx.emit('remove', { path: path });
    }
    function setTarget(slot) {
      if (target === slot) return;
      target = slot; render(); ctx.sfx('click'); ctx.emit('target', { slot: slot });
    }
    function setCount(path, n) {
      var b = P.blockAt(program, path);
      if (!b) return;
      b.n = n; closePicker(); render(); changed(); ctx.sfx('pop');
      ctx.emit('count', { path: path, n: n });
    }
    function cycleCond(path) {
      var b = P.blockAt(program, path);
      if (!b) return;
      var i = conds.indexOf(b.c);
      b.c = conds[(i + 1) % conds.length];
      render(); changed(); ctx.sfx('pop');
      ctx.emit('cond', { path: path, c: b.c });
    }
    function poof(el) { if (el) ctx.fx.burstAt(el, { n: 10, color: '#ffffff', speed: 4, size: 7 }); }

    /* ----- Rendering the program ----- */
    var pathEls = {};
    function render() {
      pathEls = {};
      renderSlot(mainStrip, program.main, 'm');
      if (fnStrip) renderSlot(fnStrip, program.fn, 'f');
      var n = P.countBlocks(program);
      countEl.textContent = n + (n === 1 ? ' block' : ' blocks') + ' · ⭐ ' + level.par + ' or less';
      root.querySelectorAll('[data-slot]').forEach(function (s) { s.classList.toggle('target', s.dataset.slot === target); });
    }
    function renderSlot(el, list, slot) {
      el.innerHTML = '';
      list.forEach(function (b, i) { el.appendChild(blockEl(b, slot + '.' + i)); });
      el.appendChild(h('div.cd-end', { 'data-end': slot }, '+'));
      el.classList.toggle('empty', !list.length);
    }
    function blockEl(b, path) {
      var el;
      if (b.t === 'rep' || b.t === 'if') {
        var head = h('div.cd-head',
          h('div.blk-ico', { html: ICONS[b.t] }),
          b.t === 'rep' ? h('button.cd-num.pressable' + (b.n === 0 ? '.inf' : ''), { type: 'button', 'data-count': path, 'aria-label': 'Repeat count' }, countLabel(b.n))
            : h('button.cd-cond.pressable', { type: 'button', 'data-cond': path, 'aria-label': 'Question' }, h('span', { html: COND[b.c] ? COND[b.c].html : '?' }), h('span', COND[b.c] ? COND[b.c].label : b.c)),
          h('button.cd-del.pressable', { type: 'button', 'data-del': path, 'aria-label': 'Remove' }, '✕'));
        var body = h('div.cd-slot', { 'data-slot': path + '.b' });
        renderSlot(body, b.body, path + '.b');
        el = h('div.cd-blk.cont.cd-' + b.t, { 'data-path': path }, head, body);
        if (b.t === 'if') {
          var alt = h('div.cd-slot.cd-else', { 'data-slot': path + '.a' });
          renderSlot(alt, b.alt, path + '.a');
          el.append(h('div.cd-else-lbl', 'Else'), alt);
        }
      } else {
        el = h('button.cd-blk.cd-' + b.t, { type: 'button', 'data-path': path, 'aria-label': LABELS[b.t] }, h('div.blk-ico', { html: ICONS[b.t] }));
      }
      pathEls[path] = el;
      return el;
    }
    prog.addEventListener('click', function (e) {
      if (busy || isDemo()) return;
      var c = e.target.closest('[data-count]');
      if (c) { openPicker(c.dataset.count); return; }
      var q = e.target.closest('[data-cond]');
      if (q) { cycleCond(q.dataset.cond); return; }
      var d = e.target.closest('[data-del]');
      if (d) { removeAt(d.dataset.del); return; }
      var blk = e.target.closest('.cd-blk[data-path]');
      if (blk && !blk.classList.contains('cont')) { removeAt(blk.dataset.path); return; }
      var head = e.target.closest('.cd-head');
      if (head) { setTarget(head.parentNode.dataset.path + '.b'); return; }
      var s = e.target.closest('[data-slot]');
      if (s) setTarget(s.dataset.slot);
    });

    /* Repeat count picker */
    var picker = null;
    function closePicker() { if (picker) { picker.remove(); picker = null; } }
    function openPicker(path) {
      closePicker();
      var b = P.blockAt(program, path);
      if (!b) return;
      var opts = [2, 3, 4, 5, 6, 7, 8, 9];
      if (allowForever) opts.push(0);
      picker = h('div.count-picker.cd-picker');
      opts.forEach(function (n) {
        var btn = h('button.pick.pressable' + (b.n === n ? '.on' : ''), { type: 'button', 'data-pick': String(n) }, countLabel(n));
        btn.addEventListener('click', function (e) { e.stopPropagation(); setCount(path, n); });
        picker.appendChild(btn);
      });
      root.appendChild(picker);
      var r = root.querySelector('[data-count="' + path + '"]').getBoundingClientRect(), rr = root.getBoundingClientRect();
      var pw = Math.min(rr.width - 16, 5 * 54 + 16);
      picker.style.width = pw + 'px';
      picker.style.left = Math.max(8, Math.min(rr.width - pw - 8, r.left - rr.left - pw / 2 + r.width / 2)) + 'px';
      var top = r.bottom - rr.top + 6;
      if (top + 130 > rr.height) top = Math.max(4, r.top - rr.top - 130);
      picker.style.top = top + 'px';
      ctx.sfx('open');
      ctx.emit('picker');
    }
    root.addEventListener('pointerdown', function (e) { if (picker && !e.target.closest('.count-picker') && !e.target.closest('[data-count]')) closePicker(); }, true);

    /* ----- Board ----- */
    var B = { cell: 40, ox: 6, oy: 6, w: 0, h: 0, g: null };
    var robo = { x: parsed.start.x, y: parsed.start.y, a: parsed.start.d * Math.PI / 2, hop: 0, squash: 0, shake: 0 };
    var got = {}, opened = {}, keyCount = 0, pops = [];
    var t0 = performance.now();
    function layoutBoard() {
      var W = Math.max(100, boardWrap.clientWidth), H = Math.max(90, boardWrap.clientHeight);
      var cell = Math.floor(Math.min((W - 12) / parsed.w, (H - 12) / parsed.h, 64));
      B.cell = cell; B.w = cell * parsed.w; B.h = cell * parsed.h;
      var g = LE.fitCanvas(canvas, B.w + 12, B.h + 12);
      B.g = g.ctx;
    }
    function cellRect(x, y) {
      var r = canvas.getBoundingClientRect();
      return { left: r.left + B.ox + x * B.cell, top: r.top + B.oy + y * B.cell, width: B.cell, height: B.cell };
    }
    var BELT_A = { '^': 0, '>': 1, 'v': 2, '<': 3 };
    function drawCell(g, c, px, py, s, t, x, y) {
      g.fillStyle = (x + y) % 2 ? '#2c6db5' : '#3577c2';
      g.fillRect(px, py, s, s);
      if (c === 'r' || c === 'b') {
        g.fillStyle = c === 'r' ? '#ff5d73' : '#3d8bff';
        LE.rr(g, px + 3, py + 3, s - 6, s - 6, 6); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2; LE.rr(g, px + 3, py + 3, s - 6, s - 6, 6); g.stroke();
      }
      if (BELT_A[c] !== undefined) {
        g.fillStyle = '#4a5468'; LE.rr(g, px + 2, py + 2, s - 4, s - 4, 6); g.fill();
        g.save(); g.translate(px + s / 2, py + s / 2); g.rotate(BELT_A[c] * Math.PI / 2);
        var off = ((t * 0.8) % 1) * s * 0.33;
        g.fillStyle = '#ffe14d';
        for (var k = -1; k <= 1; k++) { var yy = k * s * 0.33 - off + s * 0.16; if (yy < -s * 0.42 || yy > s * 0.36) continue; g.beginPath(); g.moveTo(-s * 0.18, yy + s * 0.08); g.lineTo(0, yy - s * 0.08); g.lineTo(s * 0.18, yy + s * 0.08); g.closePath(); g.fill(); }
        g.restore();
      }
      if (c === '#') {
        g.fillStyle = '#c98a3a'; g.strokeStyle = '#6b4420'; g.lineWidth = 2.5;
        LE.rr(g, px + 4, py + 4, s - 8, s - 8, 5); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(px + 6, py + 6); g.lineTo(px + s - 6, py + s - 6); g.moveTo(px + s - 6, py + 6); g.lineTo(px + 6, py + s - 6); g.stroke();
      } else if (c === 'T') {
        g.fillStyle = '#2f9a45'; g.beginPath(); g.arc(px + s / 2, py + s * 0.45, s * 0.32, 0, 7); g.fill();
      } else if (c === '~') {
        g.fillStyle = '#3fb4ef'; g.fillRect(px, py, s, s);
      }
    }
    function drawRobo(g, cx, cy, s, a, t) {
      var hop = robo.hop * s * 0.25, sq = robo.squash;
      cy += Math.sin(t * 4) * s * 0.02 - hop;
      cx += Math.sin(robo.shake * 40) * robo.shake * s * 0.3;
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(cx, cy + hop + s * 0.33, s * 0.3, s * 0.08, 0, 0, 7); g.fill();
      g.save(); g.translate(cx, cy); g.scale(1 + sq * 0.15, 1 - sq * 0.15);
      g.save(); g.rotate(a);
      g.fillStyle = '#ff7a59'; g.strokeStyle = '#a83a1d'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-s * 0.12, -s * 0.33); g.lineTo(0, -s * 0.47); g.lineTo(s * 0.12, -s * 0.33); g.closePath(); g.fill(); g.stroke();
      g.restore();
      var gr = g.createLinearGradient(0, -s * 0.3, 0, s * 0.3);
      gr.addColorStop(0, '#cdb4ff'); gr.addColorStop(1, '#8a63f0');
      g.fillStyle = gr; g.strokeStyle = '#4b2fa8'; g.lineWidth = 2.5;
      LE.rr(g, -s * 0.3, -s * 0.28, s * 0.6, s * 0.56, s * 0.16); g.fill(); g.stroke();
      g.fillStyle = '#2a1f5c'; LE.rr(g, -s * 0.22, -s * 0.18, s * 0.44, s * 0.28, s * 0.1); g.fill();
      var dx = Math.sin(a) * s * 0.05, dy = -Math.cos(a) * s * 0.04;
      g.fillStyle = '#7ff3ff';
      g.beginPath(); g.ellipse(-s * 0.09 + dx, -s * 0.05 + dy, s * 0.05, s * 0.06, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(s * 0.09 + dx, -s * 0.05 + dy, s * 0.05, s * 0.06, 0, 0, 7); g.fill();
      if (keyCount > 0) { g.font = Math.round(s * 0.3) + 'px system-ui'; g.textAlign = 'center'; g.fillText('🔑', s * 0.28, -s * 0.28); }
      g.restore();
    }
    function drawBoard() {
      var g = B.g;
      if (!g) return;
      var t = (performance.now() - t0) / 1000, s = B.cell;
      g.clearRect(0, 0, B.w + 12, B.h + 12);
      g.fillStyle = '#163e73'; LE.rr(g, 2, 4, B.w + 8, B.h + 8, 14); g.fill();
      g.fillStyle = '#1f5fae'; LE.rr(g, 2, 0, B.w + 8, B.h + 8, 14); g.fill();
      for (var y = 0; y < parsed.h; y++) for (var x = 0; x < parsed.w; x++) {
        var c = parsed.cells[y][x], px = B.ox + x * s, py = B.oy + y * s, k = x + ',' + y;
        drawCell(g, c, px, py, s, t, x, y);
        if (c === 'g' && !got[k]) { g.save(); g.translate(px + s / 2, py + s / 2); g.rotate(t); drawGear(g, s * 0.28); g.restore(); }
        if (c === 'K' && !got[k]) { g.font = Math.round(s * 0.6) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔑', px + s / 2, py + s / 2 + Math.sin(t * 3) * 2); }
        if (c === 'D') {
          if (opened[k]) { g.fillStyle = 'rgba(168,107,51,.35)'; LE.rr(g, px + 4, py + 4, s - 8, s - 8, 5); g.fill(); }
          else { g.fillStyle = '#a86b33'; g.strokeStyle = '#5b3511'; g.lineWidth = 3; LE.rr(g, px + 5, py + 3, s - 10, s - 6, 5); g.fill(); g.stroke(); g.font = Math.round(s * 0.36) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🔒', px + s / 2, py + s / 2); }
        }
        if (c === 'F') drawFlag(g, px + s / 2, py + s / 2, s, t);
      }
      g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 1;
      for (x = 1; x < parsed.w; x++) { g.beginPath(); g.moveTo(B.ox + x * s, B.oy); g.lineTo(B.ox + x * s, B.oy + B.h); g.stroke(); }
      for (y = 1; y < parsed.h; y++) { g.beginPath(); g.moveTo(B.ox, B.oy + y * s); g.lineTo(B.ox + B.w, B.oy + y * s); g.stroke(); }
      drawRobo(g, B.ox + (robo.x + 0.5) * s, B.oy + (robo.y + 0.5) * s, s, robo.a, t);
      for (var i = pops.length - 1; i >= 0; i--) {
        var p = pops[i], k2 = (performance.now() - p.t0) / (700 / LE.speed);
        if (k2 >= 1) { pops.splice(i, 1); continue; }
        g.save(); g.globalAlpha = 1 - k2; g.font = '900 ' + Math.round(s * 0.45) + 'px system-ui, sans-serif'; g.textAlign = 'center';
        g.fillText(p.text, B.ox + (p.x + 0.5) * s, B.oy + (p.y + 0.2) * s - k2 * s * 0.6); g.restore();
      }
    }
    function drawGear(g, r) {
      g.fillStyle = '#ffc83d'; g.strokeStyle = '#a86f00'; g.lineWidth = 2;
      g.beginPath();
      for (var i = 0; i < 16; i++) { var a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2, rr = i % 2 ? r * 0.75 : r; g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr); g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#fff3c4'; g.beginPath(); g.arc(0, 0, r * 0.3, 0, 7); g.fill(); g.stroke();
    }
    function drawFlag(g, cx, cy, s, t) {
      g.fillStyle = '#6b4b2a'; LE.rr(g, cx - s * 0.03, cy - s * 0.36, s * 0.06, s * 0.7, 2); g.fill();
      g.fillStyle = '#ff4f6d'; g.strokeStyle = '#a3203a'; g.lineWidth = 2;
      g.beginPath();
      var x0 = cx + s * 0.03, y0 = cy - s * 0.36;
      g.moveTo(x0, y0);
      for (var k = 0; k <= 6; k++) g.lineTo(x0 + k * s * 0.06, y0 + Math.sin(t * 5 + k * 0.9) * s * 0.03);
      for (k = 6; k >= 0; k--) g.lineTo(x0 + k * s * 0.06, y0 + s * 0.24 + Math.sin(t * 5 + k * 0.9) * s * 0.03);
      g.closePath(); g.fill(); g.stroke();
    }
    var raf = 0;
    function frame() { if (destroyed) return; drawBoard(); raf = requestAnimationFrame(frame); }

    /* ----- Running ----- */
    function resetRobo() {
      robo.x = parsed.start.x; robo.y = parsed.start.y; robo.a = parsed.start.d * Math.PI / 2;
      robo.hop = 0; robo.squash = 0; robo.shake = 0;
      got = {}; opened = {}; keyCount = 0;
    }
    function setRunning(on) {
      busy = on;
      root.classList.toggle('running', on);
      goBtn.classList.toggle('green', !on); goBtn.classList.toggle('red', on && !stepping);
      goBtn.querySelector('span').textContent = on && !stepping ? 'Stop' : 'Run';
      goBtn.querySelector('svg').innerHTML = on && !stepping ? '<rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/>' : '<path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>';
    }
    function highlight(path) {
      root.querySelectorAll('.cd-blk.active').forEach(function (e) { e.classList.remove('active'); });
      if (!path) return;
      var parts = path.split('.');
      for (var i = 2; i <= parts.length; i += 2) { var el = pathEls[parts.slice(0, i).join('.')]; if (el) el.classList.add('active'); }
      var cur = pathEls[path];
      if (cur) {
        var sr = prog.getBoundingClientRect(), cr = cur.getBoundingClientRect();
        if (cr.top < sr.top || cr.bottom > sr.bottom) prog.scrollTop += cr.top - sr.top - 8;
      }
    }
    function stop() { stopFlag = true; }
    var STEP_MS = 400;
    async function playEvent(e) {
      highlight(e.path);
      if (e.ev === 'move' || e.ev === 'slide') {
        ctx.sfx(e.ev === 'slide' ? 'whirr' : 'step');
        var x0 = robo.x, y0 = robo.y;
        await LE.tween(e.ev === 'slide' ? STEP_MS * 0.6 : STEP_MS, function (k) { robo.x = x0 + (e.x - x0) * k; robo.y = y0 + (e.y - y0) * k; robo.hop = e.ev === 'move' ? Math.sin(k * Math.PI) * 0.5 : 0; });
        robo.hop = 0;
        var k = e.x + ',' + e.y, cr = cellRect(e.x, e.y);
        if (e.gear) { got[k] = true; ctx.sfx('gear'); pops.push({ x: e.x, y: e.y, text: '⚙️', t0: performance.now() }); ctx.fx.sparkle(cr.left + cr.width / 2, cr.top + cr.height / 2, '#ffc83d'); }
        if (e.key) { got[k] = true; keyCount++; ctx.sfx('ding'); pops.push({ x: e.x, y: e.y, text: '🔑', t0: performance.now() }); }
        if (e.door) { opened[k] = true; keyCount--; ctx.sfx('open'); pops.push({ x: e.x, y: e.y, text: '🔓', t0: performance.now() }); }
      } else if (e.ev === 'turn') {
        ctx.sfx('turn');
        var a0 = robo.a, a1 = a0 + (e.dir === 'L' ? -1 : 1) * Math.PI / 2;
        await LE.tween(STEP_MS * 0.7, function (k) { robo.a = a0 + (a1 - a0) * k; });
      } else if (e.ev === 'bump') {
        ctx.sfx('bump');
        var bx = robo.x, by = robo.y;
        await LE.tween(160, function (k) { robo.x = bx + (e.tx - bx) * 0.25 * k; robo.y = by + (e.ty - by) * 0.25 * k; });
        pops.push({ x: bx, y: by, text: '💥', t0: performance.now() });
        await LE.tween(220, function (k) { robo.x = bx + (e.tx - bx) * 0.25 * (1 - k); robo.y = by + (e.ty - by) * 0.25 * (1 - k); robo.squash = Math.sin(k * Math.PI); });
        robo.squash = 0;
        await LE.tween(350, function (k) { robo.shake = (1 - k) * 0.15; });
        robo.shake = 0;
      } else if (e.ev === 'check') {
        var el = pathEls[e.path];
        if (el) { el.classList.remove('yes', 'no'); void el.offsetWidth; el.classList.add(e.cond ? 'yes' : 'no'); }
        ctx.sfx(e.cond ? 'ding' : 'click');
        await LE.wait(STEP_MS * 0.6);
      } else if (e.ev === 'loop') {
        var le = pathEls[e.path], c = le && le.querySelector('.cd-num');
        if (c) { c.dataset.iter = e.iter; c.classList.remove('tick'); void c.offsetWidth; c.classList.add('tick'); }
        await LE.wait(STEP_MS * 0.3);
      } else if (e.ev === 'call') {
        ctx.sfx('pop');
        if (fnStrip) { fnStrip.classList.remove('calling'); void fnStrip.offsetWidth; fnStrip.classList.add('calling'); }
        await LE.wait(STEP_MS * 0.4);
      }
    }
    function prepare() {
      closePicker();
      if (!program.main.length) {
        ctx.sfx('buzz');
        ctx.say(program.fn.length ? 'Use My move in the main program!' : 'Add some blocks to the program first!');
        LE.shake(mainStrip);
        return null;
      }
      ctx.emit('run');
      resetRobo();
      return P.run(level, program);
    }
    async function run() {
      if (busy && !stepping) return;
      if (stepping) { var st = stepping; stepping = null; setRunning(true); await playFrom(st.res, st.i); return; }
      var res = prepare();
      if (!res) return;
      stopFlag = false;
      setRunning(true);
      await LE.wait(150);
      await playFrom(res, 0);
    }
    /** 🐞 Step: one block at a time (the same run, paused after every event). */
    async function step() {
      if (isDemo() || (busy && !stepping) || stepBusy) return;
      stepBusy = true;
      try {
        if (!stepping) {
          var res = prepare();
          if (!res) return;
          stopFlag = false;
          stepping = { res: res, i: 0 };
          setRunning(true);
          ctx.emit('step');
        }
        var s = stepping;
        if (s.i < s.res.trace.length) { ctx.sfx('click'); await playEvent(s.res.trace[s.i]); s.i++; }
        if (stepping === s && s.i >= s.res.trace.length) { stepping = null; await finish(s.res); }
      } finally { stepBusy = false; }
    }
    var stepBusy = false;
    async function playFrom(res, i0) {
      for (var i = i0; i < res.trace.length; i++) {
        if (stopFlag || destroyed) break;
        await playEvent(res.trace[i]);
      }
      if (destroyed) return;
      if (stopFlag) { highlight(null); resetRobo(); setRunning(false); stopFlag = false; ctx.emit('stopped'); return; }
      await finish(res);
    }
    async function finish(res) {
      highlight(null);
      root.querySelectorAll('.cd-num[data-iter]').forEach(function (c) { delete c.dataset.iter; });
      if (res.reached) {
        await LE.tween(500, function (k) { robo.hop = Math.sin(k * Math.PI * 2) * 0.9 * (1 - k * 0.3); });
        robo.hop = 0;
        setRunning(false);
        var stars = P.score(level, program, res);
        var note = !res.allGears ? 'Tip: grab every gear for another star!' : (P.countBlocks(program) > level.par ? 'Tip: try ' + level.par + ' blocks or fewer for 3 stars!' : null);
        ctx.win({ stars: stars, note: note });
        return;
      }
      var last = res.trace[res.trace.length - 1];
      var door = last && last.ev === 'bump' && P.cellAt(parsed, last.tx, last.ty) === 'D';
      var msg = door ? 'The door is locked! Robo needs the key first.'
        : res.bump ? 'Bonk! Robo bumped into something. Check your plan!'
        : res.timeout ? 'Robo walked and walked! Is your loop right?'
        : 'Robo stopped before the flag. Plan a few more steps!';
      ctx.fail({ message: msg });
      await LE.wait(900);
      if (destroyed) return;
      await LE.tween(300, function (k) { robo.hop = Math.sin(k * Math.PI) * 0.6; });
      resetRobo();
      setRunning(false);
    }

    /* ----- Tutorial / Show me ----- */
    function targetRect(key) {
      if (!key) return null;
      if (key === 'go') return goBtn.getBoundingClientRect();
      if (key === 'step') return stepBtn.getBoundingClientRect();
      if (key === 'clear') return clearBtn.getBoundingClientRect();
      if (key === 'robot') return cellRect(Math.round(robo.x), Math.round(robo.y));
      var m;
      if ((m = /^tray:(\w+)$/.exec(key))) return trayEls[m[1]] ? trayEls[m[1]].getBoundingClientRect() : null;
      if ((m = /^cell:(\d+),(\d+)$/.exec(key))) return cellRect(+m[1], +m[2]);
      if ((m = /^slot:([\w.]+)$/.exec(key))) { var se = root.querySelector('[data-end="' + m[1] + '"]'); return se ? se.getBoundingClientRect() : null; }
      if ((m = /^count:([\w.]+)$/.exec(key))) { var ce = root.querySelector('[data-count="' + m[1] + '"]'); return ce ? ce.getBoundingClientRect() : null; }
      if ((m = /^cond:([\w.]+)$/.exec(key))) { var qe = root.querySelector('[data-cond="' + m[1] + '"]'); return qe ? qe.getBoundingClientRect() : null; }
      if ((m = /^pick:(\d+)$/.exec(key))) { var pe = root.querySelector('[data-pick="' + m[1] + '"]'); return pe ? pe.getBoundingClientRect() : null; }
      if ((m = /^block:([\w.]+)$/.exec(key))) return pathEls[m[1]] ? pathEls[m[1]].getBoundingClientRect() : null;
      return null;
    }
    function ghostHTML(key) {
      var m = /^tray:(\w+)$/.exec(key || '');
      return m ? '<div class="cd-blk cd-' + m[1] + '"><div class="blk-ico">' + ICONS[m[1]] + '</div></div>' : null;
    }
    /** Debugging stages: the start program and the solution differ in ONE simple block → swap just that block. */
    function oneBlockFix() {
      if (!level.startProgram) return null;
      var a = P.clone(level.startProgram), b = P.clone(level.solution), diff = [];
      function walk(x, y, slot) {
        if (!x || !y || x.length !== y.length) { diff.push(null); return; }
        x.forEach(function (bx, i) {
          var by = y[i], path = slot + '.' + i;
          if (bx.t !== by.t || bx.n !== by.n || bx.c !== by.c) { if (bx.body || by.body) diff.push(null); else diff.push({ path: path, slot: slot, i: i, from: bx.t, to: by.t }); return; }
          if (bx.body) walk(bx.body, by.body, path + '.b');
          if (bx.alt) walk(bx.alt, by.alt, path + '.a');
        });
      }
      walk(a.main, b.main, 'm'); walk(a.fn, b.fn, 'f');
      return diff.length === 1 && diff[0] ? diff[0] : null;
    }
    function showMeSteps() {
      var steps = [];
      var fix = oneBlockFix();
      if (fix && JSON.stringify(P.clone(program)) === JSON.stringify(P.clone(level.startProgram))) {
        steps.push({ from: 'block:' + fix.path, say: 'This block is the bug. Tap it to take it out.', apply: function () { removeAt(fix.path); } });
        steps.push({ from: 'slot:' + fix.slot, apply: function () { setTarget(fix.slot); }, pause: 200 });
        steps.push({ from: 'tray:' + fix.to, to: 'block:' + fix.path.replace(/\d+$/, String(Math.max(0, fix.i - 1))), say: 'Put the right block in its place.',
          apply: function () { insertBlock(fix.to, fix.slot, fix.i); } });
        return steps;
      }
      if (program.main.length || program.fn.length) steps.push({ from: 'clear', say: 'First, let\'s start fresh.', apply: function () { program = { main: [], fn: [] }; target = 'm'; render(); changed(); ctx.sfx('whoosh'); } });
      var sol = P.clone(level.solution), cur = null;
      function addList(list, slot) {
        list.forEach(function (b, i) {
          var path = slot + '.' + i;
          (function (b, path, slot, i) {
            if (cur !== slot) { steps.push({ from: 'slot:' + slot, apply: function () { setTarget(slot); }, pause: 160 }); cur = slot; }
            steps.push({ from: 'tray:' + b.t, to: 'slot:' + slot,
              say: b.t === 'rep' ? 'A Repeat block!' : b.t === 'if' ? 'An If block asks a question.' : b.t === 'M' ? 'My move!' : null,
              apply: function () { insertBlock(b.t, slot, i); } });
            if (b.body) cur = path + '.b';
            if (b.t === 'rep' && b.n !== 2) {
              steps.push({ from: 'count:' + path, say: 'Tap the number…', apply: function () { openPicker(path); }, pause: 300 });
              steps.push({ from: 'pick:' + b.n, say: b.n === 0 ? 'Infinity ∞ means forever!' : 'Repeat ' + b.n + ' times!', apply: function () { setCount(path, b.n); } });
            }
            if (b.t === 'if') {
              var k = conds.indexOf(b.c);
              for (var j = 0; j < k; j++) steps.push({ from: 'cond:' + path, say: j === 0 ? 'Tap the question to change it.' : null, apply: function () { cycleCond(path); } });
            }
            if (b.body) addList(b.body, path + '.b');
            if (b.alt && b.alt.length) addList(b.alt, path + '.a');
          })(b, path, slot, i);
        });
      }
      if (sol.fn.length) addList(sol.fn, 'f');
      addList(sol.main, 'm');
      return steps;
    }

    /* ----- Lifecycle ----- */
    function onResize() { layoutBoard(); }
    window.addEventListener('resize', onResize);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layoutBoard(); }) : null;
    if (ro) ro.observe(boardWrap);
    render();
    requestAnimationFrame(function () { layoutBoard(); frame(); });

    return {
      get busy() { return busy; },
      get stepping() { return !!stepping; },
      target: targetRect,
      ghost: ghostHTML,
      goLabel: 'Run',
      showMe: showMeSteps,
      stop: function () { if (stepping) { stepping = null; highlight(null); resetRobo(); setRunning(false); } else stop(); },
      reset: function () {
        stop(); stepping = null;
        program = startProg(); target = (level.fn && !program.fn.length && !program.main.length) ? 'f' : 'm';
        closePicker(); render(); changed(); resetRobo(); setRunning(false); ctx.sfx('whoosh');
      },
      getProgram: function () { return P.clone(program); },
      setProgram: function (p) { program = P.clone(p); render(); changed(); },
      go: run,
      step: step,
      destroy: function () { destroyed = true; stopFlag = true; if (ro) ro.disconnect(); cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); closePicker(); root.remove(); },
      root: root
    };
  }

  LE.views.code = { create: create };
})();
