# Combat: the plan (B8), and a handover for Claude

*2026-11-04. Prework before combat is built: what exists, how the ruleset maps onto a live 3D world in metres, the order to build it in, and the questions for the director. The rules themselves, in our words: [combat rules](combat-rules.md). Read that page and this one before touching combat code; nothing else is needed for a cold start.*

## What exists (2026-11-04)
| Piece | Where | State |
|---|---|---|
| **Damage and wounds** | `src/core/damage.ts`; tables `src/content/wounds/` (one file per type: cut, crush, thrust, brawl, fall, burn) | ✅ Built and tested (`tests/damage.test.ts`). Where a blow lands, the damage table, every serious-wound row (death roll + after-effects, mechanics only), break and amputation risks, bleeds/fires/infections merging, a person's `Injuries` (plain JSON, saveable), penalties on rolls, the end of a phase (bleeding, fire, shock), the end of a scene, fall and burn pools. **Not wired into the world yet** |
| Weapons, shields, armour stats | `src/content/chargen/equipment.ts` (`WEAPONS`, `SHIELDS`, `ARMOUR`, property names and help) | From the creator; damage strings like `G+2T6+1` (`withBaseDamage`) |
| Base armour, base damage | `baseArmour`, `baseDamage` in `src/core/chargen/tables.ts`; `derived()` in `core/npcsheet.ts` | ✅ |
| Every person's sheet, with gear | `core/npcsheet.ts`, `content/people/sheets.ts`, armed kinds in `content/people/kinds/armed.ts` | ✅ Guards have swords, spears, bows, mail |
| Rolls | `core/dice.ts` (open rolls, advantages), shown by `ui/dice/` | ✅ |
| Seeing, hearing; answering a wrong (fight or fetch) | `core/world3d/perceive.ts`, `standing.ts`; `does/confront.ts` | ✅ "Square up" exists as an answer, with nothing to do yet |
| Load and base fatigue | `ENCUMBRANCE` in `tables.ts`, `carry.ts` | ✅ |
| **Test ground** | `/spike3d/?map=arena`: a 30 × 15 m oval behind a palisade, gates east and west, pillars (block sight), low walls (not sight), barrels, crates, a woodpile | ✅ Weapons on the sand by the west gate, a gladiator at the far end. Map rule `oval` (`content/maps/rules/oval.ts`) |
| **Combat rules core** | `src/core/combat.ts` | ✅ B8a (2026-11-04): one against one in melee. Moving (walk 5, run 10), picking up (3 m), opening on Reaktion, attack against the best defence (parry, block, dodge), tactics and their fatigue, roles swapping, retreat, drops, the end of the phase, the mercy stroke; a fighting style for those nobody steers. Tested (`tests/combat.test.ts`) |
| **Weapons as things, the right hand** | `content/things/kinds/weapons.ts`, models `things/models/`; `Loose.wield` for people's weapons | ✅ Held in the right hand (`BodyRig.hand`, `model.grip`), dropped and picked up in a fight, saved |
| **The fight in the world and on the page** | `SpikeWorld` (fights section), `src/spike3d/fight.ts`, `#fight` panel | ✅ The world stops; one choice a round; your own dice, a blow in steps; walking, swings, lying down; cards by difficulty; injuries saved (`hurt`, save v8); OK ends it; a dead hero gets New game. `e2e/spike3d-fight.e2e.ts` |
| **Choosing a weapon, calling a foe** | kinds `weapon-rack` (`stock`) and `gong` (`calls`) in `content/things/kinds/arena.ts`; verbs `take-from`, `strike-gong` (outcome `choose`, the picker in `actsheet.ts`); `SpikeWorld.takeFromStock`, `callFighter` | ✅ 17 weapons; a gladiator at any level (not saved) |
| **The upper hand** | `seizeInitiative`, `Fight.upper`, `chooseFor(…, known)`; the page's `beginRound`, `intentOf` | ✅ Declared in reverse order: whoever is ahead sees the other's choice |
| **Seeing and moving in a fight** | `SpikeWorld.viewAim`, `fightCentre`, `recentre`, `markSpot`; the page's `aimView`, `tap`, `planned`, `goTo` | ✅ The view keeps the fight clear of the panel; a tap on the ground or a weapon plans the round's move |
| **Yielding** | `Choice.plead`, `pleaDifficulty`, `FightStyle.spare`, `Fight.spared` | ✅ The best of Argue and Charm against the foe's style, eased if they're more tired and hurt than you |
| **Your condition** | `src/spike3d/condition.ts`, the **You** button; fatigue back with time in `SpikeWorld.recover` | ✅ Fatigue and its sources, dice off rolls and why, wounds |

## How a fight fits our world
- **Live until it starts.** The world runs freely (A3). A fight starts when someone attacks or squares up and the other answers. Then **the world stops and plays in rounds of 4 seconds** of world time (decided 2026-11-02), with everyone within reach of it drawn in; the rest of the map waits.
- **Rounds and phases** as in the rules: ranged, melee, mystic (later, B9), end. The phone shows one decision at a time: *which phase* → *side action* → *main action* → *tactic*. A fight with no choice to make for the hero plays itself, slowly enough to follow.
- **Metres, not bands** (principle 6). The rules' five bands become measured ranges, read from the real distance between two people (decided, Q45):

| Band | Metres | Notes |
|---|---|---|
| Adjacent | up to 2 m | melee; a *Reach* weapon could stretch it later |
| Short | 2–10 | range difficulty 6 |
| Medium | 10–25 | 10 |
| Long | 25–50 | 14 |
| Very long | 50+ | 18 |

  Moving "one band" as a side action becomes **walking up to 5 m** in the round; two bands (active in melee, a Förflyttning roll against the ground's difficulty) **running up to 10 m**. Ground difficulty comes from the ground under foot (road 6, grass and wood 10, bog 14), night +2 for those without dark-sight.
- **Cover is real geometry.** A pillar between you and the archer (`blocksSight`) blocks the shot; a low wall gives the parapet +8; a fight in melee +4. The vision code already casts these lines (`core/world3d/vision.ts`).
- **Everyone is a real person with a real sheet** (decision 2026-10-30): the hero's sheet from the creator, others from their kind. Damage dice from their weapon and base damage; defence from their skill, shield, or Undvika; armour from what they wear (one value for the whole suit until armour pieces exist; the rules allow per part).
- **NPCs choose by behaviour.** A fighter's choices (phase, tactic, retreat, surrender) are a behaviour file like the others (`content/behaviours/does/`), reading their temper (bold, afraid) and their injuries. Fleeing at heavy fatigue, yielding to a mark (the *Mark* edge), fetching friends: the same answers the standing system already has.
- **After a fight**: fatigue comes back with time, faster resting (Q49; no end of scene); wounds, pain, bleeds, infections and breaks stay, saved on the person. Healing by days comes with the healing chapter (later; the rules are summarised only up to after-effects).
- **Visible injuries from the start** (director, 2026-11-02): every effect is plain data on the person, so the body builder can show it: a limb held still when broken or wounded, a stoop for torso wounds, blood on a bleeding part, a bandage once stopped, scars for healed wounds, a missing hand, an eye patch. The body has parts already (`core/world3d/body.ts`); the look reads `Injuries`. Dazed, knocked back, falling are poses (`content/people/poses.ts`).
- **Improvised weapons** (plan B8): a swung stool reads a property off its kind (a damage string and type on `ThingDef`, like `size` and `weight`), never an `if` on its name.

## What's missing before a fight can run (the pattern check)
1. ✅ *(B8a, one against one; sub-fights, outnumbering, edges and ranged still to come)* **Combat rules core** (`src/core/combat.ts`): a fight's state as plain JSON (who, sides, sub-fights, roles, round, phase, choices), opening a melee (Reaktion, outnumbering), attack and defence with tactics, who attacks next round, edges bought with advantages, ranged difficulty from metres and cover, retreat. Pure, deterministic, tested. Calls `damage.ts`.
2. 🔶 *(B8a: weapons as kinds, the right hand, drop and pick up in a fight are built; the left hand, shields, belts and drawing are not)* **Hands, and weapons as things** (the director, Q47: a dropped weapon is really on the ground, and picking it up is a side action). What exists: *Pick up* and *Put down* (`content/actions/verbs/`, rules `core/world3d/carry.ts`) take any thing with a `size` into **both arms**, one thing at a time, saved where it lies when put down. What's missing:
   - **Weapons as kinds of thing** (under `item`): a `weapon` property naming its row in `WEAPONS` (`content/chargen/equipment.ts`), a `size`, a weight, a model. A sword in the world is then a thing like a stool.
   - **Hands**: a person holds things in a **right and a left hand** (a weapon one-handed, a shield, a torch), or in **both** (a two-handed weapon, a stool, a keg). Carrying in the arms as today is "both hands". A weapon in hand is what they fight with; with none, they brawl.
   - **Wield / sheathe** (a belt or back slot: *strapped*), so drawing is the rules' draw (−1D6 unless quick-draw), and *pick up* in a fight is the **side action**.
   - **Drop**: the *drops* after-effect puts what's in the hit arm (everything, for a head or torso hit) on the ground 1–3 m away as a loose thing; *Secure* items and two-handed grips stay. Whoever picks it up holds it, the other side too.
   - **Use what you hold**: a held thing with a damage line on its kind (a stool: crush) is an improvised weapon; a real weapon reads its row.
   This is a slice of B6 (items) that combat needs first: built at the start of B8a, agreed now.
3. **Effects (B7)**: the after-effects in `damage.ts` are the first effects on a person. When B7 comes, burning on a *thing* and wet/afraid join; `Injuries` may then become one effect kind among others. Not needed for the first duel.
4. ✅ *(B8a)* **The world's side**: `SpikeWorld` starts a fight, freezes the clock, gathers people, moves them by the metres they chose, and resumes. The page shows choices and the log; the engine plays swings and hits as poses.

## Order to build (each a vignette the director can try on the phone)
1. **B8a, a fight to the death in the arena** (Q46: the full flow, death included; *New game* resets). A gladiator (a kind of person: sword, light armour) waits in the arena, and a weapon rack holds a sword or two for the hero. Tap them → *Fight*. Melee only: each round the choice is moving (side action, 5 m walk, 10 m run) and the tactic (standard, quick, powerful; defence standard, defensive, counter). Rolls on the dice glass, a fight log, injuries on the hero card; drops put the weapon on the sand, to pick up as a side action; knocked out, bleeding out, killed. *Tests:* `core/combat.ts` unit tests; one e2e in the arena.
2. **B8b, edges.** Advantages bought: precision, more damage, find a gap, trip, disarm, follow-up. Weapon properties that change them (precise, measured, snaring).
3. **B8c, several fighters.** Two against one, sub-fights, outnumbering, joining, the group attack. A second gladiator.
4. **B8d, ranged.** Bows and thrown knives in the arena: range from metres, cover from pillars and walls, aim, nock and load.
5. **B8e, visible injuries.** Wounds, breaks, blood, bandages and poses on the bodies, hero and others alike.
6. **B8f, fights out in the world.** The bold who square up (standing) actually fight; guards fetched arrive and join; brigands on a lonely road. Death and its consequences (B3c witnesses). **From the director's third fight:** attacking someone is the *harm* wrong (their view of you drops, and witnesses'); someone who wakes from a knock-out decides to flee, or to talk their way out if seen; someone left on the ground (a broken leg) calls for help.
7. Then falls (a ledge, a ladder), fire on people (torches, the forge), stopping a bleed and waking someone (Läkekonst), and healing by days.

Mounted combat waits for riding (C4), mystic actions for magic (B9).

## Readings made while building B8a (to confirm or change)
- **The upper hand, declared in reverse order** (the director, 2026-11-04; `seizeInitiative`, `Fight.upper`): at the start of a round, in a melee the **attacker** has the upper hand (no roll); free, the two nearest foes roll **Reaktion** if they are within 12 m (a run and a reach), else nobody has it and both choose blind. **Whoever has it sees what the other means to do** before choosing ("Arruns means to strike with all their strength"); a foe who has it chooses knowing yours, leaning to the answer (`ANSWER_ATTACK`, `ANSWER_DEFENCE`: against careful or countering defence a quick blow; against a powerful blow careful defence or a counter; a style that never counters still won't). That round's Reaktion roll also **decides the roles if blades cross** (no second roll), and the side with the upper hand **goes first in side actions** (reaches the sword on the sand first).
- **Advantages** all buy *more damage* until edges can be chosen (B8b); the extra is rolled (or added) on its own so it can be shown (`HitInput.extra`); every +4 is a die (`moreDamage`, the director).
- **A broken leg, hip, spine or neck grounds them** (`grounded`): no moving or retreating, −1D6 on fighting and moving; a broken arm drops what it holds. The hero limps outside a fight until healing exists.
- **A beaten foe offers to yield** (`beaten`, `wantsToYield`, style `yieldAt`); **yielding lays your weapon down**, and each earlier yield to the same person makes the next plea 6 harder (`Standing.yielded`).
- **The round pauses when blades cross** (`pauseOnOpen`, `Fight.midRound`) so both sides choose a tactic in their roles; a move stops at reach of a foe.
- **The mercy stroke** kills (someone helpless, a blow meant to kill); no roll.
- **A defender's side action**: picking something up is allowed while defending (the book gives a side action in your active phase; the defender has no main action).
- **The knocked out wake when their fatigue is all gone** (`recoverFatigue`); the dying don't.
- **The hero wears no armour yet** (there is none on them in the world); people wear their sheet's armour as one suit.

## Decided after the first fight (2026-11-04)
- **Untrained is 2D6** (Q48), every combat skill's base (`UNTRAINED` in `core/combat.ts`).
- **No end of scene** (Q49): OK ends the fight once one side is left. Fatigue comes back with world time, one point per `restMinutes` of the difficulty (`DIFFICULTY_RULES`), three times as fast sat down (`REST_SPEED`); `SpikeWorld.recover`. A stopped clock counts a real second as a world minute.
- **Fatigue remembers where it came from** (`Injuries.fatigueFrom`, filled by `addFatigue`: blows, bleeding, fire, each tactic); tactics come back first. **Penalties say why** (`penaltyParts`), and attack and defence pools carry their make-up (`PoolWhy`: `attackWhy`, `defencePool().why`). The page reads these for the log and the condition sheet (`src/spike3d/condition.ts`).
- **You throw only your own dice** (`showRolls` `unthrown`, `notes`); a blow is shown in three steps (hit; where, damage, extra; serious wound). **What you see follows the difficulty** (`foeExact`, `ownExact`).

## Decided (2026-11-04)
- **Q45** the bands in metres as in the table; moving is the side action (walk 5 m, run 10 m).
- **Q46** the first fight is to the death; New game resets.
- **Q47** negative effects stack (repeats too); a dropped weapon is on the ground until picked up, a side action.
