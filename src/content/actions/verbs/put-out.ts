import type { VerbDef } from '../../../core/world3d/actions';

/** Put out a fire that burns: no roll, a minute. */
const putOut: VerbDef = {
  id: 'putout',
  label: 'Put out the {name}',
  on: { kind: 'fire' },
  gates: [{ gate: 'state', key: 'lit', is: true }, { gate: 'owner' }],
  takes: 1,
  success: [{ state: 'lit', value: false }, { say: 'You smother the {name}. It hisses and goes dark.' }],
};

export default putOut;
