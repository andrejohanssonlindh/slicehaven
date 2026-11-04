import type { FightCondition } from '../../../core/fightmind';

/**
 * Their role in the round (the rules' roles in a melee): attacking, defending, or free (no foe within reach). `true`
 * holds in that role, `false` out of it. { "when": { "attacking": true }, "do": "strike", ... }.
 */
const flag = (v: unknown): string | null => (typeof v === 'boolean' ? null : 'give true or false');

const conditions: FightCondition[] = [
  { id: 'free', about: 'Not in a melee: no foe within reach.', check: flag, holds: (v, view) => (view.role === 'free') === v },
  { id: 'attacking', about: 'The attacker in the melee (they have the fight in hand).', check: flag, holds: (v, view) => (view.role === 'attacker') === v },
  { id: 'defending', about: 'The defender in the melee.', check: flag, holds: (v, view) => (view.role === 'defender') === v },
];

export default conditions;
