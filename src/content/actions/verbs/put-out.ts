import type { VerbDef } from '../../../core/world3d/actions';

/** Put out a fire that burns: no roll, a minute. Smothered, it keeps its embers (easier to light again). */
const putOut: VerbDef = {
  id: 'putout',
  label: 'Put out the {name}',
  on: { kind: 'fire' },
  gates: [{ gate: 'state', key: 'lit', is: true }, { gate: 'owner', act: 'meddle' }],
  takes: 1,
  noise: { loud: 6, kind: 'fire' },
  success: [{ state: 'lit', value: false }, { state: 'embers', value: true }, { say: 'You smother the {name}. It hisses and goes dark.' }],
};

export default putOut;
