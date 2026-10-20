/* App shell: menu, world maps, level controller (buddy, tutorials, Show me, hints, win), settings, practice. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var h = LE.h;

  var store = LE.store = LE.save.createStore(window.localStorage);
  LE.sound.setMuted(!store.getSound());
  LE.voiceOn = store.data.settings.voice !== false;

  /** The game clock (weekly projects). Tests: ?now=2026-10-26T09:00:00Z or replace LE.now. */
  var NOW_PARAM = /[?&]now=([^&]+)/.exec(location.search);
  var NOW_OFFSET = NOW_PARAM && !isNaN(Date.parse(decodeURIComponent(NOW_PARAM[1]))) ? Date.parse(decodeURIComponent(NOW_PARAM[1])) - Date.now() : 0;
  LE.now = LE.now || function () { return new Date(Date.now() + NOW_OFFSET); };

  /* ---------- Everything the shell says (static, so every line has a pre-recorded voice clip) ---------- */
  /* VOICE-LINES:START */
  var LINES = {
    hello: ['Hi Salah! What shall we build today?', 'I love building things!', 'Tap a world to start!', 'Engineers never give up!', 'Beep boop! You are awesome!'],
    voiceOn: 'Hi Salah!',
    encourage: ['Almost! Let\'s try again!', 'So close! You can do it!', 'Good try! Let\'s fix it together.', 'Oops! Engineers try again and again!', 'Nice try! Change one thing and try again.'],
    showYou: 'Want me to show you?',
    hint: 'Here is a hint!',
    welcomeBack: 'Welcome back!',
    idle: 'Need help? Tap me and I can show you!',
    tapMe: 'Tap me for help!',
    watch: 'Watch me! 👀',
    nowYou: 'See? Now you try!',
    tapGo: { Go: 'Your turn! Tap Go! ▶', Play: 'Your turn! Tap Play! ▶' },
    praise: ['Hooray! You did it!', 'Awesome job, Salah!', 'Wow! Super engineer!', 'You are amazing!'],
    didYouKnow: 'Did you know? ',
    weeklyLocked: 'This project is not open yet. Come back next week!',
    weeklyStepLocked: 'Finish the step before this one first!',
    helperOffline: 'I can\'t reach the helper right now. Here is a hint!',
    helperMic: 'The helper needs the microphone to hear you. Here is a hint!',
    helperBye: 'Bye, helper! Back to building!',
    showMeReady: 'Stuck? Now I can show you how!',
    showMeLater: 'Let\'s try a hint first!',
    demoGo: { Go: 'Now we press Go!', Play: 'Now we press Play!' },
    demoWorks: 'See? It works!',
    demoYourTurn: 'Now it is your turn. Build it yourself!',
    aiYourTurn: 'Your turn! Now you do the steps the helper showed you.',
    /* one short line per demo step (only when the line changes), by world and pointer key */
    demo: {
      robot: { 'tray:F': 'Forward!', 'tray:L': 'Turn left!', 'tray:R': 'Turn right!' },
      bridges: { node: 'A beam from bolt to bolt.', 'tool:wood': 'Pick wood.' },
      circuits: { 'tray:I': 'A straight wire goes here.', 'tray:C': 'A corner wire goes here.', 'tray:T': 'A T wire goes here.',
        'tray:X': 'A cross wire goes here.', 'tray:P': 'A lamp goes here.', 'tray:B': 'A battery goes here.' },
      construction: { 'btn:U': 'Up!', 'btn:D': 'Down!', 'btn:L': 'Left!', 'btn:R': 'Right!', 'btn:G': 'Tap the hook button!',
        'tray:found': 'The foundation first!', 'tray:walls': 'Now the walls.', 'tray:window': 'A window.', 'tray:door': 'The door.',
        'tray:roof': 'The roof goes on last!' }
    }
  };
  /* VOICE-LINES:END */
  LE.LINES = LINES;
  function tipLine(tip) { return LE.voiceKey.tipLine(tip.title, tip.text); }
  function factLine(fact) { return LINES.didYouKnow + fact; }
  LE.tipLine = tipLine;
  LE.factLine = factLine;

  /* ---------- Worlds ---------- */
  var WORLD_META = [
    { id: 'bridges', name: 'Bridges', sub: 'Build it strong!' },
    { id: 'machines', name: 'Machines', sub: 'Gears & ramps' },
    { id: 'circuits', name: 'Circuits', sub: 'Light it up!' },
    { id: 'robot', name: 'Robot Coder', sub: 'Code a robot' },
    { id: 'construction', name: 'Construction', sub: 'Dig, lift & build!' }
  ];
  function world(id) {
    var meta = WORLD_META.filter(function (w) { return w.id === id; })[0];
    return {
      id: id, name: meta.name, sub: meta.sub,
      levels: (LE.levels && LE.levels[id]) || [],
      content: (LE.content && LE.content[id]) || { tips: {}, facts: [] },
      view: LE.views && LE.views[id]
    };
  }
  LE.world = world;

  LE.worldIcon = function (id) {
    var icons = {
      bridges: '<svg viewBox="0 0 120 90"><defs><linearGradient id="wiw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ad1ff"/><stop offset="1" stop-color="#1d8fd6"/></linearGradient></defs>' +
        '<rect x="0" y="62" width="120" height="28" rx="6" fill="url(#wiw)"/><path d="M0 70 q10 -5 20 0 t20 0 t20 0 t20 0 t20 0 t20 0" fill="none" stroke="#b9ecff" stroke-width="3"/>' +
        '<path d="M0 40 h22 v50 h-22z M98 40 h22 v50 h-22z" fill="#a8743f" stroke="#6b4420" stroke-width="3"/><rect x="0" y="36" width="22" height="8" fill="#5cc75a"/><rect x="98" y="36" width="22" height="8" fill="#5cc75a"/>' +
        '<g stroke="#ff8a1c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"><path d="M22 40 L98 40"/><path d="M22 40 L41 20 L60 40 L79 20 L98 40"/><path d="M41 20 L79 20"/></g>' +
        '<g fill="#fff" stroke="#6b4420" stroke-width="2"><circle cx="22" cy="40" r="4"/><circle cx="41" cy="20" r="4"/><circle cx="60" cy="40" r="4"/><circle cx="79" cy="20" r="4"/><circle cx="98" cy="40" r="4"/></g>' +
        '<g transform="translate(50 26)"><rect x="0" y="2" width="22" height="9" rx="4" fill="#ff4f6d" stroke="#8a1c33" stroke-width="2"/><rect x="5" y="-3" width="11" height="7" rx="3" fill="#bfe9ff" stroke="#8a1c33" stroke-width="2"/><circle cx="5" cy="12" r="3.5" fill="#333"/><circle cx="17" cy="12" r="3.5" fill="#333"/></g></svg>',
      machines: '<svg viewBox="0 0 120 90">' + gearPath(42, 46, 26, 10, '#ffc83d', '#b07a00', 'spin') + gearPath(82, 34, 17, 8, '#ff7a59', '#a3361d', 'spin-rev') +
        '<path d="M70 70 L112 82 L70 82 Z" fill="#8bd16a" stroke="#3f7a26" stroke-width="3" stroke-linejoin="round"/><circle cx="84" cy="66" r="7" fill="#3d8bff" stroke="#1d4f99" stroke-width="3"/></svg>',
      circuits: '<svg viewBox="0 0 120 90"><defs><radialGradient id="wig"><stop offset="0" stop-color="#fff9c4"/><stop offset=".6" stop-color="#ffe14d" stop-opacity=".7"/><stop offset="1" stop-color="#ffe14d" stop-opacity="0"/></radialGradient></defs>' +
        '<circle cx="60" cy="38" r="36" fill="url(#wig)"/><path d="M44 36 a16 16 0 1 1 32 0 c0 8 -6 12 -7 20 h-18 c-1 -8 -7 -12 -7 -20z" fill="#ffe14d" stroke="#b38f00" stroke-width="3"/>' +
        '<rect x="51" y="57" width="18" height="12" rx="3" fill="#9aa6b8" stroke="#56627a" stroke-width="3"/><path d="M56 44 l4 -8 l4 8" fill="none" stroke="#b38f00" stroke-width="3"/>' +
        '<path d="M60 69 v8 h-44 v-40 h10 M60 77 h44 v-40 h-10" fill="none" stroke="#3dd6ff" stroke-width="4" stroke-linecap="round"/>' +
        '<rect x="8" y="50" width="16" height="22" rx="3" fill="#33d17a" stroke="#137a44" stroke-width="3"/><rect x="12" y="46" width="8" height="5" fill="#137a44"/></svg>',
      robot: '<svg viewBox="0 0 120 90"><rect x="6" y="64" width="26" height="18" rx="6" fill="#33b864" stroke="#1d7a3f" stroke-width="3"/><path d="M19 68 v10 M14 72 l5 -5 l5 5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<rect x="36" y="64" width="26" height="18" rx="6" fill="#3d8bff" stroke="#1d4f99" stroke-width="3"/><path d="M43 76 a7 7 0 1 1 10 -2 M53 74 l3 -6 l-7 0" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>' +
        '<rect x="66" y="64" width="26" height="18" rx="6" fill="#ff9f1c" stroke="#b56a00" stroke-width="3"/><text x="79" y="79" font-size="14" font-weight="900" text-anchor="middle" fill="#fff">3x</text>' +
        '<g transform="translate(60 6)"><line x1="0" y1="0" x2="0" y2="10" stroke="#5b3fbf" stroke-width="3"/><circle cx="0" cy="2" r="4" fill="#ffe14d"/><rect x="-22" y="10" width="44" height="36" rx="12" fill="#b38bff" stroke="#5b3fbf" stroke-width="3"/>' +
        '<rect x="-15" y="17" width="30" height="20" rx="7" fill="#2a1f5c"/><circle cx="-7" cy="27" r="4" fill="#7ff3ff"/><circle cx="7" cy="27" r="4" fill="#7ff3ff"/></g></svg>',
      construction: '<svg viewBox="0 0 120 90"><path d="M0 74 q30 -10 60 0 t60 0 v16 h-120z" fill="#b8793e" stroke="#7a4a1e" stroke-width="3"/>' +
        '<path d="M4 76 q10 -14 22 0z" fill="#9a6230" stroke="#7a4a1e" stroke-width="2.5"/>' +
        '<g transform="translate(58 34)"><rect x="0" y="12" width="40" height="18" rx="5" fill="#ffc21a" stroke="#a36b00" stroke-width="3"/><rect x="18" y="0" width="18" height="16" rx="4" fill="#ffc21a" stroke="#a36b00" stroke-width="3"/><rect x="22" y="4" width="10" height="8" rx="2" fill="#bfe9ff"/>' +
        '<rect x="-2" y="30" width="44" height="12" rx="6" fill="#3a3a48" stroke="#1d1d26" stroke-width="2.5"/><circle cx="6" cy="36" r="3.5" fill="#888"/><circle cx="20" cy="36" r="3.5" fill="#888"/><circle cx="34" cy="36" r="3.5" fill="#888"/>' +
        '<path d="M0 22 L-14 22 L-18 40 L-4 40z" fill="#c9cdd6" stroke="#5a5f6e" stroke-width="3" stroke-linejoin="round"/></g>' +
        '<g stroke="#ff8a1c" stroke-width="3" fill="none"><path d="M20 70 V8 H60"/><path d="M20 8 L28 16 M28 8 L36 16 M36 8 L44 16 M44 8 L52 16"/></g><line x1="52" y1="8" x2="52" y2="30" stroke="#333" stroke-width="2"/>' +
        '<rect x="44" y="30" width="16" height="9" rx="2" fill="#ff4f6d" stroke="#8a1c33" stroke-width="2.5"/></svg>',
      practice: '<svg viewBox="0 0 120 90"><rect x="10" y="10" width="100" height="70" rx="12" fill="#5ac46c" stroke="#2e7a3b" stroke-width="3"/>' +
        '<g stroke="rgba(255,255,255,.35)" stroke-width="2"><path d="M30 10 v70 M50 10 v70 M70 10 v70 M90 10 v70 M10 30 h100 M10 50 h100 M10 70 h100"/></g>' +
        '<g transform="translate(40 40)"><rect x="-12" y="-12" width="24" height="24" rx="7" fill="#b38bff" stroke="#5b3fbf" stroke-width="3"/><circle cx="-4" cy="-2" r="3" fill="#fff"/><circle cx="4" cy="-2" r="3" fill="#fff"/></g>' +
        '<path d="M80 26 l4 9 10 1 -7 7 2 10 -9 -5 -9 5 2 -10 -7 -7 10 -1z" fill="#ffe14d" stroke="#b38f00" stroke-width="2.5"/></svg>'
    };
    return icons[id] || '';
  };
  function gearPath(cx, cy, r, teeth, fill, stroke, cls) {
    var d = '', n = teeth * 2;
    for (var i = 0; i < n; i++) {
      var a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      var rr = i % 2 ? r * 0.78 : r;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a0) * rr).toFixed(1) + ' ' + (cy + Math.sin(a0) * rr).toFixed(1) +
        'L' + (cx + Math.cos(a1) * rr).toFixed(1) + ' ' + (cy + Math.sin(a1) * rr).toFixed(1);
    }
    return '<g class="' + cls + '" style="transform-origin:' + cx + 'px ' + cy + 'px"><path d="' + d + 'Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="3" stroke-linejoin="round"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + (r * 0.3) + '" fill="#fff" stroke="' + stroke + '" stroke-width="3"/></g>';
  }
  LE.gearPath = gearPath;

  /* ---------- Screen management ---------- */
  var app = document.getElementById('app');
  var current = null;   // { el, destroy }
  function show(screen) {
    var old = current;
    current = screen;
    screen.el.classList.add('screen', 'enter');
    app.appendChild(screen.el);
    requestAnimationFrame(function () { screen.el.classList.remove('enter'); });
    if (old) {
      if (old.destroy) old.destroy();
      old.el.classList.add('leave');
      setTimeout(function () { old.el.remove(); }, 300);
    }
    LE.hand.hide();
    LE.stopSpeaking();
    closeOverlay();
  }
  LE.currentScreen = function () { return current; };

  /* ---------- Overlays ---------- */
  var overlay = null;
  function openOverlay(content, cls) {
    closeOverlay();
    overlay = h('div.overlay' + (cls ? '.' + cls : ''), h('div.overlay-card', content));
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay && overlay.classList.add('show'); });
    return overlay;
  }
  function closeOverlay() {
    if (!overlay) return;
    var o = overlay;
    overlay = null;
    o.classList.remove('show');
    setTimeout(function () { o.remove(); }, 250);
  }
  LE.openOverlay = openOverlay;
  LE.closeOverlay = closeOverlay;
  LE.hasOverlay = function () { return !!overlay; };

  function confirmDialog(text, yesLabel, onYes) {
    openOverlay([
      h('div.dialog-icon', { html: '⚠️' }),
      h('h2', text),
      h('div.row', LE.button('red big', yesLabel, function () { closeOverlay(); onYes(); }), LE.button('blue big', 'No', closeOverlay))
    ], 'confirm');
  }

  /** Short friendly message at the bottom of the screen. */
  function toast(text) {
    var t = h('div.kid-toast', text);
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 300); }, LE.FAST ? 900 : 3200);
  }
  LE.toast = toast;

  /* ---------- Ask Helper: talk to the helper by voice (ElevenLabs agent; hints only) ---------- */
  var MIC_SVG = '<svg viewBox="0 0 24 24"><rect x="8.5" y="2.5" width="7" height="12" rx="3.5" fill="currentColor"/><path d="M5 11.5a7 7 0 0 0 14 0M12 18.5v3M8.5 21.5h7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  /** opts: { world, level, weekly, buddy, onClose, vars?, clientTools?, onSession? }
   *  A compact call bar sits over the top bar so the board stays visible while the helper shows things on it.
   *  onClose(reason) returning true means the level handles the goodbye (the "Your turn!" after a demo). */
  function askHelper(opts) {
    var level = opts.level, buddy = opts.buddy;
    var callBar = null;
    function removeBar() {
      if (!callBar) return;
      var b = callBar; callBar = null;
      b.classList.remove('show');
      setTimeout(function () { b.remove(); }, 250);
    }
    function fallback(reason) {
      removeBar();
      var line = reason === 'mic' ? LINES.helperMic : LINES.helperOffline;
      toast(reason === 'mic' ? '🎤 The microphone is off — here is a hint instead!'
        : reason === 'blocked' ? '🙈 The helper is not allowed here — here is a hint!'
        : reason === 'busy' ? '😴 The helper is resting — here is a hint instead!'
        : '📶 No helper right now — here is a hint instead!');
      if (level.hint) buddy.say(line + ' ' + level.hint, { speakParts: [line, level.hint] });
      else buddy.say(level.goal);
    }
    function notify(reason) { return opts.onClose ? opts.onClose(reason) : false; }
    if (!store.getHelper()) return;
    if (!navigator.onLine || !LE.helperTalk) { notify('fallback'); fallback('offline'); return; }
    LE.stopSpeaking();
    LE.hand.hide();
    var status = h('div.helper-status', 'Calling the helper… 📞');
    var timer = h('div.helper-timer', '');
    var face = h('div.helper-face.connecting', { html: LE.buddySVG() });
    var session = null, t0 = 0, tick = 0, closed = false;
    var endBtn = LE.button('red helper-end', 'End ⏹', function () { finish(true); }, { label: 'End talking' });
    callBar = h('div.helper-call', { role: 'dialog', 'aria-label': 'Talking to the helper' }, face, h('div.helper-mid', status, timer), endBtn);
    document.body.appendChild(callBar);
    void callBar.offsetWidth;
    callBar.classList.add('show');
    function onHidden() { if (document.hidden) finish(false); }
    document.addEventListener('visibilitychange', onHidden);
    function finish(byKid) {
      if (closed) return;
      closed = true;
      document.removeEventListener('visibilitychange', onHidden);
      clearInterval(tick);
      if (session) session.end('kid'); else LE.helperTalk.stop();
      removeBar();
      var handled = notify(byKid ? 'kid' : 'ended');
      if (!handled && (byKid || session)) buddy.say(LINES.helperBye, { time: 2500 });
    }
    function failed(reason) {
      closed = true;
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onHidden);
      notify('fallback');
      fallback(reason);
    }
    LE.helperTalk.start({
      vars: opts.vars || LE.helperTalk.buildVars({ world: opts.world, level: level, weekly: opts.weekly }),
      clientTools: opts.clientTools,
      onState: function (st) {
        if (closed) return;
        face.className = 'helper-face ' + st;
        status.textContent = st === 'speaking' ? 'Helper is talking… 🗣️' : st === 'listening' ? 'Listening… 👂 Talk to me!' : 'Calling the helper… 📞';
        if ((st === 'listening' || st === 'speaking') && !t0) {
          t0 = Date.now();
          tick = setInterval(function () {
            var left = Math.max(0, LE.helperTalk.MAX_SECONDS - Math.floor((Date.now() - t0) / 1000));
            timer.textContent = Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2) + ' left';
          }, 500);
        }
      },
      onEnd: function (reason) {
        if (closed) return;
        if (reason === 'dropped') { failed('busy'); return; }   // the agent hung up without a word → hint instead
        finish(false);
      }
    }).then(function (s) {
      session = s;
      if (closed) { s.end('kid'); return; }
      if (opts.onSession) opts.onSession(s);
    }).catch(function (e) {
      if (closed || e.reason === 'cancelled') return;
      console.warn('Ask Helper unavailable:', e.reason, e.error && (e.error.message || e.error));
      failed(e.reason);
    });
    return { end: function () { finish(false); } };
  }
  LE.askHelper = askHelper;

  /* ---------- Game updates (js/core/updater.js) ---------- */
  var updateBanner = null;
  function showUpdateBanner() {
    if (updateBanner) return;
    var close = h('button.update-x', { 'aria-label': 'Later' }, '✕');
    updateBanner = h('div.update-banner', { role: 'button' }, h('span', '✨ ' + LE.UPDATE_MSG.banner), close);
    updateBanner.addEventListener('click', function (e) {
      if (e.target === close) { updateBanner.remove(); updateBanner = null; return; }
      LE.sound.play('pop');
      updateBanner.querySelector('span').textContent = LE.UPDATE_MSG.updating;
      if (!LE.updater.applyUpdate()) { updateBanner.remove(); updateBanner = null; }
    });
    document.body.appendChild(updateBanner);
  }
  LE.updater = LE.createUpdater({
    navigator: navigator, document: document,
    reload: function () { location.reload(); },
    beforeReload: function () { try { store.save(); } catch (e) { /* already saved */ } },
    onBanner: showUpdateBanner
  });
  LE.showUpdateBanner = showUpdateBanner;
  function updateGame() {
    var btn = document.querySelector('.update-btn');
    if (btn) btn.classList.add('busy');
    return LE.updater.manualUpdate().then(function (r) {
      if (btn) btn.classList.remove('busy');
      toast(LE.UPDATE_MSG[r] || LE.UPDATE_MSG.latest);
      return r;
    });
  }
  LE.updateGame = updateGame;

  function openSettings() {
    var soundBtn, voiceBtn;
    function refresh() {
      soundBtn.innerHTML = (store.getSound() ? '🔊 Sound: ON' : '🔇 Sound: OFF');
      soundBtn.classList.toggle('off', !store.getSound());
      voiceBtn.innerHTML = (LE.voiceOn ? '🗣️ Read aloud: ON' : '🤐 Read aloud: OFF');
      voiceBtn.classList.toggle('off', !LE.voiceOn);
    }
    soundBtn = LE.button('green big wide', '', function () {
      store.setSound(!store.getSound()); LE.sound.setMuted(!store.getSound()); LE.sound.play('pop'); refresh();
    });
    voiceBtn = LE.button('purple big wide', '', function () {
      LE.voiceOn = !LE.voiceOn; store.data.settings.voice = LE.voiceOn; store.save(); refresh();
      if (LE.voiceOn) LE.speak(LINES.voiceOn); else LE.stopSpeaking();
    });
    refresh();
    openOverlay([
      h('h2', '⚙️ Settings'),
      soundBtn, voiceBtn,
      LE.button('blue wide update-btn', '🔄 Update game', function () { updateGame(); }, { label: 'Update game' }),
      LE.button('red wide', '🗑️ Reset progress', function () {
        confirmDialog('Start over? All stars will be erased.', 'Yes, reset', function () {
          store.reset(); LE.sound.play('whoosh'); showMenu();
        });
      }),
      LE.button('white wide parents-btn', '🔒 Parents', function () { LE.sound.play('open'); LE.parent.openPin(); }, { label: 'Parents', sound: false }),
      LE.button('blue big wide', 'Done', closeOverlay),
      h('div.app-version', 'Version ' + LE.APP_VERSION)
    ], 'settings');
  }

  /** The menu gear: short tap = kid settings; hold 3 s (a ring fills up) = parent PIN pad. */
  LE.APP_VERSION = '3.0';
  LE.HOLD_MS = 3000;
  LE.HOLD_MOVE_PX = 40;
  /** Backup way into parent mode: tap a plain visible element (menu title, star counter) 5 times within 3 s. */
  LE.TAP5_MS = 3000;
  function fiveTaps(el) {
    var taps = [];
    el.addEventListener('click', function () {
      var t = Date.now();
      taps = taps.filter(function (x) { return t - x < LE.TAP5_MS; });
      taps.push(t);
      if (taps.length >= 5) { taps = []; LE.sound.play('open'); LE.parent.openPin(); }
    });
    el.classList.add('tap5');
    return el;
  }
  LE.fiveTaps = fiveTaps;
  function gearButton() {
    var fired = false, timer = 0, holding = false;
    var b = LE.button('icon settings-btn', '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>', function () {
      if (fired) { fired = false; return; }
      LE.sound.play('tap');
      openSettings();
    }, { label: 'Settings', sound: false });
    var wrap = h('div.gear', b);
    wrap.insertAdjacentHTML('beforeend', '<svg class="gear-ring" viewBox="0 0 76 76"><circle cx="38" cy="38" r="35"/></svg>');
    // Real iPhones cancel a pointer-event long-press (pointercancel / pointerleave while the pressed button scales),
    // so touch uses touchstart / touchmove (40 px tolerance) / touchend; the mouse keeps pointer events.
    var sx = 0, sy = 0, lastTouch = 0;
    function start() {
      holding = true; fired = false;
      wrap.classList.add('holding');
      clearTimeout(timer);
      timer = setTimeout(function () {
        fired = true; holding = false;
        wrap.classList.remove('holding');
        LE.sound.play('open');
        LE.parent.openPin();
      }, LE.HOLD_MS);
    }
    function cancel() {
      if (!holding) return;
      holding = false;
      clearTimeout(timer);
      wrap.classList.remove('holding');
    }
    b.addEventListener('touchstart', function (e) {
      lastTouch = Date.now();
      var t = e.touches[0]; sx = t.clientX; sy = t.clientY;
      start();
    }, { passive: true });
    b.addEventListener('touchmove', function (e) {
      var t = e.touches[0];
      if (t && Math.hypot(t.clientX - sx, t.clientY - sy) > LE.HOLD_MOVE_PX) cancel();
    }, { passive: true });
    b.addEventListener('touchend', function (e) {
      lastTouch = Date.now();
      if (fired && e.cancelable) e.preventDefault();   // no kid-settings click after a long press
      cancel();
    });
    b.addEventListener('touchcancel', cancel);
    b.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || Date.now() - lastTouch < 800) return;
      if (e.button !== 0) return;
      start();
    });
    ['pointerup', 'pointerleave'].forEach(function (ev) {
      b.addEventListener(ev, function (e) { if (e.pointerType === 'mouse') cancel(); });
    });
    return wrap;
  }

  function topbar(title, onBack, extra) {
    return h('div.topbar',
      onBack ? LE.button('icon back', '<svg viewBox="0 0 24 24"><path d="M15 4 L7 12 L15 20" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>', onBack, { label: 'Back' }) : h('div.icon-spacer'),
      h('div.topbar-title', title),
      extra || h('div.icon-spacer'));
  }

  /* ---------- Main menu ---------- */
  function showMenu() {
    store.setLast({ screen: 'menu' });
    var el = h('div.menu-screen');
    var buddyWrap = h('div.menu-buddy', { html: LE.buddySVG() });
    var hello = h('div.menu-bubble', LINES.hello[0]);
    LE.voice.prefetchGroup('common');
    var grid = h('div.world-grid');
    WORLD_META.forEach(function (m) {
      var w = world(m.id);
      var total = w.levels.length * 3, got = store.totalStars(m.id);
      var card = LE.button('world-card w-' + m.id, '', function () { showMap(m.id); }, { label: m.name });
      var nameEl = h('div.world-name', m.name), starsEl = h('div.world-stars', { html: LE.starSVG(true) + '<span>' + got + ' / ' + total + '</span>' });
      card.append(h('div.world-icon', { html: LE.worldIcon(m.id) }));
      if (m.id === 'construction') card.append(h('div.cn-menu-text', nameEl, starsEl));
      else card.append(nameEl, starsEl);
      card.dataset.world = m.id;
      grid.appendChild(card);
    });
    var weeklyCard = LE.weeklyHub ? LE.weeklyHub.menuCard() : null;
    // Car Builder & Race (took the Practice Room's slot)
    var carsBtn = LE.button('car-btn', '', function () { showCars(); }, { label: 'Car Builder & Race' });
    carsBtn.append(h('div.car-icon', '🏎️'), h('div', h('div.car-title', 'Car Builder & Race'), h('div.car-sub', 'Build a car, then race it!')));
    var settings = gearButton();
    el.append(
      h('div.menu-sky', h('div.cloud.c1'), h('div.cloud.c2'), h('div.cloud.c3')),
      h('div.menu-top', h('div.icon-spacer'), settings),
      fiveTaps(h('div.menu-title', h('div.t1', "Salah's"), h('div.t2', 'Little Engineer'))),
      h('div.menu-hero', buddyWrap, hello),
      weeklyCard,
      grid,
      carsBtn
    );
    buddyWrap.addEventListener('click', function () {
      LE.sound.play('pop');
      buddyWrap.classList.remove('waving'); void buddyWrap.offsetWidth; buddyWrap.classList.add('waving');
      var lines = LINES.hello;
      hello.textContent = lines[Math.floor(Math.random() * lines.length)];
      LE.speak(hello.textContent);
    });
    show({ el: el });
  }

  /* ---------- World map ---------- */
  function showMap(worldId) {
    var w = world(worldId);
    store.setLast({ screen: 'map', world: worldId });
    var el = h('div.map-screen.theme-' + worldId);
    var extra = null;
    var scroller = h('div.map-scroll');
    var inner = h('div.map-inner');
    scroller.appendChild(inner);
    var got = store.totalStars(worldId);
    el.append(
      topbar(h('span', h('span', w.name), fiveTaps(h('span.topbar-stars', { html: LE.starSVG(true) + got + '/' + (w.levels.length * 3) }))), showMenu, extra),
      scroller
    );
    show({ el: el });

    // Layout: snake path, 3 nodes per row.
    var n = w.levels.length;
    var cols = 3, rowH = 128;
    var width = Math.min(scroller.clientWidth || 360, 520);
    var rows = Math.ceil(n / cols);
    var top0 = 92;   // room above row 1 for the buddy standing on the current node
    var height = rows * rowH + top0 - 24;
    inner.style.height = height + 'px';
    inner.style.width = width + 'px';
    var pts = [];
    for (var i = 0; i < n; i++) {
      var r = Math.floor(i / cols), c = i % cols;
      if (r % 2) c = cols - 1 - c;
      var x = width * (0.18 + c * 0.32) + (r % 2 ? -6 : 6);
      var y = top0 + r * rowH + (c === 1 ? 14 : 0);
      pts.push({ x: x, y: y });
    }
    var d = '';
    pts.forEach(function (p, i) {
      if (!i) { d += 'M' + p.x + ' ' + p.y; return; }
      var q = pts[i - 1];
      if (Math.abs(q.y - p.y) > 40) {
        var side = p.x > width / 2 ? 1 : -1;
        d += ' C' + (q.x + side * 70) + ' ' + q.y + ' ' + (p.x + side * 70) + ' ' + p.y + ' ' + p.x + ' ' + p.y;
      } else d += ' Q' + ((q.x + p.x) / 2) + ' ' + (Math.min(q.y, p.y) - 26) + ' ' + p.x + ' ' + p.y;
    });
    var svg = '<svg class="map-path" width="' + width + '" height="' + height + '"><path d="' + d + '" class="road-base"/><path d="' + d + '" class="road-line"/></svg>';
    inner.insertAdjacentHTML('beforeend', svg);
    var nextIdx = store.nextLevel(worldId, n);
    var currentNode = null;
    w.levels.forEach(function (lv, i) {
      var unlocked = store.isUnlocked(worldId, i);
      var stars = store.getStars(worldId, i);
      var node = LE.button('level-node' + (unlocked ? '' : ' locked') + (i === nextIdx && unlocked ? ' current' : '') + (stars ? ' done' : ''), '', function () {
        if (!unlocked) { LE.shake(node); LE.sound.play('buzz'); return; }
        openLevel(worldId, i);
      }, { label: 'Level ' + (i + 1), sound: unlocked ? 'tap' : false });
      node.style.left = pts[i].x + 'px';
      node.style.top = pts[i].y + 'px';
      node.dataset.level = i;
      [
        h('div.ln-num', unlocked ? String(i + 1) : ''),
        unlocked ? null : h('div.ln-lock', { html: '<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="3" fill="#fff"/><path d="M8 10 V7 a4 4 0 0 1 8 0 V10" fill="none" stroke="#fff" stroke-width="3"/></svg>' }),
        unlocked ? LE.starsRow(stars, 3, 'ln-stars') : null,
        h('div.ln-name', lv.name)
      ].forEach(function (c) { if (c) node.appendChild(c); });
      if (i === nextIdx && unlocked) {
        currentNode = node;
        node.appendChild(h('div.ln-buddy', { html: LE.buddySVG() }));
      }
      inner.appendChild(node);
    });
    if (currentNode) {
      var top = parseFloat(currentNode.style.top) - scroller.clientHeight / 2;
      scroller.scrollTop = Math.max(0, top);
    }
  }

  /* ---------- Tip card ---------- */
  function showTip(tip) {
    return new Promise(function (resolve) {
      LE.sound.play('open');
      openOverlay([
        h('div.tip-badge', 'New idea!'),
        h('h2', tip.title),
        h('div.tip-pic', { html: tip.pic || '' }),
        h('p.tip-text', tip.text),
        LE.button('green big wide', 'Got it! 👍', function () { closeOverlay(); resolve(); })
      ], 'tip');
      LE.speak(tipLine(tip));
    });
  }

  /* ---------- Level controller ---------- */
  var ENCOURAGE = LINES.encourage;

  /** Fetch/decode the voice clips this level will need (runtime-captured group + the level's own lines). */
  function prefetchLevel(w, spec) {
    var level = spec.level;
    var lines = [level.goal, level.hint, LINES.watch, LINES.welcomeBack].concat(LINES.praise, LINES.encourage);
    if (spec.story) lines.push(spec.story);
    (level.tutorial || []).forEach(function (s) { if (s.say) lines.push(s.say); });
    var tip = level.tip && w.content.tips && w.content.tips[level.tip];
    if (tip) lines.push(tipLine(tip));
    var facts = w.content.facts || [];
    if (facts.length) lines.push(factLine(facts[spec.factIndex % facts.length]));
    LE.voice.prefetch(lines);
    if (spec.group) LE.voice.prefetchGroup(spec.group);
  }

  /** Open level `index` of a world (map levels). */
  function openLevel(worldId, index, opts) {
    opts = opts || {};
    var w = world(worldId);
    var level = w.levels[index];
    if (!level || !w.view) { showMap(worldId); return; }
    var hasNext = index + 1 < w.levels.length;
    playLevel({
      worldId: worldId, index: index, level: level, num: String(index + 1),
      best: store.getStars(worldId, index), factIndex: index, group: worldId + ':' + index,
      saved: opts.fresh ? null : store.getInProgress(worldId, index),
      saveState: function (st) { store.setInProgress(worldId, index, st); },
      setLast: function () { store.setLast({ screen: 'level', world: worldId, level: index }); },
      back: function () { showMap(worldId); },
      replay: function () { openLevel(worldId, index, { fresh: true }); },
      record: function (stars) {
        store.setStars(worldId, index, stars);
        store.clearInProgress(worldId, index);
        store.setLast(hasNext ? { screen: 'level', world: worldId, level: index + 1 } : { screen: 'map', world: worldId });
        return {
          hasNext: hasNext, title: hasNext ? null : 'World complete!',
          nextLabel: hasNext ? 'Next ▶' : 'Map 🗺️',
          next: function () { if (hasNext) openLevel(worldId, index + 1); else showMap(worldId); },
          map: hasNext ? { label: '🗺️ Map', go: function () { showMap(worldId); } } : null
        };
      }
    });
  }
  LE.openLevel = openLevel;

  /* ---------- Weekly Big Project ---------- */
  function weeklyProject(pid) { return (LE.weeklyProjects || []).filter(function (p) { return p.id === pid; })[0] || null; }
  function showWeeklyHub(pid, opts) { LE.weeklyHub.show(pid, opts); }
  function showWeekly() { LE.weeklyHub.show(null); }

  /** Open step k of a weekly project (a normal level of its world, with the project's story). */
  function openWeeklyStep(pid, k, opts) {
    opts = opts || {};
    var p = weeklyProject(pid), W = LE.logic.weekly;
    if (!p || !p.steps[k]) { showWeekly(); return; }
    var step = p.steps[k], w = world(step.world);
    var level;
    try { level = W.resolveStep(p, k, LE.levels); } catch (e) { console.warn(e); showWeeklyHub(pid); return; }
    var ids = p.steps.map(function (s) { return s.id; });
    var key = 'wk-' + p.id;
    playLevel({
      worldId: step.world, index: k, level: level, num: p.icon + (k + 1), weekly: { project: p.id, step: step.id, index: k, title: p.title, count: p.steps.length },
      best: store.getStepStars(p.id, step.id), factIndex: p.weekIndex * 7 + k * 3, group: 'weekly:' + p.id + ':' + k,
      story: step.say,
      saved: opts.fresh ? null : store.getInProgress(key, k),
      saveState: function (st) { store.setInProgress(key, k, st); },
      setLast: function () { store.setLast({ screen: 'weekly-step', project: p.id, step: k }); },
      back: function () { showWeeklyHub(p.id); },
      replay: function () { openWeeklyStep(p.id, k, { fresh: true }); },
      record: function (stars) {
        var wasDone = store.projectProgress(p.id).done;
        var prog = store.setStepStars(p.id, step.id, stars, ids);
        store.clearInProgress(key, k);
        var finished = prog.done && !wasDone;
        var hasNext = k + 1 < p.steps.length;
        store.setLast(hasNext && !prog.done ? { screen: 'weekly-step', project: p.id, step: k + 1 } : { screen: 'weekly', project: p.id });
        return {
          hasNext: hasNext && !finished, title: finished ? 'Project complete!' : null, finished: finished,
          nextLabel: hasNext && !finished ? 'Next step ▶' : '🏆 Project',
          next: function () { if (hasNext && !finished) openWeeklyStep(p.id, k + 1); else showWeeklyHub(p.id, { celebrate: finished }); },
          map: hasNext && !finished ? { label: '📋 Project', go: function () { showWeeklyHub(p.id); } } : null
        };
      }
    });
  }

  /* spec: { worldId, index, level, num, best, factIndex, group, story?, weekly?, saved, saveState(st), setLast(), back(),
   *         replay(), record(stars) -> { hasNext, title, nextLabel, next(), map: { label, go } | null } } */
  function playLevel(spec) {
    var worldId = spec.worldId, index = spec.index, level = spec.level;
    var w = world(worldId);
    spec.setLast();

    var el = h('div.level-screen.theme-' + worldId + (spec.weekly ? '.weekly-level' : ''));
    var best = spec.best;
    var title = h('span.lvl-title', h('span.lvl-num', spec.num), h('span', level.name));
    var restartBtn = LE.button('icon restart', '<svg viewBox="0 0 24 24"><path d="M5 12 a7 7 0 1 0 2.2 -5.1" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M4 3 v5 h5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>', function () {
      confirmDialog('Start this level again?', 'Yes', function () { inst.reset(); attempts = 0; });
    }, { label: 'Restart level' });
    var helperOn = store.getHelper() && !!LE.helperTalk;
    var helperSession = null;
    function openHelper() {
      if (demoRunning || helperSession || ai) return;
      var weekly = spec.weekly ? { title: spec.weekly.title, stepTitle: level.name, index: spec.weekly.index, count: spec.weekly.count } : null;
      var demoApi = aiBegin();
      var cv = demoApi ? demoApi.vars() : {};
      helperSession = askHelper({ world: worldId, level: level, buddy: buddy, weekly: weekly,
        vars: LE.helperTalk ? LE.helperTalk.buildVars({ world: worldId, level: level, weekly: weekly, board: cv.board, steps: cv.steps, targets: cv.targets }) : null,
        clientTools: demoApi ? demoApi.tools : null,
        onSession: function (s) { if (ai) { ai.session = s; ai.sendNow(); } },
        onClose: function (reason) { helperSession = null; lastActivity = Date.now(); return aiEnd(reason); } }) || null;
      if (!helperSession && ai) aiEnd('fallback');
    }

    /* ---------- The helper shows things on his board (js/core/ai-demo.js) ----------
     * At call start the board is snapshotted; nothing is saved while the helper demonstrates (saveState only tracks
     * curState); a shield blocks the board (only the call bar's End works); win/fail are swallowed (no stars).
     * When the call ends (End / hang-up / time-out / leaving) the view is re-created from the snapshot → exactly
     * his board again, then "Your turn!". */
    var ai = null, curState = spec.saved || null;
    function aiBegin() {
      if (!LE.aiDemo || !inst || !inst.showMe) return null;
      if (inst.busy && inst.stop) inst.stop();
      closeGate();
      tutorialToken++;
      LE.hand.hide();
      buddy.hide();
      var a = ai = { snapshot: curState == null ? null : JSON.parse(JSON.stringify(curState)), before: JSON.stringify(LE.aiDemo.boardOf(inst)),
        solved: false, result: null, going: false, session: null, lastSent: '', sendT: 0, shield: h('div.ai-shield') };
      ['pointerdown', 'touchstart', 'mousedown', 'click'].forEach(function (t) {
        a.shield.addEventListener(t, function (e) { e.preventDefault(); e.stopPropagation(); }, { passive: false });
      });
      el.classList.add('ai-call');
      el.appendChild(a.shield);
      a.demo = LE.aiDemo.create({
        getInst: function () { return inst; }, world: worldId, level: level, host: host,
        alive: function () { return alive && ai === a; },
        solved: function () { return a.solved; },
        onResult: function (fn) { a.result = fn; if (a.solved) fn('win'); },
        going: function (v) { a.going = v; },
        onTool: function (name, params, res) { emit('ai-tool', { name: name, params: params, result: res }); }
      });
      a.sendNow = function () {
        clearTimeout(a.sendT);
        if (ai !== a || !a.session || !a.session.sendContext) return;
        var txt = a.demo.update();
        if (txt === a.lastSent) return;
        if (a.session.sendContext(txt)) { a.lastSent = txt; emit('ai-context', txt); }
      };
      a.changed = function () { clearTimeout(a.sendT); a.sendT = setTimeout(a.sendNow, 350); };
      return a.demo;
    }
    function aiEnd(reason) {
      var a = ai;
      if (!a) return false;
      ai = null;
      clearTimeout(a.sendT);
      var used = a.demo.log.length > 0;
      a.demo.stop();
      a.shield.remove();
      el.classList.remove('ai-call');
      var record = { reason: reason, tools: a.demo.log.slice(), before: a.before, after: null, exact: true, restored: false };
      if (alive) {
        // Put his own board back exactly: re-create the view from the snapshot (the same path as resuming a level).
        if (inst.busy && inst.stop) inst.stop();
        if (used || a.before !== JSON.stringify(LE.aiDemo.boardOf(inst))) {
          if (inst.destroy) inst.destroy();
          ctx.savedState = a.snapshot;
          inst = w.view.create(host, level, ctx);
          if (LE.activeLevel) LE.activeLevel.inst = inst;
          record.restored = true;
        }
        curState = a.snapshot;
        if (a.snapshot != null) spec.saveState(a.snapshot);
        record.after = JSON.stringify(LE.aiDemo.boardOf(inst));
        record.exact = record.after === a.before;
        if (!record.exact) console.warn('helper demo: board restore differs', a.before, record.after);
      }
      if (LE.activeLevel) LE.activeLevel.lastAi = record;
      emit('ai-restored', record);
      if (!alive || reason === 'fallback' || !used) return false;   // nothing was shown → the usual goodbye
      buddy.say(LINES.aiYourTurn, { buttons: [{ label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }] });
      return true;
    }
    var askBtn = helperOn ? LE.button('icon ask-helper', MIC_SVG + '<span>Ask</span>', openHelper, { label: 'Ask Helper' }) : null;
    var bar = topbar(title, function () { spec.back(); }, h('div.top-actions', askBtn, restartBtn));
    var buddyBar = h('div.buddy-bar');
    var host = h('div.play-host');
    el.append(bar, buddyBar, host);
    var buddy = new LE.Buddy(buddyBar);
    prefetchLevel(w, spec);
    LE.voice.prefetch([LINES.helperOffline, LINES.helperMic, LINES.helperBye]);
    var won = false, alive = true, attempts = 0, listeners = {}, tutorialToken = 0, demoRunning = false, lastActivity = Date.now();

    function emit(name, data) {
      lastActivity = Date.now();
      (listeners[name] || []).slice().forEach(function (fn) { fn(data); });
      (listeners['*'] || []).slice().forEach(function (fn) { fn(name, data); });
    }
    function on(name, fn) { (listeners[name] = listeners[name] || []).push(fn); return function () { listeners[name] = (listeners[name] || []).filter(function (f) { return f !== fn; }); }; }
    function waitFor(name, times) {
      times = times || 1;
      return new Promise(function (resolve) {
        var n = 0, off = on(name, function () { if (++n >= times) { off(); resolve(); } });
      });
    }

    var ctx = {
      world: worldId, levelIndex: index, level: level, weekly: spec.weekly || null,
      sfx: function (n) { LE.sound.play(n); },
      say: function (t, o) { return buddy.say(t, o); },
      buddy: buddy,
      emit: emit,
      savedState: spec.saved,
      saveState: function (s) { if (!alive) return; curState = s; if (ai) { ai.changed(); return; } spec.saveState(s); },
      fast: LE.FAST,
      fx: LE.fx,
      win: function (r) { if (!alive) return; if (ai) { ai.solved = true; if (ai.result) ai.result('win'); return; } if (demo) { demo.solved = true; if (demo.onResult) demo.onResult('win'); return; } onWin(r || {}); },
      fail: function (r) { if (!alive) return; if (ai) { if (ai.result) ai.result('fail'); return; } if (demo) { if (demo.onResult) demo.onResult('fail'); return; } onFail(r || {}); },
      isDemo: function () { return (demoRunning && !(demo && demo.going)) || (!!ai && !ai.going); }
    };

    show({ el: el, destroy: function () { alive = false; tutorialToken++; clearInterval(idleT); clearInterval(showMeT); document.removeEventListener('visibilitychange', onVis); if (helperSession) helperSession.end(); if (LE.helperTalk) LE.helperTalk.stop(); buddy.destroy(); if (inst && inst.destroy) inst.destroy(); LE.hand.hide(); } });
    var inst = w.view.create(host, level, ctx);
    LE.activeLevel = { world: worldId, index: index, weekly: spec.weekly || null, level: level, inst: inst, ctx: ctx, showMe: function () { return showMe(); }, buddy: buddy,
      lastDemo: null, askHelper: openHelper, showMeOpen: function () { return showMeOpen(); }, demo: function () { return demo; },
      solve: function () { return solve(); },
      ai: function () { return ai; }, lastAi: null };

    /** Test hook: build the stored solution through the same code paths as Show me (no hand, not a demo, so a
     *  win counts like a real one). The caller presses Go (worlds without Go win live). */
    async function solve() {
      if (inst.busy && inst.stop) inst.stop();
      closeGate();
      tutorialToken++;
      LE.hand.hide();
      var steps = inst.showMe() || [];
      for (var i = 0; i < steps.length && alive; i++) {
        if (steps[i].apply) steps[i].apply();
        await LE.wait(steps[i].pause || 120);
      }
    }

    buddy.onTap = function () {
      if (demoRunning || ai) return;
      buddy.say(level.goal, {
        buttons: [
          showMeBtn(),
          helperOn ? { label: '🎤 Ask Helper', cls: 'purple askhelper-btn', onTap: function () { buddy.hide(); openHelper(); } } : null,
          { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); LE.hand.hide(); closeGate(); } }
        ].filter(Boolean)
      });
    };

    function onActivity() { lastActivity = Date.now(); }
    el.addEventListener('pointerdown', onActivity, true);
    var idleNudged = 0;
    var idleT = setInterval(function () {
      if (!alive || demoRunning || helperSession || ai || LE.hasOverlay() || (inst && inst.busy)) return;
      if (Date.now() - lastActivity > 35000 && idleNudged < 3) {
        idleNudged++;
        lastActivity = Date.now();
        buddy.say(idleNudged === 1 ? LINES.idle : level.hint || LINES.tapMe, {
          buttons: [showMeBtn()]
        });
      }
    }, 3000);

    // Start sequence: tip card (first time) → (weekly story) goal → guided tutorial.
    (async function start() {
      await LE.wait(350);
      if (!alive) return;
      var tip = level.tip && w.content.tips && w.content.tips[level.tip];
      if (tip && !store.hasSeenTip(worldId + ':' + level.tip)) {
        await showTip(tip);
        store.markTip(worldId + ':' + level.tip);
        if (!alive) return;
      }
      var resumed = !!ctx.savedState;
      if (level.tutorial && level.tutorial.length && best === 0 && !resumed) {
        runTutorial(level.tutorial);
      } else {
        var parts = [resumed ? LINES.welcomeBack : null, !resumed && spec.story ? spec.story : null, level.goal].filter(Boolean);
        var gate = LE.READ_GO;
        buddy.say(parts.join(' '), {
          speakParts: parts.length > 1 ? parts : null,
          buttons: [showMeBtn()].concat(gate ? [] :
                    [{ label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }])
        });
        if (gate) readThenGo();
      }
    })();

    /* ---------- Read, then Go: the board waits until Salah taps Go (🔊 replays the lines) ---------- */
    var gateEl = null;
    function readThenGo() {
      closeGate();
      var spoken = buddy.spoken || Promise.resolve();
      var goBtn = LE.button('green huge gate-go', 'Go ▶', function () { closeGate(); buddy.hide(); emit('ready'); }, { sound: 'whoosh', label: 'Start' });
      var replay = LE.button('white big gate-replay', '🔊', function () { buddy.spoken = LE.speakForce(buddy.lastSpoken || buddy.lastText); }, { label: 'Say it again' });
      gateEl = h('div.go-gate', h('div.gate-card', h('div.gate-title', 'Ready? 👂'), h('div.gate-bar', replay, goBtn)));
      host.appendChild(gateEl);
      el.classList.add('gated');
      spoken.then(function () { if (gateEl) gateEl.classList.add('ready'); });
    }
    function closeGate() {
      if (!gateEl) return;
      gateEl.remove(); gateEl = null;
      el.classList.remove('gated');
    }

    async function runTutorial(steps) {
      var token = ++tutorialToken;
      await buddy.say(level.goal, { ok: true, okLabel: 'Let\'s go! 👍' });
      for (var i = 0; i < steps.length; i++) {
        if (token !== tutorialToken || !alive) return;
        let s = steps[i];
        var waiter = s.wait ? waitFor(s.wait, s.times || 1) : null;
        // Let the previous line finish before the next one starts (clips are slower than the old voice).
        await buddy.afterSpeech(250);
        if (token !== tutorialToken || !alive) return;
        var said = buddy.say(s.say, { ok: !s.wait });
        if (s.drag) LE.hand.loop(function () { return inst.target(s.drag[0]); }, function () { return inst.target(s.drag[1]); }, inst.ghost && inst.ghost(s.drag[0]));
        else if (s.point) LE.hand.loop(function () { return inst.target(s.point); });
        await (waiter || said);
        LE.hand.stop();
        if (token !== tutorialToken) return;
        LE.sound.play('star');
        await LE.wait(250);
      }
    }

    /* ---------- Show me: unlocks after 2 tries or ~2 minutes (parent: always). A guided demo with the hand and
     * a line per step, Pause / Replay step / Let me try. The demo proves the solution works, never gives stars,
     * then the level goes back to the start so Salah builds it himself. ---------- */
    var SHOWME_MS = 120000;
    var t0 = LE.now().getTime(), hiddenMs = 0, hiddenAt = 0, readyAnnounced = false;
    function onVis() {
      var now = LE.now().getTime();
      if (document.hidden) hiddenAt = now;
      else if (hiddenAt) { hiddenMs += now - hiddenAt; hiddenAt = 0; }
    }
    document.addEventListener('visibilitychange', onVis);
    function playedMs() { return LE.now().getTime() - t0 - hiddenMs - (hiddenAt ? LE.now().getTime() - hiddenAt : 0); }
    function showMeOpen() {
      return !LE.SHOWME_GATE || store.data.settings.showMeAlways || LE.showMeForce || attempts >= 2 || playedMs() >= SHOWME_MS;
    }
    function showMeBtn() {
      var open = showMeOpen();
      return { label: open ? '👉 Show me' : '👉 Show me 🔒', cls: 'orange showme-btn' + (open ? ' lit' : ' locked'), onTap: function () { showMe(); } };
    }
    function hintFirst() {
      LE.sound.play('pop');
      if (level.hint) buddy.say(LINES.showMeLater + ' ' + level.hint, { speakParts: [LINES.showMeLater, level.hint], buttons: [showMeBtn()] });
      else buddy.say(level.goal, { buttons: [showMeBtn()] });
    }
    function announceShowMe() {
      if (readyAnnounced || won || demoRunning || !alive) return;
      readyAnnounced = true;
      buddy.say(LINES.showMeReady, { buttons: [showMeBtn(), { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }] });
    }
    var showMeT = setInterval(function () {
      if (!alive) { clearInterval(showMeT); return; }
      if (LE.SHOWME_GATE && !readyAnnounced && !demoRunning && !helperSession && !LE.hasOverlay() && !(inst && inst.busy) && showMeOpen()) announceShowMe();
    }, 1000);

    function narrate(st) {
      if (st.say) return st.say;
      var m = LINES.demo[worldId] || {};
      if (m[st.from]) return m[st.from];
      if (worldId === 'bridges' && /^node:/.test(st.from || '')) return m.node;
      return null;
    }

    var demo = null;     // { paused, replay, stop, solved, onResult }
    async function showMe() {
      if (demoRunning || ai || !alive) return;
      if (!showMeOpen()) { hintFirst(); return; }
      if (inst.busy && inst.stop) inst.stop();
      closeGate();
      tutorialToken++;
      LE.hand.hide();
      LE.stopSpeaking();
      readyAnnounced = true;
      demoRunning = true;
      demo = { paused: false, replay: false, stop: false, solved: false, onResult: null };
      var d = demo;
      el.classList.add('demo');
      var shield = h('div.demo-shield');
      var pauseBtn = LE.button('white demo-pause', '⏸ Pause', function () {
        d.paused = !d.paused;
        pauseBtn.innerHTML = d.paused ? '▶ Go on' : '⏸ Pause';
        el.classList.toggle('demo-paused', d.paused);
        if (d.paused) LE.stopSpeaking();
      }, { label: 'Pause the demo' });
      var replayBtn = LE.button('blue demo-replay', '↻ Again', function () { d.replay = true; d.paused = false; pauseBtn.innerHTML = '⏸ Pause'; el.classList.remove('demo-paused'); }, { label: 'Replay this step' });
      var tryBtn = LE.button('green demo-try', '👍 Let me try', function () { d.stop = true; d.paused = false; }, { label: 'Let me try' });
      var bar = h('div.demo-bar', pauseBtn, replayBtn, tryBtn);
      el.append(shield, bar);
      var stepsShown = 0;
      try {
        // Always demo from the start state (so a step can be replayed from there).
        if (inst.reset) inst.reset();
        await LE.wait(250);
        var steps = inst.showMe() || [];
        buddy.say(steps.intro || LINES.watch, { speak: true });
        await LE.wait(700);
        var lastLine = '';
        var i = 0;
        while (i < steps.length && alive && !d.stop) {
          while (d.paused && alive && !d.stop) await LE.wait(120);
          if (!alive || d.stop) break;
          let st = steps[i];
          var line = narrate(st);
          if (line && line !== lastLine) {
            await buddy.afterSpeech();        // don't talk over the previous line
            if (!alive || d.stop) break;
            buddy.say(line);
            lastLine = line;
          }
          if (st.from && st.to) await LE.hand.drag(function () { return inst.target(st.from); }, function () { return inst.target(st.to); }, inst.ghost && inst.ghost(st.from));
          else if (st.from) { await LE.hand.moveTo(function () { return inst.target(st.from); }, 450); await LE.hand.tap(); }
          if (!alive || d.stop) break;
          if (st.apply) st.apply();
          await LE.wait(st.pause || 260);
          stepsShown = i + 1;
          if (d.replay) {
            // Rewind to just before this step (start state + earlier steps, no hand), then show it again.
            d.replay = false;
            LE.hand.hide();
            if (inst.busy && inst.stop) inst.stop();
            if (inst.reset) inst.reset();
            await LE.wait(150);
            for (var j = 0; j < i && alive; j++) { if (steps[j].apply) steps[j].apply(); await LE.wait(steps[j].pause || 120); }
            lastLine = '';
            continue;
          }
          i++;
        }
        // Prove it works: press Go (worlds without Go finish by themselves).
        if (alive && !d.stop) {
          var result = new Promise(function (resolve) { d.onResult = resolve; if (d.solved) resolve('win'); });
          if (!inst.noGo) {
            await buddy.afterSpeech();
            buddy.say(LINES.demoGo[inst.goLabel || 'Go'] || LINES.demoGo.Go);
            var goKey = inst.goKey || 'go';
            await LE.hand.moveTo(function () { return inst.target(goKey); }, 450);
            await LE.hand.tap();
            LE.hand.hide();
            d.going = true;
            var goEl = host.querySelector('.go-btn');
            if (inst.go) inst.go(); else if (goEl) goEl.click();
          }
          await Promise.race([result, LE.wait(inst.noGo ? 20000 : 45000)]);
          if (d.solved && alive) {
            buddy.cheer();
            buddy.say(LINES.demoWorks);
            await buddy.afterSpeech(600);
            await LE.wait(500);
          }
        }
      } finally {
        LE.hand.hide();
        if (alive) {
          if (inst.busy && inst.stop) inst.stop();
          if (inst.reset) inst.reset();        // back to the start: no stars for watching
        }
        demoRunning = false;
        demo = null;
        el.classList.remove('demo', 'demo-paused');
        shield.remove();
        bar.remove();
        if (LE.activeLevel) LE.activeLevel.lastDemo = { solved: d.solved, stopped: d.stop, steps: stepsShown };
      }
      if (!alive || won) return;
      emit('showme-done');
      buddy.say(LINES.demoYourTurn, { buttons: [showMeBtn()] });
      if (LE.READ_GO) readThenGo();
    }

    function onFail(r) {
      attempts++;
      LE.sound.play('oops');
      buddy.mood('sad');
      setTimeout(function () { buddy.mood(''); }, 1500);
      var msg = r.message || ENCOURAGE[(attempts - 1) % ENCOURAGE.length];
      if (attempts >= 3) {
        buddy.say(msg + ' ' + LINES.showYou, {
          speakParts: [msg, LINES.showYou],
          buttons: [showMeBtn(),
                    { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }]
        });
      } else if (attempts === 2 && level.hint) {
        // Second try: the hint first, and Show me lights up now.
        readyAnnounced = true;
        buddy.say(msg + ' Hint: ' + level.hint, { speakParts: [msg, LINES.hint, level.hint], buttons: [showMeBtn()] });
      } else {
        buddy.say(msg);
      }
    }

    function onWin(r) {
      won = true;
      var stars = Math.max(1, Math.min(3, r.stars || 1));
      var prevBest = best;
      var res = spec.record(stars);
      tutorialToken++;
      LE.hand.hide();
      buddy.cheer();
      buddy.say(LINES.praise[index % LINES.praise.length]);
      LE.sound.play('success');
      LE.fx.confetti();
      setTimeout(function () { if (alive) showWin(stars, prevBest, res, r); }, 900 / LE.speed);
    }

    function showWin(stars, prevBest, res, r) {
      var facts = w.content.facts || [];
      var fact = facts.length ? facts[spec.factIndex % facts.length] : '';
      var starsEl = h('div.win-stars');
      for (var i = 0; i < 3; i++) starsEl.appendChild(h('div.win-star', { html: LE.starSVG(false) }));
      var next = LE.button('green huge next-btn', res.nextLabel, function () {
        closeOverlay();
        res.next();
      }, { sound: 'whoosh' });
      var note = r.note ? h('div.win-note', r.note) : null;
      openOverlay([
        h('h2.win-title', res.title || (stars === 3 ? 'Perfect!' : 'You did it!')),
        starsEl,
        note,
        fact ? h('div.fact', h('div.fact-title', '💡 Did you know?'), h('div.fact-text', fact)) : null,
        next,
        h('div.row',
          LE.button('blue', '↻ Replay', function () { closeOverlay(); spec.replay(); }),
          res.map ? LE.button('purple', res.map.label, function () { closeOverlay(); res.map.go(); }) : null)
      ], 'win');
      starsEl.querySelectorAll('.win-star').forEach(function (s, i) {
        if (i < stars) setTimeout(function () {
          s.innerHTML = LE.starSVG(true); s.classList.add('pop'); LE.sound.play('star');
          LE.fx.sparkle(s.getBoundingClientRect().left + 30, s.getBoundingClientRect().top + 30);
        }, (350 + i * 380) / LE.speed);
      });
      // Read the fact only after the praise clip has finished (real clips can run longer than the delay).
      if (fact) Promise.all([LE.wait(1400 / LE.speed), buddy.afterSpeech(300)]).then(function () { if (alive) LE.speak(factLine(fact)); });
      if (!res.hasNext) setTimeout(function () { LE.fx.confetti(220); LE.sound.play('cheer'); }, 1500 / LE.speed);
    }
  }

  /* ---------- Car Builder & Race (js/views/cars-view.js; replaced the Practice Room, whose saved data is kept untouched) ---------- */
  function showCars() { LE.cars.showGarage(); }

  /** Resume a weekly step only if it is still open (the clock or a parent may have changed things). */
  function resumeWeeklyStep(pid, k) {
    var p = weeklyProject(pid), W = LE.logic.weekly, i = (LE.weeklyProjects || []).indexOf(p);
    if (W.isProjectUnlocked(store.data, i, LE.now()) && p.steps[k] && W.isStepUnlocked(p, store.projectProgress(pid), k)) openWeeklyStep(pid, k);
    else showWeeklyHub(pid);
  }

  LE.app = { showMenu: showMenu, showMap: showMap, openLevel: openLevel, showCars: showCars, openSettings: openSettings, store: store,
    showScreen: show, topbar: topbar, confirmDialog: confirmDialog,
    openWeeklyStep: openWeeklyStep, showWeekly: showWeekly, showWeeklyHub: showWeeklyHub };

  /** True when el (or an ancestor below <body>) is a scroll container whose content overflows. */
  LE.inScrollable = function (el) {
    for (var n = el && el.nodeType === 1 ? el : el && el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      if (n.classList && (n.classList.contains('scroll-y') || n.classList.contains('map-scroll'))) return true;
      var cs = getComputedStyle(n);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && n.scrollHeight > n.clientHeight + 1) return true;
      if ((cs.overflowX === 'auto' || cs.overflowX === 'scroll') && n.scrollWidth > n.clientWidth + 1) return true;
    }
    return false;
  };

  /* ---------- Boot ---------- */
  function boot() {
    // Block pinch-zoom / double-tap zoom / rubber band (iOS).
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
      document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
    });
    // One-finger moves are allowed inside ANY element that can really scroll (parent panel tabs, weekly hub, week chips,
    // maps, settings, practice chips, …): a fixed whitelist silently broke finger scrolling of new panels on real iPhones.
    // Everything else is blocked so the page itself never rubber-bands. Game boards handle their own drags.
    document.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) { e.preventDefault(); return; }
      if (!LE.inScrollable(e.target)) e.preventDefault();
    }, { passive: false });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var last = store.getLast();
    var noResume = /[?&]menu=1/.test(location.search);
    try {
      if (!noResume && last && last.screen === 'level' && world(last.world).levels[last.level]) openLevel(last.world, last.level);
      else if (!noResume && last && last.screen === 'weekly-step' && weeklyProject(last.project)) resumeWeeklyStep(last.project, last.step);
      else if (!noResume && last && last.screen === 'weekly' && weeklyProject(last.project)) showWeeklyHub(last.project);
      else if (!noResume && last && (last.screen === 'cars' || last.screen === 'practice')) showCars();   // old Practice Room saves land in the garage
      else if (!noResume && last && last.screen === 'map' && world(last.world).levels.length) showMap(last.world);
      else showMenu();
    } catch (e) {
      console.warn('Resume failed', e);
      showMenu();
    }

    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw=1/.test(location.search)) {
      LE.updater.register('./sw.js');
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
