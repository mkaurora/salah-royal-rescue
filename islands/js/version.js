/* The ONE place the game version lives. tools/build-sw.js reads it and embeds it in sw.js (cache name
 * 'islands-v<version>-<hash>' + a VERSION const); Settings shows "v1.0 (23 Oct 2026)". Bump on every deploy.
 * UMD: module.exports in Node, window.SI_VERSION (and SI.version) in the browser. */
(function (root) {
  var SI_VERSION = { version: '1.1', date: '2026-10-31' };
  if (typeof module === 'object' && module.exports) module.exports = SI_VERSION;
  else { root.SI_VERSION = SI_VERSION; root.GAME_VERSION = SI_VERSION;  // GAME_VERSION: read by js/core/visit.js
    root.SI = root.SI || {}; root.SI.version = SI_VERSION; }
})(typeof self !== 'undefined' ? self : this);
