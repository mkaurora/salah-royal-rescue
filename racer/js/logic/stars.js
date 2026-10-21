/* Stars for a finished race: ⭐ finish (boss levels: catch the boss), ⭐ coins ≥ the level's share,
 * ⭐ the level's third rule — few enough crashes, or under the target time. Failed races get none.
 * UMD: module.exports in Node, RR.stars in the browser. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.stars = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** def: level definition; r: { status, time, hits, coins, coinTotal } → { got: [b, b, b], count } */
  function compute(def, r) {
    var got = [false, false, false];
    if (r && r.status === 'finished') {
      got[0] = true;
      got[1] = r.coins >= coinsNeeded(def, r.coinTotal || 0);
      var third = def.stars.third;
      got[2] = third.type === 'time' ? r.time <= third.sec : r.hits <= third.max;
    }
    return { got: got, count: got.filter(Boolean).length };
  }

  /** Coins needed for the coin star: a share of the level's coins, or (boss levels, which end when the boss is
   * caught) a fixed count. */
  function coinsNeeded(def, coinTotal) {
    if (def.stars.coinCount) return def.stars.coinCount;
    return Math.ceil(def.stars.coins * coinTotal - 1e-9);
  }

  return { compute: compute, coinsNeeded: coinsNeeded };
});
