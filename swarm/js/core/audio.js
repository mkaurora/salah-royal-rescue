/* WebAudio synth blips. No audio files. Everything throttled so a 500-unit melee does not clip. */
(function () {
  'use strict';
  var SG = window.SG = window.SG || {};
  var ctx = null, master = null, noiseBuf = null, enabled = true, last = {};

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ctx = null; }
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(f0, f1, dur, type, vol, delay) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, delay) {
    if (!ctx) return;
    var t = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
  }

  var SOUNDS = {
    shoot: [0.07, function () { tone(520, 300, 0.06, 'square', 0.04); }],
    pop: [0.045, function () { tone(240 + Math.random() * 160, 90, 0.05, 'triangle', 0.07); }],
    gate: [0.08, function () { tone(520, 1040, 0.12, 'sine', 0.12); tone(780, 1560, 0.12, 'sine', 0.07, 0.04); }],
    gatebad: [0.1, function () { tone(300, 120, 0.18, 'sawtooth', 0.08); }],
    breach: [0.2, function () { noise(0.3, 0.3, 700); tone(160, 50, 0.3, 'sawtooth', 0.14); }],
    champion: [0.2, function () { tone(180, 720, 0.35, 'sawtooth', 0.12); tone(360, 1200, 0.35, 'square', 0.06, 0.05); }],
    giant: [0.2, function () { noise(0.5, 0.35, 900); tone(120, 40, 0.5, 'sawtooth', 0.15); }],
    giantspawn: [0.5, function () { tone(90, 70, 0.5, 'sawtooth', 0.12); tone(95, 75, 0.5, 'square', 0.06); }],
    basehit: [0.1, function () { tone(180, 120, 0.06, 'square', 0.05); }],
    basedown: [0.3, function () { noise(0.7, 0.4, 1200); tone(200, 40, 0.6, 'sawtooth', 0.16); }],
    wave: [0.5, function () { tone(220, 220, 0.12, 'square', 0.07); tone(165, 165, 0.2, 'square', 0.07, 0.13); }],
    win: [0.5, function () { [523, 659, 784, 1047].forEach(function (f, i) { tone(f, f, 0.22, 'square', 0.09, i * 0.11); }); tone(1047, 1047, 0.5, 'triangle', 0.1, 0.46); }],
    lose: [0.5, function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, f * 0.97, 0.26, 'sawtooth', 0.09, i * 0.17); }); }],
    click: [0.03, function () { tone(660, 880, 0.06, 'square', 0.06); }],
    buy: [0.1, function () { tone(660, 660, 0.08, 'square', 0.07); tone(990, 990, 0.14, 'square', 0.07, 0.07); }],
    star: [0.1, function () { tone(880, 1320, 0.18, 'sine', 0.12); }]
  };

  SG.Audio = {
    init: init, resume: resume,
    set: function (on) { enabled = !!on; },
    play: function (name) {
      if (!enabled || !ctx) return;
      var s = SOUNDS[name]; if (!s) return;
      var now = ctx.currentTime;
      if (last[name] && now - last[name] < s[0]) return;
      last[name] = now; s[1]();
    }
  };
})();
