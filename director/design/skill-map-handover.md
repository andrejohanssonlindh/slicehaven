# Skill map: handover for filling it in

*2026-10-27. For the next session (the director will ask Sonnet to populate the full skill/tag map). Read this first, then [Skill web](skill-web.md) for the design behind it.*

## The job
Every skill in the creator (about 190 with expertise, marks, crafts and abilities, plus the 8 attributes) should be **tagged for the kinds of effort it suits**, and each tagging should have **2–3 short examples** of what a character would actually *do*. Today 13 kinds of effort exist and about 40 skill/effort pairs have examples. The rest is yours.

The model is `src/content/skillweb/examples.ts`. Look at it before writing anything: *Physique to impress* reads "flex a muscle, or lift something heavy that others struggled with". That is the standard: concrete, visible, a different kind of act per line.

## What exists (where things live)
| File | What it is |
|---|---|
| `src/content/skillweb/tags.ts` | `TAG_INFO` (each kind of effort: label + one-line meaning) and `TAGGED` (tag → skill ids). **The single source** for which skills fit which effort. |
| `src/content/skillweb/examples.ts` | `EXAMPLES[tag][skill] = [2–3 lines]`, `examplesOf(skill)`, `missingExamples()` (what is left to write). |
| `src/content/rollables.ts` | `SKILL_SETS` are **derived from the tags** (e.g. `SKILL_SETS.threaten = skillsWith('threaten')`). Changing a tag changes what scenes accept. |
| `src/content/skillweb/social.ts`, `index.ts` | Library **hooks**: what a skill can do to a thing, by kind (`humanoid`, `rock`…). They list skills via the sets above. |
| `src/content/skillweb/relations.ts` | How peoples see each other (balance data). |
| `src/content/skillweb/challenges.ts` | Challenge templates (Survey the area). |
| `src/content/npcs/` | People's sheets: what they actually have. |
| `src/core/skillgraph.ts` + `src/skills/` | The **Skill map** page (`/slicehaven/skills/`): pick a skill, see tags, examples, hooks, conflicts, who answers with what. Shows "Examples written for N of M". |
| `tests/skillmap.test.ts` | Checks tags and examples (see "Rules the tests enforce"). |

Ids are the creator's: plain for base skills (`Argumentera`), `attr:Intryck` for attributes, `E:` expertise, `K:` mark, `H:` craft, `F:` ability. Names are Swedish keys; `rollableName(id)` gives the English.

**Ways of use:** see [Ways a skill can be used](ways-of-use.md) for every way we have considered; the Skill map shows which of them a skill takes part in. Weapon skills are tagged for threaten and impress; add them to other efforts where it makes sense (a bow to hunt or to hit a mark, a shield to block a door).

## Status (2026-10-27, end of session 16)
**Every skill** now has at least one tag and examples (a test enforces it). Social, movement, wilderness, knowledge and most expertise are written directly in `tags.ts` / `examples.ts`. The narrow groups are written **per skill** (tags and examples side by side) and merged in by `byskill.ts`: `marks.ts`, `crafts.ts`, `abilities.ts`, `leftovers.ts`, `mystic.ts`. To add a tag to a mark, craft, ability or mystic skill, edit its entry there.
The tags were checked once against the book's descriptions (several marks were corrected, e.g. Fine Hands is about looks, not nimbleness; Battlefield Eye is an unsettling stare, not tactics). Mystic skills only have their plain non-casting uses; casting itself is in [magic on the map](magic-on-map.md). Many choices are still first guesses, so expect balance passes. Library **hooks** (what a skill does to a type of person) and **skills tied to types of people and situations** are the next steps, in that order.

## Where each skill is described (sources)
Every skill has a short description in the character book, chapter "Skills". Read it to decide *what the skill is for* before tagging it; don't tag by name alone. The extracted text is in `reference/` (gitignored, **never commit it or paste it into the repo**; write our own words).
`reference/p/NNN.txt` is one PDF page each, **PDF page = book page + 3**:
- Knowledge: book p.172 → `p/175`; Mystic 174 → `p/177`; Movement 175 → `p/178`; **Social 176 → `p/179`**; Combat 177 → `p/180`; Wilderness 178 → `p/181`.
- Expertise 180 → `p/183`–`p/185`; Abilities 183 → `p/186`; Crafts 185 → `p/188`; Marks 188 → `p/191`. (Same text, expertise onward, in `reference/other.txt`.)
- Which skills the rules call **suitable** for each kind of challenge or conflict ("Lämpliga slag", locked rolls, the "common defence rolls"): `reference/regel.txt` from line ~5250 (challenges) and ~6570 (conflicts, incl. the social ones around line 6940). Good evidence for tags, and for which attribute is the natural locked roll.

## How to add things
1. **A new kind of effort** (e.g. `forage`, `fire`, `track`, `heal`, `lore`, `craft`, `hide`): add it to `TAG_INFO` (label + one line) and to `TAGGED` (skill ids). Keep tags to *what you are trying to do*, not to a skill group.
2. **Tag a skill:** add its id to every effort it really suits. A skill belongs to several tags; most skills should have 2–4. Attributes: sparingly (see below).
3. **Examples:** add `EXAMPLES[tag][skill] = ['…', '…']`.
4. Run `npm test`, then open `/skills/` (dev server) and look at the skill: the coverage line and the "No examples yet for…" notes show what is left.
5. Commit and push in small steps (one skill group per commit).

## Rules the tests enforce
- Every tag has a `TAG_INFO`; every id in a tag is a real skill or attribute.
- Examples exist only for skills that carry the tag; each skill has **2–3** examples; each is a full sentence of 10–120 characters, no duplicates.
- The kinds of effort in `EXAMPLES` and `TAGGED` match (a new tag needs at least one example).
- Survey challenge skills carry the `survey` tag; persuade hooks list only `persuade` skills.

## Writing guidance (from the director)
- **Skills must feel usable.** Many different skills should work on the same everyday things, and no skill should be a single-purpose key. Give each skill several uses across efforts.
- **Intentions, not just actions:** the tag is *why* you do it (impress, distract, ask…), the example is *how this skill does it*. The same skill can serve different intentions (Charm: impress, distract, ask).
- **Physique** is good for threatening, distracting and impressing, and hardly for bartering. Think the same way about the other attributes: *Presence* is natural in most talking, *Alertness* in reading and searching.
- **Our own words, short, visible.** "Pay a compliment that is specific and true", not "uses social grace". No book text, no brand name.
- **English only.** New player-facing text is English; content files use plain strings today (the `t()` groundwork is in `src/i18n/` but nothing has been moved in).
- **Knowledge, lore and insight skills are hidden reads:** their *outcomes* must give a plausible wrong answer on failure (never "nothing"). That is for the later hook step, but write their examples with that in mind ("tell from the birds whether the wood is watched" is something you can be right or wrong about).

## Things to know before you change anything
- **Tags drive behaviour.** Adding a skill to `threaten` lets it be used for threatening in the gate scene's conflict (the approach lists come from the sets). Check `npm test` and, if you can, play the gate.
- **Attributes are a fallback, not a main tool** in conflicts and challenges: the locked roll is free, Presence is always natural, Physique when the approach is aggressive, and a few more by game difficulty (easy 2, normal 1, hard 0; at −2D6 if you have no skill that fits). Tagging attributes widely does not widen that. Keep attribute tags to where they are natural.
- **Library hooks are a separate step** (what a skill *does* to a thing: outcome texts, mood, kept advantages). This pass is tags and examples. Do not write hooks until the tags exist; then do them one kind of effort at a time, in `content/skillweb/<effort>.ts`.
- **NPC counters are by approach, not by skill.** What a person answers with comes from the approach's `answers`/`moves` lists filtered by what *they have*. A per-skill counter table is not built.
- **Game difficulty** (Easy/Normal/Hard, the "Game" button under the scene) controls attribute use, side tries on people with a social challenge, and whether starting Control is shown. Nothing in the tags depends on it.
- **No backwards compatibility** and no saves involved: this is all data.

## Suggested order
1. Social skills (12): they have the most hooks already. Make sure each has persuade/impress/ask/bribe/threaten/etc. tags where it fits.
2. Movement and wilderness skills: climb, survey, plus new efforts (sneak, hide, forage, fire, track, ride, swim, jump).
3. Knowledge skills: new efforts such as `lore` (recall), `analyse`, `heal`, `law`, `trade-know-how`; they need hidden-read outcomes later.
4. Expertise, marks, crafts and abilities, a group at a time. Many only get a handful of examples, which is right.
5. Mystic skills last: they belong to the filaments and [magic on the map](magic-on-map.md).
6. Fill gaps in the tests: a rule "every skill has at least one tag" is a goal, **not yet a test** (add it when coverage is close).

## Open questions for the director (not blockers)
- ~~Marks as skills or modifiers?~~ Answered: they are skills, narrow (decisions.md). Crafts the same, rarely social.
- How many examples is enough for expertise with a narrow use: one line, or still two?
- Should the Skill map get a "random example" or a "which skill for this effort" view for gauging balance?
