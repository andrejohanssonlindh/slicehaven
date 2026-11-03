import { DIFFICULTY } from '../../../core/checks';
import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Make a campfire where you stand (the director's example: outside the village, a quick Survival roll, ten minutes).
 * Not indoors and not among the houses; harder in the rain.
 */
const makeFire: VerbDef = {
  id: 'makefire',
  label: 'Make a fire here',
  on: 'here',
  gates: [{ gate: 'place', not: ['indoors', 'inSettlement'] }],
  roll: { skills: ['Vildmarksvana'], attr: 'attr:Förflyttning', difficulty: DIFFICULTY.easy, harder: [{ fact: 'raining', add: 4, note: 'the rain' }] },
  takes: 10,
  success: [{ make: 'campfire' }, { say: 'You gather sticks, strike a spark, and a small fire takes.', tone: 'good' }],
  failure: [{ say: 'You can\'t get it to take. Ten minutes gone, and only smoke.', tone: 'bad' }],
};

export default makeFire;
