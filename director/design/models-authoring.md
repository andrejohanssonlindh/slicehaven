# How to make a furniture model

*2026-11-02. The how-to for making a piece of furniture as a small 3D model (plan item A2; the painted cards are gone since 2026-11-02, so a new piece is a line in `furniture.ts` and a model file). Written so another model (Sonnet) can do most of them; Claude reviews each batch before it is pushed. Read [low-poly models](models.md) for why. The four examples (`table`, `keg`, `bed`, `shelf`) are the pattern: read them first.*

## The whole job, for one piece
1. **Make one file:** `src/content/things/models/<id>.ts`, where `<id>` is the kind's id in `src/content/things/kinds/furniture.ts` (`stool`, `counter`, `forge`...). The file's default export is a `FurnitureModel`. Add the kind's line in `furniture.ts` (its look and how it sits); the room solver uses the model's footprint.
2. **Check it:** `npx tsc --noEmit -p .` and `npx vitest run tests/furniture-models.test.ts tests/furnish.test.ts`. The first holds every model to the rules below and says what is wrong; the second makes sure every kind of room can still fit everything in.
3. **Look at it:** `npm run test:e2e -- models` takes two pictures of every model, from the front-left and the back-right: `e2e/out/model-<id>-a.png` and `-b.png`. Open them. In a browser: `/slicehaven/models/?only=<id>` (dev server: `npm run dev`).
4. Nothing floating, nothing through the floor, the front where people use it, real size, the look line's things shown.

## The space a model lives in
- **Metres.** The floor is y = 0. The piece is centred on x and z.
- **Its front is +z** (the side people use: a bed's foot, a counter's serving side, a shelf's open face). **Its back is against the wall at z = -d/2.** The room solver turns it to whichever wall it stands against.
- **`w`** is its footprint along its front, **`d`** from back to front. They are what the solver places and what blocks feet, so they must be honest: the model stays inside `w` × `d` (a few centimetres over is allowed for a lip or a fold). Too big and rooms stop fitting it (`tests/furnish.test.ts` will say so); too small and people walk through it.
- **Hung pieces** (`mount: 'hung'` in `furniture.ts`: shelves, pegs, hooks, herbs, racks): y = 0 is the lowest point of the model, and the recipe line's `lift` puts that point up the wall. The back is flat at z = -d/2; keep `d` small (0.1–0.3).
- **Flat pieces** (rugs, straw, litter): one or two centimetres high, lying on the floor.

## Real sizes (rough guide)
Table top 0.75 m; bench and stool seat 0.45 m; counter 0.95 m; a bed 0.9 × 1.85 m, its tick 0.45 m up; a door 2 m; a keg 0.55 m tall; a barrel 0.9 m. A person is 1.6–1.75 m (a dwarf 1.1–1.25 m, a missla 1.2 m).

## The kit (`src/core/world3d/modelkit.ts`)
```ts
import { ModelBuilder, addBox, addCylinder, addTaper, addLegs, addBeam, addOrientedBox, vary } from '../../../core/world3d/modelkit';
import type { FurnitureModel } from '../../../core/world3d/things';

const stool: FurnitureModel = {
  w: 0.4, d: 0.4,
  draw(seed, variant) {
    const m = new ModelBuilder();
    const wood = m.mesh('plank');            // a mesh per material (and colour)
    addCylinder(wood, 0, 0, 0.4, 0.45, 0.18, 0.18, 8);   // the seat
    // ... legs, etc.
    return m.done();
  },
};
export default stool;
```
- **`m.mesh(material, colour?)`** gives the mesh to add shapes to. Materials: `plank` (sawn wood, the default for furniture), `bark` (rough logs, stumps), `stone`, `hay`, `cloth` (flat colour with a weave: give a colour), `iron` (dark metal; a colour for brass or copper), `water`.
- **`addBox(mesh, [x0,y0,z0], [x1,y1,z1], { aoBottom })`**: a box between two corners. Most furniture is boxes. `aoBottom: 0.6` darkens the bottom edge where it meets the floor or a joint.
- **`addCylinder(mesh, cx, cz, y0, y1, r0, r1, sides, { top, bottom })`**: something round standing up (kegs, pots, posts, stools). 8 sides for anything bigger than a hand, 6 or 4 for small things.
- **`addTaper(mesh, cx, cz, y0, y1, w0, d0, w1, d1, ao0, ao1)`**: a box narrowing from bottom to top (full widths). Soft things (a tick, a sack, a pillow, a loaf) and anything that slopes.
- **`addLegs(mesh, w, d, h, t, inset)`**: four square legs under a top.
- **`addBeam(mesh, a, b, width, face)`**: a square beam from point a to point b (a slanted leg, a brace). **`addOrientedBox(mesh, centre, axisX, axisY, axisZ, halfSizes)`**: a box turned any way.
- **`vary(seed, salt)`**: a number 0..1 from the seed. Use it for variety (a blanket's colour, how many jars, a little jitter), never `Math.random()`. The same seed must give the same model.

## Colours
sRGB hex numbers, muted and earthy: wood is the `plank` texture (no colour needed). Cloth and goods:
undyed `0xc0b494`, straw/tick `0xc8b484`, linen `0xe0d8c4`, madder red `0x8a3a2e`, woad blue `0x3c5070`, moss `0x55663a`, rust `0x9a5a2a`, mustard `0x9a7a26`, clay pots `0x9a6a48`, dark clay `0x7a5a3c`, bread `0xa8743a`, green glass `0x2e4a32`, brown glass `0x4a3424`, coal `0x2a2622`, embers `0xd0642a`, iron (default) or brass `0xa8843c`. Let colours say something (the forge's glow, the loom's cloth).

## Budget and style
- **50–300 triangles** (a box is 12); the test stops at 450. Pixel size is about 4 cm a pixel, so anything under 3 cm disappears: leave it out.
- **Chunky, readable shapes** over detail: a few boxes that say "anvil" from any side beat many small ones.
- **What the look line says, the model shows:** its things-on-top and what it is for.
- **Fires** (`hearth`, `oven`, `forge`): model the stones or the bricks and the coals (cloth in an ember colour); the light is the room's, not the model's.

## What is not yours
- **Horses** wait for kinds of creature (an animal body like a person's).
- **New kinds, new materials, or changes to the kit or the solver:** ask (or leave a note in the batch's report).
- **Never** change `furniture.ts`, `furnish.ts`, the tests or the room recipes to make a model fit. If it doesn't fit, the model's size is wrong, or say so.

## Tips from the first batches
- **A new file the tests don't see** (only the old models are tested): vitest's cache. Delete `node_modules/.vite/vitest` and run again.

## The pieces
All done but the horse (2026-11-02): `table`, `keg`, `bed`, `shelf` by Claude as examples, the rest by Sonnet in these batches:

| Batch | Kinds |
|---|---|
| 1 | `stool`, `pallet`, `footlocker`, `basket`, `sacks`, `broom` |
| 2 | `hearth`, `oven`, `kindling`, `rug`, `straw`, `litter` |
| 3 | `longTable`, `innbench`, `aleKegs`, `counter` (variants: see `CounterKind` in `art/shopItems.ts`), `cratestack`, `pegs` |
| 4 | `forge`, `anvil`, `quenchtub`, `workbench`, `coalbin`, `toolrack` |
| 5 | `loom`, `kneadtrough`, `mortarBench`, `herbs`, `hanging`, `hooks` |
| 6 | `fishRack`, `fishTubs`, `nets`, `hungNet`, `haybale`, `hayRack` |
