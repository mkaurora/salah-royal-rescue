/* Sky and parallax: a cached sky canvas (gradient, sun or moon, clouds, stars) and three tileable silhouette layers
 * per world (hills, skylines, mesas, peaks, pine rows, jungle canopy) that scroll with the bends and bob with hills.
 * All of it is baked for the current screen size; per frame we only drawImage. Browser only: RR.sky. */
(function (root) {
  'use strict';
  var P = root.RR.paint;

  /** Tileable 1D noise from integer-frequency sines (period = 1). */
  function wave(seed, oct) {
    var rnd = P.rand(seed), f = [];
    for (var i = 0; i < oct; i++) f.push({ k: (i + 1) * (1 + Math.floor(rnd() * 3)), a: 1 / (i + 1.3), p: rnd() * 7 });
    var tot = f.reduce(function (s, o) { return s + o.a; }, 0);
    return function (t) {
      var v = 0;
      for (var i = 0; i < f.length; i++) v += Math.sin((t * f[i].k + f[i].p / 6.283) * 6.283) * f[i].a;
      return v / tot;     // -1..1
    };
  }

  function layerCanvas(L, LW, LH, res, theme) {
    var c = P.canvas(LW, LH), ctx = c.getContext('2d'), rnd = P.rand(L.seed), W = LW, H = LH;
    var w = wave(L.seed, 5), x, i;
    ctx.fillStyle = L.color;
    if (L.kind === 'hills' || L.kind === 'dunes' || L.kind === 'canopy') {
      var rough = L.rough || (L.kind === 'canopy' ? 1 : 0.5);
      ctx.beginPath(); ctx.moveTo(0, H);
      for (x = 0; x <= W; x += 4) {
        var t = x / W, v = w(t) * 0.5 + 0.5;
        if (L.kind === 'canopy') v = v * 0.6 + 0.4 * Math.abs(Math.sin(t * 6.283 * 34)) ;
        ctx.lineTo(x, H - H * (0.3 + 0.7 * v * Math.min(1, rough)));
      }
      ctx.lineTo(W, H); ctx.closePath();
      ctx.fillStyle = P.lin(ctx, 0, 0, 0, H, [[0, L.top || L.color], [1, L.color]]);
      ctx.fill();
      if (L.trees) {
        ctx.fillStyle = L.trees;
        for (i = 0; i < 90; i++) {
          var tx = rnd() * W, tv = w(tx / W) * 0.5 + 0.5, ty = H - H * (0.3 + 0.7 * tv * Math.min(1, rough));
          P.circle(ctx, tx, ty + 3 * res, (3 + rnd() * 4) * res); ctx.fill();
        }
      }
    } else if (L.kind === 'skyline') {
      x = 0;
      while (x < W) {
        var bw = (18 + rnd() * 40) * res, bh = H * (0.25 + rnd() * 0.75);
        if (x + bw > W) bw = W - x;
        ctx.fillStyle = L.color;
        ctx.fillRect(x, H - bh, bw, bh);
        if (rnd() < 0.3) ctx.fillRect(x + bw * 0.4, H - bh - 8 * res, 2 * res, 8 * res);
        // windows
        var lit = L.neon ? 0.35 : 0.5;
        ctx.fillStyle = L.win;
        for (var wy = H - bh + 5 * res; wy < H - 4 * res; wy += 6 * res) for (var wx = x + 3 * res; wx < x + bw - 4 * res; wx += 6 * res) {
          if (rnd() < lit) { ctx.globalAlpha = L.neon ? 0.5 + rnd() * 0.5 : 0.35; ctx.fillRect(wx, wy, 2.5 * res, 3 * res); }
        }
        ctx.globalAlpha = 1;
        if (L.neon && rnd() < 0.25) {
          ctx.fillStyle = ['#ff4fc3', '#3ff0ff', '#ffe14d', '#7dff6a'][Math.floor(rnd() * 4)];
          ctx.fillRect(x + 2 * res, H - bh + 2 * res, bw - 4 * res, 2 * res);
        }
        x += bw + rnd() * 6 * res;
      }
    } else if (L.kind === 'mesas') {
      ctx.beginPath(); ctx.moveTo(0, H);
      x = 0;
      var y = H * 0.85;
      while (x < W) {
        var seg = (40 + rnd() * 120) * res, mesa = rnd() < 0.45;
        if (x + seg > W - 20 * res) seg = W - x;
        if (mesa && seg > 50 * res && x + seg < W - 10 * res) {
          var top = H * (0.08 + rnd() * 0.4);
          ctx.lineTo(x + seg * 0.15, top); ctx.lineTo(x + seg * 0.85, top); ctx.lineTo(x + seg, H * 0.85);
        } else {
          ctx.lineTo(x + seg / 2, H * (0.7 + rnd() * 0.2)); ctx.lineTo(x + seg, H * 0.85);
        }
        x += seg;
      }
      ctx.lineTo(W, H * 0.85); ctx.lineTo(W, H); ctx.closePath();
      ctx.fillStyle = P.lin(ctx, 0, 0, 0, H, [[0, L.top], [0.6, L.color], [1, L.color]]);
      ctx.fill();
    } else if (L.kind === 'peaks') {
      var pts = [[0, H * 0.75]];
      x = 0;
      while (x < W) {
        var pw = (60 + rnd() * 140) * res;
        if (x + pw > W) pw = W - x;
        pts.push([x + pw * (0.4 + rnd() * 0.2), H * (0.02 + rnd() * 0.45)]);
        pts.push([x + pw, H * (0.55 + rnd() * 0.25)]);
        x += pw;
      }
      pts[pts.length - 1][1] = H * 0.75;
      ctx.beginPath(); ctx.moveTo(0, H);
      pts.forEach(function (p) { ctx.lineTo(p[0], p[1]); });
      ctx.lineTo(W, H); ctx.closePath();
      ctx.fillStyle = P.lin(ctx, 0, 0, 0, H, [[0, P.shade(L.color, 0.15)], [1, L.color]]); ctx.fill();
      // snow caps
      ctx.fillStyle = L.top;
      for (i = 1; i < pts.length - 1; i += 2) {
        var p = pts[i], l = pts[i - 1], r = pts[i + 1], d = (Math.min(l[1], r[1]) - p[1]) * 0.42;
        if (d <= 0) continue;
        var fl = d / (l[1] - p[1] || 1), fr = d / (r[1] - p[1] || 1);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]);
        ctx.lineTo(p[0] + (l[0] - p[0]) * fl, p[1] + d);
        ctx.lineTo(p[0] + (l[0] - p[0]) * fl * 0.4, p[1] + d * 0.75);
        ctx.lineTo(p[0], p[1] + d * 1.05);
        ctx.lineTo(p[0] + (r[0] - p[0]) * fr * 0.5, p[1] + d * 0.8);
        ctx.lineTo(p[0] + (r[0] - p[0]) * fr, p[1] + d);
        ctx.closePath(); ctx.fill();
      }
      // shaded right faces
      ctx.fillStyle = 'rgba(30,50,90,0.18)';
      for (i = 1; i < pts.length - 1; i += 2) {
        ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.lineTo(pts[i + 1][0], H); ctx.lineTo(pts[i][0], H); ctx.fill();
      }
    } else if (L.kind === 'pines') {
      ctx.fillStyle = L.color;
      ctx.fillRect(0, H * 0.75, W, H * 0.25);
      for (x = 0; x < W; x += (5 + rnd() * 7) * res) {
        var ph = H * (0.35 + rnd() * 0.6), pw2 = ph * 0.32;
        ctx.fillStyle = L.color;
        ctx.beginPath(); ctx.moveTo(x - pw2, H * 0.8); ctx.lineTo(x, H * 0.8 - ph); ctx.lineTo(x + pw2, H * 0.8); ctx.fill();
        ctx.fillStyle = L.top; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(x - pw2 * 0.3, H * 0.8 - ph * 0.7); ctx.lineTo(x, H * 0.8 - ph); ctx.lineTo(x + pw2 * 0.3, H * 0.8 - ph * 0.7); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    return c;
  }

  function skyCanvas(theme, W, H, res) {
    var c = P.canvas(W, H), ctx = c.getContext('2d'), rnd = P.rand(theme.key.length * 97 + 5), i;
    ctx.fillStyle = P.lin(ctx, 0, 0, 0, H, theme.sky); ctx.fillRect(0, 0, W, H);
    if (theme.stars) {
      for (i = 0; i < theme.stars; i++) {
        var sy = rnd() * H * 0.7;
        ctx.globalAlpha = 0.3 + rnd() * 0.7 * (1 - sy / H);
        ctx.fillStyle = rnd() < 0.15 ? '#ffd9f2' : '#ffffff';
        ctx.fillRect(rnd() * W, sy, (rnd() < 0.1 ? 2 : 1) * res, (rnd() < 0.1 ? 2 : 1) * res);
      }
      ctx.globalAlpha = 1;
    }
    var s = theme.sun;
    if (s) {
      var sx = s.x * W, sy2 = s.y * H, r = s.r * Math.max(W, H * 1.6);
      ctx.fillStyle = P.rad(ctx, sx, sy2, 0, s.glowR * Math.max(W, H), [[0, P.rgba(s.glow, 0.75)], [0.25, P.rgba(s.glow, 0.25)], [1, P.rgba(s.glow, 0)]]);
      ctx.fillRect(0, 0, W, H);
      if (s.moon) {
        P.circle(ctx, sx, sy2, r, '#f4f2ff');
        P.circle(ctx, sx - r * 0.3, sy2 - r * 0.2, r * 0.25, 'rgba(180,170,220,0.4)');
        P.circle(ctx, sx + r * 0.35, sy2 + r * 0.3, r * 0.15, 'rgba(180,170,220,0.4)');
      } else {
        ctx.fillStyle = P.rad(ctx, sx, sy2, 0, r, [[0, '#ffffff'], [0.6, s.color], [1, P.rgba(s.color, 0.9)]]);
        P.circle(ctx, sx, sy2, r); ctx.fill();
        if (theme.light === 'sunset') {    // horizontal bands across the low sun
          ctx.fillStyle = P.rgba('#e8605a', 0.55);
          for (i = 0; i < 4; i++) ctx.fillRect(sx - r, sy2 + r * (0.15 + i * 0.22), 2 * r, r * (0.05 + i * 0.03));
        }
      }
    }
    var cl = theme.clouds;
    if (cl) {
      for (i = 0; i < cl.count; i++) {
        var cx = rnd() * W, cy = H * (cl.y[0] + rnd() * (cl.y[1] - cl.y[0])), cw = (60 + rnd() * 120) * res;
        if (cl.streak) {
          ctx.fillStyle = P.rgba(cl.color, 0.55);
          P.rrect(ctx, cx, cy, cw * 2, cw * 0.08, cw * 0.04); ctx.fill();
          ctx.fillStyle = P.rgba(cl.shade, 0.4);
          P.rrect(ctx, cx + cw * 0.3, cy + cw * 0.07, cw * 1.4, cw * 0.05, cw * 0.025); ctx.fill();
        } else {
          var cr = P.rand(i * 31 + 7);
          ctx.globalAlpha = 0.9;
          P.blob(ctx, cx, cy + cw * 0.06, cw * 0.5, 7, cr, cl.shade);
          P.blob(ctx, cx, cy, cw * 0.48, 9, cr, cl.color);
          ctx.globalAlpha = 1;
        }
      }
    }
    // haze towards the horizon
    ctx.fillStyle = P.lin(ctx, 0, H * 0.6, 0, H, [[0, P.rgba(theme.fog, 0)], [1, P.rgba(theme.fog, 0.75)]]);
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
    return c;
  }

  /** Build the background for a theme at screen size W × H (CSS px) and resolution res. */
  function build(theme, W, H, res) {
    var skyH = Math.ceil(H * 0.75);
    var bg = { theme: theme, W: W, H: H, res: res, sky: skyCanvas(theme, Math.ceil(W * res), Math.ceil(skyH * res), res), skyH: skyH, layers: [] };
    var LW = Math.ceil(Math.max(1400, W * 1.6) * res);
    theme.layers.forEach(function (L) {
      var LH = Math.ceil(L.height * H * res);
      bg.layers.push({ L: L, img: layerCanvas(L, LW, LH, res, theme), w: LW / res, h: LH / res });
    });
    // horizon haze strip (drawn over the layer bottoms)
    var hz = P.canvas(4, 64), hctx = hz.getContext('2d');
    hctx.fillStyle = P.lin(hctx, 0, 0, 0, 64, [[0, P.rgba(theme.fog, 0)], [0.7, P.rgba(theme.fog, 0.6)], [1, P.rgba(theme.fog, 0.9)]]);
    hctx.fillRect(0, 0, 4, 64);
    bg.haze = hz;
    if (theme.shafts) bg.shafts = shafts(W, H, res);
    return bg;
  }

  function shafts(W, H, res) {
    var c = P.canvas(W * res * 0.5, H * res * 0.5), ctx = c.getContext('2d'), w = c.width, h = c.height, rnd = P.rand(4242);
    for (var i = 0; i < 6; i++) {
      var x = w * (0.05 + rnd() * 0.9), sw = w * (0.03 + rnd() * 0.06);
      ctx.fillStyle = P.lin(ctx, 0, 0, 0, h, [[0, 'rgba(255,250,200,0.42)'], [1, 'rgba(255,250,200,0)']]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + sw, 0); ctx.lineTo(x + sw * 3 + w * 0.12, h); ctx.lineTo(x + w * 0.12, h); ctx.fill();
    }
    return c;
  }

  /** Draw the sky + layers. ctx is in CSS px. horizon: screen y; skyX: accumulated bend scroll (px);
   * lift: vertical offset from the road height (px); t: time for shimmer. */
  function draw(ctx, bg, horizon, skyX, lift, t) {
    var W = bg.W, i;
    var top = horizon - bg.skyH + 6 + lift * 0.1;
    ctx.drawImage(bg.sky, 0, top, W, bg.skyH);
    if (top > 0) ctx.drawImage(bg.sky, 0, 0, bg.sky.width, 2, 0, 0, W, top + 1);
    for (i = 0; i < bg.layers.length; i++) {
      var ly = bg.layers[i], sp = ly.L.speed, off = ((skyX * sp) % ly.w + ly.w) % ly.w;
      var y = horizon - ly.h + 2 + lift * sp * 0.6;
      if (bg.theme.shimmer && i === bg.layers.length - 1) {
        // heat shimmer: the nearest band drawn in wobbling slices
        var n = 8, sh = ly.h / n, ih = ly.img.height / n;
        for (var k = 0; k < n; k++) {
          var wob = Math.sin(t * 5 + k * 1.3) * (0.6 + k * 0.25);
          var ox = off + wob;
          ctx.drawImage(ly.img, 0, k * ih, ly.img.width, ih, -ox, y + k * sh, ly.w, sh + 0.5);
          ctx.drawImage(ly.img, 0, k * ih, ly.img.width, ih, ly.w - ox, y + k * sh, ly.w, sh + 0.5);
        }
      } else {
        ctx.drawImage(ly.img, -off, y, ly.w, ly.h);
        if (ly.w - off < W) ctx.drawImage(ly.img, ly.w - off, y, ly.w, ly.h);
      }
      // a thin haze between layers gives depth
      if (i < bg.layers.length - 1) ctx.drawImage(bg.haze, 0, y + ly.h - 26, W, 28);
    }
    ctx.drawImage(bg.haze, 0, horizon - 30, W, 34);
  }

  root.RR = root.RR || {};
  root.RR.sky = { build: build, draw: draw };
})(window);
