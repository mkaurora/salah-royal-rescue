/* Machines logic: level parsing, gear solver, tick-based chain-reaction simulation, scoring.
 * Pure (browser + Node). No DOM.
 *
 * Grid is a side view. Map legend:
 *   '#' solid wood block   '=' conveyor belt (solid, moves when driven by gears)
 *   'r' fixed ramp rolling right   'l' fixed ramp rolling left   'W' log (blocks, a wedge splits it)
 *   'G' goal   'o' empty part slot (ramp / wedge)   'v' lever slot (centre of a 3-wide seesaw)
 *   'b' ball   '>' ball rolling right   '<' ball rolling left   'x' heavy box
 * Extra: level.items [{kind,x,y,vx}], level.motor {x,y}, level.pegs [{id,x,y,fixed?,belt?}],
 *        level.pulley {hook:[x,y], bucket:[x,top,bottom], plat:[x,bottom,top]}.
 * Placements: [{ slot: id, part: 'ramp'|'wedge'|'gearS'|'gearB'|'lever'|'pulley'|'wheels', dir?: 1|-1 }]
 */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.logic = root.LE.logic || {}; root.LE.logic.machines = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TEETH = { gearS: 8, gearB: 16 };
  var MOTOR_TEETH = 16;
  var PART_SLOT = { ramp: 'cell', wedge: 'cell', gearS: 'peg', gearB: 'peg', lever: 'lever', pulley: 'hook', wheels: 'wheels' };
  var ROTATABLE = { ramp: true, wedge: true };
  var LAUNCH = 3;          // rows a lever launches an item
  var FLING = 2;           // cells a fast belt throws an item
  var MAX_TICKS = 90;
  var MESH_TOL = 0.1;

  function key(x, y) { return x + ',' + y; }

  /* ---------- Parsing ---------- */
  function parse(level) {
    var rows = level.map, H = rows.length, W = rows[0].length;
    var cells = [], ramps = {}, logs = {}, belts = {}, goal = null, items = [], slots = [];
    for (var y = 0; y < H; y++) {
      cells.push([]);
      for (var x = 0; x < W; x++) {
        var c = rows[y].charAt(x) || '.', k = key(x, y), t = '.';
        if (c === '#') t = '#';
        else if (c === '=') { t = '='; belts[k] = true; }
        else if (c === 'r') ramps[k] = 1;
        else if (c === 'l') ramps[k] = -1;
        else if (c === 'W') logs[k] = true;
        else if (c === 'G') goal = { x: x, y: y };
        else if (c === 'o') slots.push({ id: k, kind: 'cell', x: x, y: y });
        else if (c === 'v') slots.push({ id: k, kind: 'lever', x: x, y: y });
        else if (c === 'b' || c === '>' || c === '<') items.push({ kind: 'ball', x: x, y: y, vx: c === '>' ? 1 : c === '<' ? -1 : 0 });
        else if (c === 'x') items.push({ kind: 'box', x: x, y: y, vx: 0 });
        cells[y].push(t);
      }
    }
    (level.items || []).forEach(function (it) { items.push({ kind: it.kind, x: it.x, y: it.y, vx: it.vx || 0 }); });
    items.forEach(function (it, i) { it.id = i; });
    if (level.tray && level.tray.wheels) {
      var bi = 0;
      items.forEach(function (it) { if (it.kind === 'box') { slots.push({ id: 'w' + bi, kind: 'wheels', x: it.x, y: it.y, item: it.id }); bi++; } });
    }
    (level.pegs || []).forEach(function (p) { if (!p.fixed) slots.push({ id: p.id, kind: 'peg', x: p.x, y: p.y, belt: !!p.belt }); });
    if (level.pulley) slots.push({ id: 'hook', kind: 'hook', x: level.pulley.hook[0], y: level.pulley.hook[1] });
    var byId = {};
    slots.forEach(function (s) { byId[s.id] = s; });
    return { W: W, H: H, cells: cells, ramps: ramps, logs: logs, belts: belts, goal: goal, items: items, slots: slots, slotById: byId };
  }

  /** Keep only valid placements (known slot, right kind, within tray counts, one per slot). */
  function normalize(level, placements, parsed) {
    var p = parsed || parse(level);
    var tray = level.tray || {};
    var used = {}, taken = {}, out = [];
    (placements || []).forEach(function (pl) {
      if (!pl || typeof pl.slot !== 'string' || typeof pl.part !== 'string') return;
      var s = p.slotById[pl.slot];
      if (!s || PART_SLOT[pl.part] !== s.kind || taken[pl.slot]) return;
      if ((used[pl.part] || 0) >= (tray[pl.part] || 0)) return;
      used[pl.part] = (used[pl.part] || 0) + 1;
      taken[pl.slot] = true;
      var o = { slot: pl.slot, part: pl.part };
      if (ROTATABLE[pl.part]) o.dir = pl.dir === -1 ? -1 : 1;
      out.push(o);
    });
    return out;
  }

  /* ---------- Gears ---------- */
  /** nodes: [{x,y,teeth}], node 0 is the motor (turns clockwise = +1, speed 1).
   *  Gears mesh when their centres are 1 cell apart. Returns { dir[], speed[], connected[], jam }. */
  function solveGears(nodes) {
    var n = nodes.length, dir = [], speed = [], connected = [], jam = false;
    for (var i = 0; i < n; i++) { dir.push(0); speed.push(0); connected.push(false); }
    if (!n) return { dir: dir, speed: speed, connected: connected, jam: false };
    var adj = nodes.map(function () { return []; });
    for (i = 0; i < n; i++) for (var j = i + 1; j < n; j++) {
      var d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
      if (Math.abs(d - 1) < MESH_TOL) { adj[i].push(j); adj[j].push(i); }
    }
    dir[0] = 1; speed[0] = 1; connected[0] = true;
    var queue = [0];
    while (queue.length) {
      var c = queue.shift();
      adj[c].forEach(function (nb) {
        var want = -dir[c];
        if (connected[nb]) { if (dir[nb] !== want) jam = true; return; }
        connected[nb] = true; dir[nb] = want;
        speed[nb] = speed[c] * nodes[c].teeth / nodes[nb].teeth;
        queue.push(nb);
      });
    }
    if (jam) for (i = 0; i < n; i++) if (connected[i]) { speed[i] = 0; }
    return { dir: dir, speed: speed, connected: connected, jam: jam, adj: adj };
  }

  /** Gear system of a level with placements → { gears:[{id,x,y,size,teeth,dir,speed,connected,motor,belt}], jam, belt } */
  function gearState(level, placements) {
    if (!level.motor) return { gears: [], jam: false, belt: null };
    var byslot = {};
    (placements || []).forEach(function (p) { byslot[p.slot] = p; });
    var nodes = [{ id: 'motor', x: level.motor.x, y: level.motor.y, teeth: MOTOR_TEETH, size: 'gearB', motor: true }];
    (level.pegs || []).forEach(function (p) {
      var size = p.fixed ? (p.fixed === 'S' ? 'gearS' : 'gearB') : (byslot[p.id] && byslot[p.id].part);
      if (size !== 'gearS' && size !== 'gearB') return;
      nodes.push({ id: p.id, x: p.x, y: p.y, teeth: TEETH[size], size: size, belt: !!p.belt, fixed: !!p.fixed });
    });
    var r = solveGears(nodes);
    var belt = { running: false, dir: 0, speed: 0 };
    nodes.forEach(function (nd, i) {
      nd.dir = r.jam ? 0 : r.dir[i]; nd.speed = r.speed[i]; nd.connected = r.connected[i];
      if (nd.belt && r.connected[i] && !r.jam) belt = { running: true, dir: r.dir[i], speed: r.speed[i] };
    });
    var hasBelt = (level.pegs || []).some(function (p) { return p.belt; });
    return { gears: nodes, jam: r.jam, belt: hasBelt ? belt : null };
  }

  /* ---------- Simulation ---------- */
  function simulate(level, placements, opts) {
    opts = opts || {};
    var P = parse(level);
    var pl = normalize(level, placements, P);
    var byslot = {};
    pl.forEach(function (p) { byslot[p.slot] = p; });
    var W = P.W, H = P.H;
    var gs = gearState(level, pl);
    var belt = gs.belt || { running: false, dir: 0, speed: 0 };

    var ramps = {}, k;
    for (k in P.ramps) ramps[k] = P.ramps[k];
    var wedges = {}, levers = [], logs = {};
    for (k in P.logs) logs[k] = true;
    pl.forEach(function (p) {
      var s = P.slotById[p.slot];
      if (p.part === 'ramp') ramps[key(s.x, s.y)] = p.dir;
      else if (p.part === 'wedge') wedges[key(s.x, s.y)] = p.dir;
      else if (p.part === 'lever') levers.push({ cx: s.x, cy: s.y, tilt: 0 });
    });
    var items = P.items.map(function (it) {
      var o = { id: it.id, kind: it.kind, x: it.x, y: it.y, vx: it.vx, rise: 0, fly: 0, done: false, lost: false };
      return o;
    });
    P.slots.forEach(function (s) { if (s.kind === 'wheels' && byslot[s.id]) items[s.item].kind = 'cart'; });

    var pul = null;
    if (level.pulley) {
      var lp = level.pulley;
      var wheel = !!byslot.hook;
      pul = { wheel: wheel, bx: lp.bucket[0], btop: lp.bucket[1], bbot: lp.bucket[2], px: lp.plat[0], pbot: lp.plat[1], ptop: lp.plat[2],
        by: wheel ? lp.bucket[1] : lp.bucket[2], py: lp.plat[1], moving: false, started: false };
    }

    var events = [], frames = [], tick = 0, success = false;
    var flags = { bumpLog: false, bumpBox: false, lost: false };

    function ev(type, data) { var e = { t: tick, type: type }; if (data) for (var q in data) e[q] = data[q]; events.push(e); }
    function rolls(it) { return it.kind === 'ball' || it.kind === 'cart'; }
    function solid(x, y) {
      if (x < 0 || x >= W || y < 0) return true;
      if (y >= H) return false;
      return P.cells[y][x] !== '.';
    }
    function leverCenter(x, y) { for (var i = 0; i < levers.length; i++) if (levers[i].cx === x && levers[i].cy === y) return levers[i]; return null; }
    function leverEnd(x, y) {
      for (var i = 0; i < levers.length; i++) { var L = levers[i]; if (L.cy === y && Math.abs(L.cx - x) === 1) return L; }
      return null;
    }
    function itemAt(x, y, except) {
      for (var i = 0; i < items.length; i++) { var it = items[i]; if (it !== except && !it.lost && it.x === x && it.y === y) return it; }
      return null;
    }
    function hard(x, y) { // blocks movement / supports from below
      return solid(x, y) || logs[key(x, y)] || wedges[key(x, y)] !== undefined || !!leverCenter(x, y);
    }
    function inBucket(it) { return pul && it.x === pul.bx && it.y === pul.by; }
    function onPlat(it) { return pul && it.x === pul.px && it.y === pul.py; }
    function supported(it) {
      var x = it.x, y = it.y;
      if (inBucket(it) || onPlat(it) || leverEnd(x, y) || ramps[key(x, y)] !== undefined) return true;
      if (y + 1 >= H) return false;
      if (hard(x, y + 1)) return true;
      return !!itemAt(x, y + 1, it);
    }
    function arrived(it) {
      if (pul && pul.wheel && !pul.started && inBucket(it)) {
        pul.started = true; pul.moving = true; it.vx = 0; ev('bucket', { id: it.id });
      }
    }
    function bump(it, what) {
      ev('bump', { id: it.id, what: what || 'wall', x: it.x + it.vx, y: it.y });
      if (what === 'log') flags.bumpLog = true;
      if (what === 'box') flags.bumpBox = true;
      it.vx = 0; it.fly = 0;
      return true;
    }
    function moveH(it) {
      if (!it.vx) return false;
      var nx = it.x + it.vx, y = it.y;
      if (nx < 0 || nx >= W) return bump(it, 'wall');
      var wk = key(nx, y);
      if (wedges[wk] !== undefined) {
        var lk = key(nx + it.vx, y);
        if (wedges[wk] === it.vx && logs[lk]) {
          delete logs[lk]; delete wedges[wk];
          ev('split', { id: it.id, x: nx + it.vx, y: y, wx: nx });
          it.x = nx; arrived(it);
          return true;
        }
        return bump(it, 'wedge');
      }
      if (logs[wk]) return bump(it, 'log');
      if (hard(nx, y)) return bump(it, 'wall');
      var other = itemAt(nx, y, it);
      if (other) {
        if (other.done) return bump(it, 'item');
        if (rolls(other) && other.vx !== it.vx) {
          other.vx = it.vx; ev('push', { id: it.id, other: other.id });
          it.vx = 0; it.fly = 0;
          return true;
        }
        if (!rolls(other)) return bump(it, 'box');
        return false;
      }
      it.x = nx;
      arrived(it);
      return true;
    }
    function freeUp(x, y) { return y >= 0 && !hard(x, y) && !itemAt(x, y); }

    function updateItem(it) {
      if (it.done || it.lost) return false;
      var x = it.x, y = it.y;
      if (it.rise > 0) {
        if (freeUp(x, y - 1)) { it.y--; it.rise--; if (!it.rise) it.fly = 1; return true; }
        it.rise = 0; it.fly = 1; return true;
      }
      if (pul && (inBucket(it) || onPlat(it))) {
        if (pul.moving) return false;
        if (inBucket(it)) { it.vx = 0; return false; }
      }
      var ramp = ramps[key(x, y)];
      if (ramp !== undefined && it.fly <= 0) {
        if (!rolls(it)) return false;
        var turned = it.vx !== ramp;
        it.vx = ramp;
        return moveH(it) || turned;
      }
      if (it.fly > 0) {
        it.fly--;
        var mv = moveH(it);
        if (!mv) it.fly = 0;
        return mv;
      }
      if (!supported(it)) {
        it.y++;
        if (it.y >= H) { it.lost = true; flags.lost = true; ev('lost', { id: it.id }); return true; }
        var L = leverEnd(it.x, it.y);
        if (L) {
          var side = it.x - L.cx, ox = L.cx - side;
          var o = itemAt(ox, L.cy, it);
          L.tilt = side; it.vx = 0;
          if (o && !o.done) { o.rise = LAUNCH; o.vx = -side; o.fly = 0; ev('lever', { id: it.id, other: o.id }); }
          else ev('tilt', { id: it.id });
        }
        if (!supported(it)) return true;
        ev('land', { id: it.id, x: it.x, y: it.y });
        arrived(it);
        return true;
      }
      if (P.belts[key(x, y + 1)] && belt.running) {
        it.vx = belt.dir;
        var m = moveH(it);
        if (m && it.x !== x && !P.belts[key(it.x, it.y + 1)] && belt.speed > 1) { it.fly = FLING; ev('fling', { id: it.id }); }
        return m;
      }
      if (rolls(it) && it.vx) return moveH(it);
      return false;
    }

    function stepMachines() {
      if (!pul || !pul.moving) return false;
      if (pul.by >= pul.bbot || pul.py <= pul.ptop) { pul.moving = false; ev('pulleyStop'); return false; }
      var riders = items.filter(function (it) { return !it.lost && !it.done && (inBucket(it) || onPlat(it)); });
      var bRiders = riders.filter(inBucket), pRiders = riders.filter(onPlat);
      pul.by++; pul.py--;
      bRiders.forEach(function (it) { it.y++; });
      pRiders.forEach(function (it) { it.y--; });
      ev('pulley');
      return true;
    }
    function checkGoal() {
      if (!P.goal) return;
      items.forEach(function (it) {
        if (it.done || it.lost || it.x !== P.goal.x || it.y !== P.goal.y) return;
        var gk = level.goalKind;
        var kindOk = !gk || gk === it.kind || (gk === 'box' && it.kind === 'cart');
        if (kindOk) { it.done = true; success = true; ev('goal', { id: it.id }); }
      });
    }
    function snap() {
      return {
        items: items.map(function (it) { return { id: it.id, kind: it.kind, x: it.x, y: it.y, done: it.done, lost: it.lost, rise: it.rise, fly: it.fly }; }),
        logs: Object.keys(logs), wedges: Object.keys(wedges),
        levers: levers.map(function (L) { return L.tilt; }),
        bucketY: pul ? pul.by : null, platY: pul ? pul.py : null
      };
    }

    // initial lever tilt: towards an item resting on an end
    levers.forEach(function (L) {
      if (itemAt(L.cx - 1, L.cy)) L.tilt = -1;
      else if (itemAt(L.cx + 1, L.cy)) L.tilt = 1;
    });
    if (gs.jam) ev('jam');
    frames.push(snap());
    checkGoal();
    var stable = 0;
    while (!success && tick < MAX_TICKS) {
      tick++;
      var changed = stepMachines();
      for (var i = 0; i < items.length; i++) if (updateItem(items[i])) changed = true;
      checkGoal();
      frames.push(snap());
      if (success) break;
      if (!changed) { if (++stable >= 2) { frames.pop(); break; } } else stable = 0;
    }

    var reason = null;
    if (!success) {
      var boxStuck = items.some(function (it) { return it.kind === 'box' && ramps[key(it.x, it.y)] !== undefined; });
      if (gs.jam) reason = 'jam';
      else if (gs.belt && !gs.belt.running) reason = 'belt';
      else if (flags.lost) reason = 'lost';
      else if (flags.bumpLog) reason = 'log';
      else if (boxStuck) reason = 'boxstuck';
      else if (flags.bumpBox) reason = 'box';
      else if (pul && !pul.wheel) reason = 'pulley';
      else reason = 'stuck';
    }
    return { success: success, frames: frames, events: events, ticks: frames.length - 1, gears: gs, belt: gs.belt, reason: reason, placements: pl };
  }

  /* ---------- Scoring ---------- */
  function par(level) { return level.par || (level.solution || []).length; }
  /** 3 stars: parts used <= par, 2 stars: par + 1, 1 star: more. 0 if not solved. */
  function score(level, placements, result) {
    result = result || simulate(level, placements);
    if (!result.success) return 0;
    var n = normalize(level, placements).length, p = par(level);
    return n <= p ? 3 : n <= p + 1 ? 2 : 1;
  }
  function check(level, placements) {
    var result = simulate(level, placements);
    return { ok: result.success, stars: score(level, placements, result), result: result };
  }
  function clonePl(pl) { return JSON.parse(JSON.stringify(pl || [])); }

  return {
    TEETH: TEETH, MOTOR_TEETH: MOTOR_TEETH, PART_SLOT: PART_SLOT, ROTATABLE: ROTATABLE, LAUNCH: LAUNCH, FLING: FLING,
    key: key, parse: parse, normalize: normalize, solveGears: solveGears, gearState: gearState,
    simulate: simulate, score: score, check: check, par: par, clonePl: clonePl
  };
});
