/* Avatar creator (new save, parts only) and Wardrobe (parts + 6 outfit slots): live animated preview, category tabs, try-on,
 * buy with coins / gems, lock reasons, equip, save. SI.wardrobeUI. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on, P = SI.progress, WD = SI.wardrobe;
  var TAU = Math.PI * 2;
  var TABS = [['body', 'Body', 'part'], ['color', 'Colour', 'part'], ['eyes', 'Eyes', 'part'], ['mouth', 'Mouth', 'part'], ['head', 'Head', 'part'],
    ['hat', 'Hats', 'slot'], ['glasses', 'Glasses', 'slot'], ['top', 'Outfits', 'slot'], ['back', 'Capes', 'slot'], ['shoes', 'Shoes', 'slot'], ['held', 'Hold', 'slot']];
  var lastTab = '', host, cv, g, mode = 'wardrobe', tab = 'hat', tryOn = null, raf = 0, running = false, last = 0, t = 0, W = 390, Hh = 300, hud = {}, bounceT = 0, spin = 0;

  function build() {
    host = document.getElementById('scr-wardrobe'); host.innerHTML = '';
    var stage = el('div', 'wstage'); host.appendChild(stage);
    cv = el('canvas', 'wcv'); stage.appendChild(cv); g = cv.getContext('2d');
    hud.top = el('div', 'topbar slim'); host.appendChild(hud.top);
    hud.name = el('div', 'itemname'); stage.appendChild(hud.name);
    hud.tabs = el('div', 'wtabs'); host.appendChild(hud.tabs);
    hud.grid = el('div', 'wgrid'); host.appendChild(hud.grid);
    hud.bar = el('div', 'wbar'); host.appendChild(hud.bar);
    root.addEventListener('resize', size);
  }
  function size() {
    if (!cv || host.classList.contains('hidden')) return;
    var r = cv.parentNode.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1); W = r.width; Hh = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr); cv.style.width = W + 'px'; cv.style.height = Hh + 'px';
  }
  function working() {   // the avatar shown in the preview: the saved one + the item being tried on
    var S = A.S, av = JSON.parse(JSON.stringify(S.avatar));
    if (tryOn) { if (tryOn.kind === 'part') av[tryOn.type] = tryOn.key; else av.equip[tryOn.type] = tryOn.id; }
    return av;
  }
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame); var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; if (document.hidden) return;
    var dpr = Math.min(2, root.devicePixelRatio || 1); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, Hh);
    // spotlight
    var gr = g.createRadialGradient(W / 2, Hh * 0.55, 10, W / 2, Hh * 0.55, Hh * 0.75); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(W / 2, Hh * 0.88, 110, 20, 0, 0, TAU); g.fill();
    bounceT = Math.max(0, bounceT - dt); var jump = bounceT > 0 ? Math.sin((1 - bounceT / 0.45) * Math.PI) * 26 : 0;
    var s = Math.min(2.5, Hh / 175);
    SI.avatar.draw(g, working(), { x: W / 2, y: Hh * 0.88 - jump, s: s, t: t, dir: 1 });
  }

  function partList(kind) { return WD.PARTS[kind]; }
  function render() {
    var S = A.S, creator = mode === 'creator';
    // top bar
    hud.top.innerHTML = '';
    if (!creator) { var bk = el('button', 'hbtn back', ui.icon('back')); bk.setAttribute('aria-label', 'Back'); on(bk, function () { done(); }); hud.top.appendChild(bk); }
    hud.top.appendChild(el('div', 'ttitle', creator ? 'Make your monster' : 'Wardrobe'));
    hud.top.appendChild(el('div', 'chips', ui.chip('coin', S.coins) + ui.chip('gem', S.gems)));
    // tabs
    hud.tabs.innerHTML = ''; var tabs = TABS.filter(function (x) { return !creator || x[2] === 'part'; });
    tabs.forEach(function (x) { var b = el('button', 'wtab' + (x[0] === tab ? ' on' : ''), x[1]); on(b, function () { tab = x[0]; tryOn = null; render(); }); hud.tabs.appendChild(b); });
    var onEl = hud.tabs.querySelector('.on'); if (onEl && onEl.scrollIntoView) { hud.tabs.scrollLeft = Math.max(0, onEl.offsetLeft - 60); }
    // grid
    hud.grid.innerHTML = ''; if (tab !== lastTab) { hud.grid.scrollTop = 0; lastTab = tab; } var isPart = TABS.filter(function (x) { return x[0] === tab; })[0][2] === 'part';
    if (isPart) {
      partList(tab).forEach(function (p) {
        var cur = S.avatar[tab] === p.key, owned = P.partOwned(S, tab, p.key), sel = tryOn && tryOn.kind === 'part' && tryOn.type === tab && tryOn.key === p.key;
        var c = el('button', 'wcard' + (cur && !tryOn ? ' cur' : '') + (sel ? ' sel' : '') + (owned ? '' : ' unowned'));
        var th = el('div', 'wthumb'); if (tab === 'color') { th.innerHTML = '<i class="sw" style="background:' + p.hex + '"></i>'; } else th.appendChild(partThumb(tab, p.key)); c.appendChild(th);
        c.appendChild(el('b', null, ui.esc(p.name)));
        c.appendChild(el('small', owned ? 'own' : 'price', owned ? (cur && !tryOn ? '✔ Using' : 'Free') : ui.icon('coin') + p.cost));
        on(c, function () {
          if (owned) { P.setPart(S, tab, p.key); tryOn = null; SI.audio.play('pop'); A.persist(); bounceT = 0.45; } else { tryOn = { kind: 'part', type: tab, key: p.key, id: p.id, part: p }; SI.audio.play('pop'); bounceT = 0.45; }
          render();
        });
        hud.grid.appendChild(c);
      });
    } else {
      // "none" card
      var none = el('button', 'wcard none' + (!S.avatar.equip[tab] && !tryOn ? ' cur' : ''), '<div class="wthumb"><span class="nn">∅</span></div><b>None</b><small class="own">' + (!S.avatar.equip[tab] ? '✔ Using' : 'Take off') + '</small>');
      on(none, function () { P.unequip(S, tab); tryOn = null; A.persist(); render(); }); hud.grid.appendChild(none);
      WD.bySlot[tab].forEach(function (it) {
        var st = P.itemStatus(S, it.id), cur = S.avatar.equip[tab] === it.id, sel = tryOn && tryOn.id === it.id;
        var c = el('button', 'wcard' + (cur && !tryOn ? ' cur' : '') + (sel ? ' sel' : '') + (st.owned ? '' : (st.reason === 'locked' ? ' locked' : ' unowned')));
        var th = el('div', 'wthumb'); th.appendChild(SI.avatar.thumb(S.avatar, tab, it.id, 64)); if (st.reason === 'locked') th.appendChild(el('span', 'lockbadge', ui.icon('lock'))); c.appendChild(th);
        c.appendChild(el('b', null, ui.esc(it.name)));
        var sub = st.owned ? (cur ? '✔ Using' : 'Owned') : st.reason === 'locked' ? '🔒 Locked' : (it.cost ? ui.icon('coin') + it.cost : '') + (it.gems ? ' ' + ui.icon('gem') + it.gems : '');
        c.appendChild(el('small', st.owned ? 'own' : 'price', sub));
        on(c, function () {
          if (st.owned) { if (cur) P.unequip(S, tab); else P.equip(S, it.id); tryOn = null; SI.audio.play('pop'); A.persist(); bounceT = 0.45; }
          else { tryOn = { kind: 'slot', type: tab, id: it.id }; SI.audio.play('pop'); bounceT = 0.45; }
          render();
        });
        hud.grid.appendChild(c);
      });
    }
    bar();
  }
  function partThumb(kind, key) {
    var dpr = Math.min(2, root.devicePixelRatio || 1), c = document.createElement('canvas'), px = 64; c.width = c.height = px * dpr;
    var gg = c.getContext('2d'), av = JSON.parse(JSON.stringify(A.S.avatar)); av[kind] = key; av.equip = { hat: null, glasses: null, top: null, back: null, shoes: null, held: null };
    var sc = kind === 'body' ? 0.52 : 0.8, cy = kind === 'body' ? 0.9 : 1.22; gg.translate(px * dpr / 2, px * dpr * (kind === 'body' ? 0.9 : 1.25)); gg.scale(dpr, dpr);
    SI.avatar.draw(gg, av, { x: 0, y: 0, s: sc, t: 0, blink: false, noShadow: true });
    return c;
  }
  function bar() {
    var S = A.S, creator = mode === 'creator'; hud.bar.innerHTML = ''; hud.name.textContent = '';
    if (tryOn) {
      var name, cost = 0, gems = 0, st;
      if (tryOn.kind === 'part') { name = tryOn.part.name; cost = tryOn.part.cost; st = { canBuy: S.coins >= cost, reason: S.coins >= cost ? 'ok' : 'coins', text: 'Need ' + (cost - S.coins) + ' more coins' }; }
      else { var it = WD.byId[tryOn.id]; name = it.name; cost = it.cost; gems = it.gems; st = P.itemStatus(S, it.id); }
      hud.name.textContent = 'Trying: ' + name;
      var info = el('div', 'binfo');
      if (st.reason === 'locked') { info.innerHTML = '<b>' + ui.esc(name) + '</b><span>' + ui.esc(st.text) + '</span>'; hud.bar.appendChild(info); }
      else {
        info.innerHTML = '<b>' + ui.esc(name) + '</b><span>' + (st.canBuy ? 'Ready to buy!' : ui.esc(st.text || '')) + '</span>'; hud.bar.appendChild(info);
        var buy = el('button', 'btn big ' + (st.canBuy ? 'green' : 'grey'), 'Buy ' + (cost ? ui.icon('coin') + cost : '') + (gems ? ' ' + ui.icon('gem') + gems : '')); hud.bar.appendChild(buy);
        on(buy, function () {
          if (!st.canBuy) { SI.audio.play('nope'); ui.toast(st.text || 'Not enough yet'); buy.classList.remove('shake'); void buy.offsetWidth; buy.classList.add('shake'); return; }
          var r = tryOn.kind === 'part' ? P.buyPart(S, tryOn.type, tryOn.key) : P.buyItem(S, tryOn.id);
          if (!r.ok) { ui.toast('Not done'); return; }
          if (tryOn.kind === 'part') P.setPart(S, tryOn.type, tryOn.key); else P.equip(S, tryOn.id);
          SI.audio.play('buy'); A.persist(); tryOn = null; bounceT = 0.45; ui.toast('Bought! ✨'); render();
        });
      }
      var cancel = el('button', 'btn small grey', 'Cancel'); on(cancel, function () { tryOn = null; render(); }); hud.bar.appendChild(cancel);
    } else {
      var ok = el('button', 'btn big green wide', creator ? 'That\'s me! ✓' : 'Save ✓'); hud.bar.appendChild(ok); on(ok, done);
    }
  }
  function done() {
    tryOn = null; A.S.seen.avatar = true; A.persist();
    ui.go('home');
    if (mode === 'creator') setTimeout(function () { ui.toast('Welcome, ' + A.S.name + '! ✨', 2000); }, 400);
  }

  ui.register('wardrobe', {
    enter: function (args) { if (!host) build(); mode = 'wardrobe'; tab = 'hat'; tryOn = null; render(); size(); setTimeout(size, 30); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    leave: function () { running = false; cancelAnimationFrame(raf); }
  });
  ui.register('creator', {
    host: 'wardrobe',
    enter: function () { if (!host) build(); mode = 'creator'; tab = 'body'; tryOn = null; render(); size(); setTimeout(size, 30); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    leave: function () { running = false; cancelAnimationFrame(raf); }
  });
  SI.wardrobeUI = { tab: function (x) { tab = x; render(); }, tryOn: function (o) { tryOn = o; render(); }, render: render };
})(typeof self !== 'undefined' ? self : this);
