/* Level generator: 36 levels, deterministic per level number. Boss every 5th.
 * Level = { n, boss, name, shield, par, bases[], gates[], bursts[], giants[], runnerP, tankP }
 * Gate types: 'x' multiplier (x2,x3), '+' (adds v/5 clones per passing unit), '-' (each passing unit dies with chance v/20). */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else { root.SG = root.SG || {}; root.SG.Levels = m; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var COUNT = 36, CROWD = 5; // enemy/unit count multiplier vs. the pass-1 balance
  var NAMES = ['Warm-up', 'Trickle', 'Gate Run', 'Double Up', 'BRUTE', 'Rush Hour', 'Twin Peaks', 'Swing Time', 'Crowded', 'WARLORD',
    'Dark Tide', 'Pincer', 'Iron Skin', 'Stampede', 'GOLIATH', 'Gauntlet', 'Zigzag', 'Landslide', 'Fortress', 'DEVOURER',
    'Three Heads', 'Meat Grinder', 'No Mercy', 'Sandstorm', 'TITAN', 'Last Stand', 'Crushing', 'Bedlam', 'Overrun', 'OVERLORD',
    'Nightfall', 'Hellgate', 'Endless', 'Apocalypse', 'Final Rush', 'SWARM KING'];

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function get(n) {
    n = Math.max(1, Math.min(COUNT, n | 0));
    var r = rng(n * 7919 + 13), d = (n - 1) / (COUNT - 1);
    var boss = n % 5 === 0;
    var nb = boss ? (n >= 20 ? 2 : 1) : n < 6 ? 1 : n < 12 ? (n % 2 ? 1 : 2) : n < 20 ? 2 : (n % 3 === 0 ? 3 : 2);
    var total = Math.round((60 + 40 * n + 2.3 * n * n) * (boss ? 1.3 : 1));
    var bases = [];
    var wsum = 0, w = [];
    for (var i = 0; i < nb; i++) { w.push(0.8 + r() * 0.5); wsum += w[i]; }
    var gap = nb > 1 ? 3 : 0, seg = (92 - gap * (nb - 1)) / nb;
    var rate = (1.2 + 0.26 * n) * (boss ? 0.8 : 1);
    for (i = 0; i < nb; i++) {
      var x0 = 4 + i * (seg + gap);
      bases.push({ x0: x0, x1: x0 + seg, hp: Math.round(total * w[i] / wsum * CROWD), rate: (rate / nb + 0.15) * CROWD, rageN: Math.round((6 + n * 1.3) / nb * CROWD) });
    }
    // gates: row 0 is the near "steer" row (good gate off-centre, so the player must move to hit it); every gate gets its own
    // slot (swept range included), rows sit >= 24 apart in depth, so nothing overlaps. Good gates thin out with depth.
    var gates = [], ys = [18, 44, 70, 98, 124], rows = n < 4 ? 3 : n < 12 ? 4 : 5, gid = 0;
    function pickGood() {
      var q = r();
      if (q < 0.5) return { t: 'x', v: 2 };
      if (q < 0.5 + 0.2 + 0.1 * d) return { t: 'x', v: 3 };
      return { t: '+', v: [8, 10, 15][Math.floor(r() * 3)] };
    }
    function badV() { return n < 5 ? 4 : [5, 10, 15, 20][Math.floor(r() * 4)]; }
    var side = n % 2 ? 1 : -1, sg = pickGood(), sc = side > 0 ? 76 : 24;
    gates.push({ y: ys[0] + Math.round((r() - 0.5) * 4), c: sc, w: 28, amp: n >= 10 ? 3 : 0, spd: 0.7, ph: r() * 6.28, t: sg.t, v: sg.v, steer: true });
    if (n >= 4) {
      var bt = badV();
      gates.push({ y: ys[0] + Math.round((r() - 0.5) * 4), c: 100 - sc, w: 28, amp: 0, spd: 0.7, ph: 0, t: '-', v: bt });
    }
    for (var k = 1; k < rows; k++) {
      var count = n < 12 ? 2 : (r() < 0.5 ? 3 : 2), slotW = 100 / count, gw = count === 3 ? 24 : 30;
      var goodSlot = k === 1 ? Math.floor(r() * count) : -1;
      for (var s = 0; s < count; s++) {
        var good = s === goodSlot || r() < Math.max(0.1, 0.4 - 0.08 * k - 0.15 * d);
        var gt = good ? pickGood() : { t: '-', v: badV() };
        var moving = n >= 6 && r() < 0.35 + d * 0.4;
        var amp = moving ? Math.min(3 + r() * (4 + d * 10), (slotW - gw) / 2 - 1.5) : 0;
        gates.push({ y: ys[k] + Math.round((r() - 0.5) * 6), c: slotW * (s + 0.5), w: gw, amp: Math.max(0, amp), spd: 0.5 + r() * 0.8 + d * 0.5, ph: r() * 6.28, t: gt.t, v: gt.v });
      }
    }
    // timed bursts
    var bursts = [], interval = Math.max(11, 22 - n * 0.28), bn = Math.round(8 + n * 1.9);
    for (var tt = 14, bi = 0; tt < 240; tt += interval, bi++) {
      var kind = n >= 6 && bi % 3 === 1 ? 'runner' : n >= 12 && bi % 3 === 2 ? 'tank' : 'normal';
      bursts.push({ t: Math.round(tt), b: bi % nb, n: Math.round(bn * CROWD * (kind === 'tank' ? 0.4 : 1) * (0.85 + r() * 0.3)), kind: kind });
    }
    // giants
    var giants = [];
    if (boss) {
      var bh = Math.round((70 + n * 14) * CROWD);
      giants.push({ t: 10, b: 0, hp: bh }, { t: 38, b: nb - 1, hp: Math.round(bh * 1.2) });
      if (n >= 15) giants.push({ t: 70, b: 0, hp: Math.round(bh * 1.5) });
      if (n >= 25) giants.push({ t: 100, b: nb - 1, hp: Math.round(bh * 1.7) });
    } else if (n >= 3) {
      var gc = 1 + Math.floor(n / 9);
      for (var g = 0; g < gc; g++) giants.push({ t: 24 + g * 24, b: g % nb, hp: Math.round((26 + n * 6.5) * CROWD) });
    }
    return {
      n: n, boss: boss, name: NAMES[n - 1], shield: n < 6 ? 6 : n < 20 ? 5 : 4, par: Math.round(28 + n * 3.2),
      bases: bases, gates: gates, bursts: bursts, giants: giants,
      runnerP: n >= 6 ? Math.min(0.28, (n - 4) * 0.012) : 0, tankP: n >= 12 ? Math.min(0.2, (n - 10) * 0.01) : 0,
      bossName: boss ? NAMES[n - 1] : null
    };
  }

  return { COUNT: COUNT, get: get, rng: rng };
});
