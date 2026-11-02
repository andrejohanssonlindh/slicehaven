# The plan: what to build, in what order

*2026-11-02. One list for everything ahead: the director's notes ([2026-11-02](vision/2026-11-02-director-notes.md)), the foundations from [how we build things](design/architecture.md), and what was left of [the world plan](design/world-structure.md). Ordered by **what shapes the most other work**, not by size. Questions that block an item are linked by number ([questions](questions.md)). Status: ⬜ not started · 🔶 in progress · ✅ done · ⏸ parked.*

## Next up
**B3a, the frame for actions**, with **lighting a fire** as the first thing you can do (A1–A3, B1 and B2 are done). B3 turned out larger than one step (your notes of 2026-11-02), so it's split into slices B3a–B3d spread through the plan, with inventory (B6) moved up beside it. **Waiting on Q33** (the [sketch](design/actions.md) and the new order).

---

## A. Decide what shapes everything (cheap now, costly later)
| | Item | Why it comes first | Needs |
|---|---|---|---|
| ✅ A1 | **Turning the view, freely** — *done 2026-11-02 (⟲ ⟳ buttons, two-finger twist, Q/E, trackpad swipe; two walls down unless square onto one)* (decided, Q28): turn the camera round the hero (arrows, and maybe a drag). The cut-away and the see-through must work from any angle. To judge on the phone: whether the pixel look shimmers while turning (if it does, it can settle crisp when you stop) | The camera's direction is fixed today, and the cut-aways, the see-through and front-painted art lean on that. Deciding now keeps every later piece of art and every map right from all sides, and may answer the house-design trouble in Q20 | — |
| ✅ A2 | **Low-poly models with shells instead of flat cards** — *done 2026-11-02: every person a body (one per people, sized from the rules), every piece of furniture a model; the flat cards, their atlas and painters removed. The horse comes back with kinds of creature (C3); the stalls are empty until then. See [models](design/models.md)* | Flat cards were the only things that looked wrong from other sides; models fix that and let bodies **animate** (walking, fighting). Riding (C4), carriages and visible wounds (B8) all hang on it | A1 |
| ✅ A3 | **Time** — *settled 2026-11-02:* the game runs live; **only a fight goes to rounds** (a round is 4 seconds of world time), very slowly. Everything else, sneaking past a guard included, plays live with the movement we have. A **slow** day and night (not rushed); how fast the clock runs is tuned when we get to combat | Actions, sneaking, combat, magic and the dice all depend on it | — |

## B. Foundations for doing things (the functionality)
| | Item | What it gives | Needs |
|---|---|---|---|
| ✅ B1 | **State on placed things, and the saved world** — *done 2026-11-02:* a kind says which states its things can be in (`states`, inherited: every fire is `lit`, starting lit); a placed thing stores only what differs; every placed thing has a stable id. One versioned save per map (the hero's spot and storey, the clock, what has been seen, the things' states), written every few seconds and when the page is left. A put-out hearth has no glow, smoke or fire for the field. **Test it:** panel → Nearest hearth, walk somewhere, reload; New game starts over | Everything you *do* changes something, and it has to stay changed | — |
| ✅ B2 | **One roll system** — *done 2026-11-02:* every roll is made in `core/dice.ts` (open rolls where a six splits into two dice, plain pools, the creator's table rolls) and comes back as plain data saying what each die showed and which six it split from. Shown at three levels: **dice on glass** over the game (the default: real physics, dropped from a height, the dice tumble and knock into each other and settle on what was rolled; one that lands on another or tilted is thrown again; a D100 is two D10s, tens and ones), **spinning icons**, or **just the result**; a tap skips; the result stays until **OK** (or goes by itself, a setting). Sums of any die (D10+2) as well as nD6+n. Two skins (bone, ember), one file each. The creator's rolls go through it and land on the real numbers. **Test it:** 3D world panel → Game row: *Dice:* (level), *Skin:*, *Roll 4D6 vs 14*, *Roll D100*; or roll anything in the creator | Every check, fight and spell rolls through it | — |
| ⬜ B3 | **Actions on things** (old step 5). *Bigger than one step (director, [notes 2026-11-02](vision/2026-11-02-director-notes-2.md)):* every action asks *may you? what if you do it anyway? what can be done, with which skills, needing what?* So it's built as **a frame** that later actions plug into as data: offer → gates → resolve → outcome ([sketch](design/actions.md), Q33). Built in slices, spread over the plan below: **B3a** the frame, **B3b** take and carry, **B3c** owners and transgressions, **B3d** talking in 3D | The skill hooks (built in 2D, with skills, difficulties and outcomes) finally reach the 3D world | B1, B2 |
| ⬜ B3a | **The frame, and lighting a fire.** Tap a thing: its look and what can be tried (skill hooks plus plain verbs: sit, light, put out). Gates for state ("already lit") and place ("inside town bounds"); no roll or one roll; outcomes set a state, pass time (a fire: 10 minutes), say something. Chimneys smoke only when lit; an NPC lights the hearth at dawn through the same action. **Owners are a stub (everything allowed) until B3c** | Lighting a fire tests B1, B2 and B3 at once and shows in the world | B1, B2 |
| ⬜ B6 | **Items and inventory** (*grown from the director's notes*). Items are kinds of thing with a **shape** (x × y cells, or odd shapes) and a **weight** (the ruleset gives kilograms for gear). The hero has **pockets and a bag**; **add-ons** (a side bag, a weapon strap) are items fitted onto the bag, each giving cells or a slot. **Weight → encumbrance → base fatigue** from the ruleset's table (armour's encumbrance is in the rules; carried weight needs our own conversion, Q34). Fitting things on a phone: tap to pick, tap to place, an auto-pack button (Q34). People and containers hold items too (a chest is a grid) | Gear that helps skills (tools), loot, keys, quest items, found maps (D4) | B1, B3a |
| ⬜ B3b | **Take and carry.** Every item kind has a **size class**: pocket, bag, strapped, **in the hands** (a stool, a ladder: both hands, slower, no fighting, dropped when hit), too heavy (needs two or a beast). Taking moves a placed thing off the map into the inventory, and it stays gone (B1). Built-in parts (a house's stair) can't be taken; a loose ladder can | "Steal the stair"; looting | B3a, B6 |
| ⬜ B4 | **Sheets on map people** (Q27 follow-ups): every person on a map gets a rolled sheet; a people's gifts (a tirak's darkvision) are always there, not by chance; people get their people's basic skills if their kinds didn't already give them | Real people to roll against | — |
| ⬜ B5 | **Perception**: what NPCs see and hear. The hero already has a sight cone with range from Alertness, blocked by houses and trunks (`core/world3d/vision.ts`); NPCs get the same, plus hearing, as conditions for behaviours ("sees the hero", "heard a noise"). ***Sight is rolled** (director's notes):* an Alertness roll at key moments (entering a new area, every 6 hours of world time, waking) sets the cone's reach and width until the next roll, within a band around today's value; the same for NPCs (Q35) | Sneaking, witnesses (B3c), guards, combat | A3, B4 |
| ⬜ B3c | **Owners and transgressions.** Things and places have an owner (a house's household; the well and street are the town's; the wild is no one's). Using or taking without leave isn't blocked: it's marked a transgression, and whoever **sees** it (B5) reacts through a behaviour. Leave is a flag (the smith said yes, for today) | "Are you allowed, and what if you do it anyway?" | B3a, B4, B5 |
| ⬜ B3d | **Talking in 3D.** Tap a person: the social conflicts and reads we have (persuade, ask, size up, threaten…) against their rolled sheet. Outcomes can give leave (B3c), lend an item (B6), set a quest flag. Conversations as such (lines, topics) grow from here | "May I use your forge?"; the base for quests (D2) | B3a, B4 |
| ⬜ B7 | **Effects**: burning, wet, wounded, afraid; one file each, on a thing or a person | Fire spreading, rain putting it out, wounds, fear | B1 |
| ⬜ B10 | **Crafting** (*new, from the director's smith example*): a craft is a challenge (three rolls) on a workplace (forge, workbench) needing tools and materials (B6), giving an item, taking hours. Uses the frame: owner gate (the smith's leave), tool gate (yours or borrowed) | Making and mending; the smith | B3c, B3d, B6 |
| ⬜ B8 | **Combat**: damage and wounds from the ruleset, read from the sheet; **visible injuries planned in from the start**. Improvised weapons (a swung stool) read a property off the kind | Fights, enemies | A2, A3, B2, B5, B7 |
| ⬜ B9 | **Magic: abilities and spells** (a fireball is one ability file once the rest exists) | Magic, built on the filament field we have | B8 |

*The B rows are listed in the order we'd build them (Q33); the numbers stay so old links keep working.*

**Growing the actions after B3a:** you send an **action note** (thing · what to try · allowed if · if not · needs · skills · roll · result; template in the [sketch](design/actions.md)), and it becomes a data file. When a note needs a gate, roll or outcome the frame doesn't have, that one piece is added first.

## C. Making places (feeds the first village)
| | Item | Notes | Needs |
|---|---|---|---|
| ⬜ C1 | **Farmsteads**: a map rule for a farm (a few small buildings round a yard), beside the street rule | One more rule file; small buildings are kinds of building | — |
| ⬜ C2 | **Crops and fields**: wheat, ground crops, growing over time | Crops are kinds of plant. Growing needs **a calendar** (days and seasons on the one clock), a small foundation of its own | — |
| ⬜ C3 | **Pasture**: tall grass, paddocks, grazing animals | Animals are **kinds of creature**, a new family. Not people, but they use the same walking and behaviours | — |
| ⬜ C4 | **Mounts and carriages**: the hero and NPCs riding, riding in a carriage | Something carried by something else that walks | A2, C3 |
| ⬜ C5 | **Hand-placed maps and a map maker** | The map files already take hand-placed things at exact spots (the spike map's props). A map maker page (tap to place, save the file) is worth it when the first village starts | — |
| ⏸ C6 | **Bigger buildings** | Q20 parked: one-storey houses and stables look good, the taller ones don't. Revisit after A1. Also: the inn's two flights of stairs meet with no landing | A1 |

## D. The game around it
| | Item | Notes | Needs |
|---|---|---|---|
| ⬜ D1 | **Overworld**, like Fallout 1–2: travel shown on the map (walking, horse, carriage); how maps join (old step 6) | Decided in Q25; designed later | C4 |
| ⬜ D2 | **Quests**: main, side, and a third tier for small errands; quest markers on the easy difficulty | Needs saved flags (B1) and talking to people | B1, B3 |
| ⬜ D4 | **Maps you find** (*director's notes 2026-11-02*, like Kingdom Come): an item (B6) you open to see a hand-drawn sketch: mountains, a road, a river, an X. Drawn by code **from the real world's data**, roughly and incompletely, so it can be read against what you see. Not linked to the world map; on easy it may mark it | Treasure, side quests, exploration without markers (principle 4: hints are optional) | B6, D1 |
| ⬜ D3 | **The first real village**: by a lake, on a big map: the village inside a palisade, houses outside, farms a little way off, grassland with tall grass and paddocks | Where everything gets tested. Built when enough of B and C is in place | C1–C5, much of B |

## Small fixes (no foundation needed)
| | Item | Notes |
|---|---|---|
| ⬜ F1 | **Chimney smoke shows while you're inside a house** | Reported 2026-11-02. When the roof is cut away, the smoke above it should go too (or stay, faint, for neighbours' houses only?) Q36 |
| ⬜ F2 | **Torches on outside walls show from inside** | Reported 2026-11-02. Hidden with the walls that are cut away; their light on the street may stay. Q36 |

## Parked
- **Story** (was Q5): until the engine is further along.
- **Hosting privately** (Q11): you'll bring it up when it's relevant.
- **Character creator and skill map work**: the old [ranked backlog](archive/backlog-2026-10-27.md) (event cards, pre-set characters, life events) is archived; not on this plan until you call it.

## Done (for reference)
The world structure is in place: kinds of thing, kinds of person with sheets, rooms as kinds, maps as files with rules, behaviours, the 3D review fixed. See [how the world is put together](design/world-structure.md) and the [devlog](devlog.md).
