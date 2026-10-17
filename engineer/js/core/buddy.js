/* Robot buddy "Bolt": animated SVG character, speech bubble, pointing hand, read-aloud. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var h = LE.h;

  LE.buddySVG = function (opts) {
    opts = opts || {};
    var id = 'b' + Math.random().toString(36).slice(2, 7);
    return '' +
      '<svg class="buddy-svg" viewBox="0 0 120 150" aria-hidden="true">' +
      '<defs>' +
      '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7ee8ff"/><stop offset="1" stop-color="#2fa8e0"/></linearGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ff9f1c"/></linearGradient>' +
      '<radialGradient id="' + id + 'g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff7b0"/><stop offset=".5" stop-color="#ffe14d"/><stop offset="1" stop-color="#ffe14d" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<ellipse class="bd-shadow" cx="60" cy="144" rx="30" ry="5" fill="rgba(0,0,0,.22)"/>' +
      '<g class="bd-bob">' +
      // antenna
      '<line x1="60" y1="22" x2="60" y2="8" stroke="#1b6f8f" stroke-width="4" stroke-linecap="round"/>' +
      '<circle class="bd-glow" cx="60" cy="8" r="11" fill="url(#' + id + 'g)"/>' +
      '<circle cx="60" cy="8" r="5.5" fill="#ffe14d" stroke="#c99a00" stroke-width="2"/>' +
      // arms (behind body)
      '<g class="bd-arm-l"><rect x="10" y="88" width="14" height="34" rx="7" fill="#2fa8e0" stroke="#1b6f8f" stroke-width="3"/><circle cx="17" cy="124" r="8" fill="#ffd166" stroke="#c97a00" stroke-width="3"/></g>' +
      '<g class="bd-arm-r"><rect x="96" y="88" width="14" height="34" rx="7" fill="#2fa8e0" stroke="#1b6f8f" stroke-width="3"/><circle cx="103" cy="124" r="8" fill="#ffd166" stroke="#c97a00" stroke-width="3"/></g>' +
      // body
      '<rect x="26" y="82" width="68" height="52" rx="18" fill="url(#' + id + 'b)" stroke="#c97a00" stroke-width="3"/>' +
      '<rect x="44" y="94" width="32" height="22" rx="8" fill="#fff4d6" stroke="#c97a00" stroke-width="2"/>' +
      '<path class="bd-heart" d="M60 111 l-7 -7 a4 4 0 0 1 7 -5 a4 4 0 0 1 7 5z" fill="#ff4f6d"/>' +
      // head
      '<rect x="14" y="20" width="92" height="66" rx="24" fill="url(#' + id + 'h)" stroke="#1b6f8f" stroke-width="3"/>' +
      '<rect x="6" y="42" width="10" height="22" rx="5" fill="#ff9f1c" stroke="#c97a00" stroke-width="2.5"/>' +
      '<rect x="104" y="42" width="10" height="22" rx="5" fill="#ff9f1c" stroke="#c97a00" stroke-width="2.5"/>' +
      '<rect x="24" y="30" width="72" height="46" rx="17" fill="#173a5e"/>' +
      '<ellipse cx="38" cy="36" rx="8" ry="3" fill="rgba(255,255,255,.25)"/>' +
      '<g class="bd-eyes"><ellipse class="bd-eye" cx="45" cy="50" rx="7" ry="9" fill="#7ff3ff"/><ellipse class="bd-eye" cx="75" cy="50" rx="7" ry="9" fill="#7ff3ff"/>' +
      '<circle cx="47" cy="46" r="2.6" fill="#fff"/><circle cx="77" cy="46" r="2.6" fill="#fff"/></g>' +
      '<circle cx="34" cy="64" r="5" fill="#ff7aa2" opacity=".75"/><circle cx="86" cy="64" r="5" fill="#ff7aa2" opacity=".75"/>' +
      '<path class="bd-mouth" d="M50 63 q10 9 20 0" fill="none" stroke="#7ff3ff" stroke-width="3.5" stroke-linecap="round"/>' +
      '</g></svg>';
  };

  LE.handSVG = function () {
    return '<svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">' +
      '<g fill="#fff" stroke="#27304a" stroke-width="3" stroke-linejoin="round">' +
      '<rect x="18" y="52" width="34" height="10" rx="4" fill="#3d8bff"/>' +
      '<rect x="14" y="27" width="42" height="30" rx="13"/>' +
      '<rect x="29" y="23" width="11" height="17" rx="5.5"/>' +
      '<rect x="39" y="25" width="10" height="16" rx="5"/>' +
      '<rect x="48" y="28" width="9" height="14" rx="4.5"/>' +
      '<rect x="3" y="33" width="21" height="11" rx="5.5" transform="rotate(-38 14 39)"/>' +
      '<rect x="17" y="2" width="12" height="37" rx="6"/>' +
      '</g><ellipse cx="21" cy="9" rx="2" ry="3.5" fill="rgba(255,255,255,.9)"/></svg>';
  };

  /* ---------- Read aloud (local speech synthesis, no network) ---------- */
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
  LE.speak = function (text) {
    if (!window.speechSynthesis || !LE.voiceOn || LE.sound.isMuted() || LE.FAST) return;
    try {
      speechSynthesis.cancel();
      var clean = String(text).replace(/[^\w\s.,!?'’\-:;]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      var u = new SpeechSynthesisUtterance(clean);
      voice = voice || pickVoice();
      if (voice) u.voice = voice;
      u.lang = 'en-US'; u.rate = 0.92; u.pitch = 1.25; u.volume = 1;
      speechSynthesis.speak(u);
    } catch (e) {}
  };
  LE.stopSpeaking = function () { try { window.speechSynthesis && speechSynthesis.cancel(); } catch (e) {} };

  /* ---------- Pointing hand ---------- */
  var handEl = null, handPos = { x: -100, y: -100 }, loopToken = 0;
  var TIP = { x: 23, y: 3 };       // fingertip inside the 64x64 svg
  function handInit() {
    if (handEl) return handEl;
    handEl = document.getElementById('hand') || h('div#hand');
    handEl.innerHTML = '<div class="hand-inner">' + LE.handSVG() + '</div><div class="hand-ripple"></div>';
    if (!handEl.parentNode) document.body.appendChild(handEl);
    return handEl;
  }
  function place(p) {
    handPos = { x: p.x, y: p.y };
    handEl.style.transform = 'translate(' + (p.x - TIP.x) + 'px,' + (p.y - TIP.y) + 'px)';
  }
  function resolvePoint(t) {
    if (!t) return null;
    if (typeof t === 'function') t = t();
    if (!t) return null;
    if (t.getBoundingClientRect) t = t.getBoundingClientRect();
    if (t.width !== undefined && t.left !== undefined) return { x: t.left + t.width / 2, y: t.top + t.height / 2 };
    if (t.x !== undefined) return { x: t.x, y: t.y };
    return null;
  }

  LE.hand = {
    show: function () { handInit(); handEl.classList.add('show'); },
    hide: function () { if (handEl) { handEl.classList.remove('show', 'press', 'drag'); } loopToken++; },
    resolve: resolvePoint,
    /** Move to a target (element, rect, point or function returning one). */
    moveTo: function (target, ms) {
      handInit();
      var p = resolvePoint(target);
      if (!p) return Promise.resolve(false);
      var from = handEl.classList.contains('show') ? handPos : { x: p.x + 60, y: p.y + 90 };
      LE.hand.show();
      ms = ms || 600;
      return LE.tween(ms, function (t) {
        // gentle arc
        var x = from.x + (p.x - from.x) * t, y = from.y + (p.y - from.y) * t - Math.sin(t * Math.PI) * 30;
        place({ x: x, y: y });
      }).then(function () { return true; });
    },
    tap: function () {
      handInit();
      handEl.classList.add('press');
      handEl.classList.remove('ripple-go'); void handEl.offsetWidth; handEl.classList.add('ripple-go');
      return LE.wait(260).then(function () { handEl.classList.remove('press'); return LE.wait(140); });
    },
    /** Press at `from`, drag (with optional ghost element) to `to`, release. */
    drag: function (from, to, ghostHTML) {
      var self = LE.hand;
      return self.moveTo(from, 550).then(function (ok) {
        if (!ok) return false;
        handEl.classList.add('press', 'drag');
        var ghost = null;
        if (ghostHTML) {
          ghost = h('div.hand-ghost', { html: ghostHTML });
          handEl.appendChild(ghost);
        }
        return LE.wait(200).then(function () {
          var a = handPos, b = resolvePoint(to);
          if (!b) return false;
          return LE.tween(750, function (t) { place({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); })
            .then(function () { return LE.wait(120); })
            .then(function () { handEl.classList.remove('press', 'drag'); if (ghost) ghost.remove(); return true; });
        });
      });
    },
    /** Repeat a point/drag gesture until stop() or hide() (used by tutorials). */
    loop: function (from, to, ghostHTML) {
      var token = ++loopToken;
      var self = LE.hand;
      (function again() {
        if (token !== loopToken) return;
        var p = to ? self.drag(from, to, ghostHTML) : self.moveTo(from, 500).then(function (ok) { return ok && self.tap(); });
        p.then(function () { return LE.wait(to ? 700 : 900); }).then(function () {
          if (token !== loopToken) return;
          if (to && handEl) { handEl.classList.remove('show'); }
          setTimeout(again, to ? 150 / LE.speed : 0);
        });
      })();
      return token;
    },
    stop: function () { LE.hand.hide(); }
  };

  /* ---------- Buddy widget ---------- */
  function Buddy(parent, opts) {
    opts = opts || {};
    var self = this;
    this.el = h('div.buddy' + (opts.cls ? '.' + opts.cls : ''));
    this.char = h('div.buddy-char.pressable', { html: LE.buddySVG(), role: 'button', 'aria-label': 'Robot buddy' });
    this.bubble = h('div.bubble');
    this.text = h('div.bubble-text');
    this.actions = h('div.bubble-actions');
    this.speakBtn = h('button.bubble-speak', { type: 'button', 'aria-label': 'Read aloud', html: '🔊' });
    this.bubble.append(this.text, this.actions, this.speakBtn);
    this.el.append(this.bubble, this.char);
    parent.appendChild(this.el);
    this.lastText = '';
    this.speakBtn.addEventListener('click', function (e) { e.stopPropagation(); LE.voiceOnce = true; LE.speakForce(self.lastText); });
    this.char.addEventListener('click', function () { LE.sound.play('pop'); self.wave(); if (self.onTap) self.onTap(); });
    this._blink = setInterval(function () { self.blink(); }, 3200 + Math.random() * 1500);
  }
  Buddy.prototype.blink = function () {
    var e = this.char.querySelector('.bd-eyes');
    if (!e || !e.animate) return;
    e.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.1)' }, { transform: 'scaleY(1)' }], { duration: 180 });
  };
  Buddy.prototype.wave = function () {
    this.char.classList.remove('waving'); void this.char.offsetWidth; this.char.classList.add('waving');
  };
  Buddy.prototype.cheer = function () {
    this.char.classList.remove('cheer'); void this.char.offsetWidth; this.char.classList.add('cheer');
  };
  Buddy.prototype.mood = function (m) {
    this.char.dataset.mood = m || '';
  };
  /** Show a speech bubble. opts.buttons = [{label, cls, onTap}], opts.ok (adds "OK" button and returns promise), opts.time ms auto-hide. */
  Buddy.prototype.say = function (text, opts) {
    opts = opts || {};
    var self = this;
    clearTimeout(this._hideT);
    this.lastText = text;
    this.text.textContent = text;
    this.actions.innerHTML = '';
    this.bubble.classList.remove('show'); void this.bubble.offsetWidth;
    this.bubble.classList.add('show');
    this.wave();
    if (opts.speak !== false) LE.speak(text);
    var promise = null;
    if (opts.ok) {
      promise = new Promise(function (resolve) {
        self.actions.appendChild(LE.button('small green', opts.okLabel || 'OK! 👍', function () { resolve(); }));
      });
    }
    (opts.buttons || []).forEach(function (b) {
      self.actions.appendChild(LE.button('small ' + (b.cls || ''), b.label, b.onTap));
    });
    if (opts.time) this._hideT = setTimeout(function () { self.hide(); }, opts.time / LE.speed);
    return promise || Promise.resolve();
  };
  Buddy.prototype.hide = function () { this.bubble.classList.remove('show'); };
  Buddy.prototype.destroy = function () { clearInterval(this._blink); clearTimeout(this._hideT); this.el.remove(); };

  LE.Buddy = Buddy;
  LE.voiceOn = true;
  LE.speakForce = function (text) { var was = LE.voiceOn; LE.voiceOn = true; LE.speak(text); LE.voiceOn = was; };
})();
