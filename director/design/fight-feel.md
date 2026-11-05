# How a fight looks and feels

*2026-11-04. The director: "Rules are not changed per se… make it a bit more engaging. Current approach feels… wrong." Talked through and agreed the same day (decisions below). **Started: F0 (motions as data) built 2026-11-04.** It's built in the stages at the bottom, one at a time, each tried on the phone before the next.*

**Not changed:** the rules. `core/combat.ts` still takes one `Choice` per side per round and `resolveRound` decides what happens. Everything here is the page, the camera and the animations.

## Why the current panel feels wrong
It is a log with buttons: you read the fight instead of watching it. Two things the rules depend on can't be seen: **who is attacking this round** (in a melee only the attacker strikes, and the defender only defends) and **what the other side has chosen** (our upper-hand rule: the side ahead sees the other's choice). This design puts both on screen.

## The fight view
- **The camera.** When a fight starts, the view swings side-on to the line between the two fighters: **you middle-left, the foe middle-right**. You can still turn, zoom and pan. A **⚔ Back to fight** button brings the shot back. With several foes (B8c), it frames whoever you're paired with.
- **Your moves, on the left, in three groups, always all shown:**
  - **Offensive:** Standard, Quick, Powerful, Retreat. Edges join this group in B8b.
  - **Defensive:** every way you can defend × every tactic. That's parry, block (with a shield) and dodge, each as standard, defensive or counter. **Dodge can't counter.** Each button shows its pool (*Parry · Defensive 5D6*). **Nothing is picked for you**; today the best defence is chosen automatically, and that goes.
  - **Movement (the row along the bottom):** walk, run, pick up, draw (the side actions).
  - The group for the role you don't have this round is **greyed out, with a line saying why**: *"You're defending: they won the last exchange."* That teaches the role swaps, which happen out of sight today.
- **The foe, on the right, with the same layout.** If you have the upper hand, **their chosen move lights up** before you pick. If they have it, their column shows **?**.
- **A body outline for each fighter** (yours under your column, theirs under theirs). It shows the six hit locations from the D10 table (head, torso, both arms, both legs). **Wound icons land on the part that was hit** (cut, crush, broken, bleeding), and fatigue is a bar beside it. This is also how the director's early note on seeing injuries shows up in a fight. On normal and hard, the foe's outline shows only what you could see.

## Two modes: fast (default) and dice
- **Fast, the default.** Tap a move and the exchange plays out at once: swing → parried, blocked, dodged or hit → **damage floats up over the one hit in red, rising slowly**, the old-game way (a number on easy; a word such as *"deep cut"* on normal and hard, Q50) → an icon lands on their body outline. About 1.5 s, then your next pick. The dice are still rolled, just not shown; **tap a line in the log to see that exchange's dice**.
- **Dice.** Today's step-by-step flow in the new layout: **one roll per step**. Your attack, their defence (written beside), where it lands (D10), the damage, the serious-wound D10. Your own dice on the glass, as decided.
- A setting, kept in the game settings beside the dice level.

## Picking and timing
- **One tap acts on a computer. On a phone: tap to pick, tap again to confirm** (a mis-tap costs a round).
- **Defending without the upper hand, you pick first and blind**, and the attacker's swing plays as soon as you've picked.
- **A timer on your pick:**
  - **Easy:** none.
  - **Normal:** none at first. It comes after a few fights (a later step; noted, not built now).
  - **Hard:** 8 s.
  - The seconds are **one value per difficulty** in content, so they can be tuned without touching code.
  - When the time runs out, **whatever is highlighted is taken**, which starts as last round's move. Dithering costs you, but you don't lose your defence.
  - In dice mode the timer pauses while dice are rolling.

## The phone (portrait)
Two side columns don't fit in portrait. Proposal, to judge once it can be tried:
- **The view takes the top ~55%**, framed side-on.
- **Small body outlines go in the view's top corners**: yours on the left, the foe's on the right.
- **The foe's intent is a small icon over their head**, not a whole mirrored column. Tap it to see their full list.
- **Below the view: three tabs, Attack | Defend | Move.** The sheet opens on the one that matches your role this round, with the others greyed.
- **A phone held sideways** gets the computer layout, squeezed.

## Animation first: a foundation for motions
**Where it stands.** Bodies have joints, poses and looping cycles as data (walk, idle, sit: `content/people/poses.ts`), but the **fight motions are code**:
- The swing's keyframes and timings are written into one function (`fightPose`).
- The fight poses are a fixed list (`guard | swing | down | dead`).
- The renderer has its own `if` to lay a body down.

There will be many more motions: per weapon, per fighting style, parry, block, dodge, flinch, fall, the killing stroke. So the shape comes first (stage F0), then the library (F1).

**The shape (sketch, settled in F0):**
- **A motion is data**, one file each in `content/motions/`, found by itself (folder registry). It has:
  - its length in seconds and keyframes (time 0–1 → joint turns, a lift);
  - the **root**, so a body can step back on a dodge or fall to the ground (lying down stops being an `if` in the renderer);
  - which part of the body it drives (arms, upper body, whole), laid over the legs as carrying and wielding are now;
  - what follows it (back on guard, or hold the last pose);
  - **marks** such as `contact`, the moment the blade meets. The page uses it to time the parry, the floating number and later a sound.
- **Which motion plays is looked up, never `if`-ed.** An act (strike, parry, block, dodge, flinch, stagger, fall, finish), with the weapon's **way of moving** (a property on the weapon kind, inherited: one-handed blade, two-hander, staff, spear, axe and mace, shield, bare hands) and optionally the **fighting style**. The most specific motion that exists wins. A new weapon finds its motions from its kind; a gladiator can have flashier strikes without new code.
- **The engine plays a queue of motions per person** (`world.play(id, act)` replaces `world.swing`). Rules decide what happened; the page asks for the motions.
- **Checked when read** (the compile-and-report pattern): an unknown joint, keys out of order or a missing mark is a listed problem.
- **A motion viewer on `/models/`**: pick a body, a weapon and a motion; play, slow it down, loop it. That's how motions are made and checked, by whoever makes them and by the director.

### Built (F0, 2026-11-04): the format
A motion is a file in `content/motions/` (a family can share one file as an array: `lying.ts` has `down` and `dead`):

```ts
export default {
  id: 'strike', act: 'strike',      // the act it shows (MOTION_ACTS in core/world3d/motion.ts)
  way: 'staff', style: 'gladiator', // optional: only for weapons that move this way / this fighting style
  seconds: 0.7,
  part: 'upper',                    // 'arms' | 'upper' (over the legs) | 'whole' (every joint, and the root)
  keys: [                           // `at` 0..1, rising; a joint a key leaves out is at rest there
    { at: 0, joints: GUARD_ARMS },
    { at: 0.35, joints: { shoulderR: [-2.7, 0, -0.2], elbowR: [-0.7, 0, 0], spine: [0, -0.25, 0] } },
    { at: 1, joints: GUARD_ARMS },
  ],
  then: 'guard',                    // the act after it, or 'hold'
  marks: { contact: 0.6 },          // strike, parry, block, dodge, finish need `contact`
} satisfies Motion;
```

- **Whole-body motions move the root** per key: `root: { tilt, up, back, side }` (radians and metres; lying is `tilt: −π/2`). That replaced the renderer's `if` for lying.
- **Ways of moving** (`moves` on the weapon kind): `blade`, `two-hander`, `staff`, `spear`, `axe-mace`, `shield`, and `hands` for nothing held.
- **Lookup:** style + way beats style beats way beats any. With nothing for the act, it falls back (`FALLS_BACK`: finish → strike, stagger → flinch, fall → down), so the page can already ask for `finish` and the library fills it in later.
- **The world:** `world.play(id, act)` (optionally `{ after: true }` to queue it); `world.actOf(id)`. The fight page asks for `strike` and `finish`; F3 will ask for the rest.
- **Checked when read** (`motionLibraryProblems`, zero in `tests/motion.test.ts`): unknown act, joint or way; keys out of order; a joint outside the part; a missing mark; an act some `then` names with no motion for any weapon.
- **Viewer:** `/models/` → tap *People* until it says *Motions*; pick the body, what they hold and the motion; Play, 1× ½× ¼×, Loop, side or front. The time is shown, and a mark lights up as it passes. `/models/?show=motions` opens straight on it.
- **The four moved out of code:** `guard`, `strike` (the old swing, same angles), `down`, `dead`. One small change: on guard the knees no longer bend (the guard now only drives the upper body, so a fighter's legs walk normally).

## Stages
| | Stage | Who | Needs |
|---|---|---|---|
| ✅ F0 | **The motion foundation:** motions as data, the lookup, the player, the swing, guard, down and dead moved into it, the viewer on `/models/`. Nothing changes on screen | Opus | — |
| F1 | **The motion library:** parry, block, dodge, flinch, stagger, fall, finish; strikes per way of moving (blade, two-hander, staff, spear, axe and mace, bare hands) | **Sonnet** (brief below) | F0 |
| F2 | **The fight camera and the computer layout:** both columns with every move, roles greyed with the reason, the foe's choice lit when you have the upper hand, ⚔ Back to fight | Opus | — (can run beside F1) |
| F3 | **Fast mode:** the exchange plays at once, floating damage, body outlines with wound icons, dice behind a tap on the log | Opus | F1, F2 |
| F4 | **Dice mode in the new layout** (one roll per step) and the setting | Opus | F2 |
| F5 | **The phone:** the view on top, outlines in the corners, intent over the head, Attack/Defend/Move tabs, tap-twice | Opus | F2, F3 |
| F6 | **The timer:** per difficulty, from content; hard 8 s; normal's "after a few fights" noted for later | Opus or Sonnet | F2 |

### Brief for the Sonnet session (F1, once F0 is done)
> Read `CLAUDE.md`, then this page's *Animation first* section, then `director/design/models.md`. Motions are files in `content/motions/` (see the existing ones and *Built (F0): the format* above). Make: parry, block (shield), dodge (a step back and aside), flinch (a light hit), stagger (a hard hit), fall (to lying), finish (the killing stroke), and a strike for each weapon way of moving that has none yet. Check each one in the motion viewer on `/models/` with the matching body and weapon, from the side and from the front, at full and slow speed. Each needs a `contact` mark where the blow lands or is met. Don't touch `core/combat.ts` or the fight panel. Run `npm test` and `npm run build`, the `models` browser test, then commit and push one motion family at a time with a short devlog entry.

## Agreed (2026-11-04)
- One tap acts on a computer; tap twice on a phone.
- Defending blind, the swing plays as soon as you've picked.
- Timer: none on easy; normal later, after a few fights; hard 8 s. The seconds are a value in content.
- Fast mode is the default; dice mode is a setting.
- Every defence is shown; none is picked for you.
- The motion foundation comes before any new animation; Sonnet makes the motion library on top of it.
- **Floating damage (Q50), as a start:** numbers on easy only. On normal and hard a short word floats up (*"deep cut"*, *"glancing"*) and the icon lands on the body outline.
