# Low-poly models (plan item A2): the design, for the director's OK

*2026-11-02. A sketch, not built yet. It replaces the flat cards (people, about 45 kinds of furniture, horses) with small 3D models that look right from every side and can move. Answer in [Q31](../questions.md).*

## What changes for you
- People, furniture and horses look right from any angle when you turn the view.
- People **move their bodies**: legs and arms swing as they walk; later sit, work, fight, fall.
- The look stays **pixel art**: low resolution, outlines, code-painted textures, and shells for a rough pixel edge, the same as houses and trees today.

## The three parts

### 1. People: one body, dressed from the look we already have (Claude builds this)
- **One body builder** for everyone (`core/world3d/body.ts`): about 12 low-poly parts (hips, chest, head, upper and lower arms and legs, hands, feet) on a simple skeleton. Its size comes from `build` (lean, average, stout, child).
- **Dressed from the existing look** (`Look` in `core/persons.ts`: garment, top, legs, boots, apron, vest, cloak, hair, beard, hat, things held). No person is authored by hand: every kind of person you have made gets a body automatically, as they get a card today.
- **Shells for clothes**, as you said: one shell over the body in the clothes' colour, a second overlapping one with sparse pixels for the ragged edge, strongest on the limbs.
- **Movement is data**: a pose is a set of joint angles; a walk is a few poses in a loop. Rules stay in `core/` (deterministic, tested); the engine only shows the pose.

### 2. Furniture and horses: each kind draws its own model (the pattern we already have)
Barrels, wells, carts and fences are **already 3D**: their kind has a `draw` that returns meshes, built from a few helpers (`addBox`, `addBeam`, `addOrientedBox`). Furniture just moves to the same pattern: **one kind, one `draw`, in its own file**. No new kind of thing, and the room solver and footprints don't change.

### 3. A model gallery page (`/models/`)
Every kind on a slowly turning stand, in the real pixel pipeline, next to its old card. You judge them on the phone, and whoever builds a model checks it there (with a screenshot from the browser tests) before calling it done.

## Who does what (your question about Sonnet)
**Yes, I think that works, for the furniture.** It's the right kind of job: many small files that all follow one pattern, each checkable against a picture.
- **Claude (me):** the body and its movement, the gallery page, the shell look, and **3–4 example pieces** that cover the shapes (a table: boxes and legs; a barrel or keg: round; a bed: frame plus soft cloth; a shelf with things on it). Plus a short **how-to page** (`models-authoring.md`): the helpers, sizes in metres, how many faces, colours from the palette, the shells, the checklist, how to screenshot it in the gallery.
- **Sonnet:** the other ~40 furniture kinds, a batch at a time, following the how-to. I can run Sonnet myself as helpers and review what comes back before it's pushed, so you only see finished batches. Or you can start a Sonnet session and point it at the how-to page; both work.
- **Not for Sonnet:** the body, the animation and the horse (an animal body is the same foundation as people; it comes with kinds of creature, C3).

## Order
1. One person body next to today's card, standing and walking, in the gallery and in the world, **for you to judge on the phone**. If the look is wrong, we change it before anything else is built on it.
2. The rest of the people (all looks), then the people in the world switch over.
3. The furniture examples and the how-to, then Sonnet's batches.
4. Horses with kinds of creature.

## What it costs
- Frame rate: ~200–400 triangles a person is cheap; 50 people on screen is fewer triangles than one tree clump. Furniture is only built for houses near the view, as today.
- The flat-card code (`sprites.ts` walk cards, the front-painted art and the `facesView` check) goes once everything has switched over.
