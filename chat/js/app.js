/* Family Chat app: setup (your name/avatar + family code, once per phone), group chat (text, stickers, voice notes),
 * Settings (edit me, alerts, Update app, sign out) and Parents (PIN -> admin: show/change code, phones, clear). */
(function () {
  'use strict';
  var FC = window.FC, cfg = window.FC_CONFIG, fmt = FC.fmt;
  var store = {
    get: function (k) { try { return localStorage.getItem('fc.' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('fc.' + k, v); } catch (e) { /* full */ } },
    del: function (k) { try { localStorage.removeItem('fc.' + k); } catch (e) { /* blocked */ } }
  };
  // The device sign-in (token, profile) is kept for good: the code is typed ONCE per phone. It is mirrored into
  // IndexedDB so it survives even if localStorage alone gets wiped, and we ask the browser for persistent storage.
  var KEEP = ['token', 'memberId'];
  var idb = (function () {
    function open() {
      return new Promise(function (res, rej) {
        if (!window.indexedDB) { rej(new Error('no idb')); return; }
        var r = indexedDB.open('family-chat', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
        r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); };
      });
    }
    function tx(mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction('kv', mode), st = t.objectStore('kv'), out = fn(st);
          t.oncomplete = function () { db.close(); res(out && out.result); }; t.onerror = function () { db.close(); rej(t.error); };
        });
      });
    }
    return {
      set: function (k, v) { return tx('readwrite', function (st) { st.put(v, k); }).catch(function () {}); },
      del: function (k) { return tx('readwrite', function (st) { st.delete(k); }).catch(function () {}); },
      get: function (k) { return tx('readonly', function (st) { return st.get(k); }).catch(function () { return null; }); }
    };
  })();
  var lsStore = store;
  store = {
    get: lsStore.get,
    set: function (k, v) { lsStore.set(k, v); if (KEEP.indexOf(k) >= 0) idb.set(k, v); },
    del: function (k) { lsStore.del(k); if (KEEP.indexOf(k) >= 0) idb.del(k); }
  };
  function restoreSignIn() {
    if (lsStore.get('token')) { KEEP.forEach(function (k) { var v = lsStore.get(k); if (v) idb.set(k, v); }); return Promise.resolve(); }
    return Promise.all(KEEP.map(idb.get)).then(function (v) {
      if (v[0] && v[1]) KEEP.forEach(function (k, i) { if (v[i]) lsStore.set(k, v[i]); });
    });
  }
  function keepStorage() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return navigator.storage.persisted().then(function (p) { return p || navigator.storage.persist(); })
          .then(function (p) { window.FC_PERSISTED = !!p; return p; }).catch(function () { return false; });
      }
    } catch (e) { /* unsupported */ }
    return Promise.resolve(false);
  }
  var api = FC.createApi({ base: cfg.API_BASE, store: store });
  var AVATARS = ['👦', '👧', '🧒', '👶', '🧔', '👨', '👩', '🧕', '👴', '👵', '🦁', '🐱', '🐶', '🐼', '🦊', '🐸', '🦖', '🦄', '🐧', '🚀', '⚽', '🌟', '🌈', '🍕'];
  var COLORS = ['#20bf6b', '#2d98da', '#8854d0', '#ff5c8a', '#fa8231', '#f7b731', '#0fb9b1', '#eb3b5a'];
  var PARENT_PIN_LEN = 4;
  var app = document.getElementById('app');
  var S = {
    meId: null, members: {}, msgs: [], online: [], typing: {}, pushKey: null, push: false,
    sound: store.get('sound') !== 'off', hasOlder: false, picker: null, rec: null, epoch: store.get('epoch') || '0'
  };
  var ui = {};   // chat screen elements

  // ---------- tiny DOM helper ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'style') el.style.cssText = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null || c === false) continue;
      (Array.isArray(c) ? c : [c]).forEach(function (x) { if (x != null && x !== false) el.appendChild(typeof x === 'string' ? document.createTextNode(x) : x); });
    }
    return el;
  }
  var toastT;
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, ms || 2600);
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function isIOS() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
  function standalone() { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
  function deviceName() {
    var ua = navigator.userAgent;
    return /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) || (isIOS() && !/iPhone/.test(ua)) ? 'iPad' : /Android/.test(ua) ? 'Android phone' : 'Computer';
  }
  function member(id) { return S.members[id] || { id: id, name: 'Someone', avatar: '🙂', color: '#a4b0be', removed: true }; }
  function me() { return member(S.meId); }
  function others(includeRemoved) {
    return Object.keys(S.members).map(member).filter(function (m) { return m.id !== S.meId && (includeRemoved || !m.removed); });
  }
  function setMembers(list) { (list || []).forEach(function (m) { S.members[m.id] = m; }); store.set('members', JSON.stringify(S.members)); }
  function avatarEl(m, size, extra) {
    return h('span', { class: 'av' + (extra ? ' ' + extra : ''), style: 'background:' + m.color + ';width:' + size + 'px;height:' + size + 'px;font-size:' + Math.round(size * 0.6) + 'px', 'aria-hidden': 'true' }, m.avatar);
  }
  function names(list) {
    var n = list.map(function (m) { return m.name; });
    return n.length <= 1 ? (n[0] || '') : n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
  }


  // ---------- sounds (Web Audio, unlocked on first touch) ----------
  var actx = null, player = new Audio(), unlocked = false;
  player.preload = 'auto';
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    // iOS: an <audio> element played once inside a tap may later be played from code (voice memos after download).
    player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
    var p = player.play(); if (p && p.catch) p.catch(function () {});
  }
  document.addEventListener('pointerdown', unlock, { capture: true, passive: true });
  function ding(up) {
    if (!S.sound || !actx) return;
    try {
      if (actx.state === 'suspended') actx.resume();
      var t = actx.currentTime;
      (up ? [660, 990] : [880, 1320]).forEach(function (f, i) {
        var o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + i * 0.12); g.gain.exponentialRampToValueAtTime(0.25, t + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.3);
        o.connect(g); g.connect(actx.destination); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.32);
      });
    } catch (e) { /* no sound */ }
  }

  // ---------- keypad (code + PIN) ----------
  function keypad(onKey, goLabel) {
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'go'];
    return h('div', { class: 'keypad' }, keys.map(function (k) {
      var label = k === 'del' ? '⌫' : k === 'go' ? (goLabel || '✓') : k;
      return h('button', { type: 'button', class: k === 'del' ? 'k-del' : k === 'go' ? 'k-go' : '', 'aria-label': k === 'del' ? 'Delete' : k === 'go' ? 'OK' : k,
        'data-k': k, onclick: function () { onKey(k); } }, label);
    }));
  }

  // ---------- setup 1: your name, avatar and colour ----------
  function profileEditor(start, onDone, doneLabel) {
    var p = { name: start.name || '', avatar: start.avatar || AVATARS[0], color: start.color || COLORS[0] };
    var preview = h('div', { class: 'preview' });
    var input = h('input', { type: 'text', class: 'name-input', id: 'name-input', maxlength: '24', placeholder: 'Type your name', value: p.name,
      autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'done', 'aria-label': 'Your name' });
    var go = h('button', { type: 'button', class: 'big-btn green', id: 'profile-next' }, doneLabel || 'Next ➜');
    function paint() {
      preview.innerHTML = '';
      preview.appendChild(avatarEl(p, 76));
      preview.appendChild(h('b', null, p.name.trim() || 'Your name'));
      [].forEach.call(avGrid.children, function (b) { b.classList.toggle('on', b.getAttribute('data-av') === p.avatar); });
      [].forEach.call(colGrid.children, function (b) { b.classList.toggle('on', b.getAttribute('data-c') === p.color); });
      go.disabled = !p.name.trim();
    }
    var avGrid = h('div', { class: 'av-grid' }, AVATARS.map(function (a) {
      return h('button', { type: 'button', 'data-av': a, 'aria-label': 'Avatar ' + a, onclick: function () { p.avatar = a; paint(); } }, a);
    }));
    var colGrid = h('div', { class: 'col-grid' }, COLORS.map(function (c) {
      return h('button', { type: 'button', 'data-c': c, style: 'background:' + c, 'aria-label': 'Colour', onclick: function () { p.color = c; paint(); } });
    }));
    input.addEventListener('input', function () { p.name = input.value; paint(); });
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } });
    go.addEventListener('click', function () { if (p.name.trim()) onDone({ name: p.name.trim(), avatar: p.avatar, color: p.color }); });
    paint();
    return h('div', { class: 'profile-ed' }, preview, h('label', { class: 'lbl', for: 'name-input' }, '✏️ Your name'), input,
      h('div', { class: 'lbl' }, '😀 Pick your picture'), avGrid, h('div', { class: 'lbl' }, '🎨 Pick your colour'), colGrid, go);
  }
  function showWho() {
    teardownChat();
    app.innerHTML = '';
    var draft = {}; try { draft = JSON.parse(store.get('draftProfile') || '{}'); } catch (e) { draft = {}; }
    app.appendChild(h('div', { class: 'setup' },
      h('div', { class: 'logo' }, '💬'),
      h('h1', null, 'Family Chat'),
      h('p', { class: 'lead' }, 'Hi! 👋 Who are you?'),
      profileEditor(draft, function (p) { store.set('draftProfile', JSON.stringify(p)); showCode(p); })
    ));
  }

  // ---------- setup 2: the secret code (typed ONCE on this phone, usually by a parent) ----------
  function showCode(profile) {
    var digits = '', busy = false;
    var boxes = h('div', { class: 'code-boxes', 'aria-label': 'Secret code' });
    for (var i = 0; i < 6; i++) boxes.appendChild(h('span'));
    var line = h('div', { class: 'msgline' }, 'A grown-up types the family code. Only once!');
    function paint() {
      [].forEach.call(boxes.children, function (b, i) { b.textContent = digits[i] ? '•' : ''; b.className = digits[i] ? 'full' : ''; });
    }
    function say(msg, cls) { line.textContent = msg; line.className = 'msgline ' + (cls || ''); }
    function submit() {
      if (busy || digits.length !== 6) return;
      busy = true; say('Checking… 🔎');
      api.join(digits, profile, deviceName()).then(function () {
        digits = ''; say('Yay! You\'re in! 🎉', 'ok');
        store.del('draftProfile');
        keepStorage();
        setTimeout(showChat, 600);
      }).catch(function (e) {
        busy = false; digits = ''; paint();
        boxes.classList.remove('shake'); void boxes.offsetWidth; boxes.classList.add('shake');
        var d = e.data || {};
        if (e.code === 'wrong_code') say('Oops! That code is not right. ' + d.triesLeft + (d.triesLeft === 1 ? ' try' : ' tries') + ' left.', 'err');
        else if (e.code === 'too_many_tries') say('Too many tries 🕐 Please wait ' + Math.max(1, Math.ceil((d.retryAfterSec || 900) / 60)) + ' minutes.', 'err');
        else if (e.code === 'closed_new_code_needed') say('The chat is locked 🔒 A parent needs to change the code.', 'err');
        else if (e.code === 'not_ready') say('The chat is not ready yet. Ask a parent.', 'err');
        else if (e.code === 'too_many_devices') say('Too many phones joined. A parent can remove one.', 'err');
        else if (e.code === 'offline') say('No internet 📶 Try again.', 'err');
        else say('Something went wrong. Try again.', 'err');
      });
    }
    function key(k) {
      if (busy) return;
      if (k === 'del') digits = digits.slice(0, -1);
      else if (k === 'go') { submit(); return; }
      else if (digits.length < 6) digits += k;
      paint();
      if (digits.length === 6) submit();
    }
    var hidden = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', 'aria-label': 'Code', maxlength: '6',
      style: 'position:absolute;opacity:0;width:1px;height:1px;left:-10px', oninput: function () {
        var v = hidden.value.replace(/\D/g, '').slice(0, 6); hidden.value = '';
        if (v.length > 1) { digits = v; paint(); if (digits.length === 6) submit(); } else if (v) key(v);
      } });
    teardownChat();
    app.innerHTML = '';
    app.appendChild(h('div', { class: 'setup' },
      avatarEl(profile, 72, 'logo-av'),
      h('h1', null, 'Hi ' + profile.name + '!'),
      h('p', { class: 'lead' }, '🔑 Secret family code'),
      boxes, line, keypad(key, 'Go'),
      hidden,
      h('button', { type: 'button', class: 'link', onclick: showWho }, '← Back')
    ));
    document.onkeydown = function (e) {
      if (!document.body.contains(boxes)) { document.onkeydown = null; return; }
      if (/^\d$/.test(e.key)) key(e.key); else if (e.key === 'Backspace') key('del'); else if (e.key === 'Enter') key('go');
    };
  }

  function showRemoved() {
    teardownChat();
    ['msgs', 'epoch', 'members'].forEach(store.del);
    app.innerHTML = '';
    app.appendChild(h('div', { class: 'setup' },
      h('div', { class: 'logo' }, '🔒'),
      h('h1', null, 'Signed out'),
      h('p', { class: 'lead' }, 'This phone is not in the chat any more. A parent can add it again with the family code.'),
      h('button', { type: 'button', class: 'big-btn', style: 'max-width:320px', onclick: showWho }, 'Join again')
    ));
  }
  api.on('revoked', showRemoved);

  // ---------- chat ----------
  function cacheMsgs() {
    store.set('msgs', JSON.stringify(S.msgs.filter(function (m) { return m.id; }).slice(-150).map(function (m) {
      return { id: m.id, from: m.from, kind: m.kind, text: m.text, voice: m.voice, ts: m.ts };
    })));
  }
  function maxId() { var n = 0; S.msgs.forEach(function (m) { if (m.id > n) n = m.id; }); return n; }

  function showChat() {
    teardownChat();
    S.meId = store.get('memberId');
    if (!api.signedIn() || !S.meId) { showWho(); return; }
    try { S.msgs = JSON.parse(store.get('msgs') || '[]'); } catch (e) { S.msgs = []; }
    try { S.members = JSON.parse(store.get('members') || '{}'); } catch (e) { S.members = {}; }
    ui.faces = h('div', { class: 'faces' });
    ui.status = h('small', { id: 'chat-status' }, '');
    ui.list = h('div', { class: 'list scroll', id: 'list' });
    ui.banners = h('div');
    ui.pill = h('button', { type: 'button', class: 'new-pill', hidden: true, onclick: function () { scrollBottom(true); } }, '⬇ New message');
    ui.composer = h('div', { class: 'composer' });
    ui.pickerBox = h('div');
    ui.hint = h('div', { class: 'rec-hint', hidden: true });
    app.innerHTML = '';
    app.appendChild(h('div', { class: 'top' }, ui.faces,
      h('div', { class: 'who-name' }, h('b', null, 'Family Chat'), ui.status),
      h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Settings', id: 'settings-btn', onclick: openSettings }, '⚙️')
    ));
    app.appendChild(h('div', { class: 'chat-wrap' }, ui.banners, ui.list, ui.pill, ui.hint));
    app.appendChild(ui.pickerBox);
    app.appendChild(ui.composer);
    renderComposer();
    renderAll(); updateHeader();
    ui.list.addEventListener('scroll', function () { if (nearBottom()) { ui.pill.hidden = true; markRead(); } });
    renderBanners();

    api.setLastId(maxId());
    api.me().then(function (r) {
      setMembers(r.members); S.online = r.online; S.pushKey = r.pushKey; S.push = r.push;
      updateHeader(); renderAll(); renderBanners(); autoPush();
    }).catch(function () { /* offline */ });
    api.messages({ after: 0 }).then(function (r) {
      if (r.epoch !== S.epoch) { S.epoch = r.epoch; store.set('epoch', r.epoch); }
      setMembers(r.members);
      var pend = S.msgs.filter(function (m) { return !m.id; });
      S.msgs = r.messages.concat(pend);
      S.hasOlder = r.messages.length >= 300;
      api.setLastId(maxId());
      cacheMsgs(); renderAll(); updateHeader(); markRead();
    }).catch(function () { /* offline: cached messages shown */ });
    api.connect();
  }
  function teardownChat() {
    if (S.rec) { S.rec.cancel(); S.rec = null; }
    api.disconnect();
    ui = {};
    document.onkeydown = null;
  }

  api.on('msg', function (list) {
    if (!ui.list) return;
    var fresh = false, mineOnly = true;
    list.forEach(function (m) {
      if (S.msgs.some(function (x) { return x.id === m.id; })) return;
      var p = m.clientId && m.from === S.meId && S.msgs.find(function (x) { return !x.id && x.clientId === m.clientId; });
      if (p) { replacePending(p, m); return; }
      S.msgs.push(m); appendRow(m); fresh = true;
      if (m.from !== S.meId) { mineOnly = false; delete S.typing[m.from]; }
    });
    if (!fresh) return;
    cacheMsgs();
    if (!mineOnly) {
      updateHeader();
      ding();
      if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* no */ }
    }
    if (nearBottom(160) || mineOnly) scrollBottom(); else ui.pill.hidden = false;
    markRead(); updateBadge();
  });
  api.on('read', function (r) {
    if (r.member && S.members[r.member]) S.members[r.member].read = Math.max(S.members[r.member].read || 0, r.upTo);
    updateTicks(); updateBadge();
  });
  api.on('members', function (r) {
    setMembers(r.members);
    if (r.epoch && r.epoch !== S.epoch && ui.list) { S.epoch = r.epoch; store.set('epoch', r.epoch); onCleared(); }
    updateTicks(); updateBadge(); updateHeader();
  });
  api.on('member', function (r) {
    var old = S.members[r.member.id];
    setMembers([r.member]);
    if (!ui.list) return;
    if (!old || old.name !== r.member.name || old.avatar !== r.member.avatar || old.color !== r.member.color) renderAll(true);
    updateHeader();
  });
  api.on('presence', function (r) { S.online = r.online || []; updateHeader(); });
  api.on('typing', function (r) {
    if (r.member === S.meId) return;
    S.typing[r.member] = Date.now() + 4000; updateHeader(); setTimeout(updateHeader, 4100);
  });
  api.on('cleared', function () { onCleared(); });
  function onCleared() {
    if (!ui.list) return;
    S.msgs = []; Object.keys(S.members).forEach(function (k) { S.members[k].read = 0; });
    cacheMsgs(); renderAll(); toast('The chat was cleared 🧹');
  }

  function updateHeader() {
    if (!ui.status) return;
    var fam = others(false);
    ui.faces.innerHTML = '';
    fam.slice(0, 4).forEach(function (m) {
      var a = avatarEl(m, 40);
      a.appendChild(h('i', { class: 'dot' + (S.online.indexOf(m.id) >= 0 ? ' on' : '') }));
      ui.faces.appendChild(a);
    });
    if (!fam.length) ui.faces.appendChild(h('span', { class: 'av', style: 'background:#fff;width:40px;height:40px;font-size:24px' }, '💬'));
    var now = Date.now();
    var typers = fam.filter(function (m) { return (S.typing[m.id] || 0) > now; });
    var on = fam.filter(function (m) { return S.online.indexOf(m.id) >= 0; });
    if (typers.length) ui.status.textContent = names(typers) + (typers.length > 1 ? ' are' : ' is') + ' typing…';
    else if (on.length) ui.status.textContent = names(on) + ' online now';
    else ui.status.textContent = fam.length ? 'With ' + names(fam) : 'Waiting for family to join';
    showTyping(typers);
  }
  function showTyping(typers) {
    var t = document.getElementById('typing');
    if (typers.length && !t) {
      ui.list.appendChild(h('div', { class: 'typing', id: 'typing' }, avatarEl(typers[0], 26), h('i'), h('i'), h('i')));
      if (nearBottom(160)) scrollBottom();
    }
    if (!typers.length && t) t.remove();
  }

  function nearBottom(px) { var l = ui.list; return !l || l.scrollHeight - l.scrollTop - l.clientHeight < (px || 60); }
  function scrollBottom(smooth) {
    if (!ui.list) return;
    ui.pill.hidden = true;
    requestAnimationFrame(function () { ui.list.scrollTo({ top: ui.list.scrollHeight, behavior: smooth ? 'smooth' : 'auto' }); });
  }

  var readT;
  function myRead() { return (S.members[S.meId] && S.members[S.meId].read) || 0; }
  function markRead() {
    clearTimeout(readT);
    readT = setTimeout(function () {
      if (!ui.list || document.visibilityState !== 'visible' || !nearBottom(160)) return;
      var top = 0;
      S.msgs.forEach(function (m) { if (m.id && m.from !== S.meId && m.id > top) top = m.id; });
      if (top > myRead()) { if (S.members[S.meId]) S.members[S.meId].read = top; api.read(top).catch(function () {}); }
      updateBadge();
    }, 400);
  }
  function unreadCount() { var r = myRead(); return S.msgs.filter(function (m) { return m.id && m.from !== S.meId && m.id > r; }).length; }
  function updateBadge() {
    var n = ui.list ? unreadCount() : 0;
    document.title = (n ? '(' + n + ') ' : '') + 'Family Chat';
    try { if (n && navigator.setAppBadge) navigator.setAppBadge(n); else if (navigator.clearAppBadge) navigator.clearAppBadge(); } catch (e) { /* unsupported */ }
  }

  // ---------- message rendering ----------
  var lastRendered = null;
  function renderAll(keepScroll) {
    if (!ui.list) return;
    var y = ui.list.scrollTop, bottom = nearBottom(160);
    ui.list.innerHTML = '';
    lastRendered = null;
    if (S.hasOlder) ui.list.appendChild(h('button', { type: 'button', class: 'older', onclick: loadOlder }, '⬆ Show older messages'));
    if (!S.msgs.length) {
      ui.list.appendChild(h('div', { class: 'empty', id: 'empty' }, h('span', { class: 'big' }, '👋'),
        'Say hi to your family!', h('br'), 'Send a message, a sticker or a voice note.'));
    }
    S.msgs.forEach(appendRow);
    updateTicks();
    if (keepScroll && !bottom) ui.list.scrollTop = y; else scrollBottom();
  }
  function loadOlder() {
    var first = S.msgs.find(function (m) { return m.id; });
    if (!first) return;
    api.messages({ before: first.id }).then(function (r) {
      S.msgs = r.messages.concat(S.msgs); S.hasOlder = r.messages.length >= 300;
      var y = ui.list.scrollHeight - ui.list.scrollTop;
      renderAll(); ui.list.scrollTop = ui.list.scrollHeight - y;
    }).catch(function () { toast('No internet 📶'); });
  }
  function appendRow(m) {
    var e = document.getElementById('empty'); if (e) e.remove();
    var k = fmt.dayKey(m.ts);
    var t = document.getElementById('typing');   // the "typing…" dots always stay last
    var put = function (el) { if (t) ui.list.insertBefore(el, t); else ui.list.appendChild(el); };
    var newDay = !lastRendered || fmt.dayKey(lastRendered.ts) !== k;
    if (newDay) put(h('div', { class: 'day' }, fmt.day(m.ts)));
    var same = !newDay && lastRendered.from === m.from;
    var row = buildRow(m, same);
    put(row);
    lastRendered = m;
  }
  function buildRow(m, same) {
    var mine = m.from === S.meId, who = member(m.from);
    var row = h('div', { class: 'row ' + (mine ? 'me' : 'them') + (same ? ' same' : '') + (m.id ? '' : ' pending'), 'data-id': m.id || '', 'data-cid': m.clientId || '', 'data-from': m.from || '' });
    var body;
    if (m.kind === 'sticker') {
      var s = FC.sticker(m.text);
      body = h('div', { class: 'sticker', style: 'background:' + s.c }, h('span', { class: 'se' }, s.e), h('span', { class: 'st' }, s.t));
    } else if (m.kind === 'voice') {
      body = voiceBubble(m);
    } else {
      var jumbo = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|\u200d|\ufe0f|\s){1,8}$/u.test(m.text) && !/^[\d#*\s]+$/.test(m.text);
      body = h('div', { class: 'bubble' + (jumbo ? ' jumbo' : '') }, m.text);
    }
    var col = h('div', { class: 'col' });
    if (!mine && !same) col.appendChild(h('div', { class: 'sender', style: 'color:' + who.color }, who.name));
    col.appendChild(body);
    var meta = h('div', { class: 'meta' }, fmt.time(m.ts));
    if (mine) {
      if (m.failed) meta.appendChild(h('button', { type: 'button', class: 'fail', onclick: function () { retry(m); } }, '❗ Not sent · tap to try again'));
      else if (!m.id) meta.appendChild(h('span', { class: 'tick' }, '🕓'));
      else meta.appendChild(h('span', { class: 'tick' }, '✓'));
    }
    col.appendChild(meta);
    if (!mine) row.appendChild(same ? h('span', { class: 'av-gap' }) : avatarEl(who, 36, 'row-av'));
    row.appendChild(col);
    m._row = row;
    return row;
  }
  /** ✓ Sent · ✓✓ Seen (everyone) · ✓✓ Seen by Baba (some of the family). */
  function updateTicks() {
    if (!ui.list) return;
    var fam = others(false);
    ui.list.querySelectorAll('.row.me[data-id]').forEach(function (r) {
      var id = +r.getAttribute('data-id'); if (!id) return;
      var t = r.querySelector('.tick'); if (!t) return;
      var readers = fam.filter(function (o) { return (o.read || 0) >= id; });
      var all = fam.length && readers.length === fam.length;
      t.textContent = !readers.length ? '✓ Sent' : all ? '✓✓ Seen' : '✓✓ Seen by ' + names(readers);
      t.className = 'tick' + (readers.length ? ' seen' : '');
    });
  }
  function replacePending(p, m) {
    var i = S.msgs.indexOf(p);
    if (m.voice && p.localUrl) m.localUrl = p.localUrl;
    S.msgs[i] = m;
    var row = buildRow(m, p._row && p._row.classList.contains('same'));
    if (p._row && p._row.parentNode) p._row.parentNode.replaceChild(row, p._row);
    if (lastRendered === p) lastRendered = m;
    cacheMsgs(); updateTicks();
  }

  // ---------- voice memo bubble + player ----------
  var playing = null;   // { m, bars, btn, dur }
  function voiceBubble(m) {
    var peaks = (m.voice && m.voice.peaks && m.voice.peaks.length) ? m.voice.peaks : fmt.peaks([], 40);
    var bars = h('div', { class: 'wave' }, peaks.map(function (p) { return h('i', { style: 'height:' + Math.max(10, p) + '%' }); }));
    var dur = (m.voice && m.voice.dur) || 0;
    var label = h('span', { class: 'vd' }, fmt.dur(dur));
    var btn = h('button', { type: 'button', class: 'play', 'aria-label': 'Play voice memo' }, '▶');
    var box = h('div', { class: 'bubble voice' }, btn, bars, label);
    function seek(ev) {
      if (!playing || playing.m !== m || !dur) return;
      var r = bars.getBoundingClientRect();
      player.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * dur;
    }
    btn.addEventListener('click', function () { togglePlay(m, { box: box, bars: bars, btn: btn, label: label, dur: dur }); });
    bars.addEventListener('click', seek);
    if (m.voice && m.voice.id && !m.localUrl) api.voiceUrl(m.voice.id).then(function (u) { m.localUrl = u; }).catch(function () {});
    return box;
  }
  function paintProgress(v, frac) {
    var n = v.bars.children.length, on = Math.round(frac * n);
    for (var i = 0; i < n; i++) v.bars.children[i].className = i < on ? 'on' : '';
  }
  function stopPlaying() {
    if (!playing) return;
    player.pause();
    playing.v.btn.textContent = '▶'; playing.v.box.classList.remove('loading');
    paintProgress(playing.v, 0); playing.v.label.textContent = fmt.dur(playing.v.dur);
    playing = null;
  }
  function togglePlay(m, v) {
    if (playing && playing.m === m) { stopPlaying(); return; }
    stopPlaying();
    playing = { m: m, v: v };
    var go = function (url) {
      if (!playing || playing.m !== m) return;
      v.box.classList.remove('loading');
      if (player.src !== url) player.src = url;
      player.currentTime = 0;
      var p = player.play();
      v.btn.textContent = '❚❚';
      if (p && p.catch) p.catch(function () { stopPlaying(); toast('Tap ▶ again to listen'); });
    };
    if (m.localUrl) go(m.localUrl);
    else {
      v.box.classList.add('loading');
      api.voiceUrl(m.voice.id).then(function (u) { m.localUrl = u; go(u); })
        .catch(function (e) { stopPlaying(); toast(e.status === 404 ? 'This voice memo is gone' : 'No internet 📶'); });
    }
  }
  player.addEventListener('timeupdate', function () {
    if (!playing) return;
    var d = playing.v.dur || player.duration || 1;
    if (!isFinite(d)) d = 1;
    paintProgress(playing.v, Math.min(1, player.currentTime / d));
    playing.v.label.textContent = fmt.dur(player.currentTime);
  });
  player.addEventListener('ended', stopPlaying);

  // ---------- sending ----------
  function addPending(m) {
    m.clientId = m.clientId || uid(); m.from = S.meId; m.ts = Date.now();
    S.msgs.push(m); appendRow(m); scrollBottom(true);
    return m;
  }
  function deliver(m) {
    m.failed = false;
    var call = m.kind === 'voice' ? api.sendVoice(m.blob, m.voice.dur, m.voice.peaks, m.clientId) : api.sendText(m.text, m.kind, m.clientId);
    return call.then(function (r) {
      if (S.msgs.indexOf(m) >= 0) replacePending(m, r.msg);
      ding(true);
    }).catch(function (e) {
      if (e.status === 401) return;
      m.failed = true;
      if (m._row && m._row.parentNode) { var old = m._row; old.parentNode.replaceChild(buildRow(m), old); }
      if (e.code === 'too_big') toast('That voice memo is too long');
    });
  }
  function retry(m) {
    m.failed = false;
    if (m._row && m._row.parentNode) { var old = m._row; old.parentNode.replaceChild(buildRow(m), old); }
    deliver(m);
  }
  function sendText() {
    var v = ui.input.value.trim();
    if (!v) return;
    ui.input.value = ''; autosize(); renderSendBtn();
    deliver(addPending({ kind: 'text', text: v }));
    ui.input.focus();
  }
  function sendSticker(id) { deliver(addPending({ kind: 'sticker', text: id })); }

  // ---------- composer ----------
  var typingSent = 0;
  function autosize() { var t = ui.input; if (!t) return; t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; }
  function renderSendBtn() {
    if (!ui.action) return;
    var hasText = !!ui.input.value.trim();
    ui.action.className = 'round ' + (hasText ? 'send' : 'mic');
    ui.action.textContent = hasText ? '➤' : '🎤';
    ui.action.setAttribute('aria-label', hasText ? 'Send' : 'Record a voice memo');
  }
  function renderComposer() {
    var c = ui.composer;
    c.className = 'composer'; c.innerHTML = '';
    ui.emo = h('button', { type: 'button', class: 'round emo' + (S.picker ? ' on' : ''), 'aria-label': 'Stickers and emoji', onclick: togglePicker }, S.picker ? '⌨️' : '😀');
    ui.input = h('textarea', { rows: '1', placeholder: 'Type here…', 'aria-label': 'Message', maxlength: '2000', enterkeyhint: 'send' });
    ui.input.addEventListener('input', function () {
      autosize(); renderSendBtn();
      if (Date.now() - typingSent > 2500 && ui.input.value) { typingSent = Date.now(); api.typing(); }
    });
    ui.input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !('ontouchstart' in window)) { e.preventDefault(); sendText(); } });
    ui.input.addEventListener('focus', function () { if (S.picker) { S.picker = null; renderPicker(); } setTimeout(function () { scrollBottom(); }, 300); });
    ui.action = h('button', { type: 'button', class: 'round mic' });
    var downAt = 0, holdT = null, held = false;
    ui.action.addEventListener('pointerdown', function (e) {
      if (ui.input.value.trim()) return;
      e.preventDefault();
      downAt = Date.now(); held = false;
      // The 🎤 button is replaced by the recording bar right away, so the "let go" is heard on the window.
      window.addEventListener('pointerup', up, { once: true });
      window.addEventListener('pointercancel', up, { once: true });
      startRecording();
      holdT = setTimeout(function () { held = true; showHint('Let go to send 🚀'); }, 450);
    });
    function up() {
      clearTimeout(holdT);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (!downAt) return;
      downAt = 0;
      if (held) { held = false; showHint(''); finishRecording(true); }
      else showHint('Talk! Then tap ✅ to send');
    }
    ui.action.addEventListener('click', function () { if (ui.input.value.trim()) sendText(); });
    c.appendChild(ui.emo); c.appendChild(ui.input); c.appendChild(ui.action);
    renderSendBtn();
  }
  function showHint(t) { if (!ui.hint) return; ui.hint.textContent = t; ui.hint.hidden = !t; }

  function startRecording() {
    if (S.rec) return;
    if (!FC.recorderSupported()) { toast('Voice memos need a newer phone browser'); return; }
    stopPlaying();
    var c = ui.composer, levels = [];
    var time = h('span', { class: 'rec-time' }, '0:00');
    var wave = h('div', { class: 'rec-wave' });
    var rec = FC.createRecorder({ maxSec: cfg.MAX_VOICE_SEC, onTick: function (sec, lvl) {
      time.textContent = fmt.dur(sec);
      levels.push(lvl);
      wave.appendChild(h('i', { style: 'height:' + Math.max(8, Math.round(lvl * 100)) + '%' }));
      if (wave.children.length > 80) wave.removeChild(wave.firstChild);
      if (sec >= cfg.MAX_VOICE_SEC) finishRecording(true);
    } });
    S.rec = rec;
    c.className = 'composer rec'; c.innerHTML = '';
    c.appendChild(h('button', { type: 'button', class: 'round trash', 'aria-label': 'Delete recording', onclick: function () { finishRecording(false); } }, '🗑️'));
    c.appendChild(h('div', { class: 'rec-mid' }, h('i', { class: 'rec-dot' }), time, wave));
    c.appendChild(h('button', { type: 'button', class: 'round send', 'aria-label': 'Send voice memo', id: 'rec-send', onclick: function () { finishRecording(true); } }, '✅'));
    rec.start().catch(function (e) {
      if (S.rec !== rec) return;
      S.rec = null; renderComposer(); showHint('');
      if (e && e.message !== 'cancelled') toast('Please allow the microphone 🎤 to send voice memos', 4000);
    });
  }
  function finishRecording(send) {
    var rec = S.rec;
    if (!rec) return;
    S.rec = null;
    showHint('');
    var p = send ? rec.stop() : rec.cancel();
    renderComposer();
    p.then(function (r) {
      if (!send || !r) return;
      if (r.dur < 0.8 || !r.blob.size) { toast('Hold the 🎤 a bit longer'); return; }
      var m = addPending({ kind: 'voice', voice: { dur: r.dur, peaks: r.peaks, mime: r.mime }, blob: r.blob });
      m.localUrl = URL.createObjectURL(r.blob);
      deliver(m);
    });
  }

  // ---------- sticker / emoji picker ----------
  function togglePicker() {
    S.picker = S.picker ? null : 'st';
    if (S.picker) ui.input.blur();
    renderPicker(); renderComposer();
  }
  function renderPicker() {
    var box = ui.pickerBox; box.innerHTML = '';
    if (!S.picker) return;
    var grid;
    if (S.picker === 'st') {
      grid = h('div', { class: 'grid st scroll' }, FC.STICKERS.map(function (s) {
        return h('button', { type: 'button', style: 'background:' + s.c, 'aria-label': s.t, onclick: function () { sendSticker(s.id); } }, h('span', null, s.e), s.t);
      }));
    } else {
      grid = h('div', { class: 'grid em scroll' }, FC.EMOJI.map(function (e) {
        return h('button', { type: 'button', onclick: function () { ui.input.value += e; autosize(); renderSendBtn(); } }, e);
      }));
    }
    box.appendChild(h('div', { class: 'picker' },
      h('div', { class: 'tabs' },
        h('button', { type: 'button', class: S.picker === 'st' ? 'on' : '', onclick: function () { S.picker = 'st'; renderPicker(); } }, '🌟 Stickers'),
        h('button', { type: 'button', class: S.picker === 'em' ? 'on' : '', onclick: function () { S.picker = 'em'; renderPicker(); } }, '😀 Emoji')),
      grid));
    scrollBottom();
  }

  // ---------- notifications ----------
  function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
  function keyBytes(b64) {
    var s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4));
    var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i); return a;
  }
  function subscribePush() {
    if (!S.pushKey) return Promise.reject(new Error('no_key'));
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription().then(function (sub) {
        return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(S.pushKey) });
      });
    }).then(function (sub) { return api.pushSubscribe(sub.toJSON()); }).then(function () { S.push = true; });
  }
  function enablePush() {
    if (!pushSupported()) {
      toast(isIOS() && !standalone() ? 'First add Family Chat to the Home Screen (Share ⬆ → Add to Home Screen)' : 'This browser can\'t show message alerts', 5000);
      return Promise.resolve(false);
    }
    return Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') { toast('Alerts are off. You can allow them in the phone settings.', 4000); return false; }
      return subscribePush().then(function () { toast('🔔 Alerts are on!'); return true; });
    }).catch(function () { toast('Could not turn on alerts. Try again later.'); return false; });
  }
  function autoPush() {
    // Permission already given (e.g. the subscription expired): quietly subscribe again.
    if (pushSupported() && S.pushKey && Notification.permission === 'granted' && !S.push) subscribePush().catch(function () {});
  }
  function renderBanners() {
    if (!ui.banners) return;
    ui.banners.innerHTML = '';
    if (store.get('hideBanner') === '1') return;
    if (isIOS() && !standalone()) {
      ui.banners.appendChild(h('div', { class: 'banner' }, '📲', h('span', null, 'Add me to the Home Screen: tap Share ⬆ then “Add to Home Screen”.'),
        h('button', { type: 'button', class: 'x', 'aria-label': 'Hide', onclick: function () { store.set('hideBanner', '1'); renderBanners(); } }, '✕')));
    } else if (pushSupported() && S.pushKey && Notification.permission === 'default') {
      ui.banners.appendChild(h('div', { class: 'banner' }, '🔔', h('span', null, 'Get a ding when your family writes?'),
        h('button', { type: 'button', onclick: function () { enablePush().then(renderBanners); } }, 'Yes!'),
        h('button', { type: 'button', class: 'x', 'aria-label': 'Hide', onclick: function () { store.set('hideBanner', '1'); renderBanners(); } }, '✕')));
    }
  }
  function clearNotifications() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(function (reg) {
      if (reg.getNotifications) reg.getNotifications().then(function (ns) { ns.forEach(function (n) { n.close(); }); });
    }).catch(function () {});
  }

  // ---------- sheets: Settings / Parents ----------
  function sheet(title, build) {
    var wrap = h('div', { class: 'sheet-wrap', role: 'dialog', 'aria-label': title });
    function close() { wrap.remove(); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) close(); });
    var s = h('div', { class: 'sheet' }, h('h2', null, title, h('button', { type: 'button', class: 'close', 'aria-label': 'Close', onclick: close }, '✕')));
    build(s, close);
    wrap.appendChild(s);
    document.body.appendChild(wrap);
    return { close: close, el: s };
  }
  function versionLabel() { var v = window.APP_VERSION || {}; return 'Version ' + v.version + (v.built ? ' (' + v.built + ')' : ''); }

  function openSettings() {
    sheet('⚙️ Settings', function (s, close) {
      var m = me();
      s.appendChild(h('div', { class: 'card me-card' },
        h('div', { class: 'me-row' }, avatarEl(m, 56), h('div', { class: 'n' }, h('b', { id: 'my-name' }, m.name), h('small', null, m.admin ? '👑 Parent (admin)' : 'Family member')),
          h('button', { type: 'button', class: 'edit-btn', id: 'edit-me-btn', onclick: function () { close(); openEditMe(); } }, '✏️ Edit')),
        h('p', null, '🔒 This phone stays signed in. No code needed again.')));
      var pushState = !pushSupported() ? (isIOS() && !standalone() ? 'Add to Home Screen first (Share ⬆ → Add to Home Screen)' : 'Not available in this browser')
        : Notification.permission === 'granted' && S.push ? 'On ✅' : Notification.permission === 'denied' ? 'Blocked in phone settings' : 'Off';
      var pushCard = h('div', { class: 'card' }, h('h3', null, '🔔 Message alerts'), h('p', null, pushState));
      if (pushSupported() && !(Notification.permission === 'granted' && S.push) && Notification.permission !== 'denied') {
        pushCard.appendChild(h('button', { type: 'button', class: 'big-btn green', onclick: function () { enablePush().then(function () { close(); openSettings(); }); } }, 'Turn on alerts'));
      }
      s.appendChild(pushCard);
      var sw = h('span', { class: 'sw' + (S.sound ? ' on' : '') });
      s.appendChild(h('div', { class: 'card' }, h('div', { class: 'toggle-row', role: 'switch', 'aria-checked': String(S.sound), onclick: function () {
        S.sound = !S.sound; store.set('sound', S.sound ? 'on' : 'off'); sw.className = 'sw' + (S.sound ? ' on' : ''); if (S.sound) { unlock(); ding(); }
      } }, '🔊 Sounds', sw)));
      var upd = h('button', { type: 'button', class: 'big-btn blue', id: 'update-btn', onclick: function () {
        upd.disabled = true; upd.textContent = 'Checking… 🔎';
        updater.manualUpdate().then(function (r) {
          toast(FC.UPDATE_MSG[r] || FC.UPDATE_MSG.latest);
          if (r !== 'updating') { upd.disabled = false; upd.textContent = '🔄 Update app'; }
        });
      } }, '🔄 Update app');
      s.appendChild(h('div', { class: 'card' }, upd, h('div', { class: 'version', id: 'version-label' }, versionLabel())));
      s.appendChild(h('button', { type: 'button', class: 'big-btn gray', id: 'parents-btn', onclick: function () { close(); openPin(); } }, '👨‍👦 Parents'));
      s.appendChild(signOutBtn(close));
    });
  }

  function openEditMe() {
    sheet('✏️ My name & picture', function (s, close) {
      s.appendChild(profileEditor(me(), function (p) {
        api.editMe(p).then(function (r) { setMembers([r.member]); close(); renderAll(true); updateHeader(); toast('Saved ✅'); })
          .catch(function (e) { toast(e.code === 'offline' ? 'No internet 📶' : 'Could not save, try again'); });
      }, 'Save ✅'));
    });
  }

  function openPin() {
    var pin = '', busy = false;
    var dots = h('div', { class: 'pin-dots' });
    for (var i = 0; i < PARENT_PIN_LEN; i++) dots.appendChild(h('i'));
    var line = h('div', { class: 'msgline' }, 'Grown-ups only: type the Parents PIN');
    var sh = sheet('👨‍👦 Parents', function (s) {
      s.appendChild(dots); s.appendChild(line);
      s.appendChild(h('div', { style: 'display:flex;justify-content:center' }, keypad(key)));
    });
    function paint() { [].forEach.call(dots.children, function (d, i) { d.className = i < pin.length ? 'full' : ''; }); }
    function key(k) {
      if (busy) return;
      if (k === 'del') pin = pin.slice(0, -1);
      else if (k !== 'go' && pin.length < PARENT_PIN_LEN) pin += k;
      paint();
      if (pin.length === PARENT_PIN_LEN && (k === 'go' || k !== 'del')) check();
    }
    function check() {
      busy = true; line.textContent = 'Checking…'; line.className = 'msgline';
      var P = api.parent(pin);
      // The right PIN (checked by the server) makes this phone a parent/admin.
      P.unlock().then(function () {
        if (S.members[S.meId]) S.members[S.meId].admin = true;
        sh.close(); openParent(P);
      }).catch(function (e) {
        busy = false; pin = ''; paint();
        line.className = 'msgline err';
        line.textContent = e.code === 'wrong_pin' ? 'Wrong PIN' : e.code === 'too_many_tries' ? 'Too many tries. Wait 15 minutes.' : e.code === 'offline' ? 'No internet 📶' : 'Try again';
      });
    }
  }

  function openParent(P) {
    sheet('👨‍👦 Parents', function (s) {
      var codeCard = h('div', { class: 'card', id: 'code-card' }, h('h3', null, '🔑 Family code'), h('p', null, 'Loading…'));
      var devCard = h('div', { class: 'card', id: 'devices-card' }, h('h3', null, '📱 Phones in the chat'), h('p', null, 'Loading…'));
      var infoCard = h('div', { class: 'card' }, h('h3', null, '🧹 Chat'), h('p', { id: 'chat-info' }, '…'),
        h('button', { type: 'button', class: 'big-btn red', id: 'clear-btn', onclick: function () {
          if (!confirm('Delete ALL messages and voice notes for everyone?')) return;
          P.clear().then(function () { toast('Chat cleared 🧹'); refresh(); }).catch(err);
        } }, 'Clear the whole chat'));
      s.appendChild(codeCard); s.appendChild(devCard); s.appendChild(infoCard);
      function err(e) { toast(e.code === 'offline' ? 'No internet 📶' : 'Something went wrong (' + e.code + ')'); }
      function refresh() {
        P.status().then(function (st) {
          codeCard.innerHTML = '';
          codeCard.appendChild(h('h3', null, '🔑 Family code'));
          codeCard.appendChild(h('p', null, 'Typed only ONCE on each new phone. Phones already in the chat stay connected, even when you change the code.'));
          codeCard.appendChild(h('p', null, 'Last changed: ' + (st.codeSetAt ? fmt.day(st.codeSetAt) + ', ' + fmt.time(st.codeSetAt) : 'never') +
            ' · wrong tries since: ' + st.wrongTriesSinceCode + ' of 50'));
          if (st.joinClosed) codeCard.appendChild(h('p', { class: 'warn' }, '⚠️ Too many wrong codes were typed, so joining is closed. Change the code to open it again.'));
          var shown = h('div');
          codeCard.appendChild(shown);
          var showBtn = h('button', { type: 'button', class: 'big-btn green', id: 'show-code-btn', onclick: function () {
            if (shown.querySelector('#current-code')) { shown.innerHTML = ''; showBtn.textContent = '👀 Show code'; return; }
            P.showCode().then(function (r) {
              shown.innerHTML = '';
              shown.appendChild(h('div', { class: 'code-show', id: 'current-code' }, r.code));
              shown.appendChild(h('p', null, 'Type it on the new phone, then tap Hide. Keep it in the family.'));
              showBtn.textContent = '🙈 Hide code';
            }).catch(err);
          } }, '👀 Show code');
          codeCard.appendChild(showBtn);
          codeCard.appendChild(h('button', { type: 'button', class: 'big-btn', id: 'rotate-btn', onclick: function () {
            if (!confirm('Change the family code? The old code stops working for NEW phones. Phones already in the chat stay connected.')) return;
            P.rotate().then(function (r) {
              shown.innerHTML = '';
              shown.appendChild(h('div', { class: 'code-show', id: 'current-code' }, r.code));
              shown.appendChild(h('p', null, 'New code ✅ You can see it again any time with Show code.'));
              showBtn.textContent = '🙈 Hide code';
            }).catch(err);
          } }, '🔁 Change code'));
          devCard.innerHTML = '';
          devCard.appendChild(h('h3', null, '📱 Phones in the chat (' + st.devices.length + ')'));
          st.devices.forEach(function (d) {
            devCard.appendChild(h('div', { class: 'dev' }, avatarEl(d, 40),
              h('div', { class: 'n' }, d.name + (d.admin ? ' 👑' : ''), h('small', null, d.device + ' · ' + (d.online ? '🟢 online' : 'seen ' + fmt.ago(d.lastSeen)) + (d.push ? ' · 🔔' : ''))),
              d.me ? h('span', { class: 'tag' }, 'This phone') : h('button', { type: 'button', 'data-remove': d.id, 'data-name': d.name, onclick: function () {
                if (!confirm('Remove "' + d.name + '" (' + d.device + ') from the chat? It will need the code to come back.')) return;
                P.removeDevice(d.id).then(function () { toast('Removed ✅'); refresh(); }).catch(err);
              } }, 'Remove')));
          });
          document.getElementById('chat-info').textContent = st.messages + ' messages · voice notes ' + (st.voiceBytes / 1048576).toFixed(1) + ' MB · storage ' +
            (st.storageBytes / 1048576).toFixed(1) + ' MB of 1 GB';
        }).catch(err);
      }
      refresh();
    });
  }
  function signOutBtn(close) {
    return h('button', { type: 'button', class: 'big-btn gray', id: 'signout-btn', onclick: function () {
      if (!confirm('Sign this phone out of the chat? The family code is needed to come back.')) return;
      close(); api.leave().then(function () { ['msgs', 'epoch', 'members'].forEach(store.del); showWho(); });
    } }, '🚪 Sign out this phone');
  }

  // ---------- updates ----------
  var banner = document.getElementById('update-banner');
  var updater = FC.createUpdater({
    navigator: navigator, document: document, reload: function () { location.reload(); },
    onBanner: function () {
      updater.waitingVersion().then(function (v) { banner.textContent = v ? '✨ New version ' + v.version + '! Tap to update' : '✨ New version! Tap to update'; });
      banner.hidden = false;
    }
  });
  banner.addEventListener('click', function () { banner.textContent = 'Updating… 🚀'; updater.applyUpdate(); });
  if ('serviceWorker' in navigator && !/[?&]nosw\b/.test(location.search)) {
    updater.register('./sw.js');
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'PUSH' && ui.list) api.catchUp();
    });
  }
  setInterval(function () { updater.check(); }, 30 * 60 * 1000);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || !ui.list) return;
    clearNotifications();
    api.catchUp(); api.connect(); markRead();
  });

  // ---------- start ----------
  restoreSignIn().then(function () {
    if (api.signedIn() && store.get('memberId')) { keepStorage(); showChat(); } else showWho();
  });
  clearNotifications();
  window.FCApp = { state: S, api: api };   // for tests / debugging
})();
