# Kinds of person, and their character sheets

*2026-10-30. Step 3 of [the world structure](world-structure.md). **The basis is built.** Sheets: **first version built 2026-10-31**, see [Sheets](#sheets-built-2026-10-31) below; try them on the **Kinds of person** page (`/npcs/`).*

## Sheets (built 2026-10-31)
**The director's frame:** skills in five levels; a kind says main and side skills; a person has one level; kinds stack; some randomness; attributes follow the level, but less. Built as:

| Level | Skill span | In dice units (4 to a die) |
|---|---|---|
| Untrained | none | 0 |
| Novice | 2D6–3D6 | 8–12 |
| Capable | 3D6+1–4D6+1 | 13–17 |
| Skilled | 4D6+2–5D6 | 18–20 |
| Master (rare) | 5D6+1–6D6 | 21–24 |

- **A person has a level** (novice to master). Their kind's **main** skills sit at it, **side** skills a step below (never under novice), everything else is untrained. Each skill is rolled inside its span, leaning to the middle, so two capable guards are alike, not the same.
- **Knacks:** each kind has a pool of skills a person may have a knack for (the book's example skills for the archetype); each person picks two or three of them at side level. This is the other half of "they vary a little": one guard knows riding, another marching.
- **Attributes** start from the book's archetype template, plus the people's build (shift from a human's, from the creator), then the level: a novice half a die lower, capable and skilled as the book, a master half a die higher. Each person strays one step either way.
- **Gear:** a kind lists choices per slot (weapon, sidearm, shield, armour); each person gets one of each.
- **Kinds stack** down the person's chain (the stronger lean wins, shifts add, the most specific gear wins). Where it all comes from, without hand work for the 100 callings:
  - **the 15 groups of callings** each have one of the book's **8 archetypes** (martial → warrior, underworld → shadow, craft → toiler...) with its attributes, knacks and simple gear;
  - **each calling's main skills** are the skills named in its creator background options (a guard: Search, Scouting);
  - **each people's** build and its innate and cultural skills (as side skills) come from the creator;
  - **hand-made kinds** on top (`content/people/kinds/armed.ts`): `guard-sword`, `guard-spear`, `guard-bow`, `guard-crossbow`, `brigand-axe`, `brigand-bow`, `soldier-pike`. A new one is a few lines: what it is a kind of, its weapon skills, its gear.
- **Code:** rules `src/core/npcsheet.ts` (levels, merging, spans, rolling; tests `tests/npcsheet.test.ts`); the base sheets `src/content/people/sheets.ts`; `PERSON_KINDS.sheet(person)`; the page `src/npcs/`.
- **Not yet:** people in the 3D world don't carry a rolled sheet yet (that comes with step 5, tapping someone); the book's combined attack-and-defence value is left out (our people have weapon skills instead); innate abilities (darkvision, keen smell) are shown as side skills at the person's level, which may be wrong for things that are simply on or off.

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
- **Sheet**: what every kind has (`sheet`): main and side skills, knacks, attributes, gear. See [Sheets](#sheets-built-2026-10-31).

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
- 2026-10-31: the director set the numbers (five levels, main and side, stacking kinds); built as above.

The shape above is ready for it: strengths would sit on the same nodes as the looks (a people's, a calling's), and merge down the same way.
