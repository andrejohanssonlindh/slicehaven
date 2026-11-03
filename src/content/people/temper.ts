/**
 * How quick a kind of person is to deal with trouble themselves (plan B3c): their temper, summed over every facet they
 * are (their people, their calling). From a culture's `boldAt` up they square up to you rather than fetch help, and
 * it adds to their nerve (three a point) against how dangerous you look. Balance data, our own guesses from the
 * creator's summaries of each people: a tirak likely fights, a human less so (director's notes 2026-11-03).
 */
export const TEMPER: Record<string, number> = {
  tirak: 3,
  dwarf: 1,
  human: 0,
  elf: 0,
  missla: -1,
  // Callings: a guard is there for it; a soldier too.
  'job-guard': 2,
  'job-soldier': 2,
};

/** Marks (the creator's `K:` talents) that make someone look dangerous at a glance: each adds to how dangerous you look. */
export const FEARSOME_MARKS = ['K:Ärr', 'K:Skrämmande utseende', 'K:Grotesk uppenbarelse'];

/** A person's temper: the sum over what they are (their kind chain). */
export const temperOf = (chain: readonly string[]): number => chain.reduce((n, k) => n + (TEMPER[k] ?? 0), 0);
