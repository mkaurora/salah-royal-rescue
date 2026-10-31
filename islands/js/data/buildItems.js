/* Build / decorate items: footprint w×h (rotation 0–3, odd swaps w/h), layer 'floor' (paths, rugs: may sit under 'obj'
 * items) or 'obj'; solid = blocks the avatar; home = home plot only (no item uses it since v1.1: houses go on every island). Since v1.2 every house is 2x2 so the plot has room for other things; old saves keep each house's anchor and simply draw it at 2x2. Bought one copy at a time; quest gifts add copies.
 * UMD: SI.buildItems. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.buildItems = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PRICE = 2.3;   // global price scale (economy tuning, see dev/DESIGN.md §9)
  function price(c) { return c > 0 ? Math.max(5, Math.round(c * PRICE / 5) * 5) : 0; }
  var CATS = ['houses', 'furniture', 'plants', 'paths', 'fun', 'lights'];
  var CAT_NAMES = { houses: 'Houses', furniture: 'Furniture', plants: 'Plants', paths: 'Paths & fences', fun: 'Fun things', lights: 'Lights & signs' };

  // [id, name, icon, w, h, layer('f'|'o'), solid(1|0), home(1|0), coins, gems, req]
  var RAW = {
    houses: [
      ['b-hut', 'Beach Hut', '🛖', 2, 2, 'o', 1, 0, 220, 0],
      ['b-cabin', 'Wooden Cabin', '🏠', 2, 2, 'o', 1, 0, 340, 0, { level: 4 }],
      ['b-tent', 'Camp Tent', '⛺', 2, 2, 'o', 1, 0, 120, 0],
      ['b-treehouse', 'Tree House', '🌳', 2, 2, 'o', 1, 0, 520, 0, { level: 10 }],
      ['b-ice-dome', 'Ice Dome', '🧊', 2, 2, 'o', 1, 0, 400, 0, { chain: 'q4' }],
      ['b-lighthouse', 'Mini Lighthouse', '🗼', 2, 2, 'o', 1, 0, 0, 10, { level: 25 }]
    ],
    furniture: [
      ['b-bench', 'Wooden Bench', '🪑', 2, 1, 'o', 1, 0, 40, 0],
      ['b-table', 'Round Table', '🪵', 2, 2, 'o', 1, 0, 70, 0],
      ['b-chair', 'Garden Chair', '🪑', 1, 1, 'o', 1, 0, 30, 0],
      ['b-hammock', 'Hammock', '🛏️', 2, 1, 'o', 0, 0, 90, 0],
      ['b-picnic', 'Picnic Set', '🧺', 3, 2, 'o', 0, 0, 110, 0],
      ['b-standlamp', 'Reading Lamp', '💡', 1, 1, 'o', 1, 0, 50, 0],
      ['b-bookshelf', 'Bookshelf', '📚', 2, 1, 'o', 1, 0, 120, 0, { level: 3 }],
      ['b-rug', 'Cosy Rug', '🟫', 3, 2, 'f', 0, 0, 60, 0],
      ['b-beanbag', 'Bean Bag', '🟣', 1, 1, 'o', 0, 0, 45, 0],
      ['b-sunbed', 'Sun Lounger', '🏖️', 2, 1, 'o', 0, 0, 80, 0],
      ['b-lab-table', 'Lab Table', '🧪', 2, 1, 'o', 1, 0, 100, 0]
    ],
    plants: [
      ['b-palm', 'Palm Tree', '🌴', 1, 1, 'o', 1, 0, 40, 0],
      ['b-bush', 'Round Bush', '🌿', 1, 1, 'o', 1, 0, 25, 0],
      ['b-flowerpot', 'Flower Pot', '🪴', 1, 1, 'o', 1, 0, 20, 0],
      ['b-flowerbed', 'Flower Bed', '🌷', 2, 1, 'o', 0, 0, 45, 0],
      ['b-sunflowers', 'Sunflowers', '🌻', 1, 1, 'o', 1, 0, 35, 0],
      ['b-cactus', 'Little Cactus', '🌵', 1, 1, 'o', 1, 0, 30, 0],
      ['b-pine', 'Pine Tree', '🌲', 1, 1, 'o', 1, 0, 50, 0],
      ['b-blossom', 'Blossom Tree', '🌸', 2, 2, 'o', 1, 0, 140, 0, { level: 5 }],
      ['b-fern', 'Big Fern', '🍃', 1, 1, 'o', 1, 0, 30, 0],
      ['b-bamboo', 'Bamboo Patch', '🎋', 2, 1, 'o', 1, 0, 70, 0]
    ],
    paths: [
      ['b-stone-path', 'Stone Path', '⬜', 1, 1, 'f', 0, 0, 10, 0],
      ['b-plank-path', 'Plank Path', '🟫', 1, 1, 'f', 0, 0, 12, 0],
      ['b-sand-path', 'Sand Path', '🟨', 1, 1, 'f', 0, 0, 8, 0],
      ['b-stepping', 'Stepping Stones', '⚪', 1, 1, 'f', 0, 0, 15, 0],
      ['b-brick-path', 'Brick Path', '🧱', 1, 1, 'f', 0, 0, 14, 0],
      ['b-fence', 'Wooden Fence', '🪵', 1, 1, 'o', 1, 0, 15, 0],
      ['b-picket', 'Picket Fence', '🏡', 1, 1, 'o', 1, 0, 18, 0],
      ['b-rope', 'Rope Fence', '🪢', 1, 1, 'o', 1, 0, 20, 0],
      ['b-hedge', 'Hedge', '🟩', 1, 1, 'o', 1, 0, 25, 0],
      ['b-stonewall', 'Stone Wall', '🧱', 1, 1, 'o', 1, 0, 30, 0],
      ['b-arch', 'Garden Arch', '🌿', 2, 1, 'o', 0, 0, 80, 0, { level: 6 }]
    ],
    fun: [
      ['b-slide', 'Slide', '🛝', 3, 2, 'o', 1, 0, 200, 0, { level: 6 }],
      ['b-swing', 'Swing Set', '🎠', 3, 2, 'o', 1, 0, 180, 0, { level: 5 }],
      ['b-fountain', 'Fountain', '⛲', 2, 2, 'o', 1, 0, 260, 0, { level: 12 }],
      ['b-telescope', 'Telescope', '🔭', 1, 1, 'o', 1, 0, 150, 0],
      ['b-seesaw', 'Seesaw', '⚖️', 3, 1, 'o', 1, 0, 120, 0],
      ['b-sandpit', 'Sandpit', '🏝️', 3, 3, 'f', 0, 0, 90, 0],
      ['b-trampoline', 'Trampoline', '🟠', 2, 2, 'o', 1, 0, 200, 0, { level: 8 }],
      ['b-windmill', 'Windmill', '🌬️', 2, 2, 'o', 1, 0, 500, 0, { chain: 'q5' }],
      ['b-pond', 'Duck Pond', '🦆', 3, 2, 'o', 1, 0, 160, 0],
      ['b-mushroom', 'Bouncy Mushroom', '🍄', 1, 1, 'o', 1, 0, 70, 0],
      ['b-hopscotch', 'Hopscotch', '🔢', 1, 3, 'f', 0, 0, 35, 0],
      ['b-sundial', 'Sundial', '🕰️', 1, 1, 'o', 1, 0, 60, 0],
      ['b-birdbath', 'Bird Bath', '🐦', 1, 1, 'o', 1, 0, 60, 0],
      ['b-chime', 'Wind Chime Stand', '🎐', 1, 1, 'o', 1, 0, 55, 0],
      ['b-globe', 'Giant Globe', '🌍', 1, 1, 'o', 1, 0, 130, 0, { level: 9 }],
      ['b-kitestand', 'Kite Stand', '🪁', 1, 1, 'o', 1, 0, 70, 0],
      ['b-sandcastle', 'Sandcastle', '🏰', 2, 2, 'o', 1, 0, 110, 0, { chain: 'q1' }],
      ['b-jungle-swing', 'Jungle Swing', '🌴', 2, 2, 'o', 1, 0, 300, 0, { chain: 'q2' }],
      ['b-crystal-fountain', 'Crystal Fountain', '💎', 2, 2, 'o', 1, 0, 300, 0, { chain: 'q3' }],
      ['b-telescope-tower', 'Telescope Tower', '🔭', 2, 2, 'o', 1, 0, 600, 0, { chain: 'q6' }]
    ],
    lights: [
      ['b-lamppost', 'Lamp Post', '💡', 1, 1, 'o', 1, 0, 40, 0],
      ['b-crystal-lamp', 'Crystal Lamp', '💎', 1, 1, 'o', 1, 0, 70, 0],
      ['b-snow-lantern', 'Snow Lantern', '🏮', 1, 1, 'o', 1, 0, 50, 0],
      ['b-starlight', 'Star Light', '🌟', 1, 1, 'o', 1, 0, 60, 0],
      ['b-glowjar', 'Glow Jar', '🫙', 1, 1, 'o', 0, 0, 45, 0],
      ['b-signpost', 'Signpost', '🪧', 1, 1, 'o', 1, 0, 25, 0]
    ]
  };

  var items = [], byId = {}, byCat = {};
  CATS.forEach(function (cat) {
    byCat[cat] = [];
    RAW[cat].forEach(function (r) {
      var it = { id: r[0], cat: cat, name: r[1], icon: r[2], w: r[3], h: r[4], layer: r[5] === 'f' ? 'floor' : 'obj', solid: !!r[6],
        home: !!r[7], cost: price(r[8]), gems: r[9], req: r[10] || null, shape: r[0].slice(2) };
      items.push(it); byId[it.id] = it; byCat[cat].push(it);
    });
  });

  return { CATS: CATS, CAT_NAMES: CAT_NAMES, items: items, byId: byId, byCat: byCat };
});
