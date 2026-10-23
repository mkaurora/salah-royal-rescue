/* Minigame entry: level select (stars, locks, thresholds) -> tutorial card -> the game view (phase 3 registers
 * SI.minigameViews[game] = { start(level, done(score)) } from js/minigames/*), win screen with coin fly-to-counter. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on;
  var P = SI.progress, MG = SI.minigames, Q = SI.quests, BUILD = SI.build, BI = SI.buildItems;
  SI.minigameViews = SI.minigameViews || {};

  function stars(n, big) { var h = ''; for (var i = 0; i < 3; i++) h += ui.icon(i < n ? 'star' : 'starOff', big ? 'big' : ''); return '<span class="stars">' + h + '</span>'; }

  function questLevel(game) {
    var ob = Q.objective(A.S); if (!ob || ob.step.type !== 'minigame' || ob.step.game !== game) return null;
    return { level: ob.step.level, stars: ob.step.stars };
  }
  function open(game, island) {
    if (SI.mgcore) SI.mgcore.close();
    var S = A.S, G = MG.byId[game], ql = questLevel(game);
    var p = ui.popup({ title: G.icon + ' ' + G.name, headCls: 'orange', cls: 'levels' });
    p.body.innerHTML = '<p class="sm center">' + ui.esc(G.tip) + '</p><div class="lgrid"></div>';
    var grid = p.body.querySelector('.lgrid');
    for (var L = 1; L <= MG.LEVELS; L++) (function (L) {
      var u = P.levelUnlocked(S, game, L), st = P.bestStars(S, game, L), b = el('button', 'lvl' + (u.ok ? '' : ' locked'));
      b.innerHTML = '<b>' + L + '</b>' + (u.ok ? stars(st) : '<span class="lk">' + ui.icon('lock') + '</span>') + (ql && ql.level === L ? '<span class="qbadge" title="Quest">📜</span>' : '');
      on(b, function () { if (!u.ok) { ui.toast(u.text, 2200); SI.audio.play('nope'); return; } p.close(true); tutorial(game, L); });
      grid.appendChild(b);
    })(L);
    if (ql) p.body.insertBefore(el('p', 'qhintline', '📜 Quest: win ' + ql.stars + ' ⭐ on level ' + ql.level), p.body.firstChild.nextSibling);
    var sum = el('div', 'lsum', 'Total ' + ui.icon('star') + ' <b>' + P.totalStars(S) + '</b>'); p.body.appendChild(sum);
  }

  function tutorial(game, L) {
    if (SI.mgcore) SI.mgcore.close();
    var S = A.S, G = MG.byId[game], th = MG.thresholds(game, L), rw = MG.reward(L, 3, P.bestStars(S, game, L));
    var p = ui.popup({ title: G.name + ' · Level ' + L, headCls: 'orange', cls: 'tut' });
    var rule = MG.generate(game, L, 1); 
    p.body.innerHTML = '<div class="bigemoji">' + G.icon + '</div><p>' + ui.esc(G.tip) + '</p><p class="sm">' + ui.esc(G.rule) + '</p><div class="thr">' + ui.esc(MG.describe(game, L)) + '</div>' +
      '<p class="sm">Best: ' + stars(P.bestStars(S, game, L)) + '</p><button class="btn big green go">Start!</button>';
    on(p.body.querySelector('.go'), function () { p.close(true); start(game, L); });
  }

  function start(game, L) {
    var view = SI.minigameViews[game];
    if (view && view.start) { view.start(L, function (score) { finish(game, L, score); }); return; }
    var p = ui.popup({ title: MG.byId[game].name, headCls: 'orange', cls: 'offer' });
    p.body.innerHTML = '<div class="bigemoji">🛠️</div><p>This game is being finished and will arrive in the next update. Your levels and stars are safe!</p><button class="btn big green ok">OK</button>';
    on(p.body.querySelector('.ok'), function () { p.close(); });
  }

  /** a finished play (score in the game's unit) → saves, rewards, win screen (coin fly-to-counter), quest events */
  function finish(game, L, score) {
    var S = A.S, before = { coins: S.coins, xp: S.xp, level: S.level }, res = SI.game.track(function () { return P.recordMinigame(S, game, L, score); });
    if (!res.ok) { if (SI.mgcore) SI.mgcore.close(); open(game); return res; }
    var ev = Q.advance(S); A.persist();
    var G = MG.byId[game], th = MG.thresholds(game, L), won = res.stars > 0, lower = th.lowerBetter;
    var p = ui.popup({ title: won ? 'Well done!' : 'Nice try!', headCls: won ? 'gold' : 'blue', cls: 'win', dismiss: false, close: false });
    var nextT = lower ? (res.stars < 2 ? th.t2 : res.stars < 3 ? th.t3 : 0) : (res.stars < 1 ? th.t1 : res.stars < 2 ? th.t2 : res.stars < 3 ? th.t3 : 0);
    var scoreLine = lower ? score + ' flips' : score + ' / ' + th.total + ' ' + th.unit;
    var hintLine = nextT ? (lower ? 'Next ⭐ at ' + nextT + ' flips or fewer' : 'Next ⭐ at ' + nextT + ' ' + th.unit) : 'Perfect! All 3 stars!';
    p.body.innerHTML = '<div class="winstars">' + stars(res.stars, true) + '</div><p class="wmsg">' + (won ? (res.improved ? 'New best on level ' + L + '!' : 'Level ' + L + ' cleared!') : 'You need a little more to earn a star. Try again!') + '</p>' +
      '<div class="wscore"><b>' + ui.esc(scoreLine) + '</b><small>' + ui.esc(hintLine) + '</small></div>' +
      SI.game.rewardLine({ coins: res.coins, xp: res.xp }) +
      '<div class="wchips"><div class="chip coin">' + ui.icon('coin') + '<b>' + (S.coins - res.coins) + '</b></div><div class="wlv">Level ' + S.level + '<div class="pbar"><i style="width:' + Math.round(100 * (S.xp - P.cumXp(S.level)) / Math.max(1, P.xpToNext(S.level))) + '%"></i></div></div></div>' +
      '<div class="btnrow"><button class="btn big green again">Play again</button>' + (res.stars && L < MG.LEVELS ? '<button class="btn big purple nextl">Next level</button>' : '') + '<button class="btn big grey back">Levels</button></div>';
    SI.audio.play(won ? 'win' : 'wrong');
    var chip = p.body.querySelector('.wchips .chip.coin'), cb = chip.querySelector('b'), shown = S.coins - res.coins;
    if (res.coins) {
      var r0 = p.body.querySelector('.rw').getBoundingClientRect(), n = Math.min(10, 3 + res.stars * 2), per = Math.ceil(res.coins / n);
      setTimeout(function () { ui.fly('coin', n, r0.left + r0.width / 2, r0.top + r0.height / 2, chip, function () { shown = Math.min(S.coins, shown + per); cb.textContent = shown; }); }, 450);
      setTimeout(function () { cb.textContent = S.coins; }, 450 + 650 + n * 110 + 200);
    }
    on(p.body.querySelector('.again'), function () { p.close(true); start(game, L); });
    var nx = p.body.querySelector('.nextl'); if (nx) on(nx, function () { p.close(true); var u = P.levelUnlocked(A.S, game, L + 1); if (u.ok) tutorial(game, L + 1); else open(game); });
    on(p.body.querySelector('.back'), function () { p.close(true); open(game); });
    SI.game.questEvents(ev);
    return res;
  }

  SI.play = { open: open, tutorial: tutorial, start: start, finish: finish, stars: stars };
})(typeof self !== 'undefined' ? self : this);
