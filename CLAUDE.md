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
  - **What to build, in order → `director/todo.md`** (the one plan; update status as items move, put new asks in it).
  - Open questions for the user → `director/questions.md` (newest on top; tie each to a plan item). When answered, move it to `director/archive/questions-answered.md` and record the decision.
  - Decisions the user made → `director/decisions.md` (date + decision + why).
  - What was done each session → `director/devlog.md` (newest on top; older entries in `director/archive/devlog-to-2026-11-02.md`).
  - The director's own vision notes → `director/vision/` (original text kept verbatim, plus an English digest). **Read these before designing anything.** They're ambitions to build on, not a checklist to do right away.
- The Eon 5 PDFs in the project root are **copyrighted reference for the world only** (ignore the RPG rules). Never commit them, never paste their text into the repo. Write our own prose. See `director/world/eon-notes.md`.

## Before building anything: the pattern check
Every new ask gets a senior-dev check **before any code**: which established pattern does it fit? The patterns, and the foundations still missing, are in **`director/design/architecture.md`** (read it first, keep it current). If it fits, say so in one line and build. If it doesn't (a fireball today: no actions, effects or combat yet), stop, sketch the foundation and agree it with the director first. Never an `if` on a name or a one-off in the renderer.

## The ruleset
- The director turned the project toward recreating the tabletop ruleset. **Never write the brand name** of the ruleset in the repo, UI or commits. World names are fine (decision Q1). Data is mechanics plus our own short summaries, never copied prose.
- Extracted book text lives in `reference/` (gitignored; never commit it or paste it in).

## Cold start: where to read
Every new session, in this order, and nothing more until the task needs it:
1. **`director/todo.md`**: the plan; "Next up" says what we're on.
2. **`director/design/architecture.md`**: the patterns and missing foundations (for the pattern check).
3. `director/questions.md` (open questions) and the top entry of `director/devlog.md`.
4. The handover for the area you're asked about (table below). Don't read the whole `director/` folder.

**`director/archive/` is history, not guidance.** Don't read it unless a live page or the director points there; never take a plan, a "next step" or a design from it.

When work moves: tick the item in `todo.md`, add a devlog entry, move answered questions to the archive, record decisions. When a page is replaced or finished, move it to `director/archive/` (and list it in `archive/README.md`) rather than letting two pages say the same thing.

Skill ids are the creator's Swedish ids (`Argumentera`, `E:`/`K:`/`H:`/`F:` prefixes, `attr:`); `rollableName(id)` gives the English.

| Area | Page | Handover (read first) | Code |
|---|---|---|---|
| Skills, people, hooks | `/skills/` | `director/design/skill-map-handover.md` | `src/content/skillweb`, `src/content/people`, `src/core/skillweb.ts`, `src/core/people.ts` |
| Character creator | `/chargen/` | `director/design/character-creator.md` | `src/core/chargen`, `src/content/chargen`, `src/chargen` |
| Gate scene rules (data for the skill map; its hex page is gone; the one archive page you may read for this) | | `director/archive/exploration-scenes.md` | `src/core/scene.ts`, `src/content/scenes` |
| **3D world (current focus, three.js)** | `/spike3d/` | `director/design/world-structure.md`, then `world3d-handover.md`; maps: `world3d-authoring.md`; scale: `world3d-scale.md` | `src/core/world3d`, `src/engine3d`, `src/art/textures3d.ts`, `src/content/spike3d.ts`, `src/content/maps` (JSON maps, `rules/`), `src/content/furnish.ts`, `src/spike3d` |
| Kinds of person (people × calling × …), their sheets (levels, main/side skills), the map's cast | `/npcs/` | `director/design/people-kinds.md` | `src/core/persons.ts`, `src/core/npcsheet.ts`, `src/content/people/kinds`, `src/content/people/sheets.ts`, `src/npcs`, `MapSpec.people` in `src/core/world3d/mapgen.ts` |
| 3D models: people's bodies (a plan per people, sized from the rules), poses; furniture models | `/models/` | `director/design/models.md`; making furniture: `models-authoring.md` | `src/core/world3d/body.ts`, `pose.ts`, `modelkit.ts`, `src/content/people/bodies.ts`, `poses.ts`, `src/content/things/models/`, `src/engine3d/body.ts`, `things.ts`, `src/models` |
| What people do (schedules, behaviours, places, events, crowds) | | `director/design/behaviours.md` | `src/core/world3d/behave.ts`, `src/core/world3d/perceive.ts` (seeing, hearing), `src/content/behaviours/` (`does/`, `when/`), `src/content/maps/rules/crowd.ts` |
| Combat, damage, wounds (B8) | `/spike3d/?map=arena` | `director/design/combat.md`, rules in our words `combat-rules.md` (use it instead of the book) | `src/core/damage.ts`, `src/content/wounds/`, `src/content/chargen/equipment.ts` (weapons, armour) |
| Items, pockets and the pack (B6) | `/spike3d/` → Pack | `director/design/inventory.md` | `src/core/world3d/inventory.ts`, `src/core/world3d/carry.ts`, `src/content/things/kinds/packs.ts`, `goods.ts`, `src/content/things/kit.ts`, `src/engine3d/world/pack.ts`, `src/spike3d/packsheet.ts` |
| Magic | | `director/design/magic-filaments.md`, `magic-on-map.md` | `src/core/filaments.ts` (rules), `src/core/world3d/filaments3d.ts` (field) |

The deeper designs (`skill-web.md`, `people-library.md`, `ways-of-use.md`) are for when you change the shape, not for every task. Debug hook: `window.spike` (see the 3D handover).

**The 2D hex engine was removed on 2026-10-29** (sandbox, gate scene page, Reedwater, Art Lab). Its code is in the git tag `2d-archive`, its art as pictures in `director/archive/2d-art.md`. Don't bring hex code back; take a painter from the tag only to give it a 3D use.

## Tech
- Vite + TypeScript (strict). **three.js for the 3D world** (`src/engine3d`, code-split; decision 2026-10-28); art is still painted per pixel by code (`src/art`) and put on textures and sprite cards. Vitest for unit tests (`tests/`). **Playwright** (Chromium) for browser tests and screenshots (`e2e/`; on a new machine run `npx playwright install chromium`, no sudo needed). `marked` for the Director's Room.
- `npm run dev` (also on LAN with `--host`), `npm test`, `npm run build`, `npm run test:e2e` (Playwright browser tests in `e2e/`, ~9 minutes for all, ~2 per file).
  - **Run only the browser test files the change can reasonably affect** (decision 2026-11-02): `npm run test:e2e -- spike3d-rooms spike3d.e2e`. Each file's first line says what it covers. The whole suite only for broad changes (the pipeline, materials, chunk streaming, the page's start-up).- Deploy: `.github/workflows/deploy.yml` builds and publishes `dist/` on every push to `main`.
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
