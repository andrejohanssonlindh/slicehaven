import type { BurnRules } from '../../core/world3d/effects';

/**
 * Burning (plan B7; rules in `core/world3d/effects.ts`, design director/design/effects.md). The catching difficulties
 * are the rules' own (*burning materials*): straw, paper, oil, wax 2 · cotton, twigs, linen 6 · hard wood, fur,
 * clothes, a deck 10 · silk, wool 14 · leather 18. How big each burns and how long are ours, to be tuned by eye.
 */
export const BURNING: BurnRules = {
  materials: {
    straw: { catches: 2, peak: 3, fuel: 40 },
    cloth: { catches: 6, peak: 3, fuel: 90 },
    wood: { catches: 10, peak: 4, fuel: 300 },
    wool: { catches: 14, peak: 3, fuel: 120 },
    leather: { catches: 18, peak: 2, fuel: 200 },
  },
  round: 4,
  reach: 0.6,
  perDie: 0.25,
};

/** The dice of an open fire by its size (the rules: a torch 1D6, a campfire 2D6), for kinds that are fires. */
export const FIRE_DICE = { torch: 1, campfire: 2 } as const;
