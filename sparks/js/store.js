// Persistent state (localStorage, keys prefixed "sparks.") and local-calendar
// date helpers. Pure helpers are exposed for tests.
(function (S) {
  var PREFIX = 'sparks.';
  var memory = {}; // fallback when localStorage is unavailable (private mode etc.)

  function storage() {
    try { return self.localStorage; } catch (e) { return null; }
  }

  S.store = {
    get: function (key, fallback) {
      var ls = storage();
      try {
        var raw = ls ? ls.getItem(PREFIX + key) : memory[key];
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      var raw = JSON.stringify(value);
      var ls = storage();
      try { if (ls) ls.setItem(PREFIX + key, raw); else memory[key] = raw; }
      catch (e) { memory[key] = raw; }
    },
    remove: function (key) {
      var ls = storage();
      try { if (ls) ls.removeItem(PREFIX + key); } catch (e) {}
      delete memory[key];
    }
  };

  // ---- Local calendar dates -------------------------------------------
  // Dates are "YYYY-MM-DD" strings in the device's local time zone, so a day
  // starts at local midnight (not UTC midnight).
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  S.dateKey = function (d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  };
  S.parseKey = function (key) {
    var p = key.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2], 12); // noon avoids DST edge cases
  };
  S.addDays = function (key, n) {
    var d = S.parseKey(key);
    d.setDate(d.getDate() + n);
    return S.dateKey(d);
  };
  // Day number independent of time zone offsets/DST, for rotation maths.
  S.dayNumber = function (key) {
    var p = key.split('-');
    return Math.round(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  };

  // Streak = consecutive local days with learning, ending today or yesterday.
  // A streak that ended yesterday is still alive until today is over.
  S.computeStreak = function (days, todayKey) {
    var set = {};
    (days || []).forEach(function (d) { set[d] = true; });
    var cursor = set[todayKey] ? todayKey : S.addDays(todayKey, -1);
    var n = 0;
    while (set[cursor]) { n++; cursor = S.addDays(cursor, -1); }
    return n;
  };

  S.bestStreak = function (days) {
    var sorted = Array.from(new Set(days || [])).sort();
    var best = 0, run = 0, prev = null;
    sorted.forEach(function (d) {
      run = prev && S.addDays(prev, 1) === d ? run + 1 : 1;
      if (run > best) best = run;
      prev = d;
    });
    return best;
  };

  // Records a learning day once; returns the updated unique, sorted list.
  S.recordLearnedDay = function (todayKey) {
    var days = S.store.get('days', []);
    if (days.indexOf(todayKey) === -1) {
      days.push(todayKey);
      days = Array.from(new Set(days)).sort();
      S.store.set('days', days);
    }
    return days;
  };

  S.markLearned = function (cardIds) {
    var learned = S.store.get('learned', []);
    var set = new Set(learned);
    cardIds.forEach(function (id) { set.add(id); });
    var out = Array.from(set);
    S.store.set('learned', out);
    return out;
  };

  S.isSaved = function (id) { return S.store.get('saved', []).indexOf(id) !== -1; };
  S.toggleSaved = function (id) {
    var saved = S.store.get('saved', []);
    var i = saved.indexOf(id);
    if (i === -1) saved.unshift(id); else saved.splice(i, 1);
    S.store.set('saved', saved);
    return i === -1;
  };

  S.resetProgress = function () {
    ['days', 'learned', 'saved', 'quiz', 'today'].forEach(S.store.remove);
  };
})(self.Sparks = self.Sparks || {});
