/* Single source of the app version. UMD: window.SW_VERSION in the browser, module.exports for tools/build-sw.js. */
(function (root, factory) {
  var m = factory();
  if (typeof module === 'object' && module.exports) module.exports = m;
  else root.SW_VERSION = m;
})(typeof self !== 'undefined' ? self : this, function () {
  return { version: '1.0', date: '2026-11-01' };
});
