/* Visual effects: confetti (canvas), sparkle bursts at an element, floating "+1" stars. */
(function () {
  'use strict';
  var SQ = window.SQ = window.SQ || {};
  var COLORS = ['#ff4f6d', '#ffd23f', '#2ecc71', '#3d8bff', '#a463ff', '#ff9a2e', '#1fc8c8'];

  var canvas = null, ctx = null, parts = [], raf = 0;
  function ensure() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.className = 'fx-canvas';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    if (!canvas) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.vy += p.g; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 30);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      if (p.kind === 'star') { star(ctx, p.s); ctx.fill(); }
      else if (p.kind === 'dot') { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fill(); }
      else ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2 * (0.6 + Math.abs(Math.sin(p.rot * 2))));
      ctx.restore();
    });
    if (parts.length) raf = requestAnimationFrame(loop); else { raf = 0; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function star(c, s) {
    c.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.4 : s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  SQ.fx = {
    confetti: function (n) {
      if (SQ.FAST) return;
      ensure();
      n = n || 140;
      for (var i = 0; i < n; i++) {
        var left = i % 2 === 0;
        parts.push({ x: left ? -10 : innerWidth + 10, y: innerHeight * (0.45 + Math.random() * 0.3),
          vx: (left ? 1 : -1) * (4 + Math.random() * 7), vy: -(8 + Math.random() * 9), g: 0.28, vr: (Math.random() - 0.5) * 0.4,
          rot: Math.random() * 6, s: 8 + Math.random() * 8, c: COLORS[i % COLORS.length], life: 120 + Math.random() * 80,
          kind: i % 7 === 0 ? 'star' : i % 5 === 0 ? 'dot' : 'rect' });
      }
      kick();
    },
    burst: function (el, n, kind) {
      if (SQ.FAST || !el) return;
      ensure();
      var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      n = n || 18;
      for (var i = 0; i < n; i++) {
        var a = i / n * Math.PI * 2, sp = 3 + Math.random() * 4;
        parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, g: 0.12, vr: 0.2, rot: 0,
          s: kind === 'star' ? 7 + Math.random() * 5 : 5 + Math.random() * 4, c: kind === 'gold' || kind === 'star' ? (i % 2 ? '#ffd23f' : '#fff3a6') : COLORS[i % COLORS.length],
          life: 40 + Math.random() * 20, kind: kind === 'star' || kind === 'gold' ? 'star' : 'dot' });
      }
      kick();
    }
  };
})();
