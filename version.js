/* Royal Rescue version: the ONE place to change it. Bump `version` for every release (7.6 -> 7.7 ...).
 * `built` is written by tools/stamp-sw.js (deploy date). The stamp copies both into sw.js, so How to play,
 * Parent mode, the "New version" banner and the service worker always agree.
 * History: 7.0–7.3 update button + banner, parent mode fixes · 7.4 Parents button on How to play ·
 * 7.5 scrollable Parent mode · 7.6 version tracking (version + date shown, version in the update banner) ·
 * 7.7 the site-root service worker also leaves /chat/ (Family Chat) and /racer/ alone. */
(function (g) { g.GAME_VERSION = { version: '7.7', built: '20 Oct 2026' }; })(typeof self !== 'undefined' ? self : this);
