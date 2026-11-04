import { beaten, canAct, foesOf } from '../../../core/combat';
import type { FightCondition } from '../../../core/fightmind';

/**
 * How the fight stands: how beaten they are (`beaten` in `core/combat.ts`: about 0 fresh to 3 wrecked, from fatigue
 * against the shock roll, wounds, broken bones, being on the ground, empty hands), how beaten their foe is, a foe
 * down, a foe far off. { "when": { "beaten": 1.75 }, "do": "offerYield" }.
 */
const amount = (v: unknown): string | null => (typeof v === 'number' && v >= 0 ? null : 'give a number, 0 (fresh) to about 3 (wrecked)');

const conditions: FightCondition[] = [
  { id: 'beaten', about: 'They are at least this beaten (0 fresh, 1 badly off, 2 and up wrecked).', check: amount, holds: (v, view) => beaten(view.me) >= Number(v) },
  { id: 'foeBeaten', about: 'Their nearest foe is at least this beaten.', check: amount, holds: (v, view) => !!view.foe && beaten(view.foe) >= Number(v) },
  {
    id: 'foeDown',
    about: 'A foe lies knocked out or dying (not dead).',
    check: (v) => (typeof v === 'boolean' ? null : 'give true or false'),
    holds: (v, view) => foesOf(view.fight, view.me).some((o) => !canAct(o) && !o.injuries.dead && (o.injuries.out || o.injuries.dying)) === v,
  },
  {
    id: 'foeFurther',
    about: 'Their nearest foe is further off than this many metres.',
    check: (v) => (typeof v === 'number' && v >= 0 ? null : 'give metres'),
    holds: (v, view) => !!view.foe && Math.hypot(view.foe.x - view.me.x, view.foe.z - view.me.z) > Number(v),
  },
];

export default conditions;
