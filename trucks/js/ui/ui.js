/* Small UI toolkit: DOM helper, SVG icon set (original art), popup layer with bouncy open/close, toasts, fly-to-counter
 * animation and the shared app state (TW.app). */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {};
  var A = TW.app = { S: null, persist: function () {}, go: function () {}, refresh: function () {} };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function $(sel, par) { return (par || document).querySelector(sel); }
  function on(e, fn) { e.addEventListener('click', function (ev) { if (TW.audio) TW.audio.play('tap'); fn(ev); }); return e; }

  /* ---- icons (inline SVG, drawn by hand) ---- */
  var ICON = {
    coin: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="21" fill="#f5a300" stroke="#8a4b00" stroke-width="3"/><circle cx="24" cy="24" r="16" fill="#ffd54a" stroke="#d98200" stroke-width="2"/><path d="M24 10l4.2 8.6 9.4 1.3-6.8 6.6 1.6 9.4L24 31.5l-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.3z" fill="#fff3a6" stroke="#d98200" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    star: '<svg viewBox="0 0 48 48"><path d="M24 3l6.2 13.4 14.6 1.8-10.8 10 2.8 14.4L24 35.2 11.2 42.6 14 28.2 3.2 18.2l14.6-1.8z" fill="#ffd23f" stroke="#a45f00" stroke-width="3" stroke-linejoin="round"/><path d="M24 11l3.6 8 8.6 1-6.4 5.8 1.8 8.6L24 30.2" fill="none" stroke="#fff4b0" stroke-width="2.5" stroke-linecap="round"/></svg>',
    starOff: '<svg viewBox="0 0 48 48"><path d="M24 3l6.2 13.4 14.6 1.8-10.8 10 2.8 14.4L24 35.2 11.2 42.6 14 28.2 3.2 18.2l14.6-1.8z" fill="#5b6478" stroke="#2c3245" stroke-width="3" stroke-linejoin="round"/></svg>',
    wrench: '<svg viewBox="0 0 48 48"><path d="M33 4a11 11 0 0 0-10.4 14.6L5.5 35.7a4.6 4.6 0 0 0 6.5 6.5l17.1-17.1A11 11 0 0 0 44 15l-7 7-6-1-1-6 7-7A11 11 0 0 0 33 4z" fill="#ffc21f" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/><circle cx="9.6" cy="38.4" r="2.2" fill="#7a4a00"/></svg>',
    menu: '<svg viewBox="0 0 48 48"><rect x="8" y="10" width="32" height="6" rx="3" fill="#fff"/><rect x="8" y="21" width="32" height="6" rx="3" fill="#fff"/><rect x="8" y="32" width="32" height="6" rx="3" fill="#fff"/></svg>',
    close: '<svg viewBox="0 0 48 48"><path d="M13 13l22 22M35 13L13 35" stroke="#fff" stroke-width="8" stroke-linecap="round"/></svg>',
    pause: '<svg viewBox="0 0 48 48"><rect x="12" y="10" width="8" height="28" rx="3" fill="#fff"/><rect x="28" y="10" width="8" height="28" rx="3" fill="#fff"/></svg>',
    clipboard: '<svg viewBox="0 0 48 48"><rect x="8" y="8" width="32" height="36" rx="5" fill="#f6efe0" stroke="#5a3b1c" stroke-width="3"/><rect x="16" y="3" width="16" height="9" rx="3" fill="#b8793a" stroke="#5a3b1c" stroke-width="3"/><path d="M14 22h6M14 31h6" stroke="#9aa" stroke-width="3" stroke-linecap="round"/><path d="M24 22h10M24 31h10" stroke="#c9b99a" stroke-width="3" stroke-linecap="round"/><path d="M13 21l2 2 4-5" stroke="#2eaa3b" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
    gift: '<svg viewBox="0 0 48 48"><rect x="6" y="19" width="36" height="24" rx="4" fill="#e8434f" stroke="#6b1018" stroke-width="3"/><rect x="4" y="12" width="40" height="11" rx="4" fill="#ff6b76" stroke="#6b1018" stroke-width="3"/><rect x="21" y="12" width="6" height="31" fill="#ffd23f" stroke="#6b1018" stroke-width="2"/><path d="M24 12c-6-9-14-4-9 0M24 12c6-9 14-4 9 0" fill="none" stroke="#6b1018" stroke-width="3" stroke-linecap="round"/></svg>',
    trophy: '<svg viewBox="0 0 48 48"><path d="M14 6h20v12a10 10 0 0 1-20 0z" fill="#ffc21f" stroke="#7a4a00" stroke-width="3"/><path d="M14 10H6c0 8 3 12 9 13M34 10h8c0 8-3 12-9 13" fill="none" stroke="#7a4a00" stroke-width="3"/><rect x="21" y="27" width="6" height="8" fill="#e0a000" stroke="#7a4a00" stroke-width="2.5"/><rect x="14" y="35" width="20" height="8" rx="2" fill="#8a5a2a" stroke="#4a2c10" stroke-width="3"/><path d="M24 10l2 4 4.5.6-3.3 3 .8 4.4-4-2.2-4 2.2.8-4.4-3.3-3 4.5-.6z" fill="#fff3a6"/></svg>',
    car: '<svg viewBox="0 0 48 48"><path d="M4 32v-7q0-3 4-4l6-1 6-8h12l7 8 7 2q2 1 2 4v6z" fill="#3b8bff" stroke="#10285e" stroke-width="3" stroke-linejoin="round"/><path d="M19 13l-4 8h20l-6-8z" fill="#bfe4ff" stroke="#10285e" stroke-width="2.5" stroke-linejoin="round"/><circle cx="14" cy="33" r="6" fill="#2a2a35" stroke="#10285e" stroke-width="3"/><circle cx="36" cy="33" r="6" fill="#2a2a35" stroke="#10285e" stroke-width="3"/><circle cx="14" cy="33" r="2.4" fill="#cfd6dc"/><circle cx="36" cy="33" r="2.4" fill="#cfd6dc"/></svg>',
    paint: '<svg viewBox="0 0 48 48"><path d="M24 5C12 5 4 13 4 24c0 8 6 14 13 14 4 0 4-3 3-5-1-3 0-5 3-5h6c7 0 11-3 11-9C40 11 33 5 24 5z" fill="#f4e3c1" stroke="#5a3b1c" stroke-width="3" stroke-linejoin="round"/><circle cx="14" cy="22" r="3.6" fill="#ef4444"/><circle cx="21" cy="13" r="3.6" fill="#facc15"/><circle cx="31" cy="14" r="3.6" fill="#22c55e"/><circle cx="36" cy="23" r="3.6" fill="#3b82f6"/></svg>',
    gear: '<svg viewBox="0 0 48 48"><path d="M20 3h8l1.2 5.4 4 1.7 4.7-3 5.6 5.6-3 4.7 1.7 4L48 20v8l-5.4 1.2-1.7 4 3 4.7-5.6 5.6-4.7-3-4 1.7L28 45h-8l-1.2-5.4-4-1.7-4.7 3-5.6-5.6 3-4.7-1.7-4L0 28v-8l5.4-1.2 1.7-4-3-4.7 5.6-5.6 4.7 3 4-1.7z" transform="scale(.92) translate(2 2)" fill="#c9d1d8" stroke="#3a4350" stroke-width="3" stroke-linejoin="round"/><circle cx="24" cy="24" r="8" fill="#586272" stroke="#3a4350" stroke-width="3"/></svg>',
    chest: '<svg viewBox="0 0 64 48"><path d="M6 20a26 14 0 0 1 52 0v6H6z" fill="#3b8bff" stroke="#10285e" stroke-width="3"/><rect x="6" y="24" width="52" height="20" rx="4" fill="#2b6fe0" stroke="#10285e" stroke-width="3"/><rect x="25" y="20" width="14" height="14" rx="3" fill="#ffd23f" stroke="#7a4a00" stroke-width="3"/><circle cx="32" cy="27" r="2.6" fill="#7a4a00"/><path d="M14 24v20M50 24v20" stroke="#10285e" stroke-width="3"/><path d="M12 14q8-6 18-6" fill="none" stroke="#9cc8ff" stroke-width="3" stroke-linecap="round"/></svg>',
    flame: '<svg viewBox="0 0 48 48"><path d="M24 3c2 9 12 13 12 25a12 12 0 0 1-24 0c0-6 3-9 5-12 1 4 3 5 4 5-1-6 0-12 3-18z" fill="#ff7a1a" stroke="#8a2a00" stroke-width="3" stroke-linejoin="round"/><path d="M24 22c1 5 6 7 6 13a6 6 0 0 1-12 0c0-3 2-5 3-7 1 2 2 2 3 2z" fill="#ffd23f"/></svg>',
    lock: '<svg viewBox="0 0 48 48"><path d="M14 22v-6a10 10 0 0 1 20 0v6" fill="none" stroke="#c9d1d8" stroke-width="5"/><rect x="9" y="21" width="30" height="22" rx="5" fill="#ffc21f" stroke="#7a4a00" stroke-width="3"/><circle cx="24" cy="31" r="3.6" fill="#7a4a00"/><rect x="22.5" y="31" width="3" height="7" fill="#7a4a00"/></svg>',
    check: '<svg viewBox="0 0 48 48"><path d="M10 25l9 9 19-20" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    info: '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="#4aa3ff" stroke="#0f3d7a" stroke-width="3"/><rect x="21" y="20" width="6" height="16" rx="3" fill="#fff"/><circle cx="24" cy="13.5" r="3.6" fill="#fff"/></svg>',
    sound: '<svg viewBox="0 0 48 48"><path d="M6 18h8l10-9v30l-10-9H6z" fill="#fff" stroke="#3a4350" stroke-width="3" stroke-linejoin="round"/><path d="M31 16q6 8 0 16M37 10q11 14 0 28" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg>',
    music: '<svg viewBox="0 0 48 48"><path d="M18 36V10l22-5v26" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><ellipse cx="13" cy="37" rx="7" ry="5.5" fill="#fff"/><ellipse cx="35" cy="32" rx="7" ry="5.5" fill="#fff"/></svg>',
    refresh: '<svg viewBox="0 0 48 48"><path d="M38 20a15 15 0 1 0 1 8" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M40 7v14H26" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>',
    back: '<svg viewBox="0 0 48 48"><path d="M30 8L14 24l16 16" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    bolt: '<svg viewBox="0 0 48 48"><path d="M28 3L10 27h12l-4 18 20-26H26z" fill="#ffd23f" stroke="#7a4a00" stroke-width="3" stroke-linejoin="round"/></svg>',
    fix: '<svg viewBox="0 0 48 48"><path d="M33 4a11 11 0 0 0-10.4 14.6L5.5 35.7a4.6 4.6 0 0 0 6.5 6.5l17.1-17.1A11 11 0 0 0 44 15l-7 7-6-1-1-6 7-7A11 11 0 0 0 33 4z" fill="#fff" stroke="#2b5d12" stroke-width="3" stroke-linejoin="round"/></svg>'
  };
  function icon(name, cls) { return '<span class="ic ' + (cls || '') + '">' + (ICON[name] || '') + '</span>'; }
  function boosterIcon(kind, px) {
    var c = TW.sprites.icon(kind, Math.round(px * (Math.min(2, root.devicePixelRatio || 1)))); c.style.width = px + 'px'; c.style.height = px + 'px'; c.className = 'bico'; return c;
  }

  /* ---- popups ---- */
  var pop = { stack: [] };
  function popup(opts) {
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
        setTimeout(function () { if (dim.parentNode) dim.parentNode.removeChild(dim); }, 220);
        var i = pop.stack.indexOf(api); if (i >= 0) pop.stack.splice(i, 1);
        if (!silent && opts.onClose) opts.onClose();
      }
    };
    if (opts.dismiss !== false) dim.addEventListener('pointerdown', function (e) { if (e.target === dim) api.close(); });
    pop.stack.push(api);
    return api;
  }
  function closeAll() { pop.stack.slice().forEach(function (p) { p.close(true); }); }

  var toastT = 0;
  function toast(msg, ms) {
    var t = $('#toast'); t.textContent = msg; t.className = 'show'; clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, ms || 1800);
  }

  /** Fly n little icons from (x0,y0) to the element `target`, then call done (bump). kind = coin|wrench|star */
  function fly(kind, n, x0, y0, target, done) {
    var layer = $('#fly'), r = target.getBoundingClientRect(), ar = $('#app').getBoundingClientRect();
    var tx = r.left + r.width / 2 - ar.left, ty = r.top + r.height / 2 - ar.top;
    for (var i = 0; i < n; i++) (function (i) {
      var d = el('div', 'flyer', ICON[kind]);
      d.style.left = (x0 - ar.left) + 'px'; d.style.top = (y0 - ar.top) + 'px'; layer.appendChild(d);
      var dx = (Math.random() - 0.5) * 90, dy = -30 - Math.random() * 60;
      d.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 }, { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(1.1)', opacity: 1, offset: 0.3 },
        { transform: 'translate(calc(-50% + ' + (tx - (x0 - ar.left)) + 'px),calc(-50% + ' + (ty - (y0 - ar.top)) + 'px)) scale(.6)', opacity: 1 }],
        { duration: 700 + i * 70, delay: i * 55, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'both' }).onfinish = function () {
        if (d.parentNode) d.parentNode.removeChild(d);
        if (TW.audio) TW.audio.play('coin');
        target.classList.remove('bump'); void target.offsetWidth; target.classList.add('bump');
        if (done) done(i, n);
      };
    })(i);
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function sheet(html) { var d = el('div'); d.innerHTML = html; return d.firstChild; }

  TW.ui = { el: el, $: $, on: on, icon: icon, ICON: ICON, boosterIcon: boosterIcon, popup: popup, closeAll: closeAll, toast: toast, fly: fly, wait: wait, today: today, sheet: sheet };
})(typeof self !== 'undefined' ? self : this);
