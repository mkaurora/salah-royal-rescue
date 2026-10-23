/* Playing a level: pre-level popup, board screen + HUD, move flow (swap -> events -> animation -> win / out of moves),
 * in-game boosters, hint, tip cards, win / out-of-moves / fail popups, pause. TW.play. */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {}, UI = TW.ui, A = TW.app, el = UI.el, $ = UI.$, on = UI.on, icon = UI.icon;
  var P = TW.progress, G_ = TW.game, B = TW.board, LV = TW.levels;
  var PL = {};
  var view = null, hud = {}, st = null, L = null, Gm = null, busy = false, hintTimer = 0, easier = false, preKinds = [], gen = 0;
  var shown = [], hammerOn = false, over = false, usedPre = [], freeKind = null, rootEl = null;

  var GOAL_TXT = { color: function (g) { return 'Collect ' + g.n; }, crate: function (g) { return 'Break ' + g.n + ' crate' + (g.n > 1 ? 's' : ''); }, oil: function (g) { return 'Clean ' + g.n + ' oil'; }, chain: function (g) { return 'Free ' + g.n + ' chain' + (g.n > 1 ? 's' : ''); }, item: function (g) { return 'Drop ' + g.n + ' toolbox' + (g.n > 1 ? 'es' : ''); } };
  function goalIcon(g) { return g.type === 'color' ? 'tile' + g.color : g.type === 'crate' ? 'crate' : g.type === 'oil' ? 'oil' : g.type === 'chain' ? 'chain' : 'item'; }
  var urlCache = {};
  function iconUrl(kind) { if (!urlCache[kind]) urlCache[kind] = TW.sprites.icon(kind, 64).toDataURL(); return urlCache[kind]; }

  /* ------------------------------------------------------------ tips (first time an obstacle appears) */
  var tipsSeen = {};
  try { tipsSeen = JSON.parse(localStorage.getItem('truckworkshop-tips') || '{}') || {}; } catch (e) { tipsSeen = {}; }
  function markTip(k) { tipsSeen[k] = 1; try { localStorage.setItem('truckworkshop-tips', JSON.stringify(tipsSeen)); } catch (e) { /* ignore */ } }
  function tipFor(Lv) {
    var s = Lv.layout.join(''), T = LV.TIPS;
    var cands = [['crate', /[123]/, 5, 'crate'], ['crate2', /[23]/, 15, 'crate'], ['oil', /[ob]/, 18, 'oil'], ['item', /i/, 25, 'item'], ['chain', /[cb]/, 30, 'chain'], ['stone', /S/, 40, 'stone'], ['crate3', /3/, 60, 'crate']];
    for (var i = 0; i < cands.length; i++) if (cands[i][1].test(s) && !tipsSeen[cands[i][0]]) return { key: cands[i][0], text: T[cands[i][2]], icon: cands[i][3] };
    return null;
  }
  PL.skipTips = function () { ['crate', 'crate2', 'crate3', 'oil', 'item', 'chain', 'stone', 'sp-rocket', 'sp-bomb', 'sp-gem'].forEach(markTip); };
  var SPECIAL_TIP = { 1: ['rocket', 2, 'rocket'], 2: ['rocket', 2, 'rocket'], 3: ['bomb', 8, 'dynamite'], 4: ['gem', 12, 'rainbow'] };

  function showTip(tip, then) {
    markTip(tip.key);
    var pop = UI.popup({ title: 'New!', headCls: 'green', cls: 'tip', close: false, dismiss: false, onClose: then });
    var ic = tip.icon === 'stone' ? 'tile0' : tip.icon; var holder = el('div', 'tipic');
    if (tip.icon === 'stone') { var c = TW.sprites.build(64).stone; var cc = TW.sprites.mk(64); cc.getContext('2d').drawImage(c, 0, 0); holder.appendChild(cc); }
    else holder.appendChild(UI.boosterIcon(ic, 72));
    pop.body.appendChild(holder); pop.body.appendChild(el('div', 'tiptxt', tip.text));
    var ok = el('button', 'btn-green wide', 'Got it!'); on(ok, function () { pop.close(); }); pop.body.appendChild(ok);
  }

  /* ------------------------------------------------------------ pre-level popup */
  PL.openPre = function (n) {
    var S = A.S; if (n == null) n = S.level;
    var Lv = LV.level(n), canEasier = P.easierOffered(S, n);
    var useEasier = false, sel = {};
    var first = !S.stars[n] && !(S.fails[n] > 0);
    var pop = UI.popup({ title: 'Level ' + n, headCls: 'red', cls: 'pre', onClose: function () { } });
    var b = pop.body;
    // streak box
    var seg = P.streakSegments(S), sbox = el('div', 'streakbox');
    sbox.innerHTML = '<div class="schest">' + UI.ICON.chest + '</div><div class="swins"><div class="sw-n">' + icon('flame', 'fl') + '<b>' + S.streak + '</b><span>WIN' + (S.streak === 1 ? '' : 'S') + '</span></div><div class="sbar">' + [1, 2, 3].map(function (k) { return '<i' + (k <= seg ? ' class="on"' : '') + '></i>'; }).join('') + '</div></div><div class="sgem"></div><div class="sgl">' + (S.streak % 3) + '/3</div>';
    sbox.querySelector('.sgem').appendChild(UI.boosterIcon('rainbow', 54)); b.appendChild(sbox);
    // goals
    var gl = el('div', 'pregoals'); Lv.goals.forEach(function (g) { var d = el('div', 'pg'); var im = el('img'); im.src = iconUrl(goalIcon(g)); d.appendChild(im); d.appendChild(el('span', null, GOAL_TXT[g.type](g))); gl.appendChild(d); });
    var mv = el('div', 'pg moves', '<b id="pre-moves">' + Lv.moves + '</b><span>moves</span>'); gl.appendChild(mv);
    b.appendChild(gl);
    if (Lv.tag === 'hard') b.insertBefore(el('div', 'hardtag', 'Big level! You can do it!'), gl);
    b.appendChild(el('div', 'seltitle', 'Select Boosters'));
    var slots = el('div', 'slots'); b.appendChild(slots);
    var free = P.freeBooster(S);
    ['rocket', 'dynamite', 'rainbow'].forEach(function (k) {
      var has = S.boosters[k], sl = el('button', 'slot' + (has ? '' : ' empty'));
      sl.appendChild(UI.boosterIcon(k, 52)); sl.appendChild(el('span', 'scnt', has ? 'x' + has : '0'));
      sl.appendChild(el('span', 'stick', icon('check')));
      on(sl, function () {
        if (!has) { UI.toast('Win levels or open chests to get more!'); return; }
        sel[k] = !sel[k]; sl.classList.toggle('sel', !!sel[k]);
      });
      slots.appendChild(sl);
    });
    if (free) b.appendChild(el('div', 'freeb', icon('flame', 'fl') + ' Streak bonus: a free <b>' + TW.panels.BNAME[free] + '</b> on the board!'));
    var play = el('button', 'btn-play', '<span>Play</span>' + (first ? '<em class="tag">1st Try</em>' : ''));
    on(play, function () { pop.close(true); start(n, { easier: useEasier, pre: Object.keys(sel).filter(function (k) { return sel[k]; }) }); });
    var pw = el('div', 'playwrap'); pw.appendChild(play); b.appendChild(pw);
    if (canEasier) {
      var ez = el('button', 'btn-easy', 'Easier try'); on(ez, function () {
        useEasier = !useEasier; ez.classList.toggle('on', useEasier); ez.textContent = useEasier ? 'Easier try ✓' : 'Easier try';
        var E = useEasier ? LV.easier(Lv) : Lv; $('#pre-moves').textContent = E.moves;
      });
      b.appendChild(ez);
    }
    return pop;
  };

  /* ------------------------------------------------------------ game screen */
  function buildScreen() {
    rootEl = $('#game'); rootEl.innerHTML = '';
    var bgd = el('div', 'gbg'); rootEl.appendChild(bgd);
    var h = el('div', 'ghud');
    hud.pause = el('button', 'gpause', icon('pause')); on(hud.pause, function () { pause(); });
    hud.goals = el('div', 'ggoals');
    hud.moves = el('div', 'gmoves', '<small>Moves</small><b>0</b>');
    h.append(hud.pause, hud.goals, hud.moves); rootEl.appendChild(h);
    hud.bar = el('div', 'starbar', '<div class="sb-track"><i></i></div><div class="sb-stars"></div>'); rootEl.appendChild(hud.bar);
    hud.lvl = el('div', 'glevel'); rootEl.appendChild(hud.lvl);
    hud.top = h;
    var bot = el('div', 'gbot');
    hud.hammer = el('button', 'gboost'); hud.shuffle = el('button', 'gboost');
    hud.hammer.appendChild(UI.boosterIcon('hammer', 44)); hud.shuffle.appendChild(UI.boosterIcon('shuffle', 44));
    hud.hammer.appendChild(el('span', 'bcount', '0')); hud.shuffle.appendChild(el('span', 'bcount', '0'));
    hud.hammer.appendChild(el('span', 'blabel', 'Hammer')); hud.shuffle.appendChild(el('span', 'blabel', 'Shuffle'));
    on(hud.hammer, function () { toggleHammer(); }); on(hud.shuffle, function () { doShuffle(); });
    bot.append(hud.hammer, hud.shuffle); rootEl.appendChild(bot); hud.bot = bot;
    hud.banner = el('div', 'gbanner'); rootEl.appendChild(hud.banner);
    var cv = el('canvas', 'gcanvas'); rootEl.appendChild(cv);
    var hit = el('div', 'ghit'); rootEl.appendChild(hit);
    view = TW.boardView.create({
      canvas: cv, hitEl: hit, hooks: {
        swap: function (a, b2) { doSwap(a, b2); }, tap: function (i) { doTap(i); }, hammer: function (i) { doHammer(i); },
        interact: function () { clearHint(); }, collect: collect, banner: banner
      }
    });
    hud.cv = cv; hud.hit = hit;
    root.addEventListener('resize', function () { if (!rootEl.classList.contains('hidden')) layout(); });
    document.addEventListener('visibilitychange', function () {
      if (rootEl.classList.contains('hidden')) return;
      if (document.hidden) { view.stop(); TW.audio.pause(); } else { view.start(); TW.audio.resume(); }
    });
  }
  function layout() {
    var r = rootEl.getBoundingClientRect(), tr = hud.top.getBoundingClientRect(), br = hud.bot.getBoundingClientRect(), sr = hud.bar.getBoundingClientRect();
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var y0 = sr.bottom - r.top + 6, y1 = br.top - r.top - 4;
    var cols = Gm.board.w, rows = Gm.board.h, cell = Math.floor(Math.min((r.width - 12) / (cols + 0.3), (y1 - y0) / (rows + 0.3)));
    view.layout(r.width, r.height, dpr, { x: 6, y: y0 + 6, w: r.width - 12, h: Math.min(y1 - y0, Math.round((rows + 0.45) * cell)) });
    var rc = view.rect();
    var gap = br.top - r.top - (rc.y + rc.h) - 14;
    if (hud.veh) { hud.veh.remove(); hud.veh = null; }
    if (gap >= 60) {
      var vh = Math.min(gap, 150), c = TW.panels.vehCanvas(A.S.ws.cur, Math.round(vh * 1.83), vh, { n: A.S.ws.done });
      c.className = 'gveh'; c.style.bottom = (r.bottom - br.top + (gap - vh) / 2 + 6) + 'px'; rootEl.insertBefore(c, hud.cv); hud.veh = c;
    }
  }

  function updateHud(full) {
    hud.moves.querySelector('b').textContent = Math.max(0, Gm.movesLeft);
    hud.moves.classList.toggle('low', Gm.movesLeft <= 3 && Gm.movesLeft > 0);
    Gm.goals.forEach(function (g, i) { updateGoal(i); });
    var max = L.stars[1] * 1.15, fill = Math.min(1, Gm.score / max);
    hud.bar.querySelector('.sb-track i').style.width = (fill * 100) + '%';
    var stars = hud.bar.querySelectorAll('.sb-stars span');
    if (stars.length) { stars[0].classList.toggle('on', Gm.status !== 'playing' && Gm.status !== 'lost' || fill > 0.08); stars[1].classList.toggle('on', Gm.score >= L.stars[0]); stars[2].classList.toggle('on', Gm.score >= L.stars[1]); }
    var b = A.S.boosters;
    hud.hammer.querySelector('.bcount').textContent = b.hammer; hud.shuffle.querySelector('.bcount').textContent = b.shuffle;
    hud.hammer.classList.toggle('empty', !b.hammer); hud.shuffle.classList.toggle('empty', !b.shuffle);
    hud.hammer.classList.toggle('on', hammerOn);
  }
  function updateGoal(i) {
    var g = Gm.goals[i], chip = hud.goals.children[i]; if (!chip) return;
    var left = Math.max(0, g.need - shown[i]), done = left <= 0;
    chip.classList.toggle('done', done);
    chip.querySelector('.gn').innerHTML = done ? icon('check') : left;
  }
  function buildGoals() {
    hud.goals.innerHTML = '';
    Gm.goals.forEach(function (g, i) {
      var chip = el('div', 'gchip'); var im = el('img'); im.src = iconUrl(goalIcon(g)); chip.appendChild(im); chip.appendChild(el('span', 'gn', g.need)); hud.goals.appendChild(chip);
    });
    hud.goals.dataset.n = Gm.goals.length;
    var sb = hud.bar.querySelector('.sb-stars'); sb.innerHTML = '';
    var max = L.stars[1] * 1.15, pos = [0.1, L.stars[0] / max, L.stars[1] / max];
    pos.forEach(function (p) { var s = el('span', null, UI.ICON.star); s.style.left = (p * 100) + '%'; sb.appendChild(s); });
  }

  function start(n, o) {
    o = o || {}; var S = A.S;
    easier = !!o.easier;
    L = LV.level(n); if (easier) L = LV.easier(L);
    usedPre = P.spendBoosters(S, o.pre || []); freeKind = P.freeBooster(S);
    var pre = usedPre.slice(); if (freeKind) pre.push(freeKind);
    Gm = G_.create(L, { attempt: (S.fails[n] || 0) + (o.retry || 0), pre: pre });
    A.persist();
    if (!rootEl) buildScreen();
    TW.home.hide(); rootEl.classList.remove('hidden'); TW.home.loopStop();
    rootEl.classList.toggle('hard', L.tag === 'hard');
    hud.lvl.innerHTML = 'Level ' + n + (L.tag === 'hard' ? ' <em>Big level!</em>' : '') + (easier ? ' <em class="ez">Easier</em>' : '');
    shown = Gm.goals.map(function () { return 0; }); over = false; hammerOn = false; busy = false;
    buildGoals(); updateHud(true);
    TW.audio.setMood('game');
    requestAnimationFrame(function () {
      layout(); view.load(Gm.board); layout(); view.start(); view.setHammer(false);
      var tip = tipFor(L);
      busy = true;
      var go = function () { busy = false; armHint(); };
      if (tip) setTimeout(function () { showTip(tip, go); }, 350); else go();
    });
    gen++;
  }
  PL.start = start;

  /* ------------------------------------------------------------ moves */
  function clearHint() { clearTimeout(hintTimer); view && view.setHint(null); }
  function armHint() {
    clearTimeout(hintTimer);
    hintTimer = setTimeout(function () {
      if (busy || over || Gm.status !== 'playing') return;
      var m = B.findHint(Gm.board); if (m) view.setHint({ a: m.a, b: m.b });
    }, 5000);
  }

  function run(events, after) {
    busy = true; view.locked = false;
    return view.play(events, Gm.board).then(function () {
      shown = Gm.goals.map(function (g) { return g.have; }); updateHud();
      return after ? after() : null;
    });
  }

  function doSwap(a, b2) {
    if (busy || over || Gm.status !== 'playing') return;
    clearHint(); var r = G_.swap(Gm, a, b2);
    if (!r.valid) { busy = true; view.play(r.events, Gm.board).then(function () { busy = false; armHint(); }); return; }
    updateMovesOnly(); specialTips(r.events);
    run(r.events, afterMove);
  }
  function doTap(i) {
    if (busy || over || Gm.status !== 'playing') return;
    clearHint(); var r = G_.tap(Gm, i); if (!r.valid) return;
    updateMovesOnly(); run(r.events, afterMove);
  }
  function updateMovesOnly() { hud.moves.querySelector('b').textContent = Math.max(0, Gm.movesLeft); }

  function afterMove() {
    if (Gm.status === 'won') return doWin();
    if (Gm.status === 'lost') return outOfMoves();
    busy = false; armHint();
  }

  function specialTips(events) {
    for (var i = 0; i < events.length; i++) {
      var e = events[i]; if (e.t !== 'create' || !e.s) continue;
      var k = e.s === 1 || e.s === 2 ? 'sp-rocket' : e.s === 3 ? 'sp-bomb' : 'sp-gem';
      if (!tipsSeen[k]) { markTip(k); var txt = LV.TIPS[e.s <= 2 ? 2 : e.s === 3 ? 8 : 12]; setTimeout(function (t) { banner(t, 2600); }.bind(null, txt), 900); return; }
    }
  }
  function banner(txt, ms) {
    var b = hud.banner; b.textContent = txt; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
    clearTimeout(banner.t); banner.t = setTimeout(function () { b.classList.remove('show'); }, ms || 1300);
  }

  /** The board reports something collected at canvas (x, y): fly a little icon into the matching goal chip. */
  function collect(type, color, x, y) {
    for (var i = 0; i < Gm.goals.length; i++) {
      var g = Gm.goals[i]; if (g.type !== type || (type === 'color' && g.color !== color)) continue;
      if (shown[i] >= g.need) return;
      var chip = hud.goals.children[i]; if (!chip) return;
      shown[i]++; (function (i, chip) {
        var d = el('img', 'gfly'); d.src = iconUrl(goalIcon(g)); var ar = rootEl.getBoundingClientRect(), cr = chip.getBoundingClientRect(), myGen = gen;
        d.style.left = x + 'px'; d.style.top = y + 'px'; rootEl.appendChild(d);
        var dx = cr.left + cr.width / 2 - ar.left - x, dy = cr.top + cr.height / 2 - ar.top - y;
        d.animate([{ transform: 'translate(-50%,-50%) scale(.9)', opacity: 1 }, { transform: 'translate(calc(-50% + ' + dx * 0.5 + 'px),calc(-50% + ' + (dy * 0.5 - 30) + 'px)) scale(1.1)', opacity: 1, offset: 0.5 }, { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + dy + 'px)) scale(.5)', opacity: 0.9 }], { duration: 520, easing: 'ease-in' }).onfinish = function () {
          if (d.parentNode) d.parentNode.removeChild(d);
          if (myGen === gen) { updateGoal(i); chip.classList.remove('bump'); void chip.offsetWidth; chip.classList.add('bump'); }
        };
      })(i, chip);
      return;
    }
  }

  /* ------------------------------------------------------------ boosters */
  function toggleHammer() {
    if (busy || over) return;
    if (!A.S.boosters.hammer) { UI.toast('Win levels to earn more hammers!'); return; }
    hammerOn = !hammerOn; view.setHammer(hammerOn); clearHint(); hud.hammer.classList.toggle('on', hammerOn);
    rootEl.classList.toggle('hammering', hammerOn); if (hammerOn) banner('Tap a tile to smash it!', 2000);
  }
  function doHammer(i) {
    if (!hammerOn || busy) return;
    var r = G_.useBooster(Gm, 'hammer', i);
    if (!r.valid) { banner('Pick a tile or crate!', 1200); return; }
    hammerOn = false; view.setHammer(false); rootEl.classList.remove('hammering'); P.spendBooster(A.S, 'hammer'); A.persist();
    var c = view.cellCenter(i); TW.fx.burst(c.x, c.y, 10, '#cfd6dd', 200, 8, 0.5); TW.fx.shake(5, 0.2); TW.audio.play('boom');
    run(r.events, afterMove);
  }
  function doShuffle() {
    if (busy || over) return;
    if (!A.S.boosters.shuffle) { UI.toast('Win levels to earn more shuffles!'); return; }
    var r = G_.useBooster(Gm, 'shuffle'); if (!r.valid) return;
    P.spendBooster(A.S, 'shuffle'); A.persist(); clearHint(); run(r.events, afterMove);
  }

  /* ------------------------------------------------------------ end of level */
  function doWin() {
    over = true;
    var r = G_.finish(Gm);
    banner('Level complete!', 1200);
    return run(r.events, function () { return UI.wait(600).then(winScreen); });
  }

  function winScreen() {
    var S = A.S, n = L.n, hadStars = S.stars[n] || 0, oldCoins = S.coins, oldWr = S.wrenches, oldStars = S.stats.stars;
    var res = P.winLevel(S, n, Gm.stars); A.persist();
    TW.audio.play('win'); TW.fx.shake(0, 0);
    var pop = UI.popup({ title: 'Level ' + n, headCls: 'green', cls: 'win', close: false, dismiss: false });
    var b = pop.body;
    b.innerHTML = '<div class="wtitle">Level Complete!</div><div class="wstars">' + [1, 2, 3].map(function (k) { return '<span class="ws ws' + k + '">' + UI.ICON.starOff + '<span class="lit">' + UI.ICON.star + '</span></span>'; }).join('') + '</div><div class="wscore">Score <b id="wsc">0</b></div>';
    var rew = el('div', 'rewards win'); b.appendChild(rew);
    function rw(ic, n2, label, id) { var d = el('div', 'rw'); d.id = id || ''; d.appendChild(ic); d.appendChild(el('b', null, '+' + n2)); if (label) d.appendChild(el('small', null, label)); rew.appendChild(d); d.style.opacity = 0; return d; }
    var rws = [rw(el('span', 'rwi', UI.ICON.coin), res.coins, 'Coins'), rw(el('span', 'rwi', UI.ICON.wrench), res.wrenches, 'Wrenches'), rw(el('span', 'rwi', UI.ICON.star), Gm.stars, 'Chest')];
    if (res.bonusBooster) rws.push(rw(UI.boosterIcon(res.bonusBooster, 44), 1, TW.panels.BNAME[res.bonusBooster]));
    var cb = el('div', 'wchest', '<span class="wc-ic">' + UI.ICON.chest + '</span><span class="wc-bar"><i style="width:' + Math.max(6, P.chestPercent(S)) + '%"></i></span><b>' + P.chestPercent(S) + '%</b>'); b.appendChild(cb);
    if (res.streak >= 1) b.appendChild(el('div', 'wstreak', icon('flame', 'fl') + ' ' + res.streak + ' win' + (res.streak > 1 ? 's' : '') + ' in a row!'));
    var btns = el('div', 'wbtns'); b.appendChild(btns);
    var next = el('button', 'btn-green wide', 'Next level'), home = el('button', 'btn-blue small', 'Home');
    btns.append(next, home); btns.style.visibility = 'hidden';
    // animate: stars pop one by one, score counts up, rewards appear
    var k, delay = 350;
    for (k = 1; k <= Gm.stars; k++) (function (k) { setTimeout(function () { var s = b.querySelector('.ws' + k); if (!s) return; s.classList.add('on'); TW.audio.play('star', k); var r = s.getBoundingClientRect(); TW.fx.sparkle(r.left + r.width / 2, r.top + r.height / 2, 0, '#ffe066', 10); }, delay + (k - 1) * 450); })(k);
    var t0 = performance.now(), sc = $('#wsc'), total = Gm.score;
    (function cnt() { var u = Math.min(1, (performance.now() - t0) / 1100); sc.textContent = Math.round(total * (1 - Math.pow(1 - u, 3))); if (u < 1 && sc.isConnected) requestAnimationFrame(cnt); })();
    var after = delay + Gm.stars * 450;
    rws.forEach(function (d, i) { setTimeout(function () { d.style.opacity = 1; d.classList.add('pop'); TW.audio.play('pop'); }, after + i * 200); });
    setTimeout(function () { btns.style.visibility = 'visible'; btns.classList.add('pop'); }, after + rws.length * 200 + 100);
    function leave(then) {
      var rc = rew.getBoundingClientRect(); pop.close(true);
      rootEl.classList.add('hidden'); view.stop(); TW.home.show(); TW.home.refresh();
      var cp = $('#n-coins'), wp = $('#n-wr'), sp = $('#n-stars');
      cp.textContent = oldCoins; wp.textContent = oldWr; sp.textContent = oldStars;
      var cx = rc.left + rc.width * 0.3, cy = rc.top + rc.height / 2;
      UI.fly('coin', Math.min(8, 3 + res.coins / 10 | 0), cx, cy, cp.parentNode, function (i, nn) { cp.textContent = oldCoins + Math.round(res.coins * (i + 1) / nn); });
      UI.fly('wrench', Math.min(5, res.wrenches + 1), cx + rc.width * 0.2, cy, wp.parentNode, function (i, nn) { wp.textContent = oldWr + Math.round(res.wrenches * (i + 1) / nn); });
      UI.fly('star', Math.min(4, Gm.stars + 1), cx + rc.width * 0.4, cy, sp.parentNode, function (i, nn) { sp.textContent = oldStars + Math.round((S.stats.stars - oldStars) * (i + 1) / nn); });
      setTimeout(function () { TW.home.refresh(); if (then) then(); else afterHome(res); }, 1400);
    }
    on(next, function () { leave(function () { afterHome(res); PL.openPre(A.S.level); }); });
    on(home, function () { leave(null); });
  }
  function afterHome(res) {
    if (res.chestReady) UI.toast('A chest is ready to open!');
  }

  function outOfMoves() {
    over = false; var canX = G_.canExtra(Gm); TW.audio.play('fail');
    var pop = UI.popup({ title: 'Out of moves!', headCls: 'red', cls: 'oom', close: false, dismiss: false });
    var b = pop.body;
    var left = el('div', 'oom-goals'); Gm.goals.forEach(function (g) { var d = el('div', 'pg'); var im = el('img'); im.src = iconUrl(goalIcon(g)); d.appendChild(im); d.appendChild(el('span', null, Math.max(0, g.need - g.have) + ' to go')); left.appendChild(d); });
    b.appendChild(left);
    if (canX) {
      b.appendChild(el('div', 'oomtxt', 'So close! Here are <b>5 more moves</b>, free!'));
      var yes = el('button', 'btn-green wide', '+5 Moves <em class="free">FREE</em>'), no = el('button', 'btn-link', 'No thanks');
      on(yes, function () { pop.close(true); G_.extraMoves(Gm); updateHud(); busy = false; over = false; TW.audio.play('fix'); banner('+5 moves!', 1200); armHint(); });
      on(no, function () { pop.close(true); failScreen(); });
      b.append(yes, no);
    } else { b.appendChild(el('div', 'oomtxt', 'Let\'s try again!')); var ok = el('button', 'btn-green wide', 'Continue'); on(ok, function () { pop.close(true); failScreen(); }); b.appendChild(ok); }
  }

  function failScreen() {
    over = true; var S = A.S, n = L.n; P.failLevel(S, n); A.persist();
    var pop = UI.popup({ title: 'Level ' + n, headCls: 'red', cls: 'fail', close: false, dismiss: false });
    var b = pop.body; b.innerHTML = '<div class="ftitle">Almost!</div><div class="oomtxt">You can do it. Try once more!</div>';
    var ez = P.easierOffered(S, n);
    var again = el('button', 'btn-green wide', 'Try again'), home = el('button', 'btn-blue small', 'Home');
    on(again, function () { pop.close(true); start(n, { retry: 1, pre: [] }); });
    on(home, function () { pop.close(true); PL.goHome(); });
    b.appendChild(again);
    if (ez) { var eb = el('button', 'btn-easy on', 'Easier try'); on(eb, function () { pop.close(true); start(n, { easier: true, retry: 1, pre: [] }); }); b.appendChild(eb); }
    b.appendChild(home);
  }

  PL.goHome = function () { if (view) { view.stop(); clearHint(); } rootEl.classList.add('hidden'); TW.home.show(); TW.home.refresh(); };

  function pause() {
    if (busy && !over) { /* allow pausing while animating too */ }
    var pop = UI.popup({ title: 'Paused', headCls: 'blue', cls: 'pause', close: false, onClose: function () { } });
    var b = pop.body;
    var resume = el('button', 'btn-green wide', 'Resume'); on(resume, function () { pop.close(); armHint(); });
    var restart = el('button', 'btn-blue wide', 'Restart level'), quit = el('button', 'btn-red wide', 'Quit to Workshop');
    on(restart, function () { pop.close(true); if (Gm.movesUsed > 0 && Gm.status === 'playing') { P.failLevel(A.S, L.n); A.persist(); } start(L.n, { retry: 1, pre: [], easier: easier }); });
    on(quit, function () { pop.close(true); if (Gm.movesUsed > 0 && Gm.status === 'playing') { P.failLevel(A.S, L.n); A.persist(); } PL.goHome(); });
    var tg = el('div', 'pausetog');
    [['sound', 'sound'], ['music', 'music']].forEach(function (t) {
      var bt = el('button', 'round' + (A.S.settings[t[0]] ? ' on' : ''), UI.ICON[t[1]]); on(bt, function () { var v = A.S.settings[t[0]] = !A.S.settings[t[0]]; bt.classList.toggle('on', v); if (t[0] === 'sound') TW.audio.setSound(v); else TW.audio.setMusic(v); A.persist(); }); tg.appendChild(bt);
    });
    b.append(resume, restart, quit, tg);
  }

  /* ------------------------------------------------------------ test hook helpers */
  PL.state = function () { return { game: Gm, level: L, busy: busy, over: over, view: view, active: rootEl && !rootEl.classList.contains('hidden') }; };
  PL.swap = function (a, b) { doSwap(a, b); };
  PL.isBusy = function () { return busy; };
  PL.forceWin = function () { if (!Gm) return; Gm.goals.forEach(function (g) { g.have = g.need; shown = Gm.goals.map(function (g2) { return g2.need; }); }); Gm.status = 'won'; Gm.score = Math.max(Gm.score, L.stars[1]); updateHud(); busy = true; doWin(); };
  PL.forceLose = function () { if (!Gm) return; Gm.movesLeft = 0; Gm.status = 'lost'; updateHud(); busy = true; outOfMoves(); };
  PL.reload = function (board) { if (!Gm) return; Gm.board = board; view.load(board); busy = false; over = false; };

  TW.play = PL;
})(typeof self !== 'undefined' ? self : this);
