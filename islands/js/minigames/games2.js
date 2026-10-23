/* Minigame views 2/2: Word Builder, Bridge Builder, Pattern Garden, Kite Glide. Registered into SI.mgcore (see core.js). */
(function (root) {
  'use strict';
  var SI = root.SI, C = SI.mgcore, D = C.draw, MG = SI.minigames, rr = D.rr, txt = D.txt, TAU = Math.PI * 2;

  function bubbleCol(i) { return ['#ff8ccf', '#6ad0ff', '#ffd23f', '#7fe6a0', '#b58bff', '#ffa05a'][i % 6]; }
  function garden(g, W, H, t) {
    D.sky(g, W, H, '#bff0ff', '#e9ffd8'); D.cloud(g, (t * 10) % (W + 100) - 50, 40, 1);
    g.fillStyle = '#8fdc78'; g.beginPath(); g.moveTo(0, H); g.lineTo(0, H * 0.8); g.quadraticCurveTo(W * 0.3, H * 0.7, W * 0.6, H * 0.82); g.quadraticCurveTo(W * 0.85, H * 0.9, W, H * 0.78); g.lineTo(W, H); g.fill();
    for (var i = 0; i < 8; i++) { var fx = (i * 53 + 20) % W, fy = H * 0.86 + (i % 3) * 12; g.fillStyle = bubbleCol(i); g.beginPath(); g.arc(fx, fy, 5, 0, TAU); g.fill(); g.fillStyle = '#fff6'; g.beginPath(); g.arc(fx, fy, 2, 0, TAU); g.fill(); }
  }

  /* ================================================================== Word Builder */
  C.register('wordBuilder', function (env) {
    var spec = env.spec, wi = 0, score = 0, w, prog, hinted, bubs, fly, doneT, wrongs, hintT;
    function setup() {
      w = spec.words[wi]; prog = 0; hinted = false; doneT = 0; wrongs = 0; hintT = 0; fly = [];
      bubs = w.letters.map(function (ch, i) { return { ch: ch, used: false, shake: 0, i: i, ph: env.rand() * 6 }; });
    }
    setup();
    function bubbleRects() {
      var n = bubs.length, W = env.W, per = n <= 6 ? 3 : n <= 10 ? 5 : 6, rows = Math.ceil(n / per), size = Math.min(62, (W - 30) / per - 8), top = env.H * 0.5, rect = [];
      for (var i = 0; i < n; i++) { var r = Math.floor(i / per), c = i % per, cnt = Math.min(per, n - r * per); rect.push({ cx: W / 2 + (c - (cnt - 1) / 2) * (size + 10), cy: top + r * (size + 12) + size / 2, r: size / 2 }); }
      return rect;
    }
    function slotRects() {
      var L = w.word.length, sw = Math.min(46, (env.W - 24) / L - 6), out = [], y = env.H * 0.36;
      for (var i = 0; i < L; i++) out.push({ x: env.W / 2 + (i - (L - 1) / 2) * (sw + 6) - sw / 2, y: y, w: sw, h: sw * 1.15 });
      return out;
    }
    function hintBtn() { return { x: env.W / 2 - 70, y: env.H - 62, w: 140, h: 46 }; }
    return {
      update: function (dt) {
        bubs.forEach(function (b) { b.shake = Math.max(0, b.shake - dt); }); hintT = Math.max(0, hintT - dt);
        fly.forEach(function (f) { f.k = Math.min(1, f.k + dt / 0.28); });
        if (doneT > 0) { doneT -= dt; if (doneT <= 0) { wi++; if (wi >= spec.words.length) { doneT = 1e9; env.finish(score); } else setup(); } }
      },
      draw: function (g) {
        var W = env.W, H = env.H; garden(g, W, H, env.t);
        rr(g, W / 2 - 62, 12, 124, 124, 26); g.fillStyle = '#fffdf2'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#ff7ac8'; g.stroke();
        var bob = doneT > 0 ? -Math.abs(Math.sin(doneT * 12)) * 10 : 0; D.emoji(g, w.pic, W / 2, 76 + bob, 78);
        txt(g, 'Word ' + (wi + 1) + ' of ' + spec.words.length, 14, 24, 15, '#2d1b52', { align: 'left' });
        var sr = slotRects(), br = bubbleRects();
        sr.forEach(function (s, i) {
          rr(g, s.x, s.y, s.w, s.h, 10); g.fillStyle = i < prog ? '#fff' : 'rgba(255,255,255,.55)'; g.fill(); g.lineWidth = 3; g.strokeStyle = i === prog ? '#ff7ac8' : '#a58be0'; g.stroke();
          if (i < prog && !(fly.length && fly[fly.length - 1].slot === i && fly[fly.length - 1].k < 1)) txt(g, w.word.charAt(i), s.x + s.w / 2, s.y + s.h / 2 + 2, s.w * 0.8, doneT > 0 ? '#2fb855' : '#2d1b52');
        });
        bubs.forEach(function (b, i) {
          if (b.used) return; var r = br[i], hl = hintT > 0 && w.word.charAt(prog) === b.ch ? 1 : 0, x = r.cx + (b.shake > 0 ? Math.sin(b.shake * 70) * 7 : 0), y = r.cy + Math.sin(env.t * 2 + b.ph) * 4;
          if (hl) { g.fillStyle = 'rgba(255,255,120,' + (0.4 + 0.4 * Math.sin(env.t * 10)) + ')'; g.beginPath(); g.arc(x, y, r.r + 8, 0, TAU); g.fill(); }
          var gr = g.createRadialGradient(x - r.r * 0.3, y - r.r * 0.3, 2, x, y, r.r); gr.addColorStop(0, '#fff'); gr.addColorStop(0.35, bubbleCol(b.i)); gr.addColorStop(1, bubbleCol(b.i));
          g.fillStyle = gr; g.beginPath(); g.arc(x, y, r.r, 0, TAU); g.fill(); g.lineWidth = 3; g.strokeStyle = 'rgba(30,15,70,.45)'; g.stroke();
          txt(g, b.ch, x, y + 2, r.r * 1.1, '#fff', { stroke: 'rgba(30,15,70,.6)', sw: 5 });
        });
        fly.forEach(function (f) { if (f.k >= 1) return; var s = sr[f.slot], k = f.k; g.globalAlpha = 1; txt(g, f.ch, f.x0 + (s.x + s.w / 2 - f.x0) * k, f.y0 + (s.y + s.h / 2 - f.y0) * k - Math.sin(k * 3.14) * 30, 40 - 10 * k, '#fff', { stroke: '#2d1b52' }); });
        var hb = hintBtn(); D.button(g, hb.x, hb.y, hb.w, hb.h, hinted ? 'Hint used' : '💡 Hint', { col: '#ffa02a', disabled: doneT > 0 });
        if (wi === 0 && prog === 0) txt(g, 'Tap the letters in order', W / 2, H * 0.3, 16, '#2d1b52', { maxW: W - 30 });
      },
      pointer: function (type, x, y) {
        if (type !== 'down' || doneT > 0) return;
        if (D.hit(hintBtn(), x, y)) { if (!hinted) { hinted = true; env.float('No point for this word', env.W / 2, env.H - 80, '#ffd0a0', 18); } hintT = 2.2; env.sfx('tap'); return; }
        var br = bubbleRects();
        for (var i = 0; i < bubs.length; i++) {
          var b = bubs[i]; if (b.used) continue; var r = br[i];
          if (Math.hypot(x - r.cx, y - r.cy - 2) < r.r + 6) {
            if (b.ch === w.word.charAt(prog)) {
              b.used = true; fly.push({ ch: b.ch, x0: r.cx, y0: r.cy, k: 0, slot: prog }); prog++; env.sfx('pop');
              if (prog >= w.word.length) {
                doneT = 1.25; env.sfx('correct'); env.burst(env.W / 2, 76, '#ffd23f', 16);
                if (!hinted) { score++; env.setScore(score); env.float('+1', env.W / 2, 150, '#9dffb0'); } else env.float('Well spelled!', env.W / 2, 150, '#fff', 22);
              }
            } else { b.shake = 0.35; wrongs++; env.sfx('wrong'); }
            return;
          }
        }
      },
      target: function () {
        if (doneT > 0) return null; var br = bubbleRects(), ch = w.word.charAt(prog);
        for (var i = 0; i < bubs.length; i++) if (!bubs[i].used && bubs[i].ch === ch) return { x: br[i].cx, y: br[i].cy + Math.sin(env.t * 2 + bubs[i].ph) * 4 };
        return null;
      }
    };
  });

  /* ================================================================== Bridge Builder */
  C.register('bridgeBuilder', function (env) {
    var spec = env.spec, ri = 0, points = 0, picks = [], attempts = 0, msg = '', msgT = 0, shake = 0, cross = 0, rd, sol = [];
    var PC = ['#ffb35a', '#ff8f8f', '#7fd4ff', '#a8e86a', '#c9a0ff', '#ffd23f'];
    function solve(G) { // min-plank path
      var best = [0], from = [-1], g;
      for (g = 1; g <= G; g++) { best[g] = 1e9; spec.planks.forEach(function (p) { if (g >= p && best[g - p] + 1 < best[g]) { best[g] = best[g - p] + 1; from[g] = p; } }); }
      var out = [], cur = G; while (cur > 0 && from[cur] > 0) { out.push(from[cur]); cur -= from[cur]; } return out;
    }
    function setup() { rd = spec.rounds[ri]; picks = []; attempts = 0; msg = ''; cross = 0; sol = solve(rd.gap); }
    setup();
    function sum() { return picks.reduce(function (a, b) { return a + b; }, 0); }
    function geom() {
      var W = env.W, x0 = 56, x1 = W - 56, gapW = x1 - x0, u = gapW / Math.max(rd.gap, sum()), uu = Math.min(u, gapW / rd.gap); return { x0: x0, x1: x1, u: gapW / rd.gap, y: env.H * 0.26 };
    }
    function plankBtns() {
      var n = spec.planks.length, W = env.W, per = n > 3 ? 3 : n, rows = Math.ceil(n / per), bw = Math.min(100, (W - 30) / per - 8), out = [], top = env.H * 0.5;
      spec.planks.forEach(function (p, i) { var r = Math.floor(i / per), c = i % per, cnt = Math.min(per, n - r * per); out.push({ p: p, x: W / 2 + (c - (cnt - 1) / 2) * (bw + 8) - bw / 2, y: top + r * 64, w: bw, h: 54 }); });
      return out;
    }
    function actions() { var y = env.H - 70, W = env.W; return { undo: { x: 14, y: y, w: 96, h: 50 }, clear: { x: 118, y: y, w: 80, h: 50 }, go: { x: W - 14 - 140, y: y, w: 140, h: 50 } }; }
    function tryCross() {
      var s = sum();
      if (s !== rd.gap) { attempts++; shake = 0.4; msg = s < rd.gap ? 'Too short! Need ' + (rd.gap - s) + ' more.' : 'Too long by ' + (s - rd.gap) + '. Undo a plank.'; msgT = 2.2; env.sfx('wrong'); return; }
      var pts = MG.rules.bridgeScoreRound(spec, rd, picks, attempts); if (pts < 0) { attempts++; msg = 'Use at most ' + spec.maxPlanks + ' planks.'; msgT = 2; env.sfx('wrong'); return; }
      points += pts; env.setScore(points); cross = 0.001; env.sfx('correct');
      env.float(pts === 2 ? '+2 Perfect!' : pts === 1 ? '+1 Good!' : '+0 It works!', env.W / 2, env.H * 0.26, pts ? '#9dffb0' : '#fff', 24);
      if (pts === 1 && attempts === 0) msg = 'Fewer planks would earn more!';
    }
    return {
      update: function (dt) {
        shake = Math.max(0, shake - dt); msgT = Math.max(0, msgT - dt);
        if (cross > 0) { cross += dt; if (cross > 1.9) { ri++; if (ri >= spec.rounds.length) { cross = 0; ri = spec.rounds.length - 1; env.finish(points); } else setup(); } }
      },
      draw: function (g) {
        var W = env.W, H = env.H, gm = geom(); garden(g, W, H, env.t);
        g.fillStyle = '#8a5a2a'; g.fillRect(0, gm.y, gm.x0 - 6, H * 0.2); g.fillRect(gm.x1 + 6, gm.y, W - gm.x1, H * 0.2); g.fillStyle = '#6fd05a'; g.fillRect(0, gm.y - 8, gm.x0 - 6, 14); g.fillRect(gm.x1 + 6, gm.y - 8, W - gm.x1, 14);
        g.fillStyle = '#4fb8f0'; g.fillRect(gm.x0 - 6, gm.y + 40, gm.x1 - gm.x0 + 12, H * 0.2 - 40); g.fillStyle = 'rgba(255,255,255,.4)'; for (var q = 0; q < 5; q++) { g.beginPath(); g.ellipse(gm.x0 + 40 + q * 60 + Math.sin(env.t * 2 + q) * 8, gm.y + 60 + (q % 2) * 20, 18, 3, 0, 0, TAU); g.fill(); }
        // ruler under the gap
        g.strokeStyle = '#2d1b52'; g.lineWidth = 2; g.beginPath(); g.moveTo(gm.x0, gm.y - 30); g.lineTo(gm.x1, gm.y - 30); g.moveTo(gm.x0, gm.y - 36); g.lineTo(gm.x0, gm.y - 24); g.moveTo(gm.x1, gm.y - 36); g.lineTo(gm.x1, gm.y - 24); g.stroke();
        rr(g, W / 2 - 52, gm.y - 48, 104, 34, 17); g.fillStyle = '#fff'; g.fill(); g.stroke(); txt(g, 'Gap: ' + rd.gap, W / 2, gm.y - 31, 20, '#2d1b52');
        var x = gm.x0, sh = shake > 0 ? Math.sin(shake * 60) * 5 : 0;
        picks.forEach(function (p, i) { var w = p * gm.u; g.save(); g.translate(sh, 0); rr(g, x + 1, gm.y - 2, w - 2, 26, 7); g.fillStyle = PC[spec.planks.indexOf(p) % PC.length]; g.fill(); g.lineWidth = 2.5; g.strokeStyle = x + w > gm.x1 + 2 ? '#e0433f' : '#6b3d14'; g.stroke(); txt(g, String(p), x + w / 2, gm.y + 12, 17, '#2d1b52'); g.restore(); x += w; });
        if (x < gm.x1) { g.setLineDash([8, 6]); g.strokeStyle = 'rgba(45,27,82,.5)'; g.lineWidth = 2.5; rr(g, x + 2, gm.y - 2, gm.x1 - x - 4, 26, 7); g.stroke(); g.setLineDash([]); }
        var s = sum(); txt(g, 'Total ' + s + ' / ' + rd.gap, W / 2, gm.y + 74, 20, s === rd.gap ? '#1f9a45' : s > rd.gap ? '#e0433f' : '#2d1b52', { stroke: '#fff', sw: 5 });
        txt(g, 'Round ' + (ri + 1) + '/' + spec.rounds.length + ' · up to ' + spec.maxPlanks + ' planks (' + picks.length + ' used)', W / 2, gm.y + 98, 14, '#2d1b52', { maxW: W - 20 });
        // walker
        var wk = cross > 0 ? Math.min(1, cross / 1.5) : 0, wx = cross > 0 ? gm.x0 - 30 + (gm.x1 - gm.x0 + 60) * wk : 34; env.avatar(g, wx, gm.y - 4, 0.5, { walk: cross > 0 ? 1 : 0, phase: env.t * 12, dir: 1 });
        var pb = plankBtns(), full = picks.length >= spec.maxPlanks;
        pb.forEach(function (b) { D.button(g, b.x, b.y, b.w, b.h, String(b.p), { col: PC[spec.planks.indexOf(b.p) % PC.length], ink: '#2d1b52', size: 26, disabled: cross > 0 }); g.save(); g.fillStyle = 'rgba(45,27,82,.6)'; g.restore(); });
        var ac = actions(); D.button(g, ac.undo.x, ac.undo.y, ac.undo.w, ac.undo.h, '↶ Undo', { col: '#8d86b0', size: 18 }); D.button(g, ac.clear.x, ac.clear.y, ac.clear.w, ac.clear.h, 'Clear', { col: '#8d86b0', size: 18 }); D.button(g, ac.go.x, ac.go.y, ac.go.w, ac.go.h, 'Cross ▶', { col: '#2fb855', size: 22, disabled: cross > 0 || !picks.length });
        if (msgT > 0 || cross > 0) txt(g, msg, W / 2, H - 82, 16, '#e0433f', { maxW: W - 20, stroke: '#fff', sw: 4 });
        if (ri === 0 && !picks.length && !attempts) txt(g, 'Pick planks that add up to the gap', W / 2, H * 0.47, 15, '#2d1b52', { maxW: W - 20 });
      },
      pointer: function (type, x, y) {
        if (type !== 'down' || cross > 0) return;
        var ac = actions();
        if (D.hit(ac.undo, x, y)) { picks.pop(); env.sfx('tap'); return; } if (D.hit(ac.clear, x, y)) { picks = []; env.sfx('tap'); return; } if (D.hit(ac.go, x, y)) { if (picks.length) tryCross(); return; }
        var pb = plankBtns();
        for (var i = 0; i < pb.length; i++) if (D.hit(pb[i], x, y)) {
          if (picks.length >= spec.maxPlanks) { msg = 'That is the most planks you can use.'; msgT = 2; env.sfx('nope'); return; }
          picks.push(pb[i].p); env.sfx('place'); return;
        }
      },
      target: function () {
        if (cross > 0) return null; var ac = actions(), s = sum();
        if (s === rd.gap && picks.length) return { x: ac.go.x + ac.go.w / 2, y: ac.go.y + ac.go.h / 2 };
        if (s > rd.gap || picks.length >= sol.length) return { x: ac.clear.x + 30, y: ac.clear.y + 25 };
        var have = picks.slice(), need = sol.slice(); have.forEach(function (p) { var k = need.indexOf(p); if (k >= 0) need.splice(k, 1); });
        if (!need.length) return { x: ac.clear.x + 30, y: ac.clear.y + 25 };
        var pb = plankBtns().filter(function (b) { return b.p === need[0]; })[0]; return pb ? { x: pb.x + pb.w / 2, y: pb.y + pb.h / 2 } : null;
      }
    };
  });

  /* ================================================================== Pattern Garden */
  C.register('patternGarden', function (env) {
    var spec = env.spec, ri = 0, score = 0, rd, mistakes, off, solved, wait, shake;
    function setup() { rd = spec.rounds[ri]; mistakes = 0; off = {}; solved = false; wait = 0; shake = {}; }
    setup();
    function cellList() { return rd.shown.concat([solved ? rd.answer : '?']).concat(rd.after); }
    function cellRects() {
      var cl = cellList(), n = cl.length, W = env.W - 20, cs = Math.min(58, W / n - 6), per = n, rows = 1;
      if (cs < 40) { per = Math.ceil(n / 2); rows = 2; cs = Math.min(58, W / per - 6); }
      var out = [], y0 = env.H * 0.2;
      for (var i = 0; i < n; i++) { var r = Math.floor(i / per), c = i % per, cnt = Math.min(per, n - r * per); out.push({ x: env.W / 2 + (c - (cnt - 1) / 2) * (cs + 6) - cs / 2, y: y0 + r * (cs + 10), w: cs, h: cs }); }
      return out;
    }
    function optRects() {
      var n = rd.options.length, W = env.W, per = n === 3 ? 3 : 2, bw = Math.min(140, (W - 30) / per - 10), bh = 76, out = [], top = env.H * 0.52;
      for (var i = 0; i < n; i++) { var r = Math.floor(i / per), c = i % per, cnt = Math.min(per, n - r * per); out.push({ x: W / 2 + (c - (cnt - 1) / 2) * (bw + 10) - bw / 2, y: top + r * (bh + 12), w: bw, h: bh }); }
      return out;
    }
    function symbol(g, s, cx, cy, size, ink) {
      var m = /^(\S+?)([12])$/u.exec(s);
      if (m && /[^\x00-\x7f]/.test(m[1])) { D.emoji(g, m[1], cx, cy, size * (m[2] === '2' ? 0.95 : 0.5)); return; }
      if (/^[^\x00-\x7f]+$/.test(s)) { D.emoji(g, s, cx, cy + 2, size * 0.72); return; }
      txt(g, s, cx, cy + 1, size * 0.62, ink || '#2d1b52', { maxW: size * 1.5 });
    }
    return {
      update: function (dt) {
        Object.keys(shake).forEach(function (k) { shake[k] = Math.max(0, shake[k] - dt); });
        if (solved) { wait -= dt; if (wait <= 0) { ri++; if (ri >= spec.rounds.length) { wait = 1e9; ri = spec.rounds.length - 1; env.finish(score); } else setup(); } }
      },
      draw: function (g) {
        var W = env.W, H = env.H; garden(g, W, H, env.t);
        txt(g, 'What comes next?', W / 2, 30, 24, '#2d1b52', { stroke: '#fff', sw: 5 }); txt(g, 'Pattern ' + (ri + 1) + ' of ' + spec.rounds.length, W / 2, 56, 14, '#2d1b52');
        var cl = cellList(), cr = cellRects(), pulse = Math.sin(env.t * 5) * 0.06;
        cr.forEach(function (r, i) {
          var isQ = i === rd.shown.length, sc = isQ && !solved ? 1 + pulse : 1; g.save(); g.translate(r.x + r.w / 2, r.y + r.h / 2); g.scale(sc, sc); g.translate(-r.x - r.w / 2, -r.y - r.h / 2);
          rr(g, r.x, r.y, r.w, r.h, 12); g.fillStyle = isQ ? (solved ? '#d6ffe0' : '#fff2b0') : i > rd.shown.length ? 'rgba(255,255,255,.55)' : '#fff'; g.fill(); g.lineWidth = 3; g.strokeStyle = isQ ? (solved ? '#3fbf6a' : '#ffa02a') : '#a58be0'; g.stroke();
          symbol(g, cl[i], r.x + r.w / 2, r.y + r.h / 2, r.w, isQ && !solved ? '#ff8a00' : null); g.restore();
        });
        var or = optRects(); rd.options.forEach(function (o, i) {
          var r = or[i], sh = shake[o] > 0 ? Math.sin(shake[o] * 60) * 6 : 0, dis = off[o] || solved && o !== rd.answer; g.save(); g.translate(sh, 0); if (dis) g.globalAlpha = 0.4;
          D.button(g, r.x, r.y, r.w, r.h, '', { col: solved && o === rd.answer ? '#2fb855' : '#7a3cf0', top: solved && o === rd.answer ? '#7bf09a' : '#fff', press: false }); rr(g, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 14); g.fillStyle = '#fff'; g.fill();
          symbol(g, o, r.x + r.w / 2, r.y + r.h / 2, r.h * 0.9); g.restore();
        });
        env.avatar(g, W / 2, H * 0.47, 0.85, { walk: 0, dir: 1 });
        if (mistakes) txt(g, 'Look at what repeats or changes!', W / 2, H - 36, 16, '#2d1b52', { maxW: W - 20, stroke: '#fff', sw: 4 });
      },
      pointer: function (type, x, y) {
        if (type !== 'down' || solved) return; var or = optRects();
        for (var i = 0; i < or.length; i++) if (D.hit(or[i], x, y)) {
          var o = rd.options[i]; if (off[o]) return;
          if (o === rd.answer) { solved = true; wait = 0.95; env.sfx('correct'); env.burst(env.W / 2, env.H * 0.25, '#ffd23f', 14); if (!mistakes) { score++; env.setScore(score); env.float('+1', env.W / 2, env.H * 0.42, '#9dffb0'); } else env.float('Got it!', env.W / 2, env.H * 0.42, '#fff'); }
          else { off[o] = true; shake[o] = 0.35; mistakes++; env.sfx('wrong'); }
          return;
        }
      },
      target: function () { if (solved) return null; var or = optRects(), i = rd.options.indexOf(rd.answer); return i < 0 ? null : { x: or[i].x + or[i].w / 2, y: or[i].y + or[i].h / 2 }; }
    };
  });

  /* ================================================================== Kite Glide */
  C.register('kiteGlide', function (env) {
    var spec = env.spec, ky = spec.startY, vy = 0, dist = 0, passed = 0, tail = [], idx = 0, over = false, endT = 0, flap = 0, tapped = false;
    var rings = spec.rings.map(function (r) { return { r: r, st: 'wait', k: 0 }; }), PXU = 70;
    function kx() { return env.W * 0.28; }
    function nextRing() { for (var i = 0; i < rings.length; i++) if (rings[i].st === 'wait') return rings[i]; return null; }
    function doFlap() { vy = -0.75; flap = 0.25; tapped = true; env.sfx('whoosh'); }
    return {
      update: function (dt) {
        dist += spec.speed * dt; vy = Math.min(0.6, vy + 2.2 * dt); ky += vy * dt; flap = Math.max(0, flap - dt);
        if (ky > 0.94) { ky = 0.94; vy = -0.3; } if (ky < 0.05) { ky = 0.05; vy = 0.1; }
        tail.unshift({ y: ky }); if (tail.length > 24) tail.pop();
        rings.forEach(function (o) {
          if (o.st === 'wait' && dist >= o.r.x) {
            if (Math.abs(ky - o.r.y) <= spec.radius * 1.15 + 0.03) { o.st = 'ok'; passed++; env.setScore(passed); env.sfx('pickup'); env.burst(kx(), ky * env.H, '#ffd23f', 10); env.float('+1', kx() + 30, ky * env.H - 30, '#9dffb0', 22); }
            else { o.st = 'miss'; env.sfx('splash'); }
          } else if (o.st !== 'wait') o.k += dt;
        });
        if (!over && dist >= spec.rings[spec.rings.length - 1].x + 3) { over = true; env.finish(passed); }
      },
      draw: function (g) {
        var W = env.W, H = env.H; D.sky(g, W, H, '#5fc8ff', '#d9f5ff');
        for (var c = 0; c < 5; c++) D.cloud(g, ((c * 150 - dist * PXU * 0.25) % (W + 200) + W + 200) % (W + 200) - 60, 60 + (c * 71) % (H * 0.6), 0.9 + (c % 3) * 0.3);
        g.fillStyle = '#7fdc8a'; g.beginPath(); g.moveTo(0, H); for (var x = 0; x <= W; x += 20) g.lineTo(x, H - 36 - 22 * Math.sin((x + dist * PXU * 0.5) / 80)); g.lineTo(W, H); g.fill();
        g.fillStyle = '#4fb86a'; g.beginPath(); g.moveTo(0, H); for (var x2 = 0; x2 <= W; x2 += 20) g.lineTo(x2, H - 14 - 12 * Math.sin((x2 + dist * PXU) / 50 + 2)); g.lineTo(W, H); g.fill();
        var R = spec.radius * H;
        rings.forEach(function (o) {
          var sx0 = kx() + (o.r.x - dist) * PXU, sy0 = o.r.y * H; if (sx0 < -40 || sx0 > W + 40) return;
          var col = o.st === 'ok' ? '#3fe07a' : o.st === 'miss' ? '#b9b3d0' : '#ffb23c', a = o.st === 'miss' ? Math.max(0.2, 1 - o.k) : 1;
          g.globalAlpha = a; g.lineWidth = 9; g.strokeStyle = col; g.beginPath(); g.ellipse(sx0, sy0, R * 0.38, R, 0, 0, TAU); g.stroke(); g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(sx0 - 2, sy0, R * 0.38 - 4, R - 4, 0, 0, TAU); g.stroke(); g.globalAlpha = 1;
          if (o.st === 'wait' && sx0 > kx()) { g.strokeStyle = 'rgba(255,178,60,.25)'; g.lineWidth = 2; g.setLineDash([6, 8]); g.beginPath(); g.moveTo(kx() + 20, sy0); g.lineTo(sx0 - R * 0.4, sy0); g.stroke(); g.setLineDash([]); }
        });
        // ribbon tail
        g.strokeStyle = '#ff7ac8'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); tail.forEach(function (p, i) { var tx = kx() - i * 6, ty = p.y * H + 30 + Math.sin(env.t * 8 - i * 0.5) * 4; if (i) g.lineTo(tx, ty); else g.moveTo(tx, ty); }); g.stroke();
        for (var b = 3; b < tail.length; b += 5) { g.fillStyle = bubbleCol(b); g.beginPath(); g.arc(kx() - b * 6, tail[b].y * H + 30 + Math.sin(env.t * 8 - b * 0.5) * 4, 5, 0, TAU); g.fill(); }
        // kite
        g.save(); g.translate(kx(), ky * H); g.rotate(Math.max(-0.4, Math.min(0.4, vy * 0.5)) + Math.sin(env.t * 6) * 0.04); var s = 1 + flap * 0.5;
        g.scale(s, s); g.fillStyle = '#ff5a5a'; g.beginPath(); g.moveTo(0, -34); g.lineTo(26, 0); g.lineTo(0, 0); g.fill(); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(0, -34); g.lineTo(-26, 0); g.lineTo(0, 0); g.fill(); g.fillStyle = '#4fb8ff'; g.beginPath(); g.moveTo(0, 38); g.lineTo(26, 0); g.lineTo(0, 0); g.fill(); g.fillStyle = '#7fe6a0'; g.beginPath(); g.moveTo(0, 38); g.lineTo(-26, 0); g.lineTo(0, 0); g.fill();
        g.lineWidth = 3; g.strokeStyle = '#2d1b52'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0, -34); g.lineTo(26, 0); g.lineTo(0, 38); g.lineTo(-26, 0); g.closePath(); g.moveTo(0, -34); g.lineTo(0, 38); g.moveTo(-26, 0); g.lineTo(26, 0); g.stroke(); g.restore();
        if (!tapped && env.t < 6) txt(g, 'Tap to flap up!', W / 2, H * 0.78, 26, '#fff', { stroke: '#2d1b52' });
        txt(g, passed + ' / ' + spec.total + ' rings', W - 12, H - 12, 15, '#fff', { align: 'right', stroke: '#2d1b52' });
      },
      pointer: function (type) { if (type === 'down') doFlap(); },
      target: function () {
        var n = nextRing(); if (!n) return null; var lim = Math.min(0.09, spec.radius * 0.8);
        return ky > n.r.y + lim && vy > -0.25 ? { x: env.W / 2, y: env.H / 2 } : null;
      },
      keepRunning: false
    };
  });
})(typeof self !== 'undefined' ? self : this);
