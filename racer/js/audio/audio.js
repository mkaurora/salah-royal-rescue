/* Road Racer audio: everything is synthesized with WebAudio (no files, no voice). One AudioContext, created on the
 * first tap (unlock). Graph: [sfx voices + engine] -> sfxBus \
 *                            [music players]       -> musicBus -> master -> gentle compressor -> destination.
 * - sfx(name, opts): short kid-friendly one-shots; max 12 voices (oldest dropped), noise buffer made once.
 * - engine(state): persistent nodes (2 detuned oscillators + sub through a lowpass, rumble + squeal noise layers),
 *   driven every frame with setTargetAtTime only (values cached, nothing allocated per frame).
 * - music(key): tiny step sequencer (16ths, lookahead 0.12 s on a 25 ms timer), crossfades between worlds,
 *   never builds a backlog after suspend/resume (next-note time snaps to now).
 * Missing WebAudio -> every method is a silent no-op. Browser only: window.RR.audio. */
(function (root) {
  'use strict';

  var AC = root.AudioContext || root.webkitAudioContext;
  var ctx = null, master = null, comp = null, sfxBus = null, musicBus = null, noiseBuf = null;
  var soundOn = true, musicOn = true, unlocked = false, silentPlayed = false;
  var MUSIC_VOL = 0.35, MAX_VOICES = 12;

  function now() { return ctx ? ctx.currentTime : 0; }
  function mf(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function safe(fn) { return function () { try { return fn.apply(null, arguments); } catch (e) { /* never throw */ } }; }

  /* ---------- context + graph ---------- */
  function build() {
    if (ctx || !AC) return !!ctx;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.8;
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 3;
    comp.attack.value = 0.005; comp.release.value = 0.25;
    master.connect(comp); comp.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = soundOn ? 1 : 0; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicOn ? MUSIC_VOL : 0; musicBus.connect(master);
    var len = Math.floor(ctx.sampleRate * 2), d;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); d = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    buildEngine();
    return true;
  }

  function unlock() {
    if (!AC) return;
    if (!ctx) { build(); if (curKey) switchTo(curKey); }
    if (!ctx) return;
    if (!silentPlayed) {
      silentPlayed = true;
      var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
    if (ctx.state !== 'running' && !hidden) { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
    unlocked = true;
    resetPlayers();
  }

  var hidden = false;
  function suspend() {
    hidden = true;
    if (ctx && ctx.state === 'running') { var p = ctx.suspend(); if (p && p.catch) p.catch(function () {}); }
  }
  function resume() {
    hidden = false;
    if (!ctx || !unlocked) return;
    var p = ctx.resume();
    if (p && p.then) p.then(resetPlayers, function () {});
    resetPlayers();
  }

  function setSound(on) {
    soundOn = !!on;
    if (ctx) sfxBus.gain.setTargetAtTime(soundOn ? 1 : 0, now(), 0.03);
  }
  function setMusic(on) {
    musicOn = !!on;
    if (!ctx) return;
    musicBus.gain.setTargetAtTime(musicOn ? MUSIC_VOL : 0, now(), 0.1);  /* ~0.3 s fade */
    if (musicOn) resetPlayers();
  }

  /* ---------- one-shot helpers ---------- */
  var voices = [];
  function env(p, t, a, dur, vol) {
    p.setValueAtTime(0.0001, t);
    p.linearRampToValueAtTime(vol, t + a);
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + 0.01));
  }
  function sweep(param, t, f0, f1, dur) {
    param.setValueAtTime(f0, t);
    if (!f1) return;
    if (typeof f1 === 'number') { param.exponentialRampToValueAtTime(f1, t + dur); return; }
    for (var i = 0; i < f1.length; i++) param.exponentialRampToValueAtTime(f1[i][0], t + f1[i][1]);
  }
  /* oscillator note: type, f0 -> f1 (number or [[f, dt]...]) */
  function tone(v, type, f0, t, dur, vol, f1, att) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; sweep(o.frequency, t, f0, f1, dur);
    env(g.gain, t, att || 0.005, dur, vol);
    o.connect(g); g.connect(v.out); o.start(t); o.stop(t + dur + 0.03); v.srcs.push(o);
  }
  /* filtered noise burst */
  function noise(v, t, dur, vol, ftype, f0, f1, q, att) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = ftype; f.Q.value = q || 1; sweep(f.frequency, t, f0, f1, dur);
    env(g.gain, t, att || 0.005, dur, vol);
    s.connect(f); f.connect(g); g.connect(v.out);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.03); v.srcs.push(s);
  }
  function chime(v, m, t, dur, vol) {
    tone(v, 'sine', mf(m), t, dur, vol);
    tone(v, 'triangle', mf(m) * 2, t, dur * 0.5, vol * 0.18);
  }
  function blip(v, m, t, dur, vol) { tone(v, 'triangle', mf(m), t, dur, vol, 0, 0.008); }
  function seq(v, notes, t, fn, vol) {   /* notes: [[midi, dt, dur], ...] */
    var end = 0;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i]; fn(v, n[0], t + n[1], n[2], vol * (n[3] || 1)); end = Math.max(end, n[1] + n[2]);
    }
    return end;
  }

  function kill(v, t) {
    try {
      v.out.gain.cancelScheduledValues(t); v.out.gain.setTargetAtTime(0, t, 0.012);
      for (var i = 0; i < v.srcs.length; i++) { try { v.srcs[i].stop(t + 0.06); } catch (e) {} }
    } catch (e) {}
    setTimeout(function () { try { v.out.disconnect(); } catch (e) {} }, 150);
  }
  function prune(t) {
    for (var i = voices.length - 1; i >= 0; i--) {
      if (voices[i].end < t) { try { voices[i].out.disconnect(); } catch (e) {} voices.splice(i, 1); }
    }
  }

  /* ---------- the sounds (each returns its length in seconds) ---------- */
  var S = {
    tap: function (v, t) { tone(v, 'sine', 880, t, 0.07, 0.22, 1250); tone(v, 'triangle', 1760, t, 0.03, 0.05); return 0.08; },
    back: function (v, t) { tone(v, 'sine', 760, t, 0.1, 0.22, 440); return 0.1; },
    whoosh: function (v, t) { noise(v, t, 0.35, 0.22, 'bandpass', 350, [[2400, 0.18], [700, 0.35]], 1.2, 0.12); return 0.35; },
    coin: function (v, t, o) {
      var k = [0, 2, 4, 5, 7, 9][((o.n | 0) % 6 + 6) % 6], r = Math.pow(2, k / 12);
      tone(v, 'square', 988 * r, t, 0.07, 0.07); tone(v, 'sine', 988 * r, t, 0.07, 0.16);
      tone(v, 'square', 1319 * r, t + 0.07, 0.26, 0.06); tone(v, 'sine', 1319 * r, t + 0.07, 0.3, 0.16);
      return 0.38;
    },
    fuel: function (v, t) {
      for (var i = 0; i < 3; i++) tone(v, 'sine', 340 - i * 30, t + i * 0.08, 0.07, 0.3, 160 - i * 15);
      return 0.24 + seq(v, [[72, 0, 0.12], [76, 0.07, 0.12], [79, 0.14, 0.12], [84, 0.21, 0.3]], t + 0.24, chime, 0.18);
    },
    wrench: function (v, t) {
      for (var i = 0; i < 5; i++) noise(v, t + i * 0.045, 0.018, 0.3, 'highpass', 3000, 0, 2);
      return 0.23 + seq(v, [[79, 0, 0.14], [84, 0.08, 0.35]], t + 0.23, chime, 0.2);
    },
    bump: function (v, t) { tone(v, 'sine', 130, t, 0.16, 0.5, 50); noise(v, t, 0.08, 0.15, 'lowpass', 500, 0, 0.7); return 0.17; },
    cone: function (v, t) {
      tone(v, 'triangle', 420, t, 0.09, 0.3, 210); noise(v, t, 0.05, 0.18, 'bandpass', 1300, 0, 2.5); return 0.1;
    },
    crash: function (v, t) {
      noise(v, t, 0.45, 0.32, 'lowpass', 1800, 250, 0.8);
      tone(v, 'sine', 100, t, 0.32, 0.6, 38); tone(v, 'triangle', 320, t, 0.14, 0.18, 150);
      return 0.46;
    },
    scrape: function (v, t) {
      noise(v, t, 0.35, 0.16, 'bandpass', 2800, [[3400, 0.12], [1900, 0.35]], 5, 0.03);
      noise(v, t, 0.3, 0.06, 'highpass', 5000, 0, 1, 0.02); return 0.36;
    },
    splash: function (v, t) {
      noise(v, t, 0.5, 0.3, 'bandpass', 700, [[3000, 0.12], [600, 0.5]], 1, 0.02);
      noise(v, t + 0.05, 0.4, 0.12, 'highpass', 4000, 0, 0.7, 0.05); return 0.5;
    },
    skid: function (v, t) {
      noise(v, t, 0.6, 0.12, 'bandpass', 2300, 1700, 10, 0.04);
      tone(v, 'triangle', 1180, t, 0.55, 0.035, 1020, 0.05); return 0.6;
    },
    jump: function (v, t) { tone(v, 'sine', 300, t, 0.28, 0.28, 900, 0.02); tone(v, 'triangle', 600, t, 0.2, 0.06, 1800); return 0.28; },
    land: function (v, t) { tone(v, 'sine', 150, t, 0.13, 0.4, 60); noise(v, t, 0.08, 0.12, 'lowpass', 600, 0, 0.7); return 0.14; },
    rockWarn: function (v, t) {
      return seq(v, [[81, 0, 0.11], [76, 0.13, 0.11], [81, 0.26, 0.11], [76, 0.39, 0.13]], t, blip, 0.22);
    },
    rockLand: function (v, t) {
      tone(v, 'sine', 75, t, 0.5, 0.6, 32); noise(v, t, 0.5, 0.3, 'lowpass', 450, 120, 0.8); return 0.5;
    },
    checkpoint: function (v, t) { return seq(v, [[72, 0, 0.12], [76, 0.09, 0.12], [79, 0.18, 0.12], [84, 0.27, 0.4]], t, chime, 0.22); },
    boost: function (v, t) {
      noise(v, t, 0.55, 0.22, 'bandpass', 300, 3200, 1.5, 0.08);
      tone(v, 'triangle', 220, t, 0.45, 0.1, 880, 0.05); return 0.55;
    },
    bossWarn: function (v, t) {
      for (var i = 0; i < 2; i++) {
        var tt = t + i * 0.2;
        noise(v, tt, 0.001, 0, 'lowpass', 100); /* keeps envelope timing uniform (cheap) */
        tone(v, 'sawtooth', 349, tt, 0.15, 0.09, 0, 0.01); tone(v, 'sawtooth', 440, tt, 0.15, 0.08, 0, 0.01);
        tone(v, 'sine', 349, tt, 0.15, 0.15, 0, 0.01);
      }
      return 0.36;
    },
    bossHit: function (v, t) {
      tone(v, 'sine', 160, t, 0.18, 0.6, 50); noise(v, t, 0.07, 0.3, 'lowpass', 2500, 0, 0.7);
      return 0.12 + seq(v, [[79, 0, 0.1], [84, 0.08, 0.1], [88, 0.16, 0.35]], t + 0.12, chime, 0.2);
    },
    lifeLost: function (v, t) {
      tone(v, 'triangle', mf(67), t, 0.18, 0.22); tone(v, 'triangle', mf(64), t + 0.18, 0.18, 0.22);
      tone(v, 'triangle', mf(60), t + 0.36, 0.5, 0.22, [[mf(59), 0.25], [mf(58), 0.5]]);
      tone(v, 'sine', mf(48), t + 0.36, 0.5, 0.12); return 0.86;
    },
    respawn: function (v, t) { return seq(v, [[84, 0, 0.1], [88, 0.05, 0.1], [91, 0.1, 0.1], [96, 0.15, 0.3]], t, chime, 0.15); },
    count: function (v, t) { tone(v, 'sine', 880, t, 0.16, 0.26, 0, 0.005); tone(v, 'triangle', 880, t, 0.1, 0.06); return 0.16; },
    go: function (v, t) { tone(v, 'sine', 1760, t, 0.5, 0.24, 0, 0.005); tone(v, 'triangle', 1760, t, 0.35, 0.07); return 0.5; },
    finish: function (v, t) {
      var lead = [[67, 0, 0.13], [72, 0.13, 0.13], [76, 0.26, 0.13], [79, 0.39, 0.26], [76, 0.65, 0.13], [79, 0.78, 0.7]];
      seq(v, lead, t, function (vv, m, tt, d, vol) { tone(vv, 'square', mf(m), tt, d, vol * 0.35, 0, 0.01); chime(vv, m, tt, d, vol); }, 0.17);
      var ch = [60, 64, 67];
      for (var i = 0; i < 3; i++) tone(v, 'triangle', mf(ch[i]), t + 0.78, 0.75, 0.09, 0, 0.02);
      tone(v, 'sine', mf(48), t + 0.78, 0.75, 0.2, 0, 0.02);
      seq(v, [[91, 1.0, 0.15], [96, 1.1, 0.35]], t, chime, 0.08);
      return 1.53;
    },
    fail: function (v, t) {
      return seq(v, [[76, 0, 0.15], [74, 0.16, 0.15], [72, 0.32, 0.2], [67, 0.56, 0.14], [72, 0.72, 0.4]], t, blip, 0.22);
    },
    star: function (v, t, o) {
      var m = [84, 88, 91][clamp(o.i | 0, 0, 2)];
      chime(v, m, t, 0.45, 0.24); chime(v, m + 12, t + 0.05, 0.25, 0.07); return 0.45;
    },
    quizRight: function (v, t) {
      chime(v, 72, t, 0.2, 0.15); chime(v, 76, t, 0.2, 0.13);
      chime(v, 79, t + 0.12, 0.45, 0.15); chime(v, 84, t + 0.12, 0.45, 0.13); return 0.57;
    },
    quizWrong: function (v, t) {
      tone(v, 'sine', 330, t, 0.13, 0.3, 300, 0.01); tone(v, 'sine', 262, t + 0.17, 0.22, 0.3, 235, 0.01); return 0.39;
    },
    buy: function (v, t) {
      noise(v, t, 0.04, 0.25, 'bandpass', 4000, 0, 3);
      tone(v, 'sine', 1568, t + 0.04, 0.4, 0.15); tone(v, 'sine', 2093, t + 0.04, 0.4, 0.12);
      return 0.12 + seq(v, [[91, 0, 0.12], [96, 0.06, 0.25]], t + 0.12, chime, 0.08);
    },
    locked: function (v, t) { tone(v, 'triangle', 200, t, 0.05, 0.3, 140); noise(v, t, 0.03, 0.15, 'lowpass', 900, 0, 0.7); return 0.06; },
    pinWrong: function (v, t) { blip(v, 55, t, 0.1, 0.24); blip(v, 55, t + 0.14, 0.14, 0.24); return 0.28; }
  };
  var NAMES = Object.keys(S);
  var lastAt = {};

  function sfx(name, opts) {
    if (!ctx || !soundOn || !S[name] || ctx.state !== 'running') return;
    var t = now() + 0.005;
    if (lastAt[name] && t - lastAt[name] < 0.035) return;   /* same sound twice in one frame: once */
    lastAt[name] = t;
    prune(t);
    opts = opts || {};
    var out = ctx.createGain();
    out.gain.value = opts.vol == null ? 1 : clamp(+opts.vol || 0, 0, 2);
    out.connect(sfxBus);
    var v = { out: out, srcs: [], end: 0 };
    v.end = t + S[name](v, t, opts) + 0.1;
    voices.push(v);
    while (voices.length > MAX_VOICES) kill(voices.shift(), t);
  }

  /* ---------- engine ---------- */
  var E = null, eLast = {};
  function buildEngine() {
    var e = {};
    function osc(type, f) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; return o; }
    function gain(v) { var g = ctx.createGain(); g.gain.value = v; return g; }
    function loopNoise(off) { var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(0, off); return s; }
    e.bus = gain(0); e.bus.connect(sfxBus);
    e.o1 = osc('sawtooth', 55); e.o2 = osc('square', 55.4); e.o3 = osc('sine', 27.5);
    e.m1 = gain(0.5); e.m2 = gain(0.22); e.m3 = gain(0.8);
    e.f = ctx.createBiquadFilter(); e.f.type = 'lowpass'; e.f.frequency.value = 400; e.f.Q.value = 1.2;
    e.g = gain(0.1);
    e.o1.connect(e.m1); e.o2.connect(e.m2); e.o3.connect(e.m3);
    e.m1.connect(e.f); e.m2.connect(e.f); e.m3.connect(e.f); e.f.connect(e.g); e.g.connect(e.bus);
    e.lfo = osc('sine', 8); e.lfoG = gain(0.02); e.lfo.connect(e.lfoG); e.lfoG.connect(e.g.gain);   /* "purr" */
    e.rn = loopNoise(0); e.rf = ctx.createBiquadFilter(); e.rf.type = 'lowpass'; e.rf.frequency.value = 200;
    e.rg = gain(0); e.rn.connect(e.rf); e.rf.connect(e.rg); e.rg.connect(e.bus);
    e.sn = loopNoise(0.9); e.sf = ctx.createBiquadFilter(); e.sf.type = 'bandpass'; e.sf.frequency.value = 2100; e.sf.Q.value = 9;
    e.sg = gain(0); e.sn.connect(e.sf); e.sf.connect(e.sg); e.sg.connect(e.bus);
    e.so = osc('triangle', 1150); e.sog = gain(0); e.so.connect(e.sog); e.sog.connect(e.bus);
    e.vib = osc('sine', 9); e.vibG = gain(35); e.vib.connect(e.vibG); e.vibG.connect(e.so.frequency);
    e.o1.start(); e.o2.start(); e.o3.start(); e.lfo.start(); e.so.start(); e.vib.start();
    E = e;
  }
  function eset(key, param, v, tc) {
    var l = eLast[key];
    if (l !== undefined && Math.abs(v - l) <= Math.abs(v) * 0.004 + 0.0002) return;
    eLast[key] = v; param.setTargetAtTime(v, ctx.currentTime, tc);
  }
  var GEARS = [0, 0.28, 0.52, 0.76, 1.01];
  function engine(st) {
    if (!E || ctx.state !== 'running') return;
    var on = !!(st && st.on) && soundOn;
    eset('bus', E.bus.gain, on ? 1 : 0, on ? 0.05 : 0.067);   /* off: ~0.2 s fade */
    if (!on) return;
    var s = clamp(+st.speed || 0, 0, 1), gas = !!st.gas, air = !!st.air, off = !!st.offroad && !air;
    var gi = 0; while (s >= GEARS[gi + 1]) gi++;
    var local = (s - GEARS[gi]) / (GEARS[gi + 1] - GEARS[gi]);
    var f = (58 + 112 * s) * (0.9 + 0.18 * local) * (air ? 1.12 : 1) * (gas ? 1.02 : 1);
    eset('f1', E.o1.frequency, f, 0.06); eset('f2', E.o2.frequency, f * 1.007, 0.06); eset('f3', E.o3.frequency, f * 0.5, 0.06);
    eset('cut', E.f.frequency, 320 + 1300 * s + (gas ? 650 : 0) + (air ? 350 : 0), 0.08);
    var vol = 0.075 + 0.04 * s + (gas ? 0.04 : 0);
    eset('vol', E.g.gain, vol, 0.08);
    eset('lfo', E.lfo.frequency, 7 + 22 * s, 0.1); eset('lfoG', E.lfoG.gain, vol * 0.25, 0.1);
    eset('rg', E.rg.gain, air ? 0 : off ? 0.16 + 0.12 * s : 0.02 * s, 0.06);
    eset('rf', E.rf.frequency, 120 + 320 * s + (off ? 150 : 0), 0.1);
    var sq = st.skid && !air ? 0.035 + 0.04 * Math.min(1, s * 1.5) : 0;
    eset('sg', E.sg.gain, sq, 0.04); eset('sog', E.sog.gain, sq * 0.3, 0.04);
  }

  /* ---------- music ---------- */
  var MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], PHD = [0, 1, 4, 5, 7, 8, 10];
  /* Patterns are 16 steps (16ths) per bar. Drums: 'x' = hit. bass/arp: digit = chord tone (0 root, 1 3rd, 2 5th,
   * 3 octave), '-' = hold. lead: base-36 scale degree from the root (+12*lo), '-' hold, '.' rest.
   * ch = chord root scale degree per bar (diatonic triads); loop length = ch.length bars. */
  var TRACKS = {
    title: { bpm: 132, root: 62, sc: MAJ, ch: [0, 4, 5, 3, 0, 4, 3, 4], li: 'sq', ai: 'pluck',
      b: '0.0.0.2.0.0.2.3.', a: '0.1.2.1.3.1.2.1.',
      k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...xx',
      l: ['0--4--7-----9-8-', '8-----6---4-6---', '9--8--7-----5-7-', '7-----5---3-----',
          '0--4--7-----9-a-', 'b-----a---9-8---', '7-8-9-a-9-8-7---', '8-----6-----4---'] },
    map: { bpm: 112, root: 65, sc: MAJ, ch: [0, 3, 4, 0], li: 'mar', ai: 'bell', av: 0.05,
      b: '0..2-.2.0..2-.2.', a: '..1...2...1...2.',
      k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', sv: 0.12,
      l: ['0-2-4---4-2-0---', '3-5-7---5-----3-', '4---6-4-2-1-0-1-', '2-------0-------'] },
    city: { bpm: 128, root: 60, sc: MAJ, ch: [0, 4, 5, 3], li: 'sq', ai: 'sq', av: 0.035,
      b: '0..0..0.0..0.2.3', a: '0.1.2.3.0.1.2.3.',
      k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...xx',
      l: ['4-4-5-4---2-0---', '1-1-2-1-----4---', '5-5-6-7---9-7---', '7-6-5-3-----4---'] },
    desert: { bpm: 116, root: 64, sc: PHD, ch: [0, 1, 6, 0], li: 'pluck', ai: 'pluck', lv: 0.2,
      b: '0..0..0.0..0.3..', a: '0.21.21.0.21.21.',
      k: 'x.....x.x.......', s: '....x.......x...', h: 'x.xxx.xxx.xxx.xx', hv: 0.05,
      l: ['4-3-2-3-4---2---', '3-2-1-2-3---5---', '6-5-6-8-6---5---', '4-2-1-2-0-------'] },
    snow: { bpm: 120, root: 67, sc: MAJ, ch: [0, 5, 3, 4], li: 'bell', ai: 'bell', av: 0.045, bv: 0.16,
      b: '0.......2.......', a: '0.2.1.3.0.2.1.3.',
      k: 'x.......x.......', s: '', h: 'x.xxx.xxx.xxx.xx', hv: 0.04,
      l: ['7---9---b---9---', '7---5---9---7---', 'a---9---7---5---', '6---8---b-------'] },
    jungle: { bpm: 118, root: 62, sc: MAJ, ch: [0, 3, 0, 4], li: 'mar', ai: 'mar', av: 0.07,
      b: '0...0.2.0...0.3.', a: '0..1..2.0..1..2.',
      k: 'x.....x...x.....', s: '', h: 'x.x.x.x.x.x.x.x.', hv: 0.04,
      bh: '..x.x..x..x.x..x', bl: '.x.....x.x....x.',
      l: ['0.2.4.7.4.2.4...', '5.3.5.7.a.7.5...', '7.9.7.4.2.4.0...', '1.4.6.8.6.4.1...'] },
    night: { bpm: 112, root: 57, sc: MIN, ch: [0, 5, 2, 6], li: 'saw', ai: 'saw', lo: 1, av: 0.04, lv: 0.09, cut: 2600,
      b: '0.0.0.0.0.0.0.0.', a: '0123012301230123',
      k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.',
      l: ['4-----2-4-5-4---', '7-----5-4-2-0---', '2-----4-6-7-6---', '6-----4-----1---'] },
    boss: { bpm: 144, root: 52, sc: MIN, ch: [0, 0, 5, 6], li: 'sq', ai: 'sq', lo: 1, ao: 1, bo: 0, av: 0.03,
      b: '0.00.00.0.00.2.3', a: '0.1.2.1.0.1.2.1.',
      k: 'x...x...x...x.x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', hv: 0.035,
      l: ['4-4-4-7---4-----', '5-4-2-0---2-----', '5-5-5-9---7-5---', '6-8-a---8-6-4-2-'] },
    results: { bpm: 120, root: 60, sc: MAJ, ch: [0, 3, 4, 0], li: 'bell', ai: 'pluck', lo: 1, av: 0.06,
      b: '0...2...0...2...', a: '0.1.2.1.0.1.2.1.',
      k: 'x.......x.......', s: '....x.......x...', h: '..x...x...x...x.', sv: 0.14,
      l: ['0.2.4.7---4-7---', '8.7.5.3---5-----', '4.6.8.b---8-6---', '7---4---7-------'] }
  };
  var CT = [0, 2, 4, 7];
  function deg(d, n) { var L = d.sc.length; return d.sc[((n % L) + L) % L] + 12 * Math.floor(n / L); }
  function holdLen(str, s) { var n = 1; while (str.charAt(s + n) === '-') n++; return n; }

  var players = [], timer = null, curKey = null;

  function newPlayer(key) {
    var d = TRACKS[key], p = { key: key, d: d, step: 0, sd: 60 / d.bpm / 4, stopAt: 0 }, t = now();
    p.gain = ctx.createGain(); p.gain.connect(musicBus);
    p.gain.gain.setValueAtTime(0.0001, t); p.gain.gain.linearRampToValueAtTime(1, t + 0.5);
    p.filt = ctx.createBiquadFilter(); p.filt.type = 'lowpass'; p.filt.frequency.value = d.cut || 4200; p.filt.connect(p.gain);
    p.hatF = ctx.createBiquadFilter(); p.hatF.type = 'highpass'; p.hatF.frequency.value = 7000; p.hatF.connect(p.gain);
    p.snF = ctx.createBiquadFilter(); p.snF.type = 'bandpass'; p.snF.frequency.value = 1800; p.snF.Q.value = 0.8; p.snF.connect(p.gain);
    p.next = t + 0.06;
    return p;
  }
  function switchTo(key) {
    var t = now();
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (!p.stopAt) { p.stopAt = t + 0.5; p.gain.gain.cancelScheduledValues(t); p.gain.gain.setTargetAtTime(0, t, 0.15); }
    }
    if (key) players.push(newPlayer(key));
    if (!timer && players.length) timer = setInterval(safe(tick), 25);
  }
  function music(key) {
    if (key == null) key = null;
    else if (!TRACKS[key]) return;
    if (key === curKey) return;
    curKey = key;
    if (ctx) switchTo(key);
  }
  function resetPlayers() {
    if (!ctx) return;
    var t = now() + 0.05;
    for (var i = 0; i < players.length; i++) if (players[i].next < t) players[i].next = t;
  }
  function tick() {
    if (!ctx) return;
    var t = now(), i, p;
    for (i = players.length - 1; i >= 0; i--) {
      p = players[i];
      if (p.stopAt && t > p.stopAt) {
        players.splice(i, 1);
        (function (g) { setTimeout(function () { try { g.disconnect(); } catch (e) {} }, 400); })(p.gain);
      }
    }
    if (!players.length) { clearInterval(timer); timer = null; return; }
    if (ctx.state !== 'running' || !musicOn) return;
    for (i = 0; i < players.length; i++) {
      p = players[i];
      if (p.next < t - 0.03) p.next = t + 0.03;     /* stalled (hidden tab, music off, hiccup): no backlog */
      var guard = 0;
      while (p.next < t + 0.12 && guard++ < 16) { step(p, p.step, p.next); p.step++; p.next += p.sd; }
    }
  }

  function step(p, n, t) {
    var d = p.d, s = n % 16, bar = Math.floor(n / 16) % d.ch.length, cr = d.ch[bar], c, sd = p.sd;
    if (d.k.charAt(s) === 'x') kick(p, t);
    if (d.s.charAt(s) === 'x') snare(p, t, d.sv || 0.22);
    if (d.h.charAt(s) === 'x') hat(p, t, (d.hv || 0.07) * (s % 4 === 2 ? 1 : 0.7));
    if (d.bh && d.bh.charAt(s) === 'x') bongo(p, t, 400);
    if (d.bl && d.bl.charAt(s) === 'x') bongo(p, t, 270);
    c = d.b.charAt(s);
    if (c >= '0' && c <= '3') note(p, 'bass', d.root + 12 * (d.bo == null ? -1 : d.bo) + deg(d, cr + CT[+c]), t, sd * holdLen(d.b, s) * 0.85, d.bv || 0.2);
    c = d.a.charAt(s);
    if (c >= '0' && c <= '3') note(p, d.ai, d.root + 12 * (d.ao || 0) + deg(d, cr + CT[+c]), t, sd * holdLen(d.a, s) * 0.8, d.av || 0.06);
    var L = d.l[bar % d.l.length];
    c = parseInt(L.charAt(s), 36);
    if (!isNaN(c)) note(p, d.li, d.root + 12 * (d.lo || 0) + deg(d, c), t, sd * holdLen(L, s) * 0.92, d.lv || 0.12);
  }

  function note(p, inst, m, t, dur, vol) {
    var f = mf(m), o = ctx.createOscillator(), g = ctx.createGain(), o2 = null, g2, end;
    g.connect(p.filt); o.connect(g);
    if (inst === 'bell' || inst === 'mar' || inst === 'pluck') {
      o.type = inst === 'pluck' ? 'triangle' : 'sine';
      var dec = inst === 'bell' ? Math.max(0.5, dur + 0.3) : inst === 'mar' ? 0.3 : clamp(dur, 0.18, 0.4);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dec); end = t + dec;
      if (inst !== 'pluck') {
        o2 = ctx.createOscillator(); g2 = ctx.createGain(); o2.type = 'sine';
        o2.frequency.value = f * (inst === 'bell' ? 2 : 4);
        g2.gain.setValueAtTime(inst === 'bell' ? 0.35 : 0.2, t);
        g2.gain.exponentialRampToValueAtTime(0.001, t + (inst === 'bell' ? dec * 0.5 : 0.05));
        o2.connect(g2); g2.connect(g);
      }
    } else {
      o.type = inst === 'bass' ? 'triangle' : inst === 'saw' ? 'sawtooth' : inst === 'sq' ? 'square' : 'triangle';
      if (inst === 'bass') { o2 = ctx.createOscillator(); o2.type = 'square'; g2 = ctx.createGain(); g2.gain.value = 0.15; o2.frequency.value = f; o2.connect(g2); g2.connect(g); }
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(vol * 0.6, t + Math.max(dur, 0.02));
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.06); end = t + dur + 0.06;
    }
    o.frequency.value = f;
    o.start(t); o.stop(end + 0.02);
    if (o2) { o2.start(t); o2.stop(end + 0.02); }
  }
  function kick(p, t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
    o.connect(g); g.connect(p.gain); o.start(t); o.stop(t + 0.25);
  }
  function nz(p, dest, t, vol, dec) {
    var s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = noiseBuf; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
    s.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dec + 0.01);
  }
  function snare(p, t, vol) {
    nz(p, p.snF, t, vol, 0.13);
    var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = 190;
    g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(g); g.connect(p.gain); o.start(t); o.stop(t + 0.08);
  }
  function hat(p, t, vol) { nz(p, p.hatF, t, vol, 0.035); }
  function bongo(p, t, f) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.85, t + 0.1);
    g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
    o.connect(g); g.connect(p.gain); o.start(t); o.stop(t + 0.14);
  }

  /* ---------- public API (every entry point is exception-proof) ---------- */
  var api = {
    unlock: safe(unlock),
    setSound: safe(setSound),
    setMusic: safe(setMusic),
    suspend: safe(suspend),
    resume: safe(resume),
    sfx: safe(sfx),
    engine: safe(engine),
    music: safe(music),
    isUnlocked: function () { return unlocked && !!ctx; },
    NAMES: NAMES,
    MUSIC_KEYS: Object.keys(TRACKS),
    /* dev/test hook only (dev/audio-test.html): the context and the final output node */
    _debug: function () { return { ctx: ctx, out: comp, voices: voices.length, players: players.length, key: curKey }; }
  };
  root.RR = root.RR || {};
  root.RR.audio = api;
})(window);
