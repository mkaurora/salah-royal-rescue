/* Race controls: big on-screen ◀ ▶ (bottom-left) and GAS / BRAKE pedals (bottom-right) with true multi-touch —
 * every pointer is tracked by pointerId (captured, released on up / cancel / lostpointercapture), a steering finger
 * may slide from ◀ to ▶ — plus keyboard (arrows / WASD, P / Esc pause) and optional tilt steering
 * (DeviceOrientation; iOS permission is requested from the Settings toggle tap). The steering value ramps
 * 0 → 1 in ~0.12 s before it reaches the sim. Browser only: RR.input.create(el). */
(function (root) {
  'use strict';

  function create(el) {
    var ptr = {};                      // pointerId → control name
    var held = { left: 0, right: 0, gas: 0, brake: 0 };
    var keys = { left: false, right: false, gas: false, brake: false };
    var tiltOn = false, tiltVal = 0, tiltSeen = false;
    var steer = 0, enabled = false;
    var api = { onPause: null, steer: 0, gas: false, brake: false, any: false };
    var btns = {};
    Array.prototype.forEach.call(el.querySelectorAll('[data-ctl]'), function (b) { btns[b.getAttribute('data-ctl')] = b; });

    function refresh() {
      for (var k in btns) btns[k].classList.toggle('down', held[k] > 0 || keys[k]);
    }
    function press(id, name) {
      if (ptr[id] === name) return;
      if (ptr[id]) held[ptr[id]] = Math.max(0, held[ptr[id]] - 1);
      ptr[id] = name;
      if (name) held[name]++;
      refresh();
    }
    function release(id) {
      if (!(id in ptr)) return;
      if (ptr[id]) held[ptr[id]] = Math.max(0, held[ptr[id]] - 1);
      delete ptr[id];
      refresh();
    }
    function ctlAt(x, y) {
      var e = document.elementFromPoint(x, y);
      while (e && e !== el) { if (e.getAttribute && e.getAttribute('data-ctl')) return e.getAttribute('data-ctl'); e = e.parentNode; }
      return null;
    }

    el.addEventListener('pointerdown', function (e) {
      var t = e.target.closest ? e.target.closest('[data-ctl]') : null;
      if (!t || !enabled) return;
      e.preventDefault();
      try { t.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      press(e.pointerId, t.getAttribute('data-ctl'));
      api.any = true;
    });
    el.addEventListener('pointermove', function (e) {
      var cur = ptr[e.pointerId];
      if (cur !== 'left' && cur !== 'right') return;
      var over = ctlAt(e.clientX, e.clientY);
      if (over === 'left' || over === 'right') press(e.pointerId, over);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
      el.addEventListener(ev, function (e) { release(e.pointerId); });
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    var KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake' };
    window.addEventListener('keydown', function (e) {
      var k = KEYMAP[e.code];
      if (k) { keys[k] = true; api.any = true; if (enabled) e.preventDefault(); refresh(); return; }
      if ((e.code === 'KeyP' || e.code === 'Escape') && api.onPause) { e.preventDefault(); api.onPause(); }
    });
    window.addEventListener('keyup', function (e) { var k = KEYMAP[e.code]; if (k) { keys[k] = false; refresh(); } });
    window.addEventListener('blur', reset);

    function onTilt(e) {
      if (e.beta === null && e.gamma === null) return;
      tiltSeen = true;
      var ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
      var v;
      if (ang === 90) v = e.beta; else if (ang === -90 || ang === 270) v = -e.beta; else v = e.gamma;
      tiltVal = Math.max(-1, Math.min(1, (v || 0) / 22));
      if (Math.abs(tiltVal) < 0.08) tiltVal = 0;
    }

    /** Turn tilt on; must be called from a user tap on iOS. Resolves true when tilt is available. */
    api.setTilt = function (on) {
      tiltOn = !!on;
      el.classList.toggle('tilt', tiltOn);
      if (!on) { window.removeEventListener('deviceorientation', onTilt); tiltVal = 0; return Promise.resolve(false); }
      var D = window.DeviceOrientationEvent;
      var ask = D && typeof D.requestPermission === 'function' ? D.requestPermission() : Promise.resolve('granted');
      return Promise.resolve(ask).then(function (r) {
        if (r !== 'granted') { tiltOn = false; el.classList.remove('tilt'); return false; }
        window.addEventListener('deviceorientation', onTilt);
        return true;
      }).catch(function () { tiltOn = false; el.classList.remove('tilt'); return false; });
    };

    function reset() {
      for (var id in ptr) delete ptr[id];
      held.left = held.right = held.gas = held.brake = 0;
      keys.left = keys.right = keys.gas = keys.brake = false;
      steer = 0; api.steer = 0; refresh();
    }
    api.reset = reset;
    api.enable = function (on) { enabled = !!on; el.hidden = !on; if (!on) reset(); };

    /** Advance the steering ramp; returns the input object for sim.step. */
    var out = { steer: 0, gas: false, brake: false };
    api.update = function (dt) {
      var L = held.left > 0 || keys.left, R = held.right > 0 || keys.right;
      var target = (R ? 1 : 0) - (L ? 1 : 0);
      if (!target && tiltOn && tiltSeen) target = tiltVal;
      var rate = (target === 0 || target * steer < 0) ? 14 : 8.5;
      if (steer < target) steer = Math.min(target, steer + rate * dt);
      else if (steer > target) steer = Math.max(target, steer - rate * dt);
      out.steer = steer; out.gas = held.gas > 0 || keys.gas; out.brake = held.brake > 0 || keys.brake;
      api.steer = out.steer; api.gas = out.gas; api.brake = out.brake;
      return out;
    };
    api._held = held;
    return api;
  }

  root.RR = root.RR || {};
  root.RR.input = { create: create };
})(window);
