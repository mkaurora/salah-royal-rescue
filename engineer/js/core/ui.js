/* DOM helpers, tweening, confetti & particles. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};

  LE.FAST = /[?&]fast=1/.test(location.search);
  LE.speed = LE.FAST ? 6 : 1;
  /** Read-then-Go gate after the intro / Show me (skipped in fast tests unless ?readgo=1). */
  LE.READ_GO = !LE.FAST || /[?&]readgo=1/.test(location.search);
  /** Show me waits for 2 tries / ~2 minutes (open at once in fast tests unless ?showmegate=1). */
  LE.SHOWME_GATE = !LE.FAST || /[?&]showmegate=1/.test(location.search);               // animation speed multiplier (tests run faster)
  LE.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms / LE.speed); }); };

  /** h('div.cls#id', {attrs}, children...) */
  LE.h = function (sel, attrs) {
    var parts = sel.split(/(?=[.#])/);
    var el = document.createElement(parts[0] || 'div');
    for (var i = 1; i < parts.length; i++) {
      var p = parts[i];
      if (p[0] === '.') el.classList.add(p.slice(1)); else if (p[0] === '#') el.id = p.slice(1);
    }
    var kids = Array.prototype.slice.call(arguments, 2);
    if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) { kids.unshift(attrs); attrs = null; }
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === undefined || v === null || v === false) return;
        if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    (function add(list) {
      list.forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        if (Array.isArray(c)) add(c);
        else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
      });
    })(kids);
    return el;
  };

  /** Big friendly button. onTap fires on click; press animation on pointerdown. */
  LE.button = function (cls, content, onTap, opts) {
    opts = opts || {};
    var b = LE.h('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), { type: 'button', 'aria-label': opts.label || null });
    if (typeof content === 'string') b.innerHTML = content; else if (content) b.appendChild(content);
    b.addEventListener('click', function (e) {
      if (b.disabled) return;
      if (opts.sound !== false) LE.sound.play(opts.sound || 'tap');
      onTap && onTap(e);
    });
    return b;
  };

  // Press feedback for anything with .btn or .pressable
  document.addEventListener('pointerdown', function (e) {
    var t = e.target.closest && e.target.closest('.btn, .pressable');
    if (!t) return;
    t.classList.add('pressed');
    var up = function () { t.classList.remove('pressed'); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  }, true);

  /** Pop-in animation helper (WAAPI). */
  LE.bounce = function (el, scale) {
    if (!el || !el.animate) return;
    scale = scale || 1.15;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(' + scale + ')' }, { transform: 'scale(.95)' }, { transform: 'scale(1)' }],
      { duration: 380 / LE.speed, easing: 'ease-out' });
  };
  LE.shake = function (el) {
    if (!el || !el.animate) return;
    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(0)' }],
      { duration: 360 / LE.speed });
  };

  /** Simple tween: calls fn(t) with eased t in [0,1]; resolves when done. */
  LE.tween = function (ms, fn, ease) {
    ms = ms / LE.speed;
    ease = ease || LE.ease.inOut;
    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function frame(now) {
        var t = Math.min(1, (now - t0) / ms);
        fn(ease(t));
        if (t < 1) requestAnimationFrame(frame); else resolve();
      })(t0);
    });
  };
  LE.ease = {
    linear: function (t) { return t; },
    inOut: function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    out: function (t) { return 1 - Math.pow(1 - t, 3); },
    in: function (t) { return t * t * t; },
    back: function (t) { var c = 1.70158, c3 = c + 1; return 1 + c3 * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  };

  /** Hi-DPI canvas helper: sizes the canvas to its CSS box. Returns {ctx, w, h, dpr}. */
  LE.fitCanvas = function (canvas, w, h) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx: ctx, w: w, h: h, dpr: dpr };
  };

  /** Rounded rect path helper. */
  LE.rr = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  /* ---------- Confetti & particle overlay ---------- */
  var fxCanvas, fxCtx, parts = [], running = false;
  function fxInit() {
    if (fxCanvas) return;
    fxCanvas = document.getElementById('fx');
    if (!fxCanvas) { fxCanvas = LE.h('canvas#fx'); document.body.appendChild(fxCanvas); }
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    var r = LE.fitCanvas(fxCanvas, window.innerWidth, window.innerHeight);
    fxCtx = r.ctx;
  }
  var COLORS = ['#ff4f6d', '#ffc83d', '#33d17a', '#3d8bff', '#b36bff', '#ff8a3d', '#2fe0d0'];
  function loop() {
    if (!parts.length) { running = false; fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height); return; }
    running = true;
    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var dt = LE.speed;
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.life -= dt;
      if (p.life <= 0 || p.y > window.innerHeight + 40) { parts.splice(i, 1); continue; }
      var a = Math.min(1, p.life / 30);
      fxCtx.save();
      fxCtx.globalAlpha = a;
      fxCtx.translate(p.x, p.y);
      fxCtx.rotate(p.rot);
      fxCtx.fillStyle = p.color;
      if (p.shape === 'rect') { fxCtx.scale(1, Math.cos(p.rot * 3)); fxCtx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      else if (p.shape === 'star') { drawStar(fxCtx, p.s); }
      else { fxCtx.beginPath(); fxCtx.arc(0, 0, p.s / 2, 0, Math.PI * 2); fxCtx.fill(); }
      fxCtx.restore();
    }
    requestAnimationFrame(loop);
  }
  function drawStar(c, s) {
    c.beginPath();
    for (var i = 0; i < 10; i++) {
      var r = i % 2 ? s * 0.22 : s * 0.5, a = -Math.PI / 2 + i * Math.PI / 5;
      c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.closePath(); c.fill();
  }
  function add(p) { parts.push(p); if (!running) requestAnimationFrame(loop); }

  LE.fx = {
    confetti: function (n) {
      fxInit();
      n = n || 140;
      var W = window.innerWidth;
      for (var i = 0; i < n; i++) {
        add({
          x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: window.innerHeight * 0.35,
          vx: (Math.random() - 0.5) * 18, vy: -8 - Math.random() * 14,
          g: 0.38, drag: 0.985, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          s: 8 + Math.random() * 9, color: COLORS[i % COLORS.length], shape: Math.random() < 0.7 ? 'rect' : (Math.random() < 0.5 ? 'star' : 'circle'),
          life: 160 + Math.random() * 60
        });
      }
    },
    /** Burst of particles at client coords. */
    burst: function (x, y, opts) {
      fxInit();
      opts = opts || {};
      var n = opts.n || 14;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = (opts.speed || 5) * (0.5 + Math.random());
        add({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (opts.up || 1),
          g: opts.g === undefined ? 0.2 : opts.g, drag: 0.94, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
          s: opts.size || (5 + Math.random() * 6), color: opts.color || COLORS[i % COLORS.length],
          shape: opts.shape || 'circle', life: opts.life || 40 + Math.random() * 20
        });
      }
    },
    sparkle: function (x, y, color) { LE.fx.burst(x, y, { n: 10, color: color || '#ffe14d', shape: 'star', size: 10, speed: 4, g: 0.05 }); },
    /** Burst centred on an element. */
    burstAt: function (el, opts) {
      if (!el) return;
      var r = el.getBoundingClientRect();
      LE.fx.burst(r.left + r.width / 2, r.top + r.height / 2, opts);
    }
  };

  /** Shared star SVG used by menus, maps and overlays. */
  LE.starSVG = function (filled) {
    return '<svg class="star-svg' + (filled ? ' on' : '') + '" viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.4 7 .9-5.1 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7L1.9 9.1l7-.9z"/></svg>';
  };
  LE.starsRow = function (n, max, cls) {
    max = max || 3;
    var s = '';
    for (var i = 0; i < max; i++) s += LE.starSVG(i < n);
    return LE.h('div.stars-row' + (cls ? '.' + cls : ''), { html: s });
  };

  /** Center of a DOMRect-like. */
  LE.center = function (r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
})();
