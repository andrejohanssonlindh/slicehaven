import { ADJACENT, canAct, foesOf } from '../../../core/combat';
import type { FightDoing } from '../../../core/fightmind';

/**
 * How a fight ends for them: offering to yield (asked between rounds; the other side may accept), and, once it is
 * won, the killing stroke on a foe left lying. { "when": { "beaten": 1.75 }, "do": "offerYield" },
 * { "when": { "foeDown": true }, "do": "finish" }.
 */
const doings: FightDoing[] = [
  {
    id: 'offerYield',
    about: 'Lower their weapon and ask to yield (the other side may accept or fight on; refused, they ask again only when worse off).',
    keys: [],
    fills: 'offer',
    choose: () => ({}),
  },
  {
    id: 'finish',
    about: 'Once the fight is won, give a foe lying knocked out or dying the killing stroke (walking up first if needed).',
    keys: [],
    fills: 'main',
    phase: 'won',
    choose: (_line, { fight, me }) => {
      const down = foesOf(fight, me).find((o) => !canAct(o) && !o.injuries.dead && (o.injuries.out || o.injuries.dying));
      if (!down) return null;
      return Math.hypot(down.x - me.x, down.z - me.z) <= ADJACENT ? { mercy: down.id } : { move: { x: down.x, z: down.z } };
    },
  },
];

export default doings;
