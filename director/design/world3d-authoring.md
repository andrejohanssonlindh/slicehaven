# 3D world: authoring maps and rooms (how to add things without tuning code)

*2026-10-28. Decision from the director: there will be a lot of maps, some large, so a map or a room must be cheap to make. Nothing is placed by hand-tuned coordinates unless it has to be.*

## The plan, and where this sits
The brief's milestones ([voxel-engine-brief](voxel-engine-brief.md) §9): M2 asset pipeline, M3 lighting, M4 weather, M5 walking and the world (streaming, culling), M6 Reedwater ported. The 3D handover lists M2's jobs. M2's assets are in (layout, roofs, props, furniture, people who walk). This page is the part M6 needs most: **authoring**, so that porting Reedwater and every map after it is data, not tuning.

Two systems, both pure (`core/`), tested, deterministic:

1. **Rooms are furnished by rules** (`core/world3d/roomplan.ts`, content in `content/furnish.ts`).
2. **Maps are written as intent and compiled** (`core/world3d/mapgen.ts`, content in `content/maps/`).

## Adding a room kind
Write a recipe in `RECIPES` (`content/furnish.ts`): a list of lines in priority order, each a piece and a rule. No coordinates.

```ts
bakery: [
  { piece: 'oven', rule: corner('backRight'), fire: true },
  { piece: 'trough', rule: corner('backLeft') },
  { piece: 'shelf', variant: 'loaves', rule: back(0.35), lift: 22 },
  { piece: 'counter', variant: 'bread', rule: center(0, 0.6) },
  { piece: 'stool', n: 2, rule: { at: 'around', of: 'table' } },
  { piece: 'basket', rule: free },
],
```
- **Rules**: `back(x)` and `front(x)` along a wall, `side('left'|'right', z)`, `corner(...)`, `center(dx, dz)`, `around` another piece (by id, optionally a `side`), `free` (anywhere there is room). A piece whose rule fails falls back to `free`; the fire never does.
- **Kinds** (in the catalog `PIECES`): `floor` stands and blocks feet, `flat` lies on the floor (rug, straw), `hung` is on the back wall at a `lift`.
- **Sizes come from the sprite**, so a new piece needs only an entry (`floor(() => makeX())`) and, if the sprite is drawn much wider than the thing, a `maxW`.
- **The solver** (`planRoom`) keeps the door clear, never overlaps two pieces, and refuses any spot that would leave the door unable to reach 92 % of the free floor (with a wider walker than the real one, because the nav grid is coarse). Low-priority pieces drop out of a room that is too small; the first four lines and the fire never do (tested). The footprints go straight into the nav grid, so furniture blocks feet.
- Tests (`tests/furnish.test.ts`) run every recipe in four house sizes. A new recipe is covered by adding its name to `RECIPES`.

## Adding a map
Write a `MapSpec` (`content/maps/<name>.ts`) and add it to `MAPS` in `content/maps/index.ts`. Look at `hamlet.ts`: houses by intent, scatter by region, torches by line.

```ts
houses: [
  { id: 'inn', room: 'inn', size: 'large', roof: 'tile', at: { road: 0, t: 0.5, side: 'north' } },
  { id: 'cottage', size: 'small', roof: 'sod', at: { x: 12, z: -30, rot: 0.1 } },   // or an exact spot
],
scatter: [{ kind: 'tree', count: 70, area: { ring: [0, 0, 40, 64] } }],
torchLines: [{ road: 0, every: 14, side: 'south' }],
doorMud: true,
hero: { house: 'inn' },
```
- **Houses** go along a road (`road` index, `t` 0 to 1, a compass `side`, optional `gap`) and face it, or at an exact `x, z, rot`. Sizes `small`/`medium`/`large` (or `{width, depth}`), roofs thatch/shingle/tile/sod, a `room` kind.
- **Scatter** (trees, shrubs, boulders) fills an `area` (`circle`, `rect`, `ring`, `all`) with seeded spots that keep clear of houses, roads, water and each other. It reports `only room for N of M` instead of silently dropping.
- **Compile** (`compileMap`) returns the ground, the layout, the hero start, the villager's beat and **`problems`**: a house in the lake or on a road or touching another, a thing off the map, a door the hero cannot reach, a house id used twice. `tests/maps.test.ts` requires **no problems for every map in `MAPS`**, so a new map is checked the moment it is listed.
- **See it**: `/spike3d/?map=hamlet`. Problems also go to the browser console. `?world=N` overrides the size.
- Deterministic: same spec, same world (the seed is in the spec).

## What is not done (next, in this order)
1. **Streaming for large maps.** The world builds every house, tree and prop at start. That is fine at 140 m (about 170 draw calls, 11 houses, 90 trees); a 500 m map needs per-chunk loading of placed things (the ground already streams) and instancing for trees and props. Do this before the first big map.
2. **A way for the director to see and nudge a map on the phone**: a map overview page (top-down, tap a house to read its id and room). Authoring stays in text; this is for looking.
3. **More rules**: rooms with two floors or a loft, doors between rooms, a `fence` and `path` along a line, hills in the ground (the spec has only a lake and roads).
4. **Reedwater** as a `MapSpec` (the village content: `content/village/reedwater.ts`, its nine rooms are already recipes).
5. Furniture is not yet a filament source; people in rooms are not placed (the village's are left out).
