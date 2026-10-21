/* Tiny DOM toolkit for the screens: element builder, chunky buttons (tap sound + press feedback), a screen
 * router with animated in/out transitions, modal stack, toast, and the checkered wipe. Browser only: RR.ui. */
(function (root) {
  'use strict';
  var RR = root.RR;
  var host = null, base = null, modals = [];

  /** h('div.a.b', { attr }, child, ...) — children: nodes, strings, arrays, null. */
  function h(spec, attrs) {
    var parts = spec.split('.'), el = document.createElement(parts[0] || 'div');
    if (parts.length > 1) el.className = parts.slice(1).join(' ');
    var start = 1;
    if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
      start = 2;
      for (var k in attrs) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') for (var s in v) el.style.setProperty(s, v[s]);
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (var i = start; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { add(el, x); }); return; }
    el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }

  /** Big button. cls e.g. 'green big'; label html; opts: { sound: 'tap'|'back'|false, label (aria) } */
  function btn(cls, label, onTap, opts) {
    opts = opts || {};
    var b = h('button.btn' + (cls ? '.' + cls.split(' ').join('.') : ''), { html: label, 'aria-label': opts.label || null, type: 'button' });
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      if (b.disabled) return;
      if (opts.sound !== false) RR.audio.sfx(opts.sound || 'tap');
      if (onTap) onTap(e, b);
    });
    return b;
  }

  function init(el) { host = el; }

  /** Replace the base screen (with transition). */
  function setScreen(el) {
    closeAllModals(true);
    var old = base;
    base = el;
    host.appendChild(el);
    if (old) leave(old);
    return el;
  }
  function leave(el) {
    el.classList.add('out');
    var done = false;
    function rm() { if (!done) { done = true; if (el.parentNode) el.parentNode.removeChild(el); } }
    el.addEventListener('animationend', rm);
    setTimeout(rm, 400);
  }
  function clearScreen() { closeAllModals(true); if (base) leave(base); base = null; }
  function openModal(el) { modals.push(el); host.appendChild(el); return el; }
  function closeModal(el) {
    var i = el ? modals.indexOf(el) : modals.length - 1;
    if (i < 0) return;
    var m = modals.splice(i, 1)[0];
    leave(m);
  }
  function closeAllModals(fast) { while (modals.length) { var m = modals.pop(); if (fast && m.parentNode) m.parentNode.removeChild(m); else leave(m); } }
  function topModal() { return modals[modals.length - 1] || null; }

  var toastT = 0;
  function toast(msg, ms) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, ms || 2200);
  }

  /** Checkered wipe; calls mid() when the screen is covered. */
  function wipe(mid) {
    var w = document.getElementById('wipe');
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
    RR.audio.sfx('whoosh');
    setTimeout(function () { try { mid && mid(); } catch (e) { setTimeout(function () { throw e; }); } }, 420);
    setTimeout(function () { w.classList.remove('go'); }, 950);
  }

  function shake(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

  function coin() { return h('span.coin-icon'); }

  function fmtDate(iso) {
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], p = String(iso).split('-');
    return p.length === 3 ? (+p[2]) + ' ' + M[(+p[1] - 1) % 12] + ' ' + p[0] : String(iso);
  }
  function versionLabel() { var v = root.RR_VERSION || { version: '?', date: '' }; return 'v' + v.version + ' (' + fmtDate(v.date) + ')'; }

  RR.ui = { h: h, btn: btn, init: init, setScreen: setScreen, clearScreen: clearScreen, openModal: openModal, closeModal: closeModal,
    closeAllModals: closeAllModals, topModal: topModal, toast: toast, wipe: wipe, shake: shake, coin: coin, fmtDate: fmtDate,
    versionLabel: versionLabel, base: function () { return base; } };
})(window);
