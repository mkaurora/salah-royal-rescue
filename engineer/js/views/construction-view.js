/* Construction world view: bulldozer grid (top-down), crane (side view) and house building (side view).
 * Everything happens live (noGo): the level is won the moment the last stage is finished.
 * All actions — real taps, swipes, drags and the buddy's "Show me" — go through enqueue() → perform(). */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var CL = LE.logic.construction;

  /* Animation timings (ms, before LE.speed). showMe() uses the same numbers to pace its steps. */
  var T = { turn: 140, move: 240, fill: 340, dump: 340, hook: 300, lower: 340, grip: 140, raise: 340, place: 460,
            stageDone: 600, trans: 760, win: { doze: 900, road: 2300, crane: 900, build: 1500 } };
  var DIRT = ['#9a6230', '#c48a4f', '#7a4a1e', '#e3ad6b'];
  var FACE_ANG = { R: 0, D: Math.PI / 2, L: Math.PI, U: -Math.PI / 2 };
  var BLOCK = {
    Y: ['#ffe27a', '#ffc21a', '#a36b00'], R: ['#ff8a96', '#f2475a', '#8a1c33'], B: ['#8fd0ff', '#2f86f0', '#1a4f99'],
    G: ['#e3e7ee', '#a9b0bd', '#5a6272'], S: ['#c9d0db', '#8a94a6', '#3f4757'], P: ['#ff9c7a', '#d9573b', '#7a2a14']
  };

  /* ---------- Icons ---------- */
  function arrowSVG(dir) {
    var rot = { U: 0, R: 90, D: 180, L: 270 }[dir];
    return '<svg viewBox="0 0 40 40"><g transform="rotate(' + rot + ' 20 20)"><path d="M20 6 L34 22 H25 V34 H15 V22 H6 Z" fill="#fff" stroke="rgba(90,50,0,.35)" stroke-width="2.5" stroke-linejoin="round"/></g></svg>';
  }
  var HOOK_SVG = '<svg viewBox="0 0 40 40"><rect x="15" y="2" width="10" height="9" rx="2" fill="#fff"/><path d="M20 11 V20 a7 7 0 1 1 -7 7" fill="none" stroke="#fff" stroke-width="4.5" stroke-linecap="round"/></svg>';
  var UNDO_SVG = '<svg viewBox="0 0 24 24"><path d="M9 5 L4 10 L9 15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10 H14 a5.5 5.5 0 0 1 0 11 H9" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  var STAGE_ICO = {
    doze: '<svg viewBox="0 0 44 32"><rect x="4" y="22" width="30" height="8" rx="4" fill="#3a3a48"/><rect x="7" y="12" width="24" height="11" rx="3" fill="#ffc21a" stroke="#a36b00" stroke-width="2"/><rect x="11" y="3" width="13" height="11" rx="2" fill="#ffc21a" stroke="#a36b00" stroke-width="2"/><rect x="14" y="6" width="7" height="5" rx="1" fill="#bfe9ff"/><path d="M33 12 h5 l3 18 h-6z" fill="#9aa3b5" stroke="#4d5566" stroke-width="2" stroke-linejoin="round"/></svg>',
    crane: '<svg viewBox="0 0 44 32"><path d="M9 31 V4 M14 31 V4" stroke="#a36b00" stroke-width="2.5"/><path d="M9 28 L14 22 L9 16 L14 10 L9 4" stroke="#a36b00" stroke-width="2" fill="none"/><rect x="5" y="2" width="36" height="5" rx="2" fill="#ffc21a" stroke="#a36b00" stroke-width="2"/><line x1="33" y1="7" x2="33" y2="18" stroke="#333" stroke-width="1.6"/><rect x="27" y="18" width="12" height="7" rx="1.5" fill="#f2475a" stroke="#8a1c33" stroke-width="1.6"/></svg>',
    build: '<svg viewBox="0 0 44 32"><rect x="6" y="28" width="32" height="4" rx="1" fill="#a9b0bd"/><rect x="9" y="15" width="26" height="13" fill="#ff9f43" stroke="#5a3a14" stroke-width="2"/><rect x="19" y="19" width="6" height="9" fill="#e8484f"/><path d="M5 16 L22 3 L39 16 Z" fill="#e8484f" stroke="#5a3a14" stroke-width="2" stroke-linejoin="round"/></svg>'
  };
  function pieceSVG(p, color) {
    var O = '#5a3a14';
    switch (p) {
      case 'found': return '<svg viewBox="0 0 60 60"><rect x="3" y="34" width="54" height="16" rx="3" fill="#b9c0cc" stroke="#4d5566" stroke-width="3"/><rect x="3" y="34" width="54" height="5" rx="2" fill="#d8dde5"/><circle cx="14" cy="44" r="1.8" fill="#7a8394"/><circle cx="30" cy="45" r="1.8" fill="#7a8394"/><circle cx="46" cy="43" r="1.8" fill="#7a8394"/></svg>';
      case 'thin': return '<svg viewBox="0 0 60 60"><rect x="20" y="34" width="20" height="16" rx="3" fill="#b9c0cc" stroke="#4d5566" stroke-width="3"/><rect x="20" y="34" width="20" height="5" rx="2" fill="#d8dde5"/></svg>';
      case 'walls': return '<svg viewBox="0 0 60 60"><rect x="7" y="12" width="46" height="38" fill="' + (color || '#ff9f43') + '" stroke="' + O + '" stroke-width="3"/><path d="M7 21 H53 M7 30 H53 M7 39 H53" stroke="rgba(0,0,0,.14)" stroke-width="2.5"/><rect x="7" y="12" width="46" height="5" fill="rgba(255,255,255,.3)"/></svg>';
      case 'window': return '<svg viewBox="0 0 60 60"><rect x="12" y="12" width="36" height="36" rx="3" fill="#fff" stroke="' + O + '" stroke-width="3"/><rect x="17" y="17" width="26" height="26" fill="#8fd8ff"/><path d="M30 17 V43 M17 30 H43" stroke="#fff" stroke-width="4"/><path d="M20 26 L26 20" stroke="#fff" stroke-width="2.5" opacity=".8"/></svg>';
      case 'door': return '<svg viewBox="0 0 60 60"><rect x="17" y="8" width="26" height="44" rx="4" fill="#e8484f" stroke="' + O + '" stroke-width="3"/><rect x="21" y="13" width="18" height="14" rx="2" fill="#ff7a84"/><rect x="21" y="31" width="18" height="16" rx="2" fill="#ff7a84"/><circle cx="37" cy="30" r="2.6" fill="#ffd21f" stroke="' + O + '" stroke-width="1.5"/></svg>';
      case 'roof': return '<svg viewBox="0 0 60 60"><path d="M3 46 L30 12 L57 46 Z" fill="#e8484f" stroke="' + O + '" stroke-width="3" stroke-linejoin="round"/><path d="M15 36 H45 M22 27 H38" stroke="rgba(0,0,0,.18)" stroke-width="2.5"/></svg>';
      case 'flat': return '<svg viewBox="0 0 60 60"><rect x="3" y="26" width="54" height="11" rx="3" fill="#c98a4b" stroke="' + O + '" stroke-width="3"/><path d="M10 31 H24 M32 32 H50" stroke="rgba(0,0,0,.2)" stroke-width="2"/></svg>';
    }
    return '';
  }
  var PIECE_LABEL = { found: 'Foundation', thin: 'Small base', walls: 'Walls', window: 'Window', door: 'Door', roof: 'Roof', flat: 'Flat roof' };

  /* ---------- Small canvas helpers ---------- */
  function shade(g, x, y, w, hh, c0, c1) { var gr = g.createLinearGradient(x, y, x, y + hh); gr.addColorStop(0, c0); gr.addColorStop(1, c1); return gr; }
  function ellipse(g, x, y, rx, ry) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }
  function hash(x, y) { var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }

  function create(host, level, ctx) {
    var stages = level.stages;
    var state = null, hist = [];
    var saved = ctx.savedState;
    var restored = saved && saved.state ? CL.restore(level, saved.state) : null;
    if (restored) {
      state = restored;
      hist = (Array.isArray(saved.hist) ? saved.hist : []).map(function (s) { return CL.restore(level, s); }).filter(Boolean).slice(-40);
    } else state = CL.init(level);

    var destroyed = false, finished = false, running = false, celebrating = false, gen = 0;
    var queue = [];
    var saidOnce = {};
    var t0 = performance.now(), lastFrame = t0;

    /* ---------- DOM ---------- */
    var root = h('div.cn-wrap');
    var undoBtn = LE.button('white cn-undo', UNDO_SVG + '<span>Undo</span>', function () { if (!blocked()) enqueue('undo'); }, { label: 'Undo', sound: false });
    var restartBtn = LE.button('white cn-restart', '<svg viewBox="0 0 24 24"><path d="M5 12 a7 7 0 1 0 2.2 -5.1" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M4 3 v5 h5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      function () { if (!blocked()) doRestart(); }, { label: 'Start again', sound: false });
    var pips = h('div.cn-pips');
    var movesEl = h('div.cn-moves');
    var head = h('div.cn-head', undoBtn, h('div.cn-info', pips, movesEl), restartBtn);
    var canvas = h('canvas.cn-board');
    var boardWrap = h('div.cn-board-wrap', canvas);
    var ctrl = h('div.cn-ctrl');
    root.append(head, boardWrap, ctrl);
    host.appendChild(root);
    function blocked() { return finished || (ctx.isDemo && ctx.isDemo()); }

    root.classList.toggle('cn-multi', stages.length > 1);
    stages.forEach(function (s, i) {
      if (i) pips.appendChild(h('div.cn-pip-arrow', '›'));
      pips.appendChild(h('div.cn-pip', { 'data-i': String(i), html: STAGE_ICO[s.type] }));
    });

    /* ---------- Controls per stage ---------- */
    var btns = {}, trayEls = {}, ctrlType = null;
    function buildControls() {
      var type = stages[state.stage].type;
      if (ctrlType === type && ctrl.dataset.stage === String(state.stage)) { refreshControls(); return; }
      ctrlType = type;
      ctrl.dataset.stage = String(state.stage);
      ctrl.innerHTML = ''; btns = {}; trayEls = {};
      ctrl.className = 'cn-ctrl cn-ctrl-' + type;
      if (type === 'doze') {
        var pad = h('div.cn-pad');
        ['U', 'L', 'D', 'R'].forEach(function (k) {
          var b = LE.button('yellow cn-arrow cn-a-' + k, arrowSVG(k), function () { userInput(k); }, { label: { U: 'Up', D: 'Down', L: 'Left', R: 'Right' }[k], sound: false });
          btns[k] = b; pad.appendChild(b);
        });
        ctrl.appendChild(pad);
      } else if (type === 'crane') {
        var row = h('div.cn-crane-row');
        btns.L = LE.button('yellow cn-arrow', arrowSVG('L'), function () { userInput('L'); }, { label: 'Left', sound: false });
        btns.G = LE.button('orange cn-grab', HOOK_SVG + '<span class="cn-grab-lbl">Grab</span>', function () { userInput('G'); }, { label: 'Grab or drop', sound: false });
        btns.R = LE.button('yellow cn-arrow', arrowSVG('R'), function () { userInput('R'); }, { label: 'Right', sound: false });
        row.append(btns.L, btns.G, btns.R);
        ctrl.appendChild(row);
      } else {
        var tray = h('div.cn-tray' + (stages[state.stage].tray.length >= 6 ? '.cn-tray-6' : ''));
        var stg = stages[state.stage];
        stg.tray.forEach(function (p) {
          var el = h('div.cn-piece.pressable', { 'data-piece': p, role: 'button', 'aria-label': PIECE_LABEL[p] },
            h('div.cn-piece-ico', { html: pieceSVG(p, stg.house.color) }), h('div.cn-count'));
          el.addEventListener('pointerdown', function (e) { startDrag(e, p); });
          trayEls[p] = el; tray.appendChild(el);
        });
        ctrl.appendChild(tray);
      }
      refreshControls();
    }
    function refreshControls() {
      var stg = stages[state.stage];
      if (stg.type === 'crane' && btns.G) {
        var lbl = btns.G.querySelector('.cn-grab-lbl');
        var txt = state.st.held ? 'Drop' : 'Grab';
        if (lbl.textContent !== txt) lbl.textContent = txt;
      }
      if (stg.type === 'build') {
        Object.keys(trayEls).forEach(function (p) {
          var n = CL.remaining(stg, state.st, p);
          var el = trayEls[p];
          el.classList.toggle('empty', n === 0);
          el.classList.toggle('decoy', !!CL.DECOYS[p]);
          el.querySelector('.cn-count').textContent = CL.DECOYS[p] ? '' : String(n);
        });
      }
      undoBtn.classList.toggle('off', !hist.length);
      pips.querySelectorAll('.cn-pip').forEach(function (el) {
        var i = +el.dataset.i;
        el.classList.toggle('on', i === state.stage && !state.won);
        el.classList.toggle('done', i < state.stage || state.won);
      });
      movesEl.innerHTML = '<span class="cn-mv-lbl">Moves</span><b>' + state.moves + '</b><span class="cn-par">' + LE.starSVG(true) + CL.par(level) + '</span>';
      movesEl.classList.toggle('over', state.moves > CL.par(level));
    }

    /* ---------- Display model ---------- */
    var M = { W: 300, H: 300, g: null };
    var D = null;   // display for the current stage
    function syncDisplay() {
      var stg = stages[state.stage], st = state.st;
      if (stg.type === 'doze') {
        D = { si: state.stage,
          type: 'doze',
          dz: { x: st.d.x, y: st.d.y, ang: FACE_ANG[st.d.f], tread: 0, nx: 0, ny: 0, hop: 0 },
          items: st.items.map(function (it) { return { id: it.id, k: it.k, x: it.x, y: it.y, s: 1, sink: 0, alpha: it.gone ? 0 : 1, lift: 0 }; }),
          holes: st.holes.map(function (hh) { return { x: hh.x, y: hh.y, fill: hh.full ? 1 : 0, pop: 0 }; }),
          dumped: st.items.filter(function (it) { return it.k === 'r' && it.gone; }).length,
          truckPop: 0, puffs: [], road: null, shine: 0
        };
      } else if (stg.type === 'crane') {
        D = { si: state.stage, type: 'crane', tx: st.hook, hookY: 0, sway: 0, swayV: 0, held: st.held, cols: CL.clone(st.cols), wobble: 0, nudge: 0, glow: 0, puffs: [] };
      } else {
        var p = {};
        st.placed.forEach(function (id) { p[id] = 1; });
        D = { si: state.stage, type: 'build', placed: p, glow: 0, door: 0, puffs: [], smokeT: 0 };
      }
      layout();
    }

    /* ---------- Layout ---------- */
    var G = {};   // geometry for the current stage
    function layout() {
      // clientWidth/Height: layout size (getBoundingClientRect would include the screen's scale-in transform)
      var W = Math.max(120, Math.floor(boardWrap.clientWidth)), H = Math.max(120, Math.floor(boardWrap.clientHeight));
      if (W === M.W && H === M.H && M.g && M.si === (D ? D.si : state.stage)) return;
      M.si = D ? D.si : state.stage;
      var fit = LE.fitCanvas(canvas, W, H);
      M.W = W; M.H = H; M.g = fit.ctx;
      var stg = stages[D ? D.si : state.stage];
      G = { type: stg.type };
      if (stg.type === 'doze') {
        var gr = CL.grid(stg);
        var cell = Math.floor(Math.min((W - 18) / gr.w, (H - 18) / gr.h, 80));
        G.cell = cell; G.gw = gr.w; G.gh = gr.h;
        G.ox = Math.round((W - cell * gr.w) / 2); G.oy = Math.round((H - cell * gr.h) / 2);
      } else if (stg.type === 'crane') {
        var n = stg.cols.length;
        var bw = Math.min(W, 460);
        G.left = Math.round((W - bw) / 2);
        G.groundY = H - 28;
        G.jibY = 44;
        G.mastX = G.left + 26;
        G.x0 = G.left + 56;
        G.colW = (G.left + bw - 8 - G.x0) / n;
        G.blockH = Math.max(18, Math.min(52, G.colW * 0.5, (G.groundY - G.jibY - 30 - 16) / (CL.MAX_STACK + 1.25)));
        G.hookRest = G.jibY + 30;
        G.n = n;
      } else {
        var floors = stg.house.floors || 1;
        G.groundY = H - 24;
        var u = Math.min((W - 24) / 8.8, (G.groundY - 12) / (floors * 3 + 0.7 + 3.1));
        G.u = u; G.cx = W / 2; G.floors = floors;
      }
    }
    function canvasRect() { return canvas.getBoundingClientRect(); }
    function toClient(x, y, w, hh) { var r = canvasRect(); return { left: r.left + x, top: r.top + y, width: w || 0, height: hh || 0 }; }
    function cellRect(x, y) { return toClient(G.ox + x * G.cell, G.oy + y * G.cell, G.cell, G.cell); }
    function cellCenter(x, y) { var c = cellRect(x, y); return { x: c.left + c.width / 2, y: c.top + c.height / 2 }; }

    /* Crane geometry */
    function colX(i) { return G.x0 + G.colW * (i + 0.5); }
    function blockW(b) { return G.colW * [0.46, 0.68, 0.9][CL.size(b) - 1]; }

    /* House geometry: rectangle for a slot id (canvas coords). */
    function slotGeom(id) {
      var u = G.u, cx = G.cx, gy = G.groundY, stg = stages[D.si], house = stg.house;
      var fTop = gy - 0.7 * u;
      if (id === 'found') return { x: cx - 3.9 * u, y: fTop, w: 7.8 * u, h: 0.7 * u };
      var m = /^walls(\d)$/.exec(id);
      if (m) { var f = +m[1]; return { x: cx - 3.1 * u, y: fTop - f * 3 * u, w: 6.2 * u, h: 3 * u }; }
      var wins = house.windows || [0];
      if (id === 'door') {
        var dx = wins[0] === 1 ? 1.3 * u : 0;
        return { x: cx + dx - 0.6 * u, y: fTop - 2.1 * u, w: 1.2 * u, h: 2.1 * u };
      }
      m = /^win(\d)_(\d)$/.exec(id);
      if (m) {
        var fl = +m[1], i = +m[2], n = wins[fl - 1];
        var xs = fl === 1 ? (n === 1 ? [-1.5] : [-1.95, 1.95]) : (n === 1 ? [0] : n === 2 ? [-1.5, 1.5] : [-2, 0, 2]);
        var bottom = fTop - (fl - 1) * 3 * u;
        return { x: cx + xs[i] * u - 0.62 * u, y: bottom - 2.25 * u, w: 1.24 * u, h: 1.24 * u };
      }
      if (id === 'roof') { var top = fTop - G.floors * 3 * u; return { x: cx - 3.7 * u, y: top - 2.7 * u, w: 7.4 * u, h: 2.7 * u }; }
      return { x: cx - 3 * u, y: gy - 3 * u, w: 6 * u, h: 3 * u };
    }
    function plotGeom() {
      var top = slotGeom('roof').y;
      return { x: G.cx - 4.3 * G.u, y: top - 10, w: 8.6 * G.u, h: G.groundY - top + 14 };
    }
    function nextSlot(piece) {
      var stg = stages[state.stage];
      var list = CL.slots(stg.house);
      for (var i = 0; i < list.length; i++) if (list[i].piece === piece && state.st.placed.indexOf(list[i].id) < 0) return list[i].id;
      return null;
    }

    /* ---------- Drawing: bulldozer stage ---------- */
    function drawDoze(g, t) {
      var stg = stages[D.si], gr = CL.grid(stg), s = G.cell, ox = G.ox, oy = G.oy;
      var bw = s * gr.w, bh = s * gr.h;
      g.fillStyle = '#7a4a1e'; LE.rr(g, ox - 8, oy - 4, bw + 16, bh + 14, 16); g.fill();
      g.fillStyle = '#b07a42'; LE.rr(g, ox - 8, oy - 8, bw + 16, bh + 14, 16); g.fill();
      g.save(); LE.rr(g, ox, oy, bw, bh, 10); g.clip();
      for (var y = 0; y < gr.h; y++) for (var x = 0; x < gr.w; x++) {
        var px = ox + x * s, py = oy + y * s, road = stg.road === y;
        g.fillStyle = road ? ((x + y) % 2 ? '#646a7a' : '#5f6575') : ((x + y) % 2 ? '#e4ba7e' : '#dcb072');
        g.fillRect(px, py, s + 0.5, s + 0.5);
        if (!road) {
          g.fillStyle = 'rgba(122,74,30,.28)';
          for (var k = 0; k < 3; k++) { var hx = hash(x * 3 + k, y), hy = hash(y * 5 + k, x); ellipse(g, px + s * (0.15 + hx * 0.7), py + s * (0.15 + hy * 0.7), s * 0.035, s * 0.028); g.fill(); }
        } else {
          g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(px, py, s, s * 0.08);
        }
      }
      if (stg.road !== undefined) {
        var ry = oy + (stg.road + 0.5) * s;
        g.strokeStyle = '#ffe14d'; g.lineWidth = Math.max(3, s * 0.07); g.setLineDash([s * 0.32, s * 0.24]);
        g.beginPath(); g.moveTo(ox, ry); g.lineTo(ox + bw, ry); g.stroke(); g.setLineDash([]);
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(ox, oy + stg.road * s, bw, 2); g.fillRect(ox, oy + (stg.road + 1) * s - 2, bw, 2);
      }
      g.strokeStyle = 'rgba(90,50,10,.13)'; g.lineWidth = 1;
      for (x = 1; x < gr.w; x++) { g.beginPath(); g.moveTo(ox + x * s, oy); g.lineTo(ox + x * s, oy + bh); g.stroke(); }
      for (y = 1; y < gr.h; y++) { g.beginPath(); g.moveTo(ox, oy + y * s); g.lineTo(ox + bw, oy + y * s); g.stroke(); }
      g.restore();
      // holes
      D.holes.forEach(function (hh) { drawHole(g, ox + (hh.x + 0.5) * s, oy + (hh.y + 0.5) * s, s, hh, stg.road === hh.y, t); });
      // static things
      for (y = 0; y < gr.h; y++) for (x = 0; x < gr.w; x++) {
        var c = stg.map[y][x], cx = ox + (x + 0.5) * s, cy = oy + (y + 0.5) * s;
        if (c === '#') drawBarrier(g, cx, cy, s);
        else if (c === 'T') drawTree(g, cx, cy, s, x + y);
        else if (c === 'X') drawTruckTop(g, cx, cy, s, D.dumped, D.truckPop, 0, false);
      }
      // items (sorted by y)
      D.items.slice().sort(function (a, b) { return a.y - b.y; }).forEach(function (it) {
        if (it.alpha <= 0.01) return;
        var cx = ox + (it.x + 0.5) * s, cy = oy + (it.y + 0.5) * s - it.lift * s;
        g.save(); g.globalAlpha = it.alpha;
        if (it.k === 'o') drawDirt(g, cx, cy, s * it.s, it.sink, it.id);
        else drawRock(g, cx, cy, s * it.s);
        g.restore();
      });
      // road truck (win)
      if (D.road) drawTruckTop(g, ox + (D.road.x + 0.5) * s, oy + (D.road.y + 0.5) * s, s * 1.25, 0, 0, D.road.bob, true);
      // bulldozer
      var dz = D.dz;
      drawDozer(g, ox + (dz.x + 0.5 + dz.nx) * s, oy + (dz.y + 0.5 + dz.ny) * s - dz.hop * s * 0.3, s, dz.ang, dz.tread, t);
      drawPuffs(g, t);
      if (D.shine > 0) {
        g.save(); LE.rr(g, ox, oy, bw, bh, 10); g.clip();
        var sx = ox - bw * 0.4 + D.shine * bw * 1.8;
        var lg = g.createLinearGradient(sx - 40, 0, sx + 40, 0);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.35)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = lg; g.fillRect(ox, oy, bw, bh); g.restore();
      }
    }
    function drawHole(g, cx, cy, s, hh, road, t) {
      var f = hh.fill;
      var sc = 1 + hh.pop * 0.12;
      g.save(); g.translate(cx, cy); g.scale(sc, 1 / sc);
      if (f < 1) {
        g.fillStyle = road ? '#4b4f5c' : '#b27a40';
        ellipse(g, 0, s * 0.02, s * 0.42, s * 0.36); g.fill();
        g.fillStyle = '#3a2210';
        ellipse(g, 0, s * 0.03, s * 0.35, s * 0.29); g.fill();
        g.fillStyle = '#1f1006';
        ellipse(g, 0, s * 0.09, s * 0.25, s * 0.18); g.fill();
        g.strokeStyle = 'rgba(255,230,190,.35)'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, s * 0.03, s * 0.35, s * 0.29, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      }
      if (f > 0) {
        // dirt filling up, then a flat patch
        g.globalAlpha = Math.min(1, f * 1.4);
        g.fillStyle = road ? '#3f4350' : '#c48a4f';
        ellipse(g, 0, s * 0.03, s * 0.36 * (0.5 + f * 0.5), s * 0.3 * (0.5 + f * 0.5)); g.fill();
        g.strokeStyle = road ? 'rgba(255,255,255,.18)' : 'rgba(122,74,30,.45)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-s * 0.18, -s * 0.02); g.lineTo(s * 0.12, -s * 0.02); g.moveTo(-s * 0.1, s * 0.1); g.lineTo(s * 0.2, s * 0.1); g.stroke();
        g.globalAlpha = 1;
      }
      g.restore();
    }
    function drawDirt(g, cx, cy, s, sink, id) {
      g.save(); g.translate(cx, cy + sink * s * 0.25);
      g.scale(1 + sink * 0.25, 1 - sink * 0.5);
      g.fillStyle = 'rgba(60,30,5,.25)'; ellipse(g, s * 0.03, s * 0.24, s * 0.4, s * 0.12); g.fill();
      // a soft pile: three lumps, back to front
      var lumps = [[-0.15, 0.02, 0.22], [0.15, 0.04, 0.21], [0, -0.1, 0.24], [0.02, 0.1, 0.22]];
      g.lineWidth = Math.max(1.5, s * 0.035); g.strokeStyle = '#5a3412';
      lumps.forEach(function (l, i) {
        var x = l[0] * s, y = l[1] * s, r = l[2] * s * (1 + 0.06 * Math.sin(id * 3 + i));
        var gr = g.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
        gr.addColorStop(0, '#d9a066'); gr.addColorStop(0.55, '#a8693a'); gr.addColorStop(1, '#7a4a1e');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.stroke();
      });
      // cover inner outlines with the top lump again (no stroke) for a single soft silhouette
      var gr2 = g.createRadialGradient(-s * 0.06, -s * 0.12, s * 0.02, 0, -s * 0.02, s * 0.26);
      gr2.addColorStop(0, '#e2ae76'); gr2.addColorStop(1, 'rgba(168,105,58,0)');
      g.fillStyle = gr2; g.beginPath(); g.arc(0, -s * 0.03, s * 0.2, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6b3f17';
      [[0.16, 0.12], [-0.17, 0.08], [0.06, -0.2], [0.22, -0.04], [-0.06, 0.2]].forEach(function (p) { ellipse(g, p[0] * s, p[1] * s, s * 0.03, s * 0.025); g.fill(); });
      g.fillStyle = 'rgba(255,240,210,.7)';
      ellipse(g, -s * 0.08, -s * 0.2, s * 0.06, s * 0.03); g.fill();
      g.restore();
    }
    function drawRock(g, cx, cy, s) {
      g.fillStyle = 'rgba(30,30,40,.25)'; ellipse(g, cx, cy + s * 0.24, s * 0.36, s * 0.11); g.fill();
      var gr = g.createLinearGradient(0, cy - s * 0.3, 0, cy + s * 0.3);
      gr.addColorStop(0, '#d5dae2'); gr.addColorStop(1, '#7c8696');
      g.fillStyle = gr; g.strokeStyle = '#4d5566'; g.lineWidth = Math.max(1.5, s * 0.045); g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(cx - s * 0.36, cy + s * 0.2); g.lineTo(cx - s * 0.3, cy - s * 0.1); g.lineTo(cx - s * 0.08, cy - s * 0.3);
      g.lineTo(cx + s * 0.2, cy - s * 0.26); g.lineTo(cx + s * 0.36, cy - s * 0.02); g.lineTo(cx + s * 0.3, cy + s * 0.22); g.closePath();
      g.fill(); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = Math.max(1.5, s * 0.035);
      g.beginPath(); g.moveTo(cx - s * 0.18, cy - s * 0.14); g.lineTo(cx - s * 0.04, cy - s * 0.22); g.stroke();
      g.strokeStyle = 'rgba(60,66,80,.5)';
      g.beginPath(); g.moveTo(cx + s * 0.05, cy - s * 0.05); g.lineTo(cx + s * 0.16, cy + s * 0.08); g.stroke();
    }
    function drawBarrier(g, cx, cy, s) {
      var w = s * 0.86, hh = s * 0.56;
      g.fillStyle = 'rgba(0,0,0,.2)'; LE.rr(g, cx - w / 2, cy - hh / 2 + s * 0.08, w, hh, 6); g.fill();
      g.save(); LE.rr(g, cx - w / 2, cy - hh / 2, w, hh, 6); g.clip();
      g.fillStyle = '#fff'; g.fillRect(cx - w / 2, cy - hh / 2, w, hh);
      g.fillStyle = '#ff8a1c';
      for (var i = -3; i < 4; i++) { g.beginPath(); var bx = cx + i * s * 0.26; g.moveTo(bx, cy - hh / 2); g.lineTo(bx + s * 0.13, cy - hh / 2); g.lineTo(bx + s * 0.13 - hh, cy + hh / 2); g.lineTo(bx - hh, cy + hh / 2); g.fill(); }
      g.restore();
      g.strokeStyle = '#a34a00'; g.lineWidth = 2; LE.rr(g, cx - w / 2, cy - hh / 2, w, hh, 6); g.stroke();
    }
    function drawTree(g, cx, cy, s, seed) {
      g.fillStyle = 'rgba(0,0,0,.18)'; ellipse(g, cx + s * 0.05, cy + s * 0.28, s * 0.34, s * 0.1); g.fill();
      var gr = g.createRadialGradient(cx - s * 0.1, cy - s * 0.15, s * 0.05, cx, cy, s * 0.42);
      gr.addColorStop(0, '#8fe68a'); gr.addColorStop(1, '#2f9a45');
      g.fillStyle = gr; g.strokeStyle = '#1f6e31'; g.lineWidth = 2;
      [[-0.15, 0.04, 0.22], [0.15, 0.04, 0.22], [0, -0.14, 0.25]].forEach(function (c) { g.beginPath(); g.arc(cx + s * c[0], cy + s * c[1], s * c[2], 0, Math.PI * 2); g.fill(); g.stroke(); });
      g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(cx - s * 0.08, cy - s * 0.22, s * 0.06, 0, 7); g.fill();
      if (seed % 2 === 0) { g.fillStyle = '#ff5d73'; g.beginPath(); g.arc(cx + s * 0.13, cy - s * 0.04, s * 0.045, 0, 7); g.fill(); }
    }
    /* Top-down dump truck, facing right. */
    function drawTruckTop(g, cx, cy, s, rocks, pop, bob, moving) {
      g.save(); g.translate(cx, cy + (bob || 0)); var sc = 1 + pop * 0.1; g.scale(sc, sc);
      g.fillStyle = 'rgba(0,0,0,.22)'; LE.rr(g, -s * 0.44, -s * 0.3, s * 0.92, s * 0.68, s * 0.12); g.fill();
      g.fillStyle = '#2b2d36';
      [[-0.32, -0.38], [0.18, -0.38], [-0.32, 0.26], [0.18, 0.26]].forEach(function (w) { LE.rr(g, s * w[0], s * w[1], s * 0.2, s * 0.12, 3); g.fill(); });
      g.fillStyle = shade(g, 0, -s * 0.32, 0, s * 0.64, '#ffb04a', '#f07d10'); g.strokeStyle = '#9a4a00'; g.lineWidth = 2.5;
      LE.rr(g, -s * 0.46, -s * 0.32, s * 0.6, s * 0.64, s * 0.08); g.fill(); g.stroke();
      g.fillStyle = '#c96000'; LE.rr(g, -s * 0.4, -s * 0.25, s * 0.48, s * 0.5, s * 0.05); g.fill();
      for (var i = 0; i < Math.min(rocks, 4); i++) {
        var rx = -s * 0.3 + (i % 2) * s * 0.2, ry = -s * 0.1 + Math.floor(i / 2) * s * 0.16 - s * 0.04;
        g.fillStyle = '#a8b0bd'; g.strokeStyle = '#4d5566'; g.lineWidth = 1.5; ellipse(g, rx, ry, s * 0.1, s * 0.08); g.fill(); g.stroke();
      }
      g.fillStyle = shade(g, 0, -s * 0.28, 0, s * 0.56, '#6bc1ff', '#2f86f0'); g.strokeStyle = '#1a4f99'; g.lineWidth = 2.5;
      LE.rr(g, s * 0.17, -s * 0.28, s * 0.3, s * 0.56, s * 0.08); g.fill(); g.stroke();
      g.fillStyle = '#d6f1ff'; LE.rr(g, s * 0.34, -s * 0.2, s * 0.08, s * 0.4, 3); g.fill();
      if (moving) { g.fillStyle = '#ffe14d'; ellipse(g, s * 0.47, -s * 0.18, s * 0.04, s * 0.05); g.fill(); ellipse(g, s * 0.47, s * 0.18, s * 0.04, s * 0.05); g.fill(); }
      g.restore();
    }
    /* Top-down bulldozer, facing +x before rotation. */
    function drawDozer(g, cx, cy, s, ang, tread, t) {
      g.save(); g.translate(cx, cy);
      g.fillStyle = 'rgba(40,20,0,.25)'; ellipse(g, s * 0.03, s * 0.08, s * 0.44, s * 0.4); g.fill();
      g.rotate(ang);
      // tracks
      [-1, 1].forEach(function (side) {
        var ty = side * s * 0.29;
        g.fillStyle = '#2b2d36'; LE.rr(g, -s * 0.38, ty - s * 0.1, s * 0.66, s * 0.2, s * 0.08); g.fill();
        g.save(); LE.rr(g, -s * 0.38, ty - s * 0.1, s * 0.66, s * 0.2, s * 0.08); g.clip();
        g.strokeStyle = '#5b5f70'; g.lineWidth = Math.max(1.5, s * 0.035);
        var sp = s * 0.1, off = ((tread * s * 0.6) % sp + sp) % sp;
        for (var x = -s * 0.42 + off; x < s * 0.32; x += sp) { g.beginPath(); g.moveTo(x, ty - s * 0.1); g.lineTo(x, ty + s * 0.1); g.stroke(); }
        g.restore();
      });
      // blade arms + blade
      g.strokeStyle = '#4d5566'; g.lineWidth = Math.max(2, s * 0.05);
      g.beginPath(); g.moveTo(s * 0.18, -s * 0.2); g.lineTo(s * 0.34, -s * 0.24); g.moveTo(s * 0.18, s * 0.2); g.lineTo(s * 0.34, s * 0.24); g.stroke();
      g.fillStyle = shade(g, 0, -s * 0.45, 0, s * 0.9, '#d9dee6', '#8a94a6'); g.strokeStyle = '#3f4757'; g.lineWidth = Math.max(1.5, s * 0.04);
      g.beginPath();
      g.moveTo(s * 0.33, -s * 0.46); g.quadraticCurveTo(s * 0.44, 0, s * 0.33, s * 0.46); g.lineTo(s * 0.42, s * 0.46); g.quadraticCurveTo(s * 0.53, 0, s * 0.42, -s * 0.46); g.closePath();
      g.fill(); g.stroke();
      // body
      g.fillStyle = shade(g, 0, -s * 0.22, 0, s * 0.44, '#ffd84a', '#f5a300'); g.strokeStyle = '#a36b00'; g.lineWidth = Math.max(1.5, s * 0.04);
      LE.rr(g, -s * 0.32, -s * 0.21, s * 0.56, s * 0.42, s * 0.09); g.fill(); g.stroke();
      // engine grille (back)
      g.strokeStyle = 'rgba(120,70,0,.55)'; g.lineWidth = Math.max(1, s * 0.02);
      for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-s * 0.27 + i * s * 0.05, -s * 0.12); g.lineTo(-s * 0.27 + i * s * 0.05, s * 0.12); g.stroke(); }
      // cab roof
      g.fillStyle = shade(g, 0, -s * 0.16, 0, s * 0.32, '#ffe98a', '#ffc21a'); g.strokeStyle = '#a36b00';
      LE.rr(g, -s * 0.1, -s * 0.16, s * 0.28, s * 0.32, s * 0.07); g.fill(); g.stroke();
      g.fillStyle = '#7fd3ff'; LE.rr(g, s * 0.1, -s * 0.13, s * 0.06, s * 0.26, 2); g.fill();
      // exhaust + beacon
      g.fillStyle = '#3a3a48'; g.beginPath(); g.arc(-s * 0.2, -s * 0.15, s * 0.04, 0, 7); g.fill();
      var blink = (Math.sin(t * 6) > 0) ? 1 : 0.35;
      g.fillStyle = 'rgba(255,140,30,' + blink + ')'; g.beginPath(); g.arc(s * 0.02, 0, s * 0.045, 0, 7); g.fill();
      g.restore();
    }
    function drawPuffs(g, t) {
      var now = performance.now();
      for (var i = D.puffs.length - 1; i >= 0; i--) {
        var p = D.puffs[i], k = (now - p.t0) / (p.life / LE.speed);
        if (k >= 1) { D.puffs.splice(i, 1); continue; }
        g.fillStyle = p.c || 'rgba(245,228,196,' + (0.6 * (1 - k)) + ')';
        if (p.c) g.globalAlpha = 0.7 * (1 - k);
        g.beginPath(); g.arc(p.x + p.vx * k, p.y + p.vy * k, p.r * (0.6 + k * 0.9), 0, 7); g.fill();
        g.globalAlpha = 1;
      }
    }
    function puff(x, y, r, vx, vy, life, c) { D.puffs.push({ x: x, y: y, r: r, vx: vx || 0, vy: vy || 0, life: life || 600, t0: performance.now(), c: c }); }

    /* ---------- Drawing: crane stage ---------- */
    function drawBlock(g, b, x, yTop, rot) {
      var w = blockW(b), hh = G.blockH, k = b[0], c = BLOCK[k] || BLOCK.G;
      g.save(); g.translate(x, yTop + hh / 2); if (rot) g.rotate(rot);
      var X = -w / 2, Y = -hh / 2;
      if (k === 'S') {
        g.fillStyle = c[1]; g.strokeStyle = c[2]; g.lineWidth = 2.5;
        LE.rr(g, X, Y, w, hh * 0.28, 3); g.fill(); g.stroke();
        LE.rr(g, X, Y + hh * 0.72, w, hh * 0.28, 3); g.fill(); g.stroke();
        g.fillStyle = c[0]; g.fillRect(X + w * 0.1, Y + hh * 0.28, w * 0.8, hh * 0.44); g.strokeRect(X + w * 0.1, Y + hh * 0.28, w * 0.8, hh * 0.44);
        g.fillStyle = c[2];
        for (var i = 0; i < 4; i++) { g.beginPath(); g.arc(X + w * (0.16 + i * 0.226), Y + hh * 0.14, Math.max(1.5, hh * 0.05), 0, 7); g.fill(); }
      } else if (k === 'P') {
        g.fillStyle = '#c98a4b'; g.strokeStyle = '#6b4420'; g.lineWidth = 2;
        LE.rr(g, X, Y + hh * 0.78, w, hh * 0.22, 2); g.fill(); g.stroke();
        var rows = 3, bh = hh * 0.78 / rows;
        for (var r = 0; r < rows; r++) {
          var cols = 4, bwid = w / cols, off = r % 2 ? bwid / 2 : 0;
          for (var cc = -1; cc < cols; cc++) {
            var bx = X + cc * bwid + off; var bx0 = Math.max(X, bx), bx1 = Math.min(X + w, bx + bwid);
            if (bx1 - bx0 < 2) continue;
            g.fillStyle = (r + cc) % 2 ? '#e2603f' : '#d9573b'; g.strokeStyle = '#7a2a14'; g.lineWidth = 1.5;
            g.fillRect(bx0 + 0.5, Y + r * bh + 0.5, bx1 - bx0 - 1, bh - 1); g.strokeRect(bx0 + 0.5, Y + r * bh + 0.5, bx1 - bx0 - 1, bh - 1);
          }
        }
      } else {
        g.fillStyle = shade(g, 0, Y, 0, hh, c[0], c[1]); g.strokeStyle = c[2]; g.lineWidth = 2.5;
        LE.rr(g, X, Y, w, hh, Math.min(8, hh * 0.25)); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.35)'; LE.rr(g, X + 4, Y + 3, w - 8, hh * 0.22, 3); g.fill();
        g.fillStyle = c[2];
        [[0.12, 0.7], [0.88, 0.7]].forEach(function (p) { g.beginPath(); g.arc(X + w * p[0], Y + hh * p[1], Math.max(1.6, hh * 0.06), 0, 7); g.fill(); });
      }
      g.restore();
    }
    function drawCrane(g, t) {
      var stg = stages[D.si];
      var W = M.W, gy = G.groundY;
      // clouds, distant city + ground
      g.fillStyle = 'rgba(255,255,255,.85)';
      [[0.55, 0.3, 1], [0.85, 0.18, 0.75], [0.3, 0.5, 0.6]].forEach(function (c, i) {
        var x = ((c[0] * W + t * 6 * (i + 1)) % (W + 120)) - 60, y = G.jibY + (gy - G.jibY) * c[1], k = c[2] * 16;
        g.beginPath(); g.arc(x, y, k, 0, 7); g.arc(x + k * 1.1, y - k * 0.5, k * 1.1, 0, 7); g.arc(x + k * 2.2, y, k * 0.9, 0, 7); g.rect(x, y - k * 0.2, k * 2.2, k * 1.0); g.fill();
      });
      g.fillStyle = 'rgba(120,160,200,.35)';
      [[0.08, 70], [0.2, 110], [0.33, 80], [0.62, 120], [0.76, 90], [0.9, 105]].forEach(function (b) { g.fillRect(W * b[0], gy - b[1] * (gy / 300), W * 0.09, b[1] * (gy / 300)); });
      g.fillStyle = '#8a5a2b'; g.fillRect(0, gy, W, M.H - gy);
      g.fillStyle = '#b07a42'; g.fillRect(0, gy, W, 7);
      g.fillStyle = '#6cc95a'; g.fillRect(0, gy - 3, W, 5);
      // goal pads + ghost stacks
      (stg.goals || []).forEach(function (gl) {
        var x = colX(gl.col), pw = G.colW * 0.94;
        g.save(); LE.rr(g, x - pw / 2, gy, pw, 12, 3); g.clip();
        g.fillStyle = '#ffd21f'; g.fillRect(x - pw / 2, gy, pw, 12);
        g.fillStyle = '#2b2d36'; for (var i = -6; i < 12; i++) { g.beginPath(); var sx = x - pw / 2 + i * 12; g.moveTo(sx, gy + 12); g.lineTo(sx + 6, gy + 12); g.lineTo(sx + 12, gy); g.lineTo(sx + 6, gy); g.fill(); }
        g.restore();
        var pulse = 0.5 + 0.5 * Math.sin(t * 3);
        g.setLineDash([6, 5]); g.lineWidth = 2.5; g.strokeStyle = 'rgba(255,255,255,' + (0.55 + pulse * 0.35) + ')';
        gl.stack.forEach(function (b, i) {
          var w = blockW(b), yTop = gy - (i + 1) * G.blockH;
          g.fillStyle = 'rgba(255,255,255,.18)'; LE.rr(g, x - w / 2, yTop + 1, w, G.blockH - 2, 6); g.fill(); g.stroke();
        });
        g.setLineDash([]);
        if (!(D.cols[gl.col] || []).length) {
          g.strokeStyle = '#f2475a'; g.lineWidth = 5; g.lineCap = 'round';
          var xs = Math.min(14, G.colW * 0.16), yy = gy - G.blockH * 0.5;
          g.beginPath(); g.moveTo(x - xs, yy - xs); g.lineTo(x + xs, yy + xs); g.moveTo(x + xs, yy - xs); g.lineTo(x - xs, yy + xs); g.stroke(); g.lineCap = 'butt';
        }
      });
      // truck
      if (stg.truck !== undefined) {
        var tx = colX(stg.truck), tw = G.colW * 0.96;
        g.fillStyle = '#ff8a1c'; g.strokeStyle = '#9a4a00'; g.lineWidth = 2.5;
        LE.rr(g, tx - tw / 2, gy - 2, tw, 12, 3); g.fill(); g.stroke();
        g.fillStyle = '#2b2d36'; g.beginPath(); g.arc(tx - tw * 0.3, gy + 13, 7, 0, 7); g.arc(tx + tw * 0.3, gy + 13, 7, 0, 7); g.fill();
        g.fillStyle = '#9aa3b5'; g.beginPath(); g.arc(tx - tw * 0.3, gy + 13, 2.5, 0, 7); g.arc(tx + tw * 0.3, gy + 13, 2.5, 0, 7); g.fill();
      }
      // stacks
      D.cols.forEach(function (col, ci) {
        col.forEach(function (b, i) { drawBlock(g, b, colX(ci), gy - (i + 1) * G.blockH, 0); });
      });
      // mast
      var mx = G.mastX, mw = 18, topY = G.jibY - 16;
      g.fillStyle = 'rgba(0,0,0,.15)'; g.fillRect(mx - mw / 2 + 4, topY, mw, gy - topY);
      g.strokeStyle = '#d18a00'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(mx - mw / 2, gy); g.lineTo(mx - mw / 2, topY); g.moveTo(mx + mw / 2, gy); g.lineTo(mx + mw / 2, topY); g.stroke();
      g.lineWidth = 2; g.beginPath();
      for (var y = gy, k2 = 0; y > topY + 4; y -= mw, k2++) { g.moveTo(mx + (k2 % 2 ? mw / 2 : -mw / 2), y); g.lineTo(mx + (k2 % 2 ? -mw / 2 : mw / 2), y - mw); }
      g.stroke();
      g.fillStyle = '#5b6070'; g.fillRect(mx - mw / 2 - 6, gy - 6, mw + 12, 8);
      // jib + counter jib + apex
      var jibR = G.left + Math.min(M.W, 460) - 4;
      g.strokeStyle = '#a36b00'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(mx, topY - 18); g.lineTo(jibR, G.jibY); g.moveTo(mx, topY - 18); g.lineTo(mx - 30, G.jibY); g.stroke();
      g.fillStyle = '#ffc21a'; g.strokeStyle = '#a36b00';
      g.beginPath(); g.moveTo(mx - 6, topY - 20); g.lineTo(mx + 6, topY - 20); g.lineTo(mx + mw / 2, topY + 2); g.lineTo(mx - mw / 2, topY + 2); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = shade(g, 0, G.jibY - 5, 0, 10, '#ffe27a', '#ffc21a'); g.lineWidth = 2.5;
      LE.rr(g, mx - 34, G.jibY - 5, jibR - mx + 36, 11, 3); g.fill(); g.stroke();
      g.strokeStyle = 'rgba(163,107,0,.6)'; g.lineWidth = 1.5; g.beginPath();
      for (var jx = mx + 6; jx < jibR - 6; jx += 12) { g.moveTo(jx, G.jibY - 4); g.lineTo(jx + 6, G.jibY + 5); g.lineTo(jx + 12, G.jibY - 4); }
      g.stroke();
      g.fillStyle = '#7c8696'; g.strokeStyle = '#3f4757'; g.lineWidth = 2; LE.rr(g, mx - 36, G.jibY + 4, 18, 14, 3); g.fill(); g.stroke();
      // cabin
      g.fillStyle = '#3d8bff'; g.strokeStyle = '#1a4f99'; LE.rr(g, mx + mw / 2 - 2, G.jibY + 6, 20, 18, 4); g.fill(); g.stroke();
      g.fillStyle = '#bfe9ff'; LE.rr(g, mx + mw / 2 + 3, G.jibY + 9, 12, 9, 2); g.fill();
      // trolley, cable, hook
      var trx = colX(D.tx) + D.nudge * G.colW;
      g.fillStyle = '#4d5566'; LE.rr(g, trx - 12, G.jibY + 4, 24, 9, 3); g.fill();
      g.fillStyle = '#2b2d36'; g.beginPath(); g.arc(trx - 7, G.jibY + 5, 3, 0, 7); g.arc(trx + 7, G.jibY + 5, 3, 0, 7); g.fill();
      var len = (G.hookRest + D.hookY) - (G.jibY + 13);
      var hx = trx + Math.sin(D.sway) * len, hy = G.jibY + 13 + Math.cos(D.sway) * len;
      g.strokeStyle = '#2b2d36'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(trx - 3, G.jibY + 13); g.lineTo(hx - 3, hy); g.moveTo(trx + 3, G.jibY + 13); g.lineTo(hx + 3, hy); g.stroke();
      g.save(); g.translate(hx, hy); g.rotate(-D.sway * 0.6);
      g.fillStyle = '#ffc21a'; g.strokeStyle = '#2b2d36'; g.lineWidth = 2;
      LE.rr(g, -9, 0, 18, 10, 3); g.fill(); g.stroke();
      g.fillStyle = '#2b2d36'; g.fillRect(-9, 3, 18, 3);
      if (D.held) {
        g.strokeStyle = '#2b2d36'; g.lineWidth = 1.6;
        var bw2 = blockW(D.held) * 0.42;
        g.beginPath(); g.moveTo(0, 10); g.lineTo(-bw2, 16); g.moveTo(0, 10); g.lineTo(bw2, 16); g.stroke();
        drawBlock(g, D.held, 0, 16, D.wobble);
      } else {
        g.strokeStyle = '#3a3a48'; g.lineWidth = 3.5; g.lineCap = 'round';
        g.beginPath(); g.moveTo(0, 10); g.lineTo(0, 15); g.arc(-4, 15, 4, 0, Math.PI * 0.95); g.stroke(); g.lineCap = 'butt';
      }
      g.restore();
      if (D.glow > 0) {
        (stg.goals || []).forEach(function (gl) {
          var x = colX(gl.col), top = gy - gl.stack.length * G.blockH;
          var rg = g.createRadialGradient(x, top + G.blockH, 4, x, top + G.blockH, G.colW);
          rg.addColorStop(0, 'rgba(255,240,140,' + 0.5 * D.glow + ')'); rg.addColorStop(1, 'rgba(255,240,140,0)');
          g.fillStyle = rg; g.fillRect(x - G.colW, top - G.colW * 0.5, G.colW * 2, G.colW * 2.5);
        });
      }
      drawPuffs(g, t);
    }

    /* ---------- Drawing: house stage ---------- */
    function drawBuild(g, t) {
      var stg = stages[D.si], W = M.W, gy = G.groundY, u = G.u, cx = G.cx;
      // hills + ground
      g.fillStyle = '#8fd66f'; g.beginPath(); g.ellipse(W * 0.15, gy + 10, W * 0.35, 60, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#7ccb5e'; g.beginPath(); g.ellipse(W * 0.9, gy + 10, W * 0.3, 46, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#6cc95a'; g.fillRect(0, gy - 2, W, M.H - gy + 2);
      g.fillStyle = '#5bb84a'; g.fillRect(0, gy + 8, W, M.H - gy);
      g.fillStyle = '#b07a42'; LE.rr(g, cx - 4.4 * u, gy - 3, 8.8 * u, 12, 5); g.fill();
      // fence
      g.fillStyle = '#fff6e0'; g.strokeStyle = '#c9a76a'; g.lineWidth = 1.5;
      [[8, 0], [W - 8 - 4 * 14, 0]].forEach(function (f) {
        if (f[0] + 56 > cx - 4.4 * u && f[0] < cx + 4.4 * u) return;
        for (var i = 0; i < 4; i++) { var fx = f[0] + i * 14; g.beginPath(); g.moveTo(fx, gy); g.lineTo(fx, gy - 20); g.lineTo(fx + 4, gy - 25); g.lineTo(fx + 8, gy - 20); g.lineTo(fx + 8, gy); g.fill(); g.stroke(); }
        g.fillRect(f[0] - 2, gy - 16, 56, 4);
      });
      var slots = CL.slots(stg.house);
      var placeable = {};
      slots.forEach(function (s) { if (!D.placed[s.id] && s.need.every(function (n) { return D.placed[n] >= 1; })) placeable[s.id] = true; });
      // blueprint outlines for missing parts
      var pulse = 0.5 + 0.5 * Math.sin(t * 4);
      slots.forEach(function (s) {
        if (D.placed[s.id]) return;
        var r = slotGeom(s.id);
        g.save();
        g.setLineDash([7, 6]); g.lineWidth = 2.5;
        g.strokeStyle = placeable[s.id] ? 'rgba(255,255,255,' + (0.7 + pulse * 0.3) + ')' : 'rgba(255,255,255,.45)';
        g.fillStyle = placeable[s.id] ? 'rgba(120,200,255,' + (0.25 + pulse * 0.15) + ')' : 'rgba(120,200,255,.12)';
        if (s.id === 'roof') { g.beginPath(); g.moveTo(r.x, r.y + r.h); g.lineTo(r.x + r.w / 2, r.y); g.lineTo(r.x + r.w, r.y + r.h); g.closePath(); }
        else { g.beginPath(); g.rect(r.x, r.y, r.w, r.h); }
        g.fill(); g.stroke();
        g.restore();
      });
      // placed parts, bottom-up order
      var order = ['found'];
      for (var f = 1; f <= G.floors; f++) order.push('walls' + f);
      slots.forEach(function (s) { if (s.piece === 'door' || s.piece === 'window') order.push(s.id); });
      order.push('roof');
      order.forEach(function (id) {
        var p = D.placed[id];
        if (!p) return;
        var r = slotGeom(id), off = (1 - p) * -Math.max(36, u * 2.4);
        var sq = p > 0.85 ? Math.sin((p - 0.85) / 0.15 * Math.PI) * 0.06 : 0;
        g.save(); g.globalAlpha = Math.min(1, p * 2.5);
        g.translate(r.x + r.w / 2, r.y + r.h + off); g.scale(1 + sq, 1 - sq); g.translate(-(r.x + r.w / 2), -(r.y + r.h));
        drawPart(g, id, r, stg.house.color, t);
        g.restore();
      });
      drawPuffs(g, t);
    }
    function drawPart(g, id, r, color, t) {
      var O = '#5a3a14';
      if (id === 'found') {
        g.fillStyle = shade(g, 0, r.y, 0, r.h, '#d8dde5', '#9aa3b5'); g.strokeStyle = '#4d5566'; g.lineWidth = 2.5;
        LE.rr(g, r.x, r.y, r.w, r.h, 3); g.fill(); g.stroke();
        g.fillStyle = 'rgba(77,85,102,.4)';
        for (var i = 1; i < 8; i++) { g.beginPath(); g.arc(r.x + r.w * i / 8, r.y + r.h * (0.45 + 0.2 * (i % 2)), 1.6, 0, 7); g.fill(); }
      } else if (/^walls/.test(id)) {
        g.fillStyle = color; g.strokeStyle = O; g.lineWidth = 3;
        g.fillRect(r.x, r.y, r.w, r.h);
        g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 2;
        for (var y = r.y + r.h / 6; y < r.y + r.h - 2; y += r.h / 6) { g.beginPath(); g.moveTo(r.x, y); g.lineTo(r.x + r.w, y); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(r.x, r.y, r.w, r.h * 0.08);
        g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(r.x + r.w - r.w * 0.06, r.y, r.w * 0.06, r.h);
        g.strokeStyle = O; g.lineWidth = 3; g.strokeRect(r.x, r.y, r.w, r.h);
        if (id !== 'walls1') { g.fillStyle = '#fff6e0'; g.strokeStyle = O; g.lineWidth = 2; LE.rr(g, r.x - 4, r.y + r.h - 4, r.w + 8, 8, 3); g.fill(); g.stroke(); }
      } else if (id === 'door') {
        var open = D.door;
        g.fillStyle = '#ffe9a0'; LE.rr(g, r.x, r.y, r.w, r.h, 5); g.fill();
        g.save(); g.translate(r.x, 0); g.scale(1 - open * 0.75, 1); g.translate(-r.x, 0);
        g.fillStyle = shade(g, 0, r.y, 0, r.h, '#ff6a72', '#d63340'); g.strokeStyle = O; g.lineWidth = 2.5;
        LE.rr(g, r.x, r.y, r.w, r.h, 5); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.25)'; LE.rr(g, r.x + r.w * 0.18, r.y + r.h * 0.1, r.w * 0.64, r.h * 0.3, 3); g.fill();
        g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(r.x + r.w * 0.78, r.y + r.h * 0.56, Math.max(2, r.w * 0.08), 0, 7); g.fill();
        g.restore();
        g.strokeStyle = O; g.lineWidth = 2.5; LE.rr(g, r.x, r.y, r.w, r.h, 5); g.stroke();
      } else if (/^win/.test(id)) {
        var lit = D.glow;
        g.fillStyle = '#fff'; g.strokeStyle = O; g.lineWidth = 2.5;
        LE.rr(g, r.x - 2, r.y - 2, r.w + 4, r.h + 4, 3); g.fill(); g.stroke();
        g.fillStyle = lit > 0 ? 'rgba(255,225,110,' + (0.4 + lit * 0.6) + ')' : '#8fd8ff';
        g.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
        if (!lit) { g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(r.x + 4, r.y + r.h * 0.5); g.lineTo(r.x + r.w * 0.5, r.y + 4); g.lineTo(r.x + r.w * 0.62, r.y + 4); g.lineTo(r.x + 4, r.y + r.h * 0.62); g.fill(); }
        g.strokeStyle = '#fff'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(r.x + r.w / 2, r.y + 2); g.lineTo(r.x + r.w / 2, r.y + r.h - 2); g.moveTo(r.x + 2, r.y + r.h / 2); g.lineTo(r.x + r.w - 2, r.y + r.h / 2); g.stroke();
        g.fillStyle = '#c98a4b'; LE.rr(g, r.x - 4, r.y + r.h + 1, r.w + 8, 4, 2); g.fill();
      } else if (id === 'roof') {
        // chimney
        g.fillStyle = '#b8574a'; g.strokeStyle = O; g.lineWidth = 2.5;
        g.fillRect(r.x + r.w * 0.66, r.y + r.h * 0.12, r.w * 0.09, r.h * 0.45); g.strokeRect(r.x + r.w * 0.66, r.y + r.h * 0.12, r.w * 0.09, r.h * 0.45);
        g.fillStyle = shade(g, 0, r.y, 0, r.h, '#ff6b6b', '#d63340'); g.lineWidth = 3; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(r.x, r.y + r.h); g.lineTo(r.x + r.w / 2, r.y); g.lineTo(r.x + r.w, r.y + r.h); g.closePath(); g.fill(); g.stroke();
        g.save(); g.beginPath(); g.moveTo(r.x, r.y + r.h); g.lineTo(r.x + r.w / 2, r.y); g.lineTo(r.x + r.w, r.y + r.h); g.closePath(); g.clip();
        g.strokeStyle = 'rgba(120,20,30,.35)'; g.lineWidth = 2;
        for (var k = 1; k < 4; k++) { var yy = r.y + r.h * k / 4; g.beginPath(); g.moveTo(r.x, yy); g.lineTo(r.x + r.w, yy); g.stroke(); }
        g.restore();
        g.fillStyle = '#fff'; g.strokeStyle = O; g.lineWidth = 2;
        g.beginPath(); g.arc(r.x + r.w / 2, r.y + r.h * 0.55, r.h * 0.13, 0, 7); g.fill(); g.stroke();
        g.fillStyle = D.glow ? '#ffe14d' : '#8fd8ff'; g.beginPath(); g.arc(r.x + r.w / 2, r.y + r.h * 0.55, r.h * 0.09, 0, 7); g.fill();
      }
    }

    /* ---------- Frame loop ---------- */
    var raf = 0;
    function frame(now) {
      if (destroyed) return;
      var dt = Math.min(0.05, (now - lastFrame) / 1000) * LE.speed; lastFrame = now;
      var t = (now - t0) / 1000;
      if (D && D.type === 'crane') {
        D.swayV += (-28 * D.sway - 3.2 * D.swayV) * dt;
        D.sway += D.swayV * dt;
        if (Math.abs(D.sway) < 0.0005 && Math.abs(D.swayV) < 0.001) { D.sway = 0; D.swayV = 0; }
      }
      if (D && D.type === 'build' && D.glow > 0.5) {
        D.smokeT -= dt;
        if (D.smokeT <= 0) {
          D.smokeT = 0.35;
          var rr = slotGeom('roof');
          puff(rr.x + rr.w * 0.705, rr.y + rr.h * 0.1, 5, 6 + Math.random() * 6, -36, 1400, '#ffffff');
        }
      }
      var g = M.g;
      if (g && D) {
        g.clearRect(0, 0, M.W, M.H);
        g.save();
        if (trans.a < 1) { g.globalAlpha = trans.a; g.translate(M.W / 2, M.H / 2); var sc = 0.9 + 0.1 * trans.a; g.scale(sc, sc); g.translate(-M.W / 2, -M.H / 2); }
        if (D.type === 'doze') drawDoze(g, t); else if (D.type === 'crane') drawCrane(g, t); else drawBuild(g, t);
        g.restore();
      }
      raf = requestAnimationFrame(frame);
    }
    var trans = { a: 1 };

    /* ---------- Actions ---------- */
    function save() { if (ctx.saveState) ctx.saveState({ v: 1, state: state, hist: hist.slice(-40) }); }
    function alive(g0) { return !destroyed && g0 === gen; }
    function tw(ms, fn, ease) { var g0 = gen; return LE.tween(ms, function (k) { if (g0 === gen && !destroyed) fn(k); }, ease); }

    function userInput(a) {
      if (blocked()) return;
      enqueue(a);
    }
    function enqueue(a) {
      if (finished) return;
      if (queue.length >= 3) return;
      queue.push(a);
      pump();
    }
    async function pump() {
      if (running) return;
      running = true;
      try {
        while (queue.length && !destroyed && !finished) {
          var a = queue.shift();
          await perform(a, gen);
        }
      } finally { running = false; }
    }

    async function perform(a, g0) {
      if (a === 'undo') { doUndo(); return; }
      var stg = stages[state.stage];
      var r = CL.act(level, state, a);
      if (!r.ok) {
        if (stg.type === 'doze') { state = r.state; save(); }
        await animFail(stg, r, a, g0);
        return;
      }
      hist.push(state); if (hist.length > 60) hist.shift();
      state = r.state;
      save();
      refreshControls();
      var evs = r.events;
      var stageIdx = evs.findIndex(function (e) { return e.t === 'stageDone'; });
      var own = stageIdx >= 0 ? evs.slice(0, stageIdx) : evs;
      if (stg.type === 'doze') await animDoze(own, g0);
      else if (stg.type === 'crane') await animCrane(own, g0);
      else await animBuild(own, g0);
      if (!alive(g0)) return;
      if (stageIdx < 0) {
        if (stg.type === 'doze' && CL.deadlock(level, state)) warnStuck();
        return;
      }
      var won = evs.some(function (e) { return e.t === 'won'; });
      if (won) {
        finished = true; celebrating = true;
        refreshControls();
        await celebrate(stg, g0);
        celebrating = false;
        if (!alive(g0)) return;
        var stars = CL.stars(level, state.moves);
        ctx.win({ stars: stars, note: stars < 3 ? 'Tip: try fewer moves for 3 stars!' : null });
        return;
      }
      // next stage
      ctx.sfx('ding');
      sparkleBoard();
      ctx.emit('stage', { stage: state.stage });
      await LE.wait(T.stageDone);
      if (!alive(g0)) return;
      ctx.sfx('whoosh');
      await tw(T.trans * 0.4, function (k) { trans.a = 1 - k; });
      if (!alive(g0)) { trans.a = 1; return; }
      buildControls(); syncDisplay();
      var nst = stages[state.stage];
      if (nst.type === 'crane') { D.hookY = -10; }
      await tw(T.trans * 0.6, function (k) { trans.a = k; }, LE.ease.out);
      trans.a = 1;
      sayStage(nst);
    }
    function sayStage(nst) {
      if (nst.type === 'crane') ctx.say('Great! Now lift the bricks with the crane!');
      else if (nst.type === 'build') ctx.say('The plot is ready. Now build the house!');
    }

    function warnStuck() {
      var st = state.st, rockStuck = false;
      st.items.forEach(function (it) {
        if (it.gone || it.k !== 'r') return;
        var probe = CL.clone(state);
        probe.st.items = probe.st.items.filter(function (x) { return x.id === it.id; });
        probe.st.holes = [];
        if (CL.deadlock(level, probe)) rockStuck = true;
      });
      ctx.sfx('oops');
      if (rockStuck) ctx.say('Oops! That rock is stuck. Tap Undo!');
      else ctx.say('Oops! That pile is stuck. Tap Undo!');
      undoBtn.classList.remove('cn-pulse'); void undoBtn.offsetWidth; undoBtn.classList.add('cn-pulse');
    }

    function sayReason(reason) {
      switch (reason) {
        case 'hole': if (!saidOnce.hole) { saidOnce.hole = true; ctx.say('Fill the hole with dirt first!'); } break;
        case 'two': if (!saidOnce.two) { saidOnce.two = true; ctx.say('Too heavy! Push one thing at a time.'); } break;
        case 'rockHole': if (!saidOnce.rockHole) { saidOnce.rockHole = true; ctx.say('Rocks go in the dump truck!'); } break;
        case 'dirtTruck': if (!saidOnce.dirtTruck) { saidOnce.dirtTruck = true; ctx.say('Dirt goes in the holes!'); } break;
        case 'big': ctx.say('Big blocks go at the bottom!'); break;
        case 'tall': ctx.say('That tower is tall enough!'); break;
        case 'empty': ctx.say('Nothing to grab here!'); break;
        case 'needFound': ctx.say('Walls need a foundation first!'); break;
        case 'needWalls': ctx.say('Build the walls first!'); break;
        case 'roofWalls': ctx.say('A roof needs walls under it!'); break;
        case 'roofParts': ctx.say('Add the door and windows before the roof!'); break;
        case 'flat': ctx.say('A triangle roof is stronger!'); break;
        case 'thin': ctx.say('A tall house needs a wide foundation!'); break;
      }
    }

    /* ----- Bulldozer animation ----- */
    async function turnTo(face, g0) {
      var a0 = D.dz.ang, a1 = FACE_ANG[face];
      var d = a1 - a0;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      if (Math.abs(d) < 0.01) return;
      await tw(T.turn, function (k) { D.dz.ang = a0 + d * k; D.dz.tread = (D.dz.tread || 0) + 0.02; });
      if (alive(g0)) D.dz.ang = a1;
    }
    async function animDoze(evs, g0) {
      var mv = evs.find(function (e) { return e.t === 'move'; });
      var turn = evs.find(function (e) { return e.t === 'turn'; });
      var push = evs.find(function (e) { return e.t === 'push'; });
      var fill = evs.find(function (e) { return e.t === 'fill'; });
      var dump = evs.find(function (e) { return e.t === 'dump'; });
      if (turn) { if (mv && mv.reverse) ctx.sfx('beep'); await turnTo(turn.to, g0); if (!alive(g0)) return; }
      ctx.sfx('rumble');
      var dz = D.dz, fx0 = dz.x, fy0 = dz.y, dx = mv.to.x - mv.from.x, dy = mv.to.y - mv.from.y;
      var it = push ? D.items[push.id] : null, ix0 = it ? it.x : 0, iy0 = it ? it.y : 0;
      var s = G.cell, tr0 = dz.tread;
      // dust puff behind the tracks
      puff(G.ox + (fx0 + 0.5 - dx * 0.4) * s, G.oy + (fy0 + 0.5 - dy * 0.4) * s, s * 0.14, -dx * s * 0.3, -dy * s * 0.3 - s * 0.1, 650);
      await tw(T.move, function (k) {
        dz.x = fx0 + dx * k; dz.y = fy0 + dy * k; dz.tread = tr0 + k;
        if (it) { it.x = ix0 + dx * k; it.y = iy0 + dy * k; }
      });
      if (!alive(g0)) return;
      dz.x = mv.to.x; dz.y = mv.to.y;
      ctx.emit('move', { dir: mv.dir });
      if (push) {
        it.x = push.to.x; it.y = push.to.y;
        if (!fill && !dump) puff(G.ox + (it.x + 0.5 + dx * 0.35) * s, G.oy + (it.y + 0.5 + dy * 0.35) * s, s * 0.12, dx * s * 0.25, -s * 0.12, 500, 'rgba(201,141,82,1)');
        ctx.emit('push');
      }
      if (fill) {
        var hole = D.holes[fill.hole];
        ctx.sfx('dig');
        await tw(T.fill * 0.55, function (k) { it.sink = k; it.s = 1 - k * 0.3; it.alpha = 1 - k * 0.6; hole.fill = k * 0.8; });
        if (!alive(g0)) return;
        it.alpha = 0;
        ctx.sfx('thud');
        var c = cellCenter(fill.x, fill.y);
        DIRT.forEach(function (col) { ctx.fx.burst(c.x, c.y, { n: 5, color: col, speed: 4.5, size: 6 + Math.random() * 4, up: 2.5, g: 0.3, life: 32 }); });
        await tw(T.fill * 0.45, function (k) { hole.fill = 0.8 + 0.2 * k; hole.pop = Math.sin(k * Math.PI) * (1 - k * 0.3); });
        if (!alive(g0)) return;
        hole.fill = 1; hole.pop = 0;
        ctx.emit('fill');
      }
      if (dump) {
        ctx.sfx('clank');
        await tw(T.dump * 0.6, function (k) { it.lift = Math.sin(k * Math.PI) * 0.4; it.s = 1 - k * 0.45; it.alpha = 1 - k; });
        if (!alive(g0)) return;
        D.dumped++;
        ctx.sfx('thud');
        var tc = cellCenter(dump.x, dump.y);
        ctx.fx.burst(tc.x, tc.y, { n: 8, color: '#a8b0bd', speed: 3.5, size: 6, up: 2 });
        await tw(T.dump * 0.4, function (k) { D.truckPop = Math.sin(k * Math.PI); });
        D.truckPop = 0;
        ctx.emit('dump');
      }
    }
    async function animFailDoze(r, g0) {
      var turn = r.events.find(function (e) { return e.t === 'turn'; });
      if (turn) { await turnTo(turn.to, g0); if (!alive(g0)) return; }
      var b = r.bump || { x: D.dz.x, y: D.dz.y };
      var dx = Math.sign(b.x - D.dz.x), dy = Math.sign(b.y - D.dz.y);
      ctx.sfx('bump');
      await tw(110, function (k) { D.dz.nx = dx * 0.12 * k; D.dz.ny = dy * 0.12 * k; });
      await tw(170, function (k) { D.dz.nx = dx * 0.12 * (1 - k); D.dz.ny = dy * 0.12 * (1 - k); });
      D.dz.nx = 0; D.dz.ny = 0;
      sayReason(r.reason);
    }

    /* ----- Crane animation ----- */
    async function animCrane(evs, g0) {
      for (var i = 0; i < evs.length; i++) {
        var e = evs[i];
        if (e.t === 'hook') {
          ctx.sfx('whirr');
          var a0 = e.from, d = e.to - e.from;
          D.swayV += -d * 1.6;
          await tw(T.hook, function (k) { D.tx = a0 + d * k; });
          if (!alive(g0)) return;
          D.tx = e.to;
          ctx.emit('hook');
        } else if (e.t === 'grab' || e.t === 'drop') {
          var grab = e.t === 'grab';
          var targetTop = G.groundY - (e.level + 1) * G.blockH;      // top of the block being grabbed / dropped
          var dyHook = (targetTop - 16) - G.hookRest;
          ctx.sfx('whirr');
          var s0 = D.sway;
          await tw(T.lower, function (k) { D.hookY = dyHook * k; D.sway = s0 * (1 - k); D.swayV = 0; });
          if (!alive(g0)) return;
          if (grab) { D.cols[e.col].pop(); D.held = e.block; ctx.sfx('clank'); }
          else {
            D.cols[e.col].push(e.block); D.held = null; ctx.sfx('thud');
            var x = colX(e.col), rr = canvasRect();
            puff(x - blockW(e.block) * 0.5, G.groundY - e.level * G.blockH - 4, 7, -18, -6, 520);
            puff(x + blockW(e.block) * 0.5, G.groundY - e.level * G.blockH - 4, 7, 18, -6, 520);
            ctx.fx.burst(rr.left + x, rr.top + G.groundY - e.level * G.blockH, { n: 8, color: '#e8d2a8', speed: 3, size: 6, up: 1 });
          }
          await LE.wait(T.grip);
          if (!alive(g0)) return;
          await tw(T.raise, function (k) { D.hookY = dyHook * (1 - k); }, LE.ease.out);
          if (!alive(g0)) return;
          D.hookY = 0;
          ctx.emit(grab ? 'grab' : 'drop');
        }
      }
    }
    async function animFailCrane(r, g0) {
      if (r.reason === 'edge') {
        var dir = state.st.hook === 0 ? -1 : 1;
        ctx.sfx('bump');
        await tw(120, function (k) { D.nudge = dir * 0.15 * k; });
        await tw(180, function (k) { D.nudge = dir * 0.15 * (1 - k); });
        D.nudge = 0; D.swayV += -dir * 0.8;
        return;
      }
      var col = D.cols[state.st.hook];
      var top = G.groundY - col.length * G.blockH;
      var dyHook = (D.held ? top - G.blockH - 16 - 14 : top - 26) - G.hookRest;
      dyHook = Math.max(0, dyHook);
      ctx.sfx('whirr');
      await tw(T.lower, function (k) { D.hookY = dyHook * k; });
      if (!alive(g0)) return;
      ctx.sfx(r.reason === 'empty' ? 'clank' : 'buzz');
      sayReason(r.reason);
      await tw(420, function (k) { D.wobble = Math.sin(k * Math.PI * 4) * 0.18 * (1 - k); });
      D.wobble = 0;
      if (!alive(g0)) return;
      await tw(T.raise, function (k) { D.hookY = dyHook * (1 - k); }, LE.ease.out);
      D.hookY = 0;
    }

    /* ----- Build animation ----- */
    async function animBuild(evs, g0) {
      var e = evs.find(function (x) { return x.t === 'place'; });
      if (!e) return;
      dropGhost(true);
      D.placed[e.slot] = 0.001;
      var hammered = false;
      await tw(T.place, function (k) {
        D.placed[e.slot] = Math.max(0.001, k);
        if (k > 0.75 && !hammered) { hammered = true; ctx.sfx('hammer'); }
      }, LE.ease.out);
      if (!alive(g0)) return;
      D.placed[e.slot] = 1;
      ctx.sfx('place');
      var r = slotGeom(e.slot), rr = canvasRect();
      ctx.fx.burst(rr.left + r.x + r.w / 2, rr.top + r.y + r.h, { n: 10, color: '#fff3c4', speed: 4, size: 6, up: 1.5 });
      setTimeout(function () { if (!destroyed) ctx.sfx('hammer'); }, 90 / LE.speed);
      ctx.emit('place', { piece: e.piece, slot: e.slot });
    }
    async function animFailBuild(r, a) {
      ctx.sfx('bump');
      sayReason(r.reason);
      await dropGhost(false, a);
      LE.shake(trayEls[a]);
      ctx.emit('reject', { piece: a, reason: r.reason });
    }
    async function animFail(stg, r, a, g0) {
      if (stg.type === 'doze') return animFailDoze(r, g0);
      if (stg.type === 'crane') return animFailCrane(r, g0);
      return animFailBuild(r, a);
    }

    /* ---------- Celebrations ---------- */
    function sparkleBoard() {
      var rr = canvasRect();
      for (var i = 0; i < 4; i++) ctx.fx.sparkle(rr.left + rr.width * (0.2 + i * 0.2), rr.top + rr.height * (0.35 + (i % 2) * 0.2));
    }
    async function celebrate(stg, g0) {
      if (stg.type === 'doze') {
        if (stg.road !== undefined) return celebrateRoad(stg, g0);
        ctx.sfx('ding');
        D.holes.forEach(function (hh) { var c = cellCenter(hh.x, hh.y); ctx.fx.sparkle(c.x, c.y, '#ffe14d'); });
        await tw(T.win.doze * 0.6, function (k) { D.shine = k; D.dz.hop = Math.abs(Math.sin(k * Math.PI * 2)); });
        D.shine = 0; D.dz.hop = 0;
        await LE.wait(T.win.doze * 0.4);
      } else if (stg.type === 'crane') {
        ctx.sfx('ding');
        (stg.goals || []).forEach(function (gl) {
          var rr = canvasRect();
          gl.stack.forEach(function (b, i) { ctx.fx.sparkle(rr.left + colX(gl.col), rr.top + G.groundY - (i + 0.5) * G.blockH); });
        });
        await tw(T.win.crane * 0.5, function (k) { D.glow = Math.sin(k * Math.PI); D.hookY = -k * 8; });
        D.glow = 0;
        await LE.wait(T.win.crane * 0.5);
      } else {
        ctx.sfx('ding');
        await tw(T.win.build * 0.4, function (k) { D.glow = k; D.door = k; });
        var hr = plotGeom(), rr = canvasRect();
        for (var i = 0; i < 5; i++) ctx.fx.sparkle(rr.left + hr.x + hr.w * (0.1 + i * 0.2), rr.top + hr.y + hr.h * (0.2 + 0.3 * (i % 2)));
        ctx.fx.burst(rr.left + hr.x + hr.w / 2, rr.top + hr.y + hr.h * 0.3, { n: 12, color: '#ff6b8a', shape: 'star', size: 9, speed: 5, g: 0.08 });
        await LE.wait(T.win.build * 0.6);
      }
    }
    async function celebrateRoad(stg, g0) {
      var gr = CL.grid(stg), dz = D.dz;
      // park the bulldozer next to the road
      if (Math.round(dz.y) === stg.road) {
        var spots = [[0, -1], [0, 1]].map(function (d) { return { x: dz.x + d[0], y: dz.y + d[1] }; }).filter(function (p) {
          return CL.cellKind(gr, p.x, p.y) === 'ground' && !CL.itemAt(state.st, p.x, p.y) && !CL.holeAt(state.st, p.x, p.y);
        });
        if (spots.length) {
          var sp = spots[0], y0 = dz.y;
          ctx.sfx('beep');
          await tw(260, function (k) { dz.y = y0 + (sp.y - y0) * k; dz.tread += 0.04; });
        }
      }
      if (!alive(g0)) return;
      D.road = { x: -1.6, y: stg.road, bob: 0 };
      ctx.sfx('car');
      var honked = false, span = gr.w + 3.2;
      await tw(T.win.road * 0.85, function (k) {
        D.road.x = -1.6 + span * k; D.road.bob = Math.sin(k * 40) * 0.8;
        if (k > 0.45 && !honked) { honked = true; ctx.sfx('honk'); }
      }, LE.ease.linear);
      D.road = null;
      await LE.wait(T.win.road * 0.15);
    }

    /* ---------- Undo / restart ---------- */
    function doUndo() {
      if (!hist.length) { ctx.sfx('buzz'); LE.shake(undoBtn); return; }
      var prevStage = state.stage;
      state = hist.pop();
      gen++;
      ctx.sfx('whoosh');
      if (state.stage !== prevStage) buildControls();
      syncDisplay(); refreshControls(); save();
      ctx.emit('undo');
      undoBtn.classList.remove('cn-pulse');
    }
    function doRestart() {
      gen++; queue = []; finished = false; celebrating = false; trans.a = 1;
      dropGhost(true);
      state = CL.init(level); hist = []; saidOnce = {};
      ctx.sfx('whoosh');
      buildControls(); syncDisplay(); refreshControls(); save();
      undoBtn.classList.remove('cn-pulse');
      ctx.emit('restart');
    }

    /* ---------- Bulldozer swipe / tap on the board ---------- */
    var swipe = null;
    canvas.addEventListener('pointerdown', function (e) {
      if (blocked() || stages[state.stage].type !== 'doze') return;
      swipe = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('pointerup', onBoardUp);
    function onBoardUp(e) {
      if (!swipe) return;
      var dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
      swipe = null;
      if (blocked() || stages[state.stage].type !== 'doze') return;
      var dir = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U');
      else {
        var r = canvasRect();
        var cx = Math.floor((e.clientX - r.left - G.ox) / G.cell), cy = Math.floor((e.clientY - r.top - G.oy) / G.cell);
        var ddx = cx - state.st.d.x, ddy = cy - state.st.d.y;
        if (Math.abs(ddx) + Math.abs(ddy) === 1) dir = ddx === 1 ? 'R' : ddx === -1 ? 'L' : ddy === 1 ? 'D' : 'U';
      }
      if (dir) { LE.bounce(btns[dir], 1.08); userInput(dir); }
    }

    /* ---------- Tray drag (house) ---------- */
    var drag = null, ghostEl = null;
    function startDrag(e, piece) {
      if (blocked() || running) return;
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      drag = { piece: piece, sx: e.clientX, sy: e.clientY, moved: false, ghost: null };
      window.addEventListener('pointermove', onDragMove, { passive: false });
      window.addEventListener('pointerup', onDragUp);
      window.addEventListener('pointercancel', onDragCancel);
    }
    function makeGhost(piece) {
      var stg = stages[state.stage];
      var el = h('div.cn-ghost', { html: pieceSVG(piece, stg.house && stg.house.color) });
      document.body.appendChild(el);
      return el;
    }
    function moveGhost(el, x, y) { el.style.transform = 'translate(' + (x - 36) + 'px,' + (y - 60) + 'px)'; }
    function onDragMove(e) {
      if (!drag) return;
      e.preventDefault();
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) {
        if (CL.remaining(stages[state.stage], state.st, drag.piece) <= 0) { endDrag(); ctx.sfx('buzz'); return; }
        drag.moved = true; drag.ghost = makeGhost(drag.piece); ctx.sfx('pop');
        trayEls[drag.piece] && trayEls[drag.piece].classList.add('lifted');
      }
      if (drag.moved) { moveGhost(drag.ghost, e.clientX, e.clientY); drag.x = e.clientX; drag.y = e.clientY; }
    }
    function endDrag() {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragUp);
      window.removeEventListener('pointercancel', onDragCancel);
      if (drag && trayEls[drag.piece]) trayEls[drag.piece].classList.remove('lifted');
      var d = drag; drag = null; return d;
    }
    function onDragCancel() { var d = endDrag(); if (d && d.ghost) d.ghost.remove(); }
    function onDragUp(e) {
      var d = endDrag();
      if (!d) return;
      if (blocked()) { if (d.ghost) d.ghost.remove(); return; }
      if (!d.moved) {
        if (CL.remaining(stages[state.stage], state.st, d.piece) <= 0) { ctx.sfx('buzz'); LE.shake(trayEls[d.piece]); return; }
        LE.bounce(trayEls[d.piece], 1.08);
        enqueue(d.piece);
        return;
      }
      var pr = plotGeom(), r = canvasRect();
      var x = e.clientX - r.left, y = e.clientY - 30 - r.top;
      var inside = x > pr.x - 30 && x < pr.x + pr.w + 30 && y > pr.y - 50 && y < pr.y + pr.h + 30;
      if (!inside) { ghostEl = d.ghost; dropGhost(false, d.piece); ctx.sfx('whoosh'); return; }
      if (ghostEl) ghostEl.remove();
      ghostEl = d.ghost;
      enqueue(d.piece);
    }
    /** Remove the drag ghost: placed → vanish, rejected → fly back to the tray. */
    function dropGhost(placed, piece) {
      var el = ghostEl; ghostEl = null;
      if (!el) return Promise.resolve();
      if (placed || !trayEls[piece]) { el.remove(); return Promise.resolve(); }
      var tr = trayEls[piece].getBoundingClientRect();
      var m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || '');
      var x0 = m ? +m[1] : tr.left, y0 = m ? +m[2] : tr.top;
      var x1 = tr.left + tr.width / 2 - 36, y1 = tr.top + tr.height / 2 - 36;
      return LE.tween(300, function (k) {
        el.style.transform = 'translate(' + (x0 + (x1 - x0) * k) + 'px,' + (y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 40) + 'px) scale(' + (1 - k * 0.3) + ')';
      }, LE.ease.inOut).then(function () { el.remove(); });
    }

    /* ---------- Targets for the pointing hand ---------- */
    function target(key) {
      if (!key) return null;
      if (key === 'undo') return undoBtn.getBoundingClientRect();
      if (key === 'restart') return restartBtn.getBoundingClientRect();
      if (key === 'board') return canvasRect();
      var m, stg = stages[state.stage];
      if ((m = /^btn:(\w)$/.exec(key))) return btns[m[1]] ? btns[m[1]].getBoundingClientRect() : null;
      if ((m = /^tray:(\w+)$/.exec(key))) return trayEls[m[1]] ? trayEls[m[1]].getBoundingClientRect() : null;
      if (!D || D.si !== state.stage) return null;
      if (stg.type === 'doze') {
        if (key === 'dozer') return cellRect(state.st.d.x, state.st.d.y);
        if ((m = /^cell:(\d+),(\d+)$/.exec(key))) return cellRect(+m[1], +m[2]);
      }
      if (stg.type === 'crane') {
        if ((m = /^col:(\d+)$/.exec(key))) return toClient(colX(+m[1]) - G.colW / 2, G.groundY - 2 * G.blockH, G.colW, 2 * G.blockH);
        if (key === 'hook') return toClient(colX(D.tx) - 12, G.hookRest + D.hookY, 24, 24);
      }
      if (stg.type === 'build') {
        if (key === 'plot') { var p = plotGeom(); return toClient(p.x, p.y, p.w, p.h); }
        if ((m = /^slot:(\w+)$/.exec(key))) {
          var id = nextSlot(m[1]);
          var r = id ? slotGeom(id) : plotGeom();
          return toClient(r.x, r.y, r.w, r.h);
        }
      }
      return null;
    }
    function ghost(key) {
      var m = /^tray:(\w+)$/.exec(key || '');
      if (!m) return null;
      var stg = stages[state.stage];
      return '<div class="cn-hand-ghost">' + pieceSVG(m[1], stg.house && stg.house.color) + '</div>';
    }

    /* ---------- Show me ---------- */
    function estimate(evs, type, stg) {
      var ms = 0;
      evs.forEach(function (e) {
        if (e.t === 'turn') ms += T.turn;
        else if (e.t === 'move') ms += T.move;
        else if (e.t === 'fill') ms += T.fill;
        else if (e.t === 'dump') ms += T.dump;
        else if (e.t === 'hook') ms += T.hook;
        else if (e.t === 'grab' || e.t === 'drop') ms += T.lower + T.grip + T.raise;
        else if (e.t === 'place') ms += T.place;
        else if (e.t === 'stage') ms += T.stageDone + T.trans;
        else if (e.t === 'won') ms += (type === 'doze' && stg.road !== undefined ? T.win.road + 300 : T.win[type]) + 250;
      });
      return ms;
    }
    /** opts.fromCurrent (Ask Helper demo): when the board is exactly where the solution would be after its first k
     *  moves (the move counter aside), continue from move k+1; otherwise start fresh. */
    function showMe(opts) {
      var steps = [];
      var skip = 0;
      if (opts && opts.fromCurrent && !finished && !queue.length) {
        var key = function (x) { return JSON.stringify({ stage: x.stage, st: x.st, won: x.won }); };
        var now = key(state), s0 = CL.init(level), k = 0, found = key(s0) === now ? 0 : -1;
        (level.solution || []).forEach(function (acts) { acts.forEach(function (a) { s0 = CL.act(level, s0, a).state; k++; if (key(s0) === now) found = k; }); });
        if (found > 0) skip = found;
        else if (found < 0) steps.push({ from: 'restart', say: 'First, let\'s start fresh.', apply: function () { doRestart(); }, pause: 400 });
      } else if (hist.length || !CL.isInitial(level, state) || finished) {
        steps.push({ from: 'restart', say: 'First, let\'s start fresh.', apply: function () { doRestart(); }, pause: 400 });
      }
      var sim = CL.init(level), n = 0;
      (level.solution || []).forEach(function (acts, si) {
        var stg = stages[si];
        acts.forEach(function (a) {
          var r = CL.act(level, sim, a);
          sim = r.state;
          if (n++ < skip) return;
          var step = { apply: function () { enqueue(a); }, pause: estimate(r.events, stg.type, stg) + 140 };
          if (stg.type === 'build') { step.from = 'tray:' + a; step.to = 'slot:' + a; }
          else step.from = 'btn:' + a;
          steps.push(step);
        });
      });
      return steps;
    }

    /* ---------- Lifecycle ---------- */
    function onResize() { layout(); }
    window.addEventListener('resize', onResize);
    var ro = window.ResizeObserver ? new ResizeObserver(function () { layout(); }) : null;
    if (ro) ro.observe(boardWrap);
    buildControls();
    syncDisplay();
    refreshControls();
    raf = requestAnimationFrame(function (n) { lastFrame = n; layout(); frame(n); });

    return {
      noGo: true,
      get busy() { return running || celebrating; },
      target: target,
      ghost: ghost,
      showMe: showMe,
      stop: function () { queue = []; },
      reset: function () { doRestart(); },
      getState: function () { return CL.clone(state); },
      destroy: function () {
        destroyed = true; gen++;
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener('resize', onResize);
        window.removeEventListener('pointerup', onBoardUp);
        onDragCancel();
        if (ghostEl) ghostEl.remove();
        root.remove();
      }
    };
  }

  LE.views.construction = { create: create };
})();
