import { DIFFICULTY } from '../../../core/checks';
import type { VerbDef } from '../../../core/world3d/actions';

/** Light a fire that is out (a hearth, an oven, a forge, a torch): an easy Survival roll, harder in the rain; ten minutes either way. */
const light: VerbDef = {
  id: 'light',
  label: 'Light the {name}',
  on: { kind: 'fire' },
  gates: [{ gate: 'state', key: 'lit', is: false }, { gate: 'owner' }],
  // (Without Survival, Agility at −2D6: anyone can try to light a hearth.)
  roll: { skills: ['Vildmarksvana'], attr: 'attr:Förflyttning', difficulty: DIFFICULTY.easy, harder: [{ fact: 'raining', add: 4, note: 'the rain' }] },
  takes: 10,
  success: [{ state: 'lit', value: true }, { say: 'The {name} catches and burns.', tone: 'good' }],
  failure: [{ say: 'The tinder smokes, glows and dies. The {name} stays cold.', tone: 'bad' }],
};

export default light;
