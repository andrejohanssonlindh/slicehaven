# The people library: types of people and situations

*Started 2026-10-27. Code: `src/core/people.ts` (the rule), `src/content/people/` (the facets and the table). Tests: `tests/people.test.ts`.*

## The idea
Skills are tagged for the kinds of effort they suit ([skill map handover](skill-map-handover.md)). This is the other half: **who and where you try it on changes what works.** Bread talk wins an innkeeper but not a knight; a threat works on a frightened man and bounces off a priest; a bribe is fine at a checkpoint and a crime in a courtroom.

Two parts:
1. **Facets**: a tree of the things that can be true of a person or a place.
2. **Leanings**: a table that binds a facet to a kind of effort (and optionally to particular skills): easier or harder, and why.

A person carries several facets at once. They go in the object's `tags` (and the scene's `tags` for the place and hour). The roll's difficulty moves 2 per point, like the relations table does, and the reason is printed in the roll's log line (`[a loose tongue; people are wary after dark]`).

## The facets (252)
| Dimension | What | Source |
|---|---|---|
| **people** | The five kinds (human, elf, dwarf, tirak, missla) and each people under them: 22 human peoples, 6 elf, 5 dwarf, 4 tirak houses | The creator's `peoples.ts`. A people is also a *kind* now (an Asharian is a kind of human), so existing hooks and relations still work. |
| **realm** | 18 homelands, grouped into 9 kinds of realm (lawless, mercantile, feudal, imperial, tyranny, theocracy, magocracy, tribal, elven) | `homelands.ts`, grouping is ours |
| **faith** | 26 faiths and cults with their parents, plus "Forbidden cults" as a group | `religions.ts` |
| **station** | 15 groups of standing and calling (nobility, officialdom, clergy, learned, arcane, martial, merchant, craft, landworker, seafaring, performer, underworld, servile, wanderer, outsider) with the creator's 100 backgrounds under them as `job-…` | `backgrounds.ts`, grouping is ours |
| **setting** | 21 places and conditions: court, tavern, market, temple, barracks, road, wild, alley, checkpoint, ruin, harbour, hearth, sickroom, festival, courtroom, library, workshop, night, rain, fog, crowd | ours |
| **state** | 15 passing conditions: drunk, grieving, afraid, angry, in a hurry, on duty, off duty, ill, hungry, proud, devout, child, elder, rich, poor | ours |

A leaning on a facet applies to everything below it: `martial` covers `job-soldier`, `job-guard`, `job-gladiator`…; `lawless` covers Asharien and Västmark; `tribal` covers Kamor, Nuissani, the Raun plains and Takalorr.

## The leanings (308 rows, `content/people/leanings.ts`)
Each row: *who, effort, ±1 or ±2, a short reason, and optionally which skills.* Skill lists can use a wildcard (`H:*` = any craft).

What the first pass says differs (all balance data, edit freely):
- **Peoples** differ mostly in what impresses them and what they will not be sold. Roghan dwarves and Taups take a bribe as an insult (−2); Zolod dwarves love gold (+1). Frakk tirak will not show fear (threaten −1) and respect strength. Kiriya elves are won by beauty and song. Damarians are tight-lipped but fear omens. Kragg-Eyrens are won by honour and strength, not coin.
- **Realms** shift the *system*: bribes are easier in lawless and imperial lands, the law counts in mercantile ones, nobody talks in tyranny but threats work, religion is dangerous to mock in a theocracy and useless to argue in a magocracy.
- **Faiths**: scripture persuades the Daak, Samorist and Mhîm faithful; heresy is a wall (−2) in several; Imay folk and wind monks do not scare; forbidden cults tell outsiders nothing.
- **Standing and calling**: the biggest set. Nobles shrug off threats and bribes but notice polish; officials like the rule book; clergy refuse bribes (−2) and welcome comfort; the learned are won by real knowledge and hard to fool; soldiers are hard to scare but respect weapon skill; merchants know every swindle; the underworld talks to no one and respects the trade; servants and the poor are easy to be kind to, to buy and to scare. A handful of callings have shop talk of their own (innkeeper: bread, ale, wine; smith: iron; physician: the body; librarian: books).
- **Settings**: a tavern loosens tongues and starts quarrels; a market hides hands; a temple, library, courtroom and sickroom forbid provoking (−2); a courtroom forbids bribing and threats; night and rain help sneaking, fog hides, rain kills tracking.
- **States**: drunk (loose tongue, slow argument), grieving (comfort +2, bribe −2), afraid (threaten +2), angry, in a hurry, on duty vs off duty, hungry, child, elder, rich, poor, devout.

Several facets add up, to at most 3 points either way. Each facet counts once.

## What is wired
- **Single rolls** (`situation()` in `core/skillweb.ts`): the person's tags, their kind chain and the scene's tags are matched against the table for the check's intention and the skill rolled. Works for social checks and for other checks that have an intention.
- **The gate scene** is tagged (`asharien`, `checkpoint`, `night`; the guard is `asharier`, `job-guard`, `on-duty`) so it can be tried.

## What is not wired yet
- **Conflicts** (the gate's bribe / threaten / sweet-talk exchanges): they run on Control of situation, not on difficulty. Leanings should become ±1 Control a point there, by the approach's effort. Needs the approach → effort map (bribe, threaten, sweet-talk).
- **The hero's own facets**: today only the target and the place lean. A soldier talking to soldiers, a priest to a priest, or a Taup acting among Taups would have their own table ("kin"). The relations table covers peoples; callings and faiths do not have one yet.
- **Hooks**: a leaning only moves difficulty. Different *outcomes* by type (a noble snubs you, a servant confides) belong with the library hooks.
- **Skill map page**: should list, per skill, who it works best and worst on.

## Open questions for the director
1. Are the sizes right? ±2 is a wall or an open door; ±1 a tendency. Several of the peoples rows are first guesses from a one-line summary.
2. Should the hero's own calling and faith matter (shared faith = kin)? I would add it as a second table, "same facet as the hero", next.
3. Should one calling be tied to *one* kind of effort for each skill ("Baker with an innkeeper to impress") as a visible hint in the scene, or stay hidden and be discovered by the roll log?
