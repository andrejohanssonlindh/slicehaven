# 3D world: handover (where we are, what's next)

*2026-10-28, after M0. Read this first, then [the M0 page](world3d-m0.md) for the choices and numbers, then [the brief](voxel-engine-brief.md) §7–§10 for the later milestones.*

**2026-10-29: read the [code review](review-2026-10-29.md) first.** It lists the bugs (one failing vision e2e among them) and the order of work before M5. The 2D engine is gone: `Weather` is `core/world3d/weather.ts`, the filament rules use `FCell`/`FUnit` (`core/filaments.ts`), and the ground colours are `art/ground.ts`.

## Where we are
*2026-10-28, after M1 and steps 2 and 3 of the old list.*
- **M0 passed** (the look is right, 60 fps on the phone). **M1 core is done** (below), tap-to-walk works, and the filament field exists with a heat-map overlay.
- Page: `/spike3d/` (`spike3d/index.html`, `src/spike3d/main.ts`). Debug hook: `window.spike` (`world`, `pipeline`, `governor`, `setTier(name)`, `built`, `tier`). URL flags: `?tier=low|medium|high`, `?world=224` (a bigger patch, to watch chunks stream), `?nogov` (no dynamic scaling).
- Tests: `tests/world3d.test.ts`, `world3d-m1.test.ts`, `world3d-space.test.ts`, `filaments3d.test.ts`; `e2e/spike3d.e2e.ts` (screenshots of every look, streaming, walking, heat maps into `e2e/out/`; run with `npx vitest run --config vitest.e2e.config.ts e2e/spike3d.e2e.ts`).

## What M1 added
- **Chunks** (`core/world3d/chunks.ts`): 32 m, each samples the world height function with an apron so edges match exactly. `TerrainStore` (resident chunks, `heightAt`). Renderer: one chunk built per frame, nearest first, dropped past radius + 24 m; each chunk has its own painted ground texture (`groundChunkTex`) and its own seeded grass.
- **Sprite atlas** (`core/world3d/atlas.ts`, `engine3d/atlas.ts`): people and furniture share atlases; repeating material textures do not (atlasing them needs shader wrapping; do it only if texture binds ever show up in a profile).
- **`environment(weather, cloudOffset)`** (`core/world3d/environment3d.ts`): the one read of sky, fog, wind, wetness, `cloudShadow(x, z)`. The renderer and the filament field read it. Wetness is still the renderer's eased value (target here).
- **Tiers**: `pickTier` knows weak (software) GPUs; `Governor` + `qualityAt` step quality down (fringe and grass, then shadow map and lights; never render scale) and back up with lots of room, with a notice. Budget is 30 fps by frame interval, so on a 60 Hz screen it will only step *up* again on 120 Hz displays; a dip is not undone until the Tier button resets it. Revisit if that annoys.
- **Space** (`core/world3d/space.ts`): `distance`, `near`, shapes (`circle`, rotated `box`), `NavGrid` (0.5 m), `findPath` (A* + string pulling), `followPath`. Obstacles for the spike are `spikeObstacles()` in `content/spike3d.ts`. **Rotation convention everywhere: a thing turned by `rot` maps local to world like three.js `rotation.y`** (`x' = x cos + z sin`, `z' = -x sin + z cos`). Terrain pads had it backwards until now.
- **Filaments** (`core/world3d/filaments3d.ts`): see the devlog. `FilamentField(world)`; `setConditions({env, isClouded, sunDir})`, `setMovers`, `setSources`, `readAt(x, z)`. Heat map: `engine3d/heat.ts`. Torch weight 0.4 and hearth 0.5 are placeholders (a torch only lifts its own cells to "normal"; tune with the director). The ground classes for the spike are in `spikeFilamentWorld`; a real world gets them from its own splat.

## Code map
| Where | What |
|---|---|
| `src/core/world3d/mesh.ts` | Plain mesh data (metres, UVs in metres, per-vertex AO); boxes, beams, faces |
| `src/core/world3d/house.ts` | `buildHouse(spec)` → parts (material + `cut` flag), room, door, footprint, smoke, windows |
| `src/core/world3d/terrain.ts` | `Ground3D` layout, `groundHeight`, `splatAt`, lake/road distances (the old whole-patch `buildTerrain` is kept for tests) |
| `src/core/world3d/chunks.ts` | `buildChunk`, `chunksNear`, `TerrainStore` |
| `src/core/world3d/space.ts` | distance, near, shapes, `NavGrid`, `findPath`, `followPath` |
| `src/core/world3d/filaments3d.ts` | `FilamentField`, cells, sources |
| `src/core/world3d/environment3d.ts` | `environment()` |
| `src/core/world3d/atlas.ts` | `AtlasPacker` |
| `src/core/world3d/tree.ts`, `sky.ts`, `tiers.ts` | Tree, sky/clouds (mirrored in GLSL), tiers + `Governor` |
| `src/content/spike3d.ts` | The spike layout, obstacles, filament world |
| `src/art/textures3d.ts` | Textures from the old painters at 21 texels/m; `groundChunkTex` |
| `src/engine3d/pipeline.ts` | Low-res target, integer upscale, outline from depth, palette pull |
| `src/engine3d/materials.ts` | `lit()`: Lambert + cloud shadow, wetness, wind sway, AO; `shellOf()`; `pixTexture()`; shared `WORLD` uniforms |
| `src/engine3d/sprites.ts`, `atlas.ts` | Camera-facing cards from the atlas, blob shadows |
| `src/engine3d/water.ts`, `rain.ts`, `heat.ts` | Lake shader, rain streaks, filament heat map |
| `src/engine3d/world.ts` | `SpikeWorld`: builds and runs the scene (chunks, camera snap, sun box snap, cut-away, torches, villager, hero, field) |

## Traps already hit (don't re-learn them)
- **Double-sided lit faces flip their normal on the back** → dark. Grass uses both windings front-sided; the mirrored walker is turned 180° instead of `scale.x = -1`.
- Materials with `ao: true` need a `color` attribute, or the mesh renders black (three's `BoxGeometry` has none).
- Shells 1–2 px out only sparkle; they're offset in metres (6–24 cm).
- At pitch 30° a portrait phone sees ~48 m of ground; 39° matches the old hex art.
- `renderer.info.autoReset = false`, reset per frame, or the overlay counts only the post pass.
- The cut-away keeps a shadow-only copy of the roof on layer 1 (the sun's shadow camera has layer 1 enabled).

## Decided after M0 (2026-10-28)
- **Distances are measurements (metres)**, in the engine too: no hex grid in the 3D world, fights included. (Q22)
- **Filaments (magic strength) must exist in the 3D world**, stored as a map keyed by cell (a hash map / heat map over the free world), read by position. Today `core/filaments.ts` computes them per hex (`readMap` → `Map<hexKey, HexFilaments>`); the port keeps its rules and contributions, swaps hexes for cells and distances in metres. *Director wrote "hashmat": I read it as a hash map of cells (a heat map when drawn); confirm if meant otherwise.*

## Scale (session 26b): read [world3d-scale](world3d-scale.md) before touching nav, filaments, ground or placed things
Nothing may be sized by the world. `NavGrid` is sparse, `FilamentField` is lazy, ground features are bucketed, trees/props/torches are a `PlacedIndex` by chunk (with a generator), and the renderer stands a chunk's things up as it streams in. Next for cities: stream houses the same way.

## Authoring (session 25e): read [world3d-authoring](world3d-authoring.md) before adding a map, a room or a house
Rooms are recipes of rules (`content/furnish.ts`, solver `core/world3d/roomplan.ts`); maps are `MapSpec`s compiled to ground and layout (`content/maps/`, `core/world3d/mapgen.ts`), with `problems` that tests require to be empty. `SpikeWorld` takes a compiled map; `/spike3d/?map=hamlet`. **Next, before any big map: stream placed things per chunk and instance trees and props.**

## Session 27 (vision, clock, scars)
- **Vision** is `core/world3d/vision.ts` (cone + near circle + range from Alertness, rays stopped by houses, trunks and boulders; `seenAt`, `lineOfSight` for the rules). The renderer's texture is `sightTexture` in `engine3d/materials.ts`; `SpikeWorld.alertness`, `.spec`, `.facing`, `.seen(x, z)`. New solid things that should block sight: add them to `PlacedIndex.sightNear` (or `SpikeWorld.blockers` for houses).
- **Clock**: `Weather.hour` (null in the hex games), `setHour`, `advance`; `SpikeWorld.dayMinutes` runs it. The sun/moon arc is `bodyDir` in `sky.ts`.
- **Lightning scar**: `core/world3d/scorch.ts`; `SpikeWorld.scorch` also feeds a `burnt` source to the field.
- **Filaments are now 16** (sky, heat/cold, symbols added; `Environment.hour`/`.moon`). Primal and soul aspects are not built. **Torches/fires are seen far beyond plain sight** (`visibleLights`, `SpikeWorld.refreshLights`).
- **Open:** a torch carried by a person or the hero's own light adding to their sight; book art; people other than the villager reacting to the hero's cone (`lineOfSight` is there for them).

## Session 28 (houses stream)
- `world.houses` is only the houses **standing** (their chunk is resident); `world.houseIndex` (`core/world3d/houses.ts`) holds all. Anything that must know a house that may not be standing (sight, walking, the field) asks the index by rectangle (`liteNear`, `shapesNear`, `sourcesIn`). Index numbers of `world.houses` change as houses come and go: hold the `HouseInst`, not the number.
- **Lights:** never create a `PointLight` switched on inside `update` (it counts in every shader until the pool switches it off: a stall). Create with `visible = false`; the pool in `update` switches the nearest on and dark `spares` fill the count.
- `/spike3d/?map=wilds` has Eastgate (70 houses along the road east of the hamlet): the place to look at it. Overlay line `houses standing/total furnished n`.

## Session 29 (inn, shop, stable; storeys and stairs)
- **Plans** (`House3DSpec.plan`: `cottage | inn | shop | stable`, sizes in `PLAN_SIZE`, `core/world3d/house.ts`; maps say `plan: 'inn'` in a `MapHouse`). A `HouseModel` now has `levels` (floor height, `rooms`, `blocks` that stop feet, `sight` walls that stop the eye) and `stairs` (footprint plus `path` foot, mouth, top, head with heights). `model.floorY/room/door/footprint` are still the ground floor's.
- **Rooms** are `LevelRoom`s with a `role` (`main` = the place's own kind, `guest`, `landing`, `attic`, `upstairs`, `stall`, `aisle`); `furnishHouse(model, mainSet, seed)` (`content/furnish.ts`) furnishes each by `roleSet`. `planRoom` takes `reserved`, `zones`, `clear`, `entry`. Every room's door is on its z1 (front) side, so first-floor rooms hang off a corridor along the front. Stairs run along the front wall (+x); the last flight steps off straight ahead, the first of two steps aside onto the walkway.
- **Cut-away by storey:** `HousePart.level` (a cut part fades while the viewer is on that storey or below), `HousePart.away` (the back wall also fades when the house faces away from the camera). `HouseInst.view` is the hero's storey; furniture shows only for it.
- **Walking (moved to core 2026-10-29):** `core/world3d/actors.ts`. An `Actor` is plain data (x, z, `house` id, `level`, `foot`, `stair`, `legs`); `Walking` plans legs (walk on a floor, climb a flight; upper floors have their own `NavGrid`), steps them, steers by keys, and `settle`s the house at doors. Houses are held by id and asked of the index, so a house streaming out changes nothing for the people in it. `SpikeWorld.hero` is an `Actor`, `world.moves` its `Walking`; the world keeps `walkTo(x, z, level?)`, `climb(±1)`, `tapPoint` (stairs hit areas), `stairsHint`, and **WASD/arrows** (`input`, `steer`; page keys in `main.ts`, Up/Down buttons `#stairs`). Tests: `tests/actors.test.ts`, `e2e/spike3d-storeys.e2e.ts`.
- **People:** an innkeeper walks a `Rounds` routine (`keeperRounds`, `stepRounds`) in the first house with a stair, pausing 14 s outside the door; only seen outdoors or on the hero's own storey of the same house. A new villager with a routine is an `Actor` + `Rounds` + a card.
- **Art:** `art/guest.ts` (guest bed), `art/stable.ts` (rear-view horse in five coats, hay bale, hay rack). Sprites assume a house's front faces the camera, so put houses with horses/beds on the camera side of a road (the stable is north of the hamlet road).
- **Tests:** `tests/buildings.test.ts` (storeys, stairs, furnishing, walkability door to every room on every floor). It checks a path exists, not that stairs *feel* right: try them.
- **Open:** doors do not open; stall gates are rails only; partitions block sight only on the storey you stand on; windows upstairs are not lit by room fires; WASD is not wired for NPC steering; the shop's and inn's windows ignore the room layout; attic headroom is not enforced for tall pieces; the other houses' second-floor bedrooms (the cottage has none).

## Next steps (in order, each its own commit + devlog line)
1. **M2 assets** (layout, roofs and props done, session 25: `core/world3d/layout.ts`, `props.ts`, `SPIKE_LAYOUT`; houses, trees, torches and props are placed things that feed collision, pads, filaments and the renderer). Session 26 added crates, well, fence and cart (`core/world3d/props.ts`; wheels are bare spokes, add rims) and the lightning/campfire test buttons (`SpikeWorld.strike`, `lightFire`, `douseFires`); the spike page shows a build stamp. Also done: wall variants (`walls`), tree kinds (pine, dead, young), the alignment cross (all room pieces follow the house axes), voxel flames. Instancing placed things was tried and reverted (see devlog 2026-10-29: it costs more than it saves at this scale). Left: chunk-streamed placed things for big maps, furniture that blocks feet and feeds filaments (sets per house are done: `content/rooms3d.ts`, `PlacedHouse.room`), more tree kinds (pine, dead, young). Add a new kind of thing to `Layout` first, then the renderer.
2. ~~Art: side and back views + walk cycle~~ done (session 25b, `art/folkWalk.ts`, `walkCard`). Left: walking art for animals, a run, turning in place, items that swing in profile.
3. ~~Enter the house~~ done (session 24b, now per house).
4. Then M3–M6 per the brief (lighting polish, weather polish incl. smoke and puddles, people on routes, Reedwater ported round).
5. Filaments: spells and the rules that read them; a tap-to-inspect panel; hex-free weather-to-field coupling (wet ground, fire spreading) when fire rules come over.

## Working rules (unchanged)
Edit with Write/Edit, not Bash. `npm test` and `npm run build` before every push to `main` (it deploys). Run the spike e2e after touching `src/engine3d`. New text through `t()`. Never the ruleset's brand name.
