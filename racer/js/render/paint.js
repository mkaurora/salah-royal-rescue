/* Painting helpers shared by the procedural sprite makers: colours, rounded shapes, gradients and a "bake" that
 * draws a sprite once into an offscreen canvas. Gradients here are only created while baking, never per frame.
 * Browser only: RR.paint. */
(function (root) {
  'use strict';

  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(r, g, b) {
    function h(v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }
    return '#' + h(r) + h(g) + h(b);
  }
  /** Mix two hex colours (t = 0 → a, 1 → b). */
  function mix(a, b, t) {
    var x = hex(a), y = hex(b);
    return toHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t);
  }
  /** Lighten (amt > 0, towards white) or darken (amt < 0, towards black). */
  function shade(c, amt) { return amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt); }
  function rgba(c, a) { var x = hex(c); return 'rgba(' + x[0] + ',' + x[1] + ',' + x[2] + ',' + a + ')'; }

  function rrect(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  /** Rounded polygon through points [[x,y]...] with corner radius r. */
  function rpoly(ctx, pts, r) {
    var n = pts.length;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      var p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
      var mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
      if (i === 0) ctx.moveTo(mx, my);
      ctx.arcTo(p1[0], p1[1], (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, r);
    }
    ctx.closePath();
  }
  function lin(ctx, x0, y0, x1, y1, stops) {
    var g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function rad(ctx, x, y, r0, r1, stops, x1, y1) {
    var g = ctx.createRadialGradient(x, y, r0, x1 === undefined ? x : x1, y1 === undefined ? y : y1, r1);
    for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]);
    return g;
  }
  function ellipse(ctx, x, y, rx, ry, fill) {
    ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  }
  function circle(ctx, x, y, r, fill) { ellipse(ctx, x, y, r, r, fill); }

  function canvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  /** Bake a sprite: wm × hm metres at ppm pixels per metre. draw(ctx, W, H, u) paints it.
   * → { img, w, h, ax, ay } (anchor: ax 0..1 across, ay 0..1 down; default bottom-centre). */
  function bake(wm, hm, ppm, draw, ax, ay) {
    var c = canvas(wm * ppm, hm * ppm), ctx = c.getContext('2d');
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    draw(ctx, c.width, c.height, ppm);
    return { img: c, w: wm, h: hm, ax: ax === undefined ? 0.5 : ax, ay: ay === undefined ? 1 : ay };
  }

  /** Small seeded random for art (independent of the game rng so art never shifts gameplay). */
  function rand(seed) {
    var a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** A soft blob made of overlapping circles (foliage, clouds, snow piles). */
  function blob(ctx, cx, cy, r, n, rnd, fill) {
    ctx.fillStyle = fill;
    for (var i = 0; i < n; i++) {
      var a = rnd() * Math.PI * 2, d = rnd() * r * 0.55;
      circle(ctx, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8, r * (0.35 + rnd() * 0.35));
      ctx.fill();
    }
  }

  function star(ctx, x, y, r1, r2, n) {
    n = n || 5;
    ctx.beginPath();
    for (var i = 0; i < n * 2; i++) {
      var a = -Math.PI / 2 + i * Math.PI / n, r = i % 2 ? r2 : r1;
      if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      else ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }

  /** A pre-rendered radial glow (for lights): size px, colour. Used with 'lighter' compositing. */
  function glow(size, color, core) {
    var c = canvas(size, size), ctx = c.getContext('2d'), h = size / 2;
    ctx.fillStyle = rad(ctx, h, h, 0, h, [[0, rgba(color, core === undefined ? 0.9 : core)], [0.25, rgba(color, 0.45)],
      [0.6, rgba(color, 0.12)], [1, rgba(color, 0)]]);
    ctx.fillRect(0, 0, size, size);
    return c;
  }

  root.RR = root.RR || {};
  root.RR.paint = { hex: hex, toHex: toHex, mix: mix, shade: shade, rgba: rgba, rrect: rrect, rpoly: rpoly, lin: lin,
    rad: rad, ellipse: ellipse, circle: circle, canvas: canvas, bake: bake, rand: rand, blob: blob, star: star, glow: glow };
})(window);
