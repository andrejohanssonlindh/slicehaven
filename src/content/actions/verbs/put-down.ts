import type { VerbDef } from '../../../core/world3d/actions';

/** Put down what you hold, where you stand (plan B3b). It stays there; put back in its own room, it is home again. */
const putDown: VerbDef = {
  id: 'put-down',
  label: 'Put down the {name}',
  on: 'here',
  gates: [{ gate: 'holding' }],
  success: [{ putDown: true }, { say: 'You put down the {name}.' }],
};

export default putDown;
