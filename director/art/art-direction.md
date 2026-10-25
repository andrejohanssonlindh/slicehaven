# Art direction

**See it live: [Art Lab](https://andrejohanssonlindh.github.io/slicehaven/artlab/)**

## Brief from the director (2026-10-25)
- The first prototype looked 8-bit and ugly. Aim for **"16-bit, but pretty"**: animated water, swaying trees, shadows, still visibly pixelated.
- **Bigger hexes**, with real ground on them.
- **Mobs stand upright on the hexes**, giving a slight isometric feel (not lying flat).
- Obstacles have a **reddish border**.
- Dice: D6 is the base. Three levels: (1) a pseudo-3D cube showing 3 sides + name, (2) the die unfolded as a lying cross, (3) tap a side for details.
- Build **tools that make the art**, once we've settled on a style.

## Test #1 — forest (2026-10-25)
What's in the Art Lab:
1. **Forest scene**: an animated 8×9 hex diorama with a river, pond, path, tall grass, oaks, pines, boulders, thickets, the shepherd, wolves, a giant rat and a skeleton.
2. **Tile sheet**: grass, flowers, forest floor, path, tall grass, mushrooms, 3 river pieces, pond, 4 obstacle types.
3. **Mobs** on their hexes.
4. **Dice**: 6 example dice (including a D5) with all three levels working.

### Technical choices
| | |
|---|---|
| Hex shape | Pointy-top, 32 px wide, 2:1 pixel slopes, slightly squashed vertically, so the board reads as tilted toward you. 6 px earth side face for depth. |
| Scale | Drawn at native resolution and scaled by a whole number (crisp pixels). On a phone, one art pixel ≈ 4 screen pixels. |
| Light | Always from the top-left. Shadows fall bottom-right. |
| Palette | One master palette (`src/art/palette.ts`). Every colour comes from a ramp (dark → light). |
| Animation | 8 frames/second. Water flows along the river, trees and grass sway 1 px, mobs "breathe". |
| Obstacles | Red double-line hex border (dark + bright red). |
| Dice faces | 28×28 px, bone-white with a coloured bevelled frame by type (red attack, blue shield, green heal, tan move, teal jump…), icon + big number. Riders (bleed, push, lose…) show as small coloured pips top-left. |

## The art tools (`src/art/`)
The art is made **by code**, so it lives in git and can be changed by describing what you want.
- `pix.ts` — pixel buffer, text-grid sprites, outlines, ordered dithering.
- `noise.ts` — seeded noise. Textures use world coordinates, so tiles join seamlessly.
- `terrain.ts` — ground types, rivers (any entry/exit edge), ponds, bevels, red obstacle borders, animated water.
- `props.ts` — procedural oaks, pines, thickets, boulders, grass tufts, mushrooms (each with 8 sway frames).
- `mobs.ts` — hand-placed pixel characters with idle animation.
- `icons.ts` / `diceArt.ts` — face icons, pixel digits, faces, the 3D cube.
- `mapScene.ts` — puts it all together into an animated diorama.

Strengths: terrain, vegetation, water, dice: anything that can be generated. Weakest area: **characters**. They're placed pixel by pixel from text, and they'll need iteration, or later a hand-drawn sprite sheet we drop in.

## Director's feedback on test #1 (2026-10-25)
- **Direction: yes.** Tiles are near perfect.
- **Hex size: good**, but we need zoom. *(Done in the engine sandbox: pinch, wheel, +/− buttons.)*
- **Colours:** a kind forest can look like this. Other forest types = the same tiles with other palettes (old-school recolouring).
- **Red border:** fine.
- **Mobs: 5/10.** Too blobby, they merge together and aren't distinct. The wolf looks like a cat, the rat like a ball. → *To do: a mob art pass with clearer silhouettes, more contrast between body parts, distinct heads/limbs, maybe a slightly bigger sprite size.*
- **Dice: yes**, readable.

## Original feedback questions (Q6)
- Overall: is this the right direction?
- Hex size: right, or bigger still?
- Saturation / colours: too bright or too dark? (Eon is grim; this forest is quite friendly.)
- The red obstacle border: too loud?
- Mobs: size relative to the hex? Should the hero be bigger?
- Dice faces: icon + number side by side — readable?
