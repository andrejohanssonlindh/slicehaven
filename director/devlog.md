# Devlog

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
