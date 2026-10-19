/* Little Engineer — "show me with the helper": the voice helper (ElevenLabs agent) can point, draw arrows,
 * highlight and place pieces step by step on Salah's own board while it talks.
 *  - Pure helpers (node-testable): boardOf, describeBoard, groupSteps, describeMove, label, targetList, contextText.
 *  - Browser: LE.aiDemo.create(opts) → { tools, context(), clear(), stop() } — the client tools for the agent.
 * The board snapshot / exact restore and "no stars" live in app.js (playLevel); this file never saves anything. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.LE = root.LE || {}; root.LE.aiDemo = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PARTS = { ramp: 'Ramp', wedge: 'Wedge', gearS: 'Small gear', gearB: 'Big gear', lever: 'Seesaw', pulley: 'Pulley', wheels: 'Wheels' };
  var TILES = { I: 'Wire', C: 'Corner', T: 'Split', X: 'Cross', P: 'Lamp', B: 'Battery', M: 'Fan', S: 'Switch' };
  var BLOCKS = { F: 'Forward', L: 'Turn left', R: 'Turn right', rep: 'Repeat', ifw: 'If wall' };
  var BUILD = { found: 'Foundation', walls: 'Walls', door: 'Door', roof: 'Roof', win: 'Windows', windows: 'Windows' };
  var BTNS = { U: 'Up', D: 'Down', L: 'Left', R: 'Right', up: 'Up', down: 'Down', left: 'Left', right: 'Right' };
  var GO = { Go: 'the Go button', Play: 'the Play button' };

  function human(s) { s = String(s || ''); return s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); }); }

  /** Friendly name for a target id (what the helper may say about it). */
  function label(key, world, goLabel) {
    key = String(key || '');
    var m = /^([a-z]+)(?::(.*))?$/.exec(key);
    if (!m) return key;
    var kind = m[1], arg = m[2];
    if (kind === 'go') return GO[goLabel || (world === 'robot' ? 'Play' : 'Go')] || 'the Go button';
    if (kind === 'tray' && arg === undefined) return 'the tray';
    if (kind === 'tray') {
      var n = world === 'machines' ? PARTS[arg] : world === 'circuits' ? TILES[arg] : world === 'robot' ? BLOCKS[arg] : world === 'construction' ? BUILD[arg] : null;
      return 'the ' + (n || human(arg)) + ' in the tray';
    }
    if (kind === 'tool') return 'the ' + human(arg) + ' tool';
    if (kind === 'node') return 'the bolt at ' + arg;
    if (kind === 'beam') return 'the beam ' + arg;
    if (kind === 'slot') return world === 'robot' ? 'the space inside the Repeat block' : world === 'construction' ? 'the ' + (BUILD[arg] || human(arg)) + ' spot' : 'spot ' + arg;
    if (kind === 'cell') return 'square ' + arg;
    if (kind === 'block') return 'block ' + (parseInt(String(arg).split('.')[0], 10) + 1 || arg) + ' in the program';
    if (kind === 'count') return 'the number on the Repeat block';
    if (kind === 'pick') return 'number ' + arg;
    if (kind === 'btn') return 'the ' + (BTNS[arg] || human(arg)) + ' button';
    if (kind === 'strip') return 'the program strip';
    if (kind === 'clear') return 'the Clear button';
    if (kind === 'restart') return 'the Start again button';
    return 'the ' + human(kind);
  }

  /** The view's live board as a plain object (each view has its own getter). */
  function boardOf(inst) {
    if (!inst) return null;
    if (inst.getBeams) return { beams: inst.getBeams() };
    if (inst.getPlacements) return { placements: inst.getPlacements() };
    if (inst.getProgram) return { program: inst.getProgram() };
    if (inst.getState) return { state: inst.getState() };
    return null;
  }

  function progText(list) {
    return (list || []).map(function (b) {
      var n = BLOCKS[b.t] || b.t;
      if (b.t === 'rep') return 'Repeat ' + (b.n || 2) + ' times [' + progText(b.body) + ']';
      if (b.t === 'ifw') return 'If wall [' + progText(b.body) + ']';
      return n;
    }).join(', ');
  }

  /** Short words for what is on the board now. */
  function describeBoard(world, board) {
    if (!board) return 'nothing yet';
    if (world === 'bridges') {
      var bs = board.beams || [];
      return bs.length ? bs.length + ' beams: ' + bs.map(function (s) { return /^s:/.test(s) ? s.slice(2) + ' (steel)' : s + ' (wood)'; }).join('; ') : 'no beams yet';
    }
    if (world === 'machines') {
      var pl = board.placements || [];
      return pl.length ? pl.map(function (p) { return (PARTS[p.part] || p.part) + ' on spot ' + p.slot + (p.dir && p.dir < 0 ? ' (flipped)' : ''); }).join('; ') : 'no parts placed yet';
    }
    if (world === 'robot') {
      var pr = board.program || [];
      return pr.length ? 'program: ' + progText(pr) : 'the program is empty';
    }
    var st = board.state || {};
    if (world === 'circuits') {
      var placed = st.placed || [];
      return placed.length ? placed.map(function (t) { return (TILES[t.t] || t.t) + ' at ' + t.x + ',' + t.y + (t.r ? ' turned ' + t.r : ''); }).join('; ') : 'no tiles placed yet';
    }
    if (world === 'construction') {
      var parts = [];
      if (st.stage !== undefined) parts.push('working on stage ' + (st.stage + 1));
      if (st.won) parts.push('finished');
      return parts.join(', ') || 'just started';
    }
    var j = JSON.stringify(board);
    return j.length > 400 ? j.slice(0, 400) + '…' : j;
  }

  /** A "lead" step (pick a tool, open the number picker) belongs with the step after it. */
  function isLead(st) { return !st.to && /^(tool:|count:)/.test(st.from || ''); }

  /** Group Show me steps into kid-sized moves: one piece placed (with its tool pick / turns / flips). */
  function groupSteps(steps) {
    var moves = [], cur = [];
    (steps || []).forEach(function (st, i) {
      var from = st.from || '';
      if (!cur.length && moves.length && !st.to && from) {
        var lm = moves[moves.length - 1], last = lm[lm.length - 1];
        // a tap on the piece just placed (turn a tile, flip a part) is part of placing it
        var onIt = (last.to && last.to === from) || (!last.to && last.from === from && /^(cell|slot):/.test(from));
        // trailing tool reset (Bridges: back to wood at the end)
        var trailingTool = /^tool:/.test(from) && i === steps.length - 1;
        if (onIt || trailingTool) { lm.push(st); return; }
      }
      cur.push(st);
      if (isLead(st) && i < steps.length - 1) return;
      moves.push(cur); cur = [];
    });
    if (cur.length) moves.push(cur);
    return moves;
  }

  function describeStep(st, world, goLabel) {
    if (st.from && st.to) {
      if (/^tray/.test(st.to) && !/^tray/.test(st.from)) return 'take away ' + label(st.from, world, goLabel);
      return 'drag ' + label(st.from, world, goLabel) + ' to ' + label(st.to, world, goLabel);
    }
    if (st.from) {
      if (/^tool:erase/.test(st.from)) return 'pick the Erase tool';
      return 'tap ' + label(st.from, world, goLabel);
    }
    return st.say ? String(st.say) : '';
  }
  function describeMove(move, world, goLabel) {
    return (move || []).map(function (s) { return describeStep(s, world, goLabel); }).filter(Boolean).join(', then ');
  }

  /** Target ids the helper may use: everything the remaining moves touch, plus Go. */
  function targetList(moves, world, opts) {
    opts = opts || {};
    var seen = {}, out = [];
    function add(k) { if (k && !seen[k] && out.length < 24) { seen[k] = 1; out.push(k); } }
    (moves || []).forEach(function (mv) { mv.forEach(function (st) { add(st.from); add(st.to); }); });
    (opts.extra || []).forEach(add);
    if (!opts.noGo) add(opts.goKey || 'go');
    return out;
  }

  /** The text the agent gets (dynamic variables at the start and contextual updates on change). */
  function contextText(info) {
    var world = info.world, moves = info.moves || [], goLabel = info.goLabel;
    var steps = moves.length
      ? moves.slice(0, 10).map(function (mv, i) { return (i + 1) + '. ' + describeMove(mv, world, goLabel); }).join(' ') + (moves.length > 10 ? ' (+' + (moves.length - 10) + ' more)' : '')
      : (info.won ? 'none: it is solved.' : info.noGo ? 'none: every piece is in place.' : 'none: every piece is in place, now press ' + label('go', world, goLabel) + '.');
    var targets = (info.targets || []).map(function (k) { return k + ' = ' + label(k, world, goLabel); }).join('; ');
    return { board: describeBoard(world, info.board), steps: steps, targets: targets || 'none', count: moves.length };
  }
  function updateText(info) {
    var c = contextText(info);
    return 'BOARD UPDATE. Board now: ' + c.board + '. Steps still needed (' + c.count + '): ' + c.steps + ' Target ids: ' + c.targets;
  }

  /* ---------- Browser: marks overlay + the client tools ---------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function rectOf(t) {
    if (!t) return null;
    if (t.getBoundingClientRect) t = t.getBoundingClientRect();
    if (t.width !== undefined && t.left !== undefined) return { x: t.left + t.width / 2, y: t.top + t.height / 2, w: Math.max(t.width, 36), h: Math.max(t.height, 36) };
    if (t.x !== undefined) return { x: t.x, y: t.y, w: 48, h: 48 };
    return null;
  }

  /** opts: { getInst(), world, level, alive(), wait(ms), hand, onResultHook(fn) , onChange() }
   *  Tools resolve to short strings for the agent. They run one at a time. */
  function create(opts) {
    var LE = (typeof self !== 'undefined' && self.LE) || {};
    var hand = opts.hand || LE.hand, wait = opts.wait || function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var doc = opts.document || document;
    var layer = null, svg = null, marks = [], queue = Promise.resolve(), stopped = false, log = [];
    var world = opts.world;
    function inst() { return opts.getInst(); }
    function alive() { return !stopped && (!opts.alive || opts.alive()); }
    function goLabel() { var i = inst(); return i && i.goLabel; }

    function ensureLayer() {
      if (layer && layer.parentNode) return;
      layer = doc.createElement('div');
      layer.className = 'ai-marks';
      svg = doc.createElementNS(SVGNS, 'svg');
      svg.setAttribute('class', 'ai-arrows');
      svg.innerHTML = '<defs><marker id="ai-arrowhead" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#ff5a36"/></marker></defs>';
      layer.appendChild(svg);
      doc.body.appendChild(layer);
    }
    function clear() {
      marks.forEach(function (m) { if (m.parentNode) m.parentNode.removeChild(m); });
      marks = [];
    }

    function steps() { var i = inst(); return (i && i.showMe && i.showMe({ fromCurrent: true })) || []; }
    function moves() { return groupSteps(steps()); }
    function knownTargets(mv) {
      var i = inst();
      return targetList(mv || moves(), world, { noGo: i && i.noGo, goKey: i && i.goKey });
    }
    /** Accept an exact id, or something close ("ramp", "Go", "go button", "the seesaw"). */
    function resolve(t) {
      var i = inst();
      if (!i || !t) return null;
      t = String(t).trim();
      if (i.target(t)) return t;
      var low = t.toLowerCase().replace(/^the\s+/, '').replace(/\s+(button|piece|block|tile|part)$/, '');
      var ids = knownTargets();
      for (var k = 0; k < ids.length; k++) if (ids[k].toLowerCase() === low) return ids[k];
      for (k = 0; k < ids.length; k++) if (label(ids[k], world, goLabel()).toLowerCase().indexOf(low) >= 0 && i.target(ids[k])) return ids[k];
      if (/^(go|play|start)$/.test(low) && !i.noGo) return i.goKey || 'go';
      return null;
    }
    function where(key) { var i = inst(); return rectOf(i && i.target(key)); }
    function unknown(t) { return 'I could not find "' + t + '". Use one of these target ids: ' + knownTargets().join(', ') + '.'; }

    function ring(key) {
      var r = where(key);
      if (!r) return false;
      ensureLayer();
      var d = doc.createElement('div');
      d.className = 'ai-ring';
      var s = Math.max(r.w, r.h) + 18;
      d.style.cssText = 'left:' + (r.x - s / 2) + 'px;top:' + (r.y - s / 2) + 'px;width:' + s + 'px;height:' + s + 'px';
      layer.appendChild(d);
      marks.push(d);
      return true;
    }
    function arrow(a, b) {
      var p = where(a), q = where(b);
      if (!p || !q) return false;
      ensureLayer();
      var dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
      // stop short of both ends so the arrow does not hide the pieces; bow it a little
      var sa = Math.min(len * 0.25, Math.min(p.w, p.h) * 0.45), sb = Math.min(len * 0.25, Math.min(q.w, q.h) * 0.45 + 6);
      var x1 = p.x + dx / len * sa, y1 = p.y + dy / len * sa, x2 = q.x - dx / len * sb, y2 = q.y - dy / len * sb;
      var cx = (x1 + x2) / 2 - dy / len * len * 0.18, cy = (y1 + y2) / 2 + dx / len * len * 0.18;
      var path = doc.createElementNS(SVGNS, 'path');
      path.setAttribute('d', 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' Q' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1));
      path.setAttribute('class', 'ai-arrow');
      path.setAttribute('marker-end', 'url(#ai-arrowhead)');
      svg.appendChild(path);
      marks.push(path);
      return true;
    }

    function serial(name, fn) {
      return function (params) {
        var p = queue.then(function () {
          if (!alive()) return 'The call has ended.';
          return Promise.resolve(fn(params || {})).catch(function (e) { return 'That did not work (' + ((e && e.message) || e) + ').'; });
        }).then(function (res) {
          log.push({ tool: name, params: params || {}, result: res });
          if (opts.onTool) opts.onTool(name, params || {}, res);
          return res;
        });
        queue = p.catch(function () {});
        return p;
      };
    }

    async function waitIdle(ms) {
      var t0 = Date.now(), i;
      while ((i = inst()) && i.busy && Date.now() - t0 < (ms || 8000) && alive()) await wait(120);
    }
    async function runMove(mv) {
      var i = inst();
      for (var k = 0; k < mv.length && alive(); k++) {
        var st = mv[k];
        if (st.from && st.to) await hand.drag(function () { return i.target(st.from); }, function () { return i.target(st.to); }, i.ghost && i.ghost(st.from));
        else if (st.from) { await hand.moveTo(function () { return i.target(st.from); }, 450); await hand.tap(); }
        if (!alive()) return;
        if (st.apply) st.apply();
        await wait(st.pause || 300);
      }
      await waitIdle();
    }
    async function pressGo() {
      var i = inst(), goKey = i.goKey || 'go';
      var result = new Promise(function (resolve) { opts.onResult(resolve); });
      await hand.moveTo(function () { return i.target(goKey); }, 450);
      await hand.tap();
      hand.hide();
      if (opts.going) opts.going(true);
      if (i.go) i.go(); else { var g = opts.host && opts.host.querySelector('.go-btn'); if (g) g.click(); }
      var r = await Promise.race([result, wait(30000).then(function () { return 'timeout'; })]);
      if (opts.going) opts.going(false);
      return r;
    }
    function nextText(after) {
      if (after.length) return ' Next step: ' + describeMove(after[0], world, goLabel()) + '. ' + after.length + ' step' + (after.length > 1 ? 's' : '') + ' left.';
      var i = inst();
      return i && i.noGo ? ' Every piece is in place now.' : ' Every piece is in place. Next: press ' + label('go', world, goLabel()) + ' to test it.';
    }

    var tools = {
      point_at: serial('point_at', async function (p) {
        var k = resolve(p.target);
        if (!k) return unknown(p.target);
        ring(k);
        await hand.moveTo(function () { return inst().target(k); }, 500);
        await hand.tap();
        return 'Pointing at ' + label(k, world, goLabel()) + '.';
      }),
      draw_arrow: serial('draw_arrow', async function (p) {
        var a = resolve(p.from), b = resolve(p.to);
        if (!a) return unknown(p.from);
        if (!b) return unknown(p.to);
        arrow(a, b);
        return 'Drew an arrow from ' + label(a, world, goLabel()) + ' to ' + label(b, world, goLabel()) + '.';
      }),
      highlight: serial('highlight', async function (p) {
        var k = resolve(p.target);
        if (!k) return unknown(p.target);
        ring(k);
        return 'Highlighted ' + label(k, world, goLabel()) + '.';
      }),
      clear_marks: serial('clear_marks', async function () { clear(); hand.hide(); return 'Cleared the marks.'; }),
      demo_next_step: serial('demo_next_step', async function () {
        clear();
        await waitIdle();
        var i = inst(), mv = moves();
        if (opts.solved && opts.solved()) return 'It is already solved.';
        if (!mv.length) {
          if (i.noGo) return 'Every piece is already in place.';
          var r = await pressGo();
          return r === 'win' ? 'I pressed ' + label('go', world, goLabel()) + ' and it works! That was the whole answer.' : 'I pressed ' + label('go', world, goLabel()) + ' but it did not work yet.';
        }
        var d = describeMove(mv[0], world, goLabel());
        await runMove(mv[0]);
        hand.hide();
        if (!alive()) return 'The call has ended.';
        var solved = opts.solved && opts.solved();
        if (solved) return 'Showed: ' + d + '. That finished it, it works!';
        return 'Showed: ' + d + '.' + nextText(moves());
      }),
      demo_all: serial('demo_all', async function () {
        clear();
        await waitIdle();
        var n = 0, i = inst(), mv;
        while (alive() && n < 40 && (mv = moves()).length && !(opts.solved && opts.solved())) { await runMove(mv[0]); n++; }
        hand.hide();
        if (!alive()) return 'The call has ended.';
        if (opts.solved && opts.solved()) return 'Showed all ' + n + ' steps. It works!';
        if (i.noGo) return 'Showed all ' + n + ' steps. Every piece is in place.';
        var r = await pressGo();
        return 'Showed all ' + n + ' steps and pressed ' + label('go', world, goLabel()) + (r === 'win' ? '. It works!' : '. It did not work yet.');
      })
    };

    function context() {
      var i = inst(), mv = moves();
      return { world: world, board: boardOf(i), moves: mv, noGo: i && i.noGo, goLabel: i && i.goLabel, won: opts.solved && opts.solved(),
        targets: knownTargets(mv) };
    }

    return {
      tools: tools,
      log: log,
      context: context,
      vars: function () { return contextText(context()); },
      update: function () { return updateText(context()); },
      clear: function () { clear(); },
      stop: function () { stopped = true; clear(); if (layer && layer.parentNode) layer.parentNode.removeChild(layer); layer = null; if (hand) hand.hide(); }
    };
  }

  return { label: label, boardOf: boardOf, describeBoard: describeBoard, groupSteps: groupSteps, describeMove: describeMove,
    targetList: targetList, contextText: contextText, updateText: updateText, create: create };
});
