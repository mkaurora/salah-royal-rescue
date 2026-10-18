# Salah's Little Engineer — Build Spec

Player: Salah, age 7, attends an American school, English UI, COMPLETE BEGINNER who has never coded. Everything must be readable by a 7-year-old: short sentences, big friendly visuals, minimal text.

## Platform
- Single-folder, iPhone-first installable PWA (plain HTML/CSS/JS, no build step, no frameworks required, no CDN). It will later be served at https://mkaurora.github.io/salah-royal-rescue/engineer/ — use RELATIVE paths for all assets.
- Own manifest.webmanifest: name "Salah's Little Engineer", short_name "Little Engineer", start_url "/salah-royal-rescue/engineer/", scope "/salah-royal-rescue/engineer/", display standalone, orientation portrait, theme/background colors, icons (192, 512, maskable, plus apple-touch-icon 180) — generate PNG icons (e.g. with a small node script or canvas) and commit them.
- Service worker (sw.js) registered with scope "./", cache name 'engineer-v1', precaches all files, works fully offline.
- Portrait, big touch targets (>=48px), safe-area insets (env(safe-area-inset-*)), viewport-fit=cover, no page scrolling / rubber-banding / pinch zoom during play, no text selection on long-press.
- No runtime network calls, no external paid assets, no ads, no political figures.

## Main menu
- Title, cute robot buddy, and 4 big world buttons: Bridges, Machines, Circuits, Robot Coder. Plus a big "Practice Room" button. Settings (sound mute toggle, reset progress behind a confirm dialog). Show stars earned per world.
- Each world opens a level map (path of level nodes) that starts very easy and ramps up. At least 15 handcrafted levels per world (more is fine), unlocked in order, each scored 1–3 stars.

## Worlds
1. Bridges: place beams and supports so a car crosses a gap. Simple stress physics (beams colored green -> yellow -> red by stress, break if overloaded), car drives across when "Go" pressed. Teaches triangles (trusses), supports, balance, and budget (stars based on cost/beams used). Grid/anchor-snapping for easy touch building.
2. Machines: levers, ramps, pulleys, wheels & axles, gears (direction and speed: meshed gears turn opposite ways; small gear spins faster), wedges. Goal: get a ball or box to the goal. Puzzle style: place/rotate a few parts from a tray, press Go, deterministic simulation.
3. Circuits: wires, batteries, bulbs, switches, series vs parallel, motors (fan/windmill). Goal: light up buildings. Grid with tiles to drag/rotate; deterministic circuit solver (closed loop detection, brightness: series dimmer, parallel bright).
4. Robot Coder: drag command blocks into a program strip to steer a robot through grid mazes collecting gears and reaching a flag. Start with ONLY a 'forward' block, then add turn left/right, then much later 'repeat' loops and simple 'if' conditions (e.g. if wall ahead -> turn). ONE new idea per level. Animate step-by-step with highlighted current block. Stars based on collecting all gears and using few blocks.

## Practice Room (very important to Salah)
- Button on the main menu AND inside Robot Coder world map.
- Free robot-coding sandbox: NO stars and NO failing. Open grid where he can run the robot as much as he likes (reset, clear, run again), with all unlocked blocks available (or a simple selector of blocks, starting with forward).
- Optional mini-challenges from very easy ("reach the star 2 steps ahead") to harder (turns, loops). Completing them gives a cheer, never a fail.

## Robot buddy helper (in EVERY level of all 4 worlds AND in the Practice Room)
- A cute robot character (SVG/canvas, animated: blinking, bobbing, waving).
- Explains each level's goal in short simple sentences (speech bubble).
- Demonstrates new concepts step by step with an animated pointing hand that moves to the exact UI element / grid spot to tap/drag.
- Always available via a buddy button offering "Show me" (buddy demonstrates the solution or next step with the pointing hand) and "Let me try" (closes and lets him play).
- The first levels of each world (at least 2–3) are fully guided tutorials: buddy walks him through each action and waits for him to do it.

## Educational
- Short friendly tip card for each new concept when it's introduced (picture + 1–2 sentences).
- "Did you know?" fun fact after each level win.
- Gentle hints after a few tries or idle time. Never punishing, unlimited retries, encouraging language ("Almost! Let's try again!").
- After a win: confetti + stars + a big "Next" button that goes straight to the next level.

## Progress (localStorage, key e.g. 'littleEngineerSave')
- Stars, unlocks, settings (sound), seen tips, and the IN-PROGRESS level state (what he placed / his program) so reopening the app resumes the same level where he left off.
- Reset progress behind a confirm dialog.

## Look & feel
- Polished, colorful, high-quality cartoon look like top commercial kids' games: rounded chunky buttons with depth/shadows, gradients, soft outlines, smooth animations, juicy feedback (bounces, squash/stretch, particles), confetti. Canvas, SVG and/or CSS only. Consistent palette per world.

## Audio
- WebAudio synthesized sound effects (tap, place, success, star, whoosh, buzz, car, etc.) with a mute toggle (saved).
- Audio MUST unlock on the FIRST tap on iOS: create or resume the AudioContext and play a silent 1-sample buffer SYNCHRONOUSLY inside touchstart, touchend, pointerdown and click CAPTURE listeners on document; handle the iOS 'interrupted' state (treat like suspended, resume); resume on visibilitychange and pageshow.

## Code structure suggestion
- Keep level data and pure game logic (bridge solver, machine sim, circuit solver, robot interpreter, save/load/unlock) in modules that can be loaded both by the browser and by Node tests (e.g. UMD-style or ES modules with a node test runner).

## Tests (node, light deps; `npm test`)
- EVERY level in every world has a stored verified solution, and tests check that the solution solves it through the real game logic (and gets >=1 star; ideally 3-star solution too).
- Practice Room challenges have verified solutions.
- Save/load, resume of in-progress level, unlock logic, reset.
- All must pass.
- Headless mobile browser verification (Playwright with iPhone emulation; install it with npm if needed — chromium/webkit available via `npx playwright install` if not cached): every world and the Practice Room load, the buddy appears, and level 1 of each world can be completed (via UI interactions or a test hook that applies the solution through the real UI flow). Save screenshots to /workspace/little-engineer-shots/: menu.png, bridges.png, machines.png, circuits.png, robot.png, practice.png (plus any others useful). No console errors.

## Deliverable
- Everything in /workspace/little-engineer (git repo, commit when done). Include a README.md with how to run locally and test. Do NOT deploy, do NOT push anywhere, do NOT touch /workspace/salah-v2.

## v2 (October 2026)
- **Human voice:** every buddy line is played from a pre-generated mp3 clip (`audio/voice/<key>.mp3`, key = 8-hex FNV-1a of the
  normalized lowercased text) through the WebAudio context (own gain node, decoded-buffer cache, previous clip stopped,
  decodeAudioData callback form for older Safari, same iOS unlock). Missing/failed clips fall back to speechSynthesis.
  `LE.speak` returns a Promise; Show me and tutorial steps wait for each line to finish; bubbles never hide before the clip
  ends + ~1 s; 🔊 replays the clip; the current level's clips are prefetched. All spoken text is static (finite) and listed
  in `audio/voice/lines.json` (generated by `tools/collect-voice-lines.js`, static + runtime capture); `manifest.json` lists
  available clips (`tools/build-voice-manifest.js`).
- **Service worker** cache `engineer-v2`: precaches the app shell, `audio/voice/manifest.json`/`groups.json` and the clips of
  the menu/common lines and the first 3 levels of each world; other clips are cached on first play (200 responses only).
- **+10 levels** in Bridges (27), Machines (28), Circuits (27) and Robot Coder (28), continuing the gentle ramp (one new idea
  per level, practice levels in between).
- **New world: Construction 🚧** (18 levels): bulldozer (sokoban-lite: dirt into holes, rocks into the dump truck, flat roads),
  house building in order (foundation → walls → windows/door → roof; triangle roofs; wide foundations for tall houses),
  crane (move the hook, grab/drop, stack towers with big blocks at the bottom), and combined stages ending with a "Dream
  House". Guided tutorials, tip cards, facts, Show me / Let me try, par-based stars, undo, saved progress + resume.
