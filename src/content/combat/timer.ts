import type { GameDifficulty } from '../../core/difficulty';

/**
 * How long you have to pick your move in a fight, in seconds, by difficulty (plan B8g F6; null: no timer). When it
 * runs out, the move ringed is taken: at first last round's move, so dithering costs you but never your defence. It
 * waits while dice roll. Tune here.
 *
 * Normal is to get one after a few fights (noted in the design, not built).
 */
export const PICK_SECONDS: Record<GameDifficulty, number | null> = {
  easy: null,
  normal: null,
  hard: 8,
};
