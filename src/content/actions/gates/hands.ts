import type { GateCase, GateDef } from '../../../core/world3d/actions';
import { thingName } from '../../../core/world3d/actions';
import { HAUL_SKILL, carriable, carryCapacity, hideable, kgText } from '../../../core/world3d/carry';

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

/**
 * A hand free for this thing (plan B8a): a shield goes on the left forearm beside a one-handed weapon, a one-handed
 * weapon in the right beside a shield; anything else needs the hands empty. Refused with what to put down first.
 */
const handForIt: GateDef = {
  id: 'hand-for',
  about: 'The doer has a hand free for the thing: a shield beside a one-handed weapon, a one-handed weapon beside a shield, anything else empty hands.',
  kind: 'requirement',
  check: (c) => {
    if (!c.target) return null;
    const free = c.world.handFor ? c.world.handFor(c.doer.id, c.target.kind) !== null : !heldName(c);
    return free ? null : `Your hands are full: put the ${heldName(c) ?? 'other thing'} down first.`;
  },
};

/** Some hand free (plan B8a): drawing a weapon or taking one from a rack; which one fits is asked when it is picked. */
const aHandFree: GateDef = {
  id: 'a-hand-free',
  about: 'The doer has a hand free: nothing held, or a one-handed weapon with the left free, or a shield with the right free.',
  kind: 'requirement',
  check: (c) => {
    const free = c.world.aHandFree ? c.world.aHandFree(c.doer.id) : !heldName(c);
    return free ? null : `Your hands are full: put the ${heldName(c)} down first.`;
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

/**
 * Within what the doer can carry (plan B6, `carryCapacity`): what they hold already and this together. Until fatigue
 * comes nothing over it can be carried; refused with both weights.
 */
const weight: GateDef = {
  id: 'weight',
  about: 'What the doer would carry, this thing with what they hold, is within their carrying capacity (kg from Physique, Slita & släpa and build).',
  kind: 'requirement',
  check: (c) => {
    const kg = kindOf(c)?.weight ?? 0;
    const k = c.world.holding?.(c.doer.id);
    const held = k && c.world.things.has(k) ? (c.world.things.get(k).weight ?? 0) : 0;
    const can = carryCapacity(c.doer.dice('attr:Kroppsbyggnad'), c.doer.dice(HAUL_SKILL), c.doer.load ?? 0);
    return held + kg <= can ? null : `The {name} is too heavy for you: it weighs ${kgText(kg)}, and you can carry ${kgText(can)}.`;
  },
};

/** Small enough to slip away unseen (pocket or bag size); otherwise not offered. */
const small: GateDef = {
  id: 'small',
  about: 'The thing is small enough to hide on you (pocket or bag size).',
  kind: 'requirement',
  hides: true,
  check: (c) => (hideable(kindOf(c)?.size) ? null : 'The {name} is too big to hide.'),
};

/** Carrying gear of their own, not in hand (plan B8a): drawing a weapon is offered only then. */
const hasGear: GateDef = {
  id: 'has-gear',
  about: 'The doer carries something of their own on them that can be drawn (a weapon from their gear).',
  kind: 'requirement',
  hides: true,
  check: (c) => ((c.world.stowed?.(c.doer.id) ?? []).length ? null : 'You carry nothing to draw.'),
};

/** Holding something of their own (their gear, or a weapon taken from a rack): putting it away is offered only then. */
const holdingOwn: GateDef = {
  id: 'holding-own',
  about: 'The doer holds something that is their own and can be carried on them (a weapon).',
  kind: 'requirement',
  hides: true,
  check: (c) => {
    const k = c.world.holding?.(c.doer.id);
    const def = k && c.world.things.has(k) ? c.world.things.get(k) : null;
    return (def?.weapon || def?.shield) && c.world.holdsOwn?.(c.doer.id) ? null : 'You hold nothing of yours to put away.';
  },
};

export default [handsFree, handForIt, aHandFree, holding, size, weight, small, hasGear, holdingOwn];
