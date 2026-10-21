/* Garage catalog: 4 upgrades × 5 tiers (prices rise), paints, decals and bodies (cosmetic). Pure data.
 * Upgrade effects live in RR.sim.carStats; the bars in the garage use bar(stat, level) below.
 * UMD: module.exports in Node, RR.garage in the browser. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.garage = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TIERS = 5;
  var PRICES = [80, 160, 280, 450, 700];      // coins for tier 1..5 (same for every upgrade)

  var UPGRADES = [
    { id: 'speed', name: 'Speed', icon: '🚀', text: 'Go faster!' },
    { id: 'grip', name: 'Grip', icon: '🛞', text: 'Turn better. Slide less on oil and ice.' },
    { id: 'brakes', name: 'Brakes', icon: '🛑', text: 'Stop quicker.' },
    { id: 'armor', name: 'Armor', icon: '🛡️', text: 'Bumps hurt less.' }
  ];

  var PAINTS = [
    { id: 'red', name: 'Red', color: '#e8322f', price: 0 },
    { id: 'blue', name: 'Blue', color: '#2f6fe8', price: 40 },
    { id: 'green', name: 'Green', color: '#25b04a', price: 40 },
    { id: 'yellow', name: 'Yellow', color: '#f5c518', price: 40 },
    { id: 'orange', name: 'Orange', color: '#ff7a1a', price: 60 },
    { id: 'purple', name: 'Purple', color: '#8a4bdb', price: 60 },
    { id: 'pink', name: 'Pink', color: '#ff5fa8', price: 60 },
    { id: 'white', name: 'White', color: '#f2f4f7', price: 80 },
    { id: 'black', name: 'Black', color: '#22252b', price: 100 },
    { id: 'gold', name: 'Gold', color: '#d4a62a', price: 300, shiny: true }
  ];
  var DECALS = [
    { id: 'none', name: 'Plain', price: 0 },
    { id: 'stripes', name: 'Stripes', price: 120 },
    { id: 'number', name: 'Number 7', price: 100 },
    { id: 'stars', name: 'Stars', price: 160 },
    { id: 'flames', name: 'Flames', price: 220 }
  ];
  var BODIES = [
    { id: 'racer', name: 'Racer', price: 0 },
    { id: 'buggy', name: 'Buggy', price: 400 },
    { id: 'super', name: 'Super Car', price: 900 }
  ];
  var KINDS = { paint: PAINTS, decal: DECALS, body: BODIES };

  /** Price of the next tier for an upgrade at `level` (null when maxed). */
  function price(level) { level = level | 0; return level >= 0 && level < TIERS ? PRICES[level] : null; }
  /** 0..1 bar length for the garage's before/after bars (base car shows a short bar, not an empty one). */
  function bar(level) { return (1 + Math.max(0, Math.min(TIERS, level | 0))) / (TIERS + 1); }
  function find(kind, id) {
    var list = KINDS[kind] || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function upgradeIds() { return UPGRADES.map(function (u) { return u.id; }); }

  return { TIERS: TIERS, PRICES: PRICES, UPGRADES: UPGRADES, PAINTS: PAINTS, DECALS: DECALS, BODIES: BODIES,
    KINDS: KINDS, price: price, bar: bar, find: find, upgradeIds: upgradeIds };
});
