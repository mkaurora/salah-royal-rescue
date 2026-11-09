// Sparks app: routing, screens, stacks, quiz, settings and service worker.
(function (S) {
  'use strict';
  var t = S.t, pick = S.pick, store = S.store;
  var main = document.getElementById('main');
  var tabbar = document.getElementById('tabbar');
  var toastEl = document.getElementById('toast');
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MIN_FAVS = 3;

  var view = { name: null, stack: null, quiz: null, cleanup: null };

  // ---------- helpers ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function today() { return S.dateKey(new Date()); }
  function favs() { return store.get('favs', []); }
  function isRtl() { return S.lang === 'ar'; }
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function setHashSilently(hash) {
    if (location.hash !== hash) history.replaceState(null, '', hash);
  }
  function deckTitle(deck) { return pick(deck.title); }
  function tintStyle(deckId) {
    var p = S.PALETTE[deckId] || {};
    return '--tint:' + p.tint + ';--tint-dark:' + p.dark + ';--deck:' + p.main + ';--deck-deep:' + p.deep;
  }
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    toastEl.classList.remove('show');
    void toastEl.offsetWidth;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); toastEl.hidden = true; }, 2800);
  }
  function longDate() {
    try {
      return new Intl.DateTimeFormat(isRtl() ? 'ar-u-nu-latn' : 'en', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
    } catch (e) { return today(); }
  }
  function greeting() {
    var h = new Date().getHours();
    return t(h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening');
  }
  function streak() { return S.computeStreak(store.get('days', []), today()); }

  // ---------- language & theme ----------
  function applyLang(lang) {
    S.lang = lang === 'ar' ? 'ar' : 'en';
    var d = document.documentElement;
    d.lang = S.lang;
    d.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
    document.title = S.lang === 'ar' ? 'شرارة · Sparks' : 'Sparks · شرارة';
    var skip = document.querySelector('.skip-link');
    if (skip) skip.textContent = t('skip');
  }
  var darkQuery = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    var pref = store.get('theme', 'system');
    var dark = pref === 'dark' || (pref === 'system' && darkQuery && darkQuery.matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      if (pref !== 'system') m.setAttribute('content', dark ? '#17140F' : '#FBF7EF');
      else m.setAttribute('content', m.media.indexOf('dark') > -1 ? '#17140F' : '#FBF7EF');
    });
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);

  // ---------- tab bar ----------
  function renderTabs(active) {
    if (!active) { tabbar.hidden = true; document.body.classList.remove('has-tabs'); return; }
    tabbar.hidden = false;
    document.body.classList.add('has-tabs');
    tabbar.setAttribute('aria-label', t('appName'));
    var tabs = [['home', 'today', 'tabToday'], ['topics', 'topics', 'tabTopics'], ['saved', 'saved', 'tabSaved'], ['settings', 'settings', 'tabSettings']];
    tabbar.innerHTML = tabs.map(function (x) {
      var on = x[0] === active;
      return '<a href="#/' + x[0] + '" class="tab' + (on ? ' on' : '') + '"' + (on ? ' aria-current="page"' : '') + '>' +
        S.icon(x[1]) + '<span>' + esc(t(x[2])) + '</span></a>';
    }).join('');
  }

  // ---------- onboarding ----------
  function renderWelcome() {
    renderTabs(null);
    main.innerHTML =
      '<section class="screen welcome">' +
        '<div class="welcome-hero">' + S.mascot('hello', 132, t('mascot')) +
          '<h1 class="brand" tabindex="-1"><span lang="en" dir="ltr">Sparks</span><span class="brand-dot" aria-hidden="true">·</span><span lang="ar" dir="rtl">شرارة</span></h1>' +
          '<p class="tagline"><span lang="en" dir="ltr">Five bright ideas a day.</span><span lang="ar" dir="rtl">خمس أفكار مضيئة كل يوم.</span></p>' +
        '</div>' +
        '<div class="lang-pick" role="group" aria-labelledby="lang-h">' +
          '<h2 id="lang-h" class="lang-h"><span lang="en" dir="ltr">Choose your language</span> · <span lang="ar" dir="rtl">اختر لغتك</span></h2>' +
          '<button type="button" class="lang-btn" data-lang="en" lang="en" dir="ltr"><span class="lang-glyph" aria-hidden="true">Aa</span><span class="lang-name">English</span>' + S.icon('next') + '</button>' +
          '<button type="button" class="lang-btn" data-lang="ar" lang="ar" dir="rtl"><span class="lang-glyph" aria-hidden="true">أب</span><span class="lang-name">العربية</span>' + S.icon('prev') + '</button>' +
        '</div>' +
      '</section>';
    main.querySelectorAll('.lang-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('lang', b.dataset.lang);
        applyLang(b.dataset.lang);
        go('#/welcome/topics');
      });
    });
  }

  function topicPicker(selected, onChange) {
    var html = '<div class="topic-chips" role="group">' + S.decks.map(function (d) {
      var on = selected.indexOf(d.id) > -1;
      return '<button type="button" class="topic-chip' + (on ? ' on' : '') + '" data-id="' + d.id + '" aria-pressed="' + on + '" style="' + tintStyle(d.id) + '">' +
        '<span class="chip-emoji" aria-hidden="true">' + d.emoji + '</span><span class="chip-label">' + esc(deckTitle(d)) + '</span>' +
        '<span class="chip-check" aria-hidden="true">' + S.icon('check') + '</span></button>';
    }).join('') + '</div>';
    return {
      html: html,
      bind: function (root) {
        root.querySelectorAll('.topic-chip').forEach(function (b) {
          b.addEventListener('click', function () {
            var id = b.dataset.id, i = selected.indexOf(id);
            if (i > -1) selected.splice(i, 1); else selected.push(id);
            b.classList.toggle('on', i === -1);
            b.setAttribute('aria-pressed', String(i === -1));
            onChange(selected);
          });
        });
      }
    };
  }

  function renderTopicSetup(mode) {
    renderTabs(null);
    var selected = favs().slice();
    var picker = topicPicker(selected, update);
    var isEdit = mode === 'edit';
    main.innerHTML =
      '<section class="screen setup">' +
        '<header class="bar">' +
          '<a class="icon-btn" href="' + (isEdit ? '#/settings' : '#/welcome') + '" aria-label="' + esc(t('back')) + '">' + S.icon('prev') + '</a>' +
          (isEdit ? '' : '<div class="steps" aria-hidden="true"><i class="on"></i><i class="on"></i></div>') +
          '<span class="bar-spacer"></span>' +
        '</header>' +
        '<div class="setup-head">' + S.mascot('calm', 56) +
          '<div><h1 tabindex="-1">' + esc(t(isEdit ? 'favouriteTopics' : 'pickTopics')) + '</h1><p class="muted">' + esc(t('pickTopicsHint')) + '</p></div></div>' +
        picker.html +
        '<div class="sticky-cta"><p class="muted small" id="sel-count" aria-live="polite"></p>' +
        '<button type="button" class="btn primary wide" id="setup-go"></button></div>' +
      '</section>';
    picker.bind(main);
    var btn = main.querySelector('#setup-go');
    function update() {
      var need = MIN_FAVS - selected.length;
      main.querySelector('#sel-count').textContent = t('selectedCount', { n: selected.length });
      btn.disabled = need > 0;
      btn.textContent = need > 0 ? t('pickMore', { n: need }) : t(isEdit ? 'save' : 'startLearning');
    }
    update();
    btn.addEventListener('click', function () {
      if (selected.length < MIN_FAVS) return;
      store.set('favs', S.decks.map(function (d) { return d.id; }).filter(function (id) { return selected.indexOf(id) > -1; }));
      if (isEdit) { toast(t('savedToast')); go('#/settings'); return; }
      store.set('onboarded', true);
      go('#/home');
    });
  }

  // ---------- home ----------
  function todayState() {
    var st = store.get('today', null);
    if (!st || st.date !== today()) st = { date: today(), index: 0, done: false };
    return st;
  }

  function renderHome() {
    renderTabs('home');
    var ids = S.dailyStack(today(), favs());
    var st = todayState();
    var learned = store.get('learned', []);
    var saved = store.get('saved', []);
    var n = streak();
    var first = S.cardIndex[ids[Math.min(st.index, ids.length - 1)]] || S.cardIndex[ids[0]];
    var cta = st.done ? t('review') : st.index > 0 ? t('resume') : t('start');
    var dots = ids.map(function (id, i) {
      var on = st.done || i < st.index;
      return '<i class="' + (on ? 'on' : '') + (i === st.index && !st.done ? ' cur' : '') + '"></i>';
    }).join('');
    var preview = ids.slice(0, 3).map(function (id, i) {
      var c = i === 0 ? first : S.cardIndex[id];
      return '<div class="peek peek-' + i + '" style="' + tintStyle(c.deck.id) + '" aria-hidden="true">' +
        (i === 0 ? '<div class="peek-art">' + S.illustration(first.deck.id, first.card.id) + '</div>' +
          '<div class="peek-body"><span class="deck-chip">' + first.deck.emoji + ' ' + esc(deckTitle(first.deck)) + '</span>' +
          '<strong>' + esc(pick(first.card.title)) + '</strong></div>' : '') +
        '</div>';
    }).reverse().join('');
    var favTiles = favs().map(S.deckById).filter(Boolean).map(deckTile).join('');

    main.innerHTML =
      '<section class="screen home">' +
        '<header class="home-head">' +
          '<div class="hello">' + S.mascot('hello', 48) + '<div><p class="muted small">' + esc(longDate()) + '</p><h1 tabindex="-1">' + esc(greeting()) + '</h1></div></div>' +
          '<div class="streak-pill' + (n > 0 ? ' lit' : '') + '" role="img" aria-label="' + esc(t('streakDays', { n: n })) + '">' + S.icon('flame') + '<b>' + S.num(n) + '</b></div>' +
        '</header>' +
        '<article class="today-card' + (st.done ? ' is-done' : '') + '">' +
          '<div class="today-top"><div><h2>' + esc(t(st.done ? 'doneToday' : 'todaysIdeas')) + '</h2>' +
          '<p class="muted small">' + esc(t(st.done ? 'doneTodaySub' : 'todaySub')) + '</p></div>' +
          '<div class="dots" aria-hidden="true">' + dots + '</div></div>' +
          '<div class="peek-stack">' + preview + '</div>' +
          '<a class="btn primary wide" href="#/today/' + (st.done ? 0 : st.index) + '" id="today-go">' + esc(cta) + S.icon('next') + '</a>' +
        '</article>' +
        '<div class="stats">' +
          stat('flame', n, t('streak')) + stat('bulb', learned.length, t('learned')) + stat('saved', saved.length, t('saved')) +
        '</div>' +
        '<div class="section-head"><h2>' + esc(t('yourTopics')) + '</h2><a href="#/topics" class="link">' + esc(t('seeAll')) + '</a></div>' +
        '<div class="deck-row">' + favTiles + '</div>' +
      '</section>';
  }
  function stat(icon, value, label) {
    return '<div class="stat"><span class="stat-icon">' + S.icon(icon) + '</span><b>' + S.num(value) + '</b><span class="small muted">' + esc(label) + '</span></div>';
  }
  function deckTile(d) {
    var learned = store.get('learned', []);
    var done = d.cards.filter(function (c) { return learned.indexOf(c.id) > -1; }).length;
    var fav = favs().indexOf(d.id) > -1;
    return '<a class="deck-tile" href="#/deck/' + d.id + '/0" style="' + tintStyle(d.id) + '">' +
      '<span class="tile-emoji" aria-hidden="true">' + d.emoji + '</span>' +
      (fav ? '<span class="tile-fav" title="' + esc(t('favourite')) + '">' + S.icon('star') + '<span class="sr">' + esc(t('favourite')) + '</span></span>' : '') +
      '<strong>' + esc(deckTitle(d)) + '</strong>' +
      '<span class="small muted">' + esc(t('learnedOf', { a: done, b: d.cards.length })) + '</span>' +
      '<span class="meter" aria-hidden="true"><i style="width:' + Math.round(done / d.cards.length * 100) + '%"></i></span>' +
      '</a>';
  }

  // ---------- topics & saved ----------
  function renderTopics() {
    renderTabs('topics');
    main.innerHTML =
      '<section class="screen topics">' +
        '<header class="page-head"><h1 tabindex="-1">' + esc(t('topics')) + '</h1><p class="muted">' + esc(t('topicsSub')) + '</p></header>' +
        '<div class="deck-grid">' + S.decks.map(deckTile).join('') + '</div>' +
      '</section>';
  }

  function renderSaved() {
    renderTabs('saved');
    var saved = store.get('saved', []).filter(function (id) { return S.cardIndex[id]; });
    var list = saved.map(function (id, i) {
      var c = S.cardIndex[id];
      return '<li class="saved-item" style="' + tintStyle(c.deck.id) + '">' +
        '<a href="#/saved/' + i + '" class="saved-link"><span class="saved-emoji" aria-hidden="true">' + c.deck.emoji + '</span>' +
        '<span class="saved-text"><strong>' + esc(pick(c.card.title)) + '</strong><span class="small muted">' + esc(pick(c.card.takeaway)) + '</span></span></a>' +
        '<button type="button" class="icon-btn" data-remove="' + id + '" aria-label="' + esc(t('remove') + ': ' + pick(c.card.title)) + '">' + S.icon('x') + '</button></li>';
    }).join('');
    main.innerHTML =
      '<section class="screen saved">' +
        '<header class="page-head"><h1 tabindex="-1">' + esc(t('savedTitle')) + '</h1></header>' +
        (saved.length ? '<ul class="saved-list">' + list + '</ul>' :
          '<div class="empty">' + S.mascot('calm', 96) + '<h2>' + esc(t('savedEmpty')) + '</h2><p class="muted">' + esc(t('savedEmptySub')) + '</p>' +
          '<a class="btn" href="#/topics">' + esc(t('topics')) + '</a></div>') +
      '</section>';
    main.querySelectorAll('[data-remove]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.toggleSaved(b.dataset.remove);
        toast(t('unsavedToast'));
        renderSaved();
        var first = main.querySelector('[data-remove], h1');
        if (first) first.focus();
      });
    });
  }

  // ---------- settings ----------
  function segmented(name, options, value) {
    return '<div class="segmented" role="radiogroup" aria-label="' + esc(t(name)) + '">' + options.map(function (o) {
      var on = o[0] === value;
      return '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + '" data-' + name + '="' + o[0] + '"' + (o[2] ? ' lang="' + o[2] + '"' : '') + '>' + esc(o[1]) + '</button>';
    }).join('') + '</div>';
  }
  function renderSettings() {
    renderTabs('settings');
    var favNames = favs().map(S.deckById).filter(Boolean).map(function (d) { return d.emoji + ' ' + deckTitle(d); });
    main.innerHTML =
      '<section class="screen settings">' +
        '<header class="page-head"><h1 tabindex="-1">' + esc(t('settings')) + '</h1></header>' +
        '<div class="panel"><h2>' + esc(t('language')) + '</h2>' +
          segmented('language', [['en', 'English', 'en'], ['ar', 'العربية', 'ar']], S.lang) + '</div>' +
        '<div class="panel"><h2>' + esc(t('theme')) + '</h2>' +
          segmented('themeopt', [['system', t('themeSystem')], ['light', t('themeLight')], ['dark', t('themeDark')]], store.get('theme', 'system')) + '</div>' +
        '<div class="panel"><h2>' + esc(t('favouriteTopics')) + '</h2><p class="muted small fav-list">' + esc(favNames.join(' · ')) + '</p>' +
          '<a class="btn wide" href="#/settings/topics">' + esc(t('editTopics')) + '</a></div>' +
        '<div class="panel"><h2>' + esc(t('privacy')) + '</h2><p class="muted small">' + esc(t('privacyText')) + '</p></div>' +
        '<div class="panel"><h2>' + esc(t('disclaimer')) + '</h2><p class="muted small">' + esc(t('disclaimerText')) + '</p></div>' +
        '<div class="panel"><button type="button" class="btn danger wide" id="reset">' + esc(t('resetProgress')) + '</button></div>' +
        '<footer class="about">' + S.mascot('calm', 36) + '<span>' + esc(t('appName')) + ' · ' + esc(t('version', { v: 'v' + (self.SPARKS_VERSION || '1.0') })) +
          '<span id="offline-state"></span></span></footer>' +
      '</section>';
    main.querySelectorAll('[data-language]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('lang', b.dataset.language);
        applyLang(b.dataset.language);
        renderSettings();
        main.querySelector('[data-language="' + b.dataset.language + '"]').focus();
      });
    });
    main.querySelectorAll('[data-themeopt]').forEach(function (b) {
      b.addEventListener('click', function () {
        store.set('theme', b.dataset.themeopt);
        applyTheme();
        renderSettings();
        main.querySelector('[data-themeopt="' + b.dataset.themeopt + '"]').focus();
      });
    });
    main.querySelector('#reset').addEventListener('click', function () {
      if (!window.confirm(t('resetConfirm'))) return;
      S.resetProgress();
      toast(t('resetDone'));
      renderSettings();
    });
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      main.querySelector('#offline-state').textContent = ' · ' + t('offlineReady');
    }
  }

  // ---------- idea stack ----------
  function stackFor(kind, arg) {
    if (kind === 'today') return { kind: kind, key: 'today', ids: S.dailyStack(today(), favs()) };
    if (kind === 'deck') {
      var d = S.deckById(arg);
      return d ? { kind: kind, key: 'deck:' + d.id, deckId: d.id, ids: d.cards.map(function (c) { return c.id; }) } : null;
    }
    if (kind === 'saved') {
      // Keep the list stable while browsing, even if an idea is unsaved.
      var ids = view.stack && view.stack.kind === 'saved' ? view.stack.ids : store.get('saved', []).filter(function (id) { return S.cardIndex[id]; });
      return ids.length ? { kind: kind, key: 'saved', ids: ids } : null;
    }
    return null;
  }
  function stackHash(stack, i) {
    return stack.kind === 'deck' ? '#/deck/' + stack.deckId + '/' + i : '#/' + stack.kind + '/' + i;
  }
  function exitHash(stack) { return stack.kind === 'deck' ? '#/topics' : stack.kind === 'saved' ? '#/saved' : '#/home'; }

  function renderStack(kind, arg, index) {
    renderTabs(null);
    var stack = stackFor(kind, arg);
    if (!stack) return renderNotFound();
    view.stack = stack;
    var i = Math.max(0, Math.min(stack.ids.length - 1, index | 0));
    stack.index = i;
    main.innerHTML =
      '<section class="screen stack" aria-roledescription="carousel" aria-label="' + esc(stack.kind === 'today' ? t('todaysIdeas') : stack.kind === 'saved' ? t('savedTitle') : deckTitle(S.deckById(stack.deckId))) + '">' +
        '<header class="bar">' +
          '<a class="icon-btn" href="' + exitHash(stack) + '" aria-label="' + esc(t('close')) + '">' + S.icon('close') + '</a>' +
          '<div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="' + stack.ids.length + '"><i></i></div>' +
          '<span class="counter" aria-hidden="true"></span>' +
        '</header>' +
        '<div class="card-stage"></div>' +
        '<div class="card-actions">' +
          '<button type="button" class="act" id="act-save">' + S.icon('saved') + '<span></span></button>' +
          '<button type="button" class="act" id="act-listen">' + S.icon('speaker') + '<span></span></button>' +
          '<button type="button" class="act" id="act-share">' + S.icon('share') + '<span>' + esc(t('share')) + '</span></button>' +
        '</div>' +
        '<nav class="stack-nav" aria-label="' + esc(t('swipeHint')) + '">' +
          '<button type="button" class="btn round" id="prev" aria-label="' + esc(t('prev')) + '">' + S.icon('prev') + '</button>' +
          '<p class="hint small muted">' + esc(t('swipeHint')) + '</p>' +
          '<button type="button" class="btn primary round-wide" id="next"></button>' +
        '</nav>' +
      '</section>';

    var stage = main.querySelector('.card-stage');
    main.querySelector('#prev').addEventListener('click', function () { move(-1); });
    main.querySelector('#next').addEventListener('click', function () { move(1); });
    main.querySelector('#act-save').addEventListener('click', toggleSave);
    main.querySelector('#act-share').addEventListener('click', shareCard);
    main.querySelector('#act-listen').addEventListener('click', listen);

    function current() { return S.cardIndex[stack.ids[stack.index]]; }

    function paint(dir) {
      S.speech.stop();
      var c = current();
      var n = stack.ids.length, i = stack.index;
      stage.innerHTML =
        '<article class="idea-card' + (dir && !reduceMotion ? (dir > 0 ? ' enter-fwd' : ' enter-back') : '') + '" style="' + tintStyle(c.deck.id) + '" ' +
          'aria-roledescription="slide" aria-label="' + esc(t('cardOf', { a: i + 1, b: n })) + '" tabindex="0">' +
          '<div class="illo-wrap">' + S.illustration(c.deck.id, c.card.id) + '</div>' +
          '<div class="card-content">' +
            '<span class="deck-chip">' + c.deck.emoji + ' ' + esc(deckTitle(c.deck)) + '</span>' +
            '<h1 class="card-title" tabindex="-1">' + esc(pick(c.card.title)) + '</h1>' +
            '<p class="card-body">' + esc(pick(c.card.body)) + '</p>' +
            '<div class="takeaway">' + S.mascot('calm', 30) + '<div><span class="takeaway-label">' + esc(t('takeaway')) + '</span><p>' + esc(pick(c.card.takeaway)) + '</p></div></div>' +
            '<a class="source" href="' + esc(c.card.source.url) + '" target="_blank" rel="noopener noreferrer">' + S.icon('link') +
              '<span>' + esc(t('source')) + ': <bdi>' + esc(c.card.source.title) + '</bdi></span></a>' +
          '</div>' +
        '</article>';
      main.querySelector('.progress i').style.width = ((i + 1) / n * 100) + '%';
      main.querySelector('.progress').setAttribute('aria-valuenow', i + 1);
      main.querySelector('.progress').setAttribute('aria-valuetext', t('cardOf', { a: i + 1, b: n }));
      main.querySelector('.counter').textContent = '\u2066' + S.num(i + 1) + ' / ' + S.num(n) + '\u2069'; // LTR isolate keeps "1 / 5" order in RTL
      var prev = main.querySelector('#prev');
      prev.disabled = i === 0;
      var next = main.querySelector('#next');
      var last = i === n - 1;
      next.innerHTML = '<span>' + esc(last ? t('finish') : t('next')) + '</span>' + S.icon(last ? 'check' : 'next');
      next.setAttribute('aria-label', last ? t('finish') : t('next'));
      updateSave();
      updateListen(false);
      bindSwipe(stage.querySelector('.idea-card'));
      setHashSilently(stackHash(stack, i));
      if (stack.kind === 'today') {
        var st = todayState();
        if (!st.done && i > st.index) { st.index = i; store.set('today', st); }
      }
    }

    function move(delta) {
      var nextIndex = stack.index + delta;
      if (nextIndex < 0) return;
      if (nextIndex >= stack.ids.length) return finish();
      stack.index = nextIndex;
      paint(delta);
      if (dirFromKeyboard) { var h = stage.querySelector('.card-title'); if (h) h.focus({ preventScroll: true }); }
    }

    function finish() {
      S.speech.stop();
      S.markLearned(stack.ids);
      S.recordLearnedDay(today());
      if (stack.kind === 'today') store.set('today', { date: today(), index: stack.ids.length - 1, done: true });
      if (stack.kind === 'saved') { view.stack = null; return go('#/saved'); }
      go(stack.kind === 'deck' ? '#/done/deck/' + stack.deckId : '#/done/today');
    }

    function updateSave() {
      var on = S.isSaved(current().card.id);
      var b = main.querySelector('#act-save');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.querySelector('span').textContent = on ? t('actSaved') : t('actSave');
      b.setAttribute('aria-label', on ? t('unbookmark') : t('bookmark'));
    }
    function toggleSave() {
      var added = S.toggleSaved(current().card.id);
      updateSave();
      toast(added ? t('savedToast') : t('unsavedToast'));
    }

    function updateListen(on, busy) {
      var b = main.querySelector('#act-listen');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-busy', String(!!busy));
      b.innerHTML = S.icon(on ? 'stop' : 'speaker') + '<span>' + esc(on ? t('actStop') : t('actListen')) + '</span>';
      b.setAttribute('aria-label', on ? t('stopListening') : t('listen'));
    }
    function listen() {
      if (S.speech.isSpeaking()) { S.speech.stop(); updateListen(false); return; }
      var c = current().card;
      var text = [pick(c.title), pick(c.body), t('takeaway') + ': ' + pick(c.takeaway)].join('. ');
      var cardId = c.id;
      updateListen(false, true);
      S.speech.speak(text, S.lang, {
        onstart: function () { if (current().card.id === cardId) updateListen(true); },
        onend: function () { if (main.querySelector('#act-listen')) updateListen(false); }
      }).then(function (res) {
        if (!main.querySelector('#act-listen')) return;
        if (res.ok) return;
        updateListen(false);
        toast(res.reason === 'unsupported' ? t('noSpeech') : res.reason === 'novoice' ? t(S.lang === 'ar' ? 'noVoiceAr' : 'noVoice') : t('speechError'));
      });
    }

    function shareCard() {
      var c = current();
      var url = location.href.split('#')[0] + '#/deck/' + c.deck.id + '/' + c.index;
      var title = pick(c.card.title);
      var text = t('shareText', { title: title }) + '\n' + pick(c.card.takeaway);
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).then(function () { toast(t('shared')); }, function (err) {
          if (err && err.name === 'AbortError') return;
          copyText(text + '\n' + url);
        });
      } else copyText(text + '\n' + url);
    }
    function copyText(s) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(s).then(function () { toast(t('copied')); }, function () { legacyCopy(s); });
      } else legacyCopy(s);
    }
    function legacyCopy(s) {
      var ta = document.createElement('textarea');
      ta.value = s; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove();
      toast(ok ? t('copied') : t('shareUnavailable'));
    }

    // Horizontal swipe. "Forward" follows reading direction: in RTL the next
    // idea comes from the left, so swiping right advances.
    function bindSwipe(card) {
      var x0 = 0, y0 = 0, dx = 0, active = false, horizontal = null, id = null;
      card.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.target.closest('a, button')) return;
        active = true; horizontal = null; dx = 0; x0 = e.clientX; y0 = e.clientY; id = e.pointerId;
      });
      card.addEventListener('pointermove', function (e) {
        if (!active || e.pointerId !== id) return;
        var mx = e.clientX - x0, my = e.clientY - y0;
        if (horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) {
          horizontal = Math.abs(mx) > Math.abs(my);
          if (horizontal) { try { card.setPointerCapture(id); } catch (err) {} card.classList.add('dragging'); }
        }
        if (!horizontal) return;
        dx = mx;
        card.style.transform = 'translateX(' + dx + 'px) rotate(' + (dx / 28) + 'deg)';
      });
      function end() {
        if (!active) return;
        active = false;
        card.classList.remove('dragging');
        if (!horizontal) return;
        var forward = isRtl() ? dx > 0 : dx < 0;
        var canMove = forward || stack.index > 0;
        if (Math.abs(dx) > 70 && canMove) { dirFromKeyboard = false; move(forward ? 1 : -1); }
        else card.style.transform = '';
      }
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', function () { active = false; card.classList.remove('dragging'); card.style.transform = ''; });
    }

    var dirFromKeyboard = false;
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      var fwd = isRtl() ? 'ArrowLeft' : 'ArrowRight', back = isRtl() ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { e.preventDefault(); dirFromKeyboard = true; move(1); }
      else if (e.key === back) { e.preventDefault(); dirFromKeyboard = true; move(-1); }
      else if (e.key === 'Escape') { e.preventDefault(); go(exitHash(stack)); }
    }
    document.addEventListener('keydown', onKey);
    view.cleanup = function () { document.removeEventListener('keydown', onKey); S.speech.stop(); };
    view.goto = function (i) { if (i !== stack.index && i >= 0 && i < stack.ids.length) { var dir = i > stack.index ? 1 : -1; stack.index = i; paint(dir); } };
    paint(0);
  }

  // ---------- congrats & quiz ----------
  function quizSource(kind, arg) {
    if (kind === 'today') return { key: 'today:' + today(), ids: S.dailyStack(today(), favs()), back: '#/home', title: t('todaysIdeas') };
    var d = S.deckById(arg);
    if (!d) return null;
    return { key: 'deck:' + d.id, ids: d.cards.map(function (c) { return c.id; }), back: '#/topics', title: deckTitle(d), deckId: d.id };
  }

  function renderDone(kind, arg) {
    renderTabs(null);
    var src = quizSource(kind, arg);
    if (!src) return renderNotFound();
    var n = streak();
    main.innerHTML =
      '<section class="screen done">' +
        '<div class="burst" aria-hidden="true">' + confetti() + '</div>' +
        S.mascot('cheer', 150, t('mascot')) +
        '<h1 tabindex="-1">' + esc(t('congrats')) + '</h1>' +
        '<p class="lead">' + esc(t('congratsSub', { n: src.ids.length })) + '</p>' +
        '<p class="streak-line">' + S.icon('flame') + '<span>' + esc(t('congratsStreak', { n: n })) + '</span></p>' +
        '<div class="done-card"><p>' + esc(t('quizIntro')) + '</p>' +
          '<a class="btn primary wide" href="#/quiz/' + kind + (arg ? '/' + arg : '') + '">' + esc(t('startQuiz')) + '</a>' +
          '<a class="btn ghost wide" href="#/home">' + esc(t('skipQuiz')) + '</a></div>' +
      '</section>';
  }
  function confetti() {
    var rand = S.rng('confetti'), out = '';
    var colors = ['#F2661B', '#FFC23D', '#2F8F7A', '#D0587A', '#4A73C9'];
    for (var i = 0; i < 22; i++) {
      out += '<i style="left:' + Math.round(rand() * 100) + '%;top:' + Math.round(rand() * 60) + '%;background:' + colors[i % colors.length] +
        ';transform:rotate(' + Math.round(rand() * 180) + 'deg);animation-delay:' + (rand() * 0.6).toFixed(2) + 's"></i>';
    }
    return out;
  }

  function renderQuiz(kind, arg) {
    renderTabs(null);
    var src = quizSource(kind, arg);
    if (!src) return renderNotFound();
    var seed = src.key + '|' + today();
    var qs = S.pickQuiz(src.ids, seed, 3);
    var state = { i: 0, score: 0, answered: false };
    view.quiz = state;

    function paintQuestion() {
      var c = S.cardIndex[qs[state.i]];
      var q = c.card.quiz;
      var opts = q.options[S.lang] || q.options.en;
      state.answered = false;
      main.innerHTML =
        '<section class="screen quiz">' +
          '<header class="bar">' +
            '<a class="icon-btn" href="' + src.back + '" aria-label="' + esc(t('close')) + '">' + S.icon('close') + '</a>' +
            '<div class="qdots" aria-hidden="true">' + qs.map(function (_, k) { return '<i class="' + (k < state.i ? 'on' : k === state.i ? 'cur' : '') + '"></i>'; }).join('') + '</div>' +
            '<span class="counter">' + esc(t('question', { a: state.i + 1, b: qs.length })) + '</span>' +
          '</header>' +
          '<div class="quiz-body" style="' + tintStyle(c.deck.id) + '">' +
            '<span class="deck-chip">' + c.deck.emoji + ' ' + esc(pick(c.card.title)) + '</span>' +
            '<h1 class="quiz-q" id="quiz-q" tabindex="-1">' + esc(pick(q.q)) + '</h1>' +
            '<div class="options" role="group" aria-labelledby="quiz-q">' + opts.map(function (o, k) {
              return '<button type="button" class="option" data-k="' + k + '"><span class="opt-key" aria-hidden="true">' + 'ABC'.charAt(k) + '</span><span class="opt-text">' + esc(o) + '</span><span class="opt-mark" aria-hidden="true"></span></button>';
            }).join('') + '</div>' +
            '<div class="feedback" id="feedback" aria-live="assertive" hidden></div>' +
          '</div>' +
          '<div class="quiz-foot"><button type="button" class="btn primary wide" id="qnext" hidden></button></div>' +
        '</section>';
      if (S.lang === 'ar') main.querySelectorAll('.opt-key').forEach(function (k, idx) { k.textContent = 'أبج'.charAt(idx); });
      main.querySelectorAll('.option').forEach(function (b) {
        b.addEventListener('click', function () { answer(+b.dataset.k); });
      });
      main.querySelector('#qnext').addEventListener('click', function () {
        state.i++;
        if (state.i < qs.length) { paintQuestion(); focusHeading(); } else paintResult();
      });
    }

    function answer(k) {
      if (state.answered) return;
      state.answered = true;
      var c = S.cardIndex[qs[state.i]];
      var q = c.card.quiz;
      var right = k === q.answer;
      if (right) state.score++;
      main.querySelectorAll('.option').forEach(function (b, idx) {
        b.disabled = true;
        b.setAttribute('aria-disabled', 'true');
        if (idx === q.answer) { b.classList.add('correct'); b.querySelector('.opt-mark').innerHTML = S.icon('check'); }
        else if (idx === k) { b.classList.add('wrong'); b.querySelector('.opt-mark').innerHTML = S.icon('x'); }
        if (idx === k) b.setAttribute('aria-pressed', 'true');
      });
      var fb = main.querySelector('#feedback');
      fb.hidden = false;
      fb.className = 'feedback ' + (right ? 'good' : 'bad');
      fb.innerHTML = '<strong>' + esc(t(right ? 'correct' : 'incorrect')) + '</strong><p>' + esc(pick(q.explain)) + '</p>';
      var nb = main.querySelector('#qnext');
      nb.hidden = false;
      nb.textContent = state.i < qs.length - 1 ? t('nextQuestion') : t('seeResults');
      nb.focus();
    }

    function paintResult() {
      var total = qs.length;
      var scores = store.get('quiz', {});
      var prevBest = scores[src.key] ? scores[src.key].best : 0;
      scores[src.key] = { best: Math.max(prevBest, state.score), last: state.score, total: total, date: today() };
      store.set('quiz', scores);
      var msg = state.score === total ? 'scorePerfect' : state.score >= total / 2 ? 'scoreGood' : 'scoreLow';
      main.innerHTML =
        '<section class="screen done result">' +
          (state.score === total ? '<div class="burst" aria-hidden="true">' + confetti() + '</div>' : '') +
          S.mascot(state.score === total ? 'cheer' : 'hello', 130, t('mascot')) +
          '<p class="eyebrow">' + esc(t('quizDone')) + '</p>' +
          '<h1 tabindex="-1">' + esc(t('score', { a: state.score, b: total })) + '</h1>' +
          '<p class="lead">' + esc(t(msg)) + '</p>' +
          '<div class="done-card">' +
            '<a class="btn primary wide" href="' + (kind === 'deck' ? '#/topics' : '#/home') + '">' + esc(t(kind === 'deck' ? 'topics' : 'home')) + '</a>' +
            '<button type="button" class="btn ghost wide" id="retake">' + esc(t('retake')) + '</button>' +
          '</div>' +
        '</section>';
      main.querySelector('#retake').addEventListener('click', function () { state.i = 0; state.score = 0; paintQuestion(); focusHeading(); });
      focusHeading();
    }

    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var n = { '1': 0, '2': 1, '3': 2, 'a': 0, 'b': 1, 'c': 2 }[e.key.toLowerCase()];
      if (n != null && main.querySelector('.option') && !state.answered) { e.preventDefault(); answer(n); }
    }
    document.addEventListener('keydown', onKey);
    view.cleanup = function () { document.removeEventListener('keydown', onKey); };
    paintQuestion();
  }

  function renderNotFound() {
    renderTabs(null);
    main.innerHTML = '<section class="screen empty">' + S.mascot('calm', 96) + '<h1 tabindex="-1">' + esc(t('notFound')) + '</h1><a class="btn primary" href="#/home">' + esc(t('home')) + '</a></section>';
  }

  // ---------- router ----------
  function focusHeading() {
    var h = main.querySelector('h1');
    if (h) h.focus({ preventScroll: true });
  }

  function render() {
    var parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
    var onboarded = store.get('onboarded', false) && favs().length >= 1;
    var route = parts[0] || '';

    // Stay on the same stack and just move cards when only the index changed.
    if (view.name === 'stack' && view.stack && view.goto && (route === view.stack.kind)) {
      var same = route === 'deck' ? parts[1] === view.stack.deckId : route === 'saved' ? parts[1] != null : true;
      if (same) { view.goto(+(route === 'deck' ? parts[2] : parts[1]) || 0); return; }
    }

    if (view.cleanup) { view.cleanup(); view.cleanup = null; }
    view.goto = null;
    if (route !== 'saved') view.stack = null;

    if (!onboarded && route !== 'welcome' && !(route === 'deck' && parts[1])) {
      if (!store.get('lang', null)) return go('#/welcome');
      return go('#/welcome/topics');
    }
    window.scrollTo(0, 0);
    clearTimeout(toastTimer); toastEl.classList.remove('show'); toastEl.hidden = true; // toasts belong to the previous screen
    view.name = route;
    switch (route) {
      case 'welcome': parts[1] === 'topics' ? renderTopicSetup('onboard') : renderWelcome(); break;
      case '': case 'home': renderHome(); break;
      case 'topics': renderTopics(); break;
      case 'saved':
        if (parts[1] != null) { view.name = 'stack'; renderStack('saved', null, +parts[1]); }
        else { view.stack = null; renderSaved(); }
        break;
      case 'settings': parts[1] === 'topics' ? renderTopicSetup('edit') : renderSettings(); break;
      case 'today': view.name = 'stack'; renderStack('today', null, +parts[1] || 0); break;
      case 'deck': view.name = 'stack'; renderStack('deck', parts[1], +parts[2] || 0); break;
      case 'done': renderDone(parts[1], parts[2]); break;
      case 'quiz': renderQuiz(parts[1], parts[2]); break;
      default: renderNotFound();
    }
    focusHeading();
  }

  // ---------- service worker & updates ----------
  var updateRequested = false;
  function showUpdate(worker) {
    var banner = document.getElementById('update-banner');
    var btn = document.getElementById('update-btn');
    btn.textContent = t('updateAvailable');
    banner.hidden = false;
    btn.onclick = function () {
      updateRequested = true;
      btn.textContent = t('updating');
      btn.disabled = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
    };
  }
  function registerSW() {
    if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
    var reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      // Only reload when the user asked for the update (not on first install).
      if (!updateRequested || reloading) return;
      reloading = true;
      location.reload();
    });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) {
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener('updatefound', function () {
        var w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', function () {
          if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w);
        });
      });
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') reg.update().catch(function () {});
      });
    }).catch(function () { /* offline support unavailable; app still works online */ });
  }

  // ---------- boot ----------
  applyLang(store.get('lang', 'en'));
  applyTheme();
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', function (e) {
    if (e.key === 'sparks.lang' || e.key === 'sparks.theme') { applyLang(store.get('lang', 'en')); applyTheme(); render(); }
  });
  render();
  registerSW();
  S.app = { render: render, toast: toast };
})(self.Sparks);
