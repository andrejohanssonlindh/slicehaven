# Magic on the map: what each mystic skill could do

*Started 2026-10-26. A note for later, from the director's feedback on the character creator: the creator now has all the mystic skills, but most of them don't do anything on the map yet. Written when the map was hexes: read "hex" as a 1.6 m filament cell, or a distance in metres. The hex sensing code it mentions was removed with the 2D engine (it is in the `2d-archive` git tag).*

## Where we stand
- The map already knows **how strongly each aspect flows on every hex** (see [Magic: filaments](magic-filaments.md)). That is the ground every mystic skill stands on.
- The character creator gives characters the mystic skills and their values (Sensing, Channelling, Harmonizing, Unravelling, Ceremony and the 20 aspects).
- **New groundwork:** `src/core/sensing.ts`, the rules for Sensing on the map. It is tested but not connected to play yet.

## Sensing (first in line)
The director's idea: *Sensing tells you about the filaments around you, plus or minus, when you use it. Higher rolls sense wider around the caster.*

How the groundwork does it:
| Roll result (successes) | Reach |
|---|---|
| 0 | only your own hex |
| 1 / 2 / 3 | 1 / 2 / 3 hexes |
| 5 / 7 / 9+ | 4 / 5 / 6 hexes (max) |

Detail fades with distance. The margin is your result minus the distance to the hex:
- **margin 0:** only *stronger / normal / weaker* (+ / 0 / −)
- **margin 1–2:** the level (−3 … +3)
- **margin 3+:** the exact level **and why** ("water nearby, rain, night")

In play it would light up the sensed hexes in the Magic view, but only the ones you sensed, and only as clearly as you sensed them. Everything else stays unknown. That makes the Magic tab a thing you earn in play instead of a debug view.

## The other mystic skills (ideas, nothing built)
| Skill | On the map, maybe |
|---|---|
| **Aspects** (Pyrotropy, Hydrotropy…) | Casting draws on that aspect's flow on your hex: strong flow makes it easier and more dangerous, magic-dead makes it impossible. Only 8 of the 20 aspects have filaments so far; the others need their own sources (time, space, stars, moon, symbols…). |
| **Channelling** (prayers) | Prayers draw on faith, not filaments. Holy places and the faithful nearby could be their "sources". |
| **Harmonizing** | Keeping control: in strong flow a failed cast "dissipates" into an effect around you. Harmonizing would soften that, and handle several spells at once. |
| **Unravelling** | Breaking other people's spells: a hex or unit holding a spell could be targeted to undo it. |
| **Ceremony** | Slow rituals outside combat: e.g. changing the flow of a place for a while (clearing a magic-dead hex, a protective circle). |
| **Sensing, extra** | Feeling spells, mystics and the undead within reach, not only the flow. |

Needed structure when we get there: a spell/prayer effect type in `core/` (area, duration, which aspect), spells stored on hexes and units in the battle state, and dissipation tables.
