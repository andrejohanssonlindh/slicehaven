# The plan: what to build, in what order

*2026-11-02. One list for everything ahead: the director's notes ([2026-11-02](vision/2026-11-02-director-notes.md)), the foundations from [how we build things](design/architecture.md), and what was left of [the world plan](design/world-structure.md). Ordered by **what shapes the most other work**, not by size. Questions that block an item are linked by number ([questions](questions.md)). Status: ⬜ not started · 🔶 in progress · ✅ done · ⏸ parked.*

## Next up
**A1, turning the view.** Your idea, and the one that shapes the most: today the camera looks one way, and a lot leans on that (see A1). Every house, room and person drawn before we settle it is drawn for one angle. It's also a small, visible step you can try on the phone. Q28 asks how far it turns; I'll go with my lean unless you say otherwise.

Then **B1–B3** (state, one roll system, actions), with **lighting a fire** as the first thing you can do: that's where the functionality starts.

---

## A. Decide what shapes everything (cheap now, costly later)
| | Item | Why it comes first | Needs |
|---|---|---|---|
| ⬜ A1 | **Turning the view**: arrows to swing the camera round the hero | The camera's direction is fixed today, and things lean on it: beds and horses are painted from the front (`facesView`), and so are the room cut-aways, house fronts and the see-through oval. Deciding now keeps every later piece of art and every map right from all sides, and it may answer the house-design trouble in Q20 | Q28 |
| ⬜ A2 | **People's bodies**: a simple polygon body with shells (clothes colour, then an overlapping pixel edge), replacing the flat cards | A card shows one side, which matters once the view turns (A1). Riding (C4), carriages, and visible wounds (B8) all hang on what a body is. A spike: one person next to today's card, judged on the phone | A1, Q30 |
| ⬜ A3 | **Time: the live world and rounds** | Actions, sneaking, combat, magic and the dice all depend on how the ruleset's rounds meet a world that runs in real time. You said in Q9 you want both | Q29 |

## B. Foundations for doing things (the functionality)
| | Item | What it gives | Needs |
|---|---|---|---|
| ⬜ B1 | **State on placed things, and the saved world**: a fire lit, a door open, a barrel emptied; one versioned save | Everything you *do* changes something, and it has to stay changed | — |
| ⬜ B2 | **One roll system**: one set of dice rules (open rolls where sixes split into two dice, plain pools, the creator's table rolls), shown at three levels you choose in settings: dice on glass over the game, spinning dice icons, or just the result. Dice skins kept separate so they can be swapped (a reward, maybe) | Every check, fight and spell rolls through it. The rules are mostly one already (`core/checks.ts`); the creator's rolls and the showing are what's split | — |
| ⬜ B3 | **Actions on things** (old step 5): tap a thing or a person, see its look, do something (use a skill on it). **First: light a fire.** Chimneys smoke only when the hearth is lit, and a behaviour can do an action, so an NPC lights the hearth at dawn | The skill hooks finally reach the 3D world. Lighting a fire tests B1, B2 and B3 at once and shows in the world | B1, B2, (A3 for anything long) |
| ⬜ B4 | **Sheets on map people** (Q27 follow-ups): every person on a map gets a rolled sheet; a people's gifts (a tirak's darkvision) are always there, not by chance; people get their people's basic skills if their kinds didn't already give them | Real people to roll against | — |
| ⬜ B5 | **Perception**: what NPCs see (a sight cone, light and dark, cover) and hear. As conditions for behaviours ("sees the hero", "heard a noise") | Sneaking, people reacting, guards, combat | A3 |
| ⬜ B6 | **Items and inventory**: items are kinds of thing; people and containers hold them | Gear that helps skills, loot, keys, quest items | B1 |
| ⬜ B7 | **Effects**: burning, wet, wounded, afraid; one file each, on a thing or a person | Fire spreading, rain putting it out, wounds, fear | B1 |
| ⬜ B8 | **Combat**: damage and wounds from the ruleset, read from the sheet; **visible injuries planned in from the start** | Fights, enemies | A2, A3, B2, B5, B7 |
| ⬜ B9 | **Magic: abilities and spells** (a fireball is one ability file once the rest exists) | Magic, built on the filament field we have | B8 |

## C. Making places (feeds the first village)
| | Item | Notes | Needs |
|---|---|---|---|
| ⬜ C1 | **Farmsteads**: a map rule for a farm (a few small buildings round a yard), beside the street rule | One more rule file; small buildings are kinds of building | — |
| ⬜ C2 | **Crops and fields**: wheat, ground crops, growing over time | Crops are kinds of plant. Growing needs **a calendar** (days and seasons on the one clock), a small foundation of its own | — |
| ⬜ C3 | **Pasture**: tall grass, paddocks, grazing animals | Animals are **kinds of creature**, a new family. Not people, but they use the same walking and behaviours | — |
| ⬜ C4 | **Mounts and carriages**: the hero and NPCs riding, riding in a carriage | Something carried by something else that walks | A2, C3 |
| ⬜ C5 | **Hand-placed maps and a map maker** | The map files already take hand-placed things at exact spots (the spike map's props). A map maker page (tap to place, save the file) is worth it when the first village starts | — |
| ⏸ C6 | **Bigger buildings** | Q20 parked: one-storey houses and stables look good, the taller ones don't. Revisit after A1 | A1 |

## D. The game around it
| | Item | Notes | Needs |
|---|---|---|---|
| ⬜ D1 | **Overworld**, like Fallout 1–2: travel shown on the map (walking, horse, carriage); how maps join (old step 6) | Decided in Q25; designed later | C4 |
| ⬜ D2 | **Quests**: main, side, and a third tier for small errands; quest markers on the easy difficulty | Needs saved flags (B1) and talking to people | B1, B3 |
| ⬜ D3 | **The first real village**: by a lake, on a big map: the village inside a palisade, houses outside, farms a little way off, grassland with tall grass and paddocks | Where everything gets tested. Built when enough of B and C is in place | C1–C5, much of B |

## Parked
- **Story** (was Q5): until the engine is further along.
- **Hosting privately** (Q11): you'll bring it up when it's relevant.
- **Character creator backlog**: still in the [ranked backlog](design/backlog.md); not on this plan until you call it.

## Done (for reference)
The world structure is in place: kinds of thing, kinds of person with sheets, rooms as kinds, maps as files with rules, behaviours, the 3D review fixed. See [how the world is put together](design/world-structure.md) and the [devlog](devlog.md).
