# Devlog

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
