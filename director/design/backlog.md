# Backlog — ranked

*From the director's notes of 2026-10-26 (two areas: character creator, skills in the world). Ranked by **value for the director's next test ÷ effort**. Nothing here is "to do right now" except what's marked Done. Designs live in [Skill web](skill-web.md) and [Creator: pre-set characters, life events](creator-next.md).*

Effort: **S** under an hour · **M** a session · **L** several sessions, split into vignettes.

## Done this session
| # | Item | Notes |
|---|---|---|
| ✅ | Removed "game master" / "GM allows" from the creator UI, warnings and event texts | Rule notes that said "the GM decides" now just state the rule. |
| ✅ | Craft tools etc. showed in Swedish on the sheet and the equipment list | One shared English name table for the 14 packages (`PACKAGES_EN`). |
| ✅ | "At most 10 points on Vitality" read like a special rule | Now: "*X* has *n* points added; at most 10 can be added to any one attribute." |
| ✅ | No warning when attribute points, trait points or skill units are left unspent | Attributes step says how many lumps / extra points / points are left; Skills step lists units left per pool. |
| ✅ | "A trait requires the Vontar faith" with no clue where to pick | Warning now says to pick it in the Religion step, and also shows when no religion is chosen yet. |

## Character creator — still open
Ranked.

| Rank | Item | Effort | Why this rank |
|---|---|---|---|
| 1 | **Explain the event cards.** "Intrigues & Misdeeds · from Leader · 45 · Inspires trust · Social units (2) · Choose one: Honest Air (8) / Honest Face (8)" is unreadable even to a veteran. Needs a plain-language card: *Where it came from*, *what happened* (one line), *what you get*, *what you choose* — and "(8)" explained. | M (design + Haiku fill-in; handover in [Creator next](creator-next.md)) | It's the step with the most choices and the least understanding. Blocks trusting the creator. |
| 2 | **Pre-set characters** (companions, NPCs, scripted starts): lock people, drive, archetype… and let the player decide the rest. | M | The creator will be used several times with fixed parts; the shape of "locks" affects everything else. Do before more polish. |
| 3 | **Check "5/1 extra points from traits"**: the trait points can be piled on one attribute with no limit besides the 10 cap. Is there a per-attribute limit for trait points? | S once answered (Q17) | Possible rule hole. Needs the director's call or a look at the source. |
| 4 | **Life events as a searchable list with hooks** (every roll result gets a tag and a description and is saved on the sheet as a "major event"). | L (data) / S (the saved list) | Long-term payoff (game hooks), but the saved list also helps with rank 1. |
| 5 | Religion step: when a trait fixes the religion to one choice, **offer to preselect** it. | S | Nice, not urgent. The warning now explains. |
| 6 | Package contents (what's in "Thief's tools" etc.) as real items with skill bonuses | M | Needed for gear-choice on skill use (skill web step 7). |
| 7 | Text through `t()` for the creator UI | L | Parked: no languages yet. |

## Skills in the world — all open
Ranked. All follow the [Skill web](skill-web.md) build order.

| Rank | Item | Effort | Why this rank |
|---|---|---|---|
| 1 | **Search is a check, not a win**; stop listing solutions (e.g. "climb over") in scenes without a quest. | S–M | A bug in a current scene's design; cheap, and it shows the right direction. |
| 2 | **Shape of the web**: thing kinds, intentions, outcomes (fail / success / strong), layer lookup 3→2→1. Types + resolver + tests. | M | Everything else depends on it. |
| 3 | **Humanoid social set** (Argue, Charm, and the knowledge skills that apply to people): the first standard hooks. | M | The most obvious target, and every scene has people. |
| 4 | **Advantage tokens** in scene state ("+1 on a later roll against them / for a party member"). | S–M | Makes intentions like *impress* and *distract* real even before the rolls exist. |
| 5 | **Wilderness set** (food, fire, trail) on terrain. | M | Standard hooks for the second skill group. |
| 6 | **Object set** (rock → Geology, lock → Lockpick, plants, water, door). | M | Layer 2. |
| 7 | **People vs. people** reaction table + **status tags** (rich trader vs. beggar). | M | Needs 3 first. Table can start small: dwarf/elf/tirak/human. |
| 8 | **Gear choice on skill use** (thieves' tools → lockpick). | M | Needs creator package contents (rank 6 above). |
| 9 | **Drive hooks** on social skills. | L | 45 drives; fill one family of drives at a time. |
| 10 | **Terrain + weather modifiers** on sneaking/climbing. | M | Needs the tile data to carry skill modifiers. |
| 11 | **Fill the content tables** skill by skill. | L, repeatable | Done last and in small slices: one file per skill. |

## Suggested next three sessions
1. Skill web 1–2 (rank 1 + 2): shape of the web, Search fixed in the gate scene.
2. Creator rank 1 (event card clarity) **and** the pre-set characters shape (rank 2), as one design pass.
3. Humanoid social set + advantage tokens (skill web 3–4).
