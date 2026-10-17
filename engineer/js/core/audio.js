/* WebAudio synthesized sound effects, with iOS first-tap unlock. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, noiseBuf = null;
  var muted = false;

  function ensureCtx() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55;
        master.connect(ctx.destination);
      } catch (e) { ctx = null; }
    }
    return ctx;
  }

  function resume() {
    if (!ctx) return;
    // iOS can report 'interrupted' (phone call, Siri, lock screen) — treat it like 'suspended'.
    if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
      try { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
    }
  }

  /** Must run synchronously inside a user gesture handler. */
  function unlock() {
    var c = ensureCtx();
    if (!c) return;
    resume();
    if (unlock.done && c.state === 'running') return;
    try {
      var b = c.createBuffer(1, 1, 22050);
      var s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      if (s.start) s.start(0); else s.noteOn(0);
      unlock.done = true;
    } catch (e) {}
  }

  ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, unlock, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') resume();
  });
  window.addEventListener('pageshow', resume);
  window.addEventListener('focus', resume);

  function getNoise() {
    if (noiseBuf) return noiseBuf;
    var len = ctx.sampleRate * 1;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    var seed = 12345;
    for (var i = 0; i < len; i++) { seed = (seed * 16807) % 2147483647; d[i] = (seed / 2147483647) * 2 - 1; }
    return noiseBuf;
  }

  function tone(o) {
    // o: { type, f, f2, t (start offset), d (duration), v (volume), a (attack) }
    var t0 = ctx.currentTime + (o.t || 0);
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.d);
    var v = o.v === undefined ? 0.3 : o.v;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + o.d + 0.05);
  }

  function noise(o) {
    // o: { t, d, v, filter: 'lowpass'|'highpass'|'bandpass', f, f2, q }
    var t0 = ctx.currentTime + (o.t || 0);
    var src = ctx.createBufferSource();
    src.buffer = getNoise();
    var flt = ctx.createBiquadFilter();
    flt.type = o.filter || 'lowpass';
    flt.frequency.setValueAtTime(o.f || 1000, t0);
    if (o.f2) flt.frequency.exponentialRampToValueAtTime(o.f2, t0 + o.d);
    flt.Q.value = o.q || 1;
    var g = ctx.createGain();
    var v = o.v === undefined ? 0.3 : o.v;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.a || 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.d);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + o.d + 0.05);
  }

  var notes = { C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5, G6: 1568 };

  var SFX = {
    tap: function () { tone({ type: 'sine', f: 660, f2: 880, d: 0.08, v: 0.18 }); },
    click: function () { tone({ type: 'square', f: 1200, d: 0.03, v: 0.06 }); },
    place: function () { tone({ type: 'triangle', f: 420, f2: 200, d: 0.12, v: 0.35 }); noise({ d: 0.05, v: 0.08, f: 2500 }); },
    pop: function () { tone({ type: 'sine', f: 300, f2: 900, d: 0.09, v: 0.3 }); },
    remove: function () { tone({ type: 'sine', f: 700, f2: 250, d: 0.12, v: 0.25 }); },
    whoosh: function () { noise({ d: 0.35, v: 0.25, filter: 'bandpass', f: 400, f2: 3000, q: 2 }); },
    step: function () { tone({ type: 'square', f: 380, f2: 460, d: 0.07, v: 0.07 }); tone({ type: 'sine', f: 190, d: 0.09, v: 0.15 }); },
    turn: function () { tone({ type: 'triangle', f: 500, f2: 800, d: 0.12, v: 0.15 }); },
    bump: function () { tone({ type: 'sine', f: 160, f2: 70, d: 0.2, v: 0.4 }); noise({ d: 0.08, v: 0.15, f: 600 }); },
    gear: function () { tone({ type: 'sine', f: notes.E6, d: 0.12, v: 0.15 }); tone({ type: 'sine', f: notes.G6, t: 0.07, d: 0.2, v: 0.15 }); },
    buzz: function () { tone({ type: 'sawtooth', f: 110, d: 0.25, v: 0.12 }); tone({ type: 'sawtooth', f: 116, d: 0.25, v: 0.1 }); },
    oops: function () { tone({ type: 'triangle', f: 440, f2: 330, d: 0.22, v: 0.2 }); tone({ type: 'triangle', f: 330, f2: 247, t: 0.22, d: 0.3, v: 0.2 }); },
    success: function () {
      ['C5', 'E5', 'G5', 'C6'].forEach(function (n, i) { tone({ type: 'triangle', f: notes[n], t: i * 0.1, d: 0.25, v: 0.25 }); });
      tone({ type: 'sine', f: notes.E6, t: 0.4, d: 0.5, v: 0.12 });
    },
    star: function () { tone({ type: 'sine', f: notes.C6, d: 0.15, v: 0.2 }); tone({ type: 'sine', f: notes.G6, t: 0.06, d: 0.35, v: 0.15 }); noise({ d: 0.2, v: 0.04, filter: 'highpass', f: 6000 }); },
    cheer: function () {
      ['G5', 'C6', 'E6', 'G6'].forEach(function (n, i) { tone({ type: 'square', f: notes[n], t: i * 0.08, d: 0.18, v: 0.06 }); });
      noise({ t: 0.1, d: 0.6, v: 0.08, filter: 'bandpass', f: 2000, q: 0.7 });
    },
    car: function () {
      var t0 = ctx.currentTime, d = 1.6;
      var osc = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(70, t0); osc.frequency.linearRampToValueAtTime(110, t0 + d);
      lfo.frequency.value = 18; lg.gain.value = 12; lfo.connect(lg); lg.connect(osc.frequency);
      var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.12, t0 + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
      osc.connect(f); f.connect(g); g.connect(master);
      osc.start(t0); lfo.start(t0); osc.stop(t0 + d + 0.05); lfo.stop(t0 + d + 0.05);
    },
    honk: function () { tone({ type: 'square', f: 392, d: 0.15, v: 0.1 }); tone({ type: 'square', f: 494, d: 0.15, v: 0.08 }); tone({ type: 'square', f: 392, t: 0.2, d: 0.2, v: 0.1 }); tone({ type: 'square', f: 494, t: 0.2, d: 0.2, v: 0.08 }); },
    creak: function () { tone({ type: 'sawtooth', f: 90, f2: 140, d: 0.3, v: 0.06 }); },
    snap: function () { noise({ d: 0.12, v: 0.4, filter: 'highpass', f: 1500 }); tone({ type: 'square', f: 200, f2: 60, d: 0.15, v: 0.15 }); },
    break: function () { noise({ d: 0.5, v: 0.45, filter: 'lowpass', f: 3000, f2: 200 }); tone({ type: 'sawtooth', f: 120, f2: 40, d: 0.4, v: 0.15 }); },
    splash: function () { noise({ d: 0.7, v: 0.3, filter: 'bandpass', f: 1200, f2: 300, q: 0.8 }); },
    spark: function () { for (var i = 0; i < 5; i++) noise({ t: i * 0.04, d: 0.04, v: 0.25, filter: 'highpass', f: 4000 }); },
    zap: function () { tone({ type: 'sawtooth', f: 900, f2: 1600, d: 0.12, v: 0.08 }); tone({ type: 'sine', f: 1800, t: 0.05, d: 0.2, v: 0.1 }); },
    motor: function () { tone({ type: 'sawtooth', f: 60, f2: 160, d: 0.6, v: 0.06 }); tone({ type: 'square', f: 120, f2: 320, d: 0.6, v: 0.03 }); },
    roll: function () { noise({ d: 0.4, v: 0.08, filter: 'lowpass', f: 300 }); },
    bounce: function () { tone({ type: 'sine', f: 220, f2: 520, d: 0.15, v: 0.3 }); },
    clank: function () { tone({ type: 'square', f: 600, f2: 300, d: 0.08, v: 0.1 }); tone({ type: 'triangle', f: 1300, d: 0.15, v: 0.08 }); },
    ding: function () { tone({ type: 'sine', f: notes.A5, d: 0.6, v: 0.25 }); tone({ type: 'sine', f: notes.A5 * 2, d: 0.4, v: 0.08 }); },
    rotate: function () { tone({ type: 'triangle', f: 520, f2: 700, d: 0.07, v: 0.15 }); },
    open: function () { tone({ type: 'sine', f: 400, f2: 800, d: 0.15, v: 0.2 }); },
    close: function () { tone({ type: 'sine', f: 700, f2: 350, d: 0.15, v: 0.2 }); }
  };

  LE.sound = {
    play: function (name) {
      if (muted) return;
      var c = ensureCtx();
      if (!c) return;
      resume();
      var fn = SFX[name] || SFX.tap;
      try { fn(); } catch (e) { /* never let audio break the game */ }
    },
    setMuted: function (m) { muted = !!m; },
    isMuted: function () { return muted; },
    unlock: unlock,
    names: Object.keys(SFX),
    get state() { return ctx ? ctx.state : 'none'; }
  };
})();
