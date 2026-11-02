import type { GateDef } from '../../../core/world3d/actions';

/**
 * Where it is done: facts (`content/actions/facts.ts`) that must hold there, or must not.
 * { "gate": "place", "not": ["indoors", "inSettlement"] } (making a fire), { "gate": "place", "must": ["indoors"] }.
 * Offered either way; trying says why not.
 */
const place: GateDef = {
  id: 'place',
  about: 'Facts that must (or must not) hold where it is done: indoors, among the houses, raining…',
  kind: 'requirement',
  problem(use, facts) {
    const named = [...((use.must as unknown[]) ?? []), ...((use.not as unknown[]) ?? [])];
    if (!named.length) return 'name a fact in must or not';
    const bad = named.filter((f) => typeof f !== 'string' || !facts[f]);
    return bad.length ? `no fact called ${bad.join(', ')}` : null;
  },
  check({ use, at, world, facts }) {
    for (const f of (use.must as string[]) ?? []) if (!facts[f].holds(at, world.view)) return facts[f].whenFalse;
    for (const f of (use.not as string[]) ?? []) if (facts[f].holds(at, world.view)) return facts[f].whenTrue;
    return null;
  },
};

export default place;
