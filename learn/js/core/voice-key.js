/* Voice clip keys: maps a spoken line to its pre-generated clip audio/voice/<key>.mp3.
 * UMD — the same code runs in the browser (SQ.voiceKey) and in Node tools/tests. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.voiceKey = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** The cleaning used before speaking: strip emoji/symbols, collapse whitespace, trim. */
  function normalize(text) {
    return String(text === undefined || text === null ? '' : text)
      .replace(/[^\w\s.,!?'’\-:;]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /** UTF-8 bytes of a string (no TextEncoder needed). */
  function utf8(s) {
    var out = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
        var d = s.charCodeAt(i + 1);
        if (d >= 0xdc00 && d <= 0xdfff) { c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00); i++; }
      }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }

  /** 8-hex-char FNV-1a 32-bit hash of the normalized text (lowercased for hashing only). */
  function key(text) {
    var bytes = utf8(normalize(text).toLowerCase());
    var h = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i++) {
      h ^= bytes[i];
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  function clipPath(text) { return 'audio/voice/' + key(text) + '.mp3'; }

  return { normalize: normalize, key: key, clipPath: clipPath };
});
