/* Car Builder & Race logic (pure; no DOM). The race is a fixed-step simulation so the view, the tests and the
 * tip picker all see exactly the same result for the same car. */
(function (root, factory) {
  var mod = factory(root.LE && root.LE.carsContent ? root.LE.carsContent : require('../data/cars-content.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.cars = mod; }
})(typeof self !== 'undefined' ? self : this, function (CC) {
  'use strict';
  var DT = 1 / 30;
  var MAX_T = 90;
  var ICE_LO = 0.5, ICE_HI = 0.92;   // safety: every car finishes (even the slowest build) well before this

  function part(slot, id) {
    var list = CC.parts[slot];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  /** A valid car (unknown or missing parts → the starter part). */
  function normalize(car) {
    var out = {};
    CC.SLOTS.forEach(function (s) { out[s] = car && part(s, car[s]) ? car[s] : CC.starter[s]; });
    return out;
  }

  function stats(car) {
    car = normalize(car);
    var b = part('body', car.body), wh = part('wheels', car.wheels), en = part('engine', car.engine), sp = part('spoiler', car.spoiler);
    var weight = b.w + wh.w + en.w + sp.w;
    var ptw = en.p / weight;
    var top = (14 + en.p * 1.6 + b.aero * 0.8) * wh.flat * (sp.on ? 0.98 : 1);
    return {
      weight: weight, power: en.p, ptw: ptw, top: top,
      accel: 3 + 18 * ptw,
      climb: Math.min(top * 0.95, 4 + 18 * ptw) + (sp.on ? 5 : 0),   // hills: power for each kilo counts (+ spoiler grip)
      down: 1.12 + weight * 0.005,
      bump: Math.min(1, wh.bump + 0.07 * b.tough),
      ice: Math.min(0.92, Math.max(0.3, wh.grip * (0.82 - 0.06 * (en.p - 3)) + (sp.on ? 0.14 : 0)))
    };
  }
  /** Target speed (m/s) on a kind of ground. */
  function speedOn(st, k) {
    if (k === 'up') return st.climb;
    if (k === 'down') return st.top * st.down;
    if (k === 'bumpy') return st.top * st.bump;
    if (k === 'ice') return st.top * st.ice;
    return st.top;
  }
  /** Kid-friendly 1–5 bars for the build screen (bumps/ice = how well the parts grip that ground). */
  function bars(car) {
    var st = stats(car);
    var f = function (v, lo, hi) { return Math.max(1, Math.min(5, Math.round(1 + 4 * (v - lo) / (hi - lo)))); };
    return {
      speed: f(st.top, 16.6, 29.3),
      hills: f(speedOn(st, 'up'), 9.4, 22.5),
      bumps: f(st.bump, 0.55, 1),
      ice: f(st.ice, ICE_LO, ICE_HI),
      weight: f(st.weight, 4, 16)
    };
  }

  function trackLength(tr) { return tr.segs.reduce(function (a, s) { return a + s.len; }, 0); }
  /** Segment under x (index, kind, start). */
  function segAt(tr, x) {
    var a = 0;
    for (var i = 0; i < tr.segs.length; i++) {
      if (x < a + tr.segs[i].len || i === tr.segs.length - 1) return { i: i, k: tr.segs[i].k, start: a, seg: tr.segs[i] };
      a += tr.segs[i].len;
    }
  }
  /** Ground height (m) at x; hills are smoothed so cars roll over the tops. */
  function heightAt(tr, x) {
    var a = 0, hgt = 0;
    for (var i = 0; i < tr.segs.length; i++) {
      var s = tr.segs[i];
      if (x < a + s.len) {
        var t = Math.max(0, (x - a) / s.len);
        return hgt + (s.dh || 0) * (0.5 - 0.5 * Math.cos(Math.PI * t));
      }
      a += s.len; hgt += s.dh || 0;
    }
    return hgt;
  }

  /** A race between the player's car and the track's friends. step() advances by DT. */
  function createRace(tr, car) {
    var len = trackLength(tr);
    var racers = [{ id: 'you', name: 'You', car: normalize(car) }].concat(tr.friends.map(function (f) {
      var fr = CC.friends[f.id];
      return { id: fr.id, name: fr.name, car: normalize(fr.car), pace: f.pace };
    }));
    racers.forEach(function (r) {
      r.st = stats(r.car); r.x = 0; r.v = 0; r.time = null; r.byKind = {};
    });
    var race = { track: tr, len: len, t: 0, racers: racers, finished: false, order: [] };
    race.step = function () {
      if (race.finished) return;
      race.t += DT;
      racers.forEach(function (r) {
        if (r.time !== null) { r.v = Math.max(0, r.v - 30 * DT); r.x += r.v * DT; return; }   // roll out past the line
        var sg = segAt(tr, r.x);
        var target = speedOn(r.st, sg.k) * (r.pace || 1);
        var acc = sg.k === 'ice' ? r.st.accel * 0.55 : r.st.accel;
        if (r.v < target) r.v = Math.min(target, r.v + acc * DT);
        else r.v = Math.max(target, r.v - 22 * DT);
        r.x += r.v * DT;
        r.byKind[sg.k] = (r.byKind[sg.k] || 0) + DT;
        if (r.x >= len) { r.time = race.t; race.order.push(r.id); }
      });
      if (racers.every(function (r) { return r.time !== null; }) || race.t > MAX_T) {
        racers.forEach(function (r) { if (r.time === null) { r.time = race.t; race.order.push(r.id); } });
        race.finished = true;
      }
    };
    race.runToEnd = function () { while (!race.finished) race.step(); return race; };
    race.you = racers[0];
    return race;
  }
  /** Finish the race instantly: { place (1-based), stars, time, order }. */
  function result(tr, car) {
    var r = createRace(tr, car).runToEnd();
    var place = r.order.indexOf('you') + 1;
    return { place: place, stars: starsFor(place), time: r.you.time, order: r.order.slice(), byKind: r.you.byKind };
  }
  /** Never punishing: finishing is always worth a star. */
  function starsFor(place) { return place === 1 ? 3 : place === 2 ? 2 : 1; }

  /** Every single-part change of the car (for tips and Show me). */
  function swaps(car) {
    car = normalize(car);
    var out = [];
    ['body', 'wheels', 'engine', 'spoiler'].forEach(function (slot) {
      CC.parts[slot].forEach(function (p) {
        if (p.id === car[slot]) return;
        var c = Object.assign({}, car); c[slot] = p.id;
        out.push({ slot: slot, id: p.id, car: c });
      });
    });
    return out;
  }
  /** The best single change for this track (or null when the car is already as good as one change can make it). */
  function suggest(tr, car) {
    car = normalize(car);
    var base = result(tr, car), best = null;
    swaps(car).forEach(function (s) {
      var r = result(tr, s.car);
      var better = r.place < base.place || (r.place === base.place && r.time < base.time - 0.05);
      if (!better) return;
      if (!best || r.place < best.r.place || (r.place === best.r.place && r.time < best.r.time)) best = { slot: s.slot, id: s.id, r: r, car: s.car };
    });
    return best ? { slot: best.slot, id: best.id, place: best.r.place, time: best.r.time, gain: base.time - best.r.time } : null;
  }
  /** The kind of ground where a change saves the most time (or where the car spent most time). */
  function keyKind(byA, byB) {
    var best = 'flat', gain = -1;
    Object.keys(byA).forEach(function (k) { var g = byA[k] - ((byB || {})[k] || 0); if (g > gain) { gain = g; best = k; } });
    return best;
  }
  var ORDER = { wheels: ['small', 'big', 'monster'], engine: ['small', 'medium', 'big'] };
  /** One gentle engineering tip after a race: { key, text }. */
  function tip(tr, car) {
    car = normalize(car);
    var base = result(tr, car), sug = suggest(tr, car), key;
    if (base.place > 1 && sug && sug.gain > base.time * 0.02) {
      var r2 = result(tr, Object.assign({}, car, (function () { var o = {}; o[sug.slot] = sug.id; return o; })()));
      var k = keyKind(base.byKind, r2.byKind);
      if (sug.slot === 'wheels') key = ORDER.wheels.indexOf(sug.id) > ORDER.wheels.indexOf(car.wheels) ? 'wheels+:bumpy' : (k === 'up' ? 'wheels-:up' : 'wheels-:any');
      else if (sug.slot === 'engine') {
        var up = ORDER.engine.indexOf(sug.id) > ORDER.engine.indexOf(car.engine);
        key = up ? (k === 'up' ? 'engine+:up' : 'engine+:any') : (k === 'ice' ? 'engine-:ice' : 'engine-:up');
      } else if (sug.slot === 'spoiler') key = sug.id === 'wing' ? (k === 'ice' ? 'spoiler+:ice' : 'spoiler+:up') : 'spoiler-:any';
      else key = k === 'up' && sug.id === 'buggy' ? 'body:up' : k === 'bumpy' && sug.id === 'truck' ? 'body:bumpy' : 'body:any';
    } else {
      // praise what helped on the ground where the car spent the most time (not counting flat road)
      var kinds = Object.keys(base.byKind).filter(function (x) { return x !== 'flat' && x !== 'down'; });
      kinds.sort(function (a, b) { return base.byKind[b] - base.byKind[a]; });
      var main = kinds[0];
      if (main === 'bumpy' && car.wheels !== 'small') key = 'good:bumpy';
      else if (main === 'up') key = car.spoiler === 'wing' ? 'good:up' : 'good:upLight';
      else if (main === 'ice') key = car.spoiler === 'wing' ? 'good:ice' : 'good:iceGentle';
      else key = 'good:any';
    }
    return { key: key, text: CC.TIPS[key] };
  }

  /** Track i is open when i == 0 or track i-1 was finished (any place). */
  function isTrackOpen(best, i) { return i === 0 || !!(best && best[CC.tracks[i - 1].id]); }

  return { DT: DT, part: part, normalize: normalize, stats: stats, speedOn: speedOn, bars: bars, trackLength: trackLength,
    segAt: segAt, heightAt: heightAt, createRace: createRace, result: result, starsFor: starsFor, swaps: swaps,
    suggest: suggest, tip: tip, isTrackOpen: isTrackOpen };
});
