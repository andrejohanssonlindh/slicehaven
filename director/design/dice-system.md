# Dice system

## Faces
Each die is a list of faces. A face = **kind + value + tags**.

| Kind | Effect |
|---|---|
| ⚔ attack | Melee damage to an adjacent enemy |
| ➶ range | Damage at range (range set by tag/die) |
| ➜ move | Move up to N hexes |
| ⛨ shield | Block N damage this round |
| ✚ heal | Restore N HP (self or ally, by tag) |
| · blank | Nothing. Bad, but gear can fix it |

Tags add effects: `push`, `pierce`, `stun`, `poison`, `ally`, `aoe`, `loot`, `lose` (strong face, but the die is *lost* after use — like Gloomhaven's lost cards).

Dice don't have to be D6. Gear can make a D5 (more reliable) or a D7.

## The Gloomhaven loop, with dice
```
 ready ──roll & use──▶ spent ──rest──▶ ready
                          └─ one die ──▶ lost (for the rest of the scenario)
```
- When you have no ready dice, you must **rest**: all spent dice come back, but you choose one to lose.
- Fewer dice means fewer turns before the next rest, so scenarios have a natural clock.
- If you can't act and can't rest, you're **exhausted**.
- *Idea:* a **short rest** (random die lost, no turn spent) vs **long rest** (choose the die, heal 2, but you skip your turn), as in Gloomhaven.

## Turn proposal (needs your call, see Q3)
Per round, each hero:
1. Choose **2 ready dice** and roll them.
2. Optionally spend a **reroll token** (limited per scenario, earned through gear/perks).
3. Use both faces in any order. Both dice become spent.
4. Initiative: the sum of the two faces' "speed"? Or a fixed hero initiative? Open question.

This keeps Gloomhaven's "play two cards" feel, plus Slice & Dice's "work with what you rolled".

## Gear modifiers (implemented in `core/dice.ts`)
- `addFace` — a new face on the die
- `removeFace` — D6 → D5
- `replaceFace` — e.g. blank → move 2
- `bonus` — +N to every face of a kind on that die

## Balance notes
- Average value per face ≈ 2 for a starter die; blanks are the "tax".
- A starting hero with 4 dice and roll-2-per-turn gets roughly 2 turns per rest cycle → total turns per scenario ≈ 2+2+1+1... ≈ 6–8 rounds before exhaustion. Gloomhaven scenarios last ~10–12 rounds, so we may want 5–6 dice or a reroll economy. To tune with playtests.
