# How people fight: styles as "when this, do that" (proposal)

*2026-11-04. The director: "extract the AI, their actions… a type of strategy as a thing. On A do B. Also how and when they give up. Then apply it to a character." **Agreed 2026-11-04; building next.***

## Today
A fighting style (`content/combat/styles.ts`) is a handful of numbers: how often each tactic, run or not, finish the downed or not, how hard to beg off, how beaten before offering to yield. The *decisions* are code in `chooseFor` (`core/combat.ts`): pick up a weapon if empty-handed, close in, answer a known tactic. Every new piece (shields, two against one, bows) would add another `if` there, the same for everyone.

## The idea: the same shape as people's days
People's schedules in the world are already **lines, "when this holds, do that", the first that holds wins**, with a library of conditions (`when/`) and of behaviours (`does/`), one file each ([behaviours](behaviours.md)). A fighting style becomes the same thing for a round:

```ts
// content/combat/styles/gladiator.ts
{
  id: 'gladiator',
  lines: [
    { when: { foeDown: true }, do: 'finish' },                         // kills the knocked out
    { when: { beaten: 1.75 }, do: 'offerYield' },                      // gives up, late
    { when: { unarmed: true, weaponWithin: 3 }, do: 'pickUp' },
    { when: { free: true }, do: 'closeIn', run: true },
    { when: { theyMean: { attack: 'powerful' } }, do: 'defend', weights: { counter: 3, standard: 1 } },
    { when: { attacking: true, foeBeaten: 1 }, do: 'strike', weights: { powerful: 3, standard: 1 } },
    { when: { attacking: true }, do: 'strike', weights: { standard: 3, quick: 2, powerful: 2 } },
    { do: 'defend', weights: { standard: 3, defensive: 1, counter: 1 } },
  ],
  hears: { plea: 16 },                                                 // how hard to beg off
}
```

- **Conditions** (`content/combat/when/`, one file each, reading the fight's plain state): `free`, `attacking`, `defending`, `unarmed`, `weaponWithin`, `beaten` (me), `foeBeaten`, `foeDown`, `theyMean` (what the foe declared, when I have the upper hand), `tired`, `hurt`, `outnumbered` (B8c), `inRange` (B8d)…
- **Choices** (`content/combat/does/`, one file each, each giving the round's `Choice`): `closeIn`, `keepAway`, `pickUp`, `strike` (with weights), `defend` (with weights), `retreat`, `flee`, `offerYield`, `plead`, `finish`, `holdGround`. Later `block`, `aim`, `shoot`, `fetchHelp`.
- **Giving up is lines too**, not special numbers: when someone offers to yield (`offerYield`), flees (`flee`), or begs (`plead`). How hard they are to beg off stays a number on the style.
- **The rules stay in the core**: a choice only *says* what they try; `resolveRound` decides what happens. The page (the hero) and a style produce the same `Choice`.

## Applied to a character
- **By kind of person**, as now: the nearest kind in their chain with a style (a gladiator, a guard, a brigand, a farmer). A style can **start from another** and put lines on top (a coward = the default plus "flee when hurt"), the way kinds inherit.
- **Per person in a map**: `"fights": "coward"` on someone overrides their kind's.
- **Their temper can shift it later**: the bold, the afraid (B3c's fight-or-fetch) pick a style or add lines.
- **The hero's companions** (later) would fight by a style you pick for them.

## Checks
- A style naming a condition or choice that doesn't exist is reported (as maps' schedules are), and tested.
- The current gladiator and default styles rewritten as lines must fight the same way (the tests on `chooseFor` keep passing).

## Beyond fights
The same "lines" shape fits other turn-based situations later (a social conflict over several rounds, a chase). Each gets its own libraries of conditions and choices, because what they read differs, but the shape and the checker are shared.

## Order
Before the shields, I'd suggest: small (a day's slice), and shields, several fighters and ranged then each add a condition or a choice instead of growing `chooseFor`.
