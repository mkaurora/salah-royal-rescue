/* World looks: palettes, fog, sky, weather and which roadside props grow where. Pure data used by the renderer.
 * Colours are hex; the road renderer pre-mixes every colour with the fog colour into FOG_STEPS shades once.
 * Browser only: RR.themes. */
(function (root) {
  'use strict';

  var T = {
    city: {
      key: 'city', light: 'day',
      sky: [[0, '#2f8ff0'], [0.55, '#7cc4ff'], [1, '#d6f0ff']],
      sun: { x: 0.78, y: 0.2, r: 0.05, color: '#fffbe0', glow: '#fff3b0', glowR: 0.35 },
      clouds: { color: '#ffffff', shade: '#cfe3f7', count: 9, y: [0.08, 0.5] },
      fog: '#cfe8ff', fogNear: 90, fogFar: 330,
      grass: ['#62c44c', '#56b543'], verge: ['#d9dbd6', '#c9ccc6'], vergeW: 2.2,
      rumble: ['#ffffff', '#e8413b'], road: ['#6e737d', '#686d77'], lane: '#ffffff', edge: '#f3f3f3', laneDash: true,
      closed: ['#f59a23', '#ffffff'],
      layers: [
        { kind: 'hills', color: '#8fd0a0', top: '#b8e6c2', height: 0.18, rough: 0.5, speed: 0.25, seed: 11 },
        { kind: 'skyline', color: '#7aa6cf', win: '#cfe6ff', height: 0.22, speed: 0.45, seed: 12 },
        { kind: 'hills', color: '#57ae55', top: '#72c46a', height: 0.12, rough: 0.8, speed: 0.75, seed: 13, trees: '#3f9a45' }
      ],
      props: [
        { kind: 'tree', w: 5, side: [1.5, 6] }, { kind: 'poplar', w: 2, side: [1.5, 7] }, { kind: 'lamp', w: 3, side: [0.4, 0.6], every: 40 },
        { kind: 'house', w: 2, side: [7, 12] }, { kind: 'shop', w: 2, side: [7, 12] }, { kind: 'tower', w: 2, side: [14, 26] },
        { kind: 'bush', w: 3, side: [0.8, 3] }, { kind: 'billboard', w: 0.6, side: [5, 8] }
      ],
      density: 0.85, weather: null, tint: null
    },
    desert: {
      key: 'desert', light: 'sunset',
      sky: [[0, '#2a1a5e'], [0.35, '#7a3a8c'], [0.65, '#e8605a'], [0.85, '#ff9a4f'], [1, '#ffd27a']],
      sun: { x: 0.3, y: 0.86, r: 0.09, color: '#fff1b8', glow: '#ffb347', glowR: 0.6 },
      clouds: { color: '#ff9f80', shade: '#9b4d8a', count: 6, y: [0.2, 0.6], streak: true },
      fog: '#f39a6e', fogNear: 70, fogFar: 320,
      grass: ['#e8a35e', '#dc9552'], verge: ['#c97f45', '#bf773f'], vergeW: 1.6,
      rumble: ['#fff3dc', '#d8462f'], road: ['#6f5b60', '#695559'], lane: '#ffe4a8', edge: '#ffe9c7', laneDash: true,
      closed: ['#ff7a1a', '#fff3dc'],
      layers: [
        { kind: 'mesas', color: '#8d3f6e', top: '#b45a7a', height: 0.2, speed: 0.2, seed: 21 },
        { kind: 'mesas', color: '#b4515a', top: '#e07a5f', height: 0.13, speed: 0.45, seed: 22 },
        { kind: 'dunes', color: '#d77e4c', top: '#f0a466', height: 0.07, speed: 0.75, seed: 23 }
      ],
      props: [
        { kind: 'cactus', w: 5, side: [1.5, 9] }, { kind: 'cactus2', w: 3, side: [1.5, 6] }, { kind: 'redrock', w: 3, side: [3, 14] },
        { kind: 'deadtree', w: 1.5, side: [3, 10] }, { kind: 'bigrock', w: 1, side: [16, 30] }, { kind: 'sign', w: 0.5, side: [1, 2] },
        { kind: 'scrub', w: 4, side: [0.6, 5] }
      ],
      density: 0.6, weather: 'dust', shimmer: true,
      tint: { top: 'rgba(255,120,60,0)', bottom: 'rgba(255,140,60,0.10)' }
    },
    snow: {
      key: 'snow', light: 'frost',
      sky: [[0, '#7fa8d6'], [0.6, '#bcd6f0'], [1, '#eef5fc']],
      sun: { x: 0.65, y: 0.25, r: 0.035, color: '#ffffff', glow: '#f2f8ff', glowR: 0.3 },
      clouds: { color: '#f4f8ff', shade: '#c4d3e6', count: 7, y: [0.05, 0.45] },
      fog: '#e2ecf7', fogNear: 50, fogFar: 250,
      grass: ['#f6f9ff', '#e6edf8'], verge: ['#c9d6e8', '#bccbe0'], vergeW: 1.4,
      rumble: ['#ffffff', '#d9323a'], road: ['#7f8999', '#798392'], lane: '#ffffff', edge: '#ffffff', laneDash: true,
      closed: ['#f59a23', '#ffffff'],
      layers: [
        { kind: 'peaks', color: '#9fb6d6', top: '#ffffff', height: 0.3, speed: 0.2, seed: 31 },
        { kind: 'peaks', color: '#7d97bd', top: '#f2f7ff', height: 0.2, speed: 0.4, seed: 32 },
        { kind: 'pines', color: '#4f6f86', top: '#e8f0fa', height: 0.09, speed: 0.75, seed: 33 }
      ],
      props: [
        { kind: 'pine', w: 6, side: [1.5, 10] }, { kind: 'pine2', w: 3, side: [2, 12] }, { kind: 'snowman', w: 0.6, side: [2, 5] },
        { kind: 'cabin', w: 1, side: [9, 15] }, { kind: 'snowrock', w: 2, side: [1.5, 8] }, { kind: 'sign', w: 0.4, side: [1, 2] },
        { kind: 'pole', w: 2, side: [0.4, 0.6], every: 30 }
      ],
      density: 0.8, weather: 'snow',
      tint: { top: 'rgba(230,240,255,0.0)', bottom: 'rgba(230,240,255,0.08)' }
    },
    jungle: {
      key: 'jungle', light: 'lush',
      sky: [[0, '#3d9ccc'], [0.5, '#8fd0c8'], [1, '#d6f2d2']],
      sun: { x: 0.18, y: 0.12, r: 0.04, color: '#fffbe6', glow: '#fff6c0', glowR: 0.45 },
      clouds: { color: '#f2fff4', shade: '#bfe0cf', count: 5, y: [0.05, 0.3] },
      fog: '#b6dcc0', fogNear: 45, fogFar: 240,
      grass: ['#2f9a3e', '#2a8b37'], verge: ['#1f6f2b', '#1c6627'], vergeW: 1.2,
      rumble: ['#8a5a36', '#e9d4a2'], road: ['#a8774c', '#a07148'], lane: null, edge: '#cfa877', laneDash: false,
      closed: ['#ff9a1a', '#fff3dc'],
      layers: [
        { kind: 'hills', color: '#5f9f86', top: '#7fb89c', height: 0.26, rough: 1.2, speed: 0.2, seed: 41 },
        { kind: 'canopy', color: '#2f7a46', top: '#47965a', height: 0.18, speed: 0.45, seed: 42 },
        { kind: 'canopy', color: '#1d5e30', top: '#2c7a3e', height: 0.1, speed: 0.75, seed: 43 }
      ],
      props: [
        { kind: 'palm', w: 4, side: [1.5, 8] }, { kind: 'jtree', w: 4, side: [3, 12] }, { kind: 'fern', w: 5, side: [0.5, 4] },
        { kind: 'banana', w: 3, side: [1, 6] }, { kind: 'flowers', w: 3, side: [0.4, 3] }, { kind: 'totem', w: 0.5, side: [3, 6] },
        { kind: 'vinetree', w: 2, side: [6, 16] }
      ],
      density: 1.15, weather: 'leaves', shafts: true, mist: true,
      tint: null
    },
    night: {
      key: 'night', light: 'night', dark: true,
      sky: [[0, '#04020e'], [0.55, '#140a34'], [0.85, '#3a1260'], [1, '#6a1f72']],
      sun: { x: 0.8, y: 0.16, r: 0.03, color: '#f4f2ff', glow: '#a9a2ff', glowR: 0.2, moon: true },
      clouds: { color: '#2a1d4f', shade: '#160f30', count: 6, y: [0.05, 0.4] },
      stars: 90,
      fog: '#100a24', fogNear: 25, fogFar: 230,
      grass: ['#0f1424', '#0d1120'], verge: ['#1a2036', '#171c30'], vergeW: 2,
      rumble: ['#ff3fb4', '#2a2c3e'], road: ['#1d2030', '#1a1d2c'], lane: '#3ff0ff', edge: '#ff4fc3', laneDash: true,
      closed: ['#ff8a1a', '#3a2f55'],
      layers: [
        { kind: 'skyline', color: '#1a1240', win: '#ffcf5a', height: 0.32, speed: 0.2, seed: 51, neon: true },
        { kind: 'skyline', color: '#120c2c', win: '#5af0ff', height: 0.22, speed: 0.45, seed: 52, neon: true },
        { kind: 'hills', color: '#0a0818', top: '#140f2a', height: 0.06, rough: 0.3, speed: 0.75, seed: 53 }
      ],
      props: [
        { kind: 'neon', w: 3, side: [3, 8] }, { kind: 'litbuilding', w: 3, side: [9, 18] }, { kind: 'nlamp', w: 3, side: [0.4, 0.6], every: 36 },
        { kind: 'npalm', w: 2, side: [1.5, 6] }, { kind: 'litbuilding', w: 1, side: [20, 34] }
      ],
      density: 0.8, weather: 'rain', headlights: true, reflections: true,
      tint: null
    }
  };

  var BY_WORLD = ['city', 'desert', 'snow', 'jungle', 'night'];
  function forWorld(w) { return T[BY_WORLD[(w - 1) | 0] || 'city']; }

  root.RR = root.RR || {};
  root.RR.themes = { T: T, BY_WORLD: BY_WORLD, forWorld: forWorld };
})(window);
