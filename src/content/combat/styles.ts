import type { FightStyle } from '../../core/combat';

/**
 * Ways of fighting (plan B8a): how someone nobody steers chooses each round (`chooseFor` in `core/combat.ts`). A
 * person fights by the style named after the nearest kind in their chain that has one (a `gladiator`), else the
 * default. A new style: an entry here named after a kind of person.
 */
export const FIGHT_STYLES: Record<string, FightStyle> = {
  /** Anyone: mostly plain blows, now and then a hard one; doesn't kill someone who is down. */
  default: { id: 'default', attack: { standard: 4, quick: 1, powerful: 1 }, defence: { standard: 4, defensive: 2, counter: 0 }, mercy: false, run: false },
  /** The arena's own: presses hard, runs in, and finishes what it starts (the first fight is to the death, Q46). */
  gladiator: { id: 'gladiator', attack: { standard: 3, quick: 2, powerful: 2 }, defence: { standard: 3, defensive: 1, counter: 1 }, mercy: true, run: true },
};

/** The style for someone of this chain of kinds (most general first, as `PERSON_KINDS.resolve` gives it). */
export function styleFor(chain: readonly string[]): FightStyle {
  for (let i = chain.length - 1; i >= 0; i--) if (FIGHT_STYLES[chain[i]]) return FIGHT_STYLES[chain[i]];
  return FIGHT_STYLES.default;
}
