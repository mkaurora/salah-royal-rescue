/* Seeded random numbers (mulberry32) — same algorithm as Learning Quest's rng, so level data, traffic and quiz
 * picks are reproducible in tests and identical on every device. UMD: module.exports in Node, RR.rng in the browser. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.rng = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function hashSeed(s) {
    s = String(s);
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h >>> 0;
  }

  /** rng(seed) → { next() in [0,1), int(lo, hi) inclusive, range(lo, hi) float, pick(arr), shuffle(arr) (copy),
   *  chance(p), state() / setState(s) for snapshots }. */
  function rng(seed) {
    var a = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
    function next() {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    function int(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); }
    function range(lo, hi) { return lo + next() * (hi - lo); }
    function pick(arr) { return arr[Math.floor(next() * arr.length)]; }
    function shuffle(arr) {
      var b = arr.slice();
      for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(next() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
      return b;
    }
    return {
      next: next, int: int, range: range, pick: pick, shuffle: shuffle,
      chance: function (p) { return next() < p; },
      state: function () { return a; }, setState: function (s) { a = s >>> 0; }
    };
  }

  return { rng: rng, hashSeed: hashSeed };
});
