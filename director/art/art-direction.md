# Art direction

**The final graphical style is not set.** What's below is the current look, made for the first tests. Some of it will survive, not all. The style gets decided when the game design starts.

**See it live: [Art Lab](https://andrejohanssonlindh.github.io/slicehaven/artlab/)**

## What the director has said so far
- Aim for **"16-bit, but pretty"**: animated water, swaying trees, shadows, still visibly pixelated. (The first 8-bit prototype looked ugly.)
- **Bigger hexes** with real ground on them. Hex size is good, zoom exists.
- **Mobs stand upright on the hexes**, a slight isometric feel.
- Obstacles have a **reddish border**. Fine.
- Terrain tiles are "near perfect". A kind forest can look like this; other forest types are the same tiles with other palettes.
- **Mobs are 5/10**: blobby, they merge together, the wolf looks like a cat, the rat like a ball. To do: clearer silhouettes, more contrast between body parts, distinct heads and limbs.

## Round 2 direction (2026-10-28)
Grass, flowers and the campfire are kept. Everything else moves toward **peak 90s 2D with later-era effects on top**: less clean, more imperfection (crooked, patched, stained, mossy), soft selective outlines instead of one flat dark line, trees that are not round, houses that are not pretty, people with grown-up proportions (Secret of Mana's readable shading, western realism). Effects layered over the pixels: cast shadows, coloured light, bloom, grade, dappled sun, smoke. **See it: Director's Room, "Village art" tab.** Code: `grit.ts`, `rough.ts`, `buildings.ts`, `folk.ts`, `look.ts`, `villageScene.ts`.

## The current look (round 1, still used by the game)
| | |
|---|---|
| Hex shape | Pointy-top, 32 px wide, 2:1 pixel slopes, slightly squashed vertically, so the board reads as tilted toward you. 6 px earth side face for depth. |
| Scale | Drawn at native resolution and scaled by a whole number (crisp pixels). On a phone, one art pixel ≈ 4 screen pixels. |
| Light | Always from the top-left. Shadows fall bottom-right. |
| Palette | One master palette (`src/art/palette.ts`). Every colour comes from a ramp (dark → light). |
| Animation | 8 frames/second. Water flows along the river, trees and grass sway 1 px, mobs "breathe". |
| Obstacles | Red double-line hex border (dark + bright red). |

## The art tools (`src/art/`)
The art is made **by code**, so it lives in git and can be changed by describing what you want.
- `pix.ts`: pixel buffer, text-grid sprites, outlines, ordered dithering.
- `noise.ts`: seeded noise. Textures use world coordinates, so tiles join seamlessly.
- `terrain.ts`: ground types, rivers, ponds, bevels, red obstacle borders, animated water.
- `props.ts`: procedural oaks, pines, thickets, boulders, grass tufts, mushrooms.
- `mobs.ts`: hand-placed pixel characters with idle animation.
- `village.ts`, `sceneArt.ts`: palisade, gate, cart, campfire, cottages, villagers.
- `icons.ts`: toolbar icons and tiny pixel text.
- `mapScene.ts`: puts it together into an animated diorama (used by the Art Lab).

Strengths: terrain, vegetation, water: anything that can be generated. Weakest area: **characters**. They're placed pixel by pixel from text and will need iteration, or later a hand-drawn sprite sheet we drop in.
