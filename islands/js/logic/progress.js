/* Save (new / load / sanitize / migrate), economy, XP + levels, wardrobe & build shop, island unlocks, minigame results,
 * collectibles, achievements, helper tasks and parents actions (PIN 1994). Pure: works on a save object S. UMD: SI.progress. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('islands', '../data/islands.js'), dep('collectibles', '../data/collectibles.js'), dep('questData', '../data/quests.js'),
    dep('wardrobe', '../data/wardrobe.js'), dep('buildItems', '../data/buildItems.js'), dep('achievements', '../data/achievements.js'),
    dep('minigames', './minigames.js'), dep('build', './build.js'), dep('learn', './learn.js'), dep('curriculum', '../data/curriculum/index.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.progress = mod; }
})(typeof self !== 'undefined' ? self : this, function (ISL, COL, QD, WD, BI, ACH, MG, BUILD, LEARN, CUR) {
  'use strict';

  var KEY = 'salahislands-save-v1', VERSION = 1, PIN = '1994', MAX_LEVEL = 50, CAP = 9999999;
  var ECON = { DAY_PLAYS: 16, DAY_ANSWERS: 40, DAY_HELPERS: 6, PLAY_MIN: 1.5, STORY_DAYS: 21 };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function int(v, lo, hi, d) { v = Math.floor(+v); return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  function isoDay(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  /* ------------------------------------------------------------------ XP / levels */
  function xpToNext(L) { return Math.round(50 + 18 * (L - 1) + 0.8 * (L - 1) * (L - 1)); }
  var CUM = [0];
  for (var lv = 1; lv < MAX_LEVEL; lv++) CUM.push(CUM[lv - 1] + xpToNext(lv));   // CUM[L-1] = XP needed to reach level L
  function levelFromXp(xp) {
    var L = 1; while (L < MAX_LEVEL && xp >= CUM[L]) L++;
    return { level: L, into: L >= MAX_LEVEL ? 0 : xp - CUM[L - 1], need: L >= MAX_LEVEL ? 0 : xpToNext(L) };
  }
  function levelReward(L) { return { coins: 20 + 5 * L, gems: L % 5 === 0 ? 1 : 0 }; }

  /* ------------------------------------------------------------------ new / sanitize / migrate */
  function defaultChains() { var q = {}; QD.chains.forEach(function (c) { q[c.id] = { step: 0, n: 0, done: false }; }); return q; }
  function newSave(now) {
    var S = {
      v: VERSION, name: 'Salah', created: now || Date.now(), avatar: WD.defaultAvatar(), owned: {}, coins: 50, gems: 0, xp: 0, level: 1,
      islands: { unlocked: [1], current: 1 }, quests: defaultChains(), gates: {}, minigames: {}, collectibles: {}, sets: {},
      build: { owned: {}, zones: {}, nextUid: 1 }, achievements: {}, helper: {},
      learn: { skills: {}, recent: [], adapt: { math: 0, english: 0, science: 0 }, run: { math: { right: 0, miss: 0 }, english: { right: 0, miss: 0 }, science: { right: 0, miss: 0 } } },
      settings: { sound: true, music: true, difficulty: 'normal', subjects: { math: true, english: true, science: true }, speech: false },
      stats: { plays: 0, correct: 0, wrong: 0, questions: 0, steps: 0, coinsEarned: 0, placed: 0, helpers: 0, streak: 0, bestStreak: 0 },
      seen: { intro: false, avatar: false, tutorials: {} }, world: null
    };
    checkUnlocks(S);
    return S;
  }

  function migrate(raw) {
    if (!isObj(raw)) return null;
    var o = clone(raw), v = +o.v || 0;
    if (v < 1) {   // v0 (prototype): gold/shells instead of coins/gems, flat stars map
      if (o.coins == null && o.gold != null) o.coins = o.gold;
      if (o.gems == null && o.shells != null) o.gems = o.shells;
      if (o.avatar && o.avatar.colour && !o.avatar.color) o.avatar.color = o.avatar.colour;
      o.v = 1;
    }
    return o;
  }

  function sanitize(raw) {
    var S = newSave(), o = migrate(raw);
    if (!o) return S;
    S.created = int(o.created, 0, 4e12, S.created);
    S.name = typeof o.name === 'string' && o.name.trim() ? o.name.trim().slice(0, 12) : 'Salah';
    S.coins = int(o.coins, 0, CAP, S.coins); S.gems = int(o.gems, 0, CAP, 0); S.xp = int(o.xp, 0, CAP, 0);
    S.level = levelFromXp(S.xp).level;

    // avatar
    var a = isObj(o.avatar) ? o.avatar : {}, av = S.avatar;
    WD.PART_KINDS.forEach(function (k) { if (typeof a[k] === 'string' && WD.partInfo(k, a[k])) av[k] = a[k]; });
    // owned
    if (isObj(o.owned)) Object.keys(o.owned).forEach(function (id) { if (o.owned[id] && (WD.byId[id] || WD.partIds.indexOf(id) >= 0)) S.owned[id] = true; });
    // equip (only owned items in the right slot)
    var eq = isObj(a.equip) ? a.equip : {};
    WD.SLOTS.forEach(function (slot) {
      var id = eq[slot];
      if (id === null) av.equip[slot] = null;
      else if (typeof id === 'string' && WD.byId[id] && WD.byId[id].slot === slot && S.owned[id]) av.equip[slot] = id;
    });
    WD.PART_KINDS.forEach(function (k) { if (!partOwned(S, k, av[k])) av[k] = WD.defaultAvatar()[k]; });
    WD.SLOTS.forEach(function (slot) { var id = av.equip[slot]; if (id && !S.owned[id]) av.equip[slot] = null; });

    // islands
    var un = isObj(o.islands) && Array.isArray(o.islands.unlocked) ? o.islands.unlocked : [1];
    S.islands.unlocked = un.map(function (n) { return Math.floor(+n); }).filter(function (n, i, arr) { return n >= 1 && n <= ISL.COUNT && arr.indexOf(n) === i; });
    if (S.islands.unlocked.indexOf(1) < 0) S.islands.unlocked.push(1);
    S.islands.unlocked.sort(function (x, y) { return x - y; });
    S.islands.unlocked = S.islands.unlocked.filter(function (n, i) { return n === i + 1; });   // islands unlock in order
    S.islands.current = S.islands.unlocked.indexOf(Math.floor(+(o.islands && o.islands.current))) >= 0 ? Math.floor(+o.islands.current) : 1;

    // quests
    QD.chains.forEach(function (c) {
      var q = isObj(o.quests) && isObj(o.quests[c.id]) ? o.quests[c.id] : {};
      var step = int(q.step, 0, c.steps.length, 0), done = q.done === true || step >= c.steps.length;
      S.quests[c.id] = { step: done ? c.steps.length : step, n: done ? 0 : int(q.n, 0, 99, 0), done: done };
    });
    ISL.list.forEach(function (i) { if (isObj(o.gates) && o.gates[i.gate.key]) S.gates[i.gate.key] = true; });

    // minigames
    if (isObj(o.minigames)) MG.IDS.forEach(function (g) {
      if (!isObj(o.minigames[g])) return;
      for (var L = 1; L <= MG.LEVELS; L++) {
        var e = o.minigames[g][L];
        if (!isObj(e)) continue;
        var st = int(e.stars, 0, 3, 0);
        if (!st && !(+e.plays > 0)) continue;
        (S.minigames[g] = S.minigames[g] || {})[L] = { stars: st, best: int(e.best, 0, 100000, 0), plays: int(e.plays, 0, 999999, 0) };
      }
    });
    // collectibles, sets, achievements
    if (isObj(o.collectibles)) Object.keys(o.collectibles).forEach(function (id) { if (o.collectibles[id] && COL.byId[id]) S.collectibles[id] = true; });
    if (isObj(o.sets)) Object.keys(o.sets).forEach(function (id) { if (o.sets[id] && (COL.setById[id] || id === 'all')) S.sets[id] = true; });
    if (isObj(o.achievements)) Object.keys(o.achievements).forEach(function (id) { if (o.achievements[id] && ACH.byId[id]) S.achievements[id] = true; });

    // build
    if (isObj(o.build)) {
      if (isObj(o.build.owned)) Object.keys(o.build.owned).forEach(function (id) { if (BI.byId[id]) { var n = int(o.build.owned[id], 0, 99, 0); if (n) S.build.owned[id] = n; } });
      var maxUid = 0;
      if (isObj(o.build.zones)) Object.keys(o.build.zones).forEach(function (zid) {
        var z = BUILD.zone(zid); if (!z) return;
        var layout = BUILD.cleanLayout(o.build.zones[zid], z);
        layout.forEach(function (p) { maxUid = Math.max(maxUid, p.uid); });
        S.build.zones[zid] = layout;
      });
      // never more placed than owned
      var cnt = {};
      Object.keys(S.build.zones).forEach(function (zid) {
        S.build.zones[zid] = S.build.zones[zid].filter(function (p) { cnt[p.item] = (cnt[p.item] || 0) + 1; if (cnt[p.item] > (S.build.owned[p.item] || 0)) { cnt[p.item]--; return false; } return true; });
      });
      S.build.nextUid = Math.max(int(o.build.nextUid, 1, CAP, 1), maxUid + 1);
    }
    // helper days
    if (isObj(o.helper)) Object.keys(o.helper).forEach(function (k) { if (/^h[1-6]$/.test(k) && /^\d{4}-\d{2}-\d{2}$/.test(String(o.helper[k]))) S.helper[k] = o.helper[k]; });
    // learn
    if (isObj(o.learn)) {
      if (isObj(o.learn.skills)) Object.keys(o.learn.skills).forEach(function (k) {
        var e = o.learn.skills[k]; if (!CUR.SKILLS[k] || !isObj(e)) return;
        var seen = int(e.seen, 0, CAP, 0), right = int(e.right, 0, seen, 0);
        S.learn.skills[k] = { seen: seen, right: right, first: int(e.first, 0, right, 0) };
      });
      if (Array.isArray(o.learn.recent)) S.learn.recent = o.learn.recent.filter(function (x) { return typeof x === 'string'; }).slice(-12);
      CUR.SUBJECTS.forEach(function (s) {
        S.learn.adapt[s] = int(o.learn.adapt && o.learn.adapt[s], -LEARN.ADAPT_MAX, LEARN.ADAPT_MAX, 0);
        var r = o.learn.run && o.learn.run[s];
        if (isObj(r)) S.learn.run[s] = { right: int(r.right, 0, 9, 0), miss: int(r.miss, 0, 9, 0) };
      });
    }
    // settings
    if (isObj(o.settings)) {
      var st2 = o.settings;
      S.settings.sound = st2.sound === undefined ? true : !!st2.sound; S.settings.music = st2.music === undefined ? true : !!st2.music; S.settings.speech = st2.speech === true;
      if (['easier', 'normal', 'harder'].indexOf(st2.difficulty) >= 0) S.settings.difficulty = st2.difficulty;
      CUR.SUBJECTS.forEach(function (s) { S.settings.subjects[s] = !(isObj(st2.subjects) && st2.subjects[s] === false); });
      if (!CUR.SUBJECTS.some(function (s) { return S.settings.subjects[s]; })) S.settings.subjects.math = true;
    }
    if (isObj(o.stats)) Object.keys(S.stats).forEach(function (k) { S.stats[k] = int(o.stats[k], 0, CAP, 0); });
    if (isObj(o.seen)) {
      S.seen.intro = o.seen.intro === true; S.seen.avatar = o.seen.avatar === true;
      if (isObj(o.seen.tutorials)) MG.IDS.forEach(function (g) { if (o.seen.tutorials[g]) S.seen.tutorials[g] = true; });
    }
    if (isObj(o.world) && ISL.byId[+o.world.island]) {
      var isl = ISL.byId[+o.world.island], wx = +o.world.x, wy = +o.world.y;
      if (S.islands.unlocked.indexOf(isl.n) >= 0 && wx >= 0 && wy >= 0 && wx < isl.w && wy < isl.h && isFinite(wx + wy)) S.world = { island: isl.n, x: wx, y: wy };
    }
    // derived state (no rewards here)
    checkUnlocks(S);
    refreshIslands(S);
    S.level = levelFromXp(S.xp).level;
    return S;
  }

  function load(storage) {
    try { var s = storage && storage.getItem(KEY); return sanitize(s ? JSON.parse(s) : null); } catch (e) { return newSave(); }
  }
  function save(storage, S) { try { storage.setItem(KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }

  /* ------------------------------------------------------------------ requirements */
  function chainDone(S, n) { var c = S.quests['q' + n]; return !!(c && c.done); }
  function chainsDone(S) { var n = 0; QD.chains.forEach(function (c) { if (S.quests[c.id] && S.quests[c.id].done) n++; }); return n; }
  function reqMet(S, req) {
    if (!req) return true;
    if (req.level) return S.level >= req.level;
    if (req.chain) return !!(S.quests[req.chain] && S.quests[req.chain].done);
    if (req.ach) return !!S.achievements[req.ach];
    if (req.set) return !!S.sets[req.set];
    if (req.stars) return totalStars(S) >= req.stars;
    if (req.island) return S.islands.unlocked.indexOf(req.island) >= 0;
    if (req.all) return !!S.sets.all;
    return true;
  }
  function reqText(req) {
    if (!req) return '';
    if (req.level) return 'Reach level ' + req.level;
    if (req.chain) return 'Finish the quest "' + (QD.byId[req.chain] ? QD.byId[req.chain].title : req.chain) + '"';
    if (req.ach) return 'Earn the trophy "' + (ACH.byId[req.ach] ? ACH.byId[req.ach].name : req.ach) + '"';
    if (req.set) return 'Complete the "' + (COL.setById[req.set] ? COL.setById[req.set].name : req.set) + '" collection';
    if (req.stars) return 'Earn ' + req.stars + ' stars';
    if (req.island) return 'Unlock ' + (ISL.byId[req.island] ? ISL.byId[req.island].name : 'island ' + req.island);
    if (req.all) return 'Find all ' + COL.items.length + ' collectibles';
    return '';
  }

  /* ------------------------------------------------------------------ coins, gems, xp */
  function addCoins(S, n) { n = Math.floor(n) || 0; S.coins = Math.max(0, Math.min(CAP, S.coins + n)); if (n > 0) S.stats.coinsEarned += n; return n; }
  function addGems(S, n) { n = Math.floor(n) || 0; S.gems = Math.max(0, Math.min(CAP, S.gems + n)); return n; }
  /** Adds XP, pays level-up rewards. Returns the list of level-ups [{level, coins, gems}]. */
  function addXp(S, n) {
    n = Math.max(0, Math.floor(n) || 0);
    var ups = [], before = S.level;
    S.xp = Math.min(CAP, S.xp + n);
    var now = levelFromXp(S.xp).level;
    for (var L = before + 1; L <= now; L++) { var r = levelReward(L); addCoins(S, r.coins); addGems(S, r.gems); ups.push({ level: L, coins: r.coins, gems: r.gems }); }
    S.level = now;
    if (ups.length) checkUnlocks(S);
    return ups;
  }
  function spend(S, coins, gems) {
    coins = coins || 0; gems = gems || 0;
    if (S.coins < coins) return { ok: false, reason: 'coins' };
    if (S.gems < gems) return { ok: false, reason: 'gems' };
    S.coins -= coins; S.gems -= gems; return { ok: true };
  }

  /** Pay a reward object { coins, gems, xp, wardrobe:[ids], build:[ids], gift:[{item,n}] } */
  function grant(S, r) {
    var out = { coins: 0, gems: 0, xp: 0, items: [], levelUps: [] };
    if (!r) return out;
    if (r.coins) out.coins = addCoins(S, r.coins);
    if (r.gems) out.gems = addGems(S, r.gems);
    (r.wardrobe || []).forEach(function (id) { if (WD.byId[id] && !S.owned[id]) { S.owned[id] = true; out.items.push(id); } });
    (r.build || []).forEach(function (id) { if (BI.byId[id]) { S.build.owned[id] = (S.build.owned[id] || 0) + 1; out.items.push(id); } });
    (r.gift || []).forEach(function (g) { if (BI.byId[g.item]) { S.build.owned[g.item] = (S.build.owned[g.item] || 0) + (g.n || 1); out.items.push(g.item); } });
    if (r.xp) { out.xp = r.xp; out.levelUps = addXp(S, r.xp); }
    return out;
  }

  /* ------------------------------------------------------------------ wardrobe */
  function partOwned(S, kind, key) {
    var p = WD.partInfo(kind, key);
    return !!p && (p.cost === 0 || !!S.owned[p.id]);
  }
  function isOwned(S, id) { return !!S.owned[id]; }
  /** free items whose requirement is met become owned; returns newly granted ids */
  function checkUnlocks(S) {
    var got = [];
    WD.items.forEach(function (it) {
      if (!S.owned[it.id] && it.cost === 0 && it.gems === 0 && reqMet(S, it.req)) { S.owned[it.id] = true; got.push(it.id); }
    });
    return got;
  }
  /** { owned, canBuy, reason, text } for the wardrobe UI */
  function itemStatus(S, id) {
    var it = WD.byId[id] || BI.byId[id];
    if (!it) return { owned: false, canBuy: false, reason: 'unknown' };
    var isWd = !!WD.byId[id];
    if (isWd && S.owned[id]) return { owned: true, canBuy: false, reason: 'owned' };
    if (!reqMet(S, it.req)) return { owned: false, canBuy: false, reason: 'locked', text: '🔒 ' + reqText(it.req) };
    if (S.coins < it.cost) return { owned: false, canBuy: false, reason: 'coins', text: 'Need ' + (it.cost - S.coins) + ' more coins' };
    if (S.gems < it.gems) return { owned: false, canBuy: false, reason: 'gems', text: 'Need ' + (it.gems - S.gems) + ' more gems' };
    return { owned: false, canBuy: true, reason: 'ok' };
  }
  function buyItem(S, id) {
    var it = WD.byId[id];
    if (!it) return { ok: false, reason: 'unknown' };
    var st = itemStatus(S, id);
    if (st.owned) return { ok: false, reason: 'owned' };
    if (!st.canBuy) return { ok: false, reason: st.reason };
    spend(S, it.cost, it.gems); S.owned[id] = true;
    return { ok: true, item: it };
  }
  function equip(S, id) {
    var it = WD.byId[id];
    if (!it) return { ok: false, reason: 'unknown' };
    if (!S.owned[id]) return { ok: false, reason: 'not-owned' };
    S.avatar.equip[it.slot] = id; return { ok: true };
  }
  function unequip(S, slot) { if (WD.SLOTS.indexOf(slot) < 0) return { ok: false, reason: 'unknown' }; S.avatar.equip[slot] = null; return { ok: true }; }
  function setPart(S, kind, key) {
    if (!WD.partInfo(kind, key)) return { ok: false, reason: 'unknown' };
    if (!partOwned(S, kind, key)) return { ok: false, reason: 'not-owned' };
    S.avatar[kind] = key; return { ok: true };
  }
  function buyPart(S, kind, key) {
    var p = WD.partInfo(kind, key);
    if (!p) return { ok: false, reason: 'unknown' };
    if (partOwned(S, kind, key)) return { ok: false, reason: 'owned' };
    var sp = spend(S, p.cost, 0); if (!sp.ok) return sp;
    S.owned[p.id] = true; return { ok: true, part: p };
  }
  function ownedWardrobeCount(S) { return WD.items.filter(function (i) { return S.owned[i.id]; }).length; }

  /* build shop (copies) */
  function buyBuildItem(S, id) {
    var it = BI.byId[id];
    if (!it) return { ok: false, reason: 'unknown' };
    if (!reqMet(S, it.req)) return { ok: false, reason: 'locked', text: '🔒 ' + reqText(it.req) };
    var sp = spend(S, it.cost, it.gems); if (!sp.ok) return sp;
    S.build.owned[id] = (S.build.owned[id] || 0) + 1;
    return { ok: true, item: it, owned: S.build.owned[id] };
  }

  /* ------------------------------------------------------------------ minigames */
  function mgEntry(S, game, L) { return S.minigames[game] && S.minigames[game][L] || null; }
  function bestStars(S, game, L) { var e = mgEntry(S, game, L); return e ? e.stars : 0; }
  function totalStars(S) {
    var n = 0;
    Object.keys(S.minigames).forEach(function (g) { Object.keys(S.minigames[g]).forEach(function (L) { n += S.minigames[g][L].stars; }); });
    return n;
  }
  function levelUnlocked(S, game, L) {
    if (!MG.byId[game] || L < 1 || L > MG.LEVELS) return { ok: false, reason: 'unknown' };
    var b = MG.band(L);
    if (S.islands.unlocked.indexOf(b) < 0) return { ok: false, reason: 'island', text: '🔒 Unlock ' + ISL.byId[b].name };
    if (L % 2 === 0 && bestStars(S, game, L - 1) < 1) return { ok: false, reason: 'previous', text: '🔒 Win a star on level ' + (L - 1) + ' first' };
    return { ok: true };
  }
  /** Record a finished play. → { ok, stars, best, improved, coins, xp, levelUps, newlyUnlocked:{items,islands,achievements} } */
  function recordMinigame(S, game, L, score) {
    var u = levelUnlocked(S, game, L);
    if (!u.ok) return { ok: false, reason: u.reason };
    var stars = MG.starsFor(game, L, score), prev = bestStars(S, game, L);
    var e = (S.minigames[game] = S.minigames[game] || {})[L] = mgEntry(S, game, L) || { stars: 0, best: 0, plays: 0 };
    e.plays++; S.stats.plays++;
    var lower = MG.thresholds(game, L).lowerBetter;
    if (stars) e.best = e.best ? (lower ? Math.min(e.best, score) : Math.max(e.best, score)) : score;
    if (stars > e.stars) e.stars = stars;
    var rw = MG.reward(L, stars, prev), g = grant(S, { coins: rw.coins, xp: rw.xp });
    var news = refreshAll(S);
    return { ok: true, stars: stars, best: e.stars, improved: stars > prev, coins: rw.coins, xp: rw.xp, levelUps: g.levelUps.concat(news.levelUps), unlocked: news };
  }

  /* ------------------------------------------------------------------ islands */
  function islandStatus(S, n) {
    var isl = ISL.byId[n];
    if (!isl) return { unlocked: false, reqs: [] };
    var reqs = [];
    if (n > 1) {
      var prev = ISL.byId[n - 1];
      reqs.push({ text: 'Finish the quest "' + QD.byId['q' + (n - 1)].title + '"', ok: chainDone(S, n - 1) });
      reqs.push({ text: 'Earn ' + isl.starReq + ' ⭐ (you have ' + totalStars(S) + ')', ok: totalStars(S) >= isl.starReq });
    }
    return { unlocked: S.islands.unlocked.indexOf(n) >= 0, reqs: reqs, canUnlock: reqs.every(function (r) { return r.ok; }), name: isl.name };
  }
  /** unlock every island whose requirements are met; returns the newly unlocked numbers */
  function refreshIslands(S) {
    var out = [];
    for (var n = 2; n <= ISL.COUNT; n++) {
      if (S.islands.unlocked.indexOf(n) >= 0) continue;
      if (S.islands.unlocked.indexOf(n - 1) >= 0 && islandStatus(S, n).canUnlock) { S.islands.unlocked.push(n); out.push(n); }
    }
    S.islands.unlocked.sort(function (a, b) { return a - b; });
    return out;
  }

  /* ------------------------------------------------------------------ collectibles, gates, helpers */
  function collect(S, id) {
    var c = COL.byId[id];
    if (!c) return { ok: false, reason: 'unknown' };
    if (S.collectibles[id]) return { ok: false, reason: 'have' };
    S.collectibles[id] = true;
    var p = COL.PICKUP(c.island), g = grant(S, { coins: p.coins, xp: p.xp }), setDone = null, allDone = false;
    var set = COL.setById[c.set];
    if (!S.sets[set.id] && set.ids.every(function (x) { return S.collectibles[x]; })) {
      S.sets[set.id] = true; setDone = set;
      var g2 = grant(S, { coins: set.coins, gems: set.gems, xp: 50 }); g.levelUps = g.levelUps.concat(g2.levelUps);
    }
    if (!S.sets.all && COL.items.every(function (x) { return S.collectibles[x.id]; })) {
      S.sets.all = true; allDone = true;
      var g3 = grant(S, { coins: COL.ALL_REWARD.coins, gems: COL.ALL_REWARD.gems }); g.levelUps = g.levelUps.concat(g3.levelUps);
    }
    var news = refreshAll(S);
    return { ok: true, item: c, coins: p.coins, xp: p.xp, setDone: setDone, allDone: allDone, levelUps: g.levelUps.concat(news.levelUps), unlocked: news };
  }
  function gateOpen(S, key) { return !!S.gates[key]; }
  function openGate(S, key) {
    if (!ISL.list.some(function (i) { return i.gate.key === key; })) return { ok: false, reason: 'unknown' };
    S.gates[key] = true; refreshAll(S); return { ok: true };
  }
  function helperDef(n) { return QD.helpers[n - 1]; }
  /** Finish a helper task (5 answered). Coins once per calendar day per task; XP always. today = 'YYYY-MM-DD' */
  function helperTask(S, n, today) {
    var h = helperDef(n);
    if (!h || S.islands.unlocked.indexOf(n) < 0) return { ok: false, reason: 'locked' };
    today = today || isoDay();
    var first = S.helper[h.id] !== today;
    S.helper[h.id] = today; S.stats.helpers++;
    var g = grant(S, { coins: first ? h.coins : 0, xp: h.xp }), news = refreshAll(S);
    return { ok: true, coins: first ? h.coins : 0, xp: h.xp, firstToday: first, levelUps: g.levelUps.concat(news.levelUps), unlocked: news };
  }
  /** Answer a learning question: records it, pays coins/XP. */
  function answerQuestion(S, q, choice, tries) {
    var r = LEARN.answer(S, q, choice, tries);
    if (r.correct) { var g = grant(S, { coins: r.coins, xp: r.xp }); r.levelUps = g.levelUps; refreshAll(S); }
    return r;
  }

  /* ------------------------------------------------------------------ achievements */
  function helpers(S) {
    var threeStar = MG.IDS.some(function (g) { for (var L = 1; L <= MG.LEVELS; L++) if (bestStars(S, g, L) < 3) return false; return true; });
    return { stars: totalStars(S), chains: chainsDone(S), questions: S.stats.correct, collected: COL.items.filter(function (c) { return S.collectibles[c.id]; }).length,
      level: S.level, placed: S.stats.placed, owned: ownedWardrobeCount(S), threeStarGame: threeStar, gates: ISL.list.filter(function (i) { return S.gates[i.gate.key]; }).length,
      islands: S.islands.unlocked.length, helpers: S.stats.helpers, streak: S.stats.bestStreak };
  }
  /** newly earned achievements (rewards paid) */
  function checkAchievements(S) {
    var H = helpers(S), got = [], changed = true, levelUps = [];
    while (changed) {
      changed = false;
      ACH.list.forEach(function (a) {
        if (S.achievements[a.id] || !a.check(S, H)) return;
        S.achievements[a.id] = true; got.push(a); changed = true;
        var g = grant(S, a.reward); levelUps = levelUps.concat(g.levelUps);
        H = helpers(S);
      });
    }
    return { list: got, levelUps: levelUps };
  }
  /** Run all derived-state refreshes; returns { items, islands, achievements, levelUps } of what is new. */
  function refreshAll(S) {
    var items = checkUnlocks(S), islands = refreshIslands(S), a = checkAchievements(S), levelUps = a.levelUps;
    items = items.concat(checkUnlocks(S)); islands = islands.concat(refreshIslands(S));
    return { items: items, islands: islands, achievements: a.list, levelUps: levelUps };
  }

  /* ------------------------------------------------------------------ parents */
  function posInt(v, max) { v = Math.floor(+v); return v >= 1 ? Math.min(max, v) : 0; }
  function checkPin(pin) { return String(pin) === PIN; }
  /** Actions: unlockIsland(n), unlockAll, giveCoins(n), giveXp(n), setDifficulty(str), setSubject({subject,on}), setSound(bool), setMusic(bool),
   *  report, reset('confirm' → new save in place). Wrong PIN → { ok:false, reason:'pin' }. */
  function parentsAction(S, pin, action, arg) {
    if (!checkPin(pin)) return { ok: false, reason: 'pin' };
    switch (action) {
      case 'unlockIsland': {
        var n = Math.floor(+arg); if (!(n >= 1 && n <= ISL.COUNT)) return { ok: false, reason: 'arg' };
        for (var i = 1; i <= n; i++) if (S.islands.unlocked.indexOf(i) < 0) S.islands.unlocked.push(i);
        S.islands.unlocked.sort(function (a, b) { return a - b; }); return { ok: true, unlocked: S.islands.unlocked.slice() };
      }
      case 'unlockAll': S.islands.unlocked = ISL.list.map(function (i) { return i.n; }); return { ok: true, unlocked: S.islands.unlocked.slice() };
      case 'giveCoins': { var c = posInt(arg, 100000); if (!c) return { ok: false, reason: 'arg' }; S.coins = Math.min(CAP, S.coins + c); return { ok: true, coins: S.coins }; }
      case 'giveXp': { var x = posInt(arg, 100000); if (!x) return { ok: false, reason: 'arg' }; var ups = addXp(S, x); refreshAll(S); return { ok: true, level: S.level, levelUps: ups }; }
      case 'setDifficulty': if (['easier', 'normal', 'harder'].indexOf(arg) < 0) return { ok: false, reason: 'arg' }; S.settings.difficulty = arg; return { ok: true };
      case 'setSubject': {
        if (!arg || CUR.SUBJECTS.indexOf(arg.subject) < 0) return { ok: false, reason: 'arg' };
        var others = CUR.SUBJECTS.filter(function (s) { return s !== arg.subject && S.settings.subjects[s]; });
        if (!arg.on && !others.length) return { ok: false, reason: 'last' };
        S.settings.subjects[arg.subject] = !!arg.on; return { ok: true };
      }
      case 'setSound': S.settings.sound = !!arg; return { ok: true };
      case 'setMusic': S.settings.music = !!arg; return { ok: true };
      case 'report': return { ok: true, report: LEARN.report(S) };
      case 'reset': {
        if (arg !== 'confirm') return { ok: false, reason: 'confirm' };
        var fresh = newSave(); Object.keys(S).forEach(function (k) { delete S[k]; }); Object.assign(S, fresh); return { ok: true };
      }
      default: return { ok: false, reason: 'unknown' };
    }
  }

  /* ------------------------------------------------------------------ economy report (design numbers, checked by tests) */
  function economyReport() {
    var price = { coins: 0, gems: 0 }, gemsEarnable = 0, oneTime = { coins: 0, xp: 0 };
    WD.items.forEach(function (i) { price.coins += i.cost; price.gems += i.gems; });
    WD.PART_KINDS.forEach(function (k) { WD.PARTS[k].forEach(function (p) { price.coins += p.cost; }); });
    BI.items.forEach(function (i) { price.coins += i.cost; price.gems += i.gems; });
    var L, g;
    MG.IDS.forEach(function (id) { for (L = 1; L <= MG.LEVELS; L++) { var r = MG.reward(L, 3, 0); oneTime.coins += r.coins; oneTime.xp += r.xp; } });
    QD.chains.forEach(function (c) {
      c.steps.forEach(function (s) { oneTime.coins += s.reward.coins; oneTime.xp += s.reward.xp; });
      oneTime.coins += c.reward.coins; oneTime.xp += c.reward.xp; gemsEarnable += c.reward.gems;
    });
    COL.items.forEach(function (c) { var p = COL.PICKUP(c.island); oneTime.coins += p.coins; oneTime.xp += p.xp; });
    COL.sets.forEach(function (s) { oneTime.coins += s.coins; oneTime.xp += 50; gemsEarnable += s.gems; });
    oneTime.coins += COL.ALL_REWARD.coins; gemsEarnable += COL.ALL_REWARD.gems;
    ACH.list.forEach(function (a) { oneTime.coins += a.reward.coins; oneTime.xp += a.reward.xp; gemsEarnable += a.reward.gems; });
    for (L = 2; L <= MAX_LEVEL; L++) { var lr = levelReward(L); oneTime.coins += lr.coins; gemsEarnable += lr.gems; }
    var avgB = 0, avgX = 0;
    for (L = 1; L <= MG.LEVELS; L++) { avgB += MG.reward(L, 3, 3).coins; avgX += MG.reward(L, 3, 3).xp; }
    avgB /= MG.LEVELS; avgX /= MG.LEVELS;
    var avgHelper = QD.helpers.reduce(function (a, h) { return a + h.coins; }, 0) / QD.helpers.length;
    var daily = {
      coins: Math.round(ECON.DAY_PLAYS * avgB * 0.85 + ECON.DAY_HELPERS * avgHelper * 0.6 + ECON.DAY_ANSWERS * 1),
      xp: Math.round(ECON.DAY_PLAYS * avgX * 0.85 + ECON.DAY_ANSWERS * 3.5 + ECON.DAY_HELPERS * 30 * 0.6)
    };
    // day-by-day model: daily play income + one-time rewards (quests, first clears, collectibles, trophies) released evenly over the story,
    // + level-up money when the XP is reached.
    var levelCoinsTotal = 0; for (L = 2; L <= MAX_LEVEL; L++) levelCoinsTotal += levelReward(L).coins;
    var oneTimeNoLevel = oneTime.coins - levelCoinsTotal, STORY = ECON.STORY_DAYS, coins = 0, xp = 0, day = 0, buyAll = 0, lvl50 = 0, lvl = 1;
    while (day < 400 && (!buyAll || !lvl50)) {
      day++; xp += daily.xp + (day <= STORY ? (oneTime.xp / STORY) : 0);
      coins += daily.coins + (day <= STORY ? oneTimeNoLevel / STORY : 0);
      while (lvl < MAX_LEVEL && xp >= CUM[lvl]) { lvl++; coins += levelReward(lvl).coins; }
      if (!buyAll && coins >= price.coins) buyAll = day;
      if (!lvl50 && lvl >= MAX_LEVEL) lvl50 = day;
    }
    return { price: price, gemsEarnable: gemsEarnable, oneTime: oneTime, daily: daily, daysToBuyAll: buyAll || 400, daysToLevel50: lvl50 || 400, xpTo50: CUM[MAX_LEVEL - 1], storyDays: STORY };
  }

  return {
    KEY: KEY, VERSION: VERSION, PIN_LENGTH: PIN.length, MAX_LEVEL: MAX_LEVEL, ECON: ECON,
    newSave: newSave, sanitize: sanitize, migrate: migrate, load: load, save: save, isoDay: isoDay,
    xpToNext: xpToNext, levelFromXp: levelFromXp, levelReward: levelReward, cumXp: function (L) { return CUM[Math.max(1, Math.min(MAX_LEVEL, L)) - 1]; },
    reqMet: reqMet, reqText: reqText, addCoins: addCoins, addGems: addGems, addXp: addXp, spend: spend, grant: grant,
    partOwned: partOwned, isOwned: isOwned, checkUnlocks: checkUnlocks, itemStatus: itemStatus, buyItem: buyItem, equip: equip, unequip: unequip,
    setPart: setPart, buyPart: buyPart, ownedWardrobeCount: ownedWardrobeCount, buyBuildItem: buyBuildItem,
    bestStars: bestStars, totalStars: totalStars, levelUnlocked: levelUnlocked, recordMinigame: recordMinigame,
    chainDone: chainDone, chainsDone: chainsDone, islandStatus: islandStatus, refreshIslands: refreshIslands,
    collect: collect, gateOpen: gateOpen, openGate: openGate, helperTask: helperTask, answerQuestion: answerQuestion,
    helpers: helpers, checkAchievements: checkAchievements, refreshAll: refreshAll, checkPin: checkPin, parentsAction: parentsAction, economyReport: economyReport
  };
});
