# Actions on things and people: the frame (B3)

*2026-11-02. **The frame and the order of slices are agreed** (Q33); the details get settled as each slice is built. Written from the director's notes of [the same day](../vision/2026-11-02-director-notes-2.md). The point: build a frame that every later action plugs into as data, so the first version can do 10–20 % of what's wanted and the rest is added one file at a time.*

## Built (B3a, 2026-11-02)
- **Where:** the pipeline is `core/world3d/actions.ts` (`offers`, `perform`, `libraryProblems`); the data is `content/actions/`: `verbs/` and `gates/` (one file each, found by themselves) and `facts.ts`. The world runs it (`SpikeWorld.act`, `offersFor`, `tapped`); the page shows it (`src/spike3d/actsheet.ts`). Tests: `tests/actions.test.ts`, `e2e/spike3d-act.e2e.ts`.
- **Verbs:** *light* (any `fire`: an easy Survival roll, +4 in the rain out of doors, 10 minutes), *put out* (no roll, a minute), *sit* (anything whose kind has a `seat` height: stool, bench, inn bench, bed), *make a fire here* (on the spot you stand on: not indoors, not among the houses).
- **Skill hooks** from the library are offered next to the verbs, on the kind's chain (search a footlocker, climb a tree…), rolled with your best fitting skill. Their sayings and flags happen; moods and kept advantages wait for people (B3d). Social tries and hidden reads aren't offered on things yet.
- **Gates:** `state` (hides the offer: no "light" on a lit fire), `place` (facts that must or must not hold: `indoors`, `raining`, `inSettlement`, `dark`), `owner` (**a stub: always allowed until B3c**).
- **Outcomes:** set a state, a flag (saved), a line said, minutes passing (only the hero's actions move the clock), make a thing (a campfire), sit.
- **People act through it too:** the `tendfire` behaviour lights a house's fire at dawn with `verb:light`, rolling with their own sheet (B4: `SpikeWorld.doerOf`). A roll can name a fitting attribute (`attr`) that anyone without the skills uses at −2D6, as the rules allow. `world.recentActs` keeps the last things done, by anyone.
- **"Among the houses"** is worked out, not drawn: three or more houses within 20 m. A map with a palisade can make it sharper later.
- **On the page:** tap a thing (or near it) → a sheet with its look and what can be tried; choosing walks you up to it and does it, with the dice. Tap the hero → *where you stand* (make a fire). Walking gets you up off a seat. A seat is sat on facing its own front (a stool by a table may face away from it: to tune).
- **The hero who acts** is the character open in the creator, if it has skills yet; otherwise the default shepherd.

## Built (B3d, first slice, 2026-11-03)
- **Talking is the frame's social resolve:** `core/world3d/talk.ts` (`talkOffers`, `talk`, `moodOf`, `patienceLeft`) gives the 2D skill map's rules (`core/scene.ts` `attempt`/`apply`, `core/skillweb.ts` `expandObject`, `situation`, `readPerson`) a person of the map and a memory (`TalkMemory`, saved). No new social rules: the hooks, moods, patience, relations and leanings are the ones we had. No fitting skill: Presence at −2D6.
- **The world:** `tapped` returns `{ person }`; `talkingWith` holds them still, facing the hero; `talkPerson`, `talkTo`, `portrait(renderer, id, px)` (their body rendered close up from the world as it is), `bodyOf` (for the painted one, `art/portrait.ts`). The page: `src/spike3d/talksheet.ts`. Tests: `tests/talk.test.ts`, `e2e/spike3d-talk.e2e.ts`.
- **Not yet:** social conflicts (rounds of control), opposed rolls against their sheet, leave and lending as outcomes, people talking first.

## Adding to it
- **A verb**: a file in `content/actions/verbs/` (`VerbDef`): what it is `on` (a kind, a property the kind has, or `here`), its `gates`, an optional `roll` (skills, difficulty, `harder` where a fact holds), `takes` minutes, `success` and `failure` outcomes.
- **A gate**: a file in `content/actions/gates/` (`GateDef`): a requirement (blocks with a reason, or `hides` the offer) or a permission (never blocks: a transgression, B3c).
- **A fact**: an entry in `content/actions/facts.ts`.
- **A new kind of outcome or roll**: a branch in `core/world3d/actions.ts`, agreed first (the pattern check).
- `tests/actions.test.ts` checks the library (`libraryProblems`): unknown gates, facts, states or kinds fail it.

## What is already there (from the 2D days)
More than it looks. The **skill hooks** (`core/skillweb.ts`, `content/skillweb/hooks/`, one file per kind of effort) already say, per kind of thing: what can be tried, with which skills, at what difficulty, and what success, failure and a strong success do (something said, a flag set, time passing, mood moved, a clue). Social conflicts and challenges (`core/social.ts`, `core/challenge.ts`) exist as rules. What's missing is the **3D world asking them**, and three things the hooks never had: **permission, requirements (tools, items, place), and changing the world** (a state, an item, the clock).

## The frame: every action goes through five steps
Whatever is tried, a hearth, a stair, the smith's furnace, a guard, runs the same pipeline. Each step is a registry of small files, like behaviours and kinds.

| Step | Question | What answers it | First version |
|---|---|---|---|
| **1. Offer** | What can be tried on this? | The kind chain: skill hooks plus plain **verbs** that need no skill (sit, take, carry, open). Inherited: every `seat` can be sat on, every `fire` lit or put out | Tap a thing → its look and a short list |
| **2. Gates** | Can it be done, here, now, by you? | Small **condition files** (`gates/`), each one question: *is it yours or allowed* (owner), *have you the tool or item*, *is it the right place* (outside town bounds), *is it in the right state* (already lit), *is it small enough to pocket* | State and place gates; owner as a stub that says "allowed" |
| **3. Breaking a gate** | What if you do it anyway? | A failed **permission** gate does not block: it marks the act as a **transgression** (theft, trespass, using without leave). Whether anyone notices is perception (B5); what they do is a behaviour (B5/B8). Failed **requirement** gates (no flint) do block, with a reason | Not yet: needs owners and witnesses |
| **4. Resolve** | How is it rolled? | One of the modes we have: **no roll**, **one roll**, **a hidden read**, **a challenge** (three rolls), **a social conflict**; later **crafting** | No roll and one roll |
| **5. Outcome** | What changes? | The hook's effects, plus new ones: **set a state** (lit), **time passes** (10 minutes), **give / take an item**, **start carrying**, **a flag** (for quests), **someone's view of you moves** | State, time, a line said |

**Why this survives growth:** the smith example is the same pipeline, deeper. *Offer:* the furnace offers "work iron". *Gates:* owner (the smith's) → ask leave (a social roll, step 4 on *him*, outcome: a permission flag for today); tools (hammer, tongs: yours, or borrowed: an outcome of the talk); skill (you need the craft). *Resolve:* a craft challenge. *Outcome:* an item. Nothing in that needs an `if` on "smith" or "furnace".

## Things too big to pocket
Every item kind gets a **size class**: *pocket*, *bag*, *strapped* (a weapon on a strap, a shield), *in the hands* (a stool, a ladder, a sack of grain: both hands taken, slower, no fighting, dropped if you run or are hit), *too heavy* (a cart, a millstone: needs two or a beast). A built-in stair is part of the house and can't be taken; a loose ladder or stool can. "Steal the stair" is then *take* on a thing that is *in the hands* size and *owned*: a transgression, carried, not pocketed. Using it as a weapon waits for combat (B8), which reads an improvised-weapon property off the kind.

## Growing it with the director's notes
The director's proposal, building 10–20 % and then sending in notes to grow it, **is the right shape**, because every new action is data in the frame, not new code. To make each round quick, a short **action note** template:

> **Thing:** the smith's furnace · **Try:** work iron · **Allowed if:** the smith says so · **If not:** theft of use; he's angry if he sees · **Needs:** hammer, tongs, iron · **Skills:** smithing crafts · **Roll:** a challenge · **Result:** an item, time passes 2 h

When a note asks for a gate, a resolve mode or an outcome that doesn't exist yet, that is when the frame grows by one file, and it is agreed first (the pattern check).

## Taking things, and what follows (the director's notes, [2026-11-03](../vision/2026-11-03-director-notes.md))
*A sketch to grow B3b–B3d from. Not agreed in its details (Q37 and Q38 are answered: portraits by trying; the scale per person, spreading). Nothing here is built yet.*

**Taking is several offers on one thing, not one verb.** It holds for most objects, not just the stair, and each way uses a resolve mode the rules already have:

| Way | How it resolves | What follows |
|---|---|---|
| **Argue** it's yours to take, or **threaten** | A social conflict with the owner (B3d) | Won: it's yours (or you have leave). Lost: it stays, and they think less of you |
| **Borrow** | A social try for leave; the leave says *until when* | Not back in time: it counts as theft. Giving it back is an offer on the owner. Found lying about: people who like order (a leaning in the people library) bring it home themselves (a behaviour) |
| **Move** it | No roll inside the room; a try to take it further | The owner minds more the further it goes (out of the house: a lot) |
| **Buy** | A trade: the price from its value, haggling as a social try | It's yours |
| **Just take** it ("a weapon, now") | No roll | A plain transgression, for whoever sees it (B5) |
| **Steal** it unseen | A hide roll: harder the bigger it is, easier with a cloak or a sack to pack it in; easy when no one is near | Something carried openly can be **recognised** later by its owner and their household (their chair, down the street). Something in a pocket can't |

**What it does to people: one scale per person** (Q38: held by each person alone; **it spreads when people meet**, good or bad, so word travels and the other side of town doesn't know at once; **advantages won in a challenge scale the effect**, nine of them dramatically). Each person's view of the hero runs from about −100 to +100. The mood we have today (−3 to +3, from the 2D skill map) becomes bands on it. A transgression moves the scale by a **weight**:
- **the kind of act** (use, move, take, steal, harm);
- the thing's **value** against **the owner's wealth** (a lord won't miss a hen; the `rich` and `poor` tags already exist);
- its **importance** (a guard's sword, an heirloom): a property of the thing, or of the owner's calling.

The value also makes the action itself harder.

**What they do about it: consequences on the same scale.** Each consequence starts at a point on the scale: grumble → demand it back → a slap → fetch the guards or willing neighbours → fight → everyone wants you dead. **The place's culture** (setting and people facets, as the people library already leans) says how much each kind of act weighs and where each consequence starts. **Who you are** shifts it: rank (a noble gets off lightly), how your people are seen (the relations table exists: a tirak starts worse), and fear (a trukh everyone is afraid of).

**Fetch help, fight, or let it go?** Their own leaning (a tirak likely fights, a human less so) against how dangerous you look. That comes from your physique, the weapons you show and traits such as scars, read passively the way a threat is read actively today.

**What already exists to build on:** mood and patience, the relations between peoples, the people library's leanings and facets (calling, setting, state), social conflicts and challenges (`core/social.ts`, `core/challenge.ts`), the `rich`/`poor` tags, and the owner gate as a stub in the frame (a permission that marks a transgression and never blocks).

**The order this asks for:** people need sheets (B4) before you can talk to them (B3d: the portrait, the log, choices laid over it). Witnesses need perception (B5). Then the scale and owners (B3c), and only then the ways to take (B3b). Carrying in the hands doesn't need the inventory grid; pockets wait for B6.

## Slices (in [the plan](../todo.md), in the order they're built)
- **B3a The frame** ✅: tap, look, offer, state and place gates, no-roll and one-roll resolve, state/time/say outcomes; light, put out, sit, make a fire; an NPC lights the hearth at dawn.
- **B3d Talking in 3D** (after B4): tap a person → their **portrait**, the conversation **log**, the choices **laid over it** (Q37). The social tries and conflicts we have, against their sheet. Leave ("you may use the forge, today") is an outcome.
- **B3c Owners, the scale and consequences** (after B5): whose a thing is, the per-person scale (Q38), the weight of acts, consequences by culture and by who you are, recognising your things.
- **B3b The ways to take** (after B3c): argue, threaten, borrow and give back, move, buy, just take, steal unseen; carrying in the hands. Pocketing joins with B6.
- **Later:** crafting (a challenge plus tools plus materials → an item), improvised weapons (B8).
