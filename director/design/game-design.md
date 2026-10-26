# Game design overview

*Design stage, 2026-10-26. We are building the engine, in small vignettes (a scene, a system, a test). Nothing here is final.*

## Where we are
The first idea was Gloomhaven with dice instead of cards. That has been dropped as a design. What's left of the original is the **spirit**: a grounded campaign, hex maps, choices that stick, a party of up to 4. The rules now come from the tabletop ruleset the director has played for 25 years: D6 pools, skills, attributes, Focus, conflicts. The [character creator](character-creator.md) is the first piece of it.

How we work: pick one thing (talking to a guard, a skill on a boulder, fire spreading in the wind), build it as a vignette, play it, keep what works. The [exploration scene](exploration-scenes.md) at the village gate is the first.

## What exists
| Piece | State |
|---|---|
| Character creator (the full creation flow, sheet) | Playable, see [plan](character-creator.md) |
| Hex sandbox: movement, simple combat, weather, time of day, fire, lightning | Engine base, approved |
| Magic as hidden hex bonuses (filaments) | Good enough for now, see [filaments](magic-filaments.md) |
| Exploration scene: skills, talking, multi-hex things | First vignette, see [scenes](exploration-scenes.md) |
| Sensing on the map | Groundwork, see [magic on the map](magic-on-map.md) |

## Principles that have stood so far
1. **The world reacts.** Weather, light, fire, bodies and sources all change the hexes around them.
2. **Not linear.** Finishing one route never closes the others.
3. **Almost everything can be tried.** Look at it, use a skill on it; most attempts just do nothing.
4. **Hints are optional.** The standard game won't tell you which skill is useful; looking around does, in the world.
5. **Phone first.** Portrait, everything tappable, no hover.
6. **Mixed time.** Turn-based where it matters, free-flowing where it helps (drifting clouds).

## Not decided yet
Turn structure in a fight, what a scenario is, the campaign map and structure, party traits, progression, monsters, the final art style. These get decided as vignettes show what's fun. The director's earlier ambitions for them are in the [vision notes](../vision/2026-10-25-director-notes.md).
