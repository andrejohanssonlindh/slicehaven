# Slicehaven — instructions for Claude

Gloomhaven-style campaign game where Slice & Dice-style **dice replace cards**. Web game, hosted on GitHub Pages, saves in the browser.

## How we work
- The user is **producer/director**; Claude does the heavy lifting (code, design, art, story, music notes).
- The user mostly works **from a phone via Claude RC**. They can't see the terminal well and can't easily approve many prompts:
  - Edit files with Write/Edit, **not Bash** (Bash edits need one approval each). Bash only for git/npm/build/test.
  - **Commit and push after every meaningful step.** Pushing to `main` deploys to Pages, so the user can try it on the phone.
  - Run `npm test` and `npm run build` before pushing. Never push a broken build to `main`.
- Anything that isn't game code but the user should see (proposals, questions, art studies, story drafts, devlog) goes in `director/` as markdown. It renders at `/slicehaven/director/`.
  - Open questions for the user → `director/questions.md` (newest on top, mark answered ones).
  - Decisions the user made → `director/decisions.md` (date + decision + why).
  - What was done each session → `director/devlog.md`.
  - The director's own vision notes → `director/vision/` (original text kept verbatim, plus an English digest). **Read these before designing anything.** They're ambitions to build on, not a checklist to do right away.
- The Eon 5 PDFs in the project root are **copyrighted reference for the world only** (ignore the RPG rules). Never commit them, never paste their text into the repo. Write our own prose. See `director/world/eon-notes.md`.

## Tech
- Vite + TypeScript (strict), **own canvas engine** (no Phaser: dropped 2026-10-25, our art and lighting are per-pixel anyway). Vitest for tests. `marked` for the Director's Room.
- `npm run dev` (also on LAN with `--host`), `npm test`, `npm run build`.
- Deploy: `.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
- Vite `base` is `/slicehaven/`. Static assets go in `public/` and are referenced as `import.meta.env.BASE_URL + 'assets/...'`.

## Code structure
```
src/
  core/      Pure game rules. NO Phaser/DOM imports. Deterministic (all randomness via core/rng.ts). Unit tested.
  content/   Game data: heroes, dice, gear, monsters, scenarios, events, campaign graph. Plain TS objects.
  art/       Art generators: pixel buffers, terrain, props, mobs, icons, dice faces. Everything is drawn by code.
  engine/    Renderer, camera (zoom/pan), weather, lighting, effects, and the sandbox controller.
  ui/        DOM overlays (top bar, menus, long text, dialogs) - text reads better in HTML than canvas on phones.
  director/  Director's Room page script.
  artlab/    Art Lab page script (art tests).
director/    Markdown notes for the producer (design, world, art, story, questions, devlog).
tests/       Vitest tests for core/.
public/      Static assets (sprites, audio, fonts).
```
Rules of thumb:
- Keep rules in `core/` and data in `content/`; the engine renders and animates, it doesn't decide rules.
- Check visual work in a real browser (dev server + Chrome tools) before pushing.
- The sandbox exposes debug hooks on `window.sandbox` (`tap(q,r)`, `setMode`, `enemyTurn`, `isBusy`, state). Use them to fuzz-test async/animation code: random actions in a loop, record errors, flag if `isBusy()` stays true.
- Animations: clamp progress to [0,1] and always resolve pending animation promises when a unit is removed.
- Game state must be plain JSON-serialisable (it goes into the save).
- Save format is versioned in `core/save.ts`; add a migration when changing it.
- Phone-first: portrait 400×720 logical canvas, everything tappable, no hover-only UI.
