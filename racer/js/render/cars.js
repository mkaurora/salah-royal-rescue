/* Vehicles seen from behind (OutRun view), drawn procedurally once and cached: the player's car (paint, decal and
 * body from the garage, 5 steering poses), traffic cars and trucks (8 colours) and the five bosses.
 * Every sprite carries .lights = { l: [x, y], r: [x, y], w, h } in metres from its bottom centre, so the renderer
 * can add tail-light glows and blinkers at run time. Browser only: RR.cars. */
(function (root) {
  'use strict';
  var P = root.RR.paint;

  var TRAFFIC_COLORS = ['#e84a4a', '#3d7be8', '#f2c230', '#33b06a', '#eef0f3', '#7a4fd6', '#ff8a2a', '#4a5568'];
  var PPM = 110;               // pixels per metre for cars (they are seen close up)

  function frame(W, H, u, turn) {
    var cx = W / 2 + turn * 0.05 * u, base = H - 0.04 * u;
    return {
      X: function (m) { return cx + m * u; },
      Y: function (m) { return base - m * u; },
      cx: cx, base: base, u: u
    };
  }

  function wheel(ctx, f, x, w, h, big) {
    var u = f.u, X = f.X(x - w / 2), Y = f.Y(h);
    ctx.fillStyle = '#16171c';
    P.rrect(ctx, X, Y, w * u, h * u, 0.09 * u); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (var i = 1; i < (big ? 7 : 5); i++) ctx.fillRect(X + 0.03 * u, Y + i * h * u / (big ? 7 : 5), w * u - 0.06 * u, 0.025 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(X + 0.03 * u, Y + 0.03 * u, w * u * 0.25, h * u - 0.06 * u);
  }

  function glass(ctx, f, pts, r) {
    var u = f.u, y0 = Math.min.apply(null, pts.map(function (p) { return p[1]; })),
      y1 = Math.max.apply(null, pts.map(function (p) { return p[1]; }));
    var px = pts.map(function (p) { return [f.X(p[0]), f.Y(p[1])]; });
    P.rpoly(ctx, px, r * u);
    ctx.fillStyle = P.lin(ctx, 0, f.Y(y1), 0, f.Y(y0), [[0, '#2a3c5c'], [0.55, '#1a2740'], [1, '#0e1626']]);
    ctx.fill();
    // sky reflection streak
    ctx.save(); ctx.clip();
    ctx.fillStyle = 'rgba(190,225,255,0.28)';
    ctx.beginPath();
    ctx.moveTo(f.X(-0.4), f.Y(y1 + 0.1)); ctx.lineTo(f.X(-0.1), f.Y(y1 + 0.1));
    ctx.lineTo(f.X(-0.45), f.Y(y0 - 0.1)); ctx.lineTo(f.X(-0.75), f.Y(y0 - 0.1)); ctx.fill();
    ctx.fillStyle = 'rgba(190,225,255,0.14)';
    ctx.beginPath();
    ctx.moveTo(f.X(0.05), f.Y(y1 + 0.1)); ctx.lineTo(f.X(0.15), f.Y(y1 + 0.1));
    ctx.lineTo(f.X(-0.2), f.Y(y0 - 0.1)); ctx.lineTo(f.X(-0.3), f.Y(y0 - 0.1)); ctx.fill();
    ctx.restore();
  }

  function paintFill(ctx, f, color, yTop, yBot, shiny) {
    return P.lin(ctx, 0, f.Y(yTop), 0, f.Y(yBot), shiny ?
      [[0, P.shade(color, 0.75)], [0.18, P.shade(color, 0.3)], [0.45, color], [0.62, P.shade(color, -0.25)], [0.75, P.shade(color, 0.15)], [1, P.shade(color, -0.45)]] :
      [[0, P.shade(color, 0.45)], [0.25, P.shade(color, 0.12)], [0.6, color], [1, P.shade(color, -0.4)]]);
  }

  function tailLight(ctx, f, x, y, w, h, color) {
    var u = f.u;
    P.rrect(ctx, f.X(x - w / 2), f.Y(y + h / 2), w * u, h * u, Math.min(w, h) * 0.45 * u);
    ctx.fillStyle = P.lin(ctx, 0, f.Y(y + h / 2), 0, f.Y(y - h / 2), [[0, P.shade(color, 0.35)], [0.5, color], [1, P.shade(color, -0.35)]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.018 * u; ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,230,0.55)';
    P.rrect(ctx, f.X(x - w / 2 + 0.04), f.Y(y + h / 2 - 0.025), (w - 0.08) * u, h * 0.28 * u, h * 0.14 * u); ctx.fill();
  }

  function plate(ctx, f, y, text, w) {
    var u = f.u; w = w || 0.5;
    P.rrect(ctx, f.X(-w / 2), f.Y(y + 0.075), w * u, 0.15 * u, 0.02 * u);
    ctx.fillStyle = '#f7f7f2'; ctx.fill();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 0.012 * u; ctx.stroke();
    if (text) {
      ctx.fillStyle = '#1b2a6b';
      ctx.font = '900 ' + (0.105 * u) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(text, f.X(0), f.Y(y) + 0.005 * u);
    }
  }

  /** Body outline (rear view): bottom width bw, shoulder at yS, top yT, inset of the shoulder curve. */
  function bodyPath(ctx, f, bw, yB, yS, yT, inset) {
    var h = bw / 2;
    P.rpoly(ctx, [[f.X(-h), f.Y(yB)], [f.X(-h + 0.02), f.Y(yS)], [f.X(-h + inset), f.Y(yT)],
      [f.X(h - inset), f.Y(yT)], [f.X(h - 0.02), f.Y(yS)], [f.X(h), f.Y(yB)]], 0.12 * f.u);
  }

  /* ------------------------------------------------------------------ decals */

  function decal(ctx, f, kind, color, box) {
    var u = f.u, c2 = P.hex(color)[0] + P.hex(color)[1] + P.hex(color)[2] > 600 ? '#1b2a6b' : '#ffffff';
    ctx.save();
    bodyPath(ctx, f, box.bw, box.yB, box.yS, box.yT, box.inset);
    ctx.clip();
    if (kind === 'stripes') {
      ctx.fillStyle = c2;
      ctx.globalAlpha = 0.92;
      ctx.fillRect(f.X(-0.24), f.Y(box.yT + 1), 0.16 * u, 3 * u);
      ctx.fillRect(f.X(0.08), f.Y(box.yT + 1), 0.16 * u, 3 * u);
    } else if (kind === 'number') {
      var y = (box.yS + box.yB) / 2 + 0.06;
      P.circle(ctx, f.X(0), f.Y(y), 0.2 * u, '#ffffff');
      ctx.strokeStyle = '#1b2a6b'; ctx.lineWidth = 0.03 * u; ctx.stroke();
      ctx.fillStyle = '#e8322f';
      ctx.font = '900 ' + (0.3 * u) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('7', f.X(0), f.Y(y) + 0.02 * u);
    } else if (kind === 'stars') {
      ctx.fillStyle = c2 === '#ffffff' ? '#fff6b0' : '#1b2a6b';
      var pts = [[-0.7, 0.62, 0.09], [-0.48, 0.5, 0.06], [0.66, 0.6, 0.1], [0.45, 0.45, 0.06], [0, 0.72, 0.07], [-0.2, 0.42, 0.05], [0.25, 0.68, 0.05]];
      pts.forEach(function (p) { P.star(ctx, f.X(p[0]), f.Y(p[1]), p[2] * u, p[2] * 0.45 * u); ctx.fill(); });
    } else if (kind === 'flames') {
      var g = P.lin(ctx, 0, f.Y(box.yB), 0, f.Y(box.yT), [[0, '#ffe14d'], [0.5, '#ff8a1a'], [1, '#e8322f']]);
      ctx.fillStyle = g;
      [-1, 1].forEach(function (s) {
        ctx.beginPath();
        ctx.moveTo(f.X(s * box.bw / 2), f.Y(box.yB));
        for (var k = 0; k <= 4; k++) {
          var x = s * (box.bw / 2 - k * 0.12), tip = box.yB + 0.22 + (k % 2 ? 0.1 : 0.28);
          ctx.quadraticCurveTo(f.X(x - s * 0.02), f.Y(tip), f.X(x - s * 0.08), f.Y(box.yB + 0.12));
        }
        ctx.lineTo(f.X(s * (box.bw / 2 - 0.6)), f.Y(box.yB));
        ctx.closePath(); ctx.fill();
      });
    }
    ctx.restore();
  }

  /* ------------------------------------------------------------------ car bodies */

  /** o: { color, body: racer|super|buggy|sedan|hatch, decal, turn, plate, shiny } */
  function paintCar(ctx, W, H, u, o) {
    var turn = o.turn || 0, f = frame(W, H, u, turn), color = o.color, body = o.body || 'racer';
    var spec = {
      racer: { bw: 1.86, yB: 0.2, yS: 0.66, yT: 0.8, inset: 0.18, cab: [0.66, 0.5, 0.8, 1.2], wheel: [0.3, 0.56], tl: [0.62, 0.58, 0.42, 0.13] },
      super: { bw: 2.0, yB: 0.14, yS: 0.5, yT: 0.62, inset: 0.22, cab: [0.62, 0.42, 0.62, 0.98], wheel: [0.34, 0.5], tl: [0, 0.48, 1.6, 0.07] },
      buggy: { bw: 1.62, yB: 0.36, yS: 0.66, yT: 0.76, inset: 0.12, cab: null, wheel: [0.42, 0.78], tl: [0.56, 0.6, 0.22, 0.13] },
      sedan: { bw: 1.8, yB: 0.2, yS: 0.74, yT: 0.88, inset: 0.14, cab: [0.72, 0.6, 0.88, 1.42], wheel: [0.28, 0.56], tl: [0.6, 0.66, 0.4, 0.16] },
      hatch: { bw: 1.72, yB: 0.2, yS: 0.76, yT: 0.9, inset: 0.12, cab: [0.7, 0.64, 0.9, 1.5], wheel: [0.27, 0.54], tl: [0.66, 0.9, 0.16, 0.34] }
    }[body] || null;
    var s = spec, hw = s.bw / 2;
    // side panel peeking out when the car turns (we see the side facing away from the turn)
    if (turn) {
      var side = turn > 0 ? -1 : 1, pw = Math.abs(turn) * 0.16;
      ctx.fillStyle = P.shade(color, -0.35);
      P.rpoly(ctx, [[f.X(side * hw), f.Y(s.yB)], [f.X(side * (hw + pw)), f.Y(s.yB + 0.05)], [f.X(side * (hw + pw * 0.8)), f.Y(s.yS)],
        [f.X(side * (hw - 0.05)), f.Y(s.yT)]], 0.05 * u);
      ctx.fill();
      wheel(ctx, f, side * (hw + pw * 0.4 - 0.05), 0.2 + pw * 0.5, s.wheel[1], body === 'buggy');
    }
    // wheels
    wheel(ctx, f, -hw + s.wheel[0] / 2 + 0.02, s.wheel[0], s.wheel[1], body === 'buggy');
    wheel(ctx, f, hw - s.wheel[0] / 2 - 0.02, s.wheel[0], s.wheel[1], body === 'buggy');

    if (body === 'buggy') return paintBuggy(ctx, f, s, o);

    // underside / diffuser
    ctx.fillStyle = '#1d1f26';
    P.rrect(ctx, f.X(-hw * 0.92), f.Y(s.yB + 0.12), s.bw * 0.92 * u, 0.16 * u, 0.06 * u); ctx.fill();
    // cabin (behind the body top)
    if (s.cab) {
      var cb = s.cab, sh = turn * 0.07;
      ctx.fillStyle = paintFill(ctx, f, color, cb[3], cb[2], o.shiny);
      P.rpoly(ctx, [[f.X(-cb[0] + sh), f.Y(cb[2] - 0.02)], [f.X(-cb[1] + sh * 1.6), f.Y(cb[3])], [f.X(cb[1] + sh * 1.6), f.Y(cb[3])],
        [f.X(cb[0] + sh), f.Y(cb[2] - 0.02)]], 0.1 * u);
      ctx.fill();
      glass(ctx, f, [[-cb[0] + 0.08 + sh, cb[2] + 0.02], [-cb[1] + 0.06 + sh * 1.6, cb[3] - 0.06], [cb[1] - 0.06 + sh * 1.6, cb[3] - 0.06],
        [cb[0] - 0.08 + sh, cb[2] + 0.02]], 0.06);
      if (o.driver) {     // helmet silhouette through the glass
        P.ellipse(ctx, f.X(-0.22 + sh * 1.3), f.Y(cb[2] + (cb[3] - cb[2]) * 0.55), 0.13 * u, 0.15 * u, 'rgba(10,14,24,0.65)');
      }
    }
    // main body
    bodyPath(ctx, f, s.bw, s.yB, s.yS, s.yT, s.inset);
    ctx.fillStyle = paintFill(ctx, f, color, s.yT, s.yB, o.shiny);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.02 * u; ctx.stroke();
    if (o.decal && o.decal !== 'none') decal(ctx, f, o.decal, color, s);
    // shoulder highlight
    ctx.fillStyle = 'rgba(255,255,255,' + (o.shiny ? 0.5 : 0.32) + ')';
    P.rrect(ctx, f.X(-hw + s.inset + 0.05), f.Y(s.yT - 0.015), (s.bw - 2 * s.inset - 0.1) * u, 0.035 * u, 0.02 * u); ctx.fill();
    // trunk line
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.015 * u;
    ctx.beginPath(); ctx.moveTo(f.X(-hw + 0.25), f.Y(s.yS - 0.02)); ctx.lineTo(f.X(hw - 0.25), f.Y(s.yS - 0.02)); ctx.stroke();
    // bumper
    ctx.fillStyle = P.lin(ctx, 0, f.Y(s.yB + 0.18), 0, f.Y(s.yB - 0.02), [[0, '#3a3d46'], [1, '#17181d']]);
    P.rrect(ctx, f.X(-hw + 0.02), f.Y(s.yB + 0.17), (s.bw - 0.04) * u, 0.2 * u, 0.08 * u); ctx.fill();
    // lights
    var tl = s.tl, lights;
    if (body === 'super') {
      tailLight(ctx, f, 0, tl[1], tl[2], tl[3], '#ff2a3a');
      tailLight(ctx, f, -0.78, tl[1] - 0.02, 0.3, 0.1, '#ff2a3a');
      tailLight(ctx, f, 0.78, tl[1] - 0.02, 0.3, 0.1, '#ff2a3a');
      lights = { l: [-0.78, tl[1]], r: [0.78, tl[1]], w: 0.3, h: 0.1 };
    } else {
      tailLight(ctx, f, -tl[0], tl[1], tl[2], tl[3], '#ff2a3a');
      tailLight(ctx, f, tl[0], tl[1], tl[2], tl[3], '#ff2a3a');
      // amber indicator segments
      ctx.fillStyle = '#ffb02e';
      P.rrect(ctx, f.X(-tl[0] - tl[2] / 2 + 0.02), f.Y(tl[1] - tl[3] / 2 + 0.035), 0.09 * u, 0.04 * u, 0.015 * u); ctx.fill();
      P.rrect(ctx, f.X(tl[0] + tl[2] / 2 - 0.11), f.Y(tl[1] - tl[3] / 2 + 0.035), 0.09 * u, 0.04 * u, 0.015 * u); ctx.fill();
      lights = { l: [-tl[0], tl[1]], r: [tl[0], tl[1]], w: tl[2], h: tl[3] };
    }
    plate(ctx, f, s.yB + 0.18 + (body === 'super' ? 0.04 : 0.1), o.plate || '', 0.46);
    // exhausts
    [-0.5, 0.5].forEach(function (x) {
      if (body === 'sedan' || body === 'hatch') { if (x > 0) return; }
      P.ellipse(ctx, f.X(x), f.Y(s.yB + 0.03), 0.07 * u, 0.05 * u, '#9aa0a8');
      P.ellipse(ctx, f.X(x), f.Y(s.yB + 0.03), 0.045 * u, 0.03 * u, '#111');
    });
    // wings
    if (body === 'racer' || body === 'super') {
      var wy = body === 'racer' ? 0.98 : 0.8, ww = body === 'racer' ? 1.7 : 1.94;
      ctx.fillStyle = '#1f2128';
      ctx.fillRect(f.X(-0.5), f.Y(wy), 0.07 * u, (wy - s.yT + 0.02) * u);
      ctx.fillRect(f.X(0.43), f.Y(wy), 0.07 * u, (wy - s.yT + 0.02) * u);
      P.rrect(ctx, f.X(-ww / 2), f.Y(wy + 0.06), ww * u, 0.09 * u, 0.04 * u);
      ctx.fillStyle = paintFill(ctx, f, color, wy + 0.06, wy - 0.03, o.shiny); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.018 * u; ctx.stroke();
      ctx.fillStyle = '#1f2128';
      ctx.fillRect(f.X(-ww / 2), f.Y(wy + 0.1), 0.05 * u, 0.2 * u);
      ctx.fillRect(f.X(ww / 2 - 0.05), f.Y(wy + 0.1), 0.05 * u, 0.2 * u);
    }
    return lights;
  }

  function paintBuggy(ctx, f, s, o) {
    var u = f.u, color = o.color, hw = s.bw / 2, sh = (o.turn || 0) * 0.06;
    // engine block + exhaust pipes
    ctx.fillStyle = '#3b3f48';
    P.rrect(ctx, f.X(-0.42), f.Y(0.62), 0.84 * u, 0.3 * u, 0.06 * u); ctx.fill();
    ctx.fillStyle = '#8e949c';
    P.rrect(ctx, f.X(-0.3), f.Y(0.56), 0.6 * u, 0.12 * u, 0.04 * u); ctx.fill();
    // driver: seat + helmet
    P.ellipse(ctx, f.X(sh), f.Y(1.08), 0.2 * u, 0.22 * u, '#f5f5f5');
    ctx.fillStyle = color; P.rrect(ctx, f.X(-0.2 + sh), f.Y(1.12), 0.4 * u, 0.08 * u, 0.03 * u); ctx.fill();
    ctx.fillStyle = '#20232b'; P.rrect(ctx, f.X(-0.28), f.Y(0.88), 0.56 * u, 0.12 * u, 0.04 * u); ctx.fill();
    // body tub
    bodyPath(ctx, f, s.bw, s.yB, s.yS, s.yT, s.inset);
    ctx.fillStyle = paintFill(ctx, f, color, s.yT, s.yB, o.shiny); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.02 * u; ctx.stroke();
    if (o.decal && o.decal !== 'none') decal(ctx, f, o.decal, color, s);
    // roll cage
    ctx.strokeStyle = '#2b2e36'; ctx.lineWidth = 0.07 * u;
    ctx.beginPath();
    ctx.moveTo(f.X(-0.62), f.Y(0.74)); ctx.lineTo(f.X(-0.48 + sh), f.Y(1.42)); ctx.lineTo(f.X(0.48 + sh), f.Y(1.42)); ctx.lineTo(f.X(0.62), f.Y(0.74));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.02 * u;
    ctx.beginPath(); ctx.moveTo(f.X(-0.47 + sh), f.Y(1.44)); ctx.lineTo(f.X(0.47 + sh), f.Y(1.44)); ctx.stroke();
    // fenders over the big wheels
    ctx.fillStyle = P.shade(color, -0.3);
    P.rrect(ctx, f.X(-hw - 0.08), f.Y(0.86), 0.5 * u, 0.1 * u, 0.04 * u); ctx.fill();
    P.rrect(ctx, f.X(hw - 0.42), f.Y(0.86), 0.5 * u, 0.1 * u, 0.04 * u); ctx.fill();
    tailLight(ctx, f, -s.tl[0], s.tl[1], s.tl[2], s.tl[3], '#ff2a3a');
    tailLight(ctx, f, s.tl[0], s.tl[1], s.tl[2], s.tl[3], '#ff2a3a');
    plate(ctx, f, 0.46, o.plate || '', 0.4);
    // light bar on the cage
    ctx.fillStyle = '#ffe680';
    [-0.3, -0.1, 0.1, 0.3].forEach(function (x) { P.circle(ctx, f.X(x + sh), f.Y(1.5), 0.05 * u, '#ffe680'); });
    return { l: [-s.tl[0], s.tl[1]], r: [s.tl[0], s.tl[1]], w: s.tl[2], h: s.tl[3] };
  }

  /* ------------------------------------------------------------------ trucks, bosses */

  function paintBoxTruck(ctx, W, H, u, color) {
    var f = frame(W, H, u, 0);
    wheel(ctx, f, -0.9, 0.36, 0.7); wheel(ctx, f, 0.9, 0.36, 0.7);
    ctx.fillStyle = '#22252c'; ctx.fillRect(f.X(-1.05), f.Y(0.6), 2.1 * u, 0.2 * u);
    // box
    P.rrect(ctx, f.X(-1.15), f.Y(3.0), 2.3 * u, 2.4 * u, 0.08 * u);
    ctx.fillStyle = P.lin(ctx, f.X(-1.15), 0, f.X(1.15), 0, [[0, P.shade(color, -0.15)], [0.5, P.shade(color, 0.25)], [1, P.shade(color, -0.2)]]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.03 * u; ctx.stroke();
    // doors
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.025 * u;
    ctx.beginPath(); ctx.moveTo(f.X(0), f.Y(2.9)); ctx.lineTo(f.X(0), f.Y(0.72)); ctx.stroke();
    ctx.fillStyle = '#c9ced6';
    [-0.5, 0.5].forEach(function (x) { ctx.fillRect(f.X(x - 0.03), f.Y(2.6), 0.06 * u, 1.6 * u); });
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(f.X(-1.1), f.Y(2.95), 2.2 * u, 0.1 * u);
    // bumper + lights
    ctx.fillStyle = '#2a2d34'; P.rrect(ctx, f.X(-1.15), f.Y(0.78), 2.3 * u, 0.2 * u, 0.05 * u); ctx.fill();
    tailLight(ctx, f, -0.92, 0.7, 0.3, 0.14, '#ff2a3a');
    tailLight(ctx, f, 0.92, 0.7, 0.3, 0.14, '#ff2a3a');
    plate(ctx, f, 0.68, '', 0.42);
    return { l: [-0.92, 0.7], r: [0.92, 0.7], w: 0.3, h: 0.14 };
  }

  var BOSS = {
    // Robber Van: dark blue van, a cartoon mask on the doors, a money bag on the roof rack
    van: { w: 2.5, h: 2.9, draw: function (ctx, W, H, u) {
      var f = frame(W, H, u, 0);
      wheel(ctx, f, -0.88, 0.34, 0.62); wheel(ctx, f, 0.88, 0.34, 0.62);
      P.rpoly(ctx, [[f.X(-1.08), f.Y(0.4)], [f.X(-1.08), f.Y(2.05)], [f.X(-0.95), f.Y(2.3)], [f.X(0.95), f.Y(2.3)], [f.X(1.08), f.Y(2.05)], [f.X(1.08), f.Y(0.4)]], 0.14 * u);
      ctx.fillStyle = P.lin(ctx, 0, f.Y(2.3), 0, f.Y(0.4), [[0, '#5a6fd8'], [0.3, '#3446a8'], [1, '#1b2463']]); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.03 * u; ctx.stroke();
      glass(ctx, f, [[-0.95, 1.6], [-0.9, 2.12], [-0.08, 2.12], [-0.08, 1.6]], 0.05);
      glass(ctx, f, [[0.08, 1.6], [0.08, 2.12], [0.9, 2.12], [0.95, 1.6]], 0.05);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.025 * u;
      ctx.beginPath(); ctx.moveTo(f.X(0), f.Y(2.2)); ctx.lineTo(f.X(0), f.Y(0.55)); ctx.stroke();
      // mask logo
      P.rrect(ctx, f.X(-0.62), f.Y(1.32), 1.24 * u, 0.36 * u, 0.18 * u); ctx.fillStyle = '#111'; ctx.fill();
      P.ellipse(ctx, f.X(-0.3), f.Y(1.14), 0.16 * u, 0.1 * u, '#fff'); P.ellipse(ctx, f.X(0.3), f.Y(1.14), 0.16 * u, 0.1 * u, '#fff');
      P.circle(ctx, f.X(-0.27), f.Y(1.13), 0.05 * u, '#111'); P.circle(ctx, f.X(0.33), f.Y(1.13), 0.05 * u, '#111');
      // roof rack + money bag
      ctx.fillStyle = '#2a2d34'; ctx.fillRect(f.X(-0.9), f.Y(2.38), 1.8 * u, 0.07 * u);
      P.ellipse(ctx, f.X(0.25), f.Y(2.66), 0.32 * u, 0.28 * u, '#c8a35a');
      ctx.fillStyle = '#8a6a2a'; ctx.fillRect(f.X(0.17), f.Y(2.96), 0.16 * u, 0.1 * u);
      ctx.fillStyle = '#2f7a2f'; ctx.font = '900 ' + (0.36 * u) + 'px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('$', f.X(0.25), f.Y(2.64));
      ctx.fillStyle = '#25272e'; P.rrect(ctx, f.X(-1.12), f.Y(0.62), 2.24 * u, 0.22 * u, 0.06 * u); ctx.fill();
      tailLight(ctx, f, -0.95, 1.0, 0.18, 0.5, '#ff2a3a'); tailLight(ctx, f, 0.95, 1.0, 0.18, 0.5, '#ff2a3a');
      plate(ctx, f, 0.53, 'R0BB3R', 0.5);
      return { l: [-0.95, 1.0], r: [0.95, 1.0], w: 0.18, h: 0.5 };
    } },
    // Sand Truck: orange dump truck, sand heaped in the bed, dual wheels
    sandtruck: { w: 2.9, h: 3.3, draw: function (ctx, W, H, u) {
      var f = frame(W, H, u, 0);
      [-1.1, -0.78, 0.78, 1.1].forEach(function (x) { wheel(ctx, f, x, 0.32, 0.9, true); });
      ctx.fillStyle = '#25272e'; ctx.fillRect(f.X(-1.0), f.Y(0.95), 2 * u, 0.3 * u);
      // sand heap
      ctx.fillStyle = P.lin(ctx, 0, f.Y(3.3), 0, f.Y(2.5), [[0, '#ffd890'], [1, '#d99a4a']]);
      ctx.beginPath(); ctx.moveTo(f.X(-1.2), f.Y(2.5));
      ctx.quadraticCurveTo(f.X(-0.6), f.Y(3.35), f.X(0.1), f.Y(3.2)); ctx.quadraticCurveTo(f.X(0.8), f.Y(3.1), f.X(1.2), f.Y(2.5)); ctx.fill();
      // bed
      P.rpoly(ctx, [[f.X(-1.32), f.Y(1.05)], [f.X(-1.42), f.Y(2.6)], [f.X(1.42), f.Y(2.6)], [f.X(1.32), f.Y(1.05)]], 0.08 * u);
      ctx.fillStyle = P.lin(ctx, 0, f.Y(2.6), 0, f.Y(1.05), [[0, '#ffb347'], [0.35, '#ff8a1a'], [1, '#b85a08']]); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.03 * u; ctx.stroke();
      ctx.strokeStyle = 'rgba(90,40,0,0.45)'; ctx.lineWidth = 0.06 * u;
      [1.45, 1.85, 2.25].forEach(function (y) { ctx.beginPath(); ctx.moveTo(f.X(-1.3), f.Y(y)); ctx.lineTo(f.X(1.3), f.Y(y)); ctx.stroke(); });
      // hazard stripes on the bumper
      ctx.save(); P.rrect(ctx, f.X(-1.3), f.Y(1.08), 2.6 * u, 0.28 * u, 0.05 * u); ctx.clip();
      ctx.fillStyle = '#ffd400'; ctx.fillRect(f.X(-1.3), f.Y(1.08), 2.6 * u, 0.28 * u);
      ctx.fillStyle = '#1b1b1b';
      for (var x = -1.6; x < 1.4; x += 0.3) { ctx.beginPath(); ctx.moveTo(f.X(x), f.Y(0.8)); ctx.lineTo(f.X(x + 0.15), f.Y(0.8)); ctx.lineTo(f.X(x + 0.45), f.Y(1.4)); ctx.lineTo(f.X(x + 0.3), f.Y(1.4)); ctx.fill(); }
      ctx.restore();
      tailLight(ctx, f, -1.1, 1.55, 0.26, 0.16, '#ff2a3a'); tailLight(ctx, f, 1.1, 1.55, 0.26, 0.16, '#ff2a3a');
      return { l: [-1.1, 1.55], r: [1.1, 1.55], w: 0.26, h: 0.16 };
    } },
    // Snow Plow: blue truck with a yellow blade peeking out at the sides and an orange beacon
    plow: { w: 3.4, h: 3.1, draw: function (ctx, W, H, u) {
      var f = frame(W, H, u, 0);
      // blade (front, wider than the truck)
      ctx.fillStyle = P.lin(ctx, 0, f.Y(1.2), 0, f.Y(0.1), [[0, '#ffe066'], [1, '#d9a400']]);
      P.rpoly(ctx, [[f.X(-1.65), f.Y(0.12)], [f.X(-1.6), f.Y(1.15)], [f.X(1.6), f.Y(1.15)], [f.X(1.65), f.Y(0.12)]], 0.06 * u); ctx.fill();
      ctx.fillStyle = '#ffffff'; P.blob(ctx, f.X(-1.3), f.Y(0.3), 0.35 * u, 6, P.rand(5), '#ffffff'); P.blob(ctx, f.X(1.3), f.Y(0.3), 0.35 * u, 6, P.rand(6), '#ffffff');
      [-0.9, 0.9].forEach(function (x) { wheel(ctx, f, x, 0.4, 0.85, true); });
      P.rpoly(ctx, [[f.X(-1.12), f.Y(0.7)], [f.X(-1.12), f.Y(2.3)], [f.X(-0.95), f.Y(2.6)], [f.X(0.95), f.Y(2.6)], [f.X(1.12), f.Y(2.3)], [f.X(1.12), f.Y(0.7)]], 0.12 * u);
      ctx.fillStyle = P.lin(ctx, 0, f.Y(2.6), 0, f.Y(0.7), [[0, '#6fb2ff'], [0.4, '#2f78e0'], [1, '#174a96']]); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.03 * u; ctx.stroke();
      glass(ctx, f, [[-0.85, 1.85], [-0.78, 2.42], [0.78, 2.42], [0.85, 1.85]], 0.06);
      // salt spreader
      ctx.fillStyle = '#3a3f4a'; P.rrect(ctx, f.X(-0.6), f.Y(1.6), 1.2 * u, 0.7 * u, 0.1 * u); ctx.fill();
      ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.arc(f.X(0), f.Y(1.0), 0.22 * u, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (var i = 0; i < 8; i++) { ctx.beginPath(); ctx.arc(f.X(Math.cos(i) * 0.4), f.Y(0.9 - Math.sin(i * 3) * 0.1), 0.03 * u, 0, 7); ctx.fill(); }
      // beacon
      P.rrect(ctx, f.X(-0.22), f.Y(2.88), 0.44 * u, 0.28 * u, 0.12 * u); ctx.fillStyle = '#ff8a1a'; ctx.fill();
      ctx.fillStyle = '#ffe0a0'; P.rrect(ctx, f.X(-0.12), f.Y(2.84), 0.12 * u, 0.18 * u, 0.05 * u); ctx.fill();
      tailLight(ctx, f, -0.92, 1.2, 0.2, 0.36, '#ff2a3a'); tailLight(ctx, f, 0.92, 1.2, 0.2, 0.36, '#ff2a3a');
      return { l: [-0.92, 1.2], r: [0.92, 1.2], w: 0.2, h: 0.36, beacon: [0, 2.75] };
    } },
    // Monster Truck: huge wheels, lifted green body, roll bar
    monster: { w: 3.2, h: 3.3, draw: function (ctx, W, H, u) {
      var f = frame(W, H, u, 0);
      ctx.fillStyle = '#5a5f6a';
      ctx.fillRect(f.X(-0.9), f.Y(1.5), 1.8 * u, 0.12 * u);
      ctx.strokeStyle = '#d9a400'; ctx.lineWidth = 0.08 * u;
      [-0.6, 0.6].forEach(function (x) { ctx.beginPath(); ctx.moveTo(f.X(x), f.Y(0.9)); ctx.lineTo(f.X(x * 0.5), f.Y(1.9)); ctx.stroke(); });
      [-1.12, 1.12].forEach(function (x) { wheel(ctx, f, x, 0.92, 1.75, true); });
      P.rpoly(ctx, [[f.X(-1.25), f.Y(1.75)], [f.X(-1.2), f.Y(2.45)], [f.X(1.2), f.Y(2.45)], [f.X(1.25), f.Y(1.75)]], 0.12 * u);
      ctx.fillStyle = P.lin(ctx, 0, f.Y(2.45), 0, f.Y(1.75), [[0, '#9cf26b'], [0.4, '#4cc23a'], [1, '#22701c']]); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.03 * u; ctx.stroke();
      P.rpoly(ctx, [[f.X(-0.85), f.Y(2.4)], [f.X(-0.7), f.Y(3.1)], [f.X(0.7), f.Y(3.1)], [f.X(0.85), f.Y(2.4)]], 0.1 * u);
      ctx.fillStyle = '#3aa22c'; ctx.fill();
      glass(ctx, f, [[-0.72, 2.5], [-0.6, 3.0], [0.6, 3.0], [0.72, 2.5]], 0.05);
      // claw marks
      ctx.strokeStyle = '#103d0c'; ctx.lineWidth = 0.06 * u;
      [-0.25, 0, 0.25].forEach(function (x) { ctx.beginPath(); ctx.moveTo(f.X(x - 0.1), f.Y(2.35)); ctx.lineTo(f.X(x + 0.1), f.Y(1.85)); ctx.stroke(); });
      ctx.strokeStyle = '#2b2e36'; ctx.lineWidth = 0.08 * u;
      ctx.beginPath(); ctx.moveTo(f.X(-0.9), f.Y(2.45)); ctx.lineTo(f.X(-0.75), f.Y(3.25)); ctx.lineTo(f.X(0.75), f.Y(3.25)); ctx.lineTo(f.X(0.9), f.Y(2.45)); ctx.stroke();
      tailLight(ctx, f, -1.0, 2.05, 0.22, 0.2, '#ff2a3a'); tailLight(ctx, f, 1.0, 2.05, 0.22, 0.2, '#ff2a3a');
      return { l: [-1.0, 2.05], r: [1.0, 2.05], w: 0.22, h: 0.2 };
    } },
    // Shadow Racer: black super car, purple neon underglow and a light bar
    shadow: { w: 2.5, h: 1.4, draw: function (ctx, W, H, u) {
      var f = frame(W, H, u, 0);
      P.ellipse(ctx, f.X(0), f.Y(0.06), 1.3 * u, 0.12 * u, 'rgba(190,60,255,0.55)');
      var l = paintCar(ctx, W, H, u, { color: '#1c1a26', body: 'super', shiny: true, plate: 'SHAD0W' });
      ctx.fillStyle = '#c64bff';
      P.rrect(ctx, f.X(-0.95), f.Y(0.2), 1.9 * u, 0.04 * u, 0.02 * u); ctx.fill();
      return l;
    } }
  };

  /* ------------------------------------------------------------------ cache */

  var cache = {};
  function key() { return Array.prototype.join.call(arguments, '|'); }

  /** Player car poses: o = { paint colour, decal, body, shiny } → [5 sprites] for turn −1, −0.5, 0, 0.5, 1. */
  function player(o, ppm) {
    var k = key('p', o.color, o.decal, o.body, o.shiny, ppm || PPM);
    if (cache[k]) return cache[k];
    var poses = [-1, -0.5, 0, 0.5, 1].map(function (turn) {
      var lights;
      var spr = P.bake(2.5, 1.75, ppm || PPM, function (ctx, W, H, u) {
        lights = paintCar(ctx, W, H, u, { color: o.color, body: o.body, decal: o.decal, turn: turn, plate: 'SALAH', shiny: o.shiny, driver: true });
      });
      spr.lights = lights;
      return spr;
    });
    cache[k] = poses;
    return poses;
  }

  function traffic(kind, colorIdx) {
    var c = TRAFFIC_COLORS[(colorIdx | 0) % TRAFFIC_COLORS.length];
    var body = kind === 'truck' ? 'truck' : (colorIdx % 2 ? 'hatch' : 'sedan');
    var k = key('t', body, c);
    if (cache[k]) return cache[k];
    var lights, spr;
    if (body === 'truck') spr = P.bake(2.5, 3.1, 64, function (ctx, W, H, u) { lights = paintBoxTruck(ctx, W, H, u, c); });
    else spr = P.bake(2.2, 1.6, 80, function (ctx, W, H, u) { lights = paintCar(ctx, W, H, u, { color: c, body: body }); });
    spr.lights = lights;
    cache[k] = spr;
    return spr;
  }

  function boss(kind) {
    var k = key('b', kind);
    if (cache[k]) return cache[k];
    var b = BOSS[kind] || BOSS.van, lights;
    var spr = P.bake(b.w, b.h, 72, function (ctx, W, H, u) { lights = b.draw(ctx, W, H, u); });
    spr.lights = lights;
    cache[k] = spr;
    return spr;
  }

  /** Soft shadow under vehicles (ellipse, drawn squashed on the road). */
  var shadowSpr = null;
  function shadow() {
    if (shadowSpr) return shadowSpr;
    shadowSpr = P.bake(2.4, 0.8, 50, function (ctx, W, H) {
      ctx.fillStyle = P.rad(ctx, W / 2, H / 2, 0, W / 2, [[0, 'rgba(0,0,0,0.55)'], [0.6, 'rgba(0,0,0,0.35)'], [1, 'rgba(0,0,0,0)']]);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(1, H / W); ctx.translate(-W / 2, -H / 2);
      ctx.fillRect(0, (H - W) / 2 + 0, W, W); ctx.restore();
    }, 0.5, 0.5);
    return shadowSpr;
  }

  root.RR = root.RR || {};
  root.RR.cars = { TRAFFIC_COLORS: TRAFFIC_COLORS, player: player, traffic: traffic, boss: boss, shadow: shadow,
    paintCar: paintCar, BOSS_KINDS: Object.keys(BOSS) };
})(window);
