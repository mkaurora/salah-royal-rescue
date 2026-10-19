# Salah's Learning Quest — progress log

## Status: complete (v1) — 2026-10-18

### Content
| Subject | World | Levels | Skills | Questions |
|---|---|---|---|---|
| Math | Number Jungle | 29 | 21 | parametric generators (seeded); every skill × difficulty 1–3 |
| English | Word Castle | 24 | 20 | 412-question bank (choice 311, build 46, match 22, tf 17, order 16) |
| Science | Discovery Lab | 24 | 21 | 370-question bank (choice 247, tf 85, match 24, order 14) |

77 levels in total, 5–8 questions each (parent setting, default 6). Every skill has an easier (d1) pool.

### Done
- Core logic (UMD, Node-tested): seeded rng, math generators + voice fragment registry, LevelRun engine
  (pools, adaptive difficulty, easier-swap, stars, custom/edited/disabled questions), StuckTimer with an injectable
  clock (hint 60 s / swap 300 s, pause when hidden, optional countdown), save schema v2 + v1 migration +
  corruption-safe load, admin ops, PIN + adult math gate, transfer codes (deflate-raw / LZW fallback, checksum).
- UI: menu with Ollie the owl (SVG, idle/cheer/think/wave/oops/talk), themed world maps with winding path,
  stars, padlocks, current-level pulse; level card; play screen for 7 question types (choice, tf, count, numpad,
  build, order, match) with SVG art (analog clock, US coins, 2D/3D shapes, base-ten blocks, ten frames, pencils);
  gentle wrong feedback, hints with visual help, swap animation, streak sparkle; win screen with flying stars +
  confetti; WebAudio SFX; safe areas, no zoom/selection/bounce.
- Parent area: 3 s long-press gear → PIN pad (1994) / Forgot PIN → math gate; tabs Levels, Questions (editor),
  Settings, Report, Transfer.
- Voice: SQ.speak / speakParts, clip playback with speech-synthesis fallback, iOS unlock, prefetch, 🔊 replay.
  tools/collect-voice-lines.js → **1,654 lines (41,572 characters)** incl. 270 math fragments;
  tools/voice-tts/gen.py (Kokoro am_michael); **111 clips generated** (common lines, praise, math + English L1).
- PWA: manifest, icons, sw.js (learn-v1, 144 precache entries incl. 111 clips), works offline.
- Tests: `npm test` **45/45 pass**; `npm run e2e` **all checks pass** on iPhone 13 and iPhone SE (3rd gen).
- Screenshots in /workspace/salah-learn-shots/ (14 files).

### Left / next
- Generate the remaining 1,543 voice clips:
  `for i in 0 1 2 3; do venv/bin/python tools/voice-tts/gen.py $i 4 & done`, then build-voice-manifest + build-sw,
  and bump the sw.js cache name when deploying.
- Nice-to-have: a short human-friendly transfer code (only the full text code exists).

### Known issues
- Math narration is stitched from fragment clips, so its rhythm is slightly choppy compared with whole sentences.
- Generated math questions can't be edited one by one (they change every game); parents can add custom questions.
- Bank-question ids in science.js are positional within each skill section: insert new questions at the end
  of a section, or parent edits/disables will point at the wrong question.
- Clip-less custom/edited text uses the device voice (iOS quality varies).
- Playwright's iPhone emulation is Chromium, not real Safari; still to be checked on a real iPhone (audio unlock,
  Add to Home Screen).
