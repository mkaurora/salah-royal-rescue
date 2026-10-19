/* Salah's Learning Quest — WebAudio synthesized sound effects + pre-generated voice clips, with iOS first-tap unlock. */
(function () {
  'use strict';
  var SQ = window.SQ = window.SQ || {};
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, voiceGain = null, noiseBuf = null;
  var muted = false, sfxVol = 0.8, voiceVol = 1;

  function ensureCtx() {
    if (!AC) return null;
    if (!ctx) {
      try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.55 * sfxVol;
        master.connect(ctx.destination);
        voiceGain = ctx.createGain();     // voice clips get their own volume, independent of SFX
        voiceGain.gain.value = voiceVol;
        voiceGain.connect(ctx.destination);
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
    if (SQ.voice) SQ.voice._decodePending();
  }

  ['touchstart', 'touchend', 'pointerdown', 'click', 'keydown'].forEach(function (ev) {
    document.addEventListener(ev, unlock, { capture: true, passive: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') resume();
    else if (SQ.voice) SQ.voice.stop();
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
    pop: function () { tone({ type: 'sine', f: 300, f2: 900, d: 0.09, v: 0.3 }); },
    count: function () { tone({ type: 'triangle', f: 520 + Math.random() * 40, f2: 780, d: 0.1, v: 0.22 }); },
    tile: function () { tone({ type: 'triangle', f: 700, f2: 1050, d: 0.07, v: 0.2 }); noise({ d: 0.03, v: 0.05, filter: 'highpass', f: 4000 }); },
    whoosh: function () { noise({ d: 0.35, v: 0.22, filter: 'bandpass', f: 400, f2: 3000, q: 2 }); },
    oops: function () { tone({ type: 'triangle', f: 440, f2: 330, d: 0.18, v: 0.16 }); tone({ type: 'triangle', f: 330, f2: 262, t: 0.16, d: 0.24, v: 0.14 }); },
    correct: function () {
      tone({ type: 'triangle', f: notes.C6, d: 0.12, v: 0.22 }); tone({ type: 'triangle', f: notes.E6, t: 0.08, d: 0.14, v: 0.2 });
      tone({ type: 'sine', f: notes.G6, t: 0.16, d: 0.35, v: 0.16 }); noise({ t: 0.05, d: 0.25, v: 0.04, filter: 'highpass', f: 6000 });
    },
    streak: function () {
      ['C6', 'E6', 'G6'].forEach(function (n, i) { tone({ type: 'sine', f: notes[n], t: i * 0.06, d: 0.2, v: 0.12 }); });
      for (var i = 0; i < 6; i++) tone({ type: 'sine', f: 2000 + i * 300, t: 0.2 + i * 0.04, d: 0.08, v: 0.05 });
    },
    success: function () {
      ['C5', 'E5', 'G5', 'C6'].forEach(function (n, i) { tone({ type: 'triangle', f: notes[n], t: i * 0.1, d: 0.25, v: 0.25 }); });
      tone({ type: 'sine', f: notes.E6, t: 0.4, d: 0.5, v: 0.12 });
    },
    star: function () { tone({ type: 'sine', f: notes.C6, d: 0.15, v: 0.2 }); tone({ type: 'sine', f: notes.G6, t: 0.06, d: 0.35, v: 0.15 }); noise({ d: 0.2, v: 0.04, filter: 'highpass', f: 6000 }); },
    cheer: function () {
      ['G5', 'C6', 'E6', 'G6'].forEach(function (n, i) { tone({ type: 'square', f: notes[n], t: i * 0.08, d: 0.18, v: 0.06 }); });
      noise({ t: 0.1, d: 0.6, v: 0.08, filter: 'bandpass', f: 2000, q: 0.7 });
    },
    hint: function () { tone({ type: 'sine', f: notes.A5, d: 0.25, v: 0.15 }); tone({ type: 'sine', f: notes.E6, t: 0.12, d: 0.4, v: 0.12 }); },
    swap: function () { noise({ d: 0.4, v: 0.15, filter: 'bandpass', f: 600, f2: 2400, q: 1.5 }); tone({ type: 'sine', f: 500, f2: 900, t: 0.1, d: 0.25, v: 0.15 }); },
    unlock: function () { tone({ type: 'square', f: 900, f2: 500, d: 0.06, v: 0.08 }); tone({ type: 'sine', f: notes.E6, t: 0.1, d: 0.3, v: 0.15 }); tone({ type: 'sine', f: notes.G6, t: 0.2, d: 0.4, v: 0.12 }); },
    open: function () { tone({ type: 'sine', f: 400, f2: 800, d: 0.15, v: 0.2 }); },
    close: function () { tone({ type: 'sine', f: 700, f2: 350, d: 0.15, v: 0.2 }); },
    hoot: function () { tone({ type: 'sine', f: 420, f2: 380, d: 0.18, v: 0.2 }); tone({ type: 'sine', f: 400, f2: 340, t: 0.24, d: 0.28, v: 0.2 }); },
    beep: function () { tone({ type: 'square', f: 1040, d: 0.08, v: 0.05 }); }
  };


  /* ---------- Voice clips (audio/voice/<key>.mp3, listed in audio/voice/manifest.json) ---------- */
  var VOICE_DIR = 'audio/voice/';
  var available = null;            // Set-like object of clip keys (null until manifest loaded)
  var manifestP = null;
  var raw = {};                    // key -> Promise<ArrayBuffer>
  var decoded = {};                // key -> AudioBuffer
  var decoding = {};               // key -> Promise<AudioBuffer>
  var groups = null;               // audio/voice/groups.json: { common: [keys], 'world:index': [keys] }
  var current = null;              // { src, done, timer }

  function getJSON(url) {
    if (!window.fetch) return Promise.reject(new Error('no fetch'));
    return window.fetch(url).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  }
  function loadManifest() {
    if (manifestP) return manifestP;
    manifestP = getJSON(VOICE_DIR + 'manifest.json').then(function (list) {
      available = {};
      (Array.isArray(list) ? list : []).forEach(function (k) { available[k] = true; });
      return available;
    }).catch(function () { available = {}; return available; });
    getJSON(VOICE_DIR + 'groups.json').then(function (g) { groups = g || {}; }).catch(function () { groups = {}; });
    return manifestP;
  }

  /** decodeAudioData: promise form + the callback form older Safari needs. */
  function decode(ab) {
    return new Promise(function (resolve, reject) {
      var done = false;
      function ok(b) { if (!done) { done = true; resolve(b); } }
      function fail(e) { if (!done) { done = true; reject(e || new Error('decode failed')); } }
      try {
        var p = ctx.decodeAudioData(ab, ok, fail);
        if (p && p.then) p.then(ok, fail);
      } catch (e) { fail(e); }
    });
  }
  function fetchClip(k) {
    if (!raw[k]) {
      raw[k] = window.fetch(VOICE_DIR + k + '.mp3').then(function (r) {
        if (!r.ok) throw new Error('clip ' + r.status);
        return r.arrayBuffer();
      });
      raw[k].catch(function () { delete raw[k]; });
    }
    return raw[k];
  }
  function decodeClip(k) {
    if (decoded[k]) return Promise.resolve(decoded[k]);
    if (decoding[k]) return decoding[k];
    if (!ensureCtx()) return Promise.reject(new Error('no audio'));
    decoding[k] = fetchClip(k).then(function (ab) {
      // decodeAudioData detaches the buffer: keep the cached one intact for retries.
      return decode(ab.slice(0));
    }).then(function (b) { decoded[k] = b; delete decoding[k]; return b; },
      function (e) { delete decoding[k]; throw e; });
    return decoding[k];
  }
  function stopVoice() {
    var c = current;
    current = null;
    if (!c) return;
    clearTimeout(c.timer);
    try { c.src.onended = null; c.src.stop(0); } catch (e) {}
    c.done();
  }
  function playBuffer(buf) {
    stopVoice();
    return new Promise(function (resolve) {
      var src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(voiceGain);
      var me = { src: src, done: resolve, timer: 0 };
      current = me;
      function end() { if (current === me) current = null; clearTimeout(me.timer); resolve(); }
      src.onended = end;
      // Safety net: if the context stays locked/suspended, 'ended' never fires.
      me.timer = setTimeout(end, buf.duration * 1000 + 1500);
      resume();
      if (src.start) src.start(0); else src.noteOn(0);
    });
  }

  SQ.voice = {
    ready: function () { return loadManifest(); },
    get loaded() { return !!available; },
    key: function (text) { return SQ.voiceKey.key(text); },
    has: function (text) { return !!(available && available[SQ.voiceKey.key(text)]); },
    /** Play the clip for `text`. Resolves true when it finished, rejects if there is no usable clip. */
    play: function (text) {
      var k = SQ.voiceKey.key(text);
      return loadManifest().then(function () {
        if (!available[k]) throw new Error('no clip');
        if (!ensureCtx()) throw new Error('no audio');
        return decodeClip(k);
      }).then(function (buf) { return playBuffer(buf).then(function () { return buf.duration; }); });
    },
    /** Duration (s) of a decoded clip, or 0. */
    duration: function (text) { var b = decoded[SQ.voiceKey.key(text)]; return b ? b.duration : 0; },
    stop: stopVoice,
    get playing() { return !!current; },
    /** Fetch (and decode once audio is unlocked) the clips for these lines. */
    prefetch: function (texts) {
      return loadManifest().then(function () {
        (texts || []).forEach(function (t) {
          var k = SQ.voiceKey.key(t);
          if (!available[k]) return;
          if (ctx) decodeClip(k).catch(function () {}); else fetchClip(k).catch(function () {});
        });
      });
    },
    /** Prefetch a group from groups.json ('common', 'robot:0', ...). */
    prefetchGroup: function (name) {
      return loadManifest().then(function () {
        var tries = 0;
        (function go() {
          if (!groups) { if (tries++ < 20) setTimeout(go, 150); return; }
          (groups[name] || []).forEach(function (k) {
            if (!available[k]) return;
            if (ctx) decodeClip(k).catch(function () {}); else fetchClip(k).catch(function () {});
          });
        })();
      });
    },
    _decodePending: function () {
      if (!ctx) return;
      Object.keys(raw).forEach(function (k) { if (!decoded[k]) decodeClip(k).catch(function () {}); });
    },
    _stats: function () { return { available: available ? Object.keys(available).length : -1, decoded: Object.keys(decoded).length, fetched: Object.keys(raw).length }; }
  };
  loadManifest();

  SQ.sound = {
    play: function (name) {
      if (muted) return;
      var c = ensureCtx();
      if (!c) return;
      resume();
      if (sfxVol <= 0) return;
      var fn = SFX[name] || SFX.tap;
      try { fn(); } catch (e) { /* never let audio break the game */ }
    },
    setMuted: function (m) { muted = !!m; if (muted) stopVoice(); },
    isMuted: function () { return muted; },
    unlock: unlock,
    setVolumes: function (sv, vv) {
      sfxVol = +sv; voiceVol = +vv;
      if (master) master.gain.value = 0.55 * sfxVol;
      if (voiceGain) voiceGain.gain.value = voiceVol;
    },
    get voiceVolume() { return voiceVol; },
    names: Object.keys(SFX),
    get state() { return ctx ? ctx.state : 'none'; }
  };
})();
