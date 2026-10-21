/* Road Racer — the 5 worlds and 30 levels. Pure data (+ tiny lookup helpers). Every level is deterministic: the
 * track builder (js/logic/track.js) turns a definition into the road and items with a seeded RNG (seed = id).
 *
 * Level definition fields
 *   id, index (0–29), world (1–5), level (1–6), name, icon, intro: 1–2 short lines for the intro card
 *   length (m), lanes, curvy 0–1, hilly 0–1          road shape knobs (or road: [[len, curve, hill], …])
 *   mix: { pattern: weight }                          obstacle patterns (pothole, pothole2, cone, slalom, oil,
 *                                                     puddle, rock, ramp) — see PATTERNS in track.js
 *   gap: [min, max]                                   metres of clear road between patterns (smaller = harder)
 *   coinGap                                           metres between coin rows
 *   traffic: { count, speed: [lo, hi] × base top speed, change: lane changes per car per 10 s }
 *   fuel: { tank: metres on a full tank, first, every } (null = no fuel gauge)
 *   timer: { slack } — time limit allows an average speed of slack × base top speed (null = no timer)
 *   checkpoints: mid-level respawn points, closures: lane-closure zones, wrenches: repair pickups
 *   boss: { kind, name, hp, speed × base top, drops: [types], dropEvery: s }
 *   stars: { coins: fraction for ⭐2, third: { type: 'hits', max } | { type: 'time', sec } }
 *   dark / rain / ice / mud: world look + the oil/puddle skin (sim mechanics are the same)
 *   features: what this level introduces (shown on the intro card, tested for gradual introduction)
 * UMD: module.exports in Node, RR.levels in the browser. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.RR = root.RR || {}; root.RR.levels = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WORLDS = [
    { id: 1, key: 'city', name: 'Sunny City', icon: '🏙️', offroad: 'grass',
      boss: { kind: 'van', name: 'Robber Van', icon: '🚐' } },
    { id: 2, key: 'desert', name: 'Sunset Desert', icon: '🏜️', offroad: 'sand',
      boss: { kind: 'sandtruck', name: 'Sand Truck', icon: '🚚' } },
    { id: 3, key: 'snow', name: 'Snowy Peaks', icon: '🏔️', offroad: 'snow',
      boss: { kind: 'plow', name: 'Snow Plow', icon: '🚜' } },
    { id: 4, key: 'jungle', name: 'Jungle Trail', icon: '🌴', offroad: 'jungle',
      boss: { kind: 'monster', name: 'Monster Truck', icon: '🛻' } },
    { id: 5, key: 'night', name: 'Neon Night', icon: '🌃', offroad: 'wet',
      boss: { kind: 'shadow', name: 'Shadow Racer', icon: '🏎️' } }
  ];

  function hits(max) { return { type: 'hits', max: max }; }
  function time(sec) { return { type: 'time', sec: sec }; }

  var L = [
    /* ---------------- World 1: Sunny City (bright day) ---------------- */
    { name: 'First Drive', icon: '🚗', length: 1100, lanes: 3, curvy: 0.1, hilly: 0,
      mix: { pothole: 1 }, gap: [95, 125], coinGap: 85, checkpoints: 0, wrenches: 0,
      stars: { coins: 0.5, third: hits(0) }, features: ['steer', 'pothole', 'coin'],
      intro: ['Steer with ◀ ▶ and press GAS!', 'Drive around the holes.'] },
    { name: 'Cone Zone', icon: '🚧', length: 1300, lanes: 3, curvy: 0.2, hilly: 0,
      mix: { pothole: 2, cone: 2 }, gap: [85, 115], coinGap: 85, checkpoints: 0, wrenches: 0,
      stars: { coins: 0.5, third: hits(0) }, features: ['cone'],
      intro: ['Orange cones block a lane.', 'Steer into a free lane!'] },
    { name: 'Splash Street', icon: '💦', length: 1500, lanes: 3, curvy: 0.35, hilly: 0,
      mix: { pothole: 2, cone: 1, puddle: 2 }, gap: [80, 110], coinGap: 85, checkpoints: 1, wrenches: 0,
      stars: { coins: 0.55, third: hits(0) }, features: ['puddle', 'curve', 'checkpoint'],
      intro: ['Puddles slow you down.', 'The road bends. Steer to stay on it!'] },
    { name: 'Up and Down', icon: '⛰️', length: 1700, lanes: 3, curvy: 0.35, hilly: 0.5,
      mix: { pothole: 2, pothole2: 1, cone: 2, puddle: 1 }, gap: [75, 105], coinGap: 85, checkpoints: 1, wrenches: 1,
      stars: { coins: 0.55, third: time(72) }, features: ['hill', 'wrench'],
      intro: ['Hills! You can not see over the top.', 'A wrench 🔧 fixes your car.'] },
    { name: 'Busy Road', icon: '🚙', length: 1800, lanes: 3, curvy: 0.3, hilly: 0.3,
      mix: { pothole: 2, cone: 2, puddle: 1 }, gap: [80, 110], coinGap: 85, checkpoints: 1, wrenches: 1,
      traffic: { count: 6, speed: [0.42, 0.5], change: 0 },
      stars: { coins: 0.55, third: hits(1) }, features: ['traffic'],
      intro: ['Other cars are on the road.', 'Pass them in a free lane.'] },
    { name: 'Catch the Robber Van!', icon: '🚐', length: 2600, lanes: 3, curvy: 0.3, hilly: 0.3,
      mix: { pothole: 2, puddle: 1 }, gap: [110, 150], coinGap: 90, checkpoints: 1, wrenches: 1,
      boss: { hp: 3, speed: 0.8, drops: ['cone'], dropEvery: 3 },
      stars: { coins: 0.45, coinCount: 25, third: hits(2) }, features: ['boss'],
      intro: ['Catch the Robber Van!', 'Bump it 3 times. Dodge its cones!'] },

    /* ---------------- World 2: Sunset Desert ---------------- */
    { name: 'Slippery Sands', icon: '🛢️', length: 1900, lanes: 3, curvy: 0.4, hilly: 0.3,
      mix: { pothole: 2, cone: 1, oil: 2 }, gap: [75, 100], coinGap: 85, checkpoints: 1, wrenches: 1,
      stars: { coins: 0.6, third: hits(1) }, features: ['oil'],
      intro: ['Watch out for oil!', 'It makes you slide.'] },
    { name: 'Jump!', icon: '🛹', length: 2000, lanes: 3, curvy: 0.35, hilly: 0.35,
      mix: { pothole: 2, cone: 1, oil: 1, ramp: 2 }, gap: [70, 100], coinGap: 85, checkpoints: 1, wrenches: 1,
      stars: { coins: 0.55, third: hits(1) }, features: ['ramp'],
      intro: ['Drive on a ramp to JUMP!', 'Grab the coins in the air.'] },
    { name: 'Fuel Run', icon: '⛽', length: 2400, lanes: 3, curvy: 0.4, hilly: 0.4,
      mix: { pothole: 2, cone: 1, oil: 1, puddle: 1, ramp: 1 }, gap: [70, 95], coinGap: 85, checkpoints: 1, wrenches: 1,
      fuel: { tank: 1100, first: 520, every: 520 },
      stars: { coins: 0.6, third: time(100) }, features: ['fuel'],
      intro: ['Your fuel goes down as you drive.', 'Grab the fuel cans ⛽!'] },
    { name: 'Blinker Highway', icon: '↔️', length: 2200, lanes: 4, curvy: 0.3, hilly: 0.3,
      mix: { pothole: 2, pothole2: 1, cone: 1, oil: 1 }, gap: [75, 100], coinGap: 85, checkpoints: 1, wrenches: 1,
      traffic: { count: 7, speed: [0.42, 0.52], change: 0.9 },
      stars: { coins: 0.6, third: hits(1) }, features: ['signal'],
      intro: ['Cars blink before they move over.', 'Blinking light = watch out!'] },
    { name: 'Beat the Clock', icon: '⏱️', length: 2400, lanes: 3, curvy: 0.45, hilly: 0.4,
      mix: { pothole: 2, cone: 1, oil: 1, puddle: 1, ramp: 1 }, gap: [70, 95], coinGap: 85, checkpoints: 2, wrenches: 1,
      timer: { slack: 0.6 },
      stars: { coins: 0.6, third: hits(1) }, features: ['timer'],
      intro: ['Reach each flag before time runs out!', 'Flags give you more time.'] },
    { name: 'Chase the Sand Truck!', icon: '🚚', length: 2800, lanes: 3, curvy: 0.4, hilly: 0.4,
      mix: { pothole: 2, oil: 1, ramp: 1 }, gap: [100, 140], coinGap: 90, checkpoints: 1, wrenches: 1,
      boss: { hp: 3, speed: 0.82, drops: ['oil', 'cone'], dropEvery: 2.8 },
      stars: { coins: 0.45, coinCount: 35, third: hits(2) }, features: ['boss'],
      intro: ['Catch the Sand Truck!', 'It drops oil. Steer around it!'] },

    /* ---------------- World 3: Snowy Peaks (oil = ice) ---------------- */
    { name: 'Lane Closed', icon: '🚧', length: 2200, lanes: 3, curvy: 0.4, hilly: 0.4, ice: true,
      mix: { pothole: 2, pothole2: 1, cone: 2 }, gap: [70, 95], coinGap: 85, checkpoints: 1, wrenches: 1, closures: 2,
      stars: { coins: 0.6, third: hits(1) }, features: ['narrow'],
      intro: ['Barriers close a lane!', 'Look for the arrows and move over.'] },
    { name: 'Rock Fall', icon: '🪨', length: 2300, lanes: 3, curvy: 0.4, hilly: 0.5, ice: true,
      mix: { pothole: 2, cone: 1, rock: 2 }, gap: [70, 95], coinGap: 85, checkpoints: 1, wrenches: 1, closures: 1,
      stars: { coins: 0.6, third: hits(2) }, features: ['rock'],
      intro: ['Rocks fall from the mountain!', 'A dark shadow shows where. Move away!'] },
    { name: 'Icy Curves', icon: '🧊', length: 2400, lanes: 3, curvy: 0.75, hilly: 0.4, ice: true,
      mix: { pothole: 1, cone: 2, oil: 3, slalom: 1 }, gap: [70, 95], coinGap: 85, checkpoints: 1, wrenches: 1,
      stars: { coins: 0.6, third: time(100) }, features: ['ice'],
      intro: ['Blue ice is slippery!', 'Big bends: steer early.'] },
    { name: 'Mountain Pass', icon: '🏔️', length: 2600, lanes: 3, curvy: 0.5, hilly: 0.85, ice: true,
      mix: { pothole: 2, pothole2: 1, cone: 1, oil: 1, rock: 2 }, gap: [65, 90], coinGap: 85, checkpoints: 2, wrenches: 1,
      closures: 1, traffic: { count: 6, speed: [0.42, 0.52], change: 0.6 },
      stars: { coins: 0.6, third: hits(2) }, features: [],
      intro: ['Big hills and falling rocks.', 'Go slow if you need to!'] },
    { name: 'Snowstorm Dash', icon: '❄️', length: 2600, lanes: 3, curvy: 0.5, hilly: 0.5, ice: true,
      mix: { pothole: 2, cone: 1, oil: 2, rock: 1, ramp: 1 }, gap: [65, 90], coinGap: 85, checkpoints: 2, wrenches: 1,
      timer: { slack: 0.6 }, fuel: { tank: 1200, first: 560, every: 560 },
      stars: { coins: 0.6, third: hits(2) }, features: [],
      intro: ['Beat the clock in the snow!', 'Do not forget fuel ⛽.'] },
    { name: 'Stop the Snow Plow!', icon: '🚜', length: 3000, lanes: 3, curvy: 0.45, hilly: 0.5, ice: true,
      mix: { pothole: 2, oil: 1, rock: 1 }, gap: [95, 130], coinGap: 90, checkpoints: 2, wrenches: 1,
      boss: { hp: 4, speed: 0.84, drops: ['oil', 'cone', 'rock'], dropEvery: 2.6 },
      stars: { coins: 0.45, coinCount: 60, third: hits(3) }, features: ['boss'],
      intro: ['Stop the Snow Plow!', 'Bump it 4 times. Watch for ice and snow!'] },

    /* ---------------- World 4: Jungle Trail (puddle = mud) ---------------- */
    { name: 'Muddy Trail', icon: '🟤', length: 2400, lanes: 2, curvy: 0.6, hilly: 0.5, mud: true,
      mix: { pothole: 2, puddle: 3, cone: 1 }, gap: [62, 87], coinGap: 85, checkpoints: 1, wrenches: 1,
      stars: { coins: 0.6, third: hits(2) }, features: ['mud'],
      intro: ['A narrow jungle road!', 'Mud slows you down.'] },
    { name: 'Vine Jumps', icon: '🌿', length: 2500, lanes: 3, curvy: 0.55, hilly: 0.6, mud: true,
      mix: { pothole: 2, puddle: 1, rock: 2, ramp: 2, oil: 1 }, gap: [59, 85], coinGap: 85, checkpoints: 2, wrenches: 1,
      stars: { coins: 0.6, third: time(106) }, features: [],
      intro: ['Jump over the mud!', 'Rocks fall here too.'] },
    { name: 'River Road', icon: '🌊', length: 2700, lanes: 3, curvy: 0.55, hilly: 0.5, mud: true,
      mix: { pothole: 2, pothole2: 1, cone: 1, puddle: 2, oil: 1 }, gap: [59, 85], coinGap: 85, checkpoints: 2, wrenches: 1,
      closures: 2, traffic: { count: 8, speed: [0.42, 0.55], change: 0.9 },
      stars: { coins: 0.6, third: hits(2) }, features: [],
      intro: ['Lanes close by the river.', 'Jeeps blink before they move.'] },
    { name: 'Long Way Home', icon: '🗺️', length: 3000, lanes: 3, curvy: 0.6, hilly: 0.6, mud: true,
      mix: { pothole: 2, pothole2: 1, cone: 1, slalom: 1, puddle: 1, oil: 1, rock: 1, ramp: 1 }, gap: [57, 82],
      coinGap: 85, checkpoints: 2, wrenches: 2, fuel: { tank: 1200, first: 560, every: 560 },
      traffic: { count: 6, speed: [0.42, 0.55], change: 0.9 },
      stars: { coins: 0.6, third: hits(3) }, features: [],
      intro: ['A long trip!', 'Keep your fuel up ⛽.'] },
    { name: 'Jungle Rush', icon: '🐆', length: 2800, lanes: 3, curvy: 0.6, hilly: 0.6, mud: true,
      mix: { pothole: 2, cone: 1, puddle: 1, oil: 1, rock: 2, ramp: 1 }, gap: [57, 82], coinGap: 85, checkpoints: 2,
      wrenches: 1, timer: { slack: 0.62 }, traffic: { count: 7, speed: [0.45, 0.55], change: 1.05 },
      stars: { coins: 0.6, third: hits(3) }, features: [],
      intro: ['Race the clock through the jungle!', 'Pass the jeeps with care.'] },
    { name: 'Monster Truck Showdown!', icon: '🛻', length: 3200, lanes: 3, curvy: 0.5, hilly: 0.6, mud: true,
      mix: { pothole: 2, puddle: 1, rock: 1 }, gap: [90, 125], coinGap: 90, checkpoints: 2, wrenches: 1,
      boss: { hp: 4, speed: 0.85, drops: ['rock', 'puddle', 'cone'], dropEvery: 2.5 },
      stars: { coins: 0.45, coinCount: 70, third: hits(3) }, features: ['boss'],
      intro: ['The Monster Truck is HUGE!', 'Bump it 4 times. Dodge the rocks!'] },

    /* ---------------- World 5: Neon Night (rain, dark, headlights) ---------------- */
    { name: 'Neon Lights', icon: '🌃', length: 2600, lanes: 3, curvy: 0.5, hilly: 0.4, dark: true, rain: true,
      mix: { pothole: 2, cone: 1, puddle: 2, oil: 1 }, gap: [57, 83], coinGap: 85, checkpoints: 2, wrenches: 1,
      traffic: { count: 8, speed: [0.42, 0.55], change: 0.9 },
      stars: { coins: 0.6, third: hits(2) }, features: ['night', 'rain'],
      intro: ['It is night and raining!', 'Your lights show the road.'] },
    { name: 'Rush Hour', icon: '🚕', length: 2800, lanes: 4, curvy: 0.45, hilly: 0.4, dark: true, rain: true,
      mix: { pothole: 2, pothole2: 1, cone: 1, puddle: 1, oil: 1 }, gap: [57, 83], coinGap: 85, checkpoints: 2,
      wrenches: 1, traffic: { count: 14, speed: [0.42, 0.58], change: 1.2 },
      stars: { coins: 0.6, third: hits(3) }, features: [],
      intro: ['So many cars!', 'Watch the blinking lights.'] },
    { name: 'Rainy Slide', icon: '🌧️', length: 2800, lanes: 3, curvy: 0.7, hilly: 0.5, dark: true, rain: true,
      mix: { pothole: 1, cone: 1, slalom: 1, puddle: 2, oil: 3 }, gap: [55, 80], coinGap: 85, checkpoints: 2,
      wrenches: 1, traffic: { count: 6, speed: [0.42, 0.55], change: 0.9 },
      stars: { coins: 0.6, third: time(120) }, features: [],
      intro: ['Wet roads and oil!', 'Steer gently on big bends.'] },
    { name: 'Tunnel Trouble', icon: '🚇', length: 3000, lanes: 3, curvy: 0.55, hilly: 0.5, dark: true, rain: true,
      mix: { pothole: 2, pothole2: 1, cone: 1, puddle: 1, oil: 1, rock: 2 }, gap: [53, 77], coinGap: 85,
      checkpoints: 2, wrenches: 2, closures: 2, traffic: { count: 8, speed: [0.42, 0.55], change: 1.05 },
      stars: { coins: 0.6, third: hits(3) }, features: [],
      intro: ['Lanes close in the dark!', 'Rocks fall. Look for shadows.'] },
    { name: 'Midnight Clock', icon: '🕛', length: 3200, lanes: 3, curvy: 0.6, hilly: 0.6, dark: true, rain: true,
      mix: { pothole: 2, pothole2: 1, cone: 1, slalom: 1, puddle: 1, oil: 1, rock: 1, ramp: 1 }, gap: [53, 77],
      coinGap: 85, checkpoints: 3, wrenches: 2, timer: { slack: 0.62 }, fuel: { tank: 1300, first: 600, every: 600 },
      traffic: { count: 8, speed: [0.42, 0.55], change: 1.05 },
      stars: { coins: 0.6, third: hits(3) }, features: [],
      intro: ['The big night race!', 'Fuel, flags and cars. You can do it!'] },
    { name: 'Race the Shadow Racer!', icon: '🏎️', length: 3600, lanes: 3, curvy: 0.5, hilly: 0.5, dark: true, rain: true,
      mix: { pothole: 2, puddle: 1, oil: 1, rock: 1 }, gap: [80, 115], coinGap: 90, checkpoints: 2, wrenches: 2,
      traffic: { count: 4, speed: [0.42, 0.5], change: 0.6 },
      boss: { hp: 5, speed: 0.87, drops: ['oil', 'cone', 'rock'], dropEvery: 2.3 },
      stars: { coins: 0.45, coinCount: 75, third: hits(4) }, features: ['boss'],
      intro: ['The Shadow Racer is the fastest!', 'Bump it 5 times to win!'] }
  ];

  var LEVELS = L.map(function (d, i) {
    var world = Math.floor(i / 6) + 1, level = i % 6 + 1, w = WORLDS[world - 1];
    var o = { id: 'w' + world + '-' + level, index: i, world: world, level: level, seed: 'rr-w' + world + '-' + level,
      checkpoints: 0, wrenches: 0, closures: 0, traffic: null, fuel: null, timer: null, boss: null };
    for (var k in d) o[k] = d[k];
    if (o.boss) {
      var b = {};
      for (var bk in w.boss) b[bk] = w.boss[bk];
      for (var bk2 in o.boss) b[bk2] = o.boss[bk2];
      o.boss = b;
    }
    return o;
  });

  function byId(id) { for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i]; return null; }
  function isBoss(i) { return i % 6 === 5; }
  function isWorldStart(i) { return i % 6 === 0; }
  function worldOf(i) { return WORLDS[Math.floor(i / 6)]; }

  /** Intro-card text for the 3 stars. */
  function starText(def) {
    var t = def.stars.third;
    return [
      def.boss ? 'Catch the ' + def.boss.name : 'Finish the race',
      'Get ' + Math.round(def.stars.coins * 100) + '% of the coins',
      t.type === 'time' ? 'Finish in ' + t.sec + ' seconds' : t.max === 0 ? 'No crashes' :
        'Crash ' + t.max + (t.max === 1 ? ' time' : ' times') + ' or less'
    ];
  }

  return { WORLDS: WORLDS, LEVELS: LEVELS, COUNT: LEVELS.length, byId: byId, isBoss: isBoss,
    isWorldStart: isWorldStart, worldOf: worldOf, starText: starText };
});
