/* Avatar parts (free + a few paid) and 72 outfit items in 6 slots. All outfits are modest and fun.
 * req (optional): {level} | {chain} | {ach} | {set} | {stars} | {island} | {all:true}. Items with cost 0 and gems 0 are
 * owned as soon as req is met (or from the start). `shape` is the drawing id for the renderer. UMD: SI.wardrobe. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.wardrobe = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PRICE = 2.3;   // global price scale (economy tuning, see dev/DESIGN.md §9)
  function price(c) { return c > 0 ? Math.max(5, Math.round(c * PRICE / 5) * 5) : 0; }
  var SLOTS = ['hat', 'glasses', 'top', 'back', 'shoes', 'held'];
  var SLOT_NAMES = { hat: 'Hats', glasses: 'Glasses', top: 'Outfits', back: 'Capes & packs', shoes: 'Shoes', held: 'Hold' };

  // [id, name, icon, c1, c2, coins, gems, req]
  var RAW = {
    hat: [
      ['h-cap', 'Sunny Cap', '🧢', '#ffcf3c', '#e8a800', 0, 0],
      ['h-beanie', 'Woolly Beanie', '🧶', '#4f8cff', '#ffffff', 40, 0],
      ['h-sunhat', 'Straw Sun Hat', '👒', '#f2d27a', '#d9a441', 60, 0],
      ['h-explorer', 'Explorer Hat', '🤠', '#b98a52', '#7a5430', 90, 0],
      ['h-chef', 'Chef Hat', '🍳', '#ffffff', '#dfe6ee', 120, 0],
      ['h-tophat', 'Tall Top Hat', '🎩', '#3a3f5c', '#8a5cff', 180, 0],
      ['h-cone', 'Party Cone Hat', '🎉', '#ff7ac8', '#ffe45c', 70, 0],
      ['h-helmet', 'Bike Helmet', '⛑️', '#3fcf8e', '#ffffff', 100, 0],
      ['h-crown', 'Golden Crown', '👑', '#ffd23c', '#ff9a1f', 0, 15, { level: 20 }],
      ['h-sailor', 'Sailor Hat', '⛵', '#ffffff', '#3c7be0', 0, 0, { chain: 'q1' }],
      ['h-leaf', 'Leaf Hat', '🍃', '#6fcf4a', '#3f9a2e', 0, 0, { chain: 'q2' }],
      ['h-miner', 'Miner Helmet', '⛏️', '#ffc83c', '#8a8f9c', 0, 0, { chain: 'q3' }],
      ['h-winter', 'Fluffy Winter Hat', '❄️', '#e9f4ff', '#6bb4ff', 0, 0, { chain: 'q4' }],
      ['h-cloud', 'Cloud Cap', '☁️', '#ffffff', '#b8dcff', 0, 0, { chain: 'q5' }],
      ['h-lab', 'Lab Cap', '🧪', '#ffffff', '#ff9a3d', 0, 0, { chain: 'q6' }],
      ['h-space', 'Space Helmet', '🚀', '#e9eef7', '#4aa8ff', 400, 10, { level: 30 }]
    ],
    glasses: [
      ['g-round', 'Round Specs', '👓', '#3a3f5c', '#bfe6ff', 0, 0],
      ['g-sun', 'Sunnies', '🕶️', '#2b2f45', '#3b4a7a', 50, 0],
      ['g-square', 'Big Square Specs', '👓', '#ffffff', '#cfeaff', 60, 0],
      ['g-star', 'Star Shades', '⭐', '#ffcf3c', '#ff9a1f', 80, 0],
      ['g-explorer', 'Explorer Goggles', '🥽', '#b98a52', '#9ee0ff', 110, 0],
      ['g-monocle', 'Fancy Monocle', '🧐', '#ffd23c', '#dff3ff', 140, 0],
      ['g-lab', 'Lab Goggles', '🥽', '#ff9a3d', '#d6ffe9', 0, 0, { chain: 'q6' }],
      ['g-snow', 'Snow Goggles', '🥽', '#ffffff', '#7fc4ff', 0, 0, { chain: 'q4' }],
      ['g-moon', 'Moon Specs', '🌙', '#c9b8ff', '#fff3b0', 150, 5, { level: 15 }]
    ],
    top: [
      ['t-tee', 'Blue Tee', '👕', '#4f8cff', '#2f64d6', 0, 0],
      ['t-hoodie', 'Cosy Hoodie', '🧥', '#7a5cff', '#5238c9', 80, 0],
      ['t-stripe', 'Striped Jumper', '🧶', '#ff7a70', '#ffffff', 90, 0],
      ['t-raincoat', 'Yellow Raincoat', '🧥', '#ffd23c', '#e8a800', 120, 0],
      ['t-vest', 'Explorer Vest', '🦺', '#8fbf5a', '#5f8f2f', 130, 0],
      ['t-chef', 'Chef Coat', '🍳', '#ffffff', '#c9d3df', 150, 0],
      ['t-overalls', 'Garden Overalls', '👖', '#4a7cf0', '#ffd23c', 140, 0],
      ['t-poncho', 'Jungle Poncho', '🌿', '#3fb06a', '#ffd23c', 0, 0, { chain: 'q2' }],
      ['t-parka', 'Snow Parka', '🧥', '#ff9a3d', '#ffffff', 160, 0, { island: 4 }],
      ['t-labcoat', 'Lab Coat', '🥼', '#ffffff', '#9ec9ff', 0, 0, { chain: 'q6' }],
      ['t-dino', 'Dino Costume', '🦖', '#5fcf6a', '#2f9a44', 260, 0, { level: 12 }],
      ['t-astro', 'Space Suit', '🧑‍🚀', '#f4f7fb', '#4aa8ff', 450, 10, { level: 30 }],
      ['t-bee', 'Bee Costume', '🐝', '#ffd23c', '#2b2f45', 220, 0],
      ['t-penguin', 'Penguin Costume', '🐧', '#2b2f45', '#ffffff', 240, 0, { island: 4 }],
      ['t-cloudsuit', 'Fluffy Cloud Suit', '☁️', '#ffffff', '#bfe3ff', 280, 0, { chain: 'q5' }]
    ],
    back: [
      ['k-backpack', 'Little Backpack', '🎒', '#ff7a70', '#c9423a', 70, 0],
      ['k-cape-red', 'Hero Cape', '🦸', '#ff4f5e', '#b8203a', 100, 0],
      ['k-cape-blue', 'Starry Cape', '🌟', '#3a4fd6', '#ffd23c', 110, 0],
      ['k-wings', 'Butterfly Wings', '🦋', '#ff9ad0', '#9b7bff', 160, 5],
      ['k-shell', 'Turtle Shell Pack', '🐢', '#4fbf6a', '#2f8f44', 0, 0, { chain: 'q1' }],
      ['k-jetpack', 'Rocket Pack', '🚀', '#e9eef7', '#ff7a40', 300, 5, { level: 25 }],
      ['k-kite', 'Kite Pack', '🪁', '#ff7a70', '#ffd23c', 200, 0],
      ['k-leafcape', 'Leaf Cape', '🍃', '#6fcf4a', '#3f9a2e', 120, 0, { island: 2 }],
      ['k-scarfcape', 'Cosy Scarf Cape', '🧣', '#ff7a70', '#ffffff', 90, 0, { island: 4 }],
      ['k-golden', 'Golden Explorer Cape', '🏅', '#ffd23c', '#ff9a1f', 0, 0, { all: true }]
    ],
    shoes: [
      ['s-sneaker', 'Bouncy Sneakers', '👟', '#ffffff', '#4f8cff', 0, 0],
      ['s-boots', 'Rain Boots', '🥾', '#ffd23c', '#e8a800', 50, 0],
      ['s-hiking', 'Hiking Boots', '🥾', '#8a5a34', '#5a3a1f', 80, 0],
      ['s-sandals', 'Beach Sandals', '🩴', '#ff9a3d', '#ffe3a0', 40, 0],
      ['s-snow', 'Snow Boots', '🥾', '#6bb4ff', '#ffffff', 0, 0, { chain: 'q4' }],
      ['s-flippers', 'Duck Flippers', '🦆', '#ffcf3c', '#ff9a1f', 90, 0],
      ['s-rocket', 'Rocket Boots', '🚀', '#e9eef7', '#ff7a40', 250, 0, { level: 20 }],
      ['s-cloud', 'Cloud Slippers', '☁️', '#ffffff', '#bfe3ff', 0, 0, { chain: 'q5' }],
      ['s-gold', 'Golden Shoes', '✨', '#ffd23c', '#ff9a1f', 0, 10, { level: 10 }]
    ],
    held: [
      ['e-bucket', 'Sand Bucket', '🪣', '#ff7a70', '#ffd23c', 0, 0],
      ['e-net', 'Bug Net', '🥅', '#8fbf5a', '#e8e0c8', 40, 0],
      ['e-balloon', 'Red Balloon', '🎈', '#ff4f5e', '#ffffff', 30, 0],
      ['e-umbrella', 'Rain Umbrella', '☂️', '#4f8cff', '#ffffff', 60, 0],
      ['e-lantern', 'Little Lantern', '🏮', '#ffb23c', '#ff7a40', 70, 0],
      ['e-book', 'Story Book', '📖', '#9b7bff', '#ffffff', 50, 0],
      ['e-telescope', 'Telescope', '🔭', '#b98a52', '#ffd23c', 120, 0],
      ['e-brush', 'Paintbrush', '🖌️', '#ff9a3d', '#4f8cff', 60, 0],
      ['e-lens', 'Magnifier', '🔍', '#ffd23c', '#bfe6ff', 0, 0, { chain: 'q3' }],
      ['e-kite', 'Little Kite', '🪁', '#4fc3e8', '#ffd23c', 80, 0],
      ['e-pennant', 'Star Pennant', '🔺', '#ffd23c', '#4f8cff', 40, 0],
      ['e-lolly', 'Ice Lolly', '🍦', '#7ad7f0', '#ffffff', 30, 0],
      ['e-crab', 'Pet Crab Buddy', '🦀', '#ff7a70', '#c9423a', 100, 0, { chain: 'q1' }]
    ]
  };

  var items = [], byId = {}, bySlot = {};
  SLOTS.forEach(function (slot) {
    bySlot[slot] = [];
    RAW[slot].forEach(function (r) {
      var it = { id: r[0], slot: slot, name: r[1], icon: r[2], shape: r[0].slice(2), colors: [r[3], r[4]], cost: price(r[5]), gems: r[6], req: r[7] || null };
      items.push(it); byId[it.id] = it; bySlot[slot].push(it);
    });
  });

  /* avatar parts: id = 'p-<kind>-<key>' for the paid ones */
  var PARTS = {
    body: [
      { key: 'blob', name: 'Blobby', cost: 0 }, { key: 'bean', name: 'Tall Bean', cost: 0 }, { key: 'round', name: 'Round Ball', cost: 0 },
      { key: 'drop', name: 'Tiny Drop', cost: 0 }, { key: 'pear', name: 'Pear', cost: 60 }, { key: 'square', name: 'Squishy Square', cost: 80 }],
    color: [
      { key: 'lime', name: 'Lime', hex: '#9be34c', cost: 0 }, { key: 'sunny', name: 'Sunny', hex: '#ffcf3c', cost: 0 },
      { key: 'orange', name: 'Orange', hex: '#ff9a3d', cost: 0 }, { key: 'sky', name: 'Sky', hex: '#5bb8ff', cost: 0 },
      { key: 'mint', name: 'Mint', hex: '#52d6a2', cost: 0 }, { key: 'coral', name: 'Coral', hex: '#ff7a70', cost: 0 },
      { key: 'purple', name: 'Purple', hex: '#9b7bff', cost: 0 }, { key: 'teal', name: 'Teal', hex: '#2fc4c4', cost: 0 },
      { key: 'berry', name: 'Blueberry', hex: '#3f64e8', cost: 40 }, { key: 'candy', name: 'Candy', hex: '#ff8ccf', cost: 40 },
      { key: 'snow', name: 'Snow', hex: '#f1f6fb', cost: 60 }, { key: 'slate', name: 'Slate', hex: '#6a7088', cost: 60 }],
    eyes: [
      { key: 'round', name: 'Round', cost: 0 }, { key: 'big', name: 'Big', cost: 0 }, { key: 'happy', name: 'Happy arcs', cost: 0 },
      { key: 'sleepy', name: 'Sleepy', cost: 0 }, { key: 'one', name: 'One big eye', cost: 0 }, { key: 'star', name: 'Starry', cost: 0 },
      { key: 'sparkle', name: 'Sparkly', cost: 0 }],
    mouth: [
      { key: 'smile', name: 'Smile', cost: 0 }, { key: 'grin', name: 'Grin', cost: 0 }, { key: 'open', name: 'Open', cost: 0 },
      { key: 'tongue', name: 'Tongue out', cost: 0 }, { key: 'cat', name: 'Cat smile', cost: 0 }, { key: 'small', name: 'Small o', cost: 0 },
      { key: 'teeth', name: 'Bunny teeth', cost: 0 }],
    head: [
      { key: 'none', name: 'Nothing', cost: 0 }, { key: 'horns-small', name: 'Small horns', cost: 0 }, { key: 'horns-big', name: 'Big horns', cost: 30 },
      { key: 'antlers', name: 'Antlers', cost: 50 }, { key: 'bunny', name: 'Bunny ears', cost: 50 }, { key: 'round-ears', name: 'Round ears', cost: 0 },
      { key: 'antenna', name: 'One antenna', cost: 0 }, { key: 'antennae', name: 'Two antennae', cost: 0 }, { key: 'sprout', name: 'Leaf sprout', cost: 0 }]
  };
  var PART_KINDS = Object.keys(PARTS);
  PART_KINDS.forEach(function (k) { PARTS[k].forEach(function (p) { p.cost = price(p.cost); }); });
  function partId(kind, key) { return 'p-' + kind + '-' + key; }
  function partInfo(kind, key) { var l = PARTS[kind] || []; for (var i = 0; i < l.length; i++) if (l[i].key === key) return l[i]; return null; }
  var partIds = [];
  PART_KINDS.forEach(function (k) { PARTS[k].forEach(function (p) { p.id = partId(k, p.key); partIds.push(p.id); }); });

  function defaultAvatar() {
    return { body: 'blob', color: 'lime', eyes: 'big', mouth: 'smile', head: 'antennae',
      equip: { hat: 'h-cap', glasses: null, top: 't-tee', back: null, shoes: 's-sneaker', held: null } };
  }

  return { SLOTS: SLOTS, SLOT_NAMES: SLOT_NAMES, items: items, byId: byId, bySlot: bySlot, PARTS: PARTS, PART_KINDS: PART_KINDS,
    partId: partId, partInfo: partInfo, partIds: partIds, defaultAvatar: defaultAvatar };
});
