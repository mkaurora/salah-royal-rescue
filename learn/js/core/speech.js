/* SQ.speak(text | [parts]) → Promise. Plays pre-generated clips (audio/voice/<key>.mp3, via SQ.voice) in sequence;
 * when any part has no clip the whole line is spoken by the browser's speech synthesis instead (better flow
 * than mixing). The newest call always wins (stops the previous line). ?fast=1 / voice off → resolves at once. */
(function () {
  'use strict';
  var SQ = window.SQ = window.SQ || {};
  var VK = SQ.voiceKey;

  var voice = null;
  function pickVoice() {
    if (!window.speechSynthesis) return null;
    var vs = speechSynthesis.getVoices() || [];
    var pref = ['Samantha', 'Karen', 'Moira', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny'];
    for (var i = 0; i < pref.length; i++) {
      for (var j = 0; j < vs.length; j++) if (vs[j].name.indexOf(pref[i]) >= 0 && vs[j].localService !== false) return vs[j];
    }
    for (j = 0; j < vs.length; j++) if (/^en[-_]US/i.test(vs[j].lang) && vs[j].localService !== false) return vs[j];
    for (j = 0; j < vs.length; j++) if (/^en/i.test(vs[j].lang)) return vs[j];
    return null;
  }
  if (window.speechSynthesis && 'onvoiceschanged' in speechSynthesis) {
    speechSynthesis.addEventListener('voiceschanged', function () { voice = pickVoice(); });
  }

  function synthSpeak(clean) {
    return new Promise(function (resolve) {
      if (!window.speechSynthesis || !clean) { resolve(); return; }
      var finished = false;
      function done() { if (!finished) { finished = true; clearTimeout(t); resolve(); } }
      var t = setTimeout(done, 1500 + clean.split(' ').length * 500);
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(clean);
        voice = voice || pickVoice();
        if (voice) u.voice = voice;
        u.lang = 'en-US'; u.rate = 0.85; u.pitch = 1.1;
        u.volume = SQ.sound ? Math.max(0.1, SQ.sound.voiceVolume) : 1;
        u.onend = done; u.onerror = done;
        speechSynthesis.speak(u);
      } catch (e) { done(); }
    });
  }

  var token = 0;
  SQ.voiceOn = true;
  SQ.lastSpoken = [];
  SQ.spokenLog = [];   // for tests / tools: every line requested

  SQ.speak = function (text) {
    var parts = (Array.isArray(text) ? text : [text]).map(VK.normalize).filter(Boolean);
    if (parts.length) { SQ.lastSpoken = parts; SQ.spokenLog.push(parts.join(' | ')); if (SQ.spokenLog.length > 200) SQ.spokenLog.shift(); }
    if (!SQ.voiceOn || SQ.FAST || !parts.length || (SQ.sound && SQ.sound.voiceVolume <= 0)) return Promise.resolve();
    var my = ++token;
    SQ.stopSpeaking(true);
    var allClips = SQ.voice.loaded && parts.every(function (p) { return SQ.voice.has(p); });
    if (SQ.voice.loaded && !allClips) return synthSpeak(parts.join(' '));
    var i = 0;
    return (function next() {
      if (my !== token || i >= parts.length) return Promise.resolve();
      var line = parts[i++];
      return SQ.voice.play(line).catch(function () {
        if (my !== token) return;
        return synthSpeak(parts.slice(i - 1).join(' ')).then(function () { i = parts.length; });
      }).then(next);
    })();
  };
  /** Alias making the fragment API explicit: speakParts(['What is', '3', 'plus', '4']). */
  SQ.speakParts = function (parts) { return SQ.speak(parts); };
  SQ.isSpeaking = function () { return SQ.voice.playing || !!(window.speechSynthesis && speechSynthesis.speaking); };
  SQ.stopSpeaking = function (keepToken) {
    if (!keepToken) token++;
    if (SQ.voice) SQ.voice.stop();
    try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
  };
})();
