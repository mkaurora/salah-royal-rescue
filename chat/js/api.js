/* Backend adapter: the ONLY file that knows how the chat server is reached (HTTP + WebSocket to the Cloudflare
 * Worker in server/). Swap this file to change backends; the rest of the app only uses these methods + events.
 *
 *   var api = FC.createApi({ base, store })            store: { get(k), set(k, v), del(k) } (localStorage)
 *   api.join(code, { name, avatar, color }, deviceKind) -> member   (keeps the device token; never keeps the code)
 *   api.me(), api.messages({ after }), api.sendText(text, kind, clientId), api.sendVoice(blob, dur, peaks, clientId)
 *   api.voiceUrl(id) -> object URL, api.read(upTo), api.pushSubscribe(sub), api.pushUnsubscribe(), api.leave()
 *   api.parent(pin).status() / rotate() / clear() / removeDevice(id)
 *   api.editMe({ name, avatar, color }); api.parent(pin).unlock() makes this phone an admin
 *   api.connect() -> realtime; api.on(event, fn): msg, read, member, presence, typing, cleared, revoked, conn
 */
(function (g) {
  'use strict';
  function ApiError(status, data) {
    this.status = status; this.data = data || {}; this.code = (data && data.error) || ('http_' + status);
    this.message = this.code;
  }
  ApiError.prototype = Object.create(Error.prototype);

  function createApi(o) {
    var base = o.base, store = o.store;
    var handlers = {};
    var ws = null, wsOk = false, pollTimer = null, retryTimer = null, retries = 0, stopped = true, lastId = 0;
    var voiceCache = {};

    function emit(ev, data) { (handlers[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); }
    function token() { return store.get('token'); }

    function req(method, path, opts) {
      opts = opts || {};
      var headers = opts.headers || {};
      if (opts.auth !== false) {
        if (!token()) return Promise.reject(new ApiError(401, { error: 'not_signed_in' }));
        headers.Authorization = 'Bearer ' + token();
      }
      var body = opts.body;
      if (body && !(body instanceof Blob) && typeof body !== 'string') { body = JSON.stringify(body); headers['Content-Type'] = 'application/json'; }
      return fetch(base + '/api' + path, { method: method, headers: headers, body: body, cache: 'no-store' })
        .catch(function () { throw new ApiError(0, { error: 'offline' }); })
        .then(function (res) {
          if (opts.raw && res.ok) return res;
          return res.text().then(function (t) {
            var data = {}; try { data = t ? JSON.parse(t) : {}; } catch (e) { data = { error: 'bad_response' }; }
            if (!res.ok) {
              var err = new ApiError(res.status, data);
              if (res.status === 401 && opts.auth !== false && data.error === 'not_signed_in') signedOut();
              throw err;
            }
            return data;
          });
        });
    }

    function signedOut() {
      if (!token()) return;
      ['token', 'memberId'].forEach(store.del);
      disconnect();
      emit('revoked');
    }

    // ---------- realtime ----------
    function wsUrl() { return base.replace(/^http/, 'ws') + '/api/ws'; }
    function connect() {
      stopped = false;
      if (ws || !token()) return;
      try { ws = new WebSocket(wsUrl(), ['fc', token()]); } catch (e) { ws = null; schedule(); return; }
      var sock = ws, pinger = null;
      sock.onopen = function () {
        wsOk = true; retries = 0; stopPolling(); emit('conn', true);
        pinger = setInterval(function () { try { sock.send('ping'); } catch (e) { /* closing */ } }, 25000);
        catchUp();
      };
      sock.onmessage = function (e) {
        if (e.data === 'pong') return;
        var m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.type === 'msg') { lastId = Math.max(lastId, m.msg.id); emit('msg', [m.msg]); }
        else emit(m.type, m);
      };
      sock.onclose = function (e) {
        clearInterval(pinger);
        if (ws === sock) ws = null;
        wsOk = false; emit('conn', false);
        if (e.code === 4001) { signedOut(); return; }
        if (!stopped) { startPolling(); schedule(); }
      };
      sock.onerror = function () { /* onclose follows */ };
    }
    function schedule() {
      clearTimeout(retryTimer);
      if (stopped) return;
      var ms = Math.min(30000, 1000 * Math.pow(2, retries++));
      retryTimer = setTimeout(function () {
        // A failed upgrade can't tell us why: ask /me (401 means this phone was removed).
        req('GET', '/me').then(function () { connect(); }).catch(function (e) { if (e.status !== 401) schedule(); });
      }, ms);
    }
    function startPolling() {
      if (pollTimer || stopped) return;
      pollTimer = setInterval(function () { if (!g.document || g.document.visibilityState !== 'hidden') catchUp(); }, 5000);
    }
    function stopPolling() { clearInterval(pollTimer); pollTimer = null; }
    function disconnect() {
      stopped = true; stopPolling(); clearTimeout(retryTimer);
      if (ws) { var s = ws; ws = null; try { s.close(1000); } catch (e) { /* closed */ } }
    }
    function catchUp() {
      return req('GET', '/messages?after=' + lastId).then(function (r) {
        if (r.messages.length) { lastId = Math.max(lastId, r.messages[r.messages.length - 1].id); emit('msg', r.messages); }
        emit('members', { members: r.members, epoch: r.epoch });
        return r;
      }).catch(function () { /* offline: try later */ });
    }

    return {
      ApiError: ApiError,
      on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
      signedIn: function () { return !!token(); },
      setLastId: function (id) { lastId = id || 0; },
      health: function () { return req('GET', '/health', { auth: false }); },
      join: function (code, profile, device) {
        return req('POST', '/join', { auth: false, body: { code: code, name: profile.name, avatar: profile.avatar, color: profile.color, device: device } }).then(function (r) {
          store.set('token', r.token); store.set('memberId', r.member.id);
          return r.member;
        });
      },
      me: function () { return req('GET', '/me'); },
      editMe: function (profile) { return req('POST', '/me', { body: profile }); },
      messages: function (q) {
        q = q || {};
        var s = q.before ? '?before=' + q.before : '?after=' + (q.after || 0);
        return req('GET', '/messages' + s);
      },
      catchUp: catchUp,
      sendText: function (text, kind, clientId) { return req('POST', '/messages', { body: { kind: kind || 'text', text: text, clientId: clientId } }); },
      sendVoice: function (blob, dur, peaks, clientId) {
        return req('POST', '/voice?clientId=' + encodeURIComponent(clientId || ''), {
          body: blob, headers: { 'Content-Type': (blob.type || 'audio/webm').split(';')[0], 'X-Voice-Duration': String(dur), 'X-Voice-Peaks': peaks.join(',') }
        });
      },
      voiceUrl: function (id) {
        if (!voiceCache[id]) {
          voiceCache[id] = req('GET', '/voice/' + encodeURIComponent(id), { raw: true })
            .then(function (res) { return res.blob(); }).then(function (b) { return URL.createObjectURL(b); })
            .catch(function (e) { delete voiceCache[id]; throw e; });
        }
        return voiceCache[id];
      },
      read: function (upTo) { return req('POST', '/read', { body: { upTo: upTo } }); },
      typing: function () { if (ws && wsOk) { try { ws.send(JSON.stringify({ type: 'typing' })); } catch (e) { /* closed */ } } },
      pushSubscribe: function (sub) { return req('POST', '/push', { body: { subscription: sub } }); },
      pushUnsubscribe: function () { return req('DELETE', '/push'); },
      leave: function () {
        return req('POST', '/leave').catch(function () {}).then(function () { ['token', 'memberId'].forEach(store.del); disconnect(); });
      },
      parent: function (pin) {
        var h = function () { return { 'X-Parent-Pin': pin }; };
        return {
          unlock: function () { return req('POST', '/parent/unlock', { headers: h() }); },
          status: function () { return req('GET', '/parent/status', { headers: h() }); },
          showCode: function () { return req('GET', '/parent/code', { headers: h() }); },
          rotate: function () { return req('POST', '/parent/rotate', { headers: h() }); },
          clear: function () { return req('POST', '/parent/clear', { headers: h() }); },
          removeDevice: function (id) { return req('DELETE', '/parent/devices/' + encodeURIComponent(id), { headers: h() }); }
        };
      },
      connect: connect,
      disconnect: disconnect,
      isLive: function () { return wsOk; }
    };
  }
  g.FC = g.FC || {};
  g.FC.createApi = createApi;
})(typeof self !== 'undefined' ? self : this);
