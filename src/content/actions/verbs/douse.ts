import { DIFFICULTY } from '../../../core/checks';
import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Put out something burning (plan B7): beat and smother the flames, a Speed roll as the rules have for putting out
 * fire on a body; water at hand helps a lot (a bucket: the rules' +3D6, here made easier by as much), a blaze is far
 * harder, and the rain helps. Anyone may: putting out a fire is no wrong.
 */
const douse: VerbDef = {
  id: 'douse',
  label: 'Put out the flames on the {name}',
  on: { has: 'material' },
  gates: [{ gate: 'state', key: 'burning', not: 0 }],
  roll: {
    skills: ['attr:Förflyttning'], difficulty: DIFFICULTY.tricky,
    harder: [
      { fact: 'blazing', add: 6, note: 'it blazes' },
      { fact: 'carrying-water', add: -9, note: 'water at hand' },
      { fact: 'raining', add: -2, note: 'the rain' },
    ],
  },
  takes: 1,
  success: [{ state: 'burning', value: 0 }, { say: 'You beat the flames down until only smoke rises from the {name}.', tone: 'good' }],
  failure: [{ say: 'The fire on the {name} won\'t die down.', tone: 'bad' }],
};

export default douse;
