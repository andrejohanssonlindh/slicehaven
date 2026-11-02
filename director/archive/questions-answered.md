# Answered questions

*Archive of the questions in [questions](../questions.md) once answered or dropped. Newest on top. What they decided, if it still stands, is in the [decisions](../decisions.md).*

## 2026-11-02
- **Q31 Low-poly models: is this the plan?** → **yes, with one change:** the peoples need **different bodies**, or at least different sizes, not one body for all. Furniture by Sonnet from examples and a how-to: yes. The gallery: yes.
- **Q28 Turning the view: how far?** → **free turning.** The trouble from other angles only comes from things painted as flat cards (people, furniture, horses); low-poly 3D models fix it (plan A1, A2).
- **Q29 The live world and rounds** → the game runs in **free time**. A fight stops time and plays in rounds, each **4 seconds** of world time (an old definition), run very slowly. A **slow day and night** cycle: games with a fast one feel rushed. How the clock scales is not decided (plan A3).
- **Q30 People's bodies** → my reading was right: a simple 3D body, one shell for the clothes' colour, one overlapping for a pixel edge. The 3D path should also give animations, fighting included (plan A2).
- **Q27 Sheets for kinds of person** →
  1. Novices half a die lower, capable and skilled as the book, masters half a die higher: **yes**.
  2. Knacks (2–3 extra side skills from the archetype's list): **keep them**. People could have even more skills: a people's basic skills, if their kinds don't already give them.
  3. Gifts of a people on the sheet: **yes**. And they are fixed: a tirak always has darkvision, not by chance. (Follow-ups: plan item B4.)
- **Q25 How do maps join?** → **an overworld very like Fallout 1–2**, designed later (plan item D1).
- **Q21 Reedwater, the first full village** → **dropped**: too much has to be built first. The first real village is now plan item D3 (a village by a lake).
- **Q20 Village art and building scale** → **parked**, not answered: one-storey houses and stables are good, none of the taller ones look good. Back to it later. Turning the view (A1) may solve much of it.
- **Q11 Private repo, testable from anywhere** → **parked** until the director brings it up. Options as asked: A) leave public; B) private repo + Cloudflare Pages with a login (my recommendation); C) private repo + paid GitHub plan (source hidden, site still reachable).

## Earlier
- **Q19 Tidy the skill hooks before adding more?** → yes, fix first and lay the structure for the rest. Done in session 18: see the [structure review](skill-structure-review.md) and the recipe in the [handover](../design/skill-map-handover.md) §4. *(2026-10-27)*
- **Q17 Trait points per attribute?** → it was a bug: you could assign 5 with only 1 to give. The + button now stops at the points you have (and the move is refused in code). No per-attribute limit was needed. *(2026-10-26)*
- **Q18 Does a failed social try linger?** → yes, in several ways: interactions with most characters are limited in number, and the outcome of an Argue colours the next attempt. Written into the [skill web](../design/skill-web.md). *(2026-10-26)*
- **Q3 Dice per turn?** → outdated, removed. The old dice-as-cards idea is gone from the design. *(2026-10-26)*
- **Q10 English or Swedish terms?** → English. Groundwork so it *can* be translated: `src/i18n/`. *(2026-10-26)*
- **Q12 Starting silver?** → A: the game engine will hand out silver its own way. *(2026-10-26)*
- **Q13 Ages and name lists?** → current is fine. *(2026-10-26)*
- **Q14 Show "useful here"?** → both ways are useful; a **Hints on/off** switch. *(2026-10-26)*
- **Q15 One approach or switch mid-conversation?** → one approach per try. *(2026-10-26)*
- **Q16 Gold or silver?** → silver. *(2026-10-26)*
- **Q9 Filaments v2 / world step** → right direction; radiation too weak next to sources (fixed); want both turn-based and free-flowing time. *(2026-10-25)*
- **Q7 Engine sandbox** → feels good; fixes requested (done in session 5). *(2026-10-25)*
- **Q8 Filaments v1** → good start; sources should radiate, world should move in turns, shadows, bodies stay. *(2026-10-25)*
- **Q6 Art test #1** → approved at the time; mobs need work; zoom needed. *(2026-10-25)*
- **Q1 Eon names** → keep the names. *(2026-10-25)*
- **Q2 Party size** → variable, max 4; early game 1, later usually 2. *(2026-10-25)*
- **Q4 Language** → English. *(2026-10-25)*
