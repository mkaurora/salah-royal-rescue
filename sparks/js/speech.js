// Read-aloud via the Web Speech API. Reports honestly when speech or a
// matching voice is unavailable; "speaking" state follows real speech events.
(function (S) {
  var synth = self.speechSynthesis || null;
  var voices = [];
  var current = null;

  function loadVoices() {
    if (!synth) return [];
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    return voices;
  }
  if (synth) {
    loadVoices();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', loadVoices);
    else synth.onvoiceschanged = loadVoices;
  }

  // Some browsers populate voices asynchronously; wait briefly before deciding.
  function voicesReady() {
    if (loadVoices().length) return Promise.resolve(voices);
    return new Promise(function (resolve) {
      var tries = 0;
      var timer = setInterval(function () {
        if (loadVoices().length || ++tries > 10) { clearInterval(timer); resolve(voices); }
      }, 100);
    });
  }

  function findVoice(lang) {
    var prefix = lang.toLowerCase();
    var matches = voices.filter(function (v) { return (v.lang || '').toLowerCase().replace('_', '-').indexOf(prefix) === 0; });
    return matches.filter(function (v) { return v.localService; })[0] || matches[0] || null;
  }

  S.speech = {
    supported: !!(synth && self.SpeechSynthesisUtterance),
    isSpeaking: function () { return !!current; },
    // Resolves to { ok: true } when speech actually starts, or
    // { ok: false, reason: 'unsupported' | 'novoice' | 'error' }.
    speak: function (text, lang, handlers) {
      handlers = handlers || {};
      if (!S.speech.supported) return Promise.resolve({ ok: false, reason: 'unsupported' });
      S.speech.stop();
      return voicesReady().then(function () {
        var voice = findVoice(lang);
        if (!voice) return { ok: false, reason: 'novoice' };
        return new Promise(function (resolve) {
          var u = new SpeechSynthesisUtterance(text);
          u.voice = voice;
          u.lang = voice.lang;
          u.rate = lang === 'ar' ? 0.95 : 1;
          var settled = false;
          var startTimer = setTimeout(function () {
            if (!settled) { settled = true; current = null; try { synth.cancel(); } catch (e) {} resolve({ ok: false, reason: 'error' }); }
          }, 4000);
          u.onstart = function () {
            if (settled) return;
            settled = true; clearTimeout(startTimer);
            current = u;
            if (handlers.onstart) handlers.onstart();
            resolve({ ok: true });
          };
          u.onend = function () {
            if (current === u) current = null;
            if (handlers.onend) handlers.onend();
          };
          u.onerror = function () {
            if (current === u) current = null;
            if (!settled) { settled = true; clearTimeout(startTimer); resolve({ ok: false, reason: 'error' }); }
            if (handlers.onend) handlers.onend();
          };
          synth.speak(u);
        });
      });
    },
    stop: function () {
      if (!synth) return;
      current = null;
      try { synth.cancel(); } catch (e) {}
    }
  };
})(self.Sparks = self.Sparks || {});
