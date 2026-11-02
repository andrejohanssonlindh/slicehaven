# How we build things: patterns and missing foundations

*2026-11-02. The director's rule: every time something new is asked for, first check whether there is an established good way to build it. If there is, use it. If there isn't, build the foundation first, agreed with the director, and only then the feature. This page is the list Claude checks against. Keep it short and true: when a foundation is built, move it from "missing" to "patterns".*

## The check, for every new ask
1. **Which pattern does it fit?** Look it up in the table below. A new barrel is a kind of thing; a new kind of guard is a kind of person; a new way to place houses is a map rule.
2. **If it fits:** say so in one line ("a new kind under `container`, one file") and build it.
3. **If it doesn't fit:** stop. Name the missing foundation, sketch it (what it is, where it lives, how the second and tenth feature like this would be added), put it in front of the director, and only build the feature once the foundation is agreed. A fireball is the example: no actions, effects or combat exist yet.
4. **Never** solve it with an `if` on a name, a one-off in the renderer, or a hand-tuned list in a page script. Those are what made the two refactors of October necessary.

## Game principles (they hold for every feature)
1. **The world reacts.** Weather, light, fire, bodies and sources change the ground around them.
2. **Not linear.** Finishing one route never closes the others.
3. **Almost everything can be tried.** Look at it, use a skill on it; most attempts just do nothing.
4. **Hints are optional.** The game won't tell you which skill is useful; looking around does.
5. **Phone first.** Portrait, everything tappable, no hover.
6. **Measurements, not hexes.** Distances are metres, fights included.
7. **Authoring by intent.** Maps, houses and rooms are written as rules ("a bakery on the north side of the road"), not tuned coordinates.
8. **Free time, fights in rounds.** The world runs freely with a slow day and night; a fight stops it and plays in rounds of 4 seconds.

## The layers
| Layer | Folder | Holds | Never |
|---|---|---|---|
| Rules | `src/core/` | Pure, deterministic rules (randomness only through `core/rng.ts`), unit tested | DOM, three.js, content names |
| Data | `src/content/` | Kinds, maps, behaviours, sheets, skill library: plain objects, one file each | Rules logic beyond small lookups |
| Engine | `src/engine3d/` | Draws and animates what the rules say | Decides rules (who can walk where, what happens) |
| Art | `src/art/` | Painters that make pixels | Game state |
| Pages | `src/spike3d/`, `src/npcs/` … | Wire a page together | Rules or content |

State is plain JSON (it goes into the save). A kind is never an instance: the kind says what all wells are; a placed well is "a well, here, seed 3" plus its own small state.

## Established patterns
| Pattern | Use it for | Where | How to add one | What guards it |
|---|---|---|---|---|
| **Kinds of thing** (a tree with inheritance; properties, not names) | Anything that stands in the world: props, trees, furniture, fires, buildings, rooms | `content/things/kinds/*.ts`; what a kind can say: `ThingDef` in `core/world3d/things.ts` | A new entry under the right parent. Needs a behaviour no kind can say yet? Add a **property** to `ThingDef` (like `deck`, `flame`, `blocksSight`) | `tests/thing-kinds.test.ts`; the map compiler reports unknown kinds |
| **Kinds of person** (one line in each tree: people × calling × …) | Who someone is, their look, their sheet | `content/people/kinds/`; rules `core/persons.ts` | A new entry under its people or calling | `tests/` for persons and sheets |
| **Sheets stacking down kinds** (level 1–5, main/side skills, knacks, gear) | What a person can do, enemies included | `core/npcsheet.ts`, `content/people/sheets.ts` | A sheet entry on the kind | `tests/npcsheet.test.ts`; `/npcs/` page |
| **Behaviours and conditions** (a schedule of "when → do", first that holds wins) | What people do over the day | `core/world3d/behave.ts`; `content/behaviours/does/`, `when/` | A new file in `does/` or `when/` | `tests/behaviours.test.ts`; the compiler checks schedules |
| **Maps as files + map rules** (intent, not coordinates) | Places, and ways of filling them (street, scatter, torches, crowd) | `content/maps/*.json`, `content/maps/rules/` | A new JSON file; a new rule is one file | `tests/maps.test.ts` requires no problems; typos are reported |
| **Folder registries** | Every list above: a file in the folder is found by itself, no list to edit | `import.meta.glob` in each folder's `index.ts` | Drop a file in | (a brand-new file can be missed by a stale vitest glob: edit the index once) |
| **Compile and report** | Content is checked when it is read, and every mistake becomes a listed problem, not a crash or silence | `core/world3d/mapgen.ts` | New keys must be read somewhere, or they are reported | tests require zero problems |
| **Bodies and poses** (one builder, a plan per people, dressed from the look; movement as loops of poses) | How a person looks and moves in 3D | `core/world3d/body.ts`, `pose.ts`; `content/people/bodies.ts`, `poses.ts`; `engine3d/body.ts` | A new people's shape: an entry in `BODY_PLANS`. A new movement: a loop in `poses.ts` | `tests/body.test.ts`; the `/models/` gallery |
| **Furniture models** (one file per kind, found by itself; the solver turns them to their wall) | Any piece of furniture in 3D | `content/things/models/`, kit `core/world3d/modelkit.ts`, `FurnitureModel` in `things.ts` | A file `<kind id>.ts`; how-to: `director/design/models-authoring.md` | `tests/furniture-models.test.ts`, `tests/furnish.test.ts`, `e2e/models.e2e.ts` |
| **Actors** (plain data people, moved by rules) | Anyone who walks | `core/world3d/actors.ts`; the renderer only places their cards | — | `tests/actors.test.ts` |
| **Skill hooks on the kind chain** | What skills can do to a kind of thing or person (checks, outcomes, social conflicts) | `core/skillweb.ts`, `content/skillweb/` | A hook on the kind in the library | skill tests. **Built in the 2D days; not yet wired into the 3D world** (that is step 5) |
| **States on placed things** (a kind lists its states and their start, inherited; a thing stores only what differs) | A fire lit or out, a door open, a barrel emptied: anything that changes and must stay changed | `core/world3d/state.ts` (`ThingStates`, `placedId`, `pieceId`); `states` on `ThingDef` | A state on the kind (`states: { open: { default: false } }`); the engine listens (`states.on`) and redraws | `tests/state.test.ts` |
| **The saved world** (one versioned JSON record per map) | Whatever must survive a reload: the hero's spot, the clock, what was seen, the things' states | `core/world3d/save.ts`; the page writes it (`src/spike3d/main.ts`) | A new field in `WorldSave`, and bump `WORLD_SAVE_VERSION` (old saves are dropped) | `tests/state.test.ts`, `e2e/spike3d-save.e2e.ts` |
| **The one roll system** (every roll made in one place, through the seeded rng; a roll is plain data) | Skill tests, pools, the creator's tables; anything that rolls | rules `core/dice.ts` (`rollOpen`, `rollPool`, `rollTable`, `rollTest`); checks `core/checks.ts`; showing `ui/dice/` (`showRolls`, at the level in `ui/settings.ts`); skins `content/dice/skins/` | Roll with `core/dice.ts`, then `showRolls([roll])`; a new skin is one file | `tests/dice.test.ts`, `e2e/dice.e2e.ts` |
| **Filament field** (magic strength read from what stands where) | Magic sources and their strength | `core/filaments.ts`, `core/world3d/filaments3d.ts`; kinds say `filament` | A `filament` property on the kind | filament tests |

## Missing foundations (don't build features on these until the base exists)
Each needs a short design, agreed with the director, before any feature that rests on it. **The order they are built in is [the plan](../todo.md).** Added from the director's notes of 2026-11-02, besides the rows below: a turning view (A1), people as bodies rather than cards (A2), perception (B5), kinds of creature (animals, mounts), a calendar for growing crops, and quest flags.

| Foundation | Needed by | What it would be (first sketch, not agreed) |
|---|---|---|
| **Actions on things** (plan step 5) | Tapping a thing or a person, using a skill on it | The kind chain lists what can be done (from the skill hooks); doing it runs a check from the rules and changes instance state |
| **Time model for actions** | Anything that takes time or happens in rounds: combat, spells, crafting | Settled (A3): live, and only a fight goes to rounds of 4 seconds. The code for rounds comes with combat (B8) |
| **Effects** (things that happen to a thing or person: burning, wet, wounded, afraid) | A fireball, rain putting out a fire, poison, fear | An effect is a kind too (one file each): what it changes, how long it lasts, how it shows. Applied to instance state |
| **Abilities and spells** | A fireball | An ability is a kind: what it costs (filaments), what it targets (a point, an area, a person), what roll it needs, which effects it applies. Its look (projectile, burst) points at shared engine code, like a kind points at a builder |
| **Damage and wounds; combat** | Fights, enemies | From the ruleset; lives in `core/`, reads the sheet |
| **People reacting** (perception, alarm, chase, flee) | Enemies, guards, thieves | New behaviours and conditions (`when/`: "sees the hero", "heard a noise"), so it extends the behaviours pattern rather than standing beside it |
| **Items and inventory** | Gear, loot, tools that help skills | Items are kinds of thing (`item` already exists in the tree); a person or container holds instances |
| **Locations** (plan step 6, Q25) | Travelling between maps | Exits and arrivals; likely an overworld |

**Worked example: "add a fireball".** It needs an ability (missing), a target and an area (missing), an effect, burning (missing), state on what it hits (there now: `states`), damage (missing), and rounds (settled, not built). So the answer is not "add a fireball": it is "design actions and effects, then the fireball is one ability file". By contrast, "add a barrel with a lid" is one kind under `container` today, with an `open` state; opening it by hand waits for actions (B3).

## Keeping this page true
- When a foundation is built: move its row up to the patterns, with where it lives and what test guards it.
- When a feature is built outside every pattern (it should not happen, but if the director asks for a quick test): list it here under "debts" so it is not forgotten.

## Debts
*(none recorded yet)*
