# 3D world: handover (where we are, what's next)

*2026-10-28, after M0. Read this first, then [the M0 page](world3d-m0.md) for the choices and numbers, then [the brief](voxel-engine-brief.md) §7–§10 for the later milestones.*

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

## Next steps (in order, each its own commit + devlog line)
1. **M2 assets** (layout done, session 25: `core/world3d/layout.ts`, `SPIKE_LAYOUT`; houses, trees and torches are placed things that feed collision, pads, filaments and the renderer). Left: roof textures for shingle, tile and sod (all roofs paint as thatch now; shells only suit thatch), wall variants, shrubs and props (each needs a collision shape in `layoutObstacles` and, where it matters, a filament source), furniture sets per house (all rooms hold the humble set), more tree kinds. Add a new kind of thing to `Layout` first, then the renderer.
2. **Art**: side and back views + walk cycle for folk (they only have a front view; the hero and villager are mirrored).
3. ~~Enter the house~~ done (session 24b, now per house).
4. Then M3–M6 per the brief (lighting polish, weather polish incl. smoke and puddles, people on routes, Reedwater ported round).
5. Filaments: spells and the rules that read them; a tap-to-inspect panel; hex-free weather-to-field coupling (wet ground, fire spreading) when fire rules come over.

## Working rules (unchanged)
Edit with Write/Edit, not Bash. `npm test` and `npm run build` before every push to `main` (it deploys). Run the spike e2e after touching `src/engine3d`. New text through `t()`. Never the ruleset's brand name.
