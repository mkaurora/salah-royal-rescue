/* The pseudo-3D renderer (OutRun-style segment projection) — see dev/DESIGN.md §1.
 * Each frame: camera behind the car → project every 2 m road sample ahead (accumulated bend offset for curves,
 * track heights for hills, a running "maxY" so crests hide the road behind them) → sky + parallax → road strips
 * front to back (grass, verge, rumble, asphalt, lanes, lane closures, start/finish checkers; fog by distance from
 * pre-mixed palettes) → flat decals (potholes, oil, puddles, rock shadows) → billboards far to near, bucketed by
 * sample (props, items, traffic, boss, arches, the player's car) and clipped by the crests → lights, weather,
 * particles, tint. All per-frame storage is preallocated typed arrays; sprites are cached canvases.
 * Browser only: RR.road.create(canvas). */
(function (root) {
  'use strict';
  var RR = root.RR, P = RR.paint, TR = RR.track, SP = RR.sprites, CARS = RR.cars, SKY = RR.sky;

  var SEG = TR.SEG;
  var FOG_STEPS = 16;
  var K_CURVE = 0.034;          // bend strength → lateral offset per sample²
  var CAM_H = 2.25, CAM_BACK = 5.4;
  var MAXN = 190;               // samples projected at best quality (380 m)
  var MAXREC = 700;             // billboard records per frame
  var QUALITY = [{ res: 2, n: 175 }, { res: 1.5, n: 145 }, { res: 1, n: 115 }];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  function Road(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.q = 0; this.res = 1; this.W = 1; this.H = 1; this.dpr = 1;
    // per-sample projection
    this.sx = new Float32Array(MAXN + 2); this.sy = new Float32Array(MAXN + 2); this.sc = new Float32Array(MAXN + 2);
    this.wx = new Float32Array(MAXN + 2); this.wy = new Float32Array(MAXN + 2); this.dz = new Float32Array(MAXN + 2);
    this.clip = new Float32Array(MAXN + 2); this.idx = new Int32Array(MAXN + 2);
    // billboard records (bucketed by sample)
    this.head = new Int16Array(MAXN + 2); this.tail = new Int16Array(MAXN + 2);
    this.rNext = new Int16Array(MAXREC); this.rX = new Float32Array(MAXREC); this.rY = new Float32Array(MAXREC);
    this.rW = new Float32Array(MAXREC); this.rH = new Float32Array(MAXREC); this.rClip = new Float32Array(MAXREC);
    this.rA = new Float32Array(MAXREC); this.rRot = new Float32Array(MAXREC); this.rMode = new Uint8Array(MAXREC);
    this.rImg = new Array(MAXREC);
    this.nRec = 0;
    this.camX = 0; this.skyX = 0; this.t = 0; this.lastZ = 0;
    this.scene = null; this.fx = RR.fx.create();
    this.carSX = 0; this.carSY = 0; this.carScale = 40; this.carW = 60;
    this.glowCache = {};
  }

  Road.prototype.setQuality = function (q) {
    this.q = clamp(q | 0, 0, 2);
    this.fx.setQuality(this.q);
    this.resize(this.W, this.H, this.dpr, true);
  };

  Road.prototype.resize = function (w, h, dpr, force) {
    var res = Math.min(dpr || 1, QUALITY[this.q].res);
    if (!force && w === this.W && h === this.H && res === this.res) return;
    this.W = w; this.H = h; this.dpr = dpr; this.res = res;
    this.cv.width = Math.round(w * res); this.cv.height = Math.round(h * res);
    this.cv.style.width = w + 'px'; this.cv.style.height = h + 'px';
    this.portrait = h > w;
    this.f = (this.portrait ? w * 0.72 : Math.max(w * 0.47, h * 0.9));
    this.contactY = h * (this.portrait ? 0.64 : 0.87);
    if (this.scene) this.buildBg();
    this.fx.setWeather(this.scene ? this.scene.theme.weather : null, w, h);
  };

  /* ------------------------------------------------------------------ scene */

  /** opts: { track, theme, car: { color, decal, body, shiny } } */
  Road.prototype.setScene = function (opts) {
    var th = opts.theme, t = opts.track, sc = this.scene = { theme: th, track: t, atlas: SP.atlas(th) };
    sc.half = t.half;
    sc.pal = {};
    var self = this;
    function fogged(c) {
      var out = [];
      for (var k = 0; k < FOG_STEPS; k++) out.push(P.mix(c, th.fog, Math.pow(k / (FOG_STEPS - 1), 1.15)));
      return out;
    }
    ['grass', 'verge', 'rumble', 'road', 'closed'].forEach(function (k) { sc.pal[k] = [fogged(th[k][0]), fogged(th[k][1])]; });
    sc.pal.lane = th.lane ? fogged(th.lane) : null;
    sc.pal.edge = fogged(th.edge);
    sc.pal.fog = th.fog;
    sc.vergeF = (t.half + 0.6 + th.vergeW) / t.half;
    sc.rumbleF = (t.half + 0.6) / t.half;
    var gl = sc.atlas.glows;
    this.gl = { red: { img: gl.red, w: 1, h: 0.8, ax: 0.5, ay: 0.5 }, amber: { img: gl.amber, w: 1, h: 0.85, ax: 0.5, ay: 0.5 },
      redRefl: { img: gl.red, w: 0.8, h: 2.8, ax: 0.5, ay: 0 } };
    this.setCar(opts.car || { color: '#e8322f', decal: 'none', body: 'racer' });
    this.buildProps();
    this.buildBg();
    this.fx.clear();
    this.fx.setWeather(th.weather, this.W, this.H);
    this.camX = 0; this.skyX = 0;
    void self;
  };

  Road.prototype.setCar = function (car) {
    if (!this.scene) return;
    this.scene.car = CARS.player({ color: car.color, decal: car.decal, body: car.body, shiny: !!car.shiny });
  };

  Road.prototype.buildBg = function () {
    this.bg = SKY.build(this.scene.theme, this.W, this.H, this.res);
    // full-screen tint / vignette, baked small and stretched
    var th = this.scene.theme, c = P.canvas(96, 64), x = c.getContext('2d');
    var vig = th.dark ? 0.55 : th.key === 'snow' ? 0.0 : 0.22;
    x.fillStyle = P.rad(x, 48, 30, 10, 62, [[0, 'rgba(0,0,0,0)'], [0.65, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,' + vig + ')']]);
    x.fillRect(0, 0, 96, 64);
    if (th.key === 'snow') {
      x.fillStyle = P.rad(x, 48, 30, 18, 64, [[0, 'rgba(255,255,255,0)'], [0.7, 'rgba(235,245,255,0)'], [1, 'rgba(235,245,255,0.6)']]);
      x.fillRect(0, 0, 96, 64);
    }
    if (th.light === 'sunset') {
      x.fillStyle = P.rad(x, 96 * th.sun.x, 64 * 0.5, 0, 70, [[0, 'rgba(255,170,80,0.22)'], [1, 'rgba(255,120,60,0)']]);
      x.fillRect(0, 0, 96, 64);
      x.fillStyle = P.lin(x, 0, 0, 0, 64, [[0, 'rgba(80,20,110,0.12)'], [0.5, 'rgba(0,0,0,0)'], [1, 'rgba(120,30,60,0.12)']]);
      x.fillRect(0, 0, 96, 64);
    }
    if (th.key === 'jungle') {
      x.fillStyle = P.lin(x, 0, 0, 0, 64, [[0, 'rgba(10,60,20,0.18)'], [0.4, 'rgba(0,0,0,0)'], [1, 'rgba(0,30,10,0.12)']]);
      x.fillRect(0, 0, 96, 64);
    }
    this.tint = c;
    // headlight cone (night)
    var hl = P.canvas(128, 128), h = hl.getContext('2d');
    h.fillStyle = P.rad(h, 64, 128, 4, 128, [[0, 'rgba(255,245,210,0.75)'], [0.5, 'rgba(255,240,200,0.3)'], [1, 'rgba(255,240,200,0)']]);
    h.beginPath(); h.moveTo(48, 128); h.lineTo(0, 0); h.lineTo(128, 0); h.lineTo(80, 128); h.closePath(); h.fill();
    this.headlight = hl;
  };

  /** Roadside props (seeded, renderer-only), lane-closure barriers + arrow signs, arches. */
  Road.prototype.buildProps = function () {
    var sc = this.scene, th = sc.theme, t = sc.track, rnd = P.rand(RR.rng.hashSeed('props:' + t.id)), a = sc.atlas;
    var list = [];
    var tot = 0;
    th.props.forEach(function (p) { if (!p.every) tot += p.w; });
    function pick() {
      var v = rnd() * tot;
      for (var i = 0; i < th.props.length; i++) { var p = th.props[i]; if (p.every) continue; v -= p.w; if (v < 0) return p; }
      return th.props[0];
    }
    var edge = t.half + 0.6 + th.vergeW;
    for (var side = -1; side <= 1; side += 2) {
      var z = 6 + rnd() * 10;
      while (z < t.length + 420) {
        var p = pick(), vars = a.props[p.kind];
        var x = side * (edge + p.side[0] + rnd() * (p.side[1] - p.side[0]));
        var spr = vars[Math.floor(rnd() * vars.length)];
        list.push({ z: z, x: x, spr: side < 0 && !NOFLIP[p.kind] ? SP.flipped(spr) : spr, s: 0.85 + rnd() * 0.3 });
        z += (5 + rnd() * 14) / th.density;
      }
    }
    th.props.forEach(function (p) {
      if (!p.every) return;
      var spr = a.props[p.kind][0];
      for (var z2 = 20; z2 < t.length + 300; z2 += p.every) {
        var s2 = (Math.floor(z2 / p.every) % 2) ? 1 : -1;
        // lamps lean over the road: the arm must point inwards
        list.push({ z: z2, x: s2 * (t.half + 0.6 + p.side[0]), spr: s2 > 0 ? SP.flipped(spr) : spr, s: 1 });
      }
    });
    // lane closures: a barrier line along the closed edge + arrow signs
    t.closures.forEach(function (c) {
      var arrow = c.side < 0 ? a.items.arrowR : a.items.arrowL;
      [-90, -55].forEach(function (d) { list.push({ z: c.z0 - TR.TAPER + d, x: c.side * (t.half + 1.4), spr: arrow, s: 1.2 }); });
      for (var z3 = c.z0 - TR.TAPER; z3 <= c.z1 + 24; z3 += 3.5) {
        var lo = TR.loAt(t, z3), hi = TR.hiAt(t, z3);
        var bx = c.side < 0 ? lo - 0.55 : hi + 0.55;
        if (c.side < 0 ? lo <= -t.half + 0.3 : hi >= t.half - 0.3) continue;
        list.push({ z: z3, x: bx, spr: a.items.barrier, s: 1, barrier: true });
      }
      for (var z4 = c.z0 + 10; z4 < c.z1 - 10; z4 += 45) {
        list.push({ z: z4, x: c.side * (t.half - c.closed * TR.LANE_W / 2), spr: arrow, s: 1.1 });
      }
    });
    var aw = t.half * 2 + 2.4;
    sc.archCp = SP.arch('checkpoint', aw, th);
    sc.archFinish = SP.arch('finish', aw, th);
    sc.archStart = SP.arch('start', aw, th);
    t.checkpoints.forEach(function (z) { list.push({ z: z, x: 0, spr: sc.archCp, s: 1, arch: true }); });
    list.push({ z: t.length, x: 0, spr: sc.archFinish, s: 1, arch: true });
    list.push({ z: 16, x: 0, spr: sc.archStart, s: 1, arch: true });
    list.sort(function (p1, p2) { return p1.z - p2.z; });
    sc.props = list;
    sc.propZ = new Float32Array(list.map(function (p) { return p.z; }));
  };

  var NOFLIP = { billboard: 1, shop: 1, neon: 1, sign: 1, house: 1, cabin: 1 };

  function lowerBound(arr, z) {
    var lo = 0, hi = arr.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (arr[m] < z) lo = m + 1; else hi = m; }
    return lo;
  }

  /* ------------------------------------------------------------------ projection */

  Road.prototype.project = function (car, view) {
    var sc = this.scene, t = sc.track, N = Math.min(MAXN, QUALITY[this.q].n);
    var camZ = car.z - CAM_BACK;
    var base = Math.floor(camZ / SEG);
    var f = this.f * (1 - 0.05 * (view.speed || 0));
    this.fNow = f;
    var hz = this.contactY - CAM_H * f / CAM_BACK;
    var camY = TR.heightAt(t, Math.max(0, car.z)) + CAM_H + (car.y || 0) * 0.35 + (view.camLift || 0);
    // keep the horizon steady over crests: look a little up/down with the slope
    var slope = TR.heightAt(t, car.z + 30) - TR.heightAt(t, car.z);
    hz -= clamp(slope, -6, 6) * 1.2 * (f / 60) * 0.25;
    this.hz = hz; this.camZ = camZ; this.camY = camY; this.base = base; this.N = N;
    var x = 0, dx = 0, maxY = this.H + 50, cx = this.W / 2 + (view.shakeX || 0), camX = this.camX;
    var last = t.n - 1;
    for (var n = 0; n <= N; n++) {
      var i = base + n, ic = i < 0 ? 0 : i > last ? last : i;
      if (n > 0) { dx += (i > last || i < 0 ? 0 : t.curve[ic]) * K_CURVE; x += dx; }
      var z = i * SEG, d = z - camZ;
      this.idx[n] = i; this.wx[n] = x; this.wy[n] = t.hy[ic]; this.dz[n] = d;
      if (d < 0.3) { this.sc[n] = 0; this.sy[n] = this.H * 4; this.sx[n] = cx; this.clip[n] = maxY; continue; }
      var s = f / d;
      this.sc[n] = s;
      this.sx[n] = cx + (x - camX) * s;
      this.sy[n] = hz + (camY - this.wy[n]) * s + (view.shakeY || 0);
      this.clip[n] = maxY;
      if (this.sy[n] < maxY) maxY = this.sy[n];
    }
  };

  /** Screen position for world point (z, x, y). Sets this.p* and returns false when not visible. */
  Road.prototype.pt = function (z, x, y) {
    var nf = (z - this.base * SEG) / SEG, n = Math.floor(nf);
    if (n < 0 || n >= this.N) return false;
    var u = nf - n, d = z - this.camZ;
    if (d < 0.6) return false;
    var s = this.fNow / d;
    var rx = this.wx[n] + (this.wx[n + 1] - this.wx[n]) * u, ry = this.wy[n] + (this.wy[n + 1] - this.wy[n]) * u;
    this.pX = this.W / 2 + (this.shX || 0) + (rx + x - this.camX) * s;
    this.pY = this.hz + (this.camY - ry - (y || 0)) * s + (this.shY || 0);
    this.pS = s; this.pN = n; this.pD = d;
    this.pClip = this.clip[n + 1 <= this.N ? n + 1 : n];
    return true;
  };

  /* ------------------------------------------------------------------ road strips */

  function quad(ctx, x1, y1, w1, x2, y2, w2) {
    ctx.beginPath();
    ctx.moveTo(x1 - w1, y1); ctx.lineTo(x2 - w2, y2); ctx.lineTo(x2 + w2, y2); ctx.lineTo(x1 + w1, y1);
    ctx.closePath(); ctx.fill();
  }
  function quad2(ctx, a1, y1, b1, a2, y2, b2) {     // explicit left/right edges
    ctx.beginPath();
    ctx.moveTo(a1, y1); ctx.lineTo(a2, y2); ctx.lineTo(b2, y2); ctx.lineTo(b1, y1);
    ctx.closePath(); ctx.fill();
  }

  Road.prototype.drawRoad = function (ctx) {
    var sc = this.scene, th = sc.theme, t = sc.track, pal = sc.pal, half = sc.half, W = this.W, N = this.N, res = this.res;
    var fogN = th.fogNear, fogR = 1 / (th.fogFar - th.fogNear);
    // fill the ground under the horizon first (covers gaps behind crests)
    ctx.fillStyle = pal.grass[0][FOG_STEPS - 1];
    var top = Math.min(this.hz, this.clip[N]);
    ctx.fillRect(0, top - 1, W, this.H - top + 2);
    var lanes = t.lanes, LW = TR.LANE_W, vergeF = sc.vergeF, rumbleF = sc.rumbleF;
    var n = 1;
    while (n < N) {
      var step = n < 40 ? 1 : n < 90 ? 2 : 4;
      var i0 = this.idx[n];
      if (step > 1 && (i0 % step)) step = 1;           // keep strips aligned so stripes never flicker
      var n2 = Math.min(N, n + step);
      var y1 = this.sy[n], y2 = this.sy[n2];
      var clipY = this.clip[n2];
      if (this.sc[n] === 0 || y2 >= y1 || y2 >= clipY) { n = n2; continue; }
      if (y1 > clipY) y1 = clipY;
      var x1 = this.sx[n], x2 = this.sx[n2], s1 = this.sc[n], s2 = this.sc[n2];
      var w1 = half * s1, w2 = half * s2;
      var d = this.dz[n2], fi = (d - fogN) * fogR;
      fi = fi <= 0 ? 0 : fi >= 1 ? FOG_STEPS - 1 : (fi * (FOG_STEPS - 1)) | 0;
      var par = ((i0 >> 2) & 1);
      // snap strip edges to the device-pixel grid: a fractional (anti-aliased) edge row would let the rumble /
      // verge drawn underneath show through as thin lines across the road
      y2 = Math.floor(y2 * res) / res; y1 = Math.ceil(y1 * res) / res;
      ctx.fillStyle = pal.grass[par][fi]; ctx.fillRect(0, y2, W, y1 - y2);
      ctx.fillStyle = pal.verge[par][fi]; quad(ctx, x1, y1, w1 * vergeF, x2, y2, w2 * vergeF);
      ctx.fillStyle = pal.rumble[par][fi]; quad(ctx, x1, y1, w1 * rumbleF, x2, y2, w2 * rumbleF);
      ctx.fillStyle = pal.road[par][fi]; quad(ctx, x1, y1, w1, x2, y2, w2);
      if (n < 110) {
        // edge lines
        var e1 = (half - 0.3) * s1, e2 = (half - 0.3) * s2, ew1 = 0.09 * s1, ew2 = 0.09 * s2;
        ctx.fillStyle = pal.edge[fi];
        quad(ctx, x1 - e1, y1, ew1, x2 - e2, y2, ew2); quad(ctx, x1 + e1, y1, ew1, x2 + e2, y2, ew2);
        // lane dashes
        if (pal.lane && (i0 & 7) < 3) {
          ctx.fillStyle = pal.lane[fi];
          for (var k = 1; k < lanes; k++) {
            var lx = -half + k * LW;
            quad(ctx, x1 + lx * s1, y1, 0.08 * s1, x2 + lx * s2, y2, 0.08 * s2);
          }
        }
      }
      // closed lanes (barriers are billboards; here the closed tarmac gets warning stripes)
      var ic = Math.min(t.n - 1, Math.max(0, i0)), ic2 = Math.min(t.n - 1, Math.max(0, this.idx[n2]));
      var lo1 = t.lo[ic], lo2 = t.lo[ic2], hi1 = t.hi[ic], hi2 = t.hi[ic2];
      if (lo1 > -half + 0.05 || lo2 > -half + 0.05) {
        ctx.fillStyle = pal.closed[(i0 >> 1) & 1][fi];
        quad2(ctx, x1 - w1, y1, x1 + lo1 * s1, x2 - w2, y2, x2 + lo2 * s2);
      }
      if (hi1 < half - 0.05 || hi2 < half - 0.05) {
        ctx.fillStyle = pal.closed[(i0 >> 1) & 1][fi];
        quad2(ctx, x1 + hi1 * s1, y1, x1 + w1, x2 + hi2 * s2, y2, x2 + w2);
      }
      // start / finish checkers
      var zA = i0 * SEG, zB = this.idx[n2] * SEG;
      if ((zA <= 0 && zB > 0) || (zA <= t.length && zB > t.length) || (zA <= 2 && zB > 2) || (zA <= t.length + 2 && zB > t.length + 2)) {
        var cols = 10, cw1 = 2 * w1 / cols, cw2 = 2 * w2 / cols, row = (zA <= 0 || zA >= t.length + 1) ? 0 : 1;
        if (zA > 2 && zA < t.length) row = 0;
        ctx.fillStyle = '#ffffff'; quad(ctx, x1, y1, w1, x2, y2, w2);
        ctx.fillStyle = '#16161c';
        for (var cc = row; cc < cols; cc += 2) quad2(ctx, x1 - w1 + cc * cw1, y1, x1 - w1 + (cc + 1) * cw1, x2 - w2 + cc * cw2, y2, x2 - w2 + (cc + 1) * cw2);
      }
      n = n2;
    }
  };

  /* ------------------------------------------------------------------ flats (on the road surface) */

  Road.prototype.drawFlat = function (ctx, spr, z, x, w, len, alpha) {
    if (!this.pt(z - len / 2, x, 0)) return;
    var nx = this.pX, ny = this.pY, ns = this.pS, clipN = this.pClip;
    if (!this.pt(z + len / 2, x, 0)) return;
    var fx = this.pX, fy = this.pY, fs = this.pS;
    if (fy >= clipN || ny <= fy) return;
    var h = ny - fy, ww = w * (ns + fs) / 2, img = spr.img, res = this.res;
    if (ww < 1.5) return;
    var visH = Math.min(h, clipN - fy);
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    // skew so the decal follows a bending road: top edge at the far x, bottom at the near x
    ctx.setTransform(res * ww / img.width, 0, res * (nx - fx) / img.height * (h / h), res * h / img.height, res * (fx - ww / 2), res * fy);
    var srcH = img.height * visH / h;
    ctx.drawImage(img, 0, 0, img.width, srcH, 0, 0, img.width, srcH);
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.globalAlpha = 1;
  };

  /* ------------------------------------------------------------------ billboards */

  /** Queue a sprite at world (z, x, y) with scale mul. mode: 0 normal, 1 additive glow, 2 rotated, 3 player. */
  Road.prototype.queue = function (spr, z, x, y, mul, alpha, mode, rot) {
    if (!this.pt(z, x, y)) return -1;
    if (this.nRec >= MAXREC) return -1;
    var s = this.pS * (mul || 1), w = spr.w * s, h = spr.h * s;
    if (h < 1 && w < 1) return -1;
    var top = this.pY - spr.ay * h;
    if (top >= this.pClip) return -1;
    var r = this.nRec++, n = this.pN;
    this.rImg[r] = spr.img; this.rX[r] = this.pX - spr.ax * w; this.rY[r] = top; this.rW[r] = w; this.rH[r] = h;
    this.rClip[r] = mode === 1 ? 1e5 : this.pClip;
    var fogA = 1;
    var th = this.scene.theme, d = this.pD;
    if (d > th.fogNear) fogA = 1 - Math.min(0.85, (d - th.fogNear) / (th.fogFar - th.fogNear) * 0.85);
    var fadeStart = this.N * SEG * 0.8;
    if (d > fadeStart) fogA *= Math.max(0, 1 - (d - fadeStart) / (this.N * SEG * 0.2));
    this.rA[r] = (alpha === undefined ? 1 : alpha) * fogA;
    this.rMode[r] = mode || 0; this.rRot[r] = rot || 0;
    this.rNext[r] = -1;                       // FIFO per bucket: things queued later draw on top (lights over cars)
    if (this.head[n] < 0) this.head[n] = r; else this.rNext[this.tail[n]] = r;
    this.tail[n] = r;
    return r;
  };

  Road.prototype.glowFor = function (color) {
    if (!this.glowCache[color]) this.glowCache[color] = { img: P.glow(64, color), w: 1, h: 1, ax: 0.5, ay: 0.5 };
    return this.glowCache[color];
  };

  Road.prototype.drawRecords = function (ctx) {
    for (var n = this.N; n >= 0; n--) {
      for (var r = this.head[n]; r >= 0; r = this.rNext[r]) {
        var a = this.rA[r];
        if (a <= 0.01) continue;
        var mode = this.rMode[r], img = this.rImg[r], x = this.rX[r], y = this.rY[r], w = this.rW[r], h = this.rH[r], clip = this.rClip[r];
        if (mode === 3) { this.drawPlayer(ctx, r); continue; }
        ctx.globalAlpha = a > 1 ? 1 : a;
        if (mode === 1) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(img, x, y, w, h);
          ctx.globalCompositeOperation = 'source-over';
        } else if (mode === 2) {
          ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(this.rRot[r]);
          ctx.drawImage(img, -w / 2, -h / 2, w, h); ctx.restore();
        } else if (y + h > clip) {
          var vh = clip - y;
          if (vh > 0.5) ctx.drawImage(img, 0, 0, img.width, img.height * vh / h, x, y, w, vh);
        } else ctx.drawImage(img, x, y, w, h);
      }
    }
    ctx.globalAlpha = 1;
  };

  /* ------------------------------------------------------------------ frame */

  /** s: sim state (or a demo state with the same shape); view: { speed 0..1, t, events, dark, title } */
  Road.prototype.render = function (s, dt, view) {
    var ctx = this.ctx, sc = this.scene;
    if (!sc) return;
    view = view || {};
    var c = s.car, th = sc.theme, t = sc.track, a = sc.atlas, res = this.res, W = this.W, H = this.H;
    this.t += dt;
    var tt = this.t;
    // camera follows the car sideways (a little lazily, so the car visibly moves on screen)
    var want = c.x * 0.72;
    this.camX += (want - this.camX) * Math.min(1, dt * 5);
    var dzMoved = c.z - this.lastZ; this.lastZ = c.z;
    if (Math.abs(dzMoved) < 50) this.skyX += TR.curveAt(t, c.z) * dzMoved * 2.2;
    this.fx.update(dt, view.speed || 0, -TR.curveAt(t, c.z) * (view.speed || 0) * 120 - (c.vx || 0) * 12);
    this.shX = this.fx.sx; this.shY = this.fx.sy;
    view.shakeX = this.shX; view.shakeY = this.shY;
    this.project(c, view);

    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    SKY.draw(ctx, this.bg, this.hz + this.shY, this.skyX, (this.camY - TR.heightAt(t, Math.max(0, c.z))) * 0, tt);
    if (this.bg.shafts) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + Math.sin(tt * 0.7) * 0.1;
      ctx.drawImage(this.bg.shafts, Math.sin(tt * 0.3) * 20 - 20, 0, W + 40, this.hz + 30);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    this.drawRoad(ctx);

    // flats
    var items = s.items, lo = this.camZ - 4, hi = this.camZ + this.N * SEG;
    var i0 = lowerBoundItems(items, lo - 4);
    var j, o;
    for (j = i0; j < items.length; j++) {
      o = items[j];
      if (o.z > hi) break;
      if (o.type === 'pothole' || o.type === 'oil' || o.type === 'puddle') {
        this.drawFlat(ctx, a.items[o.type], o.z, o.x, o.w * 1.25, o.len * (o.type === 'pothole' ? 1.25 : 1.1));
      } else if (o.type === 'rock' && o.state === 'warn') {
        var k = 1 - o.y / 26;
        this.drawFlat(ctx, a.items.shadow, o.z, o.x, 2.4 * (0.4 + 0.8 * k), 2.4 * (0.4 + 0.8 * k), 0.4 + 0.5 * k);
      }
    }
    var dyn = s.dyn || [];
    for (j = 0; j < dyn.length; j++) {
      o = dyn[j];
      if (o.type === 'oil' || o.type === 'puddle') this.drawFlat(ctx, a.items[o.type], o.z, o.x, o.w * 1.2, o.len * 1.1);
    }
    // car shadows
    var shadow = CARS.shadow();
    var tr = s.traffic || [];
    for (j = 0; j < tr.length; j++) this.drawFlat(ctx, shadow, tr[j].z, tr[j].x, tr[j].w * 1.25, tr[j].len * 0.9, 0.8);
    if (s.boss) this.drawFlat(ctx, shadow, s.boss.z, s.boss.x, s.boss.w * 1.3, s.boss.len, 0.8);
    var air = c.y || 0, shk = 1 / (1 + air * 0.25);
    if (!view.hideCar) this.drawFlat(ctx, shadow, c.z + 1.4, c.x, 2.2 * shk, 2.6 * shk, 0.8 * shk);

    // headlights on the road (night)
    if (th.headlights && !view.hideCar && this.pt(c.z + 1.5, c.x, 0)) {
      var by = this.pY, bx = this.pX, bs = this.pS;
      if (this.pt(c.z + 42, c.x + (c.vx || 0) * 0.5, 0)) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.42;
        var topW = 16 * this.pS, tx = this.pX, ty = this.pY;
        ctx.save();
        ctx.setTransform(res * topW / 128, 0, res * (bx - tx) / 128, res * (by - ty) / 128, res * (tx - topW / 2), res * ty);
        ctx.drawImage(this.headlight, 0, 0);
        ctx.restore();
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      void bs;
    }

    // billboards
    this.nRec = 0;
    this.head.fill(-1);
    var props = sc.props, pi = lowerBound(sc.propZ, lo), reflect = th.reflections;
    for (j = pi; j < props.length; j++) {
      var p = props[j];
      if (p.z > hi) break;
      this.queue(p.spr, p.z, p.x, 0, p.s, 1, 0);
      if (reflect && p.spr.refl && this.pD < 160) {
        var gl = this.glowFor(p.spr.refl), rx = p.spr.reflX !== undefined ? (p.spr.reflX - 0.5) * p.spr.w * p.s : 0;
        var rr = this.queue(gl, p.z - 0.5, p.x + rx, 0, 0, 0.5, 1);
        if (rr >= 0) { this.rW[rr] = 1.6 * this.pS * p.s; this.rH[rr] = 6 * this.pS; this.rX[rr] = this.pX - this.rW[rr] / 2; this.rY[rr] = this.pY - this.rH[rr] * 0.1; }
      }
    }
    for (j = i0; j < items.length; j++) {
      o = items[j];
      if (o.z > hi) break;
      this.queueItem(o, s, a, tt);
    }
    for (j = 0; j < dyn.length; j++) this.queueItem(dyn[j], s, a, tt);
    var blink = (tt * 2.6) % 1 < 0.55, night = th.dark;
    for (j = 0; j < tr.length; j++) {
      var k2 = tr[j], cs = CARS.traffic(k2.kind, k2.color);
      var hitA = k2.hitT > 2.4 ? ((tt * 14) % 1 < 0.5 ? 0.4 : 1) : 1;
      if (this.queue(cs, k2.z - k2.len / 2, k2.x, 0, 1, hitA, 0) >= 0) this.lights(cs, k2.z - k2.len / 2 - 0.05, k2.x, k2.sig, blink, night, reflect);
    }
    if (s.boss) {
      var b = s.boss, bs2 = CARS.boss(sc.track.def.boss.kind);
      var flash = b.hitT > 0 ? ((tt * 10) % 1 < 0.5 ? 0.35 : 1) : 1;
      var bounce = Math.abs(Math.sin(tt * 9)) * 0.05;
      if (this.queue(bs2, b.z - b.len / 2, b.x, bounce, 1, flash, 0) >= 0) {
        this.lights(bs2, b.z - b.len / 2 - 0.05, b.x, b.sig, blink, night || true, reflect);
        if (bs2.lights.beacon && (tt * 3) % 1 < 0.5) this.queue(this.glowFor('#ff9a1a'), b.z - b.len / 2 - 0.1, b.x + bs2.lights.beacon[0], bs2.lights.beacon[1] - 0.5, 1.6, 0.9, 1);
        if (b.warnT > 0) this.queue(this.glowFor('#ff3b3b'), b.z - b.len / 2 - 0.1, b.x, bs2.h + 0.3, 1.2 + Math.sin(tt * 30) * 0.3, 1, 1);
      }
    }
    // player car
    if (!view.hideCar) {
      var turn = clamp((c.vx || 0) / 6.5 + (c.skidT > 0 ? Math.sin(tt * 20) * 0.3 : 0), -1, 1);
      var pose = Math.round((turn + 1) * 2), pspr = sc.car[clamp(pose, 0, 4)];
      var bob = c.air ? 0 : Math.sin(tt * 26) * 0.012 * (view.speed || 0) + (c.offroad ? Math.sin(tt * 47) * 0.04 : 0);
      var rec = this.queue(pspr, c.z, c.x, air + bob + (this.bump || 0), 1, (c.invulnT > 0 && c.invulnT < 10 && (tt * 12) % 1 < 0.4) ? 0.45 : 1, 3);
      if (rec >= 0) {
        this.rRot[rec] = -turn * 0.035 + (c.skidT > 0 ? Math.sin(tt * 9) * 0.06 : 0) + (c.scrape || 0) * 0.03;
        this.carSX = this.pX; this.carSY = this.pY; this.carScale = this.pS; this.carW = pspr.w * this.pS;
        this.carRec = pspr;
        if (night || view.lights) this.lights(pspr, c.z - 0.05, c.x, 0, false, true, reflect, air + bob, c.brake);
      }
    }
    this.drawRecords(ctx);

    // particles from the wheels
    this.wheelFx(s, view, dt);
    this.fx.drawParticles(ctx);
    if (th.mist) {
      ctx.globalAlpha = 0.3 + Math.sin(tt * 0.5) * 0.08;
      ctx.drawImage(this.bg.haze, 0, this.hz - 26, W, 44);
      ctx.globalAlpha = 1;
    }
    this.fx.drawWeather(ctx, view.speed || 0);
    if (view.speedLines) this.fx.drawSpeedLines(ctx, view.speedLines, W / 2, this.hz);
    if (this.tint) ctx.drawImage(this.tint, 0, 0, W, H);
    if (view.flash) { ctx.globalAlpha = view.flash; ctx.fillStyle = view.flashColor || '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  };

  /** Tail lights (night / brake), blinkers on the signal side, wet reflections. */
  Road.prototype.lights = function (spr, z, x, sig, blinkOn, night, reflect, y, brake) {
    var L = spr.lights;
    if (!L) return;
    var g = this.gl, s = L.w * 2.2 + 0.4, yy = y || 0;
    if (night || brake) {
      this.queue(g.red, z, x + L.l[0], L.l[1] + yy, s, brake ? 1 : 0.8, 1);
      this.queue(g.red, z, x + L.r[0], L.r[1] + yy, s, brake ? 1 : 0.8, 1);
      if (reflect) {
        this.queue(g.redRefl, z, x + L.l[0], 0, 1, 0.45, 1);
        this.queue(g.redRefl, z, x + L.r[0], 0, 1, 0.45, 1);
      }
    }
    if (sig && blinkOn) {
      var side = sig < 0 ? L.l : L.r;
      this.queue(g.amber, z, x + side[0] + sig * 0.05, side[1] + yy, 2.1, 1, 1);
      this.queue(g.amber, z, x + side[0] + sig * 0.05, side[1] + yy, 0.9, 1, 1);
    }
  };

  Road.prototype.queueItem = function (o, s, a, tt) {
    var type = o.type;
    if (type === 'coin') {
      if (o.done) return;
      var f = ((tt * 9 + o.id * 0.7) | 0) & 7;
      this.queue(a.coin[f], o.z, o.x, (o.y || 0) + 0.75 + Math.sin(tt * 3 + o.id) * 0.08, 1, 1, 0);
    } else if (type === 'fuel' || type === 'wrench') {
      if (o.done) return;
      var yb = 0.3 + Math.sin(tt * 2.5 + o.id) * 0.15;
      this.queue(this.glowFor(type === 'fuel' ? '#ffd84a' : '#4fb8ff'), o.z, o.x, yb + 0.6, 2.4, 0.55, 1);
      this.queue(a.items[type], o.z, o.x, yb, 1, 1, 0);
    } else if (type === 'cone') {
      if (o.done) {
        var dt = s.t - (o.knockT || 0);
        if (dt > 1.2 || dt < 0) return;
        this.queue(a.items.cone, o.z + dt * 6, o.x + (o.knockDir || 1) * dt * 7, 6 * dt - 9 * dt * dt, 1, 1 - dt / 1.2, 2, dt * 9 * (o.knockDir || 1));
      } else this.queue(a.items.cone, o.z, o.x, 0, 1, 1, 0);
    } else if (type === 'rock') {
      if (o.state === 'wait') return;
      this.queue(a.items.rock, o.z, o.x, o.y || 0, 1, 1, o.state === 'warn' ? 2 : 0, o.state === 'warn' ? tt * 4 : 0);
    } else if (type === 'ramp') {
      this.queue(a.items.ramp, o.z - o.len / 2 + 0.5, o.x, 0, 1, 1, 0);
    }
  };

  Road.prototype.drawPlayer = function (ctx, r) {
    var img = this.rImg[r], x = this.rX[r], y = this.rY[r], w = this.rW[r], h = this.rH[r];
    ctx.globalAlpha = this.rA[r];
    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.rotate(this.rRot[r]);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    ctx.globalAlpha = 1;
  };

  /** Continuous wheel effects: dust/snow/mud off-road, smoke while skidding, spray on wet roads. */
  Road.prototype.wheelFx = function (s, view, dt) {
    var c = s.car, th = this.scene.theme, fx = this.fx, v = view.speed || 0;
    if (view.hideCar || !this.carScale || s.status === 'countdown') return;
    var sc = this.carScale, wx = this.carW * 0.36, y = this.carSY - 2;
    this._acc = (this._acc || 0) + dt * 60;
    if (this._acc < 1) return;
    this._acc = 0;
    var r = fx.rnd();
    if (c.offroad && v > 0.05) {
      var kind = th.key === 'snow' ? 'snow' : th.key === 'jungle' ? 'mud' : 'dust';
      fx.burst(kind, this.carSX + (r < 0.5 ? -wx : wx), y, sc, kind === 'dust' ? 1 : 2);
    } else if (th.key === 'snow' && v > 0.4 && r < 0.5) {
      fx.burst('snow', this.carSX + (r < 0.25 ? -wx : wx), y, sc * 0.6, 1);
    } else if (th.key === 'desert' && v > 0.5 && r < 0.25) {
      fx.burst('dust', this.carSX + (r < 0.12 ? -wx : wx), y, sc * 0.5, 1);
    } else if (th.rain && v > 0.3 && r < 0.6) {
      fx.burst('splash', this.carSX + (r < 0.3 ? -wx : wx), y, sc * 0.35, 1);
    }
    if (c.skidT > 0 && v > 0.1) fx.burst(th.key === 'snow' ? 'snow' : 'smoke', this.carSX + (r < 0.5 ? -wx : wx), y, sc, 1);
    if (c.scrape) fx.burst('sparks', this.carSX + c.scrape * -wx * 1.3, y - sc * 0.4, sc, 2);
  };

  /** Effects for sim events at the car. */
  Road.prototype.event = function (e, s) {
    var fx = this.fx, sc = this.carScale || 40, x = this.carSX, y = this.carSY, th = this.scene.theme;
    switch (e.type) {
      case 'coin': fx.burst('sparkle', x + (fx.rnd() - 0.5) * sc, y - sc * 1.1, sc * 0.8, 3); break;
      case 'fuel': case 'wrench': fx.burst('sparkle', x, y - sc * 0.8, sc, 10); break;
      case 'hit':
        if (e.kind === 'pothole') { fx.shake(5, 0.3); fx.burst('dust', x, y, sc, 5); this.kick(0.12); }
        else if (e.kind === 'traffic') { fx.shake(9, 0.45); fx.burst('sparks', x, y - sc * 0.6, sc, 22); }
        else if (e.kind === 'rock') { fx.shake(11, 0.5); fx.burst('sparks', x, y - sc * 0.5, sc, 18); fx.burst('dust', x, y, sc, 8); }
        else if (e.kind === 'barrier') { fx.shake(4, 0.25); }
        else if (e.kind === 'cone') { fx.shake(2.5, 0.2); fx.burst('debris', x, y - sc * 0.3, sc, 6); }
        break;
      case 'splash': fx.burst(th.key === 'jungle' ? 'mud' : 'splash', x, y, sc, 30); fx.shake(2, 0.2); break;
      case 'skid': fx.burst(th.key === 'snow' ? 'snow' : 'smoke', x, y, sc, 6); break;
      case 'jump': fx.burst('dust', x, y, sc, 6); break;
      case 'land': fx.shake(4, 0.25); fx.burst(th.key === 'snow' ? 'snow' : th.key === 'jungle' ? 'mud' : 'dust', x, y, sc, 10); this.kick(0.15); break;
      case 'rockLand':
        if (this.pt(e.z, e.x, 0)) { fx.burst('dust', this.pX, this.pY, this.pS, 10); if (this.pD < 60) fx.shake(3, 0.3); }
        break;
      case 'bossHit': fx.shake(10, 0.45); fx.burst('sparks', x, y - sc * 0.8, sc, 28); fx.burst('sparkle', x, y - sc * 1.5, sc, 12); break;
      case 'lifeLost': fx.shake(14, 0.6); fx.burst('smoke', x, y - sc * 0.5, sc * 1.5, 14); fx.burst('sparks', x, y - sc * 0.5, sc, 30); break;
      case 'respawn': fx.burst('sparkle', x, y - sc * 0.6, sc * 1.2, 16); break;
      case 'checkpoint': fx.burst('confetti', x, y - sc * 3, sc, 40); break;
      case 'finish': fx.burst('confetti', this.W / 2, this.H * 0.3, sc, 90); break;
      case 'bossDrop':
        if (this.pt(e.z, e.x, 0)) fx.burst(e.kind === 'oil' ? 'smoke' : 'dust', this.pX, this.pY, this.pS, 6);
        break;
    }
  };

  Road.prototype.kick = function (v) { this.bump = v; var self = this; setTimeout(function () { self.bump = 0; }, 90); };

  function lowerBoundItems(items, z) {
    var lo = 0, hi = items.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (items[m].z < z) lo = m + 1; else hi = m; }
    return lo;
  }

  root.RR = root.RR || {};
  root.RR.road = { create: function (canvas) { return new Road(canvas); }, CAM_BACK: CAM_BACK, QUALITY: QUALITY };
})(window);
