/* "Ask Helper" (v3): talk to the helper by voice — an ElevenLabs Conversational AI agent (public agent, allowlisted
 * for mkaurora.github.io / localhost / 127.0.0.1; max 3 minutes; hints only, never full solutions).
 * No API key lives in the client: a public agent only needs its id. The SDK (js/vendor/elevenlabs-client.js) is
 * loaded on the first tap, so the offline game shell never depends on it.
 * UMD: Node tests get { HELPER_AGENT_ID, MAX_SECONDS, buildVars, failReason }; the browser gets LE.helperTalk. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else {
    root.LE = root.LE || {};
    root.LE.HELPER_AGENT_ID = mod.HELPER_AGENT_ID;
    root.LE.helperTalk = mod.browser(root);
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** The one place the agent id lives. */
  var HELPER_AGENT_ID = 'agent_6201m5ax0meveq1t431c3wmgamsr';
  var MAX_SECONDS = 180;                           // the agent also enforces max_duration_seconds = 180
  var SDK_PATH = 'js/vendor/elevenlabs-client.js';
  var LIBSAMPLERATE_PATH = 'js/vendor/libsamplerate.worklet.js';
  var WORLD_NAMES = { bridges: 'Bridges', machines: 'Machines', circuits: 'Circuits', robot: 'Robot Coder', construction: 'Construction' };

  /** Dynamic variables for the agent from the open level. info = { world, level, weekly?: { title, stepTitle, index, count } }.
   *  All values are short strings. Robot Coder adds hint_only=true (never a full program). */
  function buildVars(info) {
    var lv = (info && info.level) || {};
    var w = (info && info.world) || '';
    var wk = info && info.weekly;
    var vars = {
      world: WORLD_NAMES[w] || w || 'Little Engineer',
      level_name: String(lv.name || ''),
      goal: String(lv.goal || ''),
      hint: String(lv.hint || ''),
      step: wk ? 'Weekly project "' + wk.title + '", step ' + (wk.index + 1) + ' of ' + wk.count + ': ' + wk.stepTitle : 'none'
    };
    if (w === 'robot') vars.hint_only = 'true';
    return vars;
  }

  /** True when the agent closed the call within a few seconds without ever speaking. */
  function earlyDrop(details, connectedAt, spoke, now) {
    if (spoke) return false;
    var by = details && details.reason;
    if (by === 'user') return false;
    return !connectedAt || ((now || Date.now()) - connectedAt) < 8000;
  }

  /** Why a session could not start: 'offline' | 'mic' | 'blocked' | 'error'. */
  function failReason(err, online) {
    if (online === false) return 'offline';
    var name = err && (err.name || ''), msg = String((err && err.message) || err || '');
    if (/NotAllowed|Permission|SecurityError|NotFound|NotReadable|Overconstrained/i.test(name + ' ' + msg) && /mic|audio|media|permission|device|NotAllowed|NotFound|NotReadable/i.test(name + ' ' + msg)) return 'mic';
    if (/Failed to fetch|NetworkError|network|ERR_INTERNET|offline|timed? ?out|load the helper/i.test(msg)) return 'offline';
    if (/allowlist|origin|not allowed|forbidden|403/i.test(msg)) return 'blocked';
    if (/quota|credits/i.test(msg)) return 'busy';
    return 'error';
  }

  function browser(root) {
    var loading = null, convo = null, endTimer = 0, token = 0;

    /** Load the vendored SDK once (a plain <script>; resolves to the ElevenLabsClient global). */
    function loadClient() {
      if (root.ElevenLabsClient) return Promise.resolve(root.ElevenLabsClient);
      if (loading) return loading;
      loading = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = SDK_PATH;
        s.async = true;
        s.onload = function () { root.ElevenLabsClient ? resolve(root.ElevenLabsClient) : reject(new Error('Could not load the helper')); };
        s.onerror = function () { loading = null; s.remove(); reject(new Error('Could not load the helper (offline?)')); };
        document.head.appendChild(s);
      });
      return loading;
    }

    /** Ask for the microphone first (clear "mic" failure; iOS shows its prompt here), then release it. */
    function checkMic() {
      var md = root.navigator && root.navigator.mediaDevices;
      if (!md || !md.getUserMedia) return Promise.reject(Object.assign(new Error('No microphone access in this browser'), { name: 'NotFoundError' }));
      return md.getUserMedia({ audio: true }).then(function (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); });
    }

    /** Start a voice session. opts: { vars, onState(state), onEnd(reason) }.
     *  States: 'loading' → 'connecting' → 'listening' | 'speaking' … → 'ended'. Rejects with { reason, error }. */
    function start(opts) {
      opts = opts || {};
      var my = ++token;
      var onState = opts.onState || function () {};
      var ended = false, connectedAt = 0, spoke = false;
      function finish(reason) {
        if (ended) return;
        ended = true;
        clearTimeout(endTimer);
        convo = null;
        if (opts.onEnd) opts.onEnd(reason || 'ended');
      }
      if (root.navigator && root.navigator.onLine === false) return Promise.reject({ reason: 'offline', error: new Error('offline') });
      onState('loading');
      return checkMic().then(function () {
        if (my !== token) throw new Error('cancelled');
        return loadClient();
      }).then(function (SDK) {
        if (my !== token) throw new Error('cancelled');
        onState('connecting');
        return SDK.Conversation.startSession({
          agentId: HELPER_AGENT_ID,
          connectionType: 'webrtc',
          dynamicVariables: opts.vars || {},
          libsampleratePath: LIBSAMPLERATE_PATH,
          onConnect: function () { connectedAt = Date.now(); onState('listening'); },
          onModeChange: function (m) { if (ended) return; if (m && m.mode === 'speaking') spoke = true; onState(m && m.mode === 'speaking' ? 'speaking' : 'listening'); },
          // The agent hanging up at once without a word (out of credits, agent error) counts as a failure.
          onDisconnect: function (d) { finish(earlyDrop(d, connectedAt, spoke) ? 'dropped' : 'ended'); },
          onError: function (msg) { if (root.console) console.warn('Helper error:', msg); }
        });
      }).then(function (c) {
        if (my !== token) { c.endSession().catch(function () {}); throw new Error('cancelled'); }
        convo = c;
        endTimer = setTimeout(function () { end('time'); }, (MAX_SECONDS + 5) * 1000);
        return { end: end };
      }).catch(function (err) {
        if (err && err.reason) throw err;
        var online = root.navigator ? root.navigator.onLine : true;
        throw { reason: /cancelled/.test(String(err && err.message)) ? 'cancelled' : failReason(err, online), error: err };
      });

      function end(reason) {
        var c = convo;
        token++;
        if (c) c.endSession().catch(function () {});
        finish(reason || 'ended');
      }
    }

    /** End whatever session is running (leaving the level, closing the panel). */
    function stop() {
      token++;
      clearTimeout(endTimer);
      var c = convo;
      convo = null;
      if (c) c.endSession().catch(function () {});
    }

    return {
      AGENT_ID: HELPER_AGENT_ID, MAX_SECONDS: MAX_SECONDS,
      buildVars: buildVars, failReason: failReason, earlyDrop: earlyDrop,
      loadClient: loadClient, start: start, stop: stop,
      get active() { return !!convo; }
    };
  }

  return { HELPER_AGENT_ID: HELPER_AGENT_ID, MAX_SECONDS: MAX_SECONDS, SDK_PATH: SDK_PATH, buildVars: buildVars, failReason: failReason, earlyDrop: earlyDrop, browser: browser };
});
