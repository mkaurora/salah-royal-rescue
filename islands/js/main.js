/* Boot: load the save, wire shared state, audio, updater; show intro / creator / home. */
(function (root) {
  'use strict';
  var SI = root.SI, ui = SI.ui, A = SI.app, P = SI.progress;

  A.S = P.load(root.localStorage);
  A.test = /[?&]test=1/.test(root.location.search);
  A.persist = function () { P.save(root.localStorage, A.S); };

  function fit() {
    var w = root.innerWidth, h = root.innerHeight, app = document.getElementById('app');
    var aw = Math.min(w, 520), u = aw / 390;
    document.documentElement.style.setProperty('--u', u.toFixed(4));
    app.style.width = aw + 'px'; app.style.height = h + 'px';
  }
  fit(); root.addEventListener('resize', fit); root.addEventListener('orientationchange', function () { setTimeout(fit, 150); });

  SI.audio.setSound(A.S.settings.sound); SI.audio.setMusic(A.S.settings.music);

  // service-worker updates (sw.js is built by tools/build-sw.js)
  A.updater = SI.createUpdater({
    navigator: root.navigator, document: document, reload: function () { root.location.reload(); },
    beforeReload: function () { A.persist(); try { root.localStorage.setItem('salahislands-updated', '1'); } catch (e) { /* ignore */ } },
    onBanner: function (show) {
      var b = document.getElementById('banner'); if (!show) { b.classList.add('hidden'); return; }
      b.textContent = SI.UPDATE_MSG.banner; b.classList.remove('hidden');
      b.onclick = function () {
        var busy = (SI.mgcore && SI.mgcore.current && SI.mgcore.current()) || !document.getElementById('mg').classList.contains('hidden') || !document.getElementById('bm').classList.contains('hidden');
        if (busy || (ui.current() === 'world' && ui.popupOpen())) { ui.toast('Finish this first!'); return; }
        A.updater.applyUpdate();
      };
    }
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(root.location.protocol)) A.updater.register('./sw.js');

  // first screen
  SI.quests.advance(A.S);
  if (!A.S.seen.intro) ui.go('intro');
  else if (!A.S.seen.avatar) ui.go('creator');
  else ui.go('home');

  try {
    if (root.localStorage.getItem('salahislands-updated')) {
      root.localStorage.removeItem('salahislands-updated');
      setTimeout(function () { ui.toast(SI.UPDATE_MSG.updated.replace('{v}', root.SI_VERSION.version)); }, 600);
    }
  } catch (e) { /* ignore */ }

  function saveAll() { if (ui.current() === 'world' && SI.world) SI.world.savePos(); else A.persist(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { SI.audio.pause(); saveAll(); } else SI.audio.resume(); });
  root.addEventListener('pagehide', saveAll);
  setInterval(saveAll, 20000);

  if (A.test) { var s = document.createElement('script'); s.src = './js/dev/test-hook.js'; document.body.appendChild(s); }
})(typeof self !== 'undefined' ? self : this);
