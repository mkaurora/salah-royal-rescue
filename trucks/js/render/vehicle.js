/* Layered vehicle drawing (side view, facing right, 420x230 design box, ground at y=190). Every repair task adds or
 * changes a layer: rust -> primer, engine, wheels (3 styles), body panels, paint (3 colours), headlights (3 styles),
 * horn, bumpers, windows, exhaust and per-vehicle extras. TW.vehicle.draw(g, info, st, x, y, w, h) where
 * st = { done: {taskId:true}, choices:{paint,wheels,lights}, t: seconds, spin: wheel angle } and info = vehicleInfo(k). */
(function (root) {
  'use strict';
  var TW = root.TW = root.TW || {};
  var OUT = '#1d1b2b';

  function rr(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function poly(g, pts) { g.beginPath(); pts.forEach(function (p, i) { if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); }); g.closePath(); }
  function lin(g, y0, y1, a, b) { var gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); return gr; }
  function shiftHex(hex, deg) {
    if (!deg) return hex;
    var r = parseInt(hex.substr(1, 2), 16) / 255, gg = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    var mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), h = 0, s, l = (mx + mn) / 2, d = mx - mn;
    if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (gg - b) / d + (gg < b ? 6 : 0) : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; h *= 60; } else s = 0;
    return 'hsl(' + Math.round((h + deg) % 360) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%)';
  }

  /* ---- vehicle specs ---- */
  var SPEC = {
    muscle: {
      path: function (g) { g.beginPath(); g.moveTo(30, 152); g.lineTo(30, 120); g.quadraticCurveTo(34, 108, 60, 106); g.lineTo(122, 104); g.lineTo(152, 70); g.quadraticCurveTo(158, 64, 176, 64); g.lineTo(262, 64); g.quadraticCurveTo(280, 64, 290, 78); g.lineTo(312, 104); g.lineTo(372, 112); g.quadraticCurveTo(394, 116, 396, 134); g.lineTo(396, 152); g.closePath(); },
      win: function (g) { poly(g, [[160, 74], [262, 74], [280, 98], [140, 100]]); },
      hood: [306, 106, 80, 18], door: [150, 104, 120, 42], wheels: [[104, 160, 30], [322, 160, 30]], head: [386, 130], tail: [38, 122],
      bF: [388, 134, 16, 20], bR: [18, 134, 16, 20], ex: [40, 156], horn: [352, 108], pillar: 205,
      extra: {
        stripes: function (g, P) { g.save(); this.path(g); g.clip(); g.fillStyle = '#fff'; g.fillRect(30, 126, 370, 7); g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(30, 138, 370, 3); g.restore(); },
        hood: function (g, P) { g.fillStyle = '#15131f'; poly(g, [[330, 108], [372, 112], [366, 118], [330, 116]]); g.fill(); g.fillStyle = '#9aa'; g.fillRect(336, 111, 22, 2); }
      }, at: { stripes: [200, 130], hood: [350, 110] }
    },
    pickup: {
      path: function (g) { g.beginPath(); g.moveTo(200, 150); g.lineTo(200, 70); g.quadraticCurveTo(204, 58, 218, 58); g.lineTo(276, 58); g.quadraticCurveTo(292, 58, 300, 72); g.lineTo(314, 100); g.lineTo(374, 106); g.quadraticCurveTo(394, 110, 396, 126); g.lineTo(396, 152); g.lineTo(300, 152); g.lineTo(200, 152); g.closePath(); },
      win: function (g) { poly(g, [[214, 68], [274, 68], [292, 98], [214, 98]]); },
      hood: [318, 108, 66, 16], door: [212, 98, 92, 48], wheels: [[96, 160, 33], [324, 160, 33]], head: [388, 128], tail: [36, 118],
      bF: [390, 134, 14, 20], bR: [14, 134, 16, 20], ex: [40, 158], horn: [350, 106], pillar: 0, frame: [28, 140, 172, 10],
      extra: {
        bed: function (g, P) { g.fillStyle = lin(g, 94, 150, P.main, P.dark); rr(g, 30, 96, 172, 54, 6); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke();
          g.fillStyle = 'rgba(0,0,0,.28)'; rr(g, 40, 100, 152, 12, 4); g.fill(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; for (var i = 0; i < 5; i++) { g.beginPath(); g.moveTo(54 + i * 34, 118); g.lineTo(54 + i * 34, 146); g.stroke(); } },
        rack: function (g, P) { g.strokeStyle = '#2b2f3a'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(214, 56); g.lineTo(214, 48); g.lineTo(288, 48); g.lineTo(288, 56); g.stroke(); g.lineWidth = 3; g.strokeStyle = '#8f98a3'; g.beginPath(); g.moveTo(228, 48); g.lineTo(228, 58); g.moveTo(262, 48); g.lineTo(262, 58); g.stroke(); }
      }, at: { bed: [110, 120], rack: [250, 48] }
    },
    tow: {
      path: function (g) { g.beginPath(); g.moveTo(240, 150); g.lineTo(240, 72); g.quadraticCurveTo(244, 58, 258, 58); g.lineTo(316, 58); g.quadraticCurveTo(330, 58, 338, 72); g.lineTo(348, 100); g.lineTo(378, 106); g.quadraticCurveTo(394, 110, 396, 126); g.lineTo(396, 152); g.lineTo(240, 152); g.closePath(); },
      win: function (g) { poly(g, [[252, 68], [314, 68], [330, 98], [252, 98]]); },
      hood: [352, 108, 32, 16], door: [250, 98, 84, 46], wheels: [[84, 160, 30], [150, 160, 30], [336, 160, 30]], head: [388, 128], tail: [34, 124],
      bF: [390, 134, 14, 20], bR: [16, 134, 16, 20], ex: [236, 70], horn: [300, 58], pillar: 0, frame: [28, 138, 212, 12],
      flat: true,
      extra: {
        crane: function (g, P) { g.strokeStyle = OUT; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(180, 112); g.lineTo(118, 44); g.stroke(); g.strokeStyle = '#ffb300'; g.lineWidth = 7; g.beginPath(); g.moveTo(180, 112); g.lineTo(118, 44); g.stroke(); g.strokeStyle = '#8f98a3'; g.lineWidth = 4; g.beginPath(); g.moveTo(196, 124); g.lineTo(150, 78); g.stroke(); },
        hook: function (g, P) { g.strokeStyle = '#2b2f3a'; g.lineWidth = 3; g.beginPath(); g.moveTo(118, 44); g.lineTo(118, 86); g.stroke(); g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(118, 86); g.lineTo(118, 96); g.arc(112, 98, 6, 0, 3.4); g.stroke(); }
      }, at: { crane: [150, 80], hook: [118, 90] },
      baseDraw: function (g, P) { g.fillStyle = lin(g, 116, 136, '#7a8794', '#4a5560'); rr(g, 28, 118, 214, 20, 4); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#ffb300'; for (var i = 0; i < 8; i++) { poly(g, [[40 + i * 26, 122], [50 + i * 26, 122], [44 + i * 26, 132], [34 + i * 26, 132]]); g.fill(); } }
    },
    monster: {
      path: function (g) { g.beginPath(); g.moveTo(40, 112); g.lineTo(40, 70); g.lineTo(190, 70); g.lineTo(196, 38); g.quadraticCurveTo(200, 28, 214, 28); g.lineTo(264, 28); g.quadraticCurveTo(280, 28, 288, 42); g.lineTo(304, 70); g.lineTo(366, 76); g.quadraticCurveTo(392, 80, 394, 96); g.lineTo(394, 114); g.lineTo(40, 114); g.closePath(); },
      win: function (g) { poly(g, [[208, 38], [262, 38], [278, 64], [206, 64]]); },
      hood: [310, 78, 66, 16], door: [204, 66, 84, 42], wheels: [[96, 150, 48], [330, 150, 48]], head: [386, 92], tail: [46, 88],
      bF: [388, 100, 14, 14], bR: [26, 98, 16, 14], ex: [60, 112], horn: [262, 28], pillar: 0,
      extra: {
        springs: function (g, P) { g.strokeStyle = '#2b2f3a'; g.lineWidth = 7; g.lineCap = 'round'; [150, 276].forEach(function (x) { g.beginPath(); g.moveTo(x, 116); for (var i = 0; i < 6; i++) g.lineTo(x + (i % 2 ? 9 : -9), 118 + i * 6); g.lineTo(x, 152); g.stroke(); }); g.strokeStyle = '#ffb300'; g.lineWidth = 3.5; [150, 276].forEach(function (x) { g.beginPath(); g.moveTo(x, 116); for (var i = 0; i < 6; i++) g.lineTo(x + (i % 2 ? 9 : -9), 118 + i * 6); g.lineTo(x, 152); g.stroke(); }); },
        flames: function (g, P) { g.save(); this.path(g); g.clip(); [[60, 6], [100, 8], [140, 7], [316, 6], [350, 8]].forEach(function (f) { g.fillStyle = '#ff7a00'; poly(g, [[f[0], 112], [f[0] + 10, 112 - f[1] * 4], [f[0] + 18, 112 - f[1] * 2], [f[0] + 26, 112 - f[1] * 5], [f[0] + 36, 112]]); g.fill(); g.fillStyle = '#ffe14d'; poly(g, [[f[0] + 6, 112], [f[0] + 14, 112 - f[1] * 2.2], [f[0] + 22, 112]]); g.fill(); }); g.restore(); }
      }, at: { springs: [150, 130], flames: [100, 100] }
    },
    fire: {
      path: function (g) { g.beginPath(); g.moveTo(30, 152); g.lineTo(30, 80); g.quadraticCurveTo(30, 70, 42, 70); g.lineTo(292, 70); g.lineTo(292, 70); g.lineTo(352, 70); g.quadraticCurveTo(366, 70, 374, 86); g.lineTo(386, 108); g.quadraticCurveTo(396, 112, 396, 128); g.lineTo(396, 152); g.closePath(); },
      win: function (g) { poly(g, [[302, 80], [350, 80], [368, 106], [302, 106]]); },
      hood: [356, 112, 32, 14], door: [300, 106, 70, 40], wheels: [[96, 160, 32], [172, 160, 32], [334, 160, 32]], head: [388, 130], tail: [36, 120],
      bF: [390, 136, 14, 18], bR: [14, 136, 18, 18], ex: [38, 150], horn: [330, 70], pillar: 0,
      detail: function (g, P) { g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; [[50, 88, 70, 52], [124, 88, 70, 52], [198, 88, 84, 52]].forEach(function (d) { rr(g, d[0], d[1], d[2], d[3], 5); g.stroke(); });
        g.fillStyle = '#fff'; g.fillRect(30, 142, 262, 5);
        g.fillStyle = '#c9d1d8'; g.beginPath(); g.arc(240, 112, 22, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
        g.strokeStyle = '#d32f2f'; g.lineWidth = 5; [8, 13, 18].forEach(function (r) { g.beginPath(); g.arc(240, 112, r, 0, 7); g.stroke(); });
        g.fillStyle = '#ffd54f'; g.beginPath(); g.arc(240, 112, 4, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = '900 17px Trebuchet MS, system-ui'; g.textAlign = 'center'; g.fillText('FIRE', 88, 120);
        g.fillStyle = '#f2c230'; g.fillRect(50, 126, 76, 4); },
      extra: {
        ladder: function (g, P) { g.save(); g.translate(0, 0); g.strokeStyle = OUT; g.lineWidth = 9; g.beginPath(); g.moveTo(44, 62); g.lineTo(284, 62); g.moveTo(44, 50); g.lineTo(284, 50); g.stroke(); g.strokeStyle = '#d7dde3'; g.lineWidth = 4.5; g.beginPath(); g.moveTo(44, 62); g.lineTo(284, 62); g.moveTo(44, 50); g.lineTo(284, 50); g.stroke(); g.lineWidth = 3.5; g.strokeStyle = '#ffb300'; for (var x = 56; x < 284; x += 18) { g.beginPath(); g.moveTo(x, 50); g.lineTo(x, 62); g.stroke(); } g.restore(); },
        siren: function (g, P) { g.fillStyle = '#2b2f3a'; rr(g, 306, 58, 52, 10, 3); g.fill(); var on = Math.floor((P.t || 0) * 3) % 2; g.fillStyle = on ? '#ff3b30' : '#a01a14'; rr(g, 308, 48, 22, 12, 5); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke(); g.fillStyle = on ? '#3d6bff' : '#1e3aa0'; rr(g, 332, 48, 22, 12, 5); g.fill(); g.stroke(); }
      }, at: { ladder: [160, 56], siren: [330, 52] }
    },
    mail: {
      path: function (g) { g.beginPath(); g.moveTo(30, 152); g.lineTo(30, 62); g.quadraticCurveTo(30, 50, 44, 50); g.lineTo(300, 50); g.quadraticCurveTo(316, 50, 324, 64); g.lineTo(356, 108); g.lineTo(380, 114); g.quadraticCurveTo(396, 118, 396, 134); g.lineTo(396, 152); g.closePath(); },
      win: function (g) { poly(g, [[304, 60], [318, 60], [342, 100], [304, 100]]); },
      hood: [356, 116, 28, 12], door: [300, 100, 54, 46], wheels: [[100, 160, 32], [322, 160, 32]], head: [388, 134], tail: [36, 120],
      bF: [390, 138, 14, 16], bR: [14, 138, 18, 16], ex: [40, 152], horn: [300, 50], pillar: 0,
      detail: function (g, P) { g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 3; g.beginPath(); g.moveTo(180, 52); g.lineTo(180, 148); g.stroke(); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(30, 96, 270, 6); },
      extra: {
        mailbox: function (g, P) { g.fillStyle = '#fff'; rr(g, 60, 66, 80, 26, 6); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#c62828'; rr(g, 74, 76, 52, 7, 3); g.fill(); g.fillStyle = '#c62828'; g.fillRect(66, 70, 6, 4); },
        sliding: function (g, P) { g.fillStyle = 'rgba(255,255,255,.18)'; rr(g, 188, 58, 100, 84, 6); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#1d1b2b'; g.fillRect(196, 54, 84, 4); g.fillStyle = '#ffd54f'; rr(g, 270, 96, 8, 20, 3); g.fill(); g.strokeStyle = OUT; g.lineWidth = 2; g.stroke(); }
      }, at: { mailbox: [100, 80], sliding: [240, 100] }
    },
    icecream: {
      path: function (g) { g.beginPath(); g.moveTo(30, 152); g.lineTo(30, 72); g.quadraticCurveTo(30, 40, 62, 40); g.lineTo(268, 40); g.quadraticCurveTo(298, 40, 308, 60); g.lineTo(326, 100); g.lineTo(362, 108); g.quadraticCurveTo(396, 114, 396, 134); g.lineTo(396, 152); g.closePath(); },
      win: function (g) { poly(g, [[296, 54], [304, 56], [322, 94], [290, 94]]); },
      hood: [358, 112, 28, 12], door: [284, 94, 56, 50], wheels: [[100, 160, 32], [322, 160, 32]], head: [388, 134], tail: [36, 122],
      bF: [390, 138, 14, 16], bR: [14, 138, 18, 16], ex: [40, 152], horn: [280, 40], pillar: 0,
      detail: function (g, P) { g.fillStyle = '#26293a'; rr(g, 86, 62, 110, 52, 6); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#ffeeb0'; rr(g, 92, 68, 98, 40, 4); g.fill();
        for (var i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#fff' : '#ff6f91'; g.fillRect(82 + i * 20, 50, 20, 14); } g.lineWidth = 2.5; g.strokeStyle = OUT; g.strokeRect(82, 50, 120, 14);
        g.fillStyle = '#f48fb1'; g.beginPath(); g.arc(120, 100, 9, 3.14, 0); g.fill(); g.fillStyle = '#80deea'; g.beginPath(); g.arc(150, 100, 9, 3.14, 0); g.fill(); g.fillStyle = '#fff59d'; g.beginPath(); g.arc(176, 100, 9, 3.14, 0); g.fill(); },
      extra: {
        cone: function (g, P) { g.save(); g.translate(150, 36); g.fillStyle = '#e0a45a'; poly(g, [[-20, -30], [20, -30], [0, 4]]); g.fill(); g.lineWidth = 4; g.strokeStyle = OUT; g.stroke(); g.strokeStyle = 'rgba(120,70,20,.6)'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(-14, -26); g.lineTo(6, -2); g.moveTo(14, -26); g.lineTo(-6, -2); g.stroke(); g.fillStyle = '#f48fb1'; g.beginPath(); g.arc(0, -36, 22, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#ff5252'; g.beginPath(); g.arc(0, -62, 5, 0, 7); g.fill(); g.stroke(); g.restore(); },
        speaker: function (g, P) { g.fillStyle = '#2b2f3a'; poly(g, [[240, 40], [262, 40], [276, 22], [236, 22]]); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.strokeStyle = '#ffd54f'; g.lineWidth = 2.5; g.beginPath(); g.arc(282, 30, 6, -1, 1); g.stroke(); g.beginPath(); g.arc(282, 30, 12, -1, 1); g.stroke(); }
      }, at: { cone: [150, -10], speaker: [258, 30] }
    },
    dump: {
      path: function (g) { g.beginPath(); g.moveTo(268, 152); g.lineTo(268, 78); g.quadraticCurveTo(268, 66, 282, 66); g.lineTo(336, 66); g.quadraticCurveTo(348, 66, 354, 78); g.lineTo(372, 108); g.quadraticCurveTo(396, 112, 396, 130); g.lineTo(396, 152); g.closePath(); },
      win: function (g) { poly(g, [[280, 76], [334, 76], [352, 102], [280, 102]]); },
      hood: [358, 114, 26, 14], door: [278, 102, 74, 42], wheels: [[78, 160, 32], [148, 160, 32], [334, 160, 32]], head: [388, 132], tail: [34, 124],
      bF: [390, 136, 14, 18], bR: [14, 136, 18, 18], ex: [262, 90], horn: [310, 66], pillar: 0, frame: [28, 138, 240, 12],
      extra: {
        tipper: function (g, P) { g.fillStyle = lin(g, 50, 140, P.main, P.dark); poly(g, [[30, 138], [34, 60], [200, 56], [264, 70], [266, 138]]); g.fill(); g.lineWidth = 4.5; g.strokeStyle = OUT; g.lineJoin = 'round'; g.stroke();
          g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 3; for (var i = 0; i < 5; i++) { g.beginPath(); g.moveTo(66 + i * 40, 64); g.lineTo(66 + i * 40, 134); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(40, 62, 210, 5); },
        piston: function (g, P) { g.strokeStyle = OUT; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(224, 140); g.lineTo(214, 96); g.stroke(); g.strokeStyle = '#c9d1d8'; g.lineWidth = 6; g.beginPath(); g.moveTo(224, 140); g.lineTo(214, 96); g.stroke(); g.strokeStyle = '#7c8791'; g.lineWidth = 3; g.beginPath(); g.moveTo(218, 116); g.lineTo(215, 100); g.stroke(); }
      }, at: { tipper: [150, 100], piston: [220, 118] }
    },
    race: {
      path: function (g) { g.beginPath(); g.moveTo(26, 152); g.lineTo(26, 134); g.quadraticCurveTo(30, 122, 56, 120); g.lineTo(120, 112); g.lineTo(168, 86); g.quadraticCurveTo(180, 78, 200, 78); g.lineTo(246, 80); g.quadraticCurveTo(266, 82, 280, 96); g.lineTo(322, 112); g.lineTo(386, 126); g.quadraticCurveTo(398, 130, 398, 142); g.lineTo(398, 152); g.closePath(); },
      win: function (g) { poly(g, [[184, 88], [244, 88], [266, 108], [168, 110]]); },
      hood: [310, 116, 70, 14], door: [150, 112, 110, 34], wheels: [[102, 160, 30], [322, 160, 30]], head: [388, 134], tail: [32, 132],
      bF: [390, 138, 14, 14], bR: [14, 138, 16, 14], ex: [34, 156], horn: [300, 112], pillar: 0,
      detail: function (g, P) { g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(26, 138, 372, 5); },
      extra: {
        spoiler: function (g, P) { g.fillStyle = OUT; g.fillRect(40, 96, 8, 26); g.fillRect(70, 96, 8, 24); g.fillStyle = lin(g, 84, 98, P.main, P.dark); rr(g, 18, 84, 70, 13, 4); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke(); },
        number: function (g, P) { g.fillStyle = '#fff'; g.beginPath(); g.arc(210, 128, 15, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke(); g.fillStyle = OUT; g.font = '900 20px Trebuchet MS, system-ui'; g.textAlign = 'center'; g.fillText('7', 210, 135); }
      }, at: { spoiler: [52, 90], number: [210, 128] }
    },
    bus: {
      path: function (g) { g.beginPath(); g.moveTo(26, 152); g.lineTo(26, 58); g.quadraticCurveTo(26, 46, 40, 46); g.lineTo(328, 46); g.quadraticCurveTo(342, 46, 350, 60); g.lineTo(370, 100); g.lineTo(384, 106); g.quadraticCurveTo(396, 112, 396, 130); g.lineTo(396, 152); g.closePath(); },
      win: function (g) { for (var i = 0; i < 6; i++) rr(g, 40 + i * 42, 60, 34, 32, 5); poly(g, [[298, 60], [330, 60], [348, 92], [298, 92]]); },
      hood: [358, 112, 28, 12], door: [296, 96, 56, 50], wheels: [[100, 160, 32], [324, 160, 32]], head: [388, 128], tail: [34, 112],
      bF: [390, 134, 14, 18], bR: [14, 134, 18, 18], ex: [38, 150], horn: [300, 46], pillar: 0,
      detail: function (g, P) { g.fillStyle = '#222'; g.fillRect(26, 104, 370, 5); g.fillRect(26, 118, 270, 3); },
      extra: {
        stopsign: function (g, P) { g.save(); g.translate(340, 124); g.fillStyle = '#d32f2f'; g.beginPath(); for (var i = 0; i < 8; i++) { var a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(18 * Math.cos(a), 18 * Math.sin(a)); } g.closePath(); g.fill(); g.lineWidth = 3; g.strokeStyle = '#fff'; g.stroke(); g.lineWidth = 1.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#fff'; g.font = '900 8px Trebuchet MS, system-ui'; g.textAlign = 'center'; g.fillText('STOP', 0, 3); g.restore(); },
        seats: function (g, P) { for (var i = 0; i < 6; i++) { g.fillStyle = '#e65100'; rr(g, 46 + i * 42, 72, 12, 20, 4); g.fill(); g.fillStyle = '#bf360c'; g.fillRect(46 + i * 42, 86, 22, 6); } }
      }, at: { stopsign: [340, 124], seats: [150, 76] }
    }
  };

  var RUST = ['#b9794e', '#6a3f26'], PRIMER = ['#cdd5db', '#8793a0'];

  function drawWheel(g, x, y, r, style, spin) {
    g.save(); g.translate(x, y);
    if (style === 'chunky') {
      g.fillStyle = '#22222c'; g.beginPath(); g.arc(0, 0, r * 1.04, 0, 7); g.fill();
      g.fillStyle = '#3a3a48'; for (var i = 0; i < 14; i++) { g.save(); g.rotate(spin + i * Math.PI / 7); g.fillRect(-r * 0.1, -r * 1.06, r * 0.2, r * 0.22); g.restore(); }
      g.lineWidth = 3; g.strokeStyle = OUT; g.beginPath(); g.arc(0, 0, r * 1.04, 0, 7); g.stroke();
      g.fillStyle = '#ff9800'; g.beginPath(); g.arc(0, 0, r * 0.42, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#7a4500'; for (i = 0; i < 6; i++) { g.beginPath(); g.arc(Math.cos(spin + i * 1.0472) * r * 0.26, Math.sin(spin + i * 1.0472) * r * 0.26, r * 0.05, 0, 7); g.fill(); }
    } else if (style === 'sport') {
      g.fillStyle = '#1f1f29'; g.beginPath(); g.arc(0, 0, r * 0.97, 0, 7); g.fill(); g.lineWidth = 3; g.strokeStyle = OUT; g.stroke();
      g.fillStyle = lin(g, -r * 0.7, r * 0.7, '#f4f6f8', '#8fa0b0'); g.beginPath(); g.arc(0, 0, r * 0.7, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#1f1f29'; for (i = 0; i < 5; i++) { g.save(); g.rotate(spin + i * 1.2566); g.beginPath(); g.moveTo(0, 0); g.lineTo(r * 0.14, -r * 0.62); g.lineTo(-r * 0.14, -r * 0.62); g.closePath(); g.restore(); g.save(); g.rotate(spin + i * 1.2566 + 0.63); g.beginPath(); g.arc(0, -r * 0.42, r * 0.11, 0, 7); g.fill(); g.restore(); }
      g.fillStyle = '#f44'; g.beginPath(); g.arc(0, 0, r * 0.16, 0, 7); g.fill();
    } else {
      g.fillStyle = '#2a2a35'; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke();
      g.fillStyle = lin(g, -r * 0.55, r * 0.55, '#eef1f4', '#8e9aa6'); g.beginPath(); g.arc(0, 0, r * 0.56, 0, 7); g.fill(); g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#5a6570'; for (i = 0; i < 5; i++) { g.beginPath(); g.arc(Math.cos(spin + i * 1.2566) * r * 0.3, Math.sin(spin + i * 1.2566) * r * 0.3, r * 0.065, 0, 7); g.fill(); }
      g.fillStyle = '#cfd6dc'; g.beginPath(); g.arc(0, 0, r * 0.12, 0, 7); g.fill();
    }
    g.restore();
  }

  function drawLight(g, x, y, style, on, t) {
    g.save(); g.translate(x, y);
    if (on) { // beam
      g.globalAlpha = 0.18 + 0.06 * Math.sin((t || 0) * 3); g.fillStyle = '#fff6b0'; g.beginPath(); g.moveTo(4, -4); g.lineTo(60, -16); g.lineTo(60, 22); g.lineTo(4, 8); g.closePath(); g.fill(); g.globalAlpha = 1;
    }
    var fill = on ? '#fff59d' : '#3a3d4a';
    g.lineWidth = 3.5; g.strokeStyle = OUT; g.fillStyle = on ? fill : '#2b2d38';
    if (style === 'square') { rr(g, -9, -10, 16, 18, 4); }
    else if (style === 'star') { g.beginPath(); for (var i = 0; i < 10; i++) { var a = -1.5708 + i * Math.PI / 5, r = i % 2 ? 5 : 12; g.lineTo(Math.cos(a) * r - 1, Math.sin(a) * r); } g.closePath(); }
    else { g.beginPath(); g.arc(-1, 0, 10, 0, 7); }
    g.fill(); g.stroke();
    if (on) { g.fillStyle = '#fff'; g.beginPath(); g.arc(-4, -3, 3, 0, 7); g.fill(); }
    g.restore();
  }

  function engine(g, x, y, w, h) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#3a3f4b'; rr(g, 2, h * 0.35, w - 4, h * 0.6, 3); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    g.fillStyle = '#d32f2f'; rr(g, 6, h * 0.05, w - 12, h * 0.45, 4); g.fill(); g.stroke();
    g.fillStyle = '#9fa8b3'; for (var i = 0; i < 4; i++) g.fillRect(10 + i * ((w - 20) / 4), h * 0.1, 4, h * 0.32);
    g.fillStyle = '#e8edf2'; g.beginPath(); g.arc(w - 12, h * 0.7, h * 0.2, 0, 7); g.fill(); g.stroke();
    g.restore();
  }

  function glassFill(g, x0, y0, x1, y1) {
    var gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, '#d8f3ff'); gr.addColorStop(0.5, '#7cc3ea'); gr.addColorStop(1, '#4a8fc2'); return gr;
  }

  /** Draw vehicle k. (x,y,w,h) = target box in the context's units. st.done = {taskId: true}. */
  function draw(g, info, st, x, y, w, h) {
    var S = SPEC[info.id], done = st.done || {}, ch = st.choices || {}, t = st.t || 0;
    var sc = Math.min(w / 420, h / 230); g.save(); g.translate(x + (w - 420 * sc) / 2, y + (h - 230 * sc) / 2); g.scale(sc, sc);
    var paintDone = !!done.paint && ch.paint, pOpt = null;
    if (paintDone) { for (var i = 0; i < info.tasks.length; i++) if (info.tasks[i].choice === 'paint') pOpt = info.tasks[i].options.filter(function (o) { return o.id === ch.paint; })[0]; }
    var P = { t: t, main: RUST[0], dark: RUST[1] };
    if (pOpt) { P.main = shiftHex(pOpt.main, info.hueShift); P.dark = shiftHex(pOpt.dark, info.hueShift); }
    else if (done.rust) { P.main = PRIMER[0]; P.dark = PRIMER[1]; }
    var lift = !done.wheels ? 14 : 0;
    // ground shadow
    g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(210, 196, 190, 13, 0, 0, 7); g.fill();
    g.translate(0, -lift * 0 + 0);
    var wy = S.wheels[0][1];
    var raise = lift ? 10 : 0;
    // jack stands when no wheels
    if (!done.wheels) {
      S.wheels.forEach(function (wh) {
        g.fillStyle = '#d9a43a'; poly(g, [[wh[0] - 16, 192], [wh[0] + 16, 192], [wh[0] + 6, wh[1] + 4], [wh[0] - 6, wh[1] + 4]]); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke();
        g.fillStyle = '#7c8791'; rr(g, wh[0] - 22, 190, 44, 6, 2); g.fill(); g.stroke();
        g.fillStyle = '#3a3f4b'; g.beginPath(); g.arc(wh[0], wh[1], 8, 0, 7); g.fill(); g.stroke();
      });
    }
    g.translate(0, raise ? -6 : 0);
    var offy = 190 - 160;     // wheel centres were designed against ground y=190 (wheel y + r ~ 190)
    // chassis frame + trucks' base
    if (S.frame) { g.fillStyle = '#4a5360'; rr(g, S.frame[0], S.frame[1], S.frame[2], S.frame[3], 3); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke(); }
    if (S.baseDraw) S.baseDraw(g, P);
    // rear extras that sit behind the body (bed, tipper, crane, ladder...) are drawn before/after body via extra order
    var behind = { bed: 1, tipper: 1 };
    info.tasks.forEach(function (tk) { if (done[tk.id] && S.extra[tk.id] && behind[tk.id]) S.extra[tk.id].call(S, g, P); });
    // body
    S.path.call(S, g);
    g.fillStyle = lin(g, 40, 160, P.main, P.dark); g.fill();
    g.lineWidth = 4.5; g.lineJoin = 'round'; g.strokeStyle = OUT; g.stroke();
    // body highlight + shading
    g.save(); S.path.call(S, g); g.clip();
    g.fillStyle = 'rgba(255,255,255,.2)'; g.fillRect(0, 0, 420, 100);
    g.fillStyle = 'rgba(0,0,0,.16)'; g.fillRect(0, 142, 420, 30);
    if (!done.rust) {
      g.fillStyle = 'rgba(120,52,20,.55)'; [[70, 120, 22], [140, 96, 16], [230, 130, 20], [300, 118, 14], [350, 130, 18], [180, 80, 12], [100, 140, 12], [260, 84, 10]].forEach(function (r) { g.beginPath(); g.ellipse(r[0], r[1], r[2], r[2] * 0.6, 0.4, 0, 7); g.fill(); });
      g.fillStyle = 'rgba(40,25,15,.5)'; [[110, 110, 4], [200, 140, 5], [320, 100, 4], [60, 100, 3]].forEach(function (r) { g.beginPath(); g.arc(r[0], r[1], r[2], 0, 7); g.fill(); });
    }
    if (S.detail) S.detail.call(S, g, P);
    g.restore();
    // windows
    S.win.call(S, g);
    if (done.windows) { g.fillStyle = glassFill(g, 120, 60, 320, 110); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke(); g.save(); S.win.call(S, g); g.clip(); g.fillStyle = 'rgba(255,255,255,.4)'; for (var q = 0; q < 6; q++) { g.save(); g.translate(40 + q * 60 + (t * 8 % 60), 0); g.rotate(0); poly(g, [[0, 30], [16, 30], [-6, 130], [-22, 130]]); g.fill(); g.restore(); } g.restore();
      if (S.extra.seats && done.seats) S.extra.seats.call(S, g, P);
    } else { g.fillStyle = '#20222c'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke(); }
    if (S.pillar && done.windows) { g.fillStyle = P.dark; g.fillRect(S.pillar - 3, 72, 6, 30); }
    // cavities (panels missing) or panel lines
    if (!done.panels) {
      [S.hood, S.door].forEach(function (r, ri) {
        g.fillStyle = '#23252f'; rr(g, r[0], r[1], r[2], r[3], 5); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke();
        if (ri === 0 && done.engine) engine(g, r[0] + 3, r[1] - 4, r[2] - 6, r[3] + 6);
        if (ri === 0 && !done.engine) { g.strokeStyle = '#555a68'; g.lineWidth = 2; g.beginPath(); g.moveTo(r[0] + 8, r[1] + r[3] - 3); g.quadraticCurveTo(r[0] + r[2] / 2, r[1] - 2, r[0] + r[2] - 8, r[1] + r[3] - 3); g.stroke(); }
        if (ri === 1) { g.strokeStyle = '#555a68'; g.lineWidth = 2; g.beginPath(); g.moveTo(r[0] + 8, r[1] + 10); g.lineTo(r[0] + r[2] - 8, r[1] + r[3] - 10); g.moveTo(r[0] + r[2] - 8, r[1] + 10); g.lineTo(r[0] + 8, r[1] + r[3] - 10); g.stroke(); }
      });
    } else {
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2.5; rr(g, S.door[0], S.door[1], S.door[2], S.door[3], 6); g.stroke(); rr(g, S.hood[0], S.hood[1], S.hood[2], S.hood[3], 4); g.stroke();
      g.fillStyle = '#e8edf2'; rr(g, S.door[0] + S.door[2] - 26, S.door[1] + 7, 16, 5, 2.5); g.fill(); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke();
    }
    // front-facing extras after body
    info.tasks.forEach(function (tk) { if (done[tk.id] && S.extra[tk.id] && !behind[tk.id] && tk.id !== 'seats') S.extra[tk.id].call(S, g, P); });
    // wheel arches + wheels
    S.wheels.forEach(function (wh) {
      g.fillStyle = '#17161f'; g.beginPath(); g.arc(wh[0], wh[1], wh[2] + 6, Math.PI, 0); g.lineTo(wh[0] + wh[2] + 6, wh[1]); g.closePath(); g.fill();
    });
    if (done.wheels) S.wheels.forEach(function (wh) { drawWheel(g, wh[0], wh[1], wh[2], ch.wheels || 'classic', st.spin || 0); });
    // bumpers
    [S.bF, S.bR].forEach(function (r) {
      if (done.bumpers) { g.fillStyle = lin(g, r[1], r[1] + r[3], '#f5f7fa', '#8995a1'); rr(g, r[0], r[1], r[2], r[3], 5); g.fill(); g.lineWidth = 3.5; g.strokeStyle = OUT; g.stroke(); }
      else { g.fillStyle = '#55606c'; g.fillRect(r[0] + r[2] / 2 - 3, r[1] + 3, 6, r[3] - 6); g.strokeStyle = OUT; g.lineWidth = 2; g.strokeRect(r[0] + r[2] / 2 - 3, r[1] + 3, 6, r[3] - 6); }
    });
    // lights
    drawLight(g, S.head[0], S.head[1], ch.lights || 'round', !!done.lights, t);
    g.fillStyle = done.lights ? '#ff3b30' : '#4a2323'; rr(g, S.tail[0] - 8, S.tail[1] - 6, 10, 14, 3); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke();
    // horn
    if (done.horn) { g.fillStyle = '#ffd54f'; poly(g, [[S.horn[0], S.horn[1]], [S.horn[0] + 14, S.horn[1] - 8], [S.horn[0] + 14, S.horn[1] + 2], [S.horn[0], S.horn[1] - 2]]); g.fill(); g.lineWidth = 2.5; g.strokeStyle = OUT; g.stroke(); g.fillStyle = '#2b2f3a'; g.fillRect(S.horn[0] - 5, S.horn[1] - 4, 6, 6); }
    // exhaust
    if (done.exhaust) {
      var e = S.ex; g.strokeStyle = OUT; g.lineWidth = 11; g.lineCap = 'round'; g.beginPath(); g.moveTo(e[0] + 18, e[1] + 6); g.lineTo(e[0] - 14, e[1] + 6); g.stroke();
      g.strokeStyle = '#c9d1d8'; g.lineWidth = 6; g.beginPath(); g.moveTo(e[0] + 18, e[1] + 6); g.lineTo(e[0] - 14, e[1] + 6); g.stroke();
      var ph = (t * 1.3) % 1; g.fillStyle = 'rgba(220,220,230,' + (0.5 * (1 - ph)) + ')'; g.beginPath(); g.arc(e[0] - 18 - ph * 22, e[1] + 6 - ph * 8, 4 + ph * 8, 0, 7); g.fill();
    } else { g.strokeStyle = '#55606c'; g.lineWidth = 4; g.beginPath(); g.moveTo(e0(S)[0] + 10, e0(S)[1] + 6); g.lineTo(e0(S)[0] + 2, e0(S)[1] + 6); g.stroke(); }
    g.restore();
  }
  function e0(S) { return S.ex; }

  /** Where a task's part sits in the 420x230 box (for sparkles / flashes). */
  function anchor(info, taskId) {
    var S = SPEC[info.id];
    var a = { rust: [200, 110], engine: [S.hood[0] + S.hood[2] / 2, S.hood[1]], wheels: [S.wheels[0][0], S.wheels[0][1]], panels: [S.door[0] + S.door[2] / 2, S.door[1] + S.door[3] / 2],
      paint: [210, 110], lights: S.head, horn: S.horn, bumpers: [S.bF[0] + 6, S.bF[1] + 8], windows: [200, 88], exhaust: S.ex };
    if (S.at && S.at[taskId]) return S.at[taskId];
    return a[taskId] || [210, 110];
  }
  function box(w, h) { var sc = Math.min(w / 420, h / 230); return { sc: sc, ox: (w - 420 * sc) / 2, oy: (h - 230 * sc) / 2 }; }

  TW.vehicle = { draw: draw, anchor: anchor, box: box, SPEC: SPEC };
})(typeof self !== 'undefined' ? self : this);
