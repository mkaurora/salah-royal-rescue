/* Stuck timer for one question: hint after hintDelay, swap after swapDelay (both in seconds of ACTIVE time —
 * paused while the app is hidden), optional visible countdown ticking once per second.
 * The clock is injectable ({ now, setTimeout, clearTimeout }) so tests can drive it with fake time. UMD. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.stuck = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function defaultClock() {
    var g = typeof self !== 'undefined' ? self : global;
    return {
      now: function () { return Date.now(); },
      setTimeout: function (f, ms) { return g.setTimeout(f, ms); },
      clearTimeout: function (t) { g.clearTimeout(t); }
    };
  }

  /**
   * opts: { clock, hintDelay (s), swapDelay (s), countdown (s, 0 = off), onHint(), onSwap(), onTick(remainingSeconds) }
   */
  function StuckTimer(opts) {
    this.clock = opts.clock || defaultClock();
    this.hintDelay = Math.max(1, +opts.hintDelay || 60) * 1000;
    this.swapDelay = Math.max(1, +opts.swapDelay || 300) * 1000;
    this.countdown = Math.max(0, +opts.countdown || 0) * 1000;
    this.onHint = opts.onHint || function () {};
    this.onSwap = opts.onSwap || function () {};
    this.onTick = opts.onTick || null;
    this.accum = 0;        // active ms before the current running stretch
    this.since = null;     // clock time the current stretch started (null = not running)
    this.timer = null;
    this.hinted = false;
    this.swapped = false;
    this.stopped = true;
  }

  StuckTimer.prototype.elapsed = function () {
    return this.accum + (this.since === null ? 0 : this.clock.now() - this.since);
  };

  StuckTimer.prototype.remaining = function () {
    return this.countdown ? Math.max(0, Math.ceil((this.countdown - this.elapsed()) / 1000)) : null;
  };

  StuckTimer.prototype._schedule = function () {
    var self = this;
    if (this.timer !== null) { this.clock.clearTimeout(this.timer); this.timer = null; }
    if (this.stopped || this.since === null) return;
    var el = this.elapsed(), targets = [];
    if (!this.hinted) targets.push(this.hintDelay);
    if (!this.swapped) targets.push(this.swapDelay);
    if (this.countdown && this.onTick && el < this.countdown) targets.push((Math.floor(el / 1000) + 1) * 1000);
    if (!targets.length) return;
    var next = Math.min.apply(null, targets);
    this.timer = this.clock.setTimeout(function () { self.timer = null; self._fire(); }, Math.max(0, next - el));
  };

  StuckTimer.prototype._fire = function () {
    if (this.stopped) return;
    var el = this.elapsed();
    if (this.countdown && this.onTick) this.onTick(this.remaining());
    if (!this.hinted && (el >= this.hintDelay || (this.countdown && el >= this.countdown))) { this.hinted = true; this.onHint('timer'); }
    if (this.stopped) return;
    if (!this.swapped && el >= this.swapDelay) { this.swapped = true; this.onSwap(); }
    this._schedule();
  };

  /** Start (or restart, e.g. after a swap) timing a question. */
  StuckTimer.prototype.start = function () {
    this.accum = 0;
    this.hinted = false;
    this.swapped = false;
    this.stopped = false;
    this.since = this.clock.now();
    if (this.countdown && this.onTick) this.onTick(this.remaining());
    this._schedule();
    return this;
  };

  /** The hint was shown another way (e.g. 2 wrong taps): don't fire it again. */
  StuckTimer.prototype.markHinted = function () { this.hinted = true; this._schedule(); };

  StuckTimer.prototype.pause = function () {
    if (this.stopped || this.since === null) return;
    this.accum += this.clock.now() - this.since;
    this.since = null;
    this._schedule();
  };

  StuckTimer.prototype.resume = function () {
    if (this.stopped || this.since !== null) return;
    this.since = this.clock.now();
    this._schedule();
  };

  StuckTimer.prototype.paused = function () { return !this.stopped && this.since === null; };

  StuckTimer.prototype.stop = function () {
    if (this.since !== null) this.accum += this.clock.now() - this.since;
    this.since = null;
    this.stopped = true;
    if (this.timer !== null) { this.clock.clearTimeout(this.timer); this.timer = null; }
  };

  /** A tiny fake clock for tests: advance(ms) runs due timers in order. */
  function fakeClock(start) {
    var t = start || 0, seq = 0, timers = [];
    return {
      now: function () { return t; },
      setTimeout: function (f, ms) { var id = ++seq; timers.push({ id: id, at: t + Math.max(0, ms), f: f }); return id; },
      clearTimeout: function (id) { timers = timers.filter(function (x) { return x.id !== id; }); },
      advance: function (ms) {
        var end = t + ms;
        for (;;) {
          timers.sort(function (a, b) { return a.at - b.at || a.id - b.id; });
          var due = timers[0];
          if (!due || due.at > end) break;
          timers.shift();
          t = due.at;
          due.f();
        }
        t = end;
      },
      pending: function () { return timers.length; }
    };
  }

  return { StuckTimer: StuckTimer, fakeClock: fakeClock };
});
