/* Effects: a pooled particle system (struct-of-arrays, no allocation while racing), weather (snow, rain, leaves,
 * desert dust), speed lines and screen shake. Particles live in screen space (CSS px) — they are spawned at the
 * car's wheels or at a projected world point by the road renderer. Browser only: RR.fx. */
(function (root) {
  'use strict';
  var P = root.RR.paint;

  var MAX = 420;
  var K = { dust: 0, smoke: 1, splash: 2, snow: 3, spark: 4, leaf: 5, sparkle: 6, mud: 7, confetti: 8, debris: 9 };

  function puff(color, size) {
    var c = P.canvas(size, size), ctx = c.getContext('2d'), h = size / 2;
    ctx.fillStyle = P.rad(ctx, h, h, 0, h, [[0, P.rgba(color, 0.9)], [0.5, P.rgba(color, 0.45)], [1, P.rgba(color, 0)]]);
    ctx.fillRect(0, 0, size, size);
    return c;
  }
  function leafImg(color) {
    var c = P.canvas(24, 24), ctx = c.getContext('2d');
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(12, 12, 5, 10, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,60,0,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(9, 3); ctx.lineTo(15, 21); ctx.stroke();
    return c;
  }
  function starImg() {
    var c = P.canvas(32, 32), ctx = c.getContext('2d');
    ctx.fillStyle = P.rad(ctx, 16, 16, 0, 16, [[0, 'rgba(255,240,150,0.9)'], [1, 'rgba(255,200,60,0)']]); ctx.fillRect(0, 0, 32, 32);
    ctx.fillStyle = '#fffbe0'; P.star(ctx, 16, 16, 10, 3.5, 4); ctx.fill();
    return c;
  }

  function Fx() {
    this.n = 0;
    this.x = new Float32Array(MAX); this.y = new Float32Array(MAX); this.vx = new Float32Array(MAX); this.vy = new Float32Array(MAX);
    this.life = new Float32Array(MAX); this.max = new Float32Array(MAX); this.size = new Float32Array(MAX);
    this.grav = new Float32Array(MAX); this.grow = new Float32Array(MAX); this.rot = new Float32Array(MAX); this.vr = new Float32Array(MAX);
    this.kind = new Uint8Array(MAX); this.col = new Uint8Array(MAX);
    this.limit = MAX;
    this.img = {
      dust: puff('#e8c9a0', 64), smoke: puff('#d9dde3', 64), splash: puff('#bfe6ff', 32), snow: puff('#ffffff', 32),
      mud: puff('#7a5030', 32), sparkle: starImg(), leaves: [leafImg('#3fa548'), leafImg('#7cc44a'), leafImg('#d9a43a')],
      darkdust: puff('#b08560', 64)
    };
    this.confettiCols = ['#ff4f6d', '#ffd23a', '#3fd0ff', '#7dff6a', '#b46bff'];
    this.shakeT = 0; this.shakeA = 0; this.sx = 0; this.sy = 0;
    this.t = 0;
    // weather pools
    this.wN = 0; this.wx = new Float32Array(260); this.wy = new Float32Array(260); this.wz = new Float32Array(260); this.wr = new Float32Array(260);
    this.weather = null;
    this.W = 1; this.H = 1;
    this.seed = 1;
  }

  Fx.prototype.rnd = function () {
    // tiny LCG: effects only (never touches the deterministic sim)
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  };

  Fx.prototype.setQuality = function (q) { this.limit = q >= 2 ? 160 : q >= 1 ? 280 : MAX; };

  Fx.prototype.clear = function () { this.n = 0; this.shakeT = 0; };

  /** Spawn one particle; returns false when the pool is full. */
  Fx.prototype.add = function (kind, x, y, vx, vy, life, size, grav, grow) {
    if (this.n >= this.limit) return false;
    var i = this.n++;
    this.kind[i] = kind; this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy;
    this.life[i] = life; this.max[i] = life; this.size[i] = size; this.grav[i] = grav || 0; this.grow[i] = grow || 0;
    this.rot[i] = this.rnd() * 6.28; this.vr[i] = (this.rnd() - 0.5) * 10; this.col[i] = (this.rnd() * 5) | 0;
    return true;
  };

  /** Burst helpers (px, scale = px per metre at that depth). */
  Fx.prototype.burst = function (type, x, y, scale, n) {
    var r = this.rnd.bind(this), i;
    scale = Math.max(4, scale || 40);
    switch (type) {
      case 'splash':
        for (i = 0; i < (n || 26); i++) this.add(K.splash, x + (r() - 0.5) * scale * 1.6, y, (r() - 0.5) * scale * 6, -(1.5 + r() * 4) * scale, 0.5 + r() * 0.4, (0.15 + r() * 0.25) * scale, scale * 14, 0);
        break;
      case 'mud':
        for (i = 0; i < (n || 22); i++) this.add(K.mud, x + (r() - 0.5) * scale * 1.6, y, (r() - 0.5) * scale * 5, -(1 + r() * 3) * scale, 0.5 + r() * 0.4, (0.15 + r() * 0.25) * scale, scale * 14, 0);
        break;
      case 'sparks':
        for (i = 0; i < (n || 18); i++) this.add(K.spark, x, y, (r() - 0.5) * scale * 9, -(r() * 4) * scale, 0.25 + r() * 0.3, 0.06 * scale + 1, scale * 12, 0);
        break;
      case 'dust':
        for (i = 0; i < (n || 10); i++) this.add(K.dust, x + (r() - 0.5) * scale * 2, y - r() * scale * 0.4, (r() - 0.5) * scale * 2, -(0.3 + r()) * scale, 0.6 + r() * 0.6, (0.4 + r() * 0.5) * scale, 0, scale * 1.2);
        break;
      case 'snow':
        for (i = 0; i < (n || 16); i++) this.add(K.snow, x + (r() - 0.5) * scale * 2, y, (r() - 0.5) * scale * 4, -(0.8 + r() * 2.5) * scale, 0.6 + r() * 0.5, (0.12 + r() * 0.25) * scale, scale * 8, 0);
        break;
      case 'smoke':
        for (i = 0; i < (n || 3); i++) this.add(K.smoke, x + (r() - 0.5) * scale * 0.6, y, (r() - 0.5) * scale, -(0.2 + r() * 0.5) * scale, 0.5 + r() * 0.5, (0.3 + r() * 0.3) * scale, 0, scale * 1.6);
        break;
      case 'sparkle':
        for (i = 0; i < (n || 6); i++) this.add(K.sparkle, x + (r() - 0.5) * scale, y + (r() - 0.5) * scale, (r() - 0.5) * scale * 3, -(0.5 + r() * 2) * scale, 0.4 + r() * 0.25, (0.12 + r() * 0.16) * scale, 0, -scale * 0.15);
        break;
      case 'confetti':
        for (i = 0; i < (n || 60); i++) this.add(K.confetti, x + (r() - 0.5) * 60, y, (r() - 0.5) * 500, -(200 + r() * 400), 1.6 + r(), 5 + r() * 5, 500, 0);
        break;
      case 'debris':
        for (i = 0; i < (n || 8); i++) this.add(K.debris, x, y, (r() - 0.5) * scale * 6, -(1 + r() * 3) * scale, 0.5 + r() * 0.3, (0.05 + r() * 0.06) * scale + 1, scale * 14, 0);
        break;
    }
  };

  Fx.prototype.shake = function (amount, time) {
    if (amount > this.shakeA || this.shakeT <= 0) this.shakeA = amount;
    this.shakeT = Math.max(this.shakeT, time || 0.35);
  };

  Fx.prototype.setWeather = function (kind, W, H) {
    this.weather = kind; this.W = W; this.H = H;
    var n = kind === 'snow' ? 150 : kind === 'rain' ? 170 : kind === 'leaves' ? 18 : kind === 'dust' ? 40 : 0;
    if (this.limit < MAX) n = Math.round(n * 0.6);
    this.wN = n;
    for (var i = 0; i < n; i++) {
      this.wx[i] = this.rnd() * W; this.wy[i] = this.rnd() * H; this.wz[i] = 0.3 + this.rnd() * 0.7; this.wr[i] = this.rnd() * 6.28;
    }
  };

  /** Advance particles + weather. speed 0..1, drift = sideways screen motion (px/s) from steering and bends. */
  Fx.prototype.update = function (dt, speed, drift) {
    this.t += dt;
    var i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {     // swap-remove
        var j = --this.n;
        this.kind[i] = this.kind[j]; this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j];
        this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.size[i] = this.size[j]; this.grav[i] = this.grav[j];
        this.grow[i] = this.grow[j]; this.rot[i] = this.rot[j]; this.vr[i] = this.vr[j]; this.col[i] = this.col[j];
        continue;
      }
      this.vy[i] += this.grav[i] * dt;
      this.vx[i] *= 0.985;
      this.x[i] += (this.vx[i] + drift * 0.5) * dt;
      this.y[i] += this.vy[i] * dt + speed * 30 * dt * (this.kind[i] === K.smoke || this.kind[i] === K.dust ? 1 : 0);
      this.size[i] = Math.max(0.5, this.size[i] + this.grow[i] * dt);
      this.rot[i] += this.vr[i] * dt;
      i++;
    }
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      var a = this.shakeA * Math.min(1, this.shakeT / 0.3);
      this.sx = (this.rnd() - 0.5) * 2 * a; this.sy = (this.rnd() - 0.5) * 2 * a;
    } else { this.sx = 0; this.sy = 0; }
    // weather
    var W = this.W, H = this.H, cx = W / 2, cy = H * 0.42;
    for (i = 0; i < this.wN; i++) {
      var z = this.wz[i];
      if (this.weather === 'snow') {
        this.wy[i] += (40 + 50 * z + speed * 120 * z) * dt;
        this.wx[i] += (Math.sin(this.t * 1.5 + this.wr[i]) * 18 * z + drift * z + (this.wx[i] - cx) * speed * 1.2 * z) * dt;
      } else if (this.weather === 'rain') {
        this.wy[i] += (700 + 500 * z) * dt;
        this.wx[i] += (drift * z - 60 * z + (this.wx[i] - cx) * speed * 0.8) * dt;
      } else if (this.weather === 'leaves') {
        this.wy[i] += (30 + 30 * z) * dt;
        this.wx[i] += (Math.sin(this.t * 1.2 + this.wr[i]) * 40 + drift * z + (this.wx[i] - cx) * speed * 1.5 * z) * dt;
        this.wr[i] += dt * 2;
      } else if (this.weather === 'dust') {
        this.wx[i] += (60 + drift + (this.wx[i] - cx) * speed) * z * dt;
        this.wy[i] += (Math.sin(this.t + this.wr[i]) * 10 + (this.wy[i] - cy) * speed * 0.6) * z * dt;
      }
      if (this.wy[i] > H + 10 || this.wx[i] < -20 || this.wx[i] > W + 20 || this.wy[i] < -20) {
        this.wx[i] = this.rnd() * W;
        this.wy[i] = this.weather === 'dust' ? H * (0.4 + this.rnd() * 0.6) : -10 - this.rnd() * H * 0.3;
        if (speed > 0.3 && this.weather !== 'rain' && this.rnd() < 0.5) { this.wx[i] = cx + (this.rnd() - 0.5) * W * 0.6; this.wy[i] = cy + (this.rnd() - 0.5) * H * 0.3; }
      }
    }
  };

  Fx.prototype.drawParticles = function (ctx) {
    var img = this.img, i;
    for (i = 0; i < this.n; i++) {
      var k = this.kind[i], a = this.life[i] / this.max[i], s = this.size[i], x = this.x[i], y = this.y[i];
      if (k === K.spark || k === K.confetti || k === K.debris) continue;
      var im = k === K.dust ? img.dust : k === K.smoke ? img.smoke : k === K.splash ? img.splash : k === K.snow ? img.snow :
        k === K.mud ? img.mud : k === K.sparkle ? img.sparkle : null;
      if (k === K.leaf) im = img.leaves[this.col[i] % 3];
      if (!im) continue;
      ctx.globalAlpha = k === K.smoke ? a * 0.55 : k === K.dust ? a * 0.6 : a;
      ctx.drawImage(im, x - s, y - s, s * 2, s * 2);
    }
    // sparks: additive streaks in one path
    ctx.globalAlpha = 1;
    var any = false;
    ctx.beginPath();
    for (i = 0; i < this.n; i++) {
      if (this.kind[i] !== K.spark) continue;
      any = true;
      ctx.moveTo(this.x[i], this.y[i]); ctx.lineTo(this.x[i] - this.vx[i] * 0.03, this.y[i] - this.vy[i] * 0.03);
    }
    if (any) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
    for (i = 0; i < this.n; i++) {
      var kk = this.kind[i];
      if (kk !== K.confetti && kk !== K.debris) continue;
      ctx.globalAlpha = Math.min(1, this.life[i] / this.max[i] * 2);
      ctx.fillStyle = kk === K.debris ? '#ff7a1a' : this.confettiCols[this.col[i]];
      var c = Math.cos(this.rot[i]), sz = this.size[i];
      ctx.fillRect(this.x[i] - sz / 2, this.y[i] - sz * Math.abs(c) / 2, sz, sz * Math.abs(c) + 1);
    }
    ctx.globalAlpha = 1;
  };

  Fx.prototype.drawWeather = function (ctx, speed) {
    var i, n = this.wN;
    if (!n) return;
    if (this.weather === 'snow') {
      for (var layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        for (i = layer; i < n; i += 3) {
          var r = 1 + this.wz[i] * 2.8;
          ctx.moveTo(this.wx[i] + r, this.wy[i]); ctx.arc(this.wx[i], this.wy[i], r, 0, 6.283);
        }
        ctx.fillStyle = layer === 0 ? 'rgba(255,255,255,0.55)' : layer === 1 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)';
        ctx.fill();
      }
    } else if (this.weather === 'rain') {
      ctx.beginPath();
      var cx = this.W / 2, len = 14 + speed * 18;
      for (i = 0; i < n; i++) {
        var z = this.wz[i], dx = (this.wx[i] - cx) * 0.02 * speed - 3 * z;
        ctx.moveTo(this.wx[i], this.wy[i]); ctx.lineTo(this.wx[i] + dx, this.wy[i] + len * z);
      }
      ctx.strokeStyle = 'rgba(170,200,255,0.42)'; ctx.lineWidth = 1.3; ctx.stroke();
    } else if (this.weather === 'leaves') {
      for (i = 0; i < n; i++) {
        var im = this.img.leaves[i % 3], s = 6 + this.wz[i] * 10;
        ctx.save(); ctx.translate(this.wx[i], this.wy[i]); ctx.rotate(this.wr[i]); ctx.scale(1, Math.abs(Math.sin(this.wr[i] * 1.3)) * 0.8 + 0.2);
        ctx.drawImage(im, -s / 2, -s / 2, s, s); ctx.restore();
      }
    } else if (this.weather === 'dust') {
      ctx.beginPath();
      for (i = 0; i < n; i++) { var rr = 0.6 + this.wz[i] * 1.1; ctx.moveTo(this.wx[i] + rr, this.wy[i]); ctx.arc(this.wx[i], this.wy[i], rr, 0, 6.283); }
      ctx.fillStyle = 'rgba(255,225,170,0.3)'; ctx.fill();
    }
  };

  /** Speed lines streaking out from the vanishing point (amount 0..1). */
  Fx.prototype.drawSpeedLines = function (ctx, amount, cx, cy) {
    if (amount <= 0.01) return;
    var W = this.W, H = this.H;
    ctx.beginPath();
    for (var i = 0; i < 26; i++) {
      var a = i * 2.39996 + Math.floor(this.t * 20) * 0.7, r0 = Math.max(W, H) * (0.42 + ((i * 37) % 10) * 0.03);
      var r1 = r0 + 60 + amount * 120, c = Math.cos(a), s = Math.sin(a);
      ctx.moveTo(cx + c * r0, cy + s * r0 * 0.7); ctx.lineTo(cx + c * r1, cy + s * r1 * 0.7);
    }
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 * amount).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
  };

  root.RR = root.RR || {};
  root.RR.fx = { create: function () { return new Fx(); }, K: K };
})(window);
