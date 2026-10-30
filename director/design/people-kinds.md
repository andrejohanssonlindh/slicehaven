# Kinds of person, and the character behind each one

*2026-10-30. Step 3 of [the world structure](world-structure.md). The director's ask: a kind of person must also point at that person's **character**, "everything from race to skills". This page is the design; nothing is built yet.*

## Three layers, so each says one thing
| Layer | What it is | Where | Example |
|---|---|---|---|
| **Kind of person** | What *sort* of person: how they look in general, what they do all day, which facets (`job-innkeeper`, `martial`) they usually carry, and how to make a character for one | `content/things/kinds/people.ts` (a kind of thing, like a well) | `innkeeper`, `villager`, `guard`, `horse` |
| **Person** | One individual in a map: a kind, a name, a home, and a **character** | the map file (`people: [...]`) | "Mara, the innkeeper of the Ferry Inn" |
| **Character** | The full sheet: people (race), homeland, religion, background, archetype, attributes, every skill, languages, drives, details | `CharState` (the decisions) → `derive()` (everything else), already built for the creator | Mara's sheet |

The hero is a person like the rest: their character is the one made in the creator (`/chargen/`) and saved in the browser.

## What a kind of person says
```ts
const innkeeper: PersonDef = {
  id: 'innkeeper',
  is: 'villager',                       // down the kind tree, inheriting
  look: 'A broad, busy innkeeper.',
  figure: { ... },                      // how to draw them (a recipe for the walk set), refined by the character
  routine: 'keeper-rounds',             // a Rounds kind: what they do all day
  facets: ['job-innkeeper'],            // the people-library tags this kind carries by default
  character: {                          // how to make a character for one (a CharSpec)
    background: 'Värdshusvärd',         // fixed where the kind insists...
    people: { human: 0.8, dwarf: 0.1 }, // ...weighted where it allows variation
    homeland: 'near',                   // 'near' = one of the map's own
    skills: ['E:Argumentera', 'H:Bryggning'],  // emphasis: these end up high
  },
};
```
Like every kind, it says only what differs from its parent. `villager` says "ordinary adult, a round of the village"; a `guard` is a kind of villager with `martial`, a sword and a post.

## The character is what everything else reads
One source of truth, **derived, not copied**:
- **Facets** (what the people library's leanings read) come from the character: its people gives `peopleFacet`, homeland the realm, religion the faith, background the `job-…` facet (`backgroundFacet`). The kind's `facets` are only the defaults for a character not yet made. No hand-written tags to keep in step.
- **Look**: the figure takes people (race), age and gender from the character; the kind adds the clothes and tools.
- **Skills and attributes** feed rolls against them (a guard's Perception when you sneak, an innkeeper's Argumentera when you haggle) and what they can do (a healer who can heal).
- **Languages** decide whom they can talk to; **drives** decide what they want; **details** (name, age, family, story) are what you read when you tap them.

## Making a character without a player
Only the hero is chosen by hand. For everyone else the character is **made from the kind's `CharSpec`, the map's seed and the person's id**: the same person every time, no storage. It needs a *headless* version of the creator: take the decisions it would ask for, answer them from the spec where fixed and from the dice (`core/rng.ts`) where open, and hand back a `CharState` that `derive()` accepts. The creator already has the tables and rules; this is "play it through by itself" (`core/chargen/make.ts`, new).

**Characters are made when looked at**, not when the map loads: a map of a thousand people is a thousand specs, and a sheet is worked out the first time someone taps one, talks to them or rolls against them (then kept while they are near, like furnished rooms). This keeps "nothing is sized by the world" true. The cost to check: how long one headless character takes (a test will measure it).

A person may also carry their own `CharState` inline or a saved id (for a named story character who must be exactly so); then nothing is generated.

## The person in a map
```ts
people: [
  { id: 'mara', kind: 'innkeeper', name: 'Mara', home: 'inn' },        // character made from the kind
  { id: 'tomas', kind: 'guard', home: 'gate', post: { x: 4, z: 17 } },  // a different routine anchor
  { id: 'hero', kind: 'hero', character: { saved: 'c1x9f' } },          // the creator's save
]
```
This replaces what is hard-wired in `SpikeWorld` today (the hero's and the villager's looks, the keeper as "first house with a stair", the villager's beat, the door torch on `houses[0]`): review item 9.

## Build order (each step small, tested, pushed)
1. **Kinds of person**: `PersonDef`/`Things` carry `figure`, `routine`, `facets`, `character`; people kinds as files (`villager`, `innkeeper`, `guard`, `farmer`, the hero); `person` joins the kind tree.
2. **The cast from the map**: `MapSpec.people`; the world builds its walkers and routines from them; the hard-wired hero, villager and keeper go. Routines become kinds (`keeper-rounds`, `beat`, `stand`).
3. **Characters for people**: `CharSpec` and the headless `makeCharacter`, deterministic, measured; facets, look and name come from the character.
4. **The hero as a person**: the creator's saved character is loaded into the world (the sheet in the browser's storage), its facets and skills used by rolls.
5. **Tap a person**: see who they are (name, people, what they do, their best skills), and later use skills on them (plan step 5).

## Decided here, change if you disagree
- Minor people get full characters but only **on demand**, deterministically from kind + seed + id.
- A kind's `character` spec is *tendencies* (weights, emphasis), not a finished sheet; exact sheets are for named people.
- Animals (the horse) are kinds of person-like things with a much smaller sheet; they follow after humans.
- The creator stays the one place that knows the rules of making a character; the world never re-implements them.

Open for the director: see Q26 in [questions](../questions.md).
