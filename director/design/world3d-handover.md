# 3D world: handover (the engine as it stands)

*Rewritten 2026-11-02 as a current-state page. The session-by-session notes it replaced are in the [archive](../archive/world3d-handover-sessions.md), the original brief too ([brief](../archive/voxel-engine-brief.md): why the look is built this way). What to build next is [the plan](../todo.md), not this page.*

## Read with
- [How the world is put together](world-structure.md): kinds of thing, before adding anything to the world.
- [Authoring maps and rooms](world3d-authoring.md): before adding a map, a rule or a room.
- [Scale](world3d-scale.md): before touching walking, filaments, ground or placed things. **Nothing is sized by the world**; everything is paid for by what is looked at.
- [What people do](behaviours.md), [kinds of person](people-kinds.md).

## The page
`/spike3d/` (`spike3d/index.html`, `src/spike3d/main.ts`). `?map=hamlet|wilds|spike` (also a picker in the top bar). Debug hook: `window.spike` (`world`, `pipeline`, `governor`, `setTier(name)`, `built`, `tier`). URL flags: `?tier=low|medium|high`, `?world=N` (map size), `?nogov` (no dynamic quality).

## The look (how a frame is made)
- **Low-resolution render**, scaled up nearest-neighbour at a whole number; an **outline** from depth, in a darker tone of the local colour; a **palette pull** in post (`engine3d/pipeline.ts`).
- **Orthographic camera, fixed pitch, free yaw** (`world.yaw`, `world.turn(rad)`, `world.turnInput` held by the ⟲ ⟳ buttons, Q/E and a two-finger twist), snapped to whole render pixels at any yaw (no texture crawl once it stops). Yaw 0 looks from +z; the start is `VIEW_YAW`.
- **Textures painted by code** (`art/textures3d.ts`, about 21 texels a metre, nearest filtering).
- **Shells**: one or two layers pushed out along the normal (6–24 cm), with sparse alpha-tested pixels for a rough edge (`shellOf()` in `engine3d/materials.ts`), per material.
- **People are 3D bodies** (`engine3d/body.ts`, one skinned mesh each; a person on screen is a `Figure`), **furniture is 3D models** (`content/things/models/`); see [models](models.md). Nothing in the world is a flat card any more (2026-11-02); the stable's stalls are empty until horses come as kinds of creature (C3).
- **Light**: `lit()` (Lambert, cloud shadow, wetness, wind sway, AO); the sun and moon from the hour; torches and fires are a pool of point lights.

## Code map
| Where | What |
|---|---|
| `core/world3d/things.ts` | `ThingDef`, `Things`: what a kind of thing can say; the registry is `THINGS` (`content/things/`) |
| `core/world3d/mapgen.ts` | `compileMap`: a map file to ground, layout, houses, people, places, and `problems` |
| `core/world3d/actors.ts` | `Actor` (plain data) and `Walking`: paths, stairs, doors, key steering |
| `core/world3d/behave.ts` | Schedules of behaviours ([what people do](behaviours.md)) |
| `core/world3d/house.ts`, `houses.ts`, `roomplan.ts` | `buildHouse(spec, plan)`: storeys, rooms, stairs, door, smoke; `HouseIndex` (all houses, streamed); the room solver |
| `core/world3d/terrain.ts`, `chunks.ts` | Ground (height, splat, lake and roads), 32 m chunks, `TerrainStore` |
| `core/world3d/placed.ts`, `layout.ts`, `props.ts`, `propsMore.ts`, `tree.ts` | Placed things by chunk (`PlacedIndex`), and the shared mesh builders kinds point at |
| `core/world3d/space.ts` | Distance, shapes, sparse `NavGrid` (0.5 m), `findPath` |
| `core/world3d/actions.ts` | The action frame ([actions](actions.md)): `offers`, `perform`; data in `content/actions/`. The world: `tapped(ndc, slack)` (a thing, the hero, or nothing; things are tagged with `userData.thing`), `act`, `offersFor`, `fireOf(house)`, `sitting`; the page: `src/spike3d/actsheet.ts` |
| `core/world3d/vision.ts` | Sight: a cone, a near circle and a range from Alertness, stopped by houses, trunks, boulders; `lineOfSight` for the rules. Everyone else's sight and hearing: `core/world3d/perceive.ts` (B5) |
| `core/world3d/filaments3d.ts` | The filament field, lazy, by cell |
| `core/world3d/weather.ts`, `environment3d.ts`, `sky.ts` | Weather and the clock (`Weather.hour`, `advance`), one read of sky, fog, wind, wetness, cloud shadow |
| `core/world3d/tiers.ts` | Quality tiers and the `Governor` that steps quality down and up |
| `engine3d/world.ts` | `SpikeWorld`: builds and runs the scene (chunks, camera, cut-away, lights, people's figures, furniture models, field). It draws; it should not decide rules |
| `engine3d/pipeline.ts`, `materials.ts`, `shadow.ts`, `water.ts`, `rain.ts`, `heat.ts`, `smoke.ts` | The frame, materials, blob shadows, lake, rain, heat map, smoke |
| `content/maps/*.json`, `content/maps/rules/` | Maps and map rules ([authoring](world3d-authoring.md)) |

## Conventions and traps (don't re-learn them)
- **Rotation:** a thing turned by `rot` maps local to world like three.js `rotation.y` (`x' = x cos + z sin`, `z' = -x sin + z cos`), everywhere.
- **Houses:** `world.houses` is only the houses standing (their chunk is near); `world.houseIndex` holds all. The API takes and returns house map ids, never a place in the standing list.
- **Lights:** never create a `PointLight` switched on inside `update` (a stall); create with `visible = false` and let the pool switch it on.
- **Faces:** double-sided lit faces flip their normal on the back and go dark; turn the mesh instead of a negative scale. Materials with `ao: true` need a `color` attribute or render black.
- **Shells** 1–2 px out only sparkle; they are offset in metres.
- **Cut-away:** a house's cut parts fade while the hero is on that storey or below. Outer parts carry a `side` (front/back/left/right) and fade on their storey when that side faces the camera (`facesCamera` in `core/world3d/view.ts`, past ~63°), so it works from any angle. Interior partitions fade on their storey always.
- `renderer.info.autoReset = false`, reset per frame.
- **Tests:** unit tests check that a path exists, not that it looks right. Check visual work in Chrome. The browser tests (`npm run test:e2e`, about 8 minutes) run against a live dev server: don't edit files the 3D page imports while they run; read the summary line (`N passed`), not the exit code.

## Known gaps in the engine (not plan items yet)
The inn's two flights of stairs meet with no landing between them (the director, 2026-11-02; minor, the bigger buildings get redesigned, C6); doors don't open; stall gates are rails only; partitions block sight only on your own storey; upstairs windows aren't lit by room fires; scatter is O(n²); one lake per map; generated chunks are never forgotten.
