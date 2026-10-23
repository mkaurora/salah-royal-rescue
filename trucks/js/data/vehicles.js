/* Workshop vehicles: 10 original vehicles, each with an ordered list of repair tasks (cost in wrenches) and, on some
 * tasks, a CHOICE of 3 options (paint colour, wheel style, light style). `part` tells the renderer which layer of the
 * drawing the task adds / changes. Beyond the last vehicle they cycle with a new colour variant (vehicleInfo).
 * UMD: module.exports in Node, TW.vehicles in the browser. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.TW = root.TW || {}; root.TW.vehicles = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var WHEELS = [{ id: 'classic', name: 'Classic' }, { id: 'sport', name: 'Sport' }, { id: 'chunky', name: 'Chunky' }];
  var LIGHTS = [{ id: 'round', name: 'Round' }, { id: 'square', name: 'Square' }, { id: 'star', name: 'Star' }];

  /* name, body colours for the 3 paint options ([main, dark]) */
  var BASE = [
    { id: 'muscle', name: 'Muscle Car', paints: [['#e53935', '#8e1b1b'], ['#1e88e5', '#0d47a1'], ['#fdd835', '#b8860b']],
      extra: [['stripes', 'Racing stripes', 2], ['hood', 'Hood scoop', 2]] },
    { id: 'pickup', name: 'Pickup Truck', paints: [['#43a047', '#1b5e20'], ['#fb8c00', '#a85a00'], ['#8e24aa', '#4a148c']],
      extra: [['bed', 'Cargo bed', 3], ['rack', 'Roof rack', 1]] },
    { id: 'tow', name: 'Tow Truck', paints: [['#fdd835', '#b8860b'], ['#ef5350', '#8e1b1b'], ['#26a69a', '#00695c']],
      extra: [['crane', 'Crane arm', 3], ['hook', 'Tow hook', 2]] },
    { id: 'monster', name: 'Monster Truck', paints: [['#7cb342', '#33691e'], ['#ec407a', '#880e4f'], ['#29b6f6', '#01579b']],
      extra: [['springs', 'Big springs', 3], ['flames', 'Flame decals', 2]] },
    { id: 'fire', name: 'Fire Truck', paints: [['#e53935', '#8e1b1b'], ['#ffb300', '#b36b00'], ['#f5f5f5', '#9e9e9e']],
      extra: [['ladder', 'Ladder', 3], ['siren', 'Siren lights', 2]] },
    { id: 'mail', name: 'Mail Truck', paints: [['#1e88e5', '#0d47a1'], ['#f5f5f5', '#9e9e9e'], ['#e53935', '#8e1b1b']],
      extra: [['mailbox', 'Mail slot', 2], ['sliding', 'Sliding door', 2]] },
    { id: 'icecream', name: 'Ice-Cream Truck', paints: [['#f48fb1', '#c2185b'], ['#80deea', '#00838f'], ['#fff59d', '#c0a800']],
      extra: [['cone', 'Big ice-cream cone', 3], ['speaker', 'Music speaker', 2]] },
    { id: 'dump', name: 'Dump Truck', paints: [['#fb8c00', '#a85a00'], ['#fdd835', '#b8860b'], ['#78909c', '#37474f']],
      extra: [['tipper', 'Tipper bed', 4], ['piston', 'Lifting piston', 2]] },
    { id: 'race', name: 'Race Car', paints: [['#ab47bc', '#4a148c'], ['#ef5350', '#8e1b1b'], ['#00e5ff', '#006978']],
      extra: [['spoiler', 'Spoiler', 3], ['number', 'Race number', 1]] },
    { id: 'bus', name: 'School Bus', paints: [['#ffc107', '#b38600'], ['#66bb6a', '#2e7d32'], ['#42a5f5', '#1565c0']],
      extra: [['stopsign', 'Stop sign', 2], ['seats', 'Bus seats', 3]] }
  ];

  /* Common repair order. [part, label, cost, choice] */
  function tasksFor(v, idx) {
    var T = [
      ['rust', 'Clean the rust', 1],
      ['engine', 'Fix the engine', 3],
      ['wheels', 'New wheels', 3, 'wheels'],
      ['panels', 'Fix the body panels', 2],
      ['paint', 'Paint', 3, 'paint'],
      ['lights', 'Headlights', 2, 'lights'],
      ['horn', 'Horn', 1],
      ['bumpers', 'Bumpers', 2],
      ['windows', 'Windows', 2],
      ['exhaust', 'Exhaust pipe', 1]
    ];
    var ex = v.extra.slice();
    T.splice(Math.min(7, T.length), 0, ex[0]);
    if (idx % 2 === 1 || idx === 4) T.splice(T.length - 1, 0, ex[1]);   // 11 or 12 tasks per vehicle
    return T.map(function (t, k) {
      var task = { id: t[0], name: t[1], cost: t[2], part: t[0] };
      if (t[3]) {
        task.choice = t[3];
        task.options = t[3] === 'paint' ? v.paints.map(function (p, n) { return { id: 'p' + n, name: ['Colour 1', 'Colour 2', 'Colour 3'][n], main: p[0], dark: p[1] }; })
          : (t[3] === 'wheels' ? WHEELS : LIGHTS).map(function (o) { return { id: o.id, name: o.name }; });
      }
      return task;
    });
  }

  var VEHICLES = BASE.map(function (v, idx) {
    return { id: v.id, name: v.name, paints: v.paints, tasks: tasksFor(v, idx) };
  });

  /** Info for the k-th vehicle in the endless sequence (0-based). variant > 0 = same truck, new colours + "II" etc. */
  function vehicleInfo(k) {
    k = Math.max(0, Math.floor(k) || 0);
    var v = VEHICLES[k % VEHICLES.length], variant = Math.floor(k / VEHICLES.length);
    return { index: k, base: k % VEHICLES.length, variant: variant, id: v.id, name: v.name + (variant ? ' ' + roman(variant + 1) : ''),
      tasks: v.tasks, paints: v.paints, hueShift: variant * 47 };
  }
  function roman(n) { return ['', '', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n] || String(n); }

  function totalCost(k) { return vehicleInfo(k).tasks.reduce(function (s, t) { return s + t.cost; }, 0); }

  return { VEHICLES: VEHICLES, WHEELS: WHEELS, LIGHTS: LIGHTS, vehicleInfo: vehicleInfo, totalCost: totalCost };
});
