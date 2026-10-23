/* Quest state machine. Chain state lives in S.quests[chainId] = { step, n, done }. State-based steps (collect / minigame / build /
 * gate) complete as soon as their condition holds (even if it held earlier), talk steps complete on onTalk, learn steps on onLearnCorrect.
 * Steps unlock strictly in order; rewards are paid through progress.grant. UMD: SI.quests. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('questData', '../data/quests.js'), dep('islands', '../data/islands.js'), dep('progress', './progress.js'), dep('build', './build.js'), dep('collectibles', '../data/collectibles.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.quests = mod; }
})(typeof self !== 'undefined' ? self : this, function (QD, ISL, P, BUILD, COL) {
  'use strict';

  function state(S, chainId) { return S.quests[chainId]; }
  function available(S, chain) { return S.islands.unlocked.indexOf(chain.island) >= 0; }
  function stepOf(S, chain) { var st = state(S, chain.id); return st.done ? null : chain.steps[st.step]; }

  /** { have, need, done } for a step of a chain (state-based) */
  function progress(S, chain, step) {
    var st = state(S, chain.id);
    switch (step.type) {
      case 'talk': return { have: 0, need: 1, done: false };
      case 'collect': { var h = step.ids.filter(function (id) { return S.collectibles[id]; }).length; return { have: h, need: step.ids.length, done: h >= step.ids.length }; }
      case 'minigame': { var b = P.bestStars(S, step.game, step.level); return { have: Math.min(b, step.stars), need: step.stars, done: b >= step.stars }; }
      case 'learn': return { have: Math.min(st.n, step.need), need: step.need, done: st.n >= step.need };
      case 'build': { var c = BUILD.layoutOf(S, step.zone).length; return { have: Math.min(c, step.count), need: step.count, done: c >= step.count }; }
      case 'gate': { var g = ISL.byId[chain.island].gate; var o = P.gateOpen(S, g.key); return { have: o ? 1 : 0, need: 1, done: o }; }
    }
    return { have: 0, need: 1, done: false };
  }

  function finishStep(S, chain, events) {
    var st = state(S, chain.id), step = chain.steps[st.step];
    var res = P.grant(S, Object.assign({}, step.reward, step.gift ? { gift: step.gift } : {}));
    S.stats.steps++; st.step++; st.n = 0;
    events.push({ type: 'step', chain: chain.id, step: step.id, index: st.step - 1, reward: step.reward, result: res });
    if (st.step >= chain.steps.length) {
      st.done = true;
      var cr = P.grant(S, chain.reward);
      events.push({ type: 'chain', chain: chain.id, reward: chain.reward, result: cr });
    }
    var news = P.refreshAll(S);
    if (news.islands.length || news.items.length || news.achievements.length) events.push({ type: 'unlocked', unlocked: news });
  }

  /** Complete every state-satisfied step (in order). Call after anything that may change the world state. Returns events. */
  function advance(S) {
    var events = [], again = true, guard = 0;
    while (again && guard++ < 100) {
      again = false;
      QD.chains.forEach(function (chain) {
        if (!available(S, chain)) return;
        var step = stepOf(S, chain);
        if (!step || step.type === 'talk') return;
        if (progress(S, chain, step).done) { finishStep(S, chain, events); again = true; }
      });
    }
    return events;
  }

  /** The player finished the dialogue with an NPC. */
  function onTalk(S, npcId) {
    var events = [];
    QD.chains.forEach(function (chain) {
      if (!available(S, chain)) return;
      var step = stepOf(S, chain);
      if (step && step.type === 'talk' && step.npc === npcId) finishStep(S, chain, events);
    });
    return events.concat(advance(S));
  }
  /** A question was answered correctly for the learn step of this NPC. */
  function onLearnCorrect(S, npcId) {
    var events = [];
    QD.chains.forEach(function (chain) {
      if (!available(S, chain)) return;
      var step = stepOf(S, chain);
      if (step && step.type === 'learn' && step.npc === npcId) {
        var st = state(S, chain.id); st.n++;
        if (st.n >= step.need) finishStep(S, chain, events);
      }
    });
    return events.concat(advance(S));
  }

  /** The chain the tracker shows: the first unfinished chain whose island is unlocked. */
  function activeChain(S) {
    for (var i = 0; i < QD.chains.length; i++) { var c = QD.chains[i]; if (available(S, c) && !state(S, c.id).done) return c; }
    return null;
  }
  /** Current objective: { chain, step, index, total, text, progress } or null when everything is finished. */
  function objective(S, chainId) {
    var chain = chainId ? QD.byId[chainId] : activeChain(S);
    if (!chain || state(S, chain.id).done) return null;
    var step = stepOf(S, chain), st = state(S, chain.id);
    return { chain: chain, step: step, index: st.step, total: chain.steps.length, text: step.text, progress: progress(S, chain, step) };
  }

  /** Where the arrow points: { kind, island, x, y, id, label }. If the objective is on another island → the dock of where you are. */
  function target(S, playerIsland, chainId) {
    var ob = objective(S, chainId);
    if (!ob) return null;
    var step = ob.step, isl = ISL.byId[ob.chain.island], spot;
    if (playerIsland && playerIsland !== isl.n) {
      var here = ISL.byId[playerIsland];
      return { kind: 'dock', island: here.n, x: here.dock.x, y: here.dock.y, id: 'dock' + here.n, label: 'Sail to ' + isl.name };
    }
    var npc = function (id) { return isl.npcs.filter(function (n) { return n.id === id; })[0]; };
    switch (step.type) {
      case 'talk': case 'learn': spot = npc(step.npc); return { kind: 'npc', island: isl.n, x: spot.x, y: spot.y, id: spot.id, label: spot.name };
      case 'collect': {
        var left = step.ids.filter(function (id) { return !S.collectibles[id]; })[0] || step.ids[0];
        var c = isl.collectibles.filter(function (x) { return x.id === left; })[0];
        return { kind: 'collectible', island: isl.n, x: c.x, y: c.y, id: c.id, label: COL.byId[c.id].name };
      }
      case 'minigame': spot = isl.spots.filter(function (s) { return s.game === step.game; })[0]; return { kind: 'spot', island: isl.n, x: spot.x, y: spot.y, id: spot.id, label: 'Minigame' };
      case 'build': return { kind: 'zone', island: isl.n, x: isl.zone.sign.x, y: isl.zone.sign.y, id: isl.zone.id, label: isl.zone.label };
      case 'gate': return { kind: 'gate', island: isl.n, x: isl.gate.approach.x, y: isl.gate.approach.y, id: isl.gate.id, label: isl.gate.name };
    }
    return null;
  }

  /** What an NPC says when tapped: { kind:'step'|'win'|'helper'|'chatter', lines, step? , chain? } */
  function dialogue(S, npcId, today) {
    var chains = QD.chains.filter(function (c) { return available(S, c) && !state(S, c.id).done; });
    for (var i = 0; i < chains.length; i++) {
      var step = stepOf(S, chains[i]);
      if (step && (step.type === 'talk' || step.type === 'learn') && step.npc === npcId) return { kind: 'step', lines: step.lines, step: step, chain: chains[i] };
    }
    var h = QD.helpers.filter(function (x) { return x.npc === npcId && S.islands.unlocked.indexOf(x.island) >= 0; })[0];
    var lines = QD.chatter[npcId] || ['Hello!'];
    return { kind: h ? 'helper' : 'chatter', lines: lines, helper: h || null };
  }

  return { state: state, available: available, progress: progress, advance: advance, onTalk: onTalk, onLearnCorrect: onLearnCorrect, activeChain: activeChain, objective: objective, target: target, dialogue: dialogue };
});
