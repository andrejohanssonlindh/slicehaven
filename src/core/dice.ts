import type { Dice } from './chargen/tables';
import type { Rng } from './rng';

/**
 * The one roll system (plan item B2). Every roll in the game is made here, through the seeded `Rng`, and comes back
 * as a `Roll`: plain data that says what each die showed and where it came from, so anything can show it (dice on
 * glass, spinning icons, or just the result: `ui/dice/`) or put it in a save.
 *
 * Three ways to roll, all from the tabletop rules:
 * - **open** (skills and attributes): nD6+mod, and every 6 is taken away and rolls two new dice in its place (which
 *   may be sixes again). Sixes never count themselves.
 * - **pool** (a plain sum): nD6+mod with no splitting.
 * - **table** (the character creator's tables): one die of any size, a D100 or a D10, read off a table.
 */

export type RollKind = 'open' | 'pool' | 'table';

/** One die as it fell. */
export interface Die {
  /** How many sides (6 for the pools; 100 or 10 or 20 for tables). */
  sides: number;
  face: number;
  /** The die it came from: the index (in `dice`) of the six that split into it, or null for a die of the first throw. */
  from: number | null;
  /** It counts toward the total (a split six does not). */
  counts: boolean;
}

export interface Roll {
  kind: RollKind;
  /** The pool rolled (for a table roll: one die, no bonus). */
  dice: Dice;
  /** Sides of each die (6 except for table rolls). */
  sides: number;
  /** Every die, in the order rolled. */
  rolled: Die[];
  /** Every face in the order rolled, sixes that split included. */
  faces: number[];
  /** The faces that count. */
  kept: number[];
  total: number;
  /** What it was for, to show beside it ("Search", "Homeland"). */
  label?: string;
  /** For a test: what had to be reached, whether it was, and the advantages won (every full 5 above it). */
  target?: number;
  success?: boolean;
  advantages?: number;
}

/** Safety cap: a pool can't split forever. */
const MAX_DICE = 200;

/** One die with `sides` sides. */
export const rollDie = (sides: number, rng: Rng): number => 1 + rng.int(sides);

function make(kind: RollKind, dice: Dice, sides: number, rolled: Die[], label?: string): Roll {
  const kept = rolled.filter((d) => d.counts).map((d) => d.face);
  const total = dice.n > 0 ? kept.reduce((s, x) => s + x, 0) + dice.mod : 0;
  return { kind, dice, sides, rolled, faces: rolled.map((d) => d.face), kept, total, ...(label ? { label } : {}) };
}

/** An open roll: every six is replaced by two new dice. */
export function rollOpen(d: Dice, rng: Rng, label?: string): Roll {
  const rolled: Die[] = [];
  const queue: (number | null)[] = Array.from({ length: Math.max(0, d.n) }, () => null);
  while (queue.length && rolled.length < MAX_DICE) {
    const from = queue.shift()!;
    const face = rollDie(6, rng);
    const i = rolled.push({ sides: 6, face, from, counts: face !== 6 }) - 1;
    if (face === 6) queue.push(i, i);
  }
  return make('open', d, 6, rolled, label);
}

/** A plain pool: nD6+mod, summed, sixes count as six. */
export function rollPool(d: Dice, rng: Rng, label?: string): Roll {
  const rolled: Die[] = Array.from({ length: Math.max(0, d.n) }, () => ({ sides: 6, face: rollDie(6, rng), from: null, counts: true }));
  return make('pool', d, 6, rolled, label);
}

/** A table roll: one die of `sides` sides (D100 for most of the creator's tables). */
export function rollTable(sides: number, rng: Rng, label?: string): Roll {
  return make('table', { n: 1, mod: 0 }, sides, [{ sides, face: rollDie(sides, rng), from: null, counts: true }], label);
}

/** Advantages for beating a target by `margin` (0–4 → 0, 5–9 → 1 …). */
export const advantages = (margin: number): number => (margin < 0 ? 0 : Math.floor(margin / 5));

/** An open roll against a difficulty: success on total ≥ difficulty, and the advantages won. */
export function rollTest(d: Dice, difficulty: number, rng: Rng, label?: string): Roll {
  const r = rollOpen(d, rng, label);
  const success = d.n > 0 && r.total >= difficulty;
  return { ...r, target: difficulty, success, advantages: success ? advantages(r.total - difficulty) : 0 };
}

/** "3D6+2: 4 · 6↺ · 1 · 2 · 5 +2 = 14" (the ↺ marks a six that rolled two more dice); a table roll is "D100: 37". */
export function rollText(r: Roll): string {
  if (r.kind === 'table') return `D${r.sides}: ${r.total}`;
  if (r.dice.n <= 0) return 'no dice = 0';
  const faces = r.rolled.map((d) => (d.counts ? `${d.face}` : '6↺')).join(' · ');
  return `${faces}${r.dice.mod ? ` +${r.dice.mod}` : ''} = ${r.total}`;
}
