// Deck index, deterministic daily stack selection and quiz picking.
(function (S) {
  S.decks = (self.SPARKS_DECKS || []).slice().sort(function (a, b) { return a.order - b.order; });
  S.cardIndex = {};
  S.decks.forEach(function (deck) {
    deck.cards.forEach(function (card, i) { S.cardIndex[card.id] = { card: card, deck: deck, index: i }; });
  });
  S.deckById = function (id) { return S.decks.filter(function (d) { return d.id === id; })[0] || null; };

  // Small, fast, deterministic PRNG (mulberry32) seeded from a string hash.
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seedStr) {
    var a = hash(seedStr);
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(list, rand) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }
  S.hash = hash;
  S.rng = rng;
  S.shuffle = shuffle;

  // One "cycle" is an ordering of every card in the favourite decks, with
  // decks interleaved so consecutive cards come from different topics.
  function cycleOrder(deckIds, cycle) {
    var rand = rng('cycle|' + deckIds.join(',') + '|' + cycle);
    var lists = shuffle(deckIds, rand).map(function (id) {
      return shuffle(S.deckById(id).cards.map(function (c) { return c.id; }), rand);
    });
    var out = [];
    for (var round = 0; out.length < lists.reduce(function (n, l) { return n + l.length; }, 0); round++) {
      lists.forEach(function (l) { if (round < l.length) out.push(l[round]); });
    }
    return out;
  }

  // Today's 5 ideas: a pure function of the local date and favourite topics.
  // Successive days walk through the cycle, so ideas don't repeat until every
  // card in the favourite topics has appeared.
  S.dailyStack = function (todayKey, favs, size) {
    size = size || 5;
    var ids = (favs || []).filter(function (id) { return S.deckById(id); }).sort();
    if (!ids.length) ids = S.decks.map(function (d) { return d.id; }).sort();
    var poolSize = ids.reduce(function (n, id) { return n + S.deckById(id).cards.length; }, 0);
    size = Math.min(size, poolSize);
    var start = S.dayNumber(todayKey) * size;
    var picked = [];
    var pos = start;
    var guard = 0;
    while (picked.length < size && guard++ < size * 4) {
      var cycle = Math.floor(pos / poolSize);
      var order = cycleOrder(ids, cycle);
      var id = order[pos % poolSize];
      if (picked.indexOf(id) === -1) picked.push(id);
      pos++;
    }
    return picked;
  };

  // Pick quiz questions from exactly the cards in a finished stack.
  S.pickQuiz = function (cardIds, seed, count) {
    count = count || 3;
    return shuffle(cardIds, rng('quiz|' + seed)).slice(0, Math.min(count, cardIds.length));
  };
})(self.Sparks = self.Sparks || {});
