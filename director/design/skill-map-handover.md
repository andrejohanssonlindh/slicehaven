# Skill map and people library: handover

*Updated 2026-10-27, end of sessions 16–17. For the next session. Read this first, then [Skill web](skill-web.md) (the design), [People library](people-library.md) and [Ways a skill can be used](ways-of-use.md). The devlog has the story session by session.*

The director's estimate: skills and their connections are about **40% done**. What is built is the data and the first set of rules on top of it; what is missing is mostly more of the same, plus using it in real scenes.

## 1. What is done

### Skills: every one is tagged and has examples
Every skill (433 with expertise, marks, crafts, abilities and the mystic ones; the 8 attributes are tagged sparingly) has at least one **kind of effort** (tag) and 2–3 short examples per tag. Tests enforce both. There are 36 kinds of effort (persuade, impress, ask, threaten, sneak, hide, steal, escape, climb, jump, swim, ride, travel, track, forage, lore, analyse, heal, poison, law, teach, perform, comfort, provoke, craft, …).

Tags were checked once against the book's descriptions, and several were corrected (e.g. Fine Hands is about looks, not nimbleness; Battlefield Eye is an unsettling stare; Creaking Joints is cracking knuckles). Many choices are still first guesses.

### The people library: types of people and situations
- **252 facets** (`content/people/facets.ts`): peoples (5 kinds, 22 human peoples, 6 elf, 5 dwarf, 4 tirak houses), 18 realms in 9 kinds, 26 faiths, 15 standing-and-calling groups with the creator's 100 backgrounds as `job-…`, 21 settings (tavern, court, night, rain, crowd…), 15 states (drunk, grieving, afraid, on duty, rich, poor…). Mostly built from the creator's own data so they never disagree.
- **308 leanings** (`content/people/leanings.ts`): "for this facet, this effort is easier (+) or harder (−) by 1–2 points, because…", optionally only for named skills (`H:*` = any craft). Several facets add up to at most ±3.
- **Kinship** (`content/people/kin.ts`, 3 rules): sharing a faith, a walk of life or a homeland with the person helps some efforts by 1.
- A people is now a **kind** of its family (an Asharian is a kind of human).

### Where it is wired in
- **Single rolls** (`situation()` in `core/skillweb.ts`, takes the skill rolled): the person's tags and kinds, the scene's tags and what you share move the difficulty 2 per point. The reasons show in the roll log.
- **Conflicts** (`conflictBonus()`): each approach has an `effort`; leanings add Control. (Leanings that name particular skills are skipped here.)
- **The hero** carries `tags` (people, homeland, faith, calling) from the creator; the default shepherd is `asharier, asharien, job-herder`.
- **The gate scene** is tagged (`asharien, checkpoint, night`; guard: `asharier, job-guard, on-duty`) and its three approaches name their effort.
- **Skill map page** (`/slicehaven/skills/`): per skill, the tags, examples, ways of use, and a **"Who and where it works"** section (★ = a row that names this skill). Hook lists show the facet a hook is for.

### Library hooks (what a skill does)
- **By type of person**, a hook may name a `facet`; people with it (or anything under it) get that reply instead of the general one. Done: **impress** (14 types), **threaten** (11), **ask** (17), **persuade** (14), **distract** (8). Files: `content/skillweb/outcomes.ts`, `outcomes-talk.ts`.
  Which hook wins: a kind (e.g. the guard's own) → a state → a setting → who they are, the deeper the facet the better. A person's list of checks keeps the library's order of intentions.
- **On things**, 28 hooks on 10 new narrow kinds (wall, door, lock, tree, food, tool, container, water, gap, trail) and on plant, animal and the ill: climb, search, mend, force, pick, gather, snare, calm, study, check for poison, swim, fish, jump, follow and read a trail, tend. File: `content/skillweb/things.ts`. The new kinds are in `THING_KINDS`. Hooks never touch the broad `structure` or `item`, so a scene's own palisade or cart keeps its rules.

### Tests: 232 passing
`tests/skillmap.test.ts` (tags, examples, every skill tagged), `tests/people.test.ts` (facets, leanings, kin, conflicts, outcome hooks, hero tags), `tests/things.test.ts` (thing hooks).

## 2. What is not done

### Hooks still to write
- **Social efforts with no general hook yet:** sweet-talk, comfort, deceive, provoke, rally, bribe. (There is no general bribe hook on purpose: the gate guard has a bribe *approach*, and a hook would duplicate it. Decide how bribing should work for everyone else first.) Also variants by type for etiquette and size-up (read people).
- **Non-social efforts with no hook:** sneak and hide (they belong to a *place*, so use the scene's tags: night, rain, fog and crowd already lean them), steal (pickpocketing a person), escape (bonds, grips), ride, lore of places and peoples, analyse, law, teach, perform, craft beyond mending.
- **Mystic skills** have tags and examples for their plain uses only. Casting, the filaments and dissipation are in [magic on the map](magic-on-map.md) and are not started.

### Rules still missing
- **Skill-specific leanings in conflicts** (the skill is chosen round by round; today they apply only to single rolls).
- **Clashing facets**: kin only gives bonuses. A devout priest facing a known blasphemer, or a Frakk facing a Roghan, is not modelled.
- **Per-skill NPC counters**: what a person answers a conflict with comes from the approach's lists filtered by what they have, not from a per-skill table.

### Using it
- **No scene beyond the gate** uses any of this. The next test is a second scene (a tavern or a market) that leans on tags, thing kinds and the facet hooks, to see the library carry a whole place. No object in any scene uses the new thing kinds yet.
- **Nothing was checked in a browser** in these sessions (Playwright is not installed on the director's Mac). The Skill map page, the gate's roll log and the new sections have only been tested through unit tests. Look at `/skills/` and play the gate before trusting the display.
- **Balance:** every leaning size, kin value and tag choice is a first guess. Tags drive scene behaviour: widening `threaten`, `bribe` etc. widened what the gate offers; it has not been played since.
- **Translation:** all new text is plain English strings, not `t('key', …)`. The groundwork exists in `src/i18n/`; nothing has been moved in.

## 3. Where things live
| File | What it is |
|---|---|
| `content/skillweb/tags.ts` | `TAG_INFO` (kinds of effort) and `TAGGED` (tag → skill ids). **Single source** for which skills fit which effort. Folds in the per-skill files below. |
| `content/skillweb/examples.ts` | `EXAMPLES[tag][skill]`, `examplesOf`, `missingExamples`. Also folds in the per-skill files. |
| `content/skillweb/byskill.ts` + `marks.ts`, `crafts.ts`, `abilities.ts`, `leftovers.ts`, `mystic.ts` | Narrow skills written **per skill**: tags and examples side by side. Edit a mark's, craft's, ability's or mystic skill's entry there. |
| `content/rollables.ts` | `SKILL_SETS` derived from the tags (what scenes accept); `defaultHero`, `heroFromChar` (with hero tags). |
| `content/skillweb/index.ts` | The kind tree (`KIND_PARENTS`, with peoples and thing kinds merged in) and `LIBRARY` (all hooks, relations, people library). |
| `content/skillweb/social.ts` | General social hooks (persuade, impress, distract, ask, etiquette, intimidate…). |
| `content/skillweb/outcomes.ts`, `outcomes-talk.ts` | Hooks by type of person. Exports the helpers `social`, `say`, `keep`. |
| `content/skillweb/things.ts` | Hooks on things, and `THING_KINDS`. |
| `content/skillweb/relations.ts`, `challenges.ts`, `uses.ts` | How peoples see each other; challenge templates; the ways a skill can be used. |
| `content/people/` | `facets.ts`, `leanings.ts`, `kin.ts`, `index.ts` (`PEOPLE_LIBRARY`). |
| `core/people.ts` | The rule: `leaningFor`, `kinFor`, `totalLean`, `leaningsForSkill`, `facetChain`. Pure and tested. |
| `core/skillweb.ts` | Hook lookup (`hooksFor`, `expandObject`), `situation`, `conflictBonus`, `leanOf`, `personFacets`. |
| `core/skillgraph.ts`, `skills/` | The Skill map page. |
| `content/npcs/`, `content/scenes/gate.ts` | People's sheets; the one scene. |

Ids are the creator's: plain for base skills (`Argumentera`), `attr:Intryck`, `E:` expertise, `K:` mark, `H:` craft, `F:` ability. `rollableName(id)` gives the English.

## 4. How to add things
- **A kind of effort:** add to `TAG_INFO` and give at least one skill the tag (in `TAGGED`, or in a per-skill file) with examples.
- **Tag a skill:** a mark, craft, ability or mystic skill → edit its entry in the per-skill file (tags and examples together). Other skills → `tags.ts` and `examples.ts`.
- **A leaning:** one row in `leanings.ts` (`L(who, effort, ±1/2, 'why', optional skills)`). A test checks the facet, the effort and the skills are real.
- **A facet:** `facets.ts` (settings and states are plain lists; peoples, realms, faiths and callings come from the creator's data).
- **A hook by type of person:** a row in `outcomes.ts` / `outcomes-talk.ts` with a `facet` and the same `intention` as an existing general hook (a test checks). An `ask` variant must keep `{ set: 'asked:{id}' }` on success.
- **A hook on a thing:** a row in `things.ts`; a new kind goes in `THING_KINDS`. Use `read(…)` for hidden reads (needs `lore` on the object). Never put a hook on `structure` or `item` themselves.
- Always `npm test`, `npx tsc --noEmit`, `npm run build`; commit and push in small steps.

## 5. Pitfalls learned (read before changing things)
- **Hovliv (Court Life) stays etiquette-only.** Tagging it for persuade/ask/read-people changed which hook a plain human gets, and a test pins "depends on who".
- **Tags drive behaviour.** Adding a skill to a tag changes what the gate offers. Check the tests and play it.
- **The intention names are not always the tag names:** the conflict code and old hooks use `intimidate` (→ `threaten` via `effortOf`). Leanings are keyed by tag name.
- **Dice in tests:** sixes re-roll in this system, so a "good roll" in a test is `dice(5, 5, 5, …)`, not sixes.
- **A zero shift must be `+0`:** write `0 - 2 * x`, not `-2 * x` (a `-0` fails `toBe(0)`).
- **A particular hook must not reorder a person's checks.** `hooksFor` returns the library's intention order; the first check listing a skill is what "use a skill here" picks.
- **Facet ids can collide with kinds.** Callings are `job-…` for this reason (`guard`, `soldier` are already taken).
- **The default for a general hook must be true of any such thing.** A search that finds nothing says "nothing out of place" because a thing that hides something has its own check, which wins.
- **Hidden reads** (lore, insight, study) give the true text on success and a plausible wrong twin on failure, never "nothing".
- **Rules of the repo:** edit files with Write/Edit, not Bash (I broke this a few times with `sed`/heredocs; it was in the commits but should not be repeated). No book text in the repo, no brand name. English only.

## 6. Suggested order
1. **Look at it:** open `/skills/` and play the gate once; fix whatever the display or balance shows.
2. **A second scene** (tavern or market) with tagged people, thing-kind objects and scene tags, to exercise the library for real.
3. **Social hooks for sweet-talk, comfort, deceive, provoke, rally**, by type of person, in the same pattern; decide how bribing works.
4. **Place-based hooks** for sneak and hide, then steal, escape and ride.
5. **Conflict refinements:** skill-specific leanings per round; clashing facets.
6. **Balance pass** over leanings, kin and tags.
7. **Mystic casting** with the filaments, when the engine is ready.

## 7. Writing guidance (from the director)
- **Skills must feel usable.** Many skills should work on the same everyday things; no skill is a single-purpose key.
- **Intentions, not just actions:** the tag is *why* you do it, the example is *how this skill does it*.
- **Physique** helps to threaten, distract and impress, hardly to barter. Presence is natural in most talking, Alertness in reading and searching.
- **Marks and crafts are skills, tagged like skills, but narrow:** a Scary mark when threatening; bread knowledge to impress innkeepers. Crafts are seldom useful socially, but sometimes (decisions log).
- **Our own words, short, visible.** "Pay a compliment that is specific and true."
- **Attributes are a fallback**, not a main tool: the locked roll is free, Presence is natural, Physique when aggressive, a few more by game difficulty. Tag them sparingly.

## 8. Where each skill is described (sources)
Every skill has a short description in the character book, chapter "Skills". Read it before tagging; don't tag by name alone. The extracted text is in `reference/` (gitignored, **never commit it or paste it into the repo**).
`reference/p/NNN.txt` is one PDF page each, **PDF page = book page + 3**:
- Knowledge: book p.172 → `p/175`; Mystic 174 → `p/177`; Movement 175 → `p/178`; Social 176 → `p/179`; Combat 177 → `p/180`; Wilderness 178 → `p/181`.
- Expertise 180 → `p/183`–`p/185`; Abilities 183 → `p/186`; Crafts 185 → `p/188`; Marks 188 → `p/191`.
- Which skills the rules call suitable for each kind of challenge or conflict: `reference/regel.txt` from line ~5250 (challenges) and ~6570 (conflicts, social around ~6940).

## 9. Open questions for the director
- How many examples for a narrow expertise: one line, or still two?
- A "random example" or "which skill for this effort" view on the Skill map, for gauging balance?
- Are the leaning sizes right (±2 a wall or an open door, ±1 a tendency)?
- Should the scene hint at what suits a person ("an innkeeper: talk shop") or leave it to be found through the roll log?
- Should facets clash (a devout priest versus a known blasphemer), not only match?
- How should bribing work for everyone who is not the gate guard?
