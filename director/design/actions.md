# Actions on things and people: a sketch of the frame (B3)

*2026-11-02. **The frame and the order of slices are agreed** (Q33); the details get settled as each slice is built. Written from the director's notes of [the same day](../vision/2026-11-02-director-notes-2.md). The point: build a frame that every later action plugs into as data, so the first version can do 10–20 % of what's wanted and the rest is added one file at a time.*

## What is already there (from the 2D days)
More than it looks. The **skill hooks** (`core/skillweb.ts`, `content/skillweb/hooks/`, one file per kind of effort) already say, per kind of thing: what can be tried, with which skills, at what difficulty, and what success, failure and a strong success do (something said, a flag set, time passing, mood moved, a clue). Social conflicts and challenges (`core/social.ts`, `core/challenge.ts`) exist as rules. What's missing is the **3D world asking them**, and three things the hooks never had: **permission, requirements (tools, items, place), and changing the world** (a state, an item, the clock).

## The frame: every action goes through five steps
Whatever is tried, a hearth, a stair, the smith's furnace, a guard, runs the same pipeline. Each step is a registry of small files, like behaviours and kinds.

| Step | Question | What answers it | First version |
|---|---|---|---|
| **1. Offer** | What can be tried on this? | The kind chain: skill hooks plus plain **verbs** that need no skill (sit, take, carry, open). Inherited: every `seat` can be sat on, every `fire` lit or put out | Tap a thing → its look and a short list |
| **2. Gates** | Can it be done, here, now, by you? | Small **condition files** (`gates/`), each one question: *is it yours or allowed* (owner), *have you the tool or item*, *is it the right place* (outside town bounds), *is it in the right state* (already lit), *is it small enough to pocket* | State and place gates; owner as a stub that says "allowed" |
| **3. Breaking a gate** | What if you do it anyway? | A failed **permission** gate does not block: it marks the act as a **transgression** (theft, trespass, using without leave). Whether anyone notices is perception (B5); what they do is a behaviour (B5/B8). Failed **requirement** gates (no flint) do block, with a reason | Not yet: needs owners and witnesses |
| **4. Resolve** | How is it rolled? | One of the modes we have: **no roll**, **one roll**, **a hidden read**, **a challenge** (three rolls), **a social conflict**; later **crafting** | No roll and one roll |
| **5. Outcome** | What changes? | The hook's effects, plus new ones: **set a state** (lit), **time passes** (10 minutes), **give / take an item**, **start carrying**, **a flag** (for quests), **someone's view of you moves** | State, time, a line said |

**Why this survives growth:** the smith example is the same pipeline, deeper. *Offer:* the furnace offers "work iron". *Gates:* owner (the smith's) → ask leave (a social roll, step 4 on *him*, outcome: a permission flag for today); tools (hammer, tongs: yours, or borrowed: an outcome of the talk); skill (you need the craft). *Resolve:* a craft challenge. *Outcome:* an item. Nothing in that needs an `if` on "smith" or "furnace".

## Things too big to pocket
Every item kind gets a **size class**: *pocket*, *bag*, *strapped* (a weapon on a strap, a shield), *in the hands* (a stool, a ladder, a sack of grain: both hands taken, slower, no fighting, dropped if you run or are hit), *too heavy* (a cart, a millstone: needs two or a beast). A built-in stair is part of the house and can't be taken; a loose ladder or stool can. "Steal the stair" is then *take* on a thing that is *in the hands* size and *owned*: a transgression, carried, not pocketed. Using it as a weapon waits for combat (B8), which reads an improvised-weapon property off the kind.

## Growing it with the director's notes
The director's proposal, building 10–20 % and then sending in notes to grow it, **is the right shape**, because every new action is data in the frame, not new code. To make each round quick, a short **action note** template:

> **Thing:** the smith's furnace · **Try:** work iron · **Allowed if:** the smith says so · **If not:** theft of use; he's angry if he sees · **Needs:** hammer, tongs, iron · **Skills:** smithing crafts · **Roll:** a challenge · **Result:** an item, time passes 2 h

When a note asks for a gate, a resolve mode or an outcome that doesn't exist yet, that is when the frame grows by one file, and it is agreed first (the pattern check).

## Where it would live
`core/world3d/actions.ts` (the pipeline: offer → gates → resolve → outcome), `content/actions/gates/` and `content/actions/verbs/` (one file each, found by themselves), outcomes beside the skill hooks' effects. The page: tap a thing → a sheet at the bottom with its look and what can be tried.

## Slices (in [the plan](../todo.md))
- **B3a The frame**: tap, look, offer, state and place gates, no-roll and one-roll resolve, state/time/say outcomes. Actions: light / put out a fire (roll, 10 min), sit, the existing reads (study, size up). An NPC lights the hearth at dawn through the same action.
- **B3b Take and carry** (with B6): size classes, pocket vs. in the hands, items leave the map and stay gone.
- **B3c Owners and transgressions** (with B4, B5): whose a thing is, using without leave, being seen.
- **B3d Talking in 3D**: the social conflicts we have, started by tapping a person; permission ("may I use the forge?") as an outcome.
- **Later:** crafting (a challenge plus tools plus materials → an item), improvised weapons (B8).
