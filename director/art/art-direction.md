# Art direction (proposal)

## Target look
**SNES-era pixel art, 2D with depth.** Think *Final Fantasy VI*, *Secret of Mana*, *Ogre Battle*, *Tactics Ogre*: chunky pixels, rich but limited palettes, drop shadows, tiles with a visible side face so the map reads like a little diorama.

## Choices
- **Hexes drawn as raised tiles** (top face + darker side face). Already in the prototype as flat colours.
- **Sprites ~24–32 px tall**, rendered with nearest-neighbour scaling (crisp pixels, no blur).
- **Palette:** dusty and warm for Asharien: red-ochre steppe, bone, rust, sun-bleached cloth; cold teal and violet for undead/magic. One shared master palette (~32 colours) so everything belongs together.
- **Lighting:** light from top-left everywhere; 1px dark outlines on characters, not on tiles.
- **UI:** framed panels with bevelled borders (like old JRPG menus), parchment for story text.
- **Dice:** chunky pixel dice with icon faces. Rolling = a short tumble animation and a "clack".

## How I'll make the art
I can't draw in an image editor, so I'll make art in code: pixel sprites defined as text grids + palette, turned into textures in the game. This keeps everything in git and easy to tweak ("make the skeleton's eyes glow"). Later we can swap in hand-made or commissioned sprite sheets without changing game code.

I'll post art studies here (as images) for you to approve before going wide.

## Overworld
A painted-looking pixel map of the region (river, steppe, forest edge, towns). Available scenarios are glowing markers; travel is a dotted path between them. Locked ones are greyed or hidden.
