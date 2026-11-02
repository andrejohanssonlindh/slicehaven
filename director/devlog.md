# Devlog

*Newest first. Everything up to the start of 2026-11-02 is in the [archive](archive/devlog-to-2026-11-02.md).*

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
