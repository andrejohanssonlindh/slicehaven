# How a fight looks and feels

*2026-11-04. The director: "Rules are not changed per se… make it a bit more engaging. Current approach feels… wrong." Talked through and agreed the same day (decisions below). **Built, all stages F0–F6 (2026-11-04/05); waiting for the director's review.** It's built in the stages at the bottom, one at a time, each tried on the phone before the next.*

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

### Built (F2, 2026-11-05)
- **The view swings side-on** when a fight starts (`world.faceFight()`), you on the left; turning by hand stops the swing. **⚔ Back to fight** at the top of the view swings it back and follows the fight again.
- **Your column:** your card, then **Offensive** (Standard, Quick, Powerful with their pools and what each costs; Retreat) and **Defensive** (a grid: parry, block if you wear a shield, dodge × standard, careful, counter, each with its pool; dodge has no counter). Nothing is picked for you: the rules now take **how** you defend (`Choice.defendWith`); anyone nobody steers still defends the best way.
- **The group you don't have is greyed, with why:** *You're defending: they won the last exchange* / *they were quicker when blades crossed* / *they kept the attack*; *Not in reach: close in first.*
- **The foe's column, mirrored:** their pools only on easy; their chosen move **lit** when you're quicker, with a line *Arruns means to …*; else *? Arruns was quicker: they'll see what you do.*
- **The Move row:** walk or run where you tapped, close in, run in, pick up, draw, hold your ground, get away, ask to yield, accept their surrender, OK.
- **Phone, until F5:** the same pieces stacked in the bottom sheet: the foe's column folds to its one line, and your group not in play to its *why*. **Sideways or on a computer:** the columns at both sides, the round, the Move row and the log along the bottom between them.

### Built (F3, 2026-11-05)
- **Fast mode is the default**; *Fights: fast / dice* in the game row of the panel switches it (setting `fight`). Dice mode is still today's step-by-step flow until F4.
- **An exchange plays out at once:** the strike (by the weapon's way of moving), and the defender's parry, block or dodge started so its *contact* meets the blow's (`world.motionTiming`). On a hit they flinch, or stagger if it was serious or 3+ fatigue; going down plays the **fall** into lying (it was an instant switch).
- **At the contact, it floats up** over whoever was hit (`world.screenOf`), red, rising for about 2 s: the damage that got through on easy (and *serious wound* under it); on normal and hard a word by how bad it was and the kind of damage (*graze, cut, deep cut; nick, stab, deep stab; bruise, heavy blow, crushing blow* …; *glancing* when armour took it all). A miss floats *parried / blocked / dodged*.
- **Body outlines** in both cards (`src/spike3d/outline.ts`): the six parts tinted by wounds (yours exactly; the foe's on easy, else only by the blows you saw), icons where blows landed (cut, stab, crush), broken bones, bleeding, parts lost; the fatigue bar beside it (it replaced the bar under the name).
- **The dice behind the log:** every line whose rolls weren't shown has a 🎲; a tap throws them.
- About 1.5 s an exchange, then your next pick.

### Built (F4, 2026-11-05)
- **Dice mode** (*Fights: dice* in the panel's game row): every blow one roll a step. **The attack** (their defence written beside it; only your own dice thrown), then **the exchange plays out** (the strike met by the parry, block or dodge, or the flinch); **where it lands** (the D10) on its own, and the blow lands on their outline; **the damage** (with any extra from advantages), less armour, and it floats up; **the serious wound** D10 with the death roll and any breaks. Each log line is written once its dice have landed.
- Fast and dice mode share one sequence (`showAttack`): fast plays the exchange first and puts the same rolls behind the log.

### Built (F5, F6, 2026-11-05)
- **The phone in portrait:** the view keeps the top ~55%. **Small cards in its top corners** (the body outline, the fatigue bar, the name, how they are; tap for the details). **The foe's move is a bubble over their head** (*⚔ Quick*, *🛡 Parry · Careful*, *Runs*, or **?**); a tap on it unfolds their whole column under their card, a tap on the column folds it. **The sheet below:** the round, the timer bar, **tabs Attack | Defend | Move** (a new round opens on your role's tab; the other greyed but can be looked at), the tab's moves, the log. ⚔ Back to fight sits just over the sheet.
- **Tap twice on a touch screen:** the first tap rings a move, the second takes it; one tap on a computer (`?taps=2` / `?taps=1` force it). A ringed move that is tapped again goes at once.
- **Sideways or on a computer:** the column layout of F2.
- **The timer** (`content/combat/timer.ts`: easy none, normal none for now, hard 8 s): a bar under the round, red in the last 3 s. A move is ringed from the start (last round's if you can take it again, else a standard blow, the best standard defence, or holding your ground); out of time, it is taken (*Out of time.* in the log). It only runs while it's your pick, so it waits while anything plays or dice roll.

### Built: the director's review, computer first (2026-11-06)
- **The page in parts** (`src/spike3d/fight/`): `index.ts` runs the rounds; `columns.ts` the cards and moves; `others.ts` the side action and Other; `picking.ts` the layout, the bubble, the timer; `show.ts` a round played out and the log; `fighters.ts`, `words.ts`; `ctx.ts` what they share.
- **Your column, top to bottom:** your card; **Side action** (Move ▸, Draw ▸, Pick up ▸, Look around; a ▸ unfolds its list, ‹ folds it; tapping the ground opens Move, tapping a weapon in reach opens Pick up); Offensive; Defensive; **Other** (Ask to yield, Accept their surrender, Hold your ground, Get away; Finish them and OK once it is over). **The middle is only the round, the timer and the log.**
- **Side action and main action:** free, the side action is the round (one tap on a computer). In a melee it is picked first (ticked, green) and goes with the blow or defence you take after it; those buttons then show the dice you would roll (a sword drawn: its skill, −1D6). Blades just crossed, the side actions are done: only the blow or defence. Picking a side action or opening a list is one tap even on a phone.
- **Who goes first:** no Reaktion roll on the way in; both choose blind and **move together**, a step at a time, stopping at arm's reach (both running in meet in the middle). Reaktion is rolled as blades cross (who attacks), and if both go for the same weapon (who gets it).
- **Dice in the log:** where the difficulty shows them (yours unless hard, the foe's on easy), a line carries its sums: *"Arruns: knocked out (Shock roll 3D6+1 = 4 < 6)."*, runs, Reaktion, pleas, death rolls, looking round.
- **The view fitted (second notes):** centred between the fighters, in the gap between the columns, zoomed in as far as keeps both in it (the fight zoom at most).
- **Weapons noticed (second notes: as they come into view, fight or not, `SpikeWorld.noticeLying`, saved):** an Alertness roll against each weapon's `spot` (on its kind: dagger 12, short sword, axe, cudgel 10, sword 8, staff, spear, two-handers, shields 6, buckler 8), 1 harder every 4 m beyond 4. Noticed ones get a **red ring** and are offered to go to or pick up; *Look around* rolls again with 1D6 more. Tapped or seen falling, it counts as noticed.
- **Closer in:** a fight starts at 63 px a metre, a step walking about doesn't reach; the old zoom comes back after.

## Stages
| | Stage | Who | Needs |
|---|---|---|---|
| ✅ F0 | **The motion foundation:** motions as data, the lookup, the player, the swing, guard, down and dead moved into it, the viewer on `/models/`. Nothing changes on screen | Opus | — |
| ✅ F1 | **The motion library** (first pass 2026-11-05, tune by eye): parry, block, dodge, flinch, stagger, fall, finish; strikes per way of moving (blade, two-hander, staff, spear, axe and mace, bare hands) | **Sonnet** (brief below) | F0 |
| ✅ F2 | **The fight camera and the computer layout:** both columns with every move, roles greyed with the reason, the foe's choice lit when you have the upper hand, ⚔ Back to fight | Opus | — (can run beside F1) |
| ✅ F3 | **Fast mode:** the exchange plays at once, floating damage, body outlines with wound icons, dice behind a tap on the log | Opus | F1, F2 |
| ✅ F4 | **Dice mode in the new layout** (one roll per step) and the setting | Opus | F2 |
| ✅ F5 | **The phone:** the view on top, outlines in the corners, intent over the head, Attack/Defend/Move tabs, tap-twice | Opus | F2, F3 |
| ✅ F6 | **The timer:** per difficulty, from content; hard 8 s; normal's "after a few fights" noted for later | Opus or Sonnet | F2 |

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
