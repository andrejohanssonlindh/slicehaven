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
| **Test ground** | `/spike3d/?map=arena`: a 30 × 15 m oval behind a palisade, gates east and west, pillars (block sight), low walls (not sight), barrels, crates, a woodpile | ✅ No people yet. New map rule `oval` (`content/maps/rules/oval.ts`) |

## How a fight fits our world
- **Live until it starts.** The world runs freely (A3). A fight starts when someone attacks or squares up and the other answers. Then **the world stops and plays in rounds of 4 seconds** of world time (decided 2026-11-02), with everyone within reach of it drawn in; the rest of the map waits.
- **Rounds and phases** as in the rules: ranged, melee, mystic (later, B9), end. The phone shows one decision at a time: *which phase* → *side action* → *main action* → *tactic*. A fight with no choice to make for the hero plays itself, slowly enough to follow.
- **Metres, not bands** (principle 6). The rules' five bands become measured ranges, read from the real distance between two people (a proposal, Q45):

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
- **After a fight**: fatigue recovers at the end of the scene (a short rest); wounds, pain, bleeds, infections and breaks stay, saved on the person. Healing by days comes with the healing chapter (later; the rules are summarised only up to after-effects).
- **Visible injuries from the start** (director, 2026-11-02): every effect is plain data on the person, so the body builder can show it: a limb held still when broken or wounded, a stoop for torso wounds, blood on a bleeding part, a bandage once stopped, scars for healed wounds, a missing hand, an eye patch. The body has parts already (`core/world3d/body.ts`); the look reads `Injuries`. Dazed, knocked back, falling are poses (`content/people/poses.ts`).
- **Improvised weapons** (plan B8): a swung stool reads a property off its kind (a damage string and type on `ThingDef`, like `size` and `weight`), never an `if` on its name.

## What's missing before a fight can run (the pattern check)
1. **Combat rules core** (`src/core/combat.ts`, to write): a fight's state as plain JSON (who, sides, sub-fights, roles, round, phase, choices), opening a melee (Reaktion, outnumbering), attack and defence with tactics, who attacks next round, edges bought with advantages, ranged difficulty from metres and cover, retreat. Pure, deterministic, tested. Calls `damage.ts`.
2. **A weapon in hand** for a person: from their sheet's gear now (the first weapon); B6 items later turn it into a real thing held. Drawn or not is a flag.
3. **Effects (B7)**: the after-effects in `damage.ts` are the first effects on a person. When B7 comes, burning on a *thing* and wet/afraid join; `Injuries` may then become one effect kind among others. Not needed for the first duel.
4. **The world's side**: `SpikeWorld` starts a fight, freezes the clock, gathers people, moves them by the metres they chose, and resumes. The page shows choices and the log; the engine plays swings and hits as poses.

## Order to build (each a vignette the director can try on the phone)
1. **B8a, a sparring match in the arena.** One sparring partner (a kind of person: a gladiator, sword, light armour) waits in the arena. Tap them → *Fight*. Melee only: the round's choice is the tactic (standard, quick, powerful; defence standard, defensive, counter). Rolls on the dice glass, a fight log, injuries on the hero card, knocked out ends it. No death in sparring (*Mark* at 1 advantage ends it, a rule of the arena), so it can be tried over and over. *Tests:* `core/combat.ts` unit tests; one e2e in the arena.
2. **B8b, edges.** Advantages bought: precision, more damage, find a gap, trip, disarm, follow-up. Weapon properties that change them (precise, measured, snaring).
3. **B8c, several fighters.** Two against one, sub-fights, outnumbering, joining, the group attack. A second sparring partner.
4. **B8d, ranged.** Bows and thrown knives in the arena: range from metres, cover from pillars and walls, aim, nock and load.
5. **B8e, visible injuries.** Wounds, breaks, blood, bandages and poses on the bodies, hero and others alike.
6. **B8f, fights out in the world.** The bold who square up (standing) actually fight; guards fetched arrive and join; brigands on a lonely road. Death and its consequences (B3c witnesses).
7. Then falls (a ledge, a ladder), fire on people (torches, the forge), stopping a bleed and waking someone (Läkekonst), and healing by days.

Mounted combat waits for riding (C4), mystic actions for magic (B9).

## Open questions (in [questions](../questions.md))
- **Q45** the bands in metres (table above), and walking 5 / running 10 m a round.
- **Q46** the first vignette: a sparring match with no death, as above?
- **Q47** two short after-effects from one blow (dazed and drops): −2D6 together, or −1D6? (I read them as adding up.)
