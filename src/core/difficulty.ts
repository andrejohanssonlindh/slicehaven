/**
 * How hard the game is (a setting the player picks). It changes how much leeway you get, not the dice:
 * - attrBudget: how many extra attribute rolls (beyond the locked one) you may make in a conflict or
 *   challenge; see core/attributes. Skills are the main tool.
 * - sideTalks: how many social tries you may make on someone who has a social challenge for you
 *   (a guard at his gate, a gatekeeper) *outside* that challenge. Harder games make you earn
 *   their trust the proper way.
 */
export type GameDifficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: GameDifficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY_RULES: Record<GameDifficulty, {
  label: string; sideTalks: number; attrBudget: number;
  /** World minutes for one point of fatigue back (Q49; a third of it while resting, sat down). */
  restMinutes: number;
  /** In a fight: the foe's state in numbers (else in words); one's own fatigue in numbers (else in words). */
  foeExact: boolean; ownExact: boolean;
}> = {
  easy: { label: 'Easy', sideTalks: 3, attrBudget: 2, restMinutes: 1, foeExact: true, ownExact: true },
  normal: { label: 'Normal', sideTalks: 1, attrBudget: 1, restMinutes: 2, foeExact: false, ownExact: true },
  hard: { label: 'Hard', sideTalks: 0, attrBudget: 0, restMinutes: 4, foeExact: false, ownExact: false },
};

/** Resting (sat down) brings fatigue back this many times faster. */
export const REST_SPEED = 3;

export const DEFAULT_DIFFICULTY: GameDifficulty = 'normal';
