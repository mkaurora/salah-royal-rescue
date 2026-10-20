/* Formatting helpers: times are always shown in Morocco time (Africa/Casablanca), whatever the phone's zone.
 * UMD so the Node unit tests can use it too. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.FC = root.FC || {}; root.FC.fmt = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TZ = 'Africa/Casablanca';
  var timeF = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true });
  var dayKeyF = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  var dayF = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' });

  function time(ts) { return timeF.format(new Date(ts)); }             // "6:42 PM"
  function dayKey(ts) { return dayKeyF.format(new Date(ts)); }         // "2026-10-20" (Morocco date)
  function day(ts, now) {
    now = now == null ? Date.now() : now;
    var k = dayKey(ts);
    if (k === dayKey(now)) return 'Today';
    if (k === dayKey(now - 864e5)) return 'Yesterday';
    return dayF.format(new Date(ts));                                  // "Monday 19 October"
  }
  function dur(sec) {
    sec = Math.max(0, Math.round(sec || 0));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  /** Squash a list of loudness levels (0..1) into n bars (0..100) for the voice memo waveform. */
  function peaks(levels, n) {
    n = n || 40;
    if (!levels || !levels.length) return new Array(n).fill(8);
    var out = [], max = 0;
    for (var i = 0; i < n; i++) {
      var a = Math.floor(i * levels.length / n), b = Math.max(a + 1, Math.floor((i + 1) * levels.length / n));
      var m = 0;
      for (var j = a; j < b && j < levels.length; j++) m = Math.max(m, levels[j]);
      out.push(m); max = Math.max(max, m);
    }
    return out.map(function (v) { return Math.max(8, Math.round(max > 0 ? (v / max) * 100 : 8)); });
  }
  function ago(ts, now) {
    if (!ts) return 'never';
    var s = Math.round(((now == null ? Date.now() : now) - ts) / 1000);
    if (s < 90) return 'just now';
    if (s < 3600) return Math.round(s / 60) + ' min ago';
    if (s < 86400) return Math.round(s / 3600) + ' h ago';
    return day(ts, now) + ' ' + time(ts);
  }
  return { time: time, day: day, dayKey: dayKey, dur: dur, peaks: peaks, ago: ago, TZ: TZ };
});
