/* App shell: menu, world maps, level controller (buddy, tutorials, Show me, hints, win), settings, practice. */
(function () {
  'use strict';
  var LE = window.LE = window.LE || {};
  var h = LE.h;

  var store = LE.store = LE.save.createStore(window.localStorage);
  LE.sound.setMuted(!store.getSound());
  LE.voiceOn = store.data.settings.voice !== false;

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
    practiceWelcome: 'Welcome to the Practice Room! Play as much as you like. Try a challenge, or just have fun!'
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
      LE.button('red wide', '🗑️ Reset progress', function () {
        confirmDialog('Start over? All stars will be erased.', 'Yes, reset', function () {
          store.reset(); LE.sound.play('whoosh'); showMenu();
        });
      }),
      LE.button('blue big wide', 'Done', closeOverlay)
    ], 'settings');
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
    var practice = LE.button('practice-btn', '', function () { showPractice(); }, { label: 'Practice Room' });
    practice.append(h('div.practice-icon', { html: LE.worldIcon('practice') }), h('div', h('div.practice-title', 'Practice Room'), h('div.practice-sub', 'Play with Robo — no stars, just fun!')));
    var settings = LE.button('icon settings-btn', '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5A3.5 3.5 0 1 1 13 8.5a3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)"/></svg>', openSettings, { label: 'Settings' });
    el.append(
      h('div.menu-sky', h('div.cloud.c1'), h('div.cloud.c2'), h('div.cloud.c3')),
      h('div.menu-top', h('div.icon-spacer'), settings),
      h('div.menu-title', h('div.t1', "Salah's"), h('div.t2', 'Little Engineer')),
      h('div.menu-hero', buddyWrap, hello),
      grid,
      practice
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
    var extra = worldId === 'robot'
      ? LE.button('icon practice-mini', '<span>🧪</span>', function () { showPractice(); }, { label: 'Practice Room' })
      : null;
    var scroller = h('div.map-scroll');
    var inner = h('div.map-inner');
    scroller.appendChild(inner);
    var got = store.totalStars(worldId);
    el.append(
      topbar(h('span', h('span', w.name), h('span.topbar-stars', { html: LE.starSVG(true) + got + '/' + (w.levels.length * 3) })), showMenu, extra),
      scroller
    );
    if (worldId === 'robot') {
      el.appendChild(LE.button('practice-strip', '<span class="ps-ico">🧪</span> Practice Room', function () { showPractice(); }));
    }
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
  function prefetchLevel(w, level, index) {
    var lines = [level.goal, level.hint, LINES.watch, LINES.welcomeBack].concat(LINES.praise, LINES.encourage);
    (level.tutorial || []).forEach(function (s) { if (s.say) lines.push(s.say); });
    var tip = level.tip && w.content.tips && w.content.tips[level.tip];
    if (tip) lines.push(tipLine(tip));
    var facts = w.content.facts || [];
    if (facts.length) lines.push(factLine(facts[index % facts.length]));
    LE.voice.prefetch(lines);
    LE.voice.prefetchGroup(w.id + ':' + index);
  }

  function openLevel(worldId, index, opts) {
    opts = opts || {};
    var w = world(worldId);
    var level = w.levels[index];
    if (!level || !w.view) { showMap(worldId); return; }
    store.setLast({ screen: 'level', world: worldId, level: index });

    var el = h('div.level-screen.theme-' + worldId);
    var best = store.getStars(worldId, index);
    var title = h('span.lvl-title', h('span.lvl-num', String(index + 1)), h('span', level.name));
    var restartBtn = LE.button('icon restart', '<svg viewBox="0 0 24 24"><path d="M5 12 a7 7 0 1 0 2.2 -5.1" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M4 3 v5 h5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>', function () {
      confirmDialog('Start this level again?', 'Yes', function () { inst.reset(); attempts = 0; });
    }, { label: 'Restart level' });
    var bar = topbar(title, function () { showMap(worldId); }, restartBtn);
    var buddyBar = h('div.buddy-bar');
    var host = h('div.play-host');
    el.append(bar, buddyBar, host);
    var buddy = new LE.Buddy(buddyBar);
    prefetchLevel(w, level, index);
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
      world: worldId, levelIndex: index, level: level,
      sfx: function (n) { LE.sound.play(n); },
      say: function (t, o) { return buddy.say(t, o); },
      buddy: buddy,
      emit: emit,
      savedState: opts.fresh ? null : store.getInProgress(worldId, index),
      saveState: function (s) { if (alive) store.setInProgress(worldId, index, s); },
      fast: LE.FAST,
      fx: LE.fx,
      win: function (r) { if (alive) onWin(r || {}); },
      fail: function (r) { if (alive) onFail(r || {}); },
      isDemo: function () { return demoRunning; }
    };

    show({ el: el, destroy: function () { alive = false; tutorialToken++; clearInterval(idleT); buddy.destroy(); if (inst && inst.destroy) inst.destroy(); LE.hand.hide(); } });
    var inst = w.view.create(host, level, ctx);
    LE.activeLevel = { world: worldId, index: index, inst: inst, ctx: ctx, showMe: function () { return showMe(); }, buddy: buddy };

    buddy.onTap = function () {
      if (demoRunning) return;
      buddy.say(level.goal, {
        buttons: [
          { label: '👉 Show me', cls: 'orange showme-btn', onTap: function () { showMe(); } },
          { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); LE.hand.hide(); } }
        ]
      });
    };

    function onActivity() { lastActivity = Date.now(); }
    el.addEventListener('pointerdown', onActivity, true);
    var idleNudged = 0;
    var idleT = setInterval(function () {
      if (!alive || demoRunning || LE.hasOverlay() || (inst && inst.busy)) return;
      if (Date.now() - lastActivity > 35000 && idleNudged < 3) {
        idleNudged++;
        lastActivity = Date.now();
        buddy.say(idleNudged === 1 ? LINES.idle : level.hint || LINES.tapMe, {
          buttons: [{ label: '👉 Show me', cls: 'orange showme-btn', onTap: function () { showMe(); } }]
        });
      }
    }, 3000);

    // Start sequence: tip card (first time) → goal → guided tutorial.
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
        buddy.say((resumed ? LINES.welcomeBack + ' ' : '') + level.goal, {
          speakParts: resumed ? [LINES.welcomeBack, level.goal] : null,
          buttons: [{ label: '👉 Show me', cls: 'orange showme-btn', onTap: function () { showMe(); } },
                    { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }]
        });
      }
    })();

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

    async function showMe() {
      if (demoRunning || !alive) return;
      if (inst.busy && inst.stop) inst.stop();
      tutorialToken++;
      LE.hand.hide();
      demoRunning = true;
      el.classList.add('demo');
      var shield = h('div.demo-shield');
      el.appendChild(shield);
      try {
        var steps = inst.showMe() || [];
        buddy.say(steps.intro || LINES.watch, { speak: true });
        await LE.wait(700);
        for (var i = 0; i < steps.length && alive; i++) {
          let s = steps[i];
          if (s.say) {
            await buddy.afterSpeech();        // don't talk over the previous line
            if (!alive) return;
            buddy.say(s.say);
          }
          if (s.from && s.to) await LE.hand.drag(function () { return inst.target(s.from); }, function () { return inst.target(s.to); }, inst.ghost && inst.ghost(s.from));
          else if (s.from) { await LE.hand.moveTo(function () { return inst.target(s.from); }, 450); await LE.hand.tap(); }
          if (!alive) return;
          if (s.apply) s.apply();
          await LE.wait(s.pause || 260);
        }
      } finally {
        demoRunning = false;
        el.classList.remove('demo');
        shield.remove();
      }
      if (!alive || won) return;
      emit('showme-done');
      await buddy.afterSpeech();
      if (!alive || won) return;
      if (inst.noGo) { buddy.say(LINES.nowYou); return; }
      buddy.say(LINES.tapGo[inst.goLabel || 'Go'] || LINES.tapGo.Go, {});
      var goKey = inst.goKey || 'go';
      LE.hand.loop(function () { return inst.target(goKey); });
      var off = on('run', function () { off(); LE.hand.stop(); });
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
          buttons: [{ label: '👉 Show me', cls: 'orange showme-btn', onTap: function () { showMe(); } },
                    { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }]
        });
      } else if (attempts === 2 && level.hint) {
        buddy.say(msg + ' Hint: ' + level.hint, { speakParts: [msg, LINES.hint, level.hint] });
      } else {
        buddy.say(msg);
      }
    }

    function onWin(r) {
      won = true;
      var stars = Math.max(1, Math.min(3, r.stars || 1));
      var prevBest = store.getStars(worldId, index);
      store.setStars(worldId, index, stars);
      store.clearInProgress(worldId, index);
      var hasNext = index + 1 < w.levels.length;
      store.setLast(hasNext ? { screen: 'level', world: worldId, level: index + 1 } : { screen: 'map', world: worldId });
      tutorialToken++;
      LE.hand.hide();
      buddy.cheer();
      buddy.say(LINES.praise[index % LINES.praise.length]);
      LE.sound.play('success');
      LE.fx.confetti();
      setTimeout(function () { if (alive) showWin(stars, prevBest, hasNext, r); }, 900 / LE.speed);
    }

    function showWin(stars, prevBest, hasNext, r) {
      var facts = w.content.facts || [];
      var fact = facts.length ? facts[index % facts.length] : '';
      var starsEl = h('div.win-stars');
      for (var i = 0; i < 3; i++) starsEl.appendChild(h('div.win-star', { html: LE.starSVG(false) }));
      var next = LE.button('green huge next-btn', hasNext ? 'Next ▶' : 'Map 🗺️', function () {
        closeOverlay();
        if (hasNext) openLevel(worldId, index + 1); else showMap(worldId);
      }, { sound: 'whoosh' });
      var note = r.note ? h('div.win-note', r.note) : null;
      openOverlay([
        h('h2.win-title', !hasNext ? 'World complete!' : stars === 3 ? 'Perfect!' : 'You did it!'),
        starsEl,
        note,
        fact ? h('div.fact', h('div.fact-title', '💡 Did you know?'), h('div.fact-text', fact)) : null,
        next,
        h('div.row',
          LE.button('blue', '↻ Replay', function () { closeOverlay(); openLevel(worldId, index, { fresh: true }); }),
          hasNext ? LE.button('purple', '🗺️ Map', function () { closeOverlay(); showMap(worldId); }) : null)
      ], 'win');
      starsEl.querySelectorAll('.win-star').forEach(function (s, i) {
        if (i < stars) setTimeout(function () {
          s.innerHTML = LE.starSVG(true); s.classList.add('pop'); LE.sound.play('star');
          LE.fx.sparkle(s.getBoundingClientRect().left + 30, s.getBoundingClientRect().top + 30);
        }, (350 + i * 380) / LE.speed);
      });
      // Read the fact only after the praise clip has finished (real clips can run longer than the delay).
      if (fact) Promise.all([LE.wait(1400 / LE.speed), buddy.afterSpeech(300)]).then(function () { if (alive) LE.speak(factLine(fact)); });
      if (!hasNext) setTimeout(function () { LE.fx.confetti(220); LE.sound.play('cheer'); }, 1500 / LE.speed);
    }
  }

  /* ---------- Practice Room ---------- */
  function showPractice() {
    store.setLast({ screen: 'practice' });
    var el = h('div.level-screen.practice-screen.theme-practice');
    var bar = topbar(h('span.lvl-title', h('span', '🧪 Practice Room')), showMenu);
    var buddyBar = h('div.buddy-bar');
    var host = h('div.play-host');
    el.append(bar, buddyBar, host);
    var buddy = new LE.Buddy(buddyBar);
    var alive = true, demoRunning = false, listeners = {};
    var inst;
    var ctx = {
      buddy: buddy,
      say: function (t, o) { return buddy.say(t, o); },
      sfx: function (n) { LE.sound.play(n); },
      emit: function (name, d) { (listeners[name] || []).slice().forEach(function (f) { f(d); }); },
      fx: LE.fx, store: store, fast: LE.FAST,
      isDemo: function () { return demoRunning; },
      showMe: function () { showMe(); }
    };
    show({ el: el, destroy: function () { alive = false; buddy.destroy(); if (inst && inst.destroy) inst.destroy(); } });
    inst = LE.views.practice.create(host, ctx);
    LE.activeLevel = { world: 'practice', inst: inst, ctx: ctx, showMe: function () { return showMe(); }, buddy: buddy };
    buddy.onTap = function () {
      if (demoRunning) return;
      buddy.say(inst.goal(), {
        buttons: inst.canShowMe() ? [{ label: '👉 Show me', cls: 'orange showme-btn', onTap: function () { showMe(); } },
                                     { label: '👍 Let me try', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }]
                                  : [{ label: '👍 OK', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }]
      });
    };
    async function showMe() {
      if (demoRunning || !alive || !inst.canShowMe()) return;
      if (inst.busy && inst.stop) inst.stop();
      demoRunning = true;
      var shield = h('div.demo-shield');
      el.appendChild(shield);
      try {
        var steps = inst.showMe();
        buddy.say(LINES.watch);
        await LE.wait(600);
        for (var i = 0; i < steps.length && alive; i++) {
          let s = steps[i];
          if (s.from && s.to) await LE.hand.drag(function () { return inst.target(s.from); }, function () { return inst.target(s.to); }, inst.ghost && inst.ghost(s.from));
          else if (s.from) { await LE.hand.moveTo(function () { return inst.target(s.from); }, 450); await LE.hand.tap(); }
          if (!alive) return;
          if (s.apply) s.apply();
          await LE.wait(s.pause || 260);
        }
      } finally { demoRunning = false; shield.remove(); }
      if (!alive) return;
      await buddy.afterSpeech();
      if (!alive) return;
      buddy.say(LINES.tapGo.Play);
      LE.hand.loop(function () { return inst.target('go'); });
      var off = function () {};
      listeners.run = [function () { LE.hand.stop(); listeners.run = []; }];
      return off;
    }
    setTimeout(function () {
      if (!alive) return;
      buddy.say(LINES.practiceWelcome, {
        buttons: [{ label: '👍 OK', cls: 'green letmetry-btn', onTap: function () { buddy.hide(); } }]
      });
    }, 400 / LE.speed);
  }

  LE.app = { showMenu: showMenu, showMap: showMap, openLevel: openLevel, showPractice: showPractice, openSettings: openSettings, store: store };

  /* ---------- Boot ---------- */
  function boot() {
    // Block pinch-zoom / double-tap zoom / rubber band (iOS).
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (ev) {
      document.addEventListener(ev, function (e) { e.preventDefault(); }, { passive: false });
    });
    document.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches.length > 1) { e.preventDefault(); return; }
      if (!(e.target.closest && e.target.closest('.scroll-y, .map-scroll'))) e.preventDefault();
    }, { passive: false });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var last = store.getLast();
    var noResume = /[?&]menu=1/.test(location.search);
    try {
      if (!noResume && last && last.screen === 'level' && world(last.world).levels[last.level]) openLevel(last.world, last.level);
      else if (!noResume && last && last.screen === 'practice') showPractice();
      else if (!noResume && last && last.screen === 'map' && world(last.world).levels.length) showMap(last.world);
      else showMenu();
    } catch (e) {
      console.warn('Resume failed', e);
      showMenu();
    }

    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw=1/.test(location.search)) {
      navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(function () {});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
