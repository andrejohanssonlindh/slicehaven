import type { GateDef } from '../../../core/world3d/actions';

/**
 * The thing is in a state: { "gate": "state", "key": "lit", "is": false }, or is not: { …, "not": 0 } (burning with
 * any dice). When it is not so, the action is not offered at all (you can't light what burns, or put out what is cold).
 */
const state: GateDef = {
  id: 'state',
  about: 'The thing acted on is in a state (lit, open…), or not in one; otherwise the action is not offered.',
  kind: 'requirement',
  hides: true,
  problem: (use) => (typeof use.key !== 'string' ? 'give the state\'s key' : use.is === undefined && use.not === undefined ? 'give the value it must be (is) or must not be (not)' : null),
  check({ use, target, world }) {
    if (!target) return 'There is nothing here to change.';
    const key = String(use.key);
    if (!world.states.has(target.kind, key)) return 'That does not change.';
    const v = world.states.get(target.id, target.kind, key);
    return (use.is !== undefined ? v === use.is : v !== use.not) ? null : 'It is not so.';
  },
};

export default state;
