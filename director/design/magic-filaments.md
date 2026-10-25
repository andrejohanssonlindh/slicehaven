# Magic: filaments

*First version, 2026-10-25. Try it in the sandbox's **Magic** tab.*

## The idea (director)
We want to know which filaments are strong or weak where, changed by day/night (outdoors), indoors/outdoors and weather. Modifiers run from **−3 to +3**, with the extremes uncommon, but combinations can reach them (e.g. water around you + heavy weather). Hexes affect each other.

## How Eon does it
In Eon, magic is made of **filaments** belonging to **aspects** (power sources). To cast, the aspect must be present around the caster. Its **flow** in the surroundings ("Omgivningens tillstånd") has seven levels:

| Eon level | Our value | Name |
|---|---|---|
| Magidött | −3 | Magic-dead (impossible to draw) |
| Mycket svagt | −2 | Very weak |
| Svagt | −1 | Weak |
| Normalt | 0 | Normal |
| Starkt | +1 | Strong |
| Mycket starkt | +2 | Very strong |
| Extremt starkt | +3 | Extreme |

So Eon's scale maps exactly onto −3..+3. (Eon also has *magic storms* above extreme, where casting is impossible. That's a possible rare story event.) Strong flow is not only good: in Eon, failures in strong flow cause worse *dissipations* (magical backlash).

Eon names ~24 aspects. The core rulebook gives environment tables for 8, and those are the 8 we use for now.

## Our model
Each hex scores each aspect by adding up contributions, then **rounds and clamps** to −3..+3:
1. **Its own terrain** (ground, trees, rocks, water, fire, ash, deaths).
2. **Its neighbours** (the 6 surrounding hexes: water, trees, rocks, fire, the dead, undead).
3. **The world**: time of day, sky, wind force, indoors/outdoors.

Every contribution is kept, so tapping a hex explains its number ("Dry land −1 · Water next to you ×2 +1.5 · Downpour +2 = 2.5 → +3").

### The rules (all numbers are first drafts, easy to tune)
| Aspect | What drives it |
|---|---|
| **Hydrotropy** (water) | Dry land −1. Water next to you +0.75 each (max +2). Standing in water +1.5 (water around you then adds nothing more). Rain +1, downpour (storm) +2. Indoors: magic-dead. |
| **Phototropy** (light) | Day 0, dusk −1, night −2 (moon/stars). Clouds −1 (storm −1.5), so a cloudy night is magic-dead. Dense trees −1. Firelight +1 per burning neighbour, +2 standing in it. Sun glare off water +0.5. |
| **Skototropy** (darkness) | Magic-dead outdoors by day (thick clouds +2, tree shade +1). Dusk −1. Night 0, clouded night +1, forest at night +1. Fire pushes it back. Indoors by day −1. |
| **Pneumotropy** (air) | Follows wind force (Eon's table): calm −2, light breeze −1, fresh/strong breeze 0, gale +1, storm/hurricane +2. Sheltered by trees −1. Indoors −2. |
| **Pyrotropy** (fire) | No open fire −2. Wet (rain/storm) −0.5/−0.75. Burning neighbour +1.5 each (max +4), standing in fire +4. Embers +0.5. In water: magic-dead. |
| **Geotropy** (earth) | Loose soil −1, packed gravel 0, standing in a river −2, in water magic-dead. Stone next to you +0.75 each. Walls (indoors) +0.5. |
| **Biotropy** (life) | Living forest 0. Lush growth (flowers, tall grass) +0.5, thick with trees +0.5, crowd of 3+ living +0.5. Trampled path −0.5. Scorched −1.5, burnt neighbours −0.25 each. |
| **Necrotropy** (death) | Forest −1. Rotting leaf litter +1.5, still water (pond) +1, ash of a fire +2. **Someone died here** +1 each (max +3), death nearby +0.5. Undead presence +0.5 each. |

### Examples that fall out of it
- Shepherd on a meadow, clear day: water −1, light 0, darkness magic-dead, fire −2, air −1.
- Between two river hexes in rain: water **+2**; in a storm: **+3**.
- Wading the ford: +1, rain +2, storm +3.
- A cloudy night in the forest: darkness +2, light magic-dead.
- Next to a burning thicket: fire 0, at its heart +2, inside a ring of fire +3.
- After a fight: where creatures died, necrotropy rises (bloodstains mark the spot).

## In the sandbox
- **Magic tab**: pick an aspect to colour the map: coloured with rising motes = strong, darkened = weak, cross-hatched = magic-dead. Every hex shows its number.
- The readout shows **all 8 aspects** for the tapped hex (or your hero's hex), plus the explanation for the chosen one.
- **Roof** tool: tap hexes to make them indoors and see what changes.
- **World tab**: wind force (0–6, Eon's scale) and direction now set separately from the sky.

## Open questions
- More aspects later (24 in Eon)? Which matter for our campaign?
- **Personal state** (Eon has it: wet −1 fire, thirsty −1 water, wounded −1 life, undead +1 death). Use it for heroes?
- How does magic plug into the **dice**? Ideas: the flow level adds/removes pips on magic faces; strong flow lets you reroll magic dice, but makes misfires worse (Eon's dissipations); magic-dead hexes turn magic faces blank.
- Should heroes be able to *change* the flow (light a fire to fuel pyrotropy, call rain)? Eon allows this.
