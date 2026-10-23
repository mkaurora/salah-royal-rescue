/* Achievements / trophies. check(S, H) → bool; H = progress helpers {stars, chains, questions, collected, level, placed, owned,
 * threeStarGame, gates, islands, helpers, streak}. Rewards are fixed. UMD: SI.achievements. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.achievements = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var list = [];
  function add(id, name, icon, desc, coins, gems, xp, check) { list.push({ id: id, name: name, icon: icon, desc: desc, reward: { coins: coins, gems: gems, xp: xp }, check: check }); }

  add('first-step', 'First Steps', '👣', 'Finish your first quest step.', 20, 0, 50, function (S, H) { return S.stats.steps >= 1; });
  ['Shore Helper', 'Jungle Helper', 'Cave Helper', 'Peak Helper', 'Garden Helper', 'Lab Helper'].forEach(function (nm, i) {
    var n = i + 1;
    add('chain-' + n, nm, ['🏖️', '🌴', '💎', '🏔️', '🌻', '🧪'][i], 'Finish quest chain ' + n + '.', 50 * n, 1, 100 + 40 * n, function (S, H) { return H.chains >= n; });
  });
  [10, 30, 60, 100, 150, 200].forEach(function (n, i) {
    add('stars-' + n, n + ' Stars', '⭐', 'Earn ' + n + ' stars in minigames.', 30 + 25 * i, i >= 4 ? i - 2 : 0, 60 + 30 * i, function (S, H) { return H.stars >= n; });
  });
  [5, 10, 20, 35, 50].forEach(function (n, i) {
    add('level-' + n, 'Level ' + n, '🏆', 'Reach player level ' + n + '.', 40 + 40 * i, i >= 3 ? i - 1 : 0, 80 + 50 * i, function (S, H) { return H.level >= n; });
  });
  [[12, 'Beachcomber', 60, 0], [36, 'Treasure Spotter', 150, 2], [72, 'Master Collector', 300, 3]].forEach(function (a) {
    add('collect-' + a[0], a[1], '📖', 'Find ' + a[0] + ' collectibles.', a[2], a[3], a[2], function (S, H) { return H.collected >= a[0]; });
  });
  add('build-10', 'Little Builder', '🔨', 'Place 10 things while decorating.', 60, 0, 80, function (S, H) { return H.placed >= 10; });
  add('wardrobe-10', 'Dress-up Fun', '🧥', 'Own 10 outfit items.', 50, 0, 70, function (S, H) { return H.owned >= 10; });
  add('wardrobe-30', 'Wardrobe Star', '👑', 'Own 30 outfit items.', 150, 2, 150, function (S, H) { return H.owned >= 30; });
  [[50, 'Quick Thinker', 40, 0], [200, 'Brainy Explorer', 100, 0], [500, 'Super Brain', 250, 2]].forEach(function (a) {
    add('answers-' + a[0], a[1], '🧠', 'Answer ' + a[0] + ' questions correctly.', a[2], a[3], a[2], function (S, H) { return H.questions >= a[0]; });
  });
  add('streak-10', 'On a Roll', '🔥', 'Get 10 answers right in a row.', 50, 0, 80, function (S, H) { return H.streak >= 10; });
  add('three-star-game', 'Perfect Player', '🌟', 'Get 3 stars on all 12 levels of one minigame.', 200, 3, 200, function (S, H) { return H.threeStarGame; });
  add('all-islands', 'Island Explorer', '🗺️', 'Unlock all six islands.', 120, 2, 150, function (S, H) { return H.islands >= 6; });
  add('helper-10', 'Good Helper', '🤝', 'Finish 10 helper tasks.', 80, 1, 100, function (S, H) { return H.helpers >= 10; });
  add('gates-6', 'Bridge Builder', '🌉', 'Open all six island bridges.', 100, 1, 120, function (S, H) { return H.gates >= 6; });

  var byId = {};
  list.forEach(function (a) { byId[a.id] = a; });
  return { list: list, byId: byId };
});
