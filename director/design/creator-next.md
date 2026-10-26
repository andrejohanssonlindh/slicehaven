# Character creator — next design pass

*2026-10-26, from the director's review. Plans only, nothing here is built yet. Ranked list of everything open: [Backlog](backlog.md). Current state of the creator: [Character creator](character-creator.md).*

## 1. The creator is not a free pen-and-paper creator
The creator will be used a few times, and often with parts already decided. Example: you find a grumpy dwarf who joins you; his people and primary drive are fixed, the rest is open.

### Design: locks
A **preset** is a partial character state plus a list of **locks**.
- `preset: { state: Partial<CharState>, locks: LockKey[], note?: string }`
- A lock key is a decision the player can't change: `homeland`, `background`, `people`, `religion`, `archetype`, `environment`, `drive.primary`, `drive.secondary`, `name`, a specific event roll (`event:<slot>`), a pick (`pick:<key>`).
- A locked step is shown folded, with a small lock mark and the reason ("Fixed for this companion"). Later steps work as normal, because everything is derived from state (see the creator's design).
- Presets start the creator at `/chargen/?preset=<id>`; they are plain data in `src/content/chargen/presets.ts`. A scene or story beat can open the creator with one.
- Locked values must still be validated: a preset that locks a combination the rules don't allow shows a warning (so we notice content bugs), but never blocks.
- A step with **all** decisions locked is skipped automatically.

Build: an `applyPreset(state, preset)` pure function in `core/chargen`, a `isLocked(key)` helper the UI reads, tests that locked keys survive "back and change an earlier step". Small, one session.

## 2. Clear event cards (largest usability problem)
Today's card:
> Intrigues & Misdeeds · from Leader · 45 · Inspires trust · Social units (2) · Choose one: Honest Air (8) / Honest Face (8)

Even someone who knows the game can't tell what it is. Causes: terse labels, names kept close to the source, and unexplained numbers.

### Target card
```
INTRIGUES & MISDEEDS            [what the table is: one line]
Roll 45 (on Leader)             [which of your sources gave you this roll]
Inspires trust                  [result name]
  People believe you at first meeting. [one plain sentence, our own words]
You get:   2 social skill units   (spend them in the Skills step)
You choose: one trait
   ○ Honest Air     [+ what it does in one short line]
   ○ Honest Face    [+ one short line]
```
Rules for the cards:
- Never show a bare number. "(8)" becomes the thing it is: *a trait that costs 8*, or *a level 8 skill*, as the data says.
- "from Leader" → "Roll given by: your background, *Leader*".
- Units: *"2 social skill units (spend later)"*, and a link to the pool in the Skills step.
- Choices show the effect of each option.
- Every result has the same four lines: **what**, **why you care** (a hook for the story), **you get**, **you choose**.

### Handover for Haiku (content pass)
- Data: each event result gets two new optional fields: `desc` (one plain sentence) and `hook` (one sentence: how this could come up in play). Our own words, short. No source text.
- Work through one table at a time (`src/content/chargen/events/*.ts`), a few dozen rows per commit.
- Also add a **trait/skill glossary** (the "Honest Air" type of names): one line each, used for the choice options. File: `src/content/chargen/glossary.ts`.
- A test: every result has `desc`; every trait option mentioned in a grant has a glossary line.
- The UI change (card layout) is separate and small: do it first, so the fields can be filled while it reads "—".

Open: is "Karaktärsdrag" (trait) vs. "skill points" what the Honest Air/Face choice is? The grant says "choose one" of two *traits*; the glossary line will settle what the player sees. Check against the data before writing.

## 3. Life events: every roll result is a hook
Long-term goal: **most roll results connect to the game somewhere**, even if only in one or two interactions or skill checks.

### Step A — save them as major events
- Each rolled result is stored on the character as a **life event**: `{ table, roll, name, desc, tags[] }`.
- The sheet shows them under **Major events** (it already lists them as "Table N: name"; add the description).
- Helps in the creator too: the player sees why they got a thing.

### Step B — tag them
Every result gets `tags`: who or what it concerns (`family`, `enemy`, `faith`, `guild`, `crime`, `war`, `place:<x>`, `skill:<x>`, `person:leader`), and optionally `hooks`.

### Step C — a searchable hook list
- A generated page in the Director's Room: **all results × their hooks**. Searchable by tag ("which results concern a guard captain?").
- Each hook says where it could pay off: *conversation line*, *skill check modifier*, *reaction from a faction*, *quest start*.
- Scenes list which tags they react to; the page shows which results have **no hook yet**, so we can aim for coverage over time.
- The page is built from data (`events/*.ts` + the scenes' declared tags), not hand-maintained.

Rank: A is small and also helps the card work; B and C come later. See [Skill web](skill-web.md) for the reaction layer these hooks would plug into.

## 4. Smaller notes from the review
- **Extra points from traits** ("apoang N"): you could assign more than you had. Fixed: the + stops at the points you have; unspent or overspent points warn.
- **"At most 10 points on Vitality"**: reworded (not a Vitality rule). Done.
- **Religion forced by a trait**: warning now says where to pick. Idea: preselect when the trait names exactly one religion.
- **Packages** now have English names. Their *contents* are still names only; make them items so skill-web gear choices can use them.
- **GM references** removed everywhere in the creator; rule notes that said "the GM decides" are plain statements. If a story-level "agree later" is needed, it should be a scene flag, not text.
