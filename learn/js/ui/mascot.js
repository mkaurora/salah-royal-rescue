/* Ollie the Owl — the friendly mascot (SVG + CSS animation states: idle, cheer, think, wave, oops, talk). */
(function () {
  'use strict';
  var SQ = window.SQ = window.SQ || {};

  var n = 0;
  function owlSVG() {
    var k = 'ow' + (++n);
    return '<svg class="owl-svg" viewBox="0 0 160 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
      '<radialGradient id="' + k + 'b" cx=".4" cy=".3" r=".8"><stop offset="0" stop-color="#a77bff"/><stop offset=".6" stop-color="#7b4fe0"/><stop offset="1" stop-color="#5531b0"/></radialGradient>' +
      '<radialGradient id="' + k + 'y" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#fff6dc"/><stop offset="1" stop-color="#ffd98a"/></radialGradient>' +
      '<linearGradient id="' + k + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8f63f0"/><stop offset="1" stop-color="#4a2a9c"/></linearGradient>' +
      '</defs>' +
      '<ellipse class="owl-shadow" cx="80" cy="163" rx="40" ry="6" fill="rgba(0,0,0,.18)"/>' +
      '<g class="owl-body">' +
      // wings (behind body)
      '<g class="owl-wing owl-wing-l"><path d="M34 82 C10 92 8 124 26 140 C34 128 40 110 42 92 Z" fill="url(#' + k + 'w)"/></g>' +
      '<g class="owl-wing owl-wing-r"><path d="M126 82 C150 92 152 124 134 140 C126 128 120 110 118 92 Z" fill="url(#' + k + 'w)"/></g>' +
      // ear tufts
      '<path d="M40 40 L30 8 L62 30 Z" fill="#5f38c4"/><path d="M120 40 L130 8 L98 30 Z" fill="#5f38c4"/>' +
      // body
      '<ellipse cx="80" cy="92" rx="50" ry="64" fill="url(#' + k + 'b)"/>' +
      '<ellipse cx="80" cy="112" rx="32" ry="38" fill="url(#' + k + 'y)"/>' +
      '<path d="M62 104 q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0 M66 118 q4 5 8 0 q4 5 8 0 q4 5 8 0 M70 132 q4 5 8 0 q4 5 8 0" fill="none" stroke="#e9b85c" stroke-width="2.4" stroke-linecap="round"/>' +
      // face disc
      '<ellipse cx="80" cy="62" rx="44" ry="34" fill="#c7a8ff" opacity=".55"/>' +
      // eyes
      '<g class="owl-eyes">' +
      '<circle cx="60" cy="60" r="20" fill="#fff" stroke="#4a2a9c" stroke-width="3"/><circle cx="100" cy="60" r="20" fill="#fff" stroke="#4a2a9c" stroke-width="3"/>' +
      '<g class="owl-pupils"><circle cx="62" cy="62" r="10" fill="#2b1b4f"/><circle cx="102" cy="62" r="10" fill="#2b1b4f"/>' +
      '<circle cx="65" cy="58" r="3.6" fill="#fff"/><circle cx="105" cy="58" r="3.6" fill="#fff"/></g>' +
      '<g class="owl-lids"><circle cx="60" cy="60" r="21.5" fill="#7b4fe0" transform="scale(1 0)"/><circle cx="100" cy="60" r="21.5" fill="#7b4fe0" transform="scale(1 0)"/></g>' +
      '<path class="owl-happy" opacity="0" d="M46 62 Q60 46 74 62 M86 62 Q100 46 114 62" fill="none" stroke="#2b1b4f" stroke-width="5" stroke-linecap="round"/>' +
      '</g>' +
      // cheeks + beak
      '<ellipse cx="44" cy="80" rx="7" ry="4" fill="#ff8fb3" opacity=".7"/><ellipse cx="116" cy="80" rx="7" ry="4" fill="#ff8fb3" opacity=".7"/>' +
      '<g class="owl-beak"><path d="M72 76 L88 76 L80 90 Z" fill="#ffae2b" stroke="#d9800a" stroke-width="2" stroke-linejoin="round"/></g>' +
      // explorer scarf
      '<path d="M44 100 Q80 116 116 100 L114 110 Q80 126 46 110 Z" fill="#22c58b"/><path d="M98 110 L108 136 L94 132 Z" fill="#17a874"/>' +
      // feet
      '<path d="M62 152 l-6 8 M66 153 l0 9 M70 152 l6 8 M90 152 l-6 8 M94 153 l0 9 M98 152 l6 8" stroke="#ffae2b" stroke-width="5" stroke-linecap="round"/>' +
      '</g></svg>';
  }

  /** Mascot instance: m = SQ.mascot(container); m.set('cheer'); m.say('Hi!') */
  SQ.mascot = function (container, opts) {
    opts = opts || {};
    var el = document.createElement('div');
    el.className = 'owl ' + (opts.size ? 'owl-' + opts.size : '');
    el.innerHTML = owlSVG();
    container.appendChild(el);
    var timer = 0;
    var api = {
      el: el,
      set: function (state, ms) {
        clearTimeout(timer);
        el.classList.remove('is-cheer', 'is-think', 'is-wave', 'is-oops', 'is-talk');
        void el.offsetWidth;   // restart the CSS animation
        if (state && state !== 'idle') el.classList.add('is-' + state);
        if (ms) timer = setTimeout(function () { api.set('idle'); }, SQ.FAST ? Math.min(ms, 200) : ms);
        return api;
      },
      talk: function (p) {
        el.classList.add('is-talk');
        Promise.resolve(p).then(function () { el.classList.remove('is-talk'); });
      }
    };
    return api;
  };
})();
