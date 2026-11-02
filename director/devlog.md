# Devlog

*Newest first. Everything up to the start of 2026-11-02 is in the [archive](archive/devlog-to-2026-11-02.md).*

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
