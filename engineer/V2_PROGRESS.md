# V2 progress log — COMPLETE

All milestones are done and committed (no pushes, no remotes touched).

## What changed
- **A. Human voice clips**
  - `js/core/voice-key.js` (UMD): `normalize()` (same cleaning as the v1 speech), `key()` = 8-hex FNV-1a-32 of the lowercased normalized text, plus `clipPath()` and `tipLine()`.
  - `audio.js` → `LE.voice`. It loads `audio/voice/manifest.json` (and `groups.json`) once and tolerates them missing. Clips are fetched, decoded and cached; decoding supports the promise form and the old Safari callback form. Voice has its own gain node, a new line stops the previous clip, and a safety timer covers a locked context. The iOS unlock, the `interrupted` handling and the visibilitychange / pageshow / focus resume are unchanged and also cover voice; voice stops when the page is hidden.
  - `buddy.js` `LE.speak(textOrLines)` returns a Promise. It plays the clip, or falls back to speechSynthesis. When muted, in `?fast=1` or with read-aloud off it resolves at once. The 🔊 button replays the clip.
  - `app.js`:
    - All shell lines are in one VOICE-LINES block. Composite lines (welcome back + goal, fail message + hint, fail message + show-me offer) are spoken as separate clips.
    - Show me and tutorial steps wait for the narration (`buddy.afterSpeech`).
    - Bubble auto-hide waits at least clip length + 1 s.
    - Each level's clips are prefetched when it opens, and the menu's common clips at start.
  - `tools/collect-voice-lines.js` writes `lines.json` and `groups.json`. It combines static extraction (level data, content, the shell block, view literals, the enumerated `Repeat N times!` lines) with a Playwright runtime capture. The capture covers the menu, settings, every map, and every level: tip, tutorial, failing attempts, Show me → Go → win + fact. It also covers the Practice Room challenges, free play and a miss.
  - `tools/build-voice-manifest.js` writes `manifest.json` and reports missing and orphaned clips. The committed `manifest.json` is `[]`, so everything currently falls back to speech synthesis.
  - Service worker cache is now `engineer-v2`. `tools/build-sw.js` precaches the app shell, `manifest.json` / `groups.json`, and the clips (those that exist on disk) for the common lines and the first 3 levels of each world. Only 200 responses are cached (206 is ignored). `manifest.json` / `groups.json` are fetched network-first. Only `engineer-*` caches other than the current one are deleted.
  - Texts reworded so they read well aloud: no ∞, +/−, curly quotes, or `?.` joins.
- **B. +10 levels per world**
  - Bridges b18–b27: Erase & swap to steel, one-tower cable bridge, coin cutter, Grand Parade finale; `erase` tip.
  - Machines m19–m28: chain reaction, belt carries a box, big gear = slow belt, gear train, finale; also a belt-bump fix.
  - Circuits c18–c27: two switches, switch OFF, move tiles, fan boost, cross town, Big City finale.
  - Robot r19–r28: debugging (fix the bug), many ways, wall walker, lake loop, Robot Master.
  - Each world got new tips and enough facts to have one per level.
- **C. Construction world 🚧** (18 levels, `cn-` classes, wins live)
  - Mechanics: bulldozer sokoban-lite (dirt → holes, rocks → dump truck, flat road, undo, stuck detection), house building in order (foundation → walls → windows/door → roof, triangle roof, wide foundation for a tall house), crane (move / grab / drop, stacking with big blocks at the bottom), and combined stages ending with the "Dream House".
  - Guided tutorials on levels 1, 2, 3, 5 and 9. Tip cards, 18+ facts, par-based stars, saved progress and resume.
  - New SFX: dig, beep, thud, rumble, whirr, hammer.
- **Menu / UI**
  - The 5th world card spans the width of the menu; the menu is sized to fit on iPhone SE.
  - The Robot program strip grows on taller phones so a tall Repeat block isn't cut off.
  - A world's last level shows "World complete!" and no longer has a duplicate Map button.

## Level counts
| World | Levels |
|---|---|
| Bridges | 27 |
| Machines | 28 |
| Circuits | 27 |
| Robot Coder | 28 |
| Construction | 18 |
| **Total** | **128** |

The Practice Room is unchanged apart from voice: 10 challenges plus free play.

## Test results (final run)
- `npm test`: 157/157 pass. This covers:
  - every level of all 5 worlds solved through the real logic with 3 stars;
  - construction logic, save and resume;
  - voice-key stability and FNV test vectors;
  - every level's goal, hint, tutorial, tip, fact and Show me lines present in `lines.json`;
  - the sw precache list matches the files on disk, and the cache name is `engineer-v2`.
- `npm run e2e` (Chromium, iPhone 13): 39/39, including 7 voice checks:
  - a fake clip plays through WebAudio and not speechSynthesis, and the Promise waits for it to end;
  - a line with no clip falls back to speechSynthesis;
  - muted resolves at once;
  - prefetch works and the 🔊 button replays the clip;
  - Show me never talks over the previous line;
  - browser and Node compute the same keys.
  - Run the voice checks alone with `E2E_ONLY=voice node e2e/run.js`.
- `node e2e/all-levels.js` (iPhone 13) and `DEVICE="iPhone SE" node e2e/all-levels.js`: all 128 levels won with 3 stars through Show me, no overflow warnings, no console errors.
- Screenshots are in `/workspace/little-engineer-shots/v2/` (made with `node e2e/shots-v2.js`).

## Voice lines
`audio/voice/lines.json` has **614 lines, 33,399 characters**. No clips exist yet, so `node tools/build-voice-manifest.js` reports all 614 as missing.

## Known issues / notes
- WebKit can't be launched on this host, so the e2e WebKit pass was skipped. Only Chromium with iPhone emulation was tested.
- Voice clips play through WebAudio. On iOS, the ring/silent switch mutes WebAudio (the SFX already behaved this way in v1). `navigator.audioSession.type = 'playback'` could change that, but it isn't set because it would also interrupt other apps' audio.
- After adding clips, run `node tools/build-voice-manifest.js` and `node tools/build-sw.js`, then bump the `sw.js` cache name before shipping.
- On a few levels, the Robot program strip still scrolls on iPhone SE when the program is long (same behaviour as v1).
- Construction level 5's tutorial walks through the foundation and walls, then lets Salah finish the house himself. This is by design.

## Voice clip generation (post-build, run by the CodeLab watch routine)
- [ ] Generate ElevenLabs clips for all 614 lines in `audio/voice/lines.json` -> `audio/voice/<id>.mp3` (0 of 614 done)
- [ ] build-voice-manifest + build-sw, 0 missing, tests + e2e rerun, commit
- [ ] 3 samples copied to /workspace/little-engineer-voice-samples/
- STATUS: BLOCKED (2026-10-18 13:55 Morocco time). There aren't enough ElevenLabs credits. On 18 Oct 13:55 the connector said: "This request exceeds your quota of 10000. You have 213 credits remaining, while 310 credits are required for this request." eleven_v4 costs 1 credit per character, tags included. All 614 lines come to about 33,400 credits as plain text, or about 44,500 with a `[warmly] [slowly]` prefix on each line. Nothing was generated and no credits were spent. No worker is running and the lock was deleted.
- Planned settings for when credits are available: model eleven_v4, one voice for every line (candidate: "W. Oxley Kids' Storyteller", id kAXSxs17BYwCxcleeuLV, a gentle American voice in the style of Mr. Rogers), generations_count 1. The connector has no speed setting for tts, so slow the speech with a `[warmly] [slowly]` tag prefix, or use plain text plus ffmpeg `atempo=0.88` (pitch is kept), then save as mono 64 kbps mp3.
- Note: /workspace/little-engineer-v2/tts/clips/ holds 72 clips from this morning's attempt. They use the voice "Nikki" (yhFUAoS32gPDJFQHbH68) on eleven_multilingual_v2 at normal speed, and 70 of them match current ids. They were NOT used, because mixing them in would break the one-voice, slower requirement.
