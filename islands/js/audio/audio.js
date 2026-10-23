/* WebAudio only, all generated: sfx (footsteps, pickups, coins, quest chime, correct / gentle wrong, splash, boat, ...) and light
 * cheerful instrumental music (no lyrics) per island from a tiny look-ahead sequencer. Unlocks on the first tap. SI.audio. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {};
  var ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
  var soundOn = true, musicOn = true, scene = 'menu', unlocked = false, paused = false, timer = 0, nextT = 0, step = 0;
  var lastPlay = {};

  function ensure() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null;
    try {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
      musBus = ctx.createGain(); musBus.gain.value = 0.16; musBus.connect(master);
      var len = ctx.sampleRate * 0.5, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      noiseBuf = b;
    } catch (e) { ctx = null; }
    return ctx;
  }
  function unlock() {
    if (unlocked) return;
    if (!ensure()) return;
    unlocked = true; if (ctx.state === 'suspended') ctx.resume();
    startMusic();
  }
  ['pointerdown', 'touchend', 'keydown'].forEach(function (ev) { root.addEventListener(ev, unlock, { passive: true }); });

  /* ---- sfx building blocks ---- */
  function tone(freq, t0, dur, o) {
    o = o || {};
    var os = ctx.createOscillator(), g = ctx.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(freq, t0);
    if (o.slide) os.frequency.exponentialRampToValueAtTime(Math.max(30, o.slide), t0 + dur);
    var v = o.vol == null ? 0.5 : o.vol, a = o.rise || 0.008;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(v, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    os.connect(g); g.connect(o.bus || sfxBus); os.start(t0); os.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, o) {
    o = o || {};
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 800, t0);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
    f.Q.value = o.q || 0.8;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(o.vol || 0.3, t0 + (o.rise || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t0); s.stop(t0 + dur + 0.05);
  }
  function seq(notes, gap, o) { var t = ctx.currentTime + 0.01; notes.forEach(function (n, i) { tone(n, t + i * gap, (o && o.dur) || 0.3, o); }); }
  var N = { c4: 261.6, d4: 293.7, e4: 329.6, f4: 349.2, g4: 392, a4: 440, b4: 493.9, c5: 523.3, d5: 587.3, e5: 659.3, f5: 698.5, g5: 784, a5: 880, c6: 1046.5, e6: 1318.5 };

  var SFX = {
    tap: function (t) { tone(660, t, 0.07, { type: 'triangle', vol: 0.3, slide: 520 }); },
    coin: function (t) { tone(988, t, 0.07, { type: 'square', vol: 0.12 }); tone(1319, t + 0.06, 0.18, { type: 'square', vol: 0.12 }); },
    pickup: function (t) { [N.e5, N.g5, N.c6].forEach(function (f, i) { tone(f, t + i * 0.07, 0.2, { type: 'triangle', vol: 0.4 }); }); },
    quest: function (t) { [N.c5, N.e5, N.g5, N.c6, N.e6].forEach(function (f, i) { tone(f, t + i * 0.09, 0.45, { type: 'sine', vol: 0.4 }); tone(f * 2, t + i * 0.09, 0.3, { type: 'sine', vol: 0.08 }); }); },
    correct: function (t) { tone(N.g5, t, 0.14, { type: 'triangle', vol: 0.45 }); tone(N.c6, t + 0.1, 0.3, { type: 'triangle', vol: 0.45 }); },
    wrong: function (t) { tone(300, t, 0.22, { type: 'sine', vol: 0.4, slide: 220 }); tone(240, t + 0.16, 0.26, { type: 'sine', vol: 0.3, slide: 190 }); },
    nope: function (t) { tone(220, t, 0.16, { type: 'sine', vol: 0.4, slide: 170 }); tone(200, t + 0.12, 0.16, { type: 'sine', vol: 0.4, slide: 150 }); },
    step: function (t) { noise(t, 0.07, { freq: 260, q: 1.2, vol: 0.18 }); },
    stepSand: function (t) { noise(t, 0.09, { freq: 1800, q: 0.6, vol: 0.1 }); },
    splash: function (t) { noise(t, 0.5, { freq: 1200, to: 400, q: 0.5, vol: 0.4, rise: 0.03 }); },
    boat: function (t) { noise(t, 1.6, { freq: 500, to: 900, q: 0.4, vol: 0.18, rise: 0.3 }); [196, 247, 294].forEach(function (f, i) { tone(f, t + i * 0.28, 0.5, { type: 'triangle', vol: 0.25 }); }); },
    place: function (t) { tone(180, t, 0.12, { type: 'sine', vol: 0.6, slide: 90 }); noise(t, 0.06, { freq: 600, vol: 0.2 }); },
    pop: function (t) { tone(520, t, 0.09, { type: 'sine', vol: 0.4, slide: 900 }); },
    whoosh: function (t) { noise(t, 0.3, { freq: 400, to: 2400, q: 0.7, vol: 0.2, rise: 0.1 }); },
    talk: function (t) { tone(380 + Math.random() * 120, t, 0.06, { type: 'square', vol: 0.08 }); },
    buy: function (t) { tone(N.e5, t, 0.08, { type: 'square', vol: 0.12 }); tone(N.a5, t + 0.07, 0.1, { type: 'square', vol: 0.12 }); tone(N.e6, t + 0.14, 0.25, { type: 'square', vol: 0.12 }); },
    levelup: function (t) { [N.c5, N.e5, N.g5, N.c6, N.g5, N.c6, N.e6].forEach(function (f, i) { tone(f, t + i * 0.11, 0.5, { type: 'triangle', vol: 0.4 }); tone(f / 2, t + i * 0.11, 0.4, { type: 'sine', vol: 0.15 }); }); },
    star: function (t) { tone(N.e6, t, 0.35, { type: 'sine', vol: 0.4 }); tone(N.e6 * 1.5, t + 0.05, 0.3, { type: 'sine', vol: 0.2 }); },
    jump: function (t) { tone(320, t, 0.18, { type: 'sine', vol: 0.4, slide: 700 }); },
    bump: function (t) { tone(140, t, 0.15, { type: 'sine', vol: 0.5, slide: 80 }); },
    win: function (t) { [N.c5, N.e5, N.g5, N.c6].forEach(function (f, i) { tone(f, t + i * 0.13, 0.6, { type: 'triangle', vol: 0.4 }); }); tone(N.e6, t + 0.55, 0.8, { type: 'sine', vol: 0.3 }); }
  };
  var MIN_GAP = { step: 0.2, stepSand: 0.2, talk: 0.04, tap: 0.03, coin: 0.05 };

  function play(name) {
    if (!soundOn || !unlocked || !ctx || paused) return;
    var f = SFX[name]; if (!f) return;
    var now = ctx.currentTime; if (lastPlay[name] && now - lastPlay[name] < (MIN_GAP[name] || 0.02)) return;
    lastPlay[name] = now;
    try { f(now + 0.005); } catch (e) { /* never break the game */ }
  }

  /* ---- music: a tiny sequencer. 16-step bars, chords + arpeggio melody, different key / tempo / mood per scene ---- */
  var SCALES = { major: [0, 2, 4, 7, 9], mixo: [0, 2, 4, 7, 10], lyd: [0, 2, 4, 6, 7, 9], pent: [0, 3, 5, 7, 10] };
  var MOODS = {
    menu: { root: 60, bpm: 96, scale: 'major', prog: [0, 5, 3, 4], wave: 'triangle' },
    island1: { root: 62, bpm: 104, scale: 'major', prog: [0, 3, 4, 0], wave: 'triangle' },
    island2: { root: 57, bpm: 112, scale: 'mixo', prog: [0, 4, 5, 3], wave: 'triangle' },
    island3: { root: 64, bpm: 84, scale: 'lyd', prog: [0, 2, 5, 3], wave: 'sine' },
    island4: { root: 59, bpm: 90, scale: 'pent', prog: [0, 5, 3, 4], wave: 'sine' },
    island5: { root: 65, bpm: 100, scale: 'lyd', prog: [0, 4, 3, 5], wave: 'triangle' },
    island6: { root: 55, bpm: 108, scale: 'mixo', prog: [0, 3, 5, 4], wave: 'triangle' }
  };
  var CHORD_DEG = [0, 2, 4];   // scale-independent triads on the major scale degrees
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var MAJ = [0, 2, 4, 5, 7, 9, 11];
  function degNote(root, deg) { var o = Math.floor(deg / 7); return root + MAJ[((deg % 7) + 7) % 7] + 12 * o; }
  var melodyRng = 1;
  function rnd() { melodyRng = (melodyRng * 16807) % 2147483647; return melodyRng / 2147483647; }

  function scheduleBar() {
    var m = MOODS[scene] || MOODS.menu, spb = 60 / m.bpm, sixt = spb / 4, bar = Math.floor(step / 16) % m.prog.length, base = m.prog[bar];
    var sc = SCALES[m.scale], t0 = nextT;
    // pad chord
    CHORD_DEG.forEach(function (d) { tone(mtof(degNote(m.root - 12, base + d)), t0, spb * 3.6, { type: 'sine', vol: 0.5, rise: 0.25, bus: musBus }); });
    // bass on 1 and 3
    tone(mtof(degNote(m.root - 24, base)), t0, spb * 0.9, { type: 'triangle', vol: 0.7, bus: musBus });
    tone(mtof(degNote(m.root - 24, base + 4)), t0 + spb * 2, spb * 0.9, { type: 'triangle', vol: 0.55, bus: musBus });
    // arpeggio / melody
    melodyRng = 1000 + bar * 37 + (m.bpm | 0);
    for (var i = 0; i < 16; i++) {
      if (i % 2 === 1 && rnd() < 0.45) continue;
      if (i % 4 === 0 || rnd() < 0.5) {
        var d = base + CHORD_DEG[Math.floor(rnd() * 3)] + (rnd() < 0.35 ? 7 : 0);
        tone(mtof(degNote(m.root, d)), t0 + i * sixt, sixt * 2.2, { type: m.wave, vol: i % 4 === 0 ? 0.42 : 0.28, bus: musBus });
      }
    }
    nextT += spb * 4; step += 16;
  }
  function tick() {
    if (!ctx || !musicOn || paused || !soundOn) return;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.6) scheduleBar();
  }
  function startMusic() { if (!ctx) return; clearInterval(timer); nextT = ctx.currentTime + 0.1; step = 0; timer = setInterval(tick, 250); tick(); }

  SI.audio = {
    play: play, unlock: unlock,
    setSound: function (v) { soundOn = !!v; if (musBus) musBus.gain.value = soundOn && musicOn ? 0.16 : 0; },
    setMusic: function (v) { musicOn = !!v; if (musBus) musBus.gain.value = musicOn && soundOn ? 0.16 : 0; },
    setScene: function (s) { if (s !== scene) { scene = s; step = 0; if (ctx) nextT = ctx.currentTime + 0.4; } },
    pause: function () { paused = true; if (ctx && ctx.state === 'running') ctx.suspend(); },
    resume: function () { paused = false; if (ctx && unlocked) ctx.resume(); },
    state: function () { return { unlocked: unlocked, ctx: ctx ? ctx.state : 'none', sound: soundOn, music: musicOn, scene: scene }; }
  };
})(typeof self !== 'undefined' ? self : this);
