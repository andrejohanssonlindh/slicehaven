import type { FightCondition } from '../../../core/fightmind';

/**
 * What they hold and what lies about: empty-handed, and a weapon on the ground within so many metres.
 * { "when": { "unarmed": true, "weaponWithin": 6 }, "do": "pickUp", "within": 6 }.
 */
const conditions: FightCondition[] = [
  {
    id: 'unarmed',
    about: 'No weapon in hand (true), or one (false).',
    check: (v) => (typeof v === 'boolean' ? null : 'give true or false'),
    holds: (v, view) => !view.me.weapon === v,
  },
  {
    id: 'weaponWithin',
    about: 'A weapon lies on the ground within this many metres.',
    check: (v) => (typeof v === 'number' && v > 0 ? null : 'give metres, a number above 0'),
    holds: (v, view) => view.fight.ground.some((g) => g.weapon && Math.hypot(g.x - view.me.x, g.z - view.me.z) <= Number(v)),
  },
];

export default conditions;
