/* Learning Quest version: the ONE place to change it. Bump `version` for every release (4.1 -> 4.2 ...).
 * `built` is written by tools/build-sw.js (deploy date). The build copies both into sw.js, so the Settings label,
 * the Parent Area, the "New version" banner and the service worker always agree.
 * History: 1 first release · 2 PIN 1994 · 3 Update game button · 4 Parents button + scroll fixes ·
 * 4.1 version tracking (version + date in Settings, version in the update banner) ·
 * 4.2 privacy-safe "opened" beacon (game, version, random device id). */
(function (g) { g.GAME_VERSION = { version: '4.2', built: '20 Oct 2026' }; })(typeof self !== 'undefined' ? self : this);
