/* Where the chat backend lives. PROD_API is filled in after the Cloudflare Worker is deployed
 * (https://salah-family-chat.<your-subdomain>.workers.dev). No keys or secrets belong in this file:
 * the only credential the app ever holds is the per-device token it gets after typing the chat code.
 * Local testing only (127.0.0.1 / localhost): ?api=http://127.0.0.1:47310 picks a local backend. */
(function (g) {
  var PROD_API = 'https://salah-family-chat.mkaurora.workers.dev';
  var api = PROD_API;
  try {
    var host = g.location && g.location.hostname;
    if (host === '127.0.0.1' || host === 'localhost') {
      var q = new URLSearchParams(g.location.search).get('api');
      if (q) g.localStorage.setItem('fc.devApi', q);
      api = g.localStorage.getItem('fc.devApi') || 'http://127.0.0.1:47310';
    }
  } catch (e) { /* storage blocked: keep prod */ }
  g.FC_CONFIG = { API_BASE: api.replace(/\/$/, ''), TZ: 'Africa/Casablanca', MAX_VOICE_SEC: 120 };
})(typeof self !== 'undefined' ? self : this);
