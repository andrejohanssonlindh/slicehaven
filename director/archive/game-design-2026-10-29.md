# Game design overview

*Rewritten 2026-10-29, when the 2D hex engine was removed. Design stage: we build the engine in small vignettes, and nothing is final. The first overview (hex days) is in the [archive](../archive/game-design-2026-10-26.md).*

## Where we are
A grounded fantasy campaign game built on a tabletop ruleset the director has played for 25 years: D6 pools, skills, attributes, conflicts. It has three working pieces:

| Piece | Page | State |
|---|---|---|
| **The 3D world**: a live 3D pixel world you walk in metres, with no hexes. Chunks stream in, so maps can be kilometres across. Houses with storeys, stairs and furnished rooms; weather, a 24-hour clock, sight and remembered ground; filaments (magic strength) as a heat map. | `/spike3d/` | Current focus. Milestones M0–M2 done, M3–M6 next. See the [3D handover](world3d-handover.md). |
| **The character creator**: the full creation flow and sheet. | `/chargen/` | Playable. See the [plan](character-creator.md). |
| **The skill map**: skills, people types and hooks, and how they connect. | `/skills/` | About 40% (director's estimate). See the [handover](skill-map-handover.md). |

The village gate scene (`core/scene.ts`, `content/scenes/gate.ts`) is still the skill map's test bed for rules: checks, social conflicts, hooks. Its hex page is gone; the rules and data stay until a 3D scene replaces them.

## Principles that have stood so far
1. **The world reacts.** Weather, light, fire, bodies and sources change the ground around them.
2. **Not linear.** Finishing one route never closes the others.
3. **Almost everything can be tried.** Look at it, use a skill on it; most attempts just do nothing.
4. **Hints are optional.** The game won't tell you which skill is useful; looking around does.
5. **Phone first.** Portrait, everything tappable, no hover.
6. **Measurements, not hexes.** Distances are metres, fights included (decision Q22).
7. **Authoring by intent.** Maps, houses and rooms are written as rules ("a bakery on the north side of the road"), not tuned coordinates ([authoring](world3d-authoring.md)).

## Not decided yet
Turn structure in a fight, what a scenario is, the campaign map, party traits, progression, monsters, and the final art style. The director's ambitions for them are in the [vision notes](../vision/2026-10-25-director-notes.md).
