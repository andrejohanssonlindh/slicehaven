# Low-poly models (plan item A2)

*2026-11-02. Agreed in Q31, with the director's change: **each people has its own body**. People are built; furniture is next. Small 3D models replace the flat cards (people, about 45 kinds of furniture, horses), so they look right from every side and can move.*

## Where it stands
- ✅ **People: one builder, five bodies.** Every people family has its own proportions, and every people its own size from the creator's typical height and weight for women and men. Dressed from the looks the kinds of person already have (no person is made by hand).
- ✅ **Movement as data:** a walk and a standing breath, as poses in a loop.
- ✅ **The gallery** `/models/`: the eight bodies on turning stands, the old card beside the first; toggles for turning, walking, shells and the outline.
- ✅ **In the world:** every person on the map is a body (one skinned mesh on a skeleton, three draw calls a person). The flat people cards are gone (the director, 2026-11-02): a person on screen is a `Figure` in `engine3d/world.ts`, an anchor the rules place and show, carrying the body.
- ⬜ To judge on the phone, then: held things, faces, more poses (sit, work, fight, fall), and the cards go.
- ✅ **Furniture, the pattern and four examples:** `table`, `keg`, `bed`, `shelf` are models; they turn to face out from their wall; [the how-to](models-authoring.md) lists the rest in six batches.
- ✅ **Furniture, all of it but the horse:** the other 36 pieces made by three Sonnet helpers from the how-to, checked by the tests and looked over by Claude in the gallery. They are first passes: built from the pieces' descriptions, not copied from the cards, and real size (the cards were painted larger than life).
- ⬜ To go over with the director: pieces that read wrong. Known rough spots: the ale kegs stand on their rack instead of lying (the kit has no lying cylinder), the forge's hood and chimney are about 2 m tall.
- ⬜ **Horses** and other animals with kinds of creature (C3).

## The bodies
| Family | Shape (`BODY_PLANS` in `content/people/bodies.ts`) | Size (from the creator's figures) |
|---|---|---|
| Human | the reference: head about 1/7.5 of the height, hips at half | by people: most 1.55–1.75 m, the kragg-eyrens over 1.9 m |
| Elf | longer legs and arms, narrower, pointed ears, a little bigger eyes | by tribe: 1.3 m (Henéa) to 1.9 m (Thism) |
| Dwarf | a big head, short legs, broad shoulders, big hands and feet; the women bearded too | 1.05–1.25 m |
| Tirak | heavy-set, a jaw standing forward, claws, red eyes | by size: gurder 1.1 m, tiraker 1.8 m, trukher 2.2 m |
| Missla | a big head and big eyes, short legs | 1.2 m |

Each person varies ±4% in height by their seed, and their weight makes them broader or narrower (the build, lean to stout, on top).

## How a body is made (for whoever extends it)
- **Rules:** `core/world3d/body.ts` (`buildBody(spec)`: about 25 tapered boxes on 11 joints, ~400 triangles) and `core/world3d/pose.ts` (poses, loops, mirroring). Pure and tested (`tests/body.test.ts`).
- **Data:** `content/people/bodies.ts` (the families' proportions; `bodySpecOf` turns a person into a spec), `content/people/poses.ts` (the walk and the standing breath).
- **Engine:** `engine3d/body.ts` (`makeBodyRig`: one skinned mesh per body on a skeleton of its joints, colours in the vertices, one material for every body, two shells over cloth and hair on the same skeleton).
- **A new people with a body of its own:** a new entry in `BODY_PLANS` under its family kind. A new movement: a new loop in `poses.ts`.

## Furniture
**One file per kind** in `content/things/models/` (found by itself), its default export a `FurnitureModel` (`core/world3d/things.ts`: a footprint `w` × `d` and a `draw(seed, variant)`), built with the kit in `core/world3d/modelkit.ts`. A model replaces its kind's card everywhere. The room solver turns a model to face out from its wall (`turnFor` in `roomplan.ts`); cards still face the front. The materials of things are shared by the world and the gallery (`engine3d/things.ts`; `iron` is new). Guarded by `tests/furniture-models.test.ts` (on the floor, inside its footprint, under 450 triangles, the same for a seed) and `e2e/models.e2e.ts` (two pictures of each, beside its card). **How to make one: [models-authoring.md](models-authoring.md).**

## What it costs
About 400 triangles a body before shells; 50 people on screen is fewer triangles than a stand of trees. The cards and their front-painted art (`facesView`) go once everything has switched over.
