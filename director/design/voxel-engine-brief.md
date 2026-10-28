# Brief: the baked-voxel world engine

*Written 2026-10-28 for the engineer (Opus) who will build it. Read the whole thing once, then work milestone by milestone. This is a brief, not a spec: where it says "your call", it is.*

## 0. Why this exists
The village page ([village.md](village.md), `/village/`) showed that the current renderer cannot scale. `VillageScene.render` redraws the whole map every frame (copy ground, cast every shadow, blit every prop, run a per-pixel lighting pass): about **70 ms a frame at 38 × 31 hexes on a desktop**, with a phone slower. The director wants a **round 50 × 50 hex village**, seen from about **10 hexes around the hero**, that you **walk about in**, with **soft light**, **weather and clouds**, and **houses and people that can face any direction**.

Decisions already made by the director (do not reopen them):
1. **Sprites are baked from voxel models.** Models are voxel grids built by code, rendered once to sprites (colour + normals + depth + more), then used like the old pre-rendered games did (Diablo 2, Fallout, Age of Empires). The camera is fixed; objects get N facing directions.
2. **We write our own voxel baker.** No three.js, no Blender, no MagicaVoxel in the pipeline. A small pure TypeScript module.
3. **Soft light is a must.** It is "super important for the feel". See §6; it is the one thing that must not be compromised for speed.
4. **Weather, clouds, time of day stay**, as a separate system that drives the lighting (§7).
5. **The final art style is not decided.** This brief builds the pipeline, not the final look. But the pipeline must make a *good-looking* house early, because a spike decides whether the director commits (§9, M0).

## 1. How the pieces fit
```
 voxel models (TS generators)
        │  bake once, lazily, cached
        ▼
 SPRITES with a G-buffer: colour · normal · height · AO · emissive · material   (§3, §4)
        │
        ├── static ground + static props  → world G-buffer chunks (256 px tiles)   (§5)
        └── characters, animated things   → live sprites, depth sorted             (§5)
        │
        ▼  per frame, over the VIEWPORT only
 compose G-buffer  →  SOFT LIGHTING pass  →  weather overlays  →  screen           (§6, §7)
```
The key shift: **lighting is no longer baked per look.** The sprites carry geometry information (normals, height, AO). The world is lit every frame from the G-buffer, but only over the pixels on screen (at 10 hexes around the hero that is roughly 150 × 270 art pixels, about 40 000 pixels, which is cheap even on a CPU). Day, dusk, night, torches, clouds and lightning are all just inputs to that one pass. The expensive part (baking) happens once.

## 2. Hard constraints (from CLAUDE.md, repeated because they bite)
- **Phone first**: portrait ~400 × 720 logical canvas, touch, no hover. The director plays from a phone. Target **30 fps on a mid-range phone**, load time under about 5 s for the village. Measure on a throttled Chromium in Playwright (CPU 4× slowdown) as the proxy.
- **TypeScript strict**, Vite, Vitest in `tests/`, Playwright in `e2e/`. `core/` has **no DOM imports** and is **deterministic** (all randomness via `core/rng.ts`). The baker is pure: it must run in Node, in the browser and in the remote container.
- **Game state is plain JSON** (it goes into the save). Baked sprites are *derived* data and never saved.
- **No backwards compatibility**, no save migrations.
- **English only, via `t('key', 'English')`** for any new text.
- **Never write the ruleset's brand name** anywhere in code, UI, commits or docs.
- Pixel art stays **crisp**: integer zoom, nearest-neighbour, palette-limited albedo. *Only the light is smooth.*
- Commit and push after every meaningful step; run `npm test` and `npm run build` first. Edit with the file tools, not shell redirects.

## 3. Part A: the voxel baker (`src/voxel/`, pure)

### 3.1 Models
- `VoxelModel`: a 3-D grid (dense `Uint8/16Array` of palette indices plus sparse extras, your call) with size, origin and **tags** per region (e.g. `roof`, `wall-front`, `floor`, `interior`) so parts can be shown or hidden when baking.
- Generators are TypeScript functions like the current art (`houses.ts` and friends): seeded, parametric, with variation slots (roof, walls, shutters, size, sign). Reuse the **palettes and noise** from `src/art/` (`buildings.ts`, `houses.ts`, `grit.ts`, `noise.ts`). Materials are procedural: fbm and white noise evaluated in 3-D per voxel, so thatch, limewash, grime and moss survive.
- Prefer **real geometry for detail that matters** (timbers that stand proud of the plaster, overhanging eaves, thatch layers) over painted-on detail: that is what makes light look right.
- Provide a small **kit/builder API** (box, slab, extrude polygon, cylinder, noise displace, mirror, paint by rule) so a house is 100 lines, not 1000.

### 3.2 Projection (must match the existing ground)
The current art uses an oblique 3/4 view: **a step of depth `d` moves the screen by `(+0.5·d, −0.8·d)`, a step up by `(0, −1)`** (`OBX, OBY` in `furniture.ts`; `houseGeom` in `houses.ts`). Hex tiles are `TILE_W = 32` wide, row step 20, with a 6-px earth face (`hexTile.ts`). **One voxel is one art pixel at base scale**; a person is about 36 voxels tall, a door 42, a wall 58.
- Derive the exact projection and **prove it with a test**: a one-hex-footprint slab model must tile onto a `paintTile` hex exactly.
- Depth-buffer splatting is enough (no triangles): for each filled voxel, project, write the nearest. Fill holes between voxels so surfaces are solid.

### 3.3 What a bake outputs (the G-buffer, per sprite and frame)
| Channel | Use |
|---|---|
| **albedo** RGBA (palette-quantised) | the crisp pixel look; alpha for silhouette |
| **normal** (xyz, 8 bits each) | soft lighting, from voxel face normals **smoothed** over neighbours so the light has gradients, not 3 flat tones |
| **height** (world height of the visible surface, in voxels) | soft shadows, height-based fog, depth-aware effects |
| **depth** (distance toward the camera) | correct sorting and intersection of overlapping sprites |
| **AO** | ambient occlusion from voxel neighbours: contact shading in creases, under eaves, between planks. Cheap and a large part of why voxels look good. |
| **emissive** | windows, fire, embers, lanterns: lit independent of the sun |
| **material id** | foliage (sways), wet-able surfaces, metal/glint, water, glass, cloth. Drives rain wetness, wind shear, specular glints |

### 3.4 Directions, variants, frames
- **Buildings and props: 4 directions** (90° steps, clean). **People: 8 directions.** Anything else: your call.
- Because the view is fixed, a rotated model is re-projected from the same oblique camera. For non-90° angles **supersample 2–4× and take the dominant colour per pixel (mode), not the average**, to avoid mush. Then an **outline pass** (like `selOutline`): outline colour = darkened albedo, never pure black, and the outline pixels keep the object's normal so they light properly.
- **Variants** from the same model by tags: roof on/off, front wall cut away (the **interior cut-away** is a slice of the same model; furniture can be voxels or existing 2D sprites placed into the room, your call, but the cut-away must swap in place with the exterior at the same anchor and footprint).
- **Animation**: people are voxel parts (head, torso, arms, legs, held items) posed procedurally (the way `folk.ts` poses today); walk 6–8 frames × 8 directions plus idle. Trees and shrubs: either pre-baked sway frames or a **runtime horizontal shear by height** driven by wind (material `foliage`). Your call; justify it by measurement.
- **Caching**: key = (model id, seed, variant, direction, frame). Bake **lazily** on first use and keep a **memory budget** with eviction. People are baked on demand when they come into range. Also support **exporting a baked set to PNG** (one image per channel) so we can move to build-time baking later *without changing the engine*: the engine only consumes the sprite contract (§4).

## 4. The sprite contract
This is the seam that lets the style or the bake method change later. The engine must depend on **this and nothing else**:
```ts
interface Sprite {
  w: number; h: number;
  frames: Frame[];            // 1 for static things
  anchor: { x: number; y: number };        // feet / ground contact, in sprite px
  footprint?: Cell[];         // hex cells relative to the anchor that it blocks (see core/footprint.ts)
  directions?: 1 | 4 | 8;
  castsShadow: boolean;
  animated?: boolean;
  lights?: PointLight[];      // emissive sources: offset, radius, colour, flicker
  smoke?: { dx: number; dy: number }[];
}
interface Frame { albedo: Uint8ClampedArray; normal: Uint8ClampedArray; height: Uint8ClampedArray;
                  ao: Uint8ClampedArray; emissive: Uint8ClampedArray; material: Uint8ClampedArray }
```
The existing painted `Prop` (in `art/grit.ts`) must be **adaptable to this** (a painted sprite gets a flat normal, height from its footprint, no AO) so old art keeps working while models migrate. That is how we avoid a big-bang rewrite.

## 5. Part B: the world (`src/engine/`, and `core/` for the rules)
- **Map**: ~**50 × 50 hexes, round**: a village in the middle, fields, woods, water and the road fading out at the edge (a soft, irregular boundary rather than a clean one). About 1900 hexes. Content is data (`content/village/`); do not hard-code the map in the engine.
- **Ground**: keep the painted hex tiles for now (`art/terrain.ts`, including the new `mud`), but bake them into **G-buffer chunks** (about 256 × 256 art px) with a gentle normal bump and height 0. **Water** is not baked: it is an animated layer (the existing `paintWater` approach), only where visible.
- **Static things** (buildings, trees, fences, props): sprites with **frustum culling** via a spatial index; they are drawn per frame into the viewport G-buffer, depth sorted. Do not re-bake anything per frame.
- **Depth sorting** must handle multi-hex things (houses are 4–5 hexes wide and 3 rows deep) so a hero can walk **behind** a house and in front of a fence. Use foot row plus the depth channel; test it.
- **Camera**: integer zoom, follows the hero with easing, free pan by drag, pinch zoom. **Default zoom shows about 10 hexes around the hero.** The existing `engine/camera.ts` is a starting point.
- **Walking**: the hero walks hex to hex using the existing rules (`core/battle.ts` `walkReach`, `core/footprint.ts`, the scene engine's `interact`/`walkTo`). Sprite footprints become blocking cells automatically. Keep rules in `core/`, rendering in `engine/`. People can wander on simple routines; nothing is hooked into skills yet.
- **Entering buildings**: stepping through a door swaps the building for its cut-away (fade the roof), and the lighting inside comes from the room's lights.

## 6. Part C: soft lighting (the non-negotiable)
Runs every frame over the **viewport only**, reading the G-buffer. Behind a small interface so it can move to a WebGL2 fragment shader if CPU is too slow: **measure first, decide with numbers**. (The project dropped Phaser for its own canvas engine, but WebGL for this one pass is allowed if it earns its place.)

Required, and what "soft" means here:
1. **Hemisphere ambient.** Sky colour from above, ground-bounce colour from below, blended by the surface normal. Shadows are never black: they are tinted by the sky.
2. **Sun (or moon) with a continuous direction, colour and intensity from time of day**, shading by `N·L` over the smoothed normals. Dawn and dusk are low, long, warm light; night is a cool dim moon.
3. **Soft cast shadows** from the height channel, with **soft edges** (penumbra widens with distance from the caster). Direction and length follow the sun. Shadows cast by things outside the viewport must still appear: keep a margin of at least the longest shadow, or use precomputed sun-angle shadow maps blended over time (your call).
4. **Ambient occlusion** from the baked AO channel, plus contact shadows where things meet the ground.
5. **Point lights** (torches, hearth glow through windows, lanterns, the forge, fires): smooth radial falloff, **normal-aware** (a wall facing the lantern lights up, the far side doesn't), coloured, flickering, with a little **bloom** around bright emissives. Windows glow from inside at dusk and night; light spills out of doors.
6. **Smooth light over crisp pixels.** Albedo stays palette-quantised; the light values are **continuous**, no stepped dithering by default. (The old pass used 10 dithered steps: provide that as an optional "retro" mode only.)
7. **Cloud shadows**: soft, slowly drifting patches over the ground, from the same cloud field the rules read (`weather.cloudShadowAt`/`shadowAt`), so what the player sees matches what the world rules say about sun and shade.
8. **Interior lighting** that reads as warm, enclosed and different from outside.
9. Fog and haze (§7) are part of the same pass: distance-from-camera-focus and height-based, tinted by the sky.

Acceptance: side-by-side screenshots (Day, Dusk, Night, Overcast, Storm, torch-lit alley) judged by the director on a phone; plus a frame-time budget (§9).

## 7. Part D: weather, clouds and time of day (separate system, drives §6)
Keep the existing model and make it the **single source of environmental truth**: `engine/weather.ts` (`Sky`: clear, cloudy, rain, storm; `TimeOfDay`; wind force/direction; smoothed cloud cover, rain, flash; "everything eases toward its target") and `core/environment.ts` (what the rules read). Do **not** fold weather into the renderer. Define one interface:
```ts
environment() → { sunDir, sunColor, sunIntensity, skyTop, skyHorizon, groundBounce,
                  cloudCover, cloudShadow(x,y), fog, wetness, wind: {x,y,force},
                  flash, rain, tod }
```
and the lighting pass is a pure function of that plus the G-buffer.
- **Time of day becomes continuous** (not just day/dusk/night): a day clock that moves sun direction, colours and window/lantern lighting, and can be set or advanced by the game.
- **Clouds**: drifting soft shadows (above), cloud cover dims and desaturates the sun, optional high-altitude cloud layer visible when zoomed out.
- **Rain**: particle streaks and splashes (not baked), `wetness` darkens and saturates albedo on wettable materials and adds specular glints; puddles on `mud` ground; sound hooks later.
- **Wind**: drives foliage sway (shear by height on `foliage` material), washing-line laundry, smoke direction, falling leaves.
- **Lightning**: flash as a strong, brief directional plus ambient pulse with hard-ish shadows.
- **Fog/haze** in the morning and in rain.
- The rules side keeps reading the same environment (fire spread, the Wind scale, sight in rain, cloud cover for sun-dependent effects). Do not break `tests/world.test.ts`.

## 8. What exists that you should reuse
`src/art/` (all procedural art, palettes, `grit.ts` helpers, `terrain.ts`, `hexTile.ts`, `look.ts` for the current lighting pass you will replace, `villageScene.ts`), `src/content/village/` (the first full village, with every house spec, room, and person), `src/engine/{camera,weather,lighting,effects,renderer,scene}.ts`, `src/core/{battle,footprint,hex,environment,rng,noise}.ts`, the Playwright harness in `e2e/harness.ts`, the village page in `src/village/main.ts` (debug hooks `window.village`, `snapshot`). Baseline to beat: **70 ms a frame at 38 × 31**.

## 9. Milestones (each ends with a commit, tests, and a note in `director/devlog.md`)
- **M0: the spike. A decision gate for the director.** One voxel-generated house in the baker with the full G-buffer, lit by a throwaway version of the soft lighting, shown **side by side with the current painted house** in the day, dusk and night looks, from four directions, with the roof cut away. Plus one person walking in 8 directions. Stop and let the director judge the *look* before building more. If it loses, we fall back to baking the existing painted sprites through the same contract (the engine work in M2 onward is unchanged).
- **M1: the baker** (§3) and the **sprite contract** (§4): projection test against the hex tile, determinism test, direction/variant/cache tests, PNG export, adapter for painted `Prop`s.
- **M2: the world** (§5): round 50 × 50 map, chunked G-buffer ground, culled sorted sprites, camera at ~10 hexes. **Budget: ≥30 fps in 4× throttled Chromium at 400 × 720; first paint of the village under 5 s; resident memory under about 150 MB.** Report the numbers.
- **M3: soft lighting** (§6) with Day/Dusk/Night and torches, behind the swappable interface. Report CPU versus WebGL2 numbers and which you chose.
- **M4: weather and time of day** (§7) wired in, including continuous time and all skies, with rules tests still green.
- **M5: walking** and entering buildings; people wandering on routines.
- **M6: port Reedwater** to the round 50 × 50 map (a ring of streets round the plaza, the old core by the lake, the bypass curving outside, 25–30 houses if the director confirms; open question Q21), with the nine furnished interiors.

## 10. Testing and quality bars
- Vitest: baker determinism, projection alignment, normal/AO sanity (a flat top has normal up), sprite cache eviction, depth-sort cases (hero behind/in front of a 3-row house), footprint blocking, environment interpolation.
- Playwright: a scripted walk across the village with the frame-time recorded, screenshots for each sky and time of day, a console-error check. The e2e harness uses `?seed=N` for repeatability.
- Never push a broken build to `main`. Pushing to `main` deploys to Pages, which is how the director tests on the phone.

## 11. Left to you, with reasons wanted
CPU or WebGL2 for the lighting; shadow technique; supersampling factor and downsampling rule; sway by shear or pre-baked; furniture as voxels or 2D inset; atlas layout and eviction policy; chunk size; whether to bake at load or at build (design for both). Write down each choice in `director/design/` with the numbers that justified it.

## 12. Risks to watch
Voxel output looking blocky or noisy at 1 voxel per pixel (mitigate with supersample, smoothed normals, AO, outline); mixed painted and voxel styles during migration (mitigate by migrating buildings first and checking them next to the painted people); soft shadows from off-screen casters; memory on phones; bake hitches when something new enters range (mitigate by baking a ring ahead of the camera, in small time slices).
