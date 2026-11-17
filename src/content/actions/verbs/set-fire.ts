import { DIFFICULTY } from '../../../core/checks';
import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Set fire to something that can burn (plan B7): flint and steel to it, a Survival roll as for a campfire (easy, harder
 * in the rain), a minute. Once it takes, it burns by the rules of fire (`core/world3d/effects.ts`): it grows, spreads
 * to what stands near, and burns out. Someone else's thing set alight is harm done to them.
 */
const setFire: VerbDef = {
  id: 'setfire',
  label: 'Set fire to the {name}',
  on: { has: 'material' },
  gates: [{ gate: 'state', key: 'burning', is: 0 }, { gate: 'state', key: 'burnt', is: false }, { gate: 'hands-free' }, { gate: 'owner', act: 'harm' }],
  roll: { skills: ['Vildmarksvana'], attr: 'attr:Förflyttning', difficulty: DIFFICULTY.easy, harder: [{ fact: 'raining', add: 4, note: 'the rain' }] },
  takes: 1,
  noise: { loud: 8, kind: 'fire' },
  success: [{ state: 'burning', value: 1 }, { say: 'A spark takes, and a small flame creeps over the {name}.', tone: 'good' }],
  failure: [{ say: 'The {name} smokes and won\'t take.', tone: 'bad' }],
};

export default setFire;
