# What people do: schedules, behaviours, places and events

*2026-10-31. The director's ask: different kinds of behaviour rule, applied to different people as needed: a plaza full of people at a certain time, a scripted beheading that people attend, a guard passing along the outside of a camp. Flexible enough to build NPC and enemy behaviour from. Built; this page is how it works and how to add to it.*

## The idea
- A person has a **schedule**: a list of lines, each "when this holds, do that". The **first line that holds** is what they do now. When another line starts to hold, they switch.
- What can be *done* is a library of **behaviours**, one file each in `src/content/behaviours/does/`. What can be *asked* is a library of **conditions**, in `src/content/behaviours/when/`. A new one is a new file; maps only name them.
- A map names **places** (a spot, an area, a path, a stretch of road, a loop round an area) and **events** (daily hours, or started by a script). Schedules refer to them by name, never by coordinates.
- Everyone walks on the real walking grid (`Walking` in `core/world3d/actors.ts`), so people go round walls, through doors and up stairs like the hero.
- A person's **mind** is plain JSON (where they are, the walk in hand, the line they follow, that behaviour's own state, their own seeded generator), so it can go into a save. Tested: a mind through JSON and back carries on the same.

```json
"places": {
  "green": { "area": { "circle": [0, 24, 7] } },
  "speaker": { "at": [0, 24] },
  "round the green": { "around": { "circle": [0, 24, 7] }, "margin": 3 }
},
"events": [{ "id": "gathering", "hours": [12, 13] }],
"people": [
  { "id": "guard", "is": ["human", "job-guard"], "does": [
    { "when": { "hours": [6, 22] }, "do": "patrol", "path": "round the green" },
    { "do": "stay", "at": "speaker" } ] }
],
"rules": [
  { "rule": "crowd", "id": "towns", "count": 10, "kinds": [["human", "job-farmer"], ["dwarf", "job-miller"]],
    "homes": ["home1", "home2"], "does": [
      { "when": { "event": "gathering" }, "do": "attend", "at": "speaker", "ring": 3 },
      { "when": { "hours": [8, 19] }, "do": "wander", "in": "green" },
      { "do": "home" } ] }
]
```

## What there is
| Behaviour | Does | Takes |
|---|---|---|
| `stay` | goes to a place and stands, facing another if asked | `at`, `face` |
| `beat` | walks a path there and back | `path`, `wait`, `speed` |
| `patrol` | walks a path round and round (a guard round a camp: a place made with `around`) | `path`, `wait`, `speed` |
| `wander` | mills about in an area: walks to a spot, stands a while, again | `in`, `wait` ([min, max] s), `speed` |
| `attend` | gathers round a place facing it, twelve to a ring, by their number in the crowd | `at`, `ring` (metres) |
| `home` | goes into their house (or a named one) and stays in its back room | `house` |
| `rounds` | goes the rounds of a house: each storey, up, down, out to the door | `house` (`home` = their own) |

| Condition | Holds | Value |
|---|---|---|
| `hours` | between two hours (`[20, 6]` runs past midnight) | `[from, to]` |
| `event` | while an event runs | its id |
| `notEvent` | while it does not | its id |

Places (`MapSpec.places`): `{ "at": [x, z] }`, `{ "area": … }` (circle, rect, ring), `{ "path": [[x, z], …], "loop": true }`, `{ "road": 0, "from": m, "to": m }`, `{ "around": area, "margin": m }`.

Events (`MapSpec.events`): `{ "id": "market", "hours": [10, 16] }` runs every day; without `hours` it runs only when started. In code (scripts, tests, the debug hook): `world.startEvent("hanging")`, `world.endEvent(...)`, `world.clearEvent(...)` (back to the map's hours). `world.minds` lists what everyone is doing.

The **`crowd`** map rule makes `count` people from `kinds` and `homes` taken in turn, all on one schedule, named `<id><n>`, numbered so `attend` spreads them out.

## Checked by the compiler
A schedule that names a behaviour, condition, place or house that is not there, a key a behaviour does not take, a missing key it needs (`stay` without `at`), a bad value for a condition (`hours: [8]`): each is a map problem, so `tests/maps.test.ts` fails on it.

## How to add
- **A behaviour**: a file in `content/behaviours/does/` exporting a `Behaviour` (`core/world3d/behave.ts`): `id`, `about`, `keys` (and which are `places` / `houses`, which it `needs`), `start` (its state, plain data) and `step` (move the actor with `ctx.walking`, return how to draw them). Helpers: `walkOn`, `idle`, `spotIn`, `placeCentre`, `insideHouse`. Use `ctx.rng`, never `Math.random`.
- **A condition**: an entry in a file in `content/behaviours/when/` (`id`, `about`, `check`, `holds(value, clock, mind)`). Weather, an alarm, "the hero is near" would go here.
- **A kind of place**: a branch in `placeOf` in `core/world3d/mapgen.ts` and the `PlaceSpec` type.

## The hamlet, as a demo (`/spike3d/?map=hamlet`, set the time in the admin ring)
- 08:00–19:00: ten townsfolk (humans, a dwarf, an elf, a missla) wander the green south of the road.
- 12:00–13:00: the "gathering": they form a ring round the speaker's spot, facing in.
- Night: each goes home (they live in the south-side cottages).
- A guard patrols a loop round the green from 06:00 to 22:00, then stands at its middle.
- The villager walks the road; the innkeeper goes the rounds of the inn.

## Not done yet (natural next steps)
- **Reacting to the hero**: a condition like `sees: "hero"` or an `alarm` event, and behaviours `chase`, `flee`, `talk`. The structure takes them as new files; enemies need these.
- **Doing things at places**: sitting on a bench, working at a counter (a behaviour that uses a thing's kind).
- **Days**: the clock has hours only; events can't yet say "day 3".
- People far from both the view and the hero (140 m) wait, so a big city does not run everyone. They don't yet catch up on time missed.
- Looks: dwarves, elves, tirak and misslor are rough stand-ins in the human art.
