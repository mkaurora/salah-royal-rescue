/* Learning questions woven into the game: pick a question for an island (tier), parents' difficulty and subjects, and adapt.
 * Wrong = hint, never a fail. Pure: works on a save object S (S.learn, S.settings, S.stats). UMD: SI.learn. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('rng', './rng.js'), dep('curriculum', '../data/curriculum/index.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.learn = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG, CUR) {
  'use strict';

  var STREAK_UP = 3, MISS_DOWN = 2, ADAPT_MAX = 2, RECENT = 12, WEAK = 0.6;
  var DIFF = { easier: -1, normal: 0, harder: 1 };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function ensure(S) {
    S.learn = S.learn || {};
    S.learn.skills = S.learn.skills || {}; S.learn.recent = S.learn.recent || [];
    S.learn.adapt = S.learn.adapt || { math: 0, english: 0, science: 0 };
    S.learn.run = S.learn.run || { math: { right: 0, miss: 0 }, english: { right: 0, miss: 0 }, science: { right: 0, miss: 0 } };
    return S.learn;
  }
  function enabledSubjects(S) {
    var sub = (S.settings && S.settings.subjects) || {}, list = CUR.SUBJECTS.filter(function (s) { return sub[s] !== false; });
    return list.length ? list : ['math'];
  }
  function baseTier(S, island) { return clamp(island + (DIFF[(S.settings && S.settings.difficulty) || 'normal'] || 0), 1, 6); }
  function effectiveTier(S, subject, island) { var L = ensure(S); return clamp(baseTier(S, island) + (L.adapt[subject] || 0), 1, 6); }
  function accuracy(S, skill) { var s = ensure(S).skills[skill]; return s && s.seen >= 2 ? s.right / s.seen : null; }

  /** Pick a question. ctx: { island, subject: 'math'|'english'|'science'|'mix', rng } */
  function pick(S, ctx) {
    var L = ensure(S), r = ctx.rng || Math.random, en = enabledSubjects(S), subject = ctx.subject || 'mix';
    if (subject === 'mix' || en.indexOf(subject) < 0) subject = en[Math.floor(r() * en.length)];
    var tier = effectiveTier(S, subject, ctx.island || 1), q = null, tries = 0;
    function weakSkill(list) {
      var weak = list.filter(function (sk) { var a = accuracy(S, sk); return a !== null && a < WEAK; });
      return weak.length && r() < 0.4 ? weak[Math.floor(r() * weak.length)] : null;
    }
    while (!q && tries++ < 20) {
      var cand;
      if (subject === 'math') {
        var skills = CUR.math.skillsFor(tier), sk = weakSkill(skills) || skills[Math.floor(r() * skills.length)];
        cand = CUR.math.make(tier, Math.floor(r() * 100000), sk);
      } else {
        var bank = CUR[subject].bank.filter(function (x) { return x.tier === tier; });
        if (bank.length < 4) bank = CUR[subject].bank.filter(function (x) { return Math.abs(x.tier - tier) <= 1; });
        var skl = bank.map(function (x) { return x.skill; }).filter(function (v, i, a) { return a.indexOf(v) === i; }), ws = weakSkill(skl);
        if (ws) bank = bank.filter(function (x) { return x.skill === ws; });
        cand = bank[Math.floor(r() * bank.length)];
      }
      if (L.recent.indexOf(cand.id) < 0 || tries > 12) q = cand;
    }
    return q;
  }

  /** Several distinct questions (helper tasks). */
  function pickMany(S, ctx, count) {
    var out = [], ids = {}, guard = 0;
    while (out.length < count && guard++ < count * 10) {
      var q = pick(S, ctx);
      if (!ids[q.id]) { ids[q.id] = true; out.push(q); }
    }
    return out;
  }

  /** Check a choice and record it. tries = wrong attempts so far on this question. No hard fail: a wrong answer returns the hint.
   *  Returns { correct, firstTry, hint, coins, xp }. */
  function answer(S, q, choice, tries) {
    var L = ensure(S), st = S.stats = S.stats || {}, correct = String(choice) === String(q.answer), first = !tries;
    var sk = L.skills[q.skill] = L.skills[q.skill] || { seen: 0, right: 0, first: 0 };
    var run = L.run[q.subject] = L.run[q.subject] || { right: 0, miss: 0 };
    if (correct) {
      sk.seen++; sk.right++; if (first) sk.first++;
      st.correct = (st.correct || 0) + 1; st.questions = (st.questions || 0) + 1;
      if (first) {
        st.streak = (st.streak || 0) + 1; st.bestStreak = Math.max(st.bestStreak || 0, st.streak);
        run.right++; run.miss = 0;
        if (run.right >= STREAK_UP) { L.adapt[q.subject] = clamp((L.adapt[q.subject] || 0) + 1, -ADAPT_MAX, ADAPT_MAX); run.right = 0; }
      }
      L.recent.push(q.id); if (L.recent.length > RECENT) L.recent.shift();
      return { correct: true, firstTry: first, coins: 1, xp: first ? 4 : 3 };
    }
    if (first) {
      st.wrong = (st.wrong || 0) + 1; st.streak = 0;
      run.miss++; run.right = 0;
      if (run.miss >= MISS_DOWN) { L.adapt[q.subject] = clamp((L.adapt[q.subject] || 0) - 1, -ADAPT_MAX, ADAPT_MAX); run.miss = 0; }
    }
    return { correct: false, firstTry: false, hint: q.hint, coins: 0, xp: 0 };
  }

  /** Learning report: per subject → { seen, right, accuracy, skills:[{skill, name, seen, right, firstTry, accuracy}] } */
  function report(S) {
    var L = ensure(S), out = {};
    CUR.SUBJECTS.forEach(function (s) { out[s] = { seen: 0, right: 0, first: 0, accuracy: 0, tier: effectiveTier(S, s, 1), adapt: L.adapt[s] || 0, skills: [] }; });
    Object.keys(L.skills).forEach(function (k) {
      var v = L.skills[k], s = CUR.skillSubject(k), o = out[s];
      o.seen += v.seen; o.right += v.right; o.first += v.first;
      o.skills.push({ skill: k, name: CUR.SKILLS[k] || k, seen: v.seen, right: v.right, firstTry: v.first, accuracy: v.seen ? Math.round(100 * v.first / v.seen) : 0 });
    });
    CUR.SUBJECTS.forEach(function (s) { var o = out[s]; o.accuracy = o.seen ? Math.round(100 * o.first / o.seen) : 0; o.skills.sort(function (a, b) { return a.accuracy - b.accuracy; }); });
    return out;
  }

  return { STREAK_UP: STREAK_UP, MISS_DOWN: MISS_DOWN, ADAPT_MAX: ADAPT_MAX, ensure: ensure, enabledSubjects: enabledSubjects, baseTier: baseTier,
    effectiveTier: effectiveTier, pick: pick, pickMany: pickMany, answer: answer, report: report };
});
