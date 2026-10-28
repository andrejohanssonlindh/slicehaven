# Devlog

## 2026-10-28 — Session 21: village art, round 1

- New tab in the Director's Room: **Village art** (`/director/#art`). Concept studies for the village and a 5×5 hex mock-up, with look buttons (Flat, Day, Dusk, Night). Skills untouched (another agent has them).
- Your notes, applied: **trees** are now lopsided crowns of many leaf clumps with gaps, a gnarled flared trunk and moss (no spheres); **rocks** have chamfered facets, cracks, lichen and moss, and sit in the turf; **houses** are daub over wattle on a fieldstone footing, crooked beams, patched mossy roofs, a lean-to, chimney smoke, a lit window; **people** are about five heads tall with real shoulders, hands and boots, soft-shaded and worn (the "Secret of Mana meets western realism" idea), built from a spec so new villagers are cheap.
- New things: house (thatch or shingle), tavern and apothecary variants (signs), well, barrels, crates, market stalls (fruit, bread, cloth), smithy with a live forge, haystack, woodpile, fence, lantern post, reeds and lily pads for the water. Eight villagers: farmer, baker, elder, smith, guard, wife, child, traveller.
- The "later" layer (`art/look.ts`): projected cast shadows, coloured lights with falloff and flicker, bloom, colour grade, vignette, dappled sunlight drifting over the ground, chimney smoke. It runs on top of the unchanged chunky pixels. Not wired into the real game yet; the studio is where it lives.
- Code: `art/grit.ts` (wobbly shapes, soft outlines, wear), `art/rough.ts`, `art/buildings.ts`, `art/folk.ts`, `art/look.ts`, `art/villageScene.ts`. Grass, flowers, campfire, ground tiles untouched. A test checks every sprite draws and is repeatable (271 tests).
- Honest finding: buildings are about 2.5 hexes wide, so a 5×5 hex patch holds roughly three of them plus clutter. See Q20.

## 2026-10-27 — Session 20: person hooks for sweet-talk, comfort, provoke, steal

- Four more efforts have hooks by type of person (recipe in the skills handover §4): **sweet-talk** (19), **comfort** (12), **provoke** (17, a success is a deliberate rise: they get angrier and you keep a social advantage) and **steal** (12, not a talk, so it costs no patience; it spends the `steal` advantage that distract earns; success sets `stolen:{id}`, failure sets `suspicious:{id}` and turns them hostile).
- They are off the planned list. Still planned for people: **deceive** (needs a hidden "did they believe it"), bribe, gamble, teach, law.
- Later the same session: **gamble** (12; a loss costs a share of silver, a win has no purse yet so it earns goodwill), **teach** (11) and **law** (11; officials and courts concede, most others shrug) were added the same way. Still planned for people: deceive and bribe.
- **Deceive** (20 variants, a hidden roll): you are never told whether a lie held. Success and failure say exactly the same words (a test checks) and differ only in a silent flag, `deceived:{id}` or `doubted:{id}`. After that the person is easier (−2 difficulty, +1 Control in a conflict) or harder to deal with, with "they took your word" / "they doubt your word" in the roll log, and a successful size-up tells you which (a failed one says the opposite). One lie per person. New `believed()` in `core/skillweb.ts`. Placed after distract in the list, because Dupera carries both tags and the first matching check wins.
- Only **bribe** is still planned for people. 243 unit tests and the 20 browser tests pass.
- Gate scene: the guard and drifter now also offer a lie (the hook applies to anyone humanoid); the rest is unchanged. All text is plain English, unbalanced first guesses.

## 2026-10-27 — Session 19: browser tests for the gate scene

- Playwright is installed (dev dependency, Chromium in your home cache, no sudo). `npm run test:e2e` starts a Vite server, opens `/scene/` at phone size (400×720) and runs 20 tests in `e2e/scene.e2e.ts`: loads cleanly and paints; Use a skill sheet, hints switch, difficulty, log, hero sheet; walking and blocked tiles; every thing's menu; talking to the guard and the three-roll conflict across seeds; Climb and Search rolls across seeds; sleeping by the fire and walking in; and three seeded random-action fuzz runs (random taps, menus, skills; fails on any console error or if `isBusy()` sticks). Screenshots land in `e2e/out/` (gitignored).
- `/scene/?seed=N` makes the dice repeatable.
- The tests found a real glitch: during the half-second dawn pause after sleeping, input wasn't locked and the gate still counted as shut, so a quick tap said "You can't walk there". Input is now locked during the pause.
- `npm test` (240) and the build are unchanged and green. The e2e suite is separate because it takes about a minute.

## 2026-10-27 — Session 18: handover check, skill hook review

- Checked what a fresh session loads: about 2k tokens (CLAUDE.md plus memory), which is fine. But CLAUDE.md still named the character creator as the current focus and never pointed to the skill work. It now has a "cold start" table: area → page → handover → code, plus a note not to read the whole `director/` folder or the long devlog. Memory trimmed to what the repo doesn't already say.
- Reviewed the structure of the skill tags, people library and hooks: [structure review](design/skill-structure-review.md). The core is sound; five seams to fix before the next content pass (Q19).
- You said fix first (Q19), so all five seams are fixed, and the game plays the same:
  - The guard, the drifter and country folk are facets now, not kinds.
  - Every hook names its effort, and its skills come from that effort's tag. Three new efforts (force, pick locks, handle animals) were added, with examples.
  - All hooks now live in one file per effort under `content/skillweb/hooks/`.
  - The 18 efforts still without hooks are listed in code, each with what it acts on (a person, a thing, a place, a group, or the hero).
  - A new test file (`tests/hooks.test.ts`) enforces the rules. The [handover](design/skill-map-handover.md) §4 has the recipe for writing the rest. 240 tests.

## 2026-10-27 — Session 17: the people library

- Started the layer for "skills tied to types of people and situations": [People library](design/people-library.md). A tree of 252 **facets** (peoples, realms, faiths, standing and calling with all 100 backgrounds, settings, passing states), built mostly from the creator's own data, and a table of 308 **leanings** binding a facet to a kind of effort (and optionally particular skills): easier or harder, and why.
- A people is now a kind of its family (an Asharian is a kind of human), so existing hooks and relations are untouched.
- Wired into single rolls (`situation()` takes the skill used): the person's tags, kinds and the scene's tags move the difficulty 2 per point, up to 3 points, and the reasons show in the roll log. The gate scene is tagged to try it.
- Then wired **conflicts** (each approach names its effort; leanings add Control), **what you share** (the hero carries people, homeland, faith and calling from the creator; a shared faith, walk of life or homeland helps), and a **"Who and where it works"** section on the Skill map page per skill and effort.
- Then the first **library hooks by type** (`content/skillweb/outcomes.ts`): hooks can name a `facet`, so the same try gets a different reply from a noble, a soldier, a priest, a merchant, a servant, a child. Done for **impress** (14 types), **threaten** (11), **ask** (17), **persuade** (14) and **distract** (8) in `outcomes.ts` and `outcomes-talk.ts`. A state beats a setting beats who they are when several fit, and a person's list of checks keeps the library's order of intentions.
- Then the first **hooks on things** (`content/skillweb/things.ts`): 28 hooks on 10 new narrow kinds (wall, door, lock, tree, food, tool, container, water, gap, trail) and on plant, animal and the ill. They never touch the broad `structure` or `item` kinds, so a scene's own palisade or cart keeps its rules (the gate gains nothing). A hook records what happened as a flag (`climbed:x`, `opened:x`, `crossed:x`, `noisy:x`…). A general search says "nothing out of place" (a thing that hides something has its own check, which wins). Hidden reads (`needs: 'lore'`) only exist on things that carry lore.
- Not yet: social hooks for sweet-talk, comfort, deceive, provoke, rally and bribe; hooks for sneak/hide (they belong to places), steal, escape, ride; skill-specific leanings in conflicts; hostility between facets. Listed in the doc with open questions.
- Also corrected the marks, expertise and abilities tags against the book's descriptions, and tagged the mystic skills (earlier this session; see the Session 16 entry).
- 232 tests.

## 2026-10-27 — Session 16: skill map, social skills

- First pass of the handover (social group). New kinds of effort: **deceive**, **rally**, **gamble**, each with examples. Genomskåda, Injaga fruktan and Skumraskaffärer can now also be used to **ask**; Spel & dobbel can **distract** and **gamble**.
- Court Life (Hovliv) stays etiquette-only on purpose: tagging it for persuade/ask/read-people changed which hook a plain human gets, and a test pins the "depends on who" design. Revisit when hooks are written.
- Movement and wilderness pass: new kinds of effort **sneak, hide, steal, escape, jump, swim, ride, travel, track, forage**, with examples. Fingerfärdighet can also distract. A test used Seamanship as its "unlinked skill"; it now uses Shield.
- Knowledge pass: new kinds of effort **lore, analyse, heal, poison, law, teach** (and Geography under travel), with examples. Lore and analyse examples are written so a wrong-but-plausible answer on failure is possible (hidden reads).
- Expertise pass (about 65 of 70 tagged, with examples): new kinds of effort **perform, comfort, provoke**; expertise added to most existing efforts (lore, travel, ask, deceive, streetwise…). Also filled the examples that were missing for weapon skills and the Charming-smile / Honest-impression marks. Every tagged pair now has examples, and a test says so.
- Director's answer: marks and crafts are skills, tagged like skills but narrow (a Scary mark when threatening; bread knowledge to impress innkeepers). Skills tied to types of people and situations come after the skill map. Logged in decisions.
- **Marks, crafts, abilities and the leftover expertise** are written per skill (tags and examples side by side) in `skillweb/marks.ts`, `crafts.ts`, `abilities.ts`, `leftovers.ts`, merged by `byskill.ts`. New effort **craft** (Make & mend). Crafts get one or two side uses (bake bread, impress; bowyer, impress; locksmith, steal…).
- **Checked everything against the book's descriptions** and fixed the mismatches: Fine Hands (looks, not nimble), Battlefield Eye (blank stare), Quick Tongue, Creaking Joints (cracking knuckles), Smith's Fists, Pointed Ears, Well-fed, Tunnel Vision, Stone Heart and others among the marks; Superstition also threatens; Soldier/Student/Monastic/Service life also help to infiltrate (deceive); Diplomacy persuades; Harbour Lore is streetwise; Traps help to search; Rooftops climb.
- **Mystic skills** (`mystic.ts`): the five basic ones (Ceremony, Sensing, Unravelling, Harmonizing, Channelling) and the 20 aspects get their plain, non-casting uses (an aspect lends an element-flavoured hand at everyday tasks).
- New test: **every** skill has at least one tag. 176 tests.

## 2026-10-27 — Session 15b: weapons, ways of use, links

- Weapon skills (sword, axe, spear, bow, dagger…) are tagged for **threaten** and **impress**, with examples.
- New list of **every way a skill can be used** (built and planned) in `content/skillweb/uses.ts`, shown on the Skill map (per skill: which ways it takes part in; plus a glossary) and written up in [Ways a skill can be used](design/ways-of-use.md).
- Links to the Skill map from the sandbox, the creator and the Director's Room (it was only in the scene).
- 175 tests.

## 2026-10-27 — Session 15: examples per skill and kind of effort

- New `content/skillweb/examples.ts`: for each of the 13 kinds of effort a few skills with 2–3 concrete examples each (e.g. impress with Physique: "flex a muscle, or lift something heavy that others struggled with"). The model for the full map. The Skill map page shows them per skill, and how many pairs are still without examples.
- The "charm" tag became **impress** (Physique, acrobatics and dance added).
- Handover for filling in the rest: [Skill map handover](design/skill-map-handover.md) (where each skill is described, rules, order, pitfalls).
- 171 tests.

## 2026-10-27 — Session 14: attributes by difficulty, tags, skill map

See the fifth-pass status in [Skill web](design/skill-web.md): Control hidden except on Easy (with the true figure, reception included), attribute rolls limited by difficulty with a −2D6 escape hatch, skill tags as the single source for skill sets, and a new Skill map page at `/skills/`. 167 tests; not checked in a browser.

## 2026-10-27 — Session 13d: difficulty, framing, negative Control

See the fourth-pass status in [Skill web](design/skill-web.md): side-try limits for people with a social challenge (easy 3 / normal 1 / hard 0, a "Game" switch under the map), "(social challenge)" on the talk option, "starts the round" wording, and Control balances that can go negative.

## 2026-10-27 — Session 13c: one screen per round

- Each conflict round now ends on its own result screen (what was rolled, who won, his line, the score) with a Next round button. Only then do you see what he does in his round. Before, the next round's screen still showed the last round's result under a new header, so "You lead" read wrong during his turn.

## 2026-10-27 — Session 13b: people use what they have

- The guard in the conflict rolls only skills on his own sheet (`content/npcs`, the generic guard), picks at random among the ones that fit the situation, and falls back on an attribute when none does. No more answers tied to your skill.
- Attributes are always allowed as a fallback for you too (conflicts and challenges); reusing one costs −2D6.
- 146 tests.

## 2026-10-27 — Session 13: hidden reads, real conflicts, challenges

See the third-pass status in [Skill web](design/skill-web.md).
- Size up and Study are now hidden 50/50 reads: no verdict, failure gives a believable wrong answer, one try.
- The guard conflict now alternates who leads (you, him, you) and he picks his skills at random from what fits yours.
- New: challenges (three rolls against a difficulty, counted in Control, with result lists), with **Survey the area** as the first. Darkvision/night vision is reasonable at night and gives +2 Control. Results are scene specific (the gate's best results tell you how the guard stands his watch).
- 143 tests. Not checked in a browser.

## 2026-10-27 — Session 12: the humanoid social set

See the status section in [Skill web](design/skill-web.md). Short version:
- Every humanoid can be persuaded, won over, distracted, asked, frightened or shown court manners, with results per outcome. Humans have two subkinds, **guard** and **outcast**, that change single hooks.
- Each person puts up with a few talks and keeps a mood; the outcome of one try colours the next (Q18).
- Advantages can be kept for later against a person (one advantage = 5 points off a difficulty).
- Peoples see each other differently (dwarf/elf, tirak, human/elf, misslor) and a bad reception raises the difficulty of a single roll and changes the Control of a conflict. Strangers to the scene's region are treated a little more coolly.
- Gate: the guard is a `guard`, and a new **drifter** (outcast) waits by a tree at the southern edge.
- 122 tests. Not checked in a browser (no Playwright on this machine).

## 2026-10-27 — Session 11: the shape of the skill web

First build step from the [skill web](design/skill-web.md) plan.
- Things have a `kind` (human, rock, fire…) in a tree; a library of hooks per kind is copied onto scene objects at start. A thing's own check shadows a library hook with the same intention. Three example hooks only.
- **Search fixed:** looking around is now a roll. Poor rolls notice nothing, far things are harder, hints describe things and no longer say what to do ("Someone could climb that" is gone). Each spot can be looked over once.
- **Strong success** (2+ advantages) adds extra effects when a hook defines them.
- The guard can now be sized up and the boulder studied with Nature Lore, through library hooks, with no gate-specific code.
- 100 tests. Not checked in a browser (no Playwright on this machine), so please try the gate: look around from the start, then walk toward the boulder.

## 2026-10-26 — Session 10: director's review turned into a plan

Plans written, not built: [ranked backlog](design/backlog.md), [skill web](design/skill-web.md) (standard / object / quest hooks, intentions, gear, people, drives, terrain), [creator next pass](design/creator-next.md) (pre-set characters with locks, clearer event cards, life events as searchable hooks, handover for a content pass).
Quick fixes done:
- "Game master" / "GM allows" removed from the creator and the event texts.
- Equipment package names (Craft tools etc.) are English on the sheet and in the list.
- Attribute cap message reworded (no longer reads like a Vitality rule); warnings for unspent attribute lumps, trait points and skill units; religion warning says where to pick.
- Q17 turned out to be a bug (assigning more trait points than you had): fixed. Q18 answered: social tries linger (limited talks, mood from the last outcome), added to the skill web.

## 2026-10-26 — Session 9: clean-up

We're in a design stage, building the engine in vignettes; nothing is finished and the final art style isn't set.

- **Docs cleaned.** Removed the old dice-as-cards design (dice system, game-design pillars, turn proposal, Q3), the old story seeds, and the old Phaser/dice decisions. Rewrote the [overview](design/game-design.md), [roadmap](design/roadmap.md), [art direction](art/art-direction.md), [decisions](decisions.md), [questions](questions.md) and the Director's Room start page. Vision notes keep their original text with a status note.
- **Code cleaned.** Removed the unused card-dice code (`core/dice`, demo dice, face texts, dice art, the Art Lab's dice section) and the old gold/party fields in the save.
- **No backwards compatibility.** Save and character migrations removed; a save from another version is dropped.
- **Translatable later (Q10).** `src/i18n/` has `t(key, 'English text')` and an empty English file. Nothing moved in yet.
- Answers recorded: Q12 A, Q13 as is, Q5 parked. **Q11 (private) is open** with options: a private repo doesn't hide a Pages site.
- 83 tests (the removed dice tests are gone, i18n and version-drop tests added).

## 2026-10-26 — Session 8b: the gate, after the director's answers

- **Silver, not gold** (Q16).
- **Use a skill where you stand:** a button under the map. It acts on what's next to you (Climb by the boulder, Search by the cart). Search or Alertness with nothing right there **looks around** and tells you what's worth a closer look nearby, and in which direction.
- **Skills grouped** by skill group in fold-outs, with expertise, marks, crafts and abilities last (Q14).
- **Hints on/off** switch for the "✓ Useful here" marks (Q14). On while we test; the standard game will likely have them off.
- **Not linear:** you can still sleep at the fire after getting the gate open another way.
- Written down for later: almost everything should be clickable (flowers, ground), with Use a skill on all of it. See [Exploration scenes](design/exploration-scenes.md).
- 84 tests.

## 2026-10-26 — Session 8: the village gate (skills and talking)

The director's first test of skills and talking to the world. [Play it](https://andrejohanssonlindh.github.io/slicehaven/scene/) ("Gate" in the sandbox top bar). Design and rules: [Exploration scenes](design/exploration-scenes.md).

- **New scene:** a village gate at night. There's a palisade, a guard with a torch, a big ivy-grown boulder, a handcart, travellers round a campfire, and cottages behind the wall. Four ways in: argue (bribe / threaten / sweet-talk), climb the ivy (Climb 15, two tries before the guard notices), search the cart for a trader's pass, or sleep by the fire and wake up robbed of 70% of your gold. You start with 100.
- **Things bigger than one hex:** the boulder covers three hexes, the cart and gate two. Units can have a shape too (for big monsters later): they block every hex they cover and only move where they fit.
- **Use a skill, anywhere:** every thing has it. Skills that would work are flagged "useful here". Anything else gets a line and no roll.
- **Social conflicts** after the rules: three rounds, Control, locked roll, −2D6 for repeats, situation ±2, and the guard cancels your Control with his. Each approach has its own reasonable skills.
- **Real dice:** open-ended D6 pools with the rolls shown in full.
- **Console** at the bottom: the last two lines, tap to open the whole log.
- **Your own hero:** the scene plays your current creator character (or a default shepherd). Tap your hero to see your dice or switch.
- New art: palisade, gate (shut and open), ivy boulder, handcart, campfire (lit and out), cottages with lit windows, a guard and three travellers.
- 19 new tests (80 in total). Fuzz-tested in the browser with random taps: no errors, nothing stuck.

## 2026-10-26 — Session 7: character creator, first review fixes

From the director's notes on the first playable creator:
- **No more "like the book"** text or step numbers in headings and the step bar. The footer just says what's left to do.
- **Archetype and Environment are now two steps.** The occupation sits with the environment.
- **Choice lists fold up** once you've chosen (homeland, people, religion, archetype, environment), so what the choice gives you and asks of you is right under it, not under the whole list. "Change" opens the list again.
- **Living standard removed.** Silver now comes only from archetypes and events. Old saves are moved over automatically.
- **Attributes and skills fit a phone screen:** fewer columns, with dice shown under the value.
- **Skills:** the unit pool you pick moves its skills to the top, with "other things these units can buy" right under them. A legend explains T, I and B.
- **Talent:** checked against the rules. It doesn't raise the value. In play it gives **+1D6 extra when you spend Focus** on the skill. (Only a *double* talent gives +2 units.)
- **Sensing bug fixed:** spending your first unit on Sensing attunes you and becomes its base 1. It wrongly gave 2 before.
- **Name & details:** name suggestions for your naming culture (tap to use, or roll one), gender chips, typical height and weight for your people with "use typical" and "roll a build", and checks: a name is needed, and a 4 m missla gets a friendly warning.
- **Armoury:** a real chooser for weapons, shields and armour. Browse by type. Each weapon shows damage already including your base damage, whether you're strong enough one- or two-handed, rarity and culture, length, weight, price, and what each property does. The same view is used for buying. Every weapon has a slot for a picture later.
- **Magic on the map, groundwork:** Sensing's rules for the map (reach and clarity grow with the roll) in `core/sensing.ts`, plus a note on what the other mystic skills could do: [Magic on the map](design/magic-on-map.md).

## 2026-10-26 — Session 6: the character creator

**New direction:** recreate the tabletop ruleset, starting with a freestanding character creator. [Open it](https://andrejohanssonlindh.github.io/slicehaven/chargen/) (also "Hero" in the game's top bar). Plan and status: [Character creator](design/character-creator.md).

- All 14 steps of the book's flow as a phone-first wizard, with a step bar showing red dots where something is left to do. It saves itself, keeps several characters, and can export/import.
- Dice where the book rolls: homeland (2×d100, optional), background (2×d100, keep one), human people, archetype/environment (d10), field disturbances and spirit animals, all event tables (d100, one free re-roll), Friends & Foes (roll twice, keep one), weapon arm (d10).
- Data: 18 homelands, 100 backgrounds, every people (humans, marvellous peoples, 6 elf tribes, 4 dwarf clans + clanless, 3 tirak houses × 3 sizes + houseless, misslor), 26 religions and cults with doctrines, 9 archetypes, 10 environments, 6 living standards, 7 event tables, 43 languages and 14 scripts, about 400 skills.
- Rules: attributes (balanced/focused lumps or free points), Wisdom's effect on knowledge skills, unit pools with what each may buy, the skill cap and overflow, talents/incompetence/blocks, attunement, hardening, base armour and damage.
- Character sheet in four parts, one column on the phone, two on PC, printable.
- No brand name anywhere; descriptions are my own short summaries.
- Still to come: drives list, weapon/armour lists with stats, mystic gear and mysteries, name suggestions.

## 2026-10-25 — Session 5b: radiation you can feel, Turns/Flow

- **Fire:** next to a burning hex is now **+1** (was 0), between two fires +2, two away −1. Inside a blaze it's still +3. (The flames and the heat around them now have separate caps.)
- **Rocks:** full strength on the neighbouring hexes, so next to a rock is **+1** earth (+2 on gravel), fading fast beyond.
- **Friends / your hero:** life now visibly reaches the neighbouring hexes (+1 on and next to them). Beasts, bodies and undead radiate a bit more too.
- **Turns / Flow toggle** (World tab): flowing time drifts clouds continuously and lets fire and storms tick on their own. This is a first feel for the free-flowing parts of the game.
- 33 rule tests.

**Director's notes on this:** happy enough with nature and magic for now. The filaments are a hidden layer of bonuses: a detail, but a much-liked one.

## 2026-10-25 — Session 5: the world moves in turns, magic v2

**Your feedback, done**
- **Animations racing** when wind or sky changed: fixed. (The sway frame was calculated as time × wind, so any change in wind made it race. It now runs on an accumulated clock.)
- **Turns:** "Foes act" → **End turn** (foes act, then the world moves). **Pass turn** on the World tab moves only the world.
  - **Clouds** drift with the wind each turn and glide into place. The same cloud field drives the drawn shadows and the rules.
  - **Fire** is turn-based: it burns for 2–3 turns, **spreads** to neighbours (much more downwind, much less in rain), then burns out. Standing in fire hurts.
  - **Lightning:** storms throw at most one bolt per turn, drawn to tall things.
- **Filaments v2: sources radiate.** Trees, rocks, water, fire, ash, bodies, undead, friends and beasts all affect hexes up to 2 away (weaker with distance, capped per kind). See [Magic: filaments](design/magic-filaments.md).
  - Clear day: light +1 everywhere, **+2 around water**.
  - Trees: life and darkness around them. Rocks: earth around them.
  - **Shadows**: trees cast them south-east by day, long and east at dusk. Drawn on the map and counted in the rules (less light, more darkness).
  - **Clouds** over a hex: less light, more darkness.
  - Fire's heat and light spread outward.
- **Bodies stay** where they fell (upright figures fall sideways, beasts roll onto their backs) and radiate necrotropy. Skeletons radiate it too.
- 31 rule tests (filaments + world step).

## 2026-10-25 — Session 4: wind & filaments

**Done**
- **Wind** as its own control (World tab): force 0–6 on Eon's scale (calm → hurricane) and 8 directions. Trees and grass lean downwind, and rain, leaves, smoke, embers and cloud shadows all follow it. Changing the sky still sets a typical wind, which you can then adjust.
- **Filaments (magic flow)**, from Eon's magic rules: 8 aspects (life, light, earth, water, death, air, fire, darkness), each hex scored −3 (magic-dead) to +3 (extreme) from its terrain, its neighbours, time of day, weather, wind and indoors/outdoors. Full explanation in **[Magic: filaments](design/magic-filaments.md)**.
- **Magic tab** in the sandbox: heat map per aspect with numbers on every hex, a readout of all 8 aspects for a tapped hex with the reasoning, and a **Roof** tool to make hexes indoors.
- Deaths now leave a bloodstain and feed necrotropy.
- Tuned so extremes are rare: wading in the ford is +1 water, +2 in rain, +3 only in a storm. Rain alone only lifts dry land to normal.
- 22 rule tests, including your example (2 water + downpour → extreme).

## 2026-10-25 — Session 3b: crash fix

**Bug you found:** the game froze after the first monster acted.
- **Cause:** a timing bug. Each animation recorded its start time slightly *after* the timestamp of the frame that drew it. On the first frame the animation's progress came out negative, the code read a path point that didn't exist, and that error stopped the render loop for good. The enemy turn then waited forever. It depended on exact timing, which is why it seemed random and reloading "fixed" it.
- **Fixed**, plus safety nets: the render loop survives errors, a removed unit (e.g. killed by lightning mid-walk) never leaves the game waiting, and a failed action or enemy turn hands control back to you.
- **Verified** with an automated stress test in the browser: 200 random actions and 36 enemy turns during a storm. No errors, never stuck.
- Added a **Reset** button (World tab).

## 2026-10-25 — Session 3: engine sandbox

**Done**
- **Own engine** (`src/engine/`), replacing the old Phaser prototype on the main page:
  - **Camera:** pinch / mouse wheel / +− buttons to zoom (whole-pixel steps, so pixels stay crisp), drag to pan, ⤢ to fit.
  - **Weather:** clear, cloudy (drifting cloud shadows), rain (drops, splashes, washed-out colours), storm (heavy rain, strong wind, blowing leaves, random lightning on tall things). Changes roll in smoothly.
  - **Time of day:** day, dusk (warm), night (dark blue). Fire lights up its surroundings, skeleton eyes glow, heroes carry a faint lantern at night.
  - **Wind:** trees, thickets and grass sway harder and lean downwind as the wind picks up.
  - **Fire:** set fire to trees, thickets, grass. It burns, smokes, throws embers, then leaves ash and charred trunks. Thickets burn away and open the hex. Rain shortens fires. No spreading yet.
  - **Lightning:** tap to strike. Bolt + screen flash, damages and sets fire.
- **Sandbox controls:** Walk (lit hexes; tap to plot, tap the end again to go; or plot your own route hex by hex), Jump (straight lines over obstacles/water), Strike, Sling (range 2–4), Heal, "Foes act" (enemies walk up and bite). World tab: weather, time, fire, lightning, spawn foes (tap again to cycle wolf/rat/skeleton) and friends.
- Rules for movement, targeting, damage and the simple monster AI are in `src/core/battle.ts`, with tests.
- Tested in the browser: all actions, weather, fire and lightning work. One frame takes about 3 ms in a night storm.

**Not done yet:** mob art pass (your 5/10 feedback), zoom in the Art Lab, real turn structure, and dice driving the actions.

## 2026-10-25 — Session 2: art direction test #1

**Done**
- Saved your vision notes (movement, party traits, dice, story) → [vision](vision/2026-10-25-director-notes.md).
- Built the **art tools** (`src/art/`): everything is generated by code: terrain, rivers, trees, rocks, mobs, dice.
- New **[Art Lab](https://andrejohanssonlindh.github.io/slicehaven/artlab/)** page: animated forest scene, tile sheet, mobs, and the 3-level dice viewer (cube → unfolded cross → face details).
- Added your dice effects to the rules engine: jump, bleed, poison, rend, disease (rules text drafted in `src/content/faceText.ts`).
- I looked at everything in a browser myself and fixed what looked off: the rat was too small, the faces were cramped, the pond was too hex-shaped, grass grew on water.

**Next:** your feedback on the art (Q6). Then I'll make the game use the new tiles.

## 2026-10-25 — Session 1: foundations

**Done**
- Created the repo, GitHub Pages deploy (every push to `main` goes live in about a minute).
- Rules engine skeleton (`src/core/`), with tests:
  - seeded RNG, so fights can be saved and replayed
  - hex grid math (distance, neighbours, reachable hexes, pixel ↔ hex)
  - dice: faces, gear modifiers (add/remove/replace face, +N to a kind), and the **spent → rest → lose a die** loop
  - versioned save with export/import code
- **Tech prototype** on the game page: one hero (Legoknekt, 4 dice), a hex map with hidden areas that open when you step on a door, two dummy skeletons. Tap a die to roll it, then act on the face. When all dice are spent you rest and pick one to lose.
- This Director's Room.

**Why this tech**
- **Phaser 4**: mature 2D engine. Handles sprites, tweens, cameras, input and pixel-art scaling, so we don't build that ourselves. Works well on phones.
- **TypeScript**: the rules are going to get complicated (dice modifiers, status effects, monster AI). Types catch mistakes before you ever see them.
- **Vite**: fast, simple builds to static files, which is all GitHub Pages can host.
- Rules live in plain TypeScript, apart from the engine, so they can be tested without a browser and the engine could be swapped later.

**Try it:** open the game, roll Boots to walk to the brown door hex, keep going to the grove, fight the skeletons.

**Next up (proposal)**
1. Your answers to the [questions](questions.md), especially dice per turn and party size.
2. Turn structure + monster AI (monsters act, you take damage, shield blocks).
3. First real pixel art: tiles, hero and skeleton sprites.
4. Overworld map scene with selectable locations.
