/**
 * Who likes order (plan B3b): seeing something lying where it doesn't belong, they bring it home to its household
 * themselves (the behaviour `tidy`). A household always brings its own things home; these facets bring anyone's.
 * Balance data, our own guesses from the creator's summaries: dwarves keep things where they belong, a guard keeps the
 * peace, and officials and the devout keep rules.
 */
export const ORDERLY: readonly string[] = ['dwarf', 'job-guard', 'officialdom', 'theocracy'];

/** Does someone of these kinds (their kind chain) bring found things home? */
export const orderly = (chain: readonly string[]): boolean => chain.some((k) => ORDERLY.includes(k));
