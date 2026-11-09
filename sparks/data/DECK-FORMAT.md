# Deck file format (data/decks/NN-id.js)

Plain script, no imports. Each file registers exactly one deck:

```js
(self.SPARKS_DECKS = self.SPARKS_DECKS || []).push({
  id: 'world-history',            // kebab-case
  order: 1,                       // position in the topics grid
  emoji: '🌍',
  title: { en: 'World History', ar: 'تاريخ العالم' },
  blurb: { en: 'Turning points that shaped how we live.', ar: 'منعطفات صنعت طريقة عيشنا.' },
  cards: [
    {
      id: 'wh-01',                // unique across all decks: <prefix>-NN
      title: { en: '...', ar: '...' },
      body: { en: '60-120 words, story-driven', ar: 'same substance in clear MSA (45-140 words)' },
      takeaway: { en: 'One-line lesson.', ar: 'درس في سطر واحد.' },
      source: { title: 'Encyclopaedia Britannica — Printing press', url: 'https://www.britannica.com/technology/printing-press' },
      quiz: {
        q: { en: 'Question?', ar: 'سؤال؟' },
        options: { en: ['A', 'B', 'C'], ar: ['أ', 'ب', 'ج'] },   // same order in both languages
        answer: 1,                // 0, 1 or 2 — vary it across cards
        explain: { en: 'Why the answer is right.', ar: 'لماذا هذه الإجابة صحيحة.' }
      }
    }
  ]
});
```

Validate: `node tests/content.test.mjs data/decks/NN-id.js`
