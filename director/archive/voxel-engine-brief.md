# Brief: the live-3D pixel world

*Written 2026-10-28 for the engineer (Opus) who will build it; **rewritten the same day** after the director chose live 3D over baked voxel sprites (the file keeps its old name so links hold). Read it once, then work milestone by milestone. It is a brief, not a spec: where it says "your call", it is.*

## 0. Why this exists
The village page ([village.md](../archive/village-reedwater.md), `/village/`, now removed) showed that the 2D hex renderer cannot scale: `VillageScene.render` redraws the whole map every frame and costs about **70 ms a frame at 38 × 31 hexes on a desktop**, worse on a phone. The director wants a **round village, about 75 to 100 m across (the "50 × 50 hex" idea), that you walk about in, with soft light, weather and clouds, and a world that is not made of hexes.**

Decisions already made by the director (do not reopen them):
1. **The world is real-time 3D**, rendered live, not baked. Use **three.js** (WebGL2). We are not writing a 3D engine.
2. **The pixel look comes from the pipeline**, not from the models: render to a **low-resolution target and scale it up with nearest-neighbour**, pixel-sized texture detail, an outline pass, a limited palette, and **1 to 2 "shell" layers** (§4) for the rough, sparse-pixel fringe.
3. **The world is not hex.** Ground is a continuous terrain (heightmap mesh, painted ground), buildings and props sit at free positions and angles. A hex grid may stay as an invisible logic layer if the rules need one (§8).
4. **People are sprites** ("sprite-faked"): billboards in the 3D world, using the existing folk art. Everything else (terrain, buildings, trees, props, water) is 3D.
5. **Soft light is a must.** "Super important for the feel."
6. **Weather, clouds and time of day stay**, as a separate system driving the lighting (§6).
7. **Mobile sees less, desktop sees more.** The phone is zoomed in (small view distance) or zooms out only a little; a computer sees much more. Quality tiers (§7) make that explicit rather than hoped for.
8. The **final art style is still not decided.** This brief builds the pipeline; M0 decides whether the look works.

*(The earlier plan, baking voxel models to sprites with our own baker, is the fallback if M0 fails: see §11.)*

## 1. Hard constraints (from CLAUDE.md, repeated because they bite)
- **Phone first**: portrait about 400 × 720 logical px, touch, no hover. The director plays on a phone. **Target 30 fps minimum, 60 if possible, on a mid-range phone at the default tier**, and no thermal collapse over a 5-minute soak. First paint of the village under about 5 s.
- **TypeScript strict**, Vite, Vitest in `tests/`, Playwright in `e2e/`. **`core/` has no DOM and is deterministic** (randomness through `core/rng.ts`). World generation (terrain, house meshes, layouts) must be **seeded and pure**, producing plain data that the renderer turns into GPU objects.
- **Game state is plain JSON** (it goes into the save). Meshes, textures and GPU objects are derived and never saved.
- **No backwards compatibility.** No save migrations.
- **English only through `t('key', 'English')`** for new text. **Never write the ruleset's brand name** anywhere.
- **Dependencies**: three.js is allowed *for the 3D world pages only*, code-split so the other pages (sandbox, character creator, skills) do not pay for it. Say what else you want to add and why (the director has asked to be asked).
- Commit and push after every meaningful step; run `npm test` and `npm run build` first. Edit with the file tools, not shell redirects. Pushing to `main` deploys to Pages, which is how the director tests on the phone.

## 2. Look: the pixel pipeline
This is what makes it feel like our game and not a generic 3D scene. Do it first, in M0.
1. **Low-resolution render target.** Render the scene to a target of about **1/3 of the screen** (so one rendered pixel is about 3 device pixels; tune per tier), then draw it to the screen with **nearest-neighbour at an integer scale**. This is the largest single cost saver on a phone (1/3 resolution is about 9× fewer pixels) and the main source of the pixel look.
2. **Orthographic camera, fixed pitch and yaw**, chosen to read like the current 3/4 view (houses seen from the front and a little above, side wall visible). **Pan in whole-pixel steps** (snap the camera to the target's pixel grid, and snap shadow-map texels too) to stop texture swimming and shadow shimmer. Zoom in **discrete steps**. Free rotation is out of scope at first; 90° steps may come later.
3. **Texture detail sized to the render pixel**: about 20 to 21 texels per metre, which matches the old art (a person is 36 px ≈ 1.7 m). Nearest filtering, no mip blur at the base zoom. **Textures are drawn by our existing painters** (`src/art/`: thatch, limewash, timber, stone, grime, moss, grass, mud) onto canvases and uploaded; add a small texture-atlas manager so memory stays low (512 or 1024 atlases on phones).
4. **Outline pass** from depth and normal edges, drawn in a **darkened version of the local albedo**, never pure black.
5. **Palette limiting**: a colour LUT in post (cheap), strength adjustable, so light stays smooth but albedo stays in a palette.
6. **Pixel shimmer budget**: it is allowed to move when the sun moves; it must not crawl when the camera pans.

## 3. The world and its assets (no hexes)
- **Units**: 1 world unit = 1 metre. Person 1.7 m, door about 2 m, a village house about 5 to 6 m wide. Round world, **about 75 to 100 m across**; village in the middle, fields, woods, water and the road fading out at an irregular soft edge.
- **Terrain**: a heightmap mesh in **chunks** (for example 32 m), gently undulating, with ground painted by a **splat map** (grass, tall grass, flowers, forest floor, dirt road, **stamped mud**, shore). Roads, lanes and the plaza are painted into the splat, not tiles. **No hex seams anywhere.** Reuse the ground painters in `art/terrain.ts` for the textures.
- **Water**: a lake plane with a shader (flowing ripples, depth tint, shoreline foam, duckweed, reflections of the sky if cheap), plus pond props (lily pads, reeds) as billboards or small meshes. Include a **river** option.
- **Buildings**: procedural meshes built by seeded TS generators, parametric with the existing slots (roof: thatch, shingle, tile, sod; walls: white, ochre, rose, sage, brick, tarred; shutters; size; sign; seed). Proper geometry where it matters (timbers standing proud of the plaster, eaves overhanging, a stone footing, a chimney), textured from our painters. **Real interiors**: a house is a shell with a room inside; the **cut-away is real** (the roof and the front wall dissolve with a dithered fade or a clip plane when the hero is inside), furnished with props. First pass: furniture as billboards of the existing sprites (`art/furniture.ts`, `humble.ts`, `shopItems.ts`); real meshes later.
- **Trees, shrubs, grass, reeds, props**: simple generated meshes or crossed/billboard cards with **instancing** (grass and small plants by the thousand). Wind sway in the vertex shader.
- **Walkable world**: obstacles come from each placed object's collision footprint (a polygon or a few circles/boxes), not from hex cells.
- **Reedwater content**: the existing data (`src/content/village/`: 15 houses with owners, 9 furnished rooms, 24 outside villagers, shop art) is the *design* to port, not a layout to copy. Re-lay it out in continuous space as a round village: an old core by the lake, the main street and plaza, the bypass road curving round the outside, 25 to 30 houses if the director confirms (open question Q21).

## 4. Shell texturing (the voxel-feel layer)
The director's idea: after the base model, draw **1 or at most 2 extra layers** slightly larger than the model (about **2.5 % and 5 %**), with a mostly transparent texture of **sparse pixels**, to give the model a rough, pixel-fringed, crumbly feel instead of a smooth CG edge.
- Implement with a vertex shader that **extrudes along the normal** by a small amount (in render-pixel units so it stays one pixel thick at any zoom, your call), a fragment shader that **alpha-tests** (`discard`, no blending, so no sorting and less overdraw), and a **screen-pixel-aligned noise** so it does not crawl. Tint slightly lighter or darker than the base.
- Apply **per material**, not to everything: thatch, foliage, grass, moss, rough stone, fur, hay. Not to glass, water or planks unless it looks good.
- **Be honest about what it does.** It adds fringe and roughness; the pixel look mainly comes from §2. M0 must show it on and off, so the director can see whether it earns its overdraw. It must be **switchable by quality tier** and must disappear with distance or low tier.
- Watch for shells self-intersecting on eaves and concave parts, and overdraw on phones.

## 5. People and small things: sprites in a 3D world
- People (and animals, later) are **camera-facing billboards** with alpha test, drawn with the existing folk art (`art/folk.ts`, `content/village/folk.ts`). The z-buffer sorts them against 3D things, so a hero walks behind a house with no special code.
- **Facing**: the current art only shows people from the front. Needed from the art side: a **side view** (left and right, mirrored if the art is symmetric) and a **back view**, with a walk cycle for each (4-way, or 8 if affordable). Treat this as an art task alongside the engine; in the interim, mirror left and right with a front view and say so.
- **Lighting sprites**: give each sprite a **fake normal** (facing the camera, rounded a little) so sun, torches and ambient colour affect them and they sit in the scene; they **cast a shadow** (a soft blob shadow plus, on high tier, an alpha-tested quad in the shadow map) and **receive cloud shadow**. They must not look pasted on in dusk and night.
- **Selection and tapping**: ray-pick against billboards and the 3D scene.

## 6. Soft light, weather, clouds and time of day
**Soft light** is required, in all tiers (cheaper means fewer features, not hard light):
1. **Hemisphere ambient**: sky colour from above, ground-bounce from below; shadows are tinted by the sky, never black.
2. **Sun or moon**: direction, colour and intensity from a **continuous time of day**; long warm light at dusk and dawn, cool dim moonlight at night.
3. **Soft cast shadows**: one directional shadow map around the camera focus (1024 to 2048 on phones, more on desktop), soft-filtered (PCF or similar), texel-snapped, with a view-distance fade.
4. **Ambient occlusion**: baked AO in vertex colours or textures from the generators (contact darkening under eaves, in creases, at wall feet) on every tier; **SSAO** optional on the high tier.
5. **Point lights** (torches, lanterns, hearth glow, the forge): smooth falloff, normal-aware, coloured, flickering. Limit the real lights to the **nearest handful** (6 to 8 on phones); the rest as **emissive glow** and light-spill sprites at windows and doors. Windows glow from inside at dusk and night.
6. **Bloom** at half resolution, subtle.
7. **Smooth light over crisp pixels**: lighting is computed at the low render resolution, so gradients are smooth while albedo stays palette-limited. Offer an optional stepped/dithered "retro" ramp.
8. **Interior lighting** that reads warm and enclosed.
9. **Fog and haze**, height and distance based, tinted by the sky (mornings, rain).

**Weather and time of day stay a separate system** that the renderer reads. Keep the existing model and make it the single source of environmental truth: `src/engine/weather.ts` (`Sky`: clear, cloudy, rain, storm; wind force and direction; smoothed cloud cover, rain, flash; everything eases toward its target) and `src/core/environment.ts` (what the rules read). Define one interface:
```ts
environment() → { sunDir, sunColor, sunIntensity, skyTop, skyHorizon, groundBounce,
                  cloudCover, cloudShadow(x, z), fog, wetness, wind: {x, z, force}, flash, rain, tod }
```
- **Clouds**: soft drifting shadows on the ground and objects (a moving noise texture multiplied into the sun term), **from the same cloud field the rules read**, so what the player sees matches what the world rules say about sun and shade. Cover dims and desaturates the sun. An optional cloud layer when zoomed out on desktop.
- **Rain**: instanced streaks and splashes (not baked); `wetness` darkens and saturates wettable materials, adds specular glints, puddles on mud.
- **Wind**: drives foliage and grass sway, shells, laundry, smoke direction, falling leaves.
- **Lightning**: a brief strong directional plus ambient pulse.
- Do not break the rules tests (`tests/world.test.ts`, fire and wind), and keep the sandbox's 2D weather working until it is retired.

## 7. Quality tiers: mobile sees less
Phones are zoomed in and see a short distance; computers see much more. Make this a first-class system, not an afterthought.
| | Phone default ("low") | Tablet / mid ("medium") | Desktop ("high") |
|---|---|---|---|
| Render scale | 1/3 of screen | 1/3 to 1/2 | 1/2, optionally 1/1 with the pixel look |
| Visible radius (start guess) | about 20 to 25 m, max zoom out about 40 m | about 40 to 60 m | up to 100+ m, the whole village |
| Shadow map | 1024, short range | 2048 | 4096 or cascades |
| Real point lights | 4 to 6 | 8 | 16 |
| Shells | off at distance, 1 layer | 1 to 2 | 2 |
| SSAO, bloom, rain detail | off, subtle bloom | bloom | all |
| Grass density, instancing | low | medium | high |
- **Auto-detect a default** (screen size, DPR, GPU hints, a quick benchmark on load), with a **manual setting** the player can change, and **dynamic scaling** (if the frame time creeps up, drop the render scale or shadow quality a step; never drop silently below the minimum without a visible setting).
- **World streaming**: only chunks within the visible radius plus a margin are drawn or kept resident; merge static geometry per chunk, instance repeated things, frustum-cull the rest. Keep draw calls low (a few hundred at most on a phone).
- Phone zoom range is discrete and short on purpose; do not try to show the whole village on a phone.

## 8. Rules, movement and the grid (a design question, not yours to decide alone)
The rules were designed around hexes in the sandbox and the gate scene (`core/battle.ts`, `core/hex.ts`, `core/footprint.ts`). The new world has none. **Do not rewrite the rules.** For this project:
- Walking is **continuous**: tap or click to walk, path-find on a **navigation grid** (about 0.5 m cells, invisible) or a navmesh built from the collision footprints. Obstacles come from footprints. Keep it in `core/` (pure, tested), with the renderer only drawing the result.
- Expose `distance(a, b)` in metres and `near(a, b, r)` so scene code can ask "is the hero next to the cart" without hexes. The skill and talk systems (`core/scene.ts`) only ever needed "next to a thing"; make that work for free positions.
- The 2D hex sandbox and the gate scene keep working untouched until the director decides what replaces them.
- **Open design question for the director** (will be asked as Q22): how do fights and ranges work in a hex-less world (zones, metres, a grid shown only in combat)? It does not block this work.

## 9. Milestones (each ends with a commit, tests, and a note in `director/devlog.md`)
- **M0: the spike. A decision gate for the director, tested on the phone.** A page (for example `/spike3d/`) with: one procedurally built house with a **working interior cut-away** and the existing humble furniture, a patch of terrain painted with grass and **stamped mud** and a dirt road, a tree, a lake plane, one **sprite villager** walking, a sun with soft shadows, two torches, **day/dusk/night and rain** buttons, **cloud shadows drifting**, and the full pixel pipeline (low-res target, outline, palette, snapped camera). Toggles for **shells on/off**, render scale, shadow quality, light count, a **quality tier selector**, and an **on-screen overlay** with fps, frame ms, draw calls and triangle count. Report phone and desktop numbers. **The director judges the look and the frame rate on the phone before anything else is built.**
- **M1: the core**: renderer, camera and snapping, tiers and auto-detect, chunked terrain with splat painting, texture-atlas manager, the environment interface wired to the existing weather model.
- **M2: the asset pipeline**: house generator (all slots, 4 to 5 widths), roof and wall kits, trees, shrubs, grass instancing, props, water, from the existing painters; with tests (seeded determinism, footprint and collision output, bounds).
- **M3: lighting and shadows** to the §6 standard on all three tiers, with screenshots of Day, Dusk, Night, Overcast, Storm and a torch-lit lane judged by the director on a phone.
- **M4: weather and time of day** fully wired: continuous clock, clouds, rain, wind, lightning, fog, wetness; rules tests green.
- **M5: walking and the world**: continuous movement and navigation, entering buildings (cut-away), people wandering on simple routes, sprite facing, streaming and culling to a measured budget.
- **M6: Reedwater** ported to the round, hex-less world with its nine furnished interiors and its people.
**Budget at M5**: phone default tier ≥ 30 fps (aim 60), desktop high ≥ 60, five-minute soak without throttling collapse, memory within a phone's limits (aim under about 250 MB), load under about 5 s. Report the numbers, on the director's phone and in 4×-throttled Chromium as a proxy.

## 10. Testing and quality
- **Vitest**: seeded generators (determinism, bounds, no overlaps), navigation and collision, environment interpolation, tier selection logic, texture-atlas packing, the unit conversions.
- **Playwright**: a scripted walk across the village recording frame times, screenshots for each sky and time of day, a console-error check, with `?seed=N` for repeatability. Note that headless Chromium renders WebGL in software, so its frame times are a **pessimistic proxy only**; real numbers come from the phone.
- Never push a broken build to `main`.

## 11. Fallback
If M0's look or frame rate fails on the phone, the fallback is **baking sprites from voxel models** with a small pure-TypeScript voxel baker, lit live in 2D from a normal/height/AO G-buffer (design notes are in git history, commit e615e33). The 3D asset generators and the environment interface carry over. Do not start the fallback unless the director says so after M0.

## 12. Left to you, with reasons wanted
Render scale and the snapping scheme; shell technique and thickness; shadow technique and range; how to batch and instance; whether grass is cards or shells; the navigation representation; how to light sprites; texture-atlas layout; what to put on a loading screen. Write each choice into `director/design/` with the numbers that justified it.

## 13. Risks
Pixel shimmer and shadow shimmer when panning (snapping); shells overdraw and self-intersection; GPU differences between phones and iOS WebGL context loss; texture memory; shadow and light costs on phones; mismatch between lit 3D and billboards at dusk and night; heat and battery over long sessions; bundle size (code-split three.js); the look drifting from the existing art (judge early, in M0, not late).
