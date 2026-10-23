/* Effects: pooled particles (no per-frame allocation), floating score popups, timed shapes (rocket flights, beams,
 * shock rings, flashes) and screen shake. All coordinates are CSS pixels of the full-screen game canvas. TW.fx. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {};

  var N = 700, P = [], SH = 40, shapes = [], NT = 24, texts = [];
  var i;
  for (i = 0; i < N; i++) P.push({ on: 0, k: 0, x: 0, y: 0, vx: 0, vy: 0, g: 0, t: 0, life: 1, s: 1, ds: 0, r: 0, vr: 0, col: '#fff', a: 1 });
  for (i = 0; i < SH; i++) shapes.push({ on: 0, type: 0, t0: 0, dur: 1, x0: 0, y0: 0, x1: 0, y1: 0, c: '#fff', w: 1, n: 0 });
  for (i = 0; i < NT; i++) texts.push({ on: 0, x: 0, y: 0, t: 0, life: 1, text: '', col: '#fff', size: 20 });
  var cursor = 0, spr = null, shakeAmp = 0, shakeT = 0, shakeDur = 1, sx = 0, sy = 0, now = 0;

  var K = { DOT: 0, STAR: 1, GLOW: 2, SHARD: 3, RING: 4, SMOKE: 5 };
  var S = { ROCKET: 1, BEAM: 2, FLASH: 3, RING: 4, COLBEAM: 5 };

  function alloc() { for (var n = 0; n < N; n++) { cursor = (cursor + 1) % N; if (!P[cursor].on) return P[cursor]; } return P[cursor]; }
  /** Emit one particle. */
  function emit(k, x, y, vx, vy, life, size, col, g, vr) {
    var p = alloc();
    p.on = 1; p.k = k; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.g = g || 0; p.t = 0; p.life = life; p.s = size; p.ds = 0;
    p.r = Math.random() * 6.28; p.vr = vr || 0; p.col = col; p.a = 1; return p;
  }
  function burst(x, y, n, col, speed, size, life, kind) {
    for (var q = 0; q < n; q++) {
      var a = Math.random() * 6.283, v = speed * (0.35 + Math.random() * 0.8);
      var p = emit(kind == null ? K.SHARD : kind, x, y, Math.cos(a) * v, Math.sin(a) * v - speed * 0.25, life * (0.7 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), col, 900, (Math.random() - 0.5) * 14);
      p.ds = -p.s / p.life * 0.6;
    }
  }
  function sparkle(x, y, n, col, spread) {
    for (var q = 0; q < n; q++) {
      var p = emit(K.STAR, x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * spread, (Math.random() - 0.5) * 40, -20 - Math.random() * 40, 0.5 + Math.random() * 0.5, 6 + Math.random() * 8, col || '#fff', 0, (Math.random() - 0.5) * 5);
      p.ds = -p.s / p.life * 0.9;
    }
  }
  function smoke(x, y, col) {
    var p = emit(K.GLOW, x, y, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, 0.35 + Math.random() * 0.25, 16 + Math.random() * 10, col || '#ffd54f', 0, 0);
    p.ds = -p.s / p.life * 0.8;
  }
  function shape(type, x0, y0, x1, y1, dur, c, w, delay) {
    for (var q = 0; q < SH; q++) if (!shapes[q].on) {
      var s = shapes[q]; s.on = 1; s.type = type; s.t0 = now + (delay || 0); s.dur = dur; s.x0 = x0; s.y0 = y0; s.x1 = x1; s.y1 = y1; s.c = c || '#fff'; s.w = w || 1; return s;
    }
    return null;
  }
  function text(x, y, str, col, size) {
    for (var q = 0; q < NT; q++) if (!texts[q].on) {
      var t = texts[q]; t.on = 1; t.x = x; t.y = y; t.t = 0; t.life = 0.9; t.text = str; t.col = col || '#fff'; t.size = size || 22; return;
    }
  }
  function shake(amp, dur) { if (amp >= shakeAmp * (1 - shakeT / shakeDur)) { shakeAmp = amp; shakeDur = dur || 0.3; shakeT = 0; } }
  function clear() { var q; for (q = 0; q < N; q++) P[q].on = 0; for (q = 0; q < SH; q++) shapes[q].on = 0; for (q = 0; q < NT; q++) texts[q].on = 0; shakeAmp = 0; }
  function busy() { var q; for (q = 0; q < SH; q++) if (shapes[q].on) return true; return false; }

  function update(dt, tnow) {
    now = tnow;
    var q, p;
    for (q = 0; q < N; q++) {
      p = P[q]; if (!p.on) continue;
      p.t += dt; if (p.t >= p.life) { p.on = 0; continue; }
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.s += p.ds * dt;
      if (p.k === K.SMOKE) p.vy -= 20 * dt;
    }
    for (q = 0; q < NT; q++) { var t = texts[q]; if (!t.on) continue; t.t += dt; t.y -= 38 * dt; if (t.t >= t.life) t.on = 0; }
    for (q = 0; q < SH; q++) { var s = shapes[q]; if (s.on && now >= s.t0 + s.dur) s.on = 0; }
    if (shakeAmp > 0) {
      shakeT += dt;
      if (shakeT >= shakeDur) { shakeAmp = 0; sx = sy = 0; }
      else { var k = shakeAmp * (1 - shakeT / shakeDur); sx = (Math.random() - 0.5) * 2 * k; sy = (Math.random() - 0.5) * 2 * k; }
    }
  }
  function offset() { return { x: sx, y: sy }; }

  function drawShapes(g, sprites) {
    for (var q = 0; q < SH; q++) {
      var s = shapes[q]; if (!s.on || now < s.t0) continue;
      var u = (now - s.t0) / s.dur, x, y;
      if (s.type === S.ROCKET) {          // flying rocket glyph + trail
        var e = u * u; x = s.x0 + (s.x1 - s.x0) * e; y = s.y0 + (s.y1 - s.y0) * e;
        var ang = Math.atan2(s.y1 - s.y0, s.x1 - s.x0), sz = s.w;
        g.save(); g.translate(x, y); g.rotate(ang);
        g.globalAlpha = 0.9; g.drawImage(sprites.glowO, -sz * 1.3, -sz * 0.9, sz * 1.6, sz * 1.8);
        g.globalAlpha = 1; g.fillStyle = '#ffb300'; g.beginPath(); g.moveTo(-sz * 0.4, 0); g.lineTo(-sz * 1.1 - Math.random() * sz * 0.3, -sz * 0.2); g.lineTo(-sz * 1.1 - Math.random() * sz * 0.3, sz * 0.2); g.closePath(); g.fill();
        g.fillStyle = '#fff'; g.strokeStyle = '#33291a'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-sz * 0.45, -sz * 0.2); g.lineTo(sz * 0.2, -sz * 0.22); g.quadraticCurveTo(sz * 0.6, -sz * 0.1, sz * 0.65, 0); g.quadraticCurveTo(sz * 0.6, sz * 0.1, sz * 0.2, sz * 0.22); g.lineTo(-sz * 0.45, sz * 0.2); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#e53935'; g.beginPath(); g.moveTo(sz * 0.3, -sz * 0.2); g.quadraticCurveTo(sz * 0.6, -sz * 0.1, sz * 0.65, 0); g.quadraticCurveTo(sz * 0.6, sz * 0.1, sz * 0.3, sz * 0.2); g.closePath(); g.fill();
        g.restore();
        if (Math.random() < 0.8) smoke(x, y, '#ffb300');
      } else if (s.type === S.BEAM || s.type === S.COLBEAM) {
        var a = u < 0.25 ? u / 0.25 : 1 - (u - 0.25) / 0.75;
        g.save(); g.globalAlpha = Math.max(0, a); g.lineCap = 'round';
        g.strokeStyle = s.c; g.lineWidth = s.w * (s.type === S.COLBEAM ? 1 : (1 - u * 0.5)) * 2.2; g.beginPath(); g.moveTo(s.x0, s.y0); g.lineTo(s.x1, s.y1); g.stroke();
        g.strokeStyle = '#fff'; g.lineWidth = s.w * 0.9; g.beginPath(); g.moveTo(s.x0, s.y0); g.lineTo(s.x1, s.y1); g.stroke();
        g.restore();
      } else if (s.type === S.FLASH) {
        g.save(); g.globalAlpha = (1 - u) * 0.65; g.fillStyle = s.c; g.fillRect(s.x0, s.y0, s.x1, s.y1); g.restore();
      } else if (s.type === S.RING) {
        g.save(); g.globalAlpha = (1 - u) * 0.9; g.strokeStyle = s.c; g.lineWidth = 3 + 10 * (1 - u);
        g.beginPath(); g.arc(s.x0, s.y0, s.w * (0.15 + u * 0.85), 0, 7); g.stroke();
        g.globalAlpha = (1 - u) * 0.35; g.fillStyle = s.c; g.beginPath(); g.arc(s.x0, s.y0, s.w * (0.15 + u * 0.85), 0, 7); g.fill(); g.restore();
      }
    }
  }

  function draw(g, sprites) {
    var q, p;
    drawShapes(g, sprites);
    for (q = 0; q < N; q++) {
      p = P[q]; if (!p.on) continue;
      var a = 1 - p.t / p.life, s = p.s; if (s < 0.5) continue;
      g.globalAlpha = a > 1 ? 1 : a;
      if (p.k === K.DOT) { g.fillStyle = p.col; g.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
      else if (p.k === K.STAR) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.drawImage(p.col === '#ffe066' ? sprites.starY : sprites.star, -s, -s, s * 2, s * 2); g.restore(); }
      else if (p.k === K.GLOW) { g.drawImage(p.col === '#ffd54f' ? sprites.glowY : p.col === '#ffb300' ? sprites.glowO : sprites.glowW, p.x - s, p.y - s, s * 2, s * 2); }
      else if (p.k === K.SHARD) { g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.col; g.fillRect(-s / 2, -s / 3, s, s * 0.66); g.restore(); }
    }
    g.globalAlpha = 1;
  }
  function drawTexts(g) {
    g.textAlign = 'center'; g.lineJoin = 'round';
    for (var q = 0; q < NT; q++) {
      var t = texts[q]; if (!t.on) continue;
      var u = t.t / t.life, sc = u < 0.15 ? 0.5 + u / 0.15 * 0.7 : u < 0.3 ? 1.2 - (u - 0.15) / 0.15 * 0.2 : 1;
      g.globalAlpha = u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
      g.font = '900 ' + Math.round(t.size * sc) + 'px "Trebuchet MS", system-ui, sans-serif';
      g.lineWidth = 5; g.strokeStyle = 'rgba(30,20,60,.9)'; g.strokeText(t.text, t.x, t.y);
      g.fillStyle = t.col; g.fillText(t.text, t.x, t.y);
    }
    g.globalAlpha = 1;
  }

  TW.fx = { K: K, S: S, emit: emit, burst: burst, sparkle: sparkle, smoke: smoke, shape: shape, text: text, shake: shake, clear: clear,
    update: update, draw: draw, drawTexts: drawTexts, offset: offset, busy: busy };
})(typeof self !== 'undefined' ? self : this);
