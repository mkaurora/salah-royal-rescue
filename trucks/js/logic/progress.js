/* Save + economy + workshop + parents actions. Pure: storage is passed in ({getItem,setItem}) so Node tests use a fake.
 * A NEW save starts at level 214 (see newSave). load() sanitises everything and never throws on corrupt data.
 * Functions mutate the state they are given and return a small result object for the UI. UMD: TW.progress. */
(function (root, factory) {
  var node = typeof module === 'object' && module.exports;
  var mod = factory(node ? require('../data/vehicles.js') : root.TW.vehicles);
  if (node) module.exports = mod;
  else { root.TW = root.TW || {}; root.TW.progress = mod; }
})(typeof self !== 'undefined' ? self : this, function (V) {
  'use strict';

  var KEY = 'truckworkshop-save-v1', VERSION = 1, PIN = '1994';
  var START_LEVEL = 214;
  var BOOSTERS = ['rocket', 'dynamite', 'rainbow', 'hammer', 'shuffle'];
  var PRE_BOOSTERS = ['rocket', 'dynamite', 'rainbow'];

  var ECON = {
    coinsFirst: 20, coinsPerStar: 10, coinsReplay: 10,       // win: 20 + 10 per star (first time) / 10 on a replay
    wrenchBase: 1, wrenchHardBonus: 1,                        // 1 / 2 / 3 wrenches for 1 / 2 / 3 stars (+1 on a hard level, first time)
    chestBase: 36, chestPerNo: 2,                             // stars needed for chest #no = 36 + 2 * no
    streakEvery: 3,                                           // every 3rd win in a row: +1 booster
    vehicleBonusCoins: 100, repaintCost: 50,
    failsForEasier: 3, dailyBoosters: 1
  };

  function int(x, lo, hi, def) {
    x = typeof x === 'string' ? parseInt(x, 10) : x;
    if (typeof x !== 'number' || !isFinite(x)) return def;
    x = Math.floor(x);
    return x < lo ? lo : x > hi ? hi : x;
  }
  /** Parents' number input: below the minimum / not a number → 0 (rejected); above the maximum → the maximum. */
  function argInt(x, lo, hi) { x = int(x, -1e9, 1e9, 0); return x < lo ? 0 : x > hi ? hi : x; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  /** The starting save: Level 214, 800 coins, 25 wrenches, boosters 3/3/2, vehicles 1-4 in the album, the 5th (fire truck)
   *  3 of 12 repairs done (25%), chest #5 at 19%. */
  function newSave() {
    return {
      v: VERSION, level: START_LEVEL, stars: {}, coins: 800, wrenches: 25,
      boosters: { rocket: 3, dynamite: 3, rainbow: 2, hammer: 2, shuffle: 2 },
      streak: 0, fails: {},
      ws: {
        cur: 4, done: 3, album: [0, 1, 2, 3],
        choices: {
          0: { wheels: 'sport', paint: 'p0', lights: 'round' }, 1: { wheels: 'chunky', paint: 'p1', lights: 'square' },
          2: { wheels: 'classic', paint: 'p0', lights: 'round' }, 3: { wheels: 'chunky', paint: 'p2', lights: 'star' },
          4: { wheels: 'classic' }
        }
      },
      chest: { no: 5, stars: 9 },
      daily: { last: '', count: 0 },
      settings: { sound: true, music: true },
      stats: { wins: 0, plays: 0, stars: 520, vehicles: 4 }
    };
  }

  function chestNeed(no) { return ECON.chestBase + ECON.chestPerNo * no; }
  function chestPercent(s) { return Math.min(100, Math.floor(100 * s.chest.stars / chestNeed(s.chest.no))); }
  function chestFull(s) { return s.chest.stars >= chestNeed(s.chest.no); }

  /* ------------------------------------------------------------------ sanitize / load / save */
  function sanitize(raw) {
    var d = newSave();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return d;
    var s = newSave();
    s.level = int(raw.level, 1, 99999, d.level);
    s.coins = int(raw.coins, 0, 9999999, d.coins);
    s.wrenches = int(raw.wrenches, 0, 999999, d.wrenches);
    s.streak = int(raw.streak, 0, 9999, 0);
    BOOSTERS.forEach(function (k) { s.boosters[k] = int(raw.boosters && raw.boosters[k], 0, 99, d.boosters[k]); });
    s.stars = {};
    if (raw.stars && typeof raw.stars === 'object') Object.keys(raw.stars).slice(0, 5000).forEach(function (k) {
      var n = int(k, 1, 99999, 0), v = int(raw.stars[k], 0, 3, 0);
      if (n && v) s.stars[n] = v;
    });
    s.fails = {};
    if (raw.fails && typeof raw.fails === 'object') Object.keys(raw.fails).slice(0, 50).forEach(function (k) {
      var n = int(k, 1, 99999, 0), v = int(raw.fails[k], 0, 99, 0);
      if (n && v) s.fails[n] = v;
    });
    // workshop
    var w = raw.ws && typeof raw.ws === 'object' ? raw.ws : {};
    s.ws.cur = int(w.cur, 0, 9999, d.ws.cur);
    var tasks = V.vehicleInfo(s.ws.cur).tasks;
    s.ws.done = int(w.done, 0, tasks.length - 1, 0);
    s.ws.album = Array.isArray(w.album) ? w.album.map(function (x) { return int(x, 0, 9999, -1); }).filter(function (x) { return x >= 0 && x < s.ws.cur; }).slice(0, 2000) : d.ws.album.slice();
    s.ws.album = s.ws.album.filter(function (x, i, a) { return a.indexOf(x) === i; });
    s.ws.choices = {};
    var ch = w.choices && typeof w.choices === 'object' ? w.choices : {};
    Object.keys(ch).slice(0, 2000).forEach(function (k) {
      var vi = int(k, 0, 9999, -1);
      if (vi < 0 || !ch[k] || typeof ch[k] !== 'object') return;
      var info = V.vehicleInfo(vi), out = {};
      info.tasks.forEach(function (t) {
        if (t.choice && typeof ch[k][t.choice] === 'string' && t.options.some(function (o) { return o.id === ch[k][t.choice]; })) out[t.choice] = ch[k][t.choice];
      });
      s.ws.choices[vi] = out;
    });
    // choices must exist for every done choice task of the current vehicle (default to the first option)
    var cur = s.ws.choices[s.ws.cur] = s.ws.choices[s.ws.cur] || {};
    tasks.slice(0, s.ws.done).forEach(function (t) { if (t.choice && !cur[t.choice]) cur[t.choice] = t.options[0].id; });
    s.ws.album.forEach(function (vi) {
      var c = s.ws.choices[vi] = s.ws.choices[vi] || {};
      V.vehicleInfo(vi).tasks.forEach(function (t) { if (t.choice && !c[t.choice]) c[t.choice] = t.options[0].id; });
    });
    var c = raw.chest && typeof raw.chest === 'object' ? raw.chest : {};
    s.chest.no = int(c.no, 1, 99999, d.chest.no);
    s.chest.stars = int(c.stars, 0, 999999, d.chest.stars);
    var dl = raw.daily && typeof raw.daily === 'object' ? raw.daily : {};
    s.daily = { last: typeof dl.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dl.last) ? dl.last : '', count: int(dl.count, 0, 99999, 0) };
    var se = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    s.settings = { sound: se.sound !== false, music: se.music !== false };
    var st = raw.stats && typeof raw.stats === 'object' ? raw.stats : {};
    s.stats = { wins: int(st.wins, 0, 9999999, 0), plays: int(st.plays, 0, 9999999, 0), stars: int(st.stars, 0, 9999999, d.stats.stars), vehicles: int(st.vehicles, 0, 99999, s.ws.album.length) };
    return s;
  }

  function load(storage) {
    try {
      var txt = storage && storage.getItem(KEY);
      if (!txt) return newSave();
      return sanitize(JSON.parse(txt));
    } catch (e) { return newSave(); }
  }
  function save(storage, state) {
    try { storage.setItem(KEY, JSON.stringify(state)); return true; } catch (e) { return false; }
  }

  /* ------------------------------------------------------------------ boosters, streak */
  function addBooster(s, kind, n) { if (BOOSTERS.indexOf(kind) >= 0) s.boosters[kind] = Math.min(99, s.boosters[kind] + (n == null ? 1 : n)); }
  /** Pre-level boosters actually spent: kinds[] of owned boosters; returns the kinds that were consumed. */
  function spendBoosters(s, kinds) {
    var used = [];
    (kinds || []).forEach(function (k) { if (PRE_BOOSTERS.indexOf(k) >= 0 && s.boosters[k] > 0 && used.indexOf(k) < 0) { s.boosters[k]--; used.push(k); } });
    return used;
  }
  function spendBooster(s, kind) { if (BOOSTERS.indexOf(kind) < 0 || s.boosters[kind] <= 0) return false; s.boosters[kind]--; return true; }
  /** Streak of 3+ wins: one booster is placed on the board for free (never taken from the stock). */
  function freeBooster(s) { return s.streak >= ECON.streakEvery ? PRE_BOOSTERS[s.streak % PRE_BOOSTERS.length] : null; }
  /** 3 segments of the streak bar (0..3 filled). */
  function streakSegments(s) { return s.streak === 0 ? 0 : (s.streak - 1) % 3 + 1; }

  /* ------------------------------------------------------------------ level results */
  function isHard(n) { return n >= 20 && n % 10 === 0; }

  /** Level won with `stars` (1..3). Returns { coins, wrenches, stars, first, streak, bonusBooster, chestReady }. */
  function winLevel(s, n, stars) {
    stars = int(stars, 1, 3, 1);
    var first = !s.stars[n];
    var r = { first: first, stars: stars, coins: 0, wrenches: 0, bonusBooster: null };
    var better = Math.max(0, stars - (s.stars[n] || 0));
    if (first) {
      r.coins = ECON.coinsFirst + ECON.coinsPerStar * stars;
      r.wrenches = ECON.wrenchBase + (stars - 1) + (isHard(n) ? ECON.wrenchHardBonus : 0);
    } else { r.coins = ECON.coinsReplay; r.wrenches = ECON.wrenchBase; }
    s.coins += r.coins; s.wrenches += r.wrenches;
    s.stars[n] = Math.max(s.stars[n] || 0, stars);
    if (n === s.level) s.level = n + 1;
    s.stats.wins++; s.stats.plays++; s.stats.stars += better;
    s.chest.stars += stars;
    s.streak++;
    if (s.streak % ECON.streakEvery === 0) { r.bonusBooster = PRE_BOOSTERS[(s.streak / ECON.streakEvery) % PRE_BOOSTERS.length | 0]; addBooster(s, r.bonusBooster, 1); }
    delete s.fails[n];
    r.streak = s.streak; r.chestReady = chestFull(s);
    return r;
  }

  /** Lost for good (tried again / left the level): streak resets quietly, fail count goes up. */
  function failLevel(s, n) {
    s.streak = 0; s.stats.plays++;
    s.fails[n] = Math.min(99, (s.fails[n] || 0) + 1);
    var keys = Object.keys(s.fails);
    if (keys.length > 20) delete s.fails[keys[0]];
    return s.fails[n];
  }
  function easierOffered(s, n) { return (s.fails[n] || 0) >= ECON.failsForEasier; }

  /* ------------------------------------------------------------------ chest */
  /** Open the full chest: { coins, wrenches, boosters:{kind:n} } or null when it is not full yet. Leftover stars carry over. */
  function openChest(s) {
    if (!chestFull(s)) return null;
    var no = s.chest.no;
    s.chest.stars -= chestNeed(no); s.chest.no = no + 1;
    var r = { no: no, coins: 100 + 20 * no, wrenches: 3 + (no % 2), boosters: {} };
    var a = BOOSTERS[no % BOOSTERS.length], b = BOOSTERS[(no + 2) % BOOSTERS.length];
    r.boosters[a] = (r.boosters[a] || 0) + 1; r.boosters[b] = (r.boosters[b] || 0) + 1;
    s.coins += r.coins; s.wrenches += r.wrenches;
    Object.keys(r.boosters).forEach(function (k) { addBooster(s, k, r.boosters[k]); });
    return r;
  }

  /* ------------------------------------------------------------------ daily gift (no timer: a new calendar day) */
  function canDaily(s, today) { return s.daily.last !== today; }
  function openDaily(s, today) {
    if (!canDaily(s, today)) return null;
    var kind = BOOSTERS[s.daily.count % BOOSTERS.length];
    s.daily.last = today; s.daily.count++;
    addBooster(s, kind, ECON.dailyBoosters);
    return { booster: kind, n: ECON.dailyBoosters };
  }

  /* ------------------------------------------------------------------ workshop */
  function currentVehicle(s) {
    var info = V.vehicleInfo(s.ws.cur);
    return { info: info, done: s.ws.done, total: info.tasks.length, percent: Math.floor(100 * s.ws.done / info.tasks.length),
      next: info.tasks[s.ws.done], choices: s.ws.choices[s.ws.cur] || {} };
  }
  /** The next `n` open tasks (first is fixable now) with cost and whether it can be afforded. */
  function nextTasks(s, n) {
    var info = V.vehicleInfo(s.ws.cur);
    return info.tasks.slice(s.ws.done, s.ws.done + (n || 3)).map(function (t, i) {
      return { task: t, index: s.ws.done + i, fixable: i === 0, affordable: s.wrenches >= t.cost };
    });
  }

  function completeVehicle(s) {
    var k = s.ws.cur;
    if (s.ws.album.indexOf(k) < 0) s.ws.album.push(k);
    var c = s.ws.choices[k] = s.ws.choices[k] || {};
    V.vehicleInfo(k).tasks.forEach(function (t) { if (t.choice && !c[t.choice]) c[t.choice] = t.options[0].id; });
    s.ws.cur = k + 1; s.ws.done = 0; s.ws.choices[s.ws.cur] = {};
    s.stats.vehicles++;
    s.coins += ECON.vehicleBonusCoins;
    return { vehicle: k, bonusCoins: ECON.vehicleBonusCoins, next: s.ws.cur };
  }

  /** Spend wrenches on the next repair. For choice tasks pass the option id (e.g. 'p1', 'sport').
   *  Returns { ok, reason?: 'wrenches' | 'choice', task, completed, complete? }. */
  function fixTask(s, optionId) {
    var info = V.vehicleInfo(s.ws.cur), task = info.tasks[s.ws.done];
    if (!task) return { ok: false, reason: 'none' };
    if (task.choice && !task.options.some(function (o) { return o.id === optionId; })) return { ok: false, reason: 'choice', task: task };
    if (s.wrenches < task.cost) return { ok: false, reason: 'wrenches', task: task };
    s.wrenches -= task.cost;
    var c = s.ws.choices[s.ws.cur] = s.ws.choices[s.ws.cur] || {};
    if (task.choice) c[task.choice] = optionId;
    s.ws.done++;
    var res = { ok: true, task: task, completed: false };
    if (s.ws.done >= info.tasks.length) { res.completed = true; res.complete = completeVehicle(s); }
    return res;
  }

  /** Paint Shop: change a choice (paint / wheels / lights) of a finished vehicle for coins. */
  function recustomise(s, vehicleIndex, choiceKey, optionId) {
    if (s.ws.album.indexOf(vehicleIndex) < 0) return { ok: false, reason: 'notFinished' };
    var task = V.vehicleInfo(vehicleIndex).tasks.filter(function (t) { return t.choice === choiceKey; })[0];
    if (!task || !task.options.some(function (o) { return o.id === optionId; })) return { ok: false, reason: 'choice' };
    var c = s.ws.choices[vehicleIndex] = s.ws.choices[vehicleIndex] || {};
    if (c[choiceKey] === optionId) return { ok: true, free: true };
    if (s.coins < ECON.repaintCost) return { ok: false, reason: 'coins' };
    s.coins -= ECON.repaintCost; c[choiceKey] = optionId;
    return { ok: true, cost: ECON.repaintCost };
  }

  /* ------------------------------------------------------------------ parents (PIN 1994) */
  function checkPin(pin) { return String(pin) === PIN; }

  /** parentAction(state, pin, action, arg) → { ok, state?, reason }. Works on a copy; the caller keeps r.state.
   *  Actions: setLevel (1..99999), wrenches (1..1000), coins (1..10000), boosters (1..20 of each), sound / music (bool),
   *  completeVehicle, reset (arg must be 'confirm' → back to the level-214 start save). Wrong PIN → { ok:false, reason:'pin' }. */
  function parentAction(state, pin, action, arg) {
    if (!checkPin(pin)) return { ok: false, reason: 'pin' };
    var s = clone(state), n;
    switch (action) {
      case 'setLevel': n = argInt(arg, 1, 99999); if (!n) return { ok: false, reason: 'arg' }; s.level = n; break;
      case 'wrenches': n = argInt(arg, 1, 1000); if (!n) return { ok: false, reason: 'arg' }; s.wrenches += n; break;
      case 'coins': n = argInt(arg, 1, 10000); if (!n) return { ok: false, reason: 'arg' }; s.coins += n; break;
      case 'boosters': n = argInt(arg, 1, 20); if (!n) return { ok: false, reason: 'arg' }; BOOSTERS.forEach(function (k) { addBooster(s, k, n); }); break;
      case 'sound': s.settings.sound = !!arg; break;
      case 'music': s.settings.music = !!arg; break;
      case 'completeVehicle': completeVehicle(s); break;
      case 'reset': if (arg !== 'confirm') return { ok: false, reason: 'confirm' }; s = newSave(); break;
      default: return { ok: false, reason: 'action' };
    }
    return { ok: true, state: sanitize(s) };
  }

  return {
    KEY: KEY, VERSION: VERSION, PIN_LENGTH: PIN.length, START_LEVEL: START_LEVEL, BOOSTERS: BOOSTERS, PRE_BOOSTERS: PRE_BOOSTERS, ECON: ECON,
    newSave: newSave, sanitize: sanitize, load: load, save: save,
    addBooster: addBooster, spendBoosters: spendBoosters, spendBooster: spendBooster, freeBooster: freeBooster, streakSegments: streakSegments,
    winLevel: winLevel, failLevel: failLevel, easierOffered: easierOffered, isHard: isHard,
    chestNeed: chestNeed, chestPercent: chestPercent, chestFull: chestFull, openChest: openChest,
    canDaily: canDaily, openDaily: openDaily,
    currentVehicle: currentVehicle, nextTasks: nextTasks, fixTask: fixTask, completeVehicle: completeVehicle, recustomise: recustomise,
    checkPin: checkPin, parentAction: parentAction
  };
});
