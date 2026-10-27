/**
 * Attributes as rolls in conflicts and challenges.
 *
 * The rules' own lists of fitting rolls are skills, expertise and marks; an attribute turns up as
 * the *locked* roll (Presence for debate and seduction, the fitting attribute for an interrogation,
 * Physique when it is physical). So in play, attributes are a fallback, not the main tool:
 * - the locked roll is free (it has to be rolled once anyway);
 * - Presence is always a natural choice, and Physique when the effort is aggressive;
 * - how many such extra attribute rolls you may make depends on the game difficulty
 *   (easy 2, normal 1, hard none);
 * - if you have no skill at all that fits, you may still use an attribute, at −2D6 (and on
 *   hard even one that is not natural), so you are never stuck;
 * - using the same one again costs −2D6 as for any roll.
 */
export interface AttributeUse {
  ok: boolean;
  /** Whole dice lost (2 when you had no other choice). */
  penalty: number;
  /** For the UI: why it is or isn't possible. */
  note: string;
}

const FREE: AttributeUse = { ok: true, penalty: 0, note: '' };

export function attributeUse(p: {
  skill: string;
  /** The locked rolls and which of them are already used. */
  locked: string[];
  lockedUsed: string[];
  /** Attributes that are natural for this effort (Presence, Physique when aggressive). */
  natural: string[];
  /** Extra attribute rolls already made (beyond the locked ones). */
  extrasUsed: number;
  budget: number;
  /** Do you have any non-attribute roll that fits? */
  hasOther: boolean;
}): AttributeUse {
  if (!p.skill.startsWith('attr:')) return FREE;
  if (p.locked.includes(p.skill) && !p.lockedUsed.includes(p.skill)) return { ok: true, penalty: 0, note: 'Locked roll' };
  const natural = p.natural.includes(p.skill) || p.locked.includes(p.skill);
  const left = p.budget - p.extrasUsed;
  if (natural && left > 0) return { ok: true, penalty: 0, note: `Attribute: ${left} left` };
  if (!p.hasOther) return { ok: true, penalty: 2, note: 'No other choice: −2D6' };
  return { ok: false, penalty: 0, note: natural ? 'No more attribute rolls' : 'Not suited here' };
}
