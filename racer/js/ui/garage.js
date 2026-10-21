/* Garage: a car preview on a spot-lit turntable (sways through the steering poses and bounces) plus the shop —
 * Upgrades (5 tiers, before/after bars, rising prices), Paint, Decals and Bodies (buy once, equip free).
 * Browser only: RR.garageUI.open(). */
(function (root) {
  'use strict';
  var RR = root.RR, ui = RR.ui, h = ui.h, GA = RR.garage, PR = RR.progress, A = RR.audio, P = RR.paint;
  function app() { return RR.app; }

  function miniCar(look, w, hgt) {
    var c = P.canvas(w * 2, hgt * 2), ctx = c.getContext('2d');
    var spr = RR.cars.player(look, 60)[2];
    var s = Math.min(c.width / spr.img.width, c.height / spr.img.height);
    ctx.drawImage(spr.img, (c.width - spr.img.width * s) / 2, c.height - spr.img.height * s, spr.img.width * s, spr.img.height * s);
    return c;
  }

  function open() {
    var st = app().state, tab = 'up';
    var coins = h('b', String(st.coins));
    var list = h('div.shop-list');
    var cv = h('canvas'), name = h('div.name');
    var tabs = {};
    var tabRow = h('div.tabs');
    [['up', '🚀 Upgrades'], ['paint', '🎨 Paint'], ['decal', '✨ Decals'], ['body', '🏎️ Cars']].forEach(function (t) {
      tabs[t[0]] = ui.btn('white small', t[1], function () { tab = t[0]; render(); });
      tabRow.appendChild(tabs[t[0]]);
    });
    var scr = h('div.screen.garage-scr',
      h('div.topbar',
        ui.btn('white round', '◀', function () { ui.wipe(function () { app().goto('map'); }); }, { sound: 'back', label: 'Back' }),
        h('div.title', '🔧 Garage'),
        h('div.pill', ui.coin(), coins)),
      h('div.garage-body',
        h('div.preview', cv, name),
        h('div.shop', tabRow, list)));

    function refreshCoins() { coins.textContent = String(st.coins); }
    function noCoins(price) { A.sfx('locked'); ui.toast('You need ' + (price - st.coins) + ' more coins. Race to get more! 🪙'); }

    function render() {
      for (var k in tabs) tabs[k].classList.toggle('on', k === tab);
      list.innerHTML = '';
      refreshCoins();
      var look = app().carLook();
      name.textContent = (GA.find('body', st.body) || GA.BODIES[0]).name + ' · ' + (GA.find('paint', st.paint) || GA.PAINTS[0]).name;
      if (tab === 'up') {
        GA.UPGRADES.forEach(function (u) {
          var lv = st.upgrades[u.id], price = GA.price(lv), pips = h('div.pips');
          for (var i = 0; i < GA.TIERS; i++) pips.appendChild(h('i' + (i < lv ? '.on' : i === lv && price !== null ? '.next' : '')));
          var buy = price === null ? h('div.pill', { style: { background: '#2ecc71' } }, 'MAX ⭐') :
            ui.btn((st.coins >= price ? 'green' : 'white') + ' small', '<span class="coin-icon"></span> ' + price, function () {
              var r = PR.buyUpgrade(st, u.id);
              if (!r.ok) { if (r.reason === 'coins') noCoins(r.price); return; }
              app().persist(); A.sfx('buy'); ui.toast(u.icon + ' ' + u.name + ' level ' + r.level + '!'); bounce = 1; render();
            }, { sound: false, label: 'Buy ' + u.name });
          list.appendChild(h('div.upg', h('span.ic', u.icon), h('div', h('div.nm', u.name + ' ' + lv + '/' + GA.TIERS), h('div.tx', u.text), pips), buy));
        });
      } else {
        var kind = tab, items = GA.KINDS[kind], grid = h('div.swatches');
        items.forEach(function (it) {
          var owned = PR.owns(st, kind, it.id), on = st[kind] === it.id;
          var sw = h('button.sw' + (on ? '.on' : '') + (!owned && st.coins < it.price ? '.locked' : ''), { type: 'button', 'aria-label': it.name });
          if (kind === 'paint') {
            sw.appendChild(h('span.chip', { style: { background: it.shiny ? 'linear-gradient(135deg,#fff3a0,' + it.color + ',#8a6a10)' : it.color } }));
          } else {
            var l2 = { color: look.color, shiny: look.shiny, decal: kind === 'decal' ? it.id : look.decal, body: kind === 'body' ? it.id : look.body };
            sw.appendChild(miniCar(l2, 76, 52));
          }
          sw.appendChild(h('span', it.name));
          sw.appendChild(h('span.price', owned ? (on ? '✓ On' : 'Owned') : [ui.coin(), ' ' + it.price]));
          sw.addEventListener('click', function () {
            var r = PR.buyItem(st, kind, it.id);
            if (!r.ok) { if (r.reason === 'coins') noCoins(r.price); return; }
            app().persist(); A.sfx(owned ? 'tap' : 'buy');
            if (!owned) ui.toast('✨ New ' + (kind === 'body' ? 'car' : kind) + ': ' + it.name + '!');
            bounce = 1; render();
          });
          grid.appendChild(sw);
        });
        list.appendChild(grid);
      }
      poses = RR.cars.player(look, 110);
    }

    // turntable preview
    var poses = null, t = 0, bounce = 0, last = 0;
    function draw(now) {
      if (!scr.isConnected) return;
      requestAnimationFrame(draw);
      var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
      t += dt; bounce = Math.max(0, bounce - dt * 2);
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      var W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
      if (!W || !H) return;
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, base = H * 0.78;
      // podium + spotlight
      ctx.fillStyle = P.rad(ctx, cx, H * 0.1, 0, H * 0.9, [[0, 'rgba(255,250,220,0.32)'], [1, 'rgba(255,250,220,0)']]);
      ctx.beginPath(); ctx.moveTo(cx - W * 0.08, 0); ctx.lineTo(cx + W * 0.08, 0); ctx.lineTo(cx + W * 0.42, base); ctx.lineTo(cx - W * 0.42, base); ctx.fill();
      P.ellipse(ctx, cx, base + H * 0.02, W * 0.4, H * 0.08, '#2a2070');
      P.ellipse(ctx, cx, base, W * 0.4, H * 0.08, '#4a3fc0');
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 3 * dpr; P.ellipse(ctx, cx, base, W * 0.4, H * 0.08); ctx.stroke();
      for (var k = 0; k < 12; k++) {
        var a = t * 0.8 + k * Math.PI / 6;
        P.circle(ctx, cx + Math.cos(a) * W * 0.36, base + Math.sin(a) * H * 0.065, 3 * dpr, Math.sin(a) > 0 ? 'rgba(255,230,120,0.9)' : 'rgba(255,230,120,0.35)');
      }
      if (!poses) return;
      var sway = Math.sin(t * 1.1), idx = Math.max(0, Math.min(4, Math.round((sway + 1) * 2)));
      var spr = poses[idx], s = Math.min(W * 0.78 / spr.img.width, H * 0.62 / spr.img.height);
      var hop = Math.abs(Math.sin(bounce * Math.PI * 2)) * bounce * H * 0.12 + Math.sin(t * 3) * H * 0.006;
      P.ellipse(ctx, cx, base, spr.img.width * s * 0.42, H * 0.035, 'rgba(0,0,0,0.4)');
      ctx.save();
      ctx.translate(cx, base - hop); ctx.rotate(-sway * 0.03);
      ctx.drawImage(spr.img, -spr.img.width * s / 2, -spr.img.height * s * 0.98, spr.img.width * s, spr.img.height * s);
      ctx.restore();
    }
    render();
    requestAnimationFrame(draw);
    return scr;
  }

  RR.garageUI = { open: open };
})(window);
