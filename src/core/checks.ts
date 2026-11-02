import type { Dice } from './chargen/tables';
import { type Roll, advantages, rollOpen, rollText, rollTest } from './dice';
import type { Rng } from './rng';

/**
 * Skill and attribute checks, following the tabletop rules. The rolling itself is the one roll system's
 * (`core/dice.ts`); this adds the difficulties and pool changes the skill hooks use.
 * - A test succeeds on total ≥ difficulty (6 easy, 10 tricky, 14 hard, 18 very hard, 22 extreme).
 * - Every full 5 above the difficulty (or the opponent's roll) is one Advantage.
 */
export type { Dice };
export { advantages, rollOpen, rollText };

/** An open roll (`core/dice.ts`). */
export type OpenRoll = Roll;

export const DIFFICULTY = { easy: 6, tricky: 10, hard: 14, veryHard: 18, extreme: 22 } as const;

export function difficultyName(d: number): string {
  if (d < 8) return 'Easy';
  if (d < 12) return 'Tricky';
  if (d < 16) return 'Hard';
  if (d < 20) return 'Very hard';
  return 'Extreme';
}

export interface TestResult {
  roll: OpenRoll;
  difficulty: number;
  success: boolean;
  advantages: number;
}

export function test(d: Dice, difficulty: number, rng: Rng): TestResult {
  const roll = rollTest(d, difficulty, rng);
  return { roll, difficulty, success: !!roll.success, advantages: roll.advantages ?? 0 };
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
