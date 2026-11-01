/* Persistent progress (localStorage, keys prefixed "swarm."). Upgrades + skins are coin-only (no real money). */
(function () {
  'use strict';
  var SG = window.SG = window.SG || {};
  var KEY = 'swarm.save.v1';

  var UP = {
    rate: { name: 'Fire Rate', desc: 'Cannon shoots faster', max: 10, cost: function (l) { return Math.round(40 * Math.pow(1.45, l)); }, val: function (l) { return (8 + 0.8 * l).toFixed(1) + '/s'; } },
    shots: { name: 'Units per Shot', desc: 'More units every shot', max: 6, cost: function (l) { return Math.round(110 * Math.pow(1.75, l)); }, val: function (l) { return String(4 + 2 * l); } },
    charge: { name: 'Champion Charge', desc: 'Champion meter fills faster', max: 8, cost: function (l) { return Math.round(60 * Math.pow(1.5, l)); }, val: function (l) { return 'x' + (1 + 0.2 * l).toFixed(1); } }
  };
  var SKINS = [
    { id: 'mint', name: 'Mint', cost: 0, body: '#35d07f', dark: '#1a8f55', light: '#a6ffd0', accent: '#ffe14d' },
    { id: 'ocean', name: 'Ocean', cost: 150, body: '#3da5ff', dark: '#1c64c4', light: '#b5e1ff', accent: '#ffffff' },
    { id: 'sunset', name: 'Sunset', cost: 320, body: '#ff9440', dark: '#c4541a', light: '#ffd7a8', accent: '#ff3d71' },
    { id: 'royal', name: 'Royal', cost: 550, body: '#a566ff', dark: '#6a2fc4', light: '#dcc2ff', accent: '#ffd23d' },
    { id: 'candy', name: 'Candy', cost: 850, body: '#ff5fb0', dark: '#c42a82', light: '#ffc2e4', accent: '#7affea' },
    { id: 'gold', name: 'Gold', cost: 1300, body: '#ffc928', dark: '#c48a0a', light: '#fff0a8', accent: '#ff5a3d' }
  ];

  var data = null;
  function fresh() { return { coins: 0, stars: {}, best: {}, up: { rate: 0, shots: 0, charge: 0 }, skin: 'mint', owned: ['mint'], sound: true, vibe: true, plays: 0 }; }
  function load() {
    var d = fresh();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && typeof o === 'object') {
          d.coins = +o.coins || 0; d.stars = o.stars || {}; d.best = o.best || {};
          d.up = { rate: +(o.up && o.up.rate) || 0, shots: +(o.up && o.up.shots) || 0, charge: +(o.up && o.up.charge) || 0 };
          d.skin = o.skin || 'mint'; d.owned = Array.isArray(o.owned) && o.owned.length ? o.owned : ['mint'];
          d.sound = o.sound !== false; d.vibe = o.vibe !== false; d.plays = +o.plays || 0;
        }
      }
    } catch (e) { /* private mode / corrupt: fall back to fresh */ }
    return d;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* storage full / blocked */ } }
  data = load();

  SG.Save = {
    UP: UP, SKINS: SKINS,
    d: function () { return data; },
    save: save,
    skin: function () { for (var i = 0; i < SKINS.length; i++) if (SKINS[i].id === data.skin) return SKINS[i]; return SKINS[0]; },
    stats: function () {
      return { rate: 8 + 0.8 * data.up.rate, perShot: 4 + 2 * data.up.shots, charge: 1 + 0.2 * data.up.charge };
    },
    buyUp: function (k) {
      var u = UP[k], l = data.up[k];
      if (l >= u.max) return false;
      var c = u.cost(l);
      if (data.coins < c) return false;
      data.coins -= c; data.up[k] = l + 1; save(); return true;
    },
    skinAction: function (id) {
      var s = null, i;
      for (i = 0; i < SKINS.length; i++) if (SKINS[i].id === id) s = SKINS[i];
      if (!s) return 'none';
      if (data.owned.indexOf(id) < 0) {
        if (data.coins < s.cost) return 'poor';
        data.coins -= s.cost; data.owned.push(id);
      }
      data.skin = id; save(); return 'ok';
    },
    stars: function (n) { return data.stars[n] || 0; },
    unlocked: function (n) { return n <= 1 || (data.stars[n - 1] || 0) > 0; },
    totalStars: function () { var t = 0; for (var k in data.stars) t += data.stars[k]; return t; },
    highest: function () { var h = 1; for (var n = 1; n <= SG.Levels.COUNT; n++) if (SG.Save.unlocked(n)) h = n; return h; },
    reset: function () { data = fresh(); save(); SG.Save.d = function () { return data; }; }
  };
})();
