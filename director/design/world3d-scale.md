# World3D at scale: how a map can be kilometres across

*2026-10-29, session 26. The aim from the director: large cities and large outdoor areas, several orders of magnitude larger than the 64 m spike. This page says what is done, what is measured, and what is next.*

## The rule

**Nothing is sized by the world. Everything is paid for by what is looked at.** A structure that allocates "one entry per cell of the map" (an array, a grid) cannot be used. Use a sparse map keyed by cell or chunk, filled on demand, or an index that answers "what is near here".

## What is done (all with tests; `tests/scale.test.ts`, `terrain-index`, `furnish-nav`)

| Part | Before | Now |
|---|---|---|
| Walking grid (`NavGrid`, `core/world3d/space.ts`) | one array of 0.5 m cells for the whole map | 0.25 m cells in blocks of 32 × 32, each worked out the first time a cell in it is asked about, from a `ShapeSource` (`ShapeIndex` in 8 m buckets). A* uses maps, stays in a box round the two ends. `invalidate(rect)` when obstacles change |
| Filament field (`filaments3d.ts`) | two arrays over the whole map, and a global "who reaches whom" pass | cells read on demand: the ground and indoors of a cell are asked and cached when needed, sources are found by cell (a list, or a `sourcesIn(rect)` provider), and what reaches a cell is gathered from the cells round it |
| Ground features (`terrain.ts`) | every road, pad, mud patch and tree-shade circle checked for every sample | 32 m buckets (`groundIndex`); equal to the brute-force values (`tests/terrain-index.test.ts`) |
| Placed things (`placed.ts`) | trees, props and torches built into the scene at start | `PlacedIndex`: authored things bucketed by chunk, plus an optional **generator** that makes a chunk's trees, props and torches from its address and the map seed (same whatever order chunks are visited). The renderer stands a chunk's things up when it streams in and takes them down when it leaves; tree geometry is shared by kind and seed |
| Wilderness (`WildSpec` in `mapgen.ts`) | scatter: N random spots, kept apart by comparing with all others | `wild`: woods and clearings from slow noise, one thing per jittered cell, kept off roads, water, houses and the hero. Costs nothing until visited |
| The map `wilds` | | 8192 m across, two long roads, a lake, a hamlet, woods made as you go. `/spike3d/?map=wilds`, Walk ×3 |
| Chunk selection | looped over every chunk of the map each frame | only the window round the view |

## Measured (software WebGL, so slow, but the shape is what matters)

- `wilds` compiles in well under a second (tests allow 4 s) and nothing is generated until looked at.
- A 300 m walk through the woods touches a few hundred nav blocks and about 100 chunks of generated content, out of 65 000 chunks.
- Thickest woods on screen: about 200 draw calls and 210k triangles (the densest spot found); open country about 70 calls.

## What is not done (the honest list)

1. ~~**Houses are still built whole at start.**~~ **Done (2026-10-30):** `HouseIndex`, houses stream with their chunk; see the devlog. Remaining: entries are never evicted, and compile still builds each model once. The old text follows.
    A city of a few hundred houses will be slow to start and heavy: each house is a model, furniture sprites and a light. Next: stream houses by chunk the same way (build a house when its chunk is near, drop it when far), with a light `HouseMeta` (footprint, door, room) kept for walking and the field. `world.houses` becomes "the loaded ones". The `PlacedIndex` is the place for it.
2. **Authored scatter is O(n²)** (each new thing is compared with every earlier one). Fine for the hamlet, wrong for thousands: use `wild`, or an index.
3. **One lake per map**, and ground made from the height function and a few features. A river, many lakes or a coast need `Ground3D` to take features per chunk.
4. **Draw calls in thick woods.** Per-tree meshes are culled one by one, but 200 calls on a phone is a lot. Instancing was tried on the small maps and lost (see the devlog); at this density, instance per chunk with few looks per kind and re-test.
5. **Generated chunks are not forgotten** (their contents are kept once made). Fine for a play session; a very long walk would want an LRU.
6. **Ground texture painting** per chunk samples the splat per texel; with generated shade it asks the tree index each time. It shows as a small hitch when a chunk streams in; worth a profile on a phone.
7. **Weather, clouds and the sky** are global and need nothing; float precision is fine out to ten kilometres or so, and the camera snap is relative.

## How to add a large map

Write a map file (`content/maps/<name>.json`) with `size` in the thousands, roads as polylines, the authored places (houses, props, streets) where you want them and a `wild: { trees: 22, mix: [...], shrubs, boulders, grain }` for everything else. It is found by itself; `tests/maps.test.ts` checks that it compiles clean. Use `area` on the `wild` (a `circle`, `rect` or `ring`) to confine it to a district.
