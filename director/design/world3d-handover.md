# 3D world: handover (where we are, what's next)

*2026-10-28, after M0. Read this first, then [the M0 page](world3d-m0.md) for the choices and numbers, then [the brief](voxel-engine-brief.md) §7–§10 for the later milestones.*

## Where we are
- **M0 passed.** The director: the look is "nearly exactly what I want"; **never under 60 fps on the phone**. The 3D world (three.js, pixel pipeline) is the way forward; the voxel-sprite fallback is off the table.
- Page: `/spike3d/` (`spike3d/index.html`, `src/spike3d/main.ts`). Debug hook: `window.spike` (`world`, `pipeline`, `setTier(name)`, `built`, `tier`).
- Tests: `tests/world3d.test.ts` (unit, 21), `e2e/spike3d.e2e.ts` (screenshots of every look + cut-away into `e2e/out/`; run with `npx vitest run --config vitest.e2e.config.ts e2e/spike3d.e2e.ts`).

## Code map
| Where | What |
|---|---|
| `src/core/world3d/mesh.ts` | Plain mesh data (metres, UVs in metres, per-vertex AO); boxes, beams, faces |
| `src/core/world3d/house.ts` | `buildHouse(spec)` → parts (material + `cut` flag), room, door, footprint, smoke, windows |
| `src/core/world3d/terrain.ts` | `Ground3D` layout, `groundHeight`, `splatAt`, `buildTerrain`, `heightAt`, lake/road distances |
| `src/core/world3d/tree.ts` | `buildTree(seed)` → wood mesh + leaf clumps |
| `src/core/world3d/sky.ts` | `skyLight(tod, cloud, rain, flash)`; `cloudDensity(x,z,t,…)` (mirrored bit-for-bit in GLSL) |
| `src/core/world3d/tiers.ts` | Tiers, `pickTier`, `pixelFactor`, `viewSpan`, `adjust` (dynamic scaling, not wired yet) |
| `src/content/spike3d.ts` | The spike layout (house, ground, tree, torches, walk route) |
| `src/art/textures3d.ts` | Textures from the old painters at 21 texels/m |
| `src/engine3d/pipeline.ts` | Low-res target, integer upscale, outline from depth, palette pull |
| `src/engine3d/materials.ts` | `lit()`: Lambert + cloud shadow, wetness, wind sway, AO; `shellOf()`; `pixTexture()`; shared `WORLD` uniforms; `NOISE_GLSL` |
| `src/engine3d/sprites.ts` | Camera-facing cards (stretched 1/cos pitch), flat cards, blob shadows |
| `src/engine3d/water.ts`, `rain.ts` | Lake shader, rain streaks |
| `src/engine3d/world.ts` | `SpikeWorld`: builds and runs the scene (camera snap, sun box snap, cut-away, torches, villager) |

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
1. **M1 core**: chunked terrain (32 m chunks, streamed by view radius), texture-atlas manager, tier auto-detect + wire `adjust` with a visible notice, the `environment()` interface from the brief §6 fed by `engine/weather.ts`.
2. **Measurements in core**: `core/world3d/space.ts` with `distance(a, b)` and `near(a, b, r)` in metres, collision footprints (rects/circles), a ~0.5 m navigation grid and path-finding (pure, tested). Tap-to-walk the hero.
3. **Filament field**: `core/world3d/filaments3d.ts`: a cell map (e.g. 1 m or 2 m cells, keyed `"i,j"`) built from the same sources as `core/filaments.ts` (water, trees, stone, fire, the dead, weather, time, clouds via `cloudDensity`), radii in metres; `readAt(x, z)`. A toggleable heat-map overlay on the ground per aspect. Keep the old hex version working for the sandbox.
4. **M2 assets**: house variants (all roof/wall slots, 4–5 widths), more trees and shrubs, props.
5. **Art**: side and back views + walk cycle for folk (they only have a front view).
6. Then M3–M6 per the brief (lighting polish, weather polish incl. smoke and puddles, walking/people, Reedwater ported round).

## Working rules (unchanged)
Edit with Write/Edit, not Bash. `npm test` and `npm run build` before every push to `main` (it deploys). Run the spike e2e after touching `src/engine3d`. New text through `t()`. Never the ruleset's brand name.
