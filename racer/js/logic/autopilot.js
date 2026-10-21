/* Autopilot: a tidy version of the test bot (test/bot.js) used for the title-screen demo car and the ?test=1 hook.
 * Looks ~2 s ahead, scores lateral positions (obstacles and traffic cost, coins and needed pickups reward), steers
 * smoothly toward the best one and brakes when boxed in. Pure (no DOM), deterministic. UMD: RR.autopilot. */
(function (root, factory) {
  var RR = root.RR || {};
  var req = typeof require === 'function' ? require : null;
  var mod = factory(RR.track || req('./track.js'), RR.sim || req('./sim.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.autopilot = mod; }
})(typeof self !== 'undefined' ? self : this, function (T, S) {
  'use strict';

  var COST = { pothole: 10, cone: 6, rock: 14, oil: 7, puddle: 3.5, traffic: 18 };

  /** → drive(sim) → { steer, gas, brake }. opts: { coins: true (go for coins), lookTime: 2 } */
  function create(opts) {
    opts = opts || {};
    var lookTime = opts.lookTime || 2.0, wantCoins = opts.coins !== false;
    var target = null, step = 0;
    var threats = [], goodies = [];

    function plan(sim) {
      var s = sim.s, c = s.car, t = sim.track;
      var horizon = Math.max(30, c.v * lookTime) + 8;
      var range = T.openRange(t, c.z, c.z + Math.min(horizon, 50));
      var lo = Math.max(range.lo, -t.half) + 1.0, hi = Math.min(range.hi, t.half) - 1.0;
      threats.length = 0; goodies.length = 0;
      function consider(z, x, w, len, kind) {
        var dz = z - c.z;
        if (dz < -len / 2 - 2 || dz > horizon) return;
        threats.push({ x: x, w: w, dz: dz, cost: COST[kind] || 8 });
      }
      function look(o) {
        if (o.done) return;
        var dz = o.z - c.z;
        if (o.type === 'coin' || o.type === 'fuel' || o.type === 'wrench') {
          if (dz < 0 || dz > horizon) return;
          var v = wantCoins ? 1.2 : 0.2;
          if (o.type === 'coin' && o.y > 0.5) v = 0.4;
          if (o.type === 'fuel') v = c.fuel < 75 ? 10 : 0.5;
          if (o.type === 'wrench') v = c.health < 85 ? 6 : 0.5;
          goodies.push({ x: o.x, dz: dz, v: v });
          return;
        }
        if (o.type === 'ramp' || (o.type === 'rock' && o.state === 'wait')) return;
        consider(o.z, o.x, o.w, o.len, o.type);
      }
      for (var i = 0; i < s.items.length; i++) {
        var it = s.items[i];
        if (it.z < c.z - 10) continue;
        if (it.z > c.z + horizon) break;
        look(it);
      }
      for (var d = 0; d < s.dyn.length; d++) look(s.dyn[d]);
      for (var k = 0; k < s.traffic.length; k++) {
        var car = s.traffic[k];
        var lead = Math.max(0, (car.z - c.z) / Math.max(4, c.v - car.v)) * car.v * 0.5;
        var kz = car.z + Math.min(lead, 30);
        consider(kz, car.x, car.w + 0.4, car.len + 4, 'traffic');
        if (car.state !== 'cruise') consider(kz, T.laneX(t.lanes, car.toLane), car.w + 0.4, car.len + 4, 'traffic');
      }
      var bossX = null;
      if (s.boss && s.boss.hitT <= 0) bossX = s.boss.state === 'cruise' ? s.boss.x : T.laneX(t.lanes, s.boss.toLane);
      var best = c.x, bestCost = Infinity;
      for (var x = lo; x <= hi + 1e-6; x += 0.4) {
        var cost = Math.abs(x - c.x) * 0.25;
        if (target !== null && Math.abs(x - target.x) < 0.3) cost -= 0.6;
        for (var a = 0; a < threats.length; a++) {
          var th = threats[a];
          if (Math.abs(x - th.x) < (th.w + S.CAR_W) / 2 + 0.35) cost += th.cost * (1 + 2 * (1 - Math.max(0, th.dz) / horizon));
        }
        for (var g = 0; g < goodies.length; g++) if (Math.abs(x - goodies[g].x) < 0.9) cost -= goodies[g].v * (1 - goodies[g].dz / horizon * 0.5);
        if (bossX !== null && Math.abs(x - bossX) < 1.2) cost -= 4;
        if (cost < bestCost) { bestCost = cost; best = x; }
      }
      if (lo > hi) best = (range.lo + range.hi) / 2;
      var brake = false;
      for (var b = 0; b < threats.length; b++) {
        var t2 = threats[b];
        if (t2.cost >= 10 && t2.dz > 0 && t2.dz < 14 && Math.abs(best - t2.x) < (t2.w + S.CAR_W) / 2) brake = true;
      }
      return { x: best, brake: brake };
    }

    return function drive(sim) {
      var s = sim.s, c = s.car, t = sim.track, st = sim.stats;
      step++;
      if (s.status !== 'race') return { steer: 0, gas: true, brake: false };
      if (step % 3 === 0 || !target) target = plan(sim);
      var sf = Math.min(1, c.v / 8) || 0.01;
      var rr = c.v / S.BASE_TOP;
      var push = T.curveAt(t, c.z) * rr * rr * 4.0 / st.curveGrip;
      var wantVx = Math.max(-st.steer, Math.min(st.steer, (target.x - c.x) * 2.2));
      var steer = Math.max(-1, Math.min(1, (wantVx + push) / (st.steer * sf)));
      return { steer: steer, gas: !target.brake, brake: target.brake };
    };
  }

  return { create: create };
});
