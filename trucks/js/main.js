/* Boot: load the save, wire the shared state, create the updater, show the Workshop. */
(function (root) {
  'use strict';
  var TW = root.TW, UI = TW.ui, A = TW.app, P = TW.progress;

  A.S = P.load(root.localStorage);
  A.persist = function () { P.save(root.localStorage, A.S); };
  A.refresh = function () { TW.home.refresh(); };

  function fit() {
    var w = root.innerWidth, h = root.innerHeight, app = document.getElementById('app');
    var aw = Math.min(w, h * 0.62, 520), u = Math.min(aw / 390, h / 780);
    document.documentElement.style.setProperty('--u', u.toFixed(4));
    app.style.width = aw + 'px'; app.style.height = h + 'px';
  }
  fit(); root.addEventListener('resize', fit); root.addEventListener('orientationchange', fit);

  TW.audio.setSound(A.S.settings.sound); TW.audio.setMusic(A.S.settings.music);

  // service-worker updates (sw.js is built by tools/build-sw.js)
  A.updater = TW.createUpdater({
    navigator: root.navigator, document: document, reload: function () { root.location.reload(); },
    beforeReload: function () { A.persist(); try { root.localStorage.setItem('truckworkshop-updated', '1'); } catch (e) { /* ignore */ } },
    onBanner: function (show) {
      var b = document.getElementById('banner'); if (!show) { b.classList.add('hidden'); return; }
      b.textContent = TW.UPDATE_MSG.banner; b.classList.remove('hidden');
      b.onclick = function () {
        if (TW.play.state().active) { UI.toast('Finish your level first!'); return; }
        A.updater.applyUpdate();
      };
    }
  });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) A.updater.register('./sw.js');

  TW.home.init(); TW.home.show();
  try {
    if (root.localStorage.getItem('truckworkshop-updated')) {
      root.localStorage.removeItem('truckworkshop-updated');
      setTimeout(function () { UI.toast(TW.UPDATE_MSG.updated.replace('{v}', root.TW_VERSION.version)); }, 600);
    }
  } catch (e) { /* ignore */ }
  document.addEventListener('visibilitychange', function () { if (document.hidden) { TW.audio.pause(); A.persist(); } else TW.audio.resume(); });
  root.addEventListener('pagehide', function () { A.persist(); });

  if (/[?&]test=1/.test(location.search)) {
    var s = document.createElement('script'); s.src = './js/dev/test-hook.js'; document.body.appendChild(s);
  }
})(typeof self !== 'undefined' ? self : this);
