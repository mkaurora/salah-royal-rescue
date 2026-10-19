/* Transfer codes: JSON → compressed bytes → base64url, with a checksum.
 * Format:  SQ1-<method>-<checksum 8 hex>-<payload>
 *   method D = deflate-raw (CompressionStream), L = built-in LZW fallback, J = plain UTF-8.
 * All functions are async (CompressionStream is stream based). UMD; works in browsers and Node 18+. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.codec = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var G = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this);

  function utf8Encode(s) {
    if (G.TextEncoder) return new G.TextEncoder().encode(s);
    var bin = unescape(encodeURIComponent(s)), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function utf8Decode(b) {
    if (G.TextDecoder) return new G.TextDecoder('utf-8', { fatal: true }).decode(b);
    var s = '';
    for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
    return decodeURIComponent(escape(s));
  }

  function fnv(bytes) {
    var h = 0x811c9dc5;
    for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }

  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function b64urlEncode(bytes) {
    var out = '', i;
    for (i = 0; i + 2 < bytes.length; i += 3) {
      var n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += B64[n >> 18 & 63] + B64[n >> 12 & 63] + B64[n >> 6 & 63] + B64[n & 63];
    }
    var rest = bytes.length - i;
    if (rest === 1) { var a = bytes[i] << 16; out += B64[a >> 18 & 63] + B64[a >> 12 & 63]; }
    else if (rest === 2) { var b = (bytes[i] << 16) | (bytes[i + 1] << 8); out += B64[b >> 18 & 63] + B64[b >> 12 & 63] + B64[b >> 6 & 63]; }
    return out;
  }
  function b64urlDecode(s) {
    s = String(s).replace(/\s+/g, '');
    if (!/^[A-Za-z0-9\-_]*$/.test(s) || s.length % 4 === 1) throw new Error('bad characters');
    var out = new Uint8Array(Math.floor(s.length * 3 / 4)), o = 0, buf = 0, bits = 0;
    for (var i = 0; i < s.length; i++) {
      buf = (buf << 6) | B64.indexOf(s[i]); bits += 6;
      if (bits >= 8) { bits -= 8; out[o++] = (buf >> bits) & 255; }
    }
    return out.subarray(0, o);
  }

  /* ---- LZW over bytes, 16-bit codes (fallback when CompressionStream is missing) ---- */
  function lzwCompress(bytes) {
    var dict = new Map(), next = 256, w = '', codes = [];
    for (var i = 0; i < 256; i++) dict.set(String.fromCharCode(i), i);
    for (i = 0; i < bytes.length; i++) {
      var c = String.fromCharCode(bytes[i]), wc = w + c;
      if (dict.has(wc)) w = wc;
      else {
        codes.push(dict.get(w));
        if (next < 65536) dict.set(wc, next++);
        w = c;
      }
    }
    if (w) codes.push(dict.get(w));
    var out = new Uint8Array(codes.length * 2);
    codes.forEach(function (k, j) { out[2 * j] = k >> 8; out[2 * j + 1] = k & 255; });
    return out;
  }
  function lzwDecompress(bytes) {
    if (bytes.length % 2) throw new Error('bad lzw');
    var dict = [], next = 256, out = [], i;
    for (i = 0; i < 256; i++) dict[i] = [i];
    var prev = null;
    for (i = 0; i < bytes.length; i += 2) {
      var k = (bytes[i] << 8) | bytes[i + 1], entry;
      if (k < next && dict[k]) entry = dict[k];
      else if (k === next && prev) entry = prev.concat([prev[0]]);
      else throw new Error('bad lzw code');
      for (var j = 0; j < entry.length; j++) out.push(entry[j]);
      if (prev && next < 65536) dict[next++] = prev.concat([entry[0]]);
      prev = entry;
    }
    return new Uint8Array(out);
  }

  function streamThrough(bytes, Stream, fmt) {
    var s = new Stream(fmt);
    var writer = s.writable.getWriter();
    writer.write(bytes).catch(function () {});
    writer.close().catch(function () {});
    return new G.Response(s.readable).arrayBuffer().then(function (ab) { return new Uint8Array(ab); });
  }
  function hasStreams() { return !!(G.CompressionStream && G.DecompressionStream && G.Response); }

  /** obj → code string. method: 'D' | 'L' | 'J' (default: D when available, else L). */
  function encode(obj, method) {
    var bytes = utf8Encode(JSON.stringify(obj));
    var sum = fnv(bytes);
    method = method || (hasStreams() ? 'D' : 'L');
    var p = method === 'D' ? streamThrough(bytes, G.CompressionStream, 'deflate-raw')
      : Promise.resolve(method === 'L' ? lzwCompress(bytes) : bytes);
    return p.then(function (packed) { return 'SQ1-' + method + '-' + sum + '-' + b64urlEncode(packed); });
  }

  /** code string → obj. Rejects with a friendly Error on anything malformed or tampered. */
  function decode(code) {
    return Promise.resolve().then(function () {
      var m = /^\s*SQ1-([DLJ])-([0-9a-f]{8})-([A-Za-z0-9\-_\s]+?)\s*$/.exec(String(code || ''));
      if (!m) throw new Error('This is not a Learning Quest code.');
      var packed = b64urlDecode(m[3]);
      var p;
      if (m[1] === 'D') {
        if (!hasStreams()) throw new Error('This device cannot open this code.');
        p = streamThrough(packed, G.DecompressionStream, 'deflate-raw');
      } else p = Promise.resolve(m[1] === 'L' ? lzwDecompress(packed) : packed);
      return p.then(function (bytes) {
        if (fnv(bytes) !== m[2]) throw new Error('checksum');
        return JSON.parse(utf8Decode(bytes));
      });
    }).catch(function (e) {
      if (e && /Learning Quest code|cannot open/.test(e.message)) throw e;
      throw new Error('The code is damaged or incomplete.');
    });
  }

  return { encode: encode, decode: decode, fnv: fnv, b64urlEncode: b64urlEncode, b64urlDecode: b64urlDecode,
    lzwCompress: lzwCompress, lzwDecompress: lzwDecompress, utf8Encode: utf8Encode, utf8Decode: utf8Decode, hasStreams: hasStreams };
});
