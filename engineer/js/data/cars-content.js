/* Car Builder & Race: parts, tracks, friendly racers and every spoken line (all voiced; see tools/collect-voice-lines.js).
 * Stats are simple on purpose so they "make sense" to a 7-year-old:
 *   bigger engine = faster but heavier · big/monster wheels = better on bumps, slower on smooth roads ·
 *   spoiler = helps on hills and ice (it presses the car down) · light car = climbs hills more easily · truck = tough on bumps. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.LE = root.LE || {}; root.LE.carsContent = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var parts = {
    body: [
      { id: 'buggy', name: 'Buggy', icon: '🏎️', w: 2, aero: 1, tough: 0 },
      { id: 'beetle', name: 'Bubble', icon: '🚗', w: 3, aero: 2, tough: 1 },
      { id: 'racer', name: 'Racer', icon: '🏁', w: 3, aero: 3, tough: 0 },
      { id: 'truck', name: 'Truck', icon: '🛻', w: 5, aero: 0, tough: 2 }
    ],
    wheels: [
      { id: 'small', name: 'Small', icon: '⚫', w: 1, flat: 1.06, bump: 0.55, grip: 1.0, r: 0.8 },
      { id: 'big', name: 'Big', icon: '⚙️', w: 2, flat: 1.0, bump: 0.85, grip: 0.97, r: 1.05 },
      { id: 'monster', name: 'Monster', icon: '🛞', w: 4, flat: 0.9, bump: 1.0, grip: 0.94, r: 1.4 }
    ],
    engine: [
      { id: 'small', name: 'Small', icon: '🔋', p: 3, w: 1 },
      { id: 'medium', name: 'Medium', icon: '🔥', p: 5, w: 2 },
      { id: 'big', name: 'Big', icon: '🚀', p: 7, w: 6 }
    ],
    spoiler: [
      { id: 'none', name: 'None', icon: '🚫', w: 0, on: false },
      { id: 'wing', name: 'Spoiler', icon: '🪽', w: 1, on: true }
    ],
    color: [
      { id: 'red', name: 'Red', hex: '#ff4f5e', dark: '#c22d3c' },
      { id: 'orange', name: 'Orange', hex: '#ff9f1c', dark: '#c97a00' },
      { id: 'yellow', name: 'Yellow', hex: '#ffd23f', dark: '#c9a000' },
      { id: 'green', name: 'Green', hex: '#3fcf6e', dark: '#22914a' },
      { id: 'blue', name: 'Blue', hex: '#3d8bff', dark: '#1f5cc2' },
      { id: 'purple', name: 'Purple', hex: '#a374ff', dark: '#6e45c9' }
    ],
    sticker: [
      { id: 'none', name: 'None', icon: '' },
      { id: 'star', name: 'Star', icon: '⭐' },
      { id: 'flame', name: 'Flame', icon: '🔥' },
      { id: 'bolt', name: 'Zap', icon: '⚡' },
      { id: 'heart', name: 'Heart', icon: '❤️' },
      { id: 'tiger', name: 'Tiger', icon: '🐯' }
    ]
  };
  var SLOTS = ['body', 'wheels', 'engine', 'spoiler', 'color', 'sticker'];
  var starter = { body: 'beetle', wheels: 'big', engine: 'medium', spoiler: 'none', color: 'red', sticker: 'star' };

  /* Tracks: segments of terrain (len in metres, dh = height change for hills). Friends race with a friendly
   * handicap (≤ 1) so early tracks are easy to win and later ones need the right parts. */
  var tracks = [
    { id: 'sunny', name: 'Sunny Road', icon: '🌞', sky: ['#7fd3ff', '#d6f3ff'], ground: '#7ed957', dirt: '#b8834f',
      segs: [{ k: 'flat', len: 360 }], friends: [{ id: 'bolt', pace: 0.86 }],
      intro: 'Sunny Road is flat and fast. Ready to race?' },
    { id: 'hills', name: 'Hill Hop', icon: '⛰️', sky: ['#8fd9ff', '#e3f7ff'], ground: '#5cc46a', dirt: '#9c6b3f',
      segs: [{ k: 'flat', len: 50 }, { k: 'up', len: 79, dh: 24 }, { k: 'down', len: 65, dh: -24 }, { k: 'flat', len: 29 }, { k: 'up', len: 72, dh: 22 }, { k: 'down', len: 58, dh: -22 }, { k: 'flat', len: 36 }],
      friends: [{ id: 'bolt', pace: 0.9 }, { id: 'zippy', pace: 0.9 }],
      intro: 'Hill Hop has big hills. Up and down we go!' },
    { id: 'desert', name: 'Bumpy Desert', icon: '🏜️', sky: ['#ffd88a', '#fff3d1'], ground: '#f2c46d', dirt: '#c98d3c',
      segs: [{ k: 'flat', len: 60 }, { k: 'bumpy', len: 300 }, { k: 'flat', len: 60 }],
      friends: [{ id: 'bolt', pace: 0.92 }, { id: 'zippy', pace: 0.95 }],
      intro: 'The desert road is very bumpy. Hold on tight!' },
    { id: 'ice', name: 'Ice Lake', icon: '❄️', sky: ['#bfe6ff', '#f2fbff'], ground: '#e9f6ff', dirt: '#9cc7e6',
      segs: [{ k: 'flat', len: 60 }, { k: 'ice', len: 300 }, { k: 'flat', len: 60 }],
      friends: [{ id: 'bolt', pace: 0.93 }, { id: 'zippy', pace: 0.95 }],
      intro: 'Ice Lake is slippery! Careful on the ice.' },
    { id: 'mountain', name: 'Mountain Pass', icon: '🏔️', sky: ['#9fc8ff', '#e8f1ff'], ground: '#6bbf7a', dirt: '#8a6a52',
      segs: [{ k: 'flat', len: 30 }, { k: 'up', len: 90, dh: 33 }, { k: 'flat', len: 18 }, { k: 'up', len: 72, dh: 24 }, { k: 'down', len: 84, dh: -36 }, { k: 'up', len: 54, dh: 18 }, { k: 'down', len: 66, dh: -39 }, { k: 'flat', len: 24 }],
      friends: [{ id: 'bolt', pace: 0.95 }, { id: 'zippy', pace: 0.97 }],
      intro: 'Mountain Pass goes up, up, up! Then down!' },
    { id: 'jungle', name: 'Jungle Jumble', icon: '🌴', sky: ['#9ee6b8', '#e6fff0'], ground: '#3fae5a', dirt: '#7a5233',
      segs: [{ k: 'flat', len: 29 }, { k: 'bumpy', len: 86 }, { k: 'up', len: 65, dh: 22 }, { k: 'bumpy', len: 79 }, { k: 'down', len: 65, dh: -22 }, { k: 'bumpy', len: 72 }, { k: 'flat', len: 29 }],
      friends: [{ id: 'bolt', pace: 1.0 }, { id: 'zippy', pace: 0.98 }],
      intro: 'Jungle Jumble has bumps and hills. What will you build?' },
    { id: 'grand', name: 'Grand Prix', icon: '🏆', sky: ['#a5b8ff', '#eef1ff'], ground: '#62c26e', dirt: '#8f6a4a',
      segs: [{ k: 'flat', len: 50 }, { k: 'up', len: 56, dh: 19 }, { k: 'down', len: 50, dh: -19 }, { k: 'bumpy', len: 74 }, { k: 'ice', len: 68 }, { k: 'up', len: 50, dh: 16 }, { k: 'down', len: 43, dh: -16 }, { k: 'flat', len: 56 }],
      friends: [{ id: 'bolt', pace: 0.98 }, { id: 'zippy', pace: 1.0 }],
      intro: 'The Grand Prix has a bit of everything! Good luck, engineer!' }
  ];

  var friends = {
    bolt: { id: 'bolt', name: 'Bolt', car: { body: 'beetle', wheels: 'big', engine: 'medium', spoiler: 'wing', color: 'blue', sticker: 'bolt' } },
    zippy: { id: 'zippy', name: 'Zippy', car: { body: 'racer', wheels: 'small', engine: 'big', spoiler: 'none', color: 'yellow', sticker: 'flame' } }
  };

  var LINES = {
    garageIntro: 'Welcome to the Car Builder! Build a car, then race it!',
    garageNew: 'A new car! Drag parts onto it.',
    garageFull: 'Your garage is full! Change a car, or remove one.',
    buildIntro: 'Drag parts onto your car. Then tap Race!',
    showMeLine: 'Watch! This part is good for the next track.',
    showMeGood: 'Your car is already great for the next track. Tap Race!',
    slot: {
      body: 'Pick a body. Light cars are quick. The truck is tough!',
      wheels: 'Small wheels are fast on smooth roads. Big wheels roll over bumps!',
      engine: 'A bigger engine is faster, but heavier!',
      spoiler: 'A spoiler presses the car down. It helps on hills and ice!',
      color: 'Pick a colour. Make it yours!',
      sticker: 'Add a sticker!'
    },
    pickTrack: 'Pick a race track!',
    trackLocked: 'Finish the track before this one to open it.',
    go: 'Three, two, one, go!',
    place: ['You won! Hooray!', 'Second place! Great racing!', 'Third place! You finished the race!'],
    newTrack: 'A new track is open!',
    again: 'Change your car and race again, any time!'
  };

  /* Gentle engineering tips after a race (one is picked by js/logic/cars.js). */
  var TIPS = {
    'wheels+:bumpy': 'Bumpy road! Bigger wheels roll over bumps more easily.',
    'wheels-:up': 'Big wheels are heavy! Smaller wheels climb hills more easily.',
    'wheels-:any': 'Smaller wheels are lighter and faster on smooth roads.',
    'engine+:up': 'Hills need power! Try a bigger engine.',
    'engine+:any': 'A bigger engine makes your car faster!',
    'engine-:ice': 'On ice, too much power makes the wheels spin. Try a smaller engine!',
    'engine-:up': 'A lighter car climbs hills more easily! Try a smaller engine.',
    'spoiler+:up': 'Try a spoiler! It helps on the hills.',
    'spoiler+:ice': 'Slippery! A spoiler helps the wheels grip the ice.',
    'spoiler-:any': 'A spoiler adds weight. On a flat road you can leave it off.',
    'body:up': 'A lighter body climbs hills more easily!',
    'body:bumpy': 'The tough truck body is great on bumpy roads!',
    'body:any': 'Try the racer body. It slips through the air!',
    'good:bumpy': 'Big wheels helped on the bumps!',
    'good:up': 'Your spoiler helped you up the hills!',
    'good:upLight': 'Your strong, light car zoomed up the hills!',
    'good:ice': 'Your spoiler pressed the wheels onto the ice. Good grip!',
    'good:iceGentle': 'A gentle engine kept your wheels gripping the ice!',
    'good:any': 'Great building! Your car was just right for this track!'
  };

  return { parts: parts, SLOTS: SLOTS, starter: starter, tracks: tracks, friends: friends, LINES: LINES, TIPS: TIPS, MAX_CARS: 6 };
});
