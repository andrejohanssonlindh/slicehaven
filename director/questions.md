# Questions for the director

Newest on top. Answer in chat (just reference the number, e.g. "Q11: option B"). I'll move answered ones to [decisions](decisions.md).

---

### Q26 — How much character does a passer-by get? *(open; I'm proceeding with my lean)*
Design: [kinds of person](design/people-kinds.md). Every person points at a character, race to skills. For the hero it is the creator's save. For everyone else I would **make the full sheet from their kind, the map's seed and their id, only when someone looks at, talks to or rolls against them**: always the same person, nothing stored, cheap for a crowd. A story character who must be exactly so can carry their own saved sheet instead. Alternatives: (a) full sheets for named people only and a short card (people, calling, three skills) for the crowd; (b) every person pre-made when the map loads. Say if you want (a) or (b); otherwise I build the on-demand version.

### Q25 — How do maps join up? *(open, no rush: needed before step 6 of [the world structure](design/world-structure.md))*
Today one map is loaded per page (`?map=hamlet`). Once maps are files, the game needs to know how you get from one to another. Options, any mix:
- **Exits at the edge**: walk off the end of the road and arrive at the start of the next map's road (a forest, the next village). Simple; every map is a room.
- **Doors that are maps**: a cave mouth, a manor's cellar or a castle's inside is its own map, entered by a door.
- **One big world** that streams forever (the engine can already do kilometres), with maps as regions of it.
- **A travel map** between places (days on the road happen off-screen, with events).

Also: does a map carry its own weather and hour, or does the world's clock run on across maps? My lean: **exits plus doors-as-maps, and one clock for the whole world**. Say which you want, or "later".

### Q24 — "Add all filaments": how far? *(answered: do the reasonable ones; see [decisions](decisions.md))*
The book names 22 aspects; the field has the 8 that come from the ground, the weather and the living. The rest need a source in the world before a number means anything. My proposal, by group (say which, or "all"):

- **Grundkrafter: heat and cold** (Termotropi, Kryotropi): from fire, sun, season, snow, water. Cheap, and they tie into the clock (warm noon, cold night). *I'd do these first.*
- **Himlakrafter: sun, stars, moon** (Heliotropi, Astrotropi, Selenotropi, Kosmotropi): all read the clock and the sky (sun up, clear night sky, the moon's phase). Cheap now that there is a 24 h clock.
- **Symbols** (Ikonotropi, Semotropi): need things to read (signs, carvings, shrines). Wait for placed things that carry meaning.
- **Primal** (Ataxotropi chaos, Nomotropi order, Kronotropi time, Topotropi space): abstract; I'd start them flat at "normal" and let storms, lightning, ruins and the like push them later.
- **Souls** (Psykotropi, Daimotropi, Teotropi, Oneirotropi): the book says ordinary mages cannot work these, so they would exist as a reading but not a spell source. Flat "normal" for now.

Also: **I changed necrotropy** (normal everywhere, a little weaker under living trees; see the devlog). Tell me if you would rather forests were *exactly* normal.

---

### Q23 — The 3D spike (M0): does the look work, and is it fast enough on your phone? *(answered: yes, "nearly exactly what I want", never under 60 fps → go; see [decisions](decisions.md))*
Open **[the spike](https://andrejohanssonlindh.github.io/slicehaven/spike3d/)** on the phone. What it shows and every button is in [the M0 page](design/world3d-m0.md). What I need:

- **The look.** Does it feel like our game? Compare **Shells 0 and 2** close up (zoom +, the roof's eave and the tree), **Outline** on and off, **Palette** 0 / 30 / 100 %. Which do you keep?
- **The numbers.** The box at top left: fps and ms at the default tier, by day, at night, in the storm, and after two or three minutes (does the phone get hot or slow down?). A screenshot is enough.
- **Pixel size.** The default is one art pixel per CSS pixel (×3 on most phones). Try **Pixel** ×2 and ×6: crisper or chunkier?
- **The camera.** Pitch 39° (like the old hex art) and turned 24° so you see the front and the right side. Right, or steeper/flatter?
- **Go or fallback.** If it is right, I start M1 (the core: chunked terrain, tiers, the atlas). If not, say what is wrong; the fallback is baked voxel sprites.

---

### Q22 — Fights without hexes *(answered: measurements (metres), in the engine too; filaments as a cell map, see [decisions](decisions.md))*
The 3D world has no hexes. How should fights and ranges work there? **A)** Distances in metres, moves and ranges as circles (shown only in a fight); **B)** zones (near / close / far) like a tabletop theatre of the mind; **C)** a hex or square grid that appears only when a fight starts, laid over the free world. The sandbox and the gate scene keep their hexes until you decide. Not urgent: it does not block the 3D work.

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
