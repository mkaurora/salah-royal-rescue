/* Build mode grid logic (pure). A layout is an array of placed items { uid, item, x, y, rot } with x,y relative to the zone's
 * top-left. Footprints rotate (odd rotation swaps w/h). Floor items (paths, rugs) may sit under obj items; obj items never
 * overlap; floor never overlaps floor. UMD: SI.build. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('buildItems', '../data/buildItems.js'), dep('islands', '../data/islands.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.build = mod; }
})(typeof self !== 'undefined' ? self : this, function (BI, ISL) {
  'use strict';

  var zones = {};
  ISL.list.forEach(function (i) { zones[i.zone.id] = { id: i.zone.id, island: i.n, kind: i.zone.kind, w: i.zone.w, h: i.zone.h, x: i.zone.x, y: i.zone.y }; });

  function zone(id) { return zones[id] || null; }
  function footprint(item, rot) {
    var it = typeof item === 'string' ? BI.byId[item] : item, odd = (rot | 0) % 2 === 1;
    return { w: odd ? it.h : it.w, h: odd ? it.w : it.h };
  }
  function cells(p) {
    var f = footprint(p.item, p.rot), out = [];
    for (var y = 0; y < f.h; y++) for (var x = 0; x < f.w; x++) out.push({ x: p.x + x, y: p.y + y });
    return out;
  }
  function overlaps(a, b) {
    var fa = footprint(a.item, a.rot), fb = footprint(b.item, b.rot);
    return a.x < b.x + fb.w && b.x < a.x + fa.w && a.y < b.y + fb.h && b.y < a.y + fa.h;
  }

  /** Can item go at x,y,rot in zone z given the other placed items? ignoreUid = the item being moved. → { ok, reason } */
  function canPlace(layout, itemId, x, y, rot, z, ignoreUid) {
    var it = BI.byId[itemId];
    if (!it) return { ok: false, reason: 'unknown' };
    if (typeof z === 'string') z = zone(z);
    if (!z) return { ok: false, reason: 'zone' };
    if (it.home && z.kind !== 'home') return { ok: false, reason: 'home-only' };
    var f = footprint(it, rot);
    if (x < 0 || y < 0 || x + f.w > z.w || y + f.h > z.h) return { ok: false, reason: 'bounds' };
    var cand = { item: itemId, x: x, y: y, rot: rot | 0 };
    for (var i = 0; i < layout.length; i++) {
      var p = layout[i];
      if (p.uid === ignoreUid) continue;
      if (BI.byId[p.item].layer === it.layer && overlaps(cand, p)) return { ok: false, reason: 'overlap' };
    }
    return { ok: true };
  }

  /** Check a stored layout is internally valid (used by sanitize). Returns the valid placements only. */
  function cleanLayout(list, z) {
    var out = [], seen = {};
    (Array.isArray(list) ? list : []).forEach(function (p) {
      if (!p || typeof p !== 'object' || !BI.byId[p.item]) return;
      var x = Math.floor(+p.x), y = Math.floor(+p.y), rot = ((Math.floor(+p.rot) || 0) % 4 + 4) % 4, uid = Math.floor(+p.uid);
      if (!isFinite(x) || !isFinite(y) || !(uid > 0) || seen[uid]) return;
      if (!canPlace(out, p.item, x, y, rot, z).ok) return;
      seen[uid] = true; out.push({ uid: uid, item: p.item, x: x, y: y, rot: rot });
    });
    return out;
  }

  /* ---- operations on a save S (S.build = { owned: {item:n}, zones: {zoneId:[...]}, nextUid }) ---- */
  function ensure(S) {
    S.build = S.build || {}; S.build.owned = S.build.owned || {}; S.build.zones = S.build.zones || {}; S.build.nextUid = S.build.nextUid || 1;
    return S.build;
  }
  function layoutOf(S, zoneId) { var B = ensure(S); return B.zones[zoneId] = B.zones[zoneId] || []; }
  function placedCount(S, itemId) {
    var B = ensure(S), n = 0;
    Object.keys(B.zones).forEach(function (z) { B.zones[z].forEach(function (p) { if (p.item === itemId) n++; }); });
    return n;
  }
  function available(S, itemId) { return Math.max(0, (ensure(S).owned[itemId] || 0) - placedCount(S, itemId)); }
  function totalPlaced(S, zoneId) { return layoutOf(S, zoneId).length; }

  function place(S, zoneId, itemId, x, y, rot) {
    var z = zone(zoneId), L = layoutOf(S, zoneId);
    if (!z) return { ok: false, reason: 'zone' };
    if (!available(S, itemId)) return { ok: false, reason: 'none-left' };
    var c = canPlace(L, itemId, x, y, rot || 0, z);
    if (!c.ok) return c;
    var B = ensure(S), p = { uid: B.nextUid++, item: itemId, x: x, y: y, rot: (rot || 0) % 4 };
    L.push(p); S.stats = S.stats || {}; S.stats.placed = (S.stats.placed || 0) + 1;
    return { ok: true, placed: p };
  }
  function find(L, uid) { for (var i = 0; i < L.length; i++) if (L[i].uid === uid) return i; return -1; }
  function move(S, zoneId, uid, x, y) {
    var L = layoutOf(S, zoneId), i = find(L, uid);
    if (i < 0) return { ok: false, reason: 'unknown' };
    var c = canPlace(L, L[i].item, x, y, L[i].rot, zoneId, uid);
    if (!c.ok) return c;
    L[i].x = x; L[i].y = y; return { ok: true, placed: L[i] };
  }
  /** rotate a placed item by 90° (keeps its top-left; if it no longer fits it is nudged back inside; else refused) */
  function rotate(S, zoneId, uid) {
    var L = layoutOf(S, zoneId), i = find(L, uid), z = zone(zoneId);
    if (i < 0) return { ok: false, reason: 'unknown' };
    var p = L[i], rot = (p.rot + 1) % 4, f = footprint(p.item, rot);
    var xs = [p.x, Math.max(0, z.w - f.w)], ys = [p.y, Math.max(0, z.h - f.h)];
    for (var a = 0; a < 2; a++) for (var b = 0; b < 2; b++) {
      var x = Math.min(xs[a], z.w - f.w), y = Math.min(ys[b], z.h - f.h);
      if (canPlace(L, p.item, x, y, rot, z, uid).ok) { p.x = x; p.y = y; p.rot = rot; return { ok: true, placed: p }; }
    }
    return { ok: false, reason: 'no-room' };
  }
  /** put an item back in the inventory */
  function store(S, zoneId, uid) {
    var L = layoutOf(S, zoneId), i = find(L, uid);
    if (i < 0) return { ok: false, reason: 'unknown' };
    L.splice(i, 1); return { ok: true };
  }
  /** Solid obstacles of a zone in ISLAND tile coordinates (for the walk grid). */
  function solidTiles(S, zoneId) {
    var z = zone(zoneId), out = {};
    layoutOf(S, zoneId).forEach(function (p) {
      if (!BI.byId[p.item].solid) return;
      cells(p).forEach(function (c) { out[(z.x + c.x) + ',' + (z.y + c.y)] = true; });
    });
    return out;
  }
  /** first free top-left where the item fits (tap-to-place helper) or null */
  function firstFit(S, zoneId, itemId, rot) {
    var z = zone(zoneId), L = layoutOf(S, zoneId);
    for (var y = 0; y < z.h; y++) for (var x = 0; x < z.w; x++) if (canPlace(L, itemId, x, y, rot || 0, z).ok) return { x: x, y: y };
    return null;
  }

  return { zones: zones, zone: zone, footprint: footprint, cells: cells, canPlace: canPlace, cleanLayout: cleanLayout, ensure: ensure, layoutOf: layoutOf,
    placedCount: placedCount, available: available, totalPlaced: totalPlaced, place: place, move: move, rotate: rotate, store: store, solidTiles: solidTiles, firstFit: firstFit };
});
