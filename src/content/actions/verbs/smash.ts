import { DIFFICULTY } from '../../../core/checks';
import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Smash something (plan B7, things that break; the director's wall of stools in a doorway): a Physique roll, tricky,
 * harder for something sturdy (a table, a bed), easier for something flimsy (a straw pallet, a basket). Broken, it lies
 * as wreckage: no longer in the way, not to be sat on or carried. Loud, and harm to whoever owns it.
 */
const smash: VerbDef = {
  id: 'smash',
  label: 'Smash the {name}',
  on: { has: 'toughness' },
  gates: [{ gate: 'state', key: 'broken', is: false }, { gate: 'hands-free' }, { gate: 'owner', act: 'harm' }],
  roll: {
    skills: ['attr:Kroppsbyggnad'], difficulty: DIFFICULTY.tricky,
    harder: [
      { fact: 'sturdy', add: 6, note: 'it is sturdy' },
      { fact: 'flimsy', add: -4, note: 'it is flimsy' },
    ],
  },
  takes: 1,
  noise: { loud: 20, kind: 'crash' },
  success: [{ state: 'broken', value: true }, { say: 'The {name} splinters and falls apart.', tone: 'good' }],
  failure: [{ say: 'You kick and heave, but the {name} holds.', tone: 'bad' }],
};

export default smash;
