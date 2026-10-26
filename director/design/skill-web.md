# Skill web — how skills meet the world

*Plan, 2026-10-26. From the director's notes on skills. **Not to be built in one go**: it grows one skill and one kind of thing at a time, each as a small vignette. Haiku (or any session) can fill in the content tables once the shape below is built.*

Related: [Exploration scenes](exploration-scenes.md) (the gate scene is where this starts), [Character creator](character-creator.md), [Filaments](magic-filaments.md) (terrain and weather feed in here).

## The problem
Today a skill is "useful here" only where a scene author wrote it in by hand. That makes skills feel like keys for one lock: Search finds the cart's pass, Climb gets over the boulder. The director wants skills to feel **usable almost everywhere**, without being obvious or single-purpose. Also, noting "you could climb over" in a scene with no quest hands the player the answer; that should be a skill check instead.

## Three layers of skill hooks
Every thing in the world answers "what can this skill do to me?" from three layers. A lower number is the general fallback; a higher number overrides it.

1. **Standard.** Works anywhere or on a whole class of thing. Wilderness gathers food or lights a fire. Argue works on any sentient being. Most social and knowledge skills and many expertises have standard uses.
2. **Object-related.** Attached to a *kind* of thing. A rock can always be studied with Geology; it may tell you nothing useful, but it is always allowed. A lock can always be picked.
3. **Hook / quest.** Written by hand for a scene or story beat (the gate's Search-the-cart). Situation-dependent. Built last, and only where a story needs it.

A skill use is resolved by looking the thing up through layers 3 → 2 → 1 and taking the first match. Layers 1 and 2 are **data**, so they can be filled in without touching code.

## Intentions
A skill is not "do X"; it is "do X **in order to** Y". Each skill has a few **intentions**, and the intention picks the outcome table.

- Wilderness: gather food, light a fire, find a trail.
- An expertise like juggling: *impress* (+1 advantage on a later social roll against the watchers, even if no such roll exists yet) or *distract* (+1 advantage for a party member who then sneaks or picks a pocket).
- Argue: on a humanoid you can always try. The intention is what for: persuade, haggle, stall, provoke, ask for information. Who you argue with decides the result.

One try uses **one skill and one intention** (matches Q15). This is separate from the multi-skill challenge/conflict system.

## Results per skill use
Each (skill, intention, target) has outcomes:
- **Fail**
- **Success**
- **Strong success** (+2 or more advantage on the roll). Optional; absent means "same as success".

An outcome is a small list of **effects**: a message, a state change in the scene, and optionally **advantage tokens** ("+1 advantage on the next roll of kind K against target T, or by party member P"). Advantage tokens are plain JSON in the scene state, so they save.

## Things form a hierarchy (taxonomy)
Every thing has a `kind` in a tree. A skill hook on a parent applies to all its children; a child can override single skills.

```
thing
  creature
    humanoid           ← large set of social/knowledge hooks (Argue, Charm, Court life…)
      dwarf            ← overrides: how a dwarf reacts to Argue, to Craft talk…
      elf, human, tirak …
    animal …
  feature (rock, tree, lock, door, water …)
  item …
```

Rules:
- Humanoids always allow the social skills, even for plain NPCs.
- A child overrides one skill's reaction, not the whole set.
- **Social standing** modifies a hook: a rich trader reacts well to Court life (+1 advantage on a barter after), a beggar may take it as mockery (angry, penalty). So a hook can be conditioned on the target's *status/role tags* (`rich`, `poor`, `guard`, `priest` …), not just its kind.

## Modifiers that feed any skill use
1. **Gear.** An item can add a bonus to a skill use (thieves' tools → Lockpick). When the player uses Lockpick and owns such an item, they get a **choice of which gear to use** before the roll. Needs: items carry `skillBonus: { skill, bonus, intentions? }`. Chargen packages (Thief's tools, Craft tools, …) must map to real items first (see "Packages" in the creator's open work).
2. **Origin vs. target (people).** Your people against theirs: dwarves and elves distrust each other, almost nobody likes tirak, a visitor from a strange land is treated as one. Shown as a **reaction modifier** from a (yourPeople, theirPeople) table, with a default of neutral. Winning over someone who dislikes you costs: success but with *less control* (the director's "− n control").
3. **Drives.** Almost every drive has hooks into social skills (what the character will or won't do, what they get extra from). Each drive lists the intentions it favours or forbids. Needs the drive data from the creator (45 drives, three levels each).
4. **Terrain and weather.** Via the filament/weather systems: Skototopy (dark-sight, or whatever the sneaking-in-shadow skill is called in our English naming) and light level affect sneaking; the *tile* matters too (grass is quiet, broken twigs are not). Each terrain tile gets a few skill modifiers (`sneak: +1`, `climb: -1`…); weather and light add to them.

## Search is not a free win
- Search (and Alertness, "look around") **must not auto-succeed** and must not hand over a precise list of what can be done.
- It is a skill check. Success reveals *things* (layer 2/1 targets), not *solutions*.
- Scenes without a quest or mission must not announce "you can climb over". The player discovers options by using skills on things; the climb exists as a layer 2 hook on the boulder ("Climb" on any climbable feature).

## Build order (each a vignette, one push)
1. **Shape only.** Types in `core/` for: thing kinds, intentions, outcomes, effects, advantage tokens. A resolver that walks layers 3→2→1. Unit tests. No content beyond a few examples.
2. **Search fix** in the gate scene: make it a check, stop listing solutions; give the boulder and the guard layer 2 / layer 1 hooks instead of hand-written ones where they exist.
3. **Humanoid social set.** Argue (persuade, haggle, stall) and Charm on any humanoid. Then Court life / Streetwise-style skills with status tags.
4. **Wilderness set.** Gather food, light a fire, find a trail on terrain tiles.
5. **Object set.** Rocks (Geology), plants (Botany-style), locks (Lockpick), doors, water.
6. **Advantage tokens** stored in scene state, used by later rolls.
7. **Gear choice** on skill use (needs items with `skillBonus`).
8. **People-vs-people reaction table** and **drive hooks**.
9. **Terrain/weather modifiers** for sneaking and movement skills.
10. **Fill the tables** skill by skill (see handover).

## Handover for the content pass (Haiku-friendly)
Once step 1 exists, a content session can fill one skill at a time. For each skill:
- list 2–4 intentions;
- for each intention, which thing kinds it works on (layer 1 / 2);
- outcome text for fail / success / strong success (short, our own words);
- advantage tokens where the director's notes suggest them.

Keep each skill in its own file under `src/content/skillweb/` so sessions don't collide. Test: every hook names a real skill and a real thing kind.

## Open questions (to the director, see [questions](../questions.md))
- Does a failed Argue on a humanoid have a lasting cost (they remember), or is it per scene only?
- Should "strong success" be only for rolls with 2+ extra successes, or a separate roll-over threshold?
