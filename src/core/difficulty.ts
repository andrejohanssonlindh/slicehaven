/**
 * How hard the game is (a setting the player picks). It changes how much leeway you get, not the dice:
 * - sideTalks: how many social tries you may make on someone who has a social challenge for you
 *   (a guard at his gate, a gatekeeper) *outside* that challenge. Harder games make you earn
 *   their trust the proper way.
 */
export type GameDifficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTIES: GameDifficulty[] = ['easy', 'normal', 'hard'];

export const DIFFICULTY_RULES: Record<GameDifficulty, { label: string; sideTalks: number }> = {
  easy: { label: 'Easy', sideTalks: 3 },
  normal: { label: 'Normal', sideTalks: 1 },
  hard: { label: 'Hard', sideTalks: 0 },
};

export const DEFAULT_DIFFICULTY: GameDifficulty = 'normal';
