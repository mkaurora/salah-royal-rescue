# Salah's Little Engineer

An iPhone-first, installable, fully offline kids' game (age ~7) about engineering and coding.
Plain HTML/CSS/JS — no build step, no frameworks, no CDN, no network calls.

**Worlds**

| World | What you learn |
|---|---|
| 🌉 Bridges | beams, supports, triangles (trusses), stress & budget — build a bridge, press Go, watch the car cross |
| ⚙️ Machines | ramps, levers, pulleys, wheels & axles, gears (direction & speed), wedges |
| 💡 Circuits | wires, batteries, bulbs, switches, series vs parallel, motors |
| 🤖 Robot Coder | sequencing, turns, loops (repeat / forever), conditions (if wall ahead) |
| 🧪 Practice Room | free robot-coding sandbox with optional mini-challenges — no stars, no failing |

Every level has the robot buddy **Bolt** (speech bubble + read-aloud, *Show me* demo with an animated pointing hand,
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
```

`npm test` verifies that **every level in every world has a stored solution that solves it through the real
logic** (bridge truss solver, machine simulation, circuit solver, robot interpreter) and earns 3 stars, that
Practice Room challenges are solvable, plus save/resume/unlock/reset and PWA requirements.

`npm run e2e` serves the folder at `/salah-royal-rescue/engineer/`, checks the menu, each world map and level 1
(completed through the real UI — taps for Robot Coder, the buddy's *Show me* + Go for the others), the
Practice Room, resume-after-reload, the service worker + offline mode, and that there are no console errors.

## Project layout

```
index.html, manifest.webmanifest, sw.js (cache "engineer-v1"), icons/
css/            style.css (shell) + one stylesheet per world
js/logic/       pure logic shared with Node tests: save.js, robot.js, bridges.js, machines.js, circuits.js
js/data/        level data (+ stored solutions) and tip cards / facts per world
js/core/        ui.js (helpers, confetti), audio.js (WebAudio SFX + iOS unlock), buddy.js, app.js (screens)
js/views/       one UI module per world + practice-view.js
test/           node:test suites      e2e/  Playwright check + static server
tools/          make-icons.js (renders PNG icons), build-sw.js (refreshes the precache list)
docs/WORLD_API.md  internal contract between the shell and world modules
```

After adding or removing app files run `node tools/build-sw.js` to refresh the service-worker precache list
(a test fails if it is out of date). Bump the cache name in `sw.js` when shipping changes.
