/* Island Map: sea with six islands on a winding route, locked requirements, boat travel animation. SI.map. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on, P = SI.progress, ISL = SI.islands, SP = SI.sprites;
  var TAU = Math.PI * 2, VW = 390, VH = 780;
  var POS = [[112, 650], [272, 548], [116, 440], [274, 332], [118, 226], [270, 120]];
  var host, cv, g, W = 390, Hh = 844, sc = 1, ox = 0, oy = 0, raf = 0, running = false, last = 0, t = 0, from = 'home', hud = {}, travel = null, boat = { x: 0, y: 0 }, islSprites = {};

  function build() {
    host = document.getElementById('scr-map'); host.innerHTML = '';
    cv = el('canvas', 'mapcv'); host.appendChild(cv); g = cv.getContext('2d');
    hud.top = el('div', 'topbar slim'); host.appendChild(hud.top);
    cv.addEventListener('pointerup', function (e) { if (travel) return; var r = cv.getBoundingClientRect(), x = (e.clientX - r.left - ox) / sc, y = (e.clientY - r.top - oy) / sc; tapAt(x, y); });
    root.addEventListener('resize', size);
  }
  function size() {
    if (!cv || host.classList.contains('hidden')) return; var r = host.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1); W = r.width; Hh = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
    sc = Math.min(W / VW, (Hh - 80) / VH); ox = (W - VW * sc) / 2; oy = 78 + (Hh - 80 - VH * sc) / 2; islSprites = {};
  }
  function islSprite(n, locked) {
    var key = n + (locked ? 'L' : ''), dpr = Math.min(2, root.devicePixelRatio || 1) * sc; if (islSprites[key]) return islSprites[key];
    var isl = ISL.byId[n], w = 170, h = 130, c = document.createElement('canvas'); c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); var gg = c.getContext('2d'); gg.scale(dpr, dpr);
    var P2 = isl.palette; gg.translate(w / 2, 92);
    gg.fillStyle = 'rgba(255,255,255,0.45)'; gg.beginPath(); gg.ellipse(0, 6, 78, 26, 0, 0, TAU); gg.fill();
    gg.fillStyle = P2.sand; gg.beginPath(); gg.ellipse(0, 0, 70, 24, 0, 0, TAU); gg.fill(); gg.strokeStyle = SP.dk(P2.sand, 0.2); gg.lineWidth = 2; gg.stroke();
    var gr = gg.createLinearGradient(0, -22, 0, 12); gr.addColorStop(0, P2.ground2); gr.addColorStop(1, P2.ground); gg.fillStyle = gr; gg.beginPath(); gg.ellipse(0, -5, 56, 17, 0, 0, TAU); gg.fill();
    if (isl.biome === 'snow') { gg.fillStyle = '#fff'; gg.beginPath(); gg.moveTo(-34, -10); gg.lineTo(0, -64); gg.lineTo(34, -10); gg.closePath(); gg.fill(); gg.strokeStyle = '#a9cdea'; gg.lineWidth = 2; gg.stroke(); }
    if (isl.biome === 'lab') { gg.fillStyle = '#7a4a3a'; gg.beginPath(); gg.moveTo(-30, -8); gg.lineTo(-10, -58); gg.lineTo(10, -58); gg.lineTo(30, -8); gg.closePath(); gg.fill(); gg.fillStyle = '#ff8a2a'; gg.beginPath(); gg.ellipse(0, -58, 10, 4, 0, 0, TAU); gg.fill(); }
    var props = [[-34, -4, 1], [26, -2, 2], [-6, -12, 0]];
    props.forEach(function (p, i) { var sp = SP.prop(isl.biome === 'lab' && i === 2 ? 'lab' : isl.biome, 'T', p[2], dpr); gg.drawImage(sp.c, p[0] - 84 * 0.3, p[1] - 102 * 0.6, 84 * 0.6, 112 * 0.6); });
    if (isl.biome === 'sky') { gg.fillStyle = 'rgba(255,255,255,0.9)'; [[-50, 20, 14], [-36, 24, 12], [46, 20, 13]].forEach(function (b) { gg.beginPath(); gg.arc(b[0], b[1], b[2], 0, TAU); gg.fill(); }); }
    if (locked) { gg.globalCompositeOperation = 'source-atop'; gg.fillStyle = 'rgba(70,60,110,0.55)'; gg.fillRect(-w / 2, -h, w, h * 2); gg.globalCompositeOperation = 'source-over'; }
    return (islSprites[key] = c);
  }

  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame); var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; if (document.hidden) return;
    var S = A.S, dpr = Math.min(2, root.devicePixelRatio || 1); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#8fe0ff'); gr.addColorStop(0.5, '#4fc3e8'); gr.addColorStop(1, '#2a8fd0'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    g.save(); g.translate(ox, oy); g.scale(sc, sc);
    // waves
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 2.4; g.lineCap = 'round';
    for (var i = 0; i < 26; i++) { var wx = (i * 83 + 20) % VW, wy = (i * 137 + 30) % VH, a = 0.5 + 0.5 * Math.sin(t * 1.4 + i); g.globalAlpha = a * 0.7; g.beginPath(); g.moveTo(wx - 12, wy); g.quadraticCurveTo(wx - 5, wy - 5 + Math.sin(t + i) * 2, wx, wy); g.quadraticCurveTo(wx + 5, wy + 5, wx + 12, wy); g.stroke(); }
    g.globalAlpha = 1;
    // route
    g.setLineDash([2, 12]); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,0.75)'; g.beginPath(); POS.forEach(function (p, k) { if (!k) g.moveTo(p[0], p[1]); else { var q = POS[k - 1]; g.quadraticCurveTo((p[0] + q[0]) / 2 + (k % 2 ? -50 : 50), (p[1] + q[1]) / 2, p[0], p[1]); } }); g.stroke(); g.setLineDash([]);
    // islands
    ISL.list.forEach(function (isl, k) {
      var p = POS[k], un = S.islands.unlocked.indexOf(isl.n) >= 0, bob = Math.sin(t * 1.5 + k) * 2.5, spr = islSprite(isl.n, !un);
      g.drawImage(spr, p[0] - 85, p[1] - 92 + bob, 170, 130);
      // label pill
      var label = isl.n + '  ' + isl.name; g.font = '800 14px system-ui,sans-serif'; var tw = g.measureText(label).width + 22;
      g.fillStyle = un ? 'rgba(45,27,82,0.85)' : 'rgba(70,60,110,0.8)'; g.beginPath(); g.roundRect ? g.roundRect(p[0] - tw / 2, p[1] + 34, tw, 24, 12) : g.rect(p[0] - tw / 2, p[1] + 34, tw, 24); g.fill();
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, p[0], p[1] + 46.5);
      if (!un) {
        g.font = '36px "Apple Color Emoji","Noto Color Emoji",sans-serif'; g.fillText('🔒', p[0], p[1] - 22 + bob);
        var st = P.islandStatus(S, isl.n), need = st.reqs.map(function (r) { return r.ok; }), txt = '⭐ ' + isl.starReq + (need[0] ? '' : ' + quest');
        g.font = '800 12px system-ui,sans-serif'; var w2 = g.measureText(txt).width + 18; g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.roundRect ? g.roundRect(p[0] - w2 / 2, p[1] + 62, w2, 20, 10) : g.rect(p[0] - w2 / 2, p[1] + 62, w2, 20); g.fill(); g.fillStyle = '#5a3a9a'; g.fillText(txt, p[0], p[1] + 72.5);
      } else if (S.islands.current === isl.n && !travel) {
        // "you are here" marker
        g.fillStyle = '#ffd23f'; g.strokeStyle = '#a86b00'; g.lineWidth = 2.5; var my = p[1] - 78 + Math.sin(t * 4) * 4; g.beginPath(); g.moveTo(p[0], my + 14); g.lineTo(p[0] - 10, my); g.lineTo(p[0] + 10, my); g.closePath(); g.fill(); g.stroke();
      }
    });
    // boat
    var bx, by, rot = 0;
    if (travel) {
      travel.t += dt; var k = Math.min(1, travel.t / travel.dur), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, a = POS[travel.a - 1], b = POS[travel.b - 1], cx = (a[0] + b[0]) / 2 + ((travel.a + travel.b) % 2 ? 50 : -50), cy = (a[1] + b[1]) / 2;
      bx = (1 - e) * (1 - e) * a[0] + 2 * (1 - e) * e * cx + e * e * b[0]; by = (1 - e) * (1 - e) * a[1] + 2 * (1 - e) * e * cy + e * e * b[1] + 30;
      var dx = 2 * (1 - e) * (cx - a[0]) + 2 * e * (b[0] - cx); rot = Math.max(-0.3, Math.min(0.3, dx * 0.003));
      g.fillStyle = 'rgba(255,255,255,0.5)'; for (var j = 1; j < 6; j++) { var ee = Math.max(0, e - j * 0.03); g.beginPath(); g.arc((1 - ee) * (1 - ee) * a[0] + 2 * (1 - ee) * ee * cx + ee * ee * b[0], (1 - ee) * (1 - ee) * a[1] + 2 * (1 - ee) * ee * cy + ee * ee * b[1] + 42, 7 - j, 0, TAU); g.fill(); }
      if (k >= 1) { var n = travel.b; travel = null; SI.audio.play('splash'); A.S.islands.current = n; ui.go('world', { island: n, arrive: true }); return; }
    } else { var cp = POS[A.S.islands.current - 1]; bx = cp[0] + 66; by = cp[1] + 6; }
    var bo = SP.boat(Math.min(2, root.devicePixelRatio || 1) * sc); g.save(); g.translate(bx, by + Math.sin(t * 2.2) * 3); g.rotate(rot + Math.sin(t * 1.8) * 0.04); g.drawImage(bo.c, -43 * 0.9, -46 * 0.9, 86 * 0.9, 70 * 0.9); g.restore();
    g.restore();
  }

  function tapAt(x, y) {
    var S = A.S;
    for (var k = 0; k < ISL.list.length; k++) {
      var p = POS[k]; if (Math.abs(x - p[0]) < 80 && y > p[1] - 90 && y < p[1] + 80) { choose(ISL.list[k]); return; }
    }
  }
  function choose(isl) {
    var S = A.S, un = S.islands.unlocked.indexOf(isl.n) >= 0;
    if (!un) {
      var st = P.islandStatus(S, isl.n), p = ui.popup({ title: '🔒 ' + isl.name, headCls: 'purple', cls: 'offer' });
      p.body.innerHTML = '<p>To open this island:</p><ul class="reqs">' + st.reqs.map(function (r) { return '<li class="' + (r.ok ? 'ok' : '') + '">' + (r.ok ? '✔ ' : '○ ') + ui.esc(r.text) + '</li>'; }).join('') + '</ul><button class="btn big green ok">OK</button>';
      on(p.body.querySelector('.ok'), function () { p.close(); }); SI.audio.play('nope'); return;
    }
    if (isl.n === S.islands.current) { SI.audio.play('boat'); travel = { a: isl.n, b: isl.n, t: 0, dur: 0.5 }; return; }
    SI.audio.play('boat'); travel = { a: S.islands.current, b: isl.n, t: 0, dur: 1.9 };
  }

  ui.register('map', {
    enter: function (args) {
      if (!host) build(); from = (args && args.from) || 'home'; travel = null;
      hud.top.innerHTML = ''; var bk = el('button', 'hbtn back', ui.icon('back')); bk.setAttribute('aria-label', 'Back'); on(bk, function () { if (travel) return; ui.go(from === 'world' ? 'world' : 'home', from === 'world' ? { island: A.S.islands.current } : {}); }); hud.top.appendChild(bk);
      hud.top.appendChild(el('div', 'ttitle', 'Island Map')); hud.top.appendChild(el('div', 'chips', ui.chip('star', P.totalStars(A.S))));
      size(); setTimeout(size, 30); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    },
    leave: function () { running = false; cancelAnimationFrame(raf); }
  });
  SI.map = { sail: function (n) { choose(ISL.byId[n]); }, positions: POS };
})(typeof self !== 'undefined' ? self : this);
