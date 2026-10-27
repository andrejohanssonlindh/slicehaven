# Decisions log

Only decisions that still stand. Ones that were replaced are removed (git history has them).

| Date | Decision | Why |
|---|---|---|
| 2026-10-27 | **Social tries linger:** most people put up with a limited number of talks, and the outcome of a try leaves a mood that colours the next | Director (Q18). |
| 2026-10-27 | **One kept advantage = 5 points off a later difficulty**, tied to a person; spending it uses it up | Matches the margin that earns an advantage on a roll. My choice; say if it feels wrong. |
| 2026-10-27 | **Single rolls change difficulty; challenges and conflicts change Control.** Mood and how peoples see each other: 2 difficulty per point, or 1 Control per point (max ±4); a kept advantage is 5 difficulty or 1 Control | Director, checked against the rules: difficulty is picked by circumstances, Control by situation. |
| 2026-10-27 | **Kin depends on context:** your own people only count as kin where you are not the majority. Rural humans sit between human and guard/outcast in the kind tree | Director. |
| 2026-10-27 | **Mood is shown as discrete notes in the log and when tapping a person**, no meter | Director. |
| 2026-10-26 | **We are in a design stage, building the engine.** Work comes as small vignettes (like the gate scene). Nothing is finished; anything done in the app is testing. | Director. |
| 2026-10-26 | **No backwards compatibility.** No save migrations; a save from another version is dropped. Bump the version when a shape changes. | Director: time spent on it is wasted at this stage. |
| 2026-10-26 | **The final graphical style is not set.** Some of the current art will survive, not all. It's decided when the game design starts. | Director. |
| 2026-10-26 | The old **dice-as-cards design is gone** (spend, rest, lose a die; die faces and gear modifying faces). The game builds on the tabletop ruleset's D6 pools instead. | Director's turn towards recreating the ruleset. |
| 2026-10-26 | **English only, but translatable:** text goes through `t(key, 'English')` in `src/i18n/`, language files come later. Nothing is moved into a file yet. | Director (Q10). |
| 2026-10-26 | Starting silver is handed out by the game engine in its own way, no flat purse | Director (Q12). |
| 2026-10-26 | Ages and name lists in the creator stay as they are | Director (Q13). |
| 2026-10-26 | Story is parked until the engine is further along | Director (Q5). |
| 2026-10-26 | Character creator: living standard removed | Director: it won't be used. Silver comes from archetypes and events only. |
| 2026-10-26 | Character creator: archetype and environment are separate steps | Director: the archetype step held too many decisions that weren't about the archetype. |
| 2026-10-26 | No "book" references or step numbering in the creator's UI | Director's review. |
| 2026-10-26 | Money is **silver** | Director (Q16). |
| 2026-10-26 | "Useful here" skill marks are a **Hints** setting; the standard game will likely hide them | Director (Q14): hidden by default later; searching nearby gives in-world hints instead. |
| 2026-10-26 | Skill lists grouped by skill group in fold-outs; expertise, marks, crafts, abilities last | Director (Q14). |
| 2026-10-26 | One approach per try in social conflicts, each approach with several reasonable skills | Director (Q15): simplicity, but an approach can still mix e.g. Argue and Charm. |
| 2026-10-26 | Scenes aren't linear: finishing one route must not close the others | Director: e.g. after bribing your way in you can still sleep at the fire. Write conditions on what *you've done*, not on which route is "the" one. |
| 2026-10-26 | Almost everything is clickable (flowers, ground…), with Use a skill on all of it; most attempts just do nothing | Director. The direction for scenes from now on. |
| 2026-10-26 | **Use a skill where you stand**, no need to tap a thing: it acts on what's next to you; Search looks around and describes what's interesting nearby | Director. Built in the gate scene. |
| 2026-10-25 | Web game on GitHub Pages, repo `slicehaven`; saves stay in the browser | Playable from the phone. |
| 2026-10-25 | Phone-first portrait layout | Director plays and reviews on the phone. |
| 2026-10-25 | Own canvas engine (no Phaser) | Art, lighting and weather are all per-pixel; our own renderer gives full control. |
| 2026-10-25 | The rulebook PDFs are never committed; names kept, prose our own | Copyrighted. Director (Q1): world names are fine. |
| 2026-10-25 | Party size variable, max 4 (early 1, later usually 2) | Director. |
| 2026-10-25 | Weather is a core system (clear/cloudy/rain/storm, day/dusk/night, wind force 0–6 + direction); lightning is rare | Director: ties into the magic, which draws power from the surroundings. |
| 2026-10-25 | Filaments per hex, −3..+3, from terrain + neighbours + time/weather/wind + indoors; sources radiate up to 2 hexes; shadows and clouds count; bodies stay and radiate necrotropy | Director. A hidden layer of bonuses; nature & magic are "good enough" for now. |
| 2026-10-25 | The world moves between turns (clouds drift, fire spreads and burns out, at most one lightning bolt per turn), and the game mixes turn-based and free-flowing time | Director. |
| 2026-10-25 | Engine sandbox approved as the base to build on | Director: "this is what I envisioned". |
| 2026-10-25 | Reuse terrain tiles with other palettes for other forest types | Director's idea (old-school recolouring). |
