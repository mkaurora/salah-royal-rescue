/* Machines view: side-view workshop board (canvas), parts tray with drag & drop, Go → animated simulation. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  LE.views = LE.views || {};
  var h = LE.h;
  var ML = LE.logic.machines;

  var TICK_MS = 200;
  var PART_NAMES = { ramp: 'Ramp', wedge: 'Wedge', gearS: 'Small gear', gearB: 'Big gear', lever: 'Seesaw', pulley: 'Pulley', wheels: 'Wheels' };
  var PART_ORDER = ['ramp', 'wheels', 'gearS', 'gearB', 'lever', 'wedge', 'pulley'];
  var OUT = '#4a2a12';
  var BALL_R = 0.3, BOX_H = 0.36;

  /* ================= Drawing primitives (cell units scaled by s) ================= */
  function rampPath(g, x, y, s, dir) {
    g.beginPath();
    if (dir > 0) { g.moveTo(x + s * 0.04, y + s * 0.12); g.lineTo(x + s, y + s); g.lineTo(x + s * 0.04, y + s); }
    else { g.moveTo(x + s * 0.96, y + s * 0.12); g.lineTo(x, y + s); g.lineTo(x + s * 0.96, y + s); }
    g.closePath();
  }
  function drawRamp(g, x, y, s, dir, placed) {
    rampPath(g, x, y, s, dir);
    var gr = g.createLinearGradient(x, y, x, y + s);
    if (placed) { gr.addColorStop(0, '#ffb04a'); gr.addColorStop(1, '#f06a1f'); } else { gr.addColorStop(0, '#d99252'); gr.addColorStop(1, '#a8652c'); }
    g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke();
    // shiny slope edge
    g.beginPath();
    var a = dir > 0 ? [x + s * 0.1, y + s * 0.22, x + s * 0.86, y + s * 0.92] : [x + s * 0.9, y + s * 0.22, x + s * 0.14, y + s * 0.92];
    g.moveTo(a[0], a[1]); g.lineTo(a[2], a[3]);
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = Math.max(1.5, s * 0.05); g.lineCap = 'round'; g.stroke();
    if (placed) {
      g.fillStyle = '#7a3a10';
      var bx = dir > 0 ? x + s * 0.2 : x + s * 0.8;
      g.beginPath(); g.arc(bx, y + s * 0.8, s * 0.05, 0, 7); g.fill();
      // little arrow showing roll direction
      g.save(); g.translate(x + s * (dir > 0 ? 0.36 : 0.64), y + s * 0.8); g.scale(dir, 1);
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.beginPath(); g.moveTo(-s * 0.1, -s * 0.07); g.lineTo(s * 0.06, 0); g.lineTo(-s * 0.1, s * 0.07); g.closePath(); g.fill();
      g.restore();
    }
  }
  function drawGear(g, cx, cy, r, teeth, rot, fill, dark) {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.beginPath();
    var n = teeth, inner = r * 0.8;
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, w = Math.PI / n;
      g.lineTo(Math.cos(a - w * 0.62) * inner, Math.sin(a - w * 0.62) * inner);
      g.lineTo(Math.cos(a - w * 0.34) * r, Math.sin(a - w * 0.34) * r);
      g.lineTo(Math.cos(a + w * 0.34) * r, Math.sin(a + w * 0.34) * r);
      g.lineTo(Math.cos(a + w * 0.62) * inner, Math.sin(a + w * 0.62) * inner);
    }
    g.closePath();
    var gr = g.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    gr.addColorStop(0, lighten(fill)); gr.addColorStop(1, fill);
    g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(1.5, r * 0.09); g.strokeStyle = dark; g.lineJoin = 'round'; g.stroke();
    // spoke holes
    g.fillStyle = 'rgba(0,0,0,.18)';
    var holes = teeth > 10 ? 5 : 4;
    for (i = 0; i < holes; i++) { var aa = i / holes * Math.PI * 2; g.beginPath(); g.arc(Math.cos(aa) * r * 0.5, Math.sin(aa) * r * 0.5, r * 0.13, 0, 7); g.fill(); }
    g.beginPath(); g.arc(0, 0, r * 0.24, 0, 7); g.fillStyle = '#fff3c4'; g.fill(); g.strokeStyle = dark; g.lineWidth = Math.max(1.2, r * 0.07); g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.09, 0, 7); g.fillStyle = dark; g.fill();
    g.restore();
  }
  function lighten(c) { return c === '#ffc83d' ? '#fff0a8' : c === '#ff8a3d' ? '#ffc79a' : c === '#e8484f' ? '#ff9a9a' : '#ffffff'; }
  var GEAR_LOOK = {
    gearS: { r: 0.44, teeth: 8, fill: '#ff8a3d', dark: '#8a3a00' },
    gearB: { r: 0.62, teeth: 13, fill: '#ffc83d', dark: '#8a5a00' }
  };
  function drawBall(g, cx, cy, r, rot, sq) {
    sq = sq || 0;
    g.save(); g.translate(cx, cy + r * sq * 0.5); g.scale(1 + sq * 0.35, 1 - sq * 0.35);
    var gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    gr.addColorStop(0, '#ff9a8a'); gr.addColorStop(0.55, '#f2333a'); gr.addColorStop(1, '#b3121c');
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = gr; g.fill();
    g.save(); g.clip(); g.rotate(rot);
    g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(-r, -r * 0.14, r * 2, r * 0.28);
    g.fillStyle = '#ffd21f'; g.beginPath(); g.arc(0, 0, r * 0.2, 0, 7); g.fill();
    g.restore();
    g.lineWidth = Math.max(1.5, r * 0.13); g.strokeStyle = '#6e0a10'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.42, r * 0.22, r * 0.14, -0.6, 0, 7); g.fill();
    g.restore();
  }
  function drawCrate(g, cx, cy, hs, tilt, sq, wheels, wrot) {
    sq = sq || 0;
    g.save(); g.translate(cx, cy + hs * sq * 0.5); g.rotate(tilt || 0); g.scale(1 + sq * 0.25, 1 - sq * 0.25);
    var w = hs * 2, top = -hs, left = -hs;
    if (wheels) { top -= hs * 0.12; }
    var gr = g.createLinearGradient(0, top, 0, top + w);
    gr.addColorStop(0, '#f5c27a'); gr.addColorStop(1, '#d48d3f');
    LE.rr(g, left, top, w, w * (wheels ? 0.84 : 1), hs * 0.18); g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(1.5, hs * 0.12); g.strokeStyle = OUT; g.stroke();
    var hh = w * (wheels ? 0.84 : 1);
    g.strokeStyle = '#a8692c'; g.lineWidth = Math.max(1.5, hs * 0.13); g.lineCap = 'round';
    g.beginPath(); g.moveTo(left + w * 0.2, top + hh * 0.2); g.lineTo(left + w * 0.8, top + hh * 0.8); g.moveTo(left + w * 0.8, top + hh * 0.2); g.lineTo(left + w * 0.2, top + hh * 0.8); g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = Math.max(1, hs * 0.08);
    g.beginPath(); g.moveTo(left + w * 0.16, top + hh * 0.1); g.lineTo(left + w * 0.84, top + hh * 0.1); g.stroke();
    if (wheels) {
      [-0.55, 0.55].forEach(function (k) { drawWheel(g, k * hs, top + hh + hs * 0.06, hs * 0.34, wrot || 0); });
    }
    g.restore();
  }
  function drawWheel(g, cx, cy, r, rot) {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = '#343a50'; g.fill(); g.lineWidth = Math.max(1.2, r * 0.2); g.strokeStyle = '#141826'; g.stroke();
    g.beginPath(); g.arc(0, 0, r * 0.5, 0, 7); g.fillStyle = '#ffc83d'; g.fill();
    g.strokeStyle = '#8a5a00'; g.lineWidth = Math.max(1, r * 0.14);
    g.beginPath(); g.moveTo(-r * 0.45, 0); g.lineTo(r * 0.45, 0); g.moveTo(0, -r * 0.45); g.lineTo(0, r * 0.45); g.stroke();
    g.restore();
  }
  function drawWedge(g, x, y, s, dir) {
    g.save(); g.translate(x + s / 2, y); g.scale(dir, 1);
    g.beginPath(); g.moveTo(-s * 0.4, s * 0.98); g.lineTo(-s * 0.4, s * 0.3); g.lineTo(s * 0.46, s * 0.86); g.lineTo(s * 0.46, s * 0.98); g.closePath();
    var gr = g.createLinearGradient(0, s * 0.3, 0, s);
    gr.addColorStop(0, '#eef2f8'); gr.addColorStop(1, '#8b97ab');
    g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = '#2e3646'; g.lineJoin = 'round'; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(1.2, s * 0.04);
    g.beginPath(); g.moveTo(-s * 0.32, s * 0.42); g.lineTo(s * 0.3, s * 0.82); g.stroke();
    g.restore();
  }
  function drawLog(g, x, y, s) {
    var gr = g.createLinearGradient(0, y + s * 0.15, 0, y + s);
    gr.addColorStop(0, '#a8683a'); gr.addColorStop(1, '#6e3e1c');
    LE.rr(g, x + s * 0.06, y + s * 0.14, s * 0.9, s * 0.86, s * 0.16); g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = 'rgba(40,20,5,.45)'; g.lineWidth = Math.max(1, s * 0.03);
    for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x + s * (0.45 + i * 0.16), y + s * 0.22); g.lineTo(x + s * (0.42 + i * 0.16), y + s * 0.92); g.stroke(); }
    // cut end with rings
    var ex = x + s * 0.3, ey = y + s * 0.57;
    g.beginPath(); g.ellipse(ex, ey, s * 0.22, s * 0.38, 0, 0, 7); g.fillStyle = '#f0c48a'; g.fill(); g.lineWidth = Math.max(1.5, s * 0.05); g.strokeStyle = OUT; g.stroke();
    g.strokeStyle = '#b97a3e'; g.lineWidth = Math.max(1, s * 0.03);
    g.beginPath(); g.ellipse(ex, ey, s * 0.13, s * 0.24, 0, 0, 7); g.stroke();
    g.beginPath(); g.ellipse(ex, ey, s * 0.05, s * 0.1, 0, 0, 7); g.stroke();
    g.fillStyle = '#5fbf4a'; g.beginPath(); g.ellipse(x + s * 0.72, y + s * 0.16, s * 0.1, s * 0.05, -0.4, 0, 7); g.fill();
  }
  function drawStar(g, cx, cy, r, fill, stroke) {
    g.beginPath();
    for (var i = 0; i < 10; i++) { var rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    g.closePath(); g.fillStyle = fill || '#ffe14d'; g.fill(); g.lineWidth = Math.max(1.5, r * 0.16); g.strokeStyle = stroke || '#b38f00'; g.lineJoin = 'round'; g.stroke();
  }
  function drawLever(g, cx, cy, s, angle) {
    // fulcrum
    var px = cx, py = cy + s * 0.58;
    g.beginPath(); g.moveTo(px, py - s * 0.02); g.lineTo(px + s * 0.34, cy + s); g.lineTo(px - s * 0.34, cy + s); g.closePath();
    var gr = g.createLinearGradient(0, py, 0, cy + s); gr.addColorStop(0, '#ff7a5a'); gr.addColorStop(1, '#d63a2a');
    g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke();
    g.save(); g.translate(px, py); g.rotate(angle);
    var L = s * 1.46;
    var pg = g.createLinearGradient(0, -s * 0.08, 0, s * 0.08); pg.addColorStop(0, '#f7c98a'); pg.addColorStop(1, '#c9853f');
    LE.rr(g, -L, -s * 0.11, L * 2, s * 0.15, s * 0.06); g.fillStyle = pg; g.fill(); g.lineWidth = Math.max(2, s * 0.05); g.strokeStyle = OUT; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-L + s * 0.08, -s * 0.09, L * 2 - s * 0.16, s * 0.03);
    g.restore();
    g.beginPath(); g.arc(px, py, s * 0.07, 0, 7); g.fillStyle = '#ffc83d'; g.fill(); g.strokeStyle = OUT; g.lineWidth = Math.max(1.5, s * 0.04); g.stroke();
  }
  function drawBucket(g, cx, top, s) {
    var w1 = s * 0.78, w2 = s * 0.58, hgt = s * 0.56, y0 = top + s * 0.4;
    g.strokeStyle = '#3b4458'; g.lineWidth = Math.max(1.5, s * 0.04);
    g.beginPath(); g.arc(cx, y0, w1 * 0.42, Math.PI, 0); g.stroke();
    g.beginPath(); g.moveTo(cx - w1 / 2, y0); g.lineTo(cx + w1 / 2, y0); g.lineTo(cx + w2 / 2, y0 + hgt); g.lineTo(cx - w2 / 2, y0 + hgt); g.closePath();
    var gr = g.createLinearGradient(cx - w1 / 2, 0, cx + w1 / 2, 0); gr.addColorStop(0, '#2f6fd6'); gr.addColorStop(0.4, '#6bb2ff'); gr.addColorStop(1, '#2459b3');
    g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = '#173a78'; g.lineJoin = 'round'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(cx - w1 / 2 + s * 0.06, y0 + s * 0.08, w1 - s * 0.12, s * 0.05);
  }
  function drawPulleyWheel(g, cx, cy, R, rot) {
    g.save(); g.translate(cx, cy); g.rotate(rot);
    g.beginPath(); g.arc(0, 0, R, 0, 7); g.fillStyle = '#cfd5df'; g.fill(); g.lineWidth = Math.max(2, R * 0.12); g.strokeStyle = '#3b4458'; g.stroke();
    g.beginPath(); g.arc(0, 0, R * 0.78, 0, 7); g.fillStyle = '#a7b0c0'; g.fill();
    g.strokeStyle = '#3b4458'; g.lineWidth = Math.max(1.5, R * 0.1);
    for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75); g.lineTo(-Math.cos(a) * R * 0.75, -Math.sin(a) * R * 0.75); g.stroke(); }
    g.beginPath(); g.arc(0, 0, R * 0.22, 0, 7); g.fillStyle = '#ffc83d'; g.fill(); g.strokeStyle = '#8a5a00'; g.lineWidth = Math.max(1.5, R * 0.08); g.stroke();
    g.restore();
  }
  function drawHook(g, cx, cy, s) {
    g.strokeStyle = '#3b4458'; g.lineWidth = Math.max(2.5, s * 0.08); g.lineCap = 'round';
    g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, cy - s * 0.1); g.stroke();
    g.beginPath(); g.arc(cx, cy, s * 0.1, -Math.PI / 2, Math.PI * 0.9); g.stroke();
  }

  /** Small part icon (tray / ghost). */
  function drawPartIcon(g, part, S, dir) {
    var s = S * 0.82, o = (S - s) / 2;
    if (part === 'ramp') drawRamp(g, o, o, s, dir || 1, true);
    else if (part === 'wedge') drawWedge(g, o, o, s, dir || 1);
    else if (part === 'gearS') drawGear(g, S / 2, S / 2, S * 0.34, 8, 0.2, GEAR_LOOK.gearS.fill, GEAR_LOOK.gearS.dark);
    else if (part === 'gearB') drawGear(g, S / 2, S / 2, S * 0.47, 13, 0.1, GEAR_LOOK.gearB.fill, GEAR_LOOK.gearB.dark);
    else if (part === 'lever') drawLever(g, S / 2, S * 0.18, S * 0.62 / 1.46 * 1.2, -0.18);
    else if (part === 'pulley') { drawPulleyWheel(g, S / 2, S / 2, S * 0.38, 0); }
    else if (part === 'wheels') { drawWheel(g, S * 0.3, S * 0.55, S * 0.2, 0); drawWheel(g, S * 0.7, S * 0.55, S * 0.2, 0); g.strokeStyle = '#3b4458'; g.lineWidth = Math.max(2, S * 0.06); g.beginPath(); g.moveTo(S * 0.3, S * 0.55); g.lineTo(S * 0.7, S * 0.55); g.stroke(); }
  }
  function iconCanvas(part, size, dir) {
    var c = document.createElement('canvas');
    var r = LE.fitCanvas(c, size, size);
    drawPartIcon(r.ctx, part, size, dir);
    return c;
  }

  /* ================= View ================= */
  function create(host, level, ctx) {
    var P = ML.parse(level);
    var W = P.W, H = P.H;
    var tray = level.tray || {};
    var trayParts = PART_ORDER.filter(function (p) { return tray[p]; });
    var placements = initialPlacements();
    var busy = false, destroyed = false, stopFlag = false;
    var anim = null;          // running simulation animation
    var after = null;         // final frame kept after a run (success)
    var fx = [];              // canvas particles {x,y,vx,vy,life,max,color,size,kind}
    var slotFx = {};          // slotId -> { pop: t0, flip: t0 }
    var itemFx = {};          // itemId -> { squash: t0 }
    var halves = [];          // split log halves
    var gearRot = {}, beltOff = 0, pulleyRot = 0, jamShake = 0;
    var lastT = performance.now(), t0 = lastT;

    function initialPlacements() {
      var saved = ctx.savedState && ctx.savedState.placements;
      if (Array.isArray(saved)) return ML.normalize(level, saved, P);
      return ML.normalize(level, level.start || [], P);
    }

    /* ----- DOM ----- */
    var root = h('div.mc-wrap');
    var boardWrap = h('div.mc-board-wrap');
    var canvas = h('canvas.mc-board');
    boardWrap.appendChild(canvas);
    var trayEl = h('div.mc-tray');
    var goBtn = LE.button('go-btn mc-go green', '<svg viewBox="0 0 24 24"><path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg><span>Go!</span>', function () { if (busy) stop(); else go(); }, { label: 'Go', sound: 'click' });
    var clearBtn = LE.button('icon mc-clear', '<svg viewBox="0 0 24 24"><path d="M5 7 h14 M10 4 h4 M7 7 l1 13 h8 l1 -13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>', function () {
      if (busy || (ctx.isDemo && ctx.isDemo())) return;
      clearAll(true);
    }, { label: 'Clear parts', sound: false });
    var controls = h('div.mc-controls', clearBtn, goBtn);
    root.append(boardWrap, h('div.mc-bottom', trayEl, controls));
    host.appendChild(root);

    var trayEls = {}, trayCounts = {};
    trayParts.forEach(function (p) {
      var cnt = h('div.mc-count');
      var el = h('div.mc-part.pressable', { 'data-part': p, role: 'button', 'aria-label': PART_NAMES[p] }, h('div.mc-part-ico', iconCanvas(p, 44)), cnt);
      el.addEventListener('pointerdown', function (e) { startDrag(e, { part: p }); });
      trayEls[p] = el; trayCounts[p] = cnt;
      trayEl.appendChild(el);
    });
    function used(part) { return placements.filter(function (x) { return x.part === part; }).length; }
    function avail(part) { return (tray[part] || 0) - used(part); }
    function renderTray() {
      trayParts.forEach(function (p) {
        var n = avail(p);
        trayCounts[p].textContent = '×' + n;
        trayEls[p].classList.toggle('empty', n <= 0);
      });
    }

    /* ----- Layout ----- */
    var B = { c: 40, ox: 0, oy: 0, w: 0, h: 0, g: null, bw: 0, bh: 0, bg: null };
    var PAD = 8;
    function layout() {
      var r = boardWrap.getBoundingClientRect();
      var Wd = Math.max(120, r.width), Hd = Math.max(120, r.height);
      var c = Math.floor(Math.min((Wd - PAD * 2) / W, (Hd - PAD * 2) / H, 64));
      B.c = c; B.w = c * W; B.h = c * H; B.ox = PAD; B.oy = PAD;
      B.bw = B.w + PAD * 2; B.bh = B.h + PAD * 2;
      var f = LE.fitCanvas(canvas, B.bw, B.bh);
      B.g = f.ctx; B.dpr = f.dpr;
      B.lastW = r.width; B.lastH = r.height;
      buildBackground();
    }
    function cellRect(x, y, w, hh) {
      var r = canvas.getBoundingClientRect();
      return { left: r.left + B.ox + x * B.c, top: r.top + B.oy + y * B.c, width: (w || 1) * B.c, height: (hh || 1) * B.c };
    }

    /* ----- Static background (cached) ----- */
    function isSolid(x, y) { return x >= 0 && y >= 0 && x < W && y < H && P.cells[y][x] === '#'; }
    function buildBackground() {
      var cv = document.createElement('canvas');
      cv.width = Math.round(B.bw * B.dpr); cv.height = Math.round(B.bh * B.dpr);
      var g = cv.getContext('2d'); g.setTransform(B.dpr, 0, 0, B.dpr, 0, 0);
      var s = B.c;
      // frame
      g.fillStyle = '#5a3218'; LE.rr(g, 0, 3, B.bw, B.bh - 3, 18); g.fill();
      g.fillStyle = '#7a4524'; LE.rr(g, 0, 0, B.bw, B.bh - 3, 18); g.fill();
      g.save(); LE.rr(g, B.ox, B.oy, B.w, B.h, 12); g.clip();
      // wall planks
      var pw = s * 0.9;
      for (var i = 0, px = B.ox; px < B.ox + B.w; i++, px += pw) {
        g.fillStyle = i % 2 ? '#f6dcab' : '#f1d29b'; g.fillRect(px, B.oy, pw, B.h);
        g.fillStyle = 'rgba(150,90,40,.18)'; g.fillRect(px, B.oy, 2, B.h);
        g.strokeStyle = 'rgba(170,110,50,.12)'; g.lineWidth = 1.5;
        for (var k = 0; k < 3; k++) { var gx = px + pw * (0.25 + k * 0.25); g.beginPath(); g.moveTo(gx, B.oy); g.bezierCurveTo(gx + 4, B.oy + B.h * 0.3, gx - 4, B.oy + B.h * 0.6, gx + 2, B.oy + B.h); g.stroke(); }
      }
      // pegboard dots
      g.fillStyle = 'rgba(120,70,30,.13)';
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) { g.beginPath(); g.arc(B.ox + x * s + s / 2, B.oy + y * s + s / 2, Math.max(1.5, s * 0.04), 0, 7); g.fill(); }
      // soft vignette
      var vg = g.createRadialGradient(B.ox + B.w / 2, B.oy + B.h / 2, B.h * 0.2, B.ox + B.w / 2, B.oy + B.h / 2, B.h * 0.8);
      vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(120,60,20,.18)');
      g.fillStyle = vg; g.fillRect(B.ox, B.oy, B.w, B.h);
      // solid blocks
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        if (!isSolid(x, y)) continue;
        var bx = B.ox + x * s, by = B.oy + y * s;
        var gr = g.createLinearGradient(0, by, 0, by + s); gr.addColorStop(0, '#c98446'); gr.addColorStop(1, '#a8632b');
        g.fillStyle = gr; g.fillRect(bx, by, s, s);
        g.strokeStyle = 'rgba(90,45,15,.35)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(bx, by + s * 0.5); g.lineTo(bx + s, by + s * 0.5); g.stroke();
        var off = (y % 2) ? 0.3 : 0.7;
        g.beginPath(); g.moveTo(bx + s * off, by); g.lineTo(bx + s * off, by + s * 0.5); g.moveTo(bx + s * (1 - off), by + s * 0.5); g.lineTo(bx + s * (1 - off), by + s); g.stroke();
        if (!isSolid(x, y - 1)) {
          g.fillStyle = '#e9a862'; g.fillRect(bx, by, s, s * 0.14);
          g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bx, by, s, s * 0.04);
        }
      }
      // outlines on exposed edges
      g.strokeStyle = OUT; g.lineWidth = Math.max(2, s * 0.06); g.lineCap = 'round';
      for (y = 0; y < H; y++) for (x = 0; x < W; x++) {
        if (!isSolid(x, y)) continue;
        bx = B.ox + x * s; by = B.oy + y * s;
        g.beginPath();
        if (!isSolid(x, y - 1)) { g.moveTo(bx, by); g.lineTo(bx + s, by); }
        if (!isSolid(x - 1, y) && x > 0) { g.moveTo(bx, by); g.lineTo(bx, by + s); }
        if (!isSolid(x + 1, y) && x < W - 1) { g.moveTo(bx + s, by); g.lineTo(bx + s, by + s); }
        if (!isSolid(x, y + 1) && y < H - 1) { g.moveTo(bx, by + s); g.lineTo(bx + s, by + s); }
        g.stroke();
      }
      // pits: dark hole where the bottom row is open
      for (x = 0; x < W; x++) if (P.cells[H - 1][x] === '.') {
        var hg = g.createLinearGradient(0, B.oy + (H - 1) * s, 0, B.oy + H * s);
        hg.addColorStop(0, 'rgba(60,30,10,0)'); hg.addColorStop(1, 'rgba(60,30,10,.55)');
        g.fillStyle = hg; g.fillRect(B.ox + x * s, B.oy + (H - 1) * s, s, s);
      }
      // fixed ramps
      for (var kk in P.ramps) { var a = kk.split(',').map(Number); drawRamp(g, B.ox + a[0] * s, B.oy + a[1] * s, s, P.ramps[kk], false); }
      // chutes above items that start in the air
      P.items.forEach(function (it) {
        if (it.y > 1) return;
        var below = it.y + 1 < H && (P.cells[it.y + 1][it.x] !== '.' || P.ramps[ML.key(it.x, it.y)] !== undefined);
        if (below || P.ramps[ML.key(it.x, it.y)] !== undefined) return;
        var cx = B.ox + it.x * s + s / 2, bot = B.oy + it.y * s + s * 0.34;
        var pg = g.createLinearGradient(cx - s * 0.42, 0, cx + s * 0.42, 0);
        pg.addColorStop(0, '#2f9a45'); pg.addColorStop(0.4, '#7fe07a'); pg.addColorStop(1, '#23803a');
        g.fillStyle = pg; g.fillRect(cx - s * 0.38, B.oy - 2, s * 0.76, bot - B.oy + 2);
        g.strokeStyle = '#145a25'; g.lineWidth = Math.max(2, s * 0.05); g.strokeRect(cx - s * 0.38, B.oy - 2, s * 0.76, bot - B.oy + 2);
        LE.rr(g, cx - s * 0.46, bot - s * 0.16, s * 0.92, s * 0.18, s * 0.05); g.fillStyle = pg; g.fill(); g.stroke();
      });
      g.restore();
      B.bg = cv;
    }

    /* ----- Scene state (build mode vs running frames) ----- */
    function byslot() { var m = {}; placements.forEach(function (p) { m[p.slot] = p; }); return m; }
    function buildFrame() {
      var sim = ML.simulate(level, placements, {});
      return sim.frames[0];
    }
    var buildCache = null;
    function invalidate() { buildCache = null; }
    function currentGears() {
      if (anim) return anim.res.gears;
      if (!buildCache) buildCache = { frame: buildFrame(), gears: ML.gearState(level, placements) };
      return buildCache.gears;
    }
    function frameNow() {
      if (anim) return null;
      if (after) return after;
      if (!buildCache) buildCache = { frame: buildFrame(), gears: ML.gearState(level, placements) };
      return buildCache.frame;
    }

    function rampDirAt(x, y, ps) {
      var k = ML.key(x, y);
      if (P.ramps[k] !== undefined) return P.ramps[k];
      var p = ps[k]; return p && p.part === 'ramp' ? p.dir : undefined;
    }
    function leverAt(x, y, ps, frame) {
      var levers = placements.filter(function (p) { return p.part === 'lever'; });
      for (var i = 0; i < levers.length; i++) {
        var s = P.slotById[levers[i].slot];
        if (s.y === y && Math.abs(s.x - x) === 1) return { cx: s.x, side: x - s.x, tilt: frame.levers[i] || 0 };
      }
      return null;
    }
    /** Item centre in cell units for one frame. */
    function itemPos(it, frame, ps) {
      var r = it.kind === 'ball' ? BALL_R : BOX_H;
      var cx = it.x + 0.5, cy = it.y + 1 - r, tilt = 0;
      var rd = rampDirAt(it.x, it.y, ps);
      if (rd !== undefined && !it.done) { cy = it.y + 0.56 - r * 1.32; tilt = rd * 0.72; }
      var L = leverAt(it.x, it.y, ps, frame);
      if (L) {
        var ang = L.tilt * 0.17;
        cy = it.y + 0.58 - 0.11 + L.side * Math.sin(ang) * 1.0 - r; tilt = ang;
      }
      if (level.pulley && ps.hook) {
        var lp = level.pulley;
        if (it.x === lp.bucket[0] && it.y === frame.bucketY) cy = it.y + 0.93 - r;
        if (it.x === lp.plat[0] && it.y === frame.platY) cy = it.y + 0.9 - r;
      } else if (level.pulley) {
        if (it.x === level.pulley.bucket[0] && it.y === frame.bucketY) cy = it.y + 0.93 - r;
        if (it.x === level.pulley.plat[0] && it.y === frame.platY) cy = it.y + 0.9 - r;
      }
      if (it.done) cy = it.y + 1 - r - 0.04;
      return { x: cx, y: cy, tilt: tilt };
    }

    /* ----- Drawing ----- */
    function draw(now) {
      var g = B.g; if (!g) return;
      var dt = Math.min(0.05, (now - lastT) / 1000) * LE.speed; lastT = now;
      var t = (now - t0) / 1000;
      var s = B.c;
      g.clearRect(0, 0, B.bw, B.bh);
      if (B.bg) g.drawImage(B.bg, 0, 0, B.bw, B.bh);
      g.save(); LE.rr(g, B.ox, B.oy, B.w, B.h, 12); g.clip();
      g.translate(B.ox, B.oy);
      var ps = byslot();

      // which frames to draw
      var fa, fb, k;
      if (anim) { fa = anim.res.frames[anim.i]; fb = anim.res.frames[Math.min(anim.i + 1, anim.res.frames.length - 1)]; k = anim.k; }
      else { fa = fb = frameNow(); k = 0; }
      var gs = currentGears();
      var running = !!anim || (after && after.running);

      // gears motion
      var jamShow = gs.jam && (!!anim || !!after);
      if (running && gs.gears.length) gs.gears.forEach(function (nd) { gearRot[nd.id] = (gearRot[nd.id] || 0) + nd.dir * nd.speed * dt * 2.4; });
      if (jamShow) jamShake += dt;
      var belt = gs.belt;
      if (running && belt && belt.running) beltOff += belt.dir * belt.speed * dt * 1.2;

      // ---- belts
      drawBelts(g, s, belt, running);
      // ---- chain from belt axle to roller
      (level.pegs || []).forEach(function (p) {
        if (!p.belt) return;
        var roll = beltRollerNear(p);
        if (!roll) return;
        var ax = (p.x + 0.5) * s, ay = (p.y + 0.5) * s;
        g.strokeStyle = '#3b3f52'; g.lineWidth = Math.max(3, s * 0.08); g.lineCap = 'round';
        g.beginPath(); g.moveTo(ax - s * 0.12, ay); g.lineTo(roll.x - s * 0.12, roll.y); g.moveTo(ax + s * 0.12, ay); g.lineTo(roll.x + s * 0.12, roll.y); g.stroke();
        g.fillStyle = '#9aa3b5';
        var len = Math.hypot(roll.x - ax, roll.y - ay), n = Math.max(2, Math.floor(len / (s * 0.25)));
        for (var i = 0; i < n; i++) {
          var u = ((i / n) + (running && belt && belt.running ? beltOff * 0.5 : 0)) % 1; if (u < 0) u += 1;
          g.beginPath(); g.arc(ax + s * 0.12 + (roll.x - ax) * u, ay + (roll.y - ay) * u, Math.max(1.5, s * 0.035), 0, 7); g.fill();
          g.beginPath(); g.arc(ax - s * 0.12 + (roll.x - ax) * (1 - u), ay + (roll.y - ay) * (1 - u), Math.max(1.5, s * 0.035), 0, 7); g.fill();
        }
      });
      // ---- motor + gears + pegs
      if (level.motor) {
        var mx = (level.motor.x + 0.5) * s, my = (level.motor.y + 0.5) * s;
        var mg = g.createLinearGradient(0, my - s * 0.4, 0, my + s * 0.4); mg.addColorStop(0, '#ff7a7a'); mg.addColorStop(1, '#c62f3a');
        LE.rr(g, mx - s * 0.42, my - s * 0.34, s * 0.84, s * 0.68, s * 0.14); g.fillStyle = mg; g.fill();
        g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = '#6e1018'; g.stroke();
      }
      var shake = jamShow ? Math.sin(jamShake * 50) * 0.04 * Math.max(0, 1 - jamShake * 0.5) : 0;
      (level.pegs || []).forEach(function (p) {
        var cx = (p.x + 0.5) * s, cy = (p.y + 0.5) * s;
        if (!p.fixed && !ps[p.id]) {
          g.beginPath(); g.arc(cx, cy, s * 0.11, 0, 7); g.fillStyle = '#ffc83d'; g.fill(); g.lineWidth = Math.max(1.5, s * 0.04); g.strokeStyle = '#8a5a00'; g.stroke();
        }
      });
      gs.gears.forEach(function (nd) {
        var look = GEAR_LOOK[nd.size];
        var cx = (nd.x + 0.5) * s, cy = (nd.y + 0.5) * s;
        var sc = slotScale(nd.id, t);
        var phase = nd.id === 'motor' ? 0 : (Math.PI / look.teeth);
        var fill = nd.motor ? '#e8484f' : look.fill, dark = nd.motor ? '#6e1018' : look.dark;
        drawGear(g, cx + shake * s, cy, look.r * s * sc, look.teeth, (gearRot[nd.id] || 0) + phase, fill, dark);
        if (nd.motor) {
          g.fillStyle = '#fff'; g.font = '900 ' + Math.round(s * 0.28) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('⚡', cx, cy + 1);
        }
        if (jamShow && nd.connected) {
          g.fillStyle = 'rgba(255,40,40,' + (0.25 + 0.2 * Math.sin(t * 12)) + ')';
          g.beginPath(); g.arc(cx, cy, look.r * s, 0, 7); g.fill();
        }
      });
      if (jamShow) {
        var jm = gs.gears.filter(function (n) { return n.connected; });
        if (jm.length) {
          var jx = 0, jy = 0; jm.forEach(function (n) { jx += n.x; jy += n.y; });
          jx = (jx / jm.length + 0.5) * s; jy = (jy / jm.length + 0.5) * s;
          g.font = '900 ' + Math.round(s * 0.7) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.lineWidth = 5; g.strokeStyle = '#fff'; g.strokeText('!', jx, jy); g.fillStyle = '#ff2d2d'; g.fillText('!', jx, jy);
        }
      }

      // ---- pulley
      var bucketY = lerp(fa.bucketY, fb.bucketY, k), platY = lerp(fa.platY, fb.platY, k);
      if (level.pulley) drawPulley(g, s, ps, bucketY, platY, running, k, fa, fb, t);

      // ---- logs, wedges, placed ramps, levers
      fb.logs.forEach(function (lk) { var a = lk.split(',').map(Number); drawLog(g, a[0] * s, a[1] * s, s); });
      placements.forEach(function (p) {
        var sl = P.slotById[p.slot];
        if (p.part === 'ramp') drawPlaced(g, sl, s, t, function (x, y) { drawRamp(g, x, y, s, p.dir, true); });
        else if (p.part === 'wedge') {
          if (fb.wedges.indexOf(ML.key(sl.x, sl.y)) < 0) return;
          drawPlaced(g, sl, s, t, function (x, y) { drawWedge(g, x, y, s, p.dir); });
        }
      });
      var li = 0;
      placements.forEach(function (p) {
        if (p.part !== 'lever') return;
        var sl = P.slotById[p.slot];
        var tilt = lerp(fa.levers[li] || 0, fb.levers[li] || 0, k); li++;
        var sc = slotScale(p.slot, t);
        g.save(); g.translate((sl.x + 0.5) * s, (sl.y + 0.6) * s); g.scale(sc, sc); g.translate(-(sl.x + 0.5) * s, -(sl.y + 0.6) * s);
        drawLever(g, (sl.x + 0.5) * s, sl.y * s, s, tilt * 0.17);
        g.restore();
      });

      // ---- goal (back)
      if (P.goal) drawGoal(g, s, t, false);

      // ---- items
      var aItems = fa.items, bItems = fb.items;
      aItems.forEach(function (ia, idx) {
        var ib = bItems[idx];
        if (ia.lost && ib.lost) return;
        var pa = itemPos(ia, fa, ps), pb = itemPos(ib, fb, ps);
        var kk = k;
        if (ib.y > ia.y && ib.x === ia.x && !ia.rise) kk = k * (0.6 + 0.4 * k);
        var x = lerp(pa.x, pb.x, k), y = lerp(pa.y, pb.y, kk), tilt = lerp(pa.tilt, pb.tilt, k);
        var alpha = ib.lost ? 1 - k : 1;
        var sq = 0, f = itemFx[ia.id];
        if (f && f.squash) { var q = (now - f.squash) / (260 / LE.speed); if (q < 1) sq = Math.sin(q * Math.PI) * (1 - q) * 1.2; }
        g.save(); g.globalAlpha = alpha;
        // shadow
        var gy = groundBelow(Math.round(x - 0.5), Math.floor(y));
        if (gy !== null) {
          var dist = Math.max(0, gy - (y + 0.3)), sh = Math.max(0.25, 1 - dist * 0.18);
          g.fillStyle = 'rgba(80,40,10,' + (0.2 * sh) + ')';
          g.beginPath(); g.ellipse(x * s, gy * s - s * 0.02, s * 0.27 * sh, s * 0.05 * sh, 0, 0, 7); g.fill();
        }
        var kind = ib.kind;
        if (kind === 'ball') drawBall(g, x * s, y * s, BALL_R * s, x / BALL_R, sq);
        else drawCrate(g, x * s, y * s, BOX_H * s, kind === 'cart' ? tilt : 0, sq, kind === 'cart', x / 0.12);
        g.restore();
      });

      // ---- goal (front rim)
      if (P.goal) drawGoal(g, s, t, true);

      // ---- slot hints
      drawSlots(g, s, t, ps);

      // ---- split halves + particles
      updateFx(g, s, dt);
      g.restore();
    }
    function groundBelow(cx, cy) {
      if (cx < 0 || cx >= W) return null;
      for (var y = Math.max(0, cy); y < H; y++) {
        if (P.ramps[ML.key(cx, y)] !== undefined || byslot()[ML.key(cx, y)]) return null;
        if (y + 1 >= H) return null;
        if (P.cells[y + 1][cx] !== '.') return y + 1;
      }
      return null;
    }
    function lerp(a, b, k) { return a === null || a === undefined ? a : a + (b - a) * k; }
    function slotScale(id, t) {
      var f = slotFx[id];
      if (!f || !f.pop) return 1;
      var q = (performance.now() - f.pop) / (380 / LE.speed);
      if (q >= 1) return 1;
      return 1 + Math.sin(q * Math.PI) * 0.22 * (1 - q * 0.5);
    }
    function drawPlaced(g, sl, s, t, fn) {
      var sc = slotScale(sl.id, t), f = slotFx[sl.id], fl = 1;
      if (f && f.flip) { var q = (performance.now() - f.flip) / (260 / LE.speed); if (q < 1) fl = Math.abs(Math.cos(q * Math.PI)) * 0.9 + 0.1; }
      var cx = (sl.x + 0.5) * s, cy = (sl.y + 0.5) * s;
      g.save(); g.translate(cx, cy); g.scale(sc * fl, sc); g.translate(-cx, -cy);
      fn(sl.x * s, sl.y * s);
      g.restore();
    }
    function beltRuns() {
      var runs = [];
      for (var y = 0; y < H; y++) {
        var start = -1;
        for (var x = 0; x <= W; x++) {
          var b = x < W && P.cells[y][x] === '=';
          if (b && start < 0) start = x;
          if (!b && start >= 0) { runs.push({ y: y, x0: start, x1: x - 1 }); start = -1; }
        }
      }
      return runs;
    }
    var RUNS = beltRuns();
    function beltRollerNear(p) {
      var best = null, bd = 1e9;
      RUNS.forEach(function (r) {
        [r.x0, r.x1].forEach(function (x) {
          var d = Math.abs(x - p.x) + Math.abs(r.y - p.y) * 0.1;
          if (d < bd) { bd = d; best = { x: (x + 0.5) * B.c, y: (r.y + 0.45) * B.c }; }
        });
      });
      return best;
    }
    function drawBelts(g, s, belt, running) {
      RUNS.forEach(function (r) {
        var x0 = r.x0 * s, x1 = (r.x1 + 1) * s, y = r.y * s;
        // frame
        g.fillStyle = '#5c6378'; LE.rr(g, x0 + s * 0.06, y + s * 0.62, x1 - x0 - s * 0.12, s * 0.38, s * 0.08); g.fill();
        g.strokeStyle = '#2b2f3d'; g.lineWidth = Math.max(2, s * 0.05); g.stroke();
        // belt band
        var by = y + s * 0.08, bh = s * 0.6;
        LE.rr(g, x0 + s * 0.04, by, x1 - x0 - s * 0.08, bh, bh / 2); g.fillStyle = '#2f3342'; g.fill(); g.stroke();
        g.save(); LE.rr(g, x0 + s * 0.04, by, x1 - x0 - s * 0.08, bh, bh / 2); g.clip();
        var step = s * 0.36, off = ((beltOff * s) % step + step) % step;
        g.fillStyle = belt && belt.running && running ? '#ffcf3d' : '#6b7186';
        for (var xx = x0 - step + off; xx < x1 + step; xx += step) {
          g.beginPath(); g.moveTo(xx, by); g.lineTo(xx + s * 0.12, by); g.lineTo(xx + s * 0.02, by + s * 0.12); g.lineTo(xx - s * 0.1, by + s * 0.12); g.closePath(); g.fill();
        }
        g.restore();
        // rollers
        var rr = s * 0.22, ry = by + bh / 2;
        for (var x = r.x0; x <= r.x1; x++) {
          var cx = (x + 0.5) * s;
          g.save(); g.translate(cx, ry); g.rotate(beltOff * 4);
          g.beginPath(); g.arc(0, 0, rr, 0, 7); g.fillStyle = '#c9ced8'; g.fill(); g.lineWidth = Math.max(1.5, s * 0.04); g.strokeStyle = '#3b4458'; g.stroke();
          g.strokeStyle = '#3b4458'; g.beginPath(); g.moveTo(-rr * 0.7, 0); g.lineTo(rr * 0.7, 0); g.stroke();
          g.restore();
        }
        // direction arrow when running
        if (belt && belt.running && running) {
          g.fillStyle = 'rgba(255,255,255,.85)';
          var mx = (x0 + x1) / 2;
          g.save(); g.translate(mx, y + s * 0.82); g.scale(belt.dir, 1);
          g.beginPath(); g.moveTo(-s * 0.18, -s * 0.09); g.lineTo(s * 0.12, 0); g.lineTo(-s * 0.18, s * 0.09); g.closePath(); g.fill();
          if (belt.speed > 1) { g.beginPath(); g.moveTo(-s * 0.4, -s * 0.09); g.lineTo(-s * 0.1, 0); g.lineTo(-s * 0.4, s * 0.09); g.closePath(); g.fill(); }
          g.restore();
        }
      });
    }
    function drawPulley(g, s, ps, bucketY, platY, running, k, fa, fb, t) {
      var lp = level.pulley;
      var hx = (lp.hook[0] + 0.5) * s, hy = (lp.hook[1] + 0.5) * s;
      var R = Math.abs(lp.plat[0] - lp.bucket[0]) / 2 * s;
      var wheel = !!ps.hook;
      // ceiling bar
      g.fillStyle = '#7a4524'; LE.rr(g, hx - s * 0.6, -s * 0.2, s * 1.2, s * 0.32, s * 0.08); g.fill();
      drawHook(g, hx, hy - (wheel ? 0 : 0), s);
      var bx = (lp.bucket[0] + 0.5) * s, px = (lp.plat[0] + 0.5) * s;
      var bTop = bucketY * s, pTop = platY * s;
      // platform
      var pw = s * 0.92, pyb = pTop + s * 0.9;
      if (wheel) rope(g, s, function () { g.moveTo(px - pw * 0.42, pyb); g.lineTo(px, pTop + s * 0.02); g.lineTo(px + pw * 0.42, pyb); }, 0.7);
      var pg = g.createLinearGradient(0, pyb, 0, pyb + s * 0.1); pg.addColorStop(0, '#f2c27e'); pg.addColorStop(1, '#c47f3a');
      LE.rr(g, px - pw / 2, pyb, pw, s * 0.1, s * 0.04); g.fillStyle = pg; g.fill(); g.lineWidth = Math.max(1.5, s * 0.04); g.strokeStyle = OUT; g.stroke();
      if (wheel) {
        if (running && fa.bucketY !== fb.bucketY) pulleyRot += 0.15 * LE.speed * (px > bx ? -1 : 1);
        var sc = slotScale('hook', t);
        g.save(); g.translate(hx, hy); g.scale(sc, sc); g.translate(-hx, -hy);
        drawPulleyWheel(g, hx, hy, R * 0.92, pulleyRot);
        g.restore();
        var sideB = bx < px ? -1 : 1;
        rope(g, s, function () {
          g.moveTo(hx + sideB * R, hy); g.lineTo(bx, bTop + s * 0.28);
          g.moveTo(hx - sideB * R, hy); g.lineTo(px, pTop + s * 0.02);
          g.moveTo(hx - R, hy); g.arc(hx, hy, R, Math.PI, 0);
        });
            } else {
        // slack rope lying on the floor
        rope(g, s, function () { g.moveTo(bx, bTop + s * 0.5); g.bezierCurveTo(bx + (px - bx) * 0.3, bTop + s * 1.05, px - (px - bx) * 0.3, pTop + s * 1.05, px, pTop + s * 0.9); });
      }
      drawBucket(g, bx, bTop, s);
    }
    function rope(g, s, path, thin) {
      thin = thin || 1;
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); path(); g.strokeStyle = '#6b4220'; g.lineWidth = Math.max(3, s * 0.09 * thin); g.stroke();
      g.beginPath(); path(); g.strokeStyle = '#e8c48a'; g.lineWidth = Math.max(1.5, s * 0.045 * thin); g.stroke();
    }
    function drawGoal(g, s, t, front) {
      var gx = P.goal.x * s, gy = P.goal.y * s, cx = gx + s / 2;
      if (level.goalKind === 'box') {
        if (front) return;
        // glowing target frame + star flag
        var pulse = 0.5 + 0.5 * Math.sin(t * 4);
        g.save();
        g.setLineDash([s * 0.12, s * 0.1]); g.lineWidth = Math.max(2.5, s * 0.07);
        g.strokeStyle = 'rgba(255,200,40,' + (0.6 + 0.4 * pulse) + ')';
        LE.rr(g, gx + s * 0.08, gy + s * 0.08, s * 0.84, s * 0.88, s * 0.14); g.stroke();
        g.restore();
        g.fillStyle = 'rgba(255,225,77,' + (0.15 + 0.15 * pulse) + ')'; LE.rr(g, gx + s * 0.08, gy + s * 0.08, s * 0.84, s * 0.88, s * 0.14); g.fill();
        drawStar(g, cx, gy + s * 0.42 + Math.sin(t * 3) * s * 0.04, s * 0.24);
        return;
      }
      var top = gy + s * 0.5, bot = gy + s * 0.98;
      if (!front) {
        var pulse2 = 0.5 + 0.5 * Math.sin(t * 4);
        var rg = g.createRadialGradient(cx, top, 2, cx, top, s * 0.8);
        rg.addColorStop(0, 'rgba(255,240,140,' + (0.5 + 0.3 * pulse2) + ')'); rg.addColorStop(1, 'rgba(255,240,140,0)');
        g.fillStyle = rg; g.fillRect(gx - s * 0.3, gy - s * 0.3, s * 1.6, s * 1.4);
        drawStar(g, cx, gy + s * 0.18 + Math.sin(t * 3) * s * 0.05, s * 0.17);
        g.beginPath(); g.ellipse(cx, top, s * 0.44, s * 0.1, 0, 0, 7); g.fillStyle = '#8a5a12'; g.fill();
        return;
      }
      g.beginPath(); g.moveTo(cx - s * 0.46, top); g.lineTo(cx + s * 0.46, top); g.lineTo(cx + s * 0.34, bot); g.lineTo(cx - s * 0.34, bot); g.closePath();
      var bg = g.createLinearGradient(0, top, 0, bot); bg.addColorStop(0, '#ffd35c'); bg.addColorStop(1, '#e09a1c');
      g.fillStyle = bg; g.fill(); g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke();
      g.strokeStyle = '#b8780c'; g.lineWidth = Math.max(1.5, s * 0.04);
      g.beginPath(); g.moveTo(cx - s * 0.4, top + s * 0.16); g.lineTo(cx + s * 0.4, top + s * 0.16); g.moveTo(cx - s * 0.37, top + s * 0.32); g.lineTo(cx + s * 0.37, top + s * 0.32); g.stroke();
      g.beginPath(); g.ellipse(cx, top, s * 0.46, s * 0.07, 0, 0, Math.PI); g.lineWidth = Math.max(2, s * 0.06); g.strokeStyle = '#ffe9a0'; g.stroke();
    }
    function slotCenter(sl) {
      if (sl.kind === 'peg' || sl.kind === 'hook') return { x: sl.x + 0.5, y: sl.y + 0.5 };
      return { x: sl.x + 0.5, y: sl.y + 0.5 };
    }
    function drawSlots(g, s, t, ps) {
      if (busy || after) return;
      var dragPart = drag && drag.moved ? drag.part : null;
      P.slots.forEach(function (sl) {
        if (ps[sl.id]) {
          // rotation hint on placed rotatable parts
          var pp = ps[sl.id];
          if (ML.ROTATABLE[pp.part] && !dragPart) {
            var ax = (sl.x + 0.86) * s, ay = (sl.y + 0.14) * s;
            g.beginPath(); g.arc(ax, ay, s * 0.15, 0, 7); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#c75f00'; g.stroke();
            g.strokeStyle = '#ff7a00'; g.lineWidth = Math.max(1.5, s * 0.04);
            g.beginPath(); g.arc(ax, ay, s * 0.075, -2.6, 1.6); g.stroke();
          }
          return;
        }
        var compatible = dragPart ? ML.PART_SLOT[dragPart] === sl.kind : anyPartFor(sl.kind);
        if (!compatible) return;
        var pulse = 0.5 + 0.5 * Math.sin(t * 4 + sl.x);
        var hot = drag && drag.target === sl.id;
        var c = slotCenter(sl), cx = c.x * s, cy = c.y * s;
        g.save();
        g.setLineDash([s * 0.1, s * 0.08]);
        g.lineWidth = Math.max(2, s * (hot ? 0.08 : 0.05));
        var col = dragPart ? (hot ? 'rgba(255,214,0,1)' : 'rgba(255,214,0,' + (0.6 + 0.4 * pulse) + ')') : 'rgba(255,255,255,' + (0.55 + 0.35 * pulse) + ')';
        g.strokeStyle = col;
        g.fillStyle = dragPart ? (hot ? 'rgba(255,230,80,.45)' : 'rgba(255,230,80,.18)') : 'rgba(255,255,255,' + (0.12 + 0.1 * pulse) + ')';
        if (sl.kind === 'cell') { LE.rr(g, sl.x * s + s * 0.08, sl.y * s + s * 0.08, s * 0.84, s * 0.84, s * 0.16); g.fill(); g.stroke(); }
        else if (sl.kind === 'lever') { LE.rr(g, (sl.x - 1) * s + s * 0.06, sl.y * s + s * 0.3, s * 2.88, s * 0.66, s * 0.16); g.fill(); g.stroke(); }
        else if (sl.kind === 'peg') { g.beginPath(); g.arc(cx, cy, s * 0.42, 0, 7); g.fill(); g.stroke(); }
        else if (sl.kind === 'hook') { var R = Math.abs(level.pulley.plat[0] - level.pulley.bucket[0]) / 2 * s * 0.92; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill(); g.stroke(); }
        else if (sl.kind === 'wheels') { [-0.2, 0.2].forEach(function (d) { g.beginPath(); g.arc(cx + d * s, sl.y * s + s * 0.92, s * 0.13, 0, 7); g.fill(); g.stroke(); }); }
        g.restore();
        if (sl.kind === 'cell' || sl.kind === 'lever') {
          g.fillStyle = dragPart ? 'rgba(200,140,0,.8)' : 'rgba(255,255,255,.85)';
          g.font = '900 ' + Math.round(s * 0.4) + 'px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillText('+', cx, sl.kind === 'lever' ? cy + s * 0.14 : cy);
        }
      });
    }
    function anyPartFor(kind) { return trayParts.some(function (p) { return ML.PART_SLOT[p] === kind && avail(p) > 0; }); }

    /* ----- Particles ----- */
    function puff(x, y, n, color, kind, spread) {
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = (spread || 1.5) * (0.4 + Math.random());
        fx.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'chip' ? 2.5 : 0.6), life: 0, max: 0.5 + Math.random() * 0.4,
          color: color, size: kind === 'chip' ? 0.07 + Math.random() * 0.06 : 0.1 + Math.random() * 0.08, kind: kind, rot: Math.random() * 6 });
      }
    }
    function updateFx(g, s, dt) {
      for (var i = fx.length - 1; i >= 0; i--) {
        var p = fx[i];
        p.life += dt;
        if (p.life > p.max) { fx.splice(i, 1); continue; }
        p.vy += (p.kind === 'chip' ? 9 : -0.5) * dt;
        p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 8;
        var a = 1 - p.life / p.max;
        g.save(); g.globalAlpha = a; g.translate(p.x * s, p.y * s); g.rotate(p.rot);
        g.fillStyle = p.color;
        if (p.kind === 'chip') g.fillRect(-p.size * s, -p.size * s * 0.4, p.size * s * 2, p.size * s * 0.8);
        else { g.beginPath(); g.arc(0, 0, p.size * s * (1.6 - a * 0.6), 0, 7); g.fill(); }
        g.restore();
      }
      for (i = halves.length - 1; i >= 0; i--) {
        var hf = halves[i];
        hf.life += dt;
        if (hf.life > 1.2) { halves.splice(i, 1); continue; }
        hf.vy += 12 * dt; hf.x += hf.vx * dt; hf.y += hf.vy * dt; hf.rot += hf.vr * dt;
        g.save(); g.globalAlpha = Math.min(1, (1.2 - hf.life) * 3);
        g.translate(hf.x * s, hf.y * s); g.rotate(hf.rot);
        LE.rr(g, -s * 0.22, -s * 0.38, s * 0.44, s * 0.76, s * 0.12);
        g.fillStyle = '#8f5530'; g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
        g.fillStyle = '#f0c48a'; g.fillRect(hf.side > 0 ? -s * 0.22 : s * 0.1, -s * 0.34, s * 0.12, s * 0.68);
        g.restore();
      }
    }

    /* ----- Frame loop ----- */
    var raf = 0;
    function loop(now) {
      if (destroyed) return;
      var r = boardWrap.getBoundingClientRect();
      if (!B.g || Math.abs(r.width - B.lastW) > 1 || Math.abs(r.height - B.lastH) > 1) layout();
      if (anim) stepAnim(now);
      draw(now);
      raf = requestAnimationFrame(loop);
    }

    /* ----- Placement actions (shared by UI + Show me) ----- */
    function changed() {
      invalidate(); renderTray();
      ctx.saveState && ctx.saveState({ placements: ML.clonePl(placements) });
    }
    function slotPuff(id) {
      var sl = P.slotById[id]; if (!sl) return;
      var c = slotCenter(sl);
      puff(c.x, c.y + 0.3, 8, 'rgba(255,255,255,.9)', 'dust', 1.6);
    }
    function placeAt(part, slotId, dir) {
      var sl = P.slotById[slotId];
      if (!sl || ML.PART_SLOT[part] !== sl.kind) return false;
      var existing = placements.filter(function (p) { return p.slot === slotId; })[0];
      if (existing) placements = placements.filter(function (p) { return p !== existing; });
      if (avail(part) <= 0) { if (existing) placements.push(existing); ctx.sfx('buzz'); return false; }
      var np = { slot: slotId, part: part };
      if (ML.ROTATABLE[part]) np.dir = dir === -1 ? -1 : 1;
      placements.push(np);
      slotFx[slotId] = { pop: performance.now() };
      changed();
      ctx.sfx(part === 'gearS' || part === 'gearB' ? 'clank' : 'place');
      slotPuff(slotId);
      LE.bounce(trayEls[part], 1.08);
      ctx.emit('place', { part: part, slot: slotId });
      ctx.emit('place:' + slotId, { part: part });
      return true;
    }
    function removeAt(slotId, silent) {
      var p = placements.filter(function (x) { return x.slot === slotId; })[0];
      if (!p) return null;
      placements = placements.filter(function (x) { return x !== p; });
      changed();
      if (!silent) { ctx.sfx('remove'); slotPuff(slotId); }
      ctx.emit('remove', { part: p.part, slot: slotId });
      return p;
    }
    function rotateAt(slotId) {
      var p = placements.filter(function (x) { return x.slot === slotId; })[0];
      if (!p) return false;
      if (!ML.ROTATABLE[p.part]) { slotFx[slotId] = { pop: performance.now() }; ctx.sfx('pop'); return false; }
      p.dir = -p.dir;
      slotFx[slotId] = { flip: performance.now() };
      changed();
      ctx.sfx('rotate');
      ctx.emit('rotate', { slot: slotId, dir: p.dir });
      ctx.emit('rotate:' + slotId, { dir: p.dir });
      return true;
    }
    function clearAll(withSound) {
      if (!placements.length) { if (withSound) ctx.sfx('buzz'); return; }
      placements.forEach(function (p) { slotPuff(p.slot); });
      placements = [];
      changed();
      if (withSound) ctx.sfx('whoosh');
      ctx.emit('clear');
    }

    /* ----- Pointer / drag & drop ----- */
    var drag = null;
    function toCell(clientX, clientY) {
      var r = canvas.getBoundingClientRect();
      return { u: (clientX - r.left - B.ox) / B.c, v: (clientY - r.top - B.oy) / B.c, r: r };
    }
    function slotHit(u, v, filterFn, maxD) {
      var best = null, bd = 1e9;
      P.slots.forEach(function (sl) {
        if (filterFn && !filterFn(sl)) return;
        var c = slotCenter(sl);
        var dx = u - c.x, dy = v - c.y;
        if (sl.kind === 'lever') dx = Math.max(0, Math.abs(dx) - 1);
        if (sl.kind === 'hook') { var R = Math.abs(level.pulley.plat[0] - level.pulley.bucket[0]) / 2; dx = Math.max(0, Math.abs(dx) - R * 0.5); dy = Math.max(0, Math.abs(dy) - R * 0.5); }
        var d = Math.hypot(dx, dy);
        if (d < bd) { bd = d; best = sl; }
      });
      return best && bd <= (maxD || 0.75) ? best : null;
    }
    canvas.addEventListener('pointerdown', function (e) {
      if (busy || after || (ctx.isDemo && ctx.isDemo())) return;
      var c = toCell(e.clientX, e.clientY);
      var ps = byslot();
      var sl = slotHit(c.u, c.v, function (s) { return !!ps[s.id]; }, 0.7);
      if (sl) { startDrag(e, { slot: sl.id, part: ps[sl.id].part }); return; }
      var empty = slotHit(c.u, c.v, function (s) { return !ps[s.id]; }, 0.6);
      if (empty) {
        // tapped an empty spot: show which part fits
        var fit = trayParts.filter(function (p) { return ML.PART_SLOT[p] === empty.kind && avail(p) > 0; })[0];
        if (fit) { LE.bounce(trayEls[fit], 1.2); ctx.sfx('tap'); }
      }
    });
    function startDrag(e, src) {
      if (busy || (ctx.isDemo && ctx.isDemo())) return;
      if (e.button !== undefined && e.button !== 0) return;
      if (after) { after = null; invalidate(); }
      e.preventDefault();
      if (src.part && !src.slot && avail(src.part) <= 0) { LE.shake(trayEls[src.part]); ctx.sfx('buzz'); return; }
      drag = { part: src.part, from: src.slot || null, sx: e.clientX, sy: e.clientY, moved: false, ghost: null, target: null };
      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onCancel);
    }
    function ghostEl(part, dir) {
      var size = Math.max(44, Math.round(B.c * 1.1));
      var gEl = h('div.mc-ghost', iconCanvas(part, size, dir));
      gEl.style.width = size + 'px'; gEl.style.height = size + 'px';
      document.body.appendChild(gEl);
      return gEl;
    }
    function onMove(e) {
      if (!drag) return;
      e.preventDefault();
      var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 9) {
        drag.moved = true;
        var dir = 1;
        if (drag.from) { var p = byslot()[drag.from]; dir = p && p.dir || 1; drag.dir = dir; drag.hidden = removeAt(drag.from, true); }
        drag.ghost = ghostEl(drag.part, dir);
        ctx.sfx('pop');
      }
      if (drag.moved) {
        var gs = parseFloat(drag.ghost.style.width);
        var gx = e.clientX - gs / 2, gy = e.clientY - gs / 2 - 34;
        drag.ghost.style.transform = 'translate(' + gx + 'px,' + gy + 'px)';
        var c = toCell(e.clientX, e.clientY - 34);
        var ps = byslot();
        var t = slotHit(c.u, c.v, function (s) { return ML.PART_SLOT[drag.part] === s.kind && (!ps[s.id] || s.id === drag.from); }, 1.0);
        if (!t) t = slotHit(c.u, c.v, function (s) { return ML.PART_SLOT[drag.part] === s.kind; }, 0.7);
        drag.target = t ? t.id : null;
      }
    }
    function endDrag() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      var d = drag; drag = null;
      if (d && d.ghost) d.ghost.remove();
      return d;
    }
    function onCancel() {
      var d = endDrag();
      if (d && d.hidden) { placements.push(d.hidden); changed(); }
    }
    function onUp() {
      var d = endDrag();
      if (!d) return;
      if (!d.moved) {
        if (d.from) { rotateAt(d.from); return; }
        // tap on tray part: auto-place if there is exactly one free matching slot
        var ps = byslot();
        var free = P.slots.filter(function (s) { return ML.PART_SLOT[d.part] === s.kind && !ps[s.id]; });
        if (free.length === 1) placeAt(d.part, free[0].id, 1);
        else { LE.bounce(trayEls[d.part], 1.15); ctx.sfx('tap'); ctx.say('Drag it to a glowing spot!', { time: 2500 }); }
        return;
      }
      if (d.target) {
        var ok = placeAt(d.part, d.target, d.from ? d.dir : 1);
        if (!ok && d.hidden) { placements.push(d.hidden); changed(); }
        else if (d.from && d.target !== d.from) ctx.emit('move');
      } else if (d.from) {
        ctx.sfx('remove');
        var r = trayEls[d.part] && trayEls[d.part].getBoundingClientRect();
        if (r) ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 8, color: '#ffffff', speed: 3, size: 6 });
      } else ctx.sfx('whoosh');
    }

    /* ----- Running the machine ----- */
    function setRunning(on) {
      busy = on;
      root.classList.toggle('running', on);
      goBtn.classList.toggle('green', !on); goBtn.classList.toggle('red', on);
      goBtn.querySelector('span').textContent = on ? 'Stop' : 'Go!';
      goBtn.querySelector('svg').innerHTML = on ? '<rect x="6" y="6" width="12" height="12" rx="2" fill="#fff"/>' : '<path d="M7 4 L20 12 L7 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>';
    }
    function stop() { stopFlag = true; }
    var evByTick = {};
    function fireEvents(tick, phase) {
      (evByTick[tick] || []).forEach(function (e) {
        var late = e.type === 'land' || e.type === 'bump' || e.type === 'goal' || e.type === 'pulleyStop';
        if ((phase === 'end') !== late) return;
        var c = B.c;
        if (e.type === 'land') {
          itemFx[e.id] = { squash: performance.now() };
          puff(e.x + 0.5, e.y + 0.95, 6, 'rgba(255,240,215,.9)', 'dust', 1.4);
          ctx.sfx('bounce');
        } else if (e.type === 'bump') {
          ctx.sfx('bump'); itemFx[e.id] = { squash: performance.now() };
          LE.shake(canvas);
        } else if (e.type === 'split') {
          ctx.sfx('break'); setTimeout(function () { ctx.sfx('snap'); }, 90 / LE.speed);
          puff(e.x + 0.5, e.y + 0.5, 22, '#c98a4b', 'chip', 3.2);
          puff(e.x + 0.5, e.y + 0.5, 10, '#f0c48a', 'chip', 2.6);
          halves.push({ x: e.x + 0.35, y: e.y + 0.55, vx: -1.5, vy: -4, rot: 0, vr: -5, life: 0, side: -1 });
          halves.push({ x: e.x + 0.65, y: e.y + 0.55, vx: 2.5, vy: -4.5, rot: 0, vr: 6, life: 0, side: 1 });
        } else if (e.type === 'push') ctx.sfx('clank');
        else if (e.type === 'lever') { ctx.sfx('creak'); ctx.sfx('whoosh'); }
        else if (e.type === 'tilt') ctx.sfx('creak');
        else if (e.type === 'bucket') ctx.sfx('splash');
        else if (e.type === 'pulley') { if (tick % 2) ctx.sfx('creak'); }
        else if (e.type === 'fling') ctx.sfx('whoosh');
        else if (e.type === 'lost') ctx.sfx('oops');
        else if (e.type === 'goal') {
          ctx.sfx('ding');
          var r = cellRect(P.goal.x, P.goal.y);
          ctx.fx.sparkle(r.left + r.width / 2, r.top + r.height / 2, '#ffe14d');
          ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { n: 16, speed: 5 });
        }
        void c;
      });
    }
    function stepAnim(now) {
      var a = anim;
      var dt = (now - a.last) * LE.speed; a.last = now;
      a.k += dt / TICK_MS;
      while (a.k >= 1) {
        a.k -= 1;
        a.i++;
        fireEvents(a.i, 'end');
        if (a.i >= a.res.frames.length - 1) { a.k = 0; a.i = a.res.frames.length - 1; finishAnim(); return; }
        fireEvents(a.i + 1, 'start');
        // rolling sound
        var fA = a.res.frames[a.i], fB = a.res.frames[a.i + 1];
        if (fB && a.i % 2 === 0 && fA.items.some(function (it, j) { return it.x !== fB.items[j].x && !fB.items[j].lost; })) ctx.sfx('roll');
      }
      if (stopFlag) { a.k = 0; finishAnim(true); }
    }
    var animResolve = null;
    function finishAnim(stopped) {
      var a = anim;
      anim = null;
      var last = a.res.frames[a.res.frames.length - 1];
      after = { items: last.items, logs: last.logs, wedges: last.wedges, levers: last.levers, bucketY: last.bucketY, platY: last.platY, running: !stopped && !!(a.res.belt && a.res.belt.running) };
      if (animResolve) { var r = animResolve; animResolve = null; r(!!stopped); }
    }
    var MESSAGES = {
      jam: 'Oh no, the gears are stuck! Three gears in a circle jam.',
      belt: 'The belt is not moving. Connect it to the motor with gears!',
      lost: 'Whoops! It fell down. Let\'s try again!',
      log: 'Bonk! The log is in the way.',
      boxstuck: 'The box is too heavy to slide. What helps things roll?',
      box: 'The box won\'t move. Maybe it needs wheels!',
      pulley: 'The rope needs a wheel to hang on!',
      stuck: 'It stopped before the goal. Almost! Try again!'
    };
    async function go() {
      if (busy) return;
      if (drag) return;
      after = null; invalidate();
      ctx.emit('run');
      setRunning(true);
      stopFlag = false;
      var res = ML.simulate(level, placements);
      evByTick = {};
      res.events.forEach(function (e) { (evByTick[e.t] = evByTick[e.t] || []).push(e); });
      fx = []; halves = []; jamShake = 0;
      if (res.gears.gears.length) {
        if (res.gears.jam) { ctx.sfx('clank'); setTimeout(function () { ctx.sfx('buzz'); }, 150 / LE.speed); }
        else ctx.sfx('motor');
      }
      await LE.wait(res.gears.gears.length ? 350 : 120);
      if (destroyed) return;
      var stopped = await new Promise(function (resolve) {
        animResolve = resolve;
        anim = { res: res, i: 0, k: 0, last: performance.now() };
        fireEvents(1, 'start');
        if (res.frames.length < 2) finishAnim();
      });
      if (destroyed) return;
      if (stopped) { after = null; invalidate(); setRunning(false); ctx.emit('stopped'); return; }
      if (res.success) {
        await LE.wait(650);
        if (destroyed) return;
        var stars = ML.score(level, placements, res);
        var p = ML.par(level);
        setRunning(false);
        busy = true; // stay locked until the app shows the win card
        ctx.win({ stars: stars, note: stars < 3 ? 'Tip: use only ' + p + ' part' + (p > 1 ? 's' : '') + ' for 3 stars!' : null });
      } else {
        await LE.wait(450);
        if (destroyed) return;
        ctx.fail({ message: MESSAGES[res.reason] || MESSAGES.stuck });
        await LE.wait(1300);
        if (destroyed) return;
        after = null; invalidate(); fx = []; halves = [];
        setRunning(false);
      }
    }

    /* ----- Targets / Show me ----- */
    function slotRect(id) {
      var sl = P.slotById[id]; if (!sl) return null;
      var c = slotCenter(sl);
      if (sl.kind === 'hook') return cellRect(c.x - 0.75, c.y - 0.75, 1.5, 1.5);
      if (sl.kind === 'wheels') return cellRect(sl.x, sl.y + 0.3, 1, 0.8);
      return cellRect(c.x - 0.5, c.y - 0.5, 1, 1);
    }
    function targetRect(key) {
      if (!key) return null;
      if (key === 'go') return goBtn.getBoundingClientRect();
      if (key === 'clear') return clearBtn.getBoundingClientRect();
      if (key === 'goal') return P.goal ? cellRect(P.goal.x, P.goal.y) : null;
      if (key === 'board') return canvas.getBoundingClientRect();
      var m;
      if ((m = /^tray:(\w+)$/.exec(key))) return trayEls[m[1]] ? trayEls[m[1]].getBoundingClientRect() : null;
      if ((m = /^slot:(.+)$/.exec(key))) return slotRect(m[1]);
      if ((m = /^cell:(\d+),(\d+)$/.exec(key))) return cellRect(+m[1], +m[2]);
      return null;
    }
    function ghostHTML(key) {
      var m = /^tray:(\w+)$/.exec(key || ''), part = m && m[1], dir = 1;
      if (!part) { m = /^slot:(.+)$/.exec(key || ''); var p = m && byslot()[m[1]]; if (p) { part = p.part; dir = p.dir || 1; } }
      if (!part) return null;
      var c = iconCanvas(part, 52, dir);
      return '<img class="mc-hand-ghost" src="' + c.toDataURL() + '" width="52" height="52" alt="">';
    }
    function showMeSteps() {
      var steps = [];
      var sol = ML.normalize(level, level.solution, P);
      var cur = ML.clonePl(placements);
      function inSol(p) { return sol.filter(function (s) { return s.slot === p.slot && s.part === p.part; })[0]; }
      if (after) steps.push({ from: 'board', apply: function () { after = null; invalidate(); }, pause: 100 });
      cur.forEach(function (p) {
        if (inSol(p)) return;
        steps.push({ from: 'slot:' + p.slot, to: 'tray:' + p.part, say: 'This one is not needed.', apply: function () { removeAt(p.slot); } });
      });
      sol.forEach(function (s) {
        var have = cur.filter(function (p) { return p.slot === s.slot && p.part === s.part; })[0];
        if (!have) {
          steps.push({ from: 'tray:' + s.part, to: 'slot:' + s.slot, say: say(s.part), apply: function () { placeAt(s.part, s.slot, 1); } });
          if (s.dir === -1) steps.push({ from: 'slot:' + s.slot, say: 'Tap to flip it!', apply: function () { rotateAt(s.slot); }, pause: 400 });
        } else if (ML.ROTATABLE[s.part] && (have.dir || 1) !== s.dir) {
          steps.push({ from: 'slot:' + s.slot, say: 'Tap to flip it!', apply: function () { rotateAt(s.slot); }, pause: 400 });
        }
      });
      return steps;
    }
    function say(part) {
      return { ramp: 'A ramp goes here!', wedge: 'The wedge goes by the log!', gearS: 'A small gear here!', gearB: 'A big gear here!',
        lever: 'The seesaw goes here!', pulley: 'Hang the pulley on the hook!', wheels: 'Wheels on the box!' }[part];
    }

    /* ----- Lifecycle ----- */
    renderTray();
    raf = requestAnimationFrame(function (n) { lastT = n; layout(); loop(n); });

    return {
      get busy() { return busy; },
      target: targetRect,
      ghost: ghostHTML,
      showMe: showMeSteps,
      goKey: 'go',
      stop: stop,
      reset: function () {
        stop(); anim = null; after = null; busy = false; setRunning(false);
        placements = ML.normalize(level, level.start || [], P); changed(); ctx.sfx('whoosh');
      },
      go: go,
      getPlacements: function () { return ML.clonePl(placements); },
      place: placeAt, remove: removeAt, rotate: rotateAt,
      destroy: function () {
        destroyed = true; stopFlag = true; cancelAnimationFrame(raf);
        if (drag) endDrag();
        root.remove();
      },
      root: root
    };
  }

  LE.views.machines = { create: create };
})();
