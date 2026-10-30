# Kinds of person, and their character sheets

*2026-10-30. Step 3 of [the world structure](world-structure.md). **The basis is built**; the sheets are still an empty slot (see the end).*

## The idea: a person is a kind of several things at once
The director (2026-10-30): people are kinds of **both their people (race) and what they do**, and perhaps more dimensions. The character creator already has those trees, so we use them as they are:

| Dimension | Tree (from the creator's data, via the people library) | Example line |
|---|---|---|
| **people** | the five families, each people under its family, the tirak by house | human › asharier; tirak › marnakh |
| **station** (calling) | 15 groups, each of the 100 backgrounds under one | station › merchant › job-innkeeper |
| **faith** | the religions | samorism |
| **realm** | kinds of realm, each homeland under one | lawless › asharien |

A person carries **one line per dimension**: `is: ['dwarf', 'job-innkeeper']` is a dwarf innkeeper. Two unrelated facets in one dimension (a dwarf *and* an elf) are an error. With no people given, a person is human. A new dimension (the creator's archetype or environment, say) is a new tree in the library; nothing else changes.

## The three words (director)
- **Kind of person**: one file in `src/content/people/kinds/`. It either **gives a body to a node of a tree** (the `dwarf` file says how dwarves look, and every dwarf clan has it; `job-innkeeper` says what innkeepers wear), or it is **a kind made of others** (`{ id: 'sellsword', is: ['marnakh', 'job-soldier'] }`), which is what a prefab will be.
- **Person**: someone placed in a map, `{ id, is: [...], seed, look?, routine }`. Often a kind with their own changes (`look: { skin: 'brown' }`), or unique.
- **Sheet**: a slot every kind has (`sheet`). Empty; not designed.

How it inherits: parents first, left to right. The people sets the body (build, skin, hair, beard), the calling the clothes and what is in the hands. A kind's look can list choices (`skin: ['fair', 'tan']`); the person's seed picks, the same every time.

## What is built
- Rules: `src/core/persons.ts` (`PersonKinds`: resolve a person to their chain, their facet per dimension and their look; tested in `tests/persons.test.ts`).
- Kinds: the bodies of the five peoples (`kinds/peoples.ts`) and three callings so far, farmer, miller and innkeeper (`kinds/callings.ts`). Dwarves, elves, tirak and misslor are rough stand-ins in the human art (stout, lean, child-sized); their real look waits for the art style.
- **The cast comes from the map** (review item 9): `MapSpec.people` (and the `crowd` rule), each with a home and a **schedule** of behaviours (see [what people do](behaviours.md)). The map compiler reports unknown kinds, clashes, missing houses and doubled names. The renderer draws whoever the map lists; nothing about the hamlet's people is hard-wired any more.
- The hero is a person too (`HERO_PERSON` in `content/spike3d.ts`), until they are the player's own character from the creator.

## What the director has said about sheets (to build on later)
- Different kinds will have different **strengths and weaknesses**, and these are what will later be used to populate their sheets.
- Some **prefab types** (an innkeeper, say) are likely, but **not perfectly static**: they will have N skills **flagged higher or lower**, with **some stochasticism around them**. An example of the idea: an innkeeper might have 3d6+2 to 4d6+2 in barter.
- That partly overlaps the idea of levels, but **more than three steps are likely; five is the current guess, left unfixed.** How many steps, and how they work, is a separate question to discuss.
- **Every living humanoid is a real person with real skills**, interactable. Some NPCs are not "important" (they drive no quest), but none is a throwaway: there is no separate, simpler kind of crowd character.
- **Enemies are people with a different kind** (a kind of person that has its own sheet strengths): right in principle.
- This returns when we get to skills. Until the director clarifies, don't design the numbers (skill values, levels, how the creator's backgrounds map in).

The shape above is ready for it: strengths would sit on the same nodes as the looks (a people's, a calling's), and merge down the same way.
