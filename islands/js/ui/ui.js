/* Small UI toolkit: DOM helpers, hand-drawn SVG icons, popup layer with bouncy open/close, toasts, fly-to-counter,
 * screen router and the shared app state (SI.app). */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {};
  var A = SI.app = { S: null, persist: function () {}, test: false };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function $(sel, par) { return (par || document).querySelector(sel); }
  function on(e, fn, quiet) { e.addEventListener('click', function (ev) { if (!quiet && SI.audio) SI.audio.play('tap'); fn(ev); }); return e; }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var ICON = {
    coin: '<svg viewBox="0 0 48 48"><circle cx="24" cy="25" r="21" fill="#c97a00"/><circle cx="24" cy="23" r="21" fill="#ffb300" stroke="#a85f00" stroke-width="2.5"/><circle cx="24" cy="23" r="15" fill="#ffd84a" stroke="#e09a00" stroke-width="2"/><path d="M24 12l3.2 6.6 7.2 1-5.2 5 1.2 7.2L24 28.4l-6.4 3.4 1.2-7.2-5.2-5 7.2-1z" fill="#fff4a8" stroke="#e09a00" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    gem: '<svg viewBox="0 0 48 48"><path d="M10 6h28l8 12-22 26L2 18z" fill="#2fb7ff" stroke="#0a5a9a" stroke-width="3" stroke-linejoin="round"/><path d="M2 18h44M17 6l-5 12 12 26M31 6l5 12-12 26" fill="none" stroke="#bff0ff" stroke-width="2" stroke-linejoin="round"/><path d="M10 6l7 12h14l7-12" fill="#7fdcff" stroke="#0a5a9a" stroke-width="2" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 48 48"><path d="M24 3l6.2 13.4 14.6 1.8-10.8 10 2.8 14.4L24 35.2 11.2 42.6 14 28.2 3.2 18.2l14.6-1.8z" fill="#ffd23f" stroke="#b36b00" stroke-width="3" stroke-linejoin="round"/><path d="M24 11l3.6 8 8.6 1-6.4 5.8" fill="none" stroke="#fff4b0" stroke-width="2.5" stroke-linecap="round"/></svg>',
    starOff: '<svg viewBox="0 0 48 48"><path d="M24 3l6.2 13.4 14.6 1.8-10.8 10 2.8 14.4L24 35.2 11.2 42.6 14 28.2 3.2 18.2l14.6-1.8z" fill="#8d7fc0" stroke="#5a4a96" stroke-width="3" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 48 48"><path d="M20 3h8l1.2 5.4 4 1.7 4.7-3 5.6 5.6-3 4.7 1.7 4L47 20v8l-5.4 1.2-1.7 4 3 4.7-5.6 5.6-4.7-3-4 1.7L28 45h-8l-1.2-5.4-4-1.7-4.7 3-5.6-5.6 3-4.7-1.7-4L1 28v-8l5.4-1.2 1.7-4-3-4.7 5.6-5.6 4.7 3 4-1.7z" fill="#e9e4ff" stroke="#5a4a96" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="8" fill="#8d7fc0" stroke="#5a4a96" stroke-width="3"/></svg>',
    hanger: '<svg viewBox="0 0 48 48"><path d="M24 14c0-4 6-5 6-10s-9-4-9 1" fill="none" stroke="#7a3cf0" stroke-width="4.5" stroke-linecap="round"/><path d="M24 14L5 31c-2 2-1 5 2 5h34c3 0 4-3 2-5z" fill="none" stroke="#7a3cf0" stroke-width="4.5" stroke-linejoin="round"/></svg>',
    lock: '<svg viewBox="0 0 48 48"><path d="M14 22v-6a10 10 0 0 1 20 0v6" fill="none" stroke="#d8d2f0" stroke-width="5"/><rect x="9" y="21" width="30" height="22" rx="5" fill="#ffc21f" stroke="#8a5200" stroke-width="3"/><circle cx="24" cy="31" r="3.6" fill="#8a5200"/><rect x="22.5" y="31" width="3" height="7" fill="#8a5200"/></svg>',
    back: '<svg viewBox="0 0 48 48"><path d="M30 8L14 24l16 16" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 48 48"><path d="M13 13l22 22M35 13L13 35" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 48 48"><path d="M10 25l9 9 19-20" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 48 48"><path d="M14 8l28 16-28 16z" fill="#2a1a5e" stroke="#2a1a5e" stroke-width="4" stroke-linejoin="round"/></svg>',
    menu: '<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="6" rx="3" fill="#fff"/><rect x="8" y="21" width="32" height="6" rx="3" fill="#fff"/><rect x="8" y="32" width="32" height="6" rx="3" fill="#fff"/></svg>',
    scroll: '<svg viewBox="0 0 48 48"><rect x="9" y="5" width="30" height="38" rx="6" fill="#fff6dc" stroke="#7a4a1c" stroke-width="3"/><path d="M16 15h16M16 23h16M16 31h9" stroke="#c9a46a" stroke-width="3.5" stroke-linecap="round"/><path d="M30 33l3 3 6-7" fill="none" stroke="#2eaa3b" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    book: '<svg viewBox="0 0 48 48"><path d="M5 10q10-4 19 2 9-6 19-2v30q-10-4-19 2-9-6-19-2z" fill="#8d6bff" stroke="#3f2a96" stroke-width="3" stroke-linejoin="round"/><path d="M24 12v30" stroke="#3f2a96" stroke-width="3"/><path d="M10 17q6-1 10 2M10 24q6-1 10 2M28 19q4-3 10-2M28 26q4-3 10-2" fill="none" stroke="#d4c6ff" stroke-width="2.5" stroke-linecap="round"/></svg>',
    trophy: '<svg viewBox="0 0 48 48"><path d="M14 6h20v12a10 10 0 0 1-20 0z" fill="#ffc21f" stroke="#8a5200" stroke-width="3"/><path d="M14 10H6c0 8 3 12 9 13M34 10h8c0 8-3 12-9 13" fill="none" stroke="#8a5200" stroke-width="3"/><rect x="21" y="27" width="6" height="8" fill="#e0a000" stroke="#8a5200" stroke-width="2.5"/><rect x="14" y="35" width="20" height="8" rx="2" fill="#8a5a2a" stroke="#4a2c10" stroke-width="3"/></svg>',
    map: '<svg viewBox="0 0 48 48"><path d="M5 12l12-5 14 5 12-5v29l-12 5-14-5-12 5z" fill="#ffe9a8" stroke="#7a4a1c" stroke-width="3" stroke-linejoin="round"/><path d="M17 7v29M31 12v29" stroke="#7a4a1c" stroke-width="2.5"/><path d="M21 22l5 5M26 22l-5 5" stroke="#e8433f" stroke-width="3.5" stroke-linecap="round"/></svg>',
    sound: '<svg viewBox="0 0 48 48"><path d="M6 18h8l10-9v30l-10-9H6z" fill="#fff" stroke="#5a4a96" stroke-width="3" stroke-linejoin="round"/><path d="M31 16q6 8 0 16M37 10q11 14 0 28" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
    music: '<svg viewBox="0 0 48 48"><path d="M18 36V10l22-5v26" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><ellipse cx="13" cy="37" rx="7" ry="5.5" fill="#fff"/><ellipse cx="35" cy="32" rx="7" ry="5.5" fill="#fff"/></svg>',
    refresh: '<svg viewBox="0 0 48 48"><path d="M38 20a15 15 0 1 0 1 8" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M40 7v14H26" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>',
    hammer: '<svg viewBox="0 0 48 48"><path d="M6 40L26 20" stroke="#8a5a2a" stroke-width="7" stroke-linecap="round"/><path d="M20 8l8-4 16 16-4 8-8-4z" fill="#d7dbe8" stroke="#4a4f6a" stroke-width="3" stroke-linejoin="round"/></svg>',
    boat: '<svg viewBox="0 0 48 48"><path d="M4 30h40l-6 12H10z" fill="#e8433f" stroke="#7a1a1a" stroke-width="3" stroke-linejoin="round"/><path d="M24 4v24" stroke="#7a4a1c" stroke-width="3.5"/><path d="M26 6l14 18H26z" fill="#fff" stroke="#7a4a1c" stroke-width="2.5" stroke-linejoin="round"/></svg>'
  };
  function icon(name, cls) { return '<span class="ic ' + (cls || '') + '">' + (ICON[name] || '') + '</span>'; }

  /* ---- popups ---- */
  var pop = { stack: [] };
  function popup(opts) {
    opts = opts || {};
    var layer = $('#popups');
    var dim = el('div', 'dim'), card = el('div', 'card ' + (opts.cls || ''));
    if (opts.title != null) {
      var head = el('div', 'phead ' + (opts.headCls || ''), '<span class="ptitle">' + opts.title + '</span>');
      if (opts.close !== false) { var x = el('button', 'pclose', icon('close')); x.setAttribute('aria-label', 'Close'); on(x, function () { api.close(); }); head.appendChild(x); }
      card.appendChild(head);
    }
    var body = el('div', 'pbody'); card.appendChild(body);
    if (opts.html) body.innerHTML = opts.html;
    dim.appendChild(card); layer.appendChild(dim);
    var api = {
      el: card, body: body, dim: dim, closed: false,
      close: function (silent) {
        if (api.closed) return; api.closed = true; dim.classList.add('out');
        setTimeout(function () { if (dim.parentNode) dim.parentNode.removeChild(dim); }, 200);
        var i = pop.stack.indexOf(api); if (i >= 0) pop.stack.splice(i, 1);
        if (!silent && opts.onClose) opts.onClose();
      }
    };
    if (opts.dismiss !== false) dim.addEventListener('pointerdown', function (e) { if (e.target === dim) api.close(); });
    pop.stack.push(api);
    return api;
  }
  function closeAll() { pop.stack.slice().forEach(function (p) { p.close(true); }); }
  function popupOpen() { return pop.stack.length > 0; }

  var toastT = 0;
  function toast(msg, ms) {
    var t = $('#toast'); t.textContent = msg; t.className = 'show'; clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, ms || 1800);
  }

  /** Fly n little icons from (x0,y0) (viewport px) to element `target` (coin|gem|star|xp). */
  function fly(kind, n, x0, y0, target, done) {
    var layer = $('#fly'), r = target.getBoundingClientRect(), ar = $('#app').getBoundingClientRect();
    var tx = r.left + r.width / 2 - ar.left, ty = r.top + r.height / 2 - ar.top, sx = x0 - ar.left, sy = y0 - ar.top;
    for (var i = 0; i < n; i++) (function (i) {
      var d = el('div', 'flyer', ICON[kind] || ICON.coin);
      d.style.left = sx + 'px'; d.style.top = sy + 'px'; layer.appendChild(d);
      var dx = (Math.random() - 0.5) * 100, dy = -30 - Math.random() * 60;
      var an = d.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(calc(-50% + ' + (tx - sx) + 'px),calc(-50% + ' + (ty - sy) + 'px)) scale(.6)', opacity: 1 }],
        { duration: 650 + i * 60, delay: i * 50, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'both' });
      an.onfinish = function () {
        if (d.parentNode) d.parentNode.removeChild(d);
        if (SI.audio) SI.audio.play('coin');
        target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump');
        if (done) done(i, n);
      };
    })(i);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ---- screen router ---- */
  var screens = {}, cur = null, curName = '';
  function register(name, mod) { screens[name] = mod; }
  function go(name, args) {
    if (cur && cur.leave) cur.leave(name);
    closeAll();
    var prev = curName;
    Array.prototype.forEach.call(document.querySelectorAll('.screen'), function (s) { s.classList.add('hidden'); });
    cur = screens[name]; curName = name;
    var host = document.getElementById('scr-' + (cur.host || name));
    host.classList.remove('hidden'); host.classList.remove('enter'); void host.offsetWidth; host.classList.add('enter');
    document.body.setAttribute('data-screen', name);
    if (cur.enter) cur.enter(args || {}, prev);
    if (SI.audio) SI.audio.setScene(name === 'world' ? 'island' + ((args && args.island) || A.S.islands.current) : 'menu');
  }

  /** shared HUD chips (coins / gems / xp) */
  function chip(kind, val) { return '<div class="chip ' + kind + '">' + icon(kind) + '<b>' + val + '</b></div>'; }

  /** Level-up / unlock / reward celebration popups, queued one after another. */
  var queue = [], showing = false;
  function celebrate(card) { queue.push(card); if (!showing) next(); }
  function next() {
    if (queue.length && document.querySelector('.qcard')) { showing = true; setTimeout(next, 600); return; }
    var c = queue.shift();
    if (!c) { showing = false; return; }
    showing = true;
    if (A.test && c.skipInTest) { next(); return; }
    var p = popup({ title: c.title, headCls: c.headCls || 'gold', cls: 'cele', dismiss: false, close: false }); p.dim.classList.add('celedim');
    p.body.innerHTML = c.html + '<button class="btn big green okbtn">' + (c.button || 'Yay!') + '</button>';
    SI.audio && SI.audio.play(c.sound || 'levelup');
    on(p.body.querySelector('.okbtn'), function () { p.close(true); setTimeout(next, 120); });
    if (c.onShow) c.onShow(p);
  }

  SI.ui = { el: el, $: $, on: on, clear: clear, esc: esc, icon: icon, ICON: ICON, popup: popup, closeAll: closeAll, popupOpen: popupOpen, toast: toast, fly: fly, wait: wait,
    register: register, go: go, chip: chip, celebrate: celebrate, current: function () { return curName; } };
})(typeof self !== 'undefined' ? self : this);
