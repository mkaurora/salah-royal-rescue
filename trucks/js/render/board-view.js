/* Board renderer + animator + input. The engine (board.js) hands back a finished board plus an ordered EVENT LIST; this
 * view keeps its own "display" sprites and replays the events on a timeline (swap, clear waves, specials, fall/bounce,
 * reshuffle, bonus time) with particles, shake and popups, then re-syncs to the real board. TW.boardView.create(opts). */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {};
  var FX = TW.fx, SPR = TW.sprites;
  var WAVE = 170, SWAP = 150;

  function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function backOut(t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function snd(n, a) { if (TW.audio && TW.audio.play) TW.audio.play(n, a); }

  function create(opts) {
    var canvas = opts.canvas, g = canvas.getContext('2d'), hit = opts.hitEl, hooks = opts.hooks || {};
    var V = { busy: false, locked: false };
    var dpr = 1, cw = 0, ch = 0, area = { x: 0, y: 0, w: 0, h: 0 };
    var b = null, cols = 0, rows = 0, cell = 40, ox = 0, oy = 0, sp = null, spS = 0, stat = null;
    var sprites = [], byId = {}, dBlk = null, dBl = null, dOil = null, hole = null, crateHit = {};
    var clock = 0, last = 0, q = [], seq = 0, running = false, raf = 0, endAt = 0, done = null;
    var hint = null, hintT = 0, hammer = false, sel = -1, lastTap = { i: -1, t: 0 };
    var comboText = null, kf = 1;

    /* ------------------------------------------------------------ layout */
    function layout(w, h, ratio, a) {
      dpr = ratio; cw = w; ch = h; area = a;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      if (b) fit();
    }
    function fit() {
      cell = Math.floor(Math.min(area.w / (cols + 0.3), area.h / (rows + 0.3)));
      ox = Math.round(area.x + (area.w - cell * cols) / 2); oy = Math.round(area.y + (area.h - cell * rows) / 2);
      var S = Math.round(cell * dpr);
      if (!sp || spS !== S) { sp = SPR.build(S); spS = S; }
      buildStatic();
      sprites.forEach(function (s) { if (!s.tw) { var p = pos(s.cell); s.x = p.x; s.y = p.y; } });
      hit.style.left = (ox - 6) + 'px'; hit.style.top = (oy - 6) + 'px'; hit.style.width = (cell * cols + 12) + 'px'; hit.style.height = (cell * rows + 12) + 'px';
    }
    function pos(i) { return { x: ox + (i % cols) * cell, y: oy + ((i / cols) | 0) * cell }; }
    function buildStatic() {
      stat = SPR.mk(Math.round((cell * cols + cell) * dpr), Math.round((cell * rows + cell) * dpr));
      var s = stat.getContext('2d'), pad = cell * 0.5, i, r, c;
      s.scale(dpr, dpr); s.translate(pad, pad);
      var e = cell * 0.09;
      s.fillStyle = 'rgba(10,18,40,.45)';
      for (i = 0; i < cols * rows; i++) if (!hole[i]) { r = (i / cols) | 0; c = i % cols; SPR.rr(s, c * cell - e - 2, r * cell - e + 4, cell + 2 * e + 4, cell + 2 * e, cell * 0.22); s.fill(); }
      s.fillStyle = '#9db8e8';
      for (i = 0; i < cols * rows; i++) if (!hole[i]) { r = (i / cols) | 0; c = i % cols; SPR.rr(s, c * cell - e, r * cell - e, cell + 2 * e, cell + 2 * e, cell * 0.2); s.fill(); }
      s.fillStyle = '#243a66';
      for (i = 0; i < cols * rows; i++) if (!hole[i]) { r = (i / cols) | 0; c = i % cols; SPR.rr(s, c * cell - e + 2.5, r * cell - e + 2.5, cell + 2 * e - 5, cell + 2 * e - 5, cell * 0.17); s.fill(); }
      for (i = 0; i < cols * rows; i++) if (!hole[i]) {
        r = (i / cols) | 0; c = i % cols;
        s.fillStyle = (r + c) % 2 ? '#34528a' : '#2b4678';
        SPR.rr(s, c * cell + 1.5, r * cell + 1.5, cell - 3, cell - 3, cell * 0.14); s.fill();
        s.fillStyle = 'rgba(255,255,255,.05)'; s.fillRect(c * cell + 4, r * cell + 3, cell - 8, 2);
      }
      stat.pad = pad;
    }

    /* ------------------------------------------------------------ display model */
    function mkSprite(id, c, sS, ch_, cellI) {
      var p = pos(cellI);
      var s = { id: id, c: c, s: sS, ch: ch_, cell: cellI, x: p.x, y: p.y, tw: null, sc: 1, popAt: -1e9, popDur: 280, popFrom: 0.3, dieAt: -1, dieDur: 230, landAt: -1e9, a: 1, kind: 0 };
      sprites.push(s); byId[id] = s; return s;
    }
    function tweenTo(s, x, y, t0, dur, mode) { s.tw = { x0: s.x, y0: s.y, x1: x, y1: y, t0: t0, dur: dur, mode: mode || 'ease' }; }
    function load(board) {
      b = board; cols = b.w; rows = b.h; hole = b.hole;
      sprites.length = 0; byId = {}; q.length = 0; sel = -1; hint = null; V.busy = false; FX.clear(); crateHit = {};
      fit(); syncAll(true);
    }
    function syncAll(reset) {
      var bad = 0, i, info = [];
      dBlk = new Uint8Array(b.blk); dBl = new Uint8Array(b.bl); dOil = new Uint8Array(b.oil);
      var seen = {};
      for (i = 0; i < b.n; i++) {
        if (!b.has[i]) continue;
        var id = b.tid[i], s = byId[id]; seen[id] = 1;
        if (!s) { s = mkSprite(id, b.col[i], b.spc[i], b.chn[i], i); if (!reset) { bad++; info.push('missing ' + i + ' id' + id); } }
        else if (s.cell !== i || s.c !== b.col[i] || s.s !== b.spc[i] || s.ch !== b.chn[i]) { bad++; info.push('cell ' + i + ' id' + id + ' spr(cell' + s.cell + ',c' + s.c + ',s' + s.s + ',ch' + s.ch + ') board(c' + b.col[i] + ',s' + b.spc[i] + ',ch' + b.chn[i] + ')'); s.cell = i; s.c = b.col[i]; s.s = b.spc[i]; s.ch = b.chn[i]; s.tw = null; var p = pos(i); s.x = p.x; s.y = p.y; }
        if (s.dieAt >= 0 && !reset) { s.dieAt = -1; bad++; }
      }
      for (var k = sprites.length - 1; k >= 0; k--) if (!seen[sprites[k].id]) { info.push('extra id' + sprites[k].id + ' cell' + sprites[k].cell); delete byId[sprites[k].id]; sprites.splice(k, 1); bad++; }
      if (bad && !reset) V.lastSync = info.slice(0, 8);
      return bad;
    }

    /* ------------------------------------------------------------ timeline */
    function at(t, fn) { q.push({ at: t, fn: fn, n: seq++ }); }
    function spriteAt(i) { for (var k = 0; k < sprites.length; k++) if (sprites[k].cell === i && sprites[k].dieAt < 0) return sprites[k]; return null; }
    function centre(i) { var p = pos(i); return { x: p.x + cell / 2, y: p.y + cell / 2 }; }
    function tileCol(c) { return c >= 0 ? SPR.COL[c][1] : '#ffd54f'; }

    function play(events, board, o) {
      o = o || {};
      return new Promise(function (resolve) {
        kf = 1; var base = clock + 10, T = 0, grp = false, gBase = 0, gMax = 0, dmap = {}, cnt = 0, bonus = false, steps = 0, gCount = 0, gMult = 1, gX = 0, gY = 0, gN = 0;
        var cascade = 0;
        function flushCreate() { if (cnt) { T += (bonus ? 40 : 35) * cnt + 220 * kf; cnt = 0; } }
        function flush() {
          if (grp) {
            if (gCount > 0) { var cx = gX / gCount, cy = gY / gCount, val = Math.round(20 * gMult) * gCount, nn = cascade; (function (cx, cy, val, nn, tt) {
              at(base + tt, function () { FX.text(cx, cy - cell * 0.2, '+' + val, nn >= 3 ? '#ffd54f' : nn === 2 ? '#8cffb0' : '#fff', 18 + Math.min(10, nn * 3)); });
            })(cx, cy, val, nn, gBase + 60); }
            T = Math.max(T, gMax + 190 * kf); grp = false; dmap = {}; gCount = 0; gX = gY = 0;
          }
          flushCreate();
        }
        function open() { if (!grp) { flushCreate(); grp = true; gBase = T; gMax = T; dmap = {}; gCount = 0; gX = gY = 0; } }
        function atg(t, fn) { var tt = gBase + t; if (tt > gMax) gMax = tt; at(base + tt, fn); }

        events.forEach(function (ev) {
          switch (ev.t) {
            case 'swap': {
              flush();
              var a = ev.a, c = ev.b, tt = T;
              if (ev.ok) {
                at(base + tt, function () {
                  var sa = byId2(a), sc = byId2(c), pa = pos(a), pc = pos(c);
                  if (sa) { tweenTo(sa, pc.x, pc.y, clock, SWAP); sa.cell = c; }
                  if (sc) { tweenTo(sc, pa.x, pa.y, clock, SWAP); sc.cell = a; }
                  snd('swap');
                });
                T += SWAP + 30;
              } else {
                at(base + tt, function () {
                  var sa = byId2(a), sc = byId2(c), pa = pos(a), pc = pos(c);
                  if (sa) tweenTo(sa, pa.x + (pc.x - pa.x) * 0.45, pa.y + (pc.y - pa.y) * 0.45, clock, 110, 'there');
                  if (sc) tweenTo(sc, pc.x + (pa.x - pc.x) * 0.45, pc.y + (pa.y - pc.y) * 0.45, clock, 110, 'there');
                  snd('nope');
                });
                at(base + tt + 120, function () {
                  var sa = byId2(a), sc = byId2(c), pa = pos(a), pc = pos(c);
                  if (sa) tweenTo(sa, pa.x, pa.y, clock, 130); if (sc) tweenTo(sc, pc.x, pc.y, clock, 130);
                });
                T += 270;
              }
              break;
            }
            case 'cascade': flush(); cascade = ev.n; gMult = Math.min(4, 1 + 0.5 * (ev.n - 1)); (function (n, tt) { at(base + tt, function () { snd('match', n); if (n >= 2) comboWord(n); }); })(ev.n, T); break;
            case 'clear': {
              open(); var w = ev.w || 0, d = dmap[ev.i] || 0, tt = w * WAVE * kf + d;
              if (ev.s === 0 || ev.s === undefined) { gCount++; var cc = centre(ev.i); gX += cc.x; gY += cc.y; }
              atg(tt, function () {
                var s = byId[ev.id]; if (!s) return;
                s.dieAt = clock; s.dieDur = 230; var cc = centre(s.cell);
                FX.burst(cc.x, cc.y, 6, tileCol(ev.c), cell * 5, cell * 0.2, 0.5);
                FX.sparkle(cc.x, cc.y, 2, '#fff', cell * 0.5);
                if (hooks.collect && ev.c >= 0) hooks.collect('color', ev.c, cc.x, cc.y);
              });
              break;
            }
            case 'oil': open(); atg((ev.w || 0) * WAVE * kf + (dmap[ev.i] || 0), function () {
              dOil[ev.i] = 0; var cc = centre(ev.i); FX.burst(cc.x, cc.y, 7, '#6a3fb0', cell * 4, cell * 0.16, 0.55, FX.K.DOT);
              snd('oil'); if (hooks.collect) hooks.collect('oil', -1, cc.x, cc.y);
            }); break;
            case 'crate': case 'stone': open(); (function (ev) {
              atg((ev.w || 0) * WAVE * kf + (dmap[ev.i] || 0), function () {
                var cc = centre(ev.i), kind = ev.t;
                dBl[ev.i] = ev.l; crateHit[ev.i] = clock;
                if (ev.l <= 0) { dBlk[ev.i] = 0; FX.burst(cc.x, cc.y, 12, kind === 'crate' ? '#c98a43' : '#9aa4ad', cell * 6, cell * 0.22, 0.7); FX.shake(3, 0.18); if (hooks.collect && kind === 'crate') hooks.collect('crate', -1, cc.x, cc.y); }
                else FX.burst(cc.x, cc.y, 4, '#c98a43', cell * 3, cell * 0.16, 0.4);
                snd(kind === 'crate' ? 'crate' : 'stone');
              });
            })(ev); break;
            case 'chain': open(); atg((ev.w || 0) * WAVE * kf + (dmap[ev.i] || 0), function () {
              var s = byId[ev.id]; if (s) s.ch = 0; var cc = centre(ev.i);
              FX.burst(cc.x, cc.y, 8, '#cfd6dd', cell * 5, cell * 0.14, 0.6); snd('chain'); if (hooks.collect) hooks.collect('chain', -1, cc.x, cc.y);
            }); break;
            case 'blast': open(); blast(ev, dmap, atg, gBase); break;
            case 'create': {
              flushGroupOnly(); var k = cnt++; (function (ev, tt) {
                at(base + tt, function () {
                  var old = spriteAt(ev.i) || byId[ev.id], p = pos(ev.i);
                  if (old && old.id !== ev.id) { delete byId[old.id]; var ix = sprites.indexOf(old); if (ix >= 0) sprites.splice(ix, 1); }
                  var s = byId[ev.id] || mkSprite(ev.id, ev.c, ev.s, 0, ev.i);
                  s.c = ev.c; s.s = ev.s; s.cell = ev.i; s.x = p.x; s.y = p.y; s.tw = null; s.popAt = clock; s.popFrom = bonus ? 0.2 : 1.7; s.popDur = 320;
                  var cc = centre(ev.i); FX.sparkle(cc.x, cc.y, 6, '#ffe066', cell * 0.8); FX.shape(FX.S.RING, cc.x, cc.y, 0, 0, 380, '#ffe066', cell * 1.1);
                  snd('create', ev.s);
                });
              })(ev, T + (bonus ? 85 : 35) * k);
              break;
            }
            case 'convert': {
              flushGroupOnly(); var k2 = cnt++; (function (ev, tt) {
                at(base + tt, function () { var s = byId[ev.id]; if (!s) return; s.s = ev.s; s.popAt = clock; s.popFrom = 1.6; s.popDur = 260; var cc = centre(s.cell); FX.sparkle(cc.x, cc.y, 3, '#fff', cell * 0.6); snd('convert'); });
              })(ev, T + 35 * k2);
              break;
            }
            case 'fall': {
              flush(); var maxEnd = 0, tt0 = T;
              ev.moves.forEach(function (m) {
                var rowsF = Math.max(1, Math.abs(((m.to / cols) | 0) - ((m.from / cols) | 0))), dur = (70 + 95 * Math.sqrt(rowsF)) * Math.max(kf, 0.55), de = 0;
                maxEnd = Math.max(maxEnd, de + dur);
                (function (m, dur, de) { at(base + tt0 + de, function () { var s = byId[m.id]; if (!s) return; var p = pos(m.to); s.cell = m.to; tweenTo(s, p.x, p.y, clock, dur, 'fall'); s.landAt = clock + dur; }); })(m, dur, de);
              });
              var cntc = {};
              ev.spawns.forEach(function (sp2) {
                var col = sp2.to % cols, n = cntc[col] = (cntc[col] || 0) + 1, rowsF = Math.max(1, ((sp2.to / cols) | 0) - sp2.fr), dur = (70 + 95 * Math.sqrt(rowsF)) * Math.max(kf, 0.55), de = (n - 1) * 45 * kf;
                maxEnd = Math.max(maxEnd, de + dur);
                (function (sp2, dur, de) {
                  at(base + tt0 + de, function () {
                    var s = mkSprite(sp2.id, sp2.c, 0, 0, sp2.to), p = pos(sp2.to);
                    s.x = ox + (sp2.to % cols) * cell; s.y = oy + sp2.fr * cell; tweenTo(s, p.x, p.y, clock, dur, 'fall'); s.landAt = clock + dur;
                  });
                })(sp2, dur, de);
              });
              T = tt0 + maxEnd + 40 * kf;
              (function (tt) { at(base + tt, function () { snd('land'); }); })(T - 40 * kf);
              break;
            }
            case 'item': {
              flush(); (function (ev, tt) { at(base + tt, function () {
                var s = byId[ev.id]; if (!s) return; s.dieAt = clock; s.dieDur = 420; s.kind = 1; var cc = centre(ev.i);
                FX.sparkle(cc.x, cc.y, 10, '#ffe066', cell); FX.text(cc.x, cc.y - cell * 0.4, '+200', '#ffd54f', 24); snd('item');
                if (hooks.collect) hooks.collect('item', -1, cc.x, cc.y);
              }); })(ev, T);
              T += 380; break;
            }
            case 'reshuffle': {
              flush(); (function (ev, tt) {
                at(base + tt, function () {
                  if (hooks.banner) hooks.banner('Shuffle!');
                  snd('shuffle');
                  ev.moves.forEach(function (m) { var s = byId[m.id]; if (!s) return; var p = pos(m.to); s.cell = m.to; tweenTo(s, p.x, p.y, clock, 520, 'arc'); });
                  (ev.recolor || []).forEach(function (r) { var s = byId[r.id]; if (!s) return; s.c = r.c; if (r.s) s.s = r.s; s.popAt = clock; s.popFrom = 0.5; s.popDur = 300; });
                });
              })(ev, T);
              T += 620; break;
            }
            case 'bonusStart': flush(); bonus = true; kf = 0.4; (function (ev, tt) { at(base + tt, function () { if (hooks.banner) hooks.banner('Bonus time!'); snd('bonus'); }); })(ev, T); T += 450; break;
          }
        });
        function flushGroupOnly() { if (grp) flush(); else flushCreate2(); }
        function flushCreate2() { /* creates/converts keep stacking */ }
        flush();
        T += 140;
        at(base + T, function () {
          var bad = syncAll(false);
          if (bad && root.TW_DEBUG_SYNC) console.warn('boardView resync: ' + bad + ' mismatches');
          V.syncMismatch = (V.syncMismatch || 0) + bad;
          V.busy = false; resolve();
        });
        V.busy = true; q.sort(function (a, b2) { return a.at - b2.at || a.n - b2.n; });
        start();
      });

      function byId2(cellI) { return spriteAt(cellI); }
    }

    /* blast visuals; schedules per-cell clear delays into dmap */
    function blast(ev, dmap, atg, gBase) {
      var c0 = ev.i % cols, r0 = (ev.i / cols) | 0, o = centre(ev.i), kind = ev.kind, w = (ev.w || 0) * WAVE * kf, i;
      function rocketTo(dx, dy) {
        var L = dx ? (dx < 0 ? c0 + 0.5 : cols - c0 - 0.5) : (dy < 0 ? r0 + 0.5 : rows - r0 - 0.5), dur = Math.round(360 * Math.max(kf, 0.6));
        var ex = o.x + dx * L * cell, ey = o.y + dy * L * cell;
        atg(w, function () { FX.shape(FX.S.ROCKET, o.x, o.y, ex, ey, dur, '#fff', cell * 0.62); });
        ev.cells.forEach(function (j) {
          var jc = j % cols, jr = (j / cols) | 0, d = dx ? (jc - c0) * dx : (jr - r0) * dy;
          if ((dx && jr === r0 && d > 0) || (dy && jc === c0 && d > 0) || ((dx && jr === r0 || dy && jc === c0) && d === 0)) {
            var dd = Math.round(dur * Math.sqrt(Math.max(0, d) / L)); dmap[j] = Math.min(dmap[j] == null ? 1e9 : dmap[j], dd);
          }
        });
      }
      if (kind === 'H' || kind === 'V' || kind === 'cross' || kind === 'rb') {
        ev.cells.forEach(function (j) { delete dmap[j]; });
        if (kind === 'H' || kind === 'cross') { rocketTo(-1, 0); rocketTo(1, 0); }
        if (kind === 'V' || kind === 'cross') { rocketTo(0, -1); rocketTo(0, 1); }
        if (kind === 'rb') {
          for (i = -1; i <= 1; i++) {
            (function (i) {
              var rr = r0 + i, cc = c0 + i;
              if (rr >= 0 && rr < rows) { var py = oy + rr * cell + cell / 2; atg(w, function () { FX.shape(FX.S.ROCKET, o.x, py, ox + (i % 2 ? cols : 0) * cell, py, 380, '#fff', cell * 0.55); }); }
              if (cc >= 0 && cc < cols) { var px = ox + cc * cell + cell / 2; atg(w, function () { FX.shape(FX.S.ROCKET, px, o.y, px, oy + (i % 2 ? rows : 0) * cell, 380, '#fff', cell * 0.55); }); }
            })(i);
          }
          ev.cells.forEach(function (j) { var d = Math.max(Math.abs((j % cols) - c0), Math.abs(((j / cols) | 0) - r0)); dmap[j] = 40 + d * 38; });
        }
        atg(w, function () { snd('rocket'); FX.shake(kind === 'H' || kind === 'V' ? 3 : 6, 0.25); });
      } else if (kind === 'B' || kind === 'big') {
        ev.cells.forEach(function (j) { var d = Math.max(Math.abs((j % cols) - c0), Math.abs(((j / cols) | 0) - r0)); dmap[j] = 60 + d * 45; });
        var R = (kind === 'big' ? 3.6 : 2.7) * cell;
        atg(w, function () {
          FX.shape(FX.S.FLASH, o.x - R, o.y - R, R * 2, R * 2, 280, '#fff3b0'); FX.shape(FX.S.RING, o.x, o.y, 0, 0, 420, '#ffb300', R); FX.shape(FX.S.RING, o.x, o.y, 0, 0, 320, '#fff', R * 0.7, 40);
          FX.burst(o.x, o.y, kind === 'big' ? 26 : 16, '#ff7043', cell * 9, cell * 0.24, 0.7, FX.K.DOT);
          for (var s = 0; s < 6; s++) FX.smoke(o.x + (Math.random() - 0.5) * cell, o.y + (Math.random() - 0.5) * cell, '#ffb300');
          FX.shake(kind === 'big' ? 11 : 7, 0.4); snd('boom');
        });
      } else if (kind === 'G') {
        var k = 0;
        ev.cells.forEach(function (j) {
          var jc = centre(j); k++; var dl = k * 35;
          dmap[j] = 180 + dl;
          var s0 = spriteAt(j), col = s0 ? tileCol(s0.c) : '#fff';
          atg(w + dl, function () { FX.shape(FX.S.COLBEAM, o.x, o.y, jc.x, jc.y, 340, col, cell * 0.2); });
        });
        atg(w, function () { FX.shape(FX.S.RING, o.x, o.y, 0, 0, 400, '#c9a8ff', cell * 1.6); FX.sparkle(o.x, o.y, 14, '#ffe066', cell * 1.4); snd('gem'); FX.shake(3, 0.3); });
      } else if (kind === 'all') {
        ev.cells.forEach(function (j) { var d = Math.abs((j % cols) - c0) + Math.abs(((j / cols) | 0) - r0); dmap[j] = 80 + d * 40; });
        atg(w, function () {
          FX.shape(FX.S.FLASH, 0, 0, cw, ch, 500, '#ffffff'); FX.shape(FX.S.RING, o.x, o.y, 0, 0, 700, '#c9a8ff', cell * 9); FX.shape(FX.S.RING, o.x, o.y, 0, 0, 600, '#ffe066', cell * 6, 100);
          FX.sparkle(o.x, o.y, 30, '#ffe066', cell * 6); FX.shake(13, 0.6); snd('boom'); snd('gem');
        });
      }
    }

    function comboWord(n) {
      var words = ['', '', 'Nice!', 'Great!', 'Awesome!', 'Amazing!'], wd = words[Math.min(5, n)];
      var cx = ox + cols * cell / 2, cy = oy + rows * cell / 2;
      FX.text(cx, cy, wd, '#ffe066', 38 + Math.min(n, 5) * 2);
      if (n >= 3) FX.shake(2 + n, 0.2);
    }

    /* ------------------------------------------------------------ frame */
    function start() { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    var fpsAcc = 0, fpsN = 0, fpsMax = 0, fpsOn = false;
    V.fps = function (on) { if (on) { fpsAcc = fpsN = fpsMax = 0; fpsOn = true; return null; } fpsOn = false; return { avg: fpsN ? fpsAcc / fpsN : 0, max: fpsMax, frames: fpsN }; };

    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      var dtms = t - last; last = t; if (dtms > 100) dtms = 100;
      if (fpsOn) { fpsAcc += dtms; fpsN++; if (dtms > fpsMax) fpsMax = dtms; }
      clock += dtms;
      while (q.length && q[0].at <= clock) q.shift().fn();
      FX.update(dtms / 1000, clock);
      if (b) render();
    }

    function render() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, cw, ch);
      var so = FX.offset(); g.translate(so.x, so.y);
      var i, k, s;
      g.drawImage(stat, ox - stat.pad, oy - stat.pad, stat.width / dpr, stat.height / dpr);
      // oil
      g.globalAlpha = 0.92;
      for (i = 0; i < cols * rows; i++) if (dOil[i] && !hole[i]) { var p = pos(i); g.drawImage(sp.oil, p.x - cell * 0.03, p.y - cell * 0.03, cell * 1.06, cell * 1.06); }
      g.globalAlpha = 1;
      // tiles (clipped to the board so new tiles slide in from the top edge)
      g.save(); g.beginPath(); g.rect(ox - cell * 0.3, oy - cell * 0.03, cols * cell + cell * 0.6, rows * cell + cell * 0.43); g.clip();
      // hint offsets
      var hA = -1, hB = -1, hOff = 0;
      if (hint && !V.busy && !hammer) { hA = hint.a; hB = hint.b; hOff = Math.sin((clock - hintT) / 140) * Math.max(0, Math.min(1, 1 - ((clock - hintT) % 1500) / 1500 * 0)) * cell * 0.09; }
      for (k = 0; k < sprites.length; k++) { s = sprites[k]; if (s.dieAt < 0) drawSprite(s, hA, hB, hOff); }
      g.restore();
      // blocks
      for (i = 0; i < cols * rows; i++) if (dBlk[i]) drawBlock(i);
      g.save(); g.beginPath(); g.rect(ox - cell, oy - cell * 0.2, cols * cell + cell * 2, rows * cell + cell * 1.2); g.clip();
      for (k = sprites.length - 1; k >= 0; k--) {
        s = sprites[k];
        if (s.dieAt >= 0) { if (clock >= s.dieAt + s.dieDur) { delete byId[s.id]; sprites.splice(k, 1); } else drawSprite(s, -1, -1, 0); }
      }
      g.restore();
      FX.draw(g, sp);
      FX.drawTexts(g);
    }

    function drawSprite(s, hA, hB, hOff) {
      var x = s.x, y = s.y, sc = 1, sx = 1, sy = 1, al = 1, rot = 0;
      if (s.tw) {
        var u = (clock - s.tw.t0) / s.tw.dur, tw = s.tw;
        if (u >= 1) { s.x = x = tw.x1; s.y = y = tw.y1; s.tw = null; }
        else {
          if (u < 0) u = 0;
          var e = tw.mode === 'fall' ? u * u * (1.6 - 0.6 * u) : tw.mode === 'there' ? 1 - (1 - u) * (1 - u) : ease(u);
          x = tw.x0 + (tw.x1 - tw.x0) * e; y = tw.y0 + (tw.y1 - tw.y0) * e;
          if (tw.mode === 'arc') { y -= Math.sin(u * Math.PI) * cell * 0.7; sc = 1 + Math.sin(u * Math.PI) * 0.18; rot = Math.sin(u * 6.28) * 0.15; }
          s.x = tw.x0 + (tw.x1 - tw.x0) * e; s.y = tw.y0 + (tw.y1 - tw.y0) * e;
        }
      }
      if (s.cell === hA || s.cell === hB) { var o2 = s.cell === hA ? hB : hA, pa = pos(s.cell), pb = pos(o2); x += Math.sign(pb.x - pa.x) * hOff; y += Math.sign(pb.y - pa.y) * hOff; }
      if (s.dieAt >= 0) {
        var d = (clock - s.dieAt) / s.dieDur; if (d < 0) d = 0;
        if (s.kind === 1) { sc = 1 + d * 0.5; al = 1 - d * d; y -= d * cell * 0.9; rot = d * 0.5; }
        else { sc = d < 0.25 ? 1 + d : 1.25 * Math.max(0, 1 - (d - 0.25) / 0.75); al = 1 - d * d * 0.6; rot = d * 0.4 * (s.id % 2 ? 1 : -1); }
      }
      if (clock - s.popAt < s.popDur && clock >= s.popAt) { var pu = (clock - s.popAt) / s.popDur; sc *= s.popFrom + (1 - s.popFrom) * backOut(pu); }
      var lu = (clock - s.landAt) / 220;
      if (lu >= 0 && lu < 1) { var sq = Math.sin(lu * Math.PI) * (1 - lu) * 0.2; sy *= 1 - sq; sx *= 1 + sq * 0.7; y += cell * sq * 0.5; }
      var idle = 0;
      if (s.s >= 1 && s.s <= 4 && s.dieAt < 0) { idle = Math.sin(clock / 220 + s.id); sc *= 1 + 0.045 * idle; }
      if (s.c === sel || s.cell === sel) { }
      if (s.cell === sel && s.dieAt < 0) sc *= 1.1 + Math.sin(clock / 90) * 0.04;
      var size = cell * 0.96, cx = x + cell / 2, cy = y + cell / 2;
      if (idle !== 0 || s.s === 5) {
        // shimmer glow under specials
        if (s.s !== 5) { g.globalAlpha = 0.28 + 0.2 * idle; g.drawImage(s.s === 4 ? sp.glowW : sp.glowY, cx - cell * 0.9, cy - cell * 0.9, cell * 1.8, cell * 1.8); g.globalAlpha = 1; }
      }
      g.save(); g.translate(cx, cy); if (rot) g.rotate(rot); g.scale(sc * sx, sc * sy); if (al < 1) g.globalAlpha = Math.max(0, al);
      var img = s.s === 0 ? sp.tile[s.c] : s.s === 1 ? sp.rocketH[s.c] : s.s === 2 ? sp.rocketV[s.c] : s.s === 3 ? sp.bomb[s.c] : s.s === 4 ? sp.gem : sp.item;
      if (img) g.drawImage(img, -size / 2, -size / 2, size, size);
      if (s.ch) g.drawImage(sp.chain, -size / 2, -size / 2, size, size);
      g.restore();
      if (s.s >= 1 && s.s <= 4 && s.dieAt < 0) {      // travelling sparkle
        var ph = ((clock / 1100 + (s.id % 7) / 7) % 1);
        if (ph < 0.4) { var a = Math.sin(ph / 0.4 * Math.PI), px = cx - cell * 0.28 + ph / 0.4 * cell * 0.5, py = cy - cell * 0.3 + ph / 0.4 * cell * 0.3, z = cell * 0.2 * a;
          g.globalAlpha = a; g.drawImage(sp.star, px - z, py - z, z * 2, z * 2); g.globalAlpha = 1; }
      }
      if (s.cell === sel && s.dieAt < 0) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 3; SPR.rr(g, x + 2, y + 2, cell - 4, cell - 4, cell * 0.2); g.stroke(); }
    }

    function drawBlock(i) {
      var p = pos(i), l = dBl[i], img = dBlk[i] === 1 ? sp.crate[Math.max(1, Math.min(3, l))] : sp.stone, sc = 1, ox2 = 0;
      var h = crateHit[i];
      if (h != null && clock - h < 260) { var u = (clock - h) / 260; sc = 1 + Math.sin(u * Math.PI) * 0.12; ox2 = Math.sin(u * 30) * (1 - u) * cell * 0.05; }
      var size = cell * 0.98 * sc; g.drawImage(img, p.x + ox2 + (cell - size) / 2, p.y + (cell - size) / 2, size, size);
      if (dBlk[i] === 1 && l > 1) {          // layer pips
        g.fillStyle = '#fff'; g.strokeStyle = '#3d2410'; g.lineWidth = 2;
        for (var n = 0; n < l; n++) { g.beginPath(); g.arc(p.x + cell * 0.5 + (n - (l - 1) / 2) * cell * 0.2, p.y + cell * 0.86, cell * 0.06, 0, 7); g.fill(); g.stroke(); }
      }
    }

    /* ------------------------------------------------------------ input */
    var down = null;
    function cellAt(cx, cy) {
      var r = canvas.getBoundingClientRect(), x = cx - r.left - ox, y = cy - r.top - oy;
      var c = Math.floor(x / cell), rr = Math.floor(y / cell);
      if (c < 0 || rr < 0 || c >= cols || rr >= rows) return -1;
      var i = rr * cols + c; return hole && hole[i] ? -1 : i;
    }
    hit.addEventListener('pointerdown', function (e) {
      if (V.locked || V.busy || !b) return;
      e.preventDefault(); try { hit.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      var i = cellAt(e.clientX, e.clientY);
      down = { i: i, x: e.clientX, y: e.clientY, used: false };
      if (hooks.interact) hooks.interact();
    });
    hit.addEventListener('pointermove', function (e) {
      if (!down || down.used || down.i < 0 || hammer) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < cell * 0.38) return;
      var c = down.i % cols, r = (down.i / cols) | 0;
      if (Math.abs(dx) > Math.abs(dy)) c += dx > 0 ? 1 : -1; else r += dy > 0 ? 1 : -1;
      down.used = true;
      if (c < 0 || r < 0 || c >= cols || r >= rows) return;
      var j = r * cols + c; if (hole[j]) return;
      var a = down.i; sel = -1; lastTap.i = -1;
      if (hooks.swap) hooks.swap(a, j);
    });
    function up(e) {
      if (!down) return; var d = down; down = null;
      if (d.used || d.i < 0 || V.locked || V.busy) return;
      var i = d.i;
      if (hammer) { if (hooks.hammer) hooks.hammer(i); return; }
      var s = spriteAt(i), now = performance.now();
      if (sel >= 0 && sel !== i) {
        var dc = Math.abs((sel % cols) - (i % cols)), dr = Math.abs(((sel / cols) | 0) - ((i / cols) | 0));
        if (dc + dr === 1) { var a = sel; sel = -1; if (hooks.swap) hooks.swap(a, i); return; }
      }
      if (s && s.s >= 1 && s.s <= 4 && lastTap.i === i && now - lastTap.t < 380) { sel = -1; lastTap.i = -1; if (hooks.tap) hooks.tap(i); return; }
      sel = sel === i ? -1 : i; lastTap.i = i; lastTap.t = now; snd('tap');
    }
    hit.addEventListener('pointerup', up);
    hit.addEventListener('pointercancel', function () { down = null; });

    V.layout = layout; V.load = load; V.play = play; V.start = start; V.stop = stop; V.cellCenter = centre;
    V.setHint = function (m) { hint = m; hintT = clock; };
    V.setHammer = function (on) { hammer = on; sel = -1; };
    V.clearSel = function () { sel = -1; };
    V.cell = function () { return cell; }; V.origin = function () { return { x: ox, y: oy }; };
    V.rect = function () { return { x: ox, y: oy, w: cols * cell, h: rows * cell }; };
    V.displayFrom = function (board) { b = board; syncAll(true); };
    V.resync = function () { return b ? syncAll(false) : 0; };
    V.spriteCount = function () { return sprites.length; };
    V.now = function () { return clock; };
    return V;
  }

  TW.boardView = { create: create };
})(typeof self !== 'undefined' ? self : this);
