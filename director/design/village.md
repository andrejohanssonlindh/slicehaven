# Reedwater: the first full village

*Session 22, 2026-10-28. A sketch to look at, not a scene to play yet.* [See it](https://andrejohanssonlindh.github.io/slicehaven/village/) (also "Village" in the top bar).

## The idea
A small fishing hamlet that was a few huts by a lake, with the main road passing a good walk to the south. In a hundred years the road became the village's main street and the houses followed it east and west, until the village meets the road from both sides. Nobody has to go through it: a **bypass** leaves the road at the west edge, runs round the south and rejoins it at the east edge.

Stamped mud everywhere inside: the main street, the plaza, the lanes. No stone paths. Outside the village the road is plain dirt track. (New ground type `mud`: dark, churned, with puddles.)

## The map (38 × 31 hexes, north up)
```
 lake (upper left)        woods, meadows, apple orchard
 ┌────────────────────────────────────────────────────┐
 │ ~~~~~~~~~~~~   landing  fish racks · net frame      │  rows 0–9
 │ ~~~~~~~~~~~    (east shore)                         │
 │ [Brandt][Pike ][Wenna][ INN  ][Bakery][Store][Cooper]│  north row  (row 12)
 │════ main street (mud) ════════════════════════════│  rows 14–15
 │ old gate →  ┌───────── plaza ─────────┐   [Elder]  │  rows 15–19
 │ [Ilse][Harl]│ well · three stalls · cart│            │  west cluster
 │ ───── lane ─┴──────────────────────────┴──── lane ─│  row 20
 │ [Weaver][Hale] │ [Smithy][Watch][Corrin] │          │  south row  (row 23)
 │ ═══ south lane (mud) ══════════════════════════════│  row 25
 │ ═══ bypass (dirt road) ════════════════════════════│  row 28
 └────────────────────────────────────────────────────┘
```
- **Lake**: upper left, with lily pads, a frog, a floating log, reeds, cattails, flag iris, willows and a jetty on the west shore. The houses crowd the south shore (their roofs hide it), so the **boat landing** is on the east shore: two rowboats, a net frame, a fish rack, tubs of fish.
- **Old gate**: the original village had a palisade. Its open gate still stands across the west end of the main street, with a few rundown stakes. The gate scene's palisade art is reused for this. (Is the gate scene meant to be this village? See Q21.)
- **Plaza**: stamped mud, a well, fruit, cloth and bread stalls, a handcart, lanterns, haystack, barrels. Houses face south (the art has one face), so the north row faces the plaza and main street; the south row's roofs form its far edge.
- Everything outside is meadow, orchard, woods and the bypass lined with poplars.

## The houses (15)
| # | House | Who | Inside |
|---|---|---|---|
| 1 | Brandt's house | Edda and Joss Brandt, three children | **fisher home** |
| 2 | Pike's fish and net loft | Orla Pike | **fishmonger** (shop) |
| 3 | Wenna's herbs | Wenna Marsh | **herbalist** (shop, sickbed) |
| 4 | The Gaffed Eel (inn, 5 wide, tiles) | Dag Harl | **inn** (shop) |
| 5 | Holm's bakery | Marta Holm | **bakery** (shop) |
| 6 | Vale's general store | Tobin Vale | **general store** (shop) |
| 7 | The cooper's | Bram Tull | |
| 8 | Gran Ilse's cottage | Ilse Brandt | |
| 9 | The woodsman's | Harl Oakes | |
| 10 | The elder's house (5 wide, tiles) | Elder Maren Sol | |
| 11 | Dunn's weaving | Hild Dunn | **weaver** (shop) |
| 12 | Hale's house | Tam and Sira Hale | **fisher home** |
| 13 | The smithy (open workshop) | Gunnar Stahl | **smithy** (shop, always open) |
| 14 | The watch house | Sergeant Kell, two others | |
| 15 | Corrin's house | The Corrins, seven children | |

Nine of fifteen have an inside. Tap a house on the page to read about it, **Step inside** lifts the roof and front wall. The names and one-line descriptions live in `content/village/reedwater.ts` and are placeholders: rename freely.

## The people (24)
Spread over the plaza, the main street, the landing, the lanes and the bypass, each doing something small ("hanging out the Brandts' shirts", "asleep on the inn's step"). Tap one to read it. Another thirteen are inside the furnished houses (shopkeepers, regulars, families). The cast comes from the folk art (`content/village/folk.ts`): fisher, fishwife, innkeeper, herbalist, weaver, trader, cooper, woodsman, watchmen, peddler, washerwoman, children and so on.

## New things drawn (`art/shopItems.ts`)
- **Counters** with what each shop sells on them: bread, general goods (a balance, a rope coil, jars), fish on a tray, herbs and mortar, folded cloth with a measuring rod, ale.
- **Bake oven** (domed, brick, a live fire in its mouth, iron door, peel), **kneading trough**.
- **Wall shelves** in six sets: loaves, jars, bolts of cloth, tankards, bottles, wares. **Hooks board** (pan, rope, lantern, hat, sickle, boots). **Herb rack**, **hung net**.
- **Fish rack** (split fish drying), **fish tubs**, **net heap**, **net frame**, **rowboat**, **washing line** (the laundry sways).
- **Loom** (half-woven striped cloth), **herbalist's bench**, **inn long table and benches**, **ale kegs** stacked with a tap, **crate stack** of turnips, apples and cabbages.
- Three new **shop signs** on the house art: fish, cloth, scales (`HouseSpec.shop`).
- A `mud` ground type, and `VillageScene` can now find what you tapped (`hit`), say where it stands (`where`) and swap a house for its inside (`swap`).

## What this is not (yet)
- No walking, no hex rules, no blocking: it is a picture of the village, not a scene. The footprints are in the art (`footprint`), ready for when it becomes one.
- No hooks, skills or conversations. Nothing on the page reacts except the cards.
- The rest of the houses have no inside. The interiors use the village furnishing (`humble.ts`) plus the new trade pieces; the elder's house and the manor-style set would want the richer furniture.

## Known rough spots
- Interiors are dense and dark when seen small, especially the inn and the fisher homes. Counters hide a lot of the shopkeeper by design (they stand behind them).
- Houses are tall (about seven rows of roof), so anything placed in the two rows south of the lake is hidden behind the north row.
- The south row's backs face the plaza; a mirrored house art would fix that.
- Fish, nets and the boat are first passes: I've looked at them at map size only.

## Code
`content/village/reedwater.ts` (ground, houses, things, people), `rooms.ts` (what is in each room), `folk.ts` (who looks like what), `build.ts` (data → cells and props), `art/shopItems.ts`, page `village/` + `src/village/main.ts`. Tests: `tests/village.test.ts` (nothing overlaps, nothing in the lake, bypass joins the road, every furnished house has an inside). Debug hooks: `window.village` (`enter(id)`, `leave(id)`, `enterAll()`, `setLook('dusk')`, `snapshot()`).
