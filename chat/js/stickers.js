/* Stickers (big picture + words) and emoji for the picker. Stickers are sent as their id, e.g. "love". */
(function (g) {
  var STICKERS = [
    { id: 'love', e: '❤️', t: 'I love you!', c: '#ff5c8a' },
    { id: 'hug', e: '🤗', t: 'Big hug!', c: '#ff9f43' },
    { id: 'morning', e: '☀️', t: 'Good morning!', c: '#ffc312' },
    { id: 'night', e: '🌙', t: 'Good night!', c: '#5f6caf' },
    { id: 'miss', e: '🥺', t: 'I miss you', c: '#a55eea' },
    { id: 'proud', e: '⭐', t: 'So proud of you!', c: '#f7b731' },
    { id: 'yay', e: '🎉', t: 'Yay!', c: '#20bf6b' },
    { id: 'haha', e: '😂', t: 'Haha!', c: '#fd9644' },
    { id: 'ok', e: '👍', t: 'OK!', c: '#2d98da' },
    { id: 'thanks', e: '🙏', t: 'Thank you!', c: '#26de81' },
    { id: 'home', e: '🏠', t: 'Coming home?', c: '#4b7bec' },
    { id: 'onway', e: '🚗', t: 'On my way!', c: '#eb3b5a' },
    { id: 'hungry', e: '🍕', t: "I'm hungry!", c: '#fa8231' },
    { id: 'play', e: '⚽', t: "Let's play!", c: '#0fb9b1' },
    { id: 'homework', e: '📚', t: 'Homework done!', c: '#8854d0' },
    { id: 'game', e: '🎮', t: 'Game time?', c: '#3867d6' },
    { id: 'cando', e: '💪', t: 'You can do it!', c: '#e17055' },
    { id: 'sleepy', e: '😴', t: 'Sleepy…', c: '#778ca3' },
    { id: 'callme', e: '📞', t: 'Call me!', c: '#00b894' },
    { id: 'pray', e: '🕌', t: 'Prayer time', c: '#079992' }
  ];
  var EMOJI = ('😀 😃 😄 😁 😆 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😛 😜 🤪 😎 🤩 🥳 😏 😢 😭 😤 😡 🥺 😱 😴 🤔 🤗 🤭 😮 🙄 ' +
    '👍 👎 👏 🙌 👋 ✌️ 🤞 💪 🙏 ❤️ 🧡 💛 💚 💙 💜 💖 ⭐ 🌟 ✨ 🔥 🎉 🎈 🎁 🏆 ⚽ 🏀 🎮 🚗 🚀 ✈️ 🦁 🐱 🐶 🦖 ' +
    '🐼 🦄 🍕 🍔 🍟 🍦 🍩 🍪 🍎 🍌 🍉 🥤 ☀️ 🌙 🌈 ☔ ❄️ 🏠 🏫 📚 ✏️ 🕌 💤').split(' ');
  var byId = {};
  STICKERS.forEach(function (s) { byId[s.id] = s; });
  g.FC = g.FC || {};
  g.FC.STICKERS = STICKERS;
  g.FC.EMOJI = EMOJI;
  g.FC.sticker = function (id) { return byId[id] || { id: id, e: '💬', t: id, c: '#999' }; };
})(typeof self !== 'undefined' ? self : this);
