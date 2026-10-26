import type { Dice } from './chargen/tables';
import type { Rng } from './rng';

/**
 * Skill and attribute rolls, following the tabletop rules:
 * - A pool is nD6+mod. Every D6 is open-ended: a 6 is removed and replaced by
 *   two new dice (which can roll 6 again). Sixes never count themselves.
 * - A test succeeds on total ≥ difficulty (6 easy, 10 tricky, 14 hard, 18 very hard, 22 extreme).
 * - Every full 5 above the difficulty (or the opponent's roll) is one Advantage.
 */
export type { Dice };

export interface OpenRoll {
  dice: Dice;
  /** Every face in the order rolled, sixes included. */
  faces: number[];
  /** The faces that count (no sixes). */
  kept: number[];
  total: number;
}

export const DIFFICULTY = { easy: 6, tricky: 10, hard: 14, veryHard: 18, extreme: 22 } as const;

export function difficultyName(d: number): string {
  if (d < 8) return 'Easy';
  if (d < 12) return 'Tricky';
  if (d < 16) return 'Hard';
  if (d < 20) return 'Very hard';
  return 'Extreme';
}

/** Safety cap: a pool can't explode forever. */
const MAX_FACES = 200;

export function rollOpen(d: Dice, rng: Rng): OpenRoll {
  const faces: number[] = [];
  const kept: number[] = [];
  let pending = Math.max(0, d.n);
  while (pending > 0 && faces.length < MAX_FACES) {
    pending--;
    const f = 1 + rng.int(6);
    faces.push(f);
    if (f === 6) pending += 2;
    else kept.push(f);
  }
  const total = d.n > 0 ? kept.reduce((s, x) => s + x, 0) + d.mod : 0;
  return { dice: d, faces, kept, total };
}

/** Advantages for beating a target by `margin` (0–4 → 0, 5–9 → 1 …). */
export const advantages = (margin: number): number => (margin < 0 ? 0 : Math.floor(margin / 5));

export interface TestResult {
  roll: OpenRoll;
  difficulty: number;
  success: boolean;
  advantages: number;
}

export function test(d: Dice, difficulty: number, rng: Rng): TestResult {
  const roll = rollOpen(d, rng);
  const success = d.n > 0 && roll.total >= difficulty;
  return { roll, difficulty, success, advantages: success ? advantages(roll.total - difficulty) : 0 };
}

/**
 * Change a pool by whole dice and a flat bonus. Flat bonus of +4 or more turns
 * into dice (+4 = +1D6). Penalties never take a pool below 1D6, but a pool of
 * nothing (no skill at all) stays nothing.
 */
export function modify(d: Dice, dn: number, dmod = 0): Dice {
  if (d.n <= 0) return { n: 0, mod: 0 };
  let n = d.n + dn;
  let mod = d.mod + dmod;
  while (mod >= 4) {
    mod -= 4;
    n += 1;
  }
  while (mod < 0 && n > 1) {
    mod += 4;
    n -= 1;
  }
  return { n: Math.max(1, n), mod: Math.max(0, mod) };
}

/** "3D6+2: 4 · 6↺ · 1 · 2 · 5 +2 = 14" (the ↺ marks a six that rolled two more dice). */
export function rollText(r: OpenRoll): string {
  if (r.dice.n <= 0) return 'no dice = 0';
  const faces = r.faces.map((f) => (f === 6 ? '6↺' : `${f}`)).join(' · ');
  return `${faces}${r.dice.mod ? ` +${r.dice.mod}` : ''} = ${r.total}`;
}
