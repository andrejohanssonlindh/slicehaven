# Skill map and people library: handover

*Updated 2026-10-27, session 18 (structure fixed, see the [structure review](skill-structure-review.md)). For the next session. Read this first; for building hooks, **§4 is the recipe**. Read [Skill web](skill-web.md), [People library](people-library.md) and [Ways a skill can be used](ways-of-use.md) only when changing the shape.*

The director's estimate: skills and their connections are about **40% done**. What is built is the data and the first set of rules on top of it; what is missing is mostly more of the same, plus using it in real scenes.

## 1. What is done

### Skills: every one is tagged and has examples
Every skill (433 with expertise, marks, crafts, abilities and the mystic ones; the 8 attributes are tagged sparingly) has at least one **kind of effort** (tag) and 2–3 short examples per tag. Tests enforce both. There are 39 kinds of effort (persuade, impress, ask, threaten, sneak, hide, steal, escape, climb, jump, swim, ride, travel, track, forage, lore, analyse, heal, poison, law, teach, perform, comfort, provoke, craft, force, pick, tame, …). **"Effort" and "tag" are the same word**: the list is `TAG_INFO`.

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
- **The gate scene** is tagged (`asharien, checkpoint, night`; guard: a `human` with `asharier, rural, job-guard, on-duty`; drifter: a `human` with `rural, job-vagrant, poor`) and its three approaches name their effort.
- **Skill map page** (`/slicehaven/skills/`): per skill, the tags, examples, ways of use, and a **"Who and where it works"** section (★ = a row that names this skill). Hook lists show the facet a hook is for.

### Library hooks (what a skill does)
One file per effort in `content/skillweb/hooks/` (21 efforts have hooks).
- **By type of person**, a hook may name a `facet`; people with it (or anything under it) get that reply instead of the general one. Done: **impress** (14 types), **threaten** (12), **ask** (18), **persuade** (14), **distract** (8), **etiquette** (2).
  Which hook wins: a kind → a state → a setting → who they are, the deeper the facet the better. A person's list of checks keeps the library's order of intentions (`hooks/index.ts`).
- **On things**, hooks on the narrow kinds (wall, door, lock, tree, food, tool, container, water, gap, trail), on rock, plant and animal, and on the ill: climb, search, mend, force, pick, forage, tame, study, check for poison, swim, jump, follow and read a trail, tend. Hooks never touch the broad `structure` or `item`, so a scene's own palisade or cart keeps its rules.

### Tests: 240 passing
`tests/hooks.test.ts` (**the rules every hook follows**, and the planned list), `tests/skillmap.test.ts` (tags, examples, every skill tagged), `tests/people.test.ts` (facets, leanings, kin, conflicts, hooks by type of person, hero tags), `tests/things.test.ts` (hooks on things), `tests/social-web.test.ts` (talking, patience, relations).

## 2. What is not done

### Hooks still to write
The list lives in code: **`PLANNED` in `content/skillweb/hooks/index.ts`**, 18 efforts, each with what it acts on (person, thing, place, group, self) and a note. A test keeps it honest both ways. In short:
- **On a person** (ready to write, same pattern as `ask.ts`): sweet-talk, comfort, deceive, provoke, steal, gamble, teach, law. **Bribe** waits for a decision on how bribing works outside the gate guard's conflict approach.
- **On a group** (perform, rally) and **on a place** (sneak, hide, travel) need a new rule in core first (see §2 rules). Survey is a challenge, not a hook. Ride needs a mount kind, analyse needs document/machine kinds, escape is a check on the hero.
- **Mystic skills** have tags and examples for their plain uses only. Casting, the filaments and dissipation are in [magic on the map](magic-on-map.md) and are not started.

### Rules still missing
- **Place hooks and group hooks**: today a hook lives on an object. Sneak and hide belong to the scene itself; perform and rally to everyone present. Needs a small core change (a check on the scene, or on a group object) before their content.
- **Skill-specific leanings in conflicts** (the skill is chosen round by round; today they apply only to single rolls).
- **Clashing facets**: kin only gives bonuses. A devout priest facing a known blasphemer, or a Frakk facing a Roghan, is not modelled.
- **Per-skill NPC counters**: what a person answers a conflict with comes from the approach's lists filtered by what they have, not from a per-skill table.

### Using it
- **No scene beyond the gate** uses any of this. The next test is a second scene (a tavern or a market) that leans on tags, thing kinds and the facet hooks, to see the library carry a whole place. No object in any scene uses the new thing kinds yet.
- **Nothing was checked in a browser** in these sessions (Playwright is not installed on the director's Mac). The Skill map page, the gate's roll log and the new sections have only been tested through unit tests. Look at `/skills/` and play the gate before trusting the display.
- **Balance:** every leaning size, kin value and tag choice is a first guess. Tags drive scene behaviour: widening `threaten`, `bribe` etc. widened what the gate offers; it has not been played since.
- **Translation:** all new text is plain English strings, not `t('key', …)`. The key scheme is decided: hook texts become `hook.<id>.<field>.<n>`, leanings `lean.<leaningId>` (`core/people.ts`). Both ids are stable and unique (tests), so the strings can be moved out later by a script. Don't wrap data strings in `t()` by hand.

## 3. Where things live
| File | What it is |
|---|---|
| `content/skillweb/tags.ts` | `TAG_INFO` (the kinds of effort) and `TAGGED` (tag → skill ids). **Single source** for which skills fit which effort; hooks take their skills from it. Folds in the per-skill files below. |
| `content/skillweb/examples.ts` | `EXAMPLES[tag][skill]`, `examplesOf`, `missingExamples`. Also folds in the per-skill files. |
| `content/skillweb/byskill.ts` + `marks.ts`, `crafts.ts`, `abilities.ts`, `leftovers.ts`, `mystic.ts` | Narrow skills written **per skill**: tags and examples side by side. Edit a mark's, craft's, ability's or mystic skill's entry there. |
| `content/rollables.ts` | `SKILL_SETS` derived from the tags (what scenes accept); `defaultHero`, `heroFromChar` (with hero tags). |
| `content/skillweb/kinds.ts` | The kind tree (`KIND_PARENTS`: what things *are*, peoples merged in), `PEOPLES`, and `DEFAULTS` (patience by facet or kind). |
| `content/skillweb/hooks/<effort>.ts` | **All hooks**, one file per effort: the general hook and every variant by facet or kind. |
| `content/skillweb/hooks/helpers.ts` | `effortHooks`, `say`, `keep`, `flag`, `TALK`, `READ`, `LORE`: what every effort file is written with. |
| `content/skillweb/hooks/index.ts` | `HOOKS` in the order players see them, and `PLANNED` (the efforts still to build). |
| `content/skillweb/index.ts` | `LIBRARY`: hooks, kinds, defaults, relations and the people library together. |
| `content/skillweb/relations.ts`, `challenges.ts`, `uses.ts` | How peoples see each other; challenge templates; the ways a skill can be used. |
| `content/people/` | `facets.ts`, `leanings.ts`, `kin.ts`, `index.ts` (`PEOPLE_LIBRARY`). |
| `core/people.ts` | The rule: `leaningFor`, `kinFor`, `totalLean`, `leaningsForSkill`, `facetChain`. Pure and tested. |
| `core/skillweb.ts` | `HookDef`, hook lookup (`hooksFor`, `expandObject`), `whoChain`, `situation`, `conflictBonus`, `leanOf`, `personFacets`. |
| `core/skillgraph.ts`, `skills/` | The Skill map page. |
| `content/npcs/`, `content/scenes/gate.ts` | People's sheets; the one scene. |

Ids are the creator's: plain for base skills (`Argumentera`), `attr:Intryck`, `E:` expertise, `K:` mark, `H:` craft, `F:` ability. `rollableName(id)` gives the English.

## 4. How to add things

### The model, in four words
- **Kind**: what a thing *is* (`humanoid`, `human`, `animal`, `door`, `water`). Only physical things go in the kind tree.
- **Facet**: who someone is, or where (`job-guard`, `rural`, `poor`, `drunk`, `tavern`). Everything social is a facet, never a kind. A guard is a `human` with the tag `job-guard`.
- **Effort**: what kind of thing you are trying to do, a tag in `TAG_INFO` (`threaten`, `pick`, `forage`). It picks the **skills** (every skill with the tag) and the **leanings**.
- **Intention**: the slot on a thing. One result per intention; a scene's own check with the same intention wins. It is the effort, except when one thing offers two tries of one effort (follow and read a trail are both `track`), or when the engine needs a name (`size-up`, `study` for hidden reads).

### Recipe: hooks for an effort (e.g. comfort)
1. Check `comfort` is in `TAG_INFO` and its skills are tagged with examples. Take it off `PLANNED` in `hooks/index.ts`.
2. Create `hooks/comfort.ts`, copying the shape of `ask.ts` (person) or `force.ts` (thing):
   ```ts
   const comfort = effortHooks('comfort', { ...TALK, difficulty: DIFFICULTY.tricky });
   export const COMFORT: HookDef[] = [
     comfort.general('Comfort {name}', [say('…', 'good'), { mood: 1 }], [say('…')]),
     comfort.forFacet('grieving', 'Sit with {name}', [...], [...], { difficulty: DIFFICULTY.hard }),
     comfort.forFacet('child', …),
   ];
   ```
   - `general` is the default for anyone humanoid (or the effort's base kind). Its text must be true of anyone.
   - `forFacet(facet, …)` answers differently for a kind of person or place. Ids come out as `comfort-grieving`.
   - `forKind(kind, …)` is for things (`force.forKind('door', …)`). Ids come out as `force-door`.
   - Skills come from the tag. Narrow with `{ only: [...] }` (each must carry the tag). Add skills that know *this thing* without the tag with `{ also: [...] }`; they show on the Skill map as exceptions. Prefer tagging the skill (with examples) when it fits the effort in general.
   - A hidden read: `forKind(kind, label, LORE, LORE, READ)`. It only appears on things that carry `lore`.
   - Kept advantages (`keep(kind, n, label)`) are for an effort (`'sneak'`, `'steal'`, `'bribe'`) or `'social'` for any later talk.
3. Add the array to `HOOKS` in `hooks/index.ts`, where its intention should sit in the list players see.
4. `npm test`: `tests/hooks.test.ts` checks the effort, kind, facet, skills, ids, tokens and the planned list.

### Other additions
- **A kind of effort:** add to `TAG_INFO`, give at least one skill the tag (in `TAGGED`, or in a per-skill file) with examples, and either write its hooks or list it in `PLANNED`.
- **Tag a skill:** a mark, craft, ability or mystic skill → edit its entry in the per-skill file (tags and examples together). Other skills → `tags.ts` and `examples.ts`.
- **A leaning:** one row in `leanings.ts` (`L(who, effort, ±1/2, 'why', optional skills)`). A test checks the facet, the effort and the skills are real, and that `leaningId` stays unique.
- **A facet:** `facets.ts` (settings and states are plain lists; peoples, realms, faiths and callings come from the creator's data). Patience for a facet goes in `DEFAULTS` (`kinds.ts`); how a facet sees peoples goes in `relations.ts` (like `rural`).
- **A kind:** only for a new sort of *thing* (a horse, a document, a machine): one line in `kinds.ts` under its parent.
- Always `npm test`, `npx tsc --noEmit`, `npm run build`; commit and push in small steps.

## 5. Pitfalls learned (read before changing things)
- **Hovliv (Court Life) stays etiquette-only.** Tagging it for persuade/ask/read-people changed which hook a plain human gets, and a test pins "depends on who".
- **Tags drive behaviour.** Adding a skill to a tag changes what the gate offers. Check the tests and play it.
- **The order of `HOOKS` is what players see.** An intention is placed where it first appears in `hooks/index.ts`, so put a new effort's array where it belongs, not just at the end.
- **Dice in tests:** sixes re-roll in this system, so a "good roll" in a test is `dice(5, 5, 5, …)`, not sixes.
- **A zero shift must be `+0`:** write `0 - 2 * x`, not `-2 * x` (a `-0` fails `toBe(0)`).
- **A particular hook must not reorder a person's checks.** `hooksFor` returns the library's intention order; the first check listing a skill is what "use a skill here" picks.
- **Facet ids can collide with kinds.** Callings are `job-…` for this reason. Peoples are deliberately both (an Asharian is a kind of human and a facet), built from the same data.
- **The default for a general hook must be true of any such thing.** A search that finds nothing says "nothing out of place" because a thing that hides something has its own check, which wins.
- **Hidden reads** (lore, insight, study) give the true text on success and a plausible wrong twin on failure, never "nothing".
- **Rules of the repo:** edit files with Write/Edit, not Bash (I broke this a few times with `sed`/heredocs; it was in the commits but should not be repeated). No book text in the repo, no brand name. English only.

## 6. Suggested order
1. **Look at it:** open `/skills/` and play the gate once; fix whatever the display or balance shows.
2. **A second scene** (tavern or market) with tagged people, thing-kind objects and scene tags, to exercise the library for real.
3. **Person hooks for sweet-talk, comfort, deceive, provoke, steal** with the §4 recipe (this is content work a cheaper model can do); decide how bribing works.
4. **Place and group hooks**: the small core change, then sneak, hide, perform, rally.
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
