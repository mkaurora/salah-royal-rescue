// Original inline SVG art: the Sparks mascot and one illustration per topic.
(function (S) {
  var INK = '#2A231C';

  // Deck colours: tint = illustration background (light), dark = background in dark mode.
  S.PALETTE = {
    'world-history':       { tint: '#F6E3C8', dark: '#3A2E20', main: '#D98E3A', deep: '#8A5420' },
    'islamic-arab-history':{ tint: '#D9EBE4', dark: '#1F332D', main: '#2F8F7A', deep: '#1D5C4E' },
    'gulf-kuwait':         { tint: '#D7E8F2', dark: '#1D2E3A', main: '#2E7FB0', deep: '#1B4F70' },
    'money-investing':     { tint: '#E1EED7', dark: '#26331E', main: '#5E9B3E', deep: '#3A6626' },
    'business-strategy':   { tint: '#E6E1F3', dark: '#2A2638', main: '#6B5BB5', deep: '#43397A' },
    'psychology-people':   { tint: '#F6DCE3', dark: '#3A2229', main: '#D0587A', deep: '#8C3550' },
    'tech-ai':             { tint: '#DCE6F7', dark: '#1F2738', main: '#4A73C9', deep: '#2C4A8A' },
    'parenting-family':    { tint: '#F8EBC9', dark: '#3A321C', main: '#E0A526', deep: '#93690F' },
    'health-body':         { tint: '#F8DDD6', dark: '#3A221D', main: '#E0563C', deep: '#953322' },
    'thinkers-books':      { tint: '#EDE3D6', dark: '#332A21', main: '#9A6B43', deep: '#5E3F24' },
    'spain-morocco':       { tint: '#F7DFCB', dark: '#3A271B', main: '#C9612F', deep: '#2F6F8F' },
    'science-space':       { tint: '#DCDDF2', dark: '#1C1D33', main: '#4B4FA8', deep: '#26296B' },
    'everyday-knowledge':  { tint: '#FBEACD', dark: '#3A2F1A', main: '#F28C28', deep: '#9A5414' }
  };

  function mascotBody(extra) {
    return '<defs><linearGradient id="spk-g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#FFB257"/><stop offset="1" stop-color="#F2661B"/></linearGradient></defs>' +
      (extra || '') +
      '<path d="M50 8 C57 31 69 43 92 50 C69 57 57 69 50 92 C43 69 31 57 8 50 C31 43 43 31 50 8Z" fill="url(#spk-g)" stroke="url(#spk-g)" stroke-width="7" stroke-linejoin="round"/>' +
      '<ellipse cx="43.5" cy="47" rx="2.6" ry="3.4" fill="' + INK + '"/>' +
      '<ellipse cx="56.5" cy="47" rx="2.6" ry="3.4" fill="' + INK + '"/>' +
      '<circle cx="44.4" cy="45.8" r=".9" fill="#fff"/><circle cx="57.4" cy="45.8" r=".9" fill="#fff"/>' +
      '<ellipse cx="38.5" cy="54" rx="3.2" ry="2" fill="#FF8D7A" opacity=".75"/>' +
      '<ellipse cx="61.5" cy="54" rx="3.2" ry="2" fill="#FF8D7A" opacity=".75"/>' +
      '<path d="M45.5 54.5 Q50 59 54.5 54.5" fill="none" stroke="' + INK + '" stroke-width="2" stroke-linecap="round"/>';
  }

  // mood: 'hello' | 'cheer' | 'calm'
  S.mascot = function (mood, size, label) {
    var extra = '';
    if (mood === 'cheer') {
      extra = '<g fill="#FFC23D"><path d="M14 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M84 12l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/></g>' +
        '<g fill="#F2661B" opacity=".8"><circle cx="20" cy="78" r="2.5"/><circle cx="86" cy="80" r="2"/><rect x="78" y="30" width="5" height="2.4" rx="1" transform="rotate(35 80 31)"/><rect x="12" y="38" width="5" height="2.4" rx="1" transform="rotate(-30 14 39)"/></g>';
    } else if (mood === 'hello') {
      extra = '<g fill="#FFC23D"><path d="M84 16l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/><circle cx="16" cy="24" r="2.2"/></g>';
    }
    var a11y = label ? ' role="img" aria-label="' + label + '"' : ' aria-hidden="true" focusable="false"';
    return '<svg class="mascot mascot-' + (mood || 'calm') + '" viewBox="0 0 100 100" width="' + (size || 64) + '" height="' + (size || 64) + '"' + a11y + '>' + mascotBody(extra) + '</svg>';
  };

  // Scenes are drawn on a 320x180 canvas.
  var SCENES = {
    'world-history': function (p) {
      return '<circle cx="250" cy="52" r="24" fill="#FFC86B"/>' +
        '<path d="M0 150 Q80 128 160 142 T320 136 V180 H0Z" fill="#E8C690"/>' +
        '<path d="M60 146 L110 70 L160 146Z" fill="' + p.main + '"/><path d="M110 70 L160 146 L128 146Z" fill="' + p.deep + '" opacity=".55"/>' +
        '<path d="M150 146 L184 96 L218 146Z" fill="' + p.main + '" opacity=".85"/><path d="M184 96 L218 146 L196 146Z" fill="' + p.deep + '" opacity=".5"/>' +
        '<g fill="#FFF7EA" stroke="' + INK + '" stroke-width="2"><rect x="232" y="104" width="64" height="8" rx="2"/><rect x="238" y="112" width="8" height="32"/><rect x="254" y="112" width="8" height="32"/><rect x="270" y="112" width="8" height="32"/><rect x="286" y="112" width="6" height="32"/><path d="M230 104 L264 88 L298 104Z"/></g>';
    },
    'islamic-arab-history': function (p) {
      return '<path d="M110 172 V92 Q110 40 160 30 Q210 40 210 92 V172Z" fill="' + p.main + '"/>' +
        '<path d="M126 172 V96 Q126 56 160 48 Q194 56 194 96 V172Z" fill="#F6EFE2"/>' +
        '<g transform="translate(160 104)" fill="none" stroke="' + p.deep + '" stroke-width="2.4"><rect x="-20" y="-20" width="40" height="40"/><rect x="-20" y="-20" width="40" height="40" transform="rotate(45)"/><circle r="9"/></g>' +
        '<path d="M262 40 a20 20 0 1 0 14 34 a16 16 0 1 1 -14 -34z" fill="#F7C65A"/>' +
        '<g transform="translate(58 112)"><circle r="30" fill="#F6EFE2" stroke="' + p.deep + '" stroke-width="3"/><circle r="20" fill="none" stroke="' + p.main + '" stroke-width="2"/><path d="M-26 0 H26 M0 -26 V26" stroke="' + p.deep + '" stroke-width="1.6"/><path d="M-4 -18 L4 18" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="-36" r="5" fill="none" stroke="' + p.deep + '" stroke-width="3"/></g>';
    },
    'gulf-kuwait': function (p) {
      return '<circle cx="64" cy="48" r="20" fill="#FFC86B"/>' +
        '<path d="M150 118 L150 30" stroke="' + INK + '" stroke-width="3"/>' +
        '<path d="M152 34 Q212 70 214 112 L152 112Z" fill="#FFF7EA" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M148 50 Q116 82 112 112 L148 112Z" fill="#F5E6CC" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M86 116 L232 116 Q222 140 196 142 L118 142 Q96 138 86 116Z" fill="' + p.deep + '"/><path d="M96 124 H226" stroke="#F6D49A" stroke-width="3"/>' +
        '<path d="M0 146 Q20 138 40 146 T80 146 T120 146 T160 146 T200 146 T240 146 T280 146 T320 146 V180 H0Z" fill="' + p.main + '"/>' +
        '<path d="M0 160 Q20 152 40 160 T80 160 T120 160 T160 160 T200 160 T240 160 T280 160 T320 160 V180 H0Z" fill="' + p.deep + '" opacity=".6"/>' +
        '<g transform="translate(268 112)"><path d="M-26 6 Q0 -30 26 6 Q0 18 -26 6Z" fill="#E9DCC9" stroke="' + INK + '" stroke-width="2"/><circle cx="0" cy="0" r="8" fill="#FFFFFF" stroke="#D9CDBE" stroke-width="1.5"/><circle cx="-2.5" cy="-2.5" r="2.4" fill="#FFFFFF"/></g>';
    },
    'money-investing': function (p) {
      return '<g fill="' + p.main + '"><rect x="40" y="120" width="30" height="36" rx="5"/><rect x="82" y="100" width="30" height="56" rx="5" opacity=".9"/><rect x="124" y="76" width="30" height="80" rx="5" opacity=".85"/><rect x="166" y="48" width="30" height="108" rx="5" opacity=".8"/></g>' +
        '<path d="M36 112 Q100 104 140 68 T204 30" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round"/><path d="M190 26 L206 28 L202 44" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<g stroke="' + INK + '" stroke-width="2"><ellipse cx="262" cy="148" rx="30" ry="9" fill="#F7C65A"/><rect x="232" y="128" width="60" height="20" fill="#F7C65A" stroke="none"/><path d="M232 128 V148 M292 128 V148"/><ellipse cx="262" cy="128" rx="30" ry="9" fill="#FCD97E"/><ellipse cx="262" cy="108" rx="30" ry="9" fill="#FCD97E"/><path d="M232 108 V128 M292 108 V128"/></g>' +
        '<path d="M0 158 H320" stroke="' + p.deep + '" stroke-width="3" opacity=".4"/>';
    },
    'business-strategy': function (p) {
      var sq = '';
      for (var r = 0; r < 3; r++) for (var c = 0; c < 6; c++) {
        if ((r + c) % 2 === 0) sq += '<rect x="' + (60 + c * 34) + '" y="' + (126 + r * 18) + '" width="34" height="18" fill="' + p.main + '" opacity=".35"/>';
      }
      return '<path d="M60 126 H264 V180 H60Z" fill="#FFF7EA"/>' + sq +
        '<g transform="translate(128 34)" stroke="' + INK + '" stroke-width="2.4" stroke-linejoin="round"><path d="M10 92 L14 64 Q2 54 8 36 Q14 14 36 8 L40 0 L46 10 Q66 18 68 46 L52 40 Q48 50 56 60 L58 92Z" fill="' + p.deep + '"/><circle cx="34" cy="24" r="3" fill="#fff" stroke="none"/><rect x="2" y="90" width="62" height="10" rx="3" fill="' + p.main + '"/></g>' +
        '<path d="M222 70 Q256 40 282 54" fill="none" stroke="' + INK + '" stroke-width="3" stroke-dasharray="6 6" stroke-linecap="round"/><path d="M272 44 L284 54 L270 62" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="50" cy="60" r="12" fill="' + p.main + '" opacity=".5"/>';
    },
    'psychology-people': function (p) {
      return '<path d="M96 160 V138 Q70 134 66 104 Q60 54 112 42 Q160 34 172 80 L184 100 L172 104 Q174 128 150 130 L150 160Z" fill="' + p.main + '"/>' +
        '<g fill="none" stroke="#FFF7EA" stroke-width="3" stroke-linecap="round"><path d="M96 82 Q104 66 120 72 Q134 60 144 76"/><path d="M92 100 Q110 92 120 102 Q132 92 146 100"/></g>' +
        '<g stroke="' + INK + '" stroke-width="2"><path d="M206 40 H286 Q296 40 296 50 V80 Q296 90 286 90 H236 L222 104 L224 90 H206 Q196 90 196 80 V50 Q196 40 206 40Z" fill="#FFF7EA"/></g>' +
        '<path d="M246 76 C232 64 236 52 246 58 C256 52 260 64 246 76Z" fill="' + p.main + '"/>' +
        '<g stroke="' + INK + '" stroke-width="2"><path d="M30 46 H74 Q82 46 82 54 V70 Q82 78 74 78 H50 L40 88 L42 78 H30 Q22 78 22 70 V54 Q22 46 30 46Z" fill="#FFF7EA"/></g><g fill="' + p.deep + '"><circle cx="40" cy="62" r="3"/><circle cx="52" cy="62" r="3"/><circle cx="64" cy="62" r="3"/></g>';
    },
    'tech-ai': function (p) {
      var pins = '';
      for (var i = 0; i < 4; i++) {
        var o = 102 + i * 18;
        pins += '<path d="M' + o + ' 40 V26 M' + o + ' 140 V154 M118 ' + (58 + i * 18) + ' H104 M' + 0 + ' 0"/>';
      }
      return '<g stroke="' + p.deep + '" stroke-width="3" stroke-linecap="round">' +
        '<path d="M102 40 V24 M120 40 V24 M138 40 V24 M156 40 V24 M102 140 V156 M120 140 V156 M138 140 V156 M156 140 V156 M80 62 H64 M80 80 H64 M80 98 H64 M80 116 H64 M178 62 H194 M178 80 H194 M178 98 H194 M178 116 H194"/></g>' +
        '<rect x="80" y="40" width="98" height="100" rx="14" fill="' + p.main + '"/><rect x="98" y="58" width="62" height="64" rx="8" fill="' + p.deep + '"/>' +
        '<path d="M112 94 L122 80 L132 98 L142 86 L148 94" fill="none" stroke="#9FE3FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<g transform="translate(252 92)" stroke="' + INK + '" stroke-width="2.4"><path d="M0 -50 V-38" /><circle cy="-54" r="5" fill="#FFB257"/><rect x="-36" y="-38" width="72" height="56" rx="16" fill="#FFF7EA"/><circle cx="-14" cy="-12" r="6" fill="' + p.main + '"/><circle cx="14" cy="-12" r="6" fill="' + p.main + '"/><path d="M-12 6 Q0 14 12 6" fill="none" stroke-linecap="round"/><rect x="-26" y="22" width="52" height="34" rx="10" fill="' + p.main + '" opacity=".6"/></g>' + pins.replace(/<path[^>]*>/g, '');
    },
    'parenting-family': function (p) {
      return '<path d="M0 156 Q160 140 320 156 V180 H0Z" fill="#E9D6A6"/>' +
        '<g transform="translate(110 0)"><path d="M0 150 V70" stroke="' + p.deep + '" stroke-width="5" stroke-linecap="round"/><path d="M0 104 Q-40 98 -46 62 Q-10 62 0 100Z" fill="#7DB05A"/><path d="M0 88 Q40 80 46 44 Q8 46 0 84Z" fill="#5E9B3E"/><path d="M-22 148 H22 L16 172 H-16Z" fill="' + p.main + '"/></g>' +
        '<g transform="translate(200 0)"><path d="M0 150 V112" stroke="' + p.deep + '" stroke-width="4" stroke-linecap="round"/><path d="M0 126 Q-26 122 -30 100 Q-6 100 0 124Z" fill="#9CC77B"/><path d="M0 120 Q24 114 28 94 Q4 96 0 118Z" fill="#7DB05A"/><path d="M-16 148 H16 L12 166 H-12Z" fill="' + p.main + '" opacity=".85"/></g>' +
        '<path d="M160 52 C140 34 146 18 160 28 C174 18 180 34 160 52Z" fill="#E0563C"/>' +
        '<circle cx="270" cy="44" r="18" fill="#FFC86B"/>';
    },
    'health-body': function (p) {
      return '<path d="M120 150 C50 104 40 60 76 44 C98 34 116 46 120 62 C124 46 142 34 164 44 C200 60 190 104 120 150Z" fill="' + p.main + '"/>' +
        '<path d="M90 68 Q96 56 108 56" fill="none" stroke="#FFF7EA" stroke-width="4" stroke-linecap="round" opacity=".8"/>' +
        '<path d="M20 100 H70 L82 78 L96 122 L110 92 L118 100 H300" fill="none" stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M246 40 Q268 68 268 84 A22 22 0 0 1 224 84 Q224 68 246 40Z" fill="#7CC3E8" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M232 132 Q254 106 290 116 Q272 150 232 132Z" fill="#7DB05A" stroke="' + INK + '" stroke-width="2"/><path d="M236 130 Q260 122 282 118" stroke="' + INK + '" stroke-width="1.6" fill="none"/>';
    },
    'thinkers-books': function (p) {
      return '<g stroke="' + INK + '" stroke-width="2"><rect x="40" y="132" width="110" height="20" rx="3" fill="' + p.main + '"/><rect x="50" y="112" width="96" height="20" rx="3" fill="#2F8F7A"/><rect x="44" y="92" width="104" height="20" rx="3" fill="#E0A526"/><rect x="56" y="72" width="86" height="20" rx="3" fill="' + p.deep + '"/></g>' +
        '<g fill="#FFF7EA" opacity=".8"><rect x="58" y="139" width="40" height="5" rx="2"/><rect x="62" y="99" width="30" height="5" rx="2"/></g>' +
        '<g stroke="' + INK + '" stroke-width="2"><path d="M176 70 Q206 58 236 70 V146 Q206 134 176 146Z" fill="#FFF7EA"/><path d="M236 70 Q266 58 296 70 V146 Q266 134 236 146Z" fill="#FFF7EA"/></g>' +
        '<g stroke="' + p.main + '" stroke-width="2" opacity=".7"><path d="M186 86 Q206 80 226 86 M186 100 Q206 94 226 100 M186 114 Q206 108 226 114 M246 86 Q266 80 286 86 M246 100 Q266 94 286 100"/></g>' +
        '<path d="M300 20 Q268 34 254 74 L260 76 Q280 44 300 20Z" fill="' + p.deep + '"/>';
    },
    'spain-morocco': function (p) {
      var tiles = '';
      for (var i = 0; i < 4; i++) {
        tiles += '<g transform="translate(' + (36 + i * 34) + ' 156)"><rect x="-15" y="-15" width="30" height="30" fill="' + (i % 2 ? p.deep : '#2F8F7A') + '"/><path d="M0 -11 L4 -4 L11 0 L4 4 L0 11 L-4 4 L-11 0 L-4 -4Z" fill="#FFF7EA"/></g>';
      }
      return '<rect x="30" y="20" width="160" height="122" fill="#FFF7EA" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M70 142 V86 Q58 52 110 40 Q162 52 150 86 V142Z" fill="' + p.main + '" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M82 142 V90 Q74 64 110 56 Q146 64 138 90 V142Z" fill="#F6E0C8"/>' + tiles +
        '<g transform="translate(250 30)" stroke="' + INK + '" stroke-width="2"><path d="M0 0 V14"/><path d="M-16 14 H16 L22 30 L14 74 H-14 L-22 30Z" fill="#E0A526"/><path d="M-10 34 H10 M-12 48 H12 M-10 62 H10" stroke="' + p.deep + '"/><path d="M-10 74 L0 88 L10 74" fill="#E0A526"/></g>' +
        '<circle cx="250" cy="130" r="20" fill="' + p.main + '" opacity=".25"/>';
    },
    'science-space': function (p) {
      return '<circle cx="150" cy="86" r="40" fill="' + p.main + '"/><path d="M118 76 Q150 66 184 80" stroke="#FFF7EA" stroke-width="5" fill="none" opacity=".5" stroke-linecap="round"/>' +
        '<ellipse cx="150" cy="88" rx="74" ry="16" fill="none" stroke="#F7C65A" stroke-width="6" transform="rotate(-14 150 88)"/>' +
        '<path d="M114 66 A40 40 0 0 1 186 70" fill="' + p.main + '"/>' +
        '<g fill="#FFC23D"><path d="M60 40l3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/><path d="M270 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><circle cx="246" cy="70" r="3"/><circle cx="40" cy="110" r="2.5"/></g>' +
        '<g transform="translate(262 150) rotate(-30)" stroke="' + INK + '" stroke-width="2"><rect x="-40" y="-10" width="64" height="20" rx="4" fill="#FFF7EA"/><rect x="24" y="-13" width="12" height="26" rx="3" fill="' + p.deep + '"/></g><path d="M262 154 L250 178 M262 154 L276 178" stroke="' + INK + '" stroke-width="2.4"/>';
    },
    'everyday-knowledge': function (p) {
      return '<g stroke="' + INK + '" stroke-width="2.4"><path d="M120 120 Q96 104 96 78 A40 40 0 0 1 176 78 Q176 104 152 120Z" fill="#FFD96B"/><rect x="120" y="120" width="32" height="10" rx="2" fill="#E9DCC9"/><rect x="122" y="130" width="28" height="10" rx="2" fill="#E9DCC9"/></g>' +
        '<path d="M128 104 Q136 86 136 78 M144 104 Q136 86 136 78" fill="none" stroke="' + p.deep + '" stroke-width="2"/>' +
        '<g stroke="' + p.main + '" stroke-width="4" stroke-linecap="round"><path d="M136 22 V10 M86 40 L78 32 M186 40 L194 32 M70 80 H58 M202 80 H214"/></g>' +
        '<g transform="translate(262 120)" stroke="' + INK + '" stroke-width="2.4"><path d="M-24 -20 H24 V12 Q24 30 0 30 Q-24 30 -24 12Z" fill="#FFF7EA"/><path d="M24 -10 Q38 -10 38 2 Q38 14 24 12" fill="none"/><path d="M-30 32 H30" stroke-linecap="round"/></g>' +
        '<g stroke="' + p.deep + '" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"><path d="M254 88 Q248 80 254 72 M266 88 Q260 80 266 72"/></g>' +
        '<g transform="translate(46 132)" stroke="' + INK + '" stroke-width="2.4"><circle r="24" fill="#FFF7EA"/><path d="M0 -14 V0 L10 6" stroke-linecap="round"/></g>';
    }
  };

  // Seeded sparkles so each card's illustration feels a little different.
  function sparkles(seed, color) {
    var rand = S.rng('art|' + seed);
    var out = '';
    for (var i = 0; i < 5; i++) {
      var x = Math.round(12 + rand() * 296), y = Math.round(10 + rand() * 60), s = 2 + rand() * 3;
      out += rand() > 0.5
        ? '<circle cx="' + x + '" cy="' + y + '" r="' + s.toFixed(1) + '" fill="' + color + '" opacity=".35"/>'
        : '<path transform="translate(' + x + ' ' + y + ') scale(' + (s / 4).toFixed(2) + ')" d="M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6Z" fill="' + color + '" opacity=".45"/>';
    }
    return out;
  }

  S.illustration = function (deckId, seed) {
    var p = S.PALETTE[deckId] || S.PALETTE['everyday-knowledge'];
    var scene = SCENES[deckId] || SCENES['everyday-knowledge'];
    return '<svg class="illo" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">' +
      sparkles(seed || deckId, p.deep) + scene(p) + '</svg>';
  };

  S.icon = function (name) {
    var paths = {
      today: '<path d="M12 3l2.2 5.6L20 9.5l-4.5 3.8L17 19l-5-3-5 3 1.5-5.7L4 9.5l5.8-.9z"/>',
      topics: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
      saved: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>',
      prev: '<path d="M15 5l-7 7 7 7"/>',
      next: '<path d="M9 5l7 7-7 7"/>',
      share: '<path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
      speaker: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
      stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
      flame: '<path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-3.5 2.5-5 .5 2 1.5 2.5 2.5 2.5C11 8 11 5.5 12 3z"/>',
      check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
      x: '<path d="M7 7l10 10M17 7L7 17"/>',
      link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
      bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
      star: '<path d="M12 3l2.6 5.6 6 .8-4.4 4.1 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.4l6-.8z"/>'
    };
    return '<svg class="icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (paths[name] || '') + '</svg>';
  };
})(self.Sparks = self.Sparks || {});
