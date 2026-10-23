/* The ONE place the game version lives. tools/build-sw.js reads it and embeds it in sw.js (cache name
 * 'trucks-v<version>-<hash>' + a VERSION const); Settings shows "v1.0 (23 Oct 2026)". Bump on every deploy.
 * UMD: module.exports in Node, window.TW_VERSION (and TW.version) in the browser. */
(function (root) {
  var TW_VERSION = { version: '1.0', date: '2026-10-23' };
  if (typeof module === 'object' && module.exports) module.exports = TW_VERSION;
  else { root.TW_VERSION = TW_VERSION; root.GAME_VERSION = TW_VERSION;  // GAME_VERSION: read by js/core/visit.js
    root.TW = root.TW || {}; root.TW.version = TW_VERSION; }
})(typeof self !== 'undefined' ? self : this);
