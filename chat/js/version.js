/* Family Chat version: the ONE place to change it. Bump `version` for every release (1.0 -> 1.1 ...).
 * `built` is written by tools/build-sw.js (deploy date). The build copies both into sw.js, so the Settings label,
 * the "New version" banner and the service worker always agree.
 * History: 1.0 first version (family group chat with own names/avatars, text, voice notes, stickers, code typed once per
 * phone, Parents PIN -> admin: show/change code, phones, clear) · 1.1 every alert pops up on iPhone (new tag per alert). */
(function (g) { g.APP_VERSION = { version: '1.1', built: '20 Oct 2026' }; })(typeof self !== 'undefined' ? self : this);
