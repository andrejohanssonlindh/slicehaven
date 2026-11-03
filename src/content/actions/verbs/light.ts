import { DIFFICULTY } from '../../../core/checks';
import type { VerbDef } from '../../../core/world3d/actions';

/**
 * Light a fire that is out (a hearth, an oven, a forge, a torch): an easy Survival roll, ten minutes either way.
 * Easier indoors (dry, sheltered, kindling at hand) and much easier on embers; harder in the rain.
 */
const light: VerbDef = {
  id: 'light',
  label: 'Light the {name}',
  on: { kind: 'fire' },
  gates: [{ gate: 'state', key: 'lit', is: false }, { gate: 'hands-free' }, { gate: 'owner', act: 'use' }],
  // (Without Survival, Agility at −2D6: anyone can try to light a hearth.)
  roll: {
    skills: ['Vildmarksvana'], attr: 'attr:Förflyttning', difficulty: DIFFICULTY.easy,
    harder: [
      { fact: 'indoors', add: -2, note: 'indoors, dry and sheltered' },
      { fact: 'embers', add: -4, note: 'embers still in it' },
      { fact: 'raining', add: 4, note: 'the rain' },
    ],
  },
  takes: 10,
  // (Flint on steel, blowing on tinder: heard across a room, not across a green.)
  noise: { loud: 8, kind: 'fire' },
  success: [{ state: 'lit', value: true }, { state: 'embers', value: false }, { say: 'The {name} catches and burns.', tone: 'good' }],
  failure: [{ say: 'The tinder smokes, glows and dies. The {name} stays cold.', tone: 'bad' }],
};

export default light;
