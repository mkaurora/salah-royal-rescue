/* English bank (tiers 1-6), built deterministically at load time from word lists + hand-written questions. UMD. */
(function (root, factory) {
  var dep = function (n, f) { return typeof module === 'object' && module.exports ? require(f) : (root.SI && root.SI[n]); };
  var mod = factory(dep('rng', '../../logic/rng.js'));
  if (typeof module === 'object' && module.exports) module.exports = mod;
  else { root.SI = root.SI || {}; root.SI.curriculumEnglish = mod; }
})(typeof self !== 'undefined' ? self : this, function (RNG) {
  'use strict';

  var SKILLS = {
    'en-sound': 'Beginning sounds', 'en-opposite': 'Opposites', 'en-synonym': 'Words that mean the same', 'en-plural': 'More than one',
    'en-rhyme': 'Rhyming words', 'en-spell': 'Spelling', 'en-compound': 'Compound words', 'en-grammar': 'Grammar',
    'en-punct': 'Punctuation', 'en-read': 'Reading', 'en-vocab': 'Word meanings', 'en-affix': 'Prefixes and suffixes',
    'en-homophone': 'Sound-alike words', 'en-odd': 'Odd one out', 'en-syllable': 'Syllables'
  };
  var bank = [], counter = {};

  function Q(skill, tier, text, answer, wrongs, hint, extra) {
    counter[skill] = (counter[skill] || 0) + 1;
    var id = skill + '-' + (counter[skill] < 10 ? '0' : '') + counter[skill];
    var opts = RNG.shuffle(RNG.make(id), [answer].concat(wrongs));
    var q = { id: id, subject: 'english', skill: skill, tier: tier, type: 'choice', text: text, options: opts, answer: answer, hint: hint };
    if (extra) Object.keys(extra).forEach(function (k) { q[k] = extra[k]; });
    bank.push(q);
  }
  function others(list, i, n, f) { // n deterministic other entries (value f(entry))
    var out = [], k = 1;
    while (out.length < n) { var v = f(list[(i + k * 3 + out.length) % list.length]); if (out.indexOf(v) < 0 && v !== f(list[i])) out.push(v); k++; }
    return out;
  }

  /* beginning sounds (tier 1) */
  var SOUND = [['fish', 'f', '🐟'], ['sun', 's', '☀️'], ['moon', 'm', '🌙'], ['tree', 't', '🌳'], ['ball', 'b', '⚽'], ['cat', 'c', '🐱'], ['duck', 'd', '🦆'],
    ['hat', 'h', '🎩'], ['kite', 'k', '🪁'], ['lemon', 'l', '🍋'], ['net', 'n', '🥅'], ['pear', 'p', '🍐'], ['rain', 'r', '🌧️'], ['wave', 'w', '🌊'], ['zebra', 'z', '🦓']];
  SOUND.forEach(function (w, i) { Q('en-sound', 1, 'Which letter does this word start with?  ' + w[0], w[1], others(SOUND, i, 2, function (e) { return e[1]; }), 'Say the word slowly. What is the first sound you hear?', { pic: w[2] }); });

  /* opposites */
  var OPP = [['hot', 'cold', 1], ['big', 'small', 1], ['up', 'down', 1], ['happy', 'sad', 1], ['fast', 'slow', 1], ['day', 'night', 1], ['open', 'closed', 1], ['full', 'empty', 1],
    ['wet', 'dry', 1], ['hard', 'soft', 2], ['early', 'late', 2], ['heavy', 'light', 2], ['clean', 'dirty', 2], ['near', 'far', 2], ['old', 'new', 2], ['loud', 'quiet', 2],
    ['rough', 'smooth', 3], ['wide', 'narrow', 3], ['strong', 'weak', 3], ['rich', 'poor', 3], ['always', 'never', 4], ['guilty', 'innocent', 5], ['expand', 'shrink', 5], ['ancient', 'modern', 5]];
  OPP.forEach(function (p, i) { Q('en-opposite', p[2], 'What is the opposite of "' + p[0] + '"?', p[1], others(OPP, i, 2, function (e) { return e[1]; }), 'Opposites are words that mean something completely different.'); });

  /* synonyms */
  var SYN = [['big', 'large', 3], ['small', 'tiny', 3], ['happy', 'glad', 3], ['fast', 'quick', 3], ['begin', 'start', 3], ['shout', 'yell', 4], ['smart', 'clever', 4], ['tired', 'sleepy', 4],
    ['hungry', 'starving', 4], ['enormous', 'huge', 5], ['brave', 'courageous', 5], ['delighted', 'pleased', 5], ['ancient', 'old', 5], ['vanish', 'disappear', 5], ['observe', 'watch', 5],
    ['swift', 'rapid', 5], ['fragile', 'delicate', 6], ['reluctant', 'unwilling', 6], ['abundant', 'plentiful', 6], ['conceal', 'hide', 6]];
  SYN.forEach(function (p, i) { Q('en-synonym', p[2], 'Which word means almost the same as "' + p[0] + '"?', p[1], others(SYN, i, 2, function (e) { return e[1]; }), 'Think of another word you could use in the same sentence.'); });

  /* plurals */
  var PLU = [['cat', 'cats', 1, 'Most words just add s.'], ['dog', 'dogs', 1, 'Most words just add s.'], ['hat', 'hats', 1, 'Most words just add s.'], ['book', 'books', 1, 'Most words just add s.'],
    ['tree', 'trees', 1, 'Most words just add s.'], ['star', 'stars', 1, 'Most words just add s.'], ['box', 'boxes', 2, 'Words that end in x, s, sh or ch add es.'], ['dish', 'dishes', 2, 'Words that end in sh add es.'],
    ['bus', 'buses', 2, 'Words that end in s add es.'], ['watch', 'watches', 2, 'Words that end in ch add es.'], ['brush', 'brushes', 2, 'Words that end in sh add es.'],
    ['baby', 'babies', 3, 'When a word ends in consonant + y, change the y to ies.'], ['city', 'cities', 3, 'Change the y to ies.'], ['leaf', 'leaves', 3, 'Some words change f to ves.'],
    ['child', 'children', 3, 'Some plurals are special. You just have to remember them.'], ['mouse', 'mice', 3, 'This plural is special.'], ['foot', 'feet', 3, 'This plural is special.'], ['tooth', 'teeth', 3, 'This plural is special.']];
  PLU.forEach(function (p, i) { var w = p[1]; Q('en-plural', p[2], 'More than one ' + p[0] + ' is…', w, [p[0] + 's' === w ? p[0] + 'es' : p[0] + 's', p[0] + 'ies', p[0] + 'ren'].filter(function (x, j, a) { return x !== w && a.indexOf(x) === j; }).slice(0, 2), p[3]); });

  /* rhymes */
  var RH = [['cat', 'hat'], ['dog', 'log'], ['sun', 'run'], ['ship', 'lip'], ['rain', 'train'], ['boat', 'goat'], ['tree', 'bee'], ['moon', 'spoon'], ['cake', 'lake'], ['star', 'car'],
    ['bell', 'shell'], ['light', 'night'], ['night', 'kite'], ['snow', 'toe']];
  RH.forEach(function (p, i) { Q('en-rhyme', i < 9 ? 1 : 2, 'Which word rhymes with "' + p[0] + '"?', p[1], others(RH, i, 2, function (e) { return e[0]; }).filter(function (x) { return x !== p[1]; }), 'Rhyming words sound the same at the end.'); });

  /* spelling: [right, wrong1, wrong2, tier] */
  var SPELL = [['jump', 'jmup', 'jumpp', 1], ['fish', 'fich', 'fsih', 1], ['tree', 'tre', 'treee', 1], ['milk', 'mlik', 'milck', 1], ['frog', 'forg', 'frogg', 1], ['ship', 'shyp', 'shpi', 1], ['book', 'buk', 'bouk', 1], ['play', 'pley', 'plai', 1],
    ['friend', 'freind', 'frend', 2], ['water', 'wawter', 'wader', 2], ['people', 'peple', 'peeple', 2], ['house', 'hous', 'howse', 2], ['night', 'nite', 'nigt', 2], ['green', 'grean', 'gren', 2],
    ['because', 'becuase', 'becouse', 3], ['school', 'scool', 'shcool', 3], ['together', 'togther', 'togeather', 3], ['should', 'shud', 'shoud', 3], ['beautiful', 'beutiful', 'beatiful', 3], ['library', 'libary', 'liberry', 3], ['island', 'iland', 'islend', 3],
    ['thought', 'thougt', 'thowt', 4], ['different', 'diffrent', 'diferent', 4], ['favourite', 'favorit', 'faverite', 4], ['answer', 'anser', 'answir', 4], ['mountain', 'mountin', 'mountian', 4], ['adventure', 'adventer', 'advencher', 4], ['weather', 'wether', 'wheather', 4],
    ['necessary', 'neccessary', 'necesary', 5], ['separate', 'seperate', 'separete', 5], ['environment', 'enviroment', 'environmant', 5], ['pronounce', 'pronounse', 'prenounce', 5], ['temperature', 'temprature', 'tempreture', 5], ['knowledge', 'knowlege', 'nolledge', 5],
    ['accommodate', 'acommodate', 'accomodate', 6], ['experiment', 'experement', 'experimant', 6], ['definitely', 'definately', 'defenitely', 6], ['occasionally', 'occassionally', 'ocasionally', 6], ['particular', 'particuler', 'perticular', 6]];
  SPELL.forEach(function (w) { Q('en-spell', w[3], 'Which word is spelled correctly?', w[0], [w[1], w[2]], 'Say the word slowly and look at every letter.'); });

  /* compound words */
  var CMP = [['sun', 'flower', 2], ['butter', 'fly', 2], ['foot', 'ball', 2], ['star', 'fish', 2], ['sand', 'castle', 2], ['tooth', 'brush', 2], ['snow', 'man', 2], ['pan', 'cake', 2],
    ['bed', 'room', 3], ['cup', 'cake', 3], ['fire', 'fly', 3], ['moon', 'light', 3], ['book', 'shelf', 3], ['air', 'plane', 3], ['water', 'fall', 3], ['sea', 'weed', 3]];
  CMP.forEach(function (p) { Q('en-compound', p[2], 'Put the words together:  ' + p[0] + ' + ' + p[1], p[0] + p[1], [p[1] + p[0], p[0].slice(0, -1) + p[1]], 'A compound word is two small words joined into one big word.'); });

  /* grammar */
  [['a', 1, 'I see ___ apple.', 'an', ['a', 'the'], 'Use "an" before a vowel sound: a, e, i, o, u.'], ['a', 1, 'I have ___ dog.', 'a', ['an', 'am'], 'Use "a" before a consonant sound.'],
   ['a', 1, 'She found ___ egg.', 'an', ['a', 'two'], 'Use "an" before a vowel sound.'], ['a', 1, 'He sees ___ umbrella.', 'an', ['a', 'the'], 'Use "an" before a vowel sound.'],
   ['b', 2, 'The birds ___ singing.', 'are', ['is', 'am'], 'More than one thing needs "are".'], ['b', 2, 'The cat ___ sleeping.', 'is', ['are', 'am'], 'One thing needs "is".'],
   ['b', 2, 'I ___ happy today.', 'am', ['is', 'are'], '"I" goes with "am".'], ['b', 2, 'Yesterday we ___ to the shore.', 'went', ['go', 'goed'], 'Yesterday means the past. The past of "go" is a special word.'],
   ['b', 2, 'Last night I ___ a big fish.', 'saw', ['see', 'seen'], 'The past of "see" is a special word.'], ['b', 2, 'The frog ___ into the pond.', 'jumped', ['jump', 'jumping'], 'It already happened, so add "ed".'],
   ['b', 2, 'We ___ lunch an hour ago.', 'ate', ['eat', 'eated'], 'The past of "eat" is a special word.'], ['b', 2, 'Two ducks ___ in the pond.', 'swim', ['swims', 'swimming'], 'With two ducks, the verb has no s.'],
   ['c', 3, 'The boys ___ playing yesterday.', 'were', ['was', 'is'], 'Use "were" for more than one in the past.'], ['c', 3, 'It ___ a sunny day yesterday.', 'was', ['were', 'are'], 'Use "was" for one thing in the past.'],
   ['c', 3, 'She ___ two sisters.', 'has', ['have', 'having'], 'One person uses "has".'], ['c', 3, 'We ___ a new boat.', 'have', ['has', 'having'], '"We" goes with "have".'],
   ['c', 3, 'Yesterday Pip ___ a shell.', 'found', ['find', 'finded'], 'The past of "find" is a special word.'], ['c', 3, 'The children ___ their books.', 'brought', ['bringed', 'brang'], 'The past of "bring" is a special word.'],
   ['d', 4, 'The tree is ___ than the house.', 'taller', ['tallest', 'more tall'], 'Comparing two things? Add "er".'], ['d', 4, 'This is the ___ mountain of all.', 'highest', ['higher', 'more high'], 'Comparing three or more? Add "est".'],
   ['d', 4, 'The dogs ___ to the park every day.', 'run', ['runs', 'running'], 'Plural subject, present time: no s on the verb.'], ['d', 4, 'The bird ___ every morning.', 'sings', ['sing', 'singing'], 'One bird: add s to the verb.'],
   ['d', 4, 'She ran ___ than her friend.', 'faster', ['fastest', 'more fast'], 'Comparing two: add er.'], ['d', 4, 'He speaks very ___.', 'quietly', ['quiet', 'quieter'], 'An adverb tells how. Many end in -ly.'],
   ['e', 5, 'The rabbits left ___ burrow.', 'their', ['there', "they're"], '"Their" means it belongs to them.'], ['e', 5, '___ a lot of sand over there.', "There's", ['Theirs', 'Their'], 'This word is short for two words that mean something exists in a place.'],
   ['e', 5, 'The cat licked ___ paw.', 'its', ["it's", 'its\''], '"Its" shows belonging. "It\'s" means "it is".'], ['e', 5, '___ going to be a fun day!', "It's", ['Its', 'Its\''], '"It\'s" means "it is" or "it has".'],
   ['e', 5, 'We ___ practising for a week now.', 'have been', ['has been', 'is been'], '"We" goes with "have".'], ['e', 5, 'I would have gone if I ___ known.', 'had', ['has', 'have'], 'Use "had" with "if I … known".'],
   ['f', 6, 'Neither of the boxes ___ empty.', 'is', ['are', 'were'], '"Neither" is singular, so use "is".'], ['f', 6, 'If I ___ you, I would take the map.', 'were', ['was', 'am'], 'Use "were" when you imagine something.'],
   ['f', 6, 'He did very ___ on the test.', 'well', ['good', 'goodly'], '"Well" describes how he did it.'], ['f', 6, 'The group of explorers ___ ready.', 'is', ['are', 'be'], 'A group is treated as one thing.'],
   ['f', 6, 'There were ___ mistakes than last time.', 'fewer', ['less', 'littler'], 'Use "fewer" for things you can count.'], ['f', 6, 'Between you and ___, it is a secret.', 'me', ['I', 'myself'], 'After "between" use "me".']
  ].forEach(function (g) { Q('en-grammar', g[1], 'Choose the right word:  ' + g[2], g[3], g[4], g[5]); });

  /* punctuation */
  [[2, 'Which sentence is written correctly?', 'The cat sat on the mat.', ['the cat sat on the mat.', 'The cat sat on the mat'], 'A sentence starts with a capital letter and ends with a full stop.'],
   [2, 'Which sentence is written correctly?', 'We went to the beach.', ['we went to the beach.', 'We went to the beach'], 'Start with a capital letter and finish with a full stop.'],
   [2, 'Which sentence asks a question?', 'Where is my hat?', ['Here is my hat.', 'I like my hat.'], 'A question usually starts with who, what, where, when or why.'],
   [3, 'Which one is correct?', 'What is your name?', ['What is your name.', 'what is your name?'], 'A question ends with a question mark.'],
   [3, 'Which one is correct?', 'Wow, that is a big wave!', ['wow, that is a big wave!', 'Wow that is a big wave'], 'Capital letter at the start, and an exclamation mark for surprise.'],
   [3, 'Which sentence uses a capital letter for a name?', 'Today Pip went to Jungle Falls.', ['Today pip went to jungle falls.', 'today Pip went to Jungle falls.'], 'Names of people and places start with capital letters.'],
   [4, 'Which sentence uses commas correctly?', 'I packed a map, a torch and some water.', ['I packed, a map a torch and some water.', 'I packed a map a torch, and, some water.'], 'Use commas to separate items in a list.'],
   [4, 'Which sentence is correct?', 'My brother\'s boat is blue.', ['My brothers boat is blue.', 'My brothers\' boat is blue.'], 'An apostrophe shows that the boat belongs to him.'],
   [5, 'Which sentence is correct?', 'The child\'s bag was heavy, so she rested.', ['The childs bag was heavy so she rested.', 'The child\'s bag was heavy so, she rested.'], 'Use an apostrophe for belonging and a comma before "so" joining two ideas.'],
   [5, 'Which sentence is punctuated correctly?', '"Let\'s go," said Tuki.', ['"Lets go" said Tuki.', 'Let\'s go, said Tuki.'], 'Speech marks go around the words spoken, with a comma before the closing marks.'],
   [5, 'Which word needs an apostrophe? "We cant wait."', 'cant', ['wait', 'We'], 'It is short for "cannot".', null],
   [6, 'Which sentence uses a colon correctly?', 'You will need three things: a boat, a map and a hat.', ['You will need: three things a boat, a map and a hat.', 'You: will need three things a boat, a map and a hat.'], 'A colon introduces a list after a full statement.']
  ].forEach(function (p) { Q('en-punct', p[0], p[1], p[2], p[3], p[4]); });

  /* vocabulary */
  var VOC = [['enormous', 'very big', ['very small', 'very fast'], 3], ['tiny', 'very small', ['very loud', 'very cold'], 3], ['cheerful', 'happy and bright', ['sad and slow', 'cold and wet'], 3],
    ['gigantic', 'extremely big', ['quite small', 'very old'], 3], ['peculiar', 'strange', ['ordinary', 'sleepy'], 4], ['journey', 'a long trip', ['a short nap', 'a big meal'], 4], ['gleaming', 'shining brightly', ['hiding quietly', 'falling slowly'], 4],
    ['curious', 'wanting to know more', ['feeling sleepy', 'feeling cold'], 4], ['sturdy', 'strong and solid', ['soft and weak', 'light and thin'], 4], ['inventor', 'someone who makes new things', ['someone who sells fruit', 'someone who sings'], 4],
    ['generous', 'happy to give and share', ['afraid of heights', 'very tired'], 5], ['ancient', 'very, very old', ['brand new', 'quite loud'], 5], ['fascinating', 'very interesting', ['very boring', 'very noisy'], 5],
    ['cautious', 'careful to avoid danger', ['full of energy', 'ready to shout'], 5], ['habitat', 'the natural home of a plant or animal', ['a kind of tool', 'a type of weather'], 5], ['dwell', 'to live in a place', ['to run fast', 'to talk quietly'], 5],
    ['persistent', 'keeps trying and does not give up', ['gives up quickly', 'is always late'], 6], ['magnificent', 'wonderful and grand', ['plain and dull', 'small and weak'], 6], ['investigate', 'to look into carefully to find out', ['to forget about', 'to cook for dinner'], 6],
    ['conclude', 'to decide after thinking', ['to begin again', 'to throw away'], 6], ['abundant', 'more than enough', ['hardly any', 'very heavy'], 6], ['cooperate', 'to work together', ['to work alone', 'to stop working'], 6]];
  VOC.forEach(function (p) { Q('en-vocab', p[3], 'What does "' + p[0] + '" mean?', p[1], p[2], 'Try using the word in a sentence. Which meaning fits?'); });

  /* prefixes and suffixes */
  [[3, 'Add "un" to "lock". You get…', 'unlock', ['relock', 'dislock'], '"un" means not, or the opposite.'], [3, 'Add "re" to "build". You get…', 'rebuild', ['unbuild', 'prebuild'], '"re" means again.'],
   [3, 'What does "unhappy" mean?', 'not happy', ['very happy', 'happy again'], '"un" at the start means not.'], [3, 'Add "ful" to "care". You get…', 'careful', ['careless', 'caring'], '"ful" means full of.'],
   [4, 'What does "careless" mean?', 'without care', ['full of care', 'care again'], '"less" means without.'], [4, 'What does "replay" mean?', 'play again', ['not play', 'play before'], '"re" means again.'],
   [4, 'Add "er" to "teach" to make a person who does it:', 'teacher', ['teachful', 'teachly'], '"er" can mean a person who does something.'], [4, 'Add "ly" to "quick":', 'quickly', ['quickful', 'quickless'], '"ly" turns many describing words into how-words.'],
   [4, 'What does "disagree" mean?', 'not agree', ['agree a lot', 'agree again'], '"dis" means not or the opposite.'], [5, 'What does "pre" mean in "preheat"?', 'before', ['after', 'again'], 'Think of a preview of a film: you see it first.'],
   [5, 'What does "misread" mean?', 'read wrongly', ['read twice', 'read aloud'], '"mis" means wrongly.'], [5, 'Add "able" to "enjoy":', 'enjoyable', ['enjoyment', 'enjoyful'], '"able" means can be done.'],
   [5, 'What does "tricycle" tell us about the number of wheels?', 'three', ['two', 'four'], '"tri" means three.'], [5, 'What does "international" mean?', 'between nations', ['inside one house', 'not a nation'], '"inter" means between.']
  ].forEach(function (p) { Q('en-affix', p[0], p[1], p[2], p[3], p[4]); });

  /* sound-alike words */
  [[4, 'I can ___ the sea from here.', 'see', ['sea', 'she'], 'You do this with your eyes.'], [4, 'We sat by the ___.', 'sea', ['see', 'she'], 'It is a big body of salt water.'],
   [4, 'Please ___ your name here.', 'write', ['right', 'rite'], 'You do this with a pencil.'], [4, 'Turn ___ at the tree.', 'right', ['write', 'wright'], 'It is the opposite of left.'],
   [4, 'I have ___ ears.', 'two', ['to', 'too'], 'The number 2.'], [4, 'Can I come ___?', 'too', ['two', 'to'], 'It means also.'],
   [5, 'Please ___ me what you found.', 'tell', ['tel', 'tale'], 'It means to say something to someone.'], [5, 'I can ___ the bell ringing.', 'hear', ['here', 'hair'], 'You do this with your ears.'],
   [5, 'Come over ___!', 'here', ['hear', 'hare'], 'It means in this place.'], [5, 'Mix the ___ and the eggs.', 'flour', ['flower', 'floor'], 'It is used for baking.'],
   [6, 'Pip is the ___ of the island.', 'guide', ['guyed', 'guid'], 'Someone who shows others the way.'], [6, 'The wind blew the leaves across the ___ of the hill.', 'whole', ['hole', 'hall'], 'It means all of something. Hint: not a gap in the ground.'],
   [6, 'We took a ___ walk along the shore.', 'quiet', ['quite', 'quit'], 'It means with little noise.'], [6, 'The ship ___ across the sea.', 'sailed', ['sailled', 'sale'], 'Boats do this.']
  ].forEach(function (p) { Q('en-homophone', p[0], 'Choose the right word:  ' + p[1], p[2], p[3], p[4]); });

  /* odd one out */
  [[1, ['cat', 'dog', 'hen', 'car'], 'car', 'A car is not an animal.'], [1, ['apple', 'banana', 'chair', 'grape'], 'chair', 'A chair is not a fruit.'], [1, ['red', 'blue', 'table', 'green'], 'table', 'A table is not a colour.'],
   [1, ['sun', 'moon', 'star', 'shoe'], 'shoe', 'A shoe is not in the sky.'], [1, ['run', 'jump', 'swim', 'book'], 'book', 'A book is not something you do.'], [2, ['shirt', 'hat', 'sock', 'spoon'], 'spoon', 'A spoon is not clothing.'],
   [2, ['boat', 'ship', 'canoe', 'bicycle'], 'bicycle', 'Three of these travel on water. One travels on the road.'], [2, ['lion', 'tiger', 'eagle', 'leopard'], 'eagle', 'An eagle is a bird. The others are big cats.'], [3, ['square', 'circle', 'triangle', 'purple'], 'purple', 'Three of these are shapes. One is something else.'],
   [3, ['table', 'bed', 'sofa', 'wall'], 'wall', 'A wall is part of a house, not furniture.']
  ].forEach(function (p) { Q('en-odd', p[0], 'Which one does not belong?  ' + p[1].join(', '), p[2], p[1].filter(function (x) { return x !== p[2]; }).slice(0, 2), p[3]); });

  /* syllables */
  [['cat', 1, 3], ['table', 2, 3], ['banana', 3, 3], ['elephant', 3, 3], ['butterfly', 3, 4], ['umbrella', 3, 4], ['computer', 3, 4], ['watermelon', 4, 4], ['adventure', 3, 4], ['kangaroo', 3, 4],
   ['encyclopedia', 6, 5], ['imagination', 5, 5], ['refrigerator', 5, 5]].forEach(function (p) {
    var w = ['1', '2', '3', '4', '5', '6'].filter(function (x) { return x !== String(p[1]); });
    var near = [String(p[1] + 1), String(Math.max(1, p[1] - 1))].filter(function (x) { return x !== String(p[1]); });
    Q('en-syllable', p[2], 'How many syllables (beats) are in "' + p[0] + '"?', String(p[1]), near.slice(0, 2).concat(near.length < 2 ? [String(p[1] + 2)] : []), 'Clap each beat as you say the word slowly.');
  });

  /* reading passages */
  [[1, 'Sam has a red hat. The hat is big.', 'What colour is the hat?', 'red', ['blue', 'green'], 'Read the first sentence again.'],
   [1, 'The duck swims in the pond. It likes the water.', 'Where does the duck swim?', 'in the pond', ['in the sky', 'in a box'], 'Find the word "swims".'],
   [1, 'Mia has a cat. The cat is black. It likes milk.', 'What does the cat like?', 'milk', ['fish', 'bread'], 'Look at the last sentence.'],
   [2, 'It was a rainy day. Ben took his umbrella and his yellow boots. He jumped in every puddle on the way to school.', 'What did Ben do on the way to school?', 'jumped in puddles', ['read a book', 'sang a song'], 'Look for what he did on the way.'],
   [2, 'A little crab lived on the shore. Every morning it walked sideways to look for food. It found a tasty bit of seaweed.', 'What did the crab find?', 'seaweed', ['a shell', 'a fish'], 'Read the last sentence.'],
   [2, 'Tom plants a seed in a pot. He gives it water and puts it in the sun. After many days a small green plant grows.', 'What does the seed need to grow?', 'water and sun', ['toys and music', 'snow and wind'], 'What did Tom give the seed?'],
   [3, 'The firefly lives in the cave. At night it makes a tiny light that helps it find friends. Other animals in the cave follow the glow when they are lost.', 'Why do animals follow the glow?', 'to find their way', ['to find food', 'to fall asleep'], 'Read what the last sentence says about being lost.'],
   [3, 'Pip wanted to cross the river. The bridge was broken, so Pip collected planks and mended it. By evening the bridge was strong again.', 'How did Pip solve the problem?', 'mended the bridge', ['swam across', 'went home'], 'What did Pip do with the planks?'],
   [3, 'Penguins cannot fly. They use their wings to swim fast. A penguin\'s feathers keep it warm in the cold sea.', 'What do penguins use their wings for?', 'swimming', ['flying', 'climbing'], 'Which sentence mentions wings?'],
   [4, 'Maya was nervous about the school show. She practised her lines every evening in front of the mirror. On the day of the show, she remembered every word and the audience clapped loudly.', 'Why did Maya remember every word?', 'she practised a lot', ['someone whispered them', 'she read from a card'], 'Look at what she did every evening.'],
   [4, 'Bees visit flowers to drink nectar. While they drink, yellow dust called pollen sticks to their legs. When they visit the next flower, some of the pollen rubs off.', 'What is pollen?', 'yellow dust from flowers', ['a type of nectar', 'a kind of bee'], 'Find the word "pollen" in the text.'],
   [4, 'The mountain path was steep and icy. Waddle held on to the rope and took small steps. At last she reached the top and saw the whole island below.', 'What can we tell about the path?', 'it was hard to climb', ['it was short and flat', 'it was full of sand'], 'The words "steep" and "icy" give a clue.'],
   [5, 'Long ago, sailors found their way across the oceans by looking at the stars. The North Star stays almost still in the sky, so it always shows which way is north. With a map, the sailors could then plan where to go.', 'Why was the North Star useful to sailors?', 'it shows the way north', ['it gives light to read', 'it moves across the sky'], 'What does the text say about the North Star staying still?'],
   [5, 'Rain forests are home to more kinds of plants and animals than any other place on land. The tall trees make a roof called the canopy. Many creatures never come down to the ground.', 'What is the canopy?', 'a roof made by tall trees', ['a type of animal', 'the forest floor'], 'Find the sentence with the word "canopy".'],
   [5, 'Zippy the hummingbird beats her wings so fast that they look like a blur. This lets her hover in one place while she sips from a flower. Few other birds can do this.', 'What does hovering mean?', 'staying in one place in the air', ['flying very far', 'sleeping on a branch'], 'Look at the sentence before "Few other birds".'],
   [5, 'Because water on the sea heats up in the sun, some of it turns into invisible vapour and rises. High in the cold air the vapour cools and turns into tiny drops. These drops gather to make clouds.', 'What happens to water vapour high in the cold air?', 'it turns into tiny drops', ['it turns into sand', 'it freezes the sea'], 'Read the sentence that starts "High in the cold air".'],
   [6, 'The old lighthouse had stood on the rocks for a hundred years. Storms had battered its walls, yet its lamp still guided ships safely to harbour. The keeper often said that the lighthouse was patient, because it never stopped doing its job.', 'What does the keeper think about the lighthouse?', 'it keeps working without giving up', ['it is too old to work', 'it is afraid of storms'], 'The word "patient" and the last part of the sentence help.'],
   [6, 'Scientists test their ideas with experiments. In a fair test they change only one thing and keep everything else the same. If more things changed, they would not know which one caused the result.', 'Why do scientists change only one thing?', 'to know what caused the result', ['to finish faster', 'to use less water'], 'Read the last sentence.'],
   [6, 'Although the volcano had been quiet for years, the lab team still checked it every morning. They measured the temperature of the warm springs and wrote the numbers in a notebook. A sudden rise in numbers would warn them to be careful.', 'Why did the team write the numbers down?', 'to notice any sudden changes', ['to practise handwriting', 'to sell to visitors'], 'What would a sudden rise warn them about?'],
   [6, 'When the explorers reached the glowing cave, they spoke in whispers. Their voices bounced off the walls and came back as echoes. The more they listened, the more they realised the cave was far bigger than it looked.', 'What can you infer about the cave?', 'it is very large', ['it is very small', 'it is full of water'], 'Echoes and the final sentence give clues.'],
   [6, 'Cumulus the gardener planted the beans near the fence because it was the sunniest spot. Within two weeks, green shoots pushed up. "Sunshine is a gardener\'s best helper," Cumulus smiled.', 'Why did Cumulus plant beans near the fence?', 'it was the sunniest spot', ['it was the shadiest spot', 'it was close to the house'], 'Look for the word "because".']
  ].forEach(function (p) { Q('en-read', p[0], p[2], p[3], p[4], p[5], { passage: p[1] }); });

  var levelsByTier = {};
  bank.forEach(function (q) { (levelsByTier[q.tier] = levelsByTier[q.tier] || []).push(q); });

  return { SKILLS: SKILLS, bank: bank, byTier: levelsByTier };
});
