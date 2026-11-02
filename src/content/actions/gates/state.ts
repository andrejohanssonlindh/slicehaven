import type { GateDef } from '../../../core/world3d/actions';

/**
 * The thing is in a state: { "gate": "state", "key": "lit", "is": false }. When it is not, the action is not offered
 * at all (you can't light what burns, or put out what is cold).
 */
const state: GateDef = {
  id: 'state',
  about: 'The thing acted on is in a state (lit, open…); otherwise the action is not offered.',
  kind: 'requirement',
  hides: true,
  problem: (use) => (typeof use.key !== 'string' ? 'give the state\'s key' : use.is === undefined ? 'give the value it must be (is)' : null),
  check({ use, target, world }) {
    if (!target) return 'There is nothing here to change.';
    const key = String(use.key);
    if (!world.states.has(target.kind, key)) return 'That does not change.';
    return world.states.get(target.id, target.kind, key) === use.is ? null : 'It is not so.';
  },
};

export default state;
