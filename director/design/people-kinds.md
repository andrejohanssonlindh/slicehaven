# Kinds of person, and the character behind each one

*2026-10-30, revised the same day after the director's correction: characters are **authored and composed, not rolled**. Step 3 of [the world structure](world-structure.md). Nothing here is built yet.*

## The correction, in one line
A character is never "generated" by dice unless someone asks for it. An innkeeper has an **innkeeper skill set**, written down once, and every innkeeper gets it. The same goes for guards, bandits and wolves: **enemies have character sheets too, made the same way**. So the strategy is not a generator but a **library of reusable, named pieces that are combined on purpose**.

## Three layers
| Layer | What it is | Where | Example |
|---|---|---|---|
| **Kind of person** | What sort of person: how they look in general, what they do all day, and which **template** gives them their sheet | `content/things/kinds/people.ts` (a kind of thing, like a well) | `innkeeper`, `guard`, `bandit`, `wolf` |
| **Person** | One individual placed in a map: a kind, a name, a home, optional changes to the sheet | the map file (`people: [...]`) | "Mara, the innkeeper of the Ferry Inn" |
| **Sheet** | The character as the world reads it: people (race), homeland, religion, background, age, gender, attributes, every skill's value, languages, marks, gear, drives, details | plain data, `core/characters/sheet.ts` | Mara's sheet |

The **hero** is a person like the rest. Their sheet comes from the creator: `sheetOf(derive(state))`. So everything that reads a sheet (rolls, facets, the tap-to-inspect panel, fights) reads one shape, whoever it belongs to.

## Where a sheet comes from: templates, composed
A **template** is a reusable named piece of sheet, one small file each in `content/characters/templates/`, inheriting down a tree exactly as kinds of thing do ("a guard is a kind of fighter"):

```ts
const innkeeper: Template = {
  id: 'innkeeper',
  is: 'tradesperson',
  background: 'Krögare',                         // the creator's own calling, for its facet (job-innkeeper) and wording
  skills: {                                      // the innkeeper skill set: value of each at a journeyman
    'H:Kock': 4, 'K:Välgödd': 4, 'K:Välkomnande leende': 4, 'E:Argumentera': 3, 'E:Räkna': 3, ...
  },
  core: ['H:Kock', 'K:Välkomnande leende', 'E:Argumentera'],   // what "master" and "apprentice" move
  languages: { spoken: ['common'] },
};
```
A **sheet** is then `buildSheet(spec)`, a plain function with no dice:

`sheet = people's base + template chain (parents first) + grade + the person's own changes`

- **People** (race): the base attributes and traits of the people (the creator's `peoples.ts`), so a dwarf innkeeper is a dwarf.
- **Template chain**: `tradesperson` → `innkeeper`; each adds or raises skills, languages, gear. A later piece wins over an earlier one for the same skill.
- **Grade** (`apprentice`, `journeyman`, `master`; default journeyman): moves the template's `core` skills by a fixed step (−1, 0, +1 or +2). Not random: Mara is a master, her cousin's tavern has an apprentice.
- **The person's own changes** (`sheet: { skills: {'E:Gyckla': 3}, name: 'Mara' }`): for the named and the special. A story character can be a template plus a dozen overrides, or a **fully written sheet** in `content/characters/people/` with no template at all.

### Variation is opt-in, never a default
Three ways to differ, in order of how often they should be used:
1. **Authored** (default): the sheet is exactly what the files say. Same every time, by design.
2. **Grade and small changes**: an explicit field in the map.
3. **Seeded variation, only if a person says `vary`**: for crowds (market-day passers-by): names from the name tables, looks, ±1 on non-core skills, from a hash of the person's id. Deterministic too, so there is no save to keep, but it is a choice made for that person, never for a named one.

## Enemies are people with a different template
A bandit, a wolf, a wight: a **kind of person** (or creature) that names a template, same as an innkeeper.

- Fighting templates are the same kind of file: `fighter` → `bandit` → `bandit-archer`, `brute`, `veteran`.
- **Threat** is the grade: the same `bandit` template at `apprentice`, `journeyman` or `master` is three tiers of enemy, so encounters scale without writing new sheets.
- Creatures that the creator cannot make (a wolf, a wight) need things it does not have: natural attacks, hide, a different set of attributes. The sheet has an optional `natural` block (attack damage, armour, speed) for those, filled by the template. Animals get a smaller sheet; how fights read it is decided when fights are built (this design only reserves the place).
- **Wounds, fatigue, mood and where they are** are the person's *state*, not the sheet. A bandit that is hurt is the same sheet with more damage on the person.

## The creator is the source of the starting sets
The creator already carries the tabletop's own professions: a background such as **Innkeeper (Krögare)** grants `H:Kock 4, K:Välgödd 4, K:Välkomnande leende 4`. We use those as **starting points, not as the answer**:
- A helper `templateFromBackground(id)` writes the first draft of a template from a background's grants (and its facet), so the 100 callings are a quick start.
- The authored template file then **replaces** the draft: add the skills an innkeeper in *our* world needs, remove what does not suit. Authored always wins.
- A template may also borrow from an **archetype** (the creator's life paths), when it fits.

## What reads the sheet
One source of truth, derived and never copied:
- **Facets** (what the people library's leanings read) come from the sheet: people → `peopleFacet`, homeland → the realm, religion → the faith, background → the `job-…` facet. The kind's own facets are only extras (`on duty`, `drunk`). No hand-written tags to keep in step.
- **Look**: the figure takes people, age and gender from the sheet; the kind adds clothes and tools.
- **Rolls against them and by them**: skills and attributes. **Talk**: languages. **Wants**: drives. **Tap**: name, people, calling, best skills, story.

## Checks that keep the library honest (tests)
- Every skill id in a template exists in the skill library; every value is within the creator's limits.
- Templates form a tree with no loops, and each chain ends at a root.
- **Cost report**: each template's skills are priced in the creator's own units, so an enemy or an NPC can be compared with what a player of the same standing would have. It is a report, not a rule: the director can decide a master is worth more than the creator would allow.
- Same spec → byte-identical sheet.

## Build order (each step small, tested, pushed)
1. **`Sheet` and `buildSheet`** (`core/characters/`): the shape, template inheritance, grade, overrides; a handful of templates (tradesperson, innkeeper, villager, fighter, guard, bandit) as files; the checks above. No world changes yet.
2. **`sheetOf(derive(state))`** for the hero, so one shape serves both.
3. **Kinds of person** (`content/things/kinds/people.ts`): look, routine, template; `person` joins the kind tree.
4. **The cast from the map** (`MapSpec.people`): the world builds its walkers and routines from them; the hard-wired hero, villager, keeper and door torch go (review item 9).
5. **Facets and look from the sheet.**
6. **Tap a person**: who they are; later, use skills on them (plan step 5).
7. `templateFromBackground` and the cost report, to fill out the library of professions.

## Decided here, change if you disagree
- Characters are authored; dice are for variation someone chose, per person.
- "Made" in this design means **resolved**: `buildSheet` composes the pieces the first time a sheet is needed and keeps the result while they are near, like furnished rooms. It does not mean random.
- The creator stays the one place that knows the rules of making a *player* character; the world reads its output and never re-implements it. NPCs and enemies use templates, not a replay of the creator.
- Named story people are templates plus overrides, or fully written; they are never varied.
- Animals and monsters use the same pipeline with the `natural` block; the exact combat reading comes with fights.

Open for the director: see Q26 in [questions](../questions.md).
