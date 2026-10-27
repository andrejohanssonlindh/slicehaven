import { CRAFTS } from './crafts';
import { MARKS } from './marks';

/**
 * Per-skill tables: for a skill, the kinds of effort (tags) it suits and 2–3 examples of each.
 * Used for the groups of narrow skills (marks, crafts, abilities), where it is easier to write a
 * skill's whole entry in one place. tags.ts and examples.ts merge these in, so TAGGED and EXAMPLES
 * stay the single sources everyone else reads.
 */
export type BySkill = Record<string, Record<string, string[]>>;

export const PER_SKILL: BySkill = { ...MARKS, ...CRAFTS };
