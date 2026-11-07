import type { VerbDef } from '../../../core/world3d/actions';

/** Put away the weapon or shield you hold, on you (plan B8a): any, a taken one too (it stays its owner's). */
const stow: VerbDef = {
  id: 'stow',
  label: 'Put away the {name}',
  on: 'here',
  gates: [{ gate: 'holding-own' }],
  success: [{ stow: true }, { say: 'You put away the {name}.' }],
};

export default stow;
