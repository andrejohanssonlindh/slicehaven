# Character creator — plan

*Started 2026-10-26. The director's brief: recreate the tabletop ruleset we're borrowing the world from, starting with a **freestanding character creator** that runs the book's full creation flow, decisions and dice included, and ends in a character sheet readable on phone and PC.*

## Ground rules
- **No brand name** anywhere in the repo, the UI or commit messages. Inside the app it is just "Character Creator".
- **Our own words.** Mechanics (numbers, tables, what each choice gives) are recreated as data. Descriptions are short summaries written by me, never copied text. The PDFs stay local; my working notes from them live in `reference/`, which is gitignored.
- **World names** (Mundana, Asharien, peoples, religions) are kept, following the earlier decision Q1.
- **English** UI and text, following the earlier decision Q4. See Q10 in [questions](../questions.md).

## Where it lives
- Page: **`/slicehaven/chargen/`**, linked from the game's top bar and the Director's Room.
- `src/core/chargen/`: pure rules (no DOM). Resolving grants, unit pools, attribute/skill maths, validation. Unit tested.
- `src/content/chargen/`: data. Homelands, backgrounds, peoples, religions, archetypes, environments, living standards, the 7 event tables, skills, traits, gear, mysteries.
- `src/chargen/`: the page (DOM UI, dice animation, sheet).

## How it works
- **State = your decisions + your dice results.** Everything else (units, skill values, dice codes, languages, gear) is *derived* from that state by one pure function. Going back and changing an early step updates everything after it automatically, and nothing gets out of sync.
- Saved automatically in the browser (localStorage, versioned). Several characters can be kept, with export/import as a text code.
- Every die roll is a visible, tappable roll (d100, d10) and gets recorded. The one free re-roll on the event tables is tracked, like in the book.
- Each grant from the book is written as a small "grant" line, e.g. `skill:Storytelling 2; group:social 3; roll:travel 1; numb:violence 1`. The rules engine reads these lines, and a test checks that every line in the data parses and names a real skill.

## The flow (14 steps, as in the book)
1. **Preparation**: campaign notes and restrictions (free text).
2. **Homeland**: choose, or roll d100 twice and pick one. Gives the majority language.
3. **Background**: always rolled, d100 twice, pick one. Gives 1 event roll, and you pick 2 of 3 skills.
4. **People**: choose a people/tribe/clan. Attributes, innate traits, cultural traits, language, pick 2 of 5 optional traits, plus sub-choices (totems, castes, field disturbances…).
5. **Religion**: choose (or forced by a trait). Pick 2 doctrines (each has 2 options). Skipped for godless elves.
6. **Archetype, environment, occupation, living standard**: event rolls, 24 skill units, gear, pick 2 extras. The environment gives attribute changes and pick 1. Living standard gives silver and lodging.
7. **Event tables**: roll everything you've collected (d100 each), with one re-roll. Results chain (extra rolls, friends & enemies).
8. **Attributes**: base + modifiers, then 40 points as *Focused* (10,10,8,8,4,0,0,0) or *Balanced* (10,6,6,6,4,4,2,2). Max 10 per attribute, minimum 4 at the end. Converted to dice; Wisdom sets base-1 knowledge skills.
9. **Skills**: spend units in order: locked to a skill, then locked to a group, then free. Max 8 (1 if incompetent). Talents, incompetences, blocks. Units can also buy desensitization, languages and mysteries.
10. **Languages & contacts**: spoken/written languages, circles, companions.
11. **Drives**: primary and secondary character trait with their three levels.
12. **Name & details**: name, age, gender, home town, appearance, weapon arm (d10), relations.
13. **Equipment**: equipment packages, weapons and armour by rarity, buy more with silver.
14. **Mysticism & magic**: mystic gear and mysteries (only for mystics or those who got them).

Then: **Character sheet**, 4 sections like the book's (person, attributes & skills, combat & magic, gear & notes). Single column on the phone, two columns on PC, and printable.

## Build order (a push after each)
1. Skeleton page, state/save, dice roller, steps 1–3, skill list, sheet stub.
2. Peoples (all 42 cultures).
3. Religions and doctrines.
4. Archetypes, environments, living standards.
5. Event tables (7 tables × 100 results — the big one).
6. Attributes and skill spending.
7. Languages, circles, companions, drives, details.
8. Equipment and magic.
9. Full sheet, polish, fuzz test (random characters in a loop to catch dead ends).

## Status (2026-10-26)
| Part | State |
|---|---|
| Rules engine (grants, choices, pools, attributes, skills, Wisdom, event chains) | ✅ done, tested |
| Homelands, backgrounds (100), all peoples (42 + tirak sizes, clanless), religions (26) | ✅ |
| Archetypes (9), environments (10), living standards (6) | ✅ |
| Event tables: 6 × 100 + Friends & Foes (roll twice, keep one) | ✅ |
| Languages (43 tongues, 14 scripts, "can read" hint) | ✅ |
| Drives (step 11): 45 drives with three levels, roll 4 keep 2, locked drives from events shown | ✅ |
| Equipment: packages, weapon & armour lists with stats, prices | ⏳ names only for now |
| Mystic gear and the mystery lists | ⏳ free text for now |
| Name suggestions per culture | ⏳ not started |
| Companion details (types, pros/cons) | ⏳ name only |

## Handover notes (for the next session)
- **Read first:** `src/core/chargen/grants.ts` (the grant mini-language, documented at the top) and `src/core/chargen/derive.ts` (everything is derived from `CharState`).
- **Source text:** extracted page by page into `reference/p/NNN.txt` (gitignored). PDF page = book page + 3. Remaining chapters: drives p.203–210 (PDF 206–213), names p.211–218 (PDF 214–221), equipment p.219–248 (PDF 222–251), mystic gear & mysteries p.249–320 (PDF 252–323). `reference/ev.py A B` extracts "N. Name: … [grants]" entries from a page range.
- **Data keys are the source's own terms** (skill names, attributes), so data can be checked against the book; the UI shows English via `skills.ts`, `ATTR_EN` etc. A Swedish UI toggle would mostly be a lookup swap (see Q10).
- **Tests:** `tests/chargen.test.ts` checks that every grant line parses, names real skills/religions/peoples, that tables cover 1–100, unit totals per archetype/environment, plus rule maths.
- **Browser check:** `reference/tools/fuzz.js` (local only): random taps through all 15 steps against `npx vite --port 5199`, reports page errors. It needs `playwright-core` installed in `/tmp/pw` and the cached Chromium in `~/Library/Caches/ms-playwright`. `window.chargen` exposes `state`, `derived`, `render()`.
- **Choice keys:** `source#item[.token]` for in-grant choices, pick groups by key in `state.picks`, event slots `…@n`. Changing an early choice keeps later choices whose keys still exist.
- **Rule texts** (`regel:`) are shown on the sheet as special traits and not enforced (there's no play engine yet).

## Things I'll simplify at first
- Special abilities from traits and events are shown as **rule notes** on the sheet. They aren't enforced, because there's no play engine yet.
- The game master's permission (e.g. a culture's weapons) becomes a "GM allows" toggle.
- Options that need other books (e.g. fighting styles) are listed but marked as such.
