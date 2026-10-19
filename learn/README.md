# Salah's Learning Quest

A polished, offline-first learning game (PWA) for Salah, age 7, grade 1–2: **Math** (Number Jungle),
**English** (Word Castle) and **Science** (Discovery Lab), with Ollie the owl as guide. Vanilla JS, no build step,
no external assets/fonts/CDNs; every picture is SVG/CSS/emoji and every sound is synthesized with WebAudio.
All paths are relative, so the folder works as-is at `https://mkaurora.github.io/salah-royal-rescue/learn/`.

## How to play
- **Menu**: Ollie greets Salah; tap a world card.
- **Map**: a winding path of levels (bottom → top). Stars under each level; 🔒 levels open when the one
  before is finished. Tap a level → **Play**.
- **Questions** (5–8 per level): tap answers, count objects by tapping them, type on the number pad, spell with
  letter tiles, tap items in order, or match pairs. 🔊 repeats the question.
- **Never a hard fail**: a wrong tap shakes gently ("Let's try again!") and that option fades; the 2nd wrong
  tap shows a hint. If Salah is stuck, Ollie gives a hint after **60 s** and swaps in an **easier question of
  the same skill after 5 min** (both adjustable). Timers pause while the app is hidden.
- **Stars**: 3 = ≥ 90 % right on the first try, 2 = ≥ 70 %, 1 = finished. Three first-try answers in a row
  earn a streak sparkle.
- **Adaptive**: 2 questions in a row not solved first try → easier questions for that skill; 3 first-try in a
  row → harder. A level also starts easier/harder from the skill's rolling accuracy.

## Parent mode
- **Tap** ⚙️ (menu, map or in a level) → kid settings: sound and voice volume only.
- **Hold ⚙️ for 3 seconds** (a ring fills) → PIN pad. **Default PIN: 1994.**
- **Forgot PIN?** → answer an adult multiplication (e.g. "What is 14 × 7?") → you're in, on the Settings tab
  where you can set a new PIN.
- Tabs:
  1. **Levels** – per subject: play any level, unlock one / unlock all, approve as passed, set stars 0–3,
     reset a level / subject / all progress (with confirm).
  2. **Questions** – per level: list, enable/disable, edit text/answers/correct answer/hint, add your own
     multiple-choice question (optional emoji picture). Math questions are generated fresh each game, so math
     shows samples; custom questions work in every subject. Edited text without a voice clip is read by the
     device voice.
  3. **Settings** – hint delay, easier-question delay, optional countdown ring + length, questions per level
     (5–8), subjects on/off, voice on/off, change PIN.
  4. **Report** – stars, levels, first-try %, time; per subject & per skill accuracy (overall + recent),
     questions answered, time, last played; recent sessions.
  5. **Transfer** – see below.

### Moving progress to another device
Transfer tab → **Copy** (or Share) the code (`SQ1-…`: JSON → deflate-raw via `CompressionStream`, or a built-in
LZW fallback → base64url, with an FNV checksum). On the other device: Transfer → paste → **Check code** → it
shows e.g. "Salah — 34 levels, 82 stars" → confirm. Damaged codes are rejected. No server involved.

## Running locally
```
npm run serve          # http://127.0.0.1:8080/salah-royal-rescue/learn/  (mounted like GitHub Pages)
```
URL flags (testing): `?fast=1` skips waits/narration, `?seed=x` fixes question randomness,
`?start=math:3` jumps to a level, `?nosw=1` skips the service worker.

## Voice pipeline
Narration uses pre-generated clips `audio/voice/<key>.mp3` (key = 8-hex FNV-1a of the normalized text,
`js/core/voice-key.js`) listed in `audio/voice/manifest.json`; anything without a clip falls back to the
device's speech synthesis (rate 0.85, English voice). `SQ.speak(text | [parts])` returns a Promise, stops the
previous line, and plays parts in sequence.

**Math is parametric**, so math prompts are spoken as a sequence of **fragments** —
`SQ.speakParts(['What is', '7', 'plus', '5'])` — from a finite registry in `js/data/math.js` (numbers 0–120 +
~150 phrases). This keeps the total at **1,654 clips** (≈ 41.6 k characters) instead of enumerating every sum.

```
node tools/collect-voice-lines.js       # → audio/voice/lines.json + groups.json (prints totals)
/workspace/salah-learn-tts/venv/bin/python tools/voice-tts/gen.py 0 4 [--group common --group math:0] &   # shards 0..3
node tools/build-voice-manifest.js      # → manifest.json + missing/orphan report
node tools/build-sw.js                  # refresh the service-worker precache list
```
`gen.py`: Kokoro-82M onnx (models in `/workspace/little-engineer-v2/kokoro`, override with `KOKORO_DIR`),
voice am_michael, speed 0.8, 0.45 s sentence pause, "Salah" → səlˈɑː, mono 64 kbps 24 kHz, loudnorm; skips
existing clips. Currently generated: 111 clips (menu/common lines, praise, math + English level 1).

## Offline / PWA
`sw.js` (cache `learn-v2`, scope = this folder) precaches the app shell, manifest, icons and the clips of the
`common` group + first 2 levels of each subject; other clips are cached on first play (200 only, never 206).
Only other `learn-*` caches are deleted on upgrade. Bump `CACHE` when shipping changes.

## Tests
```
npm test        # node --test: content validity (all levels × 5–8 questions × seeds), generators, stars,
                # adaptive, stuck timer (fake clock), PIN/gate, admin ops, custom/edit/disable, transfer
                # round-trip + corruption, migration, voice keys/lines, SW precache list
npm run e2e     # Playwright Chromium, iPhone 13 + iPhone SE (3rd gen): full flows, fake-clock hint/swap,
                # admin gesture, PIN/gate, transfer, offline, no overflow; screenshots → /workspace/salah-learn-shots
```
(First time: `npm i` and `npx playwright install chromium`.)  `node tools/check-content.js english|science`
validates a content bank; `node tools/make-icons.js` re-renders the icons.

## Structure
```
index.html, manifest.webmanifest, sw.js, css/style.css, icons/
js/core/   voice-key, rng (seeded), lines (all shell lines), audio (SFX + clip player), speech (SQ.speak), app (shell/router/gear)
js/logic/  validate, engine (LevelRun: pools, adaptive, swap, stars), stuck (StuckTimer + fake clock),
           save (state/migration/admin/PIN/gate/custom/transfer), codec (transfer codes)
js/data/   math (levels + generators + voice fragments), english, science (banks; format in docs/CONTENT.md)
js/ui/     art (clocks, coins, shapes, blocks… as SVG), mascot (Ollie), fx (confetti/bursts)
js/views/  menu, map, play (+ win), admin (PIN, gate, panel)
tools/     collect-voice-lines, build-voice-manifest, build-sw, check-content, make-icons, voice-tts/gen.py
test/, e2e/
```
