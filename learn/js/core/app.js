/* App shell: state, screen router, overlays, toasts, the parent gear (tap = kid settings, hold 3 s = PIN;
 * kid settings also has a visible 🔒 Parents button that opens the same PIN pad). */
(function () {
  'use strict';
  var SQ = window.SQ = window.SQ || {};
  var params = new URLSearchParams(location.search);
  SQ.FAST = params.get('fast') === '1';
  SQ.SEED = params.get('seed');
  SQ.subjects = { math: SQ.content.math, english: SQ.content.english, science: SQ.content.science };
  SQ.WORLD = {
    math: { name: 'Number Jungle', sub: 'Math', icon: '🐵', deco: ['🌴', '🐒', '🦜', '🍌', '🌿', '🐍', '🦋', '🌺', '🐘', '🪵'] },
    english: { name: 'Word Castle', sub: 'English', icon: '🏰', deco: ['🏰', '🐉', '👑', '📚', '🦄', '🛡️', '🌈', '✏️', '🎈', '⭐'] },
    science: { name: 'Discovery Lab', sub: 'Science', icon: '🔬', deco: ['🔬', '🧪', '🪐', '🌋', '🦋', '🧲', '🌱', '☀️', '🚀', '💡'] }
  };
  SQ.go = {};
  // The version lives in js/version.js only (bump it there; tools/build-sw.js stamps the date and sw.js).
  var GV = window.GAME_VERSION || { version: '?', built: '' };
  SQ.APP_VERSION = GV.version;
  SQ.APP_BUILT = GV.built;
  SQ.versionLabel = function () { return 'Version ' + GV.version + (GV.built ? ' (' + GV.built + ')' : ''); };

  /* ---------- state ---------- */
  SQ.persist = function () { SQ.save.persist(window.localStorage, SQ.state); };
  SQ.reload = function () { SQ.state = SQ.save.load(window.localStorage); SQ.applySettings(); };
  SQ.applySettings = function () {
    var s = SQ.state.settings;
    SQ.voiceOn = s.voiceOn;
    SQ.sound.setVolumes(s.sfxVol, s.voiceVol);
  };
  SQ.levelCount = function (subject) { return SQ.subjects[subject].levels.length; };
  SQ.enabledSubjects = function () {
    return SQ.save.SUBJECTS.filter(function (s) { return SQ.state.settings.subjects[s] !== false; });
  };

  /* ---------- tiny DOM helpers ---------- */
  SQ.h = function (tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  SQ.esc = function (s) { return SQ.art.esc(s); };
  SQ.wait = function (ms) { return new Promise(function (r) { setTimeout(r, SQ.FAST ? Math.min(ms, 60) : ms); }); };
  var lastPick = {};
  SQ.pick = function (name, list) {
    var i = Math.floor(Math.random() * list.length);
    if (list.length > 1 && i === lastPick[name]) i = (i + 1) % list.length;
    lastPick[name] = i;
    return list[i];
  };
  /** Bind a fast, reliable tap (pointer-based so it never waits for iOS's click delay). */
  SQ.tap = function (el, fn) {
    el.addEventListener('click', function (e) { fn(e); });
    return el;
  };
  SQ.btn = function (label, cls, fn) {
    var b = SQ.h('button', 'btn ' + (cls || ''), label);
    if (fn) SQ.tap(b, function (e) { SQ.sound.play('tap'); fn(e); });
    return b;
  };

  /* ---------- screens ---------- */
  var current = null;
  SQ.show = function (screen) {
    var app = document.getElementById('app');
    var old = current;
    current = screen;
    if (old) {
      if (old._cleanup) try { old._cleanup(); } catch (e) {}
      old.classList.add('leaving');
      setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, SQ.FAST ? 0 : 260);
    }
    closeAllOverlays();
    app.appendChild(screen);
    if (screen._enter) screen._enter();
    return screen;
  };
  SQ.currentScreen = function () { return current; };

  /* ---------- overlays ---------- */
  var overlays = [];
  SQ.overlay = function (content, opts) {
    opts = opts || {};
    var o = SQ.h('div', 'overlay ' + (opts.cls || ''));
    o.appendChild(content);
    var closed = false;
    var api = {
      el: o,
      close: function () {
        if (closed) return;
        closed = true;
        overlays = overlays.filter(function (x) { return x !== api; });
        if (o.parentNode) o.parentNode.removeChild(o);
        if (opts.onClose) opts.onClose();
      }
    };
    if (opts.dismiss) o.addEventListener('click', function (e) { if (e.target === o) api.close(); });
    document.getElementById('app').appendChild(o);
    overlays.push(api);
    return api;
  };
  function closeAllOverlays() { overlays.slice().forEach(function (o) { o.close(); }); }
  SQ.closeOverlays = closeAllOverlays;

  SQ.toast = function (text, cls) {
    var t = SQ.h('div', 'toast ' + (cls || ''), SQ.esc(text));
    document.getElementById('app').appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, SQ.FAST ? 300 : 1700);
  };

  /* ---------- the gear: tap = kid settings, hold 3 s = parent PIN ---------- */
  SQ.HOLD_MS = 3000;
  SQ.gear = function (opts) {
    opts = opts || {};
    var wrap = SQ.h('div', 'gear');
    var b = SQ.h('button', 'btn white round small gear-btn', '⚙️');
    b.setAttribute('aria-label', 'Settings');
    wrap.appendChild(b);
    wrap.insertAdjacentHTML('beforeend', '<svg class="gear-ring" viewBox="0 0 76 76"><circle cx="38" cy="38" r="35"/></svg>');
    var timer = 0, holding = false, fired = false;
    function down(e) {
      if (e.button !== undefined && e.button !== 0) return;
      holding = true; fired = false;
      wrap.classList.add('holding');
      timer = setTimeout(function () {
        fired = true; holding = false;
        wrap.classList.remove('holding');
        SQ.sound.play('unlock');
        if (opts.onOpen) opts.onOpen();
        SQ.openPin();
      }, SQ.HOLD_MS);
    }
    function up() {
      if (!holding) return;
      holding = false;
      clearTimeout(timer);
      wrap.classList.remove('holding');
    }
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    b.addEventListener('click', function () {
      if (fired) { fired = false; return; }
      SQ.sound.play('tap');
      if (opts.onOpen) opts.onOpen();
      SQ.kidSettings(opts.onClose);
    });
    return wrap;
  };

  SQ.kidSettings = function (onClose) {
    var s = SQ.state.settings;
    var c = SQ.h('div', 'card kid-settings');
    c.innerHTML = '<div class="ribbon">Settings</div>' +
      '<div class="slider"><span>🔔</span><input type="range" min="0" max="1" step="0.1" class="sfx-vol" aria-label="Sound volume"></div>' +
      '<div class="slider"><span>🗣️</span><input type="range" min="0" max="1" step="0.1" class="voice-vol" aria-label="Voice volume"></div>';
    var sv = c.querySelector('.sfx-vol'), vv = c.querySelector('.voice-vol');
    sv.value = s.sfxVol; vv.value = s.voiceVol;
    sv.addEventListener('input', function () { s.sfxVol = +sv.value; SQ.applySettings(); });
    sv.addEventListener('change', function () { SQ.sound.play('pop'); SQ.persist(); });
    vv.addEventListener('input', function () { s.voiceVol = +vv.value; SQ.applySettings(); });
    vv.addEventListener('change', function () { SQ.persist(); SQ.speak(SQ.LINES.praise[0]); });
    var up = SQ.h('div', 'update-row');
    var ub = SQ.btn('🔄 Update game', 'blue small update-btn', function () { SQ.updateGame(ub); });
    up.appendChild(ub);
    up.appendChild(SQ.h('div', 'update-msg'));
    c.appendChild(up);
    // a clearly visible way into parent mode (the 3-second hold on the gear still works too)
    var pb = SQ.btn('🔒 Parents', 'white small parents-btn', function () { if (ov) ov.close(); SQ.openPin(); });
    pb.setAttribute('aria-label', 'Parents');
    var prow = SQ.h('div', 'parents-row');
    prow.appendChild(pb);
    c.appendChild(prow);
    c.appendChild(SQ.h('div', 'app-version', SQ.esc(SQ.versionLabel())));
    var row = SQ.h('div', 'row');
    var ov;
    row.appendChild(SQ.btn('OK', 'green', function () { ov.close(); }));
    c.appendChild(row);
    ov = SQ.overlay(c, { dismiss: true, onClose: function () { SQ.persist(); if (onClose) onClose(); } });
    return ov;
  };

  /* ---------- updates: "Update game" button + "New version!" banner (never mid-level) ---------- */
  SQ.updater = GameUpdate.createUpdater({
    navigator: navigator,
    reload: function () { SQ.persist(); location.reload(); },
    ping: function () { return fetch('index.html', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(); }); },
    onUpdate: function () { SQ.showUpdateBanner(); }
  });
  function inLevel() { return !!document.querySelector('#app .screen.play'); }
  var bannerTimer = 0;
  SQ.showUpdateBanner = function () {
    clearInterval(bannerTimer);
    var place = function () {
      if (inLevel() || document.querySelector('.update-banner')) return !inLevel();
      var b = SQ.h('button', 'update-banner', '✨ ' + SQ.esc(GameUpdate.TEXT.banner));
      b.setAttribute('aria-label', GameUpdate.TEXT.banner);
      SQ.tap(b, function () { b.classList.add('busy'); b.textContent = GameUpdate.TEXT.updating; SQ.updater.apply(); });
      document.body.appendChild(b);
      // which version is waiting: "New version 4.2! Tap to update"
      if (SQ.updater.waitingVersion) SQ.updater.waitingVersion().then(function (v) {
        if (v && v.version && b.parentNode && !b.classList.contains('busy')) {
          var t = GameUpdate.TEXT.bannerV.replace('{v}', v.version);
          b.textContent = '✨ ' + t; b.setAttribute('aria-label', t);
        }
      });
      return true;
    };
    if (!place()) bannerTimer = setInterval(function () { if (place()) clearInterval(bannerTimer); }, 1000);
  };
  SQ.updateGame = function (btn) {
    if (btn) { btn.disabled = true; btn.classList.add('busy'); }
    return SQ.updater.check().then(function (r) {
      if (btn) { btn.disabled = false; btn.classList.remove('busy'); }
      if (r === 'updating') { if (btn) btn.textContent = GameUpdate.TEXT.updating; return r; }
      var msg = btn && btn.parentNode && btn.parentNode.querySelector('.update-msg');
      if (msg) msg.textContent = GameUpdate.TEXT[r];
      return r;
    });
  };
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') SQ.updater.poll(); });

  /* ---------- star svg ---------- */
  SQ.starSVG = function (full) {
    return '<svg viewBox="0 0 100 100"><path d="M50 6 L62 36 L95 38 L69 59 L78 92 L50 74 L22 92 L31 59 L5 38 L38 36 Z" ' +
      (full ? 'fill="#ffd23f" stroke="#e09a00"' : 'fill="rgba(0,0,0,.25)" stroke="rgba(255,255,255,.35)"') +
      ' stroke-width="5" stroke-linejoin="round"/>' + (full ? '<path d="M50 16 L58 38 L40 40 Z" fill="#fff" opacity=".55"/>' : '') + '</svg>';
  };
  SQ.starsText = function (n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += '<span class="' + (i < n ? 'on' : 'off') + '">⭐</span>';
    return s;
  };

  /* ---------- visibility (pause timers, stop speech) ---------- */
  var visHandlers = [];
  SQ.onVisibility = function (fn) { visHandlers.push(fn); return function () { visHandlers = visHandlers.filter(function (f) { return f !== fn; }); }; };
  document.addEventListener('visibilitychange', function () {
    var hidden = document.visibilityState === 'hidden';
    if (hidden) SQ.stopSpeaking();
    visHandlers.slice().forEach(function (f) { try { f(hidden); } catch (e) {} });
  });

  /* ---------- boot ---------- */
  SQ.boot = function () {
    if (SQ.FAST) document.documentElement.classList.add('fast');
    SQ.reload();
    if (!SQ.state.created) { SQ.state.created = Date.now(); }
    SQ.persist();
    // block pinch / double-tap zoom on iOS. Buttons and form fields are never blocked (CSS touch-action: manipulation
    // already stops double-tap zoom on them): cancelling a touchend there swallows the tap, so quick PIN digits
    // like 1-9-9-4 or "11" on the numpad got lost. Never touch touchmove, so every panel scrolls by finger.
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    var lastTouch = 0;
    document.addEventListener('touchend', function (e) {
      var now = Date.now();
      var safe = e.target.closest && e.target.closest('button, a, input, textarea, select, label, [role=button], .admin-body, .map-scroll, .overlay');
      if (now - lastTouch < 350 && !safe && e.cancelable) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && params.get('nosw') !== '1') {
      SQ.updater.register('sw.js').then(function () { SQ.updater.poll(); });
    }
    // after an update, say so once: "Updated to version 4.2"
    try {
      var seen = localStorage.getItem('sq-seen-version');
      if (seen && seen !== SQ.APP_VERSION) setTimeout(function () { SQ.toast(GameUpdate.TEXT.updated.replace('{v}', SQ.APP_VERSION)); }, 800);
      if (seen !== SQ.APP_VERSION) localStorage.setItem('sq-seen-version', SQ.APP_VERSION);
    } catch (e) { /* private mode */ }
    var start = params.get('start');
    var m = start && /^(math|english|science)(?::(\d+))?$/.exec(start);
    if (m && m[2] !== undefined) SQ.go.play(m[1], +m[2]);
    else if (m) SQ.go.map(m[1]);
    else SQ.go.menu(true);
  };
})();
