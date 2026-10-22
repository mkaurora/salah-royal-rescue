/* Level 2 (v4) — Science Lab: the small, exact models behind the lab stages. Pure (browser + Node).
 *
 * gears  A row of axles after the motor (big gear, 16 teeth, turns clockwise = +1, speed 1). Each slot holds nothing,
 *        a small gear 'S' (8 teeth), a big gear 'B' (16) or a double gear 'D' (a small gear it is turned by + a big gear
 *        it turns the next one with, on one axle). The chain must start next to the motor with no gaps; the fan sits
 *        on the LAST gear. Neighbouring gears turn opposite ways; speed(next) = speed(this) × teeth out / teeth in
 *        (the same rule as js/logic/machines.js solveGears: speed ratio = driver teeth / driven teeth).
 *        level.goalSpec: { dir: 1 (clockwise) | -1, speed: 'slow' (< 1) | 'same' (= 1) | 'fast' (= 2) | 'super' (>= 4) }.
 * lever  A plank with spots −4…4 resting on a fulcrum at spot f (chosen by the player). The load (weight W) sits at
 *        spot `load`; the robot pushes down with strength `push` at spot `effort`, plus optional 1-kg helper weights on
 *        spots. The plank tips the load up when effort turning > load turning. The load rises
 *        rise = height × |load − f| / |effort − f| (the effort end goes down to the ground). Goal: lift, and (if
 *        `shelf`) rise ≥ shelf.
 * ramp   Push a box of weight W up a ramp of length L (cells) to height H on a surface with friction μ:
 *        push needed = W × H / L + μ × W. The robot can push `strength`. Longer = gentler = easier, but must fit `space`.
 * roll   A ball rolls down a ramp of height h onto a floor with friction μ and travels d = h / μ / 2 cells (energy:
 *        higher = faster = farther; rougher floors stop it sooner). Goal: stop inside [from, to].
 * quiz   { questions: [{ q, pic, answers: [{ label, pic }], right, why }] } — stars: 3 with no wrong taps, 2 with one,
 *        else 1. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.lab = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MOTOR_TEETH = 16;
  var GEAR = { S: { inT: 8, outT: 8 }, B: { inT: 16, outT: 16 }, D: { inT: 8, outT: 16 } };
  var SURFACES = {
    ice: { mu: 0.05, name: 'Ice' },
    wood: { mu: 0.2, name: 'Wood' },
    carpet: { mu: 0.4, name: 'Carpet' },
    sand: { mu: 0.8, name: 'Sand' }
  };
  var EPS = 1e-9;

  /* ---------- gears ---------- */
  /** slots: ['S','B','D', null …] → { connected:n, gears:[{type,dir,speed}], fan:{dir,speed}|null, gap:bool } */
  function gearTrain(level, slots) {
    slots = (slots || []).slice(0, level.slots || 4);
    var gears = [], dir = 1, speed = 1, outT = MOTOR_TEETH, gap = false, n = 0;
    for (var i = 0; i < slots.length; i++) {
      var t = slots[i];
      if (!t || !GEAR[t]) { if (slots.slice(i + 1).some(function (s) { return !!s; })) gap = true; break; }
      dir = -dir;
      speed = speed * outT / GEAR[t].inT;
      outT = GEAR[t].outT;
      gears.push({ type: t, dir: dir, speed: speed });
      n++;
    }
    return { connected: n, gears: gears, gap: gap, fan: n ? { dir: dir, speed: speed } : null };
  }
  function speedWord(s) { return s >= 4 - EPS ? 'super' : Math.abs(s - 2) < EPS ? 'fast' : Math.abs(s - 1) < EPS ? 'same' : s < 1 ? 'slow' : 'fast'; }
  function gearCheck(level, slots) {
    var tr = gearTrain(level, slots), g = level.goalSpec;
    var r = { ok: false, reason: null, train: tr, used: tr.connected };
    if (tr.gap) r.reason = 'gap';
    else if (!tr.fan) r.reason = 'empty';
    else if (tr.fan.dir !== g.dir) r.reason = 'dir';
    else if (speedWord(tr.fan.speed) !== g.speed) r.reason = tr.fan.speed < speedOf(g.speed) ? 'slow' : 'fast';
    else r.ok = true;
    return r;
  }
  function speedOf(w) { return w === 'super' ? 4 : w === 'fast' ? 2 : w === 'same' ? 1 : 0.5; }

  /* ---------- levers ---------- */
  /** state: { f: fulcrum spot, weights: [spots of 1-kg helpers] } */
  function leverCheck(level, state) {
    var f = state.f, load = level.load, eff = level.effort;
    var r = { ok: false, reason: null, rise: 0, torqueUp: 0, torqueDown: 0, used: (state.weights || []).length };
    if (f === undefined || f === null || f === load || f === eff || (level.spots && level.spots.indexOf(f) < 0)) { r.reason = 'fulcrum'; return r; }
    // turning effects about the fulcrum: positive = the effort side goes down
    var side = eff > f ? 1 : -1;
    var down = level.push * Math.abs(eff - f);
    (state.weights || []).forEach(function (x) { if (x !== f && (x - f) * side > 0) down += Math.abs(x - f); else down -= Math.abs(x - f); });
    var up = level.weight * Math.abs(load - f);
    if ((load - f) * side > 0) up = -up;          // load on the same side as the push: it helps (a wheelbarrow-type mistake)
    r.torqueDown = down; r.torqueUp = up;
    r.rise = Math.round(level.height * Math.abs(load - f) / Math.abs(eff - f) * 1000) / 1000;
    if ((load - f) * side > 0) { r.reason = 'side'; return r; }
    if (down <= up + EPS) { r.reason = 'heavy'; return r; }
    if (level.shelf && r.rise < level.shelf - EPS) { r.reason = 'low'; return r; }
    r.ok = true;
    return r;
  }

  /* ---------- ramps ---------- */
  /** state: { len: ramp length in cells, surface } */
  function rampCheck(level, state) {
    var L = state.len, s = SURFACES[state.surface];
    var r = { ok: false, reason: null, push: 0, used: L || 0 };
    if (!L || !s) { r.reason = 'empty'; return r; }
    if (L > level.space) { r.reason = 'space'; return r; }
    r.push = Math.round((level.weight * level.height / L + s.mu * level.weight) * 1000) / 1000;
    if (r.push > level.strength + EPS) { r.reason = 'heavy'; return r; }
    r.ok = true;
    return r;
  }
  /** state: { h: ramp height, surface } → ball stops at d cells past the ramp foot. */
  function rollCheck(level, state) {
    var s = SURFACES[state.surface];
    var r = { ok: false, reason: null, d: 0, used: state.h || 0 };
    if (!state.h || !s) { r.reason = 'empty'; return r; }
    r.d = Math.round(state.h / s.mu / 2 * 1000) / 1000;
    if (r.d < level.from - EPS) r.reason = 'short';
    else if (r.d > level.to + EPS) r.reason = 'far';
    else r.ok = true;
    return r;
  }

  /* ---------- quiz ---------- */
  function quizStars(wrong) { return wrong <= 0 ? 3 : wrong === 1 ? 2 : 1; }

  /** One entry point: mode-specific check + stars (par = fewest parts for 3 stars; par2 for 2). */
  function check(level, state) {
    var r;
    if (level.mode === 'gears') r = gearCheck(level, state.slots);
    else if (level.mode === 'lever') r = leverCheck(level, state);
    else if (level.mode === 'ramp') r = rampCheck(level, state);
    else if (level.mode === 'roll') r = rollCheck(level, state);
    else if (level.mode === 'quiz') {
      var answers = state.answers || [];
      var okq = (level.questions || []).every(function (q, i) { return answers[i] === q.right; });
      return { ok: okq, stars: okq ? quizStars(state.wrong || 0) : 0, result: { ok: okq } };
    } else throw new Error('unknown lab mode ' + level.mode);
    var stars = 0;
    if (r.ok) stars = level.par === undefined ? 3 : r.used <= level.par ? 3 : r.used <= (level.par2 === undefined ? level.par + 1 : level.par2) ? 2 : 1;
    return { ok: r.ok, stars: stars, result: r };
  }

  return {
    MOTOR_TEETH: MOTOR_TEETH, GEAR: GEAR, SURFACES: SURFACES,
    gearTrain: gearTrain, gearCheck: gearCheck, speedWord: speedWord, leverCheck: leverCheck, rampCheck: rampCheck, rollCheck: rollCheck,
    quizStars: quizStars, check: check
  };
});
