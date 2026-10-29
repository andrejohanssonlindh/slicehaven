# Magic: filaments

*Version 2, 2026-10-25, written for the hex sandbox (now removed). The rules live on in the 3D world: hexes became 1.6 m cells with the same three-step falloff (`core/filaments.ts` for the rules, `core/world3d/filaments3d.ts` for the field). Try it in the 3D world's **Magic** group (the heat map).*

## The idea (director)
We want to know which filaments are strong or weak where, changed by day/night (outdoors), indoors/outdoors and weather. Modifiers run from **−3 to +3**, with the extremes uncommon, but combinations can reach them (e.g. water around you + heavy weather). **Things radiate outward**: trees, rocks, fire, the dead and the living affect the hexes around them. **The world moves between turns**: clouds drift, fire spreads.

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

Eon also has *magic storms* above extreme (casting impossible), which could be a rare story event. In Eon, strong flow also makes failures worse (*dissipations*). Eon names ~24 aspects; the core rulebook gives environment tables for 8, which we use for now.

## The model (v2)
A hex's reading for an aspect =
1. **Conditions on the hex**: time of day, sky, wind, indoors/outdoors, its ground, **a cloud over it**, **a shadow cast on it**.
2. **What radiates into it**: every source sends its effect to its own hex and up to 2 hexes out, weakening with distance. Each *kind* of source is capped, so ten trees don't add up to ten times one tree.

Then it's rounded and clamped to −3..+3. Tapping a hex shows every contribution, e.g. *"Dry land −1 · Rain +1 · Water ×2 nearby +1.5 = 1.5 → +2"*.

### Sources (here / 1 away / 2 away, and cap)
*v2.1: radiation strengthened so it's actually felt next to the source (director feedback).*

| Source | Radiates |
|---|---|
| **Water** (river, pond, ford) | Water +1.5 / +0.75 / +0.25 (cap +2). On a clear day: sun glare, light +1 / +1. |
| **Pond** | Death (still water) +1 / +0.5. |
| **Trees & thickets** | Life +0.5 / +0.3 / +0.1 (cap +1). Shelter: air −1 / −0.5. By day: canopy, light −1 / −0.3, shade +1 / +0.3 darkness. At night: darkness +1 / +0.5 / +0.2. |
| **Rocks** | Earth +2 / **+2** / +0.75 (cap +2.5): full strength next to the rock, then fades fast. Next to a rock: **+1** (gravel: +2). |
| **Fire** | The flames: fire +4 on the hex (cap 4). Heat: fire +2.5 / +1.2 around it (cap 3.5). → in the fire **+2**, next to one **+1**, between two **+2**, two away −1, inside a blaze **+3**. Light +2 / +1.5 / +0.75. Darkness −2 / −1.5 / −0.75. Life −1.5. |
| **Ash** | Death +2 / +0.5 / +0.2. Embers: fire +0.5. Life −1.5 / −0.25. |
| **The dead** (bodies stay on the field) | Death +1.5 / +1 / +0.4 per body (cap +3). |
| **Undead** (skeletons) | Death +1.5 / +1 / +0.4 (cap +2). |
| **Friends** (incl. your own hero) | Life +1 / +0.6 / +0.25 (cap +1.4): +1 on and next to them. |
| **Beasts** | Life +0.5 / +0.3 / +0.1 (cap +0.8). |

### Conditions on the hex
| Aspect | Conditions |
|---|---|
| **Light** | Day 0, **clear sky +1**, dusk −1, night −2. Overcast (rain/storm) −1/−1.5. A cloud over the hex −1. In an object's shadow −1. Indoors −1 by day, −3 at night. |
| **Darkness** | Daylight −3 (magic-dead), dusk −1, night 0. Overcast or a cloud over the hex: +2 by day, +1 at dusk/night. In an object's shadow +1. Indoors −1 by day. |
| **Water** | Dry land −1. Rain +1, downpour +2. Indoors: magic-dead. |
| **Air** | Wind force (Eon): calm −2, light breeze −1, fresh/strong breeze 0, gale +1, storm/hurricane +2. Indoors −2. |
| **Fire** | No open fire −2. Wet −0.5 (storm −0.75). In water: magic-dead. |
| **Earth** | Loose soil −1, gravel 0, standing in a river −2, in water magic-dead. Walls +0.5. |
| **Life** | 0. Lush growth +0.5, trampled path −0.5, indoors −0.5. |
| **Death** | −1. Rotting leaf litter +1.5. |

### Shadows
Light comes from the top-left. By day, trees throw a shadow one hex to the **south-east**. At dusk the low sun throws **long shadows east** (two hexes from trees, one from rocks). No shadows at night or under a grey sky. The shadows are drawn on the map and they count in the rules.

### Clouds
On cloudy days, cloud patches drift over the map. The same cloud field drives the drawn shadows and the rules, so what you see is what counts. Clouds move with the wind **when a turn ends** (faster in strong wind) and glide into place.

### Examples
- Clear day on a meadow: light **+1**. Next to the river: **+2**.
- Between two river hexes: water +1; in rain **+2**; in a storm **+3**.
- A cloud passes over you on a cloudy day: darkness goes from −3 to −1, light from 0 to −1.
- Standing south-east of a tree by day: in its shadow, darkness −2.
- Next to a fire: fire 0 (normal); in a blaze, +3. Firelight pushes darkness to magic-dead at night.
- After a fight: bodies lie where they fell and death rises around them.

## Turns and free-flowing time
The game will have both: **turn-based** (combat) and **free-flowing** (e.g. exploration). The sandbox's World tab has a **Turns / Flow** toggle:
- **Turns:** the world moves only when a turn ends.
- **Flow:** clouds drift continuously; fire and storms tick on their own every 4 seconds.

## World step (end of turn)
1. Clouds drift with the wind.
2. Fire: each burning hex may spread to neighbours (more downwind, much less in rain), then burns down. Trees burn 3 turns, grass/thickets 2, rain shortens it. Burnt thickets open up.
3. Storms: at most **one lightning bolt per turn**, drawn to tall things and clouded hexes.
4. Anyone standing in fire takes 1 damage.

## Open questions
- More aspects later (24 in Eon)? Which matter for our campaign?
- **Personal state** (Eon: wet −1 fire, thirsty −1 water, wounded −1 life, undead +1 death). Use it for heroes?
- How does magic plug into the **skill rolls**? Ideas: the flow level adds or removes dice on a mystic roll; strong flow makes misfires worse; magic-dead hexes make mystic skills fail. See [magic on the map](magic-on-map.md).
- Should heroes be able to *change* the flow (light fires, call rain)? Eon allows it.
