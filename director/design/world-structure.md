# How the world is put together: kinds of thing, maps as files

*2026-10-29, trimmed 2026-11-02. The director's ask: every object in the world as an object, in its own file, with what it is, how it is drawn, how it is interacted with and what skills do to it, inheriting from a tree of kinds; and every map just a file that is read and rendered. Read this before adding anything to the world. What to build next is [the plan](../todo.md); every pattern, not only this one, is in [how we build things](architecture.md).*

## The idea in one paragraph
Everything in the world is a **kind of thing**. A kind is one small file that says what the thing *is*: what it is a kind of, how much ground it takes, whether it stops the eye, what magic it gives off, how it is drawn, what it looks like when looked at, and (soon) what can be done to it. A kind inherits everything it does not say from its parent. So **"a wall stops the eye" is said once, on `wall`, and every wall has it.** A **map** only says *which* kinds stand *where*; it never says what they are. The rules (walking, sight, filaments, skills) and the renderer all ask the kind.

## The tree
The kinds of thing are leaves on the **same tree the skill library uses for its hooks** (`content/skillweb/kinds.ts`: thing → feature → structure → wall …). A well is `water`, so every hook on water reaches the well; a palisade is a `wall`, so every hook on walls reaches it. One tree, read by the eye, the feet, the field and the skills.

```
thing
├─ feature
│  ├─ plant ── tree (oak, young, pine, dead), shrub, stump
│  ├─ rock ── boulder
│  ├─ water ── well
│  ├─ fire ── torchpost, campfire, walltorch, hearth
│  └─ structure
│      ├─ wall ── palisade, stonewall
│      ├─ door ── gate
│      ├─ building ── cottage, inn, shop, stable
│      ├─ room ── taproom, home, horsestall …
│      └─ tower, archway, bridge, signpost, stall, bench, fence, laundry, cart, woodpile
└─ item
   ├─ furniture ── bed, table, innbench … (37 pieces)
   ├─ container ── barrel, crates, trough, footlocker …
   └─ hay
```

## Where things live
| What | Where |
|---|---|
| The kinds of thing, one file each (or a small family per file) | `src/content/things/kinds/*.ts`. A new file there is a new kind; nothing else to edit |
| What a kind can say, inheritance, the questions the world asks | `src/core/world3d/things.ts` (`ThingDef`, `Things`) |
| The registry everything reads | `THINGS` in `src/content/things/index.ts` |
| How the pieces are drawn | Shared builders: `core/world3d/props.ts`, `propsMore.ts`, `tree.ts`, `house.ts`, and `art/`. A kind *points at* a builder; it never copies one |
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
1. **A kind is not an instance.** The kind says what all wells are like; a placed well in a map is only "a well, here, turned so, seed 3" (and, once plan item B1 is built, its own small state: the bucket drawn, the gate open). Instance state stays plain data so it can be saved.
2. **Kinds point at shared code; they don't hold it.** 200 lines of geometry stay in the builders. A kind file stays short enough to read on a phone.

## The habit, for every new thing
Place it in the tree first: *what is it a kind of, and what does it inherit?* If it needs something no kind can say yet (a door that opens, a thing that burns), add that as a **property any kind can have** (like `deck` for a bridge or `blocksSight` for a wall), not as an `if` on its name. If the right family does not exist, make the family, so the next thing like it is one line.

Kind ids are shared across all kinds of thing: a room can't be called `inn` or `stall` (taken by a building and a market stall).
