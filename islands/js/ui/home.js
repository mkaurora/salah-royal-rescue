/* Intro (Pip says hello), Home screen (avatar scene, Welcome, hanger, Islands card, Quests & Book card, progress). SI.home. */
(function (root) {
  'use strict';
  var SI = root.SI = root.SI || {}, A = SI.app, ui = SI.ui, el = ui.el, on = ui.on, P = SI.progress, SP = SI.sprites, ISL = SI.islands;
  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ intro */
  var CARDS = [
    { lines: ['Hi Salah! I\'m Pip, a little sea-turtle.', 'Welcome to the Islands!'], pic: 'pip' },
    { lines: ['There are six islands to explore, with games, secrets and friends to help.', 'Find shells, fix bridges and build your very own place!'], pic: 'pip' },
    { lines: ['First, let\'s make your monster! Pick a body, colours and a funny face.'], pic: 'pip' }
  ];
  var intro = {
    enter: function () {
      var host = document.getElementById('scr-intro'), i = 0; host.innerHTML = '';
      var bg = el('canvas', 'introbg'); host.appendChild(bg); drawSea(bg);
      var card = el('div', 'introcard'); host.appendChild(card);
      function show() {
        var c = CARDS[i]; card.innerHTML = ''; var pt = el('div', 'ipic'); var cv = document.createElement('canvas'); cv.width = 240; cv.height = 240; cv.getContext('2d').drawImage(SP.npc(c.pic, 2.5).c, 0, 0, 240, 240); pt.appendChild(cv); card.appendChild(pt);
        c.lines.forEach(function (l) { card.appendChild(el('p', null, ui.esc(l))); });
        var dots = el('div', 'idots'); CARDS.forEach(function (_, k) { dots.appendChild(el('i', k === i ? 'on' : '')); }); card.appendChild(dots);
        var b = el('button', 'btn big green', i === CARDS.length - 1 ? 'Make my monster!' : 'Next'); card.appendChild(b);
        on(b, function () { if (i < CARDS.length - 1) { i++; show(); } else { A.S.seen.intro = true; A.persist(); ui.go('creator'); } });
        card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop');
      }
      show();
    }
  };
  function drawSea(cv) {
    var w = 390, h = 844, dpr = Math.min(2, root.devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; var g = cv.getContext('2d'); g.scale(dpr, dpr);
    var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8fe0ff'); gr.addColorStop(0.55, '#4fc3e8'); gr.addColorStop(1, '#2a8fd0'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.35)'; for (var i = 0; i < 18; i++) { g.beginPath(); g.ellipse((i * 97) % w, 380 + (i * 53) % 460, 26, 5, 0, 0, TAU); g.fill(); }
    g.fillStyle = '#fff6c9'; g.beginPath(); g.arc(300, 110, 46, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; [[80, 140, 40], [140, 120, 30], [60, 110, 28], [330, 240, 30], [290, 250, 24]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, TAU); g.fill(); });
  }

  /* ------------------------------------------------------------------ scenes (drawn once, cached) */
  var sceneCache = {};
  function homeScene(w, h) {
    var key = w + 'x' + h; if (sceneCache[key]) return sceneCache[key];
    var dpr = Math.min(2, root.devicePixelRatio || 1), c = document.createElement('canvas'); c.width = w * dpr; c.height = h * dpr; var g = c.getContext('2d'); g.scale(dpr, dpr);
    var hor = h * 0.5;
    var gr = g.createLinearGradient(0, 0, 0, hor); gr.addColorStop(0, '#7fd8ff'); gr.addColorStop(1, '#d9f6ff'); g.fillStyle = gr; g.fillRect(0, 0, w, hor);
    // sea band
    var sg = g.createLinearGradient(0, hor - 30, 0, hor + 20); sg.addColorStop(0, '#4fc3e8'); sg.addColorStop(1, '#7ad7f0'); g.fillStyle = sg; g.fillRect(0, hor - 30, w, 54);
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; for (var i = 0; i < 10; i++) { g.beginPath(); var wx = 20 + i * 41, wy = hor - 20 + (i % 3) * 9; g.moveTo(wx, wy); g.quadraticCurveTo(wx + 8, wy - 4, wx + 16, wy); g.stroke(); }
    // far island
    g.fillStyle = '#7ec97a'; g.beginPath(); g.ellipse(w * 0.84, hor - 26, 54, 17, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#5fb066'; g.beginPath(); g.ellipse(w * 0.84 + 12, hor - 26, 28, 12, 0, Math.PI, TAU); g.fill();
    // sand + grass ground
    var sand = g.createLinearGradient(0, hor, 0, h); sand.addColorStop(0, '#f6e4a8'); sand.addColorStop(1, '#e9cf86'); g.fillStyle = sand; g.beginPath(); g.moveTo(0, hor + 8); g.quadraticCurveTo(w * 0.5, hor - 6, w, hor + 8); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.fillStyle = '#9ad66b'; g.beginPath(); g.moveTo(0, hor + 80); g.quadraticCurveTo(w * 0.3, hor + 58, w * 0.55, hor + 76); g.quadraticCurveTo(w * 0.8, hor + 96, w, hor + 70); g.lineTo(w, h); g.lineTo(0, h); g.fill();
    g.strokeStyle = '#7fc254'; g.lineWidth = 2; for (i = 0; i < 40; i++) { var gx = (i * 71) % w, gy = hor + 100 + (i * 37) % (h - hor - 100); g.beginPath(); g.moveTo(gx - 3, gy); g.lineTo(gx - 1, gy - 6); g.moveTo(gx, gy); g.lineTo(gx, gy - 8); g.moveTo(gx + 3, gy); g.lineTo(gx + 1, gy - 6); g.stroke(); }
    // stepping stones path
    g.fillStyle = '#fff0cc'; [[0.5, 0.74], [0.46, 0.8], [0.54, 0.86], [0.5, 0.93]].forEach(function (p) { g.beginPath(); g.ellipse(p[0] * w, p[1] * h, 24, 9, 0, 0, TAU); g.fill(); });
    // beach hut (left)
    var hx = w * 0.17, hy = hor + 70; g.fillStyle = 'rgba(30,20,60,0.18)'; g.beginPath(); g.ellipse(hx, hy + 6, 52, 11, 0, 0, TAU); g.fill();
    g.fillStyle = '#f3c98a'; g.strokeStyle = '#9a6a3e'; g.lineWidth = 3; g.beginPath(); g.rect(hx - 38, hy - 52, 76, 56); g.fill(); g.stroke();
    g.strokeStyle = 'rgba(154,106,62,0.5)'; g.lineWidth = 1.6; for (i = 1; i < 5; i++) { g.beginPath(); g.moveTo(hx - 38 + i * 15, hy - 52); g.lineTo(hx - 38 + i * 15, hy + 4); g.stroke(); }
    g.fillStyle = '#e8434f'; g.strokeStyle = '#8a1f2a'; g.lineWidth = 3; g.beginPath(); g.moveTo(hx - 50, hy - 50); g.lineTo(hx, hy - 88); g.lineTo(hx + 50, hy - 50); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#9a6a3e'; g.beginPath(); g.roundRect ? g.roundRect(hx - 11, hy - 30, 22, 34, 4) : g.rect(hx - 11, hy - 30, 22, 34); g.fill(); g.fillStyle = '#bfe6ff'; g.fillRect(hx + 18 - 2, hy - 42, 14, 12);
    // palms + rocks + flowers
    var pa = SP.prop('beach', 'T', 1, dpr * 1.6); g.drawImage(pa.c, w * 0.88 - 84 * 0.8, hor + 120 - 102 * 0.8 * 1.0 - 0, 84 * 1.6 * 0.5 * 1.0, 112 * 1.6 * 0.5);
    var pb = SP.prop('beach', 'T', 2, dpr * 1.6); g.drawImage(pb.c, w * 0.04, hor + 30 - 20, 84 * 0.8, 112 * 0.8);
    var rk = SP.prop('beach', 'R', 1, dpr * 1.6); g.drawImage(rk.c, w * 0.8, hor + 130, 84 * 0.6, 112 * 0.6);
    [[0.3, 0.7, '#ff7a9a'], [0.72, 0.68, '#ffd23f'], [0.25, 0.85, '#fff'], [0.78, 0.82, '#ff9ad0'], [0.62, 0.9, '#ffb23c']].forEach(function (f) {
      var fx = f[0] * w, fy = f[1] * h; g.strokeStyle = '#3f9a2e'; g.lineWidth = 2; g.beginPath(); g.moveTo(fx, fy + 8); g.lineTo(fx, fy); g.stroke(); g.fillStyle = f[2]; for (var k = 0; k < 5; k++) { g.beginPath(); g.arc(fx + Math.cos(k * 1.2566) * 4, fy + Math.sin(k * 1.2566) * 4, 3.2, 0, TAU); g.fill(); } g.fillStyle = '#ffe45c'; g.beginPath(); g.arc(fx, fy, 2.4, 0, TAU); g.fill();
    });
    return (sceneCache[key] = { c: c, w: w, h: h });
  }

  function islandsCard(cv, w, h) {
    var dpr = Math.min(2, root.devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; var g = cv.getContext('2d'); g.scale(dpr, dpr);
    var gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#6fd6ff'); gr.addColorStop(0.6, '#3fb4e8'); gr.addColorStop(1, '#2a7fcf'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(w * 0.82, h * 0.25, 26, 0, TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; [[0.15, 0.2, 20], [0.22, 0.18, 15], [0.5, 0.12, 16], [0.56, 0.14, 12]].forEach(function (c) { g.beginPath(); g.arc(c[0] * w, c[1] * h, c[2], 0, TAU); g.fill(); });
    g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; for (var i = 0; i < 9; i++) { var x = (i * 53) % w, y = h * 0.62 + (i * 17) % (h * 0.35); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 8, y - 4, x + 16, y); g.stroke(); }
    // island
    var ix = w * 0.62, iy = h * 0.78; g.fillStyle = 'rgba(20,60,120,0.25)'; g.beginPath(); g.ellipse(ix, iy + 8, 116, 20, 0, 0, TAU); g.fill();
    g.fillStyle = '#f2dc9b'; g.beginPath(); g.ellipse(ix, iy, 112, 22, 0, 0, TAU); g.fill(); g.fillStyle = '#9ad66b'; g.beginPath(); g.ellipse(ix, iy - 6, 92, 16, 0, 0, TAU); g.fill();
    var q = dpr * 1.2; var pm = SP.prop('beach', 'T', 1, q); g.drawImage(pm.c, ix - 70, iy - 106, 84 * 1.05, 112 * 1.05); var pm2 = SP.prop('beach', 'T', 0, q); g.drawImage(pm2.c, ix + 20, iy - 92, 84 * 0.85, 112 * 0.85);
    var pip = SP.npc('pip', q); g.drawImage(pip.c, ix - 24, iy - 76, 96 * 0.8, 96 * 0.8);
    var bt = SP.boat(q); g.drawImage(bt.c, w * 0.02, h * 0.34, 86 * 0.9, 70 * 0.9);
    // title
    g.font = '900 34px system-ui,sans-serif'; g.textAlign = 'left'; g.lineJoin = 'round'; g.lineWidth = 7; g.strokeStyle = '#2d1b52'; g.strokeText('Islands', 18, h - 38); g.fillStyle = '#ffe45c'; g.fillText('Islands', 18, h - 38);
    g.font = '800 14px system-ui,sans-serif'; g.lineWidth = 4; g.strokeText('Explore, play, build!', 20, h - 16); g.fillStyle = '#fff'; g.fillText('Explore, play, build!', 20, h - 16);
  }
  function questsCard(cv, w, h) {
    var dpr = Math.min(2, root.devicePixelRatio || 1); cv.width = w * dpr; cv.height = h * dpr; var g = cv.getContext('2d'); g.scale(dpr, dpr);
    var gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#5a2fb8'); gr.addColorStop(1, '#8d3fd8'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (var i = 0; i < 7; i++) { g.beginPath(); g.arc(30 + i * 60, 20 + (i % 3) * 34, 22, 0, TAU); g.fill(); }
    // open book
    var bx = w * 0.7, by = h * 0.72; g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(bx, by + 16, 80, 12, 0, 0, TAU); g.fill();
    g.fillStyle = '#7a4adc'; g.strokeStyle = '#2d1b52'; g.lineWidth = 3; g.beginPath(); g.moveTo(bx - 76, by - 34); g.quadraticCurveTo(bx - 38, by - 50, bx, by - 32); g.quadraticCurveTo(bx + 38, by - 50, bx + 76, by - 34); g.lineTo(bx + 76, by + 10); g.quadraticCurveTo(bx + 38, by - 6, bx, by + 12); g.quadraticCurveTo(bx - 38, by - 6, bx - 76, by + 10); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#fff6dc'; g.beginPath(); g.moveTo(bx - 68, by - 30); g.quadraticCurveTo(bx - 36, by - 44, bx - 3, by - 28); g.lineTo(bx - 3, by + 6); g.quadraticCurveTo(bx - 36, by - 10, bx - 68, by + 4); g.closePath(); g.fill(); g.beginPath(); g.moveTo(bx + 68, by - 30); g.quadraticCurveTo(bx + 36, by - 44, bx + 3, by - 28); g.lineTo(bx + 3, by + 6); g.quadraticCurveTo(bx + 36, by - 10, bx + 68, by + 4); g.closePath(); g.fill();
    g.strokeStyle = '#d4b98a'; g.lineWidth = 2; for (i = 0; i < 3; i++) { g.beginPath(); g.moveTo(bx - 60, by - 22 + i * 9); g.quadraticCurveTo(bx - 34, by - 32 + i * 9, bx - 12, by - 20 + i * 9); g.stroke(); g.beginPath(); g.moveTo(bx + 12, by - 20 + i * 9); g.quadraticCurveTo(bx + 34, by - 32 + i * 9, bx + 60, by - 22 + i * 9); g.stroke(); }
    ['🐚', '⭐', '💎', '🪶'].forEach(function (e, k) { var em = SP.emoji(e, 26, dpr); g.drawImage(em, bx - 66 + k * 44, by - 92 + (k % 2) * 14, em._w, em._h); });
    g.font = '900 28px system-ui,sans-serif'; g.textAlign = 'left'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#2d1b52'; g.strokeText('Quests & Book', 16, h - 30); g.fillStyle = '#fff'; g.fillText('Quests & Book', 16, h - 30);
    g.font = '800 13px system-ui,sans-serif'; g.lineWidth = 4; g.strokeText('Stories, shells and trophies', 18, h - 11); g.fillStyle = '#ffe45c'; g.fillText('Stories, shells and trophies', 18, h - 11);
  }

  /* ------------------------------------------------------------------ home */
  var cv, g, W = 390, Hs = 440, raf = 0, running = false, last = 0, t = 0, host, hud = {};
  function build() {
    host = document.getElementById('scr-home'); host.innerHTML = '';
    var scroll = el('div', 'hscroll'); host.appendChild(scroll);
    var hero = el('div', 'hero'); scroll.appendChild(hero);
    cv = el('canvas', 'herocv'); hero.appendChild(cv); g = cv.getContext('2d');
    hud.top = el('div', 'topbar'); host.appendChild(hud.top);
    hud.welcome = el('div', 'welcome', 'Welcome, Salah!'); hero.appendChild(hud.welcome);
    hud.hanger = el('button', 'hanger', ui.icon('hanger')); hud.hanger.setAttribute('aria-label', 'Wardrobe'); hero.appendChild(hud.hanger);
    on(hud.hanger, function () { ui.go('wardrobe', { mode: 'wardrobe' }); });
    var cards = el('div', 'cards'); scroll.appendChild(cards);
    hud.isl = el('button', 'bigcard isl', '<canvas></canvas><span class="playbtn">' + ui.icon('play') + '</span><span class="cbadge"></span>'); cards.appendChild(hud.isl);
    on(hud.isl, function () { ui.go('map', { from: 'home' }); });
    hud.qst = el('button', 'bigcard qst', '<canvas></canvas><span class="playbtn alt">' + ui.icon('play') + '</span><span class="cbadge"></span>'); cards.appendChild(hud.qst);
    on(hud.qst, function () { SI.panels.questLog('quests'); });
    hud.prog = el('div', 'progcard'); cards.appendChild(hud.prog);
    root.addEventListener('resize', size);
  }
  function size() {
    if (!cv || host.classList.contains('hidden')) return;
    var r = cv.parentNode.getBoundingClientRect(); W = r.width; Hs = r.height; var dpr = Math.min(2, root.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hs * dpr); cv.style.width = W + 'px'; cv.style.height = Hs + 'px';
    var isl = hud.isl.querySelector('canvas'), q = hud.qst.querySelector('canvas'), rw = hud.isl.getBoundingClientRect().width || 350;
    islandsCard(isl, rw, rw * 0.46); isl.style.width = '100%'; questsCard(q, rw, rw * 0.36); q.style.width = '100%';
  }
  function refresh() {
    if (!hud.top) return; var S = A.S, lv = P.levelFromXp(S.xp);
    hud.top.innerHTML = '';
    var chip = el('button', 'avchip'); chip.setAttribute('aria-label', 'My monster'); chip.appendChild(SI.avatar.face(S.avatar, 46)); chip.appendChild(el('span', 'lvtag', 'Lv ' + S.level)); on(chip, function () { ui.go('wardrobe', { mode: 'wardrobe' }); }); hud.top.appendChild(chip);
    var chips = el('div', 'chips', ui.chip('coin', S.coins) + ui.chip('gem', S.gems)); hud.top.appendChild(chips);
    var gear = el('button', 'hbtn gear', ui.icon('gear')); gear.setAttribute('aria-label', 'Settings'); on(gear, function () { SI.panels.settings(); }); hud.top.appendChild(gear);
    hud.welcome.textContent = 'Welcome, ' + S.name + '!';
    var ob = SI.quests.objective(S), nIsl = S.islands.unlocked.length;
    hud.isl.querySelector('.cbadge').innerHTML = ob ? 'Next: ' + ui.esc(ob.text) : 'All quests done!';
    hud.qst.querySelector('.cbadge').innerHTML = SI.collectibles.completion(S.collectibles).have + '/72 found';
    hud.prog.innerHTML = '<div class="plv"><b>Level ' + S.level + '</b>' + SI.panels.bar(lv.into, lv.need || 1) + '<small>' + (lv.need ? lv.into + ' / ' + lv.need + ' XP' : 'Max level!') + '</small></div>' +
      '<div class="pst"><span>' + ui.icon('star') + '<b>' + P.totalStars(S) + '</b><small>stars</small></span><span>🏝️<b>' + nIsl + '/6</b><small>islands</small></span><span>🏅<b>' + Object.keys(S.achievements).length + '</b><small>trophies</small></span></div>';
  }

  var heroImg = null;
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt; if (document.hidden) return;
    var dpr = Math.min(2, root.devicePixelRatio || 1); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var sc = homeScene(Math.round(W), Math.round(Hs)); g.drawImage(sc.c, 0, 0, W, Hs);
    // drifting clouds + water shimmer
    g.fillStyle = 'rgba(255,255,255,0.9)'; [[0, 90, 1], [1, 150, 0.7], [2, 60, 0.85]].forEach(function (c) { var x = ((t * (6 + c[0] * 3) + c[0] * 150) % (W + 160)) - 80, y = c[1] + 20; var s = c[2]; g.beginPath(); g.arc(x, y, 24 * s, 0, TAU); g.arc(x + 24 * s, y - 8 * s, 28 * s, 0, TAU); g.arc(x + 52 * s, y, 22 * s, 0, TAU); g.fill(); });
    // avatar
    var s = Math.min(1.9, Hs / 235), ax = W * 0.5, ay = Hs * 0.8;
    SI.avatar.draw(g, A.S.avatar, { x: ax, y: ay, s: s, t: t });
  }
  var home = {
    enter: function () { if (!host) build(); refresh(); setTimeout(size, 0); size(); running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); },
    leave: function () { running = false; cancelAnimationFrame(raf); }
  };
  ui.register('intro', intro); ui.register('home', home);
  SI.home = { refresh: function () { if (host && ui.current() === 'home') refresh(); }, drawSea: drawSea };
})(typeof self !== 'undefined' ? self : this);
