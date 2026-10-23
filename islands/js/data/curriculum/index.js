/* Curriculum facade: three subjects, question lookup by id, skill names. UMD: SI.curriculum. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('curriculumMath', './math.js'), dep('curriculumEnglish', './english.js'), dep('curriculumScience', './science.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.curriculum = mod; }
})(typeof self !== 'undefined' ? self : this, function (MATH, ENG, SCI) {
  'use strict';
  var SUBJECTS = ['math', 'english', 'science'];
  var SUBJECT_NAMES = { math: 'Maths', english: 'English', science: 'Science' };
  var SKILLS = {};
  [MATH.SKILLS, ENG.SKILLS, SCI.SKILLS].forEach(function (m) { Object.keys(m).forEach(function (k) { SKILLS[k] = m[k]; }); });
  var byId = {};
  ENG.bank.concat(SCI.bank).forEach(function (q) { byId[q.id] = q; });
  function skillSubject(skill) { return skill.indexOf('m-') === 0 ? 'math' : skill.indexOf('en-') === 0 ? 'english' : 'science'; }
  /** A question by id (math ids regenerate from their seed). */
  function get(id) { return byId[id] || MATH.fromId(id) || null; }
  return { SUBJECTS: SUBJECTS, SUBJECT_NAMES: SUBJECT_NAMES, SKILLS: SKILLS, math: MATH, english: ENG, science: SCI, get: get, skillSubject: skillSubject };
});
