# Exploration scenes: the village gate

*Session 8, 2026-10-26. The director's first test of skills and talking to the world.* [Play it](https://andrejohanssonlindh.github.io/slicehaven/scene/) (also "Gate" in the sandbox's top bar).

## The scene
Night at a village gate. The palisade can't be passed. Four ways in:

| Way in | How | Cost |
|---|---|---|
| **Argue with the guard** | Talk → "Argue your way in" → bribe, threaten or sweet-talk. A social conflict, three rolls. | Bribe: 20% of your gold if he takes it. A failed threat makes him refuse to talk at all. |
| **Climb the ivy** | Use a skill on the boulder: Climb, Hard (15). | Two failures and the guard hears you and keeps watch. |
| **Search the handcart** | Use a skill on the cart: Search, Tricky (10). You find a trader's pass; show it to the guard. | Nothing. |
| **Sleep by the fire** | Rest with the travellers until dawn, when the gate opens. | You wake up robbed: 70% of your gold. |

You start with 100 gold. The scene plays **your current character from the creator** if you have one, otherwise a default shepherd. Tap your hero to see your dice or switch who you play.

Extra: you can *Size up* the travellers (Insight, Hard 14) and notice the young man eyeing your purse.

## The systems (built to reuse)

### Things bigger than one hex
Any thing can cover several hexes: the boulder covers three, the cart and the gate two. Units can too (for later: a troll or an ogre), via a **shape**: the hexes it covers relative to where it stands.
- It blocks every hex it covers. Tapping any of them, or its picture, picks the whole thing.
- "Next to it" means next to any of its hexes. Walking to it goes to the nearest free hex around it.
- A big unit only moves where its whole body fits, so a three-hex beast can't squeeze through a one-hex gap. Tested.
- It's drawn as one picture over its footprint, sorted by its front row, so people behind it are hidden and people in front aren't.

### "Use a skill" is always there
Every thing has **Use a skill…**. The list shows:
- **✓ Useful here**: the skills that would do something, with what you'd try and how hard it is. Skills you don't have are shown greyed, so you can see what *would* have worked.
- **Your other skills**, folded away. Trying one gives a short line ("You can't see how Charm would help with a rock.") and no roll.

What counts as "reasonable" comes from **skill sets** defined once (`climb`, `search`, `readPeople`, `sweetTalk`, `threaten`, `bribe`) and reused by every scene. Each skill set mixes base skills, expertise, marks and attributes. For example, *climb* = Climb, Acrobatics, Ape-footed, Strong Grip.

### Social conflicts (after the rules' challenges & conflicts chapter)
Your idea of three directions is the core of it. Each **approach** (bribe, threaten, sweet-talk) has:
- **Reasonable skills**: only those can be picked.
- A **locked roll** that must be used once: Trade for a bribe, Physique for a threat, Presence for sweet talk. If you haven't used it by round 3, round 3 must be it. Lacking it entirely rolls 0, as in the rules.
- A **situation**: coin gives an upper hand (+2 Control). Threatening an armed guard at his own gate is a weak position (−2). Sweet talk is even.
- The **guard's answers**: which of his skills he rolls back (Insight, Composure, Alertness, Intimidate, Trade, Physique).

Rolls follow the rules: open-ended D6 (a six is replaced by two new dice), **1 Control** for winning a round, **+1 per 5** you win by, **1 each** on a tie, **−2D6** for using the same skill again. At the end the guard spends all his Control cancelling yours. If you have **2 left** (the rules' price for "make them do something"), he opens the gate.

All rolls are shown in full in the sheet and the log, e.g. `6↺ · 3 · 4 +2 = 9`. The ↺ marks a six that rolled two more dice.

### The console
The bottom bar shows the last two lines. Tap it to open the whole log: what you looked at, what was said, every roll, and gold gained and lost.

### Scenes are data
A scene is a map, a list of things (with their hexes, art, look text, talk, checks, actions and conversations) and exits. Effects are small: say something, set a flag, lose a share of gold, change the time, remove someone, enter. The rules live in `core/scene.ts` and `core/social.ts`. The gate is `content/scenes/gate.ts`. A test checks that every skill a scene names really exists.

## Simplifications for now
- The guard always spends his Control cancelling yours. He doesn't buy consequences of his own yet: the rules' table of social consequences (secrets, changed opinions…) is for later.
- One go per approach. Fail and that approach is closed ("He won't fall for it twice").
- Failed checks cost nothing except where the scene says so (the climb's two tries).
- Time is just night → dawn; nothing else happens over the night.
- Your hero's HP and Focus aren't used in scenes yet.

## Code
`core/footprint.ts` (shapes), `core/battle.ts` (units and walking with footprints), `core/checks.ts` (open-ended rolls, difficulties, advantages), `core/social.ts` (conflicts), `core/scene.ts` (scene rules), `core/hero.ts`, `content/rollables.ts` (skill sets, default shepherd, creator characters → rollable dice), `content/scenes/gate.ts`, `art/village.ts` + `art/sceneArt.ts` (palisade, gate, ivy boulder, handcart, campfire, cottages, guard and travellers), `engine/scene.ts`, `ui/console.ts`, `ui/sheet.ts`, page `scene/`. Tests: `tests/scene.test.ts`.
