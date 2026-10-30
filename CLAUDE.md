# Slicehaven — instructions for Claude

Grounded fantasy campaign game in a live 3D pixel world (measured in metres, no hexes), built on a tabletop ruleset (D6 pools, skills, conflicts). Web game, hosted on GitHub Pages, saves in the browser. The original idea (Gloomhaven with dice instead of cards) is dropped.

## Stage: design, building the engine
- We are building the engine in **small vignettes** (a scene, a system). **Nothing is finished**: whatever the director does in the app is testing.
- **No backwards compatibility.** Don't write save migrations or spend time keeping old saves working: bump the version and drop old data.
- **The final graphical style is not set.** Some of the current art survives, not all. Don't polish art for its own sake; decide the style when game design starts.
- **English only, translatable:** write new text as `t('key', 'English text')` from `src/i18n/`. Don't populate the language file yet.
- **Story is parked** until the engine is further along.

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

## The ruleset
- The director turned the project toward recreating the tabletop ruleset. **Never write the brand name** of the ruleset in the repo, UI or commits. World names are fine (decision Q1). Data is mechanics plus our own short summaries, never copied prose.
- Extracted book text lives in `reference/` (gitignored; never commit it or paste it in).

## Cold start: where to read
Read only the handover for the area you're asked about; don't read the whole `director/` folder. `devlog.md` is long: read its top entry at most. Skill ids are the creator's Swedish ids (`Argumentera`, `E:`/`K:`/`H:`/`F:` prefixes, `attr:`); `rollableName(id)` gives the English.

| Area | Page | Handover (read first) | Code |
|---|---|---|---|
| Skills, people, hooks | `/skills/` | `director/design/skill-map-handover.md` | `src/content/skillweb`, `src/content/people`, `src/core/skillweb.ts`, `src/core/people.ts` |
| Character creator | `/chargen/` | `director/design/character-creator.md` | `src/core/chargen`, `src/content/chargen`, `src/chargen` |
| Gate scene rules (data for the skill map; its hex page is gone) | | `director/archive/exploration-scenes.md` | `src/core/scene.ts`, `src/content/scenes` |
| **3D world (current focus, three.js)** | `/spike3d/` | `director/design/world-structure.md`, then `world3d-handover.md` (then `world3d-m0.md`, `voxel-engine-brief.md`); maps: `world3d-authoring.md` | `src/core/world3d`, `src/engine3d`, `src/art/textures3d.ts`, `src/content/spike3d.ts`, `src/content/maps` (JSON maps, `rules/`), `src/content/furnish.ts`, `src/spike3d` |
| Kinds of person (people × calling × …), the map's cast | | `director/design/people-kinds.md` | `src/core/persons.ts`, `src/content/people/kinds`, `MapSpec.people` in `src/core/world3d/mapgen.ts` |
| What people do (schedules, behaviours, places, events, crowds) | | `director/design/behaviours.md` | `src/core/world3d/behave.ts`, `src/content/behaviours/` (`does/`, `when/`), `src/content/maps/rules/crowd.ts` |
| Magic | | `director/design/magic-filaments.md`, `magic-on-map.md` | `src/core/filaments.ts` (rules), `src/core/world3d/filaments3d.ts` (field) |

The deeper designs (`skill-web.md`, `people-library.md`, `ways-of-use.md`) are for when you change the shape, not for every task. Debug hook: `window.spike` (see the 3D handover).

**The 2D hex engine was removed on 2026-10-29** (sandbox, gate scene page, Reedwater, Art Lab). Its code is in the git tag `2d-archive`, its art as pictures in `director/archive/2d-art.md`. Don't bring hex code back; take a painter from the tag only to give it a 3D use.

## Tech
- Vite + TypeScript (strict). **three.js for the 3D world** (`src/engine3d`, code-split; decision 2026-10-28); art is still painted per pixel by code (`src/art`) and put on textures and sprite cards. Vitest for unit tests (`tests/`). **Playwright** (Chromium) for browser tests and screenshots (`e2e/`; on a new machine run `npx playwright install chromium`, no sudo needed). `marked` for the Director's Room.
- `npm run dev` (also on LAN with `--host`), `npm test`, `npm run build`, `npm run test:e2e` (Playwright browser tests in `e2e/`, a few minutes; run after changing `src/engine3d` or the 3D page).
- Deploy: `.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
- Vite `base` is `/slicehaven/`. Static assets go in `public/` and are referenced as `import.meta.env.BASE_URL + 'assets/...'`.

## Code structure
```
src/
  core/      Pure game rules. NO DOM imports. Deterministic (all randomness via core/rng.ts). Unit tested.
  content/   Game data, plain TS objects: chargen/, scenes/, npcs/, skillweb/ (skill tags, examples, hooks), people/ (facets, leanings).
  i18n/      Language support groundwork: t(key, 'English'). Language files are empty for now.
  art/       Art generators: pixel buffers, people, furniture, wall/roof/ground textures (textures3d.ts). Everything is drawn by code.
  engine3d/  The 3D renderer (three.js): world, pixel pipeline, materials, sprites, water, weather effects.
  ui/        Shared page style and the character sheet.
  director/  Director's Room page script.
  chargen/, skills/, spike3d/   Page scripts for /chargen/, /skills/, /spike3d/ (each has an index.html at the root; / is a plain hub).
director/    Markdown notes for the producer (design, world, questions, devlog, archive). Images in public/director-art/.
tests/       Vitest tests for core/ and content/.
public/      Static assets.
```
Rules of thumb:
- **Everything in the world is a kind of thing** (`content/things/kinds/`, one file each, inheriting down the kind tree; see `director/design/world-structure.md`). Never write `if (kind === 'well')`: give kinds a property, and put a new thing in the tree (what is it a kind of?) before building it.
- Keep rules in `core/` and data in `content/`; the engine renders and animates, it doesn't decide rules. People who walk are `Actor`s (`core/world3d/actors.ts`); the renderer only places their cards.
- Check visual work in a real browser (dev server + Chrome tools) before pushing.
- Game state must be plain JSON-serialisable (it goes into the save).
- Save formats carry a version (`CHAR_VERSION` in `core/chargen/state.ts`); data from another version is dropped, no migrations.
- Phone-first: portrait, everything tappable, no hover-only UI.
