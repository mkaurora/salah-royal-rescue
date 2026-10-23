/* The six islands: specs + a deterministic tilemap builder (no hand-typed grids) + helpers.
 * Each island = FRONT lobe (spawn, dock, zone, NPCs, spots, 6 collectibles) + BACK lobe (finale NPC, 6 collectibles)
 * joined by a 2-wide bridge of 'g' tiles (the gate). See dev/DESIGN.md §3. UMD: SI.islands. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('rng', '../logic/rng.js'), dep('path', '../logic/path.js'), dep('collectibles', './collectibles.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.islands = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG, PATH, COL) {
  'use strict';

  var BLOCKED = '~TR#g';          // tiles that block walking (g only until the gate is open)
  var INTERACT = 1.6;             // tiles
  var STAR_REQ = [0, 12, 30, 55, 85, 120];

  /* ------------------------------------------------------------------ specs */
  var SPECS = [
    {
      n: 1, id: 'sunny-shore', name: 'Sunny Shore', biome: 'beach', w: 36, h: 44, seed: 'shore', sandy: 0.5,
      tint: 'rgba(255,214,120,0.10)', palette: { ground: '#9ad66b', ground2: '#86c95a', sand: '#f2dc9b', water: '#4fc3e8', water2: '#7ad7f0' },
      deco: { T: 0.09, R: 0.03, '#': 0, f: 0.07 }, beachDeco: { T: 0.05, R: 0.03 },
      zone: { id: 'home', kind: 'home', w: 10, h: 10, at: [0, 0.05], label: 'Salah\'s Plot' },
      gate: { id: 'g1', name: 'Plank Bridge', subject: 'english', need: 3 },
      spawn: [0, 0.86], dock: [0.7, 0.95],
      npcs: [
        { id: 'pip', name: 'Pip', species: 'sea-turtle', role: 'guide', at: [0.62, -0.05] },
        { id: 'nori', name: 'Nori', species: 'crab', role: 'challenge', at: [-0.72, 0.55] },
        { id: 'bumble', name: 'Bumble', species: 'round blue monster', role: 'finale', back: true, at: [0, 0.1] }],
      spots: [['shellSort', -0.78, -0.15], ['memoryMatch', 0.7, -0.62], ['mathFishing', -0.5, 0.9]]
    },
    {
      n: 2, id: 'jungle-falls', name: 'Jungle Falls', biome: 'jungle', w: 38, h: 44, seed: 'falls', sandy: 0.25,
      tint: 'rgba(70,170,110,0.12)', palette: { ground: '#6cc46a', ground2: '#58b35c', sand: '#e8d28f', water: '#3fb8c8', water2: '#6fd0d8' },
      deco: { T: 0.22, R: 0.03, '#': 0, f: 0.1 }, beachDeco: { T: 0.04, R: 0.02 },
      zone: { id: 'i2', kind: 'decorate', w: 6, h: 6, at: [-0.15, 0.1], label: 'Decorate Zone' },
      gate: { id: 'g2', name: 'Vine Bridge', subject: 'science', need: 3 },
      spawn: [0.1, 0.85], dock: [0.75, 0.9],
      npcs: [
        { id: 'tuki', name: 'Tuki', species: 'toucan', role: 'guide', at: [0.55, 0.3] },
        { id: 'ziggy', name: 'Ziggy', species: 'tree frog', role: 'challenge', at: [-0.7, -0.1] },
        { id: 'fernie', name: 'Fernie', species: 'fuzzy fern monster', role: 'finale', back: true, at: [0, 0.1] }],
      spots: [['coconutHop', -0.6, 0.6], ['wordBuilder', 0.65, -0.5], ['patternGarden', 0.0, -0.8]]
    },
    {
      n: 3, id: 'crystal-caves', name: 'Crystal Caves', biome: 'caves', w: 40, h: 44, seed: 'caves', sandy: 0.1,
      tint: 'rgba(170,120,255,0.12)', palette: { ground: '#b7a6e0', ground2: '#a894d4', sand: '#d9cdf2', water: '#5aa8e0', water2: '#86c2ee' },
      deco: { T: 0.10, R: 0.05, '#': 0.07, f: 0.07 }, beachDeco: { T: 0.0, R: 0.04 },
      zone: { id: 'i3', kind: 'decorate', w: 6, h: 6, at: [0.15, 0.1], label: 'Decorate Zone' },
      gate: { id: 'g3', name: 'Crystal Bridge', subject: 'math', need: 3 },
      spawn: [-0.1, 0.85], dock: [-0.75, 0.9],
      npcs: [
        { id: 'digby', name: 'Digby', species: 'mole', role: 'guide', at: [-0.6, 0.3] },
        { id: 'lumi', name: 'Lumi', species: 'firefly', role: 'challenge', at: [0.7, -0.1] },
        { id: 'quartz', name: 'Quartz', species: 'crystal monster', role: 'finale', back: true, at: [0, 0.1] }],
      spots: [['bridgeBuilder', 0.6, 0.6], ['memoryMatch', -0.65, -0.5], ['shellSort', 0.0, -0.8]]
    },
    {
      n: 4, id: 'snowy-peaks', name: 'Snowy Peaks', biome: 'snow', w: 40, h: 46, seed: 'peaks', sandy: 0.2,
      tint: 'rgba(150,200,255,0.14)', palette: { ground: '#eef6fb', ground2: '#dcebf5', sand: '#cfe3f0', water: '#5db4e6', water2: '#8bcdf0' },
      deco: { T: 0.13, R: 0.05, '#': 0.03, f: 0.05 }, beachDeco: { T: 0.0, R: 0.04 },
      zone: { id: 'i4', kind: 'decorate', w: 6, h: 6, at: [-0.15, 0.1], label: 'Decorate Zone' },
      gate: { id: 'g4', name: 'Ice Bridge', subject: 'english', need: 3 },
      spawn: [0.1, 0.85], dock: [0.75, 0.9],
      npcs: [
        { id: 'waddle', name: 'Waddle', species: 'penguin', role: 'guide', at: [0.55, 0.3] },
        { id: 'snowy', name: 'Snowy', species: 'polar bear cub', role: 'challenge', at: [-0.7, -0.1] },
        { id: 'mittens', name: 'Mittens', species: 'fluffy white monster', role: 'finale', back: true, at: [0, 0.1] }],
      spots: [['kiteGlide', -0.6, 0.6], ['mathFishing', 0.65, -0.5], ['wordBuilder', 0.0, -0.8]]
    },
    {
      n: 5, id: 'sky-gardens', name: 'Sky Gardens', biome: 'sky', w: 42, h: 46, seed: 'sky', sandy: 0.15,
      tint: 'rgba(255,190,150,0.12)', palette: { ground: '#b9e48a', ground2: '#a8da78', sand: '#fdeccb', water: '#9fd6f5', water2: '#c4e8fa' },
      deco: { T: 0.11, R: 0.03, '#': 0, f: 0.14 }, beachDeco: { T: 0.0, R: 0.02 },
      zone: { id: 'i5', kind: 'decorate', w: 6, h: 6, at: [0.15, 0.1], label: 'Decorate Zone' },
      gate: { id: 'g5', name: 'Cloud Bridge', subject: 'math', need: 3 },
      spawn: [-0.1, 0.85], dock: [-0.75, 0.9],
      npcs: [
        { id: 'puff', name: 'Puff', species: 'cloud monster', role: 'guide', at: [-0.6, 0.3] },
        { id: 'zippy', name: 'Zippy', species: 'hummingbird', role: 'challenge', at: [0.7, -0.1] },
        { id: 'cumulus', name: 'Cumulus', species: 'big cloud gardener', role: 'finale', back: true, at: [0, 0.1] }],
      spots: [['patternGarden', 0.6, 0.6], ['kiteGlide', -0.65, -0.5], ['coconutHop', 0.0, -0.8]]
    },
    {
      n: 6, id: 'volcano-lab', name: 'Volcano Lab', biome: 'lab', w: 44, h: 46, seed: 'lab', sandy: 0.15,
      tint: 'rgba(255,170,90,0.12)', palette: { ground: '#d9b78c', ground2: '#cba478', sand: '#ecd3ab', water: '#4fb6c9', water2: '#7dd0dc' },
      deco: { T: 0.07, R: 0.07, '#': 0.04, f: 0.05 }, beachDeco: { T: 0.0, R: 0.05 },
      zone: { id: 'i6', kind: 'decorate', w: 6, h: 6, at: [-0.15, 0.1], label: 'Decorate Zone' },
      gate: { id: 'g6', name: 'Plank Bridge', subject: 'mix', need: 3 },
      spawn: [0.1, 0.85], dock: [0.75, 0.9],
      npcs: [
        { id: 'bubbles', name: 'Prof. Bubbles', species: 'round orange monster', role: 'guide', at: [0.55, 0.3] },
        { id: 'geo', name: 'Geo', species: 'gecko', role: 'challenge', at: [-0.7, -0.1] },
        { id: 'fizz', name: 'Fizz', species: 'little blue monster', role: 'finale', back: true, at: [0, 0.1] }],
      spots: [['bridgeBuilder', -0.6, 0.6], ['mathFishing', 0.65, -0.5], ['patternGarden', 0.0, -0.8]]
    }
  ];

  /* ------------------------------------------------------------------ builder */
  function cheb(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }

  function build(spec) {
    var w = spec.w, h = spec.h, r = RNG.make('island:' + spec.n + ':' + spec.seed);
    var gapTop = Math.floor(h * 0.33), gapBot = Math.ceil(h * 0.39);
    var lobes = {
      front: { cx: w / 2, cy: h * 0.68, rx: w * 0.43, ry: h * 0.28, p1: r() * 6.28, p2: r() * 6.28, y0: gapBot, y1: h - 2 },
      back: { cx: w / 2, cy: h * 0.19, rx: w * 0.34, ry: h * 0.12, p1: r() * 6.28, p2: r() * 6.28, y0: 1, y1: gapTop - 1 }
    };
    function inLobe(L, x, y) {
      if (x < 1 || x > w - 2 || y < L.y0 || y > L.y1) return false;
      var px = (x + 0.5 - L.cx) / L.rx, py = (y + 0.5 - L.cy) / L.ry, d = Math.sqrt(px * px + py * py), th = Math.atan2(py, px);
      return d <= (1 + 0.07 * Math.sin(3 * th + L.p1) + 0.04 * Math.sin(5 * th + L.p2)) * 0.97;
    }
    var g = [], x, y;
    for (y = 0; y < h; y++) { g.push([]); for (x = 0; x < w; x++) g[y].push(inLobe(lobes.front, x, y) || inLobe(lobes.back, x, y) ? '.' : '~'); }
    function land(x, y) { return y >= 0 && x >= 0 && y < h && x < w && g[y][x] !== '~'; }

    // bridge (gate): 2 columns in the middle
    var c0 = Math.floor(w / 2) - 1, cols = [c0, c0 + 1], bl = [], fl = [];
    cols.forEach(function (c) {
      var yb = 0, yf = h;
      for (y = 0; y < gapTop; y++) if (inLobe(lobes.back, c, y)) yb = y;
      for (y = h - 1; y >= gapBot; y--) if (inLobe(lobes.front, c, y)) yf = y;
      bl.push(yb); fl.push(yf);
    });
    var gTop = Math.min(bl[0], bl[1]) + 1, gBot = Math.max(fl[0], fl[1]) - 1;
    if (gBot - gTop + 1 < 2 || gBot - gTop + 1 > 9) throw new Error('island ' + spec.n + ': bad gap ' + (gBot - gTop + 1));
    var exitT = { x: cols[0], y: gTop - 1 }, approachT = { x: cols[0], y: gBot + 1 };

    // coast ring → sand
    var coast = [];
    for (y = 0; y < h; y++) { coast.push([]); for (x = 0; x < w; x++) {
      var isCoast = false;
      if (land(x, y)) for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) if (!land(x + dx, y + dy)) isCoast = true;
      coast[y].push(isCoast);
    } }
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) if (land(x, y)) {
      var ring2 = false;
      for (dy = -2; dy <= 2; dy++) for (dx = -2; dx <= 2; dx++) if (!land(x + dx, y + dy)) ring2 = true;
      if (coast[y][x] || (ring2 && r() < spec.sandy)) g[y][x] = 's';
    }
    var shore = function (x, y) { return land(x, y) && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(function (d) { return !land(x + d[0], y + d[1]); }); };
    // gate tiles
    var gateTiles = [];
    for (y = gTop; y <= gBot; y++) cols.forEach(function (c) { g[y][c] = 'g'; gateTiles.push({ x: c, y: y }); });
    [cols[0], cols[1]].forEach(function (c) { [exitT.y, approachT.y].forEach(function (yy) { if (g[yy][c] !== '~') g[yy][c] = '.'; }); });

    var reserved = {}, taken = [];
    function key(x, y) { return x + ',' + y; }
    function reserve(x, y, rad) { for (var yy = y - rad; yy <= y + rad; yy++) for (var xx = x - rad; xx <= x + rad; xx++) reserved[key(xx, yy)] = true; }
    function inRegion(side, x, y) { return side === 'front' ? y >= gapBot : y < gapTop; }
    function candidates(side, u, v, scale) {
      var L = lobes[side], tx = L.cx + u * L.rx * scale, ty = L.cy + v * L.ry * scale, out = [];
      for (var yy = 1; yy < h - 1; yy++) for (var xx = 1; xx < w - 1; xx++) if (inRegion(side, xx, yy)) {
        var dd = (xx - tx) * (xx - tx) + (yy - ty) * (yy - ty);
        out.push({ x: xx, y: yy, d: dd });
      }
      out.sort(function (a, b) { return a.d - b.d || a.y - b.y || a.x - b.x; });
      return out;
    }
    function placeAt(side, u, v, minD) {
      var list = candidates(side, u, v, 0.75);
      for (var i = 0; i < list.length; i++) {
        var c = list[i];
        if (g[c.y][c.x] !== '.' || reserved[key(c.x, c.y)]) continue;
        if (taken.some(function (t) { return cheb(t, c) < minD; })) continue;
        taken.push({ x: c.x, y: c.y }); reserve(c.x, c.y, 1);
        return { x: c.x, y: c.y };
      }
      throw new Error('island ' + spec.n + ': no room for POI at ' + u + ',' + v);
    }

    // zone (first: biggest)
    var Z = spec.zone, zc = candidates('front', Z.at[0], Z.at[1], 0.75), zone = null;
    for (var zi = 0; zi < zc.length && !zone; zi++) {
      var zx = zc[zi].x - Math.floor(Z.w / 2), zy = zc[zi].y - Math.floor(Z.h / 2), okz = true;
      for (y = zy - 1; y <= zy + Z.h && okz; y++) for (x = zx - 1; x <= zx + Z.w; x++) {
        if (y < gapBot + 1 || !land(x, y) || g[y][x] !== '.') { okz = false; break; }
      }
      if (okz) zone = { id: Z.id, kind: Z.kind, label: Z.label, x: zx, y: zy, w: Z.w, h: Z.h, sign: { x: zx + Math.floor(Z.w / 2), y: zy + Z.h } };
    }
    if (!zone) throw new Error('island ' + spec.n + ': no room for the build zone');
    for (y = zone.y; y < zone.y + zone.h; y++) for (x = zone.x; x < zone.x + zone.w; x++) g[y][x] = 'P';
    for (y = zone.y - 1; y <= zone.y + zone.h; y++) for (x = zone.x - 1; x <= zone.x + zone.w; x++) reserved[key(x, y)] = true;
    taken.push({ x: zone.sign.x, y: zone.sign.y });

    // dock: a true shore tile of the front lobe nearest the hint
    var dockList = candidates('front', spec.dock[0], spec.dock[1], 1.0), dock = null;
    for (var di = 0; di < dockList.length && !dock; di++) {
      var dc = dockList[di];
      if (g[dc.y][dc.x] === 's' && shore(dc.x, dc.y) && dc.y > gapBot + 3 && !reserved[key(dc.x, dc.y)]) dock = { x: dc.x, y: dc.y };
    }
    taken.push(dock); reserve(dock.x, dock.y, 1);
    var spawn = placeAt('front', spec.spawn[0], spec.spawn[1], 3);

    var npcs = spec.npcs.map(function (n) {
      var p = placeAt(n.back ? 'back' : 'front', n.at[0], n.at[1], 3);
      return { id: n.id, name: n.name, species: n.species, role: n.role, island: spec.n, back: !!n.back, x: p.x, y: p.y };
    });
    var spots = spec.spots.map(function (s) {
      var p = placeAt('front', s[1], s[2], 3);
      return { id: 'sp' + spec.n + '-' + s[0], game: s[0], island: spec.n, x: p.x, y: p.y };
    });
    var cols2 = COL.ofIsland(spec.n).map(function (c) {
      var side = c.side, p = null, md = 4, tries = 0;
      while (!p) {
        try {
          // random target, but make sure placeAt can still find room by relaxing the spacing
          p = placeAt(side, (r() * 2 - 1) * 1.1, (r() * 2 - 1) * 1.1, md);
        } catch (e) { p = null; }
        if (!p && ++tries % 6 === 0 && md > 2) md--;
        if (tries > 120) throw new Error('island ' + spec.n + ': no room for collectible ' + c.id);
      }
      return { id: c.id, side: side, x: p.x, y: p.y };
    });

    // path network (BFS to the nearest network tile)
    var PASS = '.sPp';
    var D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var nets = { front: {}, back: {} };
    function carve(from, side, mark) {
      var net = nets[side];
      if (net[key(from.x, from.y)]) return;
      var prev = {}, q = [from], seen = {}; seen[key(from.x, from.y)] = true; var hit = null;
      while (q.length && !hit) {
        var cur = q.shift();
        for (var k = 0; k < 4; k++) {
          var nx = cur.x + D4[k][0], ny = cur.y + D4[k][1], kk = key(nx, ny);
          if (seen[kk] || nx < 0 || ny < 0 || nx >= w || ny >= h || PASS.indexOf(g[ny][nx]) < 0 || !inRegion(side, nx, ny)) continue;
          seen[kk] = true; prev[kk] = cur;
          if (net[kk]) { hit = { x: nx, y: ny }; break; }
          q.push({ x: nx, y: ny });
        }
      }
      if (!hit) throw new Error('island ' + spec.n + ': cannot connect ' + from.x + ',' + from.y);
      var c = hit;
      while (c) {
        var kc = key(c.x, c.y);
        net[kc] = true; reserved[kc] = true;
        if (mark && g[c.y][c.x] === '.') g[c.y][c.x] = 'p';
        c = kc === key(from.x, from.y) ? null : prev[kc];
      }
    }
    nets.front[key(spawn.x, spawn.y)] = true;
    nets.back[key(exitT.x, exitT.y)] = true;
    carve(approachT, 'front', true);
    carve(zone.sign, 'front', true);
    carve(dock, 'front', true);
    npcs.filter(function (n) { return !n.back; }).forEach(function (n) { carve(n, 'front', true); });
    spots.forEach(function (s) { carve(s, 'front', true); });
    npcs.filter(function (n) { return n.back; }).forEach(function (n) { carve(n, 'back', true); });
    cols2.forEach(function (c) { carve(c, c.side, false); });
    [spawn, dock, approachT, exitT].forEach(function (p) { reserve(p.x, p.y, 1); });

    // decoration scatter (never on reserved / network tiles)
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      if (reserved[key(x, y)]) continue;
      var ch = g[y][x], roll = r();
      if (ch === '.') {
        var D = spec.deco, acc = 0;
        ['T', 'R', '#', 'f'].some(function (t) { acc += D[t]; if (roll < acc) { g[y][x] = t; return true; } return false; });
      } else if (ch === 's') {
        var B = spec.beachDeco;
        if (roll < B.T) g[y][x] = 'T'; else if (roll < B.T + B.R) g[y][x] = 'R';
      }
    }
    // the dock must stay a shore tile (never decorated) — it is reserved above

    var rows = g.map(function (row) { return row.join(''); });
    var gate = {
      id: spec.gate.id, key: spec.n + ':' + spec.gate.id, name: spec.gate.name, subject: spec.gate.subject, need: spec.gate.need,
      island: spec.n, x: cols[0], y: gTop, w: 2, h: gBot - gTop + 1, tiles: gateTiles, approach: approachT, exit: exitT
    };
    return {
      n: spec.n, id: spec.id, name: spec.name, biome: spec.biome, w: w, h: h, rows: rows, palette: spec.palette, tint: spec.tint,
      starReq: STAR_REQ[spec.n - 1], spawn: spawn, dock: dock, npcs: npcs, spots: spots, collectibles: cols2, zone: zone, gate: gate
    };
  }

  var list = SPECS.map(build), byId = {};
  list.forEach(function (i) { byId[i.n] = i; byId[i.id] = i; });

  /* ------------------------------------------------------------------ helpers */
  /** Path-grid for an island. open = gate opened (bridge walkable). extra(x,y) = dynamic blockers (placed build items). */
  function grid(isl, open, extra) {
    return PATH.fromRows(isl.rows, open ? '~TR#' : BLOCKED, extra);
  }
  /** All interactable things of an island: [{kind, id, x, y, ...}]. `collected` hides picked-up collectibles. */
  function objects(isl, collected) {
    var out = [];
    isl.npcs.forEach(function (n) { out.push({ kind: 'npc', id: n.id, x: n.x, y: n.y, ref: n }); });
    isl.spots.forEach(function (s) { out.push({ kind: 'spot', id: s.id, x: s.x, y: s.y, ref: s }); });
    isl.collectibles.forEach(function (c) { if (!(collected && collected[c.id])) out.push({ kind: 'collectible', id: c.id, x: c.x, y: c.y, ref: c }); });
    out.push({ kind: 'zone', id: isl.zone.id, x: isl.zone.sign.x, y: isl.zone.sign.y, ref: isl.zone });
    out.push({ kind: 'dock', id: 'dock' + isl.n, x: isl.dock.x, y: isl.dock.y, ref: isl.dock });
    out.push({ kind: 'gate', id: isl.gate.id, x: isl.gate.approach.x, y: isl.gate.approach.y, ref: isl.gate });
    return out;
  }
  /** Nearest interactable within INTERACT tiles of the world point (px, py), or null. `skip(kind,id)` filters. */
  function nearest(isl, px, py, collected, skip) {
    var best = null, bd = INTERACT * INTERACT;
    objects(isl, collected).forEach(function (o) {
      if (skip && skip(o.kind, o.id)) return;
      var dx = o.x + 0.5 - px, dy = o.y + 0.5 - py, d = dx * dx + dy * dy;
      if (d <= bd) { bd = d; best = o; }
    });
    return best;
  }
  /** Where the avatar enters an island (arrives by boat at the dock side). */
  function arrival(isl) { return { x: isl.spawn.x + 0.5, y: isl.spawn.y + 0.5 }; }

  /** Proof that the map is playable. Returns { ok, errors[] }. */
  function validate(n) {
    var isl = byId[n], errors = [];
    var closed = PATH.reach(grid(isl, false), isl.spawn.x, isl.spawn.y);
    var open = PATH.reach(grid(isl, true), isl.spawn.x, isl.spawn.y);
    function at(a, x, y) { return a[y * isl.w + x] === 1; }
    objects(isl).forEach(function (o) {
      var front = !(o.kind === 'npc' && o.ref.back) && !(o.kind === 'collectible' && o.ref.side === 'back');
      if (!at(open, o.x, o.y)) errors.push(o.kind + ' ' + o.id + ' unreachable with the gate open');
      if (front && !at(closed, o.x, o.y)) errors.push(o.kind + ' ' + o.id + ' (front) unreachable before the gate');
      if (!front && at(closed, o.x, o.y)) errors.push(o.kind + ' ' + o.id + ' (back) reachable without the gate');
    });
    if (!at(closed, isl.gate.approach.x, isl.gate.approach.y)) errors.push('gate approach unreachable');
    if (!at(open, isl.gate.exit.x, isl.gate.exit.y)) errors.push('gate exit unreachable');
    var z = isl.zone;
    for (var y = z.y; y < z.y + z.h; y++) for (var x = z.x; x < z.x + z.w; x++) if (!at(closed, x, y)) errors.push('zone tile ' + x + ',' + y + ' unreachable');
    if (isl.rows.length !== isl.h || isl.rows.some(function (r) { return r.length !== isl.w; })) errors.push('bad row sizes');
    if (isl.spots.length < 2 || isl.spots.length > 3) errors.push('spots count');
    if (isl.collectibles.length !== 12) errors.push('collectibles count');
    return { ok: errors.length === 0, errors: errors };
  }

  return {
    list: list, byId: byId, SPECS: SPECS, BLOCKED: BLOCKED, INTERACT: INTERACT, STAR_REQ: STAR_REQ, COUNT: list.length,
    grid: grid, objects: objects, nearest: nearest, arrival: arrival, validate: validate
  };
});
