# Questions for the director

Newest on top. Answer in chat (just reference the number, e.g. "Q11: option B"). I'll move answered ones to [decisions](decisions.md).

---

### Q19 — Tidy the skill hooks before adding more? *(2026-10-27)*
The [structure review](design/skill-structure-review.md) finds the skill/hook design sound, with five seams that get more expensive as content grows: two trees for "who someone is", intentions vs tags, hooks hand-picking skills, files by history, and no translation keys for leanings.
- **A) Fix them first** (about 1.5 sessions, no new features, the content stays). **My recommendation.**
- **B) Keep adding content** and fix later, which means more to move.

---

### Q11 — Private repo, but testable from anywhere *(you asked: can it be private?)*
Short version: **a private repo does not make the site private.** GitHub Pages sites are public even when the repo is private, unless the account is on GitHub Enterprise Cloud. So there are three ways, and I haven't changed anything yet:

- **A) Leave it public for now.** It holds rules numbers and our own summaries, no book text and no brand name. Nothing to do.
- **B) Private repo + a host with a login in front.** Cloudflare Pages with Cloudflare Access (free for up to 50 people): you'd log in with your email on the phone, and nobody else gets in. The repo can go private at the same time. Costs me an hour to move the deploy; you keep testing from anywhere. **My recommendation** if you want it closed before the data grows.
- **C) Private repo + keep Pages.** Needs a paid GitHub plan, and the site is still reachable by anyone with the link, so it hides the source only.

Tell me A or B and I'll do the rest. I won't change repo visibility without your go.

---

## Parked
- **Story (was Q5).** Which war killed the shepherd's father: left until the engine work is further along ([your notes](vision/2026-10-25-director-notes.md) and the [world notes](world/eon-notes.md) have what's needed).

## Answered
- **Q17 Trait points per attribute?** → it was a bug: you could assign 5 with only 1 to give. The + button now stops at the points you have (and the move is refused in code). No per-attribute limit was needed. *(2026-10-26)*
- **Q18 Does a failed social try linger?** → yes, in several ways: interactions with most characters are limited in number, and the outcome of an Argue colours the next attempt. Written into the [skill web](design/skill-web.md). *(2026-10-26)*
- **Q3 Dice per turn?** → outdated, removed. The old dice-as-cards idea is gone from the design. *(2026-10-26)*
- **Q10 English or Swedish terms?** → English. Groundwork so it *can* be translated: `src/i18n/` (a `t(key, 'English text')` function and an empty English file). Nothing is moved into it yet. *(2026-10-26)*
- **Q12 Starting silver?** → A: the game engine will hand out silver its own way. *(2026-10-26)*
- **Q13 Ages and name lists?** → current is fine. *(2026-10-26)*
- **Q14 Show "useful here"?** → both ways are useful. The standard game will likely not show it, so it's now a **Hints on/off** switch. Skill lists are grouped by skill group in fold-outs, with expertise, marks, crafts and abilities at the end. *(2026-10-26)*
- **Q15 One approach or switch mid-conversation?** → one approach per try, for simplicity. Each approach still mixes several skills (sweet talk can use both Argue and Charm). *(2026-10-26)*
- **Q16 Gold or silver?** → silver. *(2026-10-26)*
- **Q9 Filaments v2 / world step** → right direction; radiation too weak next to sources (fixed in 5b); want both turn-based and free-flowing time. Nature & magic good enough for now. *(2026-10-25)*
- **Q7 Engine sandbox** → feels good; fixes requested (done in session 5). *(2026-10-25)*
- **Q8 Filaments v1** → good start; sources should radiate, world should move in turns, shadows, bodies stay (done in session 5). *(2026-10-25)*
- **Q6 Art test #1** → approved at the time; mobs need work; zoom needed. The final style is not set, see [art direction](art/art-direction.md). *(2026-10-25)*
- **Q1 Eon names** → keep the names. *(2026-10-25)*
- **Q2 Party size** → variable, max 4; early game 1, later usually 2. *(2026-10-25)*
- **Q4 Language** → English. *(2026-10-25)*
