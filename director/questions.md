# Questions for the director

Newest on top. Answer in chat (just reference the number, e.g. "Q11: option B"). I'll move answered ones to [decisions](decisions.md).

---

### Q27 — Sheets for kinds of person: three things to check *(open; try the Kinds of person page)*
1. **Attributes by level.** You said levels 2–4 get the book's numbers, level 1 lower and level 5 higher. A *person* is never untrained, so I read it as: a **novice** is half a die lower, **capable and skilled** are the book's, a **master** half a die higher. Right, or should novices keep the book's numbers?
2. **Knacks.** Besides main and side skills, each person picks 2–3 extra side skills from their archetype's list in the book (a guard might know Riding, another Marching). This is my way of making two guards differ. Keep it?
3. **Gifts of a people** (a tirak's darkvision, keen smell) show up as side skills at the person's level. Some of these are really on or off. Fine for now, or leave gifts off the sheet?

---

### Q25 — How do maps join up? *(open, not decided; no rush: needed before step 6 of [the world structure](design/world-structure.md))*
Today one map is loaded per page (`?map=hamlet`). Once maps are files, the game needs to know how you get from one to another. The director's likely handle: **walk to the end of the map and arrive on an overworld.** Not decided yet. Other options, any mix:
- **Exits at the edge** into the next map directly (a forest, the next village).
- **Doors that are maps**: a cave mouth, a manor's cellar or a castle's inside is its own map, entered by a door.
- **One big world** that streams forever, with maps as regions of it.
- **An overworld / travel map** between places (days on the road happen off-screen, with events). *This is the director's likely direction.*

Still to settle when it comes up: does a map carry its own weather and hour, or does one clock run across them?

---

### Q21 — Reedwater, the first full village: what next?
Open **Village** in the top bar. Pan, zoom, try Dusk and Night, tap houses and people, and **Step inside** the shops. The [design page](archive/village-reedwater.md) has the map and who lives where. Things I need from you:

- **Is the gate scene this village?** I put the old palisade gate standing open across the west end of the main street, as a leftover from when the village was small. If the gate scene is a *different* village, say so and I'll take the gate out.
- **Which shops matter?** I made nine insides: inn, bakery, smithy, herbalist, fishmonger, general store, weaver and two fisher homes. Names and owners are placeholders. Which ones do you want to play first, and which trades are missing (tanner, chandler, boatwright)?
- **Houses all face south** because the art has one face, so the south row turns its back on the plaza. **A)** accept it; **B)** I mirror the house art so a row can face north; **C)** I move the plaza to the south edge. I lean B.
- **Size.** Houses are four to five hexes wide and cover nearly seven rows with the roof, so the village is 38 × 31 hexes. Too big to walk across on a phone, or right?

---

### Q20 — Village art round 1: what's solid, and how big should buildings be?
Open **Village art** in the Director's Room (the tab at the top) and try the Dusk and Night buttons. Two things I need from you:

- **Which concepts are solid?** Say the word and I'll diversify that one (more trees, more roofs, more faces and builds). My own weakest spots: the stump, the well bucket, and the villagers' legs, which still blur together.
- **Scale.** The houses are about 2.5 hexes wide, so a 5×5 village holds about three buildings and a bit of clutter. Options: **A)** keep this size, and the village is a tight cluster (a good "hamlet"); **B)** shrink buildings to about 1.5 hexes, which fits more buildings but makes people look bigger next to them; **C)** keep the size and make the village bigger than 5×5. I lean A for the first village.

---

### Q11 — Private repo, but testable from anywhere *(you asked: can it be private?)*
Short version: **a private repo does not make the site private.** GitHub Pages sites are public even when the repo is private, unless the account is on GitHub Enterprise Cloud. So there are three ways, and I haven't changed anything yet:

- **A) Leave it public for now.** It holds rules numbers and our own summaries, no book text and no brand name. Nothing to do.
- **B) Private repo + a host with a login in front.** Cloudflare Pages with Cloudflare Access (free for up to 50 people): you'd log in with your email on the phone, and nobody else gets in. The repo can go private at the same time. Costs me an hour to move the deploy; you keep testing from anywhere. **My recommendation** if you want it closed before the data grows.
- **C) Private repo + keep Pages.** Needs a paid GitHub plan, and the site is still reachable by anyone with the link, so it hides the source only.

Tell me A or B and I'll do the rest. I won't change repo visibility without your go.

---

## Parked
- **Story (was Q5).** Which war killed the shepherd's father: left until the engine work is further along ([your notes](vision/2026-10-25-director-notes.md) and the [world notes](world/eon-notes.md) have what's needed).

## Answered
- **Q19 Tidy the skill hooks before adding more?** → yes, fix first and lay the structure for the rest. Done in session 18: see the [structure review](design/skill-structure-review.md) and the recipe in the [handover](design/skill-map-handover.md) §4. *(2026-10-27)*
- **Q17 Trait points per attribute?** → it was a bug: you could assign 5 with only 1 to give. The + button now stops at the points you have (and the move is refused in code). No per-attribute limit was needed. *(2026-10-26)*
- **Q18 Does a failed social try linger?** → yes, in several ways: interactions with most characters are limited in number, and the outcome of an Argue colours the next attempt. Written into the [skill web](design/skill-web.md). *(2026-10-26)*
- **Q3 Dice per turn?** → outdated, removed. The old dice-as-cards idea is gone from the design. *(2026-10-26)*
- **Q10 English or Swedish terms?** → English. Groundwork so it *can* be translated: `src/i18n/` (a `t(key, 'English text')` function and an empty English file). Nothing is moved into it yet. *(2026-10-26)*
- **Q12 Starting silver?** → A: the game engine will hand out silver its own way. *(2026-10-26)*
- **Q13 Ages and name lists?** → current is fine. *(2026-10-26)*
- **Q14 Show "useful here"?** → both ways are useful. The standard game will likely not show it, so it's now a **Hints on/off** switch. Skill lists are grouped by skill group in fold-outs, with expertise, marks, crafts and abilities at the end. *(2026-10-26)*
- **Q15 One approach or switch mid-conversation?** → one approach per try, for simplicity. Each approach still mixes several skills (sweet talk can use both Argue and Charm). *(2026-10-26)*
- **Q16 Gold or silver?** → silver. *(2026-10-26)*
- **Q9 Filaments v2 / world step** → right direction; radiation too weak next to sources (fixed in 5b); want both turn-based and free-flowing time. Nature & magic good enough for now. *(2026-10-25)*
- **Q7 Engine sandbox** → feels good; fixes requested (done in session 5). *(2026-10-25)*
- **Q8 Filaments v1** → good start; sources should radiate, world should move in turns, shadows, bodies stay (done in session 5). *(2026-10-25)*
- **Q6 Art test #1** → approved at the time; mobs need work; zoom needed. The final style is not set, see [art direction](archive/art-direction-2d.md). *(2026-10-25)*
- **Q1 Eon names** → keep the names. *(2026-10-25)*
- **Q2 Party size** → variable, max 4; early game 1, later usually 2. *(2026-10-25)*
- **Q4 Language** → English. *(2026-10-25)*
