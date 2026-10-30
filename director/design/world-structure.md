# How the world is put together: kinds of thing, maps as files

*2026-10-29. The director's ask: every object in the world as an object, in its own file, with what it is, how it is drawn, how it is interacted with and what skills do to it, inheriting from a tree of kinds; and every map just a file that is read and rendered. This page is the structure and the plan. Read it before adding anything to the world.*

## The idea in one paragraph
Everything in the world is a **kind of thing**. A kind is one small file that says what the thing *is*: what it is a kind of, how much ground it takes, whether it stops the eye, what magic it gives off, how it is drawn, what it looks like when looked at, and (soon) what can be done to it. A kind inherits everything it does not say from its parent. So **"a wall stops the eye" is said once, on `wall`, and every wall has it.** A **map** only says *which* kinds stand *where*; it never says what they are. The rules (walking, sight, filaments, skills) and the renderer all ask the kind.

## The tree
The kinds of thing are leaves on the **same tree the skill library already uses for its hooks** (`content/skillweb/kinds.ts`: thing → feature → structure → wall …). That is the point: a well is `water`, so every hook on water reaches the well, and a palisade is a `wall`, so every hook on walls reaches it. One tree, read by the eye, the feet, the field and the skills.

```
thing
├─ feature
│  ├─ plant ── tree (family: trunk, sight, life, a crown that sheds)
│  │   │        ├─ oak ── young
│  │   │        ├─ pine (its own magic, needles hold)
│  │   │        └─ dead (no crown)
│  │   ├─ shrub
│  │   └─ stump
│  ├─ rock ── boulder
│  ├─ water ── well
│  └─ structure
│      ├─ wall (family: stops the eye, a run) ── palisade, stonewall
│      ├─ door ── gate
│      └─ tower, archway, bridge, signpost, stall, bench, fence, laundry, cart, woodpile
└─ item
   ├─ container ── barrel, crates, trough
   └─ hay
```

## Where things live
| What | Where |
|---|---|
| The kinds of thing, one file each (or a small family per file) | `src/content/things/kinds/*.ts`. A new file there is a new kind; nothing else to edit. |
| What a kind can say, inheritance, the questions the world asks (`shapes`, `blocksSight`, `source`, `parts`) | `src/core/world3d/things.ts` (`ThingDef`, `Things`) |
| The registry everything reads | `THINGS` in `src/content/things/index.ts` |
| How the pieces are drawn (meshes, art) | Still shared builders: `core/world3d/props.ts`, `propsMore.ts`, `tree.ts`, and `art/`. A kind *points at* a builder; it never copies one. |
| Tests every kind must pass | `tests/thing-kinds.test.ts` |

A kind is one object. The well, whole:
```ts
const well: ThingDef = {
  id: 'well',
  is: 'water',                                  // what it is a kind of
  look: 'A stone well with a windlass and a bucket.',
  foot: [{ circle: 0.72 }],                     // the ground it takes
  filament: { kind: 'water', weight: 0.6 },     // what it gives the magic
  draw: () => { ... buildWell() ... },          // how it is drawn (a shared builder)
};
```

## Two rules that keep it from turning into a monster
1. **A kind is not an instance.** The kind says what all wells are like; a placed well in a map is only "a well, here, turned so, seed 3" (and, soon, its own small state: the bucket drawn, the gate open). Instance state stays plain data so it can be saved.
2. **Kinds point at shared code; they don't hold it.** 200 lines of geometry stay in the builders. A kind file stays short enough to read on a phone.

## The plan, in order
1. **Kinds of thing** for everything outdoors. ✅ *Done 2026-10-29*: all 25 props and the four trees, with inheritance, linked into the skill tree; the renderer, feet, sight, filaments and the map compiler all ask the kind (no more `if (kind === 'well')` anywhere). Maps that place a kind nobody defined are told so.
2. **The rest of the world's things as kinds** (*✅ torch posts, campfires, all room furniture and the kinds of building are kinds as of 2026-10-30; only the door torch is left, with the cast, in step 3*): torch posts and campfires (a `fire` family), furniture (the room recipes keep their rules, the pieces become kinds: a bed, a hearth, a bookshelf that gives off meaning), and **kinds of building** (a house kind is a thing with storeys and rooms; this is review item 8, "plans as data").
3. **Kinds of person**: a look, a routine (`Rounds` and its siblings), the people-library facets they carry, **and a character** (race to skills: the creator's `CharState` and `derive()`, made from the kind for most people, the creator's save for the hero). The cast of a map comes from its file (review item 9). Designed in [kinds of person](people-kinds.md).
4. **Maps as files**: a map is a data file (JSON) that names kinds and places them; files dropped in the maps folder are found without a list to edit. The things that are code in maps today (Eastgate's loop, the wild map's "where") become rules the format understands ("a row of houses along road 0 from here to there, every 20 m").
5. **Doing things to things**: tap a thing, see its look, use a skill on it. The kind (and its chain) says which hooks apply; the old gate scene's checks and outcomes come back here, without hexes.
6. **Locations**: how maps join (exits, arrivals, a map's own weather and hour). A design question first: see `questions.md`.

## The habit, for every new thing asked for
Before building something new, place it in the tree first: *what is it a kind of, and what does it inherit?* If it needs something no kind can say yet (a door that opens, a thing that burns), add that as a **property any kind can have** (like `deck` for a bridge or `blocksSight` for a wall), not as an `if` on its name. If the right family does not exist, make the family, so the next thing like it is one line.
