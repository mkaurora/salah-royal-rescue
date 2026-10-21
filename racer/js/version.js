/* The ONE place the game version lives. tools/build-sw.js reads it and embeds it in sw.js (cache name
 * 'racer-v<version>-<hash>' + a VERSION const); Settings shows "v1.0 (20 Oct 2026)". Bump on every deploy.
 * UMD: module.exports in Node, window.RR_VERSION (and RR.version) in the browser. */
(function (root) {
  var RR_VERSION = { version: '1.0', date: '2026-10-20' };
  if (typeof module === 'object' && module.exports) module.exports = RR_VERSION;
  else { root.RR_VERSION = RR_VERSION; root.GAME_VERSION = RR_VERSION;  // GAME_VERSION: read by js/core/visit.js
    root.RR = root.RR || {}; root.RR.version = RR_VERSION; }
})(typeof self !== 'undefined' ? self : this);
