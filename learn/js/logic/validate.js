/* Question validation (used by tests, the content tools and the admin editor). UMD. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.validate = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var TYPES = ['choice', 'tf', 'build', 'order', 'match', 'count', 'numpad'];

  function sortedLetters(a) { return a.slice().sort().join('|'); }

  /** Returns a list of problems (empty = valid). */
  function question(q) {
    var p = [];
    if (!q || typeof q !== 'object') return ['not an object'];
    if (!q.id) p.push('missing id');
    if (!q.skill) p.push('missing skill');
    if (!(q.d >= 1 && q.d <= 3)) p.push('bad difficulty');
    if (TYPES.indexOf(q.type) < 0) p.push('bad type ' + q.type);
    if (!q.text || typeof q.text !== 'string') p.push('missing text');
    if (!q.hint || typeof q.hint !== 'string') p.push('missing hint');
    if (q.say && (!Array.isArray(q.say) || !q.say.length)) p.push('bad say');
    var o = q.options;
    if (q.type === 'match') {
      if (!Array.isArray(q.pairs) || q.pairs.length < 2 || q.pairs.length > 4) p.push('match needs 2-4 pairs');
      else {
        var l = q.pairs.map(function (x) { return x[0]; }), r = q.pairs.map(function (x) { return x[1]; });
        if (new Set(l).size !== l.length || new Set(r).size !== r.length) p.push('duplicate match items');
      }
      return p;
    }
    if (q.type === 'numpad') {
      if (!/^\d{1,3}$/.test(String(q.answer))) p.push('numpad answer must be digits');
      return p;
    }
    if (!Array.isArray(o) || o.length < 2) { p.push('needs options'); return p; }
    if (new Set(o).size !== o.length && q.type !== 'build') p.push('duplicate options');
    if (q.type === 'build') {
      var w = String(q.answer || '');
      if (!/^[a-z]{2,7}$/.test(w)) p.push('build answer must be a lowercase word');
      var pool = o.slice();
      w.split('').forEach(function (ch) {
        var i = pool.indexOf(ch);
        if (i < 0) p.push('tiles miss letter ' + ch); else pool.splice(i, 1);
      });
      if (o.length > 9) p.push('too many tiles');
    } else if (q.type === 'order') {
      if (!Array.isArray(q.answer) || sortedLetters(q.answer) !== sortedLetters(o)) p.push('order answer must be a permutation of options');
      if (o.length > 5) p.push('too many items');
    } else {
      if (o.length > 4) p.push('more than 4 options');
      if (o.indexOf(q.answer) < 0) p.push('answer not among options');
      if (q.type === 'tf' && (o.length !== 2 || o.indexOf('True') < 0 || o.indexOf('False') < 0)) p.push('tf options must be True/False');
    }
    return p;
  }

  return { question: question, TYPES: TYPES };
});
