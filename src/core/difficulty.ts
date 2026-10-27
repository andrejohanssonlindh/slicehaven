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

export const DIFFICULTY_RULES: Record<GameDifficulty, { label: string; sideTalks: number; attrBudget: number }> = {
  easy: { label: 'Easy', sideTalks: 3, attrBudget: 2 },
  normal: { label: 'Normal', sideTalks: 1, attrBudget: 1 },
  hard: { label: 'Hard', sideTalks: 0, attrBudget: 0 },
};

export const DEFAULT_DIFFICULTY: GameDifficulty = 'normal';
