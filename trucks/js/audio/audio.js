/* WebAudio only: every sound is generated (oscillators + filtered noise), plus a light looping music sequencer.
 * Unlock on the first tap (iOS needs a gesture). No files, no voice. TW.audio. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {};
  var ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  var sound = true, music = true, unlocked = false, musicOn = false, timer = 0, step = 0, nextT = 0, mood = 'home';
  var lastPlay = {};

  function init() {
    if (ctx) return true;
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = 0.16; musBus.connect(master);
      var n = ctx.sampleRate, buf = ctx.createBuffer(1, n, n), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = buf;
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function unlock() {
    if (!init()) return;
    if (ctx.state === 'suspended') ctx.resume();
    unlocked = true;
    if (music && !musicOn) startMusic();
  }
  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (ev) { root.addEventListener(ev, unlock, { passive: true }); });

  function tone(freq, t0, dur, type, vol, o) {
    o = o || {};
    var osc = ctx.createOscillator(), gn = ctx.createGain();
    osc.type = type || 'sine'; osc.frequency.setValueAtTime(freq, t0);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + dur);
    gn.gain.setValueAtTime(0.0001, t0); gn.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + (o.atk || 0.008)); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gn); gn.connect(o.bus || sfxBus); osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, vol, f0, f1, type) {
    var src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gn = ctx.createGain();
    src.buffer = noiseBuf; fl.type = type || 'bandpass'; fl.frequency.setValueAtTime(f0, t0); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    fl.Q.value = 1.2; gn.gain.setValueAtTime(vol, t0); gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(gn); gn.connect(sfxBus); src.start(t0, Math.random() * 0.5); src.stop(t0 + dur + 0.05);
  }
  var SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  function note(n) { return 261.63 * Math.pow(2, n / 12); }

  var SFX = {
    tap: function (t) { tone(660, t, 0.06, 'triangle', 0.12); },
    swap: function (t) { noise(t, 0.12, 0.12, 500, 1800); tone(300, t, 0.1, 'sine', 0.07, { to: 520 }); },
    nope: function (t) { tone(220, t, 0.14, 'square', 0.07, { to: 150 }); },
    match: function (t, n) { var k = Math.min(8, (n || 1) - 1); tone(note(SCALE[k]), t, 0.18, 'triangle', 0.22); tone(note(SCALE[k]) * 2, t, 0.12, 'sine', 0.1); tone(note(SCALE[Math.min(10, k + 2)]), t + 0.07, 0.16, 'triangle', 0.12); },
    land: function (t) { tone(140, t, 0.08, 'sine', 0.12, { to: 80 }); },
    create: function (t, s) { [0, 4, 7, 12].forEach(function (x, i) { tone(note(x + 7), t + i * 0.05, 0.2, 'square', 0.07); }); tone(note(24), t + 0.2, 0.25, 'triangle', 0.1); },
    convert: function (t) { tone(900, t, 0.1, 'sine', 0.1, { to: 1500 }); },
    rocket: function (t) { noise(t, 0.5, 0.3, 400, 3000); tone(200, t, 0.45, 'sawtooth', 0.1, { to: 900 }); },
    boom: function (t) { noise(t, 0.6, 0.55, 900, 80, 'lowpass'); tone(90, t, 0.5, 'sine', 0.4, { to: 35 }); noise(t, 0.1, 0.3, 3000, 1000); },
    gem: function (t) { for (var i = 0; i < 8; i++) tone(note(SCALE[i] + 12), t + i * 0.045, 0.3, 'sine', 0.12); },
    crate: function (t) { noise(t, 0.14, 0.4, 1200, 300); tone(120, t, 0.12, 'square', 0.1, { to: 60 }); },
    stone: function (t) { noise(t, 0.16, 0.4, 700, 200); tone(80, t, 0.14, 'sine', 0.2, { to: 40 }); },
    oil: function (t) { noise(t, 0.2, 0.25, 600, 250); tone(420, t, 0.15, 'sine', 0.1, { to: 180 }); },
    chain: function (t) { tone(1800, t, 0.05, 'square', 0.08); tone(1300, t + 0.06, 0.05, 'square', 0.08); tone(2200, t + 0.11, 0.06, 'square', 0.06); },
    item: function (t) { [0, 4, 7, 12, 16].forEach(function (x, i) { tone(note(x + 12), t + i * 0.06, 0.22, 'triangle', 0.14); }); },
    shuffle: function (t) { noise(t, 0.5, 0.18, 300, 2500); tone(300, t, 0.5, 'sine', 0.08, { to: 600 }); },
    bonus: function (t) { [0, 4, 7, 12, 7, 12, 16].forEach(function (x, i) { tone(note(x + 12), t + i * 0.07, 0.18, 'square', 0.08); }); },
    win: function (t) { [0, 4, 7, 12, 7, 12, 16, 19, 24].forEach(function (x, i) { tone(note(x + 7), t + i * 0.11, 0.3, 'triangle', 0.18); tone(note(x), t + i * 0.11, 0.3, 'sine', 0.1); }); },
    star: function (t, n) { tone(note(SCALE[2 + (n || 0) * 2] + 12), t, 0.4, 'triangle', 0.22); tone(note(SCALE[2 + (n || 0) * 2] + 24), t, 0.3, 'sine', 0.1); },
    fail: function (t) { [7, 5, 2, 0].forEach(function (x, i) { tone(note(x), t + i * 0.2, 0.35, 'sine', 0.16); }); },
    coin: function (t) { tone(1320, t, 0.07, 'square', 0.07); tone(1760, t + 0.06, 0.12, 'square', 0.07); },
    pop: function (t) { tone(500, t, 0.1, 'sine', 0.18, { to: 900 }); },
    ratchet: function (t) { for (var i = 0; i < 6; i++) { tone(1100, t + i * 0.055, 0.03, 'square', 0.07); noise(t + i * 0.055, 0.03, 0.1, 3000, 2000); } },
    fix: function (t) { [0, 4, 7, 12].forEach(function (x, i) { tone(note(x + 12), t + i * 0.07, 0.25, 'triangle', 0.16); }); tone(note(24), t + 0.3, 0.4, 'sine', 0.12); },
    horn: function (t) { tone(311, t, 0.4, 'sawtooth', 0.1); tone(392, t, 0.4, 'sawtooth', 0.1); },
    open: function (t) { tone(300, t, 0.2, 'sine', 0.12, { to: 700 }); },
    whoosh: function (t) { noise(t, 0.25, 0.14, 300, 1600); },
    drive: function (t) { for (var i = 0; i < 14; i++) tone(70 + i * 6, t + i * 0.07, 0.08, 'sawtooth', 0.05); noise(t, 1, 0.1, 200, 600); }
  };

  function play(name, arg) {
    if (!sound || !unlocked || !ctx || ctx.state !== 'running') return;
    var f = SFX[name]; if (!f) return;
    var now = ctx.currentTime;
    if (lastPlay[name] && now - lastPlay[name] < 0.035 && name !== 'match') return;
    lastPlay[name] = now;
    try { f(now + 0.005, arg); } catch (e) { /* never break the game for a sound */ }
  }

  /* ---- music: a bouncy 16-step loop, 2 moods ---- */
  var CHORDS = [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], MELODY = [
    [12, -1, 16, -1, 19, -1, 16, 12, 14, -1, 17, -1, 21, -1, 17, 14],
    [16, -1, 19, 16, 12, -1, 9, -1, 11, 14, 17, -1, 14, -1, 11, -1],
    [19, -1, 23, -1, 19, 16, 14, -1, 12, -1, 14, 16, 19, -1, -1, -1],
    [12, 16, 19, -1, 16, 12, 7, -1, 12, -1, 16, -1, 19, 24, -1, -1]];
  function schedule() {
    if (!musicOn || !ctx) return;
    var spb = mood === 'game' ? 0.17 : 0.21;
    while (nextT < ctx.currentTime + 0.4) {
      var bar = ((step / 16) | 0) % 4, s = step % 16, ch = CHORDS[bar];
      if (s % 4 === 0) tone(note(ch[0] - 24), nextT, spb * 3.6, 'triangle', 0.5, { bus: musBus });
      if (s % 2 === 1 && mood === 'game') tone(note(ch[(s >> 1) % 3]), nextT, spb * 0.8, 'sine', 0.22, { bus: musBus });
      if (s === 4 || s === 12) tone(note(ch[1]), nextT, spb * 1.5, 'sine', 0.22, { bus: musBus });
      var m = MELODY[bar][s]; if (m >= 0 && (mood === 'game' || s % 2 === 0)) tone(note(m), nextT, spb * 1.6, 'square', 0.13, { bus: musBus, atk: 0.01 });
      if (mood === 'game' && s % 4 === 2) noise2(nextT, 0.04, 0.5);
      nextT += spb; step++;
    }
  }
  function noise2(t, dur, vol) {
    var src = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), gn = ctx.createGain();
    src.buffer = noiseBuf; fl.type = 'highpass'; fl.frequency.value = 6000; gn.gain.setValueAtTime(vol * 0.3, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(gn); gn.connect(musBus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }
  function startMusic() { if (!ctx || musicOn || !music) return; musicOn = true; nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 120); }
  function stopMusic() { musicOn = false; clearInterval(timer); }

  TW.audio = {
    play: play, unlock: unlock,
    setSound: function (v) { sound = !!v; },
    setMusic: function (v) { music = !!v; if (!music) stopMusic(); else if (unlocked) startMusic(); },
    setMood: function (m) { mood = m; },
    pause: function () { if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { if (ctx && unlocked && ctx.state === 'suspended') ctx.resume(); },
    isUnlocked: function () { return unlocked; }
  };
})(typeof self !== 'undefined' ? self : this);
