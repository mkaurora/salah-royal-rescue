# Salah's Little Engineer

An iPhone-first, installable, fully offline kids' game (age ~7) about engineering and coding.
Plain HTML/CSS/JS — no build step, no frameworks, no CDN. The only network use is the optional *Ask Helper* voice chat (v3).

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

## v3 (October 2026)

- **This Week's Project**: 12 weekly Big Projects (59 steps, 4–6 each, built from the world mechanics) in `js/data/weekly-projects.js`.
  Week n opens automatically on Monday 2026-10-19 (00:00 UTC) + n weeks (`js/logic/weekly.js`); the menu card shows the project and a countdown.
- **Parent mode**: hold the menu gear for 3 s (touchstart / touchend, 40 px move tolerance; mouse hold on a computer), or tap the
  title or a map star counter 5 times within 3 s → PIN pad (default **1994**, "Forgot PIN?" math gate). Progress / Weekly / Settings tabs:
  unlock levels or weeks early, set stars, reset, Show Me always on, Ask Helper on/off, change PIN, transfer code.
- **Read, then Go**: after the narration the board waits for a big **Go ▶**; 🔊 replays the lines.
- **Show me**: hint first; the button lights up after 2 failed tries or ~2 minutes (or always, from parent mode). The guided demo
  (pointing hand + slow narration, Pause / ↻ Again / 👍 Let me try) is built from each level's stored solution, solves the level, then
  resets it — no stars for a demo.
- **Ask Helper** (🎤): push-to-talk voice chat with an ElevenLabs Conversational AI agent (public agent
  `agent_6201m5ax0meveq1t431c3wmgamsr`, allowlisted to mkaurora.github.io + localhost, 3 min max, hints only). No API key in the
  client; the SDK is vendored in `js/vendor/` and loaded on first use. Offline / failure → the buddy says the level hint.
- **Update game**: Settings → 🔄 *Update game* checks for a new version (offline → "You're offline, try again later";
  nothing new → "You have the latest version"; new → updates and reloads). The game also checks on load and when it becomes visible;
  a new version waits and shows a small "New version! Tap to update" banner, and only that tap activates it (never mid-level).

## v4.0 "Level 2" (October 2026)

A gold **Level 2 ⭐** card on the menu opens the Level 2 hub: three tracks × 12 stages, each track in tiers
(🥉 Bronze → 🥈 Silver → 🥇 Gold, 4 stages each). Every stage uses the normal level controller (Read then Go, buddy, Show me
with the pointing hand, hints, "Did you know?", 1–3 stars, resume).

| Track | What he does | Code |
|---|---|---|
| 🏗️ Engineer Challenges | big builds with a coin budget, an optional relaxed timer (3rd star only) and an animated **end test**: heavy truck / fire truck / bus bridges, wind test (houses, towers), earthquake test, crane lift test | `js/logic/structures.js` (reuses the bridges truss solver), `js/views/l2-frame-view.js`, Bridges view |
| 🧩 Thinking Puzzles | plan the whole program, then Run (or 🐞 Step): counted + nested loops, **My move** (a function), if / else (wall, red, blue), keys + doors, conveyor belts, debugging stages, fewest-blocks stars | `js/logic/puzzles.js`, `js/views/l2-code-view.js` |
| 🔬 Science Lab | 4 topics (gears, levers, ramps, circuits): a 4-card read-aloud lesson with a "try it" card, a quick check, then builds (gear trains with double gears, fulcrum + helper weights, ramp length + friction, roll to the star, parallel circuits, a switch without a short circuit) | `js/logic/lab.js`, `js/views/l2-lab-view.js`, Circuits view |

Rules (`js/logic/level2.js`): stages open in order; the next tier opens with 3 stars on 3 of the 4 stages before it
("mastery"); hint after 2 failed tries, Show me after 4, an **easier version** (max 2 stars) after 6; a quick 3-star win on
some stages offers a ⭐ bonus challenge. Save: `level2` inside `littleEngineerSave` (old saves load fine).
Parents area → **Level 2** tab: progress per track, open any stage / tier / everything, set stars, timers on/off, reset.
Data: `js/data/level2-stages.js` (stages, lessons, tips, facts); hub + lessons: `js/views/level2-hub.js`; styles: `css/level2.css`.

## Run locally

```bash
npm run serve            # http://127.0.0.1:8080/salah-royal-rescue/engineer/
```
(Any static server works; the app uses relative paths. The service worker needs http(s) or localhost.)

Useful URL flags: `?menu=1` (start at the menu instead of resuming), `?fast=1` (fast animations, used by tests),
`?nosw=1` (don't register the service worker while developing). v3 test flags: `?now=2026-10-28T10:00:00Z` (fake clock),
`?showmegate=1` (Show me gating under `?fast=1`), `?readgo=1` (Read-then-Go gate under `?fast=1`).

## Tests

```bash
npm install              # dev dependency: playwright (only for e2e / icon generation)
npm test                 # node --test: level solutions through the real game logic, save/load/unlock/reset, PWA checks
npx playwright install chromium
npm run e2e              # headless iPhone 13 emulation; screenshots -> /workspace/little-engineer-shots/
npm run e2e:levels       # plays EVERY level of every world via "Show me" + Go (DEVICE="iPhone SE" for small screen); shots -> .../levels/
E2E_ONLY=voice node e2e/run.js   # just the voice-clip checks (WebAudio clip vs speechSynthesis fallback, pacing)
node e2e/shots-v2.js     # v2 screenshots -> /workspace/little-engineer-shots/v2/
node e2e/v4.js           # v4 Level 2: hub, one stage per track, Show me, lesson, parent tab, resume, 4× CPU perf,
                         #   iPhone SE + Pixel no-overflow; shots -> /workspace/little-engineer-shots/level2/ (also run by npm run e2e)
node e2e/v3.js           # v3: parent mode, weekly (fake clock), Read-then-Go, Ask Helper fallbacks, Show me, Update game
                         #   (DEVICE="iPhone SE", E2E_ONLY=parent|weekly|readgo|helper|showme|update); shots -> /workspace/little-engineer-v3-shots/
node tools/helper-smoke.js q.wav   # one real Ask Helper session (needs internet + ElevenLabs credits)
```

## Voice clips

The buddy speaks with pre-generated human-voice mp3 clips: `audio/voice/<key>.mp3`, where
`key = FNV-1a-32(normalize(text).toLowerCase())` as 8 hex chars (`js/core/voice-key.js`, shared by browser and Node).
`audio/voice/manifest.json` lists the clips that exist; any line without a clip falls back to the browser's speech synthesis
(so the game works identically with an empty manifest).

```bash
node tools/collect-voice-lines.js     # writes audio/voice/lines.json ([{id, text}] — every spoken line) + groups.json
                                      # (static extraction + a Playwright run that plays every level and records LE.speak)
# generate missing clips (Kokoro am_michael, speed 0.8; skips existing): python tools/voice-tts/genall.py <shard> <nshards>
node tools/build-voice-manifest.js    # writes manifest.json, reports missing clips and orphaned clips
node tools/build-sw.js                # refreshes the service-worker precache list (shell + early clips)
```
`tools/build-sw.js` also writes a build stamp (hash of every precached file) into `sw.js` (cache `engineer-v3-<stamp>`), so any
change to the game makes phones see a new version. Always run it before shipping.

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
