import { ADJACENT, PICKUP_REACH, WALK } from '../../../core/combat';
import type { FightDoing } from '../../../core/fightmind';

/**
 * The side action: close in on the nearest foe (stopping just within reach), pick up a weapon lying near, or stand.
 * { "do": "closeIn", "run": true } runs when the foe is further than a walk; { "do": "pickUp", "within": 3 }.
 */
const doings: FightDoing[] = [
  {
    id: 'closeIn',
    about: 'Walk (or, with "run": true, run when far) towards the nearest foe, stopping within reach. Nothing if already there.',
    keys: ['run'],
    fills: 'side',
    choose: (line, { fight, me, foe }) => {
      if (!foe || fight.melee) return null;
      const d = Math.hypot(foe.x - me.x, foe.z - me.z);
      if (d <= ADJACENT) return null;
      const k = (d - ADJACENT * 0.75) / d;
      return { move: { x: me.x + (foe.x - me.x) * k, z: me.z + (foe.z - me.z) * k, run: line.run === true && d > WALK + ADJACENT } };
    },
  },
  {
    id: 'pickUp',
    about: 'Empty-handed, pick up the nearest weapon lying within reach (3 m, or "within" metres; further, they walk to it first).',
    keys: ['within'],
    fills: 'side',
    choose: (line, { fight, me }) => {
      if (me.weapon) return null;
      const reach = typeof line.within === 'number' ? line.within : PICKUP_REACH;
      const near = fight.ground.filter((g) => g.weapon && Math.hypot(g.x - me.x, g.z - me.z) <= reach).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
      if (!near) return null;
      return Math.hypot(near.x - me.x, near.z - me.z) <= PICKUP_REACH ? { pickUp: near.id } : { move: { x: near.x, z: near.z } };
    },
  },
  { id: 'holdGround', about: 'Stand where they are.', keys: [], fills: 'side', choose: () => ({}) },
];

export default doings;
