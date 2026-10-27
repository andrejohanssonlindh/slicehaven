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

## Status (2026-10-27)
Steps 1 and 2 below are built. Code: `core/skillweb.ts` (types, kind tree, lookup, `expandScene`), `content/skillweb/index.ts` (kinds + three example hooks: size up a humanoid, climb a rock, study a rock), `core/scene.ts` (`lookAround`, strong success), tests in `tests/skillweb.test.ts`.
- **How it works:** a scene object gets a `kind` (and optional `tags`). At scene start `expandScene` copies the matching library hooks onto each object as ordinary checks, so the Use-a-skill menus, "useful here" and hints work unchanged. An object's own check shadows a library hook with the same `intention`.
- **Search is a roll now.** "Look around" (Search/Alertness with nothing right there) rolls your dice. Each hint has a `spot` number; far things are +1 harder per hex beyond 2. A poor roll notices nothing. Hints **describe the thing**, never the solution. A spot can be looked over once; move to look again.
- **Strong success:** 2+ advantages over the difficulty adds the hook's `strong` effects.
- **Not built yet:** tags with real content (only the lookup rule exists), advantage tokens, mood and talk limits, gear choice, people tables, terrain.

## Status (2026-10-27, later): the humanoid social set
Built: steps 3, 4 and the people-vs-people part of 8. Code: `content/skillweb/social.ts` (hooks), `content/skillweb/relations.ts` (the table), `core/skillweb.ts` (`situation`, `disposition`, patience), `core/scene.ts` (mood, tokens, memory), tests in `tests/social-web.test.ts`.
- **Kinds:** humanoid → human → **rural** → **guard**, **outcast**; also dwarf, elf, tirak, missla (the creator's families). Subkinds change single hooks: a guard is much harder to frighten (very hard), an outcast hears mockery in court manners (always, mood −2) and talks shop easily.
- **Hooks on every humanoid:** persuade (Argue), impress (Charm), distract, ask, intimidate, court manners, and size-up (looking, so no talk is spent). **Court Life by who it's done to:** a *rich* human is flattered (mood +1 and a kept advantage for bartering); an outcast takes it as mockery; others are puzzled.
- **Patience (talks):** each social try costs one of their talks. By kind: humanoid 3, guard 4, outcast 2. They say when they get impatient and when they have had enough, and then social skills do nothing on them. Observing (size-up) is free. *Not yet decided:* whether the player should see a number.
- **Mood:** −3..+3 per person. Each point makes the next try 2 easier or harder. Outcomes move it.
- **Kept advantages (tokens):** one advantage = 5 points off a later difficulty (the margin that earns one). Tied to a person, spent by the next roll that wants that kind, used up either way. *Impress/persuade* leave a *social* token against that person; *distract* leaves *sneak* and *pickpocket* tokens against them (nothing spends those yet); rich-flattery leaves *barter* (nothing spends it yet).
- **Difficulty for single rolls, Control for conflicts** (director, 2026-10-27, checked against the rules' own two currencies). A single roll has a difficulty tier chosen by the circumstances, so mood, reception and kept advantages move the *difficulty*: 2 per point of mood or reception, 5 per kept advantage (5 is the margin that earns one). A challenge or conflict has *Control*, where the rules' upper hand / weak position is ±2, so the same things move the *situation*: 1 Control per point, +1 per kept advantage, never more than ±4 together. The gate's Argue-your-way-in conflict now takes mood, reception and kept advantages this way. There is no "grudging success" any more.
- **How peoples see each other:** `RELATIONS[observer][you]` from −3 to +3 with a short reason, e.g. dwarf and elf distrust (−2 both ways), almost nobody likes the tirak (−2), humans are wary of elves (−1) and fond of the misslor (+1). The row comes from the most specific kind that has an opinion, so *rural* folk (between human and guard/outcast) are warier of elves (−2), dwarves (−1) and tirak (−3) than the human row says, and fall back to it for everything else. **Kin depends on context:** your own people count as kin only where you are *not* the majority (`SceneDef.majority`): two elves in a human city are kin, two humans in a human city are neutral. A visitor from a people that isn't local to the scene is one step cooler ("a stranger here"). This is balance data: tune freely.
- **Size up** is the free observation hook (Insight or Alertness, hard). It costs no talk. On a success it tells you, in plain notes: how the person feels about you now, whether it shows that their people see yours badly (or well), and whether they would take much more. Before this it only set a flag nothing read.
- **Mood in the log, not a meter:** every mood change prints a note ("the guard seems irritated"); tapping a person you've talked to adds how they seem; they say when they're getting impatient and when they've had enough.
- **Gate:** the guard is a `guard`; a new **drifter** (an `outcast`) sits by a tree. Heroes now carry a kind and a people (the creator's character, or the default shepherd, a local human).
- **Not built:** drive hooks, haggling and a barter scene to spend the tokens, sneaking and pickpocketing, gear choice, status tags beyond `rich`, real content tables beyond these ten hooks, a visible patience meter.

## Status (2026-10-27, third pass): knowledge reads, challenges, conflicts
- **Knowledge and insight give a 50/50 answer, never "nothing".** A hook marked `hidden` doesn't show the roll or the verdict. Success gives the truth, failure gives a *plausible wrong answer*, so you can't just take the opposite, and you can't roll again to compare (the check closes after one try). Used by **Size up** (`readPerson`: mood, how they see your people, whether to push: true on success; on failure every part is wrong in a believable way) and **Study** (a thing's `lore: { true, false }`). Rule for the content pass: *any* knowledge/insight/lore hook is written this way, with a believable false version; hooks that make things happen (persuade, climb) are not hidden. Looking around stays an ordinary roll.
- **Conflicts follow the book's rhythm** (the gate's Argue-your-way-in was wrong before): three rolls and the lead alternates. Round 1 you lead and he answers; round 2 *he* leads and you answer; round 3 you lead again. **He only uses what he has** (director, 2026-10-27): every person has their own sheet (`content/npcs`, first one: the generic guard), and of the skills that fit the situation (the approach's `answers` and `moves` lists) he draws one *he has*, at random, preferring one he hasn't used. If none fits he falls back on one of his attributes. He no longer mirrors your skill. Same locked roll and −2D6-for-repeats rules; his repeats cost him too. **Attributes are always allowed**, for you too, when nothing else fits (also in challenges): "used it before? tough luck, it's worse" is just the repeat penalty.
- **Challenges** (`core/challenge.ts`): you against the place. Three rolls against one difficulty; a roll that reaches it gives 1 Control, +1 per Advantage; locked rolls (usually an attribute) must each be used once; any reasonable skill, expertise, mark or *ability* can be rolled; reuse costs −2D6; upper hand/weak position ±2 Control; "everyday" challenges give 1–3 Control, "important" what you earn; the total is read off the challenge's own result list (0, 1, 2, 3, 4–5, 6–8, 9+ in the book; ours lists the thresholds it needs).
- **Hooks into a challenge:** which skills are reasonable (some only at certain times: darkvision and night vision at night), and **edges** (an ability that puts you in an upper hand: darkvision at night is +2 Control). Difficulty can depend on the time of day.
- **Survey the area** (`content/skillweb/challenges.ts`): the standard "larger search". Locked Alertness; Search, Scouting, Orienteering, Nature Lore, Tracking, and night eyes at night. Each scene gives it its own results. At the gate: 0 = you blunder and the guard's torch swings your way; 3 = the near things worth a look are shown; 4–5 = everything is shown and you've learned how the guard stands his watch (a *social* advantage against him); 6+ = also when he looks away (a *sneak* advantage). Found under **Bigger efforts** in "Use a skill here". Once per scene.
- **Not built yet:** consequences tables for conflicts (what Control buys: secrets, changed opinions…), "deny a consequence", challenges started on a thing rather than the place, party rolls, a challenge library beyond Survey, hidden versions of more knowledge skills.

## Status (2026-10-27, fourth pass): social challenges and game difficulty
- **People with a social challenge** (the guard) allow only a few *other* social tries outside it, set by the **game difficulty**: easy 3, **normal 1**, hard 0 (`core/difficulty.ts`; switch under the map, saved in the browser). The limit is the lower of that and their own patience, and the conflict itself never counts. On hard they won't hear small talk: "make your case to him". People without a social challenge keep their own patience at every difficulty.
- The talk option now reads **Argue your way in (social challenge)**.
- **Framing in conflicts:** rounds are described by who *starts* them ("You started the round", "His move: he starts the round with…"), not who "leads", which read as who is ahead. Each round has its own result screen with a Next round button.
- **A negative balance shows as negative.** Control balance = what you won + situation − what he spends; 2 vs 2 with a −1 situation is −1, not 0 (it can't buy the goal either way).

## Build order (each a vignette, one push)
1. ✅ **Shape only.** Types in `core/` for: thing kinds, intentions, outcomes, effects, advantage tokens. A resolver that walks layers 3→2→1. Unit tests. No content beyond a few examples.
2. ✅ **Search fix** in the gate scene: make it a check, stop listing solutions; give the boulder and the guard layer 2 / layer 1 hooks instead of hand-written ones where they exist.
3. ✅ **Humanoid social set.** Argue (persuade, haggle, stall) and Charm on any humanoid. Then Court life / Streetwise-style skills with status tags.
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

## Memory: social tries linger (director, 2026-10-26)
- **Limited interactions.** Most characters can only be talked to a limited number of times (per scene, and some for good). The count is part of the NPC's state; when it runs out they won't engage, with a line saying so.
- **Outcome colours the next try.** Each social try leaves a **mood** on the NPC toward you (e.g. wary, warmed up, insulted) that modifies the next roll and which intentions work. It also decides what tokens or lasting effects the outcome leaves.
- Stored as plain JSON on the NPC in scene state: `{ talks: n, mood: [...], lastOutcome }`. Reset rules (per scene, per day, never) are per NPC.
- Build: part of step 3 (humanoid social set), together with advantage tokens.

## Open questions (to the director, see [questions](../questions.md))
- Should "strong success" be only for rolls with 2+ extra successes, or a separate roll-over threshold?
- How many talks is the usual limit, and is it shown to the player (a visible patience meter) or hidden?
