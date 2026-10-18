# Salah's Little Engineer

An iPhone-first, installable, fully offline kids' game (age ~7) about engineering and coding.
Plain HTML/CSS/JS — no build step, no frameworks, no CDN, no network calls.

**Worlds**

| World | What you learn |
|---|---|
| 🌉 Bridges | beams, supports, triangles (trusses), stress & budget — build a bridge, press Go, watch the car cross |
| ⚙️ Machines | ramps, levers, pulleys, wheels & axles, gears (direction & speed), wedges |
| 💡 Circuits | wires, batteries, bulbs, switches, series vs parallel, motors |
| 🤖 Robot Coder | sequencing, turns, loops (repeat / forever), conditions (if wall ahead), debugging |
| 🚧 Construction | bulldozer pushing dirt into holes / rocks into the truck, building in order (foundation → walls → windows/door → roof), triangle roofs, wide foundations, crane lifting & stacking |
| 🧪 Practice Room | free robot-coding sandbox with optional mini-challenges — no stars, no failing |

Levels: Bridges 27, Machines 28, Circuits 27, Robot Coder 28, Construction 18 (128 total).

Every level has the robot buddy **Bolt** (speech bubble + read-aloud with pre-recorded human voice clips, *Show me* demo with an animated pointing hand,
*Let me try*), the first levels of each world are guided tutorials, new ideas get a tip card, and every win
shows a "Did you know?" fact. Progress, settings and the in-progress level are saved in `localStorage`
(`littleEngineerSave`), so reopening the app resumes where Salah left off.

## Run locally

```bash
npm run serve            # http://127.0.0.1:8080/salah-royal-rescue/engineer/
```
(Any static server works; the app uses relative paths. The service worker needs http(s) or localhost.)

Useful URL flags: `?menu=1` (start at the menu instead of resuming), `?fast=1` (fast animations, used by tests),
`?nosw=1` (don't register the service worker while developing).

## Tests

```bash
npm install              # dev dependency: playwright (only for e2e / icon generation)
npm test                 # node --test: level solutions through the real game logic, save/load/unlock/reset, PWA checks
npx playwright install chromium
npm run e2e              # headless iPhone 13 emulation; screenshots -> /workspace/little-engineer-shots/
npm run e2e:levels       # plays EVERY level of every world via "Show me" + Go (DEVICE="iPhone SE" for small screen); shots -> .../levels/
E2E_ONLY=voice node e2e/run.js   # just the voice-clip checks (WebAudio clip vs speechSynthesis fallback, pacing)
node e2e/shots-v2.js     # v2 screenshots -> /workspace/little-engineer-shots/v2/
```

## Voice clips

The buddy speaks with pre-generated human-voice mp3 clips: `audio/voice/<key>.mp3`, where
`key = FNV-1a-32(normalize(text).toLowerCase())` as 8 hex chars (`js/core/voice-key.js`, shared by browser and Node).
`audio/voice/manifest.json` lists the clips that exist; any line without a clip falls back to the browser's speech synthesis
(so the game works identically with an empty manifest).

```bash
node tools/collect-voice-lines.js     # writes audio/voice/lines.json ([{id, text}] — every spoken line) + groups.json
                                      # (static extraction + a Playwright run that plays every level and records LE.speak)
# … generate <id>.mp3 for every lines.json entry with your TTS tool, copy them into audio/voice/ …
node tools/build-voice-manifest.js    # writes manifest.json, reports missing clips and orphaned clips
node tools/build-sw.js                # refreshes the service-worker precache list (shell + early clips)
```
Bump the cache name in `sw.js` (`engineer-v2` → `engineer-v3`) when shipping new clips or code.

`npm test` verifies that **every level in every world has a stored solution that solves it through the real
logic** (bridge truss solver, machine simulation, circuit solver, robot interpreter) and earns 3 stars, that
Practice Room challenges are solvable, plus save/resume/unlock/reset and PWA requirements.

`npm run e2e` serves the folder at `/salah-royal-rescue/engineer/`, checks the menu, each world map and level 1
(completed through the real UI — taps for Robot Coder, the buddy's *Show me* + Go for the others), the
Practice Room, resume-after-reload, the service worker + offline mode, and that there are no console errors.

## Project layout

```
index.html, manifest.webmanifest, sw.js (cache "engineer-v2"), icons/, audio/voice/ (clips, manifest, lines, groups)
css/            style.css (shell) + one stylesheet per world
js/logic/       pure logic shared with Node tests: save.js, robot.js, bridges.js, machines.js, circuits.js, construction.js
js/data/        level data (+ stored solutions) and tip cards / facts per world
js/core/        ui.js (helpers, confetti), voice-key.js, audio.js (WebAudio SFX + voice clips + iOS unlock), buddy.js (LE.speak), app.js (screens)
js/views/       one UI module per world + practice-view.js
test/           node:test suites      e2e/  Playwright check + static server
tools/          make-icons.js, build-sw.js (precache list), collect-voice-lines.js, build-voice-manifest.js
docs/WORLD_API.md  internal contract between the shell and world modules
```

After adding or removing app files run `node tools/build-sw.js` to refresh the service-worker precache list
(a test fails if it is out of date). Bump the cache name in `sw.js` when shipping changes.
