# Devlog

*Newest first. Everything up to the start of 2026-11-02 is in the [archive](archive/devlog-to-2026-11-02.md).*

## 2026-11-02 — Dice: dropped from higher, rethrown when they land badly, OK to close; D10+n

- **Dropped from a height** along the longer side of the screen (from the side on a wide phone, from the bottom when it's tall), so they bounce more before they roll out.
- **A die that stops on another die, or tilted, is thrown again**, as at a table: it hops up and is tossed back toward the middle. Before you see anything, the game tries up to four throws and picks one where every die ends flat on the glass.
- **The dice fit the screen:** they're smaller on a small or wide screen and when many are thrown, so a wide phone with ten dice has room for them all side by side.
- **OK or auto:** a new setting. By default the result stays until you press **OK**, which floats at the right in the game's button style. The other choice is to let the result go by itself, as before.
- **Sums of other dice:** a roll like D10+2 now works next to 3D6+2 (`rollPool` takes the die size). The panel has *Roll D10+2* and *Roll 10D6+2* to try them.
- **Why the result is rolled first and then the faces are painted on**, instead of reading the dice: see the decision of the same date.
- **Try it:** 3D world panel → Game row: *Rolls: press OK / go by themselves*, and the test rolls.

## 2026-11-02 — Dice on glass with physics; D100 as two D10s

- **The glass dice are physical now:** they are thrown in from the bottom, tumble, bounce off the edges of the screen and off each other, and roll to a stop, with soft shadows on the glass. The rules still decide: the whole throw is worked out first, then each die's faces are laid on so that it comes to rest on what was rolled. A six that splits glows when it settles and stays put; its two dice drop out of it and bounce off it.
- **A D100 is two D10s**, real ten-sided dice: one with 00, 10 … 90 and one with 0 … 9 (00 and 0 make 100). A D10 roll in the creator is one D10. The icons show a D100 as two numbers too.
- **On glass is the default** (your answer to Q32). If you've set another level, that choice stays.
- **New dependency:** `cannon-es`, a small physics library (about 90 kB, loaded only when dice are thrown on glass).
- **B3 waits** for the talk you want to have first.

## 2026-11-02 — B2: one roll system, shown three ways

- **Every roll goes through one place** (`core/dice.ts`): open rolls (a six is taken away and rolls two new dice), plain pools, and the creator's table rolls. A roll comes back as plain data that says what each die showed and which six it split from, so it can be shown and saved. The skill checks and the creator use it; seeded rolls come out exactly as before.
- **Shown at the level you pick** (one setting for every page): **dice on glass**, real 3D dice thrown up over the game that tumble and land on what was rolled (a D6 is a rounded cube; a D100 or D10 is a ten-sided token with its number); **icons**, small dice spinning in a row; or **just the result**. A six that splits glows as it lands and its two new dice come out of it. A tap lands the dice; the next closes the result.
- **Skins** are kept apart from the rolling: *bone* and *ember* for now, one file each in `content/dice/skins/`.
- **The character creator** rolls through it too: its dice now land on the real numbers (before, they flickered at random and the result appeared afterwards).
- **Try it:** in the 3D world, panel → **Game** row: *Dice:* changes the level, *Skin:* the dice, *Roll 4D6 vs 14* rolls a skill test (keep rolling to see sixes split), *Roll D100* a table roll. In the creator, any 🎲 button.
- **Your call:** which level should be the default (it's *icons* now), and whether a D100 should be two ten-sided dice (tens and ones) as at the table rather than one token.
- **Next:** B3, actions on things: tap the hearth, light it with a roll.

## 2026-11-02 — A2 and A3 done; B1: things remember, the world is saved

- **The flat cards are gone** (your call: A2 done). Every piece of furniture must have a model now; the card painters, the sprite atlas and the "old card" in the gallery are removed (about 2,000 lines). The stable's horse goes with them, so **the stalls are empty** until horses come back as kinds of creature (C3).
- **A3 settled** as you said: only combat goes to rounds; everything else plays live.
- **B1, state on placed things:** a kind says which states its things can be in and how they start (every fire is `lit`, starting lit; the oven is now a kind of fire too). A placed thing only stores what differs, under an id that is the same every time the map is built.
- **B1, the saved world:** one save per map: where the hero is (and on which storey), the clock, what has been seen, and the things' states. Written every 5 seconds and when you leave the page; a save from another version is dropped.
- **A hearth that is out** has no glow, no chimney smoke and gives no fire to the magic field.
- **Try it:** open the panel → **Game** row. *Nearest hearth* puts out (or lights) the hearth of the closest house; walk somewhere, close the page, open it again: you're where you were, at the same hour, the hearth still out, the map you've seen still grey. *New game* starts the map over. (Tapping the hearth itself comes with B3.)
- **Next:** B2, one roll system.

## 2026-11-02 — All the furniture in 3D, and bodies in the world

- **Everyone in the 3D world is a 3D body**, and the old flat people are gone (your call): no Bodies button, no old card beside the farmer in the gallery. Only the stable's horses are still cards.
- **Noted, not fixed:** the inn's two flights of stairs meet with no landing between them (minor; the bigger buildings get redesigned, C6).
- **Lighter bodies:** each body is now one skinned mesh on its skeleton (three draw calls a person instead of about thirty). With everyone in a body, the hamlet draws in about 360 calls (it was about 290 with cards, and 590 with the first bodies).
- **36 more pieces of furniture**, made by three Sonnet helpers working from the how-to: stools, pallets, chests, baskets, sacks, the hearth and the oven, rugs and straw, the inn's long tables, benches and ale kegs, counters (with their goods), the whole smithy, the loom, racks of fish and herbs, nets, hay. Every house is now furnished in 3D except the stable's horses. I went over them in the gallery: nothing broken or floating, all inside their footprints, but they are first passes from the descriptions, so tell me which ones read wrong.
- **Next:** your notes on the pieces; then the horse waits for kinds of creature (C3).

## 2026-11-02 — Furniture models: four examples and a how-to for Sonnet

- **Your notes on the bodies, fixed:** the walk no longer pauses where the legs pass (the motion was easing to a stop at every pose; now it flows through them); every torso has sloping shoulders, so the tirak aren't pointy; the gallery opens without the outline.
- **Furniture as models:** the **table, keg, bed and shelf** are 3D now, in every house. Each turns to face out from the wall it stands against (cards always faced the front). Beds being models means an inn may face any way now.
- **The gallery's Furniture view** (the first button switches People / Furniture): each model turning beside its old card, with its size and triangle count. Drag to look around; `?only=bed` shows one piece.
- **For Sonnet:** [how to make a furniture model](design/models-authoring.md): one file per piece, a kit of shapes, real sizes, colours, a budget, and a checklist. A test holds every model to the rules (on the floor, inside its footprint, under 450 triangles) and a browser test takes two pictures of each next to its old card. The other ~40 pieces are listed in six batches.
- **Next:** the batches.

## 2026-11-02 — A2 begins: a 3D body for every people

- **Try it:** the new **Models** page (from the start page): eight people on turning stands, one of each people and the tirak in their three sizes, with the old flat card beside the farmer. Buttons: turning, walking or standing, shells 0–2, the old card, the outline. In the 3D world, the **Bodies** button (Look row in the panel, or `?bodies` in the address) puts everyone on the map in their body.
- **Each people its own body** (your answer to Q31): humans the reference; elves longer-limbed and narrower with pointed ears; dwarves a big head, short legs, broad shoulders and big hands (bearded women too); tirak heavy-set with a jaw, claws and red eyes; misslor a big head and big eyes. **Sizes come from the rules' typical height and weight** for each people and for women and men (the same table the character creator uses): a dwarf 1.14 m, a human 1.6–1.7 m, the tirak 1.08, 1.87 and 2.26 m.
- **Dressed from the looks the kinds of person already have** (clothes, colours, hair, hats, aprons, cloaks, held tools): no person is made by hand. Two shells over cloth and hair for the ragged pixel edge. Walking and standing are poses stored as data.
- **Not yet:** faces are simple (eyes, a nose, a jaw); held things are rough; people walking through each other's skirts; no sitting or working yet. The cards stay until you're happy.
- **Fixed:** the graphics-memory browser test (it counted shapes made once and reused as a leak; nothing leaked).
- **Next:** your verdict on the bodies, then furniture examples and the how-to for Sonnet.

## 2026-11-02 — A1: turning the view

- **Try it:** in the 3D world, hold **⟲ / ⟳** (under the zoom buttons) or twist two fingers on the map. On a keyboard: Q and E. The camera turns round what it looks at, at any angle.
- **The cut-away works from every side:** each outer wall of a house (and its timbers, windows and door) knows which side it is on. The walls facing the camera fade when you go in; the far ones stay. So you can look into a house from behind or from the side.
- **People** turn with the view (front, back or profile, by where they walk relative to the camera). **Furniture cards** turn to whichever side of the house is nearest the camera, so they are never seen edge-on. Beds and horses are still painted from the front, so from other sides they read a little wrong; A2 (models) fixes that.
- **To judge on the phone:** does the pixel look shimmer while turning? It settles crisp as soon as you stop (the view snaps to whole pixels at every angle). If turning feels too fast or slow, say so (now about 80° a second).
- **Pattern:** the view's turn is engine state (`world.yaw`); the rule for "which wall faces the camera" lives in `core/world3d/view.ts` and is tested.
- **Next:** A2, a low-poly person next to today's card, once you've judged the turning.
- **After your first try:** two walls are now down from almost every angle; only within 5° of square onto a wall is it just one. On a computer, a sideways two-finger swipe on the trackpad turns the view (Safari also takes the trackpad twist; Chrome doesn't pass it to pages).
- **Browser tests:** from now on only the files a change can affect are run, not the whole 9-minute suite.

## 2026-11-02 — One plan, a pattern check, and a sparse Director's Room

- **Why:** two large refactors in October came from adding feature after feature without deciding how they should be built.
- **[How we build things](design/architecture.md):** the game's principles, the layers, every established pattern (where it lives, how to add one, what test guards it), and the foundations still missing. Before any new ask, Claude checks it against this page; if no pattern fits, the foundation is designed and agreed first.
- **[The plan](todo.md):** the director's weekend notes ([kept here](vision/2026-11-02-director-notes.md)) and the missing foundations in one list, ordered by what shapes the most: A (turning the view, low-poly models instead of cards, free time with fights in rounds), B (state, one roll system, actions, perception, items, effects, combat, magic), C (farms, crops, pasture, mounts, map maker), D (overworld, quests, the first village by a lake).
- **Questions:** Q25, Q27, Q28, Q29, Q30 answered, Q21 dropped, Q20 and Q11 parked; all in the [archive](archive/questions-answered.md), decisions recorded.
- **Director's Room cut down:** the front page lists only the plan, questions, decisions, devlog, vision notes and one page per area. Moved to the [archive](archive/README.md): the old overview, the code review, the M0 page, the brief, the structure review, the old backlog, the session-by-session 3D handover and the long devlog. The 3D handover is rewritten as one current-state page; the world structure page lost its old plan. The page picker no longer lists the archive, and the top bar no longer links to the skill map.
- **Next:** A1, turning the view freely.
