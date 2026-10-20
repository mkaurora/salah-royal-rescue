/* Voice memo recorder: MediaRecorder + a live loudness meter (for the waveform).
 * Prefers AAC in MP4 (plays on iPhone and Android), then WebM/Opus. */
(function (g) {
  'use strict';
  var TYPES = ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
  function pickType() {
    if (!g.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
    for (var i = 0; i < TYPES.length; i++) if (MediaRecorder.isTypeSupported(TYPES[i])) return TYPES[i];
    return '';
  }
  function supported() { return !!(g.navigator && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && g.MediaRecorder); }

  function createRecorder(opts) {
    opts = opts || {};
    var maxSec = opts.maxSec || 120;
    var stream = null, rec = null, chunks = [], levels = [], ctx = null, timer = null, t0 = 0, stopResolve = null, cancelled = false;

    function cleanup() {
      clearInterval(timer); timer = null;
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      if (ctx) { try { ctx.close(); } catch (e) { /* closed */ } }
      stream = null; ctx = null;
    }

    function start() {
      cancelled = false; chunks = []; levels = [];
      return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }).then(function (s) {
        if (cancelled) { s.getTracks().forEach(function (t) { t.stop(); }); throw new Error('cancelled'); }
        stream = s;
        var type = pickType();
        rec = type ? new MediaRecorder(s, { mimeType: type, audioBitsPerSecond: 32000 }) : new MediaRecorder(s);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          var dur = (Date.now() - t0) / 1000;
          var mime = (rec.mimeType || type || 'audio/webm').split(';')[0];
          var blob = new Blob(chunks, { type: mime });
          var out = { blob: blob, mime: mime, dur: Math.round(dur * 10) / 10, peaks: g.FC.fmt.peaks(levels, 40) };
          cleanup();
          if (stopResolve) { var r = stopResolve; stopResolve = null; r(cancelled ? null : out); }
        };
        try {
          var AC = g.AudioContext || g.webkitAudioContext;
          ctx = new AC();
          var src = ctx.createMediaStreamSource(s), an = ctx.createAnalyser();
          an.fftSize = 512; src.connect(an);
          var buf = new Uint8Array(an.fftSize);
          timer = setInterval(function () {
            an.getByteTimeDomainData(buf);
            var sum = 0; for (var i = 0; i < buf.length; i++) { var v = (buf[i] - 128) / 128; sum += v * v; }
            var lvl = Math.min(1, Math.sqrt(sum / buf.length) * 3);
            levels.push(lvl);
            var sec = (Date.now() - t0) / 1000;
            if (opts.onTick) opts.onTick(sec, lvl);
            if (sec >= maxSec) stop();
          }, 100);
        } catch (e) { /* no meter: still records */ }
        t0 = Date.now();
        rec.start(250);
        return true;
      });
    }
    function stop() {
      return new Promise(function (resolve) {
        if (!rec || rec.state === 'inactive') { cleanup(); resolve(null); return; }
        stopResolve = resolve;
        try { rec.requestData(); } catch (e) { /* not recording */ }
        rec.stop();
      });
    }
    function cancel() { cancelled = true; return stop(); }
    return { start: start, stop: stop, cancel: cancel, recording: function () { return !!(rec && rec.state === 'recording'); } };
  }
  g.FC = g.FC || {};
  g.FC.createRecorder = createRecorder;
  g.FC.recorderSupported = supported;
  g.FC.recorderType = pickType;
})(typeof self !== 'undefined' ? self : this);
