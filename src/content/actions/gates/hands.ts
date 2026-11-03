import type { GateCase, GateDef } from '../../../core/world3d/actions';
import { thingName } from '../../../core/world3d/actions';
import { carriable, hideable } from '../../../core/world3d/carry';

/**
 * Gates about hands and sizes (plan B3b; rules `core/world3d/carry.ts`). Until pockets and the bag come (B6), whatever
 * is taken is held, one thing at a time.
 */

const heldName = (c: GateCase): string | null => {
  const k = c.world.holding?.(c.doer.id);
  return k ? (c.world.things.has(k) ? thingName(c.world.things.get(k)) : k) : null;
};

const kindOf = (c: GateCase) => (c.target ? c.world.things.get(c.target.kind) : null);

/** Hands free: nothing held (sitting, lighting a fire, picking up another thing). */
const handsFree: GateDef = {
  id: 'hands-free',
  about: 'The doer holds nothing (their hands are full while they carry something).',
  kind: 'requirement',
  check: (c) => {
    const held = heldName(c);
    return held ? `Your hands are full: put the ${held} down first.` : null;
  },
};

/** Holding something: putting it down is offered only then. */
const holding: GateDef = {
  id: 'holding',
  about: 'The doer holds something.',
  kind: 'requirement',
  hides: true,
  check: (c) => (heldName(c) ? null : 'You hold nothing.'),
};

/** One person can carry it (anything with a size but heavy); heavy things are refused, with why. */
const size: GateDef = {
  id: 'size',
  about: 'The thing can be carried by one person (it has a size, and it is not heavy).',
  kind: 'requirement',
  check: (c) => (carriable(kindOf(c)?.size) ? null : 'The {name} is too heavy to carry alone.'),
};

/** Small enough to slip away unseen (pocket or bag size); otherwise not offered. */
const small: GateDef = {
  id: 'small',
  about: 'The thing is small enough to hide on you (pocket or bag size).',
  kind: 'requirement',
  hides: true,
  check: (c) => (hideable(kindOf(c)?.size) ? null : 'The {name} is too big to hide.'),
};

export default [handsFree, holding, size, small];
