# 3D world, M0: the spike

*2026-10-28. The first milestone of [the brief](voxel-engine-brief.md). **Open `/spike3d/` on the phone** (the "3D spike" link below) and judge the look and the frame rate before anything more is built.*

[Open the spike](https://andrejohanssonlindh.github.io/slicehaven/spike3d/)

## What is on the page
- One **thatched, timber-framed house** built by code (stone footing, posts and rails standing proud of the plaster, door frame and lintel, shuttered windows, a chimney, an overhanging roof). Tap it, or press **Inside**: the roof, gables and front wall fade out with a dither and you look into a room furnished with the existing humble art (pallet, cooking hearth with its glow, trestle table, stools, keg, sacks, shelf, hanging onions, rug).
- **Ground** with no hexes: grass, long grass and flowers, a dirt road, **stamped mud** at the door and on the road, leaf litter under the tree, a wet bank. Painted by the old ground painters, blended by distance with noisy edges.
- A **lake** with depth (pale at the bank, dark in the middle), ripples snapped to the pixel grid, foam at the shore, duckweed.
- An **oak-like tree** (trunk, limbs, lumpy leaf clumps that sway), **grass tufts** that sway with the wind.
- A **villager walking** the road (the baker) and one standing by the door (the farmer). Both are the existing folk art.
- **Two torches** (one on a post by the road, one by the door) and the **hearth** inside: real flickering lights, strongest at night. **Windows glow** at dusk and night.
- **Day, Dusk, Night** and **Clear, Cloudy, Rain, Storm** (lightning flashes in the storm). **Cloud shadows drift** across everything downwind, even on clear days (a few fair-weather clouds). Rain darkens the wettable things (ground, walls, roof).

## Buttons
| Button | What it does |
|---|---|
| Inside | Cut-away on/off (tapping the house does the same) |
| Shells 0/1/2 | The rough fringe layers (see below). Compare 0 and 2 close up on the roof eaves and the tree |
| Outline | The outline pass on/off |
| Palette 0/30/60/100% | How hard colours are pulled to the game palette |
| Tier | low / medium / high (shadow size, lights, shells, grass, zoom range) |
| Pixel ×N | Device pixels per art pixel. ×3 on a modern phone is "one art pixel = one CSS pixel" |
| Shadow N | Shadow map size |
| Lights N | How many real point lights (the nearest ones) |
| + / − | Zoom in steps. Drag to pan |

The box at top left shows **fps, CPU ms per frame, draw calls, triangles, the render size and the zoom**. Please report what it says on your phone at the default tier, by day and at night in the rain, and after a couple of minutes (heat).

## Choices I made, and why
- **Render size and snapping.** One art pixel is a whole number of device pixels (rounded from the device pixel ratio). On a 3× phone the scene renders at about 400 × 600 and is scaled ×3, which is the brief's "1/3 of the screen" (9× fewer pixels than native). The camera is snapped to whole art pixels before every frame and the shadow box to whole shadow texels, so textures and shadows do not crawl when you pan.
- **Zoom.** Discrete steps in art pixels per metre. The base step is **21 px/m**, the old art's scale (a 36 px person is 1.7 m), so textures and sprites land one texel per pixel. Phones get 14, 21 and 42; desktops go out to 7.
- **Camera.** Orthographic, yaw 24°, pitch **39°**. At 39° the ground is squashed to 0.63, the same as the old hex tiles (20 px rows on 32 px tiles), so the 3/4 view reads like the old art. At 30° the phone saw 48 m of ground up the screen and the world's edge showed.
- **Sprites in 3D.** People and furniture are cards turned to face the camera's heading and stretched by 1/cos(pitch), so every art pixel lands on exactly one screen pixel, as drawn. Flat things (rug, straw) lie on the floor stretched by 1/sin(pitch). The z-buffer sorts them against walls and roofs. They are lit like everything else (their normal faces the camera) and cast an alpha-tested shadow plus a soft blob. Walking left mirrors the front view: **the art still needs side and back views** (and a walk cycle).
- **Lighting.** three's Lambert (per-pixel, cheap) with a hemisphere light (sky above, warm ground bounce below: shadows are tinted, never black), one sun/moon with a soft PCF shadow map, and up to three point lights. Baked AO in vertex colours on every generated mesh (wall feet, under eaves, the inner leaves). The colours of day, dusk and night come from `core/world3d/sky.ts`, eased by the existing weather model.
- **Clouds.** The same noise as the core's `fbm`, bit for bit, in the shader, so the rules can ask `cloudDensity(x, z, t)` and get what the player sees.
- **Shells.** Offset in **metres** (6 and 12 cm on the thatch, 12 and 24 cm on the leaves), not in pixels: at one pixel out they only read as sparkle, never as a fringe. Alpha-tested (no blending, no sorting), sparser on the outer layer, and the pattern is locked to the world's pixel grid (1 × 2 cells, so it reads as strands) so it does not crawl when panning. They add one draw call per layer per material. Honest verdict: they roughen the eave and the canopy edge a little; most of the pixel look comes from the low-res render and the textures.
- **Outline.** From the depth buffer only: silhouettes where a neighbour is more than 0.6 m behind, creases where the surface turns sharply (normals rebuilt from depth). Drawn as the local colour darkened toward cool purple, never black. No normal buffer, so no extra pass.
- **Palette.** Nearest colour among the game's ramps (about 75 colours), with a 4 × 4 ordered dither locked to the world grid. Default 30 %: full strength looks too posterised on the light gradients.
- **Cut-away.** The cut parts fade with three's alpha hash (dithered, stable on the world). A shadow-only copy of the roof stays behind on a separate layer, so the room keeps the roof's shade: the inside is lit by the sky, the hearth and the door, as a room should be.
- **Water.** One plane with its own shader: depth from a small texture of the terrain, ripples and foam snapped to the art-pixel grid.
- **Grass.** Instanced tufts (three crossed blades), swaying in the vertex shader. Not shells.
- **Rain.** Short line streaks in a box around the view, one art pixel wide.
- **Quality tiers** live in `core/world3d/tiers.ts`: auto-picked (touch + small screen = low), changeable with the Tier button. Dynamic scaling (`adjust`) is written and tested but not switched on yet (M1).

## Numbers so far
- World build (painting the ground, building meshes): **0.4 s** on a desktop. Expect 1 to 2 s on a phone.
- Headless Chromium with **software** WebGL (a pessimistic proxy): about **37 fps**, ~45–55 draw calls, ~40 k triangles at the base zoom. Real numbers must come from your phone.
- three.js is only loaded by this page: 152 KB gzipped for the page's script; other pages are unchanged.

## Not done in M0 (later milestones)
Bloom, SSAO, smoke from the chimney, puddles and wet glints, wind-blown leaves, side/back views for people, walking the hero, collision, chunked terrain and streaming, dynamic resolution, the texture atlas. The world is a 64 m patch; its edge can be seen at the widest zoom.

## Code
`src/core/world3d/` (pure, tested: mesh, house, terrain, tree, sky, tiers), `src/content/spike3d.ts` (the layout), `src/art/textures3d.ts` (textures from the old painters), `src/engine3d/` (three.js: pipeline, materials, sprites, water, rain, world), `src/spike3d/main.ts` (the page), `tests/world3d.test.ts`, `e2e/spike3d.e2e.ts` (screenshots of every look and the cut-away).
