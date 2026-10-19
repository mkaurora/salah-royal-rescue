/* Every fixed line the app shell speaks (menu, praise, feedback, win…). UMD so tools/collect-voice-lines.js and
 * the tests can read it. Keep lines short and simple — Salah is 7 and learning English. */
(function (root, factory) {
  var mod = factory();
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SQ = root.SQ || {}; root.SQ.LINES = mod; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
    greet: ['Hi Salah! Ready to learn?', 'Hello Salah! Pick a world to play.', 'Welcome back, Salah! Let us play!'],
    worlds: { math: 'Number Jungle!', english: 'Word Castle!', science: 'Discovery Lab!' },
    mapPick: 'Tap a level to play.',
    locked: 'This level is locked. Finish the one before it!',
    play: "Let's go!",
    praise: ['Great job!', 'Awesome!', 'You got it!', 'Super!', 'Well done, Salah!', 'Yes! That is right!',
      'Fantastic!', 'Way to go!', 'Brilliant!', 'Nice work!', 'You are so smart!', 'Perfect!'],
    streak: ['Wow! Three in a row!', 'You are on fire, Salah!', 'Super streak!'],
    tryAgain: ["Let's try again!", 'Almost! Try again.', 'Oops! Try one more time.'],
    hint: "Here's a hint.",
    swap: "Let's try a different one!",
    countThen: 'Now pick the number.',
    win: ['You did it, Salah!', 'Level complete!', 'Amazing work, Salah!'],
    stars: ['You got one star!', 'You got two stars!', 'Three stars! Wow!'],
    allDone: 'You finished every level! You are a superstar!',
    paused: 'Take a break. Tap play when you are ready.',
    newLevel: 'A new level is open!'
  };
});
