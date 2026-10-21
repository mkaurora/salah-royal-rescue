/* Race simulation: deterministic, fixed time step (1/60 s), no DOM, no Math.random. The renderer and the Node
 * tests/bot drive exactly the same code: create(track, opts) → step(input) many times → read .s / result().
 *
 * input: { steer: -1..1, gas: bool, brake: bool }  (touch buttons give −1/0/1, tilt gives analog values)
 * Events (for sound, particles, screen shake) collect in sim.events; the renderer drains them each frame.
 * UMD: module.exports in Node, RR.sim in the browser. */
(function (root, factory) {
  var RR = root.RR || {};
  var req = typeof require === 'function' ? require : null;
  var mod = factory(RR.rng || req('./rng.js'), RR.track || req('./track.js'), RR.stars || req('./stars.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.sim = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG, T, STARS) {
  'use strict';

  var DT = 1 / 60;
  var BASE_TOP = 26;          // m/s (~94 km/h) — base car top speed; traffic/boss speeds are fractions of it
  var CAR_LEN = 3.8, CAR_W = 1.7;
  var OFF_MAX = 10;           // top speed on grass / sand / snow
  var WALL = 4.5;             // soft wall this far past the road edge
  var G = 18;                 // arcade gravity for jumps
  var CENTRI = 4.0;           // outward push in a full bend at base top speed (m/s)
  var COUNTDOWN = 3;
  var LIVES = 3;
  var SPAWN_AHEAD = 240;      // traffic appears this far ahead
  var ROCK_TRIGGER = 95, ROCK_FALL = 1.5, ROCK_H = 26;
  var SIGNAL_T = 1.6, CHANGE_T = 1.4;
  var RESPAWN_DELAY = 1.0, RESPAWN_GHOST = 2.5, HIT_GHOST = 0.7;
  var DROP_GAP = 36, BOSS_BOOST = 5.5;
  var DAMAGE = { pothole: 12, cone: 4, rock: 22, traffic: 18, barrier: 6 };
  var MAX_EVENTS = 256;

  var UPGRADE_MAX = 5;
  /** Car numbers for an upgrade set {speed, grip, brakes, armor} (each 0–5). */
  function carStats(up) {
    up = up || {};
    function lv(k) { var v = up[k] | 0; return v < 0 ? 0 : v > UPGRADE_MAX ? UPGRADE_MAX : v; }
    var sp = lv('speed'), gr = lv('grip'), br = lv('brakes'), ar = lv('armor');
    return {
      top: BASE_TOP + 1.4 * sp,           // 26 → 33 m/s
      accel: 10 + 0.9 * sp,
      steer: 6.5 + 0.25 * gr,             // max sideways speed
      resp: 8 + 1.2 * gr,                 // how quickly the car follows the wheel
      curveGrip: 1 + 0.1 * gr,            // resists the outward push in bends
      skid: 1.3 * (1 - 0.1 * gr),         // oil/ice slide duration (s)
      brake: 16 + 3.5 * br,
      armor: 1 - 0.1 * ar                 // damage multiplier (0.5 at max)
    };
  }

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  function timerPlan(track) {
    var def = track.def;
    if (!def.timer) return null;
    var marks = [0].concat(track.checkpoints, [track.length]), legs = [];
    for (var i = 1; i < marks.length; i++) legs.push(Math.ceil((marks[i] - marks[i - 1]) / (BASE_TOP * def.timer.slack)));
    return legs;
  }

  function Sim(track, opts) {
    opts = opts || {};
    this.track = track;
    this.def = track.def;
    this.stats = carStats(opts.upgrades);
    this.seed = String(opts.seed === undefined ? track.id : opts.seed);
    this.events = [];
    var cars = track.traffic;
    this.legs = timerPlan(track);
    var s = this.s = {
      t: 0, steps: 0, status: (opts.countdown === 0 ? 'race' : 'countdown'),
      countdown: opts.countdown === undefined ? COUNTDOWN : opts.countdown, reason: null, cdSteps: 0,
      car: { z: 0, x: T.nearestOpenLaneX(track, 0, 0), y: 0, vy: 0, v: 0, vx: 0, air: false, skidT: 0, skidDir: 0,
        invulnT: 0, respawnT: 0, barrierT: 0, health: 100, lives: LIVES, fuel: 100, offroad: false,
        steer: 0, gas: false, brake: false, scrape: 0 },
      hits: 0, livesLost: 0, coins: 0, cp: 0, lastCpZ: 0,
      timeLeft: this.legs ? this.legs[0] : null,
      items: track.items.map(function (o) {
        var c = {}; for (var k in o) c[k] = o[k];
        c.done = false; c.hitT = -1e9;
        if (c.type === 'rock') { c.state = 'wait'; c.fallT = 0; c.y = ROCK_H; }
        return c;
      }),
      dyn: [], traffic: [], nextCar: 0, boss: null
    };
    this._lo = 0;
    this._carCount = cars.length;
    if (this.def.boss) {
      var b = this.def.boss;
      s.boss = { z: 70, x: T.laneX(track.lanes, Math.floor(track.lanes / 2)), lane: Math.floor(track.lanes / 2),
        v: 0, hp: b.hp, maxHp: b.hp, state: 'cruise', sig: 0, sigT: 0, chgT: 0, fromX: 0, toX: 0,
        nextT: 3, dropT: b.dropEvery, warnT: 0, boostT: 0, hitT: 0, dropN: 0, len: 5.6, w: 2.3 };
      this.bossRng = RNG.rng('boss:' + this.seed);
    }
  }

  Sim.prototype.emit = function (type, data) {
    var e = { type: type, t: this.s.t };
    if (data) for (var k in data) e[k] = data[k];
    this.events.push(e);
    if (this.events.length > MAX_EVENTS) this.events.shift();
  };
  Sim.prototype.drainEvents = function () { var e = this.events; this.events = []; return e; };

  Sim.prototype.finish = function (reason) {
    if (this.s.status !== 'race') return;
    this.s.status = 'finished'; this.s.reason = reason || 'line';
    this.emit('finish', { reason: this.s.reason });
  };
  Sim.prototype.fail = function (reason) {
    if (this.s.status !== 'race') return;
    this.s.status = 'failed'; this.s.reason = reason;
    this.emit('fail', { reason: reason });
  };

  /** Apply damage (armor reduces it). Returns false while the car is protected after a hit / respawn. */
  Sim.prototype.damage = function (amount, kind) {
    var c = this.s.car;
    if (c.invulnT > 0 || c.respawnT > 0) return false;
    c.health -= amount * this.stats.armor;
    this.s.hits++;
    c.invulnT = HIT_GHOST;
    this.emit('hit', { kind: kind, health: c.health });
    if (c.health <= 0) this.loseLife();
    return true;
  };

  Sim.prototype.loseLife = function () {
    var c = this.s.car;
    c.health = 0; c.lives--; this.s.livesLost++;
    this.emit('lifeLost', { lives: c.lives });
    if (c.lives <= 0) { this.fail('lives'); return; }
    c.respawnT = RESPAWN_DELAY;
  };

  Sim.prototype.respawn = function () {
    var s = this.s, c = s.car, t = this.track;
    c.z = s.lastCpZ; c.x = T.nearestOpenLaneX(t, c.z, 0);
    c.v = this.stats.top * 0.35; c.vx = 0; c.y = 0; c.vy = 0; c.air = false; c.skidT = 0;
    c.health = 100; c.fuel = Math.max(c.fuel, 60); c.invulnT = RESPAWN_GHOST; c.respawnT = 0; c.barrierT = 0;
    this._lo = 0;
    // the boss waits a short way ahead of the respawn point (it never runs off while the car is being fixed)
    if (s.boss) { s.boss.z = c.z + 80; s.boss.v = c.v; s.boss.boostT = 0; }
    this.emit('respawn', { z: c.z });
  };

  /* ------------------------------------------------------------------ the step */

  Sim.prototype.step = function (input) {
    var s = this.s, c = s.car;
    input = input || {};
    var steer = +input.steer || 0;
    steer = steer !== steer ? 0 : clamp(steer, -1, 1);
    s.steps++;
    if (s.status === 'countdown') {
      // counted in whole steps so 3-2-1-GO lands on exact frames
      if (!s.cdSteps) s.cdSteps = Math.round(s.countdown / DT);
      s.cdSteps--;
      s.countdown = s.cdSteps * DT;
      if (s.cdSteps <= 0) { s.countdown = 0; s.status = 'race'; this.emit('go'); }
      else if (s.cdSteps % 60 === 0) this.emit('count', { n: s.cdSteps / 60 });
      return;
    }
    if (s.status !== 'race') return;
    s.t += DT;
    c.steer = steer; c.gas = !!input.gas; c.brake = !!input.brake;

    if (c.respawnT > 0) {
      c.v = 0; c.vx = 0;
      c.respawnT -= DT;
      if (c.respawnT <= 0) this.respawn();
      this.updateWorld();
      return;
    }
    if (c.invulnT > 0) c.invulnT -= DT;
    if (c.barrierT > 0) c.barrierT -= DT;
    if (c.skidT > 0) c.skidT -= DT;

    this.drive(steer);
    this.updateWorld();
    if (s.status !== 'race') return;
    this.collide();
    if (s.status !== 'race') return;
    this.progress();
  };

  Sim.prototype.drive = function (steer) {
    var s = this.s, c = s.car, st = this.stats, t = this.track, def = this.def;
    var half = t.half;
    c.offroad = !c.air && Math.abs(c.x) > half + 0.2;
    var top = c.offroad ? Math.min(OFF_MAX, st.top) : st.top;
    var thrust = c.gas && (!def.fuel || c.fuel > 0);
    if (thrust) {
      if (c.v < top) { var f = c.v / top; c.v += st.accel * Math.max(0.05, 1 - f * f * f) * DT; if (c.v > top) c.v = top; }
    } else c.v -= 2.5 * DT;
    if (c.v > top) c.v = Math.max(top, c.v - (c.offroad ? 16 : 8) * DT);
    if (c.brake) c.v -= st.brake * DT;
    if (!c.air) c.v -= T.slopeAt(t, c.z) * 9.8 * 0.35 * DT;
    if (c.v < 0) c.v = 0;

    // steering: the car eases toward the wanted sideways speed; ice/oil and jumps take the grip away
    var sf = Math.min(1, c.v / 8);
    var want = steer * st.steer * sf;
    var resp = st.resp * (c.skidT > 0 ? 0.06 : 1) * (c.air ? 0.25 : 1);
    c.vx += (want - c.vx) * Math.min(1, resp * DT);
    var r = c.v / BASE_TOP;
    var push = T.curveAt(t, c.z) * r * r * CENTRI / st.curveGrip;
    var slide = c.skidT > 0 ? c.skidDir * 2.2 * (c.skidT / st.skid) : 0;
    c.x += (c.vx - push + slide) * DT;
    if (c.x < -half - WALL) { c.x = -half - WALL; c.vx = Math.max(0, c.vx); }
    if (c.x > half + WALL) { c.x = half + WALL; c.vx = Math.min(0, c.vx); }

    // barriers fill the closed lanes (from the road edge to lo / hi): solid from the road AND from the grass
    var lo = T.loAt(t, c.z), hi = T.hiAt(t, c.z);
    c.scrape = 0;
    if (lo > -half + 0.05) {
      if (c.x < -half - 0.2) {
        if (c.x + CAR_W / 2 > -half) { c.x = -half - CAR_W / 2; c.vx = Math.min(c.vx, -1.2); c.scrape = 1; this.barrierHit(); }
      } else if (c.x - CAR_W / 2 < lo) { c.x = lo + CAR_W / 2 + 0.02; c.vx = Math.max(c.vx, 1.2); c.scrape = -1; this.barrierHit(); }
    }
    if (hi < half - 0.05) {
      if (c.x > half + 0.2) {
        if (c.x - CAR_W / 2 < half) { c.x = half + CAR_W / 2; c.vx = Math.max(c.vx, 1.2); c.scrape = -1; this.barrierHit(); }
      } else if (c.x + CAR_W / 2 > hi) { c.x = hi - CAR_W / 2 - 0.02; c.vx = Math.min(c.vx, -1.2); c.scrape = 1; this.barrierHit(); }
    }

    if (c.air) {
      c.y += c.vy * DT; c.vy -= G * DT;
      if (c.y <= 0) { c.y = 0; c.vy = 0; c.air = false; this.emit('land'); }
    }

    var dz = c.v * DT;
    c.z += dz;
    if (def.fuel && c.fuel > 0) {
      c.fuel -= dz / def.fuel.tank * 100;
      if (c.fuel <= 0) { c.fuel = 0; this.emit('fuelEmpty'); }
    }
    if (def.fuel && c.fuel <= 0 && c.v < 0.3) this.fail('fuel');
  };

  Sim.prototype.barrierHit = function () {
    var c = this.s.car;
    if (c.barrierT > 0) return;
    c.barrierT = 1.0;
    c.v *= 0.82;
    this.emit('scrape');
    this.damage(DAMAGE.barrier, 'barrier');
  };

  /* ------------------------------------------------------------------ traffic, rocks, boss */

  Sim.prototype.updateWorld = function () {
    var s = this.s, c = s.car, t = this.track;
    // rocks: warning shadow, then the fall
    var lo = this.windowStart(c.z - 10);
    for (var i = lo; i < s.items.length; i++) {
      var o = s.items[i];
      if (o.z > c.z + ROCK_TRIGGER + 5) break;
      if (o.type !== 'rock') continue;
      if (o.state === 'wait' && c.z >= o.z - ROCK_TRIGGER) {
        o.state = 'warn'; o.fallT = ROCK_FALL;
        if (o.target) o.x = T.nearestOpenLaneX(t, o.z, c.x);
        this.emit('rockWarn', { id: o.id, x: o.x, z: o.z });
      }
    }
    for (var k = 0; k < s.items.length; k++) {
      var r = s.items[k];
      if (r.state !== 'warn') continue;
      r.fallT -= DT;
      var p = Math.max(0, r.fallT / ROCK_FALL);
      r.y = ROCK_H * p * p;
      if (r.fallT <= 0) { r.state = 'down'; r.y = 0; this.emit('rockLand', { id: r.id, x: r.x, z: r.z }); }
    }
    this.updateTraffic();
    if (s.boss) this.updateBoss();
  };

  Sim.prototype.windowStart = function (z) {
    var items = this.s.items, i = this._lo;
    while (i > 0 && items[i - 1].z >= z) i--;
    while (i < items.length && items[i].z < z) i++;
    this._lo = i;
    return i;
  };

  function laneOpen(t, lane, z0, z1) { return T.openLanes(t, z0, z1).indexOf(lane) >= 0; }

  Sim.prototype.updateTraffic = function () {
    var s = this.s, c = s.car, t = this.track, spawns = t.traffic;
    while (s.nextCar < spawns.length && spawns[s.nextCar].z <= c.z + SPAWN_AHEAD) {
      var sp = spawns[s.nextCar], idx = s.nextCar++;
      if (sp.z < c.z + 80) continue;   // e.g. skipped while respawning far back: never pop up close
      var rr = RNG.rng('car:' + this.seed + ':' + idx);
      var len = sp.kind === 'truck' ? 6.5 : 4.2, w = sp.kind === 'truck' ? 2.3 : 1.9;
      s.traffic.push({ id: idx, z: sp.z, lane: sp.lane, x: T.laneX(t.lanes, sp.lane), cruise: sp.speed * BASE_TOP,
        v: sp.speed * BASE_TOP, state: 'cruise', sig: 0, sigT: 0, chgT: 0, fromX: 0, toX: 0, toLane: sp.lane,
        nextT: sp.change > 0 ? rr.range(1.5, 10 / sp.change) : 1e9, change: sp.change, rng: rr,
        kind: sp.kind, color: sp.color, len: len, w: w, hitT: 0 });
    }
    var cars = s.traffic;
    for (var i = cars.length - 1; i >= 0; i--) {
      var k = cars[i];
      if (k.z < c.z - 90 || k.z > t.length + 60) { cars.splice(i, 1); continue; }
      if (k.hitT > 0) k.hitT -= DT;
      // keep a gap to the car in front (same or target lane)
      var want = k.hitT > 0 ? k.cruise * 1.5 : k.cruise;     // bumped: it drives off, no chain of crashes
      for (var j = 0; j < cars.length; j++) {
        var o = cars[j];
        if (o === k || o.z <= k.z || o.z - k.z > 16) continue;
        if (o.lane === k.lane || o.toLane === k.lane || o.lane === k.toLane) want = Math.min(want, o.v * 0.95);
      }
      k.v += clamp(want - k.v, -6 * DT, 3 * DT);
      if (k.state === 'cruise') {
        var forced = !laneOpen(t, k.lane, k.z, k.z + 90);
        k.nextT -= DT;
        if (forced || k.nextT <= 0) {
          var dir = this.pickLane(k, forced);
          if (dir) { k.state = 'signal'; k.sig = dir; k.sigT = forced ? 1.1 : SIGNAL_T; k.toLane = k.lane + dir; this.emit('signal', { car: k.id, dir: dir }); }
          else if (forced) k.cruise = Math.max(4, k.cruise * 0.995);
          k.nextT = k.change > 0 ? k.rng.range(4, 10 / k.change + 4) : 1e9;
        }
      } else if (k.state === 'signal') {
        k.sigT -= DT;
        if (k.sigT <= 0) { k.state = 'change'; k.chgT = 0; k.fromX = k.x; k.toX = T.laneX(t.lanes, k.toLane); }
      } else if (k.state === 'change') {
        k.chgT += DT;
        k.x = k.fromX + (k.toX - k.fromX) * smooth(k.chgT / CHANGE_T);
        if (k.chgT >= CHANGE_T) { k.x = k.toX; k.lane = k.toLane; k.state = 'cruise'; k.sig = 0; }
      }
      k.z += k.v * DT;
    }
  };

  /** Direction (−1/+1) of a safe lane change for a traffic car, or 0. Never cuts in right beside the player. */
  Sim.prototype.pickLane = function (k, forced) {
    var t = this.track, c = this.s.car, cars = this.s.traffic;
    var dirs = forced ? [-1, 1] : (k.rng.chance(0.5) ? [-1, 1] : [1, -1]);
    if (forced) {
      var r = T.openRange(t, k.z, k.z + 90), mid = (r.lo + r.hi) / 2;
      dirs = mid < k.x ? [-1, 1] : [1, -1];
    }
    for (var d = 0; d < dirs.length; d++) {
      var nl = k.lane + dirs[d];
      if (nl < 0 || nl >= t.lanes || !laneOpen(t, nl, k.z - 5, k.z + 90)) continue;
      var tx = T.laneX(t.lanes, nl), clear = true;
      for (var j = 0; j < cars.length && clear; j++) {
        var o = cars[j];
        if (o !== k && (o.lane === nl || o.toLane === nl) && Math.abs(o.z - k.z) < 16) clear = false;
      }
      if (clear && Math.abs(c.z - k.z) < 9 && Math.abs(c.x - tx) < 2.6) clear = false;
      if (clear) return dirs[d];
    }
    return 0;
  };

  Sim.prototype.updateBoss = function () {
    var s = this.s, b = s.boss, c = s.car, t = this.track, def = this.def.boss, r = this.bossRng;
    var base = def.speed * BASE_TOP, gap = b.z - c.z, tv;
    if (b.boostT > 0) { b.boostT -= DT; tv = BASE_TOP * 1.25; }
    else if (gap < -4) tv = BASE_TOP * 1.2;            // the player got past: race to get in front again
    else if (gap > 140) tv = base * 0.7;               // too far ahead: wait a little (always catchable)
    else tv = base;
    if (c.respawnT > 0) tv = Math.min(tv, base * 0.6);
    b.v += clamp(tv - b.v, -8 * DT, 6 * DT);
    if (b.hitT > 0) b.hitT -= DT;
    // weave between lanes, with a blinker first
    if (b.state === 'cruise') {
      b.nextT -= DT;
      if (b.nextT <= 0) {
        b.nextT = r.range(2.5, 5);
        var opts = [b.lane - 1, b.lane + 1].filter(function (l) { return l >= 0 && l < t.lanes && laneOpen(t, l, b.z, b.z + 60); });
        if (opts.length) { b.toLane = r.pick(opts); b.sig = b.toLane > b.lane ? 1 : -1; b.state = 'signal'; b.sigT = 0.8; }
      }
      if (!laneOpen(t, b.lane, b.z, b.z + 50)) b.nextT = Math.min(b.nextT, 0);
    } else if (b.state === 'signal') {
      b.sigT -= DT;
      if (b.sigT <= 0) { b.state = 'change'; b.chgT = 0; b.fromX = b.x; b.toX = T.laneX(t.lanes, b.toLane); }
    } else if (b.state === 'change') {
      b.chgT += DT;
      b.x = b.fromX + (b.toX - b.fromX) * smooth(b.chgT / 1.2);
      if (b.chgT >= 1.2) { b.x = b.toX; b.lane = b.toLane; b.state = 'cruise'; b.sig = 0; }
    }
    // drops: warn, then leave something behind (only while the player is not right behind it)
    if (b.warnT > 0) {
      b.warnT -= DT;
      if (b.warnT <= 0) {
        var type = def.drops[b.dropN++ % def.drops.length];
        var o = { type: type, z: b.z - 6, x: b.x, w: T.SIZE[type].w, len: T.SIZE[type].len, done: false, hitT: -1e9,
          id: 'd' + b.dropN, dropped: true };
        if (type === 'rock') { o.state = 'down'; o.y = 0; }
        s.dyn.push(o);
        this.emit('bossDrop', { kind: type, x: o.x, z: o.z });
      }
    } else {
      b.dropT -= DT;
      // only drop with a fair gap: the item lands ≥ ~1.4 s ahead of the car
      if (b.dropT <= 0 && gap > DROP_GAP && gap < 170) {
        b.warnT = 0.7; b.dropT = def.dropEvery * r.range(0.8, 1.2);
        this.emit('bossWarn');
      }
    }
    for (var i = s.dyn.length - 1; i >= 0; i--) if (s.dyn[i].z < c.z - 60) s.dyn.splice(i, 1);
    b.z += b.v * DT;
    if (b.z >= t.length - 40) this.fail('escaped');
  };

  /* ------------------------------------------------------------------ collisions */

  function touch(c, o, w, len) {
    return Math.abs(o.z - c.z) < (len + CAR_LEN) / 2 && Math.abs(o.x - c.x) < (w + CAR_W) / 2;
  }

  Sim.prototype.collide = function () {
    var s = this.s, c = s.car;
    var lo = this.windowStart(c.z - 8);
    for (var i = lo; i < s.items.length; i++) {
      var o = s.items[i];
      if (o.z > c.z + 8) break;
      this.hitItem(o);
      if (s.status !== 'race' || c.respawnT > 0) return;
    }
    for (var d = 0; d < s.dyn.length; d++) { this.hitItem(s.dyn[d]); if (s.status !== 'race' || c.respawnT > 0) return; }
    // traffic
    for (var k = 0; k < s.traffic.length; k++) {
      var car = s.traffic[k];
      if (car.hitT > 0 || !touch(c, car, car.w, car.len) || c.air && c.y > 1.4) continue;
      if (c.invulnT > 0) continue;     // ghosting through after a hit / respawn
      var behind = c.z < car.z - car.len / 2 + 0.6;
      if (behind) { c.z = car.z - (car.len + CAR_LEN) / 2 - 0.05; c.v = Math.min(c.v, car.v * 0.6); }
      else { var side = c.x < car.x ? -1 : 1; c.x += side * 0.6; c.vx = side * 3; c.v *= 0.8; }
      car.hitT = 3;
      this.damage(DAMAGE.traffic, 'traffic');
      if (s.status !== 'race' || c.respawnT > 0) return;
    }
    // boss bump
    var b = s.boss;
    if (b && b.hitT <= 0 && touch(c, b, b.w, b.len) && !(c.air && c.y > 1.6)) {
      b.hp--; b.hitT = 3; b.boostT = BOSS_BOOST;
      c.v = Math.min(c.v, b.v * 0.85);
      if (c.z > b.z - (b.len + CAR_LEN) / 2) c.z = b.z - (b.len + CAR_LEN) / 2;
      this.emit('bossHit', { hp: b.hp });
      if (b.hp <= 0) this.finish('boss');
    }
  };

  Sim.prototype.hitItem = function (o) {
    var s = this.s, c = s.car, st = this.stats;
    if (o.done) return;
    var type = o.type;
    if (type === 'coin' || type === 'fuel' || type === 'wrench') {
      if (!touch(c, o, o.w, o.len)) return;
      var oy = o.y || 0;
      if (oy > 0.5 ? Math.abs(c.y - oy) > 1.7 : c.y > 1.6) return;
      o.done = true;
      if (type === 'coin') { s.coins++; this.emit('coin', { n: s.coins }); }
      else if (type === 'fuel') { c.fuel = Math.min(100, c.fuel + 50); this.emit('fuel'); }
      else { c.health = Math.min(100, c.health + 35); this.emit('wrench'); }
      return;
    }
    if (type === 'rock' && o.state !== 'down') return;
    if (c.air && c.y > 0.4) return;           // jumped over it
    if (!touch(c, o, o.w, o.len)) return;
    if (s.t - o.hitT < 1.5) return;
    if (type === 'ramp') {
      if (c.v > 6 && !c.air) { o.hitT = s.t; c.air = true; c.y = 0.05; c.vy = Math.min(9, c.v * 0.3); this.emit('jump'); }
      return;
    }
    if (type === 'oil') {
      o.hitT = s.t;
      if (c.skidT <= 0) { c.skidT = st.skid; c.skidDir = c.x >= o.x ? 1 : -1; this.emit('skid'); }
      return;
    }
    if (type === 'puddle') { o.hitT = s.t; c.v *= 0.78; this.emit('splash'); return; }
    if (c.invulnT > 0) return;
    o.hitT = s.t;
    if (type === 'cone') { o.done = true; o.knockT = s.t; o.knockDir = c.x >= o.x ? -1 : 1; c.v *= 0.9; this.emit('cone', { id: o.id }); }
    else if (type === 'pothole') { c.v *= 0.72; this.emit('bump'); }
    else if (type === 'rock') { c.v *= 0.4; this.emit('crash'); }
    this.damage(DAMAGE[type] || 10, type);
  };

  /* ------------------------------------------------------------------ checkpoints, timer, finish */

  Sim.prototype.progress = function () {
    var s = this.s, c = s.car, t = this.track;
    while (s.cp < t.checkpoints.length && c.z >= t.checkpoints[s.cp]) {
      s.lastCpZ = t.checkpoints[s.cp]; s.cp++;
      var add = this.legs ? this.legs[s.cp] : 0;
      if (this.legs) s.timeLeft += add;
      this.emit('checkpoint', { n: s.cp, add: add });
    }
    if (this.legs) {
      s.timeLeft -= DT;
      if (s.timeLeft <= 0) { s.timeLeft = 0; this.fail('time'); return; }
    }
    if (c.z >= t.length) {
      if (s.boss) this.fail('escaped');
      else this.finish('line');
    }
  };

  /* ------------------------------------------------------------------ results */

  Sim.prototype.result = function () {
    var s = this.s;
    var r = { id: this.def.id, status: s.status, reason: s.reason, time: Math.round(s.t * 100) / 100, hits: s.hits,
      coins: s.coins, coinTotal: this.track.coinTotal, livesLost: s.livesLost, lives: s.car.lives,
      health: Math.max(0, Math.round(s.car.health)), bossHp: s.boss ? s.boss.hp : null };
    r.stars = STARS.compute(this.def, r);
    return r;
  };

  /** Compact state fingerprint (determinism tests, replays). */
  Sim.prototype.hash = function () {
    var s = this.s, c = s.car;
    function f(v) { return Math.round(v * 1000) / 1000; }
    var parts = [s.steps, s.status, f(c.z), f(c.x), f(c.v), f(c.y), f(c.health), c.lives, f(c.fuel), s.hits, s.coins, s.cp];
    s.traffic.forEach(function (k) { parts.push(k.id, f(k.z), f(k.x)); });
    if (s.boss) parts.push(f(s.boss.z), f(s.boss.x), s.boss.hp);
    return parts.join('|');
  };

  /** Run to the end with driver(sim) → input each step. maxTime guards against a stuck driver. */
  function run(track, driver, opts) {
    opts = opts || {};
    var sim = new Sim(track, opts), max = Math.round((opts.maxTime || 600) / DT);
    for (var i = 0; i < max && (sim.s.status === 'race' || sim.s.status === 'countdown'); i++) sim.step(driver(sim));
    if (sim.s.status === 'race') { sim.s.status = 'failed'; sim.s.reason = 'timeout'; }
    return { sim: sim, result: sim.result() };
  }

  return {
    DT: DT, BASE_TOP: BASE_TOP, CAR_LEN: CAR_LEN, CAR_W: CAR_W, LIVES: LIVES, COUNTDOWN: COUNTDOWN, OFF_MAX: OFF_MAX,
    DAMAGE: DAMAGE, ROCK_TRIGGER: ROCK_TRIGGER, ROCK_FALL: ROCK_FALL, SIGNAL_T: SIGNAL_T, CHANGE_T: CHANGE_T,
    UPGRADE_MAX: UPGRADE_MAX, RESPAWN_DELAY: RESPAWN_DELAY,
    carStats: carStats, create: function (track, opts) { return new Sim(track, opts); }, Sim: Sim, run: run,
    timerPlan: timerPlan
  };
});
