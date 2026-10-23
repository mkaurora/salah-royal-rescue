/* Seeded PRNG helpers (mulberry32 + FNV-1a string hash). Deterministic: the same seed always gives the same stream.
 * UMD: module.exports in Node, SI.rng in the browser. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.rng = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function hash(s) {
    s = String(s);
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /** seed: number or string → function () → float in [0,1) */
  function make(seed) {
    var a = typeof seed === 'number' ? (seed >>> 0) : hash(seed);
    function r() {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return r;
  }

  /** integer in [lo, hi] inclusive */
  function int(r, lo, hi) { return lo + Math.floor(r() * (hi - lo + 1)); }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }
  function shuffle(r, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  /** n distinct items from arr */
  function sample(r, arr, n) { return shuffle(r, arr).slice(0, n); }

  return { hash: hash, make: make, int: int, pick: pick, shuffle: shuffle, sample: sample };
});
