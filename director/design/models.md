# Low-poly models (plan item A2)

*2026-11-02. Agreed in Q31, with the director's change: **each people has its own body**. People are built; furniture is next. Small 3D models replace the flat cards (people, about 45 kinds of furniture, horses), so they look right from every side and can move.*

## Where it stands
- ✅ **People: one builder, five bodies.** Every people family has its own proportions, and every people its own size from the creator's typical height and weight for women and men. Dressed from the looks the kinds of person already have (no person is made by hand).
- ✅ **Movement as data:** a walk and a standing breath, as poses in a loop.
- ✅ **The gallery** `/models/`: the eight bodies on turning stands, the old card beside the first; toggles for turning, walking, shells and the outline.
- ✅ **In the world, on trial:** the **Bodies** button (Look row, or `?bodies` in the address) puts every person on the map in their body instead of their card.
- ⬜ To judge on the phone, then: held things, faces, more poses (sit, work, fight, fall), and the cards go.
- ⬜ **Furniture:** 3–4 examples by Claude and a how-to, then Sonnet in batches (below).
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
- **Engine:** `engine3d/body.ts` (`makeBodyRig`: a group per joint, colours in the vertices, one material for every body, two shells over cloth and hair).
- **A new people with a body of its own:** a new entry in `BODY_PLANS` under its family kind. A new movement: a new loop in `poses.ts`.

## Furniture (next)
Barrels, wells and carts are already 3D: their kind has a `draw` that returns meshes. Furniture moves to the same pattern: **one kind, one `draw`, in its own file**. Claude makes 3–4 examples covering the shapes (a table, a keg, a bed, a shelf with things on it) and a how-to page; **Sonnet** makes the other ~40 in batches, each checked in the gallery, reviewed by Claude before it is pushed.

## What it costs
About 400 triangles a body before shells; 50 people on screen is fewer triangles than a stand of trees. The cards and their front-painted art (`facesView`) go once everything has switched over.
